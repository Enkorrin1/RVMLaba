import {
  getPierObjective,
  hasResolvedPierScene,
} from "../data/progressionText.js";
import { pierInteractables } from "../data/towerData.js";
import {
  buildPierEnvironment,
  createPierGround,
  updatePierAmbient,
} from "../render/expansionArt.js";
import {
  createWakePlayer,
  updateWakePlayerVisuals,
} from "../render/wakeArt.js";
import { PreviewSceneBase } from "./PreviewSceneBase.js";
import { getPreviewSession } from "../state/previewSession.js";

const Phaser = window.Phaser;

export class PierScene extends PreviewSceneBase {
  constructor() {
    super("pier-preview");
    this.entry = "from-tunnel";
  }

  init(data) {
    this.entry = data?.entry ?? "from-tunnel";
  }

  create() {
    this.session = getPreviewSession();
    this.session.stage = "pier";

    buildPierEnvironment(this);
    createPierGround(this);
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
    this.registerInteractables(pierInteractables, (target) => this.handleInteraction(target));
    this.bindCommonResize();
    this.refreshInventoryBar();
    this.syncHud();
    this.playSceneIntro(
      "Нижняя пристань",
      "Здесь море уже почти касается железа. Ялик, лебёдка и тяжёлый створ собирают ощущение спешного бегства."
    );
  }

  update(time) {
    updatePierAmbient(this, time);

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
    return "Phaser Preview: нижняя пристань";
  }

  getObjectiveText() {
    return getPierObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(620, 0, 1180, 720, 160, 90);
  }

  placePlayer() {
    this.playerBody.setPosition(this.entry === "from-bay" ? 1540 : 760, 526);
  }

  handleInteraction(target) {
    switch (target.id) {
      case "pier-return-door":
        this.session.stage = "tunnel";
        this.transitionToScene(
          "tunnel-preview",
          { entry: "from-pier" },
          "Восточный тоннель",
          "Сырой проход снова уводит под скалу и прячет море за каменной толщей."
        );
        break;
      case "skiff":
        this.session.pierProgress.skiffChecked = true;
        if (!this.session.inventory.includes("boatHook")) {
          this.addInventoryItem("boatHook");
          this.showNarration("На дне ялика лежит короткий багор. Он поможет подцепить мокрый засов у воды.");
        } else {
          this.showNarration("Ялик привязан наспех и весь мокрый от солёных брызг. На дне остались пустой фонарь и следы грязи.");
        }
        break;
      case "rope-winch":
        this.session.pierProgress.ropeFound = true;
        this.showNarration(
          hasResolvedPierScene(this.session)
            ? "На барабане не хватает троса, а на металле видны свежие порезы. Кто-то спускался к воде в спешке."
            : "Трос на лебёдке обрезан и уходит в темноту под скалы. Нужно осмотреть ещё и ялик."
        );
        break;
      case "sea-gate":
        this.session.pierProgress.gateChecked = true;
        if (!this.session.puzzleState.seaGate.released) {
          if (this.session.selectedItemId === "boatHook") {
            this.openSeaGateOverlay();
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

        this.session.stage = "bay";
        this.session.progressStage = "bay";
        this.transitionToScene(
          "bay-preview",
          { entry: "from-pier" },
          "Скрытая бухта",
          "Через морской створ открывается узкая тропа между скалами, где прибой почти не добивает до берега."
        );
        break;
      default:
        break;
    }
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
    const metalHook = this.add.arc(28, -16, 14, 210, 20, false, 0xa1bac6, 1).setLineWidth(5);
    const handle = this.add.rectangle(-34, 16, 24, 10, 0x6f4d38, 1).setAngle(-26);
    hookTool.add([shaft, metalHook, handle]);
    hookTool.setInteractive(new Phaser.Geom.Rectangle(-75, -26, 150, 52), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(hookTool);

    let hookAttached = false;
    let gateReleased = false;
    const attachZone = new Phaser.Geom.Circle(102, 0, 34);

    hookTool.on("drag", (_pointer, dragX, dragY) => {
      if (gateReleased) {
        return;
      }

      if (!hookAttached) {
        hookTool.x = dragX;
        hookTool.y = dragY;
        latchGlow.setFillStyle(0xe1bb73, Phaser.Geom.Circle.Contains(attachZone, dragX, dragY) ? 0.18 : 0.12);
        return;
      }

      const nextX = Phaser.Math.Clamp(dragX, -46, 58);
      hookTool.x = nextX;
      latch.x = 42 + (nextX - 14);
      staple.x = -26 + Math.max(0, nextX - 14) * 0.18;
    });

    hookTool.on("dragend", () => {
      if (gateReleased) {
        return;
      }

      if (!hookAttached) {
        if (Phaser.Geom.Circle.Contains(attachZone, hookTool.x, hookTool.y)) {
          hookAttached = true;
          instruction.setText("Теперь сорви засов влево");
          latchGlow.setFillStyle(0xe1bb73, 0.18);
          this.tweens.add({
            targets: hookTool,
            x: 14,
            y: 6,
            duration: 180,
            ease: "quad.out",
          });
        } else {
          latchGlow.setFillStyle(0xe1bb73, 0.12);
          this.tweens.add({
            targets: hookTool,
            x: -130,
            y: 62,
            duration: 180,
            ease: "quad.out",
          });
        }
        return;
      }

      if (hookTool.x <= -34) {
        gateReleased = true;
        this.tweens.add({
          targets: [hookTool, latch],
          x: "-=38",
          duration: 160,
          ease: "quad.out",
        });
        this.time.delayedCall(180, () => {
          this.session.puzzleState.seaGate.released = true;
          this.showNarration("Засов срывается с мокрым скрежетом. Морской створ теперь открыт.");
          this.time.delayedCall(220, () => {
            this.closeOverlay();
            this.syncHud();
          });
        });
      } else {
        this.tweens.add({
          targets: hookTool,
          x: 14,
          y: 6,
          duration: 140,
          ease: "quad.out",
        });
        this.tweens.add({
          targets: latch,
          x: 42,
          duration: 140,
          ease: "quad.out",
        });
        staple.x = -26;
      }
    });

    this.tweens.add({
      targets: latchGlow,
      alpha: 0.26,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.overlayContent.add([gate, staple, latch, latchGlow, instruction, hookTool]);
  }
}
