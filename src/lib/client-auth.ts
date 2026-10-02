// BibleDesk — Browser auth session (stateless JWT)
// CLIENT SAFE: no server imports. Single source of truth for the auth token
// (localStorage 'bibledesk_token') and cached user ('bibledesk_user').

export interface ClientAuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthSession {
  token: string;
  user: ClientAuthUser;
}

const TOKEN_KEY = 'bibledesk_token';
const USER_KEY = 'bibledesk_user';
const AUTH_EVENT = 'bibledesk:auth';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Local study profiles are a development convenience only. They are not
 * authenticated accounts and must never impersonate one on a public deployment.
 */
export function isLocalStudyProfileEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_ENABLE_LOCAL_PROFILE === 'true'
  );
}

export function getAuthToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthUser(): ClientAuthUser | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientAuthUser;
    if (!parsed || typeof parsed.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function notifyAuthChanged(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(AUTH_EVENT));
  window.dispatchEvent(new Event('storage'));
}

export function setAuthSession(token: string, user: ClientAuthUser): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem('bibledesk_local_user');
  notifyAuthChanged();
}

export function clearAuthSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('bibledesk_local_user');
  notifyAuthChanged();
}

/** Subscribe to sign-in / sign-out. Returns an unsubscribe function. */
export function subscribeAuth(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  const storageHandler = () => listener();
  window.addEventListener(AUTH_EVENT, listener);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(AUTH_EVENT, listener);
    window.removeEventListener('storage', storageHandler);
  };
}

export function authHeaders(init: HeadersInit = {}): HeadersInit {
  const token = getAuthToken();
  if (!token) return init;
  return { ...init, Authorization: `Bearer ${token}` };
}

/** fetch() with the JWT attached. Throws Error on non-2xx with the server message. */
export async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  if (!token) throw new Error('Sign in required.');
  const res = await fetch(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res;
}

interface AuthApiResponse {
  success?: boolean;
  token?: string;
  user?: ClientAuthUser;
  tier?: string;
  error?: string;
}

async function parseAuthResponse(res: Response): Promise<AuthSession> {
  let body: AuthApiResponse = {};
  try {
    body = (await res.json()) as AuthApiResponse;
  } catch {
    // fall through to generic error below
  }
  if (!res.ok || !body.token || !body.user) {
    throw new Error(body.error || `Authentication failed (${res.status}).`);
  }
  const session = { token: body.token, user: body.user };
  setAuthSession(session.token, session.user);
  return session;
}

export async function signInRequest(email: string, password: string): Promise<AuthSession> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseAuthResponse(res);
}

export async function signUpRequest(input: {
  email: string;
  password: string;
  name?: string;
  churchName?: string;
  role?: 'member' | 'pastor';
}): Promise<AuthSession> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseAuthResponse(res);
}

/** Revalidates the stored token against the server. Clears it when rejected. */
export async function refreshAuthUser(): Promise<ClientAuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      clearAuthSession();
      return null;
    }
    const body = (await res.json()) as { user?: ClientAuthUser };
    if (!body.user || typeof body.user.id !== 'string') {
      clearAuthSession();
      return null;
    }
    if (isBrowser()) localStorage.setItem(USER_KEY, JSON.stringify(body.user));
    return body.user;
  } catch {
    return getAuthUser();
  }
}

export function signOutLocal(): void {
  clearAuthSession();
}
