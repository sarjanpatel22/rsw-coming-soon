// ---------- RSW coming soon, India: the movie teaser ----------
// The same teaser as the main page, made Indian with Gujarat's own art: a cold open, then a run of
// brush-painted shots that never quite repeats. RSW in sindoor red, then Warli figures training, a
// patang with its manja and a gada in brass gold, in a new order each time round. The Warli figures
// are drawn into a mask and painted in by broad brush passes; the rest is brush strokes. A sky of
// Uttarayan kites bobs through it all; music.js scores it. With reduced motion the finished RSW frame
// shows at once and stays.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const $ = (selector) => document.querySelector(selector);
  const push = $('.push');
  const view = $('.ink');
  const glowOnBeat = $('.beat');
  const backCanvas = $('.petals-back');
  const frontCanvas = $('.petals-front');
  const words = { label: $('.label'), line: $('.line'), small: $('.soon') };
  const ink = document.createElement('canvas'); // the painted shot, before its glow and sheen
  const mask = document.createElement('canvas'); // a masked shot's shapes in solid colour
  const reveal = document.createElement('canvas'); // where a masked shot's brush has passed
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

  // The patang (kite): a square of paper on a bamboo spine and bow, a little tail, and the manja, the
  // string, running away to the flyer
  const PATANG = [
    { ms: 260, pts: [[0.16, 0.4, 0.6], [0.33, 0.23, 0.95], [0.5, 0.06, 0.7]] },
    { ms: 260, pts: [[0.5, 0.06, 0.6], [0.67, 0.23, 0.95], [0.84, 0.4, 0.7]] },
    { ms: 260, pts: [[0.84, 0.4, 0.6], [0.67, 0.57, 0.95], [0.5, 0.74, 0.7]] },
    { ms: 260, pts: [[0.5, 0.74, 0.6], [0.33, 0.57, 0.95], [0.16, 0.4, 0.7]] },
    { ms: 300, pts: [[0.5, 0.09, 0.4], [0.5, 0.4, 0.75], [0.5, 0.72, 0.4]] }, // the spine
    { ms: 320, pts: [[0.17, 0.4, 0.3], [0.33, 0.3, 0.7], [0.5, 0.27, 0.75], [0.67, 0.3, 0.7], [0.83, 0.4, 0.3]] }, // the bow
    { ms: 160, pts: [[0.5, 0.74, 0.5], [0.45, 0.8, 0.8], [0.42, 0.87, 0.5]] }, // the tail
    { ms: 160, pts: [[0.42, 0.87, 0.5], [0.5, 0.86, 0.8], [0.58, 0.87, 0.5]] },
    { ms: 160, pts: [[0.58, 0.87, 0.5], [0.55, 0.8, 0.8], [0.5, 0.74, 0.5]] },
    { ms: 700, ink: 'rice', pts: [[0.5, 0.42, 0.25], [0.66, 0.55, 0.3], [0.86, 0.68, 0.3], [1.12, 0.82, 0.25], [1.5, 0.98, 0.15]] }, // the manja
  ];

  // The gada, the mace of the akhada: a heavy head, a little taller than wide, brushed in rings one
  // inside the other until it's solid, a spire tapering to a point on top, and a handle with a knob
  const GADA = (() => {
    const ring = (r, from, ms) => ({
      ms,
      load: 1.4,
      pts: Array.from({ length: 13 }, (_, k) => {
        const a = ((from - (370 * k) / 12) * Math.PI) / 180;
        return [0.5 + r * Math.cos(a), 0.36 - r * 1.12 * Math.sin(a), k === 0 ? 0.6 : k === 12 ? 0.4 : 0.95];
      }),
    });
    return [
      ring(0.2, 110, 800),
      ring(0.15, 200, 600),
      ring(0.1, 290, 450),
      ring(0.05, 20, 300),
      { ms: 220, pts: [[0.5, 0.17, 0.8], [0.5, 0.1, 0.6], [0.5, 0.03, 0.15]] }, // the spire
      { ms: 420, pts: [[0.5, 0.58, 0.7], [0.5, 0.76, 0.85], [0.5, 0.94, 0.8]] }, // the handle
      { ms: 160, flick: true, pts: [[0.44, 0.95, 0.6], [0.5, 0.96, 0.9], [0.56, 0.95, 0.4]] }, // the knob
    ];
  })();

  // Warli, the tribal painting of the Gujarat and Maharashtra hills: figures of two triangles, a round
  // head and stick limbs. Three of them train here: an overhead press, a sprint and a flex. They're
  // drawn into the mask in solid white, then painted in by two broad brush passes each.
  const WARLI = [
    {
      x: -1.05,
      limbs: [
        [[-0.13, 0.21], [-0.27, 0.08], [-0.25, -0.12]], // arms up, pressing
        [[0.13, 0.21], [0.27, 0.08], [0.25, -0.12]],
        [[-0.42, -0.13], [0.42, -0.13]], // the bar
        [[-0.07, 0.65], [-0.18, 0.82], [-0.2, 1], [-0.27, 1]], // legs braced
        [[0.07, 0.65], [0.18, 0.82], [0.2, 1], [0.27, 1]],
      ],
      dots: [[-0.37, -0.13, 0.07], [0.37, -0.13, 0.07]], // the plates
    },
    {
      x: 0,
      limbs: [
        [[-0.13, 0.21], [-0.26, 0.33], [-0.35, 0.22]], // the back arm swinging
        [[0.13, 0.21], [0.28, 0.15], [0.33, 0.01]], // the front arm driving up
        [[0.07, 0.65], [0.25, 0.74], [0.23, 0.95], [0.3, 0.97]], // the front knee up
        [[-0.07, 0.65], [-0.2, 0.82], [-0.38, 0.88]], // the back leg pushing off
      ],
    },
    {
      x: 1.05,
      limbs: [
        [[-0.13, 0.21], [-0.33, 0.2], [-0.33, 0.01]], // a double-biceps flex
        [[0.13, 0.21], [0.33, 0.2], [0.33, 0.01]],
        [[-0.07, 0.65], [-0.16, 1], [-0.23, 1]],
        [[0.07, 0.65], [0.16, 1], [0.23, 1]],
      ],
      dots: [[-0.33, -0.01, 0.04], [0.33, -0.01, 0.04]], // the fists
    },
  ];
  function drawWarli(g) {
    const { H } = layout;
    g.fillStyle = g.strokeStyle = '#fff';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 0.05 * H;
    for (const figure of WARLI) {
      const at = (u, v) => [layout.x(figure.x + u), layout.y(v)];
      const path = (points, close) => {
        g.beginPath();
        g.moveTo(...at(...points[0]));
        for (const q of points.slice(1)) g.lineTo(...at(...q));
        if (close) g.closePath();
      };
      const dot = (u, v, r) => {
        g.beginPath();
        g.arc(...at(u, v), r * H, 0, Math.PI * 2);
        g.fill();
      };
      dot(0, 0.09, 0.075); // the head
      path([[-0.14, 0.2], [0.14, 0.2], [0, 0.43]], true); // the chest: a triangle pointing down
      g.fill();
      path([[0, 0.43], [-0.13, 0.66], [0.13, 0.66]], true); // the hips: one pointing up
      g.fill();
      for (const limb of figure.limbs) {
        path(limb);
        g.stroke();
      }
      for (const [u, v, r] of figure.dots ?? []) dot(u, v, r);
    }
  }
  // Two broad passes down each figure, its left half then its right
  const WARLI_PASSES = WARLI.flatMap(({ x }) => [-0.21, 0.21].map((dx) => ({ ms: 360, gap: 60, pts: [[x + dx, -0.26, 0.7], [x + dx * 1.04, 0.4, 1], [x + dx, 1.08, 0.8]] })));

  const SHOTS = {
    rsw: {
      strokes: RSW,
      box: { left: 0.08, right: 2.8, top: -0.04, bottom: 1.06 },
      size: (w, h) => Math.min(h * 0.36, w * 0.29),
      middle: (w, h) => (w < h ? 0.4 : 0.42),
      brush: 0.2,
      gap: 1.6,
      ink: 'sindoor',
      hold: 6000,
      label: '',
      line: 'The awakening begins soon.',
      small: '<span lang="gu">ટૂંક સમયમાં</span> · Coming soon',
    },
    warli: {
      strokes: WARLI_PASSES,
      mask: drawWarli,
      box: { left: -1.5, right: 1.5, top: -0.22, bottom: 1.02 },
      size: (w, h) => Math.min(h * 0.4, w * 0.3),
      middle: () => 0.42,
      brush: 0.48,
      gap: 0.3,
      ink: 'rice',
      hold: 4800,
      label: '<span class="k" lang="gu">વારલી</span>Warli',
      line: 'Find your tribe.',
      small: 'Warriors · Community',
    },
    patang: {
      strokes: PATANG,
      box: { left: 0.14, right: 0.86, top: 0.04, bottom: 0.9 },
      size: (w, h) => Math.min(h * 0.6, w * 0.7),
      middle: () => 0.42,
      brush: 0.035,
      gap: 2.2,
      ink: 'sindoor',
      hold: 4500,
      label: '<span class="k" lang="gu">પતંગ</span>Patang',
      line: 'Fly higher than yesterday.',
      small: 'Uttarayan · <span lang="gu">અમદાવાદ</span>',
    },
    gada: {
      strokes: GADA,
      box: { left: 0.28, right: 0.72, top: 0.04, bottom: 0.97 },
      size: (w, h) => Math.min(h * 0.55, w * 0.6),
      middle: () => 0.42,
      brush: 0.075,
      gap: 1.2,
      ink: 'haldi',
      hold: 4500,
      label: '<span class="k" lang="gu">ગદા</span>Gada',
      line: 'Strength, the old way.',
      small: 'Lab-tested · Every batch',
    },
  };
  // When each stroke starts: the brush lifts for a moment between strokes
  for (const shot of Object.values(SHOTS)) {
    let t = 0;
    for (const stroke of shot.strokes) {
      stroke.start = t;
      t += stroke.ms + (stroke.gap ?? 110);
    }
  }

  // Hair colours: sindoor red, haldi (turmeric) gold, rice-paste white
  const INKS = {
    sindoor: (shade) => `rgb(${Math.round(lerp(150, 225, shade))} ${Math.round(lerp(10, 30, shade))} ${Math.round(lerp(22, 40, shade))})`,
    haldi: (shade) => `rgb(${Math.round(lerp(196, 255, shade))} ${Math.round(lerp(128, 196, shade))} ${Math.round(lerp(8, 48, shade))})`,
    rice: (shade) => `rgb(${Math.round(lerp(214, 250, shade))} ${Math.round(lerp(204, 244, shade))} ${Math.round(lerp(186, 230, shade))})`,
  };

  const OPEN = 200; // ms until "presents" fades in
  const PAINT = 2300; // ms until the brush first touches down
  const LEAVE = 1300; // ms a shot takes to lift away

  // ---------- Layout ----------
  let layout, viewCtx, inkCtx, backCtx, frontCtx, maskCtx, revealCtx;
  const set = (name, value) => root.style.setProperty(name, value);

  // Lays a shot out on this screen. On a short screen (a phone on its side) the art shrinks and
  // moves up until it and its words fit between the small print at the top and bottom.
  const EDGE = 56; // px kept clear for the small print, top and bottom
  function measure(shot) {
    const w = innerWidth;
    const h = innerHeight;
    const { box } = shot;
    // Words inside the art only where there's room for them: the sun's ring is small on a short screen
    const center = Boolean(shot.center) && h >= (shot.centerMinHeight ?? 0);
    const words = center ? 0 : h < 520 ? 64 : 96; // the words' height under the art
    const tall = (unit) => (box.bottom - box.top + (shot.mask ? 0 : shot.brush)) * unit; // the art's height, brush included (a mask cuts it)
    const below = (unit) => shot.brush * unit * (shot.gap ?? 1) + words;
    let H = shot.size(w, h); // one unit, CSS px
    while (H > 40 && 2 * EDGE + tall(H) + below(H) > h) H *= 0.95;
    let cy = h * shot.middle(w, h);
    if (!center) cy = Math.max(EDGE + tall(H) / 2, Math.min(cy, h - EDGE - below(H) - tall(H) / 2));
    const x = (u) => w / 2 + (u - (box.left + box.right) / 2) * H;
    const y = (v) => cy + (v - (box.top + box.bottom) / 2) * H;
    const brush = shot.brush * H;

    set('--cy', `${cy}px`);
    set('--spot-y', `${((cy / h) * 100).toFixed(1)}%`);
    const copyY = y(box.bottom) + brush * (shot.gap ?? 1);
    set('--copy-y', `${(center ? cy : copyY).toFixed(1)}px`);
    if (center) set('--copy-w', `${(H * (shot.copyWidth ?? (h < 520 ? 0.64 : 0.74))).toFixed(1)}px`); // narrower in a small circle, clear of the ink
    else root.style.removeProperty('--copy-w');
    return { w, h, H, x, y, brush, center, dpr: Math.min(devicePixelRatio || 1, 2) };
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
  function painter(stroke, seed, colour, target = inkCtx) {
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
      const g = target;
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
      const rest = ['warli', 'patang', 'gada'];
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
    const masked = Boolean(shot.def.mask);
    let moved = 0;
    shot.strokes.forEach((stroke, i) => {
      if (stroke.done || time < stroke.start) return;
      const colour = INKS[stroke.ink ?? shot.def.ink];
      if (!stroke.painter) {
        stroke.painter = painter(stroke, shot.seed + i * 101, colour, masked ? revealCtx : inkCtx);
        if (i === 0 && !masked) splatter(stroke.painter.first, 0, Math.PI * 2, 9, 0.12, stroke.painter.rand, colour); // the brush lands
        if (shot.key === 'rsw' && i === 4) rswSound.cue('build'); // the brush reaches the W: the music rises
      }
      const t = Math.min(1, (time - stroke.start) / stroke.ms);
      moved += stroke.painter.advance(ease(t, stroke.flick) * stroke.painter.length + 0.01);
      if (t === 1) {
        stroke.done = true;
        const tip = stroke.painter.last;
        if (stroke.flick && !masked) splatter(tip, Math.atan2(tip.ty, tip.tx), 0.7, 16, 0.32, stroke.painter.rand, colour);
      }
    });
    // A masked shot's ink is the brush's passes, cut to its shapes
    if (masked && moved) {
      inkCtx.clearRect(0, 0, layout.w, layout.h);
      inkCtx.drawImage(reveal, 0, 0, layout.w, layout.h);
      inkCtx.globalCompositeOperation = 'destination-in';
      inkCtx.drawImage(mask, 0, 0, layout.w, layout.h);
      inkCtx.globalCompositeOperation = 'source-over';
    }
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
    if (def.mask) {
      revealCtx.clearRect(0, 0, layout.w, layout.h);
      maskCtx.clearRect(0, 0, layout.w, layout.h);
      def.mask(maskCtx);
    }
    glow = null;
    glowLevel = 0;
    words.label.innerHTML = def.label;
    words.line.textContent = def.line;
    words.small.innerHTML = def.small;
    // A clean canvas comes back sharp at once, not fading in from the last shot's smoke
    view.style.transition = 'none';
    root.classList.remove('is-written', 'is-leaving');
    root.classList.toggle('copy-center', layout.center);
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

  // ---------- Kites ----------
  // Uttarayan over Amdavad: a sky of paper kites at every distance, each in two colours with its
  // bamboo spine and bow and a little tail, bobbing on its string. Each look is drawn once at four
  // focus depths, so drawing many is cheap.
  const PAPERS = [['#d7263d', '#f4d35e'], ['#e0218a', '#fdf0d5'], ['#f77f00', '#2a9d8f'], ['#3a86ff', '#ffbe0b'], ['#fdf0d5', '#c1121f'], ['#06a77d', '#f77f00']];
  const sprites = PAPERS.map(([left, right]) =>
    [0, 1.2, 3.5, 9].map((blur) => {
      const pad = Math.ceil(blur * 2.5) + 2;
      const c = document.createElement('canvas');
      c.width = c.height = 64 + pad * 2;
      const g = c.getContext('2d');
      if (blur) g.filter = `blur(${blur}px)`;
      g.translate(pad, pad);
      const half = (fill, side) => {
        g.fillStyle = fill;
        g.beginPath();
        g.moveTo(32, 4);
        g.lineTo(32 + side * 26, 27);
        g.lineTo(32, 50);
        g.closePath();
        g.fill();
      };
      half(left, -1);
      half(right, 1);
      g.strokeStyle = 'rgb(70 40 20 / 0.55)';
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(32, 5);
      g.lineTo(32, 49); // the spine
      g.moveTo(7, 27);
      g.quadraticCurveTo(32, 13, 57, 27); // the bow
      g.stroke();
      g.fillStyle = left;
      g.beginPath();
      g.moveTo(32, 48);
      g.lineTo(26, 60);
      g.lineTo(38, 60);
      g.closePath();
      g.fill(); // the tail
      return { canvas: c, pad };
    }),
  );

  // Depth z: 0 far away (soft), the middle in focus with the ink, 1 right at the lens (very soft):
  // which drawing to use, and how strongly
  const focus = (z) => (z < 0.3 ? [1, 0.5] : z < 0.75 ? [0, 0.9] : z < 0.92 ? [2, 0.75] : [3, 0.55]);

  const kites = [];
  function newKite(anywhere) {
    const w = innerWidth;
    const h = innerHeight;
    const scale = Math.max(0.55, Math.min(w, h) / 900);
    const z = Math.random() ** 1.3; // more far away than near
    return {
      z,
      look: Math.floor(Math.random() * PAPERS.length),
      size: (16 + 52 * z ** 1.5) * scale,
      vx: (5 + 18 * z) * scale,
      bob: Math.random() * 6.3,
      bobRate: 0.5 + Math.random() * 0.7,
      bobAmp: (5 + 16 * z) * scale,
      sway: Math.random() * 6.3,
      swayRate: 0.3 + Math.random() * 0.5,
      tilt: (Math.random() - 0.5) * 0.4,
      wx: 0,
      wy: 0,
      // The wind blows left to right, so new kites drift in from the left
      x: anywhere ? Math.random() * w : -60,
      y: (anywhere ? Math.random() * 0.8 : 0.05 + Math.random() * 0.6) * h,
    };
  }

  function seedSky() {
    kites.length = 0;
    const count = still ? 10 : innerWidth < 700 ? 14 : 24;
    for (let i = 0; i < count; i++) kites.push(newKite(true));
  }

  // On a beat every kite gets a tug on its string and lifts a little
  function surge(strength) {
    const scale = Math.max(0.55, Math.min(innerWidth, innerHeight) / 900);
    for (const k of kites) {
      k.wy -= (14 + 30 * k.z) * scale * strength;
      k.wx += (6 + 10 * k.z) * scale * strength;
    }
  }

  // A gust as a shot lifts away
  function gust() {
    const scale = Math.max(0.55, Math.min(innerWidth, innerHeight) / 900);
    for (const k of kites) {
      k.wx += (120 + Math.random() * 200) * scale * (0.4 + k.z);
      k.wy -= Math.random() * 60 * scale;
    }
  }

  // The pointer stirs the air: kites near it get pushed the way it moves
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

  function drawSky(dt) {
    const { w, h, dpr } = layout;
    for (const g of [backCtx, frontCtx]) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
    }
    const stirring = Math.hypot(breeze.vx, breeze.vy) > 5;
    for (let i = 0; i < kites.length; i++) {
      let k = kites[i];
      if (dt) {
        k.bob += k.bobRate * dt;
        k.sway += k.swayRate * dt;
        if (stirring) {
          const reach = 160 + 200 * k.z;
          const d = Math.hypot(k.x - breeze.x, k.y - breeze.y);
          if (d < reach) {
            const shove = (1 - d / reach) * (0.4 + k.z) * dt * 3;
            k.wx += breeze.vx * shove;
            k.wy += breeze.vy * shove;
          }
        }
        k.wx *= Math.exp(-dt * 1.2);
        k.wy *= Math.exp(-dt * 1.8);
        k.x += (k.vx + k.wx) * dt;
        k.y += k.wy * dt + Math.cos(k.bob) * k.bobAmp * dt;
        if (k.x > w + k.size * 3 || k.x < -w * 0.5 || k.y < -h * 0.4 || k.y > h * 1.2) k = kites[i] = newKite(false);
      }
      const [depth, alpha] = focus(k.z);
      const sprite = sprites[k.look][depth];
      const front = k.z >= 0.92;
      const g = front ? frontCtx : backCtx;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!front) {
        // its string, curving away down to the flyer
        g.globalAlpha = alpha * 0.35;
        g.strokeStyle = '#f6ecdc';
        g.lineWidth = Math.max(0.6, k.size / 50);
        g.beginPath();
        g.moveTo(k.x, k.y);
        g.quadraticCurveTo(k.x - k.size * 0.6, k.y + k.size * 1.6, k.x - k.size * 1.6, k.y + k.size * 3.2);
        g.stroke();
      }
      g.translate(k.x, k.y);
      g.rotate(k.tilt + Math.sin(k.sway) * 0.2);
      g.scale(k.size / 64, k.size / 64);
      g.globalAlpha = alpha;
      g.drawImage(sprite.canvas, -32 - sprite.pad, -27 - sprite.pad); // held where the string ties on
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
  let beat = 0; // the beat's pull on the light, fading slowly
  let breath = 0; // the light itself, easing after it

  function setup() {
    layout = measure(shot ? shot.def : SHOTS.rsw);
    viewCtx = fit(view);
    inkCtx = fit(ink);
    maskCtx = fit(mask);
    revealCtx = fit(reveal);
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
      drawSky(0);
    }
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    if (!entered) {
      drawSky(dt); // blossoms drift behind the gate
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

    // The picture moves with the music, gently: the red light behind the ink breathes with the beat
    // (it rises over a moment and fades slowly, never flashing) and the breeze surges on each kick;
    // the drop and the taiko hits surge harder
    for (const kind of rswSound.beats()) {
      if (kind === 'clap') continue;
      beat = Math.max(beat, kind === 'kick' ? 1 : 1.3);
      surge(kind === 'kick' ? 1 : 2.5);
    }
    beat *= Math.exp(-dt * 2.2);
    breath += (beat - breath) * (1 - Math.exp(-dt * 9));
    glowOnBeat.style.opacity = Math.min(0.5, breath * 0.4).toFixed(3);

    compose();
    drawSky(dt);
    requestAnimationFrame(frame);
  }

  // A resize repaints the shot at its new size; a half-painted shot starts its brush again
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setup();
      seedSky();
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
        drawSky(0);
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
    seedSky();
    if (still) drawSky(0);
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
