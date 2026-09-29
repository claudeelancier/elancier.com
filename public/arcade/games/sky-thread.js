(() => {
  const { glow, hexAlpha } = Arcade;

  function cross(ax, ay, bx, by, cx, cy) {
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  }
  function cuts(a, b, c, d) {
    const o1 = cross(a.x, a.y, b.x, b.y, c.x, c.y);
    const o2 = cross(a.x, a.y, b.x, b.y, d.x, d.y);
    const o3 = cross(c.x, c.y, d.x, d.y, a.x, a.y);
    const o4 = cross(c.x, c.y, d.x, d.y, b.x, b.y);
    return o1 * o2 < 0 && o3 * o4 < 0;
  }

  const LEVELS = [
    { pts: [[120, 240], [280, 240], [120, 480], [280, 480]], edges: [[0, 3], [1, 2]] },
    { pts: [[80, 200], [300, 190], [90, 500], [310, 490], [200, 340]], edges: [[0, 3], [1, 2], [0, 4], [1, 4]] },
    { pts: [[70, 180], [330, 190], [60, 500], [340, 490], [200, 250], [200, 450]], edges: [[0, 3], [1, 2], [4, 5]] },
    { pts: [[90, 170], [310, 180], [70, 360], [330, 370], [120, 520], [280, 520]], edges: [[0, 5], [1, 4], [2, 3]] },
  ];

  function tangled(pts, edges) {
    for (let i = 0; i < edges.length; i += 1) {
      for (let j = i + 1; j < edges.length; j += 1) {
        const a = edges[i];
        const b = edges[j];
        if (a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1]) continue;
        if (cuts(pts[a[0]], pts[a[1]], pts[b[0]], pts[b[1]])) return true;
      }
    }
    return false;
  }

  Arcade.boot({
    id: 'sky-thread',
    title: 'Sky Thread',
    blurb: 'Untangle a constellation until every silk thread runs clear.',
    hint: 'Drag stars until no threads cross.',
    palette: { bg0: '#101018', bg1: '#202038', accent: '#f0e6ff', accent2: '#9ad7ff' },
    setup(w) {
      const level = JSON.parse(JSON.stringify(LEVELS[0]));
      w.s = { level: 0, pts: level.pts.map((p) => ({ x: p[0], y: p[1] })), edges: level.edges, drag: -1 };
      w.setMeta('Chart 1');
    },
    onPointer(w, e) {
      const s = w.s;
      if (e.type === 'down') {
        s.drag = s.pts.findIndex((p) => Math.hypot(p.x - e.x, p.y - e.y) < 28);
      } else if (e.type === 'move' && s.drag >= 0) {
        s.pts[s.drag].x = w.clamp(e.x, 36, 364);
        s.pts[s.drag].y = w.clamp(e.y, 120, 620);
      } else if (e.type === 'up') s.drag = -1;
    },
    update(w) {
      const s = w.s;
      if (tangled(s.pts, s.edges)) return;
      w.addScore(150);
      w.tone(840, 0.08, 'triangle', 0.04);
      if (s.level + 1 >= LEVELS.length) {
        w.finish('The sky lies smooth', 'Every thread runs clear.');
        return;
      }
      s.level += 1;
      const next = LEVELS[s.level];
      s.pts = next.pts.map((p) => ({ x: p[0], y: p[1] }));
      s.edges = next.edges;
      w.setMeta(`Chart ${s.level + 1}`);
      w.floatText(200, 140, 'Clear', '#fff');
    },
    draw(w, ctx) {
      const s = w.s;
      const bad = tangled(s.pts, s.edges);
      for (const [a, b] of s.edges) {
        ctx.strokeStyle = bad ? '#ff8fb8' : '#9ad7ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.pts[a].x, s.pts[a].y);
        ctx.lineTo(s.pts[b].x, s.pts[b].y);
        ctx.stroke();
      }
      s.pts.forEach((p, i) => {
        glow(ctx, p.x, p.y, 16, hexAlpha('#f0e6ff', 0.45));
        ctx.fillStyle = i === s.drag ? '#fff' : '#f0e6ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
      });
    },
  });
})();
