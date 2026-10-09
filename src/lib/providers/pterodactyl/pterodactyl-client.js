// ═══════════════════════════════════════════════
// 🦖 لوحات المستخدم (Pterodactyl) — عميل HTTP
// ───────────────────────────────────────────────
// كل طلب يمر عبر حارس الشبكة (SSRF): HTTP/HTTPS فقط، لا عناوين داخلية، فحص DNS لحظة الاتصال،
// ولا تُرسل بيانات الاعتماد لمضيف آخر عند إعادة التوجيه.
// المفتاح يُمرَّر لحظياً من الخزنة ولا يظهر في أي خطأ أو سجل.
//   Client API      ⇒ /api/client/...       (مفتاح ptlc_ أو مفتاح قديم 48 حرفاً)
//   Application API ⇒ /api/application/...  (مفتاح ptla_ أو مفتاح قديم)
// ═══════════════════════════════════════════════

import config from "../../../../config.js";
import { guardedRequest, NetGuardError } from "../../terboo-net-guard.js";
import { redactSecrets } from "../../terboo-secrets.js";

const API_TYPES = Object.freeze(["client", "application"]);

class PanelError extends Error {
  /**
   * @param {string} code auth · forbidden · not-found · conflict · rate-limited · server · invalid-response
   *   · network · timeout · tls · dns-failed · blocked-host · blocked-address · bad-protocol · invalid-url
   *   · redirect-blocked · credentials-in-url · aborted · offline · validation
   */
  constructor(code, extra = {}) {
    super(code);
    this.name = "PanelError";
    this.code = code;
    this.status = extra.status || 0;
    this.detail = extra.detail ? redactSecrets(String(extra.detail)).slice(0, 160) : "";
  }
}

function settings() {
  const s = config.integrations?.pterodactyl || {};
  return {
    timeoutMs: Number(s.timeoutMs) || 15000,
    allowPrivateNetworks: s.allowPrivateNetworks === true,
    allowedPrivateHosts: Array.isArray(s.allowedPrivateHosts) ? s.allowedPrivateHosts : [],
  };
}

/** صيغة المفتاح المتوقعة لنوع الواجهة */
function keyProblem(apiKey, apiType) {
  const key = String(apiKey || "").trim();
  if (!key) return "empty";
  if (/\s/.test(key) || key.length > 200) return "format";
  if (/^ptlc_[A-Za-z0-9]{20,}$/.test(key)) return apiType === "client" ? null : "type-mismatch";
  if (/^ptla_[A-Za-z0-9]{20,}$/.test(key)) return apiType === "application" ? null : "type-mismatch";
  if (/^[A-Za-z0-9]{48}$/.test(key)) return null; // مفاتيح الإصدارات الأقدم بلا بادئة
  return "format";
}

/** رابط اللوحة الأساسي: origin + مسار فرعي اختياري، بلا شرطة أخيرة وبلا /api */
function normalizeBaseUrl(value) {
  let text = String(value || "").trim();
  if (text && !/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  const url = new URL(text);
  const pathname = url.pathname.replace(/\/+$/, "").replace(/\/api(?:\/.*)?$/i, "");
  return `${url.protocol}//${url.host}${pathname}`;
}

/**
 * طلب إلى اللوحة.
 * @param {{baseUrl:string, apiType:string}} panel
 * @param {string} apiKey
 * @param {{method?:string, path:string, query?:Object, body?:Object, signal?:AbortSignal, allowHosts?:string[]}} request
 * @returns {Promise<{status:number, data:any}>}
 */
async function panelRequest(panel, apiKey, { method = "GET", path, query = null, body = null, signal = null, allowHosts = [] }) {
  const s = settings();
  const url = new URL(`${panel.baseUrl}${path}`);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  let response;
  try {
    response = await guardedRequest(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "TerbooPanels/1.0",
      },
      body: body ? JSON.stringify(body) : null,
      timeoutMs: s.timeoutMs,
      signal,
      // allowHosts: نطاق لوحة ضبطه المالك في config (موثوق) — لا يُستعمل أبداً لروابط يضيفها المستخدمون
      allowPrivateHosts: [...s.allowedPrivateHosts, ...allowHosts],
      allowPrivateNetworks: s.allowPrivateNetworks,
      maxBytes: 4 * 1024 * 1024,
    });
  } catch (error) {
    if (error instanceof NetGuardError) throw new PanelError(error.code);
    throw new PanelError("network");
  }
  const { status } = response;
  const text = response.body.toString("utf8");
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // صفحة HTML (رابط خاطئ أو صفحة دخول) ليست استجابة API
      throw new PanelError(status === 401 || status === 403 ? "auth" : "invalid-response", { status });
    }
  }
  if (status >= 200 && status < 300) return { status, data };
  const detail = data?.errors?.[0]?.detail || data?.errors?.[0]?.code || "";
  if (status === 401) throw new PanelError("auth", { status, detail });
  if (status === 403) throw new PanelError("forbidden", { status, detail });
  if (status === 404) throw new PanelError("not-found", { status, detail });
  if (status === 409) throw new PanelError("conflict", { status, detail });
  if (status === 422) throw new PanelError("validation", { status, detail });
  if (status === 429) throw new PanelError("rate-limited", { status, detail });
  if (status === 502 && /offline|not running|DaemonConnection/i.test(text)) throw new PanelError("offline", { status, detail });
  throw new PanelError(status >= 500 ? "server" : "invalid-response", { status, detail });
}

export { API_TYPES, PanelError, keyProblem, normalizeBaseUrl, panelRequest, settings as panelSettings };
export default { panelRequest, keyProblem, normalizeBaseUrl, PanelError, API_TYPES };
