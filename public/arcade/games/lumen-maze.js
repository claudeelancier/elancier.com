(() => {
  const { roundRect, hexAlpha } = Arcade;

  function maze(w, h, rng) {
    const g = Array.from({ length: h }, () => Array(w).fill(1));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function carve(x, y) {
      g[y][x] = 0;
      const order = dirs.slice().sort(() => rng() - 0.5);
      for (const [dx, dy] of order) {
        const nx = x + dx * 2;
        const ny = y + dy * 2;
        if (ny > 0 && nx > 0 && ny < h - 1 && nx < w - 1 && g[ny][nx] === 1) {
          g[y + dy][x + dx] = 0;
          carve(nx, ny);
        }
      }
    }
    carve(1, 1);
    g[h - 2][w - 2] = 0;
    return g;
  }

  function stepToward(grid, a, b) {
    const h = grid.length;
    const w = grid[0].length;
    const q = [[a.x, a.y]];
    const prev = new Map([[`${a.x},${a.y}`, null]]);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === b.x && y === b.y) break;
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        const k = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || grid[ny][nx] === 1 || prev.has(k)) continue;
        prev.set(k, [x, y]);
        q.push([nx, ny]);
      }
    }
    let cur = [b.x, b.y];
    let parent = prev.get(`${cur[0]},${cur[1]}`);
    if (!parent) return null;
    while (parent && !(parent[0] === a.x && parent[1] === a.y)) {
      cur = parent;
      parent = prev.get(`${cur[0]},${cur[1]}`);
    }
    return { x: cur[0], y: cur[1] };
  }

  function edge(s, w, id) {
    const now = !!w.held[id];
    const was = !!s['_' + id];
    s['_' + id] = now;
    return now && !was;
  }

  Arcade.boot({
    id: 'lumen-maze',
    title: 'Lumen Maze',
    blurb: 'Carry a lantern through a fresh maze while a shade follows.',
    hint: 'Swipe or use the pad. Reach the exit before the shade touches you.',
    palette: { bg0: '#070a10', bg1: '#101828', accent: '#f6e27a', accent2: '#8ec8ff' },
    buttons: [
      { id: 'up', label: 'Up', key: 'ArrowUp' },
      { id: 'left', label: 'Left', key: 'ArrowLeft' },
      { id: 'down', label: 'Down', key: 'ArrowDown' },
      { id: 'right', label: 'Right', key: 'ArrowRight' },
    ],
    setup(w) {
      const rng = Arcade.mulberry32((Math.random() * 1e9) | 0);
      const grid = maze(15, 15, rng);
      w.s = { grid, px: 1, py: 1, gx: 13, gy: 1, seen: new Set(['1,1']), cool: 0, ghost: 0, time: 0 };
      w.setMeta('Find the exit');
    },
    update(w, dt) {
      const s = w.s;
      s.time += dt;
      s.cool -= dt;
      s.ghost -= dt;
      const swipe = w.consumeSwipe();
      let dir = null;
      if (swipe) dir = swipe.dir;
      if (edge(s, w, 'up')) dir = 'up';
      if (edge(s, w, 'down')) dir = 'down';
      if (edge(s, w, 'left')) dir = 'left';
      if (edge(s, w, 'right')) dir = 'right';
      if (dir && s.cool <= 0) {
        const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
        const nx = s.px + d[0];
        const ny = s.py + d[1];
        if (s.grid[ny] && s.grid[ny][nx] === 0) {
          s.px = nx;
          s.py = ny;
          s.seen.add(`${nx},${ny}`);
          s.cool = 0.12;
          w.tone(480, 0.02, 'sine', 0.02);
        }
      }
      if (s.ghost <= 0) {
        s.ghost = Math.max(0.22, 0.42 - s.time * 0.004);
        const next = stepToward(s.grid, { x: s.gx, y: s.gy }, { x: s.px, y: s.py });
        if (next) { s.gx = next.x; s.gy = next.y; }
      }
      if (s.px === s.gx && s.py === s.gy) {
        w.shake(8);
        w.finish('The shade arrives', 'Keep a corner between you and the dark.');
        return;
      }
      if (s.px === 13 && s.py === 13) {
        w.setScore(Math.max(100, 1200 - Math.floor(s.time * 20)));
        w.finish('The lantern finds the stair', 'You outwalked the shade.');
        return;
      }
      w.setScore(Math.max(0, Math.floor(s.time * 10)));
    },
    draw(w, ctx) {
      const s = w.s;
      const size = 24;
      const ox = 20;
      const oy = 150;
      for (let y = 0; y < 15; y += 1) {
        for (let x = 0; x < 15; x += 1) {
          const dist = Math.abs(x - s.px) + Math.abs(y - s.py);
          const seen = s.seen.has(`${x},${y}`);
          if (!seen && dist > 4) continue;
          const px = ox + x * size;
          const py = oy + y * size;
          ctx.globalAlpha = dist > 4 ? 0.28 : 1;
          ctx.fillStyle = s.grid[y][x] ? '#1a2436' : '#24344c';
          ctx.fillRect(px, py, size - 1, size - 1);
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#7dffa6';
      roundRect(ctx, ox + 13 * size + 4, oy + 13 * size + 4, 16, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#8ec8ff';
      ctx.beginPath();
      ctx.arc(ox + s.gx * size + 11, oy + s.gy * size + 11, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f6e27a';
      ctx.beginPath();
      ctx.arc(ox + s.px * size + 11, oy + s.py * size + 11, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexAlpha('#f6e27a', 0.35);
      ctx.beginPath();
      ctx.arc(ox + s.px * size + 11, oy + s.py * size + 11, 70, 0, Math.PI * 2);
      ctx.stroke();
    },
  });
})();
