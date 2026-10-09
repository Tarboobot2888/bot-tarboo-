# 🔒 Bot Terboo V6 — إغلاق الإخفاق الصامت والأمان (§27 §51 §67)

## الإخفاق الصامت (§27)

القاعدة: لا `catch` فارغ، ولا `catch` بتعليق فقط، ولا `catch { return <ثابت> }`، ولا `.catch(() => {})` أو `.catch(() => null)` في أي ملف إنتاج. كل catch إما يُسجِّل عبر `noteFailure` (بلا أسرار)، أو يُطبع سبباً، أو يتحول لفحص صريح لا يرمي أصلاً.

**التغطية:** امتد اختبار `tests/terboo-no-silent-catch.test.mjs` من `src` و`plugins` فقط إلى **كل شجرة الإنتاج**: `index.js` · `config.js` · `case` · `tools` · `src` · `plugins` · `web/website`. آخر تشغيل: **1217 ملفاً · 0 إخفاق صامت · 793 موضع تسجيل**.

### ما عولج خارج النطاق السابق (25 موضعاً)

| الملف | المعالجة |
|---|---|
| `index.js` (×4) | تهيئة الوكيل، حفظ ذاكرة LID، SIGTERM flush، anti-tag SW ⇒ `noteFailure("boot", …)`. |
| `config.js` (×7) | فحوص المالك/المميز/الشريك/المحظور/الاسم ⇒ `noteFailure("config", …)` بموضع دقيق. |
| `case/terboo.js` | فشل رد الخطأ للمستخدم ⇒ `noteFailure("case", …)` بدل ابتلاعه. |
| أدوات التحليل (`audit-external-apis` · `check-external-hosts` · `classify-external-apis` · `terboo-inventory`) | تحليل الروابط صار فحصاً صريحاً `URL.canParse` بدل `try/catch` يبتلع. |
| `terboo-audit` · `immutableApiValues` | `fs.existsSync` صريح بدل ابتلاع غياب `config.js`. |
| `terboo-manifest` (×3) | قراءة التصدير ترمي عند الفشل الحقيقي؛ تحميل case يُطبع سببه؛ حذف المجلد المؤقت بـ`force` بلا ابتلاع. |
| `terboo-dependency-truth` | `require.resolve`: `MODULE_NOT_FOUND` جواب مقصود، غيره يُطبع. |
| `terboo-brand-assets` | `grep` يخرج بـ1 حين لا يجد (جواب)، غيره يُرمى. |
| `terboo-static-audit` | `fs.access`: `ENOENT/ENOTDIR` ⇒ false، غيره يُرمى. |
| `terboo-command-ui-matrix` · `terboo-inventory` | حذف المجلد المؤقت بـ`force: true` بلا ابتلاع. |

## عزل OTP (§51)

`plugins/owner/internetrakyat.js` يرسل OTP لأرقام قد لا تخص المستخدم. لم يُحذف الملف، لكنه عُزل:

- `legacy: 'otp-abuse-risk'`؛
- `isEnabled: config.otpTools?.internetrakyatEnabled === true` — **معطّل افتراضياً**؛
- وهو بذلك خارج فهرس الذكاء (الفهرس يتخطى `isEnabled === false`).

الإعداد الجديد `config.otpTools.internetrakyatEnabled` (ليس من حقول API) يبقى `false` ما لم يفعّله المالك صراحةً.

## عزل DigitalOcean (§23)

`plugins/vps/*.js` معطّلة ما لم يُفعَّل `config.digitalocean.legacyEnabled`، وفي الخاص فقط إن فُعّلت، وخارج فهرس الذكاء. التفاصيل في `docs/TERBOO_V6_VPS_PROVISIONING.md`.

## الأسرار (§67)

- `tests/terboo-no-silent-catch` + مُخفي الأسرار (`registerSecret`/`redactSecrets`) + فاحص `config.example` (0 تسرّب على 20 قيمة حساسة).
- الفحص الجنائي `node tools/terboo-forensic-v6.mjs` يمسح شجرة الإنتاج كلها بحثاً عن نصوص تشبه الأسرار خارج `config.js`: **0**.
- كلمة مرور root لإنشاء VPS تُولَّد بالتشفير وتُسجَّل للإخفاء ولا تُخزَّن (اختبار المُنشئ يتحقق على كل المخرجات).

## جرد الواجهات الخارجية (§51)

- المضيفات الخارجية المكتشفة تُسرد بـ`node tools/terboo-inventory.mjs` (`docs/inventory/after/apis.json`).
- التصنيف (عام · يحتاج مفتاح · حساس) في `docs/EXTERNAL_API_CLASSIFICATION.md`، ويُولَّد بـ`tools/classify-external-apis.mjs`.

## إعادة التوليد

```bash
node tools/terboo-forensic-v6.mjs       # 0 إخفاق صامت · 0 سر · العوائق المتبقية
node tests/terboo-no-silent-catch.test.mjs
node tools/terboo-audit.mjs --strict
```
