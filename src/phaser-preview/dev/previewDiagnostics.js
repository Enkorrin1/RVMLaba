import { interactables as wakeInteractables, ITEM_DEFINITIONS } from "../data/wakeData.js";
import {
  bayInteractables,
  lanternInteractables,
  northBayInteractables,
  pierInteractables,
  serviceInteractables,
  shoreInteractables,
  tunnelInteractables,
} from "../data/towerData.js";

const VALID_STAGES = new Set(["wake", "lantern", "shore", "service", "tunnel", "pier", "bay", "north-bay"]);

const INTERACTABLE_COLLECTIONS = [
  ["wake", wakeInteractables],
  ["lantern", lanternInteractables],
  ["shore", shoreInteractables],
  ["service", serviceInteractables],
  ["tunnel", tunnelInteractables],
  ["pier", pierInteractables],
  ["bay", bayInteractables],
  ["north-bay", northBayInteractables],
];

function validateInteractableCollections() {
  const issues = [];

  for (const [name, collection] of INTERACTABLE_COLLECTIONS) {
    const seen = new Set();

    for (const item of collection) {
      if (!item.id) {
        issues.push(`[${name}] interactable without id`);
        continue;
      }

      if (seen.has(item.id)) {
        issues.push(`[${name}] duplicate interactable id: ${item.id}`);
      }
      seen.add(item.id);

      if (!item.prompt || typeof item.prompt !== "string") {
        issues.push(`[${name}] interactable "${item.id}" is missing prompt text`);
      }

      if (item.width <= 0 || item.height <= 0) {
        issues.push(`[${name}] interactable "${item.id}" has invalid size`);
      }
    }
  }

  return issues;
}

function validateRuntimeSession(scene, session) {
  const issues = [];

  if (!session) {
    issues.push("missing preview session");
    return issues;
  }

  if (!VALID_STAGES.has(session.stage)) {
    issues.push(`invalid stage "${session.stage}"`);
  }

  if (session.selectedItemId && !session.inventory.includes(session.selectedItemId)) {
    issues.push(`selected item "${session.selectedItemId}" is not present in inventory`);
  }

  for (const itemId of session.inventory) {
    if (!ITEM_DEFINITIONS[itemId]) {
      issues.push(`unknown inventory item "${itemId}"`);
    }
  }

  const uniqueInventory = new Set(session.inventory);
  if (uniqueInventory.size !== session.inventory.length) {
    issues.push("inventory contains duplicate items");
  }

  if (session.puzzleState?.serviceConsole?.batteryInstalled && session.inventory.includes("battery")) {
    issues.push("battery is both installed in console and still present in inventory");
  }

  if (session.puzzleState?.generator?.fuseInstalled && session.inventory.includes("fuse")) {
    issues.push("fuse is both installed in generator and still present in inventory");
  }

  if (session.puzzleState?.generator?.valveWheelInstalled && session.inventory.includes("valveWheel")) {
    issues.push("valve wheel is both installed in generator and still present in inventory");
  }

  if (scene?.scene?.key && typeof scene.getStageLabel === "function") {
    const label = scene.getStageLabel();
    if (!label || typeof label !== "string") {
      issues.push(`scene "${scene.scene.key}" returned invalid stage label`);
    }
  }

  return issues;
}

function createDiagnosticsState() {
  return {
    staticIssues: validateInteractableCollections(),
    runtimeIssues: [],
    currentScene: null,
    run(scene, session) {
      this.currentScene = scene?.scene?.key ?? null;
      this.runtimeIssues = validateRuntimeSession(scene, session);
      return {
        scene: this.currentScene,
        staticIssues: [...this.staticIssues],
        runtimeIssues: [...this.runtimeIssues],
      };
    },
    getReport() {
      return {
        scene: this.currentScene,
        staticIssues: [...this.staticIssues],
        runtimeIssues: [...this.runtimeIssues],
      };
    },
  };
}

export function installPreviewDiagnostics() {
  const state = createDiagnosticsState();
  const host = typeof window !== "undefined" ? window : globalThis;
  host.__LAST_KEEPER_PREVIEW_DIAGNOSTICS__ = state;

  if (state.staticIssues.length) {
    console.warn("[preview-diagnostics] static issues found", state.staticIssues);
  }

  return state;
}

export function publishPreviewDiagnostics(scene, session) {
  const host = typeof window !== "undefined" ? window : globalThis;
  const diagnostics = host.__LAST_KEEPER_PREVIEW_DIAGNOSTICS__;
  if (!diagnostics || typeof diagnostics.run !== "function") {
    return;
  }

  const report = diagnostics.run(scene, session);
  if (report.runtimeIssues.length) {
    console.warn("[preview-diagnostics] runtime issues found", report);
  }
}
