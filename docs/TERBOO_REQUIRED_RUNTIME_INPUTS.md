# 🔑 Bot Terboo V6 — المدخلات المطلوبة وقت التشغيل (أسماء فقط، بلا قيم)

هذه أسماء المتغيّرات/الحقول التي يحتاجها التشغيل الفعلي. **لا تُكتب أي قيمة سرية هنا ولا في git.** القيم توضع في `config.js` (نسخة الخادم) أو متغيّرات البيئة؛ البيئة تتغلّب على `config.js`.

## واتساب / النواة
- `config.bot.primaryNumber` · `config.owner.number`
- مزوّدات الذكاء: مفاتيح في `config.APIkey.*` (الأسماء كما في `config.example.js`)

## الموقع (اختياري — §63)
- `TERBOO_WEB_ENABLED` · `TERBOO_SITE_URL` · `TERBOO_WEB_HOST` · `TERBOO_WEB_PORT` · `TERBOO_WEB_TRUST_PROXY` · `NODE_ENV`
- أو `config.website.{enabled,url,host,port,trustProxy,sessionHours,loginTtlSeconds,uploads}`

## Virtualizor — لوحة المستخدم (VPS للمشترين)
- `VIRTUALIZOR_URL` · `VIRTUALIZOR_API_KEY` · `VIRTUALIZOR_API_PASSWORD`
- أو `config.virtualizor.enduser.{url,apiKey,apiPassword}`

## Virtualizor — لوحة الإدارة + الإنشاء (المالك، §21)
- `VIRTUALIZOR_ADMIN_URL` · `VIRTUALIZOR_ADMIN_API_KEY` · `VIRTUALIZOR_ADMIN_API_PASSWORD`
- `config.virtualizor.admin.enabled`
- `config.virtualizor.provisioning.{enabled,serverId,uid,planMap,osids,virt,hostnameSuffix,credentialDelivery}`
- تشفير بيانات الاعتماد: `TERBOO_VPS_ENCRYPTION_KEY` أو `config.virtualizor.security.encryptionKey` (وإلا مفتاح Terboo الرئيسي)

## Pterodactyl (لوحات اللعب)
- `config.pterodactyl.serverN.{domain,apikey,capikey,egg,nestid,location}`

## تيليجرام VPS (عملية منفصلة — §54/§55)
- `TERBOO_TG_VPS_TOKEN` · `TERBOO_TG_VPS_OWNERS`
- أو `config.telegram.vps.{enabled,token,ownerIds,ownerUsername}`

## جلسات مواقع (اختياري)
- `KIMI_SESSION_ID` · `MONICA_SESSION_ID` (أو `config.webSessions.*`)

## DigitalOcean القديم (معزول — §23، لا يُفعَّل إلا صراحةً)
- `config.digitalocean.{token,legacyEnabled}`

## أدوات OTP القديمة (معزولة — §51)
- `config.otpTools.internetrakyatEnabled` (الافتراضي false)

## مفتاح Terboo الرئيسي للأسرار المشفّرة
- `config.security.masterKey` أو ملف `data/secure/master.key`

## مسارات تخزين وقت التشغيل (اختيارية، لها افتراضيات)
- `TERBOO_TASKS_PATH` · `TERBOO_VPS_STORE` · `TERBOO_VPS_ORDERS` · `TERBOO_AGENT_STATE_DIR` · `TERBOO_TG_USERS` · `TERBOO_TG_VPS_TOKEN`
