export const pageQuery = (page: number, size: number, extra?: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        params.set(k, String(v));
      }
    });
  }
  return params.toString();
};

/** Request all rows for export (server cap applies). */
export const exportPageQuery = (extra?: Record<string, string | number | undefined>) =>
  pageQuery(0, 50000, extra);
