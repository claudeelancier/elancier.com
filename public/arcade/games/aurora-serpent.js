(() => {
  const { roundRect, hexAlpha } = Arcade;
  const COLS = 16;
  const ROWS = 24;
  const CELL = 22;
  const OX = 24;
  const OY = 90;

  Arcade.boot({
    id: 'aurora-serpent',
    title: 'Aurora Serpent',
    blurb: 'Guide a ribbon of northern light across a frozen grid.',
    hint: 'Swipe to turn. Eat lights to grow. Walls and your own trail end the run.',
    palette: { bg0: '#061410', bg1: '#0c241c', accent: '#39f2a8', accent2: '#d6ffe8' },
    setup(w) {
      w.s = { snake: [{ c: 8, r: 12 }, { c: 7, r: 12 }, { c: 6, r: 12 }], dir: [1, 0], next: [1, 0], tick: 0, step: 0.14, food: placeFood([{ c: 8, r: 12 }]), eaten: 0 };
    },
    onKey(w, e) {
      if (e.type !== 'down') return;
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };
      if (map[e.code]) turn(w.s, map[e.code]);
    },
    update(w, dt) {
      const s = w.s;
      const swipe = w.consumeSwipe();
      if (swipe) turn(s, { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[swipe.dir]);
      s.tick += dt;
      if (s.tick < s.step) return;
      s.tick = 0;
      s.dir = s.next;
      const head = { c: s.snake[0].c + s.dir[0], r: s.snake[0].r + s.dir[1] };
      if (head.c < 0 || head.r < 0 || head.c >= COLS || head.r >= ROWS || s.snake.some((p) => p.c === head.c && p.r === head.r)) {
        w.shake(7);
        w.finish('The ribbon folds', 'Turn before you meet a wall or yourself.');
        return;
      }
      s.snake.unshift(head);
      if (head.c === s.food.c && head.r === s.food.r) {
        s.eaten += 1;
        w.addScore(s.food.gold ? 50 : 10);
        w.burst(OX + head.c * CELL + 10, OY + head.r * CELL + 10, '#d6ffe8', 8, 90);
        w.tone(s.food.gold ? 880 : 640, 0.04, 'sine', 0.03);
        s.food = placeFood(s.snake, s.eaten % 5 === 0);
        if (!s.food) {
          w.finish('The grid is full', 'The ribbon has taken every cell.');
          return;
        }
        s.step = Math.max(0.07, 0.14 - s.eaten * 0.003);
      } else s.snake.pop();
    },
    draw(w, ctx) {
      const s = w.s;
      roundRect(ctx, OX - 8, OY - 8, COLS * CELL + 16, ROWS * CELL + 16, 16);
      ctx.fillStyle = hexAlpha('#d6ffe8', 0.04);
      ctx.fill();
      s.snake.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#eafff6' : `hsl(158 80% ${62 - Math.min(30, i)}%)`;
        roundRect(ctx, OX + p.c * CELL + 2, OY + p.r * CELL + 2, CELL - 4, CELL - 4, 6);
        ctx.fill();
      });
      ctx.fillStyle = s.food.gold ? '#ffe7a3' : '#39f2a8';
      ctx.beginPath();
      ctx.arc(OX + s.food.c * CELL + 11, OY + s.food.r * CELL + 11, s.food.gold ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
    },
  });

  function turn(s, dir) {
    if (dir[0] === -s.dir[0] && dir[1] === -s.dir[1]) return;
    s.next = dir;
  }
  function placeFood(snake, gold) {
    const open = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (!snake.some((p) => p.c === c && p.r === r)) open.push({ c, r, gold: !!gold });
      }
    }
    if (!open.length) return null;
    return open[(Math.random() * open.length) | 0];
  }
})();
