/* ═══ Comet X-Lows v2 — app logic ═══════════════════════════════════
   Three rules this file exists to enforce:
   1. Nothing blocks first paint. There is no loader gate anywhere.
   2. Heavy assets load by tier, chosen from the actual connection.
   3. Every asset is lazy except the LCP poster.
   ═══════════════════════════════════════════════════════════════════ */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── instrumentation ───────────────────────────────────────────────
   A real build swaps `sink` for gtag/fbq/dataLayer. Keeping it in one
   place means the page is measurable from day one instead of after a
   retrofit — which is how landing pages end up un-optimisable.        */
const Track = (() => {
  const seen = new Set();
  const t0 = performance.now();
  function sink(name, data) {
    // eslint-disable-next-line no-console
    console.log(`[ev] ${name}`, data || "");
    (window.dataLayer = window.dataLayer || []).push({ event: name, ...data });
  }
  return {
    fire(name, data) { sink(name, data); },
    once(name, data) { if (seen.has(name)) return; seen.add(name); sink(name, data); },
    ms() { return Math.round(performance.now() - t0); },
  };
})();

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-ev]");
  if (el) Track.fire(el.dataset.ev, { text: el.textContent.trim().slice(0, 40) });
});

/* ── connection tier ──────────────────────────────────────────────
   saveData / 2g  → no sequence at all, the poster is the hero.
   3g             → 45-frame 720px set (~660KB).
   4g + desktop   → 90-frame 1440px set (~3.4MB).                    */
function pickTier() {
  const c = navigator.connection || {};
  const slow = c.saveData || /(^|-)2g$/.test(c.effectiveType || "");
  if (REDUCED || slow) return { id: "none", frames: 0 };
  const wide = innerWidth >= 860 && (c.effectiveType || "4g") === "4g";
  return wide ? { id: "d", frames: 90, dir: "frames/d" }
              : { id: "m", frames: 45, dir: "frames/m" };
}
const TIER = pickTier();

/* AVIF support: probe the first real frame rather than a base64 blob, so
   the probe doubles as the first useful fetch. */
async function pickFormat(dir) {
  if (!dir) return "jpg";
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res("avif");
    img.onerror = () => res("jpg");
    img.src = `${dir}/f_000.avif`;
  });
}

/* ── 4 · cinematic scrub ──────────────────────────────────────────
   Progressive: draw frame 0 the moment it decodes, then load a sparse
   pass so scrubbing works almost immediately, then fill in the gaps.
   The section is usable at ~3 frames instead of all 45.              */
async function initScrub() {
  const section = document.getElementById("cinematic");
  const canvas = document.getElementById("scrub");
  const meta = document.getElementById("cineMeta");
  const lines = [...section.querySelectorAll(".line")];
  const ctx = canvas.getContext("2d", { alpha: false });

  function paintLines(p) {
    for (const el of lines) {
      const a = +el.dataset.in, b = +el.dataset.out;
      const mid = (a + b) / 2, half = (b - a) / 2;
      const o = Math.max(0, Math.min(1, 1 - Math.abs(p - mid) / half));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${(1 - o) * 22}px)`;
    }
  }

  // Static tier: show the poster, keep the copy, skip every frame fetch.
  if (!TIER.frames) {
    const poster = new Image();
    poster.onload = () => drawCover(poster);
    poster.src = "assets/poster.jpg";
    if (REDUCED) lines.forEach((l) => (l.style.opacity = 1));
    else onScroll(() => paintLines(progressOf(section)));
    if (meta) meta.textContent = "STILL · DATA SAVER";
    return;
  }

  const ext = await pickFormat(TIER.dir);
  const N = TIER.frames;
  const imgs = new Array(N);
  let ready = 0, current = -1;

  function drawCover(img) {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== cw * dpr) {
      canvas.width = cw * dpr; canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let w, h, x, y;
    if (ir > cr) { h = ch; w = ch * ir; x = (cw - w) / 2; y = 0; }
    else { w = cw; h = cw / ir; x = 0; y = (ch - h) / 2; }
    ctx.fillStyle = "#070b14"; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, x, y, w, h);
  }
  window.__drawCover = drawCover;

  function load(i) {
    if (imgs[i]) return imgs[i];
    const img = new Image();
    img.decoding = "async";
    img.src = `${TIER.dir}/f_${String(i).padStart(3, "0")}.${ext}`;
    img.onload = () => {
      ready++;
      if (i === 0 && current < 0) { current = 0; drawCover(img); }
      if (meta) meta.textContent = `SEQ ${ready}/${N} · ${TIER.id.toUpperCase()} · ${ext.toUpperCase()}`;
    };
    imgs[i] = img;
    return img;
  }

  // pass 1: first frame — paints immediately
  load(0);
  // pass 2: sparse (every 8th) — scrubbing becomes usable
  for (let i = 8; i < N; i += 8) load(i);
  // pass 3: the rest, only once the section is near the viewport
  function fill() {
    io.disconnect();
    Track.once("cinematic_fill_start", { at_ms: Track.ms() });
    for (let i = 0; i < N; i++) load(i);
  }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) fill();
  }, { rootMargin: "150% 0px" });
  io.observe(section);
  window.__fillFrames = fill;   // dev hook

  function nearest(idx) {              // fall back to the closest decoded frame
    for (let d = 0; d < N; d++) {
      const a = imgs[idx - d], b = imgs[idx + d];
      if (a && a.complete && a.naturalWidth) return a;
      if (b && b.complete && b.naturalWidth) return b;
    }
    return null;
  }

  function update() {
    const p = progressOf(section);
    if (p < -0.2 || p > 1.2) return;
    paintLines(p);
    const idx = Math.min(N - 1, Math.max(0, Math.round(p * (N - 1))));
    if (idx === current) return;
    const img = nearest(idx);
    if (img) { current = idx; drawCover(img); }
  }
  onScroll(update);
  addEventListener("resize", () => { const i = nearest(current < 0 ? 0 : current); if (i) drawCover(i); });
}

/* ── 2 · interactive 3D ───────────────────────────────────────────
   313KB Draco+WebP GLB, imported only when the section gets close.
   Drag rotates; `touch-action: pan-y` in CSS means vertical scrolling
   still works when the finger starts on the model.                   */
function initViewer() {
  const host = document.getElementById("viewer");
  const canvas = document.getElementById("glcanvas");
  const hint = document.getElementById("viewerHint");
  const resetBtn = document.getElementById("viewerReset");
  const chips = [...document.querySelectorAll("#angleChips .chip")];
  let booted = false;

  async function boot() {
    if (booted) return;
    booted = true;
    io.disconnect();
    const t = performance.now();

    let THREE, GLTFLoader, DRACOLoader;
    try {
      THREE = await import("three");
      ({ GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"));
      ({ DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js"));
    } catch (err) {
      fail("three_import_failed", err); return;
    }

    const draco = new DRACOLoader();
    draco.setDecoderPath("https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load("assets/xlow.glb", (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      model.position.sub(box.getCenter(new THREE.Vector3()));
      const maxDim = Math.max(size.x, size.y, size.z);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      scene.add(model);
      scene.add(new THREE.AmbientLight(0xffffff, 1.0));
      const key = new THREE.DirectionalLight(0xfff6e8, 1.5); key.position.set(3, 4, 5);
      const rim = new THREE.DirectionalLight(0x9fc2e8, 0.75); rim.position.set(-4, 2, -4);
      scene.add(key, rim);

      const cam = new THREE.PerspectiveCamera(34, 1, .01, 100);
      const radius = maxDim * 2.05;
      let az = -18, el = 8, targetAz = -18, targetEl = 8, spin = !REDUCED, dirty = true;

      function size2() {
        const w = host.clientWidth, h = host.clientHeight;
        renderer.setSize(w, h, false);
        cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true;
      }
      addEventListener("resize", size2); size2();

      function place() {
        const a = az * Math.PI / 180, e = el * Math.PI / 180;
        cam.position.set(
          radius * Math.cos(e) * Math.sin(a),
          radius * Math.sin(e),
          radius * Math.cos(e) * Math.cos(a)
        );
        cam.lookAt(0, 0, 0);
      }

      // drag
      let dragging = false, lx = 0, ly = 0;
      canvas.addEventListener("pointerdown", (e) => {
        dragging = true; spin = false; lx = e.clientX; ly = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        if (hint) hint.style.opacity = "0";
        resetBtn.hidden = false;
        Track.once("model_first_drag", { at_ms: Track.ms() });
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        targetAz -= (e.clientX - lx) * 0.5;
        targetEl = Math.max(-85, Math.min(85, targetEl + (e.clientY - ly) * 0.35));
        lx = e.clientX; ly = e.clientY; dirty = true;
      });
      const stop = () => { dragging = false; };
      canvas.addEventListener("pointerup", stop);
      canvas.addEventListener("pointercancel", stop);

      chips.forEach((c) => c.addEventListener("click", () => {
        targetAz = +c.dataset.az; targetEl = c.dataset.el ? +c.dataset.el : 8;
        spin = false; dirty = true;
        chips.forEach((o) => o.setAttribute("aria-pressed", String(o === c)));
        resetBtn.hidden = false;
      }));
      resetBtn.addEventListener("click", () => {
        targetAz = -18; targetEl = 8; spin = !REDUCED; dirty = true;
        chips.forEach((o) => o.setAttribute("aria-pressed", "false"));
      });

      if (REDUCED) { place(); renderer.render(scene, cam); markReady(t); return; }

      // Render only while visible and only while something changed —
      // an idle WebGL loop on a scrolled-past section is wasted battery.
      let visible = false;
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: "20%" }).observe(host);

      (function loop() {
        requestAnimationFrame(loop);
        if (!visible) return;
        if (spin) { targetAz += 0.22; dirty = true; }
        const naz = az + (targetAz - az) * 0.12;
        const nel = el + (targetEl - el) * 0.12;
        if (Math.abs(naz - az) > 0.01 || Math.abs(nel - el) > 0.01) dirty = true;
        az = naz; el = nel;
        if (!dirty) return;
        place(); renderer.render(scene, cam); dirty = false;
      })();

      markReady(t);
    }, undefined, (err) => fail("glb_load_failed", err));

    function markReady(t) {
      window.__viewerReady = true;
      Track.fire("model_ready", { load_ms: Math.round(performance.now() - t) });
    }
    function fail(reason, err) {
      window.__viewerError = reason;
      Track.fire("model_failed", { reason: String(err).slice(0, 120) });
      document.getElementById("viewerFallback").hidden = false;
      canvas.hidden = true;
      if (hint) hint.hidden = true;
    }
  }

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) boot();
  }, { rootMargin: "120% 0px" });
  io.observe(host);

  window.__bootViewer = boot;   // dev hook, see bottom of file
}

/* ── shared scroll driver ─────────────────────────────────────────
   One rAF loop for everything scroll-driven. Driving from rAF rather
   than scroll events is deliberate: scroll events miss anchor jumps
   and restored positions, which leaves a stale canvas behind.        */
const scrollJobs = [];
function onScroll(fn) { scrollJobs.push(fn); }
function progressOf(el) {
  const r = el.getBoundingClientRect();
  const span = r.height - innerHeight;
  return span <= 0 ? 0 : Math.max(0, Math.min(1, -r.top / span));
}
(function raf() { requestAnimationFrame(raf); for (const j of scrollJobs) j(); })();

/* ── reveal + count-up ────────────────────────────────────────────── */
function initReveals() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      io.unobserve(el);
      if (el.dataset.section) { Track.once(`view_${el.dataset.section}`, { at_ms: Track.ms() }); continue; }
      const target = +el.dataset.count, suffix = el.dataset.suffix || "";
      const t0 = performance.now();
      (function step(t) {
        const k = Math.min((t - t0) / 1100, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }
  }, { threshold: 0.35 });
  document.querySelectorAll("[data-count]").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-section]").forEach((el) => io.observe(el));
}

/* ── sticky dock ──────────────────────────────────────────────────── */
function initDock() {
  const dock = document.getElementById("dock");
  const hero = document.getElementById("hero");
  const wl = document.getElementById("waitlist");
  onScroll(() => {
    const pastHero = hero.getBoundingClientRect().bottom < 60;
    const atForm = wl.getBoundingClientRect().top < innerHeight * 0.8;
    dock.classList.toggle("show", pastHero && !atForm);
  });
}

/* ── waitlist (demo only — no network, nothing stored) ────────────── */
function initForm() {
  const grid = document.getElementById("sizeGrid");
  const form = document.getElementById("wl");
  const msg = document.getElementById("wlMsg");
  let size = null;

  for (let uk = 3; uk <= 12; uk++) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = uk; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      size = uk;
      [...grid.children].forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
      Track.fire("size_selected", { uk });   // size demand is real signal — log it
    });
    grid.appendChild(b);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const phone = form.phone.value.trim(), email = form.email.value.trim();
    if (!size) { msg.textContent = "Pick a size first."; return; }
    if (!phone && !email) { msg.textContent = "Add a WhatsApp number or an email."; return; }
    Track.fire("waitlist_complete", { uk: size, channel: phone ? "whatsapp" : "email", at_ms: Track.ms() });
    msg.textContent = `Demo only — nothing was sent. Captured locally: UK ${size}, ${phone ? "WhatsApp" : "email"}.`;
    form.querySelector("button[type=submit]").textContent = "✓ CAPTURED (DEMO)";
  });
}

/* ── dev perf HUD ─────────────────────────────────────────────────── */
function initHud() {
  const hud = document.getElementById("hud");
  const btn = document.getElementById("hudToggle");
  btn.addEventListener("click", () => { hud.hidden = !hud.hidden; if (!hud.hidden) paint(); });
  function paint() {
    const res = performance.getEntriesByType("resource");
    const total = res.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
    const byType = {};
    for (const r of res) {
      const k = /\.(avif|jpg|png|webp)/.test(r.name) ? "images"
              : /\.glb/.test(r.name) ? "model"
              : /\.(js|mjs)|three|draco/.test(r.name) ? "script"
              : /fonts|\.woff/.test(r.name) ? "fonts" : "other";
      byType[k] = (byType[k] || 0) + (r.transferSize || r.encodedBodySize || 0);
    }
    const nav = performance.getEntriesByType("navigation")[0];
    const lcp = window.__lcp ? `${Math.round(window.__lcp)}ms` : "—";
    hud.textContent =
      `tier      ${TIER.id} (${TIER.frames} frames)\n` +
      `requests  ${res.length}\n` +
      `transfer  ${(total / 1048576).toFixed(2)} MB\n` +
      Object.entries(byType).sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `  ${k.padEnd(8)}${(v / 1024).toFixed(0)} KB`).join("\n") +
      `\nDOM done  ${nav ? Math.round(nav.domContentLoadedEventEnd) : "—"}ms` +
      `\nLCP       ${lcp}` +
      `\nmodel     ${window.__viewerReady ? "ready" : window.__viewerError || "pending"}`;
    if (!hud.hidden) setTimeout(paint, 1000);
  }
  try {
    new PerformanceObserver((l) => {
      const e = l.getEntries().at(-1);
      if (e) { window.__lcp = e.startTime; Track.once("lcp", { ms: Math.round(e.startTime) }); }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch (_) { /* unsupported */ }
}

/* ── boot ─────────────────────────────────────────────────────────── */
initReveals();
initDock();
initForm();
initHud();
initViewer();
initScrub();
Track.fire("page_ready", { tier: TIER.id, reduced: REDUCED, dpr: devicePixelRatio });

/* Dev hooks. Automated/headless panes suspend rAF and IntersectionObserver,
   so lazy work never triggers and scroll-driven canvases stay on frame 0.
   `__tick()` runs one scroll pass by hand; `?forceboot` skips the observers. */
window.__tick = () => { for (const j of scrollJobs) j(); };
if (location.search.includes("forceboot")) {
  document.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = (el.dataset.count | 0) + (el.dataset.suffix || "");
  });
  window.__forced = true;
}
