# 🧠 Bot Terboo V6 — إغلاق الذكاء والاختبارات الإلزامية (§8–§20 §55)

## النواة الموحّدة (§8)

مسار واحد لكل رسالة من أي قناة (واتساب/الموقع/تيليجرام):

```
Message → Identity → Scope → Context → Memory → Intent (Fast Gate) → Entity
→ Capability → Permission → Tool/Command → Execute → Verify → Context/Memory Update → Response
```

- لا نواة ثانية: `runActionEngine` ثم `terboo-ai-core` (نفس `kernelAsk`/`composeReply`)؛ الموقع يستدعي نفس المسار عبر `terboo-web-services.chat`.
- بوابة النية السريعة (Fast Intent Gate) قبل أي نداء نموذج غالٍ؛ المحادثة الحتمية لا تستدعي النموذج.
- الذاكرة بنطاقات (خاص · مستخدم في مجموعة · مجموعة · عام) بلا تسريب بين النطاقات.
- السياق يحفظ آخر عضو/ملف/VPS/مهمة… والمتابعات تعمل («اطرده»، «رجعه»، «كمل»، «نفس اللي عملناه»).
- «يقدر ينفذ أي شيء» = عبر قدرة حقيقية بصلاحية فقط — لا eval/shell عشوائي، لا JID يختاره النموذج، لا نجاح وهمي.

## خريطة الاختبارات الإلزامية الـ36 (§55)

كل بند وأين يُثبَت (كلها اختبارات حقيقية تُشغَّل، لا مزعومة):

| # | السيناريو | الاختبار |
|---|---|---|
| 1 | إضافة عضو | `terboo-ai-agent-actions` ‹01-add-by-name› |
| 2 | طرد نفس العضو بالمتابعة | ‹02-kick-pronoun-lid› |
| 3 | إعادة إضافة نفس العضو | ‹03-readd› |
| 4 | ترقية نفس العضو | ‹04-promote-pronoun› |
| 5 | خفض نفس العضو | ‹07b-demote-same-member› · ‹07d-follow-up-chain-and-repeat› |
| 6 | اسم عضو غامض | ‹13-ambiguous-then-pick› |
| 7 | عضو من رسالة مقتبسة | ‹16-quoted-target› |
| 8 | عضو بالمنشن | ‹18-mention-target› |
| 9 | عضو بالـLID | ‹02-kick-pronoun-lid› |
| 10 | عضو بالـPN | ‹15-pn-name-target› |
| 11 | قائمة أعضاء المجموعة | ‹05-members› |
| 12 | قائمة المشرفين | ‹06-admins› |
| 13 | عدد الأعضاء | ‹07-presence› (كام عضو) |
| 14 | مستخدم غير مسجّل | `terboo-registration-optional` · ‹12-unregistered-group-ai› |
| 15 | التسجيل اختياري | `terboo-registration-optional` · `terboo-onboarding` |
| 16 | تغيير نمط الاستخدام | ‹08-change-usage-by-words› · `terboo-website` (usage) |
| 17 | القائمة تعكس التغيير فوراً | ‹09-11-usage-switch-and-menu› |
| 18 | إلغاء مهمة | ‹19-20-task-cancel-resume› |
| 19 | استئناف مهمة | ‹19-20-task-cancel-resume› · `terboo-ai-runtime` |
| 20 | حالة مهمة | `terboo-ai-runtime` · `terboo-website` (tasks) |
| 21 | متابعة AI | ‹21-ai-follow-up› |
| 22 | استمرارية السياق | ‹22-multimodal-follow-up› · ‹07d-follow-up-chain-and-repeat› |
| 23 | عزل الذاكرة | `terboo-ai-memory` (النطاقات) · `terboo-ai-quality` (leaksInternals) |
| 24 | ملكية VPS | `terboo-permissions` (resource vps) · `terboo-virtualizor` |
| 25 | ملكية اللوحة | `terboo-permissions` (resource panel) · `terboo-pterodactyl` |
| 26 | رفض الصلاحية | `terboo-permissions` · ‹member-without-permission› |
| 27 | التأكيد | `terboo-permissions` (needs-confirmation) · `terboo-vps-provisioner` |
| 28 | مصادقة الموقع | `terboo-website` (دخول واتساب + جلسة) |
| 29 | تنفيذ AI من الموقع | `terboo-website` (tools) · `terboo-web-services.chat` (نفس النواة) |
| 30 | تحديثات مهام الموقع | `terboo-website` (tasks) + قناة SSE |
| 31 | تفويض مالك الموقع | `terboo-website` (owner-only · لا ترقية بعلم العميل) |
| 32 | أمان الرفع | حدود `config.website.uploads` + حارس المسار في `terboo-website` |
| 33 | حارس SSRF | `terboo-pterodactyl` (SSRF) · طبقة HTTP الموحّدة |
| 34 | إخفاء الأسرار | `terboo-secrets-vault` · `terboo-website` (لا أسرار في الردود) |
| 35 | لا إخفاق صامت | `terboo-no-silent-catch` (1217 ملفاً · 0) |
| 36 | لا نجاح وهمي | ‹23-no-fake-success› · `terboo-vps-provisioner` (رفض/مهلة/استئناف) |

## الأداء (§18)

لا تأخير ثابت مصطنع: بوابة نية سريعة، تخزين مؤقت، إزالة تكرار، مهلة وإلغاء، تزامن آمن، تحديث ذاكرة في الخلفية. المتابعة الطويلة (إعادة التثبيت/الاستعادة/إنشاء VPS) مهمة خلفية بقراءة حقيقية لا sleep أعمى.

## إعادة التوليد

```bash
node tests/terboo-ai-agent-actions.test.mjs       # 28 سيناريو حقيقي
node tests/terboo-registration-optional.test.mjs
node tests/terboo-website.test.mjs
node tests/terboo-vps-provisioner.test.mjs
node tools/terboo-run-tests.mjs                   # كل الاختبارات المحلية
```
