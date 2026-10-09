# TERBOO MINI APPS — المعمارية وقرار النقل والإعداد

> يوصّف هذا المستند النظام **بعد** الترحيل. خط الأساس قبله في
> [`TERBOO_MINIAPP_BASELINE_AUDIT.md`](./TERBOO_MINIAPP_BASELINE_AUDIT.md).

---

## 1. قرار النقل (الأهم)

السؤال: هل تُلعب اللعبة **داخل فقاعة رسالة واتساب** أم في **صفحة Mini App** على رابط موقّع؟

تم الحسم بالاختبار لا بالتخمين، على `@whiskeysockets/baileys@7.0.0-rc14` المثبّت فعلاً:

| القدرة | النتيجة | الدليل |
|---|---|---|
| هل يحمل البروتوكول HTML؟ | **نعم** | `richResponseMessage.unifiedResponse.data` يمر encode→decode بلا فقدان؛ 365 بايت دخلت و365 خرجت، و`response_id` وHTML متطابقان |
| هل `sendHtmlApp` موجود؟ | **لا** | `typeof lib.sendHtmlApp === "undefined"` |
| هل `url`/`trustedSources`/`height` حقول حقيقية؟ | **لا** | تُحذف بصمت في round-trip (كلها `null` بعد الفك) |
| هل يصيّر WhatsApp Android هذا العنصر لحساب عادي؟ | **غير مُثبت** | لا دليل في المكتبة ولا في المشروع؛ وهو عنصر ردّ لمساعد Meta |
| هل تعود نقرة من داخله إلى الخادم؟ | **لا** | لا قناة؛ خط الأساس نفسه يقر بذلك عبر `ACTION_BRIDGE.enabled = false` |

**⇒ القرار: المادة 12.4 — Mini App ويب حقيقية.**

```
رسالة واتساب (مُطلِق)                    صفحة Mini App (اللعب الفعلي)
┌──────────────────────────┐             ┌───────────────────────────────┐
│ بطاقة HTML مدقّقة (حالة)  │             │ GET /play/<token>             │
│ + نص اللوحة بالإيموجي     │  رابط       │  ⇒ play.html + play.js/css    │
│ + أزرار واتساب أصلية      │ ─────────▶  │  ⇒ GET  /api/v1/arcade/s/<t>  │
│   تحمل Action ID + nonce  │  موقّع      │  ⇒ POST .../action            │
│ + زر «العب تفاعلياً»       │  منتهي     │     {actionId,payload,nonce,ts}│
└──────────────────────────┘             └───────────────────────────────┘
          │                                           │
          └──────────── engine.applyAction ◀──────────┘
                    (مصدر الحقيقة الوحيد)
```

**لم يُنسخ المسار المرجعي** القائم على `sendHtmlApp` لثلاثة أسباب موثّقة في التدقيق §2:
استبدال Baileys الرسمية بـfork طرف ثالث (`@yudzxml/baileys`)، وتجاوز مدقّق HTML الخاص بالمشروع
(يرسل `<iframe>` وهو في `FORBIDDEN_TAGS`)، وحقول تحقق لا وجود لها في البروتوكول.

### النقل المضمَّن: متاح، مطفأ، وموصوف بصدق

```js
resolveHtmlTransport(null)    // "off"  ← الافتراضي
resolveHtmlTransport("rich")  // "rich" ← تفعيل صريح من config
// TERBOO_ARCADE_HTML=rich    ← تفعيل صريح من البيئة (يتغلّب على config)
```

التفعيل يبني ويُرسل `richResponseMessage` بعد مروره من المدقّق. **لا يُسمّى تفاعلياً**:
الأزرار الأصلية والصفحة هما قناتا التحكم. من يريد تجربته على جهاز حقيقي يفعّله ويقيس.

---

## 2. طبقات النظام

| الطبقة | الملف | المسؤولية |
|---|---|---|
| **محرك القواعد** | `src/lib/terboo-arcade/engine.js` | مصدر الحقيقة: الغرف · الأدوار · nonce · القفل · الصلاحية · النتيجة · المكافآت |
| **عقد اللعبة** | `terboo-arcade/contract.js` | `defineGame` — تطبيع وتحقق؛ `FORBIDDEN_PAYLOAD_KEYS` |
| **السجل الواحد** | `terboo-games.js` (78 سطراً) | سجل فقط، لا محرك. `register()` يسجّل العقد الموحّد فوراً |
| **محرك الأسئلة** | `terboo-arcade/questions.js` | خيارات A–D · مؤقت · سلسلة · مساعدات. الإجابة لا تُرسل للعميل |
| **ترحيل الأسئلة القديمة** | `terboo-arcade/legacy-quiz.js` | يحوّل `games.register` ⇒ عقد `defineGame` فوق `quizGame` |
| **العشوائية** | `terboo-arcade/rng.js` | `serverRng` من crypto · `seeded()` حتمي للاختبار والذكاء |
| **العرض** | `terboo-arcade/render.js` | View Model واحد ⇒ نص · أزرار · HTML |
| **بنّاء HTML + مدقّق** | `terboo-html-game.js` | بناء البطاقة + فحص بنيوي للوسوم والسمات وCSS |
| **نظام التصميم** | `terboo-game-design-system.js` | tokens وثيمات؛ لا CSS مكرر لكل لعبة |
| **نقل واتساب** | `terboo-arcade/whatsapp.js` + `terboo-visual-response.js` | عقد `VisualResponse` واحد؛ حارس «لا صور للألعاب» |
| **جلسة الويب** | `terboo-arcade/web.js` | رمز موقّع · `publicView` بلا هوية · نفس مسار الإجراءات |
| **وكيل الأصول** | `terboo-arcade/assets.js` | صورة سؤال داخل الصفحة بـsame-origin ورمز موقّع |
| **خادم + API** | `web/server.js` · `web/api/arcade.js` | التوجيه · CSP · حد معدّل · الكتالوج · الأصول |
| **عميل Mini App** | `web/public/play.{html,css,js}` | عارض لكل لعبة؛ لا يحسب نتيجة |
| **كتالوج Mini Apps** | `web/public/arcade.{html,css,js}` | من `/api/v1/arcade/catalog` فقط |

---

## 3. ترحيل ألعاب الأسئلة الـ22 — لا محرك ثانٍ

الألعاب القديمة كانت على محرك جلسات مستقل في `terboo-games.js` (`createHandler`/`createPlugin`)،
ترد نصاً وترسل صورة السؤال كرسالة. الآن:

```
games.register("خمن_العلم", {dataFile, emoji, title, timeout, hasImage, …})
        │  (يبقى — هو مصدر بيانات العقد)
        ▼
tryLegacyQuizContract(cfg)            ← terboo-arcade/legacy-quiz.js
        │  dataReady() ⇒ ≥4 إجابات فريدة؟
        ▼
quizGame({id:"q_tebakbendera", source: من src/data/tebakbendera2.json})
        │  + parseInput يقبل الحرف **ونص الإجابة**
        │  + view يضيف asset.ref موقّعاً للألعاب البصرية
        ▼
defineGame(...)  ⇒ games.arcade.set("q_tebakbendera", contract)
```

الخيارات A–D تُولَّد على الخادم من إجابات أخرى في **نفس** ملف البيانات، ثم
`shuffleOptions` يخلط المواضع بـ`serverRng`. فهرس الإجابة لا يصل العميل إطلاقاً.

**النتيجة:** 22/22 رُحّلت · 0 متخطّاة · العقود 23 ⇒ **45**.
البلوقنات صارت `quickCommand("q_*")` مثل بقية الأركيد، بنفس الأمر والمرادفات.
لعبة لا تتوفر لها بيانات كافية لا تُرحَّل وتردّ رسالة صريحة (`ui.err.unavailable`)،
ويُسجَّل سببها في `games.legacySkipped` — لا ادّعاء ترحيل.

### ما حُذف ولماذا

| محذوف | السبب |
|---|---|
| `createHandler` / `createPlugin` (~206 سطراً) | محرك جلسات ثانٍ موازٍ للمحرك الموحّد |
| `sendQuizCard` + `inlineQuizImage` | آخر مسار يرسل صورة سؤال، ويحوي الـimage fallback |
| `drawBoard` + `PLAYER_IMAGES` + `DICE_STICKERS` | مولّد صورة لوحة على canvas (بلا مستهلك، لكنه جاهز للاستخدام) |
| `inlineImageDataUrl` + `.ta-asset-image` | Base64 لصورة داخل بطاقة الرسالة |
| `fetchBuffer` في `terboo-games.js` | كان لتنزيل صور الأسئلة فقط |

---

## 4. سياسة الصور

```
رسالة واتساب لأي لعبة  ⇒  صفر صور.  لا لوحة · لا معاينة · لا thumbnail · لا fallback.
صفحة Mini App          ⇒  صورة سؤال مسموحة للألعاب البصرية فقط، بشروط §5.
بقية البوت             ⇒  بلا تغيير: ملصقات · تنزيلات · canvas · ترحيب · أوامر صور.
```

ثلاث طبقات تمنع العودة:
1. **المصدر** — لا مولّد صور ولا حقل صورة في أي مسار لعبة.
2. **العقد** — `validateVisualResponse` يرفض `image` لبطاقة لعبة (`arcade:` `quiz:` `game:` `miniapp:`)، و`deliverVisual` يجرّدها دفاعاً ثانياً.
3. **الاختبار** — `tests/terboo-game-image-policy.test.mjs` يفحص 105 ملفاً ثابتاً وAST، ثم يلعب دورة حياة كاملة لـ45 لعبة على mock socket ويفتّش كل رسالة صادرة.

عند فشل النقل: نص مختصر + رابط Mini App. لا صورة، ولا حلقة إعادة محاولة.

---

## 5. وكيل الأصول البصرية

```
GET /api/v1/arcade/asset/<token>
```
- الرمز: `HMAC-SHA256(arcade:assetSecret, body)` + انتهاء 2 ساعات + ربط بالجلسة.
- قائمة مضيفات **مغلقة** (`ALLOWED_HOSTS`) ⇒ ليس وكيلاً مفتوحاً. `localhost` و`169.254.169.254` مرفوضان.
- HTTPS فقط · أنواع صور ثابتة فقط (**لا SVG** لأنه ينفّذ سكربت، ولا HTML) · 2MB · مهلة 8ث.
- الخادم يجلب البايتات ⇒ الصفحة same-origin، وCSP `img-src 'self' data: blob:` يكفي، ولا يرى العميل عنوان المصدر.
- `play.js` لا يقبل إلا `^/api/v1/arcade/asset/[A-Za-z0-9_.-]+$`.

---

## 6. تجربة Mini App

- صفحة لعب لكل غرفة/مقعد على `/play/<token>`، وعارض حركي لكل ميكانيكية (شبكة · أقراص تسقط · بطاقات تقلب · بلاطات · مسار · ثعبان/طوب حيّ · بطاقات أسئلة).
- هوية واحدة: زجاج عميق · bevel · neon محسوب · حالات hover/pressed · انتقالات قصيرة.
- ثيم لكل لعبة؛ ألعاب الأسئلة المُرحَّلة تأخذ لوناً **مشتقاً من معرّفها** فلا تتشابه.
- عربية RTL كاملة، وLTR سليم للإنجليزية والإسبانية.
- الحالات: Loading · Waiting · Your Turn · Opponent · Paused · Won/Lost/Draw · Expired · Network Error · Rematch.
- وصول: أهداف لمس ≥ 40px · `aria-label` · لوحة مفاتيح · `prefers-reduced-motion` محترم.
- أصوات WebAudio مولّدة، اختيارية وقابلة للكتم، لا تبدأ قبل تفاعل، ولا تُعطّل اللعب إن غاب `AudioContext`.
- بلا CDN وبلا موارد خارجية (مُختبر: 0 طلب خارجي).

---

## 7. الكتالوج

```
صفحة:  GET /arcade          ⇒ web/public/arcade.html
بيانات: GET /api/v1/arcade/catalog?lang=ar
أمر:    .اركيد               ⇒ قائمة أقسام + منتقي ألعاب (من السجل)
```
فئات · بحث · فلاتر (ضد الكمبيوتر · فردي · مع الأصدقاء · سريعة ≤60ث) · بطاقة لكل لعبة
(الاسم · الوصف · المدة · النمط · الأمر) · لوحة تفاصيل.
المصدر هو السجل فقط ⇒ لا تظهر لعبة بلا قواعد، ولا رقم يتعارض مع الواقع.
أُزيلت العبارات المكتوبة «23 لعبة» من الموقع لأنها كانت ستكذب بعد الترحيل.

---

## 8. الإعداد ومتغيرات البيئة

| المتغير / الإعداد | الافتراضي | المعنى |
|---|---|---|
| `TERBOO_ARCADE_HTML` | *(غير مضبوط)* | `off` أو `rich` — نقل HTML المضمَّن. يتغلّب على config |
| `config.arcade.html.transport` | `"off"` | نفس الخيار من ملف الإعداد |
| `TERBOO_SITE_URL` / `.موقع رابط` | — | الرابط العام؛ بدونه يُشتق من IP:المنفذ. **بلا رابط عام لا يوجد زر Mini App** |
| `TERBOO_WEB_PORT` / `.موقع منفذ` | من الإعداد | منفذ الموقع |
| `TERBOO_PUBLIC_IP` | يُكتشف | لاشتقاق الرابط التلقائي |
| `TERBOO_TEST_CHROMIUM` | `/opt/pw-browsers/chromium` | مسار Chromium لاختبار الواجهة |

أسرار تُولَّد مرة وتُخزَّن في القاعدة ولا تظهر في أي رد أو سجل:
`arcade:webSecret` (رمز اللعب) · `arcade:assetSecret` (وكيل الأصول).

**لم تُغيَّر أي تبعية ولا `package-lock.json`.** Baileys تبقى `@whiskeysockets/baileys@7.0.0-rc14`.

---

## 9. التوافق

| العميل | الحالة | كيف تم التحقق |
|---|---|---|
| متصفح Chromium 141 (محرك WebView أندرويد) | **نجح بالاختبار** | `tests/terboo-miniapp-ui.test.mjs` على 320/360/412/480/820px |
| WhatsApp Android — بطاقة + أزرار + رابط | **فُحص ثابتاً** (بنية الرسالة واختبار mock) | `terboo-arcade-multiplayer` · `terboo-web-arcade` |
| WhatsApp Android — فتح Mini App في المتصفح | **لم يُختبر على جهاز حقيقي** | لا جهاز/حساب واتساب في بيئة التنفيذ |
| WhatsApp Android — HTML مضمَّن | **غير مُثبت، ومطفأ افتراضياً** | الترميز مُثبت؛ التصيير لا |
| WhatsApp Web / iOS | **لم يُختبر** | لا يُعلن دعم |

لم تُجرَّب أي من المسارات على عميل واتساب حقيقي في هذه البيئة، ولا يُدّعى ذلك.
المسارات المعلنة «نجحت بالاختبار» هي ما شغّلته الاختبارات فعلاً.
