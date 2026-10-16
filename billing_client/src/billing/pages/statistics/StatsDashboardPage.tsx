import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { statsApi, statsData, statsError } from '../../../api/statistics/statistics-api-service';
import '../master/Master.css';
import './Stats.css';

type Day = { date: string; sales: number; expense: number };
type Dash = {
  year: number; month: number; label: string;
  sales: number; lastSales: number; salesPct: number;
  expense: number; lastExpense: number; expensePct: number;
  profit: number; lastProfit: number; profitPct: number;
  netProfit: number; todaySales: number; todayBills: number; daily: Day[];
};

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SALES = '#3b82f6';
const EXPENSE = '#a78bfa';

const n = (v?: number) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const trend = (pct: number, last: number) => last === 0 ? '— No prev. data' : `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}% vs last month`;
const compact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
};

const useNarrow = () => {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
};

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => p.dataKey === 'sales' || p.dataKey === 'expense');
  if (!rows.length) return null;
  const title = rows[0]?.payload?.label || label;
  return (
    <div className="st-tip">
      <div className="st-tip-d">{title}</div>
      {rows.map((p: any) => (
        <div key={p.dataKey} className="st-tip-row">
          <i style={{ background: p.fill || p.color }} />
          <span>{p.name}</span>
          <b>₹ {n(p.value)}</b>
        </div>
      ))}
    </div>
  );
};

const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="st-tip">
      <div className="st-tip-row">
        <i style={{ background: p.payload.color }} />
        {p.name}: ₹ {n(p.value)} ({((p.percent || 0) * 100).toFixed(1)}%)
      </div>
    </div>
  );
};

const StatsDashboardPage: React.FC = () => {
  const narrow = useNarrow();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<Dash | null>(null);
  const [pieIndex, setPieIndex] = useState(0);

  const load = async (y = year, m = month) => {
    try {
      setData(statsData<Dash>(await statsApi.dashboard(y, m)));
    } catch (err) {
      toast.error(statsError(err, 'Could not load dashboard'));
    }
  };

  useEffect(() => { load(); }, []);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() + 1 - i);
  const daily = data?.daily || [];
  const pieData = !data ? [] : [
    { name: 'Income', value: Math.max(0, Number(data.sales || 0)), color: SALES },
    { name: 'Expense', value: Math.max(0, Number(data.expense || 0)), color: EXPENSE },
  ].filter((s) => s.value > 0);
  const pieTotal = pieData.reduce((sum, s) => sum + s.value, 0);
  const chartDays = useMemo(() => daily.map((d) => ({
    ...d,
    label: String(d.date || ''),
    day: String(d.date || '').slice(0, 2),
  })), [daily]);
  const dayCount = chartDays.length;
  const chartH = narrow ? 188 : 228;
  const pieH = narrow ? 168 : 200;
  const barMax = dayCount > 28 ? 7 : dayCount > 20 ? 9 : dayCount > 14 ? 12 : 16;
  const xTickInterval = dayCount > 24 ? 2 : dayCount > 16 ? 1 : 0;

  return (
    <div className="mst-page">
      <div className="mst-card st-filter" style={{ marginBottom: 12 }}>
        <div className="mst-card-b st-filter-row">
          <div className="mst-fg">
            <label>Year</label>
            <select className="mst-sel" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="mst-fg">
            <label>Month</label>
            <select className="mst-sel" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {months.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
            </select>
          </div>
          <div className="st-filter-acts">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => load()}>Load</button>
            {(year !== now.getFullYear() || month !== now.getMonth() + 1) && (
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); load(now.getFullYear(), now.getMonth() + 1); }}>Current Month</button>
            )}
          </div>
        </div>
      </div>
      {data && (
        <>
          <div className="st-kpis st-kpis-3">
            <div className="st-kpi sales">
              <span className="st-kpi-art st-kpi-art-chart" aria-hidden />
              <i className="st-kpi-deco fas fa-ticket-alt" aria-hidden />
              <div className="st-kpi-body">
                <div className="st-kpi-l">Total Income</div>
                <div className="st-kpi-v">₹ {n(data.sales)}</div>
                <div className="st-kpi-t">{trend(data.salesPct, data.lastSales)}</div>
              </div>
            </div>
            <div className="st-kpi expense">
              <span className="st-kpi-art st-kpi-art-wave" aria-hidden />
              <i className="st-kpi-deco fas fa-wallet" aria-hidden />
              <div className="st-kpi-body">
                <div className="st-kpi-l">Total Expense</div>
                <div className="st-kpi-v">₹ {n(data.expense)}</div>
                <div className="st-kpi-t">{trend(data.expensePct, data.lastExpense)}</div>
              </div>
            </div>
            <div className={`st-kpi profit ${data.netProfit >= 0 ? 'up' : 'down'}`}>
              <span className="st-kpi-art st-kpi-art-trend" aria-hidden />
              <i className={`st-kpi-deco fas ${data.netProfit >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} aria-hidden />
              <div className="st-kpi-body">
                <div className="st-kpi-l">Net Profit</div>
                <div className="st-kpi-v">₹ {n(data.netProfit)}</div>
                <div className="st-kpi-t">{trend(data.profitPct, data.lastProfit)}</div>
              </div>
            </div>
          </div>
          <div className="mst-note st-today">Today collected: ₹ {n(data.todaySales)} across {data.todayBills} income · Showing {data.label} (future tickets paid today count today)</div>
          <div className="st-charts">
            <div className="mst-card st-chart-card">
              <div className="mst-card-h">Daily Income vs Expense — {data.label}</div>
              <div className="mst-card-b st-chart-body">
                {chartDays.length === 0 ? (
                  <div className="mst-empty">No days in this month.</div>
                ) : (
                  <div className="st-chart-fit" style={{ height: chartH }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartDays}
                        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                        barGap={1}
                        barCategoryGap={dayCount > 24 ? '6%' : dayCount > 16 ? '10%' : '16%'}
                      >
                        <defs>
                          <linearGradient id="salesBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor={SALES} />
                          </linearGradient>
                          <linearGradient id="expenseBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c4b5fd" />
                            <stop offset="100%" stopColor={EXPENSE} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis
                          dataKey="day"
                          tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          interval={xTickInterval}
                        />
                        <YAxis
                          tickFormatter={compact}
                          tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={34}
                        />
                        <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }} />
                        <Legend
                          verticalAlign="bottom"
                          height={22}
                          wrapperStyle={{ fontSize: 11, paddingTop: 2 }}
                        />
                        <Bar dataKey="sales" name="Income" fill="url(#salesBar)" radius={[4, 4, 0, 0]} maxBarSize={barMax} />
                        <Bar dataKey="expense" name="Expense" fill="url(#expenseBar)" radius={[4, 4, 0, 0]} maxBarSize={barMax} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
            <div className="mst-card st-chart-card">
              <div className="mst-card-h">Month Mix — {data.label}</div>
              <div className="mst-card-b st-chart-body st-pie-wrap">
                {pieTotal <= 0 ? (
                  <div className="mst-empty">No income or expense in this month.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={pieH}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={narrow ? 48 : 58}
                          outerRadius={narrow ? 74 : 88}
                          paddingAngle={3}
                          onMouseEnter={(_, i) => setPieIndex(i)}
                          onClick={(_, i) => setPieIndex(i)}
                        >
                          {pieData.map((s, i) => (
                            <Cell key={s.name} fill={s.color} stroke="var(--color-bg-surface)" strokeWidth={pieIndex === i ? 3 : 2} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="st-pie-legend">
                      {pieData.map((s, i) => (
                        <button key={s.name} type="button" className={`st-pie-leg ${pieIndex === i ? 'on' : ''}`} onClick={() => setPieIndex(i)}>
                          <i style={{ background: s.color }} />
                          <span>{s.name}</span>
                          <b>₹ {n(s.value)}</b>
                          <em>{((s.value / pieTotal) * 100).toFixed(1)}%</em>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatsDashboardPage;
