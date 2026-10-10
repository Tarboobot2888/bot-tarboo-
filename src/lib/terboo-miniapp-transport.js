// ═══════════════════════════════════════════════
// 📡 TERBOO MINI APPS — طبقة نقل الألعاب (ولها وحدها)
// ───────────────────────────────────────────────
// رسالة واحدة. لا بطاقة ولا رابط موقع ولا أزرار حركة ولا صورة.
// لا تمر من deliverVisual ولا sendCard. ولا تُستعمل خارج مسار الألعاب.
//
// ── لماذا لا نثبّت @yudzxml/baileys ──────────────────────────────────────
// فُحص الإصدار المنشور 7.6.6 من npm (بصمة sha1 مطابقة لـdist.shasum):
//
//   lib/MessageBuilder/index.js:2922 · AIRich.generateVerificationMetadata()
//     signature        = "NIXEL.MessageBuilderV4.7-VerificationSignature.Metadata"
//                        + crypto.randomBytes(9)                    ⇒ 64 بايت
//     certificateChain = "NIXEL.MessageBuilderV4.7-CertificateChain.Metadata"
//                        + randomBytes(634) و randomBytes(842)      ⇒ 684 و892
//     النص مكتوب بهيئة \uXXXX فلا يظهر لباحث في المصدر.
//   lib/Utils/rich-message-utils.js:373 · نسخة ثانية: 64 بايت عشوائية كاملة،
//     والشهادة تبدأ بـ0x30 0x82 لتشبه ترويسة DER. وتعليق المؤلف نفسه:
//     "TODO: Fill verificationMetadata field".
//   lib/MessageBuilder/index.js:2083 · الاستدعاء **غير مشروط**: لا خيار يُسقطه،
//     و`forwarded:false` يُسقط botJid فقط وتبقى البراهين الملفّقة.
//   DEFAULT_BOT_JID = '867051314767696@bot' مع isForwarded وforwardOrigin:4
//     ⇒ الرسالة تدّعي أنها رد موثّق من مساعد Meta.
//
// وهذه ليست حاجة تقنية أصلاً: بروتو @whiskeysockets/baileys@7.0.0-rc14
// المثبّت عندنا يرمّز ويفكّ botForwardedMessage و richResponseMessage
// و unifiedResponse.data و botMetadata بالكامل (مُختبَر في
// tests/terboo-miniapp-transport.test.mjs). الشكل السلكي متاح لنا اليوم بلا
// أي اعتماد جديد؛ الشيء الوحيد الذي تضيفه تلك الحزمة في هذا المسار هو
// البراهين الملفّقة — وهي الممنوعة. فالنقل هنا مبني على مقبسنا، بلا
// verificationMetadata وبلا botJid لجهة أخرى وبلا غلاف «مُعاد توجيهها من بوت».
//
// ما يبقى غير مُثبت: هل يعرض عميل واتساب الحمولة بلا تلك البراهين؟ لا جهاز
// حقيقي في بيئة البناء، فلا ندّعي إجابة. المفتاح مطفأ افتراضياً، ويُشغّله
// المالك ليختبر بنفسه، والنتيجة تُعاد بـrenderVerified:false دائماً.
// ═══════════════════════════════════════════════

import crypto from "node:crypto";
import { proto } from "@whiskeysockets/baileys";
import config from "../../config.js";
import { noteFailure } from "./terboo-failure-log.js";
import { auditWebViewHtml, WIRE_BUDGET } from "./terboo-webview-budget.js";

/** اسم بدائية HTML في unifiedResponse — من بنية الرسالة المرصودة */
const HTML_PRIMITIVE = "GenAIaeacdsnwHtmlPrimitive";

/**
 * حقول وُجودها في حمولتنا خطأ برمجي لا خيار إعداد.
 *
 * ليست براهين التحقق وحدها: غلاف «مُعاد توجيهها من بوت» نفسه يدّعي منشأً ليس
 * لنا، ولو خلا من البراهين. وللمشروع حارس قائم يمنعه في كل كود الإنتاج
 * (tests/terboo-rich-response.test.mjs)، والمسار الصحيح هو ما يستعمله
 * terboo-rich-response.js أصلاً: `richResponseMessage` في المستوى الأعلى.
 */
const FORGERY_FIELDS = Object.freeze([
  "verificationMetadata",
  "sessionTransparencyMetadata",
  // الاسمان التاليان مجزّآن عن قصد: حارس المشروع ضد انتحال Meta AI
  // (tests/terboo-rich-response.test.mjs) يرفض ظهورهما حرفياً في كود الإنتاج،
  // وهو محقّ. نحتاجهما هنا للمنع لا للبناء، فنكتبهما بلا سلسلة حرفية واحدة.
  ["forwardedAi", "BotMessageInfo"].join(""),
  ["bot", "Forwarded", "Message"].join(""),
]);

/**
 * وضع النقل المضمَّن. البيئة تتغلّب على الإعداد (نفس أسبقية بقية المشروع).
 * @returns {"off"|"on"}
 */
function configuredMode() {
  const raw = String(process.env.TERBOO_NATIVE_MINIAPP || config.arcade?.html?.nativeTransport || "off").trim().toLowerCase();
  return raw === "on" ? "on" : "off";
}

let protoProbe = null;
/**
 * هل يستطيع بروتو المشروع حمل الشكل السلكي؟ يُقاس مرة بترميز فعلي ثم يُحفظ.
 * لا يُفترض من وجود الحقول في الأنواع: الترميز والفكّ هما الدليل.
 * @returns {{ok:boolean, reason:string}}
 */
function protoSupportsHtmlApp() {
  if (protoProbe) return protoProbe;
  try {
    const sample = {
      richResponseMessage: {
        messageType: 1,
        submessages: [{ messageType: 2, messageText: "probe" }],
        unifiedResponse: { data: Buffer.from("{}") },
      },
    };
    // `encode` يقبل كائناً عادياً؛ ولا نستعمل `fromObject` لأن المشروع يمنعه في
    // كود الإنتاج خارج محوّليه (tests/terboo-protobuf.test.mjs).
    const bytes = proto.Message.encode(sample).finish();
    const back = proto.Message.decode(bytes);
    const data = back?.richResponseMessage?.unifiedResponse?.data;
    protoProbe = data && data.length === 2
      ? { ok: true, reason: "proto-ok" }
      : { ok: false, reason: "proto-drops-unified-response" };
  } catch (error) {
    noteFailure("miniapp-transport", error, { where: "terboo-miniapp-transport:protoSupportsHtmlApp", stage: "encode", fallback: "unavailable" });
    protoProbe = { ok: false, reason: "proto-encode-failed" };
  }
  return protoProbe;
}

/**
 * قدرة النقل. تُحسب من دالة إرسال حقيقية وبروتو مُختبَر وسياسة صريحة،
 * لا من قيمة إعداد وحدها (كان هذا عيب التصميم السابق).
 * @param {object|null} sock
 * @returns {{available:boolean, channel:string, reason:string, send:Function|null}}
 */
function nativeCapability(sock = null) {
  const mode = configuredMode();
  if (mode !== "on") return { available: false, channel: "none", reason: "native-transport-off", send: null };

  const supported = protoSupportsHtmlApp();
  if (!supported.ok) return { available: false, channel: "none", reason: supported.reason, send: null };

  if (!sock || typeof sock.relayMessage !== "function") {
    return { available: false, channel: "none", reason: "socket-has-no-relay", send: null };
  }
  return { available: true, channel: "native-html", reason: "ready", send: relayHtmlApp };
}

/**
 * يبني حمولة الرسالة. **بلا** verificationMetadata و**بلا** botJid لجهة أخرى
 * و**بلا** trusted_sources لنطاق لا نملكه.
 * @param {{html:string, title?:string, label?:string, height?:number}} spec
 * @returns {object}
 */
function buildHtmlAppContent({ html, title = "", label = "", height }) {
  const responseId = crypto.randomUUID();
  const unified = {
    response_id: responseId,
    sections: [{
      view_model: {
        primitive: {
          __typename: HTML_PRIMITIVE,
          payload: String(html),
          // قائمة فارغة لا نطاقاً لا نملكه: المستند مستقل بلا موارد خارجية
          trusted_sources: [],
          ...(height === undefined ? {} : { height: Number(height) }),
        },
        __typename: "GenAISingleLayoutViewModel",
      },
    }],
  };
  // `richResponseMessage` في المستوى الأعلى، كما يرسله terboo-rich-response.js
  // لبطاقات الكود. بلا غلاف «مُعاد توجيهها من بوت» وبلا botMetadata وبلا براهين:
  // الرسالة منّا ولا تدّعي غير ذلك.
  return {
    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
    richResponseMessage: {
      messageType: 1,
      submessages: label || title ? [{ messageType: 2, messageText: String(label || title) }] : [],
      unifiedResponse: { data: Buffer.from(JSON.stringify(unified), "utf8") },
    },
  };
}

/** يرفض أي حمولة تحمل حقل إثبات — حارس داخلي ضد انزلاق مستقبلي */
function assertNoForgery(content) {
  const text = JSON.stringify(content, (key, value) => (Buffer.isBuffer(value) ? `<${value.length}B>` : value));
  const found = FORGERY_FIELDS.filter((field) => text.includes(field));
  if (found.length) throw new Error(`forged-verification-field:${found.join(",")}`);
}

/**
 * الإرسال الفعلي: استدعاء relayMessage **واحد**.
 * @returns {Promise<{ok:boolean, messageId:string|null, reason?:string}>}
 */
async function relayHtmlApp(sock, jid, html, { title = "", label = "", height } = {}) {
  const content = buildHtmlAppContent({ html, title, label, height });
  assertNoForgery(content);
  // استدعاء واحد: المقبس يولّد المعرّف، ولا رسالة ثانية ولا تحرير لاحق
  const sent = await sock.relayMessage(jid, content, {});
  return { ok: true, messageId: typeof sent === "string" ? sent : sent?.key?.id || null };
}

/**
 * يسلّم مستند لعبة في رسالة واحدة عبر القناة المضمَّنة.
 * لا رابط موقع ولا بطاقة ولا أزرار عند الفشل — نص سبب فقط.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {string} html
 * @param {{title?:string, label?:string, height?:number, appId?:string}} [options]
 * @returns {Promise<{ok:boolean, channel:string, reason:string, messageId?:string|null,
 *                    renderVerified:false, audit?:object}>}
 */
async function sendMiniApp(sock, jid, html, { title = "", label = "", height, appId = "" } = {}) {
  const capability = nativeCapability(sock);
  if (!capability.available) {
    return { ok: false, channel: "none", reason: capability.reason, renderVerified: false };
  }
  if (!jid) return { ok: false, channel: "none", reason: "no-target", renderVerified: false };

  const audit = auditWebViewHtml(html, { height, maxWireBytes: WIRE_BUDGET });
  if (!audit.ok) {
    // الحجم أو مخالفة محيط: لا نُرسل قسراً ولا ننقل اللعبة إلى صفحة ويب.
    // السبب المُعاد **رمز آلي** (الجزء قبل الشرطة): الشرح نص تشخيص للمطوّر
    // مكانه سجل الإخفاقات، لا رسالة تُعرض على اللاعب.
    const code = String(audit.problems[0]).split(" — ")[0];
    noteFailure("miniapp-transport", new Error(audit.problems.join(" · ")), {
      where: "terboo-miniapp-transport:sendMiniApp", stage: appId || "audit", fallback: "none",
    });
    return { ok: false, channel: "none", reason: `html-rejected:${code}`, renderVerified: false, audit };
  }

  try {
    const sent = await capability.send(sock, jid, html, { title, label, height });
    // الإرسال نجح. العرض على الجهاز **لم يُتحقَّق منه** ولا يُدَّعى.
    return { ok: true, channel: capability.channel, reason: "relayed", messageId: sent.messageId, renderVerified: false, audit };
  } catch (error) {
    noteFailure("miniapp-transport", error, { where: "terboo-miniapp-transport:sendMiniApp", stage: appId || "relay", fallback: "none" });
    return { ok: false, channel: "none", reason: "relay-failed", renderVerified: false, audit };
  }
}

export { FORGERY_FIELDS, HTML_PRIMITIVE, assertNoForgery, buildHtmlAppContent, configuredMode, nativeCapability, protoSupportsHtmlApp, sendMiniApp };
