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

    this.maybeAutoTriggerKeeperIntro();
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
      case "keeper":
        this.openKeeperDialogueOverlay();
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
      case "wait-dawn":
        this.focusOnInteractable(target, () => {
          this.session.beats.finalConfronted = true;
          this.session.beats.endingChoice = "light";
          this.cameras.main.flash(900, 232, 204, 116, true);
          this.time.delayedCall(400, () => this.showEndingCard("light"));
        }, { zoom: 1.1, duration: 200, hold: 120 });
        break;
      case "wreck-plank":
        this.session.shoreProgress.wreckSeen = true;
        this.focusOnInteractable(target, () => {
          this.emitWorldPulse(target.x + target.width * 0.5, target.y + target.height * 0.5, {
            color: 0xd7c087, radius: 18, scale: 2.4, duration: 620,
          });
          this.showNarration("Мокрая доска с облупившейся краской: «…РАССВ…». Это борт брига «Рассвет» — того самого, на котором ты вышел в рейс. Шторм выбросил обломок прямо сюда, к маяку. Значит, корабль действительно разбило, и тебя выносило к этим скалам.");
        }, { zoom: 1.08, duration: 170, hold: 80 });
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
      "Открытый армейский ящик. Пенальный ложемент с гнездом под силовой предохранитель — остальное пусто."
    );

    const hasFuse = !this.session.inventory.includes("fuse")
      && !this.session.puzzleState.generator.fuseSeated
      && !this.session.puzzleState.generator.fuseInstalled;

    // Frame backdrop
    const frame = this.add.rectangle(0, 10, 540, 260, 0x0a1218, 0.97).setStrokeStyle(2, 0x3a4a52, 0.42);
    this.overlayContent.add(frame);

    // === Open box with perspective-hinted lid ===
    // Lid (tilted back, darker)
    const lidShadow = this.add.rectangle(4, -76, 440, 56, 0x000000, 0.45);
    const lid = this.add.rectangle(0, -80, 430, 48, 0x3a4550, 1).setStrokeStyle(3, 0xe1bb73, 0.35);
    const lidInner = this.add.rectangle(0, -80, 410, 34, 0x2a3540, 1);
    // Hinges on the top of the lid
    const hingeL = this.add.rectangle(-170, -102, 20, 8, 0x8aacba, 0.9);
    const hingeR = this.add.rectangle(170, -102, 20, 8, 0x8aacba, 0.9);
    // Lid label
    const lidStamp = this.add.rectangle(0, -80, 100, 20, 0x1a2028, 0.9);
    const lidLabel = this.add.text(0, -80, "СЛУЖБА 1987", {
      fontFamily: "monospace", fontSize: "9px", color: "#d7c087", letterSpacing: 1.5,
    }).setOrigin(0.5);
    this.overlayContent.add([lidShadow, lid, lidInner, hingeL, hingeR, lidStamp, lidLabel]);

    // Tray body (large, dark)
    const trayShadow = this.add.rectangle(4, 30, 460, 200, 0x000000, 0.4);
    const tray = this.add.rectangle(0, 26, 450, 196, 0x2a3540, 1).setStrokeStyle(3, 0x8aacba, 0.35);
    // Latches on the front
    const latchLeft = this.add.rectangle(-192, -32, 22, 16, 0xc9ae72, 1).setStrokeStyle(2, 0x4d4031, 0.6);
    const latchLeftBtm = this.add.rectangle(-192, -12, 18, 8, 0x5a3a24, 1);
    const latchRight = this.add.rectangle(192, -32, 22, 16, 0xc9ae72, 1).setStrokeStyle(2, 0x4d4031, 0.6);
    const latchRightBtm = this.add.rectangle(192, -12, 18, 8, 0x5a3a24, 1);
    // Corner rivets
    const rivetGfx = this.add.graphics();
    rivetGfx.fillStyle(0xa0b0ba, 0.8);
    [[-210, -50], [210, -50], [-210, 110], [210, 110]].forEach(([x, y]) => {
      rivetGfx.fillCircle(x, y, 2.6);
    });
    this.overlayContent.add([trayShadow, tray, latchLeft, latchLeftBtm, latchRight, latchRightBtm, rivetGfx]);

    // Foam insert (dark grey with pre-cut tool silhouettes)
    const foam = this.add.rectangle(0, 30, 396, 152, 0x1a2028, 1).setStrokeStyle(2, 0x5a7080, 0.4);
    this.overlayContent.add(foam);

    // Pre-cut foam slots (empty ones for removed tools — narrative: screwdriver was here)
    const slotGfx = this.add.graphics();
    // Screwdriver silhouette (already taken, shows empty)
    slotGfx.fillStyle(0x000000, 0.8);
    slotGfx.fillRoundedRect(-184, -24, 120, 14, 4);  // shaft cutout
    slotGfx.fillRoundedRect(-196, -28, 22, 22, 3);    // handle cutout
    // Wrench silhouette (decorative, not used)
    slotGfx.fillStyle(0x000000, 0.8);
    slotGfx.beginPath();
    slotGfx.fillRoundedRect(-184, 76, 120, 14, 4);
    slotGfx.fillCircle(-60, 83, 10);
    // Empty tool label tags
    this.overlayContent.add(slotGfx);
    const screwdriverSlotLbl = this.add.text(-124, -48, "отвёртка — взято", {
      fontFamily: "monospace", fontSize: "8px", color: "#5a7080",
    }).setOrigin(0.5).setAlpha(0.9);
    const wrenchSlotLbl = this.add.text(-124, 100, "ключ — отсутствует", {
      fontFamily: "monospace", fontSize: "8px", color: "#5a7080",
    }).setOrigin(0.5).setAlpha(0.9);
    this.overlayContent.add([screwdriverSlotLbl, wrenchSlotLbl]);

    // Fuse slot — the one that matters
    const fuseSlotBg = this.add.rectangle(86, 30, 180, 80, 0x0c1218, 1).setStrokeStyle(2, hasFuse ? 0xe1bb73 : 0x4d5b64, hasFuse ? 0.55 : 0.3);
    const fuseSlotCutout = this.add.rectangle(86, 30, 140, 56, 0x000000, 0.95);
    const fuseSlotLabel = this.add.text(86, 74, hasFuse ? "ПРЕДОХРАНИТЕЛЬ" : "—", {
      fontFamily: "monospace", fontSize: "9px", color: hasFuse ? "#d7c087" : "#5a7080", letterSpacing: 1.5,
    }).setOrigin(0.5);
    const fuseSlotSpec = this.add.text(86, -18, "250V · 15A", {
      fontFamily: "monospace", fontSize: "8px", color: "#5a7080",
    }).setOrigin(0.5).setAlpha(hasFuse ? 0.75 : 0.3);
    this.overlayContent.add([fuseSlotBg, fuseSlotCutout, fuseSlotLabel, fuseSlotSpec]);

    if (!hasFuse) {
      // Empty — show dust/shadow outline of what used to be there
      const empty = this.add.text(86, 30, "пусто", {
        fontFamily: "Georgia, serif", fontSize: "13px", color: "#6a7a84", fontStyle: "italic",
      }).setOrigin(0.5);
      this.overlayContent.add(empty);
      // Bottom status message
      const doneMsg = this.add.text(0, 134, "Ящик пуст. Предохранитель уже забран.", {
        fontFamily: "Georgia, serif", fontSize: "13px", color: "#b8c4cc", align: "center", fontStyle: "italic",
      }).setOrigin(0.5);
      this.overlayContent.add(doneMsg);
      return;
    }

    // Fuse icon inside the slot + halo that pulses
    const fuseHalo = this.add.rectangle(86, 30, 146, 62, 0xe1bb73, 0.12);
    this.overlayContent.add(fuseHalo);
    const icon = createItemIcon(this, "fuse", 86, 30, "overlay");
    this.overlayContent.add(icon);

    this.tweens.add({
      targets: fuseHalo, alpha: 0.28, duration: 1100, yoyo: true, repeat: -1, ease: "sine.inOut",
    });
    this.tweens.add({
      targets: icon, y: 28, duration: 1200, yoyo: true, repeat: -1, ease: "sine.inOut",
    });

    const takeHint = this.add.text(86, 134, "кликни, чтобы забрать", {
      fontFamily: "Georgia, serif", fontSize: "12px", color: "#d7c087", fontStyle: "italic",
    }).setOrigin(0.5);
    this.overlayContent.add(takeHint);

    this.createOverlayRectHotspot(86, 30, 180, 100, {
      pointerover: () => { fuseSlotBg.setStrokeStyle(3, 0xe1bb73, 0.95); fuseHalo.setFillStyle(0xe1bb73, 0.3); },
      pointerout: () => { fuseSlotBg.setStrokeStyle(2, 0xe1bb73, 0.55); fuseHalo.setFillStyle(0xe1bb73, 0.12); },
      pointerdown: () => {
        this.addInventoryItem("fuse");
        this.showNarration("Ты вынимаешь предохранитель из пенального ложемента. Теперь его можно поставить в генератор.");
        this.openToolboxContainer();
      },
    });
  }

  openGeneratorRepairOverlay() {
    const generatorState = this.session.puzzleState.generator;
    const ready = this.isGeneratorReady();
    this.openOverlay(
      "Сервисный отсек генератора",
      "Собери узел физически: вставь предохранитель в направляющие и прижми скобой, потом насади штурвал и доверни до упора."
    );

    this.overlayHint.setText("1-9 — предмет, клик по узлам, Esc — закрыть");

    // === Outer shell ===
    const frame = this.add.rectangle(0, 10, 600, 300, 0x0a1218, 0.98).setStrokeStyle(2, 0x3a4a52, 0.4);
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, 0x1c2e3c, 0.45);
    for (let gx = -280; gx <= 280; gx += 40) {
      gridGfx.beginPath(); gridGfx.moveTo(gx, -132); gridGfx.lineTo(gx, 150); gridGfx.strokePath();
    }
    this.overlayContent.add([frame, gridGfx]);

    // Back panel (opened)
    const backShadow = this.add.rectangle(4, 16, 560, 270, 0x000000, 0.5);
    const backPanel = this.add.rectangle(0, 10, 550, 260, 0x1a232d, 1).setStrokeStyle(3, 0xe3c47b, 0.32);
    const backGrain = this.add.graphics();
    backGrain.lineStyle(1, 0x3a4654, 0.5);
    for (let y = -110; y <= 130; y += 20) {
      backGrain.beginPath(); backGrain.moveTo(-270, 10 + y); backGrain.lineTo(270, 10 + y); backGrain.strokePath();
    }
    // Wiring harness draped along the back (decorative)
    backGrain.lineStyle(2, 0xd7c087, 0.5);
    backGrain.beginPath(); backGrain.moveTo(-250, -100); backGrain.lineTo(-150, -84); backGrain.lineTo(-100, -110); backGrain.strokePath();
    backGrain.lineStyle(2, 0xa8584a, 0.5);
    backGrain.beginPath(); backGrain.moveTo(-80, -108); backGrain.lineTo(60, -94); backGrain.lineTo(120, -116); backGrain.strokePath();
    backGrain.lineStyle(2, 0x4aacbf, 0.4);
    backGrain.beginPath(); backGrain.moveTo(140, -104); backGrain.lineTo(240, -88); backGrain.strokePath();
    this.overlayContent.add([backShadow, backPanel, backGrain]);

    // === Left column: fuse bay ===
    const fuseX = -150;
    const fuseColumn = this.add.rectangle(fuseX, 12, 180, 240, 0x26323c, 1).setStrokeStyle(2, 0x93a8b3, 0.35);
    const fuseCaptionStrip = this.add.rectangle(fuseX, -98, 180, 22, 0x10181f, 0.95);
    const fuseCaption = this.add.text(fuseX, -98, "ШАГ 1 · ПРЕДОХРАНИТЕЛЬ", {
      fontFamily: "monospace", fontSize: "9.5px", color: "#a4dde8", letterSpacing: 1.5,
    }).setOrigin(0.5);
    // Fuse rail frame with contact pins at top and bottom
    const fuseFrame = this.add.rectangle(fuseX, 10, 100, 150, 0x0d1419, 1).setStrokeStyle(3, 0x90a6b2, 0.5);
    const fuseRailL = this.add.rectangle(fuseX - 18, 10, 10, 130, 0x6f838f, 1);
    const fuseRailR = this.add.rectangle(fuseX + 18, 10, 10, 130, 0x6f838f, 1);
    const fusePinTop = this.add.rectangle(fuseX, -56, 46, 8, 0xd7c087, 0.85);
    const fusePinBtm = this.add.rectangle(fuseX, 76, 46, 8, 0xd7c087, 0.85);
    // Contact label
    const contactLabel = this.add.text(fuseX - 50, -56, "+", {
      fontFamily: "monospace", fontSize: "12px", color: "#d7c087", fontStyle: "bold",
    }).setOrigin(0.5);
    const contactLabel2 = this.add.text(fuseX - 50, 76, "−", {
      fontFamily: "monospace", fontSize: "12px", color: "#d7c087", fontStyle: "bold",
    }).setOrigin(0.5);
    this.overlayContent.add([fuseColumn, fuseCaptionStrip, fuseCaption, fuseFrame, fuseRailL, fuseRailR, fusePinTop, fusePinBtm, contactLabel, contactLabel2]);

    // Clamp on the side
    const fuseClamp = this.add.rectangle(fuseX + 64, 10, 26, 96,
      generatorState.fuseInstalled ? 0xd7c087 : 0x5d707c, 1
    ).setStrokeStyle(2, 0xe1bb73, generatorState.fuseSeated ? 0.75 : 0.25);
    const fuseClampHinge = this.add.circle(fuseX + 64, -42, 3.5, 0x2a3540, 1).setStrokeStyle(1, 0xe1bb73, 0.7);
    const fuseClampTip = this.add.rectangle(fuseX + 52, 60, 14, 8, 0xd7c087, generatorState.fuseInstalled ? 1 : 0.5);
    const fuseClampLabel = this.add.text(fuseX + 64, 86, "скоба", {
      fontFamily: "monospace", fontSize: "8.5px", color: "#d7c087",
    }).setOrigin(0.5);
    this.overlayContent.add([fuseClamp, fuseClampHinge, fuseClampTip, fuseClampLabel]);

    // Status label for fuse step
    const fuseStatus = this.add.text(fuseX, 120,
      generatorState.fuseInstalled ? "предохранитель зафиксирован" :
      generatorState.fuseSeated ? "осталось прижать скобой →" :
      "вставь предохранитель",
      {
        fontFamily: "Georgia, serif", fontSize: "12px",
        color: generatorState.fuseInstalled ? "#95d6a2" : "#dce6e9",
        align: "center", fontStyle: generatorState.fuseInstalled ? "italic" : "normal",
        wordWrap: { width: 160 },
      }
    ).setOrigin(0.5);
    this.overlayContent.add(fuseStatus);

    // LED for fuse step
    const fuseLed = this.add.circle(fuseX - 70, -90, 4.5,
      generatorState.fuseInstalled ? 0x7de08f : generatorState.fuseSeated ? 0xd7c087 : 0x2a3540, 1
    ).setStrokeStyle(1, 0x5a7080, 0.7);
    this.overlayContent.add(fuseLed);

    // Fuse icon (if seated)
    if (generatorState.fuseSeated || generatorState.fuseInstalled) {
      const fuseIcon = createItemIcon(this, "fuse", fuseX, generatorState.fuseInstalled ? 10 : 20, "overlay");
      fuseIcon.setAlpha(generatorState.fuseInstalled ? 1 : 0.95);
      this.overlayContent.add(fuseIcon);
      if (generatorState.fuseInstalled) {
        // Subtle current-flow pulse between the pins
        const currentLine = this.add.rectangle(fuseX, 10, 4, 130, 0xa4dde8, 0.3);
        this.overlayContent.add(currentLine);
        this.tweens.add({ targets: currentLine, alpha: 0.6, duration: 700, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
    }

    this.createOverlayRectHotspot(fuseX, 10, 110, 150, {
      pointerdown: () => {
        if (generatorState.fuseInstalled) { this.showMessage("Предохранитель уже стоит на месте."); return; }
        if (generatorState.fuseSeated) { this.showMessage("Предохранитель уже в направляющих. Теперь прижми его боковой скобой."); return; }
        if (this.session.selectedItemId !== "fuse") {
          this.showMessage("Сначала выбери предохранитель в инвентаре, чтобы вставить его в направляющие.");
          return;
        }
        this.session.puzzleState.generator.fuseSeated = true;
        this.removeInventoryItem("fuse");
        this.cameras.main.shake(90, 0.0012);
        this.showNarration("Предохранитель вошёл в направляющие. Теперь прижми его стопорной скобой сбоку.");
        this.openGeneratorRepairOverlay();
      },
    });

    this.createOverlayRectHotspot(fuseX + 64, 10, 56, 120, {
      pointerover: () => { if (!generatorState.fuseInstalled) fuseClamp.setFillStyle(0xe1bb73, 1); },
      pointerout: () => { if (!generatorState.fuseInstalled) fuseClamp.setFillStyle(0x5d707c, 1); },
      pointerdown: () => {
        if (generatorState.fuseInstalled) { this.showMessage("Скоба уже держит предохранитель."); return; }
        if (!generatorState.fuseSeated) { this.showMessage("Сначала вставь предохранитель в направляющие."); return; }
        this.session.puzzleState.generator.fuseInstalled = true;
        this.emitWorldPulse(2780, 548, { color: 0xa8d4de, radius: 18, scale: 2.6, duration: 620 });
        this.showNarration("Скоба встаёт на место с лёгким щелчком. Питание потечёт через предохранитель.");
        this.openGeneratorRepairOverlay();
      },
    });

    // === Right column: valve bay ===
    const valveX = 150;
    const valveColumn = this.add.rectangle(valveX, 12, 200, 240, 0x32281f, 1).setStrokeStyle(2, 0xba945c, 0.42);
    const valveCaptionStrip = this.add.rectangle(valveX, -98, 200, 22, 0x1a1410, 0.95);
    const valveCaption = this.add.text(valveX, -98, "ШАГ 2 · КЛАПАН", {
      fontFamily: "monospace", fontSize: "9.5px", color: "#e8c488", letterSpacing: 1.5,
    }).setOrigin(0.5);
    this.overlayContent.add([valveColumn, valveCaptionStrip, valveCaption]);

    // Fuel pipe going up/down from the valve
    const pipeVert = this.add.rectangle(valveX, 12, 22, 140, 0x4a2f1a, 1).setStrokeStyle(2, 0x7a5a3a, 0.7);
    const pipeVertSheen = this.add.rectangle(valveX - 6, 12, 3, 140, 0x9a7a5a, 0.4);
    // Top pipe curve
    const pipeTop = this.add.rectangle(valveX - 20, -68, 40, 20, 0x4a2f1a, 1).setStrokeStyle(2, 0x7a5a3a, 0.7);
    // Bottom pipe leading to engine
    const pipeBottom = this.add.rectangle(valveX + 30, 82, 90, 20, 0x4a2f1a, 1).setStrokeStyle(2, 0x7a5a3a, 0.7);
    // Engine block hint (bottom-right of the valve column)
    const engineBlock = this.add.rectangle(valveX + 70, 102, 34, 40, 0x2a2018, 1).setStrokeStyle(2, 0x5a3a24, 0.75);
    const engineExhaust = this.add.rectangle(valveX + 78, 74, 6, 18, 0x8a7040, 0.85);
    this.overlayContent.add([pipeVert, pipeVertSheen, pipeTop, pipeBottom, engineBlock, engineExhaust]);

    // Valve axis (where the wheel mounts)
    const valveAxis = this.add.circle(valveX, 12, 36, 0x4d3828, 0).setStrokeStyle(6, 0xc39d68, 0.88);
    const valveBody = this.add.rectangle(valveX, 12, 60, 30, 0x5f4735, 1).setStrokeStyle(2, 0xc39d68, 0.6);
    const valveCapDot = this.add.circle(valveX, 12, 6, 0x2a1a10, 1).setStrokeStyle(2, 0xc39d68, 0.85);
    this.overlayContent.add([valveAxis, valveBody, valveCapDot]);

    // Pressure gauge (small, left of valve)
    const gaugeX = valveX - 58;
    const gaugeY = -42;
    const gaugeBg = this.add.circle(gaugeX, gaugeY, 18, 0x1a1410, 1).setStrokeStyle(2, 0xc39d68, 0.7);
    const gaugeArc = this.add.graphics();
    gaugeArc.lineStyle(2, 0xd46462, 0.75);
    gaugeArc.beginPath(); gaugeArc.arc(gaugeX, gaugeY, 12, Math.PI, Math.PI * 1.4, false); gaugeArc.strokePath();
    gaugeArc.lineStyle(2, 0xe1bb73, 0.75);
    gaugeArc.beginPath(); gaugeArc.arc(gaugeX, gaugeY, 12, Math.PI * 1.4, Math.PI * 1.8, false); gaugeArc.strokePath();
    gaugeArc.lineStyle(2, 0x7de08f, 0.75);
    gaugeArc.beginPath(); gaugeArc.arc(gaugeX, gaugeY, 12, Math.PI * 1.8, Math.PI * 2, false); gaugeArc.strokePath();
    const gaugeNeedle = this.add.rectangle(gaugeX, gaugeY, 1.6, 12, 0xe1bb73, 1).setOrigin(0.5, 1);
    // Needle position based on valve turns
    const totalTurns = generatorState.valveWheelInstalled ? 3 : (generatorState.valveWheelTurns || 0);
    gaugeNeedle.setAngle(-78 + totalTurns * 52);
    const gaugeLabel = this.add.text(gaugeX, gaugeY + 26, "P", {
      fontFamily: "monospace", fontSize: "8px", color: "#c39d68",
    }).setOrigin(0.5);
    this.overlayContent.add([gaugeBg, gaugeArc, gaugeNeedle, gaugeLabel]);

    // Wheel icon — the actual cranking visual
    if (generatorState.valveWheelMounted || generatorState.valveWheelInstalled) {
      const wheelIcon = createItemIcon(this, "valveWheel", valveX, 12, "overlay");
      wheelIcon.setRotation(generatorState.valveWheelInstalled ? 1.57 : generatorState.valveWheelTurns * 0.52);
      wheelIcon.setAlpha(generatorState.valveWheelInstalled ? 1 : 0.95);
      this.overlayContent.add(wheelIcon);
    }

    // Status label for valve step
    const valveStatus = this.add.text(valveX, 120,
      generatorState.valveWheelInstalled ? "клапан дожат · топливо идёт" :
      generatorState.valveWheelMounted ? `крути штурвал · ещё ${3 - generatorState.valveWheelTurns}` :
      "насади штурвал на ось",
      {
        fontFamily: "Georgia, serif", fontSize: "12px",
        color: generatorState.valveWheelInstalled ? "#f0dfc2" : "#eadcc1",
        align: "center", fontStyle: generatorState.valveWheelInstalled ? "italic" : "normal",
        wordWrap: { width: 180 },
      }
    ).setOrigin(0.5);
    this.overlayContent.add(valveStatus);

    // LED for valve step
    const valveLed = this.add.circle(valveX + 70, -90, 4.5,
      generatorState.valveWheelInstalled ? 0x7de08f :
      generatorState.valveWheelMounted ? 0xd7c087 : 0x2a3540, 1
    ).setStrokeStyle(1, 0x5a7080, 0.7);
    this.overlayContent.add(valveLed);

    this.createOverlayRectHotspot(valveX, 12, 120, 130, {
      pointerdown: () => {
        if (generatorState.valveWheelInstalled) { this.showMessage("Штурвал уже дотянут до отсечки."); return; }
        if (!generatorState.valveWheelMounted) {
          if (this.session.selectedItemId !== "valveWheel") {
            this.showMessage("Выбери штурвал в инвентаре и насади его на ось клапана.");
            return;
          }
          this.session.puzzleState.generator.valveWheelMounted = true;
          this.session.puzzleState.generator.valveWheelTurns = 0;
          this.removeInventoryItem("valveWheel");
          this.cameras.main.shake(90, 0.0012);
          this.showNarration("Штурвал сел на ось. Теперь доверни его до упора — три оборота.");
          this.openGeneratorRepairOverlay();
          return;
        }
        this.session.puzzleState.generator.valveWheelTurns += 1;
        if (this.session.puzzleState.generator.valveWheelTurns >= 3) {
          this.session.puzzleState.generator.valveWheelInstalled = true;
          this.emitWorldPulse(2780, 548, { color: 0xc39d68, radius: 22, scale: 3, duration: 760 });
          this.showNarration("Штурвал дотянут до жёсткой отсечки. Топливо пошло в генератор.");
        } else {
          this.cameras.main.shake(80, 0.001);
          this.showMessage(`Штурвал проворачивается с усилием. Осталось ${3 - this.session.puzzleState.generator.valveWheelTurns}.`);
        }
        this.openGeneratorRepairOverlay();
      },
    });

    // === Status bar (bottom) ===
    const statusBandShadow = this.add.rectangle(2, 142, 500, 34, 0x000000, 0.45);
    const statusBand = this.add.rectangle(0, 138, 494, 30, 0x0d1419, 0.95)
      .setStrokeStyle(2, ready ? 0x7de08f : 0x4d5b64, ready ? 0.7 : 0.3);
    const statusLedLine = this.add.graphics();
    // Two master LEDs (fuse done, valve done) on the status bar
    statusLedLine.fillStyle(generatorState.fuseInstalled ? 0x7de08f : 0x2a3540, 1);
    statusLedLine.fillCircle(-216, 138, 4);
    statusLedLine.fillStyle(generatorState.valveWheelInstalled ? 0x7de08f : 0x2a3540, 1);
    statusLedLine.fillCircle(-196, 138, 4);
    const statusText = this.add.text(0, 138, ready
      ? "ГЕНЕРАТОР СОБРАН · ПИТАНИЕ ВОССТАНОВЛЕНО"
      : "Собери оба узла, чтобы вернуть питание.", {
      fontFamily: "monospace", fontSize: ready ? "12px" : "12px",
      color: ready ? "#7de08f" : "#b8c4cc", align: "center", letterSpacing: ready ? 1.5 : 0,
      wordWrap: { width: 440 },
    }).setOrigin(0.5);
    this.overlayContent.add([statusBandShadow, statusBand, statusLedLine, statusText]);

    // If fully ready, pulse the status and master LEDs
    if (ready) {
      this.tweens.add({
        targets: statusBand, alpha: 0.8, duration: 720, yoyo: true, repeat: -1, ease: "sine.inOut",
      });
    }
  }

  openRadioOverlay() {
    this.openOverlay(
      "Рация береговой связи",
      "Портативная рация. Шкала ещё держит волну, динамик оживает при настройке. Прокрути ручку — вытащи фразу из помех."
    );

    // Frame
    const frame = this.add.rectangle(0, 10, 540, 260, 0x141a20, 0.97).setStrokeStyle(2, 0x5a7080, 0.45);
    const frameInner = this.add.rectangle(0, 10, 520, 240, 0x0c1218, 0.62);
    this.overlayContent.add([frame, frameInner]);

    // Shell
    const shellShadow = this.add.rectangle(4, 16, 470, 200, 0x000000, 0.4);
    const shell = this.add.rectangle(0, 8, 470, 200, 0x22241e, 1).setStrokeStyle(3, 0xe3c47b, 0.38);
    const shellInner = this.add.rectangle(0, 8, 460, 190, 0x2c2e26, 0.5);
    const brandPlate = this.add.rectangle(180, -70, 64, 14, 0x3a3a28, 1);
    const brandText = this.add.text(180, -70, "Р-842", {
      fontFamily: "monospace", fontSize: "8px", color: "#e3c47b", letterSpacing: 1,
    }).setOrigin(0.5);
    this.overlayContent.add([shellShadow, shell, shellInner, brandPlate, brandText]);

    // Frequency scale (top)
    const scaleBg = this.add.rectangle(-52, -48, 290, 18, 0x0c1218, 1).setStrokeStyle(1, 0xd4a060, 0.55);
    const scaleGfx = this.add.graphics();
    scaleGfx.lineStyle(1, 0xd4a060, 0.75);
    for (let i = 0; i <= 20; i += 1) {
      const x = -52 - 140 + i * 14;
      const tick = i % 5 === 0 ? 8 : 4;
      scaleGfx.beginPath(); scaleGfx.moveTo(x, -48 + 9 - tick); scaleGfx.lineTo(x, -48 + 9); scaleGfx.strokePath();
    }
    ["121", "124", "127", "130"].forEach((lbl, i) => {
      const x = -52 - 140 + i * 70;
      this.overlayContent.add(
        this.add.text(x, -28, lbl, {
          fontFamily: "monospace", fontSize: "8px", color: "#d4a060",
        }).setOrigin(0.5)
      );
    });
    const freqPointer = this.add.triangle(-154, -48, 0, -4, -4, 2, 4, 2, 0xe3c47b, 1);
    this.overlayContent.add([scaleBg, scaleGfx, freqPointer]);

    // CRT-ish green display
    const displayBezel = this.add.rectangle(-60, 6, 218, 82, 0x141a14, 1).setStrokeStyle(3, 0x5a7a60, 0.65);
    const display = this.add.rectangle(-60, 6, 200, 68, 0x071a10, 1).setStrokeStyle(2, 0x7ed88c, 0.5);
    const scanlines = this.add.graphics();
    scanlines.lineStyle(1, 0x7ed88c, 0.1);
    for (let y = -22; y <= 32; y += 3) {
      scanlines.beginPath(); scanlines.moveTo(-158, 6 + y); scanlines.lineTo(38, 6 + y); scanlines.strokePath();
    }
    const waveformGfx = this.add.graphics();
    const drawWaveform = (amp, color, alpha) => {
      waveformGfx.clear();
      waveformGfx.lineStyle(1.6, color, alpha);
      waveformGfx.beginPath();
      const startX = -158;
      waveformGfx.moveTo(startX, 6);
      for (let x = startX; x <= 38; x += 3) {
        const nx = x - startX;
        const wy = Math.sin(nx * 0.22) * amp * 0.5 + Math.sin(nx * 0.47) * amp * 0.3 + (Math.random() - 0.5) * amp * 0.8;
        waveformGfx.lineTo(x, 6 + wy);
      }
      waveformGfx.strokePath();
    };
    drawWaveform(4, 0x7ed88c, 0.5);
    this.overlayContent.add([displayBezel, display, scanlines, waveformGfx]);

    // Signal bars
    const signalBars = [];
    for (let i = 0; i < 5; i += 1) {
      const bar = this.add.rectangle(22 + i * 5, -16, 3, 4 + i * 2, 0x2a3540, 1);
      signalBars.push(bar);
      this.overlayContent.add(bar);
    }

    // Speaker grille (bottom-left)
    const grille = this.add.rectangle(-170, 72, 108, 46, 0x0c1218, 1).setStrokeStyle(2, 0x5a7a60, 0.55);
    const grilleGfx = this.add.graphics();
    grilleGfx.fillStyle(0x3a4a38, 0.85);
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 10; c += 1) {
        grilleGfx.fillCircle(-214 + c * 9, 60 + r * 9, 1.8);
      }
    }
    this.overlayContent.add([grille, grilleGfx]);

    // Knob
    const knobX = 168;
    const knobY = 4;
    const knobShadow = this.add.circle(knobX + 3, knobY + 3, 40, 0x000000, 0.3);
    const knobBezel = this.add.circle(knobX, knobY, 44, 0x1a1a14, 1).setStrokeStyle(3, 0xe3c47b, 0.6);
    const knobFace = this.add.circle(knobX, knobY, 36, 0x3a3428, 1).setStrokeStyle(2, 0xd4a060, 0.7);
    const knobGrip = this.add.graphics();
    knobGrip.lineStyle(2, 0x5a4a2a, 0.85);
    for (let i = 0; i < 14; i += 1) {
      const ang = (i / 14) * Math.PI * 2;
      const x1 = knobX + Math.cos(ang) * 30;
      const y1 = knobY + Math.sin(ang) * 30;
      const x2 = knobX + Math.cos(ang) * 36;
      const y2 = knobY + Math.sin(ang) * 36;
      knobGrip.beginPath(); knobGrip.moveTo(x1, y1); knobGrip.lineTo(x2, y2); knobGrip.strokePath();
    }
    const knobHub = this.add.circle(knobX, knobY, 8, 0x2a2418, 1).setStrokeStyle(1.5, 0xe3c47b, 0.75);
    const knobMark = this.add.rectangle(knobX, knobY - 22, 4, 24, 0xe3c47b, 1).setOrigin(0.5, 1);
    const knobLabel = this.add.text(knobX, knobY + 62, "НАСТРОЙКА", {
      fontFamily: "monospace", fontSize: "8.5px", color: "#e3c47b", letterSpacing: 1.5,
    }).setOrigin(0.5);
    this.overlayContent.add([knobShadow, knobBezel, knobFace, knobGrip, knobHub, knobMark, knobLabel]);

    // Transcript lines
    const lineA = this.add.text(-60, 72, "«...не спускайся туда...", {
      fontFamily: "Georgia, serif", fontSize: "14px", color: "#b4e8c4", align: "center",
    }).setOrigin(0.5).setAlpha(0);
    const lineB = this.add.text(-60, 92, "...один»", {
      fontFamily: "Georgia, serif", fontSize: "14px", color: "#b4e8c4", align: "center",
    }).setOrigin(0.5).setAlpha(0);
    this.overlayContent.add([lineA, lineB]);

    // Multiple snippets cycled on repeat tunings. Each subsequent tune reveals more lore.
    const snippets = [
      {
        lineA: "«...не спускайся туда...",
        lineB: "...один»",
        narration: "Из шумов проступает фраза: «Не спускайся туда один». Значит, внизу кто-то был совсем недавно, а начать всё равно придётся с генератора.",
      },
      {
        lineA: "«...Керн и Сын подтверж-",
        lineB: "дают заказ...»",
        narration: "Сквозь треск: «...Керн и Сын подтверждают заказ...». Ты где-то слышал эту фамилию. Кажется, это судоходная контора.",
      },
      {
        lineA: "«...инспектор выйдет",
        lineB: "с материка к заре...»",
        narration: "«...инспектор выйдет с материка к заре...». Похоже, корабль, о котором говорил Барк, везёт не просто груз.",
      },
      {
        lineA: "«...район семь, снова",
        lineB: "с потерей контакта...»",
        narration: "«...район семь, снова с потерей контакта...». Передатчик не отзывается. В этом квадрате, похоже, теряли суда и раньше — много раз.",
      },
    ];
    let tuneCount = 0;

    this.createOverlayRectHotspot(knobX, knobY, 90, 90, {
      pointerover: () => knobBezel.setStrokeStyle(3, 0xf1d68a, 0.95),
      pointerout: () => knobBezel.setStrokeStyle(3, 0xe3c47b, 0.6),
      pointerdown: () => {
        const snippet = snippets[Math.min(tuneCount, snippets.length - 1)];
        tuneCount += 1;
        this.tweens.add({ targets: knobMark, angle: 94 + (tuneCount * 30) % 180, duration: 280, ease: "quad.out" });
        this.tweens.add({ targets: freqPointer, x: -140 + ((tuneCount * 48) % 280), duration: 520, ease: "quad.out" });
        this.tweens.add({
          targets: {}, t: 0, duration: 420,
          onUpdate: (tw) => drawWaveform(6 + (1 - tw.progress) * 10, 0x7ed88c, 0.55 + tw.progress * 0.35),
          onComplete: () => drawWaveform(10, 0xb4e8c4, 0.9),
        });
        signalBars.forEach((bar, i) => {
          this.time.delayedCall(100 + i * 80, () => bar.setFillStyle(0x7de08f, 1));
        });
        this.emitWorldPulse(1608, 530, { color: 0x8bcad1, radius: 20, scale: 2.8, duration: 640 });
        lineA.setText(snippet.lineA);
        lineB.setText(snippet.lineB);
        this.tweens.add({ targets: [lineA, lineB], alpha: { from: 0, to: 1 }, duration: 360, delay: 180, ease: "quad.out" });
        this.showNarration(snippet.narration);
      },
    });
  }

  openServiceHatchReleaseOverlay() {
    this.openOverlay(
      "Служебный люк",
      "Питание вернулось, давление в контуре уронило красные индикаторы. Сорви стопор, затем дожми рычаг — люк выпустит пар и уйдёт вниз."
    );

    this.overlayHint.setText("Сначала стопор, затем рычаг, Esc — закрыть");

    // Concrete plinth / deck around the hatch
    const plinth = this.add.rectangle(0, 30, 480, 230, 0x1a2028, 0.96).setStrokeStyle(2, 0x3a4650, 0.35);
    const plinthPlank = this.add.rectangle(0, 118, 480, 14, 0x2a3440, 0.9).setStrokeStyle(1, 0x5a7080, 0.3);
    const rivets = this.add.graphics();
    rivets.fillStyle(0x5a6a74, 0.8);
    [[-210, -60], [210, -60], [-210, 90], [210, 90]].forEach(([x, y]) => {
      rivets.fillCircle(x, y, 3);
      rivets.lineStyle(1, 0x2a3540, 0.7); rivets.strokeCircle(x, y, 3);
    });
    this.overlayContent.add([plinth, plinthPlank, rivets]);

    // Hatch ring, petals (circular 4-petal lock structure)
    const hatchRingOuter = this.add.circle(0, 10, 118, 0x25343e, 1).setStrokeStyle(6, 0xc0a06c, 0.42);
    const hatchRing = this.add.circle(0, 10, 110, 0x1a2630, 1).setStrokeStyle(3, 0x8aacba, 0.32);
    const hatchInner = this.add.circle(0, 10, 78, 0x0f151b, 1).setStrokeStyle(4, 0x4d5b64, 0.28);
    // Hatch central cross
    const crossA = this.add.rectangle(0, 10, 108, 5, 0x6a8090, 0.55);
    const crossB = this.add.rectangle(0, 10, 5, 108, 0x6a8090, 0.55);
    const centerBolt = this.add.circle(0, 10, 11, 0x2a3540, 1).setStrokeStyle(2, 0xd7c087, 0.55);
    const centerDot = this.add.circle(0, 10, 3, 0xd7c087, 1);
    this.overlayContent.add([hatchRingOuter, hatchRing, hatchInner, crossA, crossB, centerBolt, centerDot]);

    // Pressure indicator (left side, semicircular gauge going from red → green)
    const gaugeX = -172;
    const gaugeY = -46;
    const gaugeBg = this.add.circle(gaugeX, gaugeY, 30, 0x0d1419, 0.94).setStrokeStyle(2, 0x5a7a88, 0.55);
    const gaugeFace = this.add.graphics();
    gaugeFace.lineStyle(2, 0xd46462, 0.82);
    gaugeFace.beginPath(); gaugeFace.arc(gaugeX, gaugeY, 20, Math.PI, Math.PI * 1.4, false); gaugeFace.strokePath();
    gaugeFace.lineStyle(2, 0xe1bb73, 0.82);
    gaugeFace.beginPath(); gaugeFace.arc(gaugeX, gaugeY, 20, Math.PI * 1.4, Math.PI * 1.8, false); gaugeFace.strokePath();
    gaugeFace.lineStyle(2, 0x7de08f, 0.82);
    gaugeFace.beginPath(); gaugeFace.arc(gaugeX, gaugeY, 20, Math.PI * 1.8, Math.PI * 2, false); gaugeFace.strokePath();
    // Needle: starts in red, sweeps to green when pressure drops
    const needle = this.add.rectangle(gaugeX, gaugeY, 2, 22, 0xd7c087, 1).setOrigin(0.5, 1);
    needle.setAngle(-78);
    const gaugeLabel = this.add.text(gaugeX, gaugeY + 38, "ДАВЛ", {
      fontFamily: "monospace", fontSize: "9px", color: "#d7c087",
    }).setOrigin(0.5);
    this.overlayContent.add([gaugeBg, gaugeFace, needle, gaugeLabel]);

    // Latch bar (top)
    const latchBg = this.add.rectangle(-18, -78, 150, 22, 0x1c252d, 0.9).setStrokeStyle(1, 0x4d5b64, 0.3);
    const latch = this.add.rectangle(-18, -78, 130, 14, 0x6a7a84, 1).setStrokeStyle(2, 0xd7c087, 0.35);
    const latchGrip = this.add.rectangle(40, -78, 10, 24, 0xd7c087, 0.88);
    const latchCaption = this.add.text(-18, -110, "СТОПОР", {
      fontFamily: "monospace", fontSize: "10px", color: "#d7c087", letterSpacing: 2,
    }).setOrigin(0.5);
    this.overlayContent.add([latchBg, latch, latchGrip, latchCaption]);

    // Lever track + handle (right side)
    const leverX = 172;
    const leverTrack = this.add.rectangle(leverX, 10, 20, 152, 0x0c1419, 0.9).setStrokeStyle(2, 0x4d5b64, 0.35);
    const leverNotchTop = this.add.rectangle(leverX, -60, 28, 3, 0x5a7080, 0.7);
    const leverNotchBtm = this.add.rectangle(leverX, 78, 28, 3, 0x5a7080, 0.7);
    const handle = this.add.rectangle(leverX, -30, 28, 92, 0xd7c087, 1).setStrokeStyle(2, 0x4d5b64, 0.5);
    const handleGrip = this.add.rectangle(leverX, -66, 48, 18, 0x355565, 1).setStrokeStyle(2, 0xd7c087, 0.35);
    const handleCaption = this.add.text(leverX, -110, "РЫЧАГ", {
      fontFamily: "monospace", fontSize: "10px", color: "#d7c087", letterSpacing: 2,
    }).setOrigin(0.5);
    this.overlayContent.add([leverTrack, leverNotchTop, leverNotchBtm, handle, handleGrip, handleCaption]);

    // Steam puffs (initially invisible — emerge when lever pulled)
    const steamA = this.add.ellipse(-40, 100, 60, 20, 0xe6f0f4, 0);
    const steamB = this.add.ellipse(40, 108, 72, 22, 0xe6f0f4, 0);
    const steamC = this.add.ellipse(0, 112, 90, 26, 0xe6f0f4, 0);
    this.overlayContent.add([steamA, steamB, steamC]);

    // Status label (bottom)
    const labelBand = this.add.rectangle(0, 150, 440, 34, 0x0d1419, 0.9).setStrokeStyle(1, 0x5a7080, 0.3);
    const label = this.add.text(0, 150, "Сначала сорви стопор, затем потяни рычаг вниз.", {
      fontFamily: "Georgia, serif", fontSize: "15px", color: "#e6ddc4", align: "center",
      wordWrap: { width: 410 },
    }).setOrigin(0.5);
    this.overlayContent.add([labelBand, label]);

    let latchReleased = false;
    let leverPulled = false;

    this.createOverlayRectHotspot(-18, -78, 160, 42, {
      pointerover: () => { if (!latchReleased) { latch.setStrokeStyle(2, 0xe1bb73, 0.85); latchGrip.setFillStyle(0xe1bb73); } },
      pointerout:  () => { if (!latchReleased) { latch.setStrokeStyle(2, 0xd7c087, 0.35); latchGrip.setFillStyle(0xd7c087); } },
      pointerdown: () => {
        if (latchReleased) { this.showMessage("Стопор уже сорван. Теперь тяни рычаг вниз."); return; }
        latchReleased = true;
        this.tweens.add({
          targets: [latch, latchGrip], x: "-=106", angle: -20, alpha: 0.45,
          duration: 300, ease: "back.in",
        });
        // Needle swings from red zone to amber
        this.tweens.add({ targets: needle, angle: -14, duration: 420, ease: "quad.out" });
        this.emitWorldPulse(1094, 542, { color: 0xd7c087, radius: 18, scale: 2.4, duration: 540 });
        label.setText("Стопор сошёл. Давление падает. Теперь тяни рычаг вниз.");
      },
    });

    this.createOverlayRectHotspot(leverX, 10, 96, 150, {
      pointerover: () => { if (latchReleased && !leverPulled) handle.setFillStyle(0xe1bb73); },
      pointerout: () => { if (!leverPulled) handle.setFillStyle(0xd7c087); },
      pointerdown: () => {
        if (leverPulled) return;
        if (!latchReleased) {
          this.showMessage("Рычаг держит стопор. Сначала сорви фиксатор сверху.");
          this.tweens.add({ targets: [handle, handleGrip], x: `+=4`, duration: 50, yoyo: true, repeat: 1 });
          return;
        }
        leverPulled = true;
        this.session.puzzleState.serviceHatch.released = true;
        // Lever slides into bottom notch
        this.tweens.add({ targets: [handle, handleGrip], y: "+=84", duration: 280, ease: "back.in" });
        // Needle reaches green
        this.tweens.add({ targets: needle, angle: 78, duration: 520, ease: "quad.out" });
        // Hatch bolt retracts, center opens slightly
        this.tweens.add({ targets: [crossA, crossB], alpha: 0.2, duration: 300 });
        this.tweens.add({ targets: centerBolt, scaleX: 0.6, scaleY: 0.6, duration: 260 });
        // Steam puffs
        [[steamA, -40, 40, 380], [steamB, 40, 48, 420], [steamC, 0, 56, 460]].forEach(([obj, dx, dy, dur]) => {
          obj.setAlpha(0.75);
          this.tweens.add({
            targets: obj, x: obj.x + dx * 0.3, y: obj.y - dy, alpha: 0, scaleX: 1.6, scaleY: 1.6,
            duration: dur, ease: "quad.out",
          });
        });
        this.cameras.main.shake(220, 0.0024);
        this.emitWorldPulse(1094, 542, { color: 0x95d6a2, radius: 26, scale: 3.4, duration: 860 });
        this.showNarration("Рычаг идёт вниз с шипением. Пар сбрасывается, люк проседает в шахту — путь на служебный уровень открыт.");
        this.time.delayedCall(320, () => this.transitionToService());
      },
    });
  }

  transitionToService() {
    this.session.stage = "service";
    this.session.progressStage = "service";
    this.session.undergroundRegion = "service";
    this.transitionToScene(
      "underground-preview",
      { entry: "from-shore" },
      "Нижние помещения",
      "Под башней теперь единый ход: служебный отсек, тоннель, пристань и бухта связаны одной непрерывной кромкой."
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

  maybeAutoTriggerKeeperIntro() {
    if (!this.session.keeperDialogue) {
      return;
    }
    if (this.session.keeperDialogue.introSeen) {
      return;
    }
    if (this.entry !== "from-wake") {
      return;
    }

    this.time.delayedCall(960, () => {
      if (!this.sys?.isActive?.()) {
        return;
      }
      if (this.overlayActive) {
        return;
      }
      this.openKeeperDialogueOverlay();
    });
  }

  getKeeperDialogueScript() {
    const state = this.session.keeperDialogue ?? { met: false, introSeen: false, thanksSeen: false, undergroundSent: false };
    const beats = this.session.beats;

    // Highest priority: player exposed the keeper (found the photo + payment chit).
    // Final confrontation. Kind of the whole game's climax.
    if (beats.keeperExposed && !state.finaleSeen) {
      return {
        kind: "keeper-finale",
        pages: [
          "— Вернулся. И, судя по лицу, в бухту ты всё-таки спустился.",
          "— Ты держишь что-то в руке. Не показывай. Я и так знаю, что это.",
          "— Фото. Старая контора «Керн и Сын». Тот, кого ты искал, был я. Инсп. VII — это я, тридцать лет назад. Тогда я подписывал рапорты, в которых маяк по расписанию «терял контакт».",
          "— Шторм этой ночью был настоящий. Но лодку тебе разбило не случайно. И свет я тушил не потому, что не справился.",
          "— Корабль, который идёт сюда на рассвете, везёт нового инспектора с материка. Того, кто наконец приедет проверить, почему в этом районе тонет больше судов, чем везде. И у меня на руках расписка, по которой я должен обеспечить, чтобы этот корабль тоже не доплыл.",
          "— Я тебя вытащил из прибоя, пока ты был в сознании один раз. Мне тогда стало... совестно. Поэтому отправил тебя вниз, в надежде, что ты соберёшь картину быстрее, чем рассветёт.",
          "— Решай сам. Маяк включён, корабль увидит фарватер. Инспектор сойдёт на берег и заберёт меня. Или ты сейчас можешь спуститься вниз ещё раз и выключить рубильник у генератора. Тогда всё останется, как было. Никаких вопросов, никакого инспектора.",
          "— У тебя есть время до первой зари. Иди.",
        ],
      };
    }

    // After exposure, any further talk just reminds them of the choice
    if (beats.keeperExposed && state.finaleSeen && !beats.finalConfronted) {
      return {
        kind: "keeper-exposed-reminder",
        pages: [
          "— Решай, Янис. Свет до рассвета или рубильник вниз. Большего я тебе не подскажу.",
          "— И не думай, что я буду стрелять. Я уже устал прятаться. Мне почти всё равно, как это закончится.",
          "— Если не хочешь спускаться к рубильнику — просто подожди рассвета здесь. Это тоже выбор.",
        ],
      };
    }

    // Highest priority (fallback): player found sabotage evidence and hasn't reported yet
    if (beats.sabotageFound && !beats.sabotageReported) {
      return {
        kind: "sabotage-reveal",
        pages: [
          "— Ты что-то нашёл. Я вижу по лицу.",
          "— Там, внизу, в последней комнате у бухты... Кто-то жил там несколько ночей. Тайник. Лебёдка с перерезанной верёвкой. И следы — свежие.",
          "— Это не авария. Кто-то сделал это намеренно. Залез снизу, через приливные ворота, выбил засов изнутри и обесточил цепь питания.",
          "— Он знал, когда придёт корабль. Знал, что я один. Знал, где что отключить, чтобы маяк ослеп именно этой ночью.",
          "— Ступай пока наружу. Я должен подумать. Но далеко не уходи.",
        ],
      };
    }

    // After lighthouse failed: send player underground
    if (beats.lighthouseTried && !state.undergroundSent) {
      return {
        kind: "underground-prompt",
        pages: [
          "— Что? Стартер щёлкнул вхолостую? Значит, линза в порядке — питание не доходит.",
          "— Проблема не наверху. Она где-то в подземном механизме. Я сам туда сейчас не могу.",
          "— Спустись в люк и пройди насквозь. Начни с сервисного уровня — иди дальше, пока не найдёшь, что оборвалось.",
        ],
      };
    }

    // Generator thanks (existing)
    if (beats.generatorRestored && !state.thanksSeen) {
      return {
        kind: "thanks",
        pages: [
          "— Свет снова идёт. Честно, уже не верил, что успеем до рассвета.",
          "— Завтра корабль с материка пройдёт мимо скал — теперь не в камни, а в фарватер.",
          "— Только одно: зайди в башню и проверь, добралось ли питание до прожектора. Стартер на фонарном ярусе.",
        ],
      };
    }

    // After thanks, before lighthouse tried: prompt to go test the lamp
    if (beats.generatorRestored && state.thanksSeen && !beats.lighthouseTried) {
      return {
        kind: "lighthouse-prompt",
        pages: [
          "— Всё ещё здесь? Ты ещё не проверил прожектор наверху.",
          "— Иди на фонарный ярус и потяни стартер. Если лампа зажглась — мы справились. Если нет — значит беда глубже.",
        ],
      };
    }

    // First encounter intro
    if (!state.introSeen) {
      return {
        kind: "intro",
        pages: [
          "— Живой. Ну и хорошо. Я уже думал, тебя штормом дальше унесёт.",
          "— Меня Барк зовут. Смотритель я здешний. Тридцать лет уже при маяке.",
          "— Лодку твою ночью о камни разбило в щепки. Сам тебя вытащил из полосы прибоя, затащил наверх, одеялом укрыл. Отогревался ты часа три.",
          "— А теперь услуга за услугу, Янис. Маяк у нас вырубило вместе с бурей. Генератор под башней не пускается, один я уже не вытяну.",
          "— Завтра сюда корабль идёт с материка. Без света напорется на скалы прямо у входа в бухту. Запусти мне свет — и живи пока здесь спокойно.",
          "— Инструмент в ящике у башни, штурвал клапана где-то рядом валяется. Дальше уже сам разберёшься.",
        ],
      };
    }

    return {
      kind: "reminder",
      pages: [
        "— Маяк сам себя не запустит. Ящик с инструментом у основания башни, дальше смотри по месту.",
      ],
    };
  }

  openKeeperDialogueOverlay() {
    const script = this.getKeeperDialogueScript();
    let pageIndex = 0;

    const showPage = () => {
      const page = script.pages[pageIndex];
      const isLast = pageIndex === script.pages.length - 1;
      const hint = isLast
        ? "Кликни, чтобы закрыть, Esc — тоже"
        : "Кликни, чтобы слушать дальше, Esc — прервать";

      // Title reflects keeper name once introduced; changes after exposure.
      const exposed = this.session.beats?.keeperExposed;
      const metBefore = this.session.keeperDialogue?.introSeen;
      const overlayTitle = !metBefore
        ? "Старый смотритель"
        : exposed ? "Барк · Инспектор VII" : "Барк, смотритель маяка";
      this.openOverlay(overlayTitle, "", hint);
      // Clear the description slot — we render the speech in a proper bubble below.
      this.overlayText?.setText("");

      // === Left column: large portrait ===
      const portraitX = -250;
      const portraitContainer = this.add.container(portraitX, 8);
      // Portrait frame 180×260
      const frameShadow = this.add.rectangle(5, 5, 188, 268, 0x000000, 0.45);
      const portraitBg = this.add.rectangle(0, 0, 180, 260, 0x0f161c, 0.94)
        .setStrokeStyle(3, 0xd7c087, 0.55);
      // Inner vignette — a warm seaside sunset behind the keeper
      const vignette = this.add.rectangle(0, 0, 164, 244, 0x1d2a32, 1);
      const skyGradA = this.add.rectangle(0, -88, 164, 68, 0x2a3a48, 0.9);
      const skyGradB = this.add.rectangle(0, -58, 164, 36, 0x4a3a34, 0.6);
      const horizonGlow = this.add.ellipse(0, -28, 150, 34, 0xe4a060, 0.22);
      const seaBand = this.add.rectangle(0, 60, 164, 90, 0x0e1a22, 1);
      const seaHighlight = this.add.rectangle(0, 40, 164, 4, 0x8aacba, 0.35);
      // Rocks / shoreline silhouette
      const rockL = this.add.triangle(-52, 42, -20, 16, 24, 8, 30, 24, 0x0a1218, 1);
      const rockR = this.add.triangle(54, 44, -24, 10, 20, 16, 28, 26, 0x0a1218, 1);
      // Subtle dust motes
      const dustA = this.add.circle(-42, -18, 1.2, 0xe4b25f, 0.6);
      const dustB = this.add.circle(24, -46, 1.2, 0xe4b25f, 0.5);
      const dustC = this.add.circle(48, 8, 1.2, 0xe4b25f, 0.45);
      portraitContainer.add([
        frameShadow, portraitBg, vignette,
        skyGradA, skyGradB, horizonGlow, seaBand, seaHighlight,
        rockL, rockR, dustA, dustB, dustC,
      ]);

      // Keeper figure — ~1.6× scale vs old portrait
      const lanternGlow = this.add.ellipse(-28, 60, 84, 60, 0xe4b25f, 0.22);
      const coat = this.add.rectangle(0, 42, 112, 148, 0x2b1e16, 1).setStrokeStyle(2, 0x0f0a07, 0.6);
      const coatSheen = this.add.rectangle(-28, 42, 14, 130, 0x3c2a1f, 0.8);
      const belt = this.add.rectangle(0, 66, 100, 6, 0x141009, 0.85);
      const lapelL = this.add.rectangle(-18, 4, 8, 34, 0x0f0806, 0.8);
      const lapelR = this.add.rectangle(18, 4, 8, 34, 0x0f0806, 0.8);
      const scarf = this.add.rectangle(0, -6, 88, 18, 0x8a4a2c, 1).setStrokeStyle(1, 0x3a1d10, 0.7);
      const head = this.add.rectangle(0, -56, 68, 70, 0xc69a70, 1);
      const headShade = this.add.rectangle(-12, -56, 12, 70, 0x8a6a4a, 0.4);
      const beard = this.add.rectangle(0, -32, 64, 32, 0xd4d8d2, 1).setStrokeStyle(1, 0x8e9088, 0.5);
      const mustache = this.add.rectangle(0, -44, 50, 6, 0xb8bcb4, 1);
      const eyeLeft = this.add.rectangle(-14, -62, 4, 4, 0x1a1410, 1);
      const eyeRight = this.add.rectangle(14, -62, 4, 4, 0x1a1410, 1);
      const hatBrim = this.add.rectangle(0, -92, 108, 8, 0x1a120c, 1);
      const hatCrown = this.add.rectangle(0, -112, 76, 32, 0x1a120c, 1).setStrokeStyle(2, 0x090604, 0.7);
      const hatBand = this.add.rectangle(0, -102, 76, 5, 0x6b3820, 0.9);
      const lantern = this.add.rectangle(-40, 60, 26, 40, 0x3a2a1c, 1).setStrokeStyle(1, 0x8a7254, 0.7);
      const lanternPane = this.add.rectangle(-40, 60, 18, 26, 0xe4b25f, 0.86);
      const lanternHandle = this.add.arc(-40, 40, 8, 180, 0, false, 0x8a7254, 0).setStrokeStyle(1.5, 0x8a7254, 0.85);
      portraitContainer.add([
        lanternGlow, coat, coatSheen, belt, lapelL, lapelR, scarf,
        head, headShade, beard, mustache, eyeLeft, eyeRight,
        hatBand, hatCrown, hatBrim, lanternHandle, lantern, lanternPane,
      ]);

      // Nameplate under portrait (inside frame)
      const nameplate = this.add.rectangle(0, 114, 164, 20, exposed ? 0x3a1a10 : 0x1a120c, 0.95)
        .setStrokeStyle(1, exposed ? 0xd46462 : 0xd7c087, 0.7);
      const nameText = this.add.text(0, 114, exposed ? "БАРК · Инсп. VII" : "БАРК", {
        fontFamily: "monospace", fontSize: "12px",
        color: exposed ? "#e08080" : "#d7c087", letterSpacing: 2,
      }).setOrigin(0.5);
      portraitContainer.add([nameplate, nameText]);

      // VII badge + cold lantern on exposure
      if (exposed) {
        const badge = this.add.circle(26, 16, 7, 0xd7c087, 1).setStrokeStyle(1, 0x3a1a10, 0.85);
        const badgeText = this.add.text(26, 16, "VII", {
          fontFamily: "monospace", fontSize: "7px", color: "#3a1a10", fontStyle: "bold",
        }).setOrigin(0.5);
        portraitContainer.add([badge, badgeText]);
        lanternGlow.setFillStyle(0x884428, 0.16);
        horizonGlow.setFillStyle(0x8a3a30, 0.22);
      }

      // === Right column: speech panel with paper texture ===
      const speechX = 90;
      const speechY = -10;
      const speech = this.add.container(speechX, speechY);
      // Paper-like background
      const paperShadow = this.add.rectangle(6, 8, 440, 228, 0x000000, 0.5);
      const paper = this.add.rectangle(0, 0, 428, 220, 0x1c2028, 0.98).setStrokeStyle(2, 0xd7c087, 0.55);
      const paperInner = this.add.rectangle(0, 0, 412, 204, 0x141a1f, 0.95);
      // Inner hatching (like etched paper grain)
      const grainGfx = this.add.graphics();
      grainGfx.lineStyle(1, 0x2a3540, 0.4);
      for (let gy = -96; gy <= 96; gy += 16) {
        grainGfx.beginPath(); grainGfx.moveTo(-200, gy); grainGfx.lineTo(200, gy); grainGfx.strokePath();
      }
      // Decorative ornament — gold laurel strokes at corners
      const ornGfx = this.add.graphics();
      ornGfx.lineStyle(1.4, 0xd7c087, 0.6);
      [[-198, -96], [198, -96], [-198, 96], [198, 96]].forEach(([cx, cy], i) => {
        const flipX = cx > 0 ? -1 : 1;
        const flipY = cy > 0 ? -1 : 1;
        ornGfx.beginPath();
        ornGfx.moveTo(cx, cy + 18 * flipY); ornGfx.lineTo(cx, cy);
        ornGfx.lineTo(cx + 18 * flipX, cy);
        ornGfx.strokePath();
      });
      // Small speech-tail pointing to portrait
      const tail = this.add.triangle(-222, 6, 0, 0, 16, -12, 16, 12, 0x1c2028, 0.98)
        .setStrokeStyle(2, 0xd7c087, 0.55);
      speech.add([paperShadow, paper, paperInner, grainGfx, ornGfx, tail]);

      // Speaker label strip
      const speakerStrip = this.add.rectangle(0, -88, 412, 22, 0x2a1a14, 0.95);
      const speakerText = this.add.text(-196, -88, exposed ? "БАРК · Инсп. VII" : "БАРК", {
        fontFamily: "monospace", fontSize: "10px",
        color: exposed ? "#e08080" : "#d7c087", letterSpacing: 2,
      }).setOrigin(0, 0.5);
      // Page counter on the right of the strip
      const pagerInStrip = this.add.text(196, -88, `${pageIndex + 1} / ${script.pages.length}`, {
        fontFamily: "monospace", fontSize: "10px", color: "#8aacba", letterSpacing: 2,
      }).setOrigin(1, 0.5);
      speech.add([speakerStrip, speakerText, pagerInStrip]);

      // The actual line of dialogue — wrapped inside the paper
      const lineText = this.add.text(0, -8, page, {
        fontFamily: "Georgia, serif", fontSize: "19px", color: "#f2e8d7",
        align: "left", wordWrap: { width: 380 }, lineSpacing: 6,
      }).setOrigin(0.5);
      speech.add(lineText);

      // === Bottom: button ===
      const button = this.add.rectangle(speechX, 168, 300, 44, 0x1f2a32, 1).setStrokeStyle(2, 0xd7c087, 0.55);
      const buttonText = this.add.text(speechX, 168, isLast ? "— Понял. Разберусь." : "— Слушаю дальше", {
        fontFamily: "Georgia, serif", fontSize: "17px", color: "#f2e8d7",
      }).setOrigin(0.5);

      this.overlayContent.add([portraitContainer, speech, button, buttonText]);

      // Idle tween on the lantern glow
      this.tweens.add({
        targets: lanternGlow, alpha: 0.38, scaleX: 1.15, scaleY: 1.15,
        duration: 1400, yoyo: true, repeat: -1, ease: "sine.inOut",
      });
      // Subtle dust drift
      this.tweens.add({
        targets: [dustA, dustB, dustC], y: "+=4", duration: 2200, yoyo: true, repeat: -1, ease: "sine.inOut",
      });

      this.createOverlayRectHotspot(speechX, 168, 320, 60, {
        pointerover: () => button.setStrokeStyle(2, 0xe1bb73, 0.95),
        pointerout: () => button.setStrokeStyle(2, 0xd7c087, 0.55),
        pointerdown: () => {
          if (isLast) {
            this.completeKeeperDialogue(script.kind);
            return;
          }
          pageIndex += 1;
          showPage();
        },
      });
    };

    showPage();
  }

  completeKeeperDialogue(kind) {
    const state = this.session.keeperDialogue;
    if (!state) {
      this.closeOverlay();
      return;
    }

    state.met = true;

    if (kind === "intro") {
      state.introSeen = true;
      this.closeOverlay();
      this.showNarration("Смотритель кивает в сторону ящика у башни. Твоя задача — оживить генератор и вернуть маяку свет.");
      return;
    }

    if (kind === "thanks") {
      state.thanksSeen = true;
      this.closeOverlay();
      this.showNarration("Смотритель кивает на башню. Генератор ожил — теперь нужно убедиться, что питание дошло до прожектора.");
      return;
    }

    if (kind === "lighthouse-prompt") {
      this.closeOverlay();
      this.showNarration("Смотритель смотрит на башню. Что-то в его голосе звучит настороженно — будто он сам не уверен, что свет должен заработать.");
      return;
    }

    if (kind === "underground-prompt") {
      state.undergroundSent = true;
      this.closeOverlay();
      this.cameras.main.shake(120, 0.0015);
      this.showNarration("Смотритель не ошибается: что-то идёт не так под башней. Люк у основания ждёт. Пора спускаться.");
      return;
    }

    if (kind === "sabotage-reveal") {
      this.session.beats.sabotageReported = true;
      this.closeOverlay();
      this.cameras.main.shake(260, 0.003);
      this.cameras.main.flash(300, 0, 0, 0, true);
      this.showNarration("Смотритель долго смотрит на море. Его руки сжимаются. Он знает больше, чем говорит — и теперь это очевидно. Спустись в бухту ещё раз, внимательнее осмотри тайник.");
      return;
    }

    if (kind === "keeper-finale") {
      state.finaleSeen = true;
      this.closeOverlay();
      this.cameras.main.shake(360, 0.004);
      this.cameras.main.flash(420, 120, 40, 40, true);
      this.showNarration("Барк отворачивается к морю. Волны уже начинают золотиться — первая заря близко. Иди к воде и жди рассвета, чтобы встретить корабль — или спустись в подземелье и вырубай рубильник.");
      return;
    }

    if (kind === "keeper-exposed-reminder") {
      this.closeOverlay();
      this.showNarration("Смотритель снова поворачивается к морю. Время уходит.");
      return;
    }

    this.closeOverlay();
  }

  showEndingCard(kind) {
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const isDark = kind === "dark";
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(220);
    const backdrop = this.add.rectangle(w * 0.5, h * 0.5, w, h, 0x02060a, 0).setScrollFactor(0);
    const title = this.add.text(w * 0.5, h * 0.5 - 110,
      isDark ? "КОНЦОВКА: МОЛЧАНИЕ" : "КОНЦОВКА: РАССВЕТ",
      {
        fontFamily: "Georgia, serif", fontSize: "36px",
        color: isDark ? "#d46462" : "#f4ead5", fontStyle: "bold", letterSpacing: 3,
      }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    const subtitle = this.add.text(w * 0.5, h * 0.5 - 64,
      isDark ? "«Маяк снова молчит»" : "«Корабль прошёл фарватер»",
      { fontFamily: "Georgia, serif", fontSize: "15px", color: "#d7c087", fontStyle: "italic" }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    const body = this.add.text(w * 0.5, h * 0.5 + 12,
      isDark
        ? "Рубильник падает вниз. Свет на маяке тухнет. До зари остаётся не больше часа.\nБарк закуривает последнюю папиросу и молча уходит в сторону бухты.\n\nКогда на рассвете к скалам подойдёт корабль, он не увидит фарватера —\nи уйдёт на камни, как все остальные. Никакого инспектора.\nНикаких вопросов.\n\nЯнис остаётся один на острове, где только что стал соучастником."
        : "Янис остаётся стоять у воды. Свет маяка горит ровно, пробивая ночь.\nК утру у входа в бухту появится чёрный силуэт корабля с материка.\n\nИнспектор сойдёт на берег, увидит фотокарточку в руках Яниса,\nи на Барка наконец найдутся старые вопросы — те, на которые\nтридцать лет никто не решался отвечать.\n\nЯнис помог незнакомому смотрителю. А потом — предал его ради правды.",
      {
        fontFamily: "Georgia, serif", fontSize: "15px",
        color: isDark ? "#b8a090" : "#c4d1d6",
        align: "center", lineSpacing: 6,
      }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    const footer = this.add.text(w * 0.5, h * 0.5 + 160,
      "— Конец прототипа —",
      { fontFamily: "monospace", fontSize: "12px", color: "#8aacba", letterSpacing: 2 }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    const cta = this.add.text(w * 0.5, h * 0.5 + 196,
      "клик — вернуться к свободному исследованию",
      { fontFamily: "monospace", fontSize: "11px", color: "#5a7080", fontStyle: "italic" }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    layer.add([backdrop, title, subtitle, body, footer, cta]);
    this.registerUiObjects?.([backdrop, title, subtitle, body, footer, cta]);

    this.tweens.add({ targets: backdrop, alpha: 0.97, duration: 1000 });
    this.tweens.add({ targets: title, alpha: 1, y: h * 0.5 - 116, duration: 800, delay: 500, ease: "quad.out" });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 600, delay: 900 });
    this.tweens.add({ targets: body, alpha: 1, duration: 700, delay: 1200 });
    this.tweens.add({ targets: footer, alpha: 1, duration: 600, delay: 1800 });
    this.tweens.add({ targets: cta, alpha: 1, duration: 700, delay: 2200 });
    this.tweens.add({
      targets: cta, alpha: 0.4, duration: 1200, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 3200,
    });

    const dismiss = () => {
      layer.destroy();
      this.input.off("pointerdown", dismiss);
    };
    this.time.delayedCall(1800, () => this.input.once("pointerdown", dismiss));
  }

  showPrototypeEndCard() {
    // Full-screen "end of prototype" card. Stays until the player clicks.
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(200);
    const backdrop = this.add.rectangle(w * 0.5, h * 0.5, w, h, 0x02060a, 0).setScrollFactor(0);
    const vignette = this.add.rectangle(w * 0.5, h * 0.5, w, h, 0x02060a, 0).setScrollFactor(0);
    const goldLineTop = this.add.rectangle(w * 0.5, h * 0.5 - 140, 520, 1, 0xd7c087, 0).setScrollFactor(0);
    const goldLineBtm = this.add.rectangle(w * 0.5, h * 0.5 + 160, 520, 1, 0xd7c087, 0).setScrollFactor(0);
    const title = this.add.text(w * 0.5, h * 0.5 - 110, "КОНЕЦ ПРОТОТИПА", {
      fontFamily: "Georgia, serif", fontSize: "36px", color: "#f4ead5",
      fontStyle: "bold", letterSpacing: 3,
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    const subtitle = this.add.text(w * 0.5, h * 0.5 - 64, "«Последний смотритель»", {
      fontFamily: "Georgia, serif", fontSize: "15px", color: "#d7c087", fontStyle: "italic",
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    const body = this.add.text(w * 0.5, h * 0.5 + 12,
      "Ты стоишь перед выбором. До первой зари у Яниса есть несколько минут, чтобы решить:\nоставить свет гореть и встретить инспектора, или спуститься к рубильнику.\n\nВ полной игре дальше был бы приход корабля, развязка со смотрителем\nи ответ на вопрос — что Янис выберет для себя.",
      {
        fontFamily: "Georgia, serif", fontSize: "16px", color: "#c4d1d6",
        align: "center", lineSpacing: 6,
      }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    const footer = this.add.text(w * 0.5, h * 0.5 + 148,
      "— Спасибо за прохождение демо —",
      { fontFamily: "monospace", fontSize: "12px", color: "#8aacba", letterSpacing: 2 }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    const cta = this.add.text(w * 0.5, h * 0.5 + 196,
      "клик или Esc — продолжить свободное исследование",
      { fontFamily: "monospace", fontSize: "11px", color: "#5a7080", fontStyle: "italic" }
    ).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    layer.add([backdrop, vignette, goldLineTop, goldLineBtm, title, subtitle, body, footer, cta]);
    this.registerUiObjects?.([backdrop, vignette, goldLineTop, goldLineBtm, title, subtitle, body, footer, cta]);

    // Fade in
    this.tweens.add({ targets: [backdrop, vignette], alpha: 0.96, duration: 900, ease: "quad.out" });
    this.tweens.add({ targets: goldLineTop, alpha: 0.75, scaleX: 1.4, duration: 900, delay: 180, ease: "quad.out" });
    this.tweens.add({ targets: goldLineBtm, alpha: 0.75, scaleX: 1.4, duration: 900, delay: 180, ease: "quad.out" });
    this.tweens.add({ targets: title, alpha: 1, y: h * 0.5 - 116, duration: 700, delay: 420, ease: "quad.out" });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 600, delay: 720 });
    this.tweens.add({ targets: body, alpha: 1, duration: 600, delay: 900 });
    this.tweens.add({ targets: footer, alpha: 1, duration: 600, delay: 1200 });
    this.tweens.add({ targets: cta, alpha: 1, duration: 800, delay: 1600 });
    this.tweens.add({
      targets: cta, alpha: 0.5, duration: 1200, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 2400,
    });

    // Dismiss on click / Esc
    const dismiss = () => {
      layer.destroy();
      this.input.off("pointerdown", dismiss);
      this.input.keyboard?.off("keydown-ESC", dismiss);
    };
    this.time.delayedCall(1400, () => {
      this.input.once("pointerdown", dismiss);
      this.input.keyboard?.once("keydown-ESC", dismiss);
    });
  }
}
