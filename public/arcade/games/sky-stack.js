(() => {
  const { roundRect, hexAlpha } = Arcade;

  function drop(w) {
    const s = w.s;
    if (s.over) return;
    const prev = s.blocks[s.blocks.length - 1];
    const left = Math.max(s.x, prev.x);
    const right = Math.min(s.x + s.w, prev.x + prev.w);
    let overlap = right - left;
    const perfect = Math.abs(s.x - prev.x) < 7;
    if (perfect) {
      overlap = prev.w;
      s.x = prev.x;
      s.perfect += 1;
      w.addScore(25 + s.perfect * 10);
      w.floatText(200, s.y - 20, s.perfect > 1 ? `Perfect x${s.perfect}` : 'Perfect', '#ffe7a3');
      w.tone(880, 0.06, 'triangle', 0.04);
      w.burst(s.x + s.w / 2, s.y, '#ffb020', 12, 160);
    } else if (overlap < 8) {
      w.shake(8);
      w.finish('The tower slips', 'Land closer to the slab beneath.');
      return;
    } else {
      s.perfect = 0;
      w.addScore(10);
    }
    s.blocks.push({ x: perfect ? prev.x : left, y: s.y, w: overlap, h: 24 });
    s.w = overlap;
    s.y -= 24;
    s.speed += 10;
    s.x = s.dir > 0 ? -s.w : 400;
    if (s.y < 240) {
      const dy = 240 - s.y;
      s.y += dy;
      s.blocks.forEach((b) => { b.y += dy; });
    }
    s.blocks = s.blocks.filter((b) => b.y < 720);
  }

  Arcade.boot({
    id: 'sky-stack',
    title: 'Sky Stack',
    blurb: 'Drop sliding slabs into a perfect tower before the wind wins.',
    hint: 'Tap to drop the moving slab. Perfect alignment keeps your width.',
    palette: { bg0: '#0c1018', bg1: '#1c2436', accent: '#ffb020', accent2: '#ffe7a3' },
    setup(w) {
      w.s = { blocks: [{ x: 110, y: 600, w: 180, h: 24 }], x: -180, y: 576, w: 180, dir: 1, speed: 170, perfect: 0 };
    },
    onPointer(w, e) { if (e.type === 'down') drop(w); },
    onKey(w, e) { if (e.type === 'down' && (e.code === 'Space' || e.code === 'ArrowDown')) drop(w); },
    update(w, dt) {
      const s = w.s;
      s.x += s.dir * s.speed * dt;
      if (s.x > 400) { s.x = 400; s.dir = -1; }
      if (s.x + s.w < 0) { s.x = -s.w; s.dir = 1; }
    },
    draw(w, ctx) {
      const s = w.s;
      for (let i = 0; i < 8; i += 1) {
        ctx.fillStyle = hexAlpha('#ffffff', 0.04 + (i % 3) * 0.02);
        ctx.fillRect(0, 80 + i * 70, 400, 28);
      }
      for (const b of s.blocks) {
        const grd = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        grd.addColorStop(0, '#ffe7a3');
        grd.addColorStop(1, '#ffb020');
        ctx.fillStyle = grd;
        roundRect(ctx, b.x, b.y, b.w, b.h, 6);
        ctx.fill();
      }
      ctx.fillStyle = '#fff';
      roundRect(ctx, s.x, s.y, s.w, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#ffb020';
      ctx.fillRect(s.x + 8, s.y + 8, Math.max(0, s.w - 16), 4);
    },
  });
})();
