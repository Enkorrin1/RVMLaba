const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const objectiveNode = document.getElementById("objective");
const hintNode = document.getElementById("hint");
const inventoryNode = document.getElementById("inventory");
const stageNode = document.getElementById("stage");
const chapterOverlayNode = document.getElementById("chapterOverlay");
const chapterTitleNode = document.getElementById("chapterTitle");
const chapterTextNode = document.getElementById("chapterText");
const chapterButtonNode = document.getElementById("chapterButton");

function resizeCanvas() {
  canvas.width = Math.max(1, window.innerWidth);
  canvas.height = Math.max(1, window.innerHeight);
}

const world = {
  width: 5400,
  height: 720,
  gravity: 1800,
  seaLevel: 620,
};

const stageOrder = ["wake", "shore", "lighthouse", "generator", "ending", "epilogue", "service", "tunnel", "pier", "bay"];

const stageMeta = {
  wake: {
    label: "Комната смотрителя",
    objective: "Цель: осмотреть комнату и понять, как ты оказался внутри маяка.",
  },
  lantern: {
    label: "Фонарный ярус",
    objective: "Цель: подняться к прожектору и понять, почему маяк не работает.",
  },
  shore: {
    label: "Башня",
    objective: "Цель: осмотреть маяк и понять, что здесь произошло до твоего пробуждения.",
  },
  lighthouse: {
    label: "Маяк",
    objective: "Цель: найти путь к техническому уровню маяка.",
  },
  generator: {
    label: "Генераторная",
    objective: "Цель: добраться до генератора и восстановить питание.",
  },
  ending: {
    label: "Финал главы",
    objective: "Цель выполнена: маяк снова работает.",
  },
  epilogue: {
    label: "Следующая вахта",
    objective: "Новая цель: найти служебный люк и спуститься во внутренние помещения маяка.",
  },
  service: {
    label: "Служебный уровень",
    objective: "Цель: осмотреть нижние помещения и понять, куда исчез смотритель.",
  },
  tunnel: {
    label: "Восточный тоннель",
    objective: "Цель: пройти по восточному тоннелю и найти след пропавшего смотрителя.",
  },
  pier: {
    label: "Нижняя пристань",
    objective: "Цель: осмотреть нижнюю пристань и выяснить, куда ушёл смотритель.",
  },
  bay: {
    label: "Скрытая бухта",
    objective: "Цель: исследовать скрытую бухту и найти последние следы смотрителя.",
  },
};

const player = {
  x: 860,
  y: 526,
  width: 46,
  height: 74,
  vx: 0,
  vy: 0,
  speed: 320,
  jumpStrength: 760,
  grounded: false,
  facing: 1,
};

const camera = {
  x: 0,
  y: 0,
  zoom: 1,
  targetZoom: 1,
};

const wakeRoomVisual = {
  outerX: 700,
  outerY: 184,
  outerWidth: 1320,
  outerHeight: 416,
  innerX: 744,
  innerY: 214,
  innerWidth: 1240,
  innerHeight: 358,
  floorY: 572,
  floorHeight: 28,
};

const wakeRoomBounds = {
  left: wakeRoomVisual.innerX,
  right: wakeRoomVisual.innerX + wakeRoomVisual.innerWidth,
};

const wakeDoorBounds = {
  x: wakeRoomVisual.innerX + wakeRoomVisual.innerWidth - 38,
  y: 398,
  width: 34,
  height: 176,
};

const lanternRoomVisual = {
  outerX: 2160,
  outerY: 164,
  outerWidth: 1000,
  outerHeight: 436,
  innerX: 2204,
  innerY: 196,
  innerWidth: 912,
  innerHeight: 376,
  floorY: 572,
  floorHeight: 28,
};

const lanternRoomBounds = {
  left: lanternRoomVisual.innerX,
  right: lanternRoomVisual.innerX + lanternRoomVisual.innerWidth,
};

const serviceRoomVisual = {
  outerX: 2800,
  outerY: 176,
  outerWidth: 1340,
  outerHeight: 424,
  innerX: 2850,
  innerY: 208,
  innerWidth: 1240,
  innerHeight: 368,
  floorY: 572,
  floorHeight: 28,
};

const serviceRoomBounds = {
  left: serviceRoomVisual.innerX,
  right: serviceRoomVisual.innerX + serviceRoomVisual.innerWidth,
};

const tunnelRoomVisual = {
  outerX: 3560,
  outerY: 170,
  outerWidth: 1260,
  outerHeight: 430,
  innerX: 3612,
  innerY: 204,
  innerWidth: 1156,
  innerHeight: 370,
  floorY: 572,
  floorHeight: 28,
};

const tunnelRoomBounds = {
  left: tunnelRoomVisual.innerX,
  right: tunnelRoomVisual.innerX + tunnelRoomVisual.innerWidth,
};

const isolatedSceneBounds = {
  service: serviceRoomBounds,
  tunnel: tunnelRoomBounds,
  pier: { left: 4440, right: 5080 },
  bay: { left: 5090, right: 5400 },
};

const input = {
  left: false,
  right: false,
  jump: false,
  interact: false,
};

const interactionRange = 54;
const hotbarSlotCount = 9;
const inventoryColumns = 9;
const inventoryRows = 3;
const inventorySlotCount = inventoryColumns * inventoryRows;
const containerColumns = 9;
const containerRows = 3;
const containerSlotCount = containerColumns * containerRows;

const gameState = {
  lastTime: 0,
  worldTime: 0,
  activeMessage: "Голова гудит. Как ты вообще оказался здесь, в комнате смотрителя, среди чужих вещей?",
  currentObjective: stageMeta.wake.objective,
  interactionCooldown: 0,
  discovered: new Set(),
  inventory: {
    battery: false,
    fuse: false,
    note: false,
    logbook: false,
    valveWheel: false,
    screwdriver: false,
    serviceKey: false,
    boatHook: false,
  },
  inventorySlots: Array.from({ length: inventorySlotCount }, () => null),
  inventoryOpen: false,
  inventoryCursor: 0,
  selectedItemId: null,
  openDocumentItemId: null,
  containerOpen: false,
  activeContainerId: null,
  containerSlots: {
    clutter: Array.from({ length: containerSlotCount }, (_, index) => (index === 10 ? "battery" : null)),
    toolbox: Array.from({ length: containerSlotCount }, (_, index) => (index === 4 ? "fuse" : null)),
  },
  dragState: null,
  mousePosition: { x: 0, y: 0 },
  sceneTransition: {
    active: false,
    timer: 0,
    duration: 0,
    title: "",
    text: "",
  },
  endingUnlocked: false,
  stage: "wake",
  progressStage: "wake",
  chapterOverlayVisible: false,
  puzzleState: {
    toolbox: {
      panelOpened: false,
    },
    generator: {
      panelOpened: false,
      fuseInstalled: false,
      valveWheelInstalled: false,
    },
    serviceConsole: {
      batteryInstalled: false,
    },
    serviceDoor: {
      panelOpened: false,
    },
    tunnelExit: {
      unlocked: false,
    },
    seaGate: {
      released: false,
    },
  },
  serviceProgress: {
    logbookRead: false,
    consoleUsed: false,
    doorChecked: false,
  },
  tunnelProgress: {
    lockerOpened: false,
    signalFound: false,
    exitChecked: false,
  },
  pierProgress: {
    skiffChecked: false,
    ropeFound: false,
    gateChecked: false,
  },
  bayProgress: {
    campSeen: false,
    cacheOpened: false,
  },
  wakeProgress: {
    cluesChecked: false,
    leavesMoved: false,
  },
  shoreProgress: {
    toolboxChecked: false,
  },
  lanternProgress: {
    mechanismChecked: false,
  },
  selfCheck: {
    runs: 0,
    lastContext: "",
    lastPassed: true,
    lastIssues: [],
  },
};

const movementHintText = "Управление: A/D или стрелки для движения, I или Tab для инвентаря, E для взаимодействия.";
const inventoryHintText = "Инвентарь: I или Esc закрыть, стрелки или WASD двигать курсор, Enter выбрать предмет.";
const containerHintText = "Контейнер: мышью перетаскивай предметы между ящиком и инвентарём. Esc, E или I закрыть.";
const documentHintText = "Документ: Esc, Enter или I закрыть.";

const requiredDomNodes = [
  ["canvas", canvas],
  ["objective", objectiveNode],
  ["hint", hintNode],
  ["inventory", inventoryNode],
  ["stage", stageNode],
  ["chapterOverlay", chapterOverlayNode],
  ["chapterTitle", chapterTitleNode],
  ["chapterText", chapterTextNode],
  ["chapterButton", chapterButtonNode],
];

const inventoryCatalog = {
  battery: {
    label: "Батарея",
    description: "Рабочая батарея для сервисного пульта на нижнем уровне маяка.",
    useHint: "Подходит для сервисного пульта.",
  },
  fuse: {
    label: "Предохранитель",
    description: "Силовой предохранитель для запуска резервного генератора.",
    useHint: "Подходит для генератора.",
  },
  note: {
    label: "Записка",
    description: "Короткая записка с инструкцией по запуску резервного генератора.",
    useHint: "Это заметка. Её можно перечитать, но применять никуда не нужно.",
    readable: true,
    documentTitle: "Записка",
    documentText: "Запуск резервного генератора только после замены предохранителя и открытия топливного клапана.",
  },
  logbook: {
    label: "Журнал дежурств",
    description: "Журнал смотрителя с последней записью о шагах у цистерны и закрытом тоннеле.",
    useHint: "Это документ. Он хранит подсказку, но не вставляется в механизмы.",
    readable: true,
    documentTitle: "Журнал дежурств",
    documentText: "Последняя запись: 'Шаги снова у цистерны. Если не вернусь, дверь в восточный тоннель должна остаться закрытой'.",
  },
  valveWheel: {
    label: "Штурвал клапана",
    description: "Штурвал, который открывает подачу топлива к генератору.",
    useHint: "Подходит для генератора.",
  },
  screwdriver: {
    label: "Отвёртка",
    description: "Плоская отвёртка с морской солью на рукояти. Ей можно снимать крышки и расшивать старые панели.",
    useHint: "Подходит для крышек, щитков и заевших сервисных отсеков.",
  },
  serviceKey: {
    label: "Служебный ключ",
    description: "Потемневший ключ с жетоном смотрителя. Он должен открывать служебные створки внутри тоннеля.",
    useHint: "Похоже, подходит к дверям и створкам служебных проходов.",
  },
  boatHook: {
    label: "Багор",
    description: "Короткий багор из ялика. Им удобно подцеплять засовы и мокрые тросы.",
    useHint: "Подходит для створов, петель и всего, до чего нельзя дотянуться рукой.",
  },
};

const containerCatalog = {
  clutter: {
    title: "Ящик под столом",
  },
  toolbox: {
    title: "Инструментальный ящик",
  },
};

const puzzleDefinitions = {
  toolbox: {
    title: "Инструментальный ящик",
    stateKey: "toolbox",
    steps: [
      {
        itemId: "screwdriver",
        progressKey: "panelOpened",
        successText: "Ты выкручиваешь два прикипевших винта. Крышка инструментального ящика наконец поддаётся.",
        alreadyText: "Крышка ящика уже снята.",
        keepItem: true,
      },
    ],
    onSolved() {
      gameState.shoreProgress.toolboxChecked = true;
      return {
        text: "Под крышкой виден силовой предохранитель и ржавый набор гаечных ключей.",
        objective: getGeneratorObjective(),
      };
    },
    getHint() {
      return getGeneratorObjective();
    },
  },
  generator: {
    title: "Резервный генератор",
    stateKey: "generator",
    steps: [
      {
        itemId: "screwdriver",
        progressKey: "panelOpened",
        successText: "Ты снимаешь сервисную крышку генератора. Теперь можно добраться до силового отсека и топливного клапана.",
        alreadyText: "Сервисная крышка генератора уже снята.",
        keepItem: true,
      },
      {
        itemId: "fuse",
        progressKey: "fuseInstalled",
        requires: ["panelOpened"],
        successText: "Предохранитель встаёт на место в силовом щитке генератора.",
        alreadyText: "Предохранитель уже установлен в генератор.",
      },
      {
        itemId: "valveWheel",
        progressKey: "valveWheelInstalled",
        requires: ["panelOpened"],
        successText: "Ты закрепляешь штурвал и открываешь подачу топлива к генератору.",
        alreadyText: "Штурвал уже установлен на топливный клапан.",
      },
    ],
    onSolved() {
      gameState.endingUnlocked = true;
      gameState.discovered.add("generator-online");
      updateInventory();
      advanceStage("ending");
      openChapterOverlay(
        "Маяк снова горит",
        "Резервный генератор ожил, и луч маяка рассёк туман над островом. Это конец первой сцены и вход в следующую главу."
      );
      return {
        text: "Двигатель вздрагивает и оживает. Свет маяка прорезает туман: первая часть прототипа завершена.",
        objective: stageMeta.ending.objective,
      };
    },
    getHint() {
      return getGeneratorObjective();
    },
  },
  "service-console": {
    title: "Сервисный пульт",
    stateKey: "serviceConsole",
    steps: [
      {
        itemId: "battery",
        progressKey: "batteryInstalled",
        successText: "Ты вставляешь батарею в сервисный пульт, и экран медленно оживает.",
        alreadyText: "Батарея уже подключена к сервисному пульту.",
      },
    ],
    onSolved() {
      gameState.serviceProgress.consoleUsed = true;
      return {
        text: "Экран сервисного пульта оживает. На схеме маяка видно, что восточный тоннель был заблокирован вручную с другой стороны.",
        objective: getServiceObjective(),
      };
    },
    getHint() {
      return getServiceObjective();
    },
  },
  "sealed-door": {
    title: "Запертая дверь",
    stateKey: "serviceDoor",
    steps: [
      {
        itemId: "screwdriver",
        progressKey: "panelOpened",
        successText: "Ты снимаешь жестяной щиток с дверной цепи. Теперь видно, как зацеплен запор.",
        alreadyText: "Щиток с дверной цепи уже снят.",
        keepItem: true,
      },
    ],
    onSolved() {
      return {
        text: "Теперь дверь можно изучить внимательнее, но без остальных подсказок ломиться дальше всё ещё опасно.",
        objective: getServiceObjective(),
      };
    },
    getHint() {
      return getServiceObjective();
    },
  },
  "tunnel-exit": {
    title: "Выход к нижней пристани",
    stateKey: "tunnelExit",
    steps: [
      {
        itemId: "serviceKey",
        progressKey: "unlocked",
        successText: "Служебный ключ входит в старый замок. Засов внутри тоннельного выхода мягко отходит.",
        alreadyText: "Замок выхода к пристани уже открыт.",
        keepItem: true,
      },
    ],
    onSolved() {
      return {
        text: "Теперь проход к нижней пристани больше не заперт изнутри.",
        objective: getTunnelObjective(),
      };
    },
    getHint() {
      return getTunnelObjective();
    },
  },
  "sea-gate": {
    title: "Морской створ",
    stateKey: "seaGate",
    steps: [
      {
        itemId: "boatHook",
        progressKey: "released",
        successText: "Ты подцепляешь багром мокрый засов и срываешь его вниз. Створ готов открыться.",
        alreadyText: "Засов морского створа уже сорван.",
        keepItem: true,
      },
    ],
    onSolved() {
      return {
        text: "Теперь морской створ держится только на тяжёлой петле и откроется, если путь действительно готов.",
        objective: getPierObjective(),
      };
    },
    getHint() {
      return getPierObjective();
    },
  },
};

const wakePlatforms = [
  { x: wakeRoomBounds.left, y: 600, width: wakeRoomBounds.right - wakeRoomBounds.left, height: 120, type: "ground" },
];

const lanternPlatforms = [
  { x: lanternRoomBounds.left, y: 600, width: lanternRoomBounds.right - lanternRoomBounds.left, height: 120, type: "ground" },
];

const platforms = [
  { x: 0, y: 610, width: 540, height: 120, type: "pier" },
  { x: 470, y: 560, width: 210, height: 36, type: "gangway" },
  { x: 720, y: 600, width: 2080, height: 130, type: "shore" },
];

const servicePlatforms = [
  { x: serviceRoomBounds.left, y: 600, width: serviceRoomBounds.right - serviceRoomBounds.left, height: 120, type: "ground" },
];

const tunnelPlatforms = [
  { x: tunnelRoomBounds.left, y: 600, width: tunnelRoomBounds.right - tunnelRoomBounds.left, height: 120, type: "ground" },
];

const pierPlatforms = [
  { x: 4440, y: 600, width: 620, height: 120, type: "dock" },
];

const bayPlatforms = [
  { x: 5100, y: 600, width: 300, height: 120, type: "ground" },
  { x: 5330, y: 580, width: 70, height: 140, type: "rock" },
];

const interactables = [
  {
    id: "bed",
    x: 810,
    y: 542,
    width: 136,
    height: 58,
    title: "Кровать",
    exactStage: "wake",
    onInteract() {
      return {
        text: "Одеяло сырое и солёное. Похоже, тебя уложили сюда уже после шторма, пока ты был без сознания.",
        objective: "Цель: осмотреть комнату и найти признаки того, кто был здесь до тебя.",
      };
    },
  },
  {
    id: "clutter",
    x: 1114,
    y: 504,
    width: 188,
    height: 96,
    title: "Стол смотрителя",
    exactStage: "wake",
    onInteract() {
      openContainerPanel("clutter");
      return {
        text: isContainerEmpty("clutter")
          ? "Ты выдвигаешь ящик тяжёлого стола смотрителя. Внутри уже пусто."
          : "В выдвижном ящике рабочего стола лежит батарея, рядом с мокрыми квитанциями и старым фонарём.",
        objective: getWakeObjective(),
      };
    },
  },
  {
    id: "battery",
    x: 1188,
    y: 540,
    width: 24,
    height: 34,
    title: "Батарея",
    exactStage: "wake",
    hidden: true,
    onInteract() {
      addInventoryItem("battery");
      return {
        text: "Ты поднимаешь батарею и убираешь её в инвентарь. Она ещё пригодится для сервисного пульта.",
        objective: getWakeObjective(),
      };
    },
  },
  {
    id: "footprints-room",
    x: 930,
    y: 576,
    width: 510,
    height: 24,
    title: "Следы",
    exactStage: "wake",
    onInteract() {
      gameState.wakeProgress.cluesChecked = true;
      return {
        text: "Грязные следы тянутся от кровати через комнату к лестнице и дальше к выходу. Значит, кто-то был здесь совсем недавно и ушёл в спешке.",
        objective: getWakeObjective(),
      };
    },
  },
  {
    id: "leaf-pile",
    x: 1438,
    y: 560,
    width: 88,
    height: 40,
    title: "Сухие листья",
    exactStage: "wake",
    onInteract() {
      if (!gameState.wakeProgress.leavesMoved) {
        gameState.wakeProgress.leavesMoved = true;
        addInventoryItem("screwdriver");
        return {
          text: "Под слежавшимися листьями и песком пряталась отвёртка. Кто-то бросил её у стены второпях.",
          objective: getWakeObjective(),
        };
      }

      return {
        text: "Листья уже разворошены. Под ними только пыль, соль и след от недавно вытащенного инструмента.",
        objective: getWakeObjective(),
      };
    },
  },
  {
    id: "room-door",
    x: wakeDoorBounds.x,
    y: wakeDoorBounds.y,
    width: wakeDoorBounds.width,
    height: wakeDoorBounds.height,
    title: "Выход наружу",
    exactStage: "wake",
    onInteract() {
      if (!gameState.wakeProgress.cluesChecked) {
        return {
          text: "Рука уже на двери, но уходить вслепую рано. Сначала стоит понять, кто оставил тебя в комнате смотрителя.",
          objective: stageMeta.wake.objective,
        };
      }

      const firstExit = !isStageAtLeast("shore");
      advanceStage("shore");
      startSceneTransition(
        "Основание маяка",
        "Комната смотрителя остаётся позади. Ветер сразу бьёт в лицо, а башня теперь ощущается как единое место: снизу, внутри и наверху."
      );
      teleportPlayer(900, 526);
      return {
        text: "Ты выходишь на наружную площадку у основания маяка. Позади остаются кровать, следы и тесная жилая секция внутри башни.",
        objective: firstExit ? stageMeta.shore.objective : getSurfaceObjective(),
      };
    },
  },
  {
    id: "tower-ladder",
    x: 1560,
    y: 312,
    width: 84,
    height: 288,
    title: "Лестница наверх",
    exactStage: "wake",
    onInteract() {
      switchSceneStage("lantern");
      startSceneTransition(
        "Фонарный ярус",
        "Металлическая лестница выводит к сердцу маяка, туда, где должен оживать прожектор."
      );
      teleportPlayer(2280, 526);
      return {
        text: "Ты поднимаешься выше, в фонарный ярус под самой линзой маяка.",
        objective: getLanternObjective(),
      };
    },
  },
  {
    id: "lantern-ladder-down",
    x: 2260,
    y: 316,
    width: 82,
    height: 284,
    title: "Лестница вниз",
    exactStage: "lantern",
    onInteract() {
      switchSceneStage("wake");
      startSceneTransition(
        "Комната смотрителя",
        "Снизу снова пахнет сырой древесиной, керосином и морской солью."
      );
      teleportPlayer(1538, 526);
      return {
        text: "Ты спускаешься обратно в жилой ярус маяка.",
        objective: getWakeObjective(),
      };
    },
  },
  {
    id: "lamp-mechanism",
    x: 2818,
    y: 438,
    width: 166,
    height: 132,
    title: "Прожектор",
    exactStage: "lantern",
    onInteract() {
      gameState.lanternProgress.mechanismChecked = true;
      if (gameState.endingUnlocked) {
        return {
          text: "Линза дрожит от тепла, и прожектор снова жив. Сверху видно, как луч режет туман над морем.",
          objective: "Цель: можно спуститься обратно и продолжить исследование маяка.",
        };
      }

      return {
        text: "Линза чистая, шторка прожектора открыта, но сама лампа холодная. Значит, поломка не здесь: маяку не хватает питания снизу.",
        objective: getLanternObjective(),
      };
    },
  },
  {
    id: "lighthouse-door",
    x: 925,
    y: 470,
    width: 70,
    height: 130,
    title: "Вход в маяк",
    stageRequirement: "shore",
    onInteract() {
      switchSceneStage("wake");
      teleportPlayer(1760, 526);
      startSceneTransition(
        "Комната смотрителя",
        "Ты снова входишь в жилую секцию смотрителя. Изнутри башня читается как жилой ярус, лестница наверх и наружный выход."
      );
      return {
        text: "Наружная дверь снова ведёт внутрь маяка, в комнату смотрителя у основания башни.",
        objective: getWakeObjective(),
      };
    },
  },
  {
    id: "boat",
    x: 88,
    y: 545,
    width: 120,
    height: 56,
    title: "Лодка",
    text: "Шторм потрепал лодку. Обратного пути сейчас нет.",
    objective: "Цель: осмотреть берег и войти в маяк.",
  },
  {
    id: "crate",
    x: 350,
    y: 560,
    width: 60,
    height: 50,
    title: "Ящики",
    text: "На ящиках метка портовой службы. Тебя явно прислали сюда срочно.",
    objective: "Цель: подняться ко входу в маяк.",
    onInteract() {
      advanceStage("shore");
      return {
        text: "На ящиках метка портовой службы. Тебя явно прислали сюда срочно.",
        objective: "Цель: подняться ко входу в маяк.",
      };
    },
  },
  {
    id: "note",
    x: 985,
    y: 544,
    width: 40,
    height: 28,
    title: "Записка",
    once: true,
    text: "Запуск резервного генератора только после замены предохранителя и открытия топливного клапана.",
    objective: "Цель: найти предохранитель и штурвал клапана для генератора.",
    onInteract() {
      addInventoryItem("note");
      advanceStage("lighthouse");
      return {
        text: "Ты забираешь записку в инвентарь. В ней сказано: запуск резервного генератора только после замены предохранителя и открытия топливного клапана.",
        objective: "Цель: найти предохранитель и штурвал клапана для генератора.",
      };
    },
  },
  {
    id: "toolbox",
    x: 1250,
    y: 560,
    width: 58,
    height: 40,
    title: "Инструментальный ящик",
    onInteract() {
      gameState.shoreProgress.toolboxChecked = true;
      if (!gameState.puzzleState.toolbox.panelOpened) {
        return {
          text: gameState.inventory.screwdriver
            ? "Крышка ящика сидит на прикипевших винтах. Выбери отвёртку в инвентаре и сними крышку."
            : "Инструментальный ящик стянут винтами. Без отвёртки его не открыть.",
          objective: getGeneratorObjective(),
        };
      }

      openContainerPanel("toolbox");
      return {
        text: isContainerEmpty("toolbox")
          ? "Ты открываешь инструментальный ящик. Нужной детали внутри уже нет."
          : "Под слоем ржавых ключей в ящике лежит силовой предохранитель.",
        objective: getGeneratorObjective(),
      };
    },
  },
  {
    id: "fuse",
    x: 1270,
    y: 546,
    width: 30,
    height: 18,
    title: "Предохранитель",
    hidden: true,
    onInteract() {
      addInventoryItem("fuse");
      return {
        text: "Ты берёшь предохранитель и убираешь его в инвентарь. Теперь его можно будет установить в генератор.",
        objective: getGeneratorObjective(),
      };
    },
  },
  {
    id: "radio",
    x: 1515,
    y: 520,
    width: 64,
    height: 56,
    title: "Рация",
    text: "Помехи. Последние слова обрываются на фразе: 'Не спускайся туда один'.",
    objective: "Цель: добраться до генераторной и проверить питание.",
    onInteract() {
      advanceStage("generator");
      return {
        text: "Помехи. Последние слова обрываются на фразе: 'Не спускайся туда один'.",
        objective: "Цель: добраться до генераторной и проверить питание.",
      };
    },
  },
  {
    id: "valve-wheel",
    x: 2230,
    y: 560,
    width: 52,
    height: 40,
    title: "Штурвал клапана",
    once: true,
    onInteract() {
      addInventoryItem("valveWheel");
      advanceStage("generator");
      return {
        text: "Ты снимаешь штурвал клапана и убираешь его в инвентарь. Без него подача в генератор не откроется.",
        objective: getGeneratorObjective(),
      };
    },
  },
  {
    id: "generator",
    x: 2700,
    y: 490,
    width: 92,
    height: 70,
    title: "Генератор",
    text: "Панель мертва. Для запуска не хватает предохранителя и штурвала клапана.",
    objective: "Цель обновлена: найти предохранитель и штурвал клапана для резервного генератора.",
    onInteract() {
      advanceStage("generator");
      const generatorState = gameState.puzzleState.generator;

      if (!generatorState.panelOpened) {
        return {
          text: gameState.inventory.screwdriver
            ? "Крышка генератора прикручена. Выбери отвёртку и вскрой сервисный отсек перед ремонтом."
            : "Сервисный отсек генератора закрыт винтами. Нужна отвёртка.",
          objective: getGeneratorObjective(),
        };
      }

      if (!generatorState.fuseInstalled || !generatorState.valveWheelInstalled) {
        return {
          text: gameState.selectedItemId
            ? `Сначала нужно установить подходящие детали в генератор. Сейчас выбран предмет "${getItemLabel(gameState.selectedItemId)}".`
            : "Генератор не собран. Открой инвентарь клавишей I, выбери деталь и примени её к генератору.",
          objective: getGeneratorObjective(),
        };
      }

      return {
        text: "Генератор уже собран и держит питание маяка.",
        objective: stageMeta.ending.objective,
      };
    },
  },
  {
    id: "hatch",
    x: 1048,
    y: 560,
    width: 56,
    height: 40,
    title: "Служебный люк",
    stageRequirement: "epilogue",
    text: "Люк не был заперт. Холодный воздух тянет снизу, из служебного уровня.",
    objective: "Цель: спуститься в нижние помещения маяка.",
    onInteract() {
      advanceStage("service");
      teleportPlayer(3075, 526);
      startSceneTransition(
        "Служебный уровень",
        "Под башней начинается отдельная внутренняя сцена: тесные помещения, пульт и запертая дверь в тоннель."
      );
      return {
        text: "Скрип металла разносится по шахте. Внизу кто-то совсем недавно работал.",
        objective: stageMeta.service.objective,
      };
    },
  },
  {
    id: "logbook",
    x: 3040,
    y: 560,
    width: 46,
    height: 40,
    title: "Журнал дежурств",
    stageRequirement: "service",
    once: true,
    onInteract() {
      addInventoryItem("logbook");
      gameState.serviceProgress.logbookRead = true;
      return {
        text: "Ты забираешь журнал дежурств. В последней записи сказано: 'Шаги снова у цистерны. Если не вернусь, дверь в восточный тоннель должна остаться закрытой'.",
        objective: getServiceObjective(),
      };
    },
  },
  {
    id: "service-hatch-return",
    x: 3130,
    y: 548,
    width: 56,
    height: 52,
    title: "Люк наверх",
    stageRequirement: "service",
    onInteract() {
      advanceStage("epilogue");
      teleportPlayer(1006, 536);
      startSceneTransition(
        "Основание маяка",
        "Скрипучая лестница выводит обратно к основанию башни. Люк теперь связывает поверхность и нижний уровень в обе стороны."
      );
      return {
        text: "Ты выбираешься наверх, к основанию маяка. При необходимости теперь можно снова спуститься через тот же служебный люк.",
        objective: getSurfaceObjective(),
      };
    },
  },
  {
    id: "service-console",
    x: 3310,
    y: 500,
    width: 74,
    height: 100,
    title: "Сервисный пульт",
    stageRequirement: "service",
    onInteract() {
      if (!gameState.puzzleState.serviceConsole.batteryInstalled) {
        return {
          text: gameState.inventory.battery
            ? "Пульт обесточен. Открой инвентарь, выбери батарею и используй её на пульте."
            : "Пульт обесточен. Нужна батарея из комнаты смотрителя.",
          objective: getServiceObjective(),
        };
      }

      gameState.serviceProgress.consoleUsed = true;
      return {
        text: "На экране сервисного пульта мигает схема маяка. Восточный тоннель заблокирован вручную с другой стороны.",
        objective: getServiceObjective(),
      };
    },
  },
  {
    id: "sealed-door",
    x: 3460,
    y: 520,
    width: 52,
    height: 80,
    title: "Запертая дверь",
    stageRequirement: "service",
    onInteract() {
      gameState.serviceProgress.doorChecked = true;

      if (!gameState.puzzleState.serviceDoor.panelOpened) {
        return {
          text: gameState.inventory.screwdriver
            ? "На цепи висит жестяной щиток. Сними его отвёрткой, иначе не видно, как открыть дверь."
            : "Дверь удерживает цепь под защитным щитком. Без отвёртки к запору не подобраться.",
          objective: getServiceObjective(),
        };
      }

      const allCluesFound = hasResolvedServiceScene();

      if (allCluesFound) {
        advanceStage("tunnel");
        teleportPlayer(3720, 526);
        startSceneTransition(
          "Восточный тоннель",
          "Дверь поддаётся, и служебный уровень остаётся позади. Впереди начинается отдельный сырой тоннель под маяком."
        );
        return {
          text: "Цепь с грохотом падает на пол. За дверью тянется сырой восточный тоннель, и в темноте слышится слабый радиосигнал.",
          objective: stageMeta.tunnel.objective,
        };
      }

      return {
        text: "Дверь удерживается цепью с другой стороны. Сначала стоит собрать больше следов в этой комнате.",
        objective: getServiceObjective(),
      };
    },
  },
  {
    id: "locker",
    x: 3760,
    y: 548,
    width: 52,
    height: 52,
    title: "Шкафчик смотрителя",
    stageRequirement: "tunnel",
    onInteract() {
      gameState.tunnelProgress.lockerOpened = true;

      if (!gameState.inventory.serviceKey) {
        addInventoryItem("serviceKey");
        return {
          text: "Среди мокрого плаща висит связка служебных ключей. Один из них как раз подходит к створкам старых проходов.",
          objective: getTunnelObjective(),
        };
      }

      return {
        text: "Внутри мокрый плащ, пустой держатель ключей и жетон с инициалами прежнего смотрителя.",
        objective: getTunnelObjective(),
      };
    },
  },
  {
    id: "service-return-door",
    x: 3660,
    y: 520,
    width: 52,
    height: 80,
    title: "Дверь на служебный уровень",
    stageRequirement: "tunnel",
    onInteract() {
      advanceStage("service");
      teleportPlayer(3390, 526);
      startSceneTransition(
        "Служебный уровень",
        "Дверь снова выводит в тесный отсек под башней. Сцены под маяком теперь связаны между собой в обе стороны."
      );
      return {
        text: "Ты возвращаешься на служебный уровень под маяком. Отсюда снова доступны пульт, журнал и дверь в тоннель.",
        objective: getServiceObjective(),
      };
    },
  },
  {
    id: "signal",
    x: 4134,
    y: 500,
    width: 70,
    height: 100,
    title: "Аварийный передатчик",
    stageRequirement: "tunnel",
    onInteract() {
      gameState.tunnelProgress.signalFound = true;
      return {
        text: hasResolvedTunnelScene()
          ? "Передатчик шипит и повторяет обрывок сообщения: '...восточный створ открыт, спускаюсь к воде'. Теперь направление следующей сцены ясно."
          : "Передатчик шипит и повторяет обрывок сообщения: '...восточный створ открыт...'. Нужны ещё следы.",
        objective: getTunnelObjective(),
      };
    },
  },
  {
    id: "tunnel-exit",
    x: 4305,
    y: 520,
    width: 54,
    height: 80,
    title: "Выход к нижней пристани",
    stageRequirement: "tunnel",
    onInteract() {
      gameState.tunnelProgress.exitChecked = true;

      if (!gameState.puzzleState.tunnelExit.unlocked) {
        return {
          text: gameState.inventory.serviceKey
            ? "Выход закрыт на внутренний замок. Выбери служебный ключ и открой проход."
            : "Выход к пристани закрыт на старый служебный замок. Нужен ключ из шкафчика смотрителя.",
          objective: getTunnelObjective(),
        };
      }

      if (!hasResolvedTunnelScene()) {
        return {
          text: "Сквозняк тянет со стороны моря, но уходить вслепую рано. Сначала нужно осмотреть тоннель внимательнее.",
          objective: getTunnelObjective(),
        };
      }

      advanceStage("pier");
      teleportPlayer(4520, 526);
      startSceneTransition(
        "Нижняя пристань",
        "Тоннель заканчивается. Теперь это уже не тот же экран, а новая внешняя сцена под маяком, у самой воды."
      );

      return {
        text: "Проход выводит наружу. Под маяком скрыта нижняя пристань, а рядом на волнах бьётся маленький служебный ялик.",
        objective: stageMeta.pier.objective,
      };
    },
  },
  {
    id: "pier-return-door",
    x: 4442,
    y: 520,
    width: 42,
    height: 80,
    title: "Проход в тоннель",
    stageRequirement: "pier",
    onInteract() {
      advanceStage("tunnel");
      teleportPlayer(4240, 526);
      startSceneTransition(
        "Восточный тоннель",
        "Сырой проход снова уводит под скалу. Пристань и тоннель теперь работают как связанные соседние сцены."
      );
      return {
        text: "Ты возвращаешься в восточный тоннель. Отсюда можно снова пройти к шкафчику, передатчику или выйти к пристани.",
        objective: getTunnelObjective(),
      };
    },
  },
  {
    id: "skiff",
    x: 4485,
    y: 552,
    width: 122,
    height: 48,
    title: "Служебный ялик",
    stageRequirement: "pier",
    onInteract() {
      gameState.pierProgress.skiffChecked = true;

      if (!gameState.inventory.boatHook) {
        addInventoryItem("boatHook");
        return {
          text: "На дне ялика, рядом с пустым фонарём, лежит короткий багор. Он может помочь с тугими створками у воды.",
          objective: getPierObjective(),
        };
      }

      return {
        text: "Ялик привязан наспех и весь мокрый от солёных брызг. На дне остались пустой фонарь и следы свежей грязи.",
        objective: getPierObjective(),
      };
    },
  },
  {
    id: "rope-winch",
    x: 4795,
    y: 510,
    width: 64,
    height: 90,
    title: "Лебёдка",
    stageRequirement: "pier",
    onInteract() {
      gameState.pierProgress.ropeFound = true;
      return {
        text: hasResolvedPierScene()
          ? "На барабане не хватает троса, а на металле видны свежие порезы. Похоже, кто-то спускался к воде в сильной спешке."
          : "Трос на лебёдке обрезан и уходит в темноту под скалы. Нужно осмотреть ещё и лодку.",
        objective: getPierObjective(),
      };
    },
  },
  {
    id: "sea-gate",
    x: 4985,
    y: 520,
    width: 52,
    height: 80,
    title: "Морской створ",
    stageRequirement: "pier",
    onInteract() {
      gameState.pierProgress.gateChecked = true;

      if (!gameState.puzzleState.seaGate.released) {
        return {
          text: gameState.inventory.boatHook
            ? "Створ держится на мокром засове. Выбери багор и подцепи его."
            : "Створ закушен мокрым засовом. Рукой его не сорвать, нужен инструмент из ялика.",
          objective: getPierObjective(),
        };
      }

      if (!hasResolvedPierScene()) {
        return {
          text: "Створ приоткрыт, и за ним слышен прибой. Пока слишком мало следов, чтобы понять, куда вести сцену дальше.",
          objective: getPierObjective(),
        };
      }

      advanceStage("bay");
      teleportPlayer(5160, 526);
      startSceneTransition(
        "Скрытая бухта",
        "Через морской створ сцена переключается в изолированную бухту за скалами, куда не добивает основной прибой."
      );

      return {
        text: "Створ выводит к узкой тропе между скалами. За ней скрыта небольшая бухта, где шторм почти не достаёт берег.",
        objective: stageMeta.bay.objective,
      };
    },
  },
  {
    id: "bay-return-gate",
    x: 5104,
    y: 520,
    width: 52,
    height: 80,
    title: "Тропа к пристани",
    stageRequirement: "bay",
    onInteract() {
      advanceStage("pier");
      teleportPlayer(4930, 526);
      startSceneTransition(
        "Нижняя пристань",
        "Тропа между скалами снова выводит к воде у подножия маяка. Бухта и пристань теперь связаны прямым обратным переходом."
      );
      return {
        text: "Ты возвращаешься на нижнюю пристань. Отсюда можно снова идти к бухте или подняться обратно через тоннель.",
        objective: getPierObjective(),
      };
    },
  },
  {
    id: "campfire",
    x: 5190,
    y: 560,
    width: 42,
    height: 40,
    title: "Потухший костёр",
    stageRequirement: "bay",
    onInteract() {
      gameState.bayProgress.campSeen = true;
      return {
        text: "Костёр давно погас, но камни вокруг ещё уложены аккуратно. Кто-то прятался здесь не одну ночь.",
        objective: getBayObjective(),
      };
    },
  },
  {
    id: "cache",
    x: 5248,
    y: 528,
    width: 62,
    height: 62,
    title: "Тент и ящик",
    stageRequirement: "bay",
    onInteract() {
      gameState.bayProgress.cacheOpened = true;
      return {
        text: hasResolvedBayScene()
          ? "Под тентом спрятаны сухие карты и записка: 'Если свет включится, встречаемся у северной бухты до рассвета'. След почти прямой."
          : "Под тентом спрятаны сухари, бинт и обрывок карты. Нужно осмотреть бухту внимательнее.",
        objective: getBayObjective(),
      };
    },
  },
  {
    id: "footprints",
    x: 5350,
    y: 540,
    width: 44,
    height: 40,
    title: "Следы на камнях",
    stageRequirement: "bay",
    onInteract() {
      if (!hasResolvedBayScene()) {
        return {
          text: "Следы тянутся выше по скале, но картинка пока неполная. Осмотри лагерь в бухте.",
          objective: getBayObjective(),
        };
      }

      return {
        text: "На мокрых камнях видны свежие следы и клочок ткани. Теперь ясно: смотритель жив и ушёл к северной бухте совсем недавно.",
        objective: "Новая цель: сделать следующую сцену у северной бухты и продолжить погоню за смотрителем.",
      };
    },
  },
];

const keys = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "jump",
  KeyW: "jump",
  Space: "jump",
  KeyE: "interact",
};

chapterButtonNode.addEventListener("click", continueToNextScene);

window.addEventListener("keydown", (event) => {
  if (gameState.chapterOverlayVisible && event.code === "Enter") {
    event.preventDefault();
    continueToNextScene();
    return;
  }

  if (gameState.chapterOverlayVisible) {
    return;
  }

  if (gameState.sceneTransition.active) {
    event.preventDefault();
    return;
  }

  if (gameState.openDocumentItemId) {
    if (["Escape", "Enter", "Space", "KeyI", "Tab"].includes(event.code)) {
      event.preventDefault();
      closeReadableItem();
    }
    return;
  }

  if (gameState.containerOpen) {
    if (["Escape", "KeyE", "KeyI", "Tab"].includes(event.code)) {
      event.preventDefault();
      closeContainerPanel();
    }
    return;
  }

  if (event.code === "KeyI" || event.code === "Tab") {
    event.preventDefault();
    toggleInventoryPanel();
    return;
  }

  if (/^Digit[1-9]$/.test(event.code) && !gameState.inventoryOpen) {
    event.preventDefault();
    selectHotbarSlot(Number(event.code.slice(5)) - 1, false);
    updateHintForNearby(getNearbyInteractable());
    return;
  }

  if (gameState.inventoryOpen) {
    if (event.code === "Escape") {
      event.preventDefault();
      closeInventoryPanel();
      return;
    }

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      event.preventDefault();
      moveInventoryCursor(0, -1);
      return;
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
      event.preventDefault();
      moveInventoryCursor(0, 1);
      return;
    }

    if (event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      moveInventoryCursor(-1, 0);
      return;
    }

    if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      moveInventoryCursor(1, 0);
      return;
    }

    if (["Enter", "KeyE", "Space"].includes(event.code)) {
      event.preventDefault();
      confirmInventorySelection();
      return;
    }

    return;
  }

  const action = keys[event.code];
  if (!action) {
    return;
  }

  if (action === "jump") {
    input.jump = true;
  } else if (action === "interact") {
    input.interact = true;
  } else {
    input[action] = true;
  }

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (gameState.sceneTransition.active) {
    return;
  }

  if (gameState.containerOpen) {
    return;
  }

  if (gameState.inventoryOpen) {
    return;
  }

  const action = keys[event.code];
  if (!action) {
    return;
  }

  if (action === "interact") {
    input.interact = false;
    return;
  }

  if (action === "jump") {
    input.jump = false;
    return;
  }

  input[action] = false;
});

canvas.addEventListener("mousedown", (event) => {
  handleCanvasPointerDown(event);
});

canvas.addEventListener("mousemove", (event) => {
  handleCanvasPointerMove(event);
});

canvas.addEventListener("mouseup", (event) => {
  handleCanvasPointerUp(event);
});

canvas.addEventListener("dblclick", (event) => {
  handleCanvasDoubleClick(event);
});

window.addEventListener("mouseup", (event) => {
  handleCanvasPointerUp(event);
});

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function update(dt) {
  gameState.worldTime += dt;
  gameState.interactionCooldown = Math.max(0, gameState.interactionCooldown - dt);
  updateCameraZoom(dt);

  if (gameState.sceneTransition.active) {
    gameState.sceneTransition.timer = Math.max(0, gameState.sceneTransition.timer - dt);
    player.vx = 0;
    updateCameraPosition();

    if (gameState.sceneTransition.timer === 0) {
      gameState.sceneTransition.active = false;
      updateHintForNearby(getNearbyInteractable());
    }
    return;
  }

  if (gameState.chapterOverlayVisible) {
    player.vx = 0;
    updateCameraPosition();
    return;
  }

  if (gameState.containerOpen) {
    player.vx = 0;
    updateCameraPosition();
    return;
  }

  if (gameState.inventoryOpen) {
    player.vx = 0;
    updateCameraPosition();
    return;
  }

  const moveAxis = Number(input.right) - Number(input.left);
  player.vx = moveAxis * player.speed;

  if (moveAxis !== 0) {
    player.facing = Math.sign(moveAxis);
  }

  if (input.jump && player.grounded) {
    player.vy = -player.jumpStrength;
    player.grounded = false;
  }

  player.vy += world.gravity * dt;

  player.x += player.vx * dt;
  resolveHorizontalCollisions();

  player.y += player.vy * dt;
  resolveVerticalCollisions();

  player.x = clamp(player.x, 0, world.width - player.width);

  clampPlayerToSceneBounds();

  updateCameraPosition();

  handleInteraction();
}

function resolveHorizontalCollisions() {
  for (const platform of getActivePlatforms()) {
    if (!intersects(player, platform)) {
      continue;
    }

    if (player.vx > 0) {
      player.x = platform.x - player.width;
    } else if (player.vx < 0) {
      player.x = platform.x + platform.width;
    }
  }
}

function resolveVerticalCollisions() {
  player.grounded = false;

  for (const platform of getActivePlatforms()) {
    if (!intersects(player, platform)) {
      continue;
    }

    if (player.vy > 0) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.grounded = true;
    } else if (player.vy < 0) {
      player.y = platform.y + platform.height;
      player.vy = 0;
    }
  }

  if (player.y + player.height > world.height) {
    player.y = world.height - player.height;
    player.vy = 0;
    player.grounded = true;
  }
}

function getActivePlatforms() {
  if (gameState.stage === "wake") {
    return wakePlatforms;
  }

  if (gameState.stage === "lantern") {
    return lanternPlatforms;
  }

  const active = [...platforms];

  if (isStageAtLeast("service")) {
    active.push(...servicePlatforms);
  }

  if (isStageAtLeast("tunnel")) {
    active.push(...tunnelPlatforms);
  }

  if (isStageAtLeast("pier")) {
    active.push(...pierPlatforms);
  }

  if (isStageAtLeast("bay")) {
    active.push(...bayPlatforms);
  }

  return active;
}

function getSceneBounds(stageName = gameState.stage) {
  if (stageName === "wake") {
    return wakeRoomBounds;
  }

  if (stageName === "lantern") {
    return lanternRoomBounds;
  }

  if (stageName === "service") {
    return serviceRoomBounds;
  }

  if (stageName === "tunnel") {
    return tunnelRoomBounds;
  }

  return isolatedSceneBounds[stageName] ?? null;
}

function getDuplicateInteractableIds() {
  const counts = new Map();

  for (const item of interactables) {
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
}

function collectSelfCheckIssues(context = "manual") {
  const issues = [];

  for (const [name, node] of requiredDomNodes) {
    if (!node) {
      issues.push(`Отсутствует DOM-узел "${name}".`);
    }
  }

  if (!stageMeta[gameState.stage]) {
    issues.push(`Текущая сцена "${gameState.stage}" не описана в stageMeta.`);
  }

  if (!stageOrder.includes(gameState.progressStage)) {
    issues.push(`Progress stage "${gameState.progressStage}" отсутствует в stageOrder.`);
  }

  if (!gameState.currentObjective?.trim()) {
    issues.push("У текущей сцены отсутствует objective.");
  }

  if (canvas.width !== Math.max(1, window.innerWidth) || canvas.height !== Math.max(1, window.innerHeight)) {
    issues.push("Canvas не совпадает с размером окна браузера.");
  }

  const hiddenUiState = stageNode?.closest(".ui-state");
  if (hiddenUiState && !hiddenUiState.hidden) {
    issues.push("Служебный UI-блок попал в видимую раскладку страницы.");
  }

  if (hiddenUiState) {
    const styles = window.getComputedStyle(hiddenUiState);
    if (styles.display !== "none" || styles.visibility !== "hidden") {
      issues.push("Служебный UI-блок недостаточно скрыт стилями.");
    }
  }

  const duplicateIds = getDuplicateInteractableIds();
  if (duplicateIds.length) {
    issues.push(`Есть дублирующиеся interactable id: ${duplicateIds.join(", ")}.`);
  }

  const brokenInteractables = interactables.filter(
    (item) => item.width <= 0 || item.height <= 0 || (item.exactStage && item.stageRequirement)
  );
  if (brokenInteractables.length) {
    issues.push(
      `Найдены некорректные интерактивы: ${brokenInteractables.map((item) => item.id).join(", ")}.`
    );
  }

  const sceneBounds = getSceneBounds();
  if (
    sceneBounds &&
    (player.x < sceneBounds.left - 1 || player.x + player.width > sceneBounds.right + 1)
  ) {
    issues.push(`Игрок выходит за границы сцены "${gameState.stage}".`);
  }

  const visibleInteractables = interactables.filter((item) => isInteractableVisible(item));
  if (!visibleInteractables.length) {
    issues.push(`Для сцены "${gameState.stage}" не найдено ни одного видимого интерактива.`);
  }

  if (gameState.selectedItemId && !gameState.inventorySlots.includes(gameState.selectedItemId)) {
    issues.push(`Выбранный предмет "${gameState.selectedItemId}" отсутствует в инвентаре.`);
  }

  if (gameState.openDocumentItemId && !gameState.inventorySlots.includes(gameState.openDocumentItemId)) {
    issues.push(`Открытый документ "${gameState.openDocumentItemId}" отсутствует в инвентаре.`);
  }

  if (gameState.containerOpen && !gameState.activeContainerId) {
    issues.push("Открыта панель контейнера без activeContainerId.");
  }

  if (gameState.inventorySlots.length !== inventorySlotCount) {
    issues.push("Количество ячеек инвентаря не совпадает с конфигурацией.");
  }

  if (context === "init" && gameState.stage !== "wake") {
    issues.push("Игра должна стартовать со сцены wake.");
  }

  return issues;
}

function runSelfCheck(context = "manual", silent = false) {
  const issues = collectSelfCheckIssues(context);
  const passed = issues.length === 0;

  gameState.selfCheck.runs += 1;
  gameState.selfCheck.lastContext = context;
  gameState.selfCheck.lastPassed = passed;
  gameState.selfCheck.lastIssues = issues;

  if (!silent) {
    if (passed) {
      console.info(`[LastKeeper][SelfCheck:${context}] OK`);
    } else {
      console.warn(`[LastKeeper][SelfCheck:${context}] Найдены проблемы:`, issues);
    }
  }

  return {
    ok: passed,
    context,
    stage: gameState.stage,
    issues,
  };
}

function exposeDebugTools() {
  if (typeof window === "undefined") {
    return;
  }

  window.lastKeeperDebug = {
    runSelfCheck,
    getState() {
      return {
        stage: gameState.stage,
        progressStage: gameState.progressStage,
        objective: gameState.currentObjective,
        selfCheck: gameState.selfCheck,
      };
    },
  };
}

function clampPlayerToSceneBounds() {
  const bounds = getSceneBounds();
  if (!bounds) {
    return;
  }

  player.x = clamp(player.x, bounds.left, bounds.right - player.width);
}

function getCameraRangeForScene(viewportWidth, stageName = gameState.stage) {
  const bounds = getSceneBounds(stageName);
  if (!bounds) {
    return {
      min: 0,
      max: Math.max(0, world.width - viewportWidth),
    };
  }

  const sceneWidth = bounds.right - bounds.left;
  if (sceneWidth <= viewportWidth) {
    const centeredX = clamp(
      bounds.left - (viewportWidth - sceneWidth) / 2,
      0,
      Math.max(0, world.width - viewportWidth)
    );
    return { min: centeredX, max: centeredX };
  }

  return {
    min: bounds.left,
    max: bounds.right - viewportWidth,
  };
}

function getStageZoom(stageName = gameState.stage) {
  if (stageName === "wake") {
    return 1.34;
  }

  if (stageName === "lantern") {
    return 1.4;
  }

  if (stageName === "service") {
    return 1.38;
  }

  if (stageName === "tunnel") {
    return 1.34;
  }

  if (stageName === "epilogue") {
    return 1.08;
  }

  return 1;
}

function getViewportWidth(zoom = camera.zoom) {
  return canvas.width / zoom;
}

function getCanvasPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function updateCameraZoom(dt) {
  camera.targetZoom = getStageZoom(gameState.stage);
  const zoomStep = Math.min(1, dt * 6);
  camera.zoom += (camera.targetZoom - camera.zoom) * zoomStep;

  if (Math.abs(camera.zoom - camera.targetZoom) < 0.001) {
    camera.zoom = camera.targetZoom;
  }
}

function updateCameraPosition(zoom = camera.zoom) {
  const viewportWidth = getViewportWidth(zoom);
  const cameraRange = getCameraRangeForScene(viewportWidth);
  camera.x = clamp(
    player.x - viewportWidth / 2 + player.width / 2,
    cameraRange.min,
    cameraRange.max
  );
}

function applyWorldTransform() {
  const zoom = camera.zoom;
  const offsetY = canvas.height - world.height * zoom;

  ctx.translate(0, offsetY);
  ctx.scale(zoom, zoom);
  ctx.translate(-camera.x, -camera.y);
}

function startSceneTransition(title, text) {
  if (gameState.openDocumentItemId) {
    closeReadableItem();
  }

  if (gameState.containerOpen) {
    closeContainerPanel();
  }

  if (gameState.inventoryOpen) {
    closeInventoryPanel();
  }

  gameState.sceneTransition.active = true;
  gameState.sceneTransition.timer = 0.95;
  gameState.sceneTransition.duration = 0.95;
  gameState.sceneTransition.title = title;
  gameState.sceneTransition.text = text;
  clearPlayerInput();
  hintNode.textContent = "";
}

function getNearbyInteractable() {
  return interactables
    .filter((item) => isInteractableVisible(item))
    .map((item) => ({ item, distance: distanceToPlayer(item) }))
    .filter(({ distance }) => distance < interactionRange)
    .sort((left, right) => left.distance - right.distance)[0]?.item;
}

function updateHintForNearby(nearby) {
  if (gameState.openDocumentItemId) {
    hintNode.textContent = documentHintText;
    return;
  }

  if (gameState.containerOpen) {
    hintNode.textContent = containerHintText;
    return;
  }

  if (gameState.inventoryOpen) {
    hintNode.textContent = inventoryHintText;
    return;
  }

  if (gameState.selectedItemId && nearby) {
    hintNode.textContent = `E: применить "${getItemLabel(gameState.selectedItemId)}" к "${nearby.title}". I: инвентарь.`;
    return;
  }

  if (gameState.selectedItemId) {
    hintNode.textContent = `Выбран предмет "${getItemLabel(gameState.selectedItemId)}". Подойди к нужному объекту или нажми I.`;
    return;
  }

  if (nearby) {
    hintNode.textContent = `E: взаимодействовать с объектом "${nearby.title}". I: инвентарь.`;
    return;
  }

  hintNode.textContent = movementHintText;
}

function tryUseSelectedItemOn(interactableId) {
  const puzzle = puzzleDefinitions[interactableId];
  if (!puzzle || !gameState.selectedItemId) {
    return null;
  }

  const puzzleState = gameState.puzzleState[puzzle.stateKey];
  const unresolved = puzzle.steps.some((step) => !puzzleState[step.progressKey]);
  if (!unresolved) {
    return null;
  }

  const selectedItemId = gameState.selectedItemId;
  const step = puzzle.steps.find((entry) => entry.itemId === selectedItemId);

  if (!step) {
    return {
      text: `Предмет "${getItemLabel(selectedItemId)}" не подходит к объекту "${getInteractableTitle(interactableId)}".`,
      objective: puzzle.getHint(),
    };
  }

  if (step.requires?.some((progressKey) => !puzzleState[progressKey])) {
    return {
      text: `Сначала нужно подготовить объект "${getInteractableTitle(interactableId)}", а уже потом применять "${getItemLabel(selectedItemId)}".`,
      objective: puzzle.getHint(),
    };
  }

  if (puzzleState[step.progressKey]) {
    return {
      text: step.alreadyText,
      objective: puzzle.getHint(),
    };
  }

  puzzleState[step.progressKey] = true;
  if (!step.keepItem) {
    removeInventoryItem(selectedItemId);
  }

  const solved = puzzle.steps.every((entry) => puzzleState[entry.progressKey]);
  if (solved) {
    return puzzle.onSolved();
  }

  return {
    text: step.successText,
    objective: puzzle.getHint(),
  };
}

function handleInteraction() {
  const nearby = getNearbyInteractable();
  updateHintForNearby(nearby);

  if (!input.interact || !nearby || gameState.interactionCooldown > 0) {
    return;
  }

  gameState.interactionCooldown = 0.25;

  const result =
    tryUseSelectedItemOn(nearby.id) ||
    (nearby.onInteract
      ? nearby.onInteract()
      : {
          text: nearby.text,
          objective: nearby.objective,
        });

  if (!result) {
    return;
  }

  setActiveMessage(result.text);
  setObjective(result.objective);
  gameState.discovered.add(nearby.id);

  if (nearby.once) {
    nearby.hidden = true;
  }
}

function isInteractableVisible(item) {
  if (item.hidden) {
    return false;
  }

  if (item.exactStage) {
    return item.exactStage === gameState.stage;
  }

  if (gameState.stage === "wake" || gameState.stage === "lantern") {
    return false;
  }

  if (item.stageRequirement && !isStageAtLeast(item.stageRequirement)) {
    return false;
  }

  if (item.id === "hatch" && gameState.stage === "service") {
    return false;
  }

  return true;
}

function distanceToPlayer(item) {
  const horizontalGap = Math.max(
    item.x - (player.x + player.width),
    player.x - (item.x + item.width),
    0
  );
  const verticalGap = Math.max(
    item.y - (player.y + player.height),
    player.y - (item.y + item.height),
    0
  );
  return Math.hypot(horizontalGap, verticalGap);
}

function getInventoryItemIds() {
  return gameState.inventorySlots.filter(Boolean);
}

function findFirstOccupiedInventorySlot() {
  return gameState.inventorySlots.findIndex(Boolean);
}

function rebuildInventoryFlags() {
  for (const itemId of Object.keys(gameState.inventory)) {
    gameState.inventory[itemId] = gameState.inventorySlots.includes(itemId);
  }
}

function getContainerSlots(containerId = gameState.activeContainerId) {
  return containerId ? gameState.containerSlots[containerId] : null;
}

function getContainerTitle(containerId = gameState.activeContainerId) {
  return containerCatalog[containerId]?.title ?? "Контейнер";
}

function isContainerEmpty(containerId = gameState.activeContainerId) {
  const slots = getContainerSlots(containerId);
  return !slots || !slots.some(Boolean);
}

function getSlotArray(owner, containerId = gameState.activeContainerId) {
  if (owner === "inventory") {
    return gameState.inventorySlots;
  }

  return getContainerSlots(containerId);
}

function getSlotItem(owner, index, containerId = gameState.activeContainerId) {
  return getSlotArray(owner, containerId)?.[index] ?? null;
}

function setSlotItem(owner, index, itemId, containerId = gameState.activeContainerId) {
  const slots = getSlotArray(owner, containerId);
  if (!slots) {
    return;
  }

  slots[index] = itemId;
}

function getItemLabel(itemId) {
  return inventoryCatalog[itemId]?.label ?? itemId;
}

function getItemDescription(itemId) {
  return inventoryCatalog[itemId]?.description ?? "";
}

function getItemUseHint(itemId) {
  return inventoryCatalog[itemId]?.useHint ?? "Пока неизвестно, куда это применить.";
}

function isReadableItem(itemId) {
  return Boolean(inventoryCatalog[itemId]?.readable);
}

function getReadableItemTitle(itemId) {
  return inventoryCatalog[itemId]?.documentTitle ?? getItemLabel(itemId);
}

function getReadableItemText(itemId) {
  return inventoryCatalog[itemId]?.documentText ?? "";
}

function getInteractableTitle(interactableId) {
  return interactables.find((item) => item.id === interactableId)?.title ?? interactableId;
}

function syncInventoryState() {
  const items = getInventoryItemIds();
  rebuildInventoryFlags();

  if (items.length === 0) {
    gameState.inventoryCursor = 0;
    gameState.selectedItemId = null;
    return;
  }

  gameState.inventoryCursor = clamp(gameState.inventoryCursor, 0, inventorySlotCount - 1);

  if (gameState.selectedItemId && !items.includes(gameState.selectedItemId)) {
    gameState.selectedItemId = null;
  }
}

function addInventoryItem(itemId) {
  if (gameState.inventorySlots.includes(itemId)) {
    return false;
  }

  const emptySlotIndex = gameState.inventorySlots.findIndex((slotItemId) => slotItemId === null);
  if (emptySlotIndex === -1) {
    return false;
  }

  gameState.inventorySlots[emptySlotIndex] = itemId;
  syncInventoryState();
  updateInventory();
  return true;
}

function removeInventoryItem(itemId) {
  if (!gameState.inventorySlots.includes(itemId)) {
    return false;
  }

  const slotIndex = gameState.inventorySlots.indexOf(itemId);
  if (slotIndex !== -1) {
    gameState.inventorySlots[slotIndex] = null;
  }
  if (gameState.selectedItemId === itemId) {
    gameState.selectedItemId = null;
  }
  syncInventoryState();
  updateInventory();
  return true;
}

function updateInventory() {
  syncInventoryState();
  const items = getInventoryItemIds();

  if (items.length === 0) {
    inventoryNode.textContent = "Пусто";
    return;
  }

  const labels = items.map((itemId) => getItemLabel(itemId));
  inventoryNode.textContent = gameState.selectedItemId
    ? `${labels.join(", ")} | выбрано: ${getItemLabel(gameState.selectedItemId)}`
    : labels.join(", ");
}

function clearPlayerInput() {
  input.left = false;
  input.right = false;
  input.jump = false;
  input.interact = false;
}

function openInventoryPanel() {
  if (gameState.chapterOverlayVisible || gameState.containerOpen) {
    return;
  }

  gameState.inventoryOpen = true;
  syncInventoryState();
  const firstOccupiedSlot = findFirstOccupiedInventorySlot();
  if (firstOccupiedSlot !== -1) {
    gameState.inventoryCursor = firstOccupiedSlot;
  }
  clearPlayerInput();
  hintNode.textContent = inventoryHintText;
}

function closeInventoryPanel() {
  gameState.openDocumentItemId = null;
  gameState.inventoryOpen = false;
  clearPlayerInput();
  updateHintForNearby(getNearbyInteractable());
}

function openReadableItem(itemId) {
  if (!isReadableItem(itemId)) {
    return;
  }

  gameState.openDocumentItemId = itemId;
  hintNode.textContent = documentHintText;
}

function closeReadableItem() {
  gameState.openDocumentItemId = null;
  hintNode.textContent = inventoryHintText;
}

function openContainerPanel(containerId) {
  if (!getContainerSlots(containerId)) {
    return;
  }

  if (gameState.openDocumentItemId) {
    closeReadableItem();
  }

  if (gameState.inventoryOpen) {
    closeInventoryPanel();
  }

  gameState.containerOpen = true;
  gameState.activeContainerId = containerId;
  gameState.dragState = null;
  clearPlayerInput();
  hintNode.textContent = containerHintText;
}

function closeContainerPanel() {
  gameState.containerOpen = false;
  gameState.activeContainerId = null;
  gameState.dragState = null;
  clearPlayerInput();
  syncInventoryState();
  updateInventory();
  updateHintForNearby(getNearbyInteractable());
}

function toggleInventoryPanel() {
  if (gameState.inventoryOpen) {
    closeInventoryPanel();
  } else {
    openInventoryPanel();
  }
}

function getHotbarLayout() {
  const slotSize = Math.max(54, Math.min(68, Math.floor(canvas.width * 0.043)));
  const slotGap = 8;
  const width = hotbarSlotCount * slotSize + (hotbarSlotCount - 1) * slotGap;
  const height = slotSize;
  const x = Math.round((canvas.width - width) / 2);
  const y = canvas.height - height - 26;

  return {
    x,
    y,
    width,
    height,
    slotSize,
    slotGap,
  };
}

function getHotbarSlotAtPosition(x, y) {
  const layout = getHotbarLayout();
  if (
    x < layout.x ||
    y < layout.y ||
    x > layout.x + layout.width ||
    y > layout.y + layout.height
  ) {
    return null;
  }

  const step = layout.slotSize + layout.slotGap;
  const index = Math.floor((x - layout.x) / step);
  if (index < 0 || index >= hotbarSlotCount) {
    return null;
  }

  const slotX = layout.x + index * step;
  if (x > slotX + layout.slotSize) {
    return null;
  }

  return {
    index,
    x: slotX,
    y: layout.y,
  };
}

function selectInventorySlot(index, announce = false) {
  const clampedIndex = clamp(index, 0, inventorySlotCount - 1);
  gameState.inventoryCursor = clampedIndex;
  const itemId = gameState.inventorySlots[clampedIndex];
  gameState.selectedItemId = itemId ?? null;
  updateInventory();

  if (!announce) {
    return;
  }

  setActiveMessage(itemId ? `Выбран предмет "${getItemLabel(itemId)}".` : "Этот слот пуст.");
}

function selectHotbarSlot(index, announce = false) {
  selectInventorySlot(index, announce);
}

function getInventoryOverlayLayout() {
  const panelWidth = Math.min(1080, canvas.width - 48);
  const panelHeight = Math.min(640, canvas.height - 40);
  const panelX = (canvas.width - panelWidth) / 2;
  const panelY = (canvas.height - panelHeight) / 2;
  const slotSize = 56;
  const slotGap = 8;
  const gridX = panelX + 34;
  const gridY = panelY + 120;
  const gridWidth = inventoryColumns * slotSize + (inventoryColumns - 1) * slotGap;
  const gridHeight = inventoryRows * slotSize + (inventoryRows - 1) * slotGap;

  return {
    panelWidth,
    panelHeight,
    panelX,
    panelY,
    slotSize,
    slotGap,
    gridX,
    gridY,
    gridWidth,
    gridHeight,
    inventoryGrid: {
      owner: "inventory",
      x: gridX,
      y: gridY,
      width: gridWidth,
      height: gridHeight,
      columns: inventoryColumns,
      rows: inventoryRows,
    },
  };
}

function getInventorySlotAtPosition(x, y) {
  if (!gameState.inventoryOpen) {
    return null;
  }

  const layout = getInventoryOverlayLayout();
  return getGridSlotAtPosition(layout.inventoryGrid, x, y, layout.slotSize, layout.slotGap);
}

function moveInventoryCursor(rowDelta, colDelta) {
  let row = Math.floor(gameState.inventoryCursor / inventoryColumns);
  let column = gameState.inventoryCursor % inventoryColumns;

  row = (row + rowDelta + inventoryRows) % inventoryRows;
  column = (column + colDelta + inventoryColumns) % inventoryColumns;
  gameState.inventoryCursor = row * inventoryColumns + column;
}

function confirmInventorySelection() {
  if (getInventoryItemIds().length === 0) {
    setActiveMessage("Инвентарь пуст. Здесь пока нечего выбирать.");
    closeInventoryPanel();
    return;
  }

  const itemId = gameState.inventorySlots[gameState.inventoryCursor];
  if (!itemId) {
    setActiveMessage("Эта ячейка пуста. Выбери предмет в заполненном слоте.");
    return;
  }

  const isAlreadySelected = gameState.selectedItemId === itemId;
  gameState.selectedItemId = isAlreadySelected ? null : itemId;
  updateInventory();

  setActiveMessage(
    isAlreadySelected
      ? "Выбор предмета снят."
      : `Выбран предмет "${getItemLabel(itemId)}". Теперь подойди к нужному объекту и нажми E.`
  );

  closeInventoryPanel();
}

function getContainerOverlayLayout() {
  const panelWidth = Math.min(980, canvas.width - 48);
  const panelHeight = Math.min(660, canvas.height - 40);
  const panelX = (canvas.width - panelWidth) / 2;
  const panelY = (canvas.height - panelHeight) / 2;
  const slotSize = 56;
  const slotGap = 8;
  const gridWidth = containerColumns * slotSize + (containerColumns - 1) * slotGap;
  const gridHeight = containerRows * slotSize + (containerRows - 1) * slotGap;
  const gridX = panelX + (panelWidth - gridWidth) / 2;

  return {
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    slotSize,
    slotGap,
    containerGrid: {
      owner: "container",
      x: gridX,
      y: panelY + 120,
      width: gridWidth,
      height: gridHeight,
      columns: containerColumns,
      rows: containerRows,
    },
    inventoryGrid: {
      owner: "inventory",
      x: gridX,
      y: panelY + 324,
      width: gridWidth,
      height: gridHeight,
      columns: inventoryColumns,
      rows: inventoryRows,
    },
  };
}

function getGridSlotAtPosition(grid, x, y, slotSize, slotGap) {
  if (
    x < grid.x ||
    y < grid.y ||
    x > grid.x + grid.width ||
    y > grid.y + grid.height
  ) {
    return null;
  }

  const step = slotSize + slotGap;
  const column = Math.floor((x - grid.x) / step);
  const row = Math.floor((y - grid.y) / step);

  if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) {
    return null;
  }

  const slotX = grid.x + column * step;
  const slotY = grid.y + row * step;
  if (x > slotX + slotSize || y > slotY + slotSize) {
    return null;
  }

  return {
    owner: grid.owner,
    index: row * grid.columns + column,
    x: slotX,
    y: slotY,
  };
}

function getContainerSlotAtPosition(x, y) {
  if (!gameState.containerOpen) {
    return null;
  }

  const layout = getContainerOverlayLayout();
  return (
    getGridSlotAtPosition(layout.containerGrid, x, y, layout.slotSize, layout.slotGap) ||
    getGridSlotAtPosition(layout.inventoryGrid, x, y, layout.slotSize, layout.slotGap)
  );
}

function moveItemBetweenSlots(source, target) {
  if (!source || !target) {
    return;
  }

  if (source.owner === target.owner && source.index === target.index) {
    return;
  }

  const sourceItemId = getSlotItem(source.owner, source.index);
  if (!sourceItemId) {
    return;
  }

  const targetItemId = getSlotItem(target.owner, target.index);

  setSlotItem(source.owner, source.index, targetItemId);
  setSlotItem(target.owner, target.index, sourceItemId);

  if (target.owner === "inventory") {
    gameState.discovered.add(sourceItemId);
  }

  syncInventoryState();
  updateInventory();
}

function handleInventoryPointerDown(pointer) {
  const slot = getInventorySlotAtPosition(pointer.x, pointer.y);
  if (!slot) {
    return;
  }

  gameState.inventoryCursor = slot.index;
  const itemId = gameState.inventorySlots[slot.index];
  if (!itemId) {
    gameState.selectedItemId = null;
    updateInventory();
    return;
  }

  gameState.selectedItemId = itemId;
  updateInventory();
}

function handleInventoryDoubleClick(pointer) {
  const slot = getInventorySlotAtPosition(pointer.x, pointer.y);
  if (!slot) {
    return;
  }

  gameState.inventoryCursor = slot.index;
  const itemId = gameState.inventorySlots[slot.index];
  if (!itemId) {
    return;
  }

  gameState.selectedItemId = itemId;
  updateInventory();

  if (isReadableItem(itemId)) {
    openReadableItem(itemId);
  }
}

function handleCanvasPointerDown(event) {
  const pointer = getCanvasPointerPosition(event);
  gameState.mousePosition = pointer;

  if (gameState.sceneTransition.active) {
    return;
  }

  if (gameState.openDocumentItemId) {
    return;
  }

  if (gameState.inventoryOpen) {
    handleInventoryPointerDown(pointer);
    return;
  }

  const hotbarSlot = getHotbarSlotAtPosition(pointer.x, pointer.y);
  if (hotbarSlot) {
    selectHotbarSlot(hotbarSlot.index, false);
    updateHintForNearby(getNearbyInteractable());
    return;
  }

  if (!gameState.containerOpen) {
    return;
  }

  const slot = getContainerSlotAtPosition(pointer.x, pointer.y);
  if (!slot) {
    return;
  }

  const itemId = getSlotItem(slot.owner, slot.index);
  if (!itemId) {
    return;
  }

  gameState.dragState = {
    itemId,
    sourceOwner: slot.owner,
    sourceIndex: slot.index,
    x: pointer.x,
    y: pointer.y,
  };
}

function handleCanvasPointerMove(event) {
  const pointer = getCanvasPointerPosition(event);
  gameState.mousePosition = pointer;

  if (gameState.dragState) {
    gameState.dragState.x = pointer.x;
    gameState.dragState.y = pointer.y;
  }
}

function handleCanvasPointerUp(event) {
  const pointer = getCanvasPointerPosition(event);
  gameState.mousePosition = pointer;

  if (gameState.sceneTransition.active) {
    return;
  }

  if (gameState.openDocumentItemId) {
    return;
  }

  if (!gameState.containerOpen || !gameState.dragState) {
    return;
  }

  const targetSlot = getContainerSlotAtPosition(pointer.x, pointer.y);
  moveItemBetweenSlots(
    {
      owner: gameState.dragState.sourceOwner,
      index: gameState.dragState.sourceIndex,
    },
    targetSlot
  );

  gameState.dragState = null;
}

function handleCanvasDoubleClick(event) {
  const pointer = getCanvasPointerPosition(event);
  gameState.mousePosition = pointer;

  if (gameState.sceneTransition.active) {
    return;
  }

  if (gameState.openDocumentItemId) {
    return;
  }

  if (gameState.inventoryOpen) {
    handleInventoryDoubleClick(pointer);
  }
}

function getActivePuzzleStatuses() {
  const statuses = [];

  if (isStageAtLeast("lighthouse") && !gameState.endingUnlocked) {
    const toolboxState = gameState.puzzleState.toolbox;
    const generatorState = gameState.puzzleState.generator;
    statuses.push({
      title: "Генератор",
      steps: [
        toolboxState.panelOpened
          ? "[x] Инструментальный ящик открыт"
          : gameState.inventory.screwdriver
            ? "[ ] Отвёртка у тебя"
            : "[ ] Найти отвёртку",
        generatorState.panelOpened
          ? "[x] Крышка генератора снята"
          : gameState.inventory.screwdriver
            ? "[ ] Снять крышку генератора"
            : "[ ] Нужна отвёртка",
        generatorState.fuseInstalled
          ? "[x] Предохранитель"
          : gameState.inventory.fuse
            ? "[ ] Предохранитель у тебя"
            : "[ ] Найти предохранитель",
        generatorState.valveWheelInstalled
          ? "[x] Штурвал"
          : gameState.inventory.valveWheel
            ? "[ ] Штурвал у тебя"
            : "[ ] Найти штурвал",
      ],
    });
  }

  if (isStageAtLeast("service") && !gameState.puzzleState.serviceConsole.batteryInstalled) {
    statuses.push({
      title: "Сервисный пульт",
      steps: [
        gameState.inventory.battery ? "[ ] Батарея у тебя" : "[ ] Нужна батарея",
      ],
    });
  }

  if (isStageAtLeast("service") && !isStageAtLeast("tunnel")) {
    statuses.push({
      title: "Дверь в тоннель",
      steps: [
        gameState.puzzleState.serviceDoor.panelOpened
          ? "[x] Щиток с цепи снят"
          : gameState.inventory.screwdriver
            ? "[ ] Снять щиток отвёрткой"
            : "[ ] Нужна отвёртка",
        gameState.serviceProgress.logbookRead ? "[x] Журнал изучен" : "[ ] Проверить журнал",
        gameState.serviceProgress.consoleUsed ? "[x] Пульт активирован" : "[ ] Проверить сервисный пульт",
      ],
    });
  }

  if (isStageAtLeast("tunnel") && !isStageAtLeast("pier")) {
    statuses.push({
      title: "Проход к пристани",
      steps: [
        gameState.tunnelProgress.lockerOpened ? "[x] Шкафчик осмотрен" : "[ ] Осмотреть шкафчик",
        gameState.tunnelProgress.signalFound ? "[x] Сигнал найден" : "[ ] Найти сигнал",
        gameState.puzzleState.tunnelExit.unlocked
          ? "[x] Замок выхода открыт"
          : gameState.inventory.serviceKey
            ? "[ ] Ключ у тебя"
            : "[ ] Найти служебный ключ",
      ],
    });
  }

  if (isStageAtLeast("pier") && !isStageAtLeast("bay")) {
    statuses.push({
      title: "Морской створ",
      steps: [
        gameState.pierProgress.skiffChecked ? "[x] Ялик осмотрен" : "[ ] Осмотреть ялик",
        gameState.pierProgress.ropeFound ? "[x] Лебёдка проверена" : "[ ] Проверить лебёдку",
        gameState.puzzleState.seaGate.released
          ? "[x] Засов сорван"
          : gameState.inventory.boatHook
            ? "[ ] Багор у тебя"
            : "[ ] Найти инструмент для створа",
      ],
    });
  }

  return statuses;
}

function updateStageLabel() {
  stageNode.textContent = stageMeta[gameState.stage].label;
}

function setActiveMessage(message) {
  gameState.activeMessage = message;
}

function setObjective(objective) {
  gameState.currentObjective = objective;
  objectiveNode.textContent = objective;
}

function advanceStage(nextStage) {
  const currentIndex = stageOrder.indexOf(gameState.progressStage);
  const nextIndex = stageOrder.indexOf(nextStage);

  if (nextIndex > currentIndex) {
    gameState.progressStage = nextStage;
  }

  gameState.stage = nextStage;
  updateStageLabel();
}

function switchSceneStage(nextStage) {
  gameState.stage = nextStage;
  updateStageLabel();
}

function isStageAtLeast(stageName) {
  return stageOrder.indexOf(gameState.progressStage) >= stageOrder.indexOf(stageName);
}

function openChapterOverlay(title, text) {
  if (gameState.containerOpen) {
    closeContainerPanel();
  }

  if (gameState.inventoryOpen) {
    closeInventoryPanel();
  }

  gameState.chapterOverlayVisible = true;
  clearPlayerInput();
  chapterTitleNode.textContent = title;
  chapterTextNode.textContent = text;
  chapterButtonNode.textContent = "Вернуться в игру";
  chapterOverlayNode.classList.remove("chapter-overlay--hidden");
  hintNode.textContent = "Enter: закрыть окно.";
}

function closeChapterOverlay() {
  gameState.chapterOverlayVisible = false;
  chapterOverlayNode.classList.add("chapter-overlay--hidden");
  updateHintForNearby(getNearbyInteractable());
}

function continueToNextScene() {
  if (!gameState.chapterOverlayVisible) {
    return;
  }

  closeChapterOverlay();
  advanceStage("epilogue");
  setObjective("Новая цель: вернуться к основанию маяка и проверить открывшийся служебный люк.");
  setActiveMessage(
    "Гул генератора разошёлся по всей башне. Теперь стоит вернуться к основанию маяка: там должен открыться служебный люк."
  );
}

function teleportPlayer(x, y) {
  player.x = x;
  player.y = y;
  player.vx = 0;
  player.vy = 0;
  camera.targetZoom = getStageZoom(gameState.stage);
  updateCameraPosition(camera.targetZoom);
  runSelfCheck("teleport", true);
}

function getServiceObjective() {
  if (!gameState.serviceProgress.logbookRead) {
    return "Цель: осмотреть журнал дежурств на нижнем уровне.";
  }

  if (!gameState.serviceProgress.consoleUsed) {
    return gameState.puzzleState.serviceConsole.batteryInstalled
      ? "Цель: проверить сервисный пульт и схему маяка."
      : gameState.inventory.battery
        ? "Цель: открыть инвентарь, выбрать батарею и установить её в сервисный пульт."
        : "Цель: найти батарею для сервисного пульта.";
  }

  if (!gameState.puzzleState.serviceDoor.panelOpened) {
    return gameState.inventory.screwdriver
      ? "Цель: отвёрткой снять щиток с цепи на двери в восточный тоннель."
      : "Цель: найти отвёртку и добраться до цепи на двери в тоннель.";
  }

  if (!gameState.serviceProgress.doorChecked) {
    return "Цель: осмотреть запертую дверь в восточный тоннель.";
  }

  return "Цель: вернуться к двери и открыть проход в восточный тоннель.";
}

function getGeneratorObjective() {
  const generatorState = gameState.puzzleState.generator;
  const tasks = [];

  if (!gameState.puzzleState.toolbox.panelOpened) {
    tasks.push(gameState.inventory.screwdriver ? "открыть инструментальный ящик отвёрткой" : "найти отвёртку");
  }

  if (!generatorState.panelOpened) {
    tasks.push(gameState.inventory.screwdriver ? "снять крышку генератора" : "найти отвёртку для генератора");
  }

  if (!generatorState.fuseInstalled) {
    tasks.push(gameState.inventory.fuse ? "установить предохранитель" : "найти предохранитель");
  }

  if (!generatorState.valveWheelInstalled) {
    tasks.push(
      gameState.inventory.valveWheel ? "установить штурвал клапана" : "найти штурвал клапана"
    );
  }

  if (tasks.length === 0) {
    return "Цель: запустить генератор и восстановить питание маяка.";
  }

  return `Цель: ${tasks.join(" и ")} для резервного генератора.`;
}

function getWakeObjective() {
  if (!gameState.wakeProgress.leavesMoved) {
    return "Цель: осмотреть комнату и всё, что могло остаться на полу у стены и двери.";
  }

  if (!gameState.wakeProgress.cluesChecked) {
    return stageMeta.wake.objective;
  }

  if (!gameState.lanternProgress.mechanismChecked) {
    return "Цель: следы ведут и к выходу, и к лестнице наверх. Можно подняться к прожектору или выйти наружу.";
  }

  return "Цель: можно снова осмотреть комнату смотрителя, подняться к прожектору или выйти к башне.";
}

function getLanternObjective() {
  if (!gameState.lanternProgress.mechanismChecked) {
    return stageMeta.lantern.objective;
  }

  if (gameState.endingUnlocked) {
    return "Цель: прожектор снова работает. Можно спуститься обратно в жилой ярус маяка.";
  }

  return "Цель: спуститься вниз и найти, почему маяк обесточен.";
}

function getSurfaceObjective() {
  if (!gameState.endingUnlocked) {
    if (isStageAtLeast("generator")) {
      return getGeneratorObjective();
    }

    if (isStageAtLeast("lighthouse")) {
      return stageMeta.lighthouse.objective;
    }

    return stageMeta.shore.objective;
  }

  if (!isStageAtLeast("service")) {
    return stageMeta.epilogue.objective;
  }

  if (!isStageAtLeast("tunnel")) {
    return "Цель: можно снова спуститься в служебный люк и продолжить поиски под маяком.";
  }

  if (!isStageAtLeast("pier")) {
    return "Цель: вернуться в восточный тоннель и найти проход к нижней пристани.";
  }

  if (!isStageAtLeast("bay")) {
    return "Цель: путь дальше ведёт через нижнюю пристань и морской створ.";
  }

  return "Цель: все найденные сцены теперь связаны; можно свободно возвращаться по открытому пути.";
}

function hasResolvedServiceScene() {
  return (
    gameState.serviceProgress.logbookRead &&
    gameState.serviceProgress.consoleUsed &&
    gameState.serviceProgress.doorChecked
  );
}

function getTunnelObjective() {
  if (!gameState.tunnelProgress.lockerOpened) {
    return "Цель: осмотреть шкафчик смотрителя в тоннеле.";
  }

  if (!gameState.tunnelProgress.signalFound) {
    return "Цель: найти источник аварийного сигнала в восточном тоннеле.";
  }

  if (!gameState.puzzleState.tunnelExit.unlocked) {
    return gameState.inventory.serviceKey
      ? "Цель: открыть служебным ключом выход к нижней пристани."
      : "Цель: найти ключ, которым открывается выход к нижней пристани.";
  }

  return "Цель: проверить выход к нижней пристани.";
}

function hasResolvedTunnelScene() {
  return gameState.tunnelProgress.lockerOpened && gameState.tunnelProgress.signalFound;
}

function getPierObjective() {
  if (!gameState.pierProgress.skiffChecked) {
    return "Цель: осмотреть служебный ялик у нижней пристани.";
  }

  if (!gameState.pierProgress.ropeFound) {
    return "Цель: проверить лебёдку у края пристани.";
  }

  if (!gameState.puzzleState.seaGate.released) {
    return gameState.inventory.boatHook
      ? "Цель: использовать багор, чтобы сорвать засов морского створа."
      : "Цель: найти инструмент в ялике, чтобы открыть морской створ.";
  }

  return "Цель: проверить морской створ у подножия скал.";
}

function hasResolvedPierScene() {
  return gameState.pierProgress.skiffChecked && gameState.pierProgress.ropeFound;
}

function getBayObjective() {
  if (!gameState.bayProgress.campSeen) {
    return "Цель: осмотреть потухший костёр в скрытой бухте.";
  }

  if (!gameState.bayProgress.cacheOpened) {
    return "Цель: проверить тайник под тентом в скрытой бухте.";
  }

  return "Цель: проверить следы на камнях у выхода из бухты.";
}

function hasResolvedBayScene() {
  return gameState.bayProgress.campSeen && gameState.bayProgress.cacheOpened;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState.stage === "wake" || gameState.stage === "lantern" || gameState.stage === "service" || gameState.stage === "tunnel") {
    if (gameState.stage === "wake") {
      drawWakeSceneV2();
    } else if (gameState.stage === "lantern") {
      drawLanternSceneV2();
    } else if (gameState.stage === "service") {
      drawServiceSceneV2();
    } else {
      drawTunnelSceneV2();
    }

    drawTopHud();
    drawPuzzleStatusPanel();
    drawMessagePanel();
    drawHotbar();
    if (gameState.containerOpen) {
      drawContainerOverlay();
    } else if (gameState.inventoryOpen) {
      drawInventoryOverlay();
      if (gameState.openDocumentItemId) {
        drawReadableItemOverlay();
      }
    }

    if (gameState.sceneTransition.active) {
      drawSceneTransitionOverlay();
    }
    return;
  }

  drawSky();

  ctx.save();
  applyWorldTransform();

  drawSea();
  drawFarCliffs();
  drawLighthouseExterior();
  drawServiceRoom();
  drawTunnel();
  drawPier();
  drawBay();
  drawPlatforms();
  drawInteractablesV2();
  drawPlayer();
  drawSceneIsolationMask();

  ctx.restore();

  drawTopHud();
  drawPuzzleStatusPanel();
  drawMessagePanel();
  drawHotbar();
  if (gameState.containerOpen) {
    drawContainerOverlay();
  } else if (gameState.inventoryOpen) {
    drawInventoryOverlay();
    if (gameState.openDocumentItemId) {
      drawReadableItemOverlay();
    }
  }

  if (gameState.sceneTransition.active) {
    drawSceneTransitionOverlay();
  }
}

function drawWakeScene() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#2d3138");
  gradient.addColorStop(1, "#15181d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyWorldTransform();

  ctx.fillStyle = "#2b2624";
  ctx.fillRect(
    wakeRoomVisual.outerX,
    wakeRoomVisual.outerY,
    wakeRoomVisual.outerWidth,
    wakeRoomVisual.outerHeight
  );

  ctx.fillStyle = "#3a312d";
  ctx.fillRect(
    wakeRoomVisual.innerX,
    wakeRoomVisual.innerY,
    wakeRoomVisual.innerWidth,
    wakeRoomVisual.innerHeight
  );

  ctx.fillStyle = "#57473e";
  ctx.fillRect(810, 530, 124, 46);
  ctx.fillStyle = "#9a856d";
  ctx.fillRect(826, 504, 92, 34);
  ctx.fillStyle = "#7e6d5a";
  ctx.fillRect(948, 548, 56, 28);
  ctx.fillRect(1018, 538, 32, 38);
  ctx.fillRect(1054, 520, 20, 56);

  ctx.fillStyle = "#8b7458";
  ctx.fillRect(wakeDoorBounds.x, wakeDoorBounds.y, wakeDoorBounds.width, wakeDoorBounds.height);
  ctx.fillStyle = "#342821";
  ctx.fillRect(wakeDoorBounds.x + 10, wakeDoorBounds.y + 8, wakeDoorBounds.width - 20, wakeDoorBounds.height - 28);
  ctx.fillStyle = "#d8bc73";
  ctx.beginPath();
  ctx.arc(wakeDoorBounds.x + wakeDoorBounds.width - 18, wakeDoorBounds.y + 88, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6a594e";
  ctx.fillRect(768, 572, 364, 28);

  ctx.fillStyle = "rgba(236, 212, 158, 0.12)";
  ctx.fillRect(911, 270, 118, 144);
  ctx.fillRect(1380, 258, 144, 156);

  ctx.fillStyle = "rgba(92, 74, 60, 0.78)";
  ctx.fillRect(1180, wakeRoomVisual.outerY + 10, 220, 16);
  ctx.fillRect(850, 310, 180, 8);
  ctx.fillRect(1490, 300, 240, 8);

  ctx.fillStyle = "#57473e";
  ctx.fillRect(720, 530, 124, 46);
  ctx.fillStyle = "#9a856d";
  ctx.fillRect(736, 504, 92, 34);
  ctx.fillStyle = "#7e6d5a";
  ctx.fillRect(1080, 548, 84, 28);
  ctx.fillRect(1208, 538, 36, 38);
  ctx.fillRect(1496, 544, 128, 32);
  ctx.fillRect(1644, 552, 96, 24);
  ctx.fillRect(1750, 522, 28, 54);
  ctx.fillRect(1380, 258, 144, 156);

  ctx.fillStyle = "rgba(92, 74, 60, 0.78)";
  ctx.fillRect(1180, wakeRoomVisual.outerY + 10, 220, 16);
  ctx.fillRect(850, 310, 180, 8);
  ctx.fillRect(1490, 300, 240, 8);

  ctx.fillStyle = "#57473e";
  ctx.fillRect(720, 530, 124, 46);
  ctx.fillStyle = "#9a856d";
  ctx.fillRect(736, 504, 92, 34);
  ctx.fillStyle = "#7e6d5a";
  ctx.fillRect(1080, 548, 84, 28);
  ctx.fillRect(1208, 538, 36, 38);
  ctx.fillRect(1496, 544, 128, 32);
  ctx.fillRect(1644, 552, 96, 24);
  ctx.fillRect(1750, 522, 28, 54);
  ctx.fillRect(1380, 258, 144, 156);

  ctx.fillStyle = "rgba(92, 74, 60, 0.78)";
  ctx.fillRect(1180, wakeRoomVisual.outerY + 10, 220, 16);
  ctx.fillRect(850, 310, 180, 8);
  ctx.fillRect(1490, 300, 240, 8);

  ctx.fillStyle = "#57473e";
  ctx.fillRect(720, 530, 124, 46);
  ctx.fillStyle = "#9a856d";
  ctx.fillRect(736, 504, 92, 34);
  ctx.fillStyle = "#7e6d5a";
  ctx.fillRect(1080, 548, 84, 28);
  ctx.fillRect(1208, 538, 36, 38);
  ctx.fillRect(1496, 544, 128, 32);
  ctx.fillRect(1644, 552, 96, 24);
  ctx.fillRect(1750, 522, 28, 54);

  ctx.fillRect(1380, 258, 144, 156);

  ctx.fillStyle = "rgba(92, 74, 60, 0.78)";
  ctx.fillRect(1180, wakeRoomVisual.outerY + 10, 220, 16);
  ctx.fillRect(850, 310, 180, 8);
  ctx.fillRect(1490, 300, 240, 8);

  ctx.fillStyle = "#57473e";
  ctx.fillRect(720, 530, 124, 46);
  ctx.fillStyle = "#9a856d";
  ctx.fillRect(736, 504, 92, 34);
  ctx.fillStyle = "#7e6d5a";
  ctx.fillRect(1080, 548, 84, 28);
  ctx.fillRect(1208, 538, 36, 38);
  ctx.fillRect(1496, 544, 128, 32);
  ctx.fillRect(1644, 552, 96, 24);
  ctx.fillRect(1750, 522, 28, 54);

  ctx.fillStyle = "rgba(236, 224, 188, 0.85)";
  ctx.font = "24px Georgia";
  ctx.fillText("Выход", 1058, 438);

  drawPlatforms();
  drawInteractables();
  drawPlayer();

  ctx.restore();
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#37698a");
  gradient.addColorStop(0.5, "#1a3d53");
  gradient.addColorStop(1, "#081116");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(229, 239, 242, 0.12)";
  ctx.beginPath();
  ctx.ellipse(1120, 100, 110, 55, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + i * 0.01})`;
    ctx.fillRect(120 * i, 110 + i * 30, 250, 12);
  }

  ctx.fillStyle = "rgba(186, 209, 221, 0.06)";
  ctx.fillRect(0, 420, canvas.width, 34);

  if (isStageAtLeast("epilogue")) {
    ctx.fillStyle = "rgba(255, 221, 150, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawSea() {
  const seaGradient = ctx.createLinearGradient(0, 430, 0, world.height);
  seaGradient.addColorStop(0, "#204d63");
  seaGradient.addColorStop(0.42, "#123849");
  seaGradient.addColorStop(1, "#081b25");
  ctx.fillStyle = seaGradient;
  ctx.fillRect(0, 430, world.width, world.height - 430);

  ctx.fillStyle = "rgba(196, 226, 235, 0.18)";
  ctx.fillRect(0, 452 + Math.sin(gameState.worldTime * 1.6) * 2, world.width, 4);

  for (let i = 0; i < 26; i += 1) {
    const waveY = 470 + (i % 7) * 20 + Math.sin(gameState.worldTime * 1.5 + i * 0.8) * 3;
    const waveX = i * 215 - (i % 3) * 30 + Math.sin(gameState.worldTime * 0.9 + i * 0.3) * 16;
    const waveWidth = 130 + (i % 4) * 30;
    ctx.fillStyle = i % 2 === 0 ? "rgba(167, 207, 221, 0.14)" : "rgba(128, 179, 198, 0.1)";
    ctx.fillRect(waveX, waveY, waveWidth, 5);
  }

  for (let i = 0; i < 14; i += 1) {
    const foamX = 38 + i * 380 + Math.sin(gameState.worldTime * 1.2 + i * 0.6) * 14;
    ctx.fillStyle = "rgba(234, 242, 240, 0.16)";
    ctx.fillRect(foamX, world.seaLevel + 8 + (i % 3) * 6, 84, 4);
  }
}

function drawFarCliffs() {
  const waterlineY = 566;

  ctx.fillStyle = "#183040";
  ctx.beginPath();
  ctx.moveTo(0, 504);
  ctx.lineTo(250, 420);
  ctx.lineTo(540, 514);
  ctx.lineTo(940, 362);
  ctx.lineTo(1260, 520);
  ctx.lineTo(1610, 392);
  ctx.lineTo(2100, 534);
  ctx.lineTo(2520, 350);
  ctx.lineTo(2920, 484);
  ctx.lineTo(3200, 430);
  ctx.lineTo(3600, 486);
  ctx.lineTo(3950, 442);
  ctx.lineTo(4400, 512);
  ctx.lineTo(4740, 456);
  ctx.lineTo(5100, 530);
  ctx.lineTo(world.width, 474);
  ctx.lineTo(world.width, waterlineY);
  ctx.lineTo(0, waterlineY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#12222e";
  ctx.beginPath();
  ctx.moveTo(0, 548);
  ctx.lineTo(220, 472);
  ctx.lineTo(610, 566);
  ctx.lineTo(1120, 470);
  ctx.lineTo(1490, 560);
  ctx.lineTo(1980, 482);
  ctx.lineTo(2440, 566);
  ctx.lineTo(2980, 494);
  ctx.lineTo(3420, 560);
  ctx.lineTo(3910, 500);
  ctx.lineTo(4440, 574);
  ctx.lineTo(5010, 518);
  ctx.lineTo(world.width, 560);
  ctx.lineTo(world.width, world.seaLevel + 8);
  ctx.lineTo(0, world.seaLevel + 8);
  ctx.closePath();
  ctx.fill();
}

function drawLighthouse() {
  ctx.fillStyle = "#64584d";
  ctx.fillRect(800, 250, 330, 350);

  ctx.fillStyle = "#8e8071";
  ctx.fillRect(860, 110, 210, 160);

  ctx.fillStyle = "#d9c59d";
  ctx.fillRect(920, 70, 90, 50);

  ctx.fillStyle = "#4b392e";
  ctx.fillRect(925, 470, 70, 130);

  ctx.fillStyle = "#2b2220";
  ctx.fillRect(900, 320, 50, 85);
  ctx.fillRect(1000, 320, 50, 85);

  ctx.fillStyle = "#6a5848";
  ctx.fillRect(890, 546, 108, 14);
  ctx.fillStyle = "#87725c";
  ctx.fillRect(898, 522, 88, 28);
  ctx.fillStyle = "#9e9a8c";
  ctx.fillRect(904, 526, 30, 16);

  ctx.fillStyle = "#56483e";
  ctx.fillRect(1016, 564, 24, 10);
  ctx.fillRect(1042, 556, 10, 24);
  ctx.fillRect(1056, 570, 12, 8);

  ctx.fillStyle = "rgba(76, 61, 53, 0.72)";
  ctx.fillRect(846, 578, 14, 7);
  ctx.fillRect(866, 583, 14, 7);
  ctx.fillRect(888, 576, 14, 7);

  if (isStageAtLeast("epilogue")) {
    ctx.fillStyle = "#2a221c";
    ctx.fillRect(1044, 568, 66, 18);
  }

  if (gameState.endingUnlocked) {
    ctx.fillStyle = "rgba(247, 219, 148, 0.78)";
    ctx.beginPath();
    ctx.moveTo(965, 95);
    ctx.lineTo(1380, -20);
    ctx.lineTo(1380, 90);
    ctx.closePath();
    ctx.fill();
  }
}

function drawServiceRoom() {
  if (!isStageAtLeast("service")) {
    return;
  }

  ctx.fillStyle = "#1a1d22";
  ctx.fillRect(2990, 370, 560, 250);

  ctx.fillStyle = "#242c32";
  ctx.fillRect(3010, 390, 520, 190);

  ctx.fillStyle = "#3a454d";
  ctx.fillRect(3480, 430, 24, 170);

  ctx.fillStyle = "rgba(235, 204, 137, 0.18)";
  ctx.fillRect(3200, 410, 120, 26);

  ctx.fillStyle = "#36424a";
  ctx.fillRect(3040, 584, 440, 8);
}

function drawTunnel() {
  if (!isStageAtLeast("tunnel")) {
    return;
  }

  ctx.fillStyle = "#191819";
  ctx.fillRect(3640, 360, 760, 260);

  ctx.fillStyle = "#2a2c31";
  ctx.fillRect(3660, 385, 720, 190);

  ctx.fillStyle = "#343a40";
  ctx.fillRect(4305, 430, 28, 170);

  ctx.fillStyle = "rgba(214, 186, 118, 0.12)";
  ctx.fillRect(4100, 395, 140, 28);
}

function drawPier() {
  if (!isStageAtLeast("pier")) {
    return;
  }

  ctx.fillStyle = "#26323a";
  ctx.fillRect(4440, 396, 640, 204);

  ctx.fillStyle = "#122734";
  ctx.fillRect(4866, 564, 198, 56);

  ctx.fillStyle = "rgba(230, 198, 142, 0.08)";
  ctx.fillRect(4466, 410, 424, 124);

  for (let postX = 4480; postX < 4880; postX += 78) {
    ctx.fillStyle = "#43362a";
    ctx.fillRect(postX, 560, 12, 88);
  }

  ctx.fillStyle = "#6c583f";
  ctx.fillRect(4460, 552, 426, 16);
  ctx.fillStyle = "#8a724f";
  for (let plankX = 4468; plankX < 4876; plankX += 24) {
    ctx.fillRect(plankX, 555, 16, 10);
  }

  ctx.strokeStyle = "rgba(220, 209, 184, 0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4472, 576);
  ctx.lineTo(4880, 576);
  ctx.stroke();
}

function drawBay() {
  if (!isStageAtLeast("bay")) {
    return;
  }

  ctx.fillStyle = "#223039";
  ctx.fillRect(5090, 430, 310, 170);

  ctx.fillStyle = "#3a4d55";
  ctx.fillRect(5108, 560, 120, 36);

  ctx.fillStyle = "rgba(244, 194, 114, 0.1)";
  ctx.fillRect(5160, 520, 120, 42);
}

function drawSceneIsolationMask() {
  const bounds = getSceneBounds();
  if (!bounds || gameState.stage === "wake") {
    return;
  }

  ctx.fillStyle = "rgba(4, 8, 12, 0.94)";
  ctx.fillRect(-10000, 0, bounds.left + 10000, world.height);
  ctx.fillRect(bounds.right, 0, world.width - bounds.right + 10000, world.height);

  ctx.fillStyle = "rgba(228, 178, 95, 0.12)";
  ctx.fillRect(bounds.left - 6, 0, 6, world.height);
  ctx.fillRect(bounds.right, 0, 6, world.height);
}

function drawPlatforms() {
  for (const platform of getActivePlatforms()) {
    if (platform.type === "pier") {
      drawPierPlatform(platform);
      continue;
    }

    if (platform.type === "gangway") {
      drawGangwayPlatform(platform);
      continue;
    }

    if (platform.type === "shore") {
      drawShorePlatform(platform);
      continue;
    }

    if (platform.type === "dock") {
      drawDockPlatform(platform);
      continue;
    }

    if (platform.type === "ground") {
      ctx.fillStyle = "#3f4b42";
    } else if (platform.type === "rock") {
      ctx.fillStyle = "#4e5857";
    } else {
      ctx.fillStyle = "#7c684d";
    }

    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    if (platform.type !== "ground") {
      ctx.fillStyle = "rgba(26, 18, 14, 0.34)";
      ctx.fillRect(platform.x, platform.y + platform.height - 5, platform.width, 5);
    }
  }
}

function drawPierPlatform(platform) {
  const deckY = platform.y - 18;
  ctx.fillStyle = "#6f5a3f";
  ctx.fillRect(platform.x, deckY, platform.width, 18);

  ctx.fillStyle = "#8a734f";
  for (let plankX = platform.x + 8; plankX < platform.x + platform.width - 6; plankX += 26) {
    ctx.fillRect(plankX, deckY + 3, 18, 11);
  }

  for (let postX = platform.x + 42; postX < platform.x + platform.width; postX += 84) {
    ctx.fillStyle = "#4b3b2d";
    ctx.fillRect(postX, deckY + 18, 12, 116);
    ctx.fillStyle = "rgba(234, 244, 246, 0.14)";
    ctx.fillRect(postX - 6, world.seaLevel + 16, 24, 4);
  }

  ctx.fillStyle = "#18252d";
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
}

function drawGangwayPlatform(platform) {
  ctx.fillStyle = "#6a5741";
  ctx.fillRect(platform.x, platform.y, platform.width, 14);
  ctx.fillStyle = "#8a724f";
  for (let plankX = platform.x + 8; plankX < platform.x + platform.width - 4; plankX += 24) {
    ctx.fillRect(plankX, platform.y + 2, 14, 10);
  }

  ctx.strokeStyle = "#5b4a38";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(platform.x + 18, platform.y + 2);
  ctx.lineTo(platform.x + 18, platform.y - 42);
  ctx.lineTo(platform.x + platform.width - 20, platform.y - 42);
  ctx.lineTo(platform.x + platform.width - 20, platform.y + 2);
  ctx.stroke();

  ctx.fillStyle = "#4b3b2d";
  ctx.fillRect(platform.x + 22, platform.y + 14, 12, 46);
  ctx.fillRect(platform.x + platform.width - 34, platform.y + 14, 12, 56);
}

function drawShorePlatform(platform) {
  ctx.fillStyle = "#59615a";
  ctx.fillRect(platform.x, platform.y - 10, platform.width, 10);
  ctx.fillStyle = "#454f49";
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

  ctx.fillStyle = "#2d3734";
  for (let blockX = platform.x; blockX < platform.x + platform.width; blockX += 88) {
    ctx.fillRect(blockX, platform.y + 18, 56, platform.height - 18);
  }

  ctx.fillStyle = "#72807b";
  ctx.fillRect(platform.x + 18, platform.y + 10, platform.width - 36, 8);
}

function drawDockPlatform(platform) {
  const deckY = platform.y - 16;
  ctx.fillStyle = "#654f39";
  ctx.fillRect(platform.x, deckY, platform.width, 16);
  ctx.fillStyle = "#8d7550";
  for (let plankX = platform.x + 8; plankX < platform.x + platform.width - 4; plankX += 26) {
    ctx.fillRect(plankX, deckY + 3, 18, 10);
  }

  for (let postX = platform.x + 30; postX < platform.x + platform.width; postX += 82) {
    ctx.fillStyle = "#433428";
    ctx.fillRect(postX, deckY + 16, 12, 120);
  }

  ctx.fillStyle = "#10222e";
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
}

function drawInteractables() {
  for (const item of interactables) {
    if (!isInteractableVisible(item)) {
      continue;
    }

    ctx.fillStyle = getItemColor(item);
    ctx.fillRect(item.x, item.y, item.width, item.height);

    if (distanceToPlayer(item) < interactionRange && !gameState.chapterOverlayVisible) {
      ctx.fillStyle = "rgba(255, 243, 201, 0.9)";
      ctx.font = "22px Georgia";
      ctx.fillText("E", item.x + item.width / 2 - 6, item.y - 12);
    }
  }
}

function getItemColor(item) {
  if (item.id === "leaf-pile") {
    return gameState.wakeProgress.leavesMoved ? "#7f715d" : "#9a845e";
  }

  if (item.id === "boat" || item.id === "skiff") {
    return "#7f98a5";
  }

  if (item.id === "crate" || item.id === "locker") {
    return "#7a6855";
  }

  if (item.id === "toolbox") {
    return "#7a6858";
  }

  if (item.id === "battery") {
    return "#d0c86c";
  }

  if (item.id === "screwdriver") {
    return "#c66f52";
  }

  if (item.id === "fuse") {
    return "#c8d6df";
  }

  if (item.id === "note" || item.id === "logbook") {
    return "#e6d8aa";
  }

  if (item.id === "radio" || item.id === "signal" || item.id === "service-console") {
    return "#8db0bf";
  }

  if (item.id === "serviceKey") {
    return "#d8c17a";
  }

  if (item.id === "boatHook") {
    return "#ba8f63";
  }

  if (item.id === "valve-wheel") {
    return "#8e6f4c";
  }

  if (item.id === "tower-ladder" || item.id === "lantern-ladder-down") {
    return "#9f8d76";
  }

  if (item.id === "lamp-mechanism") {
    return gameState.endingUnlocked ? "#f0c67a" : "#b98d5b";
  }

  if (item.id === "generator" && gameState.inventory.fuse && gameState.inventory.valveWheel) {
    return "#e4b25f";
  }

  if (item.id === "generator" && gameState.puzzleState.generator.panelOpened) {
    return "#d6ad6b";
  }

  if (item.id === "generator" && gameState.endingUnlocked) {
    return "#f0c67a";
  }

  if (item.id === "hatch") {
    return "#9e8763";
  }

  if (item.id === "lighthouse-door" || item.id === "service-return-door" || item.id === "pier-return-door") {
    return "#d7bb74";
  }

  if (item.id === "service-hatch-return") {
    return "#b99769";
  }

  if (item.id === "bed") {
    return "#8e7b66";
  }

  if (item.id === "clutter") {
    return "#7e6c57";
  }

  if (item.id === "footprints-room") {
    return "#5c4e45";
  }

  if (item.id === "room-door") {
    return gameState.wakeProgress.cluesChecked ? "#d7bb74" : "#5f5149";
  }

  if (item.id === "sealed-door") {
    return gameState.puzzleState.serviceDoor.panelOpened
      ? hasResolvedServiceScene() ? "#d7bb74" : "#8a8e93"
      : "#68717a";
  }

  if (item.id === "locker") {
    return "#7c6b56";
  }

  if (item.id === "signal") {
    return hasResolvedTunnelScene() ? "#d7bb74" : "#86a8b7";
  }

  if (item.id === "tunnel-exit") {
    return gameState.puzzleState.tunnelExit.unlocked
      ? hasResolvedTunnelScene() ? "#d7bb74" : "#94a1aa"
      : "#5f6970";
  }

  if (item.id === "skiff") {
    return "#6f7f89";
  }

  if (item.id === "rope-winch") {
    return hasResolvedPierScene() ? "#d7bb74" : "#8f7758";
  }

  if (item.id === "sea-gate") {
    return gameState.puzzleState.seaGate.released
      ? hasResolvedPierScene() ? "#d7bb74" : "#8d9da7"
      : "#5c6872";
  }

  if (item.id === "bay-return-gate") {
    return "#d7bb74";
  }

  if (item.id === "campfire") {
    return "#8a6142";
  }

  if (item.id === "cache") {
    return hasResolvedBayScene() ? "#d7bb74" : "#7d8166";
  }

  if (item.id === "footprints") {
    return hasResolvedBayScene() ? "#d7bb74" : "#8a96a0";
  }

  return gameState.discovered.has(item.id) ? "#d5a95b" : "#9fb7b8";
}

function drawWakeSceneV2() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#2b3036");
  gradient.addColorStop(1, "#15181c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyWorldTransform();

  const { outerX, outerY, outerWidth, outerHeight, innerX, innerY, innerWidth, innerHeight, floorY, floorHeight } = wakeRoomVisual;
  const rightWallX = innerX + innerWidth;
  const ceilingY = innerY + 18;

  ctx.fillStyle = "#2a2421";
  ctx.fillRect(outerX, outerY, outerWidth, outerHeight);

  ctx.fillStyle = "#3b322d";
  ctx.fillRect(innerX, innerY, innerWidth, innerHeight);

  ctx.fillStyle = "#302823";
  ctx.fillRect(innerX + 18, innerY + 16, innerWidth - 36, innerHeight - 44);

  ctx.fillStyle = "#4a3f36";
  ctx.fillRect(innerX, floorY, innerWidth, floorHeight);
  ctx.fillStyle = "#3b312a";
  ctx.fillRect(innerX, floorY + 18, innerWidth, 10);

  ctx.fillStyle = "#56483f";
  ctx.fillRect(innerX + 18, innerY + 18, 14, innerHeight - 42);
  ctx.fillRect(rightWallX - 32, innerY + 18, 14, innerHeight - 42);
  ctx.fillRect(innerX + 52, ceilingY, innerWidth - 104, 18);

  ctx.strokeStyle = "rgba(133, 113, 92, 0.34)";
  ctx.lineWidth = 4;
  for (let seamX = innerX + 150; seamX < rightWallX - 120; seamX += 168) {
    ctx.beginPath();
    ctx.moveTo(seamX, innerY + 34);
    ctx.lineTo(seamX, floorY - 16);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(138, 117, 92, 0.18)";
  ctx.lineWidth = 3;
  for (let plankY = floorY + 8; plankY < floorY + floorHeight; plankY += 10) {
    ctx.beginPath();
    ctx.moveTo(innerX + 16, plankY);
    ctx.lineTo(rightWallX - 16, plankY);
    ctx.stroke();
  }

  const portholes = [
    { x: innerX + 190, y: innerY + 132 },
    { x: innerX + 622, y: innerY + 118 },
  ];

  for (const port of portholes) {
    ctx.fillStyle = "rgba(225, 193, 128, 0.12)";
    ctx.beginPath();
    ctx.arc(port.x, port.y, 68, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c9a166";
    ctx.beginPath();
    ctx.arc(port.x, port.y, 44, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#284b5f";
    ctx.beginPath();
    ctx.arc(port.x, port.y, 31, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(245, 228, 188, 0.38)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(port.x - 22, port.y);
    ctx.lineTo(port.x + 22, port.y);
    ctx.moveTo(port.x, port.y - 22);
    ctx.lineTo(port.x, port.y + 22);
    ctx.stroke();
  }

  ctx.fillStyle = "#4b4037";
  ctx.fillRect(innerX + 708, innerY + 76, 94, 22);
  ctx.fillRect(innerX + 730, innerY + 98, 10, 74);
  ctx.fillRect(innerX + 770, innerY + 98, 10, 74);
  ctx.fillStyle = "#6e5c4d";
  ctx.fillRect(innerX + 700, innerY + 172, 112, 14);
  ctx.fillStyle = "#40352f";
  ctx.fillRect(innerX + 846, innerY + 126, 48, 118);
  ctx.fillStyle = "rgba(35, 28, 24, 0.65)";
  ctx.fillRect(innerX + 852, innerY + 132, 36, 106);

  ctx.fillStyle = "#2b2522";
  ctx.beginPath();
  ctx.moveTo(innerX + 826, innerY + 10);
  ctx.lineTo(innerX + 964, innerY + 10);
  ctx.lineTo(innerX + 942, innerY + 64);
  ctx.lineTo(innerX + 848, innerY + 64);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7e6854";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "rgba(233, 201, 137, 0.12)";
  ctx.beginPath();
  ctx.ellipse(innerX + 148, innerY + 242, 46, 120, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#706051";
  ctx.fillRect(innerX + 134, innerY + 208, 28, 126);
  ctx.fillStyle = "#d7bb74";
  ctx.beginPath();
  ctx.arc(innerX + 148, innerY + 190, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#52453a";
  ctx.fillRect(innerX + 1020, innerY + 80, 112, 18);
  ctx.fillRect(innerX + 1054, innerY + 98, 10, 64);
  ctx.fillRect(innerX + 1086, innerY + 98, 10, 64);
  ctx.fillStyle = "#a2835d";
  ctx.fillRect(innerX + 1032, innerY + 98, 88, 16);
  ctx.fillStyle = "#c2a164";
  ctx.beginPath();
  ctx.arc(innerX + 1076, innerY + 76, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2b231f";
  ctx.fillRect(rightWallX - 46, wakeDoorBounds.y - 18, 14, wakeDoorBounds.height + 24);
  ctx.fillStyle = "rgba(12, 9, 8, 0.9)";
  ctx.fillRect(rightWallX - 34, wakeDoorBounds.y - 8, 34, wakeDoorBounds.height + 10);
  ctx.fillStyle = "rgba(225, 197, 142, 0.08)";
  ctx.fillRect(rightWallX - 36, wakeDoorBounds.y + 18, 6, wakeDoorBounds.height - 48);

  drawInteractablesV2();
  drawPlayer();

  ctx.restore();
}

function drawLanternSceneV2() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#31424d");
  gradient.addColorStop(1, "#14191d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyWorldTransform();

  const { outerX, outerY, outerWidth, outerHeight, innerX, innerY, innerWidth, innerHeight, floorY, floorHeight } = lanternRoomVisual;
  const rightWallX = innerX + innerWidth;
  const centerX = innerX + innerWidth / 2;
  const hatchX = innerX + 52;
  const hatchY = floorY - 12;
  const hatchWidth = 108;
  const hatchHeight = 22;

  ctx.fillStyle = "#262320";
  ctx.fillRect(outerX, outerY, outerWidth, outerHeight);

  ctx.fillStyle = "#37302a";
  ctx.fillRect(innerX, innerY, innerWidth, innerHeight);

  ctx.fillStyle = "#453b33";
  ctx.fillRect(innerX, floorY, innerWidth, floorHeight);
  ctx.fillStyle = "#3a3028";
  ctx.fillRect(innerX, floorY + 16, innerWidth, 10);
  ctx.strokeStyle = "rgba(132, 113, 90, 0.18)";
  ctx.lineWidth = 3;
  for (let plankY = floorY + 8; plankY < floorY + floorHeight; plankY += 10) {
    ctx.beginPath();
    ctx.moveTo(innerX + 14, plankY);
    ctx.lineTo(rightWallX - 14, plankY);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(138, 118, 92, 0.3)";
  ctx.lineWidth = 4;
  for (let seamX = innerX + 116; seamX < rightWallX - 100; seamX += 142) {
    ctx.beginPath();
    ctx.moveTo(seamX, innerY + 30);
    ctx.lineTo(seamX, floorY - 14);
    ctx.stroke();
  }

  const windows = [innerX + 154, innerX + 456, innerX + 742];
  for (const windowX of windows) {
    ctx.fillStyle = "rgba(226, 197, 135, 0.12)";
    ctx.beginPath();
    ctx.arc(windowX, innerY + 128, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c9a166";
    ctx.beginPath();
    ctx.arc(windowX, innerY + 128, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#25485e";
    ctx.beginPath();
    ctx.arc(windowX, innerY + 128, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#7f694f";
  ctx.fillRect(hatchX, hatchY, hatchWidth, hatchHeight);
  ctx.strokeStyle = "#2b211b";
  ctx.lineWidth = 3;
  ctx.strokeRect(hatchX, hatchY, hatchWidth, hatchHeight);

  ctx.fillStyle = "rgba(8, 8, 8, 0.74)";
  ctx.fillRect(hatchX + 8, hatchY + 6, hatchWidth - 16, hatchHeight - 12);

  ctx.fillStyle = "#6d5945";
  ctx.fillRect(hatchX + hatchWidth - 12, hatchY - 56, 12, 64);
  ctx.fillRect(hatchX + hatchWidth - 2, hatchY - 58, 72, 12);

  ctx.fillStyle = "#8f7758";
  ctx.fillRect(hatchX + hatchWidth + 8, hatchY - 76, 62, 12);
  ctx.fillRect(hatchX + hatchWidth + 20, hatchY - 64, 12, 64);
  ctx.fillRect(hatchX + hatchWidth + 44, hatchY - 64, 12, 64);

  ctx.strokeStyle = "rgba(228, 206, 164, 0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hatchX + hatchWidth / 2, hatchY + 11, 8, 0.25, Math.PI - 0.25);
  ctx.stroke();

  ctx.fillStyle = "#5b4f44";
  ctx.fillRect(innerX + 226, floorY - 118, 44, 118);
  ctx.fillRect(innerX + 254, floorY - 138, 18, 138);
  ctx.fillRect(innerX + 238, floorY - 138, 42, 14);

  ctx.fillStyle = "#65584a";
  ctx.fillRect(centerX + 118, floorY - 74, 184, 18);
  ctx.fillRect(centerX + 150, floorY - 56, 18, 56);
  ctx.fillRect(centerX + 254, floorY - 56, 18, 56);
  ctx.fillStyle = "rgba(235, 205, 147, 0.12)";
  ctx.beginPath();
  ctx.ellipse(centerX + 210, floorY - 130, 124, 70, -0.12, 0, Math.PI * 2);
  ctx.fill();

  drawInteractablesV2();
  drawPlayer();

  ctx.restore();
}

function drawServiceSceneV2() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#161c21");
  gradient.addColorStop(1, "#090c10");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyWorldTransform();

  const { outerX, outerY, outerWidth, outerHeight, innerX, innerY, innerWidth, innerHeight, floorY, floorHeight } = serviceRoomVisual;
  const rightWallX = innerX + innerWidth;
  const backdropX = serviceRoomBounds.left - 260;
  const backdropWidth = serviceRoomBounds.right - serviceRoomBounds.left + 520;

  ctx.fillStyle = "#101419";
  ctx.fillRect(backdropX, 112, backdropWidth, 500);
  ctx.fillStyle = "#131920";
  ctx.fillRect(backdropX + 36, 140, backdropWidth - 72, 430);
  ctx.fillStyle = "#252d34";
  ctx.fillRect(backdropX, floorY - 6, backdropWidth, 18);
  ctx.fillStyle = "#4a564f";
  ctx.fillRect(backdropX, floorY + 12, backdropWidth, 16);

  ctx.fillStyle = "#181b20";
  ctx.fillRect(outerX, outerY, outerWidth, outerHeight);

  ctx.fillStyle = "#222930";
  ctx.fillRect(innerX, innerY, innerWidth, innerHeight);

  ctx.fillStyle = "#2b333a";
  ctx.fillRect(innerX + 18, innerY + 18, innerWidth - 36, innerHeight - 82);

  ctx.fillStyle = "#4f5a53";
  ctx.fillRect(innerX, floorY, innerWidth, floorHeight);
  ctx.fillStyle = "#39433f";
  ctx.fillRect(innerX, floorY + 18, innerWidth, 10);

  ctx.strokeStyle = "rgba(124, 136, 144, 0.18)";
  ctx.lineWidth = 4;
  for (let seamX = innerX + 140; seamX < rightWallX - 120; seamX += 168) {
    ctx.beginPath();
    ctx.moveTo(seamX, innerY + 24);
    ctx.lineTo(seamX, floorY - 18);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(110, 121, 128, 0.22)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(innerX + 28, floorY - 14);
  ctx.lineTo(rightWallX - 28, floorY - 14);
  ctx.stroke();

  ctx.strokeStyle = "rgba(88, 101, 112, 0.28)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(innerX + 44, floorY - 92);
  ctx.lineTo(rightWallX - 64, floorY - 92);
  ctx.stroke();

  ctx.fillStyle = "rgba(153, 187, 206, 0.08)";
  ctx.fillRect(innerX + 180, innerY + 42, innerWidth - 360, 86);

  ctx.fillStyle = "#59636f";
  ctx.fillRect(innerX + 926, innerY + 86, 36, 286);
  ctx.fillStyle = "#6d7480";
  ctx.fillRect(innerX + 918, innerY + 74, 52, 18);

  ctx.fillStyle = "#6e624d";
  ctx.fillRect(innerX + 80, floorY - 56, 86, 56);
  ctx.strokeStyle = "#2b211b";
  ctx.lineWidth = 3;
  ctx.strokeRect(innerX + 90, floorY - 46, 66, 36);
  ctx.fillStyle = "#d8c398";
  ctx.fillRect(innerX + 102, floorY - 35, 42, 14);

  ctx.fillStyle = "#3f4852";
  ctx.fillRect(innerX + 474, floorY - 84, 26, 84);
  ctx.fillStyle = "#56626f";
  ctx.fillRect(innerX + 450, floorY - 130, 74, 50);
  ctx.fillStyle = "#9bb7c8";
  ctx.fillRect(innerX + 462, floorY - 118, 50, 20);
  ctx.fillStyle = "#1d2229";
  ctx.fillRect(innerX + 462, floorY - 96, 50, 24);

  ctx.fillStyle = "#6d5945";
  ctx.fillRect(rightWallX - 86, floorY - 102, 54, 102);
  ctx.fillStyle = "#3b2d25";
  ctx.fillRect(rightWallX - 76, floorY - 90, 34, 76);
  ctx.fillStyle = "#a7875a";
  ctx.beginPath();
  ctx.arc(rightWallX - 44, floorY - 50, 5, 0, Math.PI * 2);
  ctx.fill();

  drawInteractablesV2();
  drawPlayer();

  ctx.restore();
}

function drawTunnelSceneV2() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#141719");
  gradient.addColorStop(1, "#08090b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyWorldTransform();

  const { outerX, outerY, outerWidth, outerHeight, innerX, innerY, innerWidth, innerHeight, floorY, floorHeight } = tunnelRoomVisual;
  const rightWallX = innerX + innerWidth;
  const backdropX = tunnelRoomBounds.left - 240;
  const backdropWidth = tunnelRoomBounds.right - tunnelRoomBounds.left + 480;

  ctx.fillStyle = "#101110";
  ctx.fillRect(backdropX, 110, backdropWidth, 510);
  ctx.fillStyle = "#1c1d18";
  ctx.beginPath();
  ctx.moveTo(backdropX, innerY + 140);
  ctx.quadraticCurveTo(backdropX + 120, innerY + 18, backdropX + 360, innerY + 56);
  ctx.lineTo(backdropX + backdropWidth - 360, innerY + 62);
  ctx.quadraticCurveTo(backdropX + backdropWidth - 120, innerY + 24, backdropX + backdropWidth, innerY + 146);
  ctx.lineTo(backdropX + backdropWidth, floorY + 10);
  ctx.lineTo(backdropX, floorY + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a3a31";
  ctx.fillRect(backdropX, floorY + 10, backdropWidth, 18);

  ctx.fillStyle = "#171715";
  ctx.fillRect(outerX, outerY, outerWidth, outerHeight);

  ctx.fillStyle = "#23241f";
  ctx.beginPath();
  ctx.moveTo(innerX, innerY + 92);
  ctx.quadraticCurveTo(innerX + 120, innerY + 10, innerX + 300, innerY + 32);
  ctx.lineTo(rightWallX - 260, innerY + 36);
  ctx.quadraticCurveTo(rightWallX - 100, innerY + 12, rightWallX, innerY + 108);
  ctx.lineTo(rightWallX, floorY);
  ctx.lineTo(innerX, floorY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2d2d26";
  ctx.fillRect(innerX + 16, floorY, innerWidth - 32, floorHeight);
  ctx.fillStyle = "#3b3b32";
  ctx.fillRect(innerX + 16, floorY + 16, innerWidth - 32, 10);

  ctx.strokeStyle = "rgba(145, 136, 102, 0.2)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(innerX + 72, floorY - 20);
  ctx.lineTo(rightWallX - 74, floorY - 20);
  ctx.stroke();

  ctx.strokeStyle = "rgba(86, 96, 102, 0.2)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(innerX + 220, innerY + 120);
  ctx.lineTo(rightWallX - 220, innerY + 120);
  ctx.stroke();

  ctx.fillStyle = "rgba(120, 145, 158, 0.08)";
  ctx.beginPath();
  ctx.ellipse(innerX + 620, innerY + 158, 160, 74, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6e624d";
  ctx.fillRect(innerX + 144, floorY - 58, 58, 58);
  ctx.fillStyle = "#4f4338";
  ctx.fillRect(innerX + 156, floorY - 110, 34, 52);

  ctx.fillStyle = "#56626d";
  ctx.fillRect(rightWallX - 248, floorY - 114, 72, 114);
  ctx.fillStyle = "#8fb0bf";
  ctx.fillRect(rightWallX - 234, floorY - 98, 44, 20);
  ctx.fillStyle = "#1c2328";
  ctx.fillRect(rightWallX - 234, floorY - 74, 44, 36);

  ctx.fillStyle = "#5e6972";
  ctx.fillRect(rightWallX - 92, floorY - 100, 50, 100);
  ctx.fillStyle = "#35414a";
  ctx.fillRect(rightWallX - 82, floorY - 88, 30, 72);

  drawInteractablesV2();
  drawPlayer();

  ctx.restore();
}

function drawLighthouseExterior() {
  ctx.fillStyle = "#4e5756";
  ctx.fillRect(760, 574, 420, 18);
  ctx.fillStyle = "#394241";
  ctx.fillRect(780, 592, 390, 38);
  ctx.fillStyle = "#273138";
  ctx.fillRect(736, 608, 454, 18);

  ctx.fillStyle = "#64584d";
  ctx.fillRect(800, 250, 330, 350);

  ctx.fillStyle = "#8e8071";
  ctx.fillRect(860, 110, 210, 160);

  ctx.fillStyle = "#d9c59d";
  ctx.fillRect(920, 70, 90, 50);

  ctx.fillStyle = "#4b392e";
  ctx.fillRect(925, 470, 70, 130);

  ctx.fillStyle = "#2b2220";
  ctx.fillRect(900, 320, 50, 85);
  ctx.fillRect(1000, 320, 50, 85);

  ctx.fillStyle = "#6e5a44";
  ctx.fillRect(680, 544, 132, 14);
  ctx.fillRect(676, 558, 150, 14);
  ctx.fillStyle = "#8a724f";
  for (let plankX = 688; plankX < 810; plankX += 22) {
    ctx.fillRect(plankX, 548, 14, 8);
  }
  ctx.fillStyle = "#4b3b2d";
  ctx.fillRect(710, 558, 10, 52);
  ctx.fillRect(786, 558, 10, 52);

  ctx.strokeStyle = "rgba(233, 239, 236, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, world.seaLevel + 12);
  ctx.lineTo(1420, world.seaLevel + 12);
  ctx.stroke();

  if (isStageAtLeast("epilogue")) {
    ctx.fillStyle = "#2a221c";
    ctx.fillRect(1044, 568, 66, 18);
  }

  if (gameState.endingUnlocked) {
    ctx.fillStyle = "rgba(247, 219, 148, 0.78)";
    ctx.beginPath();
    ctx.moveTo(965, 95);
    ctx.lineTo(1380, -20);
    ctx.lineTo(1380, 90);
    ctx.closePath();
    ctx.fill();
  }
}

function drawInteractablesV2() {
  for (const item of interactables) {
    if (!isInteractableVisible(item)) {
      continue;
    }

    const isActive = distanceToPlayer(item) < interactionRange && !gameState.chapterOverlayVisible;
    drawInteractableSprite(item, isActive);

    if (isActive) {
      drawInteractionPrompt(item);
    }
  }
}

function drawInteractionPrompt(item) {
  const plainLabel = `${item.title} / E`;
  const pulse = 0.5 + 0.5 * Math.sin(gameState.worldTime * 3.2);

  ctx.save();
  ctx.font = "18px Georgia";
  const bubbleWidth = Math.ceil(ctx.measureText(plainLabel).width + 34);
  const bubbleHeight = 36;
  const bubbleX = item.x + item.width / 2 - bubbleWidth / 2;
  const bubbleY = Math.max(item.y - 46 - pulse * 2, 14);

  drawUiPanel(bubbleX, bubbleY, bubbleWidth, bubbleHeight, {
    radius: 18,
    fillTop: "rgba(18, 26, 35, 0.96)",
    fillBottom: "rgba(9, 13, 18, 0.96)",
    stroke: "rgba(238, 198, 118, 0.3)",
    blur: 14,
    accent: "rgba(238, 198, 118, 0.12)",
  });

  ctx.fillStyle = "#f4e6c4";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(plainLabel, bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2 + 1);
  ctx.restore();
}

function drawInteractableSprite(item, isActive) {
  const { x, y, width: w, height: h } = item;
  const accent = getItemColor(item);
  const outline = isActive ? "#f6e0a2" : "rgba(25, 18, 15, 0.55)";

  ctx.save();
  if (isActive) {
    ctx.shadowColor = "rgba(246, 224, 162, 0.32)";
    ctx.shadowBlur = 12;
  }

  drawInteractableShadow(item);

  switch (item.id) {
    case "bed":
      fillAndStrokeRect(x, y + 30, w, 16, "#6d5847", outline);
      fillAndStrokeRect(x + 4, y + 12, w - 8, 22, "#bca98f", outline);
      fillAndStrokeRect(x + 10, y + 14, 30, 14, "#eee6d7", outline);
      fillAndStrokeRect(x + 42, y + 14, w - 50, 16, accent, outline);
      fillAndStrokeRect(x + 10, y + 34, 12, 20, "#4d4037", outline);
      fillAndStrokeRect(x + w - 22, y + 34, 12, 20, "#4d4037", outline);
      break;
    case "clutter":
      drawWorkbenchSprite(x, y, w, h, accent, outline);
      break;
    case "battery":
      drawBatterySprite(x, y, w, h, accent, outline);
      break;
    case "fuse":
      drawFuseSprite(x, y, w, h, accent, outline);
      break;
    case "footprints-room":
    case "footprints":
      drawFootprintsSprite(x, y, w, h, accent, outline);
      break;
    case "leaf-pile":
      drawLeafPileSprite(x, y, w, h, accent, outline);
      break;
    case "room-door":
      drawSideDoorSprite(x, y, w, h, accent, outline);
      break;
    case "lighthouse-door":
    case "sealed-door":
    case "service-return-door":
    case "tunnel-exit":
    case "pier-return-door":
      drawDoorSprite(x, y, w, h, accent, outline);
      break;
    case "tower-ladder":
    case "lantern-ladder-down":
      drawLadderSprite(x, y, w, h, accent, outline);
      break;
    case "lamp-mechanism":
      drawLampMechanismSprite(x, y, w, h, accent, outline);
      break;
    case "sea-gate":
    case "bay-return-gate":
      drawGateSprite(x, y, w, h, accent, outline);
      break;
    case "boat":
    case "skiff":
      drawBoatSprite(x, y, w, h, accent, outline);
      break;
    case "crate":
      drawCrateSprite(x, y, w, h, "#7a6752", outline, false);
      break;
    case "toolbox":
      drawCrateSprite(x, y, w, h, "#7a6858", outline, true);
      break;
    case "locker":
      drawLockerSprite(x, y, w, h, "#72614f", outline);
      break;
    case "cache":
      drawCacheSprite(x, y, w, h, accent, outline);
      break;
    case "note":
    case "logbook":
      drawPaperSprite(x, y, w, h, item.id === "logbook", outline);
      break;
    case "screwdriver":
      drawScrewdriverSprite(x, y, w, h, accent, outline);
      break;
    case "serviceKey":
      drawKeySprite(x, y, w, h, accent, outline);
      break;
    case "boatHook":
      drawBoatHookSprite(x, y, w, h, accent, outline);
      break;
    case "radio":
      drawRadioSprite(x, y, w, h, false, accent, outline);
      break;
    case "signal":
      drawRadioSprite(x, y, w, h, true, accent, outline);
      break;
    case "valve-wheel":
      drawWheelSprite(x, y, w, h, accent, outline);
      break;
    case "generator":
      drawGeneratorSprite(x, y, w, h, accent, outline);
      break;
    case "hatch":
    case "service-hatch-return":
      drawHatchSprite(x, y, w, h, accent, outline);
      break;
    case "service-console":
      drawConsoleSprite(x, y, w, h, accent, outline);
      break;
    case "rope-winch":
      drawWinchSprite(x, y, w, h, accent, outline);
      break;
    case "campfire":
      drawCampfireSprite(x, y, w, h, outline);
      break;
    default:
      fillAndStrokeRect(x, y, w, h, accent, outline);
      break;
  }

  ctx.restore();
}

function fillAndStrokeRect(x, y, width, height, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}

function drawDoorSprite(x, y, w, h, accent, outline) {
  fillAndStrokeRect(x, y, w, h, "#7d674f", outline);
  fillAndStrokeRect(x + 8, y + 8, w - 16, h - 16, "#302520", outline);
  fillAndStrokeRect(x + 14, y + 14, w - 28, 24, "#473730", outline);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x + w - 16, y + h / 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSideDoorSprite(x, y, w, h, accent, outline) {
  ctx.fillStyle = "#8a7358";
  ctx.fillRect(x - 8, y - 10, 8, h + 12);
  ctx.fillRect(x + w - 2, y - 10, 8, h + 12);
  ctx.fillRect(x - 8, y - 10, w + 14, 10);

  ctx.fillStyle = "rgba(14, 10, 9, 0.94)";
  ctx.fillRect(x, y - 4, w, h + 4);

  ctx.fillStyle = "#3c2d25";
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 10);
  ctx.lineTo(x + w - 2, y + 2);
  ctx.lineTo(x + w - 2, y + h - 18);
  ctx.lineTo(x + 4, y + h - 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 24);
  ctx.lineTo(x + w - 10, y + 18);
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x + 9, y + h - 48, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawWorkbenchSprite(x, y, w, h, accent, outline) {
  fillAndStrokeRect(x + 8, y + 20, w - 16, 14, "#655244", outline);
  fillAndStrokeRect(x + 16, y + 34, w - 32, 16, "#7e6b56", outline);
  fillAndStrokeRect(x + 18, y + 50, 14, h - 50, "#56493d", outline);
  fillAndStrokeRect(x + w - 32, y + 50, 14, h - 50, "#56493d", outline);
  fillAndStrokeRect(x + 28, y + 56, w - 56, 18, "#4f433a", outline);
  fillAndStrokeRect(x + 40, y + 58, 48, 14, accent, outline);
  fillAndStrokeRect(x + 98, y + 56, 58, 20, "#6d5d4d", outline);
  ctx.fillStyle = "#d6c7a3";
  ctx.fillRect(x + 22, y + 12, 18, 8);
  ctx.fillStyle = "#9c835d";
  ctx.fillRect(x + 52, y + 10, 14, 10);
  ctx.fillStyle = "#8ca1ad";
  ctx.fillRect(x + w - 52, y + 4, 16, 18);
}

function drawLadderSprite(x, y, w, h, accent, outline) {
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 18, y);
  ctx.lineTo(x + 18, y + h);
  ctx.moveTo(x + w - 18, y);
  ctx.lineTo(x + w - 18, y + h);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  for (let rungY = y + 18; rungY < y + h - 10; rungY += 26) {
    ctx.beginPath();
    ctx.moveTo(x + 18, rungY);
    ctx.lineTo(x + w - 18, rungY);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(235, 204, 150, 0.12)";
  ctx.fillRect(x + 12, y, w - 24, h);
}

function drawLampMechanismSprite(x, y, w, h, accent, outline) {
  fillAndStrokeRect(x + 28, y + h - 34, w - 56, 18, "#5c4c3f", outline);
  fillAndStrokeRect(x + 54, y + h - 74, w - 108, 42, "#4f4339", outline);
  fillAndStrokeRect(x + 64, y + h - 102, 34, 28, "#6f5d4d", outline);
  fillAndStrokeRect(x + w - 98, y + h - 102, 34, 28, "#6f5d4d", outline);
  ctx.fillStyle = "rgba(233, 205, 149, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + 16, y + 40, 82, 48, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x + w / 2 + 12, y + 38, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#25465d";
  ctx.beginPath();
  ctx.arc(x + w / 2 + 12, y + 38, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 14, y + h - 56, 28, 18);
  ctx.strokeRect(x + w - 42, y + h - 56, 28, 18);
}

function drawGateSprite(x, y, w, h, accent, outline) {
  fillAndStrokeRect(x, y, w, h, "#465058", outline);
  for (let offset = 10; offset < w - 8; offset += 12) {
    ctx.fillStyle = "#20262b";
    ctx.fillRect(x + offset, y + 6, 6, h - 12);
  }
  ctx.fillStyle = accent;
  ctx.fillRect(x + 6, y + 8, w - 12, 6);
}

function drawBoatSprite(x, y, w, h, accent, outline) {
  ctx.fillStyle = "#596872";
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h - 8);
  ctx.lineTo(x + w - 12, y + h - 8);
  ctx.lineTo(x + w - 26, y + h);
  ctx.lineTo(x + 26, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.stroke();
  fillAndStrokeRect(x + w * 0.35, y + 6, w * 0.24, h * 0.28, accent, outline);
  fillAndStrokeRect(x + w * 0.24, y + h * 0.34, w * 0.52, h * 0.2, "#41535e", outline);
}

function drawCrateSprite(x, y, w, h, fill, outline, hasHandle) {
  fillAndStrokeRect(x, y + 8, w, h - 8, fill, outline);
  ctx.fillStyle = "rgba(38, 28, 22, 0.35)";
  ctx.fillRect(x + 8, y + 18, w - 16, 4);
  ctx.fillRect(x + 8, y + 28, w - 16, 4);
  if (hasHandle) {
    ctx.strokeStyle = "#d1bc83";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + w / 2 - 8, y + 2, 16, 8);
  }
}

function drawLockerSprite(x, y, w, h, fill, outline) {
  fillAndStrokeRect(x, y, w, h, fill, outline);
  ctx.strokeStyle = "#51443a";
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
  ctx.fillStyle = "#d7bb74";
  ctx.beginPath();
  ctx.arc(x + w - 12, y + h / 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawCacheSprite(x, y, w, h, accent, outline) {
  ctx.fillStyle = "#6f745c";
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 12);
  ctx.lineTo(x + w - 6, y);
  ctx.lineTo(x + w - 14, y + 20);
  ctx.lineTo(x + 10, y + 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();
  fillAndStrokeRect(x + 10, y + 22, w - 20, h - 24, "#7a6855", outline);
  ctx.fillStyle = accent;
  ctx.fillRect(x + 18, y + 30, w - 36, 8);
}

function drawPaperSprite(x, y, w, h, isBook, outline) {
  const fill = isBook ? "#7a5d42" : "#e9ddb3";
  fillAndStrokeRect(x, y, w, h, fill, outline);
  ctx.fillStyle = isBook ? "#d9c9aa" : "#a89362";
  ctx.fillRect(x + 6, y + 8, w - 12, 2);
  ctx.fillRect(x + 6, y + 14, w - 16, 2);
  ctx.fillRect(x + 6, y + 20, w - 10, 2);
}

function drawLeafPileSprite(x, y, w, h, accent, outline) {
  ctx.fillStyle = "#4f4432";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h - 8, w * 0.48, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let index = 0; index < 7; index += 1) {
    const leafX = x + 12 + index * ((w - 24) / 6);
    const leafY = y + 10 + (index % 3) * 7;
    ctx.fillStyle = index % 2 === 0 ? accent : "#8c6b43";
    ctx.beginPath();
    ctx.ellipse(leafX, leafY + 10, 10, 5, index % 2 === 0 ? -0.32 : 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + h - 8);
  ctx.quadraticCurveTo(x + w / 2, y + 4, x + w - 8, y + h - 8);
  ctx.stroke();
}

function drawBatterySprite(x, y, w, h, accent, outline) {
  fillAndStrokeRect(x + 2, y + 4, w - 4, h - 8, "#5a646b", outline);
  fillAndStrokeRect(x + w / 2 - 5, y, 10, 8, "#a5b1bb", outline);
  fillAndStrokeRect(x + 6, y + 10, w - 12, h - 20, accent, outline);
  ctx.fillStyle = "#2b3136";
  ctx.fillRect(x + 9, y + 14, w - 18, 4);
}

function drawScrewdriverSprite(x, y, w, h, accent, outline) {
  ctx.save();
  ctx.translate(x + w * 0.18, y + h * 0.82);
  ctx.rotate(-0.48);
  fillAndStrokeRect(0, -6, w * 0.58, 12, accent, outline);
  fillAndStrokeRect(w * 0.52, -4, w * 0.18, 8, "#c3ccd4", outline);
  ctx.fillStyle = "#6f4a38";
  ctx.fillRect(10, -2, w * 0.18, 4);
  ctx.restore();
}

function drawFuseSprite(x, y, w, h, accent, outline) {
  fillAndStrokeRect(x + 4, y + 4, w - 8, h - 8, "#bcc6ce", outline);
  ctx.fillStyle = accent;
  ctx.fillRect(x + 8, y + 7, w - 16, h - 14);
  ctx.fillStyle = "#6b5a47";
  ctx.fillRect(x, y + h / 2 - 2, 8, 4);
  ctx.fillRect(x + w - 8, y + h / 2 - 2, 8, 4);
}

function drawRadioSprite(x, y, w, h, isStanding, accent, outline) {
  if (isStanding) {
    ctx.fillStyle = "#323b42";
    ctx.fillRect(x + w / 2 - 3, y + 20, 6, h - 20);
    ctx.fillRect(x + 10, y + h - 8, w - 20, 4);
    fillAndStrokeRect(x + 10, y + 10, w - 20, 34, "#5d6e76", outline);
    ctx.strokeStyle = outline;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 10);
    ctx.lineTo(x + w / 2, y - 20);
    ctx.stroke();
  } else {
    fillAndStrokeRect(x, y + 12, w, h - 12, "#5d6e76", outline);
    ctx.strokeStyle = outline;
    ctx.beginPath();
    ctx.moveTo(x + w - 16, y + 12);
    ctx.lineTo(x + w - 6, y - 6);
    ctx.stroke();
  }
  ctx.fillStyle = "#233039";
  ctx.fillRect(x + 8, y + 22, w - 16, 16);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x + w - 14, y + 28, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawKeySprite(x, y, w, h, accent, outline) {
  const ringX = x + w * 0.26;
  const ringY = y + h * 0.46;
  const shaftX = x + w * 0.34;
  const shaftY = y + h * 0.42;

  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(3, w * 0.08);
  ctx.beginPath();
  ctx.arc(ringX, ringY, Math.min(w, h) * 0.18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.fillRect(shaftX, shaftY, w * 0.42, h * 0.12);
  ctx.fillRect(x + w * 0.58, y + h * 0.44, w * 0.08, h * 0.18);
  ctx.fillRect(x + w * 0.7, y + h * 0.44, w * 0.08, h * 0.12);

  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.strokeRect(shaftX, shaftY, w * 0.42, h * 0.12);
}

function drawBoatHookSprite(x, y, w, h, accent, outline) {
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(4, w * 0.08);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, y + h - 6);
  ctx.lineTo(x + w * 0.7, y + 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + w * 0.72, y + 12, w * 0.16, 0.18 * Math.PI, 1.24 * Math.PI);
  ctx.stroke();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.26, y + h - 4);
  ctx.lineTo(x + w * 0.66, y + 8);
  ctx.stroke();
}

function drawWheelSprite(x, y, w, h, accent, outline) {
  const radius = Math.min(w, h) / 2 - 6;
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    const angle = (Math.PI / 2) * i;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
    ctx.stroke();
  }
  ctx.fillStyle = "#f0e1ba";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawGeneratorSprite(x, y, w, h, accent, outline) {
  fillAndStrokeRect(x, y + 10, w, h - 10, "#63584b", outline);
  fillAndStrokeRect(x + 8, y + 18, 24, h - 26, "#41484e", outline);
  fillAndStrokeRect(x + 40, y + 18, w - 48, 18, "#2d343a", outline);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x + w - 16, y + 28, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHatchSprite(x, y, w, h, accent, outline) {
  fillAndStrokeRect(x, y + h / 3, w, h * 0.66, "#57493d", outline);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 8, y + h / 3 + 6, w - 16, h * 0.66 - 12);
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2 + 10, 5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawConsoleSprite(x, y, w, h, accent, outline) {
  ctx.fillStyle = "#2d363d";
  ctx.fillRect(x + w / 2 - 8, y + 30, 16, h - 30);
  fillAndStrokeRect(x, y, w, 34, "#46535d", outline);
  ctx.fillStyle = accent;
  ctx.fillRect(x + 8, y + 8, w - 16, 12);
  ctx.fillStyle = "#1a2228";
  ctx.fillRect(x + 12, y + 22, w - 24, 8);
}

function drawFootprintsSprite(x, y, w, h, accent, outline) {
  const steps = 5;
  for (let i = 0; i < steps; i += 1) {
    const baseX = x + 18 + i * ((w - 40) / (steps - 1));
    const baseY = y + (i % 2 === 0 ? 2 : 8);
    const scale = 1 + i * 0.08;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + 10, 7 * scale, 11 * scale, -0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(baseX + 14, baseY + 15, 6 * scale, 10 * scale, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWinchSprite(x, y, w, h, accent, outline) {
  ctx.fillStyle = "#4e4338";
  ctx.fillRect(x + 6, y + 28, 10, h - 28);
  ctx.fillRect(x + w - 16, y + 28, 10, h - 28);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 34, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#243039";
  ctx.fillRect(x + 12, y + h - 10, w - 24, 8);
  ctx.strokeStyle = outline;
  ctx.strokeRect(x + 6, y + 10, w - 12, h - 12);
}

function drawCampfireSprite(x, y, w, h, outline) {
  ctx.fillStyle = "#54473d";
  ctx.beginPath();
  ctx.arc(x + 10, y + h - 8, 8, 0, Math.PI * 2);
  ctx.arc(x + w / 2, y + h - 10, 9, 0, Math.PI * 2);
  ctx.arc(x + w - 10, y + h - 8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.strokeStyle = "#6a4935";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h - 12);
  ctx.lineTo(x + w - 10, y + 10);
  ctx.moveTo(x + w - 10, y + h - 12);
  ctx.lineTo(x + 10, y + 12);
  ctx.stroke();
  ctx.fillStyle = "#d88e4a";
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 8);
  ctx.lineTo(x + w / 2 + 8, y + 26);
  ctx.lineTo(x + w / 2, y + 22);
  ctx.lineTo(x + w / 2 - 8, y + 26);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const walkCycle = Math.sin(gameState.worldTime * 9 * Math.max(0.25, Math.abs(player.vx) / player.speed + 0.15));
  const bodyLift = player.grounded ? Math.abs(walkCycle) * 1.5 : -2;
  const legSwing = player.grounded ? walkCycle * 4 : 0;
  const armSwing = player.grounded ? -walkCycle * 3 : 0;

  ctx.save();
  ctx.fillStyle = "rgba(4, 6, 8, 0.26)";
  ctx.beginPath();
  ctx.ellipse(player.x + player.width / 2, player.y + player.height - 2, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d2b48c";
  ctx.fillRect(player.x + 10, player.y + bodyLift, 24, 22);

  ctx.fillStyle = "#34414e";
  ctx.fillRect(player.x + 6, player.y + 22 + bodyLift, 32, 32);

  ctx.fillStyle = "#25303b";
  const armX = player.facing === 1 ? player.x + 34 : player.x + 4;
  ctx.fillRect(armX, player.y + 26 + bodyLift + armSwing, 8, 22);

  ctx.fillStyle = "#5b4232";
  ctx.fillRect(player.x + 12, player.y + 54 + bodyLift + legSwing, 8, 20);
  ctx.fillRect(player.x + 24, player.y + 54 + bodyLift - legSwing, 8, 20);
  ctx.restore();
}

function roundedRectPath(x, y, width, height, radius = 18) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundedRect(x, y, width, height, radius, fillStyle) {
  ctx.save();
  roundedRectPath(x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function strokeRoundedRect(x, y, width, height, radius, strokeStyle, lineWidth = 2) {
  ctx.save();
  roundedRectPath(x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function drawUiPanel(x, y, width, height, options = {}) {
  const {
    radius = 22,
    fillTop = "rgba(13, 20, 27, 0.9)",
    fillBottom = "rgba(7, 11, 16, 0.92)",
    stroke = "rgba(226, 184, 104, 0.22)",
    lineWidth = 2,
    glow = "rgba(0, 0, 0, 0.24)",
    blur = 18,
    accent = "rgba(226, 184, 104, 0.1)",
  } = options;

  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = 8;
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  gradient.addColorStop(0, fillTop);
  gradient.addColorStop(1, fillBottom);
  fillRoundedRect(x, y, width, height, radius, gradient);
  if (accent) {
    fillRoundedRect(x + 1, y + 1, width - 2, 14, Math.max(8, radius - 8), accent);
  }
  strokeRoundedRect(x, y, width, height, radius, stroke, lineWidth);
  ctx.restore();
}

function drawUiPill(text, x, y, options = {}) {
  const {
    font = "16px Georgia",
    paddingX = 14,
    height = 28,
    fill = "rgba(11, 16, 22, 0.9)",
    stroke = "rgba(226, 184, 104, 0.18)",
    textColor = "#f1e4c2",
    radius = 999,
  } = options;

  ctx.save();
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width + paddingX * 2);
  fillRoundedRect(x, y, width, height, radius, fill);
  strokeRoundedRect(x, y, width, height, radius, stroke, 1.5);
  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + paddingX, y + height / 2 + 1);
  ctx.restore();

  return { width, height };
}

function getWrappedLines(text, maxWidth) {
  const lines = [];
  const paragraphs = String(text ?? "").split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");
    let line = "";

    for (const word of words) {
      if (ctx.measureText(word).width > maxWidth) {
        if (line.trim()) {
          lines.push(line.trim());
          line = "";
        }

        let chunk = "";
        for (const char of word) {
          const testChunk = `${chunk}${char}`;
          if (ctx.measureText(testChunk).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk = testChunk;
          }
        }

        if (chunk) {
          line = `${chunk} `;
        }
        continue;
      }

      const testLine = `${line}${word} `;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line.trim());
        line = `${word} `;
      } else {
        line = testLine;
      }
    }

    if (line.trim()) {
      lines.push(line.trim());
    } else if (!paragraph.trim()) {
      lines.push("");
    }
  }

  return lines.length ? lines : [""];
}

function drawTopHud() {
  const panelX = 24;
  const panelY = 24;
  const panelWidth = Math.min(520, Math.max(320, canvas.width * 0.32));
  const selectedLabel = gameState.selectedItemId
    ? `В руке: ${getItemLabel(gameState.selectedItemId)}`
    : "I — открыть инвентарь";

  ctx.save();
  ctx.font = "15px Georgia";
  const selectedPillWidth = Math.min(250, Math.ceil(ctx.measureText(selectedLabel).width + 28));
  ctx.font = "17px Georgia";
  const objectiveLines = getWrappedLines(gameState.currentObjective, panelWidth - 38).slice(0, 3);
  const panelHeight = 74 + objectiveLines.length * 24;

  drawUiPanel(panelX, panelY, panelWidth, panelHeight, {
    radius: 24,
    fillTop: "rgba(9, 16, 24, 0.76)",
    fillBottom: "rgba(5, 9, 14, 0.84)",
    stroke: "rgba(226, 184, 104, 0.14)",
    blur: 18,
    accent: "rgba(143, 183, 208, 0.08)",
  });

  drawUiPill(selectedLabel, panelX + panelWidth - 18 - selectedPillWidth, panelY + 14, {
    font: "15px Georgia",
    height: 28,
    fill: gameState.selectedItemId ? "rgba(61, 43, 18, 0.9)" : "rgba(15, 20, 26, 0.86)",
    stroke: gameState.selectedItemId ? "rgba(232, 191, 108, 0.34)" : "rgba(226, 184, 104, 0.16)",
    textColor: gameState.selectedItemId ? "#f4e5bf" : "#d3dde4",
  });

  ctx.fillStyle = "rgba(225, 236, 240, 0.92)";
  ctx.font = "17px Georgia";
  let lineY = panelY + 50;
  for (const line of objectiveLines) {
    ctx.fillText(line, panelX + 18, lineY);
    lineY += 24;
  }
  ctx.restore();
}

function drawMessagePanel() {
  const hotbarLayout = getHotbarLayout();
  const panelWidth = Math.min(canvas.width - 48, 820);
  const panelX = 24;

  ctx.save();
  ctx.font = "22px Georgia";
  const lines = getWrappedLines(gameState.activeMessage, panelWidth - 42);
  const panelHeight = 68 + lines.length * 26;
  const panelY = hotbarLayout.y - panelHeight - 18;

  drawUiPanel(panelX, panelY, panelWidth, panelHeight, {
    radius: 22,
    fillTop: "rgba(10, 16, 22, 0.28)",
    fillBottom: "rgba(7, 11, 16, 0.82)",
    stroke: "rgba(226, 184, 104, 0.12)",
    blur: 14,
    accent: "rgba(226, 184, 104, 0.06)",
  });

  drawUiPill("Журнал", panelX + 18, panelY + 16, {
    font: "17px Georgia",
    height: 30,
    fill: "rgba(18, 26, 34, 0.92)",
    stroke: "rgba(226, 184, 104, 0.24)",
    textColor: "#f0e5c8",
  });

  drawUiPill("I — инвентарь", panelX + panelWidth - 148, panelY + 16, {
    font: "15px Georgia",
    height: 28,
    fill: "rgba(14, 20, 26, 0.84)",
    stroke: "rgba(143, 183, 208, 0.18)",
    textColor: "#bed3df",
  });

  ctx.fillStyle = "#eef4ef";
  ctx.font = "22px Georgia";
  let lineY = panelY + 60;
  for (const line of lines) {
    ctx.fillText(line, panelX + 18, lineY);
    lineY += 26;
  }
  ctx.restore();
}

function drawSceneTransitionOverlay() {
  const { timer, duration, title, text } = gameState.sceneTransition;
  const progress = 1 - timer / duration;
  const alpha = progress < 0.16 ? 1 : progress < 0.84 ? 1 - (progress - 0.16) / 0.68 : 0;
  const textAlpha = progress < 0.08 ? progress / 0.08 : progress > 0.8 ? (1 - progress) / 0.2 : 1;

  ctx.fillStyle = `rgba(2, 4, 7, ${Math.max(0, alpha * 0.42)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (textAlpha <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = textAlpha;
  ctx.font = "19px Georgia";
  const textLines = getWrappedLines(text, Math.min(560, canvas.width - 120));
  const panelWidth = Math.min(620, canvas.width - 64);
  const panelHeight = 112 + textLines.length * 26;
  const panelX = 24;
  const panelY = canvas.height - panelHeight - 132;

  drawUiPanel(panelX, panelY, panelWidth, panelHeight, {
    radius: 24,
    fillTop: "rgba(10, 16, 22, 0.78)",
    fillBottom: "rgba(6, 10, 15, 0.9)",
    stroke: "rgba(226, 184, 104, 0.18)",
    blur: 18,
    accent: "rgba(143, 183, 208, 0.08)",
  });

  ctx.fillStyle = "#f4ead2";
  ctx.font = "26px Georgia";
  ctx.fillText(title, panelX + 22, panelY + 42);

  ctx.fillStyle = "rgba(221, 232, 227, 0.96)";
  ctx.font = "19px Georgia";
  wrapText(text, panelX + 22, panelY + 78, panelWidth - 44, 26);
  ctx.restore();
}

function drawPuzzleStatusPanel() {
  const statuses = getActivePuzzleStatuses();
  const hasSelection = Boolean(gameState.selectedItemId);

  if (!statuses.length && !hasSelection) {
    return;
  }

  const panelWidth = Math.min(292, canvas.width - 48);
  const panelX = canvas.width - panelWidth - 24;

  ctx.save();
  ctx.font = "18px Georgia";
  let contentHeight = 18;

  if (hasSelection) {
    contentHeight += 72;
  }

  for (const status of statuses) {
    contentHeight += 28;
    for (const step of status.steps) {
      const stepText = step.replace(/^\[[x ]\]\s*/, "");
      contentHeight += Math.min(3, getWrappedLines(stepText, panelWidth - 72).length) * 22;
    }
    contentHeight += 8;
  }

  const panelHeight = 48 + contentHeight;
  const panelY = 24;
  drawUiPanel(panelX, panelY, panelWidth, panelHeight, {
    radius: 22,
    fillTop: "rgba(10, 17, 24, 0.76)",
    fillBottom: "rgba(6, 11, 15, 0.84)",
    stroke: "rgba(226, 184, 104, 0.14)",
    blur: 16,
    accent: "rgba(143, 183, 208, 0.06)",
  });

  drawUiPill("Прогресс", panelX + 18, panelY + 16, {
    font: "16px Georgia",
    height: 28,
    fill: "rgba(15, 24, 32, 0.9)",
    stroke: "rgba(143, 183, 208, 0.2)",
    textColor: "#bdd5df",
  });

  let y = panelY + 58;

  if (hasSelection) {
    drawUiPanel(panelX + 16, y, panelWidth - 32, 54, {
      radius: 18,
      fillTop: "rgba(40, 29, 15, 0.92)",
      fillBottom: "rgba(19, 15, 10, 0.94)",
      stroke: "rgba(232, 191, 108, 0.2)",
      blur: 10,
      accent: "rgba(232, 191, 108, 0.14)",
    });
    ctx.fillStyle = "#e4b25f";
    ctx.font = "16px Georgia";
    ctx.fillText("В руке", panelX + 30, y + 22);
    ctx.fillStyle = "#f3e5c5";
    ctx.font = "22px Georgia";
    ctx.fillText(getItemLabel(gameState.selectedItemId), panelX + 30, y + 44, panelWidth - 60);
    y += 70;
  }

  for (const status of statuses) {
    ctx.fillStyle = "#e4b25f";
    ctx.font = "18px Georgia";
    ctx.fillText(status.title, panelX + 18, y, panelWidth - 36);
    y += 24;

    ctx.fillStyle = "#dce5df";
    ctx.font = "17px Georgia";
    for (const step of status.steps) {
      const isDone = step.startsWith("[x]");
      const isOwned = step.startsWith("[ ]") && step.includes("у тебя");
      const stepText = step.replace(/^\[[x ]\]\s*/, "");
      const lines = getWrappedLines(stepText, panelWidth - 72).slice(0, 3);

      ctx.beginPath();
      ctx.fillStyle = isDone ? "#e4b25f" : isOwned ? "#9ec3cf" : "rgba(220, 229, 223, 0.28)";
      ctx.arc(panelX + 28, y - 6, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isDone ? "#f1e3be" : "#dce5df";
      for (const line of lines) {
        ctx.fillText(line, panelX + 42, y);
        y += 22;
      }
    }
    y += 8;
  }

  ctx.restore();
}

function drawInteractableShadow(item) {
  const shadowWidth = Math.max(18, item.width * 0.72);
  const shadowHeight = Math.max(6, item.height * 0.16);
  const shadowY =
    item.id === "room-door" ||
    item.id === "lighthouse-door" ||
    item.id === "sealed-door" ||
    item.id === "service-return-door" ||
    item.id === "tunnel-exit" ||
    item.id === "pier-return-door" ||
    item.id === "bay-return-gate"
      ? item.y + item.height - 6
      : item.y + item.height - 2;

  ctx.save();
  ctx.fillStyle = "rgba(3, 5, 8, 0.22)";
  ctx.beginPath();
  ctx.ellipse(item.x + item.width / 2, shadowY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHotbar() {
  const layout = getHotbarLayout();
  const hoveredSlot = getHotbarSlotAtPosition(gameState.mousePosition.x, gameState.mousePosition.y);

  drawUiPanel(layout.x - 14, layout.y - 14, layout.width + 28, layout.height + 28, {
    radius: 24,
    fillTop: "rgba(8, 13, 18, 0.62)",
    fillBottom: "rgba(4, 7, 12, 0.74)",
    stroke: "rgba(226, 184, 104, 0.12)",
    blur: 12,
    accent: "rgba(143, 183, 208, 0.04)",
  });

  for (let index = 0; index < hotbarSlotCount; index += 1) {
    const slotX = layout.x + index * (layout.slotSize + layout.slotGap);
    const itemId = gameState.inventorySlots[index];
    const isCursor = gameState.inventoryCursor === index || hoveredSlot?.index === index;
    const isSelected = itemId && itemId === gameState.selectedItemId;
    drawSlotCell(slotX, layout.y, layout.slotSize, itemId, isCursor, isSelected, false);

    ctx.save();
    ctx.fillStyle = isSelected ? "#f6e0a2" : "rgba(220, 229, 223, 0.72)";
    ctx.font = "13px Georgia";
    ctx.textAlign = "right";
    ctx.fillText(String(index + 1), slotX + layout.slotSize - 8, layout.y + 16);
    ctx.restore();
  }

  if (gameState.selectedItemId) {
    const label = getItemLabel(gameState.selectedItemId);
    ctx.save();
    ctx.font = "16px Georgia";
    const pillWidth = Math.ceil(ctx.measureText(label).width + 28);
    drawUiPill(label, layout.x + (layout.width - pillWidth) / 2, layout.y - 36, {
      font: "16px Georgia",
      height: 28,
      fill: "rgba(40, 29, 15, 0.92)",
      stroke: "rgba(232, 191, 108, 0.22)",
      textColor: "#f3e5c5",
    });
    ctx.restore();
  }
}

function drawSlotCell(x, y, size, itemId, isCursor = false, isSelected = false, hideItem = false) {
  const baseFill = isCursor ? "rgba(92, 70, 37, 0.98)" : "rgba(39, 30, 23, 0.98)";
  const border = isSelected ? "#f6e0a2" : isCursor ? "#ddb66d" : "rgba(132, 105, 72, 0.9)";

  ctx.save();
  if (isSelected) {
    ctx.shadowColor = "rgba(246, 224, 162, 0.26)";
    ctx.shadowBlur = 14;
  }

  fillRoundedRect(x, y, size, size, 12, baseFill);
  fillRoundedRect(x + 3, y + 3, size - 6, size / 3.1, 9, "rgba(255, 255, 255, 0.05)");
  strokeRoundedRect(x, y, size, size, 12, border, isSelected ? 3 : 2);

  if (itemId && !hideItem) {
    fillRoundedRect(x + 7, y + 7, size - 14, size - 14, 9, "rgba(0, 0, 0, 0.14)");
    drawInventoryItemIcon(itemId, x + 8, y + 8, size - 16);
  }

  ctx.restore();
}

function drawSlotGridSection(grid, title, items, activeCursorIndex = -1) {
  const layout = getContainerOverlayLayout();
  const sectionPadding = 14;

  drawUiPanel(
    grid.x - sectionPadding,
    grid.y - 42,
    grid.width + sectionPadding * 2,
    grid.height + sectionPadding * 2 + 30,
    {
      radius: 18,
      fillTop: "rgba(41, 32, 24, 0.98)",
      fillBottom: "rgba(23, 19, 15, 0.98)",
      stroke: "rgba(193, 157, 92, 0.24)",
      blur: 8,
      accent: "rgba(193, 157, 92, 0.08)",
    }
  );

  drawUiPill(title, grid.x, grid.y - 34, {
    font: "18px Georgia",
    height: 28,
    fill: "rgba(17, 24, 31, 0.9)",
    stroke: "rgba(193, 157, 92, 0.2)",
    textColor: "#e7d4a7",
  });

  for (let index = 0; index < items.length; index += 1) {
    const slotX = grid.x + (index % grid.columns) * (layout.slotSize + layout.slotGap);
    const slotY = grid.y + Math.floor(index / grid.columns) * (layout.slotSize + layout.slotGap);
    const itemId = items[index];
    const isCursor = activeCursorIndex === index;
    const isSelected = itemId && itemId === gameState.selectedItemId;
    const hideItem =
      gameState.dragState &&
      gameState.dragState.sourceOwner === grid.owner &&
      gameState.dragState.sourceIndex === index;

    drawSlotCell(slotX, slotY, layout.slotSize, itemId, isCursor, isSelected, hideItem);
  }
}

function drawDraggedItemPreview() {
  if (!gameState.dragState) {
    return;
  }

  const size = 52;
  const x = gameState.dragState.x - size / 2;
  const y = gameState.dragState.y - size / 2;

  ctx.save();
  ctx.globalAlpha = 0.95;
  drawSlotCell(x, y, size, gameState.dragState.itemId, true, false, false);
  ctx.restore();
}

function drawContainerOverlay() {
  const layout = getContainerOverlayLayout();
  const containerItems = getContainerSlots();
  const inventoryItems = gameState.inventorySlots;
  const hoveredSlot = getContainerSlotAtPosition(gameState.mousePosition.x, gameState.mousePosition.y);
  const hoveredItemId = gameState.dragState?.itemId || (hoveredSlot ? getSlotItem(hoveredSlot.owner, hoveredSlot.index) : null);

  ctx.fillStyle = "rgba(2, 7, 11, 0.76)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawUiPanel(layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight, {
    radius: 26,
    fillTop: "rgba(20, 16, 13, 0.96)",
    fillBottom: "rgba(9, 8, 7, 0.97)",
    stroke: "rgba(193, 157, 92, 0.32)",
    blur: 24,
    accent: "rgba(193, 157, 92, 0.1)",
  });

  drawUiPill(getContainerTitle(), layout.panelX + 24, layout.panelY + 20, {
    font: "22px Georgia",
    height: 34,
    fill: "rgba(16, 24, 32, 0.9)",
    stroke: "rgba(193, 157, 92, 0.24)",
    textColor: "#f3e3bd",
  });

  ctx.fillStyle = "rgba(222, 232, 227, 0.82)";
  ctx.font = "18px Georgia";
  wrapText(
    "Перетащи предмет мышью между контейнером и инвентарём. Esc, E или I закрывают окно.",
    layout.panelX + 24,
    layout.panelY + 78,
    layout.panelWidth - 48,
    24
  );

  drawSlotGridSection(layout.containerGrid, "Контейнер", containerItems);
  drawSlotGridSection(layout.inventoryGrid, "Инвентарь", inventoryItems, gameState.inventoryCursor);

  const infoX = layout.panelX + 24;
  const infoY = layout.inventoryGrid.y + layout.inventoryGrid.height + 22;
  const infoWidth = layout.panelWidth - 48;
  const infoHeight = 96;

  drawUiPanel(infoX, infoY, infoWidth, infoHeight, {
    radius: 18,
    fillTop: "rgba(26, 21, 17, 0.98)",
    fillBottom: "rgba(14, 12, 10, 0.98)",
    stroke: "rgba(193, 157, 92, 0.18)",
    blur: 8,
    accent: "rgba(143, 183, 208, 0.06)",
  });

  ctx.fillStyle = "#e4b25f";
  ctx.font = "18px Georgia";
  ctx.fillText("Описание", infoX + 16, infoY + 28);

  ctx.fillStyle = "#f0e6cf";
  ctx.font = "24px Georgia";
  ctx.fillText(hoveredItemId ? getItemLabel(hoveredItemId) : "Пусто", infoX + 16, infoY + 58);

  if (hoveredItemId) {
    ctx.fillStyle = "#a9c5d3";
    ctx.font = "17px Georgia";
    wrapText(getItemUseHint(hoveredItemId), infoX + 16, infoY + 84, infoWidth - 32, 22);
  }

  drawDraggedItemPreview();
}

function drawInventoryOverlay() {
  const layout = getInventoryOverlayLayout();
  const selectedItemId = gameState.inventorySlots[gameState.inventoryCursor] ?? null;
  const previewItemId = selectedItemId ?? gameState.selectedItemId;
  const occupiedCount = getInventoryItemIds().length;
  const { panelWidth, panelHeight, panelX, panelY, slotSize, slotGap, gridX, gridY, gridWidth, gridHeight } = layout;
  const statuses = getActivePuzzleStatuses();
  const hoveredSlot = getInventorySlotAtPosition(gameState.mousePosition.x, gameState.mousePosition.y);

  ctx.fillStyle = "rgba(2, 7, 11, 0.76)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawUiPanel(panelX, panelY, panelWidth, panelHeight, {
    radius: 28,
    fillTop: "rgba(20, 16, 13, 0.96)",
    fillBottom: "rgba(9, 8, 7, 0.97)",
    stroke: "rgba(193, 157, 92, 0.32)",
    blur: 24,
    accent: "rgba(193, 157, 92, 0.1)",
  });

  drawUiPill("Инвентарь", panelX + 24, panelY + 20, {
    font: "24px Georgia",
    height: 36,
    fill: "rgba(16, 24, 32, 0.9)",
    stroke: "rgba(193, 157, 92, 0.24)",
    textColor: "#f3e3bd",
  });

  drawUiPill(`Слоты: ${occupiedCount}/${inventorySlotCount}`, panelX + panelWidth - 168, panelY + 20, {
    font: "16px Georgia",
    height: 30,
    fill: "rgba(14, 20, 26, 0.88)",
    stroke: "rgba(143, 183, 208, 0.18)",
    textColor: "#c1d5df",
  });

  ctx.fillStyle = "rgba(222, 232, 227, 0.8)";
  ctx.font = "17px Georgia";
  wrapText(
    "Клик выбирает слот, двойной клик открывает документы, Enter берёт предмет в руку, I или Esc закрывают инвентарь.",
    panelX + 24,
    panelY + 78,
    panelWidth - 48,
    24
  );

  drawUiPanel(gridX - 16, gridY - 24, gridWidth + 32, gridHeight + 48, {
    radius: 20,
    fillTop: "rgba(41, 32, 24, 0.98)",
    fillBottom: "rgba(23, 19, 15, 0.98)",
    stroke: "rgba(193, 157, 92, 0.22)",
    blur: 8,
    accent: "rgba(193, 157, 92, 0.08)",
  });
  drawUiPill("Сетка предметов", gridX, gridY - 34, {
    font: "18px Georgia",
    height: 28,
    fill: "rgba(17, 24, 31, 0.9)",
    stroke: "rgba(193, 157, 92, 0.2)",
    textColor: "#e7d4a7",
  });

  for (let index = 0; index < inventorySlotCount; index += 1) {
    const slotX = gridX + (index % inventoryColumns) * (slotSize + slotGap);
    const slotY = gridY + Math.floor(index / inventoryColumns) * (slotSize + slotGap);
    const itemId = gameState.inventorySlots[index];
    const isCursor = index === gameState.inventoryCursor || hoveredSlot?.index === index;
    const isSelected = itemId && itemId === gameState.selectedItemId;
    drawSlotCell(slotX, slotY, slotSize, itemId, isCursor, isSelected, false);
  }

  const infoX = gridX + gridWidth + 44;
  const infoY = gridY - 4;
  const infoWidth = panelWidth - (infoX - panelX) - 30;
  const infoHeight = 270;

  drawUiPanel(infoX, infoY, infoWidth, infoHeight, {
    radius: 20,
    fillTop: "rgba(26, 21, 17, 0.98)",
    fillBottom: "rgba(14, 12, 10, 0.98)",
    stroke: "rgba(193, 157, 92, 0.18)",
    blur: 8,
    accent: "rgba(143, 183, 208, 0.06)",
  });

  drawUiPill("Выбранный предмет", infoX + 16, infoY + 16, {
    font: "17px Georgia",
    height: 28,
    fill: "rgba(17, 24, 31, 0.88)",
    stroke: "rgba(193, 157, 92, 0.18)",
    textColor: "#e7d4a7",
  });

  if (previewItemId) {
    ctx.fillStyle = "#f0e6cf";
    ctx.font = "26px Georgia";
    ctx.fillText(getItemLabel(previewItemId), infoX + 16, infoY + 62);

    drawUiPanel(infoX + 16, infoY + 82, 96, 96, {
      radius: 16,
      fillTop: "rgba(55, 43, 33, 0.96)",
      fillBottom: "rgba(33, 26, 20, 0.98)",
      stroke: "rgba(193, 157, 92, 0.2)",
      blur: 6,
      accent: "rgba(193, 157, 92, 0.08)",
    });
    drawInventoryItemIcon(previewItemId, infoX + 28, infoY + 94, 68);

    ctx.fillStyle = "#dce5df";
    ctx.font = "19px Georgia";
    wrapText(getItemDescription(previewItemId), infoX + 128, infoY + 110, infoWidth - 144, 26);

    ctx.fillStyle = "#9fc1d4";
    ctx.font = "17px Georgia";
    wrapText(getItemUseHint(previewItemId), infoX + 16, infoY + 214, infoWidth - 32, 24);

    if (isReadableItem(previewItemId)) {
      ctx.fillStyle = "#e4b25f";
      ctx.font = "16px Georgia";
      ctx.fillText("Двойной клик откроет документ для чтения.", infoX + 16, infoY + 248);
    }
  } else {
    ctx.fillStyle = "#dce5df";
    ctx.font = "22px Georgia";
    wrapText("Выбери предмет в сетке и нажми Enter, чтобы взять его в руку или подготовить к использованию.", infoX + 16, infoY + 96, infoWidth - 32, 32);
  }

  const handX = infoX;
  const handY = infoY + infoHeight + 22;
  const handWidth = infoWidth;
  const handHeight = 78;

  drawUiPanel(handX, handY, handWidth, handHeight, {
    radius: 18,
    fillTop: "rgba(26, 21, 17, 0.98)",
    fillBottom: "rgba(14, 12, 10, 0.98)",
    stroke: "rgba(193, 157, 92, 0.18)",
    blur: 8,
    accent: "rgba(232, 191, 108, 0.08)",
  });
  ctx.fillStyle = "#e4b25f";
  ctx.font = "18px Georgia";
  ctx.fillText("В руке", handX + 16, handY + 28);
  ctx.fillStyle = "#f0e6cf";
  ctx.font = "22px Georgia";
  ctx.fillText(gameState.selectedItemId ? getItemLabel(gameState.selectedItemId) : "Пусто", handX + 16, handY + 56);

  const statusX = gridX - 16;
  const statusY = gridY + gridHeight + 28;
  const statusWidth = gridWidth + 32;
  const statusHeight = 120;

  drawUiPanel(statusX, statusY, statusWidth, statusHeight, {
    radius: 18,
    fillTop: "rgba(26, 21, 17, 0.98)",
    fillBottom: "rgba(14, 12, 10, 0.98)",
    stroke: "rgba(193, 157, 92, 0.18)",
    blur: 8,
    accent: "rgba(143, 183, 208, 0.06)",
  });

  drawUiPill("Активные задачи", statusX + 16, statusY + 14, {
    font: "17px Georgia",
    height: 28,
    fill: "rgba(17, 24, 31, 0.88)",
    stroke: "rgba(193, 157, 92, 0.18)",
    textColor: "#e7d4a7",
  });

  ctx.fillStyle = "#dce5df";
  ctx.font = "17px Georgia";

  if (statuses.length === 0) {
    wrapText("Сейчас нет активных узлов головоломок. Осматривай сцену и ищи новые зацепки.", statusX + 16, statusY + 64, statusWidth - 32, 24);
  } else {
    let rowY = statusY + 62;
    for (const status of statuses.slice(0, 2)) {
      const compactSteps = status.steps.map((step) => step.replace(/^\[[x ]\]\s*/, "")).join(" • ");
      wrapText(`${status.title}: ${compactSteps}`, statusX + 16, rowY, statusWidth - 32, 24);
      rowY += 30;
    }
  }
}

function drawReadableItemOverlay() {
  if (!gameState.openDocumentItemId) {
    return;
  }

  const itemId = gameState.openDocumentItemId;
  const panelWidth = Math.min(780, canvas.width - 48);
  const panelHeight = Math.min(540, canvas.height - 56);
  const panelX = (canvas.width - panelWidth) / 2;
  const panelY = (canvas.height - panelHeight) / 2;

  ctx.fillStyle = "rgba(4, 8, 12, 0.82)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawUiPanel(panelX, panelY, panelWidth, panelHeight, {
    radius: 26,
    fillTop: "rgba(232, 220, 186, 0.98)",
    fillBottom: "rgba(210, 194, 154, 0.98)",
    stroke: "rgba(110, 81, 37, 0.28)",
    blur: 26,
    accent: "rgba(255, 247, 224, 0.22)",
  });

  drawUiPill("Документ", panelX + 24, panelY + 18, {
    font: "17px Georgia",
    height: 28,
    fill: "rgba(101, 72, 37, 0.16)",
    stroke: "rgba(101, 72, 37, 0.2)",
    textColor: "#6d4d28",
  });

  drawUiPill("Esc / Enter / I — закрыть", panelX + panelWidth - 226, panelY + 18, {
    font: "15px Georgia",
    height: 28,
    fill: "rgba(101, 72, 37, 0.12)",
    stroke: "rgba(101, 72, 37, 0.18)",
    textColor: "#6d4d28",
  });

  ctx.fillStyle = "#2d2217";
  ctx.font = "36px Georgia";
  ctx.fillText(getReadableItemTitle(itemId), panelX + 28, panelY + 74);

  ctx.strokeStyle = "rgba(111, 79, 39, 0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(panelX + 28, panelY + 94);
  ctx.lineTo(panelX + panelWidth - 28, panelY + 94);
  ctx.stroke();

  ctx.fillStyle = "#4a3a28";
  ctx.font = "22px Georgia";
  wrapText(getReadableItemText(itemId), panelX + 28, panelY + 134, panelWidth - 56, 34);
}

function drawInventoryItemIcon(itemId, x, y, size) {
  const outline = "rgba(26, 20, 14, 0.72)";
  const accent =
    itemId === "battery" ? "#d0c86c" :
    itemId === "screwdriver" ? "#c66f52" :
    itemId === "fuse" ? "#c8d6df" :
    itemId === "note" ? "#e6d8aa" :
    itemId === "logbook" ? "#7a5d42" :
    itemId === "serviceKey" ? "#d8c17a" :
    itemId === "boatHook" ? "#ba8f63" :
    itemId === "valveWheel" ? "#8e6f4c" :
    "#9fb7b8";

  switch (itemId) {
    case "battery":
      drawBatterySprite(x, y, size, size, accent, outline);
      break;
    case "screwdriver":
      drawScrewdriverSprite(x, y, size, size, accent, outline);
      break;
    case "fuse":
      drawFuseSprite(x, y + size * 0.18, size, size * 0.46, accent, outline);
      break;
    case "note":
      drawPaperSprite(x + size * 0.14, y + size * 0.1, size * 0.72, size * 0.82, false, outline);
      break;
    case "logbook":
      drawPaperSprite(x + size * 0.14, y + size * 0.1, size * 0.72, size * 0.82, true, outline);
      break;
    case "serviceKey":
      drawKeySprite(x, y, size, size, accent, outline);
      break;
    case "boatHook":
      drawBoatHookSprite(x, y, size, size, accent, outline);
      break;
    case "valveWheel":
      drawWheelSprite(x, y, size, size, accent, outline);
      break;
    default:
      fillAndStrokeRect(x, y, size, size, accent, outline);
      break;
  }
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const lines = getWrappedLines(text, maxWidth);
  for (const line of lines) {
    if (line) {
      ctx.fillText(line, x, y);
    }
    y += lineHeight;
  }
}

function wrapTextOutlined(text, x, y, maxWidth, lineHeight) {
  const lines = getWrappedLines(text, maxWidth);
  for (const line of lines) {
    if (line) {
      ctx.strokeText(line, x, y);
      ctx.fillText(line, x, y);
    }
    y += lineHeight;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function frame(timestamp) {
  if (!gameState.lastTime) {
    gameState.lastTime = timestamp;
  }

  const dt = Math.min((timestamp - gameState.lastTime) / 1000, 0.033);
  gameState.lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(frame);
}

function initializeGame() {
  resizeCanvas();
  exposeDebugTools();
  camera.zoom = getStageZoom(gameState.stage);
  camera.targetZoom = camera.zoom;
  teleportPlayer(848, 526);
  setObjective(gameState.currentObjective);
  hintNode.textContent = movementHintText;
  updateInventory();
  updateStageLabel();
  closeChapterOverlay();
  runSelfCheck("init");
}

window.addEventListener("resize", () => {
  resizeCanvas();
  runSelfCheck("resize", true);
});

initializeGame();
requestAnimationFrame(frame);



