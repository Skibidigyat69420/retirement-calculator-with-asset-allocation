import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { invitePracticeMember, listPracticeInvitations, revokePracticeInvitation, type InviteRole, type PracticeInvitation } from '../lib/api';
import { Button } from '../components/ui/Button';

export function PracticeTeamPage() {
  const { memberships, organizationId, organizationName } = useAuth();
  const role = memberships.find(m => m.organizationId === organizationId)?.role;
  const canInvite = ['practice_owner', 'practice_admin', 'platform_admin'].includes(role ?? '');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('wealth_practitioner');
  const [invitations, setInvitations] = useState<PracticeInvitation[]>([]);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!canInvite) return;
    let active = true;
    void listPracticeInvitations().then(result => { if (active) setInvitations(result.data); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load invitations.'); });
    return () => { active = false; };
  }, [canInvite, organizationId]);
  const refresh = async () => setInvitations((await listPracticeInvitations()).data);
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setLink('');
    try {
      const result = await invitePracticeMember(email.trim(), inviteRole);
      setLink(`${window.location.origin}/join-practice#invite=${encodeURIComponent(result.token)}`);
      setEmail(''); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invitation failed.'); }
    finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    setBusy(true); setError('');
    try { await revokePracticeInvitation(id); setLink(''); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not revoke invitation.'); }
    finally { setBusy(false); }
  };
  if (!canInvite) return <p role="alert">Only practice owners and administrators can manage invitations.</p>;
  return <section className="max-w-3xl mx-auto p-6 space-y-6">
    <header><h1 className="text-3xl font-semibold">Practice team</h1><p className="text-ink-muted mt-2">Invite colleagues to {organizationName}. Invitations expire after 72 hours.</p></header>
    <form onSubmit={invite} className="auth-form max-w-lg">
      <label className="auth-field"><span>Colleague’s email</span><div className="auth-input-wrap"><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div></label>
      <label className="auth-field"><span>Access role</span><select className="border border-border rounded-md p-3 bg-surface" value={inviteRole} onChange={e => setInviteRole(e.target.value as InviteRole)}>
        <option value="wealth_practitioner">Wealth practitioner</option><option value="practice_admin">Practice administrator</option><option value="associate">Associate</option><option value="read_only">Read only</option>
      </select></label>
      <Button type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Create invitation'}</Button>
    </form>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {link && <div role="status" className="space-y-2"><p>Invitation created. Copy this link and share it with your colleague. No email has been sent.</p><input className="w-full border border-border p-3 rounded-md" aria-label="Invitation link" readOnly value={link} onFocus={e => e.currentTarget.select()} /><p className="text-sm text-ink-muted">The link is shown only now. Your colleague must verify the invited email before accepting.</p></div>}
    <ul className="space-y-3">{invitations.map(invitation => <li key={invitation.id} className="border border-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"><div><strong>{invitation.email}</strong><p className="text-sm text-ink-muted">{invitation.role.replaceAll('_', ' ')} · {invitation.status === 'pending' && new Date(invitation.expiresAt).getTime() <= Date.now() ? 'expired' : invitation.status}</p></div>{invitation.status === 'pending' && <Button variant="outline" disabled={busy} onClick={() => void revoke(invitation.id)}>Revoke</Button>}</li>)}</ul>
    {!invitations.length && <p className="text-ink-muted">No invitations yet.</p>}
  </section>;
}
