// ═══════════════════════════════════════════════
// 🎮 Terboo Arcade — عميل اللعب التفاعلي (vanilla ESM، بلا تبعيات)
// ───────────────────────────────────────────────
// • الحالة والنتيجة من الخادم فقط: نعرض العرض (view) ونرسل {actionId, payload, nonce, timestamp}.
// • لكل لعبة مُصيِّر حركي: XO بحبر نيون وخط فوز · أقراص تسقط · بطاقات تنقلب · بلاطات 2048
//   · لوحة السلم والثعبان مع بيادق متحركة · ثعبان/طوب حيّ (نبضة كل ~0.45ث) · بطاقات أسئلة.
// • مؤثرات: جسيمات/قصاصات Canvas · أصوات مولّدة WebAudio · اهتزاز خفيف · لوحة مفاتيح وسحب.
// • لا innerHTML لنصوص الخادم: كل نص يُدرج كـ textContent.
// ═══════════════════════════════════════════════

const TOKEN = location.pathname.split("/").filter(Boolean).pop() || "";
const qs = new URLSearchParams(location.search);
const pickLang = () => {
  const q = qs.get("lang");
  if (["ar", "en", "es"].includes(q)) return q;
  const nav = String(navigator.language || "ar").slice(0, 2);
  return ["ar", "en", "es"].includes(nav) ? nav : "ar";
};
const LANG = pickLang();

const I18N = {
  ar: { dir: "rtl", yourTurn: "دورك الآن", waiting: "دور {name}", thinking: "{name} يفكر…", waitingPlayers: "في انتظار اللاعبين…", win: "فوز!", lose: "خسارة", draw: "تعادل", over: "انتهت الجولة", winSub: "أداء أسطوري 🔥", loseSub: "المرة الجاية ليك 💪", drawSub: "ولا غالب ولا مغلوب", rematch: "جولة جديدة", close: "إغلاق", surrender: "انسحاب", you: "أنت", ai: "ذكاء", sound: "الصوت", start: "▶ ابدأ", pause: "⏸ إيقاف", resume: "▶ استمرار", send: "إرسال", flagMode: "🚩 وضع العلم", revealMode: "⛏️ وضع الكشف", expired: "انتهت صلاحية رابط اللعب", expiredSub: "ابدأ لعبة جديدة من البوت للحصول على رابط جديد.", rematchWait: "في انتظار موافقة: {names}", coins: "عملة", points: "نقطة", swipe: "اسحب أو استخدم الأسهم", pick: "اختر خانة", numPick: "اختر رقماً", err: { illegal: "حركة غير مسموحة", "not-your-turn": "مش دورك", stale: "تم تحديث اللوحة", "bad-nonce": "تم تحديث اللوحة", finished: "اللعبة انتهت", paused: "اللعبة متوقفة", "expired-action": "ساعة جهازك غير مضبوطة", "rate-limited": "بالراحة شوية", "forbidden-field": "طلب مرفوض", network: "مشكلة في الاتصال", default: "تعذّر تنفيذ الحركة" } },
  en: { dir: "ltr", yourTurn: "Your turn", waiting: "{name}'s turn", thinking: "{name} is thinking…", waitingPlayers: "Waiting for players…", win: "Victory!", lose: "Defeat", draw: "Draw", over: "Round over", winSub: "Legendary play 🔥", loseSub: "You'll get it next time 💪", drawSub: "Nobody wins this one", rematch: "Play again", close: "Close", surrender: "Surrender", you: "You", ai: "AI", sound: "Sound", start: "▶ Start", pause: "⏸ Pause", resume: "▶ Resume", send: "Send", flagMode: "🚩 Flag mode", revealMode: "⛏️ Reveal mode", expired: "This play link has expired", expiredSub: "Start a new game from the bot to get a fresh link.", rematchWait: "Waiting for: {names}", coins: "coins", points: "pts", swipe: "Swipe or use arrow keys", pick: "Pick a square", numPick: "Pick a number", err: { illegal: "Illegal move", "not-your-turn": "Not your turn", stale: "Board refreshed", "bad-nonce": "Board refreshed", finished: "Game over", paused: "Game paused", "expired-action": "Your device clock is off", "rate-limited": "Slow down a bit", "forbidden-field": "Request rejected", network: "Connection problem", default: "Move failed" } },
  es: { dir: "ltr", yourTurn: "Tu turno", waiting: "Turno de {name}", thinking: "{name} está pensando…", waitingPlayers: "Esperando jugadores…", win: "¡Victoria!", lose: "Derrota", draw: "Empate", over: "Ronda terminada", winSub: "Jugada legendaria 🔥", loseSub: "La próxima es tuya 💪", drawSub: "Nadie gana esta vez", rematch: "Otra partida", close: "Cerrar", surrender: "Rendirse", you: "Tú", ai: "IA", sound: "Sonido", start: "▶ Empezar", pause: "⏸ Pausa", resume: "▶ Seguir", send: "Enviar", flagMode: "🚩 Modo bandera", revealMode: "⛏️ Modo revelar", expired: "Este enlace de juego expiró", expiredSub: "Inicia un juego nuevo desde el bot para obtener otro enlace.", rematchWait: "Esperando a: {names}", coins: "monedas", points: "pts", swipe: "Desliza o usa las flechas", pick: "Elige una casilla", numPick: "Elige un número", err: { illegal: "Movimiento no permitido", "not-your-turn": "No es tu turno", stale: "Tablero actualizado", "bad-nonce": "Tablero actualizado", finished: "Juego terminado", paused: "Juego en pausa", "expired-action": "El reloj de tu dispositivo está mal", "rate-limited": "Más despacio", "forbidden-field": "Solicitud rechazada", network: "Problema de conexión", default: "No se pudo mover" } },
};
const T = I18N[LANG];
const tr = (key, vars = {}) => String(T[key] ?? I18N.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const errText = (code) => T.err[code] || T.err.default;

// ألوان كل لعبة (لون أساسي، لون ثانٍ)
const THEMES = {
  xo: ["#7c5cff", "#22d3ee"], connect4: ["#ff4d6d", "#ffd23f"], checkers: ["#ff5964", "#c9a227"], reversi: ["#22c55e", "#a7f3d0"],
  gomoku: ["#c89b5a", "#f5deb3"], battleship: ["#3b82f6", "#22d3ee"], dotsboxes: ["#f43f5e", "#3b82f6"], memory: ["#a855f7", "#10b981"],
  minesweeper: ["#64748b", "#f43f5e"], g2048: ["#f59e0b", "#ef4444"], snake: ["#22c55e", "#a3e635"], breakout: ["#f97316", "#38bdf8"],
  simon: ["#22c55e", "#facc15"], sudoku: ["#6366f1", "#a5b4fc"], snakes: ["#10b981", "#f59e0b"], trivia_arena: ["#06b6d4", "#8b5cf6"],
  geo_battle: ["#0ea5e9", "#22c55e"], math_duel: ["#8b5cf6", "#f472b6"], rps: ["#ec4899", "#f59e0b"], hangman: ["#eab308", "#f43f5e"],
  wordle_ar: ["#22c55e", "#eab308"], bulls_cows: ["#f97316", "#84cc16"], letter_rush: ["#14b8a6", "#f472b6"],
};

// إدخال حر (كلمة/رقم) لبعض الألعاب
const FREE = {
  wordle_ar: { id: "guess", key: "word", ph: { ar: "كلمة من 5 حروف", en: "5-letter word", es: "Palabra de 5 letras" }, max: 12 },
  bulls_cows: { id: "guess", key: "code", ph: { ar: "4 أرقام مختلفة", en: "4 different digits", es: "4 dígitos distintos" }, max: 4, numeric: true },
  hangman: { id: "word", key: "w", ph: { ar: "خمّن الكلمة كاملة", en: "Guess the whole word", es: "Adivina la palabra" }, max: 24 },
  letter_rush: { id: "word", key: "w", ph: { ar: "اكتب كلمتك", en: "Type your word", es: "Escribe tu palabra" }, max: 24 },
};
const DIR_GAMES = { g2048: "slide", snake: "turn", breakout: "paddle" };
const LIVE = { snake: { action: "turn", key: "d", ms: 430 }, breakout: { action: "paddle", key: "d", ms: 380, idle: "stay" } };

const S = { view: null, prev: null, busy: false, sel: null, flag: false, muted: false, live: false, liveDir: null, timer: null, poll: null, shownResult: null, rolling: false };
try { S.muted = localStorage.getItem("terboo_arcade_muted") === "1"; } catch (err) { console.debug("storage unavailable", err?.message); S.muted = false; }

// ─────────────── أدوات DOM ───────────────
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "style") n.style.cssText = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return n;
}
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
/** نص فيه *عريض* ⇒ عقد آمنة */
function rich(text) {
  const parts = String(text ?? "").split(/\*([^*]+)\*/g);
  return parts.map((p, i) => (i % 2 ? el("b", {}, p) : document.createTextNode(p)));
}
const plain = (text) => String(text ?? "").replace(/\*/g, "");
const toastEl = () => document.getElementById("toast");
let toastTimer = null;
function toast(text, bad = false) {
  const t = toastEl();
  t.textContent = text;
  t.className = `toast show${bad ? " bad" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = "toast"; }, 1900);
}
const vibrate = (ms = 12) => { try { navigator.vibrate?.(ms); } catch (err) { console.debug("vibrate unsupported", err?.message); } };

// ─────────────── الصوت (مولَّد) ───────────────
let ac = null;
function audio() {
  if (S.muted) return null;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  } catch (err) { console.debug("audio unavailable", err?.message); return null; }
}
function tone(freq, dur = 0.1, type = "sine", vol = 0.05, delay = 0, slide = 0) {
  const ctx = audio();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
const SFX = {
  tap: () => tone(620, 0.06, "square", 0.025),
  place: () => { tone(520, 0.08, "triangle", 0.06); tone(780, 0.1, "sine", 0.04, 0.05); },
  ai: () => tone(330, 0.09, "triangle", 0.045, 0, 120),
  drop: () => tone(900, 0.28, "sine", 0.05, 0, -650),
  flip: () => tone(1200, 0.05, "square", 0.02, 0, -400),
  eat: () => { tone(880, 0.07, "square", 0.04); tone(1320, 0.08, "square", 0.035, 0.06); },
  err: () => tone(140, 0.18, "sawtooth", 0.05, 0, -40),
  turn: () => tone(990, 0.07, "sine", 0.03),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.06, i * 0.11)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.28, "sawtooth", 0.04, i * 0.16)),
  draw: () => { tone(440, 0.14, "square", 0.04); tone(440, 0.2, "square", 0.04, 0.17); },
  roll: () => { for (let i = 0; i < 7; i += 1) tone(300 + Math.random() * 500, 0.04, "square", 0.025, i * 0.07); },
};
const sfx = (name) => { try { SFX[name]?.(); } catch (err) { console.debug("sfx failed", name, err?.message); } };

// ─────────────── مؤثرات Canvas ───────────────
const fx = { cv: null, ctx: null, parts: [], raf: 0 };
function fxInit() {
  fx.cv = document.getElementById("fx");
  fx.ctx = fx.cv.getContext("2d");
  const size = () => { fx.cv.width = innerWidth * devicePixelRatio; fx.cv.height = innerHeight * devicePixelRatio; };
  size();
  addEventListener("resize", size);
}
function fxLoop() {
  const { ctx, cv } = fx;
  ctx.clearRect(0, 0, cv.width, cv.height);
  fx.parts = fx.parts.filter((p) => p.life > 0);
  for (const p of fx.parts) {
    p.life -= 1;
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
    ctx.translate(p.x * devicePixelRatio, p.y * devicePixelRatio);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === "rect") ctx.fillRect(-p.s, -p.s / 2, p.s * 2, p.s);
    else { ctx.beginPath(); ctx.arc(0, 0, p.s, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  fx.raf = fx.parts.length ? requestAnimationFrame(fxLoop) : 0;
}
function burst(x, y, colors, n = 18, power = 5) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = power * (0.4 + Math.random());
    fx.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.12, life: 40 + Math.random() * 25, s: 2 + Math.random() * 3, color: colors[i % colors.length], rot: 0, vr: 0, shape: "dot" });
  }
  if (!fx.raf) fx.raf = requestAnimationFrame(fxLoop);
}
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#ffd166", "#22d3ee", "#7c5cff", "#ff4d6d", "#22c55e", "#ffffff"];
  for (let i = 0; i < 160; i += 1) {
    fx.parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.4, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 0.04, life: 160 + Math.random() * 80, s: 3 + Math.random() * 4, color: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, shape: "rect" });
  }
  if (!fx.raf) fx.raf = requestAnimationFrame(fxLoop);
}
const centerOf = (node) => { const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

// ─────────────── الشبكة/الخادم ───────────────
async function call(path = "", body = null) {
  const url = `/api/v1/arcade/s/${encodeURIComponent(TOKEN)}${path}?lang=${LANG}`;
  const init = body ? { method: "POST", headers: { "Content-Type": "application/json", "X-Terboo-Arcade": "1" }, body: JSON.stringify(body), credentials: "same-origin" } : { credentials: "same-origin", cache: "no-store" };
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({ ok: false, code: "bad-response" }));
  return { status: res.status, ...json };
}

async function act(actionId, payload = null, { quiet = false } = {}) {
  if (S.busy || !S.view || S.view.state !== "PLAYING") return null;
  S.busy = true;
  if (!quiet) { sfx("tap"); vibrate(); }
  try {
    const res = await call("/action", { actionId, payload, nonce: S.view.nonce, timestamp: Date.now() });
    if (res.status === 401) return expired();
    if (!res.ok) { toast(errText(res.code), true); return null; }
    const data = res.data;
    if (!data.accepted) {
      if (!quiet || !["stale", "bad-nonce", "not-your-turn"].includes(data.code)) { toast(errText(data.code), true); sfx("err"); }
    } else if (data.aiMoves) {
      setTimeout(() => sfx("ai"), 260);
    }
    if (data.view) update(data.view, { mine: data.accepted });
    return data;
  } catch {
    toast(errText("network"), true);
    return null;
  } finally {
    S.busy = false;
  }
}

async function refresh() {
  if (S.busy || document.hidden) return;
  try {
    const res = await call();
    if (res.status === 401 || res.status === 404) return expired();
    if (res.ok && (!S.view || res.data.version !== S.view.version || res.data.state !== S.view.state)) update(res.data);
  } catch (err) { console.debug("refresh failed, retrying", err?.message); }
}

function expired() {
  stopLive();
  clearInterval(S.poll);
  document.getElementById("app").replaceChildren(el("div", { class: "gone" }, el("div", { class: "big" }, "⌛"), el("h2", {}, T.expired), el("p", { class: "hint-line" }, T.expiredSub)));
  return null;
}

// ─────────────── التحديث والعرض ───────────────
function update(view, { mine = false } = {}) {
  S.prev = S.view;
  S.view = view;
  const prev = S.prev;
  if (prev && prev.roomId !== view.roomId) { S.prev = null; S.shownResult = null; }
  if (prev && prev.version !== view.version && !mine && view.turn === view.me && view.state === "PLAYING") sfx("turn");
  render();
  if (view.state === "FINISHED" && S.shownResult !== view.roomId) {
    S.shownResult = view.roomId;
    stopLive();
    setTimeout(showResult, v_delay(view));
  }
}

/** مهلة قبل شاشة النتيجة: تكفي لرؤية خط الفوز/آخر حركة */
function v_delay(view) {
  return view.board?.cells?.some((c) => c.hl) ? 1500 : 900;
}

/** لون ثابت مشتق من معرّف اللعبة — ألعاب الأسئلة المُرحَّلة لا تتشابه كلها */
const QUIZ_PALETTE = [
  ["#06b6d4", "#8b5cf6"], ["#f59e0b", "#ef4444"], ["#22c55e", "#a3e635"], ["#ec4899", "#f59e0b"],
  ["#6366f1", "#a5b4fc"], ["#14b8a6", "#f472b6"], ["#eab308", "#f43f5e"], ["#3b82f6", "#22d3ee"],
  ["#a855f7", "#10b981"], ["#f97316", "#38bdf8"], ["#0ea5e9", "#22c55e"], ["#c89b5a", "#f5deb3"],
];
function themeOf(gameId) {
  if (THEMES[gameId]) return THEMES[gameId];
  const id = String(gameId || "");
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return QUIZ_PALETTE[h % QUIZ_PALETTE.length];
}

function setTheme(gameId) {
  const [a, b] = themeOf(gameId);
  document.documentElement.style.setProperty("--acc", a);
  document.documentElement.style.setProperty("--acc2", b);
}

function myTurn(v) {
  return v.state === "PLAYING" && (v.turn === null || v.turn === undefined || v.turn === v.me);
}

function render() {
  const v = S.view;
  document.documentElement.lang = LANG;
  document.documentElement.dir = T.dir;
  document.title = `${v.icon || "🎮"} ${v.title} · Terboo Arcade`;
  setTheme(v.gameId);
  const card = el("section", { class: `card g-${v.gameId}` },
    header(v),
    players(v),
    stats(v),
    statusLine(v),
    el("div", { class: "stage", id: "stage" }, stage(v)),
    controls(v),
    footer(v),
  );
  document.getElementById("app").replaceChildren(card, el("div", { class: "brand-foot" }, "BOT TERBOO · ARCADE"));
  requestAnimationFrame(afterPaint);
}

function header(v) {
  const sound = el("button", { class: "icon-btn", title: T.sound, "aria-label": T.sound, onclick: () => {
    S.muted = !S.muted;
    try { localStorage.setItem("terboo_arcade_muted", S.muted ? "1" : "0"); } catch (err) { console.debug("storage unavailable", err?.message); }
    render();
    if (!S.muted) sfx("place");
  } }, S.muted ? "🔇" : "🔊");
  return el("header", { class: "head" },
    el("div", { class: "logo" }, v.icon || "🎮"),
    el("div", { class: "titles" }, el("div", { class: "eyebrow" }, "TERBOO ARCADE"), el("h1", { class: "title" }, v.title)),
    sound);
}

function players(v) {
  if (!v.players || v.players.length < 2) return null;
  return el("div", { class: "players" }, v.players.map((p, i) => el("div", { class: `player${v.state === "PLAYING" && v.turn === i ? " turn" : ""}` },
    el("span", { class: "mark" }, v.marks?.[i] || (p.isAI ? "🤖" : "👤")),
    el("div", { class: "who" }, el("div", { class: "name" }, p.me ? `${p.name} (${T.you})` : p.name), el("div", { class: "sub" }, p.isAI ? `🤖 ${T.ai}` : "")),
    v.scores?.[i] !== undefined && v.scores?.[i] !== null ? el("span", { class: "score" }, String(v.scores[i])) : null,
  )));
}

function stats(v) {
  if (!v.panels?.length) return null;
  // لوحات تكرر نقاط اللاعبين (مثل مواقع السلم والثعبان) ⇒ تكفي بطاقات اللاعبين
  if (v.players?.length > 1 && v.scores && v.panels.length === v.players.length) return null;
  const before = new Map((S.prev?.panels || []).map((p) => [p.label, String(p.value)]));
  return el("div", { class: "stats" }, v.panels.map((p) => el("div", { class: "stat" },
    el("span", {}, plain(p.label)),
    el("b", { class: before.has(p.label) && before.get(p.label) !== String(p.value) ? "bump" : "" }, plain(p.value)),
  )));
}

function statusLine(v) {
  let text;
  let mine = false;
  if (v.state === "WAITING" || v.state === "READY") text = T.waitingPlayers;
  else if (v.state === "PLAYING") {
    const actor = v.players?.[v.turn];
    if (myTurn(v)) {
      mine = true;
      const st = plain(v.status || "");
      // حالة «دور 🔴» تكرار لـ«دورك الآن» ⇒ تُحذف؛ أي معلومة أخرى (ألغام، وقت…) تبقى
      const redundant = !st || (v.marks?.[v.turn] && st.includes(v.marks[v.turn]) && st.length < 24);
      text = v.players?.length > 1 ? `${T.yourTurn}${redundant ? "" : ` · ${st}`}` : st || T.yourTurn;
    }
    else text = actor?.isAI ? tr("thinking", { name: actor.name }) : tr("waiting", { name: actor?.name || "" });
  } else text = v.status ? plain(v.status) : T.over;
  return el("div", { class: `status${mine ? " mine" : ""}` }, v.state === "PLAYING" ? el("i", { class: "dot" }) : null, el("span", {}, text));
}

/**
 * أصل بصري للسؤال داخل الصفحة (ألعاب «خمن الصورة/العلم/…»).
 * يُقبل مرجع موقّع من نفس الأصل فقط — لا عنوان خارجي ولا data URL.
 * هذه هي الصورة الوحيدة في النظام، وهي **داخل Mini App** لا في رسالة واتساب.
 */
function assetCard(v) {
  const ref = String(v.asset?.ref || "");
  if (!ref || v.asset?.kind !== "image" || !/^[A-Za-z0-9_.-]{20,800}$/.test(ref)) return null;
  const frame = el("figure", { class: "asset" });
  const img = el("img", {
    src: `/api/v1/arcade/asset/${encodeURIComponent(ref)}`,
    alt: plain(v.asset.alt || v.title || ""),
    loading: "eager", decoding: "async", referrerpolicy: "no-referrer",
  });
  img.addEventListener("error", () => { frame.replaceChildren(el("div", { class: "asset-fail" }, "🖼️")); });
  frame.append(img);
  return frame;
}

// ─────────────── المسرح ───────────────
function stage(v) {
  const b = v.board;
  const asset = assetCard(v);
  if (asset) return el("div", {}, asset, b ? innerStage(v) : null);
  if (!b) return el("div", { class: "status" }, T.waitingPlayers);
  return innerStage(v);
}

function innerStage(v) {
  const b = v.board;
  if (!b) return null;
  if (b.kind === "track") return trackBoard(v);
  if (v.gameId === "wordle_ar") return wordleBoard(v);
  if (b.kind === "lines") {
    if (v.visualBoard?.cells?.length) return el("div", {}, gridBoard(v, v.visualBoard, { readOnly: true }), linesCard(v, b.lines.filter((l) => !/^[⬜🟩🟨⬛\s]+$/u.test(l))));
    return linesCard(v, b.lines);
  }
  return gridBoard(v, b);
}

const isEmptyText = (t) => !String(t || "").trim() || /^[·\s]+$/.test(t);
const DIGIT = /^(\d)️?⃣$/u;

/** الإجراء الذي يمثله الضغط على خانة i */
function cellAction(v, b, i) {
  if (!myTurn(v)) return null;
  const acts = v.actions || [];
  const mode = S.flag ? "flag" : null;
  const pool = acts.filter((a) => a.payload && (a.payload.cell === i || a.payload.i === i));
  if (pool.length) return (mode && pool.find((a) => a.id === mode)) || pool.find((a) => a.id !== "flag") || pool[0];
  if (v.gameId === "connect4") return acts.find((a) => a.payload?.col === i % b.cols) || null;
  if (v.gameId === "dotsboxes") {
    const r = Math.floor(i / b.cols); const c = i % b.cols;
    const id = r % 2 === 0 && c % 2 === 1 ? `h${r / 2}${(c - 1) / 2}` : r % 2 === 1 && c % 2 === 0 ? `v${(r - 1) / 2}${c / 2}` : null;
    return id ? acts.find((a) => a.payload?.line === id) || null : null;
  }
  return null;
}

/** الإجراءات المرتبطة بالخانات (لا تظهر كأزرار) */
function isCellAction(a) {
  const p = a.payload || {};
  return p.cell !== undefined || p.i !== undefined || p.col !== undefined || p.path !== undefined || p.line !== undefined;
}

const TILE = { 2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563", 32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61", 512: "#edc850", 1024: "#a78bfa", 2048: "#22d3ee" };

function cellContent(v, cell, i, b) {
  const g = v.gameId;
  if (g === "xo") {
    if (cell.k === "x") return xoMark("x", cell);
    if (cell.k === "o") return xoMark("o", cell);
    return null;
  }
  if (g === "g2048" && cell.k === "tile") {
    const n = Number(cell.n) || 0;
    return el("div", { class: `tile${n > 4 ? " big" : ""}`, style: `--tc:${TILE[n] || "#7c3aed"};font-size:${n >= 1024 ? 18 : n >= 128 ? 22 : 26}px` }, String(n));
  }
  if (g === "memory") {
    const up = cell.k !== "hidden";
    return el("div", { class: `flip${up ? " up" : ""}` },
      el("div", { class: "face back" }, cell.k === "hidden" ? String(cell.n ?? "") : ""),
      el("div", { class: "face front", style: `--c:${cell.c || "#fff"}` }, up ? cell.t : ""));
  }
  if (cell.k === "disc" || cell.k === "king") {
    const color = cell.c || (g === "checkers" ? (cell.s === 0 ? "#ef4444" : "#1f1f2e") : g === "connect4" ? (cell.s === 0 ? "#ff4d6d" : "#ffd23f") : null);
    if (color) return el("div", { class: "disc", style: `--c:${color}` }, cell.k === "king" ? "👑" : "");
  }
  if (g === "reversi" && cell.k === "dot") return el("div", { class: "hint" });
  if (g === "gomoku" && cell.k === "dot") return null;
  if (g === "dotsboxes" || g === "simon") return null;
  if (g === "sudoku") return cell.n ? el("span", {}, String(cell.n)) : null;
  if (g === "breakout" && (cell.k === "brick" || cell.k === "paddle")) return null;
  if (g === "snake" && cell.k === "snake") return null;
  if (cell.k === "empty" && (g === "connect4" || g === "snake" || g === "breakout" || g === "minesweeper" || g === "battleship" || g === "reversi" || g === "checkers")) return null;
  if (cell.k === "hidden" && g === "minesweeper") return null;
  if (isEmptyText(cell.t)) return null;
  const m = String(cell.t).match(DIGIT);
  if (m && cell.k === "empty") return el("span", { class: "glyph", style: "opacity:.25;font-size:.8em" }, m[1]);
  return el("span", { class: "glyph" }, String(cell.t).trim());
}

function xoMark(kind, cell) {
  const changed = S.changed?.has(cell.__i);
  const svg = svgEl("svg", { class: `mark m${kind}${changed ? " draw" : ""}`, viewBox: "0 0 100 100" });
  if (kind === "x") { svg.append(svgEl("path", { d: "M22 22 L78 78" }), svgEl("path", { d: "M78 22 L22 78" })); }
  else svg.append(svgEl("circle", { cx: 50, cy: 50, r: 30 }));
  return svg;
}

function gridBoard(v, b, { readOnly = false } = {}) {
  const cols = b.cols || 3;
  const prevCells = S.prev?.roomId === v.roomId ? (readOnly ? S.prev?.visualBoard?.cells : S.prev?.board?.cells) || [] : [];
  S.changed = new Set();
  b.cells.forEach((c, i) => { const p = prevCells[i]; if (prevCells.length && (!p || p.k !== c.k || p.t !== c.t)) S.changed.add(i); });
  const size = Math.max(10, Math.min(30, Math.floor(300 / cols)));
  const grid = el("div", { class: "grid", style: `grid-template-columns:repeat(${cols},1fr);--fs:${size}px` });
  const checkersTargets = new Set();
  if (v.gameId === "checkers" && S.sel !== null) for (const a of v.actions) if (a.payload?.path?.[0] === S.sel) checkersTargets.add(a.payload.path[a.payload.path.length - 1]);
  b.cells.forEach((cell, i) => {
    cell.__i = i;
    const r = Math.floor(i / cols);
    const c = i % cols;
    let action = readOnly ? null : cellAction(v, b, i);
    let can = Boolean(action);
    if (v.gameId === "checkers" && !readOnly && myTurn(v)) {
      can = v.actions.some((a) => a.payload?.path?.[0] === i) || checkersTargets.has(i);
      action = null;
    }
    if (v.gameId === "sudoku" && !readOnly && myTurn(v) && !cell.n) can = true;
    const cls = ["cell", `k-${cell.k}`];
    if (can) cls.push("can");
    if (cell.hl) cls.push("hl");
    if (S.sel === i) cls.push("sel");
    if (S.changed.has(i) && cell.k !== "empty" && cell.k !== "hidden") cls.push(v.gameId === "connect4" ? "drop" : "new");
    if (v.gameId === "dotsboxes" && cell.k === "line") { cls.push(r % 2 === 0 ? "h" : "v"); if (cell.on) cls.push("on"); }
    if (v.gameId === "sudoku") { if (c === 2 || c === 5) cls.push("box-r"); if (r === 2 || r === 5) cls.push("box-b"); }
    let style = "";
    if (cell.bg && v.gameId !== "connect4") style += `background:${cell.bg};`;
    if (cell.c) style += `--c:${cell.c};`;
    if (v.gameId === "dotsboxes" && cell.k === "box") style += `--box:${(THEMES.dotsboxes[cell.s] || "#fff")}55;`;
    if (v.gameId === "connect4" && cls.includes("drop")) style += `--from:${-(r + 1) * 112}%;--dur:${0.28 + r * 0.06}s;`;
    const node = el("div", { class: cls.join(" "), style, "data-i": i, role: can ? "button" : null, "aria-label": can ? `${r + 1}-${c + 1}` : null }, cellContent(v, cell, i, b));
    if (can) node.addEventListener("pointerdown", (e) => { e.preventDefault(); onCell(v, b, i, action, node); });
    grid.append(node);
  });
  const wrap = el("div", {});
  if (v.gameId === "connect4" && !readOnly) {
    const bar = el("div", { class: "colhit", style: `grid-template-columns:repeat(${cols},1fr)` });
    for (let c = 0; c < cols; c += 1) {
      const a = myTurn(v) ? v.actions.find((x) => x.payload?.col === c) : null;
      bar.append(el("button", { disabled: !a, "aria-label": `${c + 1}`, onclick: () => a && act(a.id, a.payload) }, "▼"));
    }
    wrap.append(bar);
  }
  if (b.colLabels && cols <= 10 && v.gameId !== "connect4") wrap.append(el("div", { class: "labels", style: `grid-template-columns:repeat(${cols},1fr)` }, b.colLabels.map((l) => el("span", {}, l))));
  wrap.append(grid);
  return wrap;
}

function onCell(v, b, i, action, node) {
  if (v.gameId === "checkers") {
    const target = S.sel !== null ? v.actions.find((a) => a.payload?.path?.[0] === S.sel && a.payload.path[a.payload.path.length - 1] === i) : null;
    if (target) { S.sel = null; sfx("place"); return act(target.id, target.payload, { quiet: true }); }
    S.sel = v.actions.some((a) => a.payload?.path?.[0] === i) ? i : null;
    sfx("tap");
    return render();
  }
  if (v.gameId === "sudoku") { S.sel = i; sfx("tap"); return render(); }
  if (!action) return null;
  const [x, y] = centerOf(node);
  burst(x, y, [getComputedStyle(document.documentElement).getPropertyValue("--acc2").trim() || "#22d3ee", "#ffffff"], 14, 4);
  sfx(v.gameId === "connect4" ? "drop" : v.gameId === "memory" ? "flip" : "place");
  return act(action.id, action.payload, { quiet: true });
}

// وردل: بلاطات تنقلب بلون التقييم (من الخادم) وحرف التخمين
const WORDLE_COLOR = { "🟩": "#22c55e", "🟨": "#eab308", "⬛": "#3f3f55", "⬜": "#3f3f55" };
function wordleBoard(v) {
  const rows = (v.board.lines || []).map((line) => {
    const [marks, letters = ""] = String(line).split(/\s{2,}/);
    return { marks: Array.from(marks || "").filter((ch) => WORDLE_COLOR[ch]), letters: letters.split(" ").filter(Boolean) };
  });
  const prevCount = (S.prev?.roomId === v.roomId ? S.prev.board.lines : []).filter((l) => /\s{2,}/.test(l)).length;
  const grid = el("div", { class: "grid", style: "grid-template-columns:repeat(5,1fr);--gap:7px;--fs:26px;direction:rtl" });
  rows.forEach((row, r) => {
    for (let k = 0; k < 5; k += 1) {
      const filled = row.letters.length > 0;
      const fresh = filled && r >= prevCount && S.prev;
      grid.append(el("div", { class: `cell${fresh ? " new" : ""}`, style: `${filled ? `background:${WORDLE_COLOR[row.marks[k]] || "#3f3f55"};border-color:transparent;` : ""}font-weight:900;${fresh ? `animation-delay:${k * 0.09}s` : ""}` }, filled ? row.letters[k] || "" : ""));
    }
  });
  return grid;
}

// السلم والثعبان
function squareXY(n) {
  const r = Math.floor((n - 1) / 10);
  const inRow = (n - 1) % 10;
  const c = r % 2 === 0 ? inRow : 9 - inRow;
  return { x: c * 10 + 5, y: (9 - r) * 10 + 5, c, row: 9 - r };
}
function trackBoard(v) {
  const b = v.board;
  const wrap = el("div", { class: "track" });
  for (let row = 0; row < 10; row += 1) {
    const r = 9 - row;
    for (let c = 0; c < 10; c += 1) {
      const n = r * 10 + (r % 2 === 0 ? c + 1 : 10 - c);
      wrap.append(el("div", { class: "sq" }, n === 100 ? "🏁" : String(n)));
    }
  }
  const svg = svgEl("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none" });
  for (const [from, to] of b.ladders || []) {
    const a = squareXY(from); const z = squareXY(to);
    const dx = z.x - a.x; const dy = z.y - a.y; const len = Math.hypot(dx, dy) || 1;
    const ox = (-dy / len) * 1.6; const oy = (dx / len) * 1.6;
    svg.append(svgEl("line", { class: "ladder", x1: a.x + ox, y1: a.y + oy, x2: z.x + ox, y2: z.y + oy }), svgEl("line", { class: "ladder", x1: a.x - ox, y1: a.y - oy, x2: z.x - ox, y2: z.y - oy }));
    const steps = Math.max(2, Math.round(len / 4));
    for (let k = 1; k < steps; k += 1) {
      const px = a.x + (dx * k) / steps; const py = a.y + (dy * k) / steps;
      svg.append(svgEl("line", { class: "ladder", x1: px + ox, y1: py + oy, x2: px - ox, y2: py - oy }));
    }
  }
  for (const [from, to] of b.snakes || []) {
    const a = squareXY(from); const z = squareXY(to);
    const mx = (a.x + z.x) / 2; const my = (a.y + z.y) / 2;
    svg.append(svgEl("path", { class: "snk", d: `M${a.x} ${a.y} C ${mx + 9} ${a.y + (my - a.y) * 0.3}, ${mx - 9} ${z.y - (z.y - my) * 0.3}, ${z.x} ${z.y}` }));
    svg.append(svgEl("circle", { cx: a.x, cy: a.y, r: 1.6, fill: "#f43f5e" }));
  }
  wrap.append(svg);
  (b.tokens || []).forEach((tk, k) => {
    const p = squareXY(Math.max(1, Math.min(100, tk.pos)));
    const off = [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]][k % 4];
    wrap.append(el("div", { class: "pawn", style: `left:${p.x - 4.1 + off[0]}%;top:${p.y - 4.1 + off[1]}%` }, tk.mark));
  });
  return wrap;
}

function linesCard(v, lines) {
  const card = el("div", { class: "qcard" });
  const list = (lines || []).filter((l, i, arr) => !(v.actions?.some((a) => a.id === "answer") && /^[A-D]\)/.test(plain(l))) || arr.length < 2);
  list.forEach((line, i) => {
    const text = String(line);
    if (!text.trim()) return;
    const big = (i === 1 && /\?|؟/.test(text)) || (v.gameId === "hangman" && /[＿_]/.test(text));
    card.append(el("div", { class: `q-line${big ? " big" : ""}${v.gameId === "hangman" && /[＿_]/.test(text) ? " word" : ""}` }, rich(text)));
  });
  if (!card.childNodes.length) card.append(el("div", { class: "q-line" }, v.icon || "🎮"));
  return card;
}

// ─────────────── أزرار التحكم ───────────────
function controls(v) {
  const box = el("div", {});
  if (v.state !== "PLAYING") return box;
  const mine = myTurn(v);
  const free = FREE[v.gameId];
  const rest = (v.actions || []).filter((a) => !isCellAction(a));
  const dirId = DIR_GAMES[v.gameId];

  if (LIVE[v.gameId]) {
    box.append(el("div", { class: "actions" }, el("button", { class: "btn alt", onclick: () => (S.live ? stopLive() : startLive()) }, S.live ? T.pause : S.paused ? T.resume : T.start)));
  }
  if (dirId) {
    const byDir = Object.fromEntries(rest.filter((a) => a.id === dirId).map((a) => [a.payload?.d || a.payload?.dir, a]));
    const pad = el("div", { class: "dpad" });
    const arrows = { up: "▲", down: "▼", left: "◀", right: "▶", stay: "■" };
    for (const d of ["up", "left", "stay", "right", "down"]) {
      const a = byDir[d];
      if (!a && d !== "stay") { if (v.gameId !== "breakout") pad.append(el("span", { class: d })); continue; }
      if (!a) continue;
      pad.append(el("button", { class: `btn ${d === "stay" ? "mid ghost" : d}`, disabled: !mine, "aria-label": a.text, onclick: () => press(d) }, arrows[d]));
    }
    box.append(pad);
    for (const a of rest.filter((x) => x.id !== dirId)) box.append(el("div", { class: "actions" }, el("button", { class: "btn alt", disabled: !mine, onclick: () => act(a.id, a.payload) }, a.text)));
    box.append(el("div", { class: "hint-line" }, T.swipe));
    return box;
  }

  if (v.gameId === "simon") {
    const colors = { "🔴": "#ef4444", "🟢": "#22c55e", "🔵": "#3b82f6", "🟡": "#facc15" };
    const pads = el("div", { class: "grid", style: "grid-template-columns:repeat(2,1fr);--gap:12px;margin-top:12px" });
    for (const a of rest.filter((x) => x.id === "press")) {
      const pad = el("div", { class: "cell can", style: `--c:${colors[a.text] || "#a855f7"};background:var(--c);border-radius:24px;opacity:.85;aspect-ratio:1.6` });
      pad.addEventListener("pointerdown", (e) => { e.preventDefault(); pad.style.opacity = "1"; pad.style.boxShadow = `0 0 40px ${colors[a.text]}`; tone(260 + a.payload.c * 110, 0.25, "triangle", 0.07); act(a.id, a.payload, { quiet: true }); });
      pads.append(pad);
    }
    box.append(pads);
    return box;
  }

  if (v.gameId === "sudoku" && S.sel !== null && mine) {
    box.append(el("div", { class: "hint-line" }, T.numPick));
    box.append(el("div", { class: "numpad" }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => el("button", { onclick: () => { const cell = S.sel; S.sel = null; act("set", { cell, v: n }); } }, String(n)))));
  }

  if (v.gameId === "minesweeper" && rest.length === 0 && (v.actions || []).some((a) => a.id === "flag")) {
    box.append(el("div", { class: "actions" }, el("button", { class: `btn small ${S.flag ? "alt" : "ghost"}`, onclick: () => { S.flag = !S.flag; render(); } }, S.flag ? T.revealMode : T.flagMode)));
  }

  const answers = rest.filter((a) => a.id === "answer" || a.id === "pick");
  const letters = rest.filter((a) => a.id === "letter");
  const others = rest.filter((a) => !answers.includes(a) && !letters.includes(a));
  if (answers.length) {
    box.append(el("div", { class: "answers" }, answers.map((a) => el("button", { class: "btn", disabled: !mine, onclick: (e) => answer(a, e.currentTarget) }, plain(a.text)))));
  }
  if (letters.length) box.append(el("div", { class: "answers letters" }, letters.map((a) => el("button", { class: "btn small ghost", disabled: !mine, onclick: () => act(a.id, a.payload) }, a.text))));
  if (others.length) {
    box.append(el("div", { class: "actions" }, others.map((a) => el("button", { class: `btn ${a.id === "roll" ? "alt" : others.length > 2 ? "small ghost" : ""}`, disabled: !mine, onclick: (e) => (a.id === "roll" ? roll(a) : act(a.id, a.payload)) }, a.id === "roll" ? el("span", {}, el("span", { class: `dice${S.rolling ? " roll" : ""}` }, "🎲"), " ", plain(a.text).replace("🎲", "").trim()) : plain(a.text)))));
  }
  if (free && v.free?.includes(free.id) && mine) {
    const input = el("input", { type: "text", maxlength: free.max, placeholder: free.ph[LANG] || free.ph.en, inputmode: free.numeric ? "numeric" : "text", autocomplete: "off", dir: "auto" });
    const send = () => { const value = input.value.trim(); if (value) act(free.id, { [free.key]: value }); };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    box.append(el("div", { class: "free" }, input, el("button", { class: "btn small", onclick: send }, T.send)));
  }
  return box;
}

async function answer(a, node) {
  const before = S.view;
  const res = await act(a.id, a.payload);
  if (!res?.accepted) return;
  // صواب/خطأ: من أحداث الخادم إن وُجدت (لا يحسبها العميل)
  const ev = (res.events || []).find((e) => typeof e?.correct === "boolean");
  if (ev && node?.isConnected) node.classList.add(ev.correct ? "right" : "wrong");
  if (ev) sfx(ev.correct ? "eat" : "err");
  else if (before) sfx("place");
}

async function roll(a) {
  S.rolling = true;
  sfx("roll");
  render();
  await new Promise((r) => setTimeout(r, 450));
  S.rolling = false;
  await act(a.id, a.payload, { quiet: true });
}

function press(d) {
  const v = S.view;
  const id = DIR_GAMES[v.gameId];
  const key = v.gameId === "g2048" ? "dir" : "d";
  if (LIVE[v.gameId] && S.live) { S.liveDir = d; sfx("tap"); return; }
  const a = (v.actions || []).find((x) => x.id === id && (x.payload?.[key]) === d);
  if (a) act(a.id, a.payload, { quiet: v.gameId !== "g2048" }).then(() => v.gameId === "g2048" && sfx("flip"));
}

// اللعب الحي (ثعبان/طوب): نبضة دورية ترسل الاتجاه الحالي — الخادم يحرك اللعبة خطوة لكل نبضة
function startLive() {
  const spec = LIVE[S.view.gameId];
  if (!spec) return;
  S.live = true;
  S.liveDir ||= spec.idle || null;
  S.lastSnake ||= "right";
  clearInterval(S.timer);
  S.timer = setInterval(async () => {
    const v = S.view;
    if (!S.live || !v || v.state !== "PLAYING" || S.busy || document.hidden) return;
    const legal = (v.actions || []).filter((a) => a.id === spec.action);
    let a = legal.find((x) => x.payload?.[spec.key] === S.liveDir) || legal.find((x) => x.payload?.[spec.key] === spec.idle);
    if (!a && v.gameId === "snake") a = legal.find((x) => x.payload?.[spec.key] === S.lastSnake) || legal[0];
    if (!a) return;
    if (v.gameId === "snake") S.lastSnake = a.payload[spec.key];
    const beforeLen = JSON.stringify(v.panels || []);
    await act(a.id, a.payload, { quiet: true });
    if (S.view && JSON.stringify(S.view.panels || []) !== beforeLen) sfx("eat");
    if (spec.idle) S.liveDir = spec.idle;
  }, spec.ms);
  render();
}
function stopLive() {
  if (S.live) S.paused = true;
  S.live = false;
  clearInterval(S.timer);
  S.timer = null;
  if (S.view && LIVE[S.view.gameId]) render();
}

function footer(v) {
  const foot = el("div", { class: "foot" });
  if (v.state === "PLAYING" && v.players?.length > 1) foot.append(el("button", { class: "btn small ghost", onclick: async () => { const res = await call("/surrender", {}); if (res.ok && res.data.view) update(res.data.view); } }, `🏳️ ${T.surrender}`));
  if (v.state === "FINISHED") foot.append(el("button", { class: "btn small", onclick: rematch }, `🔄 ${T.rematch}`));
  return foot.childNodes.length ? foot : null;
}

// ─────────────── بعد الرسم: خط الفوز والجسيمات ───────────────
function afterPaint() {
  const v = S.view;
  if (v.gameId === "xo") {
    const grid = document.querySelector(".g-xo .grid");
    const hl = [...document.querySelectorAll(".g-xo .cell.hl")];
    if (grid && hl.length >= 3) {
      const g = grid.getBoundingClientRect();
      const pts = hl.map((n) => { const [x, y] = centerOf(n); return [x - g.left, y - g.top]; });
      pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const [a, z] = [pts[0], pts[pts.length - 1]];
      const svg = svgEl("svg", { class: "winline", viewBox: `0 0 ${g.width} ${g.height}` });
      const dx = z[0] - a[0]; const dy = z[1] - a[1]; const len = Math.hypot(dx, dy) || 1; const ext = 26;
      svg.append(svgEl("line", { x1: a[0] - (dx / len) * ext, y1: a[1] - (dy / len) * ext, x2: z[0] + (dx / len) * ext, y2: z[1] + (dy / len) * ext }));
      grid.append(svg);
    }
  }
  // جسيمات لكل خانة تغيرت بحركة الخصم/الكمبيوتر
  if (S.changed?.size && S.prev && v.gameId !== "snake" && v.gameId !== "breakout") {
    for (const i of S.changed) {
      const node = document.querySelector(`.cell[data-i="${i}"]`);
      if (node && !node.classList.contains("k-empty")) { const [x, y] = centerOf(node); burst(x, y, ["#ffffff", getComputedStyle(document.documentElement).getPropertyValue("--acc").trim()], 8, 3); }
    }
  }
}

// ─────────────── النتيجة ───────────────
function showResult() {
  const v = S.view;
  const res = v.result || {};
  const winners = res.winners || [];
  const won = winners.includes(v.me);
  const draw = res.draw;
  const solo = (v.players || []).length < 2;
  const kind = draw ? "draw" : won ? "win" : solo ? "over" : "lose";
  const mine = (v.settlement || []).find((s) => s.seat === v.me);
  const icon = { win: "🏆", lose: "💀", draw: "🤝", over: "🎯" }[kind];
  const title = { win: T.win, lose: T.lose, draw: T.draw, over: T.over }[kind];
  const sub = { win: T.winSub, lose: T.loseSub, draw: T.drawSub, over: v.status ? plain(v.status) : "" }[kind];
  sfx(kind === "win" ? "win" : kind === "lose" ? "lose" : "draw");
  if (kind === "win" || (kind === "over" && mine?.result === "win")) confetti();
  vibrate(kind === "win" ? 60 : 25);
  const overlay = el("div", { class: "overlay", id: "overlay" },
    el("div", { class: "result" },
      el("div", { class: "big" }, icon),
      el("h2", {}, title),
      el("p", {}, sub),
      rewardPill(mine),
      el("div", { class: "actions" },
        el("button", { class: "btn", onclick: rematch }, `🔄 ${T.rematch}`),
        el("button", { class: "btn ghost", onclick: () => overlay.remove() }, T.close)),
    ));
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
}

/** المكافأة الحقيقية من تسوية الخادم: {koin, exp, energi} + نقاط الترتيب */
function rewardPill(mine) {
  if (!mine) return null;
  const r = mine.reward || {};
  const parts = [];
  if (r.koin) parts.push(`🪙 +${r.koin} ${T.coins}`);
  if (r.exp) parts.push(`✨ +${r.exp} XP`);
  if (r.energi) parts.push(`⚡ +${r.energi}`);
  if (mine.points) parts.push(`⭐ +${mine.points} ${T.points}`);
  return parts.length ? el("div", { class: "reward" }, parts.map((p) => el("span", {}, p))) : null;
}

async function rematch() {
  sfx("tap");
  const res = await call("/rematch", {});
  if (!res.ok) return toast(errText(res.code), true);
  if (res.data.pending) return toast(tr("rematchWait", { names: res.data.pending.join("، ") }));
  document.getElementById("overlay")?.remove();
  history.replaceState(null, "", `/play/${res.data.token}${location.search}`);
  location.reload();
}

// ─────────────── الإدخال: لوحة مفاتيح وسحب ───────────────
const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", " ": "stay" };
addEventListener("keydown", (e) => {
  const v = S.view;
  if (!v || e.target?.tagName === "INPUT") return;
  if (DIR_GAMES[v.gameId] && KEYS[e.key]) { e.preventDefault(); press(KEYS[e.key]); return; }
  if (/^[1-9]$/.test(e.key)) {
    const i = Number(e.key) - 1;
    if (v.gameId === "xo") { const a = v.actions.find((x) => x.payload?.cell === i); if (a) act(a.id, a.payload); }
    if (v.gameId === "connect4") { const a = v.actions.find((x) => x.payload?.col === i); if (a) act(a.id, a.payload); }
    if (v.gameId === "sudoku" && S.sel !== null) { const cell = S.sel; S.sel = null; act("set", { cell, v: i + 1 }); }
  }
});
let touch = null;
addEventListener("touchstart", (e) => { touch = e.touches[0] ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
addEventListener("touchend", (e) => {
  const v = S.view;
  if (!touch || !v || !DIR_GAMES[v.gameId] || !e.changedTouches[0]) return;
  const dx = e.changedTouches[0].clientX - touch[0];
  const dy = e.changedTouches[0].clientY - touch[1];
  touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
}, { passive: true });
addEventListener("pointerdown", () => audio(), { once: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

// ─────────────── الإقلاع ───────────────
async function boot() {
  fxInit();
  document.documentElement.dir = T.dir;
  if (!/^[A-Za-z0-9_.-]{20,400}$/.test(TOKEN)) return expired();
  try {
    const res = await call();
    if (!res.ok) return expired();
    update(res.data);
  } catch {
    toast(errText("network"), true);
  }
  S.poll = setInterval(refresh, 1300);
}
boot();
