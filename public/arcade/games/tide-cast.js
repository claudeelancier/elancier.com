(() => {
  const { roundRect, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'tide-cast',
    title: 'Tide Cast',
    blurb: 'Hook the strike window, then keep the reel inside the living current.',
    hint: 'Tap when the marker sits in the bright band, then hold to steady the reel.',
    palette: { bg0: '#06141c', bg1: '#0c2c3c', accent: '#4ad4ff', accent2: '#d6f6ff' },
    setup(w) {
      w.s = { phase: 'cast', marker: 0, dir: 1, speed: 0.85, quality: 1, reel: 0.5, fish: 0.5, fishV: 0.3, progress: 0, strain: 0, escapes: 0, caught: 0 };
      w.setMeta('Cast');
    },
    onPointer(w, e) {
      const s = w.s;
      if (e.type !== 'down' || s.phase !== 'cast') return;
      const d = Math.abs(s.marker - 0.5);
      s.quality = d < 0.06 ? 1.5 : d < 0.14 ? 1.1 : 0.7;
      s.phase = 'reel';
      s.progress = 0;
      s.strain = 0;
      w.floatText(200, 240, d < 0.06 ? 'Clean hook' : 'Hooked', '#d6f6ff');
      w.tone(620, 0.06, 'sine', 0.03);
      w.setMeta('Reel');
    },
    update(w, dt) {
      const s = w.s;
      if (s.phase === 'cast') {
        s.marker += s.dir * s.speed * dt;
        if (s.marker > 1) { s.marker = 1; s.dir = -1; }
        if (s.marker < 0) { s.marker = 0; s.dir = 1; }
        return;
      }
      if (s.phase !== 'reel') return;
      const hold = w.pointer.down || w.keys.has('Space');
      s.reel += (hold ? 0.85 : -0.7) * dt;
      s.reel = w.clamp(s.reel, 0, 1);
      s.fish += s.fishV * dt;
      if (s.fish > 0.85 || s.fish < 0.15) s.fishV *= -1;
      if (Math.random() < dt * 0.7) s.fishV = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.45);
      const err = Math.abs(s.reel - s.fish);
      if (err < 0.12) s.progress += dt * s.quality;
      else s.strain += dt * (err > 0.28 ? 1.4 : 0.6);
      if (s.strain >= 1) {
        s.escapes += 1;
        s.phase = 'cast';
        s.speed += 0.12;
        w.shake(5);
        w.setMeta(`${3 - s.escapes} lines left`);
        if (s.escapes >= 3) w.finish('The line goes slack', 'Three fish slipped the current.');
        return;
      }
      if (s.progress >= 1) {
        const gain = Math.round(80 * s.quality);
        s.caught += 1;
        w.addScore(gain);
        w.burst(200, 360, '#4ad4ff', 16, 180);
        w.tone(840, 0.08, 'triangle', 0.04);
        s.phase = 'cast';
        s.speed = Math.min(1.8, s.speed + 0.08);
        w.setMeta(`${s.caught} landed`);
      }
    },
    draw(w, ctx) {
      const s = w.s;
      const sea = ctx.createLinearGradient(0, 0, 0, 680);
      sea.addColorStop(0, '#103848');
      sea.addColorStop(1, '#06202c');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, 400, 680);
      roundRect(ctx, 50, 180, 300, 36, 18);
      ctx.fillStyle = '#0b2430';
      ctx.fill();
      ctx.fillStyle = hexAlpha('#4ad4ff', 0.35);
      ctx.fillRect(50 + 150 - 42, 184, 84, 28);
      ctx.fillStyle = '#d6f6ff';
      ctx.fillRect(50 + 150 - 12, 184, 24, 28);
      ctx.fillStyle = '#ffd166';
      roundRect(ctx, 46 + s.marker * 300 - 6, 172, 12, 52, 6);
      ctx.fill();
      ctx.fillStyle = hexAlpha('#ffffff', 0.08);
      roundRect(ctx, 70, 360, 260, 180, 24);
      ctx.fill();
      if (s.phase === 'reel') {
        ctx.fillStyle = '#ff8a7a';
        roundRect(ctx, 90, 390 + (1 - s.fish) * 120, 70, 16, 8);
        ctx.fill();
        ctx.fillStyle = '#d6f6ff';
        roundRect(ctx, 230, 390 + (1 - s.reel) * 120, 70, 16, 8);
        ctx.fill();
        ctx.fillStyle = '#4ad4ff';
        ctx.fillRect(90, 560, 220 * s.progress, 8);
        ctx.fillStyle = '#ff8a7a';
        ctx.fillRect(90, 576, 220 * s.strain, 6);
      } else {
        ctx.fillStyle = '#d6f6ff';
        ctx.font = '600 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tap inside the bright band', 200, 450);
      }
    },
  });
})();
