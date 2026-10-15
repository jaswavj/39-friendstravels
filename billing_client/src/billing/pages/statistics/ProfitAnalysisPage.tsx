import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { statsApi, statsData, statsError } from '../../../api/statistics/statistics-api-service';
import '../master/Master.css';
import '../credit/Credit.css';
import './Stats.css';
import ReportActions from '../account-reports/ReportActions';

type Row = {
  billNo: string; date: string; customer?: string; productName?: string; qty?: number;
  costPrice?: number; mrp?: number; cost: number; prodDisc?: number; extraDisc?: number;
  exchPoint?: number; sale: number; profit: number; margin: number; status?: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);

const ProfitAnalysisPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [type, setType] = useState('product');
  const [data, setData] = useState<any>(null);

  const search = async () => {
    try {
      setData(statsData(await statsApi.profit(from, to, type)));
    } catch (err) {
      toast.error(statsError(err, 'Could not load report'));
    }
  };

  const billWise = data?.type === 'bill';
  const rows: Row[] = data?.rows || [];

  return (
    <div className="mst-page">
      <h2 className="mst-title no-print"><i className="fas fa-chart-pie" /> Profit Analysis Report</h2>
      <div className="mst-card no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Report Type</label>
            <select className="mst-sel" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="product">Product-wise Profit</option>
              <option value="bill">Bill-wise Profit / Loss</option>
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button>
            <ReportActions
              disabled={!data}
              filename={`Profit_Analysis_${from}_${to}`}
              sheets={[{
                name: 'Profit',
                columns: billWise
                  ? [
                    { key: 'billNo', label: 'Bill No' }, { key: 'customer', label: 'Customer' },
                    { key: 'status', label: 'Status' },
                    { key: 'date', label: 'Date' }, { key: 'cost', label: 'Cost', num: true },
                    { key: 'prodDisc', label: 'Item Disc', num: true },
                    { key: 'extraDisc', label: 'Extra Disc', num: true },
                    { key: 'exchPoint', label: 'Exch. Point', num: true },
                    { key: 'sale', label: 'Sale', num: true }, { key: 'profit', label: 'Profit', num: true },
                    { key: 'margin', label: 'Margin', num: true },
                  ]
                  : [
                    { key: 'billNo', label: 'Bill No' }, { key: 'productName', label: 'Product' },
                    { key: 'qty', label: 'Qty', num: true }, { key: 'costPrice', label: 'Cost', num: true },
                    { key: 'mrp', label: 'MRP', num: true }, { key: 'cost', label: 'Total Cost', num: true },
                    { key: 'prodDisc', label: 'Item Disc', num: true },
                    { key: 'extraDisc', label: 'Extra Disc', num: true },
                    { key: 'sale', label: 'Sale', num: true }, { key: 'profit', label: 'Profit', num: true },
                    { key: 'margin', label: 'Margin', num: true }, { key: 'status', label: 'Status' },
                    { key: 'date', label: 'Date' },
                  ],
                rows,
              }]}
            />
          </div>
        </div>
      </div>
      {data && (
        <>
          <div className="st-kpis st-kpis-6">
            <div className="mst-card crd-stat"><div className="crd-stat-l">Total Cost</div><div className="crd-stat-v">₹ {n(data.totalCost)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Item Disc</div><div className="crd-stat-v">₹ {n(data.totalProdDisc)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Extra Discount</div><div className="crd-stat-v">₹ {n(data.totalExtraDisc)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Exch. Point Used</div><div className="crd-stat-v">₹ {n(data.totalExchPoint)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Total Sales</div><div className="crd-stat-v">₹ {n(data.totalSale)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Total Profit</div><div className={`crd-stat-v ${data.totalProfit >= 0 ? 'ok' : 'due'}`}>₹ {n(data.totalProfit)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Profit Margin</div><div className={`crd-stat-v ${data.marginPct >= 0 ? 'ok' : 'due'}`}>{Number(data.marginPct || 0).toFixed(1)}%</div></div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">{from} — {to} | {billWise ? 'Bill-wise' : 'Product-wise'}</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  {billWise ? (
                    <tr><th>#</th><th>Bill No</th><th>Customer</th><th>Status</th><th>Date</th><th className="num">Total Cost</th><th className="num">Item Disc</th><th className="num">Extra Disc</th><th className="num">Exch. Point</th><th className="num">Sale</th><th className="num">Profit / Loss</th><th className="num">Margin %</th></tr>
                  ) : (
                    <tr><th>#</th><th>Bill No</th><th>Product</th><th className="num">Qty</th><th className="num">Cost Price</th><th className="num">MRP</th><th className="num">Total Cost</th><th className="num">Item Disc</th><th className="num">Extra Disc</th><th className="num">Sale Total</th><th className="num">Profit</th><th className="num">Profit %</th><th>Status</th><th>Date</th></tr>
                  )}
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={billWise ? 12 : 14} className="mst-empty">No records.</td></tr>}
                  {rows.map((row, i) => (
                    <tr key={`${row.billNo}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{row.billNo}</td>
                      {billWise ? (
                        <>
                          <td>{row.customer}</td>
                          <td><span className={`st-badge ${row.status || 'Sale'}`}>{row.status || 'Sale'}</span></td>
                          <td>{row.date}</td>
                          <td className="num">₹ {n(row.cost)}</td>
                          <td className="num">₹ {n(row.prodDisc)}</td>
                          <td className="num">₹ {n(row.extraDisc)}</td>
                          <td className="num">₹ {n(row.exchPoint)}</td>
                          <td className="num">₹ {n(row.sale)}</td>
                          <td className={`num ${row.profit >= 0 ? 'st-pos' : 'st-neg'}`}>₹ {n(row.profit)}</td>
                          <td className={`num ${row.margin >= 0 ? 'st-pos' : 'st-neg'}`}>{Number(row.margin).toFixed(1)}%</td>
                        </>
                      ) : (
                        <>
                          <td>{row.productName}</td>
                          <td className="num">{row.qty}</td>
                          <td className="num">₹ {n(row.costPrice)}</td>
                          <td className="num">₹ {n(row.mrp)}</td>
                          <td className="num">₹ {n(row.cost)}</td>
                          <td className="num">₹ {n(row.prodDisc)}</td>
                          <td className="num">₹ {n(row.extraDisc)}</td>
                          <td className="num">₹ {n(row.sale)}</td>
                          <td className={`num ${row.profit >= 0 ? 'st-pos' : 'st-neg'}`}>₹ {n(row.profit)}</td>
                          <td className={`num ${row.margin >= 0 ? 'st-pos' : 'st-neg'}`}>{Number(row.margin).toFixed(1)}%</td>
                          <td><span className={`st-badge ${row.status || 'Sale'}`}>{row.status || 'Sale'}</span></td>
                          <td>{row.date}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitAnalysisPage;
