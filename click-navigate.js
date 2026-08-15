/* ============================================================
   CLICK-NAVIGATE — hotspot product tour driven by REAL footage.
   Instead of a procedural Three.js model, waypoints map to
   frames of the generated 360° orbit clip (frames/launch/).
   Clicking a hotspot tweens the frame index to that angle —
   the photoreal shoe rotates to meet the caption. 2D canvas,
   same cover-fit draw as scroll-cinematic.
   ============================================================ */

function initExplore(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas = section?.querySelector("canvas");
  if (!canvas) { console.warn(`click-navigate: no <canvas> found in ${cfg.section}, skipping`); return null; }
  const ctx = canvas.getContext("2d", { alpha: false });

  const reduceMotion = window.Choreography.prefersReducedMotion();
  const frameCount = cfg.frameCount || 179;
  const bgFill = cfg.palette?.bg || "#070b14";

  const images = [];
  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.src = cfg.framePath(i + 1);
    images[i] = img;
  }

  let currentIdx = (cfg.waypoints && cfg.waypoints[0]?.frame) || 0;

  function draw(index) {
    const img = images[Math.round(index) % frameCount];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
    else         { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    ctx.fillStyle = bgFill; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function resize() {
    const dpr = window.Choreography.capDPR();
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(currentIdx);
  }
  window.addEventListener("resize", resize);
  resize();

  const waypoints = cfg.waypoints || [];
  const captionEl = section.querySelector(".explore-caption");
  const hotspots = [...section.querySelectorAll(".hotspot")];

  function setActiveWaypoint(index) {
    const wp = waypoints[index];
    if (!wp) return;
    if (captionEl) captionEl.textContent = wp.caption || wp.label || "";
    hotspots.forEach((h, i) => h.classList.toggle("active", i === index));
    return wp;
  }
  setActiveWaypoint(0);

  // shortest wrap-around distance on the 360° loop
  function shortestDelta(from, to) {
    let d = (to - from) % frameCount;
    if (d > frameCount / 2) d -= frameCount;
    if (d < -frameCount / 2) d += frameCount;
    return d;
  }

  if (reduceMotion) {
    hotspots.forEach((h) => {
      h.addEventListener("click", () => {
        const wp = setActiveWaypoint(Number(h.dataset.waypoint));
        if (!wp) return;
        currentIdx = wp.frame;
        draw(currentIdx);
      });
    });
    // draw first waypoint once frames arrive
    const first = images[Math.round(currentIdx)];
    if (first) first.onload = () => draw(currentIdx);
    return { update: () => {}, resize };
  }

  let tween = null; // { from, delta, start, duration }
  let idleTimer = 0;

  hotspots.forEach((h) => {
    h.addEventListener("click", () => {
      const wp = setActiveWaypoint(Number(h.dataset.waypoint));
      if (!wp) return;
      tween = {
        from: currentIdx,
        delta: shortestDelta(currentIdx, wp.frame),
        start: performance.now(),
        duration: 900,
      };
    });
  });

  function tick(now) {
    if (tween) {
      const t = Math.min((now - tween.start) / tween.duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      currentIdx = (tween.from + tween.delta * eased + frameCount) % frameCount;
      draw(currentIdx);
      if (t >= 1) { tween = null; idleTimer = now + 2400; }
    } else if (now > idleTimer) {
      // gentle idle rotation between clicks — showroom turntable feel
      const rect = section.getBoundingClientRect();
      if (window.Choreography.isInViewport(rect, window.innerHeight)) {
        currentIdx = (currentIdx + 0.12) % frameCount;
        draw(currentIdx);
      }
    }
    requestAnimationFrame(tick);
  }

  // first paint as soon as the starting frame decodes
  const startImg = images[Math.round(currentIdx)];
  if (startImg.complete) draw(currentIdx);
  else startImg.onload = () => draw(currentIdx);

  requestAnimationFrame(tick);
  return { update: () => {}, resize };
}

document.addEventListener("DOMContentLoaded", () => {
  const explorers = (window.EXPLORE_SECTIONS || [])
    .filter((c) => document.querySelector(c.section))
    .map(initExplore)
    .filter(Boolean);

  window.__explore = explorers; // debug handle
});
