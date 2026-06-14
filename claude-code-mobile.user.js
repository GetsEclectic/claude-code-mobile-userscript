// ==UserScript==
// @name         Claude Code — mobile UI fixes
// @namespace    https://claude.ai/code
// @version      1.97.0
// @description  Bigger tap targets, larger fonts, and a tighter layout for the claude.ai/code web client on phones. Moves the composer "+" inline beside the input. Keeps the layout aligned across soft-keyboard open/close via interactive-widget=resizes-content (Firefox Android 132+; Chromium already behaves this way). Auto-dismisses the sidebar drawer after a nav-row tap. Keeps the soft keyboard down when switching into a session so the history is readable. Disables the app's custom right-click/long-press menu so the native browser menu shows. Includes optional, OPT-IN, end-to-end-encrypted diagnostics that are DISABLED by default and send nothing unless you point them at your own endpoint via localStorage (no server or token is baked into this script).
// @match        https://claude.ai/code*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @homepageURL  https://github.com/GetsEclectic/claude-code-mobile-userscript
// @downloadURL  https://raw.githubusercontent.com/GetsEclectic/claude-code-mobile-userscript/main/claude-code-mobile.user.js
// @updateURL    https://raw.githubusercontent.com/GetsEclectic/claude-code-mobile-userscript/main/claude-code-mobile.user.js
// ==/UserScript==

/* Scoped to phone widths so a desktop visit is untouched. Targets stable
   aria-label / data-testid / role hooks, never the hashed epitaxy- / dframe-
   class names. CSS verified by injecting into an emulated 412px viewport
   (scripts/claude_web_dom_dump.py --inject-userjs) before shipping.

   v1.96: hide the "Claude Fable 5 is currently unavailable." service banner
   above the composer (rule 27) — pure CSS off the announcement-link href.

   v1.95: removed the userland keyboard-layout pin (rules 11/11b, --ccm-vvh,
   scrollHold, unpan, scroll-pin, drawer-sync). The platform now handles layout
   via interactive-widget=resizes-content (ccmIW module, added in v1.94).

   Keep the @media block free of the two-character sequence that closes a CSS
   comment: one stray occurrence inside a comment silently truncates the whole
   sheet to zero parsed rules. */

window.__ccmStyleEl = GM_addStyle(`
@media (max-width: 900px) {

  /* 1. Lift control & label text off the 12-13px default. CSS attribute
     selectors are exact-match, so a bare [role="menuitem"] never reaches a
     Radix RadioGroup/CheckboxGroup row (role="menuitemradio"/"menuitemcheckbox")
     — those are what the permission-mode menu (Accept edits / Plan mode / Auto
     mode) and the model/effort pickers use, and they shipped at the stock 13px.
     List all three menu-item roles so every popup row gets the lift. */
  button, a[href], [role="button"], [role="menuitem"],
  [role="menuitemradio"], [role="menuitemcheckbox"], [role="tab"],
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
     to a 44/40px finger target via min-height, but its anchor is fixed for the
     24px height — the taller LAYOUT box overflowed downward into the dock and
     upward into the transcript, surfacing as a stray floating chevron box
     straddling the last transcript line.

     To make it a bigger tap target without that overflow, keep the 24px layout
     box (min-* pinned to 0 so rules 2/4 don't grow it) and enlarge it visually
     with transform: scale(). transform-origin: center bottom grows the pill
     UPWARD into the empty transcript — the bottom edge stays put, preserving
     the ~8px clearance to the dock — and the transform also enlarges the
     hit-test area, so the finger target grows with the visual. Specificity
     (0,1,0) outranks rule 4's bare button selector. */
  [aria-label="Scroll to bottom"] {
    min-width: 0 !important;
    min-height: 0 !important;
    transform: scale(1.5) !important;
    transform-origin: center bottom !important;
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

  /* 7. Reclaim the side gutter. The app insets both the transcript prose and the
     bottom dock so one set of rules narrows the left/right margins everywhere —
     and closes the wide gap to the right of the return/send symbol, which is
     that same gutter.

     v1.86: the single .epitaxy-chat-size hook was split by the app into
     .epitaxy-default-view-width (transcript/header column) and
     .epitaxy-composer-width (composer dock); .epitaxy-chat-size no longer
     exists, so the v1.2 rule went stale and the native gutter came back on BOTH
     the transcript AND the composer (Ben 2026-06-05: "ccm got narrower … the
     composer is narrower too"). Target the new hooks, and keep the old one for
     any view still on the prior class. The override is mechanism-agnostic:
     max-width:none releases a width-constrained centered column, then the 12px
     padding insets it — so it reclaims the gutter whether the app drives it with
     a max-width or with horizontal padding. */
  .epitaxy-chat-size,
  .epitaxy-default-view-width,
  .epitaxy-transcript-width,
  .epitaxy-composer-width {
    max-width: none !important;
    padding-left: 4px !important;
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
  /* 18b. Hide React's REAL "+" in the bottom toolbar. The companion script no
     longer moves it (that broke on soft-nav / the Accept-edits toggle); instead it
     stays put for React to own, and we surface a proxy "+" in the input row. Tag
     the real one (data-ccm-realadd) and hide it so only the proxy shows. The proxy
     forwards clicks to it, so the attach handler still fires from the real node.

     Do NOT use display:none here. The app's attach menu (Add files / Import GitHub
     issue / Slash commands / Connectors) is a Radix popover that anchors to its
     TRIGGER — the real "Add" button — via getBoundingClientRect. A display:none
     node reports an all-zero {top:0,left:0,w:0,h:0} rect, so the popover anchored to
     it floats to the VIEWPORT TOP-LEFT (Ben's 2026-06-06 screenshot: the menu
     opened pinned to the top-left corner instead of by the composer). Instead make
     the button visually hidden but still LAID OUT at its toolbar slot: a real
     position (its toolbar x,y) keeps the popover anchored down by the composer where
     the visible proxy "+" lives. width/height/padding/margin/border all collapse to
     0 (no toolbar gap, no glyph), opacity:0 hides any sliver, overflow:hidden clips
     the SVG, pointer-events:none means it never steals a tap from the proxy. */
  button[aria-label="Add"][data-ccm-realadd]:not([data-ccm-proxy]) {
    width: 0 !important;
    height: 0 !important;
    min-width: 0 !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    flex: 0 0 0 !important;
    opacity: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
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

  /* 19. Popup-menu rows — the session-actions dropdown (Open in / Rename / Color
     / Transcript view / Copy link / Edit environment / Archive / Delete) AND the
     permission-mode menu (Accept edits / Plan mode / Auto mode, off the composer
     toggle) plus the model/effort pickers. Rule 1 already lifts the labels to
     16px, but rule 4's 40px min-height floor only covers button / [role="button"]
     — never the menu-item roles — so the rows keep their stock py padding and
     render cramped (~27px for the action menu; just 24px for the mode menu, whose
     rows are min-h-[var(--h4)]). Bump the label a touch more and give each row a
     40px finger-height.

     The mode/picker rows are role="menuitemradio" (a Radix RadioGroup) and the
     action rows are role="menuitem"; a bare [role="menuitem"] is exact-match and
     misses the radio rows entirely — the cramped mode menu in Ben's 2026-06-06
     screenshot — so list all three menu-item roles. The rows are already
     display:flex / items-center (own classes), so min-height vertically centers
     the label rather than stretching it, and the submenu-arrow rows
     (justify-between) keep their layout. */
  [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"] {
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

  /* 22. AskUserQuestion card: cap height so it never fills the screen, and make
     its body scrollable so all option text + Submit/Skip are reachable without
     the transcript being pushed off-screen. The card container is
     .epitaxy-approval-card (same stable epitaxy- naming as .epitaxy-chat-column
     etc.), confirmed via --ancestry [aria-label="Dismiss question"]: it is the
     first non-button, non-span ancestor with meaningful size, and it is the
     natural scroll host because it wraps title, all option rows, the free-text
     input, and the Submit/Skip footer. Cap at 40vh so the card occupies under
     half the screen and the transcript stays clearly readable above it; any
     overflow scrolls within the card. overflow-y:auto not hidden so Submit/Skip
     (inside the card) are reachable by scrolling. */
  .epitaxy-approval-card {
    max-height: 40vh !important;
    overflow-y: auto !important;
  }
  /* 22b. Capping the card at 40vh (rule 22) turns it into a height-constrained
     flex column. Its flex children (the question title, the options list, the
     footer) then have room to SHRINK below their content height — and the title
     is a flex item whose text overflows visibly. The result on real Android
     (Ben's 2026-05-31 screenshot): the title collapses toward zero height, the
     option rows lay out from the top of the card as if the title took no space,
     and the bold title text paints DOWN over the first option cards. This is a
     pure flex-shrink collapse, not a sticky/absolute/paint issue — it only
     appears because rule 22 constrains the height. Fix: forbid the card's direct
     children from shrinking and restore their auto min-height, so each keeps its
     full content height and the card (overflow-y:auto) scrolls instead of
     letting items overlap. */
  .epitaxy-approval-card > * {
    flex-shrink: 0 !important;
    min-height: auto !important;
  }

  /* 23. Idle-session count badge on the top-left menu (sidebar toggle). The
     companion JS below counts idle sessions from the /v1/sessions API (every
     status except running / pending / archived / deleted — i.e. idle +
     requires_action) and appends a .ccm-idle-badge chip to the button.
     Rule 10 already makes the button position:relative at phone widths, so the
     badge anchors to its top-right corner. pointer-events:none so a tap in the
     corner still falls through to the button (the badge sits inside rule 10's
     hit-slop). Amber reads as "attention" against both the dark and light bar.
     Scoped here under @media so a desktop visit never shows it; the companion
     also gates on the same media query and removes the chip off-phone. */
  aside.dframe-sidebar [aria-label="Open sidebar"] .ccm-idle-badge {
    position: absolute !important;
    top: -7px !important;
    right: -7px !important;
    min-width: 16px !important;
    height: 16px !important;
    box-sizing: border-box !important;
    padding: 0 4px !important;
    border-radius: 8px !important;
    background: #d97706 !important;
    color: #fff !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    line-height: 16px !important;
    text-align: center !important;
    white-space: nowrap !important;
    pointer-events: none !important;
    box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.35) !important;
    z-index: 5 !important;
  }

  /* 24. Steer cue for the re-wired action button. Mid-turn the bottom-right
     control renders as the Stop square (□). The companion JS below re-wires it:
     while a turn is streaming AND the composer holds text, a tap SENDS that text
     as a steer (synthetic Enter on the composer) instead of stopping the turn —
     so you can redirect a running turn without the Stop→retype→Send dance. When
     that re-wire is armed the JS stamps data-ccm-steer on the Stop button; this
     rule repaints it so the affordance matches the action: a distinct blue fill
     (vs rule 17's coral) and an up-arrow (↑) overlaid in place of the stop glyph,
     reading as "send" not "stop". When the composer is empty the attribute is
     absent and the button stays the normal coral Stop — empty-composer taps still
     stop the turn. position:relative anchors the ::after arrow; the inner glyph is
     opacity:0'd (not display:none) so the button keeps its size. */
  button[aria-label="Stop"][data-ccm-steer] {
    position: relative !important;
  }
  button[aria-label="Stop"][data-ccm-steer] .btn-squish {
    background: #2c84db !important;
  }
  button[aria-label="Stop"][data-ccm-steer] svg {
    opacity: 0 !important;
  }
  button[aria-label="Stop"][data-ccm-steer]::after {
    content: "↑";
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    pointer-events: none;
  }

  /* 25. Wider recents drawer + per-row idle-age label. The open drawer panel is
     .dframe-sidebar-body; its width resolves from --df-sidebar-width, but that
     var is set locally (not on .dframe-root), so overriding the var at the root
     doesn't reach it (verified 2026-05-31: var flipped to 360 yet the panel
     stayed 280). We instead override the panel's width directly — proven to take
     it 280px -> 360px — with a 92vw cap so it never runs off a narrow phone. The
     companion JS appends a .ccm-idle-age <span> to each idle row's main button
     (right of the flex-1 title) showing how long the session has been idle
     (humanized from updated_at); it's muted and shrink-proof so the title
     truncates first. */
  .dframe-sidebar-body {
    width: 360px !important;
    max-width: 92vw !important;
  }
  [data-row-main-button] .ccm-idle-age {
    flex: 0 0 auto !important;
    margin-left: auto !important;
    padding-left: 8px !important;
    font-size: 12px !important;
    font-variant-numeric: tabular-nums !important;
    color: var(--text-300, #9b9b9b) !important;
    opacity: 0.8 !important;
    white-space: nowrap !important;
    pointer-events: none !important;
  }

  /* 26. Side panel (plan / file / diff) full-width on phones. The detail panel
     opens as the second "tile" in the .tiles-shell split, sharing width with the
     chat through a draggable .tiles-handle -> at phone width it renders as an
     unreadable ~40% column (the Plan panel that prompted this wrapped text to
     ~10 chars/line; verified 2026-06-03: the handle's sibling tile measured 229px
     wide / position:relative on a 412px viewport). The two tiles are classless
     flex children (inline flex: 2|3 1 0px) split by the handle, so anchor off the
     stable .tiles-handle: hide it, and promote the tile AFTER it (the opened
     detail panel) to a full-bleed overlay covering the split area, so plan/file
     text reflows to full width. The chat tile stays underneath; the panel's own
     X (Close) returns to it. NOTE: must ship via GM_addStyle (Violentmonkey) —
     claude.ai's CSP neutralises a tool-injected <style>, so an --inject-css test
     silently no-ops; verify with --inject-userjs / on-device only. */
  .tiles-handle { display: none !important; }
  .tiles-handle ~ div {
    position: absolute !important;
    inset: 0 !important;
    z-index: 40 !important;
    flex: 1 1 100% !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* 27. Suppress the "Claude Fable 5 is currently unavailable." service banner
     that docks just above the composer. The banner is an aria-live="polite" flex
     row; its one stable hook is the trailing "Learn more" TextLink, an anchor to
     the fable announcement URL (anthropic.com/news/fable-mythos-access) — the
     class names are all hashed/utility. :has() hides the whole row off that
     anchor without catching other polite live regions (none carry that href).
     Pure CSS, so it's CSP-safe via GM_addStyle and self-clears if Fable comes
     back (banner gone -> nothing to match). To hide a different model's
     unavailable banner later, broaden the href match. (Ben, 2026-06-13.) */
  [aria-live="polite"]:has(> a[href*="fable-mythos-access"]) {
    display: none !important;
  }

  /* 28. Per-message action toolbar: surface fork / revert (and Copy / More
     options) on touch. claude.ai/code renders the toolbar below each message
     at opacity-0 pointer-events-none and only flips it visible+tappable via
     group-hover (desktop pointer hover) or focus-within. A touch device fires
     neither, so the whole toolbar — including the More-options button that
     opens the fork/revert popover — is permanently unreachable on the phone.
     Match the toolbar by its hover-state utility class (the slash and colon are
     literal inside the quoted attribute value) and pin it on. The popover that
     More-options opens is portaled to the body, so once the button is tappable
     the fork/revert items render normally. (Ben, 2026-06-14.) */
  [class*="group-hover/msg:opacity-100"] {
    opacity: 1 !important;
    pointer-events: auto !important;
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

/* Feature flags. Read once at script start. Reported in ccmHist snapshots as
   `flags` so a dump tells us which path was live. */
window.__ccmFlags = (function () {
  function f(k, dflt) {
    try { var v = localStorage.getItem(k); return v === null ? dflt : v !== '0'; }
    catch (e) { return dflt; }
  }
  return {
    noKbOnSwitch: f('ccmNoKbOnSwitch', true), // gates keyboard-down-on-session-switch
    steer: f('ccmSteer', true),         // gates the re-wired Stop->steer action button
    iw: f('ccmIW', true),               // gates the interactive-widget viewport-meta patch (v1.94)
  };
})();

/* ────────────────────────────────────────────────────────────────────────
   v1.94 keyboard fix at the platform layer: interactive-widget=resizes-content.

   Firefox Android (132+) defaults to resizes-visual: when the soft keyboard
   opens, only the VISUAL viewport shrinks — innerHeight / 100dvh stay at full
   screen height, so the app's 100dvh-pinned layout keeps laying out under the
   keyboard. Appending interactive-widget=resizes-content to the viewport meta
   tells Firefox to shrink the LAYOUT viewport instead, so the app fits itself
   above the keyboard natively. On Chromium this is a no-op (already its
   behavior). This is now the sole keyboard-layout path; the userland height
   pin was removed in v1.95.

   Kill switch from the phone: open claude.ai/code?ccmIW=0 (no fallback pin —
   keyboard layout just reverts to browser default) — and ?ccmIW=1 to
   re-enable. Persists via localStorage. */
(function () {
  var qs = null;
  try {
    var v = new URLSearchParams(location.search).get('ccmIW');
    if (v === '0') { localStorage.setItem('ccmIW', '0'); qs = false; }
    else if (v === '1') { localStorage.removeItem('ccmIW'); qs = true; }
  } catch (e) { /* localStorage can throw */ }
  var on = qs !== null ? qs : window.__ccmFlags.iw;
  if (!on) { window.__ccmIW = false; return; }
  var MODE = 'resizes-content';
  function patch() {
    var m = document.querySelector('meta[name="viewport"]');
    if (!m) {
      if (!document.head) return false;
      m = document.createElement('meta');
      m.setAttribute('name', 'viewport');
      m.setAttribute('content', 'width=device-width, initial-scale=1');
      document.head.appendChild(m);
    }
    var c = m.getAttribute('content') || '';
    if (c.indexOf('interactive-widget=' + MODE) !== -1) return true;
    // Strip any existing interactive-widget value, then append ours.
    c = c.replace(/,?\s*interactive-widget\s*=\s*[a-z-]+/i, '');
    m.setAttribute('content', c + ', interactive-widget=' + MODE);
    return true;
  }
  window.__ccmIW = patch();
  /* @run-at document-start: <head>/the meta may not exist yet, and the SPA can
     rewrite the meta later. Re-assert on mutations, RAF-coalesced like the
     other observers in this script. */
  var raf = 0;
  new MutationObserver(function () {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      window.__ccmIW = patch();
    });
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['content']
  });
})();

/* ────────────────────────────────────────────────────────────────────────
   Remote diagnostics — OPT-IN, DISABLED BY DEFAULT.

   What it's for: when something breaks on a phone, retrieving the old on-page
   debug dump (?ccmDebug=1 + tap DUMP + pull the file off the device) can't
   answer "I hit a bug — just look at what happened." This module can beacon a
   small encrypted diagnostic the moment something breaks so it can be read
   server-side. It is entirely OFF unless YOU turn it on.

   No server is baked into this public script. There is NO hostname, URL, or
   token here. The module stays completely inert (returns immediately, wraps
   nothing, sends nothing) unless you supply your OWN endpoint at runtime via
   localStorage on your device:

       localStorage.ccmTelemUrl    = 'https://your-host/your-topic'  // required
       localStorage.ccmTelemToken  = '...'                          // optional bearer
       localStorage.ccmTelemPubKey = '<base64 P-256 public key>'     // required

   Transport (only when enabled): GM_xmlhttpRequest POST to ccmTelemUrl. Because
   the destination is user-supplied, your userscript manager will ask you to
   allow that host the first time. The whole beacon body is end-to-end encrypted
   (ECDH P-256 → HKDF-SHA256 → AES-256-GCM, ECIES) to ccmTelemPubKey, so only the
   holder of the matching private key can read it.

   What a beacon would contain (when enabled): error text/stack, failed-fetch
   path+status, error-boundary label text, viewport/layout dims, kb/drawer flags,
   UA, online state. URLs are reduced to location.pathname (the query string is
   DROPPED, since claude.ai/code carries prefilled prompts in ?prompt=…). Message
   bodies, response payloads, and session text are never read.

   Volume (when enabled): low. Errors beacon immediately (deduped by signature);
   layout heartbeats live in a small in-memory ring, flushed only alongside an
   error or as a sparse keepalive (≤1 / 5min).

   Defensive: every path is wrapped so diagnostics can never throw into the page
   or alter app behaviour (the fetch wrapper is fully transparent — it always
   returns the real promise/response untouched, even if logging fails). */
(function () {
  // OPT-IN gate: nothing is sent unless the user configured their own endpoint.
  var ENDPOINT = null, TOKEN = null, PUBKEY_B64 = null;
  try {
    ENDPOINT    = localStorage.getItem('ccmTelemUrl')    || null;
    TOKEN       = localStorage.getItem('ccmTelemToken')  || null;
    PUBKEY_B64  = localStorage.getItem('ccmTelemPubKey') || null;
  } catch (e) {}
  if (!ENDPOINT) return;                                 // disabled by default → no-op
  if (typeof GM_xmlhttpRequest !== 'function') return;   // grant missing → no-op
  // Recipient public key (P-256, X9.62 uncompressed point, base64). Beacons are
  // end-to-end encrypted to it; only the holder of the matching private key can
  // read them. Required — without it we cannot encrypt and we never send plaintext.
  if (!PUBKEY_B64) return;
  var VER = '1.82.0';

  // Stable-per-device client id so multiple beacons correlate into one timeline.
  var cid = 'x';
  try {
    cid = localStorage.getItem('ccmTelemCid');
    if (!cid) { cid = Math.random().toString(36).slice(2, 10); localStorage.setItem('ccmTelemCid', cid); }
  } catch (e) {}

  function path() { try { return location.pathname; } catch (e) { return '?'; } }
  function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) : s; }

  // --- End-to-end encryption (ECIES: ECDH P-256 → HKDF-SHA256 → AES-256-GCM) ---
  // Params MUST match the Python decryptor in bin/ccm-telemetry exactly.
  var subtle = (window.crypto && window.crypto.subtle) || null;
  function b64(buf) {
    var bytes = new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function fromB64(str) {
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Encrypt a plaintext string to the recipient pubkey; resolves to {v,epk,iv,ct}.
  function encryptBeacon(plaintext) {
    var enc = new TextEncoder();
    return subtle.importKey('raw', fromB64(PUBKEY_B64),
      { name: 'ECDH', namedCurve: 'P-256' }, false, []).then(function (recipPub) {
      return subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
        .then(function (eph) {
        return subtle.deriveBits({ name: 'ECDH', public: recipPub }, eph.privateKey, 256)
          .then(function (sharedBits) {
          return subtle.importKey('raw', sharedBits, { name: 'HKDF' }, false, ['deriveKey']);
        }).then(function (hkdfKey) {
          return subtle.deriveKey(
            { name: 'HKDF', hash: 'SHA-256',
              salt: enc.encode('ccm-telem-salt-v1'),
              info: enc.encode('ccm-telemetry-v1') },
            hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
        }).then(function (aesKey) {
          var iv = window.crypto.getRandomValues(new Uint8Array(12));
          return subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, enc.encode(plaintext))
            .then(function (ct) {
            return subtle.exportKey('raw', eph.publicKey).then(function (epk) {
              return { v: 1, epk: b64(epk), iv: b64(iv), ct: b64(ct) };
            });
          });
        });
      });
    });
  }

  // Compact, content-free layout snapshot — the heartbeat unit.
  function state() {
    try {
      var vv = window.visualViewport;
      return {
        vv: vv ? Math.round(vv.height) : null,
        ih: window.innerHeight, iw: window.innerWidth,
        sy: Math.round(window.scrollY || 0),
        // v1.95: the kb/dr class fields died with the userland pin. Under
        // resizes-content, ih shrinking below resting IS the keyboard signal.
        on: navigator.onLine ? 1 : 0,
      };
    } catch (e) { return null; }
  }

  // Ring of recent heartbeats; attached to errors so each beacon carries the
  // ~90s of layout history leading up to the break.
  var ring = [], RING_MAX = 6;
  function pushState() {
    var s = state(); if (!s) return;
    s.t = Date.now(); s.p = path();
    ring.push(s); if (ring.length > RING_MAX) ring.shift();
  }

  // Recent network requests — pathname + status ONLY, never bodies or query
  // (query can hold prompt content). Attached to every beacon so a boundary
  // shows which request(s) backed the failure. This is what diagnoses "Sidebar
  // failed to load" when it's a 200-with-error or an XHR that fetch-wrapping
  // alone can't see.
  var netRing = [], NET_MAX = 10;
  function epOf(url) {
    try { return new URL(url, location.href).pathname; } catch (e) { return clip(url, 80); }
  }
  function pushNet(m, ep, st) {
    netRing.push({ m: m, ep: ep, st: st, t: Date.now() });
    if (netRing.length > NET_MAX) netRing.shift();
  }

  // Outbound rate guard + per-signature dedupe so a render loop can't flood.
  var sent = 0, windowStart = Date.now(), MAX_PER_MIN = 20;
  var seen = {}; // signature -> last-sent ms
  function allow(sig) {
    var now = Date.now();
    if (now - windowStart > 60000) { windowStart = now; sent = 0; }
    if (sent >= MAX_PER_MIN) return false;
    if (sig) { if (now - (seen[sig] || 0) < 30000) return false; seen[sig] = now; }
    sent++; return true;
  }

  // Low-level POST of an already-serialized envelope string.
  function send(payload, kind) {
    try {
      GM_xmlhttpRequest({
        method: 'POST', url: ENDPOINT, data: payload,
        headers: { 'Authorization': 'Bearer ' + TOKEN, 'X-Title': 'ccm:' + kind },
        timeout: 8000,
        onerror: function () {}, ontimeout: function () {},
      });
    } catch (e) {}
  }

  function beacon(kind, data, sig) {
    if (!allow(sig)) return;
    var plaintext;
    try {
      plaintext = JSON.stringify({
        k: kind, cid: cid, ver: VER, p: path(),
        ua: clip(navigator.userAgent, 180),
        ts: new Date().toISOString(),
        d: data || null,
        hist: ring.slice(-3),
        net: netRing.slice(-6),
      });
    } catch (e) { return; }
    // Cap plaintext so the base64 envelope (~1.4x + overhead) stays under a
    // typical ~4 KB message limit; truncation only ever loses trailing context, never breaks
    // decryption since the whole string is one AES-GCM blob.
    if (plaintext.length > 2600) plaintext = plaintext.slice(0, 2600);
    // No WebCrypto → never fall back to plaintext (the channel is public). Emit a
    // tiny content-free marker so we can still see a device is alive but unencryptable.
    if (!subtle) {
      send(JSON.stringify({ v: 0, nocrypto: 1, cid: cid, ver: VER, k: kind,
        ts: new Date().toISOString() }), kind);
      return;
    }
    try {
      encryptBeacon(plaintext).then(function (env) {
        send(JSON.stringify(env), kind);
      }, function () { /* drop on crypto failure — never send plaintext */ });
    } catch (e) {}
  }
  window.__ccmTelem = beacon; // let other modules report intentional events

  // 1. Uncaught errors.
  window.addEventListener('error', function (ev) {
    try {
      if (ev && ev.message) {
        beacon('error', {
          msg: clip(ev.message, 300),
          src: clip(ev.filename, 160),
          ln: ev.lineno, col: ev.colno,
          stack: ev.error && ev.error.stack ? clip(ev.error.stack, 600) : null,
        }, 'err:' + clip(ev.message, 80));
      } else if (ev && ev.target && ev.target.tagName) {
        // Resource load failure (script/img/css) — surfaces CDN/asset breakage.
        var t = ev.target;
        beacon('resfail', { tag: t.tagName, url: clip(t.src || t.href, 200) },
          'res:' + clip(t.src || t.href, 100));
      }
    } catch (e) {}
  }, true);

  // 2. Unhandled promise rejections (most fetch failures land here).
  window.addEventListener('unhandledrejection', function (ev) {
    try {
      var r = ev && ev.reason;
      var msg = r && r.message ? r.message : String(r);
      beacon('reject', { msg: clip(msg, 300), stack: r && r.stack ? clip(r.stack, 500) : null },
        'rej:' + clip(msg, 80));
    } catch (e) {}
  });

  // 3. console.error — React error boundaries log here before painting their
  //    fallback ("Sidebar failed to load", etc.). Wrap transparently.
  try {
    var origErr = console.error;
    console.error = function () {
      try {
        var parts = [];
        for (var i = 0; i < arguments.length && i < 4; i++) {
          var a = arguments[i];
          parts.push(typeof a === 'string' ? a : (a && a.message) ? a.message : '');
        }
        var m = clip(parts.join(' '), 300);
        if (m.trim()) beacon('console', { msg: m }, 'con:' + clip(m, 80));
      } catch (e) {}
      return origErr.apply(console, arguments);
    };
  } catch (e) {}

  // 4. Failed fetches — capture method, path (NO query), status. This is what
  //    nails "Sidebar failed to load": the session-list fetch returns !ok or
  //    rejects. Wrapper is transparent — original promise is always returned.
  try {
    var origFetch = window.fetch;
    if (typeof origFetch === 'function') {
      window.fetch = function (input, init) {
        var p = origFetch.apply(this, arguments);
        try {
          var url = (typeof input === 'string') ? input : (input && input.url) || '';
          var ep = epOf(url); // pathname only — drop query (may hold content)
          var method = (init && init.method) || (input && input.method) || 'GET';
          p.then(function (res) {
            try {
              var st = res ? res.status : 0;
              pushNet(method, ep, st);
              if (res && !res.ok) beacon('fetchfail', { m: method, ep: ep, st: st }, 'ff:' + ep + st);
            } catch (e) {}
          }, function (err) {
            try {
              pushNet(method, ep, 'ERR');
              beacon('fetcherr', { m: method, ep: ep, msg: clip(err && err.message, 200) }, 'fe:' + ep);
            } catch (e) {}
          });
        } catch (e) {}
        return p; // never alter what the app sees
      };
    }
  } catch (e) {}

  // 4b. XMLHttpRequest — the sidebar's session-list load may use XHR, which the
  //     fetch wrapper can't see (v1.74.0's blind spot: a boundary fired with NO
  //     network beacon, meaning the failing request wasn't fetch-or-non-2xx).
  //     Capture method + pathname + status only — never request/response bodies.
  try {
    var XP = XMLHttpRequest.prototype;
    var origOpen = XP.open, origSend = XP.send;
    XP.open = function (method, url) {
      try { this.__ccmM = method || 'GET'; this.__ccmEp = epOf(url); } catch (e) {}
      return origOpen.apply(this, arguments);
    };
    XP.send = function () {
      var self = this;
      try {
        self.addEventListener('loadend', function () {
          try {
            var st = self.status;
            pushNet(self.__ccmM || 'GET', self.__ccmEp || '?', st || 'ERR');
            if (!st || st >= 400) beacon('xhrfail', { m: self.__ccmM, ep: self.__ccmEp, st: st || 0 }, 'xf:' + self.__ccmEp + st);
          } catch (e) {}
        });
      } catch (e) {}
      return origSend.apply(this, arguments);
    };
  } catch (e) {}

  // 5. Error-boundary text watcher — the most direct signal for the sidebar
  //    bug. When a "failed to load" / "Try again" fallback paints, beacon the
  //    label once (deduped). Cheap: only scans subtrees that actually changed.
  // PRIVACY-CRITICAL: this must fire ONLY on real error-boundary fallbacks, not
  // on chat content that happens to contain trigger words (v1.74.0 leaked a
  // typed message that contained "sidebar failed to load" — fixed here). Guards:
  //   • the changed subtree is tiny (boundaries are ~30 chars; messages aren't),
  //   • it contains an actual retry BUTTON whose own label is "Try again/Reload"
  //     (chat prose never does), and
  //   • we beacon ONLY a canonical label from a fixed allowlist — never the
  //     node's raw textContent — so even a heuristic miss can't emit user text.
  var BOUNDARY_LABELS = /failed to load|something went wrong|couldn'?t load|unable to load|error loading/i;
  function scanText(root) {
    try {
      if (!root || root.nodeType !== 1 || !root.querySelector) return;
      var tc = root.textContent || '';
      if (tc.length > 120) return;                 // real fallbacks are tiny
      var btn = root.querySelector('button, [role="button"]');
      if (!btn || !/try again|reload|retry/i.test(btn.textContent || '')) return;
      var m = tc.match(BOUNDARY_LABELS);
      var label = m ? m[0].toLowerCase() : 'error boundary';
      beacon('boundary', { label: label }, 'bnd:' + label);
    } catch (e) {}
  }
  try {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var add = muts[i].addedNodes;
        for (var j = 0; j < add.length; j++) {
          if (add[j].nodeType === 1) scanText(add[j]);
        }
      }
    });
    var startMO = function () { try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {} };
    if (document.body) startMO();
    else document.addEventListener('DOMContentLoaded', startMO);
  } catch (e) {}

  // 6. Heartbeat ring + sparse keepalive. Record state every 15s; only emit a
  //    standalone 'beat' if ≥5min since the last beacon (so quiet sessions stay
  //    near-silent, but a long bug-hunt still leaves a breadcrumb trail).
  var lastBeat = Date.now();
  setInterval(function () {
    try {
      pushState();
      if (document.visibilityState === 'visible' && Date.now() - lastBeat > 300000) {
        lastBeat = Date.now();
        beacon('beat', null, null);
      }
    } catch (e) {}
  }, 15000);
  pushState();
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
    var htmlH = parseFloat(cs.height) || null;
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
      htmlH: htmlH != null ? Math.round(htmlH) : null,
      max: window.__ccmMaxH != null ? window.__ccmMaxH : null,
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

/* Minimal keyboard-state tracker (v1.95). The userland height pin was removed
   in v1.95 — interactive-widget=resizes-content (the ccmIW module above) lets
   the platform handle layout. This tiny module keeps window.__ccmMaxH alive for
   the debug snapshot's `max` field. Baseline: under resizes-content BOTH
   innerHeight and vv.height shrink for the soft keyboard, so the resting
   (keyboard-down) height is tracked as a running max — Math.max keeps the
   tall value across keyboard cycles. A soft keyboard never changes innerWidth,
   so a width delta re-baselines maxH to prevent a stale tall-context max from
   making kbOpen read true permanently on a shorter layout context. */
(function () {
  var vv = window.visualViewport;
  if (!vv) return;
  function fullHeight() { return Math.max(window.innerHeight, vv.height); }
  var maxH = fullHeight();
  var prevIW = window.innerWidth;
  function update() {
    if (window.innerWidth !== prevIW) { prevIW = window.innerWidth; maxH = fullHeight(); }
    maxH = Math.max(maxH, fullHeight());
    window.__ccmMaxH = maxH;
  }
  vv.addEventListener('resize', update);
  update();
})();

/* Companion to rule 18. Visually place the composer "+" (Add / attach) at the
   LEFT of the textarea, inside the input row — WITHOUT moving React's own node.

   Why not move the node (the old approach): the "+" lives in a separate sibling
   row from the input box, so CSS can't reorder it across containers, and the old
   companion physically reparented React's button into the input row. That desynced
   React's fiber tree from the live DOM, which had two failure modes:
     (a) tapping the sibling "Accept edits" toggle re-rendered the toolbar and
         React referenced the moved "+" as an insertion ref in a parent it no
         longer lived in -> "NotFoundError" -> error boundary (trc rpvf1t); and
     (b) soft-navigating to another session unmounted/remounted the composer and
         React lost the moved node entirely -> the "+" VANISHED and never came
         back (trc 1dym2c, "the + disappears when I switch sessions"). Verified on
         redroid: with the node moved, addCount goes 1 -> 0 across a real soft-nav
         and does not self-heal, under every prototype-override variant tried.

   The robust fix: leave React's real "+" exactly where React puts it (the bottom
   toolbar) so React keeps full ownership — neither failure can occur. We just (1)
   hide the real toolbar "+" via CSS (rule 18b) and (2) inject OUR OWN proxy button
   as the first child of the input row; tapping the proxy forwards .click() to the
   real button so the app's attach handler fires normally. If React ever removes
   our proxy during reconciliation we simply re-create it (self-healing, and since
   React never tracked it, removing a foreign node can't throw). */
(function () {
  var PROXY_ID = 'ccm-add-proxy';
  function realAdd() {
    var all = document.querySelectorAll('button[aria-label="Add"]');
    for (var i = 0; i < all.length; i++) {
      if (all[i].id !== PROXY_ID && !all[i].hasAttribute('data-ccm-proxy')) return all[i];
    }
    return null;
  }
  function sync() {
    try {
      var input = document.querySelector('.epitaxy-prompt-input');
      var row = input && input.parentElement; // div.relative.flex.w-full
      var real = realAdd();
      var proxy = document.getElementById(PROXY_ID);
      if (!input || !row || !real) {
        if (proxy) proxy.remove(); // no composer right now — drop a stale proxy
        return;
      }
      real.setAttribute('data-ccm-realadd', '1'); // rule 18b hides this toolbar one
      if (!proxy) {
        proxy = document.createElement('button');
        proxy.id = PROXY_ID;
        proxy.type = 'button';
        proxy.setAttribute('data-ccm-proxy', '1');
        proxy.setAttribute('aria-label', 'Add'); // inherits rule-18 sizing/hit-slop
        proxy.tabIndex = -1;
        proxy.innerHTML = real.innerHTML; // copy the "+" glyph/svg
        proxy.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var r = realAdd();
          if (r) r.click(); // fires the app's React onClick -> attach menu
        });
      } else if (proxy.childElementCount === 0 && real.innerHTML) {
        proxy.innerHTML = real.innerHTML; // keep the glyph in sync if it changed
      }
      if (row.firstElementChild !== proxy) row.insertBefore(proxy, row.firstChild);
    } catch (e) { /* never let a reconciliation race break the composer */ }
  }
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; sync(); });
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true,
  });
  sync();
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
   click.

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

   We do NOT blur/force the keyboard down ourselves: opening the drawer moves
   focus into it (React focus-trap), dropping the keyboard on its own. */
(function () {
  var SEL = '[aria-label="Open sidebar"]';
  var sx = 0, sy = 0, tracking = false, fireOwn = false, ownFiredAt = 0;

  document.addEventListener('pointerdown', function (e) {
    var btn = e.target && e.target.closest && e.target.closest(SEL);
    if (!btn) { tracking = false; return; }
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
   on mount, which pops the soft keyboard and eats the top half of the screen
   exactly when you want to READ the session history. The ask: land in a session
   with the keyboard down and the transcript fully visible; the composer raises
   the keyboard only when you tap it yourself.

   APPROACH — suppress at the source, don't blur after.
   The previous version (≤v1.57) patched history.pushState and blurred the
   composer the first time it was focused after a navigation. On-device that
   left a 1-4s flash where the keyboard rode up before the blur landed — and the
   pushState patch likely never reached the app's router through Violentmonkey's
   injection sandbox (the script's DOM/CSS side runs, but page-context History
   patching is sandboxed), so the blur was rarely even armed.

   Instead we set inputmode="none" on the composer the moment it mounts. Firefox
   Android honors inputmode on a contenteditable and will NOT raise the virtual
   keyboard on focus while it's "none" — so the app's autofocus lands the caret
   with no keyboard and NO flash, because the keyboard never rises. This needs
   no navigation interception: a MutationObserver stamps every composer as it
   appears (a fresh element mounts per session switch), so it's immune to the
   sandbox. On a genuine pointerdown we restore the natural inputmode and force a
   focus cycle within the user gesture so the keyboard comes up as expected.

   Verify on-device (Principle V): the actual VK suppression only shows on a real
   phone (headless emulation has no soft keyboard) — confirm vvGap stays 0 on a
   switch and goes to ~334 after a real composer tap, via the fxrdp poll.

   Gated on the noKbOnSwitch flag (localStorage ccmNoKbOnSwitch=0 to disable for
   a bisect). */
(function () {
  if (!window.__ccmFlags.noKbOnSwitch) return;
  var COMPOSER = 'textarea, [contenteditable="true"]';

  // Suppress the keyboard for a composer: inputmode="none" so focus doesn't
  // raise the VK. Stash the natural inputmode so a real tap can restore it.
  function suppress(el) {
    if (!el || el.getAttribute('data-ccm-kb')) return; // already handled
    el.setAttribute('data-ccm-im', el.getAttribute('inputmode') || '');
    el.setAttribute('inputmode', 'none');
    el.setAttribute('data-ccm-kb', 'off');
    if (window.__ccmDbg) window.__ccmDbg.log('nokb.suppress', null);
  }

  // The user deliberately tapped the composer -> let the keyboard rise. Restore
  // the natural inputmode and, if it's already the active element (autofocus
  // parked the caret here with no keyboard), blur+refocus inside this gesture so
  // Firefox re-evaluates inputmode and shows the keyboard.
  function release(el) {
    if (!el || el.getAttribute('data-ccm-kb') !== 'off') return;
    var natural = el.getAttribute('data-ccm-im') || '';
    if (natural) el.setAttribute('inputmode', natural); else el.removeAttribute('inputmode');
    el.setAttribute('data-ccm-kb', 'live');
    if (window.__ccmDbg) window.__ccmDbg.log('nokb.release', null);
    try {
      if (document.activeElement === el) { el.blur(); el.focus(); }
    } catch (e) { /* swallow */ }
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches(COMPOSER)) suppress(root);
    if (root.querySelectorAll) {
      var nodes = root.querySelectorAll(COMPOSER);
      for (var i = 0; i < nodes.length; i++) suppress(nodes[i]);
    }
  }

  // Stamp composers as they mount. @run-at document-start means this observer is
  // watching before React commits the composer, beating its post-commit autofocus.
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var added = muts[i].addedNodes;
      for (var j = 0; j < added.length; j++) scan(added[j]);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan(document.body || document.documentElement); // deep-link load already in a session

  // A genuine tap on a suppressed composer releases it (keyboard comes up).
  document.addEventListener('pointerdown', function (e) {
    var t = e.target;
    var el = t && t.closest && t.closest(COMPOSER);
    if (el) release(el);
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

/* Rule 23's companion. Stamp the top-left menu (sidebar toggle) with a badge
   showing how many sessions are idle.

   COUNT SOURCE — the API, not the DOM. The first cut counted session rows in
   the page, but the landing list is collapsed ("Show N more" / "View all") and
   the sidebar drawer's recents carry no status, so the DOM only ever exposes a
   handful of rows — the badge under-counted (showed 4 of ~10). The real tally
   lives behind GET https://claude.ai/v1/sessions, which returns every session
   with a session_status. We fetch that and count client-side.

   What counts as "idle": neither session_status NOR post_turn_summary is
   sufficient alone.
     - session_status was thought to stick at "running" after a turn ends, so
       v1.65–1.67 stopped trusting it and switched to post_turn_summary.
     - But post_turn_summary is STICKY across turns: the API populates it when a
       turn ends and does NOT reliably clear it when the next turn starts on a
       long-lived / background / autonomous session (Solver-shadow loops, PR-
       webhook wakeups, /loop). So "PTS present => turn ended" (v1.67) marked
       genuinely-working sessions as idle — the badge under-counted and the
       active dot vanished. (Reported + reproduced 2026-05-30.)

   The reliable discriminator is updated_at FRESHNESS. Measured 2026-05-30 via
   ccm_session_status_probe.py: every genuinely-working session had
   session_status:"running" with updated_at within ~13s of now (it heartbeats
   while a turn runs), several still carrying a stale review_ready / need_input
   PTS from a PRIOR turn. Every genuinely-waiting session had
   session_status:"idle" with updated_at >= ~70 min stale. A ~300x gap. So:
     - session_status "running" AND updated_at fresh  => GENUINELY WORKING,
       regardless of any lingering post_turn_summary. (The v1.67 miss.)
     - otherwise post_turn_summary present  => last turn ended => WAITING ON BEN.
       Covers review_ready, need_input / requires_action, failed — "ball in
       Ben's court", including a session genuinely stuck at stale "running".
     - session_status in {idle, requires_action}  => WAITING ON BEN.
   We still drop archived / deleted / pending. This matches the human "sitting
   idle, waiting for me" reading without hiding active background work.

   v1.70 — background-work proxy. The stock UI shows an "N background tasks
   running" indicator, but it is computed CLIENT-SIDE by replaying the per-
   session event log (/v1/sessions/<id>/events, ~780KB each); neither the
   session LIST nor the session DETAIL exposes a task count (verified 2026-05-31
   via ccm_bg_process_probe.py / ccm_bg_events_probe.py). Per-session event
   fetches across the recents list would cost multiple MB per 45s poll on the
   phone, so instead we use connection_status as a free stand-in: a running
   background task is exactly what keeps a session's container alive, so a
   "connected" session that isn't explicitly awaiting Ben is treated as WORKING
   (not idle). Imperfect — a session connected only because it just finished
   also reads as working — but zero extra network. (Ben's call 2026-05-31.)

   v1.83 — demoted the connected=>working proxy below the end-of-turn signals so
   a merely-still-connected finished session no longer read "Running" forever.
   But that ALSO hid genuine background work: an idle-foreground session running
   a background task got classified ready (Ben 2026-06-03: "it's idle but waiting
   for background tasks to finish").

   v1.84 — drop connection_status ENTIRELY and measure activity by updated_at
   freshness alone. Two measured facts forced this (ccm_conn_age_probe.py /
   ccm_session_status_probe.py, 2026-06-03):
     - connection_status is NOT liveness: it read "connected" on 200h+ archived
       sessions, i.e. it is sticky and means nothing about whether work is live.
       The v1.70 proxy was built on a signal that doesn't track liveness.
     - updated_at DOES track activity, including BACKGROUND work: the "Local LLM
       keyboard suggestions" session, idle-foreground with a live bg task, showed
       updated_at 13s fresh one moment and 256s another — it bumps when the bg
       task emits an event. So freshness catches background work, not just turns.
   New rule: isFresh(updated_at) => working (foreground OR background); otherwise
   fall through to awaiting / ready / idle as before. Honest limitation: a bg task
   silent longer than FRESH_MS (3 min) can't be told apart from a finished session
   on the list endpoint, so it reads ready until it emits again and re-freshens.

   Headers: the endpoint 400s without anthropic-version and 404s without the
   org uuid. The org uuid is harvested from a URL the app has already fetched
   (performance resource entries / page HTML); anthropic-version is the public
   pinned date. credentials:include reuses the logged-in cookie.

   Cadence: the payload is ~1.3MB (archived sessions dominate and the API
   ignores filter params), so we DON'T poll per-DOM-mutation. We refetch on an
   interval and when the tab regains focus/visibility — cheap and current
   enough for a count that changes on the minute scale. The latest count is
   cached in localStorage so the badge paints instantly on the next load and
   never blanks while a refetch is in flight or fails.

   Badge painting is decoupled from counting: a debounced MutationObserver
   re-stamps the chip whenever the SPA remounts the toggle button, reading the
   cached count. Idempotent writes (touch the DOM only when the count or chip
   presence changes) keep the observer from feeding itself. Phone-only,
   matching the rest of the sheet: off-phone we remove the chip and bail. */
(function () {
  var MQ = '(max-width: 900px)';
  var POLL_MS = 45000;
  var KEY = 'ccmIdleCount';
  var MKEY = 'ccmSessionStates';   // name -> 'ready' | 'awaiting' (override targets)
  var AKEY = 'ccmSessionAges';     // name -> updated_at epoch ms (idle-age labels)
  // Put-away / placeholder statuses never count, regardless of turn state.
  var DROP = { pending: 1, archived: 1, deleted: 1 };
  // Freshness window: a session that is actively running a turn bumps
  // updated_at every few seconds (observed <=13s while working); the smallest
  // genuinely-idle gap observed was ~70 min. 3 min sits ~20x below that floor
  // with headroom for a long in-flight tool call that briefly stops bumping,
  // and well above any client/server clock skew.
  var FRESH_MS = 180000;

  function lastActive(s) {
    var u = s && (s.updated_at || s.last_active_at || s.modified_at);
    if (!u) return NaN;
    var t = Date.parse(u);
    return isNaN(t) ? NaN : t;
  }
  // True only when updated_at is present AND within the freshness window.
  // Missing/unparseable timestamp → not fresh (don't claim activity we can't see).
  function isFresh(s) {
    var t = lastActive(s);
    return !isNaN(t) && (Date.now() - t) < FRESH_MS;
  }

  // Classify a session by what it actually wants from Ben (see block comment):
  //   'working'  — turn in progress: running + a FRESH updated_at. Leave alone.
  //   'awaiting' — asked Ben something (requires_action / needs_action set).
  //   'ready'    — turn ended, output waiting (review_ready / failed / idle).
  //   null       — archived / deleted / pending / unknown. Ignore.
  // The freshness gate comes FIRST so a genuinely-running session is never
  // mislabelled by a post_turn_summary that lingered from a prior turn — the
  // v1.67 failure mode on background / autonomous sessions.
  function sessionState(s) {
    if (!s) return null;
    var st = s.session_status;
    if (DROP[st]) return null;
    // Activity is measured by updated_at FRESHNESS — NOT session_status and NOT
    // connection_status (v1.84). A session bumps updated_at whenever it emits an
    // event: during a foreground turn OR while a BACKGROUND task is working. So a
    // fresh timestamp => working regardless of session_status, which is exactly
    // what makes an idle-foreground session with a live background task read as
    // working (Ben 2026-06-03: "it's idle but waiting for background tasks to
    // finish"). connection_status is deliberately unused: it is sticky and
    // meaningless as liveness — observed "connected" on 200h+ archived sessions —
    // which is what made the v1.70 connected=>working proxy paint finished
    // sessions active forever ("nothing happened in 5h but it still says active").
    if (isFresh(s)) return 'working';
    // Not fresh => no event in the freshness window. The turn (and any bg task)
    // has gone quiet; classify what it wants from Ben. NOTE: a background task
    // that stays silent longer than FRESH_MS is indistinguishable from a finished
    // session on the list endpoint (no per-session task count exists there), so
    // it reads ready until it emits again and re-freshens — best effort.
    var pts = s.post_turn_summary ||
              (s.external_metadata && s.external_metadata.post_turn_summary);
    var needs = (pts && pts.needs_action) || '';
    if (st === 'requires_action' || needs) return 'awaiting';  // explicit ask
    if (pts) return 'ready';            // turn ended, output waiting
    if (st === 'idle') return 'ready';  // idle, no recent activity
    return 'working';                   // status still 'running' but quiet (long op)
  }

  // A session is "waiting on Ben" (counts toward the idle badge) when its turn
  // has ended — i.e. it is ready or awaiting, not working.
  function isWaiting(s) {
    var st = sessionState(s);
    return st === 'ready' || st === 'awaiting';
  }

  // Given the app's per-session status <span role="status">, climb to the row
  // and read the session name off its "More options for <name>" button. The
  // first ancestor that owns such a button is the row itself (the status span
  // and the button are siblings within it), so this never crosses into a
  // neighbouring row.
  function rowName(statusEl) {
    var n = statusEl;
    for (var d = 0; d < 6 && n; d++, n = n.parentElement) {
      var btn = n.querySelector('[aria-label^="More options for "]');
      if (btn) return btn.getAttribute('aria-label').slice(17); // len('More options for ')
    }
    return null;
  }

  function cached() {
    var v;
    try { v = parseInt(localStorage.getItem(KEY), 10); } catch (e) { v = NaN; }
    return isNaN(v) ? 0 : v;
  }

  // The org uuid appears in many app-issued URLs (/api/organizations/<uuid>,
  // /bootstrap/<uuid>). Harvest it from a request the app has already made, or
  // from the page HTML as a fallback. Cached once found.
  var orgUuid = null;
  function findOrg() {
    if (orgUuid) return orgUuid;
    var RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    try {
      var ents = performance.getEntriesByType('resource');
      for (var i = 0; i < ents.length; i++) {
        var m = ents[i].name.match(/(?:organizations|bootstrap)\/([0-9a-f-]{36})/i);
        if (m) { orgUuid = m[1]; return orgUuid; }
      }
    } catch (e) {}
    var h = (document.documentElement.innerHTML.match(RE) || [])[0];
    if (h) orgUuid = h;
    return orgUuid;
  }

  function paint() {
    var btn = document.querySelector('aside.dframe-sidebar [aria-label="Open sidebar"]')
           || document.querySelector('[aria-label="Open sidebar"]');
    if (!btn) return;

    if (!window.matchMedia(MQ).matches) {
      var off = btn.querySelector('.ccm-idle-badge');
      if (off) off.remove();
      return;
    }

    var n = cached();
    var label = n > 99 ? '99+' : String(n);
    var badge = btn.querySelector('.ccm-idle-badge');
    if (n > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'ccm-idle-badge';
        btn.appendChild(badge);
      }
      if (badge.textContent !== label) badge.textContent = label;
    } else if (badge) {
      badge.remove();
    }
  }

  function statesCached() {
    try { return JSON.parse(localStorage.getItem(MKEY)) || {}; }
    catch (e) { return {}; }
  }
  function agesCached() {
    try { return JSON.parse(localStorage.getItem(AKEY)) || {}; }
    catch (e) { return {}; }
  }
  // Humanize an idle duration: minutes under an hour, then hours, then days.
  // Ben asked specifically for "minutes idle"; minutes is the primary unit and
  // we roll up to h/d only so a days-old session doesn't read as e.g. "5760m".
  function humanizeAge(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return '<1m';
    if (m < 60) return m + 'm';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h';
    return Math.floor(h / 24) + 'd';
  }

  // The exact markup the app draws for each dot state (captured live via
  // ccm_drawer_dots_probe.py), so an injected dot is byte-identical to the
  // native ones — animation and colour come from the app's own global classes
  // (.dframe-dot, .status-dot[data-kind]).
  var DOT = {
    working: { aria: 'Running',
      html: '<span class="inline-flex size-3 items-center justify-center gap-[2px] leading-none" aria-hidden="true">' +
            '<span class="dframe-dot"></span><span class="dframe-dot"></span><span class="dframe-dot"></span></span>' },
    ready:    { aria: 'Ready',          html: '<span class="status-dot" data-kind="ready"></span>' },
    awaiting: { aria: 'Awaiting input', html: '<span class="status-dot" data-kind="awaiting"></span>' },
  };
  // Which state is a status span currently rendering?
  function dotState(el) {
    if (el.querySelector('.dframe-dot')) return 'working';
    var sd = el.querySelector('.status-dot');
    if (sd) {
      var k = sd.getAttribute('data-kind');
      if (k === 'awaiting' || k === 'ready') return k;
    }
    return null;
  }
  // Reconcile each recents status dot to the session's TRUE state (cached map).
  // Bidirectional: we DOWNGRADE a stale "Running" dot to ready/awaiting when a
  // turn has actually ended, and UPGRADE an idle/ready dot to "Running" when the
  // connected-proxy says the session has live background work. Idempotent — we
  // only rewrite when the rendered state differs from the desired one, so we
  // never fight a correct app dot or restart its running animation.
  function paintDots() {
    if (!window.matchMedia(MQ).matches) return;   // phone sheet only
    var map = statesCached();
    var dots = document.querySelectorAll('span[role="status"]');
    for (var i = 0; i < dots.length; i++) {
      var el = dots[i];
      var name = rowName(el);
      if (!name) continue;                  // sr-only / unlabelled status spans
      var want = map[name];
      if (!want || !DOT[want]) continue;    // no opinion on this session
      if (dotState(el) === want) continue;  // already correct
      el.setAttribute('aria-label', DOT[want].aria);
      el.innerHTML = DOT[want].html;
    }
  }

  // The status span sits inside the row's main button (in the leading slot), so
  // climbing from the dot reaches the button — where the idle-age label hangs,
  // right of the flex-1 title. Handles both "the button is an ancestor" and
  // "the button is a descendant of a row ancestor" shapes defensively.
  function rowMainButton(statusEl) {
    var n = statusEl;
    for (var d = 0; d < 6 && n; d++, n = n.parentElement) {
      if (n.hasAttribute && n.hasAttribute('data-row-main-button')) return n;
      var b = n.querySelector && n.querySelector('[data-row-main-button]');
      if (b) return b;
    }
    return null;
  }
  // Stamp each waiting (ready/awaiting) recents row with how long it's been idle,
  // computed live from the cached updated_at so it ticks up between refreshes.
  // Working rows (and any without a known timestamp) get no label, and a row
  // that transitions back to working has its stale label removed. Idempotent:
  // we only touch the DOM when the text actually changes.
  function paintAges() {
    if (!window.matchMedia(MQ).matches) return;   // phone sheet only
    var map = statesCached();
    var ages = agesCached();
    var dots = document.querySelectorAll('span[role="status"]');
    for (var i = 0; i < dots.length; i++) {
      var el = dots[i];
      var name = rowName(el);
      if (!name) continue;
      var btn = rowMainButton(el);
      if (!btn) continue;
      var lbl = btn.querySelector('.ccm-idle-age');
      var state = map[name];
      var ts = ages[name];
      if ((state === 'ready' || state === 'awaiting') && ts) {
        var text = humanizeAge(Date.now() - ts);
        if (!lbl) {
          lbl = document.createElement('span');
          lbl.className = 'ccm-idle-age';
          btn.appendChild(lbl);
        }
        if (lbl.textContent !== text) lbl.textContent = text;
      } else if (lbl) {
        lbl.remove();
      }
    }
  }

  // Fetch the session list and recompute the cached count. On any failure
  // (no org yet, network, non-200, bad JSON) we leave the cache untouched so
  // the badge keeps showing the last good number rather than blanking.
  function refresh() {
    var org = findOrg();
    if (!org) return;
    fetch('https://claude.ai/v1/sessions', {
      credentials: 'include',
      headers: {
        'anthropic-organization-uuid': org,
        'anthropic-client-platform': 'web_claude_ai',
        'anthropic-version': '2023-06-01',
      },
    }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (j) {
      if (!j) return;
      var arr = Array.isArray(j) ? j : (j.sessions || j.data || j.results);
      if (!Array.isArray(arr)) return;
      var n = 0;
      var map = {};
      var ages = {};
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i];
        if (isWaiting(s)) n++;
        var state = sessionState(s);
        var nm = s && (s.name || s.title || s.session_name);
        // Record every actionable state (working/ready/awaiting) so paintDots
        // can both upgrade and downgrade. null (archived/deleted/pending) stays
        // out of the map so those rows are left exactly as the app drew them.
        if (nm && DOT[state]) map[nm] = state;
        // Cache the last-active timestamp so paintAges can show a live idle age.
        var ts = lastActive(s);
        if (nm && !isNaN(ts)) ages[nm] = ts;
      }
      try { localStorage.setItem(KEY, String(n)); } catch (e) {}
      try { localStorage.setItem(MKEY, JSON.stringify(map)); } catch (e) {}
      try { localStorage.setItem(AKEY, JSON.stringify(ages)); } catch (e) {}
      paint();
      paintDots();
      paintAges();
    }).catch(function () {});
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; paint(); paintDots(); paintAges(); });
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true,
  });

  paint();        // instant: show the cached count
  paintDots();    // instant: fix dots from the cached map
  paintAges();    // instant: stamp idle ages from the cached timestamps
  refresh();      // then reconcile against the API
  setInterval(refresh, POLL_MS);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') refresh();
  });
})();


/* Fix: long-press -> "Select all" in the composer leaves NO native selection
   handles and NO Copy/Cut/Paste action bar on Android — the buttons are
   unreachable. Root cause (verified on a real Android renderer + by
   instrumenting the live app): when the selection expands, TipTap/ProseMirror's
   view reconciliation (met.setSelection -> Aet -> vst.updateStateInner) calls
   Selection.prototype.collapse to re-place the cursor from its internal state,
   which on Android tears down the just-created native action mode. (NOT a CSS
   issue — user-select / contain / overflow were all excluded on-device; and NOT
   removeAllRanges/empty/setBaseAndExtent — only `collapse` fires, with a stack
   into the app bundle.) Reproduces with this script OFF, so it's the app's bug;
   we work around it by suppressing that one collapse.

   Guard: when a NON-collapsed selection appears inside the composer (a user
   Select all), arm a short window; during it, no-op Selection.prototype.collapse
   calls that would discard a live selection still inside the composer. Tightly
   scoped — only fires for a non-collapsed composer selection within ~700ms of
   the expand, so normal caret placement and typing (collapsed, or outside the
   window/composer) are untouched. Patches the prototype at document-start so the
   wrapper is in place before ProseMirror's reconciliation runs. */
(function () {
  var SEL = '.tiptap.ProseMirror[contenteditable], .ProseMirror[contenteditable="true"], [aria-label="Prompt"][contenteditable="true"]';
  var expandedAt = 0;
  var GUARD_MS = 700;

  function composerEl() { return document.querySelector(SEL); }
  function selInComposer(sel) {
    if (!sel || sel.rangeCount === 0) return false;
    var c = composerEl();
    var n = sel.anchorNode;
    return !!(c && n && c.contains(n));
  }

  // A non-collapsed selection inside the composer = the user just expanded one
  // (long-press -> Select all). Arm the guard window.
  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed && selInComposer(sel)) expandedAt = Date.now();
  }, true);

  var origCollapse = Selection.prototype.collapse;
  Selection.prototype.collapse = function () {
    try {
      if (expandedAt && (Date.now() - expandedAt) < GUARD_MS &&
          !this.isCollapsed && selInComposer(this)) {
        return; // keep the user's Select all alive so the native action bar stays
      }
    } catch (e) { /* fall through to native on any probe error */ }
    return origCollapse.apply(this, arguments);
  };
})();

/* Rule 24's companion — re-wire the mid-turn action button into a steer.
   ("Steer" = send a message while a turn is still generating; the cloud Code
   agent injects it at the next agent-loop yield, redirecting the running turn.)

   THE PROBLEM. Mid-turn the bottom-right control renders as Stop (□). To steer
   you'd have to Stop the turn, re-focus the composer, retype, and Send — losing
   the turn. The native Send button is no help: while streaming it exists but is
   BOTH disabled AND its React click-handler is gated, so even force-enabling and
   clicking it never submits. (Empirically characterized in
   scripts/ccm_live_driver.py: Send click is dead mid-turn; the only submit path
   that fires mid-stream is an Enter keydown on the composer — and ProseMirror
   does NOT gate on isTrusted, so a synthetic KeyboardEvent works just as well as
   a real keypress. That's the lever this uses.)

   THE FIX. Capture-phase click interceptor on window (same pattern as the
   contextmenu block: fires before any React handler, registered at
   document-start so it precedes the app's mount). When the tapped control is the
   Stop button AND we're phone-width AND a turn is actually streaming AND the
   composer holds text, we swallow the click (preventDefault +
   stopImmediatePropagation, so the turn is NOT stopped) and instead dispatch a
   synthetic Enter on the composer — submitting its text as a steer. When the
   composer is empty we do nothing and let Stop work normally, so empty-composer
   taps still stop the turn.

   A 400ms cue loop stamps data-ccm-steer on the live Stop button whenever the
   re-wire is armed (streaming + text + phone + flag), which rule 24 repaints
   blue with an ↑ so the affordance tells the truth before you tap.

   Gated by __ccmFlags.steer (localStorage.setItem('ccmSteer','0') to disable).
   Streaming = a visible, enabled button[aria-label="Stop"] (mid-turn the DOM
   carries both an enabled Stop and a disabled Send; Stop is the rendered one). */
(function () {
  var MQ = '(max-width: 900px)';
  var COMPOSER = '[aria-label="Prompt"][contenteditable="true"], ' +
                 '.tiptap.ProseMirror[contenteditable], ' +
                 '.ProseMirror[contenteditable="true"]';

  function onPhone() {
    try { return window.matchMedia(MQ).matches; } catch (e) { return false; }
  }
  // The visible, enabled Stop button = a turn is streaming. Returns it or null.
  function streamingBtn() {
    var btns = document.querySelectorAll('button[aria-label="Stop"]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.offsetParent !== null && !b.disabled) return b;
    }
    return null;
  }
  function composerEl() { return document.querySelector(COMPOSER); }
  function composerText() {
    var c = composerEl();
    if (!c) return '';
    return (c.innerText || '').replace(/ /g, ' ').trim();
  }
  // Submit gesture. On a TOUCH device the composer binds plain Enter to a
  // newline (that's the whole bug — you can't submit from the soft keyboard),
  // so a plain-Enter dispatch just inserts a line break. The app's actual
  // submit keybinding is Meta+Enter (Cmd/⌘+Enter) — empirically the only Enter
  // variant that submits under touch (Ctrl+Enter and Shift+Enter do not), and
  // it fires from an untrusted synthetic event too. So dispatch Meta+Enter.
  function fireEnter(c) {
    ['keydown', 'keypress', 'keyup'].forEach(function (type) {
      c.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        metaKey: true,
        bubbles: true, cancelable: true,
      }));
    });
  }

  function onActivate(e) {
    try {
      if (!window.__ccmFlags || !window.__ccmFlags.steer) return;
      if (!onPhone()) return;
      var t = e.target;
      var stop = t && t.closest && t.closest('button[aria-label="Stop"]');
      if (!stop) return;
      if (!streamingBtn()) return;      // not actually streaming — let it be
      if (!composerText()) return;      // empty composer — let Stop stop the turn
      var c = composerEl();
      if (!c) return;
      e.preventDefault();
      e.stopImmediatePropagation();     // React never sees the click -> no Stop
      fireEnter(c);                     // submit composer text as a steer
    } catch (err) { /* never break the native button on a probe error */ }
  }
  window.addEventListener('click', onActivate, true);

  // Cue loop: stamp data-ccm-steer on the live Stop button when the re-wire is
  // armed, clear it otherwise. Idempotent; cheap enough at 400ms.
  function syncCue() {
    try {
      var armedBtn = null;
      if (window.__ccmFlags && window.__ccmFlags.steer && onPhone()) {
        var s = streamingBtn();
        if (s && composerText()) armedBtn = s;
      }
      var btns = document.querySelectorAll('button[aria-label="Stop"]');
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        if (b === armedBtn) {
          if (!b.hasAttribute('data-ccm-steer')) b.setAttribute('data-ccm-steer', '');
        } else if (b.hasAttribute('data-ccm-steer')) {
          b.removeAttribute('data-ccm-steer');
        }
      }
    } catch (e) { /* swallow */ }
  }
  setInterval(syncCue, 400);
})();

/* Rule 22's companion — opaque backdrop for the scrolled AskUserQuestion card.
   Rule 22 caps .epitaxy-approval-card at 40vh + overflow-y:auto, turning it into
   a scroll container on the phone. The card's own background is transparent; the
   surface you see comes from an inner position:absolute; inset:0 layer, which
   sizes to the card's CLIENT box (40vh), NOT its scrollHeight. So once the card
   scrolls, content past the first 40vh has no opaque layer behind it: on real
   Android Chromium the bold question title bleeds through / overlaps the option
   rows (Ben's phone screenshot, 2026-05-30 — verified the title is position
   static, NOT sticky, so this backdrop gap is the cause, not a pinned header).
   Fix: paint the scroll CONTAINER itself with an opaque background. A scroll
   container's own background-color covers its full scrollable region (unlike the
   inset:0 child) and forces a proper backing layer, which also kills any
   scroll-repaint ghosting. Colour is read at runtime from the nearest opaque
   ancestor so it tracks light/dark automatically instead of hard-coding a
   surface value. Phone-only (same max-width:900px gate as rule 22), and only
   while the card is actually scrollable, so a desktop visit and short cards are
   untouched. */
(function () {
  var MQ = '(max-width: 900px)';
  function onPhone() {
    try { return window.matchMedia(MQ).matches; } catch (e) { return false; }
  }
  function opaque(c) {
    if (!c || c === 'transparent') return false;
    var m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(',');
      if (p.length === 4 && parseFloat(p[3]) === 0) return false; // alpha 0
    }
    return true;
  }
  // Nearest ancestor with a non-transparent background = the real surface the
  // card sits on; matching it keeps the fill visually continuous in either theme.
  function surfaceColor(card) {
    var n = card.parentElement;
    while (n && n !== document.documentElement) {
      if (opaque(getComputedStyle(n).backgroundColor)) {
        return getComputedStyle(n).backgroundColor;
      }
      n = n.parentElement;
    }
    return null;
  }
  function apply() {
    if (!onPhone()) return;
    var cards = document.querySelectorAll('.epitaxy-approval-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      // Only act once rule 22 has actually made the card scroll (content > cap).
      if (card.scrollHeight <= card.clientHeight + 1) {
        if (card.dataset.ccmBackdrop) {
          card.style.backgroundColor = '';
          delete card.dataset.ccmBackdrop;
        }
        continue;
      }
      var col = surfaceColor(card);
      if (col && card.style.backgroundColor !== col) {
        card.style.backgroundColor = col;
        card.dataset.ccmBackdrop = '1';
      }
    }
  }
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; apply(); });
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true, subtree: true,
  });
  // The card can flip to scrollable after async option render (or a theme
  // change) without a mutation the observer flags; a cheap interval covers both.
  setInterval(apply, 500);
  apply();
})();
