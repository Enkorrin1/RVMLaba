import { getSurfaceObjective } from "../data/progressionText.js";
import {
  SHORE_PLAYABLE_LEFT,
  SHORE_PLAYABLE_WIDTH,
  shoreInteractables,
} from "../data/towerData.js";
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
    this.setupSceneChrome(shoreInteractables, (target) => this.handleInteraction(target));
    this.refreshSceneState();
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
    return "Основание маяка";
  }

  getObjectiveText() {
    return getSurfaceObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(SHORE_PLAYABLE_LEFT, 0, SHORE_PLAYABLE_WIDTH, 720, 170, 90);
  }

  placePlayer() {
    if (this.entry === "from-wake") {
      this.playerBody.setPosition(1120, 526);
      return;
    }

    if (this.entry === "from-service") {
      this.playerBody.setPosition(1240, 526);
      return;
    }

    this.playerBody.setPosition(1120, 526);
  }

  refreshSceneState() {
    const generatorReady = this.isGeneratorReady();

    this.session.endingUnlocked = generatorReady;

    if (generatorReady && !this.session.beats.generatorRestored) {
      this.playGeneratorRestorationBeat();
    }

    if (this.valveWheelVisual) {
      this.valveWheelVisual.setVisible(
        !this.session.inventory.includes("valveWheel")
        && !this.session.puzzleState.generator.valveWheelMounted
        && !this.session.puzzleState.generator.valveWheelInstalled
      );
    }

    if (this.generatorStatusLight) {
      this.generatorStatusLight.setFillStyle(generatorReady ? 0x7de08f : 0xe3c47b, generatorReady ? 1 : 0.7);
      this.generatorStatusLight.setAlpha(generatorReady ? 1 : 0.72);
    }

    if (this.hatchAura) {
      this.hatchAura.setVisible(this.session.endingUnlocked);
      this.hatchAura.alpha = this.session.endingUnlocked ? (this.session.puzzleState.serviceHatch.released ? 0.12 : 0.22) : 0;
    }

    if (this.hatchHandleVisual) {
      this.hatchHandleVisual.setFillStyle(
        this.session.endingUnlocked ? 0xe4c587 : 0x5a666e,
        this.session.endingUnlocked ? 1 : 0.82
      );
    }

    if (this.hatchPlateVisual) {
      this.hatchPlateVisual.setStrokeStyle(
        4,
        this.session.puzzleState.serviceHatch.released ? 0x95d6a2 : 0xc0a06c,
        this.session.endingUnlocked ? 0.42 : 0.18
      );
    }
  }

  handleInteraction(target) {
    switch (target.id) {
      case "lighthouse-door":
        this.session.stage = "wake";
        this.transitionToScene(
          "wake-preview",
          { entry: "from-shore" },
          "Жилая комната маяка",
          "Наружная дверь снова ведёт в тесную жилую комнату внутри башни."
        );
        break;
      case "toolbox":
        this.session.shoreProgress.toolboxChecked = true;
        if (!this.session.puzzleState.toolbox.panelOpened) {
          if (this.session.selectedItemId === "screwdriver") {
            this.focusOnInteractable(target, () => {
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
            }, {
              zoom: 1.08,
              duration: 190,
              hold: 80,
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

        this.focusOnInteractable(target, () => this.openToolboxContainer(), {
          zoom: 1.08,
          duration: 180,
          hold: 70,
        });
        break;
      case "radio":
        this.session.shoreProgress.radioChecked = true;
        this.focusOnInteractable(target, () => this.openRadioOverlay(), {
          zoom: 1.07,
          duration: 170,
          hold: 70,
        });
        break;
      case "valve-wheel":
        if (
          !this.session.inventory.includes("valveWheel")
          && !this.session.puzzleState.generator.valveWheelMounted
          && !this.session.puzzleState.generator.valveWheelInstalled
        ) {
          this.emitWorldPulse(target.x + target.width * 0.5, target.y + target.height * 0.5, {
            color: 0xc39d68,
            radius: 18,
            scale: 2.6,
            duration: 620,
          });
          this.addInventoryItem("valveWheel");
          this.showNarration("Ты снимаешь штурвал клапана и убираешь его в инвентарь. Без него подача в генератор не откроется.");
        }
        break;
      case "generator":
        this.focusOnInteractable(target, () => this.handleGeneratorInteractionV2(), {
          zoom: 1.1,
          duration: 210,
          hold: 90,
        });
        break;
      case "hatch":
        if (!this.session.endingUnlocked) {
          this.showNarration("Люк пока мёртв и не подаёт признаков жизни. Сначала нужно вернуть питание маяку.");
          break;
        }
        if (this.session.puzzleState.serviceHatch.released) {
          this.focusOnInteractable(target, () => this.transitionToService(), {
            zoom: 1.08,
            duration: 190,
            hold: 90,
          });
          break;
        }
        this.focusOnInteractable(target, () => this.openServiceHatchReleaseOverlay(), {
          zoom: 1.08,
          duration: 190,
          hold: 80,
        });
        break;
      default:
        break;
    }
  }

  isGeneratorReady() {
    const generator = this.session.puzzleState.generator;
    return generator.fuseInstalled && generator.valveWheelInstalled;
  }

  handleGeneratorInteraction() {
    return this.handleGeneratorInteractionV2();
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

    if (false && generatorState.fuseInstalled && generatorState.valveWheelInstalled) {
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

  handleGeneratorInteractionV2() {
    const generatorState = this.session.puzzleState.generator;

    if (!generatorState.panelOpened) {
      if (this.session.selectedItemId === "screwdriver" || this.session.inventory.includes("screwdriver")) {
        if (this.session.selectedItemId !== "screwdriver" && this.session.inventory.includes("screwdriver")) {
          this.session.selectedItemId = "screwdriver";
          this.refreshInventoryBar();
          this.syncHud();
        }

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
        this.openOverlay(
          "Сервисный отсек генератора",
          "Крышка генератора держится на винтах. Сначала нужно найти отвёртку, а потом уже вскрывать сервисный отсек."
        );
        const title = this.add.text(0, 12, "Нужна отвёртка", {
          fontFamily: "Georgia, serif",
          fontSize: "24px",
          color: "#f2e8d7",
        }).setOrigin(0.5);
        const hint = this.add.text(0, 68, "Осмотри комнату маяка и листву у стены,\nесли инструмент ещё не найден.", {
          fontFamily: "Georgia, serif",
          fontSize: "18px",
          color: "#c4d1d6",
          align: "center",
        }).setOrigin(0.5);
        this.overlayContent.add([title, hint]);
      }
      return;
    }

    if (false && generatorState.fuseInstalled && generatorState.valveWheelInstalled) {
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
      "Под крышкой лежит силовой предохранитель в пенальном ложементе. Забери его рукой, чтобы потом вручную собрать генератор."
    );

    const hasFuse = !this.session.inventory.includes("fuse")
      && !this.session.puzzleState.generator.fuseSeated
      && !this.session.puzzleState.generator.fuseInstalled;
    const lid = this.add.rectangle(0, -54, 520, 76, 0x5d6970, 1).setStrokeStyle(3, 0xe1bb73, 0.18);
    const tray = this.add.rectangle(0, 44, 520, 208, 0x171c23, 0.94).setStrokeStyle(2, 0x7b8e95, 0.16);
    const foam = this.add.rectangle(0, 46, 336, 118, 0x202932, 1).setStrokeStyle(2, 0xaebfc6, 0.08);
    const slot = this.add.rectangle(0, 44, 164, 44, 0x0f151b, 1).setStrokeStyle(2, 0x4d5b64, 0.22);
    const latchLeft = this.add.rectangle(-152, -54, 22, 20, 0xc9ae72, 1).setStrokeStyle(2, 0x4d4031, 0.44);
    const latchRight = this.add.rectangle(152, -54, 22, 20, 0xc9ae72, 1).setStrokeStyle(2, 0x4d4031, 0.44);
    this.overlayContent.add([lid, tray, foam, slot, latchLeft, latchRight]);

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

    const card = this.add.container(0, 38).setSize(220, 132);
    const background = this.add.rectangle(0, 0, 228, 132, 0x131920, 0.18).setStrokeStyle(2, 0xe1bb73, 0.18);
    const title = this.add.text(0, -54, "Предохранитель", {
      fontFamily: "Georgia, serif",
      fontSize: "22px",
      color: "#f4ead5",
    }).setOrigin(0.5);
    const description = this.add.text(0, 60, "Силовая вставка для резервного генератора.", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#b9cad0",
      align: "center",
      wordWrap: { width: 176 },
    }).setOrigin(0.5);
    const action = this.add.text(0, 88, "Кликни, чтобы забрать", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#d7c087",
    }).setOrigin(0.5);
    const icon = createItemIcon(this, "fuse", 0, 0, "overlay");
    card.add([background, title, description, action, icon]);
    this.overlayContent.add(card);

    this.createOverlayRectHotspot(0, 38, 228, 132, {
      pointerover: () => background.setStrokeStyle(3, 0xe1bb73, 0.74),
      pointerout: () => background.setStrokeStyle(2, 0xe1bb73, 0.18),
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
      "Теперь собирай генератор физически: вставь предохранитель в направляющие, прижми его скобой, насади штурвал и доверни до упора."
    );

    this.overlayHint.setText("1-9 — предмет, клик по узлам, Esc — закрыть");
    const body = this.add.container(0, 6);
    const bodyShell = this.add.rectangle(0, 10, 586, 320, 0x182129, 0.98).setStrokeStyle(3, 0xe3c47b, 0.18);
    const backPanel = this.add.rectangle(0, 12, 520, 258, 0x10171d, 1).setStrokeStyle(2, 0x4d5b64, 0.22);
    const fuseColumn = this.add.rectangle(-150, 8, 156, 198, 0x26323c, 1).setStrokeStyle(2, 0x93a8b3, 0.14);
    const valveColumn = this.add.rectangle(152, 18, 208, 214, 0x32281f, 1).setStrokeStyle(2, 0xba945c, 0.2);
    const fuseCaption = this.add.text(-150, -108, "Шаг 1. Предохранитель", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#e4eef0",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    const valveCaption = this.add.text(152, -108, "Шаг 2. Клапан", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#f0dfc2",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    body.add([bodyShell, backPanel, fuseColumn, valveColumn, fuseCaption, valveCaption]);

    const fuseFrame = this.add.rectangle(-150, 8, 86, 136, 0x0d1419, 1).setStrokeStyle(3, 0x90a6b2, 0.26);
    const fuseRailsLeft = this.add.rectangle(-166, 8, 8, 118, 0x6f838f, 0.92);
    const fuseRailsRight = this.add.rectangle(-134, 8, 8, 118, 0x6f838f, 0.92);
    const fuseClamp = this.add.rectangle(-96, 8, 28, 92, generatorState.fuseInstalled ? 0xd7c087 : 0x5d707c, 1)
      .setStrokeStyle(2, 0xe1bb73, generatorState.fuseSeated ? 0.48 : 0.18);
    const fuseClampLabel = this.add.text(-96, 82, "Скоба", {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color: "#d7c087",
      align: "center",
      wordWrap: { width: 54 },
    }).setOrigin(0.5);
    const fuseLabel = this.add.text(-150, 108, generatorState.fuseInstalled ? "Узел закрыт" : generatorState.fuseSeated ? "Осталось прижать скобой" : "Вставь предохранитель", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#dce6e9",
      align: "center",
      wordWrap: { width: 132 },
    }).setOrigin(0.5);
    body.add([fuseFrame, fuseRailsLeft, fuseRailsRight, fuseClamp, fuseClampLabel, fuseLabel]);

    if (generatorState.fuseSeated || generatorState.fuseInstalled) {
      const fuseIcon = createItemIcon(this, "fuse", -150, generatorState.fuseInstalled ? 8 : 24, "overlay");
      fuseIcon.setAlpha(generatorState.fuseInstalled ? 1 : 0.92);
      body.add(fuseIcon);
    }

    this.createOverlayRectHotspot(-150, 24, 116, 168, {
      pointerdown: () => {
        if (generatorState.fuseInstalled) {
          this.showMessage("Предохранитель уже стоит на месте.");
          return;
        }
        if (generatorState.fuseSeated) {
          this.showMessage("Предохранитель уже в направляющих. Теперь прижми его боковой скобой.");
          return;
        }
        if (this.session.selectedItemId !== "fuse") {
          this.showMessage("Сначала выбери предохранитель в инвентаре, чтобы вставить его в направляющие.");
          return;
        }
        this.session.puzzleState.generator.fuseSeated = true;
        this.removeInventoryItem("fuse");
        this.cameras.main.shake(90, 0.0012);
        this.showNarration("Предохранитель вошёл в направляющие. Теперь прижми его стопорной скобой.");
        this.openGeneratorRepairOverlay();
      },
    });

    this.createOverlayRectHotspot(-96, 8, 42, 108, {
      pointerover: () => fuseClamp.setFillStyle(generatorState.fuseInstalled ? 0xd7c087 : 0xe1bb73, 1),
      pointerout: () => fuseClamp.setFillStyle(generatorState.fuseInstalled ? 0xd7c087 : 0x5d707c, 1),
      pointerdown: () => {
        if (generatorState.fuseInstalled) {
          this.showMessage("Скоба уже держит предохранитель.");
          return;
        }
        if (!generatorState.fuseSeated) {
          this.showMessage("Сначала вставь предохранитель в направляющие.");
          return;
        }
        this.session.puzzleState.generator.fuseInstalled = true;
        this.emitWorldPulse(2780, 548, {
          color: 0xa8d4de,
          radius: 18,
          scale: 2.6,
          duration: 620,
        });
        this.showNarration("Скоба встаёт на место. Предохранитель больше не болтается в отсеке.");
        this.openGeneratorRepairOverlay();
      },
    });

    const wheelAxis = this.add.circle(152, 18, 34, 0x4d3828, 0).setStrokeStyle(5, 0xc39d68, 0.82);
    const wheelPipe = this.add.rectangle(152, 18, 18, 134, 0x5f4735, 1);
    const wheelCap = this.add.circle(152, 18, 12, generatorState.valveWheelInstalled ? 0xe1bb73 : 0x7d654a, 1);
    const wheelLabel = this.add.text(152, 118, generatorState.valveWheelInstalled ? "Клапан открыт" : generatorState.valveWheelMounted ? `Поверни ещё: ${3 - generatorState.valveWheelTurns}` : "Насади штурвал", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#eadcc1",
      align: "center",
      wordWrap: { width: 150 },
    }).setOrigin(0.5);
    const wheelHint = this.add.text(152, -76, generatorState.valveWheelInstalled ? "Топливо снова идёт" : generatorState.valveWheelMounted ? "Проворачивай до упора" : "Выбери штурвал и насади на ось", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#d7c087",
      align: "center",
      wordWrap: { width: 180 },
    }).setOrigin(0.5);
    body.add([wheelPipe, wheelAxis, wheelCap, wheelLabel, wheelHint]);

    if (generatorState.valveWheelMounted || generatorState.valveWheelInstalled) {
      const wheelIcon = createItemIcon(this, "valveWheel", 152, 18, "overlay");
      wheelIcon.setRotation(generatorState.valveWheelInstalled ? 0 : generatorState.valveWheelTurns * 0.48);
      wheelIcon.setAlpha(generatorState.valveWheelInstalled ? 1 : 0.92);
      body.add(wheelIcon);
    }

    this.createOverlayRectHotspot(152, 42, 176, 194, {
      pointerdown: () => {
        if (generatorState.valveWheelInstalled) {
          this.showMessage("Штурвал уже сидит на оси.");
          return;
        }
        if (!generatorState.valveWheelMounted) {
          if (this.session.selectedItemId !== "valveWheel") {
            this.showMessage("Сначала выбери штурвал в инвентаре и насади его на ось клапана.");
            return;
          }
          this.session.puzzleState.generator.valveWheelMounted = true;
          this.session.puzzleState.generator.valveWheelTurns = 0;
          this.removeInventoryItem("valveWheel");
          this.cameras.main.shake(90, 0.0012);
          this.showNarration("Штурвал сел на ось. Теперь доверни его до упора, чтобы вернуть подачу топлива.");
          this.openGeneratorRepairOverlay();
          return;
        }
        this.session.puzzleState.generator.valveWheelTurns += 1;
        if (this.session.puzzleState.generator.valveWheelTurns >= 3) {
          this.session.puzzleState.generator.valveWheelInstalled = true;
          this.emitWorldPulse(2780, 548, {
            color: 0xc39d68,
            radius: 22,
            scale: 3,
            duration: 760,
          });
          this.showNarration("Штурвал дотянут до жёсткой отсечки. Клапан собран и готов пропустить топливо.");
        } else {
          this.cameras.main.shake(80, 0.001);
          this.showMessage(`Штурвал с усилием проворачивается. Осталось довернуть: ${3 - this.session.puzzleState.generator.valveWheelTurns}.`);
        }
        this.openGeneratorRepairOverlay();
      },
    });

    const statusBand = this.add.rectangle(0, 166, 430, 54, 0x0d1419, 0.9)
      .setStrokeStyle(2, this.isGeneratorReady() ? 0xe1bb73 : 0x4d5b64, this.isGeneratorReady() ? 0.28 : 0.18);
    const statusText = this.add.text(0, 176, this.isGeneratorReady()
      ? "Отсек собран. Питание башни вернулось."
      : "Собери оба узла, чтобы вернуть питание.", {
      fontFamily: "Georgia, serif",
      fontSize: this.isGeneratorReady() ? "18px" : "17px",
      color: this.isGeneratorReady() ? "#f4ead5" : "#dce6e9",
      align: "center",
      wordWrap: { width: 390 },
    }).setOrigin(0.5);
    statusText.setY(166);
    body.add([statusBand, statusText]);

    this.overlayContent.add(body);

    if (false && generatorState.fuseInstalled && generatorState.valveWheelInstalled) {
      const ready = this.add.text(0, 210, "Генератор собран. Питание на служебный люк уже вернулось.", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#f2e8d7",
      }).setOrigin(0.5);
      this.overlayContent.add(ready);
    }
  }

  openRadioOverlay() {
    this.openOverlay(
      "Рация береговой связи",
      "Попробуй поймать фразу вручную. На шкале ещё живой слабый сигнал, но он тонет в солёных помехах."
    );

    const body = this.add.container(0, 26);
    const shell = this.add.rectangle(0, 20, 520, 240, 0x182129, 0.98).setStrokeStyle(3, 0xe3c47b, 0.18);
    const display = this.add.rectangle(-72, -6, 196, 72, 0x0d1419, 1).setStrokeStyle(2, 0x90a6b2, 0.18);
    const waveform = this.add.rectangle(-72, -6, 132, 8, 0x8bcad1, 0.48);
    const knob = this.add.circle(156, 6, 36, 0x5e6e79, 1).setStrokeStyle(3, 0xd7c087, 0.24);
    const knobMark = this.add.rectangle(156, -18, 6, 24, 0xd7c087, 1);
    const speaker = this.add.rectangle(-72, 90, 196, 62, 0x111821, 1).setStrokeStyle(2, 0x4d5b64, 0.22);
    const lineA = this.add.text(-72, 90, "«...не спускайся туда...", {
      fontFamily: "Georgia, serif",
      fontSize: "19px",
      color: "#f2e8d7",
      align: "center",
    }).setOrigin(0.5).setAlpha(0);
    const lineB = this.add.text(-72, 118, "...один»", {
      fontFamily: "Georgia, serif",
      fontSize: "19px",
      color: "#f2e8d7",
      align: "center",
    }).setOrigin(0.5).setAlpha(0);
    const hint = this.add.text(156, 86, "Провернуть ручку настройки", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#d7c087",
      align: "center",
      wordWrap: { width: 140 },
    }).setOrigin(0.5);
    body.add([shell, display, waveform, speaker, knob, knobMark, hint, lineA, lineB]);
    this.overlayContent.add(body);

    this.createOverlayRectHotspot(156, 6, 110, 110, {
      pointerover: () => knob.setStrokeStyle(3, 0xe1bb73, 0.58),
      pointerout: () => knob.setStrokeStyle(3, 0xd7c087, 0.24),
      pointerdown: () => {
        this.tweens.add({
          targets: knobMark,
          angle: 94,
          duration: 220,
          ease: "quad.out",
        });
        this.tweens.add({
          targets: waveform,
          width: 176,
          alpha: 0.8,
          duration: 180,
          yoyo: true,
        });
        this.emitWorldPulse(1608, 530, {
          color: 0x8bcad1,
          radius: 20,
          scale: 2.8,
          duration: 640,
        });
        lineA.setAlpha(1);
        lineB.setAlpha(1);
        this.showNarration("Из шумов проступает фраза: «Не спускайся туда один». Значит, внизу кто-то был совсем недавно, а начать всё равно придётся с генератора.");
      },
    });
  }

  openServiceHatchReleaseOverlay() {
    this.openOverlay(
      "Служебный люк",
      "Питание вернулось. Теперь сорви стопорный фиксатор и подай люк вниз ручным рычагом."
    );

    this.overlayHint.setText("Кликни по стопору, затем по рычагу, Esc — закрыть");
    const body = this.add.container(0, 10);
    const hatchRing = this.add.circle(0, 20, 112, 0x1e2c34, 1).setStrokeStyle(6, 0xc0a06c, 0.36);
    const hatchInner = this.add.circle(0, 20, 76, 0x0f151b, 1).setStrokeStyle(4, 0x4d5b64, 0.26);
    const latch = this.add.rectangle(-18, -58, 130, 18, 0x5e6e79, 1).setStrokeStyle(2, 0xd7c087, 0.18);
    const handle = this.add.rectangle(112, 12, 28, 96, 0xd7c087, 1).setStrokeStyle(2, 0x4d5b64, 0.44);
    const handleGrip = this.add.rectangle(112, -26, 48, 18, 0x355565, 1).setStrokeStyle(2, 0xd7c087, 0.28);
    const latchCaption = this.add.text(-18, -92, "Стопор", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#d7c087",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    const handleCaption = this.add.text(112, -92, "Рычаг", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#d7c087",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
    const labelBand = this.add.rectangle(0, 148, 430, 44, 0x0d1419, 0.88).setStrokeStyle(2, 0x4d5b64, 0.18);
    const label = this.add.text(0, 162, "Сначала сорви стопор, затем потяни рычаг вниз.", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#f2e8d7",
      align: "center",
      wordWrap: { width: 500 },
    }).setOrigin(0.5);
    label.setY(148);
    label.setFontSize(17);
    label.setWordWrapWidth(390);
    body.add([hatchRing, hatchInner, latch, handle, handleGrip, latchCaption, handleCaption, labelBand, label]);
    this.overlayContent.add(body);

    let latchReleased = false;
    this.createOverlayRectHotspot(-18, -58, 150, 34, {
      pointerover: () => latch.setStrokeStyle(2, 0xe1bb73, 0.62),
      pointerout: () => latch.setStrokeStyle(2, 0xd7c087, 0.18),
      pointerdown: () => {
        if (latchReleased) {
          this.showMessage("Стопор уже сорван. Теперь тяни рычаг вниз.");
          return;
        }

        latchReleased = true;
        this.tweens.add({
          targets: latch,
          x: -126,
          angle: -18,
          alpha: 0.4,
          duration: 260,
          ease: "quad.out",
        });
        this.emitWorldPulse(1094, 542, {
          color: 0xd7c087,
          radius: 18,
          scale: 2.4,
          duration: 540,
        });
        label.setText("Стопор сошёл. Теперь тяни рычаг вниз, чтобы открыть люк.");
      },
    });

    this.createOverlayRectHotspot(112, 12, 82, 142, {
      pointerover: () => handle.setFillStyle(0xe1bb73, 1),
      pointerout: () => handle.setFillStyle(0xd7c087, 1),
      pointerdown: () => {
        if (!latchReleased) {
          this.showMessage("Рычаг держит стопор. Сначала сорви фиксатор на крышке.");
          return;
        }

        this.session.puzzleState.serviceHatch.released = true;
        this.tweens.add({
          targets: [handle, handleGrip],
          y: "+=38",
          duration: 220,
          ease: "quad.out",
        });
        this.cameras.main.shake(220, 0.0024);
        this.emitWorldPulse(1094, 542, {
          color: 0x95d6a2,
          radius: 26,
          scale: 3.4,
          duration: 860,
        });
        this.showNarration("Рычаг срывается вниз, и люк тяжело поддаётся. Под башней снова открыт путь на служебный уровень.");
        this.time.delayedCall(260, () => this.transitionToService());
      },
    });
  }

  transitionToService() {
    this.session.stage = "service";
    this.session.progressStage = "service";
    this.transitionToScene(
      "service-preview",
      { entry: "from-shore" },
      "Служебный уровень",
      "Под башней начинается отдельный внутренний слой маяка: тесные помещения, пульт и дверь в тоннель."
    );
  }

  playGeneratorRestorationBeat() {
    this.session.beats.generatorRestored = true;
    this.cameras.main.shake(340, 0.004);
    this.cameras.main.flash(280, 232, 204, 116, true);
    this.emitWorldPulse(2780, 548, {
      color: 0xe1bb73,
      radius: 34,
      scale: 4,
      duration: 980,
    });

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

    this.hatchPulse = this.add.ellipse(1178, 590, 64, 18, 0xe1bb73, 0)
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
