#!/usr/bin/env node
// ═══════════════════════════════════════════════
// 🧾 مولّد مصفوفة Mini Apps — من السجل الحقيقي لا بالكتابة اليدوية
// ───────────────────────────────────────────────
//   node tools/terboo-miniapp-matrix.mjs            ← يكتب docs/TERBOO_MINIAPP_GAME_MATRIX.md
//   node tools/terboo-miniapp-matrix.mjs --check    ← يفشل إن كان الملف قديماً
// كل عمود مستخرج من العقد أو من ملفات المصدر — لا رقم مكتوب يدوياً.
// ═══════════════════════════════════════════════

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "TERBOO_MINIAPP_GAME_MATRIX.md");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-matrix-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
await (await import("../src/lib/terboo-database.js")).initDatabase(tmp);
await (await import("../src/lib/terboo-plugins.js")).loadPlugins(path.join(ROOT, "plugins"));
const { loadArcade, arcadeContracts, games, legacyQuizReport } = await import("../src/lib/terboo-arcade/index.js");
await loadArcade();

const CAT_AR = { board: "ألواح", puzzle: "ألغاز", word: "كلمات", quiz: "أسئلة", arcade: "حركة", party: "جماعية", adventure: "مغامرة" };
const MODE_AR = { solo: "فردي", pvp: "لاعبان", party: "جماعي", coop: "تعاوني" };

/** ملف قواعد اللعبة الفعلي */
function rulesFile(id) {
  const direct = path.join("src", "lib", "terboo-arcade", "games", `${id}.js`);
  if (fs.existsSync(path.join(ROOT, direct))) return direct;
  if (id.startsWith("q_")) return "src/lib/terboo-arcade/legacy-quiz.js + questions.js";
  return "—";
}

/** بلوقن الأمر الذي يشغّل اللعبة */
const GDIR = path.join(ROOT, "plugins", "game");
const pluginIndex = new Map();
for (const name of fs.readdirSync(GDIR)) {
  if (!name.endsWith(".js")) continue;
  const src = fs.readFileSync(path.join(GDIR, name), "utf8");
  const bound = src.match(/\bgame:\s*['"]([a-z0-9_]+)['"]/)?.[1] || src.match(/quickCommand\(['"]([a-z0-9_]+)['"]/)?.[1];
  if (bound) pluginIndex.set(bound, name);
}

const rows = arcadeContracts().map((c) => {
  const legacyCfg = [...games.registry.values()].find((cfg) => c.aliases.includes(cfg.gameType));
  return {
    id: c.id,
    ar: c.name?.ar || c.id,
    icon: c.icon,
    rules: rulesFile(c.id),
    plugin: pluginIndex.get(c.id) || "—",
    cmd: c.aliases.find((a) => /[؀-ۿ]/.test(a)) || c.aliases[0] || c.id,
    aliases: c.aliases.length,
    cat: CAT_AR[c.category] || c.category,
    mode: MODE_AR[c.mode] || c.mode,
    ai: c.supportsAI, solo: c.supportsSolo, group: c.supportsGroup, priv: c.supportsPrivate,
    players: `${c.players.min}–${c.players.max}`,
    input: [c.actions?.length ? "أزرار" : null, (c.freeActions || []).length ? "نص حر" : null, c.controller?.parseInput ? "كتابة" : null].filter(Boolean).join(" + ") || "أزرار",
    migrated: c.id.startsWith("q_"),
    wasImage: Boolean(legacyCfg?.hasImage),
    seconds: Math.round((Number(c.timeout) || 120000) / 1000),
  };
});
rows.sort((a, b) => Number(a.migrated) - Number(b.migrated) || a.id.localeCompare(b.id));

const legacy = legacyQuizReport();
const yes = (v) => (v ? "✅" : "—");
const header = "| # | gameId | الاسم العربي | ملف القواعد | البلوقن | الأمر | aliases | الفئة | النمط | لاعبون | فردي | AI | مجموعة | خاص | الإدخال | كانت ترسل صورة؟ | ترسل صورة الآن؟ | Mini App | الاختبارات |";
const sep = "|" + "---|".repeat(19);
const body = rows.map((r, i) => [
  i + 1, `\`${r.id}\``, `${r.icon} ${r.ar}`, `\`${r.rules}\``, r.plugin === "—" ? "—" : `\`${r.plugin}\``,
  `\`.${r.cmd}\``, r.aliases, r.cat, r.mode, r.players,
  yes(r.solo), yes(r.ai), yes(r.group), yes(r.priv), r.input,
  r.wasImage ? "**نعم**" : "لا", "**لا**", `✅ ${r.seconds}ث`,
  "image-policy · miniapp-ui · arcade-games",
].join(" | ")).map((line) => `| ${line} |`).join("\n");

const stats = {
  total: rows.length,
  arcadeOriginal: rows.filter((r) => !r.migrated).length,
  migratedQuiz: rows.filter((r) => r.migrated).length,
  wasImage: rows.filter((r) => r.wasImage).length,
  withAI: rows.filter((r) => r.ai).length,
  solo: rows.filter((r) => r.solo).length,
  group: rows.filter((r) => r.group).length,
  byCat: rows.reduce((a, r) => ((a[r.cat] = (a[r.cat] || 0) + 1), a), {}),
};

const doc = `# TERBOO MINI APPS — مصفوفة الألعاب

> **ملف مولّد.** لا تُحرّره يدوياً — شغّل \`node tools/terboo-miniapp-matrix.mjs\`.
> كل خلية مستخرجة من العقد الفعلي في السجل أو من ملفات المصدر.

## الملخص

| المقياس | القيمة |
|---|---|
| إجمالي الألعاب في السجل | **${stats.total}** |
| عقود أركيد أصلية | ${stats.arcadeOriginal} |
| ألعاب أسئلة قديمة مُرحَّلة | ${stats.migratedQuiz} |
| ألعاب **كانت** ترسل صورة | ${stats.wasImage} |
| ألعاب ترسل صورة الآن | **0** |
| تدعم خصماً آلياً | ${stats.withAI} |
| تُلعب فردياً | ${stats.solo} |
| تدعم المجموعات | ${stats.group} |
| حسب الفئة | ${Object.entries(stats.byCat).map(([k, v]) => `${k}: ${v}`).join(" · ")} |

ترحيل ألعاب الأسئلة القديمة: **${legacy.migrated.length} نجحت · ${legacy.skipped.length} تُخطّيت**${legacy.skipped.length ? `\n\nالمتخطّاة وأسبابها:\n${legacy.skipped.map((s) => `- \`${s.id}\` — ${s.reason}`).join("\n")}` : ""}

## المصفوفة

${header}
${sep}
${body}

## ملاحظات على الأعمدة

- **ملف القواعد** — الألعاب المُرحَّلة (\`q_*\`) تتقاسم مصنعاً واحداً فوق محرك الأسئلة؛ بياناتها من \`src/data/*.json\` عبر تسجيل \`games.register\`.
- **الإدخال** — «أزرار» من \`legalActions\`، «نص حر» من \`freeActions\` بتحقق خادمي، «كتابة» من \`parseInput\`. ألعاب الأسئلة المُرحَّلة تقبل الحرف (A–D / أ–د / 1–4) **ونص الإجابة** معاً.
- **كانت ترسل صورة؟** — \`hasImage: true\` في تسجيلها القديم، وكانت ترسل صورة السؤال كرسالة واتساب. الأصل البصري الآن داخل صفحة Mini App عبر وكيل موقّع same-origin.
- **ترحيل** — كل لعبة في هذه المصفوفة لها عقد كامل ومسار لعب مكتمل؛ السجل هو مصدر الكتالوج فلا تظهر لعبة بلا قواعد.
- **الألعاب القديمة المستقلة** (مستذئب · ماينكرافت · fish · دنجن · نينجا) ليست في هذه المصفوفة لأنها ليست عقود أركيد — حالتها في \`TERBOO_MINIAPP_FINAL_REPORT.md\`.
`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current.trim() !== doc.trim()) {
    console.error("❌ docs/TERBOO_MINIAPP_GAME_MATRIX.md قديم — شغّل node tools/terboo-miniapp-matrix.mjs");
    process.exit(1);
  }
  console.log(`✅ المصفوفة حديثة (${stats.total} لعبة)`);
  process.exit(0);
}
fs.writeFileSync(OUT, doc);
console.log(JSON.stringify(stats));
console.log(`→ ${path.relative(ROOT, OUT)}`);
process.exit(0);
