/* ============================================================
   PHYSICS-PLAY — Three.js rendering + cannon-es rigid-body
   simulation. Objects rest on a floor plane and respond to
   gravity/collisions; drag with the pointer to throw them.
   cannon-es is ESM-only (see index.html's module script) — this
   file must not assume window.CANNON exists at DOMContentLoaded.
   ============================================================ */

function startPhysicsSection(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas = section?.querySelector("canvas");
  if (!canvas) { console.warn(`physics-play: no <canvas> found in ${cfg.section}, skipping`); return null; }

  const CANNON = window.CANNON;
  const reduceMotion = window.Choreography.prefersReducedMotion();
  const accent = new THREE.Color(cfg.palette?.accent || "#ff3b30");
  const bg = new THREE.Color(cfg.palette?.bg || "#0a0a12");
  const objectCount = cfg.objectCount || 6;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(window.Choreography.capDPR());

  const scene = new THREE.Scene();
  scene.background = bg;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 2.2, 8);
  camera.lookAt(0, -0.6, 0);

  const key = new THREE.DirectionalLight(0xfff4e0, 1.1); key.position.set(3, 6, 5);
  const rim = new THREE.DirectionalLight(accent, 0.55); rim.position.set(-5, 3, -4);
  const fill = new THREE.AmbientLight(0x33415e, 0.5);
  scene.add(key, rim, fill);

  // starfield backdrop so the room reads as space, not a void
  const starCount = 900;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    const r = 60 + Math.random() * 30;
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) - 4;
    starPos[i * 3 + 2] = -Math.abs(r * Math.sin(ph) * Math.sin(th)) - 6;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xeef1f6, size: 0.28, transparent: true, opacity: 0.9,
  })));

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 1 })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -2;
  scene.add(floorMesh);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // Lunar gravity — 1/6th of Earth's. The whole point of this room.
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -1.62, 0) });
  const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  floorBody.position.set(0, -2, 0);
  world.addBody(floorBody);

  // Bound the play area so a hard throw doesn't lose an object off-scene forever.
  const wallDefs = [
    { pos: [7, 1, 0], normal: [-1, 0, 0] },
    { pos: [-7, 1, 0], normal: [1, 0, 0] },
    { pos: [0, 1, 7], normal: [0, 0, -1] },
    { pos: [0, 1, -7], normal: [0, 0, 1] },
  ];
  wallDefs.forEach(({ pos, normal }) => {
    const wallBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    wallBody.position.set(pos[0], pos[1], pos[2]);
    const target = new THREE.Vector3(normal[0], normal[1], normal[2]);
    const up = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, target);
    wallBody.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    world.addBody(wallBody);
  });

  const objects = [];

  // --- The X-Low itself: stylized mini sneaker on a box body ---
  function buildMiniSneaker() {
    const g = new THREE.Group();
    const ice = new THREE.MeshStandardMaterial({ color: "#eef3f9", roughness: 0.7 });
    const iceDeep = new THREE.MeshStandardMaterial({ color: "#4b4e57", roughness: 0.85 });
    const gum = new THREE.MeshStandardMaterial({ color: "#7db3e8", roughness: 0.85 });
    const white = new THREE.MeshStandardMaterial({ color: "#eef1f6", roughness: 0.6 });

    const sole = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 0.85), gum);
    sole.position.y = -0.4;
    g.add(sole);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.09, 0.9), white);
    mid.position.y = -0.27;
    g.add(mid);
    // quarter panel — the long low body of a low-top
    const quarter = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.78), ice);
    quarter.position.set(-0.3, 0.05, 0);
    g.add(quarter);
    // toe box, sloping down to a rounded cap
    const toebox = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.38, 0.78), ice);
    toebox.position.set(0.55, -0.06, 0);
    toebox.rotation.z = -0.12;
    g.add(toebox);
    const toecap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12), white);
    toecap.scale.set(1.0, 0.58, 1.12);
    toecap.position.set(1.0, -0.12, 0);
    g.add(toecap);
    // padded collar at the ankle
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.8), iceDeep);
    collar.position.set(-0.85, 0.42, 0);
    g.add(collar);
    // tongue + laces
    const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, 0.46), white);
    tongue.position.set(0.28, 0.38, 0);
    tongue.rotation.z = -0.3;
    g.add(tongue);
    for (let i = 0; i < 3; i++) {
      const lace = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.6), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6 }));
      lace.position.set(0.42 - i * 0.28, 0.36 - i * 0.09, 0);
      lace.rotation.z = -0.3;
      g.add(lace);
    }
    // Comet heel tab
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.3), new THREE.MeshBasicMaterial({ color: accent }));
    tab.position.set(-1.12, 0.25, 0);
    g.add(tab);
    return g;
  }

  const sneakerMesh = buildMiniSneaker();
  scene.add(sneakerMesh);
  const sneakerBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Box(new CANNON.Vec3(1.15, 0.45, 0.45)),
    position: reduceMotion ? new CANNON.Vec3(0, -1.55, 0) : new CANNON.Vec3(0, 1.0, 0),
    angularDamping: 0.2,
  });
  world.addBody(sneakerBody);
  objects.push({ mesh: sneakerMesh, body: sneakerBody, held: false });

  // --- Moon rocks ---
  const rockCount = Math.max(objectCount - 1, 3);
  for (let i = 0; i < rockCount; i++) {
    const size = 0.35 + Math.random() * 0.3;
    const rockGeo = new THREE.IcosahedronGeometry(size, 1);
    const rpos = rockGeo.attributes.position;
    for (let j = 0; j < rpos.count; j++) {
      const s = 1 + (Math.random() - 0.5) * 0.3;
      rpos.setXYZ(j, rpos.getX(j) * s, rpos.getY(j) * s, rpos.getZ(j) * s);
    }
    rockGeo.computeVertexNormals();
    const mesh = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({
      color: "#8f96a3", roughness: 1, metalness: 0, flatShading: true,
    }));
    scene.add(mesh);

    const restX = (Math.random() - 0.5) * 5;
    const restZ = (Math.random() - 0.5) * 4;
    const body = new CANNON.Body({
      mass: 0.6,
      shape: new CANNON.Sphere(size * 0.9),
      position: reduceMotion
        ? new CANNON.Vec3(restX, -2 + size, restZ)
        : new CANNON.Vec3(restX, 0.4 + Math.random() * 1.2, restZ),
    });
    world.addBody(body);
    objects.push({ mesh, body, held: false });
  }

  function syncMeshes() {
    for (const { mesh, body } of objects) {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    }
  }

  function render() { renderer.render(scene, camera); }

  if (reduceMotion) {
    syncMeshes();
    render();
    return { update: () => {}, resize };
  }

  // ---- Drag-to-throw ----
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const dragPoint = new THREE.Vector3();
  let dragged = null;
  let lastDragPoint = new THREE.Vector3();
  let lastDragTime = 0;
  let velocitySample = new THREE.Vector3();

  function setPointerNDC(event) {
    const rect = canvas.getBoundingClientRect();
    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  canvas.addEventListener("pointerdown", (event) => {
    setPointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    const hit = raycaster.intersectObjects(objects.map((o) => o.mesh), true)[0];
    if (!hit) return;
    // walk up the hierarchy — the sneaker is a Group, rocks are plain meshes
    let node = hit.object;
    let target = null;
    while (node && !target) {
      target = objects.find((o) => o.mesh === node) || null;
      node = node.parent;
    }
    if (!target) return;
    dragged = target;
    dragged.body.velocity.setZero();
    dragged.body.angularVelocity.setZero();
    dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), hit.point);
    lastDragPoint.copy(hit.point);
    lastDragTime = performance.now();
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!dragged) return;
    setPointerNDC(event);
    raycaster.setFromCamera(pointerNDC, camera);
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      dragged.body.position.set(dragPoint.x, dragPoint.y, dragPoint.z);
      const now = performance.now();
      const dt = Math.max(now - lastDragTime, 1) / 1000;
      velocitySample.subVectors(dragPoint, lastDragPoint).divideScalar(dt);
      lastDragPoint.copy(dragPoint);
      lastDragTime = now;
    }
  });

  function releaseDrag() {
    if (!dragged) return;
    dragged.body.velocity.set(velocitySample.x, velocitySample.y, velocitySample.z);
    dragged = null;
  }
  canvas.addEventListener("pointerup", releaseDrag);
  canvas.addEventListener("pointercancel", releaseDrag);

  let lastStep = performance.now();
  function update() {
    const rect = section.getBoundingClientRect();
    if (!window.Choreography.isInViewport(rect, window.innerHeight)) return;
    const now = performance.now();
    const delta = Math.min((now - lastStep) / 1000, 1 / 30);
    lastStep = now;
    world.step(1 / 60, delta, 3);
    syncMeshes();
    render();
  }

  render();
  return { update, resize };
}

function initPhysics(cfg) {
  if (window.CANNON) return startPhysicsSection(cfg);
  return new Promise((resolve) => {
    window.addEventListener("cannon-ready", () => resolve(startPhysicsSection(cfg)), { once: true });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined") {
    console.error("physics-play: THREE.js not loaded — check the CDN <script> tag in index.html");
    return;
  }

  const configs = (window.PHYSICS_SECTIONS || []).filter((c) => document.querySelector(c.section));
  if (!configs.length) return;

  Promise.all(configs.map(initPhysics)).then((results) => {
    const physics = results.filter(Boolean);
    window.__physics = physics; // debug handle

    function raf() {
      physics.forEach((p) => p.update());
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  });
});
