(() => {
  const { roundRect } = Arcade;
  const WORDS = ['ORBIT', 'MARBLE', 'VELVET', 'CANYON', 'SILVER', 'AMBER', 'CORAL', 'MAPLE', 'RIVER', 'CLOUD', 'PEARL', 'FALCON', 'MOSAIC', 'QUARTZ', 'WILLOW', 'BREEZE', 'EMBER', 'NECTAR', 'COBALT', 'MEADOW', 'VIOLET'];
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  Arcade.boot({
    id: 'letterfall',
    title: 'Letterfall',
    blurb: 'Catch the next letter of each word as the alphabet tumbles past.',
    hint: 'Tap the next letter of the word. Wrong taps and missed letters cost a life.',
    palette: { bg0: '#12100e', bg1: '#262018', accent: '#f3e6d0', accent2: '#e25b3a' },
    setup(w) {
      w.s = { word: WORDS[(Math.random() * WORDS.length) | 0], at: 0, letters: [], spawn: 0.2, lives: 3, speed: 90, words: 0 };
      w.setMeta('3 lives');
    },
    onPointer(w, e) {
      if (e.type !== 'down') return;
      const s = w.s;
      const hit = s.letters.find((L) => Math.hypot(L.x - e.x, L.y - e.y) < 28);
      if (!hit) return;
      const need = s.word[s.at];
      if (hit.ch === need) {
        s.at += 1;
        w.addScore(15);
        w.burst(hit.x, hit.y, '#f3e6d0', 8, 100);
        w.tone(720, 0.04, 'sine', 0.03);
        s.letters = s.letters.filter((L) => L !== hit);
        if (s.at >= s.word.length) {
          s.words += 1;
          s.word = WORDS[(Math.random() * WORDS.length) | 0];
          s.at = 0;
          s.speed += 12;
          w.addScore(40);
          w.floatText(200, 180, s.word, '#fff');
        }
      } else {
        hurt(w);
        s.letters = s.letters.filter((L) => L !== hit);
      }
    },
    update(w, dt) {
      const s = w.s;
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.38, 0.85 - s.words * 0.04);
        const need = s.word[s.at];
        const ch = Math.random() < 0.45 ? need : ALPHA[(Math.random() * 26) | 0];
        s.letters.push({ ch, x: 40 + Math.random() * 320, y: -20, need: ch === need });
      }
      s.letters.forEach((L) => { L.y += s.speed * dt; });
      s.letters = s.letters.filter((L) => {
        if (L.y < 690) return true;
        if (L.ch === s.word[s.at]) hurt(w);
        return false;
      });
    },
    draw(w, ctx) {
      const s = w.s;
      ctx.fillStyle = '#f3e6d0';
      ctx.font = '700 42px Sora, Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < s.word.length; i += 1) {
        ctx.globalAlpha = i < s.at ? 1 : 0.35;
        ctx.fillText(s.word[i], 80 + i * 48, 120);
      }
      ctx.globalAlpha = 1;
      for (const L of s.letters) {
        ctx.fillStyle = '#2a211c';
        roundRect(ctx, L.x - 20, L.y - 20, 40, 40, 10);
        ctx.fill();
        ctx.fillStyle = '#f3e6d0';
        ctx.font = '700 22px Sora, Georgia, serif';
        ctx.fillText(L.ch, L.x, L.y);
      }
      ctx.fillStyle = '#e25b3a';
      for (let i = 0; i < s.lives; i += 1) ctx.fillRect(30 + i * 22, 640, 14, 14);
    },
  });

  function hurt(w) {
    const s = w.s;
    s.lives -= 1;
    w.shake(5);
    w.tone(150, 0.08, 'sawtooth', 0.025);
    w.setMeta(`${Math.max(0, s.lives)} lives`);
    if (s.lives <= 0) w.finish('The word escapes', 'Tap only the next letter.');
  }
})();
