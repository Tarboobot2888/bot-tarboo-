# 🏁 TERBOO ARCADE — التدقيق النهائي للإصدار (المرحلة 18)

> مولّد: `node tools/terboo-game-audit.mjs --final --tests <arcade.json> --full <all.json>`. لا رقم مكتوب يدوياً.
> خط الأساس: `git ls-tree de88a8c plugins/game/` (قبل TERBOO ARCADE).

## الألعاب

| البند | العدد |
|---|---|
| ملفات ألعاب قبل الأركيد | 34 |
| ملفات ألعاب الآن | 55 |
| أُلغي/حُذف من الألعاب القديمة | 0 |
| قديمة رُحّلت للمحرك الموحّد (أزرار/لوحة) | 3 (اكس_او، ثعبان_وسلم، حجرة_ورقة_مقص) |
| قديمة صارت Hybrid (منطقها كما هو) | 4 (دنجن، ماينكرافت، مستذئب، نينجا) |
| ألعاب أسئلة قديمة بأزرار (تلميح/استسلام) | 22 |
| أوامر فرعية للمستذئب (أزرار من اللعبة الأم) | 4 |
| بلا تغيير (نص/وسائط) | 1 (fish) |
| ألعاب جديدة على المحرك | 20 |
| إجمالي عقود TERBOO ARCADE | 23 |
| ألعاب أسئلة (قديمة + جديدة) | 25 |
| متعددة اللاعبين (max > 1) | 15 |
| بخصم كمبيوتر | 11 |
| فردية | 8 |
| مؤهلة لـHTML (تُسلَّم hybrid) | 12 |
| hybrid | 3 |
| buttons | 6 |
| text | 2 |

## الألعاب الجديدة

| المعرّف | الاسم | الفئة | اللاعبون | خصم | العرض الفعلي |
|---|---|---|---|---|---|
| `battleship` | معركة السفن | board | 2–2 | ✅ | hybrid |
| `breakout` | تحطيم الطوب | arcade | 1–1 | — | hybrid (HTML eligible) |
| `bulls_cows` | بولز آند كاوز | puzzle | 2–2 | ✅ | text |
| `checkers` | الداما | board | 2–2 | ✅ | hybrid (HTML eligible) |
| `connect4` | أربعة في صف | board | 2–2 | ✅ | hybrid (HTML eligible) |
| `dotsboxes` | نقط ومربعات | puzzle | 2–2 | ✅ | hybrid (HTML eligible) |
| `g2048` | 2048 | puzzle | 1–1 | — | hybrid (HTML eligible) |
| `geo_battle` | معركة الجغرافيا | quiz | 1–8 | — | buttons |
| `gomoku` | خمسة في صف | board | 2–2 | ✅ | hybrid (HTML eligible) |
| `hangman` | الرجل المشنوق | word | 1–1 | — | buttons |
| `letter_rush` | سباق الحروف | word | 1–12 | — | text |
| `math_duel` | مبارزة الحساب | puzzle | 1–8 | — | buttons |
| `memory` | ذاكرة البطاقات | puzzle | 2–2 | ✅ | hybrid (HTML eligible) |
| `minesweeper` | كاشف الألغام | puzzle | 1–1 | — | hybrid (HTML eligible) |
| `reversi` | أوثيلو | board | 2–2 | ✅ | hybrid (HTML eligible) |
| `simon` | سايمون | arcade | 1–1 | — | buttons |
| `snake` | الثعبان الذهبي | arcade | 1–1 | — | hybrid (HTML eligible) |
| `sudoku` | سودوكو | puzzle | 1–1 | — | hybrid (HTML eligible) |
| `trivia_arena` | ساحة المعلومات | quiz | 1–8 | — | buttons |
| `wordle_ar` | وردل عربي | word | 1–1 | — | hybrid |

## اختبارات الأركيد (من الـrunner)

| المجموع | نجح | فشل | تخطٍّ | محجوب |
|---|---|---|---|---|
| 6 | 6 | 0 | 0 | 0 |

- ✅ `terboo-arcade-ai.test.mjs` (4.2s) — ✅ terboo-arcade-ai: 11 ألعاب بخصم (4 مستويات قانونية وحتمية) · XO خبير بلا خسارة · سد/إكمال · لا قراءة أسرار · مستويات مختلفة · لا LLM · 19 حالة نية
- ✅ `terboo-arcade-engine.test.mjs` (0.6s) — ✅ terboo-arcade-engine: 7 مجموعات (contract-and-single-registry · action-protocol-security · states-host-spectators · rewards-idempotent-and-daily-cap · challenge-accept-decline-expire · timeout-and-rematch · persistence-db-repository)
- ✅ `terboo-arcade-games.test.mjs` (0.8s) — ✅ terboo-arcade-games: 23/23 لعبة لُعبت حتى النهاية · قواعد (جاذبية · أكل إجباري · قلب · كشف آمن · دمج · سودوكو · وردل · ثيران · حروف) · لا تسريب (سفن · بطاقات · إجابة · سر · تتابع)
- ✅ `terboo-arcade-html.test.mjs` (0.7s) — ✅ terboo-arcade-html: هروب · مدقق (11 رفض) · نقل 12 لعبة HTML بكل المراحل · لا قيم مرجعية · إرسال/جسر معطلان · قوالب بموافقة المالك · 6 ثيمات · renderers
- ✅ `terboo-arcade-multiplayer.test.mjs` (70.1s) — ✅ terboo-arcade-multiplayer: XO مجموعة (أزرار+كتابة+nonce+دور+فوز+مكافأة) · تحدي صديق · ضد الكمبيوتر · ثعبان وسلم 4 لاعبين · أسئلة جماعية · اختيار سري في الخاص · كلام طبيعي
- ✅ `terboo-arcade-performance.test.mjs` (1.4s) — ✅ terboo-arcade-performance: 100 غرفة: إنشاء 16ms · حركات 76ms (0.76ms/حركة) · تنظيف 8ms · heap 41MB · 500 غرفة: إنشاء 33ms · حركات 235ms (0.47ms/حركة) · تنظيف 24ms · heap 59MB · 1000 غرفة: إنشاء 50ms · حركات 372ms (0.37ms/حركة) · تنظيف 41ms · heap 82MB · كل الفهارس فارغة بعد التنظيف

## كل اختبارات المشروع المحلية

| المجموع | نجح | فشل | live لم يُشغَّل | محجوب |
|---|---|---|---|---|
| 120 | 120 | 0 | 3 | 0 |

## الأداء والذاكرة (مقاس — v22.22.0)

| غرف | إنشاء | حركات (مع رد الكمبيوتر) | لكل حركة | تنظيف | heap |
|---|---|---|---|---|---|
| 100 | 16ms | 76ms | 0.76ms | 8ms | 41MB |
| 500 | 33ms | 235ms | 0.47ms | 24ms | 59MB |
| 1000 | 50ms | 372ms | 0.37ms | 41ms | 82MB |

## الحدود (بصدق)

- **HTML Multiplayer غير مُعلن**: جسر الإجراءات داخل HTML غير مُفعّل لعدم وجود قناة عميل مُثبتة (Click → Action ID → Backend). الغرف الموحّدة تعرض بطاقة HTML 3D مع أزرار ونص احتياطي، وأزيل توليد صور اللوحات. النقل rich مفعّل افتراضياً في الترحيل ويمكن إيقافه عبر `TERBOO_ARCADE_HTML=off`.
- عرض `richResponseMessage/unifiedResponse` على أجهزة واتساب الحقيقية لم يُجرَّب في هذه البيئة المغلقة.
- أُضيفت بطاقات HTML للحالات والنتائج والكتالوجات في Minecraft وFish It وWerewolf؛ ما زالت أوامر واتساب الأصلية هي مسار التحكم الاحتياطي.
