/* ============================================================
   CURSOR-TRAIL — canvas-2D particle trail. Fixed-size particle
   pool, never allocated per-frame. Scroll still drives the
   .reveal-line overlay (same contract as scroll-cinematic/
   scroll-world); cursor position drives particle spawning.
   ============================================================ */

function makePool(count) {
  const pool = [];
  for (let i = 0; i < count; i++) {
    pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, active: false });
  }
  return pool;
}

function spawn(pool, x, y, accentColor) {
  // Reuse the oldest/dead particle instead of growing the pool.
  let target = pool.find((p) => !p.active);
  if (!target) target = pool.reduce((a, b) => (a.life > b.life ? a : b));
  target.x = x;
  target.y = y;
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.4 + Math.random() * 1.2;
  target.vx = Math.cos(angle) * speed;
  target.vy = Math.sin(angle) * speed;
  target.life = 0;
  target.maxLife = 40 + Math.random() * 30;
  target.active = true;
  target.color = accentColor;
}

function initTrail(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas = section?.querySelector("canvas");
  if (!canvas) { console.warn(`cursor-trail: no <canvas> found in ${cfg.section}, skipping`); return null; }

  const ctx = canvas.getContext("2d");
  const accent = cfg.palette?.accent || "#ffb443";
  const particleCount = cfg.particleCount || 150;
  const pool = makePool(particleCount);

  const reduceMotion = window.Choreography.prefersReducedMotion();
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function resize() {
    const dpr = window.Choreography.capDPR();
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  if (hasFinePointer && !reduceMotion) {
    section.addEventListener("pointermove", (event) => {
      const { x, y } = window.Choreography.normalizedPointer(event, section);
      const px = ((x + 1) / 2) * canvas.clientWidth;
      const py = ((y + 1) / 2) * canvas.clientHeight;
      const burst = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < burst; i++) spawn(pool, px, py, accent);
    });
  }

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Ambient drift for touch/no-pointer/reduced-motion visitors —
    // keeps the canvas alive-looking without depending on the cursor.
    if ((!hasFinePointer || reduceMotion) && Math.random() < 0.15) {
      spawn(pool, Math.random() * canvas.clientWidth, Math.random() * canvas.clientHeight, accent);
    }

    for (const p of pool) {
      if (!p.active) continue;
      p.life += 1;
      if (p.life >= p.maxLife) { p.active = false; continue; }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      const t = p.life / p.maxLife;
      const alpha = 1 - t;
      const radius = 3 * (1 - t) + 0.5;
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function applyOverlayProgress() {
    const rect = section.getBoundingClientRect();
    if (!window.Choreography.isInViewport(rect, window.innerHeight)) return;
    const p = window.Choreography.progress(rect, window.innerHeight);
    for (const el of section.querySelectorAll(".reveal-line")) {
      const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
      const mid = (a + b) / 2, half = (b - a) / 2;
      let o = 1 - Math.abs(p - mid) / half;
      o = Math.max(0, Math.min(1, o));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate(-50%, -50%) translateY(${(1 - o) * 30}px)`;
    }
  }

  if (reduceMotion) {
    drawFrame();
    return { update: applyOverlayProgress, resize };
  }

  function particleTick() {
    const rect = section.getBoundingClientRect();
    if (window.Choreography.isInViewport(rect, window.innerHeight)) drawFrame();
    requestAnimationFrame(particleTick);
  }
  requestAnimationFrame(particleTick);

  return { update: applyOverlayProgress, resize };
}

document.addEventListener("DOMContentLoaded", () => {
  const trails = (window.TRAIL_SECTIONS || [])
    .filter((c) => document.querySelector(c.section))
    .map(initTrail)
    .filter(Boolean);

  window.__trails = trails; // debug handle

  function hookIntoRaf() {
    if (window.__lenis) {
      window.__lenis.on("scroll", () => trails.forEach((t) => t.update()));
      trails.forEach((t) => t.update());
    } else {
      function raf() {
        trails.forEach((t) => t.update());
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }
  hookIntoRaf();
});
