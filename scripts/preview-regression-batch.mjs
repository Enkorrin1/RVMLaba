import { spawnSync } from "node:child_process";

const firstArg = process.argv[2];
if (firstArg === "--help" || firstArg === "-h") {
  process.stdout.write("Usage: node scripts/preview-regression-batch.mjs [baseUrl]\n");
  process.exit(0);
}

const baseUrl = firstArg?.startsWith("http://") || firstArg?.startsWith("https://")
  ? firstArg
  : "http://127.0.0.1:4173/";

const steps = [
  { label: "ui-smoke", script: "scripts/preview-ui-smoke.mjs" },
  { label: "prompt-check", script: "scripts/preview-prompt-check.mjs" },
  { label: "playability", script: "scripts/preview-playability-check.mjs" },
  { label: "route-check", script: "scripts/preview-route-check.mjs" },
];

for (const step of steps) {
  process.stdout.write(`\n[preview-regression] ${step.label}\n`);
  const result = spawnSync(process.execPath, [step.script, baseUrl], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

process.stdout.write("\n[preview-regression] all checks passed\n");
