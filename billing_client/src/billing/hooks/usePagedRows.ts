import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, emptyPage, normalizePage, PageResult } from '../components/ListPagination';

export function usePagedRows<T>(
  fetchPage: (page: number, size: number) => Promise<unknown>,
  unwrap: (res: unknown) => PageResult<T>,
  deps: unknown[] = [],
  size = DEFAULT_PAGE_SIZE,
) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResult<T>>(emptyPage());

  const load = useCallback(
    async (p: number) => {
      const res = await fetchPage(p, size);
      setData(unwrap(res));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchPage, size, ...deps],
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  const resetToFirst = () => setPage(0);

  return {
    rows: data.items,
    total: data.total,
    page,
    size: data.size || size,
    setPage,
    reload: () => load(page),
    resetToFirst,
  };
}

export const pageFromApi = <T>(res: any, dataFn: (r: any) => T): PageResult<T> =>
  normalizePage(dataFn(res) as T[] | PageResult<T>);
