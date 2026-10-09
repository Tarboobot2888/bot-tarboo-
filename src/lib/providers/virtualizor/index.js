// ═══════════════════════════════════════════════
// ☁️ Terboo VPS (Virtualizor) — الواجهة الموحّدة للمزوّد
// ───────────────────────────────────────────────
// البلوقنات والذكاء الاصطناعي يستوردون من هنا فقط؛ لا استدعاء API مباشر خارج هذا المجلد.
// ═══════════════════════════════════════════════

export * as capabilities from "./virtualizor-capabilities.js";
export * as entitlements from "./virtualizor-entitlements.js";
export * as owner from "./virtualizor-owner-service.js";
export * as security from "./virtualizor-security.js";
export * as user from "./virtualizor-user-service.js";
export { VirtualizorError } from "./virtualizor-client.js";
export { layerSettings, ownerContact } from "./virtualizor-config.js";
