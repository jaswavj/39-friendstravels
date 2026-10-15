import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterData, masterError, masterPage } from '../../../api/master/master-api-service';
import ListPagination, { DEFAULT_PAGE_SIZE } from '../../components/ListPagination';
import './Master.css';
import '../users/Users.css';

type Item = { id: number; name: string; code: string; mrp: number; unit: string };
type QueueItem = Item & { qty: number };

const BarcodePage: React.FC = () => {
  const [rows, setRows] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const refresh = async (p = page) => {
    try {
      const pg = masterPage<Item>(await masterApi.barcodes(p, DEFAULT_PAGE_SIZE, search.trim() || undefined));
      setRows(pg.items);
      setTotal(pg.total);
      setQty((prev) => {
        const next = { ...prev };
        pg.items.forEach((item) => {
          if (next[item.id] == null) next[item.id] = 1;
        });
        return next;
      });
    } catch (err) {
      toast.error(masterError(err, 'Could not load barcodes'));
    }
  };

  useEffect(() => {
    setPage(0);
  }, [search]);

  useEffect(() => {
    refresh(page);
  }, [page, search]);

  const queueCount = queue.reduce((sum, item) => sum + item.qty, 0);

  const addToQueue = (item: Item, extra = qty[item.id] || 1) => {
    const count = Math.max(1, Number(extra) || 1);
    if (!item.code) {
      toast.warning(`${item.name} has no product code`);
      return;
    }
    setQueue((prev) => {
      const existing = prev.find((q) => q.id === item.id);
      if (existing) {
        return prev.map((q) => (q.id === item.id ? { ...q, qty: q.qty + count } : q));
      }
      return [...prev, { ...item, qty: count }];
    });
  };

  const setQueueQty = (id: number, value: number) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, qty: Math.max(1, value || 1) } : q)));
  };

  const openPreview = (
    labels: QueueItem[],
    layout?: { barcodePerRow?: number; barcodeWidthMm?: number; barcodeHeightMm?: number }
  ) => {
    const perRow = Math.max(1, Math.min(12, Number(layout?.barcodePerRow) || 1));
    const w = Math.max(20, Number(layout?.barcodeWidthMm) || 50);
    const h = Math.max(15, Number(layout?.barcodeHeightMm) || 30);
    const pageW = perRow * w;
    const winW = Math.min(920, Math.max(260, Math.round(pageW * 3.8)));
    const winH = Math.min(520, Math.max(180, Math.round(h * 3.8) + 80));
    const win = window.open('', '_blank', `width=${winW},height=${winH},menubar=no,toolbar=no,status=no`);
    if (!win) {
      toast.error('Pop-up blocked. Allow pop-ups to print labels.');
      return;
    }
    const esc = (v: string) =>
      String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const payload = labels.map((item) => ({
      name: item.name,
      code: item.code,
      mrp: Number(item.mrp || 0).toFixed(2),
    }));
    const grouped: typeof payload[] = [];
    for (let i = 0; i < payload.length; i += perRow) {
      grouped.push(payload.slice(i, i + perRow));
    }
    const svgH = Math.max(8, Math.round(h * 0.4));
    const svgW = Math.max(16, w - 4);
    let idx = 0;
    const rowsHtml = grouped
      .map(
        (row) =>
          `<div class="row">${row
            .map((item) => {
              const n = idx++;
              return `<div class="label"><div class="name">${esc(item.name)}</div><div class="mrp">MRP Rs ${item.mrp}</div><svg id="p-${n}"></svg><div class="code">${esc(item.code)}</div></div>`;
            })
            .join('')}</div>`
      )
      .join('');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Barcode Labels</title>
      <style>
        @page { size: ${pageW}mm ${h}mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          width: ${pageW}mm;
          background: #fff;
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
        }
        .row {
          width: ${pageW}mm;
          height: ${h}mm;
          display: flex;
          page-break-after: always;
          break-after: page;
        }
        .row:last-child { page-break-after: auto; break-after: auto; }
        .label {
          width: ${w}mm;
          height: ${h}mm;
          padding: 1.2mm 1mm;
          text-align: center;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .name { font-size: ${h >= 28 ? 9 : 8}px; font-weight: 700; line-height: 1.15; max-width: ${w - 2}mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mrp { font-size: ${h >= 28 ? 9 : 8}px; margin: 0.3mm 0; }
        .code { font-size: 8px; letter-spacing: 0.3px; }
        svg { width: ${svgW}mm; height: ${svgH}mm; }
      </style></head><body>
      ${rowsHtml}
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <script>
        const items = ${JSON.stringify(payload.map((l) => l.code))};
        items.forEach((code, i) => {
          try { JsBarcode('#p-' + i, String(code || ''), { format: 'CODE128', displayValue: false, height: ${Math.max(24, svgH * 2)}, width: 1.15, margin: 0 }); } catch (e) {}
        });
        window.addEventListener('afterprint', () => window.close());
        setTimeout(() => window.print(), 350);
      </script>
      </body></html>`);
    win.document.close();
  };

  const printQueue = async () => {
    if (queue.length === 0) {
      toast.warning('Add products to the print queue');
      return;
    }
    const items = queue.map((item) => ({
      name: item.name,
      code: item.code,
      mrp: Number(item.mrp || 0),
      qty: item.qty,
    }));
    setBusy(true);
    try {
      const res = masterData<{
        type: string;
        message: string;
        barcodePerRow?: number;
        barcodeWidthMm?: number;
        barcodeHeightMm?: number;
      }>(await masterApi.printBarcodes({ items }));
      if (res.type === 'printed') {
        toast.success(res.message);
        return;
      }
      const labels = queue.flatMap((item) => Array.from({ length: item.qty }, () => item));
      openPreview(labels, res);
    } catch (err) {
      toast.error(masterError(err, 'Barcode print failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-barcode" /> Bar Code
        <button className="mst-icon-btn bc-notes-btn" type="button" title="Label printer notes" onClick={() => setNotesOpen(true)}>
          <i className="fas fa-sticky-note" />
        </button>
      </h2>
      <div className="mst-grid-barcode">
        <div className="mst-card">
          <div className="mst-card-h">
            <span>Products</span>
            <div className="mst-search">
              <i className="fas fa-search" />
              <input className="mst-inp" placeholder="Search name or code..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th className="mst-col-idx">#</th>
                  <th>Item</th>
                  <th className="mst-col-code">Item Code</th>
                  <th className="num mst-col-num">MRP</th>
                  <th className="mst-col-num">Qty</th>
                  <th className="mst-col-act">Add</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="mst-empty">No products</td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{page * DEFAULT_PAGE_SIZE + i + 1}</td>
                    <td>
                      <div className="bc-name">{row.name}</div>
                      {row.unit ? <div className="mst-note">{row.unit}</div> : null}
                    </td>
                    <td>{row.code || '-'}</td>
                    <td className="num">₹{Number(row.mrp || 0).toFixed(2)}</td>
                    <td>
                      <input
                        className="mst-inp"
                        type="number"
                        min={1}
                        value={qty[row.id] ?? 1}
                        onChange={(e) => setQty({ ...qty, [row.id]: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <button className="mst-btn mst-btn-outline" type="button" onClick={() => addToQueue(row)}>
                        Queue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination page={page} size={DEFAULT_PAGE_SIZE} total={total} onChange={setPage} />
        </div>
        <div className="mst-card bc-queue-card">
          <div className="mst-card-h">
            <span>Print queue ({queueCount})</span>
          </div>
          <div className="mst-card-b">
            {queue.length === 0 && <div className="mst-empty" style={{ padding: '1.2rem 0' }}>No labels queued</div>}
            {queue.map((item) => (
              <div className="bc-queue" key={item.id}>
                <div>
                  <div className="bc-name">{item.name}</div>
                  <div className="mst-note">{item.code} · ₹{Number(item.mrp || 0).toFixed(2)}</div>
                </div>
                <input
                  className="mst-inp bc-qty"
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={(e) => setQueueQty(item.id, Number(e.target.value))}
                />
                <button className="mst-icon-btn danger" type="button" title="Remove" onClick={() => setQueue((prev) => prev.filter((q) => q.id !== item.id))}>
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
            <div className="mst-actions" style={{ marginTop: 12 }}>
              <button className="mst-btn mst-btn-primary" type="button" disabled={busy || queue.length === 0} onClick={printQueue}>
                <i className="fas fa-print" /> {busy ? 'Printing…' : `Print ${queueCount || ''}`.trim()}
              </button>
              <button className="mst-btn mst-btn-outline" type="button" disabled={queue.length === 0} onClick={() => setQueue([])}>
                Clear
              </button>
            </div>
            <p className="mst-note" style={{ marginTop: 10 }}>
              Qty on each row is how many labels to print. Size and labels per row are saved in Company Details.
            </p>
          </div>
        </div>
      </div>

      {notesOpen && (
        <div className="usr-modal" onClick={() => setNotesOpen(false)}>
          <div className="usr-modal-box bc-notes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mst-card-h">
              <span>Label printer notes</span>
              <button className="mst-icon-btn" type="button" onClick={() => setNotesOpen(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="mst-card-b">
              <div className="bc-notes-row"><span>Orientation</span><strong>Portrait</strong></div>
              <div className="bc-notes-row"><span>Type</span><strong>Die-cut label</strong></div>
              <div className="bc-notes-row"><span>Width</span><strong>101.6 mm</strong></div>
              <div className="bc-notes-row"><span>Height</span><strong>25.0 mm</strong></div>
              <div className="bc-notes-row"><span>Liner width left</span><strong>1.3 mm</strong></div>
              <div className="bc-notes-row"><span>Liner width right</span><strong>1.3 mm</strong></div>
              <p className="mst-note" style={{ marginTop: 12 }}>
                Use these values in the Windows barcode printer driver / label stock settings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodePage;
