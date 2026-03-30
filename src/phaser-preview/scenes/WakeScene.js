import {
  getWakeInteractionText,
  getWakeObjective,
  interactables,
  ITEM_DEFINITIONS,
} from "../data/wakeData.js";
import {
  buildWakeEnvironment,
  createItemIcon,
  createWakeGround,
  createWakePlayer,
  updateWakeAmbient,
  updateWakePlayerVisuals,
} from "../render/wakeArt.js";
import { PreviewSceneBase } from "./PreviewSceneBase.js";
import { getPreviewSession } from "../state/previewSession.js";

const Phaser = window.Phaser;

export class WakeScene extends PreviewSceneBase {
  constructor() {
    super("wake-preview");
    this.entry = "spawn";
  }

  init(data) {
    this.entry = data?.entry ?? "spawn";
  }

  create() {
    this.session = getPreviewSession();
    this.session.stage = "wake";

    buildWakeEnvironment(this);
    createWakeGround(this);
    createWakePlayer(this);
    this.placePlayer();
    this.createCamera();
    this.createPromptBubble();
    this.createWorldFocusMarker();
    this.createMessagePanel();
    this.createOverlayLayer();
    this.createTransitionLayer();
    this.createInventoryBar();
    this.bindCommonKeys();
    this.registerInteractables(interactables, (target) => this.handleInteraction(target));
    this.bindCommonResize();
    this.refreshInventoryBar();
    this.syncHud();
    this.playSceneIntro(
      "Комната смотрителя",
      this.entry === "spawn"
        ? "Пробуждение начинается в тесной комнате под штормовой башней. Здесь лежат первые следы, первые инструменты и первые ответы."
        : "Жилой ярус снова встречает запахом соли, сырого дерева и чьего-то недавнего присутствия."
    );
  }

  update(time) {
    updateWakeAmbient(this, time);

    if (this.overlayActive) {
      this.playerBody.body.setVelocityX(0);
      this.updatePrompt(null);
      return;
    }

    this.updatePlayerMovement();
    this.handleDoorThreshold();
    updateWakePlayerVisuals(this);
    this.updateScenePrompt();
  }

  getStageLabel() {
    return "Phaser Preview: комната смотрителя";
  }

  getObjectiveText() {
    return getWakeObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(560, 0, 1640, 720, 160, 90);
  }

  placePlayer() {
    if (this.entry === "from-lantern") {
      this.playerBody.setPosition(1538, 526);
    } else if (this.entry === "from-shore") {
      this.playerBody.setPosition(1760, 526);
    } else {
      this.playerBody.setPosition(860, 526);
    }
  }

  transitionOutside() {
    if (this.sceneTransitionActive) {
      return;
    }

    this.session.stage = "shore";
    this.session.progressStage = "shore";
    this.transitionToScene(
      "shore-preview",
      { entry: "from-wake" },
      "Основание маяка",
      "Комната остаётся позади. Ветер сразу бьёт в лицо, а башня начинает ощущаться как единое живое место."
    );
  }

  handleDoorThreshold() {
    if (this.sceneTransitionActive || this.overlayActive) {
      return;
    }

    const door = interactables.find((item) => item.id === "room-door");
    if (!door) {
      return;
    }

    const bounds = door.hitbox ?? door;
    const bodyWidth = this.playerBody.body.width || 34;
    const playerFrontX = this.playerBody.x + bodyWidth * 0.5;
    const pushingThroughDoor = this.cursors.right.isDown || this.keys.right.isDown;
    const touchingDoorway = playerFrontX >= bounds.x - 6;

    if (touchingDoorway && pushingThroughDoor) {
      this.session.wakeProgress.cluesChecked = true;
      this.transitionOutside();
    }
  }

  handleInteraction(target) {
    switch (target.id) {
      case "clutter":
        this.openDrawerOverlay();
        break;
      case "leaf-pile":
        if (this.session.wakeProgress.leavesMoved) {
          this.showNarration(getWakeInteractionText(this.session, target.id));
        } else {
          this.openLeafInspectionOverlay();
        }
        break;
      case "footprints-room":
        this.session.wakeProgress.cluesChecked = true;
        this.showNarration(getWakeInteractionText(this.session, target.id));
        break;
      case "room-door":
        this.session.wakeProgress.cluesChecked = true;
        this.transitionOutside();
        break;
      case "tower-ladder":
        this.session.stage = "lantern";
        this.transitionToScene(
          "lantern-preview",
          { entry: "from-wake" },
          "Фонарь маяка",
          "Металлическая лестница выводит к сердцу башни, туда, где должен оживать прожектор."
        );
        break;
      default:
        this.showNarration(getWakeInteractionText(this.session, target.id));
        break;
    }
  }

  openDrawerOverlay() {
    this.openOverlay(
      "Ящик под столом",
      "Внутри остались батарея и записка. Забирай их по одному, чтобы потом использовать дальше по сюжету."
    );
    this.overlayKind = "inventory";

    const base = this.add.rectangle(0, 54, 700, 230, 0x191f26, 0.86).setStrokeStyle(2, 0x7b8e95, 0.16);
    this.overlayContent.add(base);

    if (this.session.drawerItems.length === 0) {
      const emptyText = this.add.text(0, 26, "Ящик уже пуст. Внутри только соль, пыль и царапины от тяжёлых ключей.", {
        fontFamily: "Georgia, serif",
        fontSize: "20px",
        color: "#d2dbe0",
        align: "center",
        wordWrap: { width: 520 },
      }).setOrigin(0.5);
      this.overlayContent.add(emptyText);
      return;
    }

    this.session.drawerItems.forEach((itemId, index) => {
      const cardX = this.session.drawerItems.length === 1 ? 0 : -180 + index * 360;
      const card = this.createDrawerItemCard(itemId, cardX, 28);
      this.overlayContent.add(card);
    });
  }

  createDrawerItemCard(itemId, x, y) {
    const cardWidth = 236;
    const cardHeight = 174;
    const hotspotWidth = 212;
    const hotspotHeight = 160;
    const card = this.add.container(x, y).setSize(cardWidth, cardHeight);
    const background = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x131920, 0.98).setStrokeStyle(2, 0xe1bb73, 0.24);
    const title = this.add.text(0, -60, ITEM_DEFINITIONS[itemId].label, {
      fontFamily: "Georgia, serif",
      fontSize: "22px",
      color: "#f4ead5",
      align: "center",
      wordWrap: { width: 190 },
    }).setOrigin(0.5);
    const icon = createItemIcon(this, itemId, 0, -8, "overlay");
    const description = this.add.text(0, 38, ITEM_DEFINITIONS[itemId].description, {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#b9cad0",
      align: "center",
      wordWrap: { width: 188 },
    }).setOrigin(0.5);
    const action = this.add.text(0, 68, "Кликни, чтобы забрать", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#d7c087",
    }).setOrigin(0.5);

    card.add([background, title, icon, description, action]);

    this.createOverlayRectHotspot(x, y, hotspotWidth, hotspotHeight, {
      pointerover: () => background.setStrokeStyle(3, 0xe1bb73, 0.72),
      pointerout: () => background.setStrokeStyle(2, 0xe1bb73, 0.24),
      pointerdown: () => {
        Phaser.Utils.Array.Remove(this.session.drawerItems, itemId);
        this.addInventoryItem(itemId);
        this.tweens.add({
          targets: card,
          alpha: 0,
          scaleX: 0.94,
          scaleY: 0.94,
          duration: 140,
        });

        if (itemId === "note") {
          this.showNarration("Записка добавлена в инвентарь. Открыть её можно через I или нижнюю панель.");
        } else if (itemId === "battery") {
          this.showNarration("Батарея добавлена в инвентарь. Позже она пригодится на служебном уровне.");
        }

        this.time.delayedCall(150, () => this.openDrawerOverlay());
      },
    });

    return card;
  }

  openLeafInspectionOverlay() {
    this.openOverlay(
      "Листья у стены",
      "Разгреби мокрые листья вручную. Можно кликать по ним или просто вести мышью с зажатой кнопкой, чтобы расчистить тайник."
    );
    this.overlayKind = "custom";

    const ground = this.add.rectangle(0, 108, 420, 90, 0x243238, 0.5).setStrokeStyle(2, 0x6c8c8e, 0.12);
    const baseShadow = this.add.ellipse(0, 102, 360, 38, 0x000000, 0.14);
    const status = this.add.text(0, 154, "Разгребено: 0 / 8", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    const sweepHint = this.add.text(0, 178, "Кликай по листьям или веди курсор по куче с зажатой кнопкой", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#d7c087",
      align: "center",
      wordWrap: { width: 460 },
    }).setOrigin(0.5);
    this.overlayContent.add([baseShadow, ground, status, sweepHint]);

    const leaves = [];
    const updateStatus = () => {
      status.setText(`Разгребено: ${8 - leaves.length} / 8`);
    };

    const revealScrewdriver = () => {
      if (screwdriver.alpha > 0) {
        return;
      }
      screwdriver.setAlpha(1);
      screwdriverShadow.setAlpha(0.2);
      screwdriverLabel.setAlpha(1);
      this.tweens.add({
        targets: screwdriver,
        y: screwdriver.y - 8,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    };

    const scatterLeaf = (leaf) => {
      if (leaf.getData("removed")) {
        return;
      }

      leaf.setData("removed", true);
      const glow = leaf.getData("glow");
      if (glow) {
        glow.setFillStyle(0xe1bb73, 0.04);
      }
      this.tweens.add({
        targets: leaf,
        x: leaf.x + Phaser.Math.Between(-180, 180),
        y: leaf.y + Phaser.Math.Between(-90, 120),
        alpha: 0,
        angle: leaf.angle + Phaser.Math.Between(-50, 50),
        duration: 260,
        onComplete: () => {
          leaf.destroy();
          Phaser.Utils.Array.Remove(leaves, leaf);
          updateStatus();

          if (leaves.length === 0) {
            revealScrewdriver();
          }
        },
      });
    };

    const findNearestLeaf = (pointerX, pointerY) => {
      const localX = pointerX - this.overlayContent.x;
      const localY = pointerY - this.overlayContent.y;
      let nearest = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const leaf of leaves) {
        if (!leaf.active || leaf.getData("removed")) {
          continue;
        }

        const distance = Phaser.Math.Distance.Between(localX, localY, leaf.x, leaf.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = leaf;
        }
      }

      return bestDistance <= 120 ? nearest : null;
    };

    this.createOverlayRectHotspot(0, 24, 520, 230, {
      useHandCursor: false,
      pointerdown: (pointer) => {
        const leaf = findNearestLeaf(pointer.x, pointer.y);
        if (leaf) {
          scatterLeaf(leaf);
        }
      },
      pointermove: (pointer) => {
        if (!pointer.isDown) {
          return;
        }

        const leaf = findNearestLeaf(pointer.x, pointer.y);
        if (leaf) {
          scatterLeaf(leaf);
        }
      },
    });

    for (let index = 0; index < 8; index += 1) {
      const leaf = this.add.container(
        Phaser.Math.Between(-180, 180),
        Phaser.Math.Between(-24, 58)
      ).setAngle(Phaser.Math.Between(-36, 36));

      const glow = this.add.ellipse(0, 0, 188, 62, 0xe1bb73, 0.04);
      const shape = this.add.ellipse(
        0,
        0,
        Phaser.Math.Between(120, 168),
        Phaser.Math.Between(26, 42),
        Phaser.Math.RND.pick([0x6b5234, 0x7b5b39, 0x876546, 0x56462f]),
        0.96
      );

      leaf.setData("glow", glow);
      leaf.setData("removed", false);
      leaf.add([glow, shape]);

      leaves.push(leaf);
      this.overlayContent.add(leaf);
    }

    const screwdriverShadow = this.add.ellipse(0, 82, 110, 12, 0x000000, 0);
    const screwdriverLabel = this.add.text(0, 114, "Отвёртка найдена — кликни, чтобы забрать", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#d7c087",
      align: "center",
    }).setOrigin(0.5).setAlpha(0);
    const screwdriver = createItemIcon(this, "screwdriver", 0, 54, "overlay").setAlpha(0);

    this.overlayContent.add([screwdriverShadow, screwdriver, screwdriverLabel]);
    this.createOverlayRectHotspot(0, 54, 180, 40, {
      pointerover: () => {
        if (screwdriver.alpha > 0) {
          screwdriverLabel.setTint(0xf3deb1);
        }
      },
      pointerout: () => screwdriverLabel.clearTint(),
      pointerdown: () => {
        if (screwdriver.alpha <= 0) {
          return;
        }

        this.session.wakeProgress.leavesMoved = true;
        this.addInventoryItem("screwdriver");
        this.showNarration("Отвёртка добавлена в инвентарь. Теперь ею можно разбирать сервисные панели.");
        this.closeOverlay();
      },
    });
  }
}
