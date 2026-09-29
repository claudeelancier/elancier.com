(() => {
  const { roundRect, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'balloon-meter',
    title: 'Balloon Meter',
    blurb: 'Heat a paper balloon so it rides inside a wandering altitude band.',
    hint: 'Hold to add heat. Release to cool. Stay inside the glowing band.',
    palette: { bg0: '#1a120c', bg1: '#3a2418', accent: '#ff7a4a', accent2: '#ffe08a' },
    setup(w) {
      w.s = { heat: 0.45, y: 340, vy: 0, band: 320, bandV: 30, shield: 3, hurt: 0, t: 0, inside: 0 };
    },
    update(w, dt) {
      const s = w.s;
      s.t += dt;
      const hold = w.pointer.down || w.keys.has('Space');
      s.heat = w.clamp(s.heat + (hold ? 0.42 : -0.25) * dt, 0, 1);
      if (Math.random() < dt * 0.35) s.bandV = (Math.random() * 70 - 35);
      s.band = w.clamp(s.band + s.bandV * dt, 160, 540);
      const target = 560 - s.heat * 420;
      s.vy += (target - s.y) * 1.8 * dt;
      s.vy *= Math.pow(0.15, dt);
      if (Math.sin(s.t * 0.7) > 0.97) s.vy += 80 * dt;
      s.y += s.vy;
      const half = 70;
      if (Math.abs(s.y - s.band) < half) {
        s.inside += dt;
        s.hurt = Math.max(0, s.hurt - dt);
      } else {
        s.hurt += dt;
        if (s.hurt > 0.8) {
          s.shield -= 1;
          s.hurt = 0;
          w.shake(5);
          if (s.shield <= 0) {
            w.finish('The envelope cools', 'Stay inside the wandering band.');
            return;
          }
        }
      }
      w.setScore(Math.floor(s.inside * 10));
      w.setMeta(`${s.shield} envelopes`);
    },
    draw(w, ctx) {
      const s = w.s;
      const sky = ctx.createLinearGradient(0, 0, 0, 680);
      sky.addColorStop(0, '#5a341e');
      sky.addColorStop(1, '#1a120c');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 400, 680);
      ctx.fillStyle = hexAlpha('#ffe08a', 0.18);
      ctx.fillRect(40, s.band - 70, 320, 140);
      ctx.strokeStyle = '#ffe08a';
      ctx.strokeRect(40, s.band - 70, 320, 140);
      const x = 200;
      ctx.strokeStyle = hexAlpha('#3a2418', 0.5);
      ctx.beginPath();
      ctx.moveTo(x, s.y + 20);
      ctx.lineTo(x - 16, s.y + 70);
      ctx.lineTo(x + 16, s.y + 70);
      ctx.stroke();
      ctx.fillStyle = `hsl(${18 + s.heat * 20} 90% ${52 + s.heat * 10}%)`;
      ctx.beginPath();
      ctx.ellipse(x, s.y, 28, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2418';
      roundRect(ctx, x - 16, s.y + 62, 32, 10, 3);
      ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(30, 640, s.heat * 120, 8);
    },
  });
})();
