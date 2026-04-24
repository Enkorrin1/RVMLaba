import {
  INTERACTION_RANGE,
  INVENTORY_SLOT_COUNT,
  ITEM_DEFINITIONS,
  PLAYER_JUMP_SPEED,
  PLAYER_SPEED,
} from "../data/wakeData.js";
import { createItemIcon } from "../render/wakeArt.js";
import { publishPreviewDiagnostics } from "../dev/previewDiagnostics.js";
import {
  playPreviewUiTick,
  playPreviewWorldCue,
  resumePreviewAudio,
  syncPreviewAmbience,
} from "../audio/previewAudio.js";

const Phaser = window.Phaser;
const INVENTORY_BAR_BOTTOM_OFFSET = 74;

export class PreviewSceneBase extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.session = null;
    this.inventorySlots = [];
    this.interactionZones = [];
    this.sceneInteractables = [];
    this.sceneInteractionRange = INTERACTION_RANGE;
    this.sceneInteractionHandler = null;
    this.hoveredInteractable = null;
    this.overlayKind = null;
    this.overlayHotspots = [];
    this.overlayActive = false;
    this.sceneTransitionActive = false;
    this.textFactoryInitialized = false;
    this.pointerRoutingBound = false;
    this.debugHitboxesEnabled = false;
    this.hoveredOverlayHotspot = null;
    this.cameraBeatActive = false;
    this.sceneIntroActive = false;
    this.selectedItemCaption = null;
    this.inventoryMetaText = null;
    this.windowKeyHandler = null;
    this.resizeHandler = null;
    this.pointerMoveHandler = null;
    this.pointerDownHandler = null;
  }

  resetTransientSceneState() {
    this.hoveredInteractable = null;
    this.hoveredOverlayHotspot = null;
    this.overlayKind = null;
    this.overlayActive = false;
    this.sceneTransitionActive = false;
    this.cameraBeatActive = false;
    this.clearOverlayHotspots();

    if (this.messagePanel) {
      this.messagePanel.setVisible(false);
    }

    if (this.dialogueBubble) {
      this.dialogueBubble.setVisible(false);
    }

    if (this.promptContainer) {
      this.promptContainer.setVisible(false);
    }

    if (this.focusMarker) {
      this.focusMarker.setVisible(false);
    }

    if (this.overlayBackdrop) {
      this.overlayBackdrop.setVisible(false).setAlpha(0);
    }

    if (this.overlayCard) {
      this.overlayCard.setVisible(false).setAlpha(0).setScale(1).setY(this.scale.height * 0.5);
    }

    if (this.overlayTitle) {
      this.overlayTitle.setVisible(false).setAlpha(0).setY(this.scale.height * 0.5 - 220);
    }

    if (this.overlayText) {
      this.overlayText.setVisible(false).setAlpha(0).setY(this.scale.height * 0.5 - 176);
    }

    if (this.overlayHint) {
      this.overlayHint.setVisible(false).setAlpha(0).setY(this.scale.height * 0.5 + 216);
    }

    if (this.overlayContent) {
      this.overlayContent.setVisible(false).setAlpha(0).setScale(1).setY(this.scale.height * 0.5 + 18);
      this.overlayContent.removeAll(true);
    }

    if (this.transitionShade) {
      this.transitionShade.setVisible(false).setAlpha(0);
    }

    if (this.transitionAccent) {
      this.transitionAccent.setVisible(false).setAlpha(0).setScale(1, 1);
    }

    if (this.transitionTitle) {
      this.transitionTitle.setVisible(false).setAlpha(0);
    }

    if (this.transitionText) {
      this.transitionText.setVisible(false).setAlpha(0);
    }

    this.sceneIntroActive = false;
    this.restoreWorldCameraFollow();
  }

  teardownSceneBindings() {
    if (this.pointerMoveHandler) {
      this.input?.off?.("pointermove", this.pointerMoveHandler);
      this.pointerMoveHandler = null;
    }

    if (this.pointerDownHandler) {
      this.input?.off?.("pointerdown", this.pointerDownHandler);
      this.pointerDownHandler = null;
    }

    if (this.windowKeyHandler) {
      window.removeEventListener("keydown", this.windowKeyHandler);
      this.windowKeyHandler = null;
    }

    if (this.resizeHandler) {
      this.scale?.off?.("resize", this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.keys) {
      Object.values(this.keys).forEach((key) => key?.removeAllListeners?.());
    }

    this.input?.setDefaultCursor?.("default");
    this.pointerRoutingBound = false;
  }

  initializeSharpTextFactory() {
    if (this.textFactoryInitialized) {
      return;
    }

    this.textFactoryInitialized = true;
    const originalAddText = this.add.text.bind(this.add);
    const textResolution = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);

    this.add.text = (x, y, text, style = {}) => {
      const nextStyle = { ...style };
      if (style.wordWrap) {
        nextStyle.wordWrap = { ...style.wordWrap };
      }
      if (style.padding) {
        nextStyle.padding = { ...style.padding };
      }
      if (!nextStyle.fontFamily || nextStyle.fontFamily === "Georgia, serif") {
        nextStyle.fontFamily = '"Cambria", "Constantia", "Palatino Linotype", Georgia, serif';
      }

      const textObject = originalAddText(x, y, text, nextStyle);
      if (typeof textObject.setResolution === "function") {
        textObject.setResolution(textResolution);
      }

      // A subtle stroke makes small serif text read cleaner once the canvas is downsampled.
      if (!nextStyle.stroke && !nextStyle.shadow) {
        textObject.setStroke("#071019", 1);
      }

      return textObject;
    };
  }

  initializeUiCamera() {
    const cameras = this.cameras?.cameras ?? [];
    const uiCameraStillRegistered = this.uiCamera && cameras.includes(this.uiCamera);
    if (uiCameraStillRegistered) {
      return;
    }

    this.uiCamera = null;

    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, `${this.scene.key}-ui`);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);

    const worldObjects = this.children.list.slice();
    if (worldObjects.length) {
      this.uiCamera.ignore(worldObjects);
    }
  }

  registerUiObjects(objects) {
    if (!objects) {
      return;
    }

    const entries = Array.isArray(objects) ? objects : [objects];
    this.cameras.main.ignore(entries);
  }

  configureWorldCamera(boundsX, boundsY, boundsWidth, boundsHeight, deadzoneX = 160, deadzoneY = 90) {
    const camera = this.cameras.main;
    camera.setBounds(boundsX, boundsY, boundsWidth, boundsHeight);
    camera.startFollow(this.playerBody, true, 0.12, 0.12);
    camera.setDeadzone(deadzoneX, deadzoneY);
    camera.setZoom(1);
    camera.roundPixels = true;
    this.defaultCameraLerp = { x: 0.12, y: 0.12 };
    this.defaultCameraDeadzone = { x: deadzoneX, y: deadzoneY };
  }

  restoreWorldCameraFollow() {
    const camera = this.cameras?.main;
    if (!camera || !this.playerBody) {
      return;
    }

    camera.stopFollow();
    camera.setZoom(1);
    camera.roundPixels = true;
    camera.setDeadzone(this.defaultCameraDeadzone?.x ?? 160, this.defaultCameraDeadzone?.y ?? 90);
    camera.startFollow(
      this.playerBody,
      true,
      this.defaultCameraLerp?.x ?? 0.12,
      this.defaultCameraLerp?.y ?? 0.12,
    );
    this.cameraBeatActive = false;
  }

  emitWorldPulse(x, y, {
    color = 0xe1bb73,
    radius = 26,
    scale = 3.1,
    duration = 720,
    depth = 30,
  } = {}) {
    playPreviewWorldCue(color === 0xe1bb73 ? "generator" : "pulse");
    const pulse = this.add.circle(x, y, radius, color, 0).setStrokeStyle(4, color, 0.92).setDepth(depth);
    this.tweens.add({
      targets: pulse,
      scaleX: scale,
      scaleY: scale,
      alpha: 0,
      duration,
      ease: "quad.out",
      onComplete: () => pulse.destroy(),
    });
    return pulse;
  }

  playFocusBeat({
    x,
    y,
    zoom = 1.08,
    duration = 180,
    hold = 80,
    returnDuration = 220,
    shake = 0,
    onPeak,
    onComplete,
  }) {
    const camera = this.cameras?.main;
    if (!camera || this.cameraBeatActive || this.sceneTransitionActive) {
      onPeak?.();
      onComplete?.();
      return;
    }

    this.cameraBeatActive = true;
    const currentZoom = camera.zoom;
    camera.stopFollow();
    if (shake > 0) {
      camera.shake(duration + hold, shake);
    }

    camera.pan(x, y, duration, "Quad.easeOut", true);
    this.tweens.add({
      targets: camera,
      zoom,
      duration,
      ease: "quad.out",
      onComplete: () => {
        onPeak?.();
        this.time.delayedCall(hold, () => {
          camera.pan(this.playerBody.x, this.playerBody.y, returnDuration, "Quad.easeInOut", true, () => {
            camera.startFollow(this.playerBody, true, this.defaultCameraLerp?.x ?? 0.12, this.defaultCameraLerp?.y ?? 0.12);
            this.cameraBeatActive = false;
            onComplete?.();
          });
          this.tweens.add({
            targets: camera,
            zoom: currentZoom,
            duration: returnDuration,
            ease: "quad.inOut",
          });
        });
      },
    });
  }

  focusOnInteractable(target, onPeak, options = {}) {
    const bounds = this.getInteractableBounds(target);
    this.playFocusBeat({
      x: bounds.x + bounds.width * 0.5,
      y: bounds.y + bounds.height * 0.5,
      onPeak,
      ...options,
    });
  }

  createPromptBubble() {
    this.initializeSharpTextFactory();
    this.initializeUiCamera();
    this.createDebugHitboxLayer();
    this.promptContainer = this.add.container(0, 0).setDepth(50).setScrollFactor(0);
    this.promptBackground = this.add.rectangle(0, 0, 0, 48, 0x111923, 0.94)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xe4bf77, 0.58);
    this.promptText = this.add.text(0, 0, "", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#f4ead4",
      padding: { left: 0, right: 0, top: 10, bottom: 10 },
      align: "left",
    }).setOrigin(0, 0.5);
    this.promptContainer.add([this.promptBackground, this.promptText]);
    this.promptContainer.setVisible(false);
    this.registerUiObjects(this.promptContainer);

    this.tweens.add({
      targets: this.promptContainer,
      y: "-=7",
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  createMessagePanel() {
    this.messagePanel = this.add.container(this.scale.width * 0.5, this.scale.height - 210).setDepth(60).setScrollFactor(0);
    this.messageBackground = this.add.rectangle(0, 0, Math.min(760, this.scale.width - 60), 120, 0x0f171f, 0.95)
      .setStrokeStyle(2, 0xe1bb73, 0.18);
    this.messageText = this.add.text(0, -8, "", {
      fontFamily: "Georgia, serif",
      fontSize: "19px",
      color: "#edf1e8",
      align: "center",
      wordWrap: { width: Math.min(680, this.scale.width - 120) },
    }).setOrigin(0.5);
    this.messageHint = this.add.text(0, 32, "Esc закрывает активные панели", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#d7c087",
    }).setOrigin(0.5);
    this.messagePanel.add([this.messageBackground, this.messageText, this.messageHint]);
    this.messagePanel.setVisible(false);
    this.registerUiObjects(this.messagePanel);
  }

  createDialogueBubble() {
    this.dialogueBubble = this.add.container(0, 0).setDepth(65).setVisible(false);
    this.dialogueBubbleBackground = this.add.rectangle(0, 0, 320, 98, 0xf3ead5, 0.96)
      .setStrokeStyle(2, 0x2f2418, 0.22);
    this.dialogueBubbleTail = this.add.triangle(-34, 42, 0, 0, 28, 0, 8, 24, 0xf3ead5, 0.96)
      .setStrokeStyle(2, 0x2f2418, 0.22)
      .setRotation(0.22);
    this.dialogueBubbleNameplate = this.add.text(-126, -30, "Герой", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#6f5433",
      fontStyle: "bold",
    }).setOrigin(0, 0.5);
    this.dialogueBubbleText = this.add.text(0, 4, "", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#1b2329",
      align: "left",
      wordWrap: { width: 244, useAdvancedWrap: true },
      lineSpacing: 2,
    }).setOrigin(0.5);

    this.dialogueBubble.add([
      this.dialogueBubbleBackground,
      this.dialogueBubbleTail,
      this.dialogueBubbleNameplate,
      this.dialogueBubbleText,
    ]);

    this.tweens.add({
      targets: this.dialogueBubble,
      y: "-=4",
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.registerUiObjects(this.dialogueBubble);
  }

  createWorldFocusMarker() {
    this.focusMarker = this.add.container(0, 0).setDepth(40).setVisible(false);
    const ringOuter = this.add.circle(0, 0, 26, 0xe1bb73, 0).setStrokeStyle(3, 0xe1bb73, 0.8);
    const ringInner = this.add.circle(0, 0, 12, 0xe1bb73, 0.22);
    const arrow = this.add.triangle(0, -36, 0, 0, 18, 0, 9, 14, 0xe1bb73, 0.9).setOrigin(0.5);
    this.focusMarker.add([ringOuter, ringInner, arrow]);
    if (this.uiCamera) {
      this.uiCamera.ignore(this.focusMarker);
    }

    this.tweens.add({
      targets: ringOuter,
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: 0.32,
      duration: 780,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.tweens.add({
      targets: ringInner,
      alpha: 0.5,
      duration: 640,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  createTransitionLayer() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.transitionShade = this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x04080c, 0)
      .setScrollFactor(0)
      .setDepth(118)
      .setVisible(false);
    this.transitionAccent = this.add.rectangle(width * 0.5, height * 0.5 - 34, Math.min(320, width - 120), 4, 0xe1bb73, 0)
      .setScrollFactor(0)
      .setDepth(119)
      .setVisible(false);
    this.transitionTitle = this.add.text(width * 0.5, height * 0.5 - 68, "", {
      fontFamily: "Georgia, serif",
      fontSize: "38px",
      color: "#f4ead5",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(119).setAlpha(0).setVisible(false);
    this.transitionText = this.add.text(width * 0.5, height * 0.5 + 12, "", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#d8e1e5",
      align: "center",
      wordWrap: { width: Math.min(620, width - 120) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(119).setAlpha(0).setVisible(false);
    this.registerUiObjects([
      this.transitionShade,
      this.transitionAccent,
      this.transitionTitle,
      this.transitionText,
    ]);
  }

  createOverlayLayer() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.overlayBackdrop = this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x05080d, 0.78)
      .setScrollFactor(0)
      .setDepth(90)
      .setVisible(false);
    this.overlayCard = this.add.rectangle(width * 0.5, height * 0.5, Math.min(920, width - 72), Math.min(560, height - 72), 0x101822, 0.97)
      .setStrokeStyle(3, 0xe7bf74, 0.3)
      .setScrollFactor(0)
      .setDepth(91)
      .setVisible(false);
    this.overlayTitle = this.add.text(width * 0.5, height * 0.5 - 220, "", {
      fontFamily: "Georgia, serif",
      fontSize: "38px",
      color: "#f4ead5",
      fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(92).setVisible(false);
    this.overlayText = this.add.text(width * 0.5, height * 0.5 - 176, "", {
      fontFamily: "Georgia, serif",
      fontSize: "19px",
      color: "#b5c7cd",
      align: "center",
      wordWrap: { width: Math.min(700, width - 140) },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(92).setVisible(false);
    this.overlayHint = this.add.text(width * 0.5, height * 0.5 + 244, "Esc, чтобы закрыть", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#d8c18a",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(92).setVisible(false);
    this.overlayContent = this.add.container(width * 0.5, height * 0.5 + 18).setDepth(93).setScrollFactor(0).setVisible(false);
    this.registerUiObjects([
      this.overlayBackdrop,
      this.overlayCard,
      this.overlayTitle,
      this.overlayText,
      this.overlayHint,
      this.overlayContent,
    ]);
  }

  createInventoryBar() {
    this.inventoryBar = this.add.container(this.scale.width * 0.5, this.scale.height - INVENTORY_BAR_BOTTOM_OFFSET).setDepth(70).setScrollFactor(0);
    const backgroundWidth = 120 + (INVENTORY_SLOT_COUNT - 1) * 90;
    this.inventoryBackground = this.add.rectangle(0, 4, backgroundWidth, 96, 0x0f151b, 0.92)
      .setStrokeStyle(2, 0xe0ba73, 0.16);
    this.selectedItemCaption = this.add.text(0, -84, "В руке: ничего", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#edf5ee",
      align: "center",
    }).setOrigin(0.5);
    this.inventoryHintLabel = this.add.text(-122, -60, "1-9 / I / Tab — предметы", {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color: "#d7c087",
      align: "center",
    }).setOrigin(0.5);
    this.inventoryMetaText = this.add.text(132, -60, "J — зацепки", {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color: "#8ea5ae",
      align: "center",
    }).setOrigin(0.5);
    this.inventoryBar.add([this.inventoryBackground, this.selectedItemCaption, this.inventoryHintLabel, this.inventoryMetaText]);
    this.inventorySlots = [];
    this.registerUiObjects(this.inventoryBar);

    for (let index = 0; index < INVENTORY_SLOT_COUNT; index += 1) {
      const slotX = -((INVENTORY_SLOT_COUNT - 1) * 45) + index * 90;
      const slot = this.add.container(slotX, 0);
      const cell = this.add.rectangle(0, 0, 70, 54, 0x1a2028, 0.98).setStrokeStyle(2, 0x4b5b63, 0.18);
      const label = this.add.text(0, 33, "", {
        fontFamily: "Georgia, serif",
        fontSize: "13px",
        color: "#e8ede6",
        align: "center",
      }).setOrigin(0.5);
      slot.add([cell, label]);
      slot.setSize(70, 68);
      slot.setInteractive(new Phaser.Geom.Rectangle(-35, -27, 70, 68), Phaser.Geom.Rectangle.Contains);
      slot.on("pointerdown", () => this.handleInventorySlotClick(index));
      this.inventoryBar.add(slot);
      this.inventorySlots.push({ slot, cell, label, icon: null, itemId: null });
    }

    this.refreshInventoryBar();
  }

  setupSceneChrome(interactables, handler) {
    this.teardownSceneBindings();
    this.createPromptBubble();
    this.createWorldFocusMarker();
    this.createMessagePanel();
    this.createDialogueBubble();
    this.createOverlayLayer();
    this.createTransitionLayer();
    this.createInventoryBar();
    this.resetTransientSceneState();
    this.bindCommonKeys();
    this.registerInteractables(interactables, handler);
    this.bindCommonResize();
    this.refreshInventoryBar();
    this.syncHud();

    this.events.on("update", this.updateDialogueBubblePosition, this);
    this.events.once("shutdown", () => {
      this.teardownSceneBindings();
      this.events.off("update", this.updateDialogueBubblePosition, this);
    });
  }

  bindCommonKeys(extraHandler) {
    if (this.keys) {
      Object.values(this.keys).forEach((key) => key?.removeAllListeners?.());
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: "A",
      right: "D",
      jump: "W",
      interact: "E",
      confirm: "ENTER",
      space: "SPACE",
      tab: "TAB",
      close: "ESC",
      inventory: "I",
      journal: "J",
      fullscreen: "F",
    });

    this.keys.close.on("down", () => {
      resumePreviewAudio();
      if (this.overlayActive) {
        this.closeOverlay();
      } else if (this.pauseMenuActive) {
        this.closePauseMenu();
      } else {
        this.openPauseMenu();
      }
    });

    this.keys.inventory.on("down", () => {
      if (this.session.inventory.length === 0) {
        this.showMessage("Инвентарь пока пуст.");
        return;
      }

      this.showMessage(`Инвентарь: ${this.session.inventory.map((itemId) => ITEM_DEFINITIONS[itemId].label).join(", ")}`);
    });

    this.keys.inventory.removeAllListeners("down");
    this.keys.inventory.on("down", () => {
      resumePreviewAudio();
      this.handleInventoryKeyPress();
    });
    this.keys.tab.on("down", () => {
      resumePreviewAudio();
      this.handleInventoryKeyPress();
    });
    this.keys.journal.on("down", () => {
      resumePreviewAudio();
      this.openJournalOverlay();
    });
    this.keys.fullscreen.on("down", () => {
      resumePreviewAudio();
      this.toggleFullscreen();
    });
    this.bindWindowKeyFallback();
    this.bindPointerRouting();

    if (extraHandler) {
      extraHandler();
    }
  }

  bindPointerRouting() {
    if (this.pointerRoutingBound) {
      return;
    }

    this.pointerRoutingBound = true;
    this.pointerMoveHandler = this.handlePointerMove.bind(this);
    this.pointerDownHandler = (pointer) => {
      resumePreviewAudio();
      this.handlePointerDown(pointer);
    };
    this.input.on("pointermove", this.pointerMoveHandler);
    this.input.on("pointerdown", this.pointerDownHandler);

    this.events.once("shutdown", () => {
      this.teardownSceneBindings();
    });
  }

  bindWindowKeyFallback() {
    if (this.windowKeyHandler) {
      return;
    }

    this.windowKeyHandler = (event) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
        return;
      }

      if (event.key === "i" || event.key === "I" || event.key === "Tab") {
        event.preventDefault();
        resumePreviewAudio();
        this.handleInventoryKeyPress();
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        resumePreviewAudio();
        this.handleInventoryDigitKeyPress(Number(event.key) - 1);
        return;
      }

      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        resumePreviewAudio();
        this.toggleFullscreen();
        return;
      }

      if (event.key === "j" || event.key === "J") {
        event.preventDefault();
        resumePreviewAudio();
        this.openJournalOverlay();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        resumePreviewAudio();
        if (this.overlayActive) {
          this.closeOverlay();
        } else if (this.pauseMenuActive) {
          this.closePauseMenu();
        } else {
          this.openPauseMenu();
        }
      }
    };

    window.addEventListener("keydown", this.windowKeyHandler);
    this.events.once("shutdown", () => {
      if (this.windowKeyHandler) {
        window.removeEventListener("keydown", this.windowKeyHandler);
        this.windowKeyHandler = null;
      }
    });
  }

  bindCommonResize() {
    if (this.resizeHandler) {
      this.scale.off("resize", this.resizeHandler);
    }

    this.resizeHandler = ({ width, height }) => {
      if (this.uiCamera) {
        this.uiCamera.setViewport(0, 0, width, height);
        this.uiCamera.setSize(width, height);
      }

      this.messagePanel.setPosition(width * 0.5, height - 260);
      this.messageBackground.width = Math.min(760, width - 60);
      this.messageText.setWordWrapWidth(Math.min(680, width - 120));
      this.promptContainer.setPosition(width * 0.5, 86);
      this.inventoryBar.setPosition(width * 0.5, height - INVENTORY_BAR_BOTTOM_OFFSET);

      if (this.overlayBackdrop) {
        this.overlayBackdrop.setPosition(width * 0.5, height * 0.5).setSize(width, height);
        this.overlayCard.setPosition(width * 0.5, height * 0.5).setSize(Math.min(920, width - 72), Math.min(560, height - 72));
        this.overlayTitle.setPosition(width * 0.5, height * 0.5 - 220);
        this.overlayText.setPosition(width * 0.5, height * 0.5 - 176);
        this.overlayText.setWordWrapWidth(Math.min(700, width - 140));
        this.overlayHint.setPosition(width * 0.5, height * 0.5 + 244);
        this.overlayContent.setPosition(width * 0.5, height * 0.5 + 18);
        this.refreshOverlayHotspots();
      }

      if (this.transitionShade) {
        this.transitionShade.setPosition(width * 0.5, height * 0.5).setSize(width, height);
        this.transitionAccent.setPosition(width * 0.5, height * 0.5 - 34).setSize(Math.min(320, width - 120), 4);
        this.transitionTitle.setPosition(width * 0.5, height * 0.5 - 68);
        this.transitionText.setPosition(width * 0.5, height * 0.5 + 12);
        this.transitionText.setWordWrapWidth(Math.min(620, width - 120));
      }

      this.drawDebugHitboxes();
    };

    this.scale.on("resize", this.resizeHandler);
    this.events.once("shutdown", () => {
      if (this.resizeHandler) {
        this.scale.off("resize", this.resizeHandler);
        this.resizeHandler = null;
      }
    });
  }

  updatePlayerMovement(playerSpeed = PLAYER_SPEED, jumpSpeed = PLAYER_JUMP_SPEED) {
    const movingLeft = this.cursors.left.isDown || this.keys.left.isDown;
    const movingRight = this.cursors.right.isDown || this.keys.right.isDown;
    const wantsJump = Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.keys.jump)
      || Phaser.Input.Keyboard.JustDown(this.keys.space);

    if (movingLeft && !movingRight) {
      this.playerBody.body.setVelocityX(-playerSpeed);
    } else if (movingRight && !movingLeft) {
      this.playerBody.body.setVelocityX(playerSpeed);
    } else {
      this.playerBody.body.setVelocityX(0);
    }

    if (wantsJump && this.playerBody.body.blocked.down) {
      this.playerBody.body.setVelocityY(jumpSpeed);
    }
  }

  getNearestInteractable(interactables, range = INTERACTION_RANGE) {
    let nearest = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestPriority = Number.NEGATIVE_INFINITY;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const item of interactables) {
      if (item.visible && !item.visible(this.session)) {
        continue;
      }

      const bounds = this.getInteractableBounds(item);
      const nearestX = Phaser.Math.Clamp(this.playerBody.x, bounds.x, bounds.x + bounds.width);
      const nearestY = Phaser.Math.Clamp(this.playerBody.y, bounds.y, bounds.y + bounds.height);
      const distance = Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, nearestX, nearestY);

      if (distance > range) {
        continue;
      }

      const priority = this.getInteractablePriority(item);
      const score = distance - priority * 18;

      if (
        score < bestScore
        || (score === bestScore && priority > bestPriority)
        || (score === bestScore && priority === bestPriority && distance < bestDistance)
      ) {
        nearest = item;
        bestDistance = distance;
        bestPriority = priority;
        bestScore = score;
      }
    }

    return nearest;
  }

  registerInteractables(interactables, handler, range = INTERACTION_RANGE) {
    this.sceneInteractables = interactables;
    this.sceneInteractionHandler = handler;
    this.sceneInteractionRange = range;
    this.hoveredInteractable = null;
    this.interactionZones = interactables.slice();

    const triggerInteraction = () => {
      if (this.overlayActive || this.sceneTransitionActive) {
        return;
      }

      this.dismissSceneIntro();
      const target = this.getCurrentInteractionTarget();
      if (target) {
        handler(target);
      }
    };

    this.keys.interact.on("down", triggerInteraction);
    this.keys.confirm.on("down", triggerInteraction);

    this.drawDebugHitboxes();
  }

  isInteractableVisible(item) {
    return !item.visible || item.visible(this.session);
  }

  getInteractablePriority(item) {
    if (!item) {
      return 0;
    }

    if (typeof item.interactionPriority === "function") {
      return Number(item.interactionPriority(this.session) ?? 0);
    }

    return Number(item.interactionPriority ?? 0);
  }

  canReachInteractable(item, range = this.sceneInteractionRange) {
    const bounds = this.getInteractableBounds(item);
    const nearestX = Phaser.Math.Clamp(this.playerBody.x, bounds.x, bounds.x + bounds.width);
    const nearestY = Phaser.Math.Clamp(this.playerBody.y, bounds.y, bounds.y + bounds.height);
    return Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, nearestX, nearestY) <= range;
  }

  syncInteractionZones() {
    if (this.overlayActive || this.sceneTransitionActive) {
      this.hoveredInteractable = null;
    } else {
      const pointer = this.input?.activePointer;
      const pointerInsideCanvas = Boolean(
        pointer
        && pointer.x >= 0
        && pointer.y >= 0
        && pointer.x <= this.scale.width
        && pointer.y <= this.scale.height
      );

      this.hoveredInteractable = pointerInsideCanvas
        ? this.getInteractableAtPointer(pointer)
        : null;
    }

    this.updatePointerCursor();
    this.drawDebugHitboxes();
  }

  getCurrentInteractionTarget() {
    this.syncInteractionZones();

    if (this.hoveredInteractable && this.canReachInteractable(this.hoveredInteractable)) {
      return this.hoveredInteractable;
    }

    return this.getNearestInteractable(this.sceneInteractables, this.sceneInteractionRange);
  }

  updateScenePrompt() {
    this.updatePrompt(this.getCurrentInteractionTarget());
  }

  showInteractionDistanceHint(item) {
    this.cameras.main.shake(80, 0.0012);
    this.showMessage(`Подойди ближе: ${item.prompt.toLowerCase()}.`);
  }

  handlePointerMove(pointer) {
    if (this.sceneTransitionActive) {
      this.hoveredInteractable = null;
      this.hoveredOverlayHotspot = null;
      this.updatePointerCursor();
      this.drawDebugHitboxes();
      return;
    }

    if (this.overlayActive) {
      this.hoveredInteractable = null;
      this.updateOverlayHotspotHover(pointer);
      this.updatePointerCursor();
      this.drawDebugHitboxes();
      return;
    }

    this.hoveredInteractable = this.getInteractableAtPointer(pointer);
    this.hoveredOverlayHotspot = null;
    this.updatePointerCursor();
    this.drawDebugHitboxes();
  }

  handlePointerDown(pointer) {
    if (this.sceneTransitionActive) {
      this.drawDebugHitboxes();
      return;
    }

    if (this.overlayActive) {
      const hotspot = this.getOverlayHotspotAtPointer(pointer);
      hotspot?.handlers?.pointerdown?.(pointer, hotspot);
      this.drawDebugHitboxes();
      return;
    }

    const target = this.getInteractableAtPointer(pointer);
    if (!target) {
      this.drawDebugHitboxes();
      return;
    }

    if (!this.canReachInteractable(target, this.sceneInteractionRange)) {
      this.showInteractionDistanceHint(target);
      this.drawDebugHitboxes();
      return;
    }

    this.dismissSceneIntro();
    this.sceneInteractionHandler?.(target);
    this.drawDebugHitboxes();
  }

  updatePointerCursor() {
    const cursor = this.sceneTransitionActive
      ? "default"
      : this.overlayActive
        ? (this.hoveredOverlayHotspot?.handlers?.useHandCursor === false ? "default" : (this.hoveredOverlayHotspot ? "pointer" : "default"))
        : (this.hoveredInteractable ? "pointer" : "default");
    this.input.setDefaultCursor(cursor);
  }

  getInteractableBounds(item) {
    return item.hitbox ?? item;
  }

  getInteractableMarkerPoint(item) {
    const bounds = this.getInteractableBounds(item);
    if (item.markerAnchor) {
      return item.markerAnchor;
    }

    return {
      x: bounds.x + bounds.width * 0.5,
      y: bounds.y - 16,
    };
  }

  getInteractableAtPointer(pointer) {
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const candidates = this.sceneInteractables.filter((item) => {
      if (!this.isInteractableVisible(item)) {
        return false;
      }

      const bounds = this.getInteractableBounds(item);
      return point.x >= bounds.x
        && point.x <= bounds.x + bounds.width
        && point.y >= bounds.y
        && point.y <= bounds.y + bounds.height;
    });

    if (!candidates.length) {
      return null;
    }

    candidates.sort((left, right) => {
      const leftBounds = this.getInteractableBounds(left);
      const rightBounds = this.getInteractableBounds(right);
      const leftArea = leftBounds.width * leftBounds.height;
      const rightArea = rightBounds.width * rightBounds.height;
      if (leftArea !== rightArea) {
        return leftArea - rightArea;
      }

      const leftDistance = Phaser.Math.Distance.Between(
        point.x,
        point.y,
        leftBounds.x + leftBounds.width * 0.5,
        leftBounds.y + leftBounds.height * 0.5
      );
      const rightDistance = Phaser.Math.Distance.Between(
        point.x,
        point.y,
        rightBounds.x + rightBounds.width * 0.5,
        rightBounds.y + rightBounds.height * 0.5
      );
      return leftDistance - rightDistance;
    });

    return candidates[0];
  }

  getOverlayHotspotAtPointer(pointer) {
    const pointX = pointer.x;
    const pointY = pointer.y;
    const candidates = this.overlayHotspots.filter((hotspot) => (
      pointX >= hotspot.x - hotspot.width * 0.5
      && pointX <= hotspot.x + hotspot.width * 0.5
      && pointY >= hotspot.y - hotspot.height * 0.5
      && pointY <= hotspot.y + hotspot.height * 0.5
    ));

    if (!candidates.length) {
      return null;
    }

    candidates.sort((left, right) => {
      const leftArea = left.width * left.height;
      const rightArea = right.width * right.height;
      if (leftArea !== rightArea) {
        return leftArea - rightArea;
      }

      const leftDistance = Phaser.Math.Distance.Between(pointX, pointY, left.x, left.y);
      const rightDistance = Phaser.Math.Distance.Between(pointX, pointY, right.x, right.y);
      return leftDistance - rightDistance;
    });

    return candidates[0];
  }

  updateOverlayHotspotHover(pointer) {
    const nextHotspot = this.getOverlayHotspotAtPointer(pointer);
    if (nextHotspot === this.hoveredOverlayHotspot) {
      return;
    }

    if (this.hoveredOverlayHotspot?.handlers?.pointerout) {
      this.hoveredOverlayHotspot.handlers.pointerout(pointer, this.hoveredOverlayHotspot);
    }

    this.hoveredOverlayHotspot = nextHotspot;

    if (this.hoveredOverlayHotspot?.handlers?.pointerover) {
      this.hoveredOverlayHotspot.handlers.pointerover(pointer, this.hoveredOverlayHotspot);
    }
  }

  updatePrompt(target) {
    this.syncInteractionZones();

    if (!target) {
      this.promptContainer.setVisible(false);
      if (this.focusMarker) {
        this.focusMarker.setVisible(false);
      }
      this.drawDebugHitboxes();
      return;
    }

    this.promptText.setText(`[E / click] ${target.prompt}`);
    this.promptBackground.width = Math.max(240, this.promptText.width + 40);
    this.promptBackground.height = Math.max(44, this.promptText.height + 16);
    this.promptBackground.setPosition(0, 0);
    this.promptText.setPosition(18, 0);
    this.promptContainer.setPosition(
      Math.round((this.scale.width - this.promptBackground.width) * 0.5),
      86
    );
    this.promptContainer.setVisible(true);

    if (this.focusMarker) {
      this.focusMarker.setVisible(true);
      const markerPoint = this.getInteractableMarkerPoint(target);
      this.focusMarker.setPosition(markerPoint.x, markerPoint.y);
    }

    this.drawDebugHitboxes();
  }

  syncHud() {
    const stageNode = document.getElementById("previewStage");
    const objectiveNode = document.getElementById("previewObjective");
    const hintNode = document.getElementById("previewHint");
    const inventoryNode = document.getElementById("previewInventory");
    const selectedNode = document.getElementById("previewSelected");
    const journalNode = document.getElementById("previewJournal");
    const leadNode = document.getElementById("previewLead");
    const controlsNode = document.getElementById("previewControls");

    if (stageNode) {
      stageNode.textContent = this.getStageLabel();
    }

    if (objectiveNode) {
      const newText = this.getObjectiveText();
      const prevText = objectiveNode.textContent;
      objectiveNode.textContent = newText;
      // Flash + slide animation only when the objective actually changed.
      if (prevText && prevText !== newText) {
        objectiveNode.style.transition = "opacity 260ms ease-out, transform 260ms ease-out, color 260ms ease-out";
        objectiveNode.style.opacity = "0";
        objectiveNode.style.transform = "translateY(-6px)";
        objectiveNode.style.color = "#f3deb1";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            objectiveNode.style.opacity = "1";
            objectiveNode.style.transform = "translateY(0)";
            setTimeout(() => { objectiveNode.style.color = ""; }, 900);
          });
        });
      }
    }

    if (hintNode) {
      hintNode.textContent = this.session.currentHint;
    }

    if (inventoryNode) {
      inventoryNode.textContent = this.session.inventory.length
        ? `Инвентарь: ${this.session.inventory.map((itemId) => ITEM_DEFINITIONS[itemId].label).join(", ")}`
        : "Инвентарь: пусто";
    }

    if (selectedNode) {
      selectedNode.textContent = this.session.selectedItemId
        ? ITEM_DEFINITIONS[this.session.selectedItemId]?.label ?? "Неизвестный предмет"
        : "Ничего не выбрано";
    }

    if (journalNode) {
      const entries = this.getJournalEntries();
      journalNode.textContent = entries.length
        ? `${entries.length} запис${entries.length === 1 ? "ь" : entries.length < 5 ? "и" : "ей"} зафиксировано`
        : "Пока пусто";
    }

    if (leadNode) {
      leadNode.textContent = this.getLeadText();
    }

    if (controlsNode) {
      controlsNode.textContent = "1-9 — предмет, I / Tab — инвентарь, J — журнал, F — fullscreen, Esc — закрыть";
    }

    publishPreviewDiagnostics(this, this.session);
    syncPreviewAmbience(this.session.stage);
  }

  renderGameToTextState() {
    const body = this.playerBody?.body;
    const camera = this.cameras?.main;
    const visibleInteractables = this.sceneInteractables
      .filter((item) => this.isInteractableVisible(item))
      .map((item) => {
        const bounds = this.getInteractableBounds(item);
        const centerX = bounds.x + bounds.width * 0.5;
        const centerY = bounds.y + bounds.height * 0.5;
        const distance = this.playerBody
          ? Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, centerX, centerY)
          : null;
        const screenX = camera ? (centerX - camera.worldView.x) * camera.zoom : null;
        const screenY = camera ? (centerY - camera.worldView.y) * camera.zoom : null;

        return {
          id: item.id,
          prompt: item.prompt,
          x: Math.round(bounds.x),
          y: Math.round(bounds.y),
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
          screenX: screenX == null ? null : Math.round(screenX),
          screenY: screenY == null ? null : Math.round(screenY),
          distanceFromPlayer: distance == null ? null : Math.round(distance),
          inInteractionRange: this.canReachInteractable(item, this.sceneInteractionRange),
        };
      });

    const journalEntries = this.getJournalEntries().map((entry) => entry.title);
    const inventoryItems = this.session.inventory.map((itemId) => ({
      id: itemId,
      label: ITEM_DEFINITIONS[itemId]?.label ?? itemId,
    }));

    return {
      coordinateSystem: "origin at top-left; x increases right; y increases downward",
      scene: {
        key: this.scene.key,
        stage: this.session.stage,
        label: this.getStageLabel(),
      },
      player: this.playerBody ? {
        x: Math.round(this.playerBody.x),
        y: Math.round(this.playerBody.y),
        vx: Math.round(body?.velocity?.x ?? 0),
        vy: Math.round(body?.velocity?.y ?? 0),
        facing: this.playerBody.flipX ? "left" : "right",
      } : null,
      camera: camera ? {
        x: Math.round(camera.worldView.x),
        y: Math.round(camera.worldView.y),
        width: Math.round(camera.worldView.width),
        height: Math.round(camera.worldView.height),
        zoom: Number(camera.zoom.toFixed(3)),
      } : null,
      objective: this.getObjectiveText(),
      hint: this.session.currentHint,
      lead: this.getLeadText(),
      inventory: {
        selectedItemId: this.session.selectedItemId ?? null,
        items: inventoryItems,
      },
      journal: {
        count: journalEntries.length,
        entries: journalEntries,
      },
      ui: {
        overlayActive: this.overlayActive,
        overlayKind: this.overlayKind,
        prompt: this.promptContainer?.visible ? this.promptText?.text ?? "" : null,
        messageVisible: this.messagePanel?.visible ?? false,
        message: this.messagePanel?.visible ? this.messageText?.text ?? "" : null,
        dialogueVisible: this.dialogueBubble?.visible ?? false,
        dialogue: this.dialogueBubble?.visible ? this.dialogueBubbleText?.text ?? "" : null,
      },
      visibleInteractables,
      progress: {
        wake: this.session.wakeProgress,
        lantern: this.session.lanternProgress,
        shore: this.session.shoreProgress,
        service: this.session.serviceProgress,
        tunnel: this.session.tunnelProgress,
        pier: this.session.pierProgress,
        bay: this.session.bayProgress,
        puzzleState: this.session.puzzleState,
        endingUnlocked: this.session.endingUnlocked,
        progressStage: this.session.progressStage,
      },
    };
  }

  updateDialogueBubblePosition() {
    if (!this.dialogueBubble?.visible || !this.playerBody) {
      return;
    }

    const camera = this.cameras?.main;
    if (!camera) {
      return;
    }

    const facing = this.playerBody.flipX ? -1 : 1;
    const screenX = (this.playerBody.x - camera.worldView.x) * camera.zoom;
    const screenY = (this.playerBody.y - camera.worldView.y) * camera.zoom;
    const bubbleWidth = this.dialogueBubbleBackground.width;
    const bubbleHeight = this.dialogueBubbleBackground.height;
    const offsetX = facing > 0
      ? Math.max(92, bubbleWidth * 0.32)
      : -Math.max(92, bubbleWidth * 0.32);
    const offsetY = -Math.max(118, bubbleHeight * 0.72);
    this.dialogueBubble.setPosition(screenX + offsetX, screenY + offsetY);
    this.dialogueBubble.setScale(1, 1);

    const contentWidth = Math.max(180, this.dialogueBubbleBackground.width - 40);
    const tailOffset = Math.min(42, contentWidth * 0.22);
    this.dialogueBubbleTail.setPosition(facing > 0 ? -tailOffset : tailOffset, (this.dialogueBubbleBackground.height * 0.5) - 6);
    this.dialogueBubbleTail.setRotation(facing > 0 ? 0.22 : -0.22);
    this.dialogueBubbleNameplate
      .setOrigin(facing > 0 ? 0 : 1, 0.5)
      .setPosition(facing > 0 ? (-contentWidth * 0.5) - 4 : (contentWidth * 0.5) + 4, -(this.dialogueBubbleBackground.height * 0.5) + 18);
  }

  getStageLabel() {
    return "Phaser Preview";
  }

  getObjectiveText() {
    return "";
  }

  getLeadText() {
    if (this.session.bayProgress?.cacheOpened) {
      return "Под маяком была подготовлена точка отхода. Значит, всё это не авария, а продуманная цепочка действий.";
    }

    if (this.session.tunnelProgress?.signalFound) {
      return "Сигнал и тоннель сходятся в одну линию: кто-то осознанно уходил к воде и оставлял ориентиры по пути.";
    }

    if (this.session.serviceProgress?.consoleUsed) {
      return "Схема показывает, что проходы были заблокированы сознательно. Башню не просто бросили — её закрыли изнутри.";
    }

    if (this.session.shoreProgress?.radioChecked) {
      return "Рация предупреждает о спуске вниз. Значит, настоящий конфликт и ответы находятся под башней, а не наверху.";
    }

    if (this.session.lanternProgress?.mechanismChecked) {
      return "Прожектор мёртв не сам по себе. Поломка тянется вниз, к генератору и к тем, кто вмешивался в питание.";
    }

    if (this.session.wakeProgress?.cluesChecked) {
      return "Следы в комнате подтверждают, что тебя принесли сюда после шторма. Кто-то был здесь недавно и ушёл в спешке.";
    }

    return "Осмотрись и зафиксируй первую зацепку. Верхний ярус должен объяснить, что здесь произошло до твоего пробуждения.";
  }

  showNarration(text) {
    this.session.currentHint = text;
    this.syncHud();
    this.showMessage(text);
  }

  addInventoryItem(itemId) {
    if (!this.session.inventory.includes(itemId)) {
      this.session.inventory.push(itemId);
    }

    this.session.selectedItemId = itemId;
    this.refreshInventoryBar();
    this.pulseInventorySlot(itemId);
    this.syncHud();
    playPreviewUiTick("select");
  }

  removeInventoryItem(itemId) {
    const nextInventory = this.session.inventory.filter((entry) => entry !== itemId);
    this.session.inventory.length = 0;
    this.session.inventory.push(...nextInventory);

    if (this.session.selectedItemId === itemId) {
      this.session.selectedItemId = this.session.inventory[this.session.inventory.length - 1] ?? null;
    }

    this.refreshInventoryBar();
    this.syncHud();
    playPreviewUiTick("close");
  }

  refreshInventoryBar() {
    const items = this.session.inventory.slice(0, INVENTORY_SLOT_COUNT);

    this.inventorySlots.forEach((slotState, index) => {
      const itemId = items[index] ?? null;
      slotState.itemId = itemId;
      slotState.cell.setStrokeStyle(2, itemId && itemId === this.session.selectedItemId ? 0xe1bb73 : 0x4b5b63, itemId ? 0.65 : 0.26);
      slotState.label.setText(itemId ? ITEM_DEFINITIONS[itemId].label : "");

      if (slotState.icon) {
        slotState.icon.destroy();
        slotState.icon = null;
      }

      if (itemId) {
        slotState.icon = createItemIcon(this, itemId, 0, -4, "inventory");
        slotState.slot.add(slotState.icon);
      }
    });

    if (this.selectedItemCaption) {
      this.selectedItemCaption.setText(
        this.session.selectedItemId
          ? `В руке: ${ITEM_DEFINITIONS[this.session.selectedItemId]?.label ?? "неизвестно"}`
          : "В руке: ничего"
      );
    }

    if (this.inventoryMetaText) {
      const entryCount = this.getJournalEntries().length;
      this.inventoryMetaText.setText(
        entryCount > 0
          ? `J — зацепки (${entryCount})`
          : "J — зацепки"
      );
    }
  }

  pulseInventorySlot(itemId) {
    const index = this.session.inventory.indexOf(itemId);
    if (index < 0 || !this.inventorySlots[index]) {
      return;
    }

    this.tweens.add({
      targets: this.inventorySlots[index].slot,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 120,
      yoyo: true,
      ease: "quad.out",
    });
  }

  handleInventorySlotClick(index) {
    const slotState = this.inventorySlots[index];
    if (!slotState?.itemId) {
      return;
    }

    const itemId = slotState.itemId;
    this.session.selectedItemId = itemId;
    this.refreshInventoryBar();
    this.showMessage(
      ITEM_DEFINITIONS[itemId].readable
        ? `${ITEM_DEFINITIONS[itemId].label}: нажми I или Tab, чтобы открыть.`
        : `${ITEM_DEFINITIONS[itemId].label}: выбран для следующего действия.`
    );
    this.syncHud();
    playPreviewUiTick("select");
  }

  handleInventoryDigitKeyPress(index) {
    if (this.sceneTransitionActive) {
      return;
    }

    const slotState = this.inventorySlots[index];
    if (!slotState) {
      return;
    }

    if (!slotState.itemId) {
      this.showMessage(`Слот ${index + 1} пуст.`);
      playPreviewUiTick("close");
      return;
    }

    this.handleInventorySlotClick(index);
  }

  handleInventoryKeyPress() {
    // Close the pause menu if it was open — inventory takes precedence.
    if (this.pauseMenuActive) {
      this.closePauseMenu();
    }
    if (this.overlayActive) {
      if (this.overlayKind === "inventory") {
        this.closeOverlay();
        return;
      }
      // Any other overlay: close it first, then open inventory on next tick.
      this.closeOverlay();
      this.time.delayedCall(180, () => this.openInventoryOverlay());
      return;
    }
    this.openInventoryOverlay();
  }

  openInventoryOverlay() {
    this.openOverlay(
      "Инвентарь",
      "Здесь лежат найденные вещи, документы и ключевые инструменты. Выбирай предмет быстро, а читаемые записи открывай прямо отсюда."
    );
    this.overlayKind = "inventory";
    this.overlayHint.setText("Клик — взять или открыть, 1-9 — быстрый выбор, Esc — закрыть");
    const tray = this.add.rectangle(0, -10, 680, 208, 0x151c22, 0.92).setStrokeStyle(2, 0x7b8e95, 0.18);
    const hoverPanel = this.add.rectangle(0, 136, 680, 72, 0x10171d, 0.94).setStrokeStyle(2, 0xe1bb73, 0.16);
    const hoverTitle = this.add.text(0, 116, "Наведи курсор на предмет", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#f4ead5",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    const hoverText = this.add.text(0, 146, "Краткая подпись подскажет, зачем предмет нужен прямо сейчас и можно ли открыть его как документ.", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#aebdc3",
      align: "center",
      wordWrap: { width: 590 },
    }).setOrigin(0.5);
    this.overlayContent.add([tray, hoverPanel, hoverTitle, hoverText]);

    if (!this.session.inventory.length) {
      const emptyTitle = this.add.text(0, -8, "Пока пусто", {
        fontFamily: "Georgia, serif",
        fontSize: "30px",
        color: "#f4ead5",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const emptyText = this.add.text(0, 48, "Здесь будут появляться найденные вещи и документы. Сначала осмотри комнату и стол у стены, чтобы заполнить первые слоты.", {
        fontFamily: "Georgia, serif",
        fontSize: "17px",
        color: "#b9cad0",
        align: "center",
        wordWrap: { width: 430 },
      }).setOrigin(0.5);
      this.overlayContent.add([emptyTitle, emptyText]);
      return;
    }

    this.session.inventory.forEach((itemId, index) => {
      const columns = Math.min(3, this.session.inventory.length);
      const row = Math.floor(index / columns);
      const column = index % columns;
      const rowCount = Math.ceil(this.session.inventory.length / columns);
      const spacingX = columns === 1 ? 0 : 220;
      const spacingY = 164;
      const startX = columns === 1 ? 0 : -spacingX * ((columns - 1) * 0.5);
      const startY = rowCount === 1 ? -22 : -48;
      const x = startX + column * spacingX;
      const y = startY + row * spacingY;
      const card = this.add.container(x, y).setSize(180, 144);
      const isSelected = itemId === this.session.selectedItemId;
      const background = this.add.rectangle(0, 0, 180, 144, 0x131920, 0.98)
        .setStrokeStyle(3, isSelected ? 0xe1bb73 : 0x4b5b63, isSelected ? 0.78 : 0.28);
      const glint = this.add.rectangle(0, -69, 132, 18, isSelected ? 0xe1bb73 : 0x41505a, isSelected ? 0.22 : 0.12);
      const title = this.add.text(0, -56, ITEM_DEFINITIONS[itemId].label, {
        fontFamily: "Georgia, serif",
        fontSize: "20px",
        color: "#f4ead5",
        align: "center",
        wordWrap: { width: 148 },
      }).setOrigin(0.5);
      const icon = createItemIcon(this, itemId, 0, -4, "overlay");
      const action = this.add.text(0, 48, ITEM_DEFINITIONS[itemId].readable ? "Открыть" : "Взять в руку", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#d7c087",
      }).setOrigin(0.5);
      card.add([background, glint, title, icon, action]);
      this.overlayContent.add(card);
      this.createOverlayRectHotspot(x, y, 180, 150, {
        pointerover: () => {
          if (!background.scene || !glint.scene || !hoverTitle.scene || !hoverText.scene || this.overlayKind !== "inventory") {
            return;
          }
          background.setStrokeStyle(3, 0xe1bb73, 0.82);
          glint.setFillStyle(0xe1bb73, 0.26);
          hoverTitle.setText(ITEM_DEFINITIONS[itemId].label);
          hoverText.setText(
            ITEM_DEFINITIONS[itemId].readable
              ? `${ITEM_DEFINITIONS[itemId].description} Клик откроет документ прямо здесь.`
              : `${ITEM_DEFINITIONS[itemId].description} Клик возьмёт предмет в руку для следующего действия.`
          );
        },
        pointerout: () => {
          if (!background.scene || !glint.scene || !hoverTitle.scene || !hoverText.scene || this.overlayKind !== "inventory") {
            return;
          }
          const selectedNow = itemId === this.session.selectedItemId;
          background.setStrokeStyle(3, selectedNow ? 0xe1bb73 : 0x4b5b63, selectedNow ? 0.78 : 0.28);
          glint.setFillStyle(selectedNow ? 0xe1bb73 : 0x41505a, selectedNow ? 0.22 : 0.12);
          hoverTitle.setText("Наведи курсор на предмет");
          hoverText.setText("Краткая подпись подскажет, зачем предмет нужен прямо сейчас и можно ли открыть его как документ.");
        },
        pointerdown: () => {
          if (this.overlayKind !== "inventory") {
            return;
          }
          this.session.selectedItemId = itemId;
          this.refreshInventoryBar();
          if (ITEM_DEFINITIONS[itemId].readable) {
            playPreviewUiTick("read");
            this.openReadableItemOverlay(itemId);
            return;
          }
          this.closeOverlay();
          this.showNarration(`${ITEM_DEFINITIONS[itemId].label} выбран.`);
          playPreviewUiTick("select");
        },
      });
    });
  }
  openOverlay(title, description, hintText = "1-9 — сменить предмет, клик по активным зонам, Esc — закрыть") {
    this.dismissSceneIntro();
    this.overlayTransitionToken = (this.overlayTransitionToken ?? 0) + 1;
    const transitionToken = this.overlayTransitionToken;
    const cardTargetY = this.scale.height * 0.5;
    const titleTargetY = this.scale.height * 0.5 - 220;
    const textTargetY = this.scale.height * 0.5 - 176;
    const hintTargetY = this.scale.height * 0.5 + 244;
    const contentTargetY = this.scale.height * 0.5 + 18;

    this.overlayActive = true;
    this.overlayKind = "custom";
    playPreviewUiTick("soft");
    this.syncInteractionZones();
    this.updatePrompt(null);
    this.clearOverlayHotspots();
    this.overlayBackdrop.setVisible(true).setAlpha(0);
    this.overlayCard.setVisible(true).setScale(0.96).setAlpha(0).setY(cardTargetY + 18);
    this.overlayTitle.setVisible(true).setText(title).setAlpha(0).setY(titleTargetY + 24);
    this.overlayText.setVisible(true).setText(description).setAlpha(0).setY(textTargetY + 22);
    this.overlayHint.setVisible(true).setText(hintText).setAlpha(0).setY(hintTargetY + 12);
    this.overlayContent.setVisible(true).setScale(0.98).setAlpha(0).setY(contentTargetY + 26);
    this.overlayContent.removeAll(true);

    this.tweens.add({
      targets: this.overlayBackdrop,
      alpha: 0.78,
      duration: 180,
      ease: "quad.out",
    });
    this.tweens.add({
      targets: [this.overlayCard, this.overlayTitle, this.overlayText, this.overlayHint, this.overlayContent],
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: "back.out",
      onComplete: () => {
        if (this.overlayTransitionToken !== transitionToken) {
          return;
        }
        this.drawDebugHitboxes();
      },
    });
    this.tweens.add({
      targets: this.overlayCard,
      y: cardTargetY,
      duration: 220,
      ease: "quad.out",
    });
    this.tweens.add({
      targets: [this.overlayTitle],
      y: titleTargetY,
      duration: 220,
      ease: "quad.out",
    });
    this.tweens.add({
      targets: [this.overlayText],
      y: textTargetY,
      duration: 220,
      ease: "quad.out",
    });
    this.tweens.add({
      targets: [this.overlayHint],
      y: hintTargetY,
      duration: 220,
      ease: "quad.out",
    });
    this.tweens.add({
      targets: this.overlayContent,
      y: contentTargetY,
      duration: 220,
      ease: "quad.out",
    });
  }

  closeOverlay() {
    if (!this.overlayActive) {
      return;
    }

    this.overlayTransitionToken = (this.overlayTransitionToken ?? 0) + 1;
    const transitionToken = this.overlayTransitionToken;
    this.overlayKind = null;
    playPreviewUiTick("close");
    this.tweens.add({
      targets: this.overlayBackdrop,
      alpha: 0,
      duration: 140,
      ease: "quad.in",
      onComplete: () => {
        if (this.overlayTransitionToken !== transitionToken) {
          return;
        }
        this.overlayActive = false;
        this.overlayBackdrop.setVisible(false);
      },
    });
    this.tweens.add({
      targets: [this.overlayCard, this.overlayTitle, this.overlayText, this.overlayHint, this.overlayContent],
      alpha: 0,
      scaleX: 0.98,
      scaleY: 0.98,
      duration: 140,
      ease: "quad.in",
      onComplete: () => {
        if (this.overlayTransitionToken !== transitionToken) {
          return;
        }
        this.overlayCard.setVisible(false);
        this.overlayTitle.setVisible(false);
        this.overlayText.setVisible(false);
        this.overlayHint.setVisible(false);
        this.overlayContent.setVisible(false);
        this.overlayContent.removeAll(true);
        this.clearOverlayHotspots();
        this.overlayCard.setScale(1);
        this.overlayCard.setY(this.scale.height * 0.5);
        this.overlayTitle.setY(this.scale.height * 0.5 - 220);
        this.overlayText.setY(this.scale.height * 0.5 - 176);
        this.overlayHint.setY(this.scale.height * 0.5 + 244);
        this.overlayContent.setScale(1);
        this.overlayContent.setY(this.scale.height * 0.5 + 18);
        this.syncInteractionZones();
        this.restoreWorldCameraFollow();
        this.drawDebugHitboxes();
      },
    });
  }

  openReadableItemOverlay(itemId) {
    const item = ITEM_DEFINITIONS[itemId];
    if (!item?.readable) {
      return;
    }

    this.openOverlay(
      item.documentTitle,
      "Документ из инвентаря. Пролистай содержание и вернись к маршруту, когда зацепка уложится в голове.",
      "Esc — убрать документ"
    );

    const shadow = this.add.rectangle(12, 28, 544, 324, 0x000000, 0.24);
    const paper = this.add.rectangle(0, 20, 520, 300, 0xd8d0bd, 1).setStrokeStyle(2, 0x7a6a56, 0.38);
    const paperGlow = this.add.rectangle(0, 20, 520, 300, 0xf4ead5, 0.06);
    const title = this.add.text(0, -94, item.documentTitle, {
      fontFamily: "Georgia, serif",
      fontSize: "26px",
      color: "#352b22",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const meta = this.add.text(0, -58, "Найдено в этом проходе. Можно перечитать в любой момент через инвентарь.", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#6a5d4e",
      align: "center",
      wordWrap: { width: 430 },
    }).setOrigin(0.5);
    const body = this.add.text(0, 8, item.documentText, {
      fontFamily: "Georgia, serif",
      fontSize: "20px",
      color: "#3f362e",
      align: "center",
      wordWrap: { width: 420 },
    }).setOrigin(0.5);
    this.overlayContent.add([shadow, paper, paperGlow, title, meta, body]);
  }

  getJournalEntries() {
    const entries = [];

    if (this.session.wakeProgress?.cluesChecked) {
      entries.push({
        title: "Следы в комнате",
        text: "От кровати к лестнице и двери тянутся свежие следы. Значит, в башне кто-то был совсем недавно и ушёл в спешке.",
      });
    }

    if (this.session.wakeProgress?.leavesMoved) {
      entries.push({
        title: "Листья у стены",
        text: "Под мокрой кучей листьев оказался спрятан инструмент. Кто-то пытался быстро убрать следы подготовки к ремонту.",
      });
    }

    if (this.session.lanternProgress?.mechanismChecked) {
      entries.push({
        title: "Прожектор",
        text: "Фонарь не оживает не из-за линзы, а из-за питания. Поломка начинается ниже, у генератора и служебных контуров.",
      });
    }

    if (this.session.shoreProgress?.radioChecked) {
      entries.push({
        title: "Рация",
        text: "Рация шипит обрывками аварийного эфира. Береговая площадка явно использовалась уже после шторма.",
      });
    }

    if (this.session.puzzleState?.generator?.fuseInstalled || this.session.puzzleState?.generator?.valveWheelInstalled) {
      entries.push({
        title: "Резервный генератор",
        text: "Механизм оживает только после ручной сборки. Значит, поломка не случайна: кто-то разобрал узлы осознанно.",
      });
    }

    if (this.session.serviceProgress?.logbookRead || this.session.inventory.includes("logbook")) {
      entries.push({
        title: "Журнал дежурств",
        text: "Последние записи говорят о шагах у цистерны и о закрытом восточном тоннеле. Смотритель явно боялся того, что прячется внизу.",
      });
    }

    if (this.session.serviceProgress?.consoleUsed) {
      entries.push({
        title: "Сервисный пульт",
        text: "Питание нижнего контура нестабильно, но схема маяка жива. Путь вниз открывает не одна поломка, а целая цепочка вмешательств.",
      });
    }

    if (this.session.tunnelProgress?.signalFound) {
      entries.push({
        title: "Аварийный сигнал",
        text: "Источник сигнала не случаен. Тоннель словно специально оставили в полуживом состоянии, чтобы кто-то всё же спустился дальше.",
      });
    }

    if (this.session.pierProgress?.ropeFound) {
      entries.push({
        title: "Пристань",
        text: "Лебёдка и ялик подсказывают, что к морскому створу кто-то подходил вручную. Это не место случайной аварии, а точка доступа.",
      });
    }

    if (this.session.bayProgress?.campSeen || this.session.bayProgress?.cacheOpened) {
      entries.push({
        title: "Скрытая бухта",
        text: "Костёр, тайник и следы подтверждают: под маяком скрывались и работали. Нижний маршрут был нужен кому-то как укрытие.",
      });
    }

    return entries;
  }

  openJournalOverlay() {
    // Pause menu is a plain container, not an overlay — close it explicitly.
    if (this.pauseMenuActive) {
      this.closePauseMenu();
    }
    if (this.overlayActive) {
      if (this.overlayKind === "journal") {
        this.closeOverlay();
        return;
      }
      // Any other overlay: close first, then reopen journal after the fade-out.
      this.closeOverlay();
      this.time.delayedCall(180, () => this.openJournalOverlay());
      return;
    }

    const entries = this.getJournalEntries();

    this.openOverlay(
      "Журнал находок",
      "Здесь остаются только ключевые выводы, чтобы быстро восстановить маршрут и причинно-следственные связи.",
      "Esc — закрыть журнал"
    );
    this.overlayKind = "journal";

    const frame = this.add.rectangle(0, 26, 708, 308, 0x141b22, 0.92).setStrokeStyle(2, 0x7b8e95, 0.18);
    const summaryBand = this.add.rectangle(0, -90, 644, 56, 0x10161c, 0.96).setStrokeStyle(2, 0xe1bb73, 0.14);
    const summaryTitle = this.add.text(-292, -102, "Текущая версия событий", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#f4ead5",
      fontStyle: "bold",
    }).setOrigin(0, 0.5);
    const summaryText = this.add.text(-292, -74, this.getLeadText(), {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color: "#b7c9cf",
      wordWrap: { width: 584, useAdvancedWrap: true },
    }).setOrigin(0, 0.5);
    this.overlayContent.add([frame, summaryBand, summaryTitle, summaryText]);

    if (!entries.length) {
      const emptyTitle = this.add.text(0, 4, "Журнал пока пуст", {
        fontFamily: "Georgia, serif",
        fontSize: "30px",
        color: "#f4ead5",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const emptyText = this.add.text(0, 62, "Как только ты осмотришь первые улики, здесь соберутся краткие выводы. Пока лучший следующий шаг — изучить комнату и найти первую аномалию.", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#b7c9cf",
        align: "center",
        wordWrap: { width: 480 },
      }).setOrigin(0.5);
      this.overlayContent.add([emptyTitle, emptyText]);
      return;
    }

    const visibleEntries = entries.slice(-4);
    visibleEntries.forEach((entry, index) => {
      const y = -12 + index * 66;
      const chip = this.add.rectangle(0, y, 640, 58, 0x10161c, 0.96).setStrokeStyle(2, 0xe1bb73, 0.18);
      const title = this.add.text(-292, y - 12, entry.title, {
        fontFamily: "Georgia, serif",
        fontSize: "17px",
        color: "#f4ead5",
        fontStyle: "bold",
      }).setOrigin(0, 0.5);
      const body = this.add.text(-292, y + 10, entry.text, {
        fontFamily: "Georgia, serif",
        fontSize: "13px",
        color: "#b7c9cf",
        wordWrap: { width: 584, useAdvancedWrap: true },
      }).setOrigin(0, 0.5);
      this.overlayContent.add([chip, title, body]);
    });

    if (entries.length > visibleEntries.length) {
      const hiddenCount = entries.length - visibleEntries.length;
      const footer = this.add.text(0, 142, `Ещё ${hiddenCount} ранн${hiddenCount === 1 ? "яя зацепка" : hiddenCount < 5 ? "ие зацепки" : "их зацепок"} уже сохранен${hiddenCount === 1 ? "а" : "о"} выше по маршруту.`, {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#8ea5ae",
        align: "center",
        wordWrap: { width: 560 },
      }).setOrigin(0.5);
      this.overlayContent.add(footer);
    }
  }

  showMessage(text) {
    const wrapped = String(text ?? "").trim();
    if (!wrapped) {
      this.messagePanel?.setVisible(false);
      this.dialogueBubble?.setVisible(false);
      return;
    }

    this.messageText.setText(wrapped);
    this.messagePanel.setVisible(false);
    this.dialogueBubbleText.setText(wrapped);
    this.dialogueBubbleText.setWordWrapWidth(244);

    const contentWidth = Math.max(220, Math.min(280, this.dialogueBubbleText.width + 36));
    const contentHeight = Math.max(54, this.dialogueBubbleText.height + 30);
    this.dialogueBubbleBackground.setSize(contentWidth + 40, contentHeight + 24);
    this.dialogueBubbleText.setPosition(0, 6);
    this.dialogueBubbleNameplate.setPosition((-contentWidth * 0.5) - 4, (-contentHeight * 0.5) - 8);
    this.dialogueBubbleTail.setPosition(-Math.min(42, contentWidth * 0.22), (contentHeight * 0.5) + 6);
    this.dialogueBubble.setVisible(true).setAlpha(1);
    this.updateDialogueBubblePosition();

    if (this.hideMessageEvent) {
      this.time.removeEvent(this.hideMessageEvent);
    }
    // Scale display time with text length so long narrations don't vanish mid-read.
    // Baseline: 2400ms, plus ~55ms per character, capped at 14000ms.
    const readTimeMs = Math.min(14000, Math.max(2400, 2400 + wrapped.length * 55));
    this.hideMessageEvent = this.time.delayedCall(readTimeMs, () => {
      this.dialogueBubble?.setVisible(false);
      this.messagePanel?.setVisible(false);
    });
  }

  dismissSceneIntro() {
    if (!this.sceneIntroActive || this.sceneTransitionActive) {
      return;
    }

    this.sceneIntroActive = false;
    this.tweens.killTweensOf([
      this.transitionShade,
      this.transitionAccent,
      this.transitionTitle,
      this.transitionText,
    ]);

    this.transitionShade?.setVisible(false).setAlpha(0);
    this.transitionAccent?.setVisible(false).setAlpha(0).setScale(1, 1);
    this.transitionTitle?.setVisible(false).setAlpha(0);
    this.transitionText?.setVisible(false).setAlpha(0);
  }

  openPauseMenu() {
    if (this.pauseMenuActive || this.sceneTransitionActive) return;
    this.pauseMenuActive = true;

    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(300);
    const backdrop = this.add.rectangle(w * 0.5, h * 0.5, w, h, 0x02060a, 0.86).setScrollFactor(0);
    const panel = this.add.rectangle(w * 0.5, h * 0.5, 440, 360, 0x141a20, 0.98)
      .setScrollFactor(0).setStrokeStyle(2, 0xd7c087, 0.65);
    const goldLine = this.add.rectangle(w * 0.5, h * 0.5 - 130, 380, 1, 0xd7c087, 0.7).setScrollFactor(0);
    const title = this.add.text(w * 0.5, h * 0.5 - 150, "ПАУЗА", {
      fontFamily: "Georgia, serif", fontSize: "28px", color: "#f4ead5",
      fontStyle: "bold", letterSpacing: 4,
    }).setOrigin(0.5).setScrollFactor(0);
    const subtitle = this.add.text(w * 0.5, h * 0.5 - 108, "«Последний смотритель»", {
      fontFamily: "Georgia, serif", fontSize: "12px", color: "#d7c087", fontStyle: "italic",
    }).setOrigin(0.5).setScrollFactor(0);

    // About block (bottom)
    const aboutTitle = this.add.text(w * 0.5, h * 0.5 + 80, "О проекте", {
      fontFamily: "monospace", fontSize: "10px", color: "#8aacba", letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0);
    const aboutText = this.add.text(w * 0.5, h * 0.5 + 110,
      "Прототип работы по дисциплине «Разработка мультимедийных приложений».\nPhaser 3 · без бандлера. Автор: Янис (из игры — это ты).",
      {
        fontFamily: "Georgia, serif", fontSize: "11px", color: "#a8b4bc",
        align: "center", lineSpacing: 4,
      }
    ).setOrigin(0.5).setScrollFactor(0);

    layer.add([backdrop, panel, goldLine, title, subtitle, aboutTitle, aboutText]);
    this.registerUiObjects?.([backdrop, panel, goldLine, title, subtitle, aboutTitle, aboutText]);

    // Buttons
    const buttons = [
      { label: "Продолжить", y: h * 0.5 - 60, action: () => this.closePauseMenu() },
      { label: "Начать заново", y: h * 0.5 - 8, action: () => {
          if (window.__LAST_KEEPER_PREVIEW_TEST_API__?.resetPreview) {
            this.closePauseMenu();
            window.__LAST_KEEPER_PREVIEW_TEST_API__.resetPreview();
          } else {
            window.location.reload();
          }
        } },
      { label: "Полноэкранный режим", y: h * 0.5 + 44, action: () => { this.closePauseMenu(); this.toggleFullscreen(); } },
    ];
    const buttonHandlers = [];
    buttons.forEach(({ label, y, action }) => {
      const bg = this.add.rectangle(w * 0.5, y, 280, 36, 0x1f2a32, 1)
        .setScrollFactor(0).setStrokeStyle(2, 0xd7c087, 0.55).setInteractive({ useHandCursor: true });
      const txt = this.add.text(w * 0.5, y, label, {
        fontFamily: "Georgia, serif", fontSize: "15px", color: "#f4ead5",
      }).setOrigin(0.5).setScrollFactor(0);
      bg.on("pointerover", () => bg.setStrokeStyle(2, 0xe1bb73, 0.95));
      bg.on("pointerout", () => bg.setStrokeStyle(2, 0xd7c087, 0.55));
      bg.on("pointerdown", action);
      layer.add([bg, txt]);
      this.registerUiObjects?.([bg, txt]);
      buttonHandlers.push(bg);
    });

    this.tweens.add({
      targets: layer, alpha: { from: 0, to: 1 }, duration: 220, ease: "quad.out",
    });

    this.pauseMenuLayer = layer;
  }

  closePauseMenu() {
    if (!this.pauseMenuActive) return;
    this.pauseMenuActive = false;
    if (this.pauseMenuLayer) {
      const layer = this.pauseMenuLayer;
      this.pauseMenuLayer = null;
      this.tweens.add({
        targets: layer, alpha: 0, duration: 160, ease: "quad.in",
        onComplete: () => layer.destroy(),
      });
    }
  }

  toggleFullscreen() {
    if (!this.scale) {
      return;
    }

    try {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
        this.showMessage("Полноэкранный режим выключен.");
      } else {
        this.scale.startFullscreen();
        this.showMessage("Полноэкранный режим включен.");
      }
    } catch {
      this.showMessage("Браузер не дал переключить полноэкранный режим.");
    }
  }

  playSceneIntro(title, text, hold) {
    // Scale hold time with text length so long narrative intros aren't cut off.
    if (hold == null) {
      const length = String(text ?? "").length;
      hold = Math.min(7000, Math.max(1400, 1400 + length * 28));
    }
    if (!this.transitionShade) {
      return;
    }

    this.sceneIntroActive = true;

    if (this.cameras?.main) {
      this.cameras.main.setZoom(1.04);
      this.tweens.add({
        targets: this.cameras.main,
        zoom: 1,
        duration: hold + 520,
        ease: "sine.out",
      });
    }

    this.tweens.killTweensOf([
      this.transitionShade,
      this.transitionAccent,
      this.transitionTitle,
      this.transitionText,
    ]);

    this.transitionShade.setVisible(true).setAlpha(0);
    this.transitionAccent.setVisible(true).setAlpha(0).setScale(0.72, 1);
    this.transitionTitle.setVisible(true).setAlpha(0).setText(title).setY(this.scale.height * 0.5 - 48);
    this.transitionText.setVisible(true).setAlpha(0).setText(text).setY(this.scale.height * 0.5 + 34);

    this.tweens.add({
      targets: [this.transitionShade],
      alpha: 0.76,
      duration: 260,
      ease: "quad.out",
    });

    this.tweens.add({
      targets: [this.transitionAccent, this.transitionTitle, this.transitionText],
      alpha: 1,
      duration: 320,
      ease: "quad.out",
      onComplete: () => {
        this.time.delayedCall(hold, () => {
          this.tweens.add({
            targets: [this.transitionShade, this.transitionAccent, this.transitionTitle, this.transitionText],
            alpha: 0,
            duration: 360,
            ease: "quad.in",
            onComplete: () => {
              this.sceneIntroActive = false;
              this.transitionShade.setVisible(false);
              this.transitionAccent.setVisible(false);
              this.transitionTitle.setVisible(false);
              this.transitionText.setVisible(false);
            },
          });
        });
      },
    });
    this.tweens.add({
      targets: this.transitionAccent,
      scaleX: 1,
      duration: 320,
      ease: "quad.out",
    });
    this.tweens.add({
      targets: this.transitionTitle,
      y: this.scale.height * 0.5 - 68,
      duration: 320,
      ease: "quad.out",
    });
    this.tweens.add({
      targets: this.transitionText,
      y: this.scale.height * 0.5 + 12,
      duration: 320,
      ease: "quad.out",
    });
  }

  transitionToScene(sceneKey, data, title, text, hold = 180) {
    if (this.sceneTransitionActive || !this.transitionShade) {
      this.scene.start(sceneKey, data);
      return;
    }

    this.dismissSceneIntro();
    this.sceneTransitionActive = true;
    this.transitionShade.setVisible(true).setAlpha(0);
    this.transitionAccent.setVisible(true).setAlpha(0);
    this.transitionTitle.setVisible(true).setAlpha(0).setText(title);
    this.transitionText.setVisible(true).setAlpha(0).setText(text);

    this.tweens.add({
      targets: [this.transitionShade],
      alpha: 0.94,
      duration: 260,
      ease: "quad.out",
    });

    this.tweens.add({
      targets: [this.transitionAccent, this.transitionTitle, this.transitionText],
      alpha: 1,
      duration: 240,
      ease: "quad.out",
      onComplete: () => {
        this.time.delayedCall(hold, () => {
          this.scene.start(sceneKey, data);
        });
      },
    });
  }

  openScrewPanel({ title, description, accent, onComplete }) {
    this.openOverlay(title, description);

    // Frame background
    const frame = this.add.rectangle(0, 10, 520, 260, 0x0a1218, 0.96).setStrokeStyle(2, 0x3a4a52, 0.4);
    this.overlayContent.add(frame);

    // Panel with accent-based surface + shadow
    const panelShadow = this.add.rectangle(4, 14, 400, 240, 0x000000, 0.45);
    const panel = this.add.rectangle(0, 10, 400, 230, accent, 0.97).setStrokeStyle(4, 0xe3c47b, 0.38);
    // Surface texture: ribbed highlight lines + a darker "shadow" at bottom
    const surfaceGfx = this.add.graphics();
    surfaceGfx.fillStyle(0xffffff, 0.06);
    surfaceGfx.fillRect(-196, -96, 392, 8);
    surfaceGfx.fillStyle(0x000000, 0.2);
    surfaceGfx.fillRect(-196, 110, 392, 10);
    // Subtle grain lines
    surfaceGfx.lineStyle(1, 0x000000, 0.14);
    for (let y = -80; y <= 98; y += 18) {
      surfaceGfx.beginPath(); surfaceGfx.moveTo(-196, 10 + y); surfaceGfx.lineTo(196, 10 + y); surfaceGfx.strokePath();
    }
    // Inner recessed window showing the mechanism underneath
    const innerShadow = this.add.rectangle(2, 14, 268, 146, 0x000000, 0.55);
    const inner = this.add.rectangle(0, 12, 264, 144, 0x0d1419, 0.96).setStrokeStyle(3, 0xaebfc6, 0.25);
    // Hint of what's underneath — horizontal circuitry/wiring pattern
    const innerTex = this.add.graphics();
    innerTex.lineStyle(1, 0x4a5a62, 0.7);
    for (let y = -56; y <= 56; y += 16) {
      innerTex.beginPath(); innerTex.moveTo(-128, 12 + y); innerTex.lineTo(128, 12 + y); innerTex.strokePath();
    }
    innerTex.fillStyle(0xe3c47b, 0.35);
    [[-90, -40], [60, -8], [-20, 28], [88, 44]].forEach(([ox, oy]) => {
      innerTex.fillCircle(ox, 12 + oy, 2.4);
    });
    this.overlayContent.add([panelShadow, panel, surfaceGfx, innerShadow, inner, innerTex]);

    // Progress pips (top-right)
    const pipsY = -98;
    const pips = [];
    for (let i = 0; i < 4; i += 1) {
      const pip = this.add.circle(132 + i * 14, pipsY, 4, 0x2a3540, 1).setStrokeStyle(1, 0x5a7080, 0.7);
      pips.push(pip);
      this.overlayContent.add(pip);
    }
    const pipsLabel = this.add.text(118, pipsY, "Винты:", {
      fontFamily: "monospace", fontSize: "9px", color: "#d7c087",
    }).setOrigin(1, 0.5);
    this.overlayContent.add(pipsLabel);

    const instruction = this.add.text(0, 146, "Кликай по винтам, чтобы выкрутить их по одному. Когда все четыре уйдут — крышка снимется.", {
      fontFamily: "Georgia, serif", fontSize: "13px", color: "#dde7ea", align: "center",
      wordWrap: { width: 460 },
    }).setOrigin(0.5);
    this.overlayContent.add(instruction);

    let remaining = 4;
    let removedCount = 0;
    const positions = [
      [-130, -50],
      [130, -50],
      [-130, 70],
      [130, 70],
    ];

    positions.forEach(([x, y], idx) => {
      // Socket well (dark recess where screw sits)
      const socket = this.add.circle(x, y, 17, 0x0a0e10, 0.92).setStrokeStyle(2, 0x5a4a30, 0.85);
      // Screw head with Phillips cross
      const screw = this.add.container(x, y).setSize(40, 40);
      const plateShadow = this.add.circle(1, 1, 13, 0x000000, 0.5);
      const plate = this.add.circle(0, 0, 13, 0xcdd6db, 1).setStrokeStyle(2, 0x667985, 0.85);
      // Metallic gradient hint
      const plateHi = this.add.circle(-3, -4, 8, 0xffffff, 0.2);
      const slotA = this.add.rectangle(0, 0, 16, 3, 0x2a3540, 1);
      const slotB = this.add.rectangle(0, 0, 3, 16, 0x2a3540, 1);
      screw.add([plateShadow, plate, plateHi, slotA, slotB]);
      // Ring glow on hover
      const hoverRing = this.add.circle(x, y, 18, 0xe3c47b, 0).setStrokeStyle(2, 0xe3c47b, 0);
      this.overlayContent.add([socket, hoverRing, screw]);

      this.createOverlayRectHotspot(x, y, 44, 44, {
        pointerover: () => { hoverRing.setStrokeStyle(2, 0xe3c47b, 0.85); },
        pointerout: () => { hoverRing.setStrokeStyle(2, 0xe3c47b, 0); },
        pointerdown: () => {
          if (screw._removing) return;
          screw._removing = true;
          hoverRing.setStrokeStyle(2, 0xe3c47b, 0);
          // Spin in place, then lift and fade out
          this.tweens.add({
            targets: screw, angle: 540, duration: 260, ease: "cubic.in",
            onComplete: () => {
              this.tweens.add({
                targets: screw,
                y: screw.y - 48,
                x: screw.x + Phaser.Math.Between(-10, 10),
                alpha: 0, angle: 720, duration: 280, ease: "quad.out",
                onComplete: () => {
                  screw.destroy();
                  // Empty socket stays; light a highlight in it for feedback
                  socket.setFillStyle(0x2a2018, 1);
                  socket.setStrokeStyle(2, 0x8a6a3a, 0.6);
                  // Advance pip
                  if (pips[removedCount]) {
                    pips[removedCount].setFillStyle(0x7de08f, 1);
                    pips[removedCount].setStrokeStyle(1, 0x7de08f, 0.9);
                  }
                  removedCount += 1;
                  remaining -= 1;
                  if (remaining === 0) {
                    // Panel slides down-off, inner window brightens
                    this.tweens.add({ targets: inner, fillAlpha: 0, duration: 220 });
                    this.tweens.add({
                      targets: [panel, panelShadow, surfaceGfx],
                      y: "+=28", alpha: 0, duration: 320, ease: "quad.in",
                    });
                    this.cameras.main.shake(100, 0.0014);
                    this.time.delayedCall(340, () => {
                      this.closeOverlay();
                      onComplete();
                      this.syncHud();
                    });
                  } else {
                    this.cameras.main.shake(40, 0.0006);
                  }
                },
              });
            },
          });
        },
      });
    });
  }
  createOverlayRectHotspot(localX, localY, width, height, handlers = {}) {
    const hotspot = {
      localX,
      localY,
      width,
      height,
      x: this.overlayContent.x + localX,
      y: this.overlayContent.y + localY,
      handlers,
    };
    this.overlayHotspots.push(hotspot);
    this.drawDebugHitboxes();
    return hotspot;
  }
  refreshOverlayHotspots() {
    if (!this.overlayHotspots.length) {
      return;
    }
    this.overlayHotspots.forEach((hotspot) => {
      hotspot.x = this.overlayContent.x + hotspot.localX;
      hotspot.y = this.overlayContent.y + hotspot.localY;
    });
    this.drawDebugHitboxes();
  }
  clearOverlayHotspots() {
    if (!this.overlayHotspots.length) {
      return;
    }
    if (this.hoveredOverlayHotspot?.handlers?.pointerout) {
      this.hoveredOverlayHotspot.handlers.pointerout(this.input.activePointer, this.hoveredOverlayHotspot);
    }
    this.hoveredOverlayHotspot = null;
    this.overlayHotspots = [];
    this.drawDebugHitboxes();
  }

  createDebugHitboxLayer() {
    if (!this.debugHitboxesEnabled || this.debugWorldGraphics) {
      return;
    }

    this.debugWorldGraphics = this.add.graphics().setDepth(44);
    this.debugOverlayGraphics = this.add.graphics().setDepth(109).setScrollFactor(0);
    this.registerUiObjects(this.debugOverlayGraphics);
  }

  drawDebugHitboxes() {
    if (!this.debugHitboxesEnabled || !this.debugWorldGraphics || !this.debugOverlayGraphics) {
      return;
    }

    this.debugWorldGraphics.clear();
    this.debugOverlayGraphics.clear();

    this.sceneInteractables.forEach((item) => {
      if (!this.isInteractableVisible(item)) {
        return;
      }

      const bounds = this.getInteractableBounds(item);
      const isHovered = item === this.hoveredInteractable;
      const color = isHovered ? 0xffc857 : 0x4ae2d9;
      const alpha = isHovered ? 0.95 : 0.72;
      this.debugWorldGraphics.lineStyle(2, color, alpha);
      this.debugWorldGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

      if (item.prompt) {
        this.debugWorldGraphics.fillStyle(color, 0.12);
        this.debugWorldGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
    });

    if (!this.overlayActive) {
      return;
    }

    this.overlayHotspots.forEach((hotspot) => {
      const left = hotspot.x - hotspot.width * 0.5;
      const top = hotspot.y - hotspot.height * 0.5;
      this.debugOverlayGraphics.lineStyle(2, 0xff5ea8, 0.92);
      this.debugOverlayGraphics.strokeRect(left, top, hotspot.width, hotspot.height);
      this.debugOverlayGraphics.fillStyle(0xff5ea8, 0.08);
      this.debugOverlayGraphics.fillRect(left, top, hotspot.width, hotspot.height);
    });
  }
}

