import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve(process.argv[3] ?? "output/preview-playability-check");

fs.mkdirSync(outputDir, { recursive: true });

async function saveJson(name, payload) {
  fs.writeFileSync(path.join(outputDir, name), JSON.stringify(payload, null, 2));
}

function summarizeState(state) {
  return {
    scene: state?.scene?.key ?? null,
    stage: state?.scene?.stage ?? null,
    objective: state?.objective ?? null,
    overlayActive: state?.ui?.overlayActive ?? null,
    prompt: state?.ui?.prompt ?? null,
  };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  const assertions = [];
  const routeReport = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ type: "console.error", text: msg.text() });
    }
  });
  page.on("pageerror", (error) => {
    errors.push({ type: "pageerror", text: String(error) });
  });

  async function getState() {
    return page.evaluate(() => {
      const raw = window.render_game_to_text?.();
      return raw ? JSON.parse(raw) : null;
    });
  }

  async function getOverlayHotspots() {
    return page.evaluate(() => window.__LAST_KEEPER_PREVIEW_TEST_API__?.listOverlayHotspots?.() ?? []);
  }

  async function waitForOverlayHotspots(minCount = 1, attempts = 12, burstMs = 50) {
    for (let index = 0; index < attempts; index += 1) {
      const hotspots = await getOverlayHotspots();
      if (hotspots.length >= minCount) {
        return hotspots;
      }

      await advance(burstMs);
    }

    return getOverlayHotspots();
  }

  async function advance(ms) {
    await page.evaluate(async (value) => {
      await window.advanceTime?.(value);
    }, ms);
  }

  function assertStep(condition, message, details = {}) {
    assertions.push({ ok: Boolean(condition), message, details });
  }

  async function snapshot(label) {
    const state = await getState();
    await saveJson(`${label}.json`, state);
    await page.screenshot({ path: path.join(outputDir, `${label}.png`) });
    routeReport.push({ label, ...summarizeState(state) });
    return state;
  }

  async function waitForReady(timeoutMs = 5000) {
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
    }, null, { timeout: timeoutMs });
  }

  async function step(label, fn) {
    await fn();
    return snapshot(label);
  }

  async function clickPoint(x, y) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
  }

  async function clickVisibleInteractable(id) {
    const state = await getState();
    const item = state?.visibleInteractables?.find((entry) => entry.id === id);
    if (!item) {
      throw new Error(`Visible interactable "${id}" was not found.`);
    }

    await clickPoint(item.screenX, item.screenY);
    return item;
  }

  async function clickOverlayHotspot(index, { offsetX = 0, offsetY = 0 } = {}) {
    const hotspots = await waitForOverlayHotspots(index + 1);
    const hotspot = hotspots[index];
    if (!hotspot) {
      throw new Error(`Overlay hotspot "${index}" was not found.`);
    }

    await clickPoint(hotspot.x + offsetX, hotspot.y + offsetY);
    return hotspot;
  }

  async function dragOverlayHotspot(index, pathPoints) {
    const hotspots = await waitForOverlayHotspots(index + 1);
    const hotspot = hotspots[index];
    if (!hotspot) {
      throw new Error(`Overlay hotspot "${index}" was not found.`);
    }

    const points = pathPoints.length ? pathPoints : [{ x: 0, y: 0 }];
    const first = points[0];
    await page.mouse.move(hotspot.x + first.x, hotspot.y + first.y);
    await page.mouse.down();

    for (const point of points.slice(1)) {
      await page.mouse.move(hotspot.x + point.x, hotspot.y + point.y, { steps: 2 });
      await advance(24);
    }

    await page.mouse.up();
    return hotspot;
  }

  async function clickOverlayArea(index, pathPoints) {
    const hotspots = await waitForOverlayHotspots(index + 1);
    const hotspot = hotspots[index];
    if (!hotspot) {
      throw new Error(`Overlay hotspot "${index}" was not found.`);
    }

    for (const point of pathPoints) {
      await clickPoint(hotspot.x + point.x, hotspot.y + point.y);
      await advance(70);
    }

    return hotspot;
  }

  async function clickOverlayAreaUntil(index, pathPoints, stopWhen) {
    const hotspots = await waitForOverlayHotspots(index + 1);
    const hotspot = hotspots[index];
    if (!hotspot) {
      throw new Error(`Overlay hotspot "${index}" was not found.`);
    }

    let lastState = await getState();

    for (const point of pathPoints) {
      await clickPoint(hotspot.x + point.x, hotspot.y + point.y);
      await advance(70);
      lastState = await getState();

      if (stopWhen(lastState)) {
        break;
      }
    }

    return lastState;
  }

  async function holdKey(key, durationMs) {
    await page.keyboard.down(key);
    await advance(durationMs);
    await page.keyboard.up(key);
    await advance(80);
  }

  async function pressKey(key, settleMs = 120) {
    await page.keyboard.press(key);
    await advance(settleMs);
  }

  async function moveUntilPromptIncludes(text, key = "d", attempts = 24, burstMs = 180) {
    for (let index = 0; index < attempts; index += 1) {
      const state = await getState();
      if (state?.ui?.prompt?.includes(text)) {
        return state;
      }

      await holdKey(key, burstMs);
    }

    return getState();
  }

  function pickApproachKey(state, item, fallbackKey = "d") {
    if (!state?.player || !item) {
      return fallbackKey;
    }

    const targetCenterX = item.x + (item.width ?? 0) / 2;
    return targetCenterX < state.player.x ? "a" : "d";
  }

  async function moveUntilInteractableReachable(id, key = "d", attempts = 24, burstMs = 180) {
    for (let index = 0; index < attempts; index += 1) {
      const state = await getState();
      const item = state?.visibleInteractables?.find((entry) => entry.id === id);
      if (item?.inInteractionRange) {
        return state;
      }

      await holdKey(pickApproachKey(state, item, key), burstMs);
    }

    return getState();
  }

  async function moveUntilDistanceAtMost(id, maxDistance, key = "d", attempts = 24, burstMs = 180) {
    for (let index = 0; index < attempts; index += 1) {
      const state = await getState();
      const item = state?.visibleInteractables?.find((entry) => entry.id === id);
      if (item && item.distanceFromPlayer != null && item.distanceFromPlayer <= maxDistance) {
        return state;
      }

      await holdKey(pickApproachKey(state, item, key), burstMs);
    }

    return getState();
  }

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await waitForReady();
  await advance(800);
  await snapshot("00-initial");

  const wakeClutterReach = await step("01-reach-clutter", async () => {
    await moveUntilInteractableReachable("clutter", "d", 12, 160);
  });
  assertStep(
    wakeClutterReach?.visibleInteractables?.find((item) => item.id === "clutter")?.inInteractionRange,
    "Player can walk into range of the wake clutter by keyboard",
    summarizeState(wakeClutterReach)
  );

  const wakeDrawerOpen = await step("02-open-drawer-by-click", async () => {
    await clickVisibleInteractable("clutter");
    await advance(360);
  });
  assertStep(
    wakeDrawerOpen?.ui?.overlayActive && wakeDrawerOpen?.ui?.overlayKind === "inventory",
    "Wake drawer opens from a real screen click",
    summarizeState(wakeDrawerOpen)
  );

  const batteryPickup = await step("03-pick-battery-by-click", async () => {
    await clickOverlayHotspot(0);
    await advance(260);
  });
  assertStep(
    batteryPickup?.inventory?.items?.some((item) => item.id === "battery"),
    "Battery pickup works via overlay mouse click",
    summarizeState(batteryPickup)
  );

  const notePickup = await step("04-pick-note-by-click", async () => {
    await clickOverlayHotspot(0);
    await advance(260);
  });
  assertStep(
    notePickup?.inventory?.items?.some((item) => item.id === "note"),
    "Note pickup works via overlay mouse click",
    summarizeState(notePickup)
  );

  const drawerClose = await step("05-close-drawer-by-escape", async () => {
    await page.keyboard.press("Escape");
    await advance(220);
  });
  assertStep(!drawerClose?.ui?.overlayActive, "Drawer closes by Escape", summarizeState(drawerClose));

  const leafPileReach = await step("06-reach-leaf-pile", async () => {
    await moveUntilInteractableReachable("leaf-pile", "d", 8, 160);
  });
  assertStep(
    leafPileReach?.visibleInteractables?.find((item) => item.id === "leaf-pile")?.inInteractionRange,
    "Player can walk into range of the leaf pile by keyboard",
    summarizeState(leafPileReach)
  );

  const leafPileOpen = await step("07-open-leaf-pile-by-click", async () => {
    await clickVisibleInteractable("leaf-pile");
    await advance(320);
  });
  assertStep(leafPileOpen?.ui?.overlayActive, "Leaf pile opens from a real screen click", summarizeState(leafPileOpen));

  const sweepPath = [
    { x: -220, y: -72 }, { x: -148, y: -72 }, { x: -76, y: -72 }, { x: 0, y: -72 }, { x: 76, y: -72 }, { x: 148, y: -72 }, { x: 220, y: -72 },
    { x: 220, y: -32 }, { x: 148, y: -32 }, { x: 76, y: -32 }, { x: 0, y: -32 }, { x: -76, y: -32 }, { x: -148, y: -32 }, { x: -220, y: -32 },
    { x: -220, y: 8 }, { x: -148, y: 8 }, { x: -76, y: 8 }, { x: 0, y: 8 }, { x: 76, y: 8 }, { x: 148, y: 8 }, { x: 220, y: 8 },
    { x: 220, y: 48 }, { x: 148, y: 48 }, { x: 76, y: 48 }, { x: 0, y: 48 }, { x: -76, y: 48 }, { x: -148, y: 48 }, { x: -220, y: 48 },
    { x: -220, y: 88 }, { x: -148, y: 88 }, { x: -76, y: 88 }, { x: 0, y: 88 }, { x: 76, y: 88 }, { x: 148, y: 88 }, { x: 220, y: 88 },
  ];

  const sweepLeaves = await step("08-sweep-leaves-by-clicks", async () => {
    await clickOverlayAreaUntil(0, [...sweepPath, ...[...sweepPath].reverse()], (state) => (
      !state?.ui?.overlayActive
      || state?.inventory?.items?.some((item) => item.id === "screwdriver")
    ));
    await advance(180);
  });
  assertStep(
    sweepLeaves?.ui?.overlayActive
      || sweepLeaves?.inventory?.items?.some((item) => item.id === "screwdriver"),
    "Manual clicks across the leaf pile clear the puzzle area without breaking the scene",
    summarizeState(sweepLeaves)
  );

  const screwdriverPickup = await step("09-pick-screwdriver-by-click", async () => {
    const state = await getState();
    const alreadyPicked = state?.inventory?.items?.some((item) => item.id === "screwdriver");
    if (!alreadyPicked) {
      await clickOverlayHotspot(1);
      await advance(240);
    }
  });
  assertStep(
    screwdriverPickup?.inventory?.items?.some((item) => item.id === "screwdriver")
      && screwdriverPickup?.progress?.wake?.leavesMoved
      && !screwdriverPickup?.ui?.overlayActive,
    "Screwdriver recovery works via real pointer drag + click flow",
    summarizeState(screwdriverPickup)
  );

  const lanternReach = await step("10-reach-lantern-ladder", async () => {
    await moveUntilDistanceAtMost("tower-ladder", 140, "d", 4, 140);
  });
  assertStep(
    (lanternReach?.visibleInteractables?.find((item) => item.id === "tower-ladder")?.distanceFromPlayer ?? Infinity) <= 140,
    "Player can walk close enough to click the lantern ladder by keyboard",
    summarizeState(lanternReach)
  );

  const lanternEnter = await step("11-enter-lantern-by-click", async () => {
    await clickVisibleInteractable("tower-ladder");
    await advance(1200);
  });
  assertStep(lanternEnter?.scene?.key === "lantern-preview", "Lantern transition works from a real screen click", summarizeState(lanternEnter));

  const lampReach = await step("12-reach-lamp-mechanism", async () => {
    await moveUntilDistanceAtMost("lamp-mechanism", 170, "d", 8, 160);
  });
  assertStep(
    (lampReach?.visibleInteractables?.find((item) => item.id === "lamp-mechanism")?.distanceFromPlayer ?? Infinity) <= 170,
    "Player can walk close enough to click the lamp mechanism by keyboard",
    summarizeState(lampReach)
  );

  const lampOpen = await step("13-open-lamp-by-click", async () => {
    await clickVisibleInteractable("lamp-mechanism");
    await advance(320);
  });
  assertStep(lampOpen?.ui?.overlayActive, "Lamp mechanism overlay opens from a real screen click", summarizeState(lampOpen));

  const lampInspect = await step("14-inspect-lamp-by-click", async () => {
    await clickOverlayHotspot(0);
    await advance(640);
  });
  assertStep(
    lampInspect?.progress?.lantern?.mechanismChecked,
    "Lamp mechanism inspection completes from overlay click",
    summarizeState(lampInspect)
  );

  const lampClose = await step("15-close-lamp-by-escape", async () => {
    await page.keyboard.press("Escape");
    await advance(220);
  });
  assertStep(!lampClose?.ui?.overlayActive, "Lamp overlay closes by Escape", summarizeState(lampClose));

  const ladderDownReach = await step("16-reach-ladder-down", async () => {
    await moveUntilDistanceAtMost("lantern-ladder-down", 130, "a", 10, 160);
  });
  assertStep(
    (ladderDownReach?.visibleInteractables?.find((item) => item.id === "lantern-ladder-down")?.distanceFromPlayer ?? Infinity) <= 130,
    "Player can walk close enough to click the ladder down by keyboard",
    summarizeState(ladderDownReach)
  );

  const returnWake = await step("17-return-wake-by-click", async () => {
    await clickVisibleInteractable("lantern-ladder-down");
    await advance(1200);
  });
  assertStep(returnWake?.scene?.key === "wake-preview", "Return from lantern works from a real screen click", summarizeState(returnWake));

  const shoreDoorReach = await step("18-reach-shore-door", async () => {
    await moveUntilDistanceAtMost("room-door", 110, "d", 12, 180);
  });
  assertStep(
    (shoreDoorReach?.visibleInteractables?.find((item) => item.id === "room-door")?.distanceFromPlayer ?? Infinity) <= 110,
    "Player can walk close enough to click the outside door by keyboard",
    summarizeState(shoreDoorReach)
  );

  const enterShore = await step("19-enter-shore-by-click", async () => {
    await clickVisibleInteractable("room-door");
    await advance(1200);
  });
  assertStep(enterShore?.scene?.key === "shore-preview", "Shore transition works from a real screen click", summarizeState(enterShore));

  const radioReach = await step("20-reach-radio", async () => {
    await moveUntilDistanceAtMost("radio", 120, "d", 12, 180);
  });
  assertStep(
    (radioReach?.visibleInteractables?.find((item) => item.id === "radio")?.distanceFromPlayer ?? Infinity) <= 120,
    "Player can walk close enough to click the radio by keyboard",
    summarizeState(radioReach)
  );

  const radioOpen = await step("21-open-radio-by-click", async () => {
    await clickVisibleInteractable("radio");
    await advance(360);
  });
  assertStep(radioOpen?.ui?.overlayActive, "Radio overlay opens from a real screen click", summarizeState(radioOpen));

  const radioClose = await step("22-close-radio-by-escape", async () => {
    await page.keyboard.press("Escape");
    await advance(220);
  });
  assertStep(!radioClose?.ui?.overlayActive, "Radio overlay closes by Escape", summarizeState(radioClose));

  const valveReach = await step("23-reach-valve-wheel", async () => {
    await moveUntilDistanceAtMost("valve-wheel", 110, "d", 14, 180);
  });
  assertStep(
    (valveReach?.visibleInteractables?.find((item) => item.id === "valve-wheel")?.distanceFromPlayer ?? Infinity) <= 110,
    "Player can walk close enough to click the valve wheel by keyboard",
    summarizeState(valveReach)
  );

  const valvePickup = await step("24-pick-valve-wheel-by-click", async () => {
    await clickVisibleInteractable("valve-wheel");
    await advance(260);
  });
  assertStep(
    valvePickup?.inventory?.items?.some((item) => item.id === "valveWheel"),
    "Valve wheel pickup works from a real screen click on shore",
    summarizeState(valvePickup)
  );

  const selectScrewdriver = await step("25-select-screwdriver-by-digit", async () => {
    await pressKey("3", 180);
  });
  assertStep(
    selectScrewdriver?.inventory?.selectedItemId === "screwdriver",
    "Screwdriver can be re-selected by keyboard digit on shore",
    summarizeState(selectScrewdriver)
  );

  const toolboxReach = await step("26-reach-toolbox", async () => {
    await moveUntilDistanceAtMost("toolbox", 120, "a", 12, 180);
  });
  assertStep(
    (toolboxReach?.visibleInteractables?.find((item) => item.id === "toolbox")?.distanceFromPlayer ?? Infinity) <= 120,
    "Player can walk close enough to click the toolbox by keyboard",
    summarizeState(toolboxReach)
  );

  const toolboxOpen = await step("27-open-toolbox-by-click", async () => {
    await clickVisibleInteractable("toolbox");
    await advance(420);
  });
  assertStep(
    toolboxOpen?.ui?.overlayActive,
    "Toolbox panel opens from a real screen click while screwdriver is selected",
    summarizeState(toolboxOpen)
  );

  const toolboxUnscrew = await step("28-unscrew-toolbox-by-clicks", async () => {
    for (const hotspotIndex of [0, 1, 2, 3]) {
      await clickOverlayHotspot(hotspotIndex);
      await advance(150);
    }
    await advance(620);
  });
  assertStep(
    toolboxUnscrew?.ui?.overlayActive
      && toolboxUnscrew?.progress?.puzzleState?.toolbox?.panelOpened,
    "Toolbox screw panel can be removed via real overlay clicks",
    summarizeState(toolboxUnscrew)
  );

  const fusePickup = await step("29-pick-fuse-by-click", async () => {
    await clickOverlayHotspot(0);
    await advance(260);
  });
  assertStep(
    fusePickup?.inventory?.items?.some((item) => item.id === "fuse"),
    "Fuse pickup works from a real toolbox overlay click",
    summarizeState(fusePickup)
  );

  const toolboxClose = await step("30-close-toolbox-by-escape", async () => {
    await pressKey("Escape", 220);
  });
  assertStep(!toolboxClose?.ui?.overlayActive, "Toolbox overlay closes by Escape", summarizeState(toolboxClose));

  const generatorReach = await step("31-reach-generator", async () => {
    await moveUntilDistanceAtMost("generator", 130, "d", 16, 180);
  });
  assertStep(
    (generatorReach?.visibleInteractables?.find((item) => item.id === "generator")?.distanceFromPlayer ?? Infinity) <= 130,
    "Player can walk close enough to click the generator by keyboard",
    summarizeState(generatorReach)
  );

  const generatorOpen = await step("32-open-generator-by-click", async () => {
    await clickVisibleInteractable("generator");
    await advance(420);
  });
  assertStep(
    generatorOpen?.ui?.overlayActive,
    "Generator screw panel opens from a real screen click while screwdriver is selected",
    summarizeState(generatorOpen)
  );

  const generatorUnscrew = await step("33-unscrew-generator-by-clicks", async () => {
    for (const hotspotIndex of [0, 1, 2, 3]) {
      await clickOverlayHotspot(hotspotIndex);
      await advance(150);
    }
    await advance(620);
  });
  assertStep(
    generatorUnscrew?.ui?.overlayActive
      && generatorUnscrew?.progress?.puzzleState?.generator?.panelOpened,
    "Generator screw panel can be removed via real overlay clicks",
    summarizeState(generatorUnscrew)
  );

  const selectFuse = await step("34-select-fuse-by-digit", async () => {
    await pressKey("5", 180);
  });
  assertStep(
    selectFuse?.inventory?.selectedItemId === "fuse",
    "Fuse can be re-selected by keyboard digit before generator repair",
    summarizeState(selectFuse)
  );

  const fuseSeat = await step("35-seat-fuse-by-click", async () => {
    await clickOverlayHotspot(0);
    await advance(260);
  });
  assertStep(
    fuseSeat?.progress?.puzzleState?.generator?.fuseSeated,
    "Fuse can be seated in the generator from a real overlay click",
    summarizeState(fuseSeat)
  );

  const fuseClamp = await step("36-clamp-fuse-by-click", async () => {
    await clickOverlayHotspot(1);
    await advance(260);
  });
  assertStep(
    fuseClamp?.progress?.puzzleState?.generator?.fuseInstalled,
    "Fuse clamp can be locked from a real overlay click",
    summarizeState(fuseClamp)
  );

  const selectValveWheel = await step("37-select-valve-wheel-by-digit", async () => {
    await pressKey("4", 180);
  });
  assertStep(
    selectValveWheel?.inventory?.selectedItemId === "valveWheel",
    "Valve wheel can be re-selected by keyboard digit before final generator repair",
    summarizeState(selectValveWheel)
  );

  const mountValveWheel = await step("38-mount-valve-wheel-by-click", async () => {
    await clickOverlayHotspot(2);
    await advance(260);
  });
  assertStep(
    mountValveWheel?.progress?.puzzleState?.generator?.valveWheelMounted,
    "Valve wheel can be mounted from a real overlay click",
    summarizeState(mountValveWheel)
  );

  const turnValveWheel = await step("39-turn-valve-wheel-by-clicks", async () => {
    for (let index = 0; index < 3; index += 1) {
      await clickOverlayHotspot(2);
      await advance(180);
    }
    await advance(360);
  });
  assertStep(
    turnValveWheel?.progress?.puzzleState?.generator?.valveWheelInstalled
      && turnValveWheel?.progress?.endingUnlocked,
    "Generator can be fully restored from real overlay clicks and unlock the hatch",
    summarizeState(turnValveWheel)
  );

  const generatorClose = await step("40-close-generator-by-escape", async () => {
    await pressKey("Escape", 240);
  });
  assertStep(!generatorClose?.ui?.overlayActive, "Generator overlay closes by Escape", summarizeState(generatorClose));

  const hatchReach = await step("41-reach-hatch", async () => {
    await moveUntilDistanceAtMost("hatch", 120, "a", 18, 180);
  });
  assertStep(
    (hatchReach?.visibleInteractables?.find((item) => item.id === "hatch")?.distanceFromPlayer ?? Infinity) <= 120,
    "Player can walk close enough to click the service hatch by keyboard",
    summarizeState(hatchReach)
  );

  const hatchOpen = await step("42-open-hatch-by-click", async () => {
    await clickVisibleInteractable("hatch");
    await advance(420);
  });
  assertStep(
    hatchOpen?.ui?.overlayActive,
    "Service hatch overlay opens from a real screen click",
    summarizeState(hatchOpen)
  );

  const hatchRelease = await step("43-release-hatch-by-clicks", async () => {
    await clickOverlayHotspot(0);
    await advance(180);
    await clickOverlayHotspot(1);
    await advance(980);
  });
  assertStep(
    hatchRelease?.scene?.key === "service-preview",
    "Service hatch can be released from real overlay clicks and transition to service",
    summarizeState(hatchRelease)
  );

  const report = {
    ok: !errors.length && assertions.every((entry) => entry.ok),
    errors,
    assertions,
    routeReport,
    finalState: await getState(),
  };

  await saveJson("playability-report.json", report);
  await browser.close();

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
