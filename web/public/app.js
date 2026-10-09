// ═══════════════════════════════════════════════
// 🌐 Terboo Web — واجهة أحادية الصفحة (vanilla ESM) · i18n ar/en/es · RTL/LTR
// ───────────────────────────────────────────────
// لا أسرار هنا. الدور يأتي من الخادم (profile.role). تسجيل الدخول: رمز يُرسل للبوت على واتساب.
// ═══════════════════════════════════════════════

const I18N = {
  ar: { dir: "rtl", games: "الألعاب", playNow: "العب الآن", heroTitle: "بوت تيربو", heroSub: "مساعد ذكي، 23 لعبة تفاعلية، أدوات وسيرفرات — في واتساب وعلى الويب.", featAi: "ذكاء اصطناعي", featAiD: "دردشة بنفس عقل البوت وبلغتك", featGames: "أركيد حي", featGamesD: "ألعاب بتصميم حركي ونتيجة من الخادم", featTools: "أدوات", featToolsD: "تحميل، صور، ملفات ومهام", featVps: "سيرفرات", featVpsD: "إدارة VPS واللوحات بأمان", loginToPlay: "سجّل الدخول بواتساب لتلعب وتُحفظ نقاطك", gamesCount: "{n} لعبة", modeSolo: "فردي", modePvp: "ضد الذكاء", modeParty: "جماعي", explore: "استكشف الألعاب", starting: "جارٍ تجهيز اللعبة…", playFromBot: "تُلعب من داخل البوت", brand: "موقع بوت تيربو", login: "تسجيل الدخول", loginHelp: "اطلب رمزاً ثم أرسله للبوت على واتساب", getCode: "اطلب رمز الدخول", sendTo: "أرسل للبوت:", waiting: "في انتظار التأكيد من واتساب…", home: "الرئيسية", chat: "المساعد", tools: "الأدوات", tasks: "المهام", vps: "سيرفراتي", profile: "ملفي", owner: "لوحة المالك", logout: "خروج", send: "إرسال", usage: "نمط الاستخدام", language: "اللغة", save: "حفظ", role: "الدور", noTasks: "لا توجد مهام.", noVps: "لا سيرفرات مسندة لك.", health: "الصحة", groups: "المجموعات", audit: "سجل التدقيق", members: "الأعضاء", refresh: "تحديث", online: "متصل", offline: "غير متصل", uptime: "التشغيل", version: "الإصدار", askPlaceholder: "اكتب رسالتك…", loadingReply: "…", changeUsage: "تغيير نمط الاستخدام", general: "عام", panel: "لوحات", all: "الكل", status: "الحالة", required: "الصلاحية", category: "الفئة", expired: "منتهٍ" },
  en: { dir: "ltr", brand: "Bot Terboo Website", games: "Games", playNow: "Play now", heroTitle: "Bot Terboo", heroSub: "A smart assistant, 23 interactive games, tools and servers — on WhatsApp and the web.", featAi: "AI assistant", featAiD: "Chat with the same brain as the bot, in your language", featGames: "Live arcade", featGamesD: "Animated games with server-side results", featTools: "Tools", featToolsD: "Downloads, images, files and tasks", featVps: "Servers", featVpsD: "Manage VPS and panels safely", loginToPlay: "Sign in with WhatsApp to play and keep your points", gamesCount: "{n} games", modeSolo: "Solo", modePvp: "vs AI", modeParty: "Party", explore: "Explore games", starting: "Preparing your game…", playFromBot: "Played from inside the bot", login: "Sign in", loginHelp: "Request a code, then send it to the bot on WhatsApp", getCode: "Request login code", sendTo: "Send to the bot:", waiting: "Waiting for WhatsApp confirmation…", home: "Home", chat: "Assistant", tools: "Tools", tasks: "Tasks", vps: "My VPS", profile: "Profile", owner: "Owner", logout: "Sign out", send: "Send", usage: "Usage mode", language: "Language", save: "Save", role: "Role", noTasks: "No tasks.", noVps: "No VPS assigned to you.", health: "Health", groups: "Groups", audit: "Audit log", members: "Members", refresh: "Refresh", online: "online", offline: "offline", uptime: "uptime", version: "version", askPlaceholder: "Type your message…", loadingReply: "…", changeUsage: "Change usage mode", general: "General", panel: "Panel", all: "All", status: "Status", required: "Access", category: "Category", expired: "expired" },
  es: { dir: "ltr", brand: "Sitio de Bot Terboo", games: "Juegos", playNow: "Jugar", heroTitle: "Bot Terboo", heroSub: "Asistente inteligente, 23 juegos interactivos, herramientas y servidores — en WhatsApp y en la web.", featAi: "IA", featAiD: "Chatea con el mismo cerebro del bot, en tu idioma", featGames: "Arcade en vivo", featGamesD: "Juegos animados con resultados del servidor", featTools: "Herramientas", featToolsD: "Descargas, imágenes, archivos y tareas", featVps: "Servidores", featVpsD: "Gestiona VPS y paneles con seguridad", loginToPlay: "Entra con WhatsApp para jugar y guardar tus puntos", gamesCount: "{n} juegos", modeSolo: "Solo", modePvp: "vs IA", modeParty: "Grupal", explore: "Ver juegos", starting: "Preparando tu juego…", playFromBot: "Se juega dentro del bot", login: "Entrar", loginHelp: "Pide un código y envíalo al bot en WhatsApp", getCode: "Pedir código", sendTo: "Envía al bot:", waiting: "Esperando confirmación de WhatsApp…", home: "Inicio", chat: "Asistente", tools: "Herramientas", tasks: "Tareas", vps: "Mis VPS", profile: "Perfil", owner: "Dueño", logout: "Salir", send: "Enviar", usage: "Modo de uso", language: "Idioma", save: "Guardar", role: "Rol", noTasks: "Sin tareas.", noVps: "No tienes VPS asignados.", health: "Estado", groups: "Grupos", audit: "Auditoría", members: "Miembros", refresh: "Actualizar", online: "en línea", offline: "desconectado", uptime: "activo", version: "versión", askPlaceholder: "Escribe tu mensaje…", loadingReply: "…", changeUsage: "Cambiar modo de uso", general: "General", panel: "Panel", all: "Todo", status: "Estado", required: "Acceso", category: "Categoría", expired: "expirado" },
};

const state = { lang: localStorage.getItem("terboo_lang") || "ar", csrf: "", profile: null, tab: "home" };
const t = (k, v = {}) => String(I18N[state.lang][k] || I18N.en[k] || k).replace(/\{(\w+)\}/g, (_, n) => v[n] ?? "");
const el = (tag, props = {}, ...kids) => { const n = document.createElement(tag); for (const [k, val] of Object.entries(props)) { if (k === "class") n.className = val; else if (k === "html") n.innerHTML = val; else if (k.startsWith("on")) n.addEventListener(k.slice(2), val); else n.setAttribute(k, val); } for (const kid of kids.flat()) n.append(kid?.nodeType ? kid : document.createTextNode(String(kid ?? ""))); return n; };
const app = () => document.getElementById("app");

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json", "X-Terboo-Arcade": "1" };
  if (state.csrf && method !== "GET") headers["X-CSRF-Token"] = state.csrf;
  const res = await fetch(`/api/v1${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  const data = await res.json().catch(() => ({ ok: false, code: "bad-response" }));
  return { status: res.status, ...data };
}

function applyDir() { document.documentElement.lang = state.lang; document.documentElement.dir = I18N[state.lang].dir; }

// ── الصفحة العامة: واجهة + الألعاب + تسجيل الدخول ──
let catalogCache = null;
async function catalog() {
  if (catalogCache && catalogCache.lang === state.lang) return catalogCache.games;
  const res = await fetch(`/api/v1/arcade/catalog?lang=${state.lang}`, { credentials: "same-origin" }).then((r) => r.json()).catch(() => ({ ok: false }));
  catalogCache = { lang: state.lang, games: res.ok ? res.data.games : [] };
  return catalogCache.games;
}

const modeLabel = (g) => (g.mode === "solo" ? t("modeSolo") : g.mode === "party" ? t("modeParty") : t("modePvp"));

/** شبكة بطاقات الألعاب. onPlay=null ⇒ زر يقود لتسجيل الدخول */
function gamesGrid(games, onPlay) {
  return el("div", { class: "games" }, games.map((g, i) => el("article", { class: `game c${i % 6}`, style: `animation-delay:${Math.min(i, 18) * 40}ms` },
    el("div", { class: "g-icon" }, g.icon),
    el("div", { class: "g-body" }, el("b", {}, g.name), el("span", { class: "g-mode" }, modeLabel(g))),
    el("button", { class: "g-play", onclick: () => (onPlay ? onPlay(g) : document.getElementById("login-card")?.scrollIntoView({ behavior: "smooth", block: "center" })) }, `▶ ${t("playNow")}`),
  )));
}

async function startGame(g, btn) {
  if (btn) { btn.disabled = true; btn.textContent = t("starting"); }
  const res = await api("/arcade/new", { method: "POST", body: { gameId: g.id, lang: state.lang, name: state.profile?.name || "" } });
  if (res.ok && res.data.token) { location.href = `/play/${res.data.token}?lang=${state.lang}`; return; }
  if (btn) { btn.disabled = false; btn.textContent = res.code === "needs-opponent" ? t("playFromBot") : res.code || "error"; }
}

async function renderLogin() {
  applyDir();
  const games = await catalog();
  const hero = el("header", { class: "hero" },
    el("div", { class: "hero-glow" }),
    el("div", { class: "hero-logo" }, "✦"),
    el("h1", {}, t("heroTitle")),
    el("p", { class: "hero-sub" }, t("heroSub")),
    el("div", { class: "row hero-cta" },
      el("button", { onclick: () => document.getElementById("games")?.scrollIntoView({ behavior: "smooth" }) }, `🎮 ${t("explore")}`),
      el("button", { class: "ghost", onclick: () => document.getElementById("login-card")?.scrollIntoView({ behavior: "smooth", block: "center" }) }, t("login"))),
    el("div", { class: "hero-stats" }, el("span", {}, t("gamesCount", { n: games.length || 23 })), el("span", {}, "AR · EN · ES"), el("span", {}, "WhatsApp + Web")),
  );
  const features = el("section", { class: "features" }, [["🧠", "featAi"], ["🎮", "featGames"], ["🧰", "featTools"], ["🖥️", "featVps"]].map(([icon, key]) => el("div", { class: "feature" }, el("div", { class: "f-icon" }, icon), el("b", {}, t(key)), el("p", { class: "muted" }, t(`${key}D`)))));

  const box = el("div", { class: "card login", id: "login-card" });
  box.append(el("div", { class: "brand" }, "✦ ", el("span", {}, "Bot Terboo")));
  box.append(el("p", { class: "muted" }, t("loginToPlay")));
  const area = el("div");
  const btn = el("button", { onclick: async () => {
    btn.disabled = true;
    const res = await api("/auth/challenge", { method: "POST" });
    if (!res.ok) { area.replaceChildren(el("p", { class: "err-text" }, res.code || "error")); btn.disabled = false; return; }
    area.replaceChildren(
      el("p", {}, t("sendTo")),
      el("p", { class: "code" }, `${res.data.prefix}${res.data.command} ${res.data.code}`),
      el("p", { class: "muted" }, t("waiting")),
    );
    poll(res.data.challengeId);
  } }, t("getCode"));
  box.append(btn, area, langPicker());

  app().replaceChildren(el("div", { class: "landing" },
    hero,
    features,
    el("section", { id: "games" }, el("h2", { class: "section-title" }, `🎮 ${t("games")}`), gamesGrid(games, null)),
    el("div", { class: "center" }, box),
    el("footer", { class: "foot muted" }, "BOT TERBOO · V6"),
  ));
}
async function poll(id) {
  for (let i = 0; i < 100; i += 1) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await api("/auth/poll", { method: "POST", body: { challengeId: id } });
    if (res.status === 410) return renderLogin();
    if (res.ok && res.data.status === "authenticated") { state.csrf = res.data.csrf; state.profile = res.data.profile; state.lang = res.data.profile.language || state.lang; return renderApp(); }
  }
}
function langPicker() {
  const sel = el("select", { onchange: (e) => { state.lang = e.target.value; localStorage.setItem("terboo_lang", state.lang); route(); } });
  for (const code of ["ar", "en", "es"]) { const o = el("option", { value: code }, { ar: "العربية", en: "English", es: "Español" }[code]); if (code === state.lang) o.selected = true; sel.append(o); }
  return el("div", { class: "row", style: "justify-content:center;margin-top:12px" }, sel);
}

// ── التطبيق بعد الدخول ──
const TABS = ["home", "games", "chat", "tools", "tasks", "vps", "profile"];
function renderApp() {
  applyDir();
  const isOwner = state.profile?.role === "owner";
  const tabs = [...TABS, ...(isOwner ? ["owner"] : [])];
  const nav = el("nav", { class: "tabs" }, tabs.map((id) => el("button", { class: state.tab === id ? "active" : "", onclick: () => { state.tab = id; route(); } }, t(id))));
  const top = el("div", { class: "topbar" },
    el("div", { class: "brand" }, "✦ ", el("span", {}, "Bot Terboo")),
    el("div", { class: "row" }, el("span", { class: "pill" }, `${t("role")}: ${state.profile?.role || "user"}`), el("button", { class: "ghost", onclick: logout }, t("logout"))),
  );
  const body = el("div", { id: "tab-body" });
  app().replaceChildren(el("div", {}, top, nav, body));
  renderTab(body);
}
async function logout() { await api("/auth/logout", { method: "POST" }); state.csrf = ""; state.profile = null; renderLogin(); }

async function renderTab(body) {
  body.replaceChildren(el("p", { class: "muted" }, t("loadingReply")));
  try {
    if (state.tab === "home") return renderHome(body);
    if (state.tab === "games") return renderGames(body);
    if (state.tab === "chat") return renderChat(body);
    if (state.tab === "tools") return renderList(body, "/tools", "tools", (x) => `${x.description}`, (x) => `${t("category")}: ${x.category} · ${t("required")}: ${x.requiredAccess}`);
    if (state.tab === "tasks") return renderTasks(body);
    if (state.tab === "vps") return renderVps(body);
    if (state.tab === "profile") return renderProfile(body);
    if (state.tab === "owner") return renderOwner(body);
  } catch { body.replaceChildren(el("p", { class: "err-text" }, "error")); }
}
function route() { if (state.profile) renderApp(); else renderLogin(); }

function renderHome(body) {
  const p = state.profile || {};
  body.replaceChildren(el("div", { class: "card" },
    el("h3", {}, `${t("brand")}`),
    el("div", { class: "grid" },
      stat(t("role"), p.role || "user"),
      stat(t("language"), p.language || "ar"),
      stat(t("usage"), (p.usage || []).map((m) => t(m)).join(" · ") || "—"),
      stat(t("version"), p.version || "6.0"),
    ),
    el("p", { class: "muted" }, t("loginHelp")),
  ));
}
async function renderGames(body) {
  const games = await catalog();
  const grid = gamesGrid(games, (g) => startGame(g, grid.querySelector(`[data-g="${g.id}"]`)));
  grid.querySelectorAll(".game").forEach((card, i) => card.querySelector(".g-play").setAttribute("data-g", games[i].id));
  body.replaceChildren(el("div", {}, el("h2", { class: "section-title" }, `🎮 ${t("games")} · ${t("gamesCount", { n: games.length })}`), grid));
}

const stat = (label, value) => el("div", { class: "stat" }, el("b", {}, value?.nodeType ? value : String(value)), el("small", {}, label));

async function renderChat(body) {
  const log = el("div", { class: "chat" });
  const input = el("textarea", { rows: "2", placeholder: t("askPlaceholder") });
  const send = el("button", { onclick: async () => {
    const text = input.value.trim(); if (!text) return;
    log.append(el("div", { class: "msg user" }, text)); input.value = ""; log.scrollTop = log.scrollHeight;
    const pending = el("div", { class: "msg bot" }, t("loadingReply")); log.append(pending); log.scrollTop = log.scrollHeight;
    const res = await api("/ai/chat", { method: "POST", body: { text, lang: state.lang } });
    pending.textContent = res.ok ? res.data.reply : (res.code || "error");
    log.scrollTop = log.scrollHeight;
  } }, t("send"));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send.click(); });
  body.replaceChildren(el("div", { class: "card" }, log, el("div", { class: "row" }, input, send)));
}

async function renderList(body, path, key, title, sub) {
  const res = await api(path);
  const items = (res.ok && (res.data[key] || res.data.tasks || [])) || [];
  const list = el("div", { class: "list" }, items.length ? items.map((x) => el("div", {}, el("b", {}, title(x)), el("div", { class: "muted" }, sub(x)))) : el("p", { class: "muted" }, "—"));
  body.replaceChildren(el("div", { class: "card" }, list));
}

async function renderTasks(body) {
  const res = await api("/tasks");
  const tasks = (res.ok && res.data.tasks) || [];
  const list = el("div", { class: "list" }, tasks.length ? tasks.map((x) => el("div", { class: "row", style: "justify-content:space-between" },
    el("div", {}, el("b", {}, x.title || x.type), el("div", { class: "muted" }, `${x.status} · ${x.progress || 0}%`)),
    ["queued", "running", "waiting"].includes(x.status) ? el("button", { class: "ghost", onclick: async () => { await api(`/tasks/${x.id}/cancel`, { method: "POST" }); renderTab(body); } }, "✖") : el("span", { class: `pill ${x.status === "completed" ? "ok" : x.status === "failed" ? "err" : ""}` }, x.status),
  )) : el("p", { class: "muted" }, t("noTasks")));
  body.replaceChildren(el("div", { class: "card" }, list));
  subscribeStream((ev) => { if (ev.event) renderTab(body); });
}

async function renderVps(body) {
  const res = await api("/vps");
  const vps = (res.ok && res.data.vps) || [];
  body.replaceChildren(el("div", { class: "card" }, el("div", { class: "list" }, vps.length ? vps.map((v) => el("div", {}, el("b", {}, `VPS ${v.vpsId}`), el("div", { class: "muted" }, `${v.planId || "—"} · ${v.status} ${v.expiresAt ? "· " + v.expiresAt.slice(0, 10) : ""}`))) : el("p", { class: "muted" }, t("noVps")))));
}

async function renderProfile(body) {
  const p = state.profile;
  const usageSel = el("div", { class: "row" }, ["general", "panel", "vps", "all"].map((mode) => {
    const active = (p.usage || []).includes(mode) || (mode === "all" && (p.usage || []).length >= 3);
    return el("button", { class: active ? "" : "ghost", onclick: async () => { const res = await api("/usage", { method: "POST", body: { modes: mode === "all" ? ["all"] : [mode] } }); if (res.ok) { state.profile.usage = res.data; renderTab(body); } } }, t(mode));
  }));
  const langSel = el("select", { onchange: async (e) => { const res = await api("/profile/language", { method: "POST", body: { language: e.target.value } }); if (res.ok) { state.lang = e.target.value; state.profile.language = e.target.value; route(); } } });
  for (const code of ["ar", "en", "es"]) { const o = el("option", { value: code }, { ar: "العربية", en: "English", es: "Español" }[code]); if (code === p.language) o.selected = true; langSel.append(o); }
  body.replaceChildren(el("div", { class: "card" },
    el("h3", {}, p.name || p.canonical),
    el("div", { class: "grid" }, stat(t("role"), p.role), stat(t("level"), p.level || 1), stat("Koin", p.koin || 0)),
    el("p", {}, el("b", {}, t("changeUsage"))), usageSel,
    el("p", {}, el("b", {}, t("language"))), el("div", { class: "row" }, langSel),
  ));
}

async function renderOwner(body) {
  const res = await api("/owner/health");
  if (!res.ok) return body.replaceChildren(el("p", { class: "err-text" }, res.code || "error"));
  const h = res.data;
  const pill = el("span", { class: `pill ${h.bot.online ? "ok" : "err"}` }, h.bot.online ? t("online") : t("offline"));
  const grid = el("div", { class: "grid" },
    stat(t("status"), pill),
    stat(t("uptime"), `${Math.round(h.bot.uptimeSeconds / 60)}m`),
    stat("Tasks", h.tasks?.total ?? 0),
    stat("Capabilities", h.capabilities?.total ?? 0),
    stat("Providers", (h.providers?.configured || []).length),
    stat("RSS", `${h.memory?.rssMb || 0}MB`),
  );
  const groupsCard = el("div", { class: "card" },
    el("div", { class: "row", style: "justify-content:space-between" }, el("h3", {}, t("groups")), el("button", { class: "ghost", onclick: () => renderTab(body) }, t("refresh"))),
    el("div", { id: "owner-groups", class: "muted" }, t("loadingReply")),
  );
  body.replaceChildren(el("div", {}, el("div", { class: "card" }, el("h3", {}, t("health")), grid), groupsCard));
  const gRes = await api("/owner/groups");
  const gBox = document.getElementById("owner-groups");
  if (gBox) {
    const groups = Array.isArray(gRes.data) ? gRes.data : [];
    if (!gRes.ok) gBox.textContent = gRes.code || "bot-offline";
    else if (!groups.length) gBox.textContent = "—";
    else gBox.replaceChildren(el("div", { class: "list" }, groups.map((g) => el("div", {}, el("b", {}, g.subject || g.id), el("span", { class: "muted" }, ` · ${g.size} · admins ${g.admins}`)))));
  }
}

let evtSource = null;
function subscribeStream(onEvent) {
  if (evtSource) return;
  try {
    evtSource = new EventSource("/api/v1/stream", { withCredentials: true });
    evtSource.addEventListener("task", (e) => { try { onEvent(JSON.parse(e.data)); } catch (err) { console.debug("stream parse", err?.message); } });
    evtSource.addEventListener("error", () => { evtSource?.close(); evtSource = null; });
  } catch (err) { console.debug("SSE unsupported", err?.message); }
}

// ── الإقلاع ──
(async function boot() {
  applyDir();
  const session = await api("/auth/session");
  if (session.ok && session.data.authenticated) { state.csrf = session.data.csrf; state.profile = session.data.profile; state.lang = session.data.profile.language || state.lang; renderApp(); }
  else renderLogin();
})();
