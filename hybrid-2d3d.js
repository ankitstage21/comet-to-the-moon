/* ============================================================
   HYBRID-2D3D — flat editorial layout with a smaller inline
   Three.js object that idle-rotates continuously (plus an
   optional pointer-tilt accent on fine-pointer devices). NOT
   scroll-pinned or scroll-progress-driven, unlike every other
   engine — this section relies on the sitewide .reveal
   IntersectionObserver for its fade-in, same as plain content.
   ============================================================ */

function buildHybridGeometry(motion, palette) {
  const group = new THREE.Group();
  const accent = new THREE.Color(palette?.accent || "#38bdf8");
  const material = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.55, roughness: 0.3 });

  switch (motion) {
    case "moon": {
      // Cratered moon sphere + tilted orbit ring + a small comet on the ring
      const moonGeo = new THREE.IcosahedronGeometry(1.15, 4);
      const mpos = moonGeo.attributes.position;
      const craters = [];
      for (let i = 0; i < 9; i++) {
        craters.push(new THREE.Vector3().randomDirection());
      }
      const v = new THREE.Vector3();
      for (let i = 0; i < mpos.count; i++) {
        v.set(mpos.getX(i), mpos.getY(i), mpos.getZ(i)).normalize();
        let r = 1.15;
        for (const c of craters) {
          const d = v.angleTo(c);
          if (d < 0.38) r -= Math.cos((d / 0.38) * Math.PI * 0.5) * 0.07;
        }
        mpos.setXYZ(i, v.x * r, v.y * r, v.z * r);
      }
      moonGeo.computeVertexNormals();
      group.add(new THREE.Mesh(moonGeo, new THREE.MeshStandardMaterial({
        color: "#a7aebb", roughness: 1, metalness: 0, flatShading: true,
      })));

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.85, 0.02, 12, 100),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.7 })
      );
      ring.rotation.x = Math.PI / 2.6;
      ring.rotation.y = 0.3;
      group.add(ring);

      const comet = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 16, 16),
        new THREE.MeshBasicMaterial({ color: accent })
      );
      comet.userData.isComet = true;
      comet.userData.ringTilt = { x: ring.rotation.x, y: ring.rotation.y };
      group.add(comet);
      break;
    }
    case "orbit":
    case "turntable": {
      group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), material));
      break;
    }
    case "morph":
    case "reveal": {
      const count = 10;
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.32), material.clone());
        const angle = (i / count) * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * 1.1, Math.sin(angle) * 1.1, 0);
        group.add(mesh);
      }
      break;
    }
    case "abstract":
    case "abstract-drift":
    default: {
      group.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.75, 0.24, 100, 16), material));
      break;
    }
  }
  return group;
}

function initHybrid(cfg) {
  const section = document.querySelector(cfg.section);
  const stage = section?.querySelector(".hybrid-stage");
  const canvas = stage?.querySelector("canvas");
  if (!canvas) { console.warn(`hybrid-2d3d: no <canvas> found in ${cfg.section}, skipping`); return null; }

  const reduceMotion = window.Choreography.prefersReducedMotion();
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.Choreography.capDPR());

  const scene = new THREE.Scene();
  const group = buildHybridGeometry(cfg.motion, cfg.palette);
  scene.add(group);

  const key = new THREE.DirectionalLight(0xfff4e0, 0.9); key.position.set(4, 3, 5);
  const rim = new THREE.DirectionalLight(cfg.palette?.accent || "#38bdf8", 0.7); rim.position.set(-4, 2, -3);
  const fill = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 4.5);

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function render() { renderer.render(scene, camera); }

  if (reduceMotion) {
    render();
    return { update: () => {}, resize };
  }

  let targetTiltX = 0, targetTiltY = 0;
  let tiltX = 0, tiltY = 0;

  if (hasFinePointer) {
    stage.addEventListener("pointermove", (event) => {
      const { x, y } = window.Choreography.normalizedPointer(event, stage);
      targetTiltY = x * 0.2;
      targetTiltX = y * 0.15;
    });
    stage.addEventListener("pointerleave", () => {
      targetTiltX = 0;
      targetTiltY = 0;
    });
  }

  let last = performance.now();
  function tick() {
    const rect = section.getBoundingClientRect();
    if (window.Choreography.isInViewport(rect, window.innerHeight)) {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      tiltX = window.Choreography.lerp(tiltX, targetTiltX, 0.08);
      tiltY = window.Choreography.lerp(tiltY, targetTiltY, 0.08);
      group.rotation.y += delta * 0.5 + tiltY * delta;
      group.rotation.x = tiltX;
      // advance the comet along its tilted ring, if present
      const t = performance.now() / 1000;
      group.children.forEach((child) => {
        if (!child.userData.isComet) return;
        const a = t * 0.9;
        const p = new THREE.Vector3(Math.cos(a) * 1.85, Math.sin(a) * 1.85, 0);
        p.applyEuler(new THREE.Euler(child.userData.ringTilt.x, child.userData.ringTilt.y, 0));
        child.position.copy(p);
      });
      render();
    } else {
      last = performance.now();
    }
    requestAnimationFrame(tick);
  }

  render();
  requestAnimationFrame(tick);

  return { update: () => {}, resize };
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined") {
    console.error("hybrid-2d3d: THREE.js not loaded — check the CDN <script> tag in index.html");
    return;
  }

  const hybrids = (window.HYBRID_SECTIONS || [])
    .filter((c) => document.querySelector(c.section))
    .map(initHybrid)
    .filter(Boolean);

  window.__hybrid = hybrids; // debug handle
});
