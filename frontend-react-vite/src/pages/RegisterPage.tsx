import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../services/api';

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({ username, email, password });
      setSuccessMessage(
        `${response.message} Check your email for the verification OTP before logging in.`,
      );
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to create the account.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start building your Connect Four history"
      subtitle="Register your player profile, verify your email from the OTP message, and come back to play from the dashboard."
      footer={
        <>
          Already registered? <Link to="/login">Go to login</Link>.
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit}>
        {error ? <div className="message message--error">{error}</div> : null}
        {successMessage ? <div className="message message--success">{successMessage}</div> : null}

        <div className="form-row">
          <label className="field">
            <span className="field__label">Username</span>
            <input
              className="field__input"
              autoComplete="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Choose a username"
              required
              value={username}
            />
          </label>

          <label className="field">
            <span className="field__label">Email</span>
            <input
              className="field__input"
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="player@example.com"
              required
              type="email"
              value={email}
            />
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span className="field__label">Password</span>
            <input
              className="field__input"
              autoComplete="new-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              required
              type="password"
              value={password}
            />
          </label>

          <label className="field">
            <span className="field__label">Confirm password</span>
            <input
              className="field__input"
              autoComplete="new-password"
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              required
              type="password"
              value={confirmPassword}
            />
          </label>
        </div>

        <button className="button button--primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </AuthShell>
  );
}
