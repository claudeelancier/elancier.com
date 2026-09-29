(() => {
  const { glow, hexAlpha } = Arcade;
  const COLORS = ['#7dffe1', '#c8b6ff', '#ffe27a', '#ff8fb8', '#8ec8ff', '#ffb07a'];

  Arcade.boot({
    id: 'echo-chamber',
    title: 'Echo Chamber',
    blurb: 'Watch the chamber glow, then repeat the phrase as the pads drift.',
    hint: 'Repeat the pattern in order. The phrase grows after every success.',
    palette: { bg0: '#0c1014', bg1: '#182028', accent: '#7dffe1', accent2: '#c8b6ff' },
    setup(w) {
      const pads = basePads();
      w.s = { pads, targets: pads.map((p) => ({ ...p })), seq: [0], phase: 'show', index: 0, timer: 0.4, lit: -1, input: 0 };
      w.setMeta('Listen');
    },
    onPointer(w, e) {
      const s = w.s;
      if (e.type !== 'down' || s.phase !== 'input') return;
      const hit = s.pads.findIndex((p) => Math.hypot(p.x - e.x, p.y - e.y) < 36);
      if (hit < 0) return;
      s.lit = hit;
      s.timer = 0.15;
      if (hit !== s.seq[s.input]) {
        w.shake(6);
        w.finish('The echo breaks', `You repeated ${Math.max(0, s.seq.length - 1)} tones.`);
        return;
      }
      w.tone(420 + hit * 70, 0.06, 'sine', 0.03);
      s.input += 1;
      if (s.input >= s.seq.length) {
        w.addScore(s.seq.length * 20);
        s.seq.push((Math.random() * 6) | 0);
        s.targets = basePads().map((p) => ({ x: p.x + (Math.random() * 24 - 12), y: p.y + (Math.random() * 24 - 12) }));
        s.phase = 'show';
        s.index = 0;
        s.timer = 0.35;
        w.setMeta('Listen');
      }
    },
    update(w, dt) {
      const s = w.s;
      s.pads.forEach((p, i) => {
        p.x = w.lerp(p.x, s.targets[i].x, 1 - Math.pow(0.02, dt));
        p.y = w.lerp(p.y, s.targets[i].y, 1 - Math.pow(0.02, dt));
      });
      s.timer -= dt;
      if (s.phase !== 'show') return;
      if (s.timer > 0) return;
      if (s.index >= s.seq.length) {
        s.phase = 'input';
        s.input = 0;
        s.lit = -1;
        w.setMeta('Your turn');
        return;
      }
      s.lit = s.seq[s.index];
      w.tone(420 + s.lit * 70, 0.07, 'sine', 0.035);
      s.index += 1;
      s.timer = Math.max(0.28, 0.55 - s.seq.length * 0.03);
    },
    draw(w, ctx) {
      const s = w.s;
      s.pads.forEach((p, i) => {
        const on = s.lit === i;
        if (on) glow(ctx, p.x, p.y, 40, hexAlpha(COLORS[i], 0.55));
        ctx.fillStyle = on ? '#fff' : COLORS[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = hexAlpha('#ffffff', 0.75);
      ctx.font = '600 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.phase === 'show' ? 'Listen' : `${s.input}/${s.seq.length}`, 200, 120);
    },
  });

  function basePads() {
    return Array.from({ length: 6 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      return { x: 200 + Math.cos(a) * 120, y: 360 + Math.sin(a) * 120 };
    });
  }
})();
