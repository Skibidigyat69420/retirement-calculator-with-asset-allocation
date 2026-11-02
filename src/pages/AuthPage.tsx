import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ClipboardList, Eye, EyeOff, FileText, LockKeyhole, Mail, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { demoAuth } from '../lib/authClient';
import { LogoMark } from '../components/layout/BrandMark';

type AuthMode = 'sign-in' | 'sign-up' | 'reset' | 'update-password';

const content: Record<AuthMode, { eyebrow: string; title: string; copy: string; cta: string }> = {
  'sign-in': { eyebrow: 'Advisor workspace', title: 'Sign in', copy: 'Access your client list, plans and Investment Policy Statements.', cta: 'Enter workspace' },
  'sign-up': { eyebrow: 'Create your account', title: 'Make wealth legible.', copy: 'Confirm your email to create your account. Your administrator will arrange practice access.', cta: 'Create account' },
  'update-password': { eyebrow: 'Account recovery', title: 'Set a new password.', copy: 'Choose a new password for your account.', cta: 'Save password' },
  reset: { eyebrow: 'Account recovery', title: 'Back to better decisions.', copy: 'Enter your email and we’ll send a secure link to restore access to your practice.', cta: 'Send recovery link' },
};

export function AuthPage({ mode = 'sign-in' }: { mode?: AuthMode }) {
  const navigate = useNavigate();
  const { login, signup, resetPassword, updatePassword, sessionError, logout } = useAuth();
  const [email, setEmail] = useState(demoAuth ? (import.meta.env.VITE_DEV_LOGIN_EMAIL ?? 'adviser@soundthesis.local') : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = content[mode];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await signIn(email.trim());
  };

  const signIn = async (identity: string) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'reset') {
        await resetPassword(identity);
        setNotice('If an account exists for that email, check your inbox for a recovery link.');
      } else if (mode === 'sign-up') {
        await signup(identity, password);
        setNotice('Check your email to confirm your account. Workspace access requires an active practice membership.');
      } else if (mode === 'update-password') {
        await updatePassword(password);
        navigate('/login');
      } else {
        await login(identity, password);
        navigate('/');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not sign you in. Check the backend and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-simple-header"><Link to="/login" className="auth-brand"><LogoMark size={30} /><span>Sound Thesis</span></Link><span>Advisor workspace</span></header>
      <section className="auth-simple-layout">
        <aside className="auth-simple-intro">
          <span className="eyebrow">A practical client workspace</span>
          <h1>Make client work easier to run.</h1>
          <p>Start with the client, create a clear Investment Policy Statement, and keep every decision in one place.</p>
          <ul className="auth-product-list">
            <li><Users size={17} /><span><strong>Clients</strong><small>Search and manage each household.</small></span></li>
            <li><FileText size={17} /><span><strong>Investment policy</strong><small>Generate a policy from the essential facts.</small></span></li>
            <li><ClipboardList size={17} /><span><strong>Review</strong><small>Return to the plan when decisions change.</small></span></li>
          </ul>
        </aside>
        <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-heading"><span className="eyebrow">{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.copy}</p></div>
          <form onSubmit={submit} className="auth-form">
            {mode !== 'reset' && mode !== 'update-password' && <label className="auth-field"><span>Work email</span><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@practice.com" /></div></label>}
            {mode === 'reset' && <label className="auth-field"><span>Work email</span><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@practice.com" /></div></label>}
            {mode !== 'reset' && !demoAuth && <label className="auth-field"><span>Password <small>{mode === 'sign-up' ? 'Minimum 8 characters' : ''}</small></span><div className="auth-input-wrap"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={mode === 'sign-in' ? undefined : 8} required /><button type="button" className="auth-eye" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>}
            {(error || sessionError) && <p role="alert" className="auth-error">{error || sessionError}</p>}
            {notice && <p className="auth-notice"><Check size={16} />{notice}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Opening your workspace…' : copy.cta}<ArrowRight size={17} /></button>
          </form>
          {mode === 'sign-in' && !demoAuth && <div className="auth-links"><Link to="/forgot-password">Forgot password?</Link><span>New to Sound Thesis? <Link to="/signup">Create an account</Link></span></div>}
          {mode === 'sign-in' && demoAuth && <div className="demo-advisors"><div><span className="eyebrow">Local development demo</span><p>Uses the seeded practice and a fictional client record.</p></div><div className="demo-credential"><code>adviser@soundthesis.local</code><span>No password required</span><button type="button" onClick={() => void signIn('adviser@soundthesis.local')} disabled={busy}>Open demo workspace <ArrowRight size={14} /></button></div></div>}
          {mode === 'sign-up' && <div className="auth-links"><span>Already have an account? <Link to="/login">Sign in</Link></span></div>}
          {mode === 'update-password' && <div className="auth-links"><Link to="/login" onClick={logout}>Cancel and return to sign in</Link></div>}
          {mode === 'reset' && <div className="auth-links"><Link to="/login">Return to sign in</Link></div>}
          <div className="auth-security"><LockKeyhole size={14} /><span>Your workspace is encrypted in transit and scoped to your practice.</span></div>
        </div>
        </section>
      </section>
      <footer className="auth-simple-footer"><span>© 2026 Sound Thesis</span><span>Private practice software</span></footer>
    </main>
  );
}
