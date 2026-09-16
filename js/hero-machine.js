/**
 * Elancier hero machine — isometric marble-run inspired by the Trioangle
 * studio loop, rebuilt in Elancier violet / coral / teal / amber.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("heroMachine");
  var stage = document.querySelector(".hero-machine");
  if (!canvas || typeof THREE === "undefined") {
    if (stage) stage.classList.add("is-fallback");
    return;
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COLORS = {
    violet: 0x6366f1,
    violetDark: 0x4338ca,
    coral: 0xfb7185,
    teal: 0x2dd4bf,
    amber: 0xf5a623,
    ink: 0x1e2233,
    white: 0xf7f6fd,
    plastic: 0xf3f4fb,
    chrome: 0xdde3ee,
    hopper: 0x3a3f55,
  };

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0xf4f3fb, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !isMobile();
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf4f3fb, 9, 18);

  var camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
  camera.position.set(-4.6, 4.85, 6.15);
  var look = new THREE.Vector3(0.35, 0.28, 0.1);
  camera.lookAt(look);

  var clock = new THREE.Clock();
  var running = !reduced;
  var raf = 0;

  setupLights();
  var world = new THREE.Group();
  scene.add(world);

  var plastic = makePlastic(COLORS.plastic);
  var plasticSoft = makePlastic(0xeef0f8);
  var glass = makeGlass();
  var chrome = makeChrome();
  var darkMetal = new THREE.MeshStandardMaterial({
    color: COLORS.hopper,
    metalness: 0.72,
    roughness: 0.32,
  });

  addGround();
  var loop = addLoop();
  var maze = addMaze();
  var pills = addPills();
  var hopper = addHopper();
  var gizmos = addGizmos();
  var marbles = addMarbles();
  var cubes = addCubes();

  resize();
  window.addEventListener("resize", resize, { passive: true });
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(stage);
  }

  var io = new IntersectionObserver(
    function (entries) {
      running = !reduced && entries[0].isIntersecting;
      if (running && !raf) tick();
    },
    { threshold: 0.12 }
  );
  io.observe(stage);

  if (reduced) {
    renderer.render(scene, camera);
  } else {
    tick();
  }

  function isMobile() {
    return window.matchMedia("(max-width: 700px)").matches;
  }

  function setupLights() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var hemi = new THREE.HemisphereLight(0xffffff, 0xd8d6f0, 0.85);
    scene.add(hemi);

    var key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(5.5, 9.5, 4.5);
    key.castShadow = renderer.shadowMap.enabled;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.0004;
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xc4c8ff, 0.45);
    fill.position.set(-6, 4, -2);
    scene.add(fill);

    var rim = new THREE.DirectionalLight(0xffe7ea, 0.28);
    rim.position.set(0, 3, -6);
    scene.add(rim);
  }

  function makePlastic(color) {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.28,
      metalness: 0.04,
      clearcoat: 0.65,
      clearcoatRoughness: 0.22,
      sheen: 0.2,
      sheenColor: new THREE.Color(0xffffff),
    });
  }

  function makeGlass() {
    return new THREE.MeshPhysicalMaterial({
      color: 0xe8eef8,
      roughness: 0.12,
      metalness: 0.0,
      transmission: 0.72,
      thickness: 0.55,
      ior: 1.42,
      transparent: true,
      opacity: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
  }

  function makeChrome() {
    return new THREE.MeshStandardMaterial({
      color: 0xe8edf5,
      metalness: 0.95,
      roughness: 0.18,
    });
  }

  function makeMarble(color, emissive) {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.18,
      metalness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      emissive: emissive || color,
      emissiveIntensity: 0.12,
    });
  }

  function addGround() {
    var geo = new THREE.CircleGeometry(9, 64);
    var mat = new THREE.MeshPhysicalMaterial({
      color: 0xf6f5fc,
      roughness: 0.62,
      metalness: 0,
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0;
    mesh.receiveShadow = true;
    world.add(mesh);
  }

  function ellipsePoints(rx, rz, yBase, yAmp, count) {
    var pts = [];
    for (var i = 0; i <= count; i++) {
      var a = (i / count) * Math.PI * 2 - Math.PI * 0.18;
      var y = yBase + Math.sin(a * 1.05) * yAmp;
      pts.push(new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz));
    }
    return pts;
  }

  function addLoop() {
    var pts = ellipsePoints(2.55, 1.72, 0.42, 0.22, 160);
    var curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.15);
    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 220, 0.105, 14, true),
      glass
    );
    tube.castShadow = true;
    world.add(tube);

    var inner = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 180, 0.042, 10, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.08,
        metalness: 0.05,
        transparent: true,
        opacity: 0.35,
      })
    );
    world.add(inner);

    addArch(-0.15, -1.55, 0.55);
    addArch(1.95, 0.15, 0.62);
    addArch(-1.7, 0.85, 0.58);

    return { curve: curve };
  }

  function addArch(x, z, h) {
    var shape = new THREE.Shape();
    shape.moveTo(-0.16, 0);
    shape.absarc(0, h, 0.16, Math.PI, 0, true);
    shape.lineTo(0.1, 0);
    shape.lineTo(0.1, 0.08);
    shape.absarc(0, h, 0.08, 0, Math.PI, false);
    shape.lineTo(-0.1, 0);
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    geo.center();
    var mesh = new THREE.Mesh(geo, plastic);
    mesh.position.set(x, h * 0.52, z);
    mesh.rotation.y = Math.PI / 2.4;
    mesh.castShadow = true;
    world.add(mesh);
  }

  function addMaze() {
    var group = new THREE.Group();
    group.position.set(0.05, 0, -0.12);
    group.rotation.y = -0.42;
    world.add(group);

    var h = 0.46;
    var t = 0.16;
    var walls = [
      [0, 0.9, 1.85, t],
      [0, -0.9, 1.85, t],
      [-0.92, 0, t, 1.96],
      [0.92, 0.22, t, 1.52],
      [-0.18, 0.28, 1.12, t],
      [0.18, -0.28, 1.12, t],
      [0.42, 0.62, t, 0.55],
      [-0.38, -0.55, t, 0.62],
    ];
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(w[2], h, w[3]), plastic);
      mesh.position.set(w[0], h / 2, w[1]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    var floor = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.08, 1.96),
      plasticSoft
    );
    floor.position.y = 0.04;
    floor.receiveShadow = true;
    group.add(floor);

    return group;
  }

  function pillTexture(label, icon, active) {
    var c = document.createElement("canvas");
    c.width = 512;
    c.height = 176;
    var ctx = c.getContext("2d");
    var r = 80;
    ctx.fillStyle = active ? "#6366F1" : "#EEF1FB";
    roundRect(ctx, 8, 8, 496, 160, r);
    ctx.fill();
    ctx.fillStyle = active ? "#ffffff" : "#1E2233";
    ctx.font = "700 54px Sora, Inter, sans-serif";
    ctx.textBaseline = "middle";
    var textX = icon ? 150 : 56;
    ctx.fillText(label, textX, 92);
    if (icon === "web") {
      ctx.beginPath();
      ctx.arc(78, 92, 28, 0, Math.PI * 2);
      ctx.strokeStyle = active ? "#ffffff" : "#6366F1";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(78, 92, 12, 28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(50, 92);
      ctx.lineTo(106, 92);
      ctx.stroke();
    } else if (icon === "play") {
      ctx.beginPath();
      ctx.moveTo(58, 70);
      ctx.lineTo(102, 92);
      ctx.lineTo(58, 114);
      ctx.closePath();
      ctx.fill();
    } else if (icon === "apple") {
      ctx.font = "700 46px Sora, Inter, sans-serif";
      ctx.fillText("", 52, 96);
      ctx.beginPath();
      ctx.arc(78, 98, 18, Math.PI * 0.15, Math.PI * 1.85);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(90, 72, 8, 12, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = active ? "#6366F1" : "#EEF1FB";
      ctx.fill();
      ctx.fillStyle = active ? "#ffffff" : "#1E2233";
      ctx.beginPath();
      ctx.ellipse(86, 70, 7, 10, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function makePill(label, icon, pos) {
    var off = pillTexture(label, icon, false);
    var on = pillTexture(label, icon, true);
    var geo = new THREE.CapsuleGeometry(0.22, 1.18, 8, 20);
    geo.rotateZ(Math.PI / 2);
    var mat = new THREE.MeshPhysicalMaterial({
      map: off,
      roughness: 0.22,
      metalness: 0.04,
      clearcoat: 0.7,
      color: 0xffffff,
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.rotation.y = -0.55;
    mesh.rotation.x = 0.08;
    mesh.castShadow = true;
    world.add(mesh);
    return { mesh: mesh, mat: mat, off: off, on: on, active: false };
  }

  function addPills() {
    return [
      makePill("Website", "web", new THREE.Vector3(-1.55, 0.22, 1.55)),
      makePill("Google Play", "play", new THREE.Vector3(-0.95, 0.22, 2.05)),
      makePill("App Store", "apple", new THREE.Vector3(-2.05, 0.22, 2.05)),
    ];
  }

  function setPill(p, on) {
    if (p.active === on) return;
    p.active = on;
    p.mat.map = on ? p.on : p.off;
    p.mat.emissive = new THREE.Color(on ? 0x312e81 : 0x000000);
    p.mat.emissiveIntensity = on ? 0.18 : 0;
    p.mat.needsUpdate = true;
    p.mesh.scale.setScalar(on ? 1.06 : 1);
  }

  function addHopper() {
    var g = new THREE.Group();
    g.position.set(2.35, 0.34, 0.55);
    g.rotation.y = -0.55;
    var box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.48), darkMetal);
    box.castShadow = true;
    g.add(box);
    var lip = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.52), chrome);
    lip.position.y = 0.2;
    g.add(lip);
    var chute = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.08, 0.42),
      darkMetal
    );
    chute.position.set(-0.28, -0.12, 0.02);
    chute.rotation.z = 0.35;
    g.add(chute);
    world.add(g);
    return g;
  }

  function addGizmos() {
    var rings = [];
    var spots = [
      [-0.35, 1.15],
      [0.55, 1.45],
      [1.15, 1.05],
      [-1.05, 0.85],
    ];
    for (var i = 0; i < spots.length; i++) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.045, 12, 28),
        plastic
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(spots[i][0], 0.05, spots[i][1]);
      ring.castShadow = true;
      world.add(ring);
      var peg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12),
        plasticSoft
      );
      peg.position.set(spots[i][0] + 0.55, 0.11, spots[i][1] - 0.15);
      world.add(peg);
      rings.push(ring);
    }

    var stand = new THREE.Group();
    stand.position.set(1.35, 0, 0.15);
    var pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.42, 0.18),
      new THREE.MeshPhysicalMaterial({
        color: 0xf0f2fa,
        roughness: 0.16,
        metalness: 0.08,
        transmission: 0.35,
        transparent: true,
        opacity: 0.85,
      })
    );
    pillar.position.y = 0.21;
    pillar.castShadow = true;
    stand.add(pillar);
    var seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.22), glass);
    seat.position.y = 0.44;
    stand.add(seat);
    world.add(stand);

    var tee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.28, 12),
      plastic
    );
    tee.position.set(-0.9, 0.72, -1.35);
    world.add(tee);

    return { rings: rings, stand: stand, tee: tee };
  }

  function ball(color, r) {
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r || 0.09, 24, 18),
      typeof color === "number" ? makeMarble(color) : color
    );
    mesh.castShadow = true;
    world.add(mesh);
    return mesh;
  }

  function addMarbles() {
    return {
      chrome: ball(chrome, 0.075),
      amber: ball(COLORS.amber, 0.1),
      coral: ball(COLORS.coral, 0.085),
      teal: ball(COLORS.teal, 0.085),
      violet: ball(COLORS.violet, 0.085),
      silver: ball(chrome, 0.055),
    };
  }

  function addCubes() {
    var list = [];
    var geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    var mat = new THREE.MeshPhysicalMaterial({
      color: COLORS.violet,
      roughness: 0.25,
      metalness: 0.08,
      clearcoat: 0.5,
    });
    for (var i = 0; i < 5; i++) {
      var m = new THREE.Mesh(geo, mat.clone());
      m.castShadow = true;
      m.visible = false;
      world.add(m);
      list.push(m);
    }
    return list;
  }

  function mazePoint(t, lane) {
    var u = (t + lane * 0.22) % 1;
    var x = Math.sin(u * Math.PI * 2) * 0.55;
    var z = Math.cos(u * Math.PI * 2 * 0.85) * 0.48;
    if (lane === 1) {
      x = Math.cos(u * Math.PI * 2) * 0.42;
      z = Math.sin(u * Math.PI * 4) * 0.32;
    }
    if (lane === 2) {
      x = Math.sin(u * Math.PI * 4) * 0.38;
      z = Math.cos(u * Math.PI * 2) * 0.5;
    }
    var p = new THREE.Vector3(x, 0.16, z);
    maze.localToWorld(p);
    return p;
  }

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function setCubes(cycleT) {
    var dump = cycleT > 0.38 && cycleT < 0.62;
    for (var i = 0; i < cubes.length; i++) {
      var m = cubes[i];
      if (!dump) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      var local = (cycleT - 0.38) / 0.24 - i * 0.08;
      local = Math.max(0, Math.min(1, local));
      var e = ease(local);
      m.position.set(
        2.15 - e * 1.15,
        0.28 - e * 0.12 + Math.sin(local * 6) * 0.02,
        0.62 + e * 0.55 + i * 0.08
      );
      m.rotation.set(e * 3.2, e * 2.1, e * 1.4);
      m.material.opacity = 1 - Math.max(0, local - 0.75) / 0.25;
      m.material.transparent = true;
      var c = i % 2 === 0 ? COLORS.violet : 0x4f46e5;
      m.material.color.setHex(c);
    }
  }

  function tick() {
    raf = 0;
    if (!running) return;
    var t = clock.getElapsedTime();
    var cycle = 22;
    var cycleT = (t % cycle) / cycle;

    world.rotation.y = Math.sin(t * 0.18) * 0.045;
    world.position.y = Math.sin(t * 0.7) * 0.012;

    camera.position.x = -4.6 + Math.sin(t * 0.12) * 0.12;
    camera.position.y = 4.85 + Math.cos(t * 0.1) * 0.08;
    camera.lookAt(look);

    var loopT = (t * 0.055) % 1;
    var p = loop.curve.getPointAt(loopT);
    marbles.chrome.position.copy(p);
    marbles.chrome.position.y += 0.02;

    var p2 = loop.curve.getPointAt((loopT + 0.62) % 1);
    marbles.silver.position.copy(p2);
    marbles.silver.position.y += 0.015;

    marbles.amber.position.set(-0.9, 0.92 + Math.sin(t * 1.6) * 0.012, -1.35);
    if (cycleT > 0.08 && cycleT < 0.22) {
      var a = ease((cycleT - 0.08) / 0.14);
      var lp = loop.curve.getPointAt(0.12 + a * 0.2);
      marbles.amber.position.lerp(lp, a);
    }

    marbles.coral.position.copy(mazePoint(t * 0.12, 0));
    marbles.teal.position.copy(mazePoint(t * 0.1 + 0.4, 1));
    marbles.violet.position.copy(mazePoint(t * 0.14 + 0.7, 2));

    hopper.rotation.z = cycleT > 0.36 && cycleT < 0.5 ? -0.18 : 0;
    setCubes(cycleT);

    setPill(pills[0], cycleT > 0.68 && cycleT < 0.92);
    setPill(pills[1], cycleT > 0.76 && cycleT < 0.96);
    setPill(pills[2], cycleT > 0.84 || cycleT < 0.04);

    gizmos.rings.forEach(function (r, i) {
      r.rotation.z = t * (0.3 + i * 0.05);
    });

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  function resize() {
    var w = stage.clientWidth || canvas.clientWidth || 640;
    var h = stage.clientHeight || canvas.clientHeight || 440;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  }
})();
