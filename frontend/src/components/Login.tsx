import {
  useState,
} from 'react';

import {
  login,
} from '../services/auth.service';

import type {
  AuthUser,
} from '../types/auth';

interface LoginProps {
  onLogin: (
    user: AuthUser,
  ) => void;
}

export function Login({
  onLogin,
}: LoginProps) {
  const [
    email,
    setEmail,
  ] = useState(
    'admin@factoredge.local',
  );

  const [
    password,
    setPassword,
  ] = useState(
    'Admin123!',
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string>();

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError(undefined);

    try {
      const result =
        await login(
          email,
          password,
        );

      onLogin(result.user);
    } catch {
      setError(
        'Invalid email or password.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form
        className="login-card"
        onSubmit={handleSubmit}
      >
        <div className="login-logo">
          FE
        </div>

        <h1>FactorEdge</h1>

        <p>
          Smart Factory Platform
        </p>

        <label>
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={event =>
            setEmail(
              event.target.value,
            )
          }
        />

        <label>
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={event =>
            setPassword(
              event.target.value,
            )
          }
        />

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Signing in...'
            : 'Sign In'}
        </button>
      </form>
    </div>
  );
}