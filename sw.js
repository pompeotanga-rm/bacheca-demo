// Serve solo a rendere Bacheca installabile: tutte le richieste vanno in rete.
// Niente cache di proposito: l'app tiene già una copia locale dei dati e una copia vecchia dei file nasconderebbe gli aggiornamenti.
self.addEventListener('fetch', () => { });
