export const LANTERN_WORLD_WIDTH = 2200;
export const SHORE_WORLD_WIDTH = 3600;
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
  },
  {
    id: "lamp-mechanism",
    x: 1290,
    y: 424,
    width: 190,
    height: 150,
    prompt: "Прожектор",
  },
];

export const shoreInteractables = [
  {
    id: "lighthouse-door",
    x: 920,
    y: 447,
    width: 120,
    height: 182,
    prompt: "Вход в маяк",
  },
  {
    id: "toolbox",
    x: 1267,
    y: 536,
    width: 126,
    height: 48,
    prompt: "Инструментальный ящик",
  },
  {
    id: "radio",
    x: 1547,
    y: 510,
    width: 74,
    height: 48,
    prompt: "Рация",
  },
  {
    id: "valve-wheel",
    x: 2148,
    y: 532,
    width: 48,
    height: 48,
    prompt: "Штурвал клапана",
    visible(session) {
      return !session.inventory.includes("valveWheel") && !session.puzzleState.generator.valveWheelInstalled;
    },
  },
  {
    id: "generator",
    x: 2663,
    y: 468,
    width: 234,
    height: 116,
    prompt: "Генератор",
  },
  {
    id: "hatch",
    x: 1068,
    y: 514,
    width: 52,
    height: 52,
    prompt: "Служебный люк",
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
  },
  {
    id: "service-console",
    x: 1346,
    y: 492,
    width: 124,
    height: 82,
    prompt: "Сервисный пульт",
  },
  {
    id: "sealed-door",
    x: 1656,
    y: 434,
    width: 64,
    height: 170,
    prompt: "Запертая дверь",
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
  },
  {
    id: "locker",
    x: 980,
    y: 529,
    width: 64,
    height: 46,
    prompt: "Шкафчик смотрителя",
  },
  {
    id: "signal",
    x: 1412,
    y: 472,
    width: 96,
    height: 90,
    prompt: "Аварийный передатчик",
  },
  {
    id: "tunnel-exit",
    x: 1692,
    y: 434,
    width: 68,
    height: 170,
    prompt: "Выход к нижней пристани",
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
  },
  {
    id: "skiff",
    x: 935,
    y: 546,
    width: 130,
    height: 36,
    prompt: "Служебный ялик",
  },
  {
    id: "rope-winch",
    x: 1336,
    y: 437,
    width: 48,
    height: 130,
    prompt: "Лебедка",
  },
  {
    id: "sea-gate",
    x: 1693,
    y: 438,
    width: 62,
    height: 164,
    prompt: "Морской створ",
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
  },
  {
    id: "campfire",
    x: 1030,
    y: 550,
    width: 36,
    height: 36,
    prompt: "Потухший костер",
  },
  {
    id: "cache",
    x: 1210,
    y: 458,
    width: 156,
    height: 110,
    prompt: "Тент и ящик",
  },
  {
    id: "footprints",
    x: 1568,
    y: 558,
    width: 70,
    height: 22,
    prompt: "Следы на камнях",
  },
];
