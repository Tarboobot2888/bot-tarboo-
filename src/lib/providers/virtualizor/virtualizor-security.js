// ═══════════════════════════════════════════════
// ☁️ Terboo VPS — طبقة التفويض والتحقق
// ───────────────────────────────────────────────
// التدفق الإجباري لكل عملية:
//   مستخدم ← هوية قانونية ← صلاحية فعّالة ← ملكية هذا الـVPS ← سياسة الإجراء
//   ← التحقق من المدخلات ← حد المعدل ← استدعاء المزوّد
// لا طريق مباشر «رسالة ← API ← VPS». معرفة VPS ID لمستخدم آخر لا تفتح شيئاً.
// ═══════════════════════════════════════════════

import { capability } from "./virtualizor-capabilities.js";
import { entitlementFor } from "./virtualizor-entitlements.js";

/** حدود المعدل لكل مستخدم (نافذة منزلقة) */
const RATE_LIMITS = Object.freeze({
  default: { max: 12, windowMs: 60_000 },
  "vps.reinstall": { max: 1, windowMs: 30 * 60_000 },
  "vps.password": { max: 3, windowMs: 10 * 60_000 },
  "vps.restore": { max: 1, windowMs: 30 * 60_000 },
  "vps.poweroff": { max: 4, windowMs: 10 * 60_000 },
});
const hits = new Map();

/** ثوانٍ حتى تُسمح المحاولة التالية (0 = مسموحة). consume=true تحسب المحاولة. */
function rateLimited(userKey, action, { consume = false, now = Date.now() } = {}) {
  const rule = RATE_LIMITS[action] || RATE_LIMITS.default;
  const key = `${userKey}|${RATE_LIMITS[action] ? action : "default"}`;
  const recent = (hits.get(key) || []).filter((t) => now - t < rule.windowMs);
  hits.delete(key);
  hits.set(key, recent);
  // سقف للذاكرة طويلة التشغيل: الأقدم استعمالاً يُحذف أولاً
  while (hits.size > 5000) hits.delete(hits.keys().next().value);
  if (recent.length >= rule.max) return Math.ceil((rule.windowMs - (now - recent[0])) / 1000);
  if (consume) recent.push(now);
  return 0;
}

/**
 * يحسب محاولة فعلية لدى المزوّد (بعد نجاح التحقق من المدخلات فقط — مدخل خاطئ لا يستهلك الحد).
 * @returns {number} ثوانٍ للانتظار (0 = مُحتسبة ومسموحة)
 */
function consumeRate(userKey, action) {
  return rateLimited(userKey, action, { consume: true });
}

/**
 * قرار التفويض لعملية VPS.
 * @param {{identity:Object, vpsId:string, action:string, isOwner?:boolean, isGroup?:boolean, confirmed?:boolean}} request
 * @returns {{ok:boolean, code:string, entitlement?:Object, capability?:Object, retryAfter?:number}}
 */
function authorize({ identity, vpsId, action, isOwner = false, isGroup = false, confirmed = false }) {
  const cap = capability(action);
  if (!cap) return { ok: false, code: "unknown-action" };
  if (cap.layer === "admin") return isOwner ? { ok: true, code: "owner", capability: cap } : { ok: false, code: "owner-only" };
  if (!cap.userAllowed && !isOwner) return { ok: false, code: "not-allowed" };
  const entitlement = entitlementFor(identity, vpsId);
  // حتى المالك يدير VPS المستخدمين عبر لوحة الإدارة/الصلاحيات، لا عبر واجهة المشتري لـVPS غير مسند له
  if (!entitlement) return { ok: false, code: "no-entitlement" };
  if (!entitlement.permissions?.includes(action)) return { ok: false, code: "feature-disabled", entitlement };
  if (cap.privateOnly && isGroup) return { ok: false, code: "private-only", entitlement, capability: cap };
  if (cap.requiresConfirmation && !confirmed) return { ok: false, code: "needs-confirmation", entitlement, capability: cap };
  const retryAfter = rateLimited(entitlement.canonicalUserId, action);
  if (retryAfter) return { ok: false, code: "rate-limited", retryAfter, entitlement };
  return { ok: true, code: "ok", entitlement, capability: cap };
}

// ── التحقق من المدخلات ───────────────────────────

/** اسم مضيف صالح (RFC 1123): حروف لاتينية/أرقام/شرطة، مقاطع ≤63، الكل ≤253 */
function validHostname(value) {
  const host = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  if (!host || host.length > 253) return null;
  const labels = host.split(".");
  return labels.every((l) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l)) ? host : null;
}

/** كلمة مرور قوية: 10–64، ثلاثة أنواع على الأقل، بلا مسافات ولا علامات تنصيص */
function passwordProblem(value) {
  const pass = String(value || "");
  if (pass.length < 10) return "too-short";
  if (pass.length > 64) return "too-long";
  if (/[\s"'`\\]/.test(pass)) return "bad-characters";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pass)).length;
  return classes >= 3 ? null : "too-weak";
}

/** معرّف قالب نظام تشغيل من القائمة التي أعادها السيرفر فقط */
function validTemplate(osid, templates = []) {
  const id = String(osid || "").trim();
  return templates.find((t) => t.osid === id) || null;
}

/** اسم خدمة من قائمة خدمات الـVPS نفسه فقط */
function validService(name, services = []) {
  const value = String(name || "").trim();
  return services.includes(value) ? value : null;
}

function _resetRateLimits() {
  hits.clear();
}

export { RATE_LIMITS, _resetRateLimits, authorize, consumeRate, passwordProblem, validHostname, validService, validTemplate };
export default { authorize, validHostname, passwordProblem, validTemplate, validService };
