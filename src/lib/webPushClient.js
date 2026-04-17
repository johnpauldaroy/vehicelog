const PUSH_PROMPT_STORAGE_KEY = 'vehiclelog.webPushPrompted';

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function wasPushPrompted() {
  if (!canUseBrowserStorage()) {
    return false;
  }

  try {
    return window.localStorage.getItem(PUSH_PROMPT_STORAGE_KEY) === '1';
  } catch (_error) {
    return false;
  }
}

function markPushPrompted() {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(PUSH_PROMPT_STORAGE_KEY, '1');
  } catch (_error) {
    // Ignore local storage failures.
  }
}

function urlBase64ToUint8Array(base64String) {
  const base64 = String(base64String || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const rawData = window.atob(padded);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function serializePushSubscription(subscription) {
  if (!subscription) {
    return null;
  }

  const jsonPayload = typeof subscription.toJSON === 'function'
    ? subscription.toJSON()
    : subscription;
  const endpoint = String(jsonPayload?.endpoint || '').trim();
  const p256dh = String(jsonPayload?.keys?.p256dh || '').trim();
  const auth = String(jsonPayload?.keys?.auth || '').trim();

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    expirationTime: jsonPayload?.expirationTime || null,
    contentEncoding: 'aes128gcm',
    keys: {
      p256dh,
      auth,
    },
  };
}

async function getRegisteredServiceWorker() {
  if (!isWebPushSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration || null;
  } catch (_error) {
    return null;
  }
}

export function isWebPushSupported() {
  return (
    typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window
  );
}

export async function getExistingWebPushSubscription() {
  if (!isWebPushSupported()) {
    return null;
  }

  const registration = await getRegisteredServiceWorker();

  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

export async function ensureWebPushSubscription(vapidPublicKey) {
  const normalizedPublicKey = String(vapidPublicKey || '').trim();

  if (!isWebPushSupported()) {
    return {
      status: 'unsupported',
      permission: 'default',
      subscription: null,
    };
  }

  if (!normalizedPublicKey) {
    return {
      status: 'missing_vapid_key',
      permission: Notification.permission,
      subscription: null,
    };
  }

  const registration = await getRegisteredServiceWorker();

  if (!registration) {
    return {
      status: 'service_worker_unavailable',
      permission: Notification.permission,
      subscription: null,
    };
  }

  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    return {
      status: 'subscribed',
      permission: Notification.permission,
      subscription: serializePushSubscription(subscription),
    };
  }

  let permission = Notification.permission;

  if (permission === 'default' && !wasPushPrompted()) {
    markPushPrompted();
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      status: permission === 'denied' ? 'denied' : 'permission_required',
      permission,
      subscription: null,
    };
  }

  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(normalizedPublicKey),
  });

  return {
    status: 'subscribed',
    permission,
    subscription: serializePushSubscription(subscription),
  };
}

export async function unsubscribeWebPushSubscription() {
  const existingSubscription = await getExistingWebPushSubscription();

  if (!existingSubscription) {
    return {
      endpoint: '',
      unsubscribed: false,
    };
  }

  const endpoint = String(existingSubscription.endpoint || '').trim();
  const unsubscribed = await existingSubscription.unsubscribe();

  return {
    endpoint,
    unsubscribed,
  };
}
