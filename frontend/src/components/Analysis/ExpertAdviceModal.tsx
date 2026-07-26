import React, { useEffect, useState } from 'react';
import { AlertTriangle, AlertOctagon, Info, CheckCircle2, BrainCircuit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';

interface AdviceItem {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info' | 'good';
  message: string;
}

const SEVERITY: Record<AdviceItem['severity'], { icon: LucideIcon; text: string; bg: string; label: string }> = {
  critical: { icon: AlertOctagon, text: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10', label: 'Critical' },
  warning: { icon: AlertTriangle, text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', label: 'Warning' },
  info: { icon: Info, text: 'text-[#1E3A8A] dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-500/10', label: 'Note' },
  good: { icon: CheckCircle2, text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'Looking good' },
};

interface ExpertAdviceModalProps {
  open: boolean;
  onClose: () => void;
}

/** Displays the output of the backend's rule-based (knowledge-driven) advisor:
 *  plain-language strategic advice derived from the live network state, as
 *  opposed to the raw computed metrics shown elsewhere in the app. */
export const ExpertAdviceModal: React.FC<ExpertAdviceModalProps> = ({ open, onClose }) => {
  const [advice, setAdvice] = useState<AdviceItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchAdvice = async () => {
      setLoading(true);
      try {
        const response = await api.getExpertAdvice();
        if (response.success) {
          setAdvice(response.advice || []);
        } else {
          toast.error(response.error || 'Failed to load expert advice');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.error || err.message || 'Failed to load expert advice');
      } finally {
        setLoading(false);
      }
    };
    fetchAdvice();
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Expert Advice" widthClassName="max-w-xl">
      <p className="mb-5 flex items-start gap-2 text-xs text-slate-500 dark:text-navy-400">
        <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0" />
        Rule-based guidance evaluated against the current network data &mdash; not a raw metric, an
        interpretation of what the metrics mean for campaign strategy.
      </p>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : advice.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-navy-400">No advice available.</p>
      ) : (
        <div className="space-y-2.5">
          {advice.map((item) => {
            const s = SEVERITY[item.severity];
            const Icon = s.icon;
            return (
              <div key={item.id} className={`flex gap-3 rounded-xl border border-slate-100 p-3.5 dark:border-navy-700 ${s.bg}`}>
                <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${s.text}`} />
                <div className="min-w-0">
                  <p className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${s.text}`}>
                    {item.category} &middot; {s.label}
                  </p>
                  <p className="text-sm leading-relaxed text-navy-800 dark:text-navy-100">{item.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
