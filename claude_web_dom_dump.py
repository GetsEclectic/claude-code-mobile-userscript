#!/usr/bin/env python3
"""Dump the claude.ai/code DOM under mobile emulation, for userscript authoring.

Self-launches a headless Chrome against a persistent Chrome profile that is
already logged in to claude.ai, pins the UA to the desktop Chrome string the
Cloudflare cf_clearance was issued under (a UA mismatch re-triggers the bot
challenge), then drives the *mobile* layout purely via a 412px viewport — which
is what claude.ai's responsive CSS keys off. Extracts:

  - a screenshot (so you can eyeball the cramped mobile layout),
  - the full outerHTML (saved to disk),
  - a structured inventory of every clickable element with its rendered size,
    font-size, padding and stable hooks (data-testid / aria-label / role),
    flagging anything whose smaller dimension is under the 44px tap-target floor.

Setup:
  - Requires the `websockets` package:  pip install websockets
  - Point --profile at a Chrome user-data-dir already logged in to claude.ai
    (the on-disk session cookie is what lets the headless run reach the app),
    and --chrome-bin at a Chrome / Chrome-for-Testing binary.

Usage:
    python3 claude_web_dom_dump.py --inject-userjs claude-code-mobile.user.js --dark

Outputs land in /tmp:
    /tmp/claude_web_dump.json   (summary + tap-target inventory)
    /tmp/claude_web_dump.html   (full outerHTML)
    /tmp/claude_web_dump.png    (screenshot)

It self-launches a throwaway headless Chrome (rather than attaching to a
long-lived one) so each run is self-contained and leaves no browser behind; the
on-disk session cookie means no interactive login is needed per run.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import websockets

# Pixel 9 Pro XL-class viewport. The userscript ships to a real phone, so
# emulate the CSS viewport it'll actually run against.
MOBILE_METRICS = {
    "width": 412,
    "height": 915,
    "deviceScaleFactor": 2.625,
    "mobile": True,
}

# Pin to the UA cf_clearance was minted under (the headed Chrome-for-Testing
# build), NOT a Firefox/HeadlessChrome string — a UA mismatch re-challenges
# Cloudflare and we'd dump a challenge page instead of the app. Mobile layout
# comes from the viewport width, not the UA, on a responsive site.
DESKTOP_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

DEFAULT_PROFILE = str(Path.home() / ".config" / "claude-web" / "chrome-profile")
DEFAULT_CHROME = str(Path.home() / ".cache" / "chrome-for-testing" / "chrome-linux64" / "chrome")

# Returns a JSON-serializable inventory. Runs in the page.
DOM_PROBE_JS = r"""
(() => {
  const TAP_FLOOR = 44;
  const clickableSel = [
    'button', 'a[href]', '[role="button"]', '[role="link"]', '[role="tab"]',
    '[role="menuitem"]', 'input', 'textarea', 'select', '[onclick]',
    '[tabindex]:not([tabindex="-1"])', 'summary', 'label'
  ].join(',');

  const stable = (el) => ({
    tag: el.tagName.toLowerCase(),
    testid: el.getAttribute('data-testid') || null,
    aria: el.getAttribute('aria-label') || null,
    role: el.getAttribute('role') || null,
    type: el.getAttribute('type') || null,
    id: el.id || null,
    cls: (el.className && typeof el.className === 'string')
      ? el.className.split(/\s+/).filter(Boolean).slice(0, 6)
      : [],
  });

  const seen = new Set();
  const targets = [];
  document.querySelectorAll(clickableSel).forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;            // not rendered
    const cs = getComputedStyle(el);
    const smaller = Math.min(r.width, r.height);
    targets.push({
      ...stable(el),
      w: Math.round(r.width),
      h: Math.round(r.height),
      x: Math.round(r.left),
      y: Math.round(r.top),
      undersized: smaller < TAP_FLOOR,
      smaller: Math.round(smaller),
      fontPx: parseFloat(cs.fontSize),
      pad: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
      minH: cs.minHeight,
      text: (el.innerText || el.value || '').trim().slice(0, 50),
    });
  });

  targets.sort((a, b) => a.smaller - b.smaller);

  const containers = [];
  document.querySelectorAll('main, nav, header, aside, [role="main"], [role="navigation"], [role="complementary"], [data-testid]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height < 24) return;
    containers.push({
      ...stable(el),
      w: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.left), y: Math.round(r.top),
    });
  });

  return {
    url: location.href,
    title: document.title,
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    rootFontPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
    counts: {
      clickable: targets.length,
      undersized: targets.filter(t => t.undersized).length,
    },
    undersized_targets: targets.filter(t => t.undersized),
    all_targets: targets,
    containers,
  };
})()
"""


def clear_singleton_locks(profile: str) -> None:
    for name in ("SingletonLock", "SingletonCookie", "SingletonSocket"):
        try:
            os.remove(os.path.join(profile, name))
        except FileNotFoundError:
            pass


def launch_chrome(chrome_bin: str, profile: str, port: int, url: str) -> subprocess.Popen:
    clear_singleton_locks(profile)
    args = [
        chrome_bin,
        "--headless=new",
        "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
        "--no-first-run", "--no-default-browser-check", "--password-store=basic",
        "--disable-session-crashed-bubble", "--hide-crash-restore-bubble",
        "--hide-scrollbars",
        f"--user-data-dir={profile}",
        f"--remote-debugging-port={port}",
        "--remote-allow-origins=*",
        f"--user-agent={DESKTOP_UA}",
        f"--window-size={MOBILE_METRICS['width']},{MOBILE_METRICS['height']}",
        url,
    ]
    return subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def wait_for_cdp(host: str, port: int, timeout: float = 30.0) -> None:
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"http://{host}:{port}/json/version", timeout=3) as fh:
                fh.read()
                return
        except (urllib.error.URLError, ConnectionError) as e:
            last = e
            time.sleep(0.5)
    raise RuntimeError(f"CDP not ready on {host}:{port} after {timeout}s ({last})")


def page_target(host: str, port: int, url_contains: str) -> dict:
    with urllib.request.urlopen(f"http://{host}:{port}/json", timeout=10) as fh:
        targets = json.loads(fh.read().decode())
    pages = [t for t in targets if t.get("type") == "page"
             and url_contains in (t.get("url") or "")]
    if not pages:
        # fall back to any page target (the launch URL may still be settling)
        pages = [t for t in targets if t.get("type") == "page"]
    if not pages:
        raise RuntimeError(f"no page target; saw: {[t.get('url') for t in targets]}")
    return pages[0]


class CDP:
    def __init__(self, ws):
        self.ws = ws
        self._id = 0

    async def send(self, method: str, params: dict | None = None) -> dict:
        self._id += 1
        mid = self._id
        await self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(await self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method} -> {msg['error']}")
                return msg.get("result", {})

    async def wait_load(self, timeout: float = 25.0) -> None:
        deadline = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < deadline:
            try:
                msg = json.loads(await asyncio.wait_for(self.ws.recv(), timeout=2.0))
            except asyncio.TimeoutError:
                continue
            if msg.get("method") == "Page.loadEventFired":
                return


def resolve_inject_css(args) -> str | None:
    """CSS text to inject, from --inject-css (raw .css) or --inject-userjs.

    For a userscript we verify the *shipped* artifact: extract the CSS body
    from the GM_addStyle(`...`) template literal so the harness injects the
    exact bytes a userscript manager would.
    """
    if args.inject_css:
        return Path(args.inject_css).read_text()
    if args.inject_userjs:
        src = Path(args.inject_userjs).read_text()
        m = re.search(r"GM_addStyle\(\s*`(.*?)`\s*\)", src, re.DOTALL)
        if not m:
            raise SystemExit(f"no GM_addStyle(`...`) block found in {args.inject_userjs}")
        return m.group(1)
    return None


def resolve_companion_js(args) -> str | None:
    """The userscript's FULL trailing companion JS — everything after the
    GM_addStyle(`...`) CSS block: the keyboard-detection / scroll-hold IIFE, the
    rule-18 composer "+" relocation, the sidebar-drawer auto-dismiss. A userscript
    manager runs all of this, so the harness runs all of it too (after the
    composer DOM exists) to keep the capture faithful. Running only a subset —
    the old behavior, which isolated just the keyboard IIFE — silently dropped the
    "+" relocation, producing screenshots that misrepresented the shipped script."""
    if not args.inject_userjs:
        return None
    src = Path(args.inject_userjs).read_text()
    m = re.search(r"GM_addStyle\(\s*`.*?`\s*\)\s*;", src, re.DOTALL)
    if not m:
        return None
    body = src[m.end():].strip()
    return body or None


# Replaces window.visualViewport with a controllable stub so the harness can
# fake a soft keyboard (which CDP/headless can't raise). Seeded from the real
# viewport height; the companion JS binds to this object exactly as it would the
# real one, and tests drive it via __ccmKb(px).
FAKE_VV_JS = r"""
(() => {
  const real = window.visualViewport;
  const fullH = real ? real.height : window.innerHeight;
  const fake = new EventTarget();
  fake.width = real ? real.width : window.innerWidth;
  fake.offsetTop = 0; fake.offsetLeft = 0; fake.pageTop = 0; fake.pageLeft = 0; fake.scale = 1;
  fake._h = fullH;
  Object.defineProperty(fake, 'height', { get() { return fake._h; }, configurable: true });
  window.__ccmFullH = fullH;
  window.__ccmFakeVV = fake;
  // Set the keyboard inset (px stolen from the bottom). 0 = keyboard down.
  window.__ccmKb = (px) => {
    fake._h = fullH - px;
    fake.dispatchEvent(new Event('resize'));
  };
  try {
    Object.defineProperty(window, 'visualViewport', { get() { return fake; }, configurable: true });
  } catch (e) {
    window.visualViewport = fake;
  }
  return { fullH, innerH: window.innerHeight };
})()
"""


async def main_async(args) -> int:
    inject_css = resolve_inject_css(args)
    proc = None
    if args.launch:
        proc = launch_chrome(args.chrome_bin, args.profile, args.port, args.target_url)
        print(f"launched chrome pid={proc.pid} on :{args.port}", file=sys.stderr)
    try:
        wait_for_cdp(args.host, args.port)
        page = page_target(args.host, args.port, args.url_contains)
        ws_url = page["webSocketDebuggerUrl"]
        print(f"attaching: {page.get('url')}", file=sys.stderr)

        async with websockets.connect(ws_url, max_size=64 * 1024 * 1024) as ws:
            cdp = CDP(ws)
            await cdp.send("Page.enable")
            await cdp.send("Runtime.enable")
            await cdp.send("Network.enable")
            # claude.ai ships a strict CSP that blocks page-context <style>
            # injection. A userscript manager injects from its privileged world
            # (bypasses page CSP), so bypass CSP here to mirror that reality.
            if inject_css is not None:
                await cdp.send("Page.setBypassCSP", {"enabled": True})
            await cdp.send("Emulation.setUserAgentOverride", {"userAgent": args.ua})
            await cdp.send("Emulation.setDeviceMetricsOverride", {
                **MOBILE_METRICS,
                "screenWidth": MOBILE_METRICS["width"],
                "screenHeight": MOBILE_METRICS["height"],
            })
            try:
                await cdp.send("Emulation.setTouchEmulationEnabled",
                               {"enabled": True, "maxTouchPoints": 5})
            except RuntimeError:
                pass

            # Reload so the responsive CSS recomputes at the mobile width.
            await cdp.send("Page.navigate", {"url": args.target_url})
            await cdp.wait_load()
            await asyncio.sleep(args.settle)

            # The app keys its theme off data-mode on <html>. The harness renders
            # light by default, which can mask a dark-only regression, so allow
            # forcing dark before the screenshot.
            if args.dark:
                await cdp.send("Runtime.evaluate", {"expression": (
                    "document.documentElement.setAttribute('data-mode','dark')"
                )})
                await asyncio.sleep(0.5)

            # Optionally inject the candidate stylesheet (verify before shipping).
            # A stray comment-close inside the CSS silently truncates the sheet
            # to zero rules, so the probe reports rulesCount + a measured sample.
            if inject_css is not None:
                diag = (await cdp.send("Runtime.evaluate", {"expression": (
                    "(() => { let s = document.getElementById('cc-mobile-fixes')"
                    " || document.createElement('style'); s.id='cc-mobile-fixes';"
                    f" s.textContent = {json.dumps(inject_css)};"
                    " (document.head||document.documentElement).appendChild(s);"
                    " const b = document.querySelector('[aria-label^=\"More options\"]');"
                    " const cs = b ? getComputedStyle(b) : null;"
                    " return JSON.stringify({"
                    "   mq900: matchMedia('(max-width: 900px)').matches,"
                    "   innerW: window.innerWidth,"
                    "   txtLen: s.textContent.length,"
                    "   rulesCount: (s.sheet ? s.sheet.cssRules.length : 'no-sheet'),"
                    "   sampleMinH: cs ? cs.minHeight : 'no-sample',"
                    "   sampleFont: cs ? cs.fontSize : 'no-sample',"
                    "   sampleMatches: b ? b.matches('[aria-label^=\"More options\"]') : 'no-b',"
                    " }); })()"
                ), "returnByValue": True})).get("result", {}).get("value")
                print(f"[inject diag] {diag}", file=sys.stderr)
                await asyncio.sleep(1.0)

            # Optionally click selectors in sequence before dumping, e.g. open a
            # session then dismiss a "Enable notifications" card. Clicking by
            # visible text is supported via "text=...".
            for sel in args.click_selector:
                clicked = (await cdp.send("Runtime.evaluate", {
                    "expression": (
                        "(() => { const sel = " + json.dumps(sel) + ";"
                        " let el;"
                        " if (sel.startsWith('text=')) {"
                        "   const t = sel.slice(5);"
                        "   el = [...document.querySelectorAll('button,a,[role=\"button\"]')]"
                        "     .find(e => (e.innerText||'').trim() === t);"
                        " } else { el = document.querySelector(sel); }"
                        " if (el) { el.click(); return true; } return false; })()"
                    ),
                    "returnByValue": True,
                })).get("result", {}).get("value")
                print(f"click {sel!r}: {clicked}", file=sys.stderr)
                await asyncio.sleep(args.settle)

            # Optionally fill the composer with text, to reproduce a multi-line
            # (tall) composer for layout checks. Uses CDP Input.insertText (an IME
            # commit), which ProseMirror accepts as typed text. Keep the text
            # newline-free: Enter submits the prompt, and a long single string
            # wraps into many visual lines without any submit risk.
            if args.type_text:
                focused = (await cdp.send("Runtime.evaluate", {"expression": (
                    "(() => { const e = document.querySelector("
                    "'[aria-label=\"Prompt\"], textarea, [contenteditable=\"true\"]');"
                    " if (e) { e.focus(); return true; } return false; })()"
                ), "returnByValue": True})).get("result", {}).get("value")
                print(f"focus composer: {focused}", file=sys.stderr)
                await cdp.send("Input.insertText", {"text": args.type_text})
                await asyncio.sleep(1.0)

            # Mirror what a userscript manager does: after the page/composer DOM
            # exists, run the userscript's full companion JS — keyboard detection +
            # scroll-hold, the rule-18 composer "+" relocation, drawer auto-dismiss.
            # This runs by DEFAULT whenever --inject-userjs is given. It used to
            # require a manual --inject-js of the extracted IIFE, which silently
            # dropped the "+" relocation whenever a caller forgot it — twice
            # producing after-screenshots that showed the "+" still on the stock
            # toolbar. For keyboard-layout tests (--inject-companion / --kb-*),
            # install a controllable visualViewport stub BEFORE the companion runs
            # so its keyboard IIFE binds to the stub (CDP can't raise a real soft
            # keyboard); without it the companion binds the real viewport, exactly
            # as on the phone with the keyboard down.
            companion_js = resolve_companion_js(args)
            if companion_js:
                if args.inject_companion:
                    seed = (await cdp.send("Runtime.evaluate", {
                        "expression": FAKE_VV_JS, "returnByValue": True,
                    })).get("result", {}).get("value")
                    print(f"[fake-vv] {seed}", file=sys.stderr)
                    if args.kb_preopen:
                        await cdp.send("Runtime.evaluate", {"expression": (
                            f"window.__ccmFakeVV._h = window.__ccmFullH - {args.kb_preopen};"
                        )})
                        print(f"[kb-preopen] keyboard {args.kb_preopen}px up before companion load",
                              file=sys.stderr)
                await cdp.send("Runtime.evaluate", {"expression": companion_js})
                print("[companion] ran userscript companion IIFEs", file=sys.stderr)
                if args.inject_companion and args.kb_open:
                    await cdp.send("Runtime.evaluate", {
                        "expression": f"window.__ccmKb({args.kb_open})"})
                    await asyncio.sleep(0.8)
                # Apply a sequence of keyboard insets (px stolen from the bottom),
                # reporting kbOpen + the transcript scroller's scrollTop after each.
                # 0 = keyboard down; an address-bar-sized step (e.g. 70) interleaved
                # with keyboard steps reveals scroll-hold misfires (the transcript
                # jumping on a non-keyboard resize).
                if args.kb_seq:
                    insets = [float(x) for x in args.kb_seq.split(",") if x.strip() != ""]
                    probe = (
                        "(inset => { window.__ccmKb(inset);"
                        " const m = document.querySelector('.epitaxy-markdown');"
                        " let s = null;"
                        " for (let n = m; n; n = n.parentElement) {"
                        "   const oy = getComputedStyle(n).overflowY;"
                        "   if ((oy==='auto'||oy==='scroll') && n.scrollHeight > n.clientHeight+4){ s=n; break; }"
                        " }"
                        " return {inset,"
                        "  kbOpen: document.documentElement.classList.contains('ccm-kb-open'),"
                        "  scrollTop: s ? Math.round(s.scrollTop) : null,"
                        "  scrollerH: s ? Math.round(s.clientHeight) : null,"
                        "  scrollH: s ? Math.round(s.scrollHeight) : null,"
                        "  htmlH: getComputedStyle(document.documentElement).height}; })"
                    )
                    for inset in insets:
                        row = (await cdp.send("Runtime.evaluate", {
                            "expression": f"({probe})({inset})", "returnByValue": True,
                        })).get("result", {}).get("value")
                        await asyncio.sleep(0.4)
                        print(f"[kb-seq] {json.dumps(row)}", file=sys.stderr)
                if args.inject_companion:
                    state = (await cdp.send("Runtime.evaluate", {"expression": (
                        "(() => ({"
                        " kbOpenClass: document.documentElement.classList.contains('ccm-kb-open'),"
                        " ccmVvh: getComputedStyle(document.documentElement).getPropertyValue('--ccm-vvh').trim(),"
                        " fullH: window.__ccmFullH, innerH: window.innerHeight,"
                        " vvH: window.visualViewport ? window.visualViewport.height : null,"
                        " htmlH: getComputedStyle(document.documentElement).height,"
                        "}))()"
                    ), "returnByValue": True})).get("result", {}).get("value")
                    print(f"[kb-state] {json.dumps(state)}", file=sys.stderr)

            # Report viewport-meta + layout/visual viewport dims. The keyboard
            # leaves the layout viewport (innerHeight) untouched unless the meta
            # opts into interactive-widget=resizes-content — which decides whether
            # innerHeight is a safe keyboard-immune baseline for kb detection.
            if args.report_viewport:
                vp = (await cdp.send("Runtime.evaluate", {"expression": (
                    "(() => { const m = document.querySelector('meta[name=\"viewport\"]');"
                    " return {"
                    "  meta: m ? m.getAttribute('content') : null,"
                    "  innerH: window.innerHeight, innerW: window.innerWidth,"
                    "  clientH: document.documentElement.clientHeight,"
                    "  vvH: window.visualViewport ? window.visualViewport.height : null,"
                    " }; })()"
                ), "returnByValue": True})).get("result", {}).get("value")
                print(f"[viewport] {json.dumps(vp)}", file=sys.stderr)

            # Optionally run a companion JS file in page context (the userscript's
            # GM_addStyle body is injected as CSS above; its trailing IIFEs — e.g.
            # the rule-18 "+" relocation — are JS a userscript manager would also
            # run, so verify them the same way). Run after click/type so the
            # composer DOM the script targets already exists.
            if args.inject_js:
                js = Path(args.inject_js).read_text()
                diag = (await cdp.send("Runtime.evaluate", {"expression": (
                    "(() => { try { " + js + " ; return 'ok'; }"
                    " catch (e) { return 'threw: ' + (e && e.message); } })()"
                ), "returnByValue": True})).get("result", {}).get("value")
                print(f"[inject-js] {diag}", file=sys.stderr)
                await asyncio.sleep(1.5)

            # Walk the ancestor chain of each --ancestry selector, reporting the
            # box model (padding/margin/maxWidth) and stable hooks at every level.
            # This is how we locate the exact wrapper whose padding creates a gutter
            # or margin, so the userscript can target it rather than guess.
            if args.ancestry:
                anc = (await cdp.send("Runtime.evaluate", {"expression": (
                    "(() => {"
                    " const one = (sel) => {"
                    "   const el = document.querySelector(sel);"
                    "   if (!el) return {sel, found:false};"
                    "   const chain = []; let n = el, d = 0;"
                    "   while (n && n.tagName !== 'BODY' && d < 12) {"
                    "     const cs = getComputedStyle(n), r = n.getBoundingClientRect();"
                    "     chain.push({tag:n.tagName.toLowerCase(),"
                    "       aria:n.getAttribute('aria-label'), testid:n.getAttribute('data-testid'),"
                    "       role:n.getAttribute('role'),"
                    "       cls:(typeof n.className==='string'?n.className.split(/\\s+/).filter(Boolean).slice(0,8):[]),"
                    "       x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height),"
                    "       pad:`${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,"
                    "       mar:`${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,"
                    "       maxW:cs.maxWidth, disp:cs.display, font:cs.fontSize,"
                    "       bg:cs.backgroundColor, color:cs.color,"
                    "       pos:cs.position, ov:cs.overflowY, hgt:cs.height});"
                    "     n = n.parentElement; d++;"
                    "   }"
                    "   return {sel, found:true, chain};"
                    " };"
                    f" return JSON.stringify({json.dumps(args.ancestry)}.map(one));"
                    "})()"
                ), "returnByValue": True})).get("result", {}).get("value")
                print(f"[ancestry] {anc}", file=sys.stderr)

            res = await cdp.send("Runtime.evaluate", {
                "expression": DOM_PROBE_JS, "returnByValue": True, "awaitPromise": True,
            })
            data = res.get("result", {}).get("value")
            if data is None:
                print(f"probe returned nothing: {json.dumps(res)[:600]}", file=sys.stderr)
                return 2

            html = (await cdp.send("Runtime.evaluate", {
                "expression": "document.documentElement.outerHTML", "returnByValue": True,
            })).get("result", {}).get("value", "")

            shot = await cdp.send("Page.captureScreenshot",
                                  {"format": "png", "captureBeyondViewport": True})
            png = base64.b64decode(shot.get("data", ""))

        Path("/tmp/claude_web_dump.json").write_text(json.dumps(data, indent=2))
        Path("/tmp/claude_web_dump.html").write_text(html)
        Path("/tmp/claude_web_dump.png").write_bytes(png)

        print(json.dumps({
            "url": data["url"], "title": data["title"], "viewport": data["viewport"],
            "rootFontPx": data["rootFontPx"], "counts": data["counts"],
            "html_bytes": len(html), "png_bytes": len(png),
            "undersized_preview": data["undersized_targets"][:25],
        }, indent=2))
        return 0
    finally:
        if proc is not None:
            proc.send_signal(signal.SIGTERM)
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=9223)
    ap.add_argument("--no-launch", dest="launch", action="store_false",
                    help="attach to an already-running Chrome instead of self-launching")
    ap.add_argument("--chrome-bin", default=DEFAULT_CHROME)
    ap.add_argument("--profile", default=DEFAULT_PROFILE)
    ap.add_argument("--target-url", default="https://claude.ai/code")
    ap.add_argument("--url-contains", default="claude.ai")
    ap.add_argument("--click-selector", action="append", default=[],
                    help="CSS selector (or text=Label) to .click() after load, before dumping; "
                         "repeatable, clicked in order (e.g. open a session, then dismiss a dialog)")
    ap.add_argument("--ancestry", action="append", default=[],
                    help="CSS selector whose ancestor chain (box model + hooks) is dumped; repeatable")
    ap.add_argument("--type", dest="type_text", default=None,
                    help="text to insert into the composer before dumping (reproduce a tall multi-line "
                         "composer for layout checks); keep it newline-free — Enter submits")
    ap.add_argument("--inject-css", default=None,
                    help="path to a CSS file to inject before dumping (verify a candidate stylesheet)")
    ap.add_argument("--inject-userjs", default=None,
                    help="path to a .user.js to verify the shipped artifact: its GM_addStyle(`...`) "
                         "body is injected as CSS, AND its full trailing companion JS (keyboard/scroll "
                         "logic, the composer '+' relocation, drawer auto-dismiss) is run after "
                         "load/click — exactly as a userscript manager would, so behavior is captured "
                         "faithfully without a separate flag")
    ap.add_argument("--inject-companion", action="store_true",
                    help="keyboard-layout testing: install a controllable visualViewport stub before "
                         "the companion runs, so its keyboard IIFE binds to the stub and --kb-* can "
                         "fake a soft keyboard (which CDP can't raise). The companion itself already "
                         "runs by default under --inject-userjs; this only adds the fake viewport")
    ap.add_argument("--kb-open", type=float, default=0.0,
                    help="after injecting the companion, simulate a soft keyboard stealing this "
                         "many px from the bottom (fires visualViewport 'resize')")
    ap.add_argument("--kb-preopen", type=float, default=0.0,
                    help="simulate the keyboard ALREADY up by this many px when the companion "
                         "loads (reproduces the stale-baseline case); implies --inject-companion")
    ap.add_argument("--kb-seq", default=None,
                    help="comma-separated keyboard insets in px applied in order after the "
                         "companion loads (0=down); reports kbOpen + transcript scrollTop after "
                         "each, exposing scroll-hold misfires. e.g. '0,70,0,320,0'; implies "
                         "--inject-companion")
    ap.add_argument("--report-viewport", action="store_true",
                    help="print the viewport meta + layout/visual viewport dims")
    ap.add_argument("--inject-js", default=None,
                    help="path to an EXTRA JS file run in page context after the userscript companion "
                         "(for ad-hoc diagnostics/probes; the userscript's own companion now runs "
                         "automatically under --inject-userjs, so this is no longer needed for it)")
    ap.add_argument("--ua", default=DESKTOP_UA)
    ap.add_argument("--settle", type=float, default=5.0, help="seconds to wait after load")
    ap.add_argument("--dark", action="store_true",
                    help="force the app's dark theme (data-mode=dark) before dumping")
    args = ap.parse_args()
    if args.kb_preopen or args.kb_open or args.kb_seq:
        args.inject_companion = True
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    raise SystemExit(main())
