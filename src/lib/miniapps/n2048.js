// ═══════════════════════════════════════════════
// 🔢 TERBOO 2048 — Mini App مستقلة
// ───────────────────────────────────────────────
// شبكة 4×4 · سحب أو أسهم · دمج متساويين مرة واحدة لكل حركة.
// منطق الدمج على صفوف مجرّدة (slide) ثم يُعاد تدويرها للاتجاهات الأربعة،
// فالقاعدة واحدة ولا تتكرر أربع مرات بأخطاء مختلفة.
// لا شبكة ولا تخزين: اللوحة والنتيجة في الذاكرة لعمر الفقاعة.
// ═══════════════════════════════════════════════

import { buildDocument, esc, jsonLiteral, safeLang } from "./_kit.js";

const COPY = {
  ar: { title: "TERBOO 2048", tagline: "ادمج الأرقام", score: "النقاط", best: "أفضل جولة", max: "أعلى بلاطة",
        again: "↻ جولة جديدة", over: "لا حركة متاحة", win: "وصلت 2048!", hint: "اسحب لدمج البلاطات",
        session: "النتيجة لهذه الجلسة فقط", keep: "واصل" },
  en: { title: "TERBOO 2048", tagline: "Merge the numbers", score: "Score", best: "Best run", max: "Top tile",
        again: "↻ New run", over: "No moves left", win: "You reached 2048!", hint: "Swipe to merge tiles",
        session: "Score lasts this session only", keep: "Keep going" },
  es: { title: "TERBOO 2048", tagline: "Combina los numeros", score: "Puntos", best: "Mejor ronda", max: "Mayor ficha",
        again: "↻ Nueva ronda", over: "Sin movimientos", win: "Llegaste a 2048!", hint: "Desliza para combinar",
        session: "El puntaje dura solo esta sesion", keep: "Seguir" },
};

const CSS = [
  ".fit{position:relative;width:100%;padding-top:100%;touch-action:none}",
  ".grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:8px;padding:8px}",
  ".tile{display:grid;place-items:center;border-radius:12px;background:rgba(255,255,255,.05);font-weight:900;",
  "font-size:clamp(16px,6vw,28px);font-variant-numeric:tabular-nums;transition:transform .12s}",
  ".tile.on{box-shadow:inset 0 2px rgba(255,255,255,.2)}",
  ".tile.pop{transform:scale(1.12)}",
  ".reduced .tile{transition:none}",
  '.tile[data-v="2"]{background:#2a3c57;color:#cfe2ff}',
  '.tile[data-v="4"]{background:#30456a;color:#dbe9ff}',
  '.tile[data-v="8"]{background:#3a5aa8;color:#fff}',
  '.tile[data-v="16"]{background:#4668c8;color:#fff}',
  '.tile[data-v="32"]{background:#5a54d6;color:#fff}',
  '.tile[data-v="64"]{background:#7c43d1;color:#fff}',
  '.tile[data-v="128"]{background:#a3399f;color:#fff}',
  '.tile[data-v="256"]{background:#c23b6d;color:#fff}',
  '.tile[data-v="512"]{background:#d8542f;color:#fff}',
  '.tile[data-v="1024"]{background:#e08a12;color:#241a05}',
  '.tile[data-v="2048"]{background:#ffd24a;color:#241a05;box-shadow:0 0 26px #ffd24a66}',
  ".over{margin-top:12px;text-align:center;font-weight:900}",
  ".over[hidden]{display:none}",
].join("");

/**
 * @param {string} lang ar · en · es
 * @param {{nonce?:string}} [options]
 */
function build2048Html(lang = "ar", { nonce = "" } = {}) {
  const l = safeLang(lang);
  const t = COPY[l];
  const tiles = Array.from({ length: 16 }, (_, i) => `<div class="tile" id="c${i}" data-v="0"></div>`).join("");

  const body = `<div class="app">
<header class="head">
  <div class="logo">🔢</div>
  <div class="brand"><div class="name">${esc(t.title)}</div><div class="tagline">${esc(t.tagline)}</div></div>
  <div class="pill">${esc(t.max)} <b id="max">0</b></div>
</header>
<section class="stats">
  <div class="stat"><div class="label">${esc(t.score)}</div><div class="value" id="score">0</div></div>
  <div class="stat"><div class="label">${esc(t.best)}</div><div class="value" id="best">0</div></div>
  <div class="stat"><div class="label">${esc(t.max)}</div><div class="value" id="max2">0</div></div>
</section>
<section class="panel"><div class="panel-in">
  <div class="fit" id="arena"><div class="grid">${tiles}</div></div>
</div></section>
<div class="over" id="over" hidden></div>
<div class="row"><button class="btn alt" id="again" type="button">${esc(t.again)}</button></div>
<div class="bottom"><span class="tagline">${esc(t.session)}</span></div>
</div>`;

  const js = `
const T = ${jsonLiteral(t)};
const cells = Array.from({ length: 16 }, (_, i) => TK.$("c" + i));
let board, score, best = 0, done, reached;

if (TK.reduced()) document.body.classList.add("reduced");

const at = (r, c) => board[r * 4 + c];
const put = (r, c, v) => { board[r * 4 + c] = v; };

/** يضغط صفاً نحو البداية ويدمج كل زوج مرة واحدة. يعيد الصف ونقاط الدمج. */
function slide(row) {
  const kept = row.filter((v) => v !== 0);
  const out = [];
  let gained = 0;
  for (let i = 0; i < kept.length; i += 1) {
    if (kept[i] === kept[i + 1]) {       // دمج مرة واحدة ثم تخطّي التالي
      const merged = kept[i] * 2;
      out.push(merged);
      gained += merged;
      i += 1;
    } else out.push(kept[i]);
  }
  while (out.length < 4) out.push(0);
  return { row: out, gained };
}

/** يقرأ الصفوف الأربعة باتجاه الحركة، فقاعدة الدمج واحدة لكل الاتجاهات */
function linesFor(dir) {
  const lines = [];
  for (let i = 0; i < 4; i += 1) {
    const line = [];
    for (let j = 0; j < 4; j += 1) {
      if (dir === "left") line.push(at(i, j));
      else if (dir === "right") line.push(at(i, 3 - j));
      else if (dir === "up") line.push(at(j, i));
      else line.push(at(3 - j, i));
    }
    lines.push(line);
  }
  return lines;
}
function writeLine(dir, i, line) {
  for (let j = 0; j < 4; j += 1) {
    if (dir === "left") put(i, j, line[j]);
    else if (dir === "right") put(i, 3 - j, line[j]);
    else if (dir === "up") put(j, i, line[j]);
    else put(3 - j, i, line[j]);
  }
}

function spawn() {
  const free = [];
  board.forEach((v, i) => { if (v === 0) free.push(i); });
  if (!free.length) return false;
  board[free[Math.floor(Math.random() * free.length)]] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function canMove() {
  if (board.includes(0)) return true;
  for (const dir of ["left", "right", "up", "down"]) {
    for (const line of linesFor(dir)) {
      if (slide(line).row.join() !== line.join()) return true;
    }
  }
  return false;
}

function paint(popped) {
  const max = Math.max(...board);
  board.forEach((v, i) => {
    const el = cells[i];
    el.dataset.v = String(v);
    el.textContent = v ? v : "";
    el.classList.toggle("on", v !== 0);
    if (popped && popped.has(i)) {
      el.classList.add("pop");
      setTimeout(() => el.classList.remove("pop"), 130);
    }
  });
  TK.$("score").textContent = score;
  TK.$("best").textContent = best;
  TK.$("max").textContent = max;
  TK.$("max2").textContent = max;
}

function finish(text) {
  done = true;
  const el = TK.$("over");
  el.textContent = text;
  el.hidden = false;
}

function move(dir) {
  if (done) return;
  let changed = false, gained = 0;
  // تُقرأ الصفوف كلها **قبل** أي كتابة: كل صف مستقل اليوم، لكن القراءة داخل
  // حلقة الكتابة تجعل الصحة تعتمد على هذا الاستقلال بلا تصريح.
  const lines = linesFor(dir);
  for (let i = 0; i < 4; i += 1) {
    const line = lines[i];
    const res = slide(line);
    if (res.row.join() !== line.join()) changed = true;
    gained += res.gained;
    writeLine(dir, i, res.row);
  }
  if (!changed) return;
  score += gained;
  if (score > best) { best = score; TK.store.set("best", best); }
  const before = new Set();
  board.forEach((v, i) => { if (v === 0) before.add(i); });
  spawn();
  const popped = new Set();
  board.forEach((v, i) => { if (v !== 0 && before.has(i)) popped.add(i); });
  paint(popped);
  if (gained) { TK.sound.good(); TK.vibrate(8); } else TK.sound.tap();
  if (!reached && board.includes(2048)) { reached = true; finish(T.win); TK.sound.win(); return; }
  if (!canMove()) { finish(T.over); TK.sound.lose(); }
}

function reset() {
  board = new Array(16).fill(0);
  score = 0; done = false; reached = false;
  TK.$("over").hidden = true;
  spawn(); spawn();
  paint();
}

addEventListener("keydown", (e) => {
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
  if (map[e.key]) { move(map[e.key]); e.preventDefault(); }
});

let sx = 0, sy = 0, swiping = false;
const arena = TK.$("arena");
arena.addEventListener("pointerdown", (e) => { swiping = true; sx = e.clientX; sy = e.clientY; });
arena.addEventListener("pointerup", (e) => {
  if (!swiping) return;
  swiping = false;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
});
arena.addEventListener("pointercancel", () => { swiping = false; });
TK.$("again").addEventListener("click", () => { TK.sound.tap(); reset(); });

best = Number(TK.store.get("best", 0)) || 0;
reset();
`;
  return buildDocument({ lang: l, title: t.title, css: CSS, body, js, nonce });
}

export { build2048Html };
