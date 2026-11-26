// ---------- RSW coming soon: the movie teaser ----------
// A cold open ("Real Saiyan Wellness presents"), then a run of brush-painted shots that never ends
// and never quite repeats: RSW with its seal, then an ensō, 力 and 一 in a new order each time
// round, each with its own line. Every painting gets fresh brush hairs, so no two strokes come out
// the same. Cherry blossoms drift through it all; music.js scores it. With reduced
// motion the finished RSW frame shows at once and stays.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const $ = (selector) => document.querySelector(selector);
  const push = $('.push');
  const view = $('.ink');
  const backCanvas = $('.petals-back');
  const frontCanvas = $('.petals-front');
  const words = { label: $('.label'), line: $('.line'), small: $('.soon') };
  const ink = document.createElement('canvas'); // the painted shot, before its glow and sheen
  const lerp = (a, b, t) => a + (b - a) * t;

  // Seeded random numbers, so a repaint after resizing looks like the first painting
  function random(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- The shots ----------
  // Strokes are [x, y, pressure] in the shot's own units, ms is how long the brush takes, flick
  // throws ink off the end and load gives a long stroke more ink. size() is a unit in px, brush
  // the brush's width in units, gap the space above the words in brush widths.
  const RSW = [
    // R
    { ms: 430, pts: [[0.1, 0, 0.5], [0.12, 0.1, 0.95], [0.11, 0.45, 1], [0.1, 0.8, 0.92], [0.09, 1, 0.55], [0.08, 1.06, 0.12]] },
    { ms: 540, pts: [[0.12, 0.03, 0.3], [0.3, -0.01, 0.75], [0.52, 0.03, 0.88], [0.66, 0.16, 0.92], [0.64, 0.32, 0.85], [0.5, 0.44, 0.72], [0.3, 0.5, 0.55], [0.18, 0.52, 0.3]] },
    { ms: 400, flick: true, pts: [[0.26, 0.5, 0.4], [0.38, 0.62, 0.9], [0.52, 0.78, 1], [0.66, 0.94, 0.85], [0.78, 1.03, 0.45], [0.9, 1.06, 0.08]] },
    // S
    { ms: 780, flick: true, at: 1.03, pts: [[0.62, 0.12, 0.3], [0.52, 0.03, 0.6], [0.32, 0, 0.8], [0.12, 0.08, 0.86], [0.06, 0.24, 0.9], [0.16, 0.4, 0.95], [0.38, 0.5, 1], [0.56, 0.62, 1], [0.62, 0.78, 0.9], [0.52, 0.94, 0.75], [0.3, 1, 0.58], [0.08, 0.95, 0.38], [0, 0.86, 0.1]] },
    // W: hard down-strokes, quick dry up-strokes
    { ms: 360, at: 1.84, pts: [[0, 0, 0.5], [0.06, 0.3, 0.95], [0.14, 0.7, 1], [0.21, 0.97, 0.6], [0.23, 1.02, 0.2]] },
    { ms: 250, at: 1.84, pts: [[0.21, 0.98, 0.2], [0.28, 0.7, 0.42], [0.36, 0.42, 0.4], [0.43, 0.22, 0.22]] },
    { ms: 360, at: 1.84, pts: [[0.41, 0.24, 0.45], [0.48, 0.55, 0.95], [0.56, 0.85, 0.95], [0.62, 1, 0.55], [0.64, 1.03, 0.18]] },
    { ms: 320, flick: true, at: 1.84, pts: [[0.62, 0.99, 0.2], [0.72, 0.66, 0.45], [0.83, 0.3, 0.42], [0.92, 0.05, 0.3], [0.96, -0.04, 0.06]] },
  ].map(({ at = 0, pts, ...stroke }) => ({ ...stroke, pts: pts.map(([x, y, p]) => [x + at, y, p]) }));

  // The ensō: one sweep almost all the way round, clockwise from the upper left, drying out at the tail
  const ENSO = (() => {
    const angles = [125, 95, 62, 30, 0, -32, -64, -96, -128, -160, -192, -220, -238];
    const wobble = [1, 1.02, 1.03, 1.01, 0.99, 0.98, 1, 1.02, 1.03, 1.02, 1, 0.97, 0.95];
    const press = [0.55, 0.95, 1, 1, 0.95, 0.92, 0.9, 0.86, 0.8, 0.7, 0.55, 0.35, 0.1];
    const pts = angles.map((a, i) => {
      const r = 0.46 * wobble[i];
      const t = (a * Math.PI) / 180;
      return [0.5 + r * Math.cos(t), 0.5 - r * Math.sin(t), press[i]];
    });
    return [{ ms: 1500, load: 1.5, pts }];
  })();

  const SHOTS = {
    rsw: {
      strokes: RSW,
      box: { left: 0.08, right: 2.8, top: -0.04, bottom: 1.06 },
      size: (w, h) => Math.min(h * 0.36, w * 0.29),
      middle: (w, h) => (w < h ? 0.4 : 0.42),
      brush: 0.2,
      gap: 1.6,
      ink: 'red',
      seal: true,
      hold: 6000,
      label: '',
      line: 'Your final form is coming.',
      small: 'Coming soon',
    },
    enso: {
      strokes: ENSO,
      box: { left: 0.03, right: 0.97, top: 0.03, bottom: 0.97 },
      size: (w, h) => Math.min(h * 0.66, w * 0.82),
      middle: () => 0.47,
      brush: 0.085,
      center: true, // the words sit inside the circle
      ink: 'red',
      hold: 4800,
      label: '<span class="k">円相</span>Ensō',
      line: 'Every warrior has a final form.',
      small: 'Coming soon',
    },
    chikara: {
      strokes: [
        { ms: 380, pts: [[0.12, 0.33, 0.55], [0.3, 0.31, 0.85], [0.55, 0.29, 0.85], [0.8, 0.26, 0.8], [0.86, 0.27, 0.6]] },
        { ms: 520, flick: true, pts: [[0.83, 0.25, 0.55], [0.87, 0.36, 0.95], [0.85, 0.6, 1], [0.8, 0.82, 0.92], [0.73, 0.95, 0.6], [0.63, 0.9, 0.25], [0.57, 0.85, 0.06]] },
        { ms: 560, flick: true, pts: [[0.48, 0.03, 0.55], [0.5, 0.24, 0.95], [0.47, 0.5, 1], [0.37, 0.72, 0.85], [0.23, 0.88, 0.55], [0.08, 0.98, 0.1]] },
      ],
      box: { left: 0.06, right: 0.9, top: 0.02, bottom: 0.99 },
      size: (w, h) => Math.min(h * 0.5, w * 0.58),
      middle: () => 0.4,
      brush: 0.13,
      gap: 1.1,
      ink: 'white', // white ink for once
      hold: 4500,
      label: '<span class="k">力</span>Power',
      line: 'Power you can trust.',
      small: 'Lab-tested · Every batch',
    },
    ichi: {
      strokes: [{ ms: 650, load: 1.3, pts: [[0, 0.53, 0.55], [0.06, 0.5, 1], [0.3, 0.485, 0.9], [0.6, 0.48, 0.88], [0.86, 0.49, 0.95], [0.95, 0.51, 1], [0.99, 0.54, 0.75], [0.985, 0.57, 0.3]] }],
      box: { left: -0.02, right: 1.02, top: 0.42, bottom: 0.62 },
      size: (w, h) => Math.min(w * 0.72, h * 1.15),
      middle: () => 0.45,
      brush: 0.075,
      gap: 0.6,
      ink: 'red',
      hold: 4500,
      label: '<span class="k">一</span>One',
      line: 'One more rep.',
      small: 'Discipline · <span lang="gu">શિસ્ત</span>',
    },
  };
  for (const shot of Object.values(SHOTS)) {
    let t = 0;
    for (const stroke of shot.strokes) {
      stroke.start = t;
      t += stroke.ms + 110; // the brush lifts for a moment between strokes
    }
  }

  // Hair colours: red ink, or a warm white
  const INKS = {
    red: (shade) => `rgb(${Math.round(lerp(150, 222, shade))} ${Math.round(lerp(10, 34, shade))} ${Math.round(lerp(24, 44, shade))})`,
    white: (shade) => `rgb(${Math.round(lerp(196, 248, shade))} ${Math.round(lerp(182, 236, shade))} ${Math.round(lerp(160, 214, shade))})`,
  };

  const OPEN = 200; // ms until "presents" fades in
  const PAINT = 2300; // ms until the brush first touches down
  const LEAVE = 1300; // ms a shot takes to lift away

  // ---------- Layout ----------
  let layout, viewCtx, inkCtx, backCtx, frontCtx;
  const set = (name, value) => root.style.setProperty(name, value);

  // Lays a shot out on this screen. On a short screen (a phone on its side) the art shrinks and
  // moves up until it and its words fit between the small print at the top and bottom.
  const EDGE = 56; // px kept clear for the small print, top and bottom
  function measure(shot) {
    const w = innerWidth;
    const h = innerHeight;
    const { box } = shot;
    const words = shot.center ? 0 : h < 520 ? 64 : 96; // the words' height under the art
    const tall = (unit) => (box.bottom - box.top + shot.brush) * unit; // the art's height, brush included
    const below = (unit) => shot.brush * unit * (shot.gap ?? 1) + words;
    let H = shot.size(w, h); // one unit, CSS px
    while (H > 40 && 2 * EDGE + tall(H) + below(H) > h) H *= 0.95;
    let cy = h * shot.middle(w, h);
    if (!shot.center) cy = Math.max(EDGE + tall(H) / 2, Math.min(cy, h - EDGE - below(H) - tall(H) / 2));
    const x = (u) => w / 2 + (u - (box.left + box.right) / 2) * H;
    const y = (v) => cy + (v - (box.top + box.bottom) / 2) * H;
    const brush = shot.brush * H;

    set('--cy', `${cy}px`);
    set('--spot-y', `${((cy / h) * 100).toFixed(1)}%`);
    let copyY = y(box.bottom) + brush * (shot.gap ?? 1);
    if (shot.seal) {
      // The seal sits by the W's foot, or tucks under it where the screen is too narrow
      const seal = Math.max(40, H * 0.2);
      let sealX = x(box.right) + H * 0.04;
      let sealY = y(0.62);
      if (sealX + seal > w - 12) {
        sealX = x(box.right) - seal;
        sealY = y(box.bottom) + H * 0.08;
      }
      copyY = Math.max(copyY, sealY + seal + 16);
      set('--seal', `${seal.toFixed(1)}px`);
      set('--seal-x', `${sealX.toFixed(1)}px`);
      set('--seal-y', `${sealY.toFixed(1)}px`);
    }
    set('--copy-y', `${(shot.center ? cy : copyY).toFixed(1)}px`);
    if (shot.center) set('--copy-w', `${(H * (h < 520 ? 0.64 : 0.74)).toFixed(1)}px`); // narrower in a small circle, clear of the ink
    else root.style.removeProperty('--copy-w');
    return { w, h, H, x, y, brush, dpr: Math.min(devicePixelRatio || 1, 2) };
  }

  function fit(canvas) {
    canvas.width = Math.round(layout.w * layout.dpr);
    canvas.height = Math.round(layout.h * layout.dpr);
    const g = canvas.getContext('2d');
    g.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
    return g;
  }

  // ---------- The brush ----------
  // A centripetal Catmull-Rom curve through the points, sampled about every pixel, with arc
  // length, direction and pressure at each sample
  function catmull(p0, p1, p2, p3, t) {
    const gap = (a, b) => Math.max(1e-4, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)));
    const t1 = gap(p0, p1);
    const t2 = t1 + gap(p1, p2);
    const t3 = t2 + gap(p2, p3);
    const u = lerp(t1, t2, t);
    const mix = (a, b, ta, tb) => ({ x: ((tb - u) * a.x + (u - ta) * b.x) / (tb - ta), y: ((tb - u) * a.y + (u - ta) * b.y) / (tb - ta) });
    const a1 = mix(p0, p1, 0, t1);
    const a2 = mix(p1, p2, t1, t2);
    const a3 = mix(p2, p3, t2, t3);
    return mix(mix(a1, a2, 0, t2), mix(a2, a3, t1, t3), t1, t2);
  }

  function sample(points) {
    const P = points.map(([u, v, p]) => ({ x: layout.x(u), y: layout.y(v), p }));
    const mirror = (a, b) => ({ x: 2 * a.x - b.x, y: 2 * a.y - b.y, p: a.p });
    const ends = [mirror(P[0], P[1]), ...P, mirror(P[P.length - 1], P[P.length - 2])];
    const out = [];
    for (let i = 1; i < ends.length - 2; i++) {
      const [a, b] = [ends[i], ends[i + 1]];
      const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1.2));
      for (let k = 0; k < n; k++) out.push({ ...catmull(ends[i - 1], a, b, ends[i + 2], k / n), p: lerp(a.p, b.p, k / n) });
    }
    const tip = P[P.length - 1];
    out.push({ x: tip.x, y: tip.y, p: tip.p });
    let s = 0;
    out.forEach((q, i) => {
      if (i) s += Math.hypot(q.x - out[i - 1].x, q.y - out[i - 1].y);
      q.s = s;
    });
    out.forEach((q, i) => {
      const a = out[Math.max(0, i - 3)];
      const b = out[Math.min(out.length - 1, i + 3)];
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      q.tx = (b.x - a.x) / d;
      q.ty = (b.y - a.y) / d;
    });
    return { pts: out, length: s };
  }

  // One stroke of a brush made of hairs. Each hair has its own shade, its own ink that runs out
  // (the edges first) and its own streakiness: as it dries, or when the brush moves fast, it
  // skips, which leaves the dry-brush streaks of real calligraphy.
  function painter(stroke, seed, colour) {
    const rand = random(seed);
    const width = layout.brush;
    const { pts, length } = sample(stroke.pts);
    const count = Math.round(Math.min(150, Math.max(36, width / 1.1)));
    const hurry = length / stroke.ms / (width / 52); // about 1 for a steady stroke, more when it's quick
    const reservoir = width * 15 * (stroke.load ?? 1); // px a hair can paint before it's dry
    const streakLength = width * 1.7;
    const hairs = Array.from({ length: count }, (_, i) => {
      const o = (i / (count - 1)) * 2 - 1 + (rand() - 0.5) * (2 / count); // across the brush, -1 to 1
      const edge = Math.abs(o);
      // The middle of the brush is a solid wet core; the texture lives at the edges
      const shade = lerp(0.5, rand(), 0.35 + 0.65 * edge);
      return {
        o,
        width: (width / count) * (2.3 + rand() * 1.1) * (1 - 0.45 * edge),
        alpha: lerp(0.96, 0.5, edge ** 1.5) * (0.9 + 0.1 * rand()),
        drain: (0.4 + rand() * 0.7) * (1 + 2.2 * edge * edge),
        lag: rand() * 0.4 * edge ** 1.5 * width, // the edge hairs touch down a moment late: a rounded start
        color: colour(shade),
        streak: Array.from({ length: 97 }, rand),
        ink: 0.82 + rand() * 0.18,
        x: 0,
        y: 0,
        placed: false,
      };
    });
    let next = 0; // the next sample to paint

    // Paints up to arc length toS and says how far the brush travelled
    function advance(toS) {
      const from = next;
      while (next < pts.length && pts[next].s <= toS) next++;
      if (next === from) return 0;
      const g = inkCtx;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const hair of hairs) {
        if (hair.ink <= 0) continue;
        g.beginPath();
        let down = false;
        for (let k = from; k < next; k++) {
          const q = pts[k];
          if (q.s < hair.lag) continue;
          const half = (width * q.p) / 2;
          const x = q.x - q.ty * hair.o * half;
          const y = q.y + q.tx * hair.o * half;
          const f = (q.s / streakLength) % 96;
          const i0 = Math.floor(f);
          const wet = lerp(hair.streak[i0], hair.streak[i0 + 1], f - i0) > (1 - hair.ink) * 1.15 + (hurry - 1) * 0.12 - 0.28;
          if (wet && hair.placed) {
            if (!down) g.moveTo(hair.x, hair.y);
            g.lineTo(x, y);
            down = true;
          } else {
            down = false;
          }
          if (hair.placed) hair.ink -= (Math.hypot(x - hair.x, y - hair.y) / reservoir) * hair.drain;
          hair.x = x;
          hair.y = y;
          hair.placed = true;
          if (hair.ink <= 0) break;
        }
        g.globalAlpha = hair.alpha * Math.min(1, 0.35 + Math.max(0, hair.ink));
        g.strokeStyle = hair.color;
        g.lineWidth = hair.width;
        g.stroke();
      }
      g.globalAlpha = 1;
      return pts[next - 1].s - (from ? pts[from - 1].s : 0);
    }

    return { length, advance, first: pts[0], last: pts[pts.length - 1], rand };
  }

  // Ink flung off the brush: drops thrown along a direction, stretched the way they fly
  function splatter(at, angle, spread, count, reach, rand, colour) {
    const g = inkCtx;
    const unit = layout.brush * 5;
    for (let k = 0; k < count; k++) {
      const a = angle + (rand() - 0.5) * spread;
      const d = unit * reach * (0.15 + rand() * 0.85);
      const r = unit * (0.003 + rand() ** 2.2 * 0.015);
      g.globalAlpha = 0.55 + rand() * 0.45;
      g.fillStyle = colour(0.3 + rand() * 0.7);
      g.beginPath();
      g.ellipse(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, r * (1 + rand() * 1.6), r, a, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  // ---------- The running shot ----------
  let shot = null; // { key, def, seed, strokes, startAt, phase, writtenAt, leaveAt, sheenAt }
  let queue = [];
  let glow = null;
  let glowLevel = 0;
  const GLOW = 0.42; // faint, so it reads as light on wet ink, not neon

  // RSW, then the others in a new order each time round
  function nextKey() {
    if (!queue.length) {
      const rest = ['enso', 'chikara', 'ichi'];
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      queue = ['rsw', ...rest];
    }
    return queue.shift();
  }

  // Paint every stroke of the shot that's due by `time` (ms since its brush first touched down);
  // returns how far the brush moved, for the sound
  const ease = (t, flick) => (flick ? t ** 1.5 : t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  function paintTo(time) {
    const colour = INKS[shot.def.ink];
    let moved = 0;
    shot.strokes.forEach((stroke, i) => {
      if (stroke.done || time < stroke.start) return;
      if (!stroke.painter) {
        stroke.painter = painter(stroke, shot.seed + i * 101, colour);
        if (i === 0) splatter(stroke.painter.first, 0, Math.PI * 2, 9, 0.12, stroke.painter.rand, colour); // the brush lands
        if (shot.key === 'rsw' && i === 4) rswSound.cue('build'); // the brush reaches the W: the music rises
      }
      const t = Math.min(1, (time - stroke.start) / stroke.ms);
      moved += stroke.painter.advance(ease(t, stroke.flick) * stroke.painter.length + 0.01);
      if (t === 1) {
        stroke.done = true;
        const tip = stroke.painter.last;
        if (stroke.flick) splatter(tip, Math.atan2(tip.ty, tip.tx), 0.7, 16, 0.32, stroke.painter.rand, colour);
      }
    });
    return moved;
  }

  // Once the ink is down it glows a little: a blurred copy drawn underneath
  function makeGlow() {
    const c = document.createElement('canvas');
    c.width = ink.width;
    c.height = ink.height;
    const g = c.getContext('2d');
    g.filter = `blur(${Math.round(layout.brush * 0.45 * layout.dpr)}px)`;
    g.drawImage(ink, 0, 0);
    return c;
  }

  function beginShot(key, seed = Math.floor(Math.random() * 1e9), repaint = false) {
    const def = SHOTS[key];
    shot = { key, def, seed, strokes: def.strokes.map((s) => ({ ...s, painter: null, done: false })), startAt: clock, phase: 'paint', writtenAt: 0, leaveAt: 0, sheenAt: Infinity };
    layout = measure(def);
    inkCtx.clearRect(0, 0, layout.w, layout.h);
    glow = null;
    glowLevel = 0;
    words.label.innerHTML = def.label;
    words.line.textContent = def.line;
    words.small.innerHTML = def.small;
    // A clean canvas comes back sharp at once, not fading in from the last shot's smoke
    view.style.transition = 'none';
    root.classList.remove('is-written', 'is-leaving');
    root.classList.toggle('is-seal', Boolean(def.seal));
    root.classList.toggle('copy-center', Boolean(def.center));
    void view.offsetWidth;
    view.style.transition = '';
    if (!repaint) rswSound.cue('paint', key);
  }

  function written() {
    shot.phase = 'written';
    shot.writtenAt = clock;
    shot.sheenAt = clock + 1200;
    glow = makeGlow();
    root.classList.add('is-written');
    rswSound.cue('written', shot.key);
  }

  // The visible shot: the ink, a wet sheen sliding across it once, and its glow behind
  function compose() {
    const g = viewCtx;
    const { w, h, H } = layout;
    g.clearRect(0, 0, w, h);
    g.drawImage(ink, 0, 0, w, h);
    const sheen = shot ? (clock - shot.sheenAt) / 1700 : -1;
    if (sheen >= 0 && sheen <= 1) {
      const { box } = shot.def;
      const x = lerp(layout.x(box.left) - H * 0.4, layout.x(box.right) + H * 0.4, sheen);
      const y = layout.y((box.top + box.bottom) / 2);
      const band = Math.max(layout.brush * 3.5, 80);
      const light = g.createLinearGradient(x - band * 0.94, y - band * 0.34, x + band * 0.94, y + band * 0.34);
      light.addColorStop(0, 'rgb(255 214 196 / 0)');
      light.addColorStop(0.5, 'rgb(255 214 196 / 0.42)');
      light.addColorStop(1, 'rgb(255 214 196 / 0)');
      g.globalCompositeOperation = 'source-atop'; // only where there's ink
      g.fillStyle = light;
      g.fillRect(0, 0, w, h);
    }
    if (glow && glowLevel > 0) {
      g.globalCompositeOperation = 'destination-over'; // behind the ink
      g.globalAlpha = glowLevel;
      g.drawImage(glow, 0, 0, w, h);
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
  }

  // ---------- Cherry blossoms ----------
  // One petal drawn at four focus depths, so drawing many is cheap
  const sprites = [0, 1.2, 3.5, 9].map((blur) => {
    const pad = Math.ceil(blur * 2.5) + 2;
    const c = document.createElement('canvas');
    c.width = c.height = 64 + pad * 2;
    const g = c.getContext('2d');
    if (blur) g.filter = `blur(${blur}px)`;
    g.translate(pad, pad);
    const fill = g.createRadialGradient(32, 44, 2, 32, 36, 36);
    fill.addColorStop(0, '#fffafb');
    fill.addColorStop(0.55, '#fbd6e0');
    fill.addColorStop(1, '#ec9ab3');
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(32, 62);
    g.bezierCurveTo(6, 50, 3, 17, 23, 5);
    g.quadraticCurveTo(28, 9, 32, 13); // the notch at the tip
    g.quadraticCurveTo(36, 9, 41, 5);
    g.bezierCurveTo(61, 17, 58, 50, 32, 62);
    g.fill();
    g.strokeStyle = 'rgb(214 120 150 / 0.35)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(32, 58);
    g.quadraticCurveTo(30, 36, 32, 16);
    g.stroke();
    return { canvas: c, pad };
  });

  // Depth z: 0 far behind (soft), the middle in focus with the ink, 1 right at the lens (very soft)
  const focus = (z) => (z < 0.22 ? [sprites[1], 0.4] : z < 0.72 ? [sprites[0], 0.9] : z < 0.9 ? [sprites[2], 0.7] : [sprites[3], 0.5]);

  const petals = [];
  function newPetal(anywhere) {
    const w = innerWidth;
    const h = innerHeight;
    const scale = Math.max(0.55, Math.min(w, h) / 900);
    const z = Math.random();
    const petal = {
      z,
      size: (13 + 38 * z ** 1.5) * scale,
      vx: (12 + 46 * z) * scale + 8,
      vy: (8 + 30 * z) * scale + 4,
      sway: Math.random() * 6.3,
      swayRate: 0.5 + Math.random() * 0.9,
      swayAmp: (10 + 30 * z) * scale,
      rot: Math.random() * 6.3,
      spin: (Math.random() - 0.5) * 1.4,
      flip: Math.random() * 6.3,
      flipRate: 0.8 + Math.random() * 1.8,
      wx: 0,
      wy: 0,
    };
    // The breeze blows right and down, so new petals come in from the left or the top
    if (anywhere) {
      petal.x = Math.random() * w;
      petal.y = Math.random() * h;
    } else if (Math.random() < h / (w + h)) {
      petal.x = -petal.size * 2;
      petal.y = Math.random() * h * 0.9;
    } else {
      petal.x = Math.random() * w * 0.9;
      petal.y = -petal.size * 2;
    }
    return petal;
  }

  function seedPetals() {
    petals.length = 0;
    const count = still ? 14 : innerWidth < 700 ? 26 : 46;
    for (let i = 0; i < count; i++) petals.push(newPetal(true));
  }

  // A gust as a shot lifts away
  function gust() {
    const scale = Math.max(0.55, Math.min(innerWidth, innerHeight) / 900);
    for (const p of petals) {
      p.wx += (160 + Math.random() * 260) * scale * (0.4 + p.z);
      p.wy += (Math.random() - 0.4) * 90 * scale;
      p.spin += (Math.random() - 0.5) * 3;
    }
  }

  // The pointer stirs the air: petals near it get pushed the way it moves
  const breeze = { x: 0, y: 0, vx: 0, vy: 0, at: 0, known: false };
  addEventListener('pointermove', (event) => {
    const now = performance.now();
    if (breeze.known) {
      const dt = Math.max(16, now - breeze.at) / 1000;
      const clamp = (v) => Math.max(-1500, Math.min(1500, v));
      breeze.vx = clamp((event.clientX - breeze.x) / dt);
      breeze.vy = clamp((event.clientY - breeze.y) / dt);
    }
    breeze.x = event.clientX;
    breeze.y = event.clientY;
    breeze.at = now;
    breeze.known = true;
  }, { passive: true });

  function drawPetals(dt) {
    const { w, h, dpr } = layout;
    for (const g of [backCtx, frontCtx]) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
    }
    const stirring = Math.hypot(breeze.vx, breeze.vy) > 5;
    for (let i = 0; i < petals.length; i++) {
      let p = petals[i];
      if (dt) {
        p.sway += p.swayRate * dt;
        p.rot += p.spin * dt;
        p.flip += p.flipRate * dt;
        p.spin = lerp(p.spin, Math.sign(p.spin) * Math.min(Math.abs(p.spin), 0.7), 1 - Math.exp(-dt)); // a gust's spin settles
        if (stirring) {
          const reach = 160 + 200 * p.z;
          const d = Math.hypot(p.x - breeze.x, p.y - breeze.y);
          if (d < reach) {
            const shove = (1 - d / reach) * (0.4 + p.z) * dt * 3;
            p.wx += breeze.vx * shove;
            p.wy += breeze.vy * shove;
          }
        }
        p.wx *= Math.exp(-dt * 1.5);
        p.wy *= Math.exp(-dt * 1.5);
        p.x += (p.vx + p.wx) * dt + Math.cos(p.sway) * p.swayAmp * dt;
        p.y += (p.vy + p.wy) * dt;
        if (p.x > w + p.size * 2 || p.y > h + p.size * 2 || p.x < -w * 0.5 || p.y < -h * 0.5) p = petals[i] = newPetal(false);
      }
      const [sprite, alpha] = focus(p.z);
      const g = p.z >= 0.9 ? frontCtx : backCtx;
      const s = p.size / 64;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.scale(Math.cos(p.flip) * s, s); // tumbling: edge-on when the cosine passes zero
      g.globalAlpha = alpha;
      g.drawImage(sprite.canvas, -32 - sprite.pad, -32 - sprite.pad);
    }
    for (const g of [backCtx, frontCtx]) {
      g.globalAlpha = 1;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    breeze.vx *= Math.exp(-dt * 6);
    breeze.vy *= Math.exp(-dt * 6);
  }

  // ---------- Film grain ----------
  const tile = document.createElement('canvas');
  tile.width = tile.height = 180;
  const tileCtx = tile.getContext('2d');
  const noise = tileCtx.createImageData(180, 180);
  for (let i = 0; i < noise.data.length; i += 4) {
    noise.data[i] = noise.data[i + 1] = noise.data[i + 2] = Math.random() * 255;
    noise.data[i + 3] = 255;
  }
  tileCtx.putImageData(noise, 0, 0);
  set('--noise', `url(${tile.toDataURL()})`);

  // ---------- The teaser's clock ----------
  let clock = 0; // ms since the teaser began
  let last = 0;
  let opening = true; // the cold open, before the first shot
  let entered = false; // the teaser waits behind the gate until it starts

  function setup() {
    layout = measure(shot ? shot.def : SHOTS.rsw);
    viewCtx = fit(view);
    inkCtx = fit(ink);
    backCtx = fit(backCanvas);
    frontCtx = fit(frontCanvas);
  }

  function begin() {
    root.classList.remove('is-open', 'is-painting', 'is-written', 'is-leaving');
    push.style.animation = 'none';
    void push.offsetWidth; // restart the camera push
    push.style.animation = '';
    clock = 0;
    queue = [];
    shot = null;
    opening = !still;
    rswSound.cue('open');
    inkCtx.clearRect(0, 0, layout.w, layout.h);
    glow = null;
    if (still) {
      beginShot(nextKey(), 7);
      paintTo(Infinity);
      written();
      glowLevel = GLOW;
      root.classList.add('is-painting', 'is-done');
      compose();
      drawPetals(0);
    }
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    if (!entered) {
      drawPetals(dt); // blossoms drift behind the gate
      requestAnimationFrame(frame);
      return;
    }
    clock += dt * 1000;

    if (opening) {
      if (clock >= OPEN) root.classList.add('is-open');
      if (clock >= PAINT - 300) root.classList.add('is-painting');
      if (clock >= PAINT) {
        opening = false;
        beginShot(nextKey());
      }
    } else if (shot.phase === 'paint') {
      const moved = paintTo(clock - shot.startAt);
      rswSound.brush(moved / Math.max(dt, 0.008) / (layout.brush * 14));
      if (shot.strokes.every((stroke) => stroke.done)) {
        rswSound.brush(0);
        written();
      }
    } else if (shot.phase === 'written' && clock - shot.writtenAt > shot.def.hold) {
      shot.phase = 'leaving';
      shot.leaveAt = clock;
      root.classList.add('is-leaving');
      rswSound.cue('leave', shot.key);
      gust();
    } else if (shot.phase === 'leaving' && clock - shot.leaveAt > LEAVE) {
      beginShot(nextKey());
    }
    // The small print arrives with the first shot's words and stays
    if (shot?.phase === 'written' && clock - shot.writtenAt > 2600) root.classList.add('is-done');
    if (glow) glowLevel = Math.min(GLOW, glowLevel + dt * 0.4);

    compose();
    drawPetals(dt);
    requestAnimationFrame(frame);
  }

  // A resize repaints the shot at its new size; a half-painted shot starts its brush again
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setup();
      seedPetals();
      if (shot) {
        const { key, seed, phase } = shot;
        const keep = { writtenAt: shot.writtenAt, leaveAt: shot.leaveAt, sheenAt: shot.sheenAt };
        const wasLeaving = phase === 'leaving';
        beginShot(key, seed, true);
        if (phase !== 'paint') {
          paintTo(Infinity);
          Object.assign(shot, keep, { phase });
          glow = makeGlow();
          glowLevel = GLOW;
          root.classList.add('is-written');
          if (wasLeaving) root.classList.add('is-leaving');
        }
      }
      if (still) {
        compose();
        drawPetals(0);
      }
    }, 150);
  });

  $('.replay').addEventListener('click', begin);

  // The gate: sound plays from the start, but most browsers keep a page silent until its first
  // tap. So unless this one lets it play straight away, "Tap to enter" comes first, and that tap
  // starts the teaser and the music together.
  const gate = $('.gate');
  function enter() {
    entered = true;
    root.classList.add('is-entered');
    begin();
  }
  gate.addEventListener('click', () => {
    rswSound.enable();
    enter();
  });

  // Fonts first, so the words don't swap typefaces mid-reveal
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    setup();
    seedPetals();
    if (still) drawPetals(0);
    else requestAnimationFrame(frame);
    rswSound.autoplay().then((allowed) => {
      if (allowed) {
        rswSound.enable();
        enter();
      } else {
        gate.hidden = false;
        gate.focus();
      }
    });
  });
})();
