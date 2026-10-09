// ═══════════════════════════════════════════════
// ♻️ Terboo Task Runners — استئناف حقيقي بعد إعادة التشغيل
// ───────────────────────────────────────────────
// المهمة الخلفية تُحفظ بملخص ومدخلات صغيرة (task-queue). عند الإقلاع تُسجَّل هنا دالة تنفيذ لكل نوع
// يمكن إعادة تشغيله من مدخلاته المحفوظة وحدها — فيعمل «كملها»/«أعدها» بعد الإيقاف فعلاً:
//   tool:<id> لأدوات الروابط والبحث والوصف (تحميل · بحث · توليد صورة من وصف) ⇒ نفس المحوّل،
//   وتُسلَّم النتيجة في نفس الدردشة (scope) لصاحبها (owner) بصلاحياته الحالية.
// ما لا يُستأنف بصدق لا يُسجَّل: فيديو/مستند/صورة مرسلة (الوسيط نفسه لا يُحفظ) ⇒ «أرسله مجدداً».
// عمليات VPS/اللوحات المدمّرة لا تُعاد تلقائياً أبداً — تمر بتأكيد المستخدم في أوامرها.
// vps.reinstall · vps.restore: بعد تنفيذها (مرة واحدة، بتأكيد) مهمة متابعة قراءة فقط تنتظر عودة
//   الـVPS للعمل ثم تبلّغ: «◈ جاري تجهيز النظام» مرة · «✓ انتهت العملية» — وتُستأنف بعد إعادة التشغيل
//   لأنها لا تعيد الإجراء نفسه أبداً، فقط تقرأ الحالة.
// ═══════════════════════════════════════════════

import { isOwner, isPremium } from "../../config.js";
import { noteFailure } from "./terboo-failure-log.js";
import { identityOf } from "./terboo-identity.js";
import { t } from "./terboo-localization.js";
import { listScrapers, runScraper } from "./terboo-scraper-registry.js";
import { PRIORITY, enqueueTask, registerTaskRunner } from "./terboo-task-queue.js";
import * as UI from "./terboo-ui-theme.js";

/** مدخلات أداة تكفي وحدها لإعادة التشغيل (بلا وسيط مرفق) */
const REPLAYABLE_INPUTS = new Set(["url", "query", "name", "prompt"]);

let socketOf = () => null;
let runTool = runScraper;
let vpsDetails = null;
let pollMs = 20_000;

/** إجراءات VPS طويلة تُتابَع حتى عودة الـVPS للعمل */
const VPS_WATCHED = new Set(["vps.reinstall", "vps.restore"]);
const VPS_WATCH_LIMIT_MS = 25 * 60 * 1000;

/** معرّف واتساب من الهوية القانونية المحفوظة في المهمة */
function jidOfOwner(owner) {
  const value = String(owner || "");
  const digits = value.replace(/^\w+:/, "").replace(/\D/g, "");
  if (value.startsWith("pn:") && digits) return `${digits}@s.whatsapp.net`;
  if (value.startsWith("lid:") && digits) return identityOf(`${digits}@lid`).pn || `${digits}@lid`;
  return value;
}

/** رسالة تسليم دنيا لصاحب المهمة في دردشتها — صلاحياته تُحسب الآن لا من وقت الطلب */
function deliveryTarget(sock, { owner, scope }) {
  const sender = jidOfOwner(owner);
  const chat = String(scope || sender);
  return {
    chat,
    sender,
    isGroup: chat.endsWith("@g.us"),
    isOwner: Boolean(sender && isOwner(sender)),
    isPremium: Boolean(sender && isPremium(sender)),
    key: null,
    reply: (content) => sock.sendMessage(chat, typeof content === "string" ? { text: content } : content),
  };
}

/** هل يمكن استئناف أداة من مدخلاتها المحفوظة؟ */
function isReplayableTool(entry) {
  // «url|query» = أيٌّ منهما؛ «image+prompt» يحتاج صورة لم تُحفظ ⇒ لا
  return Boolean(entry && entry.kind !== "chat" && entry.kind !== "agent" && String(entry.input || "").split("|").every((part) => REPLAYABLE_INPUTS.has(part)));
}

/** دالة تنفيذ أداة محفوظة: نفس المحوّل، تسليم في دردشة المهمة، فشل صريح لا نجاح شكلي */
function toolRunner(id) {
  return async (ctx) => {
    const sock = socketOf();
    if (!sock) throw Object.assign(new Error("whatsapp-offline"), { code: "NOT_CONNECTED" });
    const input = { ...(ctx.input || {}) };
    delete input.id;
    const lang = input.lang || "ar";
    delete input.lang;
    ctx.progress(10, "resume");
    const m = deliveryTarget(sock, ctx);
    const result = await runTool({ id, input, m, sock, lang, prefer: "adapter", signal: ctx.signal });
    if (!result?.ok) throw Object.assign(new Error(result?.reason || "tool-failed"), { code: "TOOL_FAILED", messageKey: result?.messageKey || "" });
    for (const item of result.deliveries || []) ctx.artifact({ type: item.type || "media", url: item.url || "" });
    return { ...result, summary: `${id}: ${result.deliveries?.length || 0} delivered` };
  };
}

/** انتظار يحترم الإلغاء */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error("task_cancelled"), { code: "TASK_CANCELLED" }));
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
    signal?.addEventListener?.("abort", () => { clearTimeout(timer); reject(Object.assign(new Error("task_cancelled"), { code: "TASK_CANCELLED" })); }, { once: true });
  });
}

async function readVps(identity, vpsId, signal) {
  const read = vpsDetails || (await import("./providers/virtualizor/virtualizor-user-service.js")).details;
  return read(identity, vpsId, { signal });
}

/**
 * متابعة إجراء VPS طويل (قراءة حالة فقط — لا يعيد الإجراء).
 * الانتهاء = ظهور الـVPS «running» بعد أن رُصد خارجها، أو بعد مهلة الإقلاع الأولى وهو يعمل.
 */
async function vpsWatchRunner(ctx) {
  const { vpsId, action, lang = "ar", startedAt = Date.now() } = ctx.input || {};
  const identity = identityOf(jidOfOwner(ctx.owner));
  const notify = async (blocks, icon) => {
    const sock = socketOf();
    if (!sock) return;
    await deliveryTarget(sock, ctx).reply(UI.card({ title: "", blocks: [blocks.map((b) => `${icon} ${b}`).join("\n")], lang }))
      .catch((error) => noteFailure("task-runners", error, { where: "terboo-task-runners:vpsWatch", stage: "notify" }));
  };
  let sawWorking = Boolean(ctx.checkpointData?.sawWorking);
  let announced = Boolean(ctx.checkpointData?.announced);
  const label = t(lang, `vps.act_${String(action).replace(/^vps\./, "")}`);
  while (Date.now() - startedAt < VPS_WATCH_LIMIT_MS) {
    ctx.throwIfCancelled();
    const result = await readVps(identity, vpsId, ctx.signal).catch((error) => {
      if (error?.code === "aborted" || error?.code === "TASK_CANCELLED") throw error;
      return { ok: false, code: error?.code || "error" };
    });
    // الصلاحية سُحبت أثناء المتابعة ⇒ توقف صريح
    if (!result.ok && ["no-entitlement", "not-yours", "suspended", "expired"].includes(result.code)) {
      throw Object.assign(new Error(result.code), { code: "VPS_ACCESS" });
    }
    const status = result.ok ? result.data?.info?.status : "";
    if (status && status !== "running") {
      sawWorking = true;
      if (!announced) {
        announced = true;
        await notify([t(lang, "vps.watchPreparing", { action: label })], "◈");
      }
    }
    ctx.checkpoint({ sawWorking, announced });
    const settled = status === "running" && (sawWorking || Date.now() - startedAt > 3 * pollMs);
    if (settled) {
      ctx.progress(100, "running");
      await notify([t(lang, "vps.watchDone", { action: label })], "✓");
      return { ok: true, summary: `${action} ${vpsId}: running` };
    }
    ctx.progress(Math.min(90, 10 + Math.round(((Date.now() - startedAt) / VPS_WATCH_LIMIT_MS) * 80)), status || "waiting");
    await sleep(pollMs, ctx.signal);
  }
  await notify([t(lang, "vps.watchTimeout", { action: label })], "⚠️");
  return { ok: false, summary: `${action} ${vpsId}: timeout` };
}

/**
 * يبدأ متابعة إجراء VPS طويل بعد تنفيذه بنجاح (لا يعيد الإجراء).
 * @returns {{id:string}|null}
 */
function watchVpsOperation({ owner, scope, vpsId, action, lang = "ar" }) {
  if (!VPS_WATCHED.has(action)) return null;
  const task = enqueueTask({
    type: action, title: `${action} ${vpsId}`, owner, scope, priority: PRIORITY.P3, persist: true, resumable: true,
    input: { vpsId: String(vpsId), action, lang, startedAt: Date.now() }, run: vpsWatchRunner,
  });
  return { id: task.id, done: task.done };
}

/**
 * إنشاء VPS بعد تأكيد المالك (V6 §21). آمن للاستئناف: المزوّد لا يعيد الإنشاء أبداً لطلب تجاوز «planned».
 * الإشعارات: المالك في دردشة المهمة · المشتري في خاصه فقط (لا مجموعة أبداً). كلمة المرور (إن كان وضع
 * التسليم private-once) لا تدخل نتيجة المهمة ولا سجلها — تُرسل مرة واحدة في خاص المشتري ثم تُنسى.
 */
async function vpsProvisionRunner(ctx) {
  const { orderId, by, lang = "ar", prefix = "." } = ctx.input || {};
  const provisioner = await import("./providers/virtualizor/virtualizor-provisioner.js");
  const result = await provisioner.execute(orderId, { by, signal: ctx.signal, onProgress: (p, note) => ctx.progress(p, note) });
  const order = result.data || provisioner.getOrder(orderId) || {};
  const sock = socketOf();
  if (sock) {
    const owner = deliveryTarget(sock, ctx);
    const buyerLabel = order.buyer?.tg ? `TG ${order.buyer.tg}` : String(order.buyer?.pn || order.buyer?.jid || "").split("@")[0];
    const text = result.ok
      ? t(lang, "vpsAdmin.provisionDone", { vps: order.vpsId, host: order.hostname, status: order.history?.findLast?.((h) => /^state:/.test(h.note))?.note?.slice(6) || "running", buyer: buyerLabel })
      : t(lang, "vpsAdmin.provisionFailed", { code: result.code, status: order.status || "-" });
    await owner.reply(UI.card({ title: t(lang, "vpsAdmin.provisionTitle"), blocks: [text, result.ok && order.buyer?.tg ? t(lang, "vpsAdmin.provisionBuyerTelegram") : ""].filter(Boolean), lang }))
      .catch((error) => noteFailure("task-runners", error, { where: "terboo-task-runners:vpsProvision", stage: "notify-owner" }));
    const buyerChat = order.buyer?.pn || (String(order.buyer?.jid || "").endsWith("@s.whatsapp.net") ? order.buyer.jid : "");
    if (result.ok && buyerChat && !buyerChat.endsWith("@g.us")) {
      const lines = [t(lang, "vpsAdmin.provisionBuyerReady", { vps: order.vpsId, host: order.hostname, p: prefix })];
      if (result.credential?.mode === "private-once" && result.credential.rootPassword) lines.push(t(lang, "vpsAdmin.provisionBuyerPassword", { vps: order.vpsId, p: prefix, pass: result.credential.rootPassword }));
      await sock.sendMessage(buyerChat, { text: lines.join("\n\n") })
        .catch((error) => noteFailure("task-runners", error, { where: "terboo-task-runners:vpsProvision", stage: "notify-buyer" }));
    }
  }
  if (!result.ok) throw Object.assign(new Error(result.code), { code: "VPS_PROVISION", messageKey: ["cloudErr", result.code].join(".") });
  return { ok: true, summary: `vps.provision ${order.id}: ${order.vpsId} ${order.status}` };
}

/** يبدأ مهمة إنشاء لطلب مخطط ومؤكَّد */
function startProvisioning({ orderId, by, owner, scope, lang = "ar", prefix = "." }) {
  const task = enqueueTask({
    type: "vps.provision", title: `vps.provision ${orderId}`, owner, scope, priority: PRIORITY.P2, persist: true, resumable: true,
    input: { orderId, by, lang, prefix }, run: vpsProvisionRunner, provider: "virtualizor-admin", tool: "vps.create",
  });
  return { id: task.id, done: task.done };
}

/**
 * يسجّل دوال التنفيذ عند الإقلاع.
 * @param {{getSocket?:Function, run?:Function, details?:Function, interval?:number}} [options]
 *   getSocket: مصدر الاتصال الحالي (يتغير مع إعادة الاتصال)
 *   · run/details/interval: منفّذ الأداة وقارئ حالة VPS وفاصل المتابعة (بدائل للاختبار فقط)
 * @returns {{tools:number}}
 */
function installTaskRunners({ getSocket = null, run = null, details = null, interval = 0 } = {}) {
  if (typeof getSocket === "function") socketOf = getSocket;
  runTool = typeof run === "function" ? run : runScraper;
  vpsDetails = typeof details === "function" ? details : null;
  pollMs = interval > 0 ? interval : 20_000;
  for (const action of VPS_WATCHED) registerTaskRunner(action, vpsWatchRunner);
  registerTaskRunner("vps.provision", vpsProvisionRunner);
  let tools = 0;
  for (const entry of listScrapers()) {
    if (!isReplayableTool(entry)) continue;
    try {
      registerTaskRunner(`tool:${entry.id}`, toolRunner(entry.id));
      tools += 1;
    } catch (error) {
      noteFailure("task-runners", error, { where: "src/lib/terboo-task-runners.js:install", stage: entry.id });
    }
  }
  return { tools };
}

export { REPLAYABLE_INPUTS, VPS_WATCHED, deliveryTarget, installTaskRunners, isReplayableTool, jidOfOwner, startProvisioning, watchVpsOperation };
export default { installTaskRunners };
