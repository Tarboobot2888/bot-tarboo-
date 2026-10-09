// ═══════════════════════════════════════════════
// 🗂️ TERBOO — السجل الموحّد للألعاب
// ───────────────────────────────────────────────
// هذا الملف **سجل** لا محرك. المحرك الوحيد هو src/lib/terboo-arcade/engine.js
// ومحرك الأسئلة الوحيد هو terboo-arcade/questions.js.
//
// حُذف منه (كان ~350 سطراً) نظام جلسات الأسئلة القديم بالكامل:
//   • createHandler/createPlugin — محرك جلسات ثانٍ موازٍ للمحرك الموحّد.
//   • sendQuizCard + inlineQuizImage — آخر مسار كان يرسل صورة سؤال كرسالة
//     واتساب، ويحتوي مسار الرجوع `image: !htmlResult.relayed && imageBuffer`.
// كل ألعاب الأسئلة الـ22 صارت عقود أركيد (q_*) عبر terboo-arcade/legacy-quiz.js،
// فتلعب داخل Mini App بخيارات A–D ومؤقت ونقاط ومكافآت من الخادم، بنفس أوامرها.
// البلوقنات تستدعي quickCommand(contractId) مثل بقية ألعاب الأركيد.
//
// games.register() يبقى: هو **مصدر بيانات** العقد (العنوان · الإيموجي · ملف الأسئلة
// · المهلة · حقل الصورة)، ويسجّل العقد الموحّد فوراً عند استدعائه.
// ═══════════════════════════════════════════════

import { defineGame, legacyQuizContract } from "./terboo-arcade/contract.js";
import { tryLegacyQuizContract } from "./terboo-arcade/legacy-quiz.js";

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

}

const games = new TerbooGames();

// مرادف توافق (deprecated) للبلوقنات الخارجية المكتوبة للأساس القديم
export { TerbooGames, TerbooGames as MaroGames, TerbooGames as TarbooGames, games };