// ═══════════════════════════════════════════════
// 🧪 بوت Terboo VPS على تيليجرام — من التحديث حتى المزوّد
// ───────────────────────────────────────────────
// Telegram Bot API وهمي (يسجّل كل نداء) + Virtualizor وهمي. يثبت:
// · /start بصورة ومعرّف المستخدم · المالك وحده يرى/يستخدم لوحته · الدردشات الجماعية بلا بيانات
// · معالج الإسناد بمعرّف تيليجرام (سيرفر متاح ← المعرّف ← باقة ← مدة ← تأكيد) ⇒ إسناد حقيقي + إشعار المشتري
// · /assign السريع · مستخدم لم يبدأ البوت ⇒ إسناد + تنبيه المالك بصدق
// · مخزن واحد مع واتساب: VPS مسند على تيليجرام لا يُسند لرقم واتساب
// · العميل: لوحته فقط · الأزرار لصاحبها فقط · تشغيل بتأكيد لمرة واحدة · اسم المضيف · كلمة المرور تُحذف
//   من الدردشة ولا تظهر في أي رد · إعادة التثبيت + متابعة · VNC · إيقاف الإسناد يقطع الوصول
// · التوكن لا يظهر في أي رسالة · long polling فعلي يستقبل التحديثات
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const TOKEN = "123456789:AAFakeTokenForTerbooTestsOnly_0123";
const OWNER = 5550001;
const BUYER = 7012345678;
const STRANGER = 6660002;
const NOT_STARTED = 7099999999;
const KEY = "ENDUSERKEY000001";
const PASS = "ENDUSERPASS00001";

// ── Virtualizor وهمي ──
const vzCalls = [];
const VPS = { 101: { vpsid: "101", vps_name: "v101", hostname: "alpha.example", status: 1, ips: { 1: "203.0.113.10" }, ram: 8192, cores: 4 }, 102: { vpsid: "102", vps_name: "v102", hostname: "beta.example", status: 1, ips: { 1: "203.0.113.11" } }, 103: { vpsid: "103", vps_name: "v103", hostname: "gamma.example", status: 0 } };
const vz = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    const q = Object.fromEntries(url.searchParams);
    const post = Object.fromEntries(new URLSearchParams(body));
    vzCalls.push({ q, post });
    const send = (obj) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
    if (q.apikey !== KEY || q.apipass !== PASS) { res.writeHead(200, { "Content-Type": "text/html" }); res.end("<html>Login</html>"); return; }
    const vps = VPS[q.svs];
    switch (q.act) {
      case "listvs": return send({ uid: 1, act: "listvs", vs: VPS });
      case "vpsmanage": return vps ? send({ act: "vpsmanage", info: { hostname: vps.hostname, status: vps.status, ip: ["203.0.113.10"], os: { name: "Ubuntu 22.04" }, uptime: "3 days", vps: { ram: 8192, cores: 4, space: 120, bandwidth: 20000 } } }) : send({ error: ["no vps"] });
      case "start": case "stop": case "restart": case "poweroff": return q.do === "1" && vps ? send({ done: { msg: `${q.act} ok` } }) : send({ error: ["bad"] });
      case "hostname": return post.newhost ? send({ done: { msg: "Hostname changed" }, onboot: "on boot" }) : send({ current: vps?.hostname });
      case "changepassword": return post.newpass ? send({ done: { msg: "Password changed" } }) : send({ title: "Change Password" });
      case "ostemplate": return post.reinsos ? send({ done: { msg: "The OS was reinstalled successfully" } }) : send({ oslist: { kvm: { ubuntu: { 272: { osid: 272, name: "Ubuntu 22.04", distro: "ubuntu" } }, debian: { 300: { osid: 300, name: "Debian 12", distro: "debian" } } } } });
      case "services": return send({ services: ["nginx", "sshd"], running: ["sshd"], autostart: ["sshd"] });
      case "vnc": return send({ info: { ip: "198.51.100.5", port: 5901, password: "vncpass1", novnc: 1 } });
      default: return send({ error: ["unknown act"] });
    }
  });
});
await new Promise((r) => vz.listen(0, "127.0.0.1", r));

// ── Telegram Bot API وهمي ──
const tgCalls = [];
const pending = [];
let nextMessageId = 1000;
const tg = http.createServer((req, res) => {
  let body = Buffer.alloc(0);
  req.on("data", (c) => { body = Buffer.concat([body, c]); });
  req.on("end", () => {
    const [, bot, method] = new URL(req.url, "http://x").pathname.split("/");
    const send = (result, ok = true, code = 200, description = "") => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(ok ? { ok, result } : { ok, error_code: code, description })); };
    if (bot !== `bot${TOKEN}`) return send(null, false, 401, "Unauthorized");
    let params = {};
    if (/json/.test(req.headers["content-type"] || "")) params = JSON.parse(body.toString() || "{}");
    else {
      const text = body.toString("latin1");
      for (const m of text.matchAll(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n--/g)) if (m[1] !== "photo") params[m[1]] = Buffer.from(m[2], "latin1").toString("utf8");
      params.photoBytes = body.length;
    }
    tgCalls.push({ method, params });
    switch (method) {
      case "getMe": return send({ id: 123456789, is_bot: true, username: "TerbooVpsBot" });
      case "getUpdates": {
        const out = pending.splice(0);
        if (out.length) return send(out);
        return setTimeout(() => send([]), 50);
      }
      case "sendMessage":
      case "sendPhoto":
        if (String(params.chat_id) === String(NOT_STARTED)) return send(null, false, 403, "Forbidden: bot can't initiate conversation with a user");
        return send({ message_id: ++nextMessageId, chat: { id: Number(params.chat_id) } });
      case "editMessageText": return send({ message_id: Number(params.message_id), chat: { id: Number(params.chat_id) } });
      default: return send(true);
    }
  });
});
await new Promise((r) => tg.listen(0, "127.0.0.1", r));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-telegram-"));
process.env.TERBOO_VPS_STORE = path.join(tmp, "vps.json");
process.env.TERBOO_TG_USERS = path.join(tmp, "tg-users.json");
process.env.TERBOO_TG_WATCH_MS = "40";
const config = (await import("../config.js")).default;
config.virtualizor = {
  ...(config.virtualizor || {}),
  enabled: true,
  enduser: { ...(config.virtualizor?.enduser || {}), enabled: true, url: `http://127.0.0.1:${vz.address().port}`, apiKey: KEY, apiPassword: PASS, verifyTLS: true, timeoutMs: 3000, maxRetries: 0 },
  admin: { ...(config.virtualizor?.admin || {}), enabled: false },
};
const { createVpsBot } = await import("../src/telegram/tg-vps-bot.js");
const ent = await import("../src/lib/providers/virtualizor/virtualizor-entitlements.js");
const bot = createVpsBot({ token: TOKEN, ownerIds: [OWNER], apiBase: `http://127.0.0.1:${tg.address().port}` });

// ── أدوات المحاكاة ──
let updateId = 1;
const user = (id, name) => ({ id, is_bot: false, first_name: name, language_code: "ar" });
async function text(from, body, { chat = null } = {}) {
  const before = tgCalls.length;
  const messageId = ++nextMessageId;
  await bot.handleUpdate({ update_id: updateId++, message: { message_id: messageId, from, chat: chat || { id: from.id, type: "private" }, date: 0, text: body } });
  return { out: tgCalls.slice(before), messageId };
}
/** آخر لوحة أزرار أُرسلت لهذا الشخص */
function lastKeyboard(chatId) {
  for (let i = tgCalls.length - 1; i >= 0; i -= 1) {
    const c = tgCalls[i];
    if (String(c.params.chat_id) !== String(chatId)) continue;
    const markup = typeof c.params.reply_markup === "string" ? JSON.parse(c.params.reply_markup) : c.params.reply_markup;
    if (markup?.inline_keyboard) return { buttons: markup.inline_keyboard.flat(), messageId: c.params.message_id || nextMessageId };
  }
  return { buttons: [] };
}
async function press(from, label, { chatId = from.id } = {}) {
  const { buttons } = lastKeyboard(chatId);
  const target = buttons.find((b) => b.callback_data && (typeof label === "string" ? b.text.includes(label) : label.test(b.text)));
  assert.ok(target, `زر «${label}» غير موجود: ${buttons.map((b) => b.text).join(" | ")}`);
  const before = tgCalls.length;
  await bot.handleUpdate({ update_id: updateId++, callback_query: { id: `cb${updateId}`, from, data: target.callback_data, message: { message_id: 1, chat: { id: chatId, type: "private" } } } });
  return tgCalls.slice(before);
}
const textsOf = (calls) => calls.filter((c) => ["sendMessage", "editMessageText", "sendPhoto"].includes(c.method)).map((c) => String(c.params.text || c.params.caption || "")).join("\n");
const results = [];
const check = async (name, fn) => { await fn(); results.push(name); };

const owner = user(OWNER, "Owner");
const buyer = user(BUYER, "Mahmoud");
const stranger = user(STRANGER, "Visitor");

await check("start-and-roles", async () => {
  const s = await text(stranger, "/start");
  assert.ok(s.out.some((c) => c.method === "sendPhoto"), "ترحيب بصورة");
  assert.match(textsOf(s.out), new RegExp(String(STRANGER)), "معرّف المستخدم ظاهر");
  assert.ok(!lastKeyboard(STRANGER).buttons.some((b) => /لوحة المالك/.test(b.text)), "غير المالك لا يرى لوحة المالك");
  const denied = await text(stranger, "/admin");
  assert.match(textsOf(denied.out), /لمالك البوت فقط/);
  await text(owner, "/start");
  assert.ok(lastKeyboard(OWNER).buttons.some((b) => /لوحة المالك/.test(b.text)));
});

await check("group-chat-no-data", async () => {
  const g = await text(owner, "/admin", { chat: { id: -1001, type: "supergroup" } });
  assert.match(textsOf(g.out), /المحادثة الخاصة فقط/);
  assert.doesNotMatch(textsOf(g.out), /VPS 101|alpha/);
});

await check("owner-wizard-assign-by-telegram-id", async () => {
  await text(buyer, "/start"); // المشتري بدأ البوت ⇒ اسمه معروف للمالك
  await text(owner, "/admin");
  await press(owner, "سيرفرات متاحة");
  const step2 = await press(owner, "101");
  assert.match(textsOf(step2), /خطوة 2 من 4/);
  const step3 = await text(owner, String(BUYER));
  assert.match(textsOf(step3.out), /Mahmoud/, "اسم المستخدم من تيليجرام");
  await press(owner, "std-1");
  await press(owner, "شهر");
  assert.equal(ent.list().length, 0, "لا إسناد قبل التأكيد");
  const done = await press(owner, "تأكيد الإسناد");
  const e = ent.list().find((x) => x.vpsId === "101");
  assert.ok(e && e.tg === String(BUYER) && e.canonicalUserId === `tg:${BUYER}` && e.status === "active" && e.planId === "std-1");
  assert.ok(Date.parse(e.expiresAt) > Date.now() + 29 * 86_400_000);
  assert.ok(done.some((c) => c.method === "sendMessage" && String(c.params.chat_id) === String(BUYER)), "إشعار المشتري");
});

await check("cross-platform-single-holder", async () => {
  await assert.rejects(async () => ent.grant({ user: "201016948771@s.whatsapp.net", vpsId: "101", by: "pn:1" }), /vps-already-assigned/);
});

await check("buyer-dashboard-and-ownership", async () => {
  const dash = await press(buyer, "فتح لوحة التحكم");
  assert.match(textsOf(dash), /alpha\.example/);
  assert.match(textsOf(dash), /203\.0\.113\.10/);
  // زر المشتري لا يعمل لغيره
  const { buttons } = lastKeyboard(BUYER);
  const before = tgCalls.length;
  await bot.handleUpdate({ update_id: updateId++, callback_query: { id: "steal", from: stranger, data: buttons.find((b) => b.callback_data).callback_data, message: { message_id: 1, chat: { id: BUYER, type: "private" } } } });
  const answer = tgCalls.slice(before).find((c) => c.method === "answerCallbackQuery");
  assert.match(String(answer?.params.text), /ليس لك/);
  const strangerMine = await text(stranger, "/myvps");
  assert.match(textsOf(strangerMine.out), /لا يوجد Terboo VPS/, "الغريب بلا سيرفر");
});

await check("buyer-power-confirmed-once", async () => {
  await text(buyer, "/myvps");
  await press(buyer, "الطاقة");
  const ask = await press(buyer, /إيقاف$/);
  assert.match(textsOf(ask), /تأكيد/);
  const before = vzCalls.length;
  await press(buyer, "تأكيد");
  assert.ok(vzCalls.slice(before).some((c) => c.q.act === "stop" && c.q.do === "1"), "الإيقاف نُفّذ عند المزوّد");
});

await check("hostname-and-password-secret", async () => {
  await text(buyer, "/myvps");
  await press(buyer, "النظام");
  await press(buyer, "اسم المضيف");
  await text(buyer, "srv.terboo.dev");
  await press(buyer, "تأكيد");
  assert.ok(vzCalls.some((c) => c.q.act === "hostname" && c.post.newhost === "srv.terboo.dev"));
  await text(buyer, "/myvps");
  await press(buyer, "الأمان");
  await press(buyer, "كلمة المرور");
  await press(buyer, "تأكيد");
  const secret = "Str0ng#Pass2026x";
  const sent = await text(buyer, secret);
  assert.ok(sent.out.some((c) => c.method === "deleteMessage" && Number(c.params.message_id) === sent.messageId), "كلمة المرور حُذفت من الدردشة");
  assert.ok(vzCalls.some((c) => c.q.act === "changepassword" && c.post.newpass === secret), "وصلت للمزوّد");
  assert.ok(!tgCalls.some((c) => JSON.stringify(c.params).includes(secret)), "لا تظهر في أي رسالة");
});

await check("reinstall-and-watch", async () => {
  await text(buyer, "/myvps");
  await press(buyer, "النظام");
  await press(buyer, "إعادة تثبيت");
  await press(buyer, "Debian 12");
  await press(buyer, "تأكيد");
  await text(buyer, "Re1nstall#Pass99");
  assert.ok(vzCalls.some((c) => c.q.act === "ostemplate" && c.post.reinsos === "1" && c.post.newos === "300"));
  await new Promise((r) => setTimeout(r, 400));
  assert.ok(tgCalls.some((c) => String(c.params.chat_id) === String(BUYER) && /انتهت العملية/.test(String(c.params.text))), "إشعار انتهاء المتابعة");
});

await check("vnc-private-message", async () => {
  await text(buyer, "/myvps");
  await press(buyer, "الأمان");
  const vnc = await press(buyer, "VNC");
  const confirmText = textsOf(vnc);
  const result = /تأكيد/.test(confirmText) ? await press(buyer, "تأكيد") : vnc;
  assert.match(textsOf(result), /198\.51\.100\.5:5901/);
  assert.match(textsOf(result), /دقيقتين/, "تُحذف تلقائياً");
});

await check("quick-assign-and-not-started", async () => {
  const r = await text(owner, `/assign ${NOT_STARTED} 102 std-2 7`);
  assert.ok(ent.list().some((x) => x.vpsId === "102" && x.tg === String(NOT_STARTED)));
  assert.match(textsOf(r.out), /يجب أن يبدأ البوت/, "تنبيه صادق للمالك");
  const again = await text(owner, `/assign ${STRANGER} 102`);
  assert.match(textsOf(again.out), /مُسند لمشترٍ آخر/, "لا إسناد مزدوج");
  assert.equal(ent.list().find((x) => x.vpsId === "102").tg, String(NOT_STARTED), "الإسناد الأول باقٍ");
});

await check("owner-find-suspend-cuts-access", async () => {
  await text(owner, `/find ${BUYER}`);
  await press(owner, "تعليق");
  await press(owner, "تأكيد");
  assert.equal(ent.list().find((x) => x.vpsId === "101").status, "suspended");
  const mine = await text(buyer, "/myvps");
  assert.match(textsOf(mine.out), /لا يوجد Terboo VPS/, "التعليق يقطع الوصول فوراً");
  await text(owner, `/find ${BUYER}`);
  await press(owner, "استعادة");
  assert.equal(ent.list().find((x) => x.vpsId === "101").status, "active");
});

await check("token-never-leaks-and-polling", async () => {
  assert.ok(!tgCalls.some((c) => JSON.stringify(c.params).includes(TOKEN)), "التوكن لا يظهر في أي رسالة");
  pending.push({ update_id: 9000, message: { message_id: 1, from: stranger, chat: { id: STRANGER, type: "private" }, date: 0, text: "/id" } });
  const before = tgCalls.length;
  await bot.start();
  for (let i = 0; i < 40 && !tgCalls.slice(before).some((c) => c.method === "sendMessage" && String(c.params.chat_id) === String(STRANGER)); i += 1) await new Promise((r) => setTimeout(r, 25));
  await bot.stop();
  assert.ok(tgCalls.slice(before).some((c) => c.method === "setMyCommands"), "أوامر البوت");
  assert.ok(tgCalls.slice(before).some((c) => c.method === "sendMessage" && String(c.params.chat_id) === String(STRANGER) && String(c.params.text).includes(String(STRANGER))), "long polling يستقبل ويرد");
});

console.log(`✅ terboo-telegram-vps: ${results.length} — ${results.join(" · ")}`);
vz.close();
tg.close();
process.exit(0);
