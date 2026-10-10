#!/usr/bin/env node
// ═══════════════════════════════════════════════
// 🎮 مصفوفة ألعاب Mini Apps — مولَّدة من الكود الحيّ (§8 · §13 · §17.5)
// ───────────────────────────────────────────────
//   node tools/terboo-game-miniapp-matrix.mjs [--check]
//
// كل خلية محسوبة: من سجل MINI_APPS، ومن سجل عقود الأركيد، ومن config كل بلوقن،
// ومن قياس فعلي لمستند كل Mini App (بايتات السلك + مدقّق المحيط).
// التصنيف إلى فئات §13 مشتق من مصدر الحالة لا من رأي.
// ═══════════════════════════════════════════════

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "TERBOO_GAME_MINIAPP_MATRIX.md");
const CHECK = process.argv.includes("--check");

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-game-matrix-"));
process.env.TERBOO_LID_CACHE_PATH = path.join(sandbox, "lid.json");
process.env.TERBOO_TASKS_PATH = path.join(sandbox, "tasks.json");
// يُحذف المجلد عند الخروج لا قبله: الكاتب المؤجَّل في قاعدة البيانات ينبض بعد
// 5 ثوان، وحذف المجلد قبل ذلك يُنتج تحذيرات ENOENT تُشوّه مخرج `--check`.
process.on("exit", () => { try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch { /* المجلد مؤقّت */ } });

const { initDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(sandbox);
const { loadPlugins, getAllPlugins } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(ROOT, "plugins"));
const { games } = await import("../src/lib/terboo-games.js");
const { MINI_APPS, renderMiniApp } = await import("../src/lib/terboo-miniapp.js");
const { auditWebViewHtml } = await import("../src/lib/terboo-webview-budget.js");

const nameOf = (cfg) => (Array.isArray(cfg?.name) ? cfg.name[0] : cfg?.name) || "";
const plugins = getAllPlugins().filter((p) => p.config?.category === "game");
const contracts = games.contracts();
const contractById = new Map(contracts.map((c) => [c.id, c]));

/**
 * فئة البيانات حسب §13. مصدر الحالة هو ما يحدّدها لا شكل الواجهة.
 *
 * ملاحظة على الإشارة المستعملة: `supportsGroup` **لا يصلح** للفرز — تعريفه في
 * contract.js هو `def.supportsGroup !== false` أي أنه true افتراضياً لكل لعبة،
 * فاستعماله كان سيضع 45 لعبة في خانة «جماعية متزامنة» وهو وصف كاذب.
 * الإشارة الصحيحة: `players.max` (هل تحتاج بشرين فعلاً؟) و`sessionType`
 * (`simultaneous` تعني لعباً متزامناً لا أدواراً متبادلة).
 */
function dataClass(entry) {
  if (entry.kind === "mini-app") return { id: 1, label: "محلية بالكامل", note: "لا حالة خادمية ولا مكافآت ولا ترتيب" };
  const c = entry.contract;
  if (c) {
    const humans = Number(c.players?.max || 1);
    if (humans > 1 || c.sessionType === "simultaneous") {
      return { id: 3, label: "جماعية متزامنة", note: `${humans} لاعباً · ${c.sessionType} ⇒ حالة مشتركة بين بشر` };
    }
    return { id: 2, label: "مرتبطة بالخادم", note: `فرد ضد المحرّك · ${c.sessionType} · الحالة والمكافأة من engine.applyAction` };
  }
  return { id: 2, label: "مرتبطة بالخادم", note: "منطق وحالة ومكافآت داخل البلوقن" };
}

/** صلاحية النقل المضمَّن لكل فئة — من قيود المحيط المقيسة لا من تمنٍّ */
function transportFit(cls) {
  if (cls.id === 1) return { fit: "**منفَّذ**", why: "المنطق كله محلي: لا تحتاج شبكة ولا تخزيناً" };
  if (cls.id === 2) return { fit: "محجوب", why: "الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة" };
  return { fit: "محجوب", why: "لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer" };
}

const rows = [];
for (const plugin of plugins) {
  const cfg = plugin.config;
  const name = nameOf(cfg);
  const app = cfg.miniApp ? MINI_APPS.get(cfg.miniApp) : null;
  const contract = cfg.game ? contractById.get(cfg.game) : games.resolve(name) || null;
  const kind = app ? "mini-app" : contract ? "arcade-contract" : "standalone";
  const entry = { name, cfg, app, contract, kind };
  const cls = dataClass(entry);
  const fit = transportFit(cls);

  let size = "—";
  let audit = "—";
  if (app) {
    const built = renderMiniApp(app.id, { lang: "ar" });
    if (built.ok) {
      const a = auditWebViewHtml(built.html, { height: app.height });
      size = `${Math.round(a.wire / 1024)}KB`;
      audit = a.ok ? "نظيف" : `❌ ${a.problems.length}`;
    } else size = `بناء فاشل (${built.code})`;
  }

  rows.push({
    id: app ? app.id : contract ? contract.id : `legacy:${name}`,
    ar: app ? app.name.ar : contract ? (contract.name?.ar || name) : name,
    en: app ? app.name.en : contract ? (contract.name?.en || "—") : "—",
    aliases: (cfg.alias || []).length,
    command: `.${name}`,
    file: `plugins/game/${path.basename(plugin.file || `${name}.js`)}`,
    builder: app ? `src/lib/miniapps/${app.id === "n2048" ? "n2048" : app.id}.js` : "—",
    hasApp: app ? "✅ نعم" : "لا",
    cls, fit, size, audit,
    tests: app ? "miniapp-builders · miniapp-play (متصفح) · miniapp-transport · webview-budget"
      : contract ? "arcade-games · arcade-ai · arcade-multiplayer · game-image-policy"
        : "game-image-policy",
  });
}
rows.sort((a, b) => (a.cls.id - b.cls.id) || a.command.localeCompare(b.command));

const miniRows = rows.filter((r) => r.hasApp.startsWith("✅"));
const tally = rows.reduce((acc, r) => ({ ...acc, [r.cls.label]: (acc[r.cls.label] || 0) + 1 }), {});

const doc = `# TERBOO — مصفوفة ألعاب Mini Apps

> **ملف مولّد** بـ\`node tools/terboo-game-miniapp-matrix.mjs\`. لا رقم مكتوب يدوياً:
> الأسماء والأوامر والمرادفات من \`config\` كل بلوقن، والعقود من السجل الحيّ،
> والأحجام من قياس فعلي للمستند، و«نظيف» من \`auditWebViewHtml\`.

## الحصيلة

| المقياس | القيمة |
|---|---|
| بلوقنات فئة \`game\` | **${plugins.length}** |
| عقود أركيد في السجل | ${contracts.length} |
| ألعاب لها Mini App مضمَّنة منفَّذة | **${miniRows.length}** |
| الفئة 1 — محلية بالكامل | ${tally["محلية بالكامل"] || 0} |
| الفئة 2 — مرتبطة بالخادم | ${tally["مرتبطة بالخادم"] || 0} |
| الفئة 3 — جماعية متزامنة | ${tally["جماعية متزامنة"] || 0} |

## لماذا الفئتان 2 و3 محجوبتان عن النقل المضمَّن

ليست مسألة وقت تنفيذ. الصفحة داخل الفقاعة تعمل في **أصل معتم بلا شبكة**:
\`fetch\` و XHR و \`WebSocket\` و \`sendBeacon\` كلها ميتة بلا إشعار، وكل واجهات
التخزين ترمي \`SecurityError\`. فلعبة تحتاج قراءة حالة من الخادم أو كتابة مكافأة
أو مزامنة خصم **لا تستطيع ذلك من هناك**، ورسم لوحتها داخل الفقاعة يُنتج واجهة
تكذب على اللاعب. القيود ومصدرها في \`TERBOO_YUDZXML_LIBRARY_REVIEW.md\` §3.

رفع هذا الحجب يحتاج قناة اتصال من الفقاعة إلى الخادم. المسار الوحيد المعروف
لإتاحتها يمرّ بتمرير \`url\` أصلاً للـWebView، وهو حقل في مكتبة مرفوضة لتلفيقها
إثبات التحقق (§1 من مراجعة المكتبة) — ولا يُنفَّذ بتعديل الموقع لأن ذلك خارج نطاق
المهمة. فالقيد **موثَّق ولم يُتجاوَز**.

## ألعاب Mini App المنفَّذة

| اللعبة | المعرّف | الأمر | البنّاء | الحجم على السلك | مدقّق المحيط | التفاعل | الاختبار الفعلي |
|---|---|---|---|---|---|---|---|
${miniRows.map((r) => `| ${r.ar} | \`${r.id}\` | \`${r.command}\` | \`${r.builder}\` | ${r.size} | ${r.audit} | لمس داخل المستند | متصفح Chromium |`).join("\n")}

## كل ألعاب المشروع

| # | الفئة | اللعبة | الأمر | مرادفات | الملف | Mini App؟ | النقل المضمَّن | السبب | الاختبارات |
|---|---|---|---|---|---|---|---|---|---|
${rows.map((r, i) => `| ${i + 1} | ${r.cls.id} — ${r.cls.label} | ${r.ar} | \`${r.command}\` | ${r.aliases} | \`${r.file}\` | ${r.hasApp} | ${r.fit.fit} | ${r.fit.why} | ${r.tests} |`).join("\n")}

## معايير القبول لكل Mini App

تُطبَّق آلياً على كل بنّاء في السجل، ولا يُقبل مدخل يخفق في واحدة:

1. يُبنى بثلاث لغات (ar · en · es) و\`<html lang>\` و\`dir\` صحيحان.
2. \`auditWebViewHtml\` بلا مشاكل: لا شبكة · لا تخزين · لا مورد خارجي · حلقة محروسة.
3. بايتات السلك تحت 960KB بعد حساب تضخّم \`\\uXXXX\`.
4. لا معرّف عنصر مكرر · لا \`eval\` · لا \`<script src>\`.
5. \`nonce\` يُمرَّر إلى كل وسم \`<script>\`.
6. الواجهة الإنجليزية والإسبانية **بلا حرف عربي واحد**.
7. تُلعب فعلاً في Chromium: إدخال يغيّر الحالة · نهاية جولة · إعادة بلا مستمع مكرر.
8. بلا overflow أفقي على 320 · 360 · 412px · صفر خطأ console · صفر طلب خارجي.
9. الحلقة تتوقف عند إخفاء الصفحة، ولها استئناف صريح لا تجمّد صامت.
10. تسليمها رسالة **واحدة** بلا صورة وبلا أزرار حركة وبلا رابط موقع.
`;

if (CHECK) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current.trim() !== doc.trim()) {
    console.error("❌ TERBOO_GAME_MINIAPP_MATRIX.md قديم — شغّل node tools/terboo-game-miniapp-matrix.mjs");
    process.exit(1);
  }
  console.log(`✅ مصفوفة ألعاب Mini Apps حديثة (${plugins.length} بلوقن · ${miniRows.length} Mini App)`);
  process.exit(0);
}
fs.writeFileSync(OUT, doc);
console.log(JSON.stringify({ plugins: plugins.length, contracts: contracts.length, miniApps: miniRows.length, classes: tally }));
console.log(`→ ${path.relative(ROOT, OUT)}`);
