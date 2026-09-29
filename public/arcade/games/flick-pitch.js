(() => {
  const { roundRect, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'flick-pitch',
    title: 'Flick Pitch',
    blurb: 'Bend a shot past a reading keeper and into the night net.',
    hint: 'Drag back from the ball and release to shoot.',
    palette: { bg0: '#0c1a10', bg1: '#143222', accent: '#7dff6a', accent2: '#f4fff0' },
    setup(w) {
      w.s = { phase: 'aim', ballX: 200, ballY: 560, start: null, flight: 0, target: 200, goalie: 200, misses: 0, goals: 0 };
    },
    onPointer(w, e) {
      const s = w.s;
      if (s.phase !== 'aim') return;
      if (e.type === 'down') s.start = { x: e.x, y: e.y };
      if (e.type === 'up' && s.start) {
        const pullX = s.start.x - e.x;
        const pullY = s.start.y - e.y;
        if (pullY < 36) { s.start = null; return; }
        s.target = w.clamp(200 + pullX * 1.35, 30, 370);
        s.flight = 0.75;
        s.phase = 'fly';
        s.power = Math.min(1, pullY / 180);
        w.tone(520, 0.05, 'triangle', 0.03);
      }
    },
    update(w, dt) {
      const s = w.s;
      if (s.phase === 'fly') {
        s.flight -= dt;
        const limit = 70 + s.goals * 18;
        const dir = Math.sign(s.target - s.goalie) || 1;
        s.goalie += dir * Math.min(Math.abs(s.target - s.goalie), limit * dt);
        if (s.flight <= 0) {
          const inGoal = s.target > 116 && s.target < 284;
          const saved = Math.abs(s.target - s.goalie) < 26;
          if (inGoal && !saved) {
            s.goals += 1;
            w.addScore(50);
            w.floatText(200, 300, 'Goal', '#fff');
            w.tone(840, 0.08, 'sine', 0.04);
            w.burst(s.target, 150, '#7dff6a', 14, 160);
          } else {
            s.misses += 1;
            w.floatText(200, 300, saved ? 'Saved' : 'Wide', '#ff8a7a');
            w.shake(4);
          }
          s.phase = 'aim';
          s.start = null;
          w.setMeta(`${s.goals} goals`);
          if (s.misses >= 3) w.finish('Full time', `${s.goals} goals before three misses.`);
        }
      }
    },
    draw(w, ctx) {
      const s = w.s;
      ctx.fillStyle = '#1d4a28';
      ctx.fillRect(0, 80, 400, 520);
      ctx.strokeStyle = hexAlpha('#f4fff0', 0.35);
      ctx.strokeRect(70, 80, 260, 160);
      ctx.fillStyle = '#f4fff0';
      ctx.fillRect(110, 90, 8, 70);
      ctx.fillRect(282, 90, 8, 70);
      ctx.fillRect(110, 90, 180, 6);
      const gy = 150;
      ctx.fillStyle = '#ffd166';
      roundRect(ctx, s.goalie - 18, gy - 8, 36, 18, 6);
      ctx.fill();
      let x = 200;
      let y = 560;
      if (s.phase === 'fly') {
        const t = 1 - s.flight / 0.75;
        x = 200 + (s.target - 200) * t;
        y = 560 + (130 - 560) * t;
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      if (s.phase === 'aim' && s.start && w.pointer.down) {
        ctx.strokeStyle = '#7dff6a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(200, 560);
        ctx.lineTo(200 - (s.start.x - w.pointer.x), 560 - (s.start.y - w.pointer.y));
        ctx.stroke();
      }
    },
  });
})();
