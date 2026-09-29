(() => {
  const { hexAlpha } = Arcade;
  const RAD = [16, 22, 29, 38, 48, 60];
  const COL = ['#ff8a7a', '#ffb020', '#ffe27a', '#7dffb0', '#7ecbff', '#ff6ad5'];

  function separate(a, b) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let d = Math.hypot(dx, dy) || 0.01;
    const min = a.r + b.r;
    if (d >= min) return false;
    const overlap = min - d;
    dx /= d;
    dy /= d;
    const ma = a.r * a.r;
    const mb = b.r * b.r;
    const tm = ma + mb;
    a.x -= dx * overlap * (mb / tm);
    a.y -= dy * overlap * (mb / tm);
    b.x += dx * overlap * (ma / tm);
    b.y += dy * overlap * (ma / tm);
    return true;
  }

  Arcade.boot({
    id: 'nectar-drop',
    title: 'Nectar Drop',
    blurb: 'Drop orchard fruit into a bowl and fuse matching sizes.',
    hint: 'Tap to drop the fruit. Matching fruits merge into the next size.',
    palette: { bg0: '#1a0e10', bg1: '#3a1820', accent: '#ff6b6b', accent2: '#ffd166' },
    setup(w) {
      w.s = { fruits: [], next: 0, hold: 0.2, danger: 0, x: 200 };
    },
    onPointer(w, e) {
      const s = w.s;
      s.x = w.clamp(e.x, 70, 330);
      if (e.type !== 'down' || s.hold > 0) return;
      s.fruits.push({ x: s.x, y: 70, vx: 0, vy: 0, r: RAD[s.next], lv: s.next, fresh: true });
      s.next = Math.random() < 0.8 ? 0 : Math.random() < 0.75 ? 1 : 2;
      s.hold = 0.45;
      w.tone(500, 0.03, 'sine', 0.025);
    },
    update(w, dt) {
      const s = w.s;
      s.hold -= dt;
      const left = 48;
      const right = 352;
      const floor = 630;
      for (const f of s.fruits) {
        f.vy += 1400 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < left + f.r) { f.x = left + f.r; f.vx *= -0.2; }
        if (f.x > right - f.r) { f.x = right - f.r; f.vx *= -0.2; }
        if (f.y > floor - f.r) { f.y = floor - f.r; f.vy *= -0.18; f.vx *= 0.8; }
        if (Math.hypot(f.vx, f.vy) < 36 && f.y > 140) f.fresh = false;
      }
      for (let n = 0; n < 6; n += 1) {
        for (let i = 0; i < s.fruits.length; i += 1) {
          for (let j = i + 1; j < s.fruits.length; j += 1) separate(s.fruits[i], s.fruits[j]);
        }
      }
      let merged = false;
      for (let i = 0; i < s.fruits.length && !merged; i += 1) {
        for (let j = i + 1; j < s.fruits.length; j += 1) {
          const a = s.fruits[i];
          const b = s.fruits[j];
          if (a.lv !== b.lv || a.lv >= RAD.length - 1) continue;
          if (Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r + 1) continue;
          const lv = a.lv + 1;
          s.fruits = s.fruits.filter((f) => f !== a && f !== b);
          s.fruits.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: 0, vy: -40, r: RAD[lv], lv, fresh: false });
          w.addScore((lv + 1) * (lv + 1) * 8);
          w.burst((a.x + b.x) / 2, (a.y + b.y) / 2, COL[lv], 10, 120);
          w.tone(600 + lv * 40, 0.05, 'triangle', 0.03);
          merged = true;
          break;
        }
      }
      const crowded = s.fruits.some((f) => !f.fresh && f.y - f.r < 150 && Math.hypot(f.vx, f.vy) < 40);
      s.danger = crowded ? s.danger + dt : 0;
      if (s.danger > 1.15) w.finish('The bowl overflows', 'Merge fruit before it stacks over the line.');
    },
    draw(w, ctx) {
      const s = w.s;
      ctx.strokeStyle = hexAlpha('#ffd166', 0.8);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(48, 150);
      ctx.lineTo(48, 630);
      ctx.lineTo(352, 630);
      ctx.lineTo(352, 150);
      ctx.stroke();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = hexAlpha('#ff6b6b', 0.5);
      ctx.beginPath();
      ctx.moveTo(56, 168);
      ctx.lineTo(344, 168);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const f of s.fruits) {
        ctx.fillStyle = COL[f.lv];
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      if (s.hold <= 0) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = COL[s.next];
        ctx.beginPath();
        ctx.arc(s.x, 78, RAD[s.next], 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
  });
})();
