import { noteFailure } from "./terboo-failure-log.js";
import {
  getRandomItem,
  createSession,
  getSession,
  endSession,
  checkAnswerAdvanced,
  getHint,
  hasActiveSession,
  setSessionTimer,
  getRemainingTime,
  formatRemainingTime,
  isSurrender,
  isReplyToGame,
  getRandomReward,
  getProgressiveHint,
} from "./terboo-game-data.js";
import { getDatabase } from "./terboo-database.js";
import { addExpWithLevelCheck } from "./terboo-level.js";
import { checkFastAnswer } from "./terboo-context.js";
import config from "../../config.js";
import { defineGame, legacyQuizContract } from "./terboo-arcade/contract.js";
import { tryLegacyQuizContract } from "./terboo-arcade/legacy-quiz.js";
import { buildTextGameHtml, relayHtmlGame, resolveHtmlTransport } from "./terboo-html-game.js";
// fetchBuffer حُذف: كان يُستخدم فقط لتنزيل صور الأسئلة لإرسالها كرسالة صورة.

const WIN_MESSAGES = [
  "🌟 *أحسنت! ذكاء خارق!*",
  "✨ *ممتاز! مفيش حد يغلبك!*",
  "🎉 *براڨو! إجابة مثالية!*",
  "💫 *رايق! بتجاوب وكأنك بتشرب مية!*",
  "🏆 *عاش يا بطل! إجابة صح!*",
  "🔥 *ملوكي! عقلك زي جوجل!*",
];

const TIMEOUT_MESSAGES = [
  "⏱️ *خلص الوقت! حاول تاني!*",
  "⏱️ *الوقت انتهى يا بطل!*",
  "⏱️ *متأخر شوية، الوقت خلص!*",
];

const SURRENDER_MESSAGES = [
  "🏳️ *استسلمت؟ معلش المرة الجاية!*",
  "🏳️ *استسلام مقبول!*",
  "🏳️ *يا خسارة استسلمت...*",
];

// ═══════════════════════════════════════════════
// سياسة صور الألعاب (§6): لا ترسل أي لعبة صورة في أي رسالة واتساب — إطلاقاً.
//   • حُذفت inlineQuizImage (ضغط sharp + Base64 داخل HTML الرسالة).
//   • حُذف مسار الرجوع `image: !htmlResult.relayed && imageBuffer` عند فشل HTML.
//   • الألعاب البصرية (خمن الصورة/العلم/…) تعرض الأصل **داخل صفحة Mini App**
//     عبر رمز موقّع same-origin (terboo-arcade/assets.js)، لا كرسالة صورة.
// عند فشل النقل: نص مختصر + رابط Mini App. لا صورة، ولا حلقة إعادة محاولة.
// ═══════════════════════════════════════════════

/**
 * بطاقة سؤال: HTML مدقّق + أزرار واتساب أصلية + رابط Mini App. **بلا أي صورة**.
 * @param {Object} sock
 * @param {Object} m
 * @param {Object} cfg تسجيل اللعبة
 * @param {string} text نص السؤال الجاهز
 * @param {string} [miniAppUrl] رابط Mini App لهذه الجلسة (إن توفر موقع عام)
 */
async function sendQuizCard(sock, m, cfg, text, miniAppUrl = "") {
  const prefix = m.prefix || config.command?.prefix || ".";

  let htmlResult = { relayed: false, reason: "not-attempted" };
  try {
    const html = buildTextGameHtml({
      gameId: `quiz-${cfg.gameType}`,
      icon: cfg.emoji,
      title: cfg.title,
      body: cfg.description,
      text,
      // لا تمييز بصري معتمد على صورة: نفس البطاقة لكل الأسئلة
      status: "QUESTION",
      lang: "ar",
      theme: "NEON",
    });
    htmlResult = await relayHtmlGame(sock, m.chat, html, {
      transport: resolveHtmlTransport(config.arcade?.html?.transport),
      meta: { gameId: cfg.gameType, sessionId: `quiz-${m.chat}`, version: Date.now() },
    });
  } catch (error) {
    noteFailure("games", error, { where: "terboo-games:sendQuizCard", stage: "html-relay", fallback: "native-card" });
  }

  try {
    const { sendCard } = await import("./terboo-ui-kit.js");
    const sent = await sendCard(sock, m, {
      cardId: `quiz:${cfg.gameType}`,
      text,
      footer: `${cfg.emoji} ${cfg.title}`,
      // لا حقل image: مسار الألعاب لا يرسل صوراً بأي حال من الأحوال
      buttons: [
        { id: `${prefix}${cfg.gameType}`, text: "💡 تلميح" },
        { id: "استسلام", text: "🏳️ استسلام" },
      ],
      links: miniAppUrl ? [{ text: "🎮 افتح اللعبة", url: miniAppUrl }] : [],
    });
    return sent?.key ? { ...sent, html: htmlResult } : null;
  } catch (error) {
    noteFailure("games", error, { where: "terboo-games:sendQuizCard", stage: "send-card", fallback: "plain-text" });
    try {
      // المسار الاحتياطي الأخير: نص فقط (+ رابط Mini App إن وُجد). لا صورة.
      const body = miniAppUrl ? `${text}\n\n🎮 ${miniAppUrl}` : text;
      const sent = await sock.sendMessage(m.chat, { text: body }, { quoted: m });
      return sent?.key ? { ...sent, html: htmlResult } : null;
    } catch (fallbackError) {
      noteFailure("games", fallbackError, { where: "terboo-games:sendQuizCard", stage: "plain-text", fallback: "none" });
      return null;
    }
  }
}

/**
 * رابط Mini App لهذه اللعبة ولهذا اللاعب (أو "" إن لم يتوفر موقع عام).
 * اللعبة المُرحَّلة لها عقد أركيد (q_*) ⇒ غرفة + رمز مقعد موقّع، فيلعب اللاعب
 * نفس اللعبة بخيارات A–D ومؤقت داخل الصفحة. لا يُستخدم هذا الرابط لحساب أي نتيجة
 * على العميل: كل إجراء يعود إلى engine.applyAction.
 */
async function quizMiniAppUrl(cfg, m) {
  try {
    const { publicBaseUrl } = await import("./terboo-website.js");
    if (!publicBaseUrl()) return "";
    const { contractId } = await import("./terboo-arcade/legacy-quiz.js");
    const gameId = contractId(cfg);
    if (!games.arcade.has(gameId)) return "";
    const E = await import("./terboo-arcade/engine.js");
    const W = await import("./terboo-arcade/web.js");
    const existing = E.activeRoomsOf(m.sender).find((r) => r.gameId === gameId && r.state === "PLAYING");
    const room = existing || E.createRoom({
      gameId,
      chat: `quiz:${m.sender}`,
      isGroup: false,
      host: { jid: m.sender, name: m.pushName || "Player" },
      options: { lang: "ar" },
    }).room;
    if (!room) return "";
    return W.playUrl(room, m.sender) || "";
  } catch (error) {
    noteFailure("games", error, { where: "terboo-games:quizMiniAppUrl", stage: cfg.gameType, fallback: "no-link" });
    return "";
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

class TerbooGames {
  constructor() {
    this.registry = new Map();
    // TERBOO ARCADE: نفس السجل يحمل عقود الألعاب الموحّدة (لا سجل موازٍ)
    this.arcade = new Map();
    // ألعاب أسئلة لم يُمكن ترحيلها (بيانات غير كافية) ⇒ سبب صريح، لا ادّعاء ترحيل
    this.legacySkipped = new Map();
  }

  /** يسجّل لعبة بالعقد الموحّد (terboo-arcade/contract.js) ويعيد العقد المطبَّع */
  registerGame(def) {
    const contract = def?.controller ? def : defineGame(def);
    this.arcade.set(contract.id, contract);
    return contract;
  }

  /** عقد أي لعبة: لعبة أركيد أو لعبة أسئلة قديمة (عقد مُشتق بلا تغيير سلوكها) */
  contractOf(id) {
    if (this.arcade.has(id)) return this.arcade.get(id);
    const cfg = this.registry.get(id);
    return cfg ? legacyQuizContract(cfg) : null;
  }

  /** كل العقود: الأركيد + الأسئلة القديمة */
  contracts() {
    return [...this.arcade.values(), ...[...this.registry.values()].map(legacyQuizContract)];
  }

  /** يحل اسماً/مرادفاً إلى عقد (حساس لحالة الأحرف اللاتينية فقط) */
  resolve(name) {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return null;
    for (const contract of this.contracts()) {
      if (contract.id.toLowerCase() === key || contract.aliases.some((a) => String(a).toLowerCase() === key)) return contract;
    }
    return null;
  }

  register(gameType, cfg) {
    const defaults = {
      dataFile: `${gameType}.json`,
      questionField: "soal",
      answerField: "jawaban",
      emoji: "🎮",
      title: gameType.toUpperCase(),
      description: `لعبة ${gameType}`,
      timeout: 60000,
      cooldown: 5,
      hasImage: false,
      imageField: "img",
      alias: [],
      hintCount: 2,
    };
    const merged = { ...defaults, ...cfg, gameType };
    this.registry.set(gameType, merged);
    // ترحيل فوري إلى العقد الموحّد: اللعبة تصبح Mini App حقيقية (خيارات A–D
    // ومؤقت ونقاط من الخادم) بنفس أمرها ومرادفاتها. السجل واحد — لا سجل موازٍ.
    // التسجيل هنا (لا كسولاً) حتى تراها كل المداخل: المحرك، الكتالوج، الأوامر.
    const made = tryLegacyQuizContract(merged);
    if (made.ok) this.arcade.set(made.contract.id, made.contract);
    else this.legacySkipped.set(gameType, made.reason);
  }

  get(gameType) {
    return this.registry.get(gameType);
  }

  createHandler(gameType) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`اللعبة "${gameType}" غير مسجلة`);

    const handler = async (m, { sock }) => {
      const chatId = m.chat;

      if (hasActiveSession(chatId)) {
        const session = getSession(chatId);
        if (session && session.gameType === gameType) {
          const remaining = getRemainingTime(chatId);
          const answer = session.question[cfg.answerField];
          let text = `⚠️ *فيه لعبة شغالة حالياً، جاوب الأول!*\n\n`;
          if (cfg.questionField && session.question[cfg.questionField]) {
            text += `> ${session.question[cfg.questionField]}\n\n`;
          }
          text += `💡 تلميح: *${getHint(answer, cfg.hintCount)}*\n`;
          text += `⏱️ المتبقي: *${formatRemainingTime(remaining)}*\n\n`;
          text += `_جاوب مباشرة أو اكتب "استسلام"\nكل إجابة غلط بتزود التلميح_`;
          text += `\n⚠️ *رد على هذه الرسالة بالإجابة*`;
          const shown = await sendQuizCard(sock, m, cfg, text);
          if (!shown?.key) await m.reply(text);
          return;
        }
      }

      const question = getRandomItem(cfg.dataFile);
      if (!question) {
        await m.reply(
          "❌ *البيانات غير متوفرة*\n\n> بيانات اللعبة مش موجودة!",
        );
        return;
      }

      const answer = question[cfg.answerField];
      let sentMsg;

      // اللعبة البصرية لم تعد ترسل صورة: الأصل يُعرض داخل Mini App على same-origin.
      // لا تنزيل buffer، ولا caption لصورة، ولا رجوع إلى رسالة صورة عند الفشل.
      const visual = cfg.hasImage;
      let text = `${cfg.emoji} *${cfg.title}*\n\n`;
      if (cfg.questionField && question[cfg.questionField]) {
        text += `> ${question[cfg.questionField]}\n\n`;
      }
      if (visual) text += `🖼️ *الصورة داخل اللعبة التفاعلية* — افتح الرابط لرؤيتها\n`;
      text += `💡 تلميح: *${getHint(answer, cfg.hintCount)}*\n`;
      text += `⏱️ الوقت: *${cfg.timeout / 1000} ثانية*\n`;
      text += `🎁 الجائزة: *طاقة، عملات، خبرة*\n\n`;
      text += `_جاوب مباشرة أو اكتب "استسلام"\nكل إجابة غلط بتزود التلميح_`;
      text += `\n⚠️ *رد على هذه الرسالة بالإجابة*`;

      sentMsg = await sendQuizCard(sock, m, cfg, text, await quizMiniAppUrl(cfg, m));
      if (!sentMsg?.key) sentMsg = await sock.sendMessage(chatId, { text }, { quoted: m });

      createSession(chatId, gameType, question, sentMsg.key, cfg.timeout);

      setSessionTimer(chatId, async () => {
        let text = `${pick(TIMEOUT_MESSAGES)}\n\n`;
        text += `الإجابة: *${answer}*\n\n`;
        text += `_مفيش حد عرف يجاوب المرة دي~_`;
        await m.reply(text);
      });
    };

    const answerHandler = async (m, sock) => {
      const chatId = m.chat;
      const session = getSession(chatId);

      if (!session || session.gameType !== gameType) return false;

      const userAnswer = (m.body || "").trim();
      if (!userAnswer || userAnswer.startsWith(".")) return false;

      if (isSurrender(userAnswer)) {
        endSession(chatId);
        const answer = session.question[cfg.answerField];
        let text = `${pick(SURRENDER_MESSAGES)}\n\n`;
        text += `الإجابة: *${answer}*\n\n`;
        text += `_@${m.sender.split("@")[0]} استسلم_`;
        await m.reply(text, { mentions: [m.sender] });
        return true;
      }

      if (!isReplyToGame(m, session)) return false;

      session.attempts++;

      const answer = session.question[cfg.answerField];
      const result = checkAnswerAdvanced(answer, userAnswer);

      if (result.status === "correct") {
        endSession(chatId);

        const db = getDatabase();
        const user = db.getUser(m.sender);

        let totalLimit = 0;
        let totalBalance = 0;
        let totalExp = 0;

        if (cfg.rewards === false || cfg.rewards === null) {
          // بدون مكافآت
        } else if (cfg.rewards) {
          totalLimit = cfg.rewards.limit || cfg.rewards.energi || 0;
          totalBalance = cfg.rewards.koin || cfg.rewards.balance || 0;
          totalExp = cfg.rewards.exp || 0;
        } else {
          const reward = getRandomReward();
          totalLimit = reward.limit;
          totalBalance = reward.koin;
          totalExp = reward.exp;
        }

        let bonusText = "";

        const fastResult = checkFastAnswer(session);
        if (
          fastResult.isFast &&
          cfg.rewards !== false &&
          cfg.rewards !== null
        ) {
          totalLimit += fastResult.bonus.limit;
          totalBalance += fastResult.bonus.koin;
          totalExp += fastResult.bonus.exp;
          bonusText = `\n\n${fastResult.praise}\n⚡ *مكافأة السرعة:* +${fastResult.bonus.limit} طاقة, +${fastResult.bonus.koin} عملة\n⏱️ الوقت: *${(fastResult.elapsed / 1000).toFixed(1)} ثانية*`;
        }

        if (totalLimit > 0) db.updateEnergi(m.sender, totalLimit);
        if (totalBalance > 0) db.updateKoin(m.sender, totalBalance);

        if (totalExp > 0) {
          if (!user.rpg) user.rpg = {};
          await addExpWithLevelCheck(sock, m, db, user, totalExp);
        }
        db.save();

        let text = `${pick(WIN_MESSAGES)}\n\n`;
        text += `الإجابة: *${answer}*\n`;
        text += `الفائز: *@${m.sender.split("@")[0]}*\n`;
        text += `المحاولات: *${session.attempts}*\n\n`;

        if (totalLimit > 0 || totalBalance > 0 || totalExp > 0) {
          let parts = [];
          if (totalLimit > 0) parts.push(`+${totalLimit} طاقة`);
          if (totalBalance > 0) parts.push(`+${totalBalance} عملة`);
          if (totalExp > 0) parts.push(`+${totalExp} خبرة`);
          text += `🎁 ${parts.join("، ")}`;
        }
        text += bonusText;

        await m.reply(text, { mentions: [m.sender] });
        return true;
      }

      if (result.status === "close") {
        const remaining = getRemainingTime(chatId);
        const percent = Math.round(result.similarity * 100);
        await m.react("🔥");
        await m.reply(
          `🔥 *قريب جداً!* إجابتك *${percent}%* شبه الصح!\n_المتبقي: *${formatRemainingTime(remaining)}*_`,
        );
        return false;
      }

      const remaining = getRemainingTime(chatId);
      if (remaining > 0 && session.attempts < 10) {
        await m.react("❌");
        const hint = getProgressiveHint(answer, session.attempts);
        await m.reply(
          `❌ لسه مش صح! تلميح: *${hint}*\n_المتبقي: *${formatRemainingTime(remaining)}*_`,
        );
      }

      return false;
    };

    return { handler, answerHandler };
  }

  createPlugin(gameType, overrides = {}) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`اللعبة "${gameType}" غير مسجلة`);

    const { handler, answerHandler } = this.createHandler(gameType);

    return {
      config: {
        name: gameType,
        alias: cfg.alias,
        category: "game",
        description: cfg.description,
        usage: `.${gameType}`,
        example: `.${gameType}`,
        isOwner: false,
        isPremium: false,
        isGroup: false,
        isPrivate: false,
        cooldown: cfg.cooldown,
        energi: 0,
        isEnabled: true,
        ...overrides,
      },
      handler,
      answerHandler,
    };
  }
}

const games = new TerbooGames();

// مرادف توافق (deprecated) للبلوقنات الخارجية المكتوبة للأساس القديم
export { TerbooGames, TerbooGames as MaroGames, TerbooGames as TarbooGames, games };