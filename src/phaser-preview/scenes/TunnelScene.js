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
      "Влага стекает по камню, впереди сипит аварийный сигнал, а сам тоннель больше похож на внутреннюю рану маяка, чем на обычный служебный ход."
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
          this.showNarration("Среди мокрого плаща висит служебный ключ. Он подходит к старым створкам и внутренним проходам.");
        } else {
          this.showNarration("Внутри остались только мокрый плащ, пустой держатель ключей и жетон прежнего смотрителя.");
        }
        break;
      case "signal":
        this.session.tunnelProgress.signalFound = true;
        this.showNarration(
          hasResolvedTunnelScene(this.session)
            ? "Передатчик сипит: «...восточный створ открыт, спускаюсь к воде». Теперь направление ясно."
            : "Передатчик повторяет обрывок: «...восточный створ открыт...». Нужно ещё собрать следы в самом тоннеле."
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
          this.showNarration("Сквозняк тянет со стороны моря, но уходить вслепую рано. Сначала внимательно осмотри тоннель.");
          break;
        }

        this.session.stage = "pier";
        this.session.progressStage = "pier";
        this.transitionToScene(
          "pier-preview",
          { entry: "from-tunnel" },
          "Нижняя пристань",
          "Тоннель заканчивается. Впереди скрытая внешняя сцена у самой воды, под телом маяка."
        );
        break;
      default:
        break;
    }
  }

  openExitUnlockOverlay() {
    this.openOverlay(
      "Замок прохода",
      "Возьми ключ, вставь его в скважину и затем доверни до упора, чтобы открыть проход к пристани."
    );

    const door = this.add.rectangle(0, 18, 390, 250, 0x2a3138, 0.96).setStrokeStyle(3, 0xd2b47b, 0.24);
    const lockBody = this.add.rectangle(0, 12, 116, 124, 0x1a2128, 1).setStrokeStyle(3, 0xe1bb73, 0.28);
    const shackle = this.add.arc(0, -30, 34, 180, 360, false, 0xc8b178, 1).setLineWidth(7);
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
}
