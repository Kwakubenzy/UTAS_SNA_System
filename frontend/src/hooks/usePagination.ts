import { useEffect, useMemo, useState } from 'react';

export const usePagination = <T,>(items: T[], pageSize = 10) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // Keep the current page in range when the underlying list shrinks (e.g. after
  // a filter or delete) instead of silently showing a blank page.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageCount, pageItems, totalItems: items.length, pageSize };
};
