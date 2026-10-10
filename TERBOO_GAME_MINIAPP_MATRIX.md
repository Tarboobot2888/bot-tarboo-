# TERBOO — مصفوفة ألعاب Mini Apps

> **ملف مولّد** بـ`node tools/terboo-game-miniapp-matrix.mjs`. لا رقم مكتوب يدوياً:
> الأسماء والأوامر والمرادفات من `config` كل بلوقن، والعقود من السجل الحيّ،
> والأحجام من قياس فعلي للمستند، و«نظيف» من `auditWebViewHtml`.

## الحصيلة

| المقياس | القيمة |
|---|---|
| بلوقنات فئة `game` | **60** |
| عقود أركيد في السجل | 45 |
| ألعاب لها Mini App مضمَّنة منفَّذة | **5** |
| الفئة 1 — محلية بالكامل | 5 |
| الفئة 2 — مرتبطة بالخادم | 18 |
| الفئة 3 — جماعية متزامنة | 37 |

## لماذا الفئتان 2 و3 محجوبتان عن النقل المضمَّن

ليست مسألة وقت تنفيذ. الصفحة داخل الفقاعة تعمل في **أصل معتم بلا شبكة**:
`fetch` و XHR و `WebSocket` و `sendBeacon` كلها ميتة بلا إشعار، وكل واجهات
التخزين ترمي `SecurityError`. فلعبة تحتاج قراءة حالة من الخادم أو كتابة مكافأة
أو مزامنة خصم **لا تستطيع ذلك من هناك**، ورسم لوحتها داخل الفقاعة يُنتج واجهة
تكذب على اللاعب. القيود ومصدرها في `TERBOO_YUDZXML_LIBRARY_REVIEW.md` §3.

رفع هذا الحجب يحتاج قناة اتصال من الفقاعة إلى الخادم. المسار الوحيد المعروف
لإتاحتها يمرّ بتمرير `url` أصلاً للـWebView، وهو حقل في مكتبة مرفوضة لتلفيقها
إثبات التحقق (§1 من مراجعة المكتبة) — ولا يُنفَّذ بتعديل الموقع لأن ذلك خارج نطاق
المهمة. فالقيد **موثَّق ولم يُتجاوَز**.

## ألعاب Mini App المنفَّذة

| اللعبة | المعرّف | الأمر | البنّاء | الحجم على السلك | مدقّق المحيط | التفاعل | الاختبار الفعلي |
|---|---|---|---|---|---|---|---|
| ٢٠٤٨ | `n2048` | `.٢٠٤٨` | `src/lib/miniapps/n2048.js` | 20KB | نظيف | لمس داخل المستند | متصفح Chromium |
| إكس أو | `xo` | `.اكس_او_مصغر` | `src/lib/miniapps/xo.js` | 23KB | نظيف | لمس داخل المستند | متصفح Chromium |
| ثعبان الشبكة | `snake` | `.ثعبان_مصغر` | `src/lib/miniapps/snake.js` | 21KB | نظيف | لمس داخل المستند | متصفح Chromium |
| الذاكرة | `memory` | `.ذاكرة_مصغرة` | `src/lib/miniapps/memory.js` | 21KB | نظيف | لمس داخل المستند | متصفح Chromium |
| سونك ران | `sonic` | `.سونك` | `src/lib/miniapps/sonic.js` | 21KB | نظيف | لمس داخل المستند | متصفح Chromium |

## كل ألعاب المشروع

| # | الفئة | اللعبة | الأمر | مرادفات | الملف | Mini App؟ | النقل المضمَّن | السبب | الاختبارات |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 — محلية بالكامل | ٢٠٤٨ | `.٢٠٤٨` | 3 | `plugins/game/٢٠٤٨.js` | ✅ نعم | **منفَّذ** | المنطق كله محلي: لا تحتاج شبكة ولا تخزيناً | miniapp-builders · miniapp-play (متصفح) · miniapp-transport · webview-budget |
| 2 | 1 — محلية بالكامل | إكس أو | `.اكس_او_مصغر` | 3 | `plugins/game/اكس_او_مصغر.js` | ✅ نعم | **منفَّذ** | المنطق كله محلي: لا تحتاج شبكة ولا تخزيناً | miniapp-builders · miniapp-play (متصفح) · miniapp-transport · webview-budget |
| 3 | 1 — محلية بالكامل | ثعبان الشبكة | `.ثعبان_مصغر` | 3 | `plugins/game/ثعبان_مصغر.js` | ✅ نعم | **منفَّذ** | المنطق كله محلي: لا تحتاج شبكة ولا تخزيناً | miniapp-builders · miniapp-play (متصفح) · miniapp-transport · webview-budget |
| 4 | 1 — محلية بالكامل | الذاكرة | `.ذاكرة_مصغرة` | 3 | `plugins/game/ذاكرة_مصغرة.js` | ✅ نعم | **منفَّذ** | المنطق كله محلي: لا تحتاج شبكة ولا تخزيناً | miniapp-builders · miniapp-play (متصفح) · miniapp-transport · webview-budget |
| 5 | 1 — محلية بالكامل | سونك ران | `.سونك` | 4 | `plugins/game/سونك.js` | ✅ نعم | **منفَّذ** | المنطق كله محلي: لا تحتاج شبكة ولا تخزيناً | miniapp-builders · miniapp-play (متصفح) · miniapp-transport · webview-budget |
| 6 | 2 — مرتبطة بالخادم | fisht | `.fisht` | 1 | `plugins/game/fisht.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 7 | 2 — مرتبطة بالخادم | mct | `.mct` | 1 | `plugins/game/mct.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 8 | 2 — مرتبطة بالخادم | اركيد | `.اركيد` | 2 | `plugins/game/اركيد.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 9 | 2 — مرتبطة بالخادم | الثعبان الذهبي | `.الثعبان_الذهبي` | 1 | `plugins/game/الثعبان_الذهبي.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 10 | 2 — مرتبطة بالخادم | 2048 | `.الفين` | 1 | `plugins/game/الفين.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 11 | 2 — مرتبطة بالخادم | الرجل المشنوق | `.المشنوق` | 1 | `plugins/game/المشنوق.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 12 | 2 — مرتبطة بالخادم | تحطيم الطوب | `.تحطيم_الطوب` | 1 | `plugins/game/تحطيم_الطوب.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 13 | 2 — مرتبطة بالخادم | حماية | `.حماية` | 1 | `plugins/game/حماية.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 14 | 2 — مرتبطة بالخادم | دنجن | `.دنجن` | 1 | `plugins/game/دنجن.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 15 | 2 — مرتبطة بالخادم | سايمون | `.سايمون` | 1 | `plugins/game/سايمون.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 16 | 2 — مرتبطة بالخادم | سودوكو | `.سودوكو` | 1 | `plugins/game/سودوكو.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 17 | 2 — مرتبطة بالخادم | فحص_عراف | `.فحص_عراف` | 1 | `plugins/game/فحص_عراف.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 18 | 2 — مرتبطة بالخادم | قتل | `.قتل` | 1 | `plugins/game/قتل.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 19 | 2 — مرتبطة بالخادم | كاشف الألغام | `.كاشف_الالغام` | 1 | `plugins/game/كاشف_الالغام.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 20 | 2 — مرتبطة بالخادم | كشف | `.كشف` | 1 | `plugins/game/كشف.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 21 | 2 — مرتبطة بالخادم | مستذئب | `.مستذئب` | 1 | `plugins/game/مستذئب.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 22 | 2 — مرتبطة بالخادم | نينجا | `.نينجا` | 1 | `plugins/game/نينجا.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | game-image-policy |
| 23 | 2 — مرتبطة بالخادم | وردل عربي | `.وردل` | 1 | `plugins/game/وردل.js` | لا | محجوب | الصفحة في أصل معتم بلا شبكة ⇒ لا سبيل لقراءة الحالة أو كتابة المكافأة | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 24 | 3 — جماعية متزامنة | أسئلة ذكاء | `.أسئلة_ذكاء` | 1 | `plugins/game/أسئلة_ذكاء.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 25 | 3 — جماعية متزامنة | ألغاز | `.ألغاز` | 1 | `plugins/game/ألغاز.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 26 | 3 — جماعية متزامنة | أربعة في صف | `.اربعة_في_صف` | 2 | `plugins/game/اربعة_في_صف.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 27 | 3 — جماعية متزامنة | إكس أو | `.اكس_او` | 1 | `plugins/game/اكس_او.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 28 | 3 — جماعية متزامنة | أوثيلو | `.اوثيلو` | 2 | `plugins/game/اوثيلو.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 29 | 3 — جماعية متزامنة | بولز آند كاوز | `.بولز` | 1 | `plugins/game/بولز.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 30 | 3 — جماعية متزامنة | ثعبان وسلم | `.ثعبان_وسلم` | 1 | `plugins/game/ثعبان_وسلم.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 31 | 3 — جماعية متزامنة | حجرة ورقة مقص | `.حجرة_ورقة_مقص` | 1 | `plugins/game/حجرة_ورقة_مقص.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 32 | 3 — جماعية متزامنة | خمسة في صف | `.خمسة_في_صف` | 1 | `plugins/game/خمسة_في_صف.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 33 | 3 — جماعية متزامنة | خمن الأغنية | `.خمن_الأغنية` | 1 | `plugins/game/خمن_الأغنية.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 34 | 3 — جماعية متزامنة | خمن الحيوان | `.خمن_الحيوان` | 1 | `plugins/game/خمن_الحيوان.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 35 | 3 — جماعية متزامنة | خمن الدراما | `.خمن_الدراما` | 1 | `plugins/game/خمن_الدراما.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 36 | 3 — جماعية متزامنة | خمن الدولة | `.خمن_الدولة` | 1 | `plugins/game/خمن_الدولة.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 37 | 3 — جماعية متزامنة | خمن الشخصية | `.خمن_الشخصية` | 1 | `plugins/game/خمن_الشخصية.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 38 | 3 — جماعية متزامنة | خمن الصورة | `.خمن_الصورة` | 1 | `plugins/game/خمن_الصورة.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 39 | 3 — جماعية متزامنة | خمن الطعام | `.خمن_الطعام` | 1 | `plugins/game/خمن_الطعام.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 40 | 3 — جماعية متزامنة | خمن العضوة | `.خمن_العضوة` | 1 | `plugins/game/خمن_العضوة.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 41 | 3 — جماعية متزامنة | خمن العلم | `.خمن_العلم` | 1 | `plugins/game/خمن_العلم.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 42 | 3 — جماعية متزامنة | خمن العنصر | `.خمن_العنصر` | 1 | `plugins/game/خمن_العنصر.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 43 | 3 — جماعية متزامنة | خمن الفيلم | `.خمن_الفيلم` | 1 | `plugins/game/خمن_الفيلم.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 44 | 3 — جماعية متزامنة | خمن الكلمات | `.خمن_الكلمات` | 1 | `plugins/game/خمن_الكلمات.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 45 | 3 — جماعية متزامنة | خمن الكلمة | `.خمن_الكلمة` | 1 | `plugins/game/خمن_الكلمة.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 46 | 3 — جماعية متزامنة | خمن المثل | `.خمن_المثل` | 1 | `plugins/game/خمن_المثل.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 47 | 3 — جماعية متزامنة | خمن المهنة | `.خمن_المهنة` | 1 | `plugins/game/خمن_المهنة.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 48 | 3 — جماعية متزامنة | الداما | `.داما` | 1 | `plugins/game/داما.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 49 | 3 — جماعية متزامنة | ذاكرة البطاقات | `.ذاكرة_البطاقات` | 1 | `plugins/game/ذاكرة_البطاقات.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 50 | 3 — جماعية متزامنة | رتب الكلمة | `.رتب_الكلمة` | 1 | `plugins/game/رتب_الكلمة.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 51 | 3 — جماعية متزامنة | ساحة المعلومات | `.ساحة_المعلومات` | 1 | `plugins/game/ساحة_المعلومات.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 52 | 3 — جماعية متزامنة | سباق الحروف | `.سباق_الحروف` | 1 | `plugins/game/سباق_الحروف.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 53 | 3 — جماعية متزامنة | فوازير | `.فوازير` | 1 | `plugins/game/فوازير.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 54 | 3 — جماعية متزامنة | كلمة عشوائية | `.كلمة_عشوائية` | 1 | `plugins/game/كلمة_عشوائية.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 55 | 3 — جماعية متزامنة | لغز | `.لغز` | 1 | `plugins/game/لغز.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 56 | 3 — جماعية متزامنة | مبارزة الحساب | `.مبارزة_الحساب` | 1 | `plugins/game/مبارزة_الحساب.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 57 | 3 — جماعية متزامنة | معركة الجغرافيا | `.معركة_الجغرافيا` | 1 | `plugins/game/معركة_الجغرافيا.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 58 | 3 — جماعية متزامنة | معركة السفن | `.معركة_السفن` | 1 | `plugins/game/معركة_السفن.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 59 | 3 — جماعية متزامنة | من أنا | `.من_أنا` | 1 | `plugins/game/من_أنا.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |
| 60 | 3 — جماعية متزامنة | نقط ومربعات | `.نقط_ومربعات` | 1 | `plugins/game/نقط_ومربعات.js` | لا | محجوب | لا مزامنة بين لاعبين من أصل معتم؛ رسم اللوحة وحده ليس multiplayer | arcade-games · arcade-ai · arcade-multiplayer · game-image-policy |

## معايير القبول لكل Mini App

تُطبَّق آلياً على كل بنّاء في السجل، ولا يُقبل مدخل يخفق في واحدة:

1. يُبنى بثلاث لغات (ar · en · es) و`<html lang>` و`dir` صحيحان.
2. `auditWebViewHtml` بلا مشاكل: لا شبكة · لا تخزين · لا مورد خارجي · حلقة محروسة.
3. بايتات السلك تحت 960KB بعد حساب تضخّم `\uXXXX`.
4. لا معرّف عنصر مكرر · لا `eval` · لا `<script src>`.
5. `nonce` يُمرَّر إلى كل وسم `<script>`.
6. الواجهة الإنجليزية والإسبانية **بلا حرف عربي واحد**.
7. تُلعب فعلاً في Chromium: إدخال يغيّر الحالة · نهاية جولة · إعادة بلا مستمع مكرر.
8. بلا overflow أفقي على 320 · 360 · 412px · صفر خطأ console · صفر طلب خارجي.
9. الحلقة تتوقف عند إخفاء الصفحة، ولها استئناف صريح لا تجمّد صامت.
10. تسليمها رسالة **واحدة** بلا صورة وبلا أزرار حركة وبلا رابط موقع.
