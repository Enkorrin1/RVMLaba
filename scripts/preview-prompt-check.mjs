import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve(process.argv[3] ?? "output/preview-prompt-check");

fs.mkdirSync(outputDir, { recursive: true });

async function saveJson(name, payload) {
  fs.writeFileSync(path.join(outputDir, name), JSON.stringify(payload, null, 2));
}

function getPromptInteractableId(state) {
  const prompt = state?.ui?.prompt ?? "";
  const visibleInteractables = state?.visibleInteractables ?? [];
  const match = visibleInteractables.find((item) => prompt.endsWith(item.prompt));
  return match?.id ?? null;
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  const assertions = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ type: "console.error", text: msg.text() });
    }
  });
  page.on("pageerror", (error) => {
    errors.push({ type: "pageerror", text: String(error) });
  });

  const advance = (ms) => page.evaluate(async (value) => { await window.advanceTime?.(value); }, ms);
  const getState = () => page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? "null"));

  function assertStep(condition, message, details = {}) {
    assertions.push({ ok: Boolean(condition), message, details });
  }

  async function snapshot(label) {
    const state = await getState();
    await saveJson(`${label}.json`, state);
    await page.screenshot({ path: path.join(outputDir, `${label}.png`) });
    return state;
  }

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const raw = window.render_game_to_text?.();
    if (!raw) {
      return false;
    }
    try {
      return Boolean(JSON.parse(raw)?.scene?.key);
    } catch {
      return false;
    }
  });
  await advance(700);

  await page.evaluate(() => {
    window.__LAST_KEEPER_PREVIEW_TEST_API__?.movePlayerTo?.(1454, 561);
  });
  await advance(180);
  const wakeLeafConflict = await snapshot("01-wake-leaf-pile-vs-clutter");
  assertStep(
    getPromptInteractableId(wakeLeafConflict) === "leaf-pile",
    "Wake prompt prefers the leaf pile over the table clutter when the player stands at the puzzle hotspot",
    { prompt: wakeLeafConflict?.ui?.prompt, promptId: getPromptInteractableId(wakeLeafConflict) }
  );

  await page.evaluate(() => {
    window.__LAST_KEEPER_PREVIEW_TEST_API__?.movePlayerTo?.(1510, 561);
  });
  await advance(180);
  const wakeLadderConflict = await snapshot("02-wake-ladder-vs-leaves");
  assertStep(
    getPromptInteractableId(wakeLadderConflict) === "tower-ladder",
    "Wake prompt prefers the ladder over nearby leaf-pile/table clutter when the player stands at the ladder",
    { prompt: wakeLadderConflict?.ui?.prompt, promptId: getPromptInteractableId(wakeLadderConflict) }
  );

  await page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.interactById("clutter", { force: true });
    await api.advanceTime(180);
    api.triggerOverlayHotspot(0);
    await api.advanceTime(90);
    api.triggerOverlayHotspot(0);
    await api.advanceTime(120);
    api.closeOverlay();
    await api.advanceTime(160);
    api.interactById("leaf-pile", { force: true });
    await api.advanceTime(180);
    const sweep = [[-220,-72],[-148,-72],[-76,-72],[0,-72],[76,-72],[148,-72],[220,-72],[220,-32],[148,-32],[76,-32],[0,-32],[-76,-32],[-148,-32],[-220,-32],[-220,8],[-148,8],[-76,8],[0,8],[76,8],[148,8],[220,8],[220,48],[148,48],[76,48],[0,48],[-76,48],[-148,48],[-220,48],[-220,88],[-148,88],[-76,88],[0,88],[76,88],[148,88],[220,88]];
    for (const [x, y] of sweep.concat([...sweep].reverse())) {
      api.triggerOverlayHotspot(0, { offsetX: x, offsetY: y });
      await api.advanceTime(20);
    }
    await api.advanceTime(120);
    api.triggerOverlayHotspot(1);
    await api.advanceTime(180);
    api.interactById("room-door", { force: true });
    await api.advanceTime(900);
    api.interactById("valve-wheel", { force: true });
    await api.advanceTime(80);
    api.selectInventoryItem("screwdriver");
    api.interactById("toolbox", { force: true });
    await api.advanceTime(180);
    for (const hotspotIndex of [0, 1, 2, 3]) {
      api.triggerOverlayHotspot(hotspotIndex);
      await api.advanceTime(60);
    }
    await api.advanceTime(240);
    api.triggerOverlayHotspot(0);
    await api.advanceTime(120);
    api.closeOverlay();
    await api.advanceTime(140);
    api.selectInventoryItem("screwdriver");
    api.interactById("generator", { force: true });
    await api.advanceTime(200);
    for (const hotspotIndex of [0, 1, 2, 3]) {
      api.triggerOverlayHotspot(hotspotIndex);
      await api.advanceTime(60);
    }
    await api.advanceTime(240);
    api.selectInventoryItem("fuse");
    api.triggerOverlayHotspot(0);
    await api.advanceTime(100);
    api.triggerOverlayHotspot(1);
    await api.advanceTime(120);
    api.selectInventoryItem("valveWheel");
    api.triggerOverlayHotspot(2);
    await api.advanceTime(80);
    api.triggerOverlayHotspot(2);
    await api.advanceTime(60);
    api.triggerOverlayHotspot(2);
    await api.advanceTime(60);
    api.triggerOverlayHotspot(2);
    await api.advanceTime(160);
    api.closeOverlay();
    await api.advanceTime(160);
    api.movePlayerTo(1210, 561);
  });
  await advance(180);
  const shoreConflict = await snapshot("03-shore-hatch-vs-toolbox");
  assertStep(
    getPromptInteractableId(shoreConflict) === "hatch",
    "Shore prompt prefers the hatch over the nearby toolbox once the hatch is unlocked",
    { prompt: shoreConflict?.ui?.prompt, promptId: getPromptInteractableId(shoreConflict) }
  );

  const report = {
    ok: !errors.length && assertions.every((entry) => entry.ok),
    errors,
    assertions,
  };

  await saveJson("prompt-check-report.json", report);
  await browser.close();

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
