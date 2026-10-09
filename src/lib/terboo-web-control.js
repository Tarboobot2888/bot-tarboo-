// ═══════════════════════════════════════════════
// 🎛️ Terboo Web Control — تشغيل/إيقاف/إعادة تشغيل الموقع من داخل البوت
// ───────────────────────────────────────────────
// مثيل خادم واحد لكل عملية. index.js يشغّله عند الإقلاع إن كان مفعّلاً، وأمر المالك (.موقع) يتحكم فيه
// وقت التشغيل (تغيير الرابط/SSL يتطلب إعادة تشغيل الخادم فقط — لا البوت).
// ═══════════════════════════════════════════════

import { noteFailure } from "./terboo-failure-log.js";
import { reportServer, webEnabled } from "./terboo-website.js";

const state = global.terbooWebControl || (global.terbooWebControl = { instance: null, getSocket: null, starting: null });

function running() {
  return Boolean(state.instance);
}

/** يشغّل الخادم (مرة واحدة). getSocket يُحفظ لإعادة التشغيل لاحقاً */
async function startSite({ getSocket = state.getSocket } = {}) {
  if (state.instance) return { ok: true, already: true, instance: state.instance };
  if (state.starting) return state.starting;
  state.getSocket = getSocket;
  state.starting = (async () => {
    try {
      const { startWeb } = await import("../../web/server.js");
      state.instance = await startWeb({ getSocket });
      return { ok: true, instance: state.instance };
    } catch (error) {
      noteFailure("web", error, { where: "terboo-web-control:start", stage: "listen", fallback: "site-off" });
      reportServer({ listening: false, error: error?.code || "start-failed" });
      return { ok: false, code: error?.code || "start-failed" };
    } finally {
      state.starting = null;
    }
  })();
  return state.starting;
}

async function stopSite() {
  const instance = state.instance;
  state.instance = null;
  if (!instance) return { ok: true, already: true };
  try {
    await instance.stop();
    return { ok: true };
  } catch (error) {
    noteFailure("web", error, { where: "terboo-web-control:stop", stage: "close", fallback: "dropped" });
    return { ok: false, code: "stop-failed" };
  }
}

async function restartSite() {
  await stopSite();
  return startSite();
}

/** عند الإقلاع: يشغّل فقط إن كان مفعّلاً (config أو قرار المالك) */
async function bootSite({ getSocket } = {}) {
  state.getSocket = getSocket;
  if (!webEnabled()) return { ok: true, skipped: true };
  return startSite({ getSocket });
}

export { bootSite, restartSite, running, startSite, stopSite };
export default { bootSite, startSite, stopSite, restartSite, running };
