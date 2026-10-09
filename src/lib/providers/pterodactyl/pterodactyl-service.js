// ═══════════════════════════════════════════════
// 🦖 لوحات المستخدم — الخدمة
// ───────────────────────────────────────────────
// مسار الإضافة الإلزامي: نوع الواجهة ← رابط اللوحة (حارس SSRF) ← المفتاح (صيغة) ←
//   اختبار الاتصال (اكتشاف قدرات حقيقي) ← حفظ مشفّر. فشل الاختبار ⇒ لا شيء يُحفظ.
// كل إجراء على سيرفر: صلاحية اللوحة الفعلية (user_permissions) قبل أي استدعاء.
// النتائج موحّدة {ok, code, data} — لا مفاتيح ولا استجابات خام في أي رسالة.
// ═══════════════════════════════════════════════

import config from "../../../../config.js";
import { checkUrl, NetGuardError } from "../../terboo-net-guard.js";
import { discoverPanel, hasPermission, serverMeta } from "./pterodactyl-capabilities.js";
import { API_TYPES, keyProblem, normalizeBaseUrl, panelRequest, panelSettings, PanelError } from "./pterodactyl-client.js";
import {
  findPanel, forgetCredential, identityFrom, maskedPanel, newPanelRecord, openCredential, panelsOf, savePanels, sealCredential,
} from "./pterodactyl-store.js";

const fail = (code, extra = {}) => ({ ok: false, code, ...extra });
const okResult = (code, data = {}) => ({ ok: true, code, data });

const LIMITS = Object.freeze({
  default: { max: 20, windowMs: 60_000 },
  connect: { max: 6, windowMs: 10 * 60_000 },
  power: { max: 6, windowMs: 60_000 },
  command: { max: 10, windowMs: 60_000 },
  reinstall: { max: 1, windowMs: 30 * 60_000 },
  "backup.create": { max: 2, windowMs: 10 * 60_000 },
  suspend: { max: 6, windowMs: 10 * 60_000 },
});
const hits = new Map();
const metaCache = new Map();
const META_TTL_MS = 5 * 60_000;
/** سقف للذاكرة طويلة التشغيل: الأقدم يُحذف أولاً (حد المعدل والذاكرة المؤقتة قصيرة العمر أصلاً) */
const MAX_ENTRIES = 5000;
function capMap(map) {
  while (map.size > MAX_ENTRIES) map.delete(map.keys().next().value);
}

/** حد المعدل لكل مستخدم ⇒ ثوانٍ للانتظار أو 0 */
function charge(identity, bucket) {
  const rule = LIMITS[bucket] || LIMITS.default;
  const key = `${identityFrom(identity).canonical}|${LIMITS[bucket] ? bucket : "default"}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < rule.windowMs);
  if (recent.length >= rule.max) {
    hits.set(key, recent);
    return Math.ceil((rule.windowMs - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(key, recent);
  capMap(hits);
  return 0;
}

function maxPanels() {
  return Number(config.integrations?.pterodactyl?.maxPanelsPerUser) || 5;
}

function enabled() {
  return config.integrations?.pterodactyl?.enabled !== false;
}

/** يحوّل أي خطأ إلى رمز آمن */
function codeOf(error) {
  if (error?.code === "aborted") throw error;
  if (error instanceof PanelError || error instanceof NetGuardError) return error.code;
  if (/^vault-/.test(String(error?.message || ""))) return "credential-unreadable";
  return "error";
}

/** يتحقق من رابط مقدّم من المستخدم ⇒ {ok, baseUrl} */
function validateBaseUrl(value) {
  let baseUrl;
  try {
    baseUrl = normalizeBaseUrl(value);
  } catch {
    return fail("invalid-url");
  }
  try {
    const s = panelSettings();
    checkUrl(baseUrl, { allowPrivateHosts: s.allowedPrivateHosts, allowPrivateNetworks: s.allowPrivateNetworks });
  } catch (error) {
    return fail(error?.code || "invalid-url");
  }
  return okResult("ok", { baseUrl });
}

function validLabel(value, fallback = "") {
  const label = String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!label) return fallback ? validLabel(fallback) : null;
  return label.length <= 32 ? label : null;
}

// ═══════════════════════════════════════════════
// إدارة اللوحات
// ═══════════════════════════════════════════════

/** لوحات المستخدم (عرض مقنّع) */
function listPanels(identity) {
  return panelsOf(identity).map(maskedPanel);
}

/**
 * إضافة لوحة: اختبار ثم حفظ مشفّر.
 * @param {Object} identity
 * @param {{label?:string, baseUrl:string, apiType:"client"|"application", apiKey:string}} input
 */
async function addPanel(identity, { label = "", baseUrl, apiType, apiKey }, { signal = null } = {}) {
  if (!enabled()) return fail("disabled");
  if (!API_TYPES.includes(apiType)) return fail("invalid-type");
  const panels = panelsOf(identity);
  if (panels.length >= maxPanels()) return fail("limit", { max: maxPanels() });
  const url = validateBaseUrl(baseUrl);
  if (!url.ok) return url;
  const problem = keyProblem(apiKey, apiType);
  if (problem) return fail(problem === "type-mismatch" ? "key-type-mismatch" : "invalid-key");
  if (panels.some((p) => p.baseUrl === url.data.baseUrl && p.apiType === apiType)) return fail("duplicate");
  const wait = charge(identity, "connect");
  if (wait) return fail("rate-limited", { retryAfter: wait });
  const host = new URL(url.data.baseUrl).hostname;
  const panel = newPanelRecord(identity, { label: validLabel(label, host) || host.slice(0, 32), baseUrl: url.data.baseUrl, apiType, apiKey: String(apiKey).trim() });
  const test = await discoverPanel(panel, String(apiKey).trim(), { signal });
  if (!test.ok) return fail(test.code);
  panel.status = "connected";
  panel.lastCheck = new Date().toISOString();
  panel.capabilities = test.capabilities;
  savePanels(identity, [...panelsOf(identity), panel]);
  return okResult("added", { panel: maskedPanel(panel) });
}

/** اختبار اتصال لوحة محفوظة (يحدّث حالتها وقدراتها) */
async function testPanel(identity, panelId, { signal = null } = {}) {
  const panel = findPanel(identity, panelId);
  if (!panel) return fail("not-found");
  const wait = charge(identity, "connect");
  if (wait) return fail("rate-limited", { retryAfter: wait });
  let result;
  try {
    result = await discoverPanel(panel, openCredential(panel), { signal });
  } catch (error) {
    result = { ok: false, code: codeOf(error) };
  }
  const updated = panelsOf(identity).map((p) => (p.id === panel.id
    ? { ...p, status: result.ok ? "connected" : `error:${result.code}`, lastCheck: new Date().toISOString(), capabilities: result.ok ? result.capabilities : p.capabilities, updatedAt: new Date().toISOString() }
    : p));
  savePanels(identity, updated);
  metaCache.clear();
  const fresh = findPanel(identity, panel.id);
  return result.ok ? okResult("connected", { panel: maskedPanel(fresh) }) : fail(result.code, { panel: maskedPanel(fresh) });
}

function renamePanel(identity, panelId, label) {
  const panel = findPanel(identity, panelId);
  if (!panel) return fail("not-found");
  const clean = validLabel(label);
  if (!clean) return fail("invalid-label");
  savePanels(identity, panelsOf(identity).map((p) => (p.id === panel.id ? { ...p, label: clean, updatedAt: new Date().toISOString() } : p)));
  return okResult("renamed", { panel: maskedPanel(findPanel(identity, panel.id)) });
}

/** استبدال المفتاح: يُختبر الجديد أولاً، ولا يُمس القديم إن فشل */
async function replaceKey(identity, panelId, apiKey, { signal = null } = {}) {
  const panel = findPanel(identity, panelId);
  if (!panel) return fail("not-found");
  const problem = keyProblem(apiKey, panel.apiType);
  if (problem) return fail(problem === "type-mismatch" ? "key-type-mismatch" : "invalid-key");
  const wait = charge(identity, "connect");
  if (wait) return fail("rate-limited", { retryAfter: wait });
  const test = await discoverPanel(panel, String(apiKey).trim(), { signal });
  if (!test.ok) return fail(test.code);
  forgetCredential(panel);
  const next = { ...panel, encryptedCredential: sealCredential(panel, String(apiKey).trim()), status: "connected", lastCheck: new Date().toISOString(), capabilities: test.capabilities, updatedAt: new Date().toISOString() };
  savePanels(identity, panelsOf(identity).map((p) => (p.id === panel.id ? next : p)));
  metaCache.clear();
  return okResult("key-replaced", { panel: maskedPanel(next) });
}

/** تعديل الرابط: يُختبر بالمفتاح المحفوظ قبل الحفظ */
async function updateUrl(identity, panelId, baseUrl, { signal = null } = {}) {
  const panel = findPanel(identity, panelId);
  if (!panel) return fail("not-found");
  const url = validateBaseUrl(baseUrl);
  if (!url.ok) return url;
  const wait = charge(identity, "connect");
  if (wait) return fail("rate-limited", { retryAfter: wait });
  const candidate = { ...panel, baseUrl: url.data.baseUrl };
  let test;
  try {
    test = await discoverPanel(candidate, openCredential(panel), { signal });
  } catch (error) {
    test = { ok: false, code: codeOf(error) };
  }
  if (!test.ok) return fail(test.code);
  const next = { ...candidate, status: "connected", lastCheck: new Date().toISOString(), capabilities: test.capabilities, updatedAt: new Date().toISOString() };
  savePanels(identity, panelsOf(identity).map((p) => (p.id === panel.id ? next : p)));
  metaCache.clear();
  return okResult("url-updated", { panel: maskedPanel(next) });
}

/** حذف لوحة: المفتاح المشفّر يُحذف وينسى من الذاكرة */
function deletePanel(identity, panelId) {
  const panel = findPanel(identity, panelId);
  if (!panel) return fail("not-found");
  forgetCredential(panel);
  savePanels(identity, panelsOf(identity).filter((p) => p.id !== panel.id));
  metaCache.clear();
  return okResult("deleted", { label: panel.label });
}

// ═══════════════════════════════════════════════
// السيرفرات
// ═══════════════════════════════════════════════

const SAFE_ID = /^[A-Za-z0-9-]{1,36}$/;

function clientServer(row) {
  const a = row?.attributes || {};
  return {
    id: String(a.identifier || ""),
    uuid: String(a.uuid || ""),
    name: String(a.name || ""),
    node: String(a.node || ""),
    owner: Boolean(a.server_owner),
    suspended: Boolean(a.is_suspended),
    installing: Boolean(a.is_installing),
    limits: { memory: Number(a.limits?.memory || 0), disk: Number(a.limits?.disk || 0), cpu: Number(a.limits?.cpu || 0) },
  };
}

function applicationServer(row) {
  const a = row?.attributes || {};
  return {
    id: String(a.id ?? ""),
    identifier: String(a.identifier || ""),
    name: String(a.name || ""),
    node: String(a.node ?? ""),
    user: String(a.user ?? ""),
    suspended: Boolean(a.suspended ?? a.status === "suspended"),
    status: String(a.status || ""),
    limits: { memory: Number(a.limits?.memory || 0), disk: Number(a.limits?.disk || 0), cpu: Number(a.limits?.cpu || 0) },
  };
}

/** قائمة السيرفرات (حتى 200) */
async function servers(identity, panelId, { signal = null } = {}) {
  const panel = findPanel(identity, panelId);
  if (!panel) return fail("not-found");
  const wait = charge(identity, "default");
  if (wait) return fail("rate-limited", { retryAfter: wait });
  try {
    const key = openCredential(panel);
    const path = panel.apiType === "client" ? "/api/client" : "/api/application/servers";
    const list = [];
    for (let page = 1; page <= 4; page += 1) {
      const { data } = await panelRequest(panel, key, { path, query: { per_page: 50, page }, signal });
      for (const row of data?.data || []) list.push(panel.apiType === "client" ? clientServer(row) : applicationServer(row));
      const pages = Number(data?.meta?.pagination?.total_pages || 1);
      if (page >= pages) break;
    }
    return okResult("ok", { servers: list, apiType: panel.apiType });
  } catch (error) {
    return fail(codeOf(error));
  }
}

/** صلاحيات سيرفر (Client API) مع ذاكرة قصيرة */
async function metaFor(identity, panel, key, serverId, { signal = null, fresh = false } = {}) {
  const cacheKey = `${identityFrom(identity).canonical}|${panel.id}|${serverId}`;
  const cached = metaCache.get(cacheKey);
  if (!fresh && cached && Date.now() - cached.checkedAt < META_TTL_MS) return cached;
  const meta = await serverMeta(panel, key, serverId, { signal });
  metaCache.set(cacheKey, meta);
  capMap(metaCache);
  return meta;
}

/** تفاصيل سيرفر + الأقسام المسموحة فعلياً */
async function serverInfo(identity, panelId, serverId, { signal = null } = {}) {
  const panel = findPanel(identity, panelId);
  if (!panel) return fail("not-found");
  if (!SAFE_ID.test(String(serverId || ""))) return fail("invalid-server");
  const wait = charge(identity, "default");
  if (wait) return fail("rate-limited", { retryAfter: wait });
  try {
    const key = openCredential(panel);
    if (panel.apiType === "client") {
      const meta = await metaFor(identity, panel, key, serverId, { signal, fresh: true });
      return okResult("ok", { server: clientServer({ attributes: meta.attributes }), sections: meta.sections, isOwner: meta.isOwner, apiType: "client" });
    }
    const { data } = await panelRequest(panel, key, { path: `/api/application/servers/${encodeURIComponent(serverId)}`, signal });
    const server = applicationServer(data);
    return okResult("ok", { server, sections: ["info", server.suspended ? "unsuspend" : "suspend"], apiType: "application" });
  } catch (error) {
    return fail(codeOf(error));
  }
}

const POWER_PERMISSION = { start: "control.start", stop: "control.stop", restart: "control.restart", kill: "control.stop" };
const DESTRUCTIVE = new Set(["power.stop", "power.kill", "reinstall", "suspend"]);
const SECRET_ENV = /TOKEN|SECRET|PASS|KEY|AUTH|PRIVATE|WEBHOOK/i;

function bytes(n) {
  const v = Number(n) || 0;
  if (v >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(2)} GB`;
  if (v >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(1)} MB`;
  if (v >= 1024) return `${(v / 1024).toFixed(0)} KB`;
  return `${v} B`;
}

/**
 * إجراء/قراءة على سيرفر.
 * @param {string} action resources · power.start|stop|restart|kill · command · files · backups · backup.create
 *   · databases · network · startup · rename · reinstall · account · suspend · unsuspend
 * @param {Object} args directory · command · name
 * @param {{confirmed?:boolean, signal?:AbortSignal}} options
 */
async function serverAction(identity, panelId, serverId, action, args = {}, { confirmed = false, signal = null } = {}) {
  const panel = findPanel(identity, panelId);
  if (!panel) return fail("not-found");
  if (action !== "account" && !SAFE_ID.test(String(serverId || ""))) return fail("invalid-server");
  if (DESTRUCTIVE.has(action) && !confirmed) return fail("needs-confirmation");
  const bucket = action.startsWith("power.") ? "power" : ["command", "reinstall", "backup.create", "suspend", "unsuspend"].includes(action) ? (action === "unsuspend" ? "suspend" : action) : "default";
  const sid = encodeURIComponent(String(serverId || ""));
  let key;
  try {
    key = openCredential(panel);
  } catch (error) {
    return fail(codeOf(error));
  }

  try {
    if (panel.apiType === "application") {
      if (!["suspend", "unsuspend", "info"].includes(action)) return fail("unsupported");
      const wait = charge(identity, bucket);
      if (wait) return fail("rate-limited", { retryAfter: wait });
      if (action === "info") return serverInfo(identity, panelId, serverId, { signal });
      await panelRequest(panel, key, { method: "POST", path: `/api/application/servers/${sid}/${action}`, signal });
      return okResult("done", { action });
    }

    if (action === "account") {
      const wait = charge(identity, "default");
      if (wait) return fail("rate-limited", { retryAfter: wait });
      const { data } = await panelRequest(panel, key, { path: "/api/client/account", signal });
      const a = data?.attributes || {};
      return okResult("ok", { username: String(a.username || ""), admin: Boolean(a.admin), language: String(a.language || "") });
    }

    const meta = await metaFor(identity, panel, key, serverId, { signal });
    const need = action.startsWith("power.") ? POWER_PERMISSION[action.slice(6)]
      : { resources: null, command: "control.console", files: "file.read", backups: "backup.read", "backup.create": "backup.create", databases: "database.read", network: "allocation.read", startup: "startup.read", rename: "settings.rename", reinstall: "settings.reinstall" }[action];
    if (need === undefined) return fail("unsupported");
    if (need && !hasPermission(meta, need)) return fail("permission-denied");
    const wait = charge(identity, bucket);
    if (wait) return fail("rate-limited", { retryAfter: wait });
    const base = ["/api/client/servers", sid].join("/");

    switch (action) {
      case "resources": {
        const { data } = await panelRequest(panel, key, { path: `${base}/resources`, signal });
        const a = data?.attributes || {};
        const r = a.resources || {};
        return okResult("ok", {
          state: String(a.current_state || "unknown"),
          suspended: Boolean(a.is_suspended),
          cpu: Number(r.cpu_absolute || 0).toFixed(1),
          memory: bytes(r.memory_bytes),
          disk: bytes(r.disk_bytes),
          rx: bytes(r.network_rx_bytes),
          tx: bytes(r.network_tx_bytes),
          uptimeSec: Math.round(Number(r.uptime || 0) / 1000),
        });
      }
      case "power.start":
      case "power.stop":
      case "power.restart":
      case "power.kill":
        await panelRequest(panel, key, { method: "POST", path: `${base}/power`, body: { signal: action.slice(6) }, signal });
        return okResult("done", { action });
      case "command": {
        const command = String(args.command || "").trim();
        if (!command || command.length > 500 || /[\r\n]/.test(command)) return fail("invalid-command");
        await panelRequest(panel, key, { method: "POST", path: `${base}/command`, body: { command }, signal });
        return okResult("done", { action });
      }
      case "files": {
        const directory = String(args.directory || "/").trim() || "/";
        if (!directory.startsWith("/") || directory.split("/").includes("..") || directory.length > 300) return fail("invalid-path");
        const { data } = await panelRequest(panel, key, { path: `${base}/files/list`, query: { directory }, signal });
        const entries = (data?.data || []).map((row) => ({ name: String(row?.attributes?.name || ""), file: Boolean(row?.attributes?.is_file), size: bytes(row?.attributes?.size) }));
        return okResult("ok", { directory, entries });
      }
      case "backups": {
        const { data } = await panelRequest(panel, key, { path: `${base}/backups`, signal });
        const list = (data?.data || []).map((row) => ({ name: String(row?.attributes?.name || ""), size: bytes(row?.attributes?.bytes), done: Boolean(row?.attributes?.completed_at), at: String(row?.attributes?.created_at || "") }));
        return okResult("ok", { backups: list, limit: Number(meta.attributes?.feature_limits?.backups ?? 0) });
      }
      case "backup.create":
        await panelRequest(panel, key, { method: "POST", path: `${base}/backups`, body: {}, signal });
        return okResult("done", { action });
      case "databases": {
        const { data } = await panelRequest(panel, key, { path: `${base}/databases`, signal });
        const list = (data?.data || []).map((row) => {
          const a = row?.attributes || {};
          return { name: String(a.name || ""), username: String(a.username || ""), host: `${a.host?.address || ""}:${a.host?.port || ""}`, remote: String(a.connections_from || "") };
        });
        return okResult("ok", { databases: list });
      }
      case "network": {
        const { data } = await panelRequest(panel, key, { path: `${base}/network/allocations`, signal });
        const list = (data?.data || []).map((row) => {
          const a = row?.attributes || {};
          return { address: `${a.ip_alias || a.ip || ""}:${a.port || ""}`, primary: Boolean(a.is_default), notes: String(a.notes || "") };
        });
        return okResult("ok", { allocations: list });
      }
      case "startup": {
        const { data } = await panelRequest(panel, key, { path: `${base}/startup`, signal });
        // قيم المتغيرات الحساسة (توكن/كلمة سر…) لا تُعرض في المحادثة أبداً
        const variables = (data?.data || []).map((row) => {
          const a = row?.attributes || {};
          const name = String(a.env_variable || "");
          return { name, label: String(a.name || name), value: SECRET_ENV.test(name) ? "••••••••" : String(a.server_value ?? "").slice(0, 80), editable: Boolean(a.is_editable) };
        });
        return okResult("ok", { variables, image: String(data?.meta?.docker_images ? Object.values(data.meta.docker_images)[0] || "" : "") });
      }
      case "rename": {
        const name = validLabel(args.name);
        if (!name) return fail("invalid-label");
        await panelRequest(panel, key, { method: "POST", path: `${base}/settings/rename`, body: { name }, signal });
        metaCache.clear();
        return okResult("done", { action, name });
      }
      case "reinstall":
        await panelRequest(panel, key, { method: "POST", path: `${base}/settings/reinstall`, signal });
        return okResult("done", { action });
      default:
        return fail("unsupported");
    }
  } catch (error) {
    return fail(codeOf(error));
  }
}

function _resetPanelService() {
  hits.clear();
  metaCache.clear();
}

export {
  DESTRUCTIVE as PANEL_DESTRUCTIVE, LIMITS as PANEL_LIMITS, _resetPanelService, addPanel, deletePanel, listPanels,
  renamePanel, replaceKey, serverAction, serverInfo, servers, testPanel, updateUrl, validateBaseUrl,
};
export default { listPanels, addPanel, testPanel, renamePanel, replaceKey, updateUrl, deletePanel, servers, serverInfo, serverAction };
