import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { expenseApi, expenseData, expenseError, expensePage } from '../../../api/expense/expense-api-service';
import { routerPathNames } from '../../../routes/routerPathNames';
import ListPagination from '../../components/ListPagination';
import '../master/Master.css';
import '../credit/Credit.css';
import './MonthlyBills.css';

type Card = {
  id: number;
  dateTime: string;
  typeName: string;
  content: string;
  description?: string;
  qty?: number;
  busName?: string;
  area?: string;
  customerName?: string;
  customerPhone?: string;
  amount: number;
  partyPaid?: number;
  cashPaid?: number;
  bankPaid?: number;
  balance?: number;
  userName?: string;
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
  if (Number(row.bankPaid) > 0) parts.push('Bank');
  if (Number(row.partyPaid) > 0) parts.push('Paid by party');
  if (Number(row.balance) > 0) parts.push('Credit');
  return parts.join(' + ') || 'Cash';
};

const MonthlyExpensesPage: React.FC = () => {
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
      const pg = expensePage<Card>(await expenseApi.report(from, to, undefined, p, PAGE_SIZE, customerName, phone));
      setRows(pg.items);
      setTotal(pg.total);
      setPage(pg.page);
    } catch (err) {
      toast.error(expenseError(err, 'Could not load expenses'));
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
      expenseData(await expenseApi.cancel(cancelCard.id, cancelReason.trim()));
      toast.success('Expense cancelled');
      setCancelCard(null);
      setView(null);
      await load(month, page);
    } catch (err) {
      toast.error(expenseError(err, 'Could not cancel expense'));
    } finally {
      setCancelBusy(false);
    }
  };

  const openView = async (id: number) => {
    setViewBusy(true);
    try {
      const expense = expenseData<Card & { expenseTypeName?: string }>(await expenseApi.get(id));
      setView({ ...expense, typeName: expense.typeName || expense.expenseTypeName || '' });
    } catch (err) {
      toast.error(expenseError(err, 'Could not load expense'));
    } finally {
      setViewBusy(false);
    }
  };

  return (
    <div className="mst-page mb-page">
      <h2 className="mst-title"><i className="fas fa-pen" /> Expense Edit</h2>
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
              {loading ? 'Loading…' : 'Show Expenses'}
            </button>
          </div>
        </div>
      </div>

      {rows && (
        <div className="mb-cards">
          {rows.length === 0 && (
            <div className="mst-empty">
              {customerName.trim() || phone.trim() ? 'No expenses match this customer.' : 'No expenses in this month.'}
            </div>
          )}
          {rows.map((card) => (
            <article className="mb-card" key={card.id}>
              <div className="mb-card-body">
                <div>
                  <h3 className="mb-name">{card.customerName || card.content || 'Expense'}</h3>
                  <p className="mb-invoice">{card.typeName || card.content}</p>
                  <p className="mb-meta">
                    {card.dateTime}
                    {card.customerPhone ? ` · ${card.customerPhone}` : ''}
                    {card.busName ? ` · ${card.busName}` : ''}
                  </p>
                </div>
                <div className="mb-amt">{inr(card.amount)}</div>
                <div className="mb-chips">
                  <span className="mb-chip">{card.typeName || 'Expense'}</span>
                  <span className="mb-chip">{payLabel(card)}</span>
                  {Number(card.balance) > 0 && <span className="mb-chip ret">Due {inr(card.balance)}</span>}
                </div>
              </div>
              <div className="mb-actions mb-actions-3">
                <button className="mb-act" type="button" disabled={viewBusy} onClick={() => openView(card.id)}>
                  <i className="fas fa-eye" /> View
                </button>
                <button className="mb-act" type="button" onClick={() => navigate(`${routerPathNames.admin.editExpense}/${card.id}`)}>
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
              <h3 style={{ margin: 0, fontSize: 18 }}>Expense #{view.id}</h3>
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setView(null)}>Close</button>
            </div>
            <div className="crd-modal-body mb-view-body">
              <div className="mb-view-row"><span>Date</span><strong>{view.dateTime}</strong></div>
              <div className="mb-view-row"><span>Type</span><strong>{view.typeName || '-'}</strong></div>
              <div className="mb-view-row"><span>Customer</span><strong>{view.customerName || '-'}</strong></div>
              <div className="mb-view-row"><span>Phone</span><strong>{view.customerPhone || '-'}</strong></div>
              <div className="mb-view-row"><span>Content</span><strong>{view.content || '-'}</strong></div>
              <div className="mb-view-row"><span>Qty</span><strong>{view.qty ? Number(view.qty).toFixed(2) : '-'}</strong></div>
              <div className="mb-view-row"><span>Bus Name</span><strong>{view.busName || '-'}</strong></div>
              <div className="mb-view-row"><span>Area</span><strong>{view.area || '-'}</strong></div>
              <div className="mb-view-row"><span>Amount</span><strong>{inr(view.amount)}</strong></div>
              <div className="mb-view-row"><span>Cash</span><strong>{inr(view.cashPaid || 0)}</strong></div>
              <div className="mb-view-row"><span>Bank</span><strong>{inr(view.bankPaid || 0)}</strong></div>
              <div className="mb-view-row"><span>Paid by party</span><strong>{inr(view.partyPaid || 0)}</strong></div>
              <div className="mb-view-row"><span>Balance</span><strong>{inr(view.balance || 0)}</strong></div>
              <div className="mb-view-row"><span>Description</span><strong>{view.description || '-'}</strong></div>
            </div>
            <div className="mb-view-foot">
              <button className="mst-btn mst-btn-danger" type="button" onClick={() => openCancel(view)}>Cancel</button>
              <button className="mst-btn mst-btn-primary" type="button" onClick={() => navigate(`${routerPathNames.admin.editExpense}/${view.id}`)}>
                Edit Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelCard && (
        <div className="crd-modal" onClick={() => !cancelBusy && setCancelCard(null)}>
          <div className="crd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="crd-modal-h">
              <h3 style={{ margin: 0, fontSize: 18 }}>Cancel Expense #{cancelCard.id}</h3>
              <button className="mst-btn mst-btn-outline" type="button" disabled={cancelBusy} onClick={() => setCancelCard(null)}>Close</button>
            </div>
            <div className="crd-modal-body mb-view-body">
              <div className="mb-view-row"><span>Customer</span><strong>{cancelCard.customerName || '-'}</strong></div>
              <div className="mb-view-row"><span>Content</span><strong>{cancelCard.content || '-'}</strong></div>
              <div className="mb-view-row"><span>Amount</span><strong>{inr(cancelCard.amount)}</strong></div>
              <div className="mst-fg" style={{ marginTop: 12 }}>
                <label>Reason for cancellation <span className="req">*</span></label>
                <textarea
                  className="mst-area"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Why is this expense cancelled?"
                />
              </div>
            </div>
            <div className="mb-view-foot">
              <button className="mst-btn mst-btn-outline" type="button" disabled={cancelBusy} onClick={() => setCancelCard(null)}>Back</button>
              <button className="mst-btn mst-btn-danger" type="button" disabled={cancelBusy} onClick={confirmCancel}>
                {cancelBusy ? 'Cancelling…' : 'Cancel Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyExpensesPage;
