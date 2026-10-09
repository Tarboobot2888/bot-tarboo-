# TERBOO V6 — تدقيق خط الأساس قبل ترحيل Mini Apps

> هذا المستند يوصّف المشروع **كما وُجد** في أرشيفات الإدخال، قبل أي تعديل.
> كل سطر فيه مستخرج من الشجرة المدمجة (Part1 + Part2) ومن تشغيل فعلي للكود والاختبارات.
> تاريخ التدقيق: 2026-10-09 · Node v22.22.0 · npm 10.9.4

---

## 1. فهرسة الأرشيفات والدمج

| الأرشيف | سلامة `unzip -t` | مدخلات | ملفات (بلا مجلدات) |
|---|---|---|---|
| `Bot-Terboo-V6-Arcade-Web-Part1.zip` | OK | 1702 | 1619 |
| `Bot-Terboo-V6-Arcade-Web-Part2.zip` | OK | 599 | 571 |
| `Bot-Terboo-V6-Android-HTML-MiniApp-Changed-Files.zip` | OK | 966 | 903 |

**الملف الناقص (لم يُرفَق في جلسة التنفيذ):** `Bot-Terboo-V6-Arcade-Web.zip` (النسخة الكاملة/الأساسية).
لم يُفحَص ولم يُفترَض محتواه. الشجرة المستهدفة أُعيد بناؤها من الجزأين فقط.

**نتيجة الدمج:**
- تقاطع المسارات بين Part1 و Part2 = **366 ملفاً**.
- جميع الـ366 **متطابقة بايت ببايت** (`cmp -s` ⇒ 366 identical / 0 differing) ⇒ الدمج غير غامض، ولا يوجد أي ملف متعارض يحتاج ترجيحاً.
- شجرة المصدر الموحدة = 1619 + 205 (خاص بـPart2) = **1824 ملفاً**.
- Part1 يحمل `src/`, `plugins/`, `web/`, `assets/`, `data/`… و Part2 يحمل غالبية `tests/` (205 ملفاً فريداً، معظمها `tests/*.test.mjs`).
- `node_modules/` غير موجود في أي أرشيف (0 مطابقة) ⇒ التثبيت من `package-lock.json`.
- أسماء الملفات العربية سليمة UTF-8 بعد الفك (0 أسماء غير قابلة للترميز)، وتمت المحافظة عليها كما هي.

**حزمة `Changed-Files` المرجعية** تحتوي مجلدين:
- `terboo_changed/` (880 ملفاً) — لقطة واسعة.
- `terboo_patch_curated/` (21 ملفاً + فهرس) — الرقعة الفعلية، وهي **أحدث** من خط الأساس (كل الـ18 ملفاً المشتركة تختلف، و3 ملفات جديدة).

---

## 2. القرار الحاسم: لماذا لا تُنسخ الرقعة المرجعية كما هي

الرقعة المرجعية تبني تجربة Mini App عبر `sendHtmlApp`. فحصتُ هذا الادّعاء مباشرة، ونتيجته أن المسار **غير قابل للاعتماد** لثلاثة أسباب مُثبتة:

### 2.1 استبدال مكتبة واتساب بـfork طرف ثالث
`terboo_patch_curated/.../package.json` يغيّر:
```diff
- "@whiskeysockets/baileys": "7.0.0-rc14"
+ "@whiskeysockets/baileys": "npm:@yudzxml/baileys@7.6.6"
```
أي استبدال مكتبة البروتوكول الرسمية بـfork غير مُراجَع، فقط للحصول على `sendHtmlApp`.
هذا تغيير سلسلة توريد في أكثر مكوّن حساس في البوت (جلسات واتساب ومفاتيح التشفير).
**القرار:** يُرفض. تبقى `@whiskeysockets/baileys@7.0.0-rc14` كما في خط الأساس.

### 2.2 `sendHtmlApp` غير موجود في المكتبة الرسمية — مُثبت بالتشغيل
```
version: 7.0.0-rc14
sendHtmlApp export: undefined
```

### 2.3 حقول `url` / `trustedSources` / `height` ليست حقول بروتوكول — مُثبت بالتشغيل
`relayHtmlMiniApp` المرجعي يمرّر `{url, trustedSources, height}`. فحص round-trip على نفس المكتبة:
```
trustedSources: survived roundtrip = null
url:            survived roundtrip = null
height:         survived roundtrip = null
htmlApp:        survived roundtrip = null
```
أي أن هذه الحقول **تُحذف بصمت** على السلك. الاعتماد عليها لتأمين المصدر أو ضبط الارتفاع وهمٌ تام.

### 2.4 الرقعة المرجعية تتجاوز مدقق الأمان الخاص بالمشروع
`buildEmbeddedGameHtml` يولّد `<iframe …>`، و`FORBIDDEN_TAGS` في نفس الملف المرجعي **لا يزال يمنع `iframe`** (السطر 45).
لكن `relayHtmlMiniApp` لا يستدعي `validateTemplate` إطلاقاً عند الاستدعاء من `whatsapp.js` ⇒ يُرسل HTML يمنعه مدقّق المشروع نفسه.

### 2.5 ما **نجح** فعلاً في فحص النقل
`richResponseMessage.unifiedResponse.data` موجود فعلاً في المكتبة الرسمية ويحمل HTML دون فقدان:
```
Message.fromObject: function | encode: function | decode: function
carried bytes: 365 / orig: 365      encoded bytes: 422
roundtrip response_id match: true   roundtrip html match: true
```
**لكن:** نجاح الترميز ≠ عرض العميل. `richResponseMessage` هو عنصر ردّ لمساعد Meta AI؛ لا يوجد أي دليل في هذا المشروع أو في المكتبة أن حساباً عادياً يستطيع جعل WhatsApp Android يصيّره، ولا قناة ترجع نقرة من داخله إلى الخادم. و`ACTION_BRIDGE.enabled = false` في خط الأساس يعترف بذلك صراحة.

**⇒ قرار النقل (المادة 12.4):** تُبنى **Mini App ويب حقيقية** على رابط موقّع ومنتهي الصلاحية، ورسالة واتساب تكون مُطلِقاً (launcher) لها. حمولة HTML المضمّنة تبقى **اختيارية ومطفأة افتراضياً وموصوفة كغير مُثبتة**، لا تُسمّى تفاعلية.

---

## 3. عِلّة حاسمة في خط الأساس: كل بطاقات الألعاب تسقط إلى نص عادي

هذه أهم نتيجة في التدقيق، وهي تفسّر 3 اختبارات فاشلة.

**السلسلة:**
1. `terboo-game-design-system.js:103` يصدر CSS يحتوي `scroll-behavior:auto!important` (داخل `prefers-reduced-motion`).
2. `terboo-html-game.js:65` يفحص `/@import|expression\s*\(|behavior\s*:/i` ⇒ **`behavior:` تطابق كسلسلة فرعية من `scroll-behavior:`**.
3. ⇒ `validateTemplate(html).ok === false` مع `errors: ['css-injection']` لكل بطاقة لعبة (مُثبت بالتشغيل، 15260 بايت).
4. ⇒ `validateVisualResponse` يضيف `html:css-injection`.
5. ⇒ `deliverVisual` يسقط إلى `m.reply(text)` فقط.

**الأثر الفعلي:** كل لعبة أركيد ترسل **نصاً عارياً بلا أزرار حركة وبلا رابط Mini App**. أي أن تجربة اللعب في خط الأساس مكسورة من أصلها، لا «ناقصة تجميلاً».

الدليل من تشغيل الاختبارات:
```
[visual-response] html:css-injection · stage=arcade:xo · fallback=text · where=terboo-visual-response:deliver
❌ AssertionError: زر «العب تفاعلياً» في الخاص        (terboo-web-arcade.test.mjs:159)
❌ AssertionError: زر انضمام حقيقي                    (terboo-arcade-multiplayer.test.mjs:87)
```

---

## 4. خط أساس الاختبارات (تشغيل فعلي قبل أي تعديل)

`node tools/terboo-run-tests.mjs` ⇒ **103/121 نجح · 18 فشل · 3 اختبارات live لم تُشغَّل**

الفاشلة (18): `terboo-ai-core-v4`, `terboo-ai-matrix`, `terboo-arcade-html`, `terboo-arcade-multiplayer`,
`terboo-baileys-migration`, `terboo-brand-lock`, `terboo-channel-forward`, `terboo-code-card`, `terboo-design`,
`terboo-group-ai-reports`, `terboo-i18n-runtime`, `terboo-integrity`, `terboo-menus`, `terboo-scraper-ai-e2e`,
`terboo-secrets-vault`, `terboo-typography`, `terboo-visual-response`, `terboo-web-arcade`.

تحليل الفاشلة المرتبطة بالألعاب:

| الاختبار | السبب الجذري | التصنيف |
|---|---|---|
| `terboo-web-arcade` | علة §3 — لا أزرار ولا رابط لأن التسليم سقط لنص | **علة حقيقية** |
| `terboo-arcade-multiplayer` | علة §3 — نفس السبب | **علة حقيقية** |
| `terboo-visual-response` | اختبار متقادم: يتوقع `ثعبان_وسلم` = `hybrid` لكنه رُحّل إلى عقد أركيد ⇒ `html` | **اختبار متقادم** |
| `terboo-arcade-html` | إنذار كاذب في regex الاختبار: `/<[^>]*\son\w+=/` يطابق ` onerror=` **داخل قيمة سمة مُهرَّبة** (`aria-label="&lt;img … onerror=…&gt;"`). الهروب سليم فعلياً | **اختبار خاطئ** |

الاختبارات الـ14 الفاشلة الأخرى لا تمس مسارات الألعاب (AI, branding, typography, secrets, menus…) وهي **فاشلة قبل تعديلي** — تُسجَّل كخط أساس ولا تُحسَب عليّ.

---

## 5. حصر الألعاب الفعلية

`plugins/game/` يحتوي **55 ملفاً**. التصنيف الآلي:

- **23** واجهة رقيقة على محرك الأركيد (`quickCommand` + `config.game`).
- **22** لعبة أسئلة قديمة على `games.register` + `games.createPlugin`.
- **10** أخرى: 1 موزّع أوامر (`اركيد.js`) + 4 أوامر ليلية تابعة للمستذئب (`حماية/فحص/كشف/قتل` ⇒ كلها تستدعي `nightActionHandler` من `مستذئب.js`) + 5 ألعاب قديمة مستقلة.

عدد الألعاب المتمايزة فعلاً = **23 أركيد + 22 أسئلة + 5 قديمة مستقلة = 50 لعبة**.

### 5.1 عقود الأركيد (23) — مستخرجة بتشغيل `loadArcade()`

| gameId | الاسم العربي | ملف القواعد | نوع | mode | uiMode | فردي/AI | مجموعة | إدخال حالي | ترسل صوراً؟ | Mini App المطلوب | حالة الهجرة | اختبارات |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `xo` | إكس أو | `games/xo.js` | board | pvp | html | AI+solo | نعم | أزرار/رقم 1–9 | **لا** | شبكة X/O حيّة | موجود جزئياً (مكسور §3) | arcade-engine/games/multiplayer |
| `connect4` | أربعة في صف | `games/connect4.js` | board | pvp | html | AI+solo | نعم | أزرار أعمدة | **لا** | أقراص تسقط | موجود جزئياً | arcade-games |
| `checkers` | الداما | `games/checkers.js` | board | pvp | html | AI+solo | نعم | أزرار/قائمة | **لا** | قطع داما | موجود جزئياً | arcade-games |
| `reversi` | أوثيلو | `games/reversi.js` | board | pvp | html | AI+solo | نعم | أزرار | **لا** | قلب الأقراص | موجود جزئياً | arcade-games |
| `gomoku` | خمسة في صف | `games/gomoku.js` | board | pvp | html | AI+solo | نعم | أزرار/قائمة | **لا** | شبكة كبيرة | موجود جزئياً | arcade-games |
| `battleship` | معركة السفن | `games/battleship.js` | board | pvp | **hybrid** | AI+solo | نعم | قائمة إحداثيات | **لا** | شبكتان + سرية | يحتاج ترحيل | arcade-multiplayer |
| `dotsboxes` | نقط ومربعات | `games/dotsboxes.js` | puzzle | pvp | html | AI+solo | نعم | أزرار حدود | **لا** | حدود ومربعات | موجود جزئياً | arcade-games |
| `memory` | ذاكرة البطاقات | `games/memory.js` | puzzle | pvp | html | AI+solo | نعم | أزرار بطاقات | **لا** | بطاقات تقلب | موجود جزئياً | arcade-games |
| `minesweeper` | كاشف الألغام | `games/minesweeper.js` | puzzle | solo | html | solo | نعم | أزرار/علم | **لا** | خلايا + وضع علم | موجود جزئياً | arcade-games |
| `g2048` | 2048 | `games/g2048.js` | puzzle | solo | html | solo | نعم | 4 اتجاهات | **لا** | بلاطات تنزلق | موجود جزئياً | arcade-games |
| `snake` | الثعبان الذهبي | `games/snake.js` | arcade | solo | html | solo | نعم | اتجاه حيّ | **لا** | حلقة حيّة | موجود جزئياً | arcade-games |
| `breakout` | تحطيم الطوب | `games/breakout.js` | arcade | solo | html | solo | نعم | مضرب حيّ | **لا** | ساحة حيّة | موجود جزئياً | arcade-games |
| `snakes` | ثعبان وسلم | `games/snakes.js` | board | pvp | **hybrid** | AI+solo | نعم | زر نرد | **لا** (لكن `drawBoard` canvas موجود) | مسار + بيادق | يحتاج ترحيل | arcade-games |
| `sudoku` | سودوكو | `games/sudoku.js` | puzzle | solo | html | solo | نعم | `set` حر | **لا** | شبكة 9×9 | موجود جزئياً | arcade-games |
| `simon` | سايمون | `games/simon.js` | arcade | solo | **buttons** | solo | نعم | أزرار ألوان | **لا** | 4 أرباع مضيئة | يحتاج ترحيل | arcade-games |
| `rps` | حجرة ورقة مقص | `games/rps.js` | party | pvp | **buttons** | AI+solo | نعم | أزرار سرية (خاص) | **لا** | اختيار سري | يحتاج ترحيل | arcade-games |
| `hangman` | الرجل المشنوق | `games/hangman.js` | word | solo | **buttons** | solo | نعم | حروف + `word` حر | **لا** | مشنقة SVG | يحتاج ترحيل | arcade-games |
| `wordle_ar` | وردل عربي | `games/wordle_ar.js` | word | solo | **hybrid** | solo | نعم | `guess` حر | **لا** (حقل `image` = شبكة View Model، لا صورة) | شبكة تلوين | يحتاج ترحيل | arcade-games |
| `bulls_cows` | بولز آند كاوز | `games/bulls_cows.js` | puzzle | pvp | **text** | AI+solo | نعم | `guess` حر | **لا** | لوحة محاولات | يحتاج ترحيل | arcade-games |
| `letter_rush` | سباق الحروف | `games/letter_rush.js` | word | party | **text** | لا | نعم | `word` حر | **لا** | سباق + مؤقت | يحتاج ترحيل | arcade-games |
| `math_duel` | مبارزة الحساب | `games/math_duel.js` | puzzle | party | **buttons** | لا | نعم | أزرار إجابات | **لا** | بطاقة مسألة | يحتاج ترحيل | arcade-games |
| `trivia_arena` | ساحة المعلومات | `games/trivia_arena.js` | quiz | party | **buttons** | لا | نعم | أزرار خيارات | **لا** | بطاقة سؤال | يحتاج ترحيل | arcade-games |
| `geo_battle` | معركة الجغرافيا | `games/geo_battle.js` | quiz | party | **buttons** | لا | نعم | أزرار خيارات | **لا** | خريطة/علم CSS | يحتاج ترحيل | arcade-games |

### 5.2 ألعاب الأسئلة القديمة (22) — على `games.register`

كلها تمر من `terboo-games.js::sendQuizCard` ⇒ **كلها معرّضة لمسار إرسال صورة** (§6).
ستة منها `hasImage: true` وترسل صورة السؤال فعلياً كرسالة واتساب.

| اللعبة | alias | ملف البيانات | hasImage | Mini App المطلوب |
|---|---|---|---|---|
| `خمن_الصورة` | tebakgambar | tebakgambar.json (1000) | **نعم** | صورة داخل الصفحة + إدخال |
| `خمن_العلم` | tebakbendera | tebakbendera2.json (171) | **نعم** | علم داخل الصفحة |
| `خمن_الدراما` | tebakdrakor | tebakdrakor.json | **نعم** | صورة داخل الصفحة |
| `خمن_الشخصية` | tebakepep | tebakepep.json | **نعم** | صورة داخل الصفحة |
| `خمن_الطعام` | tebakmakanan | tebakmakanan.json | **نعم** | صورة داخل الصفحة |
| `خمن_العضوة` | tebakjkt48 | tebakjkt48.json | **نعم** | صورة داخل الصفحة |
| `أسئلة_ذكاء` | asahotak | أسئلة_ذكاء.json | لا | بطاقة سؤال نصي |
| `ألغاز` | tekateki | tekateki.json | لا | بطاقة سؤال نصي |
| `لغز` | riddle | riddle.json (50) | لا | بطاقة سؤال نصي |
| `فوازير` | tebaktebakan | tebaktebakan.json | لا | بطاقة سؤال نصي |
| `من_أنا` | siapakahaku | siapakahaku.json | لا | بطاقة سؤال نصي |
| `رتب_الكلمة` | susunkata | susunkata.json (356) | لا | ترتيب حروف |
| `كلمة_عشوائية` | kataacak | — | لا | ترتيب حروف |
| `خمن_الكلمة` | tebakkata | tebakkata.json | لا | بطاقة سؤال نصي |
| `خمن_الكلمات` | tebaklirik | tebaklirik.json | لا | بطاقة سؤال نصي |
| `خمن_المثل` | tebakkalimat | tebakkalimat.json | لا | بطاقة سؤال نصي |
| `خمن_الأغنية` | tebaklagu | tebaklagu.json | لا | بطاقة سؤال نصي |
| `خمن_الفيلم` | tebakfilm | tebakfilm.json | لا | بطاقة سؤال نصي |
| `خمن_الحيوان` | tebakhewan | tebakhewan.json | لا | بطاقة سؤال نصي |
| `خمن_الدولة` | tebaknegara | tebaknegara.json | لا | بطاقة سؤال نصي |
| `خمن_المهنة` | tebakprofesi | tebakprofesi.json | لا | بطاقة سؤال نصي |
| `خمن_العنصر` | tebakkimia | tebakkimia.json (125) | لا | بطاقة سؤال نصي |

### 5.3 ألعاب قديمة مستقلة (5) + تابعات

| اللعبة | الملف | الحجم | المحرك | ملاحظة |
|---|---|---|---|---|
| `مستذئب` | `plugins/game/مستذئب.js` | 27 KB | منطق خاص + `choiceCard` | 4 أوامر ليلية تابعة: `قتل` `كشف` `فحص_عراف` `حماية` ⇒ كلها `nightActionHandler` |
| `mct` (ماينكرافت) | `plugins/game/ماينكرافت.js` | 39 KB | منطق خاص + `choiceCard` | أكبر ملف لعبة |
| `fisht` | `plugins/game/fish.js` | 32 KB | `terboo-fisch.js` | اقتصاد/صيد |
| `دنجن` | `plugins/game/دنجن.js` | 14 KB | منطق خاص + `choiceCard` | استكشاف |
| `نينجا` | `plugins/game/نينجا.js` | 13 KB | منطق خاص | RPG |

---

## 6. خريطة مسارات الصور في الألعاب (المسح الكامل)

لم أكتفِ بالبحث عن كلمة `image`؛ تتبّعت دوال الإرسال العامة والـfallbacks.

### 6.1 مسارات ترسل صورة فعلاً — يجب إزالتها

| # | الموقع | السطر | الوصف |
|---|---|---|---|
| 1 | `src/lib/terboo-games.js` | **111** | `image: !htmlResult.relayed && imageBuffer ? {...} : null` — **مسار الرجوع إلى صورة** عند فشل HTML. هذا هو الـimage fallback الممنوع نصّاً. |
| 2 | `src/lib/terboo-games.js` | 52–72 | `inlineQuizImage()` — يضغط الصورة بـ`sharp` ويضمّنها Base64 داخل HTML الرسالة (حد 23 KB). |
| 3 | `src/lib/terboo-games.js` | 229–248 | `if (cfg.hasImage && fetchBuffer) { imageBuffer = await fetchBuffer(...) }` — تنزيل صورة السؤال لإرسالها. |
| 4 | `src/lib/terboo-html-game.js` | 204, 226 | `buildTextGameHtml({imageDataUrl})` ⇒ `inlineImageDataUrl` في القالب. |
| 5 | `src/lib/terboo-game-design-system.js` | 62 | `.ta-asset-image{...}` — تنسيق صورة اللوحة/الأصل داخل بطاقة اللعبة. |
| 6 | `src/lib/terboo-game-ulartangga.js` | 1, 43–69 | `drawBoard()` على `@napi-rs/canvas` + `loadImage` ⇒ **مولّد صورة لوحة**. `PLAYER_IMAGES`, `DICE_STICKERS`. |
| 7 | `src/lib/terboo-visual-response.js` | 124, 154 | عقد `VisualResponse` يقبل `image` ويمرّره إلى `sendCard` — قناة عامة **بلا أي حارس يمنع الألعاب** من استخدامها. |

### 6.2 مطابقات ليست صوراً — تصنيف صريح

| الموقع | السبب |
|---|---|
| `src/lib/terboo-arcade/games/wordle_ar.js:86` | `image: {kind:"grid", cols, cells}` هو **View Model منظَّم** يُصيَّر كعناصر DOM في `play.js:335` و`terboo-html-game.js:160`. تسمية مضلّلة فقط، لا بكسل. **سيُعاد تسميته** لإزالة الغموض وجعل حارس الصور ذا معنى. |
| `src/lib/terboo-arcade/contract.js:134` | `assets: cfg.hasImage ? {image: cfg.imageField} : {}` — **بيانات وصفية** (اسم الحقل في JSON)، لا تُرسل. |
| `plugins/game/*` (55 ملفاً) | **0 مطابقة** لأي من `image:` / `imageMessage` / `sendImage` / `toBuffer(` / `createCanvas` / `sticker:` / `thumbnail`. الإضافات أغلفة رقيقة؛ كل الصور تأتي من `terboo-games.js`. |
| `src/lib/terboo-arcade/**` | **0 مطابقة** لأي مولّد صور (عدا تسمية wordle أعلاه). محرك الأركيد نظيف أصلاً. |

### 6.3 ما لا يجوز لمسه (صور غير مرتبطة بالألعاب)

يجب أن يبقى دعم الصور كاملاً في: الملصقات (`sticker`), التنزيلات (`download`/`downloader`), البطاقات (`canvas`/`maker`), صور الترحيب/الوداع, أوامر `image`, و`MEDIA_CATEGORIES` في `terboo-visual-response.js:24`. عَزل التغيير في مسارات الألعاب فقط.

---

## 7. الفروق الأربعة التي يخلطها كثيرون — كما تعمل فعلاً في هذا المشروع

| المفهوم | كيف يتحقق هنا فعلاً | الحالة في خط الأساس |
|---|---|---|
| **بطاقة HTML للعرض فقط** | `buildGameHtml` ⇒ `encodeTransport` ⇒ `richResponseMessage`. تصيير العميل غير مُثبت، ولا قناة لعودة النقرة. | مبنيّة لكن **تسقط دائماً** بسبب `css-injection` (§3) |
| **صفحة لعب ويب تفاعلية** | `/play/<token>` ⇒ `web/public/play.{html,css,js}` (807 سطر JS) ⇒ `POST /api/v1/arcade/s/<token>/action` ⇒ `engine.applyAction`. | **البنية موجودة وجيدة**؛ لكن الرابط لا يصل للمستخدم (§3) |
| **رسالة واتساب تفاعلية** | `nativeFlow` من `terboo-interactive-builder.js` ⇒ أزرار تحمل `.اركيد a <room> <nonce> <index>`. | يعمل منطقياً، لكنه يُحجب بسقوط التسليم (§3) |
| **Mini App كاملة** | صفحة لعب + كتالوج + جلسة موقّعة + حالة خادمية + إعادة مباراة. | **ناقصة**: لا كتالوج Mini Apps، ولا ألعاب الأسئلة الـ22 ولا الألعاب القديمة الـ5 داخل Mini App |

---

## 8. موانع التفاعل الحالية (فحص مباشر)

| المانع | الموقع | التفاصيل |
|---|---|---|
| **علة `css-injection`** | `terboo-html-game.js:65` | أخطر مانع — يُسقط كل بطاقات الألعاب (§3) |
| مدقق HTML يمنع التفاعل | `terboo-html-game.js:45–67` | `FORBIDDEN_TAGS` تمنع `script, iframe, form, input, select, textarea, audio, video…` + `event-handler-attribute` + `external-resource`. ⇒ **لا JavaScript ولا حقول إدخال داخل HTML الرسالة إطلاقاً** |
| `ACTION_BRIDGE.enabled = false` | `terboo-html-game.js:32–36` | `reason: "no-proven-client-channel"` — إقرار صريح بعدم وجود قناة |
| إصدار Baileys | `package.json` | `7.0.0-rc14`: لا `sendHtmlApp`؛ `Message.verify` غير موجود (`undefined`) ⇒ `protoMessage` يعتمد `fromObject` |
| حد الحجم | `terboo-html-game.js:19` | `MAX_HTML_BYTES = 64 KB` |
| الكتالوج | — | لا توجد صفحة كتالوج Mini Apps ولا أمر لها |
| `web/public/index.html` | 14 سطراً | هيكل شبه فارغ |

---

## 9. الاختبارات الموجودة ذات الصلة

| الاختبار | يغطي | الحالة |
|---|---|---|
| `terboo-arcade-engine.test.mjs` | المحرك، الـnonce، الصلاحيات | ✓ ناجح |
| `terboo-arcade-games.test.mjs` | عقود الألعاب | ✓ ناجح |
| `terboo-arcade-ai.test.mjs` | مستويات الخصم الآلي | ✓ ناجح |
| `terboo-arcade-performance.test.mjs` | الأداء/التزامن | ✓ ناجح |
| `terboo-transport.test.mjs` | النقل | ✓ ناجح |
| `terboo-arcade-html.test.mjs` | بناء/تدقيق HTML | ✗ regex خاطئ (§4) |
| `terboo-arcade-multiplayer.test.mjs` | لعب جماعي | ✗ علة §3 |
| `terboo-web-arcade.test.mjs` | روابط اللعب + API | ✗ علة §3 |
| `terboo-visual-response.test.mjs` | مصفوفة العرض | ✗ متقادم (§4) |
| **لا يوجد** | **حارس يمنع إرسال صور الألعاب** | **ناقص تماماً — سيُضاف** |
| **لا يوجد** | تجاوب 320/360/412px, RTL/LTR | **ناقص — سيُضاف** |
| **لا يوجد** | nonce قديم/مكرر/token منتهي على مستوى API | جزئي في `terboo-web-arcade` |

---

## 10. خطة التغيير: ما يُلمس وما لا يُلمس

### يُعدَّل
`src/lib/terboo-html-game.js` · `src/lib/terboo-games.js` · `src/lib/terboo-visual-response.js` ·
`src/lib/terboo-game-design-system.js` · `src/lib/terboo-game-ulartangga.js` ·
`src/lib/terboo-arcade/{whatsapp,render,web,games/wordle_ar}.js` ·
`web/{server.js,api/arcade.js,api/index.js}` · `web/public/{play.js,play.css,index.html,app.js}` ·
`tests/terboo-{arcade-html,visual-response}.test.mjs` (إصلاح تقادم/إنذار كاذب)

### يُضاف
وحدة عقد أسئلة موحّدة · وكيل أصول موقّع للصور داخل الصفحة · كتالوج Mini Apps (صفحة + أمر) ·
حُرّاس صور آلية · اختبارات تجاوب/أمان API · 5 مستندات.

### لا يُلمس (ولا يُكسر)
`package.json` / `package-lock.json` (**تبقى Baileys الرسمية**) · كل `plugins/` غير فئة `game` ·
التنزيلات والملصقات والذكاء والإدارة · `src/handler.js` إلا بأدنى حد · قاعدة البيانات والمكافآت والـ`repository`.

### أثر التغيير على بقية البوت
إصلاح `behavior:` في المدقّق يؤثر على كل مستخدمي `validateTemplate` — وهو إصلاح يوسّع القبول لحالة سليمة فقط (`-behavior:`) ولا يضعف أي منع آخر.
حارس صور الألعاب في `terboo-visual-response.js` يُقيَّد بمعرّفات بطاقات الألعاب حتى لا يمس `media` أو `download`.
