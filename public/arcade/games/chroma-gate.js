(() => {
  const { roundRect } = Arcade;
  const COLORS = ['#6aa6ff', '#ff5c7a', '#ffe27a'];

  Arcade.boot({
    id: 'chroma-gate',
    title: 'Chroma Gate',
    blurb: 'Cycle your color and phase through a rainfall of matching gates.',
    hint: 'Tap to cycle color. Match the gate or shatter.',
    palette: { bg0: '#0c0c14', bg1: '#181828', accent: '#6aa6ff', accent2: '#ff5c7a' },
    setup(w) {
      w.s = { color: 0, gates: [], spawn: 0, speed: 180, t: 0, y: 540 };
    },
    onPointer(w, e) {
      if (e.type !== 'down') return;
      w.s.color = (w.s.color + 1) % 3;
      w.tone(500 + w.s.color * 80, 0.03, 'square', 0.025);
    },
    onKey(w, e) {
      if (e.type === 'down' && (e.code === 'Space' || e.code === 'ArrowUp')) w.s.color = (w.s.color + 1) % 3;
    },
    update(w, dt) {
      const s = w.s;
      s.t += dt;
      s.speed = 180 + Math.min(260, s.t * 8);
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.55, 1.15 - s.t * 0.015);
        s.gates.push({ y: -30, color: (Math.random() * 3) | 0 });
      }
      for (const g of s.gates) g.y += s.speed * dt;
      s.gates = s.gates.filter((g) => {
        if (g.y < s.y + 10 && g.y + 22 > s.y && !g.passed) {
          g.passed = true;
          if (g.color !== s.color) {
            w.shake(8);
            w.burst(200, s.y, COLORS[s.color], 16, 180);
            w.finish('The gate rejects you', 'Match the color as it arrives.');
            return false;
          }
          w.addScore(15);
          w.tone(760, 0.03, 'sine', 0.02);
        }
        return g.y < 720;
      });
    },
    draw(w, ctx) {
      const s = w.s;
      for (let i = 0; i < 3; i += 1) {
        ctx.globalAlpha = s.color === i ? 1 : 0.35;
        ctx.fillStyle = COLORS[i];
        roundRect(ctx, 40 + i * 110, 70, 90, 16, 8);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const g of s.gates) {
        ctx.fillStyle = COLORS[g.color];
        roundRect(ctx, 36, g.y, 328, 22, 8);
        ctx.fill();
      }
      ctx.fillStyle = COLORS[s.color];
      ctx.beginPath();
      ctx.arc(200, s.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(194, s.y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    },
  });
})();
