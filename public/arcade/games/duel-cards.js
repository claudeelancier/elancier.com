(() => {
  const { roundRect } = Arcade;
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function card(value) {
    return { value, red: Math.random() < 0.5 };
  }

  Arcade.boot({
    id: 'duel-cards',
    title: 'Duel Cards',
    blurb: 'Call the next card and protect a growing streak.',
    hint: 'Choose higher or lower. A tie breaks the streak.',
    palette: { bg0: '#120c0a', bg1: '#2a1814', accent: '#f0d2b4', accent2: '#c84b3a' },
    buttons: [
      { id: 'lower', label: 'Lower', key: 'ArrowLeft' },
      { id: 'higher', label: 'Higher', key: 'ArrowRight' },
    ],
    setup(w) {
      w.s = { current: card(1 + ((Math.random() * 13) | 0)), next: null, flip: 0, streak: 0, lock: false, guess: null };
    },
    update(w, dt) {
      const s = w.s;
      if (!s.lock && s.flip <= 0) {
        if (pressed(s, w, 'higher')) guess(w, 'higher');
        if (pressed(s, w, 'lower')) guess(w, 'lower');
      }
      if (s.flip > 0) {
        s.flip -= dt;
        if (s.flip <= 0 && s.next) {
          const win = (s.guess === 'higher' && s.next.value > s.current.value) || (s.guess === 'lower' && s.next.value < s.current.value);
          if (win) {
            s.streak += 1;
            w.addScore(20 * s.streak);
            w.floatText(200, 180, `Streak ${s.streak}`, '#fff');
            w.tone(700, 0.05, 'sine', 0.03);
            s.current = s.next;
            s.lock = false;
          } else {
            w.finish(s.next.value === s.current.value ? 'The ranks tie' : 'The call misses', `The streak ended at ${s.streak}.`);
          }
        }
      }
    },
    draw(w, ctx) {
      const s = w.s;
      const show = s.flip > 0.18 ? s.current : s.next || s.current;
      drawCard(ctx, 120, 220, show);
      ctx.fillStyle = '#f0d2b4';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Streak ${s.streak}`, 200, 160);
    },
  });

  function pressed(s, w, id) {
    const now = !!w.held[id];
    const was = !!s['_' + id];
    s['_' + id] = now;
    return now && !was;
  }

  function guess(w, kind) {
    const s = w.s;
    let value = 1 + ((Math.random() * 13) | 0);
    if (value === s.current.value && Math.random() < 0.5) value = 1 + ((Math.random() * 13) | 0);
    s.next = card(value);
    s.guess = kind;
    s.flip = 0.36;
    s.lock = true;
  }

  function drawCard(ctx, x, y, card) {
    roundRect(ctx, x, y, 160, 220, 16);
    ctx.fillStyle = '#fff8f2';
    ctx.fill();
    ctx.fillStyle = card.red ? '#c84b3a' : '#1c140f';
    ctx.font = '700 64px Sora, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(RANKS[card.value - 1], x + 80, y + 100);
    ctx.font = '700 22px Sora, Georgia, serif';
    ctx.fillText(card.red ? '♥' : '♠', x + 80, y + 150);
  }
})();
