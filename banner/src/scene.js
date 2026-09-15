import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1920;
const H = 880;
const LOOP = 20;

const C = {
  bg: 0xf5f4fb,
  ink: 0x1e2233,
  violet: 0x6366f1,
  violetDark: 0x4338ca,
  teal: 0x2dd4bf,
  tealDeep: 0x257072,
  coral: 0xfb7185,
  amber: 0xf5a623,
  gold: 0xe89800,
};

let renderer, scene, camera;
const movers = [];

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function plastic(color, extras = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.26,
    metalness: 0.03,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
    sheen: 0.2,
    sheenColor: new THREE.Color(0xb7bfff),
    envMapIntensity: 0.95,
    ...extras,
  });
}

function glass(color = 0xc5ccff) {
  return new THREE.MeshPhysicalMaterial({
    color,
    transmission: 0.78,
    thickness: 0.7,
    roughness: 0.06,
    metalness: 0.0,
    ior: 1.4,
    transparent: true,
    opacity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.3,
  });
}

function metal(color = 0xb8bfce) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.9,
    roughness: 0.2,
    envMapIntensity: 1.15,
  });
}

function addShadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w, h, d, r = 0.08, mat) {
  return addShadow(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 5, r), mat));
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function badgeTexture({ title, hint, bg, fg = '#ffffff' }) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 320;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  roundedRect(ctx, 0, 0, 1024, 320, 90);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundedRect(ctx, 48, 80, 160, 160, 44);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = '800 108px Sora, Inter, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 240, hint ? 130 : 160);
  if (hint) {
    ctx.font = '600 42px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText(hint, 244, 215);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function siteTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 680;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1024, 680);
  ctx.fillStyle = '#4338CA';
  ctx.fillRect(0, 0, 1024, 86);
  const dots = ['#FB7185', '#F5A623', '#2DD4BF'];
  dots.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(42 + i * 32, 43, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#fff';
  ctx.font = '700 36px Sora, sans-serif';
  ctx.fillText('elancier', 150, 54);
  ctx.fillStyle = '#EEF0FF';
  roundedRect(ctx, 48, 120, 560, 220, 28);
  ctx.fill();
  ctx.fillStyle = '#6366F1';
  roundedRect(ctx, 80, 150, 280, 28, 10);
  ctx.fill();
  ctx.fillStyle = '#E7E7F3';
  roundedRect(ctx, 80, 200, 430, 16, 8);
  ctx.fill();
  roundedRect(ctx, 80, 232, 360, 16, 8);
  ctx.fill();
  ctx.fillStyle = '#6366F1';
  roundedRect(ctx, 80, 274, 140, 36, 12);
  ctx.fill();
  ctx.fillStyle = '#D8FBF5';
  roundedRect(ctx, 640, 120, 150, 220, 28);
  ctx.fill();
  ctx.fillStyle = '#FFE7EA';
  roundedRect(ctx, 812, 120, 164, 220, 28);
  ctx.fill();
  ctx.fillStyle = '#F5F4FB';
  roundedRect(ctx, 48, 370, 928, 260, 28);
  ctx.fill();
  const bars = ['#6366F1', '#2DD4BF', '#FB7185', '#F5A623', '#4338CA', '#7C6FF0', '#257072'];
  bars.forEach((col, i) => {
    ctx.fillStyle = col;
    const h = 70 + ((i * 47) % 120);
    ctx.fillRect(90 + i * 122, 580 - h, 86, h);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function appTexture() {
  const c = document.createElement('canvas');
  c.width = 420;
  c.height = 840;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 840);
  g.addColorStop(0, '#4338CA');
  g.addColorStop(0.5, '#6366F1');
  g.addColorStop(1, '#257072');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 420, 840);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  roundedRect(ctx, 32, 80, 356, 140, 28);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 44px Sora, sans-serif';
  ctx.fillText('Grow', 56, 145);
  ctx.font = '600 26px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.fillText('your digital product', 56, 186);
  const tiles = ['#ffffff', '#FB7185', '#F5A623', '#2DD4BF'];
  tiles.forEach((col, i) => {
    ctx.fillStyle = col;
    const x = 32 + (i % 2) * 180;
    const y = 260 + Math.floor(i / 2) * 180;
    roundedRect(ctx, x, y, 164, 160, 32);
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

class RingCurve extends THREE.Curve {
  constructor(rx, rz, y0, amp) {
    super();
    this.rx = rx;
    this.rz = rz;
    this.y0 = y0;
    this.amp = amp;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2;
    return target.set(
      this.rx * Math.cos(a),
      this.y0 + this.amp * Math.sin(a * 2.0),
      this.rz * Math.sin(a)
    );
  }
}

function makeLetterE() {
  const g = new THREE.Group();
  const body = plastic(0xf6f7ff);

  const stem = box(0.78, 0.74, 3.05, 0.12, body);
  stem.position.set(-0.86, 0.37, 0);
  const top = box(2.15, 0.74, 0.72, 0.12, body);
  top.position.set(0.32, 0.37, -1.16);
  const mid = box(1.58, 0.74, 0.64, 0.12, body);
  mid.position.set(0.04, 0.37, 0);
  const bot = box(2.15, 0.74, 0.72, 0.12, body);
  bot.position.set(0.32, 0.37, 1.16);
  g.add(stem, top, mid, bot);

  const gold = box(0.62, 0.2, 0.2, 0.05, plastic(C.gold, { metalness: 0.42, roughness: 0.16 }));
  gold.position.set(1.12, 0.84, -1.16);
  g.add(gold);
  g.rotation.y = 0.32;
  return g;
}

function makeBrowser() {
  const g = new THREE.Group();
  const body = box(2.55, 1.72, 0.1, 0.1, plastic(0xffffff));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.38, 1.54),
    new THREE.MeshPhysicalMaterial({
      map: siteTexture(),
      roughness: 0.2,
      metalness: 0.02,
      clearcoat: 0.35,
    })
  );
  screen.position.z = 0.06;
  g.add(body, screen);
  return g;
}

function makePhone() {
  const g = new THREE.Group();
  const body = box(0.72, 1.42, 0.11, 0.1, plastic(0x1e2233));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 1.26),
    new THREE.MeshPhysicalMaterial({
      map: appTexture(),
      roughness: 0.16,
      clearcoat: 0.45,
    })
  );
  screen.position.z = 0.06;
  g.add(body, screen);
  return g;
}

function archAt(curve, u, mat) {
  const p = curve.getPoint(u);
  const p2 = curve.getPoint((u + 0.012) % 1);
  const dir = p2.clone().sub(p).normalize();
  const arch = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 12, 28, Math.PI), mat));
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  arch.quaternion.copy(quat);
  arch.rotateX(Math.PI / 2);
  arch.position.copy(p);
  arch.position.add(up.clone().multiplyScalar(0.02));
  return arch;
}

async function init() {
  await document.fonts.ready.catch(() => {});

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.Fog(C.bg, 16, 38);

  const aspect = W / H;
  const frustum = 2.55;
  const pan = -2.45;
  camera = new THREE.OrthographicCamera(
    -frustum * aspect + pan,
    frustum * aspect + pan,
    frustum,
    -frustum,
    0.1,
    80
  );
  camera.position.set(12.2, 9.6, 12.2);
  camera.lookAt(3.55, 0.18, 0.08);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  scene.add(new THREE.HemisphereLight(0xf7f4ff, 0xd5e0e6, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.35);
  key.position.set(9, 16, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 50;
  key.shadow.bias = -0.00012;
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0xb7c4ff, 0.55).translateX(-8).translateY(5).translateZ(-6));
  const rim = new THREE.DirectionalLight(0x2dd4bf, 0.4);
  rim.position.set(3, 4, -10);
  scene.add(rim);
  const warm = new THREE.DirectionalLight(0xffe0a3, 0.22);
  warm.position.set(-4, 8, 6);
  scene.add(warm);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(18, 72),
    new THREE.MeshPhysicalMaterial({ color: C.bg, roughness: 0.92, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const catcher = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 64),
    new THREE.ShadowMaterial({ opacity: 0.22 })
  );
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.012;
  catcher.receiveShadow = true;
  scene.add(catcher);

  const rig = new THREE.Group();
  rig.position.set(3.55, 0, 0.05);
  scene.add(rig);

  const podium = addShadow(new THREE.Mesh(
    new THREE.CylinderGeometry(3.85, 3.85, 0.07, 80),
    plastic(0xffffff, { roughness: 0.38 })
  ));
  podium.position.y = 0.035;
  rig.add(podium);
  const podiumRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.85, 0.03, 10, 90),
    plastic(0xe7e7f3)
  );
  podiumRing.rotation.x = Math.PI / 2;
  podiumRing.position.y = 0.075;
  rig.add(podiumRing);

  const letter = makeLetterE();
  letter.position.set(0.05, 0, 0.05);
  rig.add(letter);

  const marbles = [
    { color: C.violet, pos: [0.15, 0.86, -1.16] },
    { color: C.teal, pos: [-0.05, 0.86, 0] },
    { color: C.coral, pos: [0.35, 0.86, 1.16] },
    { color: C.amber, pos: [-0.86, 0.86, -0.55] },
  ];
  marbles.forEach((m, i) => {
    const ball = addShadow(new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 32, 24),
      new THREE.MeshPhysicalMaterial({
        color: m.color,
        roughness: 0.1,
        metalness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      })
    ));
    ball.position.set(...m.pos);
    letter.add(ball);
    movers.push((t) => {
      const a = t * 0.85 + i * 1.4;
      ball.position.y = m.pos[1] + Math.abs(Math.sin(a)) * 0.05;
      if (i === 0) ball.position.z = m.pos[2] + Math.sin(a * 0.5) * 0.35;
      if (i === 2) ball.position.x = m.pos[0] + Math.sin(a * 0.45) * 0.28;
    });
  });

  const curve = new RingCurve(3.05, 2.28, 0.92, 0.42);
  const tube = addShadow(new THREE.Mesh(
    new THREE.TubeGeometry(curve, 260, 0.115, 22, true),
    glass(0xc9d0ff)
  ));
  rig.add(tube);
  [0.08, 0.28, 0.55, 0.78].forEach((u) => rig.add(archAt(curve, u, plastic(0xf4f6ff))));

  const travelers = [C.violet, C.teal, C.coral, 0xe8ebf4, C.gold];
  travelers.forEach((col, i) => {
    const isChrome = i === 3;
    const ball = addShadow(new THREE.Mesh(
      new THREE.SphereGeometry(isChrome ? 0.095 : 0.125, 24, 18),
      isChrome
        ? metal(0xd5dae6)
        : new THREE.MeshPhysicalMaterial({
            color: col,
            roughness: 0.12,
            metalness: 0.16,
            clearcoat: 1,
          })
    ));
    rig.add(ball);
    movers.push((t) => {
      const u = (t * 0.09 + i / travelers.length) % 1;
      ball.position.copy(curve.getPoint(u));
    });
  });

  const machine = box(0.62, 0.5, 0.62, 0.07, metal(0x98a2b8));
  const gp = curve.getPoint(0.0);
  machine.position.set(gp.x + 0.2, 0.32, gp.z + 0.22);
  const face = box(0.4, 0.24, 0.05, 0.03, glass(0x9eb8ff));
  face.position.set(0, 0.04, 0.32);
  machine.add(face);
  rig.add(machine);

  // blank service slabs — badges land on them
  const slabDefs = [
    { x: -2.85, z: 1.55, yrot: 0.52 },
    { x: -2.35, z: 2.22, yrot: 0.52 },
    { x: -1.55, z: 2.72, yrot: 0.52 },
  ];
  const slabs = slabDefs.map((s) => {
    const m = box(1.72, 0.16, 0.62, 0.12, plastic(0xffffff));
    m.position.set(s.x, 0.14, s.z);
    m.rotation.y = s.yrot;
    rig.add(m);
    const ring = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 10, 24), plastic(0xffffff)));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(s.x + 1.05, 0.12, s.z - 0.15);
    rig.add(ring);
    return m;
  });

  const badges = [
    { title: 'Website', hint: 'commerce · CMS', bg: '#6366F1', parent: 0, t0: 3.2 },
    { title: 'iOS + Android', hint: 'native apps', bg: '#257072', parent: 1, t0: 8.0 },
    { title: 'Creative', hint: 'brand + UI', bg: '#FB7185', parent: 2, t0: 13.0 },
  ];
  badges.forEach((b, i) => {
    const tile = new THREE.Group();
    const body = box(1.78, 0.14, 0.66, 0.12, plastic(new THREE.Color(b.bg).getHex()));
    const lid = new THREE.Mesh(
      new THREE.PlaneGeometry(1.68, 0.56),
      new THREE.MeshPhysicalMaterial({ map: badgeTexture(b), roughness: 0.24 })
    );
    lid.rotation.x = -Math.PI / 2;
    lid.position.y = 0.09;
    tile.add(body, lid);
    const host = slabDefs[b.parent];
    tile.rotation.y = host.yrot;
    rig.add(tile);
    movers.push((t) => {
      const local = (t - b.t0 + LOOP) % LOOP;
      let k = 0;
      if (local < 0.5) k = easeInOut(local / 0.5);
      else if (local < 3.5) k = 1;
      else if (local < 4.3) k = 1 - easeInOut((local - 3.5) / 0.8);
      tile.visible = k > 0.03;
      tile.position.set(host.x, 0.28 + k * 0.42, host.z);
      tile.scale.setScalar(0.92 + 0.08 * k);
      slabs[i].position.y = 0.14 + k * 0.06;
    });
  });

  const phone = makePhone();
  phone.position.set(2.05, 0.85, 1.72);
  phone.rotation.set(-0.18, -0.62, 0.08);
  rig.add(phone);
  movers.push((t) => {
    phone.position.y = 0.85 + Math.sin(t * 0.8) * 0.07;
    phone.rotation.z = 0.08 + Math.sin(t * 0.45) * 0.05;
  });

  const browser = makeBrowser();
  browser.position.set(1.92, 1.02, -1.42);
  browser.rotation.set(-0.22, -0.55, 0.06);
  browser.scale.setScalar(0.92);
  rig.add(browser);
  movers.push((t) => {
    browser.position.y = 1.05 + Math.sin(t * 0.65 + 0.8) * 0.06;
  });

  const chips = [
    { color: C.violet, p: [1.85, 1.55, 0.15] },
    { color: C.tealDeep, p: [-1.35, 1.28, -1.55] },
    { color: C.coral, p: [0.15, 1.72, 1.85] },
    { color: C.amber, p: [-1.95, 1.05, 0.45] },
  ];
  chips.forEach((ch, i) => {
    const m = box(0.46, 0.46, 0.12, 0.08, plastic(ch.color));
    const gem = addShadow(new THREE.Mesh(
      i % 2 ? new THREE.SphereGeometry(0.11, 20, 16) : new THREE.OctahedronGeometry(0.13, 0),
      plastic(0xffffff)
    ));
    gem.position.y = 0.32;
    m.add(gem);
    m.position.set(...ch.p);
    rig.add(m);
    movers.push((t) => {
      const u = t * 0.7 + i * 1.1;
      m.position.y = ch.p[1] + Math.sin(u) * 0.14;
      m.rotation.y = t * 0.4 + i;
      m.rotation.z = Math.sin(u * 0.6) * 0.12;
    });
  });

  for (let i = 0; i < 4; i++) {
    const ring = addShadow(new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.04, 10, 24),
      plastic(0xffffff)
    ));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-2.15 + i * 0.42, 0.1, 0.72 + (i % 2) * 0.18);
    rig.add(ring);
  }

  const server = box(0.62, 0.42, 0.48, 0.06, plastic(0xf7f8ff));
  server.position.set(1.12, 0.28, 2.15);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.02), new THREE.MeshBasicMaterial({ color: C.teal }));
  led.position.set(-0.16, 0.1, 0.25);
  server.add(led);
  rig.add(server);

  const stack = [
    { title: 'React', bg: '#6366F1', t0: 1.0, p: [1.15, 1.22, -0.15] },
    { title: 'Flutter', bg: '#257072', t0: 6.2, p: [1.35, 1.35, 0.35] },
    { title: 'Node.js', bg: '#1E2233', t0: 11.0, p: [0.85, 1.42, 0.55] },
    { title: 'WordPress', bg: '#4338CA', t0: 15.6, p: [1.55, 1.18, -0.45] },
  ];
  stack.forEach((lb, i) => {
    const tile = new THREE.Group();
    const body = box(1.32, 0.14, 0.46, 0.1, plastic(new THREE.Color(lb.bg).getHex()));
    const lid = new THREE.Mesh(
      new THREE.PlaneGeometry(1.22, 0.38),
      new THREE.MeshPhysicalMaterial({ map: badgeTexture({ title: lb.title, bg: lb.bg }), roughness: 0.24 })
    );
    lid.rotation.x = -Math.PI / 2;
    lid.position.y = 0.085;
    tile.add(body, lid);
    tile.rotation.y = 0.45;
    rig.add(tile);
    movers.push((t) => {
      const local = (t - lb.t0 + LOOP) % LOOP;
      let k = 0;
      if (local < 0.4) k = easeInOut(local / 0.4);
      else if (local < 3.1) k = 1;
      else if (local < 3.9) k = 1 - easeInOut((local - 3.1) / 0.8);
      tile.visible = k > 0.03;
      tile.position.set(lb.p[0], lb.p[1] + k * 0.35, lb.p[2]);
      tile.scale.setScalar(0.86 + 0.14 * k);
    });
  });

  const camBase = camera.position.clone();
  const look = new THREE.Vector3(3.55, 0.18, 0.08);
  movers.push((t) => {
    const s = Math.sin((t / LOOP) * Math.PI * 2);
    const c = Math.cos((t / LOOP) * Math.PI * 2);
    camera.position.set(camBase.x + s * 0.22, camBase.y + c * 0.1, camBase.z + c * 0.18);
    camera.lookAt(look.x + s * 0.04, look.y, look.z);
  });

  window.__duration = LOOP;
  window.__ready = true;
  window.__setTime = (t) => {
    const time = ((t % LOOP) + LOOP) % LOOP;
    movers.forEach((fn) => fn(time));
    renderer.render(scene, camera);
  };
  window.__setTime(0);

  if (!window.__CAPTURE) {
    const t0 = performance.now();
    const tick = () => {
      window.__setTime((performance.now() - t0) / 1000);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

init();
