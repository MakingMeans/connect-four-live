import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { getErrorMessage } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const targetPath = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ username, password });
      navigate(targetPath, { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to sign you in.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to continue your matches"
      subtitle="Use your existing account to access the dashboard, resume games, and start new Connect Four sessions."
      footer={
        <>
          Need an account? <Link to="/register">Create one here</Link>.
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit}>
        {error ? <div className="message message--error">{error}</div> : null}

        <label className="field">
          <span className="field__label">Username</span>
          <input
            className="field__input"
            autoComplete="username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username"
            required
            value={username}
          />
        </label>

        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="field__input"
            autoComplete="current-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            type="password"
            value={password}
          />
        </label>

        <button className="button button--primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </AuthShell>
  );
}
