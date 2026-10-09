// ═══════════════════════════════════════════════
// ✈️ تشغيل بوت Terboo VPS على تيليجرام (عملية منفصلة عن بوت واتساب)
// ───────────────────────────────────────────────
//   npm run telegram
// الإعداد في config.js → telegram.vps (البيئة تتغلب):
//   TERBOO_TG_VPS_TOKEN · TERBOO_TG_VPS_OWNERS (معرّفات مفصولة بفواصل)
// يشارك بوت واتساب نفس خدمة Virtualizor ونفس سجل الإسناد (data/vps/entitlements.json).
// ═══════════════════════════════════════════════

import "../lib/terboo-secrets-boot.js";
import config from "../../config.js";
import { createVpsBot } from "./tg-vps-bot.js";

const cfg = config.telegram?.vps || {};
const token = String(process.env.TERBOO_TG_VPS_TOKEN || cfg.token || "").trim();
const ownerIds = String(process.env.TERBOO_TG_VPS_OWNERS || "").split(",").map((s) => s.trim()).filter(Boolean);
const owners = ownerIds.length ? ownerIds : (cfg.ownerIds || []).map(String);

if (!token || (cfg.enabled === false && !process.env.TERBOO_TG_VPS_TOKEN)) {
  console.log("[telegram-vps] disabled — set config.telegram.vps.enabled = true and its token (or TERBOO_TG_VPS_TOKEN).");
  process.exit(0);
}
if (!owners.length) console.warn("[telegram-vps] no owner IDs configured — the owner panel is unavailable until telegram.vps.ownerIds is set.");

const bot = createVpsBot({ token, ownerIds: owners, apiBase: cfg.apiBase, defaultLang: cfg.language || "ar" });
const me = await bot.start();
console.log(`[telegram-vps] running as @${me.username} · owners: ${owners.length}`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await bot.stop();
    process.exit(0);
  });
}
