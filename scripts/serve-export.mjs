// Test-only static server: mount the export at its configured deployment path.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("out");
const mount = `${(process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "")}/`;
const mime = {
  ".pdf": "application/pdf",
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
    if (!pathname.startsWith(mount)) {
      res.writeHead(404);
      res.end();
      return;
    }
    let file = resolve(root, pathname.slice(mount.length));
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
  process.stdout.write(`Export preview: http://localhost:3100${mount}\n`),
);
