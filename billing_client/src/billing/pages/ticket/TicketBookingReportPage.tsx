import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { ticketApi, ticketError, ticketPage } from '../../../api/ticket/ticket-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import '../master/Master.css';
import '../credit/Credit.css';
import ReportActions from '../account-reports/ReportActions';

type Row = {
  id: number;
  bookingDate: string;
  customerName: string;
  phone: string;
  area: string;
  busName: string;
  amount: number;
  paid: number;
  balance: number;
  notes: string;
  userName: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);

const TicketBookingReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [dueOnly, setDueOnly] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [amount, setAmount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [balance, setBalance] = useState(0);

  const search = async (p = 0) => {
    try {
      const res = await ticketApi.bookingReport(from, to, p, DEFAULT_PAGE_SIZE, dueOnly);
      const pg = ticketPage<Row>(res);
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
      setAmount(Number(res?.data?.amount || 0));
      setPaid(Number(res?.data?.paid || 0));
      setBalance(Number(res?.data?.balance || 0));
    } catch (err) {
      toast.error(ticketError(err, 'Could not load ticket report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title no-print"><i className="fas fa-ticket-alt" /> Ticket Report</h2>
      <div className="mst-card no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Show</label>
            <select className="mst-sel" value={dueOnly ? 'due' : 'all'} onChange={(e) => setDueOnly(e.target.value === 'due')}>
              <option value="all">All tickets</option>
              <option value="due">Due only</option>
            </select>
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <div className="mst-note" style={{ marginBottom: 0 }}>
              Date range is booking (entry) date. Paid includes later customer due collections, so Balance is the remaining due.
            </div>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => search(0)}>Generate</button>
            <ReportActions
              disabled={!rows}
              filename={`Ticket_Report_${from}_${to}`}
              sheets={[{
                name: 'Tickets',
                columns: [
                  { key: 'bookingDate', label: 'Booking Date' },
                  { key: 'customerName', label: 'Name' },
                  { key: 'phone', label: 'Mobile No' },
                  { key: 'area', label: 'Area' },
                  { key: 'busName', label: 'Bus' },
                  { key: 'amount', label: 'Amount', num: true },
                  { key: 'paid', label: 'Paid', num: true },
                  { key: 'balance', label: 'Balance', num: true },
                  { key: 'notes', label: 'Notes' },
                  { key: 'userName', label: 'Booked By' },
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
              <div className="crd-stat-l">Total Paid</div>
              <div className="crd-stat-v">₹ {n(paid)}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Total Balance</div>
              <div className="crd-stat-v due">₹ {n(balance)}</div>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Ticket Details</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Booking Date</th>
                    <th>Name</th>
                    <th>Mobile No</th>
                    <th>Area</th>
                    <th>Bus</th>
                    <th className="num">Amount</th>
                    <th className="num">Paid</th>
                    <th className="num">Balance</th>
                    <th>Notes</th>
                    <th>Booked By</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={11} className="mst-empty">No tickets in the selected booking date range.</td></tr>}
                  {rows.map((row, i) => (
                    <tr key={row.id}>
                      <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                      <td>{row.bookingDate || '—'}</td>
                      <td>{row.customerName || '—'}</td>
                      <td>{row.phone || '—'}</td>
                      <td>{row.area || '—'}</td>
                      <td>{row.busName || '—'}</td>
                      <td className="num">₹ {n(row.amount)}</td>
                      <td className="num">₹ {n(row.paid)}</td>
                      <td className="num" style={row.balance > 0.001 ? { color: '#dc2626', fontWeight: 700 } : undefined}>₹ {n(row.balance)}</td>
                      <td>{row.notes || '—'}</td>
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
    </div>
  );
};

export default TicketBookingReportPage;
