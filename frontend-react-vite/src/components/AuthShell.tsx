import type { PropsWithChildren, ReactNode } from 'react';

interface AuthShellProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  subtitle: string;
  footer: ReactNode;
}

export function AuthShell({ eyebrow, title, subtitle, footer, children }: AuthShellProps) {
  return (
    <div className="auth-page">
      <div className="auth-page__panel panel">
        <div className="page-hero__copy">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>

        {children}

        <div className="auth-page__footer">{footer}</div>
      </div>
    </div>
  );
}
