export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 720;
export const GROUND_Y = 600;
export const PLAYER_SPEED = 320;
export const PLAYER_JUMP_SPEED = -760;
export const INTERACTION_RANGE = 92;
export const INVENTORY_SLOT_COUNT = 8;

export const NOTE_TEXT = "Запуск резервного генератора только после замены предохранителя и открытия топливного клапана.";

export const LETTER_TEXT = `«…Отец. Если это письмо дойдёт раньше меня, значит, мы снова проскочили пролив. Третий рейс на «Рассвете» подходит к концу — через четыре дня я сойду на берег и, наконец, заеду. Ветер к югу усиливается, но старпом говорит — дотянем. Обещаю, в этот раз без штормовых историй. Целую, Янис.»`;

export const ITEM_DEFINITIONS = {
  battery: {
    label: "Батарея",
    description: "Рабочая батарея для сервисного пульта на нижнем уровне маяка.",
  },
  fuse: {
    label: "Предохранитель",
    description: "Силовой предохранитель для запуска резервного генератора.",
  },
  note: {
    label: "Записка",
    description: "Короткая записка с инструкцией по запуску резервного генератора.",
    readable: true,
    documentTitle: "Записка",
    documentText: NOTE_TEXT,
  },
  letter: {
    label: "Письмо",
    description: "Недописанный черновик с брига «Рассвет». Адресован отцу, подписан именем Янис.",
    readable: true,
    documentTitle: "Письмо отцу",
    documentText: LETTER_TEXT,
  },
  screwdriver: {
    label: "Отвёртка",
    description: "Плоская отвёртка с морской солью на рукояти. Ей можно снимать крышки и сервисные панели.",
  },
  valveWheel: {
    label: "Штурвал",
    description: "Штурвал клапана, который открывает подачу топлива к генератору.",
  },
  logbook: {
    label: "Журнал",
    description: "Старый журнал маяка с последней записью о шагах у цистерны и закрытом тоннеле.",
    readable: true,
    documentTitle: "Журнал дежурств",
    documentText: "Последняя запись: «Шаги снова у цистерны. Если не вернусь, дверь в восточный тоннель должна остаться закрытой».",
  },
  serviceKey: {
    label: "Служебный ключ",
    description: "Потемневший ключ с жетоном маяка. Он открывает старые проходы под маяком.",
  },
  boatHook: {
    label: "Багор",
    description: "Короткий багор из ялика. Им удобно подцеплять мокрые засовы и старые створки.",
  },
};

export const wakeRoomVisual = {
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

export const interactables = [
  {
    id: "bed",
    x: 796,
    y: 542,
    width: 164,
    height: 46,
    prompt: "Кровать",
    markerAnchor: { x: 878, y: 520 },
    interactionPriority: 0,
  },
  {
    id: "clutter",
    x: 1110,
    y: 514,
    width: 196,
    height: 96,
    prompt: "Стол у стены",
    markerAnchor: { x: 1212, y: 486 },
    interactionPriority: 1,
  },
  {
    id: "footprints-room",
    x: 1738,
    y: 578,
    width: 180,
    height: 20,
    prompt: "Следы",
    markerAnchor: { x: 1828, y: 548 },
    interactionPriority: 2,
  },
  {
    id: "leaf-pile",
    x: 1432,
    y: 556,
    width: 100,
    height: 34,
    prompt: "Листья у стены",
    markerAnchor: { x: 1484, y: 536 },
    interactionPriority: 6,
  },
  {
    id: "tower-ladder",
    x: 1570,
    y: 312,
    width: 56,
    height: 292,
    prompt: "Лестница наверх",
    markerAnchor: { x: 1598, y: 430 },
    interactionPriority: 12,
  },
  {
    id: "room-door",
    // Door visual is centered at x=1954, panel width 42, height 174, y-center=512.
    // Bounding box: 1933..1975 × 425..599.
    x: 1933,
    y: 425,
    width: 42,
    height: 174,
    hitbox: {
      x: 1900,
      y: 404,
      width: 92,
      height: 196,
    },
    prompt: "Выход наружу",
    markerAnchor: { x: 1954, y: 412 },
    interactionPriority: 3,
  },
];

export function createWakeSession() {
  return {
    wakeProgress: {
      cluesChecked: false,
      leavesMoved: false,
    },
    lanternProgress: {
      mechanismChecked: false,
    },
    drawerItems: ["letter", "battery", "note"],
    inventory: [],
    selectedItemId: null,
    currentHint: "A/D или стрелки для движения, W/Space для прыжка, E для взаимодействия.",
  };
}

export function getWakeObjective(session) {
  if (!session.wakeProgress.leavesMoved) {
    return "Цель: осмотреть комнату и всё, что могло остаться на полу у стены и двери.";
  }

  if (!session.wakeProgress.cluesChecked) {
    return "Цель: осмотреть комнату и вспомнить, как шторм занёс тебя в маяк.";
  }

  if (!session.lanternProgress.mechanismChecked) {
    return "Цель: следы ведут и к выходу, и к лестнице наверх. Можно подняться к прожектору или выйти наружу.";
  }

  return "Цель: можно снова осмотреть жилую комнату, подняться к прожектору или выйти к башне.";
}

export function getWakeInteractionText(session, targetId) {
  switch (targetId) {
    case "bed":
      return "Одеяло сырое и солёное. Похоже, тебя втащили сюда прямо после шторма, когда ты был без сознания.";
    case "footprints-room":
      return "Грязные следы тянутся от кровати через комнату к лестнице и дальше к выходу. Значит, кто-то был здесь совсем недавно и ушёл в спешке.";
    case "leaf-pile":
      return session.wakeProgress.leavesMoved
        ? "Листья уже разворошены. Под ними только пыль, соль и след от недавно вытащенного инструмента."
        : "Под листьями что-то есть. Их нужно разгрести вручную.";
    case "tower-ladder":
      return "Лестница уводит к прожектору под самой линзой маяка. Наверху можно проверить, не там ли источник поломки.";
    case "room-door":
      return session.wakeProgress.cluesChecked
        ? "Следы изучены. Теперь можно выйти наружу и осмотреть площадку у основания башни."
        : "Рука уже на двери, но уходить вслепую рано. Сначала стоит понять, кто вытащил тебя из моря и оставил здесь.";
    case "clutter":
      return session.drawerItems.length > 0
        ? "В ящике стола лежат батарея и записка. Их лучше забрать с собой."
        : "Ящик уже пуст. Внутри только соль, пыль и царапины от тяжёлых ключей.";
    default:
      return "";
  }
}
