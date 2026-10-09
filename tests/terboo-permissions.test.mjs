// ═══════════════════════════════════════════════
// 🧪 Terboo Permission Engine — قرارات صريحة لكل مستوى
// ───────────────────────────────────────────────
// owner · group-admin · panel-owner · vps-buyer · user × إجراءات المجموعة/الحساب/VPS/اللوحات/SSH/المشاريع
// · التأكيد المركزي (الجماعي بلا تجاوز أبداً) · حماية الأهداف · هوية LID ⇒ مالك · أدوار قديمة بلا تسرّب للذكاء.
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-perm-"));
process.env.TERBOO_VPS_STORE = path.join(tmp, "vps.json");
const config = (await import("../config.js")).default;
const OWNER_NUM = "201000000999";
config.owner.number = [OWNER_NUM];
const { initDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const P = await import("../src/lib/terboo-permissions.js");
const { learn } = await import("../src/lib/terboo-identity.js");
const { D, L } = { D: P.DECISION, L: P.LEVEL };
const results = [];
const check = async (name, fn) => { await fn(); results.push(name); };

const principal = (over = {}) => ({ canonical: "pn:201000000001", isOwner: false, inGroup: true, isGroupAdmin: false, botIsAdmin: true, vps: [], panels: [], level: L.USER, ...over });
const owner = principal({ canonical: `pn:${OWNER_NUM}`, isOwner: true, level: L.OWNER });
const admin = principal({ isGroupAdmin: true, level: L.GROUP_ADMIN });
const user = principal();
const buyer = principal({ vps: ["101"], level: L.VPS_BUYER });
const panelOwner = principal({ panels: ["p1"], level: L.PANEL_OWNER });

await check("group-actions", async () => {
  assert.equal(P.decide({ principal: user, action: "group.member.kick", targets: [{}] }).reason, "needs-group-admin");
  assert.equal(P.decide({ principal: admin, action: "group.member.kick", targets: [{}] }).decision, D.ALLOWED, "طرد عضو واحد محدد: بلا تأكيد (تراجع متاح)");
  assert.equal(P.decide({ principal: owner, action: "group.member.kick", targets: [{}] }).decision, D.ALLOWED);
  assert.equal(P.decide({ principal: admin, action: "group.members.kickAll" }).decision, D.NEEDS_OWNER, "الطرد الجماعي للمالك فقط");
  assert.equal(P.decide({ principal: owner, action: "group.members.kickAll" }).decision, D.NEEDS_CONFIRMATION);
  assert.equal(P.decide({ principal: owner, action: "group.members.kickAll", explicit: true }).decision, D.NEEDS_CONFIRMATION, "الجماعي: لا تجاوز للتأكيد أبداً");
  assert.equal(P.decide({ principal: owner, action: "group.members.kickAll", confirmed: true }).decision, D.ALLOWED);
  assert.equal(P.decide({ principal: admin, action: "group.settings.lock" }).decision, D.ALLOWED);
  assert.equal(P.decide({ principal: user, action: "group.settings.get" }).decision, D.ALLOWED);
  assert.equal(P.decide({ principal: { ...admin, botIsAdmin: false }, action: "group.settings.lock" }).reason, "bot-not-admin");
  assert.equal(P.decide({ principal: { ...admin, inGroup: false }, action: "group.settings.lock" }).reason, "group-only");
  assert.equal(P.decide({ principal: admin, action: "group.member.kick", targets: [] }).decision, D.NEEDS_TARGET);
});

await check("account-and-owner-tools", async () => {
  assert.equal(P.decide({ principal: user, action: "contact.block", targets: [{}] }).decision, D.NEEDS_OWNER);
  assert.equal(P.decide({ principal: owner, action: "contact.block", targets: [{}] }).decision, D.NEEDS_CONFIRMATION);
  assert.equal(P.decide({ principal: owner, action: "contact.block", targets: [{}], explicit: true }).decision, D.ALLOWED, "المالك بطلب صريح يتجاوز تأكيد الحظر");
  assert.equal(P.decide({ principal: admin, action: "message.send_to_contact", targets: [{}] }).decision, D.NEEDS_OWNER);
  assert.equal(P.decide({ principal: user, action: "broadcast.run" }).decision, D.NEEDS_OWNER);
  assert.equal(P.decide({ principal: owner, action: "ssh.exec" }).decision, D.PROVIDER_NOT_AVAILABLE, "لا مضيف SSH مسجّل ⇒ لا أداة");
  assert.equal(P.decide({ principal: user, action: "project.write" }).decision, D.NEEDS_OWNER);
  assert.equal(P.decide({ principal: user, action: "nonexistent.action" }).reason, "unknown-action");
});

await check("resources", async () => {
  assert.equal(P.decide({ principal: buyer, action: "vps.user.power", resource: { vpsId: "101" } }).decision, D.ALLOWED);
  assert.equal(P.decide({ principal: buyer, action: "vps.user.power", resource: { vpsId: "999" } }).decision, D.RESOURCE_NOT_OWNED, "VPS ليس له ⇒ رفض حتى لو عرف رقمه");
  assert.equal(P.decide({ principal: user, action: "vps.user.power", resource: { vpsId: "101" } }).decision, D.RESOURCE_NOT_OWNED);
  assert.equal(P.decide({ principal: buyer, action: "vps.user.destructive", resource: { vpsId: "101" } }).decision, D.NEEDS_CONFIRMATION);
  assert.equal(P.decide({ principal: buyer, action: "vps.user.power", resource: {} }).decision, D.NEEDS_TARGET);
  assert.equal(P.decide({ principal: panelOwner, action: "panel.user.read", resource: { panelId: "p1" } }).decision, D.ALLOWED);
  assert.equal(P.decide({ principal: panelOwner, action: "panel.user.read", resource: { panelId: "p2" } }).decision, D.RESOURCE_NOT_OWNED);
  assert.equal(P.decide({ principal: buyer, action: "vps.admin.read" }).decision, P.providerAvailable("virtualizor-admin") ? D.NEEDS_OWNER : D.PROVIDER_NOT_AVAILABLE);
});

await check("target-protection", async () => {
  const sock = { user: { id: "201111111111:5@s.whatsapp.net" } };
  const targets = [
    { jid: "201111111111@s.whatsapp.net" },
    { jid: "201000000002@s.whatsapp.net", admin: "superadmin" },
    { jid: `${OWNER_NUM}@s.whatsapp.net` },
    { jid: "201000000003@s.whatsapp.net", admin: "admin" },
    { jid: "201000000004@s.whatsapp.net" },
    { jid: "201000000001@s.whatsapp.net" },
  ];
  const { allowed, excluded } = P.protectTargets({ principal: { ...owner, canonical: "pn:201000000001" }, action: "group.members.kickAll", targets, sock });
  assert.deepEqual(allowed.map((x) => x.jid), ["201000000004@s.whatsapp.net"]);
  const reasons = excluded.map((x) => x.reason.split(" ")[0]);
  assert.deepEqual(reasons, ["bot-itself", "group-creator", "bot-owner-protected", "admin-protected", "requester-self"]);
  const withAdmins = P.protectTargets({ principal: owner, action: "group.members.kickAll", targets: [targets[3]], sock, allowAdmins: true });
  assert.equal(withAdmins.allowed.length, 1, "المشرفون يُشمَلون فقط بسياسة صريحة من المالك");
});

await check("identity", async () => {
  learn("88800011122233@lid", `${OWNER_NUM}@s.whatsapp.net`, "test");
  const lidOwner = await P.principalOf({ m: { sender: "88800011122233@lid", chat: "x@s.whatsapp.net", isGroup: false } });
  assert.equal(lidOwner.isOwner, true, "المالك برسالة LID يُعرف من هويته");
  assert.equal(lidOwner.level, L.OWNER);
  const stranger = await P.principalOf({ m: { sender: "201000000077@s.whatsapp.net", chat: "x@s.whatsapp.net", isGroup: false, isOwner: true } });
  assert.equal(stranger.isOwner, false, "علم isOwner مزوّر على PN معروف لا يمنح الملكية");
  assert.equal(P.phoneOf("88800011122233@lid"), OWNER_NUM, "LID ⇒ رقم الهاتف لأنظمة الأدوار القديمة");
  const { cleanNumber } = await import("../src/lib/terboo-roles-cpanel.js");
  assert.equal(cleanNumber("88800011122233@lid"), OWNER_NUM, "أدوار cPanel تقارن رقم الهاتف لا LID");
});

await check("legacy-roles-hidden-from-ai", async () => {
  const { loadPlugins, getPlugin } = await import("../src/lib/terboo-plugins.js");
  await loadPlugins(path.join(process.cwd(), "plugins"));
  const { buildIndex, isAvailable } = await import("../src/lib/terboo-command-index.js");
  // V6 §23: معزول افتراضياً (خارج فهرس الذكاء) — ثم نفعّله كما يفعل المالك صراحةً لنختبر إخفاء الأدوار
  assert.equal(buildIndex(true).some((e) => e.name === "delvps"), false, "DigitalOcean القديم خارج الفهرس افتراضياً");
  getPlugin("delvps").config.isEnabled = true;
  const delvps = buildIndex(true).find((e) => e.name === "delvps");
  assert.ok(delvps, "أمر DigitalOcean القديم موجود بعد التفعيل الصريح");
  const normal = { sender: "201000000055@s.whatsapp.net", isOwner: false };
  assert.equal(isAvailable(delvps, normal), false, "مستخدم بلا دور ⇒ لا يُقترح له حذف VPS");
  config.digitalocean = { ...(config.digitalocean || {}), sellers: ["201000000055"] };
  const seller = { sender: "201000000056@s.whatsapp.net", isOwner: false };
  config.digitalocean.sellers.push("201000000056");
  assert.equal(isAvailable(delvps, seller), true, "البائع المسجّل يراه");
  assert.equal(isAvailable(delvps, { sender: "x@s.whatsapp.net", isOwner: true }), true);
});

await check("matrix", async () => {
  const rows = P.permissionMatrix();
  assert.ok(rows.length >= 40);
  const kickAll = rows.find((r) => r.action === "group.members.kickAll");
  assert.equal(kickAll.decisions.owner, D.NEEDS_CONFIRMATION);
  assert.equal(kickAll.decisions.user, D.NEEDS_OWNER);
  assert.equal(rows.find((r) => r.action === "vps.user.power").decisions["vps-buyer"], D.ALLOWED);
});

console.log(`✅ terboo-permissions: ${results.join(" · ")}`);
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* مجلد مؤقت */ }
process.exit(0);
