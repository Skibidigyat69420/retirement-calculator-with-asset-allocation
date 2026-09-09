import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  devLogin,
  setAuthContext,
  type DevLoginResponse,
  type Membership,
  type SessionUser,
} from '../lib/api';

const TOKEN_KEY = 'stw.token';
const ORG_KEY = 'stw.orgId';
const USER_KEY = 'stw.user';
const MEMBERSHIPS_KEY = 'stw.memberships';

interface AuthContextType {
  /** null while a stored session is being restored from localStorage. */
  ready: boolean;
  user: SessionUser | null;
  memberships: Membership[];
  organizationId: string | null;
  organizationName: string | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  selectOrganization: (organizationId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(() => readJson<SessionUser>(USER_KEY));
  const [memberships, setMemberships] = useState<Membership[]>(
    () => readJson<Membership[]>(MEMBERSHIPS_KEY) ?? [],
  );
  const [organizationId, setOrganizationId] = useState<string | null>(
    () => localStorage.getItem(ORG_KEY),
  );

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const orgId = localStorage.getItem(ORG_KEY);
    setAuthContext(token, orgId);
    setReady(true);
  }, []);

  const applyOrganization = useCallback((orgId: string | null) => {
    setOrganizationId(orgId);
    localStorage.setItem(ORG_KEY, orgId ?? '');
    setAuthContext(localStorage.getItem(TOKEN_KEY), orgId);
  }, []);

  const login = useCallback(
    async (email: string) => {
      const session: DevLoginResponse = await devLogin(email);
      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(USER_KEY, JSON.stringify(session.user));
      localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(session.memberships));
      setUser(session.user);
      setMemberships(session.memberships);
      setAuthContext(session.token, organizationId);
      // Default to the first membership until the user picks another org.
      if (!organizationId && session.memberships.length > 0) {
        applyOrganization(session.memberships[0].organizationId);
      } else {
        setAuthContext(session.token, localStorage.getItem(ORG_KEY));
      }
    },
    [organizationId, applyOrganization],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MEMBERSHIPS_KEY);
    localStorage.removeItem(ORG_KEY);
    setUser(null);
    setMemberships([]);
    setOrganizationId(null);
    setAuthContext(null, null);
  }, []);

  const selectOrganization = useCallback(
    (orgId: string) => {
      applyOrganization(orgId);
    },
    [applyOrganization],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      ready,
      user,
      memberships,
      organizationId,
      organizationName:
        memberships.find((membership) => membership.organizationId === organizationId)
          ?.organizationName ?? null,
      login,
      logout,
      selectOrganization,
    }),
    [ready, user, memberships, organizationId, login, logout, selectOrganization],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
