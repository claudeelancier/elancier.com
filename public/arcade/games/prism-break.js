(() => {
  const { roundRect, aabb, hexAlpha } = Arcade;

  const PATTERNS = [
    (c, r) => r < 5,
    (c, r) => (c + r) % 2 === 0 && r < 6,
    (c, r) => r < 6 && Math.abs(c - 3.5) + r > 2,
    (c, r) => r % 2 === 0 && r < 6,
  ];

  function makeLevel(n) {
    const bricks = [];
    const pat = PATTERNS[n % PATTERNS.length];
    for (let r = 0; r < 6; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        if (!pat(c, r)) continue;
        bricks.push({ x: 28 + c * 44, y: 70 + r * 24, w: 40, h: 18, hue: (c * 30 + r * 20 + n * 40) % 360, hp: n > 2 && (c + r) % 5 === 0 ? 2 : 1 });
      }
    }
    return bricks;
  }

  Arcade.boot({
    id: 'prism-break',
    title: 'Prism Break',
    blurb: 'Volley a prism ball through glass battlements and shifting powerups.',
    hint: 'Drag to move the bat. Catch falling shards for a wider bat or extra balls.',
    palette: { bg0: '#120c18', bg1: '#241430', accent: '#b388ff', accent2: '#5ce1ff' },
    setup(w) {
      w.s = {
        level: 0,
        paddle: 160,
        width: 78,
        balls: [{ x: 200, y: 520, vx: 160, vy: -280 }],
        bricks: makeLevel(0),
        drops: [],
        lives: 3,
        wide: 0,
      };
      w.setMeta('Prism 1');
    },
    update(w, dt) {
      const s = w.s;
      if (w.pointer.down) s.paddle = w.clamp(w.pointer.x - s.width / 2, 16, 384 - s.width);
      if (w.keys.has('ArrowLeft')) s.paddle = Math.max(16, s.paddle - 320 * dt);
      if (w.keys.has('ArrowRight')) s.paddle = Math.min(384 - s.width, s.paddle + 320 * dt);
      s.wide -= dt;
      if (s.wide <= 0) s.width = 78;
      for (const b of s.balls) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < 12 || b.x > 388) b.vx *= -1;
        if (b.y < 16) b.vy = Math.abs(b.vy);
        if (b.y > 600 && b.vy > 0 && b.x > s.paddle && b.x < s.paddle + s.width) {
          const hit = (b.x - (s.paddle + s.width / 2)) / (s.width / 2);
          b.vy = -Math.abs(b.vy) - 10;
          b.vx = hit * 280;
          w.tone(440, 0.03, 'square', 0.02);
        }
        for (const brick of s.bricks) {
          if (brick.hp <= 0) continue;
          if (!aabb(b.x - 7, b.y - 7, 14, 14, brick.x, brick.y, brick.w, brick.h)) continue;
          brick.hp -= 1;
          b.vy *= -1;
          w.addScore(15);
          w.burst(brick.x + 20, brick.y + 9, `hsl(${brick.hue} 80% 65%)`, 6, 80);
          if (brick.hp <= 0 && Math.random() < 0.18) s.drops.push({ x: brick.x + 12, y: brick.y, kind: Math.random() < 0.5 ? 'wide' : 'multi' });
          break;
        }
      }
      s.bricks = s.bricks.filter((b) => b.hp > 0);
      for (const d of s.drops) d.y += 160 * dt;
      s.drops = s.drops.filter((d) => {
        if (d.y > 600 && d.x > s.paddle && d.x < s.paddle + s.width) {
          if (d.kind === 'wide') { s.width = 120; s.wide = 8; }
          else s.balls.push({ x: 200, y: 500, vx: -160, vy: -260 });
          w.tone(760, 0.05, 'sine', 0.03);
          return false;
        }
        return d.y < 680;
      });
      const alive = s.balls.filter((b) => b.y < 700);
      if (alive.length !== s.balls.length) {
        s.balls = alive;
        if (!s.balls.length) {
          s.lives -= 1;
          if (s.lives <= 0) {
            w.finish('The prism falls', 'Keep the ball above the bat.');
            return;
          }
          s.balls.push({ x: s.paddle + s.width / 2, y: 520, vx: 140, vy: -280 });
        }
      }
      if (!s.bricks.length) {
        s.level += 1;
        s.bricks = makeLevel(s.level);
        s.balls = [{ x: 200, y: 520, vx: 170 + s.level * 10, vy: -300 - s.level * 8 }];
        w.addScore(200);
        w.setMeta(`Prism ${s.level + 1}`);
        w.tone(880, 0.08, 'triangle', 0.04);
      }
    },
    draw(w, ctx) {
      const s = w.s;
      for (const b of s.bricks) {
        ctx.fillStyle = `hsl(${b.hue} 75% ${b.hp > 1 ? 62 : 58}%)`;
        roundRect(ctx, b.x, b.y, b.w, b.h, 5);
        ctx.fill();
      }
      for (const d of s.drops) {
        ctx.fillStyle = d.kind === 'wide' ? '#5ce1ff' : '#ffe27a';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f6f2ff';
      roundRect(ctx, s.paddle, 608, s.width, 14, 7);
      ctx.fill();
      for (const b of s.balls) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = hexAlpha('#b388ff', 0.8);
      for (let i = 0; i < s.lives; i += 1) ctx.fillRect(24 + i * 16, 644, 10, 10);
    },
  });
})();
