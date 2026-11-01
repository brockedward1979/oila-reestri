import * as XLSX from 'xlsx';
import {
  TOIFA, STAT_BY_KEY, fmt, parseDMY, info, duration, head, titleCase, initials, childrenOf,
  memberHit, esc, famSummary, sortedMembers,
} from './helpers.js';

export function fieldCatalog(customFields) {
  const nm = (v, o) => (o.titleCase ? titleCase(v) : v || '');
  const famCount = (f, pred) => f.azolar.filter((m) => pred(m, info(m))).length;
  const list = [
    { id: 'no', scope: 'meta', label: '№', get: (c) => c.ri + 1 },
    { id: 'oilaNo', scope: 'meta', label: 'Oila №', get: (c) => c.fi + 1 },
    { id: 'mahalla', scope: 'oila', label: 'Mahalla', get: (c) => c.f.mahalla },
    { id: 'boshliq', scope: 'oila', label: 'Oila boshlig‘i (F.I.Sh.)', get: (c, o) => nm(head(c.f)?.fio, o) },
    { id: 'boshliqJsh', scope: 'oila', label: 'Oila boshlig‘i JSHSHIR', get: (c) => head(c.f)?.jshshir || '' },
    { id: 'boshliqTug', scope: 'oila', label: 'Oila boshlig‘i tug‘ilgan sanasi', get: (c) => info(head(c.f) || {}).dob },
    { id: 'toifa', scope: 'oila', label: 'Toifa', get: (c) => TOIFA[c.f.toifa]?.label || '' },
    { id: 'telefon', scope: 'oila', label: 'Telefon raqami', get: (c) => c.f.telefon },
    { id: 'manzil', scope: 'oila', label: 'Manzil', get: (c) => c.f.manzil },
    { id: 'hujjat', scope: 'oila', label: 'Hujjat raqami', get: (c) => c.f.hujjatRaqami },
    { id: 'reyestrSana', scope: 'oila', label: 'Reyestrga kirgan sana', get: (c) => parseDMY(c.f.reyestrSana) },
    { id: 'muddat', scope: 'oila', label: 'Reyestrda turgan muddat', get: (c) => duration(c.f.reyestrSana) },
    { id: 'savolnoma', scope: 'oila', label: 'Savolnoma ID', get: (c) => c.f.savolnomaId },
    { id: 'daromad', scope: 'oila', label: 'Daromad (so‘m)', get: (c) => Number(c.f.daromad) || 0 },
    { id: 'azoSoni', scope: 'oila', label: 'Oila a’zolari soni', get: (c) => c.f.azolar.length },
    { id: 'u18Soni', scope: 'oila', label: '18 yoshgacha bolalar soni', get: (c) => famCount(c.f, STAT_BY_KEY.u18.mem) },
    { id: 'maktabSoni', scope: 'oila', label: 'Maktab o‘quvchilari soni', get: (c) => famCount(c.f, STAT_BY_KEY.maktab.mem) },
    { id: 'bogchaSoni', scope: 'oila', label: 'Bog‘cha yoshidagilar soni', get: (c) => famCount(c.f, STAT_BY_KEY.bogcha.mem) },
    { id: 'ishsizSoni', scope: 'oila', label: 'Ishsizlar soni', get: (c) => famCount(c.f, STAT_BY_KEY.ishsiz.mem) },
    { id: 'oilaIzoh', scope: 'oila', label: 'Oila izohi', get: (c) => c.f.izoh },
    { id: 'fio', scope: 'azo', label: 'F.I.Sh.', get: (c, o) => nm(c.m.fio, o) },
    { id: 'qarindoshlik', scope: 'azo', label: 'Qarindoshlik darajasi', get: (c) => c.m.qarindoshlik },
    { id: 'jshshir', scope: 'azo', label: 'JSHSHIR', get: (c) => c.m.jshshir },
    { id: 'tugilgan', scope: 'azo', label: 'Tug‘ilgan sanasi', get: (c) => info(c.m).dob },
    { id: 'yosh', scope: 'azo', label: 'Yoshi', get: (c) => info(c.m).age ?? '' },
    { id: 'jinsi', scope: 'azo', label: 'Jinsi', get: (c) => info(c.m).jins },
    { id: 'holat', scope: 'azo', label: 'Holati', get: (c) => (c.m.holat || []).join(', ') },
    { id: 'nogironlik', scope: 'azo', label: 'Nogironlik guruhi', get: (c) => c.m.nogironlik },
    { id: 'oquvJoyi', scope: 'azo', label: 'Qayerda o‘qiydi', get: (c) => c.m.oquvJoyi },
    { id: 'sinf', scope: 'azo', label: 'Sinf / kurs', get: (c) => c.m.sinf },
    { id: 'ishJoyi', scope: 'azo', label: 'Ish joyi', get: (c) => c.m.ishJoyi },
    { id: 'azoTelefon', scope: 'azo', label: 'A’zo telefoni', get: (c) => c.m.telefon },
    { id: 'azoIzoh', scope: 'azo', label: 'A’zo izohi', get: (c) => c.m.izoh },
  ];
  for (const cf of customFields) {
    list.push({
      id: 'x.' + cf.id, scope: cf.scope, label: cf.label, custom: true,
      get: (c) => {
        const v = (cf.scope === 'oila' ? c.f.extra : c.m?.extra)?.[cf.id] ?? '';
        if (cf.type === 'date') return parseDMY(v) || v;
        if (cf.type === 'number') return v === '' ? '' : Number(v);
        return v;
      },
    });
  }
  return list;
}
export function downloadSheet(sheets, filename) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows, { cellDates: true, dateNF: 'dd\\.mm\\.yyyy' });
    ws['!cols'] = s.rows[0].map((_, ci) => ({
      wch: Math.min(48, Math.max(6, ...s.rows.slice(0, 200).map((r) => {
        const v = r[ci]; return v instanceof Date ? 11 : String(v ?? '').length + 2;
      }))),
    }));
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true });
  saveBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}
export function saveBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export const today = () => fmt(new Date()).replace(/\./g, '-');

export function exportStandard(fams, settings) {
  const ord = ['Birinchi', 'Ikkinchi', 'Uchinchi', "To'rtinchi", 'Beshinchi', 'Oltinchi', 'Yettinchi', 'Sakkizinchi', "To'qqizinchi", "O'ninchi", "O'n birinchi", "O'n ikkinchi"];
  const kidsAll = fams.map(childrenOf);
  const maxK = Math.min(12, Math.max(4, ...kidsAll.map((k) => k.length)));
  const header = ['№', 'Mahalla', 'Reyestrdagi shaxs Ism familiyasi', 'Telefon raqami'];
  for (let k = 0; k < maxK; k++) header.push(`${ord[k]} farzand ism familiyasi`, "Tug'ilgan sanasi", "Qayerda o'qiydi (to'liq yozing)");
  const rows = [header];
  fams.forEach((f, i) => {
    const r = [i + 1, settings.stdMahalla || f.mahalla, titleCase(head(f)?.fio), f.telefon || ''];
    kidsAll[i].slice(0, maxK).forEach((m) => r.push(m.fio, info(m).dob || '', m.oquvJoyi || ''));
    rows.push(r);
  });
  const byMfy = {};
  fams.forEach((f, i) => {
    const key = settings.stdMahalla || f.mahalla;
    byMfy[key] = byMfy[key] || { o: 0, k: 0 }; byMfy[key].o++; byMfy[key].k += kidsAll[i].length;
  });
  const svod = [['№', 'МФЙ', 'Oilalar soni', 'Farzandlar soni']];
  Object.entries(byMfy).forEach(([k, v], i) => svod.push([i + 1, k, v.o, v.k]));
  svod.push(['', 'Jami', fams.length, kidsAll.reduce((a, k) => a + k.length, 0)]);
  downloadSheet([{ name: settings.stdSheet || 'Лист1', rows }, { name: 'Свод', rows: svod }], `Standart_jadval_${today()}.xlsx`);
}

export function famFacts(f, customFields) {
  const h = head(f) || {}; const hi = info(h);
  return [
    ['JSHSHIR', h.jshshir], ['Tug‘ilgan sana', fmt(hi.dob)], ['Toifa', TOIFA[f.toifa]?.label], ['Mahalla', f.mahalla],
    ['Telefon', f.telefon], ['Manzil', f.manzil], ['Hujjat raqami', f.hujjatRaqami], ['Reyestrga kirgan sana', f.reyestrSana],
    ['Reyestrda turgan muddat', duration(f.reyestrSana)], ['Savolnoma ID', f.savolnomaId],
    ['Daromad', `${Number(f.daromad || 0).toLocaleString('ru-RU')} so‘m`],
    ...customFields.filter((c) => c.scope === 'oila').map((c) => [c.label, f.extra?.[c.id]]),
  ];
}
export const MEMBER_COLS = ['№', 'F.I.Sh.', 'Qarindoshlik', 'Tug‘ilgan sana', 'Yoshi', 'Jinsi', 'JSHSHIR', 'Holati', 'O‘qish / ish joyi', 'Nogironlik'];
export const memberCells = (m, i) => {
  const x = info(m);
  return [i + 1, m.fio, m.qarindoshlik === 'Arizachi' ? 'Oila boshlig‘i' : m.qarindoshlik, fmt(x.dob), x.age ?? '', x.jins,
    m.jshshir, (m.holat || []).join(', '), [m.oquvJoyi, m.sinf, m.ishJoyi].filter(Boolean).join(', '), m.nogironlik];
};
export const docName = (f, ext) => `${titleCase(head(f)?.fio || 'oila').replace(/[^\p{L}\p{N}]+/gu, '_')}_oilasi.${ext}`;

export function famDocHTML(f, customFields) {
  const h = head(f) || {};
  const facts = famFacts(f, customFields).filter(([, v]) => v);
  return `<div class="fdoc">
  <header class="fd-h"><div><p class="fd-mfy">${esc(f.mahalla)}</p><h1>Oila ma’lumotnomasi</h1></div>
  <div class="fd-meta"><span class="fd-toifa fd-${f.toifa}">${esc(TOIFA[f.toifa]?.label)}</span><span>Tayyorlangan sana: ${fmt(new Date())}</span></div></header>
  <section class="fd-top">${f.rasm ? `<img src="${f.rasm}" alt="">` : `<div class="fd-noimg">${esc(initials(h.fio))}</div>`}
    <div class="fd-who"><p class="fd-role">Oila boshlig‘i (ariza beruvchi)</p><h2>${esc(h.fio)}</h2>
    <dl class="fd-kv">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></section>
  <section class="fd-sum">${famSummary(f).map((s) => `<div><b>${s.v}</b><span>${esc(s.l)}</span></div>`).join('')}</section>
  <h3>Oila tarkibi, ${f.azolar.length} kishi</h3>
  <table class="fd-t"><thead><tr>${MEMBER_COLS.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
  <tbody>${sortedMembers(f).map((m, i) => `<tr class="${info(m).age != null && info(m).age < 18 ? 'kid' : ''}">${memberCells(m, i).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
  ${f.izoh ? `<p class="fd-note"><b>Izoh:</b> ${esc(f.izoh)}</p>` : ''}
</div>`;
}

export async function famPDF(f, customFields) {
  const html2pdf = (await import('html2pdf.js')).default;
  await html2pdf().set({
    margin: [8, 8, 8, 8], filename: docName(f, 'pdf'), image: { type: 'jpeg', quality: 0.96 },
    html2canvas: { scale: 2, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }, pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.fd-top', '.fd-sum'] },
  }).from(`<div style="background:#fff">${famDocHTML(f, customFields)}</div>`, 'string').save();
}

export async function famDOCX(f, customFields) {
  const d = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun, PageOrientation, ShadingType, BorderStyle, AlignmentType } = d;
  const h = head(f) || {};
  const font = 'Arial';
  const T = (text, o = {}) => new TextRun({ text: String(text ?? ''), font, size: o.size || 20, bold: o.bold, color: o.color });
  const P = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: o.after ?? 60 }, alignment: o.align });
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
  const line = { style: BorderStyle.SINGLE, size: 4, color: 'C9D2CF' };
  const lines = { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line };
  let photo = P(T(''));
  if (f.rasm) {
    const bin = atob(f.rasm.split(',')[1]); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    photo = new Paragraph({ children: [new ImageRun({ data: u8, transformation: { width: 120, height: 156 } })] });
  }
  const facts = famFacts(f, customFields).filter(([, v]) => v);
  const half = Math.ceil(facts.length / 2);
  const kvCell = (arr) => new TableCell({ borders: noBorders, width: { size: 40, type: WidthType.PERCENTAGE },
    children: arr.map(([k, v]) => P([T(k + ': ', { color: '5A6670' }), T(v, { bold: true })])) });
  const top = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: [new TableRow({ children: [
    new TableCell({ borders: noBorders, width: { size: 20, type: WidthType.PERCENTAGE }, children: [photo] }),
    kvCell(facts.slice(0, half)), kvCell(facts.slice(half)),
  ] })] });
  const sum = famSummary(f);
  const sumTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: lines, rows: [new TableRow({ children: sum.map((s) =>
    new TableCell({ shading: { type: ShadingType.CLEAR, fill: 'EEF5F7', color: 'auto' }, children: [P(T(s.v, { bold: true, size: 32 }), { align: AlignmentType.CENTER, after: 0 }), P(T(s.l, { size: 16, color: '5A6670' }), { align: AlignmentType.CENTER })] })) })] });
  const PCT = [4, 20, 12, 9, 5, 6, 12, 16, 10, 6]; const W = (i) => ({ size: Math.round(15398 * PCT[i] / 100), type: WidthType.DXA });
  const hdr = new TableRow({ tableHeader: true, children: MEMBER_COLS.map((c, ci) => new TableCell({ width: W(ci), shading: { type: ShadingType.CLEAR, fill: '16202A', color: 'auto' }, children: [P(T(c, { bold: true, size: 16, color: 'FFFFFF' }), { after: 0 })] })) });
  const rows = sortedMembers(f).map((m, i) => { const kid = info(m).age != null && info(m).age < 18; return new TableRow({ cantSplit: true, children: memberCells(m, i).map((c, ci) => new TableCell({ width: W(ci), shading: kid ? { type: ShadingType.CLEAR, fill: 'EEF7F1', color: 'auto' } : undefined, children: [P(T(c, { size: 16 }), { after: 0 })] })) }); });
  const doc = new Document({ sections: [{
    properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
    children: [
      P(T(f.mahalla, { color: '0A6C88', bold: true, size: 20 })),
      P([T('Oila ma’lumotnomasi', { bold: true, size: 36 })], { after: 40 }),
      P(T(`${TOIFA[f.toifa]?.label || ''}. Tayyorlangan sana: ${fmt(new Date())}`, { color: '5A6670', size: 18 }), { after: 200 }),
      P(T(h.fio, { bold: true, size: 28 })), P(T('Oila boshlig‘i (ariza beruvchi)', { color: '5A6670', size: 18 }), { after: 120 }),
      top, P(T(''), { after: 120 }), sumTable, P(T(''), { after: 120 }),
      P(T(`Oila tarkibi, ${f.azolar.length} kishi`, { bold: true, size: 24 }), { after: 100 }),
      new Table({ width: { size: 15398, type: WidthType.DXA }, columnWidths: PCT.map((x) => Math.round(15398 * x / 100)), borders: lines, rows: [hdr, ...rows] }),
      ...(f.izoh ? [P(T(''), { after: 60 }), P([T('Izoh: ', { bold: true }), T(f.izoh)])] : []),
    ],
  }] });
  saveBlob(await Packer.toBlob(doc), docName(f, 'docx'));
}

export function famXLSX(f, customFields) {
  const h = head(f) || {};
  const rows = [['Oila ma’lumotnomasi'], [f.mahalla], ['Oila boshlig‘i', h.fio], ...famFacts(f, customFields).filter(([, v]) => v), [],
    famSummary(f).map((s) => s.l), famSummary(f).map((s) => s.v), [], ['Oila tarkibi'], MEMBER_COLS,
    ...sortedMembers(f).map((m, i) => { const c = memberCells(m, i); c[3] = info(m).dob || ''; return c; })];
  const width = MEMBER_COLS.length;
  downloadSheet([{ name: 'Oila', rows: rows.map((r) => [...r, ...Array(Math.max(0, width - r.length)).fill('')]) }], docName(f, 'xlsx'));
}

/** "Jadvalni sozlash" oynasidagi tanlangan ustunlar bo'yicha xlsx yaratadi. Qatorlar sonini qaytaradi. */
export function runCustomExport({ families, cfg, cols, customFields, onlyStat }) {
  const byId = Object.fromEntries(fieldCatalog(customFields).map((c) => [c.id, c]));
  const rows = [cols.map((c) => byId[c].label)];
  let ri = 0;
  families.forEach((f, fi) => {
    if (cfg.mode === 'oila') {
      const cx = { f, fi, ri: ri++ };
      rows.push(cols.map((c) => byId[c].get(cx, cfg) ?? ''));
    } else {
      f.azolar.forEach((m) => {
        if (onlyStat?.mem && !memberHit(onlyStat, m)) return;
        const cx = { f, m, fi, ri: ri++ };
        rows.push(cols.map((c) => byId[c].get(cx, cfg) ?? ''));
      });
    }
  });
  const name = cfg.name || 'Jadval';
  downloadSheet([{ name, rows }], `${name.replace(/[^\p{L}\p{N}]+/gu, '_')}_${today()}.xlsx`);
  return rows.length - 1;
}
