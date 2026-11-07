// Telefono e tablet: due dita sulla lavagna ingrandiscono e spostano SOLO la lavagna.
// Prima il browser ingrandiva tutta la pagina (barra in alto e menu compresi) e poi non si tornava
// indietro bene. L'ingrandimento della pagina è bloccato (meta viewport + touch-action in styles.css);
// qui si usa lo zoom dell'app, centrato tra le due dita.
'use strict';
(() => {
  const vp = document.getElementById('viewport'); if (!vp) return;
  let g = null; // gesto in corso: { d: distanza iniziale, z: zoom iniziale, w: punto della lavagna tra le dita }
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1;
  const mid = t => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });

  vp.addEventListener('touchstart', e => {
    // un dito su una linea selezionata o su una maniglia: si trascina quella, la lavagna non deve scorrere.
    // (sugli elementi SVG il browser ignora touch-action, quindi lo si ferma qui)
    if (e.touches.length === 1 && e.target.closest?.('.line-svg.selected, .lh')) { e.preventDefault(); return; }
    if (e.touches.length !== 2 || typeof setZoom !== 'function') return;
    e.preventDefault();
    if (typeof drag !== 'undefined' && drag) drag = null; // il primo dito poteva aver iniziato a spostare una card
    document.body.classList.remove('dragging');
    const m = mid(e.touches);
    g = { d: dist(e.touches), z: zoom, w: toWorld(m.x, m.y) };
  }, { passive: false });

  vp.addEventListener('touchmove', e => {
    if (!g || e.touches.length !== 2) return;
    e.preventDefault();
    const m = mid(e.touches);
    setZoom(g.z * dist(e.touches) / g.d, m.x, m.y);
    // il punto della lavagna che era tra le dita resta tra le dita: così due dita spostano anche la vista
    const p = toScreen(g.w.x, g.w.y);
    vp.scrollLeft += p.x - m.x; vp.scrollTop += p.y - m.y;
  }, { passive: false });

  const end = e => { if (e.touches.length < 2) g = null; };
  vp.addEventListener('touchend', end); vp.addEventListener('touchcancel', end);

  // Safari (iPhone/iPad) ha un suo gesto di zoom della pagina: lo si ferma
  for (const t of ['gesturestart', 'gesturechange']) document.addEventListener(t, e => e.preventDefault(), { passive: false });
})();
