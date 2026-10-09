// 🌐 موقع — تحكّم المالك في موقع Bot Terboo من البوت: الرابط (دومين/IP تلقائي) · المنفذ · تشغيل/إيقاف · SSL
// المنطق كله في src/lib/terboo-site-admin.js

import { handleSiteCommand } from "../../src/lib/terboo-site-admin.js";
import { getUserLanguage } from "../../src/lib/terboo-localization.js";
import { getDatabase } from "../../src/lib/terboo-database.js";

const pluginConfig = {
  name: "موقع",
  alias: ["website", "الموقع", "siteadmin", "موقعي_البوت"],
  category: "owner",
  description: "التحكم في موقع البوت: الرابط (أو IP السيرفر تلقائياً) والمنفذ والتشغيل وشهادة SSL",
  usage: ".موقع | .موقع رابط <https://…|تلقائي> | .موقع منفذ <رقم> | .موقع تشغيل|ايقاف|اعادة | .موقع ssl <cert> <key>|تلقائي|ايقاف",
  example: ".موقع رابط https://terboo.example.com",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const lang = getUserLanguage(getDatabase().getUser(m.sender));
  return handleSiteCommand(m, sock, lang);
}

export { pluginConfig as config, handler };
