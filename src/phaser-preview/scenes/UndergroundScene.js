import {
  getUndergroundObjective,
  getUndergroundRegionLabel,
  hasResolvedBayScene,
  hasResolvedPierScene,
  hasResolvedServiceScene,
  hasResolvedTunnelScene,
} from "../data/progressionText.js";
import {
  UNDERGROUND_REGIONS,
  UNDERGROUND_WORLD_WIDTH,
  undergroundInteractables,
} from "../data/towerData.js";
import {
  buildUndergroundEnvironment,
  createUndergroundGround,
  dropUndergroundBarrier,
  updateUndergroundAmbient,
} from "../render/undergroundArt.js";
import {
  createWakePlayer,
  updateWakePlayerVisuals,
} from "../render/wakeArt.js";
import { PreviewSceneBase } from "./PreviewSceneBase.js";
import { getPreviewSession } from "../state/previewSession.js";
import { playPreviewUiTick, playPreviewWorldCue } from "../audio/previewAudio.js";

const REGION_ORDER = ["service", "tunnel", "pier", "bay"];

export class UndergroundScene extends PreviewSceneBase {
  constructor() {
    super("underground-preview");
    this.entry = "from-shore";
  }

  init(data) {
    this.entry = data?.entry ?? "from-shore";
  }

  create() {
    this.session = getPreviewSession();
    this.session.stage = "service";
    if (!this.session.undergroundRegion) {
      this.session.undergroundRegion = "service";
    }

    buildUndergroundEnvironment(this);
    createUndergroundGround(this);
    createWakePlayer(this);
    this.placePlayer();
    this.createCamera();
    this.setupSceneChrome(undergroundInteractables, (target) => this.handleInteraction(target));
    this.dropResolvedBarriers();
    this.playSceneIntro(
      "Нижние помещения",
      "Под башней всё слоится: технический отсек, сырой тоннель, полуоткрытая пристань и скрытая бухта. Теперь это один непрерывный путь."
    );
  }

  update(time) {
    updateUndergroundAmbient(this, time);
    this.updateRegionTracking();
    this.ensureCameraFollow();

    if (this.overlayActive) {
      this.playerBody.body.setVelocityX(0);
      this.updatePrompt(null);
      return;
    }

    this.updatePlayerMovement();
    updateWakePlayerVisuals(this);
    this.updateScenePrompt();
  }

  ensureCameraFollow() {
    if (this.cameraBeatActive || this.overlayActive || this.sceneTransitionActive) {
      return;
    }
    const cam = this.cameras?.main;
    if (cam && this.playerBody && !cam._follow) {
      cam.startFollow(
        this.playerBody,
        true,
        this.defaultCameraLerp?.x ?? 0.12,
        this.defaultCameraLerp?.y ?? 0.12
      );
      cam.setDeadzone(
        this.defaultCameraDeadzone?.x ?? 200,
        this.defaultCameraDeadzone?.y ?? 90
      );
    }
  }

  getStageLabel() {
    return getUndergroundRegionLabel(this.session.undergroundRegion ?? "service");
  }

  getObjectiveText() {
    return getUndergroundObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(0, 0, UNDERGROUND_WORLD_WIDTH, 720, 200, 90);
  }

  placePlayer() {
    if (this.entry === "from-tunnel") {
      this.playerBody.setPosition(1540, 526);
    } else {
      this.playerBody.setPosition(1090, 526);
    }
  }

  updateRegionTracking() {
    const x = this.playerBody.x;
    let region = "service";
    for (const key of REGION_ORDER) {
      const r = UNDERGROUND_REGIONS[key];
      if (x >= r.start && x < r.end) {
        region = key;
        break;
      }
    }
    if (x >= UNDERGROUND_REGIONS.bay.end) {
      region = "bay";
    }
    if (region !== this.session.undergroundRegion) {
      this.session.undergroundRegion = region;
      this.session.stage = region;
      this.syncHud();
    }
  }

  dropResolvedBarriers() {
    if (hasResolvedServiceScene(this.session)) {
      dropUndergroundBarrier(this, "service-tunnel");
    }
    if (this.session.puzzleState.tunnelExit?.unlocked && hasResolvedTunnelScene(this.session)) {
      dropUndergroundBarrier(this, "tunnel-pier");
    }
    if (this.session.puzzleState.seaGate?.released && hasResolvedPierScene(this.session)) {
      dropUndergroundBarrier(this, "pier-bay");
    }
  }

  handleInteraction(target) {
    switch (target.id) {
      case "service-hatch-return":
        this.session.stage = "shore";
        this.transitionToScene(
          "shore-preview",
          { entry: "from-service" },
          "Основание маяка",
          "Скрипучая лестница выводит обратно к ветру и наружной площадке у башни."
        );
        break;
      case "generator-killswitch":
        this.focusOnInteractable(target, () => this.openKillswitchOverlay(), {
          zoom: 1.1, duration: 200, hold: 90,
        });
        break;
      case "logbook":
        if (!this.session.inventory.includes("logbook")) {
          this.emitWorldPulse(target.x + target.width * 0.5, target.y + target.height * 0.5, {
            color: 0xd7c59c,
            radius: 18,
            scale: 2.4,
            duration: 620,
          });
          this.addInventoryItem("logbook");
        }
        this.session.serviceProgress.logbookRead = true;
        this.showNarration("Ты забираешь журнал дежурств. Последняя запись говорит о шагах у цистерны и закрытом тоннеле.");
        break;
      case "service-console":
        if (!this.session.puzzleState.serviceConsole.batteryInstalled) {
          if (this.session.selectedItemId === "battery") {
            this.focusOnInteractable(target, () => this.openConsoleBatteryOverlay(), {
              zoom: 1.08,
              duration: 180,
              hold: 80,
            });
          } else {
            this.showNarration(
              this.session.inventory.includes("battery")
                ? "Пульт обесточен. Выбери батарею и установи её вручную."
                : "Пульт обесточен. Нужна батарея из жилой комнаты наверху."
            );
          }
          break;
        }
        this.session.serviceProgress.consoleUsed = true;
        this.focusOnInteractable(target, () => this.openConsoleStatusOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "sealed-door":
        this.session.serviceProgress.doorChecked = true;
        if (!this.session.puzzleState.serviceDoor.panelOpened) {
          if (this.session.selectedItemId === "screwdriver") {
            this.focusOnInteractable(target, () => {
              this.openScrewPanel({
                title: "Щиток на цепи",
                description: "Сними защитный щиток отвёрткой, чтобы добраться до цепи и запора на двери в тоннель.",
                accent: 0x4c4138,
                onComplete: () => {
                  this.session.puzzleState.serviceDoor.panelOpened = true;
                  this.showNarration("Щиток снят. Теперь видно саму цепь и механизм запора.");
                },
              });
            }, {
              zoom: 1.08,
              duration: 180,
              hold: 80,
            });
          } else {
            this.showNarration(
              this.session.inventory.includes("screwdriver")
                ? "На цепи висит жестяной щиток. Выбери отвёртку и сними его."
                : "Дверь удерживает цепь под защитным щитком. Без отвёртки к запору не подобраться."
            );
          }
          break;
        }
        if (hasResolvedServiceScene(this.session)) {
          this.focusOnInteractable(target, () => {
            dropUndergroundBarrier(this, "service-tunnel");
            this.cameras.main.shake(180, 0.002);
            this.emitWorldPulse(1688, 500, {
              color: 0xd7c087,
              radius: 22,
              scale: 2.8,
              duration: 760,
            });
            this.showNarration("Цепь с грохотом падает на пол. Проход в тоннель свободен.");
          }, {
            zoom: 1.08,
            duration: 180,
            hold: 90,
          });
          break;
        }
        if (!this.session.serviceProgress.logbookRead) {
          this.showNarration("Сначала стоит дочитать журнал. В нём могут быть ключевые следы об этом проходе.");
          break;
        }
        if (!this.session.serviceProgress.valveSolved) {
          this.showNarration("Клапанный узел слева странно гудит. Давление в контуре нестабильно — стоит разобраться с ним, прежде чем идти дальше.");
          break;
        }
        if (!this.session.serviceProgress.consoleUsed) {
          this.showNarration("Прежде чем уходить в тоннель, разберись с сервисным пультом и схемой маяка.");
          break;
        }
        this.showNarration("Дверь уже можно освободить, но сначала стоит собрать все следы на этом уровне.");
        break;
      case "locker":
        this.session.tunnelProgress.lockerOpened = true;
        this.focusOnInteractable(target, () => this.openLockerOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "signal":
        this.session.tunnelProgress.signalFound = true;
        this.focusOnInteractable(target, () => this.openSignalOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "tunnel-exit":
        this.session.tunnelProgress.exitChecked = true;
        if (!this.session.puzzleState.tunnelExit.unlocked) {
          if (this.session.selectedItemId === "serviceKey") {
            this.focusOnInteractable(target, () => this.openExitUnlockOverlay(), {
              zoom: 1.08,
              duration: 180,
              hold: 80,
            });
          } else {
            this.showNarration(
              this.session.inventory.includes("serviceKey")
                ? "Выход закрыт на старый замок. Выбери служебный ключ и открой проход."
                : "Выход к пристани закрыт на старый служебный замок. Нужен ключ из шкафчика."
            );
          }
          break;
        }
        if (!hasResolvedTunnelScene(this.session)) {
          this.showNarration("Сквозняк тянет со стороны моря, но уходить вслепую рано. Сначала внимательно осмотри тоннель.");
          break;
        }
        this.focusOnInteractable(target, () => {
          dropUndergroundBarrier(this, "tunnel-pier");
          this.cameras.main.shake(160, 0.0018);
          this.emitWorldPulse(3526, 500, {
            color: 0xe1bb73,
            radius: 22,
            scale: 2.8,
            duration: 720,
          });
          this.showNarration("Дверь уходит в стену. Тоннель открывается к нижней пристани.");
        }, {
          zoom: 1.08,
          duration: 180,
          hold: 90,
        });
        break;
      case "skiff":
        this.session.pierProgress.skiffChecked = true;
        this.focusOnInteractable(target, () => this.openSkiffOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "rope-winch":
        this.session.pierProgress.ropeFound = true;
        this.focusOnInteractable(target, () => this.openWinchOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "sea-gate":
        this.session.pierProgress.gateChecked = true;
        if (!this.session.puzzleState.seaGate.released) {
          if (this.session.selectedItemId === "boatHook") {
            this.focusOnInteractable(target, () => this.openSeaGateOverlay(), {
              zoom: 1.08,
              duration: 180,
              hold: 80,
            });
          } else {
            this.showNarration(
              this.session.inventory.includes("boatHook")
                ? "Створ держится на мокром засове. Выбери багор и подцепи его."
                : "Створ закушен мокрым засовом. Рукой его не сорвать, нужен инструмент из ялика."
            );
          }
          break;
        }
        if (!hasResolvedPierScene(this.session)) {
          this.showNarration("Створ приоткрыт, и за ним слышен прибой. Пока слишком мало следов, чтобы идти дальше.");
          break;
        }
        this.focusOnInteractable(target, () => {
          dropUndergroundBarrier(this, "pier-bay");
          this.cameras.main.shake(170, 0.0019);
          this.emitWorldPulse(5324, 500, {
            color: 0x91cad8,
            radius: 22,
            scale: 3,
            duration: 760,
          });
          this.showNarration("Створ со скрипом уходит в сторону. Путь в бухту открыт.");
        }, {
          zoom: 1.08,
          duration: 180,
          hold: 90,
        });
        break;
      case "valve-panel":
        this.focusOnInteractable(target, () => this.openValvePanelOverlay(), { zoom: 1.08, duration: 180, hold: 80 });
        break;
      case "cipher-lock":
        this.focusOnInteractable(target, () => this.openCipherLockOverlay(), { zoom: 1.08, duration: 180, hold: 80 });
        break;
      case "nautical-chart":
        this.focusOnInteractable(target, () => this.openNauticalChartOverlay(), { zoom: 1.08, duration: 180, hold: 80 });
        break;
      case "campfire":
        this.session.bayProgress.campSeen = true;
        this.focusOnInteractable(target, () => this.openCampfireOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "cache":
        this.session.bayProgress.cacheOpened = true;
        this.focusOnInteractable(target, () => this.openCacheOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "footprints":
        if (!hasResolvedBayScene(this.session)) {
          this.showNarration("Следы тянутся выше по скале, но картина пока неполная. Осмотри лагерь в бухте.");
          break;
        }
        this.focusOnInteractable(target, () => this.openFootprintAnalysisOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      default:
        break;
    }
  }

  openConsoleBatteryOverlay() {
    this.openOverlay(
      "Питание сервисного пульта",
      "Сначала возьми батарею, затем вставь её в разъём и только после этого подай питание кнопкой запуска."
    );

    const housing = this.add.rectangle(0, 18, 450, 242, 0x243039, 0.96).setStrokeStyle(3, 0x9bb1bb, 0.22);
    const screenGlow = this.add.rectangle(0, -28, 176, 80, 0x7bc6d3, 0.06);
    const screen = this.add.rectangle(0, -28, 164, 70, 0x0f181d, 1).setStrokeStyle(2, 0x7bc6d3, 0.2);
    const slotGlow = this.add.rectangle(-12, 62, 126, 92, 0xe1bb73, 0.08).setStrokeStyle(3, 0xe1bb73, 0.22);
    const slot = this.add.rectangle(-12, 62, 110, 76, 0x121a20, 1).setStrokeStyle(3, 0xe1bb73, 0.32);
    const bootButton = this.add.circle(158, 62, 22, 0x24343c, 1).setStrokeStyle(3, 0x8ea4af, 0.28);
    const bootRing = this.add.circle(158, 62, 10, 0x86b7c0, 0.22);
    const slotLabel = this.add.text(-12, 126, "Разъём батареи", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    const bootText = this.add.text(158, 98, "Пуск", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    const screenText = this.add.text(0, -28, "OFFLINE", {
      fontFamily: "Georgia, serif",
      fontSize: "20px",
      color: "#6e8790",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const batteryToken = this.add.container(-152, 58).setSize(82, 104);
    const batteryBody = this.add.rectangle(0, 0, 42, 66, 0x49677d, 1).setStrokeStyle(3, 0xd7c17b, 0.44);
    const batteryCap = this.add.rectangle(0, -36, 14, 8, 0xd7c17b, 1);
    const batteryMark = this.add.rectangle(0, 0, 16, 34, 0x233039, 0.62);
    const batteryTitle = this.add.text(0, 50, "Батарея", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    batteryToken.add([batteryBody, batteryCap, batteryMark, batteryTitle]);

    let batteryPicked = false;
    let batteryInserted = false;
    let booting = false;

    const updateBatteryVisual = () => {
      batteryBody.setStrokeStyle(3, batteryPicked ? 0xf2d48f : 0xd7c17b, batteryPicked ? 0.9 : 0.44);
      slotGlow.setFillStyle(0xe1bb73, batteryInserted ? 0.18 : (batteryPicked ? 0.14 : 0.08));
    };

    this.createOverlayRectHotspot(-152, 58, 92, 112, {
      pointerover: () => {
        if (!batteryInserted) {
          batteryBody.setStrokeStyle(3, 0xf2d48f, 0.74);
        }
      },
      pointerout: () => updateBatteryVisual(),
      pointerdown: () => {
        if (batteryInserted || booting) {
          return;
        }
        batteryPicked = true;
        updateBatteryVisual();
        this.tweens.add({
          targets: batteryToken,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 120,
          yoyo: true,
          ease: "quad.out",
        });
        this.showMessage("Батарея в руке. Теперь вставь её в разъём по центру.");
      },
    });

    this.createOverlayRectHotspot(-12, 62, 126, 92, {
      pointerover: () => {
        if (!batteryInserted) {
          slotGlow.setFillStyle(0xe1bb73, batteryPicked ? 0.18 : 0.11);
        }
      },
      pointerout: () => updateBatteryVisual(),
      pointerdown: () => {
        if (batteryInserted) {
          this.showMessage("Батарея уже вошла в разъём.");
          return;
        }
        if (!batteryPicked) {
          this.showMessage("Сначала возьми батарею слева.");
          return;
        }
        batteryInserted = true;
        batteryPicked = false;
        updateBatteryVisual();
        slotLabel.setText("Батарея на месте");
        batteryTitle.setText("Установлена");
        this.tweens.add({
          targets: batteryToken,
          x: -12,
          y: 62,
          duration: 220,
          ease: "quad.out",
        });
        this.showMessage("Батарея вошла в разъём. Теперь подай питание кнопкой справа.");
      },
    });

    this.createOverlayRectHotspot(158, 62, 58, 58, {
      pointerover: () => {
        if (!booting) {
          bootButton.setStrokeStyle(3, 0xd9c58d, 0.62);
        }
      },
      pointerout: () => {
        if (!booting) {
          bootButton.setStrokeStyle(3, 0x8ea4af, 0.28);
        }
      },
      pointerdown: () => {
        if (booting) {
          return;
        }
        if (!batteryInserted) {
          this.showMessage("Сначала вставь батарею в гнездо.");
          return;
        }
        booting = true;
        screenText.setText("BOOTING");
        screenText.setColor("#9fd9e4");
        bootButton.setStrokeStyle(3, 0xd9c58d, 0.9);
        this.tweens.add({
          targets: [bootButton, bootRing],
          scaleX: 0.88,
          scaleY: 0.88,
          duration: 90,
          yoyo: true,
          ease: "quad.inOut",
        });
        this.time.delayedCall(260, () => {
          screenText.setText("ONLINE");
          screenText.setColor("#b6f1c4");
          this.session.puzzleState.serviceConsole.batteryInstalled = true;
          this.removeInventoryItem("battery");
          this.session.serviceProgress.consoleUsed = false;
          this.cameras.main.shake(140, 0.0018);
          this.emitWorldPulse(1406, 516, {
            color: 0x8ad5db,
            radius: 22,
            scale: 2.8,
            duration: 720,
          });
          this.showNarration("Батарея встала в разъём. Пульт ожил и теперь показывает схему внутренних проходов.");
          this.time.delayedCall(360, () => {
            this.closeOverlay();
            this.syncHud();
          });
        });
      },
    });

    this.tweens.add({
      targets: [slotGlow, screenGlow],
      alpha: 0.22,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.overlayContent.add([
      housing, screenGlow, screen, slotGlow, slot,
      bootButton, bootRing, slotLabel, bootText, screenText, batteryToken,
    ]);
  }

  openConsoleStatusOverlay() {
    this.openOverlay(
      "Сервисный пульт",
      "Экран ожил и показывает схему маяка. Восточный тоннель отмечен красным: проход заблокирован цепью уже с другой стороны."
    );

    const body = this.add.container(0, 14);

    const bezel = this.add.rectangle(0, 0, 474, 240, 0x091520, 1)
      .setStrokeStyle(2, 0x3a7a8a, 0.8);
    const headerBg = this.add.rectangle(0, -106, 474, 28, 0x0c1e2c, 1);
    const headerLabel = this.add.text(-220, -106, "СИСТЕМА МОНИТОРИНГА МАЯКА", {
      fontFamily: "monospace", fontSize: "10px", color: "#3a9ab8",
    }).setOrigin(0, 0.5);
    const headerStatus = this.add.text(160, -106, "● АКТИВЕН", {
      fontFamily: "monospace", fontSize: "10px", color: "#6de08c",
    }).setOrigin(0, 0.5);

    const gfx = this.add.graphics();

    // Lighthouse icon (top-center)
    gfx.fillStyle(0xe4b25f, 0.12);
    gfx.fillRect(-10, -86, 20, 12);
    gfx.lineStyle(1, 0xe4b25f, 0.7);
    gfx.strokeRect(-10, -86, 20, 12);
    gfx.fillStyle(0x112030, 0.9);
    gfx.beginPath();
    gfx.moveTo(-10, -74); gfx.lineTo(10, -74);
    gfx.lineTo(16, -56); gfx.lineTo(-16, -56);
    gfx.closePath(); gfx.fillPath();
    gfx.lineStyle(1, 0x4aacbf, 0.65);
    gfx.beginPath();
    gfx.moveTo(-10, -74); gfx.lineTo(10, -74);
    gfx.lineTo(16, -56); gfx.lineTo(-16, -56);
    gfx.closePath(); gfx.strokePath();
    // Connector to service room
    gfx.lineStyle(1, 0x3a7a8a, 0.5);
    gfx.beginPath(); gfx.moveTo(0, -56); gfx.lineTo(0, -28); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(-4, -31); gfx.lineTo(0, -25); gfx.lineTo(4, -31); gfx.strokePath();

    // Service room (center)
    const RX = 0, RY = -4;
    gfx.fillStyle(0x0d1e2c, 0.95);
    gfx.lineStyle(2, 0x4aacbf, 0.8);
    gfx.fillRect(RX - 42, RY - 20, 84, 40);
    gfx.strokeRect(RX - 42, RY - 20, 84, 40);
    gfx.lineStyle(1, 0x4aacbf, 0.35);
    gfx.beginPath(); gfx.moveTo(RX - 42, RY - 12); gfx.lineTo(RX - 42, RY - 20); gfx.lineTo(RX - 34, RY - 20); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(RX + 42, RY - 12); gfx.lineTo(RX + 42, RY - 20); gfx.lineTo(RX + 34, RY - 20); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(RX - 42, RY + 12); gfx.lineTo(RX - 42, RY + 20); gfx.lineTo(RX - 34, RY + 20); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(RX + 42, RY + 12); gfx.lineTo(RX + 42, RY + 20); gfx.lineTo(RX + 34, RY + 20); gfx.strokePath();

    // West corridor (OPEN, cyan)
    const CY = RY;
    const CH = 18;
    gfx.fillStyle(0x0c2230, 0.85);
    gfx.lineStyle(1, 0x8de0cf, 0.4);
    gfx.fillRect(-130, CY - CH / 2, 88, CH);
    gfx.strokeRect(-130, CY - CH / 2, 88, CH);
    gfx.lineStyle(2, 0x8de0cf, 0.8);
    [-112, -88, -64].forEach((ax) => {
      gfx.beginPath(); gfx.moveTo(ax, CY); gfx.lineTo(ax + 10, CY); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(ax + 4, CY - 3); gfx.lineTo(ax + 10, CY); gfx.lineTo(ax + 4, CY + 3); gfx.strokePath();
    });
    gfx.fillStyle(0x8de0cf, 0.12);
    gfx.fillCircle(-134, CY, 9);
    gfx.lineStyle(2, 0x8de0cf, 0.65);
    gfx.strokeCircle(-134, CY, 9);
    gfx.lineStyle(2, 0x8de0cf, 0.45);
    gfx.beginPath(); gfx.moveTo(-143, CY); gfx.lineTo(-153, CY); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(-149, CY - 3); gfx.lineTo(-155, CY); gfx.lineTo(-149, CY + 3); gfx.strokePath();

    // East corridor (BLOCKED, red)
    gfx.fillStyle(0x1e0e0e, 0.85);
    gfx.lineStyle(1, 0xd46462, 0.5);
    gfx.fillRect(42, CY - CH / 2, 88, CH);
    gfx.strokeRect(42, CY - CH / 2, 88, CH);
    gfx.lineStyle(2, 0xd46462, 0.85);
    [60, 86, 112].forEach((bx) => {
      gfx.beginPath(); gfx.moveTo(bx - 6, CY - 5); gfx.lineTo(bx + 6, CY + 5); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(bx + 6, CY - 5); gfx.lineTo(bx - 6, CY + 5); gfx.strokePath();
    });
    gfx.fillStyle(0xd46462, 0.2);
    gfx.fillCircle(134, CY, 9);
    gfx.lineStyle(2, 0xd46462, 0.75);
    gfx.strokeCircle(134, CY, 9);
    gfx.lineStyle(2, 0xd46462, 1.0);
    gfx.beginPath(); gfx.moveTo(129, CY - 4); gfx.lineTo(139, CY + 4); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(139, CY - 4); gfx.lineTo(129, CY + 4); gfx.strokePath();

    // Bottom legend strip
    gfx.fillStyle(0x0c1a26, 0.9);
    gfx.lineStyle(1, 0x1e4050, 0.6);
    gfx.fillRect(-237, 92, 474, 26);
    gfx.strokeRect(-237, 92, 474, 26);

    const lighthouseLabel = this.add.text(0, -96, "◈  ФОНАРНАЯ КОМНАТА", {
      fontFamily: "monospace", fontSize: "9px", color: "#e4b25f",
    }).setOrigin(0.5);
    const roomLabel = this.add.text(RX, RY, "ТЕХ.\nУРОВЕНЬ", {
      fontFamily: "monospace", fontSize: "9px", color: "#5ab4c8", align: "center",
    }).setOrigin(0.5);
    const westTitle = this.add.text(-86, CY + 20, "◀  ЗАПАДНЫЙ ПРОХОД", {
      fontFamily: "monospace", fontSize: "9px", color: "#8de0cf",
    }).setOrigin(0.5);
    const westStatus = this.add.text(-86, CY + 34, "[ СВОБОДЕН ]", {
      fontFamily: "monospace", fontSize: "9px", color: "#8de0cf",
    }).setOrigin(0.5);
    const eastTitle = this.add.text(86, CY + 20, "ВОСТОЧНЫЙ ТОННЕЛЬ  ▶", {
      fontFamily: "monospace", fontSize: "9px", color: "#d46462",
    }).setOrigin(0.5);
    const eastStatus = this.add.text(86, CY + 34, "[ ЦЕПЬ / БЛОК ]", {
      fontFamily: "monospace", fontSize: "9px", color: "#d46462",
    }).setOrigin(0.5);
    const legendLeft = this.add.text(-200, 105, "●  ЗАПАДНЫЙ: СВОБОДЕН", {
      fontFamily: "monospace", fontSize: "9px", color: "#8de0cf",
    }).setOrigin(0, 0.5);
    const legendRight = this.add.text(30, 105, "⊗  ВОСТОЧНЫЙ: ЗАБЛОКИРОВАН ЦЕПЬЮ", {
      fontFamily: "monospace", fontSize: "9px", color: "#d46462",
    }).setOrigin(0, 0.5);

    const lanternGlow = this.add.circle(0, -80, 14, 0xe4b25f, 0.06);

    body.add([
      bezel, headerBg, headerLabel, headerStatus,
      gfx, lanternGlow,
      lighthouseLabel, roomLabel,
      westTitle, westStatus, eastTitle, eastStatus,
      legendLeft, legendRight,
    ]);
    this.overlayContent.add(body);

    this.tweens.add({
      targets: lanternGlow,
      alpha: 0.22,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
    this.syncHud();
  }

  openLockerOverlay() {
    this.openOverlay(
      "Шкафчик смотрителя",
      "Железный шкафчик с царапинами и ржавыми подтёками. Внутри — промокший плащ, медный жетон и ключ на крюке."
    );

    // === Frame ===
    const frame = this.add.rectangle(0, 10, 520, 260, 0x111820, 0.97).setStrokeStyle(2, 0x5a7080, 0.42);
    const frameInner = this.add.rectangle(0, 10, 504, 244, 0x0c1218, 0.6);
    this.overlayContent.add([frame, frameInner]);

    // === Locker carcass (left two-thirds) ===
    const lockerX = -96;
    const lockerY = 8;
    const lockerBack = this.add.rectangle(lockerX, lockerY, 240, 222, 0x2f3d47, 1).setStrokeStyle(3, 0x8aacba, 0.28);
    // Metal panel grain
    const lockerGrain = this.add.graphics();
    lockerGrain.fillStyle(0x3a4a54, 0.6);
    lockerGrain.fillRect(lockerX - 116, lockerY - 108, 232, 24); // top band
    lockerGrain.fillRect(lockerX - 116, lockerY + 84, 232, 24);  // bottom band
    // Rust streaks
    lockerGrain.fillStyle(0x6a4020, 0.4);
    [[-94, -88], [-40, -84], [80, -100], [-70, 46], [88, 70]].forEach(([ox, oy]) => {
      lockerGrain.fillRect(lockerX + ox, lockerY + oy, 3, 20 + Math.random() * 24);
    });
    // Door hinges on the left
    lockerGrain.fillStyle(0x5a6a74, 0.85);
    [-78, 48].forEach((oy) => {
      lockerGrain.fillRect(lockerX - 118, lockerY + oy, 6, 18);
    });
    // Rivets around frame
    lockerGrain.fillStyle(0xa0b0ba, 0.65);
    [[-108, -100], [100, -100], [-108, 98], [100, 98]].forEach(([ox, oy]) => {
      lockerGrain.fillCircle(lockerX + ox, lockerY + oy, 2.4);
    });
    this.overlayContent.add([lockerBack, lockerGrain]);

    // Interior shadow (inside of locker)
    const lockerCavity = this.add.rectangle(lockerX, lockerY, 220, 204, 0x0c1218, 0.75);
    this.overlayContent.add(lockerCavity);

    // Coat hanging on a bar at the top
    const hangerBar = this.add.rectangle(lockerX, lockerY - 78, 186, 4, 0x8aacba, 0.85);
    const hangerHook = this.add.arc(lockerX - 40, lockerY - 82, 4, 0, 180, false, 0x8aacba, 1)
      .setStrokeStyle(2, 0x8aacba, 1);
    // Coat shape (triangle + torso + shadow)
    const coatShadow = this.add.triangle(lockerX - 42, lockerY + 2, 0, -60, -42, 84, 46, 84, 0x000000, 0.35);
    const coat = this.add.triangle(lockerX - 44, lockerY - 2, 0, -62, -46, 82, 48, 82, 0x2a3a4e, 0.94);
    const coatInner = this.add.triangle(lockerX - 44, lockerY + 4, 0, -48, -32, 60, 32, 60, 0x1a2a3e, 0.7);
    const coatCollar = this.add.rectangle(lockerX - 44, lockerY - 52, 22, 8, 0x4a5a68, 1);
    const coatButtons = this.add.graphics();
    coatButtons.fillStyle(0xa08060, 0.85);
    [-20, 0, 20].forEach((oy) => {
      coatButtons.fillCircle(lockerX - 44, lockerY + oy - 20, 2);
    });
    this.overlayContent.add([hangerBar, hangerHook, coatShadow, coat, coatInner, coatCollar, coatButtons]);

    // Shelf with tag
    const shelf = this.add.rectangle(lockerX + 64, lockerY + 28, 104, 5, 0x8aacba, 0.75);
    const shelfShadow = this.add.rectangle(lockerX + 64, lockerY + 32, 104, 3, 0x000000, 0.4);
    const tagShadow = this.add.rectangle(lockerX + 50, lockerY + 22, 26, 18, 0x000000, 0.4);
    const tag = this.add.rectangle(lockerX + 48, lockerY + 20, 24, 16, 0xd7c087, 1).setStrokeStyle(1, 0x8a6a3a, 0.7);
    const tagRing = this.add.circle(lockerX + 58, lockerY + 14, 2.2, 0x2a1f0a, 0).setStrokeStyle(1.2, 0x8a6a3a, 1);
    const tagText = this.add.text(lockerX + 48, lockerY + 20, "VII", {
      fontFamily: "monospace", fontSize: "9px", color: "#3a2a0a",
    }).setOrigin(0.5);
    this.overlayContent.add([shelf, shelfShadow, tagShadow, tag, tagRing, tagText]);

    // Water drip puddle at the bottom of the locker floor
    const puddle = this.add.ellipse(lockerX - 20, lockerY + 94, 90, 12, 0x8aacba, 0.18);
    const puddleShine = this.add.ellipse(lockerX - 26, lockerY + 92, 32, 4, 0xcfe0e8, 0.35);
    this.overlayContent.add([puddle, puddleShine]);

    // === Key zone (right third) ===
    const keyX = 142;
    const keyY = 10;
    const keyPanel = this.add.rectangle(keyX, keyY, 180, 222, 0x1a2630, 0.9).setStrokeStyle(2, 0xc9b07c, 0.35);
    const keyHeader = this.add.rectangle(keyX, keyY - 96, 180, 22, 0x2a3540, 0.94);
    const keyHeaderLbl = this.add.text(keyX, keyY - 96, "КРЮК ДЕЖУРНОГО", {
      fontFamily: "monospace", fontSize: "9.5px", color: "#d7c087", letterSpacing: 1.5,
    }).setOrigin(0.5);
    // Hook on which the key hangs
    const hookPost = this.add.rectangle(keyX, keyY - 62, 4, 32, 0x8aacba, 0.8);
    const hookCurve = this.add.arc(keyX - 6, keyY - 44, 8, 270, 90, false, 0x8aacba, 0)
      .setStrokeStyle(3, 0x8aacba, 0.95);
    this.overlayContent.add([keyPanel, keyHeader, keyHeaderLbl, hookPost, hookCurve]);

    if (!this.session.inventory.includes("serviceKey")) {
      const keyGlow = this.add.circle(keyX, keyY + 6, 38, 0xe1bb73, 0.1);
      const keyHalo = this.add.circle(keyX, keyY + 6, 22, 0xe1bb73, 0);
      this.overlayContent.add([keyGlow, keyHalo]);

      // Key drawn as graphics — bow ring + shaft + bit teeth
      const keyGfx = this.add.graphics();
      // Bow
      keyGfx.fillStyle(0xc8b178, 1);
      keyGfx.fillCircle(keyX, keyY - 22, 9);
      keyGfx.fillStyle(0x1a1410, 1);
      keyGfx.fillCircle(keyX, keyY - 22, 4);
      // Shaft
      keyGfx.fillStyle(0xc8b178, 1);
      keyGfx.fillRect(keyX - 2, keyY - 16, 4, 50);
      // Bit teeth
      keyGfx.fillRect(keyX, keyY + 22, 10, 4);
      keyGfx.fillRect(keyX, keyY + 30, 7, 4);
      // Edge highlight
      keyGfx.lineStyle(1, 0xeacb9a, 0.8);
      keyGfx.beginPath(); keyGfx.moveTo(keyX - 2, keyY - 16); keyGfx.lineTo(keyX - 2, keyY + 34); keyGfx.strokePath();
      this.overlayContent.add(keyGfx);

      // Idle sway on the key
      const keyObjects = [keyGfx];
      this.tweens.add({
        targets: keyObjects, angle: 4, duration: 1800, yoyo: true, repeat: -1, ease: "sine.inOut",
      });
      this.tweens.add({
        targets: keyHalo, alpha: 0.22, scaleX: 1.4, scaleY: 1.4,
        duration: 1100, yoyo: true, repeat: -1, ease: "sine.inOut",
      });

      const caption = this.add.text(keyX, keyY + 74, "Служебный ключ", {
        fontFamily: "Georgia, serif", fontSize: "14px", color: "#eadcc1", align: "center",
      }).setOrigin(0.5);
      const subtitle = this.add.text(keyX, keyY + 94, "кликни, чтобы снять с крюка", {
        fontFamily: "Georgia, serif", fontSize: "11px", color: "#a8946a", align: "center", fontStyle: "italic",
      }).setOrigin(0.5);
      this.overlayContent.add([caption, subtitle]);

      this.createOverlayRectHotspot(keyX, keyY + 6, 80, 120, {
        pointerover: () => { keyGlow.setFillStyle(0xe1bb73, 0.2); keyHalo.setFillStyle(0xe1bb73, 0.25); },
        pointerout: () => { keyGlow.setFillStyle(0xe1bb73, 0.1); keyHalo.setFillStyle(0xe1bb73, 0); },
        pointerdown: () => {
          this.addInventoryItem("serviceKey");
          this.emitWorldPulse(2812, 550, { color: 0xd7c087, radius: 18, scale: 2.4, duration: 620 });
          this.showNarration("В углу шкафчика на крюке висит служебный ключ. Он подходит к старым внутренним створкам.");
          this.openLockerOverlay();
        },
      });
    } else {
      const emptyIcon = this.add.text(keyX, keyY - 8, "—", {
        fontFamily: "Georgia, serif", fontSize: "26px", color: "#5a7080",
      }).setOrigin(0.5);
      const empty = this.add.text(keyX, keyY + 28, "Ключ уже\nна поясе", {
        fontFamily: "Georgia, serif", fontSize: "14px", color: "#8a9aa4", align: "center", lineSpacing: 3,
      }).setOrigin(0.5);
      this.overlayContent.add([emptyIcon, empty]);
    }

    // Hint at the bottom
    const hint = this.add.text(0, 130, "Жетон с цифрой VII подтверждает — шкафчик принадлежал прежнему инспектору.", {
      fontFamily: "Georgia, serif", fontSize: "12px", color: "#7a8a94", align: "center", fontStyle: "italic",
      wordWrap: { width: 480 },
    }).setOrigin(0.5);
    this.overlayContent.add(hint);
  }

  openSignalOverlay() {
    this.openOverlay(
      "Аварийный передатчик",
      "Старый армейский приёмник. Шкала ещё ловит волну, но голос тонет в солёных помехах. Прокручивай ручку."
    );

    // Frame
    const frame = this.add.rectangle(0, 10, 540, 260, 0x141a20, 0.97).setStrokeStyle(2, 0x5a7080, 0.45);
    const frameInner = this.add.rectangle(0, 10, 520, 240, 0x0c1218, 0.62);
    this.overlayContent.add([frame, frameInner]);

    // === Receiver shell ===
    const shellShadow = this.add.rectangle(0, 14, 480, 210, 0x000000, 0.4);
    const shell = this.add.rectangle(0, 8, 470, 200, 0x1f2830, 1).setStrokeStyle(3, 0xe1bb73, 0.32);
    const shellRim = this.add.rectangle(0, 8, 470, 200, 0x2a3540, 0).setStrokeStyle(1, 0x8aacba, 0.25);
    // Brand label
    const brandPlate = this.add.rectangle(-180, -70, 64, 14, 0x2a3540, 1);
    const brandText = this.add.text(-180, -70, "РП-17-М", {
      fontFamily: "monospace", fontSize: "8px", color: "#d7c087", letterSpacing: 1,
    }).setOrigin(0.5);
    this.overlayContent.add([shellShadow, shell, shellRim, brandPlate, brandText]);

    // === Frequency scale (top) ===
    const scaleBg = this.add.rectangle(-52, -48, 290, 18, 0x0c1218, 1).setStrokeStyle(1, 0x8aacba, 0.5);
    const scaleGfx = this.add.graphics();
    scaleGfx.lineStyle(1, 0x8aacba, 0.75);
    for (let i = 0; i <= 20; i += 1) {
      const x = -52 - 140 + i * 14;
      const tick = i % 5 === 0 ? 8 : 4;
      scaleGfx.beginPath(); scaleGfx.moveTo(x, -48 + 9 - tick); scaleGfx.lineTo(x, -48 + 9); scaleGfx.strokePath();
    }
    ["3.5", "5.0", "7.2", "9.4"].forEach((lbl, i) => {
      const x = -52 - 140 + i * 70;
      this.overlayContent.add(
        this.add.text(x, -28, lbl, {
          fontFamily: "monospace", fontSize: "8px", color: "#8aacba",
        }).setOrigin(0.5)
      );
    });
    // Freq pointer
    const freqPointer = this.add.triangle(-92, -48, 0, -4, -4, 2, 4, 2, 0xd7c087, 1);
    this.overlayContent.add([scaleBg, scaleGfx, freqPointer]);

    // === CRT-style display ===
    const displayBezel = this.add.rectangle(-60, 6, 218, 82, 0x1a2028, 1).setStrokeStyle(3, 0x5a7080, 0.65);
    const display = this.add.rectangle(-60, 6, 200, 68, 0x07141a, 1).setStrokeStyle(2, 0x5ab4c8, 0.5);
    // Scan-lines
    const scanlines = this.add.graphics();
    scanlines.lineStyle(1, 0x5ab4c8, 0.1);
    for (let y = -22; y <= 32; y += 3) {
      scanlines.beginPath(); scanlines.moveTo(-158, 6 + y); scanlines.lineTo(38, 6 + y); scanlines.strokePath();
    }
    // Waveform line drawn via graphics (static noisy line)
    const waveformGfx = this.add.graphics();
    const drawWaveform = (amp, color, alpha) => {
      waveformGfx.clear();
      waveformGfx.lineStyle(1.6, color, alpha);
      waveformGfx.beginPath();
      const startX = -158;
      waveformGfx.moveTo(startX, 6);
      for (let x = startX; x <= 38; x += 3) {
        const nx = x - startX;
        const wy = Math.sin(nx * 0.18) * amp * 0.5 + Math.sin(nx * 0.43) * amp * 0.3 + (Math.random() - 0.5) * amp * 0.8;
        waveformGfx.lineTo(x, 6 + wy);
      }
      waveformGfx.strokePath();
    };
    drawWaveform(4, 0x5ab4c8, 0.5);
    this.overlayContent.add([displayBezel, display, scanlines, waveformGfx]);

    // Signal strength bars (top-right of display)
    const signalBars = [];
    for (let i = 0; i < 5; i += 1) {
      const bar = this.add.rectangle(22 + i * 5, -16, 3, 4 + i * 2, 0x2a3540, 1);
      signalBars.push(bar);
      this.overlayContent.add(bar);
    }

    // === Knob (right side, prominent) ===
    const knobX = 168;
    const knobY = 4;
    const knobBezel = this.add.circle(knobX, knobY, 44, 0x1a2028, 1).setStrokeStyle(3, 0xd7c087, 0.55);
    const knobFace = this.add.circle(knobX, knobY, 36, 0x3a4654, 1).setStrokeStyle(2, 0x8aacba, 0.6);
    // Grip ridges
    const knobGrip = this.add.graphics();
    knobGrip.lineStyle(2, 0x5a7080, 0.85);
    for (let i = 0; i < 14; i += 1) {
      const ang = (i / 14) * Math.PI * 2;
      const x1 = knobX + Math.cos(ang) * 30;
      const y1 = knobY + Math.sin(ang) * 30;
      const x2 = knobX + Math.cos(ang) * 36;
      const y2 = knobY + Math.sin(ang) * 36;
      knobGrip.beginPath(); knobGrip.moveTo(x1, y1); knobGrip.lineTo(x2, y2); knobGrip.strokePath();
    }
    const knobHub = this.add.circle(knobX, knobY, 8, 0x2a3540, 1).setStrokeStyle(1.5, 0xd7c087, 0.7);
    const knobMark = this.add.rectangle(knobX, knobY - 22, 4, 24, 0xd7c087, 1).setOrigin(0.5, 1);
    knobMark.setAngle(0);
    // Pseudo-3D shadow on the knob
    const knobShadow = this.add.circle(knobX + 3, knobY + 3, 40, 0x000000, 0.3);
    const knobLabel = this.add.text(knobX, knobY + 62, "НАСТРОЙКА", {
      fontFamily: "monospace", fontSize: "8.5px", color: "#d7c087", letterSpacing: 1.5,
    }).setOrigin(0.5);
    this.overlayContent.add([knobShadow, knobBezel, knobFace, knobGrip, knobHub, knobMark, knobLabel]);

    // Speaker grille (bottom-left)
    const grille = this.add.rectangle(-170, 72, 108, 46, 0x0c1218, 1).setStrokeStyle(2, 0x5a7080, 0.55);
    const grilleGfx = this.add.graphics();
    grilleGfx.fillStyle(0x3a4654, 0.85);
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 10; c += 1) {
        grilleGfx.fillCircle(-214 + c * 9, 60 + r * 9, 1.8);
      }
    }
    this.overlayContent.add([grille, grilleGfx]);

    // Transcript lines (below display, appear when tuned)
    const lineA = this.add.text(-60, 72, "«...восточный створ открыт...", {
      fontFamily: "Georgia, serif", fontSize: "14px", color: "#a4dde8", align: "center",
    }).setOrigin(0.5).setAlpha(0);
    const lineB = this.add.text(-60, 92, "...спускаюсь к воде»", {
      fontFamily: "Georgia, serif", fontSize: "14px", color: "#a4dde8", align: "center",
    }).setOrigin(0.5).setAlpha(0);
    this.overlayContent.add([lineA, lineB]);

    let tuned = false;
    this.createOverlayRectHotspot(knobX, knobY, 90, 90, {
      pointerover: () => { if (!tuned) knobBezel.setStrokeStyle(3, 0xe1bb73, 0.9); },
      pointerout: () => { if (!tuned) knobBezel.setStrokeStyle(3, 0xd7c087, 0.55); },
      pointerdown: () => {
        tuned = true;
        this.tweens.add({ targets: knobMark, angle: 96, duration: 280, ease: "quad.out" });
        // Freq pointer travels across scale
        this.tweens.add({ targets: freqPointer, x: 48, duration: 520, ease: "quad.out" });
        // Waveform bursts into clean signal
        this.tweens.add({
          targets: {}, t: 0, duration: 420,
          onUpdate: (tw) => drawWaveform(6 + (1 - tw.progress) * 10, 0x5ab4c8, 0.55 + tw.progress * 0.35),
          onComplete: () => drawWaveform(10, 0xa4dde8, 0.9),
        });
        // Signal bars light up green sequentially
        signalBars.forEach((bar, i) => {
          this.time.delayedCall(100 + i * 80, () => {
            bar.setFillStyle(0x7de08f, 1);
          });
        });
        this.emitWorldPulse(3260, 528, { color: 0x9fe0eb, radius: 18, scale: 2.6, duration: 620 });
        this.tweens.add({ targets: [lineA, lineB], alpha: 1, duration: 360, delay: 200, ease: "quad.out" });
        this.showNarration(
          hasResolvedTunnelScene(this.session)
            ? "Передатчик сипит: «...восточный створ открыт, спускаюсь к воде». Голос уходит в хрип. Теперь направление ясно."
            : "Приёмник ловит обрывок: «...восточный створ открыт...». Чтобы понять дальше — нужно ещё собрать следы в тоннеле."
        );
      },
    });
  }

  openExitUnlockOverlay() {
    this.openOverlay(
      "Замок прохода",
      "Старый врезной замок в дубовой двери. Сними ключ со стойки, вставь в скважину и доверни до упора."
    );

    // === Frame / backdrop ===
    const frame = this.add.rectangle(0, 10, 540, 260, 0x0a1218, 0.97).setStrokeStyle(2, 0x3a4a52, 0.42);
    this.overlayContent.add(frame);

    // === Door surface (wooden boards) ===
    const doorShadow = this.add.rectangle(6, 16, 320, 236, 0x000000, 0.45);
    const doorBoard = this.add.rectangle(0, 10, 310, 226, 0x3a2a1c, 1).setStrokeStyle(3, 0x16100a, 1);
    const boardGfx = this.add.graphics();
    // Vertical plank seams
    boardGfx.lineStyle(1.5, 0x1a120b, 0.85);
    [-80, -40, 0, 40, 80].forEach((x) => {
      boardGfx.beginPath(); boardGfx.moveTo(x, -98); boardGfx.lineTo(x, 120); boardGfx.strokePath();
    });
    // Wood grain
    boardGfx.lineStyle(1, 0x2a1a10, 0.5);
    for (let i = 0; i < 14; i += 1) {
      const y = -90 + i * 16;
      boardGfx.beginPath();
      boardGfx.moveTo(-150, y);
      boardGfx.bezierCurveTo(-40, y - 2, 60, y + 3, 150, y);
      boardGfx.strokePath();
    }
    // Iron band across the middle of the door
    boardGfx.fillStyle(0x1a120a, 1);
    boardGfx.fillRect(-152, 74, 306, 12);
    boardGfx.fillStyle(0x4a3424, 0.5);
    boardGfx.fillRect(-152, 76, 306, 3);
    this.overlayContent.add([doorShadow, doorBoard, boardGfx]);

    // === Lock body (brass escutcheon over the mortise lock) ===
    const lockX = 62;
    const lockY = 4;
    // Outer brass plate
    const plateShadow = this.add.rectangle(lockX + 3, lockY + 4, 94, 158, 0x000000, 0.55);
    const plateOuter = this.add.rectangle(lockX, lockY, 94, 156, 0x4a3820, 1).setStrokeStyle(3, 0x2a1a0c, 1);
    const plateInner = this.add.rectangle(lockX, lockY, 82, 144, 0xa88444, 1).setStrokeStyle(2, 0x4a3820, 1);
    // Brass patina / vertical highlight
    const plateHi = this.add.rectangle(lockX - 20, lockY, 8, 130, 0xd7c087, 0.4);
    const plateShade = this.add.rectangle(lockX + 22, lockY, 12, 130, 0x3a2a14, 0.45);
    // Corner screws
    const screwGfx = this.add.graphics();
    screwGfx.fillStyle(0x2a1a0a, 1);
    [[-32, -60], [32, -60], [-32, 60], [32, 60]].forEach(([ox, oy]) => {
      screwGfx.fillCircle(lockX + ox, lockY + oy, 3);
      screwGfx.lineStyle(1, 0x8a6a3a, 0.8);
      screwGfx.beginPath(); screwGfx.moveTo(lockX + ox - 2, lockY + oy); screwGfx.lineTo(lockX + ox + 2, lockY + oy); screwGfx.strokePath();
    });
    this.overlayContent.add([plateShadow, plateOuter, plateInner, plateHi, plateShade, screwGfx]);

    // === Keyhole (proper skeleton-key shape) ===
    const holeX = lockX;
    const holeY = lockY + 14;
    const holeGfx = this.add.graphics();
    // Dark round top + rectangular stem
    holeGfx.fillStyle(0x080404, 1);
    holeGfx.fillCircle(holeX, holeY, 7);
    holeGfx.fillRect(holeX - 2.5, holeY, 5, 16);
    // Thin brass ring around the hole
    holeGfx.lineStyle(1.5, 0x4a3420, 1);
    holeGfx.strokeCircle(holeX, holeY, 7);
    this.overlayContent.add(holeGfx);
    // Pulsing halo (invitation)
    const keyholeGlow = this.add.circle(holeX, holeY + 4, 28, 0xe1bb73, 0.12);
    const keyholeHalo = this.add.circle(holeX, holeY + 4, 42, 0xe1bb73, 0);
    this.overlayContent.add([keyholeGlow, keyholeHalo]);

    // === Deadbolt indicator above the keyhole ===
    const boltTrack = this.add.rectangle(lockX, lockY - 44, 36, 10, 0x1a120a, 1).setStrokeStyle(1, 0x4a3820, 1);
    const boltSlider = this.add.rectangle(lockX - 10, lockY - 44, 14, 6, 0xd46462, 1);
    const boltLabel = this.add.text(lockX, lockY - 62, "ЗАКРЫТО", {
      fontFamily: "monospace", fontSize: "8px", color: "#d46462", letterSpacing: 1.5,
    }).setOrigin(0.5);
    this.overlayContent.add([boltTrack, boltSlider, boltLabel]);

    // === Key stand (left side) ===
    const standX = -170;
    const standY = 10;
    const standPlate = this.add.rectangle(standX, standY, 124, 168, 0x1a2028, 0.94).setStrokeStyle(2, 0x5a7080, 0.4);
    const standStrip = this.add.rectangle(standX, standY - 66, 124, 22, 0x2a3540, 0.95);
    const standLbl = this.add.text(standX, standY - 66, "СТОЙКА", {
      fontFamily: "monospace", fontSize: "9px", color: "#d7c087", letterSpacing: 1.5,
    }).setOrigin(0.5);
    // Hook on which the key hangs
    const hookPost = this.add.rectangle(standX, standY - 36, 4, 22, 0x8aacba, 0.8);
    const hookCurve = this.add.arc(standX - 6, standY - 22, 8, 270, 90, false, 0x8aacba, 0).setStrokeStyle(3, 0x8aacba, 0.95);
    this.overlayContent.add([standPlate, standStrip, standLbl, hookPost, hookCurve]);

    // === Key token (detailed skeleton key drawn via graphics) ===
    const keyToken = this.add.container(standX, standY + 16);
    const keyGfx = this.add.graphics();
    // Bow (ornate ring)
    keyGfx.fillStyle(0xc8b178, 1);
    keyGfx.fillCircle(-28, 0, 11);
    keyGfx.fillStyle(0x1a1008, 1);
    keyGfx.fillCircle(-28, 0, 5);
    // Decorative cross on the bow
    keyGfx.fillStyle(0xc8b178, 1);
    keyGfx.fillRect(-30, -6, 4, 12);
    keyGfx.fillRect(-34, -2, 12, 4);
    // Shaft
    keyGfx.fillStyle(0xc8b178, 1);
    keyGfx.fillRect(-18, -3, 52, 6);
    // Bit (teeth)
    keyGfx.fillRect(28, -3, 8, 13);
    keyGfx.fillRect(20, -3, 6, 10);
    // Highlight along top of shaft
    keyGfx.fillStyle(0xeacb9a, 0.9);
    keyGfx.fillRect(-18, -3, 52, 1);
    keyToken.add(keyGfx);
    const keyCaption = this.add.text(standX, standY + 50, "кликни, чтобы снять", {
      fontFamily: "Georgia, serif", fontSize: "10px", color: "#a8946a", fontStyle: "italic",
    }).setOrigin(0.5);
    this.overlayContent.add([keyToken, keyCaption]);

    // Idle sway on the key
    this.tweens.add({ targets: keyToken, angle: 3, duration: 1400, yoyo: true, repeat: -1, ease: "sine.inOut" });

    // === Instruction text ===
    const instructionBand = this.add.rectangle(0, 130, 500, 26, 0x0d1419, 0.92).setStrokeStyle(1, 0x5a7080, 0.35);
    const instruction = this.add.text(0, 130, "1. Сними ключ со стойки", {
      fontFamily: "Georgia, serif", fontSize: "14px", color: "#e6ddc4", align: "center",
    }).setOrigin(0.5);
    this.overlayContent.add([instructionBand, instruction]);

    let keyPicked = false;
    let keyInserted = false;
    let unlockTriggered = false;

    const updateHalo = () => {
      keyholeHalo.setFillStyle(0xe1bb73, keyPicked && !keyInserted ? 0.22 : 0);
      keyholeGlow.setFillStyle(0xe1bb73, keyInserted ? 0.22 : (keyPicked ? 0.18 : 0.1));
    };
    updateHalo();

    const doUnlock = () => {
      if (unlockTriggered || !keyInserted) return;
      unlockTriggered = true;
      playPreviewWorldCue("unlock");
      instruction.setText("Замок открыт. Проход свободен.");
      // Rotate key 90°
      this.tweens.add({ targets: keyToken, angle: 92, duration: 360, ease: "back.out" });
      // Deadbolt slides open + label flips to green
      this.tweens.add({
        targets: boltSlider, x: lockX + 10, duration: 380, delay: 160, ease: "back.out",
        onStart: () => { boltSlider.setFillStyle(0x7de08f); },
      });
      this.time.delayedCall(220, () => {
        boltLabel.setText("ОТКРЫТО");
        boltLabel.setColor("#7de08f");
      });
      this.time.delayedCall(420, () => {
        this.session.puzzleState.tunnelExit.unlocked = true;
        this.cameras.main.shake(140, 0.0018);
        this.emitWorldPulse(3526, 520, { color: 0xe1bb73, radius: 22, scale: 2.8, duration: 720 });
        this.showNarration("Замок щёлкает. Проход к нижней пристани открыт.");
        this.time.delayedCall(320, () => { this.closeOverlay(); this.syncHud(); });
      });
    };

    // Key stand hotspot
    this.createOverlayRectHotspot(standX, standY + 16, 110, 60, {
      pointerover: () => { if (!keyPicked && !keyInserted) standPlate.setStrokeStyle(3, 0xe1bb73, 0.85); },
      pointerout: () => { if (!keyPicked && !keyInserted) standPlate.setStrokeStyle(2, 0x5a7080, 0.4); },
      pointerdown: () => {
        if (unlockTriggered || keyInserted || keyPicked) return;
        keyPicked = true;
        keyCaption.setText("в руке");
        keyCaption.setColor("#d7c087");
        this.tweens.add({ targets: keyToken, scaleX: 1.15, scaleY: 1.15, duration: 130, yoyo: true, ease: "quad.out" });
        instruction.setText("2. Вставь ключ в скважину");
        updateHalo();
        this.showMessage("Ключ в руке. Теперь вставь его в скважину на латунной пластине.");
      },
    });

    // Keyhole hotspot (for inserting and turning)
    this.createOverlayRectHotspot(holeX, holeY + 4, 90, 110, {
      pointerover: () => {
        if (!unlockTriggered) keyholeHalo.setFillStyle(0xe1bb73, keyPicked || keyInserted ? 0.3 : 0.12);
      },
      pointerout: () => updateHalo(),
      pointerdown: () => {
        if (unlockTriggered) return;
        if (keyInserted) { doUnlock(); return; }
        if (!keyPicked) { this.showMessage("Сначала сними ключ со стойки слева."); return; }
        keyPicked = false;
        keyInserted = true;
        playPreviewUiTick("read");
        keyCaption.setText("");
        instruction.setText("3. Поверни ключ до упора");
        updateHalo();
        // Move key into the keyhole
        this.tweens.add({
          targets: keyToken, x: holeX - 24, y: holeY + 2, duration: 280, ease: "quad.out",
        });
        this.time.delayedCall(160, () => keyToken.setDepth(12));
        this.showMessage("Ключ встал в замок. Теперь кликни по нему, чтобы повернуть.");
      },
    });

    // Halo animation
    this.tweens.add({
      targets: keyholeGlow, alpha: 0.3, scaleX: 1.2, scaleY: 1.2,
      duration: 1000, yoyo: true, repeat: -1, ease: "sine.inOut",
    });
  }

  openSkiffOverlay() {
    this.openOverlay(
      "Служебный ялик",
      "Ялик посажен боком на камни, внутри плещется солёная вода и мокрая парусина. На дне — короткий багор."
    );

    // Water backdrop
    const backdrop = this.add.rectangle(0, 10, 540, 260, 0x0a1622, 0.96).setStrokeStyle(2, 0x1e4050, 0.45);
    // Water wave bands behind the hull
    const waterGfx = this.add.graphics();
    waterGfx.lineStyle(1, 0x4a7090, 0.35);
    for (let i = 0; i < 6; i += 1) {
      const y = 88 + i * 12;
      for (let j = 0; j < 9; j += 1) {
        const ox = -220 + j * 52;
        waterGfx.beginPath(); waterGfx.arc(ox, y, 6, Math.PI, 0, false); waterGfx.strokePath();
      }
    }
    this.overlayContent.add([backdrop, waterGfx]);

    // Hull shadow in water
    const hullShadow = this.add.ellipse(0, 90, 400, 30, 0x000000, 0.5);
    this.overlayContent.add(hullShadow);

    // Outer hull — crescent shape using polygon approximation
    const hullGfx = this.add.graphics();
    hullGfx.fillStyle(0x4a5860, 1);
    hullGfx.lineStyle(3, 0xa0b0ba, 0.65);
    // Outer silhouette
    const hullPoints = [
      [-180, 10], [-156, -26], [-110, -44], [-54, -52], [0, -54], [58, -52],
      [112, -44], [158, -26], [180, 10],
      [168, 50], [130, 68], [70, 76], [0, 78], [-72, 76], [-132, 68], [-170, 50],
    ];
    hullGfx.beginPath();
    hullGfx.moveTo(hullPoints[0][0], hullPoints[0][1]);
    for (let i = 1; i < hullPoints.length; i += 1) hullGfx.lineTo(hullPoints[i][0], hullPoints[i][1]);
    hullGfx.closePath();
    hullGfx.fillPath();
    hullGfx.strokePath();
    // Wood grain planks
    hullGfx.lineStyle(1, 0x2a3540, 0.65);
    [-26, -8, 10, 28, 46, 60].forEach((y) => {
      hullGfx.beginPath(); hullGfx.moveTo(-170, y); hullGfx.lineTo(170, y); hullGfx.strokePath();
    });
    // Rivets along the top edge
    hullGfx.fillStyle(0xa0b0ba, 0.8);
    [-150, -100, -50, 0, 50, 100, 150].forEach((x) => hullGfx.fillCircle(x, -34, 1.8));
    // Gunwale rim
    hullGfx.lineStyle(3, 0xcab07c, 0.6);
    hullGfx.beginPath();
    hullGfx.moveTo(-168, -18); hullGfx.lineTo(-110, -40); hullGfx.lineTo(0, -48);
    hullGfx.lineTo(110, -40); hullGfx.lineTo(168, -18);
    hullGfx.strokePath();
    this.overlayContent.add(hullGfx);

    // Interior cavity
    const cavityGfx = this.add.graphics();
    cavityGfx.fillStyle(0x111820, 1);
    cavityGfx.beginPath();
    cavityGfx.moveTo(-142, -4); cavityGfx.lineTo(-96, -26); cavityGfx.lineTo(0, -32);
    cavityGfx.lineTo(96, -26); cavityGfx.lineTo(142, -4);
    cavityGfx.lineTo(130, 42); cavityGfx.lineTo(60, 52); cavityGfx.lineTo(0, 54);
    cavityGfx.lineTo(-64, 52); cavityGfx.lineTo(-130, 42);
    cavityGfx.closePath(); cavityGfx.fillPath();
    // Ribs inside the cavity
    cavityGfx.lineStyle(2, 0x2a3540, 0.9);
    [-80, -30, 30, 80].forEach((x) => {
      cavityGfx.beginPath(); cavityGfx.moveTo(x, -26); cavityGfx.lineTo(x * 0.9, 48); cavityGfx.strokePath();
    });
    this.overlayContent.add(cavityGfx);

    // Puddle of standing water with ripple highlights
    const puddle = this.add.ellipse(-24, 30, 150, 26, 0x4a90a8, 0.38);
    const puddleHi = this.add.ellipse(-40, 26, 58, 5, 0xa0d4dc, 0.65);
    const puddleHi2 = this.add.ellipse(20, 34, 30, 3, 0xa0d4dc, 0.5);
    this.overlayContent.add([puddle, puddleHi, puddleHi2]);
    this.tweens.add({ targets: [puddleHi, puddleHi2], alpha: 0.9, duration: 1600, yoyo: true, repeat: -1, ease: "sine.inOut" });

    // Wet tarp, crumpled, in the stern
    const tarpGfx = this.add.graphics();
    tarpGfx.fillStyle(0x1e3648, 0.95);
    tarpGfx.beginPath();
    tarpGfx.moveTo(64, -14); tarpGfx.lineTo(140, -10); tarpGfx.lineTo(134, 38); tarpGfx.lineTo(48, 30);
    tarpGfx.closePath(); tarpGfx.fillPath();
    tarpGfx.fillStyle(0x355565, 0.85);
    tarpGfx.beginPath();
    tarpGfx.moveTo(66, -10); tarpGfx.lineTo(106, -8); tarpGfx.lineTo(102, 18); tarpGfx.lineTo(58, 14);
    tarpGfx.closePath(); tarpGfx.fillPath();
    tarpGfx.lineStyle(1, 0x8aacba, 0.35);
    tarpGfx.beginPath(); tarpGfx.moveTo(76, -6); tarpGfx.lineTo(124, 20); tarpGfx.strokePath();
    tarpGfx.beginPath(); tarpGfx.moveTo(56, 16); tarpGfx.lineTo(98, 32); tarpGfx.strokePath();
    this.overlayContent.add(tarpGfx);

    // Empty bail bucket near bow
    const bucket = this.add.graphics();
    bucket.fillStyle(0x3a2a1a, 1);
    bucket.lineStyle(2, 0x6a4a2a, 0.8);
    bucket.fillRect(-132, 4, 22, 24);
    bucket.strokeRect(-132, 4, 22, 24);
    bucket.beginPath(); bucket.moveTo(-130, 4); bucket.lineTo(-121, -6); bucket.lineTo(-112, 4); bucket.strokePath();
    this.overlayContent.add(bucket);

    // Lantern (empty)
    const lantern = this.add.graphics();
    lantern.fillStyle(0x4a5662, 1);
    lantern.lineStyle(1.5, 0x8aacba, 0.7);
    lantern.fillRect(98, -8, 16, 24);
    lantern.strokeRect(98, -8, 16, 24);
    lantern.fillStyle(0x1a1a1a, 1); // dead lamp
    lantern.fillRect(101, -4, 10, 16);
    lantern.beginPath(); lantern.moveTo(106, -12); lantern.lineTo(106, -18); lantern.strokePath();
    this.overlayContent.add(lantern);

    if (!this.session.inventory.includes("boatHook")) {
      // Glow behind hook
      const hookGlow = this.add.circle(-70, 20, 44, 0xe1bb73, 0.1);
      const hookHalo = this.add.circle(-70, 20, 22, 0xe1bb73, 0);
      this.overlayContent.add([hookGlow, hookHalo]);
      // Boat hook: wooden shaft at an angle + metal hook
      const hookGfx = this.add.graphics();
      // Shaft (angled)
      hookGfx.fillStyle(0x7a5a3a, 1);
      hookGfx.lineStyle(1, 0x4a3a24, 0.8);
      // Draw shaft as rotated rectangle via path
      const cx = -70, cy = 20;
      const shaftLen = 88, shaftThick = 6, shaftAngle = -18 * Math.PI / 180;
      const cos = Math.cos(shaftAngle), sin = Math.sin(shaftAngle);
      const shaftCorners = [
        [-shaftLen/2, -shaftThick/2], [shaftLen/2, -shaftThick/2],
        [shaftLen/2, shaftThick/2], [-shaftLen/2, shaftThick/2],
      ].map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);
      hookGfx.beginPath();
      hookGfx.moveTo(shaftCorners[0][0], shaftCorners[0][1]);
      for (let i = 1; i < shaftCorners.length; i += 1) hookGfx.lineTo(shaftCorners[i][0], shaftCorners[i][1]);
      hookGfx.closePath(); hookGfx.fillPath(); hookGfx.strokePath();
      // Wood grain
      hookGfx.lineStyle(1, 0x4a3a24, 0.5);
      [-0.7, 0, 0.7].forEach((fy) => {
        const oy = fy * 2;
        hookGfx.beginPath();
        hookGfx.moveTo(cx + (-shaftLen/2) * cos - oy * sin, cy + (-shaftLen/2) * sin + oy * cos);
        hookGfx.lineTo(cx + (shaftLen/2) * cos - oy * sin, cy + (shaftLen/2) * sin + oy * cos);
        hookGfx.strokePath();
      });
      // Metal hook at the tip (top-right end of the shaft)
      const tipX = cx + (shaftLen/2) * cos;
      const tipY = cy + (shaftLen/2) * sin;
      hookGfx.lineStyle(5, 0xb8c8d0, 1);
      hookGfx.beginPath();
      hookGfx.arc(tipX + 2, tipY - 10, 10, Math.PI * 0.3, -Math.PI * 0.9, true);
      hookGfx.strokePath();
      // Tip metallic cap
      hookGfx.fillStyle(0xa1bac6, 1);
      hookGfx.fillCircle(tipX, tipY, 3.5);
      this.overlayContent.add(hookGfx);

      // Caption
      const caption = this.add.text(-70, 72, "Багор", {
        fontFamily: "Georgia, serif", fontSize: "14px", color: "#eadcc1",
      }).setOrigin(0.5);
      const subtitle = this.add.text(-70, 92, "кликни, чтобы забрать", {
        fontFamily: "Georgia, serif", fontSize: "11px", color: "#a8946a", fontStyle: "italic",
      }).setOrigin(0.5);
      this.overlayContent.add([caption, subtitle]);

      // Halo pulse
      this.tweens.add({
        targets: hookHalo, alpha: 0.25, scaleX: 1.4, scaleY: 1.4,
        duration: 1100, yoyo: true, repeat: -1, ease: "sine.inOut",
      });

      this.createOverlayRectHotspot(-70, 20, 130, 72, {
        pointerover: () => { hookGlow.setFillStyle(0xe1bb73, 0.2); hookHalo.setFillStyle(0xe1bb73, 0.3); },
        pointerout: () => { hookGlow.setFillStyle(0xe1bb73, 0.1); hookHalo.setFillStyle(0xe1bb73, 0); },
        pointerdown: () => {
          this.addInventoryItem("boatHook");
          this.emitWorldPulse(4600, 564, { color: 0xc9d8de, radius: 18, scale: 2.4, duration: 620 });
          this.showNarration("На дне ялика — короткий багор. Он поможет подцепить мокрый засов у воды.");
          this.openSkiffOverlay();
        },
      });
      return;
    }

    const emptyText = this.add.text(0, 108, "Багор забран. На дне остался пустой фонарь, ведро и следы грязи.", {
      fontFamily: "Georgia, serif", fontSize: "14px", color: "#b8c8d0", align: "center", fontStyle: "italic",
      wordWrap: { width: 460 },
    }).setOrigin(0.5);
    this.overlayContent.add(emptyText);
  }

  openWinchOverlay() {
    this.openOverlay(
      "Лебёдка у края пристани",
      "Старый стальной узел. Барабан, ручка, шестерни — и обрезок троса, уходящий в темноту под скалы."
    );

    // Frame
    const frame = this.add.rectangle(0, 10, 540, 260, 0x0c1218, 0.97).setStrokeStyle(2, 0x3a5066, 0.45);
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, 0x1c3040, 0.5);
    for (let gx = -250; gx <= 250; gx += 40) {
      gridGfx.beginPath(); gridGfx.moveTo(gx, -112); gridGfx.lineTo(gx, 130); gridGfx.strokePath();
    }
    this.overlayContent.add([frame, gridGfx]);

    // Stone pedestal under winch
    const pedShadow = this.add.ellipse(0, 120, 260, 20, 0x000000, 0.5);
    const pedestal = this.add.rectangle(0, 104, 220, 36, 0x2a3038, 1).setStrokeStyle(2, 0x4a5662, 0.55);
    const pedestalTop = this.add.rectangle(0, 88, 240, 8, 0x4a5662, 0.8);
    const pedBolts = this.add.graphics();
    pedBolts.fillStyle(0xa0b0ba, 0.75);
    [-96, -32, 32, 96].forEach((ox) => pedBolts.fillCircle(ox, 118, 2.6));
    this.overlayContent.add([pedShadow, pedestal, pedestalTop, pedBolts]);

    // Upright support columns (two)
    const colLeft = this.add.rectangle(-70, 4, 20, 160, 0x3a4652, 1).setStrokeStyle(2, 0x7a8a94, 0.4);
    const colRight = this.add.rectangle(70, 4, 20, 160, 0x3a4652, 1).setStrokeStyle(2, 0x7a8a94, 0.4);
    const crossbar = this.add.rectangle(0, -76, 180, 12, 0x3a4652, 1).setStrokeStyle(2, 0x7a8a94, 0.4);
    this.overlayContent.add([colLeft, colRight, crossbar]);

    // Drum axle + drum
    const drumShadow = this.add.ellipse(4, 10, 120, 86, 0x000000, 0.35);
    const drumBack = this.add.circle(0, 4, 50, 0x1a2028, 1).setStrokeStyle(3, 0x8a7040, 0.6);
    const drumBody = this.add.circle(0, 4, 46, 0x3a3020, 1).setStrokeStyle(3, 0xcab07c, 0.85);
    // Drum rope groove texture (concentric rings)
    const drumGrooves = this.add.graphics();
    drumGrooves.lineStyle(1, 0x8a7040, 0.45);
    [16, 22, 28, 34, 40].forEach((r) => drumGrooves.strokeCircle(0, 4, r));
    // Hub + cross
    const hubOuter = this.add.circle(0, 4, 10, 0x1a1a1a, 1).setStrokeStyle(2, 0xcab07c, 0.85);
    const hubDot = this.add.circle(0, 4, 3, 0xcab07c, 1);
    const crossA = this.add.rectangle(0, 4, 90, 3, 0x1a1410, 0.6);
    const crossB = this.add.rectangle(0, 4, 3, 90, 0x1a1410, 0.6);
    this.overlayContent.add([drumShadow, drumBack, drumBody, drumGrooves, crossA, crossB, hubOuter, hubDot]);

    // Ratchet / gear on the right side of the drum
    const gearGfx = this.add.graphics();
    gearGfx.lineStyle(2, 0x8aacba, 0.7);
    gearGfx.fillStyle(0x2a3540, 1);
    gearGfx.fillCircle(78, 4, 20);
    gearGfx.strokeCircle(78, 4, 20);
    // Gear teeth
    for (let i = 0; i < 10; i += 1) {
      const ang = (i / 10) * Math.PI * 2;
      const tx = 78 + Math.cos(ang) * 24;
      const ty = 4 + Math.sin(ang) * 24;
      gearGfx.fillStyle(0x4a5662, 1);
      gearGfx.fillCircle(tx, ty, 2.4);
    }
    gearGfx.lineStyle(1, 0xcab07c, 0.7);
    gearGfx.beginPath(); gearGfx.moveTo(78, -6); gearGfx.lineTo(78, 14); gearGfx.strokePath();
    gearGfx.beginPath(); gearGfx.moveTo(68, 4); gearGfx.lineTo(88, 4); gearGfx.strokePath();
    // Pawl (tilted lever biting gear)
    gearGfx.lineStyle(2, 0xcab07c, 0.85);
    gearGfx.beginPath(); gearGfx.moveTo(78 + 20, 4); gearGfx.lineTo(78 + 40, -10); gearGfx.strokePath();
    gearGfx.fillStyle(0xcab07c, 1);
    gearGfx.fillRect(78 + 38, -14, 6, 8);
    this.overlayContent.add(gearGfx);

    // Hand crank (on the left side)
    const crankArm = this.add.rectangle(-60, 4, 4, 72, 0xcab07c, 1);
    crankArm.setOrigin(0.5, 0);
    crankArm.setAngle(-12);
    const crankHandle = this.add.rectangle(-82, 68, 18, 22, 0x7a5a3a, 1).setStrokeStyle(2, 0xcab07c, 0.7);
    this.overlayContent.add([crankArm, crankHandle]);

    // Cut rope — frayed ends
    const ropeGfx = this.add.graphics();
    ropeGfx.lineStyle(5, 0xb89464, 1);
    ropeGfx.beginPath();
    ropeGfx.moveTo(0, 4);
    ropeGfx.lineTo(-40, 40);
    ropeGfx.lineTo(-80, 92);
    ropeGfx.strokePath();
    // Frayed end
    ropeGfx.lineStyle(2, 0xb89464, 0.9);
    [-82, -78, -86, -74, -90].forEach((fx) => {
      ropeGfx.beginPath(); ropeGfx.moveTo(fx, 92); ropeGfx.lineTo(fx - 6 + Math.random() * 4, 104 + Math.random() * 6); ropeGfx.strokePath();
    });
    // Cut-point red warning
    const cutMark = this.add.graphics();
    cutMark.lineStyle(2, 0xd46462, 0.95);
    cutMark.beginPath(); cutMark.moveTo(-78, 86); cutMark.lineTo(-88, 100); cutMark.strokePath();
    cutMark.beginPath(); cutMark.moveTo(-88, 86); cutMark.lineTo(-78, 100); cutMark.strokePath();
    // Label pointer
    const cutLabel = this.add.text(-150, 66, "свежий\nразрез", {
      fontFamily: "monospace", fontSize: "9.5px", color: "#d46462", align: "center", lineSpacing: 2,
    }).setOrigin(0.5);
    const cutLine = this.add.line(0, 0, -128, 70, -92, 92, 0xd46462, 0.7).setStrokeStyle(1, 0xd46462, 0.7);
    this.overlayContent.add([ropeGfx, cutMark, cutLabel, cutLine]);

    // Metal scars on the column (another sabotage indicator)
    const scarGfx = this.add.graphics();
    scarGfx.lineStyle(2, 0xcab07c, 0.7);
    [[60, -28, 76, -12], [62, -8, 80, 6], [58, 18, 78, 30]].forEach(([x1, y1, x2, y2]) => {
      scarGfx.beginPath(); scarGfx.moveTo(x1, y1); scarGfx.lineTo(x2, y2); scarGfx.strokePath();
    });
    scarGfx.lineStyle(1, 0x8a6a3a, 0.5);
    [[64, -24, 72, -16], [66, -6, 74, 2]].forEach(([x1, y1, x2, y2]) => {
      scarGfx.beginPath(); scarGfx.moveTo(x1, y1); scarGfx.lineTo(x2, y2); scarGfx.strokePath();
    });
    this.overlayContent.add(scarGfx);

    // Right-side evidence card
    const cardX = 196;
    const card = this.add.rectangle(cardX, -6, 100, 138, 0x1a2028, 0.94).setStrokeStyle(2, 0xd46462, 0.35);
    const cardHdr = this.add.rectangle(cardX, -62, 100, 20, 0x2a1a1a, 0.95);
    const cardHdrTxt = this.add.text(cardX, -62, "СЛЕДЫ", {
      fontFamily: "monospace", fontSize: "9px", color: "#d46462", letterSpacing: 1.5,
    }).setOrigin(0.5);
    const cardLines = [
      "· обрез троса",
      "· зарубки по",
      "  колонне",
      "· рваный край",
    ];
    cardLines.forEach((t, i) => {
      const line = this.add.text(cardX - 42, -36 + i * 18, t, {
        fontFamily: "monospace", fontSize: "10px", color: "#c8b0a0",
      }).setOrigin(0, 0.5);
      this.overlayContent.add(line);
    });
    const cardVerdict = this.add.text(cardX, 44, hasResolvedPierScene(this.session)
      ? "в спешке\n+ с усилием"
      : "проверь ялик",
      {
        fontFamily: "Georgia, serif", fontSize: "10px", color: "#d7c087", align: "center",
        fontStyle: "italic", lineSpacing: 2,
      }).setOrigin(0.5);
    this.overlayContent.add([card, cardHdr, cardHdrTxt, cardVerdict]);

    // Subtle glow pulse on the cut area
    const cutGlow = this.add.circle(-82, 94, 26, 0xd46462, 0.1);
    this.overlayContent.add(cutGlow);
    this.tweens.add({
      targets: cutGlow, alpha: 0.22, duration: 860, yoyo: true, repeat: -1, ease: "sine.inOut",
    });

    this.showNarration(
      hasResolvedPierScene(this.session)
        ? "Барабан наполовину пуст, трос обрезан одним косым ударом. На колонне — зарубки: кто-то спускался к воде быстро и с усилием."
        : "Трос на барабане обрезан свежо, край рваный. Кто-то уходил вниз спешно. Нужно посмотреть и ялик."
    );
  }

  openSeaGateOverlay() {
    this.openOverlay(
      "Морской створ",
      "Сначала подцепи засов багром, а потом сорви его в сторону, чтобы створ наконец поддался."
    );

    const gate = this.add.rectangle(0, 18, 360, 240, 0x25313a, 0.96).setStrokeStyle(3, 0xd2b47b, 0.24);
    const latch = this.add.rectangle(42, 0, 120, 14, 0xa5b9c4, 1).setStrokeStyle(2, 0x4f6772, 0.28);
    const staple = this.add.rectangle(-26, 0, 26, 42, 0x48555f, 1);
    const latchGlow = this.add.circle(102, 0, 24, 0xe1bb73, 0.12).setStrokeStyle(3, 0xe1bb73, 0.36);
    const instruction = this.add.text(0, 132, "Подцепи засов", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#dce6e9",
    }).setOrigin(0.5);

    const hookTool = this.add.container(-130, 62).setSize(150, 52);
    const shaft = this.add.rectangle(-8, 0, 68, 6, 0x875c42, 1).setAngle(-26);
    const metalHook = this.add.arc(28, -16, 14, 210, 20, false, 0xa1bac6, 1).setStrokeStyle(5, 0xa1bac6, 1);
    const handle = this.add.rectangle(-34, 16, 24, 10, 0x6f4d38, 1).setAngle(-26);
    hookTool.add([shaft, metalHook, handle]);
    const pullZoneGlow = this.add.rectangle(-34, 4, 160, 84, 0xe1bb73, 0.04).setStrokeStyle(2, 0xe1bb73, 0.16);
    pullZoneGlow.setVisible(false);

    let hookPicked = false;
    let hookAttached = false;
    let gateReleased = false;

    const updateHookVisual = () => {
      const strokeAlpha = hookPicked || hookAttached ? 0.26 : 0.14;
      pullZoneGlow.setVisible(hookAttached && !gateReleased);
      latchGlow.setFillStyle(0xe1bb73, hookAttached ? 0.18 : (hookPicked ? 0.14 : 0.12));
      shaft.setFillStyle(hookAttached ? 0x9c6a4c : 0x875c42, 1);
      metalHook.setStrokeStyle(5, hookPicked || hookAttached ? 0xc5dce3 : 0xa1bac6, 1);
      pullZoneGlow.setStrokeStyle(2, 0xe1bb73, strokeAlpha);
    };

    this.createOverlayRectHotspot(-130, 62, 150, 64, {
      pointerover: () => {
        if (!hookAttached && !gateReleased) {
          metalHook.setStrokeStyle(5, 0xd8eef4, 1);
        }
      },
      pointerout: () => updateHookVisual(),
      pointerdown: () => {
        if (gateReleased || hookAttached) {
          return;
        }
        hookPicked = true;
        instruction.setText("Теперь зацепи засов");
        updateHookVisual();
        this.tweens.add({
          targets: hookTool,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 120,
          yoyo: true,
          ease: "quad.out",
        });
        this.showMessage("Багор в руке. Теперь зацепи им мокрый засов.");
      },
    });

    this.createOverlayRectHotspot(102, 0, 96, 84, {
      pointerover: () => {
        if (!gateReleased) {
          latchGlow.setFillStyle(0xe1bb73, hookPicked || hookAttached ? 0.18 : 0.14);
        }
      },
      pointerout: () => updateHookVisual(),
      pointerdown: () => {
        if (gateReleased) {
          return;
        }
        if (hookAttached) {
          this.showMessage("Багор уже зацепился за засов. Теперь сорви его влево.");
          return;
        }
        if (!hookPicked) {
          this.showMessage("Сначала возьми багор слева.");
          return;
        }
        hookPicked = false;
        hookAttached = true;
        instruction.setText("Теперь сорви засов влево");
        updateHookVisual();
        this.tweens.add({
          targets: hookTool,
          x: 14,
          y: 6,
          duration: 180,
          ease: "quad.out",
        });
        this.showMessage("Багор зацепился. Осталось сорвать засов в сторону.");
      },
    });

    this.createOverlayRectHotspot(-34, 4, 160, 84, {
      pointerover: () => {
        if (hookAttached && !gateReleased) {
          pullZoneGlow.setFillStyle(0xe1bb73, 0.08);
        }
      },
      pointerout: () => {
        if (hookAttached && !gateReleased) {
          pullZoneGlow.setFillStyle(0xe1bb73, 0.04);
        }
      },
      pointerdown: () => {
        if (gateReleased) {
          return;
        }
        if (!hookAttached) {
          this.showMessage("Сначала зацепи засов багром.");
          return;
        }
        gateReleased = true;
        pullZoneGlow.setFillStyle(0xe1bb73, 0.1);
        this.tweens.add({
          targets: hookTool,
          x: -42,
          duration: 180,
          ease: "quad.out",
        });
        this.tweens.add({
          targets: latch,
          x: 4,
          duration: 180,
          ease: "quad.out",
        });
        this.tweens.add({
          targets: staple,
          x: -18,
          duration: 180,
          ease: "quad.out",
        });
        this.time.delayedCall(190, () => {
          this.session.puzzleState.seaGate.released = true;
          this.cameras.main.shake(160, 0.002);
          this.emitWorldPulse(5324, 510, {
            color: 0x91cad8,
            radius: 20,
            scale: 2.8,
            duration: 720,
          });
          this.showNarration("Засов срывается с мокрым скрежетом. Морской створ теперь открыт.");
          this.time.delayedCall(220, () => {
            this.closeOverlay();
            this.syncHud();
          });
        });
      },
    });

    this.tweens.add({
      targets: [latchGlow, pullZoneGlow],
      alpha: 0.26,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.overlayContent.add([gate, staple, latch, latchGlow, pullZoneGlow, instruction, hookTool]);
  }

  openCampfireOverlay() {
    this.openOverlay(
      "Потухший костёр",
      "Костёр давно остыл, но камни вокруг уложены аккуратно кругом. Здесь не случайная стоянка — чьё-то укрытие на несколько ночей."
    );

    // Frame / ground
    const frame = this.add.rectangle(0, 10, 520, 260, 0x0c121a, 0.97).setStrokeStyle(2, 0x3a4a3a, 0.42);
    // Sandy ground texture
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(0x1c2a28, 1);
    groundGfx.fillRect(-250, -10, 500, 140);
    groundGfx.fillStyle(0x2a3a34, 0.5);
    for (let i = 0; i < 28; i += 1) {
      groundGfx.fillCircle(-230 + Math.random() * 460, 0 + Math.random() * 120, 0.8 + Math.random() * 1.4);
    }
    // Footprint hints to hidden bay
    groundGfx.fillStyle(0x0a0e12, 0.5);
    [[-178, 96], [-142, 108], [160, 100], [198, 114]].forEach(([x, y]) => {
      groundGfx.fillEllipse(x, y, 18, 8);
    });
    this.overlayContent.add([frame, groundGfx]);

    // Ring of stones (pit)
    const pitShadow = this.add.ellipse(0, 44, 300, 96, 0x000000, 0.45);
    this.overlayContent.add(pitShadow);
    const stoneGfx = this.add.graphics();
    const stones = 10;
    for (let i = 0; i < stones; i += 1) {
      const ang = (i / stones) * Math.PI * 2;
      const rx = Math.cos(ang) * 130;
      const ry = Math.sin(ang) * 42;
      const sw = 28 + Math.random() * 16;
      const sh = 20 + Math.random() * 10;
      stoneGfx.fillStyle(0x4a5a5a, 1);
      stoneGfx.fillEllipse(rx, 44 + ry, sw, sh);
      stoneGfx.lineStyle(1.5, 0x2a3a38, 0.85);
      stoneGfx.strokeEllipse(rx, 44 + ry, sw, sh);
      // Highlight on top
      stoneGfx.fillStyle(0x8a9a94, 0.3);
      stoneGfx.fillEllipse(rx - sw * 0.15, 44 + ry - sh * 0.25, sw * 0.5, sh * 0.35);
    }
    // Inner char pit (darker)
    stoneGfx.fillStyle(0x0c0a08, 1);
    stoneGfx.fillEllipse(0, 44, 200, 60);
    stoneGfx.fillStyle(0x1a140c, 0.8);
    stoneGfx.fillEllipse(0, 44, 180, 50);
    this.overlayContent.add(stoneGfx);

    // Ash pile in the center (light grey with specs)
    const ashGfx = this.add.graphics();
    ashGfx.fillStyle(0x6a6458, 0.85);
    ashGfx.fillEllipse(0, 46, 110, 28);
    ashGfx.fillStyle(0x5a5448, 0.7);
    ashGfx.fillEllipse(-16, 44, 60, 18);
    ashGfx.fillEllipse(22, 50, 50, 16);
    // Ash specks
    ashGfx.fillStyle(0x9a9488, 0.5);
    for (let i = 0; i < 22; i += 1) {
      ashGfx.fillCircle(-52 + Math.random() * 104, 40 + Math.random() * 14, 0.6 + Math.random() * 1.1);
    }
    this.overlayContent.add(ashGfx);

    // Charred logs crossing — built as rotated rectangles
    const logA = this.add.rectangle(-14, 42, 130, 13, 0x2a1a10, 1).setStrokeStyle(1.5, 0x4a2a18, 0.9);
    logA.setAngle(-18);
    const logAEnd1 = this.add.circle(-74, 22, 6, 0x4a2a18, 1);
    const logAEnd2 = this.add.circle(46, 62, 6, 0x4a2a18, 1);
    const logB = this.add.rectangle(10, 44, 108, 11, 0x2a1a10, 1).setStrokeStyle(1.5, 0x4a2a18, 0.9);
    logB.setAngle(22);
    const logBEnd1 = this.add.circle(-40, 24, 5, 0x4a2a18, 1);
    const logBEnd2 = this.add.circle(60, 64, 5, 0x4a2a18, 1);
    this.overlayContent.add([logA, logAEnd1, logAEnd2, logB, logBEnd1, logBEnd2]);

    // Two dim red embers (barely warm)
    const emberA = this.add.circle(-18, 42, 4, 0x5c2a18, 1);
    const emberB = this.add.circle(12, 48, 5, 0x7f3a22, 1);
    const emberC = this.add.circle(-4, 46, 3, 0x6a3a22, 1);
    const emberGlow = this.add.ellipse(0, 44, 100, 30, 0xc8844a, 0.08);
    this.overlayContent.add([emberGlow, emberA, emberB, emberC]);

    this.tweens.add({
      targets: emberGlow, alpha: 0.18, duration: 760, yoyo: true, repeat: -1, ease: "sine.inOut",
    });
    this.tweens.add({
      targets: [emberA, emberC], alpha: 0.5, duration: 1200, yoyo: true, repeat: -1, ease: "sine.inOut",
    });

    // Evidence card (right)
    const cardX = 190;
    const card = this.add.rectangle(cardX, -28, 92, 120, 0x1a2028, 0.94).setStrokeStyle(2, 0x7a6a56, 0.4);
    const cardHdr = this.add.rectangle(cardX, -76, 92, 18, 0x2a2a1e, 0.95);
    const cardHdrTxt = this.add.text(cardX, -76, "СТОЯНКА", {
      fontFamily: "monospace", fontSize: "8.5px", color: "#d7c087", letterSpacing: 1.5,
    }).setOrigin(0.5);
    const cardLines = [
      "· камни кругом",
      "· 2 логена",
      "· зола слоями",
      "· следы на",
      "  песке →",
    ];
    cardLines.forEach((t, i) => {
      const line = this.add.text(cardX - 40, -54 + i * 14, t, {
        fontFamily: "monospace", fontSize: "9px", color: "#b8a468",
      }).setOrigin(0, 0.5);
      this.overlayContent.add(line);
    });
    const verdict = this.add.text(cardX, 26, "3+ ночи", {
      fontFamily: "Georgia, serif", fontSize: "11px", color: "#d7c087", fontStyle: "italic",
    }).setOrigin(0.5);
    this.overlayContent.add([card, cardHdr, cardHdrTxt, verdict]);

    this.showNarration("Костёр погас давно — зола успела слежаться в несколько слоёв. Камни вокруг уложены кругом, не набросаны. Кто-то прятался здесь не одну ночь.");
  }

  openCacheOverlay() {
    this.openOverlay(
      "Тайник под тентом",
      "Парусиновый тент натянут на пару кольев. Под ним — вещи, собранные так, чтобы ждать и сорваться за минуту."
    );

    // Frame + damp rocky ground
    const frame = this.add.rectangle(0, 10, 540, 260, 0x0c141a, 0.97).setStrokeStyle(2, 0x3a4a52, 0.42);
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(0x1c2830, 1);
    groundGfx.fillRect(-250, 20, 500, 110);
    groundGfx.fillStyle(0x2a3842, 0.5);
    for (let i = 0; i < 20; i += 1) {
      groundGfx.fillCircle(-230 + Math.random() * 460, 30 + Math.random() * 100, 1 + Math.random() * 1.6);
    }
    this.overlayContent.add([frame, groundGfx]);

    // Back wall (rock)
    const rockGfx = this.add.graphics();
    rockGfx.fillStyle(0x2a3540, 0.92);
    rockGfx.fillRect(-250, -112, 500, 130);
    rockGfx.fillStyle(0x1a2530, 0.7);
    [[-150, -90, 220, 40], [90, -70, 160, 30], [-60, -50, 140, 28]].forEach(([x, y, w, h]) => {
      rockGfx.fillEllipse(x, y, w, h);
    });
    rockGfx.lineStyle(1, 0x4a5a6a, 0.4);
    [[-250, -44, 250, -60], [-250, -88, 250, -78]].forEach(([x1, y1, x2, y2]) => {
      rockGfx.beginPath(); rockGfx.moveTo(x1, y1); rockGfx.lineTo(x2, y2); rockGfx.strokePath();
    });
    this.overlayContent.add(rockGfx);

    // Poles (the two tent posts)
    const poleL = this.add.rectangle(-140, -6, 4, 160, 0x5a3a1a, 1);
    const poleR = this.add.rectangle(100, -32, 4, 130, 0x5a3a1a, 1);
    const poleLTop = this.add.circle(-140, -88, 3, 0x7a5a2a, 1);
    const poleRTop = this.add.circle(100, -98, 3, 0x7a5a2a, 1);
    this.overlayContent.add([poleL, poleR, poleLTop, poleRTop]);

    // Canvas tent — triangle with sag
    const tarpGfx = this.add.graphics();
    tarpGfx.fillStyle(0x5a6d5a, 0.94);
    tarpGfx.beginPath();
    tarpGfx.moveTo(-140, -88);
    tarpGfx.lineTo(100, -98);
    tarpGfx.lineTo(76, 14);
    tarpGfx.lineTo(-110, 22);
    tarpGfx.closePath();
    tarpGfx.fillPath();
    // Sag line (darker)
    tarpGfx.fillStyle(0x4a5d4a, 0.7);
    tarpGfx.beginPath();
    tarpGfx.moveTo(-140, -88);
    tarpGfx.lineTo(-92, -36);
    tarpGfx.lineTo(-110, 22);
    tarpGfx.closePath();
    tarpGfx.fillPath();
    // Stitch seams
    tarpGfx.lineStyle(1, 0x3a4d3a, 0.7);
    tarpGfx.beginPath(); tarpGfx.moveTo(-140, -88); tarpGfx.lineTo(-110, 22); tarpGfx.strokePath();
    tarpGfx.beginPath(); tarpGfx.moveTo(100, -98); tarpGfx.lineTo(76, 14); tarpGfx.strokePath();
    tarpGfx.beginPath(); tarpGfx.moveTo(-130, -60); tarpGfx.lineTo(94, -70); tarpGfx.strokePath();
    // Rope ties at corners
    tarpGfx.lineStyle(1.5, 0x8a7040, 0.85);
    tarpGfx.beginPath(); tarpGfx.moveTo(-140, -88); tarpGfx.lineTo(-170, -70); tarpGfx.strokePath();
    tarpGfx.beginPath(); tarpGfx.moveTo(100, -98); tarpGfx.lineTo(130, -80); tarpGfx.strokePath();
    this.overlayContent.add(tarpGfx);

    // Wooden crate (below tent, front-right)
    const crateShadow = this.add.ellipse(38, 80, 170, 14, 0x000000, 0.45);
    const crate = this.add.rectangle(38, 46, 160, 74, 0x6c533d, 1).setStrokeStyle(3, 0xd7c59c, 0.28);
    const crateLid = this.add.rectangle(38, 12, 164, 10, 0x4a3420, 1);
    const crateBoardsGfx = this.add.graphics();
    crateBoardsGfx.lineStyle(1, 0x4a3420, 0.7);
    [-42, -10, 22, 54].forEach((x) => {
      crateBoardsGfx.beginPath(); crateBoardsGfx.moveTo(38 + x, 16); crateBoardsGfx.lineTo(38 + x, 78); crateBoardsGfx.strokePath();
    });
    // Crate nails
    const crateNails = this.add.graphics();
    crateNails.fillStyle(0xa0906a, 0.9);
    [[-70, 18], [70, 18], [-70, 74], [70, 74]].forEach(([ox, oy]) => crateNails.fillCircle(38 + ox, oy, 1.8));
    this.overlayContent.add([crateShadow, crate, crateLid, crateBoardsGfx, crateNails]);

    // Items on top of crate (map, bandage, ration, small lantern)
    // Rolled map/chart
    const mapShadow = this.add.ellipse(-30, 14, 78, 8, 0x000000, 0.4);
    const map = this.add.rectangle(-30, 8, 76, 42, 0xd8d0bd, 1).setStrokeStyle(2, 0x7a6a56, 0.45).setAngle(-10);
    const mapRollL = this.add.circle(-66, 12, 5, 0xa89878, 1);
    const mapRollR = this.add.circle(8, 2, 5, 0xa89878, 1);
    // Scribbles on the map (a hint of route)
    const mapInk = this.add.graphics();
    mapInk.lineStyle(1, 0x5a4a3a, 0.7);
    mapInk.beginPath(); mapInk.moveTo(-56, 6); mapInk.lineTo(-34, 2); mapInk.lineTo(-18, 12); mapInk.strokePath();
    // Small N arrow
    mapInk.fillStyle(0x5a4a3a, 0.85);
    mapInk.fillTriangle(-14, -2, -18, 8, -10, 8);
    this.overlayContent.add([mapShadow, map, mapRollL, mapRollR, mapInk]);

    // Rolled bandage (small strip)
    const bandageBase = this.add.rectangle(60, 4, 42, 16, 0xe0ddd0, 1).setStrokeStyle(1, 0xa89878, 0.6).setAngle(8);
    const bandageFold = this.add.line(0, 0, 46, -2, 82, 10, 0xa89878, 0.7).setStrokeStyle(1, 0xa89878, 0.5);
    // Red cross marking
    const bandageCross = this.add.graphics();
    bandageCross.fillStyle(0xa84040, 0.8);
    bandageCross.fillRect(58, -1, 4, 10);
    bandageCross.fillRect(55, 2, 10, 4);
    this.overlayContent.add([bandageBase, bandageFold, bandageCross]);

    // Wrapped ration (paper-tied brick)
    const rationShadow = this.add.ellipse(96, 42, 50, 8, 0x000000, 0.45);
    const ration = this.add.rectangle(96, 38, 42, 24, 0x8f7461, 1).setStrokeStyle(2, 0x5a3a24, 0.7);
    // Twine wrap
    const rationTwine = this.add.graphics();
    rationTwine.lineStyle(1.5, 0x4a3a24, 0.85);
    rationTwine.beginPath(); rationTwine.moveTo(80, 34); rationTwine.lineTo(112, 42); rationTwine.strokePath();
    rationTwine.beginPath(); rationTwine.moveTo(84, 42); rationTwine.lineTo(108, 34); rationTwine.strokePath();
    this.overlayContent.add([rationShadow, ration, rationTwine]);

    // Dim oil lantern
    const lanternGfx = this.add.graphics();
    lanternGfx.fillStyle(0x3a3a28, 1);
    lanternGfx.fillRect(-90, 36, 18, 26);
    lanternGfx.lineStyle(2, 0x8a7040, 0.85);
    lanternGfx.strokeRect(-90, 36, 18, 26);
    // Glass face
    lanternGfx.fillStyle(0x1a1a14, 1);
    lanternGfx.fillRect(-86, 40, 10, 18);
    // Dim wick ember
    lanternGfx.fillStyle(0xd4a060, 0.4);
    lanternGfx.fillCircle(-81, 49, 1.4);
    // Top carry loop
    lanternGfx.lineStyle(1.5, 0x8a7040, 0.85);
    lanternGfx.beginPath(); lanternGfx.arc(-81, 32, 8, Math.PI, 0, false); lanternGfx.strokePath();
    this.overlayContent.add(lanternGfx);

    // If the bay scene is resolved, reveal a paper note on top of the map
    if (hasResolvedBayScene(this.session)) {
      const noteShadow = this.add.rectangle(-20, -4, 78, 48, 0x000000, 0.4);
      const note = this.add.rectangle(-22, -8, 74, 44, 0xf2e8d7, 0.98).setStrokeStyle(1, 0x7a6a56, 0.55).setAngle(-4);
      const noteGlow = this.add.rectangle(-22, -8, 88, 54, 0xe1bb73, 0.12);
      const noteTxt = this.add.text(-22, -8, "«свет будет —\nсев. бухта\nдо рассвета»", {
        fontFamily: "Georgia, serif", fontSize: "9px", color: "#2a1a10", align: "center", lineSpacing: 2,
      }).setOrigin(0.5);
      noteTxt.setAngle(-4);
      this.overlayContent.add([noteShadow, noteGlow, note, noteTxt]);
      this.tweens.add({
        targets: noteGlow, alpha: 0.22, duration: 860, yoyo: true, repeat: -1, ease: "sine.inOut",
      });
    }

    // === Plot twist ===
    // After the player has reported the sabotage, visiting the cache again reveals a
    // hidden compartment under the crate with a photograph + payment chit that expose
    // the keeper himself as "Инсп. VII" — the saboteur.
    if (this.session.beats.sabotageReported && !this.session.beats.keeperExposed) {
      // Hidden compartment hotspot under the crate (floor tile you lift)
      const floorTile = this.add.rectangle(-100, 82, 60, 14, 0x1a2028, 0.94).setStrokeStyle(2, 0xd46462, 0.6);
      const floorTileGlow = this.add.rectangle(-100, 82, 80, 26, 0xd46462, 0.08);
      const floorLabel = this.add.text(-100, 102, "подпол", {
        fontFamily: "monospace", fontSize: "8.5px", color: "#d46462", fontStyle: "italic",
      }).setOrigin(0.5);
      this.overlayContent.add([floorTileGlow, floorTile, floorLabel]);
      this.tweens.add({
        targets: floorTileGlow, alpha: 0.3, duration: 880, yoyo: true, repeat: -1, ease: "sine.inOut",
      });

      this.createOverlayRectHotspot(-100, 82, 100, 40, {
        pointerover: () => floorTile.setStrokeStyle(2, 0xd46462, 1),
        pointerout: () => floorTile.setStrokeStyle(2, 0xd46462, 0.6),
        pointerdown: () => {
          if (this.session.beats.keeperExposed) return;
          this.session.beats.keeperExposed = true;
          // Reveal the evidence
          const photoShadow = this.add.rectangle(4, -16, 116, 88, 0x000000, 0.6);
          const photo = this.add.rectangle(0, -20, 108, 80, 0xa89878, 1).setStrokeStyle(2, 0x5a4a3a, 1).setAngle(-6);
          // Photo content: simplified silhouette of the keeper wearing an "Инсп. VII" badge
          const photoGfx = this.add.graphics();
          photoGfx.fillStyle(0x4a3a2a, 1);
          photoGfx.fillEllipse(-6, -34, 18, 22); // head silhouette (younger keeper)
          photoGfx.fillRect(-16, -22, 22, 28);   // torso
          photoGfx.fillStyle(0x1a120a, 1);
          photoGfx.fillRect(-18, -36, 20, 4);    // hat brim
          // Badge
          photoGfx.fillStyle(0xd7c087, 1);
          photoGfx.fillCircle(8, -16, 5);
          photoGfx.fillStyle(0x2a1a10, 1);
          const badgeText = this.add.text(8, -16, "VII", {
            fontFamily: "monospace", fontSize: "6px", color: "#2a1a10", fontStyle: "bold",
          }).setOrigin(0.5).setAngle(-6);
          // Caption under the photo
          const photoCaption = this.add.text(0, 14, "«Инсп. Вий» · 1985", {
            fontFamily: "Georgia, serif", fontSize: "9px", color: "#3a2a1a", fontStyle: "italic",
          }).setOrigin(0.5).setAngle(-6);
          this.overlayContent.add([photoShadow, photo, photoGfx, badgeText, photoCaption]);

          // Payment chit beside the photo
          const chitShadow = this.add.rectangle(82, 10, 78, 52, 0x000000, 0.5);
          const chit = this.add.rectangle(80, 6, 72, 46, 0xe6ddc4, 1).setStrokeStyle(1, 0x7a6a56, 0.7).setAngle(8);
          const chitText = this.add.text(80, 6, "РАСПИСКА\n\"Керн & Сын\"\n200 р. за услугу", {
            fontFamily: "monospace", fontSize: "7.5px", color: "#3a2a1a", align: "center", lineSpacing: 1,
          }).setOrigin(0.5).setAngle(8);
          this.overlayContent.add([chitShadow, chit, chitText]);

          floorTile.setAlpha(0);
          floorTileGlow.setAlpha(0);
          floorLabel.setAlpha(0);

          this.cameras.main.shake(220, 0.003);
          this.cameras.main.flash(320, 40, 20, 20, true);
          this.emitWorldPulse(6610, 458, { color: 0xd46462, radius: 28, scale: 3.6, duration: 960 });
          this.showNarration("Под ящиком — тайник. Фото молодого «Инсп. Вия» в форме и расписка от судоходной конторы «Керн и Сын». Лицо на фотографии — это смотритель. Он и есть Инсп. VII. Он сам ВЕЛ тебя по следам, которые сам же оставил.");
        },
      });
    }
    // Already exposed — show the revealed evidence permanently
    else if (this.session.beats.keeperExposed) {
      const photo = this.add.rectangle(-100, 76, 70, 54, 0xa89878, 1).setStrokeStyle(2, 0x5a4a3a, 1).setAngle(-6);
      const photoLbl = this.add.text(-100, 108, "Инсп. Вий", {
        fontFamily: "Georgia, serif", fontSize: "9px", color: "#d46462", fontStyle: "italic",
      }).setOrigin(0.5);
      this.overlayContent.add([photo, photoLbl]);
    }

    // Evidence card (right)
    const cardX = 210;
    const card = this.add.rectangle(cardX, -16, 88, 124, 0x1a2028, 0.94).setStrokeStyle(2, 0xd7c59c, 0.4);
    const cardHdr = this.add.rectangle(cardX, -66, 88, 18, 0x2a2418, 0.95);
    const cardHdrTxt = this.add.text(cardX, -66, "ТАЙНИК", {
      fontFamily: "monospace", fontSize: "8.5px", color: "#d7c59c", letterSpacing: 1.5,
    }).setOrigin(0.5);
    const cardLines = [
      "· карта",
      "· бинт",
      "· паёк",
      "· фонарь",
      hasResolvedBayScene(this.session) ? "· записка ✓" : "· ?",
    ];
    cardLines.forEach((t, i) => {
      const line = this.add.text(cardX - 36, -44 + i * 14, t, {
        fontFamily: "monospace", fontSize: "10px", color: "#c8b088",
      }).setOrigin(0, 0.5);
      this.overlayContent.add(line);
    });
    this.overlayContent.add([card, cardHdr, cardHdrTxt]);

    this.showNarration(
      hasResolvedBayScene(this.session)
        ? "Под тентом — сухие карты и записка: «Если свет включится, встречаемся у северной бухты до рассвета». Всё спланировано."
        : "Под тентом спрятаны сухари, бинт, свёрнутая карта и фонарь. Слишком аккуратно для случайной стоянки — осмотри бухту внимательнее."
    );
  }

  openFootprintAnalysisOverlay() {
    this.openOverlay(
      "Следы на камнях",
      "Кликай по каждому валуну, чтобы разобрать улику в крупном плане. Все три соберутся в картину — куда ушёл смотритель.",
      "Кликай по валунам с пульсирующей подсветкой, Esc — закрыть"
    );

    // === Frame / sand-shore backdrop ===
    const frame = this.add.rectangle(0, 10, 560, 270, 0x0a1218, 0.97).setStrokeStyle(2, 0x3a4a52, 0.42);
    // Wet sand ground
    const sandGfx = this.add.graphics();
    sandGfx.fillStyle(0x1c2a30, 1);
    sandGfx.fillRect(-270, -10, 540, 140);
    // Sand texture
    sandGfx.fillStyle(0x2a3a42, 0.4);
    for (let i = 0; i < 40; i += 1) {
      sandGfx.fillCircle(-260 + Math.random() * 520, -5 + Math.random() * 130, 0.6 + Math.random() * 1.2);
    }
    // Damp sheen band
    sandGfx.fillStyle(0x4a7090, 0.1);
    sandGfx.fillRect(-270, 90, 540, 20);
    this.overlayContent.add([frame, sandGfx]);

    // === Three textured boulders ===
    const drawStone = (cx, cy, w, h, rotation) => {
      const g = this.add.graphics();
      g.fillStyle(0x2a3540, 1);
      g.fillEllipse(cx + 4, cy + 5, w, h);  // shadow
      g.fillStyle(0x4a5a64, 1);
      g.fillEllipse(cx, cy, w, h);
      // Darker underside
      g.fillStyle(0x2a3540, 0.7);
      g.fillEllipse(cx, cy + h * 0.22, w * 0.84, h * 0.42);
      // Lighter top
      g.fillStyle(0x7a8894, 0.4);
      g.fillEllipse(cx - w * 0.12, cy - h * 0.28, w * 0.5, h * 0.28);
      // Crack lines
      g.lineStyle(1, 0x1a2028, 0.6);
      g.beginPath();
      g.moveTo(cx - w * 0.3, cy - h * 0.1);
      g.lineTo(cx - w * 0.1, cy + h * 0.15);
      g.lineTo(cx + w * 0.15, cy - h * 0.05);
      g.strokePath();
      // Moss specks
      g.fillStyle(0x5a7a5a, 0.55);
      for (let i = 0; i < 5; i += 1) {
        g.fillCircle(cx + (Math.random() - 0.5) * w * 0.7, cy + (Math.random() - 0.5) * h * 0.5, 0.8 + Math.random() * 1.4);
      }
      return g;
    };
    const stoneA = drawStone(-172, 30, 188, 80);
    const stoneB = drawStone(20, 6, 210, 92);
    const stoneC = drawStone(196, 48, 196, 80);
    this.overlayContent.add([stoneA, stoneB, stoneC]);

    // === Status bar + hint ===
    const statusBand = this.add.rectangle(0, 128, 540, 22, 0x0d1419, 0.95).setStrokeStyle(1, 0x5a7080, 0.35);
    const status = this.add.text(0, 128, "Улик найдено: 0 / 3", {
      fontFamily: "monospace", fontSize: "13px", color: "#d7c087", letterSpacing: 1.5,
    }).setOrigin(0.5);
    this.overlayContent.add([statusBand, status]);

    // Progress pips
    const pips = [];
    for (let i = 0; i < 3; i += 1) {
      const pip = this.add.circle(-220 + i * 16, 128, 4, 0x2a3540, 1).setStrokeStyle(1, 0x5a7080, 0.7);
      pips.push(pip);
      this.overlayContent.add(pip);
    }

    let found = 0;
    const foundSet = new Set();
    const registerClue = (id, message) => {
      if (foundSet.has(id)) return;
      foundSet.add(id);
      found += 1;
      status.setText(`Улик найдено: ${found} / 3`);
      if (pips[found - 1]) {
        pips[found - 1].setFillStyle(0x7de08f, 1);
        pips[found - 1].setStrokeStyle(1, 0x7de08f, 0.9);
      }
      this.showMessage(message);
      if (found === 3) {
        this.session.beats.sabotageFound = true;
        const verdictShadow = this.add.rectangle(0, 168, 520, 34, 0x000000, 0.6);
        const verdictBand = this.add.rectangle(0, 164, 520, 34, 0x2a1410, 0.95).setStrokeStyle(2, 0xd46462, 0.75);
        const finalText = this.add.text(0, 164, "Лебёдка, цепь, засов — всё сломано намеренно. Это не авария, а диверсия.", {
          fontFamily: "Georgia, serif", fontSize: "14px", color: "#f2e8d7", align: "center", wordWrap: { width: 490 },
        }).setOrigin(0.5);
        this.overlayContent.add([verdictShadow, verdictBand, finalText]);
        this.emitWorldPulse(7000, 558, { color: 0xd46462, radius: 24, scale: 3.2, duration: 900 });
        this.cameras.main.shake(200, 0.002);
        this.showNarration("Лебёдка, цепь, засов — всё сломано намеренно. Маяк ослеп не случайно. Смотритель должен это знать.");
      }
    };

    // === Clue 1: Boot print on left stone ===
    const printGlow = this.add.circle(-172, 24, 46, 0xe1bb73, 0.12);
    const printGfx = this.add.graphics();
    // Deep boot impression
    printGfx.fillStyle(0x14181c, 0.85);
    printGfx.fillEllipse(-172, 24, 56, 26);
    printGfx.fillStyle(0x1c2228, 0.95);
    printGfx.fillEllipse(-172, 22, 46, 20);
    // Tread pattern lines
    printGfx.lineStyle(1.2, 0x050808, 0.8);
    for (let i = 0; i < 5; i += 1) {
      const tx = -192 + i * 10;
      printGfx.beginPath(); printGfx.moveTo(tx, 16); printGfx.lineTo(tx + 4, 28); printGfx.strokePath();
    }
    printGfx.lineStyle(1, 0x050808, 0.7);
    printGfx.beginPath(); printGfx.moveTo(-196, 22); printGfx.lineTo(-148, 22); printGfx.strokePath();
    const printLabel = this.add.text(-172, -16, "отпечаток", {
      fontFamily: "monospace", fontSize: "9px", color: "#d7c087",
    }).setOrigin(0.5).setAlpha(0.85);
    this.overlayContent.add([printGlow, printGfx, printLabel]);

    this.createOverlayRectHotspot(-172, 24, 90, 56, {
      pointerover: () => { if (!foundSet.has("print")) printGlow.setFillStyle(0xe1bb73, 0.28); },
      pointerout: () => { if (!foundSet.has("print")) printGlow.setFillStyle(0xe1bb73, 0.12); },
      pointerdown: () => {
        printGlow.setFillStyle(0x7de08f, 0.3);
        printLabel.setColor("#7de08f");
        registerClue("print", "Отпечаток глубокий и свежий. Человек шёл быстро и совсем недавно.");
      },
    });

    // === Clue 2: Cloth scrap on middle stone ===
    const clothGlow = this.add.circle(30, -4, 42, 0xe1bb73, 0.12);
    const clothGfx = this.add.graphics();
    clothGfx.fillStyle(0x8f7461, 0.95);
    // Irregular torn-fabric shape
    clothGfx.beginPath();
    clothGfx.moveTo(10, -14); clothGfx.lineTo(42, -16); clothGfx.lineTo(50, 6);
    clothGfx.lineTo(38, 14); clothGfx.lineTo(16, 8); clothGfx.lineTo(4, -2);
    clothGfx.closePath();
    clothGfx.fillPath();
    // Torn edge (jagged threads)
    clothGfx.lineStyle(1.2, 0x6a5040, 1);
    [[52, 4], [48, 12], [54, 10], [50, 16]].forEach(([ex, ey]) => {
      clothGfx.beginPath(); clothGfx.moveTo(46, 8); clothGfx.lineTo(ex, ey); clothGfx.strokePath();
    });
    // Threading detail
    clothGfx.lineStyle(0.8, 0x6a5040, 0.6);
    clothGfx.beginPath(); clothGfx.moveTo(14, -4); clothGfx.lineTo(46, 2); clothGfx.strokePath();
    clothGfx.beginPath(); clothGfx.moveTo(16, 4); clothGfx.lineTo(44, 10); clothGfx.strokePath();
    const clothLabel = this.add.text(30, -36, "клочок ткани", {
      fontFamily: "monospace", fontSize: "9px", color: "#d7c087",
    }).setOrigin(0.5).setAlpha(0.85);
    this.overlayContent.add([clothGlow, clothGfx, clothLabel]);

    this.createOverlayRectHotspot(28, 0, 84, 60, {
      pointerover: () => { if (!foundSet.has("cloth")) clothGlow.setFillStyle(0xe1bb73, 0.28); },
      pointerout: () => { if (!foundSet.has("cloth")) clothGlow.setFillStyle(0xe1bb73, 0.12); },
      pointerdown: () => {
        clothGlow.setFillStyle(0x7de08f, 0.3);
        clothLabel.setColor("#7de08f");
        registerClue("cloth", "Клочок ткани ещё влажный от солёного ветра. Сорвано со снаряжения совсем недавно.");
      },
    });

    // === Clue 3: Upward trail on right stone ===
    const routeGlow = this.add.circle(200, 44, 50, 0xe1bb73, 0.12);
    const routeGfx = this.add.graphics();
    // Scuff marks trailing upward over the rock
    routeGfx.lineStyle(3, 0x1a2028, 0.8);
    const trail = [
      [156, 60], [168, 48], [184, 38], [198, 28], [214, 18], [232, 8],
    ];
    routeGfx.beginPath();
    routeGfx.moveTo(trail[0][0], trail[0][1]);
    for (let i = 1; i < trail.length; i += 1) routeGfx.lineTo(trail[i][0], trail[i][1]);
    routeGfx.strokePath();
    // Individual scuff dots
    routeGfx.fillStyle(0x0c1218, 0.85);
    trail.forEach(([sx, sy]) => routeGfx.fillCircle(sx, sy, 2.2));
    // Arrow head pointing up-right (toward north)
    routeGfx.fillStyle(0xc8e3ea, 0.9);
    routeGfx.fillTriangle(244, 2, 236, 12, 248, 14);
    const routeLabel = this.add.text(200, 86, "следы уходят вверх", {
      fontFamily: "monospace", fontSize: "9px", color: "#d7c087",
    }).setOrigin(0.5).setAlpha(0.85);
    this.overlayContent.add([routeGlow, routeGfx, routeLabel]);

    this.createOverlayRectHotspot(200, 38, 110, 70, {
      pointerover: () => { if (!foundSet.has("route")) routeGlow.setFillStyle(0xe1bb73, 0.28); },
      pointerout: () => { if (!foundSet.has("route")) routeGlow.setFillStyle(0xe1bb73, 0.12); },
      pointerdown: () => {
        routeGlow.setFillStyle(0x7de08f, 0.3);
        routeLabel.setColor("#7de08f");
        registerClue("route", "Следы уходят вверх по сухой кромке скалы. Путь ведёт к северной бухте.");
      },
    });

    this.tweens.add({
      targets: [printGlow, clothGlow, routeGlow],
      alpha: 0.32,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  openValvePanelOverlay() {
    this.openOverlay(
      "Клапанный узел",
      "Три вентиля управляют давлением. Обводной контур разгружается первым, магистраль открывается последней — иначе сорвёт предохранитель."
    );

    if (this.session.serviceProgress.valveSolved) {
      const done = this.add.text(0, 18, "Давление выровнено. Вентиляционный канал открыт.", {
        fontFamily: "Georgia, serif", fontSize: "20px", color: "#95d6a2", align: "center", wordWrap: { width: 440 },
      }).setOrigin(0.5);
      this.overlayContent.add(done);
      this.syncHud();
      return;
    }

    // === Frame ===
    const frame = this.add.rectangle(0, 10, 520, 260, 0x1a2930, 0.96).setStrokeStyle(2, 0x6a8a96, 0.42);
    const frameInner = this.add.rectangle(0, 10, 500, 240, 0x101a20, 0.55).setStrokeStyle(1, 0x3d5a66, 0.4);
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x2a4050, 0.22);
    for (let gx = -240; gx <= 240; gx += 30) {
      grid.beginPath(); grid.moveTo(gx, -108); grid.lineTo(gx, 128); grid.strokePath();
    }
    for (let gy = -100; gy <= 120; gy += 30) {
      grid.beginPath(); grid.moveTo(-248, gy); grid.lineTo(248, gy); grid.strokePath();
    }
    this.overlayContent.add([frame, frameInner, grid]);

    // === LED pressure column (left) ===
    const ledX = -220;
    const ledBaseY = 46;
    const ledHousing = this.add.rectangle(ledX, ledBaseY - 38, 28, 180, 0x0c1620, 1)
      .setStrokeStyle(2, 0x5a7a88, 0.55);
    const ledTitle = this.add.text(ledX, ledBaseY - 140, "ДАВЛ", {
      fontFamily: "monospace", fontSize: "9px", color: "#d7c087",
    }).setOrigin(0.5);
    const ledScale = this.add.text(ledX + 22, ledBaseY - 112, "кПа", {
      fontFamily: "monospace", fontSize: "8px", color: "#6a8a96",
    }).setOrigin(0, 0.5);
    const leds = [];
    for (let i = 0; i < 6; i += 1) {
      const y = ledBaseY + 36 - i * 24;
      const shell = this.add.circle(ledX, y, 7, 0x1a2328, 1).setStrokeStyle(2, 0x45596a, 0.55);
      const core = this.add.circle(ledX, y, 4.5, 0x213138, 1);
      leds.push({ shell, core });
      this.overlayContent.add([shell, core]);
    }
    this.overlayContent.add([ledHousing, ledTitle, ledScale]);

    // === Pipe network ===
    const pipeGfx = this.add.graphics();
    const drawPipeSeg = (x, y, w, h) => {
      pipeGfx.fillStyle(0x2d4552, 1); pipeGfx.fillRect(x, y, w, h);
      pipeGfx.lineStyle(2, 0x5a7a88, 0.9); pipeGfx.strokeRect(x, y, w, h);
      pipeGfx.fillStyle(0x8aacba, 0.22); pipeGfx.fillRect(x, y + 2, w, 3);
    };
    // Main header
    drawPipeSeg(-170, -4, 340, 16);
    // Left feed (from LED column to header)
    drawPipeSeg(-208, -4, 40, 16);
    // Right exit (to "вентиляц. канал")
    drawPipeSeg(170, -4, 58, 16);
    const valveData = [
      { id: "А", x: -128, role: "разгрузка" },
      { id: "Б", x: -22,  role: "обвод" },
      { id: "В", x: 84,   role: "подача" },
    ];
    // Vertical branches
    valveData.forEach((v) => drawPipeSeg(v.x - 6, 12, 12, 30));
    // Exit label
    const exitLabel = this.add.text(230, -4, "→", {
      fontFamily: "monospace", fontSize: "14px", color: "#8aacba",
    }).setOrigin(0.5);
    const exitCap = this.add.text(230, 14, "канал", {
      fontFamily: "monospace", fontSize: "8px", color: "#6a8a96",
    }).setOrigin(0.5);
    this.overlayContent.add([pipeGfx, exitLabel, exitCap]);

    // Flow arrows (revealed on solve)
    const flowArrows = this.add.graphics();
    this.overlayContent.add(flowArrows);

    // === Valves ===
    const CORRECT = ["Б", "А", "В"];
    const opened = [];
    const states = { А: false, Б: false, В: false };
    const wheels = {};
    const BASE_Y = 58;

    valveData.forEach((v) => {
      const outer = this.add.circle(v.x, BASE_Y, 22, 0x2a3d48, 1).setStrokeStyle(3, 0x8aacba, 0.55);
      const spoke1 = this.add.rectangle(v.x, BASE_Y, 4, 36, 0xd7c087, 0.95);
      const spoke2 = this.add.rectangle(v.x, BASE_Y, 36, 4, 0xd7c087, 0.95);
      const hub = this.add.circle(v.x, BASE_Y, 5, 0x24333c, 1).setStrokeStyle(2, 0xe1bb73, 0.85);
      const lbl = this.add.text(v.x, BASE_Y + 36, v.id, {
        fontFamily: "Georgia, serif", fontSize: "18px", color: "#dce6e9",
      }).setOrigin(0.5);
      const statusDot = this.add.circle(v.x, BASE_Y - 34, 3.5, 0x3d4a52, 1);
      this.overlayContent.add([outer, spoke1, spoke2, hub, lbl, statusDot]);
      wheels[v.id] = { outer, spoke1, spoke2, statusDot };

      this.createOverlayRectHotspot(v.x, BASE_Y, 54, 60, {
        pointerover: () => { if (!states[v.id]) outer.setStrokeStyle(3, 0xe1bb73, 0.9); },
        pointerout: () => { if (!states[v.id]) outer.setStrokeStyle(3, 0x8aacba, 0.55); },
        pointerdown: () => {
          if (states[v.id]) { this.showMessage(`Вентиль ${v.id} уже открыт.`); return; }
          if (v.id !== CORRECT[opened.length]) {
            // Soft reset: blink red, return spokes to 0°
            Object.keys(states).forEach((k) => { states[k] = false; });
            opened.length = 0;
            valveData.forEach((vv) => {
              const w = wheels[vv.id];
              this.tweens.add({ targets: [w.spoke1, w.spoke2], angle: 0, duration: 220, ease: "quad.out" });
              w.outer.setStrokeStyle(3, 0x8aacba, 0.55);
              w.statusDot.setFillStyle(0x3d4a52, 1);
            });
            leds.forEach(({ core }) => {
              core.setFillStyle(0xd46462, 1);
              this.tweens.add({
                targets: core, alpha: 0.25, duration: 130, yoyo: true, repeat: 2,
                onComplete: () => { core.setFillStyle(0x213138, 1); core.setAlpha(1); },
              });
            });
            flowArrows.clear();
            this.cameras.main.shake(80, 0.0012);
            this.showMessage("Предохранитель сбросил давление. Начни заново.");
            return;
          }
          // Correct click
          states[v.id] = true;
          opened.push(v.id);
          const w = wheels[v.id];
          this.tweens.add({ targets: [w.spoke1, w.spoke2], angle: 90, duration: 280, ease: "back.out" });
          w.outer.setStrokeStyle(3, 0x7de08f, 0.9);
          w.statusDot.setFillStyle(0x7de08f, 1);
          // Fill LEDs up to level
          const fillTo = opened.length * 2;
          for (let i = 0; i < fillTo && i < leds.length; i += 1) {
            leds[i].core.setFillStyle(0x7de08f, 1);
            leds[i].shell.setStrokeStyle(2, 0x7de08f, 0.7);
          }
          this.showMessage(`Вентиль ${v.id} (${v.role}) открыт. ${opened.length}/3`);
          if (opened.length === 3) {
            playPreviewWorldCue("generator");
            leds.forEach(({ core, shell }) => {
              core.setFillStyle(0x7de08f, 1);
              shell.setStrokeStyle(2, 0x7de08f, 0.8);
            });
            // Flow arrows on main pipe
            flowArrows.lineStyle(2, 0x7de08f, 0.95);
            [-120, -60, 0, 60, 120, 190].forEach((ax) => {
              flowArrows.beginPath();
              flowArrows.moveTo(ax - 5, 4); flowArrows.lineTo(ax + 5, 4); flowArrows.strokePath();
              flowArrows.beginPath();
              flowArrows.moveTo(ax + 1, 0); flowArrows.lineTo(ax + 5, 4); flowArrows.lineTo(ax + 1, 8); flowArrows.strokePath();
            });
            this.tweens.add({
              targets: flowArrows, alpha: 0.55, duration: 620, yoyo: true, repeat: -1, ease: "sine.inOut",
            });
            this.session.serviceProgress.valveSolved = true;
            this.cameras.main.shake(140, 0.0018);
            this.emitWorldPulse(1221, 492, { color: 0x7de08f, radius: 20, scale: 2.6, duration: 720 });
            this.showNarration("Давление выровнялось. За панелью — замусоленная бирка: «Последнее обслуж.: 3 суток назад. Исп.: Инсп. VII». Вентили стояли в нерабочем положении — намеренно.");
          }
        },
      });
    });

    // === Service card (right) ===
    const cardX = 186;
    const card = this.add.rectangle(cardX, -16, 112, 148, 0x1c2a34, 0.94).setStrokeStyle(2, 0xd7c087, 0.4);
    const cardStrip = this.add.rectangle(cardX, -74, 112, 22, 0x2a3a44, 0.9);
    const cardTitle = this.add.text(cardX, -74, "СЛУЖЕБНАЯ КАРТА", {
      fontFamily: "monospace", fontSize: "8.5px", color: "#d7c087", letterSpacing: 1,
    }).setOrigin(0.5);
    const cardLines = [
      { t: "① Б  обвод",   y: -48 },
      { t: "② А  разгруз.", y: -24 },
      { t: "③ В  подача",  y:  -0 },
    ];
    cardLines.forEach((line) => {
      const txt = this.add.text(cardX - 46, line.y, line.t, {
        fontFamily: "monospace", fontSize: "11px", color: "#9ab8c4",
      }).setOrigin(0, 0.5);
      this.overlayContent.add(txt);
    });
    const cardRule = this.add.rectangle(cardX, 24, 90, 1, 0x5a7a88, 0.5);
    const cardNote = this.add.text(cardX, 38, "P < 120 кПа\nдо подачи", {
      fontFamily: "monospace", fontSize: "9px", color: "#7a9aaa", align: "center", lineSpacing: 2,
    }).setOrigin(0.5);
    const cardSig = this.add.text(cardX, 58, "— Инсп. VII", {
      fontFamily: "Georgia, serif", fontSize: "10px", color: "#b29a6a", fontStyle: "italic",
    }).setOrigin(0.5);
    this.overlayContent.add([card, cardStrip, cardTitle, cardRule, cardNote, cardSig]);

    const hint = this.add.text(0, 132, "Кликай вентили в порядке из служебной карточки справа.", {
      fontFamily: "Georgia, serif", fontSize: "14px", color: "#7a9aaa", align: "center",
    }).setOrigin(0.5);
    this.overlayContent.add(hint);

    this.syncHud();
  }

  openCipherLockOverlay() {
    this.openOverlay(
      "Кодовый замок",
      "На стене рядом с замком выбиты римские цифры — рукой предыдущего смотрителя. Прокрути диски, чтобы выставить код."
    );

    if (this.session.tunnelProgress.cipherSolved) {
      const done = this.add.text(0, 18, "Замок открыт. За дверцей — запечатанный рапорт с печатью смотрителя.", {
        fontFamily: "Georgia, serif", fontSize: "20px", color: "#95d6a2", align: "center", wordWrap: { width: 440 },
      }).setOrigin(0.5);
      this.overlayContent.add(done);
      this.syncHud();
      return;
    }

    const TARGET = [3, 7, 1];
    const vals = [0, 0, 0];

    // === Frame ===
    const frame = this.add.rectangle(0, 10, 520, 260, 0x141a20, 0.97).setStrokeStyle(2, 0x5a7a88, 0.5);
    const frameInner = this.add.rectangle(0, 10, 500, 240, 0x0c1218, 0.6).setStrokeStyle(1, 0x3d5a66, 0.35);
    this.overlayContent.add([frame, frameInner]);

    // === Stone plaque (left) ===
    const plaqueX = -172;
    const plaqueY = -6;
    const plaqueShadow = this.add.rectangle(plaqueX + 4, plaqueY + 6, 130, 152, 0x000000, 0.35);
    const plaqueBase = this.add.rectangle(plaqueX, plaqueY, 130, 152, 0x3a3730, 1).setStrokeStyle(3, 0x1a1a18, 0.9);
    const plaqueInner = this.add.rectangle(plaqueX, plaqueY, 116, 138, 0x4a4638, 1);
    // Chiseled texture — irregular streaks
    const chiselGfx = this.add.graphics();
    chiselGfx.lineStyle(1, 0x2a2620, 0.35);
    [-48, -22, 4, 28, 52].forEach((ox) => {
      chiselGfx.beginPath();
      chiselGfx.moveTo(plaqueX - 46 + ox * 0.2, plaqueY - 60);
      chiselGfx.lineTo(plaqueX - 40 + ox * 0.2, plaqueY + 60);
      chiselGfx.strokePath();
    });
    chiselGfx.lineStyle(1, 0x7a6c52, 0.18);
    for (let i = 0; i < 14; i += 1) {
      const x = plaqueX - 50 + Math.random() * 100;
      const y = plaqueY - 60 + Math.random() * 120;
      chiselGfx.beginPath();
      chiselGfx.moveTo(x, y); chiselGfx.lineTo(x + 3 + Math.random() * 6, y + 1);
      chiselGfx.strokePath();
    }
    const plaqueHeader = this.add.text(plaqueX, plaqueY - 52, "ВЫБИТО НА СТЕНЕ", {
      fontFamily: "monospace", fontSize: "8.5px", color: "#d7c087", letterSpacing: 1,
    }).setOrigin(0.5);
    // Engraved roman numerals: double layer (shadow + lighter) for carved effect
    const clueShadow = this.add.text(plaqueX + 1, plaqueY - 14 + 1, "III · VII · I", {
      fontFamily: "Georgia, serif", fontSize: "26px", color: "#1a1814", fontStyle: "bold",
    }).setOrigin(0.5);
    const clue = this.add.text(plaqueX, plaqueY - 14, "III · VII · I", {
      fontFamily: "Georgia, serif", fontSize: "26px", color: "#e8dcc0", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.88);
    const clueDivider = this.add.rectangle(plaqueX, plaqueY + 18, 90, 1, 0x7a6c52, 0.5);
    const clueDate = this.add.text(plaqueX, plaqueY + 32, "03 · 07 · 01", {
      fontFamily: "monospace", fontSize: "10px", color: "#9a8c72",
    }).setOrigin(0.5);
    const clueSig = this.add.text(plaqueX, plaqueY + 52, "— рук. смотр.", {
      fontFamily: "Georgia, serif", fontSize: "9.5px", color: "#8a7c62", fontStyle: "italic",
    }).setOrigin(0.5);
    this.overlayContent.add([
      plaqueShadow, plaqueBase, plaqueInner, chiselGfx,
      plaqueHeader, clueShadow, clue, clueDivider, clueDate, clueSig,
    ]);

    // === Dials (right side) ===
    const dialX = [24, 94, 164];
    const dialY = -4;
    const dialObjs = [];
    const digitTexts = [];
    const digitPrevTexts = [];
    const digitNextTexts = [];

    // Brass back plate
    const brassPlate = this.add.rectangle(94, dialY, 220, 120, 0x1f2a32, 0.9).setStrokeStyle(2, 0xd7c087, 0.5);
    const brassStrip = this.add.rectangle(94, dialY - 44, 220, 10, 0xd7c087, 0.14);
    const brassStripBtm = this.add.rectangle(94, dialY + 44, 220, 10, 0xd7c087, 0.14);
    this.overlayContent.add([brassPlate, brassStrip, brassStripBtm]);

    dialX.forEach((dx, i) => {
      const housing = this.add.rectangle(dx, dialY, 54, 92, 0x243039, 1).setStrokeStyle(3, 0xd7c087, 0.42);
      const window_ = this.add.rectangle(dx, dialY, 42, 70, 0x050a0e, 1).setStrokeStyle(2, 0x5ab4c8, 0.55);
      // Drum digits: prev (top, dim), current (center, bright), next (bottom, dim)
      const digitPrev = this.add.text(dx, dialY - 22, "9", {
        fontFamily: "monospace", fontSize: "16px", color: "#3a5a68",
      }).setOrigin(0.5).setAlpha(0.5);
      const digit = this.add.text(dx, dialY, "0", {
        fontFamily: "monospace", fontSize: "28px", color: "#a4dde8", fontStyle: "bold",
      }).setOrigin(0.5);
      const digitNext = this.add.text(dx, dialY + 22, "1", {
        fontFamily: "monospace", fontSize: "16px", color: "#3a5a68",
      }).setOrigin(0.5).setAlpha(0.5);
      // Horizontal separators
      const sepTop = this.add.rectangle(dx, dialY - 12, 42, 1, 0x5ab4c8, 0.35);
      const sepBtm = this.add.rectangle(dx, dialY + 12, 42, 1, 0x5ab4c8, 0.35);
      // Up/down triangles
      const btnUp = this.add.triangle(dx, dialY - 52, -10, 6, 10, 6, 0, -6, 0xd7c087, 0.75);
      const btnDn = this.add.triangle(dx, dialY + 52, -10, -6, 10, -6, 0, 6, 0xd7c087, 0.75);
      this.overlayContent.add([housing, window_, sepTop, sepBtm, digitPrev, digit, digitNext, btnUp, btnDn]);
      dialObjs.push(housing);
      digitTexts.push(digit);
      digitPrevTexts.push(digitPrev);
      digitNextTexts.push(digitNext);

      const updateDigitsFor = (direction) => {
        const v = vals[i];
        const prev = (v + 9) % 10;
        const next = (v + 1) % 10;
        digit.setText(String(v));
        digitPrev.setText(String(prev));
        digitNext.setText(String(next));
        // Scroll animation
        const dy = direction === "up" ? -14 : 14;
        this.tweens.add({
          targets: [digit, digitPrev, digitNext],
          y: `+=${dy}`, duration: 110, ease: "quad.out", yoyo: false,
          onComplete: () => {
            digit.setY(dialY);
            digitPrev.setY(dialY - 22);
            digitNext.setY(dialY + 22);
          },
        });
      };

      this.createOverlayRectHotspot(dx, dialY - 52, 44, 26, {
        pointerover: () => { btnUp.setAlpha(1); btnUp.setScale(1.1); },
        pointerout: () => { btnUp.setAlpha(0.75); btnUp.setScale(1); },
        pointerdown: () => { vals[i] = (vals[i] + 1) % 10; updateDigitsFor("up"); },
      });
      this.createOverlayRectHotspot(dx, dialY + 52, 44, 26, {
        pointerover: () => { btnDn.setAlpha(1); btnDn.setScale(1.1); },
        pointerout: () => { btnDn.setAlpha(0.75); btnDn.setScale(1); },
        pointerdown: () => { vals[i] = (vals[i] + 9) % 10; updateDigitsFor("down"); },
      });
    });

    // === Confirm button ===
    const confirmY = 92;
    const confirmBtn = this.add.rectangle(94, confirmY, 180, 36, 0x1f2a32, 1).setStrokeStyle(2, 0xd7c087, 0.55);
    const confirmGlow = this.add.rectangle(94, confirmY, 180, 36, 0xd7c087, 0);
    const confirmTxt = this.add.text(94, confirmY, "ОТКРЫТЬ", {
      fontFamily: "monospace", fontSize: "14px", color: "#f2e8d7", letterSpacing: 2,
    }).setOrigin(0.5);
    this.overlayContent.add([confirmGlow, confirmBtn, confirmTxt]);

    this.createOverlayRectHotspot(94, confirmY, 180, 36, {
      pointerover: () => confirmBtn.setStrokeStyle(2, 0xe1bb73, 0.95),
      pointerout: () => confirmBtn.setStrokeStyle(2, 0xd7c087, 0.55),
      pointerdown: () => {
        if (vals[0] === TARGET[0] && vals[1] === TARGET[1] && vals[2] === TARGET[2]) {
          this.session.tunnelProgress.cipherSolved = true;
          playPreviewWorldCue("unlock");
          dialObjs.forEach((d) => d.setStrokeStyle(3, 0x7de08f, 0.85));
          digitTexts.forEach((d) => d.setColor("#b6f1c4"));
          confirmBtn.setStrokeStyle(3, 0x7de08f, 0.9);
          confirmGlow.setFillStyle(0x7de08f, 0.18);
          this.tweens.add({
            targets: confirmGlow, alpha: 0.5, duration: 380, yoyo: true, repeat: 1, ease: "sine.inOut",
          });
          this.cameras.main.shake(120, 0.0016);
          this.emitWorldPulse(3075, 472, { color: 0xd7c087, radius: 18, scale: 2.8, duration: 760 });
          this.showNarration("Замок щёлкает. Внутри — опечатанный рапорт: «Объект задокументирован. Источник света ликвидирован на 30 суток. Цель: корректировка судоходного маршрута». Это уже не авария.");
        } else {
          this.cameras.main.shake(80, 0.001);
          this.tweens.add({
            targets: [dialObjs[0], dialObjs[1], dialObjs[2]], x: `+=3`, duration: 40, yoyo: true, repeat: 2,
          });
          this.showMessage("Неверная комбинация. Подсказка выбита на плите слева.");
        }
      },
    });

    const hint = this.add.text(0, 132, "▲▼ — прокрутить диски  ·  ОТКРЫТЬ — проверить код", {
      fontFamily: "monospace", fontSize: "10px", color: "#5a7a88",
    }).setOrigin(0.5);
    this.overlayContent.add(hint);

    this.syncHud();
  }

  openNauticalChartOverlay() {
    this.openOverlay(
      "Навигационная карта",
      "Старая карта острова с отметками. Три из них совпадают со следами, которые ты уже видел в подземелье. Отметь их."
    );

    if (this.session.bayProgress.chartSolved) {
      const done = this.add.text(0, 18, "Маршрут прочитан. Кто-то планировал уйти по северному фарватеру — прямо мимо маяка.", {
        fontFamily: "Georgia, serif", fontSize: "19px", color: "#95d6a2", align: "center", wordWrap: { width: 460 },
      }).setOrigin(0.5);
      this.overlayContent.add(done);
      this.syncHud();
      return;
    }

    // === Paper (drawn with grain, folds) ===
    const paper = this.add.rectangle(0, 10, 520, 260, 0xd8d0bd, 0.95).setStrokeStyle(3, 0x7a6a56, 0.55);
    const paperInner = this.add.rectangle(0, 10, 504, 244, 0xe6ddc4, 0.42);
    const grainGfx = this.add.graphics();
    grainGfx.fillStyle(0x8a7560, 0.06);
    for (let i = 0; i < 40; i += 1) {
      grainGfx.fillCircle(-250 + Math.random() * 500, -110 + Math.random() * 240, 1 + Math.random() * 1.4);
    }
    // Fold crease (diagonal)
    grainGfx.lineStyle(1, 0x7a6a56, 0.18);
    grainGfx.beginPath(); grainGfx.moveTo(-250, -40); grainGfx.lineTo(250, -60); grainGfx.strokePath();
    grainGfx.beginPath(); grainGfx.moveTo(-250, 60); grainGfx.lineTo(250, 40); grainGfx.strokePath();
    this.overlayContent.add([paper, paperInner, grainGfx]);

    // === Latitude/longitude grid ===
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, 0x7a6a56, 0.22);
    for (let gx = -230; gx <= 230; gx += 46) {
      gridGfx.beginPath(); gridGfx.moveTo(gx, -108); gridGfx.lineTo(gx, 128); gridGfx.strokePath();
    }
    for (let gy = -100; gy <= 120; gy += 36) {
      gridGfx.beginPath(); gridGfx.moveTo(-248, gy); gridGfx.lineTo(248, gy); gridGfx.strokePath();
    }
    this.overlayContent.add(gridGfx);

    // Coordinate tick labels (very subtle)
    ["54°", "55°", "56°"].forEach((lbl, i) => {
      this.overlayContent.add(
        this.add.text(-236, -64 + i * 56, lbl, {
          fontFamily: "monospace", fontSize: "7.5px", color: "#7a6a56",
        }).setOrigin(0.5).setAlpha(0.55)
      );
    });
    ["18′", "22′", "26′", "30′"].forEach((lbl, i) => {
      this.overlayContent.add(
        this.add.text(-184 + i * 92, 122, lbl, {
          fontFamily: "monospace", fontSize: "7.5px", color: "#7a6a56",
        }).setOrigin(0.5).setAlpha(0.55)
      );
    });

    // === Coastline (hand-drawn) ===
    const coastGfx = this.add.graphics();
    coastGfx.lineStyle(2, 0x5a4a3a, 0.72);
    coastGfx.beginPath();
    const shore = [
      [-240, -30], [-210, -46], [-178, -38], [-152, -54],
      [-118, -40], [-96, -28], [-62, -44], [-22, -30],
      [18, -52], [60, -28], [96, -44], [130, -22],
      [170, -38], [210, -18], [234, -40],
    ];
    coastGfx.moveTo(shore[0][0], shore[0][1]);
    for (let i = 1; i < shore.length; i += 1) {
      coastGfx.lineTo(shore[i][0], shore[i][1]);
    }
    coastGfx.strokePath();
    // Inland wash (sepia)
    coastGfx.fillStyle(0xb8a078, 0.12);
    coastGfx.beginPath();
    coastGfx.moveTo(-250, -108); coastGfx.lineTo(250, -108); coastGfx.lineTo(shore[shore.length - 1][0], shore[shore.length - 1][1]);
    for (let i = shore.length - 2; i >= 0; i -= 1) {
      coastGfx.lineTo(shore[i][0], shore[i][1]);
    }
    coastGfx.closePath(); coastGfx.fillPath();
    // Sea wave hints (below shore)
    coastGfx.lineStyle(1, 0x4a7090, 0.38);
    for (let i = 0; i < 4; i += 1) {
      const y = 14 + i * 22;
      for (let j = 0; j < 9; j += 1) {
        const ox = -220 + j * 54;
        coastGfx.beginPath();
        coastGfx.arc(ox, y, 6, Math.PI, 0, false);
        coastGfx.strokePath();
      }
    }
    // Shoals dots near the correct route area
    coastGfx.fillStyle(0x5a4a3a, 0.4);
    [[-130, 48], [-80, 72], [-20, 56], [40, 78], [100, 52]].forEach(([x, y]) => {
      coastGfx.fillCircle(x, y, 1.5);
    });
    // Lighthouse icon (top center — the tower itself)
    coastGfx.fillStyle(0x7a5a3a, 0.85);
    coastGfx.fillTriangle(-6, -76, 6, -76, 0, -92);
    coastGfx.fillRect(-4, -76, 8, 10);
    coastGfx.lineStyle(1, 0xe1a84a, 0.85);
    coastGfx.beginPath(); coastGfx.arc(0, -88, 10, Math.PI + 0.4, -0.4, false); coastGfx.strokePath();
    this.overlayContent.add(coastGfx);

    const lighthouseLbl = this.add.text(0, -100, "МАЯК", {
      fontFamily: "monospace", fontSize: "8px", color: "#5a4a3a",
    }).setOrigin(0.5).setAlpha(0.75);
    this.overlayContent.add(lighthouseLbl);

    // === Compass rose (top-right) ===
    const roseX = 210;
    const roseY = -78;
    const roseGfx = this.add.graphics();
    roseGfx.lineStyle(1, 0x5a4a3a, 0.7);
    roseGfx.strokeCircle(roseX, roseY, 20);
    roseGfx.strokeCircle(roseX, roseY, 13);
    roseGfx.fillStyle(0x7a5a3a, 0.85);
    // N (up, solid)
    roseGfx.fillTriangle(roseX, roseY - 22, roseX - 5, roseY, roseX + 5, roseY);
    // S, E, W (smaller, hollow strokes)
    roseGfx.lineStyle(1.5, 0x5a4a3a, 0.85);
    roseGfx.beginPath(); roseGfx.moveTo(roseX - 5, roseY); roseGfx.lineTo(roseX, roseY + 22); roseGfx.lineTo(roseX + 5, roseY); roseGfx.strokePath();
    roseGfx.beginPath(); roseGfx.moveTo(roseX, roseY - 5); roseGfx.lineTo(roseX + 22, roseY); roseGfx.lineTo(roseX, roseY + 5); roseGfx.strokePath();
    roseGfx.beginPath(); roseGfx.moveTo(roseX, roseY - 5); roseGfx.lineTo(roseX - 22, roseY); roseGfx.lineTo(roseX, roseY + 5); roseGfx.strokePath();
    this.overlayContent.add(roseGfx);
    const roseN = this.add.text(roseX, roseY - 30, "С", { fontFamily: "Georgia, serif", fontSize: "11px", color: "#5a4a3a", fontStyle: "bold" }).setOrigin(0.5);
    this.overlayContent.add(roseN);

    // === Legend strip (bottom) ===
    const legendStrip = this.add.rectangle(0, 118, 504, 22, 0xb8a078, 0.28);
    const legendTxt = this.add.text(-244, 118, "карта сев. фарватера  ·  рук. предыд. смотрителя", {
      fontFamily: "monospace", fontSize: "9px", color: "#5a4a3a",
    }).setOrigin(0, 0.5);
    const legendTxtR = this.add.text(244, 118, "масштаб 1 : 2000", {
      fontFamily: "monospace", fontSize: "9px", color: "#5a4a3a",
    }).setOrigin(1, 0.5);
    this.overlayContent.add([legendStrip, legendTxt, legendTxtR]);

    // === Markers ===
    const markers = [
      { id: "campfire", x: -168, y: -26, kind: "fire",   label: "Каменный круг",     correct: true },
      { id: "rope",     x:  -48, y:  34, kind: "anchor", label: "Крюк и трос",       correct: true },
      { id: "prints",   x:  100, y: -28, kind: "steps",  label: "Цепочка следов",    correct: true },
      { id: "decoy",    x:  188, y:  50, kind: "cross",  label: "Старый ориентир",   correct: false },
    ];

    const marked = new Set();
    const correctMarked = [];

    const drawMarkerIcon = (gfx, kind, x, y, color) => {
      gfx.fillStyle(color, 1);
      gfx.lineStyle(1.4, color, 1);
      if (kind === "fire") {
        gfx.fillTriangle(x, y - 9, x - 6, y + 5, x + 6, y + 5);
        gfx.fillStyle(0xe1a84a, 0.65);
        gfx.fillTriangle(x, y - 4, x - 3, y + 4, x + 3, y + 4);
        gfx.lineStyle(1, color, 1);
        gfx.beginPath(); gfx.moveTo(x - 8, y + 7); gfx.lineTo(x + 8, y + 7); gfx.strokePath();
      } else if (kind === "anchor") {
        gfx.beginPath(); gfx.moveTo(x, y - 10); gfx.lineTo(x, y + 7); gfx.strokePath();
        gfx.beginPath(); gfx.arc(x, y + 7, 8, 0.1, Math.PI - 0.1, false); gfx.strokePath();
        gfx.beginPath(); gfx.moveTo(x - 5, y - 7); gfx.lineTo(x + 5, y - 7); gfx.strokePath();
        gfx.fillCircle(x, y - 10, 1.8);
      } else if (kind === "steps") {
        gfx.fillStyle(color, 0.92);
        [-4, 3].forEach((ox, i) => {
          gfx.fillEllipse(x + ox, y - 4 + i * 8, 5, 8);
        });
      } else if (kind === "cross") {
        gfx.lineStyle(2, color, 1);
        gfx.beginPath(); gfx.moveTo(x - 6, y - 6); gfx.lineTo(x + 6, y + 6); gfx.strokePath();
        gfx.beginPath(); gfx.moveTo(x + 6, y - 6); gfx.lineTo(x - 6, y + 6); gfx.strokePath();
      }
    };

    const routeGfx = this.add.graphics().setAlpha(0);
    this.overlayContent.add(routeGfx);

    markers.forEach((m) => {
      const pinShadow = this.add.circle(m.x + 1, m.y + 2, 18, 0x000000, 0.25);
      const pinBg = this.add.circle(m.x, m.y, 17, 0xf5ede0, 0.96).setStrokeStyle(2, 0x7a6a56, 0.7);
      const pinGlow = this.add.circle(m.x, m.y, 26, 0xe1bb73, 0);
      const iconGfx = this.add.graphics();
      drawMarkerIcon(iconGfx, m.kind, m.x, m.y, 0x5a3a24);
      this.overlayContent.add([pinShadow, pinBg, pinGlow, iconGfx]);

      // Label hidden by default, revealed on hover
      const lbl = this.add.text(m.x, m.y + 30, m.label, {
        fontFamily: "Georgia, serif", fontSize: "10px", color: "#4a3a2a",
        backgroundColor: "#e6ddc4", padding: { left: 4, right: 4, top: 1, bottom: 1 },
      }).setOrigin(0.5).setAlpha(0);
      this.overlayContent.add(lbl);

      this.createOverlayRectHotspot(m.x, m.y, 44, 44, {
        pointerover: () => {
          if (!marked.has(m.id)) { pinGlow.setFillStyle(0xe1bb73, 0.22); pinBg.setStrokeStyle(2, 0xe1a84a, 0.95); }
          lbl.setAlpha(0.95);
        },
        pointerout: () => {
          if (!marked.has(m.id)) { pinGlow.setFillStyle(0xe1bb73, 0); pinBg.setStrokeStyle(2, 0x7a6a56, 0.7); }
          lbl.setAlpha(0);
        },
        pointerdown: () => {
          if (marked.has(m.id)) return;
          if (!m.correct) {
            this.cameras.main.shake(60, 0.001);
            pinBg.setFillStyle(0xd46462, 0.45);
            this.tweens.add({
              targets: pinBg, alpha: 0.55, duration: 180, yoyo: true,
              onComplete: () => { pinBg.setFillStyle(0xf5ede0, 0.96); pinBg.setAlpha(0.96); },
            });
            this.showMessage("Эта отметка не связана со следами в подземелье. Ищи то, что видел сам.");
            return;
          }
          marked.add(m.id);
          correctMarked.push({ x: m.x, y: m.y });
          pinBg.setFillStyle(0x95d6a2, 0.88);
          pinBg.setStrokeStyle(2, 0x4aacbf, 0.9);
          pinGlow.setFillStyle(0x95d6a2, 0.22);
          lbl.setAlpha(0.95).setColor("#2a4a3a");
          this.emitWorldPulse(6804, 472, { color: 0xe1bb73, radius: 14, scale: 2.2, duration: 560 });
          this.showMessage(`Отмечено: ${m.label}. ${marked.size}/3`);

          if (marked.size === 3) {
            // Sort by x to draw a west-to-east route; then continue north to lighthouse
            const sorted = [...correctMarked].sort((a, b) => a.x - b.x);
            routeGfx.clear();
            routeGfx.lineStyle(2.5, 0xd46462, 0.85);
            routeGfx.beginPath();
            routeGfx.moveTo(sorted[0].x, sorted[0].y);
            for (let i = 1; i < sorted.length; i += 1) {
              routeGfx.lineTo(sorted[i].x, sorted[i].y);
            }
            // Continue to lighthouse (due north)
            const last = sorted[sorted.length - 1];
            routeGfx.lineTo(0, -76);
            routeGfx.strokePath();
            // Dashed continuation going north off-chart
            routeGfx.lineStyle(2, 0xd46462, 0.7);
            for (let y = -90; y > -104; y -= 6) {
              routeGfx.beginPath(); routeGfx.moveTo(0, y); routeGfx.lineTo(0, y - 3); routeGfx.strokePath();
            }
            // Arrow head pointing north
            routeGfx.fillStyle(0xd46462, 0.9);
            routeGfx.fillTriangle(0, -108, -5, -100, 5, -100);

            this.tweens.add({ targets: routeGfx, alpha: 1, duration: 600, ease: "quad.out" });
            this.session.bayProgress.chartSolved = true;
            this.cameras.main.shake(160, 0.002);
            this.showNarration("Три точки складываются в маршрут: лагерь — лебёдка — следы у скалы. Линия уводит строго на север, через фарватер мимо маяка. Это спланированное бегство.");
          }
        },
      });
    });

    const hint = this.add.text(0, 104, "Наведи курсор — появится подпись. Кликай отметки, связанные со следами в подземелье.", {
      fontFamily: "monospace", fontSize: "10px", color: "#7a6a56", align: "center",
    }).setOrigin(0.5);
    this.overlayContent.add(hint);

    this.syncHud();
  }

  openKillswitchOverlay() {
    this.openOverlay(
      "Рубильник генератора",
      "Главный рубильник. Опустишь — свет на маяке погаснет до рассвета. Корабль пройдёт мимо фарватера и напорется на скалы. Барк останется на свободе.",
      "Решение нельзя отменить. Esc — отойти"
    );

    // Backdrop
    const frame = this.add.rectangle(0, 10, 540, 260, 0x0a1218, 0.97).setStrokeStyle(2, 0x3a4a52, 0.42);
    this.overlayContent.add(frame);

    // Switch housing
    const housingShadow = this.add.rectangle(4, 14, 260, 210, 0x000000, 0.5);
    const housing = this.add.rectangle(0, 8, 250, 200, 0x2a2218, 1).setStrokeStyle(4, 0xd46462, 0.6);
    const housingInner = this.add.rectangle(0, 8, 232, 184, 0x1a140c, 1);
    const warnStripTop = this.add.graphics();
    warnStripTop.fillStyle(0xd46462, 0.85);
    for (let i = 0; i < 14; i += 1) {
      warnStripTop.fillTriangle(-116 + i * 18, -80, -102 + i * 18, -80, -109 + i * 18, -68);
    }
    warnStripTop.fillStyle(0x1a140c, 0.85);
    for (let i = 0; i < 14; i += 1) {
      warnStripTop.fillTriangle(-109 + i * 18, -80, -95 + i * 18, -80, -102 + i * 18, -68);
    }
    this.overlayContent.add([housingShadow, housing, housingInner, warnStripTop]);

    // Label
    const labelBg = this.add.rectangle(0, -42, 200, 22, 0x3a1a10, 1).setStrokeStyle(1, 0xd46462, 0.8);
    const label = this.add.text(0, -42, "ОСНОВНОЙ РУБИЛЬНИК", {
      fontFamily: "monospace", fontSize: "11px", color: "#e08080", letterSpacing: 2,
    }).setOrigin(0.5);
    this.overlayContent.add([labelBg, label]);

    // Lever track
    const leverTrack = this.add.rectangle(0, 20, 34, 110, 0x080404, 1).setStrokeStyle(2, 0x5a4030, 0.85);
    const leverNotchUp = this.add.rectangle(0, -24, 44, 4, 0x7de08f, 0.7);
    const leverNotchDn = this.add.rectangle(0, 64, 44, 4, 0xd46462, 0.7);
    const upLabel = this.add.text(30, -24, "ВКЛ", {
      fontFamily: "monospace", fontSize: "9px", color: "#7de08f", letterSpacing: 1,
    }).setOrigin(0, 0.5);
    const dnLabel = this.add.text(30, 64, "ВЫКЛ", {
      fontFamily: "monospace", fontSize: "9px", color: "#d46462", letterSpacing: 1,
    }).setOrigin(0, 0.5);
    // Lever handle (starts at ВКЛ position)
    const leverArm = this.add.rectangle(0, -24, 18, 64, 0x6a3a1a, 1).setStrokeStyle(2, 0x2a1a0a, 1).setOrigin(0.5, 1);
    const leverGrip = this.add.circle(0, -80, 10, 0xd7c087, 1).setStrokeStyle(2, 0x5a3a20, 1);
    this.overlayContent.add([leverTrack, leverNotchUp, leverNotchDn, upLabel, dnLabel, leverArm, leverGrip]);

    // Hint line
    const hintLine = this.add.text(0, 116, "Потяни рукоять вниз, чтобы обесточить маяк.", {
      fontFamily: "Georgia, serif", fontSize: "13px", color: "#c8b088", align: "center", fontStyle: "italic",
    }).setOrigin(0.5);
    this.overlayContent.add(hintLine);

    let pulled = false;
    this.createOverlayRectHotspot(0, 4, 80, 140, {
      pointerover: () => { if (!pulled) leverGrip.setFillStyle(0xe1bb73, 1); },
      pointerout: () => { if (!pulled) leverGrip.setFillStyle(0xd7c087, 1); },
      pointerdown: () => {
        if (pulled) return;
        pulled = true;
        playPreviewWorldCue("generator");
        this.tweens.add({
          targets: [leverArm, leverGrip], y: "+=88", duration: 320, ease: "cubic.in",
          onComplete: () => {
            this.cameras.main.shake(280, 0.003);
            this.cameras.main.flash(480, 0, 0, 0, true);
            this.session.beats.finalConfronted = true;
            this.session.beats.endingChoice = "dark";
            this.time.delayedCall(520, () => {
              this.closeOverlay();
              this.showEndingCard("dark");
            });
          },
        });
      },
    });
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
        : "Янис поднимается наверх. Свет маяка горит ровно, пробивая ночь.\nК утру у входа в бухту появится чёрный силуэт корабля с материка.\n\nИнспектор сойдёт на берег, увидит фотокарточку в руках Яниса,\nи на Барка наконец найдутся старые вопросы — те, на которые\nтридцать лет никто не решался отвечать.\n\nЯнис помог незнакомому смотрителю. А потом — предал его ради правды.",
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
}
