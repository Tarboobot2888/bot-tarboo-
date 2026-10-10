# TERBOO — مراجعة مكتبة @yudzxml/baileys (§4 · §10)

> كل سطر هنا من **المصدر المنشور** الذي نُزّل وتُحقّق من بصمته، لا من README
> ولا من تقرير سابق. الأمر الذي يُعيد التنزيل والتحقق:
>
> ```bash
> npm view @yudzxml/baileys version dist.shasum
> curl -sSL -o y.tgz https://registry.npmjs.org/@yudzxml/baileys/-/baileys-7.6.6.tgz
> sha1sum y.tgz   # يجب أن يطابق dist.shasum
> ```

## 0. ما فُحص فعلاً

| البند | القيمة |
|---|---|
| الإصدار المنشور وقت الفحص | **7.6.6** |
| `dist.shasum` من npm | `a509a4bf5fbfe6e3b1950c9fa6cc748820d45b41` |
| `sha1sum` للملف المنزَّل | `a509a4bf5fbfe6e3b1950c9fa6cc748820d45b41` ✅ **مطابق** |
| `sha256` للملف المنزَّل | `ae03150be9b3e3375daf2a086b1bcc15a3bad59ded1e838bbddedf2b573bd0bf` |
| حجم الأرشيف | 1.32 MB · 437 ملفاً · 12 MB بعد الفك |
| الترخيص | MIT — © WhiskeySockets, Lia Wynn, Vanzxy |
| الاعتماديات المعلنة | 14، منها **`whatsapp-rust-bridge@0.5.5`** (ملحق أصلي مبني بـRust) |

الملفات التي قُرئت سطراً سطراً:

- `lib/Utils/html-app.js` (96 سطراً) — كامل
- `lib/MessageBuilder/extras.js` — `htmlSection` و`sendHtmlApp` و`sendHtmlDocument`
- `lib/MessageBuilder/index.js` — `AIRich.build` · `AIRich.send` · `generateVerificationMetadata` · `DEFAULT_BOT_JID`
- `lib/Utils/rich-message-utils.js` — `wrapToBotForwardedMessage` · `botMetadataSignature` · `botMetadataCertificate`
- `package.json` · `LICENSE`

---

## 1. القرار: **لا تُثبَّت، ولا يُستعمل `sendHtmlApp`**

السبب ليس عطلاً تقنياً بل **تلفيق إثبات تحقق**. وُجدت له نسختان مستقلتان داخل الحزمة.

### 1.1 النسخة التي يصل إليها `sendHtmlApp` فعلاً

`lib/MessageBuilder/index.js:2922`:

```js
static generateVerificationMetadata() {
  const signatureMaterial = Buffer.from(
    `NIXEL.…V${VERSION}-V…`   // VERSION = '4.7'
  );
  const signature = Buffer.concat([
    signatureMaterial, crypto.randomBytes(64 - signatureMaterial.length)
  ]).toString('base64');
  const certificateChain = [
    Buffer.concat([certificateMaterial, crypto.randomBytes(684 - certificateMaterial.length)]).toString('base64'),
    Buffer.concat([certificateMaterial, crypto.randomBytes(892 - certificateMaterial.length)]).toString('base64'),
  ];
  return { proofs: [{ version: 1, useCase: 1, signature, certificateChain }] };
}
```

ما يعنيه هذا بالضبط، بعد فكّ الترميز:

| الحقل | محتواه الحقيقي |
|---|---|
| `signature` (64 بايت) | النص `NIXEL.MessageBuilderV4.7-VerificationSignature.Metadata` (55 بايت) + **9 بايت عشوائية** |
| `certificateChain[0]` (684 بايت) | النص `NIXEL.MessageBuilderV4.7-CertificateChain.Metadata` (50 بايت) + **634 بايت عشوائية** |
| `certificateChain[1]` (892 بايت) | نفس النص + **842 بايت عشوائية** |

النص مكتوب بهيئة `NI…` لا كنص صريح، فلا يجده من يبحث في المصدر عن
`NIXEL`. هذا إخفاء متعمَّد لا صدفة تنسيق.

### 1.2 النسخة الثانية

`lib/Utils/rich-message-utils.js:373`:

```js
export const botMetadataSignature = () => {
  const signature = new Uint8Array(64);
  getRandomValues(signature);          // 64 بايت عشوائية بالكامل
  return signature;
};
export const botMetadataCertificate = (length = 685) => {
  const certificate = new Uint8Array(length);
  certificate[0] = 48;                 // 0x30 = SEQUENCE
  certificate[1] = 130;                // 0x82 = طول طويل ببايتين
  getRandomValues(certificate.subarray(2));
  return certificate;
};
```

أول بايتين `0x30 0x82` هما ترويسة DER لشهادة X.509. أي أن العشوائية **مُشكَّلة
لتشبه شهادة حقيقية**. وتعليق المؤلف نفسه في السطر 389:

```js
// Lia@Note 09-04-26 --- TODO: Fill verificationMetadata field
```

أي أن المؤلف يعرف أن هذه ليست براهين، بل حشو مكانها.

### 1.3 لا مسار يتفادى التلفيق

`lib/MessageBuilder/index.js:2083`، داخل `build()`:

```js
botMetadata: {
  ...notif,
  verificationMetadata: AIRich.generateVerificationMetadata(),   // ← غير مشروط
  botResponseId: this._botResponseId,
}
```

- لا خيار يُسقط هذا الحقل. `forwarded: false` يُسقط `forwardedAiBotMessageInfo` وحده.
- `sendHtmlApp` ينتهي في فرعيه (`embedded` والافتراضي) إلى `rich.send()` ⇒ `build()`.
- ومعه `DEFAULT_BOT_JID = '867051314767696@bot'` و`isForwarded: true`
  و`forwardOrigin: 4` داخل `botForwardedMessage` ⇒ **الرسالة تدّعي أنها رد
  موثّق من مساعد Meta**.

### 1.4 الكود المرجعي الذي أرسله المالك مولَّد بهذه الدالة

فُكّ `signature` و`certificateChain[0]` من الكود المرجعي وقُورنا بما يبنيه المصدر:

```
signature            : 64 بايت · يبدأ بـ "NIXEL.MessageBuilderV4.7-VerificationSignature.Metadata"
  يطابق علامة المصدر : true · الباقي 9 بايت = e379e5847269ddbe64
certificateChain[0]  : 684 بايت · يبدأ بـ "NIXEL.MessageBuilderV4.7-CertificateChain.Metadata"
  يطابق علامة المصدر : true
  أول بايتين         : 4e49 ("NI") — وشهادة X.509 حقيقية تبدأ 3082
```

فالقيم في المثال ليست «بيانات تحقق من رسالة ناجحة» بل **ناتج هذه الدالة نفسها**.
ولهذا لا يجوز نسخها ولا إعادة توليدها.

---

## 2. الاكتشاف الأهم: الحزمة **ليست لازمة** للشكل السلكي

هذا ما يغيّر القرار من «ممنوع ومسدود» إلى «ممنوع وغير ضروري».

بروتو الحزمة الرسمية المثبّتة عندنا — `@whiskeysockets/baileys@7.0.0-rc14` —
يرمّز ويفكّ **كل** الحقول التي يحتاجها هذا المسار. مُختبَر بترميز ثم فكّ فعلي:

| الحقل | على proto rc14 |
|---|---|
| `botForwardedMessage` | ✅ موجود وينجو |
| `richResponseMessage` | ✅ موجود وينجو |
| `unifiedResponse.data` | ✅ البايتات تنجو كما هي |
| `botMetadata.verificationMetadata.proofs[]` | ✅ موجود (لا نستعمله) |
| `submessages[].messageText` | ✅ ينجو |

الدليل في `tests/terboo-miniapp-transport.test.mjs` §3: تُبنى الحمولة، تُرمَّز
بـ`proto.Message.encode`، تُفكّ، ويُستخرج HTML منها حرفياً.

**النتيجة:** الشيء الوحيد الذي تضيفه `@yudzxml/baileys` في مسار الألعاب هو
البراهين الملفّقة. وهي الممنوعة. فتثبيتها يشتري مخاطرة بلا مقابل تقني.

لذلك بُني النقل على مقبسنا الحالي، بلا اعتماد جديد، وبلا `verificationMetadata`،
وبلا `botJid` لجهة أخرى: `src/lib/terboo-miniapp-transport.js`.

---

## 3. ما يستحق الاستفادة منه: `checkHtmlApp`

`lib/Utils/html-app.js` ليس تسويقاً؛ إنه توصيف دقيق لمحيط التشغيل، ويبدو
مستخرجاً من قياس فعلي. القيود التي يوثّقها:

| القيد | الأثر على تصميم اللعبة |
|---|---|
| الصفحة في **أصل معتم بلا شبكة** | `fetch` · XHR · `sendBeacon` · `EventSource` ميتة، **بلا** `securitypolicyviolation` ⇒ فشل صامت |
| كل واجهات التخزين ترمي `SecurityError` | `localStorage` · `sessionStorage` · `indexedDB` · `document.cookie` · `caches` — فرع catch هو الذي يعمل دائماً |
| `crypto.subtle` يتطلب سياقاً آمناً | غير متاح |
| سقف الرسالة **1MB** · ميزانية **960KB** | فوق السقف يُسقط العميل الرسالة **بلا عرض** ⇒ تصل صمتاً |
| الحمولة تُرمَّز `\uXXXX` | كل محرف غير ASCII حتى **ثلاثة أضعاف** حجمه ⇒ الميزانية ببايتات السلك |
| الفقاعة تبقى حيّة خارج الشاشة | حلقة رسم أو مؤقت بلا حارس إخفاء يحرق البطارية |
| `AndroidBridge.updateSize` | جسر ارتفاع من المضيف؛ `aspect-ratio` يجعل القياس يطارد العرض فترتجف البطاقة |

**لم تُنسخ شيفرته.** أُعيدت القواعد بتنفيذنا في
`src/lib/terboo-webview-budget.js` (`auditWebViewHtml`) مع تحسين واحد: المطابقة
على **استعمال** الواجهة (`localStorage.` / `[` / `(`) لا على مجرد ذكر الاسم، فذِكره
في تعليق ليس استدعاءً.

### ما كشفه هذا على كودنا

تطبيق القواعد على بنّائينا القائمين كشف عيبين حقيقيين كانا سيظهران على الجهاز فقط:

| العيب | الحال |
|---|---|
| Sonic و XO يحفظان أفضل نتيجة في `localStorage` | **يرمي SecurityError** في المحيط المستهدف ⇒ أُزيل التخزين كلياً، والحالة في الذاكرة وتُعلَن في الواجهة «لهذه الجلسة فقط» |
| كلاهما يستعمل `aspect-ratio` | يُربك تفاوض الارتفاع ⇒ استُبدل بارتفاع صريح وبحيلة `padding` المئوي للوحة المربّعة |

---

## 4. مخاطر لم تُفحص ولا يُدَّعى أمانها

| البند | الحال |
|---|---|
| بقية الحزمة (437 ملفاً · 12MB) | **لم تُراجَع.** فُحص مسار HTML والبراهين فقط. لا يُعلن أنها آمنة ولا أنها خبيثة |
| `whatsapp-rust-bridge@0.5.5` | ملحق أصلي (Rust) في شجرة اعتماديات طبقة الجلسات والتشفير — **لم يُراجَع**، ومراجعته ليست ممكنة بقراءة المصدر وحدها |
| استبدال مكتبة الاتصال العامة | لم يُنفَّذ ولا يُقترح: طبقة الجلسات والتشفير أكثر مكوّن حساسية في المشروع |
| `package.json` و`package-lock.json` | **لم يُغيَّرا.** `@whiskeysockets/baileys@7.0.0-rc14` كما هو |

---

## 5. المراجع الأخرى (§10) — ما أُثبت وما لم يُفحص

> هذا القسم يقول الحقيقة عن حدود الفحص. لم تُزَر مستودعات المراجع 1 و3–6 و8 في
> هذه الجلسة، ولا يُقدَّم أي ادّعاء بأنها فُحصت.

| المرجع | زُيرت؟ | ما أُثبت فعلاً |
|---|---|---|
| **@yudzxml/baileys** (npm + tarball) | ✅ المصدر المنشور كاملاً للمسار المعني | كل ما في §1–§3 أعلاه: البراهين ملفّقة في نسختين · لا مسار يتفاداها · `checkHtmlApp` توصيف دقيق للمحيط · الحزمة غير لازمة للشكل السلكي |
| **@whiskeysockets/baileys** (المثبّت محلياً) | ✅ البروتو المثبّت، باختبار ترميز/فكّ | يحمل `botForwardedMessage` و`richResponseMessage` و`unifiedResponse` و`botMetadata` بالكامل ⇒ لا حاجة لحزمة أخرى |
| **الكود المرجعي في رسالة المالك** | ✅ فُكّ وقُورن بالبايت | بياناته مولَّدة بدالة §1.1 نفسها ⇒ لا تُنسخ |
| Baileys على GitHub · Elaina · casileys · Kyyinfinite · XzeroOffc · Socket.dev · whatsapp-docs | ❌ **لم تُفحص في هذه الجلسة** | لا شيء. وما كان لفحصها أن يغيّر القرار: البراهين الملفّقة مُثبتة من المصدر المنشور، والشكل السلكي مُثبت متاحاً على حزمتنا |

**لماذا لم تُستكمل:** القرار حُسم من دليل أقوى من أي مقارنة — المصدر المنشور
نفسه. ومقارنة فروع أخرى تفيد في سؤال «هل يوجد فرع يرسل HTML بلا تلفيق»، وهو
سؤال أجابه §2 إجابة أفضل: **لا حاجة لأي فرع**، فالشكل متاح على الحزمة الرسمية.
ما يبقى مجهولاً هو سؤال العميل لا سؤال المكتبة (§6).

---

## 6. السؤال الوحيد الباقي — ولا يُجاب من هنا

> هل يعرض عميل واتساب حمولة `richResponseMessage` + بدائية HTML **بلا**
> `verificationMetadata`؟

- لو **نعم**: فالمسار المطلوب يعمل بلا تلفيق، والنقل المبني هنا كافٍ.
- لو **لا**: فلا سبيل مشروع إلى عرض HTML داخل الفقاعة اليوم، ويبقى القيد موثّقاً.

لا جهاز ولا حساب واتساب في بيئة البناء ⇒ الحالة **NOT RUN**، ولا يُدَّعى جواب.
النقل مطفأ افتراضياً، وطريقة اختباره بنفسك في `TERBOO_GAME_MINIAPP_SETUP.md` §4.
وأي نتيجة إرسال يعيدها النقل تحمل `renderVerified: false` دائماً.
