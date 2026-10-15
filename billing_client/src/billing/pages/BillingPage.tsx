import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminApi } from '../../api/admin/admin-api-service';
import { BillingApiService } from '../../api/billing/billing-api-service';
import { handleThermalDispatch } from '../../api/billing/local-print-agent';
import { OrderListApiService } from '../../api/orders/order-list-api-service';
import { routerPathNames } from '../../routes/routerPathNames';
import { RootState } from '../../state/store';
import { A4Invoice } from './A4Invoice';
import './BillingPage.css';

type Product = {
  id: number;
  code: string;
  name: string;
  mrp: number;
  batchId: number;
  unitName: string;
  convertionUnit: string;
  commission: number;
  stock: number;
  categoryId?: number;
  discType?: number;
  productDiscount?: number;
};

type MenuCategory = { id: number; name: string };

type Line = {
  key: number;
  productId: number;
  code: string;
  name: string;
  qty: number;
  displayQty: number;
  displayUnit: string;
  price: number;
  discType: 1 | 2;
  discInput: number;
  discount: number;
  commissionPer: number;
  commission: number;
  total: number;
  batchId: number;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  isEligibleForCommission: number;
  exchangePoint: number;
};

const api = new BillingApiService();
const ordersApi = new OrderListApiService();
const money = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : '0.000');
const rupee = (n: number) => `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

const CafeItemIcon: React.FC = () => (
  <svg className="cafe-item-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3.6" y="2.2" width="2.2" height="8.2" rx="1.1" />
    <rect x="6.9" y="2.2" width="2.2" height="8.2" rx="1.1" />
    <rect x="10.2" y="2.2" width="2.2" height="8.2" rx="1.1" />
    <path d="M3.6 9.4h8.8v1.5c0 2.5-2 4.4-4.4 4.4s-4.4-1.9-4.4-4.4V9.4z" />
    <rect x="6.9" y="14.8" width="2.2" height="7" rx="1.1" />
    <path d="M16.2 2.3c4.1 3.4 5.7 7.6 5.7 11.4 0 1.5-.8 2.4-2 2.4h-1.7V2.3z" />
    <rect x="16.2" y="16.1" width="2.4" height="5.7" rx="1.2" />
  </svg>
);

const BillingPage: React.FC = () => {
  const login = useSelector((s: RootState) => s.loginData);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [discPer, setDiscPer] = useState(login.discPer || 100);
  const [canBillWithoutStock, setCanBillWithoutStock] = useState(false);
  const [billingType, setBillingType] = useState(1);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [menuCategory, setMenuCategory] = useState(0);
  const [menuQuery, setMenuQuery] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState(0);
  const [customerHits, setCustomerHits] = useState<Customer[]>([]);
  const [custField, setCustField] = useState<'name' | 'phone' | null>(null);
  const [custIndex, setCustIndex] = useState(0);
  const [exchangePoint, setExchangePoint] = useState(0);
  const [exchangeUsed, setExchangeUsed] = useState(0);
  const [bypassCap, setBypassCap] = useState(false);
  const [isTaxBill, setIsTaxBill] = useState(true);
  const [isCommission, setIsCommission] = useState(false);

  const [search, setSearch] = useState('');
  const [nameHits, setNameHits] = useState<string[]>([]);
  const [pending, setPending] = useState<Product | null>(null);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [unitSel, setUnitSel] = useState('');
  const [stock, setStock] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const custPhoneRef = useRef<HTMLInputElement>(null);
  const taxBillRef = useRef<HTMLInputElement>(null);
  const custHitRef = useRef<HTMLButtonElement>(null);
  const custSearchSeq = useRef(0);
  const autoPay = useRef(true);

  const [lines, setLines] = useState<Line[]>([]);
  const [, setLineKey] = useState(1);
  const [extraDisc, setExtraDisc] = useState('0');
  const [mode, setMode] = useState('1');
  const [payType, setPayType] = useState('1');
  const [cashPaid, setCashPaid] = useState('0');
  const [bankPaid, setBankPaid] = useState('0');
  const [balance, setBalance] = useState('0');
  const [payEpoch, setPayEpoch] = useState(0);
  const [saving, setSaving] = useState(false);
  const [holding, setHolding] = useState(false);
  const [savedNo, setSavedNo] = useState('');
  const [savedStamp, setSavedStamp] = useState(-1);
  const billStampRef = useRef(0);
  const [billStamp, setBillStamp] = useState(0);
  const [quotationId, setQuotationId] = useState(0);
  const editingHoldIdRef = useRef(0);
  const loadHoldSeqRef = useRef(0);
  const loadHoldBusyIdRef = useRef(0);
  const billSessionRef = useRef(0);
  const holdSavingRef = useRef(false);
  const cartGenRef = useRef(0);
  const saleTouchGenRef = useRef(0);
  const linesStampRef = useRef(0);
  const [holdNo, setHoldNo] = useState('');

  const [saveOpen, setSaveOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderId, setOrderId] = useState(0);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holds, setHolds] = useState<any[]>([]);
  const [dupeOpen, setDupeOpen] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const [dupeNo, setDupeNo] = useState('');
  const [history, setHistory] = useState<any[] | null>(null);
  const [historyName, setHistoryName] = useState('');
  const [a4Bill, setA4Bill] = useState<any>(null);
  const [editBillId, setEditBillId] = useState(0);
  const [editBillNo, setEditBillNo] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api.options().then((res: any) => {
      if (res?.success && res.data) {
        setDiscPer(res.data.discPer ?? 100);
        setCanBillWithoutStock(!!res.data.canBillWithoutStock);
        setBillingType(res.data.billingType === 2 ? 2 : 1);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (billingType !== 2) return;
    api.menu().then((res: any) => {
      if (res?.success && res.data) {
        setCategories(res.data.categories || []);
        setMenuProducts(res.data.products || []);
      }
    }).catch(() => undefined);
  }, [billingType]);

  useEffect(() => {
    const billNo = (searchParams.get('edit') || '').trim();
    if (!billNo) return;
    let live = true;
    const loadSession = billSessionRef.current;
    (async () => {
      try {
        const res: any = await api.editBill(billNo);
        if (!live || loadSession !== billSessionRef.current) return;
        if (!res?.success || !res.data) {
          toast.error(res?.data?.error || 'Bill not found');
          return;
        }
        const data = res.data;
        const items: any[] = data.products || [];
        autoPay.current = false;
        setEditBillId(data.billId);
        setEditBillNo(data.billDisplay);
        setLines(items.map((item, idx) => ({
          key: idx + 1,
          productId: item.productId,
          code: item.code,
          name: item.name,
          qty: item.qty,
          displayQty: item.qty,
          displayUnit: item.unitName || '',
          price: item.price,
          discType: 1 as const,
          discInput: item.discount || 0,
          discount: item.discount || 0,
          commissionPer: item.commission || 0,
          commission: (item.commission || 0) * (item.qty || 0),
          total: item.total,
          batchId: item.batchId,
        })));
        setLineKey(items.length + 1);
        const empty = (v?: string) => (!v || v === '-' ? '' : v);
        setCustomerName(empty(data.customerName));
        setCustomerPhone(empty(data.customerPhone));
        setCustomerId(data.customerId || 0);
        setIsTaxBill(data.isTaxBill === 1);
        setIsCommission(data.isEligibleForCommission === 1 || items.some((item) => (item.commission || 0) > 0));
        setExtraDisc(String(data.extraDisc || 0));
        setMode(String(data.paymentMode || 1));
        setPayType(String(data.paymentType || 1));
        setCashPaid(money(data.cashPaid || 0));
        setBankPaid(money(data.bankPaid || 0));
        setBalance(money(data.balance || 0));
        setExchangePoint(data.exchangePoint || 0);
        toast.info(`Editing bill ${data.billDisplay}`);
      } catch (err: any) {
        if (!live) return;
        toast.error(err?.response?.data?.data?.error || 'Could not load bill for edit');
      }
    })();
    return () => { live = false; };
  }, [searchParams]);

  const totals = useMemo(() => {
    const priceTotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
    const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
    const commissionTotal = isCommission ? lines.reduce((s, l) => s + l.commission, 0) : 0;
    const grandTotal = lines.reduce((s, l) => s + (isCommission ? l.total : l.qty * l.price - l.discount), 0);
    return { priceTotal, discountTotal, commissionTotal, grandTotal };
  }, [lines, isCommission]);

  const extra = parseFloat(extraDisc) || 0;
  const exchCredit = Number(exchangeUsed) || 0;
  const payable = Math.max(0, totals.grandTotal - extra - exchCredit);
  const cashAmt = parseFloat(cashPaid) || 0;
  const bankAmt = parseFloat(bankPaid) || 0;
  const paidAmt = cashAmt + bankAmt;
  const dueAmt = Math.max(0, payable - paidAmt);
  const paidOver = paidAmt - payable > 0.001;
  const needsCustomerForDue =
    dueAmt > 0.001 && (!customerName.trim() || customerName.trim() === '-');

  useEffect(() => {
    if (!bypassCap && totals.priceTotal > 0 && discPer < 100) {
      const maxAllowed = (totals.priceTotal * discPer) / 100;
      if (totals.discountTotal + extra > maxAllowed) {
        const maxExtra = Math.max(0, Math.floor(maxAllowed - totals.discountTotal));
        setExtraDisc(String(maxExtra));
        toast.warn(`Max extra discount is ${discPer}% of price total.`);
      }
    }
  }, [extraDisc, totals, discPer, bypassCap]);

  useEffect(() => {
    const afterExtra = Math.max(0, totals.grandTotal - extra);
    const maxUse = Math.min(exchangePoint, afterExtra);
    if (exchangeUsed > maxUse) setExchangeUsed(maxUse);
  }, [totals.grandTotal, extra, exchangePoint, exchangeUsed]);

  useEffect(() => {
    if (!autoPay.current) return;
    if (mode === '1') {
      setCashPaid(money(payable));
      setBankPaid('0');
      setBalance('0');
    } else if (mode === '2') {
      setCashPaid('0');
      setBankPaid(money(payable));
      setBalance('0');
    }
  }, [payable, mode, payEpoch]);

  useEffect(() => {
    setBalance(money(Math.max(0, payable - (parseFloat(cashPaid) || 0) - (parseFloat(bankPaid) || 0))));
  }, [payable, cashPaid, bankPaid]);

  useEffect(() => {
    custHitRef.current?.scrollIntoView({ block: 'nearest' });
  }, [custIndex, customerHits, custField]);

  const clearCustSuggest = () => {
    custSearchSeq.current += 1;
    setCustomerHits([]);
    setCustField(null);
    setCustIndex(0);
  };

  const searchCustomers = async (query: string | undefined, phone: string | undefined, field: 'name' | 'phone') => {
    const seq = ++custSearchSeq.current;
    setCustField(field);
    setCustIndex(0);
    const tooShort = field === 'name'
      ? !query || query.trim().length < 1
      : !phone || phone.trim().length < 2;
    if (tooShort) {
      setCustomerHits([]);
      setCustField(null);
      return;
    }
    try {
      const res: any = await api.searchCustomers(query, phone);
      if (seq !== custSearchSeq.current) return;
      const hits: Customer[] = res?.data || [];
      setCustomerHits(hits);
      setCustIndex(0);
      setCustField(hits.length ? field : null);
    } catch {
      if (seq !== custSearchSeq.current) return;
      setCustomerHits([]);
      setCustField(null);
    }
  };

  const pickCustomer = (c: Customer) => {
    markSaleDraft();
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone === '-' ? '' : c.phone);
    setExchangePoint(c.exchangePoint || 0);
    setExchangeUsed(0);
    if (c.isEligibleForCommission === 1) setIsCommission(true);
    clearCustSuggest();
  };

  const onCustomerKey = (field: 'name' | 'phone') => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const open = custField === field && customerHits.length > 0;
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustIndex((i) => Math.min(customerHits.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      clearCustSuggest();
    } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      const pick = customerHits[Math.min(custIndex, customerHits.length - 1)] || customerHits[0];
      if (pick) pickCustomer(pick);
      if (e.key === 'Tab') {
        if (field === 'name') custPhoneRef.current?.focus();
        else taxBillRef.current?.focus();
      }
    }
  };

  const customerSuggest = (field: 'name' | 'phone') => (
    custField === field && customerHits.length > 0 ? (
      <div className="pos-suggest" role="listbox">
        {customerHits.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={i === custIndex}
            ref={i === custIndex ? custHitRef : undefined}
            className={i === custIndex ? 'on' : ''}
            onMouseEnter={() => setCustIndex(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pickCustomer(c)}
          >
            {c.name} {c.phone && c.phone !== '-' ? `· ${c.phone}` : ''}
          </button>
        ))}
      </div>
    ) : null
  );

  const focusQty = () => {
    requestAnimationFrame(() => {
      qtyRef.current?.focus();
      qtyRef.current?.select();
    });
  };

  const matchesPending = (val: string, p: Product | null) => {
    if (!p) return false;
    const v = val.trim().toLowerCase();
    return v === String(p.code).toLowerCase()
      || v === String(p.name).toLowerCase()
      || v === `${p.code} - ${p.name}`.toLowerCase();
  };

  const applyProduct = (p: Product) => {
    setPending(p);
    setSearch(`${p.code} - ${p.name}`);
    setPrice(String(p.mrp ?? 0));
    setStock(p.stock ?? 0);
    const unit = (p.unitName || '').toLowerCase();
    if (unit === 'kg' || unit === 'kgs') {
      setUnitSel('kg');
    } else {
      setUnitSel('');
    }
    setNameHits([]);
    focusQty();
  };

  const lookupByCode = async (code: string) => {
    const res: any = await api.productByCode(code);
    if (res?.data) {
      applyProduct(res.data);
      return true;
    }
    return false;
  };

  const lookupByName = async (name: string) => {
    const res: any = await api.productByName(name);
    if (res?.data) {
      applyProduct(res.data);
      return true;
    }
    return false;
  };

  const onSearchChange = async (value: string) => {
    setSearch(value);
    if (value.trim().length < 1) {
      setNameHits([]);
      return;
    }
    const res: any = await api.searchProducts(value.trim());
    setNameHits(res?.data || []);
  };

  const onSearchKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    e.preventDefault();
    const val = search.trim();
    if (!val) return;
    if (matchesPending(val, pending)) {
      focusQty();
      return;
    }
    const labeled = val.match(/^(.+?)\s+-\s+(.+)$/);
    if (labeled) {
      if (!(await lookupByCode(labeled[1].trim()))) toast.error(`Product not found: ${labeled[1].trim()}`);
      return;
    }
    if (await lookupByCode(val)) return;
    const name = nameHits[0] || val;
    if (await lookupByName(name)) return;
    if (name !== val && (await lookupByName(val))) return;
    toast.error(`Product not found: ${val}`);
  };

  const addedQty = (productId: number) =>
    lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0);

  const visibleProducts = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    return menuProducts.filter((p) => {
      if (menuCategory !== 0 && Number(p.categoryId) !== menuCategory) return false;
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q) || String(p.code || '').toLowerCase().includes(q);
    });
  }, [menuProducts, menuCategory, menuQuery]);

  const lineDiscountFromMaster = (subtotal: number, p: Product) => {
    const rawType = Number(p.discType) || 0;
    if (rawType !== 1 && rawType !== 2) {
      return { discType: 1 as const, discInput: 0, discount: 0 };
    }
    const discType = rawType as 1 | 2;
    let discInput = Number(p.productDiscount) || 0;
    if (discType === 2) discInput = Math.min(100, discInput);
    else discInput = Math.min(subtotal, discInput);
    const discount = discType === 2 ? (subtotal * discInput) / 100 : discInput;
    return { discType, discInput, discount };
  };

  const buildLine = (p: Product, qtyInput: number, unitPrice: number, unitChoice: string, key: number): Line => {
    const unitName = (p.unitName || '').toLowerCase();
    let actualQty = qtyInput;
    let displayUnit = p.convertionUnit || p.unitName;
    if ((unitName === 'kg' || unitName === 'kgs') && unitChoice === 'gram') {
      actualQty = qtyInput / 1000;
      displayUnit = 'Gram';
    } else if (unitName === 'kg' || unitName === 'kgs') {
      displayUnit = 'KG';
    }
    const subtotal = actualQty * unitPrice;
    const commission = isCommission ? p.commission * actualQty : 0;
    const disc = lineDiscountFromMaster(subtotal, p);
    return {
      key,
      productId: p.id,
      code: p.code,
      name: p.name,
      qty: actualQty,
      displayQty: qtyInput,
      displayUnit,
      price: unitPrice,
      discType: disc.discType,
      discInput: disc.discInput,
      discount: disc.discount,
      commissionPer: p.commission,
      commission,
      total: subtotal - disc.discount - commission,
      batchId: p.batchId,
    };
  };

  const addProduct = () => {
    if (!pending) {
      toast.error('Select a product first');
      return;
    }
    const qtyInput = parseFloat(qty);
    const unitPrice = parseFloat(price);
    if (!qtyInput || !Number.isFinite(unitPrice)) {
      toast.error('Enter quantity and price');
      return;
    }
    const unitName = (pending.unitName || '').toLowerCase();
    let actualQty = qtyInput;
    if ((unitName === 'kg' || unitName === 'kgs') && unitSel === 'gram') {
      actualQty = qtyInput / 1000;
    }
    const already = addedQty(pending.id);
    const available = (stock ?? 0) - already;
    if (!canBillWithoutStock && actualQty > available) {
      toast.warn(`Stock limit. Available to add: ${available}`);
      return;
    }
    const stamp = linesStampRef.current;
    setLines((prev) => {
      if (linesStampRef.current !== stamp) return prev;
      return [...prev, buildLine(pending, qtyInput, unitPrice, unitSel, prev.reduce((m, l) => Math.max(m, l.key), 0) + 1)];
    });
    if (editingHoldIdRef.current <= 0) clearHoldTracking();
    setPending(null);
    setSearch('');
    setQty('1');
    setPrice('');
    setUnitSel('');
    setStock(null);
    setNameHits([]);
    searchRef.current?.focus();
  };

  const addMenuProduct = (p: Product) => {
    const unitPrice = Number(p.mrp ?? 0);
    if (!Number.isFinite(unitPrice)) {
      toast.error('Enter quantity and price');
      return;
    }
    const already = addedQty(p.id);
    const available = (p.stock ?? 0) - already;
    if (!canBillWithoutStock && 1 > available) {
      toast.warn(`Stock limit. Available to add: ${available}`);
      return;
    }
    const existing = lines.find((l) => l.productId === p.id);
    if (existing) {
      updateLineQtyPrice(existing.key, existing.qty + 1, existing.price);
      return;
    }
    const stamp = linesStampRef.current;
    setLines((prev) => {
      if (linesStampRef.current !== stamp) return prev;
      return [...prev, buildLine(p, 1, unitPrice, '', prev.reduce((m, l) => Math.max(m, l.key), 0) + 1)];
    });
    if (editingHoldIdRef.current <= 0) clearHoldTracking();
  };

  const lineAmount = (line: Line) => (isCommission ? line.total : line.qty * line.price - line.discount);

  const changeMenuQty = (line: Line, delta: number) => {
    const next = line.qty + delta;
    if (next <= 0) {
      removeLine(line.key);
      return;
    }
    if (delta > 0) {
      const product = menuProducts.find((p) => p.id === line.productId);
      const already = addedQty(line.productId);
      const available = (product?.stock ?? 0) - already;
      if (!canBillWithoutStock && 1 > available) {
        toast.warn(`Stock limit. Available to add: ${available}`);
        return;
      }
    }
    updateLineQtyPrice(line.key, next, line.price);
  };

  const updateLineDisc = (key: number, discType: 1 | 2, discInput: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const subtotal = line.qty * line.price;
        let input = discInput;
        if (discType === 2) input = Math.min(100, input);
        else input = Math.min(subtotal, input);
        const discount = discType === 2 ? (subtotal * input) / 100 : input;
        const commission = isCommission ? line.commissionPer * line.qty : 0;
        return { ...line, discType, discInput: input, discount, commission, total: subtotal - discount - commission };
      })
    );
  };

  const updateLineQtyPrice = (key: number, qtyVal: number, priceVal: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const nextQty = qtyVal > 0 ? qtyVal : line.qty;
        const nextPrice = priceVal >= 0 ? priceVal : line.price;
        const subtotal = nextQty * nextPrice;
        let discInput = line.discInput;
        if (line.discType === 2) discInput = Math.min(100, discInput);
        else discInput = Math.min(subtotal, discInput);
        const discount = line.discType === 2 ? (subtotal * discInput) / 100 : discInput;
        const commission = isCommission ? line.commissionPer * nextQty : 0;
        return {
          ...line,
          qty: nextQty,
          displayQty: nextQty,
          price: nextPrice,
          discInput,
          discount,
          commission,
          total: subtotal - discount - commission,
        };
      })
    );
  };

  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

  const collectProducts = () =>
    lines.map((l) => ({
      id: l.productId,
      qty: l.qty,
      price: l.price,
      discount: l.discount,
      total: isCommission ? l.total : l.qty * l.price - l.discount,
      batchId: l.batchId,
      commission: isCommission ? l.commissionPer : 0,
    }));

  const payloadBase = () => ({
    customerName: customerName || '-',
    customerPhn: customerPhone || '-',
    customerId,
    isEligibleForCommission: isCommission ? 1 : 0,
    priceCategory: 3,
    isTaxBill: isTaxBill ? 1 : 0,
    finalDiscount: extra,
    payableAmount: payable,
    grandTotal: totals.grandTotal,
    priceTotal: totals.priceTotal,
    discountTotal: totals.discountTotal,
    quotationId,
    products: collectProducts(),
  });

  const holdPayloadBase = () => {
    const { quotationId: _omit, ...rest } = payloadBase();
    return rest;
  };

  const activeHoldId = () => {
    const id = Number(editingHoldIdRef.current);
    return Number.isFinite(id) && id > 0 ? id : 0;
  };

  const isEditingHold = activeHoldId() > 0;

  const clearHoldTracking = () => {
    editingHoldIdRef.current = 0;
    setQuotationId(0);
    setHoldNo('');
  };

  const markSaleDraft = () => {
    saleTouchGenRef.current = cartGenRef.current;
  };

  const applySaleDefaults = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerId(0);
    clearCustSuggest();
    setExchangePoint(0);
    setExchangeUsed(0);
    setBypassCap(false);
    setIsTaxBill(true);
    setIsCommission(false);
    setExtraDisc('0');
    setMode('1');
    setPayType('1');
    setCashPaid('0');
    setBankPaid('0');
    setBalance('0');
  };

  const showHoldBadge = quotationId > 0 && !!holdNo && lines.length > 0;
  const showSavedBill = !!savedNo && savedStamp === billStamp && !editBillId;

  const openSave = () => {
    if (totals.priceTotal === 0 && !savedNo) {
      toast.error('Empty bill. Add products first.');
      return;
    }
    if (!editBillId && activeHoldId() === 0 && quotationId <= 0 && saleTouchGenRef.current !== cartGenRef.current) {
      autoPay.current = true;
      applySaleDefaults();
      setCashPaid(money(payable));
      setBankPaid('0');
      setBalance('0');
    }
    setSaveOpen(true);
  };

  const saveBill = async () => {
    if (showSavedBill) return;
    if (totals.priceTotal === 0) {
      toast.error('Empty bill. Add products first.');
      return;
    }
    const cash = parseFloat(cashPaid) || 0;
    const bank = parseFloat(bankPaid) || 0;
    const paid = cash + bank;
    const due = Math.max(0, payable - paid);
    if (cash < 0 || bank < 0) {
      toast.error('Paid amount cannot be negative.');
      return;
    }
    if (paid > payable + 0.001) {
      toast.error('Paid amount cannot be more than payable amount.');
      return;
    }
    if ((customerName === '' || customerName === '-') && due > 0.001) {
      toast.error('Enter customer name for due / balance payment.');
      return;
    }
    setSaving(true);
    const session = billSessionRef.current;
    try {
      const payload = {
        ...payloadBase(),
        cashPaid: cash,
        bankPaid: bank,
        mode: Number(mode),
        type: Number(payType),
        balance: due,
        quotationId: editBillId ? 0 : quotationId,
        exchangePointUsed: editBillId ? 0 : exchangeUsed,
      };
      const res: any = editBillId
        ? await api.updateBill(editBillId, payload)
        : await api.saveBill(payload);
      if (session !== billSessionRef.current || session !== billStampRef.current) return;
      if (res?.success) {
        setSavedNo(res.data.billDisplay);
        setSavedStamp(session);
        if (quotationId > 0) clearHoldTracking();
        toast.success(editBillId ? `Bill updated: ${res.data.billDisplay}` : `Bill saved: ${res.data.billDisplay}`);
      } else {
        toast.error(res?.data?.error || (editBillId ? 'Update failed' : 'Save failed'));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.data?.error || (editBillId ? 'Update failed' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const saveHold = async () => {
    if (holdSavingRef.current) return;
    if (totals.priceTotal === 0) {
      toast.error('Add products before hold.');
      return;
    }
    const existingHoldId = activeHoldId();
    const session = billSessionRef.current;
    holdSavingRef.current = true;
    setHolding(true);
    let holdSaved = false;
    try {
      const res: any = await api.saveHold({
        ...holdPayloadBase(),
        quotationId: existingHoldId > 0 ? existingHoldId : null,
      });
      if (session !== billSessionRef.current) return;
      if (res?.success) {
        holdSaved = true;
        const quotId = Number(res.data?.quotId || existingHoldId || 0);
        const quotNo = res.data?.quotNo || holdNo;
        const isUpdate = existingHoldId > 0;
        if (isUpdate) {
          if (quotId > 0) {
            editingHoldIdRef.current = quotId;
            setQuotationId(quotId);
          }
          setHoldNo(quotNo);
          toast.success(`Hold updated: ${quotNo}`);
        } else {
          toast.success(`Held as ${quotNo}`);
          setSaveOpen(false);
          resetBillingScreen();
          if (quotId > 0) {
            try {
              await printHoldDoc(quotId);
            } catch {
              /* printHoldDoc shows its own toast */
            }
          }
        }
      } else if (session === billSessionRef.current) {
        toast.error(res?.data?.error || 'Hold failed');
      }
    } catch (e: any) {
      if (!holdSaved && session === billSessionRef.current) {
        toast.error(e?.response?.data?.data?.error || e?.message || 'Hold failed');
      }
    } finally {
      holdSavingRef.current = false;
      setHolding(false);
    }
  };

  const openHolds = async () => {
    const res: any = await api.holds();
    setHolds(res?.data || []);
    setHoldOpen(true);
  };

  const dashToEmpty = (v?: string) => (!v || v === '-' ? '' : v);

  const holdLineItems = (res: any): any[] => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.lines)) return res.data.lines;
    if (Array.isArray(res?.lines)) return res.lines;
    return [];
  };

  const applyHoldForm = (header: any, items: any[]) => {
    const name = header?.customerName ?? header?.cusName;
    const phone = header?.customerPhone ?? header?.cusPhn;
    const extraValue = header?.extraDiscount ?? header?.extraDisc ?? 0;
    const anyGst = items.some((item) => Number(item?.gst) > 0);
    const commissionFromTotal = items.some((item) => {
      const net = Number(item?.qty) * Number(item?.price) - Number(item?.discount || 0);
      return Number(item?.total) + 0.05 < net;
    });
    const taxFlag = header?.isTaxBill;
    const commissionFlag = header?.isCommission ?? header?.isEligibleForCommission;
    setCustomerName(dashToEmpty(name));
    setCustomerPhone(dashToEmpty(phone));
    setCustomerId(Number(header?.customerId) || 0);
    setBypassCap(true);
    setExtraDisc(String(extraValue || 0));
    setIsTaxBill(taxFlag === 0 || taxFlag === false ? false : (taxFlag === 1 || taxFlag === true || anyGst));
    setIsCommission(commissionFlag === 1 || commissionFlag === true || commissionFromTotal);
    saleTouchGenRef.current = cartGenRef.current;
  };

  const loadHold = async (row: any, mode: 'bill' | 'edit' = 'bill') => {
    const holdId = Number(row?.id ?? row?.quotId ?? 0);
    if (!holdId) {
      toast.error('Could not identify hold');
      return;
    }
    const holdMeta = {
      billDisplay: row.billDisplay || '',
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerId: row.customerId || 0,
      extraDiscount: row.extraDiscount || 0,
      isTaxBill: row.isTaxBill,
      isCommission: row.isCommission,
    };
    if (loadHoldBusyIdRef.current === holdId) return;
    loadHoldBusyIdRef.current = holdId;
    const seq = ++loadHoldSeqRef.current;
    const loadSession = billSessionRef.current;
    const lineStamp = linesStampRef.current;
    editingHoldIdRef.current = holdId;
    setQuotationId(holdId);
    setHoldNo(holdMeta.billDisplay);
    applyHoldForm(holdMeta, []);
    setHoldOpen(false);

    let items: any[];
    let res: any;
    try {
      res = await api.holdDetails(holdId);
      if (seq !== loadHoldSeqRef.current) return;
      if (loadSession !== billSessionRef.current) return;
      items = holdLineItems(res);
      if (!items.length) {
        toast.error('Hold has no line items');
        if (loadSession === billSessionRef.current && editingHoldIdRef.current === holdId) {
          clearHoldTracking();
        }
        return;
      }
    } catch (err: any) {
      if (seq !== loadHoldSeqRef.current) return;
      toast.error(err?.response?.data?.data?.error || err?.message || 'Could not load hold');
      if (loadSession === billSessionRef.current && editingHoldIdRef.current === holdId) {
        clearHoldTracking();
      }
      return;
    } finally {
      if (loadHoldBusyIdRef.current === holdId) loadHoldBusyIdRef.current = 0;
    }

    const holdStillCurrent = () =>
      seq === loadHoldSeqRef.current
      && loadSession === billSessionRef.current
      && lineStamp === linesStampRef.current
      && editingHoldIdRef.current === holdId;
    if (!holdStillCurrent()) return;

    autoPay.current = false;
    setSavedNo('');
    setEditBillId(0);
    setEditBillNo('');
    setOrderId(0);
    const mapped = items.map((item, idx) => ({
      key: idx + 1,
      productId: item.productId,
      code: item.code,
      name: item.name,
      qty: item.qty,
      displayQty: item.qty,
      displayUnit: item.unitName || '',
      price: item.price,
      discType: 1,
      discInput: item.discount,
      discount: item.discount,
      commissionPer: item.commission || 0,
      commission: (item.commission || 0) * item.qty,
      total: item.total,
      batchId: item.batchId,
    }));
    setLines((prev) => (holdStillCurrent() ? mapped : prev));
    if (!holdStillCurrent()) return;

    setLineKey(items.length + 1);
    editingHoldIdRef.current = holdId;
    setQuotationId(holdId);
    setHoldNo(holdMeta.billDisplay);
    const header = res?.data && !Array.isArray(res.data) ? { ...holdMeta, ...res.data } : holdMeta;
    if (holdStillCurrent()) applyHoldForm(header, items);
    toast.success(mode === 'edit' ? `Editing hold ${holdMeta.billDisplay}` : 'Hold loaded into bill');
  };

  const printHoldDoc = async (id: number) => {
    try {
      const res: any = await api.printHold(id);
      if (!res?.success || !res.data) {
        toast.error('Could not load hold print');
        return;
      }
      setA4Bill(res.data);
    } catch {
      toast.error('Could not load hold print');
    }
  };

  const openDupe = async () => {
    const res: any = await api.recentBills();
    setRecent(res?.data || []);
    setDupeOpen(true);
  };

  const openOrders = async () => {
    try {
      const [pending, delivered] = await Promise.all([
        ordersApi.list('pending'),
        ordersApi.list('delivered'),
      ]);
      setOrders([
        ...(((pending as any)?.data) || []),
        ...(((delivered as any)?.data) || []),
      ]);
      setOrderOpen(true);
    } catch {
      toast.error('Could not load orders');
    }
  };

  const loadOrder = async (id: number) => {
    try {
      const res: any = await ordersApi.detail(id);
      const items: any[] = res?.data?.items || [];
      if (!items.length) {
        toast.error('This order has no items');
        return;
      }
      const next: Line[] = [];
      for (let idx = 0; idx < items.length; idx += 1) {
        const item = items[idx];
        let batchId = 0;
        try {
          const prod: any = await api.productByCode(item.code);
          batchId = prod?.data?.batchId || 0;
        } catch {
          batchId = 0;
        }
        next.push({
          key: idx + 1,
          productId: item.prodId,
          code: item.code,
          name: item.productName,
          qty: item.qty,
          displayQty: item.qty,
          displayUnit: '',
          price: item.price,
          discType: 1,
          discInput: 0,
          discount: 0,
          commissionPer: 0,
          commission: 0,
          total: item.total,
          batchId,
        });
      }
      setLines(next);
      setLineKey(items.length + 1);
      setOrderId(id);
      setOrderOpen(false);
      toast.info(`Order ${res?.data?.orderNo || id} loaded`);
    } catch {
      toast.error('Could not load order');
    }
  };

  const printA4SameTab = async (billNo: string) => {
    try {
      const res: any = await api.printBill(billNo);
      if (!res?.success || !res.data) {
        toast.error('Could not load A4 invoice');
        return;
      }
      setA4Bill(res.data);
    } catch {
      toast.error('Could not load A4 invoice');
    }
  };

  const printBill = async (billNo = savedNo || editBillNo || dupeNo) => {
    if (!billNo && quotationId) {
      await printHoldDoc(quotationId);
      return;
    }
    if (!billNo) {
      toast.error('Save the bill first');
      return;
    }
    try {
      const res: any = await api.dispatchPrint(billNo);
      const result = await handleThermalDispatch(res, (no) => printA4SameTab(no || billNo));
      if (result === 'printed' || result === 'local') {
        toast.success('Receipt printed and cut');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.data?.error || e?.message || 'Thermal print failed');
    }
  };

  const showHistory = async (line: Line) => {
    const res: any = await api.productHistory(line.productId, customerId || undefined);
    setHistoryName(line.name);
    setHistory(res?.data || []);
  };

  const resetBillingScreen = () => {
    const session = billSessionRef.current + 1;
    billSessionRef.current = session;
    billStampRef.current = session;
    setBillStamp(session);
    setSavedNo('');
    setSavedStamp(-1);
    cartGenRef.current += 1;
    linesStampRef.current += 1;
    loadHoldSeqRef.current += 1;
    editingHoldIdRef.current = 0;
    autoPay.current = true;
    setLines([]);
    setLineKey(1);
    applySaleDefaults();
    setPayEpoch((n) => n + 1);
    setSearch('');
    setNameHits([]);
    setPending(null);
    setQty('1');
    setPrice('');
    setUnitSel('');
    setStock(null);
    setSaving(false);
    setHolding(false);
    holdSavingRef.current = false;
    loadHoldBusyIdRef.current = 0;
    saleTouchGenRef.current = -1;
    setSavedNo('');
    clearHoldTracking();
    setSaveOpen(false);
    setKeysOpen(false);
    setOrderOpen(false);
    setHoldOpen(false);
    setDupeOpen(false);
    setHistory(null);
    setHistoryName('');
    setA4Bill(null);
    setOrderId(0);
    setDupeNo('');
    setMenuCategory(0);
    setMenuQuery('');
    setEditBillId(0);
    setEditBillNo('');
    setCancelOpen(false);
    setCancelReason('');
    setCancelling(false);
    if (searchParams.get('edit')) {
      navigate(routerPathNames.billing, { replace: true });
    }
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const newBill = () => {
    resetBillingScreen();
  };

  const closeSave = () => {
    setSaveOpen(false);
    if (savedNo) resetBillingScreen();
  };

  const cancelEditedBill = async () => {
    if (!editBillId) return;
    if (!cancelReason.trim()) {
      toast.warning('Enter a cancellation reason');
      return;
    }
    setCancelling(true);
    try {
      await adminApi.cancelBill(editBillId, cancelReason.trim());
      toast.success(`Bill ${editBillNo} cancelled`);
      navigate(routerPathNames.admin.monthlyBills);
    } catch (err: any) {
      toast.error(err?.response?.data?.data?.error || err?.message || 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  const kgProduct = pending && ['kg', 'kgs'].includes((pending.unitName || '').toLowerCase());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        openSave();
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.code === 'KeyO' ? 'o'
        : e.code === 'KeyR' ? 'r'
        : e.code === 'KeyS' ? 's'
        : e.code === 'KeyB' ? 'b'
        : e.code === 'KeyP' ? 'p'
        : e.code === 'KeyC' ? 'c'
        : e.key.toLowerCase();
      if (k === 'o') { e.preventDefault(); if (!editBillId && !holdSavingRef.current) void saveHold(); }
      else if (k === 'r') { e.preventDefault(); newBill(); }
      else if (k === 's') { e.preventDefault(); openSave(); }
      else if (k === 'b') { e.preventDefault(); saveBill(); }
      else if (k === 'p') { e.preventDefault(); printBill(); }
      else if (k === 'c') { e.preventDefault(); closeSave(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!a4Bill) return;
    document.body.classList.add('a4-print-open');
    const close = () => setA4Bill(null);
    window.addEventListener('afterprint', close);
    const t = window.setTimeout(() => window.print(), 300);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', close);
      document.body.classList.remove('a4-print-open');
    };
  }, [a4Bill]);

  return (
    <div className={`pos-wrap${billingType === 2 ? ' pos-wrap-select' : ''}`}>
      {editBillNo && (
        <div className="pos-banner pos-banner-edit" style={{ margin: billingType === 2 ? '8px 12px 0' : '6px 10px 0' }}>
          Editing Sales Invoice #{editBillNo}
          <button className="pos-btn pos-btn-outline" type="button" onClick={() => navigate(routerPathNames.admin.monthlyBills)}>Back to bills</button>
        </div>
      )}

      {billingType === 2 ? (
        <div className="cafe">
          <div className="cafe-menu">
            <div className="cafe-cats">
              <button type="button" className={`cafe-cat${menuCategory === 0 ? ' on' : ''}`} onClick={() => setMenuCategory(0)}>
                <i className="fas fa-th-large" /> All
              </button>
              {categories.map((cat) => (
                <button key={cat.id} type="button" className={`cafe-cat${menuCategory === cat.id ? ' on' : ''}`} onClick={() => setMenuCategory(cat.id)}>{cat.name}</button>
              ))}
            </div>
            <div className="cafe-search">
              <i className="fas fa-search" />
              <input
                value={menuQuery}
                placeholder="Search menu items..."
                onChange={(e) => setMenuQuery(e.target.value)}
              />
            </div>
            <div className="cafe-grid">
              {visibleProducts.length === 0 && (
                <div className="cafe-empty">No products in this category</div>
              )}
              {visibleProducts.map((p) => {
                const qtyInCart = addedQty(p.id);
                const selected = qtyInCart > 0;
                const oos = (p.stock ?? 0) <= 0;
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    className={`cafe-card${selected ? ' in' : ''}`}
                    style={{ backgroundColor: '#fff' }}
                    onClick={() => addMenuProduct(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addMenuProduct(p);
                      }
                    }}
                  >
                    {selected && <span className="cafe-qty-badge">{qtyInCart % 1 === 0 ? qtyInCart : qtyInCart.toFixed(2)}</span>}
                    <span className="cafe-card-icon"><CafeItemIcon /></span>
                    <span className="cafe-card-name">{p.name}</span>
                    <span className="cafe-card-price">{rupee(p.mrp)}</span>
                    {oos && <span className="cafe-card-oos">Out of stock</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="cafe-order">
            <div className="cafe-order-head">
              <h3>Order</h3>
              <span className="cafe-order-count">{lines.length} {lines.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div className="cafe-order-list">
              {lines.length === 0 && (
                <div className="cafe-order-empty">Tap a product to add it</div>
              )}
              {lines.map((line) => (
                <div key={line.key} className="cafe-line">
                  <div className="cafe-line-info">
                    <div className="cafe-line-name">{line.name}</div>
                    <div className="cafe-line-each">{rupee(line.price)} each</div>
                  </div>
                  <div className="cafe-stepper">
                    <button type="button" className="cafe-step cafe-step-minus" onClick={() => changeMenuQty(line, -1)}>-</button>
                    <span>{line.displayQty % 1 === 0 ? line.displayQty : line.displayQty.toFixed(2)}</span>
                    <button type="button" className="cafe-step cafe-step-plus" onClick={() => changeMenuQty(line, 1)}>+</button>
                  </div>
                  <div className="cafe-line-total">{rupee(lineAmount(line))}</div>
                  <button type="button" className="cafe-line-x" onClick={() => removeLine(line.key)} aria-label="Remove">×</button>
                </div>
              ))}
            </div>
            <div className="cafe-order-foot">
              <div className="cafe-order-total">
                <span>Total</span>
                <strong>{rupee(payable)}</strong>
              </div>
              <div className="cafe-order-tools">
                {!editBillId && (
                  <button className="pos-btn pos-btn-outline" type="button" onClick={openHolds}>HOLD LIST</button>
                )}
                <button className="pos-btn pos-btn-outline" type="button" onClick={() => setKeysOpen(true)}>KEYS</button>
                <button className="pos-btn pos-btn-outline" type="button" onClick={openDupe}>DUP</button>
                <button className="pos-btn pos-btn-outline" type="button" onClick={newBill}>REFRESH</button>
              </div>
              {(showSavedBill || editBillNo || showHoldBadge) && (
                <div className="pos-billno" style={{ margin: '4px 0 8px' }}>
                  {showSavedBill || editBillNo ? `Bill No - ${showSavedBill ? savedNo : editBillNo}` : ''}{showHoldBadge ? ` Hold - ${holdNo}` : ''}
                </div>
              )}
              <button
                className={`cafe-place${showSavedBill ? ' saved' : ''}`}
                type="button"
                onClick={openSave}
              >
                <i className="fas fa-check-circle" />
                {showSavedBill ? 'Bill Saved' : editBillId ? 'Update Bill' : 'Place Order'}
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <>
          <div className="pos-top">
            <div className="pos-row">
              <div className="pos-fg" style={{ flex: 2.8, minWidth: 160 }}>
                <span className="pos-lbl">Code / Item Name</span>
                <input
                  ref={searchRef}
                  className="pos-inp pos-inp-lg"
                  value={search}
                  placeholder="Scan barcode or search item"
                  autoFocus
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={onSearchKey}
                />
                {stock !== null && (
                  <span className="pos-stock" style={{
                    background: stock <= 0 ? '#fee2e2' : stock <= 5 ? '#fef3c7' : '#dcfce7',
                    color: stock <= 0 ? '#dc2626' : stock <= 5 ? '#b45309' : '#16a34a',
                  }}>
                    {stock <= 0 ? 'Stock: OUT OF STOCK' : `Stock: ${stock}`}
                  </span>
                )}
                {nameHits.length > 0 && (
                  <div className="pos-suggest">
                    {nameHits.map((name) => (
                      <button key={name} type="button" onClick={() => lookupByName(name)}>{name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="pos-fg" style={{ flex: 0.75, minWidth: 78 }}>
                <span className="pos-lbl">Unit</span>
                <select className="pos-sel" value={unitSel} disabled={!kgProduct} onChange={(e) => setUnitSel(e.target.value)}>
                  <option value="">{pending?.unitName || 'Unit'}</option>
                  {kgProduct && <option value="kg">KG</option>}
                  {kgProduct && <option value="gram">Gram</option>}
                </select>
              </div>
              <div className="pos-fg" style={{ flex: 0.65, minWidth: 68 }}>
                <span className="pos-lbl">Qty</span>
                <input ref={qtyRef} className="pos-inp" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProduct()} />
              </div>
              <div className="pos-fg" style={{ flex: 0.9, minWidth: 88 }}>
                <span className="pos-lbl">Price</span>
                <input className="pos-inp" value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProduct()} />
              </div>
              <button className="pos-btn" type="button" onClick={addProduct}>ADD</button>
              {!editBillId && (
                <button className="pos-btn pos-btn-outline" type="button" onClick={openHolds}>HOLD LIST</button>
              )}
            </div>
          </div>

          <div className="pos-table-wrap">
            <table className="pos-table pos-table-lines">
              <thead>
                <tr>
                  <th>#</th><th>Code</th><th>Item Name</th><th>Qty</th><th>Price</th>
                  <th>Discount</th><th>Commission</th><th>Total</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={line.key} onClick={() => showHistory(line)} style={{ cursor: 'pointer' }}>
                    <td>{idx + 1}</td>
                    <td>{line.code}</td>
                    <td>{line.name}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="pos-qty-cell">
                        <input
                          className="pos-inp"
                          value={line.displayQty}
                          onChange={(e) => updateLineQtyPrice(line.key, parseFloat(e.target.value) || 0, line.price)}
                        />
                        <span className="pos-unit-tag">{line.displayUnit}</span>
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        className="pos-inp"
                        value={line.price}
                        onChange={(e) => updateLineQtyPrice(line.key, line.qty, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="pos-disc-cell">
                        <select value={line.discType} onChange={(e) => updateLineDisc(line.key, Number(e.target.value) as 1 | 2, line.discInput)}>
                          <option value={1}>₹</option>
                          <option value={2}>%</option>
                        </select>
                        <input
                          className="pos-inp"
                          value={line.discInput}
                          onChange={(e) => updateLineDisc(line.key, line.discType, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                    <td>₹{money(isCommission ? line.commission : 0)}</td>
                    <td>₹{money(isCommission ? line.total : line.qty * line.price - line.discount)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="pos-btn pos-btn-outline" type="button" onClick={() => removeLine(line.key)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pos-bottom">
            <div className="pos-footer">
              <div className="pos-total-box">
                <span>Total</span>
                <strong>₹{money(payable)}</strong>
              </div>
              <div className="pos-acts">
                <button className="pos-btn pos-btn-outline" type="button" onClick={() => setKeysOpen(true)}>
                  <i className="fas fa-keyboard" /> KEYS
                </button>
                <button className="pos-btn pos-btn-outline" type="button" onClick={openDupe}>DUP</button>
                <button className="pos-btn pos-btn-outline" type="button" title="Alt+R" onClick={newBill}>REFRESH</button>
                <button className={`pos-btn ${showSavedBill ? 'pos-btn-saved' : 'pos-btn-navy'}`} type="button" title="Alt+S" onClick={openSave}>
                  {showSavedBill ? 'BILL SAVED' : editBillId ? 'UPDATE' : 'SAVE'}
                </button>
                {(showSavedBill || editBillNo) && <div className="pos-billno">Bill No - {showSavedBill ? savedNo : editBillNo}</div>}
                {showHoldBadge && <div className="pos-billno">Hold - {holdNo}</div>}
                {orderId > 0 && <div className="pos-billno">Order loaded</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {keysOpen && (
        <div className="pos-modal-back" onClick={() => setKeysOpen(false)}>
          <div className="pos-modal pos-keys-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Shortcut keys</h4>
              <button className="pos-btn pos-btn-outline" type="button" onClick={() => setKeysOpen(false)}>Close</button>
            </div>
            <table className="pos-table pos-table-fit">
              <tbody>
                <tr><td>Hold bill</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">O</kbd></td></tr>
                <tr><td>Refresh / new bill</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">R</kbd></td></tr>
                <tr><td>Open save modal</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">S</kbd></td></tr>
                <tr><td>Save bill</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">B</kbd></td></tr>
                <tr><td>Print</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">P</kbd></td></tr>
                <tr><td>Close save modal</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">C</kbd></td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
              After a bill is saved, Close / Alt+C refreshes the page for the next bill.
            </div>
          </div>
        </div>
      )}

      {saveOpen && (
        <div className="pos-modal-back" onClick={closeSave}>
          <div className="pos-modal pos-save-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-save-head">
              <h4>{editBillId ? `Update Bill #${editBillNo}` : 'Save Bill'}</h4>
              <div className="pos-save-head-amt" title="Amount to collect">
                <span>Payable</span>
                <strong>{rupee(payable)}</strong>
              </div>
            </div>

            <div className="pos-save-body">
              <p className="pos-save-section-label">Customer</p>
              <div className="pos-save-row pos-save-customer-row">
                <div className="pos-fg pos-save-customer-name">
                  <span className={`pos-lbl ${needsCustomerForDue ? 'pos-lbl-warn' : ''}`}>
                    Customer{needsCustomerForDue ? ' *' : ''}
                  </span>
                  <input
                    className={`pos-inp ${needsCustomerForDue ? 'pos-inp-warn' : ''}`}
                    value={customerName}
                    autoComplete="off"
                    placeholder="Name (required if due)"
                    role="combobox"
                    aria-expanded={custField === 'name' && customerHits.length > 0}
                    aria-autocomplete="list"
                    onChange={(e) => {
                      markSaleDraft();
                      setCustomerName(e.target.value);
                      setCustomerId(0);
                      searchCustomers(e.target.value, undefined, 'name');
                    }}
                    onKeyDown={onCustomerKey('name')}
                  />
                  {customerSuggest('name')}
                </div>
                <div className="pos-fg">
                  <span className="pos-lbl">Phone</span>
                  <input
                    ref={custPhoneRef}
                    className="pos-inp"
                    value={customerPhone}
                    autoComplete="off"
                    placeholder="Phone"
                    role="combobox"
                    aria-expanded={custField === 'phone' && customerHits.length > 0}
                    aria-autocomplete="list"
                    onChange={(e) => {
                      markSaleDraft();
                      setCustomerPhone(e.target.value);
                      setCustomerId(0);
                      searchCustomers(undefined, e.target.value, 'phone');
                    }}
                    onKeyDown={onCustomerKey('phone')}
                  />
                  {customerSuggest('phone')}
                </div>
                <div className="pos-save-toggles">
                  <label className={`pos-tog pos-tog-compact ${isTaxBill ? 'pos-tog-on' : ''}`}>
                    <input ref={taxBillRef} type="checkbox" checked={isTaxBill} onChange={(e) => { markSaleDraft(); setIsTaxBill(e.target.checked); }} />
                    Tax bill
                  </label>
                  <label className={`pos-tog pos-tog-compact ${isCommission ? 'pos-tog-on' : ''}`}>
                    <input type="checkbox" checked={isCommission} onChange={(e) => { markSaleDraft(); setIsCommission(e.target.checked); }} />
                    Commission
                  </label>
                </div>
              </div>

              {exchangePoint > 0 && (
                <div className="pos-save-inline pos-save-inline-info">
                  <span>Exchange point {rupee(exchangePoint)}{exchCredit > 0 ? ` · using ${rupee(exchCredit)}` : ''}</span>
                  {exchCredit > 0 ? (
                    <button className="pos-btn pos-btn-sm pos-btn-outline" type="button" onClick={() => setExchangeUsed(0)}>
                      Clear
                    </button>
                  ) : (
                    <button
                      className="pos-btn pos-btn-sm"
                      type="button"
                      onClick={() => {
                        const afterExtra = Math.max(0, totals.grandTotal - extra);
                        setExchangeUsed(Math.min(exchangePoint, afterExtra));
                      }}
                    >
                      Apply
                    </button>
                  )}
                </div>
              )}

              <p className="pos-save-section-label">Bill total</p>
              <div className="pos-save-totals-bar">
                <div className="pos-save-chip">
                  <span>Price</span>
                  <strong>{money(totals.priceTotal)}</strong>
                </div>
                <div className="pos-save-chip">
                  <span>Disc</span>
                  <strong>{money(totals.discountTotal)}</strong>
                </div>
                <div className="pos-save-chip">
                  <span>Comm</span>
                  <strong>{money(totals.commissionTotal)}</strong>
                </div>
                <div className="pos-save-chip">
                  <span>Grand</span>
                  <strong>{money(totals.grandTotal)}</strong>
                </div>
                <div className="pos-save-chip pos-save-chip-edit">
                  <span>Extra</span>
                  <input
                    className="pos-inp pos-save-extra-inp"
                    value={extraDisc}
                    autoComplete="off"
                    onChange={(e) => { markSaleDraft(); setExtraDisc(e.target.value); setBypassCap(false); }}
                  />
                </div>
                {exchCredit > 0 && (
                  <div className="pos-save-chip">
                    <span>Exch. Point</span>
                    <strong>{money(exchCredit)}</strong>
                  </div>
                )}
                <div className="pos-save-chip pos-save-chip-pay pos-save-chip-pay-desk">
                  <span>Payable</span>
                  <strong>{rupee(payable)}</strong>
                </div>
              </div>

              <p className="pos-save-section-label">Payment</p>
              <div className="pos-save-row pos-save-pay-row">
                <div className="pos-fg">
                  <span className="pos-lbl pos-lbl-em">Mode</span>
                  <select className="pos-sel pos-sel-em" value={mode} onChange={(e) => { autoPay.current = true; setMode(e.target.value); }}>
                    <option value="1">Cash</option>
                    <option value="2">Bank</option>
                    <option value="3">Mixed</option>
                  </select>
                </div>
                <div className="pos-fg">
                  <span className="pos-lbl pos-lbl-em">Bank type</span>
                  <select className="pos-sel pos-sel-em" value={payType} disabled={mode === '1'} onChange={(e) => setPayType(e.target.value)}>
                    <option value="1">UPI</option>
                    <option value="2">Debit</option>
                    <option value="3">Credit</option>
                    <option value="4">NEFT</option>
                    <option value="5">Wallet</option>
                  </select>
                </div>
                <div className="pos-fg">
                  <span className="pos-lbl pos-lbl-em">Cash</span>
                  <input
                    className={`pos-inp pos-inp-pay ${mode === '2' ? 'pos-inp-muted' : ''}`}
                    value={cashPaid}
                    disabled={mode === '2'}
                    onChange={(e) => { autoPay.current = false; setCashPaid(e.target.value); }}
                  />
                </div>
                <div className="pos-fg">
                  <span className="pos-lbl pos-lbl-em">Bank</span>
                  <input
                    className={`pos-inp pos-inp-pay ${mode === '1' ? 'pos-inp-muted' : ''}`}
                    value={bankPaid}
                    disabled={mode === '1'}
                    onChange={(e) => { autoPay.current = false; setBankPaid(e.target.value); }}
                  />
                </div>
                <div className={`pos-save-due-chip ${dueAmt > 0.001 ? 'has-due' : paidOver ? 'over-paid' : 'settled'}`}>
                  <span>Due</span>
                  <strong>{money(dueAmt)}</strong>
                </div>
              </div>

              {paidOver && (
                <p className="pos-save-inline pos-save-inline-error">Paid exceeds payable ({money(payable)}).</p>
              )}
              {needsCustomerForDue && !paidOver && (
                <p className="pos-save-inline pos-save-inline-warn">Enter customer name for due {money(dueAmt)}.</p>
              )}
              {dueAmt > 0.001 && !paidOver && !needsCustomerForDue && (
                <p className="pos-save-inline pos-save-inline-warn">Due {money(dueAmt)} → {customerName.trim() || 'customer'}.</p>
              )}
            </div>

            <div className="pos-save-footer">
              <div className="pos-save-meta">
                {showSavedBill && <span className="pos-billno">Bill No — {savedNo}</span>}
                {showHoldBadge && <span className="pos-billno">Hold — {holdNo}</span>}
              </div>
              <div className="pos-acts pos-acts-end">
                {editBillId > 0 && (
                  <button className="pos-btn pos-btn-danger" type="button" onClick={() => { setCancelReason(''); setCancelOpen(true); }}>
                    Cancel bill
                  </button>
                )}
                <button className="pos-btn pos-btn-outline" type="button" title="Alt+C" onClick={closeSave}>Close</button>
                {!editBillId && (
                  <button className="pos-btn pos-btn-outline" type="button" title="Alt+O" disabled={holding} onClick={() => void saveHold()}>
                    {holding ? (isEditingHold ? 'Updating…' : 'Holding…') : (isEditingHold ? 'Update hold' : 'Hold')}
                  </button>
                )}
                <button className="pos-btn pos-btn-outline" type="button" title="Alt+P" onClick={() => printBill(savedNo || editBillNo || dupeNo)}>Print</button>
                <button
                  className={`pos-btn pos-save-primary ${showSavedBill ? 'pos-btn-saved' : ''}`}
                  disabled={saving || paidOver || needsCustomerForDue || showSavedBill}
                  title="Alt+B"
                  onClick={saveBill}
                >
                  {showSavedBill ? 'Bill saved' : saving ? (editBillId ? 'Updating…' : 'Saving…') : (editBillId ? 'Update bill' : 'Save bill')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className="pos-modal-back" onClick={() => !cancelling && setCancelOpen(false)}>
          <div className="pos-modal" style={{ width: 'min(460px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Cancel Bill #{editBillNo}</h4>
              <button className="pos-btn pos-btn-outline" type="button" disabled={cancelling} onClick={() => setCancelOpen(false)}>Close</button>
            </div>
            <div className="pos-fg">
              <span className="pos-lbl">Reason</span>
              <input
                className="pos-inp"
                value={cancelReason}
                placeholder="Reason for cancellation"
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="pos-acts pos-acts-end" style={{ marginTop: 14 }}>
              <button className="pos-btn pos-btn-outline" type="button" disabled={cancelling} onClick={() => setCancelOpen(false)}>Back</button>
              <button className="pos-btn pos-btn-danger" type="button" disabled={cancelling} onClick={cancelEditedBill}>
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {orderOpen && (
        <div className="pos-modal-back" onClick={() => setOrderOpen(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Pending Orders</h4>
              <button className="pos-btn pos-btn-outline" type="button" onClick={() => setOrderOpen(false)}>Close</button>
            </div>
            <table className="pos-table">
              <thead><tr><th>Order No</th><th>Table</th><th>Date</th><th>Time</th><th></th></tr></thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={5}>No pending orders.</td></tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNo}</td>
                    <td>{o.tableName}</td>
                    <td>{o.date}</td>
                    <td>{o.time}</td>
                    <td>
                      <button className="pos-btn" type="button" onClick={() => loadOrder(o.id)}>Bill This</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {holdOpen && (
        <div className="pos-modal-back" onClick={() => setHoldOpen(false)}>
          <div className="pos-modal" style={{ width: 'min(980px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Hold List</h4>
              <button className="pos-btn pos-btn-outline" type="button" onClick={() => setHoldOpen(false)}>Close</button>
            </div>
            <table className="pos-table">
              <thead><tr><th>No</th><th>Customer</th><th>Phone</th><th>Payable</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {holds.length === 0 && (
                  <tr><td colSpan={6}>No holds.</td></tr>
                )}
                {holds.map((h) => (
                  <tr key={h.id}>
                    <td>{h.billDisplay}</td><td>{h.customerName}</td><td>{h.customerPhone}</td>
                    <td>{h.payable}</td><td>{h.date} {h.time}</td>
                    <td>
                      <div className="pos-acts">
                        <button
                          className="pos-btn"
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); void loadHold(h, 'edit'); }}
                        >
                          Edit
                        </button>
                        <button
                          className="pos-btn pos-btn-outline"
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); void printHoldDoc(h.id); }}
                        >
                          Print
                        </button>
                        <button
                          className="pos-btn"
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); void loadHold(h, 'bill'); }}
                        >
                          Bill
                        </button>
                        <button className="pos-btn pos-btn-outline" type="button" onClick={() => api.cancelHold(h.id).then(openHolds)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dupeOpen && (
        <div className="pos-modal-back" onClick={() => setDupeOpen(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Duplicate Bill</h4>
            <button className="pos-btn" type="button" onClick={() => printBill(dupeNo)}>Print selected</button>
            <table className="pos-table">
              <thead><tr><th>Bill No</th><th>Name</th><th>Total</th><th>Paid</th><th>Date</th></tr></thead>
              <tbody>
                {recent.map((b) => (
                  <tr key={b.id} onClick={() => setDupeNo(b.billDisplay)} style={{ background: dupeNo === b.billDisplay ? '#e8f0fe' : undefined }}>
                    <td>{b.billDisplay}</td><td>{b.customerName}</td><td>{b.total}</td><td>{b.paid}</td><td>{b.date} {b.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {history && (
        <div className="pos-modal-back" onClick={() => setHistory(null)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Last 6 Bills — {historyName}</h4>
            <table className="pos-table">
              <thead><tr><th>Bill No</th><th>Date</th><th>Customer</th><th>Qty</th><th>Price</th><th>Disc</th><th>Total</th></tr></thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td>{h.billNo}</td><td>{h.date} {h.time}</td><td>{h.customerName}</td>
                    <td>{h.qty}</td><td>{h.price}</td><td>{h.discount}</td><td>{h.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {a4Bill && createPortal(
        <div className="a4-print-host">
          <div className="a4-print-bar no-print">
            <button className="go" type="button" onClick={() => window.print()}>Print</button>
            <button className="stop" type="button" onClick={() => setA4Bill(null)}>Close</button>
          </div>
          <A4Invoice bill={a4Bill} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default BillingPage;
