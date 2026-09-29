(() => {
  const { roundRect, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'vault-run',
    title: 'Vault Run',
    blurb: 'Spring wall to wall through a spire of spikes and broken stone.',
    hint: 'Tap to leap to the opposite wall. Land clear of spikes and gaps.',
    palette: { bg0: '#10100c', bg1: '#242018', accent: '#e8ff6a', accent2: '#ff7a3c' },
    setup(w) {
      w.s = { side: 0, x: 54, from: 54, to: 54, jump: 0, speed: 240, dist: 0, hazards: [], spawn: 0, py: 300 };
    },
    onPointer(w, e) {
      if (e.type !== 'down' || w.s.jump > 0) return;
      const s = w.s;
      s.from = s.side === 0 ? 54 : 346;
      s.to = s.side === 0 ? 346 : 54;
      s.jump = 0.28;
      w.tone(620, 0.04, 'square', 0.03);
    },
    onKey(w, e) {
      if (e.type !== 'down' || w.s.jump > 0) return;
      if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
      const s = w.s;
      s.from = s.side === 0 ? 54 : 346;
      s.to = s.side === 0 ? 346 : 54;
      s.jump = 0.28;
      w.tone(620, 0.04, 'square', 0.03);
    },
    update(w, dt) {
      const s = w.s;
      s.dist += s.speed * dt;
      s.speed = 240 + Math.min(280, s.dist * 0.05);
      if (s.jump > 0) {
        s.jump -= dt;
        const t = 1 - Math.max(0, s.jump) / 0.28;
        const e = t * t * (3 - 2 * t);
        s.x = s.from + (s.to - s.from) * e;
        if (s.jump <= 0) {
          s.side = s.side ? 0 : 1;
          s.x = s.side === 0 ? 54 : 346;
        }
      }
      s.spawn -= s.speed * dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(120, 210 - s.dist * 0.02);
        const side = Math.random() < 0.5 ? 0 : 1;
        const kind = Math.random() < 0.55 ? 'spike' : 'gap';
        s.hazards.push({ y: -50, h: kind === 'gap' ? 70 : 36, side, kind });
      }
      for (const h of s.hazards) h.y += s.speed * dt;
      s.hazards = s.hazards.filter((h) => h.y < 760);
      if (s.jump <= 0) {
        for (const h of s.hazards) {
          if (h.side !== s.side) continue;
          if (h.y < s.py + 24 && h.y + h.h > s.py - 24) {
            w.shake(8);
            w.finish(h.kind === 'gap' ? 'The wall is gone' : 'A spike finds you', 'Leap before you land on trouble.');
            return;
          }
        }
      }
      w.setScore(Math.floor(s.dist / 12));
    },
    draw(w, ctx) {
      const s = w.s;
      ctx.fillStyle = '#1a1812';
      ctx.fillRect(0, 0, 28, 680);
      ctx.fillRect(372, 0, 28, 680);
      for (const h of s.hazards) {
        if (h.kind === 'gap') {
          ctx.fillStyle = '#10100c';
          ctx.fillRect(h.side === 0 ? 0 : 372, h.y, 28, h.h);
        } else {
          ctx.fillStyle = '#ff7a3c';
          const x = h.side === 0 ? 20 : 368;
          ctx.beginPath();
          ctx.moveTo(x, h.y);
          ctx.lineTo(h.side === 0 ? 58 : 342, h.y + h.h / 2);
          ctx.lineTo(x, h.y + h.h);
          ctx.fill();
        }
      }
      const lift = s.jump > 0 ? Math.sin((1 - s.jump / 0.28) * Math.PI) * -50 : 0;
      ctx.fillStyle = '#f4ffd2';
      roundRect(ctx, s.x - 14, s.py - 18 + lift, 28, 36, 10);
      ctx.fill();
      ctx.fillStyle = '#243018';
      ctx.fillRect(s.x - 6, s.py - 8 + lift, 14, 5);
      ctx.strokeStyle = hexAlpha('#e8ff6a', 0.4);
      ctx.strokeRect(8, 8, 384, 664);
    },
  });
})();
