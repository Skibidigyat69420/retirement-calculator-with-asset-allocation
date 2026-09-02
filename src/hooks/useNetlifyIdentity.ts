import { useEffect, useState } from 'react';
import netlifyIdentity from 'netlify-identity-widget';

export interface IdentityState {
  user: netlifyIdentity.NetlifyUser | null;
  isReady: boolean;
}

function getCurrentUser(): netlifyIdentity.NetlifyUser | null {
  if (typeof window === 'undefined') return null;
  return netlifyIdentity.currentUser();
}

export function useNetlifyIdentity(): IdentityState {
  const [state, setState] = useState<IdentityState>({
    user: getCurrentUser(),
    isReady: false,
  });

  useEffect(() => {
    let mounted = true;

    const update = (patch: Partial<IdentityState>) => {
      if (mounted) setState((s) => ({ ...s, ...patch }));
    };

    const handleInit = () => update({ user: getCurrentUser(), isReady: true });
    const handleLogin = () => {
      update({ user: getCurrentUser() });
      netlifyIdentity.close();
    };
    const handleLogout = () => update({ user: null });

    netlifyIdentity.on('init', handleInit);
    netlifyIdentity.on('login', handleLogin);
    netlifyIdentity.on('logout', handleLogout);
    netlifyIdentity.init();

    // Ensure readiness is set even if init fires before the listener is attached.
    update({ isReady: true });

    return () => {
      mounted = false;
      netlifyIdentity.off('init', handleInit);
      netlifyIdentity.off('login', handleLogin);
      netlifyIdentity.off('logout', handleLogout);
    };
  }, []);

  return state;
}

export function openIdentityLogin() {
  netlifyIdentity.open('login');
}

export function openIdentitySignup() {
  netlifyIdentity.open('signup');
}

export function logoutIdentity() {
  netlifyIdentity.logout();
}

export function getIdentityToken(): string | null {
  const user = netlifyIdentity.currentUser();
  return user?.token?.access_token || null;
}
