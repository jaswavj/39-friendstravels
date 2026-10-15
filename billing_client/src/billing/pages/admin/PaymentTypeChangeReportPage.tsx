import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminError, adminPage } from '../../../api/admin/admin-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import '../master/Master.css';
import ReportActions from '../account-reports/ReportActions';

type Row = {
  billId: number; billNo: string; oldCash: number; newCash: number;
  oldBank: number; newBank: number; bankMode: string; userName: string; dateTime: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);

const PaymentTypeChangeReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const search = async (p = 0) => {
    try {
      const pg = adminPage<Row>(await adminApi.paymentChangeReport(from, to, p, DEFAULT_PAGE_SIZE));
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
    } catch (err) {
      toast.error(adminError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title no-print"><i className="fas fa-file-alt" /> Payment Type Change Report</h2>
      <div className="mst-card no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => search(0)}>Generate</button>
            <ReportActions
              disabled={!rows}
              filename={`Payment_Change_${from}_${to}`}
              sheets={[{
                name: 'Changes',
                columns: [
                  { key: 'billNo', label: 'Bill No' }, { key: 'oldCash', label: 'Old Cash', num: true },
                  { key: 'newCash', label: 'New Cash', num: true }, { key: 'oldBank', label: 'Old Bank', num: true },
                  { key: 'newBank', label: 'New Bank', num: true }, { key: 'bankMode', label: 'Bank Mode' },
                  { key: 'userName', label: 'User' }, { key: 'dateTime', label: 'Date / Time' },
                ],
                rows: rows || [],
              }]}
            />
          </div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">Changes from {from} to {to}</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th><th>Bill No</th>
                  <th className="num">Old Cash</th><th className="num">New Cash</th>
                  <th className="num">Old Bank</th><th className="num">New Bank</th>
                  <th>Bank Mode</th><th>User</th><th>Date / Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={9} className="mst-empty">No payment type changes in this period.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={`${row.billId}-${i}`}>
                    <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                    <td>{row.billNo}</td>
                    <td className="num">{n(row.oldCash)}</td>
                    <td className="num">{n(row.newCash)}</td>
                    <td className="num">{n(row.oldBank)}</td>
                    <td className="num">{n(row.newBank)}</td>
                    <td>{row.bankMode}</td>
                    <td>{row.userName}</td>
                    <td>{row.dateTime}</td>
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

export default PaymentTypeChangeReportPage;
