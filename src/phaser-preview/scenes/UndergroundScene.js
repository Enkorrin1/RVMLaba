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
      "Шкафчик пахнет солью и мокрой тканью. Внутри висит плащ, старый жетон и ключ от внутренних проходов."
    );

    const body = this.add.container(0, 24);
    const frame = this.add.rectangle(0, 16, 450, 238, 0x172029, 0.96).setStrokeStyle(3, 0xc9b07c, 0.18);
    const locker = this.add.rectangle(-76, 16, 178, 174, 0x58656b, 1).setStrokeStyle(3, 0xc9b07c, 0.2);
    const coat = this.add.rectangle(-110, 0, 40, 92, 0x364b5d, 0.88);
    const tag = this.add.rectangle(-46, -16, 18, 12, 0xd7c087, 1).setStrokeStyle(2, 0x4d4031, 0.32);
    const keyGlow = this.add.circle(94, 18, 30, 0xe1bb73, 0.08);
    const note = this.add.text(88, 112, "Ключ от внутренних проходов", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#eadcc1",
      align: "center",
      wordWrap: { width: 160 },
    }).setOrigin(0.5);
    body.add([frame, locker, coat, tag, keyGlow, note]);
    this.overlayContent.add(body);

    if (!this.session.inventory.includes("serviceKey")) {
      const keyIcon = this.add.container(94, 18);
      keyIcon.add([
        this.add.circle(-18, 0, 12, 0xc8b178, 0).setStrokeStyle(4, 0xc8b178, 1),
        this.add.rectangle(16, 0, 56, 8, 0xc8b178, 1),
        this.add.rectangle(34, -6, 8, 12, 0xc8b178, 1),
        this.add.rectangle(46, 6, 8, 12, 0xc8b178, 1),
      ]);
      this.overlayContent.add(keyIcon);
      this.createOverlayRectHotspot(94, 18, 120, 64, {
        pointerover: () => keyGlow.setFillStyle(0xe1bb73, 0.14),
        pointerout: () => keyGlow.setFillStyle(0xe1bb73, 0.08),
        pointerdown: () => {
          this.addInventoryItem("serviceKey");
          this.emitWorldPulse(2812, 550, {
            color: 0xd7c087,
            radius: 18,
            scale: 2.4,
            duration: 620,
          });
          this.showNarration("Среди мокрого плаща висит служебный ключ. Он подходит к старым створкам и внутренним проходам.");
          this.openLockerOverlay();
        },
      });
      return;
    }

    const empty = this.add.text(94, 18, "Ключ уже забран", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#dce6e9",
      align: "center",
    }).setOrigin(0.5);
    this.overlayContent.add(empty);
  }

  openSignalOverlay() {
    this.openOverlay(
      "Аварийный передатчик",
      "Шипение уходит в шум моря. Подстрой ручку настройки, чтобы вытащить из помех последние слова."
    );

    const body = this.add.container(0, 26);
    const shell = this.add.rectangle(0, 20, 500, 230, 0x172029, 0.96).setStrokeStyle(3, 0xe1bb73, 0.18);
    const display = this.add.rectangle(-54, -6, 188, 72, 0x0d1419, 1).setStrokeStyle(2, 0x90a6b2, 0.18);
    const waveform = this.add.rectangle(-54, -6, 126, 8, 0x9fe0eb, 0.44);
    const knob = this.add.circle(154, 6, 34, 0x5e6e79, 1).setStrokeStyle(3, 0xd7c087, 0.24);
    const knobMark = this.add.rectangle(154, -16, 6, 22, 0xd7c087, 1);
    const lineA = this.add.text(-54, 80, "«...восточный створ открыт...", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#f2e8d7",
      align: "center",
    }).setOrigin(0.5).setAlpha(0);
    const lineB = this.add.text(-54, 106, "...спускаюсь к воде»", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#f2e8d7",
      align: "center",
    }).setOrigin(0.5).setAlpha(0);
    body.add([shell, display, waveform, knob, knobMark, lineA, lineB]);
    this.overlayContent.add(body);

    this.createOverlayRectHotspot(154, 6, 100, 100, {
      pointerover: () => knob.setStrokeStyle(3, 0xe1bb73, 0.58),
      pointerout: () => knob.setStrokeStyle(3, 0xd7c087, 0.24),
      pointerdown: () => {
        this.tweens.add({
          targets: knobMark,
          angle: 96,
          duration: 220,
          ease: "quad.out",
        });
        this.tweens.add({
          targets: waveform,
          width: 170,
          alpha: 0.8,
          duration: 180,
          yoyo: true,
        });
        this.emitWorldPulse(3260, 528, {
          color: 0x9fe0eb,
          radius: 18,
          scale: 2.6,
          duration: 620,
        });
        lineA.setAlpha(1);
        lineB.setAlpha(1);
        this.showNarration(
          hasResolvedTunnelScene(this.session)
            ? "Передатчик сипит: «...восточный створ открыт, спускаюсь к воде». Теперь направление ясно."
            : "Передатчик повторяет обрывок: «...восточный створ открыт...». Нужно ещё собрать следы в самом тоннеле."
        );
      },
    });
  }

  openExitUnlockOverlay() {
    this.openOverlay(
      "Замок прохода",
      "Возьми ключ, вставь его в скважину и затем доверни до упора, чтобы открыть проход к пристани."
    );

    const door = this.add.rectangle(0, 18, 390, 250, 0x2a3138, 0.96).setStrokeStyle(3, 0xd2b47b, 0.24);
    const lockBody = this.add.rectangle(0, 12, 116, 124, 0x1a2128, 1).setStrokeStyle(3, 0xe1bb73, 0.28);
    const shackle = this.add.arc(0, -30, 34, 180, 360, false, 0xc8b178, 1).setStrokeStyle(7, 0xc8b178, 1);
    const keyholeGlow = this.add.circle(0, 28, 22, 0xe1bb73, 0.08).setStrokeStyle(3, 0xe1bb73, 0.32);
    const keyhole = this.add.circle(0, 28, 11, 0x0d1419, 1).setStrokeStyle(2, 0x5d707b, 0.26);
    const instruction = this.add.text(0, 118, "1. Возьми ключ", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#dce6e9",
      align: "center",
    }).setOrigin(0.5);

    const keyToken = this.add.container(-142, 52).setSize(124, 64);
    const ring = this.add.circle(-26, 0, 12, 0xc8b178, 0).setStrokeStyle(4, 0xc8b178, 1);
    const shaft = this.add.rectangle(12, 0, 62, 8, 0xc8b178, 1);
    const toothA = this.add.rectangle(34, -6, 8, 12, 0xc8b178, 1);
    const toothB = this.add.rectangle(46, 6, 8, 12, 0xc8b178, 1);
    const keyHint = this.add.text(0, 24, "Ключ", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    keyToken.add([ring, shaft, toothA, toothB, keyHint]);

    let keyPicked = false;
    let keyInserted = false;
    let unlockTriggered = false;

    const updateKeyVisual = () => {
      ring.setStrokeStyle(4, 0xc8b178, keyPicked || keyInserted ? 1 : 0.76);
      shaft.fillColor = keyInserted ? 0xe0c992 : 0xc8b178;
      keyholeGlow.setFillStyle(0xe1bb73, keyInserted ? 0.18 : (keyPicked ? 0.14 : 0.08));
    };

    const doUnlock = () => {
      if (unlockTriggered || !keyInserted) return;
      unlockTriggered = true;
      instruction.setText("Замок открыт");
      this.tweens.add({ targets: keyToken, angle: 94, duration: 280, ease: "quad.out" });
      this.tweens.add({ targets: shackle, y: shackle.y - 24, alpha: 0.62, duration: 280, ease: "quad.out" });
      this.time.delayedCall(280, () => {
        this.session.puzzleState.tunnelExit.unlocked = true;
        this.cameras.main.shake(140, 0.0018);
        this.emitWorldPulse(3526, 520, { color: 0xe1bb73, radius: 22, scale: 2.8, duration: 720 });
        this.showNarration("Замок щёлкает. Проход к нижней пристани открыт.");
        this.time.delayedCall(220, () => { this.closeOverlay(); this.syncHud(); });
      });
    };

    this.createOverlayRectHotspot(-142, 52, 124, 64, {
      pointerover: () => { if (!keyInserted) ring.setStrokeStyle(4, 0xe8d3a0, 1); },
      pointerout: () => updateKeyVisual(),
      pointerdown: () => {
        if (unlockTriggered || keyInserted) return;
        keyPicked = true;
        keyHint.setText("В руке");
        updateKeyVisual();
        this.tweens.add({ targets: keyToken, scaleX: 1.06, scaleY: 1.06, duration: 120, yoyo: true, ease: "quad.out" });
        instruction.setText("2. Вставь ключ в скважину");
        this.showMessage("Ключ в руке. Теперь вставь его в скважину по центру замка.");
      },
    });

    this.createOverlayRectHotspot(0, 28, 78, 78, {
      pointerover: () => { if (!unlockTriggered) keyholeGlow.setFillStyle(0xe1bb73, keyPicked || keyInserted ? 0.18 : 0.11); },
      pointerout: () => updateKeyVisual(),
      pointerdown: () => {
        if (unlockTriggered) return;
        if (keyInserted) { doUnlock(); return; }
        if (!keyPicked) { this.showMessage("Сначала возьми ключ слева."); return; }
        keyPicked = false;
        keyInserted = true;
        keyHint.setText("Повернуть");
        instruction.setText("3. Поверни ключ до упора");
        updateKeyVisual();
        this.tweens.add({ targets: keyToken, x: 12, y: 28, duration: 200, ease: "quad.out" });
        this.showMessage("Ключ встал в замок. Теперь кликни по нему, чтобы повернуть.");
      },
    });

    this.createOverlayRectHotspot(28, 28, 126, 92, {
      pointerdown: () => {
        if (!keyInserted) { this.showMessage("Сначала вставь ключ в скважину."); return; }
        doUnlock();
      },
    });

    this.tweens.add({
      targets: keyholeGlow,
      alpha: 0.24,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.overlayContent.add([door, lockBody, shackle, keyholeGlow, keyhole, instruction, keyToken]);
  }

  openSkiffOverlay() {
    this.openOverlay(
      "Служебный ялик",
      "Ялик набит солёной водой и мокрой парусиной. На дне лежит короткий багор, которым удобно подцеплять засовы."
    );

    const body = this.add.container(0, 26);
    const hull = this.add.ellipse(0, 34, 360, 120, 0x5f6f7a, 1).setStrokeStyle(4, 0xc9d8de, 0.2);
    const cavity = this.add.ellipse(0, 18, 286, 76, 0x202932, 1);
    const tarp = this.add.rectangle(76, 24, 120, 28, 0x355565, 0.92).setAngle(8);
    const puddle = this.add.ellipse(-48, 30, 96, 18, 0xa0d4dc, 0.08);
    body.add([hull, cavity, tarp, puddle]);
    this.overlayContent.add(body);

    if (!this.session.inventory.includes("boatHook")) {
      const hookGlow = this.add.circle(-78, 14, 28, 0xe1bb73, 0.08);
      const hook = this.add.container(-78, 14);
      hook.add([
        this.add.rectangle(-2, 0, 74, 6, 0x875c42, 1).setAngle(-22),
        this.add.arc(28, -14, 16, 210, 20, false, 0xa1bac6, 1).setStrokeStyle(5, 0xa1bac6, 1),
      ]);
      this.overlayContent.add([hookGlow, hook]);
      this.createOverlayRectHotspot(-78, 14, 110, 70, {
        pointerover: () => hookGlow.setFillStyle(0xe1bb73, 0.14),
        pointerout: () => hookGlow.setFillStyle(0xe1bb73, 0.08),
        pointerdown: () => {
          this.addInventoryItem("boatHook");
          this.emitWorldPulse(4600, 564, {
            color: 0xc9d8de,
            radius: 18,
            scale: 2.4,
            duration: 620,
          });
          this.showNarration("На дне ялика лежит короткий багор. Он поможет подцепить мокрый засов у воды.");
          this.openSkiffOverlay();
        },
      });
      return;
    }

    this.overlayContent.add(this.add.text(0, 124, "Багор уже забран. На дне остались пустой фонарь и следы грязи.", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#dce6e9",
      align: "center",
      wordWrap: { width: 420 },
    }).setOrigin(0.5));
  }

  openWinchOverlay() {
    this.openOverlay(
      "Лебёдка у края пристани",
      "На барабане не хватает троса, а металл весь в свежих порезах. Тут явно работали наспех и с большим усилием."
    );

    const body = this.add.container(0, 26);
    const column = this.add.rectangle(0, 22, 220, 190, 0x1c252d, 0.96).setStrokeStyle(3, 0xcab07c, 0.18);
    const drum = this.add.circle(0, 6, 42, 0x24323a, 0).setStrokeStyle(5, 0xcab07c, 1);
    const spool = this.add.rectangle(0, 6, 18, 76, 0x4b5d68, 1);
    const cutRope = this.add.line(0, 0, -36, 30, 26, -10, 0xb89464, 1).setStrokeStyle(5, 0xb89464, 1);
    const sparks = this.add.ellipse(18, -8, 58, 18, 0xe1bb73, 0.06);
    body.add([column, drum, spool, cutRope, sparks]);
    this.overlayContent.add(body);

    this.tweens.add({
      targets: sparks,
      alpha: 0.18,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.showNarration(
      hasResolvedPierScene(this.session)
        ? "На барабане не хватает троса, а на металле видны свежие порезы. Кто-то спускался к воде в спешке."
        : "Трос на лебёдке обрезан и уходит в темноту под скалы. Нужно осмотреть ещё и ялик."
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
      "Костёр погас давно, но камни ещё сложены аккуратно. Здесь не случайная стоянка, а чьё-то укрытие на несколько ночей."
    );

    const body = this.add.container(0, 26);
    const pit = this.add.ellipse(0, 44, 260, 90, 0x253039, 0.96).setStrokeStyle(3, 0x7f5d42, 0.18);
    const emberA = this.add.circle(-18, 22, 14, 0x5c4939, 1);
    const emberB = this.add.circle(12, 18, 16, 0x7f5d42, 1);
    const emberGlow = this.add.ellipse(0, 18, 118, 38, 0xc8844a, 0.08);
    body.add([pit, emberGlow, emberA, emberB]);
    this.overlayContent.add(body);

    this.tweens.add({
      targets: emberGlow,
      alpha: 0.16,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.showNarration("Костёр давно погас, но камни вокруг ещё уложены аккуратно. Кто-то прятался здесь не одну ночь.");
  }

  openCacheOverlay() {
    this.openOverlay(
      "Тайник под тентом",
      "Под тентом спрятан аккуратный запас. Это уже не случайные вещи, а подготовленная точка отхода."
    );

    const body = this.add.container(0, 24);
    const tarp = this.add.triangle(-26, -28, 0, 0, 110, 0, 54, -102, 0x6d8270, 0.8);
    const crate = this.add.rectangle(16, 34, 142, 78, 0x6c533d, 1).setStrokeStyle(3, 0xd7c59c, 0.18);
    const map = this.add.rectangle(-16, 22, 84, 46, 0xd8d0bd, 1).setStrokeStyle(2, 0x7a6a56, 0.32).setAngle(-10);
    const bandage = this.add.rectangle(52, 18, 46, 18, 0xd7d3cb, 1).setAngle(8);
    const ration = this.add.rectangle(72, 48, 30, 20, 0x8f7461, 1);
    body.add([tarp, crate, map, bandage, ration]);
    this.overlayContent.add(body);

    this.showNarration(
      hasResolvedBayScene(this.session)
        ? "Под тентом спрятаны сухие карты и записка: «Если свет включится, встречаемся у северной бухты до рассвета»."
        : "Под тентом спрятаны сухари, бинт и обрывок карты. Нужно осмотреть бухту внимательнее."
    );
  }

  openFootprintAnalysisOverlay() {
    this.openOverlay(
      "Следы на камнях",
      "Осмотри все улики в крупном плане. Только так можно понять, куда именно ушёл смотритель."
    );

    const board = this.add.rectangle(0, 26, 560, 260, 0x17212a, 0.96).setStrokeStyle(3, 0xe1bb73, 0.2);
    const stoneA = this.add.ellipse(-146, 34, 150, 74, 0x41535a, 1).setAngle(-10);
    const stoneB = this.add.ellipse(22, 6, 182, 84, 0x4a5d66, 1).setAngle(8);
    const stoneC = this.add.ellipse(188, 60, 166, 72, 0x41535a, 1).setAngle(-12);
    const status = this.add.text(0, 154, "Найдено улик: 0 / 3", {
      fontFamily: "Georgia, serif",
      fontSize: "20px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    this.overlayContent.add([board, stoneA, stoneB, stoneC, status]);

    let found = 0;
    const foundSet = new Set();
    const registerClue = (id, message) => {
      if (foundSet.has(id)) {
        return;
      }
      foundSet.add(id);
      found += 1;
      status.setText(`Найдено улик: ${found} / 3`);
      this.showMessage(message);
      if (found === 3) {
        this.session.beats.sabotageFound = true;
        const finalText = this.add.text(0, 188, "Кто-то специально вывел механизм из строя. Это не авария — это диверсия. Нужно рассказать смотрителю.", {
          fontFamily: "Georgia, serif",
          fontSize: "20px",
          color: "#f2e8d7",
          align: "center",
          wordWrap: { width: 520 },
        }).setOrigin(0.5);
        this.overlayContent.add(finalText);
        this.emitWorldPulse(7000, 558, {
          color: 0xd46462,
          radius: 24,
          scale: 3.2,
          duration: 900,
        });
        this.cameras.main.shake(200, 0.002);
        this.showNarration("Лебёдка, цепь, засов — всё сломано намеренно. Маяк ослеп не случайно. Смотритель должен это знать.");
      }
    };

    const bootPrint = this.add.ellipse(-156, 26, 44, 18, 0x1d2225, 0.58).setAngle(-28);
    const printGlow = this.add.ellipse(-156, 26, 66, 30, 0xe1bb73, 0.08).setAngle(-28);
    this.createOverlayRectHotspot(-156, 26, 74, 38, {
      pointerover: () => printGlow.setFillStyle(0xe1bb73, 0.12),
      pointerout: () => printGlow.setFillStyle(0xe1bb73, 0.08),
      pointerdown: () => {
        printGlow.setFillStyle(0xe1bb73, 0.18);
        registerClue("print", "Отпечаток глубокий и свежий. Значит, человек шёл быстро и совсем недавно.");
      },
    });

    const cloth = this.add.triangle(26, -10, 0, 0, 34, 8, 8, 28, 0x8f7461, 1).setAngle(14);
    const clothGlow = this.add.circle(26, -10, 28, 0xe1bb73, 0.08);
    this.createOverlayRectHotspot(26, -10, 60, 60, {
      pointerover: () => clothGlow.setFillStyle(0xe1bb73, 0.12),
      pointerout: () => clothGlow.setFillStyle(0xe1bb73, 0.08),
      pointerdown: () => {
        clothGlow.setFillStyle(0xe1bb73, 0.18);
        registerClue("cloth", "Клочок ткани ещё влажный от солёного ветра. Его сорвало со снаряжения совсем недавно.");
      },
    });

    const route = this.add.line(0, 0, 174, 40, 238, -18, 0xc8e3ea, 0.9).setStrokeStyle(4, 0xc8e3ea, 0.9);
    const routeGlow = this.add.circle(206, 10, 34, 0xe1bb73, 0.08);
    this.createOverlayRectHotspot(206, 10, 104, 86, {
      pointerover: () => routeGlow.setFillStyle(0xe1bb73, 0.12),
      pointerout: () => routeGlow.setFillStyle(0xe1bb73, 0.08),
      pointerdown: () => {
        routeGlow.setFillStyle(0xe1bb73, 0.18);
        registerClue("route", "Следы уходят вверх по сухой кромке скалы. Значит, путь ведёт дальше к северной бухте.");
      },
    });

    this.tweens.add({
      targets: [printGlow, clothGlow, routeGlow],
      alpha: 0.18,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.overlayContent.add([printGlow, clothGlow, routeGlow, bootPrint, cloth, route]);
  }

  openValvePanelOverlay() {
    this.openOverlay(
      "Клапанный узел",
      "Три вентиля управляют давлением в контуре. Порядок открытия важен — неверная последовательность сбросит предохранительный клапан."
    );

    if (this.session.serviceProgress.valveSolved) {
      const done = this.add.text(0, 18, "Давление выровнено. Вентиляционный канал открыт.", {
        fontFamily: "Georgia, serif", fontSize: "20px", color: "#95d6a2", align: "center", wordWrap: { width: 440 },
      }).setOrigin(0.5);
      this.overlayContent.add(done);
      this.syncHud();
      return;
    }

    const body = this.add.container(0, 24);
    const frame = this.add.rectangle(0, 12, 480, 244, 0x1a2930, 0.96).setStrokeStyle(2, 0x6a8a96, 0.4);
    body.add(frame);

    // Schematic plate (right)
    const plate = this.add.rectangle(168, -22, 118, 130, 0x1c2a34, 0.9).setStrokeStyle(2, 0xd7c087, 0.3);
    const plateTitle = this.add.text(168, -78, "СХЕМА ПУСКА", { fontFamily: "monospace", fontSize: "9px", color: "#d7c087" }).setOrigin(0.5);
    ["1.  Б", "2.  А", "3.  В"].forEach((s, i) => {
      body.add(this.add.text(168, -54 + i * 30, s, { fontFamily: "monospace", fontSize: "15px", color: "#9ab8c4" }).setOrigin(0.5));
    });

    const hint = this.add.text(0, 132, "Кликай по вентилям в порядке, указанном на схеме справа.", {
      fontFamily: "Georgia, serif", fontSize: "15px", color: "#7a9aaa", align: "center",
    }).setOrigin(0.5);

    const CORRECT = ["Б", "А", "В"];
    const opened = [];
    const states = { А: false, Б: false, В: false };
    const objs = {};

    [{ id: "А", x: -148 }, { id: "Б", x: -36 }, { id: "В", x: 76 }].forEach((v) => {
      const outer = this.add.circle(v.x, -22, 34, 0x364e5c, 1).setStrokeStyle(3, 0x8aacba, 0.5);
      const inner = this.add.circle(v.x, -22, 20, 0x243039, 1);
      const handle = this.add.rectangle(v.x, -22, 7, 42, 0xd7c087, 1);
      const lbl = this.add.text(v.x, 28, v.id, { fontFamily: "Georgia, serif", fontSize: "22px", color: "#dce6e9" }).setOrigin(0.5);
      objs[v.id] = { outer, inner, handle };
      body.add([outer, inner, handle, lbl]);

      this.createOverlayRectHotspot(v.x, -22, 80, 80, {
        pointerover: () => { if (!states[v.id]) outer.setStrokeStyle(3, 0xe1bb73, 0.8); },
        pointerout: () => { if (!states[v.id]) outer.setStrokeStyle(3, 0x8aacba, 0.5); },
        pointerdown: () => {
          if (states[v.id]) { this.showMessage(`Вентиль ${v.id} уже открыт.`); return; }
          if (v.id !== CORRECT[opened.length]) {
            Object.keys(states).forEach((k) => { states[k] = false; });
            opened.length = 0;
            [{ id: "А", x: -148 }, { id: "Б", x: -36 }, { id: "В", x: 76 }].forEach((vv) => {
              objs[vv.id].handle.setAngle(0);
              objs[vv.id].outer.setStrokeStyle(3, 0x8aacba, 0.5);
              objs[vv.id].inner.setFillStyle(0x243039, 1);
            });
            this.cameras.main.shake(80, 0.0012);
            this.showMessage("Предохранительный клапан сработал. Начни заново.");
            return;
          }
          states[v.id] = true;
          opened.push(v.id);
          objs[v.id].handle.setAngle(90);
          objs[v.id].inner.setFillStyle(0x7de08f, 0.7);
          objs[v.id].outer.setStrokeStyle(3, 0x7de08f, 0.8);
          this.showMessage(`Вентиль ${v.id} открыт. ${opened.length}/3`);
          if (opened.length === 3) {
            this.session.serviceProgress.valveSolved = true;
            this.cameras.main.shake(140, 0.0018);
            this.emitWorldPulse(1221, 492, { color: 0x7de08f, radius: 20, scale: 2.6, duration: 720 });
            this.showNarration("Давление выровнялось. За панелью — замусоленная бирка: «Последнее обслуж.: 3 суток назад. Исп.: Инсп. VII». Вентили стояли в нерабочем положении — намеренно.");
          }
        },
      });
    });

    body.add([plate, plateTitle, hint]);
    this.overlayContent.add(body);
    this.syncHud();
  }

  openCipherLockOverlay() {
    this.openOverlay(
      "Кодовый замок",
      "Три диска, каждый от 0 до 9. Рядом с замком на стене выбиты римские цифры. Они подскажут комбинацию."
    );

    if (this.session.tunnelProgress.cipherSolved) {
      const done = this.add.text(0, 18, "Замок открыт. За дверцей — запечатанный рапорт с печатью смотрителя.", {
        fontFamily: "Georgia, serif", fontSize: "20px", color: "#95d6a2", align: "center", wordWrap: { width: 440 },
      }).setOrigin(0.5);
      this.overlayContent.add(done);
      this.syncHud();
      return;
    }

    // Code: 3-7-1 shown as III · VII · I on the wall plaque in the overlay
    const TARGET = [3, 7, 1];
    const vals = [0, 0, 0];

    const body = this.add.container(0, 24);
    const frame = this.add.rectangle(0, 8, 480, 248, 0x1a2026, 0.97).setStrokeStyle(2, 0x5a7a88, 0.5);
    body.add(frame);

    // Stone plaque (left) showing the clue
    const plaque = this.add.rectangle(-164, -18, 114, 120, 0x2a3a42, 0.9).setStrokeStyle(2, 0xd7c087, 0.25);
    const plaqueTitle = this.add.text(-164, -68, "НА СТЕНЕ:", { fontFamily: "monospace", fontSize: "9px", color: "#d7c087" }).setOrigin(0.5);
    const clue = this.add.text(-164, -18, "III · VII · I", { fontFamily: "Georgia, serif", fontSize: "20px", color: "#e8dcc0" }).setOrigin(0.5);
    const clueHint = this.add.text(-164, 38, "арабскими\nцифрами →", { fontFamily: "monospace", fontSize: "9px", color: "#7a9aaa", align: "center" }).setOrigin(0.5);

    // 3 dials
    const dialObjs = [];
    const dialX = [36, 106, 176];
    const digitTexts = [];

    dialX.forEach((dx, i) => {
      const housing = this.add.rectangle(dx, -18, 54, 84, 0x243039, 1).setStrokeStyle(3, 0x8aacba, 0.4);
      const window_ = this.add.rectangle(dx, -18, 36, 44, 0x0e1820, 1).setStrokeStyle(2, 0x5ab4c8, 0.6);
      const digit = this.add.text(dx, -18, "0", { fontFamily: "monospace", fontSize: "26px", color: "#91cad8" }).setOrigin(0.5);
      const btnUp = this.add.triangle(dx, -54, -14, 0, 14, 0, 0, -18, 0x8aacba, 0.7);
      const btnDn = this.add.triangle(dx, 20, -14, 0, 14, 0, 0, 18, 0x8aacba, 0.7);
      dialObjs.push(housing);
      digitTexts.push(digit);
      body.add([housing, window_, btnUp, btnDn, digit]);

      this.createOverlayRectHotspot(dx, -54, 40, 30, {
        pointerover: () => btnUp.setAlpha(1),
        pointerout: () => btnUp.setAlpha(0.7),
        pointerdown: () => { vals[i] = (vals[i] + 1) % 10; digit.setText(String(vals[i])); },
      });
      this.createOverlayRectHotspot(dx, 20, 40, 30, {
        pointerover: () => btnDn.setAlpha(1),
        pointerout: () => btnDn.setAlpha(0.7),
        pointerdown: () => { vals[i] = (vals[i] + 9) % 10; digit.setText(String(vals[i])); },
      });
    });

    // Confirm button
    const confirmBtn = this.add.rectangle(106, 88, 180, 40, 0x1f2a32, 1).setStrokeStyle(2, 0xd7c087, 0.5);
    const confirmTxt = this.add.text(106, 88, "ОТКРЫТЬ", { fontFamily: "monospace", fontSize: "14px", color: "#f2e8d7" }).setOrigin(0.5);
    body.add([confirmBtn, confirmTxt]);

    this.createOverlayRectHotspot(106, 88, 180, 40, {
      pointerover: () => confirmBtn.setStrokeStyle(2, 0xe1bb73, 0.9),
      pointerout: () => confirmBtn.setStrokeStyle(2, 0xd7c087, 0.5),
      pointerdown: () => {
        if (vals[0] === TARGET[0] && vals[1] === TARGET[1] && vals[2] === TARGET[2]) {
          this.session.tunnelProgress.cipherSolved = true;
          dialObjs.forEach((d) => d.setStrokeStyle(3, 0x7de08f, 0.8));
          digitTexts.forEach((d) => d.setColor("#95d6a2"));
          this.cameras.main.shake(120, 0.0016);
          this.emitWorldPulse(3075, 472, { color: 0xd7c087, radius: 18, scale: 2.8, duration: 760 });
          this.showNarration("Замок щёлкает. Внутри — опечатанный рапорт: «Объект задокументирован. Источник света ликвидирован на 30 суток. Цель: корректировка судоходного маршрута». Это уже не авария.");
        } else {
          this.cameras.main.shake(80, 0.001);
          this.showMessage("Неверная комбинация. Подсказка рядом.");
        }
      },
    });

    const hint = this.add.text(0, 136, "▲▼ — крутить диски   ·   ОТКРЫТЬ — проверить код", {
      fontFamily: "monospace", fontSize: "10px", color: "#5a7a88",
    }).setOrigin(0.5);

    body.add([plaque, plaqueTitle, clue, clueHint, hint]);
    this.overlayContent.add(body);
    this.syncHud();
  }

  openNauticalChartOverlay() {
    this.openOverlay(
      "Навигационная карта",
      "Старая карта с четырьмя отметками. Три из них связаны со следами, которые ты уже видел. Отметь их."
    );

    if (this.session.bayProgress.chartSolved) {
      const done = this.add.text(0, 18, "Маршрут прочитан. Кто-то планировал уйти по северному фарватеру — прямо мимо маяка.", {
        fontFamily: "Georgia, serif", fontSize: "19px", color: "#95d6a2", align: "center", wordWrap: { width: 460 },
      }).setOrigin(0.5);
      this.overlayContent.add(done);
      this.syncHud();
      return;
    }

    const body = this.add.container(0, 24);
    const paper = this.add.rectangle(0, 10, 500, 248, 0xd8d0bd, 0.92).setStrokeStyle(2, 0x7a6a56, 0.5);
    const paperGrain = this.add.rectangle(0, 10, 500, 248, 0x8a7060, 0.04);
    body.add([paper, paperGrain]);

    // 4 map markers: 3 correct, 1 decoy
    const markers = [
      { id: "campfire", x: -168, y: -32, symbol: "🔥", label: "Стоянка", correct: true },
      { id: "rope", x: -48, y: 28, symbol: "⚓", label: "Лебёдка", correct: true },
      { id: "prints", x: 88, y: -48, symbol: "👣", label: "Следы", correct: true },
      { id: "decoy", x: 178, y: 32, symbol: "◈", label: "Точка 4", correct: false },
    ];

    const marked = new Set();
    let wrongCount = 0;

    markers.forEach((m) => {
      const pinBg = this.add.circle(m.x, m.y, 28, 0xf5ede0, 0.9).setStrokeStyle(2, 0x7a6a56, 0.4);
      const pinGlow = this.add.circle(m.x, m.y, 36, 0xe1bb73, 0.0);
      const symText = this.add.text(m.x, m.y - 4, m.symbol, { fontSize: "20px" }).setOrigin(0.5);
      const lblText = this.add.text(m.x, m.y + 22, m.label, {
        fontFamily: "monospace", fontSize: "9px", color: "#5a4a3a",
      }).setOrigin(0.5);
      body.add([pinBg, pinGlow, symText, lblText]);

      this.createOverlayRectHotspot(m.x, m.y, 62, 62, {
        pointerover: () => { if (!marked.has(m.id)) pinGlow.setFillStyle(0xe1bb73, 0.12); },
        pointerout: () => { if (!marked.has(m.id)) pinGlow.setFillStyle(0xe1bb73, 0.0); },
        pointerdown: () => {
          if (marked.has(m.id)) return;
          if (!m.correct) {
            wrongCount++;
            this.cameras.main.shake(60, 0.001);
            pinBg.setFillStyle(0xd46462, 0.4);
            this.showMessage("Эта отметка не связана со следами. Ищи то, что видел сам.");
            return;
          }
          marked.add(m.id);
          pinBg.setFillStyle(0x95d6a2, 0.8);
          pinBg.setStrokeStyle(2, 0x4aacbf, 0.8);
          pinGlow.setFillStyle(0x95d6a2, 0.15);
          this.emitWorldPulse(6804, 472, { color: 0xe1bb73, radius: 14, scale: 2.2, duration: 560 });
          this.showMessage(`Отмечено: ${m.label}. ${marked.size}/3`);

          if (marked.size === 3) {
            this.session.bayProgress.chartSolved = true;
            this.cameras.main.shake(160, 0.002);
            this.showNarration("Три точки складываются в маршрут: лагерь — лебёдка — следы у скалы. Кто-то уходил морем к северному фарватеру, мимо маяка. Это спланированное бегство.");
          }
        },
      });
    });

    const hint = this.add.text(0, 132, "Кликай на отметки, которые связаны со следами в подземелье.", {
      fontFamily: "monospace", fontSize: "10px", color: "#7a6a56",
    }).setOrigin(0.5);

    body.add(hint);
    this.overlayContent.add(body);
    this.syncHud();
  }
}
