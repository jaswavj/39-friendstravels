import { toast } from 'react-toastify';
import { adminApi, adminData } from '../../api/admin/admin-api-service';
import { billingApi } from '../../api/billing/billing-api-service';

type Card = {
  billDisplay: string;
  customerName?: string;
  customerPhone?: string;
  payable?: number;
  exchPoint?: number;
  date?: string;
  time?: string;
};

type Company = { shopName?: string; address?: string; gstin?: string };

const money = (v?: number) =>
  Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const block = (...lines: Array<string | false | undefined | null>) =>
  lines.filter((line): line is string => Boolean(line && String(line).trim())).join('\n');

let companyCache: Company | null = null;

const loadCompany = async (): Promise<Company> => {
  if (companyCache) return companyCache;
  try {
    companyCache = adminData<Company>(await adminApi.company()) || {};
  } catch {
    companyCache = {};
  }
  return companyCache;
};

export async function openBillWhatsApp(card: Card) {
  const digits = (card.customerPhone || '').replace(/\D/g, '');
  if (digits.length < 10) {
    toast.error('Customer phone is missing');
    return;
  }
  const phone = digits.length === 10 ? `91${digits}` : digits;

  const [company, printRes] = await Promise.all([
    loadCompany(),
    billingApi.printBill(card.billDisplay).catch(() => null),
  ]);
  const bill = printRes?.success ? printRes.data : null;

  const shop = String(bill?.companyName || company.shopName || '').trim() || 'Shop';
  const customer = String(bill?.customerName || card.customerName || 'Customer').trim();
  const when = `${bill?.date || card.date || ''} ${bill?.time || card.time || ''}`.trim();
  const items = (bill?.items || []) as Array<{ name?: string; qty?: number; total?: number }>;
  const itemLines = items.map((item, i) =>
    `${i + 1}. ${item.name || 'Item'}  x${Number(item.qty || 0)}  ₹${money(item.total)}`
  );

  const extra = Number(bill?.extraDiscount || 0);
  const itemDisc = Number(bill?.productDiscount || 0);
  const exch = Number(bill?.exchangePointUsed ?? card.exchPoint ?? 0);
  const payable = Number(bill?.payable ?? card.payable ?? 0);
  const total = Number(bill?.priceTotal || 0);
  const paid = Number(bill?.paid || 0);
  const balance = Number(bill?.balance || 0);

  const text = [
    `*${shop}*`,
    `Dear ${customer},`,
    'Thank you for shopping with us.',
    block(`*Sales Invoice #${card.billDisplay}*`, when && `Date: ${when}`),
    itemLines.length ? `*Items*\n${itemLines.join('\n')}` : '',
    block(
      total > 0 && `Total: ₹${money(total)}`,
      itemDisc > 0 && `Item Disc: ₹${money(itemDisc)}`,
      extra > 0 && `Extra Disc: ₹${money(extra)}`,
      exch > 0 && `Exchange Point: ₹${money(exch)}`,
      `*Payable: ₹${money(payable)}*`,
      paid > 0 && `Paid: ₹${money(paid)}`,
      balance > 0 && `Balance: ₹${money(balance)}`,
    ),
    'Thank you. Visit again.',
  ].filter(Boolean).join('\n\n');

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
}
