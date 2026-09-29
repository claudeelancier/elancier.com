(() => {
  const { glow, hexAlpha } = Arcade;

  function edge(s, w, id) {
    const now = !!w.held[id];
    const prev = !!s['_' + id];
    s['_' + id] = now;
    return now && !prev;
  }

  Arcade.boot({
    id: 'orbit-strike',
    title: 'Orbit Strike',
    blurb: 'Ride three rings around a living planet and clear the lane ahead.',
    hint: 'Switch rings to dodge. Shots fire forward along your ring.',
    palette: { bg0: '#100814', bg1: '#2a1030', accent: '#ff4d8d', accent2: '#ffd166' },
    buttons: [
      { id: 'in', label: 'Inner', key: ['ArrowDown', 'ArrowLeft'] },
      { id: 'out', label: 'Outer', key: ['ArrowUp', 'ArrowRight'] },
    ],
    setup(w) {
      w.s = { lanes: [86, 132, 178], lane: 1, angle: -Math.PI / 2, spin: 0.85, bullets: [], rocks: [], hp: 5, fire: 0, spawn: 0.4, t: 0 };
      w.setMeta('Core 5');
    },
    update(w, dt) {
      const s = w.s;
      const cx = 200;
      const cy = 330;
      s.t += dt;
      s.spin = 0.85 + Math.min(1.1, s.t * 0.03);
      s.angle += s.spin * dt;
      if (edge(s, w, 'in')) s.lane = Math.max(0, s.lane - 1);
      if (edge(s, w, 'out')) s.lane = Math.min(2, s.lane + 1);
      const swipe = w.consumeSwipe();
      if (swipe?.dir === 'up' || swipe?.dir === 'right') s.lane = Math.min(2, s.lane + 1);
      if (swipe?.dir === 'down' || swipe?.dir === 'left') s.lane = Math.max(0, s.lane - 1);
      s.fire -= dt;
      if (s.fire <= 0) {
        s.fire = Math.max(0.16, 0.28 - s.t * 0.002);
        s.bullets.push({ lane: s.lane, angle: s.angle });
        w.tone(480 + s.lane * 60, 0.03, 'square', 0.02);
      }
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.38, 1.15 - s.t * 0.02);
        const lane = (Math.random() * 3) | 0;
        let ang = s.angle + 1.2 + Math.random() * 3.2;
        s.rocks.push({ lane, angle: ang, sink: 2.4 + Math.random() * 2.2 });
      }
      for (const b of s.bullets) b.angle += s.spin * 2.15 * dt;
      s.bullets = s.bullets.filter((b) => s.angle + 6.2 > b.angle);
      for (const r of s.rocks) {
        r.sink -= dt;
        if (r.sink <= 0) {
          r.lane -= 1;
          r.sink = 2.2;
          if (r.lane < 0) {
            s.hp -= 1;
            w.shake(6);
            w.flash('#ff4d8d', 0.25);
            r.dead = true;
          }
        }
      }
      for (const r of s.rocks) {
        if (r.dead) continue;
        if (r.lane === s.lane) {
          let d = Math.abs(((r.angle - s.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          if (d < 0.2) {
            s.hp -= 1;
            r.dead = true;
            w.shake(8);
            w.burst(cx + Math.cos(s.angle) * s.lanes[s.lane], cy + Math.sin(s.angle) * s.lanes[s.lane], '#ffd166', 12, 160);
          }
        }
        for (const b of s.bullets) {
          if (b.lane !== r.lane) continue;
          let d = Math.abs(((r.angle - b.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          if (d < 0.16) {
            r.dead = true;
            b.dead = true;
            const x = cx + Math.cos(r.angle) * s.lanes[r.lane];
            const y = cy + Math.sin(r.angle) * s.lanes[r.lane];
            w.burst(x, y, '#ff4d8d', 10, 150);
            w.addScore(25);
            w.tone(760, 0.04, 'sine', 0.03);
          }
        }
      }
      s.rocks = s.rocks.filter((r) => !r.dead);
      s.bullets = s.bullets.filter((b) => !b.dead);
      w.setMeta(`Core ${Math.max(0, s.hp)} · Ring ${s.lane + 1}`);
      if (s.hp <= 0) w.finish('The planet cracks', 'Clear lanes earlier to keep the core intact.');
    },
    draw(w, ctx) {
      const s = w.s;
      const cx = 200;
      const cy = 330;
      for (let i = 0; i < 30; i += 1) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = i % 2 ? '#ffd166' : '#fff';
        ctx.fillRect((i * 97) % 400, (i * 53) % 680, 2, 2);
      }
      ctx.globalAlpha = 1;
      glow(ctx, cx, cy, 120, hexAlpha('#ff4d8d', 0.35));
      const planet = ctx.createRadialGradient(cx - 16, cy - 20, 8, cx, cy, 54);
      planet.addColorStop(0, '#ffd6e8');
      planet.addColorStop(0.45, '#ff4d8d');
      planet.addColorStop(1, '#6a1848');
      ctx.fillStyle = planet;
      ctx.beginPath();
      ctx.arc(cx, cy, 48, 0, Math.PI * 2);
      ctx.fill();
      s.lanes.forEach((r, i) => {
        ctx.strokeStyle = hexAlpha(i === s.lane ? '#ffd166' : '#ff4d8d', i === s.lane ? 0.9 : 0.28);
        ctx.lineWidth = i === s.lane ? 3 : 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      for (const r of s.rocks) {
        const x = cx + Math.cos(r.angle) * s.lanes[Math.max(0, r.lane)];
        const y = cy + Math.sin(r.angle) * s.lanes[Math.max(0, r.lane)];
        ctx.fillStyle = '#d7c4ff';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of s.bullets) {
        const x = cx + Math.cos(b.angle) * s.lanes[b.lane];
        const y = cy + Math.sin(b.angle) * s.lanes[b.lane];
        ctx.fillStyle = '#fff6d8';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      const sr = s.lanes[s.lane];
      const x = cx + Math.cos(s.angle) * sr;
      const y = cy + Math.sin(s.angle) * sr;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.angle + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, 10);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  });
})();
