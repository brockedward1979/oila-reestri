/* Umumiy konstantalar va yordamchi funksiyalar */
export const TOIFA = {
  kambagal: { label: 'Kambag‘al oila', short: 'Kambag‘al' },
  chegara: { label: 'Kambag‘allik chegarasidagi oila', short: 'Chegarada' },
  davlat: { label: 'Davlat ta’minotidagi oila', short: 'Davlat ta’minoti' },
};
export const TAGS = [
  'Ishsiz', 'Rasmiy band', 'Norasmiy band shaxs', 'O‘zini o‘zi band qilgan shaxs', 'Mehnat migranti',
  'Pensioner', 'Maktab o‘quvchisi', 'Maktabgacha ta’lim yoshdagi bola', 'O‘quvchi', 'Talaba',
  'Nogironligi bo‘lgan shaxs', 'Nogironligi bo‘lgan farzandi mavjud', '3 yoshgacha bola parvarishidagi shaxs',
  'Parvarishga muhtoj oila a’zosini qarovchisi', 'Yolg‘iz ona (ota)', 'Boquvchisini yo‘qotgan oila', 'JIEMda', 'Harbiy xizmatda',
];
export const EMPLOYED = ['Rasmiy band', 'Norasmiy band shaxs', 'O‘zini o‘zi band qilgan shaxs', 'Mehnat migranti'];
export const RELATIONS = ['Arizachi', 'Turmush o‘rtog‘i (Xotini)', 'Turmush o‘rtog‘i (Eri)', 'Eri (FHDYO da qayt etilgan)', 'Qizi', 'O‘g‘li',
  'Nevarasi', 'Kelini', 'Kuyovi', 'Otasi', 'Onasi', 'Aka-ukasi', 'Opa-singlisi', 'Vasiy', 'Boshqa'];
export const DISABILITY = ['', 'I guruh', 'II guruh', 'III guruh', 'Nogironligi bo‘lgan bola'];

export const pad = (n) => String(n).padStart(2, '0');
export function parseDMY(s) {
  const m = /^(\d{1,2})[.,/-](\d{1,2})[.,/-](\d{4})$/.exec(String(s || '').trim());
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1], 12);
  return isNaN(d) || d.getDate() !== +m[1] ? null : d;
}
export const fmt = (d) => (d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : '');
export const toISO = (s) => { const d = parseDMY(s); return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : ''; };
export const fromISO = (v) => { if (!v) return ''; const [y, m, d] = v.split('-'); return `${d}.${m}.${y}`; };
export function fromJSH(j) {
  if (!/^\d{14}$/.test(j || '')) return null;
  const c = +j[0];
  const base = { 1: 1800, 2: 1800, 3: 1900, 4: 1900, 5: 2000, 6: 2000 }[c];
  if (!base) return null;
  const day = +j.slice(1, 3);
  const d = new Date(base + +j.slice(5, 7), +j.slice(3, 5) - 1, day, 12);
  if (d.getDate() !== day) return null;
  return { dob: d, jins: c % 2 ? 'Erkak' : 'Ayol' };
}
export function ageOf(d, ref = new Date()) {
  if (!d) return null;
  let a = ref.getFullYear() - d.getFullYear();
  if (ref.getMonth() < d.getMonth() || (ref.getMonth() === d.getMonth() && ref.getDate() < d.getDate())) a--;
  return a;
}
export function info(m) {
  const j = fromJSH(m.jshshir);
  const dob = parseDMY(m.tugilganSana) || (j && j.dob) || null;
  return { dob, jins: m.jinsi || (j && j.jins) || '', age: ageOf(dob) };
}
export function duration(s) {
  const a = parseDMY(s); if (!a) return '';
  const b = new Date();
  let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
  if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return [y && `${y} yil`, m && `${m} oy`, `${d} kun`].filter(Boolean).join(' ');
}
export const head = (f) => f.azolar.find((m) => m.qarindoshlik === 'Arizachi') || f.azolar[0];
export const has = (m, t) => (m.holat || []).includes(t);
export const norm = (s) => String(s || '').toLowerCase().replace(/[‘’'ʻʼ`]/g, '');
export function titleCase(s) {
  return String(s || '').toLowerCase().replace(/(^|[\s-])(\S)/g, (_, a, b) => a + b.toUpperCase());
}
export const initials = (n) => String(n || '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
export const childrenOf = (f) => f.azolar
  .filter((m) => m.qarindoshlik !== 'Arizachi')
  .filter((m) => { const i = info(m); return /^(Qizi|O‘g‘li)$/.test(m.qarindoshlik) || (i.age != null && i.age < 18); })
  .sort((a, b) => (info(a).dob || 0) - (info(b).dob || 0));

/* ───────────── Ko'rsatkichlar ───────────── */
export const STATS = [
  { group: 'Oilalar', items: [
    { k: 'oila', label: 'Jami oilalar', fam: () => true },
    { k: 'kambagal', label: 'Kambag‘al oilalar', fam: (f) => f.toifa === 'kambagal', tone: 'k' },
    { k: 'chegara', label: 'Kambag‘allik chegarasidagi', fam: (f) => f.toifa === 'chegara', tone: 'c' },
    { k: 'davlat', label: 'Davlat ta’minotidagi', fam: (f) => f.toifa === 'davlat', tone: 'd' },
  ] },
  { group: 'Oila a’zolari', items: [
    { k: 'azo', label: 'Jami oila a’zolari', mem: () => true },
    { k: 'ayol', label: 'Ayollar', mem: (m, i) => i.jins === 'Ayol' },
    { k: 'erkak', label: 'Erkaklar', mem: (m, i) => i.jins === 'Erkak' },
    { k: 'u18', label: '18 yoshgacha bolalar', mem: (m, i) => i.age != null && i.age < 18 },
  ] },
  { group: 'Bolalar', items: [
    { k: 'bogchagacha', label: 'Bog‘cha yoshiga yetmagan (0–2)', mem: (m, i) => i.age != null && i.age < 3 },
    { k: 'bogcha', label: 'Bog‘cha yoshidagi (3–6)', mem: (m, i) => i.age != null && i.age >= 3 && i.age <= 6 },
    { k: 'maktab', label: 'Maktab o‘quvchilari', mem: (m) => has(m, 'Maktab o‘quvchisi') },
    { k: 'talaba', label: 'Talaba va o‘quvchilar', mem: (m) => has(m, 'Talaba') || has(m, 'O‘quvchi') },
  ] },
  { group: 'Bandlik', items: [
    { k: 'band', label: 'Ish bilan ta’minlangan', mem: (m) => EMPLOYED.some((t) => has(m, t)) },
    { k: 'ishsiz', label: 'Ishsizlar', mem: (m) => has(m, 'Ishsiz') },
    { k: 'migrant', label: 'Mehnat migrantlari', mem: (m) => has(m, 'Mehnat migranti') },
    { k: 'pensioner', label: 'Pensionerlar', mem: (m) => has(m, 'Pensioner') },
  ] },
  { group: 'Ijtimoiy holat', items: [
    { k: 'nogiron', label: 'Nogironligi bor', mem: (m) => !!m.nogironlik || has(m, 'Nogironligi bo‘lgan shaxs') },
    { k: 'yolgiz', label: 'Yolg‘iz ona (ota)', mem: (m) => has(m, 'Yolg‘iz ona (ota)') },
    { k: 'parvarish', label: '3 yoshgacha bola parvarishida', mem: (m) => has(m, '3 yoshgacha bola parvarishidagi shaxs') },
    { k: 'jiem', label: 'JIEMda', mem: (m) => has(m, 'JIEMda') },
  ] },
];
export const STAT_BY_KEY = Object.fromEntries(STATS.flatMap((g) => g.items).map((s) => [s.k, s]));
export function countStat(s, fams) {
  if (s.fam) return fams.filter(s.fam).length;
  let n = 0;
  for (const f of fams) for (const m of f.azolar) if (s.mem(m, info(m))) n++;
  return n;
}
export const memberHit = (s, m) => !!(s && s.mem && s.mem(m, info(m)));

export const withDerived = (m) => {
  const j = fromJSH(m.jshshir);
  return j ? { ...m, tugilganSana: m.tugilganSana || fmt(j.dob), jinsi: m.jinsi || j.jins } : m;
};
export const emptyMember = () => ({ fio: '', qarindoshlik: '', jshshir: '', tugilganSana: '', jinsi: '', holat: [], nogironlik: '', oquvJoyi: '', sinf: '', ishJoyi: '', telefon: '', izoh: '', extra: {} });

export const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function famSummary(f) {
  const c = (k) => f.azolar.filter((m) => STAT_BY_KEY[k].mem(m, info(m))).length;
  return [
    { l: 'Oila a’zolari', v: f.azolar.length }, { l: '18 yoshgacha', v: c('u18') }, { l: 'Maktab o‘quvchilari', v: c('maktab') },
    { l: 'Bog‘cha yoshidagi', v: c('bogcha') }, { l: 'Ish bilan band', v: c('band') }, { l: 'Ishsiz', v: c('ishsiz') },
  ];
}
export const sortedMembers = (f) => [...f.azolar].sort((a, b) => (b.qarindoshlik === 'Arizachi') - (a.qarindoshlik === 'Arizachi') || (info(a).dob || 0) - (info(b).dob || 0));

export const DEFAULT_SETTINGS = { stdMahalla: 'ЖАЛОИЛ МФЙ', stdSheet: 'Лист1', defaultMahalla: 'Jaloil MFY', stdColor: '1' };

/** Telefonni +998 XX XXX XX XX ko'rinishiga keltiradi (yozish davomida). */
export function formatPhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 9 && !d.startsWith('998')) d = '998' + d;
  d = d.slice(0, 12);
  const p = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)].filter(Boolean);
  return '+' + p.join(' ');
}

/* ───────────── Filtrlar ─────────────
   Bir guruh ichidagi belgilar "yoki" bilan, turli guruhlar "va" bilan birlashadi. */
const ageOfM = (m) => info(m).age;
/** Farzandlar: arizachidan boshqa, "Qizi"/"O‘g‘li" yoki 18 yoshgacha bo'lgan a'zolar. */
export const kidsOf = (f) => f.azolar.filter((m) => m.qarindoshlik !== 'Arizachi'
  && (/^(Qizi|O‘g‘li)$/.test(m.qarindoshlik) || (ageOfM(m) != null && ageOfM(m) < 18)));
const kidAge = (f, lo, hi) => kidsOf(f).some((m) => { const a = ageOfM(m); return a != null && a >= lo && a <= hi; });
const anyMember = (f, k) => f.azolar.some((m) => STAT_BY_KEY[k].mem(m, info(m)));

export const FILTER_GROUPS = [
  { k: 'toifa', title: 'Oila toifasi', opts: [
    { k: 'kambagal', label: 'Kambag‘al oila', test: (f) => f.toifa === 'kambagal', tone: 'k' },
    { k: 'chegara', label: 'Kambag‘allik chegarasidagi oila', test: (f) => f.toifa === 'chegara', tone: 'c' },
    { k: 'davlat', label: 'Davlat ta’minotidagi oila', test: (f) => f.toifa === 'davlat', tone: 'd' },
  ] },
  { k: 'bola', title: 'Farzandlari bo‘yicha', opts: [
    { k: 'b02', label: 'Bog‘cha yoshiga yetmagan farzandi bor', hint: '0–2 yosh', test: (f) => kidAge(f, 0, 2) },
    { k: 'b36', label: 'Bog‘cha yoshidagi farzandi bor', hint: '3–6 yosh', test: (f) => kidAge(f, 3, 6) },
    { k: 'b717', label: 'Maktab yoshidagi farzandi bor', hint: '7–17 yosh', test: (f) => kidAge(f, 7, 17) },
    { k: 'b18', label: 'Voyaga yetgan farzandi bor', hint: '18 yosh va katta', test: (f) => kidAge(f, 18, 200) },
    { k: 'b3', label: 'Ko‘p bolali oila', hint: '18 yoshgacha 3 va undan ko‘p bola', test: (f) => kidsOf(f).filter((m) => { const a = ageOfM(m); return a != null && a < 18; }).length >= 3 },
    { k: 'b0', label: 'Farzandi yo‘q', hint: 'tarkibda farzand ko‘rsatilmagan', test: (f) => kidsOf(f).length === 0 },
  ] },
  { k: 'azo', title: 'Oila a’zolari orasida', opts: [
    { k: 'ishsiz', label: 'Ishsiz bor', test: (f) => anyMember(f, 'ishsiz') },
    { k: 'migrant', label: 'Mehnat migranti bor', test: (f) => anyMember(f, 'migrant') },
    { k: 'nogiron', label: 'Nogironligi bor a’zo bor', test: (f) => anyMember(f, 'nogiron') },
    { k: 'pensioner', label: 'Pensioner bor', test: (f) => anyMember(f, 'pensioner') },
    { k: 'yolgiz', label: 'Yolg‘iz ona (ota)', test: (f) => anyMember(f, 'yolgiz') },
    { k: 'parvarish', label: '3 yoshgacha bola parvarishida', test: (f) => anyMember(f, 'parvarish') },
    { k: 'jiem', label: 'JIEMda a’zosi bor', test: (f) => anyMember(f, 'jiem') },
  ] },
  { k: 'size', title: 'Oila tarkibi', opts: [
    { k: 's12', label: '1–2 kishi', test: (f) => f.azolar.length <= 2 },
    { k: 's34', label: '3–4 kishi', test: (f) => f.azolar.length >= 3 && f.azolar.length <= 4 },
    { k: 's5', label: '5 kishi va undan ko‘p', test: (f) => f.azolar.length >= 5 },
  ] },
  { k: 'gap', title: 'To‘ldirilmagan ma’lumot', opts: [
    { k: 'notel', label: 'Telefon raqami yo‘q', test: (f) => !f.telefon },
    { k: 'noaddr', label: 'Manzili yo‘q', test: (f) => !f.manzil },
    { k: 'noschool', label: 'O‘qish joyi kiritilmagan o‘quvchi bor', test: (f) => f.azolar.some((m) => STAT_BY_KEY.maktab.mem(m, info(m)) && !m.oquvJoyi) },
    { k: 'nophoto', label: 'Rasmi yo‘q', test: (f) => !f.rasm },
  ] },
];
export const FILTER_OPT = Object.fromEntries(FILTER_GROUPS.flatMap((g) => g.opts.map((o) => [o.k, { ...o, group: g.k }])));
export const emptyFilters = () => Object.fromEntries(FILTER_GROUPS.map((g) => [g.k, []]));
export const activeFilterKeys = (flt) => FILTER_GROUPS.flatMap((g) => flt[g.k] || []);

/** skipGroup berilsa, shu guruhni hisobga olmaydi (variantlar yonidagi sonlarni hisoblash uchun). */
export function applyFilters(fams, flt, skipGroup) {
  return fams.filter((f) => FILTER_GROUPS.every((g) => {
    if (g.k === skipGroup) return true;
    const sel = flt[g.k] || [];
    return !sel.length || sel.some((k) => FILTER_OPT[k].test(f));
  }));
}

/** Tanlovni odam o'qiydigan qilib yozadi: "Kambag‘al oila · Maktab yoshidagi farzandi bor". */
export function describeSelection(flt, q, statKey) {
  const parts = FILTER_GROUPS.map((g) => (flt[g.k] || []).map((k) => FILTER_OPT[k].label).join(' yoki ')).filter(Boolean);
  if (q) parts.push(`“${q}” qidiruvi`);
  if (statKey && STAT_BY_KEY[statKey]) parts.push(STAT_BY_KEY[statKey].label);
  return parts.length ? parts.join(' · ') : 'Barcha oilalar';
}
