(() => {
  const { hexAlpha } = Arcade;

  function hit(ax, ay, bx, by, cx, cy, r) {
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby || 1;
    let t = ((cx - ax) * abx + (cy - ay) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const dx = ax + abx * t - cx;
    const dy = ay + aby * t - cy;
    return dx * dx + dy * dy <= r * r;
  }

  Arcade.boot({
    id: 'silk-slice',
    title: 'Silk Slice',
    blurb: 'Cut fruit from the air with a clean swipe and leave the bombs whole.',
    hint: 'Swipe through fruit. Slicing a bomb ends the run.',
    palette: { bg0: '#160c10', bg1: '#321820', accent: '#ff5d8f', accent2: '#ffe66d' },
    setup(w) {
      w.s = { fruits: [], path: [], spawn: 0.4, lives: 3, combo: 0, comboT: 0, t: 0 };
    },
    onPointer(w, e) {
      const s = w.s;
      if (e.type === 'down') s.path = [{ x: e.x, y: e.y }];
      if (e.type === 'move' && w.pointer.down) s.path.push({ x: e.x, y: e.y });
      if (s.path.length > 12) s.path.shift();
    },
    update(w, dt) {
      const s = w.s;
      s.t += dt;
      s.comboT -= dt;
      if (s.comboT <= 0) s.combo = 0;
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.45, 1.05 - s.t * 0.01);
        const bomb = Math.random() < Math.min(0.22, 0.08 + s.t * 0.004);
        s.fruits.push({
          x: 40 + Math.random() * 320,
          y: 700,
          vx: (Math.random() * 80 - 40),
          vy: -520 - Math.random() * 180,
          r: bomb ? 18 : 22,
          bomb,
          rot: Math.random() * 6,
        });
      }
      for (const f of s.fruits) {
        f.vy += 720 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += dt * 2;
      }
      if (s.path.length > 1) {
        for (let i = 1; i < s.path.length; i += 1) {
          const a = s.path[i - 1];
          const b = s.path[i];
          for (const f of s.fruits) {
            if (f.cut) continue;
            if (!hit(a.x, a.y, b.x, b.y, f.x, f.y, f.r)) continue;
            f.cut = true;
            if (f.bomb) {
              w.shake(10);
              w.finish('The bomb splits', 'Cut fruit only. Leave the dark orbs alone.');
              return;
            }
            s.combo += 1;
            s.comboT = 0.7;
            w.addScore(10 + s.combo * 2);
            w.burst(f.x, f.y, '#ffe66d', 8, 140);
            w.tone(700 + s.combo * 20, 0.03, 'sine', 0.025);
          }
        }
      }
      s.fruits = s.fruits.filter((f) => {
        if (f.cut) return false;
        if (f.y > 740 && f.vy > 0 && !f.bomb) {
          s.lives -= 1;
          s.combo = 0;
          if (s.lives <= 0) w.finish('Fruit hits the floor', 'Keep the blade moving.');
          return false;
        }
        return f.y < 780;
      });
      w.setMeta(`${s.lives} lives`);
    },
    draw(w, ctx) {
      const s = w.s;
      for (const f of s.fruits) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        if (f.bomb) {
          ctx.fillStyle = '#2a1020';
          ctx.beginPath();
          ctx.arc(0, 0, f.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ff5d8f';
          ctx.stroke();
        } else {
          ctx.fillStyle = '#ff5d8f';
          ctx.beginPath();
          ctx.arc(0, 0, f.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffe66d';
          ctx.fillRect(-3, -f.r, 6, 10);
        }
        ctx.restore();
      }
      if (s.path.length > 1) {
        ctx.strokeStyle = hexAlpha('#fff', 0.85);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        s.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }
    },
  });
})();
