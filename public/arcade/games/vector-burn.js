(() => {
  const { hexAlpha } = Arcade;

  function wrap(p, w, h) {
    p.x = (p.x + w) % w;
    p.y = (p.y + h) % h;
  }

  Arcade.boot({
    id: 'vector-burn',
    title: 'Vector Burn',
    blurb: 'Pilot a vector craft, split drifting mass, and stay off the rocks.',
    hint: 'Use the stick to fly and hold Fire. On a keyboard: arrows and space.',
    palette: { bg0: '#0a0c12', bg1: '#141824', accent: '#9eb6ff', accent2: '#ffffff' },
    joystick: true,
    buttons: [{ id: 'fire', label: 'Fire', key: 'Space' }],
    view: { w: 400, h: 680 },
    setup(w) {
      const rocks = [];
      for (let i = 0; i < 4; i += 1) rocks.push(rock(80 + Math.random() * 240, 80 + Math.random() * 200, 2));
      w.s = { x: 200, y: 480, a: -Math.PI / 2, vx: 0, vy: 0, bullets: [], rocks, lives: 3, cool: 0, inv: 2 };
      w.setMeta('3 hulls');
    },
    update(w, dt) {
      const s = w.s;
      let jx = w.joy.x;
      let jy = w.joy.y;
      if (w.keys.has('ArrowLeft')) jx -= 1;
      if (w.keys.has('ArrowRight')) jx += 1;
      if (w.keys.has('ArrowUp')) jy -= 1;
      if (w.keys.has('ArrowDown')) jy += 1;
      const mag = Math.hypot(jx, jy);
      if (mag > 0.2) {
        s.a = Math.atan2(jy, jx);
        const thrust = Math.min(1, mag);
        s.vx += Math.cos(s.a) * 220 * thrust * dt;
        s.vy += Math.sin(s.a) * 220 * thrust * dt;
      }
      s.vx *= 1 - dt * 0.4;
      s.vy *= 1 - dt * 0.4;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      wrap(s, 400, 680);
      s.cool -= dt;
      s.inv -= dt;
      if ((w.held.fire || w.keys.has('Space')) && s.cool <= 0) {
        s.cool = 0.18;
        s.bullets.push({ x: s.x + Math.cos(s.a) * 16, y: s.y + Math.sin(s.a) * 16, vx: Math.cos(s.a) * 380 + s.vx, vy: Math.sin(s.a) * 380 + s.vy, life: 0.8 });
        w.tone(880, 0.02, 'square', 0.02);
      }
      for (const b of s.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; wrap(b, 400, 680); }
      s.bullets = s.bullets.filter((b) => b.life > 0 && !b.dead);
      for (const r of s.rocks) {
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        wrap(r, 400, 680);
        if (s.inv <= 0 && Math.hypot(r.x - s.x, r.y - s.y) < r.rad + 10) {
          s.lives -= 1;
          s.inv = 1.6;
          w.shake(8);
          w.setMeta(`${Math.max(0, s.lives)} hulls`);
          if (s.lives <= 0) {
            w.finish('Hull breach', 'Thrust around the rocks, then split them.');
            return;
          }
        }
        for (const b of s.bullets) {
          if (b.dead) continue;
          if (Math.hypot(b.x - r.x, b.y - r.y) < r.rad) {
            b.dead = true;
            r.dead = true;
            w.addScore(20 * (3 - r.rank));
            w.burst(r.x, r.y, '#9eb6ff', 8, 120);
            if (r.rank > 0) {
              s.rocks.push(rock(r.x, r.y, r.rank - 1), rock(r.x, r.y, r.rank - 1));
            }
          }
        }
      }
      s.rocks = s.rocks.filter((r) => !r.dead);
      if (!s.rocks.length) {
        for (let i = 0; i < 5; i += 1) s.rocks.push(rock(Math.random() * 400, 40 + Math.random() * 120, 2));
        w.addScore(100);
      }
    },
    draw(w, ctx) {
      const s = w.s;
      ctx.strokeStyle = hexAlpha('#9eb6ff', 0.7);
      ctx.lineWidth = 2;
      for (const r of s.rocks) {
        ctx.beginPath();
        for (let i = 0; i < 7; i += 1) {
          const a = r.rot + (i / 7) * Math.PI * 2;
          const rad = r.rad * (0.75 + (i % 2) * 0.25);
          const x = r.x + Math.cos(a) * rad;
          const y = r.y + Math.sin(a) * rad;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      for (const b of s.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (s.inv > 0 && Math.floor(s.inv * 12) % 2 === 0) return;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-12, 8);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-12, -8);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    },
  });

  function rock(x, y, rank) {
    const a = Math.random() * Math.PI * 2;
    const sp = 20 + Math.random() * 40;
    return { x, y, rank, rad: [14, 22, 34][rank], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6 };
  }
})();
