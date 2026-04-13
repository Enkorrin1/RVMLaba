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
    this.setupSceneChrome(tunnelInteractables, (target) => this.handleInteraction(target));
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
    return "Восточный тоннель";
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

        this.session.stage = "pier";
        this.session.progressStage = "pier";
        this.focusOnInteractable(target, () => {
          this.transitionToScene(
            "pier-preview",
            { entry: "from-tunnel" },
            "Нижняя пристань",
            "Тоннель заканчивается. Впереди скрытая внешняя сцена у самой воды, под телом маяка."
          );
        }, {
          zoom: 1.08,
          duration: 180,
          hold: 90,
        });
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
          this.emitWorldPulse(1726, 520, {
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
          this.emitWorldPulse(1012, 550, {
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
        this.emitWorldPulse(1484, 528, {
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
}
