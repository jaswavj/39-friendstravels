import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ticketApi, ticketData, ticketError, ticketPage } from '../../../api/ticket/ticket-api-service';
import { routerPathNames } from '../../../routes/routerPathNames';
import ListPagination from '../../components/ListPagination';
import '../master/Master.css';
import '../credit/Credit.css';
import './MonthlyBills.css';

type Card = {
  id: number;
  dateTime: string;
  customerName: string;
  phone: string;
  route: string;
  fromName?: string;
  toName?: string;
  transport: string;
  notes?: string;
  kind?: string;
  incomeTypeName?: string;
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

const monthValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthRange = (value: string) => {
  const [y, m] = value.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { from, to };
};

const payLabel = (row: Card) => {
  const parts: string[] = [];
  if (Number(row.cashPaid) > 0) parts.push('Cash');
  if (Number(row.gpayPaid) > 0) parts.push('GPay');
  if (Number(row.cardPaid) > 0) parts.push('Card');
  if (Number(row.credit) > 0) parts.push('Credit');
  return parts.join(' + ') || 'Cash';
};

const MonthlyBillsPage: React.FC = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(monthValue());
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [rows, setRows] = useState<Card[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<Card | null>(null);
  const [viewBusy, setViewBusy] = useState(false);
  const [cancelCard, setCancelCard] = useState<Card | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = async (value = month, p = 0) => {
    const { from, to } = monthRange(value);
    setLoading(true);
    try {
      const pg = ticketPage<Card>(await ticketApi.report(from, to, p, PAGE_SIZE, customerName, phone));
      setRows(pg.items);
      setTotal(pg.total);
      setPage(pg.page);
    } catch (err) {
      toast.error(ticketError(err, 'Could not load tickets'));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCancel = (card: Card) => {
    setCancelCard(card);
    setCancelReason('');
  };

  const confirmCancel = async () => {
    if (!cancelCard) return;
    if (!cancelReason.trim()) {
      toast.warning('Enter a cancellation reason');
      return;
    }
    setCancelBusy(true);
    try {
      ticketData(await ticketApi.cancel(cancelCard.id, cancelReason.trim()));
      toast.success('Ticket cancelled');
      setCancelCard(null);
      setView(null);
      await load(month, page);
    } catch (err) {
      toast.error(ticketError(err, 'Could not cancel ticket'));
    } finally {
      setCancelBusy(false);
    }
  };

  const openView = async (id: number) => {
    setViewBusy(true);
    try {
      const ticket = ticketData<Card>(await ticketApi.get(id));
      setView(ticket);
      ticketApi.logView(id).catch(() => undefined);
    } catch (err) {
      toast.error(ticketError(err, 'Could not load ticket'));
    } finally {
      setViewBusy(false);
    }
  };

  return (
    <div className="mst-page mb-page">
      <h2 className="mst-title"><i className="fas fa-ticket-alt" /> Monthly Tickets</h2>
      <div className="mst-card" style={{ marginBottom: 14 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg">
            <label>Month</label>
            <input className="mst-inp" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Customer Name</label>
            <input
              className="mst-inp"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Search name"
              onKeyDown={(e) => e.key === 'Enter' && (setPage(0), load(month, 0))}
            />
          </div>
          <div className="mst-fg">
            <label>Phone Number</label>
            <input
              className="mst-inp"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Search phone"
              onKeyDown={(e) => e.key === 'Enter' && (setPage(0), load(month, 0))}
            />
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" disabled={loading} onClick={() => { setPage(0); load(month, 0); }}>
              {loading ? 'Loading…' : 'Show Tickets'}
            </button>
          </div>
        </div>
      </div>

      {rows && (
        <div className="mb-cards">
          {rows.length === 0 && (
            <div className="mst-empty">
              {customerName.trim() || phone.trim() ? 'No tickets match this customer.' : 'No tickets in this month.'}
            </div>
          )}
          {rows.map((card) => (
            <article className="mb-card" key={card.id}>
              <div className="mb-card-body">
                <div>
                  <h3 className="mb-name">{card.customerName || 'Walk-in'}</h3>
                  <p className="mb-invoice">{card.route}</p>
                  <p className="mb-meta">
                    {card.dateTime}
                    {card.phone ? ` · ${card.phone}` : ''}
                    {card.kind === 'INCOME' ? '' : (card.transport ? ` · ${card.transport}` : '')}
                  </p>
                </div>
                <div className="mb-amt">{inr(card.amount)}</div>
                <div className="mb-chips">
                  <span className="mb-chip">{card.kind === 'INCOME' || card.incomeTypeName ? 'Other Income' : 'Ticket Entry'}</span>
                  <span className="mb-chip">{payLabel(card)}</span>
                  {Number(card.credit) > 0 && <span className="mb-chip ret">Credit {inr(card.credit)}</span>}
                </div>
              </div>
              <div className="mb-actions mb-actions-3">
                <button className="mb-act" type="button" disabled={viewBusy} onClick={() => openView(card.id)}>
                  <i className="fas fa-eye" /> View
                </button>
                <button className="mb-act" type="button" onClick={() => navigate(`${routerPathNames.admin.editTicket}/${card.id}`)}>
                  <i className="fas fa-pen" /> Edit
                </button>
                <button className="mb-act mb-act-cancel" type="button" disabled={cancelBusy} onClick={() => openCancel(card)}>
                  <i className="fas fa-ban" /> Cancel
                </button>
              </div>
            </article>
          ))}
          <ListPagination page={page} size={PAGE_SIZE} total={total} onChange={(p) => load(month, p)} />
        </div>
      )}

      {view && (
        <div className="crd-modal" onClick={() => setView(null)}>
          <div className="crd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="crd-modal-h">
              <h3 style={{ margin: 0, fontSize: 18 }}>Ticket #{view.id}</h3>
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setView(null)}>Close</button>
            </div>
            <div className="crd-modal-body mb-view-body">
              <div className="mb-view-row"><span>Date</span><strong>{view.dateTime}</strong></div>
              <div className="mb-view-row"><span>Customer</span><strong>{view.customerName || 'Walk-in'}</strong></div>
              <div className="mb-view-row"><span>Phone</span><strong>{view.phone || '-'}</strong></div>
              <div className="mb-view-row"><span>Type</span><strong>{view.kind === 'INCOME' || view.incomeTypeName ? 'Other Income' : 'Ticket Entry'}</strong></div>
              {view.kind === 'INCOME' ? (
                <>
                  <div className="mb-view-row"><span>Income Type</span><strong>{view.incomeTypeName || view.route || '-'}</strong></div>
                  <div className="mb-view-row"><span>Qty</span><strong>{view.qty ? Number(view.qty).toFixed(2) : '-'}</strong></div>
                  <div className="mb-view-row"><span>Bus Name</span><strong>{view.busName || '-'}</strong></div>
                  <div className="mb-view-row"><span>Area</span><strong>{view.area || '-'}</strong></div>
                </>
              ) : (
                <>
                  <div className="mb-view-row"><span>From</span><strong>{view.fromName || view.route}</strong></div>
                  <div className="mb-view-row"><span>To</span><strong>{view.toName || '-'}</strong></div>
                  <div className="mb-view-row"><span>Transport</span><strong>{view.transport || '-'}</strong></div>
                </>
              )}
              <div className="mb-view-row"><span>Amount</span><strong>{inr(view.amount)}</strong></div>
              <div className="mb-view-row"><span>Cash</span><strong>{inr(view.cashPaid)}</strong></div>
              <div className="mb-view-row"><span>GPay</span><strong>{inr(view.gpayPaid)}</strong></div>
              <div className="mb-view-row"><span>Card</span><strong>{inr(view.cardPaid)}</strong></div>
              <div className="mb-view-row"><span>Credit</span><strong>{inr(view.credit)}</strong></div>
              <div className="mb-view-row"><span>Notes</span><strong>{view.notes || '-'}</strong></div>
            </div>
            <div className="mb-view-foot">
              <button className="mst-btn mst-btn-danger" type="button" onClick={() => openCancel(view)}>Cancel</button>
              <button className="mst-btn mst-btn-primary" type="button" onClick={() => navigate(`${routerPathNames.admin.editTicket}/${view.id}`)}>
                Edit Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelCard && (
        <div className="crd-modal" onClick={() => !cancelBusy && setCancelCard(null)}>
          <div className="crd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="crd-modal-h">
              <h3 style={{ margin: 0, fontSize: 18 }}>Cancel Ticket #{cancelCard.id}</h3>
              <button className="mst-btn mst-btn-outline" type="button" disabled={cancelBusy} onClick={() => setCancelCard(null)}>Close</button>
            </div>
            <div className="crd-modal-body mb-view-body">
              <div className="mb-view-row"><span>Customer</span><strong>{cancelCard.customerName || 'Walk-in'}</strong></div>
              <div className="mb-view-row"><span>Route</span><strong>{cancelCard.route}</strong></div>
              <div className="mb-view-row"><span>Amount</span><strong>{inr(cancelCard.amount)}</strong></div>
              {Number(cancelCard.credit) > 0 && (
                <div className="mb-view-row"><span>Credit to reverse</span><strong>{inr(cancelCard.credit)}</strong></div>
              )}
              <div className="mst-fg" style={{ marginTop: 12 }}>
                <label>Reason for cancellation <span className="req">*</span></label>
                <textarea
                  className="mst-area"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Why is this ticket cancelled?"
                />
              </div>
            </div>
            <div className="mb-view-foot">
              <button className="mst-btn mst-btn-outline" type="button" disabled={cancelBusy} onClick={() => setCancelCard(null)}>Back</button>
              <button className="mst-btn mst-btn-danger" type="button" disabled={cancelBusy} onClick={confirmCancel}>
                {cancelBusy ? 'Cancelling…' : 'Cancel Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyBillsPage;
