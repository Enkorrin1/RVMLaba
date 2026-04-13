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
        ? "Линза и шторка исправны. Теперь уже ясно: верхний ярус в порядке, а питание умирает где-то у генератора."
        : "Проверь стартер прожектора вручную. Если лампа даже не прогреется, значит башня не получает питание снизу."
    );

    const frame = this.add.container(0, 24);
    const shadow = this.add.ellipse(0, 152, 360, 34, 0x000000, 0.18);
    const plinth = this.add.rectangle(0, 84, 276, 92, 0x31434f, 1).setStrokeStyle(3, 0x90a6b2, 0.22);
    const housing = this.add.rectangle(0, 12, 184, 112, 0x405866, 1).setStrokeStyle(3, 0xcfe0e8, 0.14);
    const ringOuter = this.add.circle(0, -24, 76, 0x688395, 0.26).setStrokeStyle(8, 0xe2d09a, 0.26);
    const ringInner = this.add.circle(0, -24, 42, 0xf4d290, mechanismChecked ? 0.12 : 0.08);
    const starterBox = this.add.rectangle(144, 24, 84, 124, 0x202932, 1).setStrokeStyle(3, 0xaebfc6, 0.16);
    const starterTrack = this.add.rectangle(144, 12, 18, 82, 0x111a22, 1);
    const starterHandle = this.add.rectangle(144, mechanismChecked ? 36 : -6, 34, 16, 0xd7c087, 1).setStrokeStyle(2, 0x4d5b64, 0.46);
    const statusLabel = this.add.text(0, 174, mechanismChecked ? "Стартер щёлкнул вхолостую. Значит, верхний узел жив, а питающая цепь молчит внизу." : "Потяни стартерную рукоять вниз, чтобы проверить прожектор.", {
      fontFamily: "Georgia, serif",
      fontSize: "19px",
      color: "#f2e8d7",
      align: "center",
      wordWrap: { width: 620 },
    }).setOrigin(0.5);
    const starterHint = this.add.text(144, 106, mechanismChecked ? "Стартер проверен" : "Стартер", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#d7c087",
      align: "center",
      wordWrap: { width: 92 },
    }).setOrigin(0.5);

    frame.add([
      shadow,
      plinth,
      housing,
      ringOuter,
      ringInner,
      starterBox,
      starterTrack,
      starterHandle,
      starterHint,
      statusLabel,
    ]);
    this.overlayContent.add(frame);

    this.createOverlayRectHotspot(144, 36, 84, 140, {
      pointerover: () => starterHandle.setFillStyle(0xe5c784, 1),
      pointerout: () => starterHandle.setFillStyle(0xd7c087, 1),
      pointerdown: () => {
        if (this.session.lanternProgress.mechanismChecked) {
          this.showMessage("Стартер уже проверен. Прожектору не хватает питания, а не обслуживания.");
          return;
        }

        this.session.lanternProgress.mechanismChecked = true;
        this.emitWorldPulse(1352, 448, {
          color: 0xf1d08a,
          radius: 32,
          scale: 3.4,
          duration: 820,
        });
        this.cameras.main.shake(180, 0.0018);
        this.tweens.add({
          targets: starterHandle,
          y: 38,
          duration: 160,
          yoyo: true,
          ease: "quad.out",
        });
        this.tweens.add({
          targets: ringInner,
          alpha: 0.22,
          scaleX: 1.14,
          scaleY: 1.14,
          duration: 120,
          yoyo: true,
          repeat: 1,
        });
        this.showNarration("Стартер отвечает глухим щелчком, но лампа не прогревается. Значит, проблема не здесь, а в подаче питания снизу.");
        this.time.delayedCall(220, () => this.openLampMechanismOverlay());
      },
    });

    this.syncHud();
  }
}
