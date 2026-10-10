# TERBOO — تقرير اختبارات ألعاب Mini Apps

> **ملف مولّد** من نتائج تشغيل فعلية. لإعادة التوليد:
>
> ```bash
> node tools/terboo-run-tests.mjs --json after.json
> node tools/terboo-baseline-probe.mjs --after after.json --out probe.json
> node tools/terboo-game-miniapp-test-report.mjs --after after.json --baseline-probe probe.json
> ```
>
> النتائج الخام مشحونة للتحقق: `docs/v6/game-miniapp-test-results.json`
> و`docs/v6/game-miniapp-baseline-probe.json`.
>
> التشغيل: 2026-10-10T13:09:22.423Z · Node v22.22.0

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
| ملفات الاختبار المحلية | **129** |
| ✅ PASS | **122** |
| ❌ FAIL | **7** |
| ⏭️ BLOCKED | **0** |
| ⛔ NOT RUN | **6** بنداً · منها 3 ملف live |
| **WEB_FILES_UNCHANGED (§14.5)** | **PASS** — قيس عند توليد هذا التقرير |
| انحدار مقابل خط الأساس | **0** |

## 2. اختبارات هذا العمل

| الاختبار | الحالة | المدة | الملخّص |
|---|---|---|---|
| `terboo-miniapp-builders.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-miniapp-builders: 5 بنّاء × 3 لغات · بنية ومحتوى وحجم · 0 مورد خارجي · 0 معرّف مكرر · بلا شبكة/eval · حارس إخفاء + تحرير لمس · nonce · أزرار مربوطة · سجل |
| `terboo-miniapp-transport.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-miniapp-transport: القدرة من دالة إرسال حقيقية · 0 حقل إثبات ملفَّق (حارس مُختبَر) · بروتو الحزمة الرسمية يحمل الشكل · relayMessage واحد لكل لعبة · مطفأ ⇒ نص سبب بلا رابط ولا أزرار · فشل ⇒ نص بلا بديل · ميزانية ومحيط يرفض |
| `terboo-miniapp-play.test.mjs` | ✅ PASS | 16.5ث | ✅ terboo-miniapp-play: 5 ألعاب تُلعب في Chromium — XO (نقرة⇒X · رد الكمبيوتر · رفض خانة مشغولة · صعب لا يُهزم) · Sonic (حلقة · قفز · توقف عند الإخفاء) · Snake (حركة · اتجاه · موت بالجدار · إعادة · استئناف بعد الإخفاء) · Memory (قل |
| `terboo-web-unchanged.test.mjs` | ✅ PASS | 0.2ث | ✅ terboo-web-unchanged: WEB_FILES_UNCHANGED PASS · 18 ملف · الحارس يكشف تغييراً مدسوساً · طبقة النقل لا تلمس الموقع |
| `terboo-config-template.test.mjs` | ✅ PASS | 0.9ث | ✅ terboo-config-template: 20 قيمة سرية فُحصت · 0 تسرّب · قالب secrets فارغ (24 مفتاحاً) · البنية مطابقة · --check لا يكتب |
| `terboo-game-image-policy.test.mjs` | ✅ PASS | 3.2ث | ✅ terboo-game-image-policy: فحص ثابت (110 ملف · 0 مولّد · 0 حقل صورة) · دورة حياة 45 لعبة بلا صورة · فشل النقل بلا صورة · عقد VisualResponse (ألعاب ممنوعة · غير الألعاب مسموحة) · بنّاء HTML بلا img/data:image |

**ما يثبته كل واحد:**

- `terboo-miniapp-builders.test.mjs` (✅ PASS) — **§14.1** خمسة بنّائين × 3 لغات: البنية · وسم اللغة والاتجاه · المعرّفات المطلوبة لكل لعبة · 0 معرّف مكرر · 0 مورد خارجي · 0 `<script src>` · بلا `eval` · `nonce` في كل وسم script · الأزرار مربوطة بمنطق فعلي · واجهة en/es **بلا حرف عربي** · والسجل والبنّاؤون متطابقان مدخلاً بمدخل.
- `terboo-miniapp-transport.test.mjs` (✅ PASS) — **§14.2** على mock socket: القدرة من دالة إرسال حقيقية لا من إعداد (مطفأ · بلا مقبس · بلا relayMessage · جاهز) · الحمولة بلا أي حقل إثبات والحارس يرفض الثلاثة لو دُسّت · `response_id` عشوائي مختلف لكل رسالة · بروتو الحزمة الرسمية يحمل الشكل (ترميز ⇒ فكّ ⇒ HTML حرفياً) · **relayMessage واحد** لكل لعبة بلا صورة ولا رابط ولا أزرار · مطفأ ⇒ نص سبب واحد بلا رابط حتى مع موقع مفعَّل · فشل الإرسال ⇒ نص بلا بديل · فوق الميزانية أو مخالفة محيط ⇒ رفض قبل الشبكة · مخرج الرابط القديم بتفعيل صريح وكل أزراره روابط.
- `terboo-miniapp-play.test.mjs` (✅ PASS) — **§14.3** Chromium حقيقي — خمس ألعاب تُلعب فعلاً: XO (نقرة ⇒ X · رد الكمبيوتر · رفض خانة مشغولة · صعب لا يُهزم) · Sonic (الحلقة تتقدم · القفز · التوقف عند الإخفاء) · Snake (بكسلات الساحة تتغيّر · زر اتجاه · الموت بالجدار · الإعادة تُصفّر الطول) · Memory (قلب واحد · زوج خاطئ يعود · زوج صحيح يثبت والعدّاد يتقدّم · الإعادة تُصفّر) · 2048 (بداية ببلاطتين · الحركة تغيّر اللوحة وتولّد · كل القيم قوى للعدد 2 · الإعادة تُصفّر) · 320/360/412px بلا overflow · RTL+LTR · 0 خطأ console · 0 طلب خارجي.
- `terboo-web-unchanged.test.mjs` (✅ PASS) — **§14.5** WEB_FILES_UNCHANGED: بصمات SHA-256 لكل ملف متتبَّع تحت `web/`، والبصمة تغطي نفس مجموعة الملفات، **والحارس نفسه مُختبَر** بدسّ تغيير والتأكد من كشفه ثم استعادته. وطبقة النقل لا تستورد من `web/` ولا `terboo-website` ولا `terboo-ui-kit`، ولا تبني أي رابط.
- `terboo-config-template.test.mjs` (✅ PASS) — قالب الإعداد بلا سرّ واحد من `config.js`، وكتلة `secrets` فيه فارغة بنفس المفاتيح.
- `terboo-game-image-policy.test.mjs` (✅ PASS) — فحص ثابت + AST على كل ملفات مسارات الألعاب (0 مولّد صور · 0 حقل حمولة صورة) ثم دورة حياة كاملة لكل لعبة في السجل وتفتيش كل رسالة صادرة عن صورة أو بايتات PNG/JPEG/GIF/WebP.

## 3. اختبارات أصلحها هذا العمل

**لا اختبار كان فاشلاً فصار ناجحاً.** خط الأساس `cbb8d59` هو التسليم السابق، وكل ما كان ناجحاً فيه ما زال ناجحاً (انحدار صفر).

لكن ثلاثة عيوب حقيقية أُصلحت في هذا العمل كشفتها حَرَسة قائمة أو تقرير مولَّد،
ولم تكن تظهر كاختبار أحمر:

| العيب | من كشفه | الإصلاح |
|---|---|---|
| غلاف «مُعاد توجيهها من بوت» في حمولتي | `terboo-rich-response` (حارس انتحال Meta AI) | الحمولة صارت `richResponseMessage` في المستوى الأعلى، بلا غلاف |
| `proto.*.fromObject(` في كود إنتاج | `terboo-protobuf` | `encode` يقبل كائناً عادياً |
| `games.contracts()` يُعيد 22 نسخة ظلّ بلا `controller` | المصفوفة المولَّدة (67 مقابل 45) | `arcade` هو المصدر، والسجل لا يضيف إلا ما لم يُرحَّل |

العيبان الأولان ظهرا في **تشغيل كامل للمجموعة** لا في الاختبارات المتأثرة وحدها،
والثالث ظهر لأن المصفوفة تُحسب من الكود فاختلف رقمها عن بقية التقارير.

## 4. اختبارات قائمة لمسها هذا العمل

| الاختبار | الحالة | المدة | الملخّص |
|---|---|---|---|
| `terboo-arcade-ai.test.mjs` | ✅ PASS | 3.7ث | ✅ terboo-arcade-ai: 11 ألعاب بخصم (4 مستويات قانونية وحتمية) · XO خبير بلا خسارة · سد/إكمال · لا قراءة أسرار · مستويات مختلفة · لا LLM · 19 حالة نية |
| `terboo-arcade-engine.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-arcade-engine: 7 مجموعات (contract-and-single-registry · action-protocol-security · states-host-spectators · rewards-idempotent-and-daily-cap · challenge-accept-decline-expire · timeout-and-rematch · persistence-db-reposi |
| `terboo-arcade-games.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-arcade-games: 23/23 لعبة لُعبت حتى النهاية · قواعد (جاذبية · أكل إجباري · قلب · كشف آمن · دمج · سودوكو · وردل · ثيران · حروف) · لا تسريب (سفن · بطاقات · إجابة · سر · تتابع) |
| `terboo-arcade-html.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-arcade-html: هروب · مدقق (11 رفض) · نقل HTML primitive لـ23 لعبة · بلا انتحال · جسر الإجراءات غير مُعلن · قوالب بموافقة المالك · 6 ثيمات · renderers |
| `terboo-arcade-multiplayer.test.mjs` | ✅ PASS | 4.6ث | ✅ terboo-arcade-multiplayer: XO مجموعة (أزرار+كتابة+nonce+دور+فوز+مكافأة) · تحدي صديق · ضد الكمبيوتر · ثعبان وسلم 4 لاعبين · أسئلة جماعية · اختيار سري في الخاص · كلام طبيعي |
| `terboo-i18n-runtime.test.mjs` | ❌ FAIL | 2.4ث | — |
| `terboo-import-graph.test.mjs` | ✅ PASS | 1.6ث | ✅ terboo-import-graph: 1450 ملف · 5461 استيراد · 0 مفقود · 0 استيراد محلي قديم |
| `terboo-menus.test.mjs` | ✅ PASS | 3.2ث | ✅ terboo-menus: 9 قوائم × 3 لغات · 138 صفاً · 690 ضغطة بخمس صيغ · 74 وصولاً حقيقياً للبلوقن · أزرار اللغة والنسخ · المعروض = المُختبَر |
| `terboo-no-silent-catch.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-no-silent-catch: 1324 ملف · 0 catch صامت · 862 موضع تسجيل · السجل والتسجيل والإرسال الحقيقي |
| `terboo-smart-buttons.test.mjs` | ✅ PASS | 3.0ث | ✅ terboo-smart-buttons: 11 — ui-descriptor · button-policy · kernel-clarification-buttons · kernel-no-buttons-when-unsafe · kernel-confirm-buttons · kernel-owner-button-hidden · cloud-tools-catalog · cloud-tools-central-permission |
| `terboo-syntax.test.mjs` | ✅ PASS | 14.5ث | ✅ terboo-syntax: 1450 ملف · 0 أخطاء نحوية |
| `terboo-visual-response.test.mjs` | ✅ PASS | 5.1ث | ✅ terboo-visual-response: 929 أمر · HTML مؤهل 45 (ألعاب فقط، يُسلَّم hybrid) · تحقق يرفض الميت/غير المُدقَّق · تسليم موحّد · المصفوفة حديثة |
| `terboo-web-arcade.test.mjs` | ✅ PASS | 3.1ث | ✅ terboo-web-arcade: رمز موقّع · API (قبول/قديم/محظور/منتهٍ/منشأ/JSON) · صفحة اللعب + CSP · كتالوج 45 · رابط تلقائي/مالك · زر الخاص + رابط شخصي للمجموعة · .موقع (منفذ/رابط/SSL + HTTPS فعلي) |

## 5. ❌ FAIL

| الاختبار | الحالة | المدة | الملخّص |
|---|---|---|---|
| `terboo-baileys-migration.test.mjs` | ❌ FAIL | 0.7ث | — |
| `terboo-channel-forward.test.mjs` | ❌ FAIL | 0.5ث | — |
| `terboo-code-card.test.mjs` | ❌ FAIL | 0.9ث | — |
| `terboo-design.test.mjs` | ❌ FAIL | 8.1ث | — |
| `terboo-group-ai-reports.test.mjs` | ❌ FAIL | 2.7ث | — |
| `terboo-i18n-runtime.test.mjs` | ❌ FAIL | 2.4ث | — |
| `terboo-typography.test.mjs` | ❌ FAIL | 0.6ث | — |

### التشخيص وخط الأساس

| الاختبار | الدعوى الآن | على خط الأساس `cbb8d59` | الحكم |
|---|---|---|---|
| `terboo-baileys-migration.test.mjs` | AssertionError [ERR_ASSERTION]: أُرسلت رسالة غنية بلا تفعيل · 1 !== 0 | AssertionError [ERR_ASSERTION]: أُرسلت رسالة غنية بلا تفعيل · 1 !== 0 | فشل سابق · نفس الدعوى |
| `terboo-channel-forward.test.mjs` | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: · 'text' !== 'rich' | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: · 'text' !== 'rich' | فشل سابق · نفس الدعوى |
| `terboo-code-card.test.mjs` | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: | فشل سابق · نفس الدعوى |
| `terboo-design.test.mjs` | (لا سطر دعوى — يفشل عبر مولّد خارجي) | (لا سطر دعوى) | فشل سابق · نفس الدعوى |
| `terboo-group-ai-reports.test.mjs` | AssertionError [ERR_ASSERTION]: رسالة غنية لا تُعرض على الأجهزة العادية · 1 !== 0 | AssertionError [ERR_ASSERTION]: رسالة غنية لا تُعرض على الأجهزة العادية · 1 !== 0 | فشل سابق · نفس الدعوى |
| `terboo-i18n-runtime.test.mjs` | AssertionError [ERR_ASSERTION]: وحدات بلا ترجمة: 27 · 27 !== 0 | AssertionError [ERR_ASSERTION]: وحدات بلا ترجمة: 27 · 27 !== 0 | فشل سابق · نفس الدعوى |
| `terboo-typography.test.mjs` | AssertionError [ERR_ASSERTION]: Inter لا يُستعمل داخل SVG (يرسم بخط النظام) | AssertionError [ERR_ASSERTION]: Inter لا يُستعمل داخل SVG (يرسم بخط النظام) | فشل سابق · نفس الدعوى |

### السبب الجذري

| الاختبار | السبب |
|---|---|
| `terboo-baileys-migration.test.mjs` | كتل الكود تُرسل رسالة غنية افتراضياً: `normalizeMode` في `src/lib/terboo-code-renderer.js:20` يحوّل كل قيمة غير `\"text\"` إلى `\"rich\"`، و`LEGACY_MODES:14` يحوّل `\"image\"` نفسها إلى `\"rich\"`. |
| `terboo-channel-forward.test.mjs` | نفس الجذر: الاختبار يتوقّع وضع `rich` في `plugins/owner/بطاقة_الكود.js` وهو لا يملكه (سطر 10 يذكر أن البطاقة الغنية ليست خياراً). |
| `terboo-code-card.test.mjs` | نفس الجذر: يتوقّع بطاقة صورة ونسخة نصية عبر `sendMessage`، والتنفيذ يعترض كتلة الكود ويُرسلها عبر `relayMessage`. |
| `terboo-design.test.mjs` | ثلاثة بلوقنات ألعاب قديمة (`fish.js` · `ماينكرافت.js` · `مستذئب.js`) بزخرفة وbackticks من طبقة تصميم سابقة — 8 مخالفات لكل ملف، خارج مسار Mini Apps. |
| `terboo-group-ai-reports.test.mjs` | نفس الجذر: تقرير المجموعة يمر من مسار عرض الكود نفسه. |
| `terboo-i18n-runtime.test.mjs` | 27 مدخل ترجمة ناقص في `ماينكرافت.js` · `مستذئب.js` · `terboo-rich-response.js`. ملفات هذا العمل تساهم بصفر: البنّاؤون ووحدة التشخيص مستثنون بتوثيق صريح، والوصف العربي لكل بلوقن جديد له مدخل en/es. |
| `terboo-typography.test.mjs` | `Inter` لا يُستعمل داخل SVG (يُرسم بخط النظام) — مسار الخطوط والرسم. |

**لم يُعدَّل أي اختبار ليمر.** كل هذه الإخفاقات **خارج مسار ألعاب Mini Apps**،
وأربعة منها بجذر واحد في `src/lib/terboo-code-renderer.js` — أحد ملفات عرض
الكود الخمسة التي يشترط التسليم شحنها مطابقة بايتاً ببايت، فلم تُلمس. القرار
للمالك: إمّا أن يكون الافتراضي `"image"` ⇒ تمر الأربعة، أو يبقى `"rich"`
مقصوداً ⇒ تُحدَّث الاختبارات الأربعة. وهو قرار عرض كود لا ألعاب.

## 6. ⏭️ BLOCKED

لا ملف مُعطَّل — كل الاختبارات البيئية (متصفح حقيقي) وجدت شرطها.

## 7. ⛔ NOT RUN

| البند | السبب |
|---|---|
| **§14.4 — عرض اللعبة داخل الرسالة على WhatsApp Android حقيقي** | لا جهاز ولا حساب واتساب ولا اقتران في بيئة البناء. **هذا هو الاختبار الحاسم الباقي**: هل يعرض العميل الحمولة بلا بيانات تحقق؟ خطوات تشغيله بنفسك في `TERBOO_GAME_MINIAPP_SETUP.md` §4. لا يُدَّعى أي نتيجة. |
| اللمس والصوت والأداء داخل WebView واتساب | اختُبرت في Chromium 141 بمقاسات أندرويد، وهو **ليس** بديلاً عن WebView واتساب. |
| WhatsApp Web · iOS · Desktop | لم تُشغَّل ⇒ لا يُعلن دعم. |
| `npm run test:live` (3 ملفات) | تتصل بمزوّدات حقيقية وتحتاج مفاتيح وشبكة خارجية. |
| بقية `@yudzxml/baileys` (437 ملفاً) و`whatsapp-rust-bridge` | فُحص مسار HTML والبراهين فقط. الملحق الأصلي لا تكفيه مراجعة مصدر. |
| قياس أداء على هاتف فعلي (FPS · حرارة · بطارية) | لا جهاز. |

## 8. تصنيف ما ثبت فعلاً

| التصنيف | البنود |
|---|---|
| **ثبت بتشغيل حقيقي** | خمس ألعاب تُلعب في Chromium 141 بإدخال يغيّر الحالة · رسالة واحدة لكل لعبة بلا صورة ولا رابط ولا أزرار · 0 حقل إثبات ملفَّق مع حارس مُختبَر · بروتو الحزمة الرسمية يحمل الشكل السلكي · الميزانية والمحيط يرفضان قبل الإرسال · WEB_FILES_UNCHANGED بحارس مُختبَر · 122 ملف اختبار |
| **ثبت بفحص مصدر** | تلفيق إثبات التحقق في `@yudzxml/baileys@7.6.6` بنسختين · عدم وجود مسار يتفاداه · قيود المحيط (شبكة · تخزين · ميزانية) |
| **رُفض بدليل** | `sendHtmlApp` — التفصيل في `TERBOO_YUDZXML_LIBRARY_REVIEW.md` §1 |
| **لم يُختبر لعدم توفر جهاز/خدمة** | عرض اللعبة على عميل واتساب حقيقي (§14.4) · WebView واتساب · اختبارات live · بقية الحزمة والملحق الأصلي |

## 9. كل الملفات بحالتها

| الاختبار | الحالة | المدة | الملخّص |
|---|---|---|---|
| `agent-control.test.mjs` | ✅ PASS | 0.1ث | — |
| `agent-health-memory.test.mjs` | ✅ PASS | 0.2ث | — |
| `agent-plugin.test.mjs` | ✅ PASS | 16.3ث | — |
| `ai-studio-behavioral.test.mjs` | ✅ PASS | 0.6ث | — |
| `ai-studio-foundation.test.mjs` | ✅ PASS | 0.4ث | — |
| `ai-studio-image-policy.test.mjs` | ✅ PASS | 0.0ث | — |
| `ai-workspace-router.test.mjs` | ✅ PASS | 0.4ث | — |
| `autoai-always-reply.test.mjs` | ✅ PASS | 0.8ث | — |
| `autoai-arabic-personas.test.mjs` | ✅ PASS | 0.5ث | — |
| `autoai-behavioral.test.mjs` | ✅ PASS | 0.9ث | — |
| `bot-loop-guard.test.mjs` | ✅ PASS | 0.6ث | ✅ bot-loop-guard.test.mjs passed |
| `environment-key-guard.test.mjs` | ✅ PASS | 0.5ث | — |
| `handler-speaker-priority.integration.test.mjs` | ✅ PASS | 1.2ث | ✅ handler speaker-priority integration test passed |
| `import-repair.test.mjs` | ✅ PASS | 0.5ث | — |
| `manus-agent.test.mjs` | ✅ PASS | 0.3ث | — |
| `mode-config-guard.test.mjs` | ✅ PASS | 0.4ث | — |
| `owner-bypass.test.mjs` | ✅ PASS | 0.5ث | — |
| `pindl.test.mjs` | ✅ PASS | 0.3ث | — |
| `plugin-diagnostics.test.mjs` | ✅ PASS | 0.1ث | — |
| `plugin-move.test.mjs` | ✅ PASS | 0.2ث | — |
| `provider-health.test.mjs` | ✅ PASS | 0.0ث | — |
| `raw-code-plugin.test.mjs` | ✅ PASS | 0.3ث | — |
| `reddit.test.mjs` | ✅ PASS | 0.2ث | — |
| `reply-variant-selector.test.mjs` | ✅ PASS | 0.4ث | — |
| `spotify-provider.test.mjs` | ✅ PASS | 3.2ث | — |
| `task-queue.test.mjs` | ✅ PASS | 0.1ث | — |
| `terboo-agent-limits.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-agent-limits: step-timeout-rollback · user-interrupt · plan-budget · max-steps |
| `terboo-ai-agent-actions.test.mjs` | ✅ PASS | 15.1ث | ✅ terboo-ai-agent-actions: 28 سيناريو حقيقي — cooldown-explained · 01-add-by-name · 02-kick-pronoun-lid · 03-readd · 04-promote-pronoun · 05-members · 06-admins · 07-presence · 07b-demote-same-member · 07c-owner-last-added-search  |
| `terboo-ai-agent.test.mjs` | ✅ PASS | 5.9ث | ✅ terboo-ai-agent: تنفيذ متعدد حقيقي · تحقّق · عكس عند الفشل · موافقة · تحكّم مالك آمن بلغة طبيعية |
| `terboo-ai-assistant.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-ai-assistant: كل الاختبارات نجحت |
| `terboo-ai-conversation.test.mjs` | ✅ PASS | 2.9ث | ✅ terboo-ai-conversation: متابعات حتمية · أوامر حقيقية بهدف صحيح · معلّق/إلغاء/خيارات · لغة لكل شخص · ذاكرة |
| `terboo-ai-core-v4.test.mjs` | ✅ PASS | 21.7ث | ✅ terboo-ai-core-v4: 11 فحص · المجموعة منشن/رد/«تيربو» · خصوصية · مراحل §10 · أفضل أداة §11 · أدوات المالك §26 |
| `terboo-ai-core.test.mjs` | ✅ PASS | 2.9ث | ✅ terboo-ai-core: 8 أنواع قرار · 929 أمر مفهرس · صندوق الأدوات محكم |
| `terboo-ai-dispatch.integration.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-ai-dispatch.integration: طلب طبيعي ⇒ بلوقن الطرد الحقيقي للمشرف فقط، بكل الصلاحيات |
| `terboo-ai-matrix.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-ai-matrix: 10/10 فئات (CHAT · COMMAND · SCRAPER · IMAGE · SEARCH · VISION · FILE · AGENT · OWNER · MEMORY) مع متابعة لكل فئة |
| `terboo-ai-memory.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-ai-memory: 1 خاص · 2 مجموعة · 1 سجل عضو · بلا تسريب |
| `terboo-ai-output.test.mjs` | ✅ PASS | 0.0ث | — |
| `terboo-ai-quality.test.mjs` | ✅ PASS | 3.7ث | ✅ terboo-ai-quality: تنويع الردود (هوية · تحية · بداية · خاتمة · إيموجي، معزول لكل محادثة) عبر النواة وcomposeReply، حارس الأخطاء المصنّفة المترجمة عند حدّ الإرسال، منع معالجة الرسالة مرتين، ونواة واحدة لكل مسارات الذكاء |
| `terboo-ai-recovery.test.mjs` | ✅ PASS | 3.6ث | ✅ terboo-ai-recovery: parse-tolerant · code-request-direct · raw-text-answer-is-chat · provider-down-no-command · fallback-never-runs-owner-tool · no-object-object · gpt52-stream-shapes · gate-patterns-from-reports · decision-repa |
| `terboo-ai-runtime.test.mjs` | ✅ PASS | 3.6ث | ✅ terboo-ai-runtime: intent-matrix · download-cancel-audio · background-status-cancel · result-persists · single-primary-decision · priority-order |
| `terboo-arcade-ai.test.mjs` | ✅ PASS | 3.7ث | ✅ terboo-arcade-ai: 11 ألعاب بخصم (4 مستويات قانونية وحتمية) · XO خبير بلا خسارة · سد/إكمال · لا قراءة أسرار · مستويات مختلفة · لا LLM · 19 حالة نية |
| `terboo-arcade-engine.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-arcade-engine: 7 مجموعات (contract-and-single-registry · action-protocol-security · states-host-spectators · rewards-idempotent-and-daily-cap · challenge-accept-decline-expire · timeout-and-rematch · persistence-db-reposi |
| `terboo-arcade-games.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-arcade-games: 23/23 لعبة لُعبت حتى النهاية · قواعد (جاذبية · أكل إجباري · قلب · كشف آمن · دمج · سودوكو · وردل · ثيران · حروف) · لا تسريب (سفن · بطاقات · إجابة · سر · تتابع) |
| `terboo-arcade-html.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-arcade-html: هروب · مدقق (11 رفض) · نقل HTML primitive لـ23 لعبة · بلا انتحال · جسر الإجراءات غير مُعلن · قوالب بموافقة المالك · 6 ثيمات · renderers |
| `terboo-arcade-multiplayer.test.mjs` | ✅ PASS | 4.6ث | ✅ terboo-arcade-multiplayer: XO مجموعة (أزرار+كتابة+nonce+دور+فوز+مكافأة) · تحدي صديق · ضد الكمبيوتر · ثعبان وسلم 4 لاعبين · أسئلة جماعية · اختيار سري في الخاص · كلام طبيعي |
| `terboo-arcade-performance.test.mjs` | ✅ PASS | 0.9ث | ✅ terboo-arcade-performance: 100 غرفة: إنشاء 13ms · حركات 50ms (0.5ms/حركة) · تنظيف 7ms · heap 44MB \| 500 غرفة: إنشاء 28ms · حركات 117ms (0.23ms/حركة) · تنظيف 18ms · heap 45MB \| 1000 غرفة: إنشاء 44ms · حركات 210ms (0.21ms/حركة)  |
| `terboo-baileys-migration.test.mjs` | ❌ FAIL | 0.7ث | — |
| `terboo-brand-assets.test.mjs` | ✅ PASS | 0.9ث | ✅ terboo-brand-assets: 84 صورة هوية (43 قسم · 8 shuffle) · 41 أصل محفوظ · 0 مسار مكسور |
| `terboo-brand-lock.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-brand-lock: الهوية Terboo/تيربو ثابتة، الأشكال الخاطئة تُصحَّح، المرادفات القديمة مخفية، الترحيل يحفظ البيانات |
| `terboo-brat.test.mjs` | ✅ PASS | 0.1ث | — |
| `terboo-bulk-executor.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-bulk-executor: batches-and-verify · no-blind-retry · permanent-failure-not-retried · provider-ok-but-not-verified · cancel-between-batches · resume-skips-done · error-codes · durations · parse-settings · parse-bulk · pars |
| `terboo-capability-registry.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-capability-registry: 1082 قدرة · 63 scraper · 49 إجراء · 929 أمر · 855 معروضة للنموذج |
| `terboo-channel-forward.test.mjs` | ❌ FAIL | 0.5ث | — |
| `terboo-claude-adapter.test.mjs` | ✅ PASS | 0.7ث | ✅ terboo-claude-adapter: request-shape · image-block · refusal · vision-route-uses-claude · key-from-config · no-key-no-claude |
| `terboo-cloud-admin.test.mjs` | ✅ PASS | 3.1ث | ✅ terboo-cloud-admin: ptero-panels-and-pages · legacy-delserver-verified · legacy-list-users · ptero-suspend-verified · vpsadmin-command · virtualizor-admin |
| `terboo-code-card.test.mjs` | ❌ FAIL | 0.9ث | — |
| `terboo-code-review.approval.test.mjs` | ✅ PASS | 0.5ث | — |
| `terboo-code-review.e2e.test.mjs` | ✅ PASS | 0.6ث | — |
| `terboo-code-review.test.mjs` | ✅ PASS | 0.5ث | — |
| `terboo-command-router.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-command-router: 42 طلباً بأربع لغات/لهجات · الصلاحيات قبل الترشيح |
| `terboo-config-template.test.mjs` | ✅ PASS | 0.9ث | ✅ terboo-config-template: 20 قيمة سرية فُحصت · 0 تسرّب · قالب secrets فارغ (24 مفتاحاً) · البنية مطابقة · --check لا يكتب |
| `terboo-dead-buttons.test.mjs` | ✅ PASS | 3.0ث | ✅ terboo-dead-buttons: 126 زر · 52 أمر · 0 ميت |
| `terboo-design.test.mjs` | ❌ FAIL | 8.1ث | — |
| `terboo-fake-card.test.mjs` | ✅ PASS | 0.1ث | — |
| `terboo-game-image-policy.test.mjs` | ✅ PASS | 3.2ث | ✅ terboo-game-image-policy: فحص ثابت (110 ملف · 0 مولّد · 0 حقل صورة) · دورة حياة 45 لعبة بلا صورة · فشل النقل بلا صورة · عقد VisualResponse (ألعاب ممنوعة · غير الألعاب مسموحة) · بنّاء HTML بلا img/data:image |
| `terboo-group-actions.test.mjs` | ✅ PASS | 4.0ث | ✅ terboo-group-actions: lock-now-verified · settings-get · member-denied · unlock-later-scheduled-and-cancel · lock-for-duration · kick-all-admin-needs-owner · kick-all-except-ahmed-batches · kick-all-technical-limits · selected-p |
| `terboo-group-ai-reports.test.mjs` | ❌ FAIL | 2.7ث | — |
| `terboo-group-directory.test.mjs` | ✅ PASS | 0.7ث | ✅ terboo-group-directory: name-matching · directory-from-metadata · incremental-updates · dedupe-and-refresh · shared-metadata-cache |
| `terboo-http-client.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-http-client: json · timeout · abort · read-retry · no-write-retry · size-limit · schema · redaction · circuit · legacy-f · axios-layer |
| `terboo-i18n-runtime.test.mjs` | ❌ FAIL | 2.4ث | — |
| `terboo-identity.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-identity: 16 فحص · pn-private · lid-private-remoteJidAlt · lid-private-signal-mapping · lid-unknown-no-fabrication · group-participantAlt · admin-lid · suffix-attack · owner-number-forms · quoted-and-mention-lid · lid-map |
| `terboo-import-graph.test.mjs` | ✅ PASS | 1.6ث | ✅ terboo-import-graph: 1450 ملف · 5461 استيراد · 0 مفقود · 0 استيراد محلي قديم |
| `terboo-integration-scenario.test.mjs` | ✅ PASS | 3.6ث | ✅ terboo-integration-scenario: مرحبا ← بتعمل اي ← تحميل عبر سجل الأدوات ← حفظ الاسم ← تذكّره ← القائمة ← الأدوات ← تنفيذ رمز_QR، كلها في دردشة المستخدم وفي نفس السياق |
| `terboo-integrity.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-integrity: 938 بلوقن · 1252 أمر · 1374 مرادف · 187 ملف core |
| `terboo-interactive-compat.test.mjs` | ✅ PASS | 5.3ث | ✅ terboo-interactive-compat: 11/11 حقول §32 · 11 صيغة عبر WAProto الرسمي (7.0.0-rc14) × 3 أغلفة × بادئة/بدون · مجموعة · قائمة حقيقية · لا ضغطة صامتة · 73 تنفيذ حقيقي |
| `terboo-interactive.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-interactive: كل الأزرار والصفوف تنتهي بأمر حقيقي — لا ضغطة صامتة |
| `terboo-l10n-runtime.test.mjs` | ✅ PASS | 4.8ث | ✅ terboo-l10n-runtime: 90 رداً حقيقياً من 45 بلوقن بالإنجليزية والإسبانية بلا بقايا عربية (سوى وسائط الأوامر)، أرقام لاتينية، القالب الأدق، حدود الكلمات، الأسهم والترقيم |
| `terboo-languages.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-languages: catalog · requested-language · documents · attachment-analysis · intent-and-route · code-instruction-language |
| `terboo-link-guard.test.mjs` | ✅ PASS | 0.0ث | — |
| `terboo-localization.test.mjs` | ✅ PASS | 0.1ث | ✅ terboo-localization: 1587 مفتاح × 3 لغات · 16 ملف خط |
| `terboo-member-card.test.mjs` | ✅ PASS | 0.9ث | ✅ terboo-member-card: 4 — clean-name · name-resolution · card-render · welcome-and-goodbye-send-card |
| `terboo-memory-matrix.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-memory-matrix: 5 خلايا بلا تسريب · مشتركة بلا خاص · دلالي · ملخّص · نسيان · TTL · إذن المالك · ترحيل |
| `terboo-menu-delivery.test.mjs` | ✅ PASS | 3.2ث | ✅ terboo-menu-delivery: الرئيسية (الشكل 1: Native Flow ببطاقة البوت ونفس الأزرار) والأقسام تسلك مسار الإعدادات والمزيد نفسه (LID محلول، اقتباس صحيح، طبقة أولى primary)، الأزرار العائمة القديمة opt-in، التحقق قبل النقل، تحويل حمولا |
| `terboo-menus.test.mjs` | ✅ PASS | 3.2ث | ✅ terboo-menus: 9 قوائم × 3 لغات · 138 صفاً · 690 ضغطة بخمس صيغ · 74 وصولاً حقيقياً للبلوقن · أزرار اللغة والنسخ · المعروض = المُختبَر |
| `terboo-messaging.test.mjs` | ✅ PASS | 3.1ث | ✅ terboo-messaging: send-local-number · duplicate-not-resent · not-on-whatsapp · stranger-denied · send-by-name-confirmed · broadcast-dry-run · broadcast-all-bots · broadcast-stop-and-resume · per-account-group-cache · model-canno |
| `terboo-miniapp-builders.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-miniapp-builders: 5 بنّاء × 3 لغات · بنية ومحتوى وحجم · 0 مورد خارجي · 0 معرّف مكرر · بلا شبكة/eval · حارس إخفاء + تحرير لمس · nonce · أزرار مربوطة · سجل |
| `terboo-miniapp-play.test.mjs` | ✅ PASS | 16.5ث | ✅ terboo-miniapp-play: 5 ألعاب تُلعب في Chromium — XO (نقرة⇒X · رد الكمبيوتر · رفض خانة مشغولة · صعب لا يُهزم) · Sonic (حلقة · قفز · توقف عند الإخفاء) · Snake (حركة · اتجاه · موت بالجدار · إعادة · استئناف بعد الإخفاء) · Memory (قل |
| `terboo-miniapp-security.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-miniapp-security: وكيل الأصول (توقيع · عبث · انتهاء · مضيف مغلق · لا SVG/HTML · 405) · قناة الإجراءات (stale · bad-nonce · expired · 6 حقول قرار · actionId · حمولة ضخمة · رمز غريب · تزامن ⇒ 1) · رمز بلا هوية خام · سرية ال |
| `terboo-miniapp-transport.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-miniapp-transport: القدرة من دالة إرسال حقيقية · 0 حقل إثبات ملفَّق (حارس مُختبَر) · بروتو الحزمة الرسمية يحمل الشكل · relayMessage واحد لكل لعبة · مطفأ ⇒ نص سبب بلا رابط ولا أزرار · فشل ⇒ نص بلا بديل · ميزانية ومحيط يرفض |
| `terboo-miniapp-ui.test.mjs` | ✅ PASS | 14.8ث | ✅ terboo-miniapp-ui: Chromium حقيقي · صفحة لعب على 320/360/412/480/820px بلا overflow · RTL+LTR · 0 أخطاء console · 0 موارد خارجية · نقرة لمس ⇒ حالة الخادم · حقل قرار مرفوض · أصل بصري same-origin موقّع · كتالوج 45+5 لعبة ببحث وفلا |
| `terboo-multimodal.test.mjs` | ✅ PASS | 6.6ث | ✅ terboo-multimodal: ocr-real · vision-receives-image · vision-capability-honest · media-routing · voice-note-transcribed · voice-honest-failures · transcribe-quoted · voice-reply · video-quick · documents · scanned-pdf-ocr · secu |
| `terboo-natural-ai.test.mjs` | ✅ PASS | 0.6ث | — |
| `terboo-no-silent-catch.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-no-silent-catch: 1324 ملف · 0 catch صامت · 862 موضع تسجيل · السجل والتسجيل والإرسال الحقيقي |
| `terboo-nvidia-ai.test.mjs` | ✅ PASS | 0.2ث | — |
| `terboo-onboarding.test.mjs` | ✅ PASS | 0.7ث | ✅ terboo-onboarding: كل الاختبارات نجحت |
| `terboo-performance.test.mjs` | ✅ PASS | 4.7ث | ✅ terboo-performance: مزوّد واحد لكل رسالة، مهلة وقاطع دائرة وميزانية، نواة داخلية سريعة، بلا تأخير مصطنع، كل المراحل مقيسة |
| `terboo-permissions.test.mjs` | ✅ PASS | 2.5ث | ✅ terboo-permissions: group-actions · account-and-owner-tools · resources · target-protection · identity · legacy-roles-hidden-from-ai · matrix |
| `terboo-plugin-workbench.test.mjs` | ✅ PASS | 0.2ث | — |
| `terboo-protobuf.test.mjs` | ✅ PASS | 0.7ث | ✅ terboo-protobuf: 6 فحص · no-production-fromObject · referenced-types-exist · sensitive-round-trips · enum-hazard-documented · webmessageinfo-relay · migrated-plugins-load (Baileys 7.0.0-rc14) |
| `terboo-provider-router.test.mjs` | ✅ PASS | 5.6ث | ✅ terboo-provider-router: fast-primary-single-call · slow-primary-hedged · failing-primary-immediate-fallback · health-aware-promotion · no-hedge-for-summary |
| `terboo-pterodactyl.test.mjs` | ✅ PASS | 0.5ث | ✅ terboo-pterodactyl: ssrf · add-client-panel · servers-and-permissions · application-panel · edit-replace-delete |
| `terboo-quote.test.mjs` | ✅ PASS | 0.1ث | — |
| `terboo-registration-optional.test.mjs` | ✅ PASS | 2.7ث | ✅ terboo-registration-optional: 6 سيناريوهات نجحت |
| `terboo-reminders.test.mjs` | ✅ PASS | 2.6ث | ✅ terboo-reminders: parse-matrix · kernel-flow · honest-no-promise · privacy-and-limits · real-scheduler-exact-date |
| `terboo-rich-response.test.mjs` | ✅ PASS | 1.1ث | ✅ terboo-rich-response: 18 فحص · 18 لغة · تلوين بلا فقد · بديل تلقائي · بلا انتحال Meta AI |
| `terboo-scraper-ai-e2e.test.mjs` | ✅ PASS | 2.9ث | ✅ terboo-scraper-ai-e2e: 8 طلبات عبر البلوقنات الحقيقية بلا نموذج، 3 منصات عبر المحوّلات، TOOL من النموذج بنداء واحد، حماية المدخلات |
| `terboo-scraper-registry.test.mjs` | ✅ PASS | 0.9ث | ✅ terboo-scraper-registry: 63/63 scraper مسجّل ومكتشف، 20 طلباً طبيعياً، بديل واحد، قاطع دائرة، إرسال ذكي |
| `terboo-scrapers-each.test.mjs` | ✅ PASS | 9.8ث | ✅ terboo-scrapers-each: 63/63 scraper × 10 فحوص · 63 ملفاً = 63 أداة مسجّلة · قاطع دائرة وبديل |
| `terboo-secrets-vault.test.mjs` | ✅ PASS | 0.4ث | ✅ terboo-secrets-vault: config-secrets · console-and-failure-log · outgoing-message · ai-ask-redacts · vault |
| `terboo-smart-buttons.test.mjs` | ✅ PASS | 3.0ث | ✅ terboo-smart-buttons: 11 — ui-descriptor · button-policy · kernel-clarification-buttons · kernel-no-buttons-when-unsafe · kernel-confirm-buttons · kernel-owner-button-hidden · cloud-tools-catalog · cloud-tools-central-permission |
| `terboo-ssh-agent.test.mjs` | ✅ PASS | 24.7ث | ✅ terboo-ssh-agent: register-secret-scrubbed · stranger-denied · natural-status · run-policy · zip-rejections · deploy-fail-fix-run · bad-fix-rolled-back · legacy-password-refused |
| `terboo-ssh.test.mjs` | ✅ PASS | 7.5ث | ✅ terboo-ssh: policy · register-encrypted · pin-before-auth · exec-read-quoted · write-needs-confirmation · real-exit-code-and-timeout · sftp-workspace-only · recipe-with-answers · password-host-redacted · host-key-change-refused  |
| `terboo-syntax.test.mjs` | ✅ PASS | 14.5ث | ✅ terboo-syntax: 1450 ملف · 0 أخطاء نحوية |
| `terboo-task-resume.test.mjs` | ✅ PASS | 0.6ث | ✅ terboo-task-resume: استئناف بعد إعادة التشغيل · رفض صادق للوسائط · ملكية · فشل صريح · تسليم نتيجة الإعادة · متابعة VPS |
| `terboo-telegram-vps.test.mjs` | ✅ PASS | 1.3ث | ✅ terboo-telegram-vps: 12 — start-and-roles · group-chat-no-data · owner-wizard-assign-by-telegram-id · cross-platform-single-holder · buyer-dashboard-and-ownership · buyer-power-confirmed-once · hostname-and-password-secret · rei |
| `terboo-text-style.test.mjs` | ✅ PASS | 0.6ث | — |
| `terboo-tool-registry.test.mjs` | ✅ PASS | 0.9ث | ✅ terboo-tool-registry: one-registry · tool-search · kernel-instruction-limited · run-scraper-tool · run-local-tools · snapshot-clean |
| `terboo-transport.test.mjs` | ✅ PASS | 2.9ث | ✅ terboo-transport: all-kinds · interactive-kinds · invalid-falls-back · ui-presses:1000 · ui-matrix |
| `terboo-typography.test.mjs` | ❌ FAIL | 0.6ث | — |
| `terboo-ui-intents.test.mjs` | ✅ PASS | 2.8ث | ✅ terboo-ui-intents: قائمة+أزرار+بديل نصي · رؤوس فيديو/مستند/صورة · to+منشن · carousel · ping2 مُرحّل |
| `terboo-virtualizor.test.mjs` | ✅ PASS | 0.8ث | ✅ terboo-virtualizor: client · no-entitlement · owner-assign · isolation · capabilities-and-details · actions · revoke-and-expiry · matrix-and-policy |
| `terboo-visual-response.test.mjs` | ✅ PASS | 5.1ث | ✅ terboo-visual-response: 929 أمر · HTML مؤهل 45 (ألعاب فقط، يُسلَّم hybrid) · تحقق يرفض الميت/غير المُدقَّق · تسليم موحّد · المصفوفة حديثة |
| `terboo-vps-provisioner.test.mjs` | ✅ PASS | 7.0ث | ✅ terboo-vps-provisioner: 11 سيناريو — تحقق · preflight · مسار واتساب كامل · تكرار · رفض · خطأ بعد الوصول · مهلة · استئناف · غير المالك · القديم · الباقات |
| `terboo-vpsadmin-center.test.mjs` | ✅ PASS | 3.6ث | ✅ terboo-vpsadmin-center: 8 — dashboard · account-and-free · wizard-assign · one-command-assign-as-typed · cards-and-lists · group-goes-private · stranger-blocked · main-menu-buttons |
| `terboo-web-arcade.test.mjs` | ✅ PASS | 3.1ث | ✅ terboo-web-arcade: رمز موقّع · API (قبول/قديم/محظور/منتهٍ/منشأ/JSON) · صفحة اللعب + CSP · كتالوج 45 · رابط تلقائي/مالك · زر الخاص + رابط شخصي للمجموعة · .موقع (منفذ/رابط/SSL + HTTPS فعلي) |
| `terboo-web-unchanged.test.mjs` | ✅ PASS | 0.2ث | ✅ terboo-web-unchanged: WEB_FILES_UNCHANGED PASS · 18 ملف · الحارس يكشف تغييراً مدسوساً · طبقة النقل لا تلمس الموقع |
| `terboo-website-button.test.mjs` | ✅ PASS | 3.5ث | ✅ terboo-website-button: بلا رابط · ar/en/es · 6 روابط مرفوضة · القوائم الفرعية · حالة المالك |
| `terboo-website.test.mjs` | ✅ PASS | 2.5ث | ✅ terboo-website: عام+رؤوس أمان · دخول واتساب+جلسة HttpOnly · CSRF · لا ترقية بعلم العميل · owner-only · اجتياز المسار · خروج · أدوات/مهام · تحديد المعدّل |
| `tiktoksearch.test.mjs` | ✅ PASS | 0.2ث | — |
