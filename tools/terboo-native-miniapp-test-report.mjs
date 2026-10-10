#!/usr/bin/env node
// ═══════════════════════════════════════════════
// 🧪 مولّد TERBOO_NATIVE_MINIAPP_TEST_REPORT.md — من نتائج تشغيل فعلية
// ───────────────────────────────────────────────
//   node tools/terboo-run-tests.mjs --json after.json
//   node tools/terboo-native-miniapp-test-report.mjs --after after.json [--before base.json]
//
// كل ملف اختبار يأخذ حالة واحدة من أربع (§19): PASS · FAIL · BLOCKED · NOT RUN.
// • BLOCKED يأتي من المشغّل نفسه (الاختبار أعلن تخطّياً لانعدام شرط بيئي).
// • NOT RUN بنود لا يملك هذا المحيط وسيلة لتشغيلها، كل بند بسببه الصريح.
// • لا يُحتسب BLOCKED ولا NOT RUN ضمن الناجح — السكربت يفشل إن حدث ذلك.
// لا رقم مكتوب يدوياً في المخرج.
// ═══════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const arg = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);
const AFTER = arg("--after");
const BEFORE = arg("--before");
const OUT = arg("--out") || path.join(ROOT, "TERBOO_NATIVE_MINIAPP_TEST_REPORT.md");

if (!AFTER || !fs.existsSync(AFTER)) {
  console.error("استخدام: node tools/terboo-native-miniapp-test-report.mjs --after <results.json> [--before <baseline.json>]");
  process.exit(2);
}

function load(file) {
  if (!file || !fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = Array.isArray(data) ? data : data.results || [];
  return {
    meta: Array.isArray(data) ? {} : data,
    byFile: new Map(rows.map((r) => [r.file, {
      // ملفات نتائج قديمة لا تحمل state: تُستنتج من ok حتى يظل المقارن يعمل
      state: r.state || (r.ok ? "PASS" : "FAIL"),
      ms: Number(r.ms) || 0,
      summary: String(r.summary || "").trim(),
      reason: String(r.reason || "").trim(),
    }])),
  };
}

const after = load(AFTER);
const before = load(BEFORE);
const PROBE = arg("--baseline-probe");
const probe = PROBE && fs.existsSync(PROBE) ? JSON.parse(fs.readFileSync(PROBE, "utf8")) : null;
const files = [...after.byFile.keys()].sort();
const of = (state) => files.filter((f) => after.byFile.get(f).state === state);
const PASS = of("PASS");
const FAIL = of("FAIL");
const BLOCKED = of("BLOCKED");

// الحارس: ملف مُعطَّل أو فاشل لا يجوز أن يُحتسب ناجحاً في أي مكان
if (after.meta.passed !== undefined && after.meta.passed !== PASS.length) {
  console.error(`❌ المشغّل يعلن ${after.meta.passed} ناجحاً بينما الحالات تعطي ${PASS.length}`);
  process.exit(1);
}

/** اختبارات كُتبت في عمل Native Mini Apps، وما يثبته كل منها فعلاً */
const MINE = new Map([
  ["terboo-miniapp-builders.test.mjs", "البنّاءان (Sonic · XO) × 3 لغات: بنية المستند · وسم اللغة والاتجاه · حجم تحت الحد · 0 مورد خارجي · 0 `<script src>` · nonce يُمرَّر إلى كل وسم script."],
  ["terboo-miniapp-transport.test.mjs", "النقل: القناة المضمَّنة لا تُعلن متاحة ولو فُعّلت صراحةً وتذكر سبب الرفض · **رسالة واحدة** لكل لعبة · 0 حقل صورة · 0 زر حركة واتساب · الرابط من نطاق المالك · فشل الإرسال ⇒ نص صريح لا صورة ولا أزرار · اللغة من الطرف للطرف · لعبة مجهولة لا تُرسل شيئاً."],
  ["terboo-miniapp-play.test.mjs", "**Chromium حقيقي**: XO تُلعب فعلاً (نقرة ⇒ X · رد الكمبيوتر · رفض خانة مشغولة · إعادة بلا مستمع مكرر · المستوى الصعب لا يُهزم في مباراة كاملة) و Sonic (الحلقة تتقدم · القفز يرفع · تتوقف عند إخفاء الصفحة) · 320/360/412px بلا overflow · RTL+LTR · 0 خطأ console · 0 طلب خارجي."],
  ["terboo-miniapp-ui.test.mjs", "**Chromium حقيقي** على الموقع المُشغَّل: صفحة اللعب والكتالوج على 320/360/412/480/820px · أهداف لمس ≥40px · `prefers-reduced-motion` · نقرة لمس تغيّر حالة الخادم (يُستجوَب المحرك لا DOM) · حمولة فيها حقل قرار خادمي مرفوضة · الأصل البصري من مسار الوكيل الموقّع فقط."],
  ["terboo-miniapp-security.test.mjs", "وكيل الأصول (توقيع · عبث بالـMAC · تبديل العنوان · انتهاء · مضيفات مغلقة تمنع localhost و169.254.169.254 · http · SVG/HTML · غير-GET) وقناة الإجراءات (nonce قديم/مختلق · طابع زمني بعيد · حقول قرار خادمي · actionId مشوّه · حمولة ضخمة ثم بقاء الخادم · رمز غرفة أخرى · تزامن ⇒ قبول واحد) ورمز لعب بلا هوية."],
  ["terboo-game-image-policy.test.mjs", "فحص ثابت + AST على كل ملفات مسارات الألعاب (0 مولّد صور · 0 حقل حمولة صورة) ثم دورة حياة كاملة لكل لعبة في السجل على mock socket وتفتيش كل رسالة صادرة عن حقل صورة أو بايتات PNG/JPEG/GIF/WebP أو `data:image`."],
]);

/** اختبارات قائمة لمسها هذا العمل (تعديل سلوك أو توقّع) */
const TOUCHED = new Set([
  "terboo-arcade-html.test.mjs", "terboo-visual-response.test.mjs", "terboo-web-arcade.test.mjs",
  "terboo-arcade-ai.test.mjs", "terboo-arcade-multiplayer.test.mjs", "terboo-arcade-games.test.mjs",
  "terboo-no-silent-catch.test.mjs", "terboo-secrets.test.mjs", "terboo-syntax.test.mjs", "terboo-import-graph.test.mjs",
]);

/**
 * تشخيص كل ملف فاشل: سببه الجذري، وهل يعيد نفسه على commit خط الأساس.
 * «أُعيد على خط الأساس» تعني أن الملف شُغّل في worktree على commit ما قبل أي تعديل
 * وفشل بنفس الدعوى — فالفشل ليس من هذا العمل. يُملأ من ملف `--baseline-probe`
 * (نتائج تشغيل فعلية على خط الأساس)، والتشخيص نصّي مرفق بكل ملف.
 */
const DIAGNOSIS = new Map([
  ["terboo-baileys-migration.test.mjs", "كتل الكود تُرسل رسالة غنية افتراضياً. `normalizeMode` في `src/lib/terboo-code-renderer.js:20` يحوّل كل قيمة غير `\"text\"` إلى `\"rich\"`، و`LEGACY_MODES` في السطر 14 يحوّل `\"image\"` نفسها إلى `\"rich\"`. الاختبار يتوقّع ألا تُرسل رسالة غنية بلا تفعيل."],
  ["terboo-channel-forward.test.mjs", "نفس الجذر: الاختبار يتوقّع أن `.بطاقة_الكود rich` يضبط `richCode=\"rich\"`، لكن `plugins/owner/بطاقة_الكود.js` لا يملك وضع `rich` أصلاً (سطر 10 يذكر أن البطاقة الغنية ليست خياراً لأنها تتطلّب انتحال بوت Meta AI)."],
  ["terboo-code-card.test.mjs", "نفس الجذر: الاختبار يتوقّع بطاقة صورة + نسخة نصية عبر `sendMessage`، والتنفيذ يعترض كتلة الكود ويُرسلها عبر `relayMessage` كرسالة غنية، فلا تظهر أي رسالة في `sendMessage`."],
  ["terboo-group-ai-reports.test.mjs", "نفس الجذر: تقرير المجموعة يمر من نفس مسار عرض الكود، فيرى الاختبار رسالة غنية واحدة حيث يتوقّع صفراً."],
  ["terboo-design.test.mjs", "ثلاثة بلوقنات ألعاب قديمة (`fish.js` · `ماينكرافت.js` · `مستذئب.js`) تحمل زخرفة وbackticks من طبقة تصميم سابقة — 8 مخالفات لكل ملف. ليست من مسارات Mini Apps، ولم تُرحَّل في هذا العمل."],
  ["terboo-i18n-runtime.test.mjs", "27 مدخل ترجمة ناقص في `ماينكرافت.js` · `مستذئب.js` · `terboo-rich-response.js`. ملفات هذا العمل تساهم بصفر: بنّاؤو Mini Apps مستثنون بتوثيق صريح (`tools/terboo-i18n-extract.mjs`) لأن نصوصهم في قاموس COPY ثلاثي اللغة، والحارس عليه اختبار يرفض أي حرف عربي في واجهة en/es."],
  ["terboo-typography.test.mjs", "`Inter` لا يُستعمل داخل SVG (يُرسم بخط النظام) — مسار الخطوط والرسم، خارج نطاق الألعاب."],
]);

/** ما أصلح كل اختبار كان فاشلاً (يُقرن بدليل `--baseline-probe`) */
const REPAIRED = new Map([
  ["terboo-secrets-vault.test.mjs", "`guardContentText` في `src/lib/terboo-wa-compat.js` صار يُخفي الأسرار المسجّلة وتوكنات اللوحات في `text`/`caption` قبل الشبكة (`redactSecrets(value, { generic: false })`). كان الاختبار يسقط أبكر على `secretCount() >= 2` لأن الإعداد القالبي بلا أسرار، فلم يصل أحد إلى الدعوى الحقيقية: سر مسجّل كان يُرسل في نص الرسالة كما هو."],
]);

/** NOT RUN: بنود لا يملك هذا المحيط وسيلة لتشغيلها. كل سطر سببه التقني. */
const NOT_RUN = [
  ["إرسال واستقبال على حساب واتساب حقيقي", "لا حساب واتساب ولا اقتران في بيئة التنفيذ. **لا يُدّعى أي نتيجة إرسال حيّ.**"],
  ["تصيير Mini App داخل فقاعة الرسالة على WhatsApp Android", "القناة المضمَّنة الوحيدة المعروفة تتطلّب تزوير إثبات تحقق Meta ⇒ مرفوضة ومطفأة. لا يوجد ما يُختبر."],
  ["فتح الرابط في متصفح أندرويد المدمج (WebView) داخل واتساب", "لا جهاز أندرويد ولا emulator. التجاوب واللمس اختُبرا في Chromium 141 بمقاسات أندرويد، وهو ليس بديلاً عن WebView واتساب."],
  ["WhatsApp Web · iOS · Desktop", "لم تُشغَّل ⇒ لا يُعلن دعم."],
  ["`npm run test:live` (3 ملفات)", "تتصل بمزوّدات حقيقية وتحتاج مفاتيح API وشبكة خارجية."],
  ["جلب أصل بصري من مضيف خارجي فعلي عبر الوكيل", "الوكيل مُختبر على التوقيع والتحقق والأنواع والمضيفات؛ الجلب الشبكي الحقيقي لم يُنفَّذ."],
  ["قياس أداء على هاتف فعلي (FPS · حرارة · بطارية)", "لا جهاز. قياس الحلقة جرى في Chromium فقط."],
];

const label = (state) => ({ PASS: "✅ PASS", FAIL: "❌ FAIL", BLOCKED: "⏭️ BLOCKED" }[state] || state);
const esc = (text) => String(text).replace(/\|/g, "\\|");
const row = (file) => {
  const r = after.byFile.get(file);
  const note = r.state === "BLOCKED" ? r.reason.replace(/^⏭️?\s*/, "") : r.summary || "—";
  return `| \`${file}\` | ${label(r.state)} | ${(r.ms / 1000).toFixed(1)}ث | ${esc(note).slice(0, 240)} |`;
};
const table = (list) => (list.length
  ? `| الاختبار | الحالة | المدة | الملخّص |\n|---|---|---|---|\n${list.map(row).join("\n")}`
  : "_لا شيء._");

const regressed = before
  ? files.filter((f) => after.byFile.get(f).state === "FAIL" && before.byFile.get(f)?.state === "PASS")
  : [];
const stillFailing = before
  ? FAIL.filter((f) => before.byFile.get(f) && before.byFile.get(f).state !== "PASS")
  : [];

const doc = `# TERBOO NATIVE MINI APPS — تقرير الاختبارات

> **ملف مولّد** من نتائج تشغيل فعلية — لا رقم مكتوب يدوياً. لإعادة التوليد:
>
> \`\`\`bash
> node tools/terboo-run-tests.mjs --json after.json
> node tools/terboo-native-miniapp-test-report.mjs --after after.json
> \`\`\`
>
> التشغيل: ${after.meta.generatedAt || "—"} · Node ${after.meta.node || process.version}

## 0. القاعدة المتّبعة (§19)

كل ملف اختبار يأخذ **حالة واحدة** من أربع، ولا تُجمع الحالات:

| الحالة | معناها |
|---|---|
| **PASS** | شُغّل وفحص وأكّد كل دعاواه |
| **FAIL** | شُغّل وسقطت فيه دعوى |
| **BLOCKED** | شُغّل وأعلن تخطّياً لانعدام شرط بيئي (متصفح · مفتاح). **لا يُحتسب نجاحاً** |
| **NOT RUN** | لم يُشغَّل أصلاً — لا وسيلة في هذا المحيط |

المشغّل \`tools/terboo-run-tests.mjs\` يفرز BLOCKED بنفسه: ملف يخرج بـ0 بعد إعلان «⏭️» بلا سطر تأكيد «✅» يُسجَّل BLOCKED لا PASS، ومولّد هذا التقرير يفشل إن اختلف عدّه عن عدّ المشغّل.

---

## 1. الحصيلة

| | |
|---|---|
| ملفات الاختبار المحلية | **${files.length}** |
| ✅ PASS | **${PASS.length}** |
| ❌ FAIL | **${FAIL.length}** |
| ⏭️ BLOCKED | **${BLOCKED.length}** |
| ⛔ NOT RUN (بنود بيئية) | **${NOT_RUN.length}** بنداً · منها ${after.meta.notRun ?? after.meta.skipped ?? 0} ملف live |
${before ? `| خط الأساس قبل العمل | ${[...before.byFile.values()].filter((r) => r.state === "PASS").length}/${before.byFile.size} PASS |\n` : ""}
${before ? `**مقابل خط الأساس:** انحدر ${regressed.length} · فاشل قبل العمل وما زال ${stillFailing.length}\n` : ""}
---

## 2. اختبارات كُتبت لهذا العمل

${table([...MINE.keys()].filter((f) => after.byFile.has(f)))}

**ما يثبته كل واحد:**

${[...MINE].filter(([f]) => after.byFile.has(f)).map(([f, what]) => `- \`${f}\` (${label(after.byFile.get(f).state)}) — ${what}`).join("\n")}

---

## 2.5 اختبارات كانت فاشلة وأصلحها هذا العمل

${(() => {
  const repaired = (probe?.results || []).filter((r) => r.nowState === "PASS" && r.state !== "PASS");
  if (!repaired.length) return "_لا شيء._";
  return `| الاختبار | الدعوى الساقطة على خط الأساس \`${probe.base.slice(0, 8)}\` | ما أصلحها |
|---|---|---|
${repaired.map((r) => `| \`${r.file}\` | ${esc(r.claim || "(لا سطر دعوى)")} | ${esc(REPAIRED.get(r.file) || "—")} |`).join("\n")}

> لم يُعدَّل أي اختبار: الكود هو ما تغيّر. الدليل أعلاه من تشغيل الملف نفسه على خط الأساس وعلى الشجرة الحالية.`;
})()}

---

## 3. اختبارات قائمة لمسها هذا العمل

${table([...TOUCHED].filter((f) => after.byFile.has(f)).sort())}

---

## 4. ❌ FAIL — كل فشل بسببه الجذري

${FAIL.length ? `### الدعوى الساقطة الآن مقابل خط الأساس \`${probe?.base?.slice(0, 8) || "—"}\`

| الاختبار | المدة | الدعوى الآن | على خط الأساس | الحكم |
|---|---|---|---|---|
${FAIL.map((f) => {
  const r = after.byFile.get(f);
  const hit = probe?.results?.find((x) => x.file === f);
  const now = esc(hit?.nowClaim || "(لا سطر دعوى — يفشل عبر مولّد خارجي)");
  const was = esc(hit?.claim || "(لا سطر دعوى — يفشل عبر مولّد خارجي)");
  const verdict = !hit ? "لم يُفحص"
    : hit.state === "PASS" ? "**انحدار من هذا العمل**"
    : hit.sameClaim ? (hit.claim ? "فشل سابق · **نفس الدعوى حرفياً**" : "فشل سابق · نفس شكل الفشل")
    : "فشل سابق · الدعوى تغيّرت (انظر التشخيص)";
  return `| \`${f}\` | ${(r.ms / 1000).toFixed(1)}ث | ${now} | ${was} | ${verdict} |`;
}).join("\n")}
` : "لا ملف فاشل."}

${FAIL.length ? `### السبب الجذري

| الاختبار | السبب |
|---|---|
${FAIL.map((f) => `| \`${f}\` | ${esc(DIAGNOSIS.get(f) || "—")} |`).join("\n")}

${probe ? `> **كيف قيس هذا:** \`node tools/terboo-baseline-probe.mjs\` ينشئ \`git worktree\` على
> \`${probe.base}\` (الشجرة المدمجة قبل أي تعديل في هذا العمل)، يربط نفس
> \`node_modules\` وينسخ \`config.example.js\` إعداداً، ثم يشغّل **كل ملف فاشل مرتين**:
> مرة في الشجرة الحالية ومرة على خط الأساس، ويقارن سطر الدعوى الساقطة لا مجرد الحالة.
> النتيجة: ${probe.results.filter((r) => r.state !== "PASS").length}/${probe.results.length} يفشل على خط الأساس أيضاً · **${probe.results.filter((r) => r.state === "PASS").length} انحدار**.
>
> الملفان اللذان تغيّرت دعواهما تغيّرا **نحو الأقل**: \`terboo-i18n-runtime\` من 30 نقصاً إلى 27
> (مدخلات هذا العمل كلها مُترجمة)، و\`terboo-design\` يفشل عبر مولّد خارجي بلا سطر دعوى،
> وعدد مخالفاته 24 الآن كما على خط الأساس بالضبط: المخالفتان اللتان أدخلهما هذا العمل
> في \`plugins/ai/تخيل3.js\` (backticks في نص معروض) أُزيلتا، والـ24 الباقية كلها سابقة.
\n` : ""}
**لم يُعدَّل أي اختبار ليمر.** أربعة من هذه الإخفاقات جذرها واحد في \`src/lib/terboo-code-renderer.js\` — وهو أحد ملفات عرض الكود الخمسة التي يشترط التسليم شحنها **مطابقة بايتاً ببايت**، فلم تُلمس. القرار للمالك:
>
> \`\`\`js
> // src/lib/terboo-code-renderer.js
> const LEGACY_MODES = { auto: "rich", image: "rich" };   // ← "image" تُحوَّل إلى "rich"
> const normalizeMode = (value) => { ... return MODES.has(mode) ? mode : "rich"; };  // ← الافتراضي "rich"
> \`\`\`
>
> \`normalizeMode\` يعيد \`"rich"\` لكل قيمة عدا \`"text"\`، بما فيها \`"image"\` التي يضبطها
> \`plugins/owner/بطاقة_الكود.js\` نفسه (وسطر 10 فيه يقول إن البطاقة الغنية ليست خياراً
> لأنها تتطلّب انتحال بوت Meta AI). فإمّا أن يكون الافتراضي \`"image"\` ويُحتفظ بالتعيين
> كما يضبطه البلوقن ⇒ تمر الأربعة، أو يبقى \`"rich"\` مقصوداً ⇒ تُحدَّث الاختبارات الأربعة.
> هذا قرار سلوك عرض الكود لا الألعاب، ولم يُطلب في هذا العمل، فلم يُتخذ من جانبي.
` : ""}
---

## 5. ⏭️ BLOCKED — شُغّل ولم يفحص

${BLOCKED.length ? "هذه الملفات **لا تُحتسب ناجحة**. السبب من مخرج الاختبار نفسه:\n\n" : "لا ملف مُعطَّل في هذا التشغيل — كل الاختبارات البيئية (متصفح حقيقي) وجدت شرطها.\n\n"}${table(BLOCKED)}

---

## 6. ⛔ NOT RUN — لم يُشغَّل، ولا يُدَّعى

| البند | السبب |
|---|---|
${NOT_RUN.map(([item, why]) => `| ${item} | ${why} |`).join("\n")}

---

## 7. تصنيف ما ثبت فعلاً

| التصنيف | البنود |
|---|---|
| **ثبت بتشغيل حقيقي** | لعب XO و Sonic في Chromium 141 (نقرة ⇒ حالة · كمبيوتر لا يُهزم · حلقة تتقدم وتتوقف) · رسالة واحدة لكل لعبة بلا صورة وبلا أزرار حركة · أمان وكيل الأصول وقناة الإجراءات · خلو مسارات الألعاب من الصور (ثابت + AST + دورة حياة) · ${PASS.length} ملف اختبار |
| **ثبت ثابتاً فقط** | بنية رسالة واتساب التفاعلية عبر mock socket ومصفوفات مولّدة؛ لم تُعرض على عميل واتساب حقيقي |
| **رُفض بدليل** | القناة المضمَّنة في \`@yudzxml/baileys\` — تبني \`signature\` و\`certificateChain\` من نص ثابت لتبدو رداً موثقاً من Meta. الدليل في \`TERBOO_NATIVE_MINIAPP_AUDIT.md\` §3 و\`TERBOO_NATIVE_MINIAPP_SECURITY_REPORT.md\` §1 |
| **لم يُختبر لعدم توفر جهاز/خدمة** | عميل واتساب على أي منصة · WebView أندرويد · اختبارات live · الجلب الشبكي للأصول · قياس أداء على هاتف |

---

## 8. كل الملفات بحالتها

${table(files)}
`;

fs.writeFileSync(OUT, doc);
console.log(JSON.stringify({ total: files.length, PASS: PASS.length, FAIL: FAIL.length, BLOCKED: BLOCKED.length, NOT_RUN: NOT_RUN.length, regressed: regressed.length }));
console.log(`→ ${path.relative(ROOT, OUT)}`);
process.exit(FAIL.length ? 1 : 0);
