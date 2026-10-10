// ═══════════════════════════════════════════════
// 📡 TERBOO MINI APPS — طبقة نقل الألعاب (§3.1 · §5.1 · §5.2 · §5.3 · §14.2)
// ───────────────────────────────────────────────
//  1) القدرة تُحسب من دالة إرسال حقيقية وبروتو مُختبَر، لا من قيمة إعداد
//  2) الحمولة **بلا** أي حقل إثبات ملفَّق، والحارس يرفضها لو دُسّ فيها
//  3) بروتو الحزمة الرسمية المثبّتة يحمل الشكل السلكي كاملاً (ترميز ⇒ فكّ)
//  4) النقل مفعَّل ⇒ **relayMessage واحد** بالضبط: بلا صورة وبلا أزرار وبلا رابط
//  5) النقل مطفأ ⇒ نص سبب واحد: بلا رابط موقع وبلا بطاقة وبلا أزرار (§5.2)
//  6) فشل الإرسال ⇒ نص سبب، ولا بديل صامت
//  7) HTML فوق الميزانية ⇒ يُرفض ولا يُرسل قسراً ولا يُحوَّل إلى صفحة ويب
//  8) مخرج الرابط القديم لا يعمل إلا بتفعيل صريح، ويُعلن أنه ليس Mini App
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-miniapp-tx-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
process.env.TERBOO_PUBLIC_IP = "203.0.113.77";
delete process.env.TERBOO_SITE_URL;
delete process.env.TERBOO_NATIVE_MINIAPP;
delete process.env.TERBOO_MINIAPP_WEB_LINK;
const config = (await import("../config.js")).default;
config.bot.primaryNumber = "201111111188";
config.website.url = "";
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
const site = await import("../src/lib/terboo-website.js");
const M = await import("../src/lib/terboo-miniapp.js");
const T = await import("../src/lib/terboo-miniapp-transport.js");
const { proto } = await import("@whiskeysockets/baileys");

const A = "201666666601@s.whatsapp.net";
db.setUser(A, { language: "ar", name: "A" });

/** mock socket يسجّل كل شيء صادر */
function mockSock({ relayThrows = false } = {}) {
  const out = [];
  return {
    out,
    user: { id: `${config.bot.primaryNumber}@s.whatsapp.net` },
    async sendMessage(jid, content) { out.push({ via: "sendMessage", jid, content }); return { key: { id: `M${out.length}`, remoteJid: jid } }; },
    async relayMessage(jid, message) {
      if (relayThrows) throw new Error("relay down");
      out.push({ via: "relayMessage", jid, message });
      return { key: { id: `R${out.length}`, remoteJid: jid } };
    },
    async readMessages() {}, async sendPresenceUpdate() {},
  };
}
const mkMsg = (sock, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: `K${Math.random().toString(36).slice(2, 9)}` },
  chat: jid, sender: jid, isGroup: false, prefix: ".", pushName: "A", body: ".سونك",
  reply: async (text) => sock.sendMessage(jid, { text }),
});

const IMAGE = /imageMessage|"image"|data:image|stickerMessage|videoMessage/i;
const URLISH = /https?:\/\//i;
/** كل الأزرار في كل الرسائل الصادرة */
function buttonsOf(out) {
  const found = [];
  const walk = (v) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    for (const [k, val] of Object.entries(v)) {
      if (k === "buttons" && Array.isArray(val)) found.push(...val);
      if (k === "nativeFlowMessage" && val?.buttons) found.push(...val.buttons);
      walk(val);
    }
  };
  out.forEach((o) => walk(o.content ?? o.message));
  return found;
}
const withNative = async (value, fn) => {
  const prev = process.env.TERBOO_NATIVE_MINIAPP;
  if (value === null) delete process.env.TERBOO_NATIVE_MINIAPP; else process.env.TERBOO_NATIVE_MINIAPP = value;
  try { return await fn(); } finally {
    if (prev === undefined) delete process.env.TERBOO_NATIVE_MINIAPP; else process.env.TERBOO_NATIVE_MINIAPP = prev;
  }
};

// ─── 1) القدرة من دالة إرسال حقيقية لا من إعداد ───────────────────────────
{
  const relaySock = { relayMessage: async () => ({}) };
  assert.equal(T.nativeCapability(relaySock).available, false, "مطفأ افتراضياً حتى مع مقبس سليم");
  assert.equal(T.nativeCapability(relaySock).reason, "native-transport-off");

  await withNative("on", () => {
    // التفعيل وحده لا يكفي: لا مقبس ⇒ لا قدرة، والسبب يسمّي النقص
    assert.equal(T.nativeCapability(null).available, false, "بلا مقبس لا قدرة");
    assert.equal(T.nativeCapability(null).reason, "socket-has-no-relay");
    assert.equal(T.nativeCapability({}).reason, "socket-has-no-relay", "مقبس بلا relayMessage");
    const cap = T.nativeCapability(relaySock);
    assert.equal(cap.available, true, "مقبس + تفعيل + بروتو ⇒ قدرة");
    assert.equal(cap.channel, "native-html");
    assert.equal(typeof cap.send, "function", "القدرة تحمل دالة إرسال فعلية");
  });
  assert.equal(T.protoSupportsHtmlApp().ok, true, "بروتو المشروع يحمل الشكل");
}

// ─── 2) لا حقل إثبات ملفَّق في الحمولة ────────────────────────────────────
{
  const content = T.buildHtmlAppContent({ html: "<b>x</b>", label: "XO", height: 640 });
  const text = JSON.stringify(content, (k, v) => (Buffer.isBuffer(v) ? `<${v.length}B>` : v));
  for (const field of T.FORGERY_FIELDS) {
    assert.ok(!text.includes(field), `الحمولة تحمل حقل إثبات: ${field}`);
  }
  assert.ok(!text.includes("@bot"), "لا botJid لجهة أخرى");
  // الشكل المرسَل: richResponseMessage في المستوى الأعلى، بلا غلاف «من بوت»
  assert.ok(content.richResponseMessage, "richResponseMessage في المستوى الأعلى");
  assert.ok(!(["bot", "Forwarded", "Message"].join("") in content), "غلاف انتحال البوت في الحمولة");
  assert.ok(!/NIXEL/i.test(text), "لا علامة توقيع من المكتبة المرجعية");
  assert.deepEqual(Object.keys(content.messageContextInfo).sort(), ["deviceListMetadata", "deviceListMetadataVersion"],
    "messageContextInfo بلا botMetadata");
  // الحمولة تحمل HTML فعلاً في بدائية HTML
  const unified = JSON.parse(Buffer.from(content.richResponseMessage.unifiedResponse.data).toString("utf8"));
  assert.equal(unified.sections[0].view_model.primitive.__typename, T.HTML_PRIMITIVE);
  assert.equal(unified.sections[0].view_model.primitive.payload, "<b>x</b>");
  assert.deepEqual(unified.sections[0].view_model.primitive.trusted_sources, [], "لا نطاق لا نملكه");
  assert.match(unified.response_id, /^[0-9a-f-]{36}$/, "معرّف عشوائي لكل رسالة لا ثابت");
  const second = T.buildHtmlAppContent({ html: "<b>x</b>" });
  const other = JSON.parse(Buffer.from(second.richResponseMessage.unifiedResponse.data).toString("utf8"));
  assert.notEqual(unified.response_id, other.response_id, "لا معرّف ثابت لكل الألعاب");

  // الحارس يرفض كل حقل إثبات لو دُسّ لاحقاً
  for (const field of T.FORGERY_FIELDS) {
    assert.throws(() => T.assertNoForgery({ messageContextInfo: { botMetadata: { [field]: { proofs: [] } } } }),
      /forged-verification-field/, `الحارس لم يرفض ${field}`);
  }
  assert.doesNotThrow(() => T.assertNoForgery(content), "الحمولة النظيفة تمر");
}

// ─── 3) بروتو الحزمة الرسمية يحمل الشكل كاملاً ────────────────────────────
{
  const content = T.buildHtmlAppContent({ html: "<i>ok</i>", label: "L" });
  const bytes = proto.Message.encode(content).finish();
  const back = proto.Message.decode(bytes);
  const rich = back?.richResponseMessage;
  assert.ok(rich, "richResponseMessage نجا من الترميز");
  const unified = JSON.parse(Buffer.from(rich.unifiedResponse.data).toString("utf8"));
  assert.equal(unified.sections[0].view_model.primitive.payload, "<i>ok</i>", "HTML نجا كاملاً");
  assert.equal(rich.submessages[0].messageText, "L");
}

// ─── 4) النقل مفعَّل ⇒ relayMessage واحد بالضبط ───────────────────────────
await withNative("on", async () => {
  for (const id of ["sonic", "xo"]) {
    const sock = mockSock(); const m = mkMsg(sock, A);
    const res = await M.deliverMiniApp(sock, m, id, { lang: "ar" });
    assert.equal(res.ok, true, `${id}: سُلِّمت`);
    assert.equal(res.channel, "native-html", `${id}: القناة المضمَّنة`);
    assert.equal(res.renderVerified, false, `${id}: لا يُدَّعى إثبات العرض`);
    assert.equal(sock.out.length, 1, `${id}: رسالة واحدة (${sock.out.length})`);
    assert.equal(sock.out[0].via, "relayMessage", `${id}: عبر relayMessage`);
    const text = JSON.stringify(sock.out[0], (k, v) => (Buffer.isBuffer(v) ? v.toString("utf8") : v));
    assert.doesNotMatch(text, IMAGE, `${id}: لا صورة`);
    assert.doesNotMatch(text, URLISH, `${id}: لا رابط موقع`);
    assert.equal(buttonsOf(sock.out).length, 0, `${id}: لا أزرار حركة`);
    for (const field of T.FORGERY_FIELDS) assert.ok(!text.includes(field), `${id}: ${field} في السلك`);
  }
});

// ─── 5) النقل مطفأ (الافتراضي) ⇒ نص سبب واحد بلا رابط ولا أزرار ──────────
{
  site.saveOverrides({ port: 8799, url: "https://play.terboo.example/", ssl: null });
  assert.ok(site.publicBaseUrl(), "موقع عام مضبوط — ومع ذلك لا يُستعمل");
  const sock = mockSock(); const m = mkMsg(sock, A);
  const res = await M.deliverMiniApp(sock, m, "sonic", { lang: "ar" });
  assert.equal(res.ok, false, "مطفأ ⇒ لا تسليم");
  assert.equal(res.code, "native-transport-off");
  assert.equal(sock.out.length, 1, `رسالة واحدة (${sock.out.length})`);
  const text = JSON.stringify(sock.out[0]);
  assert.doesNotMatch(text, IMAGE, "لا صورة");
  assert.doesNotMatch(text, URLISH, "لا رابط موقع حتى مع موقع مفعّل (§5.2)");
  assert.equal(buttonsOf(sock.out).length, 0, "لا أزرار حركة");
  assert.match(text, /تلفيق|Meta/, "النص يوضح سبب عدم التوفّر");
}

// ─── 6) فشل الإرسال ⇒ نص سبب، بلا بديل صامت ──────────────────────────────
await withNative("on", async () => {
  const sock = mockSock({ relayThrows: true }); const m = mkMsg(sock, A);
  const res = await M.deliverMiniApp(sock, m, "xo", { lang: "ar" });
  assert.equal(res.ok, false, "فشل النقل ⇒ لا نجاح");
  assert.equal(res.code, "relay-failed");
  assert.equal(sock.out.length, 1, `نص واحد فقط (${sock.out.length})`);
  assert.equal(sock.out[0].via, "sendMessage", "نص عبر الرد");
  const text = JSON.stringify(sock.out[0]);
  assert.doesNotMatch(text, IMAGE, "لا صورة بديلة");
  assert.doesNotMatch(text, URLISH, "لا رابط بديل");
  assert.equal(buttonsOf(sock.out).length, 0, "لا أزرار بديلة");
});

// ─── 7) HTML فوق الميزانية ⇒ يُرفض ولا يُرسل قسراً ───────────────────────
await withNative("on", async () => {
  const sock = mockSock();
  const huge = `<div>${"ب".repeat(400_000)}</div>`;
  const res = await T.sendMiniApp(sock, A, huge, { title: "big" });
  assert.equal(res.ok, false, "فوق الميزانية ⇒ يُرفض");
  assert.match(res.reason, /^html-rejected:wire-over-budget/, `السبب يسمّي الميزانية (${res.reason})`);
  assert.equal(sock.out.length, 0, "لم يُرسل شيء قسراً");
  // ومخالفة محيط تُرفض كذلك
  const bad = "<html><body><script>fetch('/x')</script></body></html>";
  const res2 = await T.sendMiniApp(sock, A, bad, { title: "net" });
  assert.equal(res2.ok, false, "واجهة شبكة ميتة ⇒ يُرفض");
  assert.match(res2.reason, /^html-rejected:network-api/, res2.reason);
  assert.equal(sock.out.length, 0, "ولا إرسال");
});

// ─── 8) مخرج الرابط القديم: تفعيل صريح فقط ───────────────────────────────
{
  process.env.TERBOO_MINIAPP_WEB_LINK = "on";
  const sock = mockSock(); const m = mkMsg(sock, A);
  const res = await M.deliverMiniApp(sock, m, "sonic", { lang: "ar" });
  delete process.env.TERBOO_MINIAPP_WEB_LINK;
  assert.equal(res.ok, true, "المخرج المُعلَن يعمل عند تفعيله");
  assert.equal(res.channel, "legacy-web-link", "واسمه يقول إنه ليس Mini App");
  assert.equal(sock.out.length, 1, "رسالة واحدة");
  // الرابط يُرسَل بهيئة cta_url مرّتين (شكلان للعميل) وهو رابط واحد منطقياً.
  // المهم أن يكون **كل** زر رابطاً: لا زر حركة ولا quick reply ولا معرّف إجراء.
  const legacyButtons = buttonsOf(sock.out);
  assert.ok(legacyButtons.length > 0, "رابط موجود");
  assert.ok(legacyButtons.every((b) => b.name === "cta_url"), `كل زر رابط: ${legacyButtons.map((b) => b.name).join(",")}`);
  const urls = new Set(legacyButtons.map((b) => JSON.parse(b.buttonParamsJson || "{}").url));
  assert.equal(urls.size, 1, `رابط واحد لا أكثر (${[...urls].length})`);
  assert.ok([...urls][0].startsWith("https://play.terboo.example/"), "من نطاق المالك فقط");
  // وبلا تفعيل لا يُستدعى أبداً
  const sock2 = mockSock(); const m2 = mkMsg(sock2, A);
  const off = await M.deliverMiniApp(sock2, m2, "sonic", { lang: "ar" });
  assert.equal(off.code, "native-transport-off", "بلا تفعيل لا مخرج");
  assert.doesNotMatch(JSON.stringify(sock2.out[0]), URLISH, "ولا رابط");
}

// ─── 9) اللغة من الطرف للطرف · لعبة مجهولة صامتة ─────────────────────────
await withNative("on", async () => {
  for (const [lang, needle] of [["en", /Speed Run|Tic Tac Toe/], ["es", /Speed Run|Tres en raya/]]) {
    const sock = mockSock(); const m = mkMsg(sock, A);
    await M.deliverMiniApp(sock, m, "xo", { lang });
    const text = JSON.stringify(sock.out[0], (k, v) => (Buffer.isBuffer(v) ? v.toString("utf8") : v));
    assert.match(text, needle, `${lang}: نص اللغة في الحمولة`);
  }
  const sock = mockSock(); const m = mkMsg(sock, A);
  const res = await M.deliverMiniApp(sock, m, "nope", { lang: "ar" });
  assert.equal(res.ok, false);
  assert.equal(res.code, "unknown-mini-app");
  assert.equal(sock.out.length, 0, "لعبة مجهولة لا تُرسل شيئاً");
});

console.log("✅ terboo-miniapp-transport: القدرة من دالة إرسال حقيقية · 0 حقل إثبات ملفَّق (حارس مُختبَر) · بروتو الحزمة الرسمية يحمل الشكل · relayMessage واحد لكل لعبة · مطفأ ⇒ نص سبب بلا رابط ولا أزرار · فشل ⇒ نص بلا بديل · ميزانية ومحيط يرفضان قبل الإرسال · مخرج الرابط بتفعيل صريح");
process.exit(0);
