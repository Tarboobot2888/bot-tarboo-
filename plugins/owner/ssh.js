// خوادم SSH للمالك: تسجيل آمن (سر مشفّر + بصمة مثبّتة) · تشخيص · أوامر argv بسياسة · نشر مشروع zip
// المنطق كله في src/lib/terboo-ssh-agent.js (يستعمله الكلام الطبيعي وأدوات الذكاء أيضاً)

import { langOf } from "../../src/lib/terboo-cloud-ui.js";
import { handleSshCommand } from "../../src/lib/terboo-ssh-agent.js";

const pluginConfig = {
  name: "ssh",
  alias: ["خوادم_ssh", "sshhosts"],
  category: "owner",
  description: "خوادم SSH: تسجيل آمن بمفتاح/كلمة مرور مشفّرة وبصمة مثبّتة، تشخيص، أوامر بسياسة أمان، ونشر مشروع zip",
  usage: ".ssh | .ssh add <id> user@host[:port] | .ssh status <id> | .ssh run <id> <أمر> | .ssh deploy <id> (مع zip)",
  example: ".ssh status lab",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  return handleSshCommand(m, sock, langOf(m));
}

export { pluginConfig as config, handler };
