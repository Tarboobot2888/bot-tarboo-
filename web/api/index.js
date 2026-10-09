// ═══════════════════════════════════════════════
// 🧭 Terboo Web API — الموجّه (/api/v1) (V6 §42 §64)
// ───────────────────────────────────────────────
// كل طلب: تحقق الجلسة (server-side) ← الدور (server-side) ← CSRF للطلبات المغيّرة ← تطبيع.
// الموديولات: auth · profile · usage · ai · tools · tasks · groups · members · vps · downloads
//            · uploads · games · owner · audit · meta. لا منطق أعمال هنا: كلها تستدعي طبقة الخدمة.
// العميل لا يمرّر owner=true: الدور من principalFor(session.canonical) فقط.
// ═══════════════════════════════════════════════

import * as store from "../../src/lib/terboo-web-store.js";
import * as svc from "../../src/lib/terboo-web-services.js";
import { noteFailure } from "../../src/lib/terboo-failure-log.js";
import { listAuditEvents } from "../../src/lib/terboo-agent-audit.js";
import { LEVEL } from "../../src/lib/terboo-permissions.js";
import config from "../../config.js";

const COOKIE = "terboo_sid";

/** يحلّ الجلسة والهوية من الكوكي (server-side) */
function sessionOf(ctx) {
  const raw = ctx.cookies[COOKIE];
  if (!raw) return null;
  const session = store.getSession(raw);
  if (!session) return null;
  store.touchSession(raw);
  return { raw, session, principal: svc.principalFor(session.canonical) };
}

/** CSRF double-submit: الطلبات المغيّرة تحمل رأس X-CSRF-Token يطابق رمز الجلسة */
function csrfOk(auth, ctx) {
  return auth && ctx.csrfHeader && ctx.csrfHeader === auth.session.csrf;
}

function registerApi(cfg) {
  const routes = [];
  const add = (method, pattern, fn, { auth = true, csrf = false, owner = false } = {}) => routes.push({ method, pattern, fn, auth, csrf, owner });

  // ── meta (عام، بلا أسرار) ──
  add("GET", "/api/v1/meta", (ctx) => ctx.r.ok({ name: config.bot?.name || "Bot Terboo", version: config.bot?.version || "6.0", languages: ["ar", "en", "es"], site: cfg.url || null }), { auth: false });

  // ── auth: تحدٍّ يؤكّده المستخدم عبر واتساب ثم جلسة server-side ──
  add("POST", "/api/v1/auth/challenge", (ctx) => {
    const { id, code } = store.createChallenge({ ttlSeconds: cfg.loginTtlSeconds, ip: ctx.ip });
    // الرمز يُعرض لمن طلب الدخول ليرسله للبوت على واتساب: .ويب <الرمز>
    ctx.r.ok({ challengeId: id, code, prefix: config.command?.prefix || ".", command: "ويب", expiresInSeconds: cfg.loginTtlSeconds });
  }, { auth: false });

  add("POST", "/api/v1/auth/poll", (ctx) => {
    const challenge = store.getChallenge(ctx.body.challengeId);
    if (!challenge) return ctx.r.fail(410, "challenge-expired");
    if (challenge.status !== "confirmed") return ctx.r.ok({ status: challenge.status });
    const consumed = store.consumeChallenge(ctx.body.challengeId);
    if (!consumed) return ctx.r.fail(410, "challenge-expired");
    const { id, csrf } = store.createSession({ canonical: consumed.canonical, hours: cfg.sessionHours, ip: ctx.ip, userAgent: ctx.req.headers["user-agent"] || "" });
    ctx.r.cookie(COOKIE, id, { maxAge: cfg.sessionHours * 3600 });
    ctx.r.ok({ status: "authenticated", csrf, profile: svc.profile(svc.principalFor(consumed.canonical)) });
  }, { auth: false });

  add("POST", "/api/v1/auth/logout", (ctx) => {
    if (ctx.auth) store.destroySession(ctx.auth.raw);
    ctx.r.cookie(COOKIE, "", { expires: 0 });
    ctx.r.ok({ status: "logged-out" });
  }, { auth: true, csrf: true });

  add("GET", "/api/v1/auth/session", (ctx) => ctx.r.ok({ authenticated: true, csrf: ctx.auth.session.csrf, profile: svc.profile(ctx.auth.principal) }));

  // ── profile · usage ──
  add("GET", "/api/v1/profile", (ctx) => ctx.r.ok(svc.profile(ctx.auth.principal)));
  add("POST", "/api/v1/usage", (ctx) => reply(ctx, svc.setUsage(ctx.auth.principal, ctx.body.modes)), { csrf: true });
  add("POST", "/api/v1/profile/language", (ctx) => reply(ctx, svc.setLanguage(ctx.auth.principal, ctx.body.language)), { csrf: true });

  // ── ai (نفس النواة) ──
  add("POST", "/api/v1/ai/chat", async (ctx) => {
    const text = String(ctx.body.text || "").slice(0, 4000);
    if (!text.trim()) return ctx.r.fail(400, "empty");
    const result = await svc.chat({ principal: ctx.auth.principal, text, lang: ctx.body.lang || svc.profile(ctx.auth.principal).language });
    if (!result.ok) return ctx.r.fail(503, result.code || "ai-unavailable");
    ctx.r.ok({ reply: result.reply, handledBy: result.handledBy });
  }, { csrf: true });

  // ── tools (الكتالوج الحقيقي، مفلتر بالدور) ──
  add("GET", "/api/v1/tools", (ctx) => ctx.r.ok({ tools: svc.toolCatalog(ctx.auth.principal) }));

  // ── tasks ──
  add("GET", "/api/v1/tasks", (ctx) => ctx.r.ok({ tasks: svc.tasks(ctx.auth.principal), last: svc.lastTask(ctx.auth.principal) }));
  add("GET", "/api/v1/tasks/:id", (ctx) => reply(ctx, svc.taskStatus(ctx.auth.principal, ctx.params.id)));
  add("POST", "/api/v1/tasks/:id/cancel", (ctx) => reply(ctx, svc.stopTask(ctx.auth.principal, ctx.params.id)), { csrf: true });

  // ── vps (موارد المستخدم) ──
  add("GET", "/api/v1/vps", (ctx) => ctx.r.ok({ vps: svc.myVps(ctx.auth.principal) }));

  // ── downloads / uploads / games: الكتالوج من نفس السجل (التنفيذ عبر دردشة AI/الأدوات) ──
  add("GET", "/api/v1/downloads", (ctx) => ctx.r.ok({ files: store.listFiles(ctx.auth.principal.canonical).map(fileView) }));
  add("GET", "/api/v1/games", (ctx) => ctx.r.ok({ games: svc.toolCatalog(ctx.auth.principal).filter((t) => t.category === "games") }));

  // ── owner (server-side فقط) ──
  add("GET", "/api/v1/owner/health", (ctx) => ctx.r.ok(svc.health()), { owner: true });
  add("GET", "/api/v1/owner/groups", async (ctx) => reply(ctx, await svc.groupsDirectory({ refresh: ctx.url.searchParams.get("refresh") === "1" })), { owner: true });
  add("GET", "/api/v1/owner/groups/:id/members", async (ctx) => reply(ctx, await svc.groupMembers(ctx.params.id, { refresh: ctx.url.searchParams.get("refresh") === "1" })), { owner: true });
  add("GET", "/api/v1/owner/audit", (ctx) => ctx.r.ok({ events: listAuditEvents({ limit: 60 }).map((e) => ({ id: e.id, type: e.type, actor: e.actor, status: e.status, at: e.timestamp })) }), { owner: true });

  function fileView(f) {
    return { id: f.id, name: f.name, mime: f.mime, size: f.size, expiresAt: f.expiresAt };
  }
  function reply(ctx, result) {
    if (!result || result.ok === false) return ctx.r.fail(result?.code === "not-found" ? 404 : 400, result?.code || "error");
    ctx.r.ok(result.data ?? result);
  }

  function match(route, method, pathname) {
    if (route.method !== method) return null;
    const rp = route.pattern.split("/");
    const pp = pathname.split("/");
    if (rp.length !== pp.length) return null;
    const params = {};
    for (let i = 0; i < rp.length; i += 1) {
      if (rp[i].startsWith(":")) params[rp[i].slice(1)] = decodeURIComponent(pp[i]);
      else if (rp[i] !== pp[i]) return null;
    }
    return params;
  }

  async function handle(ctx) {
    for (const route of routes) {
      const params = match(route, ctx.method, ctx.pathname);
      if (!params) continue;
      ctx.params = params;
      const auth = sessionOf(ctx);
      ctx.auth = auth;
      if (route.auth && !auth) return ctx.r.fail(401, "unauthenticated");
      if (route.owner && !(auth && auth.principal.role === LEVEL.OWNER)) return ctx.r.fail(403, "owner-only");
      if (route.csrf && !csrfOk(auth, ctx)) return ctx.r.fail(403, "csrf");
      try {
        return await route.fn(ctx);
      } catch (error) {
        noteFailure("web", error, { where: `web/api:${route.pattern}`, stage: "handler", fallback: "500" });
        return ctx.r.fail(500, "internal-error");
      }
    }
    return ctx.r.fail(404, "not-found");
  }

  return { handle };
}

export { COOKIE, registerApi };
export default { registerApi };
