import { WakeScene } from "./scenes/WakeScene.js";
import { LanternScene } from "./scenes/LanternScene.js";
import { ShoreScene } from "./scenes/ShoreScene.js";
import { ServiceScene } from "./scenes/ServiceScene.js";
import { TunnelScene } from "./scenes/TunnelScene.js";
import { PierScene } from "./scenes/PierScene.js";
import { BayScene } from "./scenes/BayScene.js";
import { installPreviewDiagnostics } from "./dev/previewDiagnostics.js";

const Phaser = window.Phaser;
const parent = document.getElementById("game");

if (!Phaser) {
  throw new Error("Phaser runtime was not loaded on the preview page.");
}

function resolveRenderType() {
  const probe = document.createElement("canvas");
  const supportsWebGL = Boolean(
    probe.getContext("webgl", { failIfMajorPerformanceCaveat: true })
    || probe.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: true })
  );

  return supportsWebGL ? Phaser.WEBGL : Phaser.CANVAS;
}

function createPreviewGame() {
  const width = parent?.clientWidth || window.innerWidth;
  const height = parent?.clientHeight || window.innerHeight;
  const resolution = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);

  return new Phaser.Game({
    type: resolveRenderType(),
    parent,
    width,
    height,
    resolution,
    backgroundColor: "#08121a",
    render: {
      antialias: true,
      roundPixels: true,
      powerPreference: "high-performance",
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      parent,
      width,
      height,
      autoRound: true,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 1800 },
        debug: false,
      },
    },
    scene: [WakeScene, LanternScene, ShoreScene, ServiceScene, TunnelScene, PierScene, BayScene],
  });
}

function getActivePreviewScene(game) {
  if (!game?.scene) {
    return null;
  }

  const activeScenes = game.scene.getScenes(true);
  return activeScenes.find((scene) => typeof scene.renderGameToTextState === "function") ?? null;
}

function nextAnimationFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

function installPreviewAutomation(game) {
  const host = window;

  host.render_game_to_text = () => {
    const scene = getActivePreviewScene(game);
    if (!scene) {
      return JSON.stringify({
        coordinateSystem: "origin at top-left; x increases right; y increases downward",
        scene: null,
        status: "preview scene is not ready yet",
      }, null, 2);
    }

    scene.syncHud?.();
    return JSON.stringify(scene.renderGameToTextState(), null, 2);
  };

  host.advanceTime = async (ms = 1000 / 60) => {
    const frames = Math.max(1, Math.round(ms / (1000 / 60)));

    for (let index = 0; index < frames; index += 1) {
      const scene = getActivePreviewScene(game);

      if (!scene?.events) {
        await nextAnimationFrame();
        continue;
      }

      await new Promise((resolve) => {
        let settled = false;

        const finish = () => {
          if (settled) {
            return;
          }
          settled = true;
          scene.events.off("postupdate", finish);
          scene.syncHud?.();
          resolve();
        };

        scene.events.once("postupdate", finish);

        // Fallback for moments when the scene is transitioning and no update fires quickly.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(finish);
        });
      });
    }
  };

  host.__LAST_KEEPER_PREVIEW_TEST_API__ = {
    getActiveSceneKey: () => getActivePreviewScene(game)?.scene?.key ?? null,
    getState: () => {
      const scene = getActivePreviewScene(game);
      return scene?.renderGameToTextState?.() ?? null;
    },
    advanceTime: host.advanceTime,
  };
}

window.__LAST_KEEPER_PHASER_PREVIEW__?.destroy(true);
installPreviewDiagnostics();
window.__LAST_KEEPER_PHASER_PREVIEW__ = createPreviewGame();
installPreviewAutomation(window.__LAST_KEEPER_PHASER_PREVIEW__);
