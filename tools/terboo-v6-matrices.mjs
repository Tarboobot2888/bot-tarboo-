#!/usr/bin/env node
// ═══════════════════════════════════════════════
// 🧾 V6 — مصفوفات التسليم الناقصة (H · I · K · M · Q/R/S) من الكود نفسه، بلا أسرار
// ───────────────────────────────────────────────
//   node tools/terboo-v6-matrices.mjs [--base <commit>]
// يكتب في docs/v6/:
//   ssh-capability-matrix.json         (H) سياسة الأوامر مصنّفة فعلياً بـ classify() + الوصفات + أدوات AI
//   pterodactyl-capability-matrix.json (I) أقسام العميل وصلاحياتها + عمليات Application للمالك وطريقة التحقق
//   task-background-matrix.json        (K) أنواع المهام · من يسجّل المنفّذ (قابلية الاستئناف) · المؤقتات والجدولة
//   removed-deprecated-report.json     (M) أوامر/مرادفات تغيّرت بين BEFORE و AFTER + المهجور من صحة البلوقنات
//   files-report.json                  (Q/R/S) معدّل · منشأ · محذوف منذ خط الأساس (git)
//   capability-registry.json           (§12) كل القدرات بحقولها الموحّدة (src/lib/terboo-capability-registry.js)
// لا يتصل بأي خادم ولا يقرأ قيمة أي مفتاح.
// ═══════════════════════════════════════════════

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "v6");
const args = process.argv.slice(2);
const BASE = args.includes("--base") ? args[args.indexOf("--base") + 1] : "36c488d";
fs.mkdirSync(OUT, { recursive: true });
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), `${JSON.stringify({ generatedAt: new Date().toISOString(), ...data }, null, 2)}\n`);
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.m?js$/.test(entry.name)) out.push(full);
  }
  return out;
}
const sources = [...walk(path.join(ROOT, "src")), ...walk(path.join(ROOT, "plugins"))].map((file) => ({ file: path.relative(ROOT, file), text: fs.readFileSync(file, "utf8") }));

// ── H) SSH ──────────────────────────────────────
const policy = await import("../src/lib/terboo-ssh-policy.js");
const { RECIPES } = await import("../src/lib/terboo-ssh-recipes.js");
const sshAgent = await import("../src/lib/terboo-ssh-agent.js");
const workspace = await import("../src/lib/terboo-remote-workspace.js");
const WS = "/home/terboo/apps/demo";
const SAMPLES = [
  ["uptime"], ["df", "-h"], ["free", "-m"], ["ps", "aux"], ["cat", "/etc/os-release"], ["tail", "-n", "50", `${WS}/app.log`], ["ls", "-la", WS],
  ["npm", "install"], ["npm", "run", "build"], ["node", "index.js"], ["python3", "-m", "pip", "install", "-r", "requirements.txt"], ["mkdir", "-p", `${WS}/data`],
  ["rm", "-rf", `${WS}/dist`], ["rm", "-rf", "/"], ["rm", "-rf", "/etc"], ["cat", "/etc/shadow"], ["cat", "~/.ssh/id_rsa"], ["bash", "-c", "id"], ["sh"], ["sudo", "reboot"],
  ["shutdown", "-h", "now"], ["mkfs.ext4", "/dev/sda1"], ["dd", "if=/dev/zero", "of=/dev/sda"], ["ls", "|", "grep", "x"], ["curl", "https://example.com"], ["chmod", "-R", "777", "/"],
];
const classified = SAMPLES.map((argv) => {
  const verdict = policy.classify(argv, { workspace: WS, cwd: WS });
  return { command: argv.join(" "), level: verdict.level, allowed: verdict.allowed, reason: verdict.reason };
});
write("ssh-capability-matrix.json", {
  transport: "ssh2 Client · argv only (each arg single-quoted) · host key pinned before auth (SHA256) · credentials sealed in vault, store mode 600",
  levels: { read: "runs directly for the owner", write: "central confirmation (ssh.write), paths must stay inside the workspace", denied: "always refused with an explicit reason" },
  policySamples: classified,
  recipes: Object.entries(RECIPES).map(([id, recipe]) => ({ id, title: recipe.title, steps: recipe.steps.length, pty: recipe.steps.some((s) => s.pty), level: "write (owner + confirm)", source: "fixed script — not AI-generated" })),
  aiTools: Object.entries(sshAgent.SSH_TOOLS).map(([id, tool]) => ({ id, purpose: tool.purpose, who: "owner only (principalOf)", confirm: id === "project.deploy" })),
  diagnoseChecks: Object.keys(sshAgent.CHECKS || {}),
  deployPipeline: { taskType: workspace.TYPE, stages: ["ingest", "inspect (zip-slip · size · secret files)", "upload (SFTP inside workspace)", "build", "run", "observe", "propose fix (AI reads logs)", "apply fix (confirm)", "retest"], limits: workspace.LIMITS },
  ownerCommand: ".ssh add | list | pin | remove | run | diag | deploy",
  passwordsInChat: "refused for legacy panel plugins; message scrubbed from bot history",
});

// ── I) Pterodactyl ─────────────────────────────
const { SERVER_SECTIONS } = await import("../src/lib/providers/pterodactyl/pterodactyl-capabilities.js");
const admin = await import("../src/lib/providers/pterodactyl/pterodactyl-admin.js");
const legacyPanelPlugins = sources.filter((s) => s.file.startsWith("plugins/") && /legacyClient\(/.test(s.text)).map((s) => s.file);
const rawAxiosPanel = sources.filter((s) => s.file.startsWith("plugins/") && /\/api\/application\//.test(s.text) && /axios/.test(s.text) && !/legacyClient\(/.test(s.text)).map((s) => s.file);
write("pterodactyl-capability-matrix.json", {
  transport: "terboo-net-guard panelRequest · SSRF guard (owner-configured domain allowed via allowHosts only) · timeout · size cap · unified PanelError",
  clientApi: { who: "panel resource owner (own key, encrypted)", sections: Object.fromEntries(Object.entries(SERVER_SECTIONS).map(([name, need]) => [name, { requires: need.any?.length ? need.any : ["(any key)"] }])) },
  applicationApi: {
    who: "owner only — config.pterodactyl.server1..5 (env TERBOO_PTERO_<N>_DOMAIN/_APIKEY override)",
    panels: admin.listAdminPanels(),
    operations: [
      { op: "listUsers/listServers/listNodes/listLocations", verify: "paginated read (≤20 pages)" },
      { op: "getUser/getServer", verify: "direct read" },
      { op: "deleteServer/deleteUser", verify: "read after delete must be not-found, else not-applied" },
      { op: "setSuspended", verify: "re-read suspended flag" },
      { op: "legacyClient.deleteVerified", verify: "same delete-then-read proof for legacy plugins" },
    ],
  },
  legacyPluginsOnUnifiedLayer: legacyPanelPlugins,
  legacyPluginsStillOnRawAxios: rawAxiosPanel,
});

// ── K) Tasks / background ──────────────────────
const enqueue = [];
const runners = [];
for (const { file, text } of sources) {
  for (const match of text.matchAll(/enqueueTask\(\{\s*(?:\n\s*)?type:\s*([^,\n]+)/g)) enqueue.push({ file, type: match[1].trim() });
  for (const match of text.matchAll(/registerTaskRunner\(\s*([^,]+),/g)) runners.push({ file, type: match[1].trim() });
}
const constOf = (file, name) => {
  const text = sources.find((s) => s.file === file)?.text || "";
  const hit = text.match(new RegExp(`const ${name}\\s*=\\s*"([^"]+)"`));
  return hit ? hit[1] : name;
};
const PRETTY = { action: "vps.<power|rebuild…> (VPS_WATCHED)", "`tool:${entry.id}`": "tool:<scraper id>" };
const resolveType = ({ file, type }) => {
  const raw = /^[A-Z_]+$/.test(type) ? constOf(file, type) : type.replace(/^"|"$/g, "");
  return PRETTY[raw] || raw;
};
// إعادة الإدراج الداخلية داخل الطابور نفسه (resume/retry) ليست نوع مهمة
const INTERNAL = new Set(["record.type", "type"]);
const runnerTypes = new Set(runners.map(resolveType).filter((type) => !INTERNAL.has(type)));
const taskTypes = [...new Map(enqueue.map((row) => [resolveType(row), row])).entries()].filter(([type]) => !INTERNAL.has(type)).map(([type, row]) => ({
  type, enqueuedIn: row.file, resumableAfterRestart: runnerTypes.has(type),
}));
write("task-background-matrix.json", {
  queue: "src/lib/terboo-task-queue.js — persist · notBefore (delayed, no slot) · cancel/pause/resume/retry · restoreInterrupted on boot",
  taskTypes,
  registeredRunners: [...runnerTypes],
  dynamicRunners: ["VPS power/rebuild watchers (VPS_WATCHED)", "tool:<scraper id> for every replayable scraper"],
  resumeRule: "a task resumes after restart only when a runner is registered for its type; otherwise it is marked interrupted (never fake-resumed). A resumed record is cancelled with note resumed-as:<id>.",
  timersAndCron: readJson("docs/inventory/after/background.json"),
});

// ── M) Removed / deprecated ────────────────────
const before = readJson("TERBOO_V6_BEFORE_MANIFEST.json").manifest;
const after = readJson("TERBOO_V6_AFTER_MANIFEST.json").manifest;
const ownersOf = (m, alias) => Object.entries(m.commandDetails || {}).filter(([, d]) => (d.alias || []).includes(alias)).map(([c]) => c);
const health = readJson("docs/terboo-plugin-health.json");
const healthRows = health.plugins || health.rows || [];
write("removed-deprecated-report.json", {
  baseline: BASE,
  removedCommands: before.commands.filter((c) => !after.commands.includes(c)),
  addedCommands: after.commands.filter((c) => !before.commands.includes(c)),
  aliasesMovedToOwnCommand: before.aliases.filter((a) => !after.aliases.includes(a)).map((alias) => ({
    alias, wasAliasOf: ownersOf(before, alias), nowCommand: after.commands.includes(alias),
    note: "collision resolved: the same name was both an alias of one plugin and the command of another; the command now wins",
  })),
  aliasesLost: before.aliases.filter((a) => !after.aliases.includes(a) && !after.commands.includes(a)),
  deprecatedPlugins: healthRows.filter((r) => /deprecated/i.test(r.status || r.state || "")).map((r) => ({ file: r.file || r.path, reason: r.reason || r.note || "" })),
  blockedByExternalProvider: healthRows.filter((r) => /blocked/i.test(r.status || r.state || "")).map((r) => ({ file: r.file || r.path, reason: r.reason || r.note || "" })),
});

// ── E) AI tools ────────────────────────────────
const { GROUP_TOOLS } = await import("../src/lib/terboo-group-agent.js");
const { MESSAGING_TOOLS } = await import("../src/lib/terboo-messaging-agent.js");
const { CLOUD_TOOLS, cloudAction } = await import("../src/lib/terboo-cloud-tools.js");
const permissions = readJson("docs/terboo-permission-matrix.json");
const decisionOf = (action) => permissions.actions.find((row) => row.action === action) || null;
const registry = readJson("docs/terboo-tool-registry.json");
const registryTools = registry.tools || registry.entries || [];
const aiTools = [
  ...Object.entries(GROUP_TOOLS).map(([id, tool]) => ({ id, family: "group", action: tool.action, scope: tool.anywhere ? "any chat" : "group" })),
  ...Object.entries(MESSAGING_TOOLS).map(([id, tool]) => ({ id, family: "messaging", action: tool.action, scope: "owner" })),
  ...Object.entries(sshAgent.SSH_TOOLS).map(([id]) => ({ id, family: "ssh", action: id, scope: "owner" })),
  ...Object.entries(CLOUD_TOOLS).map(([id, tool]) => ({ id, family: tool.layer, action: cloudAction(id, tool) || "public", kind: tool.kind, confirm: Boolean(tool.confirm), privateOnly: Boolean(tool.privateOnly), scope: "own resources (entitlement)" })),
].map((row) => {
  const decision = decisionOf(row.action);
  const minLevel = decision?.min || (row.family === "ssh" ? "owner" : row.action === "public" ? "user" : null);
  return { ...row, minLevel, decisions: decision?.decisions || null };
});
write("ai-tools-matrix.json", {
  rule: "every tool call goes through the central permission engine (decide/principalOf); targets are resolved by the bot, never a JID chosen by the model",
  actionTools: aiTools,
  readOnlyRegistryTools: { count: registryTools.length || registry.count || null, source: "docs/terboo-tool-registry.json" },
  unmappedToPermissionEngine: aiTools.filter((row) => !row.minLevel).map((row) => row.id),
});

// ── §12) Capability registry (سجل القدرات الموحّد) ──
{
  const { loadPlugins } = await import("../src/lib/terboo-plugins.js");
  await loadPlugins(path.join(ROOT, "plugins"));
  const caps = await import("../src/lib/terboo-capability-registry.js");
  const all = caps.capabilities({ refresh: true });
  write("capability-registry.json", {
    rule: "read-only view over tool registry + permission engine + plugin store; execution stays in each capability's executor",
    fields: caps.FIELDS,
    summary: caps.capabilitySummary(),
    // المرادفات لا تُكتب: بعضها أسماء قديمة محفوظة للتوافق فقط (فحص legacyRefs)
    capabilities: all.map(({ aliases: _aliases, ...c }) => c),
  });
}

// ── Q/R/S) Files ───────────────────────────────
const nameStatus = execFileSync("git", ["-c", "core.quotepath=off", "diff", "--name-status", "-M", BASE, "HEAD"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const changed = [];
const created = [];
const removed = [];
const renamed = [];
for (const line of nameStatus) {
  const [status, ...paths] = line.split("\t");
  if (status === "M") changed.push(paths[0]);
  else if (status === "A") created.push(paths[0]);
  else if (status === "D") removed.push(paths[0]);
  else if (status.startsWith("R")) renamed.push({ from: paths[0], to: paths[1] });
}
write("files-report.json", { baseline: BASE, head: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(), counts: { changed: changed.length, created: created.length, removed: removed.length, renamed: renamed.length }, changed, created, removed, renamed });

console.log(`🧾 docs/v6: ssh ${classified.length} samples · ptero ${legacyPanelPlugins.length} legacy plugins unified · tasks ${taskTypes.length} types · files Δ${changed.length}/+${created.length}/-${removed.length}`);
process.exit(0);
