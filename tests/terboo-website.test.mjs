// ═══════════════════════════════════════════════
// 🧪 Terboo V6 §32 §42 §46 §64 — الموقع: دخول آمن · جلسة · CSRF · أدوار · حراس
// ───────────────────────────────────────────────
// خادم حقيقي على منفذ عابر. يثبت:
//  1. /health و/ready و/api/v1/meta بلا مصادقة وبلا أسرار + رؤوس أمان + CSP
//  2. مسار الدخول: تحدٍّ ← تأكيد واتساب (نفس plugin عبر web-store) ← جلسة server-side بكوكي HttpOnly
//  3. CSRF: الطلب المغيّر بلا رأس X-CSRF-Token يُرفض
//  4. العميل لا يصبح مالكاً بعلم owner=true؛ الدور من الهوية server-side
//  5. owner-only مرفوض لغير المالك ومسموح للمالك
//  6. حارس اجتياز المسار على الملفات الساكنة
//  7. تحدٍّ خاطئ/تخمين محدود؛ خروج يُبطل الجلسة
//  8. profile/usage/tools/tasks الحقيقية عبر طبقة الخدمة
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const OWNER = "201000000700@s.whatsapp.net";
const USER = "201555500700@s.whatsapp.net";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-web-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
process.env.TERBOO_VPS_STORE = path.join(tmp, "vps.json");
process.env.TERBOO_WEB_HOST = "127.0.0.1";
process.env.TERBOO_WEB_PORT = "0";
const config = (await import("../config.js")).default;
config.owner.number = [OWNER.split("@")[0]];
config.website = { ...(config.website || {}), enabled: true, url: "", loginTtlSeconds: 120, sessionHours: 1 };
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
const memory = await import("../src/lib/terboo-ai-memory.js");
memory.initMemory(path.join(tmp, "memory"));
const { loadPlugins } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(process.cwd(), "plugins"));
db.setUser(OWNER, { language: "ar", name: "المالك" });
db.setUser(USER, { language: "en", name: "User" });

const { createServer } = await import("../web/server.js");
const store = await import("../src/lib/terboo-web-store.js");
store._resetWebStore();
const { identityOf } = await import("../src/lib/terboo-identity.js");

const { server } = createServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

function req(method, pathname, { body, cookie, csrf, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const h = { "Content-Type": "application/json", ...headers };
    if (cookie) h.Cookie = cookie;
    if (csrf) h["X-CSRF-Token"] = csrf;
    const r = http.request(`${base}${pathname}`, { method, headers: h }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => { const text = Buffer.concat(chunks).toString("utf8"); let json = null; try { json = JSON.parse(text); } catch { /* static */ } resolve({ status: res.statusCode, headers: res.headers, json, text }); });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}
const cookieOf = (res) => (res.headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");

// 1) عام + رؤوس أمان
let res = await req("GET", "/health");
assert.equal(res.status, 200); assert.equal(res.json.ok, true);
res = await req("GET", "/api/v1/meta");
assert.equal(res.json.data.version, config.bot.version);
assert.match(res.headers["content-security-policy"] || "", /default-src 'self'/);
assert.equal(res.headers["x-content-type-options"], "nosniff");
assert.equal(res.headers["x-frame-options"], "DENY");
assert.doesNotMatch(res.text, /apikey|password|token|secret/i);

// ثبت أن الجلسة مطلوبة
assert.equal((await req("GET", "/api/v1/profile")).status, 401);

// 2) مسار الدخول لمستخدم عادي
async function login(jid) {
  const ch = await req("POST", "/api/v1/auth/challenge");
  assert.equal(ch.json.ok, true);
  // تأكيد واتساب: نفس ما يفعله plugins/user/ويب.js
  const confirm = store.confirmChallenge(ch.json.data.code, identityOf(jid).canonical);
  assert.equal(confirm.ok, true, "تأكيد التحدي");
  const poll = await req("POST", "/api/v1/auth/poll", { body: { challengeId: ch.json.data.challengeId } });
  assert.equal(poll.json.data.status, "authenticated");
  const cookie = cookieOf(poll);
  assert.match((poll.headers["set-cookie"] || [])[0] || "", /HttpOnly/);
  assert.match((poll.headers["set-cookie"] || [])[0] || "", /SameSite=Strict/);
  return { cookie, csrf: poll.json.data.csrf, profile: poll.json.data.profile };
}
const user = await login(USER);
assert.equal(user.profile.role, "user");
res = await req("GET", "/api/v1/auth/session", { cookie: user.cookie });
assert.equal(res.json.data.authenticated, true);

// 3) CSRF
res = await req("POST", "/api/v1/usage", { cookie: user.cookie, body: { modes: ["vps"] } });
assert.equal(res.status, 403); assert.equal(res.json.code, "csrf");
res = await req("POST", "/api/v1/usage", { cookie: user.cookie, csrf: user.csrf, body: { modes: ["vps"] } });
assert.equal(res.json.ok, true, "مع CSRF ينجح");
assert.deepEqual(res.json.data, ["vps"]);

// 4) لا ترقية بعلم العميل
res = await req("GET", "/api/v1/owner/health", { cookie: user.cookie, headers: { "X-Owner": "true" }, body: undefined });
assert.equal(res.status, 403, "المستخدم العادي لا يصل لـowner");
res = await req("POST", "/api/v1/auth/poll", { body: { challengeId: "x", owner: true, isOwner: true } });
assert.notEqual(res.status, 200, "علم owner في الجسم لا يمنح شيئاً");

// 5) المالك
const owner = await login(OWNER);
assert.equal(owner.profile.role, "owner");
res = await req("GET", "/api/v1/owner/health", { cookie: owner.cookie });
assert.equal(res.json.ok, true);
assert.equal(typeof res.json.data.bot.version, "string");
assert.doesNotMatch(JSON.stringify(res.json), /apikey|password|adminapi/i);

// 6) حارس اجتياز المسار
res = await req("GET", "/../../config.js");
assert.ok(res.status === 403 || res.status === 404, `اجتياز المسار مرفوض: ${res.status}`);
res = await req("GET", "/%2e%2e/%2e%2e/config.js");
assert.ok(res.status === 403 || res.status === 404);
res = await req("GET", "/");
assert.equal(res.status, 200); assert.match(res.text, /Bot Terboo/);

// 7) تحدٍّ خاطئ + خروج
assert.equal(store.confirmChallenge("000000", identityOf(USER).canonical).ok, false);
res = await req("POST", "/api/v1/auth/logout", { cookie: owner.cookie, csrf: owner.csrf });
assert.equal(res.json.ok, true);
assert.equal((await req("GET", "/api/v1/auth/session", { cookie: owner.cookie })).status, 401, "الجلسة أُبطلت");

// 8) القدرات والمهام الحقيقية
res = await req("GET", "/api/v1/tools", { cookie: user.cookie });
assert.ok(Array.isArray(res.json.data.tools) && res.json.data.tools.length > 0, "كتالوج أدوات حقيقي");
assert.ok(!res.json.data.tools.some((tl) => tl.requiredAccess === "owner"), "المستخدم لا يرى أدوات المالك");
res = await req("GET", "/api/v1/tasks", { cookie: user.cookie });
assert.ok(Array.isArray(res.json.data.tasks));

// 9) تحديد المعدّل لمسار الدخول
let limited = false;
for (let i = 0; i < 20; i += 1) { const rr = await req("POST", "/api/v1/auth/challenge"); if (rr.status === 429) { limited = true; break; } }
assert.ok(limited, "تحديد المعدّل يعمل على مسار الدخول");

console.log("✅ terboo-website: عام+رؤوس أمان · دخول واتساب+جلسة HttpOnly · CSRF · لا ترقية بعلم العميل · owner-only · اجتياز المسار · خروج · أدوات/مهام · تحديد المعدّل");
await new Promise((r) => server.close(r));
process.exit(0);
