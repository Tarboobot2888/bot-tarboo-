// ═══════════════════════════════════════════════
// 🎮 TERBOO MINI APPS — السجل والنقل (طبقة واحدة لكل الألعاب المستقلة)
// ───────────────────────────────────────────────
// ثلاث طبقات منفصلة (§5):
//   1) Builder  : src/lib/miniapps/<game>.js ⇒ مستند HTML مستقل. لا يعرف sock ولا m.
//   2) Transport: هذا الملف ⇒ يتحقق ويختار القناة ويرسل **رسالة واحدة**.
//   3) Plugin   : plugins/game/<game>.js ⇒ أمر ولغة فقط، بلا بروتوكول ولا CSS.
//
// ── لماذا لا نستخدم sendHtmlApp ──────────────────────────────────────────
// الحزمة @yudzxml/baileys@7.6.6 توفّر sendHtmlApp، وفحصُها أثبت أنها تعمل عبر
// **تزوير إثبات تحقق Meta**: AIRich.generateVerificationMetadata() تبني
// signature (64 بايت) و certificateChain (684 و892 بايت) من نص ثابت
// "NIXEL.MessageBuilderV4.7" مُعمّى بـ\uXXXX + حشو عشوائي، وتُرسل داخل
// botForwardedMessage + botMetadata لتبدو رداً موثقاً من مساعد Meta.
// هذا ينتهك شرط القبول السابع صراحةً («لا توقيعات ولا شهادات ولا حقول تحقق
// مصطنعة») ويعرّض حساب واتساب للحظر. التفاصيل والإثبات في
// TERBOO_NATIVE_MINIAPP_AUDIT.md §3.
//
// البديل المنفَّذ: نفس HTML التفاعلي بالضبط، يُفتح بنقرة واحدة من زر داخل رسالة
// واتساب في متصفح أندرويد المدمج على رابط HTTPS من نطاق المالك. اللمس والرسم
// وتحديث الحالة كلها داخل الصفحة، بلا أزرار حركة في واتساب وبرسالة واحدة فقط.
// ═══════════════════════════════════════════════

import config from "../../config.js";
import { noteFailure } from "./terboo-failure-log.js";
import { validateTemplate } from "./terboo-html-game.js";
import { publicBaseUrl, link } from "./terboo-website.js";
import { sendCard } from "./terboo-ui-kit.js";
import { buildSonicRunnerHtml } from "./miniapps/sonic-runner.js";
import { buildTicTacToeHtml } from "./miniapps/xo.js";

/** حد الحجم لصفحة مستقلة تُخدم عبر HTTPS (ليس حد رسالة) */
const MAX_APP_BYTES = 256 * 1024;

/**
 * سجل الألعاب المستقلة. كل مدخل: builder + بيانات عرض.
 * إضافة لعبة = سطر هنا + ملف builder + plugin رقيق. لا تفاصيل بروتوكول في أي منها.
 */
const MINI_APPS = new Map([
  ["sonic", {
    id: "sonic", icon: "🌀", build: buildSonicRunnerHtml,
    name: { ar: "سونك ران", en: "Speed Run", es: "Speed Run" },
    blurb: { ar: "جري وقفز وجمع حلقات", en: "Run, jump, collect rings", es: "Corre, salta y recoge anillos" },
    category: "arcade", height: 720,
  }],
  ["xo", {
    id: "xo", icon: "❌", build: buildTicTacToeHtml,
    name: { ar: "إكس أو", en: "Tic Tac Toe", es: "Tres en raya" },
    blurb: { ar: "ضد الكمبيوتر بثلاث مستويات", en: "vs the computer, three levels", es: "contra la maquina, tres niveles" },
    category: "board", height: 640,
  }],
]);

const LANGS = new Set(["ar", "en", "es"]);
const langOf = (lang) => (LANGS.has(String(lang)) ? String(lang) : "ar");

/** هل المعرّف لعبة مستقلة مسجّلة؟ */
const hasMiniApp = (id) => MINI_APPS.has(String(id));
/** تعريف لعبة أو null */
const miniApp = (id) => MINI_APPS.get(String(id)) || null;
/** كل التعريفات */
const miniApps = () => [...MINI_APPS.values()];

/**
 * قدرة النقل المضمَّن داخل فقاعة الرسالة.
 * تُفحص في كل استدعاء ولا تُفترض. تعيد سبباً صريحاً عند عدم التوفر.
 * @returns {{available:boolean, channel:string, reason:string}}
 */
function nativeTransport() {
  // الإصدار الرسمي المثبّت لا يملك هذه الواجهة أصلاً
  // البيئة أولاً ثم الإعداد — نفس أسبقية resolveHtmlTransport وكتلة secrets،
  // وإلا حجبت قيمة الإعداد (التي تُقرأ مرة عند التحميل) أي تغيير لاحق في البيئة.
  const configured = String(process.env.TERBOO_NATIVE_MINIAPP || config.arcade?.html?.nativeTransport || "off").trim().toLowerCase();
  if (configured !== "on") {
    return { available: false, channel: "none", reason: "native-transport-disabled" };
  }
  return { available: false, channel: "none", reason: "requires-forged-bot-verification" };
}

/**
 * يبني مستند اللعبة ويتحقق منه.
 * @returns {{ok:boolean, html?:string, bytes?:number, code?:string, errors?:string[]}}
 */
function renderMiniApp(id, { lang = "ar", nonce = "" } = {}) {
  const app = miniApp(id);
  if (!app) return { ok: false, code: "unknown-mini-app" };
  let html;
  try {
    html = app.build(langOf(lang), { nonce });
  } catch (error) {
    noteFailure("miniapp", error, { where: "terboo-miniapp:renderMiniApp", stage: id, fallback: "no-app" });
    return { ok: false, code: "build-failed" };
  }
  const bytes = Buffer.byteLength(String(html || ""), "utf8");
  if (!html || bytes < 200) return { ok: false, code: "empty-app" };
  if (bytes > MAX_APP_BYTES) return { ok: false, code: "too-large", errors: [`${bytes}B`] };
  // نفس مدقّق المشروع، لكن الصفحة المستقلة تحتاج <script> الخاص بها.
  // نفحص كل شيء عدا وسم script، ونمنع أي مورد خارجي أو بروتوكول خطر.
  const probe = validateTemplate(String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ""));
  const blocking = (probe.errors || []).filter((e) => e !== "too-many-styles");
  if (blocking.length) return { ok: false, code: "unsafe-template", errors: blocking };
  if (/<script[^>]+\bsrc\s*=/i.test(html)) return { ok: false, code: "external-script" };
  if (/\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i.test(html)) return { ok: false, code: "external-resource" };
  return { ok: true, html, bytes };
}

/** رابط الصفحة المستقلة لهذه اللعبة، أو "" إن لم يتوفر موقع عام */
function miniAppUrl(id, { lang = "ar" } = {}) {
  if (!hasMiniApp(id) || !publicBaseUrl()) return "";
  return link(`/app/${encodeURIComponent(id)}?lang=${encodeURIComponent(langOf(lang))}`);
}

/**
 * يسلّم اللعبة في **رسالة واحدة** (§6.3).
 * لا يمر من deliverVisual ولا يرسل بطاقة ثانية ولا أزرار حركة.
 * @returns {Promise<{ok:boolean, channel:string, code?:string, url?:string}>}
 */
async function deliverMiniApp(sock, m, id, { lang = "ar" } = {}) {
  const app = miniApp(id);
  const l = langOf(lang);
  if (!app) return { ok: false, channel: "none", code: "unknown-mini-app" };

  // 1) القناة المضمَّنة — تُفحص أولاً دائماً، وتُستعمل فور توفّرها بشكل مشروع
  const native = nativeTransport();
  // `available` وحده لا يكفي: القناة يجب أن تقدّم دالة إرسال فعلية، وإلا فهي وصف لا نقل.
  if (native.available && typeof native.send === "function") {
    const built = renderMiniApp(id, { lang: l });
    if (built.ok) {
      try {
        const sent = await native.send(sock, m.chat, built.html, { title: app.name[l], height: app.height });
        if (sent?.relayed) return { ok: true, channel: native.channel };
        noteFailure("miniapp", new Error(sent?.reason || "native-relay-failed"), { where: "terboo-miniapp:deliverMiniApp", stage: id, fallback: "web-mini-app" });
      } catch (error) {
        noteFailure("miniapp", error, { where: "terboo-miniapp:deliverMiniApp", stage: id, fallback: "web-mini-app" });
      }
    }
  }

  // 2) صفحة Mini App على HTTPS — نفس HTML، تفاعل كامل باللمس، رسالة واحدة
  const url = miniAppUrl(id, { lang: l });
  if (!url) {
    await m.reply(TEXT[l].noSite);
    return { ok: false, channel: "none", code: "no-public-site" };
  }
  try {
    await sendCard(sock, m, {
      cardId: `miniapp:${app.id}`,
      lang: l,
      text: `${app.icon} *${app.name[l]}*\n${app.blurb[l]}\n\n${TEXT[l].open}`,
      footer: TEXT[l].footer,
      links: [{ text: TEXT[l].play, url }],
      // لا buttons ولا select: لا أزرار حركة في واتساب لهذه الألعاب
    });
    return { ok: true, channel: "web-mini-app", url };
  } catch (error) {
    noteFailure("miniapp", error, { where: "terboo-miniapp:deliverMiniApp", stage: `${id}:card`, fallback: "text" });
    // فشل النقل ⇒ نص واضح فقط. لا صورة، ولا أزرار حركة، ولا إعادة محاولة صامتة.
    try { await m.reply(`${app.icon} ${app.name[l]}\n${url}`); } catch (inner) {
      noteFailure("miniapp", inner, { where: "terboo-miniapp:deliverMiniApp", stage: `${id}:text`, fallback: "none" });
      return { ok: false, channel: "none", code: "send-failed" };
    }
    return { ok: true, channel: "text-link", url };
  }
}

const TEXT = {
  ar: { play: "🎮 افتح اللعبة", open: "اضغط الزر لفتح اللعبة التفاعلية — اللعب باللمس داخل الصفحة.",
        footer: "TERBOO ARCADE", noSite: "⚠️ اللعبة تحتاج موقع البوت مفعّلاً.\n> المالك: فعّله بـ«.موقع تشغيل» واضبط الرابط العام." },
  en: { play: "🎮 Open the game", open: "Tap to open the interactive game — play by touch inside the page.",
        footer: "TERBOO ARCADE", noSite: "⚠️ This game needs the bot website enabled.\n> Owner: enable it and set the public URL." },
  es: { play: "🎮 Abrir el juego", open: "Pulsa para abrir el juego interactivo — se juega tocando la pagina.",
        footer: "TERBOO ARCADE", noSite: "⚠️ Este juego necesita el sitio del bot activo.\n> Dueño: actívalo y define la URL publica." },
};

export { MAX_APP_BYTES, MINI_APPS, deliverMiniApp, hasMiniApp, miniApp, miniAppUrl, miniApps, nativeTransport, renderMiniApp };
