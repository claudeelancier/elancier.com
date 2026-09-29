/* Luckyverse Arcade — shared runtime for touch-first canvas games. */
(() => {
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function hexAlpha(hex, a) {
    const h = String(hex || '#ffffff').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return `rgba(255,255,255,${a})`;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function roundRect(ctx, x, y, w, h, r = 8) {
    ctx.beginPath();
    if (w <= 0 || h <= 0) return;
    const rr = Math.min(Math.abs(r), w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function glow(ctx, x, y, r, color) {
    if (r < 1) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let audioCtx = null;
  let muted = false;
  try {
    muted = localStorage.getItem('arcade-muted') === '1';
  } catch {
    muted = false;
  }

  function audio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur = 0.08, type = 'sine', gain = 0.045, slide = 0) {
    if (muted) return;
    try {
      const a = audio();
      if (!a) return;
      const t = a.currentTime;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(40, freq), t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(a.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch {
      /* audio is optional */
    }
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  const grain = document.createElement('canvas');
  grain.width = 96;
  grain.height = 96;
  {
    const g = grain.getContext('2d');
    const img = g.createImageData(96, 96);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 180 + Math.random() * 70;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 26;
    }
    g.putImageData(img, 0, 0);
  }

  function boot(spec) {
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    const overlay = document.getElementById('overlay');
    const menuBox = document.getElementById('menu-box');
    const pauseBox = document.getElementById('pause-box');
    const overBox = document.getElementById('over-box');
    const playBtn = document.getElementById('play-btn');
    const againBtn = document.getElementById('again-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const muteBtn = document.getElementById('mute-btn');
    const controls = document.getElementById('controls');
    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const metaEl = document.getElementById('meta');

    document.getElementById('g-title').textContent = spec.title;
    document.getElementById('hud-title').textContent = spec.title;
    document.getElementById('g-blurb').textContent = spec.blurb || '';
    document.getElementById('g-hint').textContent = spec.hint || '';
    document.title = `${spec.title} · Luckyverse Arcade`;

    const pal = spec.palette || { bg0: '#07080f', bg1: '#141824', accent: '#8fd3ff', accent2: '#ffffff' };
    const root = document.documentElement;
    root.style.setProperty('--bg0', pal.bg0);
    root.style.setProperty('--bg1', pal.bg1);
    root.style.setProperty('--accent', pal.accent);
    root.style.setProperty('--accent2', pal.accent2 || pal.accent);

    const bestKey = `arcade-best-${spec.id}`;
    let best = 0;
    try {
      best = +(localStorage.getItem(bestKey) || 0);
    } catch {
      best = 0;
    }

    const buttons = spec.buttons || [];
    const pointerHeld = {};
    const keyHeld = {};
    const keyToId = {};
    buttons.forEach((b) => {
      const keys = Array.isArray(b.key) ? b.key : b.key ? [b.key] : [];
      keys.forEach((k) => {
        keyToId[k] = b.id;
      });
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'ctrl';
      el.textContent = b.label;
      el.setAttribute('aria-label', b.label);
      const set = (v) => {
        pointerHeld[b.id] = v;
        el.setAttribute('aria-pressed', v ? 'true' : 'false');
      };
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        set(true);
      });
      const up = (e) => {
        e.preventDefault();
        set(false);
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      controls.appendChild(el);
    });

    const state = {
      phase: 'attract',
      score: 0,
      best,
      t: 0,
      vw: 1,
      vh: 1,
      dpr: 1,
      view: spec.view || { w: 400, h: 680 },
      layout: { scale: 1, ox: 0, oy: 0 },
      pointer: { x: 200, y: 340, down: false, sx: 0, sy: 0 },
      keys: new Set(),
      held: {},
      joy: { x: 0, y: 0, active: false },
      swipe: null,
    };

    const particles = [];
    const floaters = [];
    let shakeMag = 0;
    let flashA = 0;
    let flashColor = '#fff';
    let scoreShown = 0;
    let joyOrigin = null;
    let swipeStart = null;
    let fatal = null;
    const timers = [];

    function syncHeld() {
      for (const b of buttons) state.held[b.id] = !!(pointerHeld[b.id] || keyHeld[b.id]);
    }

    function rememberBest() {
      if (state.score > state.best) {
        state.best = state.score;
        try {
          localStorage.setItem(bestKey, String(state.best));
        } catch {
          /* private mode */
        }
      }
    }

    const world = {
      get view() {
        return state.view;
      },
      get t() {
        return state.t;
      },
      get score() {
        return state.score;
      },
      get best() {
        return state.best;
      },
      get phase() {
        return state.phase;
      },
      get pointer() {
        return state.pointer;
      },
      get keys() {
        return state.keys;
      },
      get held() {
        return state.held;
      },
      get joy() {
        return state.joy;
      },
      palette: pal,
      consumeSwipe() {
        const s = state.swipe;
        state.swipe = null;
        return s;
      },
      addScore(n) {
        state.score += n;
        rememberBest();
      },
      setScore(n) {
        state.score = n | 0;
        rememberBest();
      },
      setMeta(text) {
        if (metaEl) metaEl.textContent = text || '';
      },
      finish(title, sub) {
        if (state.phase !== 'play') return;
        state.phase = 'over';
        document.getElementById('over-title').textContent = title || 'Run complete';
        document.getElementById('over-sub').textContent = sub || 'A clean run. Play again whenever you like.';
        document.getElementById('over-score').textContent = Math.max(0, state.score | 0).toLocaleString();
        menuBox.hidden = true;
        pauseBox.hidden = true;
        overBox.hidden = false;
        overlay.hidden = false;
        tone(196, 0.16, 'triangle', 0.05, -90);
        if (navigator.vibrate) navigator.vibrate(12);
      },
      burst(x, y, color, n = 12, speed = 160) {
        const count = reduceMotion ? Math.min(5, n) : n;
        for (let i = 0; i < count; i += 1) {
          if (particles.length > 240) particles.shift();
          const a = rand(TAU);
          const sp = rand(speed * 0.25, speed);
          particles.push({
            x,
            y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: rand(0.28, 0.65),
            max: 0.65,
            size: rand(1.4, 3.2),
            color,
            grav: rand(180, 640),
          });
        }
      },
      floatText(x, y, text, color) {
        floaters.push({ x, y, text, color: color || '#fff', life: 0.75, max: 0.75 });
        if (floaters.length > 24) floaters.shift();
      },
      shake(m) {
        shakeMag = Math.min(18, Math.max(shakeMag, m));
      },
      flash(color, a = 0.28) {
        flashColor = color;
        flashA = a;
      },
      tone,
      after(sec, fn) {
        timers.push({ sec, fn });
      },
      buzz(ms = 8) {
        if (navigator.vibrate) navigator.vibrate(ms);
      },
      rand,
      clamp,
      lerp,
      pick,
      TAU,
    };

    function showFatal(err) {
      console.error(err);
      fatal = err;
      state.phase = 'over';
      menuBox.hidden = true;
      pauseBox.hidden = true;
      overBox.hidden = false;
      overlay.hidden = false;
      document.getElementById('over-title').textContent = 'This round hit a snag';
      document.getElementById('over-sub').textContent = String(err?.message || err);
      document.getElementById('over-score').textContent = '—';
    }

    function layout() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      state.dpr = dpr;
      state.vw = Math.max(1, rect.width);
      state.vh = Math.max(1, rect.height);
      const pw = Math.max(1, Math.round(rect.width * dpr));
      const ph = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      const hudH = document.getElementById('hud')?.offsetHeight || 0;
      const ctrlH = controls?.offsetHeight || 0;
      const view = state.view;
      const availW = rect.width;
      const availH = Math.max(80, rect.height - hudH - ctrlH);
      const scale = Math.max(0.01, Math.min(availW / view.w, availH / view.h));
      const ox = (availW - view.w * scale) / 2;
      const oy = hudH + (availH - view.h * scale) / 2;
      state.layout = { scale, ox, oy };
    }

    function toView(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const { scale, ox, oy } = state.layout;
      return { x: (x - ox) / scale, y: (y - oy) / scale, sx: x, sy: y };
    }

    function setPointer(e, down) {
      const p = toView(e.clientX, e.clientY);
      state.pointer.x = p.x;
      state.pointer.y = p.y;
      state.pointer.sx = p.sx;
      state.pointer.sy = p.sy;
      if (down != null) state.pointer.down = down;
      return p;
    }

    function updateJoy(p) {
      if (!spec.joystick || !joyOrigin) return;
      const dx = p.x - joyOrigin.x;
      const dy = p.y - joyOrigin.y;
      const mag = Math.hypot(dx, dy) || 1;
      const max = 78;
      const k = Math.min(max, mag);
      state.joy.x = (dx / mag) * (k / max);
      state.joy.y = (dy / mag) * (k / max);
      state.joy.active = true;
    }

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      const p = setPointer(e, true);
      swipeStart = { x: p.x, y: p.y, t: performance.now() };
      if (spec.joystick) {
        joyOrigin = { x: p.x, y: p.y };
        state.joy.active = true;
        state.joy.x = 0;
        state.joy.y = 0;
      }
      if (state.phase === 'play' && spec.onPointer) spec.onPointer(world, { type: 'down', x: p.x, y: p.y, id: e.pointerId });
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = setPointer(e, null);
      if (state.pointer.down) updateJoy(p);
      if (state.phase === 'play' && state.pointer.down && spec.onPointer) {
        spec.onPointer(world, { type: 'move', x: p.x, y: p.y, id: e.pointerId });
      }
    });
    const endPointer = (e) => {
      const p = setPointer(e, false);
      let swipe = null;
      if (swipeStart) {
        const dx = p.x - swipeStart.x;
        const dy = p.y - swipeStart.y;
        if (Math.hypot(dx, dy) > 26) {
          const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
          swipe = { dx, dy, dir };
          state.swipe = swipe;
        }
      }
      swipeStart = null;
      joyOrigin = null;
      state.joy.x = 0;
      state.joy.y = 0;
      state.joy.active = false;
      if (state.phase === 'play' && spec.onPointer) spec.onPointer(world, { type: 'up', x: p.x, y: p.y, id: e.pointerId, swipe });
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    window.addEventListener('pointerup', (e) => {
      if (e.target === canvas) return;
      state.pointer.down = false;
    });

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      state.keys.add(e.code);
      if (keyToId[e.code]) keyHeld[keyToId[e.code]] = true;
      if (e.code === 'KeyM') muteBtn.click();
      if (e.code === 'Escape' && (state.phase === 'play' || state.phase === 'pause')) pauseBtn.click();
      if (e.repeat) return;
      if (state.phase === 'attract' && (e.code === 'Enter' || e.code === 'Space')) {
        audio();
        startGame();
      }
      if (state.phase === 'play' && spec.onKey) spec.onKey(world, { type: 'down', code: e.code, key: e.key });
    });
    window.addEventListener('keyup', (e) => {
      state.keys.delete(e.code);
      if (keyToId[e.code]) keyHeld[keyToId[e.code]] = false;
      if (state.phase === 'play' && spec.onKey) spec.onKey(world, { type: 'up', code: e.code, key: e.key });
    });

    function hideOverlay() {
      overlay.hidden = true;
      menuBox.hidden = true;
      pauseBox.hidden = true;
      overBox.hidden = true;
    }

    function startGame() {
      fatal = null;
      state.score = 0;
      scoreShown = 0;
      state.phase = 'play';
      particles.length = 0;
      floaters.length = 0;
      timers.length = 0;
      shakeMag = 0;
      flashA = 0;
      hideOverlay();
      pauseBtn.textContent = 'Pause';
      try {
        spec.setup(world);
      } catch (err) {
        showFatal(err);
      }
      tone(620, 0.05, 'sine', 0.035);
    }

    playBtn.addEventListener('click', () => {
      audio();
      startGame();
    });
    againBtn.addEventListener('click', () => {
      audio();
      startGame();
    });
    function togglePause() {
      if (state.phase === 'play') {
        state.phase = 'pause';
        pauseBtn.textContent = 'Resume';
        menuBox.hidden = true;
        overBox.hidden = true;
        pauseBox.hidden = false;
        overlay.hidden = false;
      } else if (state.phase === 'pause') {
        state.phase = 'play';
        pauseBtn.textContent = 'Pause';
        hideOverlay();
      }
    }
    pauseBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('click', togglePause);
    muteBtn.addEventListener('click', () => {
      muted = !muted;
      try {
        localStorage.setItem('arcade-muted', muted ? '1' : '0');
      } catch {
        /* ignore */
      }
      muteBtn.textContent = muted ? 'Sound off' : 'Sound';
      muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
      if (!muted) audio();
    });
    muteBtn.textContent = muted ? 'Sound off' : 'Sound';

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.phase === 'play') togglePause();
    });

    function step(dt) {
      syncHeld();
      state.t += dt;
      for (let i = timers.length - 1; i >= 0; i -= 1) {
        timers[i].sec -= dt;
        if (timers[i].sec <= 0) {
          const fn = timers[i].fn;
          timers.splice(i, 1);
          try {
            fn();
          } catch (err) {
            showFatal(err);
          }
        }
      }
      if (state.phase === 'play' && !fatal) {
        try {
          spec.update(world, dt);
        } catch (err) {
          showFatal(err);
        }
      }
      state.swipe = null;
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = floaters.length - 1; i >= 0; i -= 1) {
        const f = floaters[i];
        f.life -= dt;
        f.y -= 36 * dt;
        if (f.life <= 0) floaters.splice(i, 1);
      }
      if (shakeMag > 0) {
        shakeMag *= Math.pow(0.04, dt);
        if (shakeMag < 0.25) shakeMag = 0;
      }
      if (flashA > 0) flashA = Math.max(0, flashA - dt * 1.4);
      scoreShown = lerp(scoreShown, state.score, 1 - Math.pow(0.001, dt));
      scoreEl.textContent = Math.round(scoreShown).toLocaleString();
      bestEl.textContent = state.best.toLocaleString();
    }

    function drawAmbience() {
      const { vw, vh } = state;
      const g = ctx.createLinearGradient(0, 0, 0, vh);
      g.addColorStop(0, pal.bg1);
      g.addColorStop(0.45, pal.bg0);
      g.addColorStop(1, pal.bg0);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
      if (!reduceMotion) {
        glow(ctx, vw * 0.2 + Math.sin(state.t * 0.25) * 20, vh * 0.25, Math.min(vw, vh) * 0.45, hexAlpha(pal.accent, 0.13));
        glow(ctx, vw * 0.85, vh * 0.7 + Math.cos(state.t * 0.2) * 16, Math.min(vw, vh) * 0.4, hexAlpha(pal.accent2, 0.1));
      }
    }

    function render() {
      layout();
      const dpr = state.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      drawAmbience();
      const { scale, ox, oy } = state.layout;
      const view = state.view;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, view.w, view.h);
      ctx.clip();
      ctx.fillStyle = pal.bg0;
      ctx.fillRect(0, 0, view.w, view.h);
      if (shakeMag > 0) ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
      try {
        spec.draw(world, ctx);
      } catch (err) {
        if (!fatal) showFatal(err);
      }
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.font = '700 16px Inter, ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const f of floaters) {
        ctx.globalAlpha = Math.max(0, f.life / f.max);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
      if (flashA > 0) {
        ctx.fillStyle = hexAlpha(flashColor, flashA);
        ctx.fillRect(0, 0, view.w, view.h);
      }
      ctx.restore();
      ctx.lineWidth = 2;
      ctx.strokeStyle = hexAlpha(pal.accent, 0.28);
      roundRect(ctx, 1, 1, view.w - 2, view.h - 2, 18);
      ctx.stroke();

      if (spec.joystick && state.joy.active && joyOrigin) {
        ctx.strokeStyle = hexAlpha('#ffffff', 0.35);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(joyOrigin.x, joyOrigin.y, 36, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = hexAlpha(pal.accent, 0.9);
        ctx.beginPath();
        ctx.arc(joyOrigin.x + state.joy.x * 28, joyOrigin.y + state.joy.y * 28, 14, 0, TAU);
        ctx.fill();
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 0.18;
      ctx.drawImage(grain, 0, 0, state.vw, state.vh);
      ctx.globalAlpha = 1;
    }

    bestEl.textContent = best.toLocaleString();
    window.addEventListener('resize', layout);
    layout();
    try {
      spec.setup(world);
    } catch (err) {
      showFatal(err);
    }

    let last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = clamp((now - last) / 1000, 0, 0.033);
      last = now;
      if (!document.hidden && state.phase !== 'pause') step(dt);
      else syncHeld();
      render();
    }
    requestAnimationFrame(frame);

    window.__arcade = { state, spec };
  }

  window.Arcade = {
    boot,
    roundRect,
    glow,
    hexAlpha,
    aabb,
    clamp,
    lerp,
    rand,
    pick,
    TAU,
    mulberry32,
  };
})();
