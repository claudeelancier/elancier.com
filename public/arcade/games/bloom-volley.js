(() => {
  const { roundRect, glow, hexAlpha } = Arcade;
  const COLS = 8;
  const R = 16;
  const COLORS = ['#ff77c8', '#7d5cff', '#ffd166', '#5ce1ff', '#b6ff6a'];

  const key = (c, r) => `${c},${r}`;
  function center(c, r) {
    return { x: 48 + c * (R * 2) + (r % 2 ? R : 0), y: 78 + r * (R * 1.74) };
  }
  function neighbors(c, r) {
    const odd = r % 2 === 1;
    const d = odd ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]] : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
    return d.map(([dc, dr]) => [c + dc, r + dr]).filter(([cc, rr]) => rr >= 0 && rr < 16 && cc >= 0 && cc < COLS);
  }
  function group(map, start, color) {
    const seen = new Set([start]);
    const q = [start];
    while (q.length) {
      const cur = q.pop();
      const [c, r] = cur.split(',').map(Number);
      for (const [nc, nr] of neighbors(c, r)) {
        const k = key(nc, nr);
        if (seen.has(k) || map.get(k) !== color) continue;
        seen.add(k);
        q.push(k);
      }
    }
    return seen;
  }
  function supported(map) {
    const keep = new Set();
    const q = [];
    for (const k of map.keys()) {
      if (k.endsWith(',0')) { keep.add(k); q.push(k); }
    }
    while (q.length) {
      const cur = q.pop();
      const [c, r] = cur.split(',').map(Number);
      for (const [nc, nr] of neighbors(c, r)) {
        const k = key(nc, nr);
        if (map.has(k) && !keep.has(k)) { keep.add(k); q.push(k); }
      }
    }
    return keep;
  }
  function snap(map, x, y, color) {
    let best = null;
    let bestD = 1e9;
    for (let r = 0; r < 14; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (map.has(key(c, r))) continue;
        const p = center(c, r);
        const d = Math.hypot(p.x - x, p.y - y);
        const near = r === 0 || neighbors(c, r).some(([nc, nr]) => map.has(key(nc, nr)));
        if (near && d < bestD) { bestD = d; best = [c, r]; }
      }
    }
    if (!best || bestD > R * 3.2) return false;
    map.set(key(best[0], best[1]), color);
    return true;
  }
  function settle(w, map) {
    const colors = new Set(map.values());
    for (const color of colors) {
      const seen = new Set();
      for (const [k, v] of map) {
        if (v !== color || seen.has(k)) continue;
        const g = group(map, k, color);
        g.forEach((id) => seen.add(id));
        if (g.size >= 3) {
          g.forEach((id) => {
            const [c, r] = id.split(',').map(Number);
            const p = center(c, r);
            w.burst(p.x, p.y, COLORS[color], 5, 90);
            map.delete(id);
          });
          w.addScore(g.size * 20);
        }
      }
    }
    const keep = supported(map);
    for (const k of [...map.keys()]) {
      if (!keep.has(k)) {
        const [c, r] = k.split(',').map(Number);
        const p = center(c, r);
        w.burst(p.x, p.y, '#fff', 4, 80);
        map.delete(k);
        w.addScore(15);
      }
    }
  }

  Arcade.boot({
    id: 'bloom-volley',
    title: 'Bloom Volley',
    blurb: 'Aim a glass cannon and burst clusters of hanging blooms.',
    hint: 'Drag to aim. Release to fire. Match three or more of a color.',
    palette: { bg0: '#120814', bg1: '#301028', accent: '#ff77c8', accent2: '#7d5cff' },
    setup(w) {
      const map = new Map();
      for (let r = 0; r < 5; r += 1) for (let c = 0; c < COLS; c += 1) map.set(key(c, r), (Math.random() * COLORS.length) | 0);
      for (let n = 0; n < 6; n += 1) settle(w, map);
      w.setScore(0);
      w.s = { map, angle: -Math.PI / 2, shot: null, next: (Math.random() * COLORS.length) | 0, shots: 0, aim: false };
    },
    onPointer(w, e) {
      const s = w.s;
      if (e.type === 'down' || e.type === 'move') {
        s.aim = true;
        s.angle = Math.atan2(e.y - 620, e.x - 200);
        s.angle = w.clamp(s.angle, -Math.PI + 0.18, -0.18);
      }
      if (e.type === 'up' && !s.shot) {
        s.shot = { x: 200, y: 610, vx: Math.cos(s.angle) * 540, vy: Math.sin(s.angle) * 540, color: s.next };
        s.next = (Math.random() * COLORS.length) | 0;
        w.tone(660, 0.04, 'square', 0.025);
      }
    },
    update(w, dt) {
      const s = w.s;
      if (!s.shot) return;
      s.shot.x += s.shot.vx * dt;
      s.shot.y += s.shot.vy * dt;
      if (s.shot.x < 30 || s.shot.x > 370) s.shot.vx *= -1;
      let hit = s.shot.y < 62;
      if (!hit) {
        for (const k of s.map.keys()) {
          const [c, r] = k.split(',').map(Number);
          const p = center(c, r);
          if (Math.hypot(p.x - s.shot.x, p.y - s.shot.y) < R * 2 - 1) { hit = true; break; }
        }
      }
      if (!hit) return;
      snap(s.map, s.shot.x, s.shot.y, s.shot.color);
      settle(w, s.map);
      s.shot = null;
      s.shots += 1;
      if (s.shots % 6 === 0) {
        const shifted = new Map();
        for (const [k, v] of s.map) {
          const [c, r] = k.split(',').map(Number);
          shifted.set(key(c, r + 1), v);
        }
        for (let c = 0; c < COLS; c += 1) shifted.set(key(c, 0), (Math.random() * COLORS.length) | 0);
        s.map = shifted;
        settle(w, s.map);
      }
      for (const k of s.map.keys()) {
        const r = Number(k.split(',')[1]);
        if (r >= 11) {
          w.finish('The blooms reach the cannon', 'Clear clusters before the ceiling advances.');
          return;
        }
      }
    },
    draw(w, ctx) {
      const s = w.s;
      ctx.strokeStyle = hexAlpha('#ff77c8', 0.35);
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(200, 620);
      ctx.lineTo(200 + Math.cos(s.angle) * 520, 620 + Math.sin(s.angle) * 520);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const [k, color] of s.map) {
        const [c, r] = k.split(',').map(Number);
        const p = center(c, r);
        glow(ctx, p.x, p.y, 16, hexAlpha(COLORS[color], 0.35));
        ctx.fillStyle = COLORS[color];
        ctx.beginPath();
        ctx.arc(p.x, p.y, R - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hexAlpha('#fff', 0.35);
        ctx.beginPath();
        ctx.arc(p.x - 4, p.y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#2a1038';
      roundRect(ctx, 150, 628, 100, 36, 16);
      ctx.fill();
      ctx.fillStyle = COLORS[s.next];
      ctx.beginPath();
      ctx.arc(200, 640, 12, 0, Math.PI * 2);
      ctx.fill();
      if (s.shot) {
        ctx.fillStyle = COLORS[s.shot.color];
        ctx.beginPath();
        ctx.arc(s.shot.x, s.shot.y, R - 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = hexAlpha('#ffd166', 0.7);
      ctx.beginPath();
      ctx.moveTo(36, 560);
      ctx.lineTo(364, 560);
      ctx.stroke();
    },
  });
})();
