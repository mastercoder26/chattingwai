'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { BrandMark } from './brand';

export function Entrance({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Could not unlock your workspace. Try again.');
        setPassword('');
        setBusy(false);
        return;
      }
      window.location.replace('/');
    } catch {
      setError('Could not connect. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <main className="workspace light accent-blue access-page">
      <div className="access-brand">
        <BrandMark size={28} />
        <span>Glimpse</span>
      </div>
      <section className="access-content">
        <h1>Welcome back.</h1>
        <p>Enter your password to open your workspace.</p>
        <form onSubmit={unlock} className="access-form">
          <label htmlFor="workspace-password">Workspace password</label>
          <div className="access-password">
            <LockKeyhole size={18} />
            <input
              id="workspace-password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus
              required
              maxLength={256}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy || !configured}
              aria-describedby={error ? 'access-error' : undefined}
            />
            <button
              type="button"
              className="icon-button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {(error || !configured) && (
            <p id="access-error" className="access-error" role="alert">
              {error || 'Workspace access is being configured. Please check back shortly.'}
            </p>
          )}
          <button className="access-submit" disabled={!configured || busy || !password}>
            {busy ? (
              <>
                <LoaderCircle className="loading-spin" size={16} /> Unlocking…
              </>
            ) : (
              <>
                Enter your workspace <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
        <div className="access-note">
          <ShieldCheck size={14} />
          <span>Your workspace is password protected.</span>
        </div>
      </section>
      <footer className="access-footer">
        Glimpse
        <BrandMark size={17} />
      </footer>
    </main>
  );
}
