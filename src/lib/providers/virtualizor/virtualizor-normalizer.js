// ═══════════════════════════════════════════════
// ☁️ Virtualizor — تطبيع الردود إلى نموذج Terboo VPS
// ───────────────────────────────────────────────
// يحوّل ردود الواجهة (listvs · vpsmanage · ostemplate · services · vnc · backup)
// إلى كائنات ثابتة الشكل، ويحذف كل ما يكشف المزوّد أو البنية الداخلية
// (اسم السيرفر الفيزيائي · serid · روابط اللوحة · بريد الحساب).
// ═══════════════════════════════════════════════

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** حالة موحّدة من حقول Virtualizor المتعددة */
function statusOf(raw = {}) {
  if (String(raw.suspended ?? "") === "1" || raw.suspended === true) return "suspended";
  const value = raw.status ?? raw.vps_status ?? raw.state;
  if (value === 1 || value === "1" || /^(running|online|on|started)$/i.test(String(value))) return "running";
  if (value === 0 || value === "0" || /^(stopped|offline|off|shutdown)$/i.test(String(value))) return "stopped";
  if (value === 2 || value === "2" || /suspend/i.test(String(value))) return "suspended";
  return "unknown";
}

/** عناوين IP من أي شكل (مصفوفة · كائن مفهرس · نص) */
function ipsOf(raw) {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : typeof raw === "object" ? Object.values(raw) : String(raw).split(/[\s,]+/);
  return [...new Set(values.map((item) => (typeof item === "object" ? item?.ip || item?.ipaddress : item)).map((ip) => String(ip || "").trim()).filter((ip) => /^[0-9a-f:.]+(\/\d+)?$/i.test(ip)))];
}

/** سجل VPS واحد (من listvs أو info.vps) */
function normalizeVps(raw = {}, id = null) {
  const vpsId = String(raw.vpsid ?? raw.vid ?? id ?? "").trim();
  return {
    vpsId,
    name: String(raw.vps_name ?? raw.name ?? "").trim(),
    hostname: String(raw.hostname ?? "").trim(),
    status: statusOf(raw),
    ips: ipsOf(raw.ips ?? raw.ip),
    ramMb: num(raw.ram),
    cores: num(raw.cores ?? raw.cpu_cores),
    diskGb: num(raw.space ?? raw.disk),
    bandwidthGb: num(raw.bandwidth),
    os: String(raw.os_name ?? raw.os?.name ?? raw.distro ?? "").trim(),
    virt: String(raw.virt ?? "").trim(),
  };
}

/** listvs ⇒ قائمة VPS (الرد مفهرس بالمعرّف، أحياناً تحت vs) */
function normalizeList(json = {}) {
  const container = json.vs && typeof json.vs === "object" ? json.vs : json;
  return Object.entries(container)
    .filter(([, value]) => value && typeof value === "object" && (value.vpsid !== undefined || value.hostname !== undefined))
    .map(([key, value]) => normalizeVps(value, key))
    .filter((vps) => /^\d+$/.test(vps.vpsId));
}

/** vpsmanage ⇒ تفاصيل VPS */
function normalizeInfo(json = {}) {
  const info = json.info || {};
  const vps = info.vps || {};
  const bandwidth = info.bandwidth || {};
  return {
    ...normalizeVps({ ...vps, hostname: info.hostname ?? vps.hostname, ips: info.ip ?? vps.ips, status: info.status ?? vps.status, vpsid: info.vpsid ?? json.vpsid ?? vps.vpsid, os_name: info.os?.name ?? info.os ?? vps.os_name, virt: info.virt ?? vps.virt }),
    uptime: String(info.uptime ?? "").trim(),
    bandwidthUsedGb: num(bandwidth.used ?? bandwidth.usage),
    bandwidthLimitGb: num(bandwidth.limit ?? vps.bandwidth),
    ipCount: num(info.ip_count) ?? null,
  };
}

/** ostemplate ⇒ قوالب أنظمة التشغيل المتاحة [{osid,name,distro}] */
function normalizeTemplates(json = {}) {
  const out = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.osid !== undefined && node.name) {
      out.push({ osid: String(node.osid), name: String(node.name), distro: String(node.distro || "").toLowerCase() });
      return;
    }
    for (const value of Object.values(node)) visit(value);
  };
  visit(json.oslist || {});
  return out.filter((item, index, list) => /^\d+$/.test(item.osid) && list.findIndex((x) => x.osid === item.osid) === index);
}

/** services ⇒ {services, running, autostart} أسماء خدمات فقط */
function normalizeServices(json = {}) {
  const names = (value) => (Array.isArray(value) ? value : value && typeof value === "object" ? Object.keys(value).concat(Object.values(value).filter((v) => typeof v === "string")) : []).map(String).filter((s) => /^[\w@.-]{1,64}$/.test(s));
  return { services: [...new Set(names(json.services))].sort(), running: [...new Set(names(json.running))].sort(), autostart: [...new Set(names(json.autostart))].sort() };
}

/** vnc ⇒ معلومات الاتصال (كلمة المرور تُعاد منفصلة ولا تُخزَّن) */
function normalizeVnc(json = {}) {
  const info = json.info || json.vnc || json;
  return { ip: String(info.ip || "").trim(), port: num(info.port), password: info.password ? String(info.password) : "", novnc: Boolean(info.novnc) };
}

/** backup ⇒ قائمة النسخ والحدود */
function normalizeBackups(json = {}) {
  return {
    list: (Array.isArray(json.backups_list) ? json.backups_list : Object.keys(json.backups_list || {})).map(String),
    backupLimit: num(json.backup_limit),
    restoreLimit: num(json.restore_limit),
    backupUsed: num(json.backup_used),
    restoreUsed: num(json.restore_used),
  };
}

/** رسالة النجاح الموثّقة ({done:{msg}}) */
function doneMessage(json = {}) {
  const done = json.done;
  if (!done) return "";
  return typeof done === "string" ? done : String(done.msg || done.message || "").trim();
}

export { doneMessage, ipsOf, normalizeBackups, normalizeInfo, normalizeList, normalizeServices, normalizeTemplates, normalizeVnc, normalizeVps, statusOf };
export default { doneMessage, normalizeBackups, normalizeInfo, normalizeList, normalizeServices, normalizeTemplates, normalizeVnc, normalizeVps };
