// ==UserScript==
// @name         Claude Code — mobile UI fixes
// @namespace    https://claude.ai/code
// @version      1.9.0
// @description  Bigger tap targets, larger fonts, and a tighter layout for the claude.ai/code web client on phones.
// @match        https://claude.ai/code*
// @run-at       document-start
// @grant        GM_addStyle
// @homepageURL  https://github.com/GetsEclectic/claude-code-mobile-userscript
// @downloadURL  https://raw.githubusercontent.com/GetsEclectic/claude-code-mobile-userscript/main/claude-code-mobile.user.js
// @updateURL    https://raw.githubusercontent.com/GetsEclectic/claude-code-mobile-userscript/main/claude-code-mobile.user.js
// ==/UserScript==

/* Scoped to phone widths so a desktop visit is untouched. Targets stable
   aria-label / data-testid / role hooks, never the hashed epitaxy- / dframe-
   class names. CSS verified by injecting into an emulated 412px viewport
   (scripts/claude_web_dom_dump.py --inject-userjs) before shipping.

   Keep the @media block free of the two-character sequence that closes a CSS
   comment: one stray occurrence inside a comment silently truncates the whole
   sheet to zero parsed rules. */

GM_addStyle(`
@media (max-width: 900px) {

  /* 1. Lift control & label text off the 12-13px default. */
  button, a[href], [role="button"], [role="menuitem"], [role="tab"],
  [role="option"], summary, label, select {
    font-size: 16px !important;
    line-height: 1.3 !important;
  }
  /* The composer: comfortable typing size. */
  textarea, [contenteditable="true"] {
    font-size: 16px !important;
    line-height: 1.4 !important;
  }

  /* 2. Icon-only buttons get a real 44x44 finger target. */
  [aria-label="Send"], [aria-label="Add"], [aria-label="Copy message"],
  [aria-label="Pin as chapter"], [aria-label="Session actions"],
  [aria-label="Dismiss question"], [aria-label="Scroll to bottom"],
  [aria-label="Open sidebar"], [aria-label="Close side chat"],
  [aria-label="Share"], [aria-label="Views"], [aria-label="Filter"],
  [aria-label="Dismiss"], [aria-label^="Usage"], [aria-label^="More options"] {
    min-width: 44px !important;
    min-height: 44px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  /* 3. Sidebar nav rows: finger-height. */
  aside[aria-label="Sidebar"] button {
    min-height: 42px !important;
    font-size: 16px !important;
  }

  /* 4. Bottom composer toolbar + per-message chip row: a 40px floor so the
     dense ~20px chips grow vertically into something tappable. */
  button, [role="button"] {
    min-height: 40px !important;
  }

  /* 5. Home Sessions / Pull-requests rows: stock claude.ai/code overlaps the
     status label, title and repo at phone widths (visible with this script
     off too). Force the row to lay its two groups out as a flex line so the
     left group takes the slack and its title truncates instead of colliding. */
  [aria-label^="Open session"] {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
  }
  [aria-label^="Open session"] > :first-child {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    overflow: hidden !important;
  }
  /* Cap the right group (avatar + redundant repo name + time + chevron) so the
     repo truncates instead of crowding the status/title into an overlap. */
  [aria-label^="Open session"] > :last-child {
    flex: 0 1 auto !important;
    min-width: 0 !important;
    max-width: 48% !important;
  }
  [aria-label^="Open session"] > :last-child > * {
    min-width: 0 !important;
    white-space: nowrap !important;
  }

  /* 6. Transcript prose ships at 14px — nudge the message body up to match the
     larger controls. */
  .epitaxy-markdown,
  .epitaxy-markdown p,
  .epitaxy-markdown li {
    font-size: 16px !important;
    line-height: 1.55 !important;
  }

  /* 7. Reclaim the 40px side gutter. The shared .epitaxy-chat-size hook insets
     both the transcript prose and the bottom dock, so one rule narrows the
     left/right margins everywhere — and closes the wide gap to the right of the
     return/send symbol, which is that same gutter. */
  .epitaxy-chat-size {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  /* Tighten the vertical gaps between branch bar, composer and toolbar. */
  .epitaxy-chat-column {
    gap: 8px !important;
  }

  /* 8. The branch / PR / diff bar above the composer eats vertical space partly
     because rules 1 & 4 inflate its controls to 16px / 40px. It's glanceable,
     not a primary tap target — let it stay compact. */
  .epitaxy-branch-row {
    padding-top: 4px !important;
    padding-bottom: 4px !important;
  }
  .epitaxy-branch-row button,
  .epitaxy-branch-row [role="button"],
  .epitaxy-branch-row a {
    min-height: 0 !important;
    font-size: 13px !important;
  }

  /* 9. The send-slot (.self-end) wraps the send button with p-p7 padding — ~10px
     on each side. The top/bottom padding would stack onto the 56px button (rule
     13) and inflate the box past the button height, and the right ~10px is dead
     space between the icon and the composer's edge (the gap rule 7 notes). Zero
     the vertical padding so the box hugs the button, and trim the right gap so
     the bigger button doesn't push toward the edge with wasted space beside it. */
  .epitaxy-prompt .self-end {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-right: 6px !important;
  }

  /* 10. The top-left menu (sidebar toggle) is tapped constantly to switch
     sessions, so it wants a generous target. It ships as size-7 (a 28px box).
     Size ONLY the button to a 50px box: the aside is position:absolute and
     shrink-wraps to its content, so it grows to 50x50 too (verified). Do NOT
     put a size on aside.dframe-sidebar itself — that same element IS the
     expanded sidebar panel, so freezing it to 50x50 clamps the opened session
     list to a 50px box and it renders blank. */
  aside.dframe-sidebar [aria-label="Open sidebar"] {
    height: 50px !important;
    min-height: 50px !important;
    width: 50px !important;
    min-width: 50px !important;
  }

  /* 11. Soft keyboard handling. The app pins its whole layout to height:100dvh,
     but dvh — like vh — tracks the browser's UA chrome, NOT the on-screen
     keyboard. So when the keyboard opens the layout viewport stays full-height:
     the bottom composer dock is left behind the keyboard, and reaching it scrolls
     the header off the top. The companion script publishes the real visible
     height (visualViewport API — the only thing that reflects the keyboard) as
     --ccm-vvh, and adds the .ccm-kb-open class to <html> ONLY while the keyboard
     is actually up. Pin the three height drivers (html, body, .epitaxy-root) to
     --ccm-vvh and clip overflow so the app fits the area above the keyboard:
     header fixed at top, shrink-0 composer dock riding just above the keyboard,
     transcript scrolling between.

     CRITICAL: this MUST stay gated on .ccm-kb-open. An always-on version (the
     overflow:hidden + min-height:0 applied even with the keyboard down) collapses
     the sidebar's flex-1 Recents list to zero height (blank sidebar) and clips
     the composer's +/attachment and context popovers. Keyboard-down must be the
     app's stock layout, untouched. */
  html.ccm-kb-open,
  html.ccm-kb-open body.min-h-screen,
  html.ccm-kb-open .epitaxy-root {
    height: var(--ccm-vvh, 100dvh) !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  /* 12. In-session title bar reads "[repo] / [session title]". The repo is
     always the same one and steals horizontal room, so the title truncates
     early. Hide the repo button and the "/" separator — they are the two direct
     <span> children of the title bar's content wrapper; the session title lives
     in a sibling <div class="...flex-1"> and is left untouched, so it reclaims
     the full width. */
  [data-top-left="true"] .draggable-none > span {
    display: none !important;
  }

  /* 13. The Send / Stop button is the primary composer action but ships small.
     Give it a generous 56px finger target. Target the button by its slot
     (.epitaxy-prompt .self-end button) so it covers both the Send arrow and the
     Stop square the slot toggles between, plus the explicit labels. NOTE: the
     button is the composer box's height driver, so 56px here makes the box 56px
     tall (rule 9 keeps it hugging the button with no extra padding). */
  .epitaxy-prompt .self-end button,
  [aria-label="Send"],
  [aria-label="Stop"] {
    min-width: 56px !important;
    min-height: 56px !important;
  }

  /* 14. Transcript spacing is driven by gap-[var(--chat-item-gap)], which the
     app applies at TWO nesting levels: the outer turn list (…select-text) that
     separates whole turns, and inner per-message lists that stack a single
     turn's blocks — prose paragraphs and the collapsed tool-call rows ("Ran N
     commands"). Stock reads large on a phone. Cap the turn gap at 20px so more
     turns fit; tighten the inner block gap to 8px so the collapsed tool rows
     hug their surrounding text instead of floating in 20px of space. The
     :not(.select-text) rule outranks the base rule on specificity, so inner
     lists settle at 8px while the select-text turn lists keep 20px. */
  [class*="gap-[var(--chat-item-gap)]"] {
    gap: 20px !important;
  }
  [class*="gap-[var(--chat-item-gap)]"]:not(.select-text) {
    gap: 8px !important;
  }

  /* 15. The transcript content wrapper pads its bottom with
     pb-[var(--chat-turn-gap)] (~15px in-session), which adds to the gap already
     left above the composer. Trim it so the last turn sits closer to the dock.
     (The large void above the composer in a short conversation is mostly empty
     scroll area, not this padding — this only tightens the in-session case.) */
  [class*="pb-[var(--chat-turn-gap)]"] {
    padding-bottom: 4px !important;
  }

  /* 16. Bottom composer toolbar (permission-mode toggle / + attach / model
     selector) is the very bottom line. Like the branch row (rule 8) it's
     glanceable status plus the occasional tap, not a primary target — but rules
     1 & 4 inflate its controls to 16px / 40px, making it the largest, tallest
     text on screen. Give it the same compact treatment: drop the controls back
     to 13px and let them collapse to natural height, and trim the row's own
     4px (py-[4px]) padding. Scoped under .epitaxy-chat-column so it can't reach
     a like-classed row elsewhere; that container holds the single py-[4px]
     toolbar in-session. */
  .epitaxy-chat-column [class*="py-[4px]"] {
    padding-top: 1px !important;
    padding-bottom: 1px !important;
  }
  .epitaxy-chat-column [class*="py-[4px]"] button,
  .epitaxy-chat-column [class*="py-[4px]"] [role="button"] {
    min-height: 0 !important;
    font-size: 13px !important;
  }
}
`);

/* Companion to rule 11. Two jobs, both driven off the visualViewport API (the
   only thing that reflects the soft keyboard; vh/dvh can't see it):

   1. Detect whether the keyboard is up and toggle the .ccm-kb-open class on
      <html>, which is the sole switch that arms rule 11. Detection compares the
      current visible height against the tallest height seen so far (maxH, the
      keyboard-down baseline). The keyboard steals ~250-350px; UA chrome show/hide
      only moves ~60px, so a 150px threshold cleanly separates the two. Because
      vv.height is the browser's own visible region, it's immune to the html
      height changes rule 11 makes — no feedback loop.
   2. Publish that visible height as --ccm-vvh for rule 11 to size to, and hold
      the transcript bottom in place: when the keyboard opens the app shrinks, so
      the virtualized transcript loses height from the bottom and its bottom edge
      slips behind the composer. Nudge the scroller's scrollTop by the height
      delta to keep that content visible (symmetric on close).

   Only listens to 'resize' — that's what the keyboard fires. (An earlier build
   also synced on every 'scroll' event, which thrashed style recalc and made the
   page laggy; the scroll listener did nothing useful since scrolling doesn't
   change vv.height.) */
(function () {
  var vv = window.visualViewport;
  if (!vv) return;
  var de = document.documentElement;
  var maxH = vv.height;
  var prevH = vv.height;
  function findScroller() {
    var m = document.querySelector('.epitaxy-markdown');
    for (var n = m; n; n = n.parentElement) {
      var oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 4) {
        return n;
      }
    }
    return null;
  }
  function sync() {
    if (vv.height > maxH) maxH = vv.height;
    var kbOpen = (maxH - vv.height) > 150;
    de.classList.toggle('ccm-kb-open', kbOpen);
    de.style.setProperty('--ccm-vvh', vv.height + 'px');
    var delta = prevH - vv.height; // > 0 when the keyboard opens (height shrinks)
    prevH = vv.height;
    if (Math.abs(delta) > 60) { // keyboard-sized move: hold transcript bottom
      var s = findScroller();
      if (s) s.scrollTop += delta;
    }
  }
  vv.addEventListener('resize', sync);
  sync();
})();
