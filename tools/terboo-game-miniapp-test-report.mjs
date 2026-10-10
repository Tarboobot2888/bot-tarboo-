#!/usr/bin/env node
// ═══════════════════════════════════════════════
// 🧪 مولّد TERBOO_GAME_MINIAPP_TEST_REPORT.md (§14 · §17.6)
// ───────────────────────────────────────────────
//   node tools/terboo-run-tests.mjs --json after.json
//   node tools/terboo-baseline-probe.mjs --after after.json --out probe.json
//   node tools/terboo-game-miniapp-test-report.mjs --after after.json --baseline-probe probe.json
//
// كل ملف بحالة واحدة: PASS · FAIL · BLOCKED · NOT RUN. لا جمع بين الحالات،
// ولا يُحتسب BLOCKED ولا NOT RUN ضمن الناجح.
// ═══════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const arg = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);
const AFTER = arg("--after");
const PROBE = arg("--baseline-probe");
const OUT = arg("--out") || path.join(ROOT, "TERBOO_GAME_MINIAPP_TEST_REPORT.md");

if (!AFTER || !fs.existsSync(AFTER)) {
  console.error("استخدام: node tools/terboo-game-miniapp-test-report.mjs --after <results.json> [--baseline-probe <probe.json>]");
  process.exit(2);
}
const data = JSON.parse(fs.readFileSync(AFTER, "utf8"));
const rows = new Map((data.results || []).map((r) => [r.file, {
  state: r.state || (r.ok ? "PASS" : "FAIL"),
  ms: Number(r.ms) || 0,
  summary: String(r.summary || "").trim(),
  reason: String(r.reason || "").trim(),
}]));
const probe = PROBE && fs.existsSync(PROBE) ? JSON.parse(fs.readFileSync(PROBE, "utf8")) : null;

const files = [...rows.keys()].sort();
const of = (state) => files.filter((f) => rows.get(f).state === state);
const PASS = of("PASS");
const FAIL = of("FAIL");
const BLOCKED = of("BLOCKED");
if (data.passed !== undefined && data.passed !== PASS.length) {
  console.error(`❌ المشغّل يعلن ${data.passed} ناجحاً والحالات تعطي ${PASS.length}`);
  process.exit(1);
}

/** اختبارات هذا العمل وما يثبته كل منها (§14.1 · §14.2 · §14.3 · §14.5) */
const MINE = new Map([
  ["terboo-miniapp-builders.test.mjs", "**§14.1** خمسة بنّائين × 3 لغات: البنية · وسم اللغة والاتجاه · المعرّفات المطلوبة لكل لعبة · 0 معرّف مكرر · 0 مورد خارجي · 0 `<script src>` · بلا `eval` · `nonce` في كل وسم script · الأزرار مربوطة بمنطق فعلي · واجهة en/es **بلا حرف عربي** · والسجل والبنّاؤون متطابقان مدخلاً بمدخل."],
  ["terboo-miniapp-transport.test.mjs", "**§14.2** على mock socket: القدرة من دالة إرسال حقيقية لا من إعداد (مطفأ · بلا مقبس · بلا relayMessage · جاهز) · الحمولة بلا أي حقل إثبات والحارس يرفض الثلاثة لو دُسّت · `response_id` عشوائي مختلف لكل رسالة · بروتو الحزمة الرسمية يحمل الشكل (ترميز ⇒ فكّ ⇒ HTML حرفياً) · **relayMessage واحد** لكل لعبة بلا صورة ولا رابط ولا أزرار · مطفأ ⇒ نص سبب واحد بلا رابط حتى مع موقع مفعَّل · فشل الإرسال ⇒ نص بلا بديل · فوق الميزانية أو مخالفة محيط ⇒ رفض قبل الشبكة · مخرج الرابط القديم بتفعيل صريح وكل أزراره روابط."],
  ["terboo-miniapp-play.test.mjs", "**§14.3** Chromium حقيقي — خمس ألعاب تُلعب فعلاً: XO (نقرة ⇒ X · رد الكمبيوتر · رفض خانة مشغولة · صعب لا يُهزم) · Sonic (الحلقة تتقدم · القفز · التوقف عند الإخفاء) · Snake (بكسلات الساحة تتغيّر · زر اتجاه · الموت بالجدار · الإعادة تُصفّر الطول) · Memory (قلب واحد · زوج خاطئ يعود · زوج صحيح يثبت والعدّاد يتقدّم · الإعادة تُصفّر) · 2048 (بداية ببلاطتين · الحركة تغيّر اللوحة وتولّد · كل القيم قوى للعدد 2 · الإعادة تُصفّر) · 320/360/412px بلا overflow · RTL+LTR · 0 خطأ console · 0 طلب خارجي."],
  ["terboo-web-unchanged.test.mjs", "**§14.5** WEB_FILES_UNCHANGED: بصمات SHA-256 لكل ملف متتبَّع تحت `web/`، والبصمة تغطي نفس مجموعة الملفات، **والحارس نفسه مُختبَر** بدسّ تغيير والتأكد من كشفه ثم استعادته. وطبقة النقل لا تستورد من `web/` ولا `terboo-website` ولا `terboo-ui-kit`، ولا تبني أي رابط."],
  ["terboo-config-template.test.mjs", "قالب الإعداد بلا سرّ واحد من `config.js`، وكتلة `secrets` فيه فارغة بنفس المفاتيح."],
  ["terboo-game-image-policy.test.mjs", "فحص ثابت + AST على كل ملفات مسارات الألعاب (0 مولّد صور · 0 حقل حمولة صورة) ثم دورة حياة كاملة لكل لعبة في السجل وتفتيش كل رسالة صادرة عن صورة أو بايتات PNG/JPEG/GIF/WebP."],
]);

const TOUCHED = new Set([
  "terboo-arcade-engine.test.mjs", "terboo-arcade-games.test.mjs", "terboo-arcade-html.test.mjs",
  "terboo-arcade-multiplayer.test.mjs", "terboo-arcade-ai.test.mjs", "terboo-web-arcade.test.mjs",
  "terboo-visual-response.test.mjs", "terboo-i18n-runtime.test.mjs", "terboo-no-silent-catch.test.mjs",
  "terboo-syntax.test.mjs", "terboo-import-graph.test.mjs", "terboo-smart-buttons.test.mjs", "terboo-menus.test.mjs",
]);

const DIAGNOSIS = new Map([
  ["terboo-baileys-migration.test.mjs", "كتل الكود تُرسل رسالة غنية افتراضياً: `normalizeMode` في `src/lib/terboo-code-renderer.js:20` يحوّل كل قيمة غير `\\\"text\\\"` إلى `\\\"rich\\\"`، و`LEGACY_MODES:14` يحوّل `\\\"image\\\"` نفسها إلى `\\\"rich\\\"`."],
  ["terboo-channel-forward.test.mjs", "نفس الجذر: الاختبار يتوقّع وضع `rich` في `plugins/owner/بطاقة_الكود.js` وهو لا يملكه (سطر 10 يذكر أن البطاقة الغنية ليست خياراً)."],
  ["terboo-code-card.test.mjs", "نفس الجذر: يتوقّع بطاقة صورة ونسخة نصية عبر `sendMessage`، والتنفيذ يعترض كتلة الكود ويُرسلها عبر `relayMessage`."],
  ["terboo-group-ai-reports.test.mjs", "نفس الجذر: تقرير المجموعة يمر من مسار عرض الكود نفسه."],
  ["terboo-design.test.mjs", "ثلاثة بلوقنات ألعاب قديمة (`fish.js` · `ماينكرافت.js` · `مستذئب.js`) بزخرفة وbackticks من طبقة تصميم سابقة — 8 مخالفات لكل ملف، خارج مسار Mini Apps."],
  ["terboo-i18n-runtime.test.mjs", "27 مدخل ترجمة ناقص في `ماينكرافت.js` · `مستذئب.js` · `terboo-rich-response.js`. ملفات هذا العمل تساهم بصفر: البنّاؤون ووحدة التشخيص مستثنون بتوثيق صريح، والوصف العربي لكل بلوقن جديد له مدخل en/es."],
  ["terboo-typography.test.mjs", "`Inter` لا يُستعمل داخل SVG (يُرسم بخط النظام) — مسار الخطوط والرسم."],
]);

const REPAIRED = new Map([
  ["terboo-arcade-engine.test.mjs", "`games.contracts()` كان يُعيد نسخة ظلّ لكل لعبة أسئلة مُرحَّلة (`خمن_العلم` بجانب `q_tebakbendera`) بلا `controller` أي غير قابلة للعب — 67 مدخلاً لـ45 لعبة. الآن `arcade` هو المصدر ولا يضيف السجل إلا ما لم يُرحَّل."],
]);

/** NOT RUN: بنود لا وسيلة لتشغيلها في هذا المحيط، كل بند بسببه */
const NOT_RUN = [
  ["**§14.4 — عرض اللعبة داخل الرسالة على WhatsApp Android حقيقي**", "لا جهاز ولا حساب واتساب ولا اقتران في بيئة البناء. **هذا هو الاختبار الحاسم الباقي**: هل يعرض العميل الحمولة بلا بيانات تحقق؟ خطوات تشغيله بنفسك في `TERBOO_GAME_MINIAPP_SETUP.md` §4. لا يُدَّعى أي نتيجة."],
  ["اللمس والصوت والأداء داخل WebView واتساب", "اختُبرت في Chromium 141 بمقاسات أندرويد، وهو **ليس** بديلاً عن WebView واتساب."],
  ["WhatsApp Web · iOS · Desktop", "لم تُشغَّل ⇒ لا يُعلن دعم."],
  ["`npm run test:live` (3 ملفات)", "تتصل بمزوّدات حقيقية وتحتاج مفاتيح وشبكة خارجية."],
  ["بقية `@yudzxml/baileys` (437 ملفاً) و`whatsapp-rust-bridge`", "فُحص مسار HTML والبراهين فقط. الملحق الأصلي لا تكفيه مراجعة مصدر."],
  ["قياس أداء على هاتف فعلي (FPS · حرارة · بطارية)", "لا جهاز."],
];

const label = (s) => ({ PASS: "✅ PASS", FAIL: "❌ FAIL", BLOCKED: "⏭️ BLOCKED" }[s] || s);
const esc = (t) => String(t).replace(/\|/g, "\\|");
const row = (f) => {
  const r = rows.get(f);
  const note = r.state === "BLOCKED" ? r.reason.replace(/^⏭️?\s*/, "") : r.summary || "—";
  return `| \`${f}\` | ${label(r.state)} | ${(r.ms / 1000).toFixed(1)}ث | ${esc(note).slice(0, 230)} |`;
};
const table = (list) => (list.length ? `| الاختبار | الحالة | المدة | الملخّص |\n|---|---|---|---|\n${list.map(row).join("\n")}` : "_لا شيء._");

/** WEB_FILES_UNCHANGED يُقاس الآن لا يُنقل من ذاكرة */
let webGuard = "NOT RUN";
try {
  execFileSync(process.execPath, ["tools/terboo-web-manifest.mjs", "--check"], { cwd: ROOT, stdio: "pipe" });
  webGuard = "**PASS**";
} catch { webGuard = "**FAIL**"; }

const regressed = probe ? (probe.results || []).filter((r) => r.nowState === "FAIL" && r.state === "PASS") : [];
const repaired = probe ? (probe.results || []).filter((r) => r.nowState === "PASS" && r.state !== "PASS") : [];

const doc = `# TERBOO — تقرير اختبارات ألعاب Mini Apps

> **ملف مولّد** من نتائج تشغيل فعلية. لإعادة التوليد:
>
> \`\`\`bash
> node tools/terboo-run-tests.mjs --json after.json
> node tools/terboo-baseline-probe.mjs --after after.json --out probe.json
> node tools/terboo-game-miniapp-test-report.mjs --after after.json --baseline-probe probe.json
> \`\`\`
>
> التشغيل: ${data.generatedAt || "—"} · Node ${data.node || process.version}

## 0. القاعدة (§14.6)

| الحالة | معناها |
|---|---|
| **PASS** | شُغّل وأكّد كل دعاواه |
| **FAIL** | شُغّل وسقطت فيه دعوى |
| **BLOCKED** | شُغّل وأعلن تخطّياً لانعدام شرط بيئي. **لا يُحتسب نجاحاً** |
| **NOT RUN** | لم يُشغَّل — لا وسيلة في هذا المحيط |

المشغّل يفرز BLOCKED بنفسه (خروج بـ0 بعد «⏭️» بلا سطر «✅»)، والمولّد يفشل إن
اختلف عدّه عن عدّ المشغّل.

## 1. الحصيلة

| | |
|---|---|
| ملفات الاختبار المحلية | **${files.length}** |
| ✅ PASS | **${PASS.length}** |
| ❌ FAIL | **${FAIL.length}** |
| ⏭️ BLOCKED | **${BLOCKED.length}** |
| ⛔ NOT RUN | **${NOT_RUN.length}** بنداً · منها ${data.notRun ?? data.skipped ?? 0} ملف live |
| **WEB_FILES_UNCHANGED (§14.5)** | ${webGuard} — قيس عند توليد هذا التقرير |
| انحدار مقابل خط الأساس | **${probe ? regressed.length : "لم يُقَس"}** |

## 2. اختبارات هذا العمل

${table([...MINE.keys()].filter((f) => rows.has(f)))}

**ما يثبته كل واحد:**

${[...MINE].filter(([f]) => rows.has(f)).map(([f, what]) => `- \`${f}\` (${label(rows.get(f).state)}) — ${what}`).join("\n")}

## 3. اختبارات أصلحها هذا العمل

${repaired.length ? `| الاختبار | الدعوى على خط الأساس \`${probe.base.slice(0, 8)}\` | ما أصلحها |
|---|---|---|
${repaired.map((r) => `| \`${r.file}\` | ${esc(r.claim || "(لا سطر دعوى)")} | ${esc(REPAIRED.get(r.file) || "—")} |`).join("\n")}

> لم يُعدَّل أي اختبار ليمر؛ الكود هو ما تغيّر.` : `**لا اختبار كان فاشلاً فصار ناجحاً.** خط الأساس \`${probe?.base?.slice(0, 8) || "—"}\` هو التسليم السابق، وكل ما كان ناجحاً فيه ما زال ناجحاً (انحدار صفر).

لكن ثلاثة عيوب حقيقية أُصلحت في هذا العمل كشفتها حَرَسة قائمة أو تقرير مولَّد،
ولم تكن تظهر كاختبار أحمر:

| العيب | من كشفه | الإصلاح |
|---|---|---|
| غلاف «مُعاد توجيهها من بوت» في حمولتي | \`terboo-rich-response\` (حارس انتحال Meta AI) | الحمولة صارت \`richResponseMessage\` في المستوى الأعلى، بلا غلاف |
| \`proto.*.fromObject(\` في كود إنتاج | \`terboo-protobuf\` | \`encode\` يقبل كائناً عادياً |
| \`games.contracts()\` يُعيد 22 نسخة ظلّ بلا \`controller\` | المصفوفة المولَّدة (67 مقابل 45) | \`arcade\` هو المصدر، والسجل لا يضيف إلا ما لم يُرحَّل |

العيبان الأولان ظهرا في **تشغيل كامل للمجموعة** لا في الاختبارات المتأثرة وحدها،
والثالث ظهر لأن المصفوفة تُحسب من الكود فاختلف رقمها عن بقية التقارير.`}

## 4. اختبارات قائمة لمسها هذا العمل

${table([...TOUCHED].filter((f) => rows.has(f)).sort())}

## 5. ❌ FAIL

${FAIL.length ? `${table(FAIL)}

### التشخيص وخط الأساس

| الاختبار | الدعوى الآن | على خط الأساس \`${probe?.base?.slice(0, 8) || "—"}\` | الحكم |
|---|---|---|---|
${FAIL.map((f) => {
  const hit = probe?.results?.find((x) => x.file === f);
  const now = esc(hit?.nowClaim || "(لا سطر دعوى — يفشل عبر مولّد خارجي)");
  const was = esc(hit?.claim || "(لا سطر دعوى)");
  const verdict = !hit ? "لم يُفحص" : hit.state === "PASS" ? "**انحدار**" : hit.sameClaim ? "فشل سابق · نفس الدعوى" : "فشل سابق · الدعوى تغيّرت";
  return `| \`${f}\` | ${now} | ${was} | ${verdict} |`;
}).join("\n")}

### السبب الجذري

| الاختبار | السبب |
|---|---|
${FAIL.map((f) => `| \`${f}\` | ${esc(DIAGNOSIS.get(f) || "—")} |`).join("\n")}

**لم يُعدَّل أي اختبار ليمر.** كل هذه الإخفاقات **خارج مسار ألعاب Mini Apps**،
وأربعة منها بجذر واحد في \`src/lib/terboo-code-renderer.js\` — أحد ملفات عرض
الكود الخمسة التي يشترط التسليم شحنها مطابقة بايتاً ببايت، فلم تُلمس. القرار
للمالك: إمّا أن يكون الافتراضي \`"image"\` ⇒ تمر الأربعة، أو يبقى \`"rich"\`
مقصوداً ⇒ تُحدَّث الاختبارات الأربعة. وهو قرار عرض كود لا ألعاب.` : "لا ملف فاشل."}

## 6. ⏭️ BLOCKED

${BLOCKED.length ? `**لا تُحتسب ناجحة.**\n\n${table(BLOCKED)}` : "لا ملف مُعطَّل — كل الاختبارات البيئية (متصفح حقيقي) وجدت شرطها."}

## 7. ⛔ NOT RUN

| البند | السبب |
|---|---|
${NOT_RUN.map(([item, why]) => `| ${item} | ${why} |`).join("\n")}

## 8. تصنيف ما ثبت فعلاً

| التصنيف | البنود |
|---|---|
| **ثبت بتشغيل حقيقي** | خمس ألعاب تُلعب في Chromium 141 بإدخال يغيّر الحالة · رسالة واحدة لكل لعبة بلا صورة ولا رابط ولا أزرار · 0 حقل إثبات ملفَّق مع حارس مُختبَر · بروتو الحزمة الرسمية يحمل الشكل السلكي · الميزانية والمحيط يرفضان قبل الإرسال · WEB_FILES_UNCHANGED بحارس مُختبَر · ${PASS.length} ملف اختبار |
| **ثبت بفحص مصدر** | تلفيق إثبات التحقق في \`@yudzxml/baileys@7.6.6\` بنسختين · عدم وجود مسار يتفاداه · قيود المحيط (شبكة · تخزين · ميزانية) |
| **رُفض بدليل** | \`sendHtmlApp\` — التفصيل في \`TERBOO_YUDZXML_LIBRARY_REVIEW.md\` §1 |
| **لم يُختبر لعدم توفر جهاز/خدمة** | عرض اللعبة على عميل واتساب حقيقي (§14.4) · WebView واتساب · اختبارات live · بقية الحزمة والملحق الأصلي |

## 9. كل الملفات بحالتها

${table(files)}
`;

fs.writeFileSync(OUT, doc);
console.log(JSON.stringify({ total: files.length, PASS: PASS.length, FAIL: FAIL.length, BLOCKED: BLOCKED.length, NOT_RUN: NOT_RUN.length, webGuard, regressed: regressed.length, repaired: repaired.length }));
console.log(`→ ${path.relative(ROOT, OUT)}`);
