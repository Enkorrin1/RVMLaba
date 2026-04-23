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
    this.setupSceneChrome(bayInteractables, (target) => this.handleInteraction(target));
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
    return "Скрытая бухта";
  }

  getObjectiveText() {
    return getBayObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(620, 0, 1000, 720, 160, 90);
  }

  placePlayer() {
    const x = this.entry === "from-north-bay" ? 1520 : 760;
    this.playerBody.setPosition(x, 526);
  }

  goToNorthBay() {
    if (this.sceneTransitionActive) {
      return;
    }
    this.session.stage = "north-bay";
    this.session.progressStage = "north-bay";
    this.transitionToScene(
      "north-bay-preview",
      { entry: "from-bay" },
      "Северная бухта",
      "Следы уводят выше по скале, к расщелине, где плещется прибой."
    );
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
        this.focusOnInteractable(target, () => this.openCampfireOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "cache":
        this.session.bayProgress.cacheOpened = true;
        this.focusOnInteractable(target, () => this.openCacheOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "footprints":
        if (!hasResolvedBayScene(this.session)) {
          this.showNarration("Следы тянутся выше по скале, но картина пока неполная. Осмотри лагерь в бухте.");
          break;
        }
        if (this.session.bayProgress.footprintsAnalyzed) {
          this.goToNorthBay();
          break;
        }
        this.focusOnInteractable(target, () => this.openFootprintAnalysisOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
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
        this.session.bayProgress.footprintsAnalyzed = true;
        const finalText = this.add.text(0, 188, "Теперь ясно: кто-то был здесь совсем недавно и ушёл к северной бухте.", {
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: "#f2e8d7",
          align: "center",
          wordWrap: { width: 520 },
        }).setOrigin(0.5);
        this.overlayContent.add(finalText);
        this.emitWorldPulse(1568, 558, {
          color: 0xe1bb73,
          radius: 20,
          scale: 2.8,
          duration: 760,
        });
        this.showNarration("След почти прямой: идём к северной бухте.");
        this.time.delayedCall(1800, () => {
          if (this.overlayActive) {
            this.closeOverlay();
          }
        });
        this.time.delayedCall(2200, () => this.goToNorthBay());
      }
    };

    const bootPrint = this.add.ellipse(-156, 26, 44, 18, 0x1d2225, 0.58).setAngle(-28);
    const printGlow = this.add.ellipse(-156, 26, 66, 30, 0xe1bb73, 0.08).setAngle(-28);
    this.createOverlayRectHotspot(-156, 26, 74, 38, {
      pointerover: () => printGlow.setFillStyle(0xe1bb73, 0.12),
      pointerout: () => printGlow.setFillStyle(0xe1bb73, 0.08),
      pointerdown: () => {
        printGlow.setFillStyle(0xe1bb73, 0.18);
        registerClue("print", "Отпечаток глубокий и свежий. Значит, человек шёл быстро и совсем недавно.");
      },
    });

    const cloth = this.add.triangle(26, -10, 0, 0, 34, 8, 8, 28, 0x8f7461, 1).setAngle(14);
    const clothGlow = this.add.circle(26, -10, 28, 0xe1bb73, 0.08);
    this.createOverlayRectHotspot(26, -10, 60, 60, {
      pointerover: () => clothGlow.setFillStyle(0xe1bb73, 0.12),
      pointerout: () => clothGlow.setFillStyle(0xe1bb73, 0.08),
      pointerdown: () => {
        clothGlow.setFillStyle(0xe1bb73, 0.18);
        registerClue("cloth", "Клочок ткани ещё влажный от солёного ветра. Его сорвало со снаряжения совсем недавно.");
      },
    });

    const route = this.add.line(0, 0, 174, 40, 238, -18, 0xc8e3ea, 0.9).setStrokeStyle(4, 0xc8e3ea, 0.9);
    const routeGlow = this.add.circle(206, 10, 34, 0xe1bb73, 0.08);
    this.createOverlayRectHotspot(206, 10, 104, 86, {
      pointerover: () => routeGlow.setFillStyle(0xe1bb73, 0.12),
      pointerout: () => routeGlow.setFillStyle(0xe1bb73, 0.08),
      pointerdown: () => {
        routeGlow.setFillStyle(0xe1bb73, 0.18);
        registerClue("route", "Следы уходят вверх по сухой кромке скалы. Значит, путь ведёт дальше к северной бухте.");
      },
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

  openCampfireOverlay() {
    this.openOverlay(
      "Потухший костёр",
      "Костёр погас давно, но камни ещё сложены аккуратно. Здесь не случайная стоянка, а чьё-то укрытие на несколько ночей."
    );

    const body = this.add.container(0, 26);
    const pit = this.add.ellipse(0, 44, 260, 90, 0x253039, 0.96).setStrokeStyle(3, 0x7f5d42, 0.18);
    const emberA = this.add.circle(-18, 22, 14, 0x5c4939, 1);
    const emberB = this.add.circle(12, 18, 16, 0x7f5d42, 1);
    const emberGlow = this.add.ellipse(0, 18, 118, 38, 0xc8844a, 0.08);
    body.add([pit, emberGlow, emberA, emberB]);
    this.overlayContent.add(body);

    this.tweens.add({
      targets: emberGlow,
      alpha: 0.16,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.showNarration("Костёр давно погас, но камни вокруг ещё уложены аккуратно. Кто-то прятался здесь не одну ночь.");
  }

  openCacheOverlay() {
    this.openOverlay(
      "Тайник под тентом",
      "Под тентом спрятан аккуратный запас. Это уже не случайные вещи, а подготовленная точка отхода."
    );

    const body = this.add.container(0, 24);
    const tarp = this.add.triangle(-26, -28, 0, 0, 110, 0, 54, -102, 0x6d8270, 0.8);
    const crate = this.add.rectangle(16, 34, 142, 78, 0x6c533d, 1).setStrokeStyle(3, 0xd7c59c, 0.18);
    const map = this.add.rectangle(-16, 22, 84, 46, 0xd8d0bd, 1).setStrokeStyle(2, 0x7a6a56, 0.32).setAngle(-10);
    const bandage = this.add.rectangle(52, 18, 46, 18, 0xd7d3cb, 1).setAngle(8);
    const ration = this.add.rectangle(72, 48, 30, 20, 0x8f7461, 1);
    body.add([tarp, crate, map, bandage, ration]);
    this.overlayContent.add(body);

    this.showNarration(
      hasResolvedBayScene(this.session)
        ? "Под тентом спрятаны сухие карты и записка: «Если свет включится, встречаемся у северной бухты до рассвета»."
        : "Под тентом спрятаны сухари, бинт и обрывок карты. Нужно осмотреть бухту внимательнее."
    );
  }
}
