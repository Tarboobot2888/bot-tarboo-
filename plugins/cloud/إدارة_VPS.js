// ═══════════════════════════════════════════════
// 👑 إدارة Terboo VPS — للمالك فقط
// ───────────────────────────────────────────────
// منح/سحب/إسناد/فك إسناد · عرض المشتري · عرض VPS · تفعيل/تعطيل الميزات · الانتهاء · الحدود.
// الإسناد يتحقق من وجود الـVPS في الحساب عند المزوّد أولاً، ثم يُبلَّغ المشتري برسالة خاصة.
// ═══════════════════════════════════════════════

import { cmd, errorText, footer, langOf } from "../../src/lib/terboo-cloud-ui.js";
import { createActionToken, consumeActionToken, dropActionToken, endInput, registerFlow, startInput } from "../../src/lib/terboo-flow.js";
import { identityOf } from "../../src/lib/terboo-identity.js";
import { getUserLanguage, t } from "../../src/lib/terboo-localization.js";
import { getDatabase } from "../../src/lib/terboo-database.js";
import { userSafeActions } from "../../src/lib/providers/virtualizor/virtualizor-capabilities.js";
import * as owner from "../../src/lib/providers/virtualizor/virtualizor-owner-service.js";
import * as provisioner from "../../src/lib/providers/virtualizor/virtualizor-provisioner.js";
import { telegramIdentity } from "../../src/lib/providers/virtualizor/virtualizor-entitlements.js";
import { decide, principalOf } from "../../src/lib/terboo-permissions.js";
import { startProvisioning } from "../../src/lib/terboo-task-runners.js";
import { planById, plans as vpsPlans, specLine } from "../../src/lib/terboo-vps-plans.js";
import { sendCard } from "../../src/lib/terboo-ui-kit.js";
import * as UI from "../../src/lib/terboo-ui-theme.js";

const pluginConfig = {
  name: "vpsadmin",
  alias: ["vpsowner", "ادارة_vps", "إدارة_vps"],
  category: "owner",
  description: "إدارة مشتري Terboo VPS: إسناد وسحب وتعليق وصلاحيات وانتهاء",
  usage: ".vpsadmin",
  example: ".vpsadmin assign 201234567890 123 std-1 30",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 1,
  energi: 0,
  isEnabled: true,
};

const FLOW = "vpsadmin";
const STATUS_ICONS = { active: "🟢", pending: "🟡", suspended: "⏸️", expired: "⌛", revoked: "⛔" };
const short = (action) => action.replace(/^vps\./, "").replace(/\./g, "_");

function card(m, sock, lang, options) {
  return sendCard(sock, m, { cardId: "vpsadmin", lang, footer: footer(lang), image: "vps", flow: FLOW, icon: "👑", ...options });
}

async function reply(m, sock, text) {
  return sock.sendMessage(m.chat, { text }, {});
}

const dateOf = (iso) => (iso ? String(iso).slice(0, 10) : "-");
/** المشتري للعرض: رقم واتساب · ✈️ معرّف تيليجرام (مخزن واحد للمنصتين) */
const buyerOf = (e) => (e.tg ? `✈️ TG ${e.tg}` : e.pn ? e.pn.split("@")[0] : e.jid || e.canonicalUserId);

/** مدة بالأيام أو تاريخ YYYY-MM-DD أو 0 (بلا انتهاء) ⇒ ISO أو null أو undefined (غير صالح) */
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

const WEEK = 7 * 86_400_000;
const expiringSoon = (all, now = Date.now()) => all.filter((e) => e.status === "active" && e.expiresAt && Date.parse(e.expiresAt) - now <= WEEK);
const digitsOf = (value) => String(value || "").replace(/\D/g, "");

/** مركز الإدارة: إحصاءات + قائمة تفاعلية (سيرفرات · مستخدمون · إسناد · لوحة الإدارة) */
async function home(m, sock, lang) {
  const status = owner.status();
  const all = owner.list();
  const counts = Object.fromEntries(Object.keys(STATUS_ICONS).map((s) => [s, all.filter((e) => e.status === s).length]));
  const soon = expiringSoon(all);
  const row = (id, title, description) => ({ id, title, description });
  const sections = [
    { title: t(lang, "vpsAdmin.secAssign"), rows: [
      row(cmd(m, "vpsadmin", "new"), `🧭 ${t(lang, "vpsAdmin.rowWizard")}`, t(lang, "vpsAdmin.rowWizardDesc")),
      row(cmd(m, "vpsadmin", "assign"), `⚡ ${t(lang, "vpsAdmin.rowQuick")}`, t(lang, "vpsAdmin.rowQuickDesc")),
    ] },
    { title: t(lang, "vpsAdmin.secServers"), rows: [
      row(cmd(m, "vpsadmin", "account"), `🖥️ ${t(lang, "vpsAdmin.rowAllVps")}`, t(lang, "vpsAdmin.rowAllVpsDesc")),
      row(cmd(m, "vpsadmin", "account", "free"), `🆓 ${t(lang, "vpsAdmin.rowFreeVps")}`, t(lang, "vpsAdmin.rowFreeVpsDesc")),
    ] },
    { title: t(lang, "vpsAdmin.secUsers"), rows: [
      row(cmd(m, "vpsadmin", "list"), `📋 ${t(lang, "vpsAdmin.rowBuyers")}`, t(lang, "vpsAdmin.rowBuyersDesc", { count: all.length })),
      row(cmd(m, "vpsadmin", "expiring"), t(lang, "vpsAdmin.rowExpiring"), t(lang, "vpsAdmin.rowExpiringDesc", { count: soon.length })),
      row(cmd(m, "vpsadmin", "find"), t(lang, "vpsAdmin.rowFind"), t(lang, "vpsAdmin.rowFindDesc")),
      ...Object.keys(STATUS_ICONS).filter((s) => counts[s]).map((s) => row(cmd(m, "vpsadmin", "list", s), `${STATUS_ICONS[s]} ${t(lang, `vpsAdmin.st_${s}`)}`, t(lang, "vpsAdmin.rowStatusDesc", { count: counts[s] }))),
    ] },
    { title: t(lang, "vpsAdmin.secAdmin"), rows: status.admin.enabled
      ? [
        row(cmd(m, "vpsadmin", "node"), `🔌 ${t(lang, "vpsAdmin.rowAdminVps")}`, t(lang, "vpsAdmin.rowAdminVpsDesc")),
        row(cmd(m, "vpsadmin", "users"), `🗂️ ${t(lang, "vpsAdmin.rowAdminUsers")}`, t(lang, "vpsAdmin.rowAdminUsersDesc")),
      ]
      : [row(cmd(m, "vpsadmin"), `⚪ ${t(lang, "vpsAdmin.rowAdminOff")}`, t(lang, "vpsAdmin.rowAdminOffDesc"))] },
  ];
  return card(m, sock, lang, {
    title: t(lang, "vpsAdmin.title"),
    blocks: [
      [
        UI.row(t(lang, "vpsAdmin.userLayer"), status.enduser.enabled ? `🟢 ${t(lang, "vpsAdmin.configured")}` : `⛔ ${t(lang, "vpsAdmin.notConfigured")}`, lang),
        UI.row(t(lang, "vpsAdmin.adminLayer"), status.admin.enabled ? `🟢 ${t(lang, "vpsAdmin.configured")}` : `⚪ ${t(lang, "vpsAdmin.disabled")}`, lang),
      ].join("\n"),
      [
        UI.row(`📦 ${t(lang, "vpsAdmin.statBuyers")}`, String(all.length), lang),
        ...Object.entries(counts).filter(([, n]) => n).map(([s, n]) => UI.row(`${STATUS_ICONS[s]} ${t(lang, `vpsAdmin.st_${s}`)}`, String(n), lang)),
        soon.length ? UI.row(`⌛ ${t(lang, "vpsAdmin.statExpiring")}`, String(soon.length), lang) : "",
      ].filter(Boolean).join("\n"),
      t(lang, "vpsAdmin.menuHint"),
    ],
    select: { title: t(lang, "vpsAdmin.btnManage"), sections },
    buttons: [
      { id: cmd(m, "vpsadmin", "new"), text: `➕ ${t(lang, "vpsAdmin.btnAssign")}` },
      { id: cmd(m, "vpsadmin", "account"), text: `🖥️ ${t(lang, "vpsAdmin.btnServers")}` },
      { id: cmd(m, "vpsadmin", "list"), text: `👥 ${t(lang, "vpsAdmin.btnBuyers")}` },
    ],
  });
}

async function listBuyers(m, sock, lang, status = null) {
  const all = owner.list(status ? { status } : {}).sort((a, b) => String(b.enabledAt || "").localeCompare(String(a.enabledAt || "")));
  const title = status ? t(lang, "vpsAdmin.statusTitle", { status: `${STATUS_ICONS[status] || ""} ${t(lang, `vpsAdmin.st_${status}`)}`, count: all.length }) : t(lang, "vpsAdmin.btnBuyers");
  return entryList(m, sock, lang, title, all);
}

async function view(m, sock, lang, id) {
  const e = owner.list().find((x) => x.id === id);
  if (!e) return reply(m, sock, errorText(lang, "entitlement-not-found"));
  const plan = planById(e.planId);
  const rows = [
    e.status === "active" ? { id: cmd(m, "vpsadmin", "suspend", e.id), title: `⏸️ ${t(lang, "vpsAdmin.btnSuspend")}`, description: t(lang, "vpsAdmin.hintSuspend") } : null,
    ["suspended", "expired"].includes(e.status) ? { id: cmd(m, "vpsadmin", "restore", e.id), title: `▶️ ${t(lang, "vpsAdmin.btnRestore")}`, description: t(lang, "vpsAdmin.hintRestore") } : null,
    { id: cmd(m, "vpsadmin", "expiry", e.id), title: `📅 ${t(lang, "vpsAdmin.btnExpiry")}`, description: dateOf(e.expiresAt) },
    { id: cmd(m, "vpsadmin", "features", e.id), title: `🧩 ${t(lang, "vpsAdmin.btnFeatures")}`, description: t(lang, "vpsAdmin.featuresCount", { count: e.permissions?.length || 0 }) },
    { id: cmd(m, "vpsadmin", "limits", e.id), title: `📏 ${t(lang, "vpsAdmin.btnLimits")}`, description: Object.keys(e.limits || {}).length ? JSON.stringify(e.limits).slice(0, 60) : "-" },
    e.status !== "revoked" ? { id: cmd(m, "vpsadmin", "revoke", e.id), title: `⛔ ${t(lang, "vpsAdmin.btnRevoke")}`, description: t(lang, "vpsAdmin.hintRevoke") } : null,
    e.status !== "revoked" ? { id: cmd(m, "vpsadmin", "unassign", e.id), title: `🔓 ${t(lang, "vpsAdmin.btnUnassign")}`, description: t(lang, "vpsAdmin.hintUnassign") } : null,
  ].filter(Boolean);
  return card(m, sock, lang, {
    title: `VPS ${e.vpsId}`,
    blocks: [
      [
        UI.row(t(lang, "vpsAdmin.buyer"), buyerOf(e), lang),
        UI.row(t(lang, "vpsAdmin.status"), `${STATUS_ICONS[e.status] || ""} ${t(lang, `vpsAdmin.st_${e.status}`)}`, lang),
        UI.row(t(lang, "vpsAdmin.plan"), plan ? `${e.planId} · ${specLine(plan)}` : e.planId || "-", lang),
        UI.row(t(lang, "vpsAdmin.enabledAt"), dateOf(e.enabledAt), lang),
        UI.row(t(lang, "vpsAdmin.expiresAt"), e.expiresAt ? dateOf(e.expiresAt) : t(lang, "vpsAdmin.noExpiry"), lang),
        UI.row(t(lang, "vpsAdmin.lastVerified"), dateOf(e.lastVerified), lang),
        e.notes ? UI.row(t(lang, "vpsAdmin.notes"), e.notes, lang) : "",
      ].filter(Boolean).join("\n"),
    ],
    select: { title: t(lang, "vpsAdmin.btnManage"), sections: [{ title: `VPS ${e.vpsId}`, rows }] },
    buttons: [
      e.status !== "revoked" ? { id: cmd(m, "vpsadmin", "notify", e.id), text: `📨 ${t(lang, "vpsAdmin.btnNotify")}` } : null,
      { id: cmd(m, "vpsadmin", "vps", e.vpsId), text: `🖥️ VPS ${e.vpsId}` },
      { id: cmd(m, "vpsadmin"), text: `🏠 ${t(lang, "vpsAdmin.btnHome")}` },
    ].filter(Boolean),
  });
}

async function account(m, sock, lang, filter = "") {
  await reply(m, sock, t(lang, "vpsAdmin.checking"));
  const result = await owner.accountVps();
  if (!result.ok) return reply(m, sock, errorText(lang, result.code));
  const free = filter === "free";
  const rows = result.data.filter((v) => !free || !v.holder);
  if (!rows.length) {
    return card(m, sock, lang, { title: t(lang, "vpsAdmin.freeListTitle", { count: 0 }), blocks: [free ? t(lang, "vpsAdmin.noFree") : t(lang, "vpsAdmin.none")], buttons: [{ id: cmd(m, "vpsadmin"), text: `🏠 ${t(lang, "vpsAdmin.btnHome")}` }] });
  }
  const held = (v) => owner.list().find((e) => String(e.vpsId) === String(v.vpsId) && e.status !== "revoked");
  return card(m, sock, lang, {
    title: t(lang, free ? "vpsAdmin.freeListTitle" : "vpsAdmin.vpsListTitle", { count: rows.length }),
    blocks: [t(lang, "vpsAdmin.accountCount", { count: result.data.length })],
    select: {
      title: t(lang, "vpsAdmin.btnOpen"),
      sections: [{
        title: t(lang, "vpsAdmin.secServers"),
        rows: rows.slice(0, 50).map((v) => {
          const e = held(v);
          return {
            id: free ? cmd(m, "vpsadmin", "new", v.vpsId) : cmd(m, "vpsadmin", "vps", v.vpsId),
            title: `VPS ${v.vpsId} · ${v.hostname || v.name || "-"}`,
            description: e ? t(lang, "vpsAdmin.vpsRowHeld", { buyer: buyerOf(e), status: t(lang, `vpsAdmin.st_${e.status}`) }) : t(lang, "vpsAdmin.vpsRowFree"),
          };
        }),
      }],
    },
    buttons: [
      free ? { id: cmd(m, "vpsadmin", "account"), text: `🖥️ ${t(lang, "vpsAdmin.rowAllVps")}` } : { id: cmd(m, "vpsadmin", "account", "free"), text: `🆓 ${t(lang, "vpsAdmin.rowFreeVps")}` },
      { id: cmd(m, "vpsadmin"), text: `🏠 ${t(lang, "vpsAdmin.btnHome")}` },
    ],
  });
}

/** بطاقة VPS واحد من الحساب: مواصفاته عند المزوّد + لمن هو مسند + الإجراءات المتاحة */
async function vpsCard(m, sock, lang, vpsId) {
  const result = await owner.accountVps();
  if (!result.ok) return reply(m, sock, errorText(lang, result.code));
  const v = result.data.find((x) => String(x.vpsId) === String(vpsId));
  if (!v) return reply(m, sock, t(lang, "vpsAdmin.vpsNotInAccount", { id: vpsId }));
  const e = owner.list().find((x) => String(x.vpsId) === String(v.vpsId) && x.status !== "revoked");
  const specs = [v.cores ? `${v.cores} vCPU` : "", v.ramMb ? `${Math.round(v.ramMb / 1024 * 10) / 10} GB RAM` : "", v.diskGb ? `${v.diskGb} GB` : ""].filter(Boolean).join(" · ");
  const buttons = e
    ? [{ id: cmd(m, "vpsadmin", "view", e.id), text: `⚙️ ${t(lang, "vpsAdmin.btnOpenEntitlement")}` }]
    : [{ id: cmd(m, "vpsadmin", "new", v.vpsId), text: `➕ ${t(lang, "vpsAdmin.btnAssignThis")}` }];
  if (owner.status().admin.enabled) buttons.push({ id: cmd(m, "vpsadmin", "node", v.vpsId), text: `🔌 ${t(lang, "vpsAdmin.btnProvider")}` });
  buttons.push({ id: cmd(m, "vpsadmin", "account"), text: `↩️ ${t(lang, "vpsAdmin.btnServers")}` });
  return card(m, sock, lang, {
    title: `VPS ${v.vpsId}`,
    blocks: [[
      UI.row(t(lang, "vpsAdmin.rowHostname"), v.hostname || v.name || "-", lang),
      v.ips?.length ? UI.row(t(lang, "vpsAdmin.rowIps"), v.ips.slice(0, 3).join(" · "), lang) : "",
      specs ? UI.row(t(lang, "vpsAdmin.rowSpecs"), specs, lang) : "",
      v.os ? UI.row(t(lang, "vpsAdmin.rowOs"), v.os, lang) : "",
      v.status ? UI.row(t(lang, "vpsAdmin.rowState"), t(lang, `vpsAdmin.adminStatus_${v.status}`), lang) : "",
      UI.row(t(lang, "vpsAdmin.rowHolder"), e ? `${STATUS_ICONS[e.status] || ""} ${buyerOf(e)}` : t(lang, "vpsAdmin.vpsRowFree"), lang),
    ].filter(Boolean).join("\n")],
    buttons: buttons.slice(0, 3),
  });
}

/**
 * معالج الإسناد (4 خطوات، كل خطوة زر/قائمة): سيرفر متاح ← رقم ← باقة ← مدة ← تأكيد.
 * الحالة محمولة في معرّف الزر نفسه (المالك فقط)؛ التنفيذ النهائي هو doAssign نفسه (تحقق عند المزوّد + إشعار).
 */
async function wizard(m, sock, lang, [vpsId = "", number = "", planId = "", days = ""] = []) {
  const title = (step) => t(lang, "vpsAdmin.wizTitle", { step });
  const cancel = { id: cmd(m, "vpsadmin"), text: `✖️ ${t(lang, "vpsAdmin.btnCancel")}` };
  if (!vpsId) return account(m, sock, lang, "free");
  if (!/^\d{1,10}$/.test(vpsId)) return reply(m, sock, t(lang, "vpsAdmin.assignUsage"));
  if (!number) {
    startInput({ user: m.sender, chat: m.chat, flow: "vpsadmin.input", step: "wiz-number", data: { vpsId } });
    return card(m, sock, lang, { title: title(2), blocks: [t(lang, "vpsAdmin.wizAskNumber", { vps: vpsId }), t(lang, "vpsAdmin.cancelHint")], buttons: [cancel] });
  }
  const digits = digitsOf(number);
  if (digits.length < 8 || digits.length > 15) return reply(m, sock, t(lang, "vpsAdmin.wizBadNumber"));
  if (!planId) {
    const byTier = vpsPlans();
    const tierSection = (tier) => ({ title: t(lang, `plans.tier_${tier}`), rows: (byTier[tier] || []).map((p) => ({ id: cmd(m, "vpsadmin", "new", vpsId, digits, p.id), title: p.id, description: specLine(p) })) });
    return card(m, sock, lang, {
      title: title(3),
      blocks: [t(lang, "vpsAdmin.wizPickPlan", { number: digits })],
      select: {
        title: t(lang, "vpsAdmin.plan"),
        sections: [
          tierSection("standard"),
          tierSection("economy"),
          { title: t(lang, "vpsAdmin.planNone"), rows: [{ id: cmd(m, "vpsadmin", "new", vpsId, digits, "-"), title: t(lang, "vpsAdmin.planNone"), description: t(lang, "vpsAdmin.planNoneDesc") }] },
        ].filter((section) => section.rows.length),
      },
      buttons: [cancel],
    });
  }
  if (!days) {
    return card(m, sock, lang, {
      title: title(4),
      blocks: [t(lang, "vpsAdmin.wizPickDuration", { number: digits })],
      select: { title: t(lang, "vpsAdmin.durationRow"), sections: [{ title: t(lang, "vpsAdmin.durationRow"), rows: ["7", "30", "90", "365", "0"].map((d) => ({ id: cmd(m, "vpsadmin", "new", vpsId, digits, planId, d), title: t(lang, `vpsAdmin.dur_${d}`), description: d === "0" ? t(lang, "vpsAdmin.noExpiry") : `${d}d` })) }] },
      buttons: [{ id: cmd(m, "vpsadmin", "new", vpsId, digits, planId, "30"), text: `📅 ${t(lang, "vpsAdmin.dur_30")}` }, cancel],
    });
  }
  const plan = planId !== "-" ? planById(planId) : null;
  return card(m, sock, lang, {
    title: t(lang, "vpsAdmin.confirmTitle"),
    icon: "🧾",
    blocks: [
      t(lang, "vpsAdmin.wizSummary"),
      [
        UI.row(t(lang, "vpsAdmin.vpsIdRow"), vpsId, lang),
        UI.row(t(lang, "vpsAdmin.buyer"), digits, lang),
        UI.row(t(lang, "vpsAdmin.plan"), plan ? `${plan.id} · ${specLine(plan)}` : t(lang, "vpsAdmin.planNone"), lang),
        UI.row(t(lang, "vpsAdmin.durationRow"), t(lang, `vpsAdmin.dur_${["7", "30", "90", "365", "0"].includes(days) ? days : "30"}`), lang),
      ].join("\n"),
    ],
    buttons: [
      { id: cmd(m, "vpsadmin", "assign", digits, vpsId, planId, days), text: `✅ ${t(lang, "vpsAdmin.wizConfirm")}` },
      cancel,
    ],
  });
}

/** كل إسنادات رقم معيّن */
async function userCard(m, sock, lang, number) {
  const digits = digitsOf(number);
  const entries = digits ? owner.inspect(`${digits}@s.whatsapp.net`) : [];
  if (!entries.length) return card(m, sock, lang, { title: t(lang, "vpsAdmin.userTitle", { number: digits || "-" }), blocks: [t(lang, "vpsAdmin.userNone")], buttons: [{ id: cmd(m, "vpsadmin", "new"), text: `➕ ${t(lang, "vpsAdmin.btnAssign")}` }, { id: cmd(m, "vpsadmin"), text: `🏠 ${t(lang, "vpsAdmin.btnHome")}` }] });
  if (entries.length === 1) return view(m, sock, lang, entries[0].id);
  return entryList(m, sock, lang, t(lang, "vpsAdmin.userTitle", { number: digits }), entries);
}

/** قائمة إسنادات قابلة للاختيار (مشترك بين الحالة/الانتهاء/البحث) */
function entryList(m, sock, lang, title, entries) {
  if (!entries.length) return card(m, sock, lang, { title, blocks: [t(lang, "vpsAdmin.noBuyers")], buttons: [{ id: cmd(m, "vpsadmin"), text: `🏠 ${t(lang, "vpsAdmin.btnHome")}` }] });
  return card(m, sock, lang, {
    title,
    blocks: [t(lang, "vpsAdmin.buyersCount", { count: entries.length })],
    select: {
      title: t(lang, "vpsAdmin.btnOpen"),
      sections: [{ title: t(lang, "vpsAdmin.btnBuyers"), rows: entries.slice(0, 50).map((e) => ({ id: cmd(m, "vpsadmin", "view", e.id), title: `${STATUS_ICONS[e.status] || "•"} VPS ${e.vpsId} · ${buyerOf(e)}`, description: `${t(lang, `vpsAdmin.st_${e.status}`)} · ${e.planId || "-"} · ${dateOf(e.expiresAt)}` })) }],
    },
    buttons: [{ id: cmd(m, "vpsadmin"), text: `🏠 ${t(lang, "vpsAdmin.btnHome")}` }],
  });
}

async function features(m, sock, lang, id) {
  const e = owner.list().find((x) => x.id === id);
  if (!e) return reply(m, sock, errorText(lang, "entitlement-not-found"));
  const actions = userSafeActions().filter((a) => !["vps.list", "vps.info"].includes(a));
  return card(m, sock, lang, {
    title: t(lang, "vpsAdmin.btnFeatures"),
    blocks: [actions.map((a) => UI.row(t(lang, `vps.act_${short(a)}`), e.permissions?.includes(a) ? "✅" : "⛔", lang)).join("\n")],
    select: {
      title: t(lang, "vpsAdmin.btnToggle"),
      sections: [{ title: `VPS ${e.vpsId}`, rows: actions.map((a) => ({ id: cmd(m, "vpsadmin", "feature", e.id, a), title: `${e.permissions?.includes(a) ? "✅" : "⛔"} ${t(lang, `vps.act_${short(a)}`)}`, description: e.permissions?.includes(a) ? t(lang, "vpsAdmin.tapDisable") : t(lang, "vpsAdmin.tapEnable") })) }],
    },
    buttons: [{ id: cmd(m, "vpsadmin", "view", e.id), text: `↩️ ${t(lang, "vpsAdmin.btnBack")}` }],
  });
}

/** يبلّغ المشتري بتفعيل VPS (رسالة خاصة بزر لوحة التحكم) */
async function notifyBuyer(sock, entry) {
  if (!entry?.pn) return;
  const jid = entry.pn.includes("@") ? entry.pn : `${entry.pn}@s.whatsapp.net`;
  let lang = "ar";
  try {
    lang = getUserLanguage(getDatabase().getUser(jid));
  } catch {
    lang = "ar";
  }
  const target = { chat: jid, sender: jid, isGroup: false, isCommand: false };
  await sendCard(sock, target, {
    cardId: "vps-granted",
    lang,
    title: t(lang, "vpsAdmin.grantedTitle"),
    icon: "🎉",
    image: "vps",
    blocks: [t(lang, "vpsAdmin.grantedBody", { vps: entry.vpsId }), entry.expiresAt ? t(lang, "vpsAdmin.grantedExpiry", { date: dateOf(entry.expiresAt) }) : ""],
    footer: footer(lang),
    buttons: [{ id: cmd(target, "myvps"), text: `☁️ ${t(lang, "vpsAdmin.btnOpenDashboard")}` }],
  });
}

async function doAssign(m, sock, lang, parts) {
  const [number = "", vpsId = "", rawPlan = "", days = ""] = parts;
  // «-» = بلا باقة (يحفظ موضع المدة في الأمر الواحد)
  const planId = rawPlan === "-" ? "" : rawPlan;
  const digits = number.replace(/\D/g, "");
  if (digits.length < 8 || !/^\d{1,10}$/.test(vpsId)) return reply(m, sock, t(lang, "vpsAdmin.assignUsage"));
  const expiresAt = days ? parseExpiry(days) : null;
  if (expiresAt === undefined) return reply(m, sock, t(lang, "vpsAdmin.expiryInvalid"));
  if (planId && !planById(planId)) return reply(m, sock, t(lang, "vpsAdmin.planUnknown", { plan: planId }));
  await reply(m, sock, t(lang, "vpsAdmin.checking"));
  const result = await owner.assign({ by: identityOf(m.sender).canonical, user: `${digits}@s.whatsapp.net`, vpsId, planId, expiresAt });
  if (!result.ok) return reply(m, sock, errorText(lang, result.code));
  try {
    await notifyBuyer(sock, result.data);
  } catch {
    await reply(m, sock, t(lang, "vpsAdmin.notifyFailed"));
  }
  return view(m, sock, lang, result.data.id);
}

// ═══════════════════════════════════════════════
// تدفقات الإدخال
// ═══════════════════════════════════════════════

registerFlow("vpsadmin.input", {
  async onInput(m, { sock }, state) {
    const lang = langOf(m);
    if (!m.isOwner) return false;
    const value = String(m.body || "").trim();
    endInput(m.sender, m.chat);
    const by = identityOf(m.sender).canonical;
    if (state.step === "assign") return doAssign(m, sock, lang, value.split(/\s+/));
    if (state.step === "wiz-number") return wizard(m, sock, lang, [state.data.vpsId, digitsOf(value) || "x"]);
    if (state.step === "find") return userCard(m, sock, lang, value);
    if (state.step === "node") return adminCard(m, sock, lang, await owner.adminInfo(digitsOf(value)));
    if (state.step === "expiry") {
      const expiresAt = parseExpiry(value);
      if (expiresAt === undefined) return reply(m, sock, t(lang, "vpsAdmin.expiryInvalid"));
      const result = owner.control("expiry", state.data.id, by, { expiresAt });
      return result.ok ? view(m, sock, lang, state.data.id) : reply(m, sock, errorText(lang, result.code));
    }
    if (state.step === "limits") {
      const limits = Object.fromEntries(value.split(/[\s,]+/).map((pair) => pair.split("=")).filter(([k, v]) => k && v !== undefined));
      const result = owner.control("limits", state.data.id, by, { limits });
      return result.ok ? view(m, sock, lang, state.data.id) : reply(m, sock, errorText(lang, result.code));
    }
    return false;
  },
  async onCancel(m, { sock }) {
    return reply(m, sock, t(langOf(m), "vpsAdmin.cancelled"));
  },
});

// ═══════════════════════════════════════════════
// الأمر
// ═══════════════════════════════════════════════

/** نتيجة لوحة الإدارة: الحالة الفعلية بعد الإجراء (أو «أُرسل ولم يتأكد» بصدق) */
function adminCard(m, sock, lang, result) {
  if (!result.ok) return reply(m, sock, errorText(lang, result.code));
  const vps = result.data || {};
  return card(m, sock, lang, {
    title: t(lang, "vpsAdmin.adminTitle", { id: vps.vpsId || "" }),
    blocks: [
      t(lang, "vpsAdmin.adminState", { name: vps.hostname || vps.name || "—", status: t(lang, `vpsAdmin.adminStatus_${vps.status || "unknown"}`) }),
      vps.holder ? t(lang, "vpsAdmin.adminHolder") : "",
      result.code === "already" ? t(lang, "vpsAdmin.adminAlready") : result.code === "sent-unverified" ? t(lang, "vpsAdmin.adminUnverified") : "",
    ].filter(Boolean),
  });
}

// ═══════════════════════════════════════════════
// إنشاء VPS حقيقي (V6 §21): تخطيط ← Preflight ← تأكيد ← مهمة خلفية ← تحقق ← ربط بالمشتري
// ═══════════════════════════════════════════════

/** المشتري: رقم واتساب أو tg:<معرّف> ⇒ هوية (بلا تخمين) */
function buyerIdentity(raw) {
  const text = String(raw || "").trim();
  if (/^tg:\d{1,20}$/i.test(text)) return telegramIdentity(text);
  const digits = digitsOf(text);
  return digits.length >= 8 && digits.length <= 15 ? identityOf(`${digits}@s.whatsapp.net`) : null;
}

async function createOrder(m, sock, lang, by, [buyerArg = "", planId = "", osid = "", hostname = "", days = ""]) {
  const prefix = m.prefix || ".";
  const ready = provisioner.readiness();
  const usage = t(lang, "vpsAdmin.provisionUsage", { p: prefix });
  if (!ready.ready) return card(m, sock, lang, { title: t(lang, "vpsAdmin.provisionTitle"), icon: "🆕", blocks: [t(lang, "vpsAdmin.provisionNotReady", { missing: ready.missing.join(" · ") }), usage] });
  if (!buyerArg || !planId || !osid || !hostname) {
    const all = vpsPlans();
    const offered = [...all.standard, ...all.economy].map((p) => UI.bullet(`${p.id} — ${specLine(p)}`, lang)).join("\n");
    return card(m, sock, lang, { title: t(lang, "vpsAdmin.provisionTitle"), icon: "🆕", blocks: [usage, offered] });
  }
  const buyer = buyerIdentity(buyerArg);
  if (!buyer) return reply(m, sock, errorText(lang, "buyer-invalid"));
  // محرّك الصلاحيات نفسه: المالك + مزوّد الإدارة مضبوط (التأكيد بعده بزر لمرة واحدة)
  const decision = decide({ principal: await principalOf({ m, sock }), action: "vps.admin.provision", targets: [buyer] });
  if (decision.decision !== "needs-confirmation" && decision.decision !== "allowed") return reply(m, sock, errorText(lang, decision.reason || decision.decision));
  const planned = await provisioner.planOrder({ by, buyer, planId, osid, hostname, days: /^\d{1,4}$/.test(days) ? Number(days) : 30, channel: "whatsapp" });
  if (!planned.ok) return reply(m, sock, errorText(lang, planned.code));
  const order = planned.data;
  if (planned.code === "duplicate") return reply(m, sock, t(lang, "vpsAdmin.provisionDuplicate", { id: order.id, status: order.status }));
  const plan = planById(order.planId);
  const token = createActionToken({ user: m.sender, action: "vpsadmin", payload: { action: "provision", id: order.id } });
  return card(m, sock, lang, {
    title: t(lang, "vpsAdmin.confirmTitle"),
    icon: "🆕",
    blocks: [t(lang, "vpsAdmin.provisionConfirm", { buyer: buyer.tg ? `TG ${buyer.tg}` : buyer.number || digitsOf(buyerArg), plan: order.planId, spec: plan ? specLine(plan) : "-", osid: order.osid, host: order.hostname, days: order.days })],
    buttons: [
      { id: cmd(m, "vpsadmin", "ok", token), text: `✅ ${t(lang, "vpsAdmin.btnConfirm")}` },
      { id: cmd(m, "vpsadmin", "no", token), text: `✖️ ${t(lang, "vpsAdmin.btnCancel")}` },
    ],
  });
}

function ordersList(m, sock, lang) {
  const orders = provisioner.listOrders().slice(-15).reverse();
  if (!orders.length) return reply(m, sock, t(lang, "vpsAdmin.noOrders"));
  return card(m, sock, lang, {
    title: t(lang, "vpsAdmin.ordersTitle", { count: orders.length }),
    icon: "🧾",
    blocks: [orders.map((o) => UI.bullet(t(lang, "vpsAdmin.orderLine", { id: o.id, status: o.status, host: o.hostname, vps: o.vpsId || "-" }), lang)).join("\n")],
  });
}

/** خطوات تبدأ إدخالاً نصياً: في المجموعة تُفتح الرئيسية في الخاص بدلها (المدخلات تُكتب في الخاص) */
const INPUT_STEPS = new Set(["find", "expiry", "limits"]);

async function handler(m, { sock }) {
  const lang = langOf(m);
  if (m.isGroup) {
    // لوحة المالك لا تُعرض في مجموعة (أرقام المشترين): نفس الطلب يُفتح في خاص المالك
    const args = (m.args || []).map(String);
    const sub = String(args[0] || "").toLowerCase();
    const opensInput = INPUT_STEPS.has(sub) || (sub === "assign" && !args[1]) || (sub === "node" && !args[1]) || (sub === "new" && args[1] && !args[2]);
    const direct = { ...m, chat: m.sender, isGroup: false, raw: null, msg: null, message: null, args: opensInput ? [] : args };
    await reply(m, sock, t(lang, "vpsAdmin.groupRedirect"));
    return handler(direct, { sock });
  }
  const [sub = "", a1 = "", a2 = "", ...rest] = (m.args || []).map(String);
  const by = identityOf(m.sender).canonical;
  switch (sub.toLowerCase()) {
    case "":
      return home(m, sock, lang);
    case "list":
      return listBuyers(m, sock, lang, a1 || null);
    case "view":
      return view(m, sock, lang, a1);
    case "account":
      return account(m, sock, lang, a1.toLowerCase());
    case "vps":
      return vpsCard(m, sock, lang, a1);
    case "new":
      return wizard(m, sock, lang, [a1, a2, ...rest]);
    case "create":
      return createOrder(m, sock, lang, by, [a1, a2, ...rest]);
    case "orders":
      return ordersList(m, sock, lang);
    case "expiring": {
      const soon = expiringSoon(owner.list());
      return entryList(m, sock, lang, t(lang, "vpsAdmin.expiringTitle", { count: soon.length }), soon);
    }
    case "find":
      if (a1) return userCard(m, sock, lang, a1);
      startInput({ user: m.sender, chat: m.chat, flow: "vpsadmin.input", step: "find", data: {} });
      return card(m, sock, lang, { title: t(lang, "vpsAdmin.rowFind"), blocks: [t(lang, "vpsAdmin.findAsk"), t(lang, "vpsAdmin.cancelHint")] });
    case "notify": {
      const e = owner.list().find((x) => x.id === a1);
      if (!e) return reply(m, sock, errorText(lang, "entitlement-not-found"));
      try {
        await notifyBuyer(sock, e);
        return reply(m, sock, t(lang, "vpsAdmin.notified"));
      } catch {
        return reply(m, sock, t(lang, "vpsAdmin.notifyFailed"));
      }
    }
    case "inspect": {
      const digits = a1.replace(/\D/g, "");
      const entries = digits ? owner.inspect(`${digits}@s.whatsapp.net`) : [];
      if (!entries.length) return reply(m, sock, t(lang, "vpsAdmin.noBuyers"));
      return view(m, sock, lang, entries[0].id);
    }
    case "assign":
      if (a1) return doAssign(m, sock, lang, [a1, a2, ...rest]);
      startInput({ user: m.sender, chat: m.chat, flow: "vpsadmin.input", step: "assign", data: {} });
      return card(m, sock, lang, { title: t(lang, "vpsAdmin.btnAssign"), blocks: [t(lang, "vpsAdmin.assignAsk"), t(lang, "vpsAdmin.assignUsage"), t(lang, "vpsAdmin.cancelHint")] });
    case "restore": {
      const result = owner.control("restore", a1, by, {});
      return result.ok ? view(m, sock, lang, a1) : reply(m, sock, errorText(lang, result.code));
    }
    case "suspend":
    case "revoke":
    case "unassign": {
      if (!owner.list().some((e) => e.id === a1)) return reply(m, sock, errorText(lang, "entitlement-not-found"));
      const token = createActionToken({ user: m.sender, action: "vpsadmin", payload: { action: sub.toLowerCase(), id: a1 } });
      return card(m, sock, lang, {
        title: t(lang, "vpsAdmin.confirmTitle"),
        icon: "⚠️",
        blocks: [t(lang, `vpsAdmin.confirm_${sub.toLowerCase()}`)],
        buttons: [
          { id: cmd(m, "vpsadmin", "ok", token), text: `✅ ${t(lang, "vpsAdmin.btnConfirm")}` },
          { id: cmd(m, "vpsadmin", "no", token), text: `✖️ ${t(lang, "vpsAdmin.btnCancel")}` },
        ],
      });
    }
    // ── لوحة الإدارة (4085): حالة/تشغيل/تعليق عند المزوّد نفسه — بتحقق من الحالة بعد كل إجراء ──
    case "node":
      if (!a1) {
        if (!owner.status().admin.enabled) return reply(m, sock, errorText(lang, "admin-disabled"));
        startInput({ user: m.sender, chat: m.chat, flow: "vpsadmin.input", step: "node", data: {} });
        return card(m, sock, lang, { title: t(lang, "vpsAdmin.rowAdminVps"), blocks: [t(lang, "vpsAdmin.adminVpsAsk"), t(lang, "vpsAdmin.cancelHint")] });
      }
      return adminCard(m, sock, lang, await owner.adminInfo(a1));
    case "users": {
      const result = await owner.adminUsers();
      if (!result.ok) return reply(m, sock, errorText(lang, result.code));
      return card(m, sock, lang, { title: t(lang, "vpsAdmin.adminUsersTitle", { count: result.data.length }), blocks: [result.data.slice(0, 40).map((u) => t(lang, "vpsAdmin.adminUserLine", u)).join("\n") || t(lang, "vpsAdmin.noBuyers")] });
    }
    case "power":
    case "hold":
    case "release": {
      const action = sub.toLowerCase() === "power" ? a2.toLowerCase() : sub.toLowerCase();
      if (sub.toLowerCase() === "power" && !["start", "stop", "restart", "poweroff"].includes(action)) return reply(m, sock, errorText(lang, "unknown-action"));
      const info = await owner.adminInfo(a1);
      if (!info.ok) return reply(m, sock, errorText(lang, info.code));
      // التشغيل لا يحتاج تأكيداً؛ الإيقاف/الفصل/إعادة التشغيل/التعليق نعم
      if (action === "start") return adminCard(m, sock, lang, await owner.adminPower(a1, "start"));
      const token = createActionToken({ user: m.sender, action: "vpsadmin", payload: { action: ["admin", action].join("."), id: a1 } });
      return card(m, sock, lang, {
        title: t(lang, "vpsAdmin.confirmTitle"),
        icon: "⚠️",
        blocks: [t(lang, `vpsAdmin.adminConfirm_${action}`, { id: a1, name: info.data.hostname || info.data.name || a1 })],
        buttons: [
          { id: cmd(m, "vpsadmin", "ok", token), text: `✅ ${t(lang, "vpsAdmin.btnConfirm")}` },
          { id: cmd(m, "vpsadmin", "no", token), text: `✖️ ${t(lang, "vpsAdmin.btnCancel")}` },
        ],
      });
    }
    case "ok": {
      const entry = consumeActionToken(m.sender, a1, { action: "vpsadmin" });
      if (!entry) return reply(m, sock, errorText(lang, "token-expired"));
      if (entry.payload.action === "provision") {
        const order = provisioner.getOrder(entry.payload.id);
        if (!order || order.status !== provisioner.STATUS.PLANNED) return reply(m, sock, errorText(lang, order ? "order-not-executable" : "order-not-found"));
        const task = startProvisioning({ orderId: order.id, by, owner: by, scope: m.chat, lang, prefix: m.prefix || "." });
        return reply(m, sock, t(lang, "vpsAdmin.provisionStarted", { task: task.id }));
      }
      const adminAction = String(entry.payload.action || "").match(/^admin\.(\w+)$/)?.[1];
      if (adminAction) {
        const out = adminAction === "hold" || adminAction === "release"
          ? await owner.adminSuspend(entry.payload.id, adminAction === "hold")
          : await owner.adminPower(entry.payload.id, adminAction);
        return adminCard(m, sock, lang, out);
      }
      const result = owner.control(entry.payload.action, entry.payload.id, by, {});
      return result.ok ? view(m, sock, lang, entry.payload.id) : reply(m, sock, errorText(lang, result.code));
    }
    case "no": {
      // إلغاء طلب إنشاء مخطط ينهيه صراحةً (لا يبقى طلب معلّق يمنع نفس اسم المضيف)
      const pending = consumeActionToken(m.sender, a1, { action: "vpsadmin" });
      if (pending?.payload?.action === "provision") provisioner.cancelOrder(pending.payload.id, by);
      dropActionToken(a1);
      return reply(m, sock, t(lang, "vpsAdmin.cancelled"));
    }
    case "expiry":
      startInput({ user: m.sender, chat: m.chat, flow: "vpsadmin.input", step: "expiry", data: { id: a1 } });
      return card(m, sock, lang, { title: t(lang, "vpsAdmin.btnExpiry"), blocks: [t(lang, "vpsAdmin.expiryAsk"), t(lang, "vpsAdmin.cancelHint")] });
    case "limits":
      startInput({ user: m.sender, chat: m.chat, flow: "vpsadmin.input", step: "limits", data: { id: a1 } });
      return card(m, sock, lang, { title: t(lang, "vpsAdmin.btnLimits"), blocks: [t(lang, "vpsAdmin.limitsAsk"), t(lang, "vpsAdmin.cancelHint")] });
    case "features":
      return features(m, sock, lang, a1);
    case "feature": {
      const e = owner.list().find((x) => x.id === a1);
      if (!e) return reply(m, sock, errorText(lang, "entitlement-not-found"));
      const on = e.permissions?.includes(a2);
      const result = owner.control("features", a1, by, on ? { disable: [a2] } : { enable: [a2] });
      return result.ok ? features(m, sock, lang, a1) : reply(m, sock, errorText(lang, result.code));
    }
    default:
      return home(m, sock, lang);
  }
}

export { pluginConfig as config, handler };
