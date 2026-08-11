import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type StatCardColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';

const COLOR_STYLES: Record<StatCardColor, { bg: string; text: string }> = {
  primary: { bg: 'bg-[#EFF9E4] dark:bg-[#9FE870]/15', text: 'text-[#163300] dark:text-[#9FE870]' },
  secondary: { bg: 'bg-[#EFF9E4] dark:bg-[#9FE870]/10', text: 'text-[#2F6B00] dark:text-[#8FDB5C]' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  danger: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-500 dark:text-red-400' },
  neutral: { bg: 'bg-slate-100 dark:bg-navy-700/60', text: 'text-navy-600 dark:text-navy-200' },
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  color?: StatCardColor;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color = 'primary', onClick }) => {
  const styles = COLOR_STYLES[color];
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors dark:border-navy-700 dark:bg-navy-800 ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-navy-600' : ''
      }`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${styles.bg}`}>
        <Icon className={`h-5 w-5 ${styles.text}`} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-500 dark:text-navy-300">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-navy-900 dark:text-white">{value}</p>
      </div>
    </Component>
  );
};
