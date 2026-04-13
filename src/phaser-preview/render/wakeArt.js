import {
  GROUND_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  wakeRoomVisual,
} from "../data/wakeData.js";

const Phaser = window.Phaser;

export function buildWakeEnvironment(scene) {
  scene.dustMotes = [];
  scene.windowRain = [];
  scene.windowHighlights = [];
  createBackdrop(scene);
  createRoomShell(scene);
  createAmbientFx(scene);
  createSetDressing(scene);
}

export function createWakeGround(scene) {
  scene.physics.world.setBounds(
    wakeRoomVisual.innerX,
    0,
    wakeRoomVisual.innerWidth,
    WORLD_HEIGHT
  );
  scene.platforms = scene.physics.add.staticGroup();

  const ground = scene.add.rectangle(
    wakeRoomVisual.innerX + wakeRoomVisual.innerWidth * 0.5,
    GROUND_Y + 60,
    wakeRoomVisual.innerWidth,
    120,
    0x3a474b,
    0
  );
  scene.physics.add.existing(ground, true);
  scene.platforms.add(ground);
}

export function createWakePlayer(scene) {
  scene.playerBody = scene.add.rectangle(860, GROUND_Y - 60, 34, 78, 0x000000, 0);
  scene.physics.add.existing(scene.playerBody);
  scene.playerBody.body.setSize(34, 78);
  scene.playerBody.body.setCollideWorldBounds(true);
  scene.playerBody.body.setDragX(1600);
  scene.playerBody.body.setMaxVelocity(420, 1200);
  scene.physics.add.collider(scene.playerBody, scene.platforms);

  scene.playerShadow = scene.add.ellipse(scene.playerBody.x, GROUND_Y + 10, 42, 14, 0x000000, 0.28).setDepth(9);
  scene.playerVisual = scene.add.container(scene.playerBody.x, scene.playerBody.y + 2).setDepth(10);
  scene.playerOutline = scene.add.container(scene.playerBody.x, scene.playerBody.y + 2).setDepth(9.5);
  const outlineHead = scene.add.rectangle(0, -24, 32, 34, 0xe7f0f4, 0.08);
  const outlineCoat = scene.add.rectangle(0, 4, 44, 50, 0xe7f0f4, 0.08);
  const outlineLegLeft = scene.add.rectangle(-8, 40, 12, 28, 0xe7f0f4, 0.08);
  const outlineLegRight = scene.add.rectangle(8, 40, 12, 28, 0xe7f0f4, 0.08);
  scene.playerOutline.add([outlineHead, outlineCoat, outlineLegLeft, outlineLegRight]);
  scene.playerHead = scene.add.rectangle(0, -24, 28, 30, 0xd9b48e, 1);
  scene.playerCoat = scene.add.rectangle(0, 4, 38, 44, 0x385364, 1);
  scene.playerScarf = scene.add.rectangle(0, -2, 24, 8, 0xd6b06a, 1);
  scene.playerLegLeft = scene.add.rectangle(-8, 40, 10, 24, 0x6f4d38, 1);
  scene.playerLegRight = scene.add.rectangle(8, 40, 10, 24, 0x6f4d38, 1);
  scene.playerVisual.add([scene.playerHead, scene.playerCoat, scene.playerScarf, scene.playerLegLeft, scene.playerLegRight]);
}

export function updateWakeAmbient(scene, time) {
  for (const mote of scene.dustMotes) {
    mote.x += mote.speedX;
    mote.y += mote.speedY + Math.sin(time * 0.001 + mote.phase) * 0.06;

    if (mote.y > wakeRoomVisual.innerY + wakeRoomVisual.innerHeight - 24) {
      mote.y = wakeRoomVisual.innerY + 26;
    }

    if (mote.x < wakeRoomVisual.innerX + 24) {
      mote.x = wakeRoomVisual.innerX + wakeRoomVisual.innerWidth - 24;
    }

    if (mote.x > wakeRoomVisual.innerX + wakeRoomVisual.innerWidth - 24) {
      mote.x = wakeRoomVisual.innerX + 24;
    }

    mote.alpha = 0.06 + Math.sin(time * 0.0014 + mote.phase) * 0.03 + 0.06;
  }

  for (const rain of scene.windowRain) {
    rain.y += rain.speed;
    if (rain.y > rain.windowY + rain.windowHeight * 0.5 + 18) {
      rain.y = rain.windowY - rain.windowHeight * 0.5 - 18;
    }
  }

  for (const [index, band] of scene.waveBands.entries()) {
    band.x += band.speed * 0.016;
    band.alpha = 0.08 + Math.sin(time * 0.0013 + index) * 0.04;
    band.width = band.baseWidth + Math.sin(time * 0.0018 + index) * 18;
    if (band.x > WORLD_WIDTH + 160) {
      band.x = -160;
    }
  }

  if (scene.lampBody) {
    scene.lampBody.rotation = Math.sin(time * 0.0012) * 0.018;
    scene.lampCable.rotation = Math.sin(time * 0.0012) * 0.01;
  }

  scene.windowHighlights.forEach((highlight, index) => {
    highlight.alpha = 0.03 + Math.sin(time * 0.0011 + index) * 0.02 + 0.03;
  });
}

export function updateWakePlayerVisuals(scene) {
  scene.playerOutline.setPosition(scene.playerBody.x, scene.playerBody.y + 2);
  scene.playerVisual.setPosition(scene.playerBody.x, scene.playerBody.y + 2);
  scene.playerShadow.setPosition(scene.playerBody.x, GROUND_Y + 10);

  const velocityX = scene.playerBody.body.velocity.x;
  if (Math.abs(velocityX) > 4) {
    scene.playerOutline.scaleX = velocityX > 0 ? 1 : -1;
    scene.playerVisual.scaleX = velocityX > 0 ? 1 : -1;
  }

  const walkCycle = scene.time.now * 0.014;
  const stride = Math.abs(velocityX) > 18 ? Math.sin(walkCycle) * 8 : 0;
  const bob = Math.abs(velocityX) > 18 ? Math.abs(Math.sin(walkCycle)) * 3 : 0;

  scene.playerHead.y = -24 - bob;
  scene.playerCoat.y = 4 - bob * 0.35;
  scene.playerScarf.y = -2 - bob * 0.16;
  scene.playerLegLeft.rotation = Phaser.Math.DegToRad(stride);
  scene.playerLegRight.rotation = Phaser.Math.DegToRad(-stride);
  scene.playerShadow.scaleX = 1 - bob * 0.01;
  scene.playerShadow.alpha = 0.22 + Math.abs(stride) * 0.003;
}

export function createItemIcon(scene, itemId, x, y, kind = "inventory") {
  const icon = scene.add.container(x, y);

  if (itemId === "battery") {
    icon.add([
      scene.add.rectangle(0, 0, kind === "inventory" ? 18 : 30, kind === "inventory" ? 30 : 48, 0x49677d, 1)
        .setStrokeStyle(2, 0xd7c17b, 0.44),
      scene.add.rectangle(0, kind === "inventory" ? -16 : -26, kind === "inventory" ? 8 : 10, kind === "inventory" ? 4 : 6, 0xd7c17b, 1),
      scene.add.rectangle(0, 0, kind === "inventory" ? 8 : 12, kind === "inventory" ? 16 : 22, 0x233039, 0.62),
    ]);
  } else if (itemId === "note") {
    icon.add([
      scene.add.rectangle(0, 0, kind === "inventory" ? 22 : 36, kind === "inventory" ? 28 : 46, 0xd9d2bf, 1)
        .setStrokeStyle(2, 0x7a6a56, 0.4),
      scene.add.rectangle(0, kind === "inventory" ? -6 : -10, kind === "inventory" ? 12 : 18, 2, 0x8d7d69, 1),
      scene.add.rectangle(0, kind === "inventory" ? 0 : -2, kind === "inventory" ? 12 : 18, 2, 0x8d7d69, 1),
      scene.add.rectangle(0, kind === "inventory" ? 6 : 6, kind === "inventory" ? 12 : 18, 2, 0x8d7d69, 1),
    ]);
  } else if (itemId === "screwdriver") {
    icon.add([
      scene.add.rectangle(kind === "inventory" ? 4 : 8, 0, kind === "inventory" ? 26 : 56, kind === "inventory" ? 5 : 6, 0x61788a, 1),
      scene.add.rectangle(kind === "inventory" ? 14 : 34, 0, kind === "inventory" ? 8 : 14, kind === "inventory" ? 3 : 4, 0xd7b76e, 1),
      scene.add.rectangle(kind === "inventory" ? -10 : -18, 0, kind === "inventory" ? 12 : 18, kind === "inventory" ? 9 : 14, 0x855a40, 1),
    ]);
  } else if (itemId === "fuse") {
    icon.add([
      scene.add.rectangle(0, 0, kind === "inventory" ? 24 : 42, kind === "inventory" ? 10 : 16, 0xcfd7de, 1)
        .setStrokeStyle(2, 0x6c808d, 0.4),
      scene.add.rectangle(kind === "inventory" ? -10 : -18, 0, kind === "inventory" ? 4 : 8, kind === "inventory" ? 16 : 22, 0x9ab1bd, 1),
      scene.add.rectangle(kind === "inventory" ? 10 : 18, 0, kind === "inventory" ? 4 : 8, kind === "inventory" ? 16 : 22, 0x9ab1bd, 1),
    ]);
  } else if (itemId === "valveWheel") {
    const radius = kind === "inventory" ? 14 : 24;
    icon.add([
      scene.add.circle(0, 0, radius, 0x8b6b48, 0).setStrokeStyle(4, 0xc39d68, 1),
      scene.add.circle(0, 0, kind === "inventory" ? 4 : 7, 0xc39d68, 1),
      scene.add.rectangle(0, 0, kind === "inventory" ? 4 : 6, radius * 1.6, 0xc39d68, 1),
      scene.add.rectangle(0, 0, radius * 1.6, kind === "inventory" ? 4 : 6, 0xc39d68, 1),
    ]);
  } else if (itemId === "logbook") {
    icon.add([
      scene.add.rectangle(0, 0, kind === "inventory" ? 22 : 36, kind === "inventory" ? 28 : 44, 0x7b5f44, 1)
        .setStrokeStyle(2, 0xdbc398, 0.28),
      scene.add.rectangle(kind === "inventory" ? -7 : -12, 0, kind === "inventory" ? 4 : 6, kind === "inventory" ? 28 : 44, 0x4b3727, 1),
      scene.add.rectangle(kind === "inventory" ? 3 : 6, kind === "inventory" ? -6 : -10, kind === "inventory" ? 10 : 16, 2, 0xd8ccb9, 1),
      scene.add.rectangle(kind === "inventory" ? 3 : 6, kind === "inventory" ? 0 : 0, kind === "inventory" ? 10 : 16, 2, 0xd8ccb9, 1),
    ]);
  } else if (itemId === "serviceKey") {
    icon.add([
      scene.add.circle(kind === "inventory" ? -6 : -10, 0, kind === "inventory" ? 7 : 11, 0xc8b178, 0).setStrokeStyle(3, 0xc8b178, 1),
      scene.add.rectangle(kind === "inventory" ? 8 : 16, 0, kind === "inventory" ? 22 : 34, kind === "inventory" ? 5 : 7, 0xc8b178, 1),
      scene.add.rectangle(kind === "inventory" ? 16 : 26, kind === "inventory" ? -4 : -6, kind === "inventory" ? 4 : 6, kind === "inventory" ? 8 : 10, 0xc8b178, 1),
      scene.add.rectangle(kind === "inventory" ? 20 : 32, kind === "inventory" ? 2 : 4, kind === "inventory" ? 4 : 6, kind === "inventory" ? 8 : 10, 0xc8b178, 1),
    ]);
  } else if (itemId === "boatHook") {
    icon.add([
      scene.add.rectangle(kind === "inventory" ? -2 : -4, 0, kind === "inventory" ? 28 : 48, kind === "inventory" ? 5 : 6, 0x875c42, 1)
        .setAngle(-24),
      scene.add.arc(kind === "inventory" ? 12 : 22, kind === "inventory" ? -10 : -18, kind === "inventory" ? 9 : 15, 210, 20, false, 0xa1bac6, 1)
        .setStrokeStyle(kind === "inventory" ? 3 : 4, 0xa1bac6, 1),
    ]);
  }

  return icon;
}

function createBackdrop(scene) {
  scene.add.rectangle(WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.5, WORLD_WIDTH, WORLD_HEIGHT, 0x050b11);
  scene.add.ellipse(1180, 120, 840, 320, 0x567b98, 0.08);
  scene.add.rectangle(WORLD_WIDTH * 0.5, 168, WORLD_WIDTH, 450, 0x0d2232, 0.98);
  scene.add.rectangle(WORLD_WIDTH * 0.5, 252, WORLD_WIDTH, 320, 0x153449, 0.58);
  scene.add.rectangle(WORLD_WIDTH * 0.5, 322, WORLD_WIDTH, 160, 0x204f67, 0.12);
  scene.add.ellipse(1640, 146, 1080, 220, 0x88b2c4, 0.04);
  scene.add.polygon(880, 474, [0, 126, 180, 16, 364, 120, 560, 54, 760, 132, 760, 250, 0, 250], 0x102536, 0.96);
  scene.add.polygon(1740, 468, [0, 150, 146, 24, 308, 116, 498, 46, 690, 132, 690, 252, 0, 252], 0x132d40, 0.9);
  scene.add.polygon(2520, 488, [0, 166, 206, 32, 438, 146, 758, 52, 1002, 168, 1002, 268, 0, 268], 0x0f2231, 0.92);
  scene.add.rectangle(WORLD_WIDTH * 0.5, 646, WORLD_WIDTH, 40, 0x14394e, 0.36);
  scene.add.rectangle(WORLD_WIDTH * 0.5, 674, WORLD_WIDTH, 110, 0x081c2a, 0.98);
  scene.add.rectangle(WORLD_WIDTH * 0.5, 622, WORLD_WIDTH, 12, 0x88b8c8, 0.14);

  scene.waveBands = Array.from({ length: 11 }, (_, index) => {
    const band = scene.add.rectangle(180 + index * 320, 638 + (index % 3) * 10, 220, 4, 0xa7d4dc, 0.12);
    band.speed = 9 + index * 1.6;
    band.baseWidth = band.width;
    return band;
  });
}

function createRoomShell(scene) {
  const roomCenterX = wakeRoomVisual.outerX + wakeRoomVisual.outerWidth * 0.5;
  const roomCenterY = wakeRoomVisual.outerY + wakeRoomVisual.outerHeight * 0.5;

  scene.add.ellipse(roomCenterX, wakeRoomVisual.outerY + wakeRoomVisual.outerHeight + 18, 1300, 80, 0x000000, 0.26);

  const outer = scene.add.rectangle(
    roomCenterX,
    roomCenterY,
    wakeRoomVisual.outerWidth,
    wakeRoomVisual.outerHeight,
    0x261d18,
    1
  ).setStrokeStyle(6, 0x16110d, 0.82);

  const inner = scene.add.rectangle(
    wakeRoomVisual.innerX + wakeRoomVisual.innerWidth * 0.5,
    wakeRoomVisual.innerY + wakeRoomVisual.innerHeight * 0.5,
    wakeRoomVisual.innerWidth,
    wakeRoomVisual.innerHeight,
    0x665544,
    1
  ).setStrokeStyle(2, 0x291f18, 0.36);

  const dampWash = scene.add.rectangle(roomCenterX, wakeRoomVisual.innerY + 118, wakeRoomVisual.innerWidth, 188, 0x85735f, 0.12);
  const ceilingShadow = scene.add.rectangle(roomCenterX, wakeRoomVisual.innerY + 24, wakeRoomVisual.innerWidth, 42, 0x221a14, 0.42);
  const sideVignetteLeft = scene.add.rectangle(wakeRoomVisual.innerX + 42, roomCenterY, 84, wakeRoomVisual.innerHeight, 0x120f0d, 0.26);
  const sideVignetteRight = scene.add.rectangle(wakeRoomVisual.innerX + wakeRoomVisual.innerWidth - 42, roomCenterY, 84, wakeRoomVisual.innerHeight, 0x120f0d, 0.26);
  const floor = scene.add.rectangle(roomCenterX, wakeRoomVisual.floorY, wakeRoomVisual.innerWidth, wakeRoomVisual.floorHeight, 0x2b3033, 1);
  const floorFront = scene.add.rectangle(roomCenterX, wakeRoomVisual.floorY + 18, wakeRoomVisual.innerWidth, 20, 0x1c2124, 0.92);
  const trim = scene.add.rectangle(roomCenterX, wakeRoomVisual.floorY - 18, wakeRoomVisual.innerWidth, 10, 0x40362d, 0.84);

  outer.setDepth(1);
  inner.setDepth(2);
  dampWash.setDepth(2);
  ceilingShadow.setDepth(3);
  sideVignetteLeft.setDepth(3);
  sideVignetteRight.setDepth(3);
  floor.setDepth(3);
  floorFront.setDepth(3);
  trim.setDepth(3);

  for (let index = 0; index < 12; index += 1) {
    const plank = scene.add.rectangle(
      wakeRoomVisual.innerX + 44 + index * 102,
      wakeRoomVisual.floorY,
      82,
      20,
      index % 2 === 0 ? 0x3d464a : 0x344044,
      0.48
    );
    plank.setDepth(4);
  }

  for (let index = 0; index < 3; index += 1) {
    const puddle = scene.add.ellipse(
      wakeRoomVisual.innerX + 280 + index * 250,
      wakeRoomVisual.floorY + 10 + (index % 2) * 4,
      118 + index * 24,
      18,
      0xa6cad4,
      0.06
    );
    puddle.setDepth(4);
  }

  createWindow(scene, wakeRoomVisual.innerX + 160, wakeRoomVisual.innerY + 82, 124, 148);
  createWindow(scene, wakeRoomVisual.innerX + wakeRoomVisual.innerWidth - 160, wakeRoomVisual.innerY + 82, 124, 148);
  createLamp(scene, roomCenterX - 180, wakeRoomVisual.innerY + 24);
  createWallShelf(scene, wakeRoomVisual.innerX + 286, wakeRoomVisual.innerY + 164);
  createDryingRack(scene, wakeRoomVisual.innerX + wakeRoomVisual.innerWidth - 284, wakeRoomVisual.innerY + 176);

  for (let index = 0; index < 6; index += 1) {
    const beam = scene.add.rectangle(
      wakeRoomVisual.innerX + 58 + index * 206,
      wakeRoomVisual.innerY + 184,
      18,
      wakeRoomVisual.innerHeight,
      0x433428,
      0.42
    );
    beam.setDepth(2);
  }
}

function createWindow(scene, x, y, width, height) {
  const frame = scene.add.rectangle(x, y, width + 18, height + 18, 0x3b2f26, 1).setStrokeStyle(3, 0x16110d, 0.62);
  const glass = scene.add.rectangle(x, y, width, height, 0x92cad8, 0.18).setStrokeStyle(2, 0xd2e4ea, 0.18);
  const crossV = scene.add.rectangle(x, y, 6, height, 0x3b2f26, 0.8);
  const crossH = scene.add.rectangle(x, y, width, 6, 0x3b2f26, 0.8);
  const glow = scene.add.ellipse(x, y, width + 160, height + 110, 0x9bc7d4, 0.05);
  const mist = scene.add.rectangle(x, y, width - 10, height - 10, 0xd2e4ea, 0.05);

  frame.setDepth(4);
  glass.setDepth(3);
  crossV.setDepth(5);
  crossH.setDepth(5);
  glow.setDepth(2);
  mist.setDepth(4);

  scene.windowHighlights.push(glow);

  for (let index = 0; index < 8; index += 1) {
    const rain = scene.add.rectangle(
      x - width * 0.4 + index * (width / 7),
      y - 26 + (index % 3) * 12,
      2,
      38,
      0xd8ecf2,
      0.18
    ).setAngle(18);
    rain.windowY = y;
    rain.windowHeight = height;
    rain.speed = 0.75 + index * 0.08;
    rain.setDepth(4);
    scene.windowRain.push(rain);
  }
}

function createLamp(scene, x, y) {
  scene.lampCable = scene.add.rectangle(x, y + 28, 4, 56, 0x1d1915, 1).setDepth(6);
  scene.lampBody = scene.add.container(x, y + 64).setDepth(6);
  const hood = scene.add.rectangle(0, 0, 78, 28, 0x40362d, 1).setStrokeStyle(2, 0x18130f, 0.5);
  const glass = scene.add.ellipse(0, 20, 56, 30, 0xe6c37d, 0.38);
  const glow = scene.add.ellipse(0, 86, 320, 190, 0xefc87f, 0.1);
  const halo = scene.add.ellipse(0, 22, 140, 74, 0xf5dca4, 0.14);
  scene.lampBody.add([glow, halo, hood, glass]);
}

function createAmbientFx(scene) {
  scene.dustMotes = Array.from({ length: 34 }, (_, index) => {
    const mote = scene.add.circle(
      wakeRoomVisual.innerX + 60 + Math.random() * (wakeRoomVisual.innerWidth - 120),
      wakeRoomVisual.innerY + 30 + Math.random() * (wakeRoomVisual.innerHeight - 120),
      1 + Math.random() * 2.5,
      0xf1dfb1,
      0.08 + Math.random() * 0.09
    );
    mote.speedX = -0.12 + Math.random() * 0.24;
    mote.speedY = 0.08 + Math.random() * 0.2;
    mote.phase = index * 0.7;
    mote.setDepth(5);
    return mote;
  });
}

function createSetDressing(scene) {
  createBed(scene, 878, GROUND_Y);
  createDesk(scene, 1208, GROUND_Y);
  createLeafPile(scene, 1482, GROUND_Y);
  createDoor(scene, 1968, GROUND_Y);
  createFootprints(scene, 1768, GROUND_Y);
  createLadder(scene, 1598, 458);
  createDeskExtras(scene, 1208, GROUND_Y);
  createTravelChest(scene, 1672, GROUND_Y);
  createWallHook(scene, 1786, 308);
}

function createBed(scene, x, groundY) {
  const bed = scene.add.container(x, groundY - 20).setDepth(7);
  const shadow = scene.add.ellipse(0, 26, 178, 22, 0x000000, 0.22);
  const frame = scene.add.rectangle(0, 4, 164, 36, 0x4d3a2d, 1).setStrokeStyle(3, 0x221813, 0.44);
  const pillow = scene.add.rectangle(-42, -18, 38, 20, 0xd9d6cb, 1);
  const mattress = scene.add.rectangle(0, -18, 148, 28, 0xb4b2a8, 1);
  const blanket = scene.add.rectangle(12, -12, 118, 22, 0x355565, 0.96).setAngle(-2);
  const blanketFold = scene.add.rectangle(40, -18, 42, 10, 0x588094, 0.42).setAngle(-2);
  bed.add([shadow, frame, mattress, pillow, blanket, blanketFold]);
}

function createDesk(scene, x, groundY) {
  const desk = scene.add.container(x, groundY - 46).setDepth(7);
  const shadow = scene.add.ellipse(0, 58, 228, 24, 0x000000, 0.22);
  const top = scene.add.rectangle(0, -18, 206, 18, 0x6a513f, 1).setStrokeStyle(3, 0x2a211b, 0.42);
  const topLip = scene.add.rectangle(0, -8, 198, 8, 0x4d3c30, 0.92);
  const leftSide = scene.add.rectangle(-84, 32, 18, 92, 0x46352a, 1);
  const rightSide = scene.add.rectangle(84, 32, 18, 92, 0x46352a, 1);
  const modesty = scene.add.rectangle(0, 36, 130, 18, 0x564334, 0.96);
  const lowerRail = scene.add.rectangle(0, 72, 166, 10, 0x4a392d, 0.92);
  const drawer = scene.add.rectangle(22, 14, 92, 48, 0x735a47, 1).setStrokeStyle(2, 0x2e241d, 0.42);
  const handle = scene.add.rectangle(22, 14, 24, 4, 0xdebf7a, 0.95);
  const footLeft = scene.add.rectangle(-84, 78, 22, 6, 0x2f241c, 0.95);
  const footRight = scene.add.rectangle(84, 78, 22, 6, 0x2f241c, 0.95);
  desk.add([shadow, top, topLip, leftSide, rightSide, modesty, lowerRail, drawer, handle, footLeft, footRight]);
}

function createDeskExtras(scene, x, groundY) {
  const props = scene.add.container(x - 2, groundY - 72).setDepth(8);
  const lantern = scene.add.container(-26, 0);
  lantern.add([
    scene.add.rectangle(0, 14, 28, 34, 0x3a4347, 1).setStrokeStyle(2, 0xe0c17b, 0.22),
    scene.add.ellipse(0, 6, 20, 18, 0xf1d08a, 0.18),
  ]);
  const book = scene.add.rectangle(24, 8, 42, 10, 0x50606d, 1).setAngle(8);
  const quill = scene.add.rectangle(54, -6, 26, 3, 0xd8d3c7, 0.95).setAngle(-20);
  props.add([lantern, book, quill]);
}

function createWallShelf(scene, x, y) {
  const shelf = scene.add.container(x, y).setDepth(6);
  const plank = scene.add.rectangle(0, 0, 132, 10, 0x503d31, 1).setStrokeStyle(2, 0x241b15, 0.34);
  const jarA = scene.add.rectangle(-34, -12, 18, 24, 0x60717a, 0.86);
  const jarB = scene.add.rectangle(6, -12, 14, 20, 0x9b8768, 0.86);
  const tin = scene.add.rectangle(36, -10, 22, 18, 0x4d5d66, 0.9);
  shelf.add([plank, jarA, jarB, tin]);
}

function createDryingRack(scene, x, y) {
  const rack = scene.add.container(x, y).setDepth(5);
  const rail = scene.add.rectangle(0, 0, 108, 6, 0x5b4738, 1);
  const ropeA = scene.add.rectangle(-22, 20, 3, 42, 0x8a7d67, 0.9);
  const ropeB = scene.add.rectangle(24, 18, 3, 36, 0x8a7d67, 0.9);
  const coat = scene.add.rectangle(-22, 44, 34, 40, 0x32485a, 0.84);
  const cloth = scene.add.rectangle(24, 38, 28, 28, 0x7a6956, 0.84);
  rack.add([rail, ropeA, ropeB, coat, cloth]);
}

function createTravelChest(scene, x, groundY) {
  const chest = scene.add.container(x, groundY - 8).setDepth(7);
  chest.add([
    scene.add.ellipse(0, 16, 110, 18, 0x000000, 0.18),
    scene.add.rectangle(0, 0, 88, 46, 0x4f3e31, 1).setStrokeStyle(3, 0x241b15, 0.38),
    scene.add.rectangle(0, -8, 88, 14, 0x6a513f, 1),
    scene.add.rectangle(-22, 0, 8, 46, 0x2f251e, 1),
    scene.add.rectangle(22, 0, 8, 46, 0x2f251e, 1),
    scene.add.circle(0, 2, 4, 0xd7c087, 1),
  ]);
}

function createWallHook(scene, x, y) {
  const hook = scene.add.container(x, y).setDepth(6);
  hook.add([
    scene.add.rectangle(0, 0, 18, 10, 0x4d3d31, 1),
    scene.add.rectangle(0, 30, 4, 56, 0x8a7d67, 0.9),
    scene.add.rectangle(18, 34, 30, 40, 0x364b5d, 0.86),
  ]);
}

function createLeafPile(scene, x, groundY) {
  const pile = scene.add.container(x, groundY - 10).setDepth(7);
  const shadow = scene.add.ellipse(0, 18, 126, 22, 0x000000, 0.18);
  const leafA = scene.add.ellipse(-24, 2, 58, 26, 0x6e5539, 0.95).setAngle(-18);
  const leafB = scene.add.ellipse(10, -10, 74, 32, 0x8a6841, 0.96).setAngle(8);
  const leafC = scene.add.ellipse(28, 6, 52, 24, 0x5f4d34, 0.95).setAngle(24);
  pile.add([shadow, leafA, leafB, leafC]);
}

function createDoor(scene, x, groundY) {
  const door = scene.add.container(x, groundY - 88).setDepth(7);
  const shadow = scene.add.ellipse(0, 96, 54, 16, 0x000000, 0.18);
  const panel = scene.add.rectangle(0, 0, 42, 174, 0x342a23, 1).setStrokeStyle(3, 0xc39a58, 0.28);
  const inlayA = scene.add.rectangle(0, -38, 22, 46, 0x45362c, 1).setStrokeStyle(2, 0x18130f, 0.3);
  const inlayB = scene.add.rectangle(0, 34, 22, 46, 0x45362c, 1).setStrokeStyle(2, 0x18130f, 0.3);
  const handle = scene.add.circle(8, 10, 4, 0xe2c47f, 1);
  door.add([shadow, panel, inlayA, inlayB, handle]);
}

function createFootprints(scene, x, groundY) {
  for (let index = 0; index < 5; index += 1) {
    scene.add.ellipse(
      x + index * 32,
      groundY - 4 + ((index % 2) ? 8 : 0),
      18,
      10,
      0x74614b,
      0.72
    ).setAngle(-14).setDepth(8);
  }
}

function createLadder(scene, x, y) {
  const ladder = scene.add.container(x, y).setDepth(7);
  const railLeft = scene.add.rectangle(-26, 0, 8, 292, 0x7a6c57, 1);
  const railRight = scene.add.rectangle(26, 0, 8, 292, 0x7a6c57, 1);
  ladder.add([railLeft, railRight]);
  for (let index = 0; index < 11; index += 1) {
    ladder.add(scene.add.rectangle(0, -126 + index * 24, 46, 6, 0xcab07c, 1));
  }
}
