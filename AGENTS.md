# Repository Guidelines

## Project Structure & Module Organization
- `index.html`, `effect-showcase.html`, and `TEST-GALLERY.html` drive navigation; update all when adding or removing an effect so counts stay synced.
- Each effect lives in `effects/<category>/EffectName.js` (Three.js) or `.html` (Canvas) and extends helpers from `effects/lib` plus shared utilities from `lib/jazer-background-engine.js`.
- Shared dependencies stay in `lib/` (Three.js r160, post-processing, shader helpers). Never duplicate vendor scripts inside effect folders; import relatively (`../lib/...`).
- Templates for new work live in `templates/`; copy them instead of starting from scratch to keep metadata blocks consistent.
- Docs explaining migrations and fixes are under `docs/`; update them whenever structure or behavior changes.

## Build, Test, and Development Commands
- `START-SERVER.bat` — Windows helper that checks for Python/Node, launches a static server on port 8000, and opens `index.html`.
- `python -m http.server 8000` — cross-platform baseline local server; run from the repo root to avoid `file://` module errors.
- `npx http-server -p 8000` — fallback when Python is unavailable; install once via npm if prompted.
- `start http://localhost:8000/effects/gallery.html` — quick sanity sweep of every effect after changes.

## Coding Style & Naming Conventions
- JavaScript/HTML use 2-space indentation, ES modules, and `const`/`let` with descriptive camelCase; effect classes use PascalCase (for example, `NeonOcean`) and extend the relevant base class.
- Keep imports relative to `lib/` (for example, `import * as THREE from '../lib/Three.js';`) and destructure helpers you need.
- Asset and folder names stay lowercase with hyphens except for class filenames, mirroring the exported class.
- When editing shader strings, preserve template literals and keep GLSL indented with two spaces for readability.

## Testing Guidelines
- No automated harness exists; manual QA is expected. Launch the server, open `index.html`, and walk through any touched effect plus `effect-showcase.html` to confirm navigation.
- Watch the browser console for warnings, FPS drops, or missing asset errors; fixes should include notes in `docs/FIXES-APPLIED.md` when they affect multiple effects.
- For regression checks, reload using Chrome and Firefox to cover both WebGL implementations.

## Commit & Pull Request Guidelines
- Follow the existing short imperative style (`Fix SimplexNoise syntax errors`, `Update README.md...`). Reference the affected effect or subsystem in the subject.
- Each PR should include: summary of the visual or engine changes, steps to reproduce or verify locally, linked issue (if any), and screenshots or short clips for new visuals.
- Confirm `git status` is clean, run the gallery smoke test, and mention that verification in the PR description.

## Security & Configuration Tips
- Never open the HTML files via `file://`; ES module imports will fail and cache incorrect paths. Always test through the local server commands above.
- Do not commit vendor updates directly inside `effects/`; bump the copies in `lib/` and update import paths, then document the change under `docs/MIGRATION-GUIDE.md`.
- Remove any API keys or experiment data before pushing; visuals should rely solely on deterministic math helpers in `lib/jazer-background-engine.js`.
