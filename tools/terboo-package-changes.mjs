#!/usr/bin/env node
// ═══════════════════════════════════════════════
// 📦 حزمة التغييرات فقط — الملفات الجديدة والمعدّلة مقارنةً بخط أساس
// ───────────────────────────────────────────────
//   node tools/terboo-package-changes.mjs --name <اسم> --out <dir> [--base <commit>]
//                                        [--include config.js] [--index <ملف>]
//
// • المسارات تبقى كما هي في المشروع ⇒ تُفك الحزمة فوق جذر المشروع مباشرة.
// • الملف المطابق لخط الأساس بايتاً ببايت **لا يُشحن** (يُتحقق بعد البناء، لا يُفترض).
// • الملفات المحذوفة تُدرج في الفهرس بوصفها حذفاً ولا تُشحن — ولا يُنفَّذ حذف تلقائي.
// • يولّد فهرساً (CHANGED_FILES_INDEX.md) من git لا من قائمة يدوية.
// ═══════════════════════════════════════════════

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const NAME = opt("name", "Bot-Terboo-Changes");
const OUT = path.resolve(opt("out", "."));
const BASE = opt("base", "");
const INDEX = opt("index", "CHANGED_FILES_INDEX.md");
const INCLUDE = String(opt("include", "")).split(",").map((x) => x.trim()).filter(Boolean);

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

/** أول commit في التاريخ: خط الأساس الافتراضي للشجرة المدمجة */
function rootCommit() {
  return git("rev-list", "--max-parents=0", "HEAD").trim().split("\n")[0];
}
const base = BASE || rootCommit();
try {
  execFileSync("git", ["rev-parse", "--verify", "--quiet", `${base}^{commit}`], { stdio: "pipe" });
} catch {
  console.error(`❌ خط الأساس «${base}» غير موجود في هذا المستودع.`);
  process.exit(2);
}

// حالة كل ملف بين خط الأساس وشجرة العمل (بما فيها التعديلات غير المودعة)
const STATUS = { A: "جديد", M: "معدّل", D: "محذوف", R: "منقول", C: "منسوخ", T: "نوع" };
const rows = [];
const raw = git("diff", "--name-status", "-z", "--find-renames", base, "--").split("\0").filter(Boolean);
for (let i = 0; i < raw.length; i += 1) {
  const code = raw[i][0];
  if (code === "R" || code === "C") { rows.push({ code, from: raw[i + 1], file: raw[i + 2] }); i += 2; }
  else { rows.push({ code, file: raw[i + 1] }); i += 1; }
}
// ملفات جديدة غير متتبَّعة (لم تُودع بعد) تُعد إضافات أيضاً
for (const f of git("ls-files", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean)) {
  if (!rows.some((r) => r.file === f)) rows.push({ code: "A", file: f });
}
for (const f of INCLUDE) {
  if (!fs.existsSync(f)) throw new Error(`--include: missing ${f}`);
  if (!rows.some((r) => r.file === f)) rows.push({ code: "A", file: f, untracked: true });
}

const shipped = rows.filter((r) => r.code !== "D" && fs.existsSync(r.file) && fs.statSync(r.file).isFile());
const deleted = rows.filter((r) => r.code === "D");

// تحقّق قبل البناء: لا ملف مطابق لخط الأساس يدخل الحزمة
const identical = [];
for (const r of shipped) {
  let before = null;
  // ملف جديد لا وجود له على خط الأساس: الفشل متوقّع، وstderr مكتوم حتى لا يبدو خطأً
  try {
    before = execFileSync("git", ["show", `${base}:${r.file}`], { maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch { before = null; }
  if (before && before.equals(fs.readFileSync(r.file))) identical.push(r.file);
}
if (identical.length) {
  console.error(`❌ ${identical.length} ملف مطابق لخط الأساس في قائمة التغييرات: ${identical.slice(0, 5).join(", ")}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const zip = new AdmZip();
for (const r of shipped) zip.addLocalFile(r.file, path.posix.dirname(r.file) === "." ? "" : path.posix.dirname(r.file), path.posix.basename(r.file));
const target = path.join(OUT, `${NAME}.zip`);
zip.writeZip(target);

// تحقّق بعد البناء: كل ملف مرة واحدة وبنفس البايتات
const entries = new AdmZip(target).getEntries().filter((e) => !e.isDirectory);
const seen = new Map();
for (const e of entries) {
  seen.set(e.entryName, (seen.get(e.entryName) || 0) + 1);
  if (!e.getData().equals(fs.readFileSync(e.entryName))) throw new Error(`content differs: ${e.entryName}`);
}
const broken = shipped.filter((r) => seen.get(r.file) !== 1).map((r) => r.file);
if (broken.length) throw new Error(`missing or duplicated: ${broken.slice(0, 5).join(", ")}`);

// الفهرس — مولّد من git
const tally = shipped.reduce((acc, r) => ({ ...acc, [STATUS[r.code] || r.code]: (acc[STATUS[r.code] || r.code] || 0) + 1 }), {});
const lines = [
  `# فهرس حزمة التغييرات — ${NAME}`,
  "",
  `> **ملف مولّد** بـ\`node tools/terboo-package-changes.mjs\`. يقارن شجرة العمل بخط الأساس \`${base.slice(0, 8)}\`.`,
  "> كل مسار هنا موضعه الأصلي داخل المشروع — فُكّ الحزمة فوق جذر المشروع.",
  "",
  "## الحصيلة",
  "",
  "| الحالة | العدد |",
  "|---|---|",
  ...Object.entries(tally).map(([k, v]) => `| ${k} | ${v} |`),
  `| **المشحون** | **${shipped.length}** |`,
  ...(deleted.length ? [`| محذوف (لا يُشحن) | ${deleted.length} |`] : []),
  "",
  "## الملفات",
  "",
  "| الحالة | المسار |",
  "|---|---|",
  ...shipped.slice().sort((a, b) => a.file.localeCompare(b.file)).map((r) => `| ${STATUS[r.code] || r.code}${r.untracked ? " (غير متتبَّع)" : ""} | \`${r.file}\` |`),
];
if (deleted.length) {
  lines.push("", "## محذوفة من الشجرة (لا تُشحن ولا تُحذف تلقائياً)", "");
  for (const r of deleted.slice().sort((a, b) => a.file.localeCompare(b.file))) lines.push(`- \`${r.file}\``);
}
fs.writeFileSync(INDEX, `${lines.join("\n")}\n`);

console.log(`📦 ${path.basename(target)} · ${(fs.statSync(target).size / 1048576).toFixed(2)} MB · ${shipped.length} ملف`);
console.log(`📄 ${INDEX} · ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
if (INCLUDE.length) console.log(`⚠️  غير متتبَّع شُحن صراحةً: ${INCLUDE.join(" · ")}`);
