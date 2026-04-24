import { createWakeSession } from "../data/wakeData.js";

export function createDefaultPreviewSession() {
  return {
    stage: "wake",
    ...createWakeSession(),
    progressStage: "wake",
    endingUnlocked: false,
    shoreProgress: {
      toolboxChecked: false,
      radioChecked: false,
    },
    serviceProgress: {
      logbookRead: false,
      consoleUsed: false,
      doorChecked: false,
      valveSolved: false,
    },
    tunnelProgress: {
      lockerOpened: false,
      signalFound: false,
      exitChecked: false,
      cipherSolved: false,
    },
    pierProgress: {
      skiffChecked: false,
      ropeFound: false,
      gateChecked: false,
    },
    bayProgress: {
      campSeen: false,
      cacheOpened: false,
      chartSolved: false,
    },
    undergroundRegion: "service",
    beats: {
      generatorRestored: false,
      lighthouseTried: false,
      sabotageFound: false,
      sabotageReported: false,
    },
    keeperDialogue: {
      met: false,
      introSeen: false,
      thanksSeen: false,
      undergroundSent: false,
    },
    puzzleState: {
      toolbox: {
        panelOpened: false,
      },
      generator: {
        panelOpened: false,
        fuseSeated: false,
        fuseInstalled: false,
        valveWheelMounted: false,
        valveWheelTurns: 0,
        valveWheelInstalled: false,
      },
      serviceHatch: {
        released: false,
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
  };
}

const previewSession = createDefaultPreviewSession();

export function getPreviewSession() {
  return previewSession;
}

export function resetPreviewSession() {
  const next = createDefaultPreviewSession();
  for (const key of Object.keys(previewSession)) {
    delete previewSession[key];
  }
  Object.assign(previewSession, next);
  return previewSession;
}
