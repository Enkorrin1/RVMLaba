Original prompt: [$develop-web-game](C:\Users\egorc\.codex\skills\develop-web-game\SKILL.md) Прогони весь проект. Цель сделать идеальную веб игрую. Составь поэтапный план работы

2026-04-03

Current focus: Stage 1 foundation for final QA and full-project browser runs.

Done:
- Audited project structure, boot flow, and current roadmap state.
- Confirmed the default runtime is the Phaser preview branch via `src/boot.js`.
- Ran the built-in preview self-check successfully; current logical migration coverage is green.
- Identified missing foundation for serious browser QA: no `progress.md`, no project-local Playwright setup, and no exported `render_game_to_text` / game-aware `advanceTime` hooks.
- Added shared preview automation hooks: `window.render_game_to_text`, `window.advanceTime`, and `window.__LAST_KEEPER_PREVIEW_TEST_API__`.
- Completed the first Playwright smoke pass without console/runtime errors.

In progress:
- Prepare richer state dumps for click-driven route automation.
- Build the next browser route that actually traverses interactions and scene transitions.

Notes:
- `ROADMAP.md` already marks "Этап 8. Финальная миграция и QA" as active.
- The safest integration point for automation hooks is `src/phaser-preview/scenes/PreviewSceneBase.js` plus `src/phaser-preview/main.js`.
- First smoke artifacts were written to `output/web-game/initial-smoke`.
- The current skill client supports arrow keys / space and mouse clicks, but not direct `E`, so screen-space interactable coordinates are important for route automation.

TODO:
- Extend text-state output with screen-space interactable coordinates.
- Build a reproducible route for entering the lantern scene from wake.
- Convert smoke coverage into a full critical-path scenario across all preview scenes.
- Review screenshots visually once a stable multi-scene route is in place.

Update:
- Added stronger preview QA API in `src/phaser-preview/main.js`: `interactById`, `triggerOverlayHotspot`, `movePlayerTo`, `closeOverlay`, `resetPreview`, and overlay hotspot listing.
- Added deterministic browser route runner `scripts/preview-route-check.mjs`.
- Route runner now waits for scene readiness before the first snapshot, so the initial wake frame no longer records a false `null` scene.
- Confirmed stable browser route with screenshots and state assertions: `wake -> drawer (battery/note) -> lantern -> lamp check -> wake -> shore -> radio overlay -> close overlay -> valve wheel pickup`.
- Verified latest route artifacts in `output/preview-route-check/` and visually inspected the lantern and shore screenshots.
- Re-ran the official Playwright skill client after meaningful changes; smoke remains free of new console/runtime errors.

Current status:
- Stage 1/2 foundation is now stronger: route automation no longer depends on brittle keyboard timing alone.
- We have a reproducible multi-scene browser scenario with assertion-backed state checks.
- The current scenario still bypasses some physical movement constraints by using the QA API intentionally; this is good for deterministic coverage, but not yet a substitute for full player-like traversal tests.

Next TODO:
- Extend the route through the wake leaf-pile puzzle and screwdriver acquisition.
- Use that screwdriver path to cover toolbox and generator servicing on shore.
- Add a selected-item helper or pointer-precision overlay helper if the screwdriver / generator minigames are too awkward for deterministic automation.
- After shore generator coverage is stable, continue the scenario into `service -> tunnel -> pier -> bay`.

Update:
- Added precise automation helpers to the preview QA API: synthetic overlay pointer triggering/dragging and direct inventory selection.
- Extended `scripts/preview-route-check.mjs` from the earlier wake/lantern/shore smoke into a real critical-path route:
  `wake drawer -> leaf pile -> screwdriver -> lantern check -> shore -> radio -> valve wheel -> toolbox -> fuse -> generator repair -> hatch release -> service`.
- Confirmed the expanded route with assertion-backed state snapshots; latest `output/preview-route-check/route-report.json` is now `ok: true` and ends in `service-preview`.
- Visually reviewed the intermediate screenshots around radio, generator, and shoreline interactions while tightening the route.

Fixes made while expanding the route:
- Fixed an overlay race in `PreviewSceneBase.js`: opening a new overlay immediately after closing another could let stale close-animation callbacks hide the new overlay.
- Replaced unsupported `.setLineWidth(...)` calls with `setStrokeStyle(...)` in service/tunnel/pier/bay and shared render helpers. This removed the runtime crash that happened on transition into the service level.

Verification:
- `runPreviewSelfCheck()` passes after the fixes.
- The official Playwright skill client smoke was rerun after the latest code changes; no new game console/runtime errors were introduced by this pass.

Current status:
- Deterministic browser coverage now reaches `service-preview` without runtime errors.
- The route proves the first substantial puzzle chain is wired together end-to-end, not just scene transitions.

Next TODO:
- Extend the deterministic route through `service -> tunnel -> pier -> bay`.
- Add service-level puzzle coverage next: logbook, console battery insertion/boot, sealed-door panel removal, then tunnel entry.
- Once the full route exists, add a second pass that uses more player-like movement bursts for confidence beyond the direct QA hooks.

Update:
- Stabilized the full critical-path route by making the wake leaf-pile sweep deterministic. The earlier regression was not a game bug: the route left one leaf unswept (`7 / 8`) and then tried to click a screwdriver that had not been revealed yet.
- Updated `scripts/preview-route-check.mjs` so the leaf-pile step now performs a dense two-pass sweep over the whole hotspot area instead of relying on a fragile short drag path.
- Re-ran the full deterministic browser scenario all the way through:
  `wake -> lantern -> shore -> service -> tunnel -> pier -> bay`.
- Latest `output/preview-route-check/route-report.json` is now `ok: true` with no console/runtime errors and assertion coverage across the whole preview campaign.
- Visually rechecked the wake leaf-pile recovery and the latest skill-client smoke screenshot after the route fix.

Verification:
- `node .\scripts\preview-route-check.mjs http://127.0.0.1:4173/ output/preview-route-check` now completes successfully and writes snapshots through `57-inspect-footprints`.
- Re-ran the official Playwright skill client after the route change; no new game console/runtime errors appeared. The only output remains the external skill-script warning about `MODULE_TYPELESS_PACKAGE_JSON`.

Current status:
- Deterministic browser coverage now spans every preview scene and validates the main puzzle chain end-to-end.
- The current blocker is no longer route completeness; the next value comes from player-like traversal checks and visual/game-feel polish rather than more direct-hook coverage.

Next TODO:
- Build a second regression pass that uses movement bursts and screen-space interactions for the most important scenes, so we cover not only state logic but also actual playable readability.
- Start a visual polish pass focused on overlays, prompts, inventory/journal readability, and scene atmosphere now that the full route is proven.
- Add a smaller smoke scenario for restart/reset/fullscreen/resizing to catch non-story regressions.

Update:
- Added a second browser regression layer: `scripts/preview-playability-check.mjs`.
- This new pass intentionally avoids `interactById` and instead uses:
  - keyboard movement bursts,
  - real screen clicks on interactables using `render_game_to_text` screen coordinates,
  - real overlay mouse clicks,
  - Escape-based closing,
  - a manual leaf-pile clearing flow.
- The current playability scenario now covers a real player-like chain through:
  `wake movement -> drawer pickups -> Escape close -> leaf pile open -> manual leaf clearing -> screwdriver recovery -> lantern ladder click -> lamp inspection`.
- Latest `output/preview-playability-check/playability-report.json` is `ok: true` with no console/runtime errors.

Gameplay / QA fix:
- Fixed a mismatch in `PreviewSceneBase.js` between reported interaction reach and actual clickability.
- `getNearestInteractable(...)` now measures distance to the nearest point of an interactable hitbox instead of to the hitbox center.
- `renderGameToTextState()` now reports `inInteractionRange` via `canReachInteractable(...)` instead of a center-distance approximation.
- This matters for tall or elongated interactables like ladders and doors, where the old center-based reporting could claim an object was out of range even though an actual player click already worked.

Verification:
- `node .\scripts\preview-playability-check.mjs http://127.0.0.1:4173/ output/preview-playability-check` passes.
- `node .\scripts\preview-route-check.mjs http://127.0.0.1:4173/ output/preview-route-check` still passes after the interaction-distance fix.
- `runPreviewSelfCheck()` still passes.
- Re-ran the official Playwright skill-client smoke after the latest changes; no new game console/runtime errors were introduced. The only remaining output is still the external `MODULE_TYPELESS_PACKAGE_JSON` warning from the skill script itself.

Current status:
- We now have two complementary QA layers:
  - full deterministic critical-path coverage across all preview scenes,
  - a player-like interaction pass for the early game and first scene transition.
- State reporting is now closer to what the player can really do on screen.

Next TODO:
- Extend the player-like playability pass from `wake -> lantern` into `shore`, especially radio/toolbox/generator readability.
- Begin visual polish in the interaction layer: prompt prioritization when multiple nearby interactables compete, overlay readability, and inventory/journal clarity.
- Add a dedicated smoke pass for fullscreen / resize / reset behavior.

Update:
- Extended the player-like regression pass in `scripts/preview-playability-check.mjs` beyond the tower interior.
- The scenario now covers a real multi-scene route:
  `wake -> lantern -> wake -> shore`,
  including:
  - lantern ladder click,
  - lamp inspection,
  - Escape close,
  - return down the ladder,
  - outside door click,
  - shore radio open/close,
  - valve wheel pickup.
- Latest `output/preview-playability-check/playability-report.json` remains `ok: true` after this expansion.

Verification:
- Re-ran `preview-playability-check.mjs` after the shore extension; it passes with no console/runtime errors.
- Re-ran the official Playwright skill-client smoke after the extension; still no new game console/runtime errors. The only output remains the external `MODULE_TYPELESS_PACKAGE_JSON` warning from the skill script itself.

Important observation for the next pass:
- Prompt prioritization is still not ideal when multiple nearby interactables compete.
- Example: the player can already stand close enough to click the lantern ladder, but the visible prompt may still prefer a different nearby wake object. The actual click path is playable; the prompt selection/readability is what needs polish next.

Current status:
- We now have a real player-like browser route that crosses scene boundaries and validates both tower interior and first exterior interactions.
- Deterministic full-route coverage is still green, so both QA layers are aligned.

Next TODO:
- Continue the player-like pass deeper into `shore` puzzle readability: toolbox opening, generator panel, and fuse/valve repair flow.
- Improve prompt prioritization so the surfaced `[E / click] ...` target better matches the most actionable nearby object.
- Add a resize/fullscreen/reset smoke once interaction readability is tightened.

Update:
- Improved prompt/hover behavior in `PreviewSceneBase.js`.
- `syncInteractionZones()` now recalculates the hovered interactable from the current pointer position and current camera state instead of relying on the last raw `pointermove` event forever.
- This removes the worst "stale prompt" cases where keyboard movement/camera drift left `[E / click] ...` stuck on an older nearby object.

Update:
- Extended `scripts/preview-playability-check.mjs` deeper into the shore puzzle flow.
- The player-like scenario now covers:
  `wake -> lantern -> wake -> shore -> radio -> valveWheel -> toolbox -> fuse`.
- Added real keyboard re-selection of the screwdriver (`3`), real movement back to the toolbox, real click-open of the screw panel, manual unscrewing by overlay clicks, fuse pickup, and Escape close.
- Latest `output/preview-playability-check/playability-report.json` remains `ok: true` after this expansion.

Verification:
- `preview-playability-check.mjs` passes after the prompt-hover fix and shore toolbox extension.
- `runPreviewSelfCheck()` still passes.
- `preview-route-check.mjs` still passes end-to-end after the base prompt logic change.
- The official skill-client smoke had already remained clean earlier in this iteration; no new game console/runtime errors were introduced here.

Current status:
- Prompt behavior is more trustworthy during mixed mouse/keyboard play.
- The player-like regression layer now validates a meaningful exterior puzzle chain, not just scene transitions and flavor interactions.

Next TODO:
- Continue the player-like pass into the generator repair flow: panel removal, fuse seating/clamp, valve wheel mounting, and hatch unlock.
- Keep polishing prompt prioritization around clusters of nearby objects; the stale-hover bug is reduced, but overall target ranking can still be improved.
- After generator readability is solid, add resize/fullscreen/reset smoke coverage.

Update:
- Extended `scripts/preview-playability-check.mjs` through the full exterior repair chain:
  `toolbox -> fuse -> generator panel -> fuse seat/clamp -> valve wheel mount/turn -> hatch release -> service transition`.
- The player-like scenario now confirms that the real keyboard/mouse flow reaches `service-preview` without using direct interaction hooks for the puzzle itself.

UX / UI fixes:
- Fixed a real usability blocker in `PreviewSceneBase.js`: digit-based inventory switching (`1-9`) now works while custom overlays are open, instead of being blocked whenever any overlay was active.
- Improved overlay helper text so action panels now explicitly advertise `1-9` item switching together with click / Escape instructions.
- Fixed a HUD click-stealing issue in `PreviewSceneBase.js`: the bottom inventory background and HUD labels no longer capture mouse input, which previously made low world objects such as the shore hatch open the inventory instead of the scene interaction.

Visual / playability verification:
- Re-ran `preview-playability-check.mjs`; latest `output/preview-playability-check/playability-report.json` is `ok: true`.
- Visually rechecked the latest generator and hatch screenshots:
  - generator overlay now supports in-panel item switching and completes cleanly,
  - hatch overlay opens from a real world click instead of the HUD stealing input,
  - release flow transitions to `service-preview`, and the final frame shows the service-level prompt / layout correctly.
- Re-ran the official Playwright skill-client smoke after the UX/HUD changes; no new game console/runtime errors appeared. The only output remains the external `MODULE_TYPELESS_PACKAGE_JSON` warning from the skill script itself.

Current status:
- The project is now meaningfully in the UX/UI stage, not just route-completion:
  - the main shore repair puzzle is playable with real mixed input,
  - the lower HUD no longer interferes with critical world interactions,
  - custom overlays better communicate available controls.

Next TODO:
- Continue UX polish on overlay layout density and text stacking, especially panels where bottom helper text and local panel labels sit close together.
- Revisit prompt prioritization around dense clusters of nearby objects so the surfaced `[E / click]` target consistently matches player intent.
- Add dedicated resize/fullscreen/reset smoke coverage now that the interaction layer is substantially more stable.

Update:
- Continued the UX/UI pass on overlay composition instead of route logic.
- Reworked the shore repair overlays in `ShoreScene.js`:
  - generator overlay now has explicit section headers for the fuse and valve tasks,
  - the ready-state block is consolidated into a single compact status band instead of duplicating a second large line of text,
  - hatch overlay now has labeled parts (`Стопор`, `Рычаг`) and a separate instruction band so the action guidance is easier to scan.
- Rebalanced the global overlay vertical rhythm in `PreviewSceneBase.js` by lowering the helper text line, which prevents it from colliding with local panel instructions near the bottom of the card.

Visual verification:
- Captured fresh targeted screenshots after the layout pass:
  - `output/ux-overlay-check-4/generator-overlay.png`
  - `output/ux-overlay-check-4/hatch-overlay.png`
- These confirm the generator panel is significantly cleaner and the hatch panel no longer stacks its local instruction on top of the bottom helper line.
- The generator overlay still remains dense because the underlying puzzle has many labels in a compact area, but it is now readable instead of visually fighting itself.

Verification:
- Re-ran the official Playwright skill-client smoke after the overlay layout changes; no new game console/runtime errors appeared.
- The only remaining output is still the external `MODULE_TYPELESS_PACKAGE_JSON` warning from the skill script itself.

Current status:
- The project is now firmly in UX/UI refinement mode.
- The biggest interaction blockers are already gone; the current work is mostly readability, hierarchy, and polish instead of core playability repair.

Next TODO:
- Continue simplifying dense overlay copy in the generator panel, especially the small local labels around the fuse clamp.
- Revisit prompt prioritization / target ranking in dense world-object clusters.
- Add dedicated resize/fullscreen/reset smoke coverage and then a final UX pass over inventory/journal readability.

Update:
- Added explicit prompt-ranking support in `PreviewSceneBase.js`.
- `getNearestInteractable(...)` now uses a weighted score instead of pure distance, so nearby high-intent targets can win over less relevant clutter in contested spots.
- Added `interactionPriority` to the key wake/shore/service interactables in:
  - `src/phaser-preview/data/wakeData.js`
  - `src/phaser-preview/data/towerData.js`

Prompt verification:
- Added `scripts/preview-prompt-check.mjs` to validate prompt surfacing in the two highest-friction conflict zones.
- Latest `output/preview-prompt-check/prompt-check-report.json` is `ok: true`.
- Confirmed visually that:
  - near the wake ladder, the prompt now surfaces `Лестница наверх` instead of the nearby leaf pile,
  - near the unlocked shore hatch, the prompt now surfaces `Служебный люк` instead of the toolbox.

Fullscreen / resize / reset:
- Added `F`-key fullscreen toggle support in `PreviewSceneBase.js`, including a graceful fallback message when the browser refuses fullscreen.
- Updated the HUD control hint so fullscreen is discoverable.
- Added `scripts/preview-ui-smoke.mjs` for:
  - boot check,
  - fullscreen toggle reaction,
  - wide and compact viewport resize,
  - clean reset back to the wake baseline.
- Latest `output/preview-ui-smoke/ui-smoke-report.json` is `ok: true`.

Verification:
- Re-ran the official Playwright skill-client smoke after the prompt-ranking and fullscreen changes; no new game console/runtime errors appeared.
- The only output remains the external `MODULE_TYPELESS_PACKAGE_JSON` warning from the skill script itself.

Current status:
- The project now has coverage for the main UX stability concerns, not just story-route progression:
  - prompt surfacing in contested world-object clusters,
  - overlay readability for the hardest shore puzzle panels,
  - fullscreen / resize / reset resilience.

Next TODO:
- Continue reducing visual density in the generator panel, especially the tiny local labels around the fuse clamp.
- Do a final pass on inventory and journal readability / spacing now that the bigger interaction issues are stable.
- After that, run one final combined regression sweep and prepare the branch for a stabilization/cleanup pass.

Update:
- Continued the UX/UI pass on inventory, journal, and early-room prompt surfacing.
- Reworked `PreviewSceneBase.js`:
  - the bottom inventory HUD now uses a calmer, tighter hierarchy (`В руке`, `предметы`, `зацепки`) instead of longer helper phrases,
  - inventory overlay copy is shorter and more utility-focused,
  - inventory cards are slightly tighter vertically and the hover panel now explains intent in fewer lines,
  - journal overlay now has a dedicated summary band (`Текущая версия событий`) plus a denser, more readable entry list instead of one long explanatory header paragraph.
- Continued simplifying `ShoreScene.js` generator copy:
  - helper line shortened to `1-9 — предмет...`,
  - section captions now read as explicit steps,
  - fuse / valve labels were shortened so the player sees state and action first, not explanatory clutter,
  - generator status line was shortened again to reduce copy competition inside the panel.
- Captured fresh targeted overlay screenshots in:
  - `output/ux-overlay-check-5/inventory-overlay.png`
  - `output/ux-overlay-check-5/journal-overlay.png`
  - `output/ux-overlay-check-5/generator-overlay.png`

Prompt UX follow-up:
- Raised the wake leaf-pile priority and the tower-ladder priority so the room now behaves more like a real sequence of local intentions:
  - near the leaf pile, prompt prefers the puzzle hotspot over the table,
  - near the ladder, prompt still correctly flips back to the ladder.
- Rebuilt `scripts/preview-prompt-check.mjs` to validate prompt selection by interactable `id` instead of brittle localized regex matching. This avoids false failures from text encoding differences in saved artifacts.
- Prompt coverage now explicitly checks all three contested cases:
  - wake leaf pile vs clutter,
  - wake ladder vs leaves,
  - shore hatch vs toolbox.
- Latest `output/preview-prompt-check/prompt-check-report.json` is `ok: true`.

Verification:
- `output/preview-ui-smoke/ui-smoke-report.json` remains `ok: true` after the UI copy/layout pass.
- `output/preview-playability-check/playability-report.json` remains `ok: true`; the early-to-service player-like route still completes after the overlay and HUD changes.
- Re-ran the official Playwright skill client after the latest prompt/UI changes:
  - no new game console/runtime errors appeared,
  - the only remaining output is still the external `MODULE_TYPELESS_PACKAGE_JSON` warning from the skill script itself.

Current status:
- The project is now in late UX stabilization rather than discovery:
  - core route coverage is still green,
  - player-like traversal remains green,
  - contested prompt surfacing is now covered by explicit assertions,
  - inventory/journal/generator overlays are cleaner and more scan-friendly than before.

Next TODO:
- Run one final combined regression sweep (`route`, `playability`, `prompt`, `ui-smoke`) as a stabilization batch before cleanup.
- Do a final visual pass on any remaining dense copy in shore/service overlays if new screenshots reveal another hotspot.
- Then move into cleanup / branch preparation rather than more feature work.

Hotfix:
- Fixed a real scene-return regression in `PreviewSceneBase.js`.
- Root cause: after leaving and re-entering a scene such as `wake-preview`, the stored `uiCamera` reference could survive on the scene instance while the actual Phaser camera registry had already been rebuilt. New HUD / overlay elements were then ignored by the main camera but were not being rendered by a valid UI camera anymore.
- `initializeUiCamera()` now verifies that the stored `uiCamera` is still registered in `this.cameras.cameras`; if not, it recreates the UI camera cleanly.

Regression verification:
- Added an explicit browser return-flow check (artifacts in `output/return-to-wake-check/`):
  - `wake -> shore -> wake`
  - confirmed that HUD state is still present after returning,
  - confirmed that the wake drawer overlay opens again after the return.
- Latest `output/return-to-wake-check/report.json` is `ok: true`.

Update:
- Ran the final stabilization batch again after the late UX/UI pass:
  - `node scripts/preview-ui-smoke.mjs`
  - `node scripts/preview-prompt-check.mjs`
  - `node scripts/preview-playability-check.mjs`
  - `node scripts/preview-route-check.mjs`
- All four reports are green again:
  - `output/preview-ui-smoke/ui-smoke-report.json` => `ok: true`
  - `output/preview-prompt-check/prompt-check-report.json` => `ok: true`
  - `output/preview-playability-check/playability-report.json` => `ok: true`
  - `output/preview-route-check/route-report.json` => `ok: true`

Test harness hardening:
- Fixed a real flake in `scripts/preview-playability-check.mjs`.
- Root cause: the player-like runner used a hard-coded movement direction while approaching some targets, so it could overshoot the lantern ladder and keep drifting toward the room door instead of correcting back toward the target.
- The runner now derives the approach direction from the player's current x-position versus the target center x-position, which keeps the test aligned with actual scene geometry.

Current status:
- The project is now in cleanup / polish mode rather than active regression hunting.
- Core deterministic route, player-like route, prompt surfacing, and UI resilience are all green in the latest batch.

Next TODO:
- Do a final branch cleanup pass:
  - review untracked/generated artifacts and keep only the ones worth versioning,
  - decide whether to keep all helper scripts in-repo as permanent QA coverage,
  - then prepare the next commit around stabilization + UX polish rather than more gameplay changes.

Cleanup update:
- Added a root `.gitignore` so local dependencies and generated QA artifacts stop polluting branch state:
  - `node_modules/`
  - `output/`
  - `src/output/`
  - common local report/log folders
- Removed the accidental duplicated `src/output/` artifact tree that came from running QA scripts from the `src` working directory.
- Removed an empty and unused `src/openapitools.json` placeholder file.

Cleanup status:
- Current untracked files are now only meaningful project additions:
  - `scripts/*.mjs` QA runners,
  - `src/boot.js`,
  - `src/phaser-preview/audio/previewAudio.js`,
  - `src/phaser-preview/dev/previewMigrationAudit.js`,
  - `src/phaser-preview/dev/previewSelfCheck.js`,
  - `.gitignore`
- This means the branch is ready for a deliberate staging/commit pass rather than more filesystem cleanup.

QA ergonomics update:
- Added `scripts/preview-regression-batch.mjs` to run the four main preview checks sequentially through one entrypoint.
- Added npm shortcuts in `package.json`:
  - `qa:preview:ui`
  - `qa:preview:prompt`
  - `qa:preview:playability`
  - `qa:preview:route`
  - `qa:preview:all`
- The batch runner now also handles `--help` cleanly instead of misreading it as a URL.
