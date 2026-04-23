import {
  getNorthBayObjective,
  hasResolvedNorthBayScene,
} from "../data/progressionText.js";
import { northBayInteractables } from "../data/towerData.js";
import {
  buildNorthBayEnvironment,
  createNorthBayGround,
  updateNorthBayAmbient,
} from "../render/expansionArt.js";
import {
  createWakePlayer,
  updateWakePlayerVisuals,
} from "../render/wakeArt.js";
import { PreviewSceneBase } from "./PreviewSceneBase.js";
import { getPreviewSession } from "../state/previewSession.js";

const KEEPER_LINE_COLOR = "#2a2218";
const HERO_LINE_COLOR = "#1b2329";

export class NorthBayScene extends PreviewSceneBase {
  constructor() {
    super("north-bay-preview");
    this.entry = "from-bay";
    this.dialogueActive = false;
  }

  init(data) {
    this.entry = data?.entry ?? "from-bay";
    this.dialogueActive = false;
  }

  create() {
    this.session = getPreviewSession();
    this.session.stage = "north-bay";

    if (!this.session.northBayProgress) {
      this.session.northBayProgress = {
        lanternChecked: false,
        keeperApproached: false,
        accusationMade: false,
        gearFound: false,
      };
    }

    buildNorthBayEnvironment(this);
    createNorthBayGround(this);
    createWakePlayer(this);
    this.placePlayer();
    this.createCamera();
    this.setupSceneChrome(northBayInteractables, (target) => this.handleInteraction(target));
    this.playSceneIntro(
      "Северная бухта",
      "Сырые камни и погасший фонарь. У расщелины, прислонившись к скале, сидит смотритель."
    );
  }

  update(time) {
    updateNorthBayAmbient(this, time);
    this.syncGearPropVisibility();

    if (this.overlayActive || this.dialogueActive) {
      this.playerBody.body.setVelocityX(0);
      this.updatePrompt(null);
      return;
    }

    this.updatePlayerMovement();
    updateWakePlayerVisuals(this);
    this.updateScenePrompt();
  }

  syncGearPropVisibility() {
    const progress = this.session.northBayProgress ?? {};
    const shouldShow = Boolean(progress.accusationMade && !progress.gearFound);

    if (this.northBayGearProp) {
      this.northBayGearProp.setVisible(shouldShow);
    }

    if (this.northBayGearGlow) {
      this.northBayGearGlow.setVisible(shouldShow);
    }
  }

  getStageLabel() {
    return "Северная бухта";
  }

  getObjectiveText() {
    return getNorthBayObjective(this.session);
  }

  createCamera() {
    this.configureWorldCamera(620, 0, 1000, 720, 160, 90);
  }

  placePlayer() {
    this.playerBody.setPosition(820, 526);
  }

  handleInteraction(target) {
    switch (target.id) {
      case "north-bay-return":
        this.session.stage = "bay";
        this.transitionToScene(
          "bay-preview",
          { entry: "from-north-bay" },
          "Скрытая бухта",
          "Ты возвращаешься тем же путём, что и пришёл."
        );
        break;
      case "broken-lantern":
        this.session.northBayProgress.lanternChecked = true;
        this.focusOnInteractable(target, () => this.openLanternOverlay(), {
          zoom: 1.08,
          duration: 180,
          hold: 80,
        });
        break;
      case "keeper":
        if (!this.session.northBayProgress.lanternChecked) {
          this.showNarration("Сначала разгляди фонарь — так понятнее, о чём разговаривать.");
          break;
        }
        this.session.northBayProgress.keeperApproached = true;
        this.runKeeperDialogue();
        break;
      case "brass-gear":
        if (!this.session.northBayProgress.accusationMade) {
          this.showNarration("Обломок блестит в стороне, но сначала договори со смотрителем.");
          break;
        }
        this.session.northBayProgress.gearFound = true;
        this.addInventoryItem("brassGear");
        this.showNarration("Латунная шестерёнка. В фонаре смотрителя такой детали быть не должно — её принёс чужой.");
        this.syncHud();
        if (hasResolvedNorthBayScene(this.session)) {
          this.time.delayedCall(2400, () => {
            this.showNarration("Смотритель прав: ищи, где на маяке подменили механизм. Возвращайся наверх.");
          });
        }
        break;
      default:
        break;
    }
  }

  openLanternOverlay() {
    this.openOverlay(
      "Погасший фонарь",
      "Стекло цело, масло есть, но механизм подаёт искру не в такт. Кто-то сбил фазу зажигания до шторма."
    );

    const body = this.add.container(0, 20);
    const post = this.add.rectangle(0, 60, 14, 140, 0x2b221a, 1).setStrokeStyle(2, 0x74553a, 0.4);
    const cage = this.add.rectangle(0, -18, 120, 150, 0x141b22, 0.92).setStrokeStyle(3, 0x7a8b96, 0.32);
    const glass = this.add.rectangle(0, -18, 86, 118, 0x20313d, 0.7).setStrokeStyle(2, 0xb5c7d0, 0.2);
    const wick = this.add.rectangle(0, -14, 4, 24, 0x2a1e14, 1);
    const extinct = this.add.circle(0, -30, 7, 0x4a3822, 1);
    const spark = this.add.circle(0, -42, 4, 0xd7c087, 0.0);

    body.add([post, cage, glass, wick, extinct, spark]);
    this.overlayContent.add(body);

    this.tweens.add({
      targets: spark,
      alpha: 0.8,
      duration: 260,
      yoyo: true,
      repeat: 4,
      ease: "quad.inOut",
      onComplete: () => spark.setAlpha(0),
    });

    this.showNarration("Фазу зажигания сбили ещё до шторма. Если бы не это, корабль увидел бы свет.");
  }

  runKeeperDialogue() {
    if (this.dialogueActive) {
      return;
    }

    this.dialogueActive = true;
    this.playerBody.body.setVelocity(0, 0);

    const lines = [
      {
        speaker: "Герой",
        color: HERO_LINE_COLOR,
        text: "Вы не упали. Вас вывели из строя специально. Следы у камней — чужие, и клочок ткани совпадает с курткой того, кто поднимался к маяку до шторма.",
        hold: 4200,
      },
      {
        speaker: "Смотритель",
        color: KEEPER_LINE_COLOR,
        text: "Я тоже так подумал. Сигнал сбили до того, как ударила волна. Если бы фонарь горел — корабль не сел бы на мель. Кто-то хотел, чтобы он именно там и оказался.",
        hold: 4600,
      },
      {
        speaker: "Смотритель",
        color: KEEPER_LINE_COLOR,
        text: "В механизме торчал обломок чужой шестерёнки. Я вытащил его, пока не потерял сознание. Он где-то рядом, в камнях.",
        hold: 4000,
      },
      {
        speaker: "Герой",
        color: HERO_LINE_COLOR,
        text: "Значит, на маяк поднимался человек со своим железом. Я найду, где он оставил след, и пойму, кому это было нужно.",
        hold: 3800,
      },
    ];

    this.playDialogueLines(lines, () => {
      this.session.northBayProgress.accusationMade = true;
      this.dialogueActive = false;
      this.syncHud();
      this.showNarration("Новая цель: осмотреть обломок шестерёнки, а потом вернуться на маяк.");
    });
  }

  playDialogueLines(lines, onComplete) {
    const next = (index) => {
      if (index >= lines.length) {
        if (this.dialogueBubble) {
          this.dialogueBubble.setVisible(false);
        }
        if (this.dialogueBubbleNameplate) {
          this.dialogueBubbleNameplate.setText("Герой").setColor("#6f5433");
        }
        if (this.dialogueBubbleText) {
          this.dialogueBubbleText.setColor(HERO_LINE_COLOR);
        }
        onComplete?.();
        return;
      }

      const line = lines[index];
      if (this.dialogueBubbleNameplate) {
        this.dialogueBubbleNameplate.setText(line.speaker);
      }
      if (this.dialogueBubbleText) {
        this.dialogueBubbleText.setColor(line.color);
      }

      this.showMessage(line.text);

      if (this.hideMessageEvent) {
        this.time.removeEvent(this.hideMessageEvent);
        this.hideMessageEvent = null;
      }

      this.time.delayedCall(line.hold, () => next(index + 1));
    };

    next(0);
  }

}
