// ═══════════════════════════════════════════════
// 🧪 مركز إدارة VPS للمالك (.vpsadmin) — من رسالة واتساب حتى سجل الإسناد
// ───────────────────────────────────────────────
// Virtualizor وهمي (listvs للمستخدم) · يثبت:
// · الرئيسية/القوائم/البطاقات تُرسم بلا أخطاء (انحدار: owner.list is not a function بعد الإسناد)
// · معالج الإسناد: سيرفر متاح ← رقم (إدخال) ← باقة ← مدة ← تأكيد ⇒ إسناد حقيقي + إشعار للمشتري
// · الإسناد بأمر واحد بالصيغة التي كتبها المالك (مسافات مزدوجة) يعمل
// · في مجموعة: لا تُعرض أي بيانات — اللوحة تُفتح في خاص المالك · غير المالك لا يصل
// · القائمة الرئيسية: زر «تغيير الاستخدام» للجميع · «إدارة VPS» للمالك فقط
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
const STRANGER = "201000000555@s.whatsapp.net";
const BUYER = "201016948771";
const GROUP = "120363000000000777@g.us";
const KEY = "ENDUSERKEY000001";
const PASS = "ENDUSERPASS00001";

// ── Virtualizor وهمي (واجهة المستخدم: listvs) ──
const VPS = {
  101: { vpsid: "101", vps_name: "v101", hostname: "alpha.example", status: 1, ips: { 1: "10.0.0.1" }, ram: 4096, cores: 2, space: 80, os_name: "ubuntu-22.04" },
  102: { vpsid: "102", vps_name: "v102", hostname: "beta.example", status: 0, ram: 8192, cores: 4, space: 160 },
  12902: { vpsid: "12902", vps_name: "v12902", hostname: "gamma.example", status: 1, ram: 2048, cores: 1, space: 40 },
};
const vzServer = http.createServer((req, res) => {
  const q = Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const send = (obj) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
  if (q.apikey !== KEY || q.apipass !== PASS) { res.writeHead(200, { "Content-Type": "text/html" }); res.end("<html>Login</html>"); return; }
  if (q.act === "listvs") return send({ uid: 1, act: "listvs", vs: VPS });
  return send({ error: ["unknown act"] });
});
await new Promise((r) => vzServer.listen(0, "127.0.0.1", r));

global.terbooProviders = { map: { GeminiAPI: async () => ({ text: JSON.stringify({ decision: "CHAT", reply: "تمام" }) }) }, loadedAt: Date.now() + 3_600_000, names: ["GeminiAPI"] };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-vpsadmin-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
process.env.TERBOO_VPS_STORE = path.join(tmp, "vps.json");
const config = (await import("../config.js")).default;
config.bot.primaryNumber = BOT;
config.owner.number = [OWNER.split("@")[0]];
config.virtualizor = {
  ...(config.virtualizor || {}),
  enabled: true,
  enduser: { ...(config.virtualizor?.enduser || {}), enabled: true, url: `http://127.0.0.1:${vzServer.address().port}`, apiKey: KEY, apiPassword: PASS, verifyTLS: true, timeoutMs: 3000, maxRetries: 0 },
  admin: { ...(config.virtualizor?.admin || {}), enabled: false },
};
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
db.setting("registrationRequired", false);
for (const [jid, name] of [[OWNER, "مالك"], [STRANGER, "زائر"]]) db.setUser(jid, { isRegistered: true, regName: name, language: "ar" });
const memory = await import("../src/lib/terboo-ai-memory.js");
memory.initMemory(path.join(tmp, "memory"));
const { loadPlugins } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(process.cwd(), "plugins"));
const { messageHandler } = await import("../src/handler.js");
const ent = await import("../src/lib/providers/virtualizor/virtualizor-entitlements.js");
const M = await import("../src/lib/terboo-menus.js");

// ── واتساب وهمي: النص + كل معرّفات الأزرار وصفوف القوائم ──
const outbox = [];
function idsOf(node) {
  const ids = [];
  for (const b of node?.nativeFlowMessage?.buttons || []) {
    let params = {};
    try { params = JSON.parse(b.buttonParamsJson || "{}"); } catch { params = {}; }
    if (params.id) ids.push(params.id);
    for (const section of params.sections || []) for (const row of section.rows || []) ids.push(row.id);
  }
  return ids;
}
const sock = {
  user: { id: `${BOT}:1@s.whatsapp.net` },
  sendMessage: async (chat, content) => { outbox.push({ chat, text: content?.text || content?.caption || "", ids: [] }); return { key: { id: `M${outbox.length}`, remoteJid: chat, fromMe: true } }; },
  relayMessage: async (chat, message, opts) => {
    const node = message?.viewOnceMessage?.message?.interactiveMessage || message?.interactiveMessage;
    outbox.push({ chat, text: node?.body?.text || "", ids: idsOf(node) });
    return opts?.messageId || `R${outbox.length}`;
  },
  groupMetadata: async () => ({ id: GROUP, subject: "تت", participants: [{ id: OWNER, admin: "superadmin" }, { id: STRANGER, admin: null }, { id: `${BOT}@s.whatsapp.net`, admin: "admin" }] }),
  sendPresenceUpdate: async () => { }, readMessages: async () => { }, chatModify: async () => { },
};
let seq = 0;
async function say(text, { from = OWNER, group = false } = {}) {
  const before = outbox.length;
  const key = group ? { remoteJid: GROUP, participant: from, fromMe: false, id: `VA${++seq}X${Date.now()}` } : { remoteJid: from, fromMe: false, id: `VA${++seq}X${Date.now()}` };
  await messageHandler({ key, message: { conversation: text }, pushName: "مختبر", messageTimestamp: Math.floor(Date.now() / 1000) }, sock);
  await new Promise((r) => setTimeout(r, 60));
  const out = outbox.slice(before);
  return { text: out.map((x) => x.text).join("\n"), ids: out.flatMap((x) => x.ids), out };
}
const results = [];
const check = async (name, fn) => { await fn(); results.push(name); };

await check("dashboard", async () => {
  const r = await say(".vpsadmin");
  assert.match(r.text, /إدارة Terboo VPS/);
  for (const id of [".vpsadmin new", ".vpsadmin account", ".vpsadmin account free", ".vpsadmin list", ".vpsadmin expiring", ".vpsadmin find"]) {
    assert.ok(r.ids.includes(id), `صف/زر ${id}`);
  }
});

await check("account-and-free", async () => {
  const all = await say(".vpsadmin account");
  assert.match(all.text, /3 VPS في الحساب/);
  assert.ok(all.ids.includes(".vpsadmin vps 101"));
  const free = await say(".vpsadmin account free");
  assert.ok(free.ids.includes(".vpsadmin new 101") && free.ids.includes(".vpsadmin new 102"), "المتاح يبدأ المعالج مباشرة");
});

await check("wizard-assign", async () => {
  const step2 = await say(".vpsadmin new 101");
  assert.match(step2.text, /خطوة 2 من 4/);
  const step3 = await say(BUYER); // إدخال نصي في الخاص
  assert.match(step3.text, /خطوة 3 من 4/);
  assert.ok(step3.ids.includes(`.vpsadmin new 101 ${BUYER} std-1`));
  assert.ok(step3.ids.includes(`.vpsadmin new 101 ${BUYER} -`), "بدون باقة");
  const step4 = await say(`.vpsadmin new 101 ${BUYER} -`);
  assert.match(step4.text, /خطوة 4 من 4/);
  const confirm = await say(`.vpsadmin new 101 ${BUYER} - 30`);
  const go = confirm.ids.find((id) => id.startsWith(".vpsadmin assign"));
  assert.equal(go, `.vpsadmin assign ${BUYER} 101 - 30`, "لا إسناد قبل التأكيد");
  assert.equal(ent.list().length, 0);
  const done = await say(go);
  const e = ent.list().find((x) => x.vpsId === "101");
  assert.ok(e && e.status === "active", "إسناد حقيقي");
  assert.equal(e.planId || "", "", "«-» = بلا باقة");
  assert.ok(e.expiresAt && Date.parse(e.expiresAt) > Date.now() + 29 * 86_400_000, "مدة 30 يوماً");
  assert.ok(done.out.some((x) => x.chat === `${BUYER}@s.whatsapp.net`), "إشعار المشتري");
  assert.match(done.text, /VPS 101/, "بطاقة الإسناد تُرسم (لا owner.list is not a function)");
});

await check("one-command-assign-as-typed", async () => {
  const r = await say(`.vpsadmin assign ${BUYER}  12902`);
  assert.ok(ent.list().some((x) => x.vpsId === "12902" && x.status === "active"));
  assert.match(r.text, /VPS 12902/);
  const taken = await say(".vpsadmin assign 201000000123 101");
  assert.ok(!ent.list().some((x) => x.vpsId === "101" && x.pn?.startsWith("201000000123")), "VPS مسند لغيره لا يُعاد إسناده");
  assert.ok(taken.text.length > 0, "رفض صريح");
});

await check("cards-and-lists", async () => {
  const card = await say(".vpsadmin vps 101");
  assert.match(card.text, /alpha\.example/);
  assert.match(card.text, new RegExp(BUYER));
  const user = await say(`.vpsadmin find ${BUYER}`);
  assert.ok(user.ids.filter((id) => id.startsWith(".vpsadmin view ")).length === 2, "كل VPS الرقم");
  const soon = await say(".vpsadmin expiring");
  assert.match(soon.text, /ينتهي خلال 7 أيام \(0\)/);
  const active = await say(".vpsadmin list active");
  assert.ok(active.ids.some((id) => id.startsWith(".vpsadmin view ")));
  const id = ent.list()[0].id;
  const notify = await say(`.vpsadmin notify ${id}`);
  assert.match(notify.text, /أُرسل الإشعار/);
});

await check("group-goes-private", async () => {
  const r = await say(".vpsadmin", { group: true });
  const inGroup = r.out.filter((x) => x.chat === GROUP);
  assert.ok(inGroup.length >= 1 && inGroup.every((x) => !new RegExp(BUYER).test(x.text) && x.ids.length === 0), "المجموعة: إشعار فقط");
  assert.ok(r.out.some((x) => x.chat !== GROUP && /إدارة Terboo VPS/.test(x.text)), "اللوحة في خاص المالك");
});

await check("stranger-blocked", async () => {
  const r = await say(".vpsadmin", { from: STRANGER });
  assert.doesNotMatch(r.text, /إدارة Terboo VPS/);
  assert.ok(!r.ids.some((id) => /vpsadmin/.test(id)));
});

await check("main-menu-buttons", async () => {
  const user = { lang: "ar", prefix: ".", isOwner: false };
  const owner = { ...user, isOwner: true };
  assert.equal(M.menuButtons("main", user)[0].id, ".usage", "زر تغيير الاستخدام في الرئيسية");
  assert.ok(M.menuButtons("main", user).length <= 3);
  const rows = (ctx) => M.listSections("main", ctx).flatMap((s) => s.rows.map((r) => r.id));
  assert.ok(!rows(user).includes(".vpsadmin"), "غير المالك لا يرى إدارة VPS");
  assert.ok(rows(owner).includes(".vpsadmin"), "المالك يرى إدارة VPS");
  assert.ok(rows(user).includes(".owner"), "زر المطوّر بقي في القائمة");
});

console.log(`✅ terboo-vpsadmin-center: ${results.length} — ${results.join(" · ")}`);
vzServer.close();
process.exit(0);
