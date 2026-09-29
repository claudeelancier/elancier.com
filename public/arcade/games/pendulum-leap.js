(() => {
  const { hexAlpha } = Arcade;

  Arcade.boot({
    id: 'pendulum-leap',
    title: 'Pendulum Leap',
    blurb: 'Release from each hook inside the bright arc and chain the crossing.',
    hint: 'Tap while the swinger is inside the glowing arc.',
    palette: { bg0: '#0e1014', bg1: '#1c2430', accent: '#d7e2ea', accent2: '#ffcc66' },
    setup(w) {
      w.s = { hooks: [{ x: 90, y: 220 }, { x: 250, y: 200 }], i: 0, time: 0, freq: 2.1, len: 150, leap: 0, fail: 0, cam: 0 };
    },
    onPointer(w, e) {
      if (e.type !== 'down') return;
      const s = w.s;
      if (s.leap > 0 || s.fail > 0) return;
      const theta = Math.sin(s.time * s.freq) * 1.05;
      const forward = Math.cos(s.time * s.freq) > 0;
      if (theta > 0.42 && theta < 0.98 && forward) {
        s.leap = 0.28;
        w.tone(700, 0.05, 'sine', 0.03);
        w.addScore(20);
      } else {
        s.fail = 0.6;
        w.shake(6);
        w.tone(160, 0.1, 'sawtooth', 0.03);
      }
    },
    update(w, dt) {
      const s = w.s;
      s.time += dt;
      if (s.fail > 0) {
        s.fail -= dt;
        if (s.fail <= 0) w.finish('The swing falls short', 'Release inside the gold arc, while moving forward.');
        return;
      }
      if (s.leap > 0) {
        s.leap -= dt;
        if (s.leap <= 0) {
          s.i += 1;
          s.freq = Math.min(3.3, s.freq + 0.05);
          const last = s.hooks[s.hooks.length - 1];
          s.hooks.push({ x: last.x + 150 + Math.random() * 30, y: 170 + Math.random() * 80 });
          s.cam = s.hooks[s.i].x - 120;
        }
      }
    },
    draw(w, ctx) {
      const s = w.s;
      const hook = s.hooks[s.i];
      const next = s.hooks[s.i + 1];
      const theta = Math.sin(s.time * s.freq) * 1.05;
      const forward = Math.cos(s.time * s.freq) > 0;
      const good = theta > 0.42 && theta < 0.98 && forward;
      ctx.strokeStyle = hexAlpha('#d7e2ea', 0.2);
      for (let x = -((s.cam) % 40); x < 400; x += 40) ctx.fillRect(x, 0, 1, 680);
      for (const h of s.hooks) {
        const x = h.x - s.cam;
        if (x < -40 || x > 440) continue;
        ctx.fillStyle = '#d7e2ea';
        ctx.fillRect(x - 8, h.y - 8, 16, 8);
      }
      const hx = hook.x - s.cam;
      ctx.strokeStyle = good ? '#ffcc66' : hexAlpha('#d7e2ea', 0.4);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(hx, hook.y, s.len, 0.4, 1.15);
      ctx.stroke();
      let px = hx + Math.sin(theta) * s.len;
      let py = hook.y + Math.cos(theta) * s.len;
      if (s.leap > 0 && next) {
        const t = 1 - s.leap / 0.28;
        px = px + (next.x - s.cam - px) * t;
        py = py + (next.y + 20 - py) * t;
      }
      if (s.fail > 0) py += (0.6 - s.fail) * 400;
      ctx.strokeStyle = '#d7e2ea';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, hook.y);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c2430';
      ctx.fillRect(px - 5, py - 3, 10, 4);
    },
  });
})();
