// ═══════════════════════════════════════════════
// ✈️ Terboo Telegram — طبقة الواجهة المشتركة (بطاقات HTML · أزرار مربوطة بالمستخدم · إدخال · تفضيلات)
// ───────────────────────────────────────────────
// · بيانات الزر في تيليجرام ≤ 64 بايت ⇒ كل زر معرّف قصير يشير لحمولة محفوظة، مربوطة بمن أُرسلت له
//   (لا يضغطها غيره) وتنتهي بعد 30 دقيقة؛ أزرار التأكيد لمرة واحدة.
// · شاشات الإدخال: الرسالة النصية التالية من نفس المستخدم في نفس الدردشة؛ المدخل السري (كلمة مرور)
//   يُحذف من الدردشة فور قراءته ولا يُخزَّن.
// · النصوص من ملفات اللغة نفسها (ar · en · es) — لا نصوص مكررة.
// ═══════════════════════════════════════════════

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { noteFailure } from "../lib/terboo-failure-log.js";
import { t } from "../lib/terboo-localization.js";

const BUTTON_TTL_MS = 30 * 60 * 1000;
const INPUT_TTL_MS = 5 * 60 * 1000;
const MAX_BUTTONS = 5000;
const LANGS = new Set(["ar", "en", "es"]);

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const row = (label, value) => `▸ <b>${esc(label)}</b>: ${esc(value)}`;
const bullet = (value) => `• ${esc(value)}`;
const code = (value) => `<code>${esc(value)}</code>`;

/** بطاقة: رمز + عنوان + كتل (الكتل نص HTML جاهز أو نص عادي يُهرَّب) + توقيع الهوية */
function card({ icon = "☁️", title = "", blocks = [], raw = false }) {
  const body = blocks.filter(Boolean).map((b) => (raw || /<\/?(b|i|code|a)\b/.test(b) || b.startsWith("▸ ") || b.startsWith("• ") ? b : esc(b))).join("\n\n");
  return `${icon} <b>${esc(title)}</b>${body ? `\n\n${body}` : ""}\n\n<i>✦ Bot Terboo · VPS</i>`;
}

// ── الأزرار ───────────────────────────────────────
const buttons = new Map();

function sweep(now = Date.now()) {
  for (const [key, entry] of buttons) if (entry.exp <= now) buttons.delete(key);
  while (buttons.size > MAX_BUTTONS) buttons.delete(buttons.keys().next().value);
}

/** زر بحمولة: once ⇒ يُستهلك عند أول ضغطة (تأكيد) */
function button(userId, text, payload, { once = false } = {}) {
  sweep();
  const key = crypto.randomBytes(6).toString("base64url");
  buttons.set(key, { user: String(userId), payload, once, exp: Date.now() + BUTTON_TTL_MS });
  return { text, callback_data: `x:${key}` };
}

const urlButton = (text, url) => ({ text, url });

/** حمولة زر لمن ضغطه فقط (null: منتهٍ/لغيره) */
function takeButton(userId, data) {
  const key = String(data || "").startsWith("x:") ? String(data).slice(2) : "";
  const entry = buttons.get(key);
  if (!entry || entry.exp <= Date.now()) return { ok: false, code: "expired" };
  if (entry.user !== String(userId)) return { ok: false, code: "not-yours" };
  if (entry.once) buttons.delete(key);
  return { ok: true, payload: entry.payload };
}

/** صفوف أزرار: مصفوفة صفوف أو قائمة مسطحة تُقسم perRow */
function keyboard(items, perRow = 2) {
  const list = items.filter(Boolean);
  if (list.every(Array.isArray)) return { inline_keyboard: list.map((r) => r.filter(Boolean)).filter((r) => r.length) };
  const rows = [];
  for (let i = 0; i < list.length; i += perRow) rows.push(list.slice(i, i + perRow));
  return { inline_keyboard: rows };
}

// ── شاشات الإدخال ─────────────────────────────────
const inputs = new Map();
const inputKey = (chatId, userId) => `${chatId}|${userId}`;

function startInput(chatId, userId, step, data = {}, { secret = false } = {}) {
  inputs.set(inputKey(chatId, userId), { step, data, secret, exp: Date.now() + INPUT_TTL_MS });
}

function takeInput(chatId, userId) {
  const key = inputKey(chatId, userId);
  const entry = inputs.get(key);
  if (!entry) return null;
  inputs.delete(key);
  return entry.exp > Date.now() ? entry : null;
}

const hasInput = (chatId, userId) => {
  const entry = inputs.get(inputKey(chatId, userId));
  return Boolean(entry && entry.exp > Date.now());
};

const CANCEL_WORDS = new Set(["الغاء", "إلغاء", "cancel", "cancelar", "/cancel", "stop", "/stop"]);

// ── تفضيلات المستخدمين (اللغة · آخر اسم معروف) ─────
function prefsFile() {
  return process.env.TERBOO_TG_USERS || path.join(process.cwd(), "data", "telegram", "vps-users.json");
}
let prefs = null;
function loadPrefs() {
  if (prefs) return prefs;
  try {
    prefs = fs.existsSync(prefsFile()) ? JSON.parse(fs.readFileSync(prefsFile(), "utf8")) : {};
  } catch (error) {
    noteFailure("telegram-vps", error, { where: "tg-ui:loadPrefs", fallback: "empty-prefs" });
    prefs = {};
  }
  return prefs;
}
function savePrefs() {
  const file = prefsFile();
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(prefs, null, 1)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/** يسجّل آخر ظهور للمستخدم (اسمه للعرض للمالك) ويعيد لغته */
function touchUser(from, fallbackLang = "ar") {
  const all = loadPrefs();
  const id = String(from?.id || "");
  if (!id) return fallbackLang;
  const entry = all[id] || {};
  const guessed = String(from.language_code || "").slice(0, 2);
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  const changed = !all[id] || entry.name !== name || entry.username !== (from.username || "");
  all[id] = { ...entry, name, username: from.username || "", lang: entry.lang || (LANGS.has(guessed) ? guessed : fallbackLang), seenAt: changed ? new Date().toISOString() : entry.seenAt || new Date().toISOString() };
  if (changed) savePrefs();
  return all[id].lang;
}

function setLang(userId, lang) {
  if (!LANGS.has(lang)) return false;
  const all = loadPrefs();
  all[String(userId)] = { ...(all[String(userId)] || {}), lang };
  savePrefs();
  return true;
}

/** اسم معروف لمستخدم تيليجرام (للمالك) أو معرّفه */
function userLabel(tgId) {
  const entry = loadPrefs()[String(tgId)];
  if (!entry) return `ID ${tgId}`;
  return [entry.name, entry.username ? `@${entry.username}` : ""].filter(Boolean).join(" ") || `ID ${tgId}`;
}

const knownUser = (tgId) => Boolean(loadPrefs()[String(tgId)]);

function _resetUi() {
  buttons.clear();
  inputs.clear();
  prefs = null;
}

export {
  CANCEL_WORDS, LANGS, _resetUi, bullet, button, card, code, esc, hasInput, keyboard, knownUser,
  row, setLang, startInput, t, takeButton, takeInput, touchUser, urlButton, userLabel,
};
