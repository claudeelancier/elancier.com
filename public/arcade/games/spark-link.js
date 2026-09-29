(() => {
  const { hexAlpha } = Arcade;
  const COLS = 6;
  const ROWS = 8;
  const COLORS = ['#d06bff', '#7af0ff', '#ffd36a', '#ff7aa2', '#b6ff6a'];

  function cellColor() { return (Math.random() * COLORS.length) | 0; }

  Arcade.boot({
    id: 'spark-link',
    title: 'Spark Link',
    blurb: 'Draw chains through matching sparks before the reservoir empties.',
    hint: 'Drag through adjacent sparks of the same color. Release a chain of three or more.',
    palette: { bg0: '#100814', bg1: '#240c28', accent: '#d06bff', accent2: '#7af0ff' },
    setup(w) {
      const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, cellColor));
      w.s = { grid, chain: [], time: 28 };
    },
    onPointer(w, e) {
      const s = w.s;
      const size = 48;
      const ox = 56;
      const oy = 150;
      const c = Math.floor((e.x - ox) / size);
      const r = Math.floor((e.y - oy) / size);
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) {
        if (e.type === 'up') release(w);
        return;
      }
      if (e.type === 'down') s.chain = [{ c, r }];
      if (e.type === 'move' || e.type === 'down') {
        const last = s.chain[s.chain.length - 1];
        if (!last || (last.c === c && last.r === r)) return;
        if (Math.abs(last.c - c) + Math.abs(last.r - r) !== 1) return;
        if (s.grid[r][c] !== s.grid[last.r][last.c]) return;
        const idx = s.chain.findIndex((p) => p.c === c && p.r === r);
        if (idx >= 0) s.chain = s.chain.slice(0, idx + 1);
        else s.chain.push({ c, r });
      }
      if (e.type === 'up') release(w);
    },
    update(w, dt) {
      const s = w.s;
      s.time -= dt;
      w.setMeta(`${Math.max(0, s.time).toFixed(1)}s`);
      if (s.time <= 0) w.finish('The reservoir empties', 'Longer chains put time back.');
    },
    draw(w, ctx) {
      const s = w.s;
      const size = 48;
      const ox = 56;
      const oy = 150;
      if (s.chain.length > 1) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        s.chain.forEach((p, i) => {
          const x = ox + p.c * size + size / 2;
          const y = oy + p.r * size + size / 2;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          const on = s.chain.some((p) => p.c === c && p.r === r);
          ctx.fillStyle = COLORS[s.grid[r][c]];
          ctx.globalAlpha = on ? 1 : 0.8;
          ctx.beginPath();
          ctx.arc(ox + c * size + size / 2, oy + r * size + size / 2, on ? 16 : 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = hexAlpha('#7af0ff', 0.8);
      ctx.fillRect(56, 110, (Math.max(0, s.time) / 40) * 288, 8);
    },
  });

  function release(w) {
    const s = w.s;
    if (s.chain.length >= 3) {
      const gain = s.chain.length * s.chain.length * 8;
      w.addScore(gain);
      s.time = Math.min(40, s.time + 0.7 + s.chain.length * 0.15);
      w.tone(680, 0.05, 'sine', 0.03);
      const marked = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
      s.chain.forEach((p) => { marked[p.r][p.c] = true; });
      for (let c = 0; c < COLS; c += 1) {
        const keep = [];
        for (let r = ROWS - 1; r >= 0; r -= 1) if (!marked[r][c]) keep.push(s.grid[r][c]);
        for (let r = ROWS - 1; r >= 0; r -= 1) s.grid[r][c] = keep[ROWS - 1 - r] ?? cellColor();
      }
    }
    s.chain = [];
  }
})();
