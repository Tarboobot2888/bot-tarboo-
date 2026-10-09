// ═══════════════════════════════════════════════
// 🌐 Terboo Website — رابط الموقع وحالته وتحكّم المالك (V6 §29 §49 §50)
// ───────────────────────────────────────────────
// ترتيب الرابط العام (publicBaseUrl):
//   1) رابط ضبطه المالك من البوت (.موقع رابط …) — محفوظ في القاعدة website:runtime
//   2) config.website.url / متغير البيئة TERBOO_SITE_URL
//   3) لا رابط مضبوط + الخادم يعمل ⇒ يُبنى تلقائياً من IP السيرفر العام + المنفذ (http أو https حسب SSL)
// · رابط مضبوط لكنه غير صالح (واتساب، بيانات اعتماد، مكتوب خطأ) ⇒ لا زر (لا رابط ميت) ولا رجوع للـIP.
// · SSL: شهادة/مفتاح يضبطهما المالك (مسارات ملفات)، أو certbot عبر أمر المالك. لا يُطبع محتوى أي مفتاح.
// · حالة الخادم (تعمل/لا) يسجّلها خادم الموقع نفسه عند الإقلاع.
// ═══════════════════════════════════════════════

import os from "node:os";
import config from "../../config.js";
import { noteFailure } from "./terboo-failure-log.js";
import { button } from "./terboo-interactive-builder.js";
import { t } from "./terboo-localization.js";
import { getDatabase } from "./terboo-database.js";
import * as brand from "./terboo-brand.js";

/** نطاقات واتساب التي لا تُقبل كرابط موقع */
const WHATSAPP_HOSTS = /(^|\.)(whatsapp\.com|wa\.me|whatsapp\.net)$/i;
const RUNTIME_KEY = "website:runtime";

const runtime = global.terbooWebsite || (global.terbooWebsite = { listening: false, startedAt: null, address: "", lastCheck: null, error: "", publicIp: "", protocol: "http", port: 0 });

// ─────────────── إعدادات المالك المحفوظة ───────────────

function db() {
  try {
    return getDatabase();
  } catch (error) {
    noteFailure("website", error, { where: "terboo-website:db", stage: "getDatabase", fallback: "config-only" });
    return null;
  }
}

/** ما ضبطه المالك من البوت: {url, enabled, ssl:{cert,key}} */
function overrides() {
  const value = db()?.setting(RUNTIME_KEY);
  return value && typeof value === "object" ? value : {};
}

function saveOverrides(patch) {
  const store = db();
  if (!store) return { ok: false, code: "no-database" };
  const next = { ...overrides(), ...patch };
  for (const key of Object.keys(next)) if (next[key] === null || next[key] === undefined) delete next[key];
  store.setting(RUNTIME_KEY, next);
  return { ok: true, value: next };
}

/** يتحقق من رابط: http/https، بلا بيانات اعتماد، ليس واتساب. يرجع الرابط المطبّع أو "" */
function normalizeUrl(raw, { allowHttp = false } = {}) {
  const text = String(raw || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) return "";
    if (url.username || url.password) return "";
    if (WHATSAPP_HOSTS.test(url.hostname)) return "";
    return url.toString();
  } catch (error) {
    noteFailure("website", error, { where: "terboo-website:normalizeUrl", stage: "parse-url", fallback: "hide-button" });
    return "";
  }
}

/** مصدر الرابط المضبوط (إن وُجد) */
function configuredUrl() {
  const owner = String(overrides().url || "").trim();
  if (owner) return { raw: owner, source: "owner:bot", allowHttp: true };
  const raw = String(config.website?.url || "").trim();
  if (raw) return { raw, source: process.env.TERBOO_SITE_URL ? "env:TERBOO_SITE_URL" : "config.website.url", allowHttp: false };
  return { raw: "", source: "unset", allowHttp: false };
}

/** الرابط المضبوط الصالح أو "" (https فقط من config؛ المالك قد يضبط http لعنوان IP) */
function siteUrl() {
  const { raw, allowHttp } = configuredUrl();
  return normalizeUrl(raw, { allowHttp });
}

/** الرابط العام الفعلي: المضبوط، وإلا IP:المنفذ لخادم يعمل فعلاً، وإلا "" */
function publicBaseUrl() {
  const configured = configuredUrl();
  if (configured.raw) return siteUrl();
  if (!runtime.listening || !runtime.publicIp || !runtime.port) return "";
  const host = runtime.publicIp.includes(":") ? `[${runtime.publicIp}]` : runtime.publicIp;
  const defaultPort = runtime.protocol === "https" ? 443 : 80;
  return `${runtime.protocol}://${host}${runtime.port === defaultPort ? "" : `:${runtime.port}`}/`;
}

/** يربط مساراً بالرابط العام: link("/play/abc") */
function link(pathname = "/") {
  const base = publicBaseUrl();
  if (!base) return "";
  return new URL(String(pathname).replace(/^\/*/, "/"), base).toString();
}

// ─────────────── اكتشاف IP السيرفر ───────────────

const PRIVATE_V4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

/** أول IPv4 خارجي من واجهات الشبكة (عام أولاً ثم خاص) */
function interfaceIp() {
  const all = Object.values(os.networkInterfaces()).flat().filter((n) => n && n.family === "IPv4" && !n.internal).map((n) => n.address);
  return all.find((ip) => !PRIVATE_V4.test(ip)) || all[0] || "";
}

/** IP العام: TERBOO_PUBLIC_IP ← خدمة ipify (مهلة قصيرة) ← واجهة الشبكة */
async function detectPublicIp({ timeoutMs = 3500 } = {}) {
  const fromEnv = String(process.env.TERBOO_PUBLIC_IP || "").trim();
  if (fromEnv) return fromEnv;
  const local = interfaceIp();
  if (local && !PRIVATE_V4.test(local)) return local;
  try {
    const res = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(timeoutMs) });
    const data = await res.json();
    if (/^[\d.]+$|^[0-9a-f:]+$/i.test(String(data?.ip || ""))) return data.ip;
  } catch (error) {
    noteFailure("website", error, { where: "terboo-website:detectPublicIp", stage: "ipify", fallback: "interface-ip" });
  }
  return local;
}

// ─────────────── SSL ───────────────

/** مسارات الشهادة الفعلية (المالك ← البيئة). لا يُقرأ محتواها هنا */
function sslPaths() {
  const owner = overrides().ssl || {};
  const cert = owner.cert || process.env.TERBOO_WEB_SSL_CERT || "";
  const key = owner.key || process.env.TERBOO_WEB_SSL_KEY || "";
  return cert && key ? { cert, key, source: owner.cert ? "owner:bot" : "env" } : null;
}

/** هل يجب تشغيل الموقع (المالك يتغلب على config) */
function webEnabled() {
  const owner = overrides().enabled;
  if (owner === true || owner === false) return owner;
  return config.website?.enabled === true || process.env.TERBOO_WEB_ENABLED === "1";
}

// ─────────────── أزرار القائمة ───────────────

/** زر CTA للقائمة الرئيسية أو null إن لم يتوفر رابط صالح */
function websiteButton(lang = "ar") {
  const url = publicBaseUrl();
  return url ? button.url(t(lang, "menu.buttonWebsite"), url) : null;
}

/** سطر نصي للبديل النصي للقائمة */
function websiteLine(lang = "ar") {
  const url = publicBaseUrl();
  return url ? `${t(lang, "menu.buttonWebsite")}: ${url}` : "";
}

/** يسجّله خادم الموقع (web/server) — لا يكتبه غيره */
function reportServer(state = {}) {
  Object.assign(runtime, state, { lastCheck: new Date().toISOString() });
}

/** حالة الموقع للمالك (بلا أي سر — مسارات الشهادة تُعرض كأسماء ملفات فقط) */
function websiteStatus() {
  const configured = configuredUrl();
  const ssl = sslPaths();
  return {
    url: publicBaseUrl(),
    urlConfigured: Boolean(configured.raw),
    urlValid: Boolean(siteUrl()),
    urlSource: configured.raw ? configured.source : runtime.listening && runtime.publicIp ? "auto:ip" : "unset",
    enabled: webEnabled(),
    ssl: ssl ? { enabled: true, source: ssl.source, cert: ssl.cert.split("/").pop(), key: ssl.key.split("/").pop() } : { enabled: false },
    environment: process.env.NODE_ENV || "development",
    version: brand.botVersion(),
    backend: { listening: runtime.listening, address: runtime.address, protocol: runtime.protocol, publicIp: runtime.publicIp, startedAt: runtime.startedAt, lastCheck: runtime.lastCheck, error: runtime.error },
  };
}

export { detectPublicIp, interfaceIp, link, normalizeUrl, overrides, publicBaseUrl, reportServer, saveOverrides, siteUrl, sslPaths, webEnabled, websiteButton, websiteLine, websiteStatus };
export default { siteUrl, publicBaseUrl, link, websiteButton, websiteLine, websiteStatus, reportServer, saveOverrides, overrides, sslPaths, webEnabled, detectPublicIp };
