import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve(process.argv[3] ?? "output/preview-route-check");

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
  };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ type: "console.error", text: msg.text() });
    }
  });
  page.on("pageerror", (error) => {
    errors.push({ type: "pageerror", text: String(error) });
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const routeReport = [];
  const assertions = [];

  async function snapshot(label) {
    const state = await page.evaluate(() => window.__LAST_KEEPER_PREVIEW_TEST_API__?.getState?.() ?? null);
    await saveJson(`${label}.json`, state);
    await page.screenshot({ path: path.join(outputDir, `${label}.png`) });
    routeReport.push({
      label,
      ...summarizeState(state),
    });
    return state;
  }

  async function waitForStateReady(timeoutMs = 5000) {
    await page.waitForFunction(
      () => window.__LAST_KEEPER_PREVIEW_TEST_API__?.getState?.()?.scene?.key,
      null,
      { timeout: timeoutMs }
    );
  }

  function assertStep(condition, message, details = {}) {
    assertions.push({ ok: Boolean(condition), message, details });
  }

  async function step(label, fn) {
    const result = await fn();
    const state = await snapshot(label);
    return { result, state };
  }

  await waitForStateReady();
  await snapshot("00-initial");

  const wakeDrawer = await step("01-open-wake-drawer", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1160, 561);
    await api.advanceTime(50);
    const result = api.interactById("clutter");
    await api.advanceTime(280);
    return result;
  }));
  assertStep(wakeDrawer.state?.ui?.overlayActive, "Wake drawer opens overlay", summarizeState(wakeDrawer.state));

  const batteryPickup = await step("02-take-battery", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    await api.advanceTime(50);
    return api.triggerOverlayHotspot(0);
  }));
  assertStep(
    batteryPickup.state?.inventory?.items?.some((item) => item.id === "battery"),
    "Battery is added to inventory",
    summarizeState(batteryPickup.state)
  );

  const wakeDrawerAgain = await step("03-open-drawer-again", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1160, 561);
    await api.advanceTime(50);
    return api.interactById("clutter");
  }));
  assertStep(wakeDrawerAgain.state?.ui?.overlayActive, "Wake drawer reopens after first pickup", summarizeState(wakeDrawerAgain.state));

  const notePickup = await step("04-take-note", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    await api.advanceTime(50);
    return api.triggerOverlayHotspot(0);
  }));
  assertStep(
    notePickup.state?.inventory?.items?.some((item) => item.id === "note"),
    "Note is added to inventory",
    summarizeState(notePickup.state)
  );

  const closeDrawer = await step("05-close-drawer", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(!closeDrawer.state?.ui?.overlayActive, "Drawer overlay closes cleanly", summarizeState(closeDrawer.state));

  const leafPileOpen = await step("06-open-leaf-pile", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1484, 561);
    await api.advanceTime(50);
    const result = api.interactById("leaf-pile", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(leafPileOpen.state?.ui?.overlayActive, "Leaf pile opens overlay", summarizeState(leafPileOpen.state));

  const leafPileSweep = await step("07-sweep-leaves", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const densePass = [
      { x: -220, y: -72 }, { x: -148, y: -72 }, { x: -76, y: -72 }, { x: 0, y: -72 }, { x: 76, y: -72 }, { x: 148, y: -72 }, { x: 220, y: -72 },
      { x: 220, y: -32 }, { x: 148, y: -32 }, { x: 76, y: -32 }, { x: 0, y: -32 }, { x: -76, y: -32 }, { x: -148, y: -32 }, { x: -220, y: -32 },
      { x: -220, y: 8 }, { x: -148, y: 8 }, { x: -76, y: 8 }, { x: 0, y: 8 }, { x: 76, y: 8 }, { x: 148, y: 8 }, { x: 220, y: 8 },
      { x: 220, y: 48 }, { x: 148, y: 48 }, { x: 76, y: 48 }, { x: 0, y: 48 }, { x: -76, y: 48 }, { x: -148, y: 48 }, { x: -220, y: 48 },
      { x: -220, y: 88 }, { x: -148, y: 88 }, { x: -76, y: 88 }, { x: 0, y: 88 }, { x: 76, y: 88 }, { x: 148, y: 88 }, { x: 220, y: 88 },
    ];

    let result = api.dragOverlayHotspot(0, densePass);
    await api.advanceTime(220);

    // A second pass makes the sweep deterministic when one leaf spawns at an edge.
    result = api.dragOverlayHotspot(0, densePass.slice().reverse());
    await api.advanceTime(260);
    return result;
  }));
  assertStep(leafPileSweep.state?.ui?.overlayActive, "Leaf pile remains open after sweep", summarizeState(leafPileSweep.state));

  const screwdriverPickup = await step("08-take-screwdriver", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    await api.advanceTime(80);
    const result = api.triggerOverlayHotspot(1);
    await api.advanceTime(220);
    return result;
  }));
  assertStep(
    screwdriverPickup.state?.inventory?.items?.some((item) => item.id === "screwdriver")
    && screwdriverPickup.state?.progress?.wake?.leavesMoved,
    "Screwdriver is recovered from leaf pile",
    summarizeState(screwdriverPickup.state)
  );

  const lanternTransition = await step("09-go-lantern", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1572, 561);
    await api.advanceTime(50);
    const result = api.interactById("tower-ladder", { force: true });
    await api.advanceTime(900);
    return result;
  }));
  assertStep(lanternTransition.state?.scene?.key === "lantern-preview", "Wake transitions to lantern", summarizeState(lanternTransition.state));

  const lampCheck = await step("10-check-lamp", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1388, 526);
    await api.advanceTime(50);
    const openResult = api.interactById("lamp-mechanism", { force: true });
    await api.advanceTime(200);
    const hotspotResult = api.triggerOverlayHotspot(0);
    await api.advanceTime(600);
    return { openResult, hotspotResult };
  }));
  assertStep(
    lampCheck.state?.progress?.lantern?.mechanismChecked,
    "Lantern mechanism check updates progress",
    summarizeState(lampCheck.state)
  );

  const returnWake = await step("11-return-wake", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(776, 526);
    await api.advanceTime(50);
    const result = api.interactById("lantern-ladder-down", { force: true });
    await api.advanceTime(900);
    return result;
  }));
  assertStep(returnWake.state?.scene?.key === "wake-preview", "Lantern returns to wake", summarizeState(returnWake.state));

  const shoreTransition = await step("12-go-shore", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1904, 561);
    await api.advanceTime(50);
    const result = api.interactById("room-door", { force: true });
    await api.advanceTime(900);
    return result;
  }));
  assertStep(shoreTransition.state?.scene?.key === "shore-preview", "Wake transitions to shore", summarizeState(shoreTransition.state));

  const radioCheck = await step("13-open-radio", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1584, 526);
    await api.advanceTime(50);
    const result = api.interactById("radio", { force: true });
    await api.advanceTime(260);
    return result;
  }));
  assertStep(radioCheck.state?.ui?.overlayActive, "Shore radio opens overlay", summarizeState(radioCheck.state));

  const radioClose = await step("14-close-radio", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(150);
    return result;
  }));
  assertStep(!radioClose.state?.ui?.overlayActive, "Shore radio overlay closes cleanly", summarizeState(radioClose.state));

  const valvePickup = await step("15-pick-valve-wheel", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(2172, 526);
    await api.advanceTime(50);
    const result = api.interactById("valve-wheel", { force: true });
    await api.advanceTime(200);
    return result;
  }));
  assertStep(
    valvePickup.state?.inventory?.items?.some((item) => item.id === "valveWheel"),
    "Valve wheel is added to inventory on shore",
    summarizeState(valvePickup.state)
  );

  const toolboxPanelOpen = await step("16-open-toolbox-panel", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.selectInventoryItem("screwdriver");
    api.movePlayerTo(1330, 561);
    await api.advanceTime(50);
    const result = api.interactById("toolbox", { force: true });
    await api.advanceTime(300);
    return result;
  }));
  assertStep(toolboxPanelOpen.state?.ui?.overlayActive, "Toolbox screw panel opens", summarizeState(toolboxPanelOpen.state));

  const toolboxUnscrew = await step("17-unscrew-toolbox-panel", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    for (const hotspotIndex of [0, 1, 2, 3]) {
      api.triggerOverlayHotspot(hotspotIndex);
      await api.advanceTime(120);
    }
    await api.advanceTime(520);
    return { ok: true };
  }));
  assertStep(toolboxUnscrew.state?.ui?.overlayActive, "Toolbox contents open after unscrewing", summarizeState(toolboxUnscrew.state));

  const fusePickup = await step("18-take-fuse", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.triggerOverlayHotspot(0);
    await api.advanceTime(220);
    return result;
  }));
  assertStep(
    fusePickup.state?.inventory?.items?.some((item) => item.id === "fuse"),
    "Fuse is added to inventory",
    summarizeState(fusePickup.state)
  );

  const toolboxClose = await step("19-close-toolbox", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(!toolboxClose.state?.ui?.overlayActive, "Toolbox overlay closes cleanly", summarizeState(toolboxClose.state));

  const generatorPanelOpen = await step("20-open-generator-panel", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.selectInventoryItem("screwdriver");
    api.movePlayerTo(2780, 561);
    await api.advanceTime(50);
    const result = api.interactById("generator", { force: true });
    await api.advanceTime(320);
    return result;
  }));
  assertStep(generatorPanelOpen.state?.ui?.overlayActive, "Generator screw panel opens", summarizeState(generatorPanelOpen.state));

  const generatorUnscrew = await step("21-unscrew-generator-panel", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    for (const hotspotIndex of [0, 1, 2, 3]) {
      api.triggerOverlayHotspot(hotspotIndex);
      await api.advanceTime(120);
    }
    await api.advanceTime(560);
    return { ok: true };
  }));
  assertStep(generatorUnscrew.state?.ui?.overlayActive, "Generator repair overlay opens", summarizeState(generatorUnscrew.state));

  const generatorInstallFuse = await step("22-install-fuse", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.selectInventoryItem("fuse");
    api.triggerOverlayHotspot(0);
    await api.advanceTime(160);
    api.triggerOverlayHotspot(1);
    await api.advanceTime(240);
    return { ok: true };
  }));
  assertStep(
    generatorInstallFuse.state?.progress?.puzzleState?.generator?.fuseInstalled,
    "Fuse is seated and clamped in generator",
    summarizeState(generatorInstallFuse.state)
  );

  const generatorInstallValve = await step("23-install-valve-wheel", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.selectInventoryItem("valveWheel");
    api.triggerOverlayHotspot(2);
    await api.advanceTime(160);
    api.triggerOverlayHotspot(2);
    await api.advanceTime(120);
    api.triggerOverlayHotspot(2);
    await api.advanceTime(120);
    api.triggerOverlayHotspot(2);
    await api.advanceTime(360);
    return { ok: true };
  }));
  assertStep(
    generatorInstallValve.state?.progress?.puzzleState?.generator?.valveWheelInstalled
    && generatorInstallValve.state?.progress?.endingUnlocked,
    "Valve wheel repair completes generator and unlocks hatch",
    summarizeState(generatorInstallValve.state)
  );

  const generatorClose = await step("24-close-generator", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(!generatorClose.state?.ui?.overlayActive, "Generator overlay closes cleanly", summarizeState(generatorClose.state));

  const hatchOpen = await step("25-open-service-hatch", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1178, 561);
    await api.advanceTime(50);
    const result = api.interactById("hatch", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(hatchOpen.state?.ui?.overlayActive, "Service hatch overlay opens", summarizeState(hatchOpen.state));

  const hatchRelease = await step("26-release-hatch", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.triggerOverlayHotspot(0);
    await api.advanceTime(140);
    api.triggerOverlayHotspot(1);
    await api.advanceTime(900);
    return { ok: true };
  }));
  assertStep(
    hatchRelease.state?.scene?.key === "service-preview",
    "Released hatch transitions to service level",
    summarizeState(hatchRelease.state)
  );

  const logbookPickup = await step("27-pick-logbook", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(962, 561);
    await api.advanceTime(50);
    const result = api.interactById("logbook", { force: true });
    await api.advanceTime(180);
    return result;
  }));
  assertStep(
    logbookPickup.state?.inventory?.items?.some((item) => item.id === "logbook")
    && logbookPickup.state?.progress?.service?.logbookRead,
    "Logbook is collected on service level",
    summarizeState(logbookPickup.state)
  );

  const consoleBatteryOpen = await step("28-open-console-battery", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.selectInventoryItem("battery");
    api.movePlayerTo(1408, 561);
    await api.advanceTime(50);
    const result = api.interactById("service-console", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(consoleBatteryOpen.state?.ui?.overlayActive, "Service console battery overlay opens", summarizeState(consoleBatteryOpen.state));

  const consoleBatteryInstall = await step("29-install-console-battery", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.triggerOverlayHotspot(0);
    await api.advanceTime(120);
    api.triggerOverlayHotspot(1);
    await api.advanceTime(180);
    api.triggerOverlayHotspot(2);
    await api.advanceTime(760);
    return { ok: true };
  }));
  assertStep(
    consoleBatteryInstall.state?.progress?.puzzleState?.serviceConsole?.batteryInstalled,
    "Battery is installed in service console",
    summarizeState(consoleBatteryInstall.state)
  );

  const consoleStatusOpen = await step("30-open-console-status", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1408, 561);
    await api.advanceTime(50);
    const result = api.interactById("service-console", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(
    consoleStatusOpen.state?.ui?.overlayActive
    && consoleStatusOpen.state?.progress?.service?.consoleUsed,
    "Service console status overlay opens and marks console used",
    summarizeState(consoleStatusOpen.state)
  );

  const consoleStatusClose = await step("31-close-console-status", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(!consoleStatusClose.state?.ui?.overlayActive, "Service console overlay closes cleanly", summarizeState(consoleStatusClose.state));

  const sealedDoorPanel = await step("32-open-sealed-door-panel", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.selectInventoryItem("screwdriver");
    api.movePlayerTo(1688, 561);
    await api.advanceTime(50);
    const result = api.interactById("sealed-door", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(sealedDoorPanel.state?.ui?.overlayActive, "Sealed door screw panel opens", summarizeState(sealedDoorPanel.state));

  const sealedDoorUnscrew = await step("33-unscrew-sealed-door-panel", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    for (const hotspotIndex of [0, 1, 2, 3]) {
      api.triggerOverlayHotspot(hotspotIndex);
      await api.advanceTime(120);
    }
    await api.advanceTime(520);
    return { ok: true };
  }));
  assertStep(
    sealedDoorUnscrew.state?.progress?.puzzleState?.serviceDoor?.panelOpened,
    "Sealed door panel is removed",
    summarizeState(sealedDoorUnscrew.state)
  );

  const serviceToTunnel = await step("34-enter-tunnel", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1688, 561);
    await api.advanceTime(50);
    const result = api.interactById("sealed-door", { force: true });
    await api.advanceTime(900);
    return result;
  }));
  assertStep(serviceToTunnel.state?.scene?.key === "tunnel-preview", "Service transitions to tunnel", summarizeState(serviceToTunnel.state));

  const lockerOpen = await step("35-open-locker", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1012, 561);
    await api.advanceTime(50);
    const result = api.interactById("locker", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(lockerOpen.state?.ui?.overlayActive, "Tunnel locker overlay opens", summarizeState(lockerOpen.state));

  const serviceKeyPickup = await step("36-take-service-key", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.triggerOverlayHotspot(0);
    await api.advanceTime(220);
    return result;
  }));
  assertStep(
    serviceKeyPickup.state?.inventory?.items?.some((item) => item.id === "serviceKey"),
    "Service key is collected from locker",
    summarizeState(serviceKeyPickup.state)
  );

  const lockerClose = await step("37-close-locker", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(!lockerClose.state?.ui?.overlayActive, "Locker overlay closes cleanly", summarizeState(lockerClose.state));

  const signalOpen = await step("38-open-signal", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1460, 561);
    await api.advanceTime(50);
    const result = api.interactById("signal", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(signalOpen.state?.ui?.overlayActive, "Tunnel signal overlay opens", summarizeState(signalOpen.state));

  const signalTune = await step("39-tune-signal", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.triggerOverlayHotspot(0);
    await api.advanceTime(220);
    return result;
  }));
  assertStep(
    signalTune.state?.progress?.tunnel?.signalFound,
    "Tunnel signal is resolved",
    summarizeState(signalTune.state)
  );

  const signalClose = await step("40-close-signal", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(!signalClose.state?.ui?.overlayActive, "Signal overlay closes cleanly", summarizeState(signalClose.state));

  const tunnelExitUnlock = await step("41-open-tunnel-exit-lock", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.selectInventoryItem("serviceKey");
    api.movePlayerTo(1726, 561);
    await api.advanceTime(50);
    const result = api.interactById("tunnel-exit", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(tunnelExitUnlock.state?.ui?.overlayActive, "Tunnel exit lock overlay opens", summarizeState(tunnelExitUnlock.state));

  const tunnelExitUnlockSolve = await step("42-unlock-tunnel-exit", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.triggerOverlayHotspot(0);
    await api.advanceTime(120);
    api.triggerOverlayHotspot(1);
    await api.advanceTime(160);
    api.triggerOverlayHotspot(2);
    await api.advanceTime(760);
    return { ok: true };
  }));
  assertStep(
    tunnelExitUnlockSolve.state?.progress?.puzzleState?.tunnelExit?.unlocked,
    "Tunnel exit is unlocked with service key",
    summarizeState(tunnelExitUnlockSolve.state)
  );

  const tunnelToPier = await step("43-enter-pier", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1726, 561);
    await api.advanceTime(50);
    const result = api.interactById("tunnel-exit", { force: true });
    await api.advanceTime(900);
    return result;
  }));
  assertStep(tunnelToPier.state?.scene?.key === "pier-preview", "Tunnel transitions to pier", summarizeState(tunnelToPier.state));

  const skiffOpen = await step("44-open-skiff", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1000, 561);
    await api.advanceTime(50);
    const result = api.interactById("skiff", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(skiffOpen.state?.ui?.overlayActive, "Skiff overlay opens", summarizeState(skiffOpen.state));

  const boatHookPickup = await step("45-take-boat-hook", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.triggerOverlayHotspot(0);
    await api.advanceTime(220);
    return result;
  }));
  assertStep(
    boatHookPickup.state?.inventory?.items?.some((item) => item.id === "boatHook"),
    "Boat hook is collected from skiff",
    summarizeState(boatHookPickup.state)
  );

  const skiffClose = await step("46-close-skiff", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(!skiffClose.state?.ui?.overlayActive, "Skiff overlay closes cleanly", summarizeState(skiffClose.state));

  const winchOpen = await step("47-open-winch", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1360, 561);
    await api.advanceTime(50);
    const result = api.interactById("rope-winch", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(winchOpen.state?.ui?.overlayActive, "Winch overlay opens", summarizeState(winchOpen.state));

  const winchClose = await step("48-close-winch", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(
    !winchClose.state?.ui?.overlayActive && winchClose.state?.progress?.pier?.ropeFound,
    "Winch inspection marks rope clue and closes cleanly",
    summarizeState(winchClose.state)
  );

  const seaGateOpen = await step("49-open-sea-gate", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.selectInventoryItem("boatHook");
    api.movePlayerTo(1724, 561);
    await api.advanceTime(50);
    const result = api.interactById("sea-gate", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(seaGateOpen.state?.ui?.overlayActive, "Sea gate overlay opens", summarizeState(seaGateOpen.state));

  const seaGateRelease = await step("50-release-sea-gate", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.triggerOverlayHotspot(0);
    await api.advanceTime(120);
    api.triggerOverlayHotspot(1);
    await api.advanceTime(160);
    api.triggerOverlayHotspot(2);
    await api.advanceTime(760);
    return { ok: true };
  }));
  assertStep(
    seaGateRelease.state?.progress?.puzzleState?.seaGate?.released,
    "Sea gate latch is released with boat hook",
    summarizeState(seaGateRelease.state)
  );

  const pierToBay = await step("51-enter-bay", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1724, 561);
    await api.advanceTime(50);
    const result = api.interactById("sea-gate", { force: true });
    await api.advanceTime(900);
    return result;
  }));
  assertStep(pierToBay.state?.scene?.key === "bay-preview", "Pier transitions to bay", summarizeState(pierToBay.state));

  const campfireOpen = await step("52-open-campfire", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1048, 561);
    await api.advanceTime(50);
    const result = api.interactById("campfire", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(campfireOpen.state?.ui?.overlayActive, "Campfire overlay opens", summarizeState(campfireOpen.state));

  const campfireClose = await step("53-close-campfire", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(
    !campfireClose.state?.ui?.overlayActive && campfireClose.state?.progress?.bay?.campSeen,
    "Campfire clue is recorded",
    summarizeState(campfireClose.state)
  );

  const cacheOpen = await step("54-open-cache", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1288, 561);
    await api.advanceTime(50);
    const result = api.interactById("cache", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(cacheOpen.state?.ui?.overlayActive, "Cache overlay opens", summarizeState(cacheOpen.state));

  const cacheClose = await step("55-close-cache", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    const result = api.closeOverlay();
    await api.advanceTime(180);
    return result;
  }));
  assertStep(
    !cacheClose.state?.ui?.overlayActive && cacheClose.state?.progress?.bay?.cacheOpened,
    "Cache clue is recorded",
    summarizeState(cacheClose.state)
  );

  const footprintsOpen = await step("56-open-footprints", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    api.movePlayerTo(1603, 561);
    await api.advanceTime(50);
    const result = api.interactById("footprints", { force: true });
    await api.advanceTime(280);
    return result;
  }));
  assertStep(footprintsOpen.state?.ui?.overlayActive, "Bay footprint analysis opens", summarizeState(footprintsOpen.state));

  const footprintsInspect = await step("57-inspect-footprints", () => page.evaluate(async () => {
    const api = window.__LAST_KEEPER_PREVIEW_TEST_API__;
    for (const hotspotIndex of [0, 1, 2]) {
      api.triggerOverlayHotspot(hotspotIndex);
      await api.advanceTime(160);
    }
    await api.advanceTime(260);
    return { ok: true };
  }));
  assertStep(
    footprintsInspect.state?.progress?.bay?.campSeen && footprintsInspect.state?.progress?.bay?.cacheOpened,
    "Bay footprint clues complete after inspecting all markers",
    summarizeState(footprintsInspect.state)
  );

  const finalState = await page.evaluate(() => window.__LAST_KEEPER_PREVIEW_TEST_API__?.getState?.() ?? null);
  const report = {
    ok: !errors.length && assertions.every((entry) => entry.ok),
    errors,
    assertions,
    routeReport,
    finalState,
  };

  await saveJson("route-report.json", report);
  await browser.close();

  if (errors.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
