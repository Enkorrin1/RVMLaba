import {
  LANTERN_WORLD_WIDTH,
  PREVIEW_GROUND_Y,
  PREVIEW_WORLD_HEIGHT,
  SHORE_WORLD_WIDTH,
} from "../data/towerData.js";

const Phaser = window.Phaser;

export function buildLanternEnvironment(scene) {
  scene.lanternDust = [];
  scene.lanternWindowBands = [];

  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, LANTERN_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x07131c);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 138, LANTERN_WORLD_WIDTH, 276, 0x0f283b, 0.94);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 216, LANTERN_WORLD_WIDTH, 180, 0x17374c, 0.55);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 644, LANTERN_WORLD_WIDTH, 150, 0x071d2b, 1);
  scene.add.rectangle(LANTERN_WORLD_WIDTH * 0.5, 628, LANTERN_WORLD_WIDTH, 34, 0x15485f, 0.28);

  const room = scene.add.container(1110, 382);
  room.setDepth(2);
  room.add([
    scene.add.ellipse(0, 230, 920, 64, 0x000000, 0.28),
    scene.add.rectangle(0, 0, 900, 420, 0x24313b, 1).setStrokeStyle(6, 0x12191e, 0.72),
    scene.add.rectangle(0, 0, 824, 352, 0x5f6e77, 0.22).setStrokeStyle(2, 0xcce0e8, 0.1),
    scene.add.rectangle(0, 184, 900, 52, 0x22292f, 1),
    scene.add.rectangle(0, 202, 900, 18, 0x12181d, 0.92),
  ]);

  for (let index = 0; index < 6; index += 1) {
    room.add(scene.add.rectangle(-338 + index * 136, 0, 12, 368, 0x35444d, 0.52));
  }

  const projectorBase = scene.add.container(1350, 474).setDepth(7);
  projectorBase.add([
    scene.add.ellipse(0, 104, 320, 42, 0x000000, 0.24),
    scene.add.rectangle(0, 62, 220, 78, 0x31434f, 1).setStrokeStyle(3, 0x90a6b2, 0.2),
    scene.add.rectangle(0, 18, 150, 92, 0x405866, 1).setStrokeStyle(3, 0xcfe0e8, 0.14),
    scene.add.circle(0, -6, 62, 0x688395, 0.36).setStrokeStyle(6, 0xe2d09a, 0.22),
    scene.add.circle(0, -6, 34, 0xf4d290, 0.1),
    scene.add.rectangle(-96, 58, 30, 22, 0x1b232b, 1),
    scene.add.rectangle(96, 58, 30, 22, 0x1b232b, 1),
  ]);
  scene.projectorGlow = scene.add.ellipse(1350, 430, 250, 210, 0xe9c36e, 0.05).setDepth(5);

  const ladder = scene.add.container(774, 458).setDepth(8);
  ladder.add([
    scene.add.rectangle(-24, 0, 8, 292, 0x7a6c57, 1),
    scene.add.rectangle(24, 0, 8, 292, 0x7a6c57, 1),
  ]);
  for (let index = 0; index < 11; index += 1) {
    ladder.add(scene.add.rectangle(0, -126 + index * 24, 42, 6, 0xd2b279, 1));
  }

  for (let index = 0; index < 12; index += 1) {
    const mote = scene.add.circle(
      760 + Math.random() * 760,
      180 + Math.random() * 260,
      1 + Math.random() * 2.2,
      0xf1dfb1,
      0.06 + Math.random() * 0.07
    ).setDepth(6);
    mote.speedX = -0.05 + Math.random() * 0.12;
    mote.speedY = 0.04 + Math.random() * 0.09;
    mote.phase = index * 0.52;
    scene.lanternDust.push(mote);
  }

  for (let index = 0; index < 5; index += 1) {
    const band = scene.add.rectangle(200 + index * 420, 632 + (index % 2) * 10, 240, 4, 0xa7d4dc, 0.12);
    band.speed = 10 + index * 2;
    band.baseWidth = band.width;
    scene.lanternWindowBands.push(band);
  }
}

export function createLanternGround(scene) {
  scene.physics.world.setBounds(0, 0, LANTERN_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1110, PREVIEW_GROUND_Y + 60, 900, 120, 0x394649, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
}

export function updateLanternAmbient(scene, time) {
  for (const band of scene.lanternWindowBands) {
    band.x += band.speed * 0.016;
    band.alpha = 0.08 + Math.sin(time * 0.0012 + band.speed) * 0.04;
    band.width = band.baseWidth + Math.sin(time * 0.0015 + band.speed) * 18;
    if (band.x > LANTERN_WORLD_WIDTH + 180) {
      band.x = -180;
    }
  }

  for (const mote of scene.lanternDust) {
    mote.x += mote.speedX;
    mote.y += mote.speedY + Math.sin(time * 0.001 + mote.phase) * 0.08;

    if (mote.y > 560) {
      mote.y = 190;
    }
    if (mote.x < 690) {
      mote.x = 1490;
    }
    if (mote.x > 1490) {
      mote.x = 690;
    }
  }

  if (scene.projectorGlow) {
    scene.projectorGlow.alpha = 0.04 + Math.sin(time * 0.0016) * 0.02;
  }
}

export function buildShoreEnvironment(scene) {
  scene.shoreWaveBands = [];
  scene.shoreClouds = [];
  scene.shoreParallax = [];
  scene.shoreRain = [];
  scene.shoreSpray = [];
  scene.shoreGlowBands = [];

  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, SHORE_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x06131d);
  scene.add.ellipse(820, 116, 720, 260, 0x7ea8bf, 0.06);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 130, SHORE_WORLD_WIDTH, 300, 0x0f2435, 0.96);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 228, SHORE_WORLD_WIDTH, 200, 0x17394d, 0.52);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 302, SHORE_WORLD_WIDTH, 180, 0x24566c, 0.12);

  scene.shoreParallax.push(scene.add.polygon(760, 420, [0, 160, 184, 36, 420, 156, 734, 56, 1020, 188, 1020, 310, 0, 310], 0x0f2232, 0.92));
  scene.shoreParallax.push(scene.add.polygon(1700, 438, [0, 182, 218, 26, 454, 176, 870, 58, 1170, 210, 1170, 330, 0, 330], 0x142c3b, 0.9));
  scene.shoreParallax.push(scene.add.polygon(2860, 454, [0, 194, 238, 42, 540, 194, 980, 70, 1310, 222, 1310, 338, 0, 338], 0x102231, 0.94));
  scene.shoreParallax[0].parallax = 0.12;
  scene.shoreParallax[1].parallax = 0.22;
  scene.shoreParallax[2].parallax = 0.32;

  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 646, SHORE_WORLD_WIDTH, 150, 0x081d2b, 1);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 622, SHORE_WORLD_WIDTH, 42, 0x154f67, 0.34);
  scene.add.rectangle(SHORE_WORLD_WIDTH * 0.5, 610, SHORE_WORLD_WIDTH, 10, 0xc8edf0, 0.12);

  for (let index = 0; index < 10; index += 1) {
    const band = scene.add.rectangle(120 + index * 360, 636 + (index % 3) * 10, 240, 5, 0xb0dce3, 0.12);
    band.speed = 12 + index * 1.4;
    band.baseWidth = band.width;
    scene.shoreWaveBands.push(band);
  }

  for (let index = 0; index < 6; index += 1) {
    const cloud = scene.add.ellipse(360 + index * 520, 104 + (index % 2) * 34, 220 + (index % 3) * 24, 52, 0xd7e7eb, 0.08);
    cloud.speed = 2 + index * 0.4;
    scene.shoreClouds.push(cloud);
  }

  for (let index = 0; index < 18; index += 1) {
    const streak = scene.add.rectangle(
      780 + Math.random() * 2200,
      140 + Math.random() * 340,
      2,
      42 + Math.random() * 10,
      0xd7edf3,
      0.16
    ).setAngle(18).setDepth(4);
    streak.speed = 5.5 + Math.random() * 2.4;
    streak.resetY = 120 + Math.random() * 50;
    scene.shoreRain.push(streak);
  }

  for (let index = 0; index < 5; index += 1) {
    const spray = scene.add.ellipse(920 + index * 430, 626 + (index % 2) * 8, 170, 18, 0xd7edf3, 0.08).setDepth(4);
    spray.phase = index * 0.8;
    scene.shoreSpray.push(spray);
  }

  for (let index = 0; index < 3; index += 1) {
    const glowBand = scene.add.ellipse(980 + index * 520, 594, 260, 30, 0xa7d4dc, 0.03).setDepth(4);
    glowBand.phase = index * 1.2;
    scene.shoreGlowBands.push(glowBand);
  }

  createTower(scene);
  createShoreProps(scene);
  createShoreForeground(scene);
}

export function createShoreGround(scene) {
  scene.physics.world.setBounds(0, 0, SHORE_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1800, PREVIEW_GROUND_Y + 60, 2600, 120, 0x3a4b50, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
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

  if (scene.cameras?.main) {
    const scrollX = scene.cameras.main.scrollX;
    scene.shoreParallax.forEach((shape, index) => {
      const baseX = index === 0 ? 760 : index === 1 ? 1700 : 2860;
      shape.x = baseX + scrollX * shape.parallax;
    });
  }

  if (scene.radioGlow) {
    scene.radioGlow.alpha = 0.08 + Math.sin(time * 0.002) * 0.05;
  }

  if (scene.hatchAura?.visible) {
    scene.hatchAura.alpha = 0.12 + Math.sin(time * 0.0024) * 0.08;
  }
}

function createTower(scene) {
  const tower = scene.add.container(980, 292).setDepth(5);
  tower.add([
    scene.add.ellipse(0, 324, 340, 52, 0x000000, 0.24),
    scene.add.rectangle(0, 58, 252, 520, 0xc4ae88, 1).setStrokeStyle(4, 0x665543, 0.24),
    scene.add.rectangle(-54, 58, 38, 520, 0x90795e, 0.2),
    scene.add.rectangle(58, 58, 52, 520, 0xf0dfb9, 0.08),
    scene.add.rectangle(0, -152, 304, 70, 0x38424b, 1).setStrokeStyle(4, 0x192129, 0.42),
    scene.add.rectangle(0, -136, 236, 18, 0x627985, 0.9),
    scene.add.rectangle(-66, -136, 58, 26, 0x86b8c9, 0.26),
    scene.add.rectangle(66, -136, 58, 26, 0x86b8c9, 0.26),
    scene.add.rectangle(0, 246, 128, 184, 0x463731, 1).setStrokeStyle(3, 0x1f1814, 0.36),
    scene.add.circle(40, 248, 6, 0xe3c27d, 1),
    scene.add.rectangle(0, 284, 148, 22, 0x2e2520, 0.76),
  ]);

  for (let index = 0; index < 6; index += 1) {
    tower.add(scene.add.rectangle(0, -82 + index * 72, 216, 6, 0x8f7c64, 0.14));
  }

  const lanternGlow = scene.add.ellipse(980, 138, 240, 110, 0xa8d2de, 0.06).setDepth(4);
  scene.towerLanternGlow = lanternGlow;
}

function createShoreProps(scene) {
  const toolbox = scene.add.container(1330, 560).setDepth(9);
  toolbox.add([
    scene.add.ellipse(0, 22, 170, 24, 0x000000, 0.2),
    scene.add.rectangle(0, 0, 132, 50, 0x566169, 1).setStrokeStyle(3, 0xc8b07a, 0.18),
    scene.add.rectangle(0, -8, 98, 18, 0x7e8a92, 1),
    scene.add.rectangle(0, 6, 46, 8, 0x263239, 1),
    scene.add.rectangle(-34, 12, 18, 14, 0x69757b, 0.82),
    scene.add.rectangle(34, 12, 18, 14, 0x69757b, 0.82),
  ]);

  const radio = scene.add.container(1584, 534).setDepth(9);
  radio.add([
    scene.add.ellipse(0, 24, 124, 18, 0x000000, 0.2),
    scene.add.rectangle(0, 0, 78, 50, 0x334149, 1).setStrokeStyle(3, 0xe1bb73, 0.18),
    scene.add.rectangle(-10, 2, 32, 16, 0x162128, 1),
    scene.add.circle(22, -4, 4, 0xc7dce3, 1),
    scene.add.line(0, 0, 18, -20, 34, -72, 0xe1bb73, 1).setLineWidth(3),
    scene.add.rectangle(-20, -18, 18, 4, 0x72858f, 0.9),
  ]);
  scene.radioGlow = scene.add.circle(1606, 530, 16, 0xc2eef0, 0.08).setDepth(8);

  const wheel = scene.add.container(2172, 556).setDepth(9);
  wheel.add([
    scene.add.ellipse(0, 22, 110, 18, 0x000000, 0.18),
    scene.add.circle(0, 0, 24, 0x8b6b48, 0).setStrokeStyle(5, 0xc39d68, 1),
    scene.add.circle(0, 0, 6, 0xc39d68, 1),
    scene.add.rectangle(0, 0, 6, 34, 0xc39d68, 1),
    scene.add.rectangle(0, 0, 34, 6, 0xc39d68, 1),
  ]);
  scene.valveWheelVisual = wheel;

  const generator = scene.add.container(2780, 522).setDepth(9);
  const statusLight = scene.add.circle(82, -8, 8, 0xe3c47b, 1);
  generator.add([
    scene.add.ellipse(0, 60, 300, 32, 0x000000, 0.24),
    scene.add.rectangle(0, 12, 246, 112, 0x4f4236, 1).setStrokeStyle(4, 0xe3c47b, 0.18),
    scene.add.rectangle(-56, 12, 66, 88, 0x615244, 1).setStrokeStyle(3, 0xf2ddb1, 0.14),
    scene.add.rectangle(48, 0, 88, 64, 0x6c5c49, 1).setStrokeStyle(3, 0xf2ddb1, 0.14),
    statusLight,
    scene.add.rectangle(46, 36, 58, 14, 0x2d241d, 1),
    scene.add.rectangle(-10, -30, 140, 18, 0x6b5c48, 1),
    scene.add.rectangle(-88, -18, 22, 18, 0x2d241d, 1),
    scene.add.rectangle(-92, 64, 14, 32, 0x2c2621, 1),
    scene.add.rectangle(92, 64, 14, 32, 0x2c2621, 1),
  ]);
  scene.generatorVisual = generator;
  scene.generatorStatusLight = statusLight;

  scene.hatchAura = scene.add.ellipse(1094, 544, 120, 34, 0x8fe0a0, 0).setDepth(7).setVisible(false);
}

function createShoreForeground(scene) {
  const rocks = [
    [1180, 602, 180, 42, 0x1f2428],
    [1450, 606, 230, 50, 0x23292d],
    [1880, 610, 200, 44, 0x20272b],
    [2420, 606, 248, 46, 0x1f262a],
  ];

  rocks.forEach(([x, y, width, height, color]) => {
    scene.add.ellipse(x, y, width, height, color, 0.96).setDepth(8);
  });

  scene.add.rectangle(1208, 594, 216, 8, 0x31414a, 0.5).setDepth(8);
  scene.add.rectangle(2750, 592, 320, 10, 0x2c3941, 0.52).setDepth(8);
}
