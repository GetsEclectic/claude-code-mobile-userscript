// ==UserScript==
// @name         Claude Code — mobile UI fixes
// @namespace    https://claude.ai/code
// @version      1.18.0
// @description  Bigger tap targets, larger fonts, and a tighter layout for the claude.ai/code web client on phones. Moves the composer "+" inline beside the input. Keeps the layout aligned across soft-keyboard open/close. Auto-dismisses the sidebar drawer after a nav-row tap.
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

  /* 9. The send-slot (the app's own .self-end class) wraps the send button with
     p-p7 padding — ~10px on each side. The top/bottom padding inflates the box
     past the button height, and the right ~10px is dead space between the icon
     and the composer's edge (the gap rule 7 notes). Zero the vertical padding so
     the box hugs the button, and trim the right gap so the button doesn't push
     toward the edge with wasted space beside it. ALSO override the app's
     align-self:flex-end → center: the input grows up to its 218px cap, and at
     bottom-anchor the button strands itself at the very bottom of a tall
     composer with a big empty gap above it (looks lopsided on multi-line input).
     Centering keeps it beside the vertical middle of the text instead. */
  .epitaxy-prompt .self-end {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-right: 6px !important;
    align-self: center !important;
  }

  /* 10. The top-left menu (sidebar toggle) ships as size-7 (a 28px box) with a
     transparent background, so it (a) doesn't line up with the title bar and
     (b) blends into the bar — no distinct surface. The title bar
     [data-top-left="true"] is h:32 at y:9 (center y≈25) and reserves a 32px-wide
     gutter (its margin-left:32px) for this button. So size the button to a 32px
     square: it fills the reserved gutter, its center lands on the bar's center
     (aligned), and it stops hanging below the bar (the old 50px box spanned to
     y:60, 19px past the 32px bar). Add a translucent grey chip so it reads as a
     control against the bar in BOTH themes — alpha over the dark bar lightens it,
     over the light bar darkens it. Size ONLY the button: the aside is
     position:absolute and shrink-wraps to its content. Do NOT put a size on
     aside.dframe-sidebar itself — that same element IS the expanded sidebar
     panel, so freezing it clamps the opened session list and it renders blank.
     The visible chip stays 32px (bar-aligned), but 32px is a small touch target,
     so a transparent ::after extends the HIT AREA past the chip (hit-slop): the
     pseudo is part of the button, so taps in the slop still fire the button. Slop
     reaches the screen's left edge and ~8px above/below, but stops at the chip's
     right edge so it never steals taps from the title text in the gutter. */
  aside.dframe-sidebar [aria-label="Open sidebar"] {
    height: 32px !important;
    min-height: 32px !important;
    width: 32px !important;
    min-width: 32px !important;
    background: rgba(128, 128, 128, 0.2) !important;
    position: relative !important;
  }
  aside.dframe-sidebar [aria-label="Open sidebar"]::after {
    content: "" !important;
    position: absolute !important;
    top: -8px !important;
    bottom: -8px !important;
    left: -8px !important;
    right: 0 !important;
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

  /* 13. The Send / Stop button is the primary composer action. Give it a 34px
     finger target shaped as a circle (border-radius:full) rather than the stock
     rounded-rect, so the coral accent (rule 17) reads as a tidy disc instead of
     a heavy slab. The .btn-squish fill span inherits the radius (rounded-
     [inherit]). Target the button by its slot (.epitaxy-prompt .self-end button)
     so it covers both the Send arrow and the Stop square, plus the labels. 34px
     is a deliberate compromise: 40px read as too heavy a disc, the stock 24px is
     too small a tap target — 34px keeps the composer compact while staying
     comfortably tappable. */
  .epitaxy-prompt .self-end button,
  [aria-label="Send"],
  [aria-label="Stop"] {
    min-width: 34px !important;
    min-height: 34px !important;
    border-radius: 9999px !important;
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

  /* 17. The Send/Stop button is an "uncontained" control — its fill is
     var(--fill-uncontained-*), nearly the same neutral as the composer, so the
     primary action vanishes into the background. Paint it with Claude's coral
     accent and flip the currentColor icon to white for contrast. The fill is
     drawn by the .btn-squish span behind the icon (-z-[1]), so override that,
     not the button. Coral applies in every state so the button is always
     locatable (the empty-composer state is :disabled — exactly what reads as
     invisible); dim that disabled state with opacity so it still signals "not
     ready to send" without disappearing. Works on both light and dark themes:
     coral is a mid-tone that contrasts with either composer fill, white icon
     reads on coral in both. */
  .epitaxy-prompt .self-end button .btn-squish {
    background: #d97757 !important;
  }
  .epitaxy-prompt .self-end button {
    color: #fff !important;
  }
  .epitaxy-prompt .self-end button:disabled {
    opacity: 0.45 !important;
  }

  /* 18. The "+" (Add / attach) is lifted out of the bottom toolbar and into the
     composer input row by the companion script below, inline to the LEFT of the
     textarea. Style it for that spot: vertical-center it against a multi-line
     composer (like the Send button, rule 9) instead of stretching the full row
     height, don't let flex grow/shrink it, and give it a small gutter so the
     text doesn't hug it. Selecting it under .epitaxy-prompt scopes the styling to
     the relocated state — in the stock toolbar the button is NOT a descendant of
     .epitaxy-prompt, so this can't touch it before the move. Out of the compact
     py-[4px] toolbar, rule 16's shrink no longer applies and it regains the
     rule-2 44px finger target. */
  .epitaxy-prompt button[aria-label="Add"] {
    align-self: center !important;
    flex: 0 0 auto !important;
    margin-left: 4px !important;
    margin-right: 2px !important;
  }
}
`);

/* Companion to rule 11. Two jobs, both driven off the visualViewport API (the
   only thing that reflects the soft keyboard; vh/dvh can't see it):

   1. Detect whether the keyboard is up and toggle the .ccm-kb-open class on
      <html>, which is the sole switch that arms rule 11. Detection compares the
      current visible height against the keyboard-down baseline (maxH). That
      baseline is seeded from window.innerHeight, NOT vv.height: the layout
      viewport (innerHeight) doesn't shrink for the soft keyboard (the viewport
      meta is resizes-visual, not interactive-widget=resizes-content) and is
      immune to rule 11's html-height pin, so it's a stable keyboard-down anchor
      even when a freshly-opened session auto-focuses the composer with the
      keyboard already up (where seeding from vv.height would lock in the
      keyboard-UP height and rule 11 would never arm). The keyboard steals
      ~250-350px; UA chrome show/hide only moves ~60px, so a 150px threshold
      cleanly separates the two. vv.height is the browser's own visible region,
      so it's immune to the html height changes rule 11 makes — no feedback loop.
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
  // Keyboard-down baseline: innerHeight (layout viewport) doesn't shrink for the
  // soft keyboard and is immune to rule 11's pin, so it survives a session that
  // opens with the keyboard already up. vv.height is the fallback if innerHeight
  // is somehow smaller (e.g. desktop split views).
  function fullHeight() { return Math.max(window.innerHeight, vv.height); }
  var maxH = fullHeight();
  var prevH = vv.height;
  var wasOpen = false;
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
    // Rule 11 only applies below 900px; above it the class does nothing and the
    // scroll-hold would nudge an unrelated scroller. Bail (and clear any armed
    // state) so the desktop layout is never touched.
    if (window.innerWidth > 900) {
      if (wasOpen) { de.classList.remove('ccm-kb-open'); wasOpen = false; }
      prevH = vv.height;
      return;
    }
    maxH = Math.max(maxH, fullHeight());
    var kbOpen = (maxH - vv.height) > 150;
    de.classList.toggle('ccm-kb-open', kbOpen);
    de.style.setProperty('--ccm-vvh', vv.height + 'px');
    var delta = prevH - vv.height; // > 0 when the keyboard opens (height shrinks)
    prevH = vv.height;
    // Only hold the transcript bottom across an actual keyboard transition.
    // Gating on the delta size alone misfired on UA-chrome show/hide (~60-90px),
    // which clamped near the bottom and drifted the transcript one way each cycle.
    if (kbOpen || wasOpen) {
      var s = findScroller();
      if (s) s.scrollTop += delta;
    }
    wasOpen = kbOpen;
  }
  vv.addEventListener('resize', sync);
  sync();
})();

/* Companion to rule 18. Relocate the composer "+" (the Add / attach button)
   from the bottom toolbar row up INTO the composer input row, inline to the left
   of the textarea. This can't be done in CSS: the "+" lives in a separate
   sibling row (.epitaxy-chat-column > the py-[4px] toolbar, alongside the
   permission-mode toggle and model selector) from the input box, and CSS
   reordering can't move a node across containers. So move the node itself —
   insert it as the first child of the input row (.epitaxy-prompt's
   div.relative.flex.w-full, whose other children are the flex-1 text input and
   the .self-end Send button). flex-1 on the input then shoves the textarea over
   to make room, which is the "push the textarea over" behaviour we want.

   The app is React and owns these nodes, re-rendering the composer on state
   changes (typing, permission-mode / model toggles, send). A MutationObserver
   re-asserts the move whenever a re-render puts the button back in the toolbar.
   relocate() is a no-op once the button is already first child, so the observer
   settles instead of looping, and it is wrapped so a reconciliation race can
   never throw out of our handler into the page. */
(function () {
  function relocate() {
    try {
      var input = document.querySelector('.epitaxy-prompt-input');
      var plus = document.querySelector('button[aria-label="Add"]');
      if (!input || !plus) return;
      var row = input.parentElement; // div.relative.flex.w-full
      if (!row) return;
      if (plus.parentElement === row && row.firstElementChild === plus) return;
      row.insertBefore(plus, row.firstChild);
    } catch (e) { /* never let a reconciliation race break the composer */ }
  }
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; relocate(); });
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true,
  });
  relocate();
})();

/* Dismiss the sidebar drawer after a nav-row tap (mobile only).

   On phone widths the sidebar is an overlay drawer, but tapping one of its nav
   rows (New session / Routines / Customize / a recent session) navigates the
   underlying page WITHOUT closing the drawer — so you're left staring at the
   menu sitting on top of freshly-changed content, and the in-drawer list often
   blanks during the route change ("the sessions disappear but the menu stays
   open"). The app already dismisses the drawer on Escape, so after a row tap we
   fire Escape ourselves.

   Two guards keep it from firing where it shouldn't: width <= 900 (desktop keeps
   a persistent sidebar — never auto-close it), and a still-open check (a menu row
   still painted on-screen) so a stray Escape can't dismiss some unrelated popover
   when the drawer already closed on its own. The tap is let through untouched and
   the Escape is deferred a tick so the app's own navigation runs first. */
(function () {
  var ROW = 'aside[aria-label="Sidebar"] button[data-row-main-button]';
  function drawerOpen() {
    var rows = document.querySelectorAll(ROW);
    for (var i = 0; i < rows.length; i++) {
      if (!rows[i].offsetParent) continue; // display:none / detached
      var r = rows[i].getBoundingClientRect();
      if (r.width > 0 && r.left >= 0 && r.left < window.innerWidth) return true;
    }
    return false;
  }
  function dismiss() {
    if (window.innerWidth > 900 || !drawerOpen()) return;
    ['keydown', 'keyup'].forEach(function (type) {
      document.dispatchEvent(new KeyboardEvent(type, {
        key: 'Escape', code: 'Escape', keyCode: 27, which: 27,
        bubbles: true, cancelable: true,
      }));
    });
  }
  document.addEventListener('click', function (e) {
    if (window.innerWidth > 900) return;
    var t = e.target;
    if (!t || !t.closest || !t.closest(ROW)) return;
    setTimeout(dismiss, 350); // let the app's navigation handler run first
  }, true);
})();
