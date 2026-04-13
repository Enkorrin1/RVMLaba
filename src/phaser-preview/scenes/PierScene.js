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
    this.setupSceneChrome(pierInteractables, (target) => this.handleInteraction(target));
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
    return "Нижняя пристань";
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

        this.session.stage = "bay";
        this.session.progressStage = "bay";
        this.focusOnInteractable(target, () => {
          this.transitionToScene(
            "bay-preview",
            { entry: "from-pier" },
            "Скрытая бухта",
            "Через морской створ открывается узкая тропа между скалами, где прибой почти не добивает до берега."
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
          this.emitWorldPulse(1724, 510, {
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
          this.emitWorldPulse(1000, 564, {
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
}
