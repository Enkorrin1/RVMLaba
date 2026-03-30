import {
  INTERACTION_RANGE,
  INVENTORY_SLOT_COUNT,
  ITEM_DEFINITIONS,
  PLAYER_JUMP_SPEED,
  PLAYER_SPEED,
} from "../data/wakeData.js";
import { createItemIcon } from "../render/wakeArt.js";

const Phaser = window.Phaser;

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
    if (this.uiCamera) {
      return;
    }

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
  }

  createPromptBubble() {
    this.initializeSharpTextFactory();
    this.initializeUiCamera();
    this.createDebugHitboxLayer();
    this.promptContainer = this.add.container(0, 0).setDepth(50).setScrollFactor(0);
    this.promptBackground = this.add.rectangle(0, 0, 0, 48, 0x111923, 0.94).setStrokeStyle(2, 0xe4bf77, 0.58);
    this.promptText = this.add.text(0, 0, "", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#f4ead4",
      padding: { left: 20, right: 20, top: 12, bottom: 12 },
      align: "center",
    }).setOrigin(0.5);
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
    this.overlayHint = this.add.text(width * 0.5, height * 0.5 + 216, "Esc, чтобы закрыть", {
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
    this.inventoryBar = this.add.container(this.scale.width * 0.5, this.scale.height - 86).setDepth(70).setScrollFactor(0);
    const backgroundWidth = 120 + (INVENTORY_SLOT_COUNT - 1) * 90;
    this.inventoryBackground = this.add.rectangle(0, 0, backgroundWidth, 82, 0x0f151b, 0.9)
      .setStrokeStyle(2, 0xe0ba73, 0.16);
    this.inventoryHintLabel = this.add.text(0, -44, "I / Tab - инвентарь", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#d7c087",
      align: "center",
    }).setOrigin(0.5);
    this.inventoryBackground.setInteractive({ useHandCursor: true });
    this.inventoryBackground.on("pointerdown", () => this.handleInventoryKeyPress());
    this.inventoryBar.add([this.inventoryHintLabel, this.inventoryBackground]);
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

  bindCommonKeys(extraHandler) {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: "A",
      right: "D",
      jump: "W",
      interact: "E",
      space: "SPACE",
      tab: "TAB",
      close: "ESC",
      inventory: "I",
    });

    this.keys.close.on("down", () => {
      this.closeOverlay();
    });

    this.keys.inventory.on("down", () => {
      if (this.session.inventory.length === 0) {
        this.showMessage("Инвентарь пока пуст.");
        return;
      }

      this.showMessage(`Инвентарь: ${this.session.inventory.map((itemId) => ITEM_DEFINITIONS[itemId].label).join(", ")}`);
    });

    this.keys.inventory.removeAllListeners("down");
    this.keys.inventory.on("down", () => this.handleInventoryKeyPress());
    this.keys.tab.on("down", () => this.handleInventoryKeyPress());
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
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerdown", this.handlePointerDown, this);

    this.events.once("shutdown", () => {
      this.input.off("pointermove", this.handlePointerMove, this);
      this.input.off("pointerdown", this.handlePointerDown, this);
      this.input.setDefaultCursor("default");
      this.pointerRoutingBound = false;
    });
  }

  bindCommonResize() {
    this.scale.on("resize", ({ width, height }) => {
      if (this.uiCamera) {
        this.uiCamera.setViewport(0, 0, width, height);
        this.uiCamera.setSize(width, height);
      }

      this.messagePanel.setPosition(width * 0.5, height - 210);
      this.messageBackground.width = Math.min(760, width - 60);
      this.messageText.setWordWrapWidth(Math.min(680, width - 120));
      this.promptContainer.setPosition(width * 0.5, 86);
      this.inventoryBar.setPosition(width * 0.5, height - 86);

      if (this.overlayBackdrop) {
        this.overlayBackdrop.setPosition(width * 0.5, height * 0.5).setSize(width, height);
        this.overlayCard.setPosition(width * 0.5, height * 0.5).setSize(Math.min(920, width - 72), Math.min(560, height - 72));
        this.overlayTitle.setPosition(width * 0.5, height * 0.5 - 220);
        this.overlayText.setPosition(width * 0.5, height * 0.5 - 176);
        this.overlayText.setWordWrapWidth(Math.min(700, width - 140));
        this.overlayHint.setPosition(width * 0.5, height * 0.5 + 216);
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

    for (const item of interactables) {
      if (item.visible && !item.visible(this.session)) {
        continue;
      }

      const centerX = item.x + item.width * 0.5;
      const centerY = item.y + item.height * 0.5;
      const distance = Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, centerX, centerY);

      if (distance > range) {
        continue;
      }

      if (distance < bestDistance) {
        nearest = item;
        bestDistance = distance;
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

    this.keys.interact.on("down", () => {
      if (this.overlayActive || this.sceneTransitionActive) {
        return;
      }

      const target = this.getCurrentInteractionTarget();
      if (target) {
        handler(target);
      }
    });

    this.drawDebugHitboxes();
  }

  isInteractableVisible(item) {
    return !item.visible || item.visible(this.session);
  }

  canReachInteractable(item, range = this.sceneInteractionRange) {
    const bounds = this.getInteractableBounds(item);
    const centerX = bounds.x + bounds.width * 0.5;
    const centerY = bounds.y + bounds.height * 0.5;
    return Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, centerX, centerY) <= range;
  }

  syncInteractionZones() {
    if (
      this.hoveredInteractable
      && (
        this.overlayActive
        || this.sceneTransitionActive
        || !this.isInteractableVisible(this.hoveredInteractable)
      )
    ) {
      this.hoveredInteractable = null;
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
    this.promptBackground.width = Math.max(240, this.promptText.width + 44);
    this.promptBackground.height = this.promptText.height + 22;
    this.promptContainer.setPosition(this.scale.width * 0.5, 86);
    this.promptContainer.setVisible(true);

    if (this.focusMarker) {
      this.focusMarker.setVisible(true);
      const bounds = this.getInteractableBounds(target);
      this.focusMarker.setPosition(bounds.x + bounds.width * 0.5, bounds.y - 16);
    }

    this.drawDebugHitboxes();
  }

  syncHud() {
    const stageNode = document.getElementById("previewStage");
    const objectiveNode = document.getElementById("previewObjective");
    const hintNode = document.getElementById("previewHint");
    const inventoryNode = document.getElementById("previewInventory");

    if (stageNode) {
      stageNode.textContent = this.getStageLabel();
    }

    if (objectiveNode) {
      objectiveNode.textContent = this.getObjectiveText();
    }

    if (hintNode) {
      hintNode.textContent = this.session.currentHint;
    }

    if (inventoryNode) {
      inventoryNode.textContent = this.session.inventory.length
        ? `Инвентарь: ${this.session.inventory.map((itemId) => ITEM_DEFINITIONS[itemId].label).join(", ")}`
        : "Инвентарь: пусто";
    }
  }

  getStageLabel() {
    return "Phaser Preview";
  }

  getObjectiveText() {
    return "";
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
  }

  handleInventoryKeyPress() {
    if (this.overlayActive) {
      if (this.overlayKind === "inventory") {
        this.closeOverlay();
      }
      return;
    }

    if (this.session.inventory.length === 0) {
      this.showMessage("Инвентарь пока пуст.");
      return;
    }

    this.openInventoryOverlay();
  }

  openInventoryOverlay() {
    this.openOverlay(
      "Инвентарь",
      "Выбери предмет для следующего действия. Записки и журналы можно открыть прямо отсюда."
    );
    this.overlayKind = "inventory";
    const tray = this.add.rectangle(0, 34, 620, 250, 0x151c22, 0.9).setStrokeStyle(2, 0x7b8e95, 0.18);
    this.overlayContent.add(tray);
    this.session.inventory.forEach((itemId, index) => {
      const x = this.session.inventory.length === 1 ? 0 : -180 + index * 180;
      const card = this.add.container(x, 26).setSize(160, 180);
      const isSelected = itemId === this.session.selectedItemId;
      const background = this.add.rectangle(0, 0, 160, 180, 0x131920, 0.98)
        .setStrokeStyle(3, isSelected ? 0xe1bb73 : 0x4b5b63, isSelected ? 0.78 : 0.28);
      const title = this.add.text(0, -60, ITEM_DEFINITIONS[itemId].label, {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#f4ead5",
        align: "center",
        wordWrap: { width: 136 },
      }).setOrigin(0.5);
      const icon = createItemIcon(this, itemId, 0, -8, "overlay");
      const description = this.add.text(0, 46, ITEM_DEFINITIONS[itemId].description, {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#b9cad0",
        align: "center",
        wordWrap: { width: 128 },
      }).setOrigin(0.5);
      const action = this.add.text(0, 76, ITEM_DEFINITIONS[itemId].readable ? "Клик: открыть" : "Клик: выбрать", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#d7c087",
      }).setOrigin(0.5);
      card.add([background, title, icon, description, action]);
      this.overlayContent.add(card);
      this.createOverlayRectHotspot(x, 26, 160, 180, {
        pointerover: () => background.setStrokeStyle(3, 0xe1bb73, 0.82),
        pointerout: () => {
          const selectedNow = itemId === this.session.selectedItemId;
          background.setStrokeStyle(3, selectedNow ? 0xe1bb73 : 0x4b5b63, selectedNow ? 0.78 : 0.28);
        },
        pointerdown: () => {
          this.session.selectedItemId = itemId;
          this.refreshInventoryBar();
          if (ITEM_DEFINITIONS[itemId].readable) {
            this.openReadableItemOverlay(itemId);
            return;
          }
          this.closeOverlay();
          this.showNarration(`${ITEM_DEFINITIONS[itemId].label} выбран.`);
        },
      });
    });
  }
  openOverlay(title, description) {
    this.overlayActive = true;
    this.overlayKind = "custom";
    this.syncInteractionZones();
    this.updatePrompt(null);
    this.clearOverlayHotspots();
    this.overlayBackdrop.setVisible(true).setAlpha(0);
    this.overlayCard.setVisible(true).setScale(0.96).setAlpha(0);
    this.overlayTitle.setVisible(true).setText(title).setAlpha(0);
    this.overlayText.setVisible(true).setText(description).setAlpha(0);
    this.overlayHint.setVisible(true).setAlpha(0);
    this.overlayContent.setVisible(true).setScale(0.98).setAlpha(0);
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
      onComplete: () => this.drawDebugHitboxes(),
    });
  }

  closeOverlay() {
    if (!this.overlayActive) {
      return;
    }

    this.overlayKind = null;
    this.tweens.add({
      targets: this.overlayBackdrop,
      alpha: 0,
      duration: 140,
      ease: "quad.in",
      onComplete: () => {
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
        this.overlayCard.setVisible(false);
        this.overlayTitle.setVisible(false);
        this.overlayText.setVisible(false);
        this.overlayHint.setVisible(false);
        this.overlayContent.setVisible(false);
        this.overlayContent.removeAll(true);
        this.clearOverlayHotspots();
        this.overlayCard.setScale(1);
        this.overlayContent.setScale(1);
        this.syncInteractionZones();
        this.drawDebugHitboxes();
      },
    });
  }

  openReadableItemOverlay(itemId) {
    const item = ITEM_DEFINITIONS[itemId];
    if (!item?.readable) {
      return;
    }

    this.openOverlay(item.documentTitle, "Документ из инвентаря. Текст сохранён из основной логики игры.");

    const paper = this.add.rectangle(0, 20, 520, 300, 0xd8d0bd, 1).setStrokeStyle(2, 0x7a6a56, 0.38);
    const title = this.add.text(0, -94, item.documentTitle, {
      fontFamily: "Georgia, serif",
      fontSize: "26px",
      color: "#352b22",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const body = this.add.text(0, 8, item.documentText, {
      fontFamily: "Georgia, serif",
      fontSize: "22px",
      color: "#3f362e",
      align: "center",
      wordWrap: { width: 420 },
    }).setOrigin(0.5);
    this.overlayContent.add([paper, title, body]);
  }

  showMessage(text) {
    this.messageText.setText(text);
    this.messagePanel.setVisible(true);
    if (this.hideMessageEvent) {
      this.time.removeEvent(this.hideMessageEvent);
    }
    this.hideMessageEvent = this.time.delayedCall(2800, () => {
      this.messagePanel.setVisible(false);
    });
  }

  playSceneIntro(title, text, hold = 760) {
    if (!this.transitionShade) {
      return;
    }

    this.tweens.killTweensOf([
      this.transitionShade,
      this.transitionAccent,
      this.transitionTitle,
      this.transitionText,
    ]);

    this.transitionShade.setVisible(true).setAlpha(0);
    this.transitionAccent.setVisible(true).setAlpha(0);
    this.transitionTitle.setVisible(true).setAlpha(0).setText(title);
    this.transitionText.setVisible(true).setAlpha(0).setText(text);

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
              this.transitionShade.setVisible(false);
              this.transitionAccent.setVisible(false);
              this.transitionTitle.setVisible(false);
              this.transitionText.setVisible(false);
            },
          });
        });
      },
    });
  }

  transitionToScene(sceneKey, data, title, text, hold = 180) {
    if (this.sceneTransitionActive || !this.transitionShade) {
      this.scene.start(sceneKey, data);
      return;
    }

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
    const panel = this.add.rectangle(0, 18, 390, 240, accent, 0.92).setStrokeStyle(4, 0xe3c47b, 0.24);
    const inner = this.add.rectangle(0, 18, 260, 140, 0x202932, 0.75).setStrokeStyle(3, 0xaebfc6, 0.18);
    const instruction = this.add.text(0, 154, "Кликай по винтам, чтобы выкрутить их по одному.", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#dde7ea",
      align: "center",
    }).setOrigin(0.5);
    this.overlayContent.add([panel, inner, instruction]);
    let remaining = 4;
    const positions = [
      [-112, -42],
      [112, -42],
      [-112, 78],
      [112, 78],
    ];
    positions.forEach(([x, y]) => {
      const screw = this.add.container(x, y).setSize(40, 40);
      const plate = this.add.circle(0, 0, 14, 0xcdd6db, 1).setStrokeStyle(3, 0x667985, 0.36);
      const slotA = this.add.rectangle(0, 0, 18, 3, 0x4d5a64, 1);
      const slotB = this.add.rectangle(0, 0, 3, 18, 0x4d5a64, 1);
      screw.add([plate, slotA, slotB]);
      this.createOverlayRectHotspot(x, y, 40, 40, {
        pointerdown: () => {
          this.tweens.add({
            targets: screw,
            y: screw.y - 42,
            alpha: 0,
            angle: 220,
            duration: 260,
            onComplete: () => {
              screw.destroy();
              remaining -= 1;
              if (remaining === 0) {
                this.time.delayedCall(180, () => {
                  this.closeOverlay();
                  onComplete();
                  this.syncHud();
                });
              }
            },
          });
        },
      });
      this.overlayContent.add(screw);
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

