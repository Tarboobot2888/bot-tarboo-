# TERBOO V6 — الرجوع عن Native Mini Apps

> **لا هجرة بيانات ولا تغيير تبعيات ولا تغيير مخطط قاعدة.** الرجوع = استعادة ملفات + إعادة تشغيل.

---

## 0. احفظ أولاً

```bash
cp -a session/ database/ data/ config.js  /مسار/نسخة-احتياطية/
```
`session/` (جلسة واتساب) و`database/` و`data/` و`config.js` **ليست** جزءاً من هذا التغيير.
فقدها يعني إعادة ربط البوت من الصفر.

---

## 1. إيقاف الميزة بلا رجوع (الأسرع)

| ما تريد إيقافه | كيف | الأثر |
|---|---|---|
| ألعاب Mini App المستقلة | `isEnabled: false` في `plugins/game/سونك.js` و`اكس_او_مصغر.js` | يختفي الأمران؛ بقية البوت كما هي |
| كل مسار الويب | `.موقع إيقاف` أو `website.enabled = false` | الألعاب تردّ رسالة سبب واضحة |
| إخفاؤهما من الكتالوج فقط | احذف السطرين من `MINI_APPS` في `src/lib/terboo-miniapp.js` | الأوامر تردّ `unknown-mini-app` |

لا شيء من هذا يحتاج نشراً.

---

## 2. الرجوع الكامل

```bash
git revert <miniapp-sha>        # أو
git checkout <pre-miniapp-sha> -- \
  src/lib/miniapps src/lib/terboo-miniapp.js \
  plugins/game/سونك.js plugins/game/اكس_او_مصغر.js \
  src/lib/terboo-visual-response.js \
  web/server.js web/api/arcade.js web/public/arcade.js \
  config.example.js TERBOO_NATIVE_MINIAPP_SETUP.md
rm -rf src/lib/miniapps src/lib/terboo-miniapp.js
rm -f plugins/game/سونك.js plugins/game/اكس_او_مصغر.js
rm -f tests/terboo-miniapp-{builders,play,transport,ui,security}.test.mjs
rm -f tools/terboo-native-miniapp-{matrix,test-report}.mjs tools/terboo-miniapp-{matrix,test-report}.mjs
npm ci && npm start
```

> `src/lib/terboo-visual-response.js` يُستعاد لأن وضع العرض `mini-app` فيه يقرأ
> `config.miniApp` من البلوقنين؛ بقاؤه بعد حذفهما لا يضر (لا بلوقن يعلنه) لكن
> استعادته تُعيد المصفوفة المولّدة إلى شكلها السابق بلا فارق عدد.
>
> `config.js` **لا يُستعاد**: مفتاح `arcade.html.nativeTransport` فيه بلا أثر بعد
> الرجوع (لا قارئ له)، واستعادته تمحو أسرار التشغيل.

`npm ci` آمن: `package.json` و`package-lock.json` **لم يتغيرا**.

### تحقّق بعد الرجوع
```bash
npm run test:syntax
node tools/terboo-run-tests.mjs --only arcade
node tools/terboo-visual-matrix.mjs && node tools/terboo-command-ui-matrix.mjs
```
> المصفوفتان المولّدتان تتضمنان الأمرين الجديدين؛ أعد توليدهما بعد الرجوع وإلا فشل
> `terboo-smart-buttons` و`terboo-visual-response` بفارق العدد.

---

## 3. أثر الرجوع

| البند | بعد الرجوع | تدخّل؟ |
|---|---|---|
| `.سونك` · `.اكس_او_مصغر` | يختفيان | لا |
| `/app/<id>` | 404 (SPA fallback) | لا |
| الكتالوج | يعرض ألعاب المحرك فقط | لا |
| ألعاب الأركيد الـ45 | **بلا أثر** | لا |
| صفحة `/play/<token>` | **بلا أثر** | لا |
| سياسة «لا صور للألعاب» | **بلا أثر** (عمل سابق مستقل) | لا |
| التبعيات · قاعدة البيانات · الجلسة | **بلا أثر** | لا |

لا توجد حالة محفوظة للألعاب المستقلة: أفضل نتيجة سونك في `localStorage` على جهاز
اللاعب، ولا تدخل أي ترتيب — فقدانها بلا أثر على النظام.

---

## 4. ما **لا** ترجع عنه

| لا تُرجِع | السبب |
|---|---|
| إصلاح `terboo-arcade-multiplayer` (إيقاف المكنسة + فصل الحلقة عن حدّ الإنتاجية) | يصلح فشلاً متقطّعاً سابقاً لهذا العمل |
| `config.secrets` و`.gitignore` لـ`config.js` | الرجوع يُعيد كشف بيانات اعتماد |
| **إخفاء الأسرار في `guardContentText`** (`src/lib/terboo-wa-compat.js`) | الرجوع يُعيد ثغرة: سر مسجّل داخل نص رسالة صادرة كان يُرسل كما هو إلى المستخدم. مستقل عن الألعاب تماماً، ويغطّيه `tests/terboo-secrets-vault.test.mjs` |
| إزالة backticks من رسالة `plugins/ai/تخيل3.js` + مدخلات الكتالوج | إصلاح مخالفة طبقة تصميم ونقص ترجمة؛ لا علاقة له بالألعاب |
| استثناء `src/lib/miniapps/` في `tools/terboo-i18n-extract.mjs` | الرجوع بلا حذف البنّائين يُعيد 246 إنذاراً كاذباً في `terboo-i18n-runtime` |
| تصنيف `BLOCKED` في `tools/terboo-run-tests.mjs` | يمنع احتساب اختبار لم يفحص شيئاً ضمن الناجح (§19) |
| سياسة «لا صور للألعاب» | عمل سابق مستقل تماماً |
| **لا تُبدّل Baileys إلى الـfork** | يزوّر إثبات تحقق Meta ⇒ خطر حظر الحساب |

---

## 5. إن أردت تجربة المسار المضمَّن رغم ذلك

قرار المالك وحده، وهذه حدوده بوضوح:

- يتطلب `npm:@yudzxml/baileys@7.6.6` بدل الحزمة الرسمية.
- الرسالة ستحمل توقيعاً وشهادات **مزوَّرة** داخل `botForwardedMessage` لتبدو رداً من مساعد Meta.
- **خطر حظر حساب واتساب.** لا يمكن تنفيذه بشكل مشروع، ولم يُنفَّذ هنا.
- حتى لو عُرض، فبيئة الرسالة **بلا شبكة** ⇒ لا تصلح إلا للألعاب المحلية.

الدليل الكامل في `TERBOO_NATIVE_MINIAPP_AUDIT.md` §3.
