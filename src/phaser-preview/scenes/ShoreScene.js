import { getSurfaceObjective } from "../data/progressionText.js";
import { shoreInteractables } from "../data/towerData.js";
import {
  buildShoreEnvironment,
  createShoreGround,
  updateShoreAmbient,
} from "../render/towerArt.js";
import {
  createItemIcon,
  createWakePlayer,
  updateWakePlayerVisuals,
} from "../render/wakeArt.js";
import { PreviewSceneBase } from "./PreviewSceneBase.js";
import { getPreviewSession } from "../state/previewSession.js";

const Phaser = window.Phaser;

export class ShoreScene extends PreviewSceneBase {
  constructor() {
    super("shore-preview");
    this.entry = "from-wake";
  }

  init(data) {
    this.entry = data?.entry ?? "from-wake";
  }

  create() {
    this.session = getPreviewSession();
    this.session.stage = "shore";

    buildShoreEnvironment(this);
    createShoreGround(this);
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
    this.registerInteractables(shoreInteractables, (target) => this.handleInteraction(target));
    this.bindCommonResize();
    this.refreshInventoryBar();
    this.refreshSceneState();
    this.syncHud();
    this.playSceneIntro(
      "Основание маяка",
      this.entry === "from-service"
        ? "Люк теперь связывает поверхность и нижние помещения. Но наружный холод всё ещё режет сильнее любого механизма."
        : "Башня раскрывается наружу: ветер, рация, ржавый ящик и тяжёлый генератор складываются в картину поломки."
    );
  }

  update(time) {
    updateShoreAmbient(this, time);
    this.refreshSceneState();

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
    return "Phaser Preview: основание маяка";
  }

  getObjectiveText() {
    return getSurfaceObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(680, 0, 2400, 720, 170, 90);
  }

  placePlayer() {
    if (this.entry === "from-wake") {
      this.playerBody.setPosition(920, 526);
      return;
    }

    if (this.entry === "from-service") {
      this.playerBody.setPosition(1100, 526);
      return;
    }

    this.playerBody.setPosition(920, 526);
  }

  refreshSceneState() {
    const generatorReady = this.session.puzzleState.generator.fuseInstalled
      && this.session.puzzleState.generator.valveWheelInstalled;

    if (generatorReady) {
      this.session.endingUnlocked = true;
      if (!this.session.beats.generatorRestored) {
        this.playGeneratorRestorationBeat();
      }
    }

    if (this.valveWheelVisual) {
      this.valveWheelVisual.setVisible(
        !this.session.inventory.includes("valveWheel")
        && !this.session.puzzleState.generator.valveWheelInstalled
      );
    }

    if (this.generatorStatusLight) {
      this.generatorStatusLight.setFillStyle(generatorReady ? 0x7de08f : 0xe3c47b, generatorReady ? 1 : 0.7);
      this.generatorStatusLight.setAlpha(generatorReady ? 1 : 0.72);
    }

    if (this.hatchAura) {
      this.hatchAura.setVisible(this.session.endingUnlocked);
      this.hatchAura.alpha = this.session.endingUnlocked ? 0.18 : 0;
    }
  }

  handleInteraction(target) {
    switch (target.id) {
      case "lighthouse-door":
        this.session.stage = "wake";
        this.transitionToScene(
          "wake-preview",
          { entry: "from-shore" },
          "Комната смотрителя",
          "Наружная дверь снова ведёт в тесный жилой ярус смотрителя."
        );
        break;
      case "toolbox":
        this.session.shoreProgress.toolboxChecked = true;
        if (!this.session.puzzleState.toolbox.panelOpened) {
          if (this.session.selectedItemId === "screwdriver") {
            this.openScrewPanel({
              title: "Крышка инструментального ящика",
              description: "Отвёртка уже в руке. Теперь выкрути все винты по одному, чтобы добраться до силового предохранителя.",
              accent: 0x758790,
              onComplete: () => {
                this.session.puzzleState.toolbox.panelOpened = true;
                this.showNarration("Крышка сходит с прикипевших винтов. Внутри лежит силовой предохранитель.");
                this.openToolboxContainer();
              },
            });
          } else {
            this.showNarration(
              this.session.inventory.includes("screwdriver")
                ? "Крышка сидит на винтах. Выбери отвёртку в инвентаре и сними её вручную."
                : "Инструментальный ящик стянут винтами. Без отвёртки его не открыть."
            );
          }
          break;
        }

        this.openToolboxContainer();
        break;
      case "radio":
        this.session.shoreProgress.radioChecked = true;
        this.showNarration("В рации только помехи. Последние слова обрываются на фразе: «Не спускайся туда один». Значит, искать питание нужно у генератора.");
        break;
      case "valve-wheel":
        if (!this.session.inventory.includes("valveWheel") && !this.session.puzzleState.generator.valveWheelInstalled) {
          this.addInventoryItem("valveWheel");
          this.showNarration("Ты снимаешь штурвал клапана и убираешь его в инвентарь. Без него подача в генератор не откроется.");
        }
        break;
      case "generator":
        this.handleGeneratorInteraction();
        break;
      case "hatch":
        if (!this.session.endingUnlocked) {
          this.showNarration("Люк пока мёртв и не подаёт признаков жизни. Сначала нужно вернуть питание маяку.");
          break;
        }
        this.session.stage = "service";
        this.session.progressStage = "service";
        this.transitionToScene(
          "service-preview",
          { entry: "from-shore" },
          "Служебный уровень",
          "Под башней начинается отдельный внутренний слой маяка: тесные помещения, пульт и дверь в тоннель."
        );
        break;
      default:
        break;
    }
  }

  handleGeneratorInteraction() {
    const generatorState = this.session.puzzleState.generator;

    if (!generatorState.panelOpened) {
      if (this.session.selectedItemId === "screwdriver") {
        this.openScrewPanel({
          title: "Сервисный отсек генератора",
          description: "Снимай крышку вручную. Как только выкрутишь все винты, откроется доступ к предохранителю и клапану.",
          accent: 0x6d5d49,
          onComplete: () => {
            this.session.puzzleState.generator.panelOpened = true;
            this.showNarration("Сервисная крышка снята. Теперь можно вручную поставить предохранитель и штурвал.");
            this.openGeneratorRepairOverlay();
          },
        });
      } else {
        this.showNarration(
          this.session.inventory.includes("screwdriver")
            ? "Крышка генератора прикручена. Выбери отвёртку и вскрой сервисный отсек перед ремонтом."
            : "Сервисный отсек генератора закрыт винтами. Нужна отвёртка."
        );
      }
      return;
    }

    if (generatorState.fuseInstalled && generatorState.valveWheelInstalled) {
      this.openOverlay(
        "Генератор собран",
        "Предохранитель стоит на месте, топливный клапан снова собран. Следующим шагом можно оживлять свет и переносить дальнейшие помещения."
      );
      const status = this.add.text(0, 24, "Резервный генератор готов к запуску.", {
        fontFamily: "Georgia, serif",
        fontSize: "24px",
        color: "#f2e8d7",
      }).setOrigin(0.5);
      this.overlayContent.add(status);
      this.showNarration("Генератор уже собран и держит питание маяка.");
      return;
    }

    this.openGeneratorRepairOverlay();
  }

  openToolboxContainer() {
    this.openOverlay(
      "Инструментальный ящик",
      "Под слоем ржавых ключей лежит силовой предохранитель. Забери его в инвентарь, чтобы потом установить в генератор."
    );

    const hasFuse = !this.session.inventory.includes("fuse") && !this.session.puzzleState.generator.fuseInstalled;
    const tray = this.add.rectangle(0, 30, 500, 170, 0x171c23, 0.92).setStrokeStyle(2, 0x7b8e95, 0.16);
    this.overlayContent.add(tray);

    if (!hasFuse) {
      const emptyText = this.add.text(0, 20, "Ящик уже пуст. Нужная деталь отсюда забрана.", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#d8e1e5",
        align: "center",
      }).setOrigin(0.5);
      this.overlayContent.add(emptyText);
      return;
    }

    const card = this.add.container(0, 20).setSize(220, 128);
    const background = this.add.rectangle(0, 0, 220, 128, 0x131920, 0.98).setStrokeStyle(2, 0xe1bb73, 0.24);
    const title = this.add.text(0, -42, "Предохранитель", {
      fontFamily: "Georgia, serif",
      fontSize: "22px",
      color: "#f4ead5",
    }).setOrigin(0.5);
    const description = this.add.text(0, 26, "Силовая вставка для резервного генератора.", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#b9cad0",
      align: "center",
      wordWrap: { width: 176 },
    }).setOrigin(0.5);
    const icon = createItemIcon(this, "fuse", 0, -2, "overlay");
    card.add([background, title, description, icon]);
    this.overlayContent.add(card);

    this.createOverlayRectHotspot(0, 20, 220, 128, {
      pointerover: () => background.setStrokeStyle(3, 0xe1bb73, 0.74),
      pointerout: () => background.setStrokeStyle(2, 0xe1bb73, 0.24),
      pointerdown: () => {
        this.addInventoryItem("fuse");
        this.showNarration("Ты берёшь предохранитель и убираешь его в инвентарь. Теперь его можно установить в генератор.");
        this.openToolboxContainer();
      },
    });
  }

  openGeneratorRepairOverlay() {
    const generatorState = this.session.puzzleState.generator;
    this.openOverlay(
      "Сервисный отсек генератора",
      "Теперь детали ставятся вручную. Выбери предмет в инвентаре и нажми по нужному месту в отсеке."
    );

    const body = this.add.container(0, 24);
    const bodyShell = this.add.rectangle(0, 20, 520, 260, 0x182129, 0.96).setStrokeStyle(3, 0xe3c47b, 0.18);
    const fuseColumn = this.add.rectangle(-126, -6, 134, 168, 0x26323c, 1).setStrokeStyle(2, 0x93a8b3, 0.14);
    const valveColumn = this.add.rectangle(132, 12, 178, 192, 0x32281f, 1).setStrokeStyle(2, 0xba945c, 0.2);
    body.add([bodyShell, fuseColumn, valveColumn]);

    const fuseFrame = this.add.rectangle(-126, -6, 74, 112, 0x0d1419, 1).setStrokeStyle(3, 0x90a6b2, 0.26);
    const fuseLabel = this.add.text(-126, 88, generatorState.fuseInstalled ? "Предохранитель установлен" : "Гнездо предохранителя", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#dce6e9",
      align: "center",
      wordWrap: { width: 132 },
    }).setOrigin(0.5);
    body.add([fuseFrame, fuseLabel]);

    if (generatorState.fuseInstalled) {
      body.add(createItemIcon(this, "fuse", -126, -6, "overlay"));
    }

    this.createOverlayRectHotspot(-126, 18, 126, 160, {
      pointerdown: () => {
        if (generatorState.fuseInstalled) {
          this.showMessage("Предохранитель уже стоит на месте.");
          return;
        }
        if (this.session.selectedItemId !== "fuse") {
          this.showMessage("Сюда нужен предохранитель. Сначала выбери его в инвентаре.");
          return;
        }
        this.session.puzzleState.generator.fuseInstalled = true;
        if (this.session.puzzleState.generator.valveWheelInstalled) {
          this.session.endingUnlocked = true;
        }
        this.removeInventoryItem("fuse");
        this.showNarration("Предохранитель встал в гнездо. Осталось вернуть штурвал клапана.");
        this.openGeneratorRepairOverlay();
      },
    });

    const wheelAxis = this.add.circle(132, 12, 32, 0x4d3828, 0).setStrokeStyle(5, 0xc39d68, 0.82);
    const wheelPipe = this.add.rectangle(132, 12, 18, 126, 0x5f4735, 1);
    const wheelLabel = this.add.text(132, 106, generatorState.valveWheelInstalled ? "Штурвал установлен" : "Ось топливного клапана", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#eadcc1",
      align: "center",
      wordWrap: { width: 150 },
    }).setOrigin(0.5);
    body.add([wheelPipe, wheelAxis, wheelLabel]);

    if (generatorState.valveWheelInstalled) {
      body.add(createItemIcon(this, "valveWheel", 132, 12, "overlay"));
    }

    this.createOverlayRectHotspot(132, 36, 166, 184, {
      pointerdown: () => {
        if (generatorState.valveWheelInstalled) {
          this.showMessage("Штурвал уже сидит на оси.");
          return;
        }
        if (this.session.selectedItemId !== "valveWheel") {
          this.showMessage("Сюда нужен штурвал клапана. Сначала выбери его в инвентаре.");
          return;
        }
        this.session.puzzleState.generator.valveWheelInstalled = true;
        if (this.session.puzzleState.generator.fuseInstalled) {
          this.session.endingUnlocked = true;
        }
        this.removeInventoryItem("valveWheel");
        this.showNarration("Ты ставишь штурвал на ось. Топливный клапан снова можно открыть.");
        this.openGeneratorRepairOverlay();
      },
    });

    this.overlayContent.add(body);

    if (generatorState.fuseInstalled && generatorState.valveWheelInstalled) {
      const ready = this.add.text(0, 184, "Генератор собран. Путь к запуску готов.", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#f2e8d7",
      }).setOrigin(0.5);
      this.overlayContent.add(ready);
    }
  }

  playGeneratorRestorationBeat() {
    this.session.beats.generatorRestored = true;
    this.cameras.main.shake(340, 0.004);
    this.cameras.main.flash(280, 232, 204, 116, true);

    if (this.generatorStatusLight) {
      this.tweens.add({
        targets: this.generatorStatusLight,
        alpha: 1,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 420,
        yoyo: true,
        repeat: 1,
        ease: "sine.inOut",
      });
    }

    if (this.hatchPulse) {
      this.hatchPulse.destroy();
    }

    this.hatchPulse = this.add.circle(1094, 540, 26, 0xe1bb73, 0)
      .setStrokeStyle(4, 0xe1bb73, 0.9)
      .setDepth(20);
    this.tweens.add({
      targets: this.hatchPulse,
      scaleX: 3.4,
      scaleY: 3.4,
      alpha: 0,
      duration: 980,
      ease: "quad.out",
      onComplete: () => {
        this.hatchPulse?.destroy();
        this.hatchPulse = null;
      },
    });

    this.showNarration("Гул проходит по всей башне. Генератор ожил, и служебный люк у основания теперь доступен.");
  }
}
