// ═══════════════════════════════════════════════
// 🧾 Terboo SSH Recipes — أوامر لوحة Pterodactyl القديمة على طبقة SSH الآمنة (§29)
// ───────────────────────────────────────────────
// كانت البلوقنات القديمة تأخذ «IP|كلمة مرور root» في نص الرسالة، تحفظها في global، تتصل بلا تحقق من مفتاح
// المضيف، تجيب الأسئلة عشوائياً، وتعلن «تم بنجاح» عند إغلاق القناة أياً كان رمز الخروج.
// الآن: نفس السكربتات (ثابتة في الكود) كوصفات على مضيف مسجّل (سر مشفّر + بصمة مثبّتة) بإجابات حسب
// نص السؤال الظاهر، ونتيجة كل خطوة برمز خروجها الحقيقي. صيغة «IP|كلمة مرور» تُرفض وتُحذف رسالتها فوراً.
// ═══════════════════════════════════════════════

import { noteFailure } from "./terboo-failure-log.js";
import { scrubSecretMessage } from "./terboo-flow.js";
import { stepOf } from "./terboo-latency.js";
import { langOf } from "./terboo-cloud-ui.js";
import { t } from "./terboo-localization.js";
import { decide, principalOf } from "./terboo-permissions.js";
import { registerSecret } from "./terboo-secrets.js";
import { getHost, registerRecipe, runRecipe } from "./terboo-ssh.js";

const PTERO_DEPS = "apt-get update -y && apt-get install -y curl git && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs && npm i -g yarn && apt-get install -y composer";
const PTERO_BUILD = "cd /var/www/pterodactyl && composer install --no-dev --optimize-autoloader && yarn install && export NODE_OPTIONS=--openssl-legacy-provider && yarn build:production && php artisan view:clear && php artisan config:clear";
const AUTOINSTALLER = "bash <(curl -s https://raw.githubusercontent.com/veryLinh/Theme-Autoinstaller/main/install.sh)";
const STELLAR = "bash <(curl -s https://raw.githubusercontent.com/AnonGhostID/flavor/main/flavor.sh)";
/** أسطر سكربت ثابتة (أوامر shell للخادم — ليست نصاً للمستخدم) */
const NEBULA_DEPS_CMDS = [
  "apt-get update -qq",
  "apt-get install -y curl wget unzip git zip gnupg ca-certificates -qq",
  "mkdir -p /etc/apt/keyrings",
  "curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -yes -o /etc/apt/keyrings/nodesource.gpg",
  "echo \"deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main\" | tee /etc/apt/sources.list.d/nodesource.list",
  "apt-get update -qq",
  "apt-get install -y nodejs -qq",
  "npm i -g yarn",
  "cd /var/www/pterodactyl && yarn install",
];
const NEBULA_BLUEPRINT_CMDS = [
  "cd /var/www/pterodactyl",
  "wget \"$(curl -s https://api.github.com/repos/BlueprintFramework/framework/releases/latest | grep 'browser_download_url' | grep 'release.zip' | cut -d '\"' -f 4)\" -O release.zip",
  "unzip -o release.zip",
  "rm release.zip",
  "printf 'WEBUSER=\"www-data\";\\nOWNERSHIP=\"www-data:www-data\";\\nUSERSHELL=\"/bin/bash\";\\n' > .blueprintrc",
  "chmod +x blueprint.sh",
  "bash blueprint.sh",
];
const NEBULA_DEPS = NEBULA_DEPS_CMDS.join(" && ");
const NEBULA_BLUEPRINT = NEBULA_BLUEPRINT_CMDS.join(" && ");
const NEBULA_THEME = "cd /var/www/pterodactyl && wget -q -O nebula.blueprint \"https://github.com/FikXzModzDeveloper/Nebula-Theme-pterodactyl/raw/main/nebula.blueprint\" && if command -v blueprint >/dev/null 2>&1; then printf '\\n\\n' | blueprint -install nebula; else printf '\\n\\n' | bash blueprint.sh -install nebula; fi";

const LONG = 30 * 60_000;
/** نفس إجابات السكربت المعروفة في البلوقنات القديمة — مرتبطة بنص السؤال لا بأي مخرجات */
const RECIPES = {
  "ptero-theme-uninstall": { title: "uninstall", steps: [{ script: AUTOINSTALLER, pty: true, timeoutMs: LONG, answers: [{ trigger: "AKSES TOKEN", value: "skyzodev" }, { trigger: "Masukkan pilihan", value: "2" }, { trigger: "(y/n)", value: "y" }] }] },
  "ptero-theme-enigma": { title: "enigma", steps: [
    { script: PTERO_DEPS, pty: true, timeoutMs: LONG },
    { script: AUTOINSTALLER, pty: true, timeoutMs: LONG, answers: [{ trigger: "AKSES TOKEN", value: "skyzodev" }, { trigger: "Masukkan pilihan", value: "1" }, { trigger: "Masukkan pilihan", value: "3" }, { trigger: "WhatsApp", value: (a) => a.wa }, { trigger: "group", value: (a) => a.group }, { trigger: "channel", value: (a) => a.channel }] },
    { script: PTERO_BUILD, pty: true, timeoutMs: LONG },
  ] },
  "ptero-theme-billing": { title: "billing", steps: [
    { script: PTERO_DEPS, pty: true, timeoutMs: LONG },
    { script: AUTOINSTALLER, pty: true, timeoutMs: LONG, answers: [{ trigger: "AKSES TOKEN", value: "skyzodev" }, { trigger: "Masukkan pilihan", value: "1" }, { trigger: "Masukkan pilihan", value: "2" }] },
    { script: PTERO_BUILD, pty: true, timeoutMs: LONG },
  ] },
  "ptero-theme-stellar": { title: "stellar", steps: [
    { script: PTERO_DEPS, pty: true, timeoutMs: LONG },
    { script: STELLAR, pty: true, timeoutMs: LONG },
    { script: PTERO_BUILD, pty: true, timeoutMs: LONG },
  ] },
  "ptero-theme-nebula": { title: "nebula", steps: [
    { script: NEBULA_DEPS, pty: true, timeoutMs: LONG },
    { script: NEBULA_BLUEPRINT, pty: true, timeoutMs: LONG },
    { script: NEBULA_THEME, pty: true, timeoutMs: LONG },
  ] },
};
for (const [id, recipe] of Object.entries(RECIPES)) registerRecipe(id, recipe);

const URL_ARG = /^https?:\/\/\S{3,300}$/i;

/**
 * مدخل الأوامر القديمة.
 * @param {Object} m
 * @param {Object} sock
 * @param {{recipe:string, links?:string[]}} spec links: أسماء الروابط المطلوبة بعد المضيف (wa · group · channel)
 */
async function runLegacyRecipe(m, sock, { recipe, links = [] }) {
  const lang = langOf(m);
  const text = String(m.text || "").trim();
  const usage = t(lang, "ssh.legacyUsage", { p: m.prefix || ".", cmd: m.command || "", links: links.map((l) => `<${l}>`).join(" ") });
  // الصيغة القديمة: كلمة مرور في نص الرسالة ⇒ تُحذف الرسالة فوراً ولا يُتصل بشيء
  if (text.includes("|")) {
    for (const part of text.split("|").slice(1)) if (part.trim()) registerSecret(part.trim());
    const scrubbed = await scrubSecretMessage(m, sock).then(() => true).catch((error) => {
      noteFailure("ssh-recipes", error, { where: "terboo-ssh-recipes:scrub", fallback: "warn" });
      return false;
    });
    return m.reply([t(lang, "ssh.legacyPasswordRefused"), scrubbed ? t(lang, "ssh.legacyScrubbed") : "", t(lang, "ssh.legacyRotate"), usage].filter(Boolean).join("\n\n"));
  }
  const [hostId, ...rest] = text.split(/\s+/).filter(Boolean);
  if (!hostId) return m.reply(usage);
  const host = getHost(hostId);
  if (!host) return m.reply([t(lang, "ssh.code_unknown-host"), usage].join("\n\n"));
  const answers = {};
  for (const [index, key] of links.entries()) {
    if (!URL_ARG.test(rest[index] || "")) return m.reply(usage);
    answers[key] = rest[index];
  }
  // الأمر نفسه طلب صريح من المالك (البلوقن للمالك فقط) ⇒ تجاوز التأكيد حسب السياسة
  const principal = await principalOf({ m, sock });
  const decision = decide({ principal, action: "ssh.write", explicit: true });
  stepOf(m, "permission", `ssh.write:${decision.decision}`);
  if (!decision.allowed) return m.reply(t(lang, decision.reason === "owner-only" ? "act.perm_owner-only" : "act.permDenied"));
  await m.reply(t(lang, "ssh.recipeStarted", { id: host.id, steps: RECIPES[recipe].steps.length }));
  stepOf(m, "tool", `ssh.recipe:${recipe}`);
  const out = await runRecipe(host.id, recipe, { answers });
  stepOf(m, "verify", out.code);
  if (!out.ok && !out.steps) return m.reply(t(lang, "ssh.failed", { reason: t(lang, `ssh.code_${out.code}`) }));
  const lines = out.steps.map((s, i) => `${s.ok ? "✓" : "✗"} ${i + 1}/${RECIPES[recipe].steps.length} · exit ${s.exitCode ?? "—"}`);
  const last = out.steps.at(-1);
  return m.reply([
    t(lang, out.ok ? "ssh.recipeDone" : "ssh.recipeFailed", { id: host.id }),
    lines.join("\n"),
    !out.ok && last?.tail ? `\`\`\`\n${last.tail}\n\`\`\`` : "",
  ].filter(Boolean).join("\n\n"));
}

export { RECIPES, runLegacyRecipe };
export default { runLegacyRecipe, RECIPES };
