// ═══════════════════════════════════════════════
// 🧪 Smart Button Engine + Cloud Tools (§33–§42)
// ───────────────────────────────────────────────
// 1. وصف الواجهة لكل أمر من بيانات البلوقن الحقيقية: المدمّر · يحتاج هدفاً/نصاً/رداً · خيارات · مالك.
// 2. سياسة الأزرار: لا زر لما لا يملك المستخدم صلاحيته · لا زر لأمر يحتاج نصاً حراً · المدمّر تأكيد فقط.
// 3. النواة الحقيقية: النموذج يقترح responseMode ⇒ السياسة تقرر ⇒ أزرار حقيقية (relay) ⇒ الضغط
//    (terboo_pick_N / yes / no) يمر بالمعلّق والصلاحيات الحقيقية ويصل للموزّع.
// 4. أدوات السحابة: vps.* و panel.* بمعرّفات فقط ⇒ هدف من السياق/الملكية (لا VPS لغيره) ⇒ الأمر الموجود.
// 5. طلبات طبيعية: الباقات · ضيف لوحتي (ليست إضافة عضو) · اختبر المفتاح · «شغل السيرفر التاني».
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-buttons-"));
process.env.TERBOO_VPS_STORE = path.join(tmp, "vps.json");
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
const { loadPlugins } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(process.cwd(), "plugins"));
const memory = await import("../src/lib/terboo-ai-memory.js");
memory.initMemory(path.join(tmp, "memory"));
memory.resetAll();
const core = await import("../src/lib/terboo-ai-core.js");
const ui = await import("../src/lib/terboo-command-ui.js");
const cloud = await import("../src/lib/terboo-cloud-tools.js");
const engine = await import("../src/lib/terboo-action-engine.js");
const ctx = await import("../src/lib/terboo-context-engine.js");
const ent = await import("../src/lib/providers/virtualizor/virtualizor-entitlements.js");
const { dispatchCommand } = await import("../src/lib/terboo-command-dispatch.js");

const results = [];
async function check(name, fn) {
  await fn();
  results.push(name);
}

const BOT = "2348093093240";
const USER = "201000000001@s.whatsapp.net";
const BUYER = "201000000005@s.whatsapp.net";
const GROUP = "120363000000000999@g.us";

// ── واتساب وهمي يسجّل الرسائل التفاعلية الحقيقية (relay) والنصوص ──
const sent = [];
const sock = {
  user: { id: `${BOT}:12@s.whatsapp.net` },
  async relayMessage(jid, message) {
    const interactive = message?.viewOnceMessage?.message?.interactiveMessage || message?.interactiveMessage;
    sent.push({ kind: "relay", jid, interactive });
    return { key: { id: `relay-${sent.length}` } };
  },
  async sendMessage(jid, content) {
    sent.push({ kind: "send", jid, text: content?.text || content?.caption || "" });
    return { key: { id: `send-${sent.length}` } };
  },
};
function lastButtons() {
  const relay = [...sent].reverse().find((s) => s.kind === "relay");
  return (relay?.interactive?.nativeFlowMessage?.buttons || []).map((b) => { try { return JSON.parse(b.buttonParamsJson || "{}").id; } catch { return null; } }).filter(Boolean);
}

// ── نموذج مُبرمج + موزّع حقيقي بمعالج نهائي مسجِّل ──
const calls = [];
let script = () => ({ decision: "CHAT", reply: "…", confidence: 0.9 });
async function ask(payload) {
  calls.push(payload);
  return { text: JSON.stringify(script(payload)), provider: "Scripted" };
}
const executed = [];
async function recordingHandler(synthetic, _sock, options) {
  executed.push(synthetic.message.extendedTextMessage.text);
  options.observer.done({ ok: true, status: "done" });
}
const dispatch = (m, s, request) => dispatchCommand(m, s, request, { handler: recordingHandler });
const deps = { ask, dispatch, rateLimit: false };

let seq = 0;
function message({ sender = USER, body, group = false, isOwner = false, isAdmin = false }) {
  const replies = [];
  return {
    key: { remoteJid: group ? GROUP : sender, fromMe: false, id: `SB${++seq}`, ...(group ? { participant: sender } : {}) },
    sender, chat: group ? GROUP : sender, isGroup: group, body: group ? `@${BOT} ${body}` : body,
    pushName: "مختبر", type: "conversation", isCommand: false, prefix: ".",
    isOwner, isPremium: false, isPartner: false, isAdmin, isBotAdmin: true, isBot: false, fromMe: false, isNewsletter: false,
    mentionedJid: group ? [`${BOT}@s.whatsapp.net`] : [], quoted: null, replies,
    async reply(text) { replies.push(String(text)); return { key: { id: "r" } }; },
    async react() { },
  };
}
async function say(opts) {
  const m = message(opts);
  const result = await core.runKernel(m, sock, db, deps);
  return { m, result, text: m.replies.join("\n") };
}

// ═══ 1. وصف الواجهة من بيانات البلوقن ═══
await check("ui-descriptor", async () => {
  const kick = ui.uiOf("طرد");
  assert.equal(kick.destructive, true, "الطرد مدمّر");
  assert.equal(kick.requiresTarget, true);
  assert.equal(kick.eligible, false, "لا زر عام للطرد");
  assert.equal(kick.mode, "confirm-after-target", "الطرد: تأكيد بعد تحديد الهدف");
  const menu = ui.uiOf("menu");
  assert.equal(menu.eligible, true);
  assert.equal(menu.mode, "select", "القائمة: خيارات محدودة من الاستعمال نفسه");
  assert.ok(menu.options.length >= 2);
  const restart = ui.uiOf("رستارت");
  assert.equal(restart.ownerOnly, true);
  assert.equal(restart.eligible, true, "رستارت ⇒ زر (للمالك)");
  assert.equal(ui.uiOf("شغل").requiresText, true, "«شغل <بحث>» يحتاج نصاً حراً ⇒ لا زر");
  assert.equal(ui.uiOf("شغل").eligible, false);
  assert.equal(ui.uiOf("حذف").requiresReply, true, "«حذف (رد على رسالة)» يحتاج رداً ⇒ لا زر");
  const welcome = ui.uiOf("ترحيب");
  assert.ok(welcome.options.includes("تشغيل") && welcome.options.includes("إيقاف"), "خيارات الترحيب من الاستعمال");
  assert.equal(welcome.adminOnly, true);
});

// ═══ 2. سياسة الأزرار ═══
await check("button-policy", async () => {
  const user = message({});
  assert.equal(ui.buttonFor({ command: "رستارت", m: user }).reason, "permission", "لا زر مالك لغير المالك");
  assert.equal(ui.buttonFor({ command: "رستارت", m: message({ isOwner: true }) }).allowed, true);
  assert.equal(ui.buttonFor({ command: "شغل", m: user }).reason, "needs-text");
  assert.equal(ui.buttonFor({ command: "شغل", args: "عمرو دياب", m: user }).allowed, true, "النص معروف ⇒ زر");
  const admin = message({ group: true, isAdmin: true });
  assert.equal(ui.buttonFor({ command: "طرد", m: admin }).reason, "needs-target");
  assert.equal(ui.buttonFor({ command: "طرد", args: "@201000000077", m: admin }).mode, "confirm", "الهدف معروف ⇒ تأكيد لا زر مباشر");
  assert.equal(ui.resolveResponseMode({ proposed: "buttons", options: [{ command: "menu" }, { command: "بروفايل" }], m: user }).mode, "buttons");
  assert.equal(ui.resolveResponseMode({ proposed: "text", options: [{ command: "menu" }, { command: "بروفايل" }], m: user }).mode, "text", "النموذج طلب نصاً");
  const mixed = ui.resolveResponseMode({ proposed: "buttons", options: [{ command: "menu" }, { command: "طرد", args: "@201000000077" }], m: admin });
  assert.equal(mixed.mode, "text", "خيار مدمّر بين الخيارات ⇒ لا أزرار مباشرة");
  assert.equal(ui.resolveResponseMode({ proposed: "confirm", options: [{ command: "طرد", args: "@201000000077" }], m: admin }).mode, "confirm");
  assert.equal(ui.resolveResponseMode({ proposed: "buttons", options: [{ command: "شغل" }, { command: "menu" }], m: user }).mode, "text", "خيار يحتاج نصاً ⇒ لا أزرار جزئية");
});

// ═══ 3. النواة: اقتراح ⇒ سياسة ⇒ أزرار حقيقية ⇒ ضغط ⇒ تنفيذ عبر الصلاحيات ═══
await check("kernel-clarification-buttons", async () => {
  script = () => ({ decision: "CLARIFICATION", reply: "تقصد أيهما؟", options: [{ command: "menu", args: "" }, { command: "بروفايل", args: "" }], responseMode: "buttons", confidence: 0.5 });
  sent.length = 0;
  await say({ body: "وريني حاجة" });
  assert.deepEqual(lastButtons(), ["terboo_pick_1", "terboo_pick_2"], "أزرار اختيار حقيقية");
  const before = executed.length;
  await say({ body: "terboo_pick_2" });
  assert.equal(executed.length, before + 1, "الضغط نفّذ أمراً واحداً");
  assert.match(executed.at(-1), /^\.(?:بروفايل|profile)/u, "الخيار الثاني عبر الموزّع الحقيقي");
  assert.equal(memory.peekPending(message({})), null, "المعلّق استُهلك");
});

await check("kernel-no-buttons-when-unsafe", async () => {
  script = () => ({ decision: "CLARIFICATION", reply: "أي واحد؟", options: [{ command: "شغل", args: "" }, { command: "menu", args: "" }], responseMode: "buttons", confidence: 0.5 });
  sent.length = 0;
  const r = await say({ body: "اعمل حاجة" });
  assert.equal(lastButtons().length, 0, "خيار يحتاج نصاً ⇒ لا أزرار");
  assert.match(r.text, /2\./, "الخيارات نصاً مرقّمة");
  memory.takePending(r.m);
});

await check("kernel-confirm-buttons", async () => {
  script = () => ({ decision: "COMMAND", command: "menu", args: "", reply: "تقصد القائمة؟", responseMode: "confirm", confidence: 0.3 });
  sent.length = 0;
  await say({ body: "الحاجات" });
  assert.deepEqual(lastButtons(), ["terboo_pick_yes", "terboo_pick_no"], "تأكيد بنعم/لا");
  const before = executed.length;
  const no = await say({ body: "terboo_pick_no" });
  assert.equal(executed.length, before, "لا ⇒ لا تنفيذ");
  assert.match(no.text, /إلغاء|ألغ/u);
  await say({ body: "الحاجات" });
  await say({ body: "terboo_pick_yes" });
  assert.equal(executed.length, before + 1, "نعم ⇒ تنفيذ واحد");
});

await check("kernel-owner-button-hidden", async () => {
  script = () => ({ decision: "COMMAND", command: "رستارت", args: "", reply: "تقصد إعادة التشغيل؟", responseMode: "confirm", confidence: 0.3 });
  sent.length = 0;
  const r = await say({ body: "ريستارت للبوت" });
  assert.equal(lastButtons().length, 0, "غير المالك لا يرى زر أمر مالك");
  memory.takePending(r.m);
});

// ═══ 4. أدوات السحابة ═══
ent.grant({ user: BUYER, vpsId: "101", by: "pn:owner", planId: "std-1" });
ent.grant({ user: BUYER, vpsId: "102", by: "pn:owner", planId: "std-2" });
ent.grant({ user: "201000000099@s.whatsapp.net", vpsId: "777", by: "pn:owner", planId: "std-1" });

await check("cloud-tools-catalog", async () => {
  const buyerTools = (await cloud.cloudToolsFor(message({ sender: BUYER }))).map((x) => x.id);
  assert.ok(buyerTools.includes("vps.restart") && buyerTools.includes("vps.reinstall"));
  assert.ok(!buyerTools.includes("panel.servers"), "بلا لوحات ⇒ لا أدوات لوحات");
  const plain = (await cloud.cloudToolsFor(message({}))).map((x) => x.id);
  assert.ok(!plain.includes("vps.restart"), "بلا VPS ⇒ لا أدوات تحكم");
  assert.ok(plain.includes("vps.plans") && plain.includes("panel.add"));
  const inGroup = (await cloud.cloudToolsFor(message({ sender: BUYER, group: true }))).map((x) => x.id);
  assert.ok(!inGroup.includes("vps.password") && !inGroup.includes("vps.reinstall"), "أدوات الخاص لا تُعرض في مجموعة");
  assert.equal(await cloud.cloudToolsForModel(message({ sender: BUYER }), "ازيك عامل ايه"), "", "طلب لا يخص السحابة ⇒ لا أدوات للنموذج");
  assert.match(await cloud.cloudToolsForModel(message({ sender: BUYER }), "عيد تشغيل السيرفر"), /vps\.restart/);
  assert.ok(cloud.cloudCatalog().notExposed.some((x) => x.id === "panel.users"), "غير المدعوم موثّق لا معروض");
});

await check("cloud-tools-central-permission", async () => {
  // كل أداة سحابية تُقابل إجراءً في محرك الصلاحيات المركزي (لا مسار جانبي)
  assert.equal(cloud.cloudAction("vps.info", cloud.CLOUD_TOOLS["vps.info"]), "vps.user.read");
  assert.equal(cloud.cloudAction("vps.restart", cloud.CLOUD_TOOLS["vps.restart"]), "vps.user.power");
  assert.equal(cloud.cloudAction("vps.reinstall", cloud.CLOUD_TOOLS["vps.reinstall"]), "vps.user.destructive");
  assert.equal(cloud.cloudAction("panel.power", cloud.CLOUD_TOOLS["panel.power"]), "panel.user.write");
  assert.equal(cloud.cloudAction("vps.plans", cloud.CLOUD_TOOLS["vps.plans"]), null, "الباقات عامة");
  for (const [id, tool] of Object.entries(cloud.CLOUD_TOOLS)) {
    const action = cloud.cloudAction(id, tool);
    if (action && /destructive/.test(action)) assert.ok(tool.confirm, `${id}: إجراء مدمّر بلا تأكيد`);
  }
  // حتى لو تجاوز هدفٌ محلّل طبقةَ الاختيار: المحرك يرفض VPS لغيره
  const { decide, principalOf, DECISION } = await import("../src/lib/terboo-permissions.js");
  const principal = await principalOf({ m: message({ sender: BUYER }), sock: null });
  assert.equal(decide({ principal, action: "vps.user.power", resource: { vpsId: "777" } }).decision, DECISION.RESOURCE_NOT_OWNED);
  assert.equal(decide({ principal, action: "vps.user.power", resource: { vpsId: "101" } }).decision, DECISION.ALLOWED);
});

await check("cloud-tool-decision", async () => {
  const before = executed.length;
  script = () => ({ decision: "TOOL", tool: "vps.restart", input: { vpsId: "777", password: "Secret123!" }, confidence: 0.9 });
  const r = await say({ sender: BUYER, body: "ممكن تعمل ريبوت للسيرفر بتاعي" });
  assert.match(calls.at(-1).instruction, /Cloud tools for THIS user/, "أدوات السحابة وصلت للنموذج");
  assert.ok(!/777/.test(executed.slice(before).join(" ")), "VPS لغيره لا يُلمس حتى لو ذكره النموذج");
  assert.equal(executed.length, before + 1);
  assert.match(executed.at(-1), /^\.myvps\s*$/u, "عدة VPS بلا سياق ⇒ قائمة للاختيار (لا تخمين)");
  assert.ok(!/Secret123/.test(executed.join(" ")), "كلمة المرور من النموذج لا تمر أبداً");
  assert.equal(r.result, "answered");
  ctx.remember(r.m, "vps", { vpsId: "102", name: "beta" });
  script = () => ({ decision: "TOOL", tool: "vps.restart", input: {}, confidence: 0.9 });
  await say({ sender: BUYER, body: "ممكن تعمل ريبوت للسيرفر" });
  assert.match(executed.at(-1), /^\.myvps 102 do vps\.restart$/u, "الهدف من السياق ⇒ لوحة VPS نفسها (تأكيد داخلها)");
  script = () => ({ decision: "TOOL", tool: "panel.power", input: { signal: "kill" }, confidence: 0.9 });
  await say({ body: "ممكن توقف سيرفر اللوحة بالقوة" });
  assert.match(executed.at(-1), /^\.panels\s*$/u, `بلا لوحة ⇒ واجهة اللوحات تشرح (لا تنفيذ): ${executed.at(-1)}`);
});

// ═══ 5. طلبات طبيعية بلا أسماء أوامر ═══
await check("natural-cloud-requests", async () => {
  const calls2 = [];
  const fake = async (_m, _s, request) => { calls2.push(request); return { ok: true, status: "done" }; };
  const run = (m, text) => engine.runActionEngine({ m, sock, text, lang: "ar", deps: { dispatch: fake } });
  assert.equal(await run(message({}), "اعرض الباقات"), "answered");
  assert.deepEqual(calls2.at(-1), { command: "plans", args: "" });
  // «اربط المستخدم … بالـVPS …»: المالك فقط ⇒ أمر الإسناد نفسه (تحقق عند المزوّد + إشعار المشتري)
  const { default: config } = await import("../config.js");
  const owners = config.owner.number;
  config.owner.number = ["201000000777"];
  try {
    const stranger = message({});
    const before = calls2.length;
    assert.equal(await run(stranger, "اربط المستخدم 201012345678 بالـVPS 1234"), "answered");
    assert.equal(calls2.length, before, "غير المالك لا يصل لأمر الإسناد");
    assert.ok(stranger.replies.length, "رفض صريح لا صمت");
    assert.equal(await run(message({ sender: "201000000777@s.whatsapp.net" }), "اربط المستخدم 201012345678 بالـVPS 1234"), "answered");
    assert.deepEqual(calls2.at(-1), { command: "vpsadmin", args: "assign 201012345678 1234" });
  } finally {
    config.owner.number = owners;
  }
  const group = message({ group: true, isAdmin: true });
  assert.equal(await run(group, "ضيف لوحتي"), "answered");
  assert.deepEqual(calls2.at(-1), { command: "panels", args: "add" }, "«ضيف لوحتي» ليست إضافة عضو");
  assert.equal(await run(message({}), "اختبر المفتاح"), "answered");
  assert.deepEqual(calls2.at(-1), { command: "panels", args: "" }, "بلا لوحة معروفة ⇒ قائمة اللوحات");
  const buyer = message({ sender: BUYER });
  assert.equal(await run(buyer, "هات السيرفرات"), "answered");
  assert.deepEqual(calls2.at(-1), { command: "myvps", args: "" });
  // القائمة المعروضة تحدد «التاني»
  ctx.remember(buyer, "list", { kind: "vps", ids: ["101", "102"], names: ["alpha", "beta"] });
  assert.equal(await run(buyer, "شغل السيرفر التاني"), "answered");
  assert.deepEqual(calls2.at(-1), { command: "myvps", args: "102 do vps.start" }, "الثاني في القائمة المعروضة");
  assert.equal(await run(buyer, "عيد تشغيله"), "answered");
  assert.deepEqual(calls2.at(-1), { command: "myvps", args: "102 do vps.restart" }, "«عيد تشغيله» = نفس السيرفر");
  ctx.remember(buyer, "list", { kind: "panel-servers", panelId: "p1", ids: ["a1b2", "c3d4"], names: ["mc", "bot"] });
  assert.equal(await run(buyer, "شغل السيرفر الاول"), "answered");
  assert.deepEqual(calls2.at(-1), { command: "panels", args: "act p1 a1b2 power.start" }, "قائمة سيرفرات لوحة ⇒ أمر اللوحة");
  assert.equal(await run(message({}), "اقفل سيرفر اللوحة"), "answered");
  assert.deepEqual(calls2.at(-1), { command: "panels", args: "" }, "«سيرفر اللوحة» ⇒ اللوحات لا VPS");
  ctx.remember(buyer, "list", { kind: "vps", ids: ["101"], names: ["alpha"] });
  assert.equal(await run(buyer, "شغل السيرفر الخامس"), "answered");
  assert.deepEqual(calls2.at(-1), { command: "myvps", args: "" }, "ترتيب خارج القائمة ⇒ القائمة للاختيار");
});

// ═══ 6. docs/terboo-command-ui-matrix.json مطابق للمحرك الحيّ ═══
await check("matrix-fresh", async () => {
  const doc = JSON.parse(fs.readFileSync(path.join(process.cwd(), "docs", "terboo-command-ui-matrix.json"), "utf8"));
  const live = ui.uiMatrix();
  assert.equal(doc.commands.length, live.length, "كل أمر حيّ في المصفوفة — شغّل node tools/terboo-command-ui-matrix.mjs");
  const byName = new Map(live.map((row) => [row.command, row]));
  for (const row of doc.commands) assert.deepEqual(row, JSON.parse(JSON.stringify(byName.get(row.command))), `صف قديم: ${row.command}`);
  assert.equal(doc.cloudTools.tools.length, Object.keys(cloud.CLOUD_TOOLS).length);
});

console.log(`✅ terboo-smart-buttons: ${results.length} — ${results.join(" · ")}`);
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* مجلد مؤقت */ }
process.exit(0);
