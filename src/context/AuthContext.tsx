import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ApiRequestError, createPracticeWorkspace, acceptPracticeInvitation, devLogin, getAuthSession, setAuthContext, setUnauthorizedHandler, type Membership, type SessionUser } from '../lib/api';
import { authClient, authRedirectUrl, demoAuth, requireAuthClient } from '../lib/authClient';

interface AuthContextType {
  ready: boolean;
  needsOnboarding: boolean;
  createPractice: (fullName: string, practiceName: string) => Promise<void>;
  acceptInvitation: (invitationToken: string, fullName: string) => Promise<void>;
  user: SessionUser | null;
  memberships: Membership[];
  organizationId: string | null;
  organizationName: string | null;
  sessionError: string | null;
  recovery: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => void;
  selectOrganization: (id: string) => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const generation = useRef(0);
  const tokenRef = useRef<string | null>(null);

  const clear = useCallback(() => {
    generation.current++;
    tokenRef.current = null;
    setNeedsOnboarding(false);
    setUser(null);
    setMemberships([]);
    setOrganizationId(null);
    setAuthContext(null, null);
    for (const key of ['stw.token', 'stw.user', 'stw.memberships', 'stw.orgId', 'stw.activeClientId']) localStorage.removeItem(key);
  }, []);

  const restore = useCallback(async (token: string, preferredOrg?: string) => {
    const current = ++generation.current;
    try {
      const session = await getAuthSession(token);
      if (current !== generation.current) return;
      if (!session.memberships.length) throw new ApiRequestError('ONBOARDING_REQUIRED', 'Set up your practice to continue.', 403);
      const savedOrg = preferredOrg ?? localStorage.getItem('stw.orgId');
      const org = session.memberships.find(m => m.organizationId === savedOrg)?.organizationId ?? session.memberships[0].organizationId;
      tokenRef.current = token;
      setAuthContext(token, org);
      // Existing API/export callers read this key; the SDK owns refresh tokens.
      localStorage.setItem('stw.token', token);
      localStorage.setItem('stw.orgId', org);
      setNeedsOnboarding(false);
      setUser(session.user);
      setMemberships(session.memberships);
      setOrganizationId(org);
      setSessionError(null);
    } catch (error) {
      if (current !== generation.current) return;
      if (error instanceof ApiRequestError && error.code === 'ONBOARDING_REQUIRED' && !demoAuth) {
        tokenRef.current = token;
        setAuthContext(token, null);
        localStorage.removeItem('stw.orgId');
        localStorage.removeItem('stw.token');
        localStorage.removeItem('stw.activeClientId');
        setUser(null);
        setMemberships([]);
        setOrganizationId(null);
        setNeedsOnboarding(true);
        setSessionError(null);
        return;
      }
      clear();
      const message = error instanceof Error ? error.message : 'Unable to restore your session.';
      const displayMessage = message === 'No platform user matches this token.'
        ? 'Workspace access pending. Your account must be linked to a practice by an administrator.' : message;
      setSessionError(displayMessage);
      throw new Error(displayMessage);
    } finally {
      if (current === generation.current) setReady(true);
    }
  }, [clear]);

  const logout = useCallback(() => {
    clear();
    setRecovery(false);
    setSessionError(null);
    if (authClient) void authClient.auth.signOut({ scope: 'local' }).then(({ error }) => {
      if (error) setSessionError('Sign out could not be completed. Please retry.');
    });
  }, [clear]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (demoAuth) {
      const token = localStorage.getItem('stw.token');
      if (token) void restore(token).catch(() => {}).finally(() => setReady(true));
      else { clear(); setReady(true); }
      return () => { generation.current++; };
    }
    if (!authClient) { clear(); setReady(true); return; }
    const { data: { subscription } } = authClient.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (session && (event === 'PASSWORD_RECOVERY' || window.location.pathname === '/reset-password')) {
        setReady(true);
        return;
      }
      if (!session) { clear(); setReady(true); return; }
      // Do not call Supabase APIs inside its auth callback (SDK lock).
      void restore(session.access_token).catch(() => {}).finally(() => setReady(true));
    });
    return () => { subscription.unsubscribe(); generation.current++; };
  }, [clear, restore]);

  const login = async (email: string, password: string) => {
    setSessionError(null);
    clear();
    if (demoAuth) { const session = await devLogin(email); await restore(session.token); return; }
    const { data, error } = await requireAuthClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    await restore(data.session.access_token);
  };
  const signup = async (email: string, password: string) => {
    const { error } = await requireAuthClient().auth.signUp({ email, password,
      options: { emailRedirectTo: authRedirectUrl('/login') } });
    if (error) throw error;
  };
  const resetPassword = async (email: string) => {
    const { error } = await requireAuthClient().auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl('/reset-password') });
    if (error) throw error;
  };
  const updatePassword = async (password: string) => {
    const { error } = await requireAuthClient().auth.updateUser({ password });
    if (error) throw error;
    logout();
  };
  const currentIdentityToken = async () => {
    const { data, error } = await requireAuthClient().auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('Please sign in again.');
    return data.session.access_token;
  };
  const createPractice = async (fullName: string, practiceName: string) => {
    const token = await currentIdentityToken();
    const result = await createPracticeWorkspace(token, fullName, practiceName);
    await restore(token, result.organization.id);
  };
  const acceptInvitation = async (invitationToken: string, fullName: string) => {
    const token = await currentIdentityToken();
    const result = await acceptPracticeInvitation(token, invitationToken, fullName);
    await restore(token, result.organization.id);
  };
  const selectOrganization = (id: string) => {
    if (!memberships.some(m => m.organizationId === id)) return;
    localStorage.removeItem('stw.activeClientId');
    localStorage.setItem('stw.orgId', id);
    setOrganizationId(id);
    setAuthContext(tokenRef.current, id);
  };

  return <AuthContext.Provider value={{ ready, needsOnboarding, createPractice, acceptInvitation, user, memberships, organizationId,
    organizationName: memberships.find(m => m.organizationId === organizationId)?.organizationName ?? null,
    sessionError, recovery, login, signup, resetPassword, updatePassword, logout, selectOrganization }}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
