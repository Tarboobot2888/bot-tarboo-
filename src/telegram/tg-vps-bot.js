// ═══════════════════════════════════════════════
// ✈️ Terboo VPS — بوت تيليجرام منفصل (العميل + المالك)
// ───────────────────────────────────────────────
// long polling · الدردشات الخاصة فقط (بيانات السيرفرات لا تُعرض في مجموعات) · طابور لكل دردشة
// (لا تتداخل ضغطات مستخدم واحد، ولا يعطّل مستخدمٌ غيره) · المالك بمعرّفات تيليجرام من الإعداد فقط.
// الأوامر: /start · /myvps · /plans · /id · /lang · /cancel · (المالك) /admin · /assign · /find
// ═══════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { noteFailure } from "../lib/terboo-failure-log.js";
import { telegramIdentity } from "../lib/providers/virtualizor/virtualizor-entitlements.js";
import { createTelegramApi } from "./tg-api.js";
import { CANCEL_WORDS, button, card, code, hasInput, keyboard, setLang, t, takeButton, takeInput, touchUser } from "./tg-ui.js";
import * as client from "./tg-vps-client.js";
import * as ownerUi from "./tg-vps-owner.js";

/** إخفاق لا يوقف التدفق لكنه يُسجَّل (لا إخفاقات صامتة) */
const logged = (where) => (error) => {
  noteFailure("telegram-vps", error, { where: `tg-vps-bot:${where}`, fallback: "continue" });
  return null;
};

const LANG_NAMES = { ar: "🇸🇦 العربية", en: "🇬🇧 English", es: "🇪🇸 Español" };

/**
 * @param {{token:string, ownerIds?:Array<string|number>, apiBase?:string, defaultLang?:string, pollTimeout?:number}} options
 */
function createVpsBot({ token, ownerIds = [], apiBase, defaultLang = "ar", pollTimeout = 25 }) {
  const api = createTelegramApi({ token, apiBase });
  const owners = new Set(ownerIds.map((id) => String(id).trim()).filter((id) => /^\d+$/.test(id)));
  const queues = new Map();
  let me = null;
  let offset = 0;
  let controller = null;
  let running = false;

  const isOwner = (userId) => owners.has(String(userId));
  const langOf = (userId) => touchUser({ id: userId }, defaultLang);

  /** سياق شاشة: show يعدّل الرسالة الحالية (ضغطة زر) أو يرسل جديدة */
  function contextFor({ chatId, from, messageId = null }) {
    const lang = touchUser(from, defaultLang);
    const ctx = {
      api,
      chatId,
      userId: String(from.id),
      lang,
      messageId,
      isOwner: isOwner(from.id),
      identity: telegramIdentity(from.id),
      langOf,
      async show({ text, keyboard: markup = null, fresh = false, deleteAfterMs = 0 }) {
        const extra = markup ? { reply_markup: markup } : {};
        let sent = null;
        if (ctx.messageId && !fresh) {
          try {
            sent = await api.editMessageText(chatId, ctx.messageId, text, extra);
          } catch (error) {
            if (/not modified/i.test(error?.description || "")) return null;
            sent = null;
          }
        }
        if (!sent) sent = await api.sendMessage(chatId, text, extra);
        if (sent?.message_id) ctx.messageId = sent.message_id;
        if (deleteAfterMs && sent?.message_id) {
          const id = sent.message_id;
          const timer = setTimeout(() => api.deleteMessage(chatId, id).catch((error) => noteFailure("telegram-vps", error, { where: "tg-vps-bot:autoDelete", fallback: "keep" })), deleteAfterMs);
          timer.unref?.();
          ctx.messageId = null;
        }
        return sent;
      },
      notify: (text) => api.sendMessage(chatId, card({ icon: "ℹ️", title: "", blocks: [text] }).replace(/^ℹ️ <b><\/b>\n\n/, "")),
      photo: (buffer, caption, extra = {}) => api.sendPhoto(chatId, buffer, caption, extra),
    };
    return ctx;
  }

  /** الشاشة الأولى: ترحيب + معرّفك + أزرار (المالك يرى لوحته) */
  async function startScreen(ctx, { withPhoto = false } = {}) {
    const { lang } = ctx;
    const text = card({ icon: "☁️", title: "Terboo VPS", blocks: [t(lang, "tg.welcome"), `🆔 ${t(lang, "tg.yourId")}: ${code(ctx.userId)}`] });
    const markup = keyboard([
      [button(ctx.userId, `☁️ ${t(lang, "tg.myServers")}`, { s: "c.home" }), button(ctx.userId, `💎 ${t(lang, "vps.btnPlans")}`, { s: "c.plans" })],
      ctx.isOwner ? [button(ctx.userId, `👑 ${t(lang, "tg.ownerPanel")}`, { s: "o.home" })] : [],
      [button(ctx.userId, `🌐 ${t(lang, "tg.language")}`, { s: "lang" })],
    ]);
    const file = path.join(process.cwd(), "assets", "image", "ui", "vps.jpg");
    if (withPhoto && fs.existsSync(file)) {
      await api.sendPhoto(ctx.chatId, fs.readFileSync(file), text, { reply_markup: markup });
      return null;
    }
    return ctx.show({ text, keyboard: markup });
  }

  function languageScreen(ctx) {
    return ctx.show({
      text: card({ icon: "🌐", title: t(ctx.lang, "tg.language"), blocks: [t(ctx.lang, "tg.chooseLanguage")] }),
      keyboard: keyboard(Object.entries(LANG_NAMES).map(([code2, name]) => button(ctx.userId, name, { s: "setLang", lang: code2 })), 3),
    });
  }

  const ownerOnly = (ctx) => ctx.show({ text: card({ icon: "⛔", title: "Terboo VPS", blocks: [t(ctx.lang, "tg.ownerOnly")] }), fresh: true });

  async function onCommand(ctx, command, args) {
    switch (command) {
      case "start":
      case "menu":
      case "help":
        return startScreen(ctx, { withPhoto: command === "start" });
      case "myvps":
        return client.home(ctx);
      case "plans":
        return client.plansScreen(ctx);
      case "id":
        return ctx.show({ text: card({ icon: "🆔", title: t(ctx.lang, "tg.yourId"), blocks: [code(ctx.userId), t(ctx.lang, "tg.sendIdToOwner")] }) });
      case "lang":
        return languageScreen(ctx);
      case "cancel":
        takeInput(ctx.chatId, ctx.userId);
        return ctx.show({ text: card({ icon: "✖️", title: t(ctx.lang, "vps.cancelled") }) });
      case "admin":
      case "assign":
      case "find":
        if (!ctx.isOwner) return ownerOnly(ctx);
        return command === "admin" ? ownerUi.home(ctx) : ownerUi.onOwnerCommand(ctx, command, args);
      default:
        return startScreen(ctx);
    }
  }

  async function onMessage(message) {
    const from = message.from;
    if (!from || from.is_bot) return null;
    const chatId = message.chat.id;
    const text = String(message.text || "").trim();
    if (message.chat.type !== "private") {
      // بيانات السيرفرات لا تُعرض في المجموعات: رابط للخاص فقط عند مخاطبة البوت صراحة
      if (!text.startsWith("/")) return null;
      const lang = touchUser(from, defaultLang);
      return api.sendMessage(chatId, card({ icon: "🔒", title: "Terboo VPS", blocks: [t(lang, "tg.privateOnly")] }), me?.username ? { reply_markup: keyboard([[{ text: `☁️ ${t(lang, "tg.openPrivate")}`, url: `https://t.me/${me.username}?start=vps` }]]) } : {});
    }
    const ctx = contextFor({ chatId, from });
    if (text.startsWith("/")) {
      const [head, ...args] = text.split(/\s+/);
      const command = head.slice(1).split("@")[0].toLowerCase();
      if (command !== "cancel") takeInput(chatId, ctx.userId);
      return onCommand(ctx, command, args);
    }
    if (hasInput(chatId, ctx.userId)) {
      const state = takeInput(chatId, ctx.userId);
      // المدخل السري يُحذف من الدردشة قبل أي معالجة (لا يبقى في سجل المحادثة)
      if (state?.secret) await api.deleteMessage(chatId, message.message_id).catch((error) => noteFailure("telegram-vps", error, { where: "tg-vps-bot:secret", stage: "deleteMessage", fallback: "warn-user" }));
      if (!state) return startScreen(ctx);
      if (CANCEL_WORDS.has(text.toLowerCase())) return ctx.show({ text: card({ icon: "✖️", title: t(ctx.lang, "vps.cancelled") }) });
      if (state.step.startsWith("o.")) return ctx.isOwner ? ownerUi.onOwnerInput(ctx, state, text) : ownerOnly(ctx);
      return client.onClientInput(ctx, state, text);
    }
    return startScreen(ctx);
  }

  async function onCallback(query) {
    const from = query.from;
    const message = query.message;
    if (!from || !message) return null;
    const taken = takeButton(from.id, query.data);
    const lang = touchUser(from, defaultLang);
    if (!taken.ok) {
      await api.answerCallbackQuery(query.id, t(lang, taken.code === "not-yours" ? "tg.notYours" : "tg.expired"), { show_alert: true }).catch(logged("answerCallback:expired"));
      return null;
    }
    await api.answerCallbackQuery(query.id).catch(logged("answerCallback"));
    const ctx = contextFor({ chatId: message.chat.id, from, messageId: message.message_id });
    const p = taken.payload || {};
    if (p.cancelInput) takeInput(ctx.chatId, ctx.userId);
    if (p.s === "home") return startScreen(ctx);
    if (p.s === "lang") return languageScreen(ctx);
    if (p.s === "setLang") {
      setLang(ctx.userId, p.lang);
      ctx.lang = p.lang;
      return startScreen(ctx);
    }
    if (String(p.s).startsWith("o.")) return ctx.isOwner ? ownerUi.onOwnerButton(ctx, p) : ownerOnly(ctx);
    return client.onClientButton(ctx, p);
  }

  /** معالجة تحديث واحد داخل طابور دردشته */
  function handleUpdate(update) {
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id ?? "none";
    const job = async () => {
      try {
        if (update.message) return await onMessage(update.message);
        if (update.callback_query) return await onCallback(update.callback_query);
      } catch (error) {
        noteFailure("telegram-vps", error, { where: "tg-vps-bot:handleUpdate", stage: update.message ? "message" : "callback" });
        const lang = langOf(update.message?.from?.id || update.callback_query?.from?.id);
        await api.sendMessage(chatId, card({ icon: "⚠️", title: "Terboo VPS", blocks: [t(lang, "tg.failed")] })).catch(logged("failedNotice"));
      }
      return null;
    };
    const next = (queues.get(chatId) || Promise.resolve()).then(job);
    queues.set(chatId, next);
    next.finally(() => { if (queues.get(chatId) === next) queues.delete(chatId); });
    return next;
  }

  async function start() {
    me = await api.getMe();
    const commands = (lang) => [
      { command: "start", description: t(lang, "tg.cmdStart") },
      { command: "myvps", description: t(lang, "tg.myServers") },
      { command: "plans", description: t(lang, "vps.btnPlans") },
      { command: "id", description: t(lang, "tg.yourId") },
      { command: "lang", description: t(lang, "tg.language") },
    ];
    await api.setMyCommands(commands(defaultLang)).catch((error) => noteFailure("telegram-vps", error, { where: "tg-vps-bot:start", stage: "setMyCommands", fallback: "continue" }));
    for (const lang of ["en", "es"]) await api.setMyCommands(commands(lang), { language_code: lang }).catch(logged("setMyCommands:lang"));
    running = true;
    controller = new AbortController();
    (async () => {
      while (running) {
        try {
          const updates = await api.getUpdates(offset, { timeout: pollTimeout, signal: controller.signal });
          for (const update of updates) {
            offset = Math.max(offset, update.update_id + 1);
            handleUpdate(update);
          }
        } catch (error) {
          if (!running) break;
          noteFailure("telegram-vps", error, { where: "tg-vps-bot:poll", stage: error?.code || "error", fallback: "retry" });
          await new Promise((resolve) => { const timer = setTimeout(resolve, 3000); timer.unref?.(); });
        }
      }
    })();
    return me;
  }

  async function stop() {
    running = false;
    controller?.abort();
    await Promise.allSettled([...queues.values()]);
  }

  return { api, start, stop, handleUpdate, isOwner, get me() { return me; } };
}

export { createVpsBot };
export default createVpsBot;
