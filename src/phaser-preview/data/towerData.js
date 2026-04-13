export const LANTERN_WORLD_WIDTH = 2200;
export const SHORE_WORLD_WIDTH = 3600;
export const SHORE_PLAYABLE_LEFT = 500;
export const SHORE_PLAYABLE_RIGHT = 3100;
export const SHORE_PLAYABLE_WIDTH = SHORE_PLAYABLE_RIGHT - SHORE_PLAYABLE_LEFT;
export const SERVICE_WORLD_WIDTH = 2400;
export const TUNNEL_WORLD_WIDTH = 2400;
export const PIER_WORLD_WIDTH = 2400;
export const BAY_WORLD_WIDTH = 2200;
export const PREVIEW_WORLD_HEIGHT = 720;
export const PREVIEW_GROUND_Y = 600;

export const lanternInteractables = [
  {
    id: "lantern-ladder-down",
    x: 734,
    y: 316,
    width: 84,
    height: 284,
    prompt: "Лестница вниз",
    markerAnchor: { x: 776, y: 432 },
    interactionPriority: 4,
  },
  {
    id: "lamp-mechanism",
    x: 1290,
    y: 424,
    width: 190,
    height: 150,
    prompt: "Прожектор",
    markerAnchor: { x: 1386, y: 404 },
    interactionPriority: 3,
  },
];

export const shoreInteractables = [
  {
    id: "lighthouse-door",
    x: 880,
    y: 419,
    width: 120,
    height: 182,
    prompt: "Вход в маяк",
    markerAnchor: { x: 940, y: 406 },
    interactionPriority: 1,
  },
  {
    id: "toolbox",
    x: 1267,
    y: 536,
    width: 126,
    height: 48,
    prompt: "Инструментальный ящик",
    markerAnchor: { x: 1330, y: 516 },
    interactionPriority: 3,
  },
  {
    id: "radio",
    x: 1547,
    y: 510,
    width: 74,
    height: 48,
    prompt: "Рация",
    markerAnchor: { x: 1584, y: 492 },
    interactionPriority: 2,
  },
  {
    id: "valve-wheel",
    x: 2148,
    y: 532,
    width: 48,
    height: 48,
    prompt: "Штурвал клапана",
    markerAnchor: { x: 2172, y: 510 },
    interactionPriority: 4,
    visible(session) {
      return !session.inventory.includes("valveWheel")
        && !session.puzzleState.generator.valveWheelMounted
        && !session.puzzleState.generator.valveWheelInstalled;
    },
  },
  {
    id: "generator",
    x: 2628,
    y: 438,
    width: 308,
    height: 156,
    prompt: "Генератор",
    markerAnchor: { x: 2780, y: 446 },
    interactionPriority: 5,
  },
  {
    id: "hatch",
    x: 1122,
    y: 568,
    width: 112,
    height: 30,
    prompt: "Служебный люк",
    markerAnchor: { x: 1178, y: 546 },
    interactionPriority: 6,
    visible(session) {
      return session.endingUnlocked;
    },
  },
];

export const serviceInteractables = [
  {
    id: "logbook",
    x: 930,
    y: 531,
    width: 64,
    height: 42,
    prompt: "Журнал дежурств",
    markerAnchor: { x: 962, y: 512 },
    interactionPriority: 2,
    visible(session) {
      return !session.inventory.includes("logbook");
    },
  },
  {
    id: "service-hatch-return",
    x: 1064,
    y: 548,
    width: 96,
    height: 24,
    prompt: "Люк наверх",
    markerAnchor: { x: 1112, y: 528 },
    interactionPriority: 5,
  },
  {
    id: "service-console",
    x: 1346,
    y: 492,
    width: 124,
    height: 82,
    prompt: "Сервисный пульт",
    markerAnchor: { x: 1408, y: 470 },
    interactionPriority: 3,
  },
  {
    id: "sealed-door",
    x: 1656,
    y: 434,
    width: 64,
    height: 170,
    prompt: "Запертая дверь",
    markerAnchor: { x: 1688, y: 420 },
    interactionPriority: 4,
  },
];

export const tunnelInteractables = [
  {
    id: "service-return-door",
    x: 705,
    y: 438,
    width: 58,
    height: 164,
    prompt: "Дверь на служебный уровень",
    markerAnchor: { x: 734, y: 422 },
  },
  {
    id: "locker",
    x: 980,
    y: 529,
    width: 64,
    height: 46,
    prompt: "Шкафчик персонала",
    markerAnchor: { x: 1012, y: 510 },
  },
  {
    id: "signal",
    x: 1412,
    y: 472,
    width: 96,
    height: 90,
    prompt: "Аварийный передатчик",
    markerAnchor: { x: 1460, y: 448 },
  },
  {
    id: "tunnel-exit",
    x: 1692,
    y: 434,
    width: 68,
    height: 170,
    prompt: "Выход к нижней пристани",
    markerAnchor: { x: 1726, y: 422 },
  },
];

export const pierInteractables = [
  {
    id: "pier-return-door",
    x: 686,
    y: 438,
    width: 48,
    height: 164,
    prompt: "Проход в тоннель",
    markerAnchor: { x: 710, y: 422 },
  },
  {
    id: "skiff",
    x: 935,
    y: 546,
    width: 130,
    height: 36,
    prompt: "Служебный ялик",
    markerAnchor: { x: 1000, y: 524 },
  },
  {
    id: "rope-winch",
    x: 1336,
    y: 437,
    width: 48,
    height: 130,
    prompt: "Лебёдка",
    markerAnchor: { x: 1360, y: 424 },
  },
  {
    id: "sea-gate",
    x: 1693,
    y: 438,
    width: 62,
    height: 164,
    prompt: "Морской створ",
    markerAnchor: { x: 1724, y: 422 },
  },
];

export const bayInteractables = [
  {
    id: "bay-return-gate",
    x: 694,
    y: 438,
    width: 56,
    height: 164,
    prompt: "Тропа к пристани",
    markerAnchor: { x: 722, y: 422 },
  },
  {
    id: "campfire",
    x: 1030,
    y: 550,
    width: 36,
    height: 36,
    prompt: "Потухший костёр",
    markerAnchor: { x: 1048, y: 530 },
  },
  {
    id: "cache",
    x: 1210,
    y: 458,
    width: 156,
    height: 110,
    prompt: "Тент и ящик",
    markerAnchor: { x: 1288, y: 434 },
  },
  {
    id: "footprints",
    x: 1568,
    y: 558,
    width: 70,
    height: 22,
    prompt: "Следы на камнях",
    markerAnchor: { x: 1603, y: 530 },
  },
];
