(() => {
  const { roundRect, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'canopy-catch',
    title: 'Canopy Catch',
    blurb: 'Slide a woven basket through a shower of fruit and thorns.',
    hint: 'Drag the basket. Catch fruit. Avoid thorns.',
    palette: { bg0: '#10160c', bg1: '#1e2a14', accent: '#c6f27a', accent2: '#ff8fab' },
    setup(w) {
      w.s = { x: 200, items: [], spawn: 0.2, lives: 3, speed: 140, t: 0, combo: 0 };
    },
    update(w, dt) {
      const s = w.s;
      s.t += dt;
      if (w.pointer.down) s.x = w.clamp(w.pointer.x, 40, 360);
      if (w.keys.has('ArrowLeft')) s.x = Math.max(40, s.x - 280 * dt);
      if (w.keys.has('ArrowRight')) s.x = Math.min(360, s.x + 280 * dt);
      s.speed = 140 + Math.min(220, s.t * 6);
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.28, 0.7 - s.t * 0.008);
        const roll = Math.random();
        const kind = roll < 0.18 ? 'thorn' : roll < 0.28 ? 'gold' : 'fruit';
        s.items.push({ x: 30 + Math.random() * 340, y: -20, kind });
      }
      s.items.forEach((item) => { item.y += s.speed * dt; });
      s.items = s.items.filter((item) => {
        const caught = item.y > 560 && item.y < 610 && Math.abs(item.x - s.x) < 42;
        if (caught) {
          if (item.kind === 'thorn') {
            s.lives -= 1;
            s.combo = 0;
            w.shake(5);
            if (s.lives <= 0) w.finish('Thorns find the basket', 'Catch fruit and let the thorns pass.');
          } else {
            s.combo += 1;
            w.addScore((item.kind === 'gold' ? 25 : 10) + s.combo);
            w.burst(item.x, item.y, item.kind === 'gold' ? '#ffe27a' : '#c6f27a', 6, 80);
          }
          return false;
        }
        return item.y < 700;
      });
      w.setMeta(`Combo ${s.combo}`);
    },
    draw(w, ctx) {
      const s = w.s;
      for (let i = 0; i < 6; i += 1) {
        ctx.fillStyle = hexAlpha('#c6f27a', 0.05 + (i % 2) * 0.04);
        ctx.beginPath();
        ctx.arc(40 + i * 70, 80 + (i % 3) * 30, 40, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const item of s.items) {
        if (item.kind === 'thorn') {
          ctx.strokeStyle = '#ff8fab';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(item.x, item.y - 10);
          ctx.lineTo(item.x + 8, item.y + 8);
          ctx.moveTo(item.x, item.y - 10);
          ctx.lineTo(item.x - 8, item.y + 8);
          ctx.moveTo(item.x - 8, item.y);
          ctx.lineTo(item.x + 8, item.y);
          ctx.stroke();
        } else {
          ctx.fillStyle = item.kind === 'gold' ? '#ffe27a' : '#ff8a6a';
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.kind === 'gold' ? 9 : 11, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#d8b07a';
      roundRect(ctx, s.x - 36, 575, 72, 18, 8);
      ctx.fill();
      ctx.strokeStyle = '#8a6238';
      ctx.beginPath();
      ctx.arc(s.x, 575, 36, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#ff8fab';
      for (let i = 0; i < s.lives; i += 1) ctx.fillRect(24 + i * 18, 640, 12, 12);
    },
  });
})();
