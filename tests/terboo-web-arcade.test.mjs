// ═══════════════════════════════════════════════
// 🧪 TERBOO Web Arcade — اللعب التفاعلي على الموقع + رابط الموقع الديناميكي + تحكّم المالك (.موقع)
// ───────────────────────────────────────────────
// 1) رمز اللعب: توقيع HMAC · رفض العبث/الانتهاء/غير اللاعب
// 2) API: حالة بلا JID · حركة مقبولة عبر المحرك · رفض المكرر/الحقل المحظور/غير JSON/بلا رأس/منشأ غريب
// 3) صفحة /play/<token> برؤوس CSP و no-store · الكتالوج = أركيد + مستقلة · /app/<id> بنونس
// 4) الرابط: تلقائي من IP:المنفذ · config غير صالح ⇒ لا رابط · رابط المالك يتغلب
// 5) واتساب: بطاقة الخاص تحمل زر cta_url لـ/play · المجموعة زر «web» يرسل لكل لاعب رابطه في الخاص فقط
// 6) .موقع: منفذ/رابط/SSL (شهادة ذاتية التوقيع إن توفر openssl) · HTTPS فعلي · لا أسرار في الحالة
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const BOT = "201111111119";
const BOT_JID = `${BOT}@s.whatsapp.net`;
const GROUP = "120363000000000777@g.us";
const A = "201333333301@s.whatsapp.net";
const B = "201333333302@s.whatsapp.net";
const X = "201333333309@s.whatsapp.net";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-web-arcade-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
process.env.TERBOO_VPS_STORE = path.join(tmp, "vps.json");
process.env.TERBOO_PUBLIC_IP = "203.0.113.50";
delete process.env.TERBOO_SITE_URL;
delete process.env.TERBOO_WEB_PORT;
const config = (await import("../config.js")).default;
config.bot.primaryNumber = BOT;
config.website.url = "";
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
const memory = await import("../src/lib/terboo-ai-memory.js");
memory.initMemory(path.join(tmp, "memory"));
const { loadPlugins, getPlugin } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(process.cwd(), "plugins"));
const { messageHandler } = await import("../src/handler.js");
const engine = await import("../src/lib/terboo-arcade/engine.js");
const W = await import("../src/lib/terboo-arcade/web.js");
const site = await import("../src/lib/terboo-website.js");
const ctl = await import("../src/lib/terboo-web-control.js");
const admin = await import("../src/lib/terboo-site-admin.js");
const { arcadeContracts } = await import("../src/lib/terboo-arcade/index.js");
for (const jid of [A, B, X]) db.setUser(jid, { language: "ar", name: jid.slice(-2) });
for (const name of ["اكس_او", "اركيد"]) if (getPlugin(name)) getPlugin(name).config.cooldown = 0;

// ── منفذ حر + تشغيل الموقع ──
const port = 20000 + Math.floor(Math.random() * 20000);
site.saveOverrides({ port, url: null, ssl: null });
assert.equal(site.publicBaseUrl(), "", "لا رابط قبل تشغيل الخادم");
const started = await ctl.startSite({});
assert.equal(started.ok, true, "الموقع اشتغل");
await new Promise((r) => setTimeout(r, 30));
const base = `http://127.0.0.1:${port}`;

// 4) الرابط التلقائي
assert.equal(site.publicBaseUrl(), `http://203.0.113.50:${port}/`, "رابط تلقائي من IP:المنفذ");
config.website.url = "https://wa.me/1";
assert.equal(site.publicBaseUrl(), "", "رابط config غير صالح ⇒ لا زر ولا رجوع للـIP");
config.website.url = "";
site.saveOverrides({ url: "https://play.terboo.example/" });
assert.equal(site.publicBaseUrl(), "https://play.terboo.example/", "رابط المالك يتغلب");
site.saveOverrides({ url: null });

// 1) الرمز
const room = engine.createRoom({ gameId: "xo", chat: "web-test@s.whatsapp.net", isGroup: false, host: { jid: A, name: "A" }, vsAI: true, difficulty: "EASY" }).room;
const token = W.issuePlayToken(room, A);
assert.ok(W.verifyPlayToken(token), "رمز صالح");
assert.equal(W.verifyPlayToken(`${token.slice(0, -2)}xx`), null, "توقيع معبوث به");
const [body] = token.split(".");
const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url")), p: engine.idOf(B) })).toString("base64url");
assert.equal(W.verifyPlayToken(`${forged}.${token.split(".")[1]}`), null, "تغيير اللاعب يكسر التوقيع");
assert.equal(W.issuePlayToken(room, X), "", "لا رمز لغير لاعب");
const expired = W.issuePlayToken(room, A, -1000);
assert.equal(W.verifyPlayToken(expired), null, "رمز منتهٍ");
assert.doesNotMatch(Buffer.from(body, "base64url").toString(), /whatsapp\.net/, "الرمز بلا JID خام");

// 2) API
const post = (p, payload, headers = {}) => fetch(`${base}${p}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Terboo-Arcade": "1", ...headers }, body: JSON.stringify(payload) });
let res = await fetch(`${base}/api/v1/arcade/s/${token}?lang=en`);
let json = await res.json();
assert.equal(res.status, 200);
assert.equal(json.data.gameId, "xo");
assert.equal(json.data.actions.length, 9);
assert.ok(json.data.actions.every((a) => typeof a.text === "string"), "تسمية لكل زر");
assert.doesNotMatch(JSON.stringify(json), /whatsapp\.net|pn:2013/, "لا JID ولا معرّف لاعب في العرض");
const view = json.data;
res = await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload: { cell: 4 }, nonce: view.nonce, timestamp: Date.now() });
json = await res.json();
assert.equal(json.data.accepted, true, "حركة مقبولة");
assert.equal(room.game.board[4], 0, "طُبّقت على الخادم");
assert.equal(json.data.aiMoves, 1, "ردّ الكمبيوتر");
res = await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload: { cell: 0 }, nonce: view.nonce, timestamp: Date.now() });
assert.equal((await res.json()).data.code, "stale", "nonce قديم مرفوض");
const fresh = (await (await fetch(`${base}/api/v1/arcade/s/${token}`)).json()).data;
res = await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload: { cell: 0, winner: 0 }, nonce: fresh.nonce, timestamp: Date.now() });
assert.equal((await res.json()).data.code, "forbidden-field", "حقل winner مرفوض");
res = await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload: { cell: 0 }, nonce: fresh.nonce, timestamp: Date.now() - 10 * 60 * 1000 });
assert.equal((await res.json()).data.code, "expired-action", "طابع زمني قديم مرفوض");
res = await fetch(`${base}/api/v1/arcade/s/${token}/action`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" });
assert.equal(res.status, 415, "نموذج نصي من موقع آخر مرفوض");
res = await post(`/api/v1/arcade/s/${token}/action`, {}, { "X-Terboo-Arcade": "0" });
assert.equal(res.status, 415, "بلا رأس الأركيد مرفوض");
res = await post(`/api/v1/arcade/s/${token}/action`, {}, { Origin: "https://evil.example" });
assert.equal(res.status, 403, "منشأ غريب مرفوض");
res = await fetch(`${base}/api/v1/arcade/s/${expired}`);
assert.equal(res.status, 401, "رمز منتهٍ ⇒ 401");
res = await post("/api/v1/arcade/new", { gameId: "xo" });
assert.equal(res.status, 401, "إنشاء لعبة من الموقع يتطلب تسجيل الدخول");

// 3) الصفحة والكتالوج
res = await fetch(`${base}/play/${token}`);
assert.equal(res.status, 200);
assert.match(res.headers.get("content-type"), /text\/html/);
assert.match(res.headers.get("content-security-policy"), /script-src 'self'/);
assert.equal(res.headers.get("cache-control"), "no-store");
assert.match(await res.text(), /play\.js/);
json = await (await fetch(`${base}/api/v1/arcade/catalog?lang=ar`)).json();
// الكتالوج = عقود الأركيد + الألعاب المستقلة (Mini Apps بلا حالة خادمية)
const { miniApps } = await import("../src/lib/terboo-miniapp.js");
const standalone = json.data.games.filter((g) => g.standalone);
const engineBacked = json.data.games.filter((g) => !g.standalone);
assert.equal(engineBacked.length, arcadeContracts().length, "ألعاب المحرك = عقود الأركيد");
assert.equal(standalone.length, miniApps().length, "الألعاب المستقلة = سجل Mini Apps");
assert.ok(standalone.every((g) => /^\/app\/[a-z0-9_-]+\?lang=/.test(g.playUrl)), "كل لعبة مستقلة لها رابط لعب مباشر");
assert.ok(standalone.every((g) => g.name && g.description), "الألعاب المستقلة لها اسم ووصف");
// الألعاب المستقلة لا تدّعي مكافآت أو ترتيباً
assert.ok(standalone.every((g) => g.roundSeconds === 0 && g.supportsGroup === false), "المستقلة: بلا جولة خادمية ولا مجموعات");
// صفحة اللعبة المستقلة تُخدم فعلاً بـCSP صارمة ونونس
for (const g of standalone) {
  const appRes = await fetch(`${base}/app/${g.id}?lang=ar`);
  assert.equal(appRes.status, 200, `/app/${g.id} يُخدم`);
  const csp = appRes.headers.get("content-security-policy") || "";
  assert.match(csp, /script-src 'nonce-/, `/app/${g.id}: CSP بنونس`);
  assert.match(csp, /connect-src 'none'/, `/app/${g.id}: بلا شبكة`);
  const html = await appRes.text();
  assert.match(html, /<script nonce="/, `/app/${g.id}: الوسم يحمل النونس`);
  assert.doesNotMatch(html, /https?:\/\//, `/app/${g.id}: بلا مورد خارجي`);
}
assert.equal((await fetch(`${base}/app/nope`)).status, 404, "لعبة مستقلة مجهولة ⇒ 404");
res = await fetch(`${base}/`);
assert.equal(res.status, 200, "الصفحة الرئيسية");

// 5) واتساب
const relays = [];
const sent = [];
const parse = (message) => {
  const node = message?.viewOnceMessage?.message?.interactiveMessage || message?.interactiveMessage;
  return (node?.nativeFlowMessage?.buttons || []).map((b) => ({ name: b.name, ...JSON.parse(b.buttonParamsJson || "{}") }));
};
const sock = {
  user: { id: `${BOT}:1@s.whatsapp.net` },
  groupMetadata: async () => ({ id: GROUP, subject: "Web", owner: A, participants: [BOT_JID, A, B, X].map((id) => ({ id, admin: id === A ? "admin" : null })) }),
  sendMessage: async (chat, content) => { sent.push({ chat, text: content?.text || content?.caption || "" }); return { key: { id: `S${sent.length}`, remoteJid: chat, fromMe: true } }; },
  relayMessage: async (chat, message, opts) => { relays.push({ chat, buttons: parse(message) }); return opts?.messageId || `R${relays.length}`; },
  sendPresenceUpdate: async () => {},
  readMessages: async () => {},
  onWhatsApp: async (jid) => [{ exists: true, jid }],
};
let seq = 0;
async function say(sender, text, chat) {
  const before = { relays: relays.length, sent: sent.length };
  const id = `WA${++seq}X${Date.now().toString(36).toUpperCase()}`;
  await messageHandler({ key: { remoteJid: chat, participant: chat.endsWith("@g.us") ? sender : undefined, fromMe: false, id }, message: { conversation: text }, pushName: `P${sender.slice(-2)}`, messageTimestamp: Math.floor(Date.now() / 1000) }, sock);
  await new Promise((r) => setTimeout(r, 40));
  return { relays: relays.slice(before.relays), sent: sent.slice(before.sent) };
}

// خاص: زر رابط مباشر
let out = await say(A, ".اكس_او", A);
let links = out.relays.flatMap((r) => r.buttons).filter((b) => b.name === "cta_url");
const live = links.find((b) => /\/play\//.test(b.url));
assert.ok(live, "زر «العب تفاعلياً» في الخاص");
assert.match(live.url, new RegExp(`^http://203\\.0\\.113\\.50:${port}/play/.+\\?lang=ar$`), "الرابط من IP السيرفر والمنفذ");
const liveToken = new URL(live.url).pathname.split("/").pop();
assert.equal(W.resolve(liveToken).player.id, engine.idOf(A), "الرابط لمقعد A نفسه");

// مجموعة: لا رابط عام في المجموعة، وزر web يرسل لكل لاعب رابطه في الخاص
await say(A, ".اكس_او", GROUP);
out = await say(B, ".اكس_او", GROUP);
const groupButtons = out.relays.filter((r) => r.chat === GROUP).flatMap((r) => r.buttons);
assert.ok(!groupButtons.some((b) => b.name === "cta_url" && /\/play\//.test(b.url || "")), "لا رابط لعب منشور في المجموعة");
const webBtn = groupButtons.find((b) => / web /.test(String(b.id || "")));
assert.ok(webBtn, "زر web في المجموعة");
const groupRoom = engine.findRoom({ chat: GROUP, jid: A });
out = await say(B, `.اركيد web ${groupRoom.roomId}`, GROUP);
const privateCard = out.relays.find((r) => r.chat === B);
assert.ok(privateCard, "الرابط وصل لخاص B");
const bUrl = privateCard.buttons.find((b) => b.name === "cta_url")?.url;
assert.equal(W.resolve(new URL(bUrl).pathname.split("/").pop()).player.id, engine.idOf(B), "رابط B لمقعد B");
assert.ok(!out.relays.some((r) => r.chat === GROUP && r.buttons.some((b) => b.url === bUrl)), "رابط B لم يُنشر في المجموعة");
out = await say(X, `.اركيد web ${groupRoom.roomId}`, GROUP);
assert.ok(!out.relays.some((r) => r.chat === X), "غير اللاعب لا يحصل على رابط");
assert.match(out.sent.map((s) => s.text).join("\n"), /للاعبين/, "رسالة: للاعبين فقط");

// 6) .موقع
assert.equal(getPlugin("موقع").config.isOwner, true, "أمر المالك فقط");
const replies = [];
const m = (args) => ({ args, prefix: ".", chat: A, sender: A, isGroup: false, key: { id: `M${++seq}` }, reply: async (t) => replies.push(t) });
const last = () => replies[replies.length - 1];
await admin.handleSiteCommand(m(["منفذ", "99999"]), sock);
assert.match(last(), /منفذ غير صالح/);
await admin.handleSiteCommand(m(["رابط", "https://chat.whatsapp.com/abc"]), sock);
assert.match(last(), /رابط غير صالح/);
await admin.handleSiteCommand(m(["رابط", "https://user:pw@x.example"]), sock);
assert.match(last(), /رابط غير صالح/);
await admin.handleSiteCommand(m(["ssl", "تلقائي"]), sock);
assert.match(last(), /يحتاج دوميناً/, "SSL تلقائي بلا دومين مرفوض");
let haveOpenssl = true;
try {
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", path.join(tmp, "k.pem"), "-out", path.join(tmp, "c.pem"), "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });
} catch {
  haveOpenssl = false;
}
if (haveOpenssl) {
  await admin.handleSiteCommand(m(["ssl", path.join(tmp, "c.pem"), path.join(tmp, "c.pem")]), sock);
  assert.match(last(), /غير صالحين/, "زوج غير متطابق مرفوض");
  await admin.handleSiteCommand(m(["ssl", path.join(tmp, "c.pem"), path.join(tmp, "k.pem")]), sock);
  assert.match(last(), /تم تفعيل SSL/);
  assert.equal(site.publicBaseUrl(), `https://203.0.113.50:${port}/`, "الرابط صار https");
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const health = await fetch(`https://127.0.0.1:${port}/health`).then((r) => r.json());
  if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
  assert.equal(health.ok, true, "الموقع يخدم HTTPS فعلاً");
  const status = JSON.stringify(site.websiteStatus());
  assert.doesNotMatch(status, /BEGIN|PRIVATE KEY|\/tmp\//, "الحالة بلا محتوى أو مسار الشهادة");
  await admin.handleSiteCommand(m(["ssl", "ايقاف"]), sock);
  assert.match(last(), /إيقاف SSL/);
}
await admin.handleSiteCommand(m(["ايقاف"]), sock);
assert.equal(ctl.running(), false, "تم إيقاف الموقع");
assert.equal(site.publicBaseUrl(), "", "لا رابط والموقع متوقف");

console.log(`✅ terboo-web-arcade: رمز موقّع · API (قبول/قديم/محظور/منتهٍ/منشأ/JSON) · صفحة اللعب + CSP · كتالوج ${arcadeContracts().length} · رابط تلقائي/مالك · زر الخاص + رابط شخصي للمجموعة · .موقع (منفذ/رابط/SSL${haveOpenssl ? " + HTTPS فعلي" : ""})`);
process.exit(0);
