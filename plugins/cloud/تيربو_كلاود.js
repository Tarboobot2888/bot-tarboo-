// ═══════════════════════════════════════════════
// ☁️ Terboo Cloud — الصفحة الرئيسية للسيرفرات واللوحات
// ───────────────────────────────────────────────
// تعرض فقط ما يناسب ملف قدرات المستخدم: VPS (لوحة التحكم أو الباقات) · لوحاتي.
// ═══════════════════════════════════════════════

import { cmd, footer, langOf, profileOf } from "../../src/lib/terboo-cloud-ui.js";
import { t } from "../../src/lib/terboo-localization.js";
import { contactUrl } from "../../src/lib/terboo-vps-plans.js";
import { sendCard } from "../../src/lib/terboo-ui-kit.js";
import * as UI from "../../src/lib/terboo-ui-theme.js";

const pluginConfig = {
  name: "tcloud",
  alias: ["terboocloud", "سحابتي", "nube"],
  category: "cloud",
  description: "Terboo Cloud: سيرفراتك ولوحاتك وباقات VPS في مكان واحد",
  usage: ".tcloud",
  example: ".tcloud",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const lang = langOf(m);
  const profile = profileOf(m);
  const buttons = [];
  const lines = [];
  const links = [];
  if (profile.hasActiveVps) {
    buttons.push({ id: cmd(m, "myvps"), text: `☁️ ${t(lang, "cloud.btnMyVps")}` });
    lines.push(UI.bullet(`☁️ ${t(lang, "cloud.vpsActive")}`, lang));
  } else {
    lines.push(UI.bullet(`💎 ${t(lang, "cloud.vpsNone")}`, lang));
    const url = contactUrl(t(lang, "plans.contactMessageGeneric"));
    if (url) links.push({ text: `💬 ${t(lang, "plans.btnContact")}`, url });
  }
  buttons.push({ id: cmd(m, "plans"), text: `💎 ${t(lang, "cloud.btnPlans")}` });
  if (profile.panel || !profile.general || profile.hasPanels) {
    buttons.push({ id: cmd(m, "panels"), text: `🖥️ ${t(lang, "cloud.btnPanels")}` });
    lines.push(UI.bullet(`🖥️ ${t(lang, profile.hasPanels ? "cloud.panelsReady" : "cloud.panelsNone")}`, lang));
  }
  if (profile.owner) buttons.push({ id: cmd(m, "vpsadmin"), text: `👑 ${t(lang, "cloud.btnOwner")}` });
  return sendCard(sock, m, {
    cardId: "cloud",
    lang,
    title: t(lang, "cloud.title"),
    icon: "☁️",
    image: "cloud",
    blocks: [t(lang, "cloud.intro"), lines.join("\n")],
    footer: footer(lang),
    buttons,
    links,
    flow: "cloud",
  });
}

export { pluginConfig as config, handler };
