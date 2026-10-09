// ═══════════════════════════════════════════════
// ☁️ Virtualizor — عميل HTTP منخفض المستوى
// ───────────────────────────────────────────────
// الصيغة الموثّقة (virtualizor.com/docs):
//   enduser (4083): /index.php?act=<act>&api=json&apikey=<key>&apipass=<pass>[&svs=<vpsid>][&do=1]
//   admin   (4085): /index.php?act=<act>&api=json&adminapikey=<key>&adminapipass=<pass>
//   بيانات الإجراء POST (application/x-www-form-urlencoded).
// الضمانات:
//   • لا رابط ولا مفتاح في أي رسالة خطأ أو سجل (الرابط يحمل المفاتيح).
//   • إعادة المحاولة للطلبات القرائية فقط (شبكة/مهلة/5xx) — لا تكرار لإجراء قد يكون نُفّذ.
//   • مهلة + AbortSignal خارجي (إلغاء تعاوني).
//   • خطأ واجهة Virtualizor ({error:…}) خطأٌ لا نجاح.
// ═══════════════════════════════════════════════

import http from "node:http";
import https from "node:https";
import { redactSecrets } from "../../terboo-secrets.js";

const AUTH_PARAMS = {
  enduser: ["apikey", "apipass"],
  admin: ["adminapikey", "adminapipass"],
};

class VirtualizorError extends Error {
  /**
   * @param {string} code network · timeout · aborted · auth · http · api-error · invalid-response · disabled
   * @param {string} message رسالة داخلية آمنة (بلا روابط ولا مفاتيح)
   * @param {{status?:number, apiErrors?:string[], retryable?:boolean}} [extra]
   */
  constructor(code, message, extra = {}) {
    super(redactSecrets(String(message || code)));
    this.name = "VirtualizorError";
    this.code = code;
    this.status = extra.status || 0;
    this.apiErrors = (extra.apiErrors || []).map((item) => redactSecrets(String(item)).slice(0, 200));
    this.retryable = Boolean(extra.retryable);
  }
}

/** يبني رابط الطلب (لا يُطبع أبداً) */
function buildUrl(settings, act, query = {}) {
  const [keyName, passName] = AUTH_PARAMS[settings.layer] || AUTH_PARAMS.enduser;
  const params = new URLSearchParams();
  params.set("act", act);
  params.set("api", settings.apiFormat || "json");
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  params.set(keyName, settings.apiKey);
  params.set(passName, settings.apiPassword);
  return `${settings.origin}/index.php?${params.toString()}`;
}

/** أخطاء واجهة Virtualizor: error كائن أو مصفوفة أو نص */
function apiErrorsOf(json) {
  const raw = json?.error;
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [raw] : [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === "object") return Object.values(raw).filter(Boolean).map(String);
  return [];
}

/** طلب واحد عبر http/https مع مهلة وإلغاء */
function requestOnce(urlText, { method, body, settings, signal }) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlText);
    const lib = url.protocol === "http:" ? http : https;
    const headers = { Accept: "application/json", "User-Agent": "Terboo-VPS/1.0" };
    if (body) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    const req = lib.request(url, {
      method,
      headers,
      timeout: settings.timeoutMs,
      ...(url.protocol === "https:" ? { rejectUnauthorized: settings.verifyTLS !== false } : {}),
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on("data", (chunk) => {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) { req.destroy(new VirtualizorError("invalid-response", "response-too-large")); return; }
        chunks.push(chunk);
      });
      res.on("end", () => resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    const onAbort = () => req.destroy(new VirtualizorError("aborted", "request-aborted"));
    if (signal) {
      if (signal.aborted) { onAbort(); return; }
      signal.addEventListener("abort", onAbort, { once: true });
    }
    req.on("timeout", () => req.destroy(new VirtualizorError("timeout", "request-timeout", { retryable: true })));
    req.on("error", (error) => {
      if (error instanceof VirtualizorError) reject(error);
      else if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS/i.test(error.code || error.message)) reject(new VirtualizorError("tls", `tls-error:${error.code || "unknown"}`));
      else reject(new VirtualizorError("network", `network-error:${error.code || "unknown"}`, { retryable: true }));
    });
    req.on("close", () => signal?.removeEventListener?.("abort", onAbort));
    if (body) req.write(body);
    req.end();
  });
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener?.("abort", () => { clearTimeout(timer); reject(new VirtualizorError("aborted", "request-aborted")); }, { once: true });
});

/**
 * ينفّذ طلب Virtualizor ويعيد JSON الرد.
 * @param {ReturnType<import("./virtualizor-config.js").layerSettings>} settings
 * @param {{act:string, query?:Object, post?:Object|null, signal?:AbortSignal, idempotent?:boolean}} request
 * @returns {Promise<Object>}
 */
async function callVirtualizor(settings, { act, query = {}, post = null, signal = null, idempotent = null } = {}) {
  if (!settings?.enabled) throw new VirtualizorError("disabled", `layer-disabled:${settings?.layer || "unknown"}`);
  if (!/^[a-z0-9_]+$/i.test(String(act || ""))) throw new VirtualizorError("invalid-request", "bad-act");
  const url = buildUrl(settings, act, query);
  const body = post ? new URLSearchParams(Object.entries(post).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])).toString() : null;
  const safeToRetry = idempotent ?? (!post && !query.do);
  const attempts = 1 + (safeToRetry ? settings.maxRetries : 0);
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (signal?.aborted) throw new VirtualizorError("aborted", "request-aborted");
    try {
      const { status, text } = await requestOnce(url, { method: body ? "POST" : "GET", body, settings, signal });
      if (status === 401 || status === 403) throw new VirtualizorError("auth", `http-${status}`, { status });
      if (status >= 500) throw new VirtualizorError("http", `http-${status}`, { status, retryable: true });
      if (status >= 400) throw new VirtualizorError("http", `http-${status}`, { status });
      let json;
      try {
        json = JSON.parse(text.trim().replace(/^﻿/, ""));
      } catch {
        // صفحة HTML (تسجيل دخول) بدل JSON = مفاتيح مرفوضة أو IP غير مسموح
        throw new VirtualizorError(/<html|login/i.test(text) ? "auth" : "invalid-response", "non-json-response", { status });
      }
      const apiErrors = apiErrorsOf(json);
      if (apiErrors.length) {
        const auth = apiErrors.some((e) => /api\s*key|apikey|authenticat|not\s*allowed|ip/i.test(e));
        throw new VirtualizorError(auth ? "auth" : "api-error", "virtualizor-api-error", { status, apiErrors });
      }
      return json;
    } catch (error) {
      lastError = error instanceof VirtualizorError ? error : new VirtualizorError("network", `network-error:${error?.code || "unknown"}`, { retryable: true });
      if (!lastError.retryable || attempt === attempts - 1 || lastError.code === "aborted") throw lastError;
      await sleep(400 * 2 ** attempt, signal);
    }
  }
  throw lastError;
}

export { AUTH_PARAMS, VirtualizorError, apiErrorsOf, buildUrl, callVirtualizor };
export default { callVirtualizor, VirtualizorError };
