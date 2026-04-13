import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_LEGACY_TOKENS = [
  "battery",
  "fuse",
  "note",
  "logbook",
  "valveWheel",
  "screwdriver",
  "serviceKey",
  "boatHook",
  "\"wake\"",
  "\"shore\"",
  "\"lantern\"",
  "\"service\"",
  "\"tunnel\"",
  "\"pier\"",
  "\"bay\"",
];

const REQUIRED_PREVIEW_FILES = [
  "src/phaser-preview/scenes/PreviewSceneBase.js",
  "src/phaser-preview/scenes/WakeScene.js",
  "src/phaser-preview/scenes/LanternScene.js",
  "src/phaser-preview/scenes/ShoreScene.js",
  "src/phaser-preview/scenes/ServiceScene.js",
  "src/phaser-preview/scenes/TunnelScene.js",
  "src/phaser-preview/scenes/PierScene.js",
  "src/phaser-preview/scenes/BayScene.js",
];

const REQUIRED_PREVIEW_TOKENS = [
  "openLeafInspectionOverlay",
  "openDrawerOverlay",
  "openGeneratorRepairOverlay",
  "openConsoleBatteryOverlay",
  "openExitUnlockOverlay",
  "openSeaGateOverlay",
  "openJournalOverlay",
];

function readProjectFile(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

export function runPreviewMigrationAudit() {
  const legacySource = readProjectFile("src/main.js");
  const indexSource = readProjectFile("index.html");
  const bootSource = readProjectFile("src/boot.js");
  const previewSources = REQUIRED_PREVIEW_FILES.map((path) => readProjectFile(path)).join("\n");

  const missingLegacyTokens = REQUIRED_LEGACY_TOKENS.filter((token) => !legacySource.includes(token));
  const missingPreviewFiles = REQUIRED_PREVIEW_FILES.filter((path) => {
    try {
      readProjectFile(path);
      return false;
    } catch {
      return true;
    }
  });
  const missingPreviewTokens = REQUIRED_PREVIEW_TOKENS.filter((token) => !previewSources.includes(token));

  const routerReady = indexSource.includes("./src/boot.js")
    && bootSource.includes("phaser-preview")
    && bootSource.includes("legacy");

  return {
    ok: missingLegacyTokens.length === 0
      && missingPreviewFiles.length === 0
      && missingPreviewTokens.length === 0
      && routerReady,
    missingLegacyTokens,
    missingPreviewFiles,
    missingPreviewTokens,
    routerReady,
  };
}

export function installPreviewMigrationAudit() {
  const host = typeof window !== "undefined" ? window : globalThis;
  const report = runPreviewMigrationAudit();
  host.__LAST_KEEPER_PREVIEW_MIGRATION_AUDIT__ = report;
  if (!report.ok) {
    console.warn("[preview-migration-audit] gaps found", report);
  }
  return report;
}
