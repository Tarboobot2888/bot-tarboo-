// ═══════════════════════════════════════════════
// 📐 TERBOO — قيود بيئة WebView داخل فقاعة الرسالة
// ───────────────────────────────────────────────
// هذه ليست تفضيلات أسلوب: كل قاعدة هنا قيد فعلي في المحيط الذي تُعرض فيه
// صفحة Mini App المضمَّنة. المصدر: مراجعة `checkHtmlApp` في
// @yudzxml/baileys@7.6.6 (lib/Utils/html-app.js، نسخة npm المتحقَّق من بصمتها)
// — أُعيدت القواعد هنا بتنفيذنا، ولم تُنسخ شيفرتها.
//
// الحقائق التي تفرض القواعد:
//   • الصفحة تعمل في **أصل معتم (opaque origin) بلا شبكة**: fetch و XHR
//     و sendBeacon و EventSource ميتة، ولا يُطلق `securitypolicyviolation`
//     ليخبر الصفحة بالسبب ⇒ فشل صامت.
//   • كل واجهات التخزين ترمي SecurityError: localStorage · sessionStorage
//     · indexedDB · document.cookie · caches. فرع catch هو الذي يعمل دائماً.
//   • `crypto.subtle` يتطلب سياقاً آمناً، وهذه الصفحة ليست كذلك.
//   • الرسالة فوق 1MB يُسقطها العميل المستقبِل بلا عرض ⇒ تصل صمتاً.
//   • الحمولة تُرمَّز بـ`\uXXXX` فكل محرف غير ASCII يكلّف حتى ثلاثة أضعاف
//     حجمه على السلك. الميزانية تُحسب ببايتات السلك لا بايتات القرص.
//   • الفقاعة تبقى حيّة بعد خروجها من الشاشة ⇒ حلقة رسم أو مؤقت بلا حارس
//     إخفاء يحرق المعالج والبطارية في الخلفية.
//   • الارتفاع يتفاوض عليه المضيف والصفحة؛ `aspect-ratio` يجعل الارتفاع
//     تابعاً للعرض فلا يستقر التفاوض وترتجف البطاقة.
// ═══════════════════════════════════════════════

/** سقف الرسالة: فوقه يُسقطها العميل بلا عرض */
const MESSAGE_CEILING = 1024 * 1024;
/** ميزانية عملية دون السقف، تترك مجالاً لغلاف الرسالة */
const WIRE_BUDGET = 960 * 1024;

/** واجهات التخزين التي ترمي SecurityError في أصل معتم */
const STORAGE_APIS = Object.freeze(["localStorage", "sessionStorage", "indexedDB", "document.cookie", "caches"]);

/**
 * استعمال فعلي لا مجرد ذكر: الاسم متبوعاً بـ`.` أو `[` أو `(`.
 * ذِكر الاسم في تعليق («لا نستعمل localStorage») ليس استدعاءً، وعدّه مخالفةً
 * هو نفس خطأ المطابقة النصية الذي يُسقِط مستندات سليمة.
 */
function usesApi(source, api) {
  const base = api.includes(".") ? api : `(?:window\\s*\\.\\s*)?${api}`;
  return new RegExp(`\\b${base}\\s*(?:\\.|\\[|\\()`).test(source);
}

/**
 * بايتات السلك: الحمولة تُرمَّز JSON ثم يُهرَّب كل محرف غير ASCII إلى `\uXXXX`.
 * قياس الحجم بـBuffer.byteLength وحده يُقلّل التقدير على النصوص العربية.
 * @param {string} html
 * @returns {number}
 */
function wireBytes(html) {
  const escaped = JSON.stringify(String(html)).replace(
    /[\u007f-￿]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  return Buffer.byteLength(escaped, "utf8");
}

/** تعليقات HTML وبيانات base64 تُزال قبل الفحص حتى لا تُنتج مطابقات كاذبة */
const stripNoise = (html) => String(html)
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/data:[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]*;base64,[A-Za-z0-9+/=]+/gi, "data:");

/** هل في الشيفرة ما يوقف الحلقة عند إخفاء الصفحة؟ */
const hasVisibilityGuard = (source) => /document\.(?:hidden|visibilityState)|visibilitychange|IntersectionObserver|cancelAnimationFrame|clearInterval/.test(source);

/**
 * يفحص مستند Mini App مقابل قيود المحيط الفعلية.
 * `problems` تمنع الإرسال · `warnings` تُسجَّل ولا تمنع.
 * @param {string} html
 * @param {{height?:number, maxWireBytes?:number}} [options]
 * @returns {{ok:boolean, bytes:number, wire:number, inflation:number, problems:string[], warnings:string[]}}
 */
function auditWebViewHtml(html, { height, maxWireBytes = WIRE_BUDGET } = {}) {
  if (typeof html !== "string" || !html.trim()) {
    return { ok: false, bytes: 0, wire: 0, inflation: 0, problems: ["مستند فارغ"], warnings: [] };
  }
  const bytes = Buffer.byteLength(html, "utf8");
  const wire = wireBytes(html);
  const source = stripNoise(html);
  const problems = [];
  const warnings = [];

  if (wire > maxWireBytes) {
    problems.push(`wire-over-budget:${Math.round(wire / 1024)}KB>${Math.round(maxWireBytes / 1024)}KB — فوق ${Math.round(MESSAGE_CEILING / 1024)}KB يُسقط العميل الرسالة بلا عرض`);
  } else if (wire > bytes * 1.15) {
    warnings.push(`escaping-inflation:${Math.round(bytes / 1024)}KB⇒${Math.round(wire / 1024)}KB — المحارف غير اللاتينية تُرمَّز \\uXXXX`);
  }

  const remote = [...source.matchAll(/\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\//gi)];
  if (remote.length) problems.push(`remote-subresource:${remote.length} — لا شبكة في الأصل المعتم، تفشل صامتةً`);

  if (/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new\s+EventSource/.test(source)) {
    problems.push("network-api — fetch/XHR/sendBeacon/EventSource ميتة في هذا المحيط بلا إشعار");
  }
  if (/new\s+WebSocket/.test(source)) {
    problems.push("websocket — لا اتصال من الأصل المعتم؛ المزامنة الحيّة غير ممكنة هنا");
  }

  const storage = STORAGE_APIS.filter((api) => usesApi(source, api));
  if (storage.length) problems.push(`storage-api:${storage.join(",")} — ترمي SecurityError، فالحالة لا تُحفظ`);

  if (usesApi(source, "crypto\\.subtle")) problems.push("crypto-subtle — يتطلب سياقاً آمناً");

  if ((/requestAnimationFrame/.test(source) || /setInterval\s*\(/.test(source)) && !hasVisibilityGuard(source)) {
    problems.push("unguarded-loop — حلقة رسم أو مؤقت بلا حارس إخفاء تحرق البطارية خارج الشاشة");
  }

  if (/aspect-ratio\s*:/i.test(source)) {
    warnings.push("aspect-ratio — يجعل الارتفاع تابعاً للعرض فلا يستقر تفاوض القياس");
  }
  if (/<canvas[^>]*style\s*=\s*["'][^"']*height\s*:\s*auto/i.test(source)) {
    warnings.push("canvas-auto-height — أعطِ اللوحة أبعاداً بالبكسل");
  }
  if (height === undefined && !/(?:html|body)[^{}]*\{[^{}]*height\s*:\s*\d/i.test(source)) {
    warnings.push("height-unsettled — مرّر height أو ثبّت ارتفاع body وإلا ارتجفت البطاقة");
  }

  return { ok: problems.length === 0, bytes, wire, inflation: bytes ? wire / bytes : 0, problems, warnings };
}

export { MESSAGE_CEILING, STORAGE_APIS, WIRE_BUDGET, auditWebViewHtml, hasVisibilityGuard, usesApi, wireBytes };
