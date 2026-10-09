// ═══════════════════════════════════════════════
// 🦖 لوحات المستخدم — اكتشاف القدرات (قراءة فقط)
// ───────────────────────────────────────────────
// لا تخمين أعمى: ما يظهر للمستخدم يأتي مما تقوله اللوحة نفسها.
//   Client API:      /api/client/account · /api/client (السيرفرات) · /api/client/permissions
//                    ولكل سيرفر: meta.is_server_owner + meta.user_permissions
//   Application API: فحوص قراءة لـ users · servers · nodes · locations (كل واحد مستقل)
// صلاحيات الكتابة في Application API لا تُكتشف دون تنفيذ ⇒ تبقى «غير مؤكدة» حتى أول استخدام ناجح.
// ═══════════════════════════════════════════════

import { panelRequest, PanelError } from "./pterodactyl-client.js";

/** أقسام السيرفر وما يلزم لكل قسم من صلاحيات Pterodactyl */
const SERVER_SECTIONS = Object.freeze({
  resources: { any: [] },
  console: { any: ["control.console"] },
  power: { any: ["control.start", "control.stop", "control.restart"] },
  files: { any: ["file.read", "file.read-content"] },
  backups: { any: ["backup.read"] },
  databases: { any: ["database.read"] },
  network: { any: ["allocation.read"] },
  startup: { any: ["startup.read"] },
  settings: { any: ["settings.rename", "settings.reinstall"] },
});

/** الأقسام المتاحة لسيرفر من صلاحياته الفعلية */
function sectionsFor(permissions = [], isOwner = false) {
  const set = new Set(permissions);
  const all = isOwner || set.has("*");
  return Object.entries(SERVER_SECTIONS)
    .filter(([, rule]) => all || !rule.any.length || rule.any.some((p) => set.has(p)))
    .map(([id]) => id);
}

/** هل يملك المستخدم صلاحية محددة على السيرفر؟ */
function hasPermission(meta, permission) {
  if (!meta) return false;
  if (meta.isOwner) return true;
  const list = meta.permissions || [];
  return list.includes("*") || list.includes(permission);
}

/** معلومات صلاحيات سيرفر واحد (Client API) */
async function serverMeta(panel, apiKey, identifier, { signal = null } = {}) {
  const { data } = await panelRequest(panel, apiKey, { path: `/api/client/servers/${encodeURIComponent(identifier)}`, signal });
  const attributes = data?.attributes || {};
  const meta = data?.meta || {};
  const isOwner = Boolean(meta.is_server_owner ?? attributes.server_owner);
  const permissions = Array.isArray(meta.user_permissions) ? meta.user_permissions : [];
  return { attributes, isOwner, permissions, sections: sectionsFor(permissions, isOwner), checkedAt: Date.now() };
}

/**
 * يكتشف قدرات المفتاح (قراءة فقط).
 * @returns {Promise<{ok:boolean, code:string, capabilities?:Object}>}
 */
async function discoverPanel(panel, apiKey, { signal = null } = {}) {
  if (panel.apiType === "client") {
    try {
      const account = await panelRequest(panel, apiKey, { path: "/api/client/account", signal });
      const a = account.data?.attributes || {};
      if (account.data?.object !== "user" && !a.username) return { ok: false, code: "invalid-response" };
      const servers = await panelRequest(panel, apiKey, { path: "/api/client", query: { per_page: 1 }, signal });
      let permissionKeys = [];
      try {
        const perms = await panelRequest(panel, apiKey, { path: "/api/client/permissions", signal });
        const groups = perms.data?.attributes?.permissions || {};
        permissionKeys = Object.entries(groups).flatMap(([group, def]) => Object.keys(def?.keys || {}).map((k) => `${group}.${k}`));
      } catch (error) {
        if (error?.code === "aborted") throw error;
      }
      return {
        ok: true,
        code: "ok",
        capabilities: {
          apiType: "client",
          account: { username: String(a.username || ""), admin: Boolean(a.admin) },
          serverCount: Number(servers.data?.meta?.pagination?.total ?? servers.data?.data?.length ?? 0),
          permissionKeys: permissionKeys.length,
          sections: ["servers", "account"],
          checkedAt: Date.now(),
        },
      };
    } catch (error) {
      if (error?.code === "aborted") throw error;
      return { ok: false, code: error instanceof PanelError ? error.code : "network" };
    }
  }

  // Application API: كل مورد فحص مستقل؛ مفتاح بلا أي قراءة = غير صالح
  const probes = { users: "/api/application/users", servers: "/api/application/servers", nodes: "/api/application/nodes", locations: "/api/application/locations" };
  const readable = {};
  const counts = {};
  let lastError = null;
  for (const [id, path] of Object.entries(probes)) {
    try {
      const { data } = await panelRequest(panel, apiKey, { path, query: { per_page: 1 }, signal });
      if (data?.object !== "list") throw new PanelError("invalid-response");
      readable[id] = true;
      counts[id] = Number(data?.meta?.pagination?.total ?? data?.data?.length ?? 0);
    } catch (error) {
      if (error?.code === "aborted") throw error;
      readable[id] = false;
      lastError = error;
      // عطل اتصال/مصادقة يعني أن بقية الفحوص ستفشل بنفس السبب
      if (!["forbidden", "not-found"].includes(error?.code)) break;
    }
  }
  if (!Object.values(readable).some(Boolean)) return { ok: false, code: lastError instanceof PanelError ? lastError.code : "network" };
  return {
    ok: true,
    code: "ok",
    capabilities: {
      apiType: "application",
      readable,
      counts,
      writeVerified: false,
      sections: Object.entries(readable).filter(([, v]) => v).map(([k]) => k),
      checkedAt: Date.now(),
    },
  };
}

export { SERVER_SECTIONS, discoverPanel, hasPermission, sectionsFor, serverMeta };
export default { discoverPanel, serverMeta, sectionsFor, hasPermission, SERVER_SECTIONS };
