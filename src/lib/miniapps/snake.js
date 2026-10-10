// ═══════════════════════════════════════════════
// 🐍 TERBOO SNAKE — Mini App مستقلة
// ───────────────────────────────────────────────
// شبكة 17×17 على Canvas. التحكم بالسحب على الساحة أو بأزرار اتجاه كبيرة.
// السرعة تتدرّج مع الطول · الجسم يقتل · الجدار يقتل · الطعام يُطيل ويُسرّع.
// الحركة تتم على نبضة ثابتة (step) لا على كل إطار، فالسرعة لا تتبع FPS الجهاز.
// لا تخزين ولا شبكة: النتيجة لهذه الجلسة فقط (الفقاعة في أصل معتم).
// ═══════════════════════════════════════════════

import { buildDocument, esc, jsonLiteral, safeLang } from "./_kit.js";

const COPY = {
  ar: { title: "TERBOO SNAKE", tagline: "ثعبان على شبكة", score: "النقاط", best: "أفضل جولة", len: "الطول",
        start: "▶ ابدأ", again: "↻ جولة جديدة", over: "انتهت الجولة", hint: "اسحب على الساحة أو استخدم الأسهم",
        speed: "السرعة", session: "النتيجة لهذه الجلسة فقط", up: "أعلى", down: "أسفل", left: "يسار", right: "يمين" },
  en: { title: "TERBOO SNAKE", tagline: "Grid snake", score: "Score", best: "Best run", len: "Length",
        start: "▶ Start", again: "↻ New run", over: "Run over", hint: "Swipe the arena or use the arrows",
        speed: "Speed", session: "Score lasts this session only", up: "Up", down: "Down", left: "Left", right: "Right" },
  es: { title: "TERBOO SNAKE", tagline: "Serpiente en rejilla", score: "Puntos", best: "Mejor ronda", len: "Largo",
        start: "▶ Empezar", again: "↻ Nueva ronda", over: "Ronda terminada", hint: "Desliza en la arena o usa las flechas",
        speed: "Velocidad", session: "El puntaje dura solo esta sesion", up: "Arriba", down: "Abajo", left: "Izquierda", right: "Derecha" },
};

const CSS = [
  ".arena{position:relative;height:min(52vh,330px);background:radial-gradient(circle at 50% 0,#13243a,#080d16 70%);touch-action:none}",
  ".arena canvas{display:block;width:100%;height:100%}",
  ".pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;max-width:260px;margin-inline:auto}",
  ".pad .btn{min-height:52px;font-size:20px}",
  ".pad .sp{visibility:hidden}",
  ".over{position:absolute;inset:0;display:grid;place-items:center;background:rgba(5,8,14,.84);text-align:center;padding:16px}",
  ".over h2{margin:0 0 6px;font-size:22px;font-weight:900}",
  ".over p{margin:0 0 14px;color:var(--muted);font-size:12px}",
  ".over[hidden]{display:none}",
].join("");

/**
 * @param {string} lang ar · en · es
 * @param {{nonce?:string}} [options]
 */
function buildSnakeHtml(lang = "ar", { nonce = "" } = {}) {
  const l = safeLang(lang);
  const t = COPY[l];
  const body = `<div class="app">
<header class="head">
  <div class="logo">🐍</div>
  <div class="brand"><div class="name">${esc(t.title)}</div><div class="tagline">${esc(t.tagline)}</div></div>
  <div class="pill">${esc(t.speed)} <b id="spd">1</b></div>
</header>
<section class="stats">
  <div class="stat"><div class="label">${esc(t.score)}</div><div class="value" id="score">0</div></div>
  <div class="stat"><div class="label">${esc(t.len)}</div><div class="value" id="len">3</div></div>
  <div class="stat"><div class="label">${esc(t.best)}</div><div class="value" id="best">0</div></div>
</section>
<section class="panel"><div class="panel-in">
  <div class="arena" id="arena"><canvas id="cv"></canvas>
    <div class="over" id="over"><div>
      <h2 id="overTitle">${esc(t.title)}</h2>
      <p id="overText">${esc(t.hint)}</p>
      <button class="btn alt" id="go" type="button">${esc(t.start)}</button>
    </div></div>
  </div>
</div></section>
<div class="pad">
  <i class="sp"></i>
  <button class="btn ghost" id="u" type="button" aria-label="${esc(t.up)}">▲</button>
  <i class="sp"></i>
  <button class="btn ghost" id="l" type="button" aria-label="${esc(t.left)}">◀</button>
  <button class="btn ghost" id="d" type="button" aria-label="${esc(t.down)}">▼</button>
  <button class="btn ghost" id="r" type="button" aria-label="${esc(t.right)}">▶</button>
</div>
<div class="bottom"><span class="tagline">${esc(t.session)}</span></div>
</div>`;

  const js = `
const T = ${jsonLiteral(t)};
const N = 17;                       // خانات الشبكة في كل بعد
const cv = TK.$("cv"), ctx = cv.getContext("2d");
const over = TK.$("over");
let snake, dir, next, food, score, best = 0, alive = false, tick, acc, cell, pad;

function fit() {
  const r = cv.parentElement.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = Math.max(1, Math.round(r.height * dpr));
  cell = Math.floor(Math.min(cv.width, cv.height) / N);
  pad = { x: (cv.width - cell * N) / 2, y: (cv.height - cell * N) / 2 };
  draw();
}

function reset() {
  snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
  dir = { x: 1, y: 0 }; next = dir;
  score = 0; tick = 0.16; acc = 0;
  placeFood();
  paint();
}

function placeFood() {
  // خانة حرّة فقط: لا طعام داخل الجسم
  const free = [];
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
    if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
  }
  food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

function paint() {
  TK.$("score").textContent = score;
  TK.$("len").textContent = snake.length;
  TK.$("best").textContent = best;
  TK.$("spd").textContent = (0.16 / tick).toFixed(1);
}

function cellRect(c) { return [pad.x + c.x * cell, pad.y + c.y * cell, cell, cell]; }

function draw() {
  if (!ctx || !cell) return;
  ctx.clearRect(0, 0, cv.width, cv.height);
  // شبكة خفيفة
  ctx.strokeStyle = "rgba(255,255,255,.045)"; ctx.lineWidth = 1;
  for (let i = 0; i <= N; i += 1) {
    ctx.beginPath(); ctx.moveTo(pad.x + i * cell, pad.y); ctx.lineTo(pad.x + i * cell, pad.y + N * cell); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.x, pad.y + i * cell); ctx.lineTo(pad.x + N * cell, pad.y + i * cell); ctx.stroke();
  }
  if (food) {
    const [fx, fy, fw, fh] = cellRect(food);
    ctx.fillStyle = "#ffbe27";
    ctx.beginPath(); ctx.arc(fx + fw / 2, fy + fh / 2, fw * 0.32, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = snake.length - 1; i >= 0; i -= 1) {
    const [x, y, w, h] = cellRect(snake[i]);
    const head = i === 0;
    ctx.fillStyle = head ? "#7cf2a8" : "rgba(124,242,168," + (0.9 - (i / snake.length) * 0.55).toFixed(2) + ")";
    const m = Math.max(1, Math.round(w * 0.08));
    ctx.fillRect(x + m, y + m, w - m * 2, h - m * 2);
  }
}

function die() {
  alive = false;
  anim.stop();
  if (score > best) { best = score; TK.store.set("best", best); }
  paint();
  TK.$("overTitle").textContent = T.over;
  TK.$("overText").textContent = T.score + ": " + score;
  TK.$("go").textContent = T.again;
  over.hidden = false;
  TK.sound.lose();
}

function step(dt) {
  acc += dt;
  if (acc < tick) { draw(); return; }
  acc = 0;
  // منع الانعكاس الفوري على نفس النبضة
  if (next.x !== -dir.x || next.y !== -dir.y) dir = next;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N) return die();
  if (snake.some((s) => s.x === head.x && s.y === head.y)) return die();
  snake.unshift(head);
  if (food && head.x === food.x && head.y === food.y) {
    score += 10;
    tick = Math.max(0.055, tick * 0.965);   // تسريع تدريجي
    placeFood();
    TK.sound.good();
    TK.vibrate(10);
  } else snake.pop();
  paint();
  draw();
}

const anim = TK.loop(step);

function start() {
  reset();
  over.hidden = true;
  alive = true;
  anim.start();
  TK.sound.tap();
}

TK.$("go").addEventListener("click", start);
for (const [id, d] of [["u", { x: 0, y: -1 }], ["d", { x: 0, y: 1 }], ["l", { x: -1, y: 0 }], ["r", { x: 1, y: 0 }]]) {
  TK.$(id).addEventListener("click", () => { if (alive) { next = d; TK.sound.tap(); } });
}
addEventListener("keydown", (e) => {
  const map = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
  if (map[e.key] && alive) { next = map[e.key]; e.preventDefault(); }
});

// سحب على الساحة: الاتجاه من أكبر إزاحة
let sx = 0, sy = 0, swiping = false;
const arena = TK.$("arena");
arena.addEventListener("pointerdown", (e) => { swiping = true; sx = e.clientX; sy = e.clientY; });
arena.addEventListener("pointerup", (e) => {
  if (!swiping) return;
  swiping = false;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
  if (!alive) return;
  next = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
});
arena.addEventListener("pointercancel", () => { swiping = false; });

addEventListener("resize", fit);

// الحلقة تتوقف عند إخفاء الصفحة ولا تعود وحدها. لو عادت الفقاعة للظهور
// والجولة حيّة، نعرض استئنافاً صريحاً بدل لعبة متجمّدة بصمت.
let resume = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden || !alive || anim.running) return;
  TK.$("overTitle").textContent = T.title;
  TK.$("overText").textContent = T.hint;
  TK.$("go").textContent = T.start;
  over.hidden = false;
  resume = true;
});
// مرحلة الالتقاط ثم إيقاف الانتشار: وإلا شغّل مستمع «start» جولةً جديدة فوق
// الاستئناف وضاعت الجولة الحالية.
TK.$("go").addEventListener("click", (e) => {
  if (!resume) return;
  resume = false;
  over.hidden = true;
  anim.start();          // نفس الجولة تُستأنف، لا جولة جديدة
  e.stopImmediatePropagation();
}, { capture: true });

best = Number(TK.store.get("best", 0)) || 0;
reset(); fit();
`;
  return buildDocument({ lang: l, title: t.title, css: CSS, body, js, nonce });
}

export { buildSnakeHtml };
