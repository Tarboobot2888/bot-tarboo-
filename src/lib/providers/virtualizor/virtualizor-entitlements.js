// ═══════════════════════════════════════════════
// ☁️ Terboo VPS Entitlement Manager — من يملك أي VPS
// ───────────────────────────────────────────────
// لا وصول لـVPS إلا بصلاحية يمنحها المالك. الصلاحية مربوطة بالهوية القانونية
// (pn:<رقم> أو lid:<معرّف> لواتساب · tg:<معرّف> لمستخدم تيليجرام) لا بالاسم ولا بنص يكتبه المستخدم،
// وكل VPS لمستخدم واحد فقط — مخزن واحد للمنصتين فلا يُسند VPS واحد لشخصين.
//
// الحالات: pending · active · suspended · expired · revoked
// عمليات المالك: grant · revoke · suspend · restore · inspect · assign/unassign · setExpiry
//                · setFeatures · setLimits
// التخزين: data/vps/entitlements.json (كتابة ذرية: ملف مؤقت ثم rename).
// ═══════════════════════════════════════════════

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { noteFailure } from "../../terboo-failure-log.js";
import { identityOf } from "../../terboo-identity.js";
import { userSafeActions } from "./virtualizor-capabilities.js";

const STATUSES = Object.freeze(["pending", "active", "suspended", "expired", "revoked"]);
const MAX_HISTORY = 50;

function storeFile() {
  return process.env.TERBOO_VPS_STORE || path.join(process.cwd(), "data", "vps", "entitlements.json");
}

let state = null;

function load() {
  if (state) return state;
  const file = storeFile();
  try {
    state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
  } catch (error) {
    // ملف تالف: لا نكتب فوقه (نحفظ نسخة) ونبدأ فارغاً حتى يراجعه المالك
    try {
      fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`);
    } catch (copyError) {
      noteFailure("vps-entitlements", copyError, { where: "virtualizor-entitlements:load", stage: "backup-corrupt-store", fallback: "start-empty" });
    }
    noteFailure("vps-entitlements", error, { where: "virtualizor-entitlements:load", stage: "parse-store", fallback: "start-empty" });
    state = null;
  }
  if (!state || typeof state !== "object" || typeof state.entitlements !== "object") state = { version: 1, entitlements: {} };
  return state;
}

function save() {
  const file = storeFile();
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/** هوية مستخدم تيليجرام بمعرّفه الرقمي (لا اسم مستخدم يمكن تغييره) */
function telegramIdentity(id) {
  const digits = String(id ?? "").replace(/^tg:/i, "").trim();
  return /^\d{1,20}$/.test(digits) ? { canonical: `tg:${digits}`, tg: digits, pn: "", lid: "", input: `tg:${digits}` } : null;
}

/** هوية من JID/رقم واتساب أو tg:<معرّف> ⇒ {canonical, pn, lid, tg?} */
function who(jidOrIdentity) {
  if (jidOrIdentity && typeof jidOrIdentity === "object" && jidOrIdentity.canonical) return jidOrIdentity;
  const raw = String(jidOrIdentity || "");
  if (/^tg:\d+$/i.test(raw)) return telegramIdentity(raw);
  return identityOf(raw);
}

/** هل الصلاحية لهذه الهوية؟ (canonical أو PN أو LID معروف — لا مطابقة جزئية للأرقام) */
function belongsTo(entry, identity) {
  if (!entry || !identity) return false;
  const keys = new Set([identity.canonical, identity.pn && `pn:${identity.pn.split("@")[0]}`, identity.lid && `lid:${identity.lid.split("@")[0]}`].filter(Boolean));
  return keys.has(entry.canonicalUserId) || (entry.pn && identity.pn && entry.pn === identity.pn) || (entry.lid && identity.lid && entry.lid === identity.lid)
    || Boolean(entry.tg && identity.tg && entry.tg === identity.tg);
}

/** انتهاء الصلاحية تلقائياً عند القراءة */
function refreshStatus(entry, now = Date.now()) {
  if (entry.status === "active" && entry.expiresAt && Date.parse(entry.expiresAt) <= now) {
    entry.status = "expired";
    pushHistory(entry, "system", "expired");
    save();
  }
  return entry;
}

function pushHistory(entry, by, action, details = "") {
  entry.history = [...(entry.history || []), { at: new Date().toISOString(), by: String(by || ""), action, ...(details ? { details: String(details).slice(0, 200) } : {}) }].slice(-MAX_HISTORY);
}

function clone(entry) {
  return entry ? JSON.parse(JSON.stringify(entry)) : null;
}

function validVpsId(vpsId) {
  const id = String(vpsId ?? "").trim();
  if (!/^\d{1,10}$/.test(id)) throw Object.assign(new Error("vps-id-invalid"), { code: "vps-id-invalid" });
  return id;
}

/**
 * يمنح صلاحية VPS لمستخدم (المالك فقط — التحقق من المالك عند المستدعي ومن المزوّد في owner-service).
 * @param {{user:string|Object, vpsId:string|number, by:string, planId?:string, expiresAt?:string|null, features?:string[], permissions?:string[], notes?:string, purchaseStatus?:string, verified?:boolean}} input
 */
function grant({ user, vpsId, by, planId = "", expiresAt = null, features = [], permissions = null, notes = "", purchaseStatus = "paid", verified = false }) {
  const id = validVpsId(vpsId);
  const identity = who(user);
  if (!identity?.canonical || !/^(pn|lid|tg):\d+$/.test(identity.canonical)) throw Object.assign(new Error("user-identity-invalid"), { code: "user-identity-invalid" });
  const store = load();
  const taken = Object.values(store.entitlements).find((e) => e.vpsId === id && ["active", "suspended", "pending"].includes(e.status) && !belongsTo(e, identity));
  if (taken) throw Object.assign(new Error("vps-already-assigned"), { code: "vps-already-assigned" });
  const existing = Object.values(store.entitlements).find((e) => e.vpsId === id && belongsTo(e, identity));
  const allowed = new Set(userSafeActions());
  const entry = existing || { id: crypto.randomUUID(), createdAt: new Date().toISOString(), createdBy: String(by || "") };
  Object.assign(entry, {
    canonicalUserId: identity.canonical,
    jid: identity.pn || identity.lid || identity.input,
    pn: identity.pn || entry.pn || "",
    lid: identity.lid || entry.lid || "",
    tg: identity.tg || entry.tg || "",
    platform: identity.tg ? "telegram" : "whatsapp",
    vpsId: id,
    status: "active",
    planId: String(planId || ""),
    purchaseStatus: String(purchaseStatus || "paid"),
    enabledAt: new Date().toISOString(),
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    features: [...new Set((features || []).map(String))],
    permissions: (permissions || [...allowed]).filter((p) => allowed.has(p)),
    lastVerified: verified ? new Date().toISOString() : entry.lastVerified || null,
    notes: String(notes || "").slice(0, 500),
    limits: entry.limits || {},
  });
  pushHistory(entry, by, existing ? "regrant" : "grant", `vps ${id}`);
  store.entitlements[entry.id] = entry;
  save();
  return clone(entry);
}

function findOrThrow(entitlementId) {
  const entry = load().entitlements[entitlementId];
  if (!entry) throw Object.assign(new Error("entitlement-not-found"), { code: "entitlement-not-found" });
  return entry;
}

function setStatus(entitlementId, status, by, details = "") {
  if (!STATUSES.includes(status)) throw new Error("bad-status");
  const entry = findOrThrow(entitlementId);
  entry.status = status;
  pushHistory(entry, by, status, details);
  save();
  return clone(entry);
}

/** سحب الصلاحية: يفقد المستخدم الوصول فوراً */
const revoke = (entitlementId, by, reason = "") => setStatus(entitlementId, "revoked", by, reason);
/** تعليق مؤقت */
const suspend = (entitlementId, by, reason = "") => setStatus(entitlementId, "suspended", by, reason);
/** استعادة صلاحية معلّقة/منتهية (مع تمديد اختياري) */
function restore(entitlementId, by, { expiresAt = undefined } = {}) {
  const entry = findOrThrow(entitlementId);
  if (expiresAt !== undefined) entry.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
  if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) throw Object.assign(new Error("expiry-in-past"), { code: "expiry-in-past" });
  return setStatus(entitlementId, "active", by, "restore");
}
/** فك ارتباط VPS (الصلاحية تُسحب ويبقى سجلها) */
const unassign = (entitlementId, by) => setStatus(entitlementId, "revoked", by, "unassign");

function setExpiry(entitlementId, expiresAt, by) {
  const entry = findOrThrow(entitlementId);
  entry.expiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
  pushHistory(entry, by, "set-expiry", entry.expiresAt || "none");
  save();
  return clone(refreshStatus(entry));
}

function setFeatures(entitlementId, { enable = [], disable = [] }, by) {
  const entry = findOrThrow(entitlementId);
  const allowed = new Set(userSafeActions());
  const perms = new Set(entry.permissions || []);
  for (const p of enable) if (allowed.has(p)) perms.add(p);
  for (const p of disable) perms.delete(p);
  entry.permissions = [...perms];
  pushHistory(entry, by, "set-features", `+${enable.join(",")} -${disable.join(",")}`);
  save();
  return clone(entry);
}

function setLimits(entitlementId, limits, by) {
  const entry = findOrThrow(entitlementId);
  const clean = {};
  for (const [key, value] of Object.entries(limits || {})) if (/^[a-z][\w.]{0,40}$/i.test(key) && Number.isFinite(Number(value))) clean[key] = Number(value);
  entry.limits = { ...(entry.limits || {}), ...clean };
  pushHistory(entry, by, "set-limits", JSON.stringify(clean));
  save();
  return clone(entry);
}

function markVerified(entitlementId) {
  const entry = load().entitlements[entitlementId];
  if (!entry) return;
  entry.lastVerified = new Date().toISOString();
  save();
}

/** كل صلاحيات مستخدم (للمالك: inspect) */
function inspect(user) {
  const identity = who(user);
  return Object.values(load().entitlements).filter((e) => belongsTo(e, identity)).map((e) => clone(refreshStatus(e)));
}

/** الصلاحيات الفعّالة لمستخدم — وحدها تفتح واجهة التحكم */
function activeFor(user) {
  return inspect(user).filter((e) => e.status === "active");
}

/** صلاحية فعّالة لهذا المستخدم على هذا الـVPS تحديداً (وإلا null) */
function entitlementFor(user, vpsId) {
  const id = String(vpsId ?? "").trim();
  if (!/^\d{1,10}$/.test(id)) return null;
  return activeFor(user).find((e) => e.vpsId === id) || null;
}

/** كل الصلاحيات (للمالك) */
function list({ status = null } = {}) {
  return Object.values(load().entitlements).map((e) => clone(refreshStatus(e))).filter((e) => !status || e.status === status);
}

/** من يملك هذا الـVPS (للمالك) */
function holderOf(vpsId) {
  const id = String(vpsId);
  return list().find((e) => e.vpsId === id && ["active", "suspended", "pending"].includes(e.status)) || null;
}

function _resetEntitlements() {
  state = null;
}

export { STATUSES, _resetEntitlements, activeFor, telegramIdentity, belongsTo, entitlementFor, grant, holderOf, inspect, list, markVerified, restore, revoke, setExpiry, setFeatures, setLimits, suspend, unassign };
export default { grant, revoke, suspend, restore, unassign, inspect, activeFor, entitlementFor, list, holderOf, setExpiry, setFeatures, setLimits, markVerified, STATUSES };
