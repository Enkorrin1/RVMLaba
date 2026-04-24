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

    const body = this.add.container(0, 24);
    const frame = this.add.rectangle(0, 18, 470, 238, 0x15202a, 0.95).setStrokeStyle(3, 0x89b7c5, 0.18);
    const monitor = this.add.rectangle(-88, -12, 180, 104, 0x0d151b, 1).setStrokeStyle(2, 0x7bc6d3, 0.24);
    const scheme = this.add.rectangle(94, 22, 160, 142, 0x101920, 1).setStrokeStyle(2, 0xe1bb73, 0.18);
    const leftPath = this.add.line(-88, -12, -66, -24, 22, -24, 22, 46, 0x8de0cf, 0.9).setStrokeStyle(3, 0x8de0cf, 0.9);
    const blockedPath = this.add.line(94, 22, 36, -10, 148, -10, 148, 70, 0xd46462, 0.9).setStrokeStyle(4, 0xd46462, 0.9);
    const blocker = this.add.circle(136, 70, 12, 0xd46462, 0.82);
    const glow = this.add.circle(-88, -12, 46, 0x8ad5db, 0.06);
    body.add([
      frame, monitor, scheme, glow, leftPath, blockedPath, blocker,
      this.add.text(-88, 78, "Схема внутренних линий", {
        fontFamily: "Georgia, serif",
        fontSize: "17px",
        color: "#dce6e9",
      }).setOrigin(0.5),
      this.add.text(94, 108, "Тоннель заблокирован\nс восточной стороны", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: "#eadcc1",
        align: "center",
      }).setOrigin(0.5),
    ]);
    this.overlayContent.add(body);

    this.tweens.add({
      targets: glow,
      alpha: 0.18,
      duration: 760,
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
      const strokeAlpha = keyPicked || keyInserted ? 1 : 0.76;
      ring.setStrokeStyle(4, 0xc8b178, strokeAlpha);
      shaft.fillColor = keyInserted ? 0xe0c992 : 0xc8b178;
      keyholeGlow.setFillStyle(0xe1bb73, keyInserted ? 0.18 : (keyPicked ? 0.14 : 0.08));
    };

    this.createOverlayRectHotspot(-142, 52, 124, 64, {
      pointerover: () => {
        if (!keyInserted) {
          ring.setStrokeStyle(4, 0xe8d3a0, 1);
        }
      },
      pointerout: () => updateKeyVisual(),
      pointerdown: () => {
        if (unlockTriggered || keyInserted) {
          return;
        }
        keyPicked = true;
        keyHint.setText("В руке");
        updateKeyVisual();
        this.tweens.add({
          targets: keyToken,
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 120,
          yoyo: true,
          ease: "quad.out",
        });
        instruction.setText("2. Вставь ключ в скважину");
        this.showMessage("Ключ в руке. Теперь вставь его в скважину по центру замка.");
      },
    });

    this.createOverlayRectHotspot(0, 28, 78, 78, {
      pointerover: () => {
        if (!unlockTriggered) {
          keyholeGlow.setFillStyle(0xe1bb73, keyPicked || keyInserted ? 0.18 : 0.11);
        }
      },
      pointerout: () => updateKeyVisual(),
      pointerdown: () => {
        if (unlockTriggered) {
          return;
        }
        if (keyInserted) {
          this.showMessage("Ключ уже в замке. Теперь доверни его.");
          return;
        }
        if (!keyPicked) {
          this.showMessage("Сначала возьми ключ слева.");
          return;
        }
        keyPicked = false;
        keyInserted = true;
        keyHint.setText("Повернуть");
        instruction.setText("3. Поверни ключ до упора");
        updateKeyVisual();
        this.tweens.add({
          targets: keyToken,
          x: 12,
          y: 28,
          duration: 200,
          ease: "quad.out",
        });
        this.showMessage("Ключ встал в замок. Осталось довернуть его.");
      },
    });

    this.createOverlayRectHotspot(28, 28, 126, 92, {
      pointerdown: () => {
        if (unlockTriggered) {
          return;
        }
        if (!keyInserted) {
          this.showMessage("Сначала вставь ключ в скважину.");
          return;
        }
        unlockTriggered = true;
        instruction.setText("Замок открыт");
        this.tweens.add({
          targets: keyToken,
          angle: 94,
          duration: 280,
          ease: "quad.out",
        });
        this.tweens.add({
          targets: shackle,
          y: shackle.y - 24,
          alpha: 0.62,
          duration: 280,
          ease: "quad.out",
        });
        this.time.delayedCall(280, () => {
          this.session.puzzleState.tunnelExit.unlocked = true;
          this.cameras.main.shake(140, 0.0018);
          this.emitWorldPulse(3526, 520, {
            color: 0xe1bb73,
            radius: 22,
            scale: 2.8,
            duration: 720,
          });
          this.showNarration("Замок щёлкает. Проход к нижней пристани открыт.");
          this.time.delayedCall(220, () => {
            this.closeOverlay();
            this.syncHud();
          });
        });
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
        const finalText = this.add.text(0, 188, "Теперь ясно: кто-то был здесь совсем недавно и ушёл к северной бухте.", {
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: "#f2e8d7",
          align: "center",
          wordWrap: { width: 520 },
        }).setOrigin(0.5);
        this.overlayContent.add(finalText);
        this.emitWorldPulse(7000, 558, {
          color: 0xe1bb73,
          radius: 20,
          scale: 2.8,
          duration: 760,
        });
        this.showNarration("След почти прямой: смотритель ушёл к северной бухте совсем недавно.");
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
}
