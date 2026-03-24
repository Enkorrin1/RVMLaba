const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const objectiveNode = document.getElementById("objective");
const hintNode = document.getElementById("hint");
const inventoryNode = document.getElementById("inventory");

const world = {
  width: 3200,
  height: 720,
  gravity: 1800,
  seaLevel: 620,
};

const player = {
  x: 140,
  y: 490,
  width: 46,
  height: 74,
  vx: 0,
  vy: 0,
  speed: 320,
  jumpStrength: 760,
  grounded: false,
  facing: 1,
};

const camera = {
  x: 0,
  y: 0,
};

const input = {
  left: false,
  right: false,
  jump: false,
  interact: false,
};

const initialObjective = "Цель: добраться до маяка и понять, почему он не работает.";
const defaultHint = "Управление: A/D или стрелки, Space для прыжка, E для взаимодействия.";

const gameState = {
  lastTime: 0,
  activeMessage: "Берег пуст, но маяк еще можно спасти.",
  currentObjective: initialObjective,
  interactionCooldown: 0,
  discovered: new Set(),
  inventory: {
    fuel: false,
  },
  endingUnlocked: false,
};

const platforms = [
  { x: 0, y: 610, width: 540, height: 120, type: "ground" },
  { x: 470, y: 560, width: 190, height: 36, type: "rock" },
  { x: 720, y: 600, width: 1120, height: 130, type: "ground" },
  { x: 880, y: 490, width: 180, height: 24, type: "platform" },
  { x: 1160, y: 430, width: 230, height: 24, type: "platform" },
  { x: 1470, y: 350, width: 220, height: 24, type: "platform" },
  { x: 1780, y: 600, width: 1020, height: 130, type: "ground" },
  { x: 2050, y: 520, width: 340, height: 20, type: "platform" },
  { x: 2200, y: 430, width: 230, height: 20, type: "platform" },
  { x: 2380, y: 340, width: 210, height: 20, type: "platform" },
  { x: 2680, y: 260, width: 160, height: 18, type: "platform" },
];

const interactables = [
  {
    id: "boat",
    x: 88,
    y: 545,
    width: 120,
    height: 56,
    title: "Лодка",
    text: "Шторм потрепал лодку. Обратного пути сейчас нет.",
    objective: "Цель: осмотреть берег и войти в маяк.",
  },
  {
    id: "crate",
    x: 350,
    y: 560,
    width: 60,
    height: 50,
    title: "Ящики",
    text: "На ящиках метка портовой службы. Тебя явно прислали сюда срочно.",
    objective: "Цель: подняться ко входу в маяк.",
  },
  {
    id: "note",
    x: 985,
    y: 450,
    width: 44,
    height: 40,
    title: "Записка",
    text: "Запуск только через резервный генератор. Топливо снова пропало.",
    objective: "Цель: найти путь к техническому уровню маяка.",
  },
  {
    id: "radio",
    x: 1515,
    y: 302,
    width: 54,
    height: 48,
    title: "Рация",
    text: "Помехи. Последние слова обрываются на фразе: 'Не спускайся туда один'.",
    objective: "Цель: добраться до генераторной и проверить питание.",
  },
  {
    id: "fuel",
    x: 2248,
    y: 374,
    width: 42,
    height: 56,
    title: "Канистра",
    text: "Почти полная канистра укрыта за балкой. Теперь генератор можно запустить.",
    objective: "Цель: вернуться к генератору и восстановить питание маяка.",
    once: true,
    onInteract() {
      if (gameState.inventory.fuel) {
        return null;
      }

      gameState.inventory.fuel = true;
      updateInventory();

      return {
        text: "Ты поднимаешь канистру. Металл холодный, а на боку свежие царапины.",
        objective: "Цель: вернуться к генератору и восстановить питание маяка.",
      };
    },
  },
  {
    id: "generator",
    x: 2700,
    y: 190,
    width: 92,
    height: 70,
    title: "Генератор",
    text: "Панель мертва. Не хватает топлива, чтобы снова зажечь маяк.",
    objective: "Цель обновлена: найти топливо для резервного генератора.",
    onInteract() {
      if (!gameState.inventory.fuel) {
        return {
          text: "Панель мертва. Бак пуст, запускать нечего. Где-то рядом должна быть канистра.",
          objective: "Цель обновлена: найти топливо для резервного генератора.",
        };
      }

      gameState.inventory.fuel = false;
      gameState.endingUnlocked = true;
      gameState.discovered.add("generator-online");
      updateInventory();

      return {
        text: "Двигатель вздрагивает и оживает. Свет маяка прорезает туман: первая часть прототипа завершена.",
        objective: "Цель выполнена: маяк снова работает. Можно развивать следующую сцену.",
      };
    },
  },
];

const keys = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "jump",
  KeyW: "jump",
  Space: "jump",
  KeyE: "interact",
};

window.addEventListener("keydown", (event) => {
  const action = keys[event.code];
  if (!action) {
    return;
  }

  if (action === "jump") {
    input.jump = true;
  } else if (action === "interact") {
    input.interact = true;
  } else {
    input[action] = true;
  }

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  const action = keys[event.code];
  if (!action) {
    return;
  }

  if (action === "interact") {
    input.interact = false;
    return;
  }

  if (action === "jump") {
    input.jump = false;
    return;
  }

  input[action] = false;
});

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function update(dt) {
  gameState.interactionCooldown = Math.max(0, gameState.interactionCooldown - dt);

  const moveAxis = Number(input.right) - Number(input.left);
  player.vx = moveAxis * player.speed;

  if (moveAxis !== 0) {
    player.facing = Math.sign(moveAxis);
  }

  if (input.jump && player.grounded) {
    player.vy = -player.jumpStrength;
    player.grounded = false;
  }

  player.vy += world.gravity * dt;

  player.x += player.vx * dt;
  resolveHorizontalCollisions();

  player.y += player.vy * dt;
  resolveVerticalCollisions();

  player.x = clamp(player.x, 0, world.width - player.width);

  camera.x = clamp(
    player.x - canvas.width / 2 + player.width / 2,
    0,
    world.width - canvas.width,
  );

  handleInteraction();
}

function resolveHorizontalCollisions() {
  for (const platform of platforms) {
    if (!intersects(player, platform)) {
      continue;
    }

    if (player.vx > 0) {
      player.x = platform.x - player.width;
    } else if (player.vx < 0) {
      player.x = platform.x + platform.width;
    }
  }
}

function resolveVerticalCollisions() {
  player.grounded = false;

  for (const platform of platforms) {
    if (!intersects(player, platform)) {
      continue;
    }

    if (player.vy > 0) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.grounded = true;
    } else if (player.vy < 0) {
      player.y = platform.y + platform.height;
      player.vy = 0;
    }
  }

  if (player.y + player.height > world.height) {
    player.y = world.height - player.height;
    player.vy = 0;
    player.grounded = true;
  }
}

function handleInteraction() {
  const nearby = interactables.find((item) => isInteractableVisible(item) && distanceToPlayer(item) < 90);

  hintNode.textContent = nearby
    ? `E: взаимодействовать с объектом "${nearby.title}". A/D или стрелки для движения, Space для прыжка.`
    : defaultHint;

  if (!input.interact || !nearby || gameState.interactionCooldown > 0) {
    return;
  }

  gameState.interactionCooldown = 0.25;

  const result = nearby.onInteract ? nearby.onInteract() : {
    text: nearby.text,
    objective: nearby.objective,
  };

  if (!result) {
    return;
  }

  gameState.activeMessage = result.text;
  gameState.currentObjective = result.objective;
  objectiveNode.textContent = result.objective;
  gameState.discovered.add(nearby.id);

  if (nearby.once) {
    nearby.hidden = true;
  }
}

function isInteractableVisible(item) {
  return !item.hidden;
}

function distanceToPlayer(item) {
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  const itemCenterX = item.x + item.width / 2;
  const itemCenterY = item.y + item.height / 2;
  return Math.hypot(playerCenterX - itemCenterX, playerCenterY - itemCenterY);
}

function updateInventory() {
  inventoryNode.textContent = gameState.inventory.fuel ? "Канистра с топливом" : "Пусто";
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky();

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawSea();
  drawFarCliffs();
  drawLighthouse();
  drawPlatforms();
  drawInteractables();
  drawPlayer();

  ctx.restore();

  drawMessagePanel();
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#2d5977");
  gradient.addColorStop(0.55, "#183144");
  gradient.addColorStop(1, "#081116");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(229, 239, 242, 0.12)";
  ctx.beginPath();
  ctx.ellipse(1120, 100, 110, 55, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + i * 0.01})`;
    ctx.fillRect(120 * i, 110 + i * 30, 250, 12);
  }
}

function drawSea() {
  ctx.fillStyle = "#0a1e28";
  ctx.fillRect(0, world.seaLevel, world.width, world.height - world.seaLevel);

  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(104, 155, 181, 0.28)" : "rgba(138, 186, 201, 0.18)";
    ctx.fillRect(i * 220, world.seaLevel + 18 + (i % 3) * 8, 130, 6);
  }
}

function drawFarCliffs() {
  ctx.fillStyle = "#142531";
  ctx.beginPath();
  ctx.moveTo(0, 500);
  ctx.lineTo(260, 390);
  ctx.lineTo(540, 490);
  ctx.lineTo(900, 340);
  ctx.lineTo(1260, 500);
  ctx.lineTo(1620, 370);
  ctx.lineTo(2080, 520);
  ctx.lineTo(2520, 330);
  ctx.lineTo(2920, 470);
  ctx.lineTo(world.width, 420);
  ctx.lineTo(world.width, world.height);
  ctx.lineTo(0, world.height);
  ctx.closePath();
  ctx.fill();
}

function drawLighthouse() {
  ctx.fillStyle = "#64584d";
  ctx.fillRect(800, 250, 330, 350);

  ctx.fillStyle = "#8e8071";
  ctx.fillRect(860, 110, 210, 160);

  ctx.fillStyle = "#d9c59d";
  ctx.fillRect(920, 70, 90, 50);

  ctx.fillStyle = "#4b392e";
  ctx.fillRect(925, 470, 70, 130);

  ctx.fillStyle = "#2b2220";
  ctx.fillRect(900, 320, 50, 85);
  ctx.fillRect(1000, 320, 50, 85);

  if (gameState.endingUnlocked) {
    ctx.fillStyle = "rgba(247, 219, 148, 0.78)";
    ctx.beginPath();
    ctx.moveTo(965, 95);
    ctx.lineTo(1380, -20);
    ctx.lineTo(1380, 90);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlatforms() {
  for (const platform of platforms) {
    if (platform.type === "ground") {
      ctx.fillStyle = "#3f4b42";
    } else if (platform.type === "rock") {
      ctx.fillStyle = "#4e5857";
    } else {
      ctx.fillStyle = "#7c684d";
    }

    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    if (platform.type !== "ground") {
      ctx.fillStyle = "rgba(26, 18, 14, 0.34)";
      ctx.fillRect(platform.x, platform.y + platform.height - 5, platform.width, 5);
    }
  }
}

function drawInteractables() {
  for (const item of interactables) {
    if (!isInteractableVisible(item)) {
      continue;
    }

    ctx.fillStyle = getItemColor(item);
    ctx.fillRect(item.x, item.y, item.width, item.height);

    if (distanceToPlayer(item) < 90) {
      ctx.fillStyle = "rgba(255, 243, 201, 0.9)";
      ctx.font = "22px Georgia";
      ctx.fillText("E", item.x + item.width / 2 - 6, item.y - 12);
    }
  }
}

function getItemColor(item) {
  if (item.id === "fuel") {
    return "#b14e3f";
  }

  if (item.id === "generator" && gameState.inventory.fuel) {
    return "#e4b25f";
  }

  return gameState.discovered.has(item.id) ? "#d5a95b" : "#9fb7b8";
}

function drawPlayer() {
  ctx.fillStyle = "#d2b48c";
  ctx.fillRect(player.x + 10, player.y, 24, 22);

  ctx.fillStyle = "#34414e";
  ctx.fillRect(player.x + 6, player.y + 22, 32, 32);

  ctx.fillStyle = "#5b4232";
  ctx.fillRect(player.x + 12, player.y + 54, 8, 20);
  ctx.fillRect(player.x + 24, player.y + 54, 8, 20);

  ctx.fillStyle = "#25303b";
  const armX = player.facing === 1 ? player.x + 34 : player.x + 4;
  ctx.fillRect(armX, player.y + 26, 8, 22);
}

function drawMessagePanel() {
  ctx.fillStyle = "rgba(6, 12, 18, 0.74)";
  ctx.fillRect(28, canvas.height - 120, canvas.width - 56, 92);

  ctx.strokeStyle = "rgba(228, 178, 95, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, canvas.height - 120, canvas.width - 56, 92);

  ctx.fillStyle = "#f0e6cf";
  ctx.font = "28px Georgia";
  ctx.fillText("Журнал", 50, canvas.height - 84);

  ctx.fillStyle = "#dce5df";
  ctx.font = "24px Georgia";
  wrapText(gameState.activeMessage, 50, canvas.height - 48, canvas.width - 100, 30);
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (const word of words) {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line.trim(), x, y);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function frame(timestamp) {
  if (!gameState.lastTime) {
    gameState.lastTime = timestamp;
  }

  const dt = Math.min((timestamp - gameState.lastTime) / 1000, 0.033);
  gameState.lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(frame);
}

objectiveNode.textContent = gameState.currentObjective;
hintNode.textContent = defaultHint;
updateInventory();

requestAnimationFrame(frame);
