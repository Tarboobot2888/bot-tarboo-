// ═══════════════════════════════════════════════
// 📡 TERBOO MINI APPS — النقل والتكامل (§18.2 · §18.3 · §6.3)
// ───────────────────────────────────────────────
// 1) القناة المضمَّنة لا تُعلن متاحة بلا دليل، وسببها صريح
// 2) الأمر ⇒ **رسالة واحدة** بالضبط: بلا بطاقة ثانية وبلا أزرار حركة وبلا صورة
// 3) فشل النقل ⇒ نص واضح فقط (لا صورة ولا أزرار بديلة صامتة)
// 4) بلا موقع عام ⇒ رسالة سبب مفهومة، لا سقوط صامت
// 5) لا تسريب: الرابط من نطاق المالك فقط
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
const config = (await import("../config.js")).default;
config.bot.primaryNumber = "201111111188";
config.website.url = "";
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
const site = await import("../src/lib/terboo-website.js");
const M = await import("../src/lib/terboo-miniapp.js");

const A = "201666666601@s.whatsapp.net";
db.setUser(A, { language: "ar", name: "A" });

/** mock socket يسجّل كل شيء صادر */
function mockSock() {
  const out = [];
  return {
    out,
    user: { id: `${config.bot.primaryNumber}@s.whatsapp.net` },
    async sendMessage(jid, content) { out.push({ via: "sendMessage", jid, content }); return { key: { id: `M${out.length}`, remoteJid: jid } }; },
    async relayMessage(jid, message) { out.push({ via: "relayMessage", jid, message }); return { key: { id: `R${out.length}`, remoteJid: jid } }; },
    async readMessages() {}, async sendPresenceUpdate() {},
  };
}
const mkMsg = (sock, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: `K${Math.random().toString(36).slice(2, 9)}` },
  chat: jid, sender: jid, isGroup: false, prefix: ".", pushName: "A", body: ".سونك",
  reply: async (text) => sock.sendMessage(jid, { text }),
});

const IMAGE = /imageMessage|"image"|data:image|stickerMessage|videoMessage/i;
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

// ─────────────── 1) القناة المضمَّنة ───────────────
{
  const nt = M.nativeTransport();
  assert.equal(nt.available, false, "لا تُعلن متاحة بلا دليل");
  assert.ok(String(nt.reason || "").length > 3, "سبب صريح");
  // التفعيل الصريح وحده لا يكفي: القناة تبقى غير متاحة وتقول السبب الحقيقي
  const prev = process.env.TERBOO_NATIVE_MINIAPP;
  process.env.TERBOO_NATIVE_MINIAPP = "on";
  const forced = M.nativeTransport();
  assert.equal(forced.available, false, "التفعيل لا يخترع قناة");
  assert.match(forced.reason, /forged|verification/i, "السبب يذكر سبب الرفض");
  if (prev === undefined) delete process.env.TERBOO_NATIVE_MINIAPP; else process.env.TERBOO_NATIVE_MINIAPP = prev;
}

// ─────────────── 2) بلا موقع عام ⇒ سبب مفهوم، رسالة واحدة ───────────────
{
  site.saveOverrides({ port: 0, url: null, ssl: null });
  const sock = mockSock(); const m = mkMsg(sock, A);
  const res = await M.deliverMiniApp(sock, m, "sonic", { lang: "ar" });
  assert.equal(res.ok, false, "بلا موقع ⇒ لا تسليم");
  assert.equal(res.code, "no-public-site");
  assert.equal(sock.out.length, 1, `رسالة واحدة فقط (${sock.out.length})`);
  const txt = JSON.stringify(sock.out[0]);
  assert.doesNotMatch(txt, IMAGE, "لا صورة");
  assert.match(txt, /موقع/, "نص يوضح السبب");
}

// ─────────────── 3) مع موقع عام ⇒ رسالة واحدة بزر رابط واحد، بلا أزرار حركة ───────────────
{
  site.saveOverrides({ port: 8799, url: "https://play.terboo.example/", ssl: null });
  assert.ok(site.publicBaseUrl(), "رابط عام مضبوط");
  for (const id of ["sonic", "xo"]) {
    const sock = mockSock(); const m = mkMsg(sock, A);
    const res = await M.deliverMiniApp(sock, m, id, { lang: "ar" });
    assert.equal(res.ok, true, `${id}: تم التسليم (${res.code || ""})`);
    assert.equal(res.channel, "web-mini-app", `${id}: القناة`);
    assert.equal(sock.out.length, 1, `${id}: **رسالة واحدة** بالضبط (${sock.out.length})`);
    const blob = JSON.stringify(sock.out[0]);
    assert.doesNotMatch(blob, IMAGE, `${id}: لا صورة`);
    // زر واحد فقط وهو رابط — لا أزرار حركة
    const btns = buttonsOf(sock.out);
    const urlBtns = btns.filter((b) => b?.name === "cta_url" || /"url"/.test(JSON.stringify(b)));
    assert.ok(urlBtns.length >= 1, `${id}: زر رابط موجود`);
    const moveBtns = btns.filter((b) => /اركيد a |"id":"\.\S+ a /.test(JSON.stringify(b)));
    assert.equal(moveBtns.length, 0, `${id}: لا أزرار حركة واتساب`);
    assert.match(blob, /play\.terboo\.example/, `${id}: الرابط من نطاق المالك`);
    assert.match(blob, new RegExp(`/app/${id}`), `${id}: مسار اللعبة`);
    assert.doesNotMatch(blob, /nixel|yudzxml|localhost|127\.0\.0\.1/i, `${id}: لا نطاق غريب`);
  }
}

// ─────────────── 4) فشل إرسال البطاقة ⇒ نص فقط، لا صورة ولا أزرار ───────────────
{
  const sock = mockSock();
  const m = mkMsg(sock, A);
  const orig = sock.relayMessage;
  sock.relayMessage = async () => { throw new Error("relay down"); };
  const res = await M.deliverMiniApp(sock, m, "xo", { lang: "ar" });
  const blob = JSON.stringify(sock.out);
  assert.doesNotMatch(blob, IMAGE, "فشل النقل: لا صورة");
  assert.ok(sock.out.length >= 1, "فشل النقل: أُرسل نص");
  assert.ok(res.channel === "text-link" || res.channel === "web-mini-app", `قناة بديلة نصية (${res.channel})`);
  assert.equal(buttonsOf(sock.out).filter((b) => /اركيد a /.test(JSON.stringify(b))).length, 0, "لا أزرار حركة بديلة");
  sock.relayMessage = orig;
}

// ─────────────── 5) اللغة تمر من الطرف إلى الطرف ───────────────
{
  for (const [lang, probe] of [["en", /Tic Tac Toe|Speed Run/], ["es", /Tres en raya|Speed Run/]]) {
    const sock = mockSock(); const m = mkMsg(sock, A);
    await M.deliverMiniApp(sock, m, "xo", { lang });
    const blob = JSON.stringify(sock.out);
    assert.match(blob, probe, `اللغة ${lang} في نص الرسالة`);
    assert.match(blob, new RegExp(`lang=${lang}`), `اللغة ${lang} في الرابط`);
  }
}

// ─────────────── 6) لعبة غير مسجّلة ───────────────
{
  const sock = mockSock(); const m = mkMsg(sock, A);
  const res = await M.deliverMiniApp(sock, m, "nope", { lang: "ar" });
  assert.equal(res.ok, false);
  assert.equal(res.code, "unknown-mini-app");
  assert.equal(sock.out.length, 0, "لعبة غير مسجّلة لا ترسل شيئاً");
}

console.log("✅ terboo-miniapp-transport: القناة المضمَّنة معلَّلة ولا تُعلن · رسالة واحدة لكل لعبة · 0 صورة · 0 زر حركة · رابط من نطاق المالك · فشل النقل ⇒ نص · اللغة من الطرف للطرف · لعبة مجهولة صامتة");
process.exit(0);
