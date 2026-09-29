(() => {
  const { roundRect, hexAlpha } = Arcade;
  const COLS = 7;
  const ROWS = 9;
  const SIZE = 46;
  const OX = 39;
  const OY = 118;
  const COLORS = ['#ff5ca8', '#ffd36a', '#7d5cff', '#5ce1ff', '#7dffb0', '#ff8a4a'];

  const cell = (c, r) => ({ color: (Math.random() * COLORS.length) | 0, drop: 0 });

  function find(grid) {
    const kill = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let any = false;
    for (let r = 0; r < ROWS; r += 1) {
      let run = 1;
      for (let c = 1; c <= COLS; c += 1) {
        const same = c < COLS && grid[r][c] && grid[r][c - 1] && grid[r][c].color === grid[r][c - 1].color;
        if (same) run += 1;
        else {
          if (run >= 3) {
            any = true;
            for (let k = 0; k < run; k += 1) kill[r][c - 1 - k] = true;
          }
          run = 1;
        }
      }
    }
    for (let c = 0; c < COLS; c += 1) {
      let run = 1;
      for (let r = 1; r <= ROWS; r += 1) {
        const same = r < ROWS && grid[r][c] && grid[r - 1][c] && grid[r][c].color === grid[r - 1][c].color;
        if (same) run += 1;
        else {
          if (run >= 3) {
            any = true;
            for (let k = 0; k < run; k += 1) kill[r - 1 - k][c] = true;
          }
          run = 1;
        }
      }
    }
    return any ? kill : null;
  }

  function scrub(grid) {
    for (let n = 0; n < 12; n += 1) {
      const kill = find(grid);
      if (!kill) return;
      for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) if (kill[r][c]) grid[r][c].color = (grid[r][c].color + 1 + ((Math.random() * 3) | 0)) % COLORS.length;
    }
  }

  function collapse(grid) {
    for (let c = 0; c < COLS; c += 1) {
      const stack = [];
      for (let r = ROWS - 1; r >= 0; r -= 1) if (grid[r][c]) stack.push({ gem: grid[r][c], r });
      for (let i = 0; i < ROWS; i += 1) {
        const r = ROWS - 1 - i;
        if (i < stack.length) {
          const { gem, r: old } = stack[i];
          grid[r][c] = gem;
          gem.drop += (old - r) * SIZE;
        } else {
          const born = cell();
          born.drop = -(i + 3) * SIZE;
          grid[r][c] = born;
        }
      }
    }
  }

  function hasMove(grid) {
    const trial = () => grid.map((row) => row.map((g) => ({ color: g.color, drop: 0 })));
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        for (const [dc, dr] of [[1, 0], [0, 1]]) {
          const c2 = c + dc;
          const r2 = r + dr;
          if (c2 >= COLS || r2 >= ROWS) continue;
          const g = trial();
          const tmp = g[r][c].color;
          g[r][c].color = g[r2][c2].color;
          g[r2][c2].color = tmp;
          if (find(g)) return true;
        }
      }
    }
    return false;
  }

  Arcade.boot({
    id: 'cascade-gems',
    title: 'Cascade Gems',
    blurb: 'Swap neighboring gems and chain cascades across the vault.',
    hint: 'Tap a gem, then tap a neighbor. Matches of three or more collapse.',
    palette: { bg0: '#140818', bg1: '#2a1038', accent: '#ff5ca8', accent2: '#ffd36a' },
    setup(w) {
      const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, cell));
      scrub(grid);
      w.s = { grid, sel: null, wait: 0, chain: 0 };
    },
    onPointer(w, e) {
      if (e.type !== 'down' || w.s.wait > 0) return;
      const c = Math.floor((e.x - OX) / SIZE);
      const r = Math.floor((e.y - OY) / SIZE);
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
      const s = w.s;
      if (!s.sel) {
        s.sel = { c, r };
        w.tone(520, 0.03, 'sine', 0.02);
        return;
      }
      const dist = Math.abs(s.sel.c - c) + Math.abs(s.sel.r - r);
      if (dist !== 1) {
        s.sel = { c, r };
        return;
      }
      const g = s.grid;
      const a = g[s.sel.r][s.sel.c];
      const b = g[r][c];
      const ca = a.color;
      const cb = b.color;
      a.color = cb;
      b.color = ca;
      if (!find(g)) {
        a.color = ca;
        b.color = cb;
        w.shake(3);
        s.sel = null;
        return;
      }
      s.sel = null;
      s.chain = 1;
      s.wait = 0.12;
      s.pending = true;
    },
    update(w, dt) {
      const s = w.s;
      let moving = false;
      for (const row of s.grid) {
        for (const g of row) {
          if (!g || !g.drop) continue;
          moving = true;
          const step = Math.max(8, Math.abs(g.drop)) * 8;
          if (g.drop < 0) g.drop = Math.min(0, g.drop + step * dt);
          else g.drop = 0;
        }
      }
      if (s.wait > 0) s.wait -= dt;
      if (s.pending && s.wait <= 0 && !moving) {
        const kill = find(s.grid);
        if (!kill) {
          s.pending = false;
          s.chain = 0;
          if (!hasMove(s.grid)) {
            for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) s.grid[r][c] = cell();
            scrub(s.grid);
            w.floatText(200, 90, 'Reshuffle', '#fff');
          }
          return;
        }
        let n = 0;
        for (let r = 0; r < ROWS; r += 1) {
          for (let c = 0; c < COLS; c += 1) {
            if (!kill[r][c]) continue;
            n += 1;
            w.burst(OX + c * SIZE + SIZE / 2, OY + r * SIZE + SIZE / 2, COLORS[s.grid[r][c].color], 6, 110);
            s.grid[r][c] = null;
          }
        }
        w.addScore(n * 10 * s.chain);
        w.floatText(200, 86, `+${n * 10 * s.chain}`, '#ffd36a');
        w.tone(600 + s.chain * 40, 0.05, 'triangle', 0.03);
        collapse(s.grid);
        s.chain += 1;
        s.pending = true;
        s.wait = 0.16;
      }
    },
    draw(w, ctx) {
      const s = w.s;
      roundRect(ctx, 24, 96, 352, ROWS * SIZE + 24, 24);
      ctx.fillStyle = hexAlpha('#ffffff', 0.04);
      ctx.fill();
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          const g = s.grid[r][c];
          if (!g) continue;
          const x = OX + c * SIZE;
          const y = OY + r * SIZE + g.drop;
          const sel = s.sel && s.sel.c === c && s.sel.r === r;
          ctx.fillStyle = COLORS[g.color];
          roundRect(ctx, x + 4, y + 4, SIZE - 8, SIZE - 8, 12);
          ctx.fill();
          ctx.fillStyle = hexAlpha('#fff', 0.35);
          roundRect(ctx, x + 8, y + 8, SIZE - 20, 8, 6);
          ctx.fill();
          if (sel) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            roundRect(ctx, x + 3, y + 3, SIZE - 6, SIZE - 6, 14);
            ctx.stroke();
          }
        }
      }
    },
  });
})();
