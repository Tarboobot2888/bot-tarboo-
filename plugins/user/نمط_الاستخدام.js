// ═══════════════════════════════════════════════
// 🧭 نمط الاستخدام — كيف ستستخدم Terboo؟
// ───────────────────────────────────────────────
// [الاستخدام العام] [إدارة لوحة] [إدارة VPS] [الكل] [استخدام مخصص] [تخصيص لاحقاً]
// بعد الاختيار ⇒ «الرئيسية الشخصية»: أزرار تناسب النمط فقط (العام لا يرى اللوحات ولا VPS).
// يُعرض تلقائياً بعد التسجيل (أو بعد اختيار اللغة إن لم يكن التسجيل مطلوباً)، ويُغيَّر متى شاء.
// ═══════════════════════════════════════════════

import { cmd, footer, langOf, profileOf } from "../../src/lib/terboo-cloud-ui.js";
import { t } from "../../src/lib/terboo-localization.js";
import { MODES, clearDraft, draftOf, setUsage, toggleDraft, usageOf } from "../../src/lib/terboo-profile.js";
import { getDatabase } from "../../src/lib/terboo-database.js";
import { contactUrl } from "../../src/lib/terboo-vps-plans.js";
import { sendCard } from "../../src/lib/terboo-ui-kit.js";
import * as UI from "../../src/lib/terboo-ui-theme.js";

const pluginConfig = {
  name: "usage",
  alias: ["الاستخدام", "نمط_الاستخدام", "uso", "modo"],
  category: "user",
  description: "اختيار نمط استخدامك للبوت لعرض ما يناسبك فقط",
  usage: ".usage",
  example: ".usage general",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
  skipRegistration: true,
};

const FLOW = "usage";
const MODE_ICONS = { general: "✨", panel: "🖥️", vps: "☁️" };

function card(m, sock, lang, options) {
  return sendCard(sock, m, { cardId: "usage", lang, footer: footer(lang), flow: FLOW, ...options });
}

/** بطاقة اختيار النمط */
async function chooser(m, sock, lang) {
  return card(m, sock, lang, {
    title: t(lang, "onboard.usageTitle"),
    icon: "🧭",
    image: "usage",
    blocks: [t(lang, "onboard.usageIntro")],
    buttons: [
      { id: cmd(m, "usage", "general"), text: `✨ ${t(lang, "onboard.usageGeneral")}` },
      { id: cmd(m, "usage", "panel"), text: `🖥️ ${t(lang, "onboard.usagePanel")}` },
      { id: cmd(m, "usage", "vps"), text: `☁️ ${t(lang, "onboard.usageVps")}` },
      { id: cmd(m, "usage", "all"), text: `🌐 ${t(lang, "onboard.usageAll")}` },
      { id: cmd(m, "usage", "custom"), text: `🎛️ ${t(lang, "onboard.usageCustom")}` },
      { id: cmd(m, "usage", "later"), text: `⏭️ ${t(lang, "onboard.usageLater")}` },
    ],
  });
}

/** اختيار مخصص: تبديل الأنماط ثم حفظ */
async function custom(m, sock, lang) {
  const user = getDatabase().getUser(m.sender);
  const draft = draftOf(m.sender, usageOf(user) || []);
  return card(m, sock, lang, {
    title: t(lang, "onboard.customTitle"),
    icon: "🎛️",
    image: "usage",
    blocks: [t(lang, "onboard.customIntro"), MODES.map((mode) => UI.row(`${MODE_ICONS[mode]} ${t(lang, `onboard.mode_${mode}`)}`, draft.has(mode) ? "✅" : "▫️", lang)).join("\n")],
    buttons: [
      ...MODES.map((mode) => ({ id: cmd(m, "usage", "toggle", mode), text: `${draft.has(mode) ? "✅" : "▫️"} ${t(lang, `onboard.mode_${mode}`)}` })),
      { id: cmd(m, "usage", "save"), text: `💾 ${t(lang, "onboard.btnSave")}` },
    ],
  });
}

/** الرئيسية الشخصية حسب النمط */
async function home(m, sock, lang) {
  const profile = profileOf(m);
  const buttons = [];
  const links = [];
  const lines = [];
  if (profile.vps) {
    if (profile.hasActiveVps) {
      buttons.push({ id: cmd(m, "myvps"), text: `☁️ ${t(lang, "onboard.homeMyVps")}` });
      lines.push(UI.bullet(`☁️ ${t(lang, "onboard.homeVpsActive")}`, lang));
    } else {
      buttons.push({ id: cmd(m, "plans"), text: `💎 ${t(lang, "onboard.homePlans")}` });
      const url = contactUrl(t(lang, "plans.contactMessageGeneric"));
      if (url) links.push({ text: `💬 ${t(lang, "plans.btnContact")}`, url });
      lines.push(UI.bullet(`💎 ${t(lang, "onboard.homeVpsNone")}`, lang));
    }
  }
  if (profile.panel) {
    buttons.push(profile.hasPanels
      ? { id: cmd(m, "panels"), text: `🖥️ ${t(lang, "onboard.homeMyPanels")}` }
      : { id: cmd(m, "panels", "add"), text: `➕ ${t(lang, "onboard.homeAddPanel")}` });
    lines.push(UI.bullet(`🖥️ ${t(lang, profile.hasPanels ? "onboard.homePanelsReady" : "onboard.homePanelsNone")}`, lang));
  }
  if (profile.general) lines.push(UI.bullet(`✨ ${t(lang, "onboard.homeGeneral")}`, lang));
  buttons.push({ id: cmd(m, "menu"), text: `📜 ${t(lang, "onboard.homeMenu")}` });
  buttons.push({ id: cmd(m, "usage"), text: `🧭 ${t(lang, "onboard.homeChange")}` });
  const modes = profile.modes.map((mode) => t(lang, `onboard.mode_${mode}`)).join(" · ");
  return card(m, sock, lang, {
    title: t(lang, "onboard.homeTitle"),
    icon: "🏠",
    image: profile.vps && !profile.panel ? "vps" : profile.panel && !profile.vps ? "panel" : "general",
    blocks: [t(lang, "onboard.homeMode", { modes }), lines.join("\n"), t(lang, "onboard.homeAiHint")],
    buttons,
    links,
  });
}

async function handler(m, { sock }) {
  const lang = langOf(m);
  const [sub = "", value = ""] = (m.args || []).map((x) => String(x).toLowerCase());
  switch (sub) {
    case "general":
    case "panel":
    case "vps":
      setUsage(m.sender, [sub]);
      clearDraft(m.sender);
      return home(m, sock, lang);
    case "all":
      setUsage(m.sender, [...MODES]);
      clearDraft(m.sender);
      return home(m, sock, lang);
    case "later":
      setUsage(m.sender, "later");
      clearDraft(m.sender);
      return home(m, sock, lang);
    case "custom":
      return custom(m, sock, lang);
    case "toggle":
      toggleDraft(m.sender, value, usageOf(getDatabase().getUser(m.sender)) || []);
      return custom(m, sock, lang);
    case "save": {
      const draft = [...draftOf(m.sender)];
      setUsage(m.sender, draft.length ? draft : ["general"]);
      clearDraft(m.sender);
      return home(m, sock, lang);
    }
    case "home":
      return home(m, sock, lang);
    default:
      return chooser(m, sock, lang);
  }
}

export { chooser as sendUsageChooser, pluginConfig as config, handler };
