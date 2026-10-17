import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminApi, adminData } from '../../../api/admin/admin-api-service';
import { expenseApi, expenseData, expenseError, expensePage } from '../../../api/expense/expense-api-service';
import { ticketApi, ticketData, ticketError } from '../../../api/ticket/ticket-api-service';
import { routerPathNames } from '../../../routes/routerPathNames';
import '../master/Master.css';
import '../credit/Credit.css';
import { ExpenseCompany, ExpenseVoucherData, ExpenseVoucherPreview } from './ExpenseVoucher';

type TypeRow = { id: number; name: string };
type CustomerHit = { id: number; name: string; phone: string };

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const n2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '0.00');

type ExpenseDetail = {
  id: number;
  expenseType: number;
  expenseTypeName?: string;
  content: string;
  description?: string;
  qty?: number;
  busName?: string;
  area?: string;
  customerName?: string;
  customerPhone?: string;
  amount: number;
  partyPaid?: number;
  expenseDate: string;
  expenseTime: string;
  payMode?: number;
  payType?: number;
  cashPaid?: number;
  bankPaid?: number;
  balance?: number;
};

const emptyForm = () => ({
  expenseType: '',
  amount: '',
  qty: '',
  busName: '',
  area: '',
  customerName: '',
  phone: '',
  content: '',
  description: '',
  expenseDate: today(),
  expenseTime: nowTime(),
  payMode: '1',
  payType: '0',
  cashPaid: '0.00',
  bankPaid: '0.00',
  partyPaid: '0.00',
  balance: '0.00',
});

const formFromExpense = (e: ExpenseDetail) => ({
  expenseType: e.expenseType ? String(e.expenseType) : '',
  amount: n2(Number(e.amount || 0)),
  qty: e.qty ? String(e.qty) : '',
  busName: e.busName || '',
  area: e.area || '',
  customerName: e.customerName || '',
  phone: e.customerPhone || '',
  content: e.content || '',
  description: e.description || '',
  expenseDate: e.expenseDate || today(),
  expenseTime: (e.expenseTime || nowTime()).slice(0, 5),
  payMode: String(e.payMode || 1),
  payType: String(e.payType || 0),
  cashPaid: n2(Number(e.cashPaid || 0)),
  bankPaid: n2(Number(e.bankPaid || 0)),
  partyPaid: n2(Number(e.partyPaid || 0)),
  balance: n2(Number(e.balance || 0)),
});

const ExpenseEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: pathId } = useParams();
  const expenseId = Number(pathId || 0) || 0;
  const editing = expenseId > 0;
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);
  const original = useRef(emptyForm());
  const [company, setCompany] = useState<ExpenseCompany>({});
  const [print, setPrint] = useState<ExpenseVoucherData[] | null>(null);
  const [custHits, setCustHits] = useState<CustomerHit[]>([]);
  const [open, setOpen] = useState<'name' | 'phone' | null>(null);
  const [active, setActive] = useState(0);
  const timer = useRef<number | null>(null);
  const seq = useRef(0);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    expenseApi.types(0, 500)
      .then((res) => setTypes(expensePage<TypeRow>(res).items))
      .catch((err) => toast.error(expenseError(err, 'Could not load expense types')));
    adminApi.company()
      .then((res) => setCompany(adminData<ExpenseCompany>(res) || {}))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const expense = expenseData<ExpenseDetail>(await expenseApi.get(expenseId));
        if (cancelled) return;
        const next = formFromExpense(expense);
        original.current = next;
        setForm(next);
      } catch (err) {
        if (cancelled) return;
        toast.error(expenseError(err, 'Could not load expense'));
        navigate(routerPathNames.admin.monthlyExpenses);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editing, expenseId, navigate]);

  const amount = parseFloat(form.amount) || 0;
  const cash = parseFloat(form.cashPaid) || 0;
  const bank = parseFloat(form.bankPaid) || 0;
  const party = parseFloat(form.partyPaid) || 0;
  const bal = parseFloat(form.balance) || 0;
  const cashOnly = form.payMode === '1';
  const bankOnly = form.payMode === '2';
  const paidSum = Math.round((cash + bank + party + bal) * 100) / 100;
  const balanced = Math.abs(paidSum - amount) <= 0.01;

  const voucherFromForm = (id?: number): ExpenseVoucherData => ({
    id,
    date: form.expenseDate,
    busName: form.busName.trim(),
    customerName: form.customerName.trim(),
    phone: form.phone.trim(),
    area: form.area.trim(),
    qty: parseFloat(form.qty) || 0,
    amount,
    content: form.content.trim(),
    typeName: types.find((t) => String(t.id) === form.expenseType)?.name,
    paid: bal <= 0.01,
  });

  const searchCustomers = (value: string, field: 'name' | 'phone') => {
    setOpen(field);
    setActive(0);
    if (timer.current) window.clearTimeout(timer.current);
    const q = value.trim();
    if (q.length < (field === 'phone' ? 2 : 1)) {
      setCustHits([]);
      return;
    }
    const id = ++seq.current;
    timer.current = window.setTimeout(async () => {
      try {
        const res = field === 'phone'
          ? await ticketApi.searchCustomers(undefined, q)
          : await ticketApi.searchCustomers(q);
        if (id !== seq.current) return;
        setCustHits(ticketData<CustomerHit[]>(res) || []);
      } catch (err) {
        if (id !== seq.current) return;
        setCustHits([]);
        toast.error(ticketError(err, 'Customer search failed'));
      }
    }, 250);
  };

  const pickCustomer = (hit: CustomerHit) => {
    setForm((f) => ({ ...f, customerName: hit.name, phone: hit.phone || '' }));
    setOpen(null);
    setCustHits([]);
  };

  const onKey = (count: number, pick: (index: number) => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || count === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(count - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Escape') {
      setOpen(null);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(Math.min(active, count - 1));
    }
  };

  const applyMode = (mode: string, amt = amount) => {
    if (mode === '1') {
      setForm((f) => ({ ...f, payMode: mode, payType: '0', cashPaid: n2(amt), bankPaid: '0.00', partyPaid: '0.00', balance: '0.00' }));
    } else if (mode === '2') {
      setForm((f) => ({ ...f, payMode: mode, payType: f.payType === '0' ? '1' : f.payType, cashPaid: '0.00', bankPaid: n2(amt), partyPaid: '0.00', balance: '0.00' }));
    } else {
      setForm((f) => ({ ...f, payMode: mode, payType: f.payType === '0' ? '1' : f.payType, cashPaid: n2(amt), bankPaid: '0.00', partyPaid: '0.00', balance: '0.00' }));
    }
  };

  const onAmount = (value: string) => {
    const amt = parseFloat(value) || 0;
    setForm((f) => {
      if (f.payMode === '1') return { ...f, amount: value, cashPaid: n2(amt), bankPaid: '0.00', partyPaid: '0.00', balance: '0.00' };
      if (f.payMode === '2') return { ...f, amount: value, cashPaid: '0.00', bankPaid: n2(amt), partyPaid: '0.00', balance: '0.00' };
      return { ...f, amount: value, cashPaid: n2(amt), bankPaid: '0.00', partyPaid: '0.00', balance: '0.00' };
    });
  };

  const onCash = (value: string) => {
    const paid = parseFloat(value) || 0;
    const nextParty = parseFloat(form.partyPaid) || 0;
    if (cashOnly) {
      setForm((f) => ({ ...f, cashPaid: value, balance: n2(Math.max(0, amount - paid - nextParty)) }));
    } else {
      const nextBal = parseFloat(form.balance) || 0;
      setForm((f) => ({ ...f, cashPaid: value, bankPaid: n2(Math.max(0, amount - paid - nextBal - nextParty)) }));
    }
  };

  const onBank = (value: string) => {
    const paid = parseFloat(value) || 0;
    const nextParty = parseFloat(form.partyPaid) || 0;
    if (bankOnly) {
      setForm((f) => ({ ...f, bankPaid: value, balance: n2(Math.max(0, amount - paid - nextParty)) }));
    } else {
      const nextBal = parseFloat(form.balance) || 0;
      setForm((f) => ({ ...f, bankPaid: value, cashPaid: n2(Math.max(0, amount - paid - nextBal - nextParty)) }));
    }
  };

  const onParty = (value: string) => {
    const paid = parseFloat(value) || 0;
    setForm((f) => {
      const nextBal = parseFloat(f.balance) || 0;
      if (f.payMode === '1') {
        return { ...f, partyPaid: value, cashPaid: n2(Math.max(0, amount - paid - nextBal)), bankPaid: '0.00' };
      }
      if (f.payMode === '2') {
        return { ...f, partyPaid: value, bankPaid: n2(Math.max(0, amount - paid - nextBal)), cashPaid: '0.00' };
      }
      const nextBank = parseFloat(f.bankPaid) || 0;
      return { ...f, partyPaid: value, cashPaid: n2(Math.max(0, amount - paid - nextBank - nextBal)) };
    });
  };

  const onBalance = (value: string) => {
    const nextBal = parseFloat(value) || 0;
    const nextBank = parseFloat(form.bankPaid) || 0;
    const nextParty = parseFloat(form.partyPaid) || 0;
    setForm((f) => ({ ...f, balance: value, cashPaid: n2(Math.max(0, amount - nextBank - nextBal - nextParty)) }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.expenseType) {
      toast.warning('Please select an expense type');
      return;
    }
    if (amount <= 0) {
      toast.warning('Please enter a valid amount');
      return;
    }
    if (!form.content.trim()) {
      toast.warning('Please enter content');
      return;
    }
    if (!form.expenseDate) {
      toast.warning('Please select a date');
      return;
    }
    if (!form.expenseTime) {
      toast.warning('Please select a time');
      return;
    }
    if (!balanced) {
      toast.error('Cash + Bank + Paid by party + Balance must equal the expense amount.');
      return;
    }
    if (cashOnly && cash <= 0 && bal <= 0 && party <= 0) {
      toast.warning('Please enter cash paid or paid by party.');
      return;
    }
    if (bankOnly && bank <= 0 && bal <= 0 && party <= 0) {
      toast.warning('Please enter bank paid or paid by party.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        expenseType: Number(form.expenseType),
        content: form.content.trim(),
        description: form.description.trim(),
        qty: parseFloat(form.qty) || 0,
        busName: form.busName.trim(),
        area: form.area.trim(),
        customerName: form.customerName.trim(),
        customerPhone: form.phone.trim(),
        amount,
        expenseDate: form.expenseDate,
        expenseTime: form.expenseTime,
        payMode: Number(form.payMode),
        payType: cashOnly ? 0 : Number(form.payType),
        cashPaid: cashOnly ? cash : cash,
        bankPaid: cashOnly ? 0 : bank,
        partyPaid: party,
        balance: bal,
      };
      const saved = expenseData<{ id?: number }>(
        editing ? await expenseApi.update(expenseId, payload) : await expenseApi.saveEntry(payload)
      );
      if (editing) {
        toast.success('Expense updated');
        navigate(routerPathNames.admin.monthlyExpenses);
        return;
      }
      toast.success('Expense entry added successfully!');
      setPrint([voucherFromForm(saved?.id)]);
      setForm(emptyForm());
      setOpen(null);
    } catch (err) {
      toast.error(expenseError(err, editing ? 'Could not update expense' : 'Could not save expense'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="mst-page"><div className="mst-empty">Loading expense…</div></div>;
  }

  const previewPrint = () => {
    if (amount <= 0 || !form.content.trim()) {
      toast.warning('Enter amount and content before printing');
      return;
    }
    setPrint([voucherFromForm()]);
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-receipt" /> {editing ? 'Edit Expense' : 'Expense Entry'}</h2>
      <div className="mst-card" style={{ maxWidth: 900 }}>
        <div className="mst-card-h">{editing ? `Expense #${expenseId}` : 'Add Expense Entry'}</div>
        <form className="mst-card-b mst-form" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Expense Type <span className="req">*</span></label>
            <select className="mst-sel" value={form.expenseType} onChange={(e) => setForm({ ...form, expenseType: e.target.value })}>
              <option value="">-- Select Expense Type --</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="mst-fg">
            <label>Customer Name</label>
            <div className="crd-search-wrap">
              <input
                className="mst-inp"
                value={form.customerName}
                autoComplete="off"
                placeholder="Type name"
                onChange={(e) => {
                  setForm((f) => ({ ...f, customerName: e.target.value }));
                  searchCustomers(e.target.value, 'name');
                }}
                onFocus={() => form.customerName.trim() && searchCustomers(form.customerName, 'name')}
                onBlur={() => window.setTimeout(() => setOpen((cur) => (cur === 'name' ? null : cur)), 160)}
                onKeyDown={onKey(custHits.length, (i) => custHits[i] && pickCustomer(custHits[i]))}
              />
              {open === 'name' && (
                <ul className="crd-dropdown">
                  {custHits.length === 0 ? (
                    <li className="muted">{form.customerName.trim() ? 'Type to search, or keep this name' : 'Type to search'}</li>
                  ) : custHits.map((h, i) => (
                    <li key={h.id} style={{ background: i === active ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : undefined }} onMouseDown={(e) => { e.preventDefault(); pickCustomer(h); }}>
                      <strong>{h.name}</strong>
                      {h.phone ? <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>{h.phone}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mst-fg">
            <label>Customer Phone</label>
            <div className="crd-search-wrap">
              <input
                className="mst-inp"
                value={form.phone}
                autoComplete="off"
                placeholder="Type phone"
                onChange={(e) => {
                  setForm((f) => ({ ...f, phone: e.target.value }));
                  searchCustomers(e.target.value, 'phone');
                }}
                onFocus={() => form.phone.trim().length >= 2 && searchCustomers(form.phone, 'phone')}
                onBlur={() => window.setTimeout(() => setOpen((cur) => (cur === 'phone' ? null : cur)), 160)}
                onKeyDown={onKey(custHits.length, (i) => custHits[i] && pickCustomer(custHits[i]))}
              />
              {open === 'phone' && (
                <ul className="crd-dropdown">
                  {custHits.length === 0 ? (
                    <li className="muted">{form.phone.trim() ? 'Type to search, or keep this phone' : 'Type to search'}</li>
                  ) : custHits.map((h, i) => (
                    <li key={h.id} style={{ background: i === active ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : undefined }} onMouseDown={(e) => { e.preventDefault(); pickCustomer(h); }}>
                      <strong>{h.phone || h.name}</strong>
                      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>{h.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mst-fg">
            <label>Area</label>
            <input className="mst-inp" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Area" />
          </div>
          <div className="mst-fg">
            <label>Qty</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="0" />
          </div>
          <div className="mst-fg">
            <label>Bus Name</label>
            <input className="mst-inp" value={form.busName} onChange={(e) => setForm({ ...form, busName: e.target.value })} placeholder="Bus name" />
          </div>
          <div className="mst-fg">
            <label>Amount <span className="req">*</span></label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => onAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <label>Content <span className="req">*</span></label>
            <input className="mst-inp" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Enter content" />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea className="mst-area" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Type anything you want to store here" />
          </div>
          <div className="mst-fg">
            <label>Date <span className="req">*</span></label>
            <input className="mst-inp" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Time <span className="req">*</span></label>
            <input className="mst-inp" type="time" value={form.expenseTime} onChange={(e) => setForm({ ...form, expenseTime: e.target.value })} />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <div className="mst-note" style={{ marginBottom: 0 }}>
              <i className="fas fa-money-bill-wave" /> Cash + Bank + Paid by party + Balance must equal the amount. Paid by party does not affect cash, bank, or day book.
            </div>
          </div>
          <div className="mst-fg">
            <label>Pay Mode</label>
            <select className="mst-sel" value={form.payMode} onChange={(e) => applyMode(e.target.value)}>
              <option value="1">Cash</option>
              <option value="2">Bank</option>
              <option value="3">Mixed</option>
            </select>
          </div>
          <div className="mst-fg">
            <label>Pay Type</label>
            <select className="mst-sel" value={form.payType} disabled={cashOnly} onChange={(e) => setForm({ ...form, payType: e.target.value })}>
              <option value="0">—</option>
              <option value="1">UPI</option>
              <option value="2">Debit Card</option>
              <option value="3">Credit Card</option>
              <option value="4">Net Banking</option>
              <option value="5">Wallet</option>
            </select>
          </div>
          <div className="mst-fg">
            <label>Cash Paid</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.cashPaid} disabled={bankOnly} onChange={(e) => onCash(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Bank Paid</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.bankPaid} disabled={cashOnly} onChange={(e) => onBank(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Paid by party</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.partyPaid} onChange={(e) => onParty(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Balance</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.balance} disabled={form.payMode !== '3'} onChange={(e) => onBalance(e.target.value)} />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 700, color: balanced ? '#15803d' : '#b91c1c' }}>
              Cash {n2(cash)} + Bank {n2(bank)} + Party {n2(party)} + Balance {n2(bal)} = {n2(paidSum)}
              {amount > 0 ? ` / Expense ${n2(amount)}` : ''}
              {amount > 0 && !balanced ? ` · difference ${n2(paidSum - amount)}` : ''}
            </div>
          </div>
          <div className="mst-actions" style={{ gridColumn: '1 / -1' }}>
            {editing && (
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => navigate(routerPathNames.admin.monthlyExpenses)}>
                Back
              </button>
            )}
            <button className="mst-btn mst-btn-outline" type="button" onClick={() => { setForm(editing ? original.current : emptyForm()); setOpen(null); }}>Reset</button>
            <button className="mst-btn mst-btn-outline" type="button" onClick={previewPrint}>
              <i className="fas fa-print" /> Print A5
            </button>
            <button className="mst-btn mst-btn-primary" type="submit" disabled={busy}>
              {busy ? (editing ? 'Updating…' : 'Saving…') : (editing ? 'Update Expense' : 'Save Expense')}
            </button>
          </div>
        </form>
      </div>
      {print && (
        <ExpenseVoucherPreview vouchers={print} company={company} autoPrint onClose={() => setPrint(null)} />
      )}
    </div>
  );
};

export default ExpenseEntryPage;
