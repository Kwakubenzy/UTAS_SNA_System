import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-navy-700 ${className}`} />
);

export const StatCardSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-800">
    <Skeleton className="h-12 w-12 rounded-xl" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-6 w-1/3" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-3 p-4">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = 'h-64' }) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-800 ${className}`}>
    <Skeleton className="mb-4 h-5 w-1/3" />
    <Skeleton className="h-[calc(100%-2rem)] w-full" />
  </div>
);
