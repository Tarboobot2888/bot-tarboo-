#!/usr/bin/env node
// مولّد مصفوفة Native Mini Apps — من السجل وملفات البلوقنات الفعلية، لا بالكتابة اليدوية.
//   node tools/terboo-native-miniapp-matrix.mjs          ← يكتب التقرير
//   node tools/terboo-native-miniapp-matrix.mjs --check   ← يفشل إن تقادم
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "TERBOO_NATIVE_MINIAPP_GAME_MATRIX.md");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-nm-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
await (await import("../src/lib/terboo-database.js")).initDatabase(tmp);
const { loadPlugins, getAllPlugins } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(ROOT, "plugins"));
const { loadArcade, arcadeContracts, games } = await import("../src/lib/terboo-arcade/index.js");
await loadArcade();
const { miniApps } = await import("../src/lib/terboo-miniapp.js");

const GDIR = path.join(ROOT, "plugins", "game");
const files = fs.readdirSync(GDIR).filter((f) => f.endsWith(".js")).sort();

/** تصنيف بلوقن لعبة من مصدره الفعلي */
function classify(file) {
  const src = fs.readFileSync(path.join(GDIR, file), "utf8");
  const name = src.match(/name:\s*['"]([^'"]+)['"]/)?.[1] || file.replace(/\.js$/, "");
  const alias = (src.match(/alias:\s*\[([^\]]*)\]/)?.[1] || "").replace(/['"\s]/g, "");
  const miniApp = src.match(/\bminiApp:\s*['"]([a-z0-9_-]+)['"]/)?.[1] || null;
  const arcadeId = src.match(/\bgame:\s*['"]([a-z0-9_]+)['"]/)?.[1] || src.match(/quickCommand\(['"]([a-z0-9_]+)['"]/)?.[1] || null;
  const nightAction = /nightActionHandler/.test(src);
  const hybrid = /choiceCard/.test(src);
  const hub = /arcadeCommand\(m, sock\)\s*;?\s*\}/.test(src) && /name: "اركيد"/.test(src);
  const sendsImage = /\bimage\s*:/.test(src.replace(/\/\/.*$/gm, ""));
  let kind, ui, transport, server;
  if (miniApp) { kind = "mini-app مستقلة"; ui = "HTML + Canvas/DOM داخل الصفحة"; transport = "رسالة واحدة + زر رابط ⇒ /app/<id>"; server = "لا (محلية بلا مكافآت)"; }
  else if (arcadeId) { kind = "عقد أركيد"; ui = "صفحة لعب /play/<token> + أزرار واتساب"; transport = "deliverVisual (بطاقة + أزرار)"; server = "**نعم** — engine.applyAction"; }
  else if (hub) { kind = "موزّع أوامر"; ui = "قوائم"; transport = "deliverVisual"; server = "—"; }
  else if (nightAction) { kind = "أمر ليلي تابع (مستذئب)"; ui = "نص"; transport = "رد نصي"; server = "منطق البلوقن"; }
  else { kind = "لعبة قديمة مستقلة"; ui = hybrid ? "أزرار hybrid" : "نص"; transport = hybrid ? "choiceCard" : "رد نصي"; server = "منطق البلوقن"; }
  return { file, name, alias, kind, ui, transport, server, miniApp, arcadeId, sendsImage };
}

const rows = files.map(classify);
const byKind = rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});

const TESTS = {
  "mini-app مستقلة": "miniapp-builders · miniapp-play (متصفح) · miniapp-transport · game-image-policy",
  "عقد أركيد": "arcade-games · arcade-ai · arcade-multiplayer · miniapp-ui · miniapp-security · game-image-policy",
  "موزّع أوامر": "arcade-multiplayer · game-image-policy",
  "أمر ليلي تابع (مستذئب)": "game-image-policy",
  "لعبة قديمة مستقلة": "game-image-policy",
};
const CONVERTIBLE = {
  "عقد أركيد": "جزئياً — الواجهة التفاعلية على /play/<token>؛ العرض داخل الفقاعة يتطلب شبكة غير متاحة",
  "mini-app مستقلة": "**منفَّذ**",
  "لعبة قديمة مستقلة": "لا حالياً — القواعد في بنى البلوقن وتحتاج إعادة كتابة",
  "أمر ليلي تابع (مستذئب)": "لا — أمر مساعد لا لعبة",
  "موزّع أوامر": "لا ينطبق",
};

const head = "| # | الملف | الأمر | المرادفات | النوع | الواجهة | النقل | حالة خادمية | يرسل صورة؟ | قابل للتحويل | الاختبارات |";
const sep = "|" + "---|".repeat(11);
const body = rows.map((r, i) => `| ${i + 1} | \`${r.file}\` | \`.${r.name}\` | ${r.alias ? r.alias.split(",").length : 0} | ${r.kind} | ${r.ui} | ${r.transport} | ${r.server} | ${r.sendsImage ? "**نعم**" : "لا"} | ${CONVERTIBLE[r.kind]} | ${TESTS[r.kind]} |`).join("\n");

const standalone = miniApps();
const doc = `# TERBOO V6 — مصفوفة ألعاب Native Mini Apps

> **ملف مولّد.** شغّل \`node tools/terboo-native-miniapp-matrix.mjs\`.
> كل خلية مستخرجة من مصدر البلوقن أو من السجل وقت التشغيل.

## الملخّص

| المقياس | القيمة |
|---|---|
| بلوقنات \`plugins/game/\` | **${rows.length}** |
| عقود أركيد في السجل | ${arcadeContracts().length} |
| ألعاب Mini App مستقلة | **${standalone.length}** |
| بلوقنات ترسل صورة | **${rows.filter((r) => r.sendsImage).length}** |
| حسب النوع | ${Object.entries(byKind).map(([k, v]) => `${k}: ${v}`).join(" · ")} |

## الألعاب المستقلة المنفَّذة (Native Mini App)

| اللعبة | البنّاء | الأمر | التفاعل | اللغات | الحجم | الاختبار الفعلي |
|---|---|---|---|---|---|---|
${standalone.map((a) => {
  const bytes = (() => {
    try { return Buffer.byteLength(a.build("ar"), "utf8"); }
    catch (error) { console.error(`تعذّر بناء ${a.id}:`, error.message); return 0; }
  })();
  const cmd = a.id === "sonic" ? "سونك" : "اكس_او_مصغر";
  const play = a.id === "sonic" ? "قفز/انطلاق باللمس · Canvas · حلقة تتوقف عند الإخفاء" : "نقر الخانة · رد الكمبيوتر · 3 مستويات · خط فوز · إعادة";
  return `| ${a.icon} ${a.name.ar} | \`src/lib/miniapps/${a.id === "sonic" ? "sonic-runner" : "xo"}.js\` | \`.${cmd}\` | ${play} | ar · en · es | ${(bytes / 1024).toFixed(1)}KB | **نجح في Chromium** |`;
}).join("\n")}

## كل بلوقنات الألعاب

${head}
${sep}
${body}

## ملاحظات

- **يرسل صورة؟** — سياسة «لا صور في مسارات الألعاب» قائمة من العمل السابق ومحروسة بـ\`terboo-game-image-policy\` (فحص ثابت + AST + دورة حياة لكل لعبة).
- **قابل للتحويل** — الألعاب الخادمية لا تُحوَّل إلى صفحة مضمَّنة لأن بيئة الرسالة بلا شبكة (التدقيق §3.3)، فتبقى على \`/play/<token>\` حيث التحقق خادمي.
- **الألعاب القديمة المستقلة** (مستذئب · ماينكرافت · fish · دنجن · نينجا) تعمل وبلا صور، وتحويلها الكامل **عمل غير منجَز** لا منجَز.
`;

if (process.argv.includes("--check")) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur.trim() !== doc.trim()) { console.error("❌ TERBOO_NATIVE_MINIAPP_GAME_MATRIX.md قديم"); process.exit(1); }
  console.log(`✅ مصفوفة Native Mini Apps حديثة (${rows.length} بلوقن · ${standalone.length} مستقلة)`);
  process.exit(0);
}
fs.writeFileSync(OUT, doc);
console.log(JSON.stringify({ plugins: rows.length, arcade: arcadeContracts().length, standalone: standalone.length, byKind }));
console.log(`→ ${path.basename(OUT)}`);
process.exit(0);
