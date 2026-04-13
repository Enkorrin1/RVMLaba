import {
  getBayObjective,
  getLanternObjective,
  getPierObjective,
  getServiceObjective,
  getSurfaceObjective,
  getTunnelObjective,
} from "../data/progressionText.js";
import {
  bayInteractables,
  lanternInteractables,
  pierInteractables,
  serviceInteractables,
  shoreInteractables,
  tunnelInteractables,
} from "../data/towerData.js";
import {
  createWakeSession,
  getWakeObjective,
  interactables as wakeInteractables,
  ITEM_DEFINITIONS,
} from "../data/wakeData.js";
import { runPreviewMigrationAudit } from "./previewMigrationAudit.js";
import { createDefaultPreviewSession } from "../state/previewSession.js";

const collections = {
  wake: wakeInteractables,
  lantern: lanternInteractables,
  shore: shoreInteractables,
  service: serviceInteractables,
  tunnel: tunnelInteractables,
  pier: pierInteractables,
  bay: bayInteractables,
};

function cloneSession() {
  return structuredClone(createDefaultPreviewSession());
}

function runCheck(name, predicate) {
  try {
    const details = predicate();
    return {
      name,
      ok: true,
      details: details ?? "ok",
    };
  } catch (error) {
    return {
      name,
      ok: false,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function assertString(value, message) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }
}

function validateInventoryDefinitions() {
  for (const [itemId, definition] of Object.entries(ITEM_DEFINITIONS)) {
    assertString(definition.label, `item "${itemId}" is missing label`);
    assertString(definition.description, `item "${itemId}" is missing description`);
    if (definition.readable) {
      assertString(definition.documentTitle, `readable item "${itemId}" is missing documentTitle`);
      assertString(definition.documentText, `readable item "${itemId}" is missing documentText`);
    }
  }
  return `${Object.keys(ITEM_DEFINITIONS).length} inventory items validated`;
}

function validateInteractables() {
  for (const [stage, interactables] of Object.entries(collections)) {
    assertTruthy(interactables.length > 0, `[${stage}] has no interactables`);
    const ids = new Set();
    for (const item of interactables) {
      assertString(item.id, `[${stage}] interactable is missing id`);
      assertString(item.prompt, `[${stage}] interactable "${item.id}" is missing prompt`);
      assertTruthy(item.width > 0 && item.height > 0, `[${stage}] interactable "${item.id}" has invalid bounds`);
      if (ids.has(item.id)) {
        throw new Error(`[${stage}] duplicate interactable id "${item.id}"`);
      }
      ids.add(item.id);
    }
  }
  return `${Object.keys(collections).length} stage interactable sets validated`;
}

function validateWakeSessionFactory() {
  const wakeSession = createWakeSession();
  assertTruthy(Array.isArray(wakeSession.drawerItems), "wake session is missing drawerItems array");
  assertTruthy(Array.isArray(wakeSession.inventory), "wake session is missing inventory array");
  assertString(wakeSession.currentHint, "wake session is missing currentHint");
  return "wake session factory is healthy";
}

function validateObjectiveTexts() {
  const fresh = cloneSession();
  assertString(getWakeObjective(fresh), "wake objective missing on fresh session");
  assertString(getLanternObjective(fresh), "lantern objective missing on fresh session");
  assertString(getSurfaceObjective(fresh), "surface objective missing on fresh session");
  assertString(getServiceObjective(fresh), "service objective missing on fresh session");
  assertString(getTunnelObjective(fresh), "tunnel objective missing on fresh session");
  assertString(getPierObjective(fresh), "pier objective missing on fresh session");
  assertString(getBayObjective(fresh), "bay objective missing on fresh session");

  const progressed = cloneSession();
  progressed.wakeProgress.leavesMoved = true;
  progressed.wakeProgress.cluesChecked = true;
  progressed.lanternProgress.mechanismChecked = true;
  progressed.shoreProgress.radioChecked = true;
  progressed.puzzleState.toolbox.panelOpened = true;
  progressed.puzzleState.generator.panelOpened = true;
  progressed.inventory.push("fuse", "valveWheel", "battery", "serviceKey", "boatHook");
  progressed.serviceProgress.logbookRead = true;
  progressed.serviceProgress.consoleUsed = true;
  progressed.serviceProgress.doorChecked = true;
  progressed.puzzleState.serviceDoor.panelOpened = true;
  progressed.tunnelProgress.lockerOpened = true;
  progressed.tunnelProgress.signalFound = true;
  progressed.puzzleState.tunnelExit.unlocked = true;
  progressed.pierProgress.skiffChecked = true;
  progressed.pierProgress.ropeFound = true;
  progressed.puzzleState.seaGate.released = true;
  progressed.bayProgress.campSeen = true;
  progressed.bayProgress.cacheOpened = true;

  assertString(getWakeObjective(progressed), "wake objective missing on progressed session");
  assertString(getLanternObjective(progressed), "lantern objective missing on progressed session");
  assertString(getSurfaceObjective(progressed), "surface objective missing on progressed session");
  assertString(getServiceObjective(progressed), "service objective missing on progressed session");
  assertString(getTunnelObjective(progressed), "tunnel objective missing on progressed session");
  assertString(getPierObjective(progressed), "pier objective missing on progressed session");
  assertString(getBayObjective(progressed), "bay objective missing on progressed session");
  return "objective text getters are stable on fresh and progressed states";
}

function validateCriticalStateTransitions() {
  const session = cloneSession();
  assertTruthy("serviceHatch" in session.puzzleState, "service hatch state is missing");
  assertTruthy("fuseSeated" in session.puzzleState.generator, "generator state is missing fuseSeated");
  assertTruthy("valveWheelMounted" in session.puzzleState.generator, "generator state is missing valveWheelMounted");
  assertTruthy("valveWheelTurns" in session.puzzleState.generator, "generator state is missing valveWheelTurns");

  session.inventory.push("battery");
  session.selectedItemId = "battery";
  session.puzzleState.serviceConsole.batteryInstalled = true;
  session.inventory = session.inventory.filter((itemId) => itemId !== "battery");
  assertTruthy(!session.inventory.includes("battery"), "battery should be consumed after service console install");

  session.inventory.push("fuse", "valveWheel");
  session.selectedItemId = "fuse";
  session.puzzleState.generator.fuseSeated = true;
  session.puzzleState.generator.fuseInstalled = true;
  session.inventory = session.inventory.filter((itemId) => itemId !== "fuse");
  assertTruthy(!session.inventory.includes("fuse"), "fuse should be consumed after generator repair");

  session.selectedItemId = "valveWheel";
  session.puzzleState.generator.valveWheelMounted = true;
  session.puzzleState.generator.valveWheelTurns = 3;
  session.puzzleState.generator.valveWheelInstalled = true;
  session.inventory = session.inventory.filter((itemId) => itemId !== "valveWheel");
  session.endingUnlocked = true;
  assertTruthy(session.endingUnlocked, "endingUnlocked should become true when generator is assembled");

  session.puzzleState.serviceHatch.released = true;
  assertTruthy(session.puzzleState.serviceHatch.released, "service hatch should become available after upper route repair");

  session.inventory.push("serviceKey");
  session.puzzleState.tunnelExit.unlocked = true;
  session.inventory.push("boatHook");
  session.puzzleState.seaGate.released = true;

  assertTruthy(session.puzzleState.tunnelExit.unlocked, "tunnel exit should unlock");
  assertTruthy(session.puzzleState.seaGate.released, "sea gate should release");
  return "critical consumable and gate states transition cleanly";
}

function validatePreviewShell() {
  const html = readFileSync(resolve(process.cwd(), "phaser-preview.html"), "utf8");
  const roadmap = readFileSync(resolve(process.cwd(), "ROADMAP.md"), "utf8");

  const requiredNodes = [
    "previewStage",
    "previewObjective",
    "previewSelected",
    "previewInventory",
    "previewJournal",
    "previewLead",
    "previewHint",
    "previewControls",
  ];

  requiredNodes.forEach((nodeId) => {
    assertTruthy(html.includes(`id="${nodeId}"`), `preview shell is missing node "${nodeId}"`);
  });

  assertTruthy(roadmap.includes("Этап 8. Финальная миграция и QA"), "roadmap is missing final migration stage");
  assertTruthy(roadmap.includes("Статус: активный."), "roadmap current status was not updated");
  return "preview shell and roadmap reflect the upgraded UI flow";
}

function validateMigrationCoverage() {
  const report = runPreviewMigrationAudit();
  assertTruthy(report.ok, `migration audit gaps: ${JSON.stringify(report)}`);
  return "preview covers the core legacy route and critical interaction hooks";
}

export function runPreviewSelfCheck() {
  const checks = [
    runCheck("inventory definitions", validateInventoryDefinitions),
    runCheck("interactable collections", validateInteractables),
    runCheck("wake session factory", validateWakeSessionFactory),
    runCheck("objective text coverage", validateObjectiveTexts),
    runCheck("critical state transitions", validateCriticalStateTransitions),
    runCheck("preview shell readiness", validatePreviewShell),
    runCheck("migration coverage", validateMigrationCoverage),
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

export function installPreviewSelfCheck() {
  const host = typeof window !== "undefined" ? window : globalThis;
  host.__LAST_KEEPER_PREVIEW_SELF_CHECK__ = runPreviewSelfCheck;
  const report = runPreviewSelfCheck();
  host.__LAST_KEEPER_PREVIEW_SELF_CHECK_REPORT__ = report;
  if (!report.ok) {
    console.warn("[preview-self-check] issues found", report);
  }
  return report;
}
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
