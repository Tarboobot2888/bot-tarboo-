# TERBOO V6 — دليل تثبيت وتشغيل Native Mini Apps

---

## 1. المتطلبات

| | |
|---|---|
| Node.js | **≥ 22** (`engines` في `package.json`) |
| npm | 10+ |
| الاعتماديات | **بلا تغيير** — `@whiskeysockets/baileys@7.0.0-rc14` الرسمية |
| Chromium | للاختبار فقط (`playwright`) — غير مطلوب للتشغيل |

> **لا تبدّل حزمة Baileys.** الرقعة المرجعية تقترح `npm:@yudzxml/baileys@7.6.6`
> وقد رُفضت لأنها تزوّر إثبات تحقق Meta — انظر `TERBOO_NATIVE_MINIAPP_SECURITY_REPORT.md` §1.

---

## 2. التثبيت

```bash
unzip Bot-Terboo-V6-Native-MiniApps-Fixed.zip
cd Bot-Terboo-V6-Arcade-Web
npm ci                 # نفس ملف القفل — لا يغيّر أي إصدار
```

`config.js` **مُضمَّن في الحزمة** بكل المفاتيح والأسرار كما طُلب. إن بدأت من
`config.example.js` فانسخه أولاً: `cp config.example.js config.js`.

---

## 3. الإعدادات المطلوبة

### 3.1 الحد الأدنى لتشغيل Mini Apps

الألعاب المستقلة تُفتح من رابط، فالموقع **شرط**:

```js
// config.js
website: {
  enabled: true,                        // أو TERBOO_WEB_ENABLED=1
  url: "https://games.example.com/",    // نطاقك العام بـHTTPS — أو TERBOO_SITE_URL
  host: "127.0.0.1",                    // خلف reverse proxy
  port: 8787,
  trustProxy: true,                     // إن كان خلف proxy
},
```

بلا رابط عام يرد البوت رسالة واضحة («اللعبة تحتاج موقع البوت مفعّلاً») ولا يسقط صامتاً.

### 3.2 الأسرار

كلها في `config.secrets` داخل `config.js`، وتُنشر تلقائياً إلى `process.env` عند التحميل،
ومتغيّر البيئة يتغلّب دائماً. كل قيمة تُسجَّل في مُعتِّم الأسرار فلا تظهر في سجل أو خطأ.

### 3.3 نقل HTML

```js
arcade: {
  html: {
    transport: "off",        // بطاقة HTML غنية داخل الرسالة — مطفأة (تصييرها غير مُثبت)
    nativeTransport: "off",  // Mini App مضمَّن أصلي — مطفأ (القناة الوحيدة تزوّر تحقق Meta)
  },
},
```
```bash
TERBOO_ARCADE_HTML=rich      # يتغلّب على transport
TERBOO_NATIVE_MINIAPP=on     # يتغلّب على nativeTransport — ولا يفعّل شيئاً:
                             # القناة المضمَّنة ترجع "requires-forged-bot-verification"
```

> أسبقية واحدة في كل المشروع: **البيئة تتغلّب على `config.js`**. قيمة الإعداد تُقرأ مرة
> عند التحميل، فلو سبقت البيئة لحجبت أي تغيير لاحق — وهو ما يمنعه هذا الترتيب.
> المفتاحان موجودان ليُفعَّلا بلا تعديل كود إن أتاحت واتساب مساراً مشروعاً،
> والسجل يذكر سبب التعطيل في كل استدعاء بدل الصمت.

---

## 4. التشغيل

```bash
npm start                      # البوت (يشغّل الموقع إن website.enabled)
npm run web                    # الموقع وحده في عملية منفصلة
```

خلف nginx:
```nginx
location / { proxy_pass http://127.0.0.1:8787; proxy_set_header X-Forwarded-For $remote_addr; }
```
> لا تُقدّم `/app/` عبر HTTP في الإنتاج — واتساب يفتح HTTPS فقط، ولا رجوع تلقائياً إلى HTTP.

---

## 5. اختبار النقل

```bash
npm run test:syntax                              # imports وES Modules
node tests/terboo-miniapp-builders.test.mjs      # البنّاؤون × 3 لغات
node tests/terboo-miniapp-transport.test.mjs     # رسالة واحدة · بلا صور · بلا أزرار حركة
node tests/terboo-miniapp-play.test.mjs          # تشغيل فعلي في Chromium
node tools/terboo-native-miniapp-matrix.mjs --check
npm run test:local                               # كل الاختبارات المحلية
```

---

## 6. اختبار الألعاب يدوياً

```bash
TERBOO_WEB_ENABLED=1 TERBOO_WEB_PORT=8787 npm run web
```
ثم افتح:

| الرابط | المتوقع |
|---|---|
| `http://127.0.0.1:8787/app/xo?lang=ar` | لوحة 3×3 · النقر يضع X ويرد الكمبيوتر · 3 مستويات · خط فوز · إعادة |
| `http://127.0.0.1:8787/app/sonic?lang=en` | Canvas يعمل · القفز والانطلاق باللمس · النقاط تتقدم |
| `http://127.0.0.1:8787/arcade` | الكتالوج: الألعاب المستقلة بزر «العب الآن» + ألعاب المحرك |
| `http://127.0.0.1:8787/app/nope` | 404 |

من واتساب: `.سونك` · `.اكس_او_مصغر` ⇒ **رسالة واحدة** ببطاقة وزر رابط واحد.

---

## 7. التوافق مع WhatsApp Android

| البند | الحالة |
|---|---|
| الصفحة تعمل في محرك WebView أندرويد (Chromium 141) | **نجح بالاختبار** |
| فتح الرابط من واتساب أندرويد على جهاز حقيقي | **لم يُختبر** — لا جهاز في بيئة التنفيذ |
| العرض داخل فقاعة الرسالة | **غير منفَّذ** — يتطلب تزوير إثبات تحقق |
| WhatsApp Web / iOS | **لم يُختبر** |

### للتحقق على جهازك

1. اضبط `website.url` على نطاق HTTPS حقيقي وشغّل الموقع.
2. أرسل `.سونك` من حساب البوت إلى هاتفك.
3. تأكد من وصول **رسالة واحدة** فقط بزر واحد.
4. اضغط الزر ⇒ تفتح الصفحة في متصفح واتساب المدمج.
5. اختبر: القفز باللمس · استمرار الانطلاق أثناء الضغط · تقدّم النقاط · إعادة اللعب.
6. في `.اكس_او_مصغر`: النقر على خانة · رد الكمبيوتر · «صعب» لا يُهزم · إعادة الجولة.
7. سجّل إصدار WhatsApp وAndroid مع النتيجة.

---

## 8. إضافة لعبة مستقلة جديدة

ثلاث خطوات، بلا لمس البروتوكول:

```js
// 1) src/lib/miniapps/mygame.js
import { buildDocument, esc, safeLang } from "./_kit.js";
function buildMyGameHtml(lang = "ar", { nonce = "" } = {}) {
  const l = safeLang(lang);
  return buildDocument({ lang: l, title: "…", css: "…", body: "…", js: "…", nonce });
}
export { buildMyGameHtml };
```
```js
// 2) src/lib/terboo-miniapp.js — سطر في MINI_APPS
["mygame", { id: "mygame", icon: "🎲", build: buildMyGameHtml,
  name: { ar: "…", en: "…", es: "…" }, blurb: { ar: "…", en: "…", es: "…" },
  category: "puzzle", height: 640 }],
```
```js
// 3) plugins/game/لعبتي.js — انسخ plugins/game/سونك.js وغيّر الاسم و miniApp
```
استعمل `TK.loop` و`TK.hold` من العُدّة؛ لا تكتب حلقة رسم أو مستمع لمس يدوياً.
`/app/mygame` يعمل فوراً، ويظهر في الكتالوج تلقائياً.
