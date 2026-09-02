import { useNetlifyIdentity, openIdentityLogin, openIdentitySignup, logoutIdentity } from '../../hooks/useNetlifyIdentity';
import { Button } from '../ui/Button';

export const IdentityStatus = () => {
  const { user, isReady } = useNetlifyIdentity();

  if (!isReady) {
    return <span className="text-xs text-slate-500">Loading identity…</span>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-600 truncate max-w-[120px]" title={user.email}>
          {user.email}
        </span>
        <Button variant="outline" size="sm" onClick={logoutIdentity}>
          Log out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={openIdentityLogin}>
        Log in
      </Button>
      <Button variant="primary" size="sm" onClick={openIdentitySignup}>
        Sign up
      </Button>
    </div>
  );
};
