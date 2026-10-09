// ═══════════════════════════════════════════════
// ☁️ Terboo VPS — لوحة تحكم المشتري
// ───────────────────────────────────────────────
// هوية ← صلاحية فعّالة ← ملكية هذا الـVPS ← سياسة الإجراء ← المزوّد (عبر خدمة المستخدم فقط).
// بلا صلاحية: الباقات والتواصل مع المالك (لا تحكم ولا أزرار وهمية).
// المجموعات: الطاقة · الإدارة · الأمان · النظام · الشبكة · النسخ الاحتياطية · الأدوات — المتاح فعلياً فقط.
// الخطِر بزر تأكيد لمرة واحدة · المدخلات الحرة (اسم المضيف · كلمة المرور) بشاشة إدخال.
// ═══════════════════════════════════════════════

import { cmd, errorText, footer, langOf } from "../../src/lib/terboo-cloud-ui.js";
import { createActionToken, consumeActionToken, dropActionToken, endInput, registerFlow, startInput } from "../../src/lib/terboo-flow.js";
import { remember } from "../../src/lib/terboo-context-engine.js";
import { taskOwner } from "../../src/lib/terboo-task-control.js";
import { VPS_WATCHED, watchVpsOperation } from "../../src/lib/terboo-task-runners.js";
import { identityOf } from "../../src/lib/terboo-identity.js";
import { t } from "../../src/lib/terboo-localization.js";
import { capability } from "../../src/lib/providers/virtualizor/virtualizor-capabilities.js";
import { details, listMine, run, templates } from "../../src/lib/providers/virtualizor/virtualizor-user-service.js";
import { contactUrl } from "../../src/lib/terboo-vps-plans.js";
import { sendCard } from "../../src/lib/terboo-ui-kit.js";
import * as UI from "../../src/lib/terboo-ui-theme.js";

const pluginConfig = {
  name: "myvps",
  alias: ["سيرفري", "terboovps", "mivps"],
  category: "cloud",
  description: "لوحة تحكم Terboo VPS الخاص بك: التشغيل والإدارة والأمان",
  usage: ".myvps",
  example: ".myvps",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

const FLOW = "vps";
const GROUP_ICONS = { power: "⚡", management: "🧭", security: "🔐", system: "🛠️", network: "🌐", backups: "🗄️", tools: "🧰" };
const ACTION_ICONS = {
  "vps.start": "▶️", "vps.restart": "🔄", "vps.stop": "⏹️", "vps.poweroff": "⏻", "vps.hostname": "🏷️", "vps.password": "🔑",
  "vps.reinstall": "💿", "vps.services": "🧩", "vps.service.restart": "♻️", "vps.vnc": "🖥️", "vps.backups": "🗄️", "vps.restore": "⏪",
};
const STATUS_ICONS = { running: "🟢", stopped: "🔴", suspended: "⏸️", unknown: "⚪" };

const short = (action) => action.replace(/^vps\./, "").replace(/\./g, "_");

function card(m, sock, lang, { title, icon = "☁️", blocks, buttons = [], select = null, links = [], copies = [] }) {
  return sendCard(sock, m, { cardId: "vps", lang, title, icon, blocks, footer: footer(lang), image: "vps", buttons, select, links, copies, flow: FLOW });
}

async function reply(m, sock, text) {
  return sock.sendMessage(m.chat, { text }, {});
}

function failText(lang, result) {
  if (result.code === "invalid-password") return `${errorText(lang, "invalid-password")}\n${t(lang, `vps.pw_${result.reason || "too-weak"}`)}`;
  return errorText(lang, result.code, { seconds: result.retryAfter });
}

// ═══════════════════════════════════════════════
// الشاشات
// ═══════════════════════════════════════════════

async function noAccess(m, sock, lang) {
  const url = contactUrl(t(lang, "plans.contactMessageGeneric"));
  return card(m, sock, lang, {
    title: t(lang, "vps.title"),
    blocks: [t(lang, "vps.noAccess"), t(lang, "vps.noAccessHint")],
    buttons: [{ id: cmd(m, "plans"), text: `💎 ${t(lang, "vps.btnPlans")}` }],
    links: url ? [{ text: `💬 ${t(lang, "plans.btnContact")}`, url }] : [],
  });
}

async function home(m, sock, lang) {
  const identity = identityOf(m.sender);
  const mine = await listMine(identity);
  if (!mine.ok) return mine.code === "no-entitlement" ? noAccess(m, sock, lang) : reply(m, sock, errorText(lang, mine.code));
  const list = mine.data.vps;
  if (list.length === 1) return dashboard(m, sock, lang, list[0].vpsId);
  // «شغل السيرفر التاني» = الثاني في هذه القائمة بالترتيب المعروض
  remember(m, "list", { kind: "vps", ids: list.map((v) => String(v.vpsId)), names: list.map((v) => v.hostname || v.name || `VPS ${v.vpsId}`) });
  return card(m, sock, lang, {
    title: t(lang, "vps.title"),
    blocks: [
      t(lang, "vps.count", { count: list.length }),
      list.map((v) => UI.row(v.hostname || v.name || `VPS ${v.vpsId}`, `${STATUS_ICONS[v.status] || "⚪"} ${t(lang, `vps.status_${v.status}`)}`, lang)).join("\n"),
      mine.data.live ? "" : t(lang, "vps.liveUnavailable"),
    ],
    select: {
      title: t(lang, "vps.btnChoose"),
      sections: [{ title: t(lang, "vps.title"), rows: list.map((v) => ({ id: cmd(m, "myvps", v.vpsId), title: v.hostname || v.name || `VPS ${v.vpsId}`, description: v.ips?.[0] || v.vpsId })) }],
    },
  });
}

async function dashboard(m, sock, lang, vpsId) {
  const identity = identityOf(m.sender);
  const result = await details(identity, vpsId, { isGroup: m.isGroup });
  if (!result.ok) return result.code === "no-entitlement" ? noAccess(m, sock, lang) : reply(m, sock, errorText(lang, result.code, { seconds: result.retryAfter }));
  const { info, actions, groups } = result.data;
  // سياق الجلسة: «عيد تشغيله · هات حالته · اطفيه» تعني هذا الـVPS
  remember(m, "vps", { vpsId: String(vpsId), name: info.hostname || "" });
  const expires = info.expiresAt ? new Date(info.expiresAt).toISOString().slice(0, 10) : t(lang, "vps.noExpiry");
  const blocks = [[
    UI.row(t(lang, "vps.status"), `${STATUS_ICONS[info.status] || "⚪"} ${t(lang, `vps.status_${info.status}`)}`, lang),
    UI.row(t(lang, "vps.hostname"), info.hostname || "-", lang),
    UI.row(t(lang, "vps.ip"), info.ips?.join(" · ") || "-", lang),
    UI.row(t(lang, "vps.os"), info.os || "-", lang),
    UI.row(t(lang, "vps.resources"), [info.cores ? `${info.cores} vCPU` : "", info.ramMb ? `${Math.round(info.ramMb / 1024)} GB RAM` : "", info.diskGb ? `${info.diskGb} GB` : ""].filter(Boolean).join(" · ") || "-", lang),
    info.uptime ? UI.row(t(lang, "vps.uptime"), info.uptime, lang) : "",
    UI.row(t(lang, "vps.expires"), expires, lang),
  ].filter(Boolean).join("\n")];
  const quick = ["vps.start", "vps.restart"].filter((id) => actions.some((a) => a.id === id) && !(id === "vps.start" && info.status === "running"));
  const buttons = quick.map((id) => ({ id: cmd(m, "myvps", vpsId, "do", id), text: `${ACTION_ICONS[id]} ${t(lang, `vps.act_${short(id)}`)}` }));
  buttons.push({ id: cmd(m, "myvps", vpsId), text: `🔃 ${t(lang, "vps.btnRefresh")}` });
  const sections = groups
    .map((g) => ({
      title: `${GROUP_ICONS[g] || ""} ${t(lang, `vps.group_${g}`)}`.trim(),
      rows: actions.filter((a) => a.group === g).map((a) => ({
        id: cmd(m, "myvps", vpsId, "do", a.id),
        title: `${ACTION_ICONS[a.id] || "•"} ${t(lang, `vps.act_${short(a.id)}`)}`,
        description: t(lang, `vps.hint_${short(a.id)}`),
      })),
    }))
    .filter((s) => s.rows.length);
  if (!sections.length) blocks.push(t(lang, "vps.noActions"));
  return card(m, sock, lang, {
    title: info.hostname || t(lang, "vps.title"),
    blocks,
    buttons,
    select: sections.length ? { title: t(lang, "vps.btnControl"), sections } : null,
  });
}

/** شاشة تأكيد لإجراء خطِر (رمز لمرة واحدة مربوط بالمستخدم) */
async function confirmCard(m, sock, lang, vpsId, action, payload = {}) {
  const token = createActionToken({ user: m.sender, action: "vps", payload: { vpsId, action, ...payload } });
  const cap = capability(action);
  const risk = cap?.riskLevel === "critical" || cap?.riskLevel === "high";
  return card(m, sock, lang, {
    title: t(lang, "vps.confirmTitle"),
    icon: risk ? "⚠️" : "❓",
    blocks: [t(lang, `vps.confirm_${short(action)}`, { value: payload.hostname || payload.osName || payload.service || payload.backup || "" }), t(lang, "vps.confirmExpiry")],
    buttons: [
      { id: cmd(m, "myvps", "ok", token), text: `✅ ${t(lang, "vps.btnConfirm")}` },
      { id: cmd(m, "myvps", "no", token), text: `✖️ ${t(lang, "vps.btnCancel")}` },
    ],
  });
}

/** ينفّذ إجراء (بعد التأكيد إن لزم) ويعرض نتيجته */
async function execute(m, sock, lang, vpsId, action, args = {}, confirmed = false) {
  const identity = identityOf(m.sender);
  const cap = capability(action);
  if (cap?.requiresBackgroundTask) await reply(m, sock, t(lang, "vps.working"));
  const result = await run(identity, vpsId, action, args, { confirmed, isGroup: m.isGroup });
  if (!result.ok) {
    if (result.code === "needs-confirmation") return confirmCard(m, sock, lang, vpsId, action, args);
    return reply(m, sock, failText(lang, result));
  }
  const back = { id: cmd(m, "myvps", vpsId), text: `↩️ ${t(lang, "vps.btnBack")}` };
  switch (action) {
    case "vps.services": {
      const { services, running } = result.data;
      const canRestart = (await details(identity, vpsId, { isGroup: m.isGroup })).data?.actions?.some((a) => a.id === "vps.service.restart");
      return card(m, sock, lang, {
        title: t(lang, "vps.act_services"),
        icon: "🧩",
        blocks: [services.slice(0, 40).map((s) => UI.bullet(`${running.includes(s) ? "🟢" : "⚪"} ${s}`, lang)).join("\n") || t(lang, "vps.emptyList")],
        select: canRestart && services.length ? { title: t(lang, "vps.act_service_restart"), sections: [{ title: t(lang, "vps.act_services"), rows: services.slice(0, 30).map((s) => ({ id: cmd(m, "myvps", vpsId, "svc", s), title: s, description: running.includes(s) ? t(lang, "vps.running") : t(lang, "vps.notRunning") })) }] } : null,
        buttons: [back],
      });
    }
    case "vps.vnc": {
      const v = result.data;
      return card(m, sock, lang, {
        title: t(lang, "vps.act_vnc"),
        icon: "🖥️",
        blocks: [[UI.row(t(lang, "vps.vncAddress"), `${v.ip}:${v.port}`, lang), v.password ? UI.row(t(lang, "vps.vncPassword"), v.password, lang) : ""].filter(Boolean).join("\n"), t(lang, "vps.vncHint")],
        copies: v.password ? [{ text: `📋 ${t(lang, "vps.btnCopyPassword")}`, code: v.password }] : [],
        buttons: [back],
      });
    }
    case "vps.backups": {
      const b = result.data;
      const canRestore = (await details(identity, vpsId, { isGroup: m.isGroup })).data?.actions?.some((a) => a.id === "vps.restore");
      return card(m, sock, lang, {
        title: t(lang, "vps.act_backups"),
        icon: "🗄️",
        blocks: [b.list.slice(0, 30).map((x) => UI.bullet(`🗄️ ${x}`, lang)).join("\n") || t(lang, "vps.emptyList")],
        select: canRestore && b.list.length ? { title: t(lang, "vps.act_restore"), sections: [{ title: t(lang, "vps.act_backups"), rows: b.list.slice(0, 30).map((x) => ({ id: cmd(m, "myvps", vpsId, "restore", x), title: x.slice(0, 60), description: t(lang, "vps.hint_restore") })) }] } : null,
        buttons: [back],
      });
    }
    default:
      // إعادة التثبيت/الاستعادة: مهمة متابعة في الخلفية تبلّغ مرة عند التجهيز ومرة عند الانتهاء (لا spam)
      if (VPS_WATCHED.has(action)) {
        const who = taskOwner(m);
        watchVpsOperation({ owner: who.owner, scope: who.scope, vpsId, action, lang });
      }
      return card(m, sock, lang, {
        title: t(lang, "vps.doneTitle"),
        icon: "✅",
        blocks: [t(lang, `vps.done_${short(action)}`, { value: result.data?.hostname || result.data?.os || result.data?.service || result.data?.backup || "" }), result.data?.onBoot ? t(lang, "vps.onBoot") : ""],
        buttons: [back],
      });
  }
}

/** بداية إجراء من زر: إدخال / اختيار / تأكيد / تنفيذ */
async function begin(m, sock, lang, vpsId, action) {
  const identity = identityOf(m.sender);
  const cap = capability(action);
  if (!cap || cap.layer !== "enduser") return reply(m, sock, errorText(lang, "unknown-action"));
  if (action === "vps.hostname") {
    startInput({ user: m.sender, chat: m.chat, flow: "vps.input", step: "hostname", data: { vpsId } });
    return card(m, sock, lang, { title: t(lang, "vps.act_hostname"), icon: "🏷️", blocks: [t(lang, "vps.askHostname"), t(lang, "vps.cancelHint")] });
  }
  if (action === "vps.password") return confirmCard(m, sock, lang, vpsId, action);
  if (action === "vps.reinstall") {
    const list = await templates(identity, vpsId);
    if (!list.ok) return reply(m, sock, errorText(lang, list.code));
    const byDistro = new Map();
    for (const tpl of list.data.templates) {
      const key = tpl.distro || "other";
      if (!byDistro.has(key)) byDistro.set(key, []);
      byDistro.get(key).push(tpl);
    }
    return card(m, sock, lang, {
      title: t(lang, "vps.act_reinstall"),
      icon: "💿",
      blocks: [t(lang, "vps.chooseOs"), t(lang, "vps.reinstallWarning")],
      select: {
        title: t(lang, "vps.btnChooseOs"),
        sections: [...byDistro.entries()].slice(0, 10).map(([distro, rows]) => ({ title: distro, rows: rows.slice(0, 10).map((tpl) => ({ id: cmd(m, "myvps", vpsId, "os", tpl.osid), title: tpl.name.slice(0, 60), description: `ID ${tpl.osid}` })) })),
      },
      buttons: [{ id: cmd(m, "myvps", vpsId), text: `↩️ ${t(lang, "vps.btnBack")}` }],
    });
  }
  if (cap.requiresConfirmation && !["vps.service.restart", "vps.restore"].includes(action)) return confirmCard(m, sock, lang, vpsId, action);
  return execute(m, sock, lang, vpsId, action);
}

// ═══════════════════════════════════════════════
// تدفقات الإدخال
// ═══════════════════════════════════════════════

registerFlow("vps.input", {
  async onInput(m, { sock }, state) {
    const lang = langOf(m);
    const value = String(m.body || "").trim();
    endInput(m.sender, m.chat);
    const { vpsId } = state.data;
    if (state.step === "hostname") return confirmCard(m, sock, lang, vpsId, "vps.hostname", { hostname: value });
    // كلمة المرور: التأكيد سبق الإدخال ⇒ تنفيذ مباشر (القيمة لا تُخزَّن في أي رمز أو سجل)
    if (state.step === "password") return execute(m, sock, lang, vpsId, "vps.password", { password: value }, true);
    if (state.step === "reinstall") return execute(m, sock, lang, vpsId, "vps.reinstall", { osid: state.data.osid, password: value }, true);
    return false;
  },
  async onCancel(m, { sock }) {
    return reply(m, sock, t(langOf(m), "vps.cancelled"));
  },
});

// ═══════════════════════════════════════════════
// الأمر
// ═══════════════════════════════════════════════

async function handler(m, { sock }) {
  const lang = langOf(m);
  const [first = "", second = "", third = "", ...rest] = (m.args || []).map(String);
  if (!first) return home(m, sock, lang);
  if (first === "ok") {
    const entry = consumeActionToken(m.sender, second, { action: "vps" });
    if (!entry) return reply(m, sock, errorText(lang, "token-expired"));
    const { vpsId, action, ...args } = entry.payload;
    // كلمة المرور بعد التأكيد: شاشة إدخال سرية
    if (action === "vps.password" || action === "vps.reinstall") {
      startInput({ user: m.sender, chat: m.chat, flow: "vps.input", step: action === "vps.password" ? "password" : "reinstall", data: { vpsId, osid: args.osid }, secret: true });
      return card(m, sock, lang, { title: t(lang, `vps.act_${short(action)}`), icon: "🔑", blocks: [t(lang, "vps.askPassword"), UI.bullet(t(lang, "vps.passwordRules"), lang), UI.bullet(t(lang, "vps.passwordSafety"), lang), t(lang, "vps.cancelHint")] });
    }
    return execute(m, sock, lang, vpsId, action, args, true);
  }
  if (first === "no") {
    dropActionToken(second);
    return reply(m, sock, t(lang, "vps.cancelled"));
  }
  const vpsId = first;
  if (!/^\d{1,10}$/.test(vpsId)) return home(m, sock, lang);
  switch (second) {
    case "":
      return dashboard(m, sock, lang, vpsId);
    case "do":
      return begin(m, sock, lang, vpsId, third);
    case "os": {
      const list = await templates(identityOf(m.sender), vpsId);
      const tpl = list.ok ? list.data.templates.find((x) => x.osid === third) : null;
      if (!tpl) return reply(m, sock, errorText(lang, list.ok ? "invalid-template" : list.code));
      return confirmCard(m, sock, lang, vpsId, "vps.reinstall", { osid: tpl.osid, osName: tpl.name });
    }
    case "svc":
      return confirmCard(m, sock, lang, vpsId, "vps.service.restart", { service: [third, ...rest].join(" ").trim() });
    case "restore":
      return confirmCard(m, sock, lang, vpsId, "vps.restore", { backup: [third, ...rest].join(" ").trim() });
    default:
      return dashboard(m, sock, lang, vpsId);
  }
}

export { pluginConfig as config, handler };
