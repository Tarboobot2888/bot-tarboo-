// ═══════════════════════════════════════════════
// 💎 Terboo VPS — كتالوج الباقات (مصدر واحد للبطاقات والصور والذكاء)
// ───────────────────────────────────────────────
// الباقات كما حددها المالك حرفياً. config.virtualizor.plans.standard/economy (إن لم تكن فارغة)
// تحل محل الافتراضي بنفس الحقول.
// الشراء لا يحدث داخل البوت: عرض ← تواصل مع المالك ← دفع خارجي ← تحقق المالك ← منح الصلاحية.
// لا يُنشأ أي VPS بضغطة زر.
// ═══════════════════════════════════════════════

import config from "../../config.js";

const IPV4 = 1;
const IPV6 = "/64";

/** [معرّف · أنوية · رام GB · تخزين GB · نقل GB · دولار · جنيه] */
const STANDARD = [
  ["std-1", 4, 8, 120, 20000, 6.5, 350],
  ["std-2", 6, 12, 180, 30000, 8.5, 450],
  ["std-3", 8, 16, 240, 40000, 10.5, 550],
  ["std-4", 10, 20, 300, 50000, 12.5, 650],
  ["std-5", 12, 24, 360, 60000, 14.4, 750],
  ["std-6", 14, 28, 420, 70000, 16.3, 850],
  ["std-7", 16, 32, 480, 80000, 18, 950],
];
const ECONOMY = [
  ["eco-1", 1, 1, 20, 80000, 0.5, 25],
  ["eco-2", 1, 2, 50, 80000, 1, 50],
  ["eco-3", 2, 4, 80, 80000, 2, 100],
  ["eco-4", 4, 8, 150, 80000, 5, 250],
];

const toPlan = (tier, storage) => ([id, cpu, ram, disk, bandwidth, usd, egp]) => ({
  id, tier, cpu, ramGb: ram, diskGb: disk, storage, bandwidthGb: bandwidth, ipv4: IPV4, ipv6: IPV6, priceUsd: usd, priceEgp: egp,
});

const DEFAULT_PLANS = Object.freeze({
  standard: STANDARD.map(toPlan("standard", "NVMe")),
  economy: ECONOMY.map(toPlan("economy", "")),
});

/** باقة من إعداد المالك (نفس الحقول) — الحقول الناقصة تُرفض بدل عرض بيانات ناقصة */
function fromConfig(tier, rows) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const clean = rows
    .map((row, i) => ({
      id: String(row.id || `${tier.slice(0, 3)}-${i + 1}`),
      tier,
      cpu: Number(row.cpu),
      ramGb: Number(row.ramGb ?? row.ram),
      diskGb: Number(row.diskGb ?? row.disk),
      storage: String(row.storage || ""),
      bandwidthGb: Number(row.bandwidthGb ?? row.bandwidth),
      ipv4: Number(row.ipv4 ?? IPV4),
      ipv6: String(row.ipv6 ?? IPV6),
      priceUsd: Number(row.priceUsd ?? row.usd),
      priceEgp: Number(row.priceEgp ?? row.egp),
    }))
    .filter((p) => [p.cpu, p.ramGb, p.diskGb, p.bandwidthGb, p.priceUsd, p.priceEgp].every(Number.isFinite));
  return clean.length ? clean : null;
}

/**
 * الباقات الفعلية لكل فئة.
 * V6: القياسية (7 باقات المالك) دائماً؛ الاقتصادية لا تُعرض افتراضياً — فقط إن ضبط المالك صراحةً
 * config.virtualizor.plans.economyEnabled = true (أو كتب صفوفها بنفسه في plans.economy).
 */
function plans() {
  const custom = config.virtualizor?.plans || {};
  const ownEconomy = fromConfig("economy", custom.economy);
  return {
    standard: fromConfig("standard", custom.standard) || DEFAULT_PLANS.standard,
    economy: ownEconomy || (custom.economyEnabled === true ? DEFAULT_PLANS.economy : []),
  };
}

const TIERS = Object.freeze(["standard", "economy"]);

/** الفئات المعروضة فعلاً (فيها باقات) */
function offeredTiers() {
  const all = plans();
  return TIERS.filter((tier) => all[tier].length > 0);
}

function planById(id) {
  const all = plans();
  return [...all.standard, ...all.economy].find((p) => p.id === String(id || "")) || null;
}

/** ‎20000 GB ⇒ 20 TB للعرض */
function bandwidthLabel(gb) {
  return gb >= 1000 && gb % 1000 === 0 ? `${gb / 1000} TB` : `${gb} GB`;
}

function priceLabel(plan) {
  return `$${plan.priceUsd} · ${plan.priceEgp} EGP`;
}

/** سطر مواصفات مختصر بلا ترجمة (أرقام ووحدات تقنية) */
function specLine(plan) {
  return `${plan.cpu} vCPU · ${plan.ramGb} GB RAM · ${plan.diskGb} GB${plan.storage ? ` ${plan.storage}` : ""}`;
}

/** رقم واتساب المالك للتواصل (أرقام فقط) */
function ownerWhatsapp() {
  return String(config.virtualizor?.ownerContact?.whatsapp || "").replace(/\D/g, "");
}

/** رابط تواصل مع المالك برسالة جاهزة */
function contactUrl(message = "") {
  const number = ownerWhatsapp();
  if (!number) return "";
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export { DEFAULT_PLANS, TIERS, bandwidthLabel, contactUrl, offeredTiers, ownerWhatsapp, planById, plans, priceLabel, specLine };
export default { plans, planById, TIERS, offeredTiers, specLine, priceLabel, bandwidthLabel, contactUrl, ownerWhatsapp };
