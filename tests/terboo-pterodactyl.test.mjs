// ═══════════════════════════════════════════════
// 🧪 لوحات المستخدم (Pterodactyl) + حارس SSRF
// ───────────────────────────────────────────────
// لوحة Pterodactyl وهمية محلية (Client API + Application API):
//   1. SSRF: عناوين خاصة/محلية/ميتاداتا مرفوضة · إعادة توجيه لمضيف آخر مرفوضة · المالك وحده يسمح بمضيف خاص.
//   2. إضافة لوحة: اختبار اتصال حقيقي قبل الحفظ · مفتاح خاطئ لا يُحفظ · المفتاح مشفّر ومقنّع دائماً.
//   3. الصلاحيات: الأقسام من user_permissions الفعلية · إجراء بلا صلاحية لا يصل للوحة · الخطِر يحتاج تأكيداً.
//   4. Application API: فحوص قراءة مستقلة · تعليق السيرفر بتأكيد.
//   5. تعديل/استبدال/حذف · الحد الأقصى · المفتاح المشفّر لا يُنقل للوحة أخرى.
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-ptero-"));
process.env.TERBOO_MASTER_KEY_FILE = path.join(tmp, "secure", "master.key");
delete process.env.TERBOO_MASTER_KEY;

const CLIENT_KEY = `ptlc_${"A1b2C3d4E5".repeat(4)}xyz`;
const APP_KEY = `ptla_${"Z9y8X7w6V5".repeat(4)}qrs`;
const BAD_KEY = `ptlc_${"0".repeat(43)}`;

// ── لوحة وهمية ──
const calls = [];
let port = 0;
const json = (res, status, obj) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(obj === null ? "" : JSON.stringify(obj)); };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    calls.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body, auth: req.headers.authorization || "" });
    if (url.pathname === "/redirect-away") { res.writeHead(302, { Location: `http://localhost:${port}/api/client/account` }); res.end(); return; }
    if (url.pathname === "/redirect-meta") { res.writeHead(302, { Location: "http://169.254.169.254/latest/meta-data" }); res.end(); return; }
    if (url.pathname.startsWith("/wrong/")) { res.writeHead(200, { "Content-Type": "text/html" }); res.end("<html>Login</html>"); return; }
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    const isClient = url.pathname.startsWith("/api/client");
    if (isClient ? token !== CLIENT_KEY : token !== APP_KEY) return json(res, token ? 401 : 401, { errors: [{ code: "AuthenticationException", detail: "Unauthenticated." }] });
    const p = url.pathname;
    if (p === "/api/client/account") return json(res, 200, { object: "user", attributes: { id: 7, admin: false, username: "mona", email: "m@example.com", language: "en" } });
    if (p === "/api/client") return json(res, 200, { object: "list", data: [{ object: "server", attributes: { server_owner: false, identifier: "abcd1234", uuid: "abcd1234-0000", name: "Survival", node: "N1", is_suspended: false, is_installing: false, limits: { memory: 2048, disk: 10240, cpu: 200 }, feature_limits: { backups: 2 } } }], meta: { pagination: { total: 1, total_pages: 1 } } });
    if (p === "/api/client/permissions") return json(res, 200, { object: "system_permissions", attributes: { permissions: { control: { keys: { console: "", start: "", stop: "", restart: "" } }, file: { keys: { read: "" } }, backup: { keys: { read: "" } } } } });
    if (p === "/api/client/servers/abcd1234") return json(res, 200, { object: "server", attributes: { server_owner: false, identifier: "abcd1234", uuid: "abcd1234-0000", name: "Survival", node: "N1", limits: { memory: 2048 } }, meta: { is_server_owner: false, user_permissions: ["control.console", "control.start", "control.stop", "file.read", "startup.read"] } });
    if (p === "/api/client/servers/abcd1234/resources") return json(res, 200, { object: "stats", attributes: { current_state: "running", is_suspended: false, resources: { memory_bytes: 524288000, cpu_absolute: 12.345, disk_bytes: 1073741824, network_rx_bytes: 1024, network_tx_bytes: 2048, uptime: 3600000 } } });
    if (p === "/api/client/servers/abcd1234/power" && req.method === "POST") return json(res, 204, null);
    if (p === "/api/client/servers/abcd1234/command" && req.method === "POST") return json(res, 204, null);
    if (p === "/api/client/servers/abcd1234/files/list") return json(res, 200, { object: "list", data: [{ object: "file_object", attributes: { name: "server.properties", is_file: true, size: 1200 } }, { object: "file_object", attributes: { name: "world", is_file: false, size: 4096 } }] });
    if (p === "/api/client/servers/abcd1234/startup") return json(res, 200, { object: "list", data: [{ object: "egg_variable", attributes: { name: "Bot Token", env_variable: "DISCORD_TOKEN", server_value: "super-secret-value", is_editable: true } }, { object: "egg_variable", attributes: { name: "Version", env_variable: "MC_VERSION", server_value: "1.20.4", is_editable: true } }], meta: { startup_command: "java -jar server.jar" } });
    if (p === "/api/application/users") return json(res, 200, { object: "list", data: [], meta: { pagination: { total: 12 } } });
    if (p === "/api/application/servers") return json(res, 200, { object: "list", data: [{ object: "server", attributes: { id: 5, identifier: "ffff0000", name: "Lobby", node: 1, user: 3, suspended: false, limits: { memory: 1024 } } }], meta: { pagination: { total: 1, total_pages: 1 } } });
    if (p === "/api/application/servers/5") return json(res, 200, { object: "server", attributes: { id: 5, identifier: "ffff0000", name: "Lobby", node: 1, user: 3, suspended: false } });
    if (p === "/api/application/nodes") return json(res, 403, { errors: [{ code: "AccessDeniedHttpException", detail: "This action is unauthorized." }] });
    if (p === "/api/application/locations") return json(res, 200, { object: "list", data: [], meta: { pagination: { total: 2 } } });
    if (p === "/api/application/servers/5/suspend" && req.method === "POST") return json(res, 204, null);
    return json(res, 404, { errors: [{ code: "NotFoundHttpException" }] });
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
port = server.address().port;
const BASE = `http://127.0.0.1:${port}`;

const { default: config } = await import("../config.js");
config.integrations = config.integrations || {};
config.integrations.pterodactyl = { enabled: true, maxPanelsPerUser: 3, timeoutMs: 4000, allowPrivateNetworks: false, allowedPrivateHosts: [] };

const G = await import("../src/lib/terboo-net-guard.js");
const store = await import("../src/lib/providers/pterodactyl/pterodactyl-store.js");
const P = await import("../src/lib/providers/pterodactyl/index.js");
const svc = await import("../src/lib/providers/pterodactyl/pterodactyl-service.js");
const { redactSecrets } = await import("../src/lib/terboo-secrets.js");

// قاعدة بيانات في الذاكرة بنفس واجهة getUser/setUser
const users = {};
store._useDatabase({
  getUser: (k) => users[String(k).replace(/@.+/, "")] || null,
  setUser: (k, data) => { const key = String(k).replace(/@.+/, ""); users[key] = { ...(users[key] || {}), ...data }; return users[key]; },
});
const ALICE = "201000000001@s.whatsapp.net";
const BOB = "201000000002@s.whatsapp.net";
const allowLocal = () => { config.integrations.pterodactyl.allowedPrivateHosts = ["127.0.0.1"]; };

const results = [];
async function check(name, fn) {
  await fn();
  results.push(name);
}

await check("ssrf", async () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.0.10", "169.254.169.254", "100.64.1.1", "0.0.0.0", "::1", "fe80::1", "fd00::5", "::ffff:10.0.0.1", "64:ff9b::a9fe:a9fe", "2002:0a00:0001::1"]) {
    assert.ok(G.blockedAddress(ip), `محظور: ${ip}`);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) assert.equal(G.blockedAddress(ip), null, `عام: ${ip}`);
  for (const [u, code] of [["http://localhost:8080", "blocked-host"], ["http://metadata.google.internal", "blocked-host"], ["http://2130706433/", "blocked-address"], ["http://[::1]/", "blocked-address"], ["file:///etc/passwd", "bad-protocol"], ["https://a:b@panel.example.com", "credentials-in-url"], ["http://panel/", "blocked-host"]]) {
    assert.throws(() => G.checkUrl(u), (e) => e.code === code, `${u} ⇒ ${code}`);
  }
  await assert.rejects(G.resolvePublic("localhost"), (e) => e.code === "blocked-address" || e.code === "dns-failed");
  // اتصال فعلي بعنوان محلي بلا إذن المالك ⇒ مرفوض قبل أي اتصال
  const before = calls.length;
  await assert.rejects(G.guardedRequest(`${BASE}/api/client/account`), (e) => e.code === "blocked-address");
  assert.equal(calls.length, before, "لا اتصال بعنوان خاص");
  // مضيف خاص مسموح صراحةً من المالك فقط
  const ok = await G.guardedRequest(`${BASE}/api/client/account`, { allowPrivateHosts: ["127.0.0.1"], headers: { Authorization: `Bearer ${CLIENT_KEY}` } });
  assert.equal(ok.status, 200);
  // إعادة توجيه لمضيف آخر (حتى لو محلي آخر) ⇒ مرفوضة؛ المفتاح لا يغادر
  await assert.rejects(G.guardedRequest(`${BASE}/redirect-away`, { allowPrivateHosts: ["127.0.0.1"] }), (e) => e.code === "redirect-blocked" || e.code === "blocked-host");
  await assert.rejects(G.guardedRequest(`${BASE}/redirect-meta`, { allowPrivateHosts: ["127.0.0.1"] }), (e) => e.code === "blocked-address");
});

await check("add-client-panel", async () => {
  // رابط خاص بلا إذن المالك
  let r = await P.addPanel(ALICE, { baseUrl: BASE, apiType: "client", apiKey: CLIENT_KEY });
  assert.equal(r.code, "blocked-address");
  allowLocal();
  // نوع مفتاح خاطئ ⇒ قبل أي اتصال
  r = await P.addPanel(ALICE, { baseUrl: BASE, apiType: "client", apiKey: APP_KEY });
  assert.equal(r.code, "key-type-mismatch");
  r = await P.addPanel(ALICE, { baseUrl: BASE, apiType: "client", apiKey: "hello" });
  assert.equal(r.code, "invalid-key");
  // مفتاح مرفوض من اللوحة ⇒ لا يُحفظ شيء
  r = await P.addPanel(ALICE, { baseUrl: BASE, apiType: "client", apiKey: BAD_KEY });
  assert.equal(r.code, "auth");
  assert.equal(P.listPanels(ALICE).length, 0, "فشل الاختبار لا يحفظ");
  // رابط يعيد صفحة HTML (ليس API)
  r = await P.addPanel(ALICE, { baseUrl: `${BASE}/wrong`, apiType: "client", apiKey: CLIENT_KEY });
  assert.equal(r.code, "invalid-response");
  // نجاح: اختبار ثم حفظ مشفّر
  r = await P.addPanel(ALICE, { label: "My Panel", baseUrl: `${BASE}/api/client`, apiType: "client", apiKey: CLIENT_KEY });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.data.panel.key, "••••••••••••");
  assert.equal(r.data.panel.capabilities.account.username, "mona");
  assert.equal(r.data.panel.capabilities.serverCount, 1);
  const raw = JSON.stringify(users);
  assert.ok(!raw.includes(CLIENT_KEY), "المفتاح لا يُخزَّن نصاً واضحاً");
  assert.ok(raw.includes("tv1:"), "مشفّر بصيغة الخزنة");
  assert.ok(!JSON.stringify(P.listPanels(ALICE)).includes("tv1:"), "العرض بلا تشفير ولا مفتاح");
  assert.equal(users["201000000001"].integrations.pterodactyl[0].baseUrl, BASE, "الرابط الأساسي بلا /api");
  // مكرر
  r = await P.addPanel(ALICE, { baseUrl: BASE, apiType: "client", apiKey: CLIENT_KEY });
  assert.equal(r.code, "duplicate");
  // المفتاح أصبح سراً مسجّلاً ⇒ يُحجب من أي نص
  assert.ok(!redactSecrets(`token=${CLIENT_KEY}`).includes(CLIENT_KEY));
  // مستخدم آخر لا يرى لوحات غيره
  assert.equal(P.listPanels(BOB).length, 0);
});

await check("servers-and-permissions", async () => {
  const panel = P.listPanels(ALICE)[0];
  const list = await P.servers(ALICE, panel.id);
  assert.equal(list.ok, true);
  assert.equal(list.data.servers[0].id, "abcd1234");
  // بوب لا يستطيع استخدام معرّف لوحة أليس
  assert.equal((await P.servers(BOB, panel.id)).code, "not-found");
  const info = await P.serverInfo(ALICE, panel.id, "abcd1234");
  assert.deepEqual(info.data.sections, ["resources", "console", "power", "files", "startup"]);
  // بلا صلاحية backup.read ⇒ لا طلب للوحة أصلاً
  const before = calls.length;
  assert.equal((await P.serverAction(ALICE, panel.id, "abcd1234", "backups")).code, "permission-denied");
  assert.equal((await P.serverAction(ALICE, panel.id, "abcd1234", "databases")).code, "permission-denied");
  assert.equal(calls.length, before, "لا استدعاء بلا صلاحية");
  // الخطِر يحتاج تأكيداً
  assert.equal((await P.serverAction(ALICE, panel.id, "abcd1234", "power.stop")).code, "needs-confirmation");
  const start = await P.serverAction(ALICE, panel.id, "abcd1234", "power.start");
  assert.equal(start.ok, true);
  assert.equal(JSON.parse(calls.at(-1).body).signal, "start");
  assert.equal((await P.serverAction(ALICE, panel.id, "abcd1234", "power.stop", {}, { confirmed: true })).ok, true);
  // restart بلا صلاحية control.restart
  assert.equal((await P.serverAction(ALICE, panel.id, "abcd1234", "power.restart")).code, "permission-denied");
  const res = await P.serverAction(ALICE, panel.id, "abcd1234", "resources");
  assert.equal(res.data.state, "running");
  assert.equal(res.data.memory, "500.0 MB");
  assert.equal((await P.serverAction(ALICE, panel.id, "abcd1234", "command", { command: "say hi\nstop" })).code, "invalid-command");
  assert.equal((await P.serverAction(ALICE, panel.id, "abcd1234", "command", { command: "say hi" })).ok, true);
  const files = await P.serverAction(ALICE, panel.id, "abcd1234", "files", { directory: "/" });
  assert.equal(files.data.entries.length, 2);
  assert.equal((await P.serverAction(ALICE, panel.id, "abcd1234", "files", { directory: "/../etc" })).code, "invalid-path");
  const startup = await P.serverAction(ALICE, panel.id, "abcd1234", "startup");
  assert.equal(startup.data.variables[0].value, "••••••••", "متغير حساس مقنّع");
  assert.equal(startup.data.variables[1].value, "1.20.4");
  assert.equal((await P.serverAction(ALICE, panel.id, "../x", "resources")).code, "invalid-server");
  // كل الطلبات تحمل المفتاح في الترويسة فقط (لا في الرابط)
  assert.ok(calls.every((c) => !JSON.stringify(c.query).includes(CLIENT_KEY)));
});

await check("application-panel", async () => {
  const r = await P.addPanel(ALICE, { label: "Admin", baseUrl: BASE, apiType: "application", apiKey: APP_KEY });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.data.panel.capabilities.readable, { users: true, servers: true, nodes: false, locations: true });
  assert.equal(r.data.panel.capabilities.writeVerified, false, "صلاحية الكتابة غير مؤكدة قبل الاستخدام");
  const list = await P.servers(ALICE, r.data.panel.id);
  assert.equal(list.data.servers[0].name, "Lobby");
  assert.equal((await P.serverAction(ALICE, r.data.panel.id, "5", "suspend")).code, "needs-confirmation");
  assert.equal((await P.serverAction(ALICE, r.data.panel.id, "5", "suspend", {}, { confirmed: true })).ok, true);
  assert.equal((await P.serverAction(ALICE, r.data.panel.id, "5", "files")).code, "unsupported");
});

await check("edit-replace-delete", async () => {
  const [client] = P.listPanels(ALICE);
  assert.equal(P.renamePanel(ALICE, client.id, "Game Panel").data.panel.label, "Game Panel");
  assert.equal(P.renamePanel(ALICE, client.id, "x".repeat(40)).code, "invalid-label");
  // مفتاح جديد خاطئ ⇒ القديم يبقى يعمل
  assert.equal((await P.replaceKey(ALICE, client.id, BAD_KEY)).code, "auth");
  assert.equal((await P.testPanel(ALICE, client.id)).ok, true);
  // نقل المفتاح المشفّر إلى لوحة أخرى ⇒ لا يُفك (AAD)
  const panels = users["201000000001"].integrations.pterodactyl;
  const moved = panels.map((p) => ({ ...p, encryptedCredential: panels[0].encryptedCredential }));
  users["201000000001"].integrations.pterodactyl = moved;
  assert.equal((await P.servers(ALICE, moved[1].id)).code, "credential-unreadable");
  users["201000000001"].integrations.pterodactyl = panels;
  // الحد الأقصى
  svc._resetPanelService();
  assert.equal((await P.addPanel(ALICE, { baseUrl: `${BASE}/p3`, apiType: "client", apiKey: BAD_KEY })).code, "auth");
  users["201000000001"].integrations.pterodactyl = [...panels, { ...panels[0], id: "zz000001" }];
  assert.equal((await P.addPanel(ALICE, { baseUrl: `${BASE}/p4`, apiType: "client", apiKey: CLIENT_KEY })).code, "limit");
  users["201000000001"].integrations.pterodactyl = panels;
  // حذف
  assert.equal(P.deletePanel(ALICE, client.id).ok, true);
  assert.equal(P.listPanels(ALICE).length, 1);
  assert.equal((await P.servers(ALICE, client.id)).code, "not-found");
});

server.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`✅ terboo-pterodactyl: ${results.join(" · ")}`);
process.exit(0);
