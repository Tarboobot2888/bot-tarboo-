# 🎮 TERBOO ARCADE — الفحص الجنائي لنظام الألعاب (المرحلة 0)

> مولّد آلياً: `node tools/terboo-game-audit.mjs` — لا تعدّل يدوياً. الحالة المفحوصة: commit `de88a8c` (قبل TERBOO ARCADE).

## الأعداد

| البند | العدد |
|---|---|
| ملفات plugins/game | 34 |
| ألعاب أسئلة على `games.register` | 22 |
| ألعاب حالتها في `global.*` | 4 |
| مسار إجابة غير متصل | 3 |
| ألعاب بأزرار حقيقية | 0 |
| ملفات بها مشاكل | 8 |
| ملفات بيانات src/data | 31 |
| ألعاب في سجل TERBOO ARCADE | 0 |

## النواة

- `src/lib/terboo-games.js` — 337 سطر
- `src/lib/terboo-game-data.js` — 309 سطر
- `src/lib/terboo-game-queue.js` — 119 سطر
- `src/lib/terboo-game-ulartangga.js` — 89 سطر

- ⚠️ `terboo-games.js`: نص السؤال يُلحق بـ ```` غير مفتوحة (تنسيق مكسور في كل ألعاب الأسئلة)
- مفاتيح موزّع الإجابات في `src/handler.js`: `ulartangga` · `tictactoe` · `suitpvp`
- `cachedGamePlugins` تُفهرس باسم الملف (عربي) ⇒ أي مفتاح لاتيني أعلاه لا يطابق ملفاً عربياً.

## جرد كل لعبة

| الملف | الأمر | المرادفات | المحرك/الحالة | مجموعة/خاص | الواجهة | المكافآت | مسار الإجابة | أسطر |
|---|---|---|---|---|---|---|---|---|
| `fish` | fisht | fishit | db group state | الكل | preview+text | — | — | 892 |
| `أسئلة_ذكاء` | أسئلة_ذكاء | asahotak | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 28 |
| `ألغاز` | ألغاز | tekateki | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `اكس_او` | اكس_او | ttt | global.tictactoeGames | مجموعة | text | koin | UNREACHABLE (handler key mismatch) | 219 |
| `ثعبان_وسلم` | ثعبان_وسلم | ut | global.ulartanggaGames | مجموعة | preview+image+sticker+text | koin, energi | UNREACHABLE (handler key mismatch) | 181 |
| `حجرة_ورقة_مقص` | حجرة_ورقة_مقص | suit | global.suitGames | مجموعة | text | koin | UNREACHABLE (handler key mismatch) | 280 |
| `حماية` | حماية | wwprotect | delegate → مستذئب | خاص | text | — | — | 28 |
| `خمن_الأغنية` | خمن_الأغنية | tebaklagu | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `خمن_الحيوان` | خمن_الحيوان | tebakhewan | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `خمن_الدراما` | خمن_الدراما | tebakdrakor | terboo-games (quiz) | الكل | image | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 32 |
| `خمن_الدولة` | خمن_الدولة | tebaknegara | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `خمن_الشخصية` | خمن_الشخصية | tebakepep | terboo-games (quiz) | الكل | image | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 32 |
| `خمن_الصورة` | خمن_الصورة | tebakgambar | terboo-games (quiz) | الكل | image | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 33 |
| `خمن_الطعام` | خمن_الطعام | tebakmakanan | terboo-games (quiz) | الكل | image | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 30 |
| `خمن_العضوة` | خمن_العضوة | tebakjkt48 | terboo-games (quiz) | الكل | image | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 30 |
| `خمن_العلم` | خمن_العلم | tebakbendera | terboo-games (quiz) | الكل | image | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 31 |
| `خمن_العنصر` | خمن_العنصر | tebakkimia | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 31 |
| `خمن_الفيلم` | خمن_الفيلم | tebakfilm | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `خمن_الكلمات` | خمن_الكلمات | tebaklirik | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `خمن_الكلمة` | خمن_الكلمة | tebakkata | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `خمن_المثل` | خمن_المثل | tebakkalimat | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `خمن_المهنة` | خمن_المهنة | tebakprofesi | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `دنجن` | دنجن | dungeon | user.rpg.dungeon_session | الكل | text | koin, exp | dedicated import (dungeonAnswerHandler) | 404 |
| `رتب_الكلمة` | رتب_الكلمة | susunkata | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `فحص` | فحص_عراف | wwsorcerer | delegate → مستذئب | مجموعة | — | — | — | 22 |
| `فوازير` | فوازير | tebaktebakan | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `قتل` | قتل | wwkill | delegate → مستذئب | خاص | text | — | — | 28 |
| `كشف` | كشف | wwsee | delegate → مستذئب | خاص | text | — | — | 28 |
| `كلمة_عشوائية` | كلمة_عشوائية | kataacak | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 28 |
| `لغز` | لغز | riddle | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `ماينكرافت` | mct | minecraft | db group state | الكل | preview+text | — | — | 1038 |
| `مستذئب` | مستذئب | ww | global.werewolfGames | مجموعة | preview+text | koin | dedicated import (nightActionHandler) | 287 |
| `من_أنا` | من_أنا | siapakahaku | terboo-games (quiz) | الكل | — | koin+energi+exp (games core) | session.gameType → cachedGamePlugins | 29 |
| `نينجا` | نينجا | kyubigame | user.rpg.kyubigame_session | الكل | text | koin, exp | dedicated import (kyubigameAnswerHandler) | 390 |

## المشاكل المكتشفة

- **fish**
  - Math.random ×1 (عشوائية غير مركزية)
- **اكس_او**
  - answerHandler غير متصل: موزّع handler.js يبحث بمفاتيح [ulartangga, tictactoe, suitpvp] لكن الملف «اكس_او»
  - الحالة في global.* (تضيع عند إعادة التشغيل · بلا قفل · بلا sessionId قياسي)
  - مكافأة بكتابة مباشرة على user.koin (غير idempotent)
  - مؤقتات setTimeout بلا تنظيف مركزي
  - بحث خطّي في كل الغرف عند كل رسالة
  - نص عملة قديم (Rp) في الرد
- **ثعبان_وسلم**
  - answerHandler غير متصل: موزّع handler.js يبحث بمفاتيح [ulartangga, tictactoe, suitpvp] لكن الملف «ثعبان_وسلم»
  - الحالة في global.* (تضيع عند إعادة التشغيل · بلا قفل · بلا sessionId قياسي)
  - Math.random ×1 (عشوائية غير مركزية)
- **حجرة_ورقة_مقص**
  - answerHandler غير متصل: موزّع handler.js يبحث بمفاتيح [ulartangga, tictactoe, suitpvp] لكن الملف «حجرة_ورقة_مقص»
  - الحالة في global.* (تضيع عند إعادة التشغيل · بلا قفل · بلا sessionId قياسي)
  - مؤقتات setTimeout بلا تنظيف مركزي
- **دنجن**
  - Math.random ×9 (عشوائية غير مركزية)
  - مكافأة بكتابة مباشرة على user.koin (غير idempotent)
- **ماينكرافت**
  - Math.random ×1 (عشوائية غير مركزية)
- **مستذئب**
  - الحالة في global.* (تضيع عند إعادة التشغيل · بلا قفل · بلا sessionId قياسي)
  - Math.random ×1 (عشوائية غير مركزية)
  - مؤقتات setTimeout بلا تنظيف مركزي
- **نينجا**
  - Math.random ×9 (عشوائية غير مركزية)
  - مكافأة بكتابة مباشرة على user.koin (غير idempotent)

## ملاحظات عامة

- لا يوجد عقد لعبة موحّد: كل لعبة غير الأسئلة تبني غرفها وحالتها بنفسها.
- لا sessionId/roomId قياسي، ولا حالات WAITING/PLAYING/… موحّدة، ولا حفظ للحالة.
- لا خصم آلي (AI) في أي لعبة حالية.
- لا لوحة صدارة ولا إنجازات.
- المكافآت تُصرف مباشرة بلا مفتاح idempotency.
