(() => {
  const { roundRect, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'spire-hop',
    title: 'Spire Hop',
    blurb: 'Bounce up an endless spire of drifting ledges.',
    hint: 'Drag to steer. Land on ledges to bounce. Broken ledges vanish.',
    palette: { bg0: '#0e141c', bg1: '#1a2838', accent: '#8fd3ff', accent2: '#ffffff' },
    setup(w) {
      const plats = [{ x: 140, y: 560, w: 120, kind: 'solid', vx: 0 }];
      let y = 500;
      for (let i = 0; i < 8; i += 1) {
        y -= 80 + Math.random() * 20;
        plats.push({ x: 30 + Math.random() * 220, y, w: 90, kind: 'solid', vx: 0 });
      }
      w.s = { x: 200, y: 520, vy: 0, plats, height: 0, maxY: 480 };
    },
    update(w, dt) {
      const s = w.s;
      const target = w.pointer.down ? w.pointer.x : s.x + (w.keys.has('ArrowLeft') ? -160 : 0) + (w.keys.has('ArrowRight') ? 160 : 0);
      s.x = w.lerp(s.x, w.clamp(target, 20, 380), 1 - Math.pow(0.001, dt));
      s.vy += 980 * dt;
      const prev = s.y;
      s.y += s.vy * dt;
      for (const p of s.plats) {
        p.x += p.vx * dt;
        if (p.x < 16 || p.x + p.w > 384) p.vx *= -1;
        if (s.vy > 0 && prev + 16 <= p.y && s.y + 16 >= p.y && s.x > p.x && s.x < p.x + p.w) {
          s.y = p.y - 16;
          s.vy = p.kind === 'spring' ? -980 : -720;
          w.tone(p.kind === 'spring' ? 880 : 520, 0.03, 'square', 0.02);
          if (p.kind === 'break') p.dead = true;
        }
      }
      if (s.y < 260) {
        const d = 260 - s.y;
        s.y = 260;
        s.height += d;
        s.plats.forEach((p) => { p.y += d; });
      }
      s.plats = s.plats.filter((p) => !p.dead && p.y < 760);
      const highest = s.plats.reduce((m, p) => Math.min(m, p.y), 680);
      if (highest > 80) {
        const kindRoll = Math.random();
        const kind = kindRoll < 0.15 ? 'break' : kindRoll < 0.28 ? 'spring' : kindRoll < 0.5 ? 'move' : 'solid';
        s.plats.push({ x: 20 + Math.random() * 240, y: highest - 78, w: 84, kind, vx: kind === 'move' ? (Math.random() < 0.5 ? -60 : 60) : 0 });
      }
      w.setScore(Math.floor(s.height / 8));
      if (s.y > 700) w.finish('The spire drops away', 'Land on the ledges and keep climbing.');
    },
    draw(w, ctx) {
      const s = w.s;
      for (const p of s.plats) {
        ctx.fillStyle = p.kind === 'spring' ? '#ffe27a' : p.kind === 'break' ? '#ff8f8f' : '#d7eefe';
        roundRect(ctx, p.x, p.y, p.w, 12, 6);
        ctx.fill();
        if (p.kind === 'move') {
          ctx.fillStyle = hexAlpha('#8fd3ff', 0.8);
          ctx.fillRect(p.x + 8, p.y + 4, p.w - 16, 3);
        }
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#163044';
      ctx.fillRect(s.x - 5, s.y - 3, 10, 3);
    },
  });
})();
