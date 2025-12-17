import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  title?: string;
}

export function PageShell({ children, title }: PageShellProps) {
  return (
    <div className="space-y-4">
      {title && <h1 className="text-2xl font-bold">{title}</h1>}
      {children}
    </div>
  );
}
