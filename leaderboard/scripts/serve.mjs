/* Serves dist/ on http://localhost:$PORT (default 8080). node scripts/serve.mjs */
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const PORT = +process.env.PORT || 8080;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

http.createServer((req, res) => {
  let file = path.join(DIST, path.normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!req.url.split("?")[0].endsWith("/")) { res.writeHead(301, { Location: `${req.url.split("?")[0]}/` }).end(); return; }
    file = path.join(file, "index.html");
  }
  if (!existsSync(file)) { res.writeHead(404, { "Content-Type": "text/plain" }).end("not found"); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Arena leaderboard on http://localhost:${PORT}/`));
