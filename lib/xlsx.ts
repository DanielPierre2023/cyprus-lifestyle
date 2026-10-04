// lib/xlsx.ts
// ============================================================================
// Minimal, dependency-free Excel (.xlsx) writer + reader — pure Node (zlib), unit-tested.
// Enough for the directory "missing information" workbook (several sheets, bold header
// row, frozen header, filters, column widths, wrapped text, clickable links) and for
// reading back what people fill in: workbooks saved by Excel, Google Sheets, LibreOffice
// or a scraper's "Export → Excel" (shared strings, inline strings, numbers, booleans).
// ============================================================================
import { deflateRawSync, inflateRawSync } from 'node:zlib';

// ---- ZIP (store / deflate) -------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zip(files: { name: string; data: Buffer | string }[]): Buffer {
  const locals: Buffer[] = []; const centrals: Buffer[] = [];
  let offset = 0;
  const d = new Date(); // DOS time
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, 'utf8');
    const comp = deflateRawSync(raw, { level: 6 });
    const name = Buffer.from(f.name, 'utf8');
    const crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += lh.length + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, end]);
}

export function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error('not a zip / xlsx file');
  const entries = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < entries; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
    p += 46 + nlen + elen + clen;
  }
  return out;
}

// ---- Writer ----------------------------------------------------------------------------
export type Cell = string | number | boolean | null | undefined | { text: string; link?: string; style?: 'bold' | 'wrap' | 'title' | 'note' };
export interface Sheet {
  name: string;
  rows: Cell[][];
  widths?: number[];        // characters per column
  header?: boolean;         // first row bold + frozen + filter
  wrap?: boolean;           // wrap text in every cell (guides)
}

const xmlEsc = (s: string) => s
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const colName = (i: number) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const STYLE = { normal: 0, header: 1, wrap: 2, title: 3, link: 4, note: 5, bold: 6 } as const;

function sheetXml(sh: Sheet): { xml: string; links: { ref: string; url: string }[] } {
  const links: { ref: string; url: string }[] = [];
  const rows: string[] = [];
  let maxCol = 0;
  sh.rows.forEach((r, ri) => {
    const cells: string[] = [];
    r.forEach((v, ci) => {
      if (v === null || v === undefined || v === '') return;
      const ref = `${colName(ci)}${ri + 1}`;
      maxCol = Math.max(maxCol, ci + 1);
      const isHead = sh.header && ri === 0;
      if (typeof v === 'number' && Number.isFinite(v)) { cells.push(`<c r="${ref}"${isHead ? ` s="${STYLE.header}"` : ''}><v>${v}</v></c>`); return; }
      if (typeof v === 'boolean') { cells.push(`<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`); return; }
      const o = typeof v === 'object' ? v : { text: String(v) };
      const text = String(o.text ?? '').slice(0, 32000);
      let s: number = isHead ? STYLE.header : sh.wrap ? STYLE.wrap : STYLE.normal;
      if (o.style === 'bold') s = STYLE.bold;
      if (o.style === 'title') s = STYLE.title;
      if (o.style === 'note') s = STYLE.note;
      if (o.style === 'wrap') s = STYLE.wrap;
      if (o.link && /^(https?:|mailto:)/i.test(o.link)) { links.push({ ref, url: o.link }); if (!isHead) s = STYLE.link; }
      const sp = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
      cells.push(`<c r="${ref}" t="inlineStr"${s ? ` s="${s}"` : ''}><is><t${sp}>${xmlEsc(text)}</t></is></c>`);
    });
    rows.push(`<row r="${ri + 1}">${cells.join('')}</row>`);
  });
  const cols = (sh.widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const pane = sh.header ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : '';
  const nCols = Math.max(1, ...sh.rows.map((r) => r.length));
  const filter = sh.header && sh.rows.length > 1 && maxCol ? `<autoFilter ref="A1:${colName(nCols - 1)}${sh.rows.length}"/>` : '';
  const hl = links.length ? `<hyperlinks>${links.map((l, i) => `<hyperlink ref="${l.ref}" r:id="rIdL${i + 1}"/>`).join('')}</hyperlinks>` : '';
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${rows.join('')}</sheetData>${filter}${hl}</worksheet>`;
  return { xml, links };
}

// Styles: 0 normal · 1 header (white on aegean) · 2 wrapped · 3 title · 4 link · 5 note (grey italic) · 6 bold
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF123A4A"/><name val="Calibri"/></font><font><u/><sz val="11"/><color rgb="FF0B57D0"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF5D6873"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123A4A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function definedNames(sheets: Sheet[], names: string[]): string {
  const defs = sheets.map((sh, i) => {
    if (!sh.header || sh.rows.length < 2) return '';
    const cols = Math.max(1, ...sh.rows.map((r) => r.length));
    return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlEsc(names[i]).replace(/'/g, "''")}'!$A$1:$${colName(cols - 1)}$${sh.rows.length}</definedName>`;
  }).join('');
  return defs ? `<definedNames>${defs}</definedNames>` : '';
}

/** Build an .xlsx workbook from sheets. */
export function writeXlsx(sheets: Sheet[]): Buffer {
  const safeName = (n: string, i: number) => (n.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || `Sheet${i + 1}`);
  const files: { name: string; data: string }[] = [];
  const names = sheets.map((s, i) => safeName(s.name, i));
  files.push({ name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` });
  files.push({ name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` });
  files.push({ name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${definedNames(sheets, names)}</workbook>` });
  files.push({ name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` });
  files.push({ name: 'xl/styles.xml', data: STYLES_XML });
  sheets.forEach((sh, i) => {
    const { xml, links } = sheetXml(sh);
    files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: xml });
    if (links.length) {
      files.push({ name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${links.map((l, k) => `<Relationship Id="rIdL${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xmlEsc(l.url)}" TargetMode="External"/>`).join('')}</Relationships>` });
    }
  });
  return zip(files);
}

// ---- Reader ----------------------------------------------------------------------------
const unEsc = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const textOf = (xml: string) => { let out = ''; for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1]; return unEsc(out); };
const colIndex = (ref: string) => { const letters = (ref.match(/^[A-Z]+/i) || [''])[0].toUpperCase(); let n = 0; for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

/** All sheets of a workbook as grids of strings. */
export function readXlsx(buf: Buffer): { name: string; rows: string[][] }[] {
  const files = unzip(buf);
  const get = (n: string) => files.get(n) || files.get(n.replace(/^\//, '')) || null;
  const wb = get('xl/workbook.xml')?.toString('utf8') || '';
  const rels = get('xl/_rels/workbook.xml.rels')?.toString('utf8') || '';
  const target = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1]; let t = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (!id || !t) continue;
    t = t.startsWith('/') ? t.slice(1) : `xl/${t.replace(/^\.\//, '')}`;
    target.set(id, t);
  }
  const shared: string[] = [];
  const sst = get('xl/sharedStrings.xml')?.toString('utf8');
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));
  const out: { name: string; rows: string[][] }[] = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = unEsc(/name="([^"]*)"/.exec(m[0])?.[1] || '');
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1] || /\bid="([^"]+)"/.exec(m[0])?.[1] || '';
    const xml = get(target.get(rid) || '')?.toString('utf8');
    if (!xml) continue;
    const rows: string[][] = [];
    for (const rm of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const rIdx = Number(/\br="(\d+)"/.exec(rm[1])?.[1] || rows.length + 1) - 1;
      const row: string[] = [];
      let auto = 0;
      for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[1]; const inner = cm[2] || '';
        const ref = /\br="([A-Z]+)\d*"/i.exec(attrs)?.[1];
        const ci = ref ? colIndex(ref) : auto;
        auto = ci + 1;
        const t = /\bt="([^"]+)"/.exec(attrs)?.[1] || 'n';
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        let val = '';
        if (t === 's') val = shared[Number(v)] ?? '';
        else if (t === 'inlineStr') val = textOf(inner);
        else if (t === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
        else val = v != null ? unEsc(v) : '';
        row[ci] = val;
      }
      for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = '';
      rows[rIdx] = row;
    }
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    out.push({ name, rows });
  }
  return out;
}

/** A grid with a header row → objects keyed by the (trimmed) header. Leading empty rows are skipped. */
export function gridToObjects(rows: string[][]): Record<string, string>[] {
  const start = rows.findIndex((r) => r.some((c) => String(c || '').trim()));
  if (start < 0) return [];
  const head = rows[start].map((h) => String(h || '').trim());
  return rows.slice(start + 1)
    .filter((r) => r.some((c) => String(c || '').trim()))
    .map((r) => Object.fromEntries(head.map((h, i) => [h || `col${i + 1}`, String(r[i] ?? '').trim()])));
}
