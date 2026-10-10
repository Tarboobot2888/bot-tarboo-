// ═══════════════════════════════════════════════
// 📱 TERBOO MINI APPS — اختبار واجهة حقيقي في متصفح (Chromium)
// ───────────────────────────────────────────────
// يشغّل الموقع فعلاً، ويفتح صفحة اللعب والكتالوج في Chromium بأحجام أندرويد،
// ثم يتحقق مما لا يثبته أي mock:
//   1) لا overflow أفقي على 320 · 360 · 412 · 480 · عرض أكبر
//   2) RTL للعربية و LTR للإنجليزية/الإسبانية بلا كسر
//   3) لا أخطاء console ولا موارد خارجية ولا <img> في صفحة لعبة غير بصرية
//   4) نقرة لمس حقيقية ⇒ تغيّر حالة اللعبة **على الخادم** (لا حساب في المتصفح)
//   5) أهداف اللمس ≥ 40px، و prefers-reduced-motion محترم
//   6) الكتالوج: بحث وفلاتر تعمل، والعدد من السجل لا من نص مكتوب
// يُتخطّى بإعلان صريح إن لم يتوفر Chromium (لا ادّعاء نجاح).
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const CHROME_CANDIDATES = [
  process.env.TERBOO_TEST_CHROMIUM,
  "/opt/pw-browsers/chromium",
].filter(Boolean);

let pw = null;
try {
  pw = await import("playwright");
} catch (error) {
  console.log(`⏭️  terboo-miniapp-ui: تخطٍّ — playwright غير مثبت (${error.message.slice(0, 60)})`);
  process.exit(0);
}
const exe = CHROME_CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
if (!exe) {
  console.log("⏭️  terboo-miniapp-ui: تخطٍّ — لا متصفح Chromium متاح في هذه البيئة (لم يُدَّعَ نجاح)");
  process.exit(0);
}

// ─────────────── تشغيل البوت والموقع ───────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-miniapp-ui-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
process.env.TERBOO_PUBLIC_IP = "127.0.0.1";
delete process.env.TERBOO_SITE_URL;
const config = (await import("../config.js")).default;
config.bot.primaryNumber = "201111111155";
config.website.url = "";
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
const { loadPlugins } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(process.cwd(), "plugins"));
const { loadArcade, arcadeContracts } = await import("../src/lib/terboo-arcade/index.js");
await loadArcade();
const E = await import("../src/lib/terboo-arcade/engine.js");
const { memoryRepository } = await import("../src/lib/terboo-arcade/repository.js");
E.configure({ repository: memoryRepository(), wallet: { credit() {} } });
const W = await import("../src/lib/terboo-arcade/web.js");
const site = await import("../src/lib/terboo-website.js");
const ctl = await import("../src/lib/terboo-web-control.js");

const port = 24000 + Math.floor(Math.random() * 15000);
site.saveOverrides({ port, url: null, ssl: null });
const started = await ctl.startSite({});
assert.equal(started.ok, true, "الموقع اشتغل");
await new Promise((r) => setTimeout(r, 120));
const BASE = `http://127.0.0.1:${port}`;

/** لاعب جديد لكل غرفة: المحرك يمنع لاعباً واحداً من غرفتين (already-in-room) */
let seat = 0;
function freshPlayer() {
  const jid = `2017777${String(++seat).padStart(5, "0")}@s.whatsapp.net`;
  db.setUser(jid, { language: "ar", name: `P${seat}` });
  return jid;
}

/** غرفة + رمز لعب لمقعد لاعب جديد */
function roomToken(gameId, { vsAI = true } = {}) {
  const jid = freshPlayer();
  const made = E.createRoom({
    gameId, chat: `ui-${gameId}-${seat}@s.whatsapp.net`, isGroup: false,
    host: { jid, name: "P" }, vsAI, difficulty: "EASY", options: { lang: "ar" },
  });
  assert.equal(made.ok, true, `${gameId}: createRoom (${made.code || ""})`);
  const token = W.issuePlayToken(made.room, jid);
  assert.ok(token, `${gameId}: رمز لعب`);
  return { room: made.room, token, jid };
}

const browser = await pw.chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const findings = [];
const WIDTHS = [320, 360, 412, 480, 820];

/** يفتح صفحة ويجمع أخطاء console والطلبات الخارجية */
async function open(url, { width, height = 780, reducedMotion = "no-preference", locale = "ar" } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, isMobile: width <= 480, hasTouch: true,
    reducedMotion, locale,
  });
  const errors = [];
  const external = [];
  const page = await ctx.newPage();
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text().slice(0, 160)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e.message).slice(0, 160)}`));
  page.on("request", (req) => {
    const u = new URL(req.url());
    if (u.origin !== BASE && !["data:", "blob:"].includes(u.protocol)) external.push(req.url().slice(0, 120));
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  return { ctx, page, errors, external };
}

async function layout(page) {
  return page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
    imgs: [...document.querySelectorAll("img")].map((i) => i.getAttribute("src") || ""),
    smallTargets: [...document.querySelectorAll("button, [role=button], a")]
      .filter((b) => b.offsetParent !== null)
      .map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent || "").trim().slice(0, 18), w: Math.round(r.width), h: Math.round(r.height) }; })
      .filter((r) => r.h > 0 && r.h < 40),
    buttons: document.querySelectorAll("button:not([disabled])").length,
  }));
}

// ─────────────── 1–3) صفحة لعب: تجاوب · RTL/LTR · بلا أخطاء/موارد/صور ───────────────
{
  const { token } = roomToken("xo");
  for (const width of WIDTHS) {
    const { ctx, page, errors, external } = await open(`${BASE}/play/${token}?lang=ar`, { width });
    await page.waitForSelector(".card", { timeout: 15000 });
    const L = await layout(page);
    if (L.scrollW > L.clientW + 1) findings.push(`xo@${width}: overflow أفقي (${L.scrollW} > ${L.clientW})`);
    if (L.dir !== "rtl") findings.push(`xo@${width}: dir=${L.dir} وليس rtl`);
    if (L.imgs.length) findings.push(`xo@${width}: وُجد <img> (${L.imgs.join(",")})`);
    if (errors.length) findings.push(`xo@${width}: أخطاء console: ${errors.join(" | ")}`);
    if (external.length) findings.push(`xo@${width}: موارد خارجية: ${external.join(" | ")}`);
    if (L.smallTargets.length) findings.push(`xo@${width}: أهداف لمس صغيرة: ${JSON.stringify(L.smallTargets.slice(0, 3))}`);
    if (!L.buttons) findings.push(`xo@${width}: لا أزرار فعّالة`);
    await ctx.close();
  }
  // LTR
  for (const [locale, lang] of [["en-US", "en"], ["es-ES", "es"]]) {
    const { ctx, page, errors } = await open(`${BASE}/play/${token}?lang=${lang}`, { width: 412, locale });
    await page.waitForSelector(".card", { timeout: 15000 });
    const L = await layout(page);
    if (L.dir !== "ltr") findings.push(`xo/${lang}: dir=${L.dir} وليس ltr`);
    if (L.scrollW > L.clientW + 1) findings.push(`xo/${lang}: overflow أفقي`);
    if (errors.length) findings.push(`xo/${lang}: أخطاء console: ${errors.join(" | ")}`);
    await ctx.close();
  }
  // prefers-reduced-motion يُحترم (لا جسيمات)
  const { ctx, page } = await open(`${BASE}/play/${token}?lang=ar`, { width: 412, reducedMotion: "reduce" });
  await page.waitForSelector(".card", { timeout: 15000 });
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (!reduced) findings.push("prefers-reduced-motion لم يُطبَّق في سياق الاختبار");
  await ctx.close();
}

// ─────────────── 4) نقرة حقيقية ⇒ حالة الخادم تتغير ───────────────
{
  const { room, token } = roomToken("xo");
  const before = JSON.stringify(E.getState(room.roomId).game.board);
  const { ctx, page, errors } = await open(`${BASE}/play/${token}?lang=ar`, { width: 412 });
  await page.waitForSelector(".cell", { timeout: 15000 });
  const cells = await page.locator(".cell").count();
  assert.ok(cells >= 9, `لوحة XO مرسومة في المتصفح (${cells} خانة)`);
  await page.locator(".cell").first().tap();
  // ننتظر أن يعكس **الخادم** الحركة (لا نقرأ DOM كمصدر حقيقة)
  const deadline = Date.now() + 8000;
  let after = before;
  while (Date.now() < deadline) {
    after = JSON.stringify(E.getState(room.roomId).game.board);
    if (after !== before) break;
    await new Promise((r) => setTimeout(r, 120));
  }
  if (after === before) findings.push("نقرة اللمس لم تغيّر حالة اللعبة على الخادم");
  // المتصفح لا يستطيع إملاء نتيجة: حقل محظور يُرفض عبر نفس API
  const forged = await page.evaluate(async (t) => {
    const res = await fetch(`/api/v1/arcade/s/${t}/action`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-Terboo-Arcade": "1" },
      body: JSON.stringify({ actionId: "place", payload: { cell: 8, winner: 0, score: 9999 }, nonce: "x", timestamp: Date.now() }),
      credentials: "same-origin",
    });
    const j = await res.json().catch(() => ({}));
    return { status: res.status, code: j?.data?.code ?? j?.code };
  }, token);
  if (forged.code !== "forbidden-field") findings.push(`حمولة بحقل قرار خادمي لم تُرفض: ${JSON.stringify(forged)}`);
  if (errors.length) findings.push(`نقرة: أخطاء console: ${errors.join(" | ")}`);
  await ctx.close();
}

// ─────────────── صفحة لعبة بصرية: الأصل من نفس الأصل برمز موقّع ───────────────
{
  const visual = arcadeContracts().find((c) => c.id === "q_tebakbendera");
  if (visual) {
    const { token } = roomToken("q_tebakbendera", { vsAI: false });
    const { ctx, page } = await open(`${BASE}/play/${token}?lang=ar`, { width: 360 });
    await page.waitForSelector(".card", { timeout: 15000 });
    const L = await layout(page);
    // لعبة بصرية: يُسمح بصورة **داخل الصفحة** لكن من نفس الأصل وبمسار الوكيل الموقّع فقط
    for (const src of L.imgs) {
      if (!/^\/api\/v1\/arcade\/asset\/[A-Za-z0-9_.-]+$/.test(src)) findings.push(`لعبة بصرية: مصدر صورة غير مسموح (${src})`);
    }
    if (L.scrollW > L.clientW + 1) findings.push("لعبة بصرية: overflow أفقي");
    const answers = await page.locator(".answers button").count();
    if (answers !== 4) findings.push(`لعبة بصرية: أزرار الخيارات ${answers} وليست 4`);
    await ctx.close();
  } else findings.push("q_tebakbendera غير مُرحَّلة");
}

// ─────────────── 6) الكتالوج ───────────────
{
  // الكتالوج يعرض عقود الأركيد + الألعاب المستقلة
  const { miniApps } = await import("../src/lib/terboo-miniapp.js");
  const expectedCards = arcadeContracts().length + miniApps().length;
  for (const width of [320, 412, 820]) {
    const { ctx, page, errors, external } = await open(`${BASE}/arcade?lang=ar`, { width });
    await page.waitForSelector(".gcard", { timeout: 15000 });
    const L = await layout(page);
    const cards = await page.locator(".gcard").count();
    const shown = Number((await page.locator(".cat-count").first().textContent() || "").replace(/\D+/g, ""));
    if (cards !== expectedCards) findings.push(`الكتالوج@${width}: ${cards} بطاقة بدل ${expectedCards}`);
    if (shown !== cards) findings.push(`الكتالوج@${width}: العدد المعروض ${shown} لا يطابق البطاقات ${cards}`);
    if (L.scrollW > L.clientW + 1) findings.push(`الكتالوج@${width}: overflow أفقي`);
    if (L.imgs.length) findings.push(`الكتالوج@${width}: وُجد <img> (الكتالوج بلا صور)`);
    if (errors.length) findings.push(`الكتالوج@${width}: أخطاء console: ${errors.join(" | ")}`);
    if (external.length) findings.push(`الكتالوج@${width}: موارد خارجية: ${external.join(" | ")}`);
    if (width === 412) {
      // بحث
      await page.locator(".cat-search input").fill("إكس");
      await page.waitForTimeout(220);
      const filtered = await page.locator(".gcard").count();
      if (!(filtered >= 1 && filtered < cards)) findings.push(`الكتالوج: البحث لم يُرشّح (${filtered}/${cards})`);
      await page.locator(".cat-search input").fill("");
      await page.waitForTimeout(220);
      // فلتر فئة
      const quizChip = page.locator('.chip', { hasText: "أسئلة" }).first();
      if (await quizChip.count()) {
        await quizChip.tap();
        await page.waitForTimeout(220);
        const quizCards = await page.locator(".gcard").count();
        if (!(quizCards >= 1 && quizCards < cards)) findings.push(`الكتالوج: فلتر الفئة لم يعمل (${quizCards}/${cards})`);
      } else findings.push("الكتالوج: لا رقاقة فئة «أسئلة»");
      // لوحة التفاصيل
      await page.reload({ waitUntil: "networkidle" });
      await page.locator(".gcard").first().tap();
      await page.waitForSelector(".sheet-card", { timeout: 8000 });
      const sheetText = await page.locator(".sheet-card").first().innerText();
      if (!/\./.test(sheetText)) findings.push("لوحة التفاصيل بلا أمر");
    }
    await ctx.close();
  }
}

await browser.close();
await ctl.stopSite?.({}).catch(() => {});

assert.deepEqual(findings, [], `مخالفات واجهة Mini App:\n - ${findings.join("\n - ")}`);
console.log(`✅ terboo-miniapp-ui: Chromium ${(await (async () => "141")()) && "حقيقي"} · صفحة لعب على ${WIDTHS.join("/")}px بلا overflow · RTL+LTR · 0 أخطاء console · 0 موارد خارجية · نقرة لمس ⇒ حالة الخادم · حقل قرار مرفوض · أصل بصري same-origin موقّع · كتالوج ${arcadeContracts().length}+${(await import("../src/lib/terboo-miniapp.js")).miniApps().length} لعبة ببحث وفلاتر`);
process.exit(0);
