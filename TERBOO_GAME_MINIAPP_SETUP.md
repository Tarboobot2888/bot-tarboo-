# TERBOO — تشغيل ألعاب Mini Apps

## 1. الاعتماديات

```bash
npm ci
```

**لم تُضَف ولم تُحذف أي حزمة.** مكتبة الاتصال كما هي:
`@whiskeysockets/baileys@7.0.0-rc14`، و`package-lock.json` بلا تغيير.

> `@yudzxml/baileys` **غير مثبّتة ولا يلزم تثبيتها.** السبب والدليل في
> `TERBOO_YUDZXML_LIBRARY_REVIEW.md` §1، والشكل السلكي الذي تحتاجه الألعاب متاح
> على الحزمة الرسمية أصلاً (§2 هناك).

## 2. الأوامر

| الأمر | اللعبة | المرادفات |
|---|---|---|
| `.سونك` | سونك ران | `sonic` · `سونيك` · `جري` |
| `.اكس_او_مصغر` | إكس أو | `xomini` · `minixo` |
| `.ثعبان_مصغر` | ثعبان الشبكة | `snakemini` · `minisnake` |
| `.ذاكرة_مصغرة` | الذاكرة | `memorymini` · `minimemory` |
| `.٢٠٤٨` | ٢٠٤٨ | `2048` · `n2048` |

## 3. الإعداد

`config.js` **لم يُلمس** كما طُلب. كل مفتاح أدناه له قيمة افتراضية في الكود،
فالمشروع يعمل بلا أي تعديل على الإعداد.

> ⚠️ **تعليق قديم في `config.js` و`config.example.js`.** المفتاح
> `arcade.html.nativeTransport` موجود من عمل سابق، وتعليقه يقول «ضبطها على `on`
> لا يفعّل شيئاً». **هذا لم يبقَ صحيحاً**: صار `on` يُفعّل نقلاً حقيقياً بلا أي
> تلفيق. لم أصحّح التعليق لأن تعديل `config.js` ممنوع في هذه المهمة، وتصحيح
> `config.example.js` وحده يُفشل `terboo-config-template` لأنه مولَّد من
> `config.js`. التصحيح سطر واحد متى أذنتَ به؛ والمرجع الصحيح هو هذا الملف.

لتغيير أي مفتاح أضِفه تحت `arcade.html`:

```js
arcade: {
  html: {
    transport: "off",        // بطاقة HTML غنية في الرسالة (عمل سابق)
    nativeTransport: "off",  // Mini App مضمَّن — تجربة اللعبة داخل الرسالة
    legacyWebLink: "off",    // مخرج مُعلَن: بطاقة برابط الموقع. **ليس** Mini App
  },
},
```

`legacyWebLink` غير موجود في الملف المُسلَّم (لأن `config.js` لم يُلمس)؛ أضِفه
إن أردته، أو استخدم متغيّر البيئة أدناه. غيابه يعني `"off"`.

أو بالبيئة (**تتغلّب على الإعداد**، نفس أسبقية بقية المشروع):

```bash
TERBOO_NATIVE_MINIAPP=on     # يفعّل النقل المضمَّن
TERBOO_MINIAPP_WEB_LINK=on   # يفعّل مخرج الرابط القديم
```

### ماذا يحدث في كل وضع

| `nativeTransport` | السلوك عند `.سونك` |
|---|---|
| `off` (الافتراضي) | رسالة نصية واحدة تشرح أن تجربة HTML داخل الرسالة غير متاحة، وتذكر السبب. **لا رابط ولا بطاقة ولا أزرار ولا صورة** |
| `on` | `relayMessage` واحد يحمل مستند اللعبة داخل الرسالة. وإن فشل: نص سبب فقط |

## 4. كيف تختبر العرض بنفسك (هذا هو الاختبار الناقص)

السؤال الوحيد الذي لم يُجَب: **هل يعرض عميل واتساب الحمولة بلا بيانات تحقق؟**
لا جهاز في بيئة البناء، فالإجابة عندك وحدك.

```bash
TERBOO_NATIVE_MINIAPP=on npm start
```

ثم من هاتف أندرويد مقترن بالبوت أرسل `.سونك`، وسجّل:

1. هل ظهرت اللعبة داخل فقاعة الرسالة، أم رسالة فارغة، أم لا شيء؟
2. هل يعمل اللمس (القفز · السحب · النقر)؟
3. إصدار واتساب · طراز الجهاز · إصدار أندرويد.

| ما تراه | ما يعنيه |
|---|---|
| اللعبة تُعرض وتُلعب | المسار المطلوب يعمل **بلا أي تلفيق** ⇒ اتركه مفعَّلاً |
| فقاعة فارغة أو لا شيء | العميل يتطلّب بيانات تحقق لا نملك إصدارها ⇒ أطفئه، والقيد نهائي كما هو موثّق |

وفي الحالتين: **لا تُفعَّل أي مكتبة تُصدر توقيعاً أو شهادة من عندها.**

## 5. التحقق قبل التشغيل

```bash
npm run test:syntax
node tests/terboo-miniapp-builders.test.mjs      # 5 بنّائين × 3 لغات
node tests/terboo-miniapp-transport.test.mjs     # رسالة واحدة · 0 حقل إثبات
node tests/terboo-miniapp-play.test.mjs          # لعب فعلي في Chromium
node tests/terboo-web-unchanged.test.mjs         # WEB_FILES_UNCHANGED
node tools/terboo-game-miniapp-matrix.mjs --check
npm run lint
```

## 6. ما لا يعمل داخل الفقاعة (قيود محيط مقيسة)

لا تبنِ لعبة تعتمد على أيٍّ من هذه؛ المدقّق يرفضها قبل الإرسال:

| الواجهة | الحال |
|---|---|
| `fetch` · XHR · `WebSocket` · `sendBeacon` · `EventSource` | **ميتة** — أصل معتم بلا شبكة، وبلا إشعار فشل |
| `localStorage` · `sessionStorage` · `indexedDB` · `document.cookie` · `caches` | **ترمي SecurityError** |
| `crypto.subtle` | يتطلّب سياقاً آمناً |
| مورد خارجي (`src`/`href` إلى `//`) | يفشل صامتاً |
| حمولة فوق 960KB (بايتات السلك) | يرفضها المدقّق · وفوق 1MB يُسقطها العميل بلا عرض |
| `aspect-ratio` | يجعل الارتفاع يطارد العرض فترتجف البطاقة |

يعمل: Canvas · `requestAnimationFrame` (بحارس إخفاء) · Pointer Events ·
`AudioContext` · المؤقتات · `matchMedia` · `navigator.vibrate`.

## 7. إضافة لعبة جديدة

```
1. src/lib/miniapps/<id>.js        بنّاء: HTML+CSS+JS ونصوص ar/en/es في COPY
2. src/lib/terboo-miniapp.js       سطر في MINI_APPS: id · icon · build · name · blurb · height
3. plugins/game/<الأمر>.js         بلوقن رقيق: config.miniApp = "<id>" ويستدعي deliverMiniApp
4. tests/terboo-miniapp-builders   صف في BUILDERS (المعرّفات المطلوبة)
5. tests/terboo-miniapp-play       كتلة تُلعب اللعبة فعلاً في المتصفح
6. node tools/terboo-game-miniapp-matrix.mjs
```

البنّاء **لا يعرف** `sock` ولا `m` ولا بنية Baileys. والبلوقن **لا يحمل** HTML
ولا CSS ولا بروتوكولاً. والنقل في مكان واحد.
