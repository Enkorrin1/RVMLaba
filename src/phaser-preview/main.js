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

window.__LAST_KEEPER_PHASER_PREVIEW__?.destroy(true);
installPreviewDiagnostics();
window.__LAST_KEEPER_PHASER_PREVIEW__ = createPreviewGame();
