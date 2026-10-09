// ═══════════════════════════════════════════════
// 🦖 لوحات المستخدم — التخزين المشفّر
// ───────────────────────────────────────────────
// النموذج داخل سجل المستخدم نفسه:
//   user.integrations.pterodactyl = [{ id, label, baseUrl, apiType, encryptedCredential,
//                                       owner, status, lastCheck, capabilities, createdAt, updatedAt }]
// المفتاح لا يُخزَّن إلا مشفّراً (AES-256-GCM عبر الخزنة) ومربوطاً بمعرّف اللوحة وصاحبها (AAD)،
// فلا يصلح نقل مفتاح مشفّر من لوحة/مستخدم لآخر. فكّ التشفير لحظي داخل الطلب فقط.
// ═══════════════════════════════════════════════

import crypto from "node:crypto";
import { getDatabase } from "../../terboo-database.js";
import { noteFailure } from "../../terboo-failure-log.js";
import { identityOf } from "../../terboo-identity.js";
import { forgetSecret, registerSecret } from "../../terboo-secrets.js";
import { decryptSecret, encryptSecret, maskSecret } from "../../terboo-vault.js";

const CONTEXT = "integrations.pterodactyl";
let dbOverride = null;

function db() {
  return dbOverride || getDatabase();
}

function identityFrom(value) {
  return value && typeof value === "object" && value.canonical ? value : identityOf(String(value || ""));
}

/** مفتاح سجل المستخدم في قاعدة البيانات (الرقم الحقيقي إن عُرف) */
function recordKey(identity) {
  const id = identityFrom(identity);
  return id.pn || id.lid || id.input;
}

function aadOf(panel) {
  return `${panel.id}|${panel.owner}`;
}

/** كل لوحات المستخدم (السجلات كما هي — للاستخدام الداخلي فقط) */
function panelsOf(identity) {
  const user = db().getUser(recordKey(identity));
  const list = user?.integrations?.pterodactyl;
  return Array.isArray(list) ? list : [];
}

function savePanels(identity, panels) {
  const key = recordKey(identity);
  const user = db().getUser(key) || {};
  db().setUser(key, { integrations: { ...(user.integrations || {}), pterodactyl: panels } });
}

function findPanel(identity, panelId) {
  return panelsOf(identity).find((p) => p.id === String(panelId || "")) || null;
}

/** ينشئ سجلاً جديداً بمفتاح مشفّر (لا يحفظ — الحفظ بعد نجاح اختبار الاتصال) */
function newPanelRecord(identity, { label, baseUrl, apiType, apiKey }) {
  const id = identityFrom(identity);
  const panel = {
    id: crypto.randomBytes(4).toString("hex"),
    label,
    baseUrl,
    apiType,
    owner: id.canonical,
    status: "pending",
    lastCheck: null,
    capabilities: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  panel.encryptedCredential = encryptSecret(apiKey, { context: CONTEXT, aad: aadOf(panel) });
  return panel;
}

/** يفك المفتاح لحظياً (ويسجّله كسرّ حتى لا يظهر في أي سجل) */
function openCredential(panel) {
  const key = decryptSecret(panel.encryptedCredential, { context: CONTEXT, aad: aadOf(panel) });
  registerSecret(key);
  return key;
}

function sealCredential(panel, apiKey) {
  return encryptSecret(apiKey, { context: CONTEXT, aad: aadOf(panel) });
}

/** ينسى المفتاح من سجل الأسرار عند الحذف/الاستبدال */
function forgetCredential(panel) {
  try {
    forgetSecret(openCredential(panel));
  } catch (error) {
    // مفتاح تالف/خزنة مختلفة: لا شيء في الذاكرة لننساه (الحذف يكمل)
    noteFailure("pterodactyl", error, { where: "pterodactyl-store:forgetCredential", stage: "decrypt", fallback: "delete-anyway" });
  }
}

/** عرض آمن: بلا مفتاح ولا تشفير — المفتاح يظهر مقنّعاً دائماً */
function maskedPanel(panel) {
  let host = "";
  try {
    host = new URL(panel.baseUrl).host;
  } catch {
    host = "";
  }
  return {
    id: panel.id,
    label: panel.label,
    host,
    apiType: panel.apiType,
    status: panel.status,
    lastCheck: panel.lastCheck,
    capabilities: panel.capabilities,
    key: maskSecret(),
  };
}

function _useDatabase(mock) {
  dbOverride = mock;
}

export { CONTEXT, _useDatabase, findPanel, forgetCredential, identityFrom, maskedPanel, newPanelRecord, openCredential, panelsOf, recordKey, savePanels, sealCredential };
export default { panelsOf, findPanel, savePanels, newPanelRecord, openCredential, sealCredential, maskedPanel };
