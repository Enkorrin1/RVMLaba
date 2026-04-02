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
