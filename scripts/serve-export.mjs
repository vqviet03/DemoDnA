// Test-only static server: faithfully mount the exported site under /DemoDnA/.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("out");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!pathname.startsWith("/DemoDnA/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    let file = resolve(root, pathname.slice("/DemoDnA/".length));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(3100, "0.0.0.0", () =>
  process.stdout.write("Export preview: http://localhost:3100/DemoDnA/\n"),
);
