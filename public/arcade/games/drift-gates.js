(() => {
  const { roundRect, glow, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'drift-gates',
    title: 'Drift Gates',
    blurb: 'Carve a midnight circuit and thread every glowing gate.',
    hint: 'Drag to steer. Stay between the posts.',
    palette: { bg0: '#0a1014', bg1: '#14242c', accent: '#3dffe0', accent2: '#ff5a36' },
    setup(w) {
      w.s = { x: 200, vx: 0, speed: 280, dist: 0, gates: [{ y: 200, gap: 200, w: 150 }], spawn: 180, tilt: 0, skid: [] };
    },
    update(w, dt) {
      const s = w.s;
      const target = w.pointer.down ? w.clamp(w.pointer.x, 40, 360) : s.x + ((w.keys.has('ArrowLeft') || w.keys.has('KeyA')) ? -140 : 0) + ((w.keys.has('ArrowRight') || w.keys.has('KeyD')) ? 140 : 0);
      const prev = s.x;
      s.x = w.lerp(s.x, w.clamp(target, 36, 364), 1 - Math.pow(0.0015, dt));
      s.vx = (s.x - prev) / Math.max(dt, 0.001);
      s.tilt = w.clamp(s.vx / 400, -1, 1);
      s.speed = 280 + Math.min(360, s.dist * 0.04);
      s.dist += s.speed * dt;
      if (Math.abs(s.tilt) > 0.35) s.skid.push({ x: s.x, y: 560, a: 0.5 });
      s.skid = s.skid.filter((p) => { p.y += s.speed * dt; p.a -= dt; return p.a > 0 && p.y < 700; });
      for (const g of s.gates) g.y += s.speed * dt;
      s.spawn -= s.speed * dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(150, 230 - s.dist * 0.01);
        const width = Math.max(78, 160 - s.dist * 0.01);
        s.gates.push({ y: -40, gap: 50 + Math.random() * (300 - width), w: width });
      }
      s.gates = s.gates.filter((g) => g.y < 760);
      for (const g of s.gates) {
        if (g.scored || g.y < 540) continue;
        const left = g.gap;
        const right = g.gap + g.w;
        if (s.x < left + 16 || s.x > right - 16) {
          w.shake(10);
          w.burst(s.x, 560, '#ff5a36', 16, 200);
          w.finish('The post catches the door', 'Thread the glowing gap.');
          return;
        }
        g.scored = true;
        const drift = Math.abs(s.tilt) > 0.45 ? 20 : 0;
        w.addScore(25 + drift);
        if (drift) w.floatText(s.x, 520, 'Drift', '#3dffe0');
        w.tone(700, 0.04, 'square', 0.025);
      }
      if (s.x < 30 || s.x > 370) {
        w.finish('The barrier ends the run', 'Stay inside the circuit.');
      }
      w.setScore(w.score);
    },
    draw(w, ctx) {
      const s = w.s;
      ctx.fillStyle = '#102028';
      for (let i = 0; i < 7; i += 1) {
        const y = (i * 110 + s.dist * 0.6) % 770 - 40;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(188, y, 24, 46);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = hexAlpha('#3dffe0', 0.25);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(18, 680);
      ctx.moveTo(382, 0);
      ctx.lineTo(382, 680);
      ctx.stroke();
      for (const p of s.skid) {
        ctx.globalAlpha = p.a;
        ctx.fillStyle = '#9aa8ad';
        ctx.fillRect(p.x - 16, p.y, 8, 14);
        ctx.fillRect(p.x + 8, p.y, 8, 14);
      }
      ctx.globalAlpha = 1;
      for (const g of s.gates) {
        ctx.fillStyle = g.scored ? hexAlpha('#3dffe0', 0.25) : '#ff5a36';
        roundRect(ctx, 18, g.y, g.gap - 18, 16, 4);
        ctx.fill();
        roundRect(ctx, g.gap + g.w, g.y, 382 - (g.gap + g.w), 16, 4);
        ctx.fill();
        glow(ctx, g.gap + g.w / 2, g.y + 8, 30, hexAlpha('#3dffe0', 0.2));
      }
      ctx.save();
      ctx.translate(s.x, 560);
      ctx.rotate(s.tilt * 0.4);
      ctx.fillStyle = '#e8fffb';
      roundRect(ctx, -16, -26, 32, 48, 10);
      ctx.fill();
      ctx.fillStyle = '#14322c';
      roundRect(ctx, -10, -16, 20, 12, 4);
      ctx.fill();
      ctx.fillStyle = '#ff5a36';
      ctx.fillRect(-14, 16, 8, 6);
      ctx.fillRect(6, 16, 8, 6);
      ctx.restore();
    },
  });
})();
