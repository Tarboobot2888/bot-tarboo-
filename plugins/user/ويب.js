// ═══════════════════════════════════════════════
// 🌐 ويب — تأكيد تسجيل الدخول لموقع Bot Terboo من واتساب (V6 §32)
// ───────────────────────────────────────────────
// المستخدم يطلب الدخول من الموقع ⇒ يظهر له رمز ⇒ يرسله هنا: .ويب <الرمز>
// نطابق الرمز ونربطه بهويته القانونية، فيُصدر الموقع جلسة server-side. لا يُرسل أي سر للموقع.
// ═══════════════════════════════════════════════

import { confirmChallenge } from "../../src/lib/terboo-web-store.js";
import { identityOf } from "../../src/lib/terboo-identity.js";
import { getUserLanguage, t } from "../../src/lib/terboo-localization.js";
import { getDatabase } from "../../src/lib/terboo-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "ويب",
  alias: ["web", "login", "sitelogin", "دخول_الموقع"],
  category: "user",
  description: "تأكيد تسجيل الدخول لموقع Bot Terboo",
  usage: ".ويب <الرمز>",
  example: ".ويب 123456",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: true,
  cooldown: 3, energi: 0, isEnabled: true,
  skipRegistration: true,
};

async function handler(m) {
  const lang = getUserLanguage(getDatabase().getUser(m.sender));
  if (!config.website?.enabled && !process.env.TERBOO_SITE_URL && !config.website?.url) {
    return m.reply(t(lang, "web.disabled"));
  }
  const code = String(m.text || "").trim().replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) return m.reply(t(lang, "web.usage", { p: m.prefix }));
  const identity = identityOf(m.sender);
  if (!identity?.canonical) return m.reply(t(lang, "web.failed"));
  const result = confirmChallenge(code, identity.canonical);
  if (!result.ok) {
    return m.reply(t(lang, result.code === "too-many-attempts" ? "web.tooMany" : "web.invalid"));
  }
  return m.reply(t(lang, "web.confirmed"));
}

export { pluginConfig as config, handler };
