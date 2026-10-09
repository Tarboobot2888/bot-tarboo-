# 🔒 Bot Terboo V6 — أمان الموقع (§46 §64 §67)

كل بند من §46 وأين يُحقَّق:

| البند | التحقيق |
|---|---|
| رؤوس أمان + CSP | `SECURITY_HEADERS` على كل رد: CSP `default-src 'self'` · `script-src 'self'` (لا inline script) · `object-src 'none'` · `frame-ancestors 'none'` · nosniff · `X-Frame-Options: DENY` · Referrer-Policy · COOP/CORP · Permissions-Policy. |
| كوكي آمن | `terboo_sid`: HttpOnly · SameSite=Strict · Secure (إنتاج) · Max-Age؛ يحمل معرّفاً عشوائياً يُخزَّن مجزّأً. |
| CSRF | double-submit: رمز الجلسة + رأس `X-CSRF-Token` لكل طلب مغيّر؛ الطلب بلا تطابق ⇒ 403. |
| CORS allowlist | نفس الأصل فقط؛ أي `Origin` يخالف `config.website.url` ⇒ 403. لا انعكاس لـOrigin غريب. |
| rate limiting | نافذة لكل IP (120/دقيقة عام · 12/دقيقة لمسار الدخول) ⇒ 429. |
| حدّ حجم الطلب | جسم JSON ≤ 1MB ⇒ 413. |
| validation | كل مدخل يُتحقَّق ويُقتطع؛ JSON غير صالح ⇒ 400. |
| MIME | الملفات الساكنة بأنواع صريحة من قائمة بيضاء. |
| اجتياز المسار | المسار يُحلّ ويُتأكَّد أنه داخل `public/` فقط ⇒ 403 خارجها؛ `..` و`%2e%2e` محجوبة. |
| SSRF | الموقع لا يجلب روابط يحددها المستخدم؛ الأدوات تمر بطبقة HTTP الموحّدة وحارس SSRF الموجود. |
| XSS | الواجهة تبني DOM بـ`document.createTextNode` (لا `innerHTML` لبيانات المستخدم). |
| حقن | لا SQL؛ التخزين JSON عبر طبقة واحدة بمفاتيح مضبوطة. |
| brute force | تحديات الدخول: 8 محاولات ثم حظر التحدي؛ rate limit على مسار الدخول. |
| audit log | عمليات الحساسة تُسجَّل عبر `terboo-agent-audit` (بلا أسرار). |
| secret redaction | `registerSecret`/`redactSecrets` + `/health` و`/meta` بلا أسرار (اختبار يتحقق). |
| error sanitization | كل خطأ يُطبَّع إلى `{ ok:false, code, requestId }`؛ لا أثر مكدّس للعميل. |

## ما لا يسمح به الموقع (§46 §67)

- لا قراءة نظام ملفات عشوائية (الساكن محصور في `public/`، والملفات بمعرّفات مخزّنة).
- لا تنفيذ عمليات (لا shell، لا eval من الموقع).
- لا استرجاع أسرار من الواجهة.
- لا وصول لبيانات داخلية أو ميتاداتا.
- لا SSRF لمضيفات إدارية/خاصة.
- **الدور لا يُقبل من العميل**: `owner=true`/`isOwner=true` في الجسم أو الرؤوس لا تمنح شيئاً؛ الدور من الهوية القانونية و`principalFor` server-side (اختبار يتحقق). لوحة المالك server-side فقط.

## الثوابت المحفوظة (§67)

نفس محرّك الصلاحيات المركزي يحكم كل إجراء من الموقع كما من واتساب: ملكية الموارد، صلاحيات المجموعة، عزل الأسرار، التأكيد على المدمّر، privateOnly. الموقع لا يتجاوز أياً منها لأنه يستدعي نفس `decide`/الخدمات.

## الاختبار

```bash
node tests/terboo-website.test.mjs
```
10 سيناريوهات على خادم حقيقي: رؤوس الأمان، دخول واتساب + جلسة HttpOnly، CSRF، منع ترقية العميل، owner-only، اجتياز المسار، الخروج، الأدوات/المهام، تحديد المعدّل.
