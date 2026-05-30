// ==UserScript==
// @name         Claude Code — mobile UI fixes
// @namespace    https://claude.ai/code
// @version      1.54.0
// @description  Bigger tap targets, larger fonts, and a tighter layout for the claude.ai/code web client on phones. Moves the composer "+" inline beside the input. Keeps the layout aligned across soft-keyboard open/close. Auto-dismisses the sidebar drawer after a nav-row tap. Keeps the soft keyboard down when switching into a session so the history is readable. Disables the app's custom right-click/long-press menu so the native browser menu shows.
// @match        https://claude.ai/code*
// @run-at       document-start
// @grant        GM_addStyle
// @homepageURL  https://github.com/GetsEclectic/claude-code-mobile-userscript
// @downloadURL  https://cdn.jsdelivr.net/gh/GetsEclectic/claude-code-mobile-userscript@main/claude-code-mobile.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/GetsEclectic/claude-code-mobile-userscript@main/claude-code-mobile.user.js
// ==/UserScript==

/* Scoped to phone widths so a desktop visit is untouched. Targets stable
   aria-label / data-testid / role hooks, never the hashed epitaxy- / dframe-
   class names. CSS verified by injecting into an emulated 412px viewport
   (scripts/claude_web_dom_dump.py --inject-userjs) before shipping.

   Keep the @media block free of the two-character sequence that closes a CSS
   comment: one stray occurrence inside a comment silently truncates the whole
   sheet to zero parsed rules. */

window.__ccmStyleEl = GM_addStyle(`
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
  [aria-label="Dismiss question"],
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

  /* 4b. The native "Scroll to bottom" pill is an absolute overlay anchored at
     top:-32px and sized to its own ~24px height, so it sits cleanly in the
     transcript just above the composer dock. Rules 2 and 4 used to inflate it
     to a 44/40px finger target, but its anchor is fixed for the 24px height —
     the taller box overflowed downward into the dock and upward into the
     transcript, surfacing as a stray floating chevron box straddling the last
     transcript line (it's a transient overlay, not a primary tap target). Keep
     it native; specificity (0,1,0) outranks rule 4's bare button selector. */
  [aria-label="Scroll to bottom"] {
    min-width: 0 !important;
    min-height: 0 !important;
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
     reaches past the screen's top-left corner (18px above and left of the chip,
     8px below), but stops at the chip's right edge so it never steals taps from
     the title text in the gutter. */
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
    top: -18px !important;
    bottom: -8px !important;
    left: -18px !important;
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
     app's stock layout, untouched.

     ALSO gated on :not(.ccm-drawer-open): the first-tap-opens-menu fix keeps the
     composer focused (keyboard up) while the sidebar drawer opens, so .ccm-kb-open
     is still set when the drawer is showing. With the height pin active, the
     drawer's flex-1 Recents list collapses to zero (blank void under "Customize").
     The companion below adds .ccm-drawer-open while the drawer is open; suspending
     this height pin then restores the Recents list.

     The height pin also extends down into the tiles-shell container chain to close
     a React-mount race window. When a pre-existing session is opened with the
     keyboard already up, the companion fires just after React mounts the session
     view. Between mount and companion-fire, the inline-styled flex-item that serves
     as the containing block for .tiles-shell (position:absolute) may not have
     received the new height from the cascade yet. The session column inside
     tiles-shell uses h-full (height:100%) all the way down, so a stale containing
     block height produces a short column — transcript fills it, dock sits at
     content-height, void below. Pinning tiles-shell > .h-full and its .flex-col
     child directly to var(--ccm-vvh) short-circuits the cascade dependency and
     ensures correct height during the race window. Both selectors use child
     combinators (>) to hit only the two specific nodes in the tiles-shell subtree,
     not arbitrary h-full / flex-col elements deeper in the transcript. */
  html.ccm-kb-open:not(.ccm-drawer-open),
  html.ccm-kb-open:not(.ccm-drawer-open) body.min-h-screen,
  html.ccm-kb-open:not(.ccm-drawer-open) .epitaxy-root {
    height: var(--ccm-vvh, 100dvh) !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }
  html.ccm-kb-open:not(.ccm-drawer-open) .tiles-shell > .h-full,
  html.ccm-kb-open:not(.ccm-drawer-open) .tiles-shell > .h-full > .flex-col {
    height: calc(var(--ccm-vvh, 100dvh) - 18px) !important;
    min-height: 0 !important;
  }

  /* 11b. Companion to rule 11 for the kb-open+drawer-open window. Rule 11
     suspends on .ccm-drawer-open so the Recents list can render at full
     height. But on Firefox Android the keyboard rise during drawer-open
     produces a visual-viewport pan (vv.offsetTop jumps to ~334 to keep the
     focused composer visible) because layout is unconstrained at 854px while
     vv.height shrank to 520. The v1.44 window.scrollTo unpan is a no-op here:
     deScrollHeight==deClientHeight, so the document has no scroll range to
     consume the offset. Without intervention the pan can't be unwound and
     the panned state persists after the drawer closes — that's the C
     black-gap. Fix: pin html + body to vv.height (only, no +offsetTop) during
     the drawer-open+kb-up window so layout matches the visible area and
     Firefox has no reason to pan. Deliberately skip .epitaxy-root and the
     inner .tiles-shell clamps from rule 11 — bisected empirically over RDP
     against the live Firefox tab: every variant that clamped .epitaxy-root
     broke the drawer's session-list first-open render (likely a virtualized
     scroller keying its visible window off .epitaxy-root geometry); html +
     body alone prevents the pan without disturbing the list. Uses a separate
     CSS variable --ccm-vvh-drawer = vv.height (no offsetTop addition) — see
     the sync() body for where it's set. */
  html.ccm-kb-open.ccm-drawer-open,
  html.ccm-kb-open.ccm-drawer-open body.min-h-screen {
    height: var(--ccm-vvh-drawer, 100dvh) !important;
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

  /* 13. The Send / Stop button is the primary composer action. Give it a 30px
     finger target shaped as a circle (border-radius:full) rather than the stock
     rounded-rect, so the coral accent (rule 17) reads as a tidy disc instead of
     a heavy slab. The .btn-squish fill span inherits the radius (rounded-
     [inherit]). Target the button by its slot (.epitaxy-prompt .self-end button)
     so it covers both the Send arrow and the Stop square, plus the labels. 30px
     keeps the disc compact and matches the relocated "+" box (rule 18) for a
     balanced composer; 40px read as too heavy a slab, the stock 24px is too
     small a tap target. */
  .epitaxy-prompt .self-end button,
  [aria-label="Send"],
  [aria-label="Stop"] {
    min-width: 30px !important;
    min-height: 30px !important;
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
     py-[4px] toolbar, rule 16's shrink no longer applies and it would regain the
     rule-2 44px finger target. But the "+" glyph is only ~13px, so a 44px box
     floats it in dead space — the "too much padding around the +" Ben flagged.
     Shrink the VISIBLE box to 30px so it hugs the glyph and sits closer to the
     text, and trim the margins. A transparent ::after restores the finger target
     (hit-slop reaching left/up/down past the chip) without the visual bulk — same
     trick as rule 10. Right slop stays 0 so it never steals taps from the
     textarea sitting immediately to its right.

     The 44px dead space Ben kept seeing was NOT min-width: the app sizes this
     button with an explicit width:44px;height:44px (size-11), and rule 2 reinforces
     it with min-width/min-height:44px. Setting only min-width:28px left the
     explicit 44px width standing (a min floor can't shrink an explicitly-sized
     box), and rule 2's min-height:44px was never overridden so it stayed 44px tall
     — the 12px glyph then floated in a 44px square. So pin BOTH width AND height to
     30px and drop the mins to 0; the absolute inset-0 fill span follows the box
     down. Verified empirically: box goes 44->30 with the glyph hugged.

     margin-left:6px gives the box a small left gutter inside the rounded composer
     box so it isn't jammed against the left border — matched to the ~6px gutter
     the Send button leaves on the right, so the two icon controls read as
     symmetric instead of the "+" hugging the wall. Verified: + left edge and Send
     right edge both sit 6px inside the .epitaxy-prompt box. */
  .epitaxy-prompt button[aria-label="Add"] {
    align-self: center !important;
    flex: 0 0 auto !important;
    width: 30px !important;
    height: 30px !important;
    min-width: 0 !important;
    min-height: 0 !important;
    margin-left: 6px !important;
    margin-right: 0 !important;
    position: relative !important;
  }
  .epitaxy-prompt button[aria-label="Add"]::after {
    content: "" !important;
    position: absolute !important;
    top: -12px !important;
    bottom: -12px !important;
    left: -8px !important;
    right: 0 !important;
  }
  /* Even with the box shrunk to 28px, a visible gap remained between the + and
     the composer text. That leftover is the text field's own left inset (now
     sitting to the +'s right) plus the flex gap on the input row that relocate
     drops the + into (div.relative.flex.w-full) — not the button. Zero the
     field's left inset and the row gap so the placeholder/caret starts right
     after the +. Scoped to .epitaxy-prompt so the stock toolbar and other flex
     rows are untouched. */
  .epitaxy-prompt .epitaxy-prompt-input {
    padding-left: 0 !important;
    margin-left: 0 !important;
  }
  .epitaxy-prompt .relative.flex.w-full {
    gap: 0 !important;
  }

  /* 19. The session-actions dropdown — the "little arrow" menu next to the
     in-session title (Open in / Rename / Color / Transcript view / Copy link /
     Edit environment / Archive / Delete). Its rows are role="menuitem", so rule 1
     already lifts their label to 16px — but rule 4's 40px min-height floor only
     covers button / [role="button"], never menuitem, so the rows keep their stock
     3px py padding and render ~27px tall: a cramped, easy-to-mis-tap target. Bump
     the label a touch more and give each row a 40px finger-height. The row is
     already display:flex / items-center (its own classes), so min-height vertically
     centers the label rather than stretching it, and the submenu-arrow rows
     (justify-between) keep their layout. */
  [role="menuitem"] {
    font-size: 17px !important;
    min-height: 40px !important;
  }

  /* 20. The per-message meta row under each turn (timestamp + Copy message / Edit)
     is glanceable secondary action, not a primary target — but rule 2 inflates its
     Copy button to 44px and rule 4's universal 40px floor catches the rest, so the
     row balloons from its stock ~24px to ~48px. That adds ~24px of dead space below
     every message, which reads as a too-large gap between a turn and the next one.
     Give it the bottom-toolbar treatment (rule 16): let the controls collapse back
     to natural height. The row's pt-[4px] hook scopes this to the meta row;
     .epitaxy-chat-column keeps it off like-classed rows outside the transcript. */
  .epitaxy-chat-column [class*="pt-[4px]"] button,
  .epitaxy-chat-column [class*="pt-[4px]"] [role="button"] {
    min-height: 0 !important;
    min-width: 0 !important;
  }

  /* 21. Hide the sidebar drawer's Routines / Customize / More rows. They sit
     above the recents list and eat a lot of vertical room — with the soft
     keyboard up the drawer's viewport is short enough that only two rows fit,
     pushing recents (the only thing Ben uses the drawer for) off-screen. Ben
     doesn't use these three rows. More has a stable aria-label so a CSS rule
     handles it; Routines and Customize are text-only buttons with no stable
     attribute (same class soup as every other row), so the companion below
     marks them with [data-ccm-hide-row] and this rule hides anything marked. */
  aside[aria-label="Sidebar"] button[aria-label="More navigation items"],
  aside[aria-label="Sidebar"] button[data-ccm-hide-row] {
    display: none !important;
  }
}
`);
/* v1.46 bisect: ccmCss=0 removes the entire stylesheet (keeps companion JS),
   so a phone test can split a CSS-caused gap from a JS-caused one. GM_addStyle
   returns the injected <style>; remove it if the flag is set. Guarded so it's a
   no-op in the dump harness (which injects CSS separately and never runs this
   line's GM_addStyle, leaving window.__ccmStyleEl undefined). */
try {
  if (localStorage.getItem('ccmCss') === '0' &&
      window.__ccmStyleEl && window.__ccmStyleEl.remove) {
    window.__ccmStyleEl.remove();
  }
} catch (e) { /* localStorage can throw in some sandboxes */ }

/* v1.45 bisect toggles. Each defaults ON ('1'); flip OFF from the phone by
   localStorage.setItem('ccmRule11','0') (etc), then reload. Read once at script
   start so the user can toggle without page reload only by reloading. Reported
   in ccmHist snapshots as `flags` so a dump tells us which path was live. */
window.__ccmFlags = (function () {
  function f(k, dflt) {
    try { var v = localStorage.getItem(k); return v === null ? dflt : v !== '0'; }
    catch (e) { return dflt; }
  }
  return {
    rule11: f('ccmRule11', true),       // gates ccm-kb-open class toggle (height pin)
    scrollHold: f('ccmScrollHold', true), // gates s.scrollTop += delta
    unpan: f('ccmUnpan', true),         // gates window.scrollTo(_, sY + offsetTop)
    drawerSync: f('ccmDrawerSync', true), // gates ccm-drawer-open class toggle
    noKbOnSwitch: f('ccmNoKbOnSwitch', true), // gates keyboard-down-on-session-switch
  };
})();

/* Debug instrumentation — v1.38.0. Off by default; activate by adding
   ?ccmDebug=1 to the URL once (persists via localStorage.ccmDebug='1';
   clear with ?ccmDebug=0 or localStorage.removeItem('ccmDebug')).

   No on-screen overlay. Mid-bug the overlay vanished (an ancestor
   transform/filter scoped the position:fixed box, even after re-anchoring
   to documentElement + vv offsets), so v1.37 dropped it. v1.38 adds a
   single floating "DUMP" button that on tap downloads localStorage.ccmHist
   as a JSON blob — release Firefox on Android doesn't route console.log
   to logcat, so console emission was a dead transport; a downloaded file
   is the working path. After repro, tap DUMP, then pull from the phone:
     bin/phone-adb pull /sdcard/Download/ccm-hist-<ts>.json

   Two transports:
   1. localStorage.ccmHist — 20-entry ring of state snapshots (1Hz).
   2. Tap-to-download blob (the DUMP button).

   Exposes window.__ccmDbg.log(type, data) — the rule-11 companion,
   drawer-state companion, and sidebar-tap handler call it; events are
   appended to the snapshot ring so they survive into the dump. */
(function () {
  try {
    var qs = new URLSearchParams(location.search);
    if (qs.get('ccmDebug') === '1') localStorage.setItem('ccmDebug', '1');
    if (qs.get('ccmDebug') === '0') localStorage.removeItem('ccmDebug');
    if (localStorage.getItem('ccmDebug') !== '1') return;
  } catch (e) { return; }
  var ring = []; var MAX = 40;
  window.__ccmDbg = {
    log: function (type, data) {
      ring.push({ t: Date.now(), type: type, data: data || null });
      if (ring.length > MAX) ring.shift();
    },
    events: ring,
  };
  var HIST_KEY = 'ccmHist';
  var HIST_MAX = 600;
  function pushHist(snap) {
    try {
      var hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
      hist.push(snap);
      if (hist.length > HIST_MAX) hist = hist.slice(-HIST_MAX);
      localStorage.setItem(HIST_KEY, JSON.stringify(hist));
    } catch (e) { /* localStorage full or blocked */ }
  }
  var lastSaveT = 0;
  function rect(sel) {
    var n = document.querySelector(sel);
    if (!n) return null;
    var r = n.getBoundingClientRect();
    return { y: Math.round(r.top), h: Math.round(r.height) };
  }
  // v1.42: full rect (x,y,w,h) + computed position/top/bottom/transform/zIndex —
  // bug persists with body/prompt geometry looking normal, so the broken element
  // must be repositioned by app JS in a way getBoundingClientRect of those
  // specific selectors doesn't capture. Probe more, probe deeper.
  function rectFull(sel) {
    var n = document.querySelector(sel);
    if (!n) return null;
    var r = n.getBoundingClientRect();
    var cs = getComputedStyle(n);
    return {
      x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height),
      pos: cs.position,
      top: cs.top, bot: cs.bottom, left: cs.left, right: cs.right,
      tf: cs.transform === 'none' ? '' : cs.transform,
      z: cs.zIndex,
      ovY: cs.overflowY,
    };
  }
  // v1.43: bug screenshot shows composer at visual y≈140 of a ~545-tall visible
  // area, but rectFull('.epitaxy-prompt') reports y=831 (visual y=497). There
  // are multiple `.epitaxy-prompt` matches and querySelector grabs the wrong
  // one (same as .epitaxy-markdown returning y=-2187 while elementsFromPoint
  // finds a visible .epitaxy-markdown at y=417). Probe every match.
  function rectsAll(sel) {
    var nodes = document.querySelectorAll(sel);
    if (!nodes || !nodes.length) return null;
    var out = [];
    for (var i = 0; i < nodes.length && i < 6; i++) {
      var n = nodes[i];
      var r = n.getBoundingClientRect();
      var cs = getComputedStyle(n);
      out.push({
        i: i,
        x: Math.round(r.left), y: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height),
        pos: cs.position,
        top: cs.top, bot: cs.bottom,
        tf: cs.transform === 'none' ? '' : cs.transform,
        z: cs.zIndex,
        ovY: cs.overflowY,
        vis: cs.visibility,
        disp: cs.display,
      });
    }
    return out;
  }
  // What is painted at (x,y)? Returns the topmost ~3 elements in CSS px.
  // Used to identify the composer's actual DOM node and what fills the gap.
  function elsAt(x, y) {
    var out = [];
    try {
      var els = document.elementsFromPoint(x, y) || [];
      for (var i = 0; i < els.length && i < 3; i++) {
        var e = els[i];
        var r = e.getBoundingClientRect();
        var tag = e.tagName.toLowerCase();
        var id = e.id ? '#' + e.id : '';
        var cls = (e.className && typeof e.className === 'string')
          ? '.' + e.className.split(/\s+/).slice(0, 2).join('.') : '';
        out.push({
          sel: tag + id + cls,
          y: Math.round(r.top), h: Math.round(r.height),
          pos: getComputedStyle(e).position,
        });
      }
    } catch (e) {}
    return out;
  }
  // All position:fixed elements with non-zero size — the actual composer may
  // be a fixed layer outside .epitaxy-prompt.
  function fixedScan() {
    var out = [];
    try {
      var all = document.querySelectorAll('body *');
      for (var i = 0; i < all.length; i++) {
        var n = all[i];
        var cs = getComputedStyle(n);
        if (cs.position !== 'fixed') continue;
        var r = n.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) continue;
        var tag = n.tagName.toLowerCase();
        var id = n.id ? '#' + n.id : '';
        var cls = (n.className && typeof n.className === 'string')
          ? '.' + n.className.split(/\s+/).slice(0, 2).join('.') : '';
        out.push({
          sel: tag + id + cls,
          x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height),
          top: cs.top, bot: cs.bottom,
          tf: cs.transform === 'none' ? '' : cs.transform,
          z: cs.zIndex,
        });
        if (out.length > 12) break;
      }
    } catch (e) {}
    return out;
  }
  function snapshot() {
    var vv = window.visualViewport;
    var de = document.documentElement;
    var cs = getComputedStyle(de);
    var vvh = cs.getPropertyValue('--ccm-vvh').trim() || '';
    var htmlH = parseFloat(cs.height) || null;
    var guard = Math.max(0, (window.__ccmSidebarTapUntil || 0) - Date.now());
    var iw = window.innerWidth;
    var vh = vv ? vv.height : window.innerHeight;
    // Drain the event ring into the snapshot so each saved entry carries
    // both layout state and the events that fired in the preceding tick.
    var events = ring.splice(0, ring.length);
    return {
      t: Date.now(),
      vv: vv ? Math.round(vv.height) : null,
      vvOff: vv ? { x: Math.round(vv.offsetLeft), y: Math.round(vv.offsetTop) } : null,
      inH: window.innerHeight,
      iw: iw,
      sY: Math.round(window.scrollY || 0),
      dsT: Math.round(de.scrollTop || 0),
      bsH: Math.round(document.body ? document.body.scrollHeight : 0),
      deSH: Math.round(de.scrollHeight || 0),
      vvh: vvh,
      htmlH: htmlH != null ? Math.round(htmlH) : null,
      max: window.__ccmMaxH != null ? window.__ccmMaxH : null,
      kb: de.classList.contains('ccm-kb-open') ? 1 : 0,
      dr: de.classList.contains('ccm-drawer-open') ? 1 : 0,
      guard: guard,
      // v1.45 — which bisect toggles were live for this snapshot.
      flags: window.__ccmFlags || null,
      // Full computed-style probes — the bug is in something we weren't
      // measuring before, so dump position/top/bottom/transform/zIndex.
      body: rectFull('body'),
      // v1.43: every match for selectors that have multiples — querySelector
      // was grabbing the wrong .epitaxy-prompt (hidden/template at y=831 while
      // the visible one is at visual y≈140 per bug-state screenshot).
      roots: rectsAll('.epitaxy-root'),
      chatSizes: rectsAll('.epitaxy-chat-size'),
      markdowns: rectsAll('.epitaxy-markdown'),
      prompts: rectsAll('.epitaxy-prompt'),
      // v1.43: sample y now includes vv.offsetTop so the points land inside
      // the visible region. Previously when vvOffY=334 the "top" sample at
      // layout y=80 was 254px above the visible area.
      // The screenshot also tells us the real composer paints near visual
      // y=140, so add a sample there to identify it by selector.
      atTop: elsAt(Math.round(iw / 2), (vv ? Math.round(vv.offsetTop) : 0) + 40),
      atCmp: elsAt(Math.round(iw / 2), (vv ? Math.round(vv.offsetTop) : 0) + 140),
      atMid: elsAt(Math.round(iw / 2), (vv ? Math.round(vv.offsetTop) : 0) + Math.round(vh / 2)),
      atBot: elsAt(Math.round(iw / 2), (vv ? Math.round(vv.offsetTop) : 0) + Math.round(vh) - 30),
      // All fixed-position layers — composer may not be .epitaxy-prompt.
      fix: fixedScan(),
      events: events,
    };
  }
  function tick() {
    if (Date.now() - lastSaveT < 500) return;
    lastSaveT = Date.now();
    pushHist(snapshot());
  }
  function dump() {
    var payload = {
      ver: '1.44.0',
      dumpedAt: new Date().toISOString(),
      ua: navigator.userAgent,
      hist: JSON.parse(localStorage.getItem(HIST_KEY) || '[]'),
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var ts = new Date().toISOString().replace(/[:.]/g, '-');
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ccm-hist-' + ts + '.json';
    document.documentElement.appendChild(a);
    a.click();
    setTimeout(function () {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  }
  window.__ccmDump = dump;
  function mkDumpBtn() {
    if (document.getElementById('ccm-dump-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'ccm-dump-btn';
    btn.textContent = 'DUMP';
    // Bottom-left, far from the composer (bottom-right) and the menu
    // (top-left). 56px target — Material minimum tap-size — so it's
    // findable even if it lands inside a captured-fixed box.
    btn.style.cssText = [
      'position:fixed','left:8px','bottom:8px','z-index:2147483647',
      'width:56px','height:56px','border-radius:50%',
      'background:#0a0','color:#fff','border:2px solid #fff',
      'font:bold 11px/1 monospace','box-shadow:0 2px 8px rgba(0,0,0,0.5)',
      'opacity:0.85','padding:0',
    ].join(';');
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      dump();
      // Flash to confirm tap registered.
      btn.style.background = '#ff0';
      btn.style.color = '#000';
      setTimeout(function () {
        btn.style.background = '#0a0';
        btn.style.color = '#fff';
      }, 250);
    }, true);
    document.documentElement.appendChild(btn);
  }
  setInterval(tick, 500);
  setInterval(mkDumpBtn, 500); // re-attach if the SPA blows it away
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tick(); mkDumpBtn(); });
  } else {
    tick();
    mkDumpBtn();
  }
})();

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
    // First-tap-opens-menu guard. While a tap on the sidebar toggle is in
    // flight, freeze our reaction to the keyboard-close resize. The tap's click
    // is confirmed to fire on touch (scripts/ptr_preventdefault_probe.py truth
    // table), so the menu DID receive the click — but reacting to the resize
    // here (nudging the scroller, releasing rule 11's height pin) moves content
    // under the finger mid-gesture, and the browser then reclassifies the tap as
    // a scroll and cancels the click, so the drawer only opened on the second
    // tap. Holding the layout perfectly still through the tap lets the first
    // click land. Armed unconditionally by the sidebar-tap handler below (NOT
    // gated on ccm-kb-open) so it still fires if keyboard detection is off on a
    // given device. Keep prevH current so the post-guard resize computes its
    // delta from here — no scroll jump once the guard lifts.
    if (Date.now() < (window.__ccmSidebarTapUntil || 0)) {
      if (window.__ccmDbg) window.__ccmDbg.log('r11.guarded', {
        vv: Math.round(vv.height),
      });
      prevH = vv.height;
      return;
    }
    maxH = Math.max(maxH, fullHeight());
    window.__ccmMaxH = maxH;
    var kbOpen = (maxH - vv.height) > 150;
    // v1.45 bisect toggle: ccmRule11=0 disables the height pin entirely by
    // never adding ccm-kb-open (the sole switch arming rule 11's CSS).
    de.classList.toggle('ccm-kb-open', kbOpen && window.__ccmFlags.rule11);
    // Body height = bottom edge of the visual viewport in layout coords. When
    // vv is anchored at the top of the layout viewport (offsetTop=0, the
    // normal case), this is just vv.height — same as before. But the C
    // black-gap bug repros with vv.offsetTop jumping to ~334 (visualViewport
    // gets scrolled WITHIN the layout viewport during menu→session→menu→
    // session nav); body sized to vv.height alone ends 334px short of the
    // visible bottom, and that gap renders black. Adding offsetTop closes it.
    de.style.setProperty('--ccm-vvh', (vv.height + vv.offsetTop) + 'px');
    // Companion to rule 11b. Always set to vv.height alone (no offsetTop
    // addition): the drawer-open pin needs layout == visible area so Firefox
    // doesn't pan; --ccm-vvh's vv.height+offsetTop formula serves rule 11's
    // closed-drawer case and is the wrong target here.
    de.style.setProperty('--ccm-vvh-drawer', vv.height + 'px');
    if (window.__ccmDbg) window.__ccmDbg.log('r11.sync', {
      vv: Math.round(vv.height), max: maxH, kb: kbOpen ? 1 : 0,
      off: Math.round(vv.offsetTop),
    });
    // v1.44: unwind the visual-viewport pan. When vv.offsetTop > 0 the
    // browser has scrolled the visual viewport down within the layout
    // viewport (typically keyboard-avoidance keeping the focused composer
    // visible). Rule 11 grew body to fill the panned layout, but the body's
    // grid layout then places the composer at varying positions inside the
    // 918-px container — leaving 180–700px of empty dark body depending on
    // content. Scrolling the document by vv.offsetTop pulls layout content
    // up so that the focused element is in view via document scroll instead
    // of visual-viewport pan; the browser then lets vv.offsetTop relax to 0.
    // Guarded so it only fires once per offset change, to avoid a loop with
    // any browser re-pan attempt; the next sync re-evaluates.
    if (vv.offsetTop > 0 && kbOpen && window.__ccmFlags.unpan) {
      var nextY = Math.round(window.scrollY + vv.offsetTop);
      if (window.__ccmDbg) window.__ccmDbg.log('r11.unpan', {
        off: Math.round(vv.offsetTop), sY: Math.round(window.scrollY), to: nextY,
      });
      window.scrollTo(window.scrollX, nextY);
    }
    var delta = prevH - vv.height; // > 0 when the keyboard opens (height shrinks)
    prevH = vv.height;
    // Only hold the transcript bottom across an actual keyboard transition.
    // Gating on the delta size alone misfired on UA-chrome show/hide (~60-90px),
    // which clamped near the bottom and drifted the transcript one way each cycle.
    if ((kbOpen || wasOpen) && window.__ccmFlags.scrollHold) {
      var s = findScroller();
      if (s) s.scrollTop += delta;
    }
    wasOpen = kbOpen;
  }
  vv.addEventListener('resize', sync);
  // Also listen to 'scroll' — visualViewport.offsetTop changes (visual viewport
  // pans within the layout viewport) fire vv.scroll, NOT vv.resize. The C
  // black-gap bug is triggered exactly this way: after the drawer dismiss the
  // last r11.sync sees off=0, then vv.offsetTop silently jumps to ~334 with no
  // resize event, so --ccm-vvh stays at vv.height and body ends 334px short.
  vv.addEventListener('scroll', sync);
  sync();
})();

/* Companion to rule 11's :not(.ccm-drawer-open) guard. The first-tap-opens-menu
   fix further down keeps the composer focused when the sidebar drawer opens (so
   the click lands on the first tap), which means the keyboard stays up and
   .ccm-kb-open lingers while the drawer is showing. With rule 11's height pin
   still armed, the drawer's flex-1 Recents list collapses below the clamped
   viewport and reads as a blank void under "Customize". Toggle .ccm-drawer-open
   on <html> whenever the drawer is open so rule 11 suspends and the Recents
   render at full height. Open state is read off the stable aria-expanded on the
   "Open sidebar" button (true = open) — a discrete attribute, so it's immune to
   the opacity transition the drawer panel animates through (computed opacity
   would read an intermediate value mid-animation). Verified empirically: with
   .ccm-kb-open set + drawer open, .epitaxy-root clamps to 400px (recents clipped)
   without this class and returns to natural height with it. */
(function () {
  var de = document.documentElement;
  function sync() {
    var wasOpen = de.classList.contains('ccm-drawer-open');
    var open = !!document.querySelector('[aria-label="Open sidebar"][aria-expanded="true"]');
    // v1.45 bisect toggle: ccmDrawerSync=0 leaves the class off forever.
    de.classList.toggle('ccm-drawer-open', open && window.__ccmFlags.drawerSync);
    if (window.__ccmDbg && wasOpen !== open) window.__ccmDbg.log('drawer', {
      from: wasOpen ? 1 : 0, to: open ? 1 : 0,
    });
    // Drawer just closed. The rule-11 companion's first-tap guard
    // (__ccmSidebarTapUntil) may have suppressed --ccm-vvh / .ccm-kb-open
    // updates during the open/close cycle — e.g. the keyboard-close resize
    // that fires when the drawer takes focus is bailed out and never
    // re-applied. When the drawer closes and rule 11's height pin re-arms,
    // the stale --ccm-vvh strands html at the old keyboard-up height even
    // though the visible area is now larger, leaving a black gap below the
    // composer. Force the rule-11 sync handler to re-derive from live state:
    // clear the guard and dispatch a synthetic resize on visualViewport.
    if (wasOpen && !open) {
      window.__ccmSidebarTapUntil = 0;
      try {
        var vv = window.visualViewport;
        if (vv && typeof vv.dispatchEvent === 'function') {
          if (window.__ccmDbg) window.__ccmDbg.log('synth.resize', {
            vv: vv ? Math.round(vv.height) : '-',
          });
          vv.dispatchEvent(new Event('resize'));
        }
      } catch (e) { /* never let a sync race break the page */ }
    }
  }
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; sync(); });
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    attributes: true, attributeFilter: ['aria-expanded'], subtree: true,
  });
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
   never throw out of our handler into the page.

   REACT-SAFETY GUARD (trc claude-cloud-bootstrap-rpvf1t). Wrapping relocate() in
   try/catch only stops OUR handler from throwing — it does nothing about React's
   OWN later reconciliation of the toolbar we stole the "+" from. The "+" and the
   "Accept edits" permission-mode toggle are direct siblings; tapping the toggle
   re-renders that toolbar, and React's commit calls
   toolbar.insertBefore(node, plus) using the relocated "+" as the reference
   child — but it no longer lives there, so the native call throws
   "NotFoundError: ... not a child of this node" and the app's error boundary
   shows "Something went wrong". Confirmed empirically:
   scripts/ccm_accept_edits_repro.py reproduces three such throws + the error
   boundary WITH this script and none without.

   Fix: defang it surgically. Tag only our relocated "+" (plus.__ccmRelocated)
   and make insertBefore / removeChild treat THAT ONE node as a no-op when React
   operates on a parent it no longer belongs to. Every other node, and every
   normal call, keeps exact native behaviour — the blast radius is the single
   button we moved. */
(function () {
  var origInsert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, refNode) {
    if (refNode && refNode.__ccmRelocated && refNode.parentNode !== this) {
      // React used our relocated "+" as an insertion reference in a parent it no
      // longer lives in. Append instead of throwing so reconciliation survives.
      return origInsert.call(this, newNode, null);
    }
    return origInsert.call(this, newNode, refNode);
  };
  var origRemove = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.__ccmRelocated && child.parentNode !== this) {
      // React is unmounting the old toolbar and trying to remove the "+" from it,
      // but we already moved it out; the DOM is in the desired state, so no-op.
      return child;
    }
    return origRemove.call(this, child);
  };
})();
(function () {
  function relocate() {
    try {
      var input = document.querySelector('.epitaxy-prompt-input');
      var plus = document.querySelector('button[aria-label="Add"]');
      if (!input || !plus) return;
      var row = input.parentElement; // div.relative.flex.w-full
      if (!row) return;
      plus.__ccmRelocated = true; // arm the react-safety guard above for this node
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
   open"). So after a row tap we close the drawer ourselves by re-clicking its
   toggle.

   We do NOT dispatch a synthetic Escape: Escape is also Claude Code's
   stop-generation key, so firing it here cancelled any in-flight turn (showed up
   as a stray "Request interrupted by user" mid-task). Re-clicking the toggle
   routes through the app's own close handler and never touches the keyboard path,
   so a running turn is untouched.

   Two guards keep it from firing where it shouldn't: width <= 900 (desktop keeps
   a persistent sidebar — never auto-close it), and a still-open check (a menu row
   still painted on-screen) — which also ensures the toggle CLOSES the drawer
   rather than re-opening it when it already closed on its own. The tap is let
   through untouched and the dismiss is deferred a tick so the app's own
   navigation runs first. */
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
    var toggle = document.querySelector('[aria-label="Open sidebar"]');
    if (toggle) toggle.click(); // app's own close path — not Escape (would stop a running turn)
  }
  document.addEventListener('click', function (e) {
    if (window.innerWidth > 900) return;
    var t = e.target;
    if (!t || !t.closest || !t.closest(ROW)) return;
    if (window.__ccmDbg) window.__ccmDbg.log('row.tap', null);
    setTimeout(function () {
      if (window.__ccmDbg) window.__ccmDbg.log('row.dismiss', null);
      dismiss();
    }, 350); // let the app's navigation handler run first
  }, true);
})();

/* Fix: with the soft keyboard up, the FIRST tap on the top-left menu (the
   "Open sidebar" button) only dismisses the keyboard — it takes a second tap to
   actually open the drawer.

   Mechanism (settled empirically, scripts/ptr_preventdefault_probe.py): on touch
   the button's click DOES fire on the first tap — it's not being suppressed, it
   reaches the menu. The drawer fails to open because content reflows under the
   finger mid-gesture (the soft keyboard closing the moment the composer blurs),
   so the browser reclassifies the tap as a scroll and CANCELS the already-fired
   click. Prior builds attacked the reflow source: freeze our own rule-11 resize
   reaction (layer 1 below) and preventDefault pointerdown to keep the composer
   focused so the keyboard never closes (layer 2). But the keyboard close — and
   therefore the browser's own native reflow — could not be stopped on the real
   phone, so the native click kept getting eaten. v1.51 stops fighting the
   reflow and stops depending on the native click reaching the menu at all.

   v1.51 fix — drive the toggle with a PROGRAMMATIC click, immune to the
   tap-vs-scroll heuristic:
     - Track pointerdown position on the toggle. On pointerup, if the pointer
       barely moved (a tap, not a scroll/drag), preventDefault the gesture and
       call btn.click() ourselves. A synthetic .click() always dispatches a
       click event regardless of whether the browser would have cancelled the
       native one — so the menu opens on the FIRST tap even when the keyboard
       reflow would otherwise have killed it.
     - A capture-phase click listener swallows the browser's own (possibly
       already-cancelled, possibly not) native click on the toggle so it can't
       double-toggle the drawer back shut; our own programmatic click is let
       through via the `fireOwn` one-shot flag. Net effect: exactly one toggle
       per tap, every time.
     - Scoped to touch pointers on phone widths (<=900px) so desktop mouse and
       the tablet/desktop layout are untouched.

   Layer 1 (the rule-11 freeze, window.__ccmSidebarTapUntil) is kept: even though
   click delivery no longer depends on it, holding the layout still through the
   tap keeps the drawer-open frame from janking. We do NOT blur/force the keyboard
   down ourselves: opening the drawer moves focus into it (React focus-trap),
   dropping the keyboard on its own. An earlier build that forced the keyboard
   down reflowed a frame after the drawer opened and the drawer read it as an
   outside tap, closing itself. */
(function () {
  var SEL = '[aria-label="Open sidebar"]';
  var sx = 0, sy = 0, tracking = false, fireOwn = false, ownFiredAt = 0;

  // Layer 1: freeze rule-11's resize reaction through the tap (layout still).
  document.addEventListener('pointerdown', function (e) {
    var btn = e.target && e.target.closest && e.target.closest(SEL);
    if (!btn) { tracking = false; return; }
    window.__ccmSidebarTapUntil = Date.now() + 700;
    if (window.__ccmDbg) window.__ccmDbg.log('guard.arm', { ms: 700 });
    // Only take over click delivery for touch taps on phone widths; leave
    // desktop mouse / wide layouts on the native path.
    if (e.pointerType === 'touch' && window.innerWidth <= 900) {
      tracking = true; sx = e.clientX; sy = e.clientY;
    } else {
      tracking = false;
    }
  }, true);

  // v1.51: programmatic-click delivery. On a tap (small movement), suppress the
  // gesture's native click and dispatch our own — immune to the scroll heuristic.
  document.addEventListener('pointerup', function (e) {
    if (!tracking) return;
    tracking = false;
    var btn = e.target && e.target.closest && e.target.closest(SEL);
    if (!btn) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.sqrt(dx * dx + dy * dy) > 12) return; // a real scroll/drag — leave it
    e.preventDefault();
    fireOwn = true;
    ownFiredAt = Date.now();
    if (window.__ccmDbg) window.__ccmDbg.log('guard.fire', null);
    btn.click();
  }, true);

  // Swallow the browser's own native click on the toggle so it doesn't
  // double-toggle the drawer back shut; let our programmatic click through.
  // click is a MouseEvent (no pointerType), so we can't re-check touch here —
  // instead gate on `fireOwn` (our synchronous dispatch) for the allow, and a
  // short post-dispatch window for the native straggler from the same gesture.
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest(SEL);
    if (!btn) return;
    if (fireOwn) { fireOwn = false; return; } // our dispatch — allow through
    if (Date.now() - ownFiredAt < 700) { // native straggler from our tap — swallow
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
})();

/* Keep the soft keyboard DOWN when switching into a session.

   Opening a session (a card on the home session-list, a Recents row in the
   drawer, or any route change into a session view) auto-focuses the composer
   textarea on mount, which pops the soft keyboard and eats the top half of the
   screen exactly when you want to READ the session history. The ask: land in a
   session with the keyboard down and the transcript fully visible; the composer
   raises the keyboard only when you tap it yourself.

   We can't stop React from calling .focus() on the textarea, so we blur it back
   the first time it's programmatically focused after a navigation — but ONLY
   when the focus was programmatic. A genuine composer tap (a pointerdown that
   lands on the textarea) is recorded and left alone, so deliberately tapping the
   input still raises the keyboard. Implementation:

     1. Patch history.pushState/replaceState + listen for popstate to catch every
        client-side route change (this script is @run-at document-start, so the
        patch is in place before the app binds its router), and arm a ONE-SHOT
        suppression on each.
     2. On the first composer focusin while armed, blur it and disarm. One-shot
        (not a time window) so re-render focus churn during later typing is never
        touched — only the single autofocus that rides the navigation.
     3. Honor a composer pointerdown in the last 700ms so a real tap that races
        the navigation still wins.

   Verified empirically (scripts/claude_web_dom_dump.py --companion-early, blur →
   arm → focus): programmatic refocus is blurred back, while a focus preceded by
   a composer pointerdown, and any focus with no preceding navigation, are both
   honored.

   Gated on the noKbOnSwitch flag (localStorage ccmNoKbOnSwitch=0 to disable for
   a bisect). */
(function () {
  if (!window.__ccmFlags.noKbOnSwitch) return;
  var COMPOSER = 'textarea, [contenteditable="true"]';
  var armed = false;
  var disarmAt = 0;        // hard cap so a route change with no composer never sticks
  var lastComposerTap = 0;

  // Remember genuine taps on the composer so we never fight the user's own focus.
  document.addEventListener('pointerdown', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest(COMPOSER)) lastComposerTap = Date.now();
  }, true);

  function arm() {
    armed = true;
    disarmAt = Date.now() + 2500; // expire if no composer ever mounts (e.g. session list)
    if (window.__ccmDbg) window.__ccmDbg.log('nokb.arm', null);
  }

  ['pushState', 'replaceState'].forEach(function (m) {
    var orig = history[m];
    if (typeof orig !== 'function') return;
    history[m] = function () {
      var r = orig.apply(this, arguments);
      try { arm(); } catch (e) { /* never let our hook break navigation */ }
      return r;
    };
  });
  window.addEventListener('popstate', arm);
  arm(); // also cover a direct deep-link load that lands straight in a session

  document.addEventListener('focusin', function (e) {
    if (!armed) return;
    if (Date.now() > disarmAt) { armed = false; return; }
    var t = e.target;
    if (!t || !t.closest || !t.closest(COMPOSER)) return;
    armed = false; // one-shot: only the autofocus that rides this navigation
    // A real tap into the composer just now -> honor it, leave the keyboard up.
    if (Date.now() - lastComposerTap < 700) return;
    if (window.__ccmDbg) window.__ccmDbg.log('nokb.blur', null);
    try { t.blur(); } catch (e2) { /* swallow */ }
  }, true);
})();

/* Companion to rule 21. The Routines and Customize sidebar rows have no stable
   attribute — same data-row-main-button buttons as every other row, no aria,
   no testid, no href — so they can only be matched by their text content, and
   CSS has no text-match selector. Walk the sidebar's row buttons and stamp
   data-ccm-hide-row on any whose label is one of the targets; rule 21 then
   hides them. React re-renders the sidebar on drawer open/close and route
   changes, so a MutationObserver re-stamps after each. (More is handled by
   aria-label in rule 21 directly; this only covers the text-only labels.)

   Each row's textContent starts with a Private-Use-Area icon glyph (e.g.
   "Routines"), and the New-session row appends "⇧⌘O" — so strict equality
   on the raw textContent never matched. Strip everything but ASCII letters and
   spaces before comparing, then exact-match against the target set (substring
   matching would risk hiding an unrelated session titled "Customize my X"). */
(function () {
  var HIDE = { 'Routines': 1, 'Customize': 1 };
  function stamp() {
    var rows = document.querySelectorAll(
      'aside[aria-label="Sidebar"] button[data-row-main-button]');
    for (var i = 0; i < rows.length; i++) {
      var label = (rows[i].textContent || '').replace(/[^A-Za-z ]+/g, '').trim();
      if (HIDE[label]) rows[i].setAttribute('data-ccm-hide-row', '');
    }
  }
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; stamp(); });
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true,
  });
  stamp();
})();

/* Disable the app's custom right-click / long-press context menu so the native
   browser menu (Copy / Select / Paste / Look up / Inspect) appears instead.

   The app attaches its own 'contextmenu' handler and calls preventDefault to
   suppress the native menu and render a custom one in its place. We can't remove
   the app's listener, but we can stop the event from ever reaching it: a
   capture-phase listener on window fires before any listener the app adds
   (capture order is window -> document -> ... -> target, and we register at
   document-start, before the app mounts). stopImmediatePropagation halts the
   chain there, so the app never preventDefault's and the platform shows its
   native menu.

   Deliberately does NOT call preventDefault — that would suppress the native
   menu too, leaving NO menu (the opposite of what's wanted). We only block the
   app's interception; the browser's default contextmenu behaviour is untouched.

   Unscoped to width: the custom menu is annoying on desktop right-click as well
   as phone long-press, and "show the native menu" is correct on both. */
(function () {
  window.addEventListener('contextmenu', function (e) {
    e.stopImmediatePropagation();
  }, true);
})();
