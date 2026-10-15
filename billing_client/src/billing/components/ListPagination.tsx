import React from 'react';
import './ListPagination.css';

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

export const DEFAULT_PAGE_SIZE = 25;

export const emptyPage = <T,>(): PageResult<T> => ({
  items: [],
  total: 0,
  page: 0,
  size: DEFAULT_PAGE_SIZE,
});

/** Accept legacy bare arrays from older responses. */
export const normalizePage = <T,>(data: T[] | PageResult<T> | null | undefined): PageResult<T> => {
  if (!data) return emptyPage();
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 0, size: data.length || DEFAULT_PAGE_SIZE };
  }
  return {
    items: data.items || [],
    total: data.total ?? 0,
    page: data.page ?? 0,
    size: data.size ?? DEFAULT_PAGE_SIZE,
  };
};

type Props = {
  page: number;
  size: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
};

const ListPagination: React.FC<Props> = ({ page, size, total, onChange, disabled }) => {
  if (total <= 0) return null;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages - 1);
  const from = total === 0 ? 0 : current * size + 1;
  const to = Math.min(total, (current + 1) * size);

  return (
    <div className="list-pagination">
      <span className="list-pagination-info">
        {from}–{to} of {total}
      </span>
      <div className="list-pagination-btns">
        <button type="button" className="mst-btn mst-btn-outline list-pagination-btn" disabled={disabled || current <= 0} onClick={() => onChange(0)}>
          «
        </button>
        <button type="button" className="mst-btn mst-btn-outline list-pagination-btn" disabled={disabled || current <= 0} onClick={() => onChange(current - 1)}>
          ‹
        </button>
        <span className="list-pagination-page">
          Page {current + 1} / {pages}
        </span>
        <button type="button" className="mst-btn mst-btn-outline list-pagination-btn" disabled={disabled || current >= pages - 1} onClick={() => onChange(current + 1)}>
          ›
        </button>
        <button type="button" className="mst-btn mst-btn-outline list-pagination-btn" disabled={disabled || current >= pages - 1} onClick={() => onChange(pages - 1)}>
          »
        </button>
      </div>
    </div>
  );
};

export default ListPagination;
