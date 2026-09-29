(() => {
  const { roundRect, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'ice-curl',
    title: 'Ice Curl',
    blurb: 'Slide a granite stone down the sheet and sweep it into the house.',
    hint: 'Drag to aim and set power. Hold Sweep while the stone travels.',
    palette: { bg0: '#0c141c', bg1: '#183044', accent: '#d5f4ff', accent2: '#8fd0ff' },
    buttons: [{ id: 'sweep', label: 'Sweep', key: 'Space' }],
    setup(w) {
      w.s = { stones: 0, phase: 'aim', x: 200, y: 600, vx: 0, vy: 0, start: null, total: 0 };
      w.setMeta('Stone 1 of 4');
    },
    onPointer(w, e) {
      const s = w.s;
      if (s.phase !== 'aim') return;
      if (e.type === 'down') s.start = { x: e.x, y: e.y };
      if (e.type === 'up' && s.start) {
        const pullX = s.start.x - e.x;
        const pullY = s.start.y - e.y;
        if (pullY < 30) { s.start = null; return; }
        s.vx = w.clamp(pullX * 1.6, -220, 220);
        s.vy = -w.clamp(pullY * 2.4, 280, 760);
        s.phase = 'slide';
        w.tone(480, 0.05, 'sine', 0.03);
      }
    },
    update(w, dt) {
      const s = w.s;
      if (s.phase !== 'slide') return;
      const friction = w.held.sweep ? 90 : 170;
      const sp = Math.hypot(s.vx, s.vy) || 1;
      const drop = Math.min(sp, friction * dt);
      s.vx -= (s.vx / sp) * drop;
      s.vy -= (s.vy / sp) * drop;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < 70) { s.x = 70; s.vx *= -0.4; }
      if (s.x > 330) { s.x = 330; s.vx *= -0.4; }
      if (Math.hypot(s.vx, s.vy) < 12 || s.y < 70) {
        const d = Math.hypot(s.x - 200, s.y - 150);
        const pts = d < 18 ? 50 : d < 36 ? 30 : d < 58 ? 15 : d < 86 ? 5 : 0;
        s.total += pts;
        w.setScore(s.total);
        w.floatText(s.x, s.y - 20, pts ? `+${pts}` : 'Miss', '#fff');
        s.stones += 1;
        if (s.stones >= 4) {
          w.finish('The end is called', `${s.total} points across four stones.`);
          return;
        }
        s.phase = 'aim';
        s.x = 200;
        s.y = 600;
        s.vx = 0;
        s.vy = 0;
        s.start = null;
        w.setMeta(`Stone ${s.stones + 1} of 4`);
      }
    },
    draw(w, ctx) {
      const s = w.s;
      ctx.fillStyle = '#d7eefe';
      roundRect(ctx, 60, 80, 280, 560, 16);
      ctx.fill();
      ctx.strokeStyle = '#2a4a66';
      ctx.lineWidth = 2;
      [86, 58, 36, 18].forEach((r) => {
        ctx.beginPath();
        ctx.arc(200, 150, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.fillStyle = '#163044';
      ctx.beginPath();
      ctx.arc(200, 150, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c23b4a';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexAlpha('#fff', 0.7);
      ctx.beginPath();
      ctx.arc(s.x - 4, s.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      if (s.phase === 'aim' && s.start && w.pointer.down) {
        ctx.strokeStyle = '#163044';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - (s.start.x - w.pointer.x) * 0.6, s.y - (s.start.y - w.pointer.y) * 0.6);
        ctx.stroke();
      }
    },
  });
})();
