// ═══════════════════════════════════════════════
// 🎮 TERBOO MINI APPS — كتالوج الألعاب التفاعلية
// ───────────────────────────────────────────────
// • المصدر الوحيد: GET /api/v1/arcade/catalog — السجل الموحّد على الخادم.
//   لا قائمة مكتوبة يدوياً ⇒ لا تظهر لعبة بلا قواعد، ولا رقم يتعارض مع السجل.
// • بلا صور: كل بطاقة إيموجي + CSS. لا شبكة صور ولا معاينات.
// • كل نص من الخادم يُدرج كـtextContent (لا innerHTML) ⇒ لا حقن.
// • RTL/LTR كاملة، وبحث وفلاتر تعمل على الجهاز بلا طلب إضافي.
// ═══════════════════════════════════════════════

const qs = new URLSearchParams(location.search);
const pickLang = () => {
  const q = qs.get("lang");
  if (["ar", "en", "es"].includes(q)) return q;
  const nav = String(navigator.language || "ar").slice(0, 2);
  return ["ar", "en", "es"].includes(nav) ? nav : "ar";
};
const LANG = pickLang();

const I18N = {
  ar: { dir: "rtl", title: "الألعاب التفاعلية", eyebrow: "TERBOO MINI APPS", search: "ابحث عن لعبة…",
    all: "الكل", board: "ألواح", puzzle: "ألغاز", word: "كلمات", quiz: "أسئلة", arcade: "حركة", party: "جماعية", adventure: "مغامرة",
    fAI: "ضد الكمبيوتر", fSolo: "فردي", fParty: "مع الأصدقاء", fQuick: "سريعة (≤60ث)",
    count: "{n} لعبة", none: "لا توجد لعبة بهذه المواصفات", clear: "امسح الفلاتر",
    players: "اللاعبون", round: "مدة الجولة", mode: "النمط", cat: "الفئة", cmd: "الأمر في واتساب",
    sec: "{n} ثانية", close: "إغلاق", howTo: "كيف ألعب؟",
    note: "تُلعب كل لعبة داخل Mini App تفاعلية. أرسل أمر اللعبة للبوت على واتساب فيصلك رابط لعب شخصي — كل الحركات والنتائج تُحسب على الخادم.",
    modeSolo: "فردي", modePvp: "لاعبان", modeParty: "جماعي", modeCoop: "تعاوني",
    aiNote: "خصم آلي بمستويات", soloNote: "تعمل بلاعب واحد", partyNote: "تدعم المجموعات" },
  en: { dir: "ltr", title: "Interactive Games", eyebrow: "TERBOO MINI APPS", search: "Search a game…",
    all: "All", board: "Board", puzzle: "Puzzle", word: "Word", quiz: "Quiz", arcade: "Action", party: "Party", adventure: "Adventure",
    fAI: "vs Computer", fSolo: "Solo", fParty: "With friends", fQuick: "Quick (≤60s)",
    count: "{n} games", none: "No game matches these filters", clear: "Clear filters",
    players: "Players", round: "Round time", mode: "Mode", cat: "Category", cmd: "WhatsApp command",
    sec: "{n}s", close: "Close", howTo: "How do I play?",
    note: "Every game runs inside an interactive Mini App. Send the game command to the bot on WhatsApp and you get a personal play link — all moves and results are computed on the server.",
    modeSolo: "Solo", modePvp: "Two players", modeParty: "Party", modeCoop: "Co-op",
    aiNote: "AI opponent with levels", soloNote: "Playable alone", partyNote: "Group supported" },
  es: { dir: "ltr", title: "Juegos interactivos", eyebrow: "TERBOO MINI APPS", search: "Busca un juego…",
    all: "Todo", board: "Tablero", puzzle: "Puzles", word: "Palabras", quiz: "Preguntas", arcade: "Acción", party: "Grupal", adventure: "Aventura",
    fAI: "vs Computadora", fSolo: "Solo", fParty: "Con amigos", fQuick: "Rápida (≤60s)",
    count: "{n} juegos", none: "Ningún juego coincide", clear: "Limpiar filtros",
    players: "Jugadores", round: "Duración", mode: "Modo", cat: "Categoría", cmd: "Comando de WhatsApp",
    sec: "{n}s", close: "Cerrar", howTo: "¿Cómo juego?",
    note: "Cada juego corre dentro de una Mini App interactiva. Envía el comando al bot en WhatsApp y recibirás un enlace personal — los movimientos y resultados se calculan en el servidor.",
    modeSolo: "Solo", modePvp: "Dos jugadores", modeParty: "Grupal", modeCoop: "Cooperativo",
    aiNote: "Oponente con niveles", soloNote: "Se juega solo", partyNote: "Compatible con grupos" },
};
const T = I18N[LANG];
const tr = (k, v = {}) => String(T[k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => v[n] ?? "");

const CATEGORIES = ["board", "puzzle", "word", "quiz", "arcade", "party", "adventure"];
/** لون ثابت لكل لعبة — نفس اشتقاق play.js حتى تتطابق هوية البطاقة وصفحة اللعب */
const PALETTE = ["#7c5cff", "#22d3ee", "#ff4d6d", "#ffd23f", "#22c55e", "#a855f7", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];
function colorOf(id) {
  let h = 0;
  for (let i = 0; i < String(id).length; i += 1) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "style") n.style.cssText = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  // textContent فقط: لا innerHTML لأي نص قادم من الخادم
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return n;
}

let toastTimer = null;
function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.className = "toast show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = "toast"; }, 2200);
}

const S = { games: [], q: "", cat: "all", flags: new Set(), open: null };

async function load() {
  const res = await fetch(`/api/v1/arcade/catalog?lang=${LANG}`, { credentials: "same-origin", cache: "no-store" });
  const json = await res.json().catch(() => ({ ok: false }));
  if (!json.ok || !Array.isArray(json.data?.games)) throw new Error("catalog-unavailable");
  // الكتالوج يعرض ما في السجل فقط: لعبة بلا اسم أو معرّف لا تُعرض
  return json.data.games.filter((g) => g && typeof g.id === "string" && g.name);
}

function matches(g) {
  if (S.cat !== "all" && g.category !== S.cat) return false;
  if (S.flags.has("ai") && !g.supportsAI) return false;
  if (S.flags.has("solo") && !g.supportsSolo) return false;
  if (S.flags.has("party") && !(g.supportsGroup && (g.players?.max || 2) > 2)) return false;
  if (S.flags.has("quick") && !(g.roundSeconds <= 60)) return false;
  const q = S.q.trim().toLowerCase();
  if (!q) return true;
  return [g.name, g.description, g.command, g.id, ...(g.aliases || [])]
    .filter(Boolean).some((x) => String(x).toLowerCase().includes(q));
}

function card(g) {
  const color = colorOf(g.id);
  const tags = [];
  if (g.supportsAI) tags.push(el("span", { class: "tag ai" }, `🤖 ${tr("fAI")}`));
  if (g.supportsSolo) tags.push(el("span", { class: "tag solo" }, `👤 ${tr("fSolo")}`));
  if (g.supportsGroup && (g.players?.max || 2) > 2) tags.push(el("span", { class: "tag party" }, `👥 ${tr("fParty")}`));
  tags.push(el("span", { class: "tag" }, `⏱️ ${tr("sec", { n: g.roundSeconds })}`));
  const node = el("button", { class: "gcard", style: `--gc:${color}`, type: "button", "aria-label": g.name, onclick: () => openSheet(g) },
    el("div", { class: "gcard-top" },
      el("span", { class: "gcard-icon", "aria-hidden": "true" }, g.icon || "🎮"),
      el("span", {}, el("div", { class: "gcard-name" }, g.name), el("div", { class: "gcard-cmd" }, `.${g.command}`))),
    el("div", { class: "gcard-desc" }, g.description || ""),
    el("div", { class: "gcard-tags" }, tags));
  return node;
}

function openSheet(g) {
  const color = colorOf(g.id);
  const modeKey = { solo: "modeSolo", pvp: "modePvp", party: "modeParty", coop: "modeCoop" }[g.mode] || "modePvp";
  const row = (label, value) => el("div", { class: "sheet-row" }, el("span", {}, label), el("b", {}, value));
  const sheet = el("div", { class: "sheet", style: `--gc:${color}`, role: "dialog", "aria-modal": "true", "aria-label": g.name },
    el("div", { class: "sheet-card", onclick: (e) => e.stopPropagation() },
      el("div", { class: "sheet-head" },
        el("span", { class: "gcard-icon", style: `--gc:${color}`, "aria-hidden": "true" }, g.icon || "🎮"),
        el("div", {}, el("div", { class: "sheet-title" }, g.name), el("div", { class: "gcard-cmd" }, `.${g.command}`))),
      el("p", { class: "sheet-desc" }, g.description || ""),
      el("div", { class: "sheet-rows" },
        row(tr("cat"), tr(g.category)),
        row(tr("mode"), tr(modeKey)),
        row(tr("players"), `${g.players?.min ?? 1}–${g.players?.max ?? 2}`),
        row(tr("round"), tr("sec", { n: g.roundSeconds }))),
      el("code", { class: "sheet-cmd" }, `.${g.command}`),
      el("div", { class: "sheet-actions" },
        el("button", { class: "btn", type: "button", onclick: () => copyCmd(g) }, `📋 .${g.command}`),
        el("button", { class: "btn ghost", type: "button", onclick: close }, tr("close"))),
      el("div", { class: "cat-note" }, tr("note"))));
  sheet.addEventListener("click", close);
  function close() { sheet.remove(); document.removeEventListener("keydown", onKey); }
  function onKey(e) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onKey);
  document.body.append(sheet);
  sheet.querySelector(".btn")?.focus();
}

async function copyCmd(g) {
  const text = `.${g.command}`;
  try {
    await navigator.clipboard.writeText(text);
    toast(`📋 ${text}`);
  } catch {
    // بعض متصفحات أندرويد تمنع الحافظة بلا إيماءة موثوقة — نعرض النص ليُنسخ يدوياً
    toast(text);
  }
}

function chips() {
  const box = el("div", { class: "cat-chips", role: "group" });
  const catChip = (key) => el("button", {
    class: "chip", type: "button", "aria-pressed": String(S.cat === key),
    onclick: () => { S.cat = key; draw(); },
  }, tr(key === "all" ? "all" : key));
  box.append(catChip("all"));
  for (const c of CATEGORIES) if (S.games.some((g) => g.category === c)) box.append(catChip(c));
  for (const [flag, label] of [["ai", "fAI"], ["solo", "fSolo"], ["party", "fParty"], ["quick", "fQuick"]]) {
    box.append(el("button", {
      class: "chip", type: "button", "aria-pressed": String(S.flags.has(flag)),
      onclick: () => { if (S.flags.has(flag)) S.flags.delete(flag); else S.flags.add(flag); draw(); },
    }, label === "fAI" ? `🤖 ${tr(label)}` : label === "fSolo" ? `👤 ${tr(label)}` : label === "fParty" ? `👥 ${tr(label)}` : `⚡ ${tr(label)}`));
  }
  return box;
}

function draw() {
  const list = S.games.filter(matches);
  const search = el("div", { class: "cat-search" }, el("span", { "aria-hidden": "true" }, "🔎"),
    el("input", {
      type: "search", value: S.q, placeholder: tr("search"), "aria-label": tr("search"),
      autocomplete: "off", dir: "auto",
      oninput: (e) => { S.q = e.target.value; redrawGrid(); },
    }));
  const grid = list.length
    ? el("div", { class: "cat-grid", id: "grid" }, list.map(card))
    : el("div", { class: "cat-empty", id: "grid" }, tr("none"));
  document.getElementById("catalog").replaceChildren(
    el("header", { class: "cat-head" },
      el("span", { class: "cat-emblem", "aria-hidden": "true" }, "🎮"),
      el("div", { class: "cat-titles" },
        el("div", { class: "cat-eyebrow" }, tr("eyebrow")),
        el("h1", { class: "cat-title" }, tr("title"))),
      el("span", { class: "cat-count" }, tr("count", { n: list.length }))),
    el("div", { class: "cat-tools" }, search, chips()),
    grid,
    el("div", { class: "cat-note" }, tr("note")),
  );
}

/** تحديث الشبكة وحدها أثناء الكتابة — لا نعيد بناء حقل البحث فيفقد التركيز */
function redrawGrid() {
  const list = S.games.filter(matches);
  const old = document.getElementById("grid");
  const next = list.length
    ? el("div", { class: "cat-grid", id: "grid" }, list.map(card))
    : el("div", { class: "cat-empty", id: "grid" }, tr("none"));
  old?.replaceWith(next);
  const count = document.querySelector(".cat-count");
  if (count) count.textContent = tr("count", { n: list.length });
}

(async function boot() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = T.dir;
  document.title = `${tr("title")} · TERBOO`;
  try {
    S.games = await load();
    draw();
  } catch (error) {
    console.debug("catalog failed", error?.message);
    document.getElementById("catalog").replaceChildren(el("div", { class: "cat-empty" }, tr("none")));
  }
})();
