// 🧠 الذاكرة — Mini App مستقلة على محرك TERBOO MINI APPS
// البلوقن رقيق عمداً: أمر ولغة فقط. البناء في src/lib/miniapps/memory.js
// والنقل في src/lib/terboo-miniapp-transport.js — لا بروتوكول ولا CSS هنا (§9.3).
import { deliverMiniApp } from "../../src/lib/terboo-miniapp.js";
import { getDatabase } from "../../src/lib/terboo-database.js";
import { getUserLanguage } from "../../src/lib/terboo-localization.js";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";

const pluginConfig = {
  name: "ذاكرة_مصغرة",
  alias: ["memorymini", "minimemory", "ذاكرة مصغرة"],
  category: "game",
  // `miniApp` وحده يعلن مسار العرض: رسالة واحدة · بلا أزرار حركة · بلا صورة.
  miniApp: "memory",
  description: "لعبة ذاكرة تفاعلية بثمانية أزواج",
  usage: ".ذاكرة_مصغرة",
  example: ".ذاكرة_مصغرة",
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
    noteFailure("miniapp-plugin", error, { where: "plugins/game/ذاكرة_مصغرة.js:lang", stage: "getUser", fallback: "ar" });
  }
  return deliverMiniApp(sock, m, "memory", { lang });
}

export { pluginConfig as config, handler };
