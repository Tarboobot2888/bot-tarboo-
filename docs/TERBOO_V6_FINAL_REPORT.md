# Bot Terboo — التقرير النهائي لتحديث V6

> **خط الأساس:** الـcommit رقم `36c488d`. هو لقطة BEFORE، وأُخذ قبل أي تعديل.
>
> **قواعد هذا التقرير:**
> - كل الأرقام هنا من أدوات المستودع نفسه، وكل أداة مذكور مكانها.
> - لا توجد في التقرير أي قيمة سر.
> - كل حالة مكتوبة بإحدى الكلمات: **تم** · **تم جزئياً** · **لم يتم** · **blocked by external provider** · **deprecated**.

---

## 1) خلاصة

| البند | النتيجة |
|---|---|
| الاختبارات المحلية | **104/104 ناجحة** (`node tools/terboo-run-tests.mjs`). وهناك 3 اختبارات live تحتاج مفاتيح حقيقية، ولم تُشغَّل هنا. |
| التدقيق الصارم | **صفر مخالفات** (`node tools/terboo-audit.mjs --strict`) |
| ESLint على كل الملفات المعدّلة | **0 أخطاء** |
| أوامر فُقدت بين BEFORE وAFTER | **0** |
| مرادفات فُقدت بلا بديل | **0**. هناك 31 مرادفاً صارت أوامر مستقلة بعد حل التعارضات، ومرادف واحد (`رسم`) حُذف بالخطأ ثم أُعيد. |
| أزرار ميتة | **0 من 116** زرّاً، تشير إلى 48 أمراً |
| أدوات AI خارج محرك الصلاحيات المركزي | **0 من 45** |
| تسريب أسرار config بعد الإخفاء | **0 من 14** حقلاً |
| زمن البوت نفسه، بدون المزوّد (p50) | **4.1 ms** لرسالة محادثة |

---

## 2) التسليمات A–T

| # | التسليم | المسار | الحالة |
|---|---|---|---|
| A | before manifest | `TERBOO_V6_BEFORE_MANIFEST.json` · `docs/inventory/before/*` | تم |
| B | after manifest | `TERBOO_V6_AFTER_MANIFEST.json` · `docs/inventory/after/*` | تم |
| C | plugin health report | `docs/terboo-plugin-health.json` | تم |
| D | API health matrix | `docs/terboo-api-health-matrix.json` · `.md` | تم جزئياً (انظر §6) |
| E | AI tools matrix | `docs/v6/ai-tools-matrix.json` · `docs/terboo-tool-registry.json` · `docs/terboo-ai-capabilities.json` | تم |
| F | permission matrix | `docs/terboo-permission-matrix.json` | تم |
| G | group action matrix | `docs/terboo-group-action-matrix.json` | تم |
| H | SSH capability matrix | `docs/v6/ssh-capability-matrix.json` | تم |
| I | Pterodactyl capability matrix | `docs/v6/pterodactyl-capability-matrix.json` | تم |
| J | Virtualizor capability matrix | `docs/terboo-vps-permissions.json` | تم |
| K | task/background matrix | `docs/v6/task-background-matrix.json` | تم |
| L | UI capability matrix | `docs/terboo-command-ui-matrix.json` · `docs/terboo-button-audit.json` | تم |
| M | removed/deprecated report | `docs/v6/removed-deprecated-report.json` | تم |
| N | security audit | §5 في هذا الملف · `docs/TERBOO_SECRETS_ROTATION.md` | تم |
| O | performance/latency | §7 · `docs/v6/performance-compare.json` · `docs/v6/performance-stages.md` | تم |
| P | complete test report | `docs/v6/test-report.json` | تم |
| Q/R/S | files changed / created / removed | `docs/v6/files-report.json` | تم |
| T | architecture | §8 في هذا الملف | تم |

**إعادة توليد التسليمات:**

```
node tools/terboo-inventory.mjs --out docs/inventory/after
node tools/terboo-forensic-snapshot.mjs --out TERBOO_V6_AFTER_MANIFEST.json
node tools/terboo-forensic-snapshot.mjs --compare TERBOO_V6_BEFORE_MANIFEST.json TERBOO_V6_AFTER_MANIFEST.json
node tools/terboo-v6-matrices.mjs
node tools/terboo-button-audit.mjs --json
```

---

## 3) المراحل 1–16

| المرحلة | الحالة | ماذا تغيّر | كيف تم التحقق |
|---|---|---|---|
| 1 Inventory | تم | لقطة BEFORE كاملة: بلوقنات، أوامر، APIs، صلاحيات، كتابات قاعدة البيانات، مؤقتات، transport | `36c488d` |
| 2–3 Architecture + Plugin/API audit | تم | حل تعارضات الأسماء، طبقة HTTP موحدة، صحة 910 بلوقن | `8131312`، plugin health، API matrix |
| 4 Central permissions | تم | `decide`/`principalOf`/`protectTargets` لخمسة أدوار: owner، group-admin، panel-owner، vps-buyer، user | 48 إجراء في المصفوفة + اختبارات |
| 5 Universal AI action engine | تم | تخطيط متعدد الخطوات وتحقق بعد التنفيذ. أدوات المجموعة والمراسلة وSSH والسحابة تمر من النواة الواحدة. | `terboo-ai-agent-actions` · `terboo-ai-runtime` |
| 6 Group bulk | تم | منفّذ دفعات مع تحقق بعد كل دفعة. لا تُعاد المحاولة إلا لما ثبت أنه لم يُطبَّق. فيه إلغاء ونقطة استئناف. قفل/فتح فوري أو مجدول، وحظر. | `terboo-bulk-executor` (11 فحصاً) · `terboo-group-actions` (16 فحصاً) |
| 7 Messaging + broadcast | تم | `sendToContact` (تطبيع الرقم، `onWhatsApp`، منع التكرار، حد المعدل) وإذاعة عبر البوتات الفرعية (مرسل واحد لكل مجموعة) | `terboo-messaging` (10 فحوص) |
| 8 SSH + remote workspace | تم | ssh2 مع تثبيت البصمة قبل المصادقة، argv فقط، سياسة read/write/denied، SFTP داخل مساحة العمل، نشر zip ثم إصلاح بالـAI ثم إعادة اختبار | `terboo-ssh` (11 فحصاً) · `terboo-ssh-agent` (8 فحوص)، على خادم ssh2 حقيقي داخل الاختبار |
| 9 Pterodactyl | تم | طبقة مالك واحدة فوق `panelRequest` المحروس. 9 بلوقنات قديمة انتقلت إليها من axios. الحذف والتعليق يُتحقق منهما. | `terboo-cloud-admin` (6 فحوص) |
| 10 Virtualizor admin | تم جزئياً | قراءة VPS، تشغيل وإيقاف، تعليق وإلغاؤه، المستخدمون، `awaitState`. **إنشاء VPS (provisioning) لم يُنفّذ** (انظر سيناريو 11). | `terboo-virtualizor` · `terboo-cloud-admin` |
| 11 Tasks/resume | تم | `notBefore`، الإلغاء بالتلميح («وقف التنصيب»)، استئناف صادق | `terboo-task-resume` · `stop-install-only` · `truthful-resume-after-restart` |
| 12 UI migration | تم | 13 زرّاً ميتاً أُصلحت. تدقيق دائم في `tools/terboo-button-audit.mjs` واختبار يمنع رجوعها. | `terboo-dead-buttons` |
| 13 Security hardening | تم | انظر §5 | §5 |
| 14 Full tests | تم | 104/104 | `docs/v6/test-report.json` |
| 15 Regression | تم | مقارنة BEFORE/AFTER، ومقارنة زمن الاستجابة بين النسختين | §4 · §7 |
| 16 Final cleanup | تم | تقارير A–T، وثيقة تدوير الأسرار، حزمة ZIP | هذا الملف |

---

## 4) الانحدار: BEFORE ← AFTER

**الأرقام العامة:**

| البند | BEFORE | AFTER |
|---|---|---|
| ملفات | 1615 | 1677 (تشمل تقارير docs/v6) |
| أوامر | 1213 | 1224 (+11 جديدة، 0 محذوفة) |
| ملفات الاختبار | 98 | 107 |
| `missingImports` | 0 | 0 |
| وحدات المصدر القابلة للوصول | 238 | 252 |

**الأوامر الجديدة:** `ssh` · `اعلان_مجموعة` · `تثبيت_رسالة` · `جرأة` · `خاطرة` · `ساوند_رابط` · `فحص_عراف` · `فن_ذكي` · `مكالمة_وهمية` · `موسيقى02` · `ميم_دريك`.
معظمها أسماء مستقلة أخذتها بلوقنات كانت محجوبة بسبب تعارض الأسماء.

**الـ31 مرادفاً:** كان كل اسم منها مرادفاً لبلوقن، وفي نفس الوقت اسم أمر لبلوقن آخر. بعد حل التعارض أصبح الاسم للأمر نفسه. القائمة في `aliasesMovedToOwnCommand`. لا اسم منها يعطي «أمر غير موجود».

**إصلاح أثناء المقارنة:** مرادف `رسم` لأمر `صورة` حُذف في المرحلة 2/3 لأنه اعتُبر «محجوباً»، لكن لم يكن هناك أي مالك آخر للاسم. **أُعيد.**

**deprecated (2):**
- `plugins/canvas/avatarjpg.js`: نسخة مكررة من `مكالمة.js`، والوظيفة متاحة بأمر `.مكالمة_وهمية`.
- `plugins/search/asiariyadh.js`: نسخة مكررة من `كرة.js`.

**blocked by external provider (2):**
- `plugins/info/مباريات.js`: الخدمة لا ترد (timeout).
- `plugins/search/فلم.js`: الخدمة لا ترد (timeout).

---

## 5) تدقيق الأمان (N)

| البند | الحالة | الدليل |
|---|---|---|
| محرك صلاحيات مركزي لكل أدوات AI | تم | `docs/v6/ai-tools-matrix.json`: 45 أداة إجراء، و0 أداة بلا مقابل في المحرك |
| أدوات السحابة تمر من `decide()` | تم (جديد في هذه المرحلة) | `cloudPermission` في `src/lib/terboo-cloud-tools.js`. الاختبار `cloud-tools-central-permission`: VPS ليس ملكك يُرفض بـ `resource-not-owned` حتى لو تجاوز الهدف طبقة الاختيار. |
| الإسناد بالكلام الطبيعي للمالك فقط | تم (جديد) | `assignVps` في action-engine يمر من `decide("vps.admin.entitle")`. غير المالك يحصل على رفض صريح ولا يصل للأمر. |
| لا JID يختاره النموذج | تم | `model-cannot-pick-number` · `model-tools-names-only` |
| الأسرار مسجّلة للإخفاء من الإقلاع | تم | `terboo-secrets-boot.js` أول import في `index.js`. 14 حقلاً، و0 تسريب بعد `redactSecrets`. |
| مخرجات eval و`=>` و`$` للمالك | تم | تمر عبر `redactSecrets`، والأخطاء كذلك |
| كوكيز جلسات داخل البلوقنات | تم | Kimi وMonica نُقلت إلى `config.js` → `webSessions`، والبيئة تتغلب عليها، ومسجّلة للإخفاء |
| shell strings | تم | `execFile` بمصفوفة argv في تشويش وضغط ونسخ_صوتي وصوت handler. `queueFFmpeg` يرفض عوامل الـshell (الفاصلة المنقوطة، &، الأنبوب، `$(`، علامة backtick، سطر جديد) والتحويل لمسارات خارج `/dev/null` (`UNSAFE_COMMAND`). |
| SSH | تم | 26 أمراً مصنّفاً فعلياً بـ `classify()`: 8 قراءة، 6 كتابة بتأكيد، 12 مرفوضة (bash، sudo، dd، mkfs، `/etc/shadow`، مفاتيح ssh، خارج مساحة العمل، أنابيب). كلمات المرور في الشات مرفوضة وتُمسح. |
| SSRF في اللوحات | تم | `panelRequest` محروس. نطاق المالك وحده مسموح عبر `allowHosts`. |
| لا نجاح وهمي | تم | `23-no-fake-success` · `provider-ok-but-not-verified` · الحذف ثم قراءة `not-found` |
| أسماء ملفات `#Uxxxx` | تم | 0 |
| **مخاطر باقية** | — | انظر الجدول التالي |

**المخاطر الباقية:**

| الخطر | الوضع |
|---|---|
| أسرار مكشوفة في مستودع عام | `config.js` يحمل المفاتيح بقرار المالك، والمستودع عام. **التدوير إلزامي** وموثّق بالأسماء فقط في `docs/TERBOO_SECRETS_ROTATION.md`. |
| مفاتيح مضمّنة في الكود | 4 ملفات بلوقن/سكرابر ما زالت فيها مفاتيح مكتوبة. مذكورة بالاسم في نفس الوثيقة. |
| `plugins/owner/internetrakyat.js` | يرسل طلبات OTP لخدمات طرف ثالث على رقم يحدده المستخدم. هذا خطر إساءة استخدام وخطر قانوني. **أوصي بتعطيله**، والقرار للمالك. لم يُلمس. |
| مهام لا تُستأنف بعد إعادة التشغيل | `video.understand` و`document.analyze` بلا منفّذ مسجّل. تُعلَّم «توقفت» بصدق ولا يُدّعى استئنافها. |

---

## 6) ما لم يمكن اختباره ولماذا

- **واتساب حقيقي، وVirtualizor حقيقي، ولوحة Pterodactyl حقيقية، وVPS حقيقي عبر SSH:** كل المسارات اختُبرت على بدائل محلية.
  - SSH اختُبر على **خادم ssh2 حقيقي** داخل الاختبار، فيه bash وSFTP.
  - اللوحات وVirtualizor اختُبرت على خوادم HTTP محلية تحاكي الـAPI الموثّق.
  - **لم يُنفّذ أي إجراء إنتاجي مدمّر لمجرد الاختبار**، التزاماً بالقاعدة.
- **API health matrix:** تقيس **وصول المضيف فقط**: 320 من 350 يصل، 18 لا يصل، 12 متخطّى. لم يُستدعَ أي endpoint بمفتاح (`endpointVerified: 0`)، حتى لا تُستهلك المفاتيح أو تُكشف.
- **الاختبارات الـ3 live** (`npm run test:live`): تحتاج مفاتيح ومزوّدين حقيقيين.

---

## 7) الأداء (O)

نفس السيناريوهات شُغّلت على نسخة الأساس `36c488d` وعلى النسخة الحالية.
زمن المزوّد محاكى (800 ms)، والـscraper محاكى (1200 ms)، و3 تشغيلات لكل سيناريو.

| السيناريو | TTFR قبل | TTFR بعد | نداءات النموذج |
|---|---|---|---|
| رسالة محادثة واحدة | 830 ms | 851 ms | 1 ← 1 |
| رسالتان سريعتان (300 ms) | 1310 ms | 1315 ms | 2 ← 2 (رد واحد) |
| إلغاء أثناء التفكير | 1 ms | 1 ms | 1 ← 1 |
| رابط TikTok (أداة مباشرة) | 2 ms | 3 ms | 0 ← 0 |

- الفرق داخل هامش القياس. **لا تراجع في الأداء.**
- زمن البوت نفسه p50/p95، لـ 20 تشغيلاً:
  - محادثة: 4.1 / 43.7 ms
  - مسار scraper سريع: 2.4 / 4.2 ms
  - الذاكرة: 0.6 / 1.6 ms
- التفاصيل في `docs/v6/performance-stages.md`.

---

## 8) البنية (T)

```
WhatsApp (Baileys 7.0.0-rc14, ESM)
  └─ connection.js ─ handler.js ─ serialize (LID/PN identity)
        │
        ├─ Commands ── terboo-plugins registry (910 plugins, 1224 commands)
        │                └─ Smart UI / transport مركزي (116 زر، 0 ميت)
        │
        └─ AI Core (عقل واحد: ai-core · ai-router · ai-providers)
              ├─ Intent gate (fast path) ── Action engine (خطوات · مرجع · سياق)
              ├─ Target resolver (group directory · member resolver · context engine)
              ├─ Central Permission Engine  decide() / principalOf() / protectTargets()
              │     ↑ كل أداة: group.* · message.* · broadcast.* · ssh.* · project.deploy · vps.* · panel.*
              ├─ Tool registry (103 أداة قراءة/وسائط) + Action tools (45)
              ├─ Bulk executor (دفعات · تحقق · إعادة محاولة مثبتة · إلغاء · checkpoint)
              ├─ Task queue (persist · notBefore · cancel/resume الصادق · runners)
              └─ Provider adapters
                    ├─ Virtualizor (end-user + admin) ─ entitlements
                    ├─ Pterodactyl (client لكل مستخدم + application للمالك) ─ net-guard
                    ├─ SSH manager (vault · pinned host key · argv policy · SFTP workspace)
                    │     └─ Remote workspace: ingest → inspect → upload → build → run → observe → AI fix → retest
                    └─ Messaging / Broadcast (child bots)
  Secrets: config.js (+ env override) → registerConfigSecrets عند الإقلاع → redactSecrets في console/eval/errors/AI
```

---

## 9) سيناريوهات القبول العشرون

| # | السيناريو | الحالة | الدليل |
|---|---|---|---|
| 1 | «اطرد أحمد» | تم | `02-kick-pronoun-lid` · `kick-lid-member` |
| 2 | «اطرد الكل إلا أحمد» | تم | `kick-all-except-ahmed-batches` |
| 3 | «اطرد كل الأعضاء» | تم | `kick-all-technical-limits` · `kick-all-admin-needs-owner` |
| 4 | «ارفع أحمد أدمن» | تم | `04-promote-pronoun` · `selected-promote-and-demote` |
| 5 | «اقفل الجروب» | تم | `lock-now-verified` |
| 6 | «افتح الجروب» | تم | `unlock-later-scheduled-and-cancel` · `lock-for-duration` |
| 7 | «وقف التنصيب» | تم | `stop-install-only` |
| 8 | إذاعة من كل البوتات الفرعية | تم | `broadcast-all-bots` · `broadcast-dry-run` · `broadcast-stop-and-resume` |
| 9 | «ابعت للرقم …» | تم | `send-local-number` · `not-on-whatsapp` · `duplicate-not-resent` |
| 10 | «اعمل بلوك لأحمد» | تم | `block-owner-only-with-confirm` |
| 11 | «اعمل VPS للمستخدم …» | **لم يتم** | انظر الملاحظة بعد الجدول |
| 12 | «اربط المستخدم … بالـVPS 1234» | تم | `owner-assign` يتحقق عند المزوّد ويرفض VPS مسنداً لغيره. `notifyBuyer` يشعر المشتري. المسار الطبيعي أُضيف واختُبر في `natural-cloud-requests`. |
| 13 | «شغل السيرفر بتاعي» | تم | `isolation` · `actions` · `natural-cloud-requests` |
| 14 | التحكم في VPS ليس له | تم | `isolation` (`no-entitlement`) · `cloud-tools-central-permission` |
| 15 | المستخدم ينفّذ أداة مالك | تم | `stranger-denied` (SSH والمراسلة) · `member-denied` · `fallback-never-runs-owner-tool` |
| 16 | zip ثم «شغله على VPS X» | تم (على خادم SSH اختباري) | `deploy-fail-fix-run` |
| 17 | فشل البناء ثم AI يصلح | تم | `deploy-fail-fix-run` · `bad-fix-rolled-back` |
| 18 | توقف بسبب restart | تم (حيث الاستئناف صادق) | `truthful-resume-after-restart` · `resume-skips-done` · `19-20-task-cancel-resume` |
| 19 | AI يطلب credential | تم | `register-secret-scrubbed` · `password-host-redacted` · `ai-ask-redacts` |
| 20 | API خارجي يفشل | تم | `23-no-fake-success` · `failing-primary-immediate-fallback` · `provider-ok-but-not-verified` |

**ملاحظة سيناريو 11:** `vps.create` مذكور صراحة في `RESTRICTED_ACTIONS`، أي أنه غير معروض كإجراء. لم يُنفَّذ `addvs`، لأن معاملاته (الخطة، النظام، IP، العقدة) لم يمكن التحقق منها على لوحة admin حقيقية في هذه البيئة، والقاعدة تمنع الـendpoints المخمّنة والنجاح الوهمي.
البديل الموجود: المالك يُنشئ الـVPS من لوحة Virtualizor، ثم يُسنده بالسيناريو 12.

---

## 10) جاهز للإنتاج: **NO**

الكود نفسه مكتمل ومختبر: 104/104، تدقيق صارم صفر، 0 أزرار ميتة، 0 أداة AI خارج محرك الصلاحيات.

**أسباب الرفض الحقيقية:**

1. **أسرار مكشوفة لم تُدوَّر.** `config.js` في مستودع عام ويحمل مفاتيح فعّالة، ومثله 4 ملفات بها مفاتيح مضمّنة وكوكيز جلسات ظهرت في تاريخ git. التشغيل بها في الإنتاج يعني تشغيلاً بمفاتيح يملكها أي أحد. القائمة بالأسماء في `docs/TERBOO_SECRETS_ROTATION.md`.
2. **لا تحقق حي.** لم يجرِ أي smoke test على واتساب حقيقي، ولا على لوحة Virtualizor admin حقيقية، ولا Pterodactyl حقيقية، ولا VPS حقيقي عبر SSH. الـ3 اختبارات live لم تُشغّل لغياب المفاتيح في هذه البيئة.
3. **سيناريو 11 (إنشاء VPS) لم يتم.**
4. **`plugins/owner/internetrakyat.js` يحتاج قرار المالك** (تعطيل موصى به).

**ما يحوّلها إلى YES:**

- تدوير كل ما في وثيقة الأسرار؛
- تشغيل `npm run test:live` و`node tools/terboo-virtualizor-smoke.mjs` بنجاح على الخوادم الحقيقية؛
- تجربة يدوية للسيناريوهات 1–10 في مجموعة اختبار؛
- قرار بشأن البند 4.
