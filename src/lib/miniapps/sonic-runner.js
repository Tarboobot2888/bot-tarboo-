// ═══════════════════════════════════════════════
// 🌀 TERBOO SPEED RUN — لعبة جري مستقلة (Canvas + لمس)
// ───────────────────────────────────────────────
// مبنية على نموذج سونك في الأرشيف المرجعي، مع إصلاحات §8:
//   • dt مقصوص في عُدّة الحلقة ⇒ النتيجة لا تقفز بعد توقف أو تبديل تطبيق.
//   • حلقة رسم واحدة تتوقف عند إخفاء الصفحة ولا تتضاعف عند إعادة التشغيل.
//   • أزرار اللمس تُفلت في كل حالات انتهاء الإيماءة (رفع · إلغاء · خروج · فقدان تركيز).
//   • أفضل نتيجة محلية **اختيارية**: التخزين قد يرمي في بعض البيئات فلا يُعتمد عليه،
//     وهي نتيجة محلية لا تدخل أي ترتيب رسمي ولا تمنح مكافأة.
//   • الشخصية مرسومة بالكود بالكامل — لا صورة ولا أصل لعبة تجارية.
// ═══════════════════════════════════════════════

import { buildDocument, esc, jsonLiteral, safeLang } from "./_kit.js";

const COPY = {
  ar: { title: "TERBOO SPEED RUN", tagline: "لعبة جري تفاعلية", score: "النقاط", rings: "الحلقات", best: "الأفضل",
        jump: "قفز ↑", boost: "انطلاق ⚡", hint: "اقفز فوق الصناديق، اجمع الحلقات، واضغط انطلاق للسرعة.",
        restart: "↻ إعادة", ready: "اضغط قفز للبدء", over: "انتهت الجولة", speed: "السرعة", sound: "الصوت", local: "النتيجة محلية على هذا الجهاز" },
  en: { title: "TERBOO SPEED RUN", tagline: "An endless runner", score: "SCORE", rings: "RINGS", best: "BEST",
        jump: "JUMP ↑", boost: "BOOST ⚡", hint: "Jump the crates, collect rings, hold Boost for speed.",
        restart: "↻ Restart", ready: "Tap JUMP to start", over: "Run over", speed: "SPEED", sound: "Sound", local: "Local score on this device only" },
  es: { title: "TERBOO SPEED RUN", tagline: "Un corredor infinito", score: "PUNTOS", rings: "ANILLOS", best: "RÉCORD",
        jump: "SALTAR ↑", boost: "IMPULSO ⚡", hint: "Salta las cajas, recoge anillos y manten Impulso para acelerar.",
        restart: "↻ Reiniciar", ready: "Pulsa SALTAR", over: "Fin de la carrera", speed: "VELOCIDAD", sound: "Sonido", local: "Puntuacion local en este dispositivo" },
};

const CSS = [
  ".arena{aspect-ratio:auto;height:min(46vh,290px)}",
  ".arena canvas{display:block;width:100%;height:100%;touch-action:none}",
  ".meterrow{display:flex;align-items:center;gap:9px;padding:10px 3px 2px;color:#b5c9ee;font-size:11px;font-weight:700}",
  ".meter{flex:1;height:8px;background:#101726;border:1px solid #536580;border-radius:99px;overflow:hidden}",
  ".fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#24ddbb,#ffe14c,#ff9b33);transition:width .08s linear}",
  "@media(max-width:390px){.arena{height:min(40vh,230px)}}",
].join("");

/**
 * @param {string} lang ar · en · es
 * @returns {string} مستند HTML مستقل بالكامل
 */
function buildSonicRunnerHtml(lang = "ar", { nonce = "" } = {}) {
  const l = safeLang(lang);
  const t = COPY[l];
  const body = `<main class="app">
<header class="head">
  <span class="logo" aria-hidden="true">🌀</span>
  <div class="brand"><div class="name">${esc(t.title)}</div><div class="tagline">${esc(t.tagline)}</div></div>
  <button id="mute" class="pill" type="button" aria-label="${esc(t.sound)}">🔊</button>
</header>
<div class="stats">
  <div class="stat"><div class="label">${esc(t.score)}</div><div class="value" id="score">0</div></div>
  <div class="stat"><div class="label">${esc(t.rings)}</div><div class="value" id="rings">0</div></div>
  <div class="stat"><div class="label">${esc(t.best)}</div><div class="value" id="best">0</div></div>
</div>
<section class="panel"><div class="panel-in arena">
  <canvas id="game" aria-label="${esc(t.title)}" role="img"></canvas>
  <div class="flash show" id="flash">${esc(t.ready)}</div>
</div></section>
<div class="meterrow"><span>${esc(t.speed)}</span><div class="meter"><div class="fill" id="speed" style="width:20%"></div></div></div>
<div class="row">
  <button id="jump" class="btn" type="button">${esc(t.jump)}</button>
  <button id="boost" class="btn alt" type="button">${esc(t.boost)}</button>
</div>
<div class="bottom">
  <p class="hint">${esc(t.hint)}<br><small>${esc(t.local)}</small></p>
  <button id="restart" class="btn ghost" type="button" style="min-height:42px;padding:0 12px">${esc(t.restart)}</button>
</div>
<p class="foot">BOT TERBOO · ARCADE</p>
</main>`;

  const js = `
const T = ${jsonLiteral(t)};
const cv = TK.$("game"), ctx = cv.getContext("2d");
const flash = TK.$("flash");
let W = 0, H = 0, dpr = 1;
function resize() {
  const r = cv.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // إعادة ضبط المقياس بعد كل تغيير حجم
}
addEventListener("resize", resize);

const GROUND = () => H - Math.max(26, H * 0.17);
const S = {};
function reset() {
  S.x = 48; S.y = 0; S.vy = 0; S.onGround = true; S.speed = 230; S.dist = 0;
  S.score = 0; S.rings = 0; S.obstacles = []; S.coins = []; S.spawn = 0; S.coinSpawn = 0;
  S.over = false; S.started = false; S.boost = false; S.t = 0;
}
reset();
let best = Number(TK.store.get("terboo_sonic_best", "0")) || 0;
TK.$("best").textContent = String(best);

function say(text, show) { flash.textContent = text; flash.className = show ? "flash show" : "flash"; }

function jump() {
  if (S.over) return restart();
  if (!S.started) { S.started = true; say("", false); game.start(); }
  if (S.onGround) { S.vy = -Math.min(520, 360 + S.speed * 0.28); S.onGround = false; TK.sound.tap(); TK.vibrate(10); }
}
function restart() { reset(); say("", false); TK.$("score").textContent = "0"; TK.$("rings").textContent = "0"; S.started = true; game.start(); }

function step(dt) {
  if (!S.started || S.over) return;
  S.t += dt;
  const target = S.boost ? 430 : 250;
  S.speed += (target - S.speed) * Math.min(1, dt * 1.8);
  S.dist += S.speed * dt;
  S.score = Math.floor(S.dist / 10) + S.rings * 10;
  TK.$("score").textContent = String(S.score);
  TK.$("speed").style.width = Math.round(Math.min(100, (S.speed / 460) * 100)) + "%";

  S.vy += 1500 * dt;                         // جاذبية بوحدات/ثانية² ⇒ مستقلة عن معدل الإطارات
  S.y += S.vy * dt;
  if (S.y > 0) { S.y = 0; S.vy = 0; S.onGround = true; }

  S.spawn -= dt;
  if (S.spawn <= 0) { S.spawn = 0.75 + Math.random() * 0.7; S.obstacles.push({ x: W + 30, w: 16 + Math.random() * 14, h: 20 + Math.random() * 22 }); }
  S.coinSpawn -= dt;
  if (S.coinSpawn <= 0) { S.coinSpawn = 0.5 + Math.random() * 0.8; S.coins.push({ x: W + 30, y: 30 + Math.random() * 60, got: false }); }

  for (const o of S.obstacles) o.x -= S.speed * dt;
  for (const c of S.coins) c.x -= S.speed * dt;
  S.obstacles = S.obstacles.filter((o) => o.x + o.w > -20);
  S.coins = S.coins.filter((c) => c.x > -20 && !c.got);

  const px = S.x, py = GROUND() + S.y, pr = 13;
  for (const c of S.coins) {
    if (!c.got && Math.hypot(px - c.x, py - (GROUND() - c.y)) < pr + 10) { c.got = true; S.rings += 1; TK.$("rings").textContent = String(S.rings); TK.sound.good(); }
  }
  for (const o of S.obstacles) {
    if (px + pr > o.x && px - pr < o.x + o.w && py + pr > GROUND() - o.h) { return end(); }
  }
}
function end() {
  S.over = true; game.stop(); TK.sound.lose(); TK.vibrate(40);
  if (S.score > best) { best = S.score; TK.$("best").textContent = String(best); TK.store.set("terboo_sonic_best", best); }
  say(T.over + " · " + S.score, true);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#131a3a"); g.addColorStop(1, "#070a16");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // تلال خلفية
  ctx.fillStyle = "#1b2550";
  for (let i = 0; i < 5; i += 1) {
    const hx = ((i * 180 - (S.dist * 0.2) % 180) + 900) % 900 - 90;
    ctx.beginPath(); ctx.arc(hx, GROUND() + 24, 70, Math.PI, 0); ctx.fill();
  }
  // الأرض
  ctx.fillStyle = "#223055"; ctx.fillRect(0, GROUND() + 14, W, H);
  ctx.strokeStyle = "#48c7ff55"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND() + 14); ctx.lineTo(W, GROUND() + 14); ctx.stroke();
  // حلقات
  for (const c of S.coins) {
    ctx.strokeStyle = "#ffc02e"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(c.x, GROUND() - c.y, 9, 0, Math.PI * 2); ctx.stroke();
  }
  // عوائق
  for (const o of S.obstacles) {
    ctx.fillStyle = "#8a5a2b"; ctx.fillRect(o.x, GROUND() + 14 - o.h, o.w, o.h);
    ctx.strokeStyle = "#c98b4b"; ctx.lineWidth = 2; ctx.strokeRect(o.x, GROUND() + 14 - o.h, o.w, o.h);
  }
  // العدّاء (مرسوم بالكود بالكامل)
  const py = GROUND() + S.y;
  const spin = S.t * (S.speed / 22);
  ctx.save(); ctx.translate(S.x, py);
  ctx.fillStyle = "#1fa7ff"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd9a8"; ctx.beginPath(); ctx.arc(5, -2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#0b63b8"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 8, 7, spin % (Math.PI * 2), (spin % (Math.PI * 2)) + Math.PI * 1.3); ctx.stroke();
  ctx.restore();
  if (S.boost && !TK.reduced()) {
    ctx.fillStyle = "#ffe14c55";
    for (let i = 1; i < 4; i += 1) { ctx.beginPath(); ctx.arc(S.x - i * 13, py, 11 - i * 2, 0, Math.PI * 2); ctx.fill(); }
  }
}

const game = TK.loop((dt) => { step(dt); draw(); });
resize(); draw();

TK.hold(TK.$("jump"), jump);
TK.hold(TK.$("boost"), () => { S.boost = true; }, () => { S.boost = false; });
TK.$("restart").addEventListener("click", restart);
TK.$("mute").addEventListener("click", (e) => { e.currentTarget.textContent = TK.sound.toggle() ? "🔇" : "🔊"; });
addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
  if (e.code === "ShiftLeft" || e.code === "ArrowRight") S.boost = true;
});
addEventListener("keyup", (e) => { if (e.code === "ShiftLeft" || e.code === "ArrowRight") S.boost = false; });
cv.addEventListener("pointerdown", (e) => { e.preventDefault(); jump(); });
TK.$("mute").textContent = TK.sound.muted ? "🔇" : "🔊";
say(T.ready, true);
`;
  return buildDocument({ lang: l, title: t.title, css: CSS, body, js, nonce });
}

export { COPY, buildSonicRunnerHtml };
