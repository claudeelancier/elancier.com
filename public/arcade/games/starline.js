(() => {
  const { glow, hexAlpha } = Arcade;
  const SETS = [
    { name: 'Lyre', pts: [[80, 80], [140, 40], [200, 90], [150, 150], [90, 140]] },
    { name: 'Kite', pts: [[160, 30], [230, 110], [160, 200], [90, 110], [160, 110]] },
    { name: 'Crown', pts: [[40, 150], [90, 70], [140, 140], [190, 50], [240, 140], [290, 80]] },
    { name: 'River', pts: [[30, 40], [90, 80], [70, 150], [140, 180], [210, 140], [250, 70], [300, 120]] },
    { name: 'Fox', pts: [[60, 60], [120, 40], [180, 80], [150, 140], [80, 160], [40, 110]] },
    { name: 'Bridge', pts: [[40, 160], [100, 80], [170, 60], [240, 80], [300, 160], [170, 150]] },
    { name: 'Spire', pts: [[160, 20], [120, 90], [200, 90], [90, 170], [230, 170], [160, 120]] },
    { name: 'Wren', pts: [[50, 100], [110, 50], [180, 70], [240, 40], [280, 110], [200, 160], [110, 150]] },
  ];

  function layout(pts) {
    return pts.map(([x, y]) => ({ x: 50 + x, y: 180 + y }));
  }

  Arcade.boot({
    id: 'starline',
    title: 'Starline',
    blurb: 'Join numbered stars into original constellations before dawn.',
    hint: 'Tap the stars in numbered order.',
    palette: { bg0: '#070712', bg1: '#12122a', accent: '#c9d4ff', accent2: '#ffe9a8' },
    setup(w) {
      w.s = { index: 0, at: 0, stars: layout(SETS[0].pts), time: 24, name: SETS[0].name };
      w.setMeta(SETS[0].name);
    },
    onPointer(w, e) {
      if (e.type !== 'down') return;
      const s = w.s;
      let nearest = -1;
      let best = 36;
      s.stars.forEach((star, i) => {
        const d = Math.hypot(star.x - e.x, star.y - e.y);
        if (d < best) { best = d; nearest = i; }
      });
      if (nearest < 0) return;
      if (nearest === s.at) {
        s.at += 1;
        w.addScore(20);
        w.tone(680, 0.04, 'sine', 0.03);
        w.burst(s.stars[nearest].x, s.stars[nearest].y, '#ffe9a8', 8, 90);
        if (s.at >= s.stars.length) {
          w.addScore(Math.max(0, Math.ceil(s.time)) * 2);
          if (s.index + 1 >= SETS.length) {
            w.finish('Dawn holds the chart', 'Every constellation is joined.');
            return;
          }
          s.index += 1;
          s.at = 0;
          s.stars = layout(SETS[s.index].pts);
          s.time = 18 + s.stars.length * 2;
          s.name = SETS[s.index].name;
          w.setMeta(s.name);
        }
      } else if (nearest > s.at) {
        s.time -= 3;
        w.shake(4);
        w.tone(160, 0.06, 'sawtooth', 0.02);
      }
    },
    update(w, dt) {
      const s = w.s;
      s.time -= dt;
      w.setMeta(`${s.name} · ${Math.max(0, s.time).toFixed(1)}s`);
      if (s.time <= 0) w.finish('Dawn arrives early', 'Join the numbers before the timer fades.');
    },
    draw(w, ctx) {
      const s = w.s;
      for (let i = 0; i < 40; i += 1) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#c9d4ff';
        ctx.fillRect((i * 97) % 400, (i * 53) % 680, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = hexAlpha('#ffe9a8', 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < s.at; i += 1) {
        const p = s.stars[i];
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
      s.stars.forEach((star, i) => {
        const done = i < s.at;
        glow(ctx, star.x, star.y, 14, hexAlpha(done ? '#ffe9a8' : '#c9d4ff', 0.45));
        ctx.fillStyle = done ? '#ffe9a8' : i === s.at ? '#fff' : '#9aabd8';
        ctx.beginPath();
        ctx.arc(star.x, star.y, done ? 7 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#070712';
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), star.x, star.y);
      });
    },
  });
})();
