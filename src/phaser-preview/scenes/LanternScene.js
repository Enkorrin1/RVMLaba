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
    this.createPromptBubble();
    this.createWorldFocusMarker();
    this.createMessagePanel();
    this.createOverlayLayer();
    this.createTransitionLayer();
    this.createInventoryBar();
    this.bindCommonKeys();
    this.registerInteractables(lanternInteractables, (target) => this.handleInteraction(target));
    this.bindCommonResize();
    this.refreshInventoryBar();
    this.syncHud();
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
    return "Phaser Preview: фонарный ярус";
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
        "Комната смотрителя",
        "Снизу снова пахнет сырой древесиной, керосином и морской солью."
      );
      return;
    }

    if (target.id === "lamp-mechanism") {
      this.session.lanternProgress.mechanismChecked = true;
      this.openOverlay(
        "Прожектор",
        "Линза чистая, шторка открыта, но лампа холодная. Поломка не здесь: маяку не хватает питания снизу."
      );

      const body = this.add.container(0, 32);
      body.add([
        this.add.ellipse(0, 124, 320, 44, 0x000000, 0.18),
        this.add.rectangle(0, 56, 230, 82, 0x31434f, 1).setStrokeStyle(3, 0x90a6b2, 0.22),
        this.add.rectangle(0, -2, 156, 100, 0x405866, 1).setStrokeStyle(3, 0xcfe0e8, 0.14),
        this.add.circle(0, -30, 68, 0x688395, 0.24).setStrokeStyle(6, 0xe2d09a, 0.22),
        this.add.circle(0, -30, 38, 0xf4d290, 0.08),
        this.add.text(0, 164, "Тепла нет. Значит, генератор молчит.", {
          fontFamily: "Georgia, serif",
          fontSize: "20px",
          color: "#f2e8d7",
        }).setOrigin(0.5),
      ]);
      this.overlayContent.add(body);
      this.syncHud();
    }
  }
}
