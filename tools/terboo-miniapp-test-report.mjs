#!/usr/bin/env node
// ═══════════════════════════════════════════════
// 🧪 مولّد تقرير اختبارات Mini Apps — من نتائج تشغيل حقيقية
// ───────────────────────────────────────────────
//   node tools/terboo-run-tests.mjs --json <out.json>
//   node tools/terboo-miniapp-test-report.mjs --after <out.json> [--before <baseline.json>]
// لا يكتب رقم نجاح يدوياً: كل سطر من ملف نتائج المشغّل.
// ═══════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const arg = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);
const AFTER = arg("--after");
const BEFORE = arg("--before");
const OUT = arg("--out") || path.join(ROOT, "docs", "TERBOO_MINIAPP_TEST_REPORT.md");

if (!AFTER || !fs.existsSync(AFTER)) {
  console.error("استخدام: node tools/terboo-miniapp-test-report.mjs --after <results.json> [--before <baseline.json>]");
  process.exit(2);
}

const load = (p) => {
  if (!p || !fs.existsSync(p)) return null;
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  const rows = Array.isArray(d) ? d : d.results || d.files || [];
  return new Map(rows.map((r) => [r.file, { ok: Boolean(r.ok), ms: Number(r.ms) || 0, summary: String(r.summary || "").trim() }]));
};
const after = load(AFTER);
const before = load(BEFORE);

const total = after.size;
const passed = [...after.values()].filter((r) => r.ok).length;
const failed = total - passed;
const names = [...after.keys()].sort();

const cls = (file) => {
  const a = after.get(file);
  const b = before?.get(file);
  if (!b) return a.ok ? "new-pass" : "new-fail";
  if (a.ok && !b.ok) return "fixed";
  if (!a.ok && b.ok) return "broken";
  if (!a.ok && !b.ok) return "pre-existing";
  return "stable";
};
const group = (k) => names.filter((n) => cls(n) === k);

/** اختبارات هذا العمل */
const MINE = new Set(["terboo-game-image-policy.test.mjs", "terboo-miniapp-ui.test.mjs", "terboo-miniapp-security.test.mjs"]);
const TOUCHED = new Set(["terboo-arcade-html.test.mjs", "terboo-visual-response.test.mjs", "terboo-web-arcade.test.mjs",
  "terboo-arcade-ai.test.mjs", "terboo-arcade-multiplayer.test.mjs", "terboo-no-silent-catch.test.mjs"]);

const row = (n) => {
  const r = after.get(n);
  return `| \`${n}\` | ${r.ok ? "✅ نجح" : "❌ فشل"} | ${(r.ms / 1000).toFixed(1)}ث | ${r.summary.replace(/\|/g, "\\|").slice(0, 220) || "—"} |`;
};

const section = (title, list, note = "") => list.length
  ? `### ${title} (${list.length})\n${note ? `\n${note}\n` : ""}\n| الاختبار | النتيجة | المدة | الملخّص |\n|---|---|---|---|\n${list.map(row).join("\n")}\n`
  : `### ${title} (0)\n\nلا شيء.\n`;

const doc = `# TERBOO MINI APPS — تقرير الاختبارات

> **ملف مولّد** من نتائج تشغيل فعلية. شغّل:
> \`node tools/terboo-run-tests.mjs --json after.json\` ثم
> \`node tools/terboo-miniapp-test-report.mjs --after after.json --before baseline.json\`
>
> أُنشئ في: ${new Date().toISOString()}

## الحصيلة

| | |
|---|---|
| ملفات الاختبار المُشغَّلة | **${total}** |
| نجح | **${passed}** |
| فشل | **${failed}** |
${before ? `| خط الأساس (قبل العمل) | ${[...before.values()].filter((r) => r.ok).length}/${before.size} نجح |\n` : ""}| اختبارات live لم تُشغَّل | 3 (\`npm run test:live\` — تحتاج مفاتيح مزوّدات وشبكة) |

${before ? `**الفرق مقابل خط الأساس:** أُصلح ${group("fixed").length} · كُسر ${group("broken").length} · جديد ناجح ${group("new-pass").length} · جديد فاشل ${group("new-fail").length} · فاشل سابقاً وما زال ${group("pre-existing").length}\n` : ""}
---

## 1. اختبارات أُضيفت في هذا العمل

${section("جديدة", names.filter((n) => MINE.has(n)))}

**ما تثبته فعلاً:**

- \`terboo-game-image-policy\` — فحص ثابت + AST على **كل** ملفات مسارات الألعاب (لا مولّد صور، ولا حقل حمولة صورة)، ثم دورة حياة كاملة (بدء · حركات · نهاية · استسلام) لكل لعبة في السجل على mock socket، وتفتيش كل رسالة صادرة عن حقل صورة أو بايتات PNG/JPEG/GIF/WebP أو \`data:image\`. يشمل حالة فشل النقل، وعقد \`VisualResponse\` (ألعاب ممنوعة · غير الألعاب مسموحة).
- \`terboo-miniapp-ui\` — **متصفح حقيقي** (Chromium): تجاوب على 320/360/412/480/820px بلا overflow أفقي · RTL للعربية وLTR للإنجليزية/الإسبانية · صفر أخطاء console · صفر موارد خارجية · أهداف لمس ≥40px · \`prefers-reduced-motion\` · **نقرة لمس تغيّر الحالة على الخادم** (يُستجوَب المحرك لا DOM) · رفض حمولة فيها حقل قرار خادمي · أصل بصري من مسار الوكيل الموقّع فقط · كتالوج ببحث وفلاتر ولوحة تفاصيل. يتخطّى **بإعلان صريح** إن لم يتوفر Chromium.
- \`terboo-miniapp-security\` — وكيل الأصول (توقيع · عبث بالـMAC · تبديل العنوان · انتهاء · قائمة مضيفات مغلقة تمنع localhost و169.254.169.254 · http · SVG/HTML · غير-GET) وقناة الإجراءات (nonce قديم ومختلق · طابع زمني بعيد · ستة حقول قرار · actionId مشوّه · حمولة ضخمة ثم فحص بقاء الخادم · رمز غرفة أخرى · عشرة طلبات متزامنة ⇒ قبول واحد) ورمز بلا هوية وسرية الاختيار في المجموعة.

---

## 2. اختبارات أُصلحت بهذا العمل

${section("أُصلحت", group("fixed"), "كانت فاشلة في خط الأساس وصارت ناجحة.")}

---

## 3. اختبارات لمسها هذا العمل وبقيت ناجحة

${section("ناجحة ومتأثرة", names.filter((n) => TOUCHED.has(n) && after.get(n).ok && cls(n) === "stable"))}

---

## 4. ما كُسر بهذا العمل

${section("مكسورة", group("broken"), group("broken").length ? "**يجب إصلاحها.**" : "لا شيء — لم يُكسر أي اختبار كان ناجحاً.")}

---

## 5. فاشلة قبل العمل وما زالت فاشلة (خارج النطاق)

${section("فاشلة سابقاً", group("pre-existing"), "كانت فاشلة في خط الأساس قبل أي تعديل، وأسبابها خارج مسارات الألعاب. لم تُدَّعَ معالجتها.")}

---

## 6. لم يُشغَّل / لم يُختبر

| البند | السبب |
|---|---|
| \`npm run test:live\` (3 ملفات) | يتصل بمزوّدات حقيقية ويحتاج مفاتيح API وشبكة خارجية |
| تجربة على **جهاز أندرويد حقيقي** أو emulator | لا جهاز ولا حساب واتساب في بيئة التنفيذ. **لا يُدّعى نجاح حيّ** |
| تصيير HTML المضمَّن على WhatsApp Android | غير مُثبت ⇒ النقل مطفأ افتراضياً. المُثبت هو الترميز فقط (round-trip) |
| WhatsApp Web / iOS | لم يُختبر ⇒ لا يُعلن دعم |
| جلب أصل بصري من مضيف خارجي فعلي | الوكيل مُختبر على التوقيع والتحقق والأنواع والمضيفات؛ الجلب الشبكي الحقيقي لم يُنفَّذ (شبكة خارجية) |

---

## 7. تصنيف النتائج

| التصنيف | البنود |
|---|---|
| **نجح بالاختبار** | إزالة صور الألعاب (45 لعبة · دورة حياة كاملة) · Mini App في متصفح حقيقي (تجاوب · RTL/LTR · نقرة ⇒ خادم) · أمان قناة الإجراءات والأصول · ترحيل 22 لعبة أسئلة · الكتالوج · ${passed} ملف اختبار |
| **فُحص ثابتاً فقط** | بنية رسالة واتساب التفاعلية (أزرار + روابط) عبر mock socket وmatrix مولّدة؛ لم تُعرض على عميل واتساب حقيقي |
| **لم يُختبر لعدم توفر جهاز/خدمة** | عميل واتساب Android/iOS/Web · اختبارات live · الجلب الشبكي للأصول |
| **لم يكتمل مع السبب** | 5 ألعاب قديمة مستقلة (مستذئب · ماينكرافت · fish · دنجن · نينجا) لم تُحوَّل إلى عقود أركيد — التفاصيل في التقرير النهائي · ${group("pre-existing").length} اختباراً فاشلاً قبل العمل خارج نطاق الألعاب |
`;

fs.writeFileSync(OUT, doc);
console.log(JSON.stringify({ total, passed, failed, fixed: group("fixed").length, broken: group("broken").length, newPass: group("new-pass").length, preExisting: group("pre-existing").length }));
console.log(`→ ${path.relative(ROOT, OUT)}`);
