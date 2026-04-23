import {
  BAY_WORLD_WIDTH,
  NORTH_BAY_WORLD_WIDTH,
  PIER_WORLD_WIDTH,
  PREVIEW_GROUND_Y,
  PREVIEW_WORLD_HEIGHT,
  SERVICE_WORLD_WIDTH,
  TUNNEL_WORLD_WIDTH,
} from "../data/towerData.js";

export function buildServiceEnvironment(scene) {
  scene.serviceDust = [];
  scene.serviceSteam = [];
  scene.serviceLeakBands = [];

  scene.add.rectangle(SERVICE_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, SERVICE_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x050c13);
  scene.add.ellipse(1240, 126, 760, 220, 0x43657f, 0.08);
  scene.add.rectangle(SERVICE_WORLD_WIDTH * 0.5, 184, SERVICE_WORLD_WIDTH, 360, 0x0f1c24, 0.98);
  scene.add.rectangle(SERVICE_WORLD_WIDTH * 0.5, 262, SERVICE_WORLD_WIDTH, 260, 0x1b2a34, 0.64);
  scene.add.rectangle(SERVICE_WORLD_WIDTH * 0.5, 654, SERVICE_WORLD_WIDTH, 132, 0x07131a, 1);
  scene.add.rectangle(SERVICE_WORLD_WIDTH * 0.5, 624, SERVICE_WORLD_WIDTH, 22, 0x19455a, 0.16);

  const chamber = scene.add.container(1200, 392).setDepth(2);
  chamber.add([
    scene.add.ellipse(0, 220, 1210, 72, 0x000000, 0.28),
    scene.add.rectangle(0, 0, 1160, 402, 0x24333c, 1).setStrokeStyle(6, 0x0f1519, 0.82),
    scene.add.rectangle(0, -4, 1084, 334, 0x44555e, 0.18).setStrokeStyle(2, 0xb9c8cf, 0.08),
    scene.add.rectangle(0, 178, 1160, 44, 0x1c252b, 1),
    scene.add.rectangle(0, -168, 1160, 30, 0x10171d, 0.74),
  ]);

  for (let index = 0; index < 8; index += 1) {
    chamber.add(scene.add.rectangle(-470 + index * 134, -6, 12, 340, 0x34444d, 0.42));
  }

  for (let index = 0; index < 5; index += 1) {
    chamber.add(scene.add.rectangle(-390 + index * 188, -146, 156, 8, 0x56656b, 0.28));
  }

  const shaftLight = scene.add.ellipse(1220, 258, 360, 250, 0xc6d6c7, 0.05).setDepth(3);
  const floorWash = scene.add.ellipse(1220, 578, 560, 70, 0xb0d7dc, 0.05).setDepth(3);
  scene.serviceLampPulse = scene.add.ellipse(1460, 516, 164, 80, 0x87d3df, 0.05).setDepth(6);
  scene.serviceDoorLamp = scene.add.circle(1666, 454, 16, 0xd8ba74, 0.12).setDepth(8);
  scene.serviceDoorLampHalo = scene.add.circle(1666, 454, 44, 0xd8ba74, 0.04).setDepth(7);

  createServiceProps(scene);

  for (let index = 0; index < 22; index += 1) {
    const mote = scene.add.circle(
      720 + Math.random() * 960,
      170 + Math.random() * 330,
      1 + Math.random() * 2.8,
      0xe0d7be,
      0.05 + Math.random() * 0.05
    ).setDepth(6);
    mote.speedX = -0.08 + Math.random() * 0.16;
    mote.speedY = 0.04 + Math.random() * 0.08;
    mote.phase = index * 0.38;
    scene.serviceDust.push(mote);
  }

  for (let index = 0; index < 4; index += 1) {
    const steam = scene.add.ellipse(
      1360 + index * 28,
      486 + index * 6,
      28 + index * 8,
      16 + index * 4,
      0xc8e3ea,
      0.04
    ).setDepth(7);
    steam.baseX = steam.x;
    steam.baseY = steam.y;
    steam.phase = index * 0.7;
    scene.serviceSteam.push(steam);
  }

  for (let index = 0; index < 5; index += 1) {
    const leakBand = scene.add.rectangle(
      840 + index * 168,
      574 + (index % 2) * 10,
      120 + index * 18,
      10,
      0x9bc6d2,
      0.03
    ).setDepth(5);
    leakBand.phase = index * 0.62;
    scene.serviceLeakBands.push(leakBand);
  }

  shaftLight.setDepth(4);
  floorWash.setDepth(4);
}

export function createServiceGround(scene) {
  scene.physics.world.setBounds(0, 0, SERVICE_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1200, PREVIEW_GROUND_Y + 60, 1160, 120, 0x39464a, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
}

export function updateServiceAmbient(scene, time) {
  for (const mote of scene.serviceDust) {
    mote.x += mote.speedX;
    mote.y += mote.speedY + Math.sin(time * 0.0011 + mote.phase) * 0.08;
    if (mote.y > 560) {
      mote.y = 176;
    }
    if (mote.x < 670) {
      mote.x = 1730;
    }
    if (mote.x > 1730) {
      mote.x = 670;
    }
  }

  for (const steam of scene.serviceSteam) {
    steam.x = steam.baseX + Math.sin(time * 0.0017 + steam.phase) * 10;
    steam.y = steam.baseY - Math.abs(Math.sin(time * 0.0015 + steam.phase)) * 16;
    steam.alpha = 0.025 + Math.sin(time * 0.0019 + steam.phase) * 0.02 + 0.03;
    steam.scaleX = 1 + Math.sin(time * 0.0013 + steam.phase) * 0.16;
  }

  if (scene.consoleGlow) {
    scene.consoleGlow.alpha = 0.06 + Math.sin(time * 0.0021) * 0.035;
  }

  if (scene.serviceLampPulse) {
    scene.serviceLampPulse.alpha = 0.04 + Math.sin(time * 0.0018) * 0.03;
  }

  if (scene.serviceDoorLamp) {
    scene.serviceDoorLamp.alpha = 0.12 + Math.sin(time * 0.0026) * 0.08;
  }

  if (scene.serviceDoorLampHalo) {
    scene.serviceDoorLampHalo.alpha = 0.03 + Math.sin(time * 0.0021) * 0.02;
  }

  scene.serviceLeakBands.forEach((band, index) => {
    band.alpha = 0.02 + Math.sin(time * 0.0017 + band.phase) * 0.02 + 0.02;
    band.width = 118 + Math.sin(time * 0.0014 + index) * 14 + index * 14;
  });
}

export function buildTunnelEnvironment(scene) {
  scene.tunnelDrips = [];
  scene.tunnelMist = [];
  scene.tunnelIndicatorBands = [];

  scene.add.rectangle(TUNNEL_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, TUNNEL_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x04080c);
  scene.add.ellipse(1220, 152, 860, 260, 0x29414f, 0.08);
  scene.add.rectangle(TUNNEL_WORLD_WIDTH * 0.5, 206, TUNNEL_WORLD_WIDTH, 342, 0x0d151b, 1);
  scene.add.rectangle(TUNNEL_WORLD_WIDTH * 0.5, 256, TUNNEL_WORLD_WIDTH, 248, 0x1a252c, 0.7);
  scene.add.rectangle(TUNNEL_WORLD_WIDTH * 0.5, 654, TUNNEL_WORLD_WIDTH, 132, 0x061018, 1);
  scene.add.rectangle(TUNNEL_WORLD_WIDTH * 0.5, 630, TUNNEL_WORLD_WIDTH, 34, 0x1b536a, 0.16);

  const tunnel = scene.add.container(1200, 392).setDepth(2);
  tunnel.add([
    scene.add.ellipse(0, 228, 1120, 62, 0x000000, 0.3),
    scene.add.rectangle(0, 28, 1040, 350, 0x242d32, 1).setStrokeStyle(6, 0x11171b, 0.84),
    scene.add.ellipse(0, -86, 1040, 228, 0x32414a, 0.42).setStrokeStyle(3, 0x5d707b, 0.12),
    scene.add.rectangle(0, 186, 1040, 34, 0x172126, 1),
  ]);

  for (let index = 0; index < 7; index += 1) {
    tunnel.add(scene.add.rectangle(-364 + index * 122, -28, 102, 168, 0x304047, 0.12));
  }

  scene.tunnelLeftGlow = scene.add.ellipse(850, 388, 220, 180, 0x8ad0dd, 0.04).setDepth(4);
  scene.tunnelRightGlow = scene.add.ellipse(1570, 392, 260, 190, 0xd4b56d, 0.04).setDepth(4);

  for (let index = 0; index < 10; index += 1) {
    const drip = scene.add.rectangle(
      814 + index * 84,
      156 + (index % 3) * 18,
      3,
      48 + (index % 4) * 12,
      0x8ac2d0,
      0.12
    ).setDepth(5);
    drip.speed = 0.8 + index * 0.08;
    drip.baseY = drip.y;
    scene.tunnelDrips.push(drip);
  }

  for (let index = 0; index < 6; index += 1) {
    const haze = scene.add.ellipse(
      1020 + index * 98,
      544 + (index % 2) * 10,
      90 + index * 12,
      26,
      0xc4edf2,
      0.028
    ).setDepth(6);
    haze.baseX = haze.x;
    haze.baseY = haze.y;
    haze.phase = index * 0.52;
    scene.tunnelMist.push(haze);
  }

  for (let index = 0; index < 4; index += 1) {
    const indicator = scene.add.ellipse(
      1460 + index * 20,
      530 + (index % 2) * 8,
      36,
      10,
      0x9fe0eb,
      0.04
    ).setDepth(7);
    indicator.phase = index * 0.7;
    scene.tunnelIndicatorBands.push(indicator);
  }

  createTunnelProps(scene);
}

export function createTunnelGround(scene) {
  scene.physics.world.setBounds(0, 0, TUNNEL_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1200, PREVIEW_GROUND_Y + 60, 1040, 120, 0x364146, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
}

export function updateTunnelAmbient(scene, time) {
  for (const drip of scene.tunnelDrips) {
    drip.y = drip.baseY + Math.sin(time * 0.0018 + drip.speed) * 9;
    drip.alpha = 0.08 + Math.sin(time * 0.0022 + drip.speed) * 0.05;
  }

  for (const haze of scene.tunnelMist) {
    haze.x = haze.baseX + Math.sin(time * 0.0012 + haze.phase) * 18;
    haze.y = haze.baseY - Math.abs(Math.sin(time * 0.0016 + haze.phase)) * 7;
    haze.alpha = 0.02 + Math.sin(time * 0.0014 + haze.phase) * 0.015 + 0.022;
  }

  if (scene.signalGlow) {
    scene.signalGlow.alpha = 0.08 + Math.sin(time * 0.003) * 0.06;
  }

  if (scene.tunnelLeftGlow) {
    scene.tunnelLeftGlow.alpha = 0.03 + Math.sin(time * 0.0017) * 0.02;
  }

  if (scene.tunnelRightGlow) {
    scene.tunnelRightGlow.alpha = 0.03 + Math.sin(time * 0.0021) * 0.02;
  }

  scene.tunnelIndicatorBands.forEach((indicator, index) => {
    indicator.alpha = 0.03 + Math.sin(time * 0.0028 + indicator.phase) * 0.03 + 0.02;
    indicator.width = 28 + Math.sin(time * 0.0022 + index) * 10;
  });
}

export function buildPierEnvironment(scene) {
  scene.pierWaveBands = [];
  scene.pierRain = [];
  scene.pierSpray = [];

  scene.add.rectangle(PIER_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, PIER_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x06141d);
  scene.add.rectangle(PIER_WORLD_WIDTH * 0.5, 144, PIER_WORLD_WIDTH, 300, 0x11293a, 0.94);
  scene.add.rectangle(PIER_WORLD_WIDTH * 0.5, 226, PIER_WORLD_WIDTH, 210, 0x19455b, 0.42);
  scene.add.polygon(540, 450, [0, 160, 180, 48, 390, 174, 700, 64, 880, 188, 880, 320, 0, 320], 0x173240, 0.88);
  scene.add.polygon(1840, 458, [0, 180, 190, 60, 450, 184, 840, 76, 1060, 216, 1060, 320, 0, 320], 0x102837, 0.92);
  scene.add.rectangle(PIER_WORLD_WIDTH * 0.5, 654, PIER_WORLD_WIDTH, 138, 0x082030, 1);
  scene.add.rectangle(PIER_WORLD_WIDTH * 0.5, 630, PIER_WORLD_WIDTH, 40, 0x175a72, 0.3);

  for (let index = 0; index < 6; index += 1) {
    const band = scene.add.rectangle(160 + index * 360, 640 + (index % 2) * 10, 240, 5, 0xb0dce3, 0.12);
    band.speed = 12 + index * 2;
    band.baseWidth = band.width;
    scene.pierWaveBands.push(band);
  }

  for (let index = 0; index < 16; index += 1) {
    const streak = scene.add.rectangle(
      620 + Math.random() * 1180,
      142 + Math.random() * 320,
      2,
      42 + Math.random() * 16,
      0xd7edf3,
      0.14
    ).setAngle(18).setDepth(4);
    streak.speed = 5 + Math.random() * 2;
    streak.resetY = 118 + Math.random() * 40;
    scene.pierRain.push(streak);
  }

  for (let index = 0; index < 4; index += 1) {
    const spray = scene.add.ellipse(980 + index * 220, 626 + (index % 2) * 8, 150, 18, 0xd7edf3, 0.06).setDepth(4);
    spray.phase = index * 0.7;
    scene.pierSpray.push(spray);
  }

  createPierProps(scene);
}

export function createPierGround(scene) {
  scene.physics.world.setBounds(0, 0, PIER_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1200, PREVIEW_GROUND_Y + 60, 1240, 120, 0x3a4b50, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
}

export function updatePierAmbient(scene, time) {
  for (const band of scene.pierWaveBands) {
    band.x += band.speed * 0.016;
    band.alpha = 0.08 + Math.sin(time * 0.0012 + band.speed) * 0.05;
    band.width = band.baseWidth + Math.sin(time * 0.0017 + band.speed) * 22;
    if (band.x > PIER_WORLD_WIDTH + 180) {
      band.x = -180;
    }
  }

  for (const streak of scene.pierRain) {
    streak.y += streak.speed;
    if (streak.y > 496) {
      streak.y = streak.resetY;
    }
  }

  scene.pierSpray.forEach((spray, index) => {
    spray.alpha = 0.04 + Math.sin(time * 0.0021 + spray.phase) * 0.03 + 0.03;
    spray.width = 140 + Math.sin(time * 0.0016 + index) * 18;
  });

  if (scene.gateGlow) {
    scene.gateGlow.alpha = 0.04 + Math.sin(time * 0.0023) * 0.03;
  }
}

export function buildBayEnvironment(scene) {
  scene.bayWaterBands = [];
  scene.bayMist = [];
  scene.bayFireGlow = [];

  scene.add.rectangle(BAY_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, BAY_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x06131a);
  scene.add.rectangle(BAY_WORLD_WIDTH * 0.5, 146, BAY_WORLD_WIDTH, 280, 0x102636, 0.94);
  scene.add.rectangle(BAY_WORLD_WIDTH * 0.5, 230, BAY_WORLD_WIDTH, 200, 0x19445b, 0.4);
  scene.add.polygon(540, 454, [0, 168, 180, 48, 430, 182, 760, 70, 980, 220, 980, 320, 0, 320], 0x153240, 0.94);
  scene.add.polygon(1660, 462, [0, 178, 160, 54, 360, 176, 720, 70, 900, 212, 900, 320, 0, 320], 0x122b39, 0.96);
  scene.add.rectangle(BAY_WORLD_WIDTH * 0.5, 654, BAY_WORLD_WIDTH, 132, 0x08202d, 1);
  scene.add.rectangle(BAY_WORLD_WIDTH * 0.5, 632, BAY_WORLD_WIDTH, 36, 0x1a657f, 0.3);

  for (let index = 0; index < 5; index += 1) {
    const band = scene.add.rectangle(140 + index * 400, 640 + (index % 2) * 8, 260, 5, 0xc3e6ec, 0.1);
    band.speed = 10 + index * 1.6;
    band.baseWidth = band.width;
    scene.bayWaterBands.push(band);
  }

  for (let index = 0; index < 4; index += 1) {
    const haze = scene.add.ellipse(
      980 + index * 150,
      572 + (index % 2) * 10,
      120 + index * 16,
      24,
      0xc3e6ec,
      0.025
    ).setDepth(6);
    haze.phase = index * 0.7;
    scene.bayMist.push(haze);
  }

  for (let index = 0; index < 3; index += 1) {
    const emberGlow = scene.add.circle(1048 + index * 6, 564 + index * 2, 24 + index * 8, 0xc8844a, 0.03).setDepth(7);
    emberGlow.phase = index * 0.8;
    scene.bayFireGlow.push(emberGlow);
  }

  createBayProps(scene);
}

export function createBayGround(scene) {
  scene.physics.world.setBounds(0, 0, BAY_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1100, PREVIEW_GROUND_Y + 60, 1040, 120, 0x324147, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
}

export function updateBayAmbient(scene, time) {
  for (const band of scene.bayWaterBands) {
    band.x += band.speed * 0.016;
    band.alpha = 0.06 + Math.sin(time * 0.0011 + band.speed) * 0.04;
    band.width = band.baseWidth + Math.sin(time * 0.0016 + band.speed) * 18;
    if (band.x > BAY_WORLD_WIDTH + 180) {
      band.x = -180;
    }
  }

  scene.bayMist.forEach((haze, index) => {
    haze.alpha = 0.018 + Math.sin(time * 0.0018 + haze.phase) * 0.015 + 0.02;
    haze.x += Math.sin(time * 0.0012 + index) * 0.08;
  });

  scene.bayFireGlow.forEach((glow) => {
    glow.alpha = 0.018 + Math.sin(time * 0.003 + glow.phase) * 0.02 + 0.02;
    glow.scaleX = 1 + Math.sin(time * 0.002 + glow.phase) * 0.06;
    glow.scaleY = 1 + Math.sin(time * 0.002 + glow.phase) * 0.06;
  });
}

function createServiceProps(scene) {
  scene.add.container(948, 552).setDepth(8).add([
    scene.add.ellipse(0, 28, 136, 20, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 76, 46, 0x775f47, 1).setStrokeStyle(3, 0xd7c59c, 0.2),
    scene.add.rectangle(-18, 0, 5, 46, 0x4a3727, 1),
    scene.add.rectangle(10, -8, 30, 14, 0xb8b0a4, 1).setAngle(-8),
    scene.add.rectangle(12, -8, 16, 3, 0x31414d, 1).setAngle(-8),
  ]);

  const hatch = scene.add.container(1112, 560).setDepth(8);
  hatch.add([
    scene.add.ellipse(0, 20, 154, 20, 0x000000, 0.2),
    scene.add.rectangle(0, 0, 102, 26, 0x44545d, 1).setStrokeStyle(3, 0x91a7b2, 0.24),
    scene.add.arc(0, 2, 18, 200, -20, false, 0xd7c59c, 1).setStrokeStyle(4, 0xd7c59c, 1),
    scene.add.rectangle(0, 0, 70, 6, 0x28333a, 1),
  ]);

  const consoleUnit = scene.add.container(1406, 528).setDepth(8);
  consoleUnit.add([
    scene.add.ellipse(0, 40, 188, 24, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 132, 82, 0x32414a, 1).setStrokeStyle(3, 0x8aa1ac, 0.24),
    scene.add.rectangle(0, -12, 88, 34, 0x131c21, 1),
    scene.add.rectangle(-38, 18, 18, 8, 0x89b6bf, 0.42),
    scene.add.rectangle(-10, 18, 18, 8, 0x89b6bf, 0.42),
    scene.add.rectangle(18, 18, 18, 8, 0x89b6bf, 0.42),
    scene.add.rectangle(46, 18, 18, 8, 0xe1bb73, 0.28),
    scene.add.rectangle(78, -6, 16, 46, 0x27343d, 1),
  ]);
  scene.consoleGlow = scene.add.circle(1406, 516, 32, 0x8ad5db, 0.06).setDepth(7);

  scene.add.container(1678, 516).setDepth(8).add([
    scene.add.ellipse(0, 74, 96, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 62, 170, 0x3b3028, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.rectangle(0, -12, 46, 38, 0x20262c, 1).setStrokeStyle(2, 0x8ea4af, 0.22),
    scene.add.line(0, 0, -18, 4, 18, 4, 0xe0c27d, 1).setStrokeStyle(4, 0xe0c27d, 1),
    scene.add.rectangle(-28, -40, 18, 54, 0x4a4138, 1).setStrokeStyle(2, 0xd2b47b, 0.18),
  ]);
}

function createTunnelProps(scene) {
  scene.add.container(734, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 98, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 60, 166, 0x3a3029, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.rectangle(0, -12, 44, 38, 0x20262c, 1).setStrokeStyle(2, 0x8ea4af, 0.22),
  ]);

  scene.add.container(1012, 550).setDepth(8).add([
    scene.add.ellipse(0, 28, 124, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 72, 52, 0x58656b, 1).setStrokeStyle(3, 0xc9b07c, 0.2),
    scene.add.rectangle(0, -4, 38, 8, 0x202932, 1),
    scene.add.rectangle(-18, -12, 12, 18, 0x31404a, 1),
    scene.add.rectangle(18, -12, 12, 18, 0x31404a, 1),
  ]);

  const signal = scene.add.container(1460, 516).setDepth(8);
  signal.add([
    scene.add.ellipse(0, 48, 148, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 98, 92, 0x304048, 1).setStrokeStyle(3, 0xe1bb73, 0.2),
    scene.add.rectangle(0, -12, 48, 24, 0x131c21, 1),
    scene.add.circle(24, 12, 6, 0x9fe0eb, 0.82),
    scene.add.rectangle(-18, 14, 20, 6, 0x6a808a, 1),
    scene.add.rectangle(0, 14, 20, 6, 0x6a808a, 1),
  ]);
  scene.signalGlow = scene.add.circle(1484, 528, 28, 0x9fe0eb, 0.1).setDepth(7);

  scene.add.container(1726, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 100, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 66, 168, 0x3a312a, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.circle(12, 8, 5, 0xe0c27d, 1),
    scene.add.rectangle(-30, -38, 18, 56, 0x4b4036, 1).setStrokeStyle(2, 0xd2b47b, 0.16),
  ]);
}

function createPierProps(scene) {
  scene.add.container(710, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 88, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 48, 164, 0x3a3028, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
  ]);

  scene.add.container(1000, 564).setDepth(8).add([
    scene.add.ellipse(0, 20, 180, 24, 0x000000, 0.2),
    scene.add.ellipse(0, 0, 130, 36, 0x5f6f7a, 1).setStrokeStyle(3, 0xc9d8de, 0.2),
    scene.add.rectangle(-28, -2, 32, 10, 0x2a353c, 1),
    scene.add.rectangle(38, 6, 42, 10, 0x7b5f44, 1),
  ]);

  scene.add.container(1360, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 120, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 34, 130, 0x4b5d68, 1),
    scene.add.circle(0, -18, 24, 0x24323a, 0).setStrokeStyle(4, 0xcab07c, 1),
  ]);

  scene.add.container(1724, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 96, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 62, 164, 0x3a312a, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.line(0, 0, -16, 0, 16, 0, 0xe0c27d, 1).setStrokeStyle(4, 0xe0c27d, 1),
  ]);
  scene.gateGlow = scene.add.circle(1724, 510, 18, 0x91cad8, 0.04).setDepth(7);
}

function createBayProps(scene) {
  scene.add.container(722, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 88, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 56, 164, 0x3a312a, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
  ]);

  scene.add.container(1048, 568).setDepth(8).add([
    scene.add.ellipse(0, 16, 90, 16, 0x000000, 0.18),
    scene.add.circle(0, 0, 18, 0x5c4939, 1),
    scene.add.rectangle(-16, 4, 16, 8, 0x7f5d42, 1).setAngle(-30),
    scene.add.rectangle(16, 6, 18, 8, 0x7f5d42, 1).setAngle(24),
  ]);

  scene.add.container(1288, 548).setDepth(8).add([
    scene.add.ellipse(0, 36, 154, 22, 0x000000, 0.18),
    scene.add.triangle(-18, -20, 0, 0, 90, 0, 45, -90, 0x6d8270, 0.8),
    scene.add.rectangle(12, 8, 86, 52, 0x6c533d, 1).setStrokeStyle(3, 0xd7c59c, 0.18),
  ]);

  for (let index = 0; index < 4; index += 1) {
    scene.add.ellipse(1572 + index * 18, 566 + (index % 2) * 8, 16, 8, 0x1a1f22, 0.46).setAngle(-18).setDepth(8);
  }
}

export function buildNorthBayEnvironment(scene) {
  scene.northBayWaterBands = [];
  scene.northBayMist = [];
  scene.northBayDrips = [];

  scene.add.rectangle(NORTH_BAY_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, NORTH_BAY_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x050f16);
  scene.add.rectangle(NORTH_BAY_WORLD_WIDTH * 0.5, 128, NORTH_BAY_WORLD_WIDTH, 260, 0x0c1e2a, 0.95);
  scene.add.rectangle(NORTH_BAY_WORLD_WIDTH * 0.5, 218, NORTH_BAY_WORLD_WIDTH, 192, 0x163546, 0.36);

  scene.add.polygon(420, 452, [0, 198, 140, 36, 340, 186, 620, 54, 880, 210, 880, 320, 0, 320], 0x0f2532, 0.96);
  scene.add.polygon(1760, 460, [0, 204, 170, 58, 360, 180, 620, 60, 860, 220, 860, 320, 0, 320], 0x0d2130, 0.98);
  scene.add.polygon(1140, 420, [0, 216, 180, 80, 420, 200, 720, 80, 920, 220, 920, 320, 0, 320], 0x0a1c28, 0.88);

  scene.add.rectangle(NORTH_BAY_WORLD_WIDTH * 0.5, 654, NORTH_BAY_WORLD_WIDTH, 132, 0x040f17, 1);
  scene.add.rectangle(NORTH_BAY_WORLD_WIDTH * 0.5, 628, NORTH_BAY_WORLD_WIDTH, 40, 0x123c52, 0.28);

  for (let index = 0; index < 5; index += 1) {
    const band = scene.add.rectangle(160 + index * 420, 642 + (index % 2) * 10, 300, 4, 0xbfd7dc, 0.08);
    band.speed = 8 + index * 1.4;
    band.baseWidth = band.width;
    scene.northBayWaterBands.push(band);
  }

  for (let index = 0; index < 5; index += 1) {
    const haze = scene.add.ellipse(
      420 + index * 340,
      560 + (index % 2) * 12,
      180 + index * 14,
      26,
      0xaac2c8,
      0.03
    ).setDepth(6);
    haze.phase = index * 0.6;
    scene.northBayMist.push(haze);
  }

  for (let index = 0; index < 4; index += 1) {
    const drip = scene.add.rectangle(960 + index * 110, 220 + (index % 2) * 30, 2, 40, 0xbfd7dc, 0.18).setDepth(6);
    drip.baseY = drip.y;
    drip.phase = index * 0.9;
    scene.northBayDrips.push(drip);
  }

  createNorthBayProps(scene);
}

export function createNorthBayGround(scene) {
  scene.physics.world.setBounds(0, 0, NORTH_BAY_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1100, PREVIEW_GROUND_Y + 60, 1900, 120, 0x324147, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
}

export function updateNorthBayAmbient(scene, time) {
  for (const band of scene.northBayWaterBands ?? []) {
    band.x += band.speed * 0.014;
    band.alpha = 0.05 + Math.sin(time * 0.0012 + band.speed) * 0.04;
    band.width = band.baseWidth + Math.sin(time * 0.0017 + band.speed) * 22;
    if (band.x > NORTH_BAY_WORLD_WIDTH + 200) {
      band.x = -200;
    }
  }

  (scene.northBayMist ?? []).forEach((haze, index) => {
    haze.alpha = 0.02 + Math.sin(time * 0.0016 + haze.phase) * 0.02 + 0.02;
    haze.x += Math.sin(time * 0.0011 + index) * 0.09;
  });

  (scene.northBayDrips ?? []).forEach((drip) => {
    const cycle = (time * 0.0012 + drip.phase) % 1.6;
    drip.y = drip.baseY + cycle * 120;
    drip.alpha = cycle < 1.2 ? 0.18 : 0;
  });

  if (scene.northBayGearGlow?.visible) {
    scene.northBayGearGlow.alpha = 0.12 + Math.sin(time * 0.004) * 0.1;
    scene.northBayGearGlow.scaleX = 1 + Math.sin(time * 0.003) * 0.08;
    scene.northBayGearGlow.scaleY = 1 + Math.sin(time * 0.003) * 0.08;
  }
}

function createNorthBayProps(scene) {
  scene.add.container(720, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 88, 16, 0x000000, 0.22),
    scene.add.rectangle(0, 0, 56, 164, 0x2c2a26, 1).setStrokeStyle(3, 0xaf8e56, 0.24),
  ]);

  scene.add.container(1068, 560).setDepth(8).add([
    scene.add.ellipse(0, 22, 86, 16, 0x000000, 0.22),
    scene.add.rectangle(0, 6, 14, 28, 0x3a2e22, 1),
    scene.add.rectangle(0, -16, 36, 36, 0x1a242c, 1).setStrokeStyle(3, 0x6a7f8a, 0.28),
    scene.add.rectangle(0, -22, 22, 6, 0x4a5a64, 1),
    scene.add.circle(0, -16, 6, 0x2a1e14, 1),
  ]);

  const keeper = scene.add.container(1462, 528).setDepth(8);
  keeper.add([
    scene.add.ellipse(0, 58, 106, 18, 0x000000, 0.26),
    scene.add.rectangle(-6, 30, 38, 60, 0x32475a, 1).setStrokeStyle(2, 0x5f7b8c, 0.26),
    scene.add.rectangle(18, 20, 36, 44, 0x2b3d4e, 1).setAngle(18),
    scene.add.rectangle(-22, 10, 34, 40, 0x2b3d4e, 1).setAngle(-14),
    scene.add.circle(4, -10, 18, 0xd6b48e, 1),
    scene.add.rectangle(6, -18, 30, 8, 0xdbd2c0, 1).setStrokeStyle(1, 0x91795a, 0.4),
    scene.add.rectangle(10, -24, 6, 14, 0xb05a4b, 1),
  ]);

  scene.northBayGearProp = scene.add.container(1582, 582).setDepth(8).setVisible(false);
  scene.northBayGearProp.add([
    scene.add.ellipse(0, 14, 36, 10, 0x000000, 0.24),
    scene.add.circle(0, 0, 10, 0xb8963f, 1).setStrokeStyle(2, 0x5b4418, 0.6),
    scene.add.circle(0, 0, 5, 0x3a2d14, 1),
    scene.add.rectangle(4, -6, 4, 12, 0xb8963f, 1).setAngle(22),
  ]);

  scene.northBayGearGlow = scene.add.circle(1582, 578, 22, 0xe1bb73, 0).setDepth(7);

  scene.add.ellipse(1660, 586, 220, 18, 0x0b1820, 0.6).setDepth(7);
  for (let index = 0; index < 5; index += 1) {
    scene.add.ellipse(1520 + index * 28, 592 + (index % 2) * 6, 20, 8, 0x17242c, 0.52)
      .setAngle(index % 2 === 0 ? -18 : 10)
      .setDepth(8);
  }
}
