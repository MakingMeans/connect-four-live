import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

export function AppShell() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Link className="topbar__brand" to="/dashboard">
            CONNECT FOUR HUB
          </Link>

          <div className="topbar__meta">
            <div className="topbar__identity">
              <span className="topbar__label">Signed in as</span>
              <span className="topbar__value">
                {user?.user} ({user?.email})
              </span>
            </div>

            <button className="button button--ghost" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
