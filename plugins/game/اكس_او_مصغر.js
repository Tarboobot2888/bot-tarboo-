// ❌ إكس أو — Mini App مستقلة على محرك TERBOO MINI APPS
// البلوقن رقيق عمداً: أمر ولغة فقط. البناء في src/lib/miniapps/xo.js
// والنقل في src/lib/terboo-miniapp.js — لا بروتوكول ولا CSS هنا (§5).
import { deliverMiniApp } from "../../src/lib/terboo-miniapp.js";
import { getDatabase } from "../../src/lib/terboo-database.js";
import { getUserLanguage } from "../../src/lib/terboo-localization.js";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";

const pluginConfig = {
  name: "اكس_او_مصغر",
  alias: ["xomini", "minixo", "اكس او مصغر"],
  category: "game",
  // عرض مخصص: هذه اللعبة تُسلَّم كرسالة واحدة من deliverMiniApp،
  // فلا تمر من مسار البطاقات العام ولا تُضاف لها أزرار حركة.
  visual: { mode: "html" },
  miniApp: "xo",
  description: "إكس أو تفاعلية ضد الكمبيوتر بثلاث مستويات",
  usage: ".اكس_او_مصغر",
  example: ".اكس_او_مصغر",
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
    noteFailure("miniapp-plugin", error, { where: "plugins/game/اكس_او_مصغر.js:lang", stage: "getUser", fallback: "ar" });
  }
  return deliverMiniApp(sock, m, "xo", { lang });
}

export { pluginConfig as config, handler };
