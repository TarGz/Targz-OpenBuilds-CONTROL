module.exports = {
  version: require('./package.json').version,
  CHANGELOG: [
    {
      date: '2026-04-18',
      version: '1.5.4',
      changes: [
        'Command Deck canvas zone rework — V2 tab strip + framed work area',
        'Tabs renamed and restyled: 3D VIEW / CONSOLE / MACROS / G-CODE (uppercase mono, flat, orange underline on active). Legacy Metro4 ribbon icons hidden',
        'New canvas status overlay in top-right of the tab strip: GRID / VIEW / state chip (PREVIEW · LIVE · HOLD), wired to cdUpdateRunControls',
        'Three.js scene now draws the work area as a white plane + thin beige contour inside the cream-backgrounded viewport, so the white only shows where the plot lives',
        'Jog Control panel regroup: PEN UP / Z+ / Z− / PEN DOWN in a 2×2 strip above the XY jog grid; all buttons share a consistent portrait footprint',
        'Jog panel compaction pass: tighter paddings, step row now 0.1 / 1 / 10 / 100 (dropped 0.01), Z/pen buttons slimmed to 40px rows',
        'fixRenderSize() uses clientWidth/Height and Three.js setSize(..., true) so the canvas tracks the padded container without overflow'
      ]
    },
    {
      date: '2026-04-18',
      version: '1.5.3',
      changes: [
        'Command Deck fix batch after v1.5.2 shakedown',
        'Progress fields: add 1 Hz ticker so ELAPSED / REMAINING / %-bar update continuously while running (queueCount alone left them frozen on long moves)',
        'Overrides: JOG slider now emits jogOverride over socket; value labels (JOG/FEED/TOOL %) update live on drag; RESET buttons snap slider back to 100',
        'Serial console: strip the outer Metro4 .input wrapper border/background so only the input has a hairline',
        'Alarm UX: suppress the blocking Grbl Alarm / Grbl Error modal popins — the #cd-alarm-banner header warning remains the single source of truth',
        'Settings: drop the Job Log section (no backend); wire Firmware tool to openFlashingTool()',
        'Settings > Calibration: dedicated PEN UP / PEN DOWN page with Z-axis visual, sliders, ±0.1/±1 nudge buttons, TEST UP/DOWN, DEFAULTS, SAVE — opened from a "SET DEFAULT PEN HEIGHTS" card alongside the axis wizards',
        'Machine Control: replace the TOOL spindle button with dedicated PEN UP / PEN DOWN buttons that command Z to the saved heights (defaults Z5 / Z0)',
        'Keyboard: re-point jog shortcuts from legacy #xM/#xP/#yM/#yP/#zM/#zP IDs to the Command Deck #cdXM/#cdXP/... buttons so arrow-key jogging works again'
      ]
    },
    {
      date: '2026-04-18',
      version: '1.5.2',
      changes: [
        'Settings page: rework legacy troubleshootingPanel into a V2-design SETTINGS view rendered inside Command Deck',
        'New left sub-nav with 7 sections (GRBL Parameters, Calibration, Tools & Wizards, Keyboard, Diagnostics, Job Log, About) mirroring the V2 mockup',
        'Diagnostics: 3D viewer / serial / DRO toggles wired to existing localStorage flags; new showGpuInfo flag gates Computer card',
        'GRBL Parameters panel: Basic/Advanced tabs, search, dirty-row highlighting, APPLY sends $key=value lines via sendGcode and re-requests $$',
        'Tools panel wires Mobile Jog and USB Flashdrive to existing pages; Surfacing/Firmware fall back gracefully when handlers are absent',
        'About panel reads VERSION + CHANGELOG when version.js is reachable via require, with kv fallback otherwise',
        'Calibration / Keyboard rebind / Job Log entries scaffolded per the mockup with disabled actions until backends land',
        'New app/css/settings.css and app/js/settings.js; SETTINGS / MACHINE CONTROL tabs in Command Deck topbar now swap views in place'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.5.1',
      changes: [
        'Tabs B.1: convert main tabs + sub-tabs from filled/outlined pills to minimal underline style (uppercase 11px letter-spaced label, 2px orange underline when active)',
        'Remove ribbon content-holder card (transparent, no border), tabs-holder gets bottom hairline instead',
        'Removed filled-tab artifacts (backgrounds, border overlaps, box-shadows) — approaching the mockup "control panel" look'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.5.0',
      changes: [
        'UI polish pass: pro-grade hierarchy & consistency without changing the color DNA',
        'Extend pc-tokens.css with spacing scale (4/6/8/12/16/20/24/32), type scale (11/12/13/14/16/20), font-weight + tracking + leading tokens, control heights (24/32/40), z-index scale, focus-ring token',
        'Introduce three-tier border system (--pc-border-hairline / -default / -strong); legacy border tokens kept as aliases',
        'Add pc-utilities.css utility layer: .pc-glass, .pc-card, dividers, typography helpers (.pc-label, .pc-caption, .pc-body, .pc-display, .pc-mono), .pc-titlebar, .pc-sidebar-wide, .is-hidden',
        'Apply 4-tier typography rhythm (label 10px / caption 11px / body 13px / display 16px) across ribbon group labels, ribbon-button captions, badges, tallies, card headers',
        'Fix active-tab icon color bug — was overridden to white on orange background, now correctly uses --pc-primary',
        'Add body.pc-app scope + Phase 6 section in pc-theme.css: unified focus ring, control-height rhythm (buttons/inputs 32px), orange underline-style tabs, tighter letter-spacing on chrome',
        'Progress bar bumped to 3px with pill radius; status bar gets backdrop-blur for chrome-consistency with header/scrubber',
        'Swap hardcoded colors in buttons.css, main.css, restart-from-point.css for design tokens (--pc-border-default, --pc-primary, --pc-surface, etc.); scrubber primary button now uses orange instead of black',
        'Strip inline titlebar sizing/padding to .pc-titlebar utility class; add class="pc-app" on <body>'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.9',
      changes: [
        'Revert tab-action experiment; restore 3D-view floating nav-bar at bottom of #tab-three'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.8',
      changes: [
        'Fold 3D-view tools into the sub-tabs strip as <li class="tab-action"> entries (Simulate / Stop / Reset View / Restart from point)',
        'Action items push right via margin-left:auto on the first one; accent class highlights Restart from point in orange',
        'Removes the floating nav-bar entirely — zero bottom chrome, full canvas'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.7',
      changes: [
        'Move 3D-view tools (Simulate / Stop / Reset View / Restart from point) inline with the sub-tabs row as a compact pill',
        'Sub-tabs become fully rounded pills (pill radius, active = white with shadow)'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.6',
      changes: [
        'Relocate status pills (timer, Port, Controller, Job Queue) into the title bar — reclaims the entire 40px bottom strip for content',
        'Move progress bar to a 2px line just under the title bar (visible only during active jobs)',
        'Lower floating nav-bars to bottom:20px; grow 3D canvas by another ~40px'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.5',
      changes: [
        'Tighten UI chrome: smaller DROs (34px, 15px/16px), 60×60 jog direction buttons, trimmed ribbon padding',
        'Cap vertical jog/feed/tool slider tracks to 120px, tighter slider cells',
        'Reduce initial height reservation for #renderArea, #editor, #console, #macros so 3D canvas gains ~95px',
        'Nudge scrubber bottom offset to 110px'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.4',
      changes: [
        'Restyle console (#console) and command form: glass card, monospace paragraphs with pill hover',
        'Restyle Ace editors (#editor, #fluidnceditor): glass frame, soft gutter',
        'Convert editor and console fixed-bottom toolbars into centered glass nav-bar pills',
        'Restyle macros: glass cards (.command-button-macro) with orange hover border',
        'Restyle troubleshooting machine-profile picker (image-checkbox) as selectable glass cards with orange check',
        'Restyle probe wizard SVG to use PC primary color; step-list numbers orange',
        'Minor: remap .fg-openbuilds/.bd-openbuilds to neutral PC tokens'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.3',
      changes: [
        'Restyle DRO displays: glass cards with tabular-nums value, axis-colored text, orange hover/focus',
        'Restyle DRO edit input (.droInput) with orange ring',
        'Restyle jog direction buttons (.button.light.square.xlarge.jogbtn): glass 72×72, orange hover border, axis-colored FA layers',
        'Restyle setzero/gotozero/WCS pill buttons and step-distance segmented buttons',
        'Restyle vertical jog/feed/tool sliders with orange accent, pill reset buttons, dark tally value badge'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.2',
      changes: [
        'Restyle primitives: .button variants (dark/light/outline/primary/success/alert/secondary/mini/small) with PC tokens; jog & ribbon buttons preserved via :not() guards',
        'Restyle inputs, selects, textareas: glass surface, subtle border, orange focus ring',
        'Restyle badges (.badge, .badge.bg-*) and .tally pin-status indicators as pills',
        'Restyle .table/.table.striped with tiny uppercase headers and hairline rows',
        'Restyle .card, Metro.dialog.create output and Metro.toast.create output as glass cards with colored accent'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.1',
      changes: [
        'Restyle ribbon menu: tabbed top strip (Machine Control / Grbl / FluidNC / Troubleshooting), glass content panel, hairline group separators, tiny uppercase group labels',
        'Restyle ribbon buttons (.ribbon-button, .ribbon-icon-button): transparent with hover, orange caret, Inter typography',
        'Restyle ribbon dropdowns and .d-menu context menus: glass panels with pill-hover rows',
        'Sub-tabs (3D View / Log / Macros / GCODE Editor) inherit the new tab styling'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.4.0',
      changes: [
        'Introduce Portrait-Cubes design tokens at :root (pc-tokens.css) — orange accent, glass surfaces, Inter, radii, shadows',
        'Add pc-theme.css skin layer — restyle body background (warm gradient), window title bar (frosted glass) and bottom status bar (pill badges)',
        'Drop dark mode: remove theme toggle button, dynamic dark.css load; simplify theme.js to light-only lookup (3D viewer colors preserved)'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.3.1',
      changes: [
        'Replace app icon with new Targz Pen Plotter Ctrl logo (mac .icns, win .ico, linux .png, favicon)'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.3.0',
      changes: [
        'Restyle restart-from-point scrubber, editor banner and 3D-view floating toolbar with Portrait-Cubes design language',
        'Fix toolpath ghosting before scrub head so already-drawn lines blend toward the viewer background instead of darkening'
      ]
    },
    {
      date: '2026-04-15',
      version: '1.2.1',
      changes: [
        'Update app logo',
        'Simplify README with build & install instructions',
        'Build arm64 only'
      ]
    },
    {
      date: '2026-04-15',
      version: '1.2.0',
      changes: [
        'Rebrand to Targz Pen Plotter Ctrl',
        'Add local macOS build script (build-mac)',
        'Add version.js with changelog'
      ]
    },
    {
      date: '2025-01-01',
      version: '1.1.0',
      changes: [
        'Add visual restart-from-point feature with 3D scrubber'
      ]
    }
  ]
};
