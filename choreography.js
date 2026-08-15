/* ============================================================
   SCROLL-CHOREOGRAPHY — shared interaction utilities
   Loaded by scroll-cinematic.js, scroll-world.js, and
   pointer-parallax.js (and any future engine).
   Pure functions only — no rendering, no engine-specific state.
   ============================================================ */
window.Choreography = (function () {
  function progress(rect, innerHeight) {
    const scrollable = rect.height - innerHeight;
    return Math.min(Math.max(-rect.top / scrollable, 0), 1);
  }

  function isInViewport(rect, innerHeight) {
    return !(rect.bottom < -innerHeight || rect.top > innerHeight);
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function capDPR(cap = 2) {
    return Math.min(window.devicePixelRatio || 1, cap);
  }

  function normalizedPointer(event, el) {
    const rect = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    return { x: Math.min(Math.max(x, -1), 1), y: Math.min(Math.max(y, -1), 1) };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function interpolateColor(hexA, hexB, t) {
    const a = parseInt(hexA.replace("#", ""), 16);
    const b = parseInt(hexB.replace("#", ""), 16);
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    const r = Math.round(lerp(ar, br, t));
    const g = Math.round(lerp(ag, bg, t));
    const bl = Math.round(lerp(ab, bb, t));
    return `rgb(${r}, ${g}, ${bl})`;
  }

  return { progress, isInViewport, prefersReducedMotion, capDPR, normalizedPointer, lerp, interpolateColor };
})();