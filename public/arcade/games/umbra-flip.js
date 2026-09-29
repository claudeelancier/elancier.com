(() => {
  const { roundRect, aabb, hexAlpha } = Arcade;

  const LEVELS = [
    {
      spawn: [48, 560],
      portal: [320, 48, 46, 52],
      plats: [[0, 630, 400, 50], [0, 0, 400, 40], [180, 460, 180, 18], [30, 300, 150, 18], [210, 180, 160, 18]],
      spikes: [],
    },
    {
      spawn: [36, 560],
      portal: [300, 70, 46, 52],
      plats: [[0, 630, 90, 50], [0, 0, 400, 36], [0, 480, 250, 18], [160, 320, 240, 18], [0, 180, 220, 18]],
      spikes: [[120, 610, 260, 22]],
    },
    {
      spawn: [40, 200],
      portal: [330, 560, 46, 50],
      plats: [[0, 250, 160, 18], [240, 250, 160, 18], [80, 430, 240, 18], [0, 620, 400, 60], [0, 0, 400, 30]],
      spikes: [[150, 248, 70, 16]],
    },
    {
      spawn: [30, 560],
      portal: [40, 70, 50, 48],
      plats: [[0, 630, 400, 50], [0, 0, 400, 36], [0, 500, 300, 18], [100, 360, 300, 18], [0, 220, 280, 18], [200, 110, 200, 18]],
      spikes: [[300, 498, 40, 16], [60, 358, 40, 16], [250, 218, 50, 16]],
    },
    {
      spawn: [180, 300],
      portal: [176, 48, 48, 46],
      plats: [[150, 360, 100, 16], [40, 480, 120, 16], [240, 480, 120, 16], [40, 200, 120, 16], [240, 200, 120, 16], [0, 640, 400, 40], [0, 0, 400, 28]],
      spikes: [[170, 620, 60, 20]],
    },
  ];

  function overlap(a, b) {
    return aabb(a.x, a.y, a.w, a.h, b[0], b[1], b[2], b[3]);
  }

  Arcade.boot({
    id: 'umbra-flip',
    title: 'Umbra Flip',
    blurb: 'Walk the halls of an inverted mansion and flip gravity to escape.',
    hint: 'Move with the buttons or arrow keys. Tap the world to flip gravity.',
    palette: { bg0: '#0a0a12', bg1: '#16162a', accent: '#c9a6ff', accent2: '#6d7cff' },
    buttons: [
      { id: 'left', label: 'Left', key: ['ArrowLeft', 'KeyA'] },
      { id: 'right', label: 'Right', key: ['ArrowRight', 'KeyD'] },
    ],
    setup(w) {
      const level = LEVELS[0];
      w.s = { level: 0, x: level.spawn[0], y: level.spawn[1], vx: 0, vy: 0, g: 1, w: 26, h: 36 };
      w.setMeta('Hall 1');
    },
    onPointer(w, e) {
      if (e.type !== 'down') return;
      const s = w.s;
      s.g *= -1;
      s.vy = s.g * 140;
      w.tone(420, 0.06, 'sine', 0.03);
      w.flash('#c9a6ff', 0.12);
    },
    update(w, dt) {
      const s = w.s;
      const L = LEVELS[s.level];
      let vx = 0;
      if (w.held.left || w.keys.has('ArrowLeft')) vx -= 175;
      if (w.held.right || w.keys.has('ArrowRight')) vx += 175;
      s.vy += s.g * 1700 * dt;
      s.vy = w.clamp(s.vy, -900, 900);
      const prevX = s.x;
      s.x += vx * dt;
      for (const p of L.plats) {
        if (!overlap(s, p)) continue;
        if (prevX + s.w <= p[0]) s.x = p[0] - s.w;
        else if (prevX >= p[0] + p[2]) s.x = p[0] + p[2];
      }
      const prevY = s.y;
      s.y += s.vy * dt;
      for (const p of L.plats) {
        if (!overlap(s, p)) continue;
        if (prevY + s.h <= p[1]) { s.y = p[1] - s.h; s.vy = 0; }
        else if (prevY >= p[1] + p[3]) { s.y = p[1] + p[3]; s.vy = 0; }
      }
      s.x = w.clamp(s.x, 0, 400 - s.w);
      for (const sp of L.spikes) {
        if (overlap(s, sp)) {
          w.shake(8);
          w.finish('The spikes wake', `You cleared ${s.level} hall${s.level === 1 ? '' : 's'}.`);
          return;
        }
      }
      if (overlap(s, L.portal)) {
        w.burst(L.portal[0] + 20, L.portal[1] + 20, '#c9a6ff', 16, 160);
        w.addScore(100);
        if (s.level + 1 >= LEVELS.length) {
          w.finish('The mansion opens', 'Every hall is behind you.');
          return;
        }
        s.level += 1;
        const next = LEVELS[s.level];
        s.x = next.spawn[0];
        s.y = next.spawn[1];
        s.vx = 0;
        s.vy = 0;
        s.g = 1;
        w.setMeta(`Hall ${s.level + 1}`);
        w.tone(720, 0.08, 'triangle', 0.04);
      }
    },
    draw(w, ctx) {
      const s = w.s;
      const L = LEVELS[s.level];
      ctx.fillStyle = '#12121f';
      ctx.fillRect(0, 0, 400, 680);
      for (const p of L.plats) {
        ctx.fillStyle = '#2a2a44';
        roundRect(ctx, p[0], p[1], p[2], p[3], 6);
        ctx.fill();
        ctx.fillStyle = hexAlpha('#c9a6ff', 0.7);
        ctx.fillRect(p[0], s.g > 0 ? p[1] : p[1] + p[3] - 3, p[2], 3);
      }
      for (const sp of L.spikes) {
        ctx.fillStyle = '#ff6d8a';
        const n = Math.max(1, Math.floor(sp[2] / 16));
        for (let i = 0; i < n; i += 1) {
          const x = sp[0] + (i * sp[2]) / n;
          ctx.beginPath();
          ctx.moveTo(x, sp[1] + sp[3]);
          ctx.lineTo(x + sp[2] / n / 2, sp[1]);
          ctx.lineTo(x + sp[2] / n, sp[1] + sp[3]);
          ctx.fill();
        }
      }
      const portal = L.portal;
      ctx.fillStyle = '#6d7cff';
      roundRect(ctx, portal[0], portal[1], portal[2], portal[3], 12);
      ctx.fill();
      ctx.fillStyle = '#e8e4ff';
      ctx.fillRect(portal[0] + 16, portal[1] + 8, 6, portal[3] - 16);
      ctx.save();
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
      ctx.scale(1, s.g);
      ctx.fillStyle = '#f4f1ff';
      roundRect(ctx, -12, -16, 24, 32, 10);
      ctx.fill();
      ctx.fillStyle = '#1a1230';
      ctx.fillRect(-6, -8, 12, 5);
      ctx.restore();
    },
  });
})();
