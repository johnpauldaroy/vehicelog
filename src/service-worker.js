/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';

clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');

registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') {
      return false;
    }

    if (url.pathname.startsWith('/_')) {
      return false;
    }

    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function parsePushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch (_jsonError) {
    return {
      title: 'Vehicle Management System',
      body: event.data.text() || 'You have a new alert.',
    };
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const title = String(payload?.title || 'Vehicle Management System');
  const body = String(payload?.body || payload?.message || 'You have a new alert.');
  const targetUrl = String(payload?.url || '/');
  const tag = String(payload?.notificationId || payload?.sourceKey || 'vehiclelog-alert');

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: {
        url: targetUrl,
        notificationId: payload?.notificationId || '',
        sourceKey: payload?.sourceKey || '',
      },
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const relativeTargetUrl = String(event.notification?.data?.url || '/');
  const targetUrl = new URL(relativeTargetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_CLICKED',
            data: {
              url: targetUrl,
              notificationId: event.notification?.data?.notificationId || '',
              sourceKey: event.notification?.data?.sourceKey || '',
            },
          });

          if (client.url.startsWith(self.location.origin)) {
            return client.focus();
          }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return Promise.resolve(undefined);
    })
  );
});
