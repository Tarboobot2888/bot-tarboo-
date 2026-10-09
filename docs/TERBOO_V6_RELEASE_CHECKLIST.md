# ✅ Bot Terboo V6 — قائمة فحص الإصدار (§58)

يُعاد التحقق من كل بند بأمر مولِّد، لا بادّعاء.

## أوامر الفحص

```bash
npm ci                       # تثبيت نظيف (Node 22)
npm run test:syntax          # صياغة + رسم الاستيراد
node tools/terboo-run-tests.mjs   # كل الاختبارات المحلية (العدد من الناتج لا مُختلقاً)
npm run audit:strict         # صفر مخالفات (localization/branding/fonts/filenames/legacy/design)
npm run lint                 # eslint على plugins/src/case/tools/index/config
node tools/terboo-forensic-v6.mjs # 0 إخفاق صامت · 0 سر خارج config · العوائق
```

## المصفوفات المولّدة

```bash
node tools/terboo-inventory.mjs --out docs/inventory/after   # ملفات/أوامر/مضيفات/تصادمات
node tools/terboo-v6-matrices.mjs                            # ssh · pterodactyl · tasks · capability-registry · files
node tools/terboo-command-ui-matrix.mjs                      # أمر ↔ واجهة
node tools/terboo-button-audit.mjs --json                    # لا أزرار ميتة
node tools/terboo-ui-closeout.mjs                            # إغلاق ترحيل الواجهة
node tools/terboo-config-example.mjs                         # قالب بلا أسرار (0 تسرّب)
```

## بوابات القبول

- [ ] `test:syntax` يمر.
- [ ] كل الاختبارات المحلية خضراء (العدد الفعلي من مخرجات الـrunner).
- [ ] `audit:strict` = صفر مخالفات.
- [ ] `lint` نظيف.
- [ ] `terboo-forensic-v6`: 0 إخفاق صامت · 0 نص يشبه سراً خارج config.js.
- [ ] الملفات الخمسة لعرض الكود موجودة بلا تغيير (يتحقق منها `tools/terboo-package.mjs` بصمةً).
- [ ] `config.example.js` مولّد بلا أي قيمة سرية.
- [ ] الإصدار V6 موحّد (package · config.bot.version · brand · docs).
- [ ] التسجيل اختياري (لا بوابة).
- [ ] DigitalOcean القديم وأداة OTP معزولان ومعطّلان افتراضياً.
- [ ] مُنشئ VPS لا يعلن نجاحاً قبل التحقق، ولا يعيد الإنشاء بعد انقطاع.
- [ ] الموقع: كوكي HttpOnly/Secure/SameSite · CSRF · owner-only server-side.

## الاختبارات الحيّة (§56)

تحتاج بيئة ومفاتيح حقيقية ولا تُشغَّل في CI المغلق:
```bash
npm run test:live   # ai-provider-smoke · local-image-enhancement · code-review.live · scraper-live
```
تُسجَّل نتائجها بصدق عند توفّر البيئة؛ في هذه البيئة = **غير مُشغَّلة (محجوبة بالبيئة)**.
