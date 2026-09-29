(() => {
  const { roundRect, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'grove-tempo',
    title: 'Grove Tempo',
    blurb: 'Wake four plants by tapping as each firefly kisses the leaf.',
    hint: 'Tap a plant as its firefly reaches the bright leaf.',
    palette: { bg0: '#10160e', bg1: '#1c2c16', accent: '#b6ff6a', accent2: '#ffd56a' },
    setup(w) {
      w.s = {
        plants: [0, 1, 2, 3].map((i) => ({ angle: i * 1.3, hit: false, cool: 0 })),
        speed: 1.3,
        lives: 3,
        t: 0,
      };
    },
    onPointer(w, e) {
      if (e.type !== 'down') return;
      const s = w.s;
      const idx = [70, 150, 230, 310].findIndex((x) => Math.abs(e.x - x) < 40 && e.y > 430);
      if (idx < 0) return;
      const p = s.plants[idx];
      const leaf = -Math.PI / 2;
      const d = Math.atan2(Math.sin(p.angle - leaf), Math.cos(p.angle - leaf));
      if (Math.abs(d) < 0.45 && p.cool <= 0) {
        p.cool = 0.45;
        w.addScore(20);
        w.burst(70 + idx * 80, 500, '#b6ff6a', 8, 90);
        w.tone(640 + idx * 40, 0.04, 'sine', 0.03);
      } else hurt(w);
    },
    update(w, dt) {
      const s = w.s;
      s.t += dt;
      s.speed = 1.3 + Math.min(2.2, s.t * 0.03);
      s.plants.forEach((p) => {
        const prev = p.angle;
        p.angle += s.speed * dt;
        p.cool -= dt;
        let mark = -Math.PI / 2;
        while (mark < prev) mark += Math.PI * 2;
        if (mark <= p.angle && p.cool <= 0) hurt(w);
      });
    },
    draw(w, ctx) {
      const s = w.s;
      ctx.fillStyle = '#24361c';
      ctx.fillRect(0, 520, 400, 160);
      s.plants.forEach((p, i) => {
        const x = 70 + i * 80;
        ctx.strokeStyle = '#6ea04a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, 560);
        ctx.quadraticCurveTo(x + 10, 500, x, 460);
        ctx.stroke();
        ctx.fillStyle = '#3f6b32';
        ctx.beginPath();
        ctx.ellipse(x, 472, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hexAlpha('#ffd56a', 0.7);
        ctx.beginPath();
        ctx.arc(x, 500, 28, 0, Math.PI * 2);
        ctx.stroke();
        const fx = x + Math.cos(p.angle) * 28;
        const fy = 500 + Math.sin(p.angle) * 28;
        ctx.fillStyle = '#fff6c8';
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#ff8f8f';
      for (let i = 0; i < s.lives; i += 1) roundRect(ctx, 24 + i * 18, 40, 12, 12, 3), ctx.fill();
    },
  });

  function hurt(w) {
    const s = w.s;
    if (s.locking) return;
    s.lives -= 1;
    s.locking = true;
    w.after(0.35, () => { if (w.s) w.s.locking = false; });
    w.shake(4);
    if (s.lives <= 0) w.finish('The grove goes quiet', 'Tap as each firefly reaches the leaf at the top.');
  }
})();
