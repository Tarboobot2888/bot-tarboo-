// ═══════════════════════════════════════════════
// 🧰 TERBOO MINI APPS — عُدّة مشتركة لبنّائي الألعاب
// ───────────────────────────────────────────────
// كل لعبة مستقلة تبني مستندها من هنا: نفس الرموز البصرية ونفس دورة الحياة،
// بلا تكرار CSS أو JavaScript في كل لعبة.
//
// قيود بيئة التشغيل (مستخرجة من قياس فعلي — انظر TERBOO_NATIVE_MINIAPP_AUDIT.md):
//   • صفحة اللعبة تعمل بلا شبكة داخل WebView الرسالة ⇒ لا fetch ولا WebSocket.
//     لذلك لا يبني أي builder هنا لعبة تحتاج الخادم؛ تلك تمر بمسار /play/<token>.
//   • التخزين (localStorage…) قد يرمي SecurityError ⇒ يُغلَّف دائماً ولا يُعتمد عليه.
//   • حلقة الرسم يجب أن تتوقف خارج الشاشة وإلا استنزفت البطارية.
// البنّاء لا يرسل رسائل ولا يعرف sock أو m — هذه مسؤولية طبقة النقل.
// ═══════════════════════════════════════════════

const LANGS = Object.freeze(["ar", "en", "es"]);

/** لغة مدعومة أو العربية */
function safeLang(lang) {
  return LANGS.includes(String(lang)) ? String(lang) : "ar";
}

const dirOf = (lang) => (safeLang(lang) === "ar" ? "rtl" : "ltr");

/** هروب HTML — كل نص متغيّر يمر من هنا قبل الإدراج */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** قيمة JSON آمنة للإدراج داخل <script> (يمنع كسر الوسم) */
function jsonLiteral(value) {
  // فواصل الأسطر U+2028/U+2029 صالحة في JSON لكنها تكسر <script>؛ تُبنى الصيغة
  // بـRegExp من رموز هاربة حتى لا يحتوي هذا الملف المحرف الفعلي.
  const LINE_SEPARATORS = new RegExp("[\\u2028\\u2029]", "g");
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(LINE_SEPARATORS, (c) => "\\u" + c.charCodeAt(0).toString(16));
}

/** رموز التصميم المشتركة — هوية TERBOO ARCADE بلا موارد خارجية */
const BASE_CSS = [
  ":root{color-scheme:dark;--bg:#07060f;--ink:#f4f3ff;--muted:#a9badb;--line:rgba(255,255,255,.12);",
  "--acc:#7c5cff;--acc2:#22d3ee;--good:#22c55e;--bad:#f43f5e;--gold:#ffc02e;--radius:18px;",
  "--font:system-ui,-apple-system,'Segoe UI','Noto Sans Arabic',Tahoma,sans-serif}",
  "*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}",
  "html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:var(--font)}",
  "body{padding:10px;display:flex;justify-content:center;overflow-x:hidden;touch-action:manipulation}",
  "button{font:inherit;color:inherit}",
  ".app{width:min(100%,760px);margin:auto}",
  ".head{display:flex;align-items:center;gap:10px;padding:2px 2px 12px}",
  ".logo{flex:0 0 42px;width:42px;height:42px;display:grid;place-items:center;border-radius:14px;font-size:24px;",
  "background:linear-gradient(145deg,color-mix(in srgb,var(--acc) 70%,#120f26),#0d0b1c);",
  "box-shadow:0 6px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.26)}",
  ".brand{min-width:0;flex:1}",
  ".name{font-size:15px;font-weight:900;letter-spacing:.06em}",
  ".tagline{font-size:11px;color:var(--muted);margin-top:2px}",
  ".pill{font-size:10px;font-weight:800;letter-spacing:.08em;border:1px solid var(--line);border-radius:20px;padding:6px 9px;color:var(--muted)}",
  ".stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:10px}",
  ".stat{padding:8px 6px;text-align:center;border:1px solid var(--line);border-radius:12px;",
  "background:linear-gradient(145deg,#172333,#0b111c)}",
  ".label{font-size:10px;color:var(--muted);font-weight:800;letter-spacing:.05em}",
  ".value{font-size:22px;line-height:1.2;font-weight:900;color:#ffe078;font-variant-numeric:tabular-nums}",
  ".panel{border-radius:var(--radius);padding:3px;background:linear-gradient(145deg,var(--acc2),var(--acc));",
  "box-shadow:0 12px 28px rgba(0,0,0,.55)}",
  ".panel-in{border-radius:15px;background:#10121f;overflow:hidden;position:relative}",
  ".btn{min-height:56px;border:0;border-radius:16px;color:#fff;font-weight:900;font-size:clamp(14px,4vw,19px);",
  "background:linear-gradient(180deg,color-mix(in srgb,var(--acc) 80%,#fff 10%),var(--acc));",
  "box-shadow:inset 0 3px rgba(255,255,255,.35),inset 0 -4px rgba(0,0,0,.2),0 5px 0 #07101e;",
  "transition:transform .08s,filter .08s;touch-action:none;user-select:none;-webkit-user-select:none}",
  ".btn:active,.btn.pressed{transform:translateY(3px);filter:brightness(1.12);box-shadow:inset 0 2px rgba(255,255,255,.3),0 2px 0 #07101e}",
  ".btn:focus-visible{outline:3px solid var(--acc2);outline-offset:3px}",
  ".btn.alt{background:linear-gradient(180deg,#ffe777,#ffbe27 70%,#de8413);color:#382000;box-shadow:inset 0 3px rgba(255,255,255,.5),0 5px 0 #7a4a08}",
  ".btn.ghost{background:#172333;border:1px solid var(--line);box-shadow:0 4px 0 rgba(0,0,0,.25)}",
  ".row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}",
  ".bottom{display:flex;align-items:center;gap:8px;margin-top:12px}",
  ".hint{flex:1;font-size:11px;line-height:1.6;color:var(--muted)}",
  ".foot{text-align:center;margin-top:10px;color:#526987;font-size:9px;letter-spacing:.1em;font-weight:800}",
  ".sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}",
  ".flash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;",
  "font-weight:900;font-size:clamp(18px,5vw,30px);text-shadow:0 3px 18px #000;opacity:0;transition:opacity .12s}",
  ".flash.show{opacity:1}",
  "@media(max-width:390px){body{padding:7px}.btn{min-height:52px;border-radius:14px}.value{font-size:19px}.stats{gap:5px}}",
  "@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}",
].join("");

/**
 * دورة حياة مشتركة لكل لعبة: حلقة رسم تتوقف خارج الشاشة، وتخزين محلي اختياري،
 * وصوت مولَّد لا يبدأ قبل تفاعل، وتحرير أزرار اللمس في كل حالات انتهاء الإيماءة.
 * تُدرج داخل <script> في كل مستند — مصدر واحد، لا نسخة لكل لعبة.
 */
const KIT_JS = `
const TK = (() => {
  // ── تخزين اختياري: يرمي SecurityError في الأصل المعتم، فلا يُعتمد عليه أبداً ──
  const store = {
    // التخزين قد يرمي SecurityError في بيئات معيّنة؛ نسجّل السبب ولا نُخفيه
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (err) { console.debug("storage read blocked", k, err && err.message); return d; } },
    set(k, v) { try { localStorage.setItem(k, String(v)); return true; } catch (err) { console.debug("storage write blocked", k, err && err.message); return false; } },
  };
  // ── حلقة رسم واحدة فقط، وتتوقف عندما تختفي الصفحة ──
  function loop(step) {
    let raf = 0, last = 0, running = false;
    const frame = (now) => {
      if (!running) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0; // قصّ dt يمنع قفزة بعد توقف
      last = now;
      step(dt, now);
      raf = requestAnimationFrame(frame);
    };
    const api = {
      get running() { return running; },
      start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
      stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    };
    document.addEventListener("visibilitychange", () => { if (document.hidden) api.stop(); });
    addEventListener("pagehide", () => api.stop());
    return api;
  }
  // ── زر لمس: يُمسك ويُفلت في كل الحالات (رفع · إلغاء · فقدان الالتقاط · إخفاء) ──
  function hold(el, onDown, onUp) {
    let active = false;
    const down = (e) => { if (active) return; active = true; el.classList.add("pressed"); e.preventDefault(); onDown?.(); };
    const up = () => { if (!active) return; active = false; el.classList.remove("pressed"); onUp?.(); };
    el.addEventListener("pointerdown", down);
    for (const ev of ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"]) el.addEventListener(ev, up);
    addEventListener("blur", up);
    document.addEventListener("visibilitychange", () => { if (document.hidden) up(); });
    // لوحة المفاتيح: الزر عنصر <button> فعلي فيصله Enter/Space تلقائياً
    el.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); down(e); } });
    el.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") up(); });
    return { release: up };
  }
  // ── صوت مولَّد: لا AudioContext قبل أول تفاعل، ولا توقف للعب إن لم يُدعم ──
  let ac = null, muted = store.get("tk_muted", "0") === "1";
  function tone(freq, dur = 0.09, type = "sine", vol = 0.05, delay = 0, slide = 0) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      const t0 = ac.currentTime + delay, osc = ac.createOscillator(), g = ac.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ac.destination); osc.start(t0); osc.stop(t0 + dur + 0.02);
    } catch (err) { console.debug("audio unavailable", err && err.message); }
  }
  const sound = {
    get muted() { return muted; },
    toggle() { muted = !muted; store.set("tk_muted", muted ? "1" : "0"); return muted; },
    tap: () => tone(620, 0.05, "square", 0.025),
    good: () => { tone(660, 0.08, "triangle", 0.05); tone(990, 0.09, "sine", 0.035, 0.05); },
    bad: () => tone(150, 0.17, "sawtooth", 0.045, 0, -40),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "triangle", 0.055, i * 0.1)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.26, "sawtooth", 0.04, i * 0.15)),
  };
  const vibrate = (ms = 12) => { try { navigator.vibrate?.(ms); } catch (err) { console.debug("vibrate unsupported", err && err.message); } };
  const $ = (id) => document.getElementById(id);
  const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (err) { console.debug("matchMedia unavailable", err && err.message); return false; } };
  return { store, loop, hold, sound, tone, vibrate, $, reduced };
})();
`;

/**
 * مستند HTML كامل من أجزاء اللعبة.
 * @param {{lang:string, title:string, css?:string, body:string, js:string, nonce?:string}} spec
 */
function document_({ lang, title, css = "", body, js, nonce = "" }) {
  const l = safeLang(lang);
  // CSP صارمة على الخادم (script-src 'nonce-…') ⇒ الوسم يحمل نفس الرمز.
  // بلا nonce يبقى المستند صالحاً للاختبار المحلي وفتحه كملف.
  const nonceAttr = nonce ? ` nonce="${esc(nonce)}"` : "";
  return `<!doctype html>
<html lang="${l}" dir="${dirOf(l)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>${BASE_CSS}${css}</style>
</head>
<body>
${body}
<script${nonceAttr}>${KIT_JS}${js}</script>
</body>
</html>`;
}

export { BASE_CSS, KIT_JS, LANGS, dirOf, document_ as buildDocument, esc, jsonLiteral, safeLang };
