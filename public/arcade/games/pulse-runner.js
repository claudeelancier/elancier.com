(() => {
  const { roundRect, glow, hexAlpha, aabb } = Arcade;

  function jump(w) {
    const s = w.s;
    if (!s || s.jumps >= 2) return;
    s.jumps += 1;
    s.vy = s.jumps === 1 ? -660 : -540;
    w.tone(s.jumps === 1 ? 540 : 760, 0.045, 'square', 0.028);
  }

  Arcade.boot({
    id: 'pulse-runner',
    title: 'Pulse Runner',
    blurb: 'Sprint a neon causeway and vault every obstacle in your path.',
    hint: 'Tap to jump. Tap again in the air for a second leap.',
    palette: { bg0: '#070b16', bg1: '#121a33', accent: '#5ee7ff', accent2: '#8b7cff' },
    setup(w) {
      w.s = { y: 560, vy: 0, jumps: 0, ground: 560, speed: 280, dist: 0, obs: [], coins: [], spawn: 0.35, coinIn: 0.6, coinsGot: 0, runT: 0, leg: 0 };
    },
    onPointer(w, e) { if (e.type === 'down') jump(w); },
    onKey(w, e) { if (e.type === 'down' && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowUp')) jump(w); },
    update(w, dt) {
      const s = w.s;
      s.runT += dt;
      s.vy += 2300 * dt;
      s.y += s.vy * dt;
      if (s.y >= s.ground) { s.y = s.ground; s.vy = 0; s.jumps = 0; s.leg += dt * 12; }
      s.speed = 280 + Math.min(460, s.runT * 16);
      s.dist += s.speed * dt;
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.52, 1.2 - s.runT * 0.012);
        const bird = Math.random() < 0.34;
        s.obs.push({ x: 440, w: bird ? 48 : 34 + Math.random() * 30, h: bird ? 26 : 38 + Math.random() * 48, bird });
      }
      s.coinIn -= dt;
      if (s.coinIn <= 0) {
        s.coinIn = 0.48;
        s.coins.push({ x: 450, y: 390 + Math.random() * 140, r: 9 });
      }
      const px = 72;
      const py = s.y - 56;
      for (const o of s.obs) o.x -= s.speed * dt;
      s.obs = s.obs.filter((o) => o.x > -90);
      for (const o of s.obs) {
        const oy = o.bird ? s.ground - 148 : s.ground - o.h;
        if (aabb(px + 8, py + 8, 24, 44, o.x + 4, oy + 2, o.w - 6, o.h - 4)) {
          w.shake(9);
          w.burst(px + 16, py + 20, '#5ee7ff', 18, 240);
          w.finish('The causeway wins', 'Coins and distance are already counted.');
          return;
        }
      }
      s.coins = s.coins.filter((c) => {
        c.x -= s.speed * dt;
        if (Math.hypot(c.x - (px + 16), c.y - (py + 28)) < 26) {
          s.coinsGot += 1;
          w.burst(c.x, c.y, '#ffe7a3', 8, 140);
          w.tone(920, 0.04, 'sine', 0.03);
          return false;
        }
        return c.x > -20;
      });
      w.setScore(Math.floor(s.dist / 16) + s.coinsGot * 25);
    },
    draw(w, ctx) {
      const s = w.s;
      const W = w.view.w;
      const H = w.view.h;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1a2450');
      sky.addColorStop(1, '#070b16');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 28; i += 1) {
        const x = (i * 83 - s.dist * (0.08 + (i % 4) * 0.03)) % (W + 30);
        ctx.globalAlpha = 0.25 + (i % 5) * 0.12;
        ctx.fillStyle = i % 3 ? '#d5e8ff' : '#8b7cff';
        ctx.fillRect(x < 0 ? x + W : x, 24 + (i * 53) % 300, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#121a36';
      for (let i = 0; i < 6; i += 1) {
        const x = ((i * 150 - s.dist * 0.18) % 700) - 120;
        ctx.beginPath();
        ctx.moveTo(x, 500);
        ctx.quadraticCurveTo(x + 80, 400, x + 170, 500);
        ctx.fill();
      }
      ctx.fillStyle = '#10182e';
      ctx.fillRect(0, s.ground, W, H - s.ground);
      ctx.fillStyle = '#5ee7ff';
      ctx.fillRect(0, s.ground, W, 3);
      ctx.globalAlpha = 0.4;
      const scroll = s.dist % 48;
      for (let x = -scroll; x < W; x += 48) ctx.fillRect(x, s.ground + 18, 18, 3);
      ctx.globalAlpha = 1;
      for (const c of s.coins) {
        glow(ctx, c.x, c.y, 18, hexAlpha('#ffe7a3', 0.5));
        ctx.fillStyle = '#ffe7a3';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const o of s.obs) {
        const oy = o.bird ? s.ground - 148 : s.ground - o.h;
        if (o.bird) {
          ctx.fillStyle = '#8b7cff';
          roundRect(ctx, o.x, oy, o.w, o.h, 12);
          ctx.fill();
          ctx.fillStyle = '#e8f6ff';
          ctx.fillRect(o.x + o.w - 12, oy + 8, 8, 4);
        } else {
          const grd = ctx.createLinearGradient(o.x, oy, o.x, oy + o.h);
          grd.addColorStop(0, '#243463');
          grd.addColorStop(1, '#12182c');
          ctx.fillStyle = grd;
          roundRect(ctx, o.x, oy, o.w, o.h, 8);
          ctx.fill();
          ctx.strokeStyle = hexAlpha('#5ee7ff', 0.8);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      const x = 72;
      const y = s.y - 56;
      const air = s.y < s.ground - 1;
      glow(ctx, x + 16, y + 30, 28, hexAlpha('#5ee7ff', 0.28));
      ctx.fillStyle = '#f3fbff';
      roundRect(ctx, x + 8, y + 8, 28, 32, 12);
      ctx.fill();
      ctx.fillStyle = '#071018';
      roundRect(ctx, x + 18, y + 16, 16, 8, 3);
      ctx.fill();
      ctx.fillStyle = '#8b7cff';
      const swing = air ? 8 : Math.sin(s.leg) * 7;
      roundRect(ctx, x + 10, y + 38, 9, 16, 4);
      ctx.fill();
      roundRect(ctx, x + 24, y + 36 + (swing > 0 ? 0 : 4), 9, 16, 4);
      ctx.fill();
    },
  });
})();
