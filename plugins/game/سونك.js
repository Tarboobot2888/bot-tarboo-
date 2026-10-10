// 🌀 سونك ران — Mini App مستقلة على محرك TERBOO MINI APPS
// البلوقن رقيق عمداً: أمر ولغة فقط. البناء في src/lib/miniapps/sonic-runner.js
// والنقل في src/lib/terboo-miniapp.js — لا بروتوكول ولا CSS هنا (§5).
import { deliverMiniApp } from "../../src/lib/terboo-miniapp.js";
import { getDatabase } from "../../src/lib/terboo-database.js";
import { getUserLanguage } from "../../src/lib/terboo-localization.js";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";

const pluginConfig = {
  name: "سونك",
  alias: ["sonic", "سونيك", "sonicrun", "جري"],
  category: "game",
  // عرض مخصص: هذه اللعبة تُسلَّم كرسالة واحدة من deliverMiniApp،
  // فلا تمر من مسار البطاقات العام ولا تُضاف لها أزرار حركة.
  visual: { mode: "html" },
  miniApp: "sonic",
  description: "لعبة جري تفاعلية باللمس داخل صفحة Mini App",
  usage: ".سونك",
  example: ".سونك",
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
    noteFailure("miniapp-plugin", error, { where: "plugins/game/سونك.js:lang", stage: "getUser", fallback: "ar" });
  }
  return deliverMiniApp(sock, m, "sonic", { lang });
}

export { pluginConfig as config, handler };
