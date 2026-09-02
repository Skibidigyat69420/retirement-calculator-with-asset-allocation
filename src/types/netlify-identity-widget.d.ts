declare module 'netlify-identity-widget' {
  export interface NetlifyUser {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
    token: {
      access_token: string;
    };
  }

  export function init(options?: { APIUrl?: string; logo?: boolean }): void;
  export function open(tab?: 'login' | 'signup'): void;
  export function close(): void;
  export function logout(): void;
  export function currentUser(): NetlifyUser | null;

  export type IdentityEvent = 'init' | 'login' | 'logout' | 'close' | 'error' | 'open';
  export function on(event: IdentityEvent, callback: (...args: unknown[]) => void): void;
  export function off(event: IdentityEvent, callback: (...args: unknown[]) => void): void;
}
