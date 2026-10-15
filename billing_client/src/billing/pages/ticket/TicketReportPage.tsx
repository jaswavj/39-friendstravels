import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { ticketApi, ticketData, ticketError, ticketPage } from '../../../api/ticket/ticket-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import '../master/Master.css';
import '../credit/Credit.css';
import '../admin/MonthlyBills.css';
import ReportActions from '../account-reports/ReportActions';

type Row = {
  id: number;
  dateTime: string;
  customerName: string;
  phone: string;
  route: string;
  fromName?: string;
  toName?: string;
  transport: string;
  notes: string;
  amount: number;
  cashPaid: number;
  gpayPaid: number;
  cardPaid: number;
  credit: number;
  userName: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);
const inr = (v?: number) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TicketReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [amount, setAmount] = useState(0);
  const [credit, setCredit] = useState(0);
  const [view, setView] = useState<Row | null>(null);
  const [viewBusy, setViewBusy] = useState(false);

  const openView = async (row: Row) => {
    setView(row);
    if (!row.id) return;
    setViewBusy(true);
    try {
      const full = ticketData<Row>(await ticketApi.get(row.id));
      setView({ ...row, ...full, userName: full.userName || row.userName });
    } catch {
      /* list row already has the ticket fields */
    } finally {
      setViewBusy(false);
    }
  };

  const search = async (p = 0) => {
    try {
      const res = await ticketApi.report(from, to, p, DEFAULT_PAGE_SIZE);
      const pg = ticketPage<Row>(res);
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
      setAmount(Number(res?.data?.amount || 0));
      setCredit(Number(res?.data?.credit || 0));
    } catch (err) {
      toast.error(ticketError(err, 'Could not load ticket report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title no-print"><i className="fas fa-list" /> Ticket Report</h2>
      <div className="mst-card no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => search(0)}>Generate</button>
            <ReportActions
              disabled={!rows}
              filename={`Ticket_Report_${from}_${to}`}
              sheets={[{
                name: 'Tickets',
                columns: [
                  { key: 'dateTime', label: 'Date' },
                  { key: 'customerName', label: 'Customer' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'route', label: 'Route' },
                  { key: 'transport', label: 'Transport' },
                  { key: 'amount', label: 'Amount', num: true },
                  { key: 'cashPaid', label: 'Cash', num: true },
                  { key: 'gpayPaid', label: 'GPay', num: true },
                  { key: 'cardPaid', label: 'Card', num: true },
                  { key: 'credit', label: 'Credit', num: true },
                  { key: 'userName', label: 'Entry By' },
                ],
                rows: rows || [],
              }]}
            />
          </div>
        </div>
      </div>
      {rows && (
        <>
          <div className="crd-stats crd-stats-4" style={{ marginBottom: 12 }}>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Total Tickets</div>
              <div className="crd-stat-v">{total}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Total Amount</div>
              <div className="crd-stat-v">₹ {n(amount)}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Total Credit</div>
              <div className="crd-stat-v due">₹ {n(credit)}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Report Period</div>
              <div className="crd-stat-v" style={{ fontSize: '1rem' }}>{from} – {to}</div>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Ticket Details</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th><th>Date</th><th>Customer</th><th>Phone</th><th>Route</th>
                    <th>Transport</th><th className="num">Amount</th><th className="num">Cash</th>
                    <th className="num">GPay</th><th className="num">Card</th><th className="num">Credit</th><th>Entry By</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={12} className="mst-empty">No tickets found for the selected period.</td></tr>}
                  {rows.map((row, i) => (
                    <tr key={row.id} className="mst-click-row" title="View ticket details" onClick={() => openView(row)}>
                      <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                      <td>{row.dateTime}</td>
                      <td>{row.customerName || '—'}</td>
                      <td>{row.phone || '—'}</td>
                      <td>{row.route}</td>
                      <td>{row.transport || '—'}</td>
                      <td className="num">₹ {n(row.amount)}</td>
                      <td className="num">{n(row.cashPaid)}</td>
                      <td className="num">{n(row.gpayPaid)}</td>
                      <td className="num">{n(row.cardPaid)}</td>
                      <td className="num">{n(row.credit)}</td>
                      <td>{row.userName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ListPagination page={page} size={DEFAULT_PAGE_SIZE} total={total} onChange={(p) => search(p)} />
          </div>
        </>
      )}

      {view && (
        <div className="crd-modal no-print" onClick={() => setView(null)}>
          <div className="crd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="crd-modal-h">
              <h3 style={{ margin: 0, fontSize: 18 }}>Ticket #{view.id}{viewBusy ? ' …' : ''}</h3>
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setView(null)}>Close</button>
            </div>
            <div className="crd-modal-body mb-view-body">
              <div className="mb-view-row"><span>Date</span><strong>{view.dateTime || '-'}</strong></div>
              <div className="mb-view-row"><span>Customer</span><strong>{view.customerName || 'Walk-in'}</strong></div>
              <div className="mb-view-row"><span>Phone</span><strong>{view.phone || '-'}</strong></div>
              <div className="mb-view-row"><span>From</span><strong>{view.fromName || '-'}</strong></div>
              <div className="mb-view-row"><span>To</span><strong>{view.toName || '-'}</strong></div>
              <div className="mb-view-row"><span>Route</span><strong>{view.route || '-'}</strong></div>
              <div className="mb-view-row"><span>Transport</span><strong>{view.transport || '-'}</strong></div>
              <div className="mb-view-row"><span>Amount</span><strong>{inr(view.amount)}</strong></div>
              <div className="mb-view-row"><span>Cash</span><strong>{inr(view.cashPaid)}</strong></div>
              <div className="mb-view-row"><span>GPay</span><strong>{inr(view.gpayPaid)}</strong></div>
              <div className="mb-view-row"><span>Card</span><strong>{inr(view.cardPaid)}</strong></div>
              <div className="mb-view-row"><span>Credit</span><strong>{inr(view.credit)}</strong></div>
              <div className="mb-view-row"><span>Notes</span><strong>{view.notes || '-'}</strong></div>
              <div className="mb-view-row"><span>Entry By</span><strong>{view.userName || '-'}</strong></div>
            </div>
            <div className="mb-view-foot">
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketReportPage;
