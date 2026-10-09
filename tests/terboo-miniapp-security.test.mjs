// ═══════════════════════════════════════════════
// 🔐 TERBOO MINI APPS — أمان قناة الإجراءات ووكيل الأصول
// ───────────────────────────────────────────────
// 1) وكيل الأصول: رمز موقّع · عبث بالتوقيع · انتهاء · مضيف غير مسموح · http · SVG مرفوض
// 2) قناة الإجراءات: nonce قديم/مكرر · طابع زمني بعيد · لاعب غير مصرَّح · actionId غير قانوني
//    · حمولة ضخمة · حقول قرار خادمي · طلبات متزامنة على نفس الحالة
// 3) لا سرّ ولا JID خام يصل العميل (الرمز والعرض)
// 4) السرية في المجموعة: لاعب لا يرى إجراءات لاعب آخر
// ═══════════════════════════════════════════════

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("❌ فشل الاختبار:", e?.stack || e); process.exit(1); });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "terboo-miniapp-sec-"));
process.env.TERBOO_TASKS_PATH = path.join(tmp, "tasks.json");
process.env.TERBOO_PUBLIC_IP = "127.0.0.1";
delete process.env.TERBOO_SITE_URL;
const config = (await import("../config.js")).default;
config.bot.primaryNumber = "201111111177";
config.website.url = "";
const { initDatabase, getDatabase } = await import("../src/lib/terboo-database.js");
await initDatabase(tmp);
const db = getDatabase();
const { loadPlugins } = await import("../src/lib/terboo-plugins.js");
await loadPlugins(path.join(process.cwd(), "plugins"));
const { loadArcade } = await import("../src/lib/terboo-arcade/index.js");
await loadArcade();
const E = await import("../src/lib/terboo-arcade/engine.js");
const { memoryRepository } = await import("../src/lib/terboo-arcade/repository.js");
E.configure({ repository: memoryRepository(), wallet: { credit() {} } });
const W = await import("../src/lib/terboo-arcade/web.js");
const AS = await import("../src/lib/terboo-arcade/assets.js");
const site = await import("../src/lib/terboo-website.js");
const ctl = await import("../src/lib/terboo-web-control.js");

const port = 28000 + Math.floor(Math.random() * 12000);
site.saveOverrides({ port, url: null, ssl: null });
assert.equal((await ctl.startSite({})).ok, true, "الموقع اشتغل");
await new Promise((r) => setTimeout(r, 120));
const BASE = `http://127.0.0.1:${port}`;

let seat = 0;
const player = () => {
  const jid = `2018888${String(++seat).padStart(5, "0")}@s.whatsapp.net`;
  db.setUser(jid, { language: "ar", name: `P${seat}` });
  return jid;
};
function room(gameId, opts = {}) {
  const jid = player();
  const made = E.createRoom({ gameId, chat: `sec-${gameId}-${seat}@s.whatsapp.net`, isGroup: false, host: { jid, name: "P" }, vsAI: true, difficulty: "EASY", options: { lang: "ar" }, ...opts });
  assert.equal(made.ok, true, `${gameId}: ${made.code || ""}`);
  return { room: made.room, jid, token: W.issuePlayToken(made.room, jid) };
}
const post = (p, body, headers = {}) => fetch(`${BASE}${p}`, {
  method: "POST", headers: { "Content-Type": "application/json", "X-Terboo-Arcade": "1", ...headers }, body: JSON.stringify(body),
});

// ─────────────── 1) وكيل الأصول ───────────────
{
  const good = "https://flagpedia.net/data/flags/w702/af.png";
  const tok = AS.issueAssetToken(good, { sessionId: "s1" });
  assert.ok(tok, "رمز أصل لمضيف مسموح");
  assert.equal(AS.verifyAssetToken(tok)?.url, good, "يفك الرمز الصحيح");

  // عبث بالتوقيع
  assert.equal(AS.verifyAssetToken(`${tok.slice(0, -2)}xx`), null, "توقيع معبوث به مرفوض");
  // عبث بالحمولة (تبديل العنوان مع الاحتفاظ بالـMAC)
  const [body, mac] = tok.split(".");
  const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  const forgedBody = Buffer.from(JSON.stringify({ ...claims, u: "https://evil.example/x.png" })).toString("base64url");
  assert.equal(AS.verifyAssetToken(`${forgedBody}.${mac}`), null, "تبديل العنوان يكسر التوقيع");
  // منتهٍ
  assert.equal(AS.verifyAssetToken(AS.issueAssetToken(good, { ttlMs: -1000 })), null, "رمز منتهٍ مرفوض");
  // مضيفات/بروتوكولات مرفوضة ⇒ لا يُصدر رمز إطلاقاً
  for (const bad of ["https://evil.example/x.png", "http://flagpedia.net/x.png", "file:///etc/passwd",
    "https://127.0.0.1/x.png", "https://169.254.169.254/latest/meta-data", "javascript:alert(1)", "", null]) {
    assert.equal(AS.issueAssetToken(bad), "", `لا رمز لمصدر غير مسموح: ${String(bad).slice(0, 40)}`);
  }
  assert.equal(AS.allowedSource("https://FLAGPEDIA.NET/a.png")?.hostname, "flagpedia.net", "المضيف غير حساس للحالة");
  // SVG ليس نوعاً مسموحاً (ينفّذ سكربت)
  assert.equal(AS.ALLOWED_TYPES.has("image/svg+xml"), false, "SVG مرفوض كنوع أصل");
  assert.equal(AS.ALLOWED_TYPES.has("text/html"), false, "HTML مرفوض كنوع أصل");

  // عبر HTTP: رمز باطل ⇒ 401، ورمز لا يفك ⇒ ليس 200
  let res = await fetch(`${BASE}/api/v1/arcade/asset/${"z".repeat(40)}`);
  assert.equal(res.status, 401, "رمز أصل باطل ⇒ 401");
  res = await fetch(`${BASE}/api/v1/arcade/asset/${tok}`, { method: "POST" });
  // 415 من حارس JSON الخارجي أو 405 من المسار نفسه — كلاهما رفض صحيح
  assert.ok([405, 415].includes(res.status), `POST على الأصل مرفوض (${res.status})`);
  // الوكيل ليس مفتوحاً: لا يمكن بناء رمز لمضيف غير مدرج
  assert.equal(AS.ALLOWED_HOSTS.has("evil.example"), false, "قائمة المضيفات مغلقة");
}

// ─────────────── 2) قناة الإجراءات ───────────────
{
  const { room: r, token, jid } = room("xo");
  const view = (await (await fetch(`${BASE}/api/v1/arcade/s/${token}`)).json()).data;
  assert.equal(view.gameId, "xo");
  assert.doesNotMatch(JSON.stringify(view), /whatsapp\.net/, "لا JID خام في العرض");
  assert.doesNotMatch(JSON.stringify(view), /webSecret|assetSecret/, "لا أسرار في العرض");

  // حركة مقبولة
  let out = await (await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload: { cell: 4 }, nonce: view.nonce, timestamp: Date.now() })).json();
  assert.equal(out.data.accepted, true, "حركة صحيحة مقبولة");
  // نفس الـnonce مرة ثانية ⇒ قديم
  out = await (await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload: { cell: 0 }, nonce: view.nonce, timestamp: Date.now() })).json();
  assert.equal(out.data.code, "stale", "إعادة استخدام nonce مرفوضة");
  const fresh = (await (await fetch(`${BASE}/api/v1/arcade/s/${token}`)).json()).data;
  // nonce مُختلق
  out = await (await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload: { cell: 1 }, nonce: "ZZZZZZZZ", timestamp: Date.now() })).json();
  assert.equal(out.data.code, "bad-nonce", "nonce مُختلق مرفوض");
  // طابع زمني بعيد
  out = await (await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload: { cell: 1 }, nonce: fresh.nonce, timestamp: Date.now() - 20 * 60 * 1000 })).json();
  assert.equal(out.data.code, "expired-action", "طابع زمني بعيد مرفوض");
  // حقول قرار خادمي
  for (const payload of [{ cell: 1, winner: 0 }, { cell: 1, score: 99 }, { cell: 1, turn: 0 }, { cell: 1, state: {} }, { cell: 1, balance: 1 }, { cell: 1, koin: 1 }]) {
    const f = (await (await fetch(`${BASE}/api/v1/arcade/s/${token}`)).json()).data;
    out = await (await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload, nonce: f.nonce, timestamp: Date.now() })).json();
    assert.equal(out.data.code, "forbidden-field", `حقل قرار خادمي مرفوض: ${Object.keys(payload).join(",")}`);
  }
  // actionId غير قانوني شكلاً
  for (const bad of ["../../etc", "a".repeat(120), "place;drop", "<script>"]) {
    const f = (await (await fetch(`${BASE}/api/v1/arcade/s/${token}`)).json()).data;
    out = await (await post(`/api/v1/arcade/s/${token}/action`, { actionId: bad, payload: { cell: 1 }, nonce: f.nonce, timestamp: Date.now() })).json();
    assert.ok(["bad-actionId", "illegal", "bad-shape"].includes(out.data?.code), `actionId مرفوض (${bad.slice(0, 12)}): ${out.data?.code}`);
  }
  // حمولة ضخمة ⇒ يرفضها الخادم قبل المحرك. حدّ جسم طلبات الأركيد 8KB، وقد يُغلق
  // الخادم الاتصال بدل قراءة 200KB — وهذا رفض صحيح أيضاً (حماية من الإنهاك).
  let hugeOutcome = "connection-refused";
  try {
    const huge = await post(`/api/v1/arcade/s/${token}/action`, { actionId: "place", payload: { cell: 1, pad: "x".repeat(200000) }, nonce: fresh.nonce, timestamp: Date.now() });
    hugeOutcome = `status-${huge.status}`;
    assert.ok([400, 413, 415, 200].includes(huge.status), `حمولة ضخمة لا تُسقط الخادم (${huge.status})`);
    if (huge.status === 200) assert.notEqual((await huge.json()).data.accepted, true, "حمولة ضخمة غير مقبولة");
  } catch (error) {
    assert.match(String(error?.message || error), /fetch failed|socket|ECONNRESET|terminated/i, `رفض الحمولة الضخمة بإغلاق الاتصال: ${error?.message}`);
  }
  // الخادم ما زال يخدم بعد الحمولة الضخمة (لم يسقط)
  const alive = await fetch(`${BASE}/health`);
  assert.equal(alive.status, 200, `الخادم حيّ بعد حمولة ضخمة (${hugeOutcome})`);

  // رمز لاعب آخر لا يصلح لهذه الغرفة
  const other = room("xo");
  const cross = await (await post(`/api/v1/arcade/s/${other.token}/action`, { actionId: "place", payload: { cell: 0 }, nonce: fresh.nonce, timestamp: Date.now() })).json();
  assert.notEqual(cross.data?.accepted, true, "رمز غرفة أخرى لا ينفّذ حركة هنا");

  // متزامن: عشر حركات على نفس النسخة ⇒ واحدة فقط تُقبل (قفل الغرفة)
  const f2 = (await (await fetch(`${BASE}/api/v1/arcade/s/${token}`)).json()).data;
  const open = f2.actions.filter((a) => a.id === "place").slice(0, 10);
  if (open.length >= 2) {
    const results = await Promise.all(open.map((a) => post(`/api/v1/arcade/s/${token}/action`, { actionId: a.id, payload: a.payload, nonce: f2.nonce, timestamp: Date.now() }).then((x) => x.json())));
    const accepted = results.filter((x) => x.data?.accepted).length;
    assert.equal(accepted, 1, `طلبات متزامنة على نفس النسخة: قُبلت ${accepted} بدل 1`);
  }
  // الغرفة ما زالت متسقة
  const board = E.getState(r.roomId).game.board;
  assert.equal(board.filter((x) => x !== null).length <= 9, true, "اللوحة متسقة بعد التزامن");
  assert.ok(jid);
}

// ─────────────── 3) الرمز لا يحمل هوية خاماً ───────────────
{
  const { token } = room("xo");
  const [body] = token.split(".");
  const raw = Buffer.from(body, "base64url").toString("utf8");
  assert.doesNotMatch(raw, /whatsapp\.net/, "الرمز بلا JID خام");
  assert.doesNotMatch(raw, /2018888/, "الرمز بلا رقم هاتف");
}

// ─────────────── 4) سرية المجموعة: لا كشف إجراءات الآخر ───────────────
{
  const host = player();
  const guest = player();
  const made = E.createRoom({ gameId: "rps", chat: "120363000000000999@g.us", isGroup: true, host: { jid: host, name: "H" }, options: { lang: "ar" } });
  assert.equal(made.ok, true, `rps group: ${made.code || ""}`);
  const joined = E.joinRoom(made.room.roomId, { jid: guest, name: "G" });
  assert.equal(joined.ok, true, `join: ${joined.code || ""}`);
  const vHost = E.getView(made.room.roomId, { viewerJid: host, lang: "ar" });
  const vGuest = E.getView(made.room.roomId, { viewerJid: guest, lang: "ar" });
  // حجر/ورقة/مقص: اختيار سري ⇒ لا يظهر اختيار لاعب في عرض الآخر
  const hostToken = W.issuePlayToken(made.room, host);
  const pick = vHost.actions[0];
  if (pick) {
    const res = await E.applyAction({ gameId: "rps", sessionId: made.room.sessionId, actionId: pick.id, actor: E.idOf(host), nonce: vHost.nonce, timestamp: Date.now(), payload: pick.payload, source: "html" });
    assert.equal(res.ok, true, `rps move: ${res.code || ""}`);
    const pubGuest = JSON.stringify(W.publicView(E.getState(made.room.roomId), 1, "ar"));
    const chosen = String(pick.payload?.c ?? pick.payload?.move ?? "");
    if (chosen) assert.doesNotMatch(pubGuest, new RegExp(`"(?:choice|pick|move)":"?${chosen}`), "اختيار المضيف السري لا يظهر للخصم");
  }
  assert.ok(vGuest);
  assert.ok(hostToken);
}

await ctl.stopSite?.({}).catch(() => {});
console.log("✅ terboo-miniapp-security: وكيل الأصول (توقيع · عبث · انتهاء · مضيف مغلق · لا SVG/HTML · 405) · قناة الإجراءات (stale · bad-nonce · expired · 6 حقول قرار · actionId · حمولة ضخمة · رمز غريب · تزامن ⇒ 1) · رمز بلا هوية خام · سرية الاختيار في المجموعة");
process.exit(0);
