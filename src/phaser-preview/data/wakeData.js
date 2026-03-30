export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 720;
export const GROUND_Y = 600;
export const PLAYER_SPEED = 320;
export const PLAYER_JUMP_SPEED = -760;
export const INTERACTION_RANGE = 92;
export const INVENTORY_SLOT_COUNT = 8;

export const NOTE_TEXT = "Запуск резервного генератора только после замены предохранителя и открытия топливного клапана.";

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
    description: "Журнал смотрителя с последней записью о шагах у цистерны и закрытом тоннеле.",
    readable: true,
    documentTitle: "Журнал дежурств",
    documentText: "Последняя запись: «Шаги снова у цистерны. Если не вернусь, дверь в восточный тоннель должна остаться закрытой».",
  },
  serviceKey: {
    label: "Служебный ключ",
    description: "Потемневший ключ с жетоном смотрителя. Он открывает старые проходы под маяком.",
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
  },
  {
    id: "clutter",
    x: 1110,
    y: 514,
    width: 196,
    height: 96,
    prompt: "Стол смотрителя",
  },
  {
    id: "footprints-room",
    x: 996,
    y: 578,
    width: 296,
    height: 20,
    prompt: "Следы",
  },
  {
    id: "leaf-pile",
    x: 1432,
    y: 556,
    width: 100,
    height: 34,
    prompt: "Листья у стены",
  },
  {
    id: "tower-ladder",
    x: 1570,
    y: 312,
    width: 56,
    height: 292,
    prompt: "Лестница наверх",
  },
  {
    id: "room-door",
    x: wakeRoomVisual.innerX + wakeRoomVisual.innerWidth - 37,
    y: 425,
    width: 42,
    height: 174,
    hitbox: {
      x: wakeRoomVisual.innerX + wakeRoomVisual.innerWidth - 88,
      y: 404,
      width: 92,
      height: 196,
    },
    prompt: "Выход наружу",
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
    drawerItems: ["battery", "note"],
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
    return "Цель: осмотреть комнату и понять, как ты оказался внутри маяка.";
  }

  if (!session.lanternProgress.mechanismChecked) {
    return "Цель: следы ведут и к выходу, и к лестнице наверх. Можно подняться к прожектору или выйти наружу.";
  }

  return "Цель: можно снова осмотреть комнату смотрителя, подняться к прожектору или выйти к башне.";
}

export function getWakeInteractionText(session, targetId) {
  switch (targetId) {
    case "bed":
      return "Одеяло сырое и солёное. Похоже, тебя уложили сюда уже после шторма, пока ты был без сознания.";
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
        : "Рука уже на двери, но уходить вслепую рано. Сначала стоит понять, кто оставил тебя в комнате смотрителя.";
    case "clutter":
      return session.drawerItems.length > 0
        ? "В ящике стола лежат батарея и записка. Их лучше забрать с собой."
        : "Ящик уже пуст. Внутри только соль, пыль и царапины от тяжёлых ключей.";
    default:
      return "";
  }
}
