import { csrfToken } from '@/shared/services/auth-session';

const IDENTITY_KEY = 'umsspira.hu12.offline-identity';

interface OfflineIdentity {
  userId: string;
  sessionFingerprint: string;
}

async function fingerprint(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function clearOfflineIdentity(): void {
  sessionStorage.removeItem(IDENTITY_KEY);
}

export async function rememberOfflineIdentity(
  expectedUserId: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const before = csrfToken();
  if (!before || !expectedUserId) return false;

  const response = await fetch('/api/v1/auth/me', {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });

  if (!response.ok) return false;

  const body: unknown = await response.json();
  const user = (
    typeof body === 'object' && body !== null && 'data' in body
      ? body.data
      : null
  ) as { id?: unknown; role?: unknown } | null;

  if (
    signal?.aborted ||
    user?.id !== expectedUserId ||
    user.role !== 'titulado' ||
    csrfToken() !== before
  ) {
    return false;
  }

  const sessionFingerprint = await fingerprint(before);
  if (signal?.aborted || csrfToken() !== before) return false;

  const identity: OfflineIdentity = {
    userId: expectedUserId,
    sessionFingerprint,
  };

  sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return true;
}

export async function getOfflineIdentity(): Promise<string | null> {
  const csrf = csrfToken();
  const stored = sessionStorage.getItem(IDENTITY_KEY);
  if (!csrf || !stored) return null;

  try {
    const identity = JSON.parse(stored) as Partial<OfflineIdentity>;
    if (
      typeof identity.userId !== 'string' ||
      !identity.userId ||
      typeof identity.sessionFingerprint !== 'string' ||
      identity.sessionFingerprint !== await fingerprint(csrf) ||
      csrfToken() !== csrf
    ) {
      clearOfflineIdentity();
      return null;
    }
    return identity.userId;
  } catch {
    clearOfflineIdentity();
    return null;
  }
}
