import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  tabs?: ReactNode;
}

export function PageShell({ children, title, subtitle, actions, tabs }: PageShellProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            {title && <h1 className="text-xl sm:text-2xl font-bold leading-tight break-words">{title}</h1>}
            {subtitle && <p className="text-sm sm:text-base text-muted-foreground break-words">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">{actions}</div>}
        </div>
        {tabs}
      </div>
      {children}
    </div>
  );
}
