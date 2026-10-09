// ═══════════════════════════════════════════════
// ☁️ Terboo VPS — إنشاء VPS حقيقي عبر Virtualizor (V6 §21 §22)
// ───────────────────────────────────────────────
// المالك وحده (أو مسار موافقة المالك) — الذكاء/الموقع/واتساب يمرّرون toolId + مدخلات منظمة فقط،
// والطلب الفعلي يُبنى هنا داخل المزوّد:
//
//   plan ← تحقق الإعداد والصلاحية ← تحقق المدخلات (باقة · اسم مضيف · نظام · مشترٍ)
//   ← Preflight (صحة المزوّد · العقدة · عدم تكرار اسم المضيف) ← تأكيد ← مهمة
//   ← Virtualizor Admin API (act=addvs على 4085) ← متابعة بقراءات حقيقية متباعدة (لا sleep أعمى)
//   ← تحقق ظهور الـVPS بحالته ← ربط الملكية (صلاحية المشتري) ← تسليم آمن ← تدقيق
//
// الأمان:
//   • مفتاح idempotency لكل طلب + منع الطلب المكرر لنفس اسم المضيف/المفتاح.
//   • كلمة مرور root تُولَّد بالتشفير، تُسجَّل للإخفاء فوراً، لا تُخزَّن ولا تُسجَّل ولا تُرسل لمجموعة.
//     التسليم الافتراضي: المشتري يضبط كلمة مروره بنفسه من لوحته (إدخال سري في الخاص).
//   • «created» لا يُعلن قبل التحقق. نجاح جزئي (أُنشئ ثم فشل الربط/التحقق النهائي) ⇒ تنظيف
//     للـVPS الذي أنشأه هذا الطلب فقط إن كانت سياسة المالك rollbackOnFailure، وإلا needs-attention.
//   • بعد إعادة تشغيل البوت: طلب كان «provisioning» بلا رقم VPS لا يُعاد إنشاؤه أبداً (needs-attention).
//   • طبقة Cloud (4083 act=create) غير مفعّلة هنا: لا تُخمَّن معاملاتها — رفض صريح.
//
// الإعداد (config.virtualizor.provisioning — غير API):
//   enabled · layer("admin") · virt("kvm") · serverId · uid · planMap{planId: plid} · osids[]
//   · hostnameSuffix · verifyTimeoutMs · pollMs · rollbackOnFailure · credentialDelivery
// ═══════════════════════════════════════════════

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import config from "../../../../config.js";
import { noteFailure } from "../../terboo-failure-log.js";
import { registerSecret } from "../../terboo-secrets.js";
import { appendAuditEvent } from "../../terboo-agent-audit.js";
import { planById } from "../../terboo-vps-plans.js";
import { callVirtualizor } from "./virtualizor-client.js";
import { layerSettings } from "./virtualizor-config.js";
import * as entitlements from "./virtualizor-entitlements.js";
import { normalizeList } from "./virtualizor-normalizer.js";

const STATUS = Object.freeze({
  PLANNED: "planned", PROVISIONING: "provisioning", CREATED: "created-unverified", VERIFIED: "verified",
  COMPLETED: "completed", FAILED: "failed", CANCELLED: "cancelled", ATTENTION: "needs-attention", ROLLED_BACK: "rolled-back",
});
const ACTIVE = new Set([STATUS.PLANNED, STATUS.PROVISIONING, STATUS.CREATED, STATUS.VERIFIED]);
const fail = (code, extra = {}) => ({ ok: false, code, ...extra });

// ═══════════════════════════════════════════════
// الإعداد
// ═══════════════════════════════════════════════

function settings() {
  const raw = config.virtualizor?.provisioning || {};
  const num = (v, d, min, max) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : d);
  return {
    enabled: raw.enabled === true,
    layer: String(raw.layer || "admin"),
    virt: String(raw.virt || "kvm"),
    serverId: raw.serverId === undefined || raw.serverId === "" ? null : String(raw.serverId),
    uid: String(raw.uid ?? "").trim(),
    planMap: raw.planMap && typeof raw.planMap === "object" ? raw.planMap : {},
    osids: Array.isArray(raw.osids) ? raw.osids.map(String) : [],
    hostnameSuffix: String(raw.hostnameSuffix || "").trim().toLowerCase(),
    verifyTimeoutMs: num(raw.verifyTimeoutMs, 10 * 60_000, 1_000, 60 * 60_000),
    pollMs: num(raw.pollMs, 10_000, 50, 120_000),
    rollbackOnFailure: raw.rollbackOnFailure !== false,
    credentialDelivery: raw.credentialDelivery === "private-once" ? "private-once" : "set-password",
  };
}

/** حالة الإعداد للمالك (بلا أسرار) — ما الناقص قبل التفعيل */
function readiness() {
  const s = settings();
  const admin = layerSettings("admin");
  const missing = [];
  if (!s.enabled) missing.push("provisioning.enabled");
  if (s.layer !== "admin") missing.push("provisioning.layer=admin");
  if (!admin.enabled) missing.push("virtualizor.admin (url/apiKey/apiPassword/enabled)");
  if (!/^\d+$/.test(s.uid)) missing.push("provisioning.uid");
  if (s.serverId === null || !/^\d+$/.test(s.serverId)) missing.push("provisioning.serverId");
  return { ready: missing.length === 0, missing, layer: s.layer, virt: s.virt, delivery: s.credentialDelivery, rollback: s.rollbackOnFailure, mappedPlans: Object.keys(s.planMap) };
}

// ═══════════════════════════════════════════════
// سجل الطلبات (ذري: ملف مؤقت ثم rename)
// ═══════════════════════════════════════════════

function storeFile() {
  return process.env.TERBOO_VPS_ORDERS || path.join(process.cwd(), "data", "vps", "provision-orders.json");
}
function load() {
  try {
    const file = storeFile();
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { orders: [] };
  } catch (error) {
    noteFailure("vps-provision", error, { where: "virtualizor-provisioner:load", fallback: "empty" });
    return { orders: [] };
  }
}
function save(state) {
  const file = storeFile();
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 1)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}
function update(id, patch) {
  const state = load();
  const order = state.orders.find((o) => o.id === id);
  if (!order) return null;
  Object.assign(order, patch, { updatedAt: new Date().toISOString() });
  order.history = [...(order.history || []), { at: order.updatedAt, status: order.status, note: patch.note || "" }].slice(-40);
  save(state);
  return order;
}
const getOrder = (id) => load().orders.find((o) => o.id === id) || null;
const listOrders = ({ status = null } = {}) => load().orders.filter((o) => !status || o.status === status);

function audit(type, order, status, extra = {}) {
  try {
    appendAuditEvent({ type, tool: "vps.create", actor: order.by, status, input: { orderId: order.id, planId: order.planId, hostname: order.hostname, buyer: order.buyer?.canonical || "" }, output: { vpsId: order.vpsId || "", status: order.status }, metadata: extra });
  } catch (error) {
    noteFailure("vps-provision", error, { where: "virtualizor-provisioner:audit", stage: type });
  }
}

// ═══════════════════════════════════════════════
// التحقق من المدخلات
// ═══════════════════════════════════════════════

const HOSTNAME = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*$/;

function normalizeHostname(raw, s = settings()) {
  let host = String(raw || "").trim().toLowerCase().replace(/\.+$/, "");
  if (host && s.hostnameSuffix && !host.includes(".")) host = `${host}.${s.hostnameSuffix.replace(/^\./, "")}`;
  return host;
}

/**
 * @param {{planId:string, hostname:string, osid:string|number, buyer:Object}} input
 * @returns {string[]} رموز الأخطاء (فارغة = صالح)
 */
function validate({ planId, hostname, osid, buyer }, s = settings()) {
  const errors = [];
  const plan = planById(planId);
  if (!plan) errors.push("plan-unknown");
  else if (plan.tier === "economy" && config.virtualizor?.plans?.economyEnabled !== true) errors.push("plan-not-offered");
  if (!HOSTNAME.test(hostname || "")) errors.push("hostname-invalid");
  if (!/^\d{1,6}$/.test(String(osid ?? ""))) errors.push("os-invalid");
  else if (s.osids.length && !s.osids.includes(String(osid))) errors.push("os-not-allowed");
  if (!buyer?.canonical) errors.push("buyer-invalid");
  if (plan) {
    const ok = [plan.cpu, plan.ramGb, plan.diskGb, plan.bandwidthGb, plan.ipv4].every((n) => Number.isFinite(n) && n > 0);
    if (!ok) errors.push("plan-resources-invalid");
  }
  return errors;
}

// ═══════════════════════════════════════════════
// Preflight: صحة المزوّد · العقدة · اسم المضيف غير مستعمل
// ═══════════════════════════════════════════════

async function preflight({ hostname, signal = null } = {}) {
  const s = settings();
  const ready = readiness();
  if (!ready.ready) return fail("not-configured", { missing: ready.missing });
  const admin = layerSettings("admin");
  let all;
  try {
    all = normalizeList(await callVirtualizor(admin, { act: "vs", signal }));
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail("provider-unhealthy", { reason: error?.code || "error" });
  }
  try {
    const json = await callVirtualizor(admin, { act: "servers", signal });
    const servers = json?.servers && typeof json.servers === "object" ? Object.entries(json.servers) : [];
    const found = servers.some(([key, srv]) => String(srv?.serid ?? key) === s.serverId);
    if (!found) return fail("node-not-found");
  } catch (error) {
    if (error?.code === "aborted") throw error;
    return fail("node-unverified", { reason: error?.code || "error" });
  }
  if (hostname && all.some((vps) => String(vps.hostname || "").toLowerCase() === hostname)) return fail("hostname-taken");
  return { ok: true, code: "ok", data: { existing: all.length } };
}

// ═══════════════════════════════════════════════
// التخطيط (بلا أي إنشاء) ⇒ طلب ينتظر التأكيد
// ═══════════════════════════════════════════════

/**
 * @param {{by:string, buyer:Object, planId:string, osid:string|number, hostname:string, days?:number, idempotencyKey?:string, channel?:string}} input
 *   buyer: هوية المشتري (identityOf أو telegramIdentity) — by: هوية المالك القانونية
 */
async function planOrder({ by, buyer, planId, osid, hostname, days = 30, idempotencyKey = "", channel = "whatsapp", signal = null }) {
  const s = settings();
  if (s.layer !== "admin") return fail("provider-layer-unsupported");
  const host = normalizeHostname(hostname, s);
  const errors = validate({ planId, hostname: host, osid, buyer }, s);
  if (errors.length) return fail(errors[0], { errors });
  const key = String(idempotencyKey || crypto.createHash("sha256").update([by, buyer.canonical, planId, host].join("|")).digest("hex").slice(0, 32));
  const state = load();
  const same = state.orders.find((o) => o.key === key && o.status !== STATUS.FAILED && o.status !== STATUS.CANCELLED && o.status !== STATUS.ROLLED_BACK);
  if (same) return { ok: true, code: "duplicate", data: same };
  if (state.orders.some((o) => ACTIVE.has(o.status) && o.hostname === host)) return fail("hostname-in-progress");
  const checked = await preflight({ hostname: host, signal });
  if (!checked.ok) return checked;
  const plan = planById(planId);
  const order = {
    id: `VPSO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
    key, by, channel,
    buyer: { canonical: buyer.canonical, jid: buyer.jid || "", pn: buyer.pn || "", lid: buyer.lid || "", tg: buyer.tg || "" },
    planId, plan: { cpu: plan.cpu, ramGb: plan.ramGb, diskGb: plan.diskGb, bandwidthGb: plan.bandwidthGb, ipv4: plan.ipv4 },
    plid: s.planMap[planId] !== undefined ? String(s.planMap[planId]) : "",
    osid: String(osid), hostname: host, days: Math.max(0, Math.min(3650, Number(days) || 0)),
    status: STATUS.PLANNED, vpsId: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [],
  };
  state.orders.push(order);
  save(state);
  audit("vps.provision.planned", order, "planned");
  return { ok: true, code: "planned", data: order };
}

function cancelOrder(id, by) {
  const order = getOrder(id);
  if (!order) return fail("order-not-found");
  if (order.status !== STATUS.PLANNED) return fail("order-not-cancellable");
  const out = update(id, { status: STATUS.CANCELLED, note: `cancelled-by:${by}` });
  audit("vps.provision.cancelled", out, "cancelled");
  return { ok: true, code: "cancelled", data: out };
}

// ═══════════════════════════════════════════════
// التنفيذ
// ═══════════════════════════════════════════════

/** كلمة مرور root قوية (تُسجَّل للإخفاء قبل أي استعمال) */
function rootPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(24);
  const pass = `${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}!9`;
  registerSecret(pass);
  return pass;
}

/** رقم الـVPS من رد addvs بأشكاله الموثّقة المختلفة بين الإصدارات (التحقق الحقيقي بعده بالقراءة) */
function vpsIdFromResponse(json) {
  const candidates = [json?.done?.vpsid, json?.newvs?.vpsid, json?.vs_info?.vpsid, json?.vpsid, json?.done?.vps?.vpsid];
  const hit = candidates.find((v) => /^\d{1,10}$/.test(String(v ?? "")));
  return hit ? String(hit) : "";
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener?.("abort", () => { clearTimeout(timer); reject(Object.assign(new Error("aborted"), { code: "aborted" })); }, { once: true });
});

/** يبحث عن VPS الطلب (بالرقم أو باسم المضيف) في لوحة الإدارة */
async function findCreated(order, signal) {
  const admin = layerSettings("admin");
  const list = normalizeList(await callVirtualizor(admin, { act: "vs", ...(order.vpsId ? { query: { vpsid: order.vpsId } } : {}), signal }));
  return list.find((v) => (order.vpsId ? v.vpsId === order.vpsId : String(v.hostname || "").toLowerCase() === order.hostname)) || null;
}

/** متابعة حتى يظهر الـVPS بحالة نهائية (running/stopped) — قراءات حقيقية بفاصل متزايد حتى المهلة */
async function verifyCreated(order, { signal, onProgress }) {
  const s = settings();
  const deadline = Date.now() + s.verifyTimeoutMs;
  let gap = s.pollMs;
  let last = null;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw Object.assign(new Error("aborted"), { code: "aborted" });
    try {
      last = await findCreated(order, signal);
    } catch (error) {
      if (error?.code === "aborted") throw error;
      noteFailure("vps-provision", error, { where: "virtualizor-provisioner:verify", stage: "read", fallback: "retry" });
    }
    if (last?.vpsId && !order.vpsId) order = update(order.id, { vpsId: last.vpsId, note: "vpsid-from-lookup" });
    if (last && ["running", "stopped"].includes(last.status)) return { verified: true, vps: last, order };
    if (last?.status === "error" || last?.status === "failed") return { verified: false, failed: true, vps: last, order };
    onProgress?.(60, last ? `state:${last.status || "creating"}` : "waiting-provider");
    await sleep(gap, signal);
    gap = Math.min(gap * 1.5, 60_000);
  }
  return { verified: false, timeout: true, vps: last, order };
}

/** تنظيف VPS أنشأه هذا الطلب فقط (act=vs&delete) ثم تحقق أنه اختفى */
async function rollback(order, reason, signal) {
  const s = settings();
  if (!order.vpsId || !s.rollbackOnFailure) {
    const out = update(order.id, { status: STATUS.ATTENTION, note: `manual-cleanup-needed:${reason}` });
    audit("vps.provision.attention", out, "needs-attention", { reason });
    return out;
  }
  try {
    await callVirtualizor(layerSettings("admin"), { act: "vs", query: { delete: order.vpsId }, signal, idempotent: false });
    const still = await findCreated(order, signal);
    const out = update(order.id, { status: still ? STATUS.ATTENTION : STATUS.ROLLED_BACK, note: still ? `rollback-unverified:${reason}` : `rolled-back:${reason}` });
    audit("vps.provision.rollback", out, out.status, { reason });
    return out;
  } catch (error) {
    if (error?.code === "aborted") throw error;
    const out = update(order.id, { status: STATUS.ATTENTION, note: `rollback-failed:${reason}:${error?.code || "error"}` });
    audit("vps.provision.rollback", out, "rollback-failed", { reason });
    return out;
  }
}

/**
 * ينفّذ طلباً مخططاً (بعد تأكيد المالك). آمن لإعادة الاستدعاء: لا يعيد الإنشاء أبداً لطلب تجاوز «planned».
 * @returns {Promise<{ok:boolean, code:string, data?:Object, credential?:{mode:string, rootPassword?:string}}>}
 */
async function execute(orderId, { by, signal = null, onProgress = null } = {}) {
  let order = getOrder(orderId);
  if (!order) return fail("order-not-found");
  if (by && order.by !== by) return fail("not-order-owner");
  if (order.status === STATUS.COMPLETED) return { ok: true, code: "already-completed", data: order };
  const s = settings();
  const ready = readiness();
  if (!ready.ready) return fail("not-configured", { missing: ready.missing });
  let rootPass = null;

  if (order.status === STATUS.PLANNED) {
    order = update(order.id, { status: STATUS.PROVISIONING, note: "addvs" });
    audit("vps.provision.started", order, "provisioning");
    onProgress?.(15, "addvs");
    rootPass = rootPassword();
    const post = {
      addvps: 1, virt: s.virt, uid: s.uid, serid: s.serverId, hostname: order.hostname, rootpass: rootPass, osid: order.osid,
      num_ips: order.plan.ipv4, cores: order.plan.cpu, ram: order.plan.ramGb * 1024, space: order.plan.diskGb, bandwidth: order.plan.bandwidthGb,
      ...(order.plid ? { plid: order.plid } : {}),
    };
    try {
      const json = await callVirtualizor(layerSettings("admin"), { act: "addvs", post, signal, idempotent: false });
      order = update(order.id, { status: STATUS.CREATED, vpsId: vpsIdFromResponse(json), note: "addvs-accepted" });
    } catch (error) {
      if (error?.code === "aborted") throw error;
      // رفض صريح من الواجهة (api-error/auth/http 4xx) ⇒ لم يُنشأ شيء: فشل
      // خطأ ملتبس (شبكة/مهلة/5xx/رد غير مفهوم) ⇒ ربما وصل الطلب: بحث باسم المضيف لنافذة قصيرة،
      // وإن لم يظهر ⇒ needs-attention (لا «فشل» ولا إعادة إنشاء — Preflight يمنع نفس الاسم لاحقاً)
      const rejected = ["api-error", "auth", "disabled", "invalid-request"].includes(error?.code) || (error?.code === "http" && error.status < 500);
      let maybe = null;
      if (!rejected) {
        for (let i = 0; i < 4 && !maybe; i += 1) {
          if (i) await sleep(s.pollMs, signal);
          maybe = await findCreated(order, signal).catch((readError) => {
            noteFailure("vps-provision", readError, { where: "virtualizor-provisioner:execute", stage: "post-error-lookup", fallback: "retry-read" });
            return null;
          });
        }
      }
      if (!maybe) {
        const status = rejected ? STATUS.FAILED : STATUS.ATTENTION;
        order = update(order.id, { status, note: `addvs-${rejected ? "rejected" : "unconfirmed"}:${error?.code || "error"}` });
        audit(rejected ? "vps.provision.failed" : "vps.provision.attention", order, status, { reason: error?.code || "error", apiErrors: error?.apiErrors || [] });
        return fail(rejected ? "provision-failed" : "needs-attention", { data: order, reason: error?.code || "error" });
      }
      order = update(order.id, { status: STATUS.CREATED, vpsId: maybe.vpsId, note: "found-after-error" });
    }
  } else if (order.status === STATUS.PROVISIONING) {
    // انقطع البوت أثناء الإرسال: لا نعرف إن وصل — لا إعادة إنشاء
    const maybe = await findCreated(order, signal).catch((readError) => {
      noteFailure("vps-provision", readError, { where: "virtualizor-provisioner:execute", stage: "resume-lookup", fallback: "needs-attention" });
      return null;
    });
    if (!maybe) {
      order = update(order.id, { status: STATUS.ATTENTION, note: "interrupted-before-confirmation" });
      audit("vps.provision.attention", order, "needs-attention", { reason: "interrupted" });
      return fail("needs-attention", { data: order });
    }
    order = update(order.id, { status: STATUS.CREATED, vpsId: maybe.vpsId, note: "resumed-found" });
  } else if (![STATUS.CREATED, STATUS.VERIFIED].includes(order.status)) {
    return fail("order-not-executable", { data: order });
  }

  if (order.status === STATUS.CREATED) {
    onProgress?.(40, "verify");
    const result = await verifyCreated(order, { signal, onProgress });
    order = result.order;
    if (!result.verified) {
      const reason = result.timeout ? "verify-timeout" : "provider-error-state";
      // مهلة = مجهول (قد يكتمل لاحقاً) ⇒ انتباه المالك بلا حذف؛ حالة خطأ مؤكدة ⇒ تنظيف ما أنشأناه
      const out = result.timeout
        ? update(order.id, { status: STATUS.ATTENTION, note: reason })
        : await rollback(order, reason, signal);
      audit("vps.provision.unverified", out, out.status, { reason });
      return fail(reason, { data: out });
    }
    order = update(order.id, { status: STATUS.VERIFIED, vpsId: result.vps.vpsId, note: `state:${result.vps.status}` });
  }

  onProgress?.(85, "entitlement");
  try {
    const expiresAt = order.days ? new Date(Date.now() + order.days * 86_400_000).toISOString() : null;
    const buyer = { ...order.buyer, input: order.buyer.jid || order.buyer.canonical };
    const existing = entitlements.holderOf(order.vpsId);
    if (existing && !entitlements.belongsTo(existing, buyer)) {
      // سجل قديم لنفس الرقم لمشترٍ آخر: تعارض يحسمه المالك — لا حذف لـVPS مسند لغيره
      const out = update(order.id, { status: STATUS.ATTENTION, note: "vps-id-held-by-another-buyer" });
      audit("vps.provision.attention", out, "needs-attention", { reason: "holder-conflict" });
      return fail("vps-already-assigned", { data: out });
    }
    if (!existing) entitlements.grant({ user: buyer, vpsId: order.vpsId, by: order.by, planId: order.planId, expiresAt, notes: `provisioned:${order.id}`, verified: true });
  } catch (error) {
    const out = await rollback(order, `entitlement-failed:${error?.code || "error"}`, signal);
    return fail("entitlement-failed", { data: out });
  }
  order = update(order.id, { status: STATUS.COMPLETED, note: "completed" });
  audit("vps.provision.completed", order, "completed");
  onProgress?.(100, "completed");
  const credential = s.credentialDelivery === "private-once" && rootPass ? { mode: "private-once", rootPassword: rootPass } : { mode: "set-password" };
  return { ok: true, code: "completed", data: order, credential };
}

function _resetProvisioner() {
  const file = storeFile();
  if (fs.existsSync(file)) fs.rmSync(file);
}

export { HOSTNAME, STATUS, _resetProvisioner, cancelOrder, execute, getOrder, listOrders, normalizeHostname, planOrder, preflight, readiness, settings, validate, vpsIdFromResponse };
export default { planOrder, execute, cancelOrder, getOrder, listOrders, readiness, preflight, STATUS };
