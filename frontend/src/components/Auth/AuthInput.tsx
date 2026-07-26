import React, { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface AuthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  icon: LucideIcon;
  srLabel: string;
  error?: string;
  rightElement?: React.ReactNode;
}

/** Icon-prefixed input with a focus glow and inline validation message, shared
 *  by the auth screens so Login/Register stay visually consistent. */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ icon: Icon, srLabel, error, rightElement, id, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <div className="mb-5">
        <label htmlFor={id} className="sr-only">
          {srLabel}
        </label>
        <motion.div
          animate={{
            boxShadow: error
              ? '0 0 0 4px rgba(239, 68, 68, 0.12)'
              : focused
              ? '0 0 0 4px rgba(30, 58, 138, 0.12)'
              : '0 0 0 0 rgba(30, 58, 138, 0)',
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`relative rounded-xl border bg-white transition-colors ${
            error ? 'border-red-400' : focused ? 'border-[#1E3A8A]' : 'border-slate-200'
          }`}
        >
          <Icon
            className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${
              error ? 'text-red-400' : focused ? 'text-[#1E3A8A]' : 'text-slate-400'
            }`}
          />
          <input
            ref={ref}
            id={id}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className={`w-full rounded-xl bg-transparent py-3.5 pl-12 text-base text-navy-900 placeholder:text-slate-400 focus:outline-none disabled:bg-slate-50 ${
              rightElement ? 'pr-12' : 'pr-4'
            }`}
            {...rest}
          />
          {rightElement && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</div>}
        </motion.div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-1.5 pl-1 text-xs font-medium text-red-500"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);
AuthInput.displayName = 'AuthInput';
