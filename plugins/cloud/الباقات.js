// ═══════════════════════════════════════════════
// 💎 باقات Terboo VPS
// ───────────────────────────────────────────────
// عرض ← تواصل مع المالك ← دفع خارجي ← تحقق المالك ← منح الصلاحية ← تظهر لوحة التحكم.
// لا إنشاء VPS ولا دفع داخل البوت. زر التواصل رابط واتساب للمالك برسالة جاهزة بالباقة المختارة.
// ═══════════════════════════════════════════════

import { cmd, footer, langOf } from "../../src/lib/terboo-cloud-ui.js";
import { t } from "../../src/lib/terboo-localization.js";
import { bandwidthLabel, contactUrl, offeredTiers, planById, plans, priceLabel, specLine } from "../../src/lib/terboo-vps-plans.js";
import { sendCard } from "../../src/lib/terboo-ui-kit.js";
import * as UI from "../../src/lib/terboo-ui-theme.js";

const pluginConfig = {
  name: "plans",
  alias: ["الباقات", "باقات", "planes", "vpsplans"],
  category: "cloud",
  description: "باقات Terboo VPS والتواصل مع المالك للاشتراك",
  usage: ".plans",
  example: ".plans standard",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const FLOW = "plans";

function card(m, sock, lang, options) {
  return sendCard(sock, m, { cardId: "plans", lang, footer: footer(lang), flow: FLOW, ...options });
}

function planLines(lang, plan) {
  return [
    UI.row(t(lang, "plans.cpu"), `${plan.cpu} vCPU`, lang),
    UI.row(t(lang, "plans.ram"), `${plan.ramGb} GB`, lang),
    UI.row(t(lang, "plans.storage"), `${plan.diskGb} GB${plan.storage ? ` ${plan.storage}` : ""}`, lang),
    UI.row(t(lang, "plans.bandwidth"), bandwidthLabel(plan.bandwidthGb), lang),
    UI.row(t(lang, "plans.network"), `${plan.ipv4} IPv4 · 1 ${plan.ipv6} IPv6`, lang),
    UI.row(t(lang, "plans.price"), priceLabel(plan), lang),
  ].join("\n");
}

async function overview(m, sock, lang) {
  const all = plans();
  const from = (list) => list.reduce((min, p) => (p.priceUsd < min.priceUsd ? p : min), list[0]);
  const url = contactUrl(t(lang, "plans.contactMessageGeneric"));
  return card(m, sock, lang, {
    title: t(lang, "plans.title"),
    icon: "💎",
    image: "plans",
    blocks: [
      t(lang, "plans.intro"),
      offeredTiers().map((tier) => UI.row(t(lang, `plans.tier_${tier}`), t(lang, "plans.fromPrice", { count: all[tier].length, price: priceLabel(from(all[tier])) }), lang)).join("\n"),
      t(lang, "plans.howToBuy"),
    ],
    buttons: offeredTiers().map((tier) => ({ id: cmd(m, "plans", tier), text: `${tier === "standard" ? "🚀" : "🌱"} ${t(lang, `plans.tier_${tier}`)}` })),
    links: url ? [{ text: `💬 ${t(lang, "plans.btnContact")}`, url }] : [],
  });
}

async function tier(m, sock, lang, name) {
  const list = plans()[name] || [];
  return card(m, sock, lang, {
    title: t(lang, `plans.tier_${name}`),
    icon: name === "standard" ? "🚀" : "🌱",
    image: `plans-${name}`,
    blocks: [
      t(lang, `plans.tierIntro_${name}`),
      list.map((p, i) => UI.row(`${i + 1}. ${specLine(p)}`, priceLabel(p), lang)).join("\n"),
    ],
    select: {
      title: t(lang, "plans.btnChoosePlan"),
      sections: [{ title: t(lang, `plans.tier_${name}`), rows: list.map((p) => ({ id: cmd(m, "plans", "plan", p.id), title: specLine(p).slice(0, 60), description: priceLabel(p) })) }],
    },
    buttons: [{ id: cmd(m, "plans"), text: `↩️ ${t(lang, "plans.btnAllPlans")}` }],
  });
}

async function plan(m, sock, lang, id) {
  const p = planById(id);
  if (!p) return overview(m, sock, lang);
  const url = contactUrl(t(lang, "plans.contactMessage", { tier: t("en", `plans.tier_${p.tier}`), spec: specLine(p), price: priceLabel(p), id: p.id }));
  return card(m, sock, lang, {
    title: `${t(lang, `plans.tier_${p.tier}`)} · ${p.cpu} vCPU`,
    icon: "💎",
    image: `plans-${p.tier}`,
    blocks: [planLines(lang, p), t(lang, "plans.purchaseSteps")],
    links: url ? [{ text: `💬 ${t(lang, "plans.btnContact")}`, url }] : [],
    buttons: [{ id: cmd(m, "plans", p.tier), text: `↩️ ${t(lang, "plans.btnBackTier")}` }],
  });
}

async function handler(m, { sock }) {
  const lang = langOf(m);
  const [sub = "", id = ""] = (m.args || []).map((x) => String(x).toLowerCase());
  if (offeredTiers().includes(sub)) return tier(m, sock, lang, sub);
  if (sub === "plan") return plan(m, sock, lang, id);
  return overview(m, sock, lang);
}

export { pluginConfig as config, handler };
