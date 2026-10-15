import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { ticketApi, ticketError, ticketPage } from '../../../api/ticket/ticket-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import '../master/Master.css';
import '../credit/Credit.css';
import ReportActions from '../account-reports/ReportActions';

type Row = {
  id: number;
  dateTime: string;
  customerName: string;
  phone: string;
  route: string;
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

const TicketReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const search = async (p = 0) => {
    try {
      const pg = ticketPage<Row>(await ticketApi.report(from, to, p, DEFAULT_PAGE_SIZE));
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
    } catch (err) {
      toast.error(ticketError(err, 'Could not load ticket report'));
    }
  };

  const pageAmount = (rows || []).reduce((sum, row) => sum + (row.amount || 0), 0);
  const pageCredit = (rows || []).reduce((sum, row) => sum + (row.credit || 0), 0);

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
              <div className="crd-stat-l">Page Amount</div>
              <div className="crd-stat-v">₹ {n(pageAmount)}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Page Credit</div>
              <div className="crd-stat-v due">₹ {n(pageCredit)}</div>
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
                    <tr key={row.id}>
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
    </div>
  );
};

export default TicketReportPage;
