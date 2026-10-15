import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { accountApi, accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE, normalizePage } from '../../components/ListPagination';
import '../master/Master.css';
import { n2, n3, sum, today } from './reportHelpers';
import { useBillDetail } from './BillDetailModal';
import ReportActions from './ReportActions';

type Opt = { id: number; name: string };
type Row = {
  billNo: string; date: string; productName: string; qty: number; price: number;
  discount: number; total: number; commissionPerUnit: number; commissionAmount: number;
};

const CommissionReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Opt[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const { openBill, billModal } = useBillDetail();

  useEffect(() => {
    accountApi.commissionCustomers().then((res) => setCustomers(accountData<Opt[]>(res) || [])).catch(() => undefined);
  }, []);

  const search = async (p = 0) => {
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    try {
      const pg = normalizePage(accountData<Row[] | ReturnType<typeof normalizePage<Row>>>(
        await accountApi.commission(from, to, Number(customerId), p, DEFAULT_PAGE_SIZE),
      ));
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
    } catch (err) {
      toast.error(accountError(err, 'Could not load commission report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title no-print"><i className="fas fa-percent" /> Commission Report</h2>
      <div className="mst-card no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Customer</label>
            <select className="mst-sel" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select Commission Customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => search(0)}>Generate Report</button>
            <ReportActions
              disabled={!rows}
              filename={`Commission_${from}_${to}`}
              sheets={[{
                name: 'Commission',
                columns: [
                  { key: 'billNo', label: 'Bill No' }, { key: 'date', label: 'Date' },
                  { key: 'productName', label: 'Product' }, { key: 'qty', label: 'Qty', num: true },
                  { key: 'price', label: 'Price', num: true }, { key: 'discount', label: 'Discount', num: true },
                  { key: 'total', label: 'Total', num: true }, { key: 'commissionPerUnit', label: 'Comm / Unit', num: true },
                  { key: 'commissionAmount', label: 'Commission', num: true },
                ],
                rows: rows || [],
              }]}
            />
          </div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">{from} — {to}</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th><th>Bill No</th><th>Date</th><th>Product</th><th className="num">Qty</th>
                  <th className="num">Price</th><th className="num">Discount</th><th className="num">Total</th>
                  <th className="num">Comm / Unit</th><th className="num">Commission</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={10} className="mst-empty">No records.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={`${row.billNo}-${i}`} className="mst-click-row" onClick={() => openBill(row.billNo)}>
                    <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                    <td>{row.billNo}</td>
                    <td>{row.date}</td>
                    <td>{row.productName}</td>
                    <td className="num">{n3(row.qty)}</td>
                    <td className="num">{n2(row.price)}</td>
                    <td className="num">{n2(row.discount)}</td>
                    <td className="num">{n2(row.total)}</td>
                    <td className="num">{n2(row.commissionPerUnit)}</td>
                    <td className="num">{n2(row.commissionAmount)}</td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr>
                    <td colSpan={7}><strong>Page total</strong></td>
                    <td className="num"><strong>{n2(sum(rows, 'total'))}</strong></td>
                    <td />
                    <td className="num"><strong>{n2(sum(rows, 'commissionAmount'))}</strong></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <ListPagination page={page} size={DEFAULT_PAGE_SIZE} total={total} onChange={(p) => search(p)} />
        </div>
      )}
      {billModal}
    </div>
  );
};

export default CommissionReportPage;
