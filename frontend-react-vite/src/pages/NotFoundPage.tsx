import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-page__panel panel">
        <div className="page-hero__copy">
          <span className="eyebrow">404</span>
          <h1 className="page-title">This page does not exist</h1>
          <p className="page-subtitle">
            The route you requested is not available in the Connect Four client.
          </p>
        </div>

        <div className="button-row">
          <Link className="button button--primary" to="/dashboard">
            Go to dashboard
          </Link>
          <Link className="button button--ghost" to="/login">
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}
