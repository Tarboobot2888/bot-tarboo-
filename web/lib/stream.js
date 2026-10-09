// ═══════════════════════════════════════════════
// 📡 Terboo Web — قناة SSE موحّدة واحدة (V6 §43)
// ───────────────────────────────────────────────
// قناة واحدة لتقدّم المهام وإتمامها والإشعارات وصحة النظام. مربوطة بجلسة المستخدم (server-side).
// لا طبقات real-time متنافسة. تُغلق تلقائياً عند قطع الاتصال، وتُلغي اشتراك المهام.
// ═══════════════════════════════════════════════

import * as store from "../../src/lib/terboo-web-store.js";
import { principalFor } from "../../src/lib/terboo-web-services.js";
import { onTaskEvent } from "../../src/lib/terboo-task-queue.js";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";

const COOKIE = "terboo_sid";

function attachStream(req, res, { cookies }) {
  const raw = cookies[COOKIE];
  const session = raw ? store.getSession(raw) : null;
  if (!session) { res.writeHead(401, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, code: "unauthenticated" })); return; }
  const principal = principalFor(session.canonical);
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const send = (event, data) => { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (error) { noteFailure("web", error, { where: "web/lib/stream.js:send", fallback: "drop" }); } };
  send("ready", { at: new Date().toISOString() });
  const heartbeat = setInterval(() => { try { res.write(": ping\n\n"); } catch { cleanup(); } }, 25_000);
  heartbeat.unref?.();

  // تقدّم/إتمام المهام المملوكة لهذا المستخدم فقط (privacy scope)
  const owns = (task) => task && (task.owner === principal.canonical || task.owner === principal.jid || principal.isOwner);
  const unsub = onTaskEvent((event, task) => {
    if (!owns(task)) return;
    if (["progress", "completed", "failed", "cancelled", "queued"].includes(event)) {
      send("task", { id: task.id, event, status: task.status, progress: task.progress, summary: task.summary || "" });
    }
  });
  function cleanup() { clearInterval(heartbeat); unsub?.(); try { res.end(); } catch (error) { noteFailure("web", error, { where: "web/lib/stream.js:cleanup", stage: "end", fallback: "already-closed" }); } }
  req.on("close", cleanup);
  req.on("error", cleanup);
}

export { attachStream };
export default { attachStream };
