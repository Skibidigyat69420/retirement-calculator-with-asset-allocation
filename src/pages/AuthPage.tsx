import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError } from '../lib/api';
import { LogoMark } from '../components/layout/BrandMark';

type AuthMode = 'sign-in' | 'sign-up' | 'reset';

const content: Record<AuthMode, { eyebrow: string; title: string; copy: string; cta: string }> = {
  'sign-in': { eyebrow: 'Welcome back', title: 'See the whole picture.', copy: 'Your planning desk, client context, and next best decision in one calm workspace.', cta: 'Enter workspace' },
  'sign-up': { eyebrow: 'Create your practice', title: 'Make wealth legible.', copy: 'Build a durable planning practice around better conversations, not more spreadsheets.', cta: 'Create workspace' },
  reset: { eyebrow: 'Account recovery', title: 'Back to better decisions.', copy: 'Enter your email and we’ll send a secure link to restore access to your practice.', cta: 'Send recovery link' },
};

export function AuthPage({ mode = 'sign-in' }: { mode?: AuthMode }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState(import.meta.env.VITE_DEV_LOGIN_EMAIL ?? 'adviser@soundthesis.local');
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
    if (mode === 'reset') {
      setNotice('If an account exists for that email, a recovery link is on its way.');
      return;
    }
    setBusy(true);
    try {
      await login(identity);
      navigate('/');
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'We could not sign you in. Check the backend and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-visual-grid" />
        <div className="auth-visual-orb auth-visual-orb-one" />
        <div className="auth-visual-orb auth-visual-orb-two" />
        <div className="auth-visual-inner">
          <Link to="/login" className="auth-brand"><LogoMark size={34} /><span>Sound Thesis</span></Link>
          <div className="auth-quote">
            <span className="eyebrow auth-eyebrow"><Sparkles size={13} /> Wealth intelligence, clarified</span>
            <h1>Every plan has a<br /><em>better next move.</em></h1>
            <p>A considered operating system for advisors who want their work to feel as good as the decisions it produces.</p>
          </div>
          <div className="auth-proof">
            <div className="auth-proof-line"><span className="auth-proof-dot" /><span>Private by design</span></div>
            <div className="auth-proof-line"><span className="auth-proof-dot gold" /><span>Built for the long view</span></div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-top"><span className="auth-mobile-brand"><LogoMark size={26} /> Sound Thesis</span><span className="auth-top-note">Advisor workspace</span></div>
        <div className="auth-form-wrap">
          <div className="auth-form-heading"><span className="eyebrow">{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.copy}</p></div>
          <form onSubmit={submit} className="auth-form">
            {mode !== 'reset' && <label className="auth-field"><span>Work email</span><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@practice.com" /></div></label>}
            {mode === 'reset' && <label className="auth-field"><span>Work email</span><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@practice.com" /></div></label>}
            {mode !== 'reset' && <label className="auth-field"><span>Password <small>{mode === 'sign-up' ? 'Minimum 8 characters' : ''}</small></span><div className="auth-input-wrap"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={mode === 'sign-up' ? 8 : undefined} required={mode === 'sign-up'} /><button type="button" className="auth-eye" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>}
            {error && <p className="auth-error">{error}</p>}
            {notice && <p className="auth-notice"><Check size={16} />{notice}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Opening your workspace…' : copy.cta}<ArrowRight size={17} /></button>
          </form>
          {mode === 'sign-in' && <div className="auth-links"><Link to="/forgot-password">Forgot password?</Link><span>New to Sound Thesis? <Link to="/signup">Create an account</Link></span></div>}
          {mode === 'sign-in' && <div className="demo-advisors"><div><span className="eyebrow">Demo advisor access</span><p>Jump into a seeded client book</p></div><div className="demo-advisor-list"><button type="button" onClick={() => void signIn('you@soundthesis.local')} disabled={busy}><b>AM</b><span>Aarav Mehta<small>1 client</small></span><ArrowRight size={14} /></button><button type="button" onClick={() => void signIn('adviser@soundthesis.local')} disabled={busy}><b>MK</b><span>Maya Kapoor<small>2 clients</small></span><ArrowRight size={14} /></button><button type="button" onClick={() => void signIn('advisor3@soundthesis.local')} disabled={busy}><b>RS</b><span>Rohan Shah<small>3 clients</small></span><ArrowRight size={14} /></button></div></div>}
          {mode === 'sign-up' && <div className="auth-links"><span>Already have an account? <Link to="/login">Sign in</Link></span></div>}
          {mode === 'reset' && <div className="auth-links"><Link to="/login">Return to sign in</Link></div>}
          <div className="auth-security"><LockKeyhole size={14} /><span>Your workspace is encrypted in transit and scoped to your practice.</span></div>
        </div>
        <div className="auth-panel-footer"><span>© 2026 Sound Thesis</span><span>Terms&nbsp;&nbsp; Privacy</span></div>
      </section>
    </main>
  );
}
