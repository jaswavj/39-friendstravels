import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ticketApi, ticketData, ticketError, ticketPage } from '../../../api/ticket/ticket-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import '../master/Master.css';
import '../credit/Credit.css';
import '../admin/MonthlyBills.css';
import ReportActions from '../account-reports/ReportActions';

type Row = {
  id: number;
  kind?: string;
  dateTime: string;
  ticketDate?: string;
  collectedDate?: string;
  customerName: string;
  phone: string;
  route: string;
  fromName?: string;
  toName?: string;
  incomeTypeName?: string;
  transport: string;
  notes: string;
  qty?: number;
  busName?: string;
  area?: string;
  amount: number;
  cashPaid: number;
  gpayPaid: number;
  cardPaid: number;
  credit: number;
  userName: string;
  actualDate?: string;
  actualTime?: string;
  entryDate?: string;
  entryTime?: string;
};

const kindOf = (row?: Row | null) => (row?.kind || '').toUpperCase();
const isCollection = (row?: Row | null) => kindOf(row) === 'COLLECTION';
const isIncome = (row?: Row | null) => kindOf(row) === 'INCOME';
const typeLabel = (row?: Row | null) =>
  isCollection(row) ? 'Due Collection' : isIncome(row) ? 'Other Income' : 'Ticket Entry';

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);
const inr = (v?: number) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type IncomeType = { id: number; name: string };

const TicketReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [kind, setKind] = useState('');
  const [incomeType, setIncomeType] = useState('');
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [cash, setCash] = useState(0);
  const [bank, setBank] = useState(0);
  const [collected, setCollected] = useState(0);
  const [view, setView] = useState<Row | null>(null);
  const [viewBusy, setViewBusy] = useState(false);

  const openView = async (row: Row) => {
    setView(row);
    if (!row.id || isCollection(row)) return;
    setViewBusy(true);
    try {
      const full = ticketData<Row>(await ticketApi.get(row.id));
      setView({ ...row, ...full, kind: row.kind, userName: full.userName || row.userName });
    } catch {
      /* list row already has the ticket fields */
    } finally {
      setViewBusy(false);
    }
  };

  useEffect(() => {
    ticketApi.searchIncomeTypes('')
      .then((res) => setIncomeTypes(ticketData<IncomeType[]>(res) || []))
      .catch(() => undefined);
  }, []);

  const search = async (p = 0) => {
    try {
      const res = await ticketApi.report(
        from,
        to,
        p,
        DEFAULT_PAGE_SIZE,
        undefined,
        undefined,
        kind || undefined,
        kind === 'TICKET' || kind === 'COLLECTION' ? undefined : (incomeType || undefined),
        true,
      );
      const pg = ticketPage<Row>(res);
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
      setCash(Number(res?.data?.cash || 0));
      setBank(Number(res?.data?.bank || 0));
      setCollected(Number(res?.data?.collected || 0));
    } catch (err) {
      toast.error(ticketError(err, 'Could not load ticket report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title no-print"><i className="fas fa-list" /> Income Report</h2>
      <div className="mst-card no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Type</label>
            <select className="mst-sel" value={kind} onChange={(e) => { setKind(e.target.value); if (e.target.value !== 'INCOME') setIncomeType(''); }}>
              <option value="">All</option>
              <option value="TICKET">Ticket Entry</option>
              <option value="INCOME">Other Income</option>
              <option value="COLLECTION">Due Collection</option>
            </select>
          </div>
          <div className="mst-fg">
            <label>Income Type</label>
            <select className="mst-sel" value={incomeType} disabled={kind === 'TICKET' || kind === 'COLLECTION'} onChange={(e) => setIncomeType(e.target.value)}>
              <option value="">All</option>
              {incomeTypes.map((type) => (
                <option key={type.id} value={type.name}>{type.name}</option>
              ))}
            </select>
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <div className="mst-note" style={{ marginBottom: 0 }}>
              Date range is cash collected date. Customer due collections are included. A future ticket paid today is shown in today&apos;s income.
            </div>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => search(0)}>Generate</button>
            <ReportActions
              disabled={!rows}
              filename={`Income_Report_${from}_${to}`}
              sheets={[{
                name: 'Income',
                columns: [
                  { key: 'kind', label: 'Type' },
                  { key: 'collectedDate', label: 'Collected' },
                  { key: 'ticketDate', label: 'Ticket Date' },
                  { key: 'customerName', label: 'Customer' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'route', label: 'Details' },
                  { key: 'qty', label: 'Qty', num: true },
                  { key: 'busName', label: 'Bus Name' },
                  { key: 'area', label: 'Area' },
                  { key: 'transport', label: 'Transport' },
                  { key: 'amount', label: 'Amount', num: true },
                  { key: 'cashPaid', label: 'Cash', num: true },
                  { key: 'gpayPaid', label: 'GPay', num: true },
                  { key: 'cardPaid', label: 'Card', num: true },
                  { key: 'credit', label: 'Credit', num: true },
                  { key: 'userName', label: 'Entry By' },
                ],
                rows: (rows || []).map((row) => ({ ...row, kind: typeLabel(row) })),
              }]}
            />
          </div>
        </div>
      </div>
      {rows && (
        <>
          <div className="crd-stats" style={{ marginBottom: 12 }}>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Cash</div>
              <div className="crd-stat-v">₹ {n(cash)}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Bank</div>
              <div className="crd-stat-v">₹ {n(bank)}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Total</div>
              <div className="crd-stat-v">₹ {n(collected)}</div>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Income Details</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th><th>Type</th><th>Collected</th><th>Ticket Date</th><th>Customer</th><th>Phone</th><th>Details</th>
                    <th className="num">Qty</th><th>Bus Name</th><th>Area</th>
                    <th>Transport</th><th className="num">Amount</th><th className="num">Cash</th>
                    <th className="num">GPay</th><th className="num">Card</th><th className="num">Credit</th><th>Entry By</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={17} className="mst-empty">No tickets, other income, or due collection in the selected period.</td></tr>}
                  {rows.map((row, i) => (
                    <tr key={`${row.kind || 'TICKET'}-${row.id}`} className="mst-click-row" title="View details" onClick={() => openView(row)}>
                      <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                      <td>{typeLabel(row)}</td>
                      <td>{row.collectedDate || row.dateTime}</td>
                      <td>{row.ticketDate || '—'}</td>
                      <td>{row.customerName || '—'}</td>
                      <td>{row.phone || '—'}</td>
                      <td>{row.route || row.incomeTypeName || '—'}</td>
                      <td className="num">{row.qty ? n(row.qty) : '—'}</td>
                      <td>{row.busName || '—'}</td>
                      <td>{row.area || '—'}</td>
                      <td>{isIncome(row) || isCollection(row) ? '—' : (row.transport || '—')}</td>
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
              <h3 style={{ margin: 0, fontSize: 18 }}>{typeLabel(view)} #{view.id}{viewBusy ? ' …' : ''}</h3>
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setView(null)}>Close</button>
            </div>
            <div className="crd-modal-body mb-view-body">
              <div className="mb-view-row"><span>Type</span><strong>{typeLabel(view)}</strong></div>
              <div className="mb-view-row"><span>Collected</span><strong>{view.collectedDate || view.dateTime || '-'}</strong></div>
              <div className="mb-view-row"><span>Ticket Date</span><strong>{view.ticketDate || '-'}</strong></div>
              <div className="mb-view-row"><span>Customer</span><strong>{view.customerName || 'Walk-in'}</strong></div>
              <div className="mb-view-row"><span>Phone</span><strong>{view.phone || '-'}</strong></div>
              {isCollection(view) ? (
                <div className="mb-view-row"><span>Details</span><strong>Customer due collection</strong></div>
              ) : isIncome(view) ? (
                <>
                  <div className="mb-view-row"><span>Income Type</span><strong>{view.incomeTypeName || view.route || '-'}</strong></div>
                  <div className="mb-view-row"><span>Qty</span><strong>{view.qty ? n(view.qty) : '-'}</strong></div>
                  <div className="mb-view-row"><span>Bus Name</span><strong>{view.busName || '-'}</strong></div>
                  <div className="mb-view-row"><span>Area</span><strong>{view.area || '-'}</strong></div>
                </>
              ) : (
                <>
                  <div className="mb-view-row"><span>From</span><strong>{view.fromName || '-'}</strong></div>
                  <div className="mb-view-row"><span>To</span><strong>{view.toName || '-'}</strong></div>
                  <div className="mb-view-row"><span>Route</span><strong>{view.route || '-'}</strong></div>
                  <div className="mb-view-row"><span>Transport</span><strong>{view.transport || '-'}</strong></div>
                </>
              )}
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
