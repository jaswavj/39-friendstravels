import React, { useEffect, useRef } from 'react';
import './ExpenseVoucher.css';

export type ExpenseCompany = { shopName?: string; address?: string };
export type ExpenseVoucherData = {
  id?: number;
  date: string;
  busName: string;
  customerName: string;
  phone: string;
  area: string;
  qty?: number;
  amount: number;
  content: string;
  typeName?: string;
  paid?: boolean;
};

const inr = (v?: number) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const qtyText = (v?: number) => {
  const n = Number(v || 0);
  if (!n) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

export const formatVoucherDate = (value?: string) => {
  const raw = String(value || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return raw || '—';
};

const dash = (v?: string) => {
  const s = String(v || '').trim();
  return s || '—';
};

const VOUCHER_CSS = `
@page { size: A5 portrait; margin: 8mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
.exv-sheet {
  width: 148mm;
  min-height: 200mm;
  margin: 0 auto;
  padding: 8mm 8mm 7mm;
  color: #122033;
  font-family: "Segoe UI", Arial, sans-serif;
  background: #fff;
  page-break-after: always;
}
.exv-sheet:last-child { page-break-after: auto; }
.exv-frame {
  position: relative;
  border: 2px solid #1b365d;
  min-height: 184mm;
  display: flex;
  flex-direction: column;
}
.exv-paid {
  position: absolute;
  right: 16px;
  bottom: 28px;
  border: 3px solid #15803d;
  color: #15803d;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 5px;
  padding: 2px 18px;
  transform: rotate(-16deg);
  border-radius: 6px;
  background: rgba(255,255,255,.86);
}
.exv-head {
  text-align: center;
  padding: 12px 14px 10px;
  border-bottom: 2px solid #1b365d;
  background: #f4f7fb;
}
.exv-co {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #1b365d;
  line-height: 1.2;
}
.exv-addr {
  margin-top: 8px;
  font-size: 15px;
  line-height: 1.45;
  color: #334155;
  white-space: pre-line;
}
.exv-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1.5px solid #1b365d;
  font-size: 16px;
}
.exv-meta div {
  padding: 10px 14px;
}
.exv-meta div + div { border-left: 1px solid #cbd5e1; }
.exv-meta span {
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .8px;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 3px;
}
.exv-meta strong { font-size: 17px; }
.exv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}
.exv-table th {
  background: #1b365d;
  color: #fff;
  font-size: 13px;
  letter-spacing: .7px;
  text-transform: uppercase;
  padding: 9px 10px;
  text-align: left;
  font-weight: 700;
}
.exv-table th.num, .exv-table td.num { text-align: right; }
.exv-table th.sno, .exv-table td.sno { width: 38px; text-align: center; }
.exv-table th.qty, .exv-table td.qty { width: 58px; text-align: center; }
.exv-table th.amt, .exv-table td.amt { width: 92px; }
.exv-table td {
  border-bottom: 1px solid #dbe3ee;
  padding: 12px 10px;
  vertical-align: top;
}
.exv-part { line-height: 1.6; }
.exv-part .to {
  font-size: 18px;
  font-weight: 800;
  color: #1b365d;
}
.exv-part .to em {
  font-style: normal;
  font-weight: 700;
  color: #64748b;
  font-size: 14px;
  margin-right: 6px;
}
.exv-part .line { color: #334155; font-size: 15px; }
.exv-part .k { color: #64748b; font-weight: 700; font-size: 14px; }
.exv-fill td { height: 32px; border-bottom: 1px dashed #e2e8f0; }
.exv-total-row td {
  background: #f4f7fb;
  border-top: 2px solid #1b365d;
  border-bottom: none;
  font-weight: 800;
  font-size: 16px;
  padding: 11px 10px;
}
.exv-content {
  margin: 12px 14px 16px;
  border: 1px solid #cbd5e1;
  min-height: 64px;
  padding: 10px 12px;
}
.exv-content span {
  display: block;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .8px;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 6px;
}
.exv-content p {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.exv-paid-inline { color: #15803d; }
@media print {
  html, body { background: #fff !important; }
  .exv-sheet { width: auto; min-height: 0; padding: 0; }
  .exv-frame { min-height: 0; }
  .exv-table th, .exv-head, .exv-total-row td, .exv-paid {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

export const ExpenseVoucherSheet: React.FC<{ voucher: ExpenseVoucherData; company: ExpenseCompany }> = ({
  voucher,
  company,
}) => (
  <div className="exv-sheet">
    <div className="exv-frame">
      <div className="exv-head">
        <div className="exv-co">{dash(company.shopName)}</div>
        {company.address ? <div className="exv-addr">{company.address}</div> : null}
      </div>
      <div className="exv-meta">
        <div>
          <span>Date</span>
          <strong>{formatVoucherDate(voucher.date)}</strong>
        </div>
        <div>
          <span>Bus Name</span>
          <strong>{dash(voucher.busName)}</strong>
        </div>
      </div>
      <table className="exv-table">
        <thead>
          <tr>
            <th className="sno">S.No</th>
            <th>Particulars</th>
            <th className="qty">Qty</th>
            <th className="amt num">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="sno">1</td>
            <td>
              <div className="exv-part">
                <div className="to"><em>To</em>{dash(voucher.customerName)}</div>
                <div className="line"><span className="k">Area</span> {dash(voucher.area)}</div>
                <div className="line"><span className="k">Phone</span> {dash(voucher.phone)}</div>
              </div>
            </td>
            <td className="qty">{qtyText(voucher.qty)}</td>
            <td className="amt num">{inr(voucher.amount)}</td>
          </tr>
          <tr className="exv-fill"><td /><td /><td /><td /></tr>
          <tr className="exv-fill"><td /><td /><td /><td /></tr>
          <tr className="exv-total-row">
            <td colSpan={3} style={{ textAlign: 'right' }}>
              Total{voucher.paid ? <span className="exv-paid-inline"> · PAID</span> : ''}
            </td>
            <td className="num">{inr(voucher.amount)}</td>
          </tr>
        </tbody>
      </table>
      <div className="exv-content">
        <span>Content</span>
        <p>{dash(voucher.content)}</p>
      </div>
      {voucher.paid ? <div className="exv-paid">PAID</div> : null}
    </div>
  </div>
);

const printFrom = (node: HTMLElement | null) => {
  if (!node) return;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>Expense Voucher</title><style>${VOUCHER_CSS}</style></head><body>${node.innerHTML}</body></html>`);
  doc.close();
  const run = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 800);
  };
  if (iframe.contentDocument?.readyState === 'complete') {
    window.setTimeout(run, 120);
  } else {
    iframe.onload = run;
  }
};

type PreviewProps = {
  vouchers: ExpenseVoucherData[];
  company: ExpenseCompany;
  onClose: () => void;
  autoPrint?: boolean;
};

export const ExpenseVoucherPreview: React.FC<PreviewProps> = ({ vouchers, company, onClose, autoPrint }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => printFrom(ref.current), 280);
    return () => window.clearTimeout(t);
  }, [autoPrint, vouchers]);

  return (
    <div className="exv-host no-print" onClick={onClose}>
      <div className="exv-box" onClick={(e) => e.stopPropagation()}>
        <div className="exv-bar">
          <button className="mst-btn mst-btn-primary" type="button" onClick={() => printFrom(ref.current)}>
            <i className="fas fa-print" /> Print A5
          </button>
          <button className="mst-btn mst-btn-outline" type="button" onClick={onClose}>Close</button>
        </div>
        <div ref={ref}>
          {vouchers.map((voucher, i) => (
            <ExpenseVoucherSheet key={`${voucher.id || 'n'}-${i}`} voucher={voucher} company={company} />
          ))}
        </div>
      </div>
    </div>
  );
};
