import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminError, adminPage } from '../../../api/admin/admin-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import '../master/Master.css';
import '../credit/Credit.css';
import ReportActions from '../account-reports/ReportActions';

type Row = {
  id: number; dateTime: string; billNo: string; customer: string;
  oldProd: string; newProd: string; type: number; points: number; staff: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const ExchangeReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [type, setType] = useState('0');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const search = async (p = 0) => {
    try {
      const t = Number(type);
      const pg = adminPage<Row>(await adminApi.exchangeReport(from, to, t || undefined, p, DEFAULT_PAGE_SIZE));
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
    } catch (err) {
      toast.error(adminError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title no-print"><i className="fas fa-undo" /> Exchange &amp; Return Report</h2>
      <div className="mst-card no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Type</label>
            <select className="mst-sel" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="0">All</option>
              <option value="1">Exchange</option>
              <option value="2">Return</option>
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => search(0)}>Generate</button>
            <ReportActions
              disabled={!rows}
              filename={`Exchange_Report_${from}_${to}`}
              sheets={[{
                name: 'Exchange',
                columns: [
                  { key: 'dateTime', label: 'Date' }, { key: 'billNo', label: 'Bill No' },
                  { key: 'customer', label: 'Customer' }, { key: 'oldProd', label: 'Old Product' },
                  { key: 'newProd', label: 'New Product' }, { key: 'points', label: 'Points', num: true },
                  { key: 'staff', label: 'Staff' },
                ],
                rows: rows || [],
              }]}
            />
          </div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">Records from {from} to {to}</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th><th>Date / Time</th><th>Bill No</th><th>Customer</th>
                  <th>Old Product</th><th>New Product</th><th>Type</th>
                  <th className="num">Points</th><th>Staff</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={9} className="mst-empty">No exchange or return records in this period.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={row.id} className={row.type === 2 ? 'crd-row-old' : 'crd-row-adv'}>
                    <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                    <td>{row.dateTime}</td>
                    <td>{row.billNo}</td>
                    <td>{row.customer}</td>
                    <td>{row.oldProd}</td>
                    <td>{row.newProd}</td>
                    <td>
                      <span className={`crd-badge ${row.type === 2 ? 'old' : 'adv'}`}>
                        {row.type === 2 ? 'Return' : 'Exchange'}
                      </span>
                    </td>
                    <td className="num">{Number(row.points || 0).toFixed(2)}</td>
                    <td>{row.staff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination page={page} size={DEFAULT_PAGE_SIZE} total={total} onChange={(p) => search(p)} />
        </div>
      )}
    </div>
  );
};

export default ExchangeReportPage;
