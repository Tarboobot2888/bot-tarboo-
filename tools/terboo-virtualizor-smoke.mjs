#!/usr/bin/env node
// ═══════════════════════════════════════════════
// ☁️ اختبار Terboo VPS الحي (Virtualizor) — يُشغَّل على سيرفر البوت نفسه
// ───────────────────────────────────────────────
// قراءة فقط افتراضياً (لا يغيّر أي VPS):
//   node tools/terboo-virtualizor-smoke.mjs
//     ⇒ list VPS · info · اكتشاف القدرات (قوالب الأنظمة · الخدمات · VNC · النسخ) لأول VPS
//   node tools/terboo-virtualizor-smoke.mjs --vps 123
// الإجراءات الحقيقية تحتاج موافقة صريحة من المالك لكل نوع (تُنفَّذ على VPS تختاره أنت):
//   --approve-power 123        start ثم restart (لا poweroff إلا مع --approve-poweroff)
//   --approve-poweroff 123
//   --approve-hostname 123 new-host.example.com
// لا يُنفَّذ أبداً من هذا السكربت: إعادة تثبيت النظام · استعادة نسخة · تغيير كلمة المرور.
// لا يطبع أي مفتاح أو كلمة مرور أو رابط لوحة؛ التقرير: docs/terboo-virtualizor-live.json
// ═══════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
await import("../src/lib/terboo-secrets-boot.js");
const { callVirtualizor } = await import("../src/lib/providers/virtualizor/virtualizor-client.js");
const { layerSettings, publicSummary } = await import("../src/lib/providers/virtualizor/virtualizor-config.js");
const { discoverCapabilities } = await import("../src/lib/providers/virtualizor/virtualizor-capabilities.js");
const N = await import("../src/lib/providers/virtualizor/virtualizor-normalizer.js");

const report = { at: new Date().toISOString(), layer: publicSummary(layerSettings("enduser")), steps: [] };
const step = async (name, fn) => {
  const t0 = Date.now();
  try {
    const data = await fn();
    report.steps.push({ name, ok: true, ms: Date.now() - t0, ...(data ? { data } : {}) });
    console.log(`✓ ${name}${data?.summary ? ` — ${data.summary}` : ""}`);
    return data;
  } catch (error) {
    report.steps.push({ name, ok: false, ms: Date.now() - t0, error: error?.code || "error", detail: error?.message || "" });
    console.log(`✗ ${name} — ${error?.code || "error"}: ${error?.message || ""}`);
    return null;
  }
};

const s = layerSettings("enduser");
if (!s.enabled) {
  console.log("✗ enduser layer disabled or missing url/apiKey/apiPassword in config.virtualizor.enduser");
  process.exit(1);
}

const list = await step("list VPS (act=listvs)", async () => {
  const items = N.normalizeList(await callVirtualizor(s, { act: "listvs" }));
  return { summary: `${items.length} VPS`, count: items.length, ids: items.map((v) => v.vpsId), statuses: items.map((v) => v.status) };
});
const vpsId = flag("--vps") || list?.ids?.[0];
if (vpsId) {
  await step(`VPS info (act=vpsmanage svs=${vpsId})`, async () => {
    const info = N.normalizeInfo(await callVirtualizor(s, { act: "vpsmanage", query: { svs: vpsId } }));
    return { summary: `${info.status} · ${info.os || "os?"} · ${info.ips.length} IP`, status: info.status, os: info.os, cores: info.cores, ramMb: info.ramMb };
  });
  await step(`capability discovery (read-only probes) svs=${vpsId}`, async () => {
    const caps = await discoverCapabilities(s, vpsId, { force: true });
    const available = Object.entries(caps).filter(([, c]) => c.available).map(([id]) => id);
    return { summary: available.join(", "), caps };
  });
}

const power = flag("--approve-power");
if (power) {
  await step(`start (owner-approved) svs=${power}`, async () => ({ summary: N.doneMessage(await callVirtualizor(s, { act: "start", query: { svs: power, do: 1 }, idempotent: false })) }));
  await step(`restart (owner-approved) svs=${power}`, async () => ({ summary: N.doneMessage(await callVirtualizor(s, { act: "restart", query: { svs: power, do: 1 }, idempotent: false })) }));
}
const off = flag("--approve-poweroff");
if (off) await step(`poweroff (owner-approved) svs=${off}`, async () => ({ summary: N.doneMessage(await callVirtualizor(s, { act: "poweroff", query: { svs: off, do: 1 }, idempotent: false })) }));
const hostVps = flag("--approve-hostname");
if (hostVps) {
  const newhost = args[args.indexOf("--approve-hostname") + 2];
  await step(`hostname (owner-approved) svs=${hostVps}`, async () => ({ summary: N.doneMessage(await callVirtualizor(s, { act: "hostname", query: { svs: hostVps, do: 1 }, post: { changehost: 1, newhost }, idempotent: false })) }));
}

const file = path.join(process.cwd(), "docs", "terboo-virtualizor-live.json");
fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nreport: ${path.relative(process.cwd(), file)} (no secrets)`);
process.exit(report.steps.every((x) => x.ok) ? 0 : 1);
