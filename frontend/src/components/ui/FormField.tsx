import React from 'react';

const fieldClasses =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-navy-600 dark:bg-navy-900 dark:text-white dark:placeholder:text-navy-500 dark:disabled:bg-navy-800';

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({ label, htmlFor, children, required }) => (
  <div className="mb-4">
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-navy-700 dark:text-navy-200">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
    {children}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => <input ref={ref} className={`${fieldClasses} ${className}`} {...rest} />
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...rest }, ref) => (
    <select ref={ref} className={`${fieldClasses} ${className}`} {...rest}>
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...rest }, ref) => <textarea ref={ref} className={`${fieldClasses} ${className}`} {...rest} />
);
Textarea.displayName = 'Textarea';
