import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { LogoMark } from '../components/layout/BrandMark';

export const INVITATION_KEY = 'stw.pendingInvitation';
export function pendingInvitation() {
  return new URLSearchParams(window.location.hash.slice(1)).get('invite') || sessionStorage.getItem(INVITATION_KEY) || '';
}

export function OnboardingPage({ invitationOnly = false }: { invitationOnly?: boolean }) {
  const { createPractice, acceptInvitation, logout, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'create' | 'join'>(() => invitationOnly || pendingInvitation() ? 'join' : 'create');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [practiceName, setPracticeName] = useState('');
  const [token, setToken] = useState(pendingInvitation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (mode === 'create') await createPractice(fullName.trim(), practiceName.trim());
      else await acceptInvitation(token.trim(), fullName.trim());
      sessionStorage.removeItem(INVITATION_KEY);
      navigate('/', { replace: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Workspace setup failed. Please retry.'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-surface text-ink px-6 py-16">
    <section className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3"><LogoMark size={32} /><strong>Sound Thesis</strong></div>
      <div><h1 className="text-3xl font-semibold mb-2">{mode === 'create' ? 'Set up your practice' : 'Join your practice'}</h1>
        <p className="text-ink-muted">{mode === 'create' ? 'Create a private workspace for your clients and team.' : 'Use an invitation from your administrator. Sign in with the email address they invited.'}</p></div>
      {!invitationOnly && <div className="flex gap-3">
        <Button variant={mode === 'create' ? 'primary' : 'outline'} disabled={busy} onClick={() => { setMode('create'); setError(''); }}>Create a practice</Button>
        <Button variant={mode === 'join' ? 'primary' : 'outline'} disabled={busy} onClick={() => { setMode('join'); setError(''); }}>Use an invitation</Button>
      </div>}
      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field"><span>Your full name</span><div className="auth-input-wrap"><input required maxLength={200} autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} /></div></label>
        {mode === 'create'
          ? <label className="auth-field"><span>Practice name</span><div className="auth-input-wrap"><input required maxLength={200} autoComplete="organization" value={practiceName} onChange={e => setPracticeName(e.target.value)} /></div></label>
          : <label className="auth-field"><span>Invitation code</span><div className="auth-input-wrap"><input required minLength={20} maxLength={200} autoComplete="off" value={token} onChange={e => setToken(e.target.value)} /></div></label>}
        {error && <p role="alert" className="auth-error">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Setting up your workspace…' : mode === 'create' ? 'Create practice' : 'Accept invitation'}</Button>
      </form>
      <div className="flex gap-3">
        {user && <Button variant="ghost" disabled={busy} onClick={() => { sessionStorage.removeItem(INVITATION_KEY); navigate('/'); }}>Return to workspace</Button>}
        <Button variant="ghost" disabled={busy} onClick={logout}>Sign out</Button>
      </div>
    </section>
  </main>;
}
