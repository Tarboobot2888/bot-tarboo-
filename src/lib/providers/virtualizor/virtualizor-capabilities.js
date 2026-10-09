// ═══════════════════════════════════════════════
// ☁️ Virtualizor — كتالوج القدرات واكتشافها فعلياً
// ───────────────────────────────────────────────
// كل عملية VPS تمر من هنا. لا endpoint مخمَّن: كل act مأخوذ من توثيق Virtualizor الرسمي
// (رابط التوثيق مع كل قدرة)، والاكتشاف وقت التشغيل:
//   • القدرات القرائية تُفحص فعلياً بطلب قراءة (ostemplate · services · vnc · backup2 · hostname …).
//   • قدرات التشغيل (start/stop/…) لا يمكن فحصها دون تنفيذها ⇒ «documented» حتى أول نجاح
//     حقيقي يُسجَّل runtimeVerified.
//   • القدرة غير المتاحة على هذا السيرفر لا تُعرض للمستخدم أبداً (لا «Backups» وهمي).
// ═══════════════════════════════════════════════

import { callVirtualizor } from "./virtualizor-client.js";
import { normalizeBackups, normalizeServices, normalizeTemplates } from "./virtualizor-normalizer.js";

const DOCS = "https://www.virtualizor.com/docs/enduser-api/";
const ADMIN_DOCS = "https://www.virtualizor.com/docs/admin-api/";

/**
 * الكتالوج. الحقول:
 *  act/query/post: الطلب الموثّق · layer: enduser|admin · kind: read|action|input
 *  userAllowed/ownerAllowed · requiresConfirmation · requiresBackgroundTask · requiresEntitlement
 *  riskLevel: low|medium|high|critical · probe: طلب قراءة يثبت توفر القدرة (أو null)
 *  group: تبويب الواجهة (power · system · security · management · network · backups · tools)
 */
const CAPABILITIES = Object.freeze({
  "vps.list": { act: "listvs", layer: "enduser", kind: "read", group: "management", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, riskLevel: "low", docs: `${DOCS}list-vps`, probe: { act: "listvs" }, fallback: "entitlement-records-only" },
  "vps.info": { act: "vpsmanage", layer: "enduser", kind: "read", group: "management", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, riskLevel: "low", docs: `${DOCS}vps-info`, probe: { act: "vpsmanage", vps: true }, fallback: "list-record" },
  "vps.start": { act: "start", query: { do: 1 }, layer: "enduser", kind: "action", group: "power", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, riskLevel: "low", docs: `${DOCS}start-vm`, probe: null, fallback: "none" },
  "vps.restart": { act: "restart", query: { do: 1 }, layer: "enduser", kind: "action", group: "power", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, requiresConfirmation: true, riskLevel: "medium", docs: `${DOCS}restart-vm`, probe: null, fallback: "none" },
  "vps.stop": { act: "stop", query: { do: 1 }, layer: "enduser", kind: "action", group: "power", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, requiresConfirmation: true, riskLevel: "medium", docs: `${DOCS}stop-vm`, probe: null, fallback: "none" },
  "vps.poweroff": { act: "poweroff", query: { do: 1 }, layer: "enduser", kind: "action", group: "power", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, requiresConfirmation: true, riskLevel: "high", docs: `${DOCS}poweroff-vm`, probe: null, fallback: "vps.stop" },
  "vps.hostname": { act: "hostname", query: { do: 1 }, post: ["changehost", "newhost"], layer: "enduser", kind: "input", group: "system", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, requiresConfirmation: true, riskLevel: "medium", docs: `${DOCS}change-hostname`, probe: { act: "hostname", vps: true }, fallback: "none" },
  "vps.password": { act: "changepassword", query: { do: 1 }, post: ["changepass", "newpass", "conf"], layer: "enduser", kind: "input", group: "security", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, requiresConfirmation: true, riskLevel: "high", docs: `${DOCS}change-password`, probe: { act: "changepassword", vps: true }, fallback: "none", privateOnly: true },
  "vps.reinstall": { act: "ostemplate", post: ["reinsos", "newos", "newpass", "conf", "vid"], layer: "enduser", kind: "input", group: "system", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, requiresConfirmation: true, requiresBackgroundTask: true, riskLevel: "critical", docs: `${DOCS}os-reinstall`, probe: { act: "ostemplate", vps: true, verify: (json) => normalizeTemplates(json).length > 0 }, fallback: "none", privateOnly: true },
  "vps.services": { act: "services", layer: "enduser", kind: "read", group: "tools", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, riskLevel: "low", docs: `${DOCS}enduser-list-services`, probe: { act: "services", vps: true, verify: (json) => normalizeServices(json).services.length > 0 }, fallback: "none" },
  "vps.service.restart": { act: "services", post: ["restart_x", "sel_serv", "vid"], layer: "enduser", kind: "action", group: "tools", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, requiresConfirmation: true, riskLevel: "medium", docs: `${DOCS}enduser-restart-services`, probe: { act: "services", vps: true, verify: (json) => normalizeServices(json).services.length > 0 }, fallback: "none" },
  "vps.vnc": { act: "vnc", layer: "enduser", kind: "read", group: "security", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, requiresConfirmation: true, riskLevel: "high", docs: `${DOCS}enduser-vnc-info`, probe: { act: "vnc", vps: true, novnc: true, verify: (json) => Boolean((json.info || json.vnc || json).port) }, fallback: "none", privateOnly: true },
  "vps.backups": { act: "backup2", layer: "enduser", kind: "read", group: "backups", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, riskLevel: "low", docs: `${DOCS}list-backup`, probe: { act: "backup2", vps: true, verify: (json) => json.backups_list !== undefined || json.backup_limit !== undefined }, fallback: "none", note: "Virtualizor end-user backups are OpenVZ-only per the docs" },
  "vps.restore": { act: "backups", post: ["restore", "bkid"], layer: "enduser", kind: "input", group: "backups", userAllowed: true, ownerAllowed: true, requiresEntitlement: true, requiresConfirmation: true, requiresBackgroundTask: true, riskLevel: "critical", docs: `${DOCS}restoring-backup`, probe: { act: "backup2", vps: true, verify: (json) => normalizeBackups(json).list.length > 0 }, fallback: "none" },
  // ── المالك فقط عبر لوحة الإدارة (4085) — لا تظهر للمستخدم أبداً ──
  "admin.vs.list": { act: "vs", layer: "admin", kind: "read", group: "owner", userAllowed: false, ownerAllowed: true, requiresEntitlement: false, riskLevel: "low", docs: `${ADMIN_DOCS}list-vs`, probe: { act: "vs" }, fallback: "vps.list" },
  "admin.vs.info": { act: "vs", query: { vpsid: "<id>" }, layer: "admin", kind: "read", group: "owner", userAllowed: false, ownerAllowed: true, requiresEntitlement: false, riskLevel: "low", docs: `${ADMIN_DOCS}list-vs`, probe: { act: "vs" }, fallback: "admin.vs.list" },
  "admin.vs.start": { act: "vs", query: { action: "start", vpsid: "<id>" }, layer: "admin", kind: "action", group: "owner", userAllowed: false, ownerAllowed: true, requiresEntitlement: false, riskLevel: "low", docs: ADMIN_DOCS, probe: null, fallback: "vps.start" },
  "admin.vs.restart": { act: "vs", query: { action: "restart", vpsid: "<id>" }, layer: "admin", kind: "action", group: "owner", userAllowed: false, ownerAllowed: true, requiresEntitlement: false, requiresConfirmation: true, riskLevel: "medium", docs: ADMIN_DOCS, probe: null, fallback: "vps.restart" },
  "admin.vs.stop": { act: "vs", query: { action: "stop", vpsid: "<id>" }, layer: "admin", kind: "action", group: "owner", userAllowed: false, ownerAllowed: true, requiresEntitlement: false, requiresConfirmation: true, riskLevel: "medium", docs: ADMIN_DOCS, probe: null, fallback: "vps.stop" },
  "admin.vs.poweroff": { act: "vs", query: { action: "poweroff", vpsid: "<id>" }, layer: "admin", kind: "action", group: "owner", userAllowed: false, ownerAllowed: true, requiresEntitlement: false, requiresConfirmation: true, riskLevel: "high", docs: ADMIN_DOCS, probe: null, fallback: "vps.poweroff" },
  "admin.vs.suspend": { act: "vs", query: { suspend: "<id>" }, layer: "admin", kind: "action", group: "owner", userAllowed: false, ownerAllowed: true, requiresEntitlement: false, requiresConfirmation: true, riskLevel: "high", docs: ADMIN_DOCS, probe: null, fallback: "entitlement-suspend" },
  "admin.vs.unsuspend": { act: "vs", query: { unsuspend: "<id>" }, layer: "admin", kind: "action", group: "owner", userAllowed: false, ownerAllowed: true, requiresEntitlement: false, requiresConfirmation: true, riskLevel: "medium", docs: ADMIN_DOCS, probe: null, fallback: "entitlement-restore" },
  "admin.users.list": { act: "users", layer: "admin", kind: "read", group: "owner", userAllowed: false, ownerAllowed: true, requiresEntitlement: false, riskLevel: "low", docs: ADMIN_DOCS, probe: { act: "users" }, fallback: "none" },
});

/** عمليات تغيّر موارد الخدمة أو ملكيتها أو تعليقها — موثّقة في Virtualizor لكنها ممنوعة هنا على المستخدم (مقيّدة للمالك/غير مُفعّلة) */
const RESTRICTED_ACTIONS = Object.freeze([
  { action: "vps.create", act: "create", reason: "provisioning — owner/billing only" },
  { action: "vps.delete", act: "delete", reason: "destroys the service — never via chat" },
  { action: "vps.suspend", act: "suspend", reason: "service status — owner entitlement controls access" },
  { action: "vps.unsuspend", act: "unsuspend", reason: "service status — owner only" },
  { action: "vps.netsuspend", act: "netsuspend", reason: "network suspension — owner only" },
  { action: "vps.scaling", act: "scaling", reason: "changes allocated resources — owner/billing only" },
  { action: "vps.edit", act: "editvs", reason: "management-level configuration — owner only" },
]);

const GROUPS = ["power", "management", "security", "system", "network", "backups", "tools"];

function capability(id) {
  return CAPABILITIES[id] || null;
}

/** القدرات المسموحة للمستخدم المشتري */
function userSafeActions() {
  return Object.entries(CAPABILITIES).filter(([, c]) => c.userAllowed).map(([id]) => id);
}
/** قدرات المالك (تشمل لوحة الإدارة) */
function ownerActions() {
  return Object.entries(CAPABILITIES).filter(([, c]) => c.ownerAllowed).map(([id]) => id);
}
/** عمليات حساسة: تأكيد إجباري، ومحادثة خاصة لبعضها */
function sensitiveActions() {
  return Object.entries(CAPABILITIES).filter(([, c]) => ["high", "critical"].includes(c.riskLevel)).map(([id]) => id);
}

// ── الاكتشاف وقت التشغيل ─────────────────────────
const DISCOVERY_TTL_MS = 10 * 60 * 1000;
const discovered = new Map();
/** نجاحات حقيقية سابقة: إجراء نُفّذ بنجاح على هذا السيرفر ⇒ runtimeVerified */
const verifiedActions = new Set();

function markVerified(id) {
  verifiedActions.add(id);
}

/**
 * يكتشف القدرات المتاحة فعلياً لـVPS واحد (طلبات قراءة فقط، نتيجة مخزّنة 10 دقائق).
 * @param {Object} settings إعدادات الطبقة enduser
 * @param {string} vpsId
 * @param {{signal?:AbortSignal, force?:boolean}} [options]
 * @returns {Promise<Object<string, {available:boolean, runtimeVerified:boolean, status:string}>>}
 */
async function discoverCapabilities(settings, vpsId, { signal = null, force = false } = {}) {
  const key = `${settings.origin}|${vpsId}`;
  const cached = discovered.get(key);
  if (!force && cached && Date.now() - cached.at < DISCOVERY_TTL_MS) return cached.result;
  const result = {};
  const probeCache = new Map();
  for (const [id, cap] of Object.entries(CAPABILITIES)) {
    if (cap.layer !== "enduser") continue;
    if (!cap.probe) {
      // لا فحص قرائي ممكن (إجراء تشغيل): موثّق ومتاح ما دام الحساب يعمل، ومُتحقَّق بعد أول نجاح
      result[id] = { available: true, runtimeVerified: verifiedActions.has(id), status: verifiedActions.has(id) ? "verified" : "documented" };
      continue;
    }
    const probeKey = `${cap.probe.act}|${cap.probe.vps ? vpsId : ""}|${cap.probe.novnc ? 1 : 0}`;
    try {
      if (!probeCache.has(probeKey)) {
        const query = { ...(cap.probe.vps ? { svs: vpsId } : {}), ...(cap.probe.novnc ? { novnc: vpsId } : {}) };
        probeCache.set(probeKey, callVirtualizor(settings, { act: cap.probe.act, query, signal, idempotent: true }).then((json) => ({ json }), (error) => ({ error })));
      }
      const { json, error } = await probeCache.get(probeKey);
      if (error) throw error;
      const ok = cap.probe.verify ? cap.probe.verify(json) : true;
      result[id] = { available: Boolean(ok), runtimeVerified: Boolean(ok), status: ok ? "verified" : "unsupported" };
    } catch (error) {
      if (error?.code === "aborted") throw error;
      result[id] = { available: false, runtimeVerified: false, status: error?.code === "api-error" ? "unsupported" : `unreachable:${error?.code || "error"}` };
    }
  }
  discovered.set(key, { at: Date.now(), result });
  while (discovered.size > 2000) discovered.delete(discovered.keys().next().value);
  return result;
}

/** مصفوفة الصلاحيات (docs/terboo-vps-permissions.json) */
function permissionMatrix() {
  const rows = Object.entries(CAPABILITIES).map(([action, c]) => ({
    action,
    endpoint: `index.php?act=${c.act}${c.query?.do ? "&do=1" : ""}${c.layer === "enduser" && action !== "vps.list" ? "&svs=<vpsid>" : ""}`,
    apiLayer: c.layer === "admin" ? "admin (4085)" : "enduser (4083)",
    userAllowed: c.userAllowed,
    ownerAllowed: c.ownerAllowed,
    requiresConfirmation: Boolean(c.requiresConfirmation),
    requiresBackgroundTask: Boolean(c.requiresBackgroundTask),
    requiresEntitlement: Boolean(c.requiresEntitlement),
    riskLevel: c.riskLevel,
    runtimeVerified: c.probe ? "probe (read-only request at dashboard open)" : "after first successful real execution",
    fallback: c.fallback,
    privateChatOnly: Boolean(c.privateOnly),
    docs: c.docs,
  }));
  for (const r of RESTRICTED_ACTIONS) {
    rows.push({ action: r.action, endpoint: `index.php?act=${r.act}`, apiLayer: "admin (4085) / not exposed", userAllowed: false, ownerAllowed: false, requiresConfirmation: true, requiresBackgroundTask: false, requiresEntitlement: true, riskLevel: "critical", runtimeVerified: "not used by Terboo", fallback: "none", privateChatOnly: true, docs: "", note: r.reason });
  }
  return rows;
}

function _resetCapabilities() {
  discovered.clear();
  verifiedActions.clear();
}

export { CAPABILITIES, DISCOVERY_TTL_MS, GROUPS, RESTRICTED_ACTIONS, _resetCapabilities, capability, discoverCapabilities, markVerified, ownerActions, permissionMatrix, sensitiveActions, userSafeActions };
export default { CAPABILITIES, capability, discoverCapabilities, permissionMatrix, userSafeActions, ownerActions, sensitiveActions };
