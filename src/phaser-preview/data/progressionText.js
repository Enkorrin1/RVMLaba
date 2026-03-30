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
    tasks.push(session.inventory.includes("fuse") ? "установить предохранитель" : "найти предохранитель");
  }

  if (!generatorState.valveWheelInstalled) {
    tasks.push(session.inventory.includes("valveWheel") ? "установить штурвал клапана" : "найти штурвал клапана");
  }

  if (tasks.length === 0) {
    return "Цель: запустить генератор и восстановить питание маяка.";
  }

  return `Цель: ${tasks.join(" и ")} для резервного генератора.`;
}

export function getSurfaceObjective(session) {
  if (!session.endingUnlocked) {
    if (!session.shoreProgress.radioChecked) {
      return "Цель: осмотреть площадку у основания башни и найти следы неисправности.";
    }

    return getGeneratorObjective(session);
  }

  if (!session.puzzleState.serviceConsole.batteryInstalled) {
    return "Цель: вернуться к основанию башни и спуститься в служебный люк.";
  }

  return "Цель: путь вниз открыт. Можно продолжать поиски под маяком.";
}

export function getServiceObjective(session) {
  if (!session.serviceProgress.logbookRead) {
    return "Цель: осмотреть журнал дежурств на нижнем уровне.";
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
    && session.serviceProgress.consoleUsed
    && session.serviceProgress.doorChecked;
}

export function getTunnelObjective(session) {
  if (!session.tunnelProgress.lockerOpened) {
    return "Цель: осмотреть шкафчик смотрителя в тоннеле.";
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
  return session.tunnelProgress.lockerOpened && session.tunnelProgress.signalFound;
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
  if (!session.bayProgress.campSeen) {
    return "Цель: осмотреть потухший костёр в скрытой бухте.";
  }

  if (!session.bayProgress.cacheOpened) {
    return "Цель: проверить тайник под тентом в скрытой бухте.";
  }

  return "Цель: проверить следы на камнях у выхода из бухты.";
}

export function hasResolvedBayScene(session) {
  return session.bayProgress.campSeen && session.bayProgress.cacheOpened;
}
