/* ============================================================
   PRISM — scroll engine
   Multiple canvas frame-sequence scrub sections + scroll reveals + counters
   ============================================================ */
function initScrub(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas  = section?.querySelector("canvas");
  if (!canvas) { console.warn(`scroll-cinematic: no <canvas> found in ${cfg.section}, skipping`); return null; }
  const ctx     = canvas.getContext("2d", { alpha: false });
  const lines   = [...section.querySelectorAll(".reveal-line")];
  const bar     = section.querySelector(".progress-fill");
  const readout = section.querySelector("[data-frame-readout]");
  const liveCounts = [...section.querySelectorAll("[data-live-count]")];
  const bgFill  = cfg.bg || "#0a0a12";
  const preloader = section.querySelector(".preloader");
  const preloaderFill = preloader?.querySelector(".preloader-fill");
  const preloaderText = preloader?.querySelector(".preloader-text");

  // Normalize single-motion sections (top-level frameCount/framePath) into a
  // one-beat internal list, so the rest of this function has only one code
  // path to maintain for both single-motion and multi-beat (`cfg.beats`) sections.
  const beatDefs = cfg.beats && cfg.beats.length
    ? cfg.beats
    : [{ name: "_single", frameCount: cfg.frameCount, framePath: cfg.framePath, progressStart: 0, progressEnd: 1, loopBack: false }];

  const totalFrames = beatDefs.reduce((sum, b) => sum + b.frameCount, 0);
  const images = {}; // beat name -> Image[]
  let loadedCount = 0;

  beatDefs.forEach((beat, beatIndex) => {
    const arr = [];
    for (let i = 0; i < beat.frameCount; i++) {
      const img = new Image();
      img.src = beat.framePath(i + 1);
      img.onload = img.onerror = () => {
        loadedCount++;
        const pct = Math.round((loadedCount / totalFrames) * 100);
        if (preloaderFill) preloaderFill.style.width = pct + "%";
        if (preloaderText) preloaderText.textContent = `LOADING ${pct}%`;
        if (loadedCount === totalFrames && preloader) preloader.classList.add("done");
        if (beatIndex === 0 && i === 0) draw(beat.name, 0);
      };
      arr[i] = img;
    }
    images[beat.name] = arr;
  });

  const reduceMotion = window.Choreography.prefersReducedMotion();
  if (reduceMotion) {
    if (lines[0]) { lines[0].style.opacity = "1"; lines[0].style.transform = "none"; }
    return { update: () => {}, resize };
  }

  let currentBeat = null, currentIdx = -1;
  function draw(beatName, index) {
    const img = images[beatName] && images[beatName][index];
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
    canvas.width  = canvas.clientWidth  * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(currentBeat || beatDefs[0].name, currentIdx < 0 ? 0 : currentIdx);
  }

  function resolveBeat(p) {
    for (const beat of beatDefs) {
      if (p >= beat.progressStart && p <= beat.progressEnd) return beat;
    }
    return beatDefs[beatDefs.length - 1];
  }

  function update() {
    const rect = section.getBoundingClientRect();
    if (!window.Choreography.isInViewport(rect, window.innerHeight)) return;
    const p = window.Choreography.progress(rect, window.innerHeight);

    const beat = resolveBeat(p);
    const span = beat.progressEnd - beat.progressStart;
    let localT = span > 0 ? (p - beat.progressStart) / span : 0;
    localT = Math.max(0, Math.min(1, localT));
    // loopBack folds local progress there-and-back: forward through the frames
    // for the first half of the beat's range, backward through the same
    // frames for the second half — one clip, two narrative beats, zero extra cost.
    const foldedT = beat.loopBack ? (localT < 0.5 ? localT * 2 : (1 - localT) * 2) : localT;
    const idx = Math.min(beat.frameCount - 1, Math.floor(foldedT * (beat.frameCount - 1)));

    if (beat.name !== currentBeat || idx !== currentIdx) {
      currentBeat = beat.name;
      currentIdx = idx;
      draw(beat.name, idx);
      if (readout) readout.textContent =
        `FRAME ${String(idx + 1).padStart(3, "0")} / ${String(beat.frameCount).padStart(3, "0")}`;
    }

    if (bar) bar.style.width = (p * 100).toFixed(2) + "%";

    // Live scroll-synced background shift (e.g. a "descent" section darkening
    // with depth) — distinct from the canvas's own fillStyle, this tints the
    // section/page chrome around the scrubbing canvas.
    if (cfg.bgFrom && cfg.bgTo) {
      section.style.background = window.Choreography.interpolateColor(cfg.bgFrom, cfg.bgTo, p);
    }

    // Live scroll-synced counter — continuously reflects progress, unlike
    // .stat-num's data-count which counts up once on reveal and then holds.
    for (const el of liveCounts) {
      const target = parseFloat(el.dataset.target);
      if (Number.isNaN(target)) continue;
      const suffix = el.dataset.suffix || "";
      const value = target * p;
      el.textContent = (target % 1 === 0 ? Math.round(value) : value.toFixed(1)) + suffix;
    }

    for (const el of lines) {
      const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
      const mid = (a + b) / 2, half = (b - a) / 2;
      let o = 1 - Math.abs(p - mid) / half;
      o = Math.max(0, Math.min(1, o));
      el.style.opacity = o.toFixed(3);
      // keep the CSS -50%,-50% centering — only add the slide offset
      el.style.transform = `translate(-50%, -50%) translateY(${(1 - o) * 30}px)`;
    }
  }
  window.addEventListener("resize", resize);
  resize();
  return { update, resize };
}

function animateCount(el) {
  const target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || "";
  const dur = 1500, t0 = performance.now();
  function step(t) {
    const k = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - k, 3);
    el.textContent = (target % 1 === 0 ? Math.round(target*eased) : (target*eased).toFixed(1)) + suffix;
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.addEventListener("DOMContentLoaded", () => {
  const scrubs = (window.SCRUB_SECTIONS || [])
    .filter(c => document.querySelector(c.section))
    .map(initScrub)
    .filter(Boolean); 

  window.__scrubs = scrubs;   // debug handle: __scrubs.forEach(s => s.update())

  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  window.__lenis = lenis;
  function raf(t) { lenis.raf(t); scrubs.forEach(s => s.update()); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  // route nav anchors through Lenis so pinned sections scroll smoothly
  // (a native anchor jump bypasses Lenis and can leave engines un-updated)
  document.querySelectorAll('.hud-nav-link[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.classList.contains("stat-num")) animateCount(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.25 });
  document.querySelectorAll(".reveal, .stat-num").forEach((el) => io.observe(el));

  lenis.on("scroll", ({ scroll }) => {
    document.querySelectorAll(".scroll-hint").forEach(h => h.style.opacity = scroll > 60 ? "0" : "1");
  });
});
