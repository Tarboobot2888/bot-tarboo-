# 🧩 Bot Terboo V6 — إغلاق ترحيل الواجهة الموحّدة (§28)

> مولَّد بـ `node tools/terboo-ui-closeout.mjs` · خط الأساس `aee0195` · 2026-10-08T18:10:24.394Z

## القاعدة

- البلوقن يعلن **نية** فقط: `sendCard` (أزرار · روابط · نسخ · قائمة اختيار · صورة/فيديو/مستند رأس · بطاقة مصغّرة · منشن · تسليم لدردشة أخرى) أو `sendCarousel` (بطاقات نتائج) أو `sendMenu` (قوائم السجل المركزي).
- البناء في `terboo-interactive-builder`، والتسليم بطبقاته وبدائله وسجله في `terboo-menu-delivery` — طبقة التوافق الوحيدة الموثّقة لواجهات البلوقنات.
- كل بديل نصي يحمل كل اختيار قابل للكتابة (الأزرار وصفوف القوائم والروابط) فلا يضيع خيار إن رفض الجهاز الأزرار.

## الإضافات التي كانت تبني حمولات مباشرة: 30

### رُحّلت (28)

- `plugins/ai/توليد.js`
- `plugins/ai/فن.js`
- `plugins/downloader/تحميل.js`
- `plugins/downloader/رواية.js`
- `plugins/downloader/ريل.js`
- `plugins/group/شات.js`
- `plugins/group/كتم.js`
- `plugins/group/منشن.js`
- `plugins/main/ping2.js`
- `plugins/main/بينغ.js`
- `plugins/owner/بلوقن.js`
- `plugins/owner/صلاحية.js`
- `plugins/owner/نشر.js`
- `plugins/panel/انشاء_خادم.js`
- `plugins/photo/سلفير3d.js`
- `plugins/pushkontak/دفع_جهات_الاتصال.js`
- `plugins/random/لولي.js`
- `plugins/search/أنمي.js`
- `plugins/search/اطار.js`
- `plugins/search/بنتر_فيد.js`
- `plugins/search/تطبيق.js`
- `plugins/search/دارك_ويب.js`
- `plugins/search/سبوتيفاي.js`
- `plugins/search/صوره.js`
- `plugins/search/يوتيوب.js`
- `plugins/tools/صرف_العملات.js`
- `plugins/tools/صنع_تطبيق.js`
- `plugins/user/profile.js`

### استثناءات (2) — ليست بناء حمولة

- `plugins/group/منع_البوتات.js` — كاشف بوتات: يقرأ أنواع الرسائل الواردة (buttonsMessage/listMessage…) لتقدير أن المرسل بوت — لا يبني أي حمولة
- `plugins/owner/حفظ.js` — متغير نصي اسمه listMessage وفحص نوع imageMessage للوسيط المقتبس — لا يبني أي حمولة تفاعلية

### متبقٍ بلا سبب: 0

- لا يوجد.

## ملفات النواة التي تلمس Baileys منخفض المستوى

| الملف | المواضع | السبب |
|---|---|---|
| `src/lib/terboo-wa-compat.js` | 17 | توافق Baileys الرسمي rc14: عقدة biz للرسائل التفاعلية وتوقيعات المكتبة السابقة — على حدود المقبس |
| `src/lib/terboo-serialize.js` | 11 | m.reply ومساعدات الرسالة المسلسلة (نص/وسائط/بطاقات النواة) — نواة لا بلوقن |
| `src/lib/terboo-builder.js` | 10 | مكتبة بناء الرسائل القديمة المستعملة من النواة (Wrapper فوق البنّاء) |
| `src/handler.js` | 9 | إعادة كتابة الرسائل التفاعلية الواردة وتمرير الأزرار (تحليل لا بناء واجهة) ورسائل النظام |
| `src/lib/terboo-menu-delivery.js` | 7 | طبقة التسليم الموحّدة (compatibility layer الوحيدة لواجهات البلوقنات): طبقات Native Flow ← صورة ← Carousel ← نص، تحقق قبل الإرسال، سجل كل مرحلة، بديل عند الرفض |
| `src/lib/terboo-group-protection.js` | 6 | حماية المجموعة: إعادة توجيه/نسخ رسالة محذوفة كما هي (ليست واجهة أزرار) |
| `src/lib/terboo-onboarding.js` | 6 | بطاقة اللغة: تمر أولاً عبر sendCard، والطبقات منخفضة المستوى هي بديل احتياطي للأجهزة القديمة فقط |
| `src/lib/terboo-socket.js` | 6 | مقبس البوت: دوال إرسال عامة (sendMessage المساعدة) تُستعمل من النواة |
| `src/lib/terboo-auto-download.js` | 4 | ألبوم الوسائط المحمّلة (albumMessage + messageAssociation) — ليس واجهة أزرار |
| `src/lib/terboo-code-renderer.js` | 3 | عرض الكود sendRichCode — ملف محمي لا يُعدَّل (قاعدة المالك) |
| `src/lib/terboo-transport.js` | 3 | نقل الرسائل وإعادة المحاولة على حدود المقبس |
| `src/lib/terboo-latex.js` | 2 | صور المعادلات (وسيط) — ليس واجهة أزرار |
| `src/lib/terboo-interactive-builder.js` | 1 | البنّاء المركزي للحمولات (أزرار · رؤوس · Native Flow · Carousel · تحويل الأشكال القديمة) |
| `src/lib/terboo-message.js` | 1 | مساعد رسالة قديم (غير مستورد من نقاط الدخول — انظر الفحص الجنائي) |
| `src/lib/terboo-rich-response.js` | 1 | عرض الكود richResponse — ملف محمي لا يُعدَّل (قاعدة المالك) |
| `src/lib/terboo-wa-capabilities.js` | 1 | سجل قدرات واتساب: مرجع نصي لأسماء الحمولات (توثيق/تحقق) لا إرسال |

## ما تغيّر سلوكياً عند الترحيل

- `plugins/main/ping2.js`: كان يرسل رسالتين بأزرار وهمية (رقم اتصال مثالي، عرض محدود برابط google.com، نص متبقٍ غير مترجم) ⇒ بطاقة واحدة بزرّي «تحديث» و«القائمة» فقط.
- `plugins/search/دارك_ويب.js`: أزرار رد كانت ترسل الرابط كنص ⇒ أزرار فتح حقيقية (cta_url).
- `plugins/pushkontak/دفع_جهات_الاتصال.js`: إعدادات Native Flow وهمية (tap_target بنطاق shop.example.com ونص عشوائي، limited_time_offer) أزيلت؛ الأزرار والقوائم نفسها باقية.
- `plugins/user/profile.js`: أزرار قائمة «profile» من السجل المركزي عبر `sendMenu` (كانت تُبنى يدوياً من نفس السجل).
- `plugins/panel/انشاء_خادم.js`: بيانات الدخول تُسلَّم بنفس البطاقة في خاص المستلم عبر `sendCard({ to })`.
- سياق «معاد توجيهه من القناة» الزخرفي داخل بعض البطاقات لم يعد يُضاف يدوياً من البلوقن.

## الاختبارات

- `tests/terboo-menu-delivery.test.mjs`
- `tests/terboo-interactive.test.mjs`
- `tests/terboo-interactive-compat.test.mjs`
- `tests/terboo-menus.test.mjs`
- `tests/terboo-smart-buttons.test.mjs`
- `tests/terboo-dead-buttons.test.mjs`
- `tests/terboo-transport.test.mjs`
- `tests/terboo-website-button.test.mjs`
- `tests/terboo-ui-intents.test.mjs`
