// ═══════════════════════════════════════════════
// 🖼️ نصوص الصور المرسومة (Canvas) بلغة المستلم (§30)
// ───────────────────────────────────────────────
// الترجمة عند الإرسال لا تصل إلى النص المرسوم داخل الصورة، لذلك تأخذ
// بطاقات الترحيب والوداع والمستوى ولوحة البنغ لغتها من هنا مباشرة.
// ═══════════════════════════════════════════════

const CANVAS_TEXT = {
  newUser: { ar: "● عضو جديد", en: "● NEW USER", es: "● NUEVO MIEMBRO" },
  joined: { ar: "انضم إلى: {0}", en: "Joined: {0}", es: "Se unió a: {0}" },
  members: { ar: "الأعضاء: #{0}", en: "MEMBERS: #{0}", es: "MIEMBROS: #{0}" },
  memberTag: { ar: "العضو #{0}", en: "Member #{0}", es: "Miembro #{0}" },
  disconnected: { ar: "● غادر", en: "● DISCONNECTED", es: "● DESCONECTADO" },
  left: { ar: "غادر: {0}", en: "Left: {0}", es: "Salió de: {0}" },
  remaining: { ar: "المتبقون: #{0}", en: "REMAINING: #{0}", es: "RESTANTES: #{0}" },
  remainingTag: { ar: "المتبقون #{0}", en: "Remaining #{0}", es: "Restantes #{0}" },
  welcome: { ar: "أهلاً بك", en: "WELCOME", es: "BIENVENIDO" },
  memberJoined: { ar: "عضو جديد", en: "NEW MEMBER", es: "NUEVO MIEMBRO" },
  memberLeft: { ar: "غادر المجموعة", en: "MEMBER LEFT", es: "SALIÓ DEL GRUPO" },
  hello: { ar: "أهلاً وسهلاً", en: "Welcome,", es: "Bienvenido," },
  farewell: { ar: "مع السلامة", en: "Goodbye,", es: "Adiós," },
  newcomer: { ar: "عضو جديد", en: "New member", es: "Nuevo miembro" },
  toGroup: { ar: "في {0}", en: "to {0}", es: "a {0}" },
  goodbye: { ar: "وداعاً", en: "GOODBYE", es: "ADIÓS" },
  fromGroup: { ar: "من {0}", en: "from {0}", es: "de {0}" },
  levelUp: { ar: "ارتقيت مستوى!", en: "LEVEL UP!", es: "¡SUBISTE DE NIVEL!" },
  congrats: { ar: "مبروك يا {0}!", en: "Congratulations, {0}!", es: "¡Felicidades, {0}!" },
  level: { ar: "المستوى", en: "LEVEL", es: "NIVEL" },
  diagnostics: { ar: "{0} - تشخيص النظام", en: "{0} - SYSTEM DIAGNOSTICS", es: "{0} - DIAGNÓSTICO DEL SISTEMA" },
  statusLine: { ar: "الحالة: متصل | المالك: {0}", en: "STATUS: ONLINE | OWNER: {0}", es: "ESTADO: EN LÍNEA | PROPIETARIO: {0}" },
  connection: { ar: "الاتصال: {0}", en: "CONNECTION: {0}", es: "CONEXIÓN: {0}" },
  cores: { ar: "الأنوية:", en: "Cores:", es: "Núcleos:" },
  threads: { ar: "{0} خيط", en: "{0} Threads", es: "{0} hilos" },
  speed: { ar: "السرعة:", en: "Speed:", es: "Velocidad:" },
  memoryUsage: { ar: "استخدام الذاكرة", en: "MEMORY USAGE", es: "USO DE MEMORIA" },
  used: { ar: "المستخدم: {0}", en: "Used: {0}", es: "Usada: {0}" },
  free: { ar: "المتاح: {0}", en: "Free: {0}", es: "Libre: {0}" },
  total: { ar: "الإجمالي: {0}", en: "TOTAL: {0}", es: "TOTAL: {0}" },
  heapUsed: { ar: "Heap المستخدم:", en: "Heap Used:", es: "Heap usado:" },
  heapTotal: { ar: "Heap الإجمالي:", en: "Heap Total:", es: "Heap total:" },
  engine: { ar: "محرك V8:", en: "V8 Engine:", es: "Motor V8:" },
  os: { ar: "النظام:", en: "OS:", es: "SO:" },
  arch: { ar: "المعمارية:", en: "Arch:", es: "Arquitectura:" },
  server: { ar: "الخادم:", en: "Server:", es: "Servidor:" },
  bot: { ar: "البوت:", en: "Bot:", es: "Bot:" },
  latencyPing: { ar: "زمن الاستجابة", en: "LATENCY PING", es: "LATENCIA" },
  cpuProcessor: { ar: "المعالج", en: "CPU PROCESSOR", es: "PROCESADOR" },
  systemLoad: { ar: "حمل النظام", en: "SYSTEM LOAD", es: "CARGA DEL SISTEMA" },
  usedRam: { ar: "الذاكرة المستخدمة", en: "USED RAM", es: "RAM USADA" },
  nodeEngine: { ar: "محرك Node.js", en: "NODE.JS ENGINE", es: "MOTOR NODE.JS" },
  systemSpecs: { ar: "مواصفات النظام", en: "SYSTEM SPECS", es: "ESPECIFICACIONES" },
  uptime: { ar: "مدة التشغيل", en: "UPTIME", es: "TIEMPO ACTIVO" },
  excellent: { ar: "ممتاز", en: "EXCELLENT", es: "EXCELENTE" },
  moderate: { ar: "متوسط", en: "MODERATE", es: "MODERADA" },
  poor: { ar: "ضعيف", en: "POOR", es: "DÉBIL" },
};

const LANGS = new Set(["ar", "en", "es"]);

/**
 * نص صورة بلغة معيّنة مع تعبئة {0} {1}…
 * @param {"ar"|"en"|"es"} lang
 * @param {keyof typeof CANVAS_TEXT} key
 */
function canvasText(lang, key, ...values) {
  const entry = CANVAS_TEXT[key];
  if (!entry) return key;
  const template = entry[LANGS.has(lang) ? lang : "ar"];
  return template.replace(/\{(\d+)\}/g, (match, index) => (values[Number(index)] ?? match));
}

export { CANVAS_TEXT, canvasText };
export default canvasText;
