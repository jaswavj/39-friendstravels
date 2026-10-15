import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE, normalizePage } from '../../components/ListPagination';
import '../master/Master.css';
import { n3, sum, today } from './reportHelpers';
import { useBillDetail } from './BillDetailModal';
import ReportActions from './ReportActions';

type Opt = { id: number; name: string };
type Row = {
  billNo: string; customer: string; qty: number; price: number; discount: number; total: number;
  paid: number; balance: number; pendingBalance: number; productName: string; categoryName: string;
  brandName: string; date: string; time: string; biller: string;
};

type Props = {
  title: string;
  icon: string;
  filterLabel: string;
  loadOptions: () => Promise<any>;
  searchRows: (from: string, to: string, id: number, page: number, size: number) => Promise<any>;
};

const LineSalesReport: React.FC<Props> = ({ title, icon, filterLabel, loadOptions, searchRows }) => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [id, setId] = useState('');
  const [options, setOptions] = useState<Opt[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const { openBill, billModal } = useBillDetail();

  useEffect(() => {
    loadOptions().then((res) => setOptions(accountData<Opt[]>(res) || [])).catch(() => undefined);
  }, [loadOptions]);

  const search = async (p = 0) => {
    if (!id) {
      toast.error(`Please select a ${filterLabel.toLowerCase()}`);
      return;
    }
    try {
      const pg = normalizePage(accountData<Row[] | ReturnType<typeof normalizePage>>(
        await searchRows(from, to, Number(id), p, DEFAULT_PAGE_SIZE),
      ));
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
    } catch (err) {
      toast.error(accountError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title no-print"><i className={icon} /> {title}</h2>
      <div className="mst-card no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>{filterLabel}</label>
            <select className="mst-sel" value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">Select {filterLabel}</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => search(0)}>Generate Report</button>
            <ReportActions
              disabled={!rows}
              filename={`${title.replace(/\s+/g, '_')}_${from}_${to}`}
              sheets={[{
                name: title,
                columns: [
                  { key: 'billNo', label: 'Bill No' }, { key: 'productName', label: 'Product' },
                  { key: 'customer', label: 'Customer' }, { key: 'qty', label: 'Qty', num: true },
                  { key: 'price', label: 'Price', num: true }, { key: 'discount', label: 'Discount', num: true },
                  { key: 'total', label: 'Total', num: true }, { key: 'paid', label: 'Paid', num: true },
                  { key: 'balance', label: 'Balance', num: true }, { key: 'pendingBalance', label: 'Pending', num: true },
                  { key: 'categoryName', label: 'Category' }, { key: 'brandName', label: 'Brand' },
                  { key: 'date', label: 'Date' }, { key: 'time', label: 'Time' }, { key: 'biller', label: 'Biller' },
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
                  <th>#</th><th>Bill No</th><th>Customer</th><th className="num">Qty</th><th className="num">Price</th>
                  <th className="num">Discount</th><th className="num">Total</th><th className="num">Paid</th>
                  <th className="num">Balance</th><th className="num">Pending</th><th>Category</th><th>Brand</th>
                  <th>Date</th><th>Time</th><th>Biller</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={15} className="mst-empty">No records.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={`${row.billNo}-${i}`} className="mst-click-row" onClick={() => openBill(row.billNo)}>
                    <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                    <td>{row.billNo}<div className="mst-note">{row.productName}</div></td>
                    <td>{row.customer}</td>
                    <td className="num">{n3(row.qty)}</td>
                    <td className="num">{n3(row.price)}</td>
                    <td className="num">{n3(row.discount)}</td>
                    <td className="num">{n3(row.total)}</td>
                    <td className="num">{n3(row.paid)}</td>
                    <td className="num">{n3(row.balance)}</td>
                    <td className="num">{n3(row.pendingBalance)}</td>
                    <td>{row.categoryName}</td>
                    <td>{row.brandName}</td>
                    <td>{row.date}</td>
                    <td>{row.time}</td>
                    <td>{row.biller}</td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr>
                    <td colSpan={6}><strong>Page total</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'total'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'paid'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'balance'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'pendingBalance'))}</strong></td>
                    <td colSpan={5} />
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

export default LineSalesReport;
