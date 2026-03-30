import {
  getTunnelObjective,
  hasResolvedTunnelScene,
} from "../data/progressionText.js";
import { tunnelInteractables } from "../data/towerData.js";
import {
  buildTunnelEnvironment,
  createTunnelGround,
  updateTunnelAmbient,
} from "../render/expansionArt.js";
import {
  createWakePlayer,
  updateWakePlayerVisuals,
} from "../render/wakeArt.js";
import { PreviewSceneBase } from "./PreviewSceneBase.js";
import { getPreviewSession } from "../state/previewSession.js";

const Phaser = window.Phaser;

export class TunnelScene extends PreviewSceneBase {
  constructor() {
    super("tunnel-preview");
    this.entry = "from-service";
  }

  init(data) {
    this.entry = data?.entry ?? "from-service";
  }

  create() {
    this.session = getPreviewSession();
    this.session.stage = "tunnel";

    buildTunnelEnvironment(this);
    createTunnelGround(this);
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
    this.registerInteractables(tunnelInteractables, (target) => this.handleInteraction(target));
    this.bindCommonResize();
    this.refreshInventoryBar();
    this.syncHud();
    this.playSceneIntro(
      "Восточный тоннель",
      "Влага стекает по камню, а впереди шипит аварийный сигнал. Это уже не башня, а её скрытая внутренняя рана."
    );
  }

  update(time) {
    updateTunnelAmbient(this, time);

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
    return "Phaser Preview: восточный тоннель";
  }

  getObjectiveText() {
    return getTunnelObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(620, 0, 1180, 720, 160, 90);
  }

  placePlayer() {
    this.playerBody.setPosition(this.entry === "from-pier" ? 1620 : 760, 526);
  }

  handleInteraction(target) {
    switch (target.id) {
      case "service-return-door":
        this.session.stage = "service";
        this.transitionToScene(
          "service-preview",
          { entry: "from-tunnel" },
          "Служебный уровень",
          "Дверь снова выводит в тесный технический отсек под башней."
        );
        break;
      case "locker":
        this.session.tunnelProgress.lockerOpened = true;
        if (!this.session.inventory.includes("serviceKey")) {
          this.addInventoryItem("serviceKey");
          this.showNarration("Среди мокрого плаща висит служебный ключ. Он подходит к старым створкам и проходам.");
        } else {
          this.showNarration("Внутри мокрый плащ, пустой держатель ключей и жетон прежнего смотрителя.");
        }
        break;
      case "signal":
        this.session.tunnelProgress.signalFound = true;
        this.showNarration(
          hasResolvedTunnelScene(this.session)
            ? "Передатчик шипит: «...восточный створ открыт, спускаюсь к воде». Теперь направление ясно."
            : "Передатчик повторяет обрывок: «...восточный створ открыт...». Нужны ещё следы."
        );
        break;
      case "tunnel-exit":
        this.session.tunnelProgress.exitChecked = true;
        if (!this.session.puzzleState.tunnelExit.unlocked) {
          if (this.session.selectedItemId === "serviceKey") {
            this.openExitUnlockOverlay();
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
          this.showNarration("Сквозняк тянет со стороны моря, но уходить вслепую рано. Сначала нужно осмотреть тоннель внимательнее.");
          break;
        }

        this.session.stage = "pier";
        this.session.progressStage = "pier";
        this.transitionToScene(
          "pier-preview",
          { entry: "from-tunnel" },
          "Нижняя пристань",
          "Тоннель заканчивается. Впереди скрыта внешняя сцена у самой воды, под телом маяка."
        );
        break;
      default:
        break;
    }
  }

  openExitUnlockOverlay() {
    this.openOverlay(
      "Замок прохода",
      "Вставь служебный ключ в скважину и затем проверни его до упора, чтобы открыть проход к пристани."
    );

    const door = this.add.rectangle(0, 18, 360, 240, 0x2a3138, 0.96).setStrokeStyle(3, 0xd2b47b, 0.24);
    const lockBody = this.add.rectangle(0, 12, 104, 112, 0x1a2128, 1).setStrokeStyle(3, 0xe1bb73, 0.28);
    const shackle = this.add.arc(0, -26, 30, 180, 360, false, 0xc8b178, 1).setLineWidth(6);
    const keyholeGlow = this.add.circle(0, 26, 18, 0xe1bb73, 0.08).setStrokeStyle(3, 0xe1bb73, 0.32);
    const keyhole = this.add.circle(0, 26, 10, 0x0d1419, 1).setStrokeStyle(2, 0x5d707b, 0.26);
    const lockLabel = this.add.text(0, 110, "Вставь ключ в скважину", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#dce6e9",
    }).setOrigin(0.5);

    const keyToken = this.add.container(-132, 48).setSize(110, 52);
    const ring = this.add.circle(-26, 0, 11, 0xc8b178, 0).setStrokeStyle(4, 0xc8b178, 1);
    const shaft = this.add.rectangle(10, 0, 56, 8, 0xc8b178, 1);
    const toothA = this.add.rectangle(28, -6, 8, 12, 0xc8b178, 1);
    const toothB = this.add.rectangle(38, 6, 8, 12, 0xc8b178, 1);
    const keyHint = this.add.text(0, 22, "Ключ", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    keyToken.add([ring, shaft, toothA, toothB, keyHint]);
    keyToken.setInteractive(new Phaser.Geom.Rectangle(-55, -26, 110, 52), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(keyToken);

    let keyInserted = false;
    let unlockTriggered = false;
    const keyholeZone = new Phaser.Geom.Circle(0, 26, 34);

    keyToken.on("drag", (_pointer, dragX, dragY) => {
      if (unlockTriggered || keyInserted) {
        return;
      }
      keyToken.x = dragX;
      keyToken.y = dragY;
      keyholeGlow.setFillStyle(0xe1bb73, Phaser.Geom.Circle.Contains(keyholeZone, dragX, dragY) ? 0.16 : 0.08);
    });

    keyToken.on("dragend", () => {
      if (unlockTriggered) {
        return;
      }

      if (Phaser.Geom.Circle.Contains(keyholeZone, keyToken.x, keyToken.y)) {
        keyInserted = true;
        keyHint.setText("Поверни");
        lockLabel.setText("Теперь поверни ключ");
        keyholeGlow.setFillStyle(0xe1bb73, 0.18);
        this.input.setDraggable(keyToken, false);
        this.tweens.add({
          targets: keyToken,
          x: 8,
          y: 26,
          duration: 200,
          ease: "quad.out",
        });
        keyToken.on("pointerdown", () => {
          if (!keyInserted || unlockTriggered) {
            return;
          }
          unlockTriggered = true;
          this.tweens.add({
            targets: keyToken,
            angle: 92,
            duration: 280,
            ease: "quad.out",
          });
          this.tweens.add({
            targets: shackle,
            y: shackle.y - 22,
            alpha: 0.65,
            duration: 280,
            ease: "quad.out",
          });
          this.time.delayedCall(280, () => {
            this.session.puzzleState.tunnelExit.unlocked = true;
            this.showNarration("Замок щёлкает. Проход к нижней пристани открыт.");
            this.time.delayedCall(220, () => {
              this.closeOverlay();
              this.syncHud();
            });
          });
        });
      } else {
        keyholeGlow.setFillStyle(0xe1bb73, 0.08);
        this.tweens.add({
          targets: keyToken,
          x: -132,
          y: 48,
          duration: 180,
          ease: "quad.out",
        });
      }
    });

    this.tweens.add({
      targets: keyholeGlow,
      alpha: 0.22,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.overlayContent.add([door, lockBody, shackle, keyholeGlow, keyhole, lockLabel, keyToken]);
  }
}
