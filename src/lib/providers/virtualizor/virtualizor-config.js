// ═══════════════════════════════════════════════
// ☁️ Virtualizor — الإعدادات المحلولة (config.js + البيئة)
// ───────────────────────────────────────────────
// enduser = لوحة المستخدم (4083) · admin = لوحة الإدارة (4085) للمالك فقط.
// البيئة تتجاوز config.js إن ضُبطت. كل مفتاح/كلمة مرور يُسجَّل في سجل الأسرار فوراً.
// ═══════════════════════════════════════════════

import config from "../../../../config.js";
import { registerSecret } from "../../terboo-secrets.js";

const LAYERS = Object.freeze({ ENDUSER: "enduser", ADMIN: "admin" });

const ENV = {
  enduser: { url: "VIRTUALIZOR_URL", apiKey: "VIRTUALIZOR_API_KEY", apiPassword: "VIRTUALIZOR_API_PASSWORD" },
  admin: { url: "VIRTUALIZOR_ADMIN_URL", apiKey: "VIRTUALIZOR_ADMIN_API_KEY", apiPassword: "VIRTUALIZOR_ADMIN_API_PASSWORD" },
};

/** منفذ افتراضي لكل طبقة حين يغيب من الرابط */
const DEFAULT_PORT = { enduser: 4083, admin: 4085 };

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/**
 * إعدادات طبقة واحدة (نسخة جديدة في كل استدعاء: تغيير config وقت التشغيل يسري فوراً).
 * @param {"enduser"|"admin"} layer
 * @param {{source?:Object, env?:Object}} [options] للاختبارات
 */
function layerSettings(layer, { source = config, env = process.env } = {}) {
  const root = source.virtualizor || {};
  const raw = root[layer] || {};
  const names = ENV[layer];
  const url = String(env[names.url] || raw.url || "").trim().replace(/\/+$/, "");
  const apiKey = String(env[names.apiKey] || raw.apiKey || "").trim();
  const apiPassword = String(env[names.apiPassword] || raw.apiPassword || "").trim();
  registerSecret(apiKey);
  registerSecret(apiPassword);
  let parsed = null;
  try { parsed = url ? new URL(url) : null; } catch { parsed = null; }
  const enabled = root.enabled !== false && (layer === LAYERS.ENDUSER ? raw.enabled !== false : raw.enabled === true);
  return {
    layer,
    enabled: Boolean(enabled && parsed && apiKey && apiPassword),
    configured: Boolean(parsed && apiKey && apiPassword),
    origin: parsed ? `${parsed.protocol}//${parsed.hostname}:${parsed.port || DEFAULT_PORT[layer]}` : "",
    protocol: parsed?.protocol || "https:",
    hostname: parsed?.hostname || "",
    port: Number(parsed?.port || DEFAULT_PORT[layer]),
    apiKey,
    apiPassword,
    verifyTLS: raw.verifyTLS !== false,
    timeoutMs: clampInt(raw.timeoutMs, 2000, 120000, 15000),
    maxRetries: clampInt(raw.maxRetries, 0, 5, 2),
    apiFormat: "json",
  };
}

/** ملخص آمن للعرض والتشخيص — بلا مفاتيح ولا أسماء مضيفين داخلية */
function publicSummary(settings) {
  return { layer: settings.layer, enabled: settings.enabled, configured: settings.configured, tls: settings.verifyTLS, timeoutMs: settings.timeoutMs };
}

/** رقم المالك للتواصل (شراء/استفسار) */
function ownerContact({ source = config } = {}) {
  const raw = source.virtualizor?.ownerContact?.whatsapp || source.owner?.number?.[0] || "";
  return String(raw).replace(/[^0-9]/g, "");
}

export { DEFAULT_PORT, LAYERS, layerSettings, ownerContact, publicSummary };
export default { LAYERS, layerSettings, ownerContact, publicSummary };
