import {
  getServiceObjective,
  hasResolvedServiceScene,
} from "../data/progressionText.js";
import { serviceInteractables } from "../data/towerData.js";
import {
  buildServiceEnvironment,
  createServiceGround,
  updateServiceAmbient,
} from "../render/expansionArt.js";
import {
  createWakePlayer,
  updateWakePlayerVisuals,
} from "../render/wakeArt.js";
import { PreviewSceneBase } from "./PreviewSceneBase.js";
import { getPreviewSession } from "../state/previewSession.js";

export class ServiceScene extends PreviewSceneBase {
  constructor() {
    super("service-preview");
    this.entry = "from-shore";
  }

  init(data) {
    this.entry = data?.entry ?? "from-shore";
  }

  create() {
    this.session = getPreviewSession();
    this.session.stage = "service";

    buildServiceEnvironment(this);
    createServiceGround(this);
    createWakePlayer(this);
    this.placePlayer();
    this.createCamera();
    this.setupSceneChrome(serviceInteractables, (target) => this.handleInteraction(target));
    this.playSceneIntro(
      "Служебный уровень",
      "Под башней всё звучит глуше: металл отзывается эхом, в воздухе висит сырость, а каждый рычаг и люк выглядят так, будто ими пользовались совсем недавно."
    );
  }

  update(time) {
    updateServiceAmbient(this, time);

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
    return "Служебный уровень";
  }

  getObjectiveText() {
    return getServiceObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(620, 0, 1160, 720, 160, 90);
  }

  placePlayer() {
    this.playerBody.setPosition(this.entry === "from-tunnel" ? 1540 : 1090, 526);
  }

  handleInteraction(target) {
    switch (target.id) {
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
      case "service-hatch-return":
        this.session.stage = "shore";
        this.transitionToScene(
          "shore-preview",
          { entry: "from-service" },
          "Основание маяка",
          "Скрипучая лестница выводит обратно к ветру и наружной площадке у башни."
        );
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
          this.session.stage = "tunnel";
          this.session.progressStage = "tunnel";
          this.focusOnInteractable(target, () => {
            this.transitionToScene(
              "tunnel-preview",
              { entry: "from-service" },
              "Восточный тоннель",
              "Цепь с грохотом падает на пол. За дверью начинается сырой ход под маяком."
            );
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
      housing,
      screenGlow,
      screen,
      slotGlow,
      slot,
      bootButton,
      bootRing,
      slotLabel,
      bootText,
      screenText,
      batteryToken,
    ]);
  }

  openConsoleStatusOverlay() {
    this.openOverlay(
      "Сервисный пульт",
      "Экран ожил и показывает схему маяка. Восточный тоннель отмечен красным: проход заблокирован цепью уже с другой стороны."
    );

    const body = this.add.container(0, 14);

    // Monitor bezel
    const bezel = this.add.rectangle(0, 0, 474, 240, 0x091520, 1)
      .setStrokeStyle(2, 0x3a7a8a, 0.8);

    // Header strip
    const headerBg = this.add.rectangle(0, -106, 474, 28, 0x0c1e2c, 1);
    const headerLabel = this.add.text(-220, -106, "СИСТЕМА МОНИТОРИНГА МАЯКА", {
      fontFamily: "monospace", fontSize: "10px", color: "#3a9ab8",
    }).setOrigin(0, 0.5);
    const headerStatus = this.add.text(160, -106, "● АКТИВЕН", {
      fontFamily: "monospace", fontSize: "10px", color: "#6de08c",
    }).setOrigin(0, 0.5);

    const gfx = this.add.graphics();

    // ── Lighthouse icon (top-center) ──
    gfx.fillStyle(0xe4b25f, 0.12);
    gfx.fillRect(-10, -86, 20, 12);
    gfx.lineStyle(1, 0xe4b25f, 0.7);
    gfx.strokeRect(-10, -86, 20, 12);
    // Tower trapezoid
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
    // Connector line to service room
    gfx.lineStyle(1, 0x3a7a8a, 0.5);
    gfx.beginPath(); gfx.moveTo(0, -56); gfx.lineTo(0, -28); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(-4, -31); gfx.lineTo(0, -25); gfx.lineTo(4, -31); gfx.strokePath();

    // ── Service room (center) ──
    const RX = 0, RY = -4;
    gfx.fillStyle(0x0d1e2c, 0.95);
    gfx.lineStyle(2, 0x4aacbf, 0.8);
    gfx.fillRect(RX - 42, RY - 20, 84, 40);
    gfx.strokeRect(RX - 42, RY - 20, 84, 40);
    // Corner tick marks
    gfx.lineStyle(1, 0x4aacbf, 0.35);
    gfx.beginPath(); gfx.moveTo(RX - 42, RY - 12); gfx.lineTo(RX - 42, RY - 20); gfx.lineTo(RX - 34, RY - 20); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(RX + 42, RY - 12); gfx.lineTo(RX + 42, RY - 20); gfx.lineTo(RX + 34, RY - 20); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(RX - 42, RY + 12); gfx.lineTo(RX - 42, RY + 20); gfx.lineTo(RX - 34, RY + 20); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(RX + 42, RY + 12); gfx.lineTo(RX + 42, RY + 20); gfx.lineTo(RX + 34, RY + 20); gfx.strokePath();

    // ── West corridor (OPEN, cyan) ──
    const CY = RY;
    const CH = 18;
    gfx.fillStyle(0x0c2230, 0.85);
    gfx.lineStyle(1, 0x8de0cf, 0.4);
    gfx.fillRect(-130, CY - CH / 2, 88, CH);
    gfx.strokeRect(-130, CY - CH / 2, 88, CH);
    // Flow arrows →
    gfx.lineStyle(2, 0x8de0cf, 0.8);
    [-112, -88, -64].forEach((ax) => {
      gfx.beginPath(); gfx.moveTo(ax, CY); gfx.lineTo(ax + 10, CY); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(ax + 4, CY - 3); gfx.lineTo(ax + 10, CY); gfx.lineTo(ax + 4, CY + 3); gfx.strokePath();
    });
    // West end cap (open)
    gfx.fillStyle(0x8de0cf, 0.12);
    gfx.fillCircle(-134, CY, 9);
    gfx.lineStyle(2, 0x8de0cf, 0.65);
    gfx.strokeCircle(-134, CY, 9);
    gfx.lineStyle(2, 0x8de0cf, 0.45);
    gfx.beginPath(); gfx.moveTo(-143, CY); gfx.lineTo(-153, CY); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(-149, CY - 3); gfx.lineTo(-155, CY); gfx.lineTo(-149, CY + 3); gfx.strokePath();

    // ── East corridor (BLOCKED, red) ──
    gfx.fillStyle(0x1e0e0e, 0.85);
    gfx.lineStyle(1, 0xd46462, 0.5);
    gfx.fillRect(42, CY - CH / 2, 88, CH);
    gfx.strokeRect(42, CY - CH / 2, 88, CH);
    // Blockade X marks
    gfx.lineStyle(2, 0xd46462, 0.85);
    [60, 86, 112].forEach((bx) => {
      gfx.beginPath(); gfx.moveTo(bx - 6, CY - 5); gfx.lineTo(bx + 6, CY + 5); gfx.strokePath();
      gfx.beginPath(); gfx.moveTo(bx + 6, CY - 5); gfx.lineTo(bx - 6, CY + 5); gfx.strokePath();
    });
    // East end cap (sealed)
    gfx.fillStyle(0xd46462, 0.2);
    gfx.fillCircle(134, CY, 9);
    gfx.lineStyle(2, 0xd46462, 0.75);
    gfx.strokeCircle(134, CY, 9);
    gfx.lineStyle(2, 0xd46462, 1.0);
    gfx.beginPath(); gfx.moveTo(129, CY - 4); gfx.lineTo(139, CY + 4); gfx.strokePath();
    gfx.beginPath(); gfx.moveTo(139, CY - 4); gfx.lineTo(129, CY + 4); gfx.strokePath();

    // ── Bottom legend strip ──
    gfx.fillStyle(0x0c1a26, 0.9);
    gfx.lineStyle(1, 0x1e4050, 0.6);
    gfx.fillRect(-237, 92, 474, 26);
    gfx.strokeRect(-237, 92, 474, 26);

    // ── Labels ──
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

    // Animated lantern glow
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
}
