import React from 'react';

export type BadgeTone = 'blue' | 'navy' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';

const TONE_STYLES: Record<BadgeTone, string> = {
  blue: 'bg-blue-100 text-[#1E3A8A] dark:bg-blue-500/15 dark:text-blue-300',
  navy: 'bg-navy-100 text-navy-700 dark:bg-navy-700 dark:text-navy-200',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  rose: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-navy-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, tone = 'slate', className = '' }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_STYLES[tone]} ${className}`}
  >
    {children}
  </span>
);

export const PartyBadge: React.FC<{ party: string | null | undefined }> = ({ party }) => {
  if (!party) return <span className="text-sm text-slate-400 dark:text-navy-400">&mdash;</span>;
  return <Badge tone={party === 'TESCON' ? 'blue' : 'amber'}>{party}</Badge>;
};

export const StrengthBadge: React.FC<{ strength: number }> = ({ strength }) => {
  const tone: BadgeTone = strength >= 4 ? 'emerald' : strength >= 2 ? 'amber' : 'slate';
  return <Badge tone={tone}>{'●'.repeat(strength)}{'○'.repeat(Math.max(0, 5 - strength))}</Badge>;
};
