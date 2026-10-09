// ═══════════════════════════════════════════════
// ☁️ Terboo VPS — خدمة المالك
// ───────────────────────────────────────────────
// المالك وحده: يرى كل VPS الحساب · يتحقق من VPS عند المزوّد قبل منحه · يمنح/يسحب/يعلّق/يستعيد
// · يحدد الانتهاء والميزات والحدود. لوحة الإدارة (4085) اختيارية ولا تُستعمل لحساب مستخدم عادي أبداً.
// ═══════════════════════════════════════════════

import { callVirtualizor } from "./virtualizor-client.js";
import { layerSettings, publicSummary } from "./virtualizor-config.js";
import * as entitlements from "./virtualizor-entitlements.js";
import { normalizeList } from "./virtualizor-normalizer.js";

const fail = (code, extra = {}) => ({ ok: false, code, ...extra });

/** حالة الطبقتين (بلا أسرار) */
function status() {
  return { enduser: publicSummary(layerSettings("enduser")), admin: publicSummary(layerSettings("admin")) };
}

/** كل VPS في حساب المستخدم النهائي المضبوط + من يملك كلاً منها */
async function accountVps({ signal = null } = {}) {
  try {
    const list = normalizeList(await callVirtualizor(layerSettings("enduser"), { act: "listvs", signal }));
    return { ok: true, code: "ok", data: list.map((vps) => ({ ...vps, holder: entitlements.holderOf(vps.vpsId) })) };
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail(error?.code || "error");
  }
}

/** يتحقق من وجود VPS في الحساب عند المزوّد (لا منح لـVPS غير موجود) */
async function verifyVps(vpsId, { signal = null } = {}) {
  const id = String(vpsId || "").trim();
  if (!/^\d{1,10}$/.test(id)) return fail("vps-id-invalid");
  const listed = await accountVps({ signal });
  if (!listed.ok) return listed;
  const vps = listed.data.find((v) => v.vpsId === id);
  return vps ? { ok: true, code: "ok", data: vps } : fail("vps-not-found");
}

/**
 * إسناد VPS لمشترٍ: تحقق عند المزوّد ← منح صلاحية مرتبطة بهويته.
 * @param {{by:string, user:string|Object, vpsId:string, planId?:string, expiresAt?:string|null, features?:string[], notes?:string}} input
 */
async function assign({ by, user, vpsId, planId = "", expiresAt = null, features = [], notes = "", signal = null }) {
  const verified = await verifyVps(vpsId, { signal });
  if (!verified.ok) return verified;
  try {
    const entry = entitlements.grant({ user, vpsId, by, planId, expiresAt, features, notes, verified: true });
    return { ok: true, code: "granted", data: entry };
  } catch (error) {
    return fail(error?.code || "error");
  }
}

/** عمليات الصلاحيات المباشرة (المستدعي يتحقق أن الطالب هو المالك) */
function control(action, entitlementId, by, extra = {}) {
  try {
    switch (action) {
      case "revoke": return { ok: true, code: "revoked", data: entitlements.revoke(entitlementId, by, extra.reason) };
      case "suspend": return { ok: true, code: "suspended", data: entitlements.suspend(entitlementId, by, extra.reason) };
      case "restore": return { ok: true, code: "restored", data: entitlements.restore(entitlementId, by, { expiresAt: extra.expiresAt }) };
      case "unassign": return { ok: true, code: "unassigned", data: entitlements.unassign(entitlementId, by) };
      case "expiry": return { ok: true, code: "expiry-set", data: entitlements.setExpiry(entitlementId, extra.expiresAt, by) };
      case "features": return { ok: true, code: "features-set", data: entitlements.setFeatures(entitlementId, extra, by) };
      case "limits": return { ok: true, code: "limits-set", data: entitlements.setLimits(entitlementId, extra.limits, by) };
      default: return fail("unknown-action");
    }
  } catch (error) {
    return fail(error?.code || error?.message || "error");
  }
}

/** لوحة الإدارة (4085) — قائمة كل VPS السيرفر (إن فُعّلت بمفاتيحها) */
async function adminList({ signal = null } = {}) {
  const s = layerSettings("admin");
  if (!s.enabled) return fail("admin-disabled");
  try {
    return { ok: true, code: "ok", data: normalizeList(await callVirtualizor(s, { act: "vs", signal })) };
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail(error?.code || "error");
  }
}

// ═══════════════════════════════════════════════
// لوحة الإدارة (4085) — المالك فقط، طلبات موثّقة في Virtualizor Admin API، وتحقق بقراءة بعد كل إجراء
//   info: act=vs&vpsid · power: act=vs&action=<start|stop|restart|poweroff>&vpsid · suspend/unsuspend: act=vs&<suspend|unsuspend>=<vpsid>
//   users: act=users. الإجراءات لا تُعاد تلقائياً (لا تكرار)؛ النجاح = الحالة الجديدة ظهرت فعلاً.
// ═══════════════════════════════════════════════

const VPS_ID = /^\d{1,10}$/;
const ADMIN_POWER = Object.freeze({ start: "running", stop: "stopped", restart: "running", poweroff: "stopped" });

function adminSettings() {
  const s = layerSettings("admin");
  return s.enabled ? s : null;
}

/** VPS واحد من لوحة الإدارة (قراءة حديثة) */
async function adminInfo(vpsId, { signal = null } = {}) {
  const s = adminSettings();
  if (!s) return fail("admin-disabled");
  const id = String(vpsId || "").trim();
  if (!VPS_ID.test(id)) return fail("vps-id-invalid");
  try {
    const list = normalizeList(await callVirtualizor(s, { act: "vs", query: { vpsid: id }, signal }));
    const vps = list.find((v) => v.vpsId === id);
    return vps ? { ok: true, code: "ok", data: { ...vps, holder: entitlements.holderOf(id) } } : fail("vps-not-found");
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail(error?.code || "error");
  }
}

/** ينتظر حالة متوقعة بقراءات متباعدة قليلة (تشغيل/إيقاف يأخذ ثوانٍ) — لا ادعاء قبل ظهورها */
async function awaitState(vpsId, predicate, { signal = null, attempts = 4, gapMs = 1500 } = {}) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    if (i) await new Promise((resolve) => setTimeout(resolve, gapMs));
    last = await adminInfo(vpsId, { signal });
    if (last.ok && predicate(last.data)) return { verified: true, data: last.data };
  }
  return { verified: false, data: last?.data || null };
}

/**
 * تشغيل/إيقاف/إعادة/فصل VPS من لوحة الإدارة. المستدعي: مالك + تأكيد للإيقاف/الفصل (محرّك الصلاحيات).
 * @returns {Promise<{ok:boolean, code:string, verified?:boolean, data?:Object}>}
 */
async function adminPower(vpsId, action, { signal = null, verify = {} } = {}) {
  const s = adminSettings();
  if (!s) return fail("admin-disabled");
  if (!ADMIN_POWER[action]) return fail("unknown-action");
  const before = await adminInfo(vpsId, { signal });
  if (!before.ok) return before;
  if (action !== "restart" && before.data.status === ADMIN_POWER[action]) return { ok: true, code: "already", verified: true, data: before.data };
  try {
    await callVirtualizor(s, { act: "vs", query: { action, vpsid: before.data.vpsId }, signal, idempotent: false });
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail(error?.code || "error");
  }
  const after = await awaitState(before.data.vpsId, (vps) => vps.status === ADMIN_POWER[action], { signal, ...verify });
  return { ok: true, code: after.verified ? "done" : "sent-unverified", verified: after.verified, data: after.data };
}

/** تعليق/إلغاء تعليق الخدمة عند المزوّد (يختلف عن تعليق صلاحية المشتري داخل البوت) */
async function adminSuspend(vpsId, suspend = true, { signal = null, verify = {} } = {}) {
  const s = adminSettings();
  if (!s) return fail("admin-disabled");
  const before = await adminInfo(vpsId, { signal });
  if (!before.ok) return before;
  const isSuspended = (vps) => vps.status === "suspended";
  if (isSuspended(before.data) === suspend) return { ok: true, code: "already", verified: true, data: before.data };
  try {
    await callVirtualizor(s, { act: "vs", query: { [suspend ? "suspend" : "unsuspend"]: before.data.vpsId }, signal, idempotent: false });
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail(error?.code || "error");
  }
  const after = await awaitState(before.data.vpsId, (vps) => isSuspended(vps) === suspend, { signal, ...verify });
  return { ok: true, code: after.verified ? "done" : "sent-unverified", verified: after.verified, data: after.data };
}

/** مستخدمو لوحة الإدارة (المعرّف والبريد فقط — بلا أي بيانات حساسة) */
async function adminUsers({ signal = null } = {}) {
  const s = adminSettings();
  if (!s) return fail("admin-disabled");
  try {
    const json = await callVirtualizor(s, { act: "users", signal });
    const rows = Object.values(json.users || {}).map((u) => ({ uid: String(u.uid ?? ""), email: String(u.email || ""), vps: Number(u.num_vs ?? u.vps ?? 0) || 0 })).filter((u) => u.uid);
    return { ok: true, code: "ok", data: rows };
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail(error?.code || "error");
  }
}

/** سجل الإسناد (للوحة المالك): قراءة فقط — التعديل عبر control() */
const list = (filter) => entitlements.list(filter);
const inspect = (user) => entitlements.inspect(user);

export { accountVps, adminInfo, adminList, adminPower, adminSuspend, adminUsers, assign, control, inspect, list, status, verifyVps };
export default { status, accountVps, verifyVps, assign, control, adminList, adminInfo, adminPower, adminSuspend, adminUsers, inspect, list };
