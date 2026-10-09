// ═══════════════════════════════════════════════
// 🌐 Terboo Web — خادم الموقع (Node 22، بلا تبعيات خارجية) (V6 §31 §42 §43 §46 §63 §64)
// ───────────────────────────────────────────────
// يستعمل طبقة الخدمة المشتركة (src/lib/terboo-web-services) فلا يعيد كتابة أي أمر.
// الأمان: كوكي HttpOnly Secure SameSite للجلسة · CSRF (double-submit) · CORS allowlist · رؤوس أمان + CSP
// · حدّ حجم الجسم · تحديد المعدّل · request id · تطبيع الأخطاء · لا أسرار في أي رد.
// التشغيل: داخل البوت (installWeb) خلف config.website.enabled، أو مستقلاً: npm run web.
// ═══════════════════════════════════════════════

import http from "node:http";
import https from "node:https";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../config.js";
import { noteFailure } from "../src/lib/terboo-failure-log.js";
import { registerApi } from "./api/index.js";
import { serveStatic } from "./lib/static.js";
import { attachStream } from "./lib/stream.js";
import { detectPublicIp, overrides as siteOverrides, reportServer, sslPaths } from "../src/lib/terboo-website.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BODY_LIMIT = 1 * 1024 * 1024; // 1MB لطلبات JSON
const RL = { windowMs: 60_000, max: 120, authMax: 12 }; // تحديد المعدّل لكل IP

/** عنوان الاستماع: البيئة ← (رابط مضبوط خلف proxy على 80/443 ⇒ config.host) ← 0.0.0.0 ليعمل رابط IP:المنفذ */
function bindHost(w, configuredUrl) {
  if (process.env.TERBOO_WEB_HOST) return process.env.TERBOO_WEB_HOST;
  if (w.autoPublic === false) return w.host || "127.0.0.1";
  if (configuredUrl) {
    try {
      const u = new URL(configuredUrl);
      if (!u.port && !/^[\d.]+$/.test(u.hostname)) return w.host || "127.0.0.1"; // دومين خلف reverse proxy
    } catch (error) {
      noteFailure("web", error, { where: "web/server.js:bindHost", stage: "parse-url", fallback: "0.0.0.0" });
    }
  }
  return "0.0.0.0";
}

function webConfig() {
  const w = config.website || {};
  const ownerUrl = siteOverrides().url || "";
  const url = ownerUrl || process.env.TERBOO_SITE_URL || w.url || "";
  return {
    host: bindHost(w, url),
    port: Number(process.env.TERBOO_WEB_PORT || siteOverrides().port || w.port || 8787),
    trustProxy: process.env.TERBOO_WEB_TRUST_PROXY === "1" || w.trustProxy === true,
    url,
    ssl: sslPaths(),
    loginTtlSeconds: Number(w.loginTtlSeconds || 300),
    sessionHours: Number(w.sessionHours || 72),
    uploads: w.uploads || { maxMb: 25, retentionHours: 24 },
  };
}

// ── تحديد المعدّل (نافذة متحركة بسيطة لكل IP) ──
const buckets = new Map();
function rateLimited(ip, isAuth) {
  const now = Date.now();
  const entry = buckets.get(ip) || { hits: [], authHits: [] };
  entry.hits = entry.hits.filter((t) => now - t < RL.windowMs);
  entry.authHits = entry.authHits.filter((t) => now - t < RL.windowMs);
  entry.hits.push(now);
  if (isAuth) entry.authHits.push(now);
  buckets.set(ip, entry);
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (!v.hits.length) buckets.delete(k);
  return entry.hits.length > RL.max || (isAuth && entry.authHits.length > RL.authMax);
}

function clientIp(req, trustProxy) {
  if (trustProxy) {
    const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (fwd) return fwd;
  }
  return req.socket?.remoteAddress || "0.0.0.0";
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; "),
};

/** يقرأ جسم الطلب بحدّ أقصى (JSON) */
function readBody(req, limit = BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(Object.assign(new Error("payload-too-large"), { code: "payload-too-large" })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseCookies(header = "") {
  const out = {};
  for (const part of String(header).split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** بيئة الاستجابة الموحّدة: JSON مطبّع + رؤوس أمان + كوكي */
function makeRes(res, requestId) {
  let cookies = [];
  return {
    cookie: (name, value, opts = {}) => {
      const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Strict"];
      if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.round(opts.maxAge)}`);
      if (opts.expires === 0) parts.push("Max-Age=0");
      if (process.env.NODE_ENV === "production" || opts.secure) parts.push("Secure");
      cookies.push(parts.join("; "));
    },
    json: (status, payload) => {
      const headers = { "Content-Type": "application/json; charset=utf-8", "X-Request-Id": requestId, ...SECURITY_HEADERS };
      if (cookies.length) headers["Set-Cookie"] = cookies;
      res.writeHead(status, headers);
      res.end(JSON.stringify(payload));
    },
    ok: function ok(data) { this.json(200, { ok: true, data, requestId }); },
    fail: function fail(status, code, extra = {}) { this.json(status, { ok: false, code, requestId, ...extra }); },
    raw: res,
    requestId,
  };
}

/** المنشأ مسموح إن طابق Host الطلب نفسه، أو الرابط المضبوط */
function sameOrigin(origin, req, cfg) {
  try {
    const o = new URL(origin);
    if (o.host === String(req.headers.host || "")) return true;
    return Boolean(cfg.url) && o.origin === new URL(cfg.url).origin;
  } catch (error) {
    noteFailure("web", error, { where: "web/server.js:sameOrigin", stage: "parse-origin", fallback: "deny" });
    return false;
  }
}

// صفحة اللعب: نفس رؤوس الأمان + السماح بالصوت المولَّد (WebAudio لا يحتاج إذناً) — بلا إطار خارجي
const PLAY_HEADERS = { ...SECURITY_HEADERS, "Cache-Control": "no-store" };

// حد معدّل مستقل لمسارات اللعب (لعبة سريعة كالثعبان ترسل حركة كل ~0.4 ث)
const arcadeBuckets = new Map();
function arcadeLimited(ip) {
  const at = Date.now();
  const hits = (arcadeBuckets.get(ip) || []).filter((x) => at - x < 60_000);
  hits.push(at);
  arcadeBuckets.set(ip, hits);
  if (arcadeBuckets.size > 10_000) for (const [k, v] of arcadeBuckets) if (!v.length || at - v[v.length - 1] > 60_000) arcadeBuckets.delete(k);
  return hits.length > 400;
}

function createServer() {
  const cfg = webConfig();
  const api = registerApi(cfg);
  const handler = async (req, res) => {
    const requestId = crypto.randomBytes(8).toString("hex");
    const r = makeRes(res, requestId);
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const ip = clientIp(req, cfg.trustProxy);
      const pathname = url.pathname;

      // الصحة والجاهزية (بلا مصادقة، بلا أسرار)
      if (pathname === "/health") return r.json(200, { ok: true, status: "healthy", uptime: Math.round(process.uptime()) });
      if (pathname === "/ready") return r.json(200, { ok: true, status: "ready" });

      // CORS: نفس الأصل فقط (الموقع يُقدّم من نفس الخادم: الرابط المضبوط أو IP:المنفذ) — لا نعكس Origin غريباً
      const origin = req.headers.origin;
      if (origin && !sameOrigin(origin, req, cfg)) {
        return r.fail(403, "cross-origin-denied");
      }

      // صفحة اللعب التفاعلية (رمز موقّع في المسار، تُخدم كملف ساكن واحد)
      if (/^\/play\/[A-Za-z0-9_.-]{20,400}$/.test(pathname)) {
        return serveStatic({ method: req.method, url: "/play.html" }, res, { root: path.join(HERE, "public"), securityHeaders: PLAY_HEADERS, requestId });
      }

      if (pathname.startsWith("/api/v1/arcade/")) {
        if (arcadeLimited(ip)) return r.fail(429, "rate-limited");
        let body = {};
        if (req.method === "POST") {
          if (!String(req.headers["content-type"] || "").startsWith("application/json") || req.headers["x-terboo-arcade"] !== "1") return r.fail(415, "json-only");
          const raw = await readBody(req, 8 * 1024);
          if (raw.length) { try { body = JSON.parse(raw.toString("utf8")); } catch { return r.fail(400, "invalid-json"); } }
        }
        const { handleArcade } = await import("./api/arcade.js");
        return handleArcade({ req, r, url, method: req.method, pathname, body, cookies: parseCookies(req.headers.cookie), ip });
      }

      if (pathname.startsWith("/api/")) {
        const isAuth = pathname.startsWith("/api/v1/auth/");
        if (rateLimited(ip, isAuth)) return r.fail(429, "rate-limited");
        if (pathname === "/api/v1/stream") return attachStream(req, res, { requestId, cookies: parseCookies(req.headers.cookie), cfg });
        const cookies = parseCookies(req.headers.cookie);
        let body = {};
        if (req.method === "POST" || req.method === "PUT") {
          const raw = await readBody(req).catch((error) => { throw error; });
          if (raw.length) { try { body = JSON.parse(raw.toString("utf8")); } catch { return r.fail(400, "invalid-json"); } }
        }
        return api.handle({ req, r, url, method: req.method, pathname, body, cookies, ip, csrfHeader: req.headers["x-csrf-token"] || "" });
      }

      // ملفات الواجهة الساكنة (SPA)
      return serveStatic(req, res, { root: path.join(HERE, "public"), securityHeaders: SECURITY_HEADERS, requestId });
    } catch (error) {
      if (error?.code === "payload-too-large") return r.fail(413, "payload-too-large");
      noteFailure("web", error, { where: "web/server.js:request", stage: "handle", fallback: "500" });
      return r.fail(500, "internal-error");
    }
  };
  let server;
  let protocol = "http";
  if (cfg.ssl) {
    try {
      server = https.createServer({ cert: fs.readFileSync(cfg.ssl.cert), key: fs.readFileSync(cfg.ssl.key) }, handler);
      protocol = "https";
    } catch (error) {
      // شهادة مفقودة/تالفة ⇒ http مع تسجيل الخطأ للمالك (لا يُطبع محتوى أي ملف)
      noteFailure("web", error, { where: "web/server.js:createServer", stage: "load-ssl", fallback: "http" });
      server = http.createServer(handler);
    }
  } else {
    server = http.createServer(handler);
  }
  return { server, cfg, protocol };
}

/** يشغّل الخادم (مستقل أو داخل البوت). getSocket يربط الجلسة الحيّة للإجراءات التي تحتاجها. */
async function startWeb({ getSocket = null } = {}) {
  const { server, cfg, protocol } = createServer();
  if (getSocket) {
    const svc = await import("../src/lib/terboo-web-services.js");
    svc.bindSocket(getSocket);
  }
  const { startCleanup } = await import("./lib/cleanup.js");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(cfg.port, cfg.host, resolve);
  });
  const port = server.address()?.port || cfg.port;
  reportServer({ listening: true, startedAt: new Date().toISOString(), address: `${cfg.host}:${port}`, protocol, port, error: "" });
  // IP السيرفر العام للرابط التلقائي (لا يحجب الإقلاع)
  if (!cfg.url) {
    detectPublicIp().then((ip) => reportServer({ publicIp: ip })).catch((error) => noteFailure("web", error, { where: "web/server.js:startWeb", stage: "detect-ip", fallback: "no-auto-url" }));
  }
  const stopCleanup = startCleanup(cfg);
  return {
    server,
    cfg,
    protocol,
    port,
    async stop() {
      stopCleanup?.();
      await new Promise((resolve) => server.close(resolve));
      reportServer({ listening: false, address: "" });
    },
  };
}

export { createServer, startWeb, webConfig };
export default { startWeb, createServer, webConfig };
