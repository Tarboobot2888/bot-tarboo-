# 📘 Bot Terboo V6 — التدقيق النهائي (المرجع الوحيد)

> هذا المستند هو **المصدر الوحيد للحقيقة** لحالة Bot Terboo V6. تقارير V3/V4/V5 في `docs/archive/` تاريخية.
> الأرقام مولّدة من الأدوات لا مكتوبة يدوياً: `node tools/terboo-forensic-v6.mjs` · `node tools/terboo-inventory.mjs` · `node tools/terboo-run-tests.mjs`.

## الأعداد (مولّدة)

| البند | العدد |
|---|---|
| إجمالي الملفات | 1726 |
| البلوقنات (ملفات) | 911 · مسجّلة 909 (اثنان معطّلان صراحةً) |
| الأوامر | 1225 |
| الفئات | 37 |
| السكرابرز | 63 (كلها في سجل الأدوات) |
| أدوات الذكاء | 63 |
| المزوّدات | 6 |
| القدرات الموحّدة | 1055 (سجل القدرات §12) |
| المضيفات الخارجية | 350 (مصنّفة) |
| ملفات الاختبار | 116 (113 محلي · 3 live) |

## نتيجة الاختبارات (مولّدة من الـrunner)

- **110/113 اختبار محلي ناجح · 3 فشلت** (`terboo-ai-quality` · `terboo-brand-lock` · `terboo-localization`) · و3 اختبارات live خارج التشغيل (`npm run test:live`).
  > ⚠️ **تصحيح**: النسخة الأولى من هذا المستند قرأت «110/113» على أن الثلاثة الباقية هي اختبارات live — والصحيح أنها 3 إخفاقات حقيقية.
  > أُصلحت الثلاثة في TERBOO ARCADE (دردشة الموقع عبر `composeReply` في النواة · إصدار 6.0 في اختبار الهوية · نص `web.usage` بلا عربي في en/es)،
  > وصار سطر الـrunner صريحاً: «ناجح · فاشل · live لم يُشغَّل». الأرقام الحالية: `docs/TERBOO_GAME_RELEASE_AUDIT.md`.
- `audit:strict` = صفر مخالفات. `lint` نظيف. `test:syntax` يمر.
- `terboo-forensic-v6`: **0 إخفاق صامت · 0 نص يشبه سراً خارج config.js · 0 عائق**.

## ما أُنجز في V6 (بالمراحل)

| المرحلة | الملخص |
|---|---|
| 0 | فحص جنائي قابل لإعادة التوليد (`tools/terboo-forensic-v6.mjs`). |
| 1 | التسجيل اختياري (أزيلت البوابة) · توحيد الإصدار V6 · قسم website · أرشفة تقارير V3/V4/V5. |
| 2–4 | بحث الأعضاء بالاسم · قائمة أعضاء مقسّمة · «نفس اللي عملناه» · سجل القدرات الموحّد (1055). |
| 5 | إغلاق ترحيل الواجهة (28 بلوقن على النوايا) · زر «🌐 موقع Bot Terboo». |
| 6 | إنشاء VPS حقيقي (Virtualizor addvs) بتحقق وتراجع · الباقات الاقتصادية opt-in · عزل DigitalOcean. |
| 7 | إزالة الإخفاق الصامت في كل شجرة الإنتاج (1217 ملفاً · 0) · عزل أداة OTP. |
| 8–11 | موقع كامل (خادم بلا تبعيات · دخول آمن · SSE · أدوار server-side · i18n/RTL) على نفس النواة. |
| 12–15 | الاختبارات والتوثيق والحزمة النهائية. |

## المحفوظ

كل البلوقنات والسكرابرز والألعاب والأوامر والـAPIs في `config.js` كما هي. لا حذف لوظيفة عاملة؛ المسارات القديمة عُزلت (معطّلة افتراضياً) لا حُذفت.

## الملفات الخمسة لعرض الكود (محمية، بلا تغيير)

`src/lib/terboo-rich-response.js` · `src/lib/terboo-code-renderer.js` · `src/lib/terboo-code-card.js` · `plugins/owner/بطاقة_الكود.js` · `plugins/owner/كشف_الكود.js` — يتحقق منها `tools/terboo-package.mjs` بصمةً وتُدرَج في كل حزمة.

## الوثائق المرجعية

- `TERBOO_V6_FORENSIC_AUDIT.md` · `TERBOO_V6_AI_CLOSEOUT.md` · `TERBOO_V6_GROUP_INTELLIGENCE.md`
- `TERBOO_V6_VPS_PROVISIONING.md` · `TERBOO_V6_WEBSITE_ARCHITECTURE.md` · `TERBOO_V6_WEBSITE_SECURITY.md`
- `TERBOO_V6_UI_MIGRATION_CLOSEOUT.md` · `TERBOO_V6_SILENT_CATCH_CLOSEOUT.md`
- `TERBOO_V6_RELEASE_CHECKLIST.md` · `TERBOO_REQUIRED_RUNTIME_INPUTS.md`

## الحدود (بصدق — لا ادّعاء 100%)

- الاختبارات الحيّة (مزوّدات/صور/سكرابر حيّ) غير مُشغَّلة في هذه البيئة المغلقة.
- إنشاء VPS لم يُجرَّب على عقدة Virtualizor حقيقية؛ المعاملات من الوثائق الرسمية (راجع `TERBOO_V6_VPS_PROVISIONING.md`).
- إجراءات مجموعة الموقع ورفع الملفات: البنية جاهزة، والتفعيل الكامل يحتاج تشغيل الموقع داخل عملية البوت (ونقطة رفع POST).
- الموقع لم يُنشر خلف reverse proxy حقيقي في هذه البيئة (دليل النشر في `TERBOO_V6_WEBSITE_ARCHITECTURE.md`).
