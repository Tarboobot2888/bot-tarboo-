// ═══════════════════════════════════════════════
// ☁️ Terboo Cloud Tools — vps.* و panel.* للذكاء
// ───────────────────────────────────────────────
// الذكاء لا يبني طلب HTTP ولا يلمس مفتاحاً:
//   AI → toolId → مدخلات منظمة (معرّفات فقط) → الهدف (السياق/الوحيد/اختيار) → الصلاحية
//   → الأمر الموجود (myvps · panels · plans) → المزوّد → النتيجة.
// التنفيذ كله عبر واجهات البلوقنات الحالية (لا مسار ثانٍ): هي التي تطلب التأكيد للخطِر،
// وتفتح إدخال كلمة المرور السري في الخاص، وتعرض اختيار النظام [Ubuntu][Debian][إلغاء].
// لا يقبل أي أداة هنا كلمة مرور أو مفتاحاً كمدخل — الأسرار لا تمر بالنموذج أبداً.
// المعروض للنموذج = ما يملكه هذا المستخدم فعلاً (VPS فعّال · لوحات مضافة)، لا أكثر.
// ═══════════════════════════════════════════════

import { recall } from "./terboo-context-engine.js";
import { noteFailure } from "./terboo-failure-log.js";
import { identityOf } from "./terboo-identity.js";

/** وسائط أمر موجود من أجزاء (معرّفات + كلمات فرعية ثابتة) */
const act = (...parts) => parts.join(" ");

/** مفاتيح لا تُقبل من النموذج أبداً (حتى لو أرسلها) */
const SECRET_KEYS = /pass|key|token|secret|credential|apikey/i;

/**
 * الكتالوج: لكل أداة الطبقة · النوع · المدخلات · ما تحتاجه من هدف · وتحويلها لأمر موجود.
 * kind: read (قراءة) · action (تشغيل/إيقاف…) · input (يفتح إدخالاً آمناً/اختياراً داخل الأمر)
 * confirm: الأمر نفسه يطلب تأكيداً قبل التنفيذ (لا تنفيذ مباشر من الذكاء)
 */
const CLOUD_TOOLS = Object.freeze({
  "vps.list": { layer: "vps", kind: "read", needs: [], purpose: "List the user's own Terboo VPS servers with status.", route: () => ["myvps", ""] },
  "vps.info": { layer: "vps", kind: "read", needs: ["vps"], purpose: "Open one VPS dashboard (status, IP, plan, available actions).", route: (a) => ["myvps", a.vpsId] },
  "vps.start": { layer: "vps", kind: "action", needs: ["vps"], purpose: "Start (boot) the VPS.", route: (a) => ["myvps", act(a.vpsId, "do", "vps.start")] },
  "vps.stop": { layer: "vps", kind: "action", confirm: true, needs: ["vps"], purpose: "Stop (shut down) the VPS — asks the user to confirm.", route: (a) => ["myvps", act(a.vpsId, "do", "vps.stop")] },
  "vps.restart": { layer: "vps", kind: "action", confirm: true, needs: ["vps"], purpose: "Restart the VPS — asks the user to confirm.", route: (a) => ["myvps", act(a.vpsId, "do", "vps.restart")] },
  "vps.poweroff": { layer: "vps", kind: "action", confirm: true, needs: ["vps"], purpose: "Force power off the VPS — asks the user to confirm.", route: (a) => ["myvps", act(a.vpsId, "do", "vps.poweroff")] },
  "vps.hostname": { layer: "vps", kind: "input", confirm: true, needs: ["vps"], purpose: "Change the VPS hostname (the user types the new name in a safe input).", route: (a) => ["myvps", act(a.vpsId, "do", "vps.hostname")] },
  "vps.password": { layer: "vps", kind: "input", confirm: true, privateOnly: true, needs: ["vps"], purpose: "Change the root password (secret input in private chat only; never pass a password).", route: (a) => ["myvps", act(a.vpsId, "do", "vps.password")] },
  "vps.reinstall": { layer: "vps", kind: "input", confirm: true, privateOnly: true, needs: ["vps"], purpose: "Reinstall the OS: shows the OS choices, then confirmation and a secret password input.", route: (a) => ["myvps", act(a.vpsId, "do", "vps.reinstall")] },
  "vps.services": { layer: "vps", kind: "read", needs: ["vps"], purpose: "List services running on the VPS.", route: (a) => ["myvps", act(a.vpsId, "do", "vps.services")] },
  "vps.vnc": { layer: "vps", kind: "read", confirm: true, privateOnly: true, needs: ["vps"], purpose: "Show VNC console access (private chat, confirmation).", route: (a) => ["myvps", act(a.vpsId, "do", "vps.vnc")] },
  "vps.backups": { layer: "vps", kind: "read", needs: ["vps"], purpose: "List VPS backups (restore is chosen from this list).", route: (a) => ["myvps", act(a.vpsId, "do", "vps.backups")] },
  "vps.restore": { layer: "vps", kind: "input", confirm: true, needs: ["vps"], purpose: "Restore a backup: opens the backup list to choose from, then confirmation.", route: (a) => ["myvps", act(a.vpsId, "do", "vps.backups")] },
  "vps.plans": { layer: "plans", kind: "read", needs: [], purpose: "Show Terboo VPS plans and how to contact the owner.", route: () => ["plans", ""] },
  "panel.list": { layer: "panel", kind: "read", needs: [], purpose: "List the user's own Pterodactyl panels.", route: () => ["panels", ""] },
  "panel.add": { layer: "panel", kind: "input", needs: [], anyone: true, purpose: "Start adding a panel (URL and API key are typed in a private secret input, never through you).", route: () => ["panels", "add"] },
  "panel.test": { layer: "panel", kind: "read", needs: ["panel"], purpose: "Test the saved key/connection of a panel.", route: (a) => ["panels", act("test", a.panelId)] },
  "panel.servers": { layer: "panel", kind: "read", needs: ["panel"], purpose: "List servers on a panel.", route: (a) => ["panels", act("servers", a.panelId)] },
  "panel.server.info": { layer: "panel", kind: "read", needs: ["panel", "server"], purpose: "Open one panel server (state, resources, sections).", route: (a) => ["panels", act("server", a.panelId, a.serverId)] },
  "panel.power": { layer: "panel", kind: "action", confirm: true, needs: ["panel", "server"], args: { signal: ["start", "stop", "restart", "kill"] }, purpose: "Power a panel server: signal start|stop|restart|kill (confirmation inside for risky ones).", route: (a) => ["panels", act("act", a.panelId, a.serverId, ["power", a.signal].join("."))] },
  "panel.resources": { layer: "panel", kind: "read", needs: ["panel", "server"], purpose: "Live CPU/RAM/disk of a panel server.", route: (a) => ["panels", act("act", a.panelId, a.serverId, "resources")] },
  "panel.console": { layer: "panel", kind: "input", confirm: true, needs: ["panel", "server"], purpose: "Send a console command (the user types it in a safe input).", route: (a) => ["panels", act("act", a.panelId, a.serverId, "command")] },
  "panel.files": { layer: "panel", kind: "read", needs: ["panel", "server"], purpose: "Browse server files (read only).", route: (a) => ["panels", act("act", a.panelId, a.serverId, "files")] },
  "panel.backups": { layer: "panel", kind: "read", needs: ["panel", "server"], purpose: "List server backups.", route: (a) => ["panels", act("act", a.panelId, a.serverId, "backups")] },
  "panel.databases": { layer: "panel", kind: "read", needs: ["panel", "server"], purpose: "List server databases (passwords are never shown).", route: (a) => ["panels", act("act", a.panelId, a.serverId, "databases")] },
});

/** أدوات موثّقة في المواصفة لكن بلا مسار خدمة حقيقي هنا — لا تُعرض للنموذج (لا ميزة وهمية) */
const NOT_EXPOSED = Object.freeze({
  "panel.users": { purpose: "Application API user listing has no service/UI path in Terboo (read probe only during discovery)" },
  "panel.nodes": { purpose: "Application API node listing has no service/UI path in Terboo (read probe only during discovery)" },
  "vps.backup": { purpose: "Virtualizor end-user API exposes backup listing/restore only; creating a backup is not offered" },
});

const SAFE_ID = /^[\w.-]{1,40}$/;

async function vpsOwned(m) {
  try {
    const { activeFor } = await import("./providers/virtualizor/virtualizor-entitlements.js");
    return activeFor(identityOf(m.sender));
  } catch (error) {
    noteFailure("cloud-tools", error, { where: "terboo-cloud-tools:vpsOwned", fallback: "none" });
    return [];
  }
}

async function panelsOwned(m) {
  try {
    const { listPanels } = await import("./providers/pterodactyl/index.js");
    return listPanels(m.sender) || [];
  } catch (error) {
    noteFailure("cloud-tools", error, { where: "terboo-cloud-tools:panelsOwned", fallback: "none" });
    return [];
  }
}

/**
 * الأدوات المتاحة لهذا المستخدم الآن (ما يملكه فعلاً).
 * @returns {Promise<Array<{id:string, purpose:string, needs:string[], kind:string}>>}
 */
async function cloudToolsFor(m) {
  const [vps, panels] = await Promise.all([vpsOwned(m), panelsOwned(m)]);
  return Object.entries(CLOUD_TOOLS)
    .filter(([, tool]) => tool.layer === "plans" || tool.anyone
      || (tool.layer === "vps" && vps.length > 0)
      || (tool.layer === "panel" && panels.length > 0))
    .filter(([, tool]) => !(tool.privateOnly && m?.isGroup))
    .map(([id, tool]) => ({ id, purpose: tool.purpose, needs: tool.needs, kind: tool.kind, confirm: Boolean(tool.confirm) }));
}

/** أسطر للنموذج — فقط حين يذكر الطلب سيرفراً/لوحة/VPS/باقة أو في السياق سيرفر حديث */
const CLOUD_WORDS = /سيرفر|سرفر|خادم|vps|في بي اس|لوحه|لوحة|بانل|panel|pterodactyl|بتروداكتيل|باقه|باقة|باقات|plans?|server|servidor|panel|plan(?:es)?/iu;
async function cloudToolsForModel(m, request = "") {
  const contextual = Boolean(recall(m, "vps") || recall(m, "server") || recall(m, "panel"));
  if (!CLOUD_WORDS.test(String(request || "")) && !contextual) return "";
  const tools = await cloudToolsFor(m);
  return tools.map((tool) => `- ${tool.id}${tool.needs.length ? ` [needs:${tool.needs.join("+")}]` : ""}${tool.confirm ? " [asks-confirmation]" : ""} ${tool.purpose}`).join("\n");
}

/**
 * الهدف: مدخل صريح من النموذج (يُتحقق أنه ملك المستخدم) ⇒ السياق ⇒ الوحيد ⇒ اختيار.
 * @returns {Promise<{ok:boolean, args?:Object, choose?:string}>}
 */
async function resolveTargets(m, tool, input) {
  const args = {};
  if (tool.needs.includes("vps")) {
    const owned = await vpsOwned(m);
    const wanted = SAFE_ID.test(String(input.vpsId || "")) ? String(input.vpsId) : "";
    const fromContext = recall(m, "vps")?.vpsId || "";
    const id = [wanted, fromContext].find((value) => value && owned.some((e) => String(e.vpsId) === String(value)))
      || (owned.length === 1 ? String(owned[0].vpsId) : "");
    // لا تخمين بين عدة VPS: لوحة الاختيار
    if (!id) return { ok: false, choose: owned.length ? "vps" : "no-vps" };
    args.vpsId = id;
  }
  if (tool.needs.includes("panel")) {
    const panels = await panelsOwned(m);
    const server = recall(m, "server");
    const wanted = SAFE_ID.test(String(input.panelId || "")) ? String(input.panelId) : "";
    const id = [wanted, server?.panelId, recall(m, "panel")?.panelId].find((value) => value && panels.some((p) => p.id === value))
      || (panels.length === 1 ? panels[0].id : "");
    if (!id) return { ok: false, choose: panels.length ? "panel" : "no-panel" };
    args.panelId = id;
    if (tool.needs.includes("server")) {
      const wantedServer = SAFE_ID.test(String(input.serverId || "")) ? String(input.serverId) : "";
      const serverId = wantedServer || (server?.panelId === id ? server.serverId : "");
      // السيرفر يُتحقق منه داخل خدمة اللوحة (ملك المفتاح فعلاً)؛ بلا سيرفر معروف ⇒ قائمة السيرفرات
      if (!serverId) return { ok: false, choose: "server", args };
      args.serverId = serverId;
    }
  }
  if (tool.args?.signal) {
    const signal = String(input.signal || "").toLowerCase();
    if (!tool.args.signal.includes(signal)) return { ok: false, choose: "server", args };
    args.signal = signal;
  }
  return { ok: true, args };
}

/** أدوات تغيّر/تمحو بيانات المورد (إعادة تثبيت · استرجاع · كلمة مرور · طرفية) */
const DESTRUCTIVE_TOOLS = new Set(["vps.reinstall", "vps.restore", "vps.password", "panel.console"]);

/** إجراء محرك الصلاحيات المركزي المقابل لأداة سحابية (null = عام: الباقات / بدء إضافة لوحة) */
function cloudAction(id, tool) {
  if (tool.layer !== "vps" && tool.layer !== "panel") return null;
  if (tool.anyone) return null;
  if (tool.kind === "read" && !tool.needs.length) return null;
  if (tool.kind === "read") return `${tool.layer}.user.read`;
  if (DESTRUCTIVE_TOOLS.has(id)) return `${tool.layer}.user.destructive`;
  return tool.layer === "vps" ? "vps.user.power" : "panel.user.write";
}

/**
 * نفس محرك الصلاحيات لكل أداة AI (§4): الهدف المحلول (الذي تحقق أنه ملك المستخدم) يمر من decide().
 * «يحتاج تأكيداً» مقبول هنا فقط لأن الأمر الموجّه إليه يعرض التأكيد نفسه (tool.confirm).
 */
async function cloudPermission(m, sock, id, tool, args) {
  const action = cloudAction(id, tool);
  if (!action) return { ok: true };
  const { DECISION, decide, principalOf } = await import("./terboo-permissions.js");
  const principal = await principalOf({ m, sock });
  const decision = decide({ principal, action, resource: { vpsId: args?.vpsId, panelId: args?.panelId } });
  if (decision.allowed) return { ok: true, decision };
  if (decision.decision === DECISION.NEEDS_CONFIRMATION && tool.confirm) return { ok: true, decision };
  return { ok: false, decision };
}

/**
 * ينفّذ أداة سحابية عبر الأمر الموجود.
 * @param {{id:string, input?:Object, m:Object, sock:Object, deps:{dispatch:Function}}} request
 * @returns {Promise<{ok:boolean, code:string, command?:string, args?:string}>}
 */
async function runCloudTool({ id, input = {}, m, sock, deps = {} }) {
  const tool = CLOUD_TOOLS[id];
  if (!tool) return { ok: false, code: NOT_EXPOSED[id] ? "not-exposed" : "unknown-tool" };
  if (typeof deps.dispatch !== "function") return { ok: false, code: "no-dispatch" };
  // الأسرار لا تُقبل من النموذج — تُحذف قبل أي استعمال
  const clean = Object.fromEntries(Object.entries(input || {}).filter(([key]) => !SECRET_KEYS.test(key)));
  const available = await cloudToolsFor(m);
  if (!available.some((x) => x.id === id)) {
    // لا يملك VPS/لوحة (أو أداة خاصة في مجموعة): الواجهة نفسها تشرح وتعرض الباقات/الإضافة
    const [command] = tool.layer === "vps" ? ["myvps"] : tool.layer === "panel" ? ["panels"] : ["plans"];
    await deps.dispatch(m, sock, { command, args: "" });
    return { ok: false, code: tool.privateOnly && m?.isGroup ? "private-only" : "not-owned", command, args: "" };
  }
  const target = await resolveTargets(m, tool, clean);
  if (!target.ok) {
    const fallback = target.choose === "server" && target.args?.panelId ? ["panels", act("servers", target.args.panelId)]
      : target.choose === "panel" || target.choose === "no-panel" ? ["panels", ""] : ["myvps", ""];
    await deps.dispatch(m, sock, { command: fallback[0], args: fallback[1] });
    return { ok: false, code: `choose-${target.choose}`, command: fallback[0], args: fallback[1] };
  }
  const gate = await cloudPermission(m, sock, id, tool, target.args);
  if (!gate.ok) return { ok: false, code: "permission", decision: gate.decision };
  const [command, args] = tool.route(target.args);
  const outcome = await deps.dispatch(m, sock, { command, args });
  return { ok: Boolean(outcome?.ok ?? true), code: outcome?.status || "dispatched", command, args };
}

/** للتوثيق: الكتالوج بلا دوال */
function cloudCatalog() {
  return {
    tools: Object.entries(CLOUD_TOOLS).map(([id, tool]) => ({ id, layer: tool.layer, kind: tool.kind, needs: tool.needs, confirm: Boolean(tool.confirm), privateOnly: Boolean(tool.privateOnly), purpose: tool.purpose, executesVia: tool.route({ vpsId: "<vpsId>", panelId: "<panelId>", serverId: "<serverId>", signal: "<signal>" }).join(" ").trim() })),
    notExposed: Object.entries(NOT_EXPOSED).map(([id, item]) => ({ id, reason: item.purpose })),
  };
}

export { CLOUD_TOOLS, CLOUD_WORDS, NOT_EXPOSED, cloudAction, cloudCatalog, cloudToolsFor, cloudToolsForModel, resolveTargets, runCloudTool };
export default { runCloudTool, cloudToolsFor, cloudToolsForModel, cloudCatalog };
