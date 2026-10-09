# 🧭 TERBOO ARCADE — مصفوفة واجهة الألعاب (المرحلة 1)

> مولّد آلياً: `node tools/terboo-game-audit.mjs`. القاعدة: لا HTML لمجرد الشكل — HTML فقط للوحات المرئية، والتفاعل دائماً عبر أزرار تحمل Action ID حتى يُثبت جسر HTML.

## التوزيع

| uiMode | العدد |
|---|---|
| hybrid | 6 |
| buttons | 27 |
| html | 1 |

## المصفوفة

| الملف | النوع | uiMode المقترح | السبب |
|---|---|---|---|
| `fish` | sim | **hybrid** | محاكاة طويلة — لوحة تحكم + أزرار؛ المنطق كما هو |
| `أسئلة_ذكاء` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `ألغاز` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `اكس_او` | board-2p | **html** | لوحة 3×3 — مرجع HTML (عرض) + أزرار خلايا (تفاعل) + AI |
| `ثعبان_وسلم` | board-multi | **hybrid** | لوحة مرئية + نرد من الخادم + زر «ارمِ» — 2–4 لاعبين |
| `حجرة_ورقة_مقص` | duel | **buttons** | اختيار سري من 3 — أزرار في الخاص؛ لا داعي لـHTML |
| `حماية` | sub-command | **buttons** | أمر فرعي لـمستذئب — أزرار أهداف في الخاص |
| `خمن_الأغنية` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_الحيوان` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_الدراما` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_الدولة` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_الشخصية` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_الصورة` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_الطعام` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_العضوة` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_العلم` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_العنصر` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_الفيلم` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_الكلمات` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_الكلمة` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_المثل` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `خمن_المهنة` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `دنجن` | rpg | **hybrid** | منطق خادم قائم — لوحة حالة + أزرار اختيارات |
| `رتب_الكلمة` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `فحص` | sub-command | **buttons** | أمر فرعي لـمستذئب — أزرار أهداف في الخاص |
| `فوازير` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `قتل` | sub-command | **buttons** | أمر فرعي لـمستذئب — أزرار أهداف في الخاص |
| `كشف` | sub-command | **buttons** | أمر فرعي لـمستذئب — أزرار أهداف في الخاص |
| `كلمة_عشوائية` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `لغز` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `ماينكرافت` | sim | **hybrid** | محاكاة طويلة — لوحة تحكم + أزرار؛ المنطق كما هو |
| `مستذئب` | social | **hybrid** | أدوار سرية — أزرار خاصة لكل لاعب + لوحة حالة في المجموعة |
| `من_أنا` | question | **buttons** | سؤال واحد بإجابة نصية — أزرار خيارات/مساعدات + صورة عند وجودها؛ HTML بلا فائدة |
| `نينجا` | rpg | **hybrid** | منطق خادم قائم — لوحة حالة + أزرار اختيارات |

## ما نُفّذ فعلاً (الشجرة الحالية)

| الملف | جديد؟ | النوع | العرض المُسلَّم |
|---|---|---|---|
| `fish` | — | unchanged | text |
| `أسئلة_ذكاء` | — | quiz | buttons |
| `ألغاز` | — | quiz | buttons |
| `اربعة_في_صف` | 🆕 | arcade:connect4 | hybrid (HTML eligible) |
| `اركيد` | 🆕 | unchanged | text |
| `اكس_او` | — | arcade:xo | hybrid (HTML eligible) |
| `الثعبان_الذهبي` | 🆕 | arcade:snake | hybrid (HTML eligible) |
| `الفين` | 🆕 | arcade:g2048 | hybrid (HTML eligible) |
| `المشنوق` | 🆕 | arcade:hangman | buttons |
| `اوثيلو` | 🆕 | arcade:reversi | hybrid (HTML eligible) |
| `بولز` | 🆕 | arcade:bulls_cows | text |
| `تحطيم_الطوب` | 🆕 | arcade:breakout | hybrid (HTML eligible) |
| `ثعبان_وسلم` | — | arcade:snakes | hybrid |
| `حجرة_ورقة_مقص` | — | arcade:rps | buttons |
| `حماية` | — | werewolf-skill | buttons (from werewolf) |
| `خمسة_في_صف` | 🆕 | arcade:gomoku | hybrid (HTML eligible) |
| `خمن_الأغنية` | — | quiz | buttons |
| `خمن_الحيوان` | — | quiz | buttons |
| `خمن_الدراما` | — | quiz | buttons |
| `خمن_الدولة` | — | quiz | buttons |
| `خمن_الشخصية` | — | quiz | buttons |
| `خمن_الصورة` | — | quiz | buttons |
| `خمن_الطعام` | — | quiz | buttons |
| `خمن_العضوة` | — | quiz | buttons |
| `خمن_العلم` | — | quiz | buttons |
| `خمن_العنصر` | — | quiz | buttons |
| `خمن_الفيلم` | — | quiz | buttons |
| `خمن_الكلمات` | — | quiz | buttons |
| `خمن_الكلمة` | — | quiz | buttons |
| `خمن_المثل` | — | quiz | buttons |
| `خمن_المهنة` | — | quiz | buttons |
| `داما` | 🆕 | arcade:checkers | hybrid (HTML eligible) |
| `دنجن` | — | legacy-logic | hybrid |
| `ذاكرة_البطاقات` | 🆕 | arcade:memory | hybrid (HTML eligible) |
| `رتب_الكلمة` | — | quiz | buttons |
| `ساحة_المعلومات` | 🆕 | arcade:trivia_arena | buttons |
| `سايمون` | 🆕 | arcade:simon | buttons |
| `سباق_الحروف` | 🆕 | arcade:letter_rush | text |
| `سودوكو` | 🆕 | arcade:sudoku | hybrid (HTML eligible) |
| `فحص` | — | werewolf-skill | buttons (from werewolf) |
| `فوازير` | — | quiz | buttons |
| `قتل` | — | werewolf-skill | buttons (from werewolf) |
| `كاشف_الالغام` | 🆕 | arcade:minesweeper | hybrid (HTML eligible) |
| `كشف` | — | werewolf-skill | buttons (from werewolf) |
| `كلمة_عشوائية` | — | quiz | buttons |
| `لغز` | — | quiz | buttons |
| `ماينكرافت` | — | legacy-logic | hybrid |
| `مبارزة_الحساب` | 🆕 | arcade:math_duel | buttons |
| `مستذئب` | — | legacy-logic | hybrid |
| `معركة_الجغرافيا` | 🆕 | arcade:geo_battle | buttons |
| `معركة_السفن` | 🆕 | arcade:battleship | hybrid |
| `من_أنا` | — | quiz | buttons |
| `نقط_ومربعات` | 🆕 | arcade:dotsboxes | hybrid (HTML eligible) |
| `نينجا` | — | legacy-logic | hybrid |
| `وردل` | 🆕 | arcade:wordle_ar | hybrid |
