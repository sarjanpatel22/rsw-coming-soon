// ---------- RSW coming soon: the soundtrack ----------
// A phonk beat with a koto in a Japanese scale, made in the browser: nothing is downloaded or
// licensed, every sound is synthesised. 130 BPM: an 808 kick, a distorted 808 bass, a pitched
// cowbell riff, hats with rolls and a half-time clap. The koto is a Karplus-Strong string playing
// the In scale (E F A B C, miyako-bushi), and a taiko drum hits on every reveal.
// ink.js cues it: the koto alone while RSW is painted, a riser as the brush reaches the W, the drop
// when RSW lands, and the mix muffling as each shot lifts away. Sound is on from the start; the
// Sound button mutes it.
window.rswSound = (() => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const BPM = 130;
  const STEP = 60 / BPM / 4; // a 16th note, s
  const E1 = 41.2; // Hz
  const IN = [0, 1, 5, 7, 8]; // the In scale, in semitones over E

  // A scale degree (0, 1, 2… climbing the In scale) as a frequency, octaves counted from E1
  const pitch = (degree, octave) => E1 * 2 ** (octave + (IN[degree % 5] + 12 * Math.floor(degree / 5)) / 12);

  // ---------- The engine ----------
  // Works on a live AudioContext or an OfflineAudioContext (the test renders one)
  function engine(ctx, destination) {
    const now = () => ctx.currentTime;
    // The beat's big moments with their audio times, so the picture can move with them
    const pulses = [];
    const beat = (kind, at) => pulses.push({ kind, at }) > 256 && pulses.shift(); // nobody listening: keep it small

    // Mix: everything → muffle (a low-pass the teaser sweeps) → master → compressor → out.
    // The bus carries all but the drums, and ducks on every kick: the phonk pump.
    const master = ctx.createGain();
    master.gain.value = 0;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -16;
    glue.knee.value = 8;
    glue.ratio.value = 4;
    glue.attack.value = 0.004;
    glue.release.value = 0.22;
    master.connect(glue).connect(destination);
    const muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 18000;
    muffle.Q.value = 0.8;
    muffle.connect(master);
    const bus = ctx.createGain();
    bus.connect(muffle);
    const drums = ctx.createGain();
    drums.connect(muffle);

    // A hall: a convolver with a decaying-noise impulse; instruments send into it
    const hall = ctx.createConvolver();
    hall.buffer = (() => {
      const length = Math.floor(ctx.sampleRate * 2.6);
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
      }
      return buffer;
    })();
    const hallOut = ctx.createGain();
    hallOut.gain.value = 0.45;
    hall.connect(hallOut).connect(bus);
    const send = (node, amount) => {
      const g = ctx.createGain();
      g.gain.value = amount;
      node.connect(g).connect(hall);
    };

    const noise = (() => {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    })();

    const shaper = (drive) => {
      const node = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
      }
      node.curve = curve;
      return node;
    };

    // A burst of filtered noise with a fast attack and an exponential fade
    function hiss(t, type, frequency, level, decay, target = drums, q = 0.7) {
      const source = ctx.createBufferSource();
      source.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
      source.connect(filter).connect(g).connect(target);
      source.start(t, Math.random() * 1.5, decay + 0.05);
      return g;
    }

    // ---------- Instruments ----------
    // 808 kick: a sine that drops from 150 to 48 Hz, plus a click so phones hear the hit
    function kick(t, level = 0.78) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      o.connect(g).connect(drums);
      o.start(t);
      o.stop(t + 0.4);
      hiss(t, 'bandpass', 2400, 0.25 * level, 0.012);
      // The pump: everything else dips under the kick and swells back
      bus.gain.setValueAtTime(0.42, t);
      bus.gain.setTargetAtTime(1, t + 0.01, 0.1);
    }

    // 808 bass: a long sine pushed through a hard saturator, so its overtones carry on small speakers
    const bassIn = shaper(5);
    const bassTone = ctx.createBiquadFilter();
    bassTone.type = 'lowpass';
    bassTone.frequency.value = 760;
    const bassLevel = ctx.createGain();
    bassLevel.gain.value = 0.3;
    bassIn.connect(bassTone).connect(bassLevel).connect(bus);
    function bass(t, degree, length, slideTo) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(pitch(degree, 0), t);
      if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(pitch(slideTo, 0), t + length * 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
      g.gain.setTargetAtTime(0.0001, t + length * 0.8, 0.05);
      o.connect(g).connect(bassIn);
      o.start(t);
      o.stop(t + length + 0.4);
    }

    // The phonk cowbell: two square waves a fifth-ish apart through a band-pass, like the 808's
    function cowbell(t, frequency, level = 0.44) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = frequency * 2.4;
      filter.Q.value = 1.1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(level * 0.35, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
      for (const ratio of [1, 1.48]) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = frequency * ratio;
        o.connect(filter);
        o.start(t);
        o.stop(t + 0.32);
      }
      filter.connect(g).connect(bus);
      send(g, 0.18);
    }

    function hat(t, open = false, level = 0.12) {
      hiss(t, 'highpass', 7500, level, open ? 0.26 : 0.04);
    }

    // A hat roll: six hits squeezed into a beat, getting louder
    function roll(t) {
      for (let i = 0; i < 6; i++) hat(t + i * STEP * (2 / 3), false, 0.06 + i * 0.016);
    }

    // The clap: three quick slaps, a tail, a little body
    function clap(t, level = 0.5) {
      for (const [dt, l] of [[0, 0.7], [0.011, 0.6], [0.023, 1]]) hiss(t + dt, 'bandpass', 1500, level * l, dt === 0.023 ? 0.2 : 0.012, drums, 0.9);
      const body = ctx.createOscillator();
      body.type = 'triangle';
      body.frequency.value = 190;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level * 0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      body.connect(g).connect(drums);
      body.start(t);
      body.stop(t + 0.1);
      send(g, 0.3);
    }

    // The koto: a Karplus-Strong string (a noise burst circling a delay line that softens each pass),
    // made once per note. It lands a hair sharp and settles, like a plucked silk string; some notes
    // get the koto's press-bend a moment after the pluck.
    const strings = new Map();
    function string(frequency) {
      const rate = ctx.sampleRate;
      const period = Math.max(2, Math.round(rate / frequency));
      const length = Math.floor(rate * 1.6);
      const buffer = ctx.createBuffer(1, length, rate);
      const data = buffer.getChannelData(0);
      const line = new Float32Array(period);
      let smooth = 0;
      for (let i = 0; i < period; i++) {
        smooth = 0.6 * (Math.random() * 2 - 1) + 0.4 * smooth;
        line[i] = smooth;
      }
      for (let i = 0, k = 0; i < length; i++) {
        const a = line[k];
        const b = line[(k + 1) % period];
        data[i] = a;
        line[k] = 0.4985 * (a + b);
        k = (k + 1) % period;
      }
      for (let i = length - 2000; i < length; i++) data[i] *= (length - i) / 2000; // no click at the end
      return { buffer, tune: frequency / (rate / period) };
    }
    function koto(t, degree, level = 0.32, bend = 0) {
      const key = degree;
      if (!strings.has(key)) strings.set(key, string(pitch(degree, 3)));
      const { buffer, tune } = strings.get(key);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(tune * 1.012, t);
      source.playbackRate.exponentialRampToValueAtTime(tune, t + 0.05);
      if (bend) source.playbackRate.setTargetAtTime(tune * 2 ** (bend / 12), t + 0.22, 0.07);
      const g = ctx.createGain();
      g.gain.value = level;
      source.connect(g).connect(bus);
      send(g, 0.5);
      source.start(t);
      source.stop(t + 1.6);
      hiss(t, 'highpass', 5000, level * 0.12, 0.008, bus); // the pick
    }

    // Taiko: a deep drum, its skin and its boom
    function taiko(t, strength = 1) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(95, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.75 * strength, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 1.5);
      hiss(t, 'lowpass', 260, 0.45 * strength, 0.25, master);
      send(g, 0.2);
    }

    // A low E drone under the koto sections
    const drone = ctx.createGain();
    drone.gain.value = 0;
    for (const [degree, octave, type] of [[0, 0, 'sine'], [0, 1, 'triangle'], [3, 1, 'sine']]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = pitch(degree, octave) * (octave ? 1.003 : 1);
      o.connect(drone);
      o.start();
    }
    const droneTone = ctx.createBiquadFilter();
    droneTone.type = 'lowpass';
    droneTone.frequency.value = 320;
    drone.connect(droneTone).connect(bus);
    const droneTo = (level, t = now()) => drone.gain.setTargetAtTime(level, t, 0.6);

    // ---------- Writing the parts ----------
    // The cowbell riff: two bars of 8ths walking the In scale, leaning back to E on the beat
    function makeRiff() {
      const riff = new Array(32).fill(null);
      let degree = 0;
      for (let s = 0; s < 32; s += 2) {
        if (s % 16 === 14 && Math.random() < 0.5) continue; // a breath at the end of a bar
        if (s % 8 === 0) degree = Math.random() < 0.6 ? 0 : degree;
        else degree = Math.max(0, Math.min(6, degree + [-2, -1, 1, 1, 2][Math.floor(Math.random() * 5)]));
        riff[s] = degree;
        if (Math.random() < 0.18) riff[s + 1] = Math.max(0, degree - 1); // a quick pickup
      }
      return riff;
    }

    // A koto phrase: four bars of 8ths with rests, wandering and coming home to E
    function makePhrase(density) {
      const phrase = new Array(64).fill(null);
      let degree = 5;
      for (let s = 0; s < 64; s += 2) {
        if (Math.random() > density) continue;
        degree = Math.max(0, Math.min(9, degree + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
        phrase[s] = { degree, bend: Math.random() < 0.12 ? 1 : 0 };
        if (Math.random() < 0.08) phrase[s + 1] = { degree, soft: true }; // a quick repeat
      }
      phrase[56] = { degree: 5, bend: 0 };
      return phrase;
    }

    // Four bars: kicks per bar, the 808's notes (E E C B), and where the bass lands
    const KICKS = [[0, 6, 10], [0, 6, 10, 13], [0, 6, 10], [0, 3, 6, 10, 14]];
    const ROOTS = [0, 0, 4, 3];
    const BASS = { 0: 6, 6: 4, 10: 6 }; // step: length in steps

    let section = 'intro'; // intro (koto alone), break (koto and ticking hats), drop (everything)
    let pending = null; // a section change waiting for the next beat
    let next = 0; // the time of the next unscheduled 16th
    let step = 0;
    let bar = 0;
    let riff = makeRiff();
    let phrase = makePhrase(0.55);
    let sparse = makePhrase(0.16);
    let rollAt = 12;
    let riser = null;

    function play(t) {
      const b = bar;
      const s = step;
      const at = b * 16 + s;
      if (section === 'drop') {
        if (KICKS[b].includes(s)) {
          kick(t);
          beat('kick', t);
        }
        if (s === 8) {
          clap(t);
          beat('clap', t);
        }
        if (b === 3 && s === 15) clap(t, 0.22);
        const rolling = (b === 1 || b === 3) && s >= rollAt && s < rollAt + 4;
        if (s === rollAt && (b === 1 || b === 3)) roll(t);
        else if (!rolling && s % 2 === 0) hat(t, s === 14 && b % 2 === 0, s % 4 === 0 ? 0.13 : 0.09);
        const note = riff[(b % 2) * 16 + s];
        if (note !== null) cowbell(t, pitch(note, 4), s % 4 === 0 ? 0.46 : 0.36);
        if (BASS[s]) bass(t, ROOTS[b], BASS[s] * STEP, s === 10 && ROOTS[(b + 1) % 4] !== ROOTS[b] ? ROOTS[(b + 1) % 4] : undefined);
        const k = sparse[at];
        if (k && !k.soft) koto(t, Math.min(9, k.degree + 2), 0.4, k.bend);
      } else {
        const k = phrase[at];
        if (k) koto(t, k.degree, k.soft ? 0.3 : 0.55, k.bend);
        if (section === 'break' && s % 2 === 0) hat(t, false, s % 4 === 0 ? 0.05 : 0.03);
      }
    }

    // Schedule every 16th that starts before `until`; a pending change lands on a beat
    function scheduleUntil(until) {
      while (next < until) {
        if (pending && step % 4 === 0) {
          pending(next);
          pending = null;
        }
        play(next);
        next += STEP;
        step = (step + 1) % 16;
        if (step === 0) {
          bar = (bar + 1) % 4;
          if (bar === 0) {
            phrase = makePhrase(0.55);
            sparse = makePhrase(0.16);
            rollAt = [12, 8, 12, 4][Math.floor(Math.random() * 4)];
          }
        }
      }
    }

    function begin(atTime, startSection) {
      next = atTime;
      step = 0;
      bar = 0;
      section = startSection;
      droneTo(section === 'drop' ? 0 : 0.05, atTime);
    }

    // The teaser's moments
    function cue(kind) {
      const t = Math.max(now(), next - STEP); // about now, on the grid
      if (kind === 'break') {
        pending = (at) => {
          section = 'break';
          phrase = makePhrase(0.55);
          droneTo(0.05, at);
        };
      } else if (kind === 'build') {
        // A riser: noise swept up through a band-pass until the drop
        const source = ctx.createBufferSource();
        source.buffer = noise;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.4;
        filter.frequency.setValueAtTime(300, t);
        filter.frequency.exponentialRampToValueAtTime(5200, t + 1.8);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 1.7);
        source.connect(filter).connect(g).connect(bus);
        source.start(t);
        riser = { source, g };
      } else if (kind === 'drop') {
        pending = (at) => {
          section = 'drop';
          step = 0;
          bar = 0;
          riff = makeRiff(); // a new riff every round
          droneTo(0, at);
          hiss(at, 'highpass', 4000, 0.22, 1.6, bus); // the crash
          beat('drop', at);
          if (riser) {
            riser.g.gain.cancelScheduledValues(at);
            riser.g.gain.setTargetAtTime(0.0001, at, 0.02);
            riser.source.stop(at + 0.3);
            riser = null;
          }
        };
      } else if (kind === 'hit') {
        const at = next + (step % 2 ? STEP : 0); // on the next 8th
        taiko(at, 0.8);
        beat('hit', at);
      } else if (kind === 'muffle') {
        muffle.frequency.setTargetAtTime(650, now(), 0.25);
      } else if (kind === 'open') {
        muffle.frequency.setTargetAtTime(18000, now(), 0.35);
      }
    }

    // After the page was hidden: skip the missed 16ths instead of playing them all at once
    const resync = (t) => {
      if (next < t) next = t;
    };

    return { master, begin, scheduleUntil, cue, taiko, resync, pulses, swish: { ctx, noise, out: master } };
  }

  // ---------- Live: autoplay, the button, and the teaser's cues ----------
  // Sound is on from the start. Most browsers keep a page silent until its first tap, so ink.js
  // asks autoplay() first and, when the answer is no, opens with a "Tap to enter" screen whose tap
  // starts the teaser and the music together. The button mutes and unmutes.
  const button = document.querySelector('.sound');
  let ctx = null;
  let live = null;
  let timer = 0;
  let on = false;
  let swishGain = null;
  let swishFilter = null;
  // Where the teaser is, so sound switched on mid-way starts in the right section
  const where = { opening: true, key: 'rsw', phase: 'paint', rounds: 0 };

  function show() {
    button.setAttribute('aria-pressed', String(on));
    button.innerHTML = `Sound <b>${on ? 'on' : 'off'}</b>`;
  }

  // The audio graph, made once. Made before any tap, a context starts suspended in most browsers.
  function prepare() {
    if (ctx || !AudioContext) return;
    ctx = new AudioContext();
    live = engine(ctx, ctx.destination);
    // The brush swish: band-passed noise that follows the brush's speed
    const source = ctx.createBufferSource();
    source.buffer = live.swish.noise;
    source.loop = true;
    swishFilter = ctx.createBiquadFilter();
    swishFilter.type = 'bandpass';
    swishFilter.frequency.value = 1400;
    swishFilter.Q.value = 0.7;
    swishGain = ctx.createGain();
    swishGain.gain.value = 0;
    source.connect(swishFilter).connect(swishGain).connect(live.master);
    source.start();
  }

  function enable() {
    prepare();
    if (!ctx) return;
    // iPhones mute web audio on the silent switch unless the page says it plays media
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    ctx.resume?.();
    on = true;
    const t = ctx.currentTime + 0.05;
    const painting = where.opening || (where.key === 'rsw' && where.phase === 'paint');
    live.begin(t, painting ? (where.rounds ? 'break' : 'intro') : 'drop');
    live.master.gain.cancelScheduledValues(t);
    live.master.gain.setTargetAtTime(0.85, t, 0.15);
    clearInterval(timer);
    timer = setInterval(() => live.scheduleUntil(ctx.currentTime + 0.15), 25);
    show();
  }

  function disable() {
    on = false;
    clearInterval(timer);
    timer = 0;
    live?.master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    show();
  }

  button.addEventListener('click', () => (on ? disable() : enable()));
  show();

  // Quiet while the page is hidden (another app, a locked phone); back in time when it returns
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !on) return;
    if (document.hidden) {
      clearInterval(timer);
      ctx.suspend?.();
    } else {
      ctx.resume?.().then(() => {
        live.resync(ctx.currentTime + 0.05);
        clearInterval(timer);
        timer = setInterval(() => live.scheduleUntil(ctx.currentTime + 0.15), 25);
      });
    }
  });

  return {
    // Whether this browser lets the page play sound before any tap (most don't)
    autoplay() {
      prepare();
      return new Promise((resolve) => setTimeout(() => resolve(ctx?.state === 'running'), 60));
    },
    enable,
    // The beats heard since the last call (kick, clap, drop, hit), for ink.js to move the picture with.
    // Allows for the speakers' delay; beats older than a moment are dropped (the page was hidden).
    beats() {
      if (!on || !live) return [];
      const heard = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      const due = [];
      while (live.pulses.length && live.pulses[0].at <= heard) {
        const pulse = live.pulses.shift();
        if (heard - pulse.at < 0.25) due.push(pulse.kind);
      }
      return due;
    },
    // Called by ink.js as the teaser moves on
    cue(kind, key) {
      const again = where.rounds > 0;
      if (kind === 'open') Object.assign(where, { opening: true, key: 'rsw', phase: 'paint', rounds: 0 });
      if (kind === 'paint') Object.assign(where, { opening: false, key, phase: 'paint' });
      if (kind === 'written') where.phase = 'written';
      if (kind === 'leave') where.phase = 'leaving';
      if (kind === 'written' && key === 'rsw') where.rounds++;
      if (!on) return;
      if (kind === 'open') {
        live.cue('open');
        if (again) live.cue('break'); // a replay: back to the koto
      }
      if (kind === 'paint') {
        live.cue('open');
        if (key === 'rsw' && again) live.cue('break');
      }
      if (kind === 'build') live.cue('build');
      if (kind === 'written') {
        if (key === 'rsw') live.cue('drop');
        live.cue('hit');
      }
      if (kind === 'leave') live.cue('muffle');
    },
    // How fast the brush is moving, 0 to 1
    brush(speed) {
      if (!on || !swishGain) return;
      const t = ctx.currentTime;
      swishGain.gain.setTargetAtTime(Math.min(1, speed) * 0.15, t, 0.03);
      swishFilter.frequency.setTargetAtTime(900 + 1600 * Math.min(1, speed), t, 0.05);
    },
    engine, // for the offline render test
  };
})();
