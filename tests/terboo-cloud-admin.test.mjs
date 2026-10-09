// ═══════════════════════════════════════════════
// 🧪 لوحات المالك: Pterodactyl Application API الموحّدة + Virtualizor admin (4085)
// ───────────────────────────────────────────────
// خادما HTTP وهميان بحالة حقيقية. يثبت:
// · البلوقنات القديمة (delserver · قائمة المستخدمين · حذف مدير) تعمل عبر الطبقة الموحّدة بنفس منطقها
//   (لا axios مباشر) · الحذف متحقق (قراءة بعده = 404) · حذف «نجح» عند المزوّد لكنه باقٍ ⇒ لا «تم»
// · المفتاح لا يظهر في أي رد · ترقيم الصفحات · التعليق بتحقق
// · Virtualizor admin: معلومات · تشغيل/إيقاف بتحقق الحالة · لا تكرار لما هو مطبّق · تعليق/إلغاء · المستخدمون
// · لوحة إدارة معطلة ⇒ admin-disabled صريح.
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const BOT = "201111111111";
const OWNER = "201000000999@s.whatsapp.net";
const PTLA = `ptla_${"A".repeat(43)}`;

// ── Pterodactyl وهمي ──
const ptero = { servers: Object.fromEntries(Array.from({ length: 120 }, (_, i) => [i + 1, { id: i + 1, name: `srv-${i + 1}`, suspended: false, user: 1 }])), users: { 1: { id: 1, username: "admin", email: "a@x.io", root_admin: true }, 2: { id: 2, username: "bob", email: "b@x.io", root_admin: true } }, stuck: new Set(), calls: [] };
const pteroServer = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  ptero.calls.push({ method: req.method, path: url.pathname, auth: req.headers.authorization });
  const send = (status, obj) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(obj === undefined ? "" : JSON.stringify(obj)); };
  if (req.headers.authorization !== `Bearer ${PTLA}`) return send(401, { errors: [{ code: "AuthenticationException" }] });
  const parts = url.pathname.split("/").filter(Boolean); // api application <kind> <id> <op>
  const [, , kind, id, op] = parts;
  const table = ptero[kind];
  if (!table) return send(404, { errors: [{ code: "NotFound" }] });
  if (!id) {
    const rows = Object.values(table);
    const per = Number(url.searchParams.get("per_page") || 50);
    const page = Number(url.searchParams.get("page") || 1);
    return send(200, { data: rows.slice((page - 1) * per, page * per).map((attributes) => ({ attributes })), meta: { pagination: { total: rows.length, total_pages: Math.ceil(rows.length / per), current_page: page } } });
  }
  const row = table[id];
  if (!row) return send(404, { errors: [{ code: "NotFoundHttpException" }] });
  if (req.method === "DELETE") { if (!ptero.stuck.has(Number(id))) delete table[id]; return send(204); }
  if (req.method === "POST" && op === "suspend") { row.suspended = true; return send(204); }
  if (req.method === "POST" && op === "unsuspend") { row.suspended = false; return send(204); }
  return send(200, { attributes: row });
});
await new Promise((r) => pteroServer.listen(0, "127.0.0.1", r));

// ── Virtualizor admin وهمي ──
const ADMIN_KEY = "ADMINKEY00000001";
const vz = { vps: { 501: { vpsid: "501", vps_name: "v501", hostname: "node.example", status: 1, suspended: 0 }, 502: { vpsid: "502", vps_name: "v502", hostname: "two.example", status: 0, suspended: 0 } }, calls: [] };
const vzServer = http.createServer((req, res) => {
  const q = Object.fromEntries(new URL(req.url, "http://x").searchParams);
  vz.calls.push(q);
  const send = (obj) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
  if (q.adminapikey !== ADMIN_KEY) { res.writeHead(200, { "Content-Type": "text/html" }); res.end("<html>Login</html>"); return; }
  if (q.act === "users") return send({ users: { 7: { uid: 7, email: "buyer@x.io", num_vs: 1 } } });
  if (q.act !== "vs") return send({ error: ["unknown act"] });
  if (q.suspend) { vz.vps[q.suspend].suspended = 1; return send({ done: 1 }); }
  if (q.unsuspend) { vz.vps[q.unsuspend].suspended = 0; return send({ done: 1 }); }
  if (q.action) { vz.vps[q.vpsid].status = ["start", "restart"].includes(q.action) ? 1 : 0; return send({ done: 1 }); }
  const list = q.vpsid ? Object.fromEntries(Object.entries(vz.vps).filter(([id]) => id === q.vpsid)) : vz.vps;
  return send({ vs: list });
});
await new Promise((r) => vzServer.listen(0, "127.0.0.1", r));

global.terbooProviders = { map: { GeminiAPI: async () => ({ text: JSON.stringify({ decision: "CHAT", reply: "تمام" }) }) }, loadedAt: Date.now() + 3_600_000, names: ["GeminiAPI"] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-cloud-admin-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
process.env.TERBOO_VPS_STORE = path.join(tmp, "vps.json");
const config = (await import("../config.js")).default;
config.bot.primaryNumber = BOT;
config.owner.number = [OWNER.split("@")[0]];
config.pterodactyl = { server1: { domain: `http://127.0.0.1:${pteroServer.address().port}`, apikey: PTLA, capikey: "", egg: "15", nestid: "5", location: "1" }, server2: { domain: "", apikey: "" }, server3: {}, server4: {}, server5: {} };
config.virtualizor = { ...(config.virtualizor || {}), enabled: true, admin: { enabled: true, url: `http://127.0.0.1:${vzServer.address().port}`, apiKey: ADMIN_KEY, apiPassword: "ADMINPASS000001x", verifyTLS: true, timeoutMs: 3000, maxRetries: 0 } };
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
db.setting("registrationRequired", false);
db.setUser(OWNER, { isRegistered: true, regName: "مالك", language: "ar" });
const memory = await import("../src/lib/terboo-ai-memory.js");
memory.initMemory(path.join(tmp, "memory"));
const { loadPlugins } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(process.cwd(), "plugins"));
const { messageHandler } = await import("../src/handler.js");
const A = await import("../src/lib/providers/pterodactyl/pterodactyl-admin.js");
const VO = await import("../src/lib/providers/virtualizor/virtualizor-owner-service.js");

const outbox = [];
const sock = {
  user: { id: `${BOT}:1@s.whatsapp.net` },
  sendMessage: async (chat, content) => { outbox.push({ chat, text: content?.text || content?.caption || "" }); return { key: { id: `M${outbox.length}`, remoteJid: chat, fromMe: true } }; },
  relayMessage: async (chat, message, opts) => {
    const node = message?.viewOnceMessage?.message?.interactiveMessage || message?.interactiveMessage;
    const buttons = (node?.nativeFlowMessage?.buttons || []).map((b) => { try { return JSON.parse(b.buttonParamsJson || "{}").id; } catch { return null; } });
    outbox.push({ chat, text: node?.body?.text || "", buttons });
    return opts?.messageId || `R${outbox.length}`;
  },
  sendPresenceUpdate: async () => { }, readMessages: async () => { },
};
let seq = 0;
async function say(text) {
  const before = outbox.length;
  await messageHandler({ key: { remoteJid: OWNER, fromMe: false, id: `CA${++seq}X${Date.now()}` }, message: { conversation: text }, pushName: "مالك", messageTimestamp: Math.floor(Date.now() / 1000) }, sock);
  await new Promise((r) => setTimeout(r, 40));
  return outbox.slice(before).map((x) => x.text).join("\n");
}
const results = [];
const check = async (name, fn) => { await fn(); results.push(name); };

await check("ptero-panels-and-pages", async () => {
  const panels = A.listAdminPanels();
  assert.deepEqual(panels.map((p) => p.configured), [true, false, false, false, false]);
  assert.ok(!JSON.stringify(panels).includes(PTLA), "بلا مفاتيح");
  const servers = await A.listServers("v1");
  assert.equal(servers.ok, true);
  assert.equal(servers.data.length, 120, "كل الصفحات");
  assert.equal((await A.listServers("v2")).code, "not-configured");
});

await check("legacy-delserver-verified", async () => {
  const reply = await say(".delserverv1 7");
  assert.match(reply, /تم حذف الخادم/);
  assert.equal(ptero.servers[7], undefined);
  assert.ok(ptero.calls.some((c) => c.method === "DELETE" && c.path === "/api/application/servers/7"));
  assert.ok(ptero.calls.filter((c) => c.path === "/api/application/servers/7" && c.method === "GET").length >= 2, "قراءة بعد الحذف للتحقق");
  assert.doesNotMatch(reply, new RegExp(PTLA));
  // المزوّد قبل الحذف لكن الخادم باقٍ ⇒ لا «تم»
  ptero.stuck.add(8);
  const stuck = await say(".delserverv1 8");
  assert.doesNotMatch(stuck, /تم حذف الخادم/, "لا ادعاء نجاح بلا دليل");
  assert.ok(ptero.servers[8]);
});

await check("legacy-list-users", async () => {
  const reply = await say(".قائمة_المستخدمين_v1");
  assert.match(reply, /bob/);
  assert.ok(ptero.calls.every((c) => c.auth === `Bearer ${PTLA}`));
});

await check("ptero-suspend-verified", async () => {
  const out = await A.setSuspended("v1", 9, true);
  assert.equal(out.verified, true);
  assert.equal(ptero.servers[9].suspended, true);
  assert.equal((await A.setSuspended("v1", 9, true)).code, "already", "لا طلب مكرر");
  const deleted = await A.deleteUser("v1", 2);
  assert.equal(deleted.verified, true);
});

await check("vpsadmin-command", async () => {
  const node = await say(".vpsadmin node 501");
  assert.match(node, /الحالة: يعمل/);
  const before = outbox.length;
  const ask = await say(".vpsadmin power 501 stop");
  assert.match(ask, /إيقاف VPS 501/);
  assert.equal(vz.vps[501].status, 1, "لا إيقاف قبل التأكيد");
  const ok = outbox.slice(before).flatMap((x) => x.buttons || []).find((b) => /vpsadmin ok /.test(b));
  const done = await say(ok);
  assert.match(done, /الحالة: متوقف/, "الحالة الفعلية بعد الإجراء");
  assert.equal(vz.vps[501].status, 0);
  await say(".vpsadmin power 501 start");
  assert.equal(vz.vps[501].status, 1, "التشغيل بلا تأكيد");
});

await check("virtualizor-admin", async () => {
  const info = await VO.adminInfo("501");
  assert.equal(info.ok, true);
  assert.equal(info.data.status, "running");
  const fast = { verify: { gapMs: 10 } };
  const stop = await VO.adminPower("501", "stop", fast);
  assert.equal(stop.verified, true);
  assert.equal(stop.data.status, "stopped");
  const before = vz.calls.length;
  assert.equal((await VO.adminPower("501", "stop", fast)).code, "already");
  assert.ok(!vz.calls.slice(before).some((q) => q.action), "متوقف أصلاً ⇒ لا طلب إيقاف");
  assert.equal((await VO.adminPower("501", "start", fast)).verified, true);
  const sus = await VO.adminSuspend("502", true, fast);
  assert.equal(sus.verified, true);
  assert.equal(sus.data.status, "suspended");
  assert.equal((await VO.adminSuspend("502", false, fast)).verified, true);
  const users = await VO.adminUsers();
  assert.deepEqual(users.data, [{ uid: "7", email: "buyer@x.io", vps: 1 }]);
  assert.equal((await VO.adminInfo("abc")).code, "vps-id-invalid");
  assert.equal((await VO.adminPower("999", "start")).code, "vps-not-found");
  config.virtualizor.admin.enabled = false;
  assert.equal((await VO.adminInfo("501")).code, "admin-disabled");
});

console.log(`✅ terboo-cloud-admin: ${results.join(" · ")}`);
pteroServer.close();
vzServer.close();
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* مجلد مؤقت */ }
process.exit(0);
