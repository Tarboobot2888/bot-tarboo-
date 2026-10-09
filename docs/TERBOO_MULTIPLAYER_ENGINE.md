# 🕹️ TERBOO ARCADE — محرك الجلسات والغرف وتعدد اللاعبين

الملف: `src/lib/terboo-arcade/engine.js` (على السجل الوحيد `games` في `terboo-games.js`).

## الحالات

`WAITING → READY → PLAYING ⇄ PAUSED → FINISHED | CANCELLED | EXPIRED`

| الانتقال | الشرط |
|---|---|
| WAITING → READY | عدد اللاعبين ≥ الحد الأدنى |
| READY → PLAYING | المضيف يبدأ (أو تلقائياً عند امتلاء غرفة ثابتة السعة/الكمبيوتر/الفردي) |
| PLAYING → FINISHED | `status()` من منطق الخادم فقط · استسلام · انتهاء وقت الدور |
| WAITING/READY → EXPIRED | مهلة الغرفة (5 د) أو التحدي (2 د) |
| أي → CANCELLED | المضيف (قبل اللعب) · رفض كل المدعوين · غرفة فارغة · المالك (force) |

## Game API

`createGame/createRoom · joinRoom · leaveRoom · readyPlayer · startGame · applyAction · getState · getView · pauseGame · resumeGame · finishGame · cancelGame · rematch · getLeaderboard · getStats` + `spectate · transferHost · surrender · declineChallenge · pendingChallenges · sweep`.

## بروتوكول الإجراء

```
{gameId, sessionId, actionId, actor, timestamp, nonce, payload, source, messageId}
```

1. فحص البنية (أنواع · أطوال · حجم payload ≤ 1KB · عمق ≤ 3) — رخيص قبل أي قفل.
2. `payload` لا يحمل `winner/score/turn/currentTurn/admin/isOwner/balance/koin/exp/state/result/…` (حتى متداخلاً).
3. الجلسة/اللعبة متطابقتان · الغرفة PLAYING · `actor` لاعب فعلي (المعرّف القانوني من `identityOf(m.sender)`، لا من العميل).
4. زر/HTML: `nonce` = nonce النسخة الحالية ⇒ وإلا `stale` (قديم) أو `bad-nonce`. نص: إزالة التكرار بـ`messageId`.
5. الدور من `currentActor()`.
6. الإجراء يجب أن يطابق حرفياً واحداً من `legalActions()` — أو (للإدخال الحر) يمر من `validateFree()` على حالة الخادم.
7. التطبيق على نسخة · nonce جديد · مؤقت دور جديد · أدوار الكمبيوتر · فحص النهاية.

قفل لكل غرفة: ضغطتان بنفس النسخة ⇒ واحدة فقط تمر (مختبر).

## المدخلات ⇒ Game Action واحد

| المدخل | المسار |
|---|---|
| زر/قائمة | `.اركيد a <roomId> <nonce> <index>` ⇒ `legalActions[index]` لنفس النسخة |
| رد/نص | `contract.parseInput` (رقم الخانة · `C4` · `ارمي` · `A`…) عبر answerHandler الموحّد |
| أمر | `.اركيد play/join/start/…` أو أوامر الألعاب القصيرة (`.اكس_او` …) |
| كلام طبيعي | `intent.js` ⇒ نفس أمر `.اركيد` عبر `dispatchCommand` (نفس الصلاحيات والتبريد) |
| HTML | العقد جاهز في الخادم (`source:"html"`) — الجسر غير مُفعّل |

## اللعب مع صديق

- **مجموعة**: `.اكس_او` غرفة مفتوحة، والثاني ينضم بنفس الأمر أو بزر «انضمام»؛ `.اكس_او @صديق` أو «العب داما مع أحمد» (الاسم يُحل من دليل المجموعة) ⇒ تحدٍّ.
- **خاص**: تحدٍّ بالمنشن/الرد ⇒ بطاقة قبول/رفض (مهلة دقيقتين) — غير المدعو مرفوض.
- **اختيار سري** (`privateActions`): أزرار الحركة تصل لخاص كل لاعب (حجرة ورقة مقص).

## العدالة والتنظيف

- عشوائية الخادم فقط (`crypto`) — النرد والخلط والألغام والأسطول.
- المهلة: من انتهى وقته يخسر (أو `onTimeout` الخاص: الأسئلة تنتقل للسؤال التالي).
- إعادة المباراة: تصويت كل البشر، والمقاعد تُدوَّر.
- إعادة الاتصال: الحالة محفوظة في القاعدة (`arcade:state`) وتُستعاد بعد إعادة التشغيل وتكمل (مختبر).
- `sweep` كل 15 ثانية: إنهاء/انتهاء/إزالة كاملة مع تفريغ الفهارس (مختبر حتى 1000 غرفة).
- حد التكرار في المجموعة لا يُسقط حركات اللاعبين البشر في غرفة جارية.

## المكافآت والترتيب

`progress.js`: idempotent بمفتاح `sessionId:playerId` · حد يومي 25 لكل لاعب/لعبة · معامل ضد الكمبيوتر (سهل 0.25 … خبير 1) · إحصاءات · ترتيب لكل لعبة/أسبوعي/شهري/كل الأوقات · إنجازات من `src/data/arcade/achievements.json`.
