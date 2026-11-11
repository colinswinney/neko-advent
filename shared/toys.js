/* Neko's Advent — 3D toys + the Toy Box merry-go-round.
   Every sticker is a little toon-shaded 3D toy built from simple shapes (no image files).
   Toys.thumb(d)   → picture of toy d (data URL) for shelves and the "you got it!" screen
   Toys.open({focus, entrance}) → opens the Toy Box; focus a toy to have it drop in and say hi. */
(function () {
  'use strict';
  const T = window.THREE;
  if (!T) { window.Toys = { ok: false }; return; }

  // ================================================================= materials & shape kit
  const grad = (() => { const t = new T.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, T.RedFormat); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t; })();
  const mats = {};
  const M = (c, basic) => mats[c + (basic ? 'b' : '')] || (mats[c + (basic ? 'b' : '')] = basic ? new T.MeshBasicMaterial({ color: c }) : new T.MeshToonMaterial({ color: c, gradientMap: grad }));
  const OUT = new T.ShaderMaterial({
    uniforms: { k: { value: 0.016 } }, side: T.BackSide,
    vertexShader: 'uniform float k; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vec3 n = normalize(mat3(modelMatrix) * normal); w.xyz += n * k; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.25,0.15,0.36,1.0); }',
  });
  const C = { skin: 0xffd9bd, pink: 0xff8cc0, hot: 0xff4f9a, lilac: 0xc9a8ff, purple: 0x8b5cf6, teal: 0x22c3b4, aqua: 0x7fdcf5, gold: 0xffc83d, dkgold: 0xf0a800, yellow: 0xffe066,
    white: 0xfbf8ff, red: 0xee3e4e, green: 0x34c178, dkgreen: 0x1f9256, brown: 0xa0643a, choc: 0x6e3b1e, black: 0x2c2238, gray: 0xb8b2c8, orange: 0xff9c3a, blue: 0x4f96ff,
    navy: 0x2f3d70, silver: 0xe4e7f0, cream: 0xfff0d8, peach: 0xffb59e };

  const geo = {};
  const G = (k, f) => geo[k] || (geo[k] = f());
  const sph = (r) => G('s' + r, () => new T.SphereGeometry(r, 28, 20));
  const cap = (r, l) => G('c' + r + l, () => new T.CapsuleGeometry(r, l, 8, 18));
  const cone = (r, h) => G('k' + r + h, () => new T.ConeGeometry(r, h, 28));
  const cyl = (a, b, h) => G('y' + a + b + h, () => new T.CylinderGeometry(a, b, h, 28));
  const tor = (R, t, arc = Math.PI * 2) => G('t' + R + t + arc, () => new T.TorusGeometry(R, t, 12, 48, arc));
  const extrude = (k, shape, depth, bevel) => G(k, () => { const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 24 }); g.center(); return g; });
  function rbox(w, h, d) {
    return G('b' + w + h + d, () => {
      const b = Math.min(w, h, d) * 0.22, iw = w - 2 * b, ih = h - 2 * b, r = Math.min(iw, ih) * 0.2, s = new T.Shape();
      s.moveTo(-iw / 2 + r, -ih / 2); s.lineTo(iw / 2 - r, -ih / 2); s.quadraticCurveTo(iw / 2, -ih / 2, iw / 2, -ih / 2 + r);
      s.lineTo(iw / 2, ih / 2 - r); s.quadraticCurveTo(iw / 2, ih / 2, iw / 2 - r, ih / 2); s.lineTo(-iw / 2 + r, ih / 2);
      s.quadraticCurveTo(-iw / 2, ih / 2, -iw / 2, ih / 2 - r); s.lineTo(-iw / 2, -ih / 2 + r); s.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2 + r, -ih / 2);
      const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4 }); g.center(); return g;
    });
  }
  function starShape(R, r, n = 5) {
    const s = new T.Shape();
    for (let i = 0; i < n * 2; i++) { const a = Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r : R; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    return s;
  }
  function heartShape() {
    const s = new T.Shape(); s.moveTo(0, -0.36);
    s.bezierCurveTo(-0.16, -0.2, -0.46, -0.04, -0.43, 0.16); s.bezierCurveTo(-0.4, 0.36, -0.14, 0.42, 0, 0.24);
    s.bezierCurveTo(0.14, 0.42, 0.4, 0.36, 0.43, 0.16); s.bezierCurveTo(0.46, -0.04, 0.16, -0.2, 0, -0.36);
    return s;
  }

  // add a part: position p, options r (rotation), s (scale), line (outline on/off), basic (flat colour), order
  function add(par, g, color, p, o = {}) {
    const m = new T.Mesh(g, M(color, o.basic));
    if (o.line !== false && !o.basic) m.add(new T.Mesh(g, OUT));
    if (p) m.position.set(p[0], p[1], p[2]);
    if (o.order) m.rotation.order = o.order;
    if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
    if (o.s != null) Array.isArray(o.s) ? m.scale.set(o.s[0], o.s[1], o.s[2]) : m.scale.setScalar(o.s);
    par.add(m); return m;
  }
  // cute face looking toward +z
  function face(g, x, y, z, k = 1, o = {}) {
    const gap = 0.1 * k;
    for (const s of [-1, 1]) {
      add(g, sph(0.046 * k), 0x2a1d3a, [x + s * gap, y, z], { s: [1, 1.25, 0.6], basic: true });
      add(g, sph(0.017 * k), 0xffffff, [x + s * gap + 0.014 * k, y + 0.024 * k, z + 0.025 * k], { basic: true });
      if (o.cheeks !== false) add(g, sph(0.04 * k), 0xff94b8, [x + s * (gap + 0.075 * k), y - 0.06 * k, z - 0.012 * k], { s: [1, 0.6, 0.4], basic: true });
    }
    if (o.smile !== false) add(g, tor(0.036 * k, 0.011 * k, Math.PI), 0x2a1d3a, [x, y - 0.055 * k, z + 0.004], { r: [0, 0, Math.PI], basic: true });
  }

  // ================================================================= body templates
  function chibi(o) {
    const g = new T.Group(), top = o.top, bottom = o.bottom ?? top, skin = o.skin ?? C.skin;
    const legs = [], arms = [];
    for (const s of [-1, 1]) {
      const leg = new T.Group(); leg.position.set(s * 0.09, 0.3, 0); g.add(leg);
      add(leg, cap(0.07, 0.16), bottom, [0, -0.13, 0]);
      add(leg, sph(0.08), o.shoes ?? C.black, [0, -0.25, 0.03], { s: [1, 0.65, 1.35] });
      legs.push(leg);
    }
    if (o.dress) add(g, cone(0.32, 0.44), top, [0, 0.43, 0]);
    else add(g, cyl(0.15, 0.19, 0.32), top, [0, 0.44, 0]);
    for (const s of [-1, 1]) {
      const arm = new T.Group(); arm.position.set(s * 0.15, 0.57, 0); g.add(arm);
      add(arm, cap(0.05, 0.16), o.sleeve ?? top, [0, -0.12, 0]);
      add(arm, sph(0.056), skin, [0, -0.25, 0]);
      arm.rotation.z = s * (o.armsUp ? 2.6 : 0.35);
      arms.push(arm);
    }
    add(g, sph(0.26), skin, [0, 0.84, 0]);
    if (o.hair != null) add(g, G('hair', () => new T.SphereGeometry(0.285, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55)), o.hair, [0, 0.85, -0.015], { r: [-0.4, 0, 0] });
    face(g, 0, 0.8, 0.232);
    g.userData = { legs, arms };
    return g;
  }

  function quad(o) {
    const wrap = new T.Group(), g = new T.Group(); wrap.add(g);
    g.rotation.y = -0.7; g.position.x = -0.03;
    const body = o.body, leg = o.leg ?? body;
    add(g, cap(0.19, 0.32), body, [0, 0.5, 0], { r: [0, 0, Math.PI / 2] });
    for (const [x, z] of [[0.2, 0.1], [0.2, -0.1], [-0.2, 0.1], [-0.2, -0.1]]) {
      add(g, cyl(0.06, 0.055, 0.36), leg, [x, 0.22, z]);
      add(g, cyl(0.066, 0.07, 0.07), o.hoof ?? C.gray, [x, 0.035, z]);
    }
    add(g, cap(0.1, 0.18), body, [0.27, 0.7, 0], { r: [0, 0, -0.55] });
    const head = new T.Group(); head.position.set(0.36, 0.9, 0.02); head.rotation.y = 0.97; g.add(head);
    add(head, sph(0.18), body, [0, 0, 0]);
    add(head, sph(0.11), o.snout ?? body, [0, -0.06, 0.14], { s: [1.05, 0.85, 1] });
    face(head, 0, 0.05, 0.155, 0.8, { smile: false });
    add(head, tor(0.03, 0.009, Math.PI), 0x2a1d3a, [0, -0.085, 0.245], { r: [0, 0, Math.PI], basic: true });
    if (o.dog) {
      add(head, sph(0.04), C.black, [0, -0.03, 0.25]);
      for (const s of [-1, 1]) add(head, sph(0.09), o.ear, [s * 0.17, 0.02, -0.01], { s: [0.45, 1, 0.8], r: [0, 0, s * 0.35] });
      add(g, cap(0.04, 0.16), body, [-0.34, 0.66, 0], { r: [0, 0, 0.7] });
    } else {
      for (const s of [-1, 1]) add(head, cone(0.05, 0.12), o.earColor ?? body, [s * 0.09, 0.18, -0.03], { r: [0, 0, -s * 0.3] });
      const mane = o.mane ?? [o.body];
      [[0.19, 0.74], [0.23, 0.86], [0.27, 0.98], [0.33, 1.07]].forEach(([x, y], i) => add(g, sph(0.075), mane[i % mane.length], [x - 0.05, y, 0]));
      [[-0.36, 0.58, 0.08], [-0.43, 0.48, 0.075], [-0.46, 0.36, 0.07]].forEach(([x, y, r], i) => add(g, sph(r), mane[(i + 1) % mane.length], [x, y, 0]));
    }
    if (o.horn) {
      add(head, cone(0.04, 0.24), C.gold, [0, 0.22, 0.08], { r: [0.45, 0, 0] });
      add(head, tor(0.032, 0.008), C.dkgold, [0, 0.17, 0.06], { r: [Math.PI / 2 + 0.45, 0, 0] });
    }
    if (o.antlers) for (const s of [-1, 1]) {
      add(head, cyl(0.02, 0.026, 0.22), C.cream, [s * 0.09, 0.26, -0.03], { r: [0, 0, -s * 0.35] });
      add(head, cyl(0.016, 0.02, 0.12), C.cream, [s * 0.15, 0.3, -0.03], { r: [0, 0, -s * 1.1] });
      add(head, cyl(0.016, 0.02, 0.1), C.cream, [s * 0.11, 0.37, -0.03], { r: [0, 0, s * 0.2] });
    }
    if (o.rednose) add(head, sph(0.045), C.red, [0, -0.04, 0.25]);
    g.userData.head = head;
    return { wrap, g, head };
  }

  // ================================================================= the 25 toys
  const BUILD = {
    1() { const g = new T.Group(); add(g, extrude('star', starShape(0.5, 0.23), 0.12, 0.05), C.yellow, [0, 0.6, 0]); face(g, 0, 0.62, 0.16); return g; },
    2() { // mermaid
      const g = new T.Group();
      [[0, 0.42, 0.17], [0.05, 0.27, 0.14], [0.12, 0.15, 0.11]].forEach(([x, y, r]) => add(g, sph(r), C.teal, [x, y, 0]));
      for (const s of [-1, 1]) add(g, cone(0.09, 0.22), C.aqua, [0.2 + s * 0.06, 0.07, 0], { r: [0, 0, -Math.PI / 2 - s * 0.6], s: [1, 1, 0.45] });
      add(g, cyl(0.12, 0.15, 0.22), C.skin, [0, 0.62, 0]);
      for (const s of [-1, 1]) add(g, sph(0.06), C.purple, [s * 0.06, 0.67, 0.1], { s: [1, 0.8, 0.6] });
      add(g, cap(0.17, 0.4), C.hot, [0, 0.72, -0.13], { s: [1.1, 1, 0.6] });
      for (const s of [-1, 1]) { const a = new T.Group(); a.position.set(s * 0.13, 0.7, 0); a.rotation.z = s * 0.5; g.add(a); add(a, cap(0.045, 0.15), C.skin, [0, -0.11, 0]); }
      add(g, sph(0.25), C.skin, [0, 0.95, 0]);
      add(g, G('hair', () => new T.SphereGeometry(0.285, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55)), C.hot, [0, 0.96, -0.015], { r: [-0.4, 0, 0] });
      add(g, extrude('star-s', starShape(0.07, 0.035), 0.02, 0.01), C.yellow, [0.16, 1.12, 0.12], { r: [0, 0.4, 0.3] });
      face(g, 0, 0.91, 0.222);
      return g;
    },
    3() { const q = quad({ body: C.white, snout: 0xfff4fb, mane: [C.pink, C.lilac, C.aqua, C.yellow], horn: true, hoof: C.lilac }); return q.wrap; },
    4() { // taekwondo kid, side kick
      const g = chibi({ top: C.white, bottom: C.white, hair: C.black, shoes: C.skin });
      add(g, tor(0.165, 0.026), C.black, [0, 0.36, 0], { r: [Math.PI / 2, 0, 0] });
      add(g, rbox(0.05, 0.14, 0.03), C.black, [0.07, 0.29, 0.17], { r: [0, 0, 0.3] });
      g.userData.legs[1].rotation.z = 1.25;
      g.userData.arms[0].rotation.z = -1.9; g.userData.arms[1].rotation.z = 0.9;
      g.position.x = -0.06;
      return g;
    },
    5() { // Sinterklaas's horse
      const q = quad({ body: 0xf4f2f8, snout: 0xe8e4ef, mane: [0xc9c3d6, 0xb4adc4], hoof: 0x7d7590 });
      add(q.g, rbox(0.38, 0.06, 0.44), C.red, [0, 0.69, 0]);
      add(q.g, rbox(0.42, 0.03, 0.48), C.gold, [0, 0.66, 0]);
      return q.wrap;
    },
    6() { // chocolate letter N
      const g = new T.Group();
      add(g, rbox(0.17, 0.78, 0.15), C.choc, [-0.23, 0.45, 0]); add(g, rbox(0.17, 0.78, 0.15), C.choc, [0.23, 0.45, 0]);
      add(g, rbox(0.17, 0.9, 0.15), 0x7a4424, [0, 0.45, 0], { r: [0, 0, 0.53] });
      face(g, 0, 0.47, 0.09, 0.75);
      return g;
    },
    7() { // dancer
      const g = chibi({ top: C.red, dress: true, armsUp: true, hair: 0x5a3020, shoes: C.red });
      add(g, sph(0.1), 0x5a3020, [0, 1.13, -0.05]);
      add(g, sph(0.05), C.pink, [0.13, 1.06, 0.12]);
      return g;
    },
    8() { // rescue pup
      const q = quad({ body: 0xdba46a, snout: C.cream, dog: true, ear: 0x9b5e34, leg: 0xdba46a, hoof: 0xc58d55 });
      add(q.g, tor(0.105, 0.03), C.blue, [0.29, 0.74, 0], { order: 'ZXY', r: [Math.PI / 2, 0, -0.55] });
      add(q.g, cyl(0.055, 0.055, 0.02), C.gold, [0.36, 0.67, 0.08], { r: [Math.PI / 2, 0, 0] });
      return q.wrap;
    },
    9() { const g = new T.Group(); add(g, extrude('heart', heartShape(), 0.14, 0.06), C.hot, [0, 0.52, 0]); face(g, 0, 0.56, 0.17); return g; },
    10() { // balloon
      const g = new T.Group();
      add(g, sph(0.3), C.pink, [0, 0.8, 0], { s: [1, 1.15, 1] });
      add(g, cone(0.06, 0.08), C.pink, [0, 0.43, 0], { r: [Math.PI, 0, 0] });
      add(g, cyl(0.006, 0.006, 0.4), C.white, [0, 0.2, 0], { line: false });
      add(g, sph(0.06), 0xffffff, [-0.13, 0.97, 0.21], { s: [0.7, 1.2, 0.4], basic: true });
      face(g, 0, 0.8, 0.27);
      return g;
    },
    11() { // kitty
      const g = new T.Group(), fur = 0xd9c8ea;
      add(g, sph(0.24), fur, [0, 0.26, 0], { s: [1, 1.05, 0.95] });
      for (const s of [-1, 1]) add(g, sph(0.07), fur, [s * 0.1, 0.06, 0.17], { s: [1, 0.7, 1.2] });
      add(g, tor(0.14, 0.04, Math.PI * 1.1), fur, [-0.2, 0.22, -0.06], { r: [0, 0.3, 0.6] });
      add(g, sph(0.23), fur, [0, 0.62, 0]);
      for (const s of [-1, 1]) { add(g, cone(0.08, 0.15), fur, [s * 0.13, 0.82, 0], { r: [0, 0, -s * 0.35] }); add(g, cone(0.045, 0.08), C.pink, [s * 0.13, 0.8, 0.04], { r: [0, 0, -s * 0.35], line: false }); }
      face(g, 0, 0.6, 0.205);
      add(g, sph(0.025), C.hot, [0, 0.565, 0.225], { basic: true });
      for (const s of [-1, 1]) for (const t of [-0.08, 0.08]) add(g, cyl(0.004, 0.004, 0.15), 0x6b5a80, [s * 0.15, 0.56, 0.19], { r: [0, 0, Math.PI / 2 + s * t], basic: true });
      for (const s of [-1, 1]) add(g, sph(0.05), C.hot, [0.17 + s * 0.05, 0.8, 0.06], { s: [1, 0.8, 0.6] });
      return g;
    },
    12() { // maracas
      const g = new T.Group();
      [[-0.14, 0.35, C.hot, C.yellow], [0.14, -0.35, C.teal, C.pink]].forEach(([x, rz, c1, c2]) => {
        const m = new T.Group(); m.position.x = x; m.rotation.z = rz; g.add(m);
        add(m, sph(0.16), c1, [0, 0.6, 0], { s: [1, 1.2, 1] });
        add(m, tor(0.152, 0.022), c2, [0, 0.55, 0], { r: [Math.PI / 2, 0, 0] });
        add(m, tor(0.148, 0.022), c2, [0, 0.67, 0], { r: [Math.PI / 2, 0, 0] });
        add(m, cyl(0.034, 0.045, 0.34), C.gold, [0, 0.25, 0]);
        face(m, 0, 0.62, 0.15, 0.55);
      });
      return g;
    },
    13() { // gold medal
      const g = new T.Group();
      add(g, rbox(0.14, 0.56, 0.03), C.red, [-0.09, 0.84, -0.03], { r: [0, 0, -0.32] });
      add(g, rbox(0.14, 0.56, 0.03), C.blue, [0.09, 0.84, -0.03], { r: [0, 0, 0.32] });
      add(g, cyl(0.27, 0.27, 0.07), C.gold, [0, 0.4, 0], { r: [Math.PI / 2, 0, 0] });
      add(g, tor(0.22, 0.015), C.dkgold, [0, 0.4, 0.04]);
      add(g, extrude('star-m', starShape(0.15, 0.07), 0.03, 0.015), C.dkgold, [0, 0.4, 0.055]);
      return g;
    },
    14() { // snowman
      const g = new T.Group();
      add(g, sph(0.3), C.white, [0, 0.3, 0]); add(g, sph(0.22), C.white, [0, 0.71, 0]); add(g, sph(0.17), C.white, [0, 1.01, 0]);
      face(g, 0, 1.03, 0.15, 0.75, { smile: false });
      add(g, cone(0.035, 0.16), C.orange, [0, 0.98, 0.22], { r: [Math.PI / 2, 0, 0] });
      [0.76, 0.66].forEach((y) => add(g, sph(0.03), C.black, [0, y, 0.21]));
      add(g, tor(0.16, 0.045), C.red, [0, 0.87, 0], { r: [Math.PI / 2, 0, 0] });
      add(g, rbox(0.08, 0.2, 0.04), C.red, [0.1, 0.78, 0.15], { r: [0, 0, 0.2] });
      add(g, cyl(0.17, 0.17, 0.025), C.black, [0, 1.16, 0]); add(g, cyl(0.11, 0.11, 0.17), C.black, [0, 1.25, 0]);
      add(g, cyl(0.113, 0.113, 0.035), C.red, [0, 1.19, 0], { line: false });
      for (const s of [-1, 1]) add(g, cyl(0.014, 0.018, 0.3), C.brown, [s * 0.3, 0.8, 0], { r: [0, 0, -s * 1.0] });
      return g;
    },
    15() { // rainbow
      const g = new T.Group();
      [C.red, C.orange, C.yellow, C.green, C.blue, C.purple].forEach((c, i) => add(g, tor(0.5 - i * 0.066, 0.036, Math.PI), c, [0, 0.14, 0]));
      for (const s of [-1, 1]) { add(g, sph(0.13), C.white, [s * 0.46, 0.14, 0.02]); add(g, sph(0.1), C.white, [s * 0.46 + 0.11, 0.1, 0.02]); add(g, sph(0.1), C.white, [s * 0.46 - 0.11, 0.1, 0.02]); face(g, s * 0.46, 0.15, 0.14, 0.55); }
      return g;
    },
    16() { // scallop shell + pearl
      const g = new T.Group();
      for (let i = 0; i < 7; i++) {
        const a = -0.95 + i * 0.317;
        add(g, cap(0.075, 0.38), i % 2 ? C.peach : 0xffcfbd, [Math.sin(a) * 0.27, 0.14 + Math.cos(a) * 0.27, 0], { r: [0, 0, -a], s: [1, 1, 0.5] });
      }
      add(g, sph(0.1), C.peach, [0, 0.12, 0], { s: [1.5, 0.8, 0.8] });
      add(g, sph(0.08), 0xfdf6ff, [0, 0.16, 0.14]);
      face(g, 0, 0.44, 0.045, 0.75);
      return g;
    },
    17() { // golden microphone
      const g = new T.Group(), m = new T.Group(); m.rotation.z = -0.28; g.add(m);
      add(m, cyl(0.055, 0.04, 0.44), C.purple, [0, 0.3, 0]);
      add(m, cyl(0.078, 0.066, 0.07), C.gold, [0, 0.54, 0]);
      add(m, sph(0.15), C.gold, [0, 0.67, 0]);
      for (let i = 0; i < 3; i++) add(m, tor(0.151, 0.006), C.dkgold, [0, 0.67, 0], { r: [0, (i * Math.PI) / 3, 0], basic: true });
      add(m, tor(0.151, 0.006), C.dkgold, [0, 0.67, 0], { r: [Math.PI / 2, 0, 0], basic: true });
      add(g, extrude('star-s', starShape(0.07, 0.035), 0.02, 0.01), C.yellow, [0.3, 0.86, 0]);
      add(g, extrude('star-s', starShape(0.07, 0.035), 0.02, 0.01), C.pink, [-0.22, 0.72, 0.05], { s: 0.7 });
      return g;
    },
    18() { // christmas tree
      const g = new T.Group();
      add(g, cyl(0.07, 0.08, 0.16), C.brown, [0, 0.08, 0]);
      const tiers = [[0.45, 0.42, 0.37], [0.36, 0.38, 0.66], [0.26, 0.34, 0.92]];
      tiers.forEach(([r, h, y], i) => add(g, cone(r, h), i % 2 ? C.dkgreen : C.green, [0, y, 0]));
      const orn = [[0.3, 0.6, C.red], [0.3, -0.5, C.gold], [0.58, 0.3, C.blue], [0.6, -0.7, C.hot], [0.84, 0.1, C.yellow]];
      orn.forEach(([y, a, c]) => {
        const t = tiers.find(([, h, cy]) => y >= cy - h / 2 && y <= cy + h / 2) || tiers[0];
        const r = t[0] * (1 - (y - (t[2] - t[1] / 2)) / t[1]) + 0.02;
        add(g, sph(0.045), c, [Math.sin(a) * r, y, Math.cos(a) * r]);
      });
      add(g, extrude('star-t', starShape(0.12, 0.055), 0.04, 0.02), C.yellow, [0, 1.16, 0]);
      face(g, 0, 0.62, 0.235, 0.8);
      return g;
    },
    19() { // penguin
      const g = new T.Group();
      add(g, sph(0.3), C.navy, [0, 0.4, 0], { s: [1, 1.25, 0.95] });
      add(g, sph(0.25), C.white, [0, 0.34, 0.13], { s: [0.85, 1.05, 0.7] });
      face(g, 0, 0.62, 0.245, 1, { smile: false });
      add(g, cone(0.06, 0.13), C.orange, [0, 0.54, 0.3], { r: [2.0, 0, 0] });
      for (const s of [-1, 1]) { add(g, sph(0.07), C.orange, [s * 0.1, 0.04, 0.12], { s: [1.2, 0.5, 1.6] }); add(g, sph(0.1), C.navy, [s * 0.3, 0.42, 0], { s: [0.4, 1.2, 0.8], r: [0, 0, s * 0.3] }); }
      add(g, G('beanie', () => new T.SphereGeometry(0.26, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42)), C.red, [0, 0.6, -0.01], { r: [-0.25, 0, 0] });
      add(g, sph(0.065), C.white, [0, 0.87, -0.04]);
      return g;
    },
    20() { // snowflake
      const g = new T.Group(), f = new T.Group(); f.position.y = 0.62; g.add(f);
      for (let k = 0; k < 6; k++) {
        const arm = new T.Group(); arm.rotation.z = (k * Math.PI) / 3; f.add(arm);
        add(arm, rbox(0.07, 0.42, 0.07), 0xbfeaff, [0, 0.3, 0]);
        for (const s of [-1, 1]) add(arm, rbox(0.05, 0.15, 0.05), 0xd9f4ff, [s * 0.07, 0.38, 0], { r: [0, 0, -s * 0.8] });
        add(arm, sph(0.04), C.white, [0, 0.52, 0]);
      }
      add(f, sph(0.13), C.aqua, [0, 0, 0]);
      face(f, 0, 0.01, 0.115, 0.75);
      return g;
    },
    21() { // carousel pony
      const g = new T.Group();
      add(g, cyl(0.26, 0.29, 0.07), C.pink, [0, 0.035, 0]);
      add(g, cyl(0.022, 0.022, 1.3), C.gold, [0, 0.68, 0]);
      add(g, sph(0.05), C.gold, [0, 1.35, 0]);
      const q = quad({ body: 0xffe3f1, snout: 0xffd0e6, mane: [C.lilac, C.aqua], hoof: C.gold });
      add(q.g, rbox(0.3, 0.06, 0.42), C.purple, [0, 0.69, 0]);
      q.wrap.scale.setScalar(0.78); q.wrap.position.y = 0.22; g.add(q.wrap);
      return g;
    },
    22() { const q = quad({ body: 0xb5783f, snout: 0xe8c9a0, mane: [0x8d5a2b], antlers: true, rednose: true, hoof: 0x5a3a20 }); return q.wrap; },
    23() { // elf
      const g = chibi({ top: C.green, bottom: C.red, hair: 0xc8743a, shoes: C.green });
      add(g, cone(0.2, 0.42), C.green, [0, 1.2, -0.02], { r: [0, 0, -0.35] });
      add(g, tor(0.19, 0.035), C.red, [0, 1.0, -0.01], { r: [Math.PI / 2, 0, 0] });
      add(g, sph(0.05), C.gold, [0.08, 1.41, -0.02]);
      for (const s of [-1, 1]) add(g, cone(0.05, 0.14), C.skin, [s * 0.27, 0.86, 0], { r: [0, 0, -s * 1.3] });
      add(g, tor(0.165, 0.026), C.gold, [0, 0.33, 0], { r: [Math.PI / 2, 0, 0] });
      return g;
    },
    24() { // Santa
      const g = chibi({ top: C.red, bottom: C.red });
      add(g, tor(0.19, 0.035), C.white, [0, 0.29, 0], { r: [Math.PI / 2, 0, 0] });
      add(g, tor(0.17, 0.028), C.black, [0, 0.4, 0], { r: [Math.PI / 2, 0, 0] });
      add(g, rbox(0.09, 0.07, 0.03), C.gold, [0, 0.4, 0.18]);
      add(g, sph(0.2), C.white, [0, 0.6, 0.12], { s: [1.05, 0.85, 0.6] });
      for (const s of [-1, 1]) add(g, sph(0.05), C.white, [s * 0.05, 0.73, 0.22], { s: [1.3, 0.7, 0.7] });
      add(g, cone(0.25, 0.38), C.red, [0, 1.14, -0.01], { r: [0, 0, -0.32] });
      add(g, tor(0.24, 0.05), C.white, [0, 0.98, -0.01], { r: [Math.PI / 2, 0, 0] });
      add(g, sph(0.07), C.white, [0.12, 1.33, -0.01]);
      return g;
    },
    25() { return gift(C.red, 0xd92c3c, C.gold, true); },
  };
  function gift(box, lid, ribbon, withFace) {
    const g = new T.Group();
    add(g, rbox(0.56, 0.4, 0.56), box, [0, 0.2, 0]);
    add(g, rbox(0.57, 0.41, 0.1), ribbon, [0, 0.2, 0], { line: false });
    add(g, rbox(0.63, 0.12, 0.63), lid, [0, 0.45, 0]);
    add(g, rbox(0.64, 0.13, 0.11), ribbon, [0, 0.45, 0], { line: false });
    add(g, rbox(0.11, 0.13, 0.64), ribbon, [0, 0.45, 0], { line: false });
    for (const s of [-1, 1]) add(g, tor(0.09, 0.035), ribbon, [s * 0.08, 0.57, 0], { r: [0, Math.PI / 2, s * 0.6] });
    add(g, sph(0.05), ribbon, [0, 0.55, 0]);
    if (withFace) face(g, 0, 0.21, 0.285, 1.1);
    return g;
  }
  const makeToy = (d) => (BUILD[d] ? BUILD[d]() : gift(C.lilac, C.lilac, C.white));
  const lights = (scene) => {
    scene.add(new T.HemisphereLight(0xffffff, 0xd8c8ff, 1.6));
    const sun = new T.DirectionalLight(0xffffff, 1.6); sun.position.set(2, 4, 5); scene.add(sun);
  };

  // ================================================================= sticker pictures
  const thumbs = {};
  let tr, tscene, tcam;
  function thumb(d) {
    if (thumbs[d]) return thumbs[d];
    try {
      if (!tr) {
        tr = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        tr.setSize(256, 256, false); tr.setClearColor(0x000000, 0);
        tscene = new T.Scene(); lights(tscene);
        tcam = new T.PerspectiveCamera(30, 1, 0.1, 50);
      }
      const toy = makeToy(d); toy.rotation.y = 0.25; tscene.add(toy);
      const box = new T.Box3().setFromObject(toy), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
      const dist = (Math.max(size.x, size.y) / 2 / Math.tan((15 * Math.PI) / 180)) * 1.12;
      tcam.position.set(c.x, c.y + dist * 0.12, c.z + dist); tcam.lookAt(c);
      tr.render(tscene, tcam);
      thumbs[d] = tr.domElement.toDataURL('image/png');
      tscene.remove(toy);
    } catch (e) { thumbs[d] = null; }
    return thumbs[d];
  }

  // ================================================================= toy box (merry-go-round)
  const N = 25, R = 4.2;
  let built = false, ui, renderer, scene, camera, platform, dim, snow, raf = 0, clock;
  let rot = 0, vel = 0, mode = 'carousel', focused = null, busy = false, musicOn = true, musicTimer = 0, last = 0, holdUntil = 0;
  const slots = [], tweens = [], bursts = [];
  const P = () => window.ADVENT_PHRASES;
  const easeBack = (p) => 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2);
  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  function tween(dur, fn, done) { tweens.push({ t: 0, dur, fn, done }); }

  function labelTexture(text) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#c9a8ff'; x.stroke();
    x.fillStyle = '#6b3fa0'; x.font = 'bold 64px Fredoka, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 64, 68);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  function dotTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
  }

  function build() {
    built = true;
    ui = document.createElement('div'); ui.className = 'tb'; ui.hidden = true;
    ui.innerHTML = `<canvas class="tb-canvas"></canvas>
      <div class="tb-top"><h2>🎠 Neko's Toy Box</h2><span class="tb-count"></span></div>
      <button class="tb-btn tb-close" aria-label="Close toy box">✕</button>
      <button class="tb-btn tb-music" aria-label="Music on or off">🎵</button>
      <div class="tb-name" hidden></div>
      <button class="tb-back" hidden>⬅ Back to the merry-go-round</button>
      <div class="tb-hint">👆 Swipe to spin · tap a toy!</div>`;
    document.body.append(ui);
    const canvas = ui.querySelector('canvas');
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    scene = new T.Scene(); lights(scene);
    camera = new T.PerspectiveCamera(42, 1, 0.1, 100);
    clock = new T.Clock();

    // merry-go-round
    platform = new T.Group(); scene.add(platform);
    add(platform, cyl(R + 0.9, R + 1.0, 0.36), C.pink, [0, -0.2, 0]);
    add(platform, cyl(R + 0.75, R + 0.75, 0.05), 0xfff0f7, [0, 0.0, 0], { line: false });
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; add(platform, sph(0.13), i % 2 ? C.gold : C.white, [Math.sin(a) * (R + 0.98), -0.2, Math.cos(a) * (R + 0.98)], { line: false }); }
    for (let i = 0; i < 12; i++) add(platform, cyl(0.42, 0.42, 0.42), i % 2 ? C.hot : C.white, [0, 0.21 + i * 0.42, 0], { line: false });
    const canopy = new T.Group(); canopy.position.y = 5.2; platform.add(canopy);
    for (let i = 0; i < 16; i++) {
      const wedge = new T.ConeGeometry(R + 1.2, 1.6, 2, 1, true, (i * Math.PI * 2) / 16, (Math.PI * 2) / 16);
      const m = new T.Mesh(wedge, M(i % 2 ? C.hot : C.white)); m.material.side = T.DoubleSide; canopy.add(m);
    }
    for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; add(canopy, sph(0.22), i % 2 ? C.lilac : C.aqua, [Math.sin(a) * (R + 1.15), -0.8, Math.cos(a) * (R + 1.15)], { line: false }); }
    add(canopy, extrude('star-top', starShape(0.45, 0.2), 0.15, 0.06), C.yellow, [0, 1.25, 0]);

    for (let i = 0; i < N; i++) {
      const d = i + 1, a = (i / N) * Math.PI * 2;
      const slot = new T.Group(); slot.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); slot.rotation.y = a; platform.add(slot);
      add(slot, cyl(0.018, 0.018, 5.2), C.gold, [0, 2.6, -0.42], { line: false });
      add(slot, cyl(0.36, 0.4, 0.14), [C.lilac, C.aqua, C.pink, C.yellow][i % 4], [0, 0.07, 0]);
      const anchor = new T.Group(); anchor.position.y = 0.14; slot.add(anchor);
      slot.userData = { d, slot: true };
      slots.push({ d, slot, anchor, toy: null, kind: null, taps: 0 });
    }

    // dim layer behind a focused toy
    dim = new T.Mesh(new T.PlaneGeometry(60, 60), new T.MeshBasicMaterial({ color: 0x1b0f3a, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(dim);

    // snow
    const n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = Math.random() * 10; pos[i * 3 + 2] = (Math.random() - 0.5) * 22; }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pos, 3));
    snow = new T.Points(sg, new T.PointsMaterial({ size: 0.12, map: dotTexture(), transparent: true, depthWrite: false, color: 0xffffff }));
    scene.add(snow);

    // input
    let down = null;
    canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX }; canvas.setPointerCapture(e.pointerId); vel = 0; });
    canvas.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.lx; down.lx = e.clientX;
      if (mode === 'carousel' && !busy) { rot += dx * 0.006; vel = dx * 0.006; }
      else if (mode === 'focus' && focused && !busy) focused.toy.rotation.y += dx * 0.012;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 450;
      down = null;
      if (moved < 10 && quick) tap(e);
    });
    ui.querySelector('.tb-close').onclick = close;
    ui.querySelector('.tb-back').onclick = () => unfocus();
    ui.querySelector('.tb-music').onclick = (e) => { musicOn = !musicOn; e.currentTarget.classList.toggle('off', !musicOn); musicOn ? music() : clearTimeout(musicTimer); };
    addEventListener('resize', resize);
  }

  function resize() {
    if (!renderer || ui.hidden) return;
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep about 5 toys across the screen, whatever the shape of the screen
    const hfov = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    const dist = Math.max(4.6, 2.7 / Math.tan(hfov / 2));
    camera.position.set(0, 1.4 + dist * 0.18, R + dist);
    camera.lookAt(0, 0.85 + Math.max(0, 1 - camera.aspect) * 2.2, R - 0.6); // tall screens: aim higher so the whole merry-go-round is centred
    camera.updateProjectionMatrix();
    // dim plane sits just behind where a focused toy floats
    const dir = new T.Vector3(); camera.getWorldDirection(dir);
    dim.position.copy(camera.position).addScaledVector(dir, focusDist() + 1.2); dim.quaternion.copy(camera.quaternion);
  }
  const focusDist = () => 3.0;
  function focusTarget() {
    const dir = new T.Vector3(); camera.getWorldDirection(dir);
    const F = focusDist(), vis = 2 * F * Math.tan((camera.fov * Math.PI) / 360);
    const s = Math.min(vis * 0.42, vis * camera.aspect * 0.62);
    const pos = camera.position.clone().addScaledVector(dir, F); pos.y -= s * 0.55;
    return { pos, s };
  }

  function refresh() {
    for (const sl of slots) {
      const have = Advent.status(sl.d) === 'opened', want = have ? 'toy' : 'box';
      if (sl.kind === want) continue;
      if (sl.toy) sl.anchor.remove(sl.toy);
      const root = new T.Group(), inner = new T.Group(); root.add(inner);
      if (have) inner.add(makeToy(sl.d));
      else {
        const box = gift(0xe2d6ff, 0xd3c2ff, C.white, false); box.scale.setScalar(0.7); inner.add(box);
        const sp = new T.Sprite(new T.SpriteMaterial({ map: labelTexture(String(sl.d)) })); sp.scale.setScalar(0.42); sp.position.y = 0.72; inner.add(sp);
      }
      root.userData.inner = inner;
      sl.anchor.add(root); sl.toy = root; sl.kind = want;
    }
    ui.querySelector('.tb-count').textContent = `${Advent.openedCount()} / 25 toys`;
  }

  function slotFromHit(obj) { while (obj) { if (obj.userData && obj.userData.slotRef) return obj.userData.slotRef; obj = obj.parent; } return null; }
  function tap(e) {
    if (busy) return;
    const r = renderer.domElement.getBoundingClientRect();
    const v = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new T.Raycaster(); ray.setFromCamera(v, camera);
    if (mode === 'focus') {
      const hit = ray.intersectObject(focused.toy, true).length;
      return hit ? trick(focused) : unfocus();
    }
    for (const sl of slots) sl.toy.userData.slotRef = sl;
    const hits = ray.intersectObjects(slots.map((s) => s.toy), true);
    const sl = hits.length && slotFromHit(hits[0].object);
    if (!sl) return;
    if (sl.kind === 'toy') focus(sl);
    else { animate(sl, 'wiggle'); Advent.sfx.nope(); Advent.speak(P().toyLocked(sl.d)); }
  }

  function animate(sl, type) { sl.toy.userData.inner.userData.anim = { type, t: 0, dur: type === 'spin' ? 1.1 : 0.9 }; }
  function trick(sl, hello) {
    const types = ['hop', 'spin', 'wiggle'];
    animate(sl, hello ? 'hop' : types[sl.taps % 3]);
    sl.taps++;
    const day = Advent.DAYS[sl.d - 1];
    Advent.speak(hello || sl.taps % 4 === 0 ? day.toy.line : P().tricks[sl.taps % P().tricks.length]);
    Advent.sfx.sparkle();
    const p = new T.Vector3(); sl.toy.getWorldPosition(p); p.y += sl.toy.scale.x * 0.6;
    burst(p, sl.toy.scale.x);
  }

  function burst(at, scale) {
    const n = 40, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), v = [];
    const palette = [0xff8cc0, 0xffe066, 0x7fdcf5, 0xc9a8ff, 0xffffff].map((c) => new T.Color(c));
    for (let i = 0; i < n; i++) {
      pos.set([at.x, at.y, at.z], i * 3); const c = palette[i % palette.length]; col.set([c.r, c.g, c.b], i * 3);
      v.push(new T.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 2).multiplyScalar(scale * 0.7));
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    const pts = new T.Points(g, new T.PointsMaterial({ size: 0.18 * scale, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false }));
    scene.add(pts); bursts.push({ pts, v, t: 0 });
  }

  function focus(sl, entrance) {
    mode = 'focus'; focused = sl; busy = true; sl.taps = 0;
    const toy = sl.toy; scene.attach(toy);
    const { pos, s } = focusTarget();
    const from = { p: toy.position.clone(), q: toy.quaternion.clone(), s: toy.scale.x };
    if (entrance) { from.p = pos.clone().add(new T.Vector3(0, 4, 0)); from.q = new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI, 0)); from.s = s * 0.3; toy.position.copy(from.p); }
    const toQ = new T.Quaternion();
    tween(entrance ? 1.0 : 0.6, (p) => {
      const e = easeBack(p);
      toy.position.lerpVectors(from.p, pos, entrance ? easeInOut(Math.min(1, p * 1.3)) : e);
      toy.quaternion.slerpQuaternions(from.q, toQ, Math.min(1, p * 1.4));
      toy.scale.setScalar(from.s + (s - from.s) * e);
      dim.material.opacity = Math.max(dim.material.opacity, 0.5 * Math.min(1, p * 2));
    }, () => { busy = false; trick(sl, true); });
    const name = ui.querySelector('.tb-name'); name.textContent = Advent.DAYS[sl.d - 1].toy.name; name.hidden = false;
    ui.querySelector('.tb-back').hidden = false; ui.querySelector('.tb-hint').textContent = '👆 Tap the toy for a trick · swipe to turn it';
  }

  function unfocus() {
    if (!focused || busy) return;
    const sl = focused, toy = sl.toy; busy = true;
    const from = { p: toy.position.clone(), q: toy.quaternion.clone(), s: toy.scale.x };
    const to = new T.Vector3(), tq = new T.Quaternion(); sl.anchor.getWorldPosition(to); sl.anchor.getWorldQuaternion(tq);
    tween(0.55, (p) => {
      const e = easeInOut(p);
      toy.position.lerpVectors(from.p, to, e); toy.quaternion.slerpQuaternions(from.q, tq, e); toy.scale.setScalar(from.s + (1 - from.s) * e);
      dim.material.opacity = 0.5 * (1 - p);
    }, () => {
      sl.anchor.attach(toy); toy.position.set(0, 0, 0); toy.quaternion.identity(); toy.scale.setScalar(1);
      focused = null; mode = 'carousel'; busy = false;
    });
    ui.querySelector('.tb-name').hidden = true; ui.querySelector('.tb-back').hidden = true;
    ui.querySelector('.tb-hint').textContent = '👆 Swipe to spin · tap a toy!';
    Advent.hush();
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    if (mode === 'carousel' && !busy) { vel *= 0.94; rot += vel + (Math.abs(vel) < 0.002 && t > holdUntil ? 0.0025 : 0); }
    platform.rotation.y = rot;
    slots.forEach((sl, i) => {
      sl.anchor.position.y = 0.14 + 0.12 * (Math.sin(t * 1.7 + i * 0.9) + 1) / 2;
      const inner = sl.toy && sl.toy.userData.inner; if (!inner) return;
      const an = inner.userData.anim;
      if (an) {
        an.t += dt; const p = Math.min(1, an.t / an.dur);
        inner.position.y = 0; inner.rotation.set(0, 0, 0); inner.scale.setScalar(1);
        if (an.type === 'hop') { inner.position.y = Math.sin(Math.PI * p) * 0.55; const q = Math.sin(2 * Math.PI * p) * 0.15; inner.scale.set(1 - q, 1 + q, 1 - q); }
        if (an.type === 'spin') { inner.rotation.y = easeInOut(p) * Math.PI * 2; inner.position.y = Math.sin(Math.PI * p) * 0.25; }
        if (an.type === 'wiggle') { inner.rotation.z = Math.sin(p * Math.PI * 6) * 0.35 * (1 - p); }
        if (p >= 1) { inner.userData.anim = null; inner.position.y = 0; inner.rotation.set(0, 0, 0); inner.scale.setScalar(1); }
      } else inner.rotation.z = Math.sin(t * 2 + i) * 0.04;
    });
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; tw.t += dt; const p = Math.min(1, tw.t / tw.dur); tw.fn(p); if (p >= 1) { tweens.splice(i, 1); tw.done && tw.done(); } }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i], pa = b.pts.geometry.attributes.position; b.t += dt;
      b.v.forEach((v, k) => { v.y -= 4 * dt; pa.array[k * 3] += v.x * dt; pa.array[k * 3 + 1] += v.y * dt; pa.array[k * 3 + 2] += v.z * dt; });
      pa.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.t / 1.2);
      if (b.t > 1.2) { scene.remove(b.pts); b.pts.geometry.dispose(); bursts.splice(i, 1); }
    }
    const sp = snow.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) { let y = sp.array[i * 3 + 1] - dt * 0.6; if (y < -0.5) y = 10; sp.array[i * 3 + 1] = y; sp.array[i * 3] += Math.sin(t + i) * 0.002; }
    sp.needsUpdate = true;
    renderer.render(scene, camera);
  }

  // gentle music-box Jingle Bells
  const NOTE = { C: 523, D: 587, E: 659, F: 698, G: 784, A: 880 };
  const SONG = 'E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 E1 D1 D1 E1 D2 G2'.split(' ').map((s) => [NOTE[s[0]], parseFloat(s.slice(1))]);
  function music() {
    clearTimeout(musicTimer);
    let i = 0; const beat = 0.36;
    const next = () => {
      if (!musicOn || ui.hidden) return;
      const [f, b] = SONG[i];
      Advent.tone(f * 2, 0.9, 'sine', 0.035); Advent.tone(f, 0.6, 'triangle', 0.02);
      i = (i + 1) % SONG.length;
      musicTimer = setTimeout(next, b * beat * 1000 + (i === 0 ? 1500 : 0));
    };
    next();
  }

  function open(opts = {}) {
    if (!built) build();
    ui.hidden = false; document.body.classList.add('tb-open');
    resize(); refresh();
    if (focused) { const sl = focused; sl.anchor.attach(sl.toy); sl.toy.position.set(0, 0, 0); sl.toy.quaternion.identity(); sl.toy.scale.setScalar(1); focused = null; }
    mode = 'carousel'; busy = false; tweens.length = 0; dim.material.opacity = 0;
    ui.querySelector('.tb-name').hidden = true; ui.querySelector('.tb-back').hidden = true; ui.querySelector('.tb-hint').textContent = '👆 Swipe to spin · tap a toy!';
    clock.getDelta();
    if (!raf) loop();
    // opts.focus: spin to that toy and bring it forward · opts.at: just spin to that spot
    const d = opts.focus || opts.at;
    if (d) {
      const target = -((d - 1) / N) * Math.PI * 2;
      const from = opts.entrance ? target : target + 1.6; // a quick spin-in so she sees it travel round
      rot = from; vel = 0; busy = true; platform.rotation.y = rot;
      tween(opts.entrance ? 0.25 : 1.2, (p) => { rot = from + (target - from) * easeInOut(p); }, () => {
        rot = target; platform.rotation.y = rot; platform.updateMatrixWorld(true); busy = false;
        holdUntil = clock.elapsedTime + 5; // stay put for a moment so the chosen toy stays in front
        const sl = slots[d - 1];
        if (opts.focus && sl.kind === 'toy') focus(sl, opts.entrance);
        else if (sl.kind === 'box') { animate(sl, 'wiggle'); Advent.speak(P().toyLocked(d)); }
        else Advent.speak(P().toyBoxHello);
      });
    } else Advent.speak(P().toyBoxHello);
    if (musicOn) music();
  }
  function close() {
    ui.hidden = true; document.body.classList.remove('tb-open');
    cancelAnimationFrame(raf); raf = 0; clearTimeout(musicTimer); Advent.hush();
  }

  window.Toys = { ok: true, thumb, open, close, makeToy };
})();
