import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { LogoMark } from '../components/layout/BrandMark';
import { useAuth } from '../context/AuthContext';

type Mode = 'sign-in' | 'sign-up' | 'reset' | 'recovery';

export function AuthPage({ initialMode = 'sign-in' }: { initialMode?: Mode }) {
  const { login, signup, resetPassword, updatePassword, recovery, sessionError } = useAuth();
  const [mode, setMode] = useState<Mode>(recovery ? 'recovery' : initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const changeMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'sign-in') {
        await login(email.trim(), password);
      } else if (mode === 'sign-up') {
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        await signup(email.trim(), password);
        setNotice('Check your email to confirm your account, then return here to sign in.');
        setPassword('');
        setConfirmPassword('');
      } else if (mode === 'reset') {
        await resetPassword(email.trim());
        setNotice('If an account exists for that email, a password-reset link has been sent.');
      } else {
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        await updatePassword(password);
        changeMode('sign-in');
        setNotice('Your password was updated. Please sign in.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to continue. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'sign-in' ? 'Welcome back' : mode === 'sign-up' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Choose a new password';
  const description = mode === 'sign-in'
    ? 'Sign in to access your advisory workspace.'
    : mode === 'sign-up'
      ? 'Create an account, then set up or join your practice.'
      : mode === 'reset'
        ? 'We’ll email a secure password-reset link.'
        : 'Use a new password to restore access to your workspace.';

  return (
    <main className="auth-page">
      <header className="auth-simple-header"><Link to="/" className="auth-brand"><LogoMark size={30} /><span>SoundThesis Capital</span></Link><span>Advisor workspace</span></header>
      <section className="auth-simple-layout">
        <aside className="auth-simple-intro">
          <h1>Make client work easier to run.</h1>
          <p>Securely manage client plans, decision history, and practice collaboration in one place.</p>
          <ul className="auth-product-list"><li><ShieldCheck size={17} /><span><strong>Private workspace</strong><small>Practice data stays isolated to your organization.</small></span></li><li><KeyRound size={17} /><span><strong>Account security</strong><small>Authentication is managed through Supabase.</small></span></li></ul>
        </aside>
        <section className="auth-panel">
          <div className="auth-form-wrap">
            <div className="auth-form-heading"><h2>{title}</h2><p>{description}</p></div>
            <form className="auth-form" onSubmit={submit}>
              {mode !== 'recovery' && <label className="auth-field"><span>Email address</span><div className="auth-input-wrap"><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>}
              {mode !== 'reset' && <label className="auth-field"><span>{mode === 'recovery' ? 'New password' : 'Password'}</span><div className="auth-input-wrap"><input required type="password" minLength={8} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>}
              {(mode === 'sign-up' || mode === 'recovery') && <label className="auth-field"><span>Confirm password</span><div className="auth-input-wrap"><input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div></label>}
              {(error || sessionError) && <p role="alert" className="auth-error">{error || sessionError}</p>}
              {notice && <p role="status" className="auth-notice">{notice}</p>}
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Update password'} <ArrowRight size={17} /></button>
            </form>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
              {mode === 'sign-in' && <><button type="button" className="underline hover:text-ink" onClick={() => changeMode('reset')}>Forgot password?</button><button type="button" className="underline hover:text-ink" onClick={() => changeMode('sign-up')}>Create an account</button></>}
              {(mode === 'sign-up' || mode === 'reset' || mode === 'recovery') && <button type="button" className="underline hover:text-ink" onClick={() => changeMode('sign-in')}>Back to sign in</button>}
            </div>
          </div>
        </section>
      </section>
      <footer className="auth-simple-footer"><span>© 2026 SoundThesis Capital</span><span>Private practice software</span></footer>
    </main>
  );
}
