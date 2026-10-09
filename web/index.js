// ═══════════════════════════════════════════════
// 🌐 Terboo Web — مدخل مستقل (npm run web)
// ───────────────────────────────────────────────
// يشغّل خادم الموقع في عملية منفصلة عن البوت. الإجراءات التي تحتاج اتصال واتساب الحيّ لا تتوفر هنا
// (البوت عملية أخرى)؛ كل ما لا يحتاج الاتصال يعمل (دردشة AI، الأدوات، المهام، الملف، VPS للمستخدم).
// داخل عملية البوت يُشغَّل تلقائياً عبر installWeb في index.js مع ربط الجلسة الحيّة.
// ═══════════════════════════════════════════════

import "dotenv/config";
import { startWeb } from "./server.js";
import { initDatabase } from "../src/lib/terboo-database.js";
import { loadPlugins } from "../src/lib/terboo-plugins.js";
import { noteFailure } from "../src/lib/terboo-failure-log.js";

async function main() {
  await initDatabase();
  await loadPlugins(new URL("../plugins", import.meta.url).pathname);
  const { cfg } = await startWeb({ getSocket: null });
  console.log(`🌐 Terboo Web — http://${cfg.host}:${cfg.port}  (standalone; live WhatsApp actions require the bot process)`);
}

main().catch((error) => {
  noteFailure("web", error, { where: "web/index.js:main", stage: "start", fallback: "exit" });
  console.error("❌ Web start failed:", error?.message || error);
  process.exit(1);
});
