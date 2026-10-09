# TERBOO MINI APPS — مصفوفة الألعاب

> **ملف مولّد.** لا تُحرّره يدوياً — شغّل `node tools/terboo-miniapp-matrix.mjs`.
> كل خلية مستخرجة من العقد الفعلي في السجل أو من ملفات المصدر.

## الملخص

| المقياس | القيمة |
|---|---|
| إجمالي الألعاب في السجل | **45** |
| عقود أركيد أصلية | 23 |
| ألعاب أسئلة قديمة مُرحَّلة | 22 |
| ألعاب **كانت** ترسل صورة | 6 |
| ألعاب ترسل صورة الآن | **0** |
| تدعم خصماً آلياً | 11 |
| تُلعب فردياً | 19 |
| تدعم المجموعات | 45 |
| حسب الفئة | ألواح: 7 · حركة: 3 · ألغاز: 7 · أسئلة: 24 · كلمات: 3 · جماعية: 1 |

ترحيل ألعاب الأسئلة القديمة: **22 نجحت · 0 تُخطّيت**

## المصفوفة

| # | gameId | الاسم العربي | ملف القواعد | البلوقن | الأمر | aliases | الفئة | النمط | لاعبون | فردي | AI | مجموعة | خاص | الإدخال | كانت ترسل صورة؟ | ترسل صورة الآن؟ | Mini App | الاختبارات |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `battleship` | 🚢 معركة السفن | `src/lib/terboo-arcade/games/battleship.js` | `معركة_السفن.js` | `.سفن` | 6 | ألواح | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 150ث | image-policy · miniapp-ui · arcade-games |
| 2 | `breakout` | 🧱 تحطيم الطوب | `src/lib/terboo-arcade/games/breakout.js` | `تحطيم_الطوب.js` | `.طوب` | 6 | حركة | فردي | 1–1 | ✅ | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 3 | `bulls_cows` | 🐂 بولز آند كاوز | `src/lib/terboo-arcade/games/bulls_cows.js` | `بولز.js` | `.بولز` | 7 | ألغاز | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | نص حر + كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 4 | `checkers` | ⚫ الداما | `src/lib/terboo-arcade/games/checkers.js` | `داما.js` | `.داما` | 5 | ألواح | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 180ث | image-policy · miniapp-ui · arcade-games |
| 5 | `connect4` | 🔴 أربعة في صف | `src/lib/terboo-arcade/games/connect4.js` | `اربعة_في_صف.js` | `.اربعة` | 8 | ألواح | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 6 | `dotsboxes` | ⬛ نقط ومربعات | `src/lib/terboo-arcade/games/dotsboxes.js` | `نقط_ومربعات.js` | `.نقط` | 6 | ألغاز | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 7 | `g2048` | 🔢 2048 | `src/lib/terboo-arcade/games/g2048.js` | `الفين.js` | `.الفين` | 4 | ألغاز | فردي | 1–1 | ✅ | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 8 | `geo_battle` | 🌍 معركة الجغرافيا | `src/lib/terboo-arcade/games/geo_battle.js` | `معركة_الجغرافيا.js` | `.جغرافيا` | 8 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 30ث | image-policy · miniapp-ui · arcade-games |
| 9 | `gomoku` | ⚪ خمسة في صف | `src/lib/terboo-arcade/games/gomoku.js` | `خمسة_في_صف.js` | `.خمسة` | 6 | ألواح | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 150ث | image-policy · miniapp-ui · arcade-games |
| 10 | `hangman` | 🪢 الرجل المشنوق | `src/lib/terboo-arcade/games/hangman.js` | `المشنوق.js` | `.مشنوق` | 5 | كلمات | فردي | 1–1 | ✅ | — | ✅ | ✅ | نص حر + كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 11 | `letter_rush` | 🔤 سباق الحروف | `src/lib/terboo-arcade/games/letter_rush.js` | `سباق_الحروف.js` | `.حروف` | 6 | كلمات | جماعي | 1–12 | — | — | ✅ | ✅ | نص حر + كتابة | لا | **لا** | ✅ 45ث | image-policy · miniapp-ui · arcade-games |
| 12 | `math_duel` | ➗ مبارزة الحساب | `src/lib/terboo-arcade/games/math_duel.js` | `مبارزة_الحساب.js` | `.حساب` | 6 | ألغاز | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 20ث | image-policy · miniapp-ui · arcade-games |
| 13 | `memory` | 🃏 ذاكرة البطاقات | `src/lib/terboo-arcade/games/memory.js` | `ذاكرة_البطاقات.js` | `.ذاكرة` | 6 | ألغاز | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 90ث | image-policy · miniapp-ui · arcade-games |
| 14 | `minesweeper` | 💣 كاشف الألغام | `src/lib/terboo-arcade/games/minesweeper.js` | `كاشف_الالغام.js` | `.الغام` | 7 | ألغاز | فردي | 1–1 | ✅ | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 15 | `reversi` | ⚪ أوثيلو | `src/lib/terboo-arcade/games/reversi.js` | `اوثيلو.js` | `.اوثيلو` | 5 | ألواح | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 150ث | image-policy · miniapp-ui · arcade-games |
| 16 | `rps` | ✊ حجرة ورقة مقص | `src/lib/terboo-arcade/games/rps.js` | `حجرة_ورقة_مقص.js` | `.حجرة_ورقة_مقص` | 7 | جماعية | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 90ث | image-policy · miniapp-ui · arcade-games |
| 17 | `simon` | 🔵 سايمون | `src/lib/terboo-arcade/games/simon.js` | `سايمون.js` | `.سايمون` | 4 | حركة | فردي | 1–1 | ✅ | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 18 | `snake` | 🐍 الثعبان الذهبي | `src/lib/terboo-arcade/games/snake.js` | `الثعبان_الذهبي.js` | `.ثعبان` | 6 | حركة | فردي | 1–1 | ✅ | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 19 | `snakes` | 🐍 ثعبان وسلم | `src/lib/terboo-arcade/games/snakes.js` | `ثعبان_وسلم.js` | `.ثعبان_وسلم` | 8 | ألواح | لاعبان | 2–4 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 20 | `sudoku` | 9️⃣ سودوكو | `src/lib/terboo-arcade/games/sudoku.js` | `سودوكو.js` | `.سودوكو` | 2 | ألغاز | فردي | 1–1 | ✅ | — | ✅ | ✅ | نص حر + كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 21 | `trivia_arena` | 🧠 ساحة المعلومات | `src/lib/terboo-arcade/games/trivia_arena.js` | `ساحة_المعلومات.js` | `.معلومات` | 7 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 30ث | image-policy · miniapp-ui · arcade-games |
| 22 | `wordle_ar` | 🟩 وردل عربي | `src/lib/terboo-arcade/games/wordle_ar.js` | `وردل.js` | `.وردل` | 5 | كلمات | فردي | 1–1 | ✅ | — | ✅ | ✅ | نص حر + كتابة | لا | **لا** | ✅ 120ث | image-policy · miniapp-ui · arcade-games |
| 23 | `xo` | ❌ إكس أو | `src/lib/terboo-arcade/games/xo.js` | `اكس_او.js` | `.اكس_او` | 8 | ألواح | لاعبان | 2–2 | ✅ | ✅ | ✅ | ✅ | كتابة | لا | **لا** | ✅ 90ث | image-policy · miniapp-ui · arcade-games |
| 24 | `q_asahotak` | 🧠 أسئلة ذكاء | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `أسئلة_ذكاء.js` | `.أسئلة_ذكاء` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 25 | `q_kataacak` | 🔤 كلمة عشوائية | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `كلمة_عشوائية.js` | `.كلمة_عشوائية` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 26 | `q_riddle` | ❓ لغز | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `لغز.js` | `.لغز` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 27 | `q_siapakahaku` | 🎭 من أنا | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `من_أنا.js` | `.من_أنا` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 28 | `q_susunkata` | 🔠 رتب الكلمة | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `رتب_الكلمة.js` | `.رتب_الكلمة` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 29 | `q_tebakbendera` | 🏳️ خمن العلم | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_العلم.js` | `.خمن_العلم` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | **نعم** | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 30 | `q_tebakdrakor` | 🇰🇷 خمن الدراما | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الدراما.js` | `.خمن_الدراما` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | **نعم** | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 31 | `q_tebakepep` | 🔫 خمن الشخصية | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الشخصية.js` | `.خمن_الشخصية` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | **نعم** | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 32 | `q_tebakfilm` | 🎬 خمن الفيلم | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الفيلم.js` | `.خمن_الفيلم` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 33 | `q_tebakgambar` | 🖼️ خمن الصورة | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الصورة.js` | `.خمن_الصورة` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | **نعم** | **لا** | ✅ 90ث | image-policy · miniapp-ui · arcade-games |
| 34 | `q_tebakhewan` | 🐾 خمن الحيوان | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الحيوان.js` | `.خمن_الحيوان` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 35 | `q_tebakjkt48` | 🎀 خمن العضوة | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_العضوة.js` | `.خمن_العضوة` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | **نعم** | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 36 | `q_tebakkalimat` | 📖 خمن المثل | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_المثل.js` | `.خمن_المثل` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 37 | `q_tebakkata` | 📝 خمن الكلمة | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الكلمة.js` | `.خمن_الكلمة` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 38 | `q_tebakkimia` | 🧪 خمن العنصر | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_العنصر.js` | `.خمن_العنصر` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 39 | `q_tebaklagu` | 🎵 خمن الأغنية | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الأغنية.js` | `.خمن_الأغنية` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 40 | `q_tebaklirik` | 🎤 خمن الكلمات | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الكلمات.js` | `.خمن_الكلمات` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 41 | `q_tebakmakanan` | 🍲 خمن الطعام | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الطعام.js` | `.خمن_الطعام` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | **نعم** | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 42 | `q_tebaknegara` | 🌍 خمن الدولة | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_الدولة.js` | `.خمن_الدولة` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 43 | `q_tebakprofesi` | 👨‍💼 خمن المهنة | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `خمن_المهنة.js` | `.خمن_المهنة` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 44 | `q_tebaktebakan` | 😄 فوازير | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `فوازير.js` | `.فوازير` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |
| 45 | `q_tekateki` | 🧩 ألغاز | `src/lib/terboo-arcade/legacy-quiz.js + questions.js` | `ألغاز.js` | `.ألغاز` | 3 | أسئلة | جماعي | 1–8 | — | — | ✅ | ✅ | كتابة | لا | **لا** | ✅ 60ث | image-policy · miniapp-ui · arcade-games |

## ملاحظات على الأعمدة

- **ملف القواعد** — الألعاب المُرحَّلة (`q_*`) تتقاسم مصنعاً واحداً فوق محرك الأسئلة؛ بياناتها من `src/data/*.json` عبر تسجيل `games.register`.
- **الإدخال** — «أزرار» من `legalActions`، «نص حر» من `freeActions` بتحقق خادمي، «كتابة» من `parseInput`. ألعاب الأسئلة المُرحَّلة تقبل الحرف (A–D / أ–د / 1–4) **ونص الإجابة** معاً.
- **كانت ترسل صورة؟** — `hasImage: true` في تسجيلها القديم، وكانت ترسل صورة السؤال كرسالة واتساب. الأصل البصري الآن داخل صفحة Mini App عبر وكيل موقّع same-origin.
- **ترحيل** — كل لعبة في هذه المصفوفة لها عقد كامل ومسار لعب مكتمل؛ السجل هو مصدر الكتالوج فلا تظهر لعبة بلا قواعد.
- **الألعاب القديمة المستقلة** (مستذئب · ماينكرافت · fish · دنجن · نينجا) ليست في هذه المصفوفة لأنها ليست عقود أركيد — حالتها في `TERBOO_MINIAPP_FINAL_REPORT.md`.
