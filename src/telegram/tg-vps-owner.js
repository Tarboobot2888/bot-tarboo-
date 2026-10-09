// ═══════════════════════════════════════════════
// ✈️ Terboo VPS على تيليجرام — مركز المالك (نفس إدارة_VPS.js على واتساب)
// ───────────────────────────────────────────────
// للمالك فقط (معرّفات تيليجرام في config.telegram.vps.ownerIds). نفس خدمة المالك ونفس سجل الإسناد:
//   · الإسناد بمعرّف تيليجرام الرقمي: معالج (سيرفر متاح ← المعرّف ← الباقة ← المدة ← تأكيد) أو /assign
//   · سيرفرات الحساب (الكل/المتاح) وبطاقة كل VPS · المشترون بالحالة · ينتهي خلال 7 أيام · بحث
//   · بطاقة الإسناد: تعليق/استعادة/سحب/فك/انتهاء/حدود/ميزات/إعادة إشعار — الخطِر بتأكيد لمرة واحدة
//   · لوحة Virtualizor الإدارية (إن فُعّلت): حالة · تشغيل/إيقاف · تعليق عند المزوّد · مستخدمو اللوحة
// مشترو واتساب يظهرون هنا أيضاً (مخزن واحد) — لا يُسند VPS واحد لشخصين على المنصتين.
// ═══════════════════════════════════════════════

import { errorText } from "../lib/terboo-cloud-ui.js";
import { noteFailure } from "../lib/terboo-failure-log.js";
import { userSafeActions } from "../lib/providers/virtualizor/virtualizor-capabilities.js";
import * as owner from "../lib/providers/virtualizor/virtualizor-owner-service.js";
import { planById, plans as vpsPlans, specLine } from "../lib/terboo-vps-plans.js";
import { button, card, code, keyboard, row, startInput, t, userLabel } from "./tg-ui.js";

const STATUS_ICONS = { active: "🟢", pending: "🟡", suspended: "⏸️", expired: "⌛", revoked: "⛔" };
const WEEK = 7 * 86_400_000;
const DURATIONS = ["7", "30", "90", "365", "0"];
const short = (action) => action.replace(/^vps\./, "").replace(/\./g, "_");
const dateOf = (iso) => (iso ? String(iso).slice(0, 10) : "-");
const expiringSoon = (all, now = Date.now()) => all.filter((e) => e.status === "active" && e.expiresAt && Date.parse(e.expiresAt) - now <= WEEK);
const tgIdOf = (value) => {
  const digits = String(value ?? "").replace(/^tg:/i, "").trim();
  return /^\d{4,20}$/.test(digits) ? digits : "";
};

/** مشترٍ للعرض: ✈️ اسم/معرّف تيليجرام · 📱 رقم واتساب */
function buyerOf(e) {
  if (e.tg) return `✈️ ${userLabel(e.tg)} · ${e.tg}`;
  if (e.pn) return `📱 +${String(e.pn).split("@")[0]}`;
  return e.jid || e.canonicalUserId;
}

const by = (ctx) => `tg:${ctx.userId}`;
const err = (ctx, codeName) => ctx.show({ text: card({ icon: "⚠️", title: t(ctx.lang, "vpsAdmin.title"), blocks: [errorText(ctx.lang, codeName)] }), keyboard: keyboard([[homeBtn(ctx)]]), fresh: true });
const homeBtn = (ctx) => button(ctx.userId, `🏠 ${t(ctx.lang, "vpsAdmin.btnHome")}`, { s: "o.home" });
const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/** مدة بالأيام أو تاريخ YYYY-MM-DD أو 0 ⇒ ISO أو null أو undefined (غير صالح) */
function parseExpiry(value) {
  const text = String(value ?? "").trim();
  if (text === "0" || /^(none|never|بدون|لا)$/i.test(text)) return null;
  if (/^\d{1,4}$/.test(text)) return new Date(Date.now() + Number(text) * 86_400_000).toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text))) return new Date(`${text}T23:59:59Z`).toISOString();
  return undefined;
}

// ═══════════════════════════════════════════════
// الشاشات
// ═══════════════════════════════════════════════

function home(ctx) {
  const { lang } = ctx;
  const status = owner.status();
  const all = owner.list();
  const counts = Object.fromEntries(Object.keys(STATUS_ICONS).map((s) => [s, all.filter((e) => e.status === s).length]));
  const soon = expiringSoon(all);
  const b = (text, payload) => button(ctx.userId, text, payload);
  return ctx.show({
    text: card({
      icon: "👑",
      title: t(lang, "vpsAdmin.title"),
      blocks: [
        [
          row(t(lang, "vpsAdmin.userLayer"), status.enduser.enabled ? `🟢 ${t(lang, "vpsAdmin.configured")}` : `⛔ ${t(lang, "vpsAdmin.notConfigured")}`),
          row(t(lang, "vpsAdmin.adminLayer"), status.admin.enabled ? `🟢 ${t(lang, "vpsAdmin.configured")}` : `⚪ ${t(lang, "vpsAdmin.disabled")}`),
        ].join("\n"),
        [
          row(`📦 ${t(lang, "vpsAdmin.statBuyers")}`, String(all.length)),
          ...Object.entries(counts).filter(([, n]) => n).map(([s, n]) => row(`${STATUS_ICONS[s]} ${t(lang, `vpsAdmin.st_${s}`)}`, String(n))),
          soon.length ? row(`⌛ ${t(lang, "vpsAdmin.statExpiring")}`, String(soon.length)) : "",
        ].filter(Boolean).join("\n"),
      ],
    }),
    keyboard: keyboard([
      [b(`🧭 ${t(lang, "vpsAdmin.rowWizard")}`, { s: "o.new" })],
      [b(`🖥️ ${t(lang, "vpsAdmin.rowAllVps")}`, { s: "o.account" }), b(`🆓 ${t(lang, "vpsAdmin.rowFreeVps")}`, { s: "o.account", free: true })],
      [b(`📋 ${t(lang, "vpsAdmin.rowBuyers")} (${all.length})`, { s: "o.list" }), b(`⌛ ${t(lang, "vpsAdmin.statExpiring")} (${soon.length})`, { s: "o.expiring" })],
      [b(`🔎 ${t(lang, "tg.findBuyer")}`, { s: "o.find" }), b(`⚡ ${t(lang, "vpsAdmin.rowQuick")}`, { s: "o.quick" })],
      ...chunk(Object.keys(STATUS_ICONS).filter((s) => counts[s]).map((s) => b(`${STATUS_ICONS[s]} ${t(lang, `vpsAdmin.st_${s}`)} (${counts[s]})`, { s: "o.list", status: s })), 3),
      status.admin.enabled ? [b(`🔌 ${t(lang, "vpsAdmin.rowAdminVps")}`, { s: "o.node" }), b(`🗂️ ${t(lang, "vpsAdmin.rowAdminUsers")}`, { s: "o.users" })] : [],
      [b(`☁️ ${t(lang, "tg.myServers")}`, { s: "c.home" })],
    ]),
  });
}

/** سيرفرات الحساب (الكل أو المتاح للإسناد) */
async function account(ctx, { free = false } = {}) {
  const { lang } = ctx;
  const result = await owner.accountVps();
  if (!result.ok) return err(ctx, result.code);
  const rows = result.data.filter((v) => !free || !v.holder);
  const held = (v) => owner.list().find((e) => String(e.vpsId) === String(v.vpsId) && e.status !== "revoked");
  return ctx.show({
    text: card({
      icon: "🖥️",
      title: t(lang, free ? "vpsAdmin.freeListTitle" : "vpsAdmin.vpsListTitle", { count: rows.length }),
      blocks: [
        t(lang, "vpsAdmin.accountCount", { count: result.data.length }),
        rows.length ? rows.slice(0, 40).map((v) => {
          const e = held(v);
          return `• <b>VPS ${v.vpsId}</b> · ${v.hostname || v.name || "-"}\n   ${e ? `${STATUS_ICONS[e.status] || ""} ${buyerOf(e)}` : t(lang, "vpsAdmin.vpsRowFree")}`;
        }).join("\n") : t(lang, free ? "vpsAdmin.noFree" : "vpsAdmin.none"),
      ],
    }),
    keyboard: keyboard([
      ...chunk(rows.slice(0, 40).map((v) => button(ctx.userId, `${held(v) ? "👤" : "🆓"} ${v.vpsId} · ${(v.hostname || v.name || "").slice(0, 18)}`, free ? { s: "o.new", vpsId: v.vpsId } : { s: "o.vps", vpsId: v.vpsId })), 2),
      [free ? button(ctx.userId, `🖥️ ${t(lang, "vpsAdmin.rowAllVps")}`, { s: "o.account" }) : button(ctx.userId, `🆓 ${t(lang, "vpsAdmin.rowFreeVps")}`, { s: "o.account", free: true }), homeBtn(ctx)],
    ]),
  });
}

/** بطاقة VPS واحد من الحساب */
async function vpsCard(ctx, vpsId) {
  const { lang } = ctx;
  const result = await owner.accountVps();
  if (!result.ok) return err(ctx, result.code);
  const v = result.data.find((x) => String(x.vpsId) === String(vpsId));
  if (!v) return ctx.show({ text: card({ icon: "⚠️", title: `VPS ${vpsId}`, blocks: [t(lang, "vpsAdmin.vpsNotInAccount", { id: vpsId })] }), keyboard: keyboard([[homeBtn(ctx)]]) });
  const e = owner.list().find((x) => String(x.vpsId) === String(v.vpsId) && x.status !== "revoked");
  const specs = [v.cores ? `${v.cores} vCPU` : "", v.ramMb ? `${Math.round((v.ramMb / 1024) * 10) / 10} GB RAM` : "", v.diskGb ? `${v.diskGb} GB` : ""].filter(Boolean).join(" · ");
  return ctx.show({
    text: card({
      icon: "🖥️",
      title: `VPS ${v.vpsId}`,
      blocks: [[
        row(t(lang, "vpsAdmin.rowHostname"), v.hostname || v.name || "-"),
        v.ips?.length ? `▸ <b>${t(lang, "vpsAdmin.rowIps")}</b>: ${v.ips.slice(0, 3).map(code).join(" · ")}` : "",
        specs ? row(t(lang, "vpsAdmin.rowSpecs"), specs) : "",
        v.os ? row(t(lang, "vpsAdmin.rowOs"), v.os) : "",
        v.status ? row(t(lang, "vpsAdmin.rowState"), t(lang, `vpsAdmin.adminStatus_${v.status}`)) : "",
        row(t(lang, "vpsAdmin.rowHolder"), e ? `${STATUS_ICONS[e.status] || ""} ${buyerOf(e)}` : t(lang, "vpsAdmin.vpsRowFree")),
      ].filter(Boolean).join("\n")],
    }),
    keyboard: keyboard([
      [e ? button(ctx.userId, `⚙️ ${t(lang, "vpsAdmin.btnOpenEntitlement")}`, { s: "o.view", id: e.id }) : button(ctx.userId, `➕ ${t(lang, "vpsAdmin.btnAssignThis")}`, { s: "o.new", vpsId: v.vpsId })],
      owner.status().admin.enabled ? [button(ctx.userId, `🔌 ${t(lang, "vpsAdmin.btnProvider")}`, { s: "o.nodeInfo", vpsId: v.vpsId })] : [],
      [button(ctx.userId, `↩️ ${t(lang, "vpsAdmin.btnServers")}`, { s: "o.account" }), homeBtn(ctx)],
    ]),
  });
}

/**
 * معالج الإسناد (4 خطوات): سيرفر متاح ← معرّف تيليجرام (إدخال) ← الباقة ← المدة ← تأكيد ⇒ نفس assign.
 */
async function wizard(ctx, { vpsId = "", tgId = "", planId = "", days = "" } = {}) {
  const { lang } = ctx;
  const title = (step) => t(lang, "vpsAdmin.wizTitle", { step });
  const cancel = button(ctx.userId, `✖️ ${t(lang, "vpsAdmin.btnCancel")}`, { s: "o.home", cancelInput: true });
  if (!vpsId) return account(ctx, { free: true });
  if (!tgId) {
    startInput(ctx.chatId, ctx.userId, "o.wizId", { vpsId });
    return ctx.show({ text: card({ icon: "🧭", title: title(2), blocks: [t(lang, "tg.askTgId", { vps: vpsId }), t(lang, "tg.howToGetId"), t(lang, "vpsAdmin.cancelHint")] }), keyboard: keyboard([[cancel]]) });
  }
  if (!planId) {
    const byTier = vpsPlans();
    const tierRows = (tier) => chunk((byTier[tier] || []).map((p) => button(ctx.userId, `${p.id} · ${specLine(p)}`.slice(0, 60), { s: "o.new", vpsId, tgId, planId: p.id })), 1);
    return ctx.show({
      text: card({ icon: "🧭", title: title(3), blocks: [t(lang, "tg.wizPickPlanTg", { id: tgId, name: userLabel(tgId) })] }),
      keyboard: keyboard([...tierRows("standard"), ...tierRows("economy"), [button(ctx.userId, `▫️ ${t(lang, "vpsAdmin.planNone")}`, { s: "o.new", vpsId, tgId, planId: "-" })], [cancel]]),
    });
  }
  if (!days) {
    return ctx.show({
      text: card({ icon: "🧭", title: title(4), blocks: [t(lang, "tg.wizPickDurationTg", { id: tgId })] }),
      keyboard: keyboard([...chunk(DURATIONS.map((d) => button(ctx.userId, `📅 ${t(lang, `vpsAdmin.dur_${d}`)}`, { s: "o.new", vpsId, tgId, planId, days: d })), 2), [cancel]]),
    });
  }
  const plan = planId !== "-" ? planById(planId) : null;
  return ctx.show({
    text: card({
      icon: "🧾",
      title: t(lang, "vpsAdmin.confirmTitle"),
      blocks: [
        t(lang, "vpsAdmin.wizSummary"),
        [
          row(t(lang, "vpsAdmin.vpsIdRow"), vpsId),
          `▸ <b>${t(lang, "vpsAdmin.buyer")}</b>: ✈️ ${userLabel(tgId)} · ${code(tgId)}`,
          row(t(lang, "vpsAdmin.plan"), plan ? `${plan.id} · ${specLine(plan)}` : t(lang, "vpsAdmin.planNone")),
          row(t(lang, "vpsAdmin.durationRow"), t(lang, `vpsAdmin.dur_${DURATIONS.includes(days) ? days : "30"}`)),
        ].join("\n"),
      ],
    }),
    keyboard: keyboard([[
      button(ctx.userId, `✅ ${t(lang, "vpsAdmin.wizConfirm")}`, { s: "o.assign", vpsId, tgId, planId, days }, { once: true }),
      cancel,
    ]]),
  });
}

/** الإسناد الفعلي (نفس owner.assign: تحقق عند المزوّد · لا إسناد مزدوج) ثم إشعار المشتري على تيليجرام */
async function doAssign(ctx, { vpsId, tgId, planId = "", days = "" }) {
  const { lang } = ctx;
  const id = tgIdOf(tgId);
  if (!id || !/^\d{1,10}$/.test(String(vpsId))) return ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vpsAdmin.btnAssign"), blocks: [t(lang, "tg.quickUsage")] }), keyboard: keyboard([[homeBtn(ctx)]]), fresh: true });
  const expiresAt = days ? parseExpiry(days) : null;
  if (expiresAt === undefined) return ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vpsAdmin.btnAssign"), blocks: [t(lang, "vpsAdmin.expiryInvalid")] }), fresh: true });
  const plan = planId && planId !== "-" ? planId : "";
  if (plan && !planById(plan)) return ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vpsAdmin.btnAssign"), blocks: [t(lang, "vpsAdmin.planUnknown", { plan })] }), fresh: true });
  await ctx.notify(t(lang, "vpsAdmin.checking"));
  const result = await owner.assign({ by: by(ctx), user: `tg:${id}`, vpsId: String(vpsId), planId: plan, expiresAt });
  if (!result.ok) return err(ctx, result.code);
  const delivered = await notifyBuyer(ctx, result.data);
  if (!delivered) await ctx.notify(`⚠️ ${t(lang, "tg.notifyNotStarted", { id })}`);
  return view(ctx, result.data.id);
}

/** إشعار المشتري على تيليجرام برسالة وزر لوحة التحكم (يتطلب أن يكون بدأ البوت) */
async function notifyBuyer(ctx, entry) {
  if (!entry?.tg) return false;
  const lang = ctx.langOf(entry.tg);
  try {
    await ctx.api.sendMessage(entry.tg, card({ icon: "🎉", title: t(lang, "vpsAdmin.grantedTitle"), blocks: [t(lang, "vpsAdmin.grantedBody", { vps: entry.vpsId }), entry.expiresAt ? t(lang, "vpsAdmin.grantedExpiry", { date: dateOf(entry.expiresAt) }) : ""] }), {
      reply_markup: keyboard([[button(entry.tg, `☁️ ${t(lang, "vpsAdmin.btnOpenDashboard")}`, { s: "c.vps", vpsId: entry.vpsId })]]),
    });
    return true;
  } catch (error) {
    // غالباً لم يبدأ المستخدم البوت بعد (403) — المستدعي يبلّغ المالك بذلك
    noteFailure("telegram-vps", error, { where: "tg-vps-owner:notifyBuyer", stage: String(error?.code || "send"), fallback: "tell-owner" });
    return false;
  }
}

/** بطاقة إسناد واحد بكل إجراءاته */
function view(ctx, id) {
  const { lang } = ctx;
  const e = owner.list().find((x) => x.id === id);
  if (!e) return err(ctx, "entitlement-not-found");
  const plan = planById(e.planId);
  const b = (text, payload, options) => button(ctx.userId, text, payload, options);
  return ctx.show({
    text: card({
      icon: "⚙️",
      title: `VPS ${e.vpsId}`,
      blocks: [[
        `▸ <b>${t(lang, "vpsAdmin.buyer")}</b>: ${buyerOf(e)}`,
        row(t(lang, "vpsAdmin.status"), `${STATUS_ICONS[e.status] || ""} ${t(lang, `vpsAdmin.st_${e.status}`)}`),
        row(t(lang, "vpsAdmin.plan"), plan ? `${e.planId} · ${specLine(plan)}` : e.planId || "-"),
        row(t(lang, "vpsAdmin.enabledAt"), dateOf(e.enabledAt)),
        row(t(lang, "vpsAdmin.expiresAt"), e.expiresAt ? dateOf(e.expiresAt) : t(lang, "vpsAdmin.noExpiry")),
        row(t(lang, "vpsAdmin.lastVerified"), dateOf(e.lastVerified)),
        row(t(lang, "vpsAdmin.featuresCount", { count: e.permissions?.length || 0 }), Object.keys(e.limits || {}).length ? JSON.stringify(e.limits).slice(0, 60) : "-"),
        e.notes ? row(t(lang, "vpsAdmin.notes"), e.notes) : "",
      ].filter(Boolean).join("\n")],
    }),
    keyboard: keyboard([
      [
        e.status === "active" ? b(`⏸️ ${t(lang, "vpsAdmin.btnSuspend")}`, { s: "o.ask", action: "suspend", id }) : null,
        ["suspended", "expired"].includes(e.status) ? b(`▶️ ${t(lang, "vpsAdmin.btnRestore")}`, { s: "o.restore", id }) : null,
        b(`📅 ${t(lang, "vpsAdmin.btnExpiry")}`, { s: "o.expiry", id }),
      ],
      [b(`🧩 ${t(lang, "vpsAdmin.btnFeatures")}`, { s: "o.features", id }), b(`📏 ${t(lang, "vpsAdmin.btnLimits")}`, { s: "o.limits", id })],
      e.status !== "revoked" ? [b(`⛔ ${t(lang, "vpsAdmin.btnRevoke")}`, { s: "o.ask", action: "revoke", id }), b(`🔓 ${t(lang, "vpsAdmin.btnUnassign")}`, { s: "o.ask", action: "unassign", id })] : [],
      [e.tg && e.status !== "revoked" ? b(`📨 ${t(lang, "vpsAdmin.btnNotify")}`, { s: "o.notify", id }) : null, b(`🖥️ VPS ${e.vpsId}`, { s: "o.vps", vpsId: e.vpsId })],
      [b(`↩️ ${t(lang, "vpsAdmin.btnBuyers")}`, { s: "o.list" }), homeBtn(ctx)],
    ]),
  });
}

/** قائمة إسنادات قابلة للاختيار (الحالة · الانتهاء · البحث) */
function entryList(ctx, title, entries) {
  const { lang } = ctx;
  return ctx.show({
    text: card({
      icon: "📋",
      title,
      blocks: entries.length
        ? [t(lang, "vpsAdmin.buyersCount", { count: entries.length }), entries.slice(0, 40).map((e) => `${STATUS_ICONS[e.status] || "•"} <b>VPS ${e.vpsId}</b> · ${buyerOf(e)}\n   ${e.planId || "-"} · ${dateOf(e.expiresAt)}`).join("\n")]
        : [t(lang, "vpsAdmin.noBuyers")],
    }),
    keyboard: keyboard([...chunk(entries.slice(0, 40).map((e) => button(ctx.userId, `${STATUS_ICONS[e.status] || "•"} ${e.vpsId} · ${(e.tg ? userLabel(e.tg) : `+${String(e.pn || "").split("@")[0]}`).slice(0, 20)}`, { s: "o.view", id: e.id })), 2), [homeBtn(ctx)]]),
  });
}

function listBuyers(ctx, status = null) {
  const { lang } = ctx;
  const all = owner.list(status ? { status } : {}).sort((a, b) => String(b.enabledAt || "").localeCompare(String(a.enabledAt || "")));
  const title = status ? t(lang, "vpsAdmin.statusTitle", { status: `${STATUS_ICONS[status] || ""} ${t(lang, `vpsAdmin.st_${status}`)}`, count: all.length }) : t(lang, "vpsAdmin.btnBuyers");
  return entryList(ctx, title, all);
}

/** بحث: معرّف تيليجرام أو رقم واتساب */
function findBuyer(ctx, value) {
  const { lang } = ctx;
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return entryList(ctx, t(lang, "tg.findBuyer"), []);
  const byTg = owner.inspect(`tg:${digits}`);
  const byWa = digits.length >= 8 ? owner.inspect(`${digits}@s.whatsapp.net`) : [];
  const found = [...new Map([...byTg, ...byWa].map((e) => [e.id, e])).values()];
  if (found.length === 1) return view(ctx, found[0].id);
  return entryList(ctx, t(lang, "vpsAdmin.userTitle", { number: digits }), found);
}

function features(ctx, id) {
  const { lang } = ctx;
  const e = owner.list().find((x) => x.id === id);
  if (!e) return err(ctx, "entitlement-not-found");
  const actions = userSafeActions().filter((a) => !["vps.list", "vps.info"].includes(a));
  return ctx.show({
    text: card({ icon: "🧩", title: `${t(lang, "vpsAdmin.btnFeatures")} · VPS ${e.vpsId}`, blocks: [actions.map((a) => `${e.permissions?.includes(a) ? "✅" : "⛔"} ${t(lang, `vps.act_${short(a)}`)}`).join("\n")] }),
    keyboard: keyboard([...chunk(actions.map((a) => button(ctx.userId, `${e.permissions?.includes(a) ? "✅" : "⛔"} ${t(lang, `vps.act_${short(a)}`)}`, { s: "o.feature", id, action: a })), 2), [button(ctx.userId, `↩️ ${t(lang, "vpsAdmin.btnBack")}`, { s: "o.view", id })]]),
  });
}

/** تأكيد لإجراء خطِر على الإسناد (لمرة واحدة) */
function askConfirm(ctx, action, id) {
  const { lang } = ctx;
  if (!owner.list().some((e) => e.id === id)) return err(ctx, "entitlement-not-found");
  return ctx.show({
    text: card({ icon: "⚠️", title: t(lang, "vpsAdmin.confirmTitle"), blocks: [t(lang, `vpsAdmin.confirm_${action}`)] }),
    keyboard: keyboard([[button(ctx.userId, `✅ ${t(lang, "vpsAdmin.btnConfirm")}`, { s: "o.control", action, id }, { once: true }), button(ctx.userId, `✖️ ${t(lang, "vpsAdmin.btnCancel")}`, { s: "o.view", id })]]),
  });
}

/** نتيجة لوحة الإدارة: الحالة الفعلية بعد الإجراء (أو «أُرسل ولم يتأكد» بصدق) */
function adminCard(ctx, result) {
  const { lang } = ctx;
  if (!result.ok) return err(ctx, result.code);
  const vps = result.data || {};
  const id = vps.vpsId;
  const b = (text, payload, options) => button(ctx.userId, text, payload, options);
  return ctx.show({
    text: card({
      icon: "🔌",
      title: t(lang, "vpsAdmin.adminTitle", { id: id || "" }),
      blocks: [
        t(lang, "vpsAdmin.adminState", { name: vps.hostname || vps.name || "—", status: t(lang, `vpsAdmin.adminStatus_${vps.status || "unknown"}`) }),
        vps.holder ? t(lang, "vpsAdmin.adminHolder") : "",
        result.code === "already" ? t(lang, "vpsAdmin.adminAlready") : result.code === "sent-unverified" ? t(lang, "vpsAdmin.adminUnverified") : "",
      ],
    }),
    keyboard: keyboard([
      [b(`▶️ ${t(lang, "vps.act_start")}`, { s: "o.power", vpsId: id, action: "start" }), b(`🔄 ${t(lang, "vps.act_restart")}`, { s: "o.adminAsk", vpsId: id, action: "restart" })],
      [b(`⏹️ ${t(lang, "vps.act_stop")}`, { s: "o.adminAsk", vpsId: id, action: "stop" }), b(`⏻ ${t(lang, "vps.act_poweroff")}`, { s: "o.adminAsk", vpsId: id, action: "poweroff" })],
      [vps.status === "suspended" ? b(`🔓 ${t(lang, "tg.release")}`, { s: "o.adminAsk", vpsId: id, action: "release" }) : b(`⏸️ ${t(lang, "tg.hold")}`, { s: "o.adminAsk", vpsId: id, action: "hold" })],
      [b(`🔃 ${t(lang, "vps.btnRefresh")}`, { s: "o.nodeInfo", vpsId: id }), homeBtn(ctx)],
    ]),
  });
}

async function adminAsk(ctx, vpsId, action) {
  const { lang } = ctx;
  const info = await owner.adminInfo(vpsId);
  if (!info.ok) return err(ctx, info.code);
  return ctx.show({
    text: card({ icon: "⚠️", title: t(lang, "vpsAdmin.confirmTitle"), blocks: [t(lang, `vpsAdmin.adminConfirm_${action}`, { id: vpsId, name: info.data.hostname || info.data.name || vpsId })] }),
    keyboard: keyboard([[button(ctx.userId, `✅ ${t(lang, "vpsAdmin.btnConfirm")}`, { s: "o.adminDo", vpsId, action }, { once: true }), button(ctx.userId, `✖️ ${t(lang, "vpsAdmin.btnCancel")}`, { s: "o.nodeInfo", vpsId })]]),
  });
}

function askInput(ctx, step, data, blocks) {
  startInput(ctx.chatId, ctx.userId, step, data);
  return ctx.show({ text: card({ icon: "✍️", title: t(ctx.lang, "vpsAdmin.title"), blocks: [...blocks, t(ctx.lang, "vpsAdmin.cancelHint")] }), keyboard: keyboard([[button(ctx.userId, `✖️ ${t(ctx.lang, "vpsAdmin.btnCancel")}`, { s: "o.home", cancelInput: true })]]) });
}

// ═══════════════════════════════════════════════
// الموجّه
// ═══════════════════════════════════════════════

async function onOwnerButton(ctx, p) {
  const { lang } = ctx;
  switch (p.s) {
    case "o.home": return home(ctx);
    case "o.account": return account(ctx, { free: Boolean(p.free) });
    case "o.vps": return vpsCard(ctx, p.vpsId);
    case "o.new": return wizard(ctx, p);
    case "o.assign": return doAssign(ctx, p);
    case "o.quick": return askInput(ctx, "o.quick", {}, [t(lang, "tg.quickUsage")]);
    case "o.list": return listBuyers(ctx, p.status || null);
    case "o.expiring": {
      const soon = expiringSoon(owner.list());
      return entryList(ctx, t(lang, "vpsAdmin.expiringTitle", { count: soon.length }), soon);
    }
    case "o.find": return askInput(ctx, "o.find", {}, [t(lang, "tg.findAsk")]);
    case "o.view": return view(ctx, p.id);
    case "o.ask": return askConfirm(ctx, p.action, p.id);
    case "o.control": {
      const result = owner.control(p.action, p.id, by(ctx), {});
      return result.ok ? view(ctx, p.id) : err(ctx, result.code);
    }
    case "o.restore": {
      const result = owner.control("restore", p.id, by(ctx), {});
      return result.ok ? view(ctx, p.id) : err(ctx, result.code);
    }
    case "o.expiry": return askInput(ctx, "o.expiry", { id: p.id }, [t(lang, "vpsAdmin.expiryAsk")]);
    case "o.limits": return askInput(ctx, "o.limits", { id: p.id }, [t(lang, "vpsAdmin.limitsAsk")]);
    case "o.features": return features(ctx, p.id);
    case "o.feature": {
      const e = owner.list().find((x) => x.id === p.id);
      if (!e) return err(ctx, "entitlement-not-found");
      const on = e.permissions?.includes(p.action);
      const result = owner.control("features", p.id, by(ctx), on ? { disable: [p.action] } : { enable: [p.action] });
      return result.ok ? features(ctx, p.id) : err(ctx, result.code);
    }
    case "o.notify": {
      const e = owner.list().find((x) => x.id === p.id);
      if (!e) return err(ctx, "entitlement-not-found");
      const ok = await notifyBuyer(ctx, e);
      return ctx.notify(ok ? t(lang, "vpsAdmin.notified") : `⚠️ ${t(lang, "tg.notifyNotStarted", { id: e.tg || "-" })}`);
    }
    case "o.node": return askInput(ctx, "o.node", {}, [t(lang, "vpsAdmin.adminVpsAsk")]);
    case "o.nodeInfo": return adminCard(ctx, await owner.adminInfo(p.vpsId));
    case "o.power": return adminCard(ctx, await owner.adminPower(p.vpsId, p.action));
    case "o.adminAsk": return adminAsk(ctx, p.vpsId, p.action);
    case "o.adminDo": {
      const out = p.action === "hold" || p.action === "release" ? await owner.adminSuspend(p.vpsId, p.action === "hold") : await owner.adminPower(p.vpsId, p.action);
      return adminCard(ctx, out);
    }
    case "o.users": {
      const result = await owner.adminUsers();
      if (!result.ok) return err(ctx, result.code);
      return ctx.show({ text: card({ icon: "🗂️", title: t(lang, "vpsAdmin.adminUsersTitle", { count: result.data.length }), blocks: [result.data.slice(0, 40).map((u) => t(lang, "vpsAdmin.adminUserLine", u)).join("\n") || t(lang, "vpsAdmin.noBuyers")] }), keyboard: keyboard([[homeBtn(ctx)]]) });
    }
    default: return home(ctx);
  }
}

/** رسالة نصية لشاشة إدخال المالك */
async function onOwnerInput(ctx, state, value) {
  const { lang } = ctx;
  switch (state.step) {
    case "o.wizId": {
      const id = tgIdOf(value);
      if (!id) {
        startInput(ctx.chatId, ctx.userId, "o.wizId", state.data);
        return ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vpsAdmin.btnAssign"), blocks: [t(lang, "tg.badTgId")] }), fresh: true });
      }
      return wizard(ctx, { vpsId: state.data.vpsId, tgId: id });
    }
    case "o.quick": {
      const [tgId = "", vpsId = "", planId = "", days = ""] = value.split(/\s+/);
      return doAssign(ctx, { vpsId, tgId, planId, days });
    }
    case "o.find": return findBuyer(ctx, value);
    case "o.node": return adminCard(ctx, await owner.adminInfo(value.replace(/\D/g, "")));
    case "o.expiry": {
      const expiresAt = parseExpiry(value);
      if (expiresAt === undefined) return ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vpsAdmin.btnExpiry"), blocks: [t(lang, "vpsAdmin.expiryInvalid")] }), fresh: true });
      const result = owner.control("expiry", state.data.id, by(ctx), { expiresAt });
      return result.ok ? view(ctx, state.data.id) : err(ctx, result.code);
    }
    case "o.limits": {
      const limits = Object.fromEntries(value.split(/[\s,]+/).map((pair) => pair.split("=")).filter(([k, v]) => k && v !== undefined));
      const result = owner.control("limits", state.data.id, by(ctx), { limits });
      return result.ok ? view(ctx, state.data.id) : err(ctx, result.code);
    }
    default: return null;
  }
}

/** أمر نصي للمالك: /assign <TelegramID> <VPS> [باقة] [أيام] · /find <id> */
function onOwnerCommand(ctx, command, args) {
  if (command === "assign") {
    if (args.length < 2) return askInput(ctx, "o.quick", {}, [t(ctx.lang, "tg.quickUsage")]);
    const [tgId, vpsId, planId = "", days = ""] = args;
    return doAssign(ctx, { vpsId, tgId, planId, days });
  }
  if (command === "find") return args[0] ? findBuyer(ctx, args[0]) : askInput(ctx, "o.find", {}, [t(ctx.lang, "tg.findAsk")]);
  return home(ctx);
}

export { buyerOf, home, onOwnerButton, onOwnerCommand, onOwnerInput, parseExpiry, tgIdOf };
