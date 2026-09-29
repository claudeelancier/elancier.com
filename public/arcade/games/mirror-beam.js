(() => {
  const { roundRect, hexAlpha } = Arcade;

  const LEVELS = [
    ['########', '#S./...#', '#......#', '#..\\..T#', '#......#', '#......#', '#......#', '########'],
    ['########', '#S../..#', '#......#', '#...T..#', '#......#', '#......#', '#../...#', '########'],
    ['########', '#S./...#', '#......#', '#......#', '#../T..#', '#../...#', '#.#....#', '########'],
    ['########', '#S/....#', '#......#', '#.\\../.#', '#....T.#', '#......#', '#......#', '########'],
    ['########', '#S/....#', '#......#', '#......#', '#.//...#', '#......#', '#..T...#', '########'],
  ];

  function cast(rows) {
    let x = 1;
    let y = 1;
    let dir = 0;
    for (let r = 0; r < rows.length; r += 1) {
      const c = rows[r].indexOf('S');
      if (c >= 0) { x = c; y = r; }
    }
    const seen = [];
    const deltas = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let n = 0; n < 80; n += 1) {
      x += deltas[dir][0];
      y += deltas[dir][1];
      if (!rows[y] || !rows[y][x] || rows[y][x] === '#') return { hit: false, seen };
      seen.push({ x, y, dir });
      const cell = rows[y][x];
      if (cell === 'T') return { hit: true, seen };
      if (cell === '/') dir = [3, 2, 1, 0][dir];
      else if (cell === '\\') dir = [1, 0, 3, 2][dir];
    }
    return { hit: false, seen };
  }

  Arcade.boot({
    id: 'mirror-beam',
    title: 'Mirror Beam',
    blurb: 'Rotate glass so a single beam finds the prism.',
    hint: 'Tap a mirror to turn it. Light the prism to clear the chamber.',
    palette: { bg0: '#0e1016', bg1: '#1a2030', accent: '#7ecbff', accent2: '#ffe27a' },
    setup(w) {
      w.s = { level: 0, rows: LEVELS[0].map((row) => row.split('')) };
      w.setMeta('Chamber 1');
    },
    onPointer(w, e) {
      if (e.type !== 'down') return;
      const size = 48;
      const ox = 8;
      const oy = 140;
      const c = Math.floor((e.x - ox) / size);
      const r = Math.floor((e.y - oy) / size);
      const rows = w.s.rows;
      if (!rows[r] || !rows[r][c]) return;
      if (rows[r][c] !== '/' && rows[r][c] !== '\\') return;
      rows[r][c] = rows[r][c] === '/' ? '\\' : '/';
      w.tone(560, 0.04, 'sine', 0.03);
    },
    update(w) {
      const s = w.s;
      const rows = s.rows.map((r) => r.join(''));
      if (!cast(rows).hit) return;
      w.addScore(100);
      w.tone(860, 0.08, 'triangle', 0.04);
      if (s.level + 1 >= LEVELS.length) {
        w.finish('The prism wakes', 'Every chamber is lit.');
        return;
      }
      s.level += 1;
      s.rows = LEVELS[s.level].map((row) => row.split(''));
      w.setMeta(`Chamber ${s.level + 1}`);
    },
    draw(w, ctx) {
      const s = w.s;
      const size = 48;
      const ox = 8;
      const oy = 140;
      const beam = cast(s.rows.map((r) => r.join('')));
      s.rows.forEach((row, y) => {
        row.forEach((cell, x) => {
          const px = ox + x * size;
          const py = oy + y * size;
          ctx.fillStyle = cell === '#' ? '#243044' : hexAlpha('#ffffff', 0.03);
          ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
          ctx.strokeStyle = '#ffe27a';
          ctx.lineWidth = 3;
          if (cell === '/' || cell === '\\') {
            ctx.beginPath();
            if (cell === '/') { ctx.moveTo(px + 10, py + size - 10); ctx.lineTo(px + size - 10, py + 10); }
            else { ctx.moveTo(px + 10, py + 10); ctx.lineTo(px + size - 10, py + size - 10); }
            ctx.stroke();
          }
          if (cell === 'S') {
            ctx.fillStyle = '#7ecbff';
            ctx.fillRect(px + 16, py + 16, 16, 16);
          }
          if (cell === 'T') {
            ctx.fillStyle = beam.hit ? '#fff' : '#ffe27a';
            ctx.beginPath();
            ctx.moveTo(px + 24, py + 8);
            ctx.lineTo(px + 40, py + 24);
            ctx.lineTo(px + 24, py + 40);
            ctx.lineTo(px + 8, py + 24);
            ctx.fill();
          }
        });
      });
      ctx.strokeStyle = hexAlpha('#7ecbff', 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      let sx = 1;
      let sy = 1;
      s.rows.forEach((row, y) => {
        const x = row.indexOf('S');
        if (x >= 0) { sx = x; sy = y; }
      });
      ctx.moveTo(ox + sx * size + 24, oy + sy * size + 24);
      for (const p of beam.seen) ctx.lineTo(ox + p.x * size + 24, oy + p.y * size + 24);
      ctx.stroke();
    },
  });
})();
