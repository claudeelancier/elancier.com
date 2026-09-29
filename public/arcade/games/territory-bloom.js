(() => {
  const COLORS = ['#ff6b6b', '#ffd166', '#8cff6a', '#6aa8ff', '#c9a6ff', '#f0d2b4'];
  const NAMES = ['Rose', 'Gold', 'Leaf', 'Sky', 'Iris', 'Sand'];
  const W = 12;
  const H = 14;

  function paint(cells, owner, color) {
    const mine = cells.filter((c) => c.owner === owner);
    if (!mine.length || mine[0].color === color) return 0;
    mine.forEach((c) => { c.color = color; });
    const seen = new Set(mine);
    const q = mine.slice();
    let gained = 0;
    while (q.length) {
      const c = q.pop();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = cells.find((o) => o.c === c.c + dc && o.r === c.r + dr);
        if (!n || seen.has(n) || n.owner || n.color !== color) continue;
        n.owner = owner;
        seen.add(n);
        q.push(n);
        gained += 1;
      }
    }
    return gained;
  }

  function best(cells, owner) {
    const cur = cells.find((c) => c.owner === owner)?.color;
    let pick = (cur + 1) % COLORS.length;
    let gain = -1;
    for (let color = 0; color < COLORS.length; color += 1) {
      if (color === cur) continue;
      const copy = cells.map((c) => ({ ...c }));
      const got = paint(copy, owner, color);
      if (got > gain) { gain = got; pick = color; }
    }
    return pick;
  }

  Arcade.boot({
    id: 'territory-bloom',
    title: 'Territory Bloom',
    blurb: 'Flood your grove and outpaint a rival before the light fades.',
    hint: 'Choose a color to expand your grove. You play from the top left.',
    palette: { bg0: '#10140e', bg1: '#1c2818', accent: '#8cff6a', accent2: '#6aa8ff' },
    buttons: NAMES.map((label, i) => ({ id: `c${i}`, label })),
    setup(w) {
      const cells = [];
      for (let r = 0; r < H; r += 1) {
        for (let c = 0; c < W; c += 1) cells.push({ c, r, color: (Math.random() * COLORS.length) | 0, owner: null });
      }
      cells[0].owner = 'you';
      cells[cells.length - 1].owner = 'ai';
      w.s = { cells, turn: 0, wait: 0, you: 1, ai: 1 };
      w.setMeta('Your grove');
    },
    update(w, dt) {
      const s = w.s;
      if (s.wait > 0) {
        s.wait -= dt;
        if (s.wait <= 0) {
          paint(s.cells, 'ai', best(s.cells, 'ai'));
          tally(w);
          if (s.turn >= 18 || s.you + s.ai >= W * H) finish(w);
        }
        return;
      }
      for (let i = 0; i < COLORS.length; i += 1) {
        if (!pressed(s, w, `c${i}`)) continue;
        const got = paint(s.cells, 'you', i);
        if (!got && s.cells.find((c) => c.owner === 'you').color === i) return;
        s.turn += 1;
        tally(w);
        w.tone(560 + i * 30, 0.04, 'sine', 0.025);
        s.wait = 0.35;
        w.setMeta('Rival paints');
        if (s.you > W * H * 0.6) finish(w);
      }
    },
    draw(w, ctx) {
      const s = w.s;
      const size = 26;
      const ox = 44;
      const oy = 120;
      for (const c of s.cells) {
        ctx.fillStyle = COLORS[c.color];
        ctx.fillRect(ox + c.c * size, oy + c.r * size, size - 2, size - 2);
        if (c.owner) {
          ctx.strokeStyle = c.owner === 'you' ? '#fff' : '#102010';
          ctx.strokeRect(ox + c.c * size + 2, oy + c.r * size + 2, size - 6, size - 6);
        }
      }
      ctx.fillStyle = '#fff';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`You ${s.you}`, 44, 90);
      ctx.textAlign = 'right';
      ctx.fillText(`Rival ${s.ai}`, 356, 90);
    },
  });

  function pressed(s, w, id) {
    const now = !!w.held[id];
    const was = !!s['_' + id];
    s['_' + id] = now;
    return now && !was;
  }
  function tally(w) {
    const s = w.s;
    s.you = s.cells.filter((c) => c.owner === 'you').length;
    s.ai = s.cells.filter((c) => c.owner === 'ai').length;
    w.setScore(s.you * 10);
  }
  function finish(w) {
    const s = w.s;
    tally(w);
    w.finish(s.you >= s.ai ? 'The grove is yours' : 'The rival shades you', `${s.you} to ${s.ai} after ${s.turn} turns.`);
  }
})();
