/* Neko's Advent — shared engine
   Days, saved progress, sounds, read-aloud, mini-games, and grown-up mode.
   Each prototype page is just a different "skin" that calls Advent.init / tryOpen / open. */
(function () {
  'use strict';

  const YEAR = 2026;
  const PREVIEW = /[?&]preview\b/.test(location.search); // ?preview unlocks everything (not saved)

  const DAYS = window.ADVENT_DAYS;      // from shared/days.js
  const P = window.ADVENT_PHRASES;

  // ---------------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const restart = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };

  // ---------------------------------------------------------------- state
  let KEY = 'neko-advent';
  let S = { opened: {}, notes: {} };
  let onChange = () => {};

  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
    S.opened = S.opened || {}; S.notes = S.notes || {};
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } }

  function today() {
    let t = new Date();
    if (S.pretend) { const [y, m, d] = S.pretend.split('-').map(Number); t = new Date(y, m - 1, d); }
    t.setHours(0, 0, 0, 0);
    return t;
  }
  const dateOf = (d) => new Date(YEAR, 11, d);
  const sleepsUntil = (d) => Math.round((dateOf(d) - today()) / 864e5);

  function status(d) {
    if (S.opened[d]) return 'opened';
    if (PREVIEW || S.unlockAll || today() >= dateOf(d)) return 'ready';
    return 'locked';
  }
  const isToday = (d) => +today() === +dateOf(d);

  function countdowns() {
    const out = [];
    const s = sleepsUntil(5), x = sleepsUntil(25);
    const pl = (n) => `${n} sleep${n === 1 ? '' : 's'}`;
    if (s > 0) out.push(`🐴 ${pl(s)} until Sinterklaas`); else if (s === 0) out.push('🐴 Pakjesavond tonight!');
    if (x > 0) out.push(`🎅 ${pl(x)} until Christmas`); else if (x === 0) out.push('🎄 Merry Christmas!');
    return out;
  }

  // ---------------------------------------------------------------- voice
  // Plays pre-made audio files (made by tools/make-voice.js, listed in audio/manifest.js).
  // Lines take turns: a new line waits for the current one to finish instead of cutting it off.
  // Repeats are skipped and only a few lines can wait, so fast tapping can't build a backlog.
  // hush() stops everything immediately (closing a pop-up, leaving a toy).
  const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  const MAX_WAITING = 3;
  let player = null, unlocked = false, playing = null, gen = 0;
  const queue = [];
  const audioEl = () => player || (player = new Audio());
  const keyOf = (item) => (item.live ? 'live:' : '') + item.text;
  function unlockAudio() { // call inside a tap so iPad Safari lets us play later
    if (unlocked || playing) return; unlocked = true;
    const a = audioEl(); a.onended = a.onerror = null; a.src = SILENCE; a.play().catch(() => {});
  }
  function enqueue(item) {
    const k = keyOf(item);
    if ((playing && keyOf(playing) === k) || queue.some((q) => keyOf(q) === k)) return;
    if (queue.length >= MAX_WAITING) queue.shift();
    queue.push(item);
    if (!playing) playNext();
  }
  function playNext() {
    const item = queue.shift();
    playing = item || null;
    if (!item) return;
    const my = gen, done = () => { if (my === gen && playing === item) playNext(); };
    if (item.live) {
      try {
        const u = new SpeechSynthesisUtterance(item.text.replace(/\bNeko\b/gi, 'Neeko').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ''));
        u.voice = item.voice; u.lang = item.voice.lang; u.rate = 0.95;
        u.onend = u.onerror = done;
        speechSynthesis.speak(u);
      } catch (e) { done(); }
      return;
    }
    const a = audioEl();
    a.onended = a.onerror = done;
    a.src = 'audio/' + item.file;
    a.play().catch(done);
  }
  function speak(text) {
    const file = (window.ADVENT_AUDIO || {})[text];
    if (file) enqueue({ text, file });
  }
  function hush() {
    gen++; queue.length = 0; playing = null;
    if (player) { player.onended = player.onerror = null; player.pause(); }
    try { speechSynthesis.cancel(); } catch (e) {}
  }
  const hasVoice = (text) => !!(window.ADVENT_AUDIO || {})[text];

  // Live reading for grown-up notes (they can't be pre-recorded). Only uses a nice installed voice
  // like Zoe; if the browser doesn't offer one, notes are simply shown as text.
  const NICE_VOICES = [/zoe/i, /ava/i, /premium/i, /enhanced/i];
  function niceVoice() {
    try {
      const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
      for (const re of NICE_VOICES) { const v = vs.find((x) => re.test(x.name)); if (v) return v; }
    } catch (e) { /* no speech support */ }
    return null;
  }
  try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {}; } catch (e) {}
  function speakLive(text) {
    const voice = niceVoice();
    if (voice) enqueue({ text, live: true, voice });
  }

  // ---------------------------------------------------------------- sound (tiny synth, no files)
  let ac;
  function actx() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur = 0.15, type = 'sine', vol = 0.15, when = 0) {
    const c = actx(); if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function drum() {
    const c = actx(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.16);
  }
  const sfx = {
    pop() { tone(500 + Math.random() * 500, 0.1, 'triangle', 0.18); },
    chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'sine', 0.12, i * 0.09)); },
    sparkle() { [1319, 1568, 1760, 2093].forEach((f, i) => tone(f, 0.25, 'sine', 0.05, i * 0.05)); },
    thud() { drum(); tone(90, 0.12, 'square', 0.06); },
    nope() { tone(330, 0.12, 'triangle', 0.12); tone(247, 0.18, 'triangle', 0.12, 0.13); },
    creak() { tone(220, 0.25, 'sawtooth', 0.03); tone(330, 0.2, 'sine', 0.06, 0.12); },
  };
  let beatTimer = null;
  function startBeat() {
    stopBeat(); if (!actx()) return;
    let step = 0; const mel = [659, 784, 880, 784, 659, 587, 523, 587];
    beatTimer = setInterval(() => {
      if (step % 2 === 0) { drum(); tone(mel[(step / 2) % 8], 0.2, 'triangle', 0.07); }
      else tone(6000, 0.03, 'square', 0.015);
      step++;
    }, 230);
  }
  function stopBeat() { clearInterval(beatTimer); beatTimer = null; }

  // ---------------------------------------------------------------- confetti
  let parts = [], confRunning = false;
  function confetti(count = 140, emojis = null, x = null, y = null) {
    const cv = $('#adv-confetti'); if (!cv) return;
    const ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
    if (cv.width !== innerWidth * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#ff6fb5', '#ffd166', '#7bdff2', '#b892ff', '#80ed99', '#ffffff', '#ff9e5e'];
    const ox = x ?? innerWidth / 2, oy = y ?? innerHeight * 0.45;
    for (let i = 0; i < count; i++) {
      parts.push({ x: ox + (Math.random() - 0.5) * 60, y: oy, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4,
        r: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.3, c: pick(colors), s: 6 + Math.random() * 7,
        e: emojis && Math.random() < 0.35 ? pick(emojis) : null });
    }
    if (confRunning) return;
    confRunning = true;
    (function loop() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        if (p.e) { ctx.font = `${p.s * 3.4}px serif`; ctx.textAlign = 'center'; ctx.fillText(p.e, 0, 0); }
        else { ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
        ctx.restore();
      }
      parts = parts.filter((p) => p.y < innerHeight + 60);
      if (parts.length) requestAnimationFrame(loop); else { confRunning = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    })();
  }

  // falling decoration (snow, sparkles) for skins
  function snow(container, n = 40, chars = ['❄', '•', '✦']) {
    for (let i = 0; i < n; i++) {
      const f = el('span', 'adv-flake', pick(chars));
      f.style.left = Math.random() * 100 + '%';
      f.style.fontSize = 8 + Math.random() * 16 + 'px';
      f.style.animationDuration = 8 + Math.random() * 12 + 's';
      f.style.animationDelay = -Math.random() * 20 + 's';
      f.style.opacity = 0.4 + Math.random() * 0.6;
      container.append(f);
    }
  }

  // ---------------------------------------------------------------- mini-games
  // Each game: (stage, cfg, done) => optional cleanup fn. Call done() once when she "wins".

  const GAMES = {
    pop(stage, cfg, done) {
      const goal = cfg.count || 8; let n = 0, alive = true;
      const counter = el('div', 'adv-counter', `0 / ${goal}`);
      const field = el('div', 'adv-field');
      if (cfg.bg) field.style.background = cfg.bg;
      stage.append(counter, field);
      function spawn() {
        if (!alive) return;
        const b = el('button', 'adv-floater', pick(cfg.emoji));
        b.style.left = 4 + Math.random() * 78 + '%';
        b.style.fontSize = 44 + Math.random() * 22 + 'px';
        b.style.animationDuration = 4 + Math.random() * 3 + 's';
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault(); if (b.dataset.p || n >= goal) return;
          b.dataset.p = 1; sfx.pop();
          b.style.top = getComputedStyle(b).top; b.style.animation = 'adv-burst .3s forwards';
          setTimeout(() => b.remove(), 320);
          n++; counter.textContent = `${n} / ${goal}`; restart(counter, 'bump');
          if (n >= goal) { alive = false; done(); }
        });
        b.addEventListener('animationend', (e) => { if (e.animationName === 'adv-rise') b.remove(); });
        field.append(b);
        setTimeout(spawn, 450 + Math.random() * 500);
      }
      spawn(); setTimeout(spawn, 250);
      return () => { alive = false; };
    },

    kick(stage, cfg, done) {
      const goal = cfg.taps || 5; let n = 0;
      const w = el('div', 'adv-kick' + (cfg.ice ? ' ice' : ''), `
        <div class="adv-counter">Kicks: 0 / ${goal}</div>
        <div class="adv-hiya"></div>
        <div class="adv-foot">🦶</div>
        <button class="adv-board" aria-label="Kick the board"><span class="adv-half l"></span><span class="adv-half r"></span><span class="adv-crack"></span></button>
        <div class="adv-hint">Tap the ${cfg.ice ? 'ice' : 'board'} to kick!</div>`);
      stage.append(w);
      const board = $('.adv-board', w), counter = $('.adv-counter', w), hiya = $('.adv-hiya', w), foot = $('.adv-foot', w);
      board.addEventListener('pointerdown', (e) => {
        e.preventDefault(); if (n >= goal) return;
        n++; sfx.thud();
        counter.textContent = `Kicks: ${n} / ${goal}`;
        board.style.setProperty('--crack', n / goal);
        const k = P.korean[n - 1];
        hiya.textContent = k ? `${k[0]} ${k[1]}` : 'HI-YAH!';
        if (k) speak(k[1]);
        restart(board, 'hit'); restart(hiya, 'flash'); restart(foot, 'go');
        if (n >= goal) {
          setTimeout(() => {
            board.classList.add('broken'); hiya.textContent = 'HI-YAH! 💥'; restart(hiya, 'flash');
            speak(P.broke);
            setTimeout(done, 900);
          }, 250);
        }
      });
    },

    dance(stage, cfg, done) {
      const rounds = cfg.rounds || 4; let alive = true;
      const w = el('div', 'adv-dance', `
        <div class="adv-dancer">${cfg.dancer || '💃'}</div>
        <div class="adv-dance-msg">Get ready to dance!</div>
        <div class="adv-eq">${'<i></i>'.repeat(9)}</div>
        <button class="adv-btn adv-big">▶ Start the music!</button>`);
      stage.append(w);
      const msg = $('.adv-dance-msg', w), btn = $('.adv-btn', w);
      btn.onclick = async () => {
        btn.hidden = true; actx();
        for (let r = 0; r < rounds; r++) {
          const move = pick(cfg.moves);
          msg.textContent = move; speak(move);
          w.classList.add('moving'); w.classList.remove('frozen'); startBeat();
          await wait(3500 + Math.random() * 3000); if (!alive) return;
          stopBeat(); w.classList.remove('moving'); w.classList.add('frozen');
          msg.textContent = 'FREEZE! 🧊'; speak(P.freeze);
          await wait(2600); if (!alive) return;
        }
        w.classList.remove('frozen');
        msg.textContent = 'Superstar dancing! 🌟';
        done();
      };
      return () => { alive = false; stopBeat(); };
    },

    joke(stage, cfg, done) {
      const w = el('div', 'adv-joke', `<div class="adv-joke-q"></div><button class="adv-btn adv-big">🤔 Tell me!</button><div class="adv-joke-a" hidden></div>`);
      $('.adv-joke-q', w).textContent = cfg.q;
      stage.append(w);
      const btn = $('.adv-btn', w), a = $('.adv-joke-a', w);
      btn.onclick = () => {
        btn.hidden = true; a.hidden = false; a.textContent = cfg.a;
        speak(cfg.a); sfx.sparkle(); confetti(30, ['😂', '🤣']);
        setTimeout(done, 1800);
      };
    },

    choose(stage, cfg, done) {
      let picked = false;
      const w = el('div', 'adv-choose');
      const q = el('div', 'adv-q'); q.textContent = cfg.q;
      const grid = el('div', 'adv-options'), out = el('div', 'adv-reply');
      cfg.options.forEach((o) => {
        const b = el('button', 'adv-option', `<span class="e">${o.e}</span><span class="l">${o.label}</span>`);
        b.onclick = () => {
          grid.querySelectorAll('.adv-option').forEach((x) => x.classList.toggle('chosen', x === b));
          out.textContent = o.say; restart(out, 'bump');
          speak(o.say); sfx.pop();
          const r = b.getBoundingClientRect(); confetti(40, [o.e], r.left + r.width / 2, r.top);
          if (!picked) { picked = true; setTimeout(done, 1600); }
        };
        grid.append(b);
      });
      w.append(q, grid, out); stage.append(w);
    },

    shoe(stage, cfg, done) {
      const goal = 3; let n = 0;
      const w = el('div', 'adv-shoe');
      const fx = el('div', 'adv-burst-field');
      const item = el('button', 'adv-shoe-item', cfg.item || '👞');
      const hint = el('div', 'adv-hint', `Tap it ${goal} times!`);
      w.append(fx, item, hint); stage.append(w);
      item.onclick = () => {
        if (n >= goal) return;
        n++; sfx.thud(); restart(item, 'shake');
        hint.textContent = n < goal ? `${goal - n} more!` : cfg.reveal;
        if (n >= goal) {
          sfx.chime(); speak(cfg.reveal);
          const k = cfg.treats.length;
          cfg.treats.forEach((t, i) => {
            const a = ((200 + (140 / (k - 1)) * i) * Math.PI) / 180;
            const s = el('span', 'adv-treat', t);
            s.style.setProperty('--tx', Math.cos(a) * 120 + 'px');
            s.style.setProperty('--ty', Math.sin(a) * 110 + 'px');
            s.style.animationDelay = i * 0.07 + 's';
            fx.append(s);
          });
          setTimeout(done, 1700);
        }
      };
    },

    gifts(stage, cfg, done) {
      let n = 0;
      const row = el('div', 'adv-gifts');
      cfg.items.forEach((it, i) => {
        const g = el('button', 'adv-gift', `<span class="adv-gift-inside">${it}</span><span class="adv-gift-box">🎁</span>`);
        g.style.animationDelay = i * 0.15 + 's';
        g.onclick = () => {
          if (g.classList.contains('open')) return;
          g.classList.add('open'); sfx.sparkle(); n++;
          const r = g.getBoundingClientRect(); confetti(35, [it], r.left + r.width / 2, r.top);
          if (n === cfg.items.length) setTimeout(done, 900);
        };
        row.append(g);
      });
      stage.append(row);
    },

    keepy(stage, cfg, done) {
      const goal = cfg.goal || 8; let n = 0, alive = true, won = false;
      let x = null, y = 40, vx = 0, vy = 0, last = performance.now();
      const counter = el('div', 'adv-counter', `0 / ${goal}`);
      const field = el('div', 'adv-keepy');
      const ball = el('button', 'adv-ball', cfg.item || '🎈');
      field.append(ball); stage.append(counter, field);
      function frame(t) {
        if (!alive) return;
        const dt = Math.min(40, t - last) / 16.67; last = t;
        const W = field.clientWidth - 80, H = field.clientHeight - 80;
        if (x === null) x = W / 2;
        if (!won) { vy += 0.1 * dt; y += vy * dt; x += vx * dt; }
        if (x < 0) { x = 0; vx = -vx; } if (x > W) { x = W; vx = -vx; }
        if (y < 0) { y = 0; vy = Math.abs(vy) * 0.3; }
        if (y > H) {
          y = H; vy = 0; vx = 0;
          if (n > 0 && !won) { n = 0; counter.textContent = `Oops! Try again! 0 / ${goal}`; sfx.nope(); }
        }
        ball.style.transform = `translate(${x}px,${y}px)`;
        requestAnimationFrame(frame);
      }
      ball.addEventListener('pointerdown', (e) => {
        e.preventDefault(); if (won) return;
        vy = -6; vx = (Math.random() - 0.5) * 4; n++; sfx.pop();
        counter.textContent = `${n} / ${goal}`; restart(counter, 'bump');
        if (n >= goal) { won = true; ball.classList.add('won'); done(); }
      });
      requestAnimationFrame(frame);
      return () => { alive = false; };
    },
  };

  // ---------------------------------------------------------------- modal
  let current = null, cleanup = null;

  function buildUI() {
    const m = el('div', 'adv-modal');
    m.id = 'adv-modal'; m.hidden = true;
    m.innerHTML = `<div class="adv-card" role="dialog" aria-modal="true">
        <button class="adv-icon-btn adv-say" aria-label="Read aloud">🔊</button>
        <button class="adv-icon-btn adv-close" aria-label="Close">✕</button>
        <div class="adv-daynum"></div><h2 class="adv-title"></h2>
        <div class="adv-stage"></div><div class="adv-after"></div></div>`;
    document.body.append(m);
    const cv = el('canvas'); cv.id = 'adv-confetti'; document.body.append(cv);
    const toast = el('div', 'adv-toast'); toast.id = 'adv-toast'; document.body.append(toast);
    $('.adv-close', m).onclick = close;
    $('.adv-say', m).onclick = () => current && speak(current.say);
    addEventListener('resize', () => { cv.width = 0; });
    buildParent();
  }

  function toast(msg) {
    const t = $('#adv-toast'); t.textContent = msg; restart(t, 'show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function tryOpen(d) {
    actx(); unlockAudio();
    if (status(d) === 'locked') {
      const line = P.notYet(sleepsUntil(d));
      toast('🔒 ' + line); speak(line); sfx.nope();
      return false;
    }
    return true;
  }

  function open(d) {
    const day = DAYS[d - 1]; current = day;
    if (cleanup) { cleanup(); cleanup = null; }
    const m = $('#adv-modal');
    m.hidden = false; m.dataset.type = day.type;
    requestAnimationFrame(() => m.classList.add('show'));
    $('.adv-daynum', m).textContent = `December ${d}`;
    $('.adv-title', m).textContent = day.title;
    $('.adv-say', m).hidden = !hasVoice(day.say);
    const stage = $('.adv-stage', m); stage.innerHTML = '';
    $('.adv-after', m).innerHTML = '';
    $('.adv-card', m).scrollTop = 0;
    cleanup = GAMES[day.type](stage, day.cfg || {}, () => win(day)) || null;
    sfx.sparkle();
    setTimeout(() => current === day && speak(day.say), 250);
  }

  function close() {
    if (cleanup) { cleanup(); cleanup = null; }
    stopBeat();
    hush();
    const m = $('#adv-modal'); m.classList.remove('show');
    setTimeout(() => { m.hidden = true; }, 250);
    current = null; onChange();
  }

  function win(day) {
    if (current !== day) return;
    const first = !S.opened[day.d];
    S.opened[day.d] = Date.now(); save();
    sfx.chime(); confetti(160, [day.sticker]);
    const note = S.notes[day.d];
    const after = $('#adv-modal .adv-after');
    const toyBox = window.Toys && window.Toys.ok;
    after.innerHTML = `
      <div class="adv-sticker-won"><div class="adv-sticker-big">${stickerHTML(day.d, true)}</div><div class="adv-toy-name"></div></div>
      ${note ? `<div class="adv-note"><b>📝 A special note for Neko</b><p></p>${niceVoice() ? '<button class="adv-btn adv-note-say">🔊 Read it to me</button>' : ''}</div>` : ''}
      ${toyBox ? '<button class="adv-btn adv-big adv-toybox">🎠 Put it in my toy box!</button>' : ''}
      <button class="adv-btn ${toyBox ? 'adv-quiet' : 'adv-big'} adv-done">All done 🎉</button>`;
    $('.adv-toy-name', after).textContent = first ? `You got ${day.toy.name}!` : `${day.toy.name} is happy to see you!`;
    if (note) {
      $('.adv-note p', after).textContent = note;
      const b = $('.adv-note-say', after); if (b) b.onclick = () => speakLive(note);
    }
    if (toyBox) $('.adv-toybox', after).onclick = () => { close(); setTimeout(() => window.Toys.open({ focus: day.d, entrance: true }), 280); };
    $('.adv-done', after).onclick = close;
    setTimeout(() => after.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300);
    setTimeout(() => current === day && speak(first ? (note ? P.newStickerNote : P.newSticker) : (note ? P.againNote : P.again)), 900);
    onChange();
  }

  // ---------------------------------------------------------------- grown-up mode
  // Tap any element marked [data-parent] five times quickly (or press Shift+P).
  function buildParent() {
    const p = el('div', 'adv-parent'); p.id = 'adv-parent'; p.hidden = true;
    p.innerHTML = `<div class="adv-parent-card">
      <h3>🔐 Grown-up settings</h3>
      <label>Pretend today is <input type="date" id="advp-date"></label>
      <button class="adv-small" id="advp-real">Use real date</button>
      <label class="adv-row"><input type="checkbox" id="advp-unlock"> Unlock every door</label>
      <hr>
      <label>Note for December <select id="advp-day"></select></label>
      <textarea id="advp-note" rows="3" placeholder="e.g. Look under your pillow! 🎁"></textarea>
      <button class="adv-small" id="advp-save">Save note</button> <span id="advp-saved"></span>
      <hr>
      <p class="adv-tip">Opened: <b id="advp-count"></b> / 25</p>
      <button class="adv-small" id="advp-unopen">Close all doors (keep notes)</button>
      <button class="adv-small danger" id="advp-reset">Reset everything</button>
      <div><button class="adv-btn" id="advp-close">Done</button></div></div>`;
    document.body.append(p);
    const sel = $('#advp-day', p);
    DAYS.forEach((d) => sel.append(new Option(`${d.d} — ${d.title}`, d.d)));
    const refresh = () => {
      $('#advp-date', p).value = S.pretend || '';
      $('#advp-unlock', p).checked = !!S.unlockAll;
      $('#advp-note', p).value = S.notes[sel.value] || '';
      $('#advp-count', p).textContent = Object.keys(S.opened).length;
      $('#advp-saved', p).textContent = '';
    };
    p._refresh = refresh;
    sel.onchange = refresh;
    $('#advp-date', p).onchange = (e) => { S.pretend = e.target.value || null; save(); onChange(); };
    $('#advp-real', p).onclick = () => { S.pretend = null; save(); refresh(); onChange(); };
    $('#advp-unlock', p).onchange = (e) => { S.unlockAll = e.target.checked; save(); onChange(); };
    $('#advp-save', p).onclick = () => {
      const v = $('#advp-note', p).value.trim();
      if (v) S.notes[sel.value] = v; else delete S.notes[sel.value];
      save(); $('#advp-saved', p).textContent = 'Saved ✓';
    };
    $('#advp-unopen', p).onclick = () => { if (confirm('Close all doors? Notes are kept.')) { S.opened = {}; save(); refresh(); onChange(); } };
    $('#advp-reset', p).onclick = () => { if (confirm('Reset everything, including notes?')) { S = { opened: {}, notes: {} }; save(); refresh(); onChange(); } };
    $('#advp-close', p).onclick = () => { p.hidden = true; };

    let taps = [];
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-parent]')) return;
      const now = Date.now(); taps = taps.filter((t) => now - t < 2500); taps.push(now);
      if (taps.length >= 5) { taps = []; showParent(); }
    });
    document.addEventListener('keydown', (e) => { if (e.shiftKey && e.key.toLowerCase() === 'p') showParent(); });
  }
  function showParent() { const p = $('#adv-parent'); p._refresh(); p.hidden = false; }

  // sticker picture: the 3D toy's portrait when available, emoji otherwise
  function stickerHTML(d, have = !!S.opened[d]) {
    if (!have) return String(d);
    const src = window.Toys && window.Toys.ok && window.Toys.thumb(d);
    return src ? `<img class="adv-thumb" src="${src}" alt="">` : DAYS[d - 1].sticker;
  }

  // ---------------------------------------------------------------- public API
  window.Advent = {
    DAYS, YEAR,
    init(opts = {}) {
      KEY = opts.key || KEY; onChange = opts.onChange || onChange;
      load(); buildUI(); onChange();
      // re-check at midnight-ish so a tab left open unlocks the new day
      setInterval(onChange, 60_000);
    },
    status, isToday, sleepsUntil, countdowns, tryOpen, open, close,
    openedCount: () => Object.keys(S.opened).length,
    stickers: () => DAYS.map((d) => ({ d: d.d, sticker: d.sticker, have: !!S.opened[d.d] })),
    speak, hush, sfx, tone, confetti, stickerHTML, snow, startBeat, stopBeat, showParent,
  };
})();
