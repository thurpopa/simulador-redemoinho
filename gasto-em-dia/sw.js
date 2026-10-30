// Gasto em Dia: funciona offline quando hospedado em https.
var VERSAO = 'gasto-em-dia-0.1.0-alpha';
var FONTES = 'gasto-em-dia-fontes';
var ARQUIVOS = ['./', './index.html', './boleto.js', './manifest.webmanifest', './icone.svg', './icone-192.png'];

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) {
      return n.indexOf('gasto-em-dia-') === 0 && n !== VERSAO && n !== FONTES;
    }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

// Arquivos do app: tenta a rede primeiro (atualização chega rápido) e cai no cache sem internet.
function redePrimeiro(req) {
  return fetch(req).then(function (resp) {
    if (resp && resp.ok) {
      var copia = resp.clone();
      caches.open(VERSAO).then(function (c) { c.put(req, copia); });
    }
    return resp;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) {
      return r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined);
    });
  });
}

// Fontes do Google: usa o cache na hora e atualiza por trás.
function cacheEAtualiza(req) {
  return caches.open(FONTES).then(function (c) {
    return c.match(req).then(function (salvo) {
      var rede = fetch(req).then(function (resp) {
        if (resp && (resp.ok || resp.type === 'opaque')) c.put(req, resp.clone());
        return resp;
      }).catch(function () { return salvo; });
      return salvo || rede;
    });
  });
}

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    ev.respondWith(cacheEAtualiza(req));
  } else if (url.origin === self.location.origin) {
    ev.respondWith(redePrimeiro(req));
  }
});
