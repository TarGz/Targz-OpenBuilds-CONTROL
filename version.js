module.exports = {
  version: require('./package.json').version,
  CHANGELOG: [
    {
      date: '2026-05-03',
      version: '1.8.3',
      changes: [
        'Closes TarGz/TargzPenPlotterCtrl#10 — Override sliders (JOG/FEED/TOOL): add −/+ nudge buttons (±1%) flanking the value display, and click-to-edit on the % label (click → inline number input → Enter applies, Escape cancels). cdNudgeOverride helper added to commanddeck.js.'
      ]
    },
    {
      date: '2026-05-03',
      version: '1.8.2',
      changes: [
        'Closes #11 — Add PUMP Z-height preset: button in jog panel (syringe SVG icon, amber colour) + PUMP row in PEN HEIGHTS settings (slider, nudge, TEST, amber SVG marker on Z-axis diagram). localStorage key penPumpZ, default −2. Pen button icons replaced with inline SVGs (pen-up lifts, pen-down presses onto paper line). cdReadPenHeights / cdRefreshPenHints / cdUpdateConnection all extended for pump.'
      ]
    },
    {
      date: '2026-05-03',
      version: '1.8.1',
      changes: [
        'Fix #8 — Rename Z jog buttons UP/DOWN → Z+/Z− and move them into the XY jog grid as a 4th column. PEN UP / PEN DOWN remain as their own macro row above the pad. No JS changes: .zP / .zM class handlers in jog.js are untouched.'
      ]
    },
    {
      date: '2026-04-22',
      version: '1.8.0',
      changes: [
        'Port selector now includes a "Virtual Ports" section for PTY devices: index.js findVirtualPorts() scans /tmp for symlinks pointing at /dev/ttys* or /dev/pty* and adds them to status.comms.interfaces.virtualPorts; populatePortsMenu() renders them as a third optgroup alongside USB and Network ports. Selected virtual ports flow through the existing serial connect/read/write path with no special-casing, so connecting to a fake GRBL simulator (e.g. python3 fake_grbl.py --link /tmp/fakegrbl) works exactly like a real device.',
        'Removed the in-renderer "Dev Machine" simulator (DEV_PORT_VALUE / DEV_PORT_DEMO entries, buildFakeStatus tick loop, socket.emit / runJobFile / sendGcode intercepts) now that the real fake-GRBL PTY simulator is wired up. _lastAlarmShown / _alarmShowTimer, which happened to live inside the DEV block but belong to the alarm-banner debounce in cdUpdateConnection, are kept as standalone declarations.',
        'commanddeck.js cdSyncPortOptions no longer mirrors #portUSB via the DOM — Metro4 select.data() only updates its widget state, not the native select children, so that mirror always read the "Waiting for USB" placeholder. populatePortsMenu now writes the same response HTML directly to #cdPortSelect via element.innerHTML (jQuery .html() silently strips <optgroup> via its detached-div parser), and cdSyncPortOptions shrinks to a label/disabled-state refresh.'
      ]
    },
    {
      date: '2026-04-21',
      version: '1.7.0',
      changes: [
        'Axis readouts now show a small "MPos: <value>" line under each big WCS number, so the machine-coordinate position is visible at a glance. Highlights in accent colour when MPos differs from the displayed WCS value — i.e. whenever a G54 offset is active — to help avoid crashes caused by stale stored offsets.'
      ]
    },
    {
      date: '2026-04-21',
      version: '1.6.3',
      changes: [
        'FEED slider widened from 10-200% to 1-500% for visual parity with the JOG slider. Grbl itself still clamps feed override at 10-200% (bytes 0x91-0x94 cannot push it past that band) — beyond those limits the slider is effectively cosmetic for G1, but the coupled rapid override introduced in 1.6.0 keeps responding: below 38% the slider still drops G0 travel to 25%, and above 75% it releases to 100%. Net effect for the user: the slider range matches JOG visually and the extra low-end headroom just stays on rapid=25% all the way down.'
      ]
    },
    {
      date: '2026-04-21',
      version: '1.6.2',
      changes: [
        'Strip the srvLog debug bridge added in 1.6.1 now that rapidOverride is hardware-verified — grbl 1.1g reports back feedOverride=10 / rapidOverride=25 after dragging FEED low during a plot, confirming the bytes land. First-read races before the next 250ms status tick were a diagnostic artefact, not a bug.'
      ]
    },
    {
      date: '2026-04-21',
      version: '1.6.1',
      changes: [
        'Debug aid (temporary): rapidOverride backend handler now echoes each step back to the renderer via a new srvLog socket event, so debug output is visible in DevTools console instead of only the Node terminal. Will be stripped once the rapid-override hardware issue is diagnosed.'
      ]
    },
    {
      date: '2026-04-21',
      version: '1.6.0',
      changes: [
        'FEED slider now also drives grbl rapid override during a plotting job. On a pen plotter, pen-up XY travel is G0 rapid, which the feed-override bytes (0x91-0x94) do not touch — so the FEED slider previously did nothing for most of the visible motion. websocket.js feedOverride() now co-emits rapidOverride alongside feedOverride. New index.js handler maps the slider value to grbl\'s three discrete rapid levels: ≥75% → 0x95 (100%), ≥38% → 0x96 (50%), <38% → 0x97 (25%). Caches current rapidOverride to avoid redundant bytes. Dragging FEED down now slows G1 strokes and G0 travel together; dragging it up releases both.'
      ]
    },
    {
      date: '2026-04-21',
      version: '1.5.17',
      changes: [
        'Fix #2 — JOG override: fire jogOverride on oninput (not onchange-only), matching legacy Metro4 #jro behaviour. v1.5.10 had moved all three CD sliders to onchange to stop FEED/TOOL flooding grbl, but JOG is purely client-side (updates jogRateX/Y/Z/A, no socket emit) so the flood rationale never applied — and the onchange event on the vertical HTML5 range fired inconsistently, making the slider feel dead. Root cause of the "does nothing" perception, once oninput was in place, turned out to be the 1 mm default jog step: F=300 vs F=3000 over 1 mm both complete in a blink. Works clearly at 10 mm / 100 mm step. Hardware-verified at 1 % vs 100 %. FEED and TOOL intentionally left on onchange (their emit path still needs the debounce).',
        'Closes #3 — JOG slider widened from 1-300% to 1-500%. Below 100% the scaling is honoured exactly (fine slow-jog control). Above 100% grbl still clamps commanded F to $110/$111; the wider range removes the UI ceiling so there is headroom once $110 is raised in Settings.'
      ]
    },
    {
      date: '2026-04-21',
      version: '1.5.15',
      changes: [
        'App icon: jogWindow and gpuInfoWindow BrowserWindow icons pointed to /app/favicon.png which does not exist, so nativeImage returned an empty image and Electron fell back to its default logo in the taskbar/window frame. Repointed both to the existing /app/icon.png (same source the tray already uses). Also fixed the Linux electron-builder icon path from "build/" (bare directory containing .icns/.ico) to "build/icons/" (directory of sized PNGs electron-builder expects).'
      ]
    },
    {
      date: '2026-04-21',
      version: '1.5.14',
      changes: [
        'Fix #7 — Alarm banner relocated to the top of the right column (#cd-right) as an inline panel, so toggling it only shifts the scrollable JOB info below it; the jog panel, position strip, topbar and console are unaffected. cdUpdateConnection also debounces the ON transition by 700ms so transient alarm ticks during the GRBL handshake (status oscillating 5↔2 during initial connect) do not flash the banner; OFF transitions still hide immediately.'
      ]
    },
    {
      date: '2026-04-20',
      version: '1.5.12',
      changes: [
        'Port selector (follow-up to 1.5.11): delegated the open/close click off document so it stays wired regardless of element timing, and moved the hit target from the inner <button> to the whole #cdPortCustom wrap — Electron on macOS had pointer-event quirks on the nested button that plain Chrome did not, so clicks registered in the browser but no-op in the app.'
      ]
    },
    {
      date: '2026-04-20',
      version: '1.5.11',
      changes: [
        'Port selector: replaced the native <select> with a custom button + popover menu. Fixes two issues: (1) on macOS Electron the native dropdown rendered as an OS-level popup that floated outside the app window; (2) the 2s refresh was rebuilding the <select> unconditionally, making the open menu blink/close. The new menu is an in-DOM element so it stays clipped to the window, and the sync is now diff-based (skips rebuilds when the option list is unchanged) and completely suspended while the menu is open.'
      ]
    },
    {
      date: '2026-04-19',
      version: '1.5.10',
      changes: [
        'Fix #1 — jog step default mismatch: commanddeck.js now triggers the active cd-step-btn on load so jogdistXYZ (jog.js default 10) resyncs to the UI-highlighted step (markup default: 1). Inch map and legacy-dist ID map gained the missing 100mm entry.',
        'Fix #2 — override sliders were no-ops in common cases. Oninput fired the override on every pixel drag, flooding grbl with +1%/-1% real-time commands and out-racing curFRO, often netting zero effect. Split to oninput (value label only) + onchange (release-only emit). jogOverride no longer short-circuits when grblParams lacks $110 — it falls back to 4000/4000/2000/2000 so the slider works disconnected or pre-$$.',
        'Fix #3 (closes) — JOG override slider range widened from 1-200% to 1-300% so there is more visual headroom above nominal feed. Grbl still caps real motion at $110/$111/$112.',
        'Fix #4 — UI version plumbing. /api/version now also returns appVersion + changelog. commanddeck.js fetches the top-bar badge via /api/version (require(../../version.js) does not resolve in the renderer when the page is served over HTTP). settings.js PC_APP_VERSION and the About-panel changelog both come from the same endpoint. Stale hardcoded v1.5.2 and v1.5.6 fallbacks removed.'
      ]
    },
    {
      date: '2026-04-19',
      version: '1.5.9',
      changes: [
        '3D viewport surround unified to #FFFAF4 (matches --cd-bg). Three places had to agree: WebGLRenderer clear-color, the skydome top/bottom shader colors, and the Electron BrowserWindow native background.',
        'WebGLRenderer switched to alpha:false so the clear-color fills opaquely (was compositing inconsistently between Electron 23 and vanilla Chrome, producing different surround tints on different machines)',
        'Skydome SKY_TOP_COLOR / SKY_BOTTOM_COLOR changed from blue/white gradient to flat #FFFAF4 — the 9900-radius sphere was masking the clear-color from every camera angle, which is why top-down views always read as white regardless of clear-color',
        'Work-area contour darkened to #B8A888 and raised from z=-0.4 to z=+0.02 so it sits above the plane + grid and is readable against both cream and white',
        '3D work area now auto-sizes to the controller-reported machine envelope: grblSettings() calls redrawGrid(0, $130, 0, $131) whenever the controller reports its settings, replacing the hard-coded 307×207 default. Unit-aware (mm→in). Post-$$-refresh means CD-settings edits update the viewer without a reconnect.'
      ]
    },
    {
      date: '2026-04-19',
      version: '1.5.8',
      changes: [
        'Titlebar emptied — version, loaded-file name and "connected to /dev/tty…" suffix removed. The CD top bar already carries the version badge, file chip and port chip, so the titlebar was pure redundancy.',
        'Alarm banner moved above the CD top bar instead of below it, so a halt alert is the very first thing you see',
        'build-mac script now `rm -rf dist &&` before electron-builder runs, preventing stale older-version artifacts from lingering in dist/ and being mistakenly opened after a version bump'
      ]
    },
    {
      date: '2026-04-19',
      version: '1.5.7',
      changes: [
        'Settings → Parameters: single unified $-key list (BASIC + ADVANCED tabs merged, numerically sorted by $-number). Search still works across the whole set.',
        'Settings → Calibration: X/Y/Z step-calibration cards now dispatch to the legacy xstepscalibrate / ystepscalibrate / zstepscalibrate wizards via bindCalibration()',
        'Pen heights moved out of the Calibration card list into their own dedicated sub-page; Calibration header hint rewritten accordingly',
        'Pen heights page: header simplified (hero + back button removed in favour of always-visible section), SVG "WORK 0" marker relabeled to "HOME" to match how users think about the Z reference'
      ]
    },
    {
      date: '2026-04-18',
      version: '1.5.6',
      changes: [
        'Edit mode: 3D camera now follows the scrub cursor (cdScrubFollow) so the user can zoom via mouse wheel and nudge ±1/±10/±100 to pen-position precisely',
        'Camera resets to full view (resetView) when the scrubber closes',
        'Zoom slider + buttons removed — mouse-wheel OrbitControls zoom is enough'
      ]
    },
    {
      date: '2026-04-18',
      version: '1.5.5',
      changes: [
        'Titlebar slimmed: 42px → 26px, logo removed, window control buttons shrunk to 26×26, title text dropped to 11px/0.7 opacity',
        'CD layout height offset updated to calc(100vh - 26px) to match the new titlebar',
        'Version badge added to the Command Deck top bar next to PENPLOTTER · CONTROL, auto-synced from version.js via require() at page ready',
        'Scrub-to-restart-point card: each info row pinned to its own block with fixed line-height (pill / coords / gcode) so digit-count changes no longer shift the card vertically; coords use tabular-nums; empty gcode row still reserves its height'
      ]
    },
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
