/* Formatlangan Excel fayllar: rangli sarlavha, chegaralar, dd.mm.yyyy sanalar, toifa ranglari. */

const COLOR = {
  head: 'FF0A6C88', headText: 'FFFFFFFF', line: 'FFB9C6C3', outer: 'FF33424D', zebra: 'FFF3F7F6',
  title: 'FF16202A', muted: 'FF5A6670', label: 'FFEAF2F4',
};
export const TOIFA_STYLE = {
  kambagal: { fill: 'FFFBEFD3', font: 'FF8A5A00' },
  chegara: { fill: 'FFDCF1E5', font: 'FF17734A' },
  davlat: { fill: 'FFFBE4E1', font: 'FFB3261E' },
};
const FONT = 'Arial';
const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

export async function newWorkbook() {
  const mod = await import('exceljs');
  const ExcelJS = mod.default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Oila reestri';
  wb.created = new Date();
  return wb;
}

/** Brauzerdagi Date -> Excel uchun vaqt zonasiz sana (aks holda bir kun siljishi mumkin). */
const excelDate = (d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

function textLen(v) {
  if (v instanceof Date) return 10;
  return String(v ?? '').split('\n').reduce((m, s) => Math.max(m, s.length), 0);
}

/**
 * Jadval yozadi: sarlavha (rangli, baland), ma'lumot qatorlari, barcha kataklarga ingichka chegara
 * va butun jadval atrofiga qalin tashqi chegara.
 * styleCell(rowIndex, colIndex) -> { fill, font } (masalan, toifa ranglari uchun).
 */
export function addTable(ws, { header, rows, startRow = 1, styleCell, center = [] }) {
  const n = header.length;
  const hr = ws.getRow(startRow);
  header.forEach((h, i) => {
    const c = hr.getCell(i + 1);
    c.value = h;
    c.font = { name: FONT, size: 11, bold: true, color: { argb: COLOR.headText } };
    c.fill = solid(COLOR.head);
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  hr.height = 36;

  rows.forEach((r, ri) => {
    const row = ws.getRow(startRow + 1 + ri);
    for (let ci = 0; ci < n; ci++) {
      const c = row.getCell(ci + 1);
      const v = r[ci];
      const isDate = v instanceof Date;
      c.value = isDate ? excelDate(v) : v === undefined || v === null ? '' : v;
      if (isDate) c.numFmt = 'dd.mm.yyyy';
      c.font = { name: FONT, size: 10 };
      c.alignment = { vertical: 'middle', wrapText: true, horizontal: isDate || typeof v === 'number' || center.includes(ci) ? 'center' : 'left' };
      if (ri % 2) c.fill = solid(COLOR.zebra);
      const extra = styleCell?.(ri, ci);
      if (extra) {
        if (extra.fill) c.fill = solid(extra.fill);
        if (extra.font) c.font = { ...c.font, bold: true, color: { argb: extra.font } };
      }
    }
  });

  const last = startRow + rows.length;
  for (let r = startRow; r <= last; r++) {
    for (let ci = 1; ci <= n; ci++) {
      const thin = { style: 'thin', color: { argb: COLOR.line } };
      const thick = { style: 'medium', color: { argb: COLOR.outer } };
      ws.getRow(r).getCell(ci).border = {
        top: r === startRow ? thick : thin,
        bottom: r === last ? thick : thin,
        left: ci === 1 ? thick : thin,
        right: ci === n ? thick : thin,
      };
    }
  }

  header.forEach((h, i) => {
    const longest = Math.max(Math.min(textLen(h), 22) * 0.95, ...rows.slice(0, 300).map((r) => textLen(r[i]) * 1.12));
    const col = ws.getColumn(i + 1);
    col.width = Math.max(col.width || 0, Math.min(50, Math.max(7, Math.ceil(longest) + 3)));
  });
  if (rows.length) ws.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow, column: n } };
  return last;
}

/** Sarlavha (katta, birlashtirilgan katakda) va ixtiyoriy kichik izoh qatori. */
export function addTitle(ws, row, text, width, sub) {
  ws.mergeCells(row, 1, row, Math.max(1, width));
  const c = ws.getCell(row, 1);
  c.value = text;
  c.font = { name: FONT, size: 15, bold: true, color: { argb: COLOR.title } };
  c.alignment = { vertical: 'middle' };
  ws.getRow(row).height = 28;
  if (sub) {
    ws.mergeCells(row + 1, 1, row + 1, Math.max(1, width));
    const s = ws.getCell(row + 1, 1);
    s.value = sub;
    s.font = { name: FONT, size: 10, color: { argb: COLOR.muted } };
    return row + 2;
  }
  return row + 1;
}

/** Ikki ustunli "nomi: qiymati" jadvali (oila ma'lumotnomasi uchun). */
export function addKeyValues(ws, startRow, pairs, styleValue) {
  pairs.forEach(([k, v], i) => {
    const row = ws.getRow(startRow + i);
    const a = row.getCell(1);
    const b = row.getCell(2);
    a.value = k;
    a.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.muted } };
    a.fill = solid(COLOR.label);
    b.value = v instanceof Date ? excelDate(v) : v ?? '';
    if (v instanceof Date) b.numFmt = 'dd.mm.yyyy';
    b.font = { name: FONT, size: 10 };
    b.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    const extra = styleValue?.(k);
    if (extra) { b.fill = solid(extra.fill); b.font = { ...b.font, bold: true, color: { argb: extra.font } }; }
    const last = i === pairs.length - 1;
    const thin = { style: 'thin', color: { argb: COLOR.line } };
    const thick = { style: 'medium', color: { argb: COLOR.outer } };
    a.border = { top: i === 0 ? thick : thin, bottom: last ? thick : thin, left: thick, right: thin };
    b.border = { top: i === 0 ? thick : thin, bottom: last ? thick : thin, left: thin, right: thick };
  });
  return startRow + pairs.length - 1;
}

export async function saveWorkbook(wb, filename) {
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

export function saveBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
