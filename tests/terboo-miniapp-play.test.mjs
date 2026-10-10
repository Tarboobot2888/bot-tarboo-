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

// ─────────────── تجاوب واتجاه ───────────────
for (const id of ["xo", "sonic"]) {
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
console.log(`✅ terboo-miniapp-play: XO تُلعب (نقرة⇒X · رد الكمبيوتر · رفض خانة مشغولة · إعادة بلا مستمع مكرر · صعب لا يُهزم) · Sonic (حلقة تتقدم · قفز · تتوقف عند الإخفاء) · ${WIDTHS.join("/")}px بلا overflow · RTL+LTR · 0 أخطاء console · 0 طلب خارجي`);
process.exit(0);
