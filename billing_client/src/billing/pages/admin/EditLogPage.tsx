import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminError, adminPage } from '../../../api/admin/admin-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import '../master/Master.css';

type Row = {
  id: number;
  billId: number;
  billNo: string;
  action: string;
  details: string;
  date: string;
  time: string;
  userName: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const actionLabel = (action?: string) => {
  const value = (action || '').toUpperCase();
  if (value === 'EDIT') return 'Edited';
  if (value === 'CANCEL') return 'Cancelled';
  if (value === 'DATE_CHANGE') return 'Date changed';
  if (value === 'PAYMENT_CHANGE') return 'Payment changed';
  return action || '-';
};

const EditLogPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const search = async (p = 0) => {
    try {
      const pg = adminPage<Row>(await adminApi.editLog(from, to, p, DEFAULT_PAGE_SIZE));
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
    } catch (err) {
      toast.error(adminError(err, 'Could not load edit log'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-history" /> Edit Log</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => search(0)}>Generate</button>
          </div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">Edits and cancellations from {from} to {to} ({total})</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Bill No</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={7} className="mst-empty">No edits or cancellations in this period.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={row.id || `${row.billNo}-${i}`}>
                    <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                    <td>{row.billNo}</td>
                    <td>{actionLabel(row.action)}</td>
                    <td>{row.details}</td>
                    <td>{row.date}</td>
                    <td>{row.time}</td>
                    <td>{row.userName}</td>
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

export default EditLogPage;
