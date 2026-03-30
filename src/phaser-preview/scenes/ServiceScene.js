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

const Phaser = window.Phaser;

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
    this.createPromptBubble();
    this.createWorldFocusMarker();
    this.createMessagePanel();
    this.createOverlayLayer();
    this.createTransitionLayer();
    this.createInventoryBar();
    this.bindCommonKeys();
    this.registerInteractables(serviceInteractables, (target) => this.handleInteraction(target));
    this.bindCommonResize();
    this.refreshInventoryBar();
    this.syncHud();
    this.playSceneIntro(
      "Служебный уровень",
      "Под башней всё звучит глуше: гул металла, влажный воздух и ощущение, что здесь работали совсем недавно."
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
    return "Phaser Preview: служебный уровень";
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
            this.openConsoleBatteryOverlay();
          } else {
            this.showNarration(
              this.session.inventory.includes("battery")
                ? "Пульт обесточен. Выбери батарею и установи её вручную."
                : "Пульт обесточен. Нужна батарея из комнаты смотрителя."
            );
          }
          break;
        }

        this.session.serviceProgress.consoleUsed = true;
        this.openOverlay(
          "Сервисный пульт",
          "На экране сервисного пульта мигает схема маяка. Восточный тоннель заблокирован вручную с другой стороны."
        );
        this.overlayContent.add(this.add.text(0, 24, "Блокировка тоннеля отмечена красным на схеме.", {
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: "#dce6e9",
          align: "center",
        }).setOrigin(0.5));
        this.syncHud();
        break;
      case "sealed-door":
        this.session.serviceProgress.doorChecked = true;

        if (!this.session.puzzleState.serviceDoor.panelOpened) {
          if (this.session.selectedItemId === "screwdriver") {
            this.openScrewPanel({
              title: "Щиток на цепи",
              description: "Сними защитный щиток отвёрткой, чтобы добраться до цепи и механизма запора.",
              accent: 0x4c4138,
              onComplete: () => {
                this.session.puzzleState.serviceDoor.panelOpened = true;
                this.showNarration("Щиток снят. Теперь видно саму цепь и замок прохода.");
              },
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
          this.transitionToScene(
            "tunnel-preview",
            { entry: "from-service" },
            "Восточный тоннель",
            "Цепь с грохотом падает на пол. За дверью начинается сырой ход под маяком."
          );
          break;
        }

        this.showNarration("Дверь удерживается цепью с другой стороны. Сначала стоит собрать больше следов в этой комнате.");
        break;
      default:
        break;
    }
  }

  openConsoleBatteryOverlay() {
    this.openOverlay(
      "Питание сервисного пульта",
      "Возьми батарею, вставь её в гнездо и затем запусти пульт нажатием на клавишу питания."
    );

    const housing = this.add.rectangle(0, 18, 420, 220, 0x243039, 0.96).setStrokeStyle(3, 0x9bb1bb, 0.22);
    const screen = this.add.rectangle(0, -28, 160, 62, 0x0f181d, 1).setStrokeStyle(2, 0x7bc6d3, 0.18);
    const slotGlow = this.add.rectangle(0, 56, 110, 82, 0xe1bb73, 0.06).setStrokeStyle(3, 0xe1bb73, 0.28);
    const slot = this.add.rectangle(0, 56, 98, 70, 0x121a20, 1).setStrokeStyle(3, 0xe1bb73, 0.28);
    const bootButton = this.add.circle(144, 58, 20, 0x24343c, 1).setStrokeStyle(3, 0x8ea4af, 0.28);
    const bootRing = this.add.circle(144, 58, 8, 0x86b7c0, 0.22);
    const label = this.add.text(0, 128, "Гнездо батареи", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    const bootText = this.add.text(144, 92, "Пуск", {
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

    const batteryToken = this.add.container(-150, 62).setSize(70, 90);
    const batteryBody = this.add.rectangle(0, 0, 34, 56, 0x49677d, 1).setStrokeStyle(3, 0xd7c17b, 0.44);
    const batteryCap = this.add.rectangle(0, -30, 14, 8, 0xd7c17b, 1);
    const batteryMark = this.add.rectangle(0, 0, 14, 26, 0x233039, 0.62);
    const batteryHint = this.add.text(0, 48, "Батарея", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    batteryToken.add([batteryBody, batteryCap, batteryMark, batteryHint]);
    batteryToken.setInteractive(new Phaser.Geom.Rectangle(-35, -45, 70, 90), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(batteryToken);

    let batteryInserted = false;
    let batteryLocked = false;
    const startPosition = { x: -150, y: 62 };
    const slotBounds = new Phaser.Geom.Rectangle(-55, 16, 110, 82);

    batteryToken.on("drag", (_pointer, dragX, dragY) => {
      if (batteryLocked) {
        return;
      }
      batteryToken.x = dragX;
      batteryToken.y = dragY;
      const hovered = Phaser.Geom.Rectangle.Contains(slotBounds, dragX, dragY);
      slotGlow.setFillStyle(0xe1bb73, hovered ? 0.12 : 0.06);
    });

    batteryToken.on("dragend", () => {
      if (batteryLocked) {
        return;
      }

      if (Phaser.Geom.Rectangle.Contains(slotBounds, batteryToken.x, batteryToken.y)) {
        batteryInserted = true;
        batteryLocked = true;
        slotGlow.setFillStyle(0xe1bb73, 0.18);
        this.tweens.add({
          targets: batteryToken,
          x: 0,
          y: 56,
          duration: 220,
          ease: "quad.out",
        });
        this.showMessage("Батарея вошла в разъём. Теперь подай питание кнопкой справа.");
      } else {
        slotGlow.setFillStyle(0xe1bb73, 0.06);
        this.tweens.add({
          targets: batteryToken,
          x: startPosition.x,
          y: startPosition.y,
          duration: 180,
          ease: "quad.out",
        });
      }
    });

    bootButton.setInteractive();
    bootButton.on("pointerdown", () => {
      if (!batteryInserted) {
        this.showMessage("Сначала вставь батарею в гнездо.");
        return;
      }

      this.tweens.add({
        targets: [bootButton, bootRing],
        scaleX: 0.88,
        scaleY: 0.88,
        duration: 90,
        yoyo: true,
        ease: "quad.inOut",
      });
      screenText.setText("BOOTING");
      screenText.setColor("#9fd9e4");
      this.time.delayedCall(260, () => {
        screenText.setText("ONLINE");
        screenText.setColor("#b6f1c4");
        this.session.puzzleState.serviceConsole.batteryInstalled = true;
        this.removeInventoryItem("battery");
        this.session.serviceProgress.consoleUsed = false;
        this.showNarration("Батарея встала в разъём. Пульт ожил и теперь показывает схему внутренних проходов.");
        this.time.delayedCall(360, () => {
          this.closeOverlay();
          this.syncHud();
        });
      });
    });

    this.tweens.add({
      targets: slotGlow,
      alpha: 0.2,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.overlayContent.add([housing, screen, slotGlow, slot, bootButton, bootRing, label, bootText, screenText, batteryToken]);
  }
}
