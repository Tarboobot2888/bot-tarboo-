// ═══════════════════════════════════════════════
// ✈️ Terboo VPS على تيليجرام — لوحة العميل (نفس سيرفري.js على واتساب)
// ───────────────────────────────────────────────
// هوية تيليجرام (tg:<id>) ← صلاحية فعّالة ← ملكية هذا الـVPS ← سياسة الإجراء ← المزوّد عبر خدمة المستخدم نفسها.
// بلا صلاحية: الباقات والتواصل مع المالك. المجموعات: الطاقة · الإدارة · الأمان · النظام · الشبكة · النسخ · الأدوات
// (المتاح فعلياً فقط) · الخطِر بزر تأكيد لمرة واحدة · المدخلات (اسم المضيف · كلمة المرور) بشاشة إدخال،
// وكلمة المرور تُحذف من الدردشة فور قراءتها · إعادة التثبيت/الاستعادة تُتابَع وتبلّغ عند الانتهاء.
// ═══════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import config from "../../config.js";
import { errorText } from "../lib/terboo-cloud-ui.js";
import { noteFailure } from "../lib/terboo-failure-log.js";
import { capability } from "../lib/providers/virtualizor/virtualizor-capabilities.js";
import { details, listMine, run, templates } from "../lib/providers/virtualizor/virtualizor-user-service.js";
import { bandwidthLabel, contactUrl, offeredTiers, planById, plans, priceLabel, specLine } from "../lib/terboo-vps-plans.js";
import { bullet, button, card, code, keyboard, row, startInput, t, urlButton } from "./tg-ui.js";

const GROUP_ICONS = { power: "⚡", management: "🧭", security: "🔐", system: "🛠️", network: "🌐", backups: "🗄️", tools: "🧰" };
const ACTION_ICONS = {
  "vps.start": "▶️", "vps.restart": "🔄", "vps.stop": "⏹️", "vps.poweroff": "⏻", "vps.hostname": "🏷️", "vps.password": "🔑",
  "vps.reinstall": "💿", "vps.services": "🧩", "vps.service.restart": "♻️", "vps.vnc": "🖥️", "vps.backups": "🗄️", "vps.restore": "⏪",
};
const STATUS_ICONS = { running: "🟢", stopped: "🔴", suspended: "⏸️", unknown: "⚪" };
const WATCHED = new Set(["vps.reinstall", "vps.restore"]);
const WATCH_LIMIT_MS = 25 * 60 * 1000;
const short = (action) => action.replace(/^vps\./, "").replace(/\./g, "_");

function failText(lang, result) {
  if (result.code === "invalid-password") return `${errorText(lang, "invalid-password")}\n${t(lang, `vps.pw_${result.reason || "too-weak"}`)}`;
  return errorText(lang, result.code, { seconds: result.retryAfter });
}

/** رابط تواصل مع المالك: تيليجرام المالك إن ضُبط، وإلا واتساب */
function contactLink(lang) {
  const tgUser = String(config.telegram?.vps?.ownerUsername || "").replace(/^@/, "");
  if (tgUser) return `https://t.me/${tgUser}`;
  return contactUrl(t(lang, "plans.contactMessageGeneric"));
}

// ═══════════════════════════════════════════════
// الشاشات
// ═══════════════════════════════════════════════

function noAccess(ctx) {
  const { lang } = ctx;
  const url = contactLink(lang);
  return ctx.show({
    text: card({ title: t(lang, "vps.title"), blocks: [t(lang, "vps.noAccess"), t(lang, "vps.noAccessHint"), `🆔 ${t(lang, "tg.yourId")}: ${code(ctx.userId)}`] }),
    keyboard: keyboard([[button(ctx.userId, `💎 ${t(lang, "vps.btnPlans")}`, { s: "c.plans" })], url ? [urlButton(`💬 ${t(lang, "plans.btnContact")}`, url)] : null]),
  });
}

async function home(ctx) {
  const { lang } = ctx;
  const mine = await listMine(ctx.identity);
  if (!mine.ok) return mine.code === "no-entitlement" ? noAccess(ctx) : ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vps.title"), blocks: [errorText(lang, mine.code)] }) });
  const list = mine.data.vps;
  if (list.length === 1) return dashboard(ctx, list[0].vpsId);
  return ctx.show({
    text: card({
      title: t(lang, "vps.title"),
      blocks: [
        t(lang, "vps.count", { count: list.length }),
        list.map((v) => row(v.hostname || v.name || `VPS ${v.vpsId}`, `${STATUS_ICONS[v.status] || "⚪"} ${t(lang, `vps.status_${v.status}`)}`)).join("\n"),
        mine.data.live ? "" : t(lang, "vps.liveUnavailable"),
      ],
    }),
    keyboard: keyboard(list.map((v) => button(ctx.userId, `${STATUS_ICONS[v.status] || "⚪"} ${v.hostname || v.name || `VPS ${v.vpsId}`}`, { s: "c.vps", vpsId: v.vpsId })), 1),
  });
}

async function dashboard(ctx, vpsId) {
  const { lang } = ctx;
  const result = await details(ctx.identity, vpsId);
  if (!result.ok) return result.code === "no-entitlement" ? noAccess(ctx) : ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vps.title"), blocks: [errorText(lang, result.code, { seconds: result.retryAfter })] }) });
  const { info, actions, groups } = result.data;
  const expires = info.expiresAt ? new Date(info.expiresAt).toISOString().slice(0, 10) : t(lang, "vps.noExpiry");
  const plan = info.planId ? planById(info.planId) : null;
  const blocks = [[
    row(t(lang, "vps.status"), `${STATUS_ICONS[info.status] || "⚪"} ${t(lang, `vps.status_${info.status}`)}`),
    row(t(lang, "vps.hostname"), info.hostname || "-"),
    `▸ <b>${t(lang, "vps.ip")}</b>: ${info.ips?.length ? info.ips.map(code).join(" · ") : "-"}`,
    row(t(lang, "vps.os"), info.os || "-"),
    row(t(lang, "vps.resources"), [info.cores ? `${info.cores} vCPU` : "", info.ramMb ? `${Math.round(info.ramMb / 1024)} GB RAM` : "", info.diskGb ? `${info.diskGb} GB` : ""].filter(Boolean).join(" · ") || "-"),
    info.uptime ? row(t(lang, "vps.uptime"), info.uptime) : "",
    plan ? row(t(lang, "vpsAdmin.plan"), `${plan.id} · ${specLine(plan)}`) : "",
    row(t(lang, "vps.expires"), expires),
  ].filter(Boolean).join("\n")];
  if (!actions.length) blocks.push(t(lang, "vps.noActions"));
  const quick = ["vps.start", "vps.restart"].filter((id) => actions.some((a) => a.id === id) && !(id === "vps.start" && info.status === "running"));
  return ctx.show({
    text: card({ title: info.hostname || `VPS ${vpsId}`, blocks }),
    keyboard: keyboard([
      quick.map((id) => button(ctx.userId, `${ACTION_ICONS[id]} ${t(lang, `vps.act_${short(id)}`)}`, { s: "c.do", vpsId, action: id })),
      ...chunk(groups.map((g) => button(ctx.userId, `${GROUP_ICONS[g] || "•"} ${t(lang, `vps.group_${g}`)}`, { s: "c.group", vpsId, group: g })), 2),
      [button(ctx.userId, `🔃 ${t(lang, "vps.btnRefresh")}`, { s: "c.vps", vpsId }), button(ctx.userId, `🏠 ${t(lang, "tg.home")}`, { s: "home" })],
    ]),
  });
}

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/** إجراءات مجموعة واحدة (الطاقة · الأمان …) */
async function groupScreen(ctx, vpsId, group) {
  const { lang } = ctx;
  const result = await details(ctx.identity, vpsId);
  if (!result.ok) return ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vps.title"), blocks: [errorText(lang, result.code)] }) });
  const actions = result.data.actions.filter((a) => a.group === group);
  return ctx.show({
    text: card({ icon: GROUP_ICONS[group] || "☁️", title: t(lang, `vps.group_${group}`), blocks: actions.map((a) => `${ACTION_ICONS[a.id] || "•"} <b>${t(lang, `vps.act_${short(a.id)}`)}</b>\n${t(lang, `vps.hint_${short(a.id)}`)}`) }),
    keyboard: keyboard([
      ...chunk(actions.map((a) => button(ctx.userId, `${ACTION_ICONS[a.id] || "•"} ${t(lang, `vps.act_${short(a.id)}`)}`, { s: "c.do", vpsId, action: a.id })), 2),
      [button(ctx.userId, `↩️ ${t(lang, "vps.btnBack")}`, { s: "c.vps", vpsId })],
    ]),
  });
}

/** شاشة تأكيد لإجراء خطِر (زر لمرة واحدة) */
function confirmScreen(ctx, vpsId, action, payload = {}) {
  const { lang } = ctx;
  const cap = capability(action);
  const risk = cap?.riskLevel === "critical" || cap?.riskLevel === "high";
  return ctx.show({
    text: card({ icon: risk ? "⚠️" : "❓", title: t(lang, "vps.confirmTitle"), blocks: [t(lang, `vps.confirm_${short(action)}`, { value: payload.hostname || payload.osName || payload.service || payload.backup || "" }), t(lang, "vps.confirmExpiry")] }),
    keyboard: keyboard([[
      button(ctx.userId, `✅ ${t(lang, "vps.btnConfirm")}`, { s: "c.ok", vpsId, action, args: payload }, { once: true }),
      button(ctx.userId, `✖️ ${t(lang, "vps.btnCancel")}`, { s: "c.vps", vpsId }),
    ]]),
  });
}

/** ينفّذ الإجراء (بعد التأكيد إن لزم) ويعرض نتيجته */
async function execute(ctx, vpsId, action, args = {}, confirmed = false) {
  const { lang } = ctx;
  const cap = capability(action);
  if (cap?.requiresBackgroundTask) await ctx.notify(t(lang, "vps.working"));
  const result = await run(ctx.identity, vpsId, action, args, { confirmed });
  if (!result.ok) {
    if (result.code === "needs-confirmation") return confirmScreen(ctx, vpsId, action, args);
    return ctx.show({ text: card({ icon: "⚠️", title: t(lang, `vps.act_${short(action)}`), blocks: [failText(lang, result)] }), keyboard: keyboard([[button(ctx.userId, `↩️ ${t(lang, "vps.btnBack")}`, { s: "c.vps", vpsId })]]), fresh: true });
  }
  const back = button(ctx.userId, `↩️ ${t(lang, "vps.btnBack")}`, { s: "c.vps", vpsId });
  switch (action) {
    case "vps.services": {
      const { services, running } = result.data;
      const canRestart = (await details(ctx.identity, vpsId)).data?.actions?.some((a) => a.id === "vps.service.restart");
      return ctx.show({
        text: card({ icon: "🧩", title: t(lang, "vps.act_services"), blocks: [services.slice(0, 40).map((s) => bullet(`${running.includes(s) ? "🟢" : "⚪"} ${s}`)).join("\n") || t(lang, "vps.emptyList")] }),
        keyboard: keyboard([...(canRestart ? chunk(services.slice(0, 20).map((s) => button(ctx.userId, `♻️ ${s}`, { s: "c.svc", vpsId, service: s })), 2) : []), [back]]),
      });
    }
    case "vps.vnc": {
      const v = result.data;
      // بيانات حساسة ⇒ رسالة جديدة تُحذف تلقائياً بعد دقيقتين
      return ctx.show({
        text: card({ icon: "🖥️", title: t(lang, "vps.act_vnc"), blocks: [[`▸ <b>${t(lang, "vps.vncAddress")}</b>: ${code(`${v.ip}:${v.port}`)}`, v.password ? `▸ <b>${t(lang, "vps.vncPassword")}</b>: ${code(v.password)}` : ""].filter(Boolean).join("\n"), t(lang, "vps.vncHint"), `⏱️ ${t(lang, "tg.autoDelete")}`] }),
        keyboard: keyboard([[back]]),
        fresh: true,
        deleteAfterMs: 120_000,
      });
    }
    case "vps.backups": {
      const b = result.data;
      const canRestore = (await details(ctx.identity, vpsId)).data?.actions?.some((a) => a.id === "vps.restore");
      return ctx.show({
        text: card({ icon: "🗄️", title: t(lang, "vps.act_backups"), blocks: [b.list.slice(0, 30).map((x) => bullet(`🗄️ ${x}`)).join("\n") || t(lang, "vps.emptyList")] }),
        keyboard: keyboard([...(canRestore ? b.list.slice(0, 15).map((x) => [button(ctx.userId, `⏪ ${x.slice(0, 40)}`, { s: "c.restore", vpsId, backup: x })]) : []), [back]]),
      });
    }
    default:
      if (WATCHED.has(action)) watch(ctx, vpsId, action);
      return ctx.show({
        text: card({ icon: "✅", title: t(lang, "vps.doneTitle"), blocks: [t(lang, `vps.done_${short(action)}`, { value: result.data?.hostname || result.data?.os || result.data?.service || result.data?.backup || "" }), result.data?.onBoot ? t(lang, "vps.onBoot") : ""] }),
        keyboard: keyboard([[back]]),
        fresh: true,
      });
  }
}

/** متابعة إعادة التثبيت/الاستعادة: إشعار عند التجهيز ومرة عند العودة للعمل (أو انتهاء المهلة) */
function watch(ctx, vpsId, action, { pollMs = Number(process.env.TERBOO_TG_WATCH_MS) || 20_000 } = {}) {
  const { lang } = ctx;
  const label = t(lang, `vps.act_${short(action)}`);
  const startedAt = Date.now();
  let sawWorking = false;
  let announced = false;
  const tick = async () => {
    if (Date.now() - startedAt > WATCH_LIMIT_MS) return ctx.notify(`⚠️ ${t(lang, "vps.watchTimeout", { action: label })}`);
    const result = await details(ctx.identity, vpsId).catch((error) => ({ ok: false, code: error?.code || "error" }));
    if (!result.ok && ["no-entitlement", "feature-disabled"].includes(result.code)) return null;
    const status = result.ok ? result.data?.info?.status : "";
    if (status && status !== "running") {
      sawWorking = true;
      if (!announced) {
        announced = true;
        await ctx.notify(`◈ ${t(lang, "vps.watchPreparing", { action: label })}`);
      }
    }
    if (status === "running" && (sawWorking || Date.now() - startedAt > 3 * pollMs)) return ctx.notify(`✓ ${t(lang, "vps.watchDone", { action: label })}`);
    const timer = setTimeout(() => tick().catch((error) => noteFailure("telegram-vps", error, { where: "tg-vps-client:watch", stage: "tick" })), pollMs);
    timer.unref?.();
    return null;
  };
  const timer = setTimeout(() => tick().catch((error) => noteFailure("telegram-vps", error, { where: "tg-vps-client:watch", stage: "tick" })), pollMs);
  timer.unref?.();
}

/** بداية إجراء من زر: إدخال / اختيار / تأكيد / تنفيذ */
async function begin(ctx, vpsId, action) {
  const { lang } = ctx;
  const cap = capability(action);
  if (!cap || cap.layer !== "enduser") return ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vps.title"), blocks: [errorText(lang, "unknown-action")] }) });
  if (action === "vps.hostname") {
    startInput(ctx.chatId, ctx.userId, "c.hostname", { vpsId });
    return ctx.show({ text: card({ icon: "🏷️", title: t(lang, "vps.act_hostname"), blocks: [t(lang, "vps.askHostname"), t(lang, "vps.cancelHint")] }), keyboard: keyboard([[button(ctx.userId, `✖️ ${t(lang, "vps.btnCancel")}`, { s: "c.vps", vpsId, cancelInput: true })]]) });
  }
  if (action === "vps.password") return confirmScreen(ctx, vpsId, action);
  if (action === "vps.reinstall") {
    const list = await templates(ctx.identity, vpsId);
    if (!list.ok) return ctx.show({ text: card({ icon: "⚠️", title: t(lang, "vps.act_reinstall"), blocks: [errorText(lang, list.code)] }) });
    const rows = list.data.templates.slice(0, 40).map((tpl) => button(ctx.userId, `${tpl.distro ? `${tpl.distro} · ` : ""}${tpl.name}`.slice(0, 60), { s: "c.os", vpsId, osid: tpl.osid, osName: tpl.name }));
    return ctx.show({
      text: card({ icon: "💿", title: t(lang, "vps.act_reinstall"), blocks: [t(lang, "vps.chooseOs"), t(lang, "vps.reinstallWarning")] }),
      keyboard: keyboard([...rows.map((b) => [b]), [button(ctx.userId, `↩️ ${t(lang, "vps.btnBack")}`, { s: "c.vps", vpsId })]]),
    });
  }
  if (cap.requiresConfirmation && !["vps.service.restart", "vps.restore"].includes(action)) return confirmScreen(ctx, vpsId, action);
  return execute(ctx, vpsId, action);
}

/** بعد تأكيد كلمة المرور/إعادة التثبيت: شاشة إدخال سرية */
function askPassword(ctx, vpsId, action, args) {
  const { lang } = ctx;
  startInput(ctx.chatId, ctx.userId, action === "vps.password" ? "c.password" : "c.reinstall", { vpsId, osid: args.osid }, { secret: true });
  return ctx.show({
    text: card({ icon: "🔑", title: t(lang, `vps.act_${short(action)}`), blocks: [t(lang, "vps.askPassword"), bullet(t(lang, "vps.passwordRules")), bullet(t(lang, "tg.passwordDeleted")), t(lang, "vps.cancelHint")] }),
    keyboard: keyboard([[button(ctx.userId, `✖️ ${t(lang, "vps.btnCancel")}`, { s: "c.vps", vpsId, cancelInput: true })]]),
  });
}

/** الباقات: صورة كل فئة (من حزمة الهوية) + المواصفات والأسعار من الكتالوج نفسه + تواصل */
async function plansScreen(ctx) {
  const { lang } = ctx;
  const catalog = plans();
  for (const tier of offeredTiers()) {
    const file = path.join(process.cwd(), "assets", "image", "ui", `plans-${tier}.jpg`);
    const lines = (catalog[tier] || []).map((p) => `• <b>${p.id}</b> — ${specLine(p)} · ${bandwidthLabel(p.bandwidthGb)} · <b>${priceLabel(p)}</b>`).join("\n");
    const caption = card({ icon: "💎", title: t(lang, `plans.tier_${tier}`), blocks: [t(lang, `plans.tierIntro_${tier}`), lines] });
    if (fs.existsSync(file) && caption.length <= 1024) await ctx.photo(fs.readFileSync(file), caption);
    else await ctx.show({ text: caption, fresh: true });
  }
  const url = contactLink(lang);
  return ctx.show({ text: card({ icon: "💬", title: t(lang, "plans.btnContact"), blocks: [`🆔 ${t(lang, "tg.yourId")}: ${code(ctx.userId)}`, t(lang, "tg.sendIdToOwner")] }), keyboard: url ? keyboard([[urlButton(`💬 ${t(lang, "plans.btnContact")}`, url)]]) : null, fresh: true });
}

// ═══════════════════════════════════════════════
// الموجّه
// ═══════════════════════════════════════════════

/** ضغطة زر عميل */
async function onClientButton(ctx, p) {
  switch (p.s) {
    case "c.home": return home(ctx);
    case "c.plans": return plansScreen(ctx);
    case "c.vps": return dashboard(ctx, p.vpsId);
    case "c.group": return groupScreen(ctx, p.vpsId, p.group);
    case "c.do": return begin(ctx, p.vpsId, p.action);
    case "c.os": return confirmScreen(ctx, p.vpsId, "vps.reinstall", { osid: p.osid, osName: p.osName });
    case "c.svc": return confirmScreen(ctx, p.vpsId, "vps.service.restart", { service: p.service });
    case "c.restore": return confirmScreen(ctx, p.vpsId, "vps.restore", { backup: p.backup });
    case "c.ok":
      if (p.action === "vps.password" || p.action === "vps.reinstall") return askPassword(ctx, p.vpsId, p.action, p.args || {});
      return execute(ctx, p.vpsId, p.action, p.args || {}, true);
    default: return home(ctx);
  }
}

/** رسالة نصية لشاشة إدخال عميل (القيمة السرية حُذفت من الدردشة قبل الوصول هنا) */
async function onClientInput(ctx, state, value) {
  const { vpsId } = state.data;
  if (state.step === "c.hostname") return confirmScreen(ctx, vpsId, "vps.hostname", { hostname: value });
  if (state.step === "c.password") return execute(ctx, vpsId, "vps.password", { password: value }, true);
  if (state.step === "c.reinstall") return execute(ctx, vpsId, "vps.reinstall", { osid: state.data.osid, password: value }, true);
  return null;
}

export { dashboard, home, onClientButton, onClientInput, plansScreen };
