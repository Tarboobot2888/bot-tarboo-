# 🔒 TERBOO ARCADE — الأمان

| الخطر | الحماية | الإثبات |
|---|---|---|
| العميل يملي النتيجة (`winner=true` · `score=999999` · `balance` · `currentTurn` · `admin=true`) | `FORBIDDEN_PAYLOAD_KEYS` (حتى متداخلة) + الإجراء يجب أن يطابق حرفياً حركة قانونية + النتيجة من `status()` فقط | `terboo-arcade-engine` ‹action-protocol-security› |
| انتحال لاعب / JID مزيّف | `actor` من `identityOf(m.sender)` على الخادم؛ أي معرّف ليس لاعباً ⇒ `not-a-player` | نفس الاختبار |
| ضغط زر قديم / مكرر / متزامن | nonce لكل نسخة · `usedNonces` · `messageId` · قفل لكل غرفة | نفس الاختبار (ضغطتان متزامنتان ⇒ واحدة) |
| إعادة صرف المكافأة | سجل idempotent `sessionId:playerId` + حد يومي + معامل الكمبيوتر | ‹rewards-idempotent-and-daily-cap› |
| تسريب معلومات مخفية | View Model لا يحمل السفن/الوجوه/الإجابة/السر/التتابع | `terboo-arcade-games` ‹لا تسريب› |
| HTML ضار (XSS) | هروب كل نص · مدقق قوالب صارم · لا سكربت · لا موارد خارجية · حد 64KB | `terboo-arcade-html` (11 حالة رفض) |
| قوالب يقترحها الذكاء | معلّقة حتى يعتمدها المالك (`isOwner` من محرك الصلاحيات) | ‹قوالب بموافقة المالك› |
| نسخ بيانات تحقق مرجعية | لا `botMetadata/verificationMetadata/certificateChain/trusted_sources` — معرّفات ديناميكية | فحص الحمولة في `terboo-arcade-html` |
| تجاوز الصلاحيات بالكلام | النية ⇒ نفس الأمر عبر `dispatchCommand` (الصلاحيات · التبريد · حد المعدّل) · الصديق يُحل من دليل المجموعة لا من النموذج | `terboo-arcade-multiplayer` ‹كلام طبيعي› |
| حلقات/إغراق | حد معدّل الأوامر الحالي (8/3ث لكل مستخدم) · `sweep` · حد حجم الإجراء | `terboo-arcade-performance` |
| الكمبيوتر يغش | خوارزميات على المعلومات العامة فقط · فحص ثابت | `terboo-arcade-ai` |
| العشوائية | `crypto.randomInt` على الخادم (نرد · خلط · ألغام · أسطول) — العميل لا يرسل قيمة عشوائية | ‹نرد الخادم› |
| إخفاق صامت | `noteFailure` في كل catch (فحص المستودع كله) | `terboo-no-silent-catch` |
| أسرار | لا مفاتيح في حالة اللعبة أو المحفوظ (`arcade:state`) | ‹persistence-db-repository› |

## التحليلات

عدّادات لكل لعبة فقط (`created/started/finished/vsAI/durationMs`) بلا معرّفات مستخدمين.
