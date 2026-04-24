import {
  PREVIEW_GROUND_Y,
  PREVIEW_WORLD_HEIGHT,
  UNDERGROUND_REGIONS,
  UNDERGROUND_WORLD_WIDTH,
} from "../data/towerData.js";

const REGION_PALETTE = {
  service: {
    ceiling: 0x1a232a,
    wall: 0x24333c,
    ground: 0x2c383f,
    accent: 0x87d3df,
    haze: 0xb0d7dc,
  },
  tunnel: {
    ceiling: 0x161d22,
    wall: 0x242d32,
    ground: 0x2a343a,
    accent: 0xe0c27d,
    haze: 0x8ac2d0,
  },
  pier: {
    ceiling: 0x122432,
    wall: 0x19364a,
    ground: 0x223744,
    accent: 0xb0dce3,
    haze: 0xc3e6ec,
  },
  bay: {
    ceiling: 0x0f2132,
    wall: 0x163548,
    ground: 0x243948,
    accent: 0xc8844a,
    haze: 0xc3e6ec,
  },
};

export function buildUndergroundEnvironment(scene) {
  scene.undergroundDust = [];
  scene.undergroundDrips = [];
  scene.undergroundMist = [];
  scene.undergroundWaveBands = [];
  scene.undergroundFireGlow = [];

  // Deep background wash
  scene.add.rectangle(
    UNDERGROUND_WORLD_WIDTH * 0.5,
    PREVIEW_WORLD_HEIGHT * 0.5,
    UNDERGROUND_WORLD_WIDTH,
    PREVIEW_WORLD_HEIGHT,
    0x050c13
  );

  const zones = [
    { key: "service", builder: buildServiceZone },
    { key: "tunnel", builder: buildTunnelZone },
    { key: "pier", builder: buildPierZone },
    { key: "bay", builder: buildBayZone },
  ];

  zones.forEach(({ key, builder }) => {
    const region = UNDERGROUND_REGIONS[key];
    builder(scene, region.start, region.end - region.start);
  });

  createUndergroundGates(scene);
  createUndergroundProps(scene);
  createRegionSignage(scene);
  createAmbientLayers(scene);
}

function buildServiceZone(scene, offsetX, width) {
  const palette = REGION_PALETTE.service;
  const centerX = offsetX + width * 0.5;

  scene.add.rectangle(centerX, 184, width, 360, palette.ceiling, 0.98);
  scene.add.rectangle(centerX, 262, width, 260, palette.wall, 0.64);
  scene.add.rectangle(centerX, 654, width, 132, 0x07131a, 1);
  scene.add.rectangle(centerX, 624, width, 22, 0x19455a, 0.16);

  scene.add.ellipse(offsetX + 1220, 128, 760, 220, 0x43657f, 0.08);

  const chamber = scene.add.container(offsetX + 1200, 392).setDepth(2);
  chamber.add([
    scene.add.ellipse(0, 220, 1210, 72, 0x000000, 0.28),
    scene.add.rectangle(0, 0, 1160, 402, palette.wall, 1).setStrokeStyle(6, 0x0f1519, 0.82),
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

  scene.add.ellipse(offsetX + 1220, 258, 360, 250, 0xc6d6c7, 0.05).setDepth(3);
  scene.add.ellipse(offsetX + 1220, 578, 560, 70, palette.haze, 0.05).setDepth(3);
  scene.serviceLampPulse = scene.add.ellipse(offsetX + 1460, 516, 164, 80, palette.accent, 0.05).setDepth(6);
  scene.serviceDoorLamp = scene.add.circle(offsetX + 1666, 454, 16, 0xd8ba74, 0.12).setDepth(8);
  scene.serviceDoorLampHalo = scene.add.circle(offsetX + 1666, 454, 44, 0xd8ba74, 0.04).setDepth(7);

  for (let index = 0; index < 16; index += 1) {
    const mote = scene.add.circle(
      offsetX + 140 + Math.random() * (width - 280),
      170 + Math.random() * 330,
      1 + Math.random() * 2.8,
      0xe0d7be,
      0.05 + Math.random() * 0.05
    ).setDepth(6);
    mote.speedX = -0.08 + Math.random() * 0.16;
    mote.speedY = 0.04 + Math.random() * 0.08;
    mote.phase = index * 0.38;
    mote.xMin = offsetX + 80;
    mote.xMax = offsetX + width - 80;
    scene.undergroundDust.push(mote);
  }
}

function buildTunnelZone(scene, offsetX, width) {
  const palette = REGION_PALETTE.tunnel;
  const centerX = offsetX + width * 0.5;

  scene.add.rectangle(centerX, 206, width, 342, palette.ceiling, 1);
  scene.add.rectangle(centerX, 256, width, 248, palette.wall, 0.7);
  scene.add.rectangle(centerX, 654, width, 132, 0x061018, 1);
  scene.add.rectangle(centerX, 630, width, 34, 0x1b536a, 0.16);

  scene.add.ellipse(offsetX + 900, 152, 860, 260, 0x29414f, 0.08);

  const tunnel = scene.add.container(offsetX + 900, 392).setDepth(2);
  tunnel.add([
    scene.add.ellipse(0, 228, 1120, 62, 0x000000, 0.3),
    scene.add.rectangle(0, 28, 1040, 350, palette.wall, 1).setStrokeStyle(6, 0x11171b, 0.84),
    scene.add.ellipse(0, -86, 1040, 228, 0x32414a, 0.42).setStrokeStyle(3, 0x5d707b, 0.12),
    scene.add.rectangle(0, 186, 1040, 34, 0x172126, 1),
  ]);
  for (let index = 0; index < 7; index += 1) {
    tunnel.add(scene.add.rectangle(-364 + index * 122, -28, 102, 168, 0x304047, 0.12));
  }

  scene.tunnelLeftGlow = scene.add.ellipse(offsetX + 520, 388, 220, 180, 0x8ad0dd, 0.04).setDepth(4);
  scene.tunnelRightGlow = scene.add.ellipse(offsetX + 1420, 392, 260, 190, palette.accent, 0.04).setDepth(4);

  for (let index = 0; index < 10; index += 1) {
    const drip = scene.add.rectangle(
      offsetX + 160 + index * 160,
      156 + (index % 3) * 18,
      3,
      48 + (index % 4) * 12,
      palette.haze,
      0.12
    ).setDepth(5);
    drip.speed = 0.8 + index * 0.08;
    drip.baseY = drip.y;
    scene.undergroundDrips.push(drip);
  }

  for (let index = 0; index < 6; index += 1) {
    const haze = scene.add.ellipse(
      offsetX + 320 + index * 200,
      544 + (index % 2) * 10,
      90 + index * 12,
      26,
      palette.haze,
      0.028
    ).setDepth(6);
    haze.baseX = haze.x;
    haze.baseY = haze.y;
    haze.phase = index * 0.52;
    scene.undergroundMist.push(haze);
  }
}

function buildPierZone(scene, offsetX, width) {
  const palette = REGION_PALETTE.pier;
  const centerX = offsetX + width * 0.5;

  scene.add.rectangle(centerX, 144, width, 300, palette.ceiling, 0.94);
  scene.add.rectangle(centerX, 226, width, 210, palette.wall, 0.42);
  scene.add.polygon(offsetX + 460, 450, [0, 160, 180, 48, 390, 174, 700, 64, 880, 188, 880, 320, 0, 320], 0x173240, 0.88);
  scene.add.polygon(offsetX + 1240, 458, [0, 180, 190, 60, 450, 184, 840, 76, 1060, 216, 1060, 320, 0, 320], 0x102837, 0.92);
  scene.add.rectangle(centerX, 654, width, 138, 0x082030, 1);
  scene.add.rectangle(centerX, 630, width, 40, 0x175a72, 0.3);

  for (let index = 0; index < 5; index += 1) {
    const band = scene.add.rectangle(offsetX + 200 + index * 320, 640 + (index % 2) * 10, 240, 5, palette.haze, 0.12);
    band.speed = 12 + index * 2;
    band.baseWidth = band.width;
    band.zoneOffset = offsetX;
    band.zoneWidth = width;
    scene.undergroundWaveBands.push(band);
  }

  for (let index = 0; index < 10; index += 1) {
    const streak = scene.add.rectangle(
      offsetX + 120 + Math.random() * (width - 240),
      142 + Math.random() * 320,
      2,
      42 + Math.random() * 16,
      0xd7edf3,
      0.14
    ).setAngle(18).setDepth(4);
    streak.speed = 5 + Math.random() * 2;
    streak.resetY = 118 + Math.random() * 40;
    scene.undergroundDrips.push({ __pierRain: true, streak });
  }
}

function buildBayZone(scene, offsetX, width) {
  const palette = REGION_PALETTE.bay;
  const centerX = offsetX + width * 0.5;

  scene.add.rectangle(centerX, 146, width, 280, palette.ceiling, 0.94);
  scene.add.rectangle(centerX, 230, width, 200, palette.wall, 0.4);
  scene.add.polygon(offsetX + 460, 454, [0, 168, 180, 48, 430, 182, 760, 70, 980, 220, 980, 320, 0, 320], 0x153240, 0.94);
  scene.add.polygon(offsetX + 1240, 462, [0, 178, 160, 54, 360, 176, 720, 70, 900, 212, 900, 320, 0, 320], 0x122b39, 0.96);
  scene.add.rectangle(centerX, 654, width, 132, 0x08202d, 1);
  scene.add.rectangle(centerX, 632, width, 36, 0x1a657f, 0.3);

  for (let index = 0; index < 4; index += 1) {
    const band = scene.add.rectangle(offsetX + 200 + index * 420, 640 + (index % 2) * 8, 260, 5, palette.haze, 0.1);
    band.speed = 10 + index * 1.6;
    band.baseWidth = band.width;
    band.zoneOffset = offsetX;
    band.zoneWidth = width;
    scene.undergroundWaveBands.push(band);
  }

  for (let index = 0; index < 3; index += 1) {
    const emberGlow = scene.add.circle(offsetX + 1048 + index * 6, 564 + index * 2, 24 + index * 8, palette.accent, 0.03).setDepth(7);
    emberGlow.phase = index * 0.8;
    scene.undergroundFireGlow.push(emberGlow);
  }
}

function createUndergroundGates(scene) {
  // Visual markers where zones meet (stone arches).
  const gates = [
    { x: 1800, color: 0x2a353d, accent: 0xd8ba74 },
    { x: 3600, color: 0x2a303a, accent: 0xb0dce3 },
    { x: 5400, color: 0x243844, accent: 0xc8844a },
  ];
  gates.forEach(({ x, color, accent }) => {
    const arch = scene.add.container(x, 400).setDepth(3);
    arch.add([
      scene.add.rectangle(0, 120, 16, 360, color, 0.9),
      scene.add.rectangle(-40, 0, 22, 12, color, 0.8),
      scene.add.rectangle(40, 0, 22, 12, color, 0.8),
      scene.add.rectangle(0, -120, 220, 16, color, 0.88),
      scene.add.rectangle(0, -118, 180, 4, accent, 0.22),
    ]);
  });
}

function createUndergroundProps(scene) {
  // Service props (offset 0)
  scene.add.container(948, 552).setDepth(8).add([
    scene.add.ellipse(0, 28, 136, 20, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 76, 46, 0x775f47, 1).setStrokeStyle(3, 0xd7c59c, 0.2),
    scene.add.rectangle(-18, 0, 5, 46, 0x4a3727, 1),
    scene.add.rectangle(10, -8, 30, 14, 0xb8b0a4, 1).setAngle(-8),
    scene.add.rectangle(12, -8, 16, 3, 0x31414d, 1).setAngle(-8),
  ]);

  const serviceHatch = scene.add.container(1112, 560).setDepth(8);
  serviceHatch.add([
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

  scene.sealedDoorVisual = scene.add.container(1678, 516).setDepth(8);
  scene.sealedDoorVisual.add([
    scene.add.ellipse(0, 74, 96, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 62, 170, 0x3b3028, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.rectangle(0, -12, 46, 38, 0x20262c, 1).setStrokeStyle(2, 0x8ea4af, 0.22),
    scene.add.line(0, 0, -18, 4, 18, 4, 0xe0c27d, 1).setStrokeStyle(4, 0xe0c27d, 1),
    scene.add.rectangle(-28, -40, 18, 54, 0x4a4138, 1).setStrokeStyle(2, 0xd2b47b, 0.18),
  ]);

  const valvePanel = scene.add.container(1221, 533).setDepth(8);
  valvePanel.add([
    scene.add.ellipse(0, 50, 114, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 90, 90, 0x2d3d46, 1).setStrokeStyle(3, 0x87d3df, 0.3),
    scene.add.rectangle(0, 4, 68, 60, 0x111b22, 1),
    scene.add.circle(-22, -2, 11, 0x3a4f5e, 1).setStrokeStyle(3, 0x87d3df, 0.65),
    scene.add.circle(0, -2, 11, 0x3a4f5e, 1).setStrokeStyle(3, 0x87d3df, 0.35),
    scene.add.circle(22, -2, 11, 0x3a4f5e, 1).setStrokeStyle(3, 0x87d3df, 0.35),
    scene.add.rectangle(-22, -10, 2, 18, 0x87d3df, 0.7),
    scene.add.rectangle(-30, -2, 18, 2, 0x87d3df, 0.7),
    scene.add.rectangle(0, -10, 2, 18, 0x87d3df, 0.28),
    scene.add.rectangle(-8, -2, 18, 2, 0x87d3df, 0.28),
    scene.add.rectangle(22, -10, 2, 18, 0x87d3df, 0.28),
    scene.add.rectangle(14, -2, 18, 2, 0x87d3df, 0.28),
    scene.add.rectangle(0, 28, 68, 18, 0x0c1318, 1),
    scene.add.text(-22, 28, 'А', { fontFamily: 'monospace', fontSize: '11px', color: '#87d3df' }).setOrigin(0.5),
    scene.add.text(0, 28, 'Б', { fontFamily: 'monospace', fontSize: '11px', color: '#87d3df' }).setOrigin(0.5),
    scene.add.text(22, 28, 'В', { fontFamily: 'monospace', fontSize: '11px', color: '#87d3df' }).setOrigin(0.5),
  ]);

  // Tunnel props (offset 1800)
  const tunnelOffset = 1800;
  scene.add.container(tunnelOffset + 980, 550).setDepth(8).add([
    scene.add.ellipse(0, 28, 124, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 72, 52, 0x58656b, 1).setStrokeStyle(3, 0xc9b07c, 0.2),
    scene.add.rectangle(0, -4, 38, 8, 0x202932, 1),
    scene.add.rectangle(-18, -12, 12, 18, 0x31404a, 1),
    scene.add.rectangle(18, -12, 12, 18, 0x31404a, 1),
  ]);

  const signal = scene.add.container(tunnelOffset + 1412, 516).setDepth(8);
  signal.add([
    scene.add.ellipse(0, 48, 148, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 98, 92, 0x304048, 1).setStrokeStyle(3, 0xe1bb73, 0.2),
    scene.add.rectangle(0, -12, 48, 24, 0x131c21, 1),
    scene.add.circle(24, 12, 6, 0x9fe0eb, 0.82),
    scene.add.rectangle(-18, 14, 20, 6, 0x6a808a, 1),
    scene.add.rectangle(0, 14, 20, 6, 0x6a808a, 1),
  ]);
  scene.signalGlow = scene.add.circle(tunnelOffset + 1436, 528, 28, 0x9fe0eb, 0.1).setDepth(7);

  scene.tunnelExitVisual = scene.add.container(tunnelOffset + 1692, 520).setDepth(8);
  scene.tunnelExitVisual.add([
    scene.add.ellipse(0, 70, 100, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 66, 168, 0x3a312a, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.circle(12, 8, 5, 0xe0c27d, 1),
    scene.add.rectangle(-30, -38, 18, 56, 0x4b4036, 1).setStrokeStyle(2, 0xd2b47b, 0.16),
  ]);

  const cipherLock = scene.add.container(tunnelOffset + 1275, 524).setDepth(8);
  cipherLock.add([
    scene.add.ellipse(0, 56, 92, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 78, 106, 0x2a3540, 1).setStrokeStyle(3, 0xe0c27d, 0.26),
    scene.add.rectangle(0, -14, 58, 58, 0x0e1620, 1),
    scene.add.circle(-17, -14, 12, 0x3a4550, 1).setStrokeStyle(2, 0xe0c27d, 0.5),
    scene.add.circle(0, -14, 12, 0x3a4550, 1).setStrokeStyle(2, 0xe0c27d, 0.5),
    scene.add.circle(17, -14, 12, 0x3a4550, 1).setStrokeStyle(2, 0xe0c27d, 0.5),
    scene.add.rectangle(-17, -24, 2, 7, 0xe0c27d, 0.6),
    scene.add.rectangle(0, -24, 2, 7, 0xe0c27d, 0.6),
    scene.add.rectangle(17, -24, 2, 7, 0xe0c27d, 0.6),
    scene.add.rectangle(0, 30, 58, 16, 0x080f14, 1),
    scene.add.text(0, 30, 'III · VII · I', { fontFamily: 'monospace', fontSize: '8px', color: '#e0c27d' }).setOrigin(0.5).setAlpha(0.55),
    scene.add.circle(0, 42, 5, 0x050b10, 1).setStrokeStyle(2, 0xe0c27d, 0.4),
  ]);

  // Pier props (offset 3600)
  const pierOffset = 3600;
  scene.add.container(pierOffset + 935, 564).setDepth(8).add([
    scene.add.ellipse(0, 20, 180, 24, 0x000000, 0.2),
    scene.add.ellipse(0, 0, 130, 36, 0x5f6f7a, 1).setStrokeStyle(3, 0xc9d8de, 0.2),
    scene.add.rectangle(-28, -2, 32, 10, 0x2a353c, 1),
    scene.add.rectangle(38, 6, 42, 10, 0x7b5f44, 1),
  ]);

  scene.add.container(pierOffset + 1336, 520).setDepth(8).add([
    scene.add.ellipse(0, 70, 120, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 34, 130, 0x4b5d68, 1),
    scene.add.circle(0, -18, 24, 0x24323a, 0).setStrokeStyle(4, 0xcab07c, 1),
  ]);

  scene.seaGateVisual = scene.add.container(pierOffset + 1693, 520).setDepth(8);
  scene.seaGateVisual.add([
    scene.add.ellipse(0, 70, 96, 16, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 62, 164, 0x3a312a, 1).setStrokeStyle(3, 0xd2b47b, 0.2),
    scene.add.line(0, 0, -16, 0, 16, 0, 0xe0c27d, 1).setStrokeStyle(4, 0xe0c27d, 1),
  ]);
  scene.gateGlow = scene.add.circle(pierOffset + 1724, 510, 18, 0x91cad8, 0.04).setDepth(7);

  // Bay props (offset 5400)
  const bayOffset = 5400;
  scene.add.container(bayOffset + 1048, 568).setDepth(8).add([
    scene.add.ellipse(0, 16, 90, 16, 0x000000, 0.18),
    scene.add.circle(0, 0, 18, 0x5c4939, 1),
    scene.add.rectangle(-16, 4, 16, 8, 0x7f5d42, 1).setAngle(-30),
    scene.add.rectangle(16, 6, 18, 8, 0x7f5d42, 1).setAngle(24),
  ]);

  scene.add.container(bayOffset + 1288, 548).setDepth(8).add([
    scene.add.ellipse(0, 36, 154, 22, 0x000000, 0.18),
    scene.add.triangle(-18, -20, 0, 0, 90, 0, 45, -90, 0x6d8270, 0.8),
    scene.add.rectangle(12, 8, 86, 52, 0x6c533d, 1).setStrokeStyle(3, 0xd7c59c, 0.18),
  ]);

  for (let index = 0; index < 4; index += 1) {
    scene.add.ellipse(bayOffset + 1572 + index * 18, 566 + (index % 2) * 8, 16, 8, 0x1a1f22, 0.46).setAngle(-18).setDepth(8);
  }

  const nauticalChart = scene.add.container(bayOffset + 1404, 516).setDepth(8);
  nauticalChart.add([
    scene.add.ellipse(0, 46, 118, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 102, 96, 0x5a4230, 1).setStrokeStyle(3, 0xd2b47b, 0.3),
    scene.add.rectangle(0, -2, 84, 76, 0xd4c59c, 0.12),
    scene.add.rectangle(-18, -18, 34, 3, 0xb89a68, 0.38).setAngle(14),
    scene.add.rectangle(10, -9, 22, 3, 0xb89a68, 0.3).setAngle(-9),
    scene.add.rectangle(-8, 6, 28, 3, 0xb89a68, 0.32).setAngle(18),
    scene.add.rectangle(16, 18, 18, 3, 0xb89a68, 0.28).setAngle(-11),
    scene.add.circle(30, -22, 5, 0x000000, 0).setStrokeStyle(2, 0xd2b47b, 0.58),
    scene.add.rectangle(30, -26, 2, 8, 0xd2b47b, 0.58),
    scene.add.rectangle(26, -22, 8, 2, 0xd2b47b, 0.58),
    scene.add.rectangle(0, 36, 84, 12, 0x3a2a1a, 0.55),
    scene.add.text(0, 36, 'КАРТА', { fontFamily: 'Georgia, serif', fontSize: '8px', color: '#d2b47b' }).setOrigin(0.5).setAlpha(0.65),
  ]);
}

function createRegionSignage(scene) {
  // Dim zone labels floating above each zone — subtle ambient guidance.
  const signs = [
    { x: 900, label: "Служебный уровень" },
    { x: 2700, label: "Восточный тоннель" },
    { x: 4500, label: "Нижняя пристань" },
    { x: 6300, label: "Скрытая бухта" },
  ];
  signs.forEach(({ x, label }) => {
    scene.add.text(x, 224, label, {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#6e7b84",
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0.38).setDepth(4);
  });
}

function createAmbientLayers(scene) {
  // Additional low-frequency ambient that spans the whole world.
  scene.add.rectangle(UNDERGROUND_WORLD_WIDTH * 0.5, 654, UNDERGROUND_WORLD_WIDTH, 4, 0xdbc389, 0.04).setDepth(4);
}

export function createUndergroundGround(scene) {
  scene.physics.world.setBounds(0, 0, UNDERGROUND_WORLD_WIDTH, PREVIEW_WORLD_HEIGHT);
  scene.platforms = scene.physics.add.staticGroup();
  const ground = scene.add.rectangle(
    UNDERGROUND_WORLD_WIDTH * 0.5,
    PREVIEW_GROUND_Y + 60,
    UNDERGROUND_WORLD_WIDTH,
    120,
    0x39464a,
    0
  );
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);

  scene.undergroundBarriers = {};
  const barrierData = [
    { id: "service-tunnel", x: 1800 },
    { id: "tunnel-pier", x: 3600 },
    { id: "pier-bay", x: 5400 },
  ];
  barrierData.forEach(({ id, x }) => {
    const wall = scene.add.rectangle(x, 380, 24, 460, 0x000000, 0);
    scene.physics.add.existing(wall, true);
    scene.platforms.add(wall);
    scene.undergroundBarriers[id] = wall;
  });
}

export function updateUndergroundAmbient(scene, time) {
  for (const mote of scene.undergroundDust) {
    mote.x += mote.speedX;
    mote.y += mote.speedY + Math.sin(time * 0.0011 + mote.phase) * 0.08;
    if (mote.y > 560) {
      mote.y = 176;
    }
    if (mote.x < mote.xMin) {
      mote.x = mote.xMax;
    }
    if (mote.x > mote.xMax) {
      mote.x = mote.xMin;
    }
  }

  for (const drip of scene.undergroundDrips) {
    if (drip.__pierRain) {
      drip.streak.y += drip.streak.speed;
      if (drip.streak.y > 496) {
        drip.streak.y = drip.streak.resetY;
      }
      continue;
    }
    drip.y = drip.baseY + Math.sin(time * 0.0018 + drip.speed) * 9;
    drip.alpha = 0.08 + Math.sin(time * 0.0022 + drip.speed) * 0.05;
  }

  for (const haze of scene.undergroundMist) {
    haze.x = haze.baseX + Math.sin(time * 0.0012 + haze.phase) * 18;
    haze.y = haze.baseY - Math.abs(Math.sin(time * 0.0016 + haze.phase)) * 7;
    haze.alpha = 0.02 + Math.sin(time * 0.0014 + haze.phase) * 0.015 + 0.022;
  }

  for (const band of scene.undergroundWaveBands) {
    band.x += band.speed * 0.016;
    band.alpha = 0.06 + Math.sin(time * 0.0012 + band.speed) * 0.04;
    band.width = band.baseWidth + Math.sin(time * 0.0017 + band.speed) * 18;
    if (band.x > band.zoneOffset + band.zoneWidth + 120) {
      band.x = band.zoneOffset - 120;
    }
  }

  scene.undergroundFireGlow.forEach((glow) => {
    glow.alpha = 0.018 + Math.sin(time * 0.003 + glow.phase) * 0.02 + 0.02;
    glow.scaleX = 1 + Math.sin(time * 0.002 + glow.phase) * 0.06;
    glow.scaleY = 1 + Math.sin(time * 0.002 + glow.phase) * 0.06;
  });

  if (scene.consoleGlow) {
    scene.consoleGlow.alpha = 0.06 + Math.sin(time * 0.0021) * 0.035;
  }
  if (scene.signalGlow) {
    scene.signalGlow.alpha = 0.08 + Math.sin(time * 0.003) * 0.06;
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
  if (scene.tunnelLeftGlow) {
    scene.tunnelLeftGlow.alpha = 0.03 + Math.sin(time * 0.0017) * 0.02;
  }
  if (scene.tunnelRightGlow) {
    scene.tunnelRightGlow.alpha = 0.03 + Math.sin(time * 0.0021) * 0.02;
  }
  if (scene.gateGlow) {
    scene.gateGlow.alpha = 0.04 + Math.sin(time * 0.0023) * 0.03;
  }
}

export function dropUndergroundBarrier(scene, barrierId) {
  const barrier = scene.undergroundBarriers?.[barrierId];
  if (!barrier) {
    return;
  }
  barrier.body?.destroy?.();
  barrier.destroy();
  delete scene.undergroundBarriers[barrierId];
}
