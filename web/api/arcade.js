// ═══════════════════════════════════════════════
// 🕹️ Terboo Web API — اللعب التفاعلي (/api/v1/arcade/*)
// ───────────────────────────────────────────────
//   GET  /api/v1/arcade/catalog                — الألعاب المتاحة (عام)
//   GET  /api/v1/arcade/asset/<token>          — أصل بصري لسؤال، same-origin، رمز موقّع
//   GET  /api/v1/arcade/s/<token>?lang=ar      — حالة الغرفة لصاحب الرمز
//   POST /api/v1/arcade/s/<token>/action       — {actionId, payload, nonce, timestamp}
//   POST /api/v1/arcade/s/<token>/rematch      — مباراة جديدة ⇒ رمز جديد
//   POST /api/v1/arcade/s/<token>/surrender
//   POST /api/v1/arcade/new                    — (مسجّل دخول + CSRF) غرفة ضد الكمبيوتر ⇒ رمز
// الحماية: رمز HMAC (قدرة) · POST بـJSON + رأس X-Terboo-Arcade فقط (يمنع نماذج المواقع الأخرى) · حد معدّل
// مستقل في server.js · كل إجراء يمر من engine.applyAction (لا نتيجة من العميل).
// ═══════════════════════════════════════════════

import * as store from "../../src/lib/terboo-web-store.js";
import * as svc from "../../src/lib/terboo-web-services.js";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";
import { arcadeContracts, loadArcade } from "../../src/lib/terboo-arcade/index.js";
import * as E from "../../src/lib/terboo-arcade/engine.js";
import * as W from "../../src/lib/terboo-arcade/web.js";
import { fetchAsset } from "../../src/lib/terboo-arcade/assets.js";
import { L } from "../../src/lib/terboo-arcade/locale.js";

const LANGS = new Set(["ar", "en", "es"]);
const langOf = (url, body) => {
  const value = String(body?.lang || url.searchParams.get("lang") || "ar");
  return LANGS.has(value) ? value : "ar";
};

/** وصف اللعبة: من العقد، وإلا من بنك النصوص. لا يُعاد مفتاح خام أبداً. */
function describe(c, lang) {
  const direct = c.description?.[lang] || c.description?.ar;
  if (direct) return String(direct);
  const key = `g.${c.id}.desc`;
  const text = L(lang, key);
  return text === key ? "" : text;
}

/** كتالوج آمن (للصفحة الرئيسية للموقع) */
function catalog(lang) {
  return arcadeContracts().map((c) => ({
    id: c.id,
    icon: c.icon,
    name: c.name[lang] || c.name.ar,
    description: describe(c, lang),
    category: c.category,
    mode: c.mode,
    uiMode: c.uiMode,
    supportsAI: Boolean(c.supportsAI),
    supportsSolo: Boolean(c.supportsSolo),
    supportsGroup: Boolean(c.supportsGroup),
    players: c.players,
    // مدة تقريبية للجولة بالثواني — من مُهلة العقد، لا رقم مكتوب يدوياً
    roundSeconds: Math.round((Number(c.timeout) || 120000) / 1000),
    // أمر البوت العربي الأول (لبطاقة الكتالوج) — من المرادفات الفعلية
    command: c.aliases.find((a) => /[\u0600-\u06FF]/.test(a)) || c.aliases[0] || c.id,
    aliases: c.aliases.slice(0, 6),
  }));
}

async function handleArcade(ctx) {
  const { r, url, method, pathname, body } = ctx;
  try {
    await loadArcade();
    const lang = langOf(url, body);

    if (method === "GET" && pathname === "/api/v1/arcade/catalog") return r.ok({ games: catalog(lang) });

    if (method === "POST" && pathname === "/api/v1/arcade/new") {
      const raw = ctx.cookies.terboo_sid;
      const session = raw ? store.getSession(raw) : null;
      if (!session) return r.fail(401, "login-required");
      if (!ctx.req.headers["x-csrf-token"] || ctx.req.headers["x-csrf-token"] !== session.csrf) return r.fail(403, "csrf");
      const principal = svc.principalFor(session.canonical);
      const contract = arcadeContracts().find((c) => c.id === String(body.gameId || ""));
      if (!contract) return r.fail(404, "no-game");
      if (contract.mode === "pvp" && !contract.supportsAI) return r.fail(409, "needs-opponent");
      const difficulty = ["EASY", "NORMAL", "HARD", "EXPERT"].includes(body.difficulty) ? body.difficulty : "NORMAL";
      const created = E.createRoom({
        gameId: contract.id,
        chat: `web:${principal.canonical}`,
        isGroup: false,
        host: { jid: principal.jid, name: String(body.name || "").slice(0, 24) || "Player" },
        vsAI: contract.mode === "pvp",
        difficulty,
        options: { lang },
      });
      if (!created.ok) return r.fail(409, created.code || "create-failed");
      return r.ok({ token: W.issuePlayToken(created.room, principal.jid) });
    }

    // أصل بصري لسؤال: يُعرض **داخل** صفحة Mini App فقط. الرمز موقّع ومنتهي الصلاحية،
    // والخادم هو من يجلب البايتات ⇒ لا مورد خارجي في الصفحة ولا تسريب لمصدر البيانات.
    const asset = pathname.match(/^\/api\/v1\/arcade\/asset\/([A-Za-z0-9_.-]{20,800})$/);
    if (asset) {
      if (!["GET", "HEAD"].includes(method)) return r.fail(405, "method-not-allowed");
      const got = await fetchAsset(asset[1]);
      if (!got.ok) return r.fail(got.code === "bad-asset-token" ? 401 : 404, got.code);
      r.raw.writeHead(200, {
        "Content-Type": got.type,
        "Content-Length": got.body.length,
        "Cache-Control": "private, max-age=600",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Disposition": "inline",
      });
      r.raw.end(method === "HEAD" ? undefined : got.body);
      return undefined;
    }

    const match = pathname.match(/^\/api\/v1\/arcade\/s\/([A-Za-z0-9_.-]{20,400})(?:\/(action|rematch|surrender))?$/);
    if (!match) return r.fail(404, "not-found");
    const [, token, verb] = match;

    if (!verb && method === "GET") {
      const res = W.stateFor(token, lang);
      return res.ok ? r.ok(res.view) : r.fail(res.code === "bad-token" ? 401 : 404, res.code);
    }
    if (method !== "POST") return r.fail(405, "method-not-allowed");
    if (verb === "action") {
      const res = await W.actionFor(token, { actionId: body.actionId, payload: body.payload ?? null, nonce: body.nonce, timestamp: body.timestamp }, lang);
      if (res.code === "bad-token" || res.code === "no-room" || res.code === "not-a-player") return r.fail(401, res.code);
      return r.ok({ accepted: res.ok, code: res.code, events: res.events, aiMoves: res.aiMoves, view: res.view });
    }
    if (verb === "rematch") {
      const res = W.rematchFor(token, lang);
      return res.ok ? r.ok(res) : r.fail(409, res.code);
    }
    if (verb === "surrender") {
      const res = W.surrenderFor(token);
      return res.ok ? r.ok({ surrendered: true, view: W.stateFor(token, lang).view || null }) : r.fail(409, res.code);
    }
    return r.fail(404, "not-found");
  } catch (error) {
    noteFailure("web", error, { where: "web/api/arcade.js", stage: pathname, fallback: "500" });
    return r.fail(500, "internal-error");
  }
}

export { catalog, handleArcade };
export default { handleArcade };
