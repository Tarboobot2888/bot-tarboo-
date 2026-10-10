# TERBOO NATIVE MINI APPS — تقرير الاختبارات

> **ملف مولّد** من نتائج تشغيل فعلية — لا رقم مكتوب يدوياً. لإعادة التوليد:
>
> ```bash
> node tools/terboo-run-tests.mjs --json after.json
> node tools/terboo-native-miniapp-test-report.mjs --after after.json
> ```
>
> النتائج الخام مشحونة مع الحزمة للتحقق:
> `docs/v6/native-miniapp-test-results.json` (كل ملف بحالته ومدته) و
> `docs/v6/native-miniapp-baseline-probe.json` (الدعوى الساقطة في الشجرتين).
>
> التشغيل: 2026-10-10T08:44:20.387Z · Node v22.22.0

## 0. القاعدة المتّبعة (§19)

كل ملف اختبار يأخذ **حالة واحدة** من أربع، ولا تُجمع الحالات:

| الحالة | معناها |
|---|---|
| **PASS** | شُغّل وفحص وأكّد كل دعاواه |
| **FAIL** | شُغّل وسقطت فيه دعوى |
| **BLOCKED** | شُغّل وأعلن تخطّياً لانعدام شرط بيئي (متصفح · مفتاح). **لا يُحتسب نجاحاً** |
| **NOT RUN** | لم يُشغَّل أصلاً — لا وسيلة في هذا المحيط |

المشغّل `tools/terboo-run-tests.mjs` يفرز BLOCKED بنفسه: ملف يخرج بـ0 بعد إعلان «⏭️» بلا سطر تأكيد «✅» يُسجَّل BLOCKED لا PASS، ومولّد هذا التقرير يفشل إن اختلف عدّه عن عدّ المشغّل.

---

## 1. الحصيلة

| | |
|---|---|
| ملفات الاختبار المحلية | **127** |
| ✅ PASS | **120** |
| ❌ FAIL | **7** |
| ⏭️ BLOCKED | **0** |
| ⛔ NOT RUN (بنود بيئية) | **7** بنداً · منها 3 ملف live |


---

## 2. اختبارات كُتبت لهذا العمل

| الاختبار | الحالة | المدة | الملخّص |
|---|---|---|---|
| `terboo-miniapp-builders.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-miniapp-builders: 2 بنّاء × 3 لغات · بنية ومحتوى وحجم · 0 مورد خارجي · 0 معرّف مكرر · بلا شبكة/eval · حارس إخفاء + تحرير لمس · nonce · أزرار مربوطة · سجل |
| `terboo-miniapp-transport.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-miniapp-transport: القناة المضمَّنة معلَّلة ولا تُعلن · رسالة واحدة لكل لعبة · 0 صورة · 0 زر حركة · رابط من نطاق المالك · فشل النقل ⇒ نص · اللغة من الطرف للطرف · لعبة مجهولة صامتة |
| `terboo-miniapp-play.test.mjs` | ✅ PASS | 7.4ث | ✅ terboo-miniapp-play: XO تُلعب (نقرة⇒X · رد الكمبيوتر · رفض خانة مشغولة · إعادة بلا مستمع مكرر · صعب لا يُهزم) · Sonic (حلقة تتقدم · قفز · تتوقف عند الإخفاء) · 320/360/412px بلا overflow · RTL+LTR · 0 أخطاء console · 0 طلب خارجي |
| `terboo-miniapp-ui.test.mjs` | ✅ PASS | 15.0ث | ✅ terboo-miniapp-ui: Chromium حقيقي · صفحة لعب على 320/360/412/480/820px بلا overflow · RTL+LTR · 0 أخطاء console · 0 موارد خارجية · نقرة لمس ⇒ حالة الخادم · حقل قرار مرفوض · أصل بصري same-origin موقّع · كتالوج 45+2 لعبة ببحث وفلاتر |
| `terboo-miniapp-security.test.mjs` | ✅ PASS | 2.9ث | ✅ terboo-miniapp-security: وكيل الأصول (توقيع · عبث · انتهاء · مضيف مغلق · لا SVG/HTML · 405) · قناة الإجراءات (stale · bad-nonce · expired · 6 حقول قرار · actionId · حمولة ضخمة · رمز غريب · تزامن ⇒ 1) · رمز بلا هوية خام · سرية الاختيار في  |
| `terboo-game-image-policy.test.mjs` | ✅ PASS | 3.5ث | ✅ terboo-game-image-policy: فحص ثابت (107 ملف · 0 مولّد · 0 حقل صورة) · دورة حياة 45 لعبة بلا صورة · فشل النقل بلا صورة · عقد VisualResponse (ألعاب ممنوعة · غير الألعاب مسموحة) · بنّاء HTML بلا img/data:image |

**ما يثبته كل واحد:**

- `terboo-miniapp-builders.test.mjs` (✅ PASS) — البنّاءان (Sonic · XO) × 3 لغات: بنية المستند · وسم اللغة والاتجاه · حجم تحت الحد · 0 مورد خارجي · 0 `<script src>` · nonce يُمرَّر إلى كل وسم script.
- `terboo-miniapp-transport.test.mjs` (✅ PASS) — النقل: القناة المضمَّنة لا تُعلن متاحة ولو فُعّلت صراحةً وتذكر سبب الرفض · **رسالة واحدة** لكل لعبة · 0 حقل صورة · 0 زر حركة واتساب · الرابط من نطاق المالك · فشل الإرسال ⇒ نص صريح لا صورة ولا أزرار · اللغة من الطرف للطرف · لعبة مجهولة لا تُرسل شيئاً.
- `terboo-miniapp-play.test.mjs` (✅ PASS) — **Chromium حقيقي**: XO تُلعب فعلاً (نقرة ⇒ X · رد الكمبيوتر · رفض خانة مشغولة · إعادة بلا مستمع مكرر · المستوى الصعب لا يُهزم في مباراة كاملة) و Sonic (الحلقة تتقدم · القفز يرفع · تتوقف عند إخفاء الصفحة) · 320/360/412px بلا overflow · RTL+LTR · 0 خطأ console · 0 طلب خارجي.
- `terboo-miniapp-ui.test.mjs` (✅ PASS) — **Chromium حقيقي** على الموقع المُشغَّل: صفحة اللعب والكتالوج على 320/360/412/480/820px · أهداف لمس ≥40px · `prefers-reduced-motion` · نقرة لمس تغيّر حالة الخادم (يُستجوَب المحرك لا DOM) · حمولة فيها حقل قرار خادمي مرفوضة · الأصل البصري من مسار الوكيل الموقّع فقط.
- `terboo-miniapp-security.test.mjs` (✅ PASS) — وكيل الأصول (توقيع · عبث بالـMAC · تبديل العنوان · انتهاء · مضيفات مغلقة تمنع localhost و169.254.169.254 · http · SVG/HTML · غير-GET) وقناة الإجراءات (nonce قديم/مختلق · طابع زمني بعيد · حقول قرار خادمي · actionId مشوّه · حمولة ضخمة ثم بقاء الخادم · رمز غرفة أخرى · تزامن ⇒ قبول واحد) ورمز لعب بلا هوية.
- `terboo-game-image-policy.test.mjs` (✅ PASS) — فحص ثابت + AST على كل ملفات مسارات الألعاب (0 مولّد صور · 0 حقل حمولة صورة) ثم دورة حياة كاملة لكل لعبة في السجل على mock socket وتفتيش كل رسالة صادرة عن حقل صورة أو بايتات PNG/JPEG/GIF/WebP أو `data:image`.

---

## 2.5 اختبارات كانت فاشلة وأصلحها هذا العمل

| الاختبار | الدعوى الساقطة على خط الأساس `8c07b889` | ما أصلحها |
|---|---|---|
| `terboo-secrets-vault.test.mjs` | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: | `guardContentText` في `src/lib/terboo-wa-compat.js` صار يُخفي الأسرار المسجّلة وتوكنات اللوحات في `text`/`caption` قبل الشبكة (`redactSecrets(value, { generic: false })`). كان الاختبار يسقط أبكر على `secretCount() >= 2` لأن الإعداد القالبي بلا أسرار، فلم يصل أحد إلى الدعوى الحقيقية: سر مسجّل كان يُرسل في نص الرسالة كما هو. |

> لم يُعدَّل أي اختبار: الكود هو ما تغيّر. الدليل أعلاه من تشغيل الملف نفسه على خط الأساس وعلى الشجرة الحالية.

---

## 3. اختبارات قائمة لمسها هذا العمل

| الاختبار | الحالة | المدة | الملخّص |
|---|---|---|---|
| `terboo-arcade-ai.test.mjs` | ✅ PASS | 3.5ث | ✅ terboo-arcade-ai: 11 ألعاب بخصم (4 مستويات قانونية وحتمية) · XO خبير بلا خسارة · سد/إكمال · لا قراءة أسرار · مستويات مختلفة · لا LLM · 19 حالة نية |
| `terboo-arcade-games.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-arcade-games: 23/23 لعبة لُعبت حتى النهاية · قواعد (جاذبية · أكل إجباري · قلب · كشف آمن · دمج · سودوكو · وردل · ثيران · حروف) · لا تسريب (سفن · بطاقات · إجابة · سر · تتابع) |
| `terboo-arcade-html.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-arcade-html: هروب · مدقق (11 رفض) · نقل HTML primitive لـ23 لعبة · بلا انتحال · جسر الإجراءات غير مُعلن · قوالب بموافقة المالك · 6 ثيمات · renderers |
| `terboo-arcade-multiplayer.test.mjs` | ✅ PASS | 4.6ث | ✅ terboo-arcade-multiplayer: XO مجموعة (أزرار+كتابة+nonce+دور+فوز+مكافأة) · تحدي صديق · ضد الكمبيوتر · ثعبان وسلم 4 لاعبين · أسئلة جماعية · اختيار سري في الخاص · كلام طبيعي |
| `terboo-import-graph.test.mjs` | ✅ PASS | 1.5ث | ✅ terboo-import-graph: 1436 ملف · 5402 استيراد · 0 مفقود · 0 استيراد محلي قديم |
| `terboo-no-silent-catch.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-no-silent-catch: 1313 ملف · 0 catch صامت · 857 موضع تسجيل · السجل والتسجيل والإرسال الحقيقي |
| `terboo-syntax.test.mjs` | ✅ PASS | 11.3ث | ✅ terboo-syntax: 1436 ملف · 0 أخطاء نحوية |
| `terboo-visual-response.test.mjs` | ✅ PASS | 5.1ث | ✅ terboo-visual-response: 926 أمر · HTML مؤهل 45 (ألعاب فقط، يُسلَّم hybrid) · تحقق يرفض الميت/غير المُدقَّق · تسليم موحّد · المصفوفة حديثة |
| `terboo-web-arcade.test.mjs` | ✅ PASS | 3.6ث | ✅ terboo-web-arcade: رمز موقّع · API (قبول/قديم/محظور/منتهٍ/منشأ/JSON) · صفحة اللعب + CSP · كتالوج 45 · رابط تلقائي/مالك · زر الخاص + رابط شخصي للمجموعة · .موقع (منفذ/رابط/SSL + HTTPS فعلي) |

---

## 4. ❌ FAIL — كل فشل بسببه الجذري

### الدعوى الساقطة الآن مقابل خط الأساس `8c07b889`

| الاختبار | المدة | الدعوى الآن | على خط الأساس | الحكم |
|---|---|---|---|---|
| `terboo-baileys-migration.test.mjs` | 0.7ث | AssertionError [ERR_ASSERTION]: أُرسلت رسالة غنية بلا تفعيل · 1 !== 0 | AssertionError [ERR_ASSERTION]: أُرسلت رسالة غنية بلا تفعيل · 1 !== 0 | فشل سابق · **نفس الدعوى حرفياً** |
| `terboo-channel-forward.test.mjs` | 0.4ث | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: · 'text' !== 'rich' | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: · 'text' !== 'rich' | فشل سابق · **نفس الدعوى حرفياً** |
| `terboo-code-card.test.mjs` | 0.7ث | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | فشل سابق · **نفس الدعوى حرفياً** |
| `terboo-design.test.mjs` | 8.2ث | (لا سطر دعوى — يفشل عبر مولّد خارجي) | (لا سطر دعوى — يفشل عبر مولّد خارجي) | فشل سابق · نفس شكل الفشل |
| `terboo-group-ai-reports.test.mjs` | 2.6ث | AssertionError [ERR_ASSERTION]: رسالة غنية لا تُعرض على الأجهزة العادية · 1 !== 0 | AssertionError [ERR_ASSERTION]: رسالة غنية لا تُعرض على الأجهزة العادية · 1 !== 0 | فشل سابق · **نفس الدعوى حرفياً** |
| `terboo-i18n-runtime.test.mjs` | 2.3ث | AssertionError [ERR_ASSERTION]: وحدات بلا ترجمة: 27 · 27 !== 0 | AssertionError [ERR_ASSERTION]: وحدات بلا ترجمة: 30 · 30 !== 0 | فشل سابق · الدعوى تغيّرت (انظر التشخيص) |
| `terboo-typography.test.mjs` | 0.6ث | AssertionError [ERR_ASSERTION]: Inter لا يُستعمل داخل SVG (يرسم بخط النظام) | AssertionError [ERR_ASSERTION]: Inter لا يُستعمل داخل SVG (يرسم بخط النظام) | فشل سابق · **نفس الدعوى حرفياً** |


### السبب الجذري

| الاختبار | السبب |
|---|---|
| `terboo-baileys-migration.test.mjs` | كتل الكود تُرسل رسالة غنية افتراضياً. `normalizeMode` في `src/lib/terboo-code-renderer.js:20` يحوّل كل قيمة غير `"text"` إلى `"rich"`، و`LEGACY_MODES` في السطر 14 يحوّل `"image"` نفسها إلى `"rich"`. الاختبار يتوقّع ألا تُرسل رسالة غنية بلا تفعيل. |
| `terboo-channel-forward.test.mjs` | نفس الجذر: الاختبار يتوقّع أن `.بطاقة_الكود rich` يضبط `richCode="rich"`، لكن `plugins/owner/بطاقة_الكود.js` لا يملك وضع `rich` أصلاً (سطر 10 يذكر أن البطاقة الغنية ليست خياراً لأنها تتطلّب انتحال بوت Meta AI). |
| `terboo-code-card.test.mjs` | نفس الجذر: الاختبار يتوقّع بطاقة صورة + نسخة نصية عبر `sendMessage`، والتنفيذ يعترض كتلة الكود ويُرسلها عبر `relayMessage` كرسالة غنية، فلا تظهر أي رسالة في `sendMessage`. |
| `terboo-design.test.mjs` | ثلاثة بلوقنات ألعاب قديمة (`fish.js` · `ماينكرافت.js` · `مستذئب.js`) تحمل زخرفة وbackticks من طبقة تصميم سابقة — 8 مخالفات لكل ملف. ليست من مسارات Mini Apps، ولم تُرحَّل في هذا العمل. |
| `terboo-group-ai-reports.test.mjs` | نفس الجذر: تقرير المجموعة يمر من نفس مسار عرض الكود، فيرى الاختبار رسالة غنية واحدة حيث يتوقّع صفراً. |
| `terboo-i18n-runtime.test.mjs` | 27 مدخل ترجمة ناقص في `ماينكرافت.js` · `مستذئب.js` · `terboo-rich-response.js`. ملفات هذا العمل تساهم بصفر: بنّاؤو Mini Apps مستثنون بتوثيق صريح (`tools/terboo-i18n-extract.mjs`) لأن نصوصهم في قاموس COPY ثلاثي اللغة، والحارس عليه اختبار يرفض أي حرف عربي في واجهة en/es. |
| `terboo-typography.test.mjs` | `Inter` لا يُستعمل داخل SVG (يُرسم بخط النظام) — مسار الخطوط والرسم، خارج نطاق الألعاب. |

> **كيف قيس هذا:** `node tools/terboo-baseline-probe.mjs` ينشئ `git worktree` على
> `8c07b8893f6974f6ff786de1303bf04a24ddc592` (الشجرة المدمجة قبل أي تعديل في هذا العمل)، يربط نفس
> `node_modules` وينسخ `config.example.js` إعداداً، ثم يشغّل **كل ملف فاشل مرتين**:
> مرة في الشجرة الحالية ومرة على خط الأساس، ويقارن سطر الدعوى الساقطة لا مجرد الحالة.
> النتيجة: 8/8 يفشل على خط الأساس أيضاً · **0 انحدار**.
>
> الملفان اللذان تغيّرت دعواهما تغيّرا **نحو الأقل**: `terboo-i18n-runtime` من 30 نقصاً إلى 27
> (مدخلات هذا العمل كلها مُترجمة)، و`terboo-design` يفشل عبر مولّد خارجي بلا سطر دعوى،
> وعدد مخالفاته 24 الآن كما على خط الأساس بالضبط: المخالفتان اللتان أدخلهما هذا العمل
> في `plugins/ai/تخيل3.js` (backticks في نص معروض) أُزيلتا، والـ24 الباقية كلها سابقة.


**لم يُعدَّل أي اختبار ليمر.** أربعة من هذه الإخفاقات جذرها واحد في `src/lib/terboo-code-renderer.js` — وهو أحد ملفات عرض الكود الخمسة التي يشترط التسليم شحنها **مطابقة بايتاً ببايت**، فلم تُلمس. القرار للمالك:
>
> ```js
> // src/lib/terboo-code-renderer.js
> const LEGACY_MODES = { auto: "rich", image: "rich" };   // ← "image" تُحوَّل إلى "rich"
> const normalizeMode = (value) => { ... return MODES.has(mode) ? mode : "rich"; };  // ← الافتراضي "rich"
> ```
>
> `normalizeMode` يعيد `"rich"` لكل قيمة عدا `"text"`، بما فيها `"image"` التي يضبطها
> `plugins/owner/بطاقة_الكود.js` نفسه (وسطر 10 فيه يقول إن البطاقة الغنية ليست خياراً
> لأنها تتطلّب انتحال بوت Meta AI). فإمّا أن يكون الافتراضي `"image"` ويُحتفظ بالتعيين
> كما يضبطه البلوقن ⇒ تمر الأربعة، أو يبقى `"rich"` مقصوداً ⇒ تُحدَّث الاختبارات الأربعة.
> هذا قرار سلوك عرض الكود لا الألعاب، ولم يُطلب في هذا العمل، فلم يُتخذ من جانبي.

---

## 5. ⏭️ BLOCKED — شُغّل ولم يفحص

لا ملف مُعطَّل في هذا التشغيل — كل الاختبارات البيئية (متصفح حقيقي) وجدت شرطها.

_لا شيء._

---

## 6. ⛔ NOT RUN — لم يُشغَّل، ولا يُدَّعى

| البند | السبب |
|---|---|
| إرسال واستقبال على حساب واتساب حقيقي | لا حساب واتساب ولا اقتران في بيئة التنفيذ. **لا يُدّعى أي نتيجة إرسال حيّ.** |
| تصيير Mini App داخل فقاعة الرسالة على WhatsApp Android | القناة المضمَّنة الوحيدة المعروفة تتطلّب تزوير إثبات تحقق Meta ⇒ مرفوضة ومطفأة. لا يوجد ما يُختبر. |
| فتح الرابط في متصفح أندرويد المدمج (WebView) داخل واتساب | لا جهاز أندرويد ولا emulator. التجاوب واللمس اختُبرا في Chromium 141 بمقاسات أندرويد، وهو ليس بديلاً عن WebView واتساب. |
| WhatsApp Web · iOS · Desktop | لم تُشغَّل ⇒ لا يُعلن دعم. |
| `npm run test:live` (3 ملفات) | تتصل بمزوّدات حقيقية وتحتاج مفاتيح API وشبكة خارجية. |
| جلب أصل بصري من مضيف خارجي فعلي عبر الوكيل | الوكيل مُختبر على التوقيع والتحقق والأنواع والمضيفات؛ الجلب الشبكي الحقيقي لم يُنفَّذ. |
| قياس أداء على هاتف فعلي (FPS · حرارة · بطارية) | لا جهاز. قياس الحلقة جرى في Chromium فقط. |

---

## 7. تصنيف ما ثبت فعلاً

| التصنيف | البنود |
|---|---|
| **ثبت بتشغيل حقيقي** | لعب XO و Sonic في Chromium 141 (نقرة ⇒ حالة · كمبيوتر لا يُهزم · حلقة تتقدم وتتوقف) · رسالة واحدة لكل لعبة بلا صورة وبلا أزرار حركة · أمان وكيل الأصول وقناة الإجراءات · خلو مسارات الألعاب من الصور (ثابت + AST + دورة حياة) · 120 ملف اختبار |
| **ثبت ثابتاً فقط** | بنية رسالة واتساب التفاعلية عبر mock socket ومصفوفات مولّدة؛ لم تُعرض على عميل واتساب حقيقي |
| **رُفض بدليل** | القناة المضمَّنة في `@yudzxml/baileys` — تبني `signature` و`certificateChain` من نص ثابت لتبدو رداً موثقاً من Meta. الدليل في `TERBOO_NATIVE_MINIAPP_AUDIT.md` §3 و`TERBOO_NATIVE_MINIAPP_SECURITY_REPORT.md` §1 |
| **لم يُختبر لعدم توفر جهاز/خدمة** | عميل واتساب على أي منصة · WebView أندرويد · اختبارات live · الجلب الشبكي للأصول · قياس أداء على هاتف |

---

## 8. كل الملفات بحالتها

| الاختبار | الحالة | المدة | الملخّص |
|---|---|---|---|
| `agent-control.test.mjs` | ✅ PASS | 0.1ث | — |
| `agent-health-memory.test.mjs` | ✅ PASS | 0.2ث | — |
| `agent-plugin.test.mjs` | ✅ PASS | 12.0ث | — |
| `ai-studio-behavioral.test.mjs` | ✅ PASS | 0.6ث | — |
| `ai-studio-foundation.test.mjs` | ✅ PASS | 0.4ث | — |
| `ai-studio-image-policy.test.mjs` | ✅ PASS | 0.0ث | — |
| `ai-workspace-router.test.mjs` | ✅ PASS | 0.4ث | — |
| `autoai-always-reply.test.mjs` | ✅ PASS | 0.7ث | — |
| `autoai-arabic-personas.test.mjs` | ✅ PASS | 0.4ث | — |
| `autoai-behavioral.test.mjs` | ✅ PASS | 0.8ث | — |
| `bot-loop-guard.test.mjs` | ✅ PASS | 0.6ث | ✅ bot-loop-guard.test.mjs passed |
| `environment-key-guard.test.mjs` | ✅ PASS | 0.5ث | — |
| `handler-speaker-priority.integration.test.mjs` | ✅ PASS | 1.1ث | ✅ handler speaker-priority integration test passed |
| `import-repair.test.mjs` | ✅ PASS | 0.5ث | — |
| `manus-agent.test.mjs` | ✅ PASS | 0.3ث | — |
| `mode-config-guard.test.mjs` | ✅ PASS | 0.4ث | — |
| `owner-bypass.test.mjs` | ✅ PASS | 0.3ث | — |
| `pindl.test.mjs` | ✅ PASS | 0.3ث | — |
| `plugin-diagnostics.test.mjs` | ✅ PASS | 0.1ث | — |
| `plugin-move.test.mjs` | ✅ PASS | 0.2ث | — |
| `provider-health.test.mjs` | ✅ PASS | 0.1ث | — |
| `raw-code-plugin.test.mjs` | ✅ PASS | 0.3ث | — |
| `reddit.test.mjs` | ✅ PASS | 0.2ث | — |
| `reply-variant-selector.test.mjs` | ✅ PASS | 0.4ث | — |
| `spotify-provider.test.mjs` | ✅ PASS | 3.2ث | — |
| `task-queue.test.mjs` | ✅ PASS | 0.1ث | — |
| `terboo-agent-limits.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-agent-limits: step-timeout-rollback · user-interrupt · plan-budget · max-steps |
| `terboo-ai-agent-actions.test.mjs` | ✅ PASS | 15.0ث | ✅ terboo-ai-agent-actions: 28 سيناريو حقيقي — cooldown-explained · 01-add-by-name · 02-kick-pronoun-lid · 03-readd · 04-promote-pronoun · 05-members · 06-admins · 07-presence · 07b-demote-same-member · 07c-owner-last-added-search · 07d-foll |
| `terboo-ai-agent.test.mjs` | ✅ PASS | 5.4ث | ✅ terboo-ai-agent: تنفيذ متعدد حقيقي · تحقّق · عكس عند الفشل · موافقة · تحكّم مالك آمن بلغة طبيعية |
| `terboo-ai-assistant.test.mjs` | ✅ PASS | 2.6ث | ✅ terboo-ai-assistant: كل الاختبارات نجحت |
| `terboo-ai-conversation.test.mjs` | ✅ PASS | 2.9ث | ✅ terboo-ai-conversation: متابعات حتمية · أوامر حقيقية بهدف صحيح · معلّق/إلغاء/خيارات · لغة لكل شخص · ذاكرة |
| `terboo-ai-core-v4.test.mjs` | ✅ PASS | 18.7ث | ✅ terboo-ai-core-v4: 11 فحص · المجموعة منشن/رد/«تيربو» · خصوصية · مراحل §10 · أفضل أداة §11 · أدوات المالك §26 |
| `terboo-ai-core.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-ai-core: 8 أنواع قرار · 926 أمر مفهرس · صندوق الأدوات محكم |
| `terboo-ai-dispatch.integration.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-ai-dispatch.integration: طلب طبيعي ⇒ بلوقن الطرد الحقيقي للمشرف فقط، بكل الصلاحيات |
| `terboo-ai-matrix.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-ai-matrix: 10/10 فئات (CHAT · COMMAND · SCRAPER · IMAGE · SEARCH · VISION · FILE · AGENT · OWNER · MEMORY) مع متابعة لكل فئة |
| `terboo-ai-memory.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-ai-memory: 1 خاص · 2 مجموعة · 1 سجل عضو · بلا تسريب |
| `terboo-ai-output.test.mjs` | ✅ PASS | 0.0ث | — |
| `terboo-ai-quality.test.mjs` | ✅ PASS | 3.5ث | ✅ terboo-ai-quality: تنويع الردود (هوية · تحية · بداية · خاتمة · إيموجي، معزول لكل محادثة) عبر النواة وcomposeReply، حارس الأخطاء المصنّفة المترجمة عند حدّ الإرسال، منع معالجة الرسالة مرتين، ونواة واحدة لكل مسارات الذكاء |
| `terboo-ai-recovery.test.mjs` | ✅ PASS | 3.8ث | ✅ terboo-ai-recovery: parse-tolerant · code-request-direct · raw-text-answer-is-chat · provider-down-no-command · fallback-never-runs-owner-tool · no-object-object · gpt52-stream-shapes · gate-patterns-from-reports · decision-repair-and-req |
| `terboo-ai-runtime.test.mjs` | ✅ PASS | 3.5ث | ✅ terboo-ai-runtime: intent-matrix · download-cancel-audio · background-status-cancel · result-persists · single-primary-decision · priority-order |
| `terboo-arcade-ai.test.mjs` | ✅ PASS | 3.5ث | ✅ terboo-arcade-ai: 11 ألعاب بخصم (4 مستويات قانونية وحتمية) · XO خبير بلا خسارة · سد/إكمال · لا قراءة أسرار · مستويات مختلفة · لا LLM · 19 حالة نية |
| `terboo-arcade-engine.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-arcade-engine: 7 مجموعات (contract-and-single-registry · action-protocol-security · states-host-spectators · rewards-idempotent-and-daily-cap · challenge-accept-decline-expire · timeout-and-rematch · persistence-db-repository) |
| `terboo-arcade-games.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-arcade-games: 23/23 لعبة لُعبت حتى النهاية · قواعد (جاذبية · أكل إجباري · قلب · كشف آمن · دمج · سودوكو · وردل · ثيران · حروف) · لا تسريب (سفن · بطاقات · إجابة · سر · تتابع) |
| `terboo-arcade-html.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-arcade-html: هروب · مدقق (11 رفض) · نقل HTML primitive لـ23 لعبة · بلا انتحال · جسر الإجراءات غير مُعلن · قوالب بموافقة المالك · 6 ثيمات · renderers |
| `terboo-arcade-multiplayer.test.mjs` | ✅ PASS | 4.6ث | ✅ terboo-arcade-multiplayer: XO مجموعة (أزرار+كتابة+nonce+دور+فوز+مكافأة) · تحدي صديق · ضد الكمبيوتر · ثعبان وسلم 4 لاعبين · أسئلة جماعية · اختيار سري في الخاص · كلام طبيعي |
| `terboo-arcade-performance.test.mjs` | ✅ PASS | 1.0ث | ✅ terboo-arcade-performance: 100 غرفة: إنشاء 17ms · حركات 65ms (0.65ms/حركة) · تنظيف 10ms · heap 41MB \| 500 غرفة: إنشاء 36ms · حركات 110ms (0.22ms/حركة) · تنظيف 27ms · heap 47MB \| 1000 غرفة: إنشاء 51ms · حركات 208ms (0.21ms/حركة) · تنظيف  |
| `terboo-baileys-migration.test.mjs` | ❌ FAIL | 0.7ث | — |
| `terboo-brand-assets.test.mjs` | ✅ PASS | 0.9ث | ✅ terboo-brand-assets: 84 صورة هوية (43 قسم · 8 shuffle) · 41 أصل محفوظ · 0 مسار مكسور |
| `terboo-brand-lock.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-brand-lock: الهوية Terboo/تيربو ثابتة، الأشكال الخاطئة تُصحَّح، المرادفات القديمة مخفية، الترحيل يحفظ البيانات |
| `terboo-brat.test.mjs` | ✅ PASS | 0.1ث | — |
| `terboo-bulk-executor.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-bulk-executor: batches-and-verify · no-blind-retry · permanent-failure-not-retried · provider-ok-but-not-verified · cancel-between-batches · resume-skips-done · error-codes · durations · parse-settings · parse-bulk · parse-block-an |
| `terboo-capability-registry.test.mjs` | ✅ PASS | 2.5ث | ✅ terboo-capability-registry: 1079 قدرة · 63 scraper · 49 إجراء · 926 أمر · 852 معروضة للنموذج |
| `terboo-channel-forward.test.mjs` | ❌ FAIL | 0.4ث | — |
| `terboo-claude-adapter.test.mjs` | ✅ PASS | 0.7ث | ✅ terboo-claude-adapter: request-shape · image-block · refusal · vision-route-uses-claude · key-from-config · no-key-no-claude |
| `terboo-cloud-admin.test.mjs` | ✅ PASS | 3.2ث | ✅ terboo-cloud-admin: ptero-panels-and-pages · legacy-delserver-verified · legacy-list-users · ptero-suspend-verified · vpsadmin-command · virtualizor-admin |
| `terboo-code-card.test.mjs` | ❌ FAIL | 0.7ث | — |
| `terboo-code-review.approval.test.mjs` | ✅ PASS | 0.6ث | — |
| `terboo-code-review.e2e.test.mjs` | ✅ PASS | 0.5ث | — |
| `terboo-code-review.test.mjs` | ✅ PASS | 0.4ث | — |
| `terboo-command-router.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-command-router: 42 طلباً بأربع لغات/لهجات · الصلاحيات قبل الترشيح |
| `terboo-dead-buttons.test.mjs` | ✅ PASS | 2.5ث | ✅ terboo-dead-buttons: 126 زر · 52 أمر · 0 ميت |
| `terboo-design.test.mjs` | ❌ FAIL | 8.2ث | — |
| `terboo-fake-card.test.mjs` | ✅ PASS | 0.1ث | — |
| `terboo-game-image-policy.test.mjs` | ✅ PASS | 3.5ث | ✅ terboo-game-image-policy: فحص ثابت (107 ملف · 0 مولّد · 0 حقل صورة) · دورة حياة 45 لعبة بلا صورة · فشل النقل بلا صورة · عقد VisualResponse (ألعاب ممنوعة · غير الألعاب مسموحة) · بنّاء HTML بلا img/data:image |
| `terboo-group-actions.test.mjs` | ✅ PASS | 4.3ث | ✅ terboo-group-actions: lock-now-verified · settings-get · member-denied · unlock-later-scheduled-and-cancel · lock-for-duration · kick-all-admin-needs-owner · kick-all-except-ahmed-batches · kick-all-technical-limits · selected-promote-and |
| `terboo-group-ai-reports.test.mjs` | ❌ FAIL | 2.6ث | — |
| `terboo-group-directory.test.mjs` | ✅ PASS | 0.8ث | ✅ terboo-group-directory: name-matching · directory-from-metadata · incremental-updates · dedupe-and-refresh · shared-metadata-cache |
| `terboo-http-client.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-http-client: json · timeout · abort · read-retry · no-write-retry · size-limit · schema · redaction · circuit · legacy-f · axios-layer |
| `terboo-i18n-runtime.test.mjs` | ❌ FAIL | 2.3ث | — |
| `terboo-identity.test.mjs` | ✅ PASS | 0.7ث | ✅ terboo-identity: 16 فحص · pn-private · lid-private-remoteJidAlt · lid-private-signal-mapping · lid-unknown-no-fabrication · group-participantAlt · admin-lid · suffix-attack · owner-number-forms · quoted-and-mention-lid · lid-mapping-event |
| `terboo-import-graph.test.mjs` | ✅ PASS | 1.5ث | ✅ terboo-import-graph: 1436 ملف · 5402 استيراد · 0 مفقود · 0 استيراد محلي قديم |
| `terboo-integration-scenario.test.mjs` | ✅ PASS | 3.9ث | ✅ terboo-integration-scenario: مرحبا ← بتعمل اي ← تحميل عبر سجل الأدوات ← حفظ الاسم ← تذكّره ← القائمة ← الأدوات ← تنفيذ رمز_QR، كلها في دردشة المستخدم وفي نفس السياق |
| `terboo-integrity.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-integrity: 935 بلوقن · 1249 أمر · 1366 مرادف · 185 ملف core |
| `terboo-interactive-compat.test.mjs` | ✅ PASS | 5.2ث | ✅ terboo-interactive-compat: 11/11 حقول §32 · 11 صيغة عبر WAProto الرسمي (7.0.0-rc14) × 3 أغلفة × بادئة/بدون · مجموعة · قائمة حقيقية · لا ضغطة صامتة · 73 تنفيذ حقيقي |
| `terboo-interactive.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-interactive: كل الأزرار والصفوف تنتهي بأمر حقيقي — لا ضغطة صامتة |
| `terboo-l10n-runtime.test.mjs` | ✅ PASS | 4.9ث | ✅ terboo-l10n-runtime: 90 رداً حقيقياً من 45 بلوقن بالإنجليزية والإسبانية بلا بقايا عربية (سوى وسائط الأوامر)، أرقام لاتينية، القالب الأدق، حدود الكلمات، الأسهم والترقيم |
| `terboo-languages.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-languages: catalog · requested-language · documents · attachment-analysis · intent-and-route · code-instruction-language |
| `terboo-link-guard.test.mjs` | ✅ PASS | 0.1ث | — |
| `terboo-localization.test.mjs` | ✅ PASS | 0.2ث | ✅ terboo-localization: 1587 مفتاح × 3 لغات · 16 ملف خط |
| `terboo-member-card.test.mjs` | ✅ PASS | 1.0ث | ✅ terboo-member-card: 4 — clean-name · name-resolution · card-render · welcome-and-goodbye-send-card |
| `terboo-memory-matrix.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-memory-matrix: 5 خلايا بلا تسريب · مشتركة بلا خاص · دلالي · ملخّص · نسيان · TTL · إذن المالك · ترحيل |
| `terboo-menu-delivery.test.mjs` | ✅ PASS | 3.1ث | ✅ terboo-menu-delivery: الرئيسية (الشكل 1: Native Flow ببطاقة البوت ونفس الأزرار) والأقسام تسلك مسار الإعدادات والمزيد نفسه (LID محلول، اقتباس صحيح، طبقة أولى primary)، الأزرار العائمة القديمة opt-in، التحقق قبل النقل، تحويل حمولات البلوقنا |
| `terboo-menus.test.mjs` | ✅ PASS | 3.0ث | ✅ terboo-menus: 9 قوائم × 3 لغات · 138 صفاً · 690 ضغطة بخمس صيغ · 74 وصولاً حقيقياً للبلوقن · أزرار اللغة والنسخ · المعروض = المُختبَر |
| `terboo-messaging.test.mjs` | ✅ PASS | 3.3ث | ✅ terboo-messaging: send-local-number · duplicate-not-resent · not-on-whatsapp · stranger-denied · send-by-name-confirmed · broadcast-dry-run · broadcast-all-bots · broadcast-stop-and-resume · per-account-group-cache · model-cannot-pick-num |
| `terboo-miniapp-builders.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-miniapp-builders: 2 بنّاء × 3 لغات · بنية ومحتوى وحجم · 0 مورد خارجي · 0 معرّف مكرر · بلا شبكة/eval · حارس إخفاء + تحرير لمس · nonce · أزرار مربوطة · سجل |
| `terboo-miniapp-play.test.mjs` | ✅ PASS | 7.4ث | ✅ terboo-miniapp-play: XO تُلعب (نقرة⇒X · رد الكمبيوتر · رفض خانة مشغولة · إعادة بلا مستمع مكرر · صعب لا يُهزم) · Sonic (حلقة تتقدم · قفز · تتوقف عند الإخفاء) · 320/360/412px بلا overflow · RTL+LTR · 0 أخطاء console · 0 طلب خارجي |
| `terboo-miniapp-security.test.mjs` | ✅ PASS | 2.9ث | ✅ terboo-miniapp-security: وكيل الأصول (توقيع · عبث · انتهاء · مضيف مغلق · لا SVG/HTML · 405) · قناة الإجراءات (stale · bad-nonce · expired · 6 حقول قرار · actionId · حمولة ضخمة · رمز غريب · تزامن ⇒ 1) · رمز بلا هوية خام · سرية الاختيار في  |
| `terboo-miniapp-transport.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-miniapp-transport: القناة المضمَّنة معلَّلة ولا تُعلن · رسالة واحدة لكل لعبة · 0 صورة · 0 زر حركة · رابط من نطاق المالك · فشل النقل ⇒ نص · اللغة من الطرف للطرف · لعبة مجهولة صامتة |
| `terboo-miniapp-ui.test.mjs` | ✅ PASS | 15.0ث | ✅ terboo-miniapp-ui: Chromium حقيقي · صفحة لعب على 320/360/412/480/820px بلا overflow · RTL+LTR · 0 أخطاء console · 0 موارد خارجية · نقرة لمس ⇒ حالة الخادم · حقل قرار مرفوض · أصل بصري same-origin موقّع · كتالوج 45+2 لعبة ببحث وفلاتر |
| `terboo-multimodal.test.mjs` | ✅ PASS | 7.1ث | ✅ terboo-multimodal: ocr-real · vision-receives-image · vision-capability-honest · media-routing · voice-note-transcribed · voice-honest-failures · transcribe-quoted · voice-reply · video-quick · documents · scanned-pdf-ocr · security-limit |
| `terboo-natural-ai.test.mjs` | ✅ PASS | 0.7ث | — |
| `terboo-no-silent-catch.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-no-silent-catch: 1313 ملف · 0 catch صامت · 857 موضع تسجيل · السجل والتسجيل والإرسال الحقيقي |
| `terboo-nvidia-ai.test.mjs` | ✅ PASS | 0.2ث | — |
| `terboo-onboarding.test.mjs` | ✅ PASS | 0.8ث | ✅ terboo-onboarding: كل الاختبارات نجحت |
| `terboo-performance.test.mjs` | ✅ PASS | 4.5ث | ✅ terboo-performance: مزوّد واحد لكل رسالة، مهلة وقاطع دائرة وميزانية، نواة داخلية سريعة، بلا تأخير مصطنع، كل المراحل مقيسة |
| `terboo-permissions.test.mjs` | ✅ PASS | 2.5ث | ✅ terboo-permissions: group-actions · account-and-owner-tools · resources · target-protection · identity · legacy-roles-hidden-from-ai · matrix |
| `terboo-plugin-workbench.test.mjs` | ✅ PASS | 0.2ث | — |
| `terboo-protobuf.test.mjs` | ✅ PASS | 0.7ث | ✅ terboo-protobuf: 6 فحص · no-production-fromObject · referenced-types-exist · sensitive-round-trips · enum-hazard-documented · webmessageinfo-relay · migrated-plugins-load (Baileys 7.0.0-rc14) |
| `terboo-provider-router.test.mjs` | ✅ PASS | 5.6ث | ✅ terboo-provider-router: fast-primary-single-call · slow-primary-hedged · failing-primary-immediate-fallback · health-aware-promotion · no-hedge-for-summary |
| `terboo-pterodactyl.test.mjs` | ✅ PASS | 0.7ث | ✅ terboo-pterodactyl: ssrf · add-client-panel · servers-and-permissions · application-panel · edit-replace-delete |
| `terboo-quote.test.mjs` | ✅ PASS | 0.1ث | — |
| `terboo-registration-optional.test.mjs` | ✅ PASS | 3.9ث | ✅ terboo-registration-optional: 6 سيناريوهات نجحت |
| `terboo-reminders.test.mjs` | ✅ PASS | 4.2ث | ✅ terboo-reminders: parse-matrix · kernel-flow · honest-no-promise · privacy-and-limits · real-scheduler-exact-date |
| `terboo-rich-response.test.mjs` | ✅ PASS | 1.4ث | ✅ terboo-rich-response: 18 فحص · 18 لغة · تلوين بلا فقد · بديل تلقائي · بلا انتحال Meta AI |
| `terboo-scraper-ai-e2e.test.mjs` | ✅ PASS | 3.7ث | ✅ terboo-scraper-ai-e2e: 8 طلبات عبر البلوقنات الحقيقية بلا نموذج، 3 منصات عبر المحوّلات، TOOL من النموذج بنداء واحد، حماية المدخلات |
| `terboo-scraper-registry.test.mjs` | ✅ PASS | 1.0ث | ✅ terboo-scraper-registry: 63/63 scraper مسجّل ومكتشف، 20 طلباً طبيعياً، بديل واحد، قاطع دائرة، إرسال ذكي |
| `terboo-scrapers-each.test.mjs` | ✅ PASS | 13.2ث | ✅ terboo-scrapers-each: 63/63 scraper × 10 فحوص · 63 ملفاً = 63 أداة مسجّلة · قاطع دائرة وبديل |
| `terboo-secrets-vault.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-secrets-vault: config-secrets · console-and-failure-log · outgoing-message · ai-ask-redacts · vault |
| `terboo-smart-buttons.test.mjs` | ✅ PASS | 4.3ث | ✅ terboo-smart-buttons: 11 — ui-descriptor · button-policy · kernel-clarification-buttons · kernel-no-buttons-when-unsafe · kernel-confirm-buttons · kernel-owner-button-hidden · cloud-tools-catalog · cloud-tools-central-permission · cloud-t |
| `terboo-ssh-agent.test.mjs` | ✅ PASS | 26.0ث | ✅ terboo-ssh-agent: register-secret-scrubbed · stranger-denied · natural-status · run-policy · zip-rejections · deploy-fail-fix-run · bad-fix-rolled-back · legacy-password-refused |
| `terboo-ssh.test.mjs` | ✅ PASS | 7.5ث | ✅ terboo-ssh: policy · register-encrypted · pin-before-auth · exec-read-quoted · write-needs-confirmation · real-exit-code-and-timeout · sftp-workspace-only · recipe-with-answers · password-host-redacted · host-key-change-refused · remove |
| `terboo-syntax.test.mjs` | ✅ PASS | 11.3ث | ✅ terboo-syntax: 1436 ملف · 0 أخطاء نحوية |
| `terboo-task-resume.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-task-resume: استئناف بعد إعادة التشغيل · رفض صادق للوسائط · ملكية · فشل صريح · تسليم نتيجة الإعادة · متابعة VPS |
| `terboo-telegram-vps.test.mjs` | ✅ PASS | 1.1ث | ✅ terboo-telegram-vps: 12 — start-and-roles · group-chat-no-data · owner-wizard-assign-by-telegram-id · cross-platform-single-holder · buyer-dashboard-and-ownership · buyer-power-confirmed-once · hostname-and-password-secret · reinstall-and |
| `terboo-text-style.test.mjs` | ✅ PASS | 0.5ث | — |
| `terboo-tool-registry.test.mjs` | ✅ PASS | 0.8ث | ✅ terboo-tool-registry: one-registry · tool-search · kernel-instruction-limited · run-scraper-tool · run-local-tools · snapshot-clean |
| `terboo-transport.test.mjs` | ✅ PASS | 3.3ث | ✅ terboo-transport: all-kinds · interactive-kinds · invalid-falls-back · ui-presses:1000 · ui-matrix |
| `terboo-typography.test.mjs` | ❌ FAIL | 0.6ث | — |
| `terboo-ui-intents.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-ui-intents: قائمة+أزرار+بديل نصي · رؤوس فيديو/مستند/صورة · to+منشن · carousel · ping2 مُرحّل |
| `terboo-virtualizor.test.mjs` | ✅ PASS | 0.9ث | ✅ terboo-virtualizor: client · no-entitlement · owner-assign · isolation · capabilities-and-details · actions · revoke-and-expiry · matrix-and-policy |
| `terboo-visual-response.test.mjs` | ✅ PASS | 5.1ث | ✅ terboo-visual-response: 926 أمر · HTML مؤهل 45 (ألعاب فقط، يُسلَّم hybrid) · تحقق يرفض الميت/غير المُدقَّق · تسليم موحّد · المصفوفة حديثة |
| `terboo-vps-provisioner.test.mjs` | ✅ PASS | 7.1ث | ✅ terboo-vps-provisioner: 11 سيناريو — تحقق · preflight · مسار واتساب كامل · تكرار · رفض · خطأ بعد الوصول · مهلة · استئناف · غير المالك · القديم · الباقات |
| `terboo-vpsadmin-center.test.mjs` | ✅ PASS | 3.8ث | ✅ terboo-vpsadmin-center: 8 — dashboard · account-and-free · wizard-assign · one-command-assign-as-typed · cards-and-lists · group-goes-private · stranger-blocked · main-menu-buttons |
| `terboo-web-arcade.test.mjs` | ✅ PASS | 3.6ث | ✅ terboo-web-arcade: رمز موقّع · API (قبول/قديم/محظور/منتهٍ/منشأ/JSON) · صفحة اللعب + CSP · كتالوج 45 · رابط تلقائي/مالك · زر الخاص + رابط شخصي للمجموعة · .موقع (منفذ/رابط/SSL + HTTPS فعلي) |
| `terboo-website-button.test.mjs` | ✅ PASS | 3.5ث | ✅ terboo-website-button: بلا رابط · ar/en/es · 6 روابط مرفوضة · القوائم الفرعية · حالة المالك |
| `terboo-website.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-website: عام+رؤوس أمان · دخول واتساب+جلسة HttpOnly · CSRF · لا ترقية بعلم العميل · owner-only · اجتياز المسار · خروج · أدوات/مهام · تحديد المعدّل |
| `tiktoksearch.test.mjs` | ✅ PASS | 0.2ث | — |
