// ═══════════════════════════════════════════════
// 📄 Terboo Web — تقديم ملفات الواجهة الساكنة (SPA) بأمان (V6 §46)
// ───────────────────────────────────────────────
// حارس اجتياز المسار: لا يُقدَّم إلا من داخل public/؛ أنواع MIME صريحة؛ SPA fallback لـindex.html.
// ═══════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".map": "application/json",
};

function serveStatic(req, res, { root, securityHeaders, requestId }) {
  const send = (status, body, type) => { res.writeHead(status, { "Content-Type": type, "X-Request-Id": requestId, ...securityHeaders }); res.end(body); };
  if (req.method !== "GET" && req.method !== "HEAD") return send(405, "method not allowed", "text/plain");
  try {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    // حارس الاجتياز: نحلّ المسار ونتأكد أنه داخل root
    const rel = urlPath.replace(/^\/+/, "");
    const full = path.resolve(root, rel);
    if (full !== root && !full.startsWith(root + path.sep)) return send(403, "forbidden", "text/plain");
    let file = full;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      // SPA: المسارات غير الملفية ترجع index.html (والملفات غير الموجودة ذات الامتداد = 404)
      if (path.extname(urlPath)) return send(404, "not found", "text/plain");
      file = path.join(root, "index.html");
    }
    if (!fs.existsSync(file)) return send(404, "not found", "text/plain");
    const type = MIME[path.extname(file)] || "application/octet-stream";
    return send(200, fs.readFileSync(file), type);
  } catch (error) {
    noteFailure("web", error, { where: "web/lib/static.js", stage: "serve", fallback: "500" });
    return send(500, "error", "text/plain");
  }
}

export { MIME, serveStatic };
export default { serveStatic };
