// ═══════════════════════════════════════════════
// 🗄️ Terboo Web Store — سجلّات الموقع فوق قاعدة البيانات نفسها (V6 §44 §45 §61 §62)
// ───────────────────────────────────────────────
// مصدر حقيقة واحد: لا قاعدة بيانات منفصلة للموقع. المستخدمون هم مستخدمو البوت أنفسهم (بالهوية القانونية)،
// وهذه السجلات الجديدة (تحديات الدخول · الجلسات · الملفات) تُخزَّن عبر terboo-database.setting()
// فتُحفظ ذرياً بنفس آلية البوت. كل كتابة تمر من هنا (لا كتابة مباشرة من كل وحدة).
// الهجرة: نسخة مرقّمة، idempotent، مع نسخة احتياطية قبل أي تطبيع.
// ═══════════════════════════════════════════════

import crypto from "node:crypto";
import { getDatabase } from "./terboo-database.js";
import { noteFailure } from "./terboo-failure-log.js";

const SCHEMA_VERSION = 1;
const NS = { meta: "web:meta", challenges: "web:challenges", sessions: "web:sessions", files: "web:files" };

function db() {
  return getDatabase();
}

/** يقرأ خانة كسجل (كائن) — بلا تحوير مرجعي خارجي */
function read(ns) {
  const value = db().setting(ns);
  return value && typeof value === "object" ? value : {};
}
function write(ns, value) {
  db().setting(ns, value);
}

/** هجرة مرقّمة مع نسخة احتياطية قبل أي تطبيع (§61 §62) */
function migrate() {
  const meta = read(NS.meta);
  if (meta.schemaVersion === SCHEMA_VERSION) return meta;
  const before = meta.schemaVersion || 0;
  // نسخة احتياطية للسجلات قبل أي تغيير بنيوي
  if (before > 0) write(`${NS.meta}:backup:v${before}`, { at: new Date().toISOString(), challenges: read(NS.challenges), sessions: read(NS.sessions), files: read(NS.files) });
  for (const ns of [NS.challenges, NS.sessions, NS.files]) if (!db().setting(ns)) write(ns, {});
  const next = { schemaVersion: SCHEMA_VERSION, migratedAt: new Date().toISOString(), from: before };
  write(NS.meta, next);
  return next;
}

let migrated = false;
function ensure() {
  if (migrated) return;
  try {
    migrate();
    migrated = true;
  } catch (error) {
    noteFailure("web-store", error, { where: "terboo-web-store:ensure", stage: "migrate", fallback: "in-memory" });
  }
}

// ── نظافة دورية: حذف المنتهي ───────────────────
function prune(now = Date.now()) {
  ensure();
  for (const ns of [NS.challenges, NS.sessions, NS.files]) {
    const all = read(ns);
    let changed = false;
    for (const [key, entry] of Object.entries(all)) {
      if (entry?.expiresAt && Date.parse(entry.expiresAt) <= now) { delete all[key]; changed = true; }
    }
    if (changed) write(ns, all);
  }
}

// ═══════════════════════════════════════════════
// تحديات الدخول (one-time challenge يؤكّده المستخدم عبر واتساب)
// ═══════════════════════════════════════════════

/** يُنشئ تحدياً: رمز قصير يرسله المستخدم للبوت، مربوط بطلب الموقع. لا يُخزَّن الرمز خاماً. */
function createChallenge({ ttlSeconds = 300, ip = "" } = {}) {
  ensure();
  prune();
  const id = crypto.randomBytes(12).toString("base64url");
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const all = read(NS.challenges);
  all[id] = { id, codeHash: sha(code), status: "pending", canonical: "", ip: String(ip).slice(0, 64), createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(), attempts: 0 };
  write(NS.challenges, all);
  return { id, code }; // الرمز يُعرض مرة واحدة لمن طلب الدخول ليرسله للبوت
}

const sha = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

function getChallenge(id) {
  ensure();
  const entry = read(NS.challenges)[String(id || "")];
  if (!entry) return null;
  if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) return null;
  return entry;
}

/** يؤكّد التحدي من واتساب: يطابق الرمز ويربطه بالهوية القانونية (brute-force محدود) */
function confirmChallenge(code, canonical) {
  ensure();
  prune();
  const all = read(NS.challenges);
  const hash = sha(String(code || "").trim());
  const entry = Object.values(all).find((c) => c.status === "pending" && c.codeHash === hash);
  if (!entry) {
    // عدّ المحاولات على كل التحديات المعلّقة لنفس الرمز الخاطئ (حماية من التخمين)
    for (const c of Object.values(all)) if (c.status === "pending") c.attempts = (c.attempts || 0) + 1;
    write(NS.challenges, all);
    return { ok: false, code: "invalid-code" };
  }
  if ((entry.attempts || 0) >= 8) { entry.status = "blocked"; write(NS.challenges, all); return { ok: false, code: "too-many-attempts" }; }
  entry.status = "confirmed";
  entry.canonical = String(canonical);
  entry.confirmedAt = new Date().toISOString();
  write(NS.challenges, all);
  return { ok: true, code: "confirmed", data: { id: entry.id } };
}

/** يستهلك تحدياً مؤكَّداً (مرة واحدة) ⇒ الهوية القانونية لإصدار الجلسة */
function consumeChallenge(id) {
  ensure();
  const all = read(NS.challenges);
  const entry = all[String(id || "")];
  if (!entry || entry.status !== "confirmed") return null;
  if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) return null;
  delete all[id];
  write(NS.challenges, all);
  return { canonical: entry.canonical };
}

// ═══════════════════════════════════════════════
// الجلسات (server-side؛ الكوكي يحمل المعرّف فقط)
// ═══════════════════════════════════════════════

function createSession({ canonical, hours = 72, ip = "", userAgent = "" }) {
  ensure();
  prune();
  const id = crypto.randomBytes(32).toString("base64url");
  const all = read(NS.sessions);
  const now = Date.now();
  all[sha(id)] = { canonical: String(canonical), createdAt: new Date(now).toISOString(), rotatedAt: new Date(now).toISOString(), lastSeenAt: new Date(now).toISOString(), expiresAt: new Date(now + hours * 3_600_000).toISOString(), ip: String(ip).slice(0, 64), ua: String(userAgent).slice(0, 180), csrf: crypto.randomBytes(18).toString("base64url") };
  write(NS.sessions, all);
  return { id, csrf: all[sha(id)].csrf };
}

/** يقرأ جلسة من معرّف الكوكي (يُخزَّن مجزّأً فلا يُقرأ المعرّف الخام من القاعدة) */
function getSession(rawId) {
  ensure();
  const key = sha(String(rawId || ""));
  const all = read(NS.sessions);
  const entry = all[key];
  if (!entry) return null;
  if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) { delete all[key]; write(NS.sessions, all); return null; }
  return { key, ...entry };
}

function touchSession(rawId) {
  const key = sha(String(rawId || ""));
  const all = read(NS.sessions);
  if (!all[key]) return;
  all[key].lastSeenAt = new Date().toISOString();
  write(NS.sessions, all);
}

/** تدوير معرّف الجلسة (بعد الدخول/الترقية) مع إبقاء بياناتها */
function rotateSession(rawId) {
  ensure();
  const key = sha(String(rawId || ""));
  const all = read(NS.sessions);
  const entry = all[key];
  if (!entry) return null;
  delete all[key];
  const id = crypto.randomBytes(32).toString("base64url");
  entry.rotatedAt = new Date().toISOString();
  all[sha(id)] = entry;
  write(NS.sessions, all);
  return { id, csrf: entry.csrf };
}

function destroySession(rawId) {
  const key = sha(String(rawId || ""));
  const all = read(NS.sessions);
  if (all[key]) { delete all[key]; write(NS.sessions, all); }
}

// ═══════════════════════════════════════════════
// الملفات (بيانات وصفية فقط — المحتوى على القرص بمعرّف عشوائي)
// ═══════════════════════════════════════════════

function recordFile({ owner, name, mime, size, checksum, scope = "private", path: diskPath, ttlHours = 24 }) {
  ensure();
  prune();
  const id = crypto.randomBytes(16).toString("hex");
  const all = read(NS.files);
  all[id] = { id, owner: String(owner), name: String(name).slice(0, 200), mime: String(mime || "application/octet-stream"), size: Number(size) || 0, checksum: String(checksum || ""), scope, path: String(diskPath), createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + ttlHours * 3_600_000).toISOString() };
  write(NS.files, all);
  return all[id];
}
const getFile = (id) => { ensure(); return read(NS.files)[String(id || "")] || null; };
const listFiles = (owner) => { ensure(); return Object.values(read(NS.files)).filter((f) => f.owner === String(owner) && Date.parse(f.expiresAt) > Date.now()); };
function removeFile(id) {
  const all = read(NS.files);
  const entry = all[id];
  if (entry) { delete all[id]; write(NS.files, all); }
  return entry || null;
}
/** الملفات المنتهية (للتنظيف من القرص) ثم حذف سجلاتها */
function expiredFiles(now = Date.now()) {
  ensure();
  const all = read(NS.files);
  const dead = Object.values(all).filter((f) => Date.parse(f.expiresAt) <= now);
  for (const f of dead) delete all[f.id];
  if (dead.length) write(NS.files, all);
  return dead;
}

function _resetWebStore() {
  migrated = false;
  for (const ns of Object.values(NS)) write(ns, {});
}

export {
  NS, SCHEMA_VERSION, _resetWebStore, confirmChallenge, consumeChallenge, createChallenge, createSession,
  destroySession, ensure, expiredFiles, getChallenge, getFile, getSession, listFiles, migrate, prune,
  recordFile, removeFile, rotateSession, touchSession,
};
export default { createChallenge, confirmChallenge, consumeChallenge, createSession, getSession, rotateSession, destroySession, recordFile, getFile, listFiles, removeFile };
