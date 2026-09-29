(() => {
  const { roundRect, hexAlpha } = Arcade;

  function reflect(ball, nx, ny, rest, boost) {
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= (1 + rest) * vn * nx;
      ball.vy -= (1 + rest) * vn * ny;
    }
    if (boost) {
      ball.vx += boost.x;
      ball.vy += boost.y;
    }
  }

  function hitSeg(ball, ax, ay, bx, by, rest, boost) {
    const abx = bx - ax;
    const aby = by - ay;
    const len2 = abx * abx + aby * aby || 1;
    let t = ((ball.x - ax) * abx + (ball.y - ay) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    let dx = ball.x - cx;
    let dy = ball.y - cy;
    const d = Math.hypot(dx, dy) || 0.0001;
    if (d >= ball.r) return false;
    dx /= d;
    dy /= d;
    ball.x = cx + dx * ball.r;
    ball.y = cy + dy * ball.r;
    reflect(ball, dx, dy, rest, boost);
    return true;
  }

  Arcade.boot({
    id: 'chrome-pin',
    title: 'Chrome Pin',
    blurb: 'Work a jewel-box table: flippers, pop bumpers, and a hungry drain.',
    hint: 'Use the flipper buttons or the left and right arrow keys.',
    palette: { bg0: '#18080c', bg1: '#301018', accent: '#ff4d6d', accent2: '#ffd1dc' },
    buttons: [
      { id: 'left', label: 'Left', key: 'ArrowLeft' },
      { id: 'right', label: 'Right', key: 'ArrowRight' },
    ],
    setup(w) {
      w.s = {
        ball: { x: 320, y: 560, vx: -80, vy: -680, r: 8 },
        left: 0.45,
        right: Math.PI - 0.45,
        lv: 0,
        rv: 0,
        balls: 3,
        lights: [false, false, false],
        bumpers: [{ x: 140, y: 250, r: 24 }, { x: 250, y: 220, r: 24 }, { x: 200, y: 330, r: 22 }],
      };
      w.setMeta('Ball 1');
    },
    update(w, dt) {
      const s = w.s;
      const sub = 4;
      const h = dt / sub;
      const lTarget = w.held.left ? -0.7 : 0.5;
      const rTarget = w.held.right ? Math.PI + 0.7 : Math.PI - 0.5;
      const prevL = s.left;
      const prevR = s.right;
      s.left += (lTarget - s.left) * Math.min(1, dt * 14);
      s.right += (rTarget - s.right) * Math.min(1, dt * 14);
      s.lv = (s.left - prevL) / Math.max(dt, 0.001);
      s.rv = (s.right - prevR) / Math.max(dt, 0.001);
      for (let i = 0; i < sub; i += 1) {
        s.ball.vy += 640 * h;
        s.ball.x += s.ball.vx * h;
        s.ball.y += s.ball.vy * h;
        const b = s.ball;
        const walls = [[30, 80, 30, 560], [370, 80, 370, 560], [30, 80, 370, 80], [30, 560, 130, 630], [270, 630, 370, 560]];
        for (const wall of walls) hitSeg(b, wall[0], wall[1], wall[2], wall[3], 0.15);
        const lTip = { x: 115 + Math.cos(s.left) * 78, y: 610 + Math.sin(s.left) * 78 };
        const rTip = { x: 285 + Math.cos(s.right) * 78, y: 610 + Math.sin(s.right) * 78 };
        const lBoost = { x: -Math.sin(s.left) * s.lv * 18, y: Math.cos(s.left) * s.lv * 18 };
        const rBoost = { x: -Math.sin(s.right) * s.rv * 18, y: Math.cos(s.right) * s.rv * 18 };
        if (hitSeg(b, 115, 610, lTip.x, lTip.y, 0.2, lBoost)) w.tone(220, 0.03, 'square', 0.02);
        if (hitSeg(b, 285, 610, rTip.x, rTip.y, 0.2, rBoost)) w.tone(220, 0.03, 'square', 0.02);
        s.bumpers.forEach((p, idx) => {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < p.r + b.r) {
            const nx = dx / d;
            const ny = dy / d;
            b.x = p.x + nx * (p.r + b.r);
            b.y = p.y + ny * (p.r + b.r);
            reflect(b, nx, ny, 0.45);
            b.vx += nx * 80;
            b.vy += ny * 80;
            w.addScore(25);
            s.lights[idx] = true;
            w.tone(640 + idx * 40, 0.04, 'sine', 0.03);
            if (s.lights.every(Boolean)) {
              s.lights = [false, false, false];
              w.addScore(150);
              w.floatText(200, 180, 'Jewel set', '#ffd1dc');
            }
          }
        });
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 900) { b.vx *= 900 / sp; b.vy *= 900 / sp; }
      }
      if (s.ball.y > 660 && s.ball.x > 140 && s.ball.x < 260) {
        s.balls -= 1;
        if (s.balls <= 0) {
          w.finish('The drain takes the last ball', 'Keep it on the flippers.');
          return;
        }
        s.ball = { x: 320, y: 540, vx: -60, vy: -700, r: 8 };
        w.setMeta(`Ball ${4 - s.balls}`);
        w.tone(140, 0.1, 'triangle', 0.04);
      }
    },
    draw(w, ctx) {
      const s = w.s;
      roundRect(ctx, 30, 80, 340, 560, 20);
      ctx.fillStyle = '#3a1020';
      ctx.fill();
      ctx.strokeStyle = '#ff4d6d';
      ctx.lineWidth = 3;
      ctx.stroke();
      s.bumpers.forEach((p, i) => {
        ctx.fillStyle = s.lights[i] ? '#ffd1dc' : '#ff4d6d';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(115, 610);
      ctx.lineTo(115 + Math.cos(s.left) * 78, 610 + Math.sin(s.left) * 78);
      ctx.moveTo(285, 610);
      ctx.lineTo(285 + Math.cos(s.right) * 78, 610 + Math.sin(s.right) * 78);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hexAlpha('#ffd1dc', 0.8);
      ctx.font = '600 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.balls} balls`, 200, 110);
    },
  });
})();
