# 🔬 Bot Terboo V6 — الفحص الجنائي (Phase 0)

> مولَّد آلياً بـ `node tools/terboo-forensic-v6.mjs` — لا أرقام مكتوبة يدوياً. HEAD `5012280` · Node v22.22.0 · 2026-10-09T00:20:30.081Z

## 1. الأعداد

| البند | العدد |
|---|---|
| files | 1818 |
| codeFiles | 1419 |
| pluginFiles | 932 |
| registeredPlugins | 930 |
| commands | 1246 |
| aliases | 1355 |
| categories | 37 |
| scrapers | 63 |
| aiTools | 63 |
| providers | 6 |
| aiSystems | 40 |
| menus | 9 |
| menuItems | 28 |
| tests | 123 |
| images | 86 |
| fonts | 33 |
| externalHosts | 350 |
| processFiles | 55 |
| reachableSourceModules | 273 |
| orphanSourceModules | 43 |
| missingImports | 0 |

## 2. الواجهات التفاعلية (منشئات مباشرة)

| الاستخدام | عدد المواضع |
|---|---|
| directInteractivePlugins | 2 |
| relayMessage | 53 |
| generateWAMessageFromContent | 31 |
| interactiveMessage | 60 |
| buttonsMessage | 38 |
| listMessage | 18 |

## 3. التنفيذ والـshell

- ملفات تنفيذ بصدفة (shell): لا يوجد
- ملفات eval: plugins/owner/eval.js، src/connection.js، tools/terboo-plugin-health.mjs
- ملفات ssh2: src/lib/terboo-ssh.js
- تصادم الأسماء/المرادفات: 0/0 · مرادف يحجب اسماً: 0

## 4. الاستيرادات والوحدات اليتيمة

- استيرادات مفقودة: 0
- وحدات مصدر غير مستوردة من نقاط الدخول: 43
  - `src/lib/providers/virtualizor/index.js` (مستورد من الاختبارات: 1)
  - `src/lib/terboo-arcade/games/_grid.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/_text.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/battleship.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/breakout.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/bulls_cows.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/checkers.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/connect4.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/dotsboxes.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/g2048.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/geo_battle.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/gomoku.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/hangman.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/letter_rush.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/math_duel.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/memory.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/minesweeper.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/reversi.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/rps.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/simon.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/snake.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/snakes.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/sudoku.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/trivia_arena.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/wordle_ar.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/games/xo.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-arcade/questions.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-backup.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-carbon.js` (مستورد من الاختبارات: 0)
  - `src/lib/terboo-game-queue.js` (مستورد من الاختبارات: 0)
- scrapers غير مسجّلة: 0

## 5. الإخفاق الصامت (كل شجرة الإنتاج)

الإجمالي: **0** — الاختبار الحالي يغطي src وplugins فقط.

| الجذر | العدد |
|---|---|


## 6. نصوص تشبه الأسرار خارج config.js

المكان والنوع فقط — لا تُطبع أي قيمة.

- لا يوجد.

## 7. الواجهات الخارجية

- مضيفات خارجية مكتشفة: 350 (التفاصيل: `node tools/terboo-inventory.mjs` ← apis.json، والتصنيف في docs/EXTERNAL_API_CLASSIFICATION.md).

## 8. بوابات التسجيل

- `config.js:219` — `enforceForNewUsers: false, // V6: مُهمل — لا ترقية تلقائية للتسجيل الإجباري`
- `src/lib/terboo-command-index.js:102` — `skipRegistration: Boolean(cfg.isEnabled === false ? false : cfg.skipRegistration),`
- `src/lib/terboo-onboarding.js:98` — `* V6: التسجيل اختياري. ترقية الإصدارات السابقة كانت تفعّل registrationRequired تلقائياً`
- `src/lib/terboo-onboarding.js:99` — `* (enforceForNewUsers) — هنا يُطفأ الإعداد المخزّن مرة واحدة ولا يُعاد تفعيله أبداً.`
- `src/lib/terboo-onboarding.js:106` — `if (db.setting("registrationRequired") === true) db.setting("registrationRequired", false);`
- `src/lib/terboo-onboarding.js:114` — `function isRegistrationRequired() {`
- `src/lib/terboo-onboarding.js:357` — `* هل للأمر الحالي استثناء من التسجيل؟ skipRegistration الموجود أصلاً، أو أمر إدارة مجموعة`
- `src/lib/terboo-onboarding.js:365` — `return Boolean(plugin?.config?.skipRegistration || (m.isGroup && plugin?.config?.category === "group"));`
- `src/lib/terboo-onboarding.js:527` — `isRegistrationRequired,`
- `src/lib/terboo-onboarding.js:545` — `isRegistrationRequired,`
- `plugins/main/اغلاق_القائمة.js:27` — `skipRegistration: true,`
- `plugins/owner/تحكم.js:40` — `skipRegistration: true,`
- `plugins/owner/نظام_التسجيل.js:112` — `if (db.setting("registrationRequired") === true) {`
- `plugins/owner/نظام_التسجيل.js:113` — `db.setting("registrationRequired", false);`
- `plugins/user/daftar.js:39` — `skipRegistration: true,`
- `plugins/user/الغاء_التسجيل.js:21` — `skipRegistration: true,`
- `plugins/user/ذاكرة.js:42` — `skipRegistration: true,`
- `plugins/user/لغة.js:32` — `skipRegistration: true,`
- `plugins/user/نمط_الاستخدام.js:31` — `skipRegistration: true,`
- `plugins/user/ويب.js:23` — `skipRegistration: true,`

## 9. انحراف الإصدار

| الموضع | القيمة |
|---|---|
| package.json version | 6.0.0 |
| package.json description | V6 |
| config.js bot.version | 6.0 |

### التوثيق حسب الإصدار

| الإصدار | عدد الملفات |
|---|---|
| unversioned | 21 |
| V6 | 13 |
| archived (historical) | 9 |

## 10. المسارات القديمة/المعزولة

- `plugins/vps/cekvps.js` — DigitalOcean (legacy) — ليس مسار Virtualizor
- `plugins/vps/createvps.js` — DigitalOcean (legacy) — ليس مسار Virtualizor
- `plugins/vps/delvps.js` — DigitalOcean (legacy) — ليس مسار Virtualizor
- `plugins/vps/listvps.js` — DigitalOcean (legacy) — ليس مسار Virtualizor
- `plugins/vps/sisavps.js` — DigitalOcean (legacy) — ليس مسار Virtualizor
- `plugins/vps/turnon.js` — DigitalOcean (legacy) — ليس مسار Virtualizor
- `src/lib/terboo-roles-digitalocean.js` — أدوار بائعي DigitalOcean (legacy)
- `plugins/owner/internetrakyat.js` — إرسال OTP لأرقام الغير — يجب عزله عن المسارات العامة والذكاء
- `plugins/canvas/avatarjpg.js` — غير مسجّل (disabled)
- `plugins/search/asiariyadh.js` — غير مسجّل (disabled)

## 11. حالة الموقع

- مجلد الموقع: web
- قسم website في config.js: موجود

## 12. العوائق المشتقة

- لا يوجد.
