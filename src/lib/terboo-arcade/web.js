// ═══════════════════════════════════════════════
// 🌐 TERBOO ARCADE — اللعب التفاعلي على موقع البوت (HTML حيّ + Server-Authoritative)
// ───────────────────────────────────────────────
// • رابط اللعب: /play/<token> — الرمز موقّع HMAC ويحمل {غرفة، جلسة، معرّف اللاعب، انتهاء} فقط (لا JID خام)
// • الصفحة لا تحسب نتيجة: تعرض getView وترسل {actionId, payload, nonce} ⇒ engine.applyAction(source:"html")
//   فيُطابَق الإجراء حرفياً مع legalActions/validateFree، ويُرفض القديم/المكرر/الموقّت.
// • العرض المُرسل للمتصفح بلا JID أو hostId أو حالة اللعبة الخام (لا تسريب سفن/بطاقات/إجابات).
// • السر: arcade:webSecret في القاعدة (يُولَّد مرة) — لا يظهر في أي رد أو سجل.
// ═══════════════════════════════════════════════

import crypto from "node:crypto";
import * as E from "./engine.js";
import { games } from "../terboo-games.js";
import { getDatabase } from "../terboo-database.js";
import { noteFailure } from "../terboo-failure-log.js";
import { link } from "../terboo-website.js";
import { actionLabel } from "./render.js";

const TOKEN_TTL = 6 * 60 * 60 * 1000;
const SECRET_KEY = "arcade:webSecret";
let memorySecret = null;

function secret() {
  try {
    const store = getDatabase();
    let value = store.setting(SECRET_KEY);
    if (typeof value !== "string" || value.length < 32) {
      value = crypto.randomBytes(32).toString("hex");
      store.setting(SECRET_KEY, value);
    }
    return value;
  } catch (error) {
    noteFailure("arcade-web", error, { where: "terboo-arcade/web:secret", stage: "db", fallback: "process-secret" });
    memorySecret ||= crypto.randomBytes(32).toString("hex");
    return memorySecret;
  }
}

const b64 = (buf) => Buffer.from(buf).toString("base64url");
const sign = (body) => crypto.createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 32);

/** رمز لعب لمقعد لاعب بشري في غرفة */
function issuePlayToken(room, jid, ttlMs = TOKEN_TTL) {
  const id = E.idOf(jid);
  const seat = room.players.findIndex((p) => p.id === id && !p.isAI);
  if (seat < 0) return "";
  const body = b64(JSON.stringify({ r: room.roomId, s: room.sessionId, p: id, e: Date.now() + ttlMs }));
  return `${body}.${sign(body)}`;
}

/** يتحقق من الرمز (توقيع بزمن ثابت + انتهاء) ⇒ {roomId, sessionId, playerId} أو null */
function verifyPlayToken(token) {
  const text = String(token || "");
  if (text.length > 400) return null;
  const [body, mac] = text.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data?.r || !data?.p || !(data.e > Date.now())) return null;
    return { roomId: String(data.r), sessionId: String(data.s || ""), playerId: String(data.p) };
  } catch (error) {
    noteFailure("arcade-web", error, { where: "terboo-arcade/web:verify", stage: "parse", fallback: "rejected" });
    return null;
  }
}

/** رابط اللعب الكامل أو "" إن لم يتوفر رابط عام للموقع */
function playUrl(room, jid) {
  const token = issuePlayToken(room, jid);
  return token ? link(`/play/${token}`) : "";
}

/** يحلّ الرمز إلى الغرفة والمقعد */
function resolve(token) {
  const claims = verifyPlayToken(token);
  if (!claims) return { ok: false, code: "bad-token" };
  const room = E.getState(claims.roomId);
  if (!room) return { ok: false, code: "no-room" };
  const seat = room.players.findIndex((p) => p.id === claims.playerId && !p.isAI);
  if (seat < 0) return { ok: false, code: "not-a-player" };
  return { ok: true, room, seat, player: room.players[seat], claims };
}

/** عرض آمن للمتصفح: بلا jid/hostId، مع ما تحتاجه الواجهة فقط */
function publicView(room, seat, lang) {
  const view = E.getView(room.roomId, { viewerJid: room.players[seat].jid, lang });
  if (!view) return null;
  const contract = games.contractOf(room.gameId);
  const players = view.players.map(({ jid, ...rest }) => ({ ...rest, me: rest.seat === seat }));
  const { hostId, sessionId, ...rest } = view;
  return {
    ...rest,
    // تسمية كل إجراء بلغة اللاعب (الواجهة لا تترجم مفاتيح)
    actions: (view.actions || []).map((a) => ({ id: a.id, payload: a.payload ?? null, text: actionLabel(a, lang), group: a.groupKey || a.group || null })),
    players,
    // التسوية بلا معرّف اللاعب (رقم الهاتف) — بالمقعد فقط
    settlement: (view.settlement || []).map(({ playerId, ...x }) => ({ ...x, seat: room.players.findIndex((p) => p.id === playerId) })),
    me: seat,
    free: contract.freeActions || [],
    mode: contract.mode,
    rematchRoomId: room.rematchRoomId || null,
  };
}

function stateFor(token, lang = "ar") {
  const found = resolve(token);
  if (!found.ok) return found;
  return { ok: true, view: publicView(found.room, found.seat, lang) };
}

/** إجراء من الصفحة ⇒ نفس مسار التحقق في المحرك (source:"html") */
async function actionFor(token, { actionId, payload = null, nonce, timestamp }, lang = "ar") {
  const found = resolve(token);
  if (!found.ok) return found;
  const { room, seat, player } = found;
  const res = await E.applyAction({
    gameId: room.gameId,
    sessionId: room.sessionId,
    actionId: String(actionId || ""),
    actor: player.id,
    nonce: typeof nonce === "string" ? nonce : null,
    timestamp: Number(timestamp) || 0,
    payload,
    source: "html",
  });
  const current = E.getState(room.roomId) || room;
  return { ok: Boolean(res.ok), code: res.ok ? null : res.code, events: res.events || [], aiMoves: (res.aiMoves || []).length, view: publicView(current, seat, lang) };
}

/** إعادة المباراة ⇒ رمز جديد للغرفة الجديدة */
function rematchFor(token, lang = "ar") {
  const found = resolve(token);
  if (!found.ok) return found;
  const res = E.rematch(found.room.roomId, { jid: found.player.jid });
  if (!res.ok) return { ok: false, code: res.code };
  if (res.pending) return { ok: true, pending: res.pending };
  return { ok: true, token: issuePlayToken(res.room, found.player.jid), view: publicView(res.room, res.room.players.findIndex((p) => p.id === found.player.id), lang) };
}

function surrenderFor(token) {
  const found = resolve(token);
  if (!found.ok) return found;
  const res = E.surrender(found.room.roomId, { jid: found.player.jid });
  return { ok: Boolean(res.ok), code: res.ok ? null : res.code };
}

export { actionFor, issuePlayToken, playUrl, publicView, rematchFor, resolve, stateFor, surrenderFor, verifyPlayToken };
