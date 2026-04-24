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
  // Floor hatch where the ladder comes up — align with the ladder-down interactable center at x=776.
  const hatchOpening = scene.add.container(776, 600).setDepth(7);
  hatchOpening.add([
    scene.add.rectangle(0, 0, 96, 14, 0x05090d, 1),
    scene.add.rectangle(0, -8, 108, 6, 0x2a2218, 1).setStrokeStyle(1, 0x110c08, 0.85),
    scene.add.rectangle(-52, -2, 6, 10, 0x3d3328, 1),
    scene.add.rectangle(52, -2, 6, 10, 0x3d3328, 1),
  ]);

  const ladder = scene.add.container(776, 458).setDepth(8);
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
  // Tower body
  tower.add([
    scene.add.ellipse(0, 358, 240, 22, 0x000000, 0.08),
    scene.add.rectangle(0, 70, 264, 548, 0xc8b08b, 1).setStrokeStyle(4, 0x665543, 0.24),
    scene.add.rectangle(-64, 70, 44, 548, 0x8c755b, 0.22),
    scene.add.rectangle(58, 70, 54, 548, 0xf0dfb9, 0.08),
    // Lantern room cap
    scene.add.rectangle(0, -156, 320, 76, 0x364149, 1).setStrokeStyle(4, 0x192129, 0.42),
    scene.add.rectangle(0, -138, 250, 18, 0x627985, 0.9),
    scene.add.rectangle(-70, -138, 62, 26, 0x86b8c9, 0.26),
    scene.add.rectangle(70, -138, 62, 26, 0x86b8c9, 0.26),
  ]);

  // Horizontal mortar bands (decorative)
  for (let index = 0; index < 7; index += 1) {
    tower.add(scene.add.rectangle(0, -90 + index * 72, 224, 6, 0x8f7c64, 0.14));
  }

  // === Entry doorway: *cut into* the tower base ===
  // Visual extents in world coords:
  // - Door visual center at world y = 270 + 240 = 510 (aligns with interactable center at y=510).
  // - Bounding box 880..1000 × 419..601 → matches lighthouse-door hitbox.
  const DOOR_LOCAL_Y = 240; // 270 + 240 = 510 world
  // Dark arched recess (the opening cut into the wall)
  tower.add(scene.add.rectangle(0, DOOR_LOCAL_Y, 108, 192, 0x0c0704, 1));
  // Stone jambs flanking the opening
  tower.add(scene.add.rectangle(-54, DOOR_LOCAL_Y, 10, 190, 0x9d8869, 1).setStrokeStyle(1, 0x4a3824, 0.8));
  tower.add(scene.add.rectangle(54, DOOR_LOCAL_Y, 10, 190, 0x9d8869, 1).setStrokeStyle(1, 0x4a3824, 0.8));
  // Stone lintel (with keystone suggestion)
  tower.add(scene.add.rectangle(0, DOOR_LOCAL_Y - 88, 140, 18, 0x9d8869, 1).setStrokeStyle(1, 0x4a3824, 0.85));
  tower.add(scene.add.rectangle(0, DOOR_LOCAL_Y - 88, 24, 22, 0xb09a7c, 1).setStrokeStyle(1, 0x4a3824, 0.8));
  // Door leaf itself (slightly inside the opening)
  tower.add(scene.add.rectangle(0, DOOR_LOCAL_Y + 10, 92, 168, 0x3a2c22, 1).setStrokeStyle(2, 0x16110d, 0.9));
  // Plank seams
  [-24, 0, 24].forEach((ox) => {
    tower.add(scene.add.rectangle(ox, DOOR_LOCAL_Y + 10, 1.5, 160, 0x1a120b, 0.65));
  });
  // Iron hinges
  tower.add(scene.add.rectangle(-40, DOOR_LOCAL_Y - 46, 18, 10, 0x211712, 1).setStrokeStyle(1, 0x080603, 0.8));
  tower.add(scene.add.rectangle(-40, DOOR_LOCAL_Y + 66, 18, 10, 0x211712, 1).setStrokeStyle(1, 0x080603, 0.8));
  // Door handle + keyhole
  tower.add(scene.add.rectangle(30, DOOR_LOCAL_Y + 12, 10, 24, 0x5a421f, 1));
  tower.add(scene.add.circle(30, DOOR_LOCAL_Y + 12, 3.5, 0xe3c27d, 1));
  // Threshold stone on the ground
  tower.add(scene.add.rectangle(0, DOOR_LOCAL_Y + 96, 116, 8, 0x5a4a36, 1).setStrokeStyle(1, 0x2a1f16, 0.8));
  // Step shadow
  tower.add(scene.add.ellipse(0, DOOR_LOCAL_Y + 102, 128, 10, 0x000000, 0.3));

  scene.towerLanternGlow = scene.add.ellipse(940, 112, 268, 120, 0xa8d2de, 0.05).setDepth(3);
}

function createShoreProps(scene) {
  // Concrete well around the service hatch — a proper recessed mount,
  // not a floating ellipse on top of the ground.
  const hatchHousing = scene.add.container(1178, 590).setDepth(8);
  const hatchShadow = scene.add.ellipse(0, 14, 140, 18, 0x000000, 0.32);
  const hatchWell = scene.add.ellipse(0, 6, 146, 40, 0x1f2932, 1).setStrokeStyle(3, 0x5a6a74, 0.7);
  // Concrete rim with bolts
  const hatchRimOuter = scene.add.ellipse(0, 2, 128, 34, 0x4d4034, 1).setStrokeStyle(3, 0x211913, 0.4);
  const hatchRimInner = scene.add.ellipse(0, 2, 108, 26, 0x2a241c, 1);
  const boltGfx = scene.add.graphics();
  boltGfx.fillStyle(0xa0906a, 0.85);
  for (let i = 0; i < 8; i += 1) {
    const ang = (i / 8) * Math.PI * 2;
    boltGfx.fillCircle(Math.cos(ang) * 56, 2 + Math.sin(ang) * 14, 2);
  }
  // The hatch plate itself (the moving lid)
  const hatchPlate = scene.add.ellipse(0, 0, 96, 26, 0x344047, 1).setStrokeStyle(4, 0xb99964, 0.4);
  const hatchPlateRim = scene.add.ellipse(0, 0, 96, 26, 0x0f161c, 0).setStrokeStyle(1, 0x1a2028, 1);
  const hatchRing = scene.add.ellipse(0, 0, 60, 16, 0x12191e, 1).setStrokeStyle(3, 0x66757d, 0.3);
  const hatchRingHi = scene.add.ellipse(0, -3, 40, 4, 0x8aacba, 0.25);
  const hatchHandle = scene.add.rectangle(0, -2, 8, 14, 0x7a867f, 0.92).setStrokeStyle(2, 0xd2b47b, 0.3);
  hatchHousing.add([
    hatchShadow, hatchWell, hatchRimOuter, hatchRimInner, boltGfx,
    hatchPlate, hatchPlateRim, hatchRing, hatchRingHi, hatchHandle,
    scene.add.rectangle(0, 6, 30, 4, 0x3d474d, 0.58),
  ]);
  scene.hatchPlateVisual = hatchPlate;
  scene.hatchHandleVisual = hatchHandle;
  scene.hatchAura = scene.add.ellipse(1178, 590, 132, 24, 0x8fe0a0, 0).setDepth(6).setVisible(false);

  // === Toolbox (military steel box on a stone) ===
  const toolbox = scene.add.container(1334, 560).setDepth(10);
  // Stone pedestal under the toolbox — sells weight + grounding
  const tbStoneShadow = scene.add.ellipse(2, 28, 168, 14, 0x000000, 0.42);
  const tbStone = scene.add.ellipse(0, 24, 156, 14, 0x3a444a, 0.85).setStrokeStyle(1, 0x1a2028, 0.6);
  // Box body
  const tbBodyShadow = scene.add.rectangle(2, 3, 138, 50, 0x000000, 0.35);
  const tbBody = scene.add.rectangle(0, 0, 134, 46, 0x566169, 1).setStrokeStyle(3, 0x23292d, 1);
  // Lid — slightly thicker at top suggesting it's hinged
  const tbLid = scene.add.rectangle(0, -14, 138, 16, 0x3f474d, 1).setStrokeStyle(2, 0x1a2028, 1);
  const tbLidStrip = scene.add.rectangle(0, -14, 138, 3, 0xc8b07a, 0.55);
  // Corner rivets
  const tbRivets = scene.add.graphics();
  tbRivets.fillStyle(0xc8d0d6, 0.75);
  [[-60, -10], [60, -10], [-60, 18], [60, 18]].forEach(([rx, ry]) => tbRivets.fillCircle(rx, ry, 2.2));
  // Latches (two small trapezoids on the front)
  const tbLatchL = scene.add.rectangle(-36, -2, 12, 10, 0xc8b07a, 1).setStrokeStyle(1, 0x4a3820, 0.8);
  const tbLatchR = scene.add.rectangle(36, -2, 12, 10, 0xc8b07a, 1).setStrokeStyle(1, 0x4a3820, 0.8);
  // Carry handle on top
  const tbHandleBase = scene.add.rectangle(0, -24, 44, 4, 0x2a2e33, 1);
  const tbHandleArc = scene.add.arc(0, -28, 22, 180, 360, false, 0x3a444a, 0).setStrokeStyle(3, 0x7e8a92, 0.9);
  // Label plate
  const tbPlate = scene.add.rectangle(0, 4, 52, 10, 0x1a2028, 0.95).setStrokeStyle(1, 0xc8b07a, 0.35);
  const tbPlateText = scene.add.text(0, 4, "ИНСТР.", {
    fontFamily: "monospace", fontSize: "6.5px", color: "#c8b07a", letterSpacing: 1.5,
  }).setOrigin(0.5);
  // Rust streak
  const tbRust = scene.add.rectangle(-52, 8, 4, 18, 0x6a4020, 0.55);
  toolbox.add([
    tbStoneShadow, tbStone,
    tbBodyShadow, tbBody, tbLid, tbLidStrip, tbRivets,
    tbHandleBase, tbHandleArc,
    tbLatchL, tbLatchR, tbPlate, tbPlateText, tbRust,
  ]);

  // === Radio (portable field transceiver with antenna on a post) ===
  const radio = scene.add.container(1586, 534).setDepth(10);
  // Wooden crate underneath (not a floating box)
  const rCrateShadow = scene.add.ellipse(2, 30, 118, 12, 0x000000, 0.4);
  const rCrate = scene.add.rectangle(0, 22, 108, 18, 0x4a3826, 1).setStrokeStyle(2, 0x221610, 1);
  const rCrateGrain = scene.add.graphics();
  rCrateGrain.lineStyle(1, 0x221610, 0.6);
  [[-48, 16], [-16, 28], [18, 16], [46, 28]].forEach(([x1, y1]) => {
    rCrateGrain.beginPath(); rCrateGrain.moveTo(x1, y1); rCrateGrain.lineTo(x1 - 4, y1 - 10); rCrateGrain.strokePath();
  });
  // Radio body
  const rBodyShadow = scene.add.rectangle(2, 1, 92, 58, 0x000000, 0.35);
  const rBody = scene.add.rectangle(0, -2, 88, 56, 0x2a3540, 1).setStrokeStyle(2, 0xe1bb73, 0.55);
  // Front face — darker inset
  const rFace = scene.add.rectangle(0, -2, 80, 44, 0x141a20, 1);
  // Speaker grille (left)
  const rGrille = scene.add.rectangle(-22, 2, 30, 22, 0x0c1218, 1).setStrokeStyle(1, 0x5a7080, 0.5);
  const rGrilleDots = scene.add.graphics();
  rGrilleDots.fillStyle(0x3a4654, 0.85);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      rGrilleDots.fillCircle(-32 + c * 5, -4 + r * 6, 1.2);
    }
  }
  // Tuning knob (right)
  const rKnob = scene.add.circle(18, -2, 10, 0x3a4654, 1).setStrokeStyle(2, 0xe1bb73, 0.75);
  const rKnobMark = scene.add.rectangle(18, -8, 2, 6, 0xe1bb73, 1);
  // Status LED
  const rLed = scene.add.circle(30, -18, 2, 0xc7dce3, 1);
  // Brand label
  const rPlate = scene.add.rectangle(0, -22, 44, 8, 0x1a1a14, 0.95);
  const rPlateTxt = scene.add.text(0, -22, "Р-842", {
    fontFamily: "monospace", fontSize: "5.5px", color: "#e3c47b", letterSpacing: 1,
  }).setOrigin(0.5);
  // Antenna — mounted on a metal post behind the crate, not free-floating
  const rAntPost = scene.add.rectangle(24, -8, 3, 22, 0x5a7080, 1);
  const rAntenna = scene.add.line(0, 0, 24, -18, 40, -74, 0xe1bb73, 1).setStrokeStyle(2.5, 0xe1bb73, 1);
  const rAntTip = scene.add.circle(40, -74, 1.8, 0xe1bb73, 1);
  // Side carry handle (hint of portability)
  const rHandle = scene.add.rectangle(-44, -14, 14, 3, 0x8aacba, 0.7);
  radio.add([
    rCrateShadow, rCrate, rCrateGrain,
    rBodyShadow, rBody, rFace, rGrille, rGrilleDots,
    rKnob, rKnobMark, rLed, rPlate, rPlateTxt,
    rAntPost, rAntenna, rAntTip, rHandle,
  ]);
  scene.radioGlow = scene.add.circle(1606, 530, 14, 0xc2eef0, 0.12).setDepth(8);

  // === Valve wheel on a rusted pipe stub ===
  const wheel = scene.add.container(2172, 556).setDepth(10);
  // Pipe stub coming out of the ground (sells that there's something to "remove it from")
  const vwGroundShadow = scene.add.ellipse(2, 28, 96, 14, 0x000000, 0.35);
  const vwPipeStub = scene.add.rectangle(0, 22, 22, 28, 0x3a3028, 1).setStrokeStyle(2, 0x1a1008, 1);
  const vwPipeFlange = scene.add.rectangle(0, 10, 36, 8, 0x5a4a3a, 1).setStrokeStyle(1, 0x1a1008, 0.9);
  const vwPipeBolts = scene.add.graphics();
  vwPipeBolts.fillStyle(0xa0906a, 0.8);
  [-14, -4, 4, 14].forEach((ox) => vwPipeBolts.fillCircle(ox, 10, 1.3));
  // Valve body (spindle sticking up)
  const vwSpindle = scene.add.rectangle(0, 0, 4, 24, 0x4a3a24, 1);
  // Wheel itself — bigger, with 4 spokes
  const vwRim = scene.add.circle(0, -6, 26, 0x8b6b48, 0).setStrokeStyle(5, 0xc39d68, 1);
  const vwRimHi = scene.add.circle(-4, -10, 22, 0xe4c088, 0).setStrokeStyle(2, 0xe4c088, 0.55);
  const vwHub = scene.add.circle(0, -6, 7, 0xc39d68, 1).setStrokeStyle(1, 0x5a3a20, 0.8);
  const vwHubDot = scene.add.circle(0, -6, 2.5, 0x2a1a08, 1);
  const vwSpokeA = scene.add.rectangle(0, -6, 5, 46, 0xc39d68, 1);
  const vwSpokeB = scene.add.rectangle(0, -6, 46, 5, 0xc39d68, 1);
  wheel.add([
    vwGroundShadow, vwPipeStub, vwPipeFlange, vwPipeBolts,
    vwSpindle, vwRim, vwRimHi, vwSpokeA, vwSpokeB, vwHub, vwHubDot,
  ]);
  scene.valveWheelVisual = wheel;

  const generator = scene.add.container(2780, 520).setDepth(10);
  const statusLight = scene.add.circle(96, -22, 7, 0xe3c47b, 1);
  // Concrete pad under the generator — proper grounding
  const genPadShadow = scene.add.ellipse(0, 102, 380, 18, 0x000000, 0.38);
  const genPad = scene.add.rectangle(0, 86, 346, 14, 0x3a3a32, 1).setStrokeStyle(2, 0x1a1a14, 0.7);
  const genPadLip = scene.add.rectangle(0, 79, 346, 4, 0x5a5a50, 0.55);
  // Bolts anchoring generator to pad
  const genAnchors = scene.add.graphics();
  genAnchors.fillStyle(0x7a8a94, 0.85);
  [-140, -64, 64, 140].forEach((bx) => {
    genAnchors.fillCircle(bx, 84, 2.5);
  });
  generator.add([genPadShadow, genPad, genPadLip, genAnchors]);
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

function createWreckPlank(scene) {
  const plank = scene.add.container(2400, 586).setDepth(9);
  // Tide pool / wet sand halo under the debris
  const wetSand = scene.add.ellipse(0, 14, 160, 18, 0x1e3440, 0.6);
  const wetSheen = scene.add.ellipse(-10, 10, 80, 5, 0x8aacba, 0.25);
  // Broken-end irregular board — drawn as a Graphics polygon (not a clean rectangle).
  const plankGfx = scene.add.graphics();
  const plankPoints = [
    [-66, -10], [-40, -12], [-12, -10], [22, -12], [50, -8],
    [58, -2], [52, 2], [60, 6], [56, 10], [40, 12], [14, 10],
    [-16, 12], [-44, 10], [-60, 6], [-66, -2],
  ];
  // Shadow
  plankGfx.fillStyle(0x000000, 0.5);
  plankGfx.beginPath();
  plankGfx.moveTo(plankPoints[0][0] + 3, plankPoints[0][1] + 5);
  for (let i = 1; i < plankPoints.length; i += 1) {
    plankGfx.lineTo(plankPoints[i][0] + 3, plankPoints[i][1] + 5);
  }
  plankGfx.closePath(); plankGfx.fillPath();
  // Main body
  plankGfx.fillStyle(0x5a3a22, 1);
  plankGfx.lineStyle(2, 0x2a1a0a, 1);
  plankGfx.beginPath();
  plankGfx.moveTo(plankPoints[0][0], plankPoints[0][1]);
  for (let i = 1; i < plankPoints.length; i += 1) {
    plankGfx.lineTo(plankPoints[i][0], plankPoints[i][1]);
  }
  plankGfx.closePath(); plankGfx.fillPath(); plankGfx.strokePath();
  // Wood grain (horizontal lines along the board, broken into segments so they feel organic)
  plankGfx.lineStyle(1, 0x2a1a0a, 0.55);
  [-5, 0, 5].forEach((oy, idx) => {
    plankGfx.beginPath();
    plankGfx.moveTo(-60, oy);
    plankGfx.lineTo(-20, oy + (idx === 0 ? -1 : idx === 2 ? 1.5 : 0.5));
    plankGfx.lineTo(20, oy + (idx === 0 ? 1 : idx === 2 ? -0.5 : 1));
    plankGfx.lineTo(52, oy);
    plankGfx.strokePath();
  });
  // Lighter weather-bleached top stripe
  plankGfx.fillStyle(0x7a5a3a, 0.35);
  plankGfx.fillRect(-58, -9, 114, 3);
  plankGfx.setRotation((-5 * Math.PI) / 180);
  // Splintered broken ends (jagged triangles on each side)
  const splinterGfx = scene.add.graphics();
  splinterGfx.fillStyle(0x4a2f1a, 1);
  [[-66, -10, -78, -4, -66, 2], [-66, 2, -80, 8, -60, 6]].forEach((pts) => {
    splinterGfx.fillTriangle(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
  });
  [[58, -2, 70, -10, 62, 4], [60, 6, 74, 10, 56, 12]].forEach((pts) => {
    splinterGfx.fillTriangle(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
  });
  splinterGfx.setRotation((-5 * Math.PI) / 180);
  // Painted plate on top — mounted slightly inset so it reads as "painted on the wood"
  const paintBg = scene.add.rectangle(0, -1, 78, 14, 0xd4c29a, 0.38).setAngle(-5)
    .setStrokeStyle(1, 0x8a6a3a, 0.35);
  const paintChip = scene.add.rectangle(26, -3, 10, 4, 0x5a3a22, 0.6).setAngle(-8);
  const paintText = scene.add.text(0, -1, "…РАССВ…", {
    fontFamily: "Georgia, serif", fontSize: "12px", color: "#3a2a10",
    fontStyle: "bold", letterSpacing: 2,
  }).setOrigin(0.5).setAngle(-5);
  // Rusted nails
  const nailA = scene.add.circle(-40, -3, 1.8, 0x2a1a0a, 1).setStrokeStyle(1, 0x6a4020, 0.6);
  const nailB = scene.add.circle(34, -4, 1.8, 0x2a1a0a, 1).setStrokeStyle(1, 0x6a4020, 0.6);
  // Rust stains from nails
  const rustGfx = scene.add.graphics();
  rustGfx.fillStyle(0x6a3020, 0.55);
  rustGfx.fillCircle(-40, 3, 3); rustGfx.fillCircle(34, 4, 3);
  // Seaweed draped across
  const weedA = scene.add.ellipse(-32, 8, 22, 5, 0x2a4a2a, 0.82).setAngle(14);
  const weedB = scene.add.ellipse(-18, 12, 16, 4, 0x2a4a2a, 0.76).setAngle(-8);
  const weedC = scene.add.ellipse(22, 10, 18, 4, 0x2a4a2a, 0.72).setAngle(8);
  plank.add([wetSand, wetSheen, plankGfx, splinterGfx, paintBg, paintChip, paintText, nailA, nailB, rustGfx, weedA, weedB, weedC]);
  // Subtle idle bob (tide touch)
  scene.tweens.add({
    targets: plank, y: 588, duration: 2800, yoyo: true, repeat: -1, ease: "sine.inOut",
  });
  // Gentle sheen shimmer
  scene.tweens.add({
    targets: wetSheen, alpha: 0.4, duration: 1600, yoyo: true, repeat: -1, ease: "sine.inOut",
  });
}

function createShoreForeground(scene) {
  createWreckPlank(scene);

  // Layered rock clusters — each rock now has a light top + crack lines + wet base
  const rocks = [
    [1360, 602, 160, 34, 0x1f2428],
    [1450, 606, 230, 50, 0x23292d],
    [1880, 610, 200, 44, 0x20272b],
    [2420, 606, 248, 46, 0x1f262a],
    [2860, 610, 238, 48, 0x20272c],
  ];
  rocks.forEach(([x, y, width, height, color]) => {
    // Wet shadow under the rock
    scene.add.ellipse(x, y + 4, width + 12, 10, 0x000000, 0.35).setDepth(7);
    // Main rock body
    scene.add.ellipse(x, y, width, height, color, 0.96).setDepth(8);
    // Damp underside stripe
    scene.add.ellipse(x, y + height * 0.18, width * 0.88, height * 0.35, 0x101418, 0.7).setDepth(8);
    // Top highlight
    scene.add.ellipse(x - width * 0.1, y - height * 0.25, width * 0.55, height * 0.28, 0x3a4a50, 0.5).setDepth(8);
    // Crack lines
    const crackGfx = scene.add.graphics().setDepth(8);
    crackGfx.lineStyle(1, 0x0a0e12, 0.55);
    crackGfx.beginPath();
    crackGfx.moveTo(x - width * 0.2, y - height * 0.05);
    crackGfx.lineTo(x - width * 0.05, y + height * 0.15);
    crackGfx.lineTo(x + width * 0.12, y - height * 0.05);
    crackGfx.strokePath();
    // Moss specks
    const mossGfx = scene.add.graphics().setDepth(8);
    mossGfx.fillStyle(0x2a4a2a, 0.65);
    for (let i = 0; i < 6; i += 1) {
      mossGfx.fillCircle(
        x + (Math.random() - 0.5) * width * 0.7,
        y + (Math.random() - 0.5) * height * 0.5,
        0.8 + Math.random() * 1.2
      );
    }
  });

  // Wet sand sheen bands between props (replaces the old lonely strips)
  scene.add.rectangle(1208, 594, 184, 5, 0x253037, 0.26).setDepth(8);
  scene.add.rectangle(2750, 592, 268, 6, 0x253037, 0.28).setDepth(8);
  scene.add.rectangle(1178, 590, 122, 5, 0x253037, 0.2).setDepth(6);

  // === Set dressing between props — fills empty stretches of shore ===

  // Tide pool near the hatch
  scene.add.ellipse(1500, 592, 92, 10, 0x2a4a5a, 0.45).setDepth(7);
  scene.add.ellipse(1496, 590, 48, 3, 0x8aacba, 0.35).setDepth(7);

  // Seaweed clusters
  [[1676, 596, 0.9], [2030, 596, 1.1], [2250, 596, 0.8], [2540, 596, 1.0], [2960, 596, 0.9]].forEach(([sx, sy, scale]) => {
    const g = scene.add.graphics().setDepth(8);
    g.fillStyle(0x1d3a2a, 0.82);
    g.fillEllipse(sx, sy, 28 * scale, 6 * scale);
    g.fillStyle(0x2a4a2e, 0.75);
    g.fillEllipse(sx - 6 * scale, sy - 2, 18 * scale, 4 * scale);
    g.fillStyle(0x335a3a, 0.55);
    g.fillEllipse(sx + 4 * scale, sy + 1, 14 * scale, 3 * scale);
  });

  // Driftwood between radio and valve
  const driftwood = scene.add.container(1790, 594).setDepth(9);
  driftwood.add([
    scene.add.ellipse(3, 4, 64, 6, 0x000000, 0.4),
    scene.add.rectangle(0, 0, 58, 6, 0x6a4a2a, 1).setStrokeStyle(1, 0x2a1a0a, 0.85).setAngle(6),
    scene.add.triangle(-30, 0, 0, -3, -10, 3, 0, 3, 0x5a3a22, 1).setAngle(6),
    scene.add.triangle(30, 0, 0, -3, 10, 3, 0, 3, 0x5a3a22, 1).setAngle(6),
  ]);

  // Scattered small pebbles + barnacle clumps
  const pebbleGfx = scene.add.graphics().setDepth(8);
  [
    [1230, 596, 5], [1246, 598, 4], [1468, 598, 3.5], [1622, 596, 4],
    [1720, 598, 3.5], [2008, 596, 5], [2084, 598, 4], [2260, 596, 4.5],
    [2490, 598, 5], [2570, 596, 3.5], [2690, 598, 4], [2976, 596, 5],
  ].forEach(([px, py, pr]) => {
    pebbleGfx.fillStyle(0x000000, 0.4);
    pebbleGfx.fillCircle(px + 1, py + 2, pr);
    pebbleGfx.fillStyle(0x3a4a52, 1);
    pebbleGfx.fillCircle(px, py, pr);
    pebbleGfx.fillStyle(0x5a7080, 0.5);
    pebbleGfx.fillCircle(px - pr * 0.3, py - pr * 0.3, pr * 0.4);
  });

  // Coiled rope near the toolbox
  const rope = scene.add.container(1418, 592).setDepth(9);
  rope.add([
    scene.add.ellipse(2, 3, 48, 8, 0x000000, 0.4),
    scene.add.circle(0, 0, 18, 0x000000, 0).setStrokeStyle(4, 0xb89464, 0.85),
    scene.add.circle(0, 0, 10, 0x000000, 0).setStrokeStyle(3, 0xb89464, 0.85),
    scene.add.rectangle(14, -2, 8, 3, 0xb89464, 0.85).setAngle(24),
  ]);

  // Spray mist along the foreground base
  for (let i = 0; i < 5; i += 1) {
    const spray = scene.add.ellipse(1200 + i * 420, 605 + (i % 2) * 4, 140, 10, 0xd7edf3, 0.06).setDepth(7);
    scene.tweens.add({
      targets: spray, alpha: 0.15, duration: 2600 + i * 200,
      yoyo: true, repeat: -1, ease: "sine.inOut",
    });
  }
}
