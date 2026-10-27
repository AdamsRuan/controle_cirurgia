// Service Worker — Gestão Cirúrgica
// Cache offline SOMENTE de recursos estáticos (arquivos locais + SDK do Firebase em JS).
// Nenhuma requisição de dados do Firebase/Firestore passa por aqui.
// Aumente a versão a cada publicação para atualizar os aparelhos instalados.
const V='gestao-cirurgica-v3';
const FILES=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-192-maskable.png','./icons/icon-512-maskable.png','./icons/apple-touch-icon.png','./icons/favicon-32.png'];

// Domínios de dados/autenticação do Firebase: nunca interceptar.
const IGNORAR=['firestore.googleapis.com','firebaseio.com','firebase.googleapis.com','identitytoolkit.googleapis.com','securetoken.googleapis.com','firebaseinstallations.googleapis.com'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(V).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting())));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(n=>Promise.all(n.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(IGNORAR.some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))return;

  const mesmaOrigem=u.origin===self.location.origin;
  // Único recurso externo em cache: o código (JS) do SDK do Firebase, para o app abrir offline.
  const sdkFirebase=u.hostname==='www.gstatic.com'&&u.pathname.startsWith('/firebasejs/');
  if(!mesmaOrigem&&!sdkFirebase)return;

  // Abrir/recarregar o app: rede primeiro, cache se estiver offline.
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(k=>k.put('./index.html',c));return x;}).catch(()=>caches.match('./index.html')));
    return;
  }
  // Estáticos: cache primeiro, atualiza em segundo plano.
  e.respondWith(caches.match(r).then(c=>{
    const n=fetch(r).then(x=>{if(x&&x.status===200){const k=x.clone();caches.open(V).then(h=>h.put(r,k));}return x;}).catch(()=>c);
    return c||n;
  }));
});
