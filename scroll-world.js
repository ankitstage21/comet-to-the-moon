/* ============================================================
   SCROLL-WORLD — real-time WebGL scroll engine (Three.js)
   Comet "To The Moon": procedural lunar terrain fly-through.
   Mirrors scroll-cinematic.js's structure so both coexist.
   ============================================================ */

function buildGeometry(motion, palette) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette?.accent || "#9fc2e8");
  const bg = new THREE.Color(palette?.bg || "#070b14");

  switch (motion) {
    case "moonwalk": {
      // --- Cratered terrain ---
      const craters = [
        { x: -10, z: 8, r: 7, d: 1.6 },
        { x: 12, z: -6, r: 9, d: 2.2 },
        { x: -6, z: -28, r: 6, d: 1.4 },
        { x: 14, z: -46, r: 11, d: 2.6 },
        { x: -16, z: -58, r: 8, d: 1.8 },
        { x: 4, z: -78, r: 7, d: 1.5 },
      ];
      const terrainGeo = new THREE.PlaneGeometry(140, 160, 110, 130);
      terrainGeo.rotateX(-Math.PI / 2);
      const pos = terrainGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        // gentle rolling dunes
        let y = Math.sin(x * 0.12) * Math.cos(z * 0.09) * 0.9
              + Math.sin(x * 0.31 + 2.1) * Math.sin(z * 0.27) * 0.35;
        // crater bowls with raised rims
        for (const c of craters) {
          const d = Math.hypot(x - c.x, z - c.z);
          if (d < c.r) {
            y -= Math.cos((d / c.r) * Math.PI * 0.5) * c.d;   // bowl
          } else if (d < c.r * 1.35) {
            y += (1 - (d - c.r) / (c.r * 0.35)) * c.d * 0.25; // rim
          }
        }
        pos.setY(i, y);
      }
      terrainGeo.computeVertexNormals();
      const terrain = new THREE.Mesh(
        terrainGeo,
        new THREE.MeshStandardMaterial({ color: "#565e6e", roughness: 1, metalness: 0, flatShading: true })
      );
      terrain.position.y = -3;
      terrain.position.z = -40;
      group.add(terrain);

      // --- Starfield dome ---
      const starCount = 1800;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(1 - Math.random());   // upper hemisphere bias
        const r = 180 + Math.random() * 60;
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 2;
        starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 40;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      group.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: "#eef1f6", size: 0.7, sizeAttenuation: true, transparent: true, opacity: 0.95, fog: false,
      })));

      // --- Earth on the horizon (self-lit, canvas-shaded so it reads spherical) ---
      const earthCanvas = document.createElement("canvas");
      earthCanvas.width = earthCanvas.height = 256;
      const ec = earthCanvas.getContext("2d");
      const grad = ec.createRadialGradient(96, 88, 20, 128, 128, 150);
      grad.addColorStop(0, "#b8d8fa");
      grad.addColorStop(0.45, "#6ea3ec");
      grad.addColorStop(0.8, "#2f5aa8");
      grad.addColorStop(1, "#16305e");
      ec.fillStyle = grad;
      ec.fillRect(0, 0, 256, 256);
      // faint cloud swirls
      ec.globalAlpha = 0.25;
      ec.fillStyle = "#eef5ff";
      for (let i = 0; i < 14; i++) {
        ec.beginPath();
        ec.ellipse(Math.random() * 256, Math.random() * 256, 22 + Math.random() * 30, 6 + Math.random() * 8,
          Math.random() * Math.PI, 0, Math.PI * 2);
        ec.fill();
      }
      ec.globalAlpha = 1;
      const earthTex = new THREE.CanvasTexture(earthCanvas);
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(9, 32, 32),
        new THREE.MeshBasicMaterial({ map: earthTex, fog: false })
      );
      earth.position.set(-42, 30, -140);
      earth.userData.excludeFog = true;
      group.add(earth);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(11, 32, 32),
        new THREE.MeshBasicMaterial({
          color: "#7fb2f0", transparent: true, opacity: 0.22, fog: false,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      glow.position.copy(earth.position);
      group.add(glow);
      break;
    }
    default: {
      const particleCount = 300;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 6;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      group.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: accent, size: 0.04, transparent: true, opacity: 0.85 })));
      break;
    }
  }
  return { group, bg };
}

function initWorld(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas = section?.querySelector("canvas");
  if (!canvas) { console.warn(`scroll-world: no <canvas> found in ${cfg.section}, skipping`); return null; }

  const reduceMotion = window.Choreography.prefersReducedMotion();
  const lines = [...section.querySelectorAll(".reveal-line")];
  const bar = section.querySelector(".progress-fill");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(window.Choreography.capDPR());

  const scene = new THREE.Scene();
  const { group, bg } = buildGeometry(cfg.motion, cfg.palette);
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 55, 160);
  scene.add(group);

  // low-angle sun: long shadows, high contrast — night-side moon mood
  const key = new THREE.DirectionalLight(0xfff4e0, 0.85);
  key.position.set(40, 10, 5);
  const rim = new THREE.DirectionalLight(cfg.palette?.accent || "#9fc2e8", 0.35);
  rim.position.set(-25, 6, -30);
  const fill = new THREE.AmbientLight(0x33415e, 0.35);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 300);
  camera.position.set(0, 2.5, 30);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function applyProgress(p) {
    // glide forward across the terrain, gentle low-gravity bob and sway
    const z = 30 - p * 85;
    const x = Math.sin(p * Math.PI * 2) * 4;
    const y = 3.2 + Math.sin(p * Math.PI * 5) * 0.5;
    camera.position.set(x, y, z);
    // aim near the horizon so the starfield and Earth share the frame
    camera.lookAt(x * 0.4, 4.5, z - 16);

    for (const el of lines) {
      const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
      const mid = (a + b) / 2, half = (b - a) / 2;
      let o = 1 - Math.abs(p - mid) / half;
      o = Math.max(0, Math.min(1, o));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate(-50%, -50%) translateY(${(1 - o) * 30}px)`;
    }
    if (bar) bar.style.width = (p * 100).toFixed(2) + "%";
  }

  if (reduceMotion) {
    applyProgress(0.15);
    if (lines[0]) { lines[0].style.opacity = "1"; lines[0].style.transform = "none"; }
    renderer.render(scene, camera);
    return { update: () => {}, resize };
  }

  function update() {
    const rect = section.getBoundingClientRect();
    if (!window.Choreography.isInViewport(rect, window.innerHeight)) return;
    const p = window.Choreography.progress(rect, window.innerHeight);
    applyProgress(p);
    renderer.render(scene, camera);
  }

  applyProgress(0);
  renderer.render(scene, camera); // paint an initial frame immediately
  return { update, resize };
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined") {
    console.error("scroll-world: THREE.js not loaded — check the CDN <script> tag in index.html");
    return;
  }

  const worlds = (window.WORLD_SECTIONS || [])
    .filter((c) => document.querySelector(c.section))
    .map(initWorld)
    .filter(Boolean);

  window.__worlds = worlds; // debug handle: __worlds.forEach(w => w.update())

  // Always drive from a continuous rAF loop (not lenis "scroll" events) —
  // scroll events miss anchor jumps and mid-section landings, leaving a
  // stale first-frame render on the canvas. update() early-returns when
  // the section is off-screen, so the idle cost is a getBoundingClientRect.
  function raf() {
    worlds.forEach((w) => w.update());
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
});
