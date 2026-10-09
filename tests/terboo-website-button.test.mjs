// ═══════════════════════════════════════════════
// 🧪 Terboo V6 — زر «🌐 موقع Bot Terboo» في القائمة الرئيسية (§29 §49)
// ───────────────────────────────────────────────
// أمر القائمة الحقيقي (.menu) عبر messageHandler وطبقة التسليم الموحّدة، والزر CTA (cta_url):
//   · بلا رابط ⇒ لا زر (لا رابط وهمي/ميت)
//   · رابط https صالح ⇒ زر واحد بنفس الرابط، وبنفس اللغة (ar · en · es)
//   · رابط قناة/دردشة واتساب أو http أو رابط مكتوب خطأً ⇒ لا زر (القناة ليست موقعاً)
//   · القوائم الفرعية لا تحمل الزر
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const BOT = "201111111118";
const USER = "201555555556@s.whatsapp.net";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-webbtn-"));
const config = (await import("../config.js")).default;
config.bot.primaryNumber = BOT;
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
db.setting("audioMenu", false);
const memory = await import("../src/lib/terboo-ai-memory.js");
memory.initMemory(path.join(tmp, "memory"));
const { loadPlugins, getPlugin } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(process.cwd(), "plugins"));
getPlugin("menu").config.cooldown = 0; // فتح القائمة مرات متتالية في الاختبار
const { messageHandler } = await import("../src/handler.js");
const website = await import("../src/lib/terboo-website.js");

const relays = [];
const texts = [];
const sock = {
  user: { id: `${BOT}:1@s.whatsapp.net`, jid: `${BOT}@s.whatsapp.net`, name: "Terboo" },
  async relayMessage(jid, message) { relays.push({ jid, message }); return "R"; },
  async sendMessage(jid, content) { texts.push(content?.text || content?.caption || ""); return { key: { id: `S${texts.length}` } }; },
  async sendPresenceUpdate() { },
  async readMessages() { },
  async profilePictureUrl() { throw new Error("no picture in tests"); },
  waUploadToServer: async () => ({}),
};

let seq = 0;
async function openMenu(lang, body = ".menu") {
  db.setUser(USER, { language: lang });
  relays.length = 0;
  texts.length = 0;
  const id = `WB${++seq}X${Date.now().toString(36).toUpperCase()}`;
  await messageHandler({ key: { remoteJid: USER, fromMe: false, id }, message: { conversation: body }, pushName: "Tester", messageTimestamp: Math.floor(Date.now() / 1000) }, sock);
  await new Promise((r) => setTimeout(r, 30));
  const buttons = relays.flatMap(({ message }) => {
    const node = message?.viewOnceMessage?.message?.interactiveMessage || message?.interactiveMessage;
    return node?.nativeFlowMessage?.buttons || [];
  });
  return buttons.filter((b) => b.name === "cta_url").map((b) => JSON.parse(b.buttonParamsJson));
}

// 1) بلا رابط
config.website.url = "";
assert.deepEqual(await openMenu("ar"), [], "بلا رابط ⇒ لا زر");
assert.equal(website.siteUrl(), "");

// 2) رابط صالح ⇒ زر بنفس الرابط وبلغة المستخدم
config.website.url = "https://terboo.example.com/";
for (const [lang, label] of [["ar", "🌐 موقع Bot Terboo"], ["en", "🌐 Bot Terboo website"], ["es", "🌐 Sitio web de Bot Terboo"]]) {
  const cta = (await openMenu(lang)).filter((b) => b.url === "https://terboo.example.com/");
  assert.equal(cta.length, 1, `${lang}: زر موقع واحد`);
  assert.equal(cta[0].display_text, label, `${lang}: التسمية بلغته`);
}

// 3) روابط مرفوضة
for (const bad of ["https://whatsapp.com/channel/0029Vb5Vczr7j6g3foFrXM2x", "https://chat.whatsapp.com/ABC", "https://wa.me/201000000000", "http://terboo.example.com", "not a url", "https://user:pass@terboo.example.com"]) {
  config.website.url = bad;
  assert.equal(website.siteUrl(), "", `مرفوض: ${bad}`);
  const cta = (await openMenu("ar")).filter((b) => /website|موقع/i.test(b.display_text));
  assert.deepEqual(cta, [], `لا زر لـ ${bad}`);
}

// 4) القوائم الفرعية بلا الزر
config.website.url = "https://terboo.example.com/";
assert.deepEqual((await openMenu("ar", ".menu settings")).filter((b) => b.url === "https://terboo.example.com/"), [], "الإعدادات بلا زر الموقع");

// 5) حالة المالك بلا أسرار
const status = website.websiteStatus();
assert.equal(status.urlValid, true);
assert.equal(status.version, config.bot.version);
assert.doesNotMatch(JSON.stringify(status), /apikey|password|token/i);

console.log("✅ terboo-website-button: بلا رابط · ar/en/es · 6 روابط مرفوضة · القوائم الفرعية · حالة المالك");
process.exit(0);
