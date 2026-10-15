import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { expenseApi, expenseError, expensePage } from '../../../api/expense/expense-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import '../master/Master.css';
import '../credit/Credit.css';
import ReportActions from '../account-reports/ReportActions';

type TypeRow = { id: number; name: string };
type Row = { id: number; dateTime: string; typeName: string; content: string; description: string; amount: number; userName: string };

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);

const ExpenseReportPage: React.FC = () => {
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [typeId, setTypeId] = useState('0');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    expenseApi.types(0, 500)
      .then((res) => setTypes(expensePage<TypeRow>(res).items))
      .catch(() => undefined);
  }, []);

  const search = async (p = 0) => {
    try {
      const pg = expensePage<Row>(await expenseApi.report(
        from, to, typeId === '0' ? undefined : Number(typeId), p, DEFAULT_PAGE_SIZE,
      ));
      setRows(pg.items);
      setTotal(pg.total);
      setPage(p);
    } catch (err) {
      toast.error(expenseError(err, 'Could not load report'));
    }
  };

  const pageTotal = (rows || []).reduce((sum, row) => sum + (row.amount || 0), 0);
  const typeName = typeId === '0' ? 'All Types' : (types.find((t) => String(t.id) === typeId)?.name || 'All Types');

  return (
    <div className="mst-page">
      <h2 className="mst-title no-print"><i className="fas fa-chart-line" /> Expense Report</h2>
      <div className="mst-card no-print" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Expense Type</label>
            <select className="mst-sel" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="0">-- All Expense Types --</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={() => search(0)}>Generate</button>
            <ReportActions
              disabled={!rows}
              filename={`Expense_Report_${from}_${to}`}
              sheets={[{
                name: 'Expenses',
                columns: [
                  { key: 'dateTime', label: 'Date' }, { key: 'typeName', label: 'Type' },
                  { key: 'content', label: 'Content' }, { key: 'description', label: 'Description' },
                  { key: 'amount', label: 'Amount', num: true }, { key: 'userName', label: 'Entry By' },
                ],
                rows: rows || [],
              }]}
            />
          </div>
        </div>
      </div>
      {rows && (
        <>
          <div className="crd-stats crd-stats-4" style={{ marginBottom: 12 }}>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Total Entries</div>
              <div className="crd-stat-v">{total}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Total Expense Amount</div>
              <div className="crd-stat-v due">₹ {n(pageTotal)}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Expense Type</div>
              <div className="crd-stat-v" style={{ fontSize: '1rem' }}>{typeName}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Report Period</div>
              <div className="crd-stat-v" style={{ fontSize: '1rem' }}>{from} – {to}</div>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Expense Details</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th><th>Date</th><th>Expense Type</th><th>Content</th>
                    <th>Description</th><th className="num">Amount</th><th>Entry By</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={7} className="mst-empty">No expense entries found for the selected period.</td></tr>}
                  {rows.map((row, i) => (
                    <tr key={row.id}>
                      <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                      <td>{row.dateTime}</td>
                      <td>{row.typeName}</td>
                      <td>{row.content}</td>
                      <td>{row.description || '—'}</td>
                      <td className="num">₹ {n(row.amount)}</td>
                      <td>{row.userName}</td>
                    </tr>
                  ))}
                  {rows.length > 0 && (
                    <tr>
                      <td colSpan={5}><strong>Page total</strong></td>
                      <td className="num"><strong>₹ {n(pageTotal)}</strong></td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <ListPagination page={page} size={DEFAULT_PAGE_SIZE} total={total} onChange={(p) => search(p)} />
          </div>
        </>
      )}
    </div>
  );
};

export default ExpenseReportPage;
