import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-navy-600 dark:bg-navy-800">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-navy-700">
      <Icon className="h-7 w-7 text-slate-400 dark:text-navy-300" strokeWidth={1.5} />
    </div>
    <h3 className="text-base font-semibold text-navy-900 dark:text-white">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-navy-300">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
