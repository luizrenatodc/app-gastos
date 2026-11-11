// Service worker: guarda os arquivos do app para funcionar offline (cache primeiro, rede atualiza).
const VERSAO = "gastos-v1";
const ARQUIVOS = ["./", "index.html", "estilo.css", "app.js", "regras.js", "manifest.webmanifest", "icone.svg"];

self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then((cache) => {
    const rede = fetch(e.request).then((r) => { if (r.ok) caches.open(VERSAO).then((c) => c.put(e.request, r.clone())); return r; }).catch(() => cache);
    return cache ?? rede;
  }));
});
