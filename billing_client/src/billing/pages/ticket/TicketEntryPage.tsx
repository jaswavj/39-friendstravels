import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ticketApi, ticketData, ticketError } from '../../../api/ticket/ticket-api-service';
import { routerPathNames } from '../../../routes/routerPathNames';
import '../master/Master.css';
import '../credit/Credit.css';

type CustomerHit = { id: number; name: string; phone: string };
type PlaceHit = { id: number; name: string };

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const n2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '0.00');
const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

type Kind = 'TICKET' | 'INCOME';

type TicketDetail = {
  id: number;
  kind?: Kind;
  customerId: number;
  customerName: string;
  phone: string;
  fromPlaceId: number;
  fromName: string;
  toPlaceId: number;
  toName: string;
  incomeTypeId?: number;
  incomeTypeName?: string;
  transport: string;
  notes: string;
  amount: number;
  cashPaid: number;
  gpayPaid: number;
  cardPaid: number;
  credit: number;
  entryDate: string;
  entryTime: string;
};

const emptyForm = (kind: Kind = 'TICKET') => ({
  kind,
  customerId: 0,
  customerName: '',
  phone: '',
  fromId: 0,
  fromName: '',
  toId: 0,
  toName: '',
  incomeTypeId: 0,
  incomeTypeName: '',
  transport: '',
  notes: '',
  amount: '',
  cashPaid: '0.00',
  gpayPaid: '0.00',
  cardPaid: '0.00',
  credit: '0.00',
  entryDate: today(),
  entryTime: nowTime(),
});

const formFromTicket = (t: TicketDetail) => ({
  kind: (t.kind === 'INCOME' ? 'INCOME' : 'TICKET') as Kind,
  customerId: Number(t.customerId || 0),
  customerName: t.customerName || '',
  phone: t.phone || '',
  fromId: Number(t.fromPlaceId || 0),
  fromName: t.fromName || '',
  toId: Number(t.toPlaceId || 0),
  toName: t.toName || '',
  incomeTypeId: Number(t.incomeTypeId || 0),
  incomeTypeName: t.incomeTypeName || '',
  transport: t.transport || '',
  notes: t.notes || '',
  amount: n2(Number(t.amount || 0)),
  cashPaid: n2(Number(t.cashPaid || 0)),
  gpayPaid: n2(Number(t.gpayPaid || 0)),
  cardPaid: n2(Number(t.cardPaid || 0)),
  credit: n2(Number(t.credit || 0)),
  entryDate: t.entryDate || today(),
  entryTime: t.entryTime || nowTime(),
});

const TicketEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: pathId } = useParams();
  const [params] = useSearchParams();
  const ticketId = Number(pathId || params.get('id') || 0) || 0;
  const editing = ticketId > 0;
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [custHits, setCustHits] = useState<CustomerHit[]>([]);
  const [placeHits, setPlaceHits] = useState<PlaceHit[]>([]);
  const [incomeHits, setIncomeHits] = useState<PlaceHit[]>([]);
  const [open, setOpen] = useState<'name' | 'phone' | 'from' | 'to' | 'income' | null>(null);
  const [active, setActive] = useState(0);
  const timer = useRef<number | null>(null);
  const seq = useRef(0);
  const original = useRef(emptyForm());
  const income = form.kind === 'INCOME';

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ticket = ticketData<TicketDetail>(await ticketApi.get(ticketId));
        if (cancelled) return;
        const next = formFromTicket(ticket);
        original.current = next;
        setForm(next);
      } catch (err) {
        if (cancelled) return;
        toast.error(ticketError(err, 'Could not load ticket'));
        navigate(routerPathNames.admin.monthlyBills);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editing, ticketId, navigate]);

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

  const searchPlaces = (value: string, field: 'from' | 'to') => {
    setOpen(field);
    setActive(0);
    if (timer.current) window.clearTimeout(timer.current);
    const q = value.trim();
    if (!q) {
      setPlaceHits([]);
      return;
    }
    const id = ++seq.current;
    timer.current = window.setTimeout(async () => {
      try {
        const res = await ticketApi.searchPlaces(q);
        if (id !== seq.current) return;
        setPlaceHits(ticketData<PlaceHit[]>(res) || []);
      } catch (err) {
        if (id !== seq.current) return;
        setPlaceHits([]);
        toast.error(ticketError(err, 'Place search failed'));
      }
    }, 250);
  };

  const pickCustomer = (hit: CustomerHit) => {
    setForm((f) => ({
      ...f,
      customerId: hit.id,
      customerName: hit.name,
      phone: hit.phone || '',
    }));
    setOpen(null);
    setCustHits([]);
  };

  const pickPlace = (field: 'from' | 'to', hit: PlaceHit) => {
    setForm((f) => field === 'from'
      ? { ...f, fromId: hit.id, fromName: hit.name }
      : { ...f, toId: hit.id, toName: hit.name });
    setOpen(null);
    setPlaceHits([]);
  };

  const pickIncomeType = (hit: PlaceHit) => {
    setForm((f) => ({ ...f, incomeTypeId: hit.id, incomeTypeName: hit.name }));
    setOpen(null);
    setIncomeHits([]);
  };

  const switchKind = (kind: Kind) => {
    if (editing) return;
    setForm((f) => ({
      ...emptyForm(kind),
      customerId: f.customerId,
      customerName: f.customerName,
      phone: f.phone,
      entryDate: f.entryDate,
      entryTime: f.entryTime,
    }));
    setOpen(null);
    setPlaceHits([]);
    setIncomeHits([]);
  };

  const searchIncomeTypes = (value: string) => {
    setOpen('income');
    setActive(0);
    if (timer.current) window.clearTimeout(timer.current);
    const q = value.trim();
    if (!q) {
      setIncomeHits([]);
      return;
    }
    const id = ++seq.current;
    timer.current = window.setTimeout(async () => {
      try {
        const res = await ticketApi.searchIncomeTypes(q);
        if (id !== seq.current) return;
        setIncomeHits(ticketData<PlaceHit[]>(res) || []);
      } catch (err) {
        if (id !== seq.current) return;
        setIncomeHits([]);
        toast.error(ticketError(err, 'Income type search failed'));
      }
    }, 250);
  };

  const onAmount = (value: string) => {
    const amt = parseFloat(value) || 0;
    setForm((f) => ({
      ...f,
      amount: value,
      cashPaid: n2(amt),
      gpayPaid: '0.00',
      cardPaid: '0.00',
      credit: '0.00',
    }));
  };

  const shown = (raw: string, capped: number, amount: number) => (num(raw) > amount ? n2(capped) : raw);

  const onPay = (field: 'cashPaid' | 'gpayPaid' | 'cardPaid', value: string) => {
    setForm((f) => {
      const amt = num(f.amount);
      const typed = Math.min(amt, Math.max(0, num(value)));
      let cash = num(f.cashPaid);
      let gpay = num(f.gpayPaid);
      let card = num(f.cardPaid);
      let credit = num(f.credit);
      if (field === 'cashPaid') {
        cash = typed;
        const left = Math.max(0, amt - cash);
        if (gpay + card > left) {
          gpay = Math.min(gpay, left);
          card = Math.min(card, Math.max(0, left - gpay));
        }
        credit = Math.max(0, Math.round((amt - cash - gpay - card) * 100) / 100);
      } else {
        if (field === 'gpayPaid') gpay = typed;
        if (field === 'cardPaid') card = typed;
        if (gpay + card > amt) {
          if (field === 'gpayPaid') card = Math.max(0, amt - gpay);
          else gpay = Math.max(0, amt - card);
        }
        const overflow = cash + gpay + card + credit - amt;
        if (overflow > 0.001) {
          const cashCut = Math.min(cash, overflow);
          cash = Math.round((cash - cashCut) * 100) / 100;
          const still = cash + gpay + card + credit - amt;
          if (still > 0.001) credit = Math.max(0, Math.round((credit - still) * 100) / 100);
        } else {
          cash = Math.max(0, Math.round((amt - gpay - card - credit) * 100) / 100);
        }
      }
      return {
        ...f,
        cashPaid: field === 'cashPaid' ? shown(value, typed, amt) : n2(cash),
        gpayPaid: field === 'gpayPaid' ? shown(value, typed, amt) : n2(gpay),
        cardPaid: field === 'cardPaid' ? shown(value, typed, amt) : n2(card),
        credit: n2(credit),
      };
    });
  };

  const onCredit = (value: string) => {
    setForm((f) => {
      const amt = num(f.amount);
      const nextCredit = Math.min(amt, Math.max(0, num(value)));
      let gpay = num(f.gpayPaid);
      let card = num(f.cardPaid);
      const room = Math.max(0, amt - nextCredit);
      if (gpay + card > room) {
        gpay = Math.min(gpay, room);
        card = Math.min(card, Math.max(0, room - gpay));
      }
      const cash = Math.max(0, Math.round((room - gpay - card) * 100) / 100);
      return {
        ...f,
        credit: shown(value, nextCredit, amt),
        cashPaid: n2(cash),
        gpayPaid: n2(gpay),
        cardPaid: n2(card),
      };
    });
  };

  const amount = num(form.amount);
  const cash = num(form.cashPaid);
  const gpay = num(form.gpayPaid);
  const card = num(form.cardPaid);
  const credit = num(form.credit);
  const paidSum = Math.round((cash + gpay + card + credit) * 100) / 100;
  const balanced = Math.abs(paidSum - amount) <= 0.01;

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      toast.warning('Customer name is required');
      return;
    }
    if (income) {
      if (!form.incomeTypeName.trim()) {
        toast.warning('Income type is required');
        return;
      }
    } else {
      if (!form.fromName.trim() || !form.toName.trim()) {
        toast.warning('From and To are required');
        return;
      }
      if (!form.transport.trim()) {
        toast.warning('Transport is required');
        return;
      }
    }
    if (amount <= 0) {
      toast.warning(income ? 'Please enter a valid income amount' : 'Please enter a valid ticket amount');
      return;
    }
    if (!balanced) {
      toast.error('Cash + GPay + Card + Credit must equal the amount');
      return;
    }
    const payload = {
      kind: form.kind,
      customerId: form.customerId || undefined,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      fromPlaceId: income ? undefined : (form.fromId || undefined),
      fromName: income ? '' : form.fromName.trim(),
      toPlaceId: income ? undefined : (form.toId || undefined),
      toName: income ? '' : form.toName.trim(),
      transport: income ? '' : form.transport.trim(),
      incomeTypeId: income ? (form.incomeTypeId || undefined) : undefined,
      incomeTypeName: income ? form.incomeTypeName.trim() : '',
      notes: form.notes.trim(),
      amount,
      cashPaid: cash,
      gpayPaid: gpay,
      cardPaid: card,
      credit,
      entryDate: form.entryDate,
      entryTime: form.entryTime,
    };
    setBusy(true);
    try {
      const saved = ticketData<{ credit: number; balance: number }>(
        editing ? await ticketApi.update(ticketId, payload) : await ticketApi.save(payload)
      );
      if (editing) {
        toast.success(credit > 0
          ? `${income ? 'Income' : 'Ticket'} updated. Credit ₹${n2(credit)}. Customer balance ₹${n2(saved.balance)}`
          : `${income ? 'Income' : 'Ticket'} updated`);
        navigate(routerPathNames.admin.monthlyBills);
        return;
      }
      if (credit > 0) {
        toast.success(`${income ? 'Income' : 'Ticket'} saved. Credit ₹${n2(credit)} added. Customer balance ₹${n2(saved.balance)}`);
      } else {
        toast.success(income ? 'Income saved' : 'Ticket saved');
      }
      setForm(emptyForm(form.kind));
      setOpen(null);
    } catch (err) {
      toast.error(ticketError(err, editing ? 'Could not update ticket' : 'Could not save ticket'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="mst-page"><div className="mst-empty">Loading ticket…</div></div>;
  }

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-ticket-alt" /> {editing ? (income ? 'Edit Other Income' : 'Edit Ticket') : 'Ticket Entry'}</h2>
      {!editing && (
        <div className="mst-tabs" style={{ maxWidth: 920 }}>
          <button className={`mst-tab${income ? '' : ' active'}`} type="button" onClick={() => switchKind('TICKET')}>Book Ticket</button>
          <button className={`mst-tab${income ? ' active' : ''}`} type="button" onClick={() => switchKind('INCOME')}>Other Income</button>
        </div>
      )}
      <div className="mst-card" style={{ maxWidth: 920 }}>
        <div className="mst-card-h">{editing ? `${income ? 'Income' : 'Ticket'} #${ticketId}` : (income ? 'Other Income' : 'Book Ticket')}</div>
        <form className="mst-card-b mst-form" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Customer Name <span className="req">*</span></label>
            <div className="crd-search-wrap">
              <input
                className="mst-inp"
                value={form.customerName}
                autoComplete="off"
                placeholder="Type name"
                onChange={(e) => {
                  setForm((f) => ({ ...f, customerName: e.target.value, customerId: 0 }));
                  searchCustomers(e.target.value, 'name');
                }}
                onFocus={() => form.customerName.trim() && searchCustomers(form.customerName, 'name')}
                onBlur={() => window.setTimeout(() => setOpen((cur) => (cur === 'name' ? null : cur)), 160)}
                onKeyDown={onKey(custHits.length, (i) => custHits[i] && pickCustomer(custHits[i]))}
              />
              {open === 'name' && (
                <ul className="crd-dropdown">
                  {custHits.length === 0 ? (
                    <li className="muted">{form.customerName.trim() ? 'New customer — will be saved' : 'Type to search'}</li>
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
            <label>Phone Number</label>
            <div className="crd-search-wrap">
              <input
                className="mst-inp"
                value={form.phone}
                autoComplete="off"
                placeholder="Type phone"
                onChange={(e) => {
                  setForm((f) => ({ ...f, phone: e.target.value, customerId: 0 }));
                  searchCustomers(e.target.value, 'phone');
                }}
                onFocus={() => form.phone.trim().length >= 2 && searchCustomers(form.phone, 'phone')}
                onBlur={() => window.setTimeout(() => setOpen((cur) => (cur === 'phone' ? null : cur)), 160)}
                onKeyDown={onKey(custHits.length, (i) => custHits[i] && pickCustomer(custHits[i]))}
              />
              {open === 'phone' && (
                <ul className="crd-dropdown">
                  {custHits.length === 0 ? (
                    <li className="muted">{form.phone.trim() ? 'New phone — customer will be saved' : 'Type to search'}</li>
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
          {income ? (
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <label>Income Type <span className="req">*</span></label>
            <div className="crd-search-wrap">
              <input
                className="mst-inp"
                value={form.incomeTypeName}
                autoComplete="off"
                placeholder="Type income type"
                onChange={(e) => {
                  setForm((f) => ({ ...f, incomeTypeName: e.target.value, incomeTypeId: 0 }));
                  searchIncomeTypes(e.target.value);
                }}
                onFocus={() => form.incomeTypeName.trim() && searchIncomeTypes(form.incomeTypeName)}
                onBlur={() => window.setTimeout(() => setOpen((cur) => (cur === 'income' ? null : cur)), 160)}
                onKeyDown={onKey(incomeHits.length, (i) => incomeHits[i] && pickIncomeType(incomeHits[i]))}
              />
              {open === 'income' && (
                <ul className="crd-dropdown">
                  {incomeHits.length === 0 ? (
                    <li className="muted">{form.incomeTypeName.trim() ? 'New income type — will be saved' : 'Type to search'}</li>
                  ) : incomeHits.map((h, i) => (
                    <li key={h.id} style={{ background: i === active ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : undefined }} onMouseDown={(e) => { e.preventDefault(); pickIncomeType(h); }}>
                      {h.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          ) : (
          <>
          <div className="mst-fg">
            <label>From <span className="req">*</span></label>
            <div className="crd-search-wrap">
              <input
                className="mst-inp"
                value={form.fromName}
                autoComplete="off"
                placeholder="From place"
                onChange={(e) => {
                  setForm((f) => ({ ...f, fromName: e.target.value, fromId: 0 }));
                  searchPlaces(e.target.value, 'from');
                }}
                onFocus={() => form.fromName.trim() && searchPlaces(form.fromName, 'from')}
                onBlur={() => window.setTimeout(() => setOpen((cur) => (cur === 'from' ? null : cur)), 160)}
                onKeyDown={onKey(placeHits.length, (i) => placeHits[i] && pickPlace('from', placeHits[i]))}
              />
              {open === 'from' && (
                <ul className="crd-dropdown">
                  {placeHits.length === 0 ? (
                    <li className="muted">{form.fromName.trim() ? 'New place — will be saved' : 'Type to search'}</li>
                  ) : placeHits.map((h, i) => (
                    <li key={h.id} style={{ background: i === active ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : undefined }} onMouseDown={(e) => { e.preventDefault(); pickPlace('from', h); }}>
                      {h.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mst-fg">
            <label>To <span className="req">*</span></label>
            <div className="crd-search-wrap">
              <input
                className="mst-inp"
                value={form.toName}
                autoComplete="off"
                placeholder="To place"
                onChange={(e) => {
                  setForm((f) => ({ ...f, toName: e.target.value, toId: 0 }));
                  searchPlaces(e.target.value, 'to');
                }}
                onFocus={() => form.toName.trim() && searchPlaces(form.toName, 'to')}
                onBlur={() => window.setTimeout(() => setOpen((cur) => (cur === 'to' ? null : cur)), 160)}
                onKeyDown={onKey(placeHits.length, (i) => placeHits[i] && pickPlace('to', placeHits[i]))}
              />
              {open === 'to' && (
                <ul className="crd-dropdown">
                  {placeHits.length === 0 ? (
                    <li className="muted">{form.toName.trim() ? 'New place — will be saved' : 'Type to search'}</li>
                  ) : placeHits.map((h, i) => (
                    <li key={h.id} style={{ background: i === active ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : undefined }} onMouseDown={(e) => { e.preventDefault(); pickPlace('to', h); }}>
                      {h.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mst-fg">
            <label>Transport <span className="req">*</span></label>
            <input className="mst-inp" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} placeholder="Bus, train, or vehicle" />
          </div>
          </>
          )}
          <div className="mst-fg">
            <label>{income ? 'Income Amount' : 'Ticket Amount'} <span className="req">*</span></label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => onAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea className="mst-area" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Seat, passenger, or other notes" />
          </div>
          <div className="mst-fg">
            <label>Date <span className="req">*</span></label>
            <input className="mst-inp" type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Time <span className="req">*</span></label>
            <input className="mst-inp" type="time" value={form.entryTime} onChange={(e) => setForm({ ...form, entryTime: e.target.value })} />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <div className="mst-note" style={{ marginBottom: 0 }}>
              <i className="fas fa-money-bill-wave" /> Cash + GPay + Card + Credit must equal the {income ? 'income' : 'ticket'} amount. Credit is added to the customer account and collected in Credit Management.
            </div>
          </div>
          <div className="mst-fg">
            <label>Cash</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.cashPaid} onChange={(e) => onPay('cashPaid', e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>GPay</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.gpayPaid} onChange={(e) => onPay('gpayPaid', e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Card</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.cardPaid} onChange={(e) => onPay('cardPaid', e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Credit</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.credit} onChange={(e) => onCredit(e.target.value)} />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 700, color: balanced ? '#15803d' : '#b91c1c' }}>
              Cash {n2(cash)} + GPay {n2(gpay)} + Card {n2(card)} + Credit {n2(credit)} = {n2(paidSum)}
              {amount > 0 ? ` / ${income ? 'Income' : 'Ticket'} ${n2(amount)}` : ''}
              {amount > 0 && !balanced ? ` · difference ${n2(paidSum - amount)}` : ''}
            </div>
          </div>
          <div className="mst-actions" style={{ gridColumn: '1 / -1' }}>
            {editing && (
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => navigate(routerPathNames.admin.monthlyBills)}>
                Back
              </button>
            )}
            <button className="mst-btn mst-btn-outline" type="button" onClick={() => { setForm(editing ? original.current : emptyForm(form.kind)); setOpen(null); }}>
              Reset
            </button>
            <button className="mst-btn mst-btn-primary" type="submit" disabled={busy}>
              {busy ? (editing ? 'Updating…' : 'Saving…') : (editing ? (income ? 'Update Income' : 'Update Ticket') : (income ? 'Save Income' : 'Save Ticket'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketEntryPage;
