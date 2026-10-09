// ═══════════════════════════════════════════════
// 🧪 Terboo V6 §21 §22 — إنشاء VPS حقيقي (Virtualizor addvs) عبر خادم إدارة وهمي بحالة حقيقية
// ───────────────────────────────────────────────
//  1. غير مضبوط ⇒ بطاقة «الناقص» بلا أي طلب للمزوّد
//  2. تحقق المدخلات: باقة مجهولة · اقتصادية غير معروضة افتراضياً · اسم مضيف · نظام غير مسموح · مشترٍ
//  3. Preflight: عقدة غير موجودة · اسم مضيف مستعمل
//  4. المسار الكامل من واتساب: create ⇒ بطاقة تأكيد ⇒ ok ⇒ مهمة ⇒ addvs بمعاملات الإعداد الحقيقية
//     ⇒ متابعة حتى يظهر الـVPS (يظهر بعد قراءات) ⇒ إسناد للمشتري ⇒ إشعار المالك والمشتري (خاصه فقط)
//     وكلمة المرور لا تظهر في أي رسالة/سجل/ملف طلبات/تدقيق
//  5. تكرار نفس الطلب ⇒ لا addvs ثانٍ
//  6. رفض المزوّد ⇒ failed بلا إسناد ولا «تم»
//  7. خطأ شبكة بعد وصول الطلب فعلاً ⇒ يُعثر عليه باسم المضيف ويكتمل (لا إنشاء ثانٍ)
//  8. لم يظهر خلال المهلة ⇒ needs-attention بلا حذف
//  9. استئناف بعد إعادة تشغيل وسط الإرسال بلا رقم ⇒ needs-attention بلا إعادة إنشاء
// 10. غير المالك: الأمر واللغة الطبيعية مرفوضان بلا أي طلب للمزوّد
// 11. أوامر DigitalOcean القديمة غير مسجّلة افتراضياً · الباقات الاقتصادية مخفية افتراضياً
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const BOT = "201111111116";
const OWNER = "201000000998@s.whatsapp.net";
const BUYER = "201012345678@s.whatsapp.net";
const STRANGER = "201200000066@s.whatsapp.net";
const ADMIN_KEY = "PROVADMINKEY0001";
const ADMIN_PASS = "PROVADMINPASS001x";

// ── Virtualizor admin وهمي بحالة حقيقية ──
const vz = { vps: { 700: { vpsid: "700", hostname: "taken.example", status: 1 } }, servers: { 3: { serid: 3, server_name: "node-3" } }, nextId: 900, calls: [], posts: [], appearAfterReads: 2, reads: 0, reject: false, dropAfterCreate: false, neverAppear: false };
const vzServer = http.createServer((req, res) => {
  const q = Object.fromEntries(new URL(req.url, "http://x").searchParams);
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    const post = Object.fromEntries(new URLSearchParams(body));
    vz.calls.push({ act: q.act, query: q, post });
    const send = (obj) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
    if (q.adminapikey !== ADMIN_KEY || q.adminapipass !== ADMIN_PASS) { res.writeHead(200, { "Content-Type": "text/html" }); res.end("<html>Login</html>"); return; }
    if (q.act === "servers") return send({ servers: vz.servers });
    if (q.act === "addvs") {
      vz.posts.push(post);
      if (vz.reject) return send({ error: ["Not enough IPs"] });
      const id = String(vz.nextId++);
      vz.vps[id] = { vpsid: id, hostname: post.hostname, status: 1, hidden: !vz.neverAppear ? vz.appearAfterReads : Infinity };
      if (vz.dropAfterCreate) { res.destroy(); return; }
      return send({ done: { msg: "VPS Created", vpsid: id } });
    }
    if (q.act === "vs") {
      if (q.delete) { delete vz.vps[q.delete]; return send({ done: 1 }); }
      vz.reads += 1;
      const visible = Object.fromEntries(Object.entries(vz.vps).filter(([id, v]) => {
        if (v.hidden > 0) { v.hidden -= 1; return false; }
        return !q.vpsid || id === q.vpsid;
      }).map(([id, v]) => [id, { vpsid: v.vpsid, hostname: v.hostname, status: v.status }]));
      return send({ vs: visible });
    }
    return send({ error: ["unknown act"] });
  });
});
await new Promise((r) => vzServer.listen(0, "127.0.0.1", r));

global.terbooProviders = { map: { GeminiAPI: async () => ({ text: JSON.stringify({ decision: "CHAT", reply: "تمام" }) }) }, loadedAt: Date.now() + 3_600_000, names: ["GeminiAPI"] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-provision-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
process.env.TERBOO_VPS_STORE = path.join(tmp, "vps.json");
process.env.TERBOO_VPS_ORDERS = path.join(tmp, "orders.json");
process.env.TERBOO_AGENT_STATE_DIR = path.join(tmp, "agent");
const config = (await import("../config.js")).default;
config.bot.primaryNumber = BOT;
config.owner.number = [OWNER.split("@")[0]];
config.virtualizor = {
  ...(config.virtualizor || {}),
  enabled: true,
  admin: { enabled: true, url: `http://127.0.0.1:${vzServer.address().port}`, apiKey: ADMIN_KEY, apiPassword: ADMIN_PASS, verifyTLS: true, timeoutMs: 3000, maxRetries: 0 },
  plans: { standard: [], economy: [] },
  provisioning: { enabled: false },
};
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
const memory = await import("../src/lib/terboo-ai-memory.js");
memory.initMemory(path.join(tmp, "memory"));
const { loadPlugins, getPlugin } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(process.cwd(), "plugins"));
getPlugin("vpsadmin").config.cooldown = 0;
const { messageHandler } = await import("../src/handler.js");
const { installTaskRunners } = await import("../src/lib/terboo-task-runners.js");
const provisioner = await import("../src/lib/providers/virtualizor/virtualizor-provisioner.js");
const entitlements = await import("../src/lib/providers/virtualizor/virtualizor-entitlements.js");
const { identityOf } = await import("../src/lib/terboo-identity.js");
const { listAuditEvents } = await import("../src/lib/terboo-agent-audit.js");
const { getTask } = await import("../src/lib/terboo-task-queue.js");
const { offeredTiers, plans } = await import("../src/lib/terboo-vps-plans.js");
for (const jid of [OWNER, BUYER, STRANGER]) db.setUser(jid, { language: "ar" });

const outbox = [];
const consoleLines = [];
for (const level of ["log", "warn", "error", "info"]) {
  const original = console[level];
  console[level] = (...args) => { consoleLines.push(args.map(String).join(" ")); original.apply(console, args); };
}
const sock = {
  user: { id: `${BOT}:1@s.whatsapp.net`, jid: `${BOT}@s.whatsapp.net` },
  ws: { readyState: 1 },
  sendMessage: async (chat, content) => { outbox.push({ chat, text: content?.text || content?.caption || "" }); return { key: { id: `S${outbox.length}`, remoteJid: chat, fromMe: true } }; },
  relayMessage: async (chat, message) => {
    const node = message?.viewOnceMessage?.message?.interactiveMessage || message?.interactiveMessage;
    const buttons = (node?.nativeFlowMessage?.buttons || []).map((b) => JSON.parse(b.buttonParamsJson || "{}").id).filter(Boolean);
    outbox.push({ chat, text: node?.body?.text || "", buttons });
    return "R";
  },
  sendPresenceUpdate: async () => true,
  readMessages: async () => true,
  waUploadToServer: async () => ({ mediaUrl: "https://mmg.example/x", directPath: "/x" }),
};
installTaskRunners({ getSocket: () => sock });

let seq = 0;
async function say(sender, text, { button = null } = {}) {
  const before = outbox.length;
  const id = `PV${++seq}X${Date.now().toString(36).toUpperCase()}`;
  const message = button
    ? { interactiveResponseMessage: { body: { text: "" }, nativeFlowResponseMessage: { name: "quick_reply", paramsJson: JSON.stringify({ id: button }), version: 3 } } }
    : { conversation: text };
  await messageHandler({ key: { remoteJid: sender, fromMe: false, id }, message, pushName: "Tester", messageTimestamp: Math.floor(Date.now() / 1000) }, sock);
  await new Promise((r) => setTimeout(r, 40));
  const fresh = outbox.slice(before);
  return { text: fresh.filter((x) => x.chat === sender).map((x) => x.text).join("\n"), buttons: fresh.flatMap((x) => x.buttons || []), all: fresh };
}
async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return true; await new Promise((r) => setTimeout(r, 25)); }
  return false;
}
const addvsCount = () => vz.calls.filter((c) => c.act === "addvs").length;
const buyer = identityOf(BUYER);
const ownerId = identityOf(OWNER).canonical;

// 1) غير مضبوط
let r = await say(OWNER, ".vpsadmin create");
assert.match(r.text, /غير مفعّل بعد/, "بطاقة الناقص");
assert.match(r.text, /provisioning\.enabled/);
assert.equal(vz.calls.length, 0, "لا طلب للمزوّد قبل الضبط");

config.virtualizor.provisioning = { enabled: true, layer: "admin", virt: "kvm", serverId: "3", uid: "41", planMap: { "std-1": 5 }, osids: ["100", "101"], hostnameSuffix: "", verifyTimeoutMs: 3000, pollMs: 50, rollbackOnFailure: true, credentialDelivery: "set-password" };
assert.equal(provisioner.readiness().ready, true);

// 2) التحقق
const plan = (over = {}) => provisioner.planOrder({ by: ownerId, buyer, planId: "std-1", osid: "100", hostname: "web1.example.com", ...over });
assert.equal((await plan({ planId: "std-99" })).code, "plan-unknown");
assert.equal((await plan({ planId: "eco-1" })).code, "plan-unknown", "الاقتصادية غير موجودة أصلاً افتراضياً");
config.virtualizor.plans.economyEnabled = true;
assert.equal((await plan({ planId: "eco-1", hostname: "eco.example.com" })).code !== "plan-unknown", true, "تظهر بتفعيل المالك");
config.virtualizor.plans.economyEnabled = false;
assert.equal((await plan({ hostname: "Bad_Host!" })).code, "hostname-invalid");
assert.equal((await plan({ osid: "999" })).code, "os-not-allowed");
assert.equal((await plan({ buyer: {} })).code, "buyer-invalid");
// تنظيف الطلب الاقتصادي المخطط أعلاه
for (const o of provisioner.listOrders({ status: "planned" })) provisioner.cancelOrder(o.id, ownerId);

// 3) Preflight
config.virtualizor.provisioning.serverId = "9";
assert.equal((await plan()).code, "node-not-found");
config.virtualizor.provisioning.serverId = "3";
assert.equal((await plan({ hostname: "taken.example" })).code, "hostname-taken");
assert.equal(addvsCount(), 0, "لا إنشاء أثناء التخطيط");

// 4) المسار الكامل من واتساب
r = await say(OWNER, ".vpsadmin create 201012345678 std-1 100 web1.example.com 30");
assert.match(r.text, /تأكيد إنشاء VPS جديد/, `بطاقة التأكيد: ${r.text}`);
const okButton = r.buttons.find((b) => / ok /.test(b));
assert.ok(okButton, "زر تأكيد");
assert.equal(addvsCount(), 0, "لا إنشاء قبل التأكيد");
r = await say(OWNER, "", { button: okButton });
assert.match(r.text, /بدأ الإنشاء/);
const taskId = r.text.match(/TASK-[A-Z0-9-]+/)?.[0];
assert.ok(taskId, "رقم المهمة");
assert.ok(await waitFor(() => getTask(taskId)?.status === "completed"), `المهمة اكتملت: ${getTask(taskId)?.status} ${getTask(taskId)?.error || ""}`);
assert.equal(addvsCount(), 1, "إنشاء واحد");
const post = vz.posts[0];
assert.deepEqual(
  { addvps: post.addvps, virt: post.virt, uid: post.uid, serid: post.serid, plid: post.plid, osid: post.osid, hostname: post.hostname, num_ips: post.num_ips, cores: post.cores, ram: post.ram, space: post.space, bandwidth: post.bandwidth },
  { addvps: "1", virt: "kvm", uid: "41", serid: "3", plid: "5", osid: "100", hostname: "web1.example.com", num_ips: "1", cores: "4", ram: String(8 * 1024), space: "120", bandwidth: "20000" },
  "معاملات addvs من الإعداد والباقة الحقيقية",
);
const rootpass = post.rootpass;
assert.ok(rootpass && rootpass.length >= 20, "كلمة مرور قوية مولّدة");
assert.ok(vz.reads >= 3, "تحقق بقراءات حقيقية حتى ظهر الـVPS");
const order = provisioner.listOrders({ status: "completed" })[0];
assert.ok(order?.vpsId, "الطلب مكتمل برقم VPS");
const held = entitlements.holderOf(order.vpsId);
assert.ok(held && entitlements.belongsTo(held, buyer), "أُسند للمشتري");
assert.match(outbox.filter((x) => x.chat === OWNER).map((x) => x.text).join("\n"), /أُنشئ VPS \d+/, "إشعار المالك بعد التحقق");
const buyerMsgs = outbox.filter((x) => x.chat === BUYER).map((x) => x.text).join("\n");
assert.match(buyerMsgs, /جاهز/, "إشعار المشتري في خاصه");
const everything = [JSON.stringify(outbox), consoleLines.join("\n"), fs.readFileSync(process.env.TERBOO_VPS_ORDERS, "utf8"), JSON.stringify(listAuditEvents({ limit: 200 })), fs.existsSync(process.env.TERBOO_TASKS_PATH) ? fs.readFileSync(process.env.TERBOO_TASKS_PATH, "utf8") : ""].join("\n");
assert.ok(!everything.includes(rootpass), "كلمة مرور root لا تظهر في أي رسالة/سجل/ملف");
assert.ok(!everything.includes(ADMIN_KEY) && !everything.includes(ADMIN_PASS), "مفاتيح الإدارة لا تظهر");
assert.ok(listAuditEvents({ limit: 200 }).some((e) => e.type === "vps.provision.completed"), "تدقيق الاكتمال");

// 5) تكرار
r = await say(OWNER, ".vpsadmin create 201012345678 std-1 100 web1.example.com 30");
assert.match(r.text, /موجود بالفعل/, "الطلب المكرر لا يُنشأ مرتين");
assert.equal(addvsCount(), 1);

// 6) رفض المزوّد
vz.reject = true;
let planned = await plan({ hostname: "rej.example.com" });
let out = await provisioner.execute(planned.data.id, { by: ownerId });
vz.reject = false;
assert.equal(out.ok, false);
assert.equal(out.code, "provision-failed");
assert.equal(provisioner.getOrder(planned.data.id).status, "failed");
assert.equal(entitlements.list().filter((e) => e.notes === `provisioned:${planned.data.id}`).length, 0, "لا إسناد عند الفشل");

// 7) خطأ شبكة بعد وصول الطلب
vz.dropAfterCreate = true;
planned = await plan({ hostname: "drop.example.com" });
const before = addvsCount();
out = await provisioner.execute(planned.data.id, { by: ownerId });
vz.dropAfterCreate = false;
assert.equal(out.ok, true, `يُعثر عليه باسم المضيف ويكتمل: ${out.code}`);
assert.equal(addvsCount() - before, 1, "إنشاء واحد فقط رغم الخطأ");

// 8) لم يظهر خلال المهلة ⇒ انتباه بلا حذف
vz.neverAppear = true;
planned = await plan({ hostname: "ghost.example.com" });
out = await provisioner.execute(planned.data.id, { by: ownerId });
vz.neverAppear = false;
assert.equal(out.code, "verify-timeout");
assert.equal(provisioner.getOrder(planned.data.id).status, "needs-attention");
assert.ok(!vz.calls.some((c) => c.query.delete), "لا حذف عند المجهول");

// 9) استئناف وسط الإرسال بلا رقم
planned = await plan({ hostname: "cut.example.com" });
const state = JSON.parse(fs.readFileSync(process.env.TERBOO_VPS_ORDERS, "utf8"));
state.orders.find((o) => o.id === planned.data.id).status = "provisioning";
fs.writeFileSync(process.env.TERBOO_VPS_ORDERS, JSON.stringify(state));
const beforeResume = addvsCount();
out = await provisioner.execute(planned.data.id, { by: ownerId });
assert.equal(out.code, "needs-attention");
assert.equal(addvsCount(), beforeResume, "لا إعادة إنشاء بعد الانقطاع");

// 10) غير المالك
const callsBefore = vz.calls.length;
r = await say(STRANGER, ".vpsadmin create 201012345678 std-1 100 x1.example.com");
assert.doesNotMatch(r.text, /تأكيد إنشاء/, "الأمر مرفوض لغير المالك");
r = await say(STRANGER, "انشئ vps باقة std-1 للرقم 201012345678 نظام 100 اسم x2");
assert.doesNotMatch(r.text, /تأكيد إنشاء/);
assert.equal(vz.calls.length, callsBefore, "لا طلب للمزوّد من غير المالك");

// 11) DigitalOcean القديم والباقات
const { allEntries, invalidateIndex } = await import("../src/lib/terboo-command-index.js");
invalidateIndex();
const indexed = new Set(allEntries().map((e) => e.name));
for (const legacy of ["vps1g1c", "listvps", "delvps", "turnon"]) {
  assert.equal(getPlugin(legacy)?.config?.isEnabled, false, `أمر DigitalOcean القديم معطل: ${legacy}`);
  assert.equal(getPlugin(legacy)?.config?.legacy, "digitalocean");
  assert.equal(getPlugin(legacy)?.config?.isPrivate, true, "الخاص فقط إن فُعّل");
  assert.ok(!indexed.has(legacy), `خارج فهرس الذكاء: ${legacy}`);
}
const legacyBefore = outbox.length;
await say(OWNER, ".vps1g1c test");
assert.equal(outbox.slice(legacyBefore).filter((x) => /DigitalOcean|جاري إنشاء/.test(x.text)).length, 0, "لا ينفّذ مساراً موازياً");
assert.deepEqual(offeredTiers(), ["standard"], "الاقتصادية مخفية افتراضياً");
assert.equal(plans().standard.length, 7, "الباقات القياسية السبع");

console.log("✅ terboo-vps-provisioner: 11 سيناريو — تحقق · preflight · مسار واتساب كامل · تكرار · رفض · خطأ بعد الوصول · مهلة · استئناف · غير المالك · القديم · الباقات");
vzServer.close();
process.exit(0);
