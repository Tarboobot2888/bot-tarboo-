// ═══════════════════════════════════════════════
// ✈️ Telegram Bot API — عميل صغير بلا مكتبات خارجية
// ───────────────────────────────────────────────
// HTTPS ‎(fetch المدمج في Node) · long polling ‎(getUpdates) · رفع الصور بـ FormData.
// التوكن لا يظهر في أي خطأ أو سجل: مسجَّل في سجل الإخفاء، ورسائل الخطأ تحمل الطريقة والرمز فقط.
// ═══════════════════════════════════════════════

import { registerSecret } from "../lib/terboo-secrets.js";

class TelegramError extends Error {
  constructor(method, code, description = "") {
    super(`telegram ${method}: ${code}${description ? ` ${description}` : ""}`);
    this.method = method;
    this.code = code;
    this.description = description;
  }
}

/**
 * @param {{token:string, apiBase?:string, timeoutMs?:number}} options
 */
function createTelegramApi({ token, apiBase = "https://api.telegram.org", timeoutMs = 35_000 }) {
  if (!/^\d{5,}:[\w-]{20,}$/.test(String(token || ""))) throw new TelegramError("init", "invalid-token");
  registerSecret(token);
  const base = `${String(apiBase).replace(/\/+$/, "")}/bot${token}`;

  async function call(method, params = {}, { signal = null, timeout = timeoutMs } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const onAbort = () => controller.abort();
    signal?.addEventListener?.("abort", onAbort, { once: true });
    let body;
    let headers = {};
    const files = Object.entries(params).filter(([, v]) => v && typeof v === "object" && Buffer.isBuffer(v.buffer));
    if (files.length) {
      body = new FormData();
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (value && typeof value === "object" && Buffer.isBuffer(value.buffer)) body.append(key, new Blob([value.buffer], { type: value.type || "image/jpeg" }), value.name || "image.jpg");
        else body.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }
    } else {
      body = JSON.stringify(params);
      headers = { "content-type": "application/json" };
    }
    try {
      const res = await fetch(`${base}/${method}`, { method: "POST", body, headers, signal: controller.signal });
      const json = await res.json().catch(() => ({ ok: false, error_code: res.status, description: "bad-json" }));
      if (!json.ok) throw new TelegramError(method, json.error_code || res.status, String(json.description || "").slice(0, 160));
      return json.result;
    } catch (error) {
      if (error instanceof TelegramError) throw error;
      throw new TelegramError(method, error?.name === "AbortError" ? (signal?.aborted ? "aborted" : "timeout") : "network");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    }
  }

  return {
    call,
    getMe: () => call("getMe"),
    getUpdates: (offset, { timeout = 25, signal = null } = {}) => call("getUpdates", { offset, timeout, allowed_updates: ["message", "callback_query"] }, { signal, timeout: (timeout + 10) * 1000 }),
    sendMessage: (chatId, text, extra = {}) => call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra }),
    editMessageText: (chatId, messageId, text, extra = {}) => call("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra }),
    sendPhoto: (chatId, buffer, caption, extra = {}) => call("sendPhoto", { chat_id: chatId, photo: { buffer, name: "terboo.jpg", type: "image/jpeg" }, caption, parse_mode: "HTML", ...extra }),
    answerCallbackQuery: (id, text = "", extra = {}) => call("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}), ...extra }),
    deleteMessage: (chatId, messageId) => call("deleteMessage", { chat_id: chatId, message_id: messageId }),
    setMyCommands: (commands, extra = {}) => call("setMyCommands", { commands, ...extra }),
  };
}

export { TelegramError, createTelegramApi };
export default createTelegramApi;
