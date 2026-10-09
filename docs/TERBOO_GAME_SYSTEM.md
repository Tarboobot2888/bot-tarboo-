# 🎮 TERBOO ARCADE — نظام الألعاب (المرجع)

## الخريطة

```
plugins/game/اركيد.js              ← نقطة الدخول (.اركيد) + answerHandler الموحّد للحركات المكتوبة
plugins/game/<لعبة>.js             ← أوامر قصيرة (quickCommand) فوق نفس المحرك
src/lib/terboo-games.js            ← السجل الوحيد: games.register (أسئلة قديمة) + games.registerGame (عقود الأركيد)
src/lib/terboo-arcade/
  contract.js   عقد اللعبة الموحّد          engine.js     الغرف/الجلسات/البروتوكول/المهل/الحفظ
  ai.js         خصم الكمبيوتر              progress.js   مكافآت/إحصاءات/ترتيب/إنجازات
  repository.js مستودع (ذاكرة/قاعدة)        rng.js        عشوائية الخادم + مولّد حتمي
  render.js     نص/أزرار/صورة/HTML          whatsapp.js   جسر واتساب (Action Router + التسليم)
  commands.js   القائمة/التفاصيل/اللعب/الغرف  intent.js     فهم الكلام
  questions.js  محرك الأسئلة                hybrid.js     أزرار فوق الألعاب القديمة
  locale.js     نصوص ar/en/es               games/*.js    تعريفات الألعاب
src/lib/terboo-html-game.js        ← HTML: بنّاء · مدقق · سجل قوالب · نقل
src/lib/terboo-game-design-system.js ← الثيمات والـCSS والصوت
src/lib/terboo-visual-response.js  ← أهلية العرض المرئي لكل أمر + عقد VisualResponse
src/data/arcade/*.json             ← أسئلة · دول · كلمات · إنجازات (ar/en/es)
```

## عقد اللعبة

`{id, name, aliases, category, mode, uiMode, players, supportsGroup, supportsPrivate, supportsAI, supportsSolo, sessionType, stateSchema, actions, renderer, controller, resultHandler, rewardPolicy, timeout, cooldown, permissions, localization, assets}` — يطبّعه `defineGame()` من تعريف يكتب:

- `init({players, rng, options})` حالة JSON
- `legalActions(state, seat)` ⇒ `[{id, payload, label|labelKey|labels, groupKey?}]`
- `apply(state, action, {actor, rng})` ⇒ `{ok, state, events}`
- `status(state)` ⇒ `{over, winners, draw, scores?}`
- `currentActor(state)` (أو `null` للمتزامن) · `parseInput(text, state, seat)` · `view(state, {lang, viewerSeat, turn, players})`
- اختياري: `ai` · `freeActions` + `validateFree` · `onTimeout` · `turnTimeout` · `privateActions` · `inputHint`

## الأوامر

`.اركيد` (القائمة) · `.اركيد html` (بطاقات ألعاب HTML) · `.اركيد info <لعبة>` · `.اركيد <لعبة> [ai] [EASY|NORMAL|HARD|EXPERT] [@صديق]` · `.اركيد join|start|leave|surrender|pause|resume|rematch|board|accept|decline|cancel [غرفة]` · `.اركيد top [لعبة] [week|month]` · `.اركيد stats` · وكل لعبة لها أمر قصير (`.اكس_او` · `.داما` · `.سودوكو` …).

## الأعداد

مولّدة دائماً: `docs/TERBOO_GAME_RELEASE_AUDIT.md` (لا أعداد مكتوبة هنا).

## ✅ New Game Checklist

1. ملف `src/lib/terboo-arcade/games/<id>.js` يصدّر تعريفاً (default) — `id` لاتيني صغير.
2. كل نص معروض عبر `register("g.<id>", {ar, en, es})` و`L(lang, key)` — لا نص خام.
3. الحالة JSON نقية؛ العشوائية من `rng` الممرَّر فقط (لا `Math.random`).
4. `legalActions` يعيد **كل** الحركات القانونية (أو `freeActions` + `validateFree` للإدخال الحر).
5. `apply` يتحقق من الحركة ثانية ويعيد `{ok:false, code}` بدل الاستثناء.
6. `status` هو المصدر الوحيد للنتيجة — لا مكافأة من مكان آخر.
7. `view` لا يكشف معلومات مخفية (أوراق الخصم · الإجابة · الأسرار).
8. `uiMode` حسب المصفوفة: `html` للوحات فقط · `buttons` للخيارات · `text` للإدخال الحر.
9. (اختياري) `ai` بخوارزمية حتمية؛ لا LLM.
10. أمر قصير: `plugins/game/<اسم>.js` بـ`quickCommand("<id>")` و`game: "<id>"` + ترجمة الوصف في الكتالوج.
11. شغّل: `node tests/terboo-arcade-games.test.mjs` (يلعب كل لعبة حتى النهاية) و`node tools/terboo-visual-matrix.mjs` و`node tools/terboo-game-audit.mjs`.
