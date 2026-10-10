// ═══════════════════════════════════════════════
// ❌⭕ TERBOO XO — لعبة إكس أو مستقلة ضد الكمبيوتر (§9)
// ───────────────────────────────────────────────
// كل شيء داخل المستند: اللوحة والعلامات والصعوبة والعداد وخط الفوز وإعادة الجولة.
// لا أزرار واتساب للحركة، ولا طلب شبكة — اللمس على الخلية هو الحركة.
//
// النطاق: **فردي ضد الكمبيوتر فقط.** النتيجة محلية ولا تمنح مكافأة ولا تدخل ترتيباً.
// إكس أو بين لاعبين تبقى على محرك الأركيد الخادمي (contract xo) حيث التحقق موثوق.
//
// الصعوبة: سهل = عشوائي · متوسط = فوز/صد ثم عشوائي · صعب = minimax كامل.
// شجرة 3×3 صغيرة (≤ 9! مسار مع التقليم) فتُحسب فوراً بلا تجميد الواجهة.
// ═══════════════════════════════════════════════

import { buildDocument, esc, jsonLiteral, safeLang } from "./_kit.js";

const COPY = {
  ar: { title: "TERBOO XO", tagline: "إكس أو ضد الكمبيوتر", you: "أنت", cpu: "الكمبيوتر", draws: "تعادل",
        easy: "سهل", normal: "متوسط", hard: "صعب", yourTurn: "دورك", cpuTurn: "دور الكمبيوتر…",
        win: "فزت! 🎉", lose: "خسرت", draw: "تعادل", again: "↻ جولة جديدة", level: "الصعوبة",
        hint: "اضغط على أي خانة فاضية للعب. اختر الصعوبة من الأعلى.", sound: "الصوت", local: "النتيجة محلية على هذا الجهاز" },
  en: { title: "TERBOO XO", tagline: "Tic Tac Toe vs the computer", you: "YOU", cpu: "CPU", draws: "DRAWS",
        easy: "Easy", normal: "Normal", hard: "Hard", yourTurn: "Your turn", cpuTurn: "CPU thinking…",
        win: "You win! 🎉", lose: "You lose", draw: "Draw", again: "↻ Play again", level: "Difficulty",
        hint: "Tap any empty square to play. Pick a difficulty above.", sound: "Sound", local: "Local score on this device only" },
  es: { title: "TERBOO XO", tagline: "Tres en raya contra la maquina", you: "TU", cpu: "CPU", draws: "EMPATES",
        easy: "Facil", normal: "Normal", hard: "Dificil", yourTurn: "Tu turno", cpuTurn: "La CPU piensa…",
        win: "¡Ganaste! 🎉", lose: "Perdiste", draw: "Empate", again: "↻ Otra partida", level: "Dificultad",
        hint: "Pulsa una casilla vacia para jugar. Elige la dificultad arriba.", sound: "Sonido", local: "Puntuacion local en este dispositivo" },
};

const CSS = [
  ".levels{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}",
  ".lv{padding:10px 4px;border-radius:12px;border:1px solid var(--line);background:var(--panel-2,#121a2a);",
  "color:var(--muted);font-weight:800;font-size:13px}",
  ".lv[aria-pressed=true]{color:#fff;border-color:color-mix(in srgb,var(--acc) 60%,transparent);",
  "background:linear-gradient(150deg,color-mix(in srgb,var(--acc) 48%,#16122c),#15122a)}",
  ".board{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px;aspect-ratio:1}",
  ".cell{display:grid;place-items:center;border:0;border-radius:14px;font-size:clamp(34px,13vw,64px);font-weight:900;",
  "background:linear-gradient(145deg,#1b2740,#121a2c);box-shadow:inset 0 2px rgba(255,255,255,.07),0 5px 0 rgba(0,0,0,.26);",
  "color:#fff;min-height:0;transition:transform .1s,filter .1s;touch-action:manipulation}",
  ".cell[data-m=X]{color:#7c5cff;text-shadow:0 0 18px #7c5cff66}",
  ".cell[data-m=O]{color:#22d3ee;text-shadow:0 0 18px #22d3ee66}",
  ".cell:disabled{cursor:default}",
  ".cell.can:active{transform:translateY(3px)}",
  ".cell.win{background:linear-gradient(145deg,#1f6f4a,#14532d);box-shadow:inset 0 2px rgba(255,255,255,.18),0 0 24px #22c55e66}",
  ".line{position:absolute;height:6px;border-radius:99px;background:linear-gradient(90deg,#22c55e,#a3e635);",
  "box-shadow:0 0 22px #22c55eaa;transform-origin:0 50%;pointer-events:none;transition:width .25s ease-out}",
  ".turn{text-align:center;padding:9px;margin-top:10px;border-radius:12px;border:1px solid var(--line);",
  "background:#121a2a;font-weight:800;font-size:14px}",
  ".turn.win{color:#86efac;border-color:#22c55e66}.turn.lose{color:#fda4af;border-color:#f43f5e66}",
].join("");

/**
 * @param {string} lang ar · en · es
 * @returns {string} مستند HTML مستقل بالكامل
 */
function buildTicTacToeHtml(lang = "ar", { nonce = "" } = {}) {
  const l = safeLang(lang);
  const t = COPY[l];
  const cells = Array.from({ length: 9 }, (_, i) =>
    `<button class="cell can" type="button" data-i="${i}" aria-label="${esc(t.yourTurn)} ${i + 1}"></button>`).join("");
  const body = `<main class="app">
<header class="head">
  <span class="logo" aria-hidden="true">❌</span>
  <div class="brand"><div class="name">${esc(t.title)}</div><div class="tagline">${esc(t.tagline)}</div></div>
  <button id="mute" class="pill" type="button" aria-label="${esc(t.sound)}">🔊</button>
</header>
<div class="stats">
  <div class="stat"><div class="label">${esc(t.you)}</div><div class="value" id="w">0</div></div>
  <div class="stat"><div class="label">${esc(t.draws)}</div><div class="value" id="d">0</div></div>
  <div class="stat"><div class="label">${esc(t.cpu)}</div><div class="value" id="lo">0</div></div>
</div>
<div class="levels" role="group" aria-label="${esc(t.level)}">
  <button class="lv" type="button" data-lv="easy" aria-pressed="false">${esc(t.easy)}</button>
  <button class="lv" type="button" data-lv="normal" aria-pressed="true">${esc(t.normal)}</button>
  <button class="lv" type="button" data-lv="hard" aria-pressed="false">${esc(t.hard)}</button>
</div>
<section class="panel"><div class="panel-in"><div class="board" id="board">${cells}<i class="line" id="line" style="width:0"></i></div></div></section>
<div class="turn" id="turn">${esc(t.yourTurn)}</div>
<div class="bottom">
  <p class="hint">${esc(t.hint)}<br><small>${esc(t.local)}</small></p>
  <button id="again" class="btn ghost" type="button" style="min-height:42px;padding:0 12px">${esc(t.again)}</button>
</div>
<p class="foot">BOT TERBOO · ARCADE</p>
</main>`;

  const js = `
const T = ${jsonLiteral(t)};
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const HUMAN = "X", CPU = "O";
let board, over, level = "normal", busy = false;
const score = { w: 0, d: 0, l: 0 };
const cellEls = [...document.querySelectorAll(".cell")];
const turnEl = TK.$("turn"), lineEl = TK.$("line");

function winnerOf(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { mark: b[a], line: [a, c, d] };
  return b.every(Boolean) ? { mark: null, line: null } : null;   // null = اللعبة مستمرة
}
function freeOf(b) { return b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0); }

// minimax كامل مع تقليم ألفا-بيتا — الشجرة صغيرة فلا تجميد للواجهة
function minimax(b, me, alpha, beta, depth) {
  const res = winnerOf(b);
  if (res) {
    if (!res.mark) return { s: 0 };
    return { s: res.mark === CPU ? 10 - depth : depth - 10 };
  }
  let bestMove = -1;
  if (me === CPU) {
    let best = -Infinity;
    for (const i of freeOf(b)) {
      b[i] = CPU; const s = minimax(b, HUMAN, alpha, beta, depth + 1).s; b[i] = null;
      if (s > best) { best = s; bestMove = i; }
      alpha = Math.max(alpha, s); if (beta <= alpha) break;
    }
    return { s: best, i: bestMove };
  }
  let best = Infinity;
  for (const i of freeOf(b)) {
    b[i] = HUMAN; const s = minimax(b, CPU, alpha, beta, depth + 1).s; b[i] = null;
    if (s < best) { best = s; bestMove = i; }
    beta = Math.min(beta, s); if (beta <= alpha) break;
  }
  return { s: best, i: bestMove };
}
/** فوز فوري أو صدّ فوري، وإلا null */
function tactical(b, mark) {
  for (const i of freeOf(b)) { b[i] = mark; const r = winnerOf(b); b[i] = null; if (r && r.mark === mark) return i; }
  return null;
}
function cpuMove(b) {
  const free = freeOf(b);
  if (!free.length) return -1;
  if (level === "easy") return free[Math.floor(Math.random() * free.length)];
  if (level === "normal") {
    // متوسط: يفوز إن استطاع، ويصدّ إن اضطر، وإلا حركة عشوائية (استراتيجية تقريبية لا مثالية)
    const win = tactical(b, CPU); if (win !== null) return win;
    const block = tactical(b, HUMAN); if (block !== null) return block;
    return free[Math.floor(Math.random() * free.length)];
  }
  return minimax(b.slice(), CPU, -Infinity, Infinity, 0).i;
}

function paint() {
  board.forEach((v, i) => {
    const el = cellEls[i];
    el.textContent = v || "";
    if (v) el.setAttribute("data-m", v); else el.removeAttribute("data-m");
    const playable = !v && !over && !busy;
    el.disabled = !playable;
    el.classList.toggle("can", playable);
  });
}
function drawLine(line) {
  if (!line) { lineEl.style.width = "0"; return; }
  const box = TK.$("board").getBoundingClientRect();
  const a = cellEls[line[0]].getBoundingClientRect(), c = cellEls[line[2]].getBoundingClientRect();
  const x1 = a.left + a.width / 2 - box.left, y1 = a.top + a.height / 2 - box.top;
  const x2 = c.left + c.width / 2 - box.left, y2 = c.top + c.height / 2 - box.top;
  const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  lineEl.style.left = x1 + "px"; lineEl.style.top = (y1 - 3) + "px";
  lineEl.style.transform = "rotate(" + ang + "deg)";
  lineEl.style.width = len + "px";
  for (const i of line) cellEls[i].classList.add("win");
}
function setTurn(text, cls) { turnEl.textContent = text; turnEl.className = "turn" + (cls ? " " + cls : ""); }

function finish(res) {
  over = true; busy = false;
  drawLine(res.line);
  if (!res.mark) { score.d += 1; setTurn(T.draw); TK.sound.tap(); }
  else if (res.mark === HUMAN) { score.w += 1; setTurn(T.win, "win"); TK.sound.win(); TK.vibrate(30); }
  else { score.l += 1; setTurn(T.lose, "lose"); TK.sound.lose(); TK.vibrate(60); }
  TK.$("w").textContent = String(score.w); TK.$("d").textContent = String(score.d); TK.$("lo").textContent = String(score.l);
  paint();
}

let cpuTimer = 0;
function play(i) {
  if (over || busy || board[i]) return;        // لا حركة بعد النهاية ولا على خانة مشغولة
  board[i] = HUMAN; TK.sound.tap(); TK.vibrate(8);
  let res = winnerOf(board);
  if (res) { paint(); return finish(res); }
  busy = true; setTurn(T.cpuTurn); paint();
  clearTimeout(cpuTimer);
  cpuTimer = setTimeout(() => {
    const move = cpuMove(board);
    if (move >= 0) board[move] = CPU;
    busy = false;
    res = winnerOf(board);
    paint();
    if (res) finish(res); else setTurn(T.yourTurn);
  }, TK.reduced() ? 0 : 260);
}

function reset() {
  clearTimeout(cpuTimer);
  board = Array(9).fill(null); over = false; busy = false;
  for (const el of cellEls) el.classList.remove("win");
  lineEl.style.width = "0";
  setTurn(T.yourTurn);
  paint();
}

// مستمع واحد على الحاوية ⇒ إعادة الجولة لا تضيف مستمعات جديدة
TK.$("board").addEventListener("click", (e) => {
  const btn = e.target.closest(".cell");
  if (btn) play(Number(btn.dataset.i));
});
for (const b of document.querySelectorAll(".lv")) {
  b.addEventListener("click", () => {
    level = b.dataset.lv;
    for (const o of document.querySelectorAll(".lv")) o.setAttribute("aria-pressed", String(o === b));
    reset();
  });
}
TK.$("again").addEventListener("click", reset);
TK.$("mute").addEventListener("click", (e) => { e.currentTarget.textContent = TK.sound.toggle() ? "🔇" : "🔊"; });
TK.$("mute").textContent = TK.sound.muted ? "🔇" : "🔊";
addEventListener("resize", () => { const r = winnerOf(board); if (over && r && r.line) drawLine(r.line); });
reset();
`;
  return buildDocument({ lang: l, title: t.title, css: CSS, body, js, nonce });
}

export { COPY, buildTicTacToeHtml };
