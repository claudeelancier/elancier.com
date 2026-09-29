(() => {
  const { roundRect } = Arcade;
  const N = 4;

  function mural(ctx, seed) {
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = `hsl(${(seed * 40 + i * 28) % 360} 70% ${45 + (i % 3) * 10}%)`;
      ctx.beginPath();
      ctx.arc(80 + (i % 4) * 40, 90 + ((i * 3) % 5) * 36, 50 + (i % 3) * 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(40, 40, 240, 12);
    ctx.fillRect(40, 200, 12, 180);
  }

  function neighbors(a, b) {
    return Math.abs((a % N) - (b % N)) + Math.abs(Math.floor(a / N) - Math.floor(b / N)) === 1;
  }

  Arcade.boot({
    id: 'slide-atelier',
    title: 'Slide Atelier',
    blurb: 'Restore a shattered mural one sliding tile at a time.',
    hint: 'Tap a tile beside the gap to slide it into place.',
    palette: { bg0: '#141018', bg1: '#241c28', accent: '#ffb3c7', accent2: '#c9b6ff' },
    setup(w) {
      const tiles = [...Array(N * N).keys()];
      let empty = N * N - 1;
      let prev = -1;
      for (let i = 0; i < 80; i += 1) {
        const opts = tiles.map((_, idx) => idx).filter((idx) => idx !== prev && neighbors(idx, empty));
        const pick = opts[(Math.random() * opts.length) | 0];
        tiles[empty] = tiles[pick];
        tiles[pick] = N * N - 1;
        prev = empty;
        empty = pick;
      }
      w.s = { tiles, empty, level: 1, time: 0 };
      w.setMeta('Mural 1');
    },
    onPointer(w, e) {
      const s = w.s;
      const size = 78;
      const ox = 44;
      const oy = 160;
      const c = Math.floor((e.x - ox) / size);
      const r = Math.floor((e.y - oy) / size);
      if (e.type !== 'down' || c < 0 || r < 0 || c >= N || r >= N) return;
      const idx = r * N + c;
      if (!neighbors(idx, s.empty)) return;
      s.tiles[s.empty] = s.tiles[idx];
      s.tiles[idx] = N * N - 1;
      s.empty = idx;
      w.tone(540, 0.03, 'sine', 0.02);
      if (s.tiles.every((t, i) => t === i)) {
        w.addScore(Math.max(50, 400 - Math.floor(s.time)));
        s.level += 1;
        const tiles = [...Array(N * N).keys()];
        let empty = N * N - 1;
        for (let i = 0; i < 40 + s.level * 10; i += 1) {
          const opts = [empty - 1, empty + 1, empty - N, empty + N].filter((n) => n >= 0 && n < N * N && neighbors(n, empty));
          const pick = opts[(Math.random() * opts.length) | 0];
          tiles[empty] = tiles[pick];
          tiles[pick] = N * N - 1;
          empty = pick;
        }
        s.tiles = tiles;
        s.empty = empty;
        s.time = 0;
        w.setMeta(`Mural ${s.level}`);
        w.floatText(200, 130, 'Restored', '#fff');
      }
    },
    update(w, dt) { w.s.time += dt; },
    draw(w, ctx) {
      const s = w.s;
      const size = 78;
      const ox = 44;
      const oy = 160;
      for (let i = 0; i < N * N; i += 1) {
        const id = s.tiles[i];
        if (id === N * N - 1) continue;
        const x = ox + (i % N) * size;
        const y = oy + Math.floor(i / N) * size;
        ctx.save();
        roundRect(ctx, x + 3, y + 3, size - 6, size - 6, 10);
        ctx.clip();
        ctx.translate(x + 3 - (id % N) * size, y + 3 - Math.floor(id / N) * size);
        mural(ctx, s.level);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        roundRect(ctx, x + 3, y + 3, size - 6, size - 6, 10);
        ctx.stroke();
      }
    },
  });
})();
