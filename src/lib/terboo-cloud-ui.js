// ═══════════════════════════════════════════════
// ☁️ Terboo Cloud — أدوات مشتركة لواجهات VPS واللوحات والباقات
// ───────────────────────────────────────────────
// لغة المستخدم · التذييل الموحّد · رسائل الأخطاء المترجمة لكل رمز · ملف القدرات الحالي.
// لا اسم مزوّد ولا مضيف داخلي في أي نص هنا: «Terboo VPS / Terboo Cloud» فقط.
// ═══════════════════════════════════════════════

import config from "../../config.js";
import * as brand from "./terboo-brand.js";
import { getDatabase } from "./terboo-database.js";
import { identityOf } from "./terboo-identity.js";
import { getUserLanguage, t } from "./terboo-localization.js";
import { capabilityProfile } from "./terboo-profile.js";
import { listPanels } from "./providers/pterodactyl/index.js";
import { activeFor } from "./providers/virtualizor/virtualizor-entitlements.js";
import * as UI from "./terboo-ui-theme.js";

function langOf(m) {
  try {
    return getUserLanguage(getDatabase().getUser(m.sender));
  } catch {
    return "ar";
  }
}

function footer(lang) {
  return UI.footer(brand.plainName(), null, lang);
}

/** أمر زر: البادئة + الأجزاء */
function cmd(m, ...parts) {
  const prefix = (m?.isCommand && m?.prefix) || config.command?.prefix || ".";
  return `${prefix}${parts.filter((p) => p !== undefined && p !== null && p !== "").join(" ")}`;
}

/** رسالة خطأ مترجمة لرمز (مع احتياطي عام) */
function errorText(lang, code, vars = {}) {
  const value = t(lang, `cloudErr.${code}`, vars);
  return value === `cloudErr.${code}` ? t(lang, "cloudErr.generic", { code }) : value;
}

/** حقائق المستخدم الحالية (لوحات مضافة؟ VPS فعّال؟) */
function factsOf(m) {
  const identity = identityOf(m.sender);
  let hasPanels = false;
  let hasActiveVps = false;
  try {
    hasPanels = listPanels(identity).length > 0;
  } catch {
    hasPanels = false;
  }
  try {
    hasActiveVps = activeFor(identity).length > 0;
  } catch {
    hasActiveVps = false;
  }
  return { identity, isOwner: Boolean(m.isOwner), hasPanels, hasActiveVps };
}

/** ملف القدرات للمستخدم الحالي */
function profileOf(m) {
  const facts = factsOf(m);
  let user = null;
  try {
    user = getDatabase().getUser(m.sender);
  } catch {
    user = null;
  }
  return { ...capabilityProfile(user, facts), identity: facts.identity };
}

/** حالة مختصرة برمز */
function stateIcon(state) {
  return { running: "🟢", online: "🟢", offline: "🔴", stopped: "🔴", starting: "🟡", stopping: "🟠", suspended: "⏸️" }[state] || "⚪";
}

export { cmd, errorText, factsOf, footer, langOf, profileOf, stateIcon };
export default { langOf, footer, cmd, errorText, factsOf, profileOf, stateIcon };
