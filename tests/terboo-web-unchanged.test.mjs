// ═══════════════════════════════════════════════
// 🔒 نطاق المهمة: لا تعديل على أي ملف تحت web/ (§14.5 · §16)
// ───────────────────────────────────────────────
// الشرط: WEB_FILES_UNCHANGED يجب أن يكون PASS. يُفحص ببصمات SHA-256
// مسجّلة في docs/v6/web-files-sha256.json، ويتحقق أيضاً أن الحارس نفسه
// يكشف تغييراً فعلياً (وإلا كان فحصاً شكلياً).
//
// كذلك: مسار تسليم اللعبة لا يستورد شيئاً من web/ ولا يبني رابط /app.
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "docs", "v6", "web-files-sha256.json");

// ── 1. البصمة مسجّلة وتغطي كل ملف متتبَّع تحت web/ ───────────────────────
assert.ok(fs.existsSync(MANIFEST), "بصمة ملفات الموقع غير مسجّلة");
const saved = JSON.parse(fs.readFileSync(MANIFEST, "utf8")).sha256;
const tracked = execFileSync("git", ["ls-files", "-z", "web/"], { cwd: ROOT })
  .toString("utf8").split("\0").filter(Boolean).sort();
assert.ok(tracked.length >= 10, `عدد ملفات web/ غير منطقي: ${tracked.length}`);
assert.deepEqual(Object.keys(saved).sort(), tracked, "البصمة لا تغطي نفس مجموعة الملفات");

// ── 2. كل ملف مطابق لبصمته ───────────────────────────────────────────────
const drifted = tracked.filter((file) => {
  const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, file))).digest("hex");
  return hash !== saved[file];
});
assert.deepEqual(drifted, [], `WEB_FILES_UNCHANGED: FAIL — ${drifted.join(", ")}`);

// ── 3. الحارس يكشف تغييراً فعلاً (ليس فحصاً شكلياً) ──────────────────────
{
  const victim = path.join(ROOT, tracked[0]);
  const original = fs.readFileSync(victim);
  let detected = false;
  try {
    fs.writeFileSync(victim, Buffer.concat([original, Buffer.from("\n")]));
    try {
      execFileSync(process.execPath, ["tools/terboo-web-manifest.mjs", "--check"], { cwd: ROOT, stdio: "pipe" });
    } catch { detected = true; }
  } finally {
    fs.writeFileSync(victim, original);
  }
  assert.ok(detected, "الحارس لم يكشف تغييراً مدسوساً — فحص شكلي");
  // وبعد الاستعادة يعود PASS
  execFileSync(process.execPath, ["tools/terboo-web-manifest.mjs", "--check"], { cwd: ROOT, stdio: "pipe" });
}

// ── 4. مسار تسليم اللعبة مستقل عن الموقع ─────────────────────────────────
{
  const transport = fs.readFileSync(path.join(ROOT, "src/lib/terboo-miniapp-transport.js"), "utf8");
  // الفحص على **الاستيرادات** لا على نص الملف: ذِكر `sendCard` في تعليق يشرح
  // أن النقل لا يمر منه ليس استعمالاً له، وعدّه مخالفةً خطأ مطابقة نصية.
  const imports = [...transport.matchAll(/^import\s[^;]*?from\s+"([^"]+)";/gm)].map((hit) => hit[1]);
  assert.ok(imports.length > 0, "لم تُقرأ استيرادات طبقة النقل");
  for (const spec of imports) {
    assert.ok(!spec.includes("web/"), `طبقة النقل تستورد من الموقع: ${spec}`);
    assert.ok(!/terboo-website|terboo-ui-kit/.test(spec), `طبقة النقل تستورد مسار الموقع أو البطاقات: ${spec}`);
  }
  // ولا تبني رابطاً إطلاقاً
  const code = transport.replace(/\/\/[^\n]*/g, "");
  assert.doesNotMatch(code, /https?:\/\//, "طبقة النقل تبني رابطاً");
  assert.doesNotMatch(code, /\/app\//, "طبقة النقل تبني رابط /app");
}

console.log(`✅ terboo-web-unchanged: WEB_FILES_UNCHANGED PASS · ${tracked.length} ملف · الحارس يكشف تغييراً مدسوساً · طبقة النقل لا تلمس الموقع`);
process.exit(0);
