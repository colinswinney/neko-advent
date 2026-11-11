/* Neko's Advent — the three looks. Each mount(root) draws its scene and returns a render() that
   refreshes door states. Progress is shared: switching looks never loses anything. */
(function () {
  const countdownHTML = () => Advent.countdowns().map((c) => `<span>${c}</span>`).join('');
  const stickersHTML = () => Advent.stickers().map((s) => (s.have ? `<span class="have">${Advent.stickerHTML(s.d)}</span>` : `<span class="empty">${s.d}</span>`)).join('');
  const openToyBox = () => window.Toys && window.Toys.ok && window.Toys.open();
  const nudge = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };
  const q = (root, s) => root.querySelector(s);

  window.THEMES = {
    // ------------------------------------------------------------- 🏠 Advent House
    house: {
      icon: '🏠', label: 'Advent House',
      mount(root) {
        root.innerHTML = `
          <div class="h-sky"><div class="h-moon"></div></div>
          <header class="h-head"><h1 data-parent>Neko's Advent House</h1><div class="countdown"></div></header>
          <div class="h-house">
            <div class="h-roof"><div class="h-ear l"></div><div class="h-ear r"></div>
              <div class="h-chimney"><span class="h-smoke"></span><span class="h-smoke"></span><span class="h-smoke"></span></div>
              <div class="h-attic">🐱</div></div>
            <div class="h-walls"></div><div class="h-ground"></div>
          </div>
          <section class="h-shelf"><h2>⭐ Sticker shelf: <span class="have">0</span> / 25</h2><div class="h-stickers"></div></section>`;
        Advent.snow(q(root, '.h-sky'), 50);
        q(root, '.h-shelf').onclick = openToyBox;
        const colors = ['#ff7eb6', '#8b7cff', '#3fc1e8', '#ffaf38', '#20c997', '#f06595', '#b197fc'];
        const wins = {};
        for (const day of Advent.DAYS) {
          const w = document.createElement('div');
          w.className = 'h-win';
          w.innerHTML = `<button class="h-inside" aria-label="Play day ${day.d} again"></button>
            <button class="h-door" style="--c:${colors[day.d % colors.length]}" aria-label="Door ${day.d}"><span class="n">${day.d}</span><span class="i">${day.icon}</span></button>`;
          q(w, '.h-door').onclick = () => {
            if (!Advent.tryOpen(day.d)) return nudge(w, 'nope');
            w.classList.add('open'); Advent.sfx.creak();
            setTimeout(() => Advent.open(day.d), 700);
          };
          q(w, '.h-inside').onclick = () => Advent.open(day.d);
          q(root, '.h-walls').append(w); wins[day.d] = w;
        }
        return () => {
          for (const day of Advent.DAYS) {
            const st = Advent.status(day.d), w = wins[day.d];
            w.classList.toggle('open', st === 'opened');
            const inside = q(w, '.h-inside'), want = st === 'opened' ? 'y' : 'n';
            if (inside.dataset.s !== want) { inside.dataset.s = want; inside.innerHTML = want === 'y' ? Advent.stickerHTML(day.d) : ''; }
            w.classList.toggle('ready', st === 'ready');
            w.classList.toggle('locked', st === 'locked');
            w.classList.toggle('today', Advent.isToday(day.d));
          }
          q(root, '.countdown').innerHTML = countdownHTML();
          q(root, '.h-shelf .have').textContent = Advent.openedCount();
          q(root, '.h-stickers').innerHTML = stickersHTML();
        };
      },
    },

    // ------------------------------------------------------------- 🧜‍♀️ Magic Sea & Sky
    sea: {
      icon: '🧜‍♀️', label: 'Magic Sea & Sky',
      mount(root) {
        const wave = (cls, fill) => `<svg class="s-wave ${cls}" viewBox="0 0 200 20" preserveAspectRatio="none"><path d="M0 10 Q 12.5 0 25 10 T 50 10 T 75 10 T 100 10 T 125 10 T 150 10 T 175 10 T 200 10 V20 H0Z" fill="${fill}"/></svg>`;
        root.innerHTML = `
          <div class="s-scene">
            <div class="s-sky"><div class="s-rainbow"></div>
              <div class="s-cloud" style="top:30%;animation-duration:60s;animation-delay:-10s"></div>
              <div class="s-cloud" style="top:60%;animation-duration:80s;animation-delay:-50s"></div>
              <div class="s-flyer" style="top:22%">🦄</div></div>
            <div class="s-sea">${wave('', '#4cc9f0')}${wave('b', '#8be1ff')}
              <div class="s-fish" style="top:20%;animation-duration:18s">🐠</div>
              <div class="s-fish" style="top:55%;animation-duration:24s;animation-delay:-8s">🐟</div>
              <div class="s-fish" style="top:38%;animation-duration:30s;animation-delay:-20s;font-size:52px">🧜‍♀️</div>
              <div class="s-fish" style="top:70%;animation-duration:40s;animation-delay:-5s">🐢</div>
              <div class="s-sand"></div>
              <div class="s-weed" style="left:4%">🌿</div><div class="s-weed" style="left:30%;animation-delay:-1s">🪸</div>
              <div class="s-weed" style="left:62%;animation-delay:-2s">🌿</div><div class="s-weed" style="right:4%;animation-delay:-.5s">🪸</div></div>
            <header class="s-head"><h1 data-parent>Neko's Magic Sea &amp; Sky</h1><div class="countdown"></div></header>
          </div>
`;
        const scene = q(root, '.s-scene'), sea = q(root, '.s-sea');
        for (let i = 0; i < 14; i++) {
          const s = document.createElement('span'); s.className = 's-rise';
          const k = 6 + Math.random() * 12;
          Object.assign(s.style, { left: Math.random() * 100 + '%', width: k + 'px', height: k + 'px', animationDuration: 5 + Math.random() * 6 + 's', animationDelay: -Math.random() * 10 + 's' });
          sea.append(s);
        }
        // 1–10 in the sky, 11–25 in the sea, left to right, with a gentle up/down wave
        const rowsY = [24, 37, 54, 69, 84];
        const spots = {};
        for (const day of Advent.DAYS) {
          const idx = day.d - 1, r = Math.floor(idx / 5), c = idx % 5;
          const b = document.createElement('button');
          b.className = 's-spot ' + (r < 2 ? 'air' : 'sea');
          b.style.left = 11 + c * 19.5 + '%';
          b.style.top = rowsY[r] + (c % 2 ? 2.5 : -2.5) + '%';
          b.style.setProperty('--dl', -(idx * 0.37) % 3 + 's');
          b.setAttribute('aria-label', 'Day ' + day.d);
          b.onclick = () => {
            if (!Advent.tryOpen(day.d)) return nudge(b, 'nope');
            if (Advent.status(day.d) === 'opened') return Advent.open(day.d);
            const rect = b.getBoundingClientRect();
            b.classList.add('burst'); Advent.sfx.pop();
            Advent.confetti(40, [r < 2 ? '✨' : '🫧'], rect.left + rect.width / 2, rect.top + rect.height / 2);
            setTimeout(() => { b.classList.remove('burst'); Advent.open(day.d); }, 500);
          };
          scene.append(b); spots[day.d] = b;
        }
        return () => {
          for (const day of Advent.DAYS) {
            const st = Advent.status(day.d), b = spots[day.d];
            b.classList.remove('locked', 'ready', 'opened'); b.classList.add(st);
            b.classList.toggle('today', Advent.isToday(day.d));
            b.innerHTML = st === 'opened' ? `<span class="ball">${Advent.stickerHTML(day.d)}</span>`
              : `<span class="ball"><span class="n">${day.d}</span></span><span class="i">${st === 'locked' ? '' : day.icon}</span>`;
          }
          q(root, '.countdown').innerHTML = countdownHTML();
        };
      },
    },

    // ------------------------------------------------------------- 🎤 Christmas Concert
    stage: {
      icon: '🎤', label: 'Christmas Concert',
      mount(root) {
        root.innerHTML = `
          <div class="k-lights"><div class="k-beam a"></div><div class="k-beam b"></div><div class="k-beam c"></div></div>
          <div class="k-flash"></div>
          <header class="k-head"><div class="k-marquee"><h1 data-parent>NEKO'S CHRISTMAS<br>CONCERT<small>★ live on stage ★</small></h1></div><div class="countdown"></div></header>
          <div class="k-stage"></div><div class="k-floor"></div><div class="k-crowd"></div>
          <section class="k-book"><h2>💜 Fan sticker collection: <span class="have">0</span>/25</h2><div class="k-row"></div></section>`;
        Advent.snow(q(root, '.k-lights'), 30, ['✦', '✧', '♥', '★']);
        q(root, '.k-book').onclick = openToyBox;
        const flash = q(root, '.k-flash');
        const hues = [320, 280, 190, 45, 340, 260, 170];
        const tiles = {};
        for (const day of Advent.DAYS) {
          const t = document.createElement('button');
          t.className = 'k-tile'; t.style.setProperty('--h', hues[day.d % hues.length]);
          t.setAttribute('aria-label', 'Day ' + day.d);
          t.onclick = () => {
            if (!Advent.tryOpen(day.d)) return nudge(t, 'nope');
            if (Advent.status(day.d) === 'opened') return Advent.open(day.d);
            t.classList.add('spin'); nudge(flash, 'go');
            Advent.sfx.sparkle(); Advent.startBeat(); setTimeout(Advent.stopBeat, 900);
            setTimeout(() => { t.classList.remove('spin'); Advent.open(day.d); }, 650);
          };
          q(root, '.k-stage').append(t); tiles[day.d] = t;
        }
        const colors = ['#ff2e93', '#8a5cff', '#40e0ff', '#ffe600', '#ff7ad9'];
        for (let i = 0; i < 12; i++) {
          const s = document.createElement('div'); s.className = 'k-stick';
          s.style.setProperty('--c', colors[i % colors.length]); s.style.animationDelay = -(i % 4) * 0.25 + 's';
          q(root, '.k-crowd').append(s);
        }
        return () => {
          for (const day of Advent.DAYS) {
            const st = Advent.status(day.d), t = tiles[day.d];
            t.classList.remove('locked', 'ready', 'opened'); t.classList.add(st);
            t.classList.toggle('today', Advent.isToday(day.d));
            t.innerHTML = st === 'opened' ? `<span class="s">${Advent.stickerHTML(day.d)}</span>` : `<span class="n">${day.d}</span><span class="i">${day.icon}</span>`;
          }
          q(root, '.countdown').innerHTML = countdownHTML();
          q(root, '.k-book .have').textContent = Advent.openedCount();
          q(root, '.k-row').innerHTML = stickersHTML();
        };
      },
    },
  };
})();
