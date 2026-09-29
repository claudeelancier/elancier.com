(() => {
  const { roundRect, hexAlpha } = Arcade;

  Arcade.boot({
    id: 'metronome-lanes',
    title: 'Metronome',
    blurb: 'Strike notes on the pendulum’s pulse, including long holds.',
    hint: 'Tap a lane as the note meets the line. Hold the long bars until they end.',
    palette: { bg0: '#0c0e14', bg1: '#1a1e2c', accent: '#f2f5ff', accent2: '#ff3b6a' },
    setup(w) {
      w.s = { notes: [], beat: 0, bpm: 96, travel: 2.05, misses: 0, combo: 0, nextBeat: 0, holdLane: -1, t: 0 };
      w.setMeta('Combo 0');
    },
    onPointer(w, e) {
      const s = w.s;
      const lane = Math.floor(e.x / 100);
      if (lane < 0 || lane > 3) return;
      if (e.type === 'down') judge(w, lane, false);
      if (e.type === 'up' && s.holdLane === lane) releaseHold(w, lane);
    },
    update(w, dt) {
      const s = w.s;
      s.t += dt;
      s.bpm = 96 + Math.min(70, s.t * 1.4);
      const beatDur = 60 / s.bpm;
      s.nextBeat -= dt;
      const line = 560;
      const speed = (line - 70) / s.travel;
      if (s.nextBeat <= 0) {
        s.nextBeat += beatDur;
        s.beat += 1;
        if (s.beat > 2) {
          const lane = (Math.random() * 4) | 0;
          const hold = s.beat % 8 === 0;
          s.notes.push({ lane, y: 70, hold, len: hold ? 150 : 18, judged: false, holding: false, failed: false });
        }
      }
      for (const n of s.notes) n.y += speed * dt;
      s.notes = s.notes.filter((n) => {
        const end = n.y + (n.hold ? n.len : 0);
        if (!n.judged && n.y > line + 46) {
          miss(w);
          return false;
        }
        if (n.hold && n.holding && n.y > line + 36) {
          if (!n.failed) {
            s.combo += 1;
            w.addScore(40 + s.combo);
            w.floatText(n.lane * 100 + 50, line - 30, 'Hold', '#fff');
          }
          s.holdLane = -1;
          return false;
        }
        return end < 760;
      });
      if (s.misses >= 8) w.finish('The pulse slips', 'Hit the line and finish every hold.');
      w.setMeta(`Combo ${s.combo}`);
    },
    draw(w, ctx) {
      const s = w.s;
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = hexAlpha('#ffffff', i % 2 ? 0.03 : 0.06);
        ctx.fillRect(i * 100 + 8, 60, 84, 560);
      }
      const swing = Math.sin(s.t * (s.bpm / 60) * Math.PI * 2);
      ctx.strokeStyle = '#ff3b6a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(200, 36);
      ctx.lineTo(200 + swing * 70, 100);
      ctx.stroke();
      ctx.fillStyle = '#ff3b6a';
      ctx.beginPath();
      ctx.arc(200 + swing * 70, 100, 8, 0, Math.PI * 2);
      ctx.fill();
      for (const n of s.notes) {
        ctx.fillStyle = n.hold ? '#ff3b6a' : '#f4f6ff';
        roundRect(ctx, n.lane * 100 + 18, n.hold ? n.y - n.len : n.y - 10, 64, n.hold ? n.len : 20, 8);
        ctx.fill();
      }
      ctx.fillStyle = hexAlpha('#f2f5ff', 0.85);
      ctx.fillRect(16, 556, 368, 4);
      ctx.fillStyle = '#ff3b6a';
      for (let i = 0; i < 8 - s.misses; i += 1) ctx.fillRect(24 + i * 18, 640, 12, 8);
    },
  });

  function miss(w) {
    const s = w.s;
    s.misses += 1;
    s.combo = 0;
    w.shake(4);
    w.tone(140, 0.08, 'sawtooth', 0.02);
    w.setMeta('Combo 0');
  }

  function judge(w, lane, release) {
    const s = w.s;
    const line = 560;
    let best = null;
    let bestD = 50;
    for (const n of s.notes) {
      if (n.lane !== lane || n.judged) continue;
      const d = Math.abs(n.y - line);
      if (d < bestD) { best = n; bestD = d; }
    }
    if (!best) {
      if (!release) miss(w);
      return;
    }
    if (best.hold) {
      best.judged = true;
      best.holding = true;
      s.holdLane = lane;
      w.tone(540, 0.04, 'sine', 0.03);
      return;
    }
    best.judged = true;
    const perfect = bestD < 20;
    s.combo += 1;
    w.addScore((perfect ? 100 : 60) + s.combo);
    w.floatText(lane * 100 + 50, line - 28, perfect ? 'Perfect' : 'Good', perfect ? '#ff3b6a' : '#fff');
    w.tone(perfect ? 880 : 640, 0.04, 'sine', 0.03);
    s.notes = s.notes.filter((n) => n !== best);
  }

  function releaseHold(w, lane) {
    const s = w.s;
    const n = s.notes.find((note) => note.lane === lane && note.holding);
    s.holdLane = -1;
    if (!n) return;
    if (n.y < 540) {
      n.failed = true;
      miss(w);
      s.notes = s.notes.filter((note) => note !== n);
    }
  }
})();
