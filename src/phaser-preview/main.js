import { WakeScene } from "./scenes/WakeScene.js";
import { LanternScene } from "./scenes/LanternScene.js";
import { ShoreScene } from "./scenes/ShoreScene.js";
import { ServiceScene } from "./scenes/ServiceScene.js";
import { TunnelScene } from "./scenes/TunnelScene.js";
import { PierScene } from "./scenes/PierScene.js";
import { BayScene } from "./scenes/BayScene.js";
import { installPreviewDiagnostics } from "./dev/previewDiagnostics.js";
import { resetPreviewSession } from "./state/previewSession.js";

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

  const getScene = () => getActivePreviewScene(game);

  host.render_game_to_text = () => {
    const scene = getScene();
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

  const interactById = (interactableId, { force = false } = {}) => {
    const scene = getScene();
    if (!scene?.sceneInteractionHandler) {
      return { ok: false, reason: "scene interaction handler is unavailable" };
    }

    const target = scene.sceneInteractables?.find((item) => item.id === interactableId);
    if (!target) {
      return { ok: false, reason: `interactable "${interactableId}" was not found` };
    }

    if (!force && !scene.canReachInteractable(target, scene.sceneInteractionRange)) {
      return { ok: false, reason: `interactable "${interactableId}" is out of range` };
    }

    scene.sceneInteractionHandler(target);
    scene.syncHud?.();
    return { ok: true, scene: scene.scene.key, interactableId };
  };

  const buildSyntheticPointer = (scene, x, y, isDown = false) => ({
    x,
    y,
    worldX: x,
    worldY: y,
    isDown,
    leftButtonDown: () => isDown,
    rightButtonDown: () => false,
    middleButtonDown: () => false,
  });

  const getOverlayHotspot = (scene, index) => scene?.overlayHotspots?.[index] ?? null;

  const getOverlayPointerPosition = (hotspot, offsetX = 0, offsetY = 0) => ({
    x: hotspot.x + offsetX,
    y: hotspot.y + offsetY,
  });

  const triggerOverlayHotspot = (index = 0, { offsetX = 0, offsetY = 0 } = {}) => {
    const scene = getScene();
    const hotspot = getOverlayHotspot(scene, index);
    if (!scene || !hotspot) {
      return { ok: false, reason: `overlay hotspot "${index}" is unavailable` };
    }

    const position = getOverlayPointerPosition(hotspot, offsetX, offsetY);
    const pointer = buildSyntheticPointer(scene, position.x, position.y, true);
    hotspot.handlers?.pointerdown?.(pointer, hotspot);
    scene.syncHud?.();
    return { ok: true, scene: scene.scene.key, hotspotIndex: index, position };
  };

  const dragOverlayHotspot = (index = 0, path = []) => {
    const scene = getScene();
    const hotspot = getOverlayHotspot(scene, index);
    if (!scene || !hotspot) {
      return { ok: false, reason: `overlay hotspot "${index}" is unavailable` };
    }

    const points = Array.isArray(path) && path.length
      ? path
      : [{ x: 0, y: 0 }];

    points.forEach((point, pointIndex) => {
      const position = getOverlayPointerPosition(hotspot, point.x ?? 0, point.y ?? 0);
      const pointer = buildSyntheticPointer(scene, position.x, position.y, true);

      if (pointIndex === 0) {
        hotspot.handlers?.pointerdown?.(pointer, hotspot);
      }

      hotspot.handlers?.pointermove?.(pointer, hotspot);
    });

    scene.syncHud?.();
    return { ok: true, scene: scene.scene.key, hotspotIndex: index, points: points.length };
  };

  const movePlayerTo = (x, y) => {
    const scene = getScene();
    if (!scene?.playerBody) {
      return { ok: false, reason: "player body is unavailable" };
    }

    scene.playerBody.setPosition(x, y);
    scene.playerBody.body?.setVelocity?.(0, 0);
    scene.syncHud?.();
    return { ok: true, scene: scene.scene.key, player: { x, y } };
  };

  const closeOverlay = () => {
    const scene = getScene();
    if (!scene?.closeOverlay) {
      return { ok: false, reason: "closeOverlay is unavailable" };
    }

    scene.closeOverlay();
    scene.syncHud?.();
    return { ok: true, scene: scene.scene.key };
  };

  const selectInventoryItem = (itemId) => {
    const scene = getScene();
    if (!scene?.session?.inventory?.includes(itemId)) {
      return { ok: false, reason: `inventory item "${itemId}" is unavailable` };
    }

    scene.session.selectedItemId = itemId;
    scene.refreshInventoryBar?.();
    scene.syncHud?.();
    return { ok: true, scene: scene.scene.key, itemId };
  };

  const resetPreview = () => {
    resetPreviewSession();
    game.scene.getScenes(true).forEach((scene) => scene.scene.restart?.());
    return { ok: true };
  };

  host.__LAST_KEEPER_PREVIEW_TEST_API__ = {
    getActiveSceneKey: () => getScene()?.scene?.key ?? null,
    getState: () => {
      const scene = getScene();
      return scene?.renderGameToTextState?.() ?? null;
    },
    advanceTime: host.advanceTime,
    interactById,
    triggerOverlayHotspot,
    dragOverlayHotspot,
    movePlayerTo,
    closeOverlay,
    selectInventoryItem,
    resetPreview,
    listOverlayHotspots: () => {
      const scene = getScene();
      return (scene?.overlayHotspots ?? []).map((hotspot, index) => ({
        index,
        x: Math.round(hotspot.x),
        y: Math.round(hotspot.y),
        width: Math.round(hotspot.width),
        height: Math.round(hotspot.height),
      }));
    },
  };
}

window.__LAST_KEEPER_PHASER_PREVIEW__?.destroy(true);
installPreviewDiagnostics();
window.__LAST_KEEPER_PHASER_PREVIEW__ = createPreviewGame();
installPreviewAutomation(window.__LAST_KEEPER_PHASER_PREVIEW__);
