// 🐍 ثعبان الشبكة — Mini App مستقلة على محرك TERBOO MINI APPS
// البلوقن رقيق عمداً: أمر ولغة فقط. البناء في src/lib/miniapps/snake.js
// والنقل في src/lib/terboo-miniapp-transport.js — لا بروتوكول ولا CSS هنا (§9.3).
import { deliverMiniApp } from "../../src/lib/terboo-miniapp.js";
import { getDatabase } from "../../src/lib/terboo-database.js";
import { getUserLanguage } from "../../src/lib/terboo-localization.js";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";

const pluginConfig = {
  name: "ثعبان_مصغر",
  alias: ["snakemini", "minisnake", "ثعبان مصغر"],
  category: "game",
  // `miniApp` وحده يعلن مسار العرض: رسالة واحدة · بلا أزرار حركة · بلا صورة.
  miniApp: "snake",
  description: "ثعبان تفاعلي على شبكة باللمس",
  usage: ".ثعبان_مصغر",
  example: ".ثعبان_مصغر",
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
    noteFailure("miniapp-plugin", error, { where: "plugins/game/ثعبان_مصغر.js:lang", stage: "getUser", fallback: "ar" });
  }
  return deliverMiniApp(sock, m, "snake", { lang });
}

export { pluginConfig as config, handler };
