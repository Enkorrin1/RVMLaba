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
    this.setupSceneChrome(interactables, (target) => this.handleInteraction(target));

    if (this.entry === "spawn") {
      // First beat: a slight disorientation shake as Янис gets off the floor
      this.cameras.main.shake(420, 0.0018);
      this.cameras.main.flash(180, 10, 10, 14, true);
      this.playSceneIntro(
        "Жилая комната маяка",
        "Шторм. Голова тяжёлая, одежда ещё мокрая, солёный привкус на губах. Ты с трудом поднимаешься с пола, держась за край кровати. Последнее, что в памяти — треск мачты, удар о камни и холодная чёрная вода."
      );
      // Secondary narration — appears a beat later, once the intro fades.
      this.time.delayedCall(2600, () => {
        if (this.overlayActive || this.sceneTransitionActive) return;
        this.showNarration("Комната чужая: кровать, следы грязи по полу, мокрые листья у стены. Кто-то сюда тебя принёс. Осмотрись — в ящике стола должно найтись то, что тебя восстановит в памяти.");
      });
    } else {
    }
  }

  update(time) {
    updateWakeAmbient(this, time);

    if (this.overlayActive) {
      this.playerBody.body.setVelocityX(0);
      this.updatePrompt(null);
      return;
    }

    this.updatePlayerMovement();
    updateWakePlayerVisuals(this);
    this.updateScenePrompt();
  }

  getStageLabel() {
    return "Жилая комната маяка";
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
      // Spawn beside the bed (bed center ~x=878), Янис поднимается рядом
      this.playerBody.setPosition(958, 526);
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

  handleInteraction(target) {
    switch (target.id) {
      case "clutter":
        this.focusOnInteractable(target, () => this.openDrawerOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 70,
        });
        break;
      case "leaf-pile":
        if (this.session.wakeProgress.leavesMoved) {
          this.showNarration(getWakeInteractionText(this.session, target.id));
        } else {
          this.focusOnInteractable(target, () => this.openLeafInspectionOverlay(), {
            zoom: 1.07,
            duration: 170,
            hold: 70,
          });
        }
        break;
      case "footprints-room":
        this.session.wakeProgress.cluesChecked = true;
        this.emitWorldPulse(target.x + target.width * 0.5, target.y + target.height * 0.5, {
          color: 0xd7c087,
          radius: 18,
          scale: 2.4,
          duration: 560,
        });
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

    // Spread cards evenly across the drawer panel — never exceed its 700px width.
    // Use tighter card widths when the drawer holds 3+ items.
    const n = this.session.drawerItems.length;
    const panelInner = 640;
    const compact = n >= 3;
    const cardW = compact ? 180 : 236;
    const gap = compact ? 18 : 28;
    const totalW = n * cardW + (n - 1) * gap;
    const startX = -totalW * 0.5 + cardW * 0.5;

    this.session.drawerItems.forEach((itemId, index) => {
      const cardX = n === 1 ? 0 : startX + index * (cardW + gap);
      const card = this.createDrawerItemCard(itemId, cardX, 28, { compact });
      this.overlayContent.add(card);
    });
  }

  createDrawerItemCard(itemId, x, y, { compact = false } = {}) {
    const cardWidth = compact ? 180 : 236;
    const cardHeight = compact ? 160 : 174;
    const hotspotWidth = cardWidth - 16;
    const hotspotHeight = cardHeight - 14;
    const card = this.add.container(x, y).setSize(cardWidth, cardHeight);
    const background = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x131920, 0.98).setStrokeStyle(2, 0xe1bb73, 0.24);
    const wrapWidth = cardWidth - 28;
    const title = this.add.text(0, compact ? -56 : -60, ITEM_DEFINITIONS[itemId].label, {
      fontFamily: "Georgia, serif",
      fontSize: compact ? "18px" : "22px",
      color: "#f4ead5",
      align: "center",
      wordWrap: { width: wrapWidth },
    }).setOrigin(0.5);
    const icon = createItemIcon(this, itemId, 0, compact ? -16 : -8, "overlay");
    const description = this.add.text(0, compact ? 30 : 38, ITEM_DEFINITIONS[itemId].description, {
      fontFamily: "Georgia, serif",
      fontSize: compact ? "11px" : "14px",
      color: "#b9cad0",
      align: "center",
      wordWrap: { width: wrapWidth },
      lineSpacing: 2,
    }).setOrigin(0.5);
    const action = this.add.text(0, compact ? 66 : 68, "Кликни, чтобы забрать", {
      fontFamily: "Georgia, serif",
      fontSize: compact ? "12px" : "14px",
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
        } else if (itemId === "letter") {
          this.showNarration("Это твоё письмо. Имя Янис. Ты — вахтенный торгового брига «Рассвет». Кажется, шторм застал тебя в рейсе, и ты каким-то образом оказался здесь.");
        }

        this.time.delayedCall(150, () => this.openDrawerOverlay());
      },
    });

    return card;
  }

  openLeafInspectionOverlay() {
    this.openOverlay(
      "Листья у стены",
      "Мокрая палая листва сбилась в угол. Разгребай вручную — кликай по листьям или веди курсор с зажатой кнопкой."
    );
    this.overlayKind = "custom";

    // Stone wall backdrop
    const wallBack = this.add.rectangle(0, -24, 520, 160, 0x1a2028, 0.92).setStrokeStyle(2, 0x3a4a54, 0.4);
    const wallGrain = this.add.graphics();
    wallGrain.lineStyle(1, 0x2d3a44, 0.5);
    for (let y = -92; y <= 48; y += 18) {
      wallGrain.beginPath(); wallGrain.moveTo(-256, y); wallGrain.lineTo(256, y); wallGrain.strokePath();
    }
    wallGrain.lineStyle(1, 0x2d3a44, 0.35);
    [-180, -92, -10, 82, 184].forEach((x) => {
      wallGrain.beginPath(); wallGrain.moveTo(x, -100); wallGrain.lineTo(x, 56); wallGrain.strokePath();
    });
    // Moss-green tint at base of wall (damp streaks)
    wallGrain.fillStyle(0x3a5a4a, 0.12);
    [-160, -40, 110, 200].forEach((x) => {
      wallGrain.fillRect(x - 14, 32, 28, 24);
    });
    this.overlayContent.add([wallBack, wallGrain]);

    // Damp floor with subtle highlight band
    const groundShadow = this.add.rectangle(0, 78, 460, 16, 0x000000, 0.28);
    const ground = this.add.rectangle(0, 108, 460, 90, 0x1c2a30, 0.78).setStrokeStyle(2, 0x5a7a80, 0.22);
    const groundSheen = this.add.rectangle(0, 96, 420, 6, 0x8aacba, 0.1);
    const baseShadow = this.add.ellipse(0, 102, 400, 44, 0x000000, 0.2);
    // Dirt flecks
    const flecksGfx = this.add.graphics();
    flecksGfx.fillStyle(0x3a2a1a, 0.4);
    for (let i = 0; i < 18; i += 1) {
      flecksGfx.fillCircle(-210 + Math.random() * 420, 88 + Math.random() * 58, 0.8 + Math.random() * 1.6);
    }
    // Status card
    const statusPanel = this.add.rectangle(0, 158, 280, 26, 0x0f1419, 0.86).setStrokeStyle(1, 0x5a7a88, 0.35);
    const status = this.add.text(0, 158, "Разгребено: 0 / 8", {
      fontFamily: "monospace", fontSize: "15px", color: "#dce6e9", letterSpacing: 1,
    }).setOrigin(0.5);
    const sweepHint = this.add.text(0, 184, "Клик по листу или удерживай и веди мышью поперёк кучи", {
      fontFamily: "Georgia, serif", fontSize: "13px", color: "#b8a468", align: "center",
      wordWrap: { width: 460 },
    }).setOrigin(0.5);
    this.overlayContent.add([groundShadow, ground, groundSheen, baseShadow, flecksGfx, statusPanel, status, sweepHint]);

    const leaves = [];
    const updateStatus = () => {
      status.setText(`Разгребено: ${8 - leaves.length} / 8`);
    };

    const revealScrewdriver = () => {
      if (screwdriver.alpha > 0) {
        return;
      }
      screwdriver.setAlpha(1);
      screwdriverShadow.setAlpha(0.3);
      screwdriverHalo.setAlpha(1);
      screwdriverLabel.setAlpha(1);
      this.tweens.add({
        targets: screwdriver, y: screwdriver.y - 8,
        duration: 420, yoyo: true, repeat: -1, ease: "sine.inOut",
      });
      this.tweens.add({
        targets: screwdriverHalo, alpha: 0.35, scaleX: 1.25, scaleY: 1.25,
        duration: 720, yoyo: true, repeat: -1, ease: "sine.inOut",
      });
      this.cameras.main.shake(60, 0.0006);
      this.emitWorldPulse(
        this.sceneInteractables.find((i) => i.id === "leaf-pile")?.x ?? 980,
        (this.sceneInteractables.find((i) => i.id === "leaf-pile")?.y ?? 540) - 20,
        { color: 0xe1bb73, radius: 16, scale: 2.2, duration: 560 }
      );
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
      // Spawn 3-4 tiny particle flecks that scatter and fade (dust/debris)
      for (let i = 0; i < 3; i += 1) {
        const speck = this.add.circle(leaf.x, leaf.y, 1.4, 0x8a6a3a, 0.7);
        this.overlayContent.add(speck);
        this.tweens.add({
          targets: speck,
          x: leaf.x + Phaser.Math.Between(-60, 60),
          y: leaf.y + Phaser.Math.Between(-30, 40),
          alpha: 0, duration: 340 + Math.random() * 120,
          onComplete: () => speck.destroy(),
        });
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

    // Leaves with more visual variety: veined oak-like shape simulated via two overlapping ellipses and a stem
    for (let index = 0; index < 8; index += 1) {
      const leaf = this.add.container(
        Phaser.Math.Between(-190, 190),
        Phaser.Math.Between(-18, 62)
      ).setAngle(Phaser.Math.Between(-40, 40));

      const glow = this.add.ellipse(0, 0, 188, 62, 0xe1bb73, 0.04);
      const palette = Phaser.Math.RND.pick([
        { body: 0x6b4a24, edge: 0x4a3010, vein: 0x352208 },
        { body: 0x8a5930, edge: 0x5a3818, vein: 0x3a2210 },
        { body: 0x7b4520, edge: 0x4e2a0c, vein: 0x2e1608 },
        { body: 0x5a3a22, edge: 0x3a2212, vein: 0x221408 },
      ]);
      const w = Phaser.Math.Between(116, 156);
      const h = Phaser.Math.Between(30, 42);
      const shadow = this.add.ellipse(3, 4, w, h, 0x000000, 0.35);
      const body = this.add.ellipse(0, 0, w, h, palette.body, 0.97);
      const inner = this.add.ellipse(0, 0, w * 0.7, h * 0.62, palette.edge, 0.7);
      const vein = this.add.rectangle(0, 0, w * 0.78, 1.2, palette.vein, 0.5);
      const stem = this.add.rectangle(-w * 0.46, 0, w * 0.14, 2, palette.vein, 0.8);
      // A wet sheen highlight on top
      const sheen = this.add.ellipse(-w * 0.12, -h * 0.18, w * 0.44, h * 0.18, 0xb8a468, 0.12);

      leaf.setData("glow", glow);
      leaf.setData("removed", false);
      leaf.add([glow, shadow, body, inner, vein, stem, sheen]);

      leaves.push(leaf);
      this.overlayContent.add(leaf);
    }

    const screwdriverShadow = this.add.ellipse(0, 82, 110, 12, 0x000000, 0);
    const screwdriverHalo = this.add.circle(0, 54, 38, 0xe1bb73, 0).setAlpha(0);
    const screwdriverLabel = this.add.text(0, 114, "Отвёртка — кликни, чтобы забрать", {
      fontFamily: "Georgia, serif", fontSize: "15px", color: "#e8d090", align: "center",
    }).setOrigin(0.5).setAlpha(0);
    const screwdriver = createItemIcon(this, "screwdriver", 0, 54, "overlay").setAlpha(0);

    this.overlayContent.add([screwdriverShadow, screwdriverHalo, screwdriver, screwdriverLabel]);
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
