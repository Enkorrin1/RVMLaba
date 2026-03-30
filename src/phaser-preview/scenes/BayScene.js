import {
  getBayObjective,
  hasResolvedBayScene,
} from "../data/progressionText.js";
import { bayInteractables } from "../data/towerData.js";
import {
  buildBayEnvironment,
  createBayGround,
  updateBayAmbient,
} from "../render/expansionArt.js";
import {
  createWakePlayer,
  updateWakePlayerVisuals,
} from "../render/wakeArt.js";
import { PreviewSceneBase } from "./PreviewSceneBase.js";
import { getPreviewSession } from "../state/previewSession.js";

const Phaser = window.Phaser;

export class BayScene extends PreviewSceneBase {
  constructor() {
    super("bay-preview");
    this.entry = "from-pier";
  }

  init(data) {
    this.entry = data?.entry ?? "from-pier";
  }

  create() {
    this.session = getPreviewSession();
    this.session.stage = "bay";

    buildBayEnvironment(this);
    createBayGround(this);
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
    this.registerInteractables(bayInteractables, (target) => this.handleInteraction(target));
    this.bindCommonResize();
    this.refreshInventoryBar();
    this.syncHud();
    this.playSceneIntro(
      "Скрытая бухта",
      "Здесь шторм почти не достаёт берега. Остались только костёр, тайник и свежие следы того, за кем мы идём."
    );
  }

  update(time) {
    updateBayAmbient(this, time);

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
    return "Phaser Preview: скрытая бухта";
  }

  getObjectiveText() {
    return getBayObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(620, 0, 1000, 720, 160, 90);
  }

  placePlayer() {
    this.playerBody.setPosition(760, 526);
  }

  handleInteraction(target) {
    switch (target.id) {
      case "bay-return-gate":
        this.session.stage = "pier";
        this.transitionToScene(
          "pier-preview",
          { entry: "from-bay" },
          "Нижняя пристань",
          "Тропа между скалами снова выводит к воде у подножия маяка."
        );
        break;
      case "campfire":
        this.session.bayProgress.campSeen = true;
        this.showNarration("Костёр давно погас, но камни вокруг ещё уложены аккуратно. Кто-то прятался здесь не одну ночь.");
        break;
      case "cache":
        this.session.bayProgress.cacheOpened = true;
        this.showNarration(
          hasResolvedBayScene(this.session)
            ? "Под тентом спрятаны сухие карты и записка: «Если свет включится, встречаемся у северной бухты до рассвета»."
            : "Под тентом спрятаны сухари, бинт и обрывок карты. Нужно осмотреть бухту внимательнее."
        );
        break;
      case "footprints":
        if (!hasResolvedBayScene(this.session)) {
          this.showNarration("Следы тянутся выше по скале, но картина пока неполная. Осмотри лагерь в бухте.");
          break;
        }
        this.openFootprintAnalysisOverlay();
        break;
      default:
        break;
    }
  }

  openFootprintAnalysisOverlay() {
    this.openOverlay(
      "Следы на камнях",
      "Осмотри все улики в крупном плане. Только так можно понять, куда именно ушёл смотритель."
    );

    const board = this.add.rectangle(0, 26, 560, 260, 0x17212a, 0.96).setStrokeStyle(3, 0xe1bb73, 0.2);
    const stoneA = this.add.ellipse(-146, 34, 150, 74, 0x41535a, 1).setAngle(-10);
    const stoneB = this.add.ellipse(22, 6, 182, 84, 0x4a5d66, 1).setAngle(8);
    const stoneC = this.add.ellipse(188, 60, 166, 72, 0x41535a, 1).setAngle(-12);
    const status = this.add.text(0, 154, "Найдено улик: 0 / 3", {
      fontFamily: "Georgia, serif",
      fontSize: "20px",
      color: "#dce6e9",
    }).setOrigin(0.5);
    this.overlayContent.add([board, stoneA, stoneB, stoneC, status]);

    let found = 0;
    const foundSet = new Set();
    const registerClue = (id, message) => {
      if (foundSet.has(id)) {
        return;
      }
      foundSet.add(id);
      found += 1;
      status.setText(`Найдено улик: ${found} / 3`);
      this.showMessage(message);
      if (found === 3) {
        const finalText = this.add.text(0, 188, "Теперь ясно: смотритель жив и ушёл к северной бухте совсем недавно.", {
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: "#f2e8d7",
          align: "center",
          wordWrap: { width: 520 },
        }).setOrigin(0.5);
        this.overlayContent.add(finalText);
        this.showNarration("След почти прямой: смотритель ушёл к северной бухте совсем недавно.");
      }
    };

    const bootPrint = this.add.ellipse(-156, 26, 44, 18, 0x1d2225, 0.58).setAngle(-28).setInteractive();
    const printGlow = this.add.ellipse(-156, 26, 66, 30, 0xe1bb73, 0.08).setAngle(-28);
    bootPrint.on("pointerdown", () => {
      printGlow.setFillStyle(0xe1bb73, 0.18);
      registerClue("print", "Отпечаток глубокий и свежий. Значит, человек шёл быстро и совсем недавно.");
    });

    const cloth = this.add.triangle(26, -10, 0, 0, 34, 8, 8, 28, 0x8f7461, 1).setAngle(14).setInteractive();
    const clothGlow = this.add.circle(26, -10, 28, 0xe1bb73, 0.08);
    cloth.on("pointerdown", () => {
      clothGlow.setFillStyle(0xe1bb73, 0.18);
      registerClue("cloth", "Клочок ткани ещё влажный от солёного ветра. Его сорвало со снаряжения совсем недавно.");
    });

    const route = this.add.line(0, 0, 174, 40, 238, -18, 0xc8e3ea, 0.9).setLineWidth(4).setInteractive(
      new Phaser.Geom.Rectangle(160, -26, 92, 82),
      Phaser.Geom.Rectangle.Contains
    );
    const routeGlow = this.add.circle(206, 10, 34, 0xe1bb73, 0.08);
    route.on("pointerdown", () => {
      routeGlow.setFillStyle(0xe1bb73, 0.18);
      registerClue("route", "Следы уходят вверх по сухой кромке скалы. Значит, путь ведёт дальше к северной бухте.");
    });

    this.tweens.add({
      targets: [printGlow, clothGlow, routeGlow],
      alpha: 0.18,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.overlayContent.add([printGlow, clothGlow, routeGlow, bootPrint, cloth, route]);
  }
}
