import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve(process.argv[3] ?? "output/preview-ui-smoke");

fs.mkdirSync(outputDir, { recursive: true });

async function saveJson(name, payload) {
  fs.writeFileSync(path.join(outputDir, name), JSON.stringify(payload, null, 2));
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const errors = [];
  const assertions = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ type: "console.error", text: msg.text() });
    }
  });
  page.on("pageerror", (error) => {
    errors.push({ type: "pageerror", text: String(error) });
  });

  async function getState() {
    return page.evaluate(() => {
      const raw = window.render_game_to_text?.();
      return raw ? JSON.parse(raw) : null;
    });
  }

  async function advance(ms) {
    await page.evaluate(async (value) => {
      await window.advanceTime?.(value);
    }, ms);
  }

  function assertStep(condition, message, details = {}) {
    assertions.push({ ok: Boolean(condition), message, details });
  }

  async function snapshot(label) {
    const state = await getState();
    const fullscreenActive = await page.evaluate(() => Boolean(document.fullscreenElement));
    const viewport = page.viewportSize();
    const payload = { state, fullscreenActive, viewport };
    await saveJson(`${label}.json`, payload);
    await page.screenshot({ path: path.join(outputDir, `${label}.png`) });
    return payload;
  }

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const raw = window.render_game_to_text?.();
    if (!raw) {
      return false;
    }

    try {
      return Boolean(JSON.parse(raw)?.scene?.key);
    } catch {
      return false;
    }
  });

  await advance(600);
  const initial = await snapshot("00-initial");
  assertStep(initial.state?.scene?.key === "wake-preview", "Preview boots into wake scene", initial);

  await page.keyboard.press("f");
  await advance(240);
  const fullscreenOn = await snapshot("01-fullscreen-on");
  assertStep(
    fullscreenOn.fullscreenActive || /Полноэкранный режим/i.test(fullscreenOn.state?.ui?.dialogue ?? ""),
    "Fullscreen toggle reacts to F",
    fullscreenOn
  );

  if (fullscreenOn.fullscreenActive) {
    await page.evaluate(async () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    });
    await advance(260);
  } else {
    await page.keyboard.press("Escape");
    await advance(180);
  }
  const fullscreenOff = await snapshot("02-fullscreen-off");
  assertStep(
    !fullscreenOff.fullscreenActive,
    "Escape exits fullscreen state cleanly",
    fullscreenOff
  );

  await page.evaluate(async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await advance(240);
  const wideResize = await snapshot("03-wide-resize");
  assertStep(
    wideResize.state?.scene?.key === "wake-preview" && wideResize.viewport?.width === 1440,
    "Wide viewport resize keeps preview responsive",
    wideResize
  );

  await page.setViewportSize({ width: 1024, height: 640 });
  await advance(240);
  const compactResize = await snapshot("04-compact-resize");
  assertStep(
    compactResize.state?.scene?.key === "wake-preview" && compactResize.viewport?.width === 1024,
    "Compact viewport resize keeps preview responsive",
    compactResize
  );

  await page.evaluate(async () => {
    window.__LAST_KEEPER_PREVIEW_TEST_API__?.resetPreview?.();
    await window.advanceTime?.(240);
  });
  await advance(240);
  const resetState = await snapshot("05-after-reset");
  assertStep(
    resetState.state?.scene?.key === "wake-preview"
      && (resetState.state?.inventory?.items?.length ?? 0) === 0
      && resetState.state?.progress?.wake?.leavesMoved === false,
    "Reset returns the preview to a clean wake state",
    resetState
  );

  const report = {
    ok: !errors.length && assertions.every((entry) => entry.ok),
    errors,
    assertions,
    finalState: await getState(),
  };

  await saveJson("ui-smoke-report.json", report);
  await browser.close();

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
