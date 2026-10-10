// ═══════════════════════════════════════════════
// 🧠 TERBOO MEMORY — Mini App مستقلة
// ───────────────────────────────────────────────
// 16 بطاقة · 8 أزواج رموز · قلب بطاقتين ثم مطابقة أو إعادة قلب.
// عدّاد حركات ومؤقّت وأفضل جولة. القلب بـtransform (CSS) لا بصور.
// الأزواج تُخلط عشوائياً في المتصفح، ولا توجد إجابة تُرسل من الخادم أصلاً.
// ═══════════════════════════════════════════════

import { buildDocument, esc, jsonLiteral, safeLang } from "./_kit.js";

const COPY = {
  ar: { title: "TERBOO MEMORY", tagline: "طابق الأزواج", moves: "الحركات", time: "الوقت", best: "أفضل جولة",
        again: "↻ جولة جديدة", won: "أكملتها!", hint: "اقلب بطاقتين متشابهتين", session: "النتيجة لهذه الجلسة فقط",
        pairs: "الأزواج", card: "بطاقة" },
  en: { title: "TERBOO MEMORY", tagline: "Match the pairs", moves: "Moves", time: "Time", best: "Best run",
        again: "↻ New run", won: "Cleared!", hint: "Flip two matching cards", session: "Score lasts this session only",
        pairs: "Pairs", card: "Card" },
  es: { title: "TERBOO MEMORY", tagline: "Empareja las cartas", moves: "Jugadas", time: "Tiempo", best: "Mejor ronda",
        again: "↻ Nueva ronda", won: "Completado!", hint: "Voltea dos cartas iguales", session: "El puntaje dura solo esta sesion",
        pairs: "Pares", card: "Carta" },
};

/** رموز الأزواج: محارف نصية، لا صور ولا موارد خارجية */
const FACES = ["🍎", "🚀", "🎲", "🐬", "🎧", "⚡", "🌙", "🍀"];

const CSS = [
  ".grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}",
  ".card{display:block;position:relative;border:0;padding:0;background:none;min-height:0}",
  // span سطري بطبيعته، و padding المئوي لا يُنشئ ارتفاعاً على صندوق سطري
  ".card .fit{display:block;position:relative;width:100%;padding-top:100%}",
  ".card .face{position:absolute;inset:0;display:grid;place-items:center;border-radius:14px;font-size:clamp(22px,8vw,34px);",
  "transition:transform .26s,opacity .2s;backface-visibility:hidden}",
  ".card .back{background:linear-gradient(145deg,#2b3f5c,#16233a);border:1px solid var(--line);color:#7f9ec9;font-size:18px}",
  ".card .front{background:linear-gradient(145deg,#1f6f4a,#14532d);transform:rotateY(180deg)}",
  ".card.up .back{transform:rotateY(180deg)}",
  ".card.up .front{transform:rotateY(0)}",
  ".card.done .front{background:linear-gradient(145deg,#3b2f6f,#241c4a);opacity:.55}",
  ".card:disabled{cursor:default}",
  ".reduced .face{transition:none}",
  ".won{margin-top:12px;text-align:center;font-weight:900;color:#7cf2a8}",
  ".won[hidden]{display:none}",
].join("");

/**
 * @param {string} lang ar · en · es
 * @param {{nonce?:string}} [options]
 */
function buildMemoryHtml(lang = "ar", { nonce = "" } = {}) {
  const l = safeLang(lang);
  const t = COPY[l];
  const cards = Array.from({ length: 16 }, (_, i) => `<button class="card" type="button" data-i="${i}" aria-label="${esc(t.card)} ${i + 1}">`
    + `<span class="fit"><span class="face back">?</span><span class="face front"></span></span></button>`).join("");

  const body = `<div class="app">
<header class="head">
  <div class="logo">🧠</div>
  <div class="brand"><div class="name">${esc(t.title)}</div><div class="tagline">${esc(t.tagline)}</div></div>
  <div class="pill">${esc(t.pairs)} <b id="pairs">0/8</b></div>
</header>
<section class="stats">
  <div class="stat"><div class="label">${esc(t.moves)}</div><div class="value" id="moves">0</div></div>
  <div class="stat"><div class="label">${esc(t.time)}</div><div class="value" id="time">0</div></div>
  <div class="stat"><div class="label">${esc(t.best)}</div><div class="value" id="best">—</div></div>
</section>
<section class="panel"><div class="panel-in" style="padding:10px">
  <div class="grid" id="grid">${cards}</div>
  <div class="won" id="won" hidden>${esc(t.won)}</div>
</div></section>
<div class="row"><button class="btn alt" id="again" type="button">${esc(t.again)}</button></div>
<div class="bottom"><span class="tagline">${esc(t.session)}</span></div>
</div>`;

  const js = `
const T = ${jsonLiteral(t)};
const FACES = ${jsonLiteral(FACES)};
const els = [...document.querySelectorAll(".card")];
let deck, open, matched, moves, seconds, busy, best = null, timer = 0;

if (TK.reduced()) document.body.classList.add("reduced");

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function busyDone() { return matched.length === 16; }

// المؤقّت على نبضة ثانية واحدة، ويتوقف مع إخفاء الصفحة عبر حارس TK نفسه.
// يُعرَّف **قبل** reset لأن reset يستدعي clock.start(): الترتيب المعاكس كان
// يعمل بالحظ (الاستدعاء الأول يأتي بعد التعريف) ويكسر أول استدعاء يُضاف فوقه.
const clock = (() => {
  let acc = 0;
  return TK.loop((dt) => {
    if (busyDone()) return;
    acc += dt;
    if (acc >= 1) { acc = 0; seconds += 1; paint(); }
  });
})();

function paint() {
  TK.$("moves").textContent = moves;
  TK.$("time").textContent = seconds;
  TK.$("pairs").textContent = matched.length / 2 + "/8";
  TK.$("best").textContent = best === null ? "—" : best;
}

function reset() {
  deck = shuffle(FACES.concat(FACES).slice());
  open = []; matched = []; moves = 0; seconds = 0; busy = false;
  TK.$("won").hidden = true;
  els.forEach((el, i) => {
    el.classList.remove("up", "done");
    el.disabled = false;
    el.querySelector(".front").textContent = deck[i];
  });
  paint();
  clock.start();
}

function flip(i) {
  if (busy || busyDone()) return;
  const el = els[i];
  if (el.classList.contains("up") || el.classList.contains("done")) return;
  el.classList.add("up");
  open.push(i);
  TK.sound.tap();
  if (open.length < 2) return;
  moves += 1;
  paint();
  const [a, b] = open;
  if (deck[a] === deck[b]) {
    open = [];
    matched.push(a, b);
    for (const k of [a, b]) { els[k].classList.add("done"); els[k].disabled = true; }
    TK.sound.good();
    paint();
    if (busyDone()) {
      clock.stop();
      TK.$("won").hidden = false;
      if (best === null || moves < best) { best = moves; TK.store.set("best", best); }
      paint();
      TK.sound.win();
    }
    return;
  }
  // غير متطابقتين: تُقلبان بعد مهلة قصيرة، والنقر محجوب خلالها
  busy = true;
  TK.sound.bad();
  setTimeout(() => {
    for (const k of open) els[k].classList.remove("up");
    open = [];
    busy = false;
  }, TK.reduced() ? 320 : 640);
}

// مستمع واحد مفوَّض: لا مستمع لكل بطاقة ولا تكرار بعد الإعادة
TK.$("grid").addEventListener("click", (e) => {
  const btn = e.target.closest(".card");
  if (btn) flip(Number(btn.dataset.i));
});
TK.$("again").addEventListener("click", () => { TK.sound.tap(); reset(); });

// TK.loop يوقف المؤقّت عند إخفاء الفقاعة ولا يعيده وحده. بلا هذا يتجمّد
// الوقت بصمت بعد العودة والجولة ما زالت جارية.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !busyDone()) clock.start();
});

best = TK.store.get("best", null);
best = best === null ? null : Number(best);
reset();
`;
  return buildDocument({ lang: l, title: t.title, css: CSS, body, js, nonce });
}

export { buildMemoryHtml };
