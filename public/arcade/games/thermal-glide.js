(() => {
  const { roundRect, glow, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'thermal-glide',
    title: 'Thermal Glide',
    blurb: 'Trade altitude for speed and ride columns of warm air.',
    hint: 'Hold to dive and gain speed. Release to climb. Thermals lift you for free.',
    palette: { bg0: '#140e08', bg1: '#2c1c10', accent: '#ff9a3c', accent2: '#ffe1b0' },
    setup(w) {
      w.s = { y: 300, speed: 140, dist: 0, thermals: [{ x: 500, top: 180, h: 220 }], rings: [{ x: 360, y: 280 }], spawnT: 420, spawnR: 260 };
    },
    update(w, dt) {
      const s = w.s;
      const hold = w.pointer.down || w.keys.has('Space') || w.keys.has('ArrowDown');
      if (hold) {
        s.speed = Math.min(320, s.speed + 110 * dt);
        s.y += (50 + s.speed * 0.35) * dt;
      } else if (s.speed > 80) {
        s.y -= 90 * dt;
        s.speed -= 40 * dt;
      } else {
        s.y += 50 * dt;
        s.speed = Math.max(40, s.speed - 20 * dt);
      }
      s.dist += s.speed * dt;
      for (const t of s.thermals) {
        t.x -= s.speed * dt;
        if (!hold && s.y > t.top && s.y < t.top + t.h && Math.abs(t.x - 110) < 36) {
          s.y -= 160 * dt;
          s.speed = Math.min(300, s.speed + 30 * dt);
        }
      }
      s.spawnT -= s.speed * dt;
      if (s.spawnT <= 0) {
        s.spawnT = 380;
        s.thermals.push({ x: 460, top: 140 + Math.random() * 200, h: 180 });
      }
      for (const r of s.rings) r.x -= s.speed * dt;
      s.spawnR -= s.speed * dt;
      if (s.spawnR <= 0) {
        s.spawnR = 240;
        s.rings.push({ x: 460, y: 140 + Math.random() * 360 });
      }
      s.thermals = s.thermals.filter((t) => t.x > -80);
      s.rings = s.rings.filter((r) => {
        if (!r.got && r.x < 120 && r.x > 90 && Math.abs(r.y - s.y) < 28) {
          r.got = true;
          s.bonus = (s.bonus || 0) + 30;
          w.tone(760, 0.04, 'sine', 0.03);
        }
        return r.x > -40;
      });
      if (s.y > 640 || s.y < 40 || s.speed < 36) {
        w.finish(s.speed < 36 ? 'The wings stall' : 'The air runs out', 'Dive for speed, then spend it on the climb.');
        return;
      }
      w.setScore(Math.floor(s.dist / 20) + (s.bonus || 0));
    },
    draw(w, ctx) {
      const s = w.s;
      const sky = ctx.createLinearGradient(0, 0, 0, 680);
      sky.addColorStop(0, '#3a2414');
      sky.addColorStop(1, '#1a100a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 400, 680);
      for (const t of s.thermals) {
        const g = ctx.createLinearGradient(0, t.top, 0, t.top + t.h);
        g.addColorStop(0, hexAlpha('#ff9a3c', 0));
        g.addColorStop(0.5, hexAlpha('#ff9a3c', 0.28));
        g.addColorStop(1, hexAlpha('#ff9a3c', 0));
        ctx.fillStyle = g;
        ctx.fillRect(t.x - 28, t.top, 56, t.h);
      }
      for (const r of s.rings) {
        ctx.strokeStyle = r.got ? hexAlpha('#fff', 0.25) : '#ffe1b0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(110, s.y);
      ctx.rotate(w.pointer.down ? 0.4 : -0.25);
      ctx.fillStyle = '#fff4e6';
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-16, -8);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-16, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      glow(ctx, 110, s.y, 20, hexAlpha('#ff9a3c', 0.3));
    },
  });
})();
