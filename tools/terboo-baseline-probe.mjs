#!/usr/bin/env node
// ═══════════════════════════════════════════════
// 🔍 فحص خط الأساس — هل يعيد الاختبار الفاشل نفسه قبل أي تعديل؟
// ───────────────────────────────────────────────
//   node tools/terboo-baseline-probe.mjs --after <results.json> --out <probe.json> [--base <commit>]
//
// ينشئ worktree مؤقتاً على commit خط الأساس، ويربط node_modules نفسها، ويشغّل
// **كل ملف فاشل** في `--after` هناك. المخرج: حالة كل ملف على خط الأساس.
// الغرض: التمييز بين «انحدار من هذا العمل» و«فشل سابق خارج النطاق» بدليل تشغيل،
// لا باستنتاج. لا يلمس شجرة العمل ولا يحذف شيئاً من المستودع.
// ═══════════════════════════════════════════════

import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);
const AFTER = arg("--after");
const OUT = arg("--out");
if (!AFTER || !fs.existsSync(AFTER) || !OUT) {
  console.error("استخدام: node tools/terboo-baseline-probe.mjs --after <results.json> --out <probe.json> [--base <commit>]");
  process.exit(2);
}

const ROOT = process.cwd();
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
const base = arg("--base") || git("rev-list", "--max-parents=0", "HEAD").trim().split("\n")[0];
// ملفات إضافية تُفحص وإن كانت ناجحة الآن: لإثبات أن هذا العمل أصلحها فعلاً
const ALSO = String(arg("--also") || "").split(",").map((x) => x.trim()).filter(Boolean);
const after = JSON.parse(fs.readFileSync(AFTER, "utf8"));
const failing = [...new Set([...after.results.filter((r) => r.state === "FAIL").map((r) => r.file), ...ALSO])].sort();
for (const f of ALSO) if (!after.results.some((r) => r.file === f)) throw new Error(`--also: ${f} ليس في نتائج التشغيل`);
if (!failing.length) {
  fs.writeFileSync(OUT, `${JSON.stringify({ base, probedAt: new Date().toISOString(), results: [] }, null, 2)}\n`);
  console.log("لا ملف فاشل — لا شيء يُفحص.");
  process.exit(0);
}

const wt = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-baseline-"));
const dir = path.join(wt, "tree");
execFileSync("git", ["worktree", "add", "--detach", "--quiet", dir, base], { cwd: ROOT, stdio: "pipe" });
// نفس الاعتماديات بالضبط: الفرق المقيس هو الكود لا إصدارات الحزم
fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"));
// إعداد بلا أسرار: خط الأساس لا يعرف كتلة secrets، والقالب هو ما يُشحن
fs.copyFileSync(path.join(dir, "config.example.js"), path.join(dir, "config.js"));

/** نفس تصنيف المشغّل: PASS · FAIL · BLOCKED */
function stateOf(ok, stdout, stderr) {
  if (!ok) return "FAIL";
  const out = `${stdout}\n${stderr}`;
  return /^\s*⏭/m.test(out) && !/^✅/m.test(out) ? "BLOCKED" : "PASS";
}

/** الدعوى الساقطة: سطر واحد يسمح بمقارنة «نفس الفشل» لا مجرد «فشل» */
const claimOf = (out) => {
  const assertion = (out.match(/AssertionError[^\n]*/) || [""])[0].trim();
  const values = (out.match(/^\s*(?:[^\n]{1,40} !== [^\n]{1,40})\s*$/m) || [""])[0].trim();
  return [assertion, values].filter(Boolean).join(" · ").replace(/\s+/g, " ").slice(0, 220);
};

const run = (file, cwd) => new Promise((resolve) => {
  execFile(process.execPath, [path.join("tests", file)], { cwd, shell: false, timeout: 600_000, maxBuffer: 32 * 1024 * 1024 },
    (error, stdout, stderr) => {
      const out = `${stdout}\n${stderr}`;
      resolve({ state: stateOf(!error, String(stdout), String(stderr)), claim: claimOf(out) });
    });
});

const results = [];
for (const file of failing) {
  // الشجرة الحالية ثم خط الأساس: المقارنة بين دعويين، لا بين حالتين فقط
  const now = await run(file, ROOT);
  const old = await run(file, dir);
  // تطابق الدعوى يشمل «لا سطر دعوى في الحالتين»: نفس شكل الفشل لا مجرد نفس الحالة
  const same = now.claim === old.claim;
  results.push({ file, state: old.state, claim: old.claim, nowState: now.state, nowClaim: now.claim, sameClaim: same });
  console.log(`  ${old.state === "PASS" ? "✓" : old.state === "BLOCKED" ? "⏭" : "✗"} ${file} → خط الأساس ${old.state}${same ? " · نفس الدعوى" : ""}`);
}

try { execFileSync("git", ["worktree", "remove", "--force", dir], { cwd: ROOT, stdio: "pipe" }); } catch (error) {
  console.error(`[baseline-probe] تنظيف worktree: ${error.message}`);
}
fs.rmSync(wt, { recursive: true, force: true });

fs.writeFileSync(OUT, `${JSON.stringify({ base, probedAt: new Date().toISOString(), node: process.version, results }, null, 2)}\n`);
// الانحدار يُحسب على الفاشل الآن فقط: ملف نجح على خط الأساس ويفشل الآن.
// ملفات --also ناجحة الآن، فنجاحها على خط الأساس ليس انحداراً بل «لم يُصلحه هذا العمل».
const nowFailing = results.filter((r) => r.nowState === "FAIL");
const regressed = nowFailing.filter((r) => r.state === "PASS").map((r) => r.file);
const repaired = results.filter((r) => r.nowState === "PASS" && r.state !== "PASS").map((r) => r.file);
console.log(`\n${results.length} ملف فُحص على ${base.slice(0, 8)} · يفشل الآن ${nowFailing.length} · أُعيد الفشل على خط الأساس في ${nowFailing.length - regressed.length} · انحدار: ${regressed.length} · أُصلح بهذا العمل: ${repaired.length}`);
if (regressed.length) console.log(`⚠️  نجحت على خط الأساس وتفشل الآن: ${regressed.join(" · ")}`);
if (repaired.length) console.log(`✅ كانت فاشلة على خط الأساس وتنجح الآن: ${repaired.join(" · ")}`);
console.log(`→ ${path.relative(ROOT, OUT)}`);
