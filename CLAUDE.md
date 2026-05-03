# Targz Pen Plotter Control — Project Guide

## Repo

- GitHub: **TarGz/TargzPenPlotterCtrl** (renamed from `Targz-OpenBuilds-CONTROL`)
- Electron app. `index.js` is the main process, `app/` is served over HTTP by Express (port 3000 by default), `app/index.html` is the renderer entry.
- Downstream fork of `OpenBuilds/OpenBuilds-CONTROL` — legacy jQuery + Metro4 UI is still loaded, and the new "Command Deck" (CD) UI in `app/css/commanddeck.css` + `app/js/commanddeck.js` sits on top of it.

## Renderer constraints

- Node `require()` does NOT reliably resolve repo-root modules like `version.js` from renderer scripts, because the page is served via `http://localhost:3000/` (not `file://`). Use the `/api/version` endpoint instead (see `index.js`). Any version/changelog UI must fetch from there, never `require('../../version.js')`.
- Metro4 mutates DOM at load. Legacy sliders like `#jro`, `#fro`, `#tro` live off-screen at the bottom of `app/index.html` specifically so Metro4 can initialise them. Don't remove those stubs.

## Issue-driven workflow

All user-visible bugs and feature requests live as GitHub issues in `TarGz/TargzPenPlotterCtrl`. Use the `gh` CLI:

```bash
gh issue list --repo TarGz/TargzPenPlotterCtrl --state open
gh issue view <N>   --repo TarGz/TargzPenPlotterCtrl
```

### Rules

1. **One issue per commit.** Do not batch fixes across issues into a single commit unless the user explicitly asks for it.
2. **Tag the issue in the commit.** Use `Fixes TarGz/TargzPenPlotterCtrl#N` (for bugs) or `Closes TarGz/TargzPenPlotterCtrl#N` (for features / enhancements) in the commit body. **Always use the full `owner/repo#N` form** — bare `#N` resolves against the upstream fork root (`OpenBuilds/OpenBuilds-CONTROL`), not this repo. One verb per line if multiple issues are legitimately inseparable.
3. **Pause for review between fixes.** After committing one issue's fix, stop and let the user test it before starting the next. The user will say "next" or name the next issue. Don't proactively chain through multiple issues without a pause — some fixes need hardware verification.
4. **Don't push automatically.** Committing is fine when the user asks; pushing to `origin` requires explicit authorization.

## Commit / version conventions

Every commit bumps `version.js` + `package.json` per semver. CHANGELOG entry in `version.js` leads with `Fix #N —` / `Closes #N —` prefixes so the history matches GitHub issue numbers.

- **XX** (Major) — breaking changes, architectural overhauls
- **YY** (Minor) — new features, non-breaking enhancements
- **ZZ** (Patch) — bug fixes, small tweaks

Commit subject pattern: `vX.Y.Z - short summary`. Body lists `Fixes TarGz/TargzPenPlotterCtrl#N` / `Closes TarGz/TargzPenPlotterCtrl#N` on their own lines.

Never mention Claude Code in commits. Never add `Co-Authored-By` lines.

## Development guidelines

- Only commit when the user asks.
- Don't add features, refactor, or introduce abstractions beyond what the task requires.
- Don't add error handling, fallbacks, or validation for scenarios that can't happen.
- Default to no comments. Only explain the non-obvious *why* (a hidden constraint, an invariant, a workaround).
- Prefer editing existing files to creating new ones.
- The Launch preview panel is not a valid way to test this UI — the app depends on Electron + Metro4 being fully loaded, which the preview doesn't provide. Verify in the actual Electron window.
