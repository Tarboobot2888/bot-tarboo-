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
import { nativeCapability, sendMiniApp } from "./terboo-miniapp-transport.js";
import { buildSonicRunnerHtml } from "./miniapps/sonic-runner.js";
import { buildTicTacToeHtml } from "./miniapps/xo.js";
import { buildSnakeHtml } from "./miniapps/snake.js";
import { buildMemoryHtml } from "./miniapps/memory.js";
import { build2048Html } from "./miniapps/n2048.js";

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
  ["snake", {
    id: "snake", icon: "🐍", build: buildSnakeHtml,
    name: { ar: "ثعبان الشبكة", en: "Grid Snake", es: "Serpiente" },
    blurb: { ar: "اسحب لتوجيه الثعبان وكُل بلا أن تلمس نفسك", en: "Swipe to steer, eat without biting yourself", es: "Desliza para girar y come sin morderte" },
    category: "arcade", height: 760,
  }],
  ["memory", {
    id: "memory", icon: "🧠", build: buildMemoryHtml,
    name: { ar: "الذاكرة", en: "Memory Match", es: "Memoria" },
    blurb: { ar: "ثمانية أزواج · اقلب واحفظ", en: "Eight pairs · flip and remember", es: "Ocho pares · voltea y recuerda" },
    category: "puzzle", height: 700,
  }],
  ["n2048", {
    id: "n2048", icon: "🔢", build: build2048Html,
    name: { ar: "٢٠٤٨", en: "2048", es: "2048" },
    blurb: { ar: "اسحب لدمج الأرقام حتى 2048", en: "Swipe to merge numbers up to 2048", es: "Combina numeros hasta 2048" },
    category: "puzzle", height: 700,
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
function nativeTransport(sock = null) {
  // مصدر الحقيقة الوحيد هو طبقة النقل: القدرة تُحسب من دالة إرسال حقيقية
  // وبروتو مُختبَر، لا من قيمة إعداد. هذا الغلاف للمستدعين السابقين فقط،
  // ويعمل بلا مقبس فيعلن السبب `socket-has-no-relay` بدل ادّعاء التوفّر.
  const { available, channel, reason } = nativeCapability(sock);
  return { available, channel, reason };
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

  // ── القناة المضمَّنة: تجربة اللعبة داخل الرسالة نفسها ──
  const capability = nativeCapability(sock);
  if (capability.available) {
    const built = renderMiniApp(id, { lang: l });
    if (!built.ok) {
      noteFailure("miniapp", new Error(`build:${built.code}`), { where: "terboo-miniapp:deliverMiniApp", stage: id, fallback: "text" });
      await m.reply(TEXT[l].buildFailed);
      return { ok: false, channel: "none", code: built.code };
    }
    const sent = await sendMiniApp(sock, m.chat, built.html, {
      title: app.name[l],
      label: `${app.icon} ${app.name[l]}`,
      height: app.height,
      appId: app.id,
    });
    if (sent.ok) {
      // رسالة واحدة فقط. لا بطاقة ولا أزرار ولا صورة بعدها.
      // `renderVerified: false` دائماً: نجاح الإرسال ليس إثباتاً للعرض.
      return { ok: true, channel: sent.channel, renderVerified: false, messageId: sent.messageId };
    }
    // فشل النقل ⇒ سبب صريح. لا رابط موقع ولا أزرار حركة بديلاً (§5.2).
    await m.reply(`${TEXT[l].relayFailed}\n> ${sent.reason}`);
    return { ok: false, channel: "none", code: sent.reason };
  }

  // ── القناة غير متاحة ──
  // مفتاح منفصل وصريح للسلوك القديم (بطاقة برابط الموقع). مطفأ افتراضياً،
  // واسمه يقول ما هو: **ليس** Mini App ولا جزءاً من المسار المطلوب، بل
  // مخرج يملكه المالك حتى لا تُفقد وظيفة عاملة بلا قراره.
  if (String(process.env.TERBOO_MINIAPP_WEB_LINK || config.arcade?.html?.legacyWebLink || "off").toLowerCase() === "on") {
    return deliverLegacyWebLink(sock, m, app, l);
  }

  await m.reply(`${unavailableText(l, capability.reason)}\n> ${capability.reason}`);
  return { ok: false, channel: "none", code: capability.reason };
}

/**
 * نص سبب عدم التوفّر **حسب السبب الفعلي**.
 *
 * كان نصّ واحد يُطبع لكل الأسباب، فمن لم يُشغّل المفتاح يُقرأ له أن الميزة
 * مستحيلة — وهو خطأ: «مطفأ» سببه قرار المالك، و«يتطلّب تلفيقاً» وصفٌ لحالة
 * أخرى تماماً. السبب المجهول يأخذ النص العام لا نصاً مخترعاً.
 * @param {string} lang
 * @param {string} reason رمز السبب من nativeCapability
 */
function unavailableText(lang, reason) {
  const t = TEXT[langOf(lang)];
  if (reason === "native-transport-off") return t.transportOff;
  if (reason === "socket-has-no-relay") return t.socketNotReady;
  if (String(reason).startsWith("proto-")) return t.protoMissing;
  return t.noTransport;
}

/**
 * السلوك القديم: بطاقة واحدة برابط صفحة اللعب على موقع المالك.
 * ليس Mini App مضمَّناً، ولا يُستدعى إلا بتفعيل المالك الصريح.
 */
async function deliverLegacyWebLink(sock, m, app, l) {
  const url = miniAppUrl(app.id, { lang: l });
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
    });
    return { ok: true, channel: "legacy-web-link", url };
  } catch (error) {
    noteFailure("miniapp", error, { where: "terboo-miniapp:deliverLegacyWebLink", stage: `${app.id}:card`, fallback: "text" });
    try { await m.reply(`${app.icon} ${app.name[l]}\n${url}`); } catch (inner) {
      noteFailure("miniapp", inner, { where: "terboo-miniapp:deliverLegacyWebLink", stage: `${app.id}:text`, fallback: "none" });
      return { ok: false, channel: "none", code: "send-failed" };
    }
    return { ok: true, channel: "legacy-text-link", url };
  }
}

const TEXT = {
  ar: { play: "🎮 افتح اللعبة", open: "اضغط الزر لفتح اللعبة التفاعلية — اللعب باللمس داخل الصفحة.",
        footer: "TERBOO ARCADE", noSite: "⚠️ اللعبة تحتاج موقع البوت مفعّلاً.\n> المالك: فعّله بـ«.موقع تشغيل» واضبط الرابط العام.",
        noTransport: "⚠️ *تجربة اللعبة داخل الرسالة غير متاحة.*\nلا توجد قناة نقل مشروعة لعرض HTML في فقاعة واتساب: القناة الوحيدة المعروفة تتطلّب تلفيق إثبات تحقق Meta، وهو مرفوض.",
        transportOff: "🎮 *تجربة اللعبة داخل الرسالة مطفأة.*\nهذا هو الوضع الافتراضي: عرض HTML في فقاعة واتساب لم يُختبر على جهاز حقيقي بعد، فلا يُفعَّل تلقائياً.\n> المالك: شغّل البوت بـ«TERBOO_NATIVE_MINIAPP=on» ثم أعِد الأمر لتجربة العرض على جهازك. التفصيل في TERBOO_GAME_MINIAPP_SETUP.md §4.",
        socketNotReady: "⚠️ *الاتصال غير جاهز الآن.*\nتعذّر إرسال اللعبة لأن اتصال واتساب لم يكتمل. أعِد المحاولة بعد لحظات.",
        protoMissing: "⚠️ *الحزمة المثبّتة لا تحمل شكل رسالة اللعبة.*\n> المالك: شغّل «npm ci» للعودة إلى @whiskeysockets/baileys المثبّت في package-lock.json.",
        relayFailed: "⚠️ *تعذّر إرسال اللعبة كتجربة HTML داخل الرسالة.*\nلم تُرسل بطاقة ولا رابط بديلاً — السبب مسجَّل:",
        buildFailed: "⚠️ *تعذّر بناء مستند اللعبة.* لم تُرسل بطاقة ولا رابط بديلاً، والسبب مسجَّل في سجل الإخفاقات." },
  en: { play: "🎮 Open the game", open: "Tap to open the interactive game — play by touch inside the page.",
        footer: "TERBOO ARCADE", noSite: "⚠️ This game needs the bot website enabled.\n> Owner: enable it and set the public URL.",
        noTransport: "⚠️ *In-message game experience is unavailable.*\nThere is no legitimate channel for rendering HTML inside a WhatsApp bubble: the only known one requires forging Meta verification proof, which is refused.",
        transportOff: "🎮 *The in-message game experience is switched off.*\nThat is the default: rendering HTML inside a WhatsApp bubble has not been verified on a real device, so it is not enabled on its own.\n> Owner: start the bot with \"TERBOO_NATIVE_MINIAPP=on\" and run the command again to test it on your phone. See TERBOO_GAME_MINIAPP_SETUP.md §4.",
        socketNotReady: "⚠️ *The connection is not ready yet.*\nThe game could not be sent because the WhatsApp connection is still coming up. Try again in a moment.",
        protoMissing: "⚠️ *The installed package does not carry the game message shape.*\n> Owner: run \"npm ci\" to restore @whiskeysockets/baileys as pinned in package-lock.json.",
        relayFailed: "⚠️ *Could not send the game as an in-message HTML experience.*\nNo card and no link were sent instead — the reason is logged:",
        buildFailed: "⚠️ *Could not build the game document.* No card and no link were sent instead; the reason is in the failure log." },
  es: { play: "🎮 Abrir el juego", open: "Pulsa para abrir el juego interactivo — se juega tocando la pagina.",
        footer: "TERBOO ARCADE", noSite: "⚠️ Este juego necesita el sitio del bot activo.\n> Dueño: actívalo y define la URL publica.",
        noTransport: "⚠️ *La experiencia del juego dentro del mensaje no esta disponible.*\nNo hay canal legitimo para mostrar HTML en una burbuja de WhatsApp: el unico conocido exige falsificar la prueba de verificacion de Meta, y se rechaza.",
        transportOff: "🎮 *La experiencia del juego dentro del mensaje esta apagada.*\nEs el valor por defecto: mostrar HTML en una burbuja de WhatsApp no se ha verificado en un dispositivo real, asi que no se activa solo.\n> Dueño: inicia el bot con \"TERBOO_NATIVE_MINIAPP=on\" y repite el comando para probarlo en tu telefono. Ver TERBOO_GAME_MINIAPP_SETUP.md §4.",
        socketNotReady: "⚠️ *La conexion aun no esta lista.*\nNo se pudo enviar el juego porque la conexion de WhatsApp todavia se esta estableciendo. Intenta de nuevo en un momento.",
        protoMissing: "⚠️ *El paquete instalado no lleva la forma del mensaje del juego.*\n> Dueño: ejecuta \"npm ci\" para restaurar @whiskeysockets/baileys segun package-lock.json.",
        relayFailed: "⚠️ *No se pudo enviar el juego como experiencia HTML dentro del mensaje.*\nNo se envio ninguna tarjeta ni enlace en su lugar — el motivo queda registrado:",
        buildFailed: "⚠️ *No se pudo construir el documento del juego.* No se envio tarjeta ni enlace; el motivo esta en el registro de fallos." },
};

export { MAX_APP_BYTES, MINI_APPS, deliverMiniApp, hasMiniApp, miniApp, miniAppUrl, miniApps, nativeCapability, nativeTransport, renderMiniApp };
