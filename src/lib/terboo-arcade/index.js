// ═══════════════════════════════════════════════
// 🎮 TERBOO ARCADE — تحميل ألعاب المحرك في السجل الوحيد (games)
// ───────────────────────────────────────────────
// كل ملف في terboo-arcade/games/*.js يصدّر تعريف لعبة (default) ⇒ defineGame ⇒ games.registerGame.
// لا سجل موازٍ: games.contracts() يعرض ألعاب الأركيد + ألعاب الأسئلة القديمة معاً.
// ═══════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { games } from "../terboo-games.js";
import { noteFailure } from "../terboo-failure-log.js";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "games");
let loading = null;

async function loadArcade() {
  if (loading) return loading;
  loading = (async () => {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js") && !f.startsWith("_")).sort();
    const loaded = [];
    for (const file of files) {
      try {
        const mod = await import(pathToFileURL(path.join(DIR, file)).href);
        if (mod.default) loaded.push(games.registerGame(mod.default).id);
      } catch (error) {
        noteFailure("arcade", error, { where: "terboo-arcade/index:loadArcade", stage: file, fallback: "game-skipped" });
      }
    }
    return loaded;
  })();
  return loading;
}

/** عقود الأركيد فقط (بلا ألعاب الأسئلة القديمة) */
function arcadeContracts() {
  return [...games.arcade.values()];
}

export { arcadeContracts, games, loadArcade };
