(() => {
  const { hexAlpha } = Arcade;
  const R = 3;
  const SIZE = 32;
  const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

  const inRange = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) <= R;
  const key = (q, r) => `${q},${r}`;
  const cells = [];
  for (let q = -R; q <= R; q += 1) {
    for (let r = -R; r <= R; r += 1) if (inRange(q, r)) cells.push([q, r]);
  }

  function toPx(q, r) {
    return {
      x: 200 + SIZE * Math.sqrt(3) * (q + r / 2),
      y: 340 + SIZE * 1.5 * r,
    };
  }

  function slide(map, dq, dr) {
    const placed = new Map();
    const merged = new Set();
    const tiles = [...map.entries()].map(([k, v]) => {
      const [q, r] = k.split(',').map(Number);
      return { q, r, v };
    });
    tiles.sort((a, b) => b.q * dq + b.r * dr - (a.q * dq + a.r * dr));
    let moved = false;
    let gained = 0;
    for (const t of tiles) {
      let q = t.q;
      let r = t.r;
      let v = t.v;
      while (inRange(q + dq, r + dr)) {
        const nk = key(q + dq, r + dr);
        if (!placed.has(nk)) {
          q += dq;
          r += dr;
          moved = true;
          continue;
        }
        if (placed.get(nk) === v && !merged.has(nk)) {
          q += dq;
          r += dr;
          v *= 2;
          merged.add(nk);
          moved = true;
          gained += v;
        }
        break;
      }
      placed.set(key(q, r), v);
    }
    return { map: placed, moved, gained };
  }

  function empties(map) {
    return cells.filter(([q, r]) => !map.has(key(q, r)));
  }

  function spawn(map) {
    const open = empties(map);
    if (!open.length) return;
    const [q, r] = open[(Math.random() * open.length) | 0];
    map.set(key(q, r), Math.random() < 0.9 ? 2 : 4);
  }

  function canMove(map) {
    return DIRS.some((d) => slide(new Map(map), d[0], d[1]).moved);
  }

  function hex(ctx, x, y, rad) {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  Arcade.boot({
    id: 'hexa-merge',
    title: 'Hexa Merge',
    blurb: 'Slide a field of hex crystals until matching values fuse.',
    hint: 'Swipe in any of six directions. A new crystal appears after each move.',
    palette: { bg0: '#071410', bg1: '#10241c', accent: '#3dffb0', accent2: '#7af0ff' },
    setup(w) {
      const map = new Map();
      spawn(map);
      spawn(map);
      spawn(map);
      w.s = { map, lock: 0 };
      w.setMeta('Fuse to 1024');
    },
    update(w) {
      const s = w.s;
      if (s.lock > 0) return;
      const swipe = w.consumeSwipe();
      if (!swipe) return;
      let deg = (Math.atan2(swipe.dy, swipe.dx) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      const dir = DIRS[Math.round(deg / 60) % 6];
      const result = slide(s.map, dir[0], dir[1]);
      if (!result.moved) return;
      s.map = result.map;
      if (result.gained) {
        w.addScore(result.gained);
        w.tone(640, 0.05, 'sine', 0.03);
        w.burst(200, 340, '#3dffb0', 10, 120);
      }
      spawn(s.map);
      if ([...s.map.values()].some((v) => v >= 1024) && !s.won) {
        s.won = true;
        w.floatText(200, 180, '1024', '#fff');
        w.tone(880, 0.12, 'triangle', 0.04);
      }
      if (!canMove(s.map)) w.finish('The lattice is locked', 'No slide remains. Fuse earlier chains to climb higher.');
    },
    draw(w, ctx) {
      const map = w.s.map;
      cells.forEach(([q, r]) => {
        const p = toPx(q, r);
        hex(ctx, p.x, p.y, SIZE - 3);
        ctx.fillStyle = hexAlpha('#d8fff2', 0.06);
        ctx.fill();
        ctx.strokeStyle = hexAlpha('#3dffb0', 0.2);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      for (const [k, v] of map) {
        const [q, r] = k.split(',').map(Number);
        const p = toPx(q, r);
        const hue = 150 - Math.log2(v) * 10;
        hex(ctx, p.x, p.y, SIZE - 6);
        ctx.fillStyle = `hsl(${hue} 80% ${58 - Math.min(20, Math.log2(v) * 3)}%)`;
        ctx.fill();
        ctx.fillStyle = '#04241c';
        ctx.font = `700 ${v >= 100 ? 14 : 16}px Sora, Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(v), p.x, p.y + 1);
      }
    },
  });
})();
