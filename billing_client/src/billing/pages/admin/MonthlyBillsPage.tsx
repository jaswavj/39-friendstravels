import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { billingApi } from '../../../api/billing/billing-api-service';
import ListPagination, { normalizePage } from '../../components/ListPagination';
import { handleThermalDispatch } from '../../../api/billing/local-print-agent';
import { routerPathNames } from '../../../routes/routerPathNames';
import { openBillWhatsApp } from '../../components/whatsAppBill';
import { useBillDetail } from '../account-reports/BillDetailModal';
import '../master/Master.css';
import './MonthlyBills.css';

type Card = {
  billId: number;
  billDisplay: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  payable: number;
  paymentMode: number;
  isTaxBill: number;
  stateLabel: string;
  exchanged?: boolean;
  returned?: boolean;
  exchPoint?: number;
};

const monthValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string) => {
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtTime = (t: string) => {
  const parts = String(t || '').split(':');
  if (parts.length < 2) return t || '';
  let h = Number(parts[0]);
  if (!Number.isFinite(h)) return t;
  const m = parts[1];
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const payLabel = (mode: number) => (mode === 2 ? 'Bank' : mode === 3 ? 'Mixed' : 'Cash');

const MonthlyBillsPage: React.FC = () => {
  const navigate = useNavigate();
  const { openBill, billModal } = useBillDetail();
  const [month, setMonth] = useState(monthValue());
  const [rows, setRows] = useState<Card[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;
  const [loading, setLoading] = useState(false);

  const load = async (value = month, p = page) => {
    const [y, m] = value.split('-').map(Number);
    if (!y || !m) return;
    setLoading(true);
    try {
      const res: any = await billingApi.monthBills(y, m, p, PAGE_SIZE);
      if (!res?.success) throw new Error(res?.data?.error || 'Could not load bills');
      const pg = normalizePage<Card>(res.data);
      setRows(pg.items);
      setTotal(pg.total);
      setPage(pg.page);
    } catch (err: any) {
      toast.error(err?.response?.data?.data?.error || err?.message || 'Could not load bills');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const printBill = async (billNo: string) => {
    try {
      const res: any = await billingApi.dispatchPrint(billNo);
      const result = await handleThermalDispatch(res, (no) => {
        navigate(`/app/billing/print/${encodeURIComponent(no || billNo)}`);
      });
      if (result === 'printed' || result === 'local') {
        toast.success('Receipt printed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.data?.error || err?.message || 'Print failed');
    }
  };

  const whatsApp = (card: Card) => {
    void openBillWhatsApp(card).catch(() => toast.error('Could not open WhatsApp'));
  };

  return (
    <div className="mst-page mb-page">
      <h2 className="mst-title"><i className="fas fa-file-invoice" /> Monthly Bills</h2>
      <div className="mst-card" style={{ marginBottom: 14 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg">
            <label>Month</label>
            <input className="mst-inp" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" disabled={loading} onClick={() => { setPage(0); load(month, 0); }}>
              {loading ? 'Loading…' : 'Show Bills'}
            </button>
          </div>
        </div>
      </div>

      {rows && (
        <div className="mb-cards">
          {rows.length === 0 && <div className="mst-empty">No bills in this month.</div>}
          {rows.map((card) => (
            <article className="mb-card" key={card.billId}>
              <div className="mb-card-body">
                <div>
                  <h3 className="mb-name">{card.customerName || 'Walk-in'}</h3>
                  <p className="mb-invoice">Sales Invoice #{card.billDisplay}</p>
                  <p className="mb-meta">
                    {fmtDate(card.date)} · {fmtTime(card.time)}
                    {card.customerPhone ? ` · ${card.customerPhone}` : ''}
                  </p>
                  <div className="mb-chips">
                    <span className="mb-chip">{payLabel(card.paymentMode)}</span>
                    {card.isTaxBill === 1 && <span className="mb-chip">GST</span>}
                    {card.stateLabel && <span className="mb-chip">{card.stateLabel}</span>}
                    {card.exchanged && <span className="mb-chip exch">Exchanged</span>}
                    {card.returned && <span className="mb-chip ret">Returned</span>}
                    {!card.exchanged && !card.returned && <span className="mb-chip sale">No Exchange</span>}
                  </div>
                </div>
                <div className="mb-amt">
                  {inr(Number(card.payable || 0) + Number(card.exchPoint || 0))}
                  {Number(card.exchPoint) > 0 && <small>Exch. {inr(card.exchPoint)}</small>}
                </div>
              </div>
              <div className="mb-actions">
                <button className="mb-act" type="button" onClick={() => openBill(card.billDisplay)}>
                  <i className="fas fa-eye" /> View
                </button>
                <button
                  className="mb-act"
                  type="button"
                  onClick={() => navigate(`${routerPathNames.billing}?edit=${encodeURIComponent(card.billDisplay)}`)}
                >
                  <i className="fas fa-edit" /> Edit
                </button>
                <button className="mb-act mb-act-print" type="button" onClick={() => printBill(card.billDisplay)}>
                  <i className="fas fa-print" /> Print
                </button>
                <button className="mb-act mb-act-wa" type="button" onClick={() => whatsApp(card)}>
                  <i className="fab fa-whatsapp" /> WhatsApp
                </button>
              </div>
            </article>
          ))}
          <ListPagination page={page} size={PAGE_SIZE} total={total} onChange={(p) => load(month, p)} />
        </div>
      )}
      {billModal}
    </div>
  );
};

export default MonthlyBillsPage;
