import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const AUTH_LOCK_TIMEOUT_MS = 30000;
const authLockQueues = new Map();

async function processAuthLock(lockName, acquireTimeout, fn) {
  void acquireTimeout;
  const previousTail = authLockQueues.get(lockName) || Promise.resolve();
  const ready = previousTail.catch(() => undefined);

  let releaseCurrent;
  const currentDone = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  const currentTail = ready.then(() => currentDone);
  authLockQueues.set(lockName, currentTail);

  try {
    await ready;

    return await fn();
  } finally {
    releaseCurrent();
    currentTail.finally(() => {
      if (authLockQueues.get(lockName) === currentTail) {
        authLockQueues.delete(lockName);
      }
    });
  }
}

const defaultAuthOptions = {
  lock: processAuthLock,
  lockAcquireTimeout: AUTH_LOCK_TIMEOUT_MS,
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: defaultAuthOptions,
    })
  : null;

export function createTransientSupabaseClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      ...defaultAuthOptions,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
