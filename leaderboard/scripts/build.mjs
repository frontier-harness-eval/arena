/* Builds the static site into dist/: index.html for All models and <model id>/index.html for each model, with the
   page's scripts, styles, logos and data/lite.json. Every path in a page is relative to it, so the site works from
   any directory of any static host. */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const data = JSON.parse(readFileSync(path.join(ROOT, "data/lite.json"), "utf8"));
const template = readFileSync(path.join(ROOT, "index.html"), "utf8");
const page = (root, model, title, pageName = "leaderboard") => template
  .replaceAll("{{ROOT}}", root)
  .replaceAll("{{MODEL}}", model)
  .replaceAll("{{TITLE}}", title)
  .replaceAll("{{PAGE}}", pageName)
  .replaceAll("{{LEADERBOARD_CURRENT}}", pageName === "leaderboard" ? ' aria-current="page"' : "")
  .replaceAll("{{PARTICIPATE_CURRENT}}", pageName === "participate" ? ' aria-current="page"' : "");

rmSync(DIST, { recursive: true, force: true });
for (const dir of ["src", "static", "data"]) cpSync(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
writeFileSync(path.join(DIST, "index.html"), page("./", "all", "FrontierHarness Arena: leaderboard"));
mkdirSync(path.join(DIST, "participate"), { recursive: true });
writeFileSync(path.join(DIST, "participate", "index.html"), page("../", "all", "FrontierHarness Arena: participate", "participate"));
for (const m of data.models) {
  mkdirSync(path.join(DIST, m.id), { recursive: true });
  writeFileSync(path.join(DIST, m.id, "index.html"), page("../", m.id, `FrontierHarness Arena: ${m.label} leaderboard`));
}
console.log(`dist/: All models, ${data.models.length} model pages, and participate`);
