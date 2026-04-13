const app = document.getElementById("app");

if (!app) {
  throw new Error('Root mount "#app" was not found.');
}

const search = new URLSearchParams(window.location.search);
const requestedEngine = search.get("engine");
const engine = requestedEngine === "legacy" ? "legacy" : "phaser-preview";

const legacyTemplate = `
  <div class="ui-state" aria-hidden="true" hidden>
    <p id="stage">Берег</p>
    <p id="inventory">Пусто</p>
    <p id="objective">Цель: добраться до маяка и понять, почему он не работает.</p>
    <p id="hint">Управление: A/D или стрелки для движения, I для инвентаря, E для взаимодействия.</p>
  </div>

  <canvas id="game" width="1280" height="720" aria-label="Игровая сцена Last Keeper"></canvas>

  <section id="chapterOverlay" class="chapter-overlay chapter-overlay--hidden" aria-live="polite">
    <div class="chapter-overlay__card">
      <p class="chapter-overlay__eyebrow">Глава завершена</p>
      <h2 id="chapterTitle" class="chapter-overlay__title">Маяк снова горит</h2>
      <p id="chapterText" class="chapter-overlay__text">
        Луч маяка прорезал туман. Остров не стал безопаснее, но теперь у тебя есть путь дальше.
      </p>
      <button id="chapterButton" class="chapter-overlay__button" type="button">
        Продолжить
      </button>
      <p class="chapter-overlay__hint">Нажми Enter или кнопку, чтобы перейти к следующей сцене.</p>
    </div>
  </section>
`;

const previewTemplate = `
  <section class="preview-hud" aria-live="polite">
    <section class="preview-stage-chip">
      <span class="preview-stage-chip__label">Глава</span>
      <p id="previewStage" class="preview-stage-chip__value">Жилая комната маяка</p>
    </section>

    <section class="preview-story-card">
      <span class="preview-story-card__label">Текущая цель</span>
      <p id="previewObjective" class="preview-story-card__value">Осмотреть комнату и вспомнить, как шторм занёс тебя в маяк.</p>
    </section>
  </section>

  <section class="preview-meta" hidden aria-hidden="true">
    <p id="previewSelected">Ничего не выбрано</p>
    <p id="previewInventory">Инвентарь: пусто</p>
    <p id="previewJournal">Пока пусто</p>
    <p id="previewLead">Осмотрись и зафиксируй первую зацепку.</p>
    <p id="previewHint">A/D или стрелки для движения, W/Space для прыжка, E для взаимодействия.</p>
    <p id="previewControls">I / Tab - инвентарь, J - журнал, Esc - закрыть панель</p>
  </section>

  <section id="previewRuntimeError" class="preview-runtime-error" hidden aria-live="assertive">
    <p class="preview-runtime-error__title">Preview runtime error</p>
    <pre id="previewRuntimeErrorText" class="preview-runtime-error__text"></pre>
  </section>

  <section id="game" class="preview-game-host" aria-label="Phaser сцена Last Keeper"></section>
`;

function ensureStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

function appendScript(src, { type = "text/javascript" } = {}) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    if (type === "module") {
      script.type = "module";
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.append(script);
  });
}

function installPreviewRuntimeErrorHandlers() {
  window.addEventListener("error", (event) => {
    const panel = document.getElementById("previewRuntimeError");
    const text = document.getElementById("previewRuntimeErrorText");
    if (!panel || !text) {
      return;
    }

    panel.hidden = false;
    text.textContent = `${event.message}\n${event.filename}:${event.lineno}:${event.colno}`;
  });

  window.addEventListener("unhandledrejection", (event) => {
    const panel = document.getElementById("previewRuntimeError");
    const text = document.getElementById("previewRuntimeErrorText");
    if (!panel || !text) {
      return;
    }

    panel.hidden = false;
    text.textContent = String(event.reason?.stack || event.reason?.message || event.reason);
  });
}

async function mountLegacy() {
  document.body.classList.remove("phaser-preview-body");
  app.innerHTML = legacyTemplate;
  await appendScript("./src/main.js");
}

async function mountPreview() {
  document.body.classList.add("phaser-preview-body");
  ensureStylesheet("./phaser-preview.css");
  app.innerHTML = previewTemplate;
  installPreviewRuntimeErrorHandlers();
  await appendScript("https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.js");
  await appendScript("./src/phaser-preview/main.js", { type: "module" });
}

if (engine === "legacy") {
  await mountLegacy();
} else {
  await mountPreview();
}
