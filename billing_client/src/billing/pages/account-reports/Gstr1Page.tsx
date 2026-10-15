import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { accountApi, accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import '../master/Master.css';
import { n2, today } from './reportHelpers';
import ReportActions from './ReportActions';
import { ExcelCol, ExcelSheet } from './reportExport';

type Col = ExcelCol & { total?: boolean };
type Gstr1Data = {
  from: string;
  to: string;
  companyGstin: string;
  totals: { taxable: number; igst: number; cgst: number; sgst: number };
  b2b: any[];
  b2cl: any[];
  b2cs: any[];
  nilRated: any[];
  hsn: any[];
  documents: any[];
};

const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const B2B: Col[] = [
  { key: 'gstin', label: 'GSTIN' },
  { key: 'customer', label: 'Receiver' },
  { key: 'billNo', label: 'Invoice No' },
  { key: 'date', label: 'Invoice Date' },
  { key: 'pos', label: 'Place of Supply' },
  { key: 'invoiceType', label: 'Invoice Type' },
  { key: 'invoiceValue', label: 'Invoice Value', num: true, total: true },
  { key: 'rate', label: 'Rate %', num: true },
  { key: 'taxable', label: 'Taxable Value', num: true, total: true },
  { key: 'igst', label: 'IGST', num: true, total: true },
  { key: 'cgst', label: 'CGST', num: true, total: true },
  { key: 'sgst', label: 'SGST', num: true, total: true },
  { key: 'cess', label: 'Cess', num: true, total: true },
];
const B2CL: Col[] = [
  { key: 'billNo', label: 'Invoice No' },
  { key: 'date', label: 'Invoice Date' },
  { key: 'pos', label: 'Place of Supply' },
  { key: 'invoiceValue', label: 'Invoice Value', num: true, total: true },
  { key: 'rate', label: 'Rate %', num: true },
  { key: 'taxable', label: 'Taxable Value', num: true, total: true },
  { key: 'igst', label: 'IGST', num: true, total: true },
  { key: 'cess', label: 'Cess', num: true, total: true },
];
const B2CS: Col[] = [
  { key: 'type', label: 'Type' },
  { key: 'pos', label: 'Place of Supply' },
  { key: 'rate', label: 'Rate %', num: true },
  { key: 'taxable', label: 'Taxable Value', num: true, total: true },
  { key: 'igst', label: 'IGST', num: true, total: true },
  { key: 'cgst', label: 'CGST', num: true, total: true },
  { key: 'sgst', label: 'SGST', num: true, total: true },
  { key: 'cess', label: 'Cess', num: true, total: true },
];
const NIL: Col[] = [
  { key: 'description', label: 'Description' },
  { key: 'nilRated', label: 'Nil Rated', num: true, total: true },
  { key: 'exempted', label: 'Exempted', num: true, total: true },
  { key: 'nonGst', label: 'Non-GST', num: true, total: true },
];
const HSN: Col[] = [
  { key: 'hsn', label: 'HSN' },
  { key: 'description', label: 'Description' },
  { key: 'uqc', label: 'UQC' },
  { key: 'qty', label: 'Total Qty', num: true, total: true },
  { key: 'rate', label: 'Rate %', num: true },
  { key: 'taxable', label: 'Taxable Value', num: true, total: true },
  { key: 'igst', label: 'IGST', num: true, total: true },
  { key: 'cgst', label: 'CGST', num: true, total: true },
  { key: 'sgst', label: 'SGST', num: true, total: true },
  { key: 'cess', label: 'Cess', num: true, total: true },
];
const DOCS: Col[] = [
  { key: 'nature', label: 'Nature of Document' },
  { key: 'srFrom', label: 'Sr. No. From' },
  { key: 'srTo', label: 'Sr. No. To' },
  { key: 'total', label: 'Total Number', num: true },
  { key: 'cancelled', label: 'Cancelled', num: true },
];

const Section: React.FC<{ title: string; note?: string; columns: Col[]; rows: any[] }> = ({ title, note, columns, rows }) => (
  <div className="mst-card" style={{ marginBottom: 12 }}>
    <div className="mst-card-h">{title}</div>
    {note && <div className="mst-note" style={{ padding: '8px 14px 0' }}>{note}</div>}
    <div className="mst-table-wrap">
      <table className="mst-table mst-table-wide">
        <thead>
          <tr>
            <th>#</th>
            {columns.map((c) => <th key={c.key} className={c.num ? 'num' : undefined}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length + 1} className="mst-empty">No records.</td></tr>}
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              {columns.map((c) => (
                <td key={c.key} className={c.num ? 'num' : undefined}>
                  {c.num ? n2(row[c.key]) : (row[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {rows.length > 0 && columns.some((c) => c.total) && (
            <tr>
              <td><strong>Total</strong></td>
              {columns.map((c) => (
                <td key={c.key} className={c.num ? 'num' : undefined}>
                  {c.total ? <strong>{n2(rows.reduce((s, r) => s + Number(r[c.key] || 0), 0))}</strong> : ''}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const gstrSheets = (data: Gstr1Data): ExcelSheet[] => [
  {
    name: 'Summary',
    columns: [
      { key: 'label', label: 'Particulars' },
      { key: 'value', label: 'Amount' },
    ],
    rows: [
      { label: 'Taxable Value', value: data.totals.taxable },
      { label: 'IGST', value: data.totals.igst },
      { label: 'CGST', value: data.totals.cgst },
      { label: 'SGST', value: data.totals.sgst },
      { label: 'GSTIN', value: data.companyGstin },
      { label: 'Period', value: `${data.from} to ${data.to}` },
    ],
  },
  { name: 'B2B', columns: B2B, rows: data.b2b },
  { name: 'B2CL', columns: B2CL, rows: data.b2cl },
  { name: 'B2CS', columns: B2CS, rows: data.b2cs },
  { name: 'Nil Rated', columns: NIL, rows: data.nilRated },
  { name: 'HSN', columns: HSN, rows: data.hsn },
  { name: 'Documents', columns: DOCS, rows: data.documents },
];

const Gstr1Page: React.FC = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<Gstr1Data | null>(null);

  const search = async () => {
    try {
      setData(accountData<Gstr1Data>(await accountApi.gstr1(from, to)));
    } catch (err) {
      toast.error(accountError(err, 'Could not load GSTR-1'));
    }
  };

  return (
    <div className="mst-page gstr1-page">
      <h2 className="mst-title no-print"><i className="fas fa-file-alt" /> GSTR-1</h2>
      <div className="mst-card gstr1-filters no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate GSTR-1</button>
            <ReportActions disabled={!data} filename={`GSTR-1_${from}_${to}`} sheets={data ? gstrSheets(data) : []} />
          </div>
        </div>
      </div>
      {data && (
        <div className="report-print-area">
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-h">Outward supplies {data.from} — {data.to}</div>
            <div className="mst-card-b">
              <div className="mst-note" style={{ marginBottom: 10 }}>
                Tax invoices only. GSTIN: {data.companyGstin || 'Not set in Company Details'}.
              </div>
              <table className="mst-table">
                <thead>
                  <tr>
                    <th className="num">Taxable Value</th>
                    <th className="num">IGST</th>
                    <th className="num">CGST</th>
                    <th className="num">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="num"><strong>{n2(data.totals.taxable)}</strong></td>
                    <td className="num"><strong>{n2(data.totals.igst)}</strong></td>
                    <td className="num"><strong>{n2(data.totals.cgst)}</strong></td>
                    <td className="num"><strong>{n2(data.totals.sgst)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <Section title="4 — B2B (supplies to registered persons)" note="Invoices where the customer GSTIN is 15 characters." columns={B2B} rows={data.b2b} />
          <Section title="5 — B2C Large (inter-state unregistered, invoice over ₹1,00,000)" columns={B2CL} rows={data.b2cl} />
          <Section title="7 — B2C Others (rate-wise)" note="Unregistered counter sales, including intra-state and inter-state invoices up to ₹1,00,000. Type OE = other than e-commerce." columns={B2CS} rows={data.b2cs} />
          <Section title="8 — Nil rated / exempt / non-GST" columns={NIL} rows={data.nilRated} />
          <Section title="12 — HSN-wise summary of outward supplies" columns={HSN} rows={data.hsn} />
          <Section title="13 — Documents issued" columns={DOCS} rows={data.documents} />
        </div>
      )}
    </div>
  );
};

export default Gstr1Page;
