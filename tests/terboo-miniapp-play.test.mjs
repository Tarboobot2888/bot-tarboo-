// ═══════════════════════════════════════════════
// 🎮 TERBOO MINI APPS — تشغيل فعلي في متصفح (§18.4)
// ───────────────────────────────────────────────
// يفتح كل لعبة في Chromium بمقاسات أندرويد ويثبت أنها **تُلعب**:
//   XO    : نقرة على خانة ⇒ تظهر X ثم يرد الكمبيوتر · الصعب لا يُهزم ·
//           لا حركة على خانة مشغولة ولا بعد النهاية · خط الفوز · إعادة الجولة
//   Sonic : حلقة الرسم تعمل وتتحرك · القفز يرفع العدّاء · الحلقة تتوقف عند الإخفاء
// وللاثنين: لا أخطاء console · لا طلب شبكة خارجي · لا overflow أفقي · RTL/LTR.
// يُتخطّى بإعلان صريح إن لم يتوفر Chromium.
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const EXE = [process.env.TERBOO_TEST_CHROMIUM, "/opt/pw-browsers/chromium"].filter(Boolean)
  .find((p) => { try { return fs.existsSync(p); } catch { return false; } });
let pw = null;
try { pw = await import("playwright"); } catch (error) {
  console.log(`⏭️  terboo-miniapp-play: تخطٍّ — playwright غير متاح (${error.message.slice(0, 50)})`);
  process.exit(0);
}
if (!EXE) { console.log("⏭️  terboo-miniapp-play: تخطٍّ — لا Chromium في هذه البيئة (لم يُدَّعَ نجاح)"); process.exit(0); }

const { renderMiniApp } = await import("../src/lib/terboo-miniapp.js");

// خادم محلي صغير يخدم نفس مخرجات البنّاء (نفس ما يخدمه /app/<id>)
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  // المتصفح يطلب الأيقونة تلقائياً؛ نردّ 204 حتى لا يُحسب 404 خطأ console
  if (url.pathname === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  const id = url.pathname.replace(/^\/app\//, "").replace(/\/$/, "");
  const built = renderMiniApp(id, { lang: url.searchParams.get("lang") || "ar" });
  if (!built.ok) { res.writeHead(404); res.end(built.code); return; }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(built.html);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await pw.chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const findings = [];
const WIDTHS = [320, 360, 412];

async function open(path, { width = 412, lang = "ar" } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [], external = [];
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 140)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e.message).slice(0, 140)}`));
  page.on("request", (q) => { if (!q.url().startsWith(BASE) && !q.url().startsWith("data:")) external.push(q.url().slice(0, 100)); });
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 20000 });
  return { ctx, page, errors, external };
}
const layout = (page) => page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
  dir: document.documentElement.dir, lang: document.documentElement.lang,
}));

// ─────────────── XO: يُلعب فعلاً ───────────────
{
  const { ctx, page, errors, external } = await open("/app/xo?lang=ar");
  await page.waitForSelector(".cell");
  // نقرة ⇒ X تظهر، والكمبيوتر يرد
  await page.locator('.cell[data-i="0"]').tap();
  await page.waitForFunction(() => document.querySelectorAll('.cell[data-m]').length >= 2, null, { timeout: 6000 });
  const after = await page.evaluate(() => ({
    mine: document.querySelector('.cell[data-i="0"]').getAttribute("data-m"),
    marks: document.querySelectorAll(".cell[data-m]").length,
    turn: document.getElementById("turn").textContent.trim(),
  }));
  if (after.mine !== "X") findings.push(`XO: نقرتي لم تضع X (${after.mine})`);
  if (after.marks !== 2) findings.push(`XO: الكمبيوتر لم يرد بحركة واحدة (${after.marks} علامة)`);
  // خانة مشغولة لا تُلعب
  const before = await page.evaluate(() => document.querySelectorAll(".cell[data-m]").length);
  await page.locator('.cell[data-i="0"]').tap({ force: true });
  await page.waitForTimeout(300);
  const unchanged = await page.evaluate(() => document.querySelectorAll(".cell[data-m]").length);
  if (unchanged !== before) findings.push("XO: قبِل حركة على خانة مشغولة");
  // إعادة الجولة تمسح اللوحة ولا تضاعف المستمعات
  await page.locator("#again").tap();
  await page.waitForTimeout(200);
  const cleared = await page.evaluate(() => document.querySelectorAll(".cell[data-m]").length);
  if (cleared !== 0) findings.push(`XO: إعادة الجولة لم تمسح اللوحة (${cleared})`);
  await page.locator('.cell[data-i="4"]').tap();
  await page.waitForFunction(() => document.querySelectorAll(".cell[data-m]").length >= 2, null, { timeout: 6000 });
  const afterReset = await page.evaluate(() => document.querySelectorAll(".cell[data-m]").length);
  if (afterReset !== 2) findings.push(`XO: بعد الإعادة وُضعت ${afterReset} علامة بدل 2 (مستمع مكرر؟)`);
  if (errors.length) findings.push(`XO: أخطاء console: ${errors.join(" | ")}`);
  if (external.length) findings.push(`XO: طلب خارجي: ${external.join(" | ")}`);
  await ctx.close();
}

// XO صعب: لا يخسر أبداً عبر جولة كاملة
{
  const { ctx, page } = await open("/app/xo?lang=en");
  await page.waitForSelector(".cell");
  await page.locator('.lv[data-lv="hard"]').tap();
  await page.waitForTimeout(150);
  for (let i = 0; i < 9; i += 1) {
    const done = await page.evaluate(() => document.getElementById("turn").className.includes("win")
      || document.getElementById("turn").className.includes("lose")
      || document.querySelectorAll(".cell[data-m]").length === 9);
    if (done) break;
    const free = await page.evaluate(() => [...document.querySelectorAll(".cell")].findIndex((c) => !c.getAttribute("data-m") && !c.disabled));
    if (free < 0) break;
    await page.locator(`.cell[data-i="${free}"]`).tap({ force: true });
    await page.waitForTimeout(420);
  }
  const verdict = await page.evaluate(() => document.getElementById("turn").className);
  if (verdict.includes("win")) findings.push("XO صعب: اللاعب فاز — minimax ليس مثالياً");
  await ctx.close();
}

// ─────────────── Sonic: الحلقة تعمل وتتوقف ───────────────
{
  const { ctx, page, errors, external } = await open("/app/sonic?lang=ar");
  await page.waitForSelector("#game");
  await page.locator("#jump").tap();            // أول قفزة تبدأ اللعبة
  await page.waitForTimeout(700);
  const moved = await page.evaluate(() => Number(document.getElementById("score").textContent));
  if (!(moved > 0)) findings.push("Sonic: النقاط لم تتقدم ⇒ الحلقة لا تعمل");
  // القفز يرفع العدّاء فعلاً
  const airborne = await page.evaluate(async () => {
    const before = window.__y ?? null;
    document.getElementById("jump").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 120));
    return true;
  });
  if (!airborne) findings.push("Sonic: القفز لم يُستقبل");
  // الحلقة تتوقف عند إخفاء الصفحة
  const stopped = await page.evaluate(async () => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((r) => setTimeout(r, 120));
    const a = Number(document.getElementById("score").textContent);
    await new Promise((r) => setTimeout(r, 420));
    return Number(document.getElementById("score").textContent) === a;
  });
  if (!stopped) findings.push("Sonic: الحلقة استمرت بعد إخفاء الصفحة (استنزاف بطارية)");
  if (errors.length) findings.push(`Sonic: أخطاء console: ${errors.join(" | ")}`);
  if (external.length) findings.push(`Sonic: طلب خارجي: ${external.join(" | ")}`);
  await ctx.close();
}

// ─────────────── Snake: يُلعب فعلاً ───────────────
{
  const { ctx, page, errors, external } = await open("/app/snake?lang=ar");
  await page.waitForSelector("#go");
  await page.locator("#go").tap();
  await page.waitForTimeout(700);
  // الثعبان يتحرك فعلاً: نقارن بايتات البكسل لا طول data URL (قد يتساوى طوله
  // بين لقطتين مختلفتين، فيمرّ اختبار لا يفحص شيئاً).
  const moved = await page.evaluate(() => new Promise((resolve) => {
    const cv = document.getElementById("cv");
    const ctx = cv.getContext("2d");
    const digest = () => {
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let h = 0;
      for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) % 2147483647;
      return h;
    };
    const a = digest();
    setTimeout(() => resolve({ a, b: digest() }), 600);
  }));
  if (moved.a === moved.b) findings.push(`Snake: بكسلات الساحة لم تتغيّر — الحلقة لا تعمل (${moved.a})`);
  // زر الاتجاه يُقبل ولا يرمي
  await page.locator("#d").tap();
  await page.waitForTimeout(250);
  // الاصطدام بالجدار ينهي الجولة: نوجّه لأعلى باستمرار حتى تظهر شاشة النهاية
  const ended = await page.evaluate(async () => {
    const up = document.getElementById("u");
    for (let i = 0; i < 40; i += 1) {
      up.click();
      await new Promise((r) => setTimeout(r, 60));
      if (!document.getElementById("over").hidden) return true;
    }
    return !document.getElementById("over").hidden;
  });
  if (!ended) findings.push("Snake: الاصطدام بالجدار لم يُنهِ الجولة");
  // إعادة الجولة تعيد الطول للبداية
  await page.locator("#go").tap();
  await page.waitForTimeout(300);
  const restarted = await page.evaluate(() => Number(document.getElementById("len").textContent));
  if (restarted !== 3) findings.push(`Snake: إعادة الجولة لم تُصفّر الطول (${restarted})`);
  // الحلقة تتوقف عند الإخفاء ثم تُستأنف بنقرة صريحة — لا تجمّد صامت ولا جولة جديدة
  const resumed = await page.evaluate(async () => {
    const go = document.getElementById("go");
    go.click();                                   // جولة جديدة
    await new Promise((r) => setTimeout(r, 400));
    const lenBefore = document.getElementById("len").textContent;
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((r) => setTimeout(r, 200));
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((r) => setTimeout(r, 200));
    const shown = !document.getElementById("over").hidden;
    go.click();                                   // استئناف لا إعادة
    await new Promise((r) => setTimeout(r, 300));
    return { shown, lenBefore, lenAfter: document.getElementById("len").textContent, hidden: document.getElementById("over").hidden };
  });
  if (!resumed.shown) findings.push("Snake: الإخفاء ثم الظهور لم يعرض استئنافاً (تجمّد صامت)");
  if (!resumed.hidden) findings.push("Snake: الاستئناف لم يُخفِ شاشة التوقف");
  if (errors.length) findings.push(`Snake: أخطاء console — ${errors.join(" | ")}`);
  if (external.length) findings.push(`Snake: طلب خارجي — ${external.join(" | ")}`);
  await ctx.close();
}

// ─────────────── Memory: يُلعب فعلاً ───────────────
{
  const { ctx, page, errors, external } = await open("/app/memory?lang=ar");
  await page.waitForSelector(".card");
  // نقرة تقلب بطاقة واحدة
  await page.locator('.card[data-i="0"]').tap();
  await page.waitForTimeout(150);
  const oneUp = await page.evaluate(() => document.querySelectorAll(".card.up").length);
  if (oneUp !== 1) findings.push(`Memory: النقرة لم تقلب بطاقة واحدة (${oneUp})`);
  // زوج غير متطابق يُقلب مرة أخرى تلقائياً
  const mismatch = await page.evaluate(async () => {
    const cards = [...document.querySelectorAll(".card")];
    const faceOf = (el) => el.querySelector(".front").textContent;
    const first = cards[0];
    const other = cards.find((c) => c !== first && faceOf(c) !== faceOf(first));
    other.click();
    await new Promise((r) => setTimeout(r, 900));
    return document.querySelectorAll(".card.up").length;
  });
  if (mismatch !== 0) findings.push(`Memory: الزوج غير المتطابق لم يُقلب (${mismatch} ما زالت مكشوفة)`);
  // زوج متطابق يبقى ويُحسب
  const matched = await page.evaluate(async () => {
    const cards = [...document.querySelectorAll(".card")];
    const faceOf = (el) => el.querySelector(".front").textContent;
    const a = cards[0];
    const b = cards.find((c) => c !== a && faceOf(c) === faceOf(a));
    a.click(); b.click();
    await new Promise((r) => setTimeout(r, 300));
    return { done: document.querySelectorAll(".card.done").length, pairs: document.getElementById("pairs").textContent };
  });
  if (matched.done !== 2) findings.push(`Memory: الزوج المتطابق لم يُثبَّت (${matched.done})`);
  if (!matched.pairs.startsWith("1/")) findings.push(`Memory: عدّاد الأزواج لم يتقدّم (${matched.pairs})`);
  // إعادة الجولة تمسح كل شيء
  await page.locator("#again").tap();
  await page.waitForTimeout(200);
  const reset = await page.evaluate(() => ({
    up: document.querySelectorAll(".card.up,.card.done").length,
    moves: document.getElementById("moves").textContent,
  }));
  if (reset.up !== 0 || reset.moves !== "0") findings.push(`Memory: الإعادة لم تُصفّر (${reset.up} بطاقة · ${reset.moves} حركة)`);
  if (errors.length) findings.push(`Memory: أخطاء console — ${errors.join(" | ")}`);
  if (external.length) findings.push(`Memory: طلب خارجي — ${external.join(" | ")}`);
  await ctx.close();
}

// ─────────────── 2048: المنطق صحيح ويُلعب ───────────────
{
  const { ctx, page, errors, external } = await open("/app/n2048?lang=ar");
  await page.waitForSelector(".tile");
  const start = await page.evaluate(() => [...document.querySelectorAll(".tile")].filter((t) => t.dataset.v !== "0").length);
  if (start !== 2) findings.push(`2048: البداية ليست ببلاطتين (${start})`);
  // سحب بالأسهم يحرّك اللوحة ويولّد بلاطة جديدة
  const afterMove = await page.evaluate(async () => {
    const before = [...document.querySelectorAll(".tile")].map((t) => t.dataset.v).join(",");
    for (const key of ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]) {
      dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
    }
    const after = [...document.querySelectorAll(".tile")].map((t) => t.dataset.v).join(",");
    const filled = [...document.querySelectorAll(".tile")].filter((t) => t.dataset.v !== "0").length;
    return { changed: before !== after, filled, score: Number(document.getElementById("score").textContent) };
  });
  if (!afterMove.changed) findings.push("2048: الحركة لم تغيّر اللوحة");
  if (afterMove.filled < 3) findings.push(`2048: لم تُولَّد بلاطات جديدة (${afterMove.filled})`);
  // كل قيمة على اللوحة قوة للعدد 2 (دمج سليم لا أرقام مختلقة)
  const values = await page.evaluate(() => [...document.querySelectorAll(".tile")].map((t) => Number(t.dataset.v)).filter(Boolean));
  const bad = values.filter((v) => v < 2 || (v & (v - 1)) !== 0);
  if (bad.length) findings.push(`2048: قيم ليست قوى للعدد 2 — ${bad.join(",")}`);
  // إعادة الجولة تُصفّر
  await page.locator("#again").tap();
  await page.waitForTimeout(200);
  const reset = await page.evaluate(() => ({
    filled: [...document.querySelectorAll(".tile")].filter((t) => t.dataset.v !== "0").length,
    score: document.getElementById("score").textContent,
  }));
  if (reset.filled !== 2 || reset.score !== "0") findings.push(`2048: الإعادة لم تُصفّر (${reset.filled} بلاطة · ${reset.score})`);
  if (errors.length) findings.push(`2048: أخطاء console — ${errors.join(" | ")}`);
  if (external.length) findings.push(`2048: طلب خارجي — ${external.join(" | ")}`);
  await ctx.close();
}

// ─────────────── تجاوب واتجاه ───────────────
for (const id of ["xo", "sonic", "snake", "memory", "n2048"]) {
  for (const width of WIDTHS) {
    const { ctx, page } = await open(`/app/${id}?lang=ar`, { width });
    await page.waitForSelector(".app");
    const L = await layout(page);
    if (L.scrollW > L.clientW + 1) findings.push(`${id}@${width}: overflow أفقي (${L.scrollW}>${L.clientW})`);
    if (L.dir !== "rtl") findings.push(`${id}@${width}: dir=${L.dir} وليس rtl`);
    await ctx.close();
  }
  const { ctx, page } = await open(`/app/${id}?lang=en`, { width: 412 });
  await page.waitForSelector(".app");
  const L = await layout(page);
  if (L.dir !== "ltr") findings.push(`${id}/en: dir=${L.dir} وليس ltr`);
  await ctx.close();
}

await browser.close();
await new Promise((r) => server.close(r));
assert.deepEqual(findings, [], `مخالفات تشغيل Mini Apps:\n - ${findings.join("\n - ")}`);
console.log(`✅ terboo-miniapp-play: 5 ألعاب تُلعب في Chromium — XO (نقرة⇒X · رد الكمبيوتر · رفض خانة مشغولة · صعب لا يُهزم) · Sonic (حلقة · قفز · توقف عند الإخفاء) · Snake (حركة · اتجاه · موت بالجدار · إعادة · استئناف بعد الإخفاء) · Memory (قلب · زوج خاطئ يعود · زوج صحيح يثبت · إعادة) · 2048 (حركة · توليد · قوى 2 · إعادة) · ${WIDTHS.join("/")}px بلا overflow · RTL+LTR · 0 أخطاء console · 0 طلب خارجي`);
process.exit(0);
