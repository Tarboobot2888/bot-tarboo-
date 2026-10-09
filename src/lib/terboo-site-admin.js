// ═══════════════════════════════════════════════
// 🛠️ Terboo Site Admin — تحكّم المالك في الموقع من البوت (.موقع)
// ───────────────────────────────────────────────
//   .موقع                         حالة الموقع + أزرار
//   .موقع رابط <https://…>        رابط عام (دومين/IP) ⇒ يُعاد تشغيل الخادم
//   .موقع رابط تلقائي             حذف الرابط ⇒ IP السيرفر + المنفذ تلقائياً
//   .موقع منفذ <رقم>              منفذ الاستماع
//   .موقع تشغيل | ايقاف | اعادة
//   .موقع ssl <cert> <key>        شهادة من ملفات (تُفحص صلاحيتها، لا يُطبع محتواها)
//   .موقع ssl تلقائي [بريد]       Let's Encrypt عبر certbot (الدومين من الرابط المضبوط)
//   .موقع ssl ايقاف
// كل التنفيذ بلا shell: execFile بمصفوفة وسائط ثابتة + دومين/بريد مُتحقق منهما بنمط صارم.
// ═══════════════════════════════════════════════

import fs from "node:fs";
import tls from "node:tls";
import { execFile } from "node:child_process";
import { noteFailure } from "./terboo-failure-log.js";
import { sendCard } from "./terboo-ui-kit.js";
import { normalizeUrl, overrides, publicBaseUrl, saveOverrides, sslPaths, websiteStatus } from "./terboo-website.js";
import { restartSite, running, startSite, stopSite } from "./terboo-web-control.js";

const MSG = {
  ar: {
    title: "🌐 موقع Bot Terboo", on: "🟢 يعمل", off: "🔴 متوقف", link: "الرابط", none: "غير متاح", source: "المصدر", proto: "البروتوكول", ssl: "SSL", sslOn: "مفعّل", sslOff: "غير مفعّل", port: "المنفذ", ip: "IP السيرفر",
    src: { "owner:bot": "مضبوط من البوت", "config.website.url": "config.js", "env:TERBOO_SITE_URL": "متغير البيئة", "auto:ip": "تلقائي (IP + منفذ)", unset: "غير مضبوط" },
    bStart: "▶️ تشغيل", bStop: "⏹️ إيقاف", bRestart: "🔄 إعادة تشغيل", bAuto: "🌍 رابط تلقائي", bSslAuto: "🔒 SSL تلقائي", bOpen: "🌐 فتح الموقع",
    usage: "الاستخدام:\n{p}موقع رابط https://example.com\n{p}موقع رابط تلقائي\n{p}موقع منفذ 8787\n{p}موقع تشغيل | ايقاف | اعادة\n{p}موقع ssl <مسار_الشهادة> <مسار_المفتاح>\n{p}موقع ssl تلقائي [بريد]\n{p}موقع ssl ايقاف",
    badUrl: "❌ رابط غير صالح. استخدم http(s)://دومين أو IP — بلا روابط واتساب أو بيانات دخول.",
    urlSet: "✅ تم ضبط الرابط: {url}", urlAuto: "✅ الرابط الآن تلقائي من IP السيرفر والمنفذ.", started: "✅ الموقع يعمل: {url}", stopped: "⏹️ تم إيقاف الموقع.", restarted: "🔄 أُعيد التشغيل: {url}", startFail: "❌ تعذّر تشغيل الموقع ({code}). تأكد أن المنفذ غير مستخدم.",
    badPort: "❌ منفذ غير صالح (1-65535).", portSet: "✅ المنفذ الآن {port}.",
    noFile: "❌ ملف غير موجود أو غير مقروء: {f}", badCert: "❌ الشهادة/المفتاح غير صالحين أو غير متطابقين.", sslSet: "🔒 تم تفعيل SSL. الموقع الآن: {url}", sslOffDone: "🔓 تم إيقاف SSL.",
    needDomain: "❌ SSL التلقائي يحتاج دوميناً (ليس IP). اضبطه أولاً: {p}موقع رابط https://example.com", noCertbot: "❌ certbot غير مثبّت على السيرفر.\nثبّته (مثال Ubuntu: apt install certbot) ثم أعد المحاولة، أو استخدم {p}موقع ssl <cert> <key>.",
    certbotRun: "⏳ جارٍ إصدار شهادة Let's Encrypt لـ {d}… (يحتاج المنفذ 80 متاحاً والدومين يشير لهذا السيرفر)", certbotFail: "❌ فشل certbot ({code}). تأكد أن الدومين يشير لهذا السيرفر وأن المنفذ 80 مفتوح وغير مستخدم.", badEmail: "❌ بريد غير صالح.",
  },
  en: {
    title: "🌐 Bot Terboo website", on: "🟢 Running", off: "🔴 Stopped", link: "Link", none: "unavailable", source: "Source", proto: "Protocol", ssl: "SSL", sslOn: "on", sslOff: "off", port: "Port", ip: "Server IP",
    src: { "owner:bot": "set from the bot", "config.website.url": "config.js", "env:TERBOO_SITE_URL": "environment", "auto:ip": "automatic (IP + port)", unset: "not set" },
    bStart: "▶️ Start", bStop: "⏹️ Stop", bRestart: "🔄 Restart", bAuto: "🌍 Auto link", bSslAuto: "🔒 Auto SSL", bOpen: "🌐 Open website",
    usage: "Usage:\n{p}موقع url https://example.com\n{p}موقع url auto\n{p}موقع port 8787\n{p}موقع on | off | restart\n{p}موقع ssl <cert_path> <key_path>\n{p}موقع ssl auto [email]\n{p}موقع ssl off",
    badUrl: "❌ Invalid link. Use http(s)://domain or IP — no WhatsApp links or credentials.",
    urlSet: "✅ Link set: {url}", urlAuto: "✅ The link is now automatic from the server IP and port.", started: "✅ Website running: {url}", stopped: "⏹️ Website stopped.", restarted: "🔄 Restarted: {url}", startFail: "❌ Could not start the website ({code}). Make sure the port is free.",
    badPort: "❌ Invalid port (1-65535).", portSet: "✅ Port is now {port}.",
    noFile: "❌ File missing or unreadable: {f}", badCert: "❌ Certificate/key invalid or mismatched.", sslSet: "🔒 SSL enabled. Website: {url}", sslOffDone: "🔓 SSL disabled.",
    needDomain: "❌ Auto SSL needs a domain (not an IP). Set it first: {p}موقع url https://example.com", noCertbot: "❌ certbot is not installed on the server.\nInstall it (Ubuntu: apt install certbot) and retry, or use {p}موقع ssl <cert> <key>.",
    certbotRun: "⏳ Requesting a Let's Encrypt certificate for {d}… (port 80 must be free and the domain must point here)", certbotFail: "❌ certbot failed ({code}). Make sure the domain points to this server and port 80 is open and free.", badEmail: "❌ Invalid email.",
  },
  es: {
    title: "🌐 Sitio de Bot Terboo", on: "🟢 Activo", off: "🔴 Detenido", link: "Enlace", none: "no disponible", source: "Origen", proto: "Protocolo", ssl: "SSL", sslOn: "activo", sslOff: "inactivo", port: "Puerto", ip: "IP del servidor",
    src: { "owner:bot": "desde el bot", "config.website.url": "config.js", "env:TERBOO_SITE_URL": "entorno", "auto:ip": "automático (IP + puerto)", unset: "sin configurar" },
    bStart: "▶️ Iniciar", bStop: "⏹️ Detener", bRestart: "🔄 Reiniciar", bAuto: "🌍 Enlace automático", bSslAuto: "🔒 SSL automático", bOpen: "🌐 Abrir sitio",
    usage: "Uso:\n{p}موقع url https://example.com\n{p}موقع url auto\n{p}موقع port 8787\n{p}موقع on | off | restart\n{p}موقع ssl <ruta_cert> <ruta_clave>\n{p}موقع ssl auto [email]\n{p}موقع ssl off",
    badUrl: "❌ Enlace no válido. Usa http(s)://dominio o IP — sin enlaces de WhatsApp ni credenciales.",
    urlSet: "✅ Enlace configurado: {url}", urlAuto: "✅ El enlace ahora es automático (IP + puerto).", started: "✅ Sitio activo: {url}", stopped: "⏹️ Sitio detenido.", restarted: "🔄 Reiniciado: {url}", startFail: "❌ No se pudo iniciar el sitio ({code}). Verifica que el puerto esté libre.",
    badPort: "❌ Puerto no válido (1-65535).", portSet: "✅ Puerto: {port}.",
    noFile: "❌ Archivo inexistente o ilegible: {f}", badCert: "❌ Certificado/clave no válidos o no coinciden.", sslSet: "🔒 SSL activado. Sitio: {url}", sslOffDone: "🔓 SSL desactivado.",
    needDomain: "❌ El SSL automático necesita un dominio (no IP). Configúralo: {p}موقع url https://example.com", noCertbot: "❌ certbot no está instalado.\nInstálalo (Ubuntu: apt install certbot) o usa {p}موقع ssl <cert> <clave>.",
    certbotRun: "⏳ Solicitando certificado Let's Encrypt para {d}… (el puerto 80 debe estar libre)", certbotFail: "❌ certbot falló ({code}). Verifica que el dominio apunte aquí y el puerto 80 esté libre.", badEmail: "❌ Email no válido.",
  },
};
const say = (lang, key, vars = {}) => String((MSG[lang] || MSG.ar)[key] ?? MSG.ar[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

const DOMAIN = /^(?=.{4,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;
const EMAIL = /^[^\s@"'`;|&<>]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/i;
const VERBS = {
  status: ["status", "حالة", "الحالة"], url: ["url", "link", "رابط", "الرابط"], port: ["port", "منفذ", "المنفذ"],
  on: ["on", "start", "تشغيل", "شغل"], off: ["off", "stop", "ايقاف", "إيقاف", "اوقف"], restart: ["restart", "اعادة", "إعادة", "اعاده"],
  ssl: ["ssl", "https", "شهادة"], auto: ["auto", "تلقائي", "auto-ip"], disable: ["off", "ايقاف", "إيقاف", "حذف", "remove"],
};
const is = (word, group) => VERBS[group].includes(String(word || "").toLowerCase());

const execFileP = (cmd, args, opts) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: 180_000, windowsHide: true, ...opts }, (error, stdout, stderr) => resolve({ ok: !error, code: error?.code ?? 0, stdout: String(stdout || ""), stderr: String(stderr || "") }));
});

/** يُعيد تشغيل الخادم إن كان يعمل (لتطبيق رابط/منفذ/SSL) */
async function applyIfRunning() {
  if (!running()) return { ok: true, idle: true };
  return restartSite();
}

/** يفحص الشهادة والمفتاح (قراءة + تطابق) بلا أي طباعة للمحتوى */
function checkCertPair(cert, key) {
  for (const f of [cert, key]) {
    try {
      fs.accessSync(f, fs.constants.R_OK);
    } catch (error) {
      noteFailure("site-admin", error, { where: "terboo-site-admin:checkCertPair", stage: "access", fallback: "rejected" });
      return { ok: false, code: "no-file", file: f };
    }
  }
  try {
    tls.createSecureContext({ cert: fs.readFileSync(cert), key: fs.readFileSync(key) });
    return { ok: true };
  } catch (error) {
    noteFailure("site-admin", error, { where: "terboo-site-admin:checkCertPair", stage: "secure-context", fallback: "rejected" });
    return { ok: false, code: "bad-cert" };
  }
}

/** حالة مختصرة كنص (بلا أسرار — أسماء ملفات الشهادة فقط) */
function statusText(lang) {
  const s = websiteStatus();
  const lines = [
    `*${say(lang, "title")}*`,
    `${s.backend.listening ? say(lang, "on") : say(lang, "off")}`,
    `• ${say(lang, "link")}: ${s.url || say(lang, "none")}`,
    `• ${say(lang, "source")}: ${(MSG[lang] || MSG.ar).src[s.urlSource] || s.urlSource}`,
    `• ${say(lang, "proto")}: ${s.backend.protocol || "http"} · ${say(lang, "port")}: ${s.backend.address?.split(":").pop() || overrides().port || "-"}`,
    `• ${say(lang, "ssl")}: ${s.ssl.enabled ? `${say(lang, "sslOn")} (${s.ssl.cert})` : say(lang, "sslOff")}`,
  ];
  if (s.backend.publicIp) lines.push(`• ${say(lang, "ip")}: ${s.backend.publicIp}`);
  return lines.join("\n");
}

async function sendStatus(m, sock, lang, note = "") {
  const p = m.prefix || ".";
  const url = publicBaseUrl();
  const buttons = running()
    ? [{ id: `${p}موقع اعادة`, text: say(lang, "bRestart") }, { id: `${p}موقع ايقاف`, text: say(lang, "bStop") }]
    : [{ id: `${p}موقع تشغيل`, text: say(lang, "bStart") }];
  if (overrides().url) buttons.push({ id: `${p}موقع رابط تلقائي`, text: say(lang, "bAuto") });
  if (!sslPaths()) buttons.push({ id: `${p}موقع ssl تلقائي`, text: say(lang, "bSslAuto") });
  return sendCard(sock, m, {
    cardId: "site:admin",
    lang,
    text: [note, statusText(lang), "", say(lang, "usage", { p })].filter((x) => x !== undefined && x !== null && x !== "").join("\n"),
    buttons,
    links: url ? [{ text: say(lang, "bOpen"), url }] : [],
  });
}

/** نقطة الدخول من أمر المالك */
async function handleSiteCommand(m, sock, lang = "ar") {
  const args = (m.args || []).map(String);
  const [verb, a1, a2] = args;
  const p = m.prefix || ".";

  if (!verb || is(verb, "status")) return sendStatus(m, sock, lang);

  if (is(verb, "on")) {
    saveOverrides({ enabled: true });
    const res = await startSite({});
    return res.ok ? sendStatus(m, sock, lang, say(lang, "started", { url: publicBaseUrl() || say(lang, "none") })) : m.reply(say(lang, "startFail", { code: res.code }));
  }
  if (is(verb, "off")) {
    saveOverrides({ enabled: false });
    await stopSite();
    return m.reply(say(lang, "stopped"));
  }
  if (is(verb, "restart")) {
    const res = await restartSite();
    return res.ok ? m.reply(say(lang, "restarted", { url: publicBaseUrl() || say(lang, "none") })) : m.reply(say(lang, "startFail", { code: res.code }));
  }

  if (is(verb, "url")) {
    if (!a1) return m.reply(say(lang, "usage", { p }));
    if (is(a1, "auto") || is(a1, "disable")) {
      saveOverrides({ url: null });
      await applyIfRunning();
      return m.reply(say(lang, "urlAuto"));
    }
    const url = normalizeUrl(a1, { allowHttp: true });
    if (!url) return m.reply(say(lang, "badUrl"));
    saveOverrides({ url });
    await applyIfRunning();
    return m.reply(say(lang, "urlSet", { url: publicBaseUrl() || url }));
  }

  if (is(verb, "port")) {
    const port = Number(a1);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return m.reply(say(lang, "badPort"));
    saveOverrides({ port });
    const res = await applyIfRunning();
    if (res.ok === false) return m.reply(say(lang, "startFail", { code: res.code }));
    return m.reply(say(lang, "portSet", { port }));
  }

  if (is(verb, "ssl")) {
    if (!a1) return m.reply(say(lang, "usage", { p }));
    if (is(a1, "disable") && !is(a1, "auto")) {
      saveOverrides({ ssl: null });
      await applyIfRunning();
      return m.reply(say(lang, "sslOffDone"));
    }
    if (is(a1, "auto")) return autoSsl(m, lang, a2);
    if (!a2) return m.reply(say(lang, "usage", { p }));
    const check = checkCertPair(a1, a2);
    if (!check.ok) return m.reply(check.code === "no-file" ? say(lang, "noFile", { f: check.file.split("/").pop() }) : say(lang, "badCert"));
    saveOverrides({ ssl: { cert: a1, key: a2 } });
    const res = await applyIfRunning();
    if (res.ok === false) return m.reply(say(lang, "startFail", { code: res.code }));
    return m.reply(say(lang, "sslSet", { url: publicBaseUrl() || say(lang, "none") }));
  }

  return m.reply(say(lang, "usage", { p }));
}

/** Let's Encrypt عبر certbot (standalone) — وسائط ثابتة، الدومين والبريد مُتحقق منهما */
async function autoSsl(m, lang, email) {
  const p = m.prefix || ".";
  let host = "";
  try {
    host = new URL(overrides().url || publicBaseUrl() || "http://0.0.0.0").hostname;
  } catch (error) {
    noteFailure("site-admin", error, { where: "terboo-site-admin:autoSsl", stage: "parse-url", fallback: "need-domain" });
  }
  if (!DOMAIN.test(host)) return m.reply(say(lang, "needDomain", { p }));
  if (email && !EMAIL.test(email)) return m.reply(say(lang, "badEmail"));
  const probe = await execFileP("certbot", ["--version"], { timeout: 15_000 });
  if (!probe.ok) return m.reply(say(lang, "noCertbot", { p }));
  await m.reply(say(lang, "certbotRun", { d: host }));
  // المنفذ 80 قد يكون للموقع نفسه ⇒ نوقفه أثناء التحقق ثم نعيده
  const wasRunning = running();
  if (wasRunning) await stopSite();
  const args = ["certonly", "--standalone", "--non-interactive", "--agree-tos", "--keep-until-expiring", "-d", host];
  args.push(...(email ? ["-m", email] : ["--register-unsafely-without-email"]));
  const res = await execFileP("certbot", args);
  const cert = `/etc/letsencrypt/live/${host}/fullchain.pem`;
  const key = `/etc/letsencrypt/live/${host}/privkey.pem`;
  if (!res.ok || !checkCertPair(cert, key).ok) {
    noteFailure("site-admin", new Error(`certbot exit ${res.code}`), { where: "terboo-site-admin:autoSsl", stage: "certbot", fallback: "no-ssl" });
    if (wasRunning) await startSite({});
    return m.reply(say(lang, "certbotFail", { code: res.code }));
  }
  const current = overrides().url ? new URL(overrides().url) : null;
  saveOverrides({ ssl: { cert, key }, url: current ? `https://${host}${current.port ? `:${current.port}` : ""}/` : `https://${host}/` });
  if (wasRunning) await startSite({});
  return m.reply(say(lang, "sslSet", { url: publicBaseUrl() }));
}

export { checkCertPair, handleSiteCommand, statusText };
export default { handleSiteCommand };
