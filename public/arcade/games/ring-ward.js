(() => {
  const { glow, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'ring-ward',
    title: 'Ring Ward',
    blurb: 'Man a crimson turret and keep raiders off the core.',
    hint: 'Aim with your finger and hold to fire. The core falls if raiders reach it.',
    palette: { bg0: '#14080c', bg1: '#30141c', accent: '#ff5a4a', accent2: '#ffd0a8' },
    setup(w) {
      w.s = { angle: -Math.PI / 2, cool: 0, bullets: [], foes: [], spawn: 0.6, core: 100, t: 0 };
      w.setMeta('Core 100');
    },
    update(w, dt) {
      const s = w.s;
      const cx = 200;
      const cy = 340;
      s.t += dt;
      if (w.pointer.down) s.angle = Math.atan2(w.pointer.y - cy, w.pointer.x - cx);
      if (w.keys.has('ArrowLeft')) s.angle -= dt * 2.2;
      if (w.keys.has('ArrowRight')) s.angle += dt * 2.2;
      const firing = w.pointer.down || w.keys.has('Space');
      s.cool -= dt;
      if (firing && s.cool <= 0) {
        s.cool = 0.12;
        s.bullets.push({ x: cx + Math.cos(s.angle) * 36, y: cy + Math.sin(s.angle) * 36, vx: Math.cos(s.angle) * 460, vy: Math.sin(s.angle) * 460 });
      }
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.35, 1.15 - s.t * 0.02);
        const a = Math.random() * Math.PI * 2;
        s.foes.push({ x: cx + Math.cos(a) * 250, y: cy + Math.sin(a) * 300, hp: 2 + (s.t > 25 ? 1 : 0), speed: 28 + Math.min(50, s.t) });
      }
      for (const b of s.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
      s.bullets = s.bullets.filter((b) => b.x > -20 && b.x < 420 && b.y > -20 && b.y < 700);
      for (const f of s.foes) {
        const dx = cx - f.x;
        const dy = cy - f.y;
        const d = Math.hypot(dx, dy) || 1;
        f.x += (dx / d) * f.speed * dt;
        f.y += (dy / d) * f.speed * dt;
        if (d < 42) {
          s.core -= 12;
          f.dead = true;
          w.shake(6);
          w.flash('#ff5a4a', 0.2);
        }
        for (const b of s.bullets) {
          if (Math.hypot(b.x - f.x, b.y - f.y) < 16) {
            b.dead = true;
            f.hp -= 1;
            if (f.hp <= 0) {
              f.dead = true;
              w.addScore(20);
              w.burst(f.x, f.y, '#ffd0a8', 8, 120);
            }
          }
        }
      }
      s.foes = s.foes.filter((f) => !f.dead);
      s.bullets = s.bullets.filter((b) => !b.dead);
      w.setMeta(`Core ${Math.max(0, Math.ceil(s.core))}`);
      if (s.core <= 0) w.finish('The core goes dark', 'Keep the ring clear of raiders.');
    },
    draw(w, ctx) {
      const s = w.s;
      const cx = 200;
      const cy = 340;
      glow(ctx, cx, cy, 80, hexAlpha('#ff5a4a', 0.35));
      ctx.strokeStyle = hexAlpha('#ffd0a8', 0.25);
      ctx.beginPath();
      ctx.arc(cx, cy, 210, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd0a8';
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff5a4a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, -Math.PI / 2, -Math.PI / 2 + (Math.max(0, s.core) / 100) * Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s.angle);
      ctx.fillStyle = '#fff';
      roundBarrel(ctx);
      ctx.restore();
      ctx.fillStyle = '#ff5a4a';
      for (const f of s.foes) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff6ea';
      for (const b of s.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  });

  function roundBarrel(ctx) {
    ctx.beginPath();
    ctx.moveTo(18, -6);
    ctx.lineTo(36, -3);
    ctx.lineTo(36, 3);
    ctx.lineTo(18, 6);
    ctx.closePath();
    ctx.fill();
  }
})();
