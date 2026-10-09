# 👥 Bot Terboo V6 — ذكاء المجموعة (§14–§17)

## بلا تسجيل

البوت لا يحتاج تسجيل العضو في قاعدة البيانات ليعرف أنه في المجموعة. مصدر الحقيقة: بيانات مجموعة واتساب نفسها (`groupMetadata` · participants).

## الدليل (`src/lib/terboo-group-directory.js`)

سجل أعضاء حقيقي يُبنى من البيانات الحيّة، لكل عضو:
- الهوية القانونية · المعرّف الأساسي · LID · PN إن عُرف · اسم العرض · pushName · الاسم الموثّق
- دور الإشراف · علم المالك · أول/آخر ظهور · حدث الانضمام حيث توفّر · حالة المغادرة.

Baileys v7 يعتمد LID كهوية أساسية وPN مرتبطاً عند توفّره — الدليل يعكس ذلك ولا يحوّل كل شيء إلى رقم هاتف.

## الاستعلامات (§15) — `parseDirectoryQuery` في محرّك الإجراءات

| السؤال | النتيجة |
|---|---|
| مين أعضاء الجروب؟ | قائمة حقيقية مقسّمة صفحات (60/صفحة) — لا تُرسل مئات الأسماء للنموذج |
| مين الأدمن؟ | المشرفون الحقيقيون |
| كام عضو؟ | عدد حقيقي |
| هل أحمد موجود؟ | resolver حقيقي (موجود/غامض/غير موجود) |
| مين صاحب الجروب؟ | المالك الحقيقي |
| مين آخر واحد اتضاف؟ | من حدث/سياق حقيقي |
| هات الأعضاء اللي اسمهم أحمد | كل التطابقات القوية — لا اختراع أسماء |

## محلّل الأعضاء (§16) — `terboo-member-resolver` + `terboo-name-match`

```
Natural Language → Member Resolver → Candidate Set → Exact/Strong Match → Ambiguity Check
→ Canonical Identity → Permission → Action
```
تطبيع عربي (أ/إ/آ→ا · ي/ى · ة/ه · المسافات · الترقيم · حالة الأحرف) بلا أن يتحوّل التطابق الواسع إلى تخمين. النموذج لا يختار JID بنفسه؛ عند تعدد «أحمد» يُعرض حسم الغموض.

## إجراءات المجموعة (§17)

add · re-add · kick · promote · demote · warn · mention · hidetag · mute/unmute · group mode · welcome · anti-link · settings · list admins/members · presence · owner info — كلها تمر من **محرّك الإجراءات + محرّك الصلاحيات + المنفّذ الموجود** (البلوقنات الحالية)، بلا إعادة كتابة أي أمر.

## الاختبار

`tests/terboo-ai-agent-actions.test.mjs` (28 سيناريو حقيقي على واتساب وهمي بقائمة أعضاء تتغيّر فعلاً) + `tests/terboo-group-actions.test.mjs` + `tests/terboo-member-card.test.mjs`.
المرجع المولّد: `docs/v6/group-action-matrix.json` و`docs/terboo-group-action-matrix.json`.
