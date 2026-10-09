// ═══════════════════════════════════════════════
// ☁️ Terboo VPS — خدمة المستخدم المشتري
// ───────────────────────────────────────────────
// كل دالة تبدأ بالهوية والصلاحية؛ المستخدم لا يرى ولا يمس إلا الـVPS المسند له.
// الردود بلا أي اسم مزوّد أو مضيف داخلي (Terboo VPS فقط).
// ═══════════════════════════════════════════════

import { callVirtualizor } from "./virtualizor-client.js";
import { CAPABILITIES, GROUPS, discoverCapabilities, markVerified } from "./virtualizor-capabilities.js";
import { layerSettings } from "./virtualizor-config.js";
import { activeFor, markVerified as markEntitlementVerified } from "./virtualizor-entitlements.js";
import { doneMessage, normalizeBackups, normalizeInfo, normalizeList, normalizeServices, normalizeTemplates, normalizeVnc } from "./virtualizor-normalizer.js";
import { authorize, consumeRate, passwordProblem, validHostname, validService, validTemplate } from "./virtualizor-security.js";

const settings = () => layerSettings("enduser");

/** نتيجة موحّدة */
const fail = (code, extra = {}) => ({ ok: false, code, ...extra });
const okResult = (code, data = {}, message = "") => ({ ok: true, code, message, data });

/**
 * الـVPS المسندة لهذا المستخدم فقط (مع حالتها من المزوّد إن أمكن).
 * @returns {Promise<{ok:boolean, code:string, data?:{vps:Array}}>}
 */
async function listMine(identity, { signal = null } = {}) {
  const owned = activeFor(identity);
  if (!owned.length) return fail("no-entitlement");
  const byId = new Map(owned.map((e) => [e.vpsId, e]));
  let live = [];
  let liveError = null;
  try {
    live = normalizeList(await callVirtualizor(settings(), { act: "listvs", signal }));
  } catch (error) {
    if (error?.code === "aborted") throw error;
    liveError = error?.code || "error";
  }
  const vps = owned.map((e) => {
    const record = live.find((v) => v.vpsId === e.vpsId);
    return { vpsId: e.vpsId, planId: e.planId, expiresAt: e.expiresAt, ...(record ? { name: record.name, hostname: record.hostname, status: record.status, ips: record.ips } : { status: "unknown", ips: [] }) };
  }).filter((v) => byId.has(v.vpsId));
  return okResult("ok", { vps, live: !liveError, liveError });
}

/**
 * تفاصيل VPS + المجموعات والإجراءات المتاحة فعلياً (قدرات مكتشفة ∩ صلاحيات المستخدم).
 */
async function details(identity, vpsId, { signal = null, isGroup = false } = {}) {
  const auth = authorize({ identity, vpsId, action: "vps.info", isGroup });
  if (!auth.ok) return fail(auth.code);
  let info;
  try {
    info = normalizeInfo(await callVirtualizor(settings(), { act: "vpsmanage", query: { svs: vpsId }, signal }));
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail(error?.code || "error");
  }
  const caps = await discoverCapabilities(settings(), vpsId, { signal });
  const permissions = new Set(auth.entitlement.permissions || []);
  const actions = Object.entries(CAPABILITIES)
    .filter(([id, c]) => c.layer === "enduser" && c.userAllowed && permissions.has(id) && caps[id]?.available && !(c.privateOnly && isGroup) && !["vps.list", "vps.info"].includes(id))
    .map(([id, c]) => ({ id, group: c.group, kind: c.kind, risk: c.riskLevel, confirm: Boolean(c.requiresConfirmation), background: Boolean(c.requiresBackgroundTask), verified: Boolean(caps[id]?.runtimeVerified) }));
  const groups = GROUPS.filter((g) => actions.some((a) => a.group === g));
  return okResult("ok", { info: { ...info, planId: auth.entitlement.planId, expiresAt: auth.entitlement.expiresAt }, actions, groups });
}

/** قوالب أنظمة التشغيل المتاحة لهذا الـVPS (لشاشة اختيار النظام) */
async function templates(identity, vpsId, { signal = null } = {}) {
  const auth = authorize({ identity, vpsId, action: "vps.info" });
  if (!auth.ok) return fail(auth.code);
  if (!auth.entitlement.permissions.includes("vps.reinstall")) return fail("feature-disabled");
  try {
    const list = normalizeTemplates(await callVirtualizor(settings(), { act: "ostemplate", query: { svs: vpsId }, signal, idempotent: true }));
    return list.length ? okResult("ok", { templates: list }) : fail("unsupported");
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail(error?.code || "error");
  }
}

/** خدمات الـVPS (لاختيار خدمة لإعادة تشغيلها) */
async function services(identity, vpsId, { signal = null } = {}) {
  return run(identity, vpsId, "vps.services", {}, { signal });
}

/**
 * ينفّذ إجراء VPS بعد التفويض والتحقق.
 * @param {Object} identity
 * @param {string} vpsId
 * @param {string} action مثل vps.restart
 * @param {Object} args hostname · password · osid · service · backup
 * @param {{confirmed?:boolean, isGroup?:boolean, signal?:AbortSignal}} options
 */
async function run(identity, vpsId, action, args = {}, { confirmed = false, isGroup = false, signal = null } = {}) {
  const auth = authorize({ identity, vpsId, action, isGroup, confirmed });
  if (!auth.ok) return fail(auth.code, auth.retryAfter ? { retryAfter: auth.retryAfter } : {});
  const cap = auth.capability;
  const svs = String(vpsId);
  const s = settings();
  // المحاولة تُحتسب في حد المعدل عند الإرسال الفعلي للمزوّد فقط
  const charge = () => {
    const wait = consumeRate(auth.entitlement.canonicalUserId, action);
    if (wait) throw Object.assign(new Error("rate-limited"), { code: "rate-limited", retryAfter: wait });
  };
  try {
    switch (action) {
      case "vps.start":
      case "vps.stop":
      case "vps.restart":
      case "vps.poweroff": {
        charge();
        const json = await callVirtualizor(s, { act: cap.act, query: { svs, do: 1 }, signal, idempotent: false });
        markVerified(action);
        markEntitlementVerified(auth.entitlement.id);
        return okResult("done", { action }, doneMessage(json));
      }
      case "vps.hostname": {
        const host = validHostname(args.hostname);
        if (!host) return fail("invalid-hostname");
        charge();
        const json = await callVirtualizor(s, { act: "hostname", query: { svs, do: 1 }, post: { changehost: 1, newhost: host }, signal, idempotent: false });
        markVerified(action);
        return okResult("done", { hostname: host, onBoot: Boolean(json.onboot) }, doneMessage(json));
      }
      case "vps.password": {
        const problem = passwordProblem(args.password);
        if (problem) return fail("invalid-password", { reason: problem });
        charge();
        const json = await callVirtualizor(s, { act: "changepassword", query: { svs, do: 1 }, post: { changepass: 1, newpass: args.password, conf: args.password }, signal, idempotent: false });
        markVerified(action);
        return okResult("done", { onBoot: true }, doneMessage(json));
      }
      case "vps.reinstall": {
        const list = normalizeTemplates(await callVirtualizor(s, { act: "ostemplate", query: { svs }, signal, idempotent: true }));
        const template = validTemplate(args.osid, list);
        if (!template) return fail("invalid-template");
        const problem = passwordProblem(args.password);
        if (problem) return fail("invalid-password", { reason: problem });
        charge();
        const json = await callVirtualizor(s, { act: "ostemplate", query: { svs }, post: { reinsos: 1, newos: template.osid, newpass: args.password, conf: args.password, vid: svs }, signal, idempotent: false });
        markVerified(action);
        return okResult("done", { os: template.name }, doneMessage(json));
      }
      case "vps.services": {
        charge();
        const data = normalizeServices(await callVirtualizor(s, { act: "services", query: { svs }, signal }));
        return okResult("ok", data);
      }
      case "vps.service.restart": {
        const current = normalizeServices(await callVirtualizor(s, { act: "services", query: { svs }, signal }));
        const service = validService(args.service, current.services);
        if (!service) return fail("invalid-service");
        charge();
        const json = await callVirtualizor(s, { act: "services", query: { svs }, post: { restart_x: 1, sel_serv: service, vid: svs }, signal, idempotent: false });
        markVerified(action);
        return okResult("done", { service }, doneMessage(json));
      }
      case "vps.vnc": {
        charge();
        const vnc = normalizeVnc(await callVirtualizor(s, { act: "vnc", query: { svs, novnc: svs }, signal }));
        if (!vnc.port) return fail("unsupported");
        return okResult("ok", vnc);
      }
      case "vps.backups": {
        charge();
        const data = normalizeBackups(await callVirtualizor(s, { act: "backup2", query: { svs }, signal }));
        return okResult("ok", data);
      }
      case "vps.restore": {
        const current = normalizeBackups(await callVirtualizor(s, { act: "backup2", query: { svs }, signal }));
        const backup = String(args.backup || "");
        if (!current.list.includes(backup)) return fail("invalid-backup");
        charge();
        const json = await callVirtualizor(s, { act: "backups", query: { svs }, post: { restore: 1, bkid: backup }, signal, idempotent: false });
        markVerified(action);
        return okResult("done", { backup }, doneMessage(json));
      }
      default:
        return fail("unknown-action");
    }
  } catch (error) {
    if (error?.code === "aborted") throw error;
    if (error?.code === "rate-limited") return fail("rate-limited", { retryAfter: error.retryAfter });
    // لا «تم» عند فشل الاتصال: الخطأ يُعاد كما هو بلا تفاصيل داخلية
    return fail(error?.code || "error", { apiErrors: error?.apiErrors?.length ? ["provider-error"] : [] });
  }
}

export { details, listMine, run, services, templates };
export default { listMine, details, templates, services, run };
