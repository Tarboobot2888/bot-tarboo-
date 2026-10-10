// 🔢 ٢٠٤٨ — Mini App مستقلة على محرك TERBOO MINI APPS
// البلوقن رقيق عمداً: أمر ولغة فقط. البناء في src/lib/miniapps/n2048.js
// والنقل في src/lib/terboo-miniapp-transport.js — لا بروتوكول ولا CSS هنا (§9.3).
import { deliverMiniApp } from "../../src/lib/terboo-miniapp.js";
import { getDatabase } from "../../src/lib/terboo-database.js";
import { getUserLanguage } from "../../src/lib/terboo-localization.js";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";

const pluginConfig = {
  name: "٢٠٤٨",
  alias: ["2048", "n2048", "الفين_واربعين"],
  category: "game",
  // `miniApp` وحده يعلن مسار العرض: رسالة واحدة · بلا أزرار حركة · بلا صورة.
  miniApp: "n2048",
  description: "دمج أرقام تفاعلي حتى 2048",
  usage: ".٢٠٤٨",
  example: ".٢٠٤٨",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  let lang = "ar";
  try {
    lang = getUserLanguage(getDatabase().getUser(m.sender)) || "ar";
  } catch (error) {
    noteFailure("miniapp-plugin", error, { where: "plugins/game/٢٠٤٨.js:lang", stage: "getUser", fallback: "ar" });
  }
  return deliverMiniApp(sock, m, "n2048", { lang });
}

export { pluginConfig as config, handler };
