import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-700 dark:bg-navy-800 ${className}`}
    {...rest}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`border-b border-slate-100 px-5 py-4 dark:border-navy-700 ${className}`}>{children}</div>;

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-5 ${className}`}>{children}</div>;
