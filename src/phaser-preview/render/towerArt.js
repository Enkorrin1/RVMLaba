import {
  LANTERN_WORLD_WIDTH,
  PREVIEW_GROUND_Y,
  PREVIEW_WORLD_HEIGHT,
  SHORE_PLAYABLE_LEFT,
  SHORE_PLAYABLE_WIDTH,
  SHORE_WORLD_WIDTH,
} from "../data/towerData.js";

const LANTERN_ROOM_CENTER_X = 1110;
const LANTERN_ROOM_WIDTH = 944;
const LANTERN_ROOM_LEFT = LANTERN_ROOM_CENTER_X - LANTERN_ROOM_WIDTH * 0.5;
const LANTERN_ROOM_RIGHT = LANTERN_ROOM_CENTER_X + LANTERN_ROOM_WIDTH * 0.5;
const LANTERN_ROOM_TOP = 171;
const LANTERN_ROOM_BOTTOM = 601;

export function buildLanternEnvironment(scene) {
  scene.lanternDust = [];
  scene.lanternWindowBands = [];
  scene.lanternRain = [];
  scene.lanternHighlightBands = [];
  scene.lanternWindowMask = null;

  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, LANTERN_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x040b12);
  scene.add.ellipse(1120, 120, 980, 280, 0x89b4c5, 0.06);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 132, LANTERN_WORLD_WIDTH, 292, 0x0b2030, 0.98);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 210, LANTERN_WORLD_WIDTH, 184, 0x143548, 0.55);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 284, LANTERN_WORLD_WIDTH, 140, 0x255b72, 0.12);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 648, LANTERN_WORLD_WIDTH, 148, 0x071a26, 1);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 622, LANTERN_WORLD_WIDTH, 34, 0x154b62, 0.26);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 606, LANTERN_WORLD_WIDTH, 12, 0xa8d4de, 0.08);

  const distantSea = [
    [160, 626, 260, 5],
    [540, 632, 320, 4],
    [980, 640, 250, 5],
    [1440, 628, 300, 4],
    [1840, 636, 260, 5],
  ];
  distantSea.forEach(([x, y, width, height], index) => {
    const band = scene.add.rectangle(x, y, width, height, 0xa7d4dc, 0.1);
    band.speed = 9 + index * 1.8;
    band.baseWidth = width;
    scene.lanternWindowBands.push(band);
  });

  const room = scene.add.container(LANTERN_ROOM_CENTER_X, 386).setDepth(2);
  room.add([
    scene.add.ellipse(0, 234, 980, 66, 0x000000, 0.28),
    scene.add.rectangle(0, 0, LANTERN_ROOM_WIDTH, 430, 0x24313b, 1).setStrokeStyle(6, 0x12191e, 0.72),
    scene.add.rectangle(0, 0, 860, 360, 0x6d7a81, 0.18).setStrokeStyle(2, 0xd4e3e9, 0.08),
    scene.add.rectangle(0, 190, LANTERN_ROOM_WIDTH, 56, 0x20272d, 1),
    scene.add.rectangle(0, 212, LANTERN_ROOM_WIDTH, 18, 0x11181d, 0.92),
    scene.add.ellipse(0, 154, 760, 180, 0x9ebccb, 0.03),
  ]);

  for (let index = 0; index < 6; index += 1) {
    room.add(scene.add.rectangle(-356 + index * 142, -2, 14, 376, 0x34434d, 0.54));
  }

  for (let index = 0; index < 5; index += 1) {
    room.add(scene.add.rectangle(0, -154 + index * 78, 826, 6, 0x7b8f99, 0.09));
  }

  createLanternWindows(scene);
  createLanternCatwalk(scene);
  createLanternProjector(scene);
  createLanternMaintenanceProps(scene);

  for (let index = 0; index < 14; index += 1) {
    const mote = scene.add.circle(
      720 + Math.random() * 800,
      172 + Math.random() * 290,
      1 + Math.random() * 2.2,
      0xf1dfb1,
      0.05 + Math.random() * 0.08
    ).setDepth(6);
    mote.speedX = -0.05 + Math.random() * 0.12;
    mote.speedY = 0.04 + Math.random() * 0.09;
    mote.phase = index * 0.52;
    scene.lanternDust.push(mote);
  }

  for (let index = 0; index < 4; index += 1) {
    const highlight = scene.add.ellipse(870 + index * 170, 252 + (index % 2) * 28, 220, 56, 0xf7e7b2, 0.03).setDepth(4);
    highlight.phase = index * 0.9;
    scene.lanternHighlightBands.push(highlight);
  }
}

export function createLanternGround(scene) {
  scene.physics.world.setBounds(LANTERN_ROOM_LEFT, 0, LANTERN_ROOM_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(LANTERN_ROOM_CENTER_X, PREVIEW_GROUND_Y + 60, LANTERN_ROOM_WIDTH, 120, 0x394649, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);

  const leftWall = scene.add.rectangle(LANTERN_ROOM_LEFT - 14, 390, 28, 420, 0x394649, 0);
  const rightWall = scene.add.rectangle(LANTERN_ROOM_RIGHT + 14, 390, 28, 420, 0x394649, 0);
  scene.physics.add.existing(leftWall, true);
  scene.physics.add.existing(rightWall, true);
  scene.platforms.add(leftWall);
  scene.platforms.add(rightWall);
}

export function updateLanternAmbient(scene, time) {
  for (const band of scene.lanternWindowBands) {
    band.x += band.speed * 0.016;
    band.alpha = 0.06 + Math.sin(time * 0.0012 + band.speed) * 0.04;
    band.width = band.baseWidth + Math.sin(time * 0.0015 + band.speed) * 18;
    if (band.x > LANTERN_WORLD_WIDTH + 180) {
      band.x = -180;
    }
  }

  for (const mote of scene.lanternDust) {
    mote.x += mote.speedX;
    mote.y += mote.speedY + Math.sin(time * 0.001 + mote.phase) * 0.08;

    if (mote.y > 560) {
      mote.y = 180;
    }
    if (mote.x < 700) {
      mote.x = 1510;
    }
    if (mote.x > 1510) {
      mote.x = 700;
    }
    mote.alpha = 0.05 + Math.sin(time * 0.0014 + mote.phase) * 0.03 + 0.04;
  }

  for (const rain of scene.lanternRain) {
    rain.y += rain.speed;
    if (rain.y > 438) {
      rain.y = rain.resetY;
    }
  }

  scene.lanternHighlightBands.forEach((highlight, index) => {
    highlight.alpha = 0.02 + Math.sin(time * 0.0014 + highlight.phase) * 0.02 + 0.02;
    highlight.width = 214 + Math.sin(time * 0.0018 + index) * 18;
  });

  if (scene.projectorGlow) {
    scene.projectorGlow.alpha = 0.05 + Math.sin(time * 0.0016) * 0.02;
  }

  if (scene.projectorGlass) {
    scene.projectorGlass.scaleX = 1 + Math.sin(time * 0.0015) * 0.03;
    scene.projectorGlass.scaleY = 1 + Math.sin(time * 0.0015) * 0.03;
  }

  if (scene.projectorIndicator) {
    scene.projectorIndicator.alpha = 0.34 + Math.sin(time * 0.0022) * 0.12;
  }
}

export function buildShoreEnvironment(scene) {
  scene.shoreWaveBands = [];
  scene.shoreClouds = [];
  scene.shoreParallax = [];
  scene.shoreRain = [];
  scene.shoreSpray = [];
  scene.shoreGlowBands = [];
  scene.shoreFoamBursts = [];

  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, SHORE_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x05121c);
  scene.add.ellipse(940, 118, 920, 280, 0x8ab1c7, 0.06);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 132, SHORE_WORLD_WIDTH, 308, 0x0e2334, 0.98);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 230, SHORE_WORLD_WIDTH, 214, 0x16394d, 0.54);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 302, SHORE_WORLD_WIDTH, 180, 0x24576f, 0.12);

  scene.shoreParallax.push(scene.add.polygon(760, 420, [0, 164, 194, 34, 432, 160, 760, 58, 1040, 192, 1040, 316, 0, 316], 0x0d202f, 0.96));
  scene.shoreParallax.push(scene.add.polygon(1700, 438, [0, 188, 224, 22, 470, 178, 920, 48, 1220, 214, 1220, 334, 0, 334], 0x13293a, 0.92));
  scene.shoreParallax.push(scene.add.polygon(2860, 454, [0, 208, 248, 38, 566, 206, 1018, 64, 1360, 226, 1360, 342, 0, 342], 0x0f2131, 0.96));
  scene.shoreParallax[0].parallax = 0.12;
  scene.shoreParallax[1].parallax = 0.22;
  scene.shoreParallax[2].parallax = 0.32;

  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 646, SHORE_WORLD_WIDTH, 150, 0x081d2b, 1);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 620, SHORE_WORLD_WIDTH, 48, 0x154f67, 0.34);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 608, SHORE_WORLD_WIDTH, 12, 0xc8edf0, 0.12);

  for (let index = 0; index < 12; index += 1) {
    const band = scene.add.rectangle(120 + index * 320, 636 + (index % 3) * 10, 240, 5, 0xb0dce3, 0.12);
    band.speed = 12 + index * 1.4;
    band.baseWidth = band.width;
    scene.shoreWaveBands.push(band);
  }

  for (let index = 0; index < 7; index += 1) {
    const cloud = scene.add.ellipse(280 + index * 480, 104 + (index % 2) * 34, 220 + (index % 3) * 28, 56, 0xd7e7eb, 0.08);
    cloud.speed = 2 + index * 0.45;
    scene.shoreClouds.push(cloud);
  }

  for (let index = 0; index < 22; index += 1) {
    const streak = scene.add.rectangle(
      760 + Math.random() * 2240,
      132 + Math.random() * 360,
      2,
      42 + Math.random() * 16,
      0xd7edf3,
      0.16
    ).setAngle(18).setDepth(4);
    streak.speed = 5.5 + Math.random() * 2.8;
    streak.resetY = 110 + Math.random() * 60;
    scene.shoreRain.push(streak);
  }

  for (let index = 0; index < 6; index += 1) {
    const spray = scene.add.ellipse(940 + index * 390, 628 + (index % 2) * 8, 178, 18, 0xd7edf3, 0.08).setDepth(4);
    spray.phase = index * 0.8;
    scene.shoreSpray.push(spray);
  }

  for (let index = 0; index < 3; index += 1) {
    const glowBand = scene.add.ellipse(1020 + index * 520, 596, 280, 30, 0xa7d4dc, 0.03).setDepth(4);
    glowBand.phase = index * 1.2;
    scene.shoreGlowBands.push(glowBand);
  }

  for (let index = 0; index < 4; index += 1) {
    const foam = scene.add.ellipse(1180 + index * 420, 620, 132, 14, 0xd8eef2, 0.06).setDepth(4);
    foam.phase = index * 0.9;
    scene.shoreFoamBursts.push(foam);
  }

  createTower(scene);
  createShoreProps(scene);
  createKeeperNpc(scene);
  createShoreForeground(scene);
}

export function createShoreGround(scene) {
  scene.physics.world.setBounds(SHORE_PLAYABLE_LEFT, 0, SHORE_PLAYABLE_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1800, PREVIEW_GROUND_Y + 60, 2600, 120, 0x3a4b50, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);

  const leftWall = scene.add.rectangle(SHORE_PLAYABLE_LEFT - 14, 390, 28, 420, 0x3a4b50, 0);
  const rightWall = scene.add.rectangle(SHORE_PLAYABLE_LEFT + SHORE_PLAYABLE_WIDTH + 14, 390, 28, 420, 0x3a4b50, 0);
  scene.physics.add.existing(leftWall, true);
  scene.physics.add.existing(rightWall, true);
  scene.platforms.add(leftWall);
  scene.platforms.add(rightWall);
}

export function updateShoreAmbient(scene, time) {
  for (const band of scene.shoreWaveBands) {
    band.x += band.speed * 0.016;
    band.alpha = 0.08 + Math.sin(time * 0.0012 + band.speed) * 0.05;
    band.width = band.baseWidth + Math.sin(time * 0.0017 + band.speed) * 22;
    if (band.x > SHORE_WORLD_WIDTH + 180) {
      band.x = -180;
    }
  }

  for (const cloud of scene.shoreClouds) {
    cloud.x += cloud.speed * 0.01;
    if (cloud.x > SHORE_WORLD_WIDTH + 180) {
      cloud.x = -180;
    }
  }

  for (const streak of scene.shoreRain) {
    streak.y += streak.speed;
    if (streak.y > 520) {
      streak.y = streak.resetY;
    }
  }

  scene.shoreSpray.forEach((spray, index) => {
    spray.alpha = 0.05 + Math.sin(time * 0.0022 + spray.phase) * 0.04 + 0.04;
    spray.width = 160 + Math.sin(time * 0.0016 + index) * 26;
  });

  scene.shoreGlowBands.forEach((glow, index) => {
    glow.alpha = 0.02 + Math.sin(time * 0.0018 + glow.phase) * 0.02 + 0.02;
    glow.width = 240 + Math.sin(time * 0.0012 + index) * 18;
  });

  scene.shoreFoamBursts.forEach((foam, index) => {
    foam.alpha = 0.03 + Math.sin(time * 0.002 + foam.phase) * 0.03 + 0.03;
    foam.width = 118 + Math.sin(time * 0.0014 + index) * 16;
  });

  if (scene.cameras?.main) {
    const scrollX = scene.cameras.main.scrollX;
    scene.shoreParallax.forEach((shape, index) => {
      const baseX = index === 0 ? 760 : index === 1 ? 1700 : 2860;
      shape.x = baseX + scrollX * shape.parallax;
    });
  }

  if (scene.radioGlow) {
    scene.radioGlow.alpha = 0.06 + Math.sin(time * 0.002) * 0.05;
  }

  if (scene.generatorAmbientGlow) {
    scene.generatorAmbientGlow.alpha = 0.04 + Math.sin(time * 0.0018) * 0.03;
  }

  if (scene.towerLanternGlow) {
    scene.towerLanternGlow.alpha = 0.04 + Math.sin(time * 0.0015) * 0.02;
  }

  if (scene.hatchAura?.visible) {
    scene.hatchAura.alpha = 0.12 + Math.sin(time * 0.0024) * 0.08;
  }
}

function createLanternWindows(scene) {
  const windows = [
    [826, 252, 132, 206],
    [1110, 238, 164, 232],
    [1394, 252, 132, 206],
  ];

  const maskGraphics = scene.make.graphics({ x: 0, y: 0, add: false });

  windows.forEach(([x, y, width, height], index) => {
    scene.add.rectangle(x, y, width + 18, height + 18, 0x314047, 1).setStrokeStyle(3, 0x11171b, 0.62).setDepth(4);
    scene.add.rectangle(x, y, width, height, 0x9cc5d0, 0.16).setStrokeStyle(2, 0xdcecf1, 0.12).setDepth(3);
    scene.add.rectangle(x, y, 6, height, 0x364750, 0.8).setDepth(5);
    scene.add.rectangle(x, y, width, 6, 0x364750, 0.8).setDepth(5);
    scene.add.ellipse(x, y, width + 160, height + 120, 0xcfe3eb, 0.04).setDepth(2);
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(x - width * 0.5 + 2, y - height * 0.5 + 2, width - 4, height - 4);

    for (let streak = 0; streak < 4; streak += 1) {
      scene.add.rectangle(
        x - width * 0.36 + streak * (width / 3),
        y - 34 + (streak % 2) * 18,
        2,
        46,
        0xe2f0f4,
        0.16
      ).setAngle(18).setDepth(4);
    }

    const highlight = scene.add.ellipse(x, y + 18, width + 90, 34, 0xf4e5b6, 0.03).setDepth(4);
    highlight.phase = index * 0.7;
    scene.lanternHighlightBands.push(highlight);

    for (let streak = 0; streak < 5; streak += 1) {
      const rain = scene.add.rectangle(
        x - width * 0.34 + streak * (width / 4),
        y - height * 0.5 + 20 + (streak % 2) * 12,
        2,
        44 + Math.random() * 10,
        0xd7edf3,
        0.16
      ).setAngle(18).setDepth(4);
      rain.windowY = y;
      rain.windowHeight = height;
      rain.speed = 3.8 + Math.random() * 1.4;
      rain.resetY = y - height * 0.5 - 24 - Math.random() * 18;
      scene.lanternRain.push(rain);
    }
  });

  scene.lanternWindowMask = maskGraphics.createGeometryMask();
  scene.lanternRain.forEach((rain) => rain.setMask(scene.lanternWindowMask));
}

function createLanternCatwalk(scene) {
  const catwalk = scene.add.container(1110, 558).setDepth(8);
  catwalk.add([
    scene.add.rectangle(0, 0, 744, 20, 0x29333a, 1).setStrokeStyle(3, 0x10161b, 0.62),
    scene.add.rectangle(0, 10, 744, 8, 0x151b20, 0.88),
  ]);

  for (let index = 0; index < 11; index += 1) {
    catwalk.add(scene.add.rectangle(-330 + index * 66, 0, 28, 14, index % 2 === 0 ? 0x44555f : 0x34424a, 0.48));
  }

  for (let index = 0; index < 8; index += 1) {
    catwalk.add(scene.add.rectangle(-322 + index * 92, -48, 8, 96, 0x556772, 1));
  }

  catwalk.add(scene.add.rectangle(0, -92, 744, 6, 0x6c808b, 0.92));
}

function createLanternProjector(scene) {
  const projectorBase = scene.add.container(1352, 474).setDepth(9);
  const indicator = scene.add.circle(88, 48, 6, 0xe0c17c, 0.54);
  const glass = scene.add.circle(0, -10, 38, 0xf4d290, 0.1);
  projectorBase.add([
    scene.add.ellipse(0, 108, 350, 44, 0x000000, 0.24),
    scene.add.rectangle(0, 68, 252, 82, 0x30424d, 1).setStrokeStyle(3, 0x90a6b2, 0.2),
    scene.add.rectangle(0, 16, 164, 104, 0x405866, 1).setStrokeStyle(3, 0xcfe0e8, 0.14),
    scene.add.circle(0, -10, 76, 0x688395, 0.28).setStrokeStyle(8, 0xe2d09a, 0.22),
    glass,
    scene.add.circle(0, -10, 54, 0x2f434f, 0).setStrokeStyle(4, 0xb6cad3, 0.18),
    scene.add.rectangle(-102, 62, 28, 24, 0x1a232b, 1),
    scene.add.rectangle(102, 62, 28, 24, 0x1a232b, 1),
    scene.add.rectangle(92, 16, 54, 64, 0x202932, 1).setStrokeStyle(2, 0xaebfc6, 0.14),
    indicator,
  ]);

  scene.projectorGlass = glass;
  scene.projectorIndicator = indicator;
  scene.projectorGlow = scene.add.ellipse(1352, 430, 290, 220, 0xe9c36e, 0.05).setDepth(5);
  scene.projectorForeground = scene.add.container(1352, 474).setDepth(11);
  scene.projectorForeground.add([
    scene.add.circle(0, -10, 82, 0x000000, 0).setStrokeStyle(6, 0x81929b, 0.22),
    scene.add.rectangle(0, 68, 264, 10, 0x13191f, 0.52),
  ]);
}

function createLanternMaintenanceProps(scene) {
  const ladder = scene.add.container(774, 458).setDepth(8);
  ladder.add([
    scene.add.rectangle(-24, 0, 8, 292, 0x7a6c57, 1),
    scene.add.rectangle(24, 0, 8, 292, 0x7a6c57, 1),
  ]);
  for (let index = 0; index < 11; index += 1) {
    ladder.add(scene.add.rectangle(0, -126 + index * 24, 42, 6, 0xd2b279, 1));
  }

  const cabinet = scene.add.container(900, 520).setDepth(8);
  cabinet.add([
    scene.add.ellipse(0, 34, 170, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 124, 104, 0x41515a, 1).setStrokeStyle(3, 0xe1bb73, 0.16),
    scene.add.rectangle(-18, -8, 46, 60, 0x1b242b, 1),
    scene.add.circle(32, 6, 5, 0xd7c087, 1),
  ]);

  const coil = scene.add.container(1540, 548).setDepth(8);
  coil.add([
    scene.add.ellipse(0, 16, 126, 18, 0x000000, 0.16),
    scene.add.circle(0, 0, 28, 0x7a6447, 0).setStrokeStyle(5, 0xc6a06e, 1),
    scene.add.circle(0, 0, 8, 0xc6a06e, 1),
  ]);
}

function createTower(scene) {
  const tower = scene.add.container(940, 270).setDepth(4);
  tower.add([
    scene.add.ellipse(0, 358, 240, 22, 0x000000, 0.08),
    scene.add.rectangle(0, 70, 264, 548, 0xc8b08b, 1).setStrokeStyle(4, 0x665543, 0.24),
    scene.add.rectangle(-64, 70, 44, 548, 0x8c755b, 0.22),
    scene.add.rectangle(58, 70, 54, 548, 0xf0dfb9, 0.08),
    scene.add.rectangle(0, -156, 320, 76, 0x364149, 1).setStrokeStyle(4, 0x192129, 0.42),
    scene.add.rectangle(0, -138, 250, 18, 0x627985, 0.9),
    scene.add.rectangle(-70, -138, 62, 26, 0x86b8c9, 0.26),
    scene.add.rectangle(70, -138, 62, 26, 0x86b8c9, 0.26),
    scene.add.rectangle(0, 256, 132, 196, 0x463731, 1).setStrokeStyle(3, 0x1f1814, 0.36),
    scene.add.circle(40, 258, 6, 0xe3c27d, 1),
    scene.add.rectangle(0, 296, 120, 10, 0x2e2520, 0.26),
  ]);

  for (let index = 0; index < 7; index += 1) {
    tower.add(scene.add.rectangle(0, -90 + index * 72, 224, 6, 0x8f7c64, 0.14));
  }

  scene.towerLanternGlow = scene.add.ellipse(940, 112, 268, 120, 0xa8d2de, 0.05).setDepth(3);
}

function createShoreProps(scene) {
  const hatchHousing = scene.add.container(1178, 590).setDepth(8);
  const hatchPlate = scene.add.ellipse(0, 0, 112, 30, 0x344047, 1).setStrokeStyle(4, 0xb99964, 0.24);
  const hatchRing = scene.add.ellipse(0, 0, 72, 18, 0x12191e, 1).setStrokeStyle(3, 0x66757d, 0.2);
  const hatchHandle = scene.add.rectangle(0, -2, 8, 14, 0x7a867f, 0.92).setStrokeStyle(2, 0xd2b47b, 0.12);
  hatchHousing.add([
    scene.add.ellipse(0, 10, 126, 18, 0x000000, 0.08),
    scene.add.ellipse(0, 2, 126, 34, 0x4d4034, 1).setStrokeStyle(3, 0x211913, 0.24),
    hatchPlate,
    hatchRing,
    hatchHandle,
    scene.add.rectangle(0, 6, 30, 4, 0x3d474d, 0.58),
  ]);
  scene.hatchPlateVisual = hatchPlate;
  scene.hatchHandleVisual = hatchHandle;
  scene.hatchAura = scene.add.ellipse(1178, 590, 132, 24, 0x8fe0a0, 0).setDepth(6).setVisible(false);

  const toolbox = scene.add.container(1334, 560).setDepth(10);
  toolbox.add([
    scene.add.ellipse(0, 24, 154, 18, 0x000000, 0.12),
    scene.add.rectangle(0, 0, 140, 54, 0x566169, 1).setStrokeStyle(3, 0xc8b07a, 0.18),
    scene.add.rectangle(0, -10, 104, 20, 0x7e8a92, 1),
    scene.add.rectangle(0, 8, 52, 8, 0x263239, 1),
    scene.add.rectangle(-34, 12, 18, 14, 0x69757b, 0.82),
    scene.add.rectangle(34, 12, 18, 14, 0x69757b, 0.82),
  ]);

  const radio = scene.add.container(1586, 534).setDepth(10);
  radio.add([
    scene.add.ellipse(0, 24, 108, 14, 0x000000, 0.12),
    scene.add.rectangle(0, 0, 82, 52, 0x334149, 1).setStrokeStyle(3, 0xe1bb73, 0.18),
    scene.add.rectangle(-10, 2, 34, 16, 0x162128, 1),
    scene.add.circle(24, -4, 4, 0xc7dce3, 1),
    scene.add.line(0, 0, 18, -20, 34, -76, 0xe1bb73, 1).setStrokeStyle(3, 0xe1bb73, 1),
    scene.add.rectangle(-20, -18, 18, 4, 0x72858f, 0.9),
  ]);
  scene.radioGlow = scene.add.circle(1608, 530, 18, 0xc2eef0, 0.08).setDepth(8);

  const wheel = scene.add.container(2172, 556).setDepth(10);
  wheel.add([
    scene.add.ellipse(0, 22, 92, 14, 0x000000, 0.1),
    scene.add.circle(0, 0, 24, 0x8b6b48, 0).setStrokeStyle(5, 0xc39d68, 1),
    scene.add.circle(0, 0, 6, 0xc39d68, 1),
    scene.add.rectangle(0, 0, 6, 34, 0xc39d68, 1),
    scene.add.rectangle(0, 0, 34, 6, 0xc39d68, 1),
  ]);
  scene.valveWheelVisual = wheel;

  const generator = scene.add.container(2780, 520).setDepth(10);
  const statusLight = scene.add.circle(96, -22, 7, 0xe3c47b, 1);
  generator.add([
    scene.add.ellipse(0, 80, 332, 34, 0x000000, 0.18),
    scene.add.rectangle(0, 22, 306, 18, 0x1f252a, 1),
    scene.add.rectangle(-124, 64, 18, 72, 0x1b1512, 1),
    scene.add.rectangle(124, 64, 18, 72, 0x1b1512, 1),
    scene.add.rectangle(-150, 52, 30, 92, 0x251d19, 1),
    scene.add.rectangle(150, 52, 30, 92, 0x251d19, 1),
    scene.add.rectangle(0, -2, 288, 118, 0x44535c, 1).setStrokeStyle(4, 0x171d21, 0.5),
    scene.add.rectangle(-72, -6, 112, 96, 0x586a73, 1).setStrokeStyle(3, 0xacbcc4, 0.16),
    scene.add.rectangle(66, -10, 118, 86, 0x2f3d45, 1).setStrokeStyle(3, 0x90a4ad, 0.16),
    scene.add.rectangle(0, -62, 196, 14, 0x72848d, 1),
    scene.add.rectangle(-10, -78, 108, 22, 0x6c7d85, 1).setStrokeStyle(2, 0xc9d7dc, 0.12),
    scene.add.rectangle(-76, -78, 22, 48, 0x657780, 1).setStrokeStyle(2, 0xc9d7dc, 0.12),
    scene.add.rectangle(-58, -100, 52, 20, 0x2c3940, 1),
    scene.add.rectangle(-92, -18, 58, 40, 0x171f25, 1),
    scene.add.rectangle(-18, 0, 36, 62, 0x233038, 1).setStrokeStyle(2, 0x72858f, 0.18),
    scene.add.rectangle(88, -10, 28, 54, 0x202a30, 1).setStrokeStyle(2, 0x72858f, 0.16),
    scene.add.circle(44, -6, 30, 0x73858d, 0).setStrokeStyle(6, 0xd4b06f, 0.58),
    scene.add.circle(44, -6, 11, 0xd4b06f, 0.92),
    scene.add.rectangle(124, -20, 20, 60, 0x202930, 1).setStrokeStyle(2, 0x70828a, 0.14),
    scene.add.rectangle(124, 22, 70, 12, 0x11181d, 1),
    scene.add.rectangle(-72, 34, 74, 10, 0x1a2328, 1),
    scene.add.rectangle(-72, 50, 74, 10, 0x1a2328, 1),
    scene.add.line(-126, 0, -126, -28, -158, -54, 0xc7a567, 1).setStrokeStyle(4, 0xc7a567, 1),
    scene.add.line(-140, -8, -86, -8, -32, -26, 0x7e8f97, 1).setStrokeStyle(3, 0x7e8f97, 1),
    statusLight,
  ]);
  scene.generatorVisual = generator;
  scene.generatorStatusLight = statusLight;
  scene.generatorAmbientGlow = scene.add.ellipse(2780, 590, 320, 28, 0xe1bb73, 0.02).setDepth(8);
}

function createKeeperNpc(scene) {
  const anchorX = 1062;
  const anchorY = 540;
  const shadow = scene.add.ellipse(anchorX, 590, 52, 12, 0x000000, 0.32).setDepth(9);
  const figure = scene.add.container(anchorX, anchorY).setDepth(10);
  const outline = scene.add.rectangle(0, 4, 46, 86, 0xe7f0f4, 0.05);
  const coat = scene.add.rectangle(0, 6, 40, 54, 0x2b1e16, 1).setStrokeStyle(2, 0x0f0a07, 0.38);
  const coatShadow = scene.add.rectangle(-9, 6, 14, 54, 0x120c08, 0.42);
  const belt = scene.add.rectangle(0, 16, 38, 4, 0x141009, 0.82);
  const buckle = scene.add.rectangle(0, 16, 8, 6, 0xb58a4b, 1);
  const lapelLeft = scene.add.rectangle(-11, -6, 6, 22, 0x0f0806, 0.72);
  const lapelRight = scene.add.rectangle(11, -6, 6, 22, 0x0f0806, 0.72);
  const scarf = scene.add.rectangle(0, -10, 28, 8, 0x8a4a2c, 1).setStrokeStyle(1, 0x3a1d10, 0.62);
  const scarfEnd = scene.add.rectangle(10, 0, 6, 16, 0x6b3820, 1);
  const head = scene.add.rectangle(0, -28, 24, 26, 0xc69a70, 1);
  const headShadow = scene.add.rectangle(-7, -28, 7, 26, 0x8a6a4a, 0.48);
  const beard = scene.add.rectangle(0, -16, 22, 12, 0xd4d8d2, 1).setStrokeStyle(1, 0x8e9088, 0.46);
  const mustache = scene.add.rectangle(0, -22, 18, 3, 0xb8bcb4, 1);
  const eyeLeft = scene.add.rectangle(-5, -30, 2, 2, 0x1a1410, 1);
  const eyeRight = scene.add.rectangle(5, -30, 2, 2, 0x1a1410, 1);
  const hatBrim = scene.add.rectangle(0, -40, 40, 4, 0x1a120c, 1);
  const hatCrown = scene.add.rectangle(0, -48, 28, 12, 0x1a120c, 1).setStrokeStyle(2, 0x090604, 0.68);
  const hatBand = scene.add.rectangle(0, -44, 28, 3, 0x6b3820, 0.88);
  const legLeft = scene.add.rectangle(-8, 42, 10, 24, 0x3d2718, 1);
  const legRight = scene.add.rectangle(8, 42, 10, 24, 0x3d2718, 1);
  const bootLeft = scene.add.rectangle(-8, 54, 12, 6, 0x140a06, 1);
  const bootRight = scene.add.rectangle(8, 54, 12, 6, 0x140a06, 1);
  const lanternChain = scene.add.rectangle(-18, 2, 1.5, 12, 0x8a7254, 1);
  const lanternBody = scene.add.rectangle(-18, 14, 12, 16, 0x3a2a1c, 1).setStrokeStyle(1, 0x8a7254, 0.62);
  const lanternGlass = scene.add.rectangle(-18, 14, 8, 10, 0xe4b25f, 0.86);
  const lanternGlow = scene.add.ellipse(-18, 14, 36, 26, 0xe4b25f, 0.18);
  figure.add([
    outline,
    coat,
    coatShadow,
    belt,
    buckle,
    lapelLeft,
    lapelRight,
    scarf,
    scarfEnd,
    head,
    headShadow,
    beard,
    mustache,
    eyeLeft,
    eyeRight,
    hatBand,
    hatCrown,
    hatBrim,
    legLeft,
    legRight,
    bootLeft,
    bootRight,
    lanternChain,
    lanternBody,
    lanternGlass,
    lanternGlow,
  ]);

  scene.tweens.add({
    targets: figure,
    y: anchorY - 2,
    duration: 2400,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  });
  scene.tweens.add({
    targets: lanternGlow,
    alpha: 0.32,
    scaleX: 1.15,
    scaleY: 1.15,
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  });

  scene.keeperVisual = figure;
  scene.keeperLanternGlow = lanternGlow;
  scene.keeperShadow = shadow;
}

function createShoreForeground(scene) {
  const rocks = [
    [1360, 602, 160, 34, 0x1f2428],
    [1450, 606, 230, 50, 0x23292d],
    [1880, 610, 200, 44, 0x20272b],
    [2420, 606, 248, 46, 0x1f262a],
    [2860, 610, 238, 48, 0x20272c],
  ];

  rocks.forEach(([x, y, width, height, color]) => {
    scene.add.ellipse(x, y, width, height, color, 0.96).setDepth(8);
  });

  scene.add.rectangle(1208, 594, 184, 5, 0x253037, 0.26).setDepth(8);
  scene.add.rectangle(2750, 592, 268, 6, 0x253037, 0.28).setDepth(8);
  scene.add.rectangle(1178, 590, 122, 5, 0x253037, 0.2).setDepth(6);
}
