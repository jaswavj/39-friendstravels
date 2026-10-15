import { useEffect } from 'react';

const isEditableTable = (table: HTMLTableElement) =>
  Boolean(table.querySelector('input, select, textarea, .mst-inp, .mst-sel, .purchase-line-edit'));

const stampTable = (table: HTMLTableElement) => {
  if (isEditableTable(table)) {
    table.classList.remove('mst-mobile-cards');
    return;
  }
  const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
    (th.textContent || '').replace(/\s+/g, ' ').trim(),
  );
  table.querySelectorAll('tbody tr').forEach((tr) => {
    let titled = false;
    Array.from(tr.children).forEach((cell, i) => {
      if (!(cell instanceof HTMLElement) || cell.classList.contains('mst-empty')) return;
      const label = headers[i];
      if (label && cell.getAttribute('data-label') !== label) {
        cell.setAttribute('data-label', label);
      }
      const key = (label || '').toLowerCase();
      let role = 'field';
      if (key === '#' || key === 's.no' || key === 'no') role = 'index';
      else if (!titled && !/qty|cost|sale|profit|total|paid|cash|bank|balance|pending|disc|margin|price|amount|payable/i.test(key)) {
        role = 'title';
        titled = true;
      }
      if (cell.getAttribute('data-role') !== role) cell.setAttribute('data-role', role);
    });
  });
  table.classList.add('mst-mobile-cards');
};

export default function useMobileReportTables() {
  useEffect(() => {
    const root = document.querySelector('.module-content') || document.body;
    const apply = () => {
      root.querySelectorAll<HTMLTableElement>('table.mst-table').forEach(stampTable);
    };
    apply();
    const observer = new MutationObserver(() => {
      observer.disconnect();
      apply();
      observer.observe(root, { childList: true, subtree: true });
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}
