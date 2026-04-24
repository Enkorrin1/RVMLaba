import { getLanternObjective } from "../data/progressionText.js";
import { lanternInteractables } from "../data/towerData.js";
import {
  buildLanternEnvironment,
  createLanternGround,
  updateLanternAmbient,
} from "../render/towerArt.js";
import {
  createWakePlayer,
  updateWakePlayerVisuals,
} from "../render/wakeArt.js";
import { PreviewSceneBase } from "./PreviewSceneBase.js";
import { getPreviewSession } from "../state/previewSession.js";

export class LanternScene extends PreviewSceneBase {
  constructor() {
    super("lantern-preview");
    this.entry = "from-wake";
  }

  init(data) {
    this.entry = data?.entry ?? "from-wake";
  }

  create() {
    this.session = getPreviewSession();
    this.session.stage = "lantern";

    buildLanternEnvironment(this);
    createLanternGround(this);
    createWakePlayer(this);
    this.placePlayer();
    this.createCamera();
    this.setupSceneChrome(lanternInteractables, (target) => this.handleInteraction(target));
    this.playSceneIntro(
      "Фонарный ярус",
      "Над головой тяжёлая линза, под ногами холодный металл. Если свет не рождается здесь, значит поломка прячется внизу."
    );
  }

  update(time) {
    updateLanternAmbient(this, time);

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
    return "Фонарный ярус";
  }

  getObjectiveText() {
    return getLanternObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(420, 0, 1380, 720, 160, 90);
  }

  placePlayer() {
    this.playerBody.setPosition(this.entry === "from-wake" ? 780 : 780, 526);
  }

  handleInteraction(target) {
    if (target.id === "lantern-ladder-down") {
      this.session.stage = "wake";
      this.transitionToScene(
        "wake-preview",
        { entry: "from-lantern" },
        "Жилая комната маяка",
        "Снизу снова пахнет сырой древесиной, керосином и морской солью."
      );
      return;
    }

    if (target.id === "lamp-mechanism") {
      this.focusOnInteractable(target, () => this.openLampMechanismOverlay(), {
        zoom: 1.09,
        duration: 200,
        hold: 80,
      });
    }
  }

  openLampMechanismOverlay() {
    const mechanismChecked = this.session.lanternProgress.mechanismChecked;
    this.openOverlay(
      "Прожектор",
      mechanismChecked
        ? "Линза и шторка целые. Стартер откликается, но лампа не прогревается — питание умирает где-то внизу, у генератора."
        : "Потяни стартер вниз. Если лампа даже не затеплится — проблема не здесь, а в подаче питания от генератора."
    );

    // === Backdrop / platform ===
    const backdrop = this.add.rectangle(0, 10, 540, 280, 0x0a141c, 0.96).setStrokeStyle(2, 0x3a5a6a, 0.4);
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, 0x1c2e3c, 0.55);
    for (let gx = -250; gx <= 250; gx += 40) {
      gridGfx.beginPath(); gridGfx.moveTo(gx, -120); gridGfx.lineTo(gx, 130); gridGfx.strokePath();
    }
    this.overlayContent.add([backdrop, gridGfx]);

    // Floor shadow + plinth
    const shadow = this.add.ellipse(0, 128, 380, 24, 0x000000, 0.48);
    const plinthBack = this.add.rectangle(0, 80, 300, 20, 0x1a2a34, 1);
    const plinth = this.add.rectangle(0, 70, 288, 80, 0x31434f, 1).setStrokeStyle(3, 0x90a6b2, 0.3);
    const plinthHighlight = this.add.rectangle(0, 40, 268, 4, 0xcfe0e8, 0.18);
    // Bolts
    const plinthBolts = this.add.graphics();
    plinthBolts.fillStyle(0xa0b0ba, 0.7);
    [-122, -40, 40, 122].forEach((ox) => plinthBolts.fillCircle(ox, 100, 3));
    this.overlayContent.add([shadow, plinthBack, plinth, plinthHighlight, plinthBolts]);

    // Lamp housing (cylindrical, with fin ridges)
    const housingBack = this.add.rectangle(0, -8, 198, 130, 0x2a3a44, 1);
    const housing = this.add.rectangle(0, -8, 184, 118, 0x405866, 1).setStrokeStyle(3, 0xcfe0e8, 0.22);
    // Cooling fins
    const fins = this.add.graphics();
    fins.fillStyle(0x2f3e48, 0.9);
    [-74, -52, -30, 30, 52, 74].forEach((ox) => {
      fins.fillRect(ox - 3, -58, 4, 100);
    });
    // Top cap
    const cap = this.add.rectangle(0, -62, 190, 10, 0x2a3a44, 1).setStrokeStyle(2, 0xcfe0e8, 0.28);
    this.overlayContent.add([housingBack, housing, fins, cap]);

    // Lens ring with reflector (outer glass + inner filament area)
    const ringOuter = this.add.circle(0, -28, 80, 0x4a6470, 0.42).setStrokeStyle(8, 0xe2d09a, 0.5);
    const ringFresnel = this.add.graphics();
    // Fresnel ring concentric circles
    ringFresnel.lineStyle(1, 0xcfe0e8, 0.45);
    [20, 34, 48, 62].forEach((r) => ringFresnel.strokeCircle(0, -28, r));
    const ringInner = this.add.circle(0, -28, 42, 0xf4d290, mechanismChecked ? 0.18 : 0.04);
    const filament = this.add.rectangle(0, -28, 22, 2, 0xf4d290, mechanismChecked ? 0.55 : 0.12);
    const filamentV = this.add.rectangle(0, -28, 2, 22, 0xf4d290, mechanismChecked ? 0.55 : 0.12);
    // Cold/dead tint when not checked: blue overlay
    const deadTint = this.add.circle(0, -28, 42, 0x2a4a6a, mechanismChecked ? 0 : 0.28);
    this.overlayContent.add([ringOuter, ringFresnel, ringInner, filament, filamentV, deadTint]);

    // Status LEDs on housing (power / arc / overheat)
    const ledPower = this.add.circle(-68, 34, 4, mechanismChecked ? 0xd46462 : 0x2a1410, 1).setStrokeStyle(1, 0x8a2020, 0.6);
    const ledArc   = this.add.circle(-48, 34, 4, 0x1a1a1a, 1).setStrokeStyle(1, 0x4a4a4a, 0.55);
    const ledOver  = this.add.circle(-28, 34, 4, 0x1a1a1a, 1).setStrokeStyle(1, 0x4a4a4a, 0.55);
    const ledLabel = this.add.text(-48, 50, "PWR  ARC  HOT", {
      fontFamily: "monospace", fontSize: "6.5px", color: "#7a8a94", letterSpacing: 1,
    }).setOrigin(0.5);
    this.overlayContent.add([ledPower, ledArc, ledOver, ledLabel]);

    // === Starter box (right side) ===
    const starterBox = this.add.rectangle(164, 8, 94, 160, 0x1a2028, 1).setStrokeStyle(3, 0xaebfc6, 0.28);
    const starterFaceplate = this.add.rectangle(164, -46, 74, 22, 0x2a3540, 1);
    const starterModel = this.add.text(164, -46, "ST-7", {
      fontFamily: "monospace", fontSize: "10px", color: "#d7c087", letterSpacing: 1,
    }).setOrigin(0.5);
    const starterTrack = this.add.rectangle(164, 12, 22, 96, 0x0c141a, 1).setStrokeStyle(2, 0x5a7080, 0.4);
    // Notches
    const notchTop = this.add.rectangle(164, -28, 30, 3, 0x5a7080, 0.7);
    const notchBtm = this.add.rectangle(164, 52, 30, 3, 0x5a7080, 0.7);
    const starterHandle = this.add.rectangle(164, mechanismChecked ? 52 : -28, 40, 18, 0xd7c087, 1).setStrokeStyle(2, 0x4d5b64, 0.55);
    const starterGrip = this.add.graphics();
    starterGrip.fillStyle(0x4d3a24, 0.5);
    [-8, 0, 8].forEach((oy) => {
      starterGrip.fillRect(164 - 16, (mechanismChecked ? 52 : -28) + oy - 1, 32, 2);
    });
    const starterHint = this.add.text(164, 100, mechanismChecked ? "Стартер проверен" : "СТАРТЕР", {
      fontFamily: "monospace", fontSize: "11px", color: "#d7c087", letterSpacing: 1.5,
    }).setOrigin(0.5);
    this.overlayContent.add([starterBox, starterFaceplate, starterModel, starterTrack, notchTop, notchBtm, starterHandle, starterGrip, starterHint]);

    // Spark spawn area (in front of the lens, triggered on pull)
    const sparkGfx = this.add.graphics();
    this.overlayContent.add(sparkGfx);

    // Status label at bottom
    const statusBand = this.add.rectangle(0, 170, 500, 32, 0x0d1419, 0.88).setStrokeStyle(1, 0x5a7080, 0.3);
    const statusLabel = this.add.text(0, 170, mechanismChecked
      ? "Стартер щёлкнул вхолостую. Линза и шторка в порядке — значит, питание теряется внизу."
      : "Потяни рукоять стартера вниз, чтобы проверить прожектор.", {
      fontFamily: "Georgia, serif", fontSize: "14px", color: "#e6ddc4", align: "center",
      wordWrap: { width: 470 },
    }).setOrigin(0.5);
    this.overlayContent.add([statusBand, statusLabel]);

    this.createOverlayRectHotspot(164, 12, 96, 160, {
      pointerover: () => { if (!this.session.lanternProgress.mechanismChecked) starterHandle.setFillStyle(0xe5c784, 1); },
      pointerout: () => { if (!this.session.lanternProgress.mechanismChecked) starterHandle.setFillStyle(0xd7c087, 1); },
      pointerdown: () => {
        if (this.session.lanternProgress.mechanismChecked) {
          this.showMessage("Стартер уже проверен. Прожектору не хватает питания, а не обслуживания.");
          return;
        }

        this.session.lanternProgress.mechanismChecked = true;
        this.session.beats.lighthouseTried = true;
        this.emitWorldPulse(1352, 448, { color: 0xf1d08a, radius: 32, scale: 3.4, duration: 820 });
        this.cameras.main.shake(180, 0.0018);

        // Lever slams down to bottom notch
        this.tweens.add({
          targets: [starterHandle, starterGrip], y: 52, duration: 140, ease: "back.in",
        });
        // Power LED turns red immediately (trying to draw power)
        ledPower.setFillStyle(0xd46462, 1);
        ledPower.setStrokeStyle(1, 0xff8080, 1);
        // Arc LED blinks once
        this.time.delayedCall(100, () => {
          ledArc.setFillStyle(0xd7c087, 1);
          ledArc.setStrokeStyle(1, 0xe1bb73, 1);
          this.tweens.add({ targets: ledArc, alpha: 0.3, duration: 90, yoyo: true, repeat: 2 });
        });
        // Filament tries to heat up: briefly glow warm then die out
        this.tweens.add({
          targets: [filament, filamentV], alpha: 0.75, duration: 180, yoyo: false,
          onComplete: () => {
            this.tweens.add({ targets: [filament, filamentV], alpha: 0.08, duration: 520, ease: "quad.out" });
          },
        });
        this.tweens.add({
          targets: ringInner, alpha: 0.3, scaleX: 1.18, scaleY: 1.18, duration: 180, yoyo: false,
          onComplete: () => {
            this.tweens.add({ targets: ringInner, alpha: 0.04, scaleX: 1, scaleY: 1, duration: 540, ease: "quad.out" });
          },
        });
        // A few ephemeral sparks shoot out of the filament and fade
        for (let i = 0; i < 6; i += 1) {
          this.time.delayedCall(120 + i * 40, () => {
            const sx = Phaser.Math.Between(-24, 24);
            const sy = -28 + Phaser.Math.Between(-14, 14);
            const spark = this.add.circle(sx, sy, 1.6, 0xf4d290, 1);
            this.overlayContent.add(spark);
            this.tweens.add({
              targets: spark,
              x: sx + Phaser.Math.Between(-40, 40),
              y: sy + Phaser.Math.Between(-30, 30),
              alpha: 0, duration: 320 + Math.random() * 100,
              onComplete: () => spark.destroy(),
            });
          });
        }
        // Dead-tint fades so the lens looks "cold / cleared"
        this.tweens.add({ targets: deadTint, alpha: 0.14, duration: 700, delay: 300 });
        // Replace status label
        this.time.delayedCall(720, () => {
          statusLabel.setText("Стартер щёлкнул вхолостую. Линза и шторка в порядке — значит, питание теряется внизу.");
        });

        this.showNarration("Рукоять срывается вниз — щелчок, вспышка в лампе и тишина. Верхний узел жив, но питание обрывается где-то между ним и генератором.");
        this.time.delayedCall(900, () => this.syncHud());
      },
    });

    this.syncHud();
  }
}
