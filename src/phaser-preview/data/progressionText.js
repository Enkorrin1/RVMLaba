export function getLanternObjective(session) {
  if (!session.lanternProgress.mechanismChecked) {
    return "Цель: подняться к прожектору и понять, почему маяк не работает.";
  }

  return "Цель: спуститься вниз и найти, почему маяк обесточен.";
}

export function getGeneratorObjective(session) {
  const tasks = [];
  const generatorState = session.puzzleState.generator;
  const toolboxState = session.puzzleState.toolbox;

  if (!toolboxState.panelOpened) {
    tasks.push(session.inventory.includes("screwdriver") ? "открыть инструментальный ящик отвёрткой" : "найти отвёртку");
  }

  if (!generatorState.panelOpened) {
    tasks.push(session.inventory.includes("screwdriver") ? "снять крышку генератора" : "найти отвёртку для генератора");
  }

  if (!generatorState.fuseInstalled) {
    if (generatorState.fuseSeated) {
      tasks.push("зафиксировать предохранитель в направляющих");
    } else {
      tasks.push(session.inventory.includes("fuse") ? "вставить предохранитель" : "найти предохранитель");
    }
  }

  if (!generatorState.valveWheelInstalled) {
    if (generatorState.valveWheelMounted) {
      tasks.push("довернуть и зафиксировать штурвал клапана");
    } else {
      tasks.push(session.inventory.includes("valveWheel") ? "насадить штурвал клапана" : "найти штурвал клапана");
    }
  }

  if (tasks.length === 0) {
    return "Цель: запустить генератор и восстановить питание маяка.";
  }

  return `Цель: ${tasks.join(" и ")} для резервного генератора.`;
}

export function getSurfaceObjective(session) {
  if (!session.keeperDialogue?.introSeen) {
    return "Цель: подойти к смотрителю у башни и выслушать его.";
  }

  // Post-finale: the choice is binary — leave the light on (arriving inspector) or kill it
  if (session.beats?.keeperExposed && session.keeperDialogue?.finaleSeen) {
    return "Цель: оставить свет гореть — встретить инспектора, или спуститься в подземелье и выключить рубильник генератора. Время до зари.";
  }

  // Keeper's been exposed but player hasn't talked to him yet
  if (session.beats?.keeperExposed && !session.keeperDialogue?.finaleSeen) {
    return "Цель: вернуться к смотрителю с тем, что ты нашёл в тайнике.";
  }

  // Sabotage reported, need to re-investigate the cache
  if (session.beats?.sabotageReported && !session.beats?.keeperExposed) {
    return "Цель: спуститься в скрытую бухту и осмотреть тайник ещё раз — за крышкой сундука должен быть подпол.";
  }

  if (!session.endingUnlocked) {
    if (!session.shoreProgress.radioChecked) {
      return "Цель: осмотреть площадку у основания башни и найти следы неисправности.";
    }

    return getGeneratorObjective(session);
  }

  if (!session.puzzleState.serviceHatch.released) {
    return "Цель: вручную открыть служебный люк у основания башни.";
  }

  if (!session.puzzleState.serviceConsole.batteryInstalled) {
    return "Цель: спуститься в служебный люк и проверить нижний сервисный уровень.";
  }

  return "Цель: путь вниз открыт. Можно продолжать поиски под маяком.";
}

export function getServiceObjective(session) {
  if (!session.serviceProgress.logbookRead) {
    return "Цель: осмотреть журнал дежурств на нижнем уровне.";
  }

  if (!session.serviceProgress.valveSolved) {
    return "Цель: разобраться с клапанным узлом рядом — вентили стоят в нерабочем положении.";
  }

  if (!session.serviceProgress.consoleUsed) {
    return session.puzzleState.serviceConsole.batteryInstalled
      ? "Цель: проверить сервисный пульт и схему маяка."
      : session.inventory.includes("battery")
        ? "Цель: выбрать батарею и установить её в сервисный пульт."
        : "Цель: найти батарею для сервисного пульта.";
  }

  if (!session.puzzleState.serviceDoor.panelOpened) {
    return session.inventory.includes("screwdriver")
      ? "Цель: отвёрткой снять щиток с цепи на двери в восточный тоннель."
      : "Цель: найти отвёртку и добраться до цепи на двери в тоннель.";
  }

  if (!session.serviceProgress.doorChecked) {
    return "Цель: осмотреть запертую дверь в восточный тоннель.";
  }

  return "Цель: вернуться к двери и открыть проход в восточный тоннель.";
}

export function hasResolvedServiceScene(session) {
  return session.serviceProgress.logbookRead
    && session.serviceProgress.valveSolved
    && session.serviceProgress.consoleUsed
    && session.serviceProgress.doorChecked;
}

export function getTunnelObjective(session) {
  if (!session.tunnelProgress.lockerOpened) {
    return "Цель: осмотреть шкафчик персонала в тоннеле.";
  }

  if (!session.tunnelProgress.cipherSolved) {
    return "Цель: вскрыть кодовый замок — подсказка выбита прямо на стене рядом.";
  }

  if (!session.tunnelProgress.signalFound) {
    return "Цель: найти источник аварийного сигнала в восточном тоннеле.";
  }

  if (!session.puzzleState.tunnelExit.unlocked) {
    return session.inventory.includes("serviceKey")
      ? "Цель: открыть служебным ключом выход к нижней пристани."
      : "Цель: найти ключ, которым открывается выход к нижней пристани.";
  }

  return "Цель: проверить выход к нижней пристани.";
}

export function hasResolvedTunnelScene(session) {
  return session.tunnelProgress.lockerOpened
    && session.tunnelProgress.cipherSolved
    && session.tunnelProgress.signalFound;
}

export function getPierObjective(session) {
  if (!session.pierProgress.skiffChecked) {
    return "Цель: осмотреть служебный ялик у нижней пристани.";
  }

  if (!session.pierProgress.ropeFound) {
    return "Цель: проверить лебёдку у края пристани.";
  }

  if (!session.puzzleState.seaGate.released) {
    return session.inventory.includes("boatHook")
      ? "Цель: использовать багор, чтобы сорвать засов морского створа."
      : "Цель: найти инструмент в ялике, чтобы открыть морской створ.";
  }

  return "Цель: проверить морской створ у подножия скал.";
}

export function hasResolvedPierScene(session) {
  return session.pierProgress.skiffChecked && session.pierProgress.ropeFound;
}

export function getBayObjective(session) {
  // After the keeper has been told, come back here to find the hidden compartment
  if (session.beats?.sabotageReported && !session.beats?.keeperExposed) {
    return "Цель: вернуться к тайнику и осмотреть подпол под ящиком — смотритель кивал сюда не просто так.";
  }

  if (!session.bayProgress.campSeen) {
    return "Цель: осмотреть потухший костёр в скрытой бухте.";
  }

  if (!session.bayProgress.cacheOpened) {
    return "Цель: проверить тайник под тентом в скрытой бухте.";
  }

  if (!session.bayProgress.chartSolved) {
    return "Цель: изучить навигационную карту — отметить три точки, которые уже встречались в подземелье.";
  }

  return "Цель: осмотреть следы на камнях у выхода из бухты.";
}

export function hasResolvedBayScene(session) {
  return session.bayProgress.campSeen
    && session.bayProgress.cacheOpened
    && session.bayProgress.chartSolved;
}

export function getUndergroundObjective(session) {
  const region = session.undergroundRegion ?? "service";

  if (region === "service") {
    return getServiceObjective(session);
  }
  if (region === "tunnel") {
    return getTunnelObjective(session);
  }
  if (region === "pier") {
    return getPierObjective(session);
  }
  if (region === "bay") {
    return getBayObjective(session);
  }

  return getServiceObjective(session);
}

export function getUndergroundRegionLabel(region) {
  switch (region) {
    case "tunnel":
      return "Восточный тоннель";
    case "pier":
      return "Нижняя пристань";
    case "bay":
      return "Скрытая бухта";
    case "service":
    default:
      return "Служебный уровень";
  }
}
