import {
  BAY_WORLD_WIDTH,
  PIER_WORLD_WIDTH,
  PREVIEW_GROUND_Y,
  PREVIEW_WORLD_HEIGHT,
  SERVICE_WORLD_WIDTH,
  TUNNEL_WORLD_WIDTH,
} from "../data/towerData.js";

export function buildServiceEnvironment(scene) {
  scene.serviceDust = [];

  scene.add.rectangle(SERVICE_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, SERVICE_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x061018);
  scene.add.rectangle(SERVICE_WORLD_WIDTH * 0.5, 208, SERVICE_WORLD_WIDTH, 356, 0x17232b, 0.98);
  scene.add.rectangle(SERVICE_WORLD_WIDTH * 0.5, 254, SERVICE_WORLD_WIDTH, 260, 0x26343d, 0.5);
  scene.add.rectangle(SERVICE_WORLD_WIDTH * 0.5, 654, SERVICE_WORLD_WIDTH, 132, 0x0d151c, 1);

  const room = scene.add.container(1200, 394).setDepth(2);
  room.add([
    scene.add.ellipse(0, 214, 1180, 64, 0x000000, 0.24),
    scene.add.rectangle(0, 0, 1120, 390, 0x2c3a43, 1).setStrokeStyle(6, 0x141a1f, 0.72),
    scene.add.rectangle(0, 0, 1038, 326, 0x4a5a63, 0.18).setStrokeStyle(2, 0xc8d7dd, 0.08),
    scene.add.rectangle(0, 176, 1120, 44, 0x20272d, 1),
  ]);

  for (let index = 0; index < 8; index += 1) {
    room.add(scene.add.rectangle(-448 + index * 128, -4, 10, 332, 0x36454e, 0.42));
  }

  createServiceProps(scene);

  for (let index = 0; index < 16; index += 1) {
    const mote = scene.add.circle(
      720 + Math.random() * 900,
      190 + Math.random() * 280,
      1 + Math.random() * 2.4,
      0xd7d1b4,
      0.06 + Math.random() * 0.05
    ).setDepth(6);
    mote.speedX = -0.05 + Math.random() * 0.1;
    mote.speedY = 0.04 + Math.random() * 0.08;
    mote.phase = index * 0.44;
    scene.serviceDust.push(mote);
  }
}

export function createServiceGround(scene) {
  scene.physics.world.setBounds(0, 0, SERVICE_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1200, PREVIEW_GROUND_Y + 60, 1120, 120, 0x39464a, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
}

export function updateServiceAmbient(scene, time) {
  for (const mote of scene.serviceDust) {
    mote.x += mote.speedX;
    mote.y += mote.speedY + Math.sin(time * 0.0011 + mote.phase) * 0.08;
    if (mote.y > 560) {
      mote.y = 180;
    }
    if (mote.x < 680) {
      mote.x = 1620;
    }
    if (mote.x > 1620) {
      mote.x = 680;
    }
  }

  if (scene.consoleGlow) {
    scene.consoleGlow.alpha = 0.04 + Math.sin(time * 0.0021) * 0.03;
  }
}

export function buildTunnelEnvironment(scene) {
  scene.tunnelDrips = [];

  scene.add.rectangle(TUNNEL_WORLD_WIDTH * 0.5, PREVIEW_WORLD_HEIGHT * 0.5, TUNNEL_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT, 0x050a0e);
  scene.add.rectangle(TUNNEL_WORLD_WIDTH * 0.5, 210, TUNNEL_WORLD_WIDTH, 340, 0x121c22, 1);
  scene.add.rectangle(TUNNEL_WORLD_WIDTH * 0.5, 252, TUNNEL_WORLD_WIDTH, 260, 0x253239, 0.42);
  scene.add.rectangle(TUNNEL_WORLD_WIDTH * 0.5, 652, TUNNEL_WORLD_WIDTH, 136, 0x091319, 1);

  const tunnel = scene.add.container(1200, 388).setDepth(2);
  tunnel.add([
    scene.add.ellipse(0, 224, 1120, 56, 0x000000, 0.3),
    scene.add.rectangle(0, 18, 1020, 360, 0x2b3439, 1).setStrokeStyle(6, 0x13191d, 0.84),
    scene.add.ellipse(0, -82, 1020, 210, 0x314049, 0.46).setStrokeStyle(3, 0x5d707b, 0.12),
    scene.add.rectangle(0, 182, 1020, 36, 0x1d252a, 1),
  ]);

  for (let index = 0; index < 9; index += 1) {
    const drip = scene.add.rectangle(820 + index * 90, 164 + (index % 2) * 20, 3, 44 + (index % 3) * 16, 0x87b9c7, 0.12).setDepth(5);
    drip.speed = 0.8 + index * 0.08;
    drip.baseY = drip.y;
    scene.tunnelDrips.push(drip);
  }

  createTunnelProps(scene);
}

export function createTunnelGround(scene) {
  scene.physics.world.setBounds(0, 0, TUNNEL_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(1200, PREVIEW_GROUND_Y + 60, 1020, 120, 0x364146, 0);
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
}

export function updateTunnelAmbient(scene, time) {
  for (const drip of scene.tunnelDrips) {
    drip.y = drip.baseY + Math.sin(time * 0.0018 + drip.speed) * 8;
    drip.alpha = 0.08 + Math.sin(time * 0.0022 + drip.speed) * 0.04;
  }

  if (scene.signalGlow) {
    scene.signalGlow.alpha = 0.06 + Math.sin(time * 0.003) * 0.05;
  }
}

export function buildPierEnvironment(scene) {
  scene.pierWaveBands = [];

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

  if (scene.gateGlow) {
    scene.gateGlow.alpha = 0.04 + Math.sin(time * 0.0023) * 0.03;
  }
}

export function buildBayEnvironment(scene) {
  scene.bayWaterBands = [];

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
}

function createServiceProps(scene) {
  scene.add.container(962, 552).setDepth(8).add([
    scene.add.ellipse(0, 30, 120, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 64, 42, 0x7a5f44, 1).setStrokeStyle(3, 0xd7c59c, 0.2),
    scene.add.rectangle(-16, 0, 4, 42, 0x4a3727, 1),
  ]);

  const hatch = scene.add.container(1112, 560).setDepth(8);
  hatch.add([
    scene.add.ellipse(0, 20, 140, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 96, 24, 0x45545d, 1).setStrokeStyle(3, 0x91a7b2, 0.2),
    scene.add.arc(0, 2, 16, 200, -20, false, 0xd7c59c, 1).setLineWidth(4),
  ]);

  const consoleUnit = scene.add.container(1406, 530).setDepth(8);
  consoleUnit.add([
    scene.add.ellipse(0, 32, 150, 22, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 112, 70, 0x32414a, 1).setStrokeStyle(3, 0x8aa1ac, 0.2),
    scene.add.rectangle(0, -8, 74, 28, 0x131c21, 1),
    scene.add.rectangle(-30, 12, 18, 8, 0x89b6bf, 0.4),
    scene.add.rectangle(0, 12, 18, 8, 0x89b6bf, 0.4),
    scene.add.rectangle(30, 12, 18, 8, 0x89b6bf, 0.4),
  ]);
  scene.consoleGlow = scene.add.circle(1406, 522, 22, 0x8ad5db, 0.05).setDepth(7);

  scene.add.container(1688, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 90, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 58, 164, 0x3b3028, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.rectangle(0, -8, 42, 42, 0x20262c, 1).setStrokeStyle(2, 0x8ea4af, 0.22),
    scene.add.line(0, 0, -16, 0, 16, 0, 0xe0c27d, 1).setLineWidth(4),
  ]);
}

function createTunnelProps(scene) {
  scene.add.container(734, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 96, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 58, 164, 0x3a3029, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.rectangle(0, -8, 42, 42, 0x20262c, 1).setStrokeStyle(2, 0x8ea4af, 0.22),
  ]);

  scene.add.container(1012, 552).setDepth(8).add([
    scene.add.ellipse(0, 24, 112, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 64, 46, 0x58656b, 1).setStrokeStyle(3, 0xc9b07c, 0.2),
    scene.add.rectangle(0, -2, 34, 6, 0x202932, 1),
  ]);

  const signal = scene.add.container(1460, 516).setDepth(8);
  signal.add([
    scene.add.ellipse(0, 42, 132, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 84, 82, 0x304048, 1).setStrokeStyle(3, 0xe1bb73, 0.2),
    scene.add.rectangle(0, -10, 42, 20, 0x131c21, 1),
    scene.add.circle(22, 10, 6, 0x9fe0eb, 0.7),
  ]);
  scene.signalGlow = scene.add.circle(1482, 524, 20, 0x9fe0eb, 0.08).setDepth(7);

  scene.add.container(1726, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 96, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 62, 164, 0x3a312a, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.circle(12, 8, 5, 0xe0c27d, 1),
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
    scene.add.line(0, 0, -16, 0, 16, 0, 0xe0c27d, 1).setLineWidth(4),
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
