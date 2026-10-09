// ═══════════════════════════════════════════════
// 🛡️ Terboo Permission Engine — محرّك الصلاحيات المركزي
// ───────────────────────────────────────────────
// المستويات: owner · group-admin (في نطاق مجموعته) · panel-owner (لوحاته فقط) · vps-buyer (VPS الممنوحة له فقط) · user
// كل أداة/إجراء يمر من decide() بقرار صريح:
//   allowed · denied · needs-confirmation · needs-target · needs-owner · resource-not-owned · provider-not-available
// الهوية تُحسب وقت التنفيذ من المرسل نفسه (PN/LID ⇒ هوية قانونية) وبيانات المجموعة الحيّة،
// لا من اسم أو JID يمرره النموذج. النموذج لا يمنح صلاحية ولا يتجاوزها.
// التأكيد مركزي: المدمّر يحتاج تأكيداً؛ المالك فقط يتجاوزه حين يكون الطلب صريحاً والسياسة تسمح (لا للجماعي أبداً).
// ═══════════════════════════════════════════════

import config, { isOwner as configIsOwner, isPartner, isPremium } from "../../config.js";
import { noteFailure } from "./terboo-failure-log.js";
import { identityOf, isBot } from "./terboo-identity.js";
import { getAllRolesForUser } from "./terboo-roles-cpanel.js";

const LEVEL = Object.freeze({ OWNER: "owner", GROUP_ADMIN: "group-admin", PANEL_OWNER: "panel-owner", VPS_BUYER: "vps-buyer", USER: "user" });
const DECISION = Object.freeze({
  ALLOWED: "allowed", DENIED: "denied", NEEDS_CONFIRMATION: "needs-confirmation", NEEDS_TARGET: "needs-target",
  NEEDS_OWNER: "needs-owner", RESOURCE_NOT_OWNED: "resource-not-owned", PROVIDER_NOT_AVAILABLE: "provider-not-available",
});

/**
 * سياسة كل إجراء:
 *  min: أدنى مستوى · scope: group|global|resource · botAdmin: البوت يجب أن يكون مشرفاً
 *  target: يحتاج هدفاً · destructive (يغيّر/يزيل) · confirm: يحتاج تأكيداً قبل التنفيذ · bulk (تأكيد دائماً، بلا تجاوز)
 *  · ownerBypass: المالك يتجاوز التأكيد بطلب صريح
 *  طرد/تنزيل عضو واحد محدد بوضوح: مدمّر لكن بلا تأكيد (هدف واحد مُتحقق منه + زر تراجع)؛ الغامض يُسأل عنه في المحلل.
 *  provider: مزوّد يجب أن يكون مُعداً · resource: vps|panel
 */
const ACTIONS = Object.freeze({
  // ── المجموعات ──
  "group.members.list": { min: LEVEL.USER, scope: "group" },
  "group.admins.list": { min: LEVEL.USER, scope: "group" },
  "group.member.presence": { min: LEVEL.USER, scope: "group" },
  "group.settings.get": { min: LEVEL.USER, scope: "group" },
  "group.member.add": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true, target: true },
  "group.member.readd": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true, target: true },
  "group.member.kick": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true, target: true, destructive: true },
  "group.member.promote": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true, target: true },
  "group.member.demote": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true, target: true, destructive: true },
  "group.member.warn": { min: LEVEL.GROUP_ADMIN, scope: "group", target: true },
  "group.member.mute": { min: LEVEL.GROUP_ADMIN, scope: "group", target: true },
  "group.member.unmute": { min: LEVEL.GROUP_ADMIN, scope: "group", target: true },
  "group.members.kickAll": { min: LEVEL.OWNER, scope: "group", botAdmin: true, destructive: true, confirm: true, bulk: true },
  // عدة أعضاء محددين بالاسم/المنشن: المشرف يقدر عليهم فرداً فرداً أصلاً ⇒ نفس المستوى، مع تأكيد جماعي إلزامي
  "group.members.kickSelected": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true, target: true, destructive: true, confirm: true, bulk: true },
  "group.members.promoteSelected": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true, target: true, confirm: true, bulk: true },
  "group.members.demoteSelected": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true, target: true, destructive: true, confirm: true, bulk: true },
  "group.settings.lock": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true },
  "group.settings.schedule": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true },
  "group.settings.unlock": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true },
  "group.settings.restrict": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true },
  "group.settings.unrestrict": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true },
  "group.subject.set": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true },
  "group.description.set": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true },
  "group.invite.get": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true },
  "group.invite.revoke": { min: LEVEL.GROUP_ADMIN, scope: "group", botAdmin: true, destructive: true, confirm: true, ownerBypass: true },
  // ── حساب البوت والرسائل ──
  "contact.block": { min: LEVEL.OWNER, scope: "global", target: true, destructive: true, confirm: true, ownerBypass: true },
  "contact.unblock": { min: LEVEL.OWNER, scope: "global", target: true },
  "message.send_to_contact": { min: LEVEL.OWNER, scope: "global", target: true },
  "broadcast.run": { min: LEVEL.OWNER, scope: "global", bulk: true, confirm: true },
  "childbots.list": { min: LEVEL.OWNER, scope: "global" },
  "task.cancel": { min: LEVEL.USER, scope: "global" },
  // ── VPS ──
  "vps.user.read": { min: LEVEL.VPS_BUYER, scope: "resource", resource: "vps" },
  "vps.user.power": { min: LEVEL.VPS_BUYER, scope: "resource", resource: "vps" },
  "vps.user.destructive": { min: LEVEL.VPS_BUYER, scope: "resource", resource: "vps", destructive: true, confirm: true },
  "vps.admin.read": { min: LEVEL.OWNER, scope: "global", provider: "virtualizor-admin" },
  "vps.admin.write": { min: LEVEL.OWNER, scope: "global", provider: "virtualizor-admin", destructive: true, confirm: true, ownerBypass: true },
  "vps.admin.entitle": { min: LEVEL.OWNER, scope: "global", target: true },
  // إنشاء VPS حقيقي (Virtualizor addvs): المالك فقط، وتأكيد دائماً (بلا تجاوز) — الذكاء لا ينشئ بنفسه
  "vps.admin.provision": { min: LEVEL.OWNER, scope: "global", provider: "virtualizor-admin", target: true, confirm: true },
  // ── Pterodactyl ──
  "panel.user.read": { min: LEVEL.PANEL_OWNER, scope: "resource", resource: "panel" },
  "panel.user.write": { min: LEVEL.PANEL_OWNER, scope: "resource", resource: "panel" },
  "panel.user.destructive": { min: LEVEL.PANEL_OWNER, scope: "resource", resource: "panel", destructive: true, confirm: true },
  "panel.admin.read": { min: LEVEL.OWNER, scope: "global", provider: "pterodactyl-admin" },
  "panel.admin.write": { min: LEVEL.OWNER, scope: "global", provider: "pterodactyl-admin", destructive: true, confirm: true, ownerBypass: true },
  // ── SSH / المشاريع ──
  "ssh.read": { min: LEVEL.OWNER, scope: "global", provider: "ssh" },
  "ssh.exec": { min: LEVEL.OWNER, scope: "global", provider: "ssh" },
  "ssh.write": { min: LEVEL.OWNER, scope: "global", provider: "ssh", destructive: true, confirm: true, ownerBypass: true },
  "project.read": { min: LEVEL.OWNER, scope: "global" },
  "project.write": { min: LEVEL.OWNER, scope: "global", destructive: true, confirm: true, ownerBypass: true },
  "project.deploy": { min: LEVEL.OWNER, scope: "global", provider: "ssh", destructive: true, confirm: true, ownerBypass: true },
});

/** المزوّدات المُعدّة فعلاً (لا أزرار ولا أدوات لما لم يُعدّ) */
function providerAvailable(name) {
  try {
    if (name === "virtualizor-admin") {
      const admin = config.virtualizor?.admin || {};
      const url = process.env.VIRTUALIZOR_ADMIN_URL || admin.url;
      const key = process.env.VIRTUALIZOR_ADMIN_API_KEY || admin.apiKey;
      return Boolean(config.virtualizor?.enabled !== false && url && key);
    }
    if (name === "pterodactyl-admin") return Object.values(config.pterodactyl || {}).some((s) => s && typeof s === "object" && s.domain && s.apikey);
    if (name === "ssh") return Boolean(global.terbooSshHostCount?.() > 0);
    if (name === "digitalocean") return Boolean(config.digitalocean?.token);
  } catch (error) {
    noteFailure("permissions", error, { where: "terboo-permissions:providerAvailable", stage: name, fallback: "unavailable" });
  }
  return false;
}

/** رقم هاتف المرسل الحقيقي (LID ⇒ PN عبر الهوية) — لأنظمة الأدوار القديمة التي تحفظ أرقاماً */
function phoneOf(jid) {
  const id = identityOf(String(jid || ""));
  return id.number || "";
}

/**
 * أنظمة الأدوار القديمة (البلوقنات تفحصها بنفسها، وبياناتها تقول «عام»):
 *   panel ⇒ أدوار cPanel (owner/ceo/reseller لكل خادم v1–v5) · vps ⇒ بائعو DigitalOcean في config.
 * تُستعمل لإخفاء هذه الأوامر عمّن لا دور له من مرشّحي الذكاء (والبلوقن يبقى يفحص بنفسه).
 */
const LEGACY_ROLE_CATEGORIES = new Set(["panel", "vps"]);
const roleCache = new Map();
function legacyRoleAccess(m, category) {
  if (!LEGACY_ROLE_CATEGORIES.has(category)) return true;
  if (ownerByIdentity(m)) return true;
  const number = phoneOf(m?.sender);
  if (!number) return false;
  const key = `${category}|${number}`;
  const hit = roleCache.get(key);
  if (hit && Date.now() - hit.at < 30_000) return hit.ok;
  let ok = false;
  try {
    if (category === "panel") ok = (getAllRolesForUser(number) || []).length > 0;
    if (category === "vps") ok = [...(config.digitalocean?.sellers || []), ...(config.digitalocean?.ownerPanels || [])].map(String).includes(number);
  } catch (error) {
    noteFailure("permissions", error, { where: "terboo-permissions:legacyRoleAccess", stage: category, fallback: "no-access" });
  }
  roleCache.set(key, { ok, at: Date.now() });
  while (roleCache.size > 2000) roleCache.delete(roleCache.keys().next().value);
  return ok;
}

/** المالك: المرسل (PN أو مقابل LID) في قائمة المالكين، أو البوت نفسه */
function ownerByIdentity(m) {
  if (m?.fromMe) return true;
  const id = identityOf(String(m?.sender || ""));
  // LID بلا رقم معروف بعد: لا يمكن المطابقة هنا ⇒ علم serialize (يقرأ participantAlt) هو الدليل الوحيد
  return Boolean((id.pn && configIsOwner(id.pn)) || (id.number && configIsOwner(id.number)) || (id.lid && !id.pn && m?.isOwner === true));
}

/**
 * الهوية الفعلية وقت التنفيذ.
 * @param {{m:Object, sock?:Object, fresh?:boolean}} input
 */
async function principalOf({ m, sock = null, fresh = false }) {
  const id = identityOf(String(m?.sender || ""));
  const principal = {
    canonical: id.canonical, sender: m?.sender || "", number: id.number || "",
    isOwner: ownerByIdentity(m),
    isPartner: Boolean(id.pn && isPartner(id.pn)),
    isPremium: Boolean(id.pn && isPremium(id.pn)),
    inGroup: Boolean(m?.isGroup), groupId: m?.isGroup ? m.chat : "",
    isGroupAdmin: false, isGroupOwner: false, botIsAdmin: null,
    vps: [], panels: [],
  };
  if (m?.isGroup) {
    let member = null;
    let botMember = null;
    try {
      const { getDirectory, memberByJid } = await import("./terboo-group-directory.js");
      const dir = await getDirectory(sock, m.chat, { refresh: fresh });
      if (dir) {
        member = memberByJid(dir, m.sender);
        const botJids = [sock?.user?.id, sock?.user?.lid].filter(Boolean);
        botMember = botJids.map((j) => memberByJid(dir, j)).find(Boolean) || [...dir.members.values()].find((x) => isBot(x.pn || x.lid || x.id, sock)) || null;
      }
    } catch (error) {
      noteFailure("permissions", error, { where: "terboo-permissions:principalOf", stage: "directory", fallback: "message-flags" });
    }
    // بيانات المجموعة الحيّة أولاً؛ أعلام الرسالة (من serialize) فقط حين لا يتوفر الدليل
    principal.isGroupAdmin = member ? Boolean(member.admin) : Boolean(m.isAdmin);
    principal.isGroupOwner = member ? member.admin === "superadmin" : false;
    principal.botIsAdmin = botMember ? Boolean(botMember.admin) : (typeof m.isBotAdmin === "boolean" ? m.isBotAdmin : null);
  }
  try {
    const { activeFor } = await import("./providers/virtualizor/virtualizor-entitlements.js");
    principal.vps = activeFor(id).map((e) => String(e.vpsId));
  } catch (error) {
    noteFailure("permissions", error, { where: "terboo-permissions:principalOf", stage: "vps", fallback: "none" });
  }
  try {
    const { listPanels } = await import("./providers/pterodactyl/index.js");
    principal.panels = (listPanels(m?.sender) || []).map((p) => p.id);
  } catch (error) {
    noteFailure("permissions", error, { where: "terboo-permissions:principalOf", stage: "panels", fallback: "none" });
  }
  principal.level = principal.isOwner ? LEVEL.OWNER : principal.isGroupAdmin ? LEVEL.GROUP_ADMIN : principal.panels.length ? LEVEL.PANEL_OWNER : principal.vps.length ? LEVEL.VPS_BUYER : LEVEL.USER;
  return principal;
}

const result = (decision, reason, extra = {}) => ({ decision, allowed: decision === DECISION.ALLOWED, reason, ...extra });

/**
 * قرار صلاحية لإجراء واحد.
 * @param {{principal:Object, action:string, resource?:{vpsId?:string, panelId?:string}, targets?:Array,
 *          confirmed?:boolean, explicit?:boolean}} input
 *   explicit: طلب المالك صريح ومباشر («اطرده بدون تأكيد») — يسمح بتجاوز التأكيد حيث تسمح السياسة فقط
 */
function decide({ principal, action, resource = {}, targets = null, confirmed = false, explicit = false }) {
  const policy = ACTIONS[action];
  if (!policy) return result(DECISION.DENIED, "unknown-action", { action });
  if (policy.provider && !providerAvailable(policy.provider)) return result(DECISION.PROVIDER_NOT_AVAILABLE, policy.provider, { action });
  if (policy.scope === "group" && !principal.inGroup) return result(DECISION.DENIED, "group-only", { action });
  const owner = principal.isOwner === true;
  if (!owner) {
    if (policy.min === LEVEL.OWNER) return result(DECISION.NEEDS_OWNER, "owner-only", { action });
    if (policy.min === LEVEL.GROUP_ADMIN && !principal.isGroupAdmin) return result(DECISION.DENIED, "needs-group-admin", { action });
    if (policy.resource === "vps") {
      if (!resource.vpsId) return result(DECISION.NEEDS_TARGET, "vps", { action });
      if (!principal.vps.includes(String(resource.vpsId))) return result(DECISION.RESOURCE_NOT_OWNED, "vps", { action });
    }
    if (policy.resource === "panel") {
      if (!resource.panelId) return result(DECISION.NEEDS_TARGET, "panel", { action });
      if (!principal.panels.includes(String(resource.panelId))) return result(DECISION.RESOURCE_NOT_OWNED, "panel", { action });
    }
  }
  if (policy.botAdmin && principal.botIsAdmin === false) return result(DECISION.DENIED, "bot-not-admin", { action });
  if (policy.target && Array.isArray(targets) && targets.length === 0) return result(DECISION.NEEDS_TARGET, "target", { action });
  if (policy.confirm && !confirmed) {
    const bypass = owner && explicit && policy.ownerBypass && !policy.bulk;
    if (!bypass) return result(DECISION.NEEDS_CONFIRMATION, policy.bulk ? "bulk" : "destructive", { action });
  }
  return result(DECISION.ALLOWED, owner ? "owner" : principal.level, { action });
}

/**
 * حماية الأهداف: من لا يُمس ولماذا (يُذكر في التقرير بدل تجاهل صامت).
 * @param {{principal:Object, action:string, targets:Array<{jid:string, admin?:string|null, canonical?:string}>, sock?:Object,
 *          allowAdmins?:boolean}} input
 * @returns {{allowed:Array, excluded:Array<{target:Object, reason:string}>}}
 */
function protectTargets({ principal, action, targets, sock = null, allowAdmins = false }) {
  const allowed = [];
  const excluded = [];
  const removal = /kick|demote|block/.test(action);
  for (const target of targets || []) {
    const jid = target.jid || target.pn || target.lid || target.id || "";
    const canonical = target.canonical || identityOf(jid).canonical;
    if (isBot(jid, sock) || (target.lid && isBot(target.lid, sock))) { excluded.push({ target, reason: "bot-itself" }); continue; }
    if (removal && canonical && canonical === principal.canonical) { excluded.push({ target, reason: "requester-self" }); continue; }
    if (removal && target.admin === "superadmin") { excluded.push({ target, reason: "group-creator" }); continue; }
    const targetIsOwner = Boolean(identityOf(jid).pn && configIsOwner(identityOf(jid).pn));
    if (removal && targetIsOwner) { excluded.push({ target, reason: "bot-owner-protected" }); continue; }
    // المشرفون محميون في «الكل» فقط (لم يُسمَّ أحد)؛ من سُمّي صراحةً بالاسم/المنشن مقصود (وتنزيل المشرف يستهدف مشرفاً أصلاً)
    if (removal && /kickAll/.test(action) && target.admin && !allowAdmins) { excluded.push({ target, reason: "admin-protected" }); continue; }
    allowed.push(target);
  }
  return { allowed, excluded };
}

/** مصفوفة الصلاحيات (docs/terboo-permission-matrix.json) */
function permissionMatrix() {
  const levels = [LEVEL.OWNER, LEVEL.GROUP_ADMIN, LEVEL.PANEL_OWNER, LEVEL.VPS_BUYER, LEVEL.USER];
  const sample = (level) => ({
    canonical: `pn:${level}`, isOwner: level === LEVEL.OWNER, inGroup: true, isGroupAdmin: level === LEVEL.GROUP_ADMIN,
    botIsAdmin: true, vps: level === LEVEL.VPS_BUYER ? ["1"] : [], panels: level === LEVEL.PANEL_OWNER ? ["p1"] : [], level,
  });
  return Object.entries(ACTIONS).map(([action, policy]) => ({
    action,
    ...policy,
    decisions: Object.fromEntries(levels.map((level) => [level, decide({ principal: sample(level), action, resource: { vpsId: "1", panelId: "p1" } }).decision])),
  }));
}

export { ACTIONS, DECISION, LEGACY_ROLE_CATEGORIES, LEVEL, decide, legacyRoleAccess, ownerByIdentity, permissionMatrix, phoneOf, principalOf, protectTargets, providerAvailable };
export default { decide, principalOf, protectTargets, permissionMatrix, providerAvailable, phoneOf, LEVEL, DECISION, ACTIONS };
