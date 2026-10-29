import { readFileSync } from "node:fs";
const css = readFileSync(
  new URL("../apps/web/src/app/tokens.css", import.meta.url),
  "utf8",
);
const tokens = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map((m) => [m[1], m[2]]),
);
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
const pairs = [
  ["text-primary", "surface", 4.5],
  ["text-secondary", "surface", 4.5],
  ["text-secondary", "background", 4.5],
  ["surface", "primary-action", 4.5],
  ["surface", "primary-hover", 4.5],
  ["sidebar-muted", "sidebar", 4.5],
  ["team-a-ink", "paper", 4.5],
  ["team-b-ink", "paper", 4.5],
  ["text-primary", "team-a", 4.5],
  ["text-primary", "team-b", 4.5],
  ["success", "success-soft", 4.5],
  ["warning", "warning-soft", 4.5],
  ["error", "error-soft", 4.5],
  ["border-control", "surface", 3],
  ["focus", "surface", 3],
  ["focus", "background", 3],
];
let failed = false;
for (const [foreground, background, target] of pairs) {
  const a = luminance(tokens[foreground]),
    b = luminance(tokens[background]);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const pass = ratio >= target;
  console.log(
    `${pass ? "PASS" : "FAIL"} ${foreground} / ${background}: ${ratio.toFixed(2)}:1 (minimum ${target}:1)`,
  );
  if (!pass) failed = true;
}
if (failed) process.exitCode = 1;
