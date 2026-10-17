import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminError, adminPage } from '../../../api/admin/admin-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import '../master/Master.css';
import '../credit/Credit.css';
import './MonthlyBills.css';

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
  if (value === 'CREATE') return 'Booked';
  if (value === 'VIEW') return 'Viewed';
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
  const [view, setView] = useState<Row | null>(null);

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
      <h2 className="mst-title"><i className="fas fa-history" /> Ticket/Income Log</h2>
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
          <div className="mst-card-h">Ticket bookings, views, and edits from {from} to {to} ({total})</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ticket</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={7} className="mst-empty">No ticket log entries in this period.</td></tr>}
                {rows.map((row, i) => (
                  <tr
                    key={row.id || `${row.billNo}-${i}`}
                    className="mst-click-row"
                    title="View full details"
                    onClick={() => setView(row)}
                  >
                    <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                    <td>{row.billNo}</td>
                    <td>{actionLabel(row.action)}</td>
                    <td className="log-clip">{row.details}</td>
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

      {view && (
        <div className="crd-modal" onClick={() => setView(null)}>
          <div className="crd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="crd-modal-h">
              <h3 style={{ margin: 0, fontSize: 18 }}>{actionLabel(view.action)} · {view.billNo || `Ticket #${view.billId}`}</h3>
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setView(null)}>Close</button>
            </div>
            <div className="crd-modal-body mb-view-body">
              <div className="mb-view-row"><span>Ticket / Income</span><strong>{view.billNo || '-'}</strong></div>
              <div className="mb-view-row"><span>Action</span><strong>{actionLabel(view.action)}</strong></div>
              <div className="mb-view-row"><span>Date</span><strong>{view.date || '-'}</strong></div>
              <div className="mb-view-row"><span>Time</span><strong>{view.time || '-'}</strong></div>
              <div className="mb-view-row"><span>User</span><strong>{view.userName || '-'}</strong></div>
              <div className="mb-view-row log-detail-row">
                <span>Details</span>
                <strong>{view.details || '-'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditLogPage;
