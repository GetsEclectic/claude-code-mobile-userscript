# Claude Code — mobile UI fixes

A userscript that restyles the [Claude Code web client](https://claude.ai/code)
for use on a phone. The stock layout is built for the desktop; on a narrow
screen the text is small, the tap targets are cramped, a few rows overlap, and
the composer slips behind the soft keyboard. This script fixes those without
touching the desktop experience.

Everything is scoped to phone widths (`max-width: 900px`) and to `claude.ai/code`,
so a desktop visit — or any other site — is left completely alone.

## Before / after

The same session, on a phone-width viewport, without and with the script.

| Before (stock) | After (this script) |
| :---: | :---: |
| <img src="docs/before.png" width="300" alt="Stock Claude Code on a phone"> | <img src="docs/after.png" width="300" alt="With the mobile UI fixes"> |

Note the larger message text, the full-width session title (the repeated repo
prefix is hidden), the tighter side margins, and the recolored Send button.

## What it changes

- **Readable text.** Lifts control labels and message prose off the stock
  ~13–14px up to 16px, with comfortable line height.
- **Real finger targets.** Icon-only buttons (Send, attach, session actions,
  sidebar toggle, …) get a 44×44px hit area; menu and toolbar rows get a 40px
  floor so the dense rows stop being a coin-toss to tap.
- **Bigger session-actions menu.** The "⌄" menu in a session (Open in / Rename /
  Color / Copy link / Archive / Delete) gets taller rows and a larger label.
- **Tighter layout.** Reclaims the wide side gutters and trims the vertical gaps
  between the transcript, composer, and toolbars, while keeping the glanceable
  bars (branch/PR row, bottom toolbar) compact instead of inflated.
- **No more overlapping home rows.** The session list rows on the home screen
  stop colliding their status / title / repo text at phone widths.
- **Composer "+" inline.** Moves the attach button up beside the input instead
  of stranding it on a separate toolbar row.
- **Findable Send button.** Paints the Send/Stop action with Claude's coral
  accent (it otherwise blends into the composer) and shapes it as a tidy disc.
- **Soft-keyboard handling.** Pins the layout to the actual visible viewport so
  the composer rides just above the keyboard instead of being hidden behind it,
  and holds the transcript in place as the keyboard opens and closes.
- **Sidebar drawer auto-dismiss.** Tapping a nav row in the mobile drawer now
  closes the drawer instead of leaving it floating over the new page.
- **Reclaimed title width.** Hides the redundant repo prefix in the in-session
  title bar so the session title gets the full width.

## Install

1. Install a userscript manager. On a phone the common setup is **Firefox for
   Android + [Violentmonkey](https://violentmonkey.github.io/)**; on desktop,
   Violentmonkey or Tampermonkey in any major browser.
2. Open the raw script URL — the userscript manager will offer to install it:

   ```
   https://raw.githubusercontent.com/GetsEclectic/claude-code-mobile-userscript/main/claude-code-mobile.user.js
   ```

3. Open [claude.ai/code](https://claude.ai/code) on your phone. The fixes apply
   automatically at phone widths.

The script declares `@updateURL` / `@downloadURL`, so your userscript manager
picks up new versions on its normal update check — no need to reinstall.

## Developing / verifying changes

claude.ai's DOM drifts over time, so changes should be checked against the real
mobile layout before shipping. `claude_web_dom_dump.py` does that: it launches a
headless Chrome at a phone-width (412px) viewport, injects the userscript exactly
as a userscript manager would, and writes a screenshot plus a tap-target
inventory (flagging any control under the 44px floor).

```
pip install websockets
python3 claude_web_dom_dump.py \
  --profile /path/to/chrome-profile-signed-in-to-claude \
  --inject-userjs claude-code-mobile.user.js --dark
```

Point `--profile` at a Chrome user-data-dir already signed in to claude.ai (the
on-disk session cookie is what lets the headless run reach the app). Outputs land
in `/tmp/claude_web_dump.{png,json,html}`. The script header documents the full
flag set — open a session, fill the composer, simulate the soft keyboard, or dump
an element's box model up its ancestor chain.

## Notes

- The styling targets stable `aria-label` / `data-testid` / `role` hooks rather
  than hashed class names, so it survives most app restyles.
- It activates only below 900px wide, so opening the same browser on a desktop
  monitor shows the untouched stock layout.
