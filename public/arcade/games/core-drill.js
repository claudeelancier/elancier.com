(() => {
  const { roundRect } = Arcade;
  const COLS = 8;

  function makeRow(depth, rng) {
    return Array.from({ length: COLS }, () => {
      const n = rng();
      if (depth < 2) return 'dirt';
      if (n < 0.07) return 'crystal';
      if (n < 0.07 + Math.min(0.12, depth * 0.004)) return 'lava';
      if (n < 0.22) return 'bedrock';
      return n < 0.45 ? 'rock' : 'dirt';
    });
  }

  Arcade.boot({
    id: 'core-drill',
    title: 'Core Drill',
    blurb: 'Bore toward the mantle, spending fuel on rock and banking it on crystal.',
    hint: 'Tap rock next to the drill. Crystals refill fuel. Lava ends the descent.',
    palette: { bg0: '#100c08', bg1: '#24180e', accent: '#e8a15a', accent2: '#7dffa6' },
    setup(w) {
      const rng = Arcade.mulberry32((Math.random() * 1e9) | 0);
      const rows = [];
      for (let i = 0; i < 40; i += 1) rows.push(makeRow(i, rng));
      rows[2][3] = 'empty';
      w.s = { rows, rng, col: 3, row: 2, fuel: 18, depth: 2 };
      w.setMeta('Fuel 18');
    },
    onPointer(w, e) {
      if (e.type !== 'down') return;
      const s = w.s;
      const top = s.row - 4;
      const size = 44;
      const c = Math.floor((e.x - 24) / size);
      const r = top + Math.floor((e.y - 120) / size);
      if (c < 0 || c >= COLS || r < 0) return;
      if (Math.abs(c - s.col) + Math.abs(r - s.row) !== 1) return;
      while (s.rows.length <= r + 12) s.rows.push(makeRow(s.rows.length, s.rng));
      const tile = s.rows[r][c];
      if (tile === 'empty' || tile === 'bedrock') return;
      if (tile === 'lava') {
        w.shake(8);
        w.finish('The mantle bites', `Depth ${s.depth}. Crystals keep a drill alive.`);
        return;
      }
      s.fuel -= 1;
      if (tile === 'crystal') {
        s.fuel = Math.min(24, s.fuel + 8);
        w.addScore(40);
        w.tone(780, 0.05, 'sine', 0.03);
        w.burst(24 + c * size + 20, 120 + (r - top) * size + 20, '#7dffa6', 8, 100);
      } else w.addScore(4 + Math.floor(r / 3));
      s.rows[r][c] = 'empty';
      s.col = c;
      s.row = r;
      s.depth = Math.max(s.depth, r);
      w.setMeta(`Fuel ${s.fuel}`);
      if (s.fuel <= 0) w.finish('The tank is dry', `You reached depth ${s.depth}.`);
    },
    update() {},
    draw(w, ctx) {
      const s = w.s;
      const size = 44;
      const top = s.row - 4;
      for (let r = top; r < top + 12; r += 1) {
        if (r < 0) continue;
        while (s.rows.length <= r) s.rows.push(makeRow(s.rows.length, s.rng));
        for (let c = 0; c < COLS; c += 1) {
          const tile = s.rows[r][c];
          const x = 24 + c * size;
          const y = 120 + (r - top) * size;
          const color = { empty: '#1a140f', dirt: '#6a4630', rock: '#8d6244', bedrock: '#3a312b', crystal: '#7dffa6', lava: '#ff5a36' }[tile];
          ctx.fillStyle = color;
          roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 8);
          ctx.fill();
        }
      }
      const x = 24 + s.col * size + size / 2;
      const y = 120 + (s.row - top) * size + size / 2;
      ctx.fillStyle = '#e8a15a';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  });
})();
