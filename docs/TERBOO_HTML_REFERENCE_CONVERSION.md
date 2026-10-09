# TERBOO ARCADE — تحويل المرجع إلى نظام HTML 3D

## عناصر التصميم

| النمط | التنفيذ |
|---|---|
| خلايا مستديرة بحواف مضيئة | `gridHtml()` و`.ta-cell` في نظام التصميم |
| إطار متدرج ثلاثي الأبعاد | `.ta-board` مع bevel وعمق وظلال متعددة |
| شارة الحالة والرأس | `.ta-head` و`.ta-pill` |
| شارات اللاعبين وتحديد الدور | `.ta-chip.on` وألوان المقاعد |
| إظهار الفوز والحركة الأخيرة | خصائص `hl` و`pop` في View Model |
| ألوان مخصصة للخلايا | `cell.c` أو `cell.color` بعد التحقق من صيغة HEX |
| حركات مريحة | `@keyframes ta-pop` مع احترام `prefers-reduced-motion` |

## بنية العرض الحالية

```text
engine.getView(room)
  ├─ buildGameHtml(view)
  │    ├─ htmlGameRegistry: grid / track / lines
  │    ├─ view.image (إن وجد) → HTML board وليس ملف صورة
  │    └─ validateTemplate → encodeTransport → WAProto validate/encode/decode/verify
  ├─ buttonsView(view) → أزرار وقائمة واتساب بعناصر Action ID + nonce
  └─ textView(view) → بديل نصي متوافق مع العملاء
```

لا يوجد في مسار TERBOO ARCADE مولّد SVG→PNG/JPEG بعد الترحيل. الألعاب القديمة التي كانت تحتوي معاينات مرئية أصبحت ترسل بطاقة HTML وصفية، مع إبقاء الأزرار النصية الأصلية، من دون تغيير منطق اللعبة أو المكافآت.

## ما لا يفعله HTML داخل واتساب

- لا توجد `<script>` أو سمات أحداث في البطاقة؛ المدقق يرفضها.
- البطاقة تمثيل للحالة وليست مصدر الحقيقة أو واجهة نقرات مباشرة.
- لا توجد `botMetadata` أو شهادات أو تواقيع أو `trusted_sources` مستنسخة.
- لا يُعلن جسر حركة HTML مفعّلاً. الأزرار الأصلية والإدخال النصي يستمران عبر تحقق الخادم، واللعب التفاعلي الكامل متاح من صفحة `/play/<token>`.

## النقل

`encodeTransport(html, meta)` ينفذ build → serialize → WAProto validate → encode → decode → verify (SHA-256). الوضع الافتراضي بعد هذا الترحيل `rich`، والإيقاف الصريح عبر متغير البيئة `TERBOO_ARCADE_HTML=off`. قبول وعرض هذا النوع من الرسائل يختلف حسب نسخة عميل واتساب، لذلك يجب اختبار التشغيل الفعلي على الأجهزة المستهدفة قبل الاعتماد عليه وحده.
