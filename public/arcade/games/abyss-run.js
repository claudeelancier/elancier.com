(() => {
  const { hexAlpha } = Arcade;

  Arcade.boot({
    id: 'abyss-run',
    title: 'Abyss Run',
    blurb: 'Pilot a small sub through a trench and gather pearls.',
    hint: 'Hold to rise. Release to sink. Thread the trench.',
    palette: { bg0: '#040c14', bg1: '#082030', accent: '#3ec7ff', accent2: '#d4f1ff' },
    setup(w) {
      const segs = [];
      let top = 180;
      for (let i = 0; i < 16; i += 1) {
        top = Math.max(80, Math.min(300, top + (Math.random() * 50 - 25)));
        segs.push({ x: i * 40, top, gap: 210 });
      }
      w.s = { y: 300, vy: 0, segs, speed: 160, dist: 0, pearls: [] };
    },
    update(w, dt) {
      const s = w.s;
      const hold = w.pointer.down || w.keys.has('Space');
      s.vy += (hold ? -820 : 680) * dt;
      s.vy = w.clamp(s.vy, -280, 320);
      s.y += s.vy * dt;
      s.speed = 160 + Math.min(180, s.dist * 0.02);
      s.dist += s.speed * dt;
      for (const seg of s.segs) seg.x -= s.speed * dt;
      for (const p of s.pearls) p.x -= s.speed * dt;
      if (s.segs[0].x < -40) {
        const last = s.segs[s.segs.length - 1];
        s.segs.shift();
        const top = Math.max(70, Math.min(320, last.top + (Math.random() * 70 - 35)));
        const gap = Math.max(130, 210 - s.dist * 0.01);
        s.segs.push({ x: last.x + 40, top, gap });
        if (Math.random() < 0.45) s.pearls.push({ x: last.x + 60, y: top + gap / 2 });
      }
      s.pearls = s.pearls.filter((p) => {
        if (Math.hypot(p.x - 90, p.y - s.y) < 20) {
          s.bonus = (s.bonus || 0) + 15;
          w.tone(860, 0.03, 'sine', 0.025);
          return false;
        }
        return p.x > -20;
      });
      const seg = s.segs.find((g) => g.x <= 90 && g.x + 40 > 90) || s.segs[2];
      if (s.y - 12 < seg.top || s.y + 12 > seg.top + seg.gap) {
        w.shake(8);
        w.finish('The trench closes', 'Rise and sink with a light touch.');
        return;
      }
      w.setScore(Math.floor(s.dist / 12) + (s.bonus || 0));
    },
    draw(w, ctx) {
      const s = w.s;
      const g = ctx.createLinearGradient(0, 0, 0, 680);
      g.addColorStop(0, '#0c3048');
      g.addColorStop(1, '#041018');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 400, 680);
      ctx.fillStyle = '#062033';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      s.segs.forEach((seg) => ctx.lineTo(seg.x, seg.top));
      ctx.lineTo(400, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 680);
      s.segs.forEach((seg) => ctx.lineTo(seg.x, seg.top + seg.gap));
      ctx.lineTo(400, 680);
      ctx.fill();
      for (const p of s.pearls) {
        ctx.fillStyle = '#d4f1ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e7f8ff';
      roundSub(ctx, 90, s.y);
      ctx.strokeStyle = hexAlpha('#3ec7ff', 0.4);
      ctx.stroke();
    },
  });

  function roundSub(ctx, x, y) {
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 10, y - 4, 5, 0, Math.PI * 2);
  }
})();
