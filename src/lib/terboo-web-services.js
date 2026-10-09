// ═══════════════════════════════════════════════
// 🧩 Terboo Web Services — طبقة الخدمة المشتركة بين الموقع والبوت (V6 §30 §42 §44 §52 §65)
// ───────────────────────────────────────────────
// الموقع لا يعيد كتابة أي أمر: يستدعي نفس النواة والمحركات والسجلات والخدمات.
//   • الدور يُحسب هنا server-side من الهوية القانونية (config.isOwner + الصلاحيات) — لا يُقبل علم من العميل.
//   • دردشة AI: m تخليقي + sock يلتقط الردود ⇒ محرّك الإجراءات الحقيقي ثم مزوّد الدردشة (نفس المسار).
//   • القدرات/المهام/الملف الشخصي/الدليل: نفس terboo-capability-registry و terboo-task-queue و
//     providers/virtualizor و terboo-group-directory — بلا منطق موازٍ.
// ═══════════════════════════════════════════════

import config from "../../config.js";
import { noteFailure } from "./terboo-failure-log.js";
import { identityOf } from "./terboo-identity.js";
import { getDatabase } from "./terboo-database.js";
import { composeReply, configuredProviders, defaultPersona } from "./terboo-ai-core.js";
import { runActionEngine } from "./terboo-action-engine.js";
import { capabilitiesFor, capabilitySummary } from "./terboo-capability-registry.js";
import { LEVEL } from "./terboo-permissions.js";
import { listTasks, getTask, cancelTask, getQueueSummary } from "./terboo-task-queue.js";
import * as entitlements from "./providers/virtualizor/virtualizor-entitlements.js";
import { usageOf, setUsage as persistUsage, MODES } from "./terboo-profile.js";

/** جلسة واتساب حيّة إن كان البوت يعمل في نفس العملية (للإجراءات التي تحتاج الاتصال) */
let socketProvider = () => null;
function bindSocket(getSocket) {
  if (typeof getSocket === "function") socketProvider = getSocket;
}

// ═══════════════════════════════════════════════
// الدور (server-side فقط)
// ═══════════════════════════════════════════════

/** @param {string} canonical مثل pn:201…  @returns {{canonical, jid, number, role, isOwner}} */
function principalFor(canonical) {
  const raw = String(canonical || "");
  const digits = raw.replace(/^\w+:/, "").replace(/\D/g, "");
  const jid = raw.startsWith("lid:") ? `${digits}@lid` : `${digits}@s.whatsapp.net`;
  const identity = identityOf(jid);
  const isOwner = Boolean(digits && config.isOwner?.(identity.pn || jid));
  // الدور: المالك ⇒ owner، ومن له صلاحية VPS/لوحة ⇒ user بموارد، وإلا user
  const role = isOwner ? LEVEL.OWNER : LEVEL.USER;
  return { canonical: identity.canonical || raw, jid: identity.pn || jid, number: identity.number || digits, role, isOwner };
}

// ═══════════════════════════════════════════════
// الملف الشخصي والاستخدام
// ═══════════════════════════════════════════════

function profile(principal) {
  const db = getDatabase();
  const user = db.getUser(principal.jid) || {};
  return {
    canonical: principal.canonical,
    name: user.regName || user.name || "",
    language: user.language || "ar",
    registered: Boolean(user.isRegistered),
    role: principal.role,
    usage: usageOf(user) || [],
    availableUsage: MODES,
    koin: user.koin || 0,
    level: user.rpg?.level || Math.floor((user.exp || 0) / 1000) + 1,
  };
}

/** تغيير نمط الاستخدام (نفس خيارات البوت) — يُطبَّق فوراً، بلا إعادة تسجيل */
function setUsage(principal, modes) {
  const raw = (Array.isArray(modes) ? modes : [modes]).map(String);
  const clean = raw.includes("all") ? [...MODES] : raw.filter((m) => MODES.includes(m));
  if (!clean.length) return { ok: false, code: "invalid-usage" };
  // عبر نفس مُخزِّن الملف الشخصي (user.profile.usage) الذي يستعمله البوت — لا حقل موازٍ
  const saved = persistUsage(principal.jid, clean);
  return { ok: true, code: "ok", data: saved };
}

function setLanguage(principal, lang) {
  if (!["ar", "en", "es"].includes(lang)) return { ok: false, code: "invalid-language" };
  getDatabase().setUser(principal.jid, { language: lang });
  return { ok: true, code: "ok", data: lang };
}

// ═══════════════════════════════════════════════
// كتالوج القدرات/الأدوات (الحقيقي، مفلتر بالدور)
// ═══════════════════════════════════════════════

function toolCatalog(principal) {
  // ما يستطيعه هذا المستوى فعلاً فقط (§34: لا أداة غير قابلة للتنفيذ)
  const caps = capabilitiesFor(principal.role).filter((c) => c.aiExposed || c.source === "plugin" || c.category === "vps" || c.category === "pterodactyl");
  return caps.map((c) => ({
    id: c.id, category: c.category, description: c.description, inputs: Object.keys(c.inputs?.properties || {}),
    requiredAccess: c.permissions?.level || "user", confirmation: c.confirmation, chat: c.chat,
    background: c.background, safety: c.safety, source: c.source,
  }));
}

// ═══════════════════════════════════════════════
// المهام (نفس task-queue — مملوكة بالهوية القانونية)
// ═══════════════════════════════════════════════

const ownsTask = (task, principal) => task && (task.owner === principal.canonical || task.owner === principal.jid || principal.isOwner);

function tasks(principal) {
  return listTasks({})
    .filter((t) => ownsTask(t, principal))
    .map((t) => ({ id: t.id, type: t.type, title: t.title, status: t.status, progress: t.progress, createdAt: t.createdAt, updatedAt: t.finishedAt || t.startedAt || t.createdAt, summary: t.summary || "" }));
}
function taskStatus(principal, id) {
  const t = getTask(id);
  if (!ownsTask(t, principal)) return { ok: false, code: "not-found" };
  return { ok: true, code: "ok", data: { id: t.id, status: t.status, progress: t.progress, summary: t.summary || "", error: t.error ? "failed" : "" } };
}
function stopTask(principal, id) {
  const t = getTask(id);
  if (!ownsTask(t, principal)) return { ok: false, code: "not-found" };
  const result = cancelTask(id, { owner: t.owner, scope: t.scope, isOwner: principal.isOwner });
  return { ok: Boolean(result?.ok), code: result?.ok ? "cancelled" : (result?.reason || "not-cancellable") };
}
function lastTask(principal) {
  const mine = listTasks({ ...(principal.isOwner ? {} : { owner: principal.canonical }), limit: 1 });
  const t = mine[0] || listTasks({ owner: principal.jid, limit: 1 })[0];
  return t ? { id: t.id, status: t.status, summary: t.summary || "", progress: t.progress } : null;
}

// ═══════════════════════════════════════════════
// دردشة AI (نفس النواة — m تخليقي + sock يلتقط)
// ═══════════════════════════════════════════════

/** m تخليقي لطلب ويب (خاص، غير مجموعة) بهوية المستخدم القانونية؛ يلتقط كل الردود */
function webMessage(principal, text, captured) {
  const chat = principal.jid;
  const push = (content) => { const t = typeof content === "string" ? content : content?.text || content?.caption || ""; if (t) captured.push(t); };
  return {
    sender: principal.jid, chat, isGroup: false, isOwner: principal.isOwner, isPremium: false, isPartner: false,
    body: text, text, type: "conversation", prefix: config.command?.prefix || ".", args: text.split(/\s+/),
    key: { remoteJid: chat, fromMe: false, id: `WEB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` },
    pushName: principal.number, messageTimestamp: Math.floor(Date.now() / 1000),
    reply: async (content) => { push(content); return { key: { id: "web" } }; },
    react: async () => true,
    raw: null, msg: null, aiDispatched: false, channel: "website",
  };
}

/** sock تخليقي: يلتقط ما يُرسل بدل إرساله لواتساب */
function webSock(principal, captured) {
  const live = socketProvider();
  const push = (content) => { const t = content?.text || content?.caption || ""; if (t) captured.push(t); };
  return {
    user: live?.user || { id: `${(config.bot?.primaryNumber || "0")}:1@s.whatsapp.net`, jid: `${config.bot?.primaryNumber || "0"}@s.whatsapp.net` },
    ws: live?.ws || { readyState: 1 },
    sendMessage: async (jid, content) => { push(content); return { key: { id: "web", remoteJid: jid, fromMe: true } }; },
    relayMessage: async (jid, message) => {
      const node = message?.viewOnceMessage?.message?.interactiveMessage || message?.interactiveMessage;
      if (node?.body?.text) captured.push(node.body.text);
      return "web";
    },
    sendPresenceUpdate: async () => true,
    readMessages: async () => true,
    // الإجراءات التي تحتاج اتصالاً حياً (مجموعات) تستعمل الجلسة الحقيقية إن وُجدت
    groupMetadata: live?.groupMetadata,
    groupParticipantsUpdate: live?.groupParticipantsUpdate,
    onWhatsApp: live?.onWhatsApp,
    profilePictureUrl: async () => { throw new Error("no-picture-on-web"); },
  };
}

/**
 * دردشة الموقع عبر النواة نفسها: محرّك الإجراءات الحقيقي أولاً (سحابة/سيرفر/مهام/إنشاء)،
 * وإلا ردّ مزوّد الدردشة بنفس الشخصية والذاكرة الخاصة بالمستخدم.
 * @returns {Promise<{ok:boolean, reply:string, handledBy:string}>}
 */
async function chat({ principal, text, lang = "ar", ask = undefined }) {
  const clean = String(text || "").trim();
  if (!clean) return { ok: false, reply: "", handledBy: "none", code: "empty" };
  const captured = [];
  const m = webMessage(principal, clean, captured);
  const sock = webSock(principal, captured);
  try {
    const handled = await runActionEngine({ m, sock, text: clean, lang, deps: {} });
    if (handled === "answered" && captured.length) return { ok: true, reply: captured.join("\n\n"), handledBy: "action-engine" };
  } catch (error) {
    noteFailure("web-services", error, { where: "terboo-web-services:chat", stage: "action-engine", fallback: "chat" });
  }
  // محادثة عادية: نفس composeReply في النواة (الشخصية · الذاكرة الخاصة · التنويع) — لا pipeline ثانٍ
  try {
    const persona = `${defaultPersona()}\nChannel: website. Reply in the user's language (${lang}). Be concise.`;
    const answer = await composeReply({ m, text: clean, lang, persona, ...(ask ? { ask } : {}) });
    const reply = answer?.text || "";
    if (!reply) return { ok: false, reply: "", handledBy: "provider", code: "no-provider" };
    return { ok: true, reply, handledBy: "provider" };
  } catch (error) {
    noteFailure("web-services", error, { where: "terboo-web-services:chat", stage: "provider", fallback: "error" });
    return { ok: false, reply: "", handledBy: "provider", code: "provider-error" };
  }
}

// ═══════════════════════════════════════════════
// الموارد (VPS للمستخدم — نفس السجل المشترك)
// ═══════════════════════════════════════════════

function myVps(principal) {
  try {
    return entitlements.activeFor(identityOf(principal.jid)).map((e) => ({ vpsId: e.vpsId, planId: e.planId, status: e.status, expiresAt: e.expiresAt, permissions: e.permissions || [] }));
  } catch (error) {
    noteFailure("web-services", error, { where: "terboo-web-services:myVps", fallback: "empty" });
    return [];
  }
}

// ═══════════════════════════════════════════════
// لوحة المالك (health · providers · directory) — المستدعي يتحقق أنه المالك
// ═══════════════════════════════════════════════

function health() {
  const db = getDatabase();
  return {
    bot: { online: Boolean(socketProvider()?.ws?.readyState === 1), uptimeSeconds: Math.round(process.uptime()), version: config.bot?.version || "6.0" },
    providers: { configured: safeProviderNames() },
    tasks: getQueueSummary(),
    capabilities: capabilitySummary(),
    users: db.getUserCount?.() || 0,
    memory: { rssMb: Math.round(process.memoryUsage().rss / 1048576) },
    generatedAt: new Date().toISOString(),
  };
}
function safeProviderNames() {
  try { return configuredProviders(); } catch (error) { noteFailure("web-services", error, { where: "terboo-web-services:providers", fallback: "empty" }); return []; }
}

/** دليل المجموعات والأعضاء (المالك) — من بيانات المجموعة الحيّة إن توفّر الاتصال، وإلا المخزَّن */
async function groupsDirectory({ refresh = false } = {}) {
  const live = socketProvider();
  try {
    const dir = await import("./terboo-group-directory.js");
    if (live?.groupFetchAllParticipating) {
      const groups = await live.groupFetchAllParticipating();
      const rows = [];
      for (const [id, meta] of Object.entries(groups)) {
        const g = await dir.getDirectory(live, id, { refresh, metadata: meta }).catch((error) => { noteFailure("web-services", error, { where: "terboo-web-services:groupsDirectory", stage: "directory", menu: id, fallback: "skip-group" }); return null; });
        const s = g ? dir.summary(g) : null;
        rows.push({ id, subject: meta.subject || "", size: (meta.participants || []).length, admins: s?.admins?.length || 0, owner: Boolean(s?.owner) });
      }
      return { ok: true, code: "ok", data: rows };
    }
    return { ok: false, code: "bot-offline", data: [] };
  } catch (error) {
    noteFailure("web-services", error, { where: "terboo-web-services:groupsDirectory", fallback: "empty" });
    return { ok: false, code: "error", data: [] };
  }
}

async function groupMembers(groupId, { refresh = false } = {}) {
  const live = socketProvider();
  if (!live?.groupMetadata) return { ok: false, code: "bot-offline", data: null };
  try {
    const dir = await import("./terboo-group-directory.js");
    const g = await dir.getDirectory(live, String(groupId), { refresh });
    const s = dir.summary(g);
    if (!s) return { ok: false, code: "unavailable", data: null };
    const view = (member) => ({ name: dir.displayName(member), admin: member.admin || null, lid: member.lid ? `…${String(member.lid).slice(-6)}` : "", number: member.number ? `…${member.number.slice(-4)}` : "", named: dir.namesOf(member).length > 0 });
    return { ok: true, code: "ok", data: { subject: s.subject, count: s.count, admins: s.admins.map(view), owner: s.owner ? view(s.owner) : null, members: s.members.slice(0, 500).map(view) } };
  } catch (error) {
    noteFailure("web-services", error, { where: "terboo-web-services:groupMembers", fallback: "empty" });
    return { ok: false, code: "error", data: null };
  }
}

export {
  bindSocket, chat, groupMembers, groupsDirectory, health, lastTask, myVps, principalFor, profile,
  setLanguage, setUsage, stopTask, taskStatus, tasks, toolCatalog,
};
export default { principalFor, profile, setUsage, setLanguage, toolCatalog, tasks, taskStatus, stopTask, chat, myVps, health, groupsDirectory, groupMembers, bindSocket };
