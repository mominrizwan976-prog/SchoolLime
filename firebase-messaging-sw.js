// SchoolLime – app helper: lets the website install as an app, opens a saved copy when the internet is off,
// and shows phone notifications (Firebase Cloud Messaging web push).
// Keep this file next to index.html (same folder). Do not rename it.
var CACHE = 'schoollime-app-v5';
var KEEP = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(KEEP); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('schoollime-app-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Pages: always try the internet first (so the newest website shows); if offline, open the saved copy.
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(function (res) {
      if (res && res.ok) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put('/', cp); }); }
      return res;
    }).catch(function () { return caches.match('/'); }));
    return;
  }
  if (/\/(icon-192|icon-512)\.png$|manifest\.webmanifest$/.test(r.url)) {
    e.respondWith(fetch(r).catch(function () { return caches.match(r, { ignoreSearch: true }); }));
  }
});

self.addEventListener('push', function (e) {
  var p = {};
  try { p = e.data ? e.data.json() : {}; } catch (x) { p = { data: { body: e.data ? e.data.text() : '' } }; }
  var d = Object.assign({}, p.notification || {}, p.data || {});
  var opt = {
    body: d.body || '',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    vibrate: [200, 100, 200],
    data: { url: d.url || '/' }
  };
  if (d.tag) { opt.tag = d.tag; opt.renotify = true; }
  e.waitUntil(self.registration.showNotification(d.title || 'SchoolLime', opt));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  var path = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf(self.location.origin) === 0 && 'focus' in list[i]) {
        try { list[i].postMessage({ open: path }); } catch (x) {}
        return list[i].focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
