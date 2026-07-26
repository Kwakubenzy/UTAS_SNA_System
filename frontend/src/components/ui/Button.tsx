import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    'bg-[#1E3A8A] text-white shadow-sm hover:bg-[#17306F] focus-visible:outline-[#1E3A8A]',
  secondary:
    'bg-white text-navy-700 border border-slate-300 hover:bg-slate-50 dark:bg-navy-800 dark:text-navy-100 dark:border-navy-600 dark:hover:bg-navy-700',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus-visible:outline-red-500',
  ghost: 'bg-transparent text-navy-600 hover:bg-slate-100 dark:text-navy-200 dark:hover:bg-navy-700',
};

const SIZE_STYLES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...rest
}) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
    {...rest}
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
    {children}
  </button>
);
