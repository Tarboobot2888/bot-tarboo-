// ═══════════════════════════════════════════════
// 🧹 Terboo Web — تنظيف دوري (جلسات/تحديات/ملفات منتهية) (V6 §36 §45)
// ───────────────────────────────────────────────
import fs from "node:fs";
import * as store from "../../src/lib/terboo-web-store.js";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";

function startCleanup() {
  const tick = () => {
    try {
      store.prune();
      for (const file of store.expiredFiles()) {
        try { if (file.path && fs.existsSync(file.path)) fs.rmSync(file.path); } catch (error) { noteFailure("web", error, { where: "web/lib/cleanup.js", stage: "rm-file", fallback: "skip" }); }
      }
    } catch (error) {
      noteFailure("web", error, { where: "web/lib/cleanup.js", stage: "tick", fallback: "skip" });
    }
  };
  const timer = setInterval(tick, 5 * 60_000);
  timer.unref?.();
  tick();
  return () => clearInterval(timer);
}

export { startCleanup };
export default { startCleanup };
