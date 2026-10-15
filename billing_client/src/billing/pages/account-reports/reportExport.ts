export type ExcelCol = { key: string; label: string; num?: boolean };
export type ExcelSheet = { name: string; columns: ExcelCol[]; rows: any[] };

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const te = new TextEncoder();

const u16 = (n: number) => {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
};
const u32 = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
};

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  parts.forEach((p) => {
    out.set(p, o);
    o += p.length;
  });
  return out;
};

const zipStore = (files: { name: string; data: string }[]) => {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file) => {
    const name = te.encode(file.name);
    const data = te.encode(file.data);
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
      name, data,
    ]);
    locals.push(local);
    centrals.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  });
  const central = concat(centrals);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return concat([...locals, central, end]);
};

const xml = (s: any) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const sheetName = (name: string, i: number) => {
  const clean = name.replace(/[\\/?*[\]]/g, ' ').slice(0, 28).trim() || `Sheet${i + 1}`;
  return clean;
};

const cellXml = (value: any, num?: boolean) => {
  if (num) {
    const n = Number(value);
    return `<c t="n"><v>${Number.isFinite(n) ? n : 0}</v></c>`;
  }
  return `<c t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
};

const sheetXml = (sheet: ExcelSheet) => {
  const header = `<row r="1">${sheet.columns.map((c) => cellXml(c.label)).join('')}</row>`;
  const body = sheet.rows.map((row, i) => (
    `<row r="${i + 2}">${sheet.columns.map((c) => cellXml(row[c.key], c.num)).join('')}</row>`
  )).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${header}${body}</sheetData>
</worksheet>`;
};

export const downloadXlsx = (filename: string, sheets: ExcelSheet[]) => {
  const used = sheets.filter((s) => s.columns.length > 0);
  if (used.length === 0) return;
  const names = used.map((s, i) => sheetName(s.name, i));
  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${names.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}
  </sheets>
</workbook>`,
    },
    ...used.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ];
  const blob = new Blob([zipStore(files)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const printReport = () => {
  document.body.classList.add('report-printing');
  const done = () => {
    document.body.classList.remove('report-printing');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.setTimeout(() => window.print(), 80);
};
