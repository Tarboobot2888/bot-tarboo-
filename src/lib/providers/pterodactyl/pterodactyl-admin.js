// ═══════════════════════════════════════════════
// 🦖 Pterodactyl — لوحات المالك (Application API) عبر طبقة واحدة (§20)
// ───────────────────────────────────────────────
// لوحات config.pterodactyl.server1..5 (البيئة تتغلب: TERBOO_PTERO_<N>_DOMAIN / _APIKEY) تمر الآن من نفس العميل
// المحروس (terboo-net-guard: مهلة · حد حجم · لا تسريب مفاتيح عند التحويل · أخطاء موحّدة PanelError) بدل
// axios مباشر مكرر في كل بلوقن. نطاق اللوحة المضبوط من المالك موثوق صراحةً (قد يكون عنواناً داخلياً).
//   users/servers/nodes/locations/nests · حذف وتعليق بتحقق بعد التنفيذ (404 / suspended)
//   legacyClient(ref): واجهة بشكل axios ({data}) للبلوقنات القديمة — نفس منطقها، نقل موحّد.
// ═══════════════════════════════════════════════

import config from "../../../../config.js";
import { registerSecret } from "../../terboo-secrets.js";
import { PanelError, normalizeBaseUrl, panelRequest } from "./pterodactyl-client.js";

const SLOTS = [1, 2, 3, 4, 5];
const MAX_PAGES = 20;
const fail = (code, extra = {}) => ({ ok: false, code, ...extra });

/** «v2» · «s2» · «2» · «server2» ⇒ 2 */
function slotOf(ref) {
  const hit = String(ref || "").toLowerCase().match(/^(?:v|s|server)?([1-5])$/);
  return hit ? Number(hit[1]) : null;
}

/** إعداد لوحة المالك (مفتاح Application في الذاكرة فقط) */
function panelOf(ref) {
  const slot = slotOf(ref);
  if (!slot) return null;
  const raw = config.pterodactyl?.[`server${slot}`] || {};
  const domain = String(process.env[`TERBOO_PTERO_${slot}_DOMAIN`] || raw.domain || "").trim();
  const apiKey = String(process.env[`TERBOO_PTERO_${slot}_APIKEY`] || raw.apikey || "").trim();
  if (!domain || !apiKey) return { slot, id: `v${slot}`, configured: false };
  registerSecret(apiKey);
  let baseUrl = "";
  try {
    baseUrl = normalizeBaseUrl(domain);
  } catch {
    return { slot, id: `v${slot}`, configured: false, invalid: true };
  }
  return { slot, id: `v${slot}`, configured: true, baseUrl, apiType: "application", apiKey, egg: raw.egg, nestid: raw.nestid, location: raw.location };
}

/** لوحات المالك المضبوطة (بلا مفاتيح) */
function listAdminPanels() {
  return SLOTS.map((slot) => panelOf(slot)).map((p) => ({ id: p.id, configured: Boolean(p.configured), host: p.configured ? new URL(p.baseUrl).host : "" }));
}

async function request(ref, { method = "GET", path, query = null, body = null, signal = null }) {
  const panel = panelOf(ref);
  if (!panel?.configured) throw new PanelError("not-configured");
  if (!String(path || "").startsWith("/api/application/")) throw new PanelError("validation", { detail: "application-api-only" });
  const host = new URL(panel.baseUrl).hostname;
  return panelRequest(panel, panel.apiKey, { method, path, query, body, signal, allowHosts: [host] });
}

/** كل الصفحات (حد أعلى للصفحات) */
async function listAll(ref, path, { query = {}, signal = null } = {}) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await request(ref, { path, query: { ...query, page, per_page: 100 }, signal });
    rows.push(...(data?.data || []).map((row) => row.attributes || row));
    const total = data?.meta?.pagination?.total_pages || 1;
    if (page >= total) break;
  }
  return rows;
}

const wrap = async (fn) => {
  try {
    return { ok: true, code: "ok", data: await fn() };
  } catch (error) {
    return fail(error instanceof PanelError ? error.code : "error", { status: error?.status || 0 });
  }
};

const listUsers = (ref, { search = "", signal = null } = {}) => wrap(() => listAll(ref, "/api/application/users", { query: search ? { "filter[email]": search } : {}, signal }));
const listServers = (ref, { signal = null } = {}) => wrap(() => listAll(ref, "/api/application/servers", { signal }));
const listNodes = (ref, { signal = null } = {}) => wrap(() => listAll(ref, "/api/application/nodes", { signal }));
const listLocations = (ref, { signal = null } = {}) => wrap(() => listAll(ref, "/api/application/locations", { signal }));
const getUser = (ref, id, { signal = null } = {}) => wrap(async () => (await request(ref, { path: `/api/application/users/${Number(id)}`, signal })).data?.attributes);
const getServer = (ref, id, { signal = null } = {}) => wrap(async () => (await request(ref, { path: `/api/application/servers/${Number(id)}`, signal })).data?.attributes);

/** حذف ثم تحقق: القراءة بعدها يجب أن تعطي not-found (لا «تم» بلا دليل) */
async function deleteVerified(ref, kind, id, { force = false, signal = null } = {}) {
  if (!/^\d{1,10}$/.test(String(id))) return fail("validation");
  const path = ["/api/application", kind, Number(id)].join("/");
  const before = await wrap(async () => (await request(ref, { path, signal })).data?.attributes);
  if (!before.ok) return before;
  const removed = await wrap(() => request(ref, { method: "DELETE", path: force && kind === "servers" ? `${path}/force` : path, signal }));
  if (!removed.ok) return removed;
  const after = await wrap(() => request(ref, { path, signal }));
  if (after.ok) return fail("not-applied", { data: before.data });
  return after.code === "not-found" ? { ok: true, code: "deleted", verified: true, data: before.data } : { ok: true, code: "deleted", verified: false, data: before.data };
}

const deleteServer = (ref, id, options) => deleteVerified(ref, "servers", id, options);
const deleteUser = (ref, id, options) => deleteVerified(ref, "users", id, options);

/** تعليق/إلغاء تعليق خادم مع تحقق من الحالة */
async function setSuspended(ref, id, suspended, { signal = null } = {}) {
  if (!/^\d{1,10}$/.test(String(id))) return fail("validation");
  const before = await getServer(ref, id, { signal });
  if (!before.ok) return before;
  if (Boolean(before.data?.suspended) === suspended) return { ok: true, code: "already", verified: true, data: before.data };
  const sent = await wrap(() => request(ref, { method: "POST", path: `/api/application/servers/${Number(id)}/${suspended ? "suspend" : "unsuspend"}`, signal }));
  if (!sent.ok) return sent;
  const after = await getServer(ref, id, { signal });
  return after.ok && Boolean(after.data?.suspended) === suspended ? { ok: true, code: "done", verified: true, data: after.data } : { ok: true, code: "sent-unverified", verified: false };
}

/**
 * واجهة بشكل axios للبلوقنات القديمة: client.get(path) ⇒ {data} — نفس منطقها، النقل الآن محروس وموحّد.
 * المسار نسبي للنطاق (/api/application/...). الأخطاء PanelError برمز مفهوم بدل استثناء axios.
 */
function legacyClient(refOrConfig) {
  // البلوقنات القديمة تحمل كائن الإعداد نفسه (config.pterodactyl.serverN) ⇒ رقم الخانة
  const ref = refOrConfig && typeof refOrConfig === "object"
    ? SLOTS.find((slot) => config.pterodactyl?.[`server${slot}`] === refOrConfig) || null
    : refOrConfig;
  const call = (method) => async (path, bodyOrNull = null) => {
    const { status, data } = await request(ref, { method, path: String(path).split("?")[0], query: Object.fromEntries(new URL(String(path), "http://x").searchParams), body: bodyOrNull && typeof bodyOrNull === "object" ? bodyOrNull : null });
    return { status, data };
  };
  /** حذف ثم قراءة: يجب أن تعود not-found وإلا PanelError("not-applied") — لا «تم الحذف» بلا دليل */
  const deleteVerified = async (path) => {
    const out = await call("DELETE")(path);
    try {
      await call("GET")(path);
    } catch (error) {
      if (error?.code === "not-found") return out;
      throw error;
    }
    throw new PanelError("not-applied");
  };
  return { get: call("GET"), post: call("POST"), patch: call("PATCH"), put: call("PUT"), delete: call("DELETE"), deleteVerified };
}

export { deleteServer, deleteUser, getServer, getUser, legacyClient, listAdminPanels, listLocations, listNodes, listServers, listUsers, panelOf, setSuspended, slotOf };
export default { listAdminPanels, panelOf, listUsers, listServers, listNodes, listLocations, getUser, getServer, deleteServer, deleteUser, setSuspended, legacyClient };
