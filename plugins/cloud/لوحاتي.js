// ═══════════════════════════════════════════════
// 🖥️ لوحاتي — ربط وإدارة لوحات Pterodactyl الخاصة بالمستخدم
// ───────────────────────────────────────────────
// [إضافة لوحة] ← [Client API | Application API] ← رابط اللوحة ← مفتاح API ← اختبار الاتصال ← حفظ مشفّر
// كل لوحة: [السيرفرات] [اختبار الاتصال] [إعادة تسمية] [تعديل] [حذف] [الحساب]
// كل سيرفر: الأقسام تظهر فقط إن سمحت بها صلاحيات المفتاح الفعلية.
// الإجراءات الخطِرة بزر تأكيد لمرة واحدة؛ المدخلات الحرة (رابط/مفتاح/اسم/أمر) بشاشة إدخال.
// ═══════════════════════════════════════════════

import { createActionToken, consumeActionToken, dropActionToken, endInput, registerFlow, startInput } from "../../src/lib/terboo-flow.js";
import { cmd, errorText, footer, langOf } from "../../src/lib/terboo-cloud-ui.js";
import { remember } from "../../src/lib/terboo-context-engine.js";
import { t } from "../../src/lib/terboo-localization.js";
import * as P from "../../src/lib/providers/pterodactyl/index.js";
import { sendCard } from "../../src/lib/terboo-ui-kit.js";
import * as UI from "../../src/lib/terboo-ui-theme.js";

const pluginConfig = {
  name: "panels",
  alias: ["لوحاتي", "mypanels", "paneles"],
  category: "cloud",
  description: "ربط لوحات Pterodactyl الخاصة بك وإدارة سيرفراتها بأمان",
  usage: ".panels",
  example: ".panels",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

const FLOW = "panels";
const SECTION_ICONS = { resources: "📊", console: "⌨️", power: "⚡", files: "📁", backups: "🗄️", databases: "🛢️", network: "🌐", startup: "🚀", settings: "⚙️" };

function card(m, sock, lang, { title, icon = "🖥️", blocks, buttons = [], select = null, links = [] }) {
  return sendCard(sock, m, {
    cardId: "panels",
    lang,
    title,
    icon,
    blocks,
    footer: footer(lang),
    image: "panel",
    buttons,
    select,
    links,
    flow: FLOW,
  });
}

function typeLabel(lang, apiType) {
  return t(lang, apiType === "application" ? "panels.typeApplication" : "panels.typeClient");
}

function statusLabel(lang, status) {
  if (status === "connected") return `🟢 ${t(lang, "panels.statusConnected")}`;
  if (String(status || "").startsWith("error:")) return `🔴 ${errorText(lang, status.slice(6))}`;
  return `⚪ ${t(lang, "panels.statusPending")}`;
}

async function reply(m, sock, lang, text) {
  return sock.sendMessage(m.chat, { text }, {});
}

// ═══════════════════════════════════════════════
// الشاشات
// ═══════════════════════════════════════════════

async function home(m, sock, lang) {
  const panels = P.listPanels(m.sender);
  if (!panels.length) {
    return card(m, sock, lang, {
      title: t(lang, "panels.title"),
      blocks: [t(lang, "panels.empty"), t(lang, "panels.emptyHint")],
      buttons: [{ id: cmd(m, "panels", "add"), text: `➕ ${t(lang, "panels.btnAdd")}` }],
    });
  }
  const lines = panels.map((p) => UI.row(`${p.label}`, `${typeLabel(lang, p.apiType)} · ${statusLabel(lang, p.status)}`, lang));
  return card(m, sock, lang, {
    title: t(lang, "panels.title"),
    blocks: [t(lang, "panels.count", { count: panels.length }), lines.join("\n")],
    select: {
      title: t(lang, "panels.btnOpen"),
      sections: [{ title: t(lang, "panels.title"), rows: panels.map((p) => ({ id: cmd(m, "panels", "open", p.id), title: p.label, description: `${typeLabel(lang, p.apiType)} · ${p.host}` })) }],
    },
    buttons: [{ id: cmd(m, "panels", "add"), text: `➕ ${t(lang, "panels.btnAdd")}` }],
  });
}

async function chooseType(m, sock, lang) {
  return card(m, sock, lang, {
    title: t(lang, "panels.addTitle"),
    icon: "➕",
    blocks: [t(lang, "panels.addIntro"), [UI.bullet(`🔑 ${t(lang, "panels.typeClientHint")}`, lang), UI.bullet(`🛡️ ${t(lang, "panels.typeApplicationHint")}`, lang)].join("\n")],
    buttons: [
      { id: cmd(m, "panels", "add", "client"), text: `🔑 ${t(lang, "panels.typeClient")}` },
      { id: cmd(m, "panels", "add", "application"), text: `🛡️ ${t(lang, "panels.typeApplication")}` },
    ],
  });
}

async function askUrl(m, sock, lang, apiType) {
  startInput({ user: m.sender, chat: m.chat, flow: "panels.add", step: "url", data: { apiType } });
  return card(m, sock, lang, {
    title: t(lang, "panels.addTitle"),
    icon: "🔗",
    blocks: [t(lang, "panels.askUrl"), UI.bullet(t(lang, "panels.askUrlHint"), lang), t(lang, "panels.cancelHint")],
  });
}

async function askKey(m, sock, lang, flow, data, apiType) {
  startInput({ user: m.sender, chat: m.chat, flow, step: "key", data, secret: true });
  return card(m, sock, lang, {
    title: t(lang, "panels.keyTitle"),
    icon: "🔑",
    blocks: [
      t(lang, apiType === "application" ? "panels.askKeyApplication" : "panels.askKeyClient"),
      [UI.bullet(t(lang, "panels.keySafety"), lang), UI.bullet(t(lang, "panels.keyDeleteHint"), lang)].join("\n"),
      t(lang, "panels.cancelHint"),
    ],
  });
}

function capabilityLines(lang, panel) {
  const c = panel.capabilities || {};
  if (c.apiType === "client") {
    return [
      UI.row(t(lang, "panels.account"), `${c.account?.username || "-"}${c.account?.admin ? ` · ${t(lang, "panels.adminAccount")}` : ""}`, lang),
      UI.row(t(lang, "panels.servers"), String(c.serverCount ?? 0), lang),
    ].join("\n");
  }
  if (c.apiType === "application") {
    const readable = Object.entries(c.readable || {}).map(([k, v]) => `${v ? "✅" : "⛔"} ${t(lang, `panels.res.${k}`)}`).join(" · ");
    return [UI.row(t(lang, "panels.readAccess"), readable, lang), UI.row(t(lang, "panels.writeAccess"), t(lang, "panels.writeUnverified"), lang)].join("\n");
  }
  return "";
}

async function openPanel(m, sock, lang, panelId) {
  const panel = P.listPanels(m.sender).find((p) => p.id === panelId);
  if (!panel) return reply(m, sock, lang, errorText(lang, "not-found"));
  remember(m, "panel", { panelId: panel.id, label: panel.label });
  const rows = [
    { id: cmd(m, "panels", "edit", panel.id), title: `✏️ ${t(lang, "panels.btnEdit")}`, description: t(lang, "panels.editHint") },
    { id: cmd(m, "panels", "rename", panel.id), title: `🏷️ ${t(lang, "panels.btnRename")}`, description: panel.label },
    { id: cmd(m, "panels", "delete", panel.id), title: `🗑️ ${t(lang, "panels.btnDelete")}`, description: t(lang, "panels.deleteHint") },
  ];
  if (panel.apiType === "client") rows.unshift({ id: cmd(m, "panels", "account", panel.id), title: `👤 ${t(lang, "panels.btnAccount")}`, description: t(lang, "panels.accountHint") });
  return card(m, sock, lang, {
    title: panel.label,
    blocks: [
      [
        UI.row(t(lang, "panels.type"), typeLabel(lang, panel.apiType), lang),
        UI.row(t(lang, "panels.host"), panel.host, lang),
        UI.row(t(lang, "panels.status"), statusLabel(lang, panel.status), lang),
        UI.row(t(lang, "panels.key"), panel.key, lang),
      ].join("\n"),
      capabilityLines(lang, panel),
    ],
    buttons: [
      { id: cmd(m, "panels", "servers", panel.id), text: `🖥️ ${t(lang, "panels.btnServers")}` },
      { id: cmd(m, "panels", "test", panel.id), text: `🔌 ${t(lang, "panels.btnTest")}` },
    ],
    select: { title: t(lang, "panels.btnManage"), sections: [{ title: panel.label, rows }] },
  });
}

async function listServers(m, sock, lang, panelId) {
  const result = await P.servers(m.sender, panelId);
  if (!result.ok) return reply(m, sock, lang, errorText(lang, result.code, { seconds: result.retryAfter }));
  const list = result.data.servers;
  const panel = P.listPanels(m.sender).find((p) => p.id === panelId);
  if (!list.length) return card(m, sock, lang, { title: panel?.label || t(lang, "panels.title"), blocks: [t(lang, "panels.noServers")], buttons: [{ id: cmd(m, "panels", "open", panelId), text: `↩️ ${t(lang, "panels.btnBack")}` }] });
  const shown = list.slice(0, 30);
  // «شغل السيرفر التاني» = الثاني في هذه القائمة بالترتيب المعروض
  remember(m, "list", { kind: "panel-servers", panelId, ids: shown.map((s) => String(s.id)), names: shown.map((s) => s.name) });
  remember(m, "panel", { panelId, label: panel?.label || "" });
  return card(m, sock, lang, {
    title: t(lang, "panels.serversTitle", { panel: panel?.label || "" }),
    blocks: [
      t(lang, "panels.serversCount", { count: list.length }),
      shown.slice(0, 10).map((s) => UI.row(s.name, s.suspended ? `⏸️ ${t(lang, "panels.suspended")}` : s.installing ? `⏳ ${t(lang, "panels.installing")}` : `🟢 ${t(lang, "panels.active")}`, lang)).join("\n"),
    ],
    select: {
      title: t(lang, "panels.btnChooseServer"),
      sections: [{ title: panel?.label || "", rows: shown.map((s) => ({ id: cmd(m, "panels", "server", panelId, s.id), title: s.name.slice(0, 60) || s.id, description: s.id })) }],
    },
    buttons: [{ id: cmd(m, "panels", "open", panelId), text: `↩️ ${t(lang, "panels.btnBack")}` }],
  });
}

async function openServer(m, sock, lang, panelId, serverId) {
  const info = await P.serverInfo(m.sender, panelId, serverId);
  if (!info.ok) return reply(m, sock, lang, errorText(lang, info.code, { seconds: info.retryAfter }));
  const { server, sections, apiType } = info.data;
  // سياق الجلسة: «شغله · عيد تشغيله · هات حالته» تعني هذا السيرفر
  remember(m, "server", { panelId, serverId: String(serverId), name: server.name });
  if (apiType === "application") {
    const action = server.suspended ? "unsuspend" : "suspend";
    return card(m, sock, lang, {
      title: server.name,
      blocks: [[
        UI.row("ID", server.id, lang),
        UI.row(t(lang, "panels.state"), server.suspended ? `⏸️ ${t(lang, "panels.suspended")}` : `🟢 ${t(lang, "panels.active")}`, lang),
        UI.row(t(lang, "panels.memory"), `${server.limits.memory} MB`, lang),
        UI.row(t(lang, "panels.disk"), `${server.limits.disk} MB`, lang),
      ].join("\n")],
      buttons: [
        { id: cmd(m, "panels", "act", panelId, serverId, action), text: server.suspended ? `▶️ ${t(lang, "panels.btnUnsuspend")}` : `⏸️ ${t(lang, "panels.btnSuspend")}` },
        { id: cmd(m, "panels", "servers", panelId), text: `↩️ ${t(lang, "panels.btnBack")}` },
      ],
    });
  }
  let state = "";
  if (sections.includes("resources")) {
    const res = await P.serverAction(m.sender, panelId, serverId, "resources");
    if (res.ok) state = `${res.data.state === "running" ? "🟢" : res.data.state === "offline" ? "🔴" : "🟡"} ${t(lang, `panels.state_${res.data.state}`)} · CPU ${res.data.cpu}% · RAM ${res.data.memory}`;
  }
  const buttons = [];
  if (sections.includes("power")) {
    buttons.push({ id: cmd(m, "panels", "act", panelId, serverId, "power.start"), text: `▶️ ${t(lang, "panels.btnStart")}` });
    buttons.push({ id: cmd(m, "panels", "act", panelId, serverId, "power.restart"), text: `🔄 ${t(lang, "panels.btnRestart")}` });
    buttons.push({ id: cmd(m, "panels", "act", panelId, serverId, "power.stop"), text: `⏹️ ${t(lang, "panels.btnStop")}` });
  }
  const rows = sections
    .filter((s) => s !== "power")
    .map((s) => ({ id: cmd(m, "panels", "act", panelId, serverId, s === "console" ? "command" : s), title: `${SECTION_ICONS[s] || "•"} ${t(lang, `panels.sec_${s}`)}`, description: t(lang, `panels.secHint_${s}`) }));
  return card(m, sock, lang, {
    title: server.name,
    blocks: [[
      state ? UI.row(t(lang, "panels.state"), state, lang) : "",
      UI.row("ID", server.id, lang),
      UI.row(t(lang, "panels.node"), server.node || "-", lang),
      UI.row(t(lang, "panels.access"), info.data.isOwner ? t(lang, "panels.accessOwner") : t(lang, "panels.accessSubuser"), lang),
    ].filter(Boolean).join("\n")],
    buttons,
    select: rows.length ? { title: t(lang, "panels.btnSections"), sections: [{ title: server.name.slice(0, 24), rows }] } : null,
  });
}

/** يعرض نتيجة قسم قراءة */
function sectionBlocks(lang, action, data) {
  switch (action) {
    case "resources":
      return [[
        UI.row(t(lang, "panels.state"), t(lang, `panels.state_${data.state}`), lang),
        UI.row("CPU", `${data.cpu}%`, lang),
        UI.row("RAM", data.memory, lang),
        UI.row(t(lang, "panels.disk"), data.disk, lang),
        UI.row(t(lang, "panels.network"), `↓ ${data.rx} · ↑ ${data.tx}`, lang),
        UI.row(t(lang, "panels.uptime"), `${Math.floor(data.uptimeSec / 3600)}h ${Math.floor((data.uptimeSec % 3600) / 60)}m`, lang),
      ].join("\n")];
    case "files":
      return [UI.row(t(lang, "panels.directory"), data.directory, lang), data.entries.slice(0, 40).map((e) => UI.bullet(`${e.file ? "📄" : "📁"} ${e.name}${e.file ? ` · ${e.size}` : ""}`, lang)).join("\n") || t(lang, "panels.emptyList")];
    case "backups":
      return [data.backups.map((b) => UI.bullet(`${b.done ? "✅" : "⏳"} ${b.name} · ${b.size}`, lang)).join("\n") || t(lang, "panels.emptyList"), t(lang, "panels.backupLimit", { limit: data.limit })];
    case "databases":
      return [data.databases.map((d) => UI.bullet(`🛢️ ${d.name} · ${d.username} · ${d.host}`, lang)).join("\n") || t(lang, "panels.emptyList")];
    case "network":
      return [data.allocations.map((a) => UI.bullet(`${a.primary ? "⭐" : "🔹"} ${a.address}${a.notes ? ` · ${a.notes}` : ""}`, lang)).join("\n") || t(lang, "panels.emptyList")];
    case "startup":
      return [data.variables.map((v) => UI.row(v.label, v.value || "-", lang)).join("\n") || t(lang, "panels.emptyList")];
    default:
      return [t(lang, "panels.done")];
  }
}

const CONFIRM_ACTIONS = new Set(["power.stop", "power.kill", "reinstall", "suspend"]);
const INPUT_ACTIONS = new Set(["command", "rename"]);

async function act(m, sock, lang, panelId, serverId, action, extra = {}) {
  if (action === "settings") {
    return card(m, sock, lang, {
      title: t(lang, "panels.sec_settings"),
      icon: "⚙️",
      blocks: [t(lang, "panels.settingsIntro")],
      buttons: [
        { id: cmd(m, "panels", "act", panelId, serverId, "rename"), text: `🏷️ ${t(lang, "panels.btnRenameServer")}` },
        { id: cmd(m, "panels", "act", panelId, serverId, "reinstall"), text: `♻️ ${t(lang, "panels.btnReinstall")}` },
      ],
    });
  }
  if (INPUT_ACTIONS.has(action) && extra.value === undefined) {
    startInput({ user: m.sender, chat: m.chat, flow: "panels.server", step: action, data: { panelId, serverId } });
    return card(m, sock, lang, {
      title: t(lang, action === "command" ? "panels.sec_console" : "panels.btnRenameServer"),
      icon: action === "command" ? "⌨️" : "🏷️",
      blocks: [t(lang, action === "command" ? "panels.askCommand" : "panels.askServerName"), t(lang, "panels.cancelHint")],
    });
  }
  if (CONFIRM_ACTIONS.has(action) && !extra.confirmed) {
    const token = createActionToken({ user: m.sender, action: "panels.server", payload: { panelId, serverId, action } });
    return card(m, sock, lang, {
      title: t(lang, "panels.confirmTitle"),
      icon: "⚠️",
      blocks: [t(lang, `panels.confirm_${action.replace(".", "_")}`), t(lang, "panels.confirmExpiry")],
      buttons: [
        { id: cmd(m, "panels", "ok", token), text: `✅ ${t(lang, "panels.btnConfirm")}` },
        { id: cmd(m, "panels", "no", token), text: `✖️ ${t(lang, "panels.btnCancel")}` },
      ],
    });
  }
  const args = action === "command" ? { command: extra.value } : action === "rename" ? { name: extra.value } : action === "files" ? { directory: extra.directory || "/" } : {};
  const result = await P.serverAction(m.sender, panelId, serverId, action, args, { confirmed: Boolean(extra.confirmed) });
  if (!result.ok) return reply(m, sock, lang, errorText(lang, result.code, { seconds: result.retryAfter }));
  const back = { id: cmd(m, "panels", "server", panelId, serverId), text: `↩️ ${t(lang, "panels.btnBackServer")}` };
  if (result.code === "done") {
    return card(m, sock, lang, { title: t(lang, "panels.doneTitle"), icon: "✅", blocks: [t(lang, `panels.done_${action.replace(".", "_")}`)], buttons: [back] });
  }
  const buttons = [back];
  if (action === "backups" && result.data && extra.canCreate !== false) buttons.unshift({ id: cmd(m, "panels", "act", panelId, serverId, "backup.create"), text: `➕ ${t(lang, "panels.btnBackupCreate")}` });
  return card(m, sock, lang, { title: t(lang, `panels.sec_${action}`), icon: SECTION_ICONS[action] || "📋", blocks: sectionBlocks(lang, action, result.data), buttons });
}

async function account(m, sock, lang, panelId) {
  const result = await P.serverAction(m.sender, panelId, null, "account");
  if (!result.ok) return reply(m, sock, lang, errorText(lang, result.code, { seconds: result.retryAfter }));
  return card(m, sock, lang, {
    title: t(lang, "panels.btnAccount"),
    icon: "👤",
    blocks: [[UI.row(t(lang, "panels.username"), result.data.username, lang), UI.row(t(lang, "panels.role"), result.data.admin ? t(lang, "panels.adminAccount") : t(lang, "panels.userAccount"), lang)].join("\n")],
    buttons: [{ id: cmd(m, "panels", "open", panelId), text: `↩️ ${t(lang, "panels.btnBack")}` }],
  });
}

async function afterChange(m, sock, lang, result, successKey) {
  if (!result.ok) return reply(m, sock, lang, errorText(lang, result.code, { seconds: result.retryAfter, max: result.max }));
  const panel = result.data.panel;
  return card(m, sock, lang, {
    title: t(lang, successKey),
    icon: "✅",
    blocks: [[UI.row(t(lang, "panels.name"), panel.label, lang), UI.row(t(lang, "panels.type"), typeLabel(lang, panel.apiType), lang), UI.row(t(lang, "panels.key"), panel.key, lang)].join("\n"), capabilityLines(lang, panel)],
    buttons: [
      { id: cmd(m, "panels", "servers", panel.id), text: `🖥️ ${t(lang, "panels.btnServers")}` },
      { id: cmd(m, "panels"), text: `📂 ${t(lang, "panels.title")}` },
    ],
  });
}

// ═══════════════════════════════════════════════
// تدفقات الإدخال
// ═══════════════════════════════════════════════

registerFlow("panels.add", {
  async onInput(m, { sock }, state) {
    const lang = langOf(m);
    const value = String(m.body || "").trim();
    if (state.step === "url") {
      const check = P.validateBaseUrl(value);
      if (!check.ok) {
        startInput({ user: m.sender, chat: m.chat, flow: "panels.add", step: "url", data: state.data });
        return reply(m, sock, lang, `${errorText(lang, check.code)}\n${t(lang, "panels.tryAgainOrCancel")}`);
      }
      return askKey(m, sock, lang, "panels.add", { ...state.data, baseUrl: check.data.baseUrl }, state.data.apiType);
    }
    endInput(m.sender, m.chat);
    await reply(m, sock, lang, t(lang, "panels.testing"));
    const result = await P.addPanel(m.sender, { baseUrl: state.data.baseUrl, apiType: state.data.apiType, apiKey: value });
    if (!result.ok) {
      return card(m, sock, lang, {
        title: t(lang, "panels.addFailed"),
        icon: "⛔",
        blocks: [errorText(lang, result.code, { seconds: result.retryAfter, max: result.max }), t(lang, "panels.nothingSaved")],
        buttons: [{ id: cmd(m, "panels", "add", state.data.apiType), text: `🔁 ${t(lang, "panels.btnRetry")}` }],
      });
    }
    return afterChange(m, sock, lang, result, "panels.added");
  },
  async onCancel(m, { sock }) {
    return reply(m, sock, langOf(m), t(langOf(m), "panels.cancelled"));
  },
});

registerFlow("panels.edit", {
  async onInput(m, { sock }, state) {
    const lang = langOf(m);
    const value = String(m.body || "").trim();
    endInput(m.sender, m.chat);
    if (state.step === "label") {
      const result = P.renamePanel(m.sender, state.data.panelId, value);
      return result.ok ? openPanel(m, sock, lang, state.data.panelId) : reply(m, sock, lang, errorText(lang, result.code));
    }
    await reply(m, sock, lang, t(lang, "panels.testing"));
    const result = state.step === "url"
      ? await P.updateUrl(m.sender, state.data.panelId, value)
      : await P.replaceKey(m.sender, state.data.panelId, value);
    return afterChange(m, sock, lang, result, state.step === "url" ? "panels.urlUpdated" : "panels.keyReplaced");
  },
  async onCancel(m, { sock }) {
    return reply(m, sock, langOf(m), t(langOf(m), "panels.cancelled"));
  },
});

registerFlow("panels.server", {
  async onInput(m, { sock }, state) {
    const lang = langOf(m);
    endInput(m.sender, m.chat);
    return act(m, sock, lang, state.data.panelId, state.data.serverId, state.step, { value: String(m.body || "").trim() });
  },
  async onCancel(m, { sock }) {
    return reply(m, sock, langOf(m), t(langOf(m), "panels.cancelled"));
  },
});

// ═══════════════════════════════════════════════
// الأمر
// ═══════════════════════════════════════════════

async function handler(m, { sock }) {
  const lang = langOf(m);
  const [sub = "", a1 = "", a2 = "", a3 = "", ...rest] = (m.args || []).map(String);
  switch (sub.toLowerCase()) {
    case "":
    case "list":
      return home(m, sock, lang);
    case "add":
      if (a1 === "client" || a1 === "application") return askUrl(m, sock, lang, a1);
      return chooseType(m, sock, lang);
    case "open":
      return openPanel(m, sock, lang, a1);
    case "test": {
      await reply(m, sock, lang, t(lang, "panels.testing"));
      const result = await P.testPanel(m.sender, a1);
      return result.ok ? afterChange(m, sock, lang, result, "panels.testOk") : reply(m, sock, lang, errorText(lang, result.code, { seconds: result.retryAfter }));
    }
    case "rename":
      if (!P.listPanels(m.sender).some((p) => p.id === a1)) return reply(m, sock, lang, errorText(lang, "not-found"));
      startInput({ user: m.sender, chat: m.chat, flow: "panels.edit", step: "label", data: { panelId: a1 } });
      return card(m, sock, lang, { title: t(lang, "panels.btnRename"), icon: "🏷️", blocks: [t(lang, "panels.askLabel"), t(lang, "panels.cancelHint")] });
    case "edit": {
      const panel = P.listPanels(m.sender).find((p) => p.id === a1);
      if (!panel) return reply(m, sock, lang, errorText(lang, "not-found"));
      if (a2 === "url") {
        startInput({ user: m.sender, chat: m.chat, flow: "panels.edit", step: "url", data: { panelId: a1 } });
        return card(m, sock, lang, { title: t(lang, "panels.btnEditUrl"), icon: "🔗", blocks: [t(lang, "panels.askUrl"), UI.bullet(t(lang, "panels.askUrlHint"), lang), t(lang, "panels.cancelHint")] });
      }
      if (a2 === "key") return askKey(m, sock, lang, "panels.edit", { panelId: a1 }, panel.apiType);
      return card(m, sock, lang, {
        title: t(lang, "panels.btnEdit"),
        icon: "✏️",
        blocks: [t(lang, "panels.editIntro", { panel: panel.label })],
        buttons: [
          { id: cmd(m, "panels", "edit", a1, "url"), text: `🔗 ${t(lang, "panels.btnEditUrl")}` },
          { id: cmd(m, "panels", "edit", a1, "key"), text: `🔑 ${t(lang, "panels.btnEditKey")}` },
        ],
      });
    }
    case "delete": {
      const panel = P.listPanels(m.sender).find((p) => p.id === a1);
      if (!panel) return reply(m, sock, lang, errorText(lang, "not-found"));
      const token = createActionToken({ user: m.sender, action: "panels.delete", payload: { panelId: a1 } });
      return card(m, sock, lang, {
        title: t(lang, "panels.confirmTitle"),
        icon: "⚠️",
        blocks: [t(lang, "panels.confirmDelete", { panel: panel.label }), t(lang, "panels.confirmExpiry")],
        buttons: [
          { id: cmd(m, "panels", "ok", token), text: `🗑️ ${t(lang, "panels.btnDelete")}` },
          { id: cmd(m, "panels", "no", token), text: `✖️ ${t(lang, "panels.btnCancel")}` },
        ],
      });
    }
    case "ok": {
      const entry = consumeActionToken(m.sender, a1);
      if (!entry) return reply(m, sock, lang, errorText(lang, "token-expired"));
      if (entry.action === "panels.delete") {
        const result = P.deletePanel(m.sender, entry.payload.panelId);
        if (!result.ok) return reply(m, sock, lang, errorText(lang, result.code));
        await reply(m, sock, lang, t(lang, "panels.deleted", { panel: result.data.label }));
        return home(m, sock, lang);
      }
      if (entry.action === "panels.server") return act(m, sock, lang, entry.payload.panelId, entry.payload.serverId, entry.payload.action, { confirmed: true });
      return reply(m, sock, lang, errorText(lang, "token-expired"));
    }
    case "no":
      dropActionToken(a1);
      return reply(m, sock, lang, t(lang, "panels.cancelled"));
    case "servers":
      return listServers(m, sock, lang, a1);
    case "server":
      return openServer(m, sock, lang, a1, a2);
    case "act":
      return act(m, sock, lang, a1, a2, a3, a3 === "files" ? { directory: rest.join(" ") || "/" } : {});
    case "account":
      return account(m, sock, lang, a1);
    default:
      return home(m, sock, lang);
  }
}

export { pluginConfig as config, handler };
