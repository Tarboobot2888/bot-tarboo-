# 🌐 Bot Terboo V6 — معمارية الموقع

يغطي الأقسام 30–45 و63–66 من خطة V6.

## المبدأ: مصدر حقيقة واحد

```
WhatsApp · Telegram · Website
          │
          ▼
  طبقة الخدمة المشتركة  (src/lib/terboo-web-services.js)
          │
  النواة · محرّك الإجراءات · سجل القدرات · محرّك المهام · الذاكرة · المزوّدات · قاعدة البيانات
```

الموقع **لا يعيد كتابة أي أمر**. `terboo-web-services` يستدعي نفس:
`terboo-ai-core` · `terboo-action-engine` · `terboo-capability-registry` · `terboo-task-queue` ·
`providers/virtualizor/*` · `terboo-group-directory` · `terboo-database`.

## المكدّس

- **Node 22، بلا تبعيات خارجية.** الخادم `web/server.js` على `node:http`؛ الواجهة SPA بـvanilla ESM. لا React/Vite/Fastify حتى لا نضيف سطح هجوم أو تبعيات لا تُثبَّت في البيئة المغلقة — الشروط (أنواع مُتحقَّقة، كوكي آمن، CSP، CSRF، rate limit، validation، request id، audit) كلها محقَّقة بدونها.
- التشغيل: داخل عملية البوت تلقائياً خلف `config.website.enabled` مع ربط الجلسة الحيّة (`getSocket`)، أو مستقلاً `npm run web`.

## طبقات الطلب (`/api/v1`)

كل طلب: تحقق الجلسة server-side ← الدور server-side ← CSRF للطلبات المغيّرة ← rate limit ← request id ← تطبيع الخطأ. العميل **لا يمرّر** `owner=true`: الدور من `principalFor(session.canonical)` فقط.

| الموديول | المسار | الخدمة |
|---|---|---|
| meta | `GET /api/v1/meta` | اسم/إصدار/لغات/رابط (بلا أسرار) |
| auth | `challenge · poll · session · logout` | تحدٍّ ← تأكيد واتساب ← جلسة server-side |
| profile/usage | `profile · usage · profile/language` | نفس `terboo-profile` (user.profile.usage) |
| ai | `POST ai/chat` | نفس النواة (محرّك الإجراءات ثم مزوّد الدردشة) |
| tools | `GET tools` | `capabilitiesFor(role)` — الحقيقي فقط |
| tasks | `tasks · tasks/:id · tasks/:id/cancel` | نفس `terboo-task-queue` (مملوكة بالهوية) |
| vps | `GET vps` | نفس سجل الصلاحيات المشترك |
| downloads/games | `GET downloads · games` | سجل الملفات · الألعاب من سجل القدرات |
| owner | `owner/health · owner/groups · owner/groups/:id/members · owner/audit` | server-side فقط |

## المصادقة (§32)

1. العميل يطلب `POST /auth/challenge` ⇒ رمز من 6 أرقام (يُخزَّن مجزّأً، TTL قصير).
2. المستخدم يرسل للبوت على واتساب: `.ويب <الرمز>` (`plugins/user/ويب.js`) ⇒ `confirmChallenge(code, canonical)` يربطه بهويته القانونية.
3. `POST /auth/poll` يستهلك التحدي المؤكَّد ويصدر جلسة server-side.
4. الكوكي `terboo_sid` = **HttpOnly · SameSite=Strict · Secure** (في الإنتاج)؛ يحمل المعرّف فقط، ويُخزَّن مجزّأً في القاعدة.
5. CSRF = double-submit: رمز في الجلسة + رأس `X-CSRF-Token` للطلبات المغيّرة.
6. لا يصل للواجهة أبداً: حالة Baileys، مفاتيح الجلسة، اعتماد المزوّدات، الذاكرة الخاصة.

## الوقت الحقيقي (§43)

قناة SSE واحدة `GET /api/v1/stream` (مربوطة بالجلسة): تقدّم/إتمام المهام المملوكة للمستخدم فقط + heartbeat. لا طبقات متنافسة.

## قاعدة البيانات والتخزين (§44 §45 §61 §62)

- `src/lib/terboo-web-store.js` يخزّن التحديات/الجلسات/الملفات عبر `terboo-database.setting()` نفسها (حفظ ذري) — لا قاعدة منفصلة.
- هجرة مرقّمة (`SCHEMA_VERSION`) idempotent مع نسخة احتياطية قبل أي تطبيع.
- الملفات: `id · owner · mime · size · checksum · scope · expiry`؛ تنظيف دوري يحذف المنتهي من القرص (`web/lib/cleanup.js`). لا قراءة نظام ملفات عشوائية.

## السياق عبر القنوات (§65 §66)

المهام مملوكة بالهوية القانونية، فالمستخدم المصادَق على الموقع يرى مهامه التي بدأها من واتساب والعكس (`tasks` تفلتر بـ`owner === canonical`). privacy scope محفوظ: لا يرى أحد مهام غيره.

## النشر (§63)

- `web/package.json` · `web/.env.example` · `GET /health` · `GET /ready` · `GET /api/v1/meta` (بلا أسرار).
- خلف reverse proxy: فعّل `TERBOO_WEB_TRUST_PROXY=1` ليُقرأ `X-Forwarded-For`، واجعل الـproxy ينهي TLS ويضبط `NODE_ENV=production` ليصبح الكوكي Secure. مثال Nginx: `proxy_pass http://127.0.0.1:8787; proxy_set_header X-Forwarded-For $remote_addr;`.

## الحدود الحالية

- الإجراءات التي تحتاج اتصال واتساب الحيّ (أعضاء المجموعات، إجراءات المجموعة) تتوفّر فقط حين يعمل الموقع **داخل عملية البوت** (ربط `getSocket`)؛ في وضع `npm run web` المستقل تُرجِع `bot-offline`.
- دردشة AI على الموقع تغطي المحادثة والسحابة/السيرفر/المهام/الإنشاء (مسار محرّك الإجراءات نفسه)؛ إجراءات المجموعة من الموقع تحتاج سياق مجموعة محدَّد (غير مشمول في هذا الإصدار).
- رفع الملفات: السجل والبنية جاهزان؛ نقطة الرفع نفسها لم تُفعَّل في هذا الإصدار (تُضاف كنقطة POST تنشئ سجل ملف بنفس حدود `config.website.uploads`).
