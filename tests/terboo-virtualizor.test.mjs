// ═══════════════════════════════════════════════
// 🧪 Terboo VPS (Virtualizor) — مزوّد · قدرات · صلاحيات · تفويض
// ───────────────────────────────────────────────
// سيرفر Virtualizor وهمي محلي يطبّق الطلبات الموثّقة (act · svs · do=1 · apikey/apipass · POST):
//   1. عميل: مصادقة enduser/admin · خطأ الواجهة خطأ · لا مفتاح في الأخطاء · إعادة محاولة للقراءة فقط · مهلة وإلغاء.
//   2. القدرات: تُكتشف فعلياً (ostemplate/services متاحة، النسخ الاحتياطية لا) ⇒ لا قدرة وهمية.
//   3. الصلاحيات: بلا منح لا وصول · VPS مستخدم آخر ممنوع حتى بمعرفته · السحب يقطع فوراً · الانتهاء تلقائي.
//   4. الإجراءات: تشغيل/إعادة تشغيل بتأكيد · اسم مضيف وكلمة مرور وقالب نظام تُتحقق قبل الإرسال.
//   5. المالك: إسناد VPS يتحقق عند المزوّد أولاً · VPS لمستخدم واحد · لوحة الإدارة لا تُستعمل للمستخدم.
//   6. docs/terboo-vps-permissions.json مطابق للكتالوج.
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-vz-"));
process.env.TERBOO_VPS_STORE = path.join(tmp, "entitlements.json");
const KEY = "TESTKEY0000ABCD1";
const PASS = "TestPass0000abcdefghijklmnopqrst";
const ADMIN_KEY = "ADMINKEY00000001";

// ── سيرفر وهمي ──
const calls = [];
let fail500 = 0;
const VPS = { 101: { vpsid: "101", vps_name: "v101", hostname: "alpha.example", status: 1, ips: { 1: "203.0.113.10" }, ram: 8192, cores: 4 }, 102: { vpsid: "102", vps_name: "v102", hostname: "beta.example", status: 0, ips: { 1: "203.0.113.11" } } };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    const q = Object.fromEntries(url.searchParams);
    const post = Object.fromEntries(new URLSearchParams(body));
    calls.push({ method: req.method, q, post });
    const send = (obj, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
    const admin = q.adminapikey !== undefined;
    if (admin ? q.adminapikey !== ADMIN_KEY : (q.apikey !== KEY || q.apipass !== PASS)) { res.writeHead(200, { "Content-Type": "text/html" }); res.end("<html>Login</html>"); return; }
    if (fail500 > 0) { fail500 -= 1; send({}, 500); return; }
    if (q.api !== "json") { send({ error: ["api format"] }); return; }
    const vps = VPS[q.svs];
    switch (q.act) {
      case "listvs": return send({ uid: 1, act: "listvs", vs: VPS });
      case "vs": return send({ vs: VPS });
      case "vpsmanage": return vps ? send({ act: "vpsmanage", info: { hostname: vps.hostname, status: vps.status, ip: ["203.0.113.10"], os: { name: "Ubuntu 22.04" }, uptime: "3 days", vps: { ram: 8192, cores: 4, space: 120, bandwidth: 20000 }, server_name: "INTERNAL-NODE-7", serid: 9 } }) : send({ error: ["no vps"] });
      case "start": case "stop": case "restart": case "poweroff": return q.do === "1" && vps ? send({ done: { msg: `${q.act} ok` } }) : send({ error: ["bad"] });
      case "hostname": return post.newhost ? send({ done: { msg: "Hostname changed" }, onboot: "Your hostname will be changed when the VPS is booted again" }) : send({ current: vps?.hostname });
      case "changepassword": return post.newpass ? (post.newpass === post.conf ? send({ done: { msg: "Password changed" } }) : send({ error: ["conf"] })) : send({ title: "Change Password" });
      case "ostemplate": return post.reinsos ? send({ done: { msg: "The OS was reinstalled successfully" } }) : send({ oslist: { kvm: { ubuntu: { 272: { osid: 272, name: "Ubuntu 22.04", distro: "ubuntu" } }, debian: { 300: { osid: 300, name: "Debian 12", distro: "debian" } } } } });
      case "services": return post.restart_x ? send({ done: { msg: "restarted" }, services: ["nginx", "sshd"] }) : send({ services: ["nginx", "sshd"], running: ["sshd"], autostart: ["sshd"] });
      case "vnc": return send({ info: { ip: "198.51.100.5", port: 5901, password: "vncpass1", novnc: 1 } });
      case "backup2": return send({ error: ["Backups are only for OpenVZ"] });
      default: return send({ error: ["unknown act"] });
    }
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

const config = (await import("../config.js")).default;
config.virtualizor = {
  enabled: true,
  enduser: { url: `http://127.0.0.1:${PORT}`, apiKey: KEY, apiPassword: PASS, verifyTLS: true, timeoutMs: 3000, maxRetries: 2 },
  admin: { enabled: true, url: `http://127.0.0.1:${PORT}`, apiKey: ADMIN_KEY, apiPassword: "ADMINPASS000001x", verifyTLS: true, timeoutMs: 3000, maxRetries: 0 },
  ownerContact: { whatsapp: "201225655220" },
};
for (const k of ["VIRTUALIZOR_URL", "VIRTUALIZOR_API_KEY", "VIRTUALIZOR_API_PASSWORD"]) delete process.env[k];

const VZ = await import("../src/lib/providers/virtualizor/index.js");
const { callVirtualizor, VirtualizorError } = await import("../src/lib/providers/virtualizor/virtualizor-client.js");
const { identityOf } = await import("../src/lib/terboo-identity.js");
const results = [];
const check = async (name, fn) => { await fn(); results.push(name); };

const BUYER = identityOf("201000000001@s.whatsapp.net");
const OTHER = identityOf("201000000002@s.whatsapp.net");
const OWNER = "201225655220@s.whatsapp.net";

await check("client", async () => {
  const s = VZ.layerSettings("enduser");
  const json = await callVirtualizor(s, { act: "listvs" });
  assert.ok(json.vs["101"]);
  const last = calls.at(-1);
  assert.deepEqual([last.q.act, last.q.api, last.q.apikey, last.q.apipass], ["listvs", "json", KEY, PASS]);
  // مفاتيح خاطئة ⇒ auth، ولا مفتاح ولا رابط في الخطأ
  const bad = { ...s, apiKey: "WRONGKEY00000000" };
  const err = await callVirtualizor(bad, { act: "listvs" }).catch((e) => e);
  assert.ok(err instanceof VirtualizorError && err.code === "auth", err?.code);
  assert.ok(!JSON.stringify({ m: err.message, s: err.stack }).includes(PASS) && !err.message.includes("127.0.0.1"));
  // خطأ الواجهة خطأ لا نجاح
  const apiErr = await callVirtualizor(s, { act: "nosuch" }).catch((e) => e);
  assert.equal(apiErr.code, "api-error");
  // 5xx: القراءة تُعاد، الإجراء لا يُكرَّر
  fail500 = 1;
  assert.ok((await callVirtualizor(s, { act: "listvs" })).vs);
  fail500 = 1;
  const before = calls.length;
  const act = await callVirtualizor(s, { act: "start", query: { svs: 101, do: 1 } }).catch((e) => e);
  assert.equal(act.code, "http");
  assert.equal(calls.length - before, 1, "إجراء التشغيل لا يُعاد بعد 5xx");
  // إلغاء
  const ctrl = new AbortController();
  ctrl.abort();
  assert.equal((await callVirtualizor(s, { act: "listvs", signal: ctrl.signal }).catch((e) => e)).code, "aborted");
  // admin بمعاملاته الخاصة
  await callVirtualizor(VZ.layerSettings("admin"), { act: "vs" });
  assert.ok(calls.at(-1).q.adminapikey && !calls.at(-1).q.apikey);
});

await check("no-entitlement", async () => {
  assert.equal((await VZ.user.listMine(BUYER)).code, "no-entitlement");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.start")).code, "no-entitlement");
});

await check("owner-assign", async () => {
  assert.equal((await VZ.owner.assign({ by: OWNER, user: BUYER, vpsId: "999" })).code, "vps-not-found", "تحقق عند المزوّد أولاً");
  const granted = await VZ.owner.assign({ by: OWNER, user: BUYER, vpsId: "101", planId: "std-4" });
  assert.equal(granted.code, "granted");
  assert.equal(granted.data.canonicalUserId, "pn:201000000001");
  assert.ok(granted.data.lastVerified);
  // VPS لمستخدم واحد فقط
  assert.equal((await VZ.owner.assign({ by: OWNER, user: OTHER, vpsId: "101" })).code, "vps-already-assigned");
});

await check("isolation", async () => {
  const mine = await VZ.user.listMine(BUYER);
  assert.deepEqual(mine.data.vps.map((v) => v.vpsId), ["101"], "VPS المستخدم فقط");
  // معرفة VPS ID لمستخدم آخر لا تفتح شيئاً
  assert.equal((await VZ.user.run(BUYER, "102", "vps.start")).code, "no-entitlement");
  assert.equal((await VZ.user.details(BUYER, "102")).code, "no-entitlement");
  assert.equal((await VZ.user.run(OTHER, "101", "vps.start")).code, "no-entitlement");
});

await check("capabilities-and-details", async () => {
  const d = await VZ.user.details(BUYER, "101");
  assert.equal(d.code, "ok");
  assert.equal(d.data.info.hostname, "alpha.example");
  assert.ok(!JSON.stringify(d.data).includes("INTERNAL-NODE-7"), "لا اسم سيرفر داخلي");
  const ids = d.data.actions.map((a) => a.id);
  for (const id of ["vps.start", "vps.restart", "vps.reinstall", "vps.services", "vps.hostname"]) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes("vps.backups") && !ids.includes("vps.restore"), "النسخ الاحتياطية غير مدعومة ⇒ لا تظهر");
  assert.ok(d.data.groups.includes("power"));
  // في مجموعة: إجراءات المحادثة الخاصة لا تظهر
  const inGroup = await VZ.user.details(BUYER, "101", { isGroup: true });
  assert.ok(!inGroup.data.actions.some((a) => ["vps.password", "vps.reinstall", "vps.vnc"].includes(a.id)));
});

await check("actions", async () => {
  VZ.security._resetRateLimits();
  assert.equal((await VZ.user.run(BUYER, "101", "vps.start")).code, "done");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.restart")).code, "needs-confirmation", "إعادة التشغيل تحتاج تأكيداً");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.restart", {}, { confirmed: true })).code, "done");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.hostname", { hostname: "bad host!" }, { confirmed: true })).code, "invalid-hostname");
  const host = await VZ.user.run(BUYER, "101", "vps.hostname", { hostname: "web-01.example.com" }, { confirmed: true });
  assert.equal(host.code, "done");
  assert.equal(calls.at(-1).post.newhost, "web-01.example.com");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.password", { password: "weak" }, { confirmed: true })).code, "invalid-password");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.password", { password: "Str0ng-Passw0rd!" }, { confirmed: true, isGroup: true })).code, "private-only");
  const pw = await VZ.user.run(BUYER, "101", "vps.password", { password: "Str0ng-Passw0rd!" }, { confirmed: true });
  assert.equal(pw.code, "done");
  assert.ok(!JSON.stringify(pw).includes("Str0ng-Passw0rd!"), "كلمة المرور لا تعود في النتيجة");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.reinstall", { osid: "999", password: "Str0ng-Passw0rd!" }, { confirmed: true })).code, "invalid-template", "قالب من قائمة السيرفر فقط");
  const re = await VZ.user.run(BUYER, "101", "vps.reinstall", { osid: "272", password: "Str0ng-Passw0rd!" }, { confirmed: true });
  assert.equal(re.code, "done");
  assert.equal(re.data.os, "Ubuntu 22.04");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.reinstall", { osid: "272", password: "Str0ng-Passw0rd!" }, { confirmed: true })).code, "rate-limited");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.service.restart", { service: "rm -rf" }, { confirmed: true })).code, "invalid-service");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.service.restart", { service: "nginx" }, { confirmed: true })).code, "done");
  // فشل المزوّد ⇒ لا «تم»
  fail500 = 1;
  const down = await VZ.user.run(BUYER, "101", "vps.start");
  assert.equal(down.ok, false);
  assert.equal(down.code, "http");
});

await check("revoke-and-expiry", async () => {
  const [entry] = VZ.entitlements.activeFor(BUYER);
  assert.equal(VZ.owner.control("suspend", entry.id, OWNER, { reason: "late payment" }).code, "suspended");
  assert.equal((await VZ.user.run(BUYER, "101", "vps.start")).code, "no-entitlement", "المعلّق بلا وصول");
  assert.equal(VZ.owner.control("restore", entry.id, OWNER).code, "restored");
  assert.equal((await VZ.user.listMine(BUYER)).code, "ok");
  VZ.owner.control("expiry", entry.id, OWNER, { expiresAt: new Date(Date.now() - 1000).toISOString() });
  assert.equal(VZ.entitlements.inspect(BUYER)[0].status, "expired", "الانتهاء تلقائي");
  assert.equal((await VZ.user.listMine(BUYER)).code, "no-entitlement");
  VZ.owner.control("restore", entry.id, OWNER, { expiresAt: new Date(Date.now() + 86400000).toISOString() });
  assert.equal(VZ.owner.control("revoke", entry.id, OWNER).code, "revoked");
  assert.equal((await VZ.user.details(BUYER, "101")).code, "no-entitlement", "السحب فوري");
  assert.ok(VZ.entitlements.inspect(BUYER)[0].history.length >= 5, "سجل العمليات");
  // بعد السحب يمكن إسناده لغيره
  assert.equal((await VZ.owner.assign({ by: OWNER, user: OTHER, vpsId: "101" })).code, "granted");
});

await check("matrix-and-policy", async () => {
  assert.ok(VZ.capabilities.userSafeActions().every((id) => !id.startsWith("admin.")));
  assert.ok(VZ.capabilities.sensitiveActions().includes("vps.reinstall"));
  assert.equal(VZ.security.authorize({ identity: OTHER, vpsId: "101", action: "admin.vs.list" }).code, "owner-only");
  const matrix = VZ.capabilities.permissionMatrix();
  const doc = JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs/terboo-vps-permissions.json"), "utf8"));
  assert.deepEqual(doc.actions, matrix, "docs/terboo-vps-permissions.json قديم: node tools/terboo-vps-matrix.mjs");
  for (const row of matrix) for (const key of ["action", "endpoint", "apiLayer", "userAllowed", "ownerAllowed", "requiresConfirmation", "requiresBackgroundTask", "requiresEntitlement", "riskLevel", "runtimeVerified", "fallback"]) assert.ok(key in row, key);
  assert.ok(matrix.filter((r) => ["vps.delete", "vps.scaling", "vps.suspend"].includes(r.action)).every((r) => !r.userAllowed));
});

server.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`✅ terboo-virtualizor: ${results.join(" · ")}`);
process.exit(0);
