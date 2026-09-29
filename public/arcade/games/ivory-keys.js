(() => {
  const { roundRect } = Arcade;

  Arcade.boot({
    id: 'ivory-keys',
    title: 'Ivory Keys',
    blurb: 'Play only the black keys of a falling piano.',
    hint: 'Tap a column when a black key reaches the bar. Never tap a white key.',
    palette: { bg0: '#101014', bg1: '#1c1c24', accent: '#f4f4f8', accent2: '#9aa0b5' },
    setup(w) {
      w.s = { keys: [], spawn: 0.2, speed: 160, lives: 3, t: 0 };
    },
    onPointer(w, e) {
      if (e.type !== 'down') return;
      const lane = Math.floor(e.x / 100);
      if (lane < 0 || lane > 3) return;
      strike(w, lane);
    },
    onKey(w, e) {
      if (e.type !== 'down') return;
      const map = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
      if (map[e.code] != null) strike(w, map[e.code]);
    },
    update(w, dt) {
      const s = w.s;
      s.t += dt;
      s.speed = 160 + Math.min(220, s.t * 5);
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.32, 0.72 - s.t * 0.006);
        s.keys.push({ lane: (Math.random() * 4) | 0, y: -30, black: Math.random() < 0.62, h: 70 });
      }
      for (const k of s.keys) k.y += s.speed * dt;
      s.keys = s.keys.filter((k) => {
        if (k.y < 640) return true;
        if (k.black && !k.hit) hurt(w);
        return false;
      });
    },
    draw(w, ctx) {
      const s = w.s;
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = i % 2 ? '#1a1a22' : '#14141c';
        ctx.fillRect(i * 100, 0, 100, 680);
        ctx.fillStyle = '#f4f4f8';
        roundRect(ctx, i * 100 + 8, 80, 84, 520, 8);
        ctx.fill();
      }
      for (const k of s.keys) {
        ctx.fillStyle = k.black ? '#16161c' : '#f7f4ee';
        roundRect(ctx, k.lane * 100 + (k.black ? 22 : 10), k.y, k.black ? 56 : 80, k.h, 6);
        ctx.fill();
      }
      ctx.fillStyle = '#c84b3a';
      ctx.fillRect(0, 560, 400, 4);
      for (let i = 0; i < s.lives; i += 1) ctx.fillRect(20 + i * 16, 640, 10, 10);
    },
  });

  function strike(w, lane) {
    const s = w.s;
    let best = null;
    let bestD = 48;
    for (const k of s.keys) {
      if (k.lane !== lane || k.hit) continue;
      const d = Math.abs(k.y + k.h - 560);
      if (d < bestD) { best = k; bestD = d; }
    }
    if (!best || !best.black) {
      hurt(w);
      return;
    }
    best.hit = true;
    w.addScore(15);
    w.tone(660, 0.04, 'sine', 0.03);
    s.keys = s.keys.filter((k) => k !== best);
  }

  function hurt(w) {
    const s = w.s;
    s.lives -= 1;
    w.shake(4);
    w.tone(120, 0.06, 'sawtooth', 0.02);
    if (s.lives <= 0) w.finish('A white key sounds', 'Only the black keys belong in the bar.');
  }
})();
