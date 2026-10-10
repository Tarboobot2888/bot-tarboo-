# TERBOO — الرجوع عن تغييرات ألعاب Mini Apps

> **لا هجرة بيانات · لا تغيير اعتماديات · لا تغيير مخطط قاعدة · لا مساس بالجلسة.**
> الرجوع = استعادة ملفات وإعادة تشغيل.

## 0. احفظ أولاً

```bash
cp -a session/ database/ data/ config.js  /مسار/نسخة-احتياطية/
```

هذه الأربعة **ليست** جزءاً من هذا التغيير. `config.js` لم يُلمس في هذا العمل
أصلاً، وفقدان `session/` يعني إعادة ربط البوت من الصفر.

## 1. إيقاف بلا رجوع (الأسرع)

| ما تريد إيقافه | كيف | الأثر |
|---|---|---|
| النقل المضمَّن | لا شيء — **مطفأ افتراضياً** | الأوامر تردّ سبباً نصياً |
| لعبة واحدة | `isEnabled: false` في بلوقنها | يختفي أمرها وحده |
| الخمسة كلها | احذف أسطرها من `MINI_APPS` في `src/lib/terboo-miniapp.js` | الأوامر تردّ `unknown-mini-app` |
| استعادة سلوك الرابط القديم | `TERBOO_MINIAPP_WEB_LINK=on` | بطاقة برابط صفحة اللعب (ليست Mini App) |

لا شيء من هذا يحتاج نشراً ولا إعادة بناء.

## 2. الرجوع الكامل

```bash
git revert <sha>            # أو استعادة انتقائية:
git checkout <pre-sha> -- \
  src/lib/terboo-miniapp.js \
  src/lib/miniapps/_kit.js src/lib/miniapps/sonic-runner.js src/lib/miniapps/xo.js \
  tools/terboo-i18n-extract.mjs config.example.js \
  src/lib/terboo-i18n/catalog/en.json src/lib/terboo-i18n/catalog/es.json

rm -f src/lib/terboo-miniapp-transport.js src/lib/terboo-webview-budget.js
rm -f src/lib/miniapps/snake.js src/lib/miniapps/memory.js src/lib/miniapps/n2048.js
rm -f plugins/game/ثعبان_مصغر.js plugins/game/ذاكرة_مصغرة.js plugins/game/٢٠٤٨.js
rm -f tests/terboo-web-unchanged.test.mjs tools/terboo-web-manifest.mjs
rm -f tools/terboo-game-miniapp-matrix.mjs TERBOO_GAME_MINIAPP_MATRIX.md

npm ci && npm start
```

`npm ci` آمن: `package.json` و`package-lock.json` **لم يتغيرا**.

### تحقّق بعد الرجوع

```bash
npm run test:syntax
node tools/terboo-visual-matrix.mjs && node tools/terboo-command-ui-matrix.mjs
node tools/terboo-native-miniapp-matrix.mjs
```

> المصفوفات المولّدة تتضمن الأوامر الثلاثة الجديدة؛ أعد توليدها بعد الرجوع وإلا
> فشل `terboo-smart-buttons` و`terboo-visual-response` بفارق العدد.

## 3. أثر الرجوع

| البند | بعد الرجوع | تدخّل؟ |
|---|---|---|
| الأوامر الخمسة | تختفي الثلاثة الجديدة · ويعود سونك و XO لبطاقة الرابط | لا |
| ألعاب الأركيد | **بلا أثر** | لا |
| صفحة `/play/<token>` و`/app/<id>` | **بلا أثر** — `web/` لم يُلمس | لا |
| سياسة «لا صور للألعاب» | **بلا أثر** | لا |
| الاعتماديات · قاعدة البيانات · الجلسة · `config.js` | **بلا أثر** | لا |
| رسائل البوت العامة | **بلا أثر** — النقل لم يُستعمل خارج الألعاب | لا |

لا حالة محفوظة للألعاب الخمس: كلها في الذاكرة وعمرها عمر الفقاعة، ولا تدخل
ترتيباً ولا تمنح مكافأة. فقدانها بلا أثر على النظام.

## 4. ما **لا** ترجع عنه

| لا تُرجِع | السبب |
|---|---|
| إزالة `localStorage` من البنّائين | يُعيد ميزة ميتة: الواجهة ترمي `SecurityError` في المحيط المستهدف |
| إزالة `aspect-ratio` | يُعيد ارتجاف البطاقة لأن الارتفاع يطارد العرض |
| `src/lib/terboo-webview-budget.js` | الرجوع يُلغي الحارس الذي يمنع إرسال حمولة يُسقطها العميل صمتاً |
| حارس `WEB_FILES_UNCHANGED` | الرجوع يُلغي إثبات أن نطاق المهمة محترم |
| إصلاح الصندوق السطري في `memory` | خطأ CSS حقيقي (padding مئوي على `span`) |
| **لا تثبّت `@yudzxml/baileys`** | تلفيق إثبات تحقق Meta ⇒ خطر حظر حساب واتساب |

## 5. إن أردت المسار المضمَّن رغم كل شيء

- **لا** تثبّت مكتبة تُصدر `signature` أو `certificateChain` من عندها.
- الطريق الوحيد المشروع: `TERBOO_NATIVE_MINIAPP=on` واختبار العرض على جهاز حقيقي
  (`TERBOO_GAME_MINIAPP_SETUP.md` §4). الحمولة المرسلة بلا بيانات تحقق إطلاقاً.
- إن لم يعرضها العميل، فالقيد نهائي اليوم: لا يوجد مسار مشروع، ولا يُصطنع واحد.
