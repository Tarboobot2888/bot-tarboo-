// ═══════════════════════════════════════════════
// 🧪 TERBOO MINI APPS — بنّاؤو الألعاب المستقلة (§18.1)
// ───────────────────────────────────────────────
// لكل builder: ثلاث لغات · بنية المستند · عناصر التحكم · الحجم ·
// لا مصادر خارجية · لا معرّفات مكررة · الأزرار مربوطة فعلاً · nonce.
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";

const { auditWebViewHtml, WIRE_BUDGET } = await import("../src/lib/terboo-webview-budget.js");

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const { buildSonicRunnerHtml } = await import("../src/lib/miniapps/sonic-runner.js");
const { buildTicTacToeHtml } = await import("../src/lib/miniapps/xo.js");
const { buildSnakeHtml } = await import("../src/lib/miniapps/snake.js");
const { buildMemoryHtml } = await import("../src/lib/miniapps/memory.js");
const { build2048Html } = await import("../src/lib/miniapps/n2048.js");
const M = await import("../src/lib/terboo-miniapp.js");

const LANGS = ["ar", "en", "es"];
const BUILDERS = [
  { id: "sonic", build: buildSonicRunnerHtml, needs: ["game", "jump", "boost", "restart", "mute"], canvas: true },
  { id: "xo", build: buildTicTacToeHtml, needs: ["board", "turn", "again", "mute", "line"], canvas: false },
  { id: "snake", build: buildSnakeHtml, needs: ["cv", "arena", "go", "u", "d", "l", "r", "score"], canvas: true },
  { id: "memory", build: buildMemoryHtml, needs: ["grid", "again", "moves", "pairs", "won"], canvas: false },
  { id: "n2048", build: build2048Html, needs: ["arena", "again", "score", "over", "c0", "c15"], canvas: false },
];

// كل بنّاء مسجّل في السجل، وكل مُسجَّل له بنّاء: لا لعبة معلّقة بين الاثنين
assert.deepEqual([...M.MINI_APPS.keys()].sort(), BUILDERS.map((b) => b.id).sort(),
  "سجل MINI_APPS والبنّاؤون المُختبَرون لا يتطابقان");

/** معرّفات العناصر في المستند */
const idsOf = (html) => [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);

for (const b of BUILDERS) {
  for (const lang of [...LANGS, "xx"]) {
    const html = b.build(lang);
    const tag = `${b.id}/${lang}`;
    // بنية المستند
    assert.match(html, /^<!doctype html>/i, `${tag}: doctype`);
    assert.match(html, /<meta charset="utf-8">/i, `${tag}: charset`);
    assert.match(html, /<meta name="viewport"[^>]*width=device-width/i, `${tag}: viewport`);
    assert.match(html, /<\/html>\s*$/i, `${tag}: مغلق`);
    const expectLang = LANGS.includes(lang) ? lang : "ar";
    assert.match(html, new RegExp(`<html lang="${expectLang}"`), `${tag}: lang`);
    assert.match(html, new RegExp(`dir="${expectLang === "ar" ? "rtl" : "ltr"}"`), `${tag}: dir`);
    // عناصر التحكم الضرورية
    for (const id of b.needs) assert.ok(html.includes(`id="${id}"`), `${tag}: عنصر ${id}`);
    if (b.canvas) assert.match(html, /<canvas\b/i, `${tag}: canvas`);
    // لا معرّفات مكررة
    const ids = idsOf(html);
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    assert.deepEqual(dup, [], `${tag}: معرّفات مكررة ${dup.join(",")}`);
    // لا مصادر خارجية ولا إطارات ولا بروتوكولات خطرة
    assert.doesNotMatch(html, /<iframe\b|<object\b|<embed\b/i, `${tag}: لا إطار`);
    assert.doesNotMatch(html, /(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i, `${tag}: لا مورد خارجي`);
    assert.doesNotMatch(html, /javascript:|vbscript:|data:text\/html/i, `${tag}: لا بروتوكول خطر`);
    assert.doesNotMatch(html, /\beval\s*\(|new\s+Function\s*\(/, `${tag}: لا eval`);
    // لا طلب شبكة من داخل الصفحة (الصفحة مستقلة بالكامل)
    assert.doesNotMatch(html, /\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new\s+WebSocket/, `${tag}: بلا شبكة`);
    // JavaScript مطلوب فعلاً + حلقة/منطق
    assert.match(html, /<script/, `${tag}: script`);
    assert.match(html, /addEventListener\(/, `${tag}: مستمعات`);
    // الحجم
    const bytes = Buffer.byteLength(html, "utf8");
    assert.ok(bytes > 4000, `${tag}: مستند غير فارغ (${bytes}B)`);
    assert.ok(bytes < M.MAX_APP_BYTES, `${tag}: تحت الحد (${bytes}B)`);
    // دورة الحياة: حلقة الرسم تتوقف خارج الشاشة، والأزرار تُفلت
    assert.match(html, /visibilitychange/, `${tag}: حارس إخفاء الصفحة`);
    assert.match(html, /cancelAnimationFrame/, `${tag}: إيقاف حلقة الرسم`);
    assert.match(html, /pointercancel/, `${tag}: تحرير اللمس عند الإلغاء`);
    // لا تخزين إطلاقاً: الصفحة تعمل في أصل معتم وكل واجهات التخزين ترمي
    // SecurityError هناك، فتغليفها بـtry يضمن فشلاً لا فائدة منه. الحارس هو
    // مدقّق المحيط نفسه، فيشمل الشبكة والحلقات غير المحروسة والميزانية.
    const audit = auditWebViewHtml(html);
    assert.deepEqual(audit.problems, [], `${tag}: مخالفات محيط WebView`);
    assert.ok(audit.wire < WIRE_BUDGET, `${tag}: ${Math.round(audit.wire / 1024)}KB تحت الميزانية`);
  }
  // نصوص كل لغة مختلفة فعلاً (لا عربية ثابتة في النسخة الإنجليزية)
  const ar = b.build("ar"), en = b.build("en"), es = b.build("es");
  assert.notEqual(ar, en, `${b.id}: ar ≠ en`);
  assert.notEqual(en, es, `${b.id}: en ≠ es`);
  assert.match(ar, /[؀-ۿ]/, `${b.id}: العربية فيها نص عربي`);
  // واجهة كل لغة من قاموس COPY في نفس الملف. هذا الحارس هو ما يبرّر استثناء
  // src/lib/miniapps/ من مستخرج الترجمة: الكتالوج لا يملك نصوص هذه الصفحات،
  // فالإثبات هنا — لا نص عربي في واجهة الإنجليزية ولا الإسبانية.
  const uiOf = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  for (const [lang, html] of [["en", en], ["es", es]]) {
    assert.doesNotMatch(uiOf(html), /[؀-ۿ]/, `${b.id}/${lang}: واجهة بلا نص عربي`);
  }
  // nonce
  const withNonce = b.build("ar", { nonce: "TESTNONCE" });
  assert.match(withNonce, /<script nonce="TESTNONCE">/, `${b.id}: nonce في وسم السكربت`);
}

// الأزرار مربوطة فعلاً بمنطق (لا زر ميت)
const xo = buildTicTacToeHtml("ar");
assert.equal((xo.match(/class="cell can"/g) || []).length, 9, "XO: تسع خانات");
assert.match(xo, /minimax/, "XO: مستوى صعب فيه minimax");
assert.match(xo, /alpha, beta/, "XO: تقليم ألفا-بيتا");
assert.match(xo, /if \(over \|\| busy \|\| board\[i\]\) return;/, "XO: لا حركة بعد النهاية ولا على خانة مشغولة");
assert.match(xo, /addEventListener\("click", \(e\) => \{\s*const btn = e\.target\.closest\(".cell"\)/, "XO: مستمع واحد بالتفويض (إعادة الجولة لا تضيف مستمعات)");
const sonic = buildSonicRunnerHtml("ar");
assert.match(sonic, /TK\.hold\(TK\.\$\("jump"\)/, "Sonic: القفز مربوط");
assert.match(sonic, /TK\.hold\(TK\.\$\("boost"\)[\s\S]{0,80}S\.boost = false/, "Sonic: الانطلاق يُفلت عند رفع الإصبع");
assert.match(sonic, /Math\.min\(\(now - last\) \/ 1000, 0\.05\)/, "Sonic: dt مقصوص (لا قفزة بعد توقف)");

// السجل
assert.deepEqual(M.miniApps().map((a) => a.id).sort(), BUILDERS.map((b) => b.id).sort(), "السجل");
assert.equal(M.hasMiniApp("sonic"), true);
assert.equal(M.hasMiniApp("nope"), false);
assert.equal(M.renderMiniApp("nope").code, "unknown-mini-app", "لعبة غير مسجّلة");
// كل لعبة لها اسم ووصف بثلاث لغات وفئة وارتفاع — لا مدخل ناقص في السجل
for (const app of M.miniApps()) {
  for (const lang of LANGS) {
    assert.ok(app.name?.[lang]?.trim(), `${app.id}: اسم ${lang}`);
    assert.ok(app.blurb?.[lang]?.trim(), `${app.id}: وصف ${lang}`);
  }
  assert.ok(app.icon && app.category && Number(app.height) > 0, `${app.id}: بيانات عرض ناقصة`);
}
for (const id of BUILDERS.map((b) => b.id)) {
  const r = M.renderMiniApp(id, { lang: "ar" });
  assert.equal(r.ok, true, `${id}: يمر من التحقق (${r.code || ""} ${(r.errors || []).join(",")})`);
}
// القناة المضمَّنة: مطفأة ومعلّلة، ولا تُعلن متاحة
const nt = M.nativeTransport();
assert.equal(nt.available, false, "القناة المضمَّنة ليست متاحة");
assert.ok(nt.reason, "سبب صريح");

console.log(`✅ terboo-miniapp-builders: ${BUILDERS.length} بنّاء × 3 لغات · بنية ومحتوى وحجم · 0 مورد خارجي · 0 معرّف مكرر · بلا شبكة/eval · حارس إخفاء + تحرير لمس · nonce · أزرار مربوطة · سجل`);
process.exit(0);
