// ---------- RSW coming soon, India: the soundtrack ----------
// Made in the browser: nothing is downloaded or licensed, every sound is synthesised. It's in Raag
// Malkauns on E (Sa ga ma dha ni: E G A C D), a dark, majestic night raga. A bansuri (bamboo flute)
// leads: one breathing voice that glides between notes (the meend), with vibrato on the long ones,
// playing the raga's own phrases. A tanpura tuned the Malkauns way (Ma Sa Sa Sa) hums under it and a
// tabla keeps keherwa, the eight-beat rhythm of Indian film songs. On the drop the phonk comes in: an
// 808 kick and bass, hats with rolls and a half-time clap, a sitar riff answered by the bansuri. A
// dhol hits on every reveal.
// ink.js cues it: tanpura and bansuri while RSW is painted, a riser as the brush reaches the W, the
// drop when RSW lands, and the mix muffling as each shot lifts away. Sound is on from the start; the
// Sound button mutes it.
window.rswSound = (() => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const BPM = 130;
  const STEP = 60 / BPM / 4; // a 16th note, s
  const EIGHTH = STEP * 2;
  const E2 = 82.41; // Hz
  const MALKAUNS = [0, 3, 5, 8, 10]; // Sa, komal Ga, Ma, komal Dha, komal Ni: semitones over Sa

  // A note of the raga as a frequency: degree 0 is Sa, 1 ga, 2 ma… 5 the Sa above, -1 the ni below;
  // octaves counted from E2
  const pitch = (degree, octave) => E2 * 2 ** (octave + (MALKAUNS[((degree % 5) + 5) % 5] + 12 * Math.floor(degree / 5)) / 12);

  // The raga's phrases for the bansuri, two bars each: [degree, length in 8ths, glide in?]
  const PHRASES = [
    [[2, 2], [1, 1], [2, 1, 1], [3, 2], [4, 1], [3, 1, 1], [2, 8]], // ma ga ma dha ni dha ma
    [[5, 3], [4, 1, 1], [3, 2], [2, 2], [1, 1], [2, 1], [1, 2, 1], [0, 4]], // Sa ni dha ma, ga ma ga Sa
    [[-1, 2], [0, 2, 1], [1, 2], [2, 4], [1, 2, 1], [0, 4]], // ni Sa ga ma ga Sa
    [[1, 1], [2, 1], [3, 1], [4, 1, 1], [5, 8], [4, 2, 1], [3, 2]], // up to the high Sa, and hold it
    [[3, 2], [2, 1, 1], [1, 1], [2, 4], [3, 2], [4, 1], [3, 1, 1], [2, 4]], // dha ma ga ma, dha ni dha ma
  ];
  // The sitar's riffs for the drop, two bars of 8ths (null is a rest)
  const RIFFS = [
    [0, 0, 1, 2, 3, 2, 1, 0, 0, -1, 0, 1, 2, 1, 0, null],
    [0, null, 0, 1, 2, null, 3, 2, 1, 2, 1, 0, -1, 0, null, null],
    [2, 2, 3, 4, 5, 4, 3, 2, 1, 2, 1, 0, 0, null, -1, 0],
  ];
  // Keherwa: dha ge na ti | na ka dhi na
  const KEHERWA = ['dha', 'ge', 'na', 'ti', 'na', 'ka', 'dhi', 'na'];

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
    const trim = ctx.createGain(); // headroom after the compressor: its fast peaks stay clear of clipping
    trim.gain.value = 0.85;
    master.connect(glue).connect(trim).connect(destination);
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
      const length = Math.floor(ctx.sampleRate * 2.8);
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
      }
      return buffer;
    })();
    const hallOut = ctx.createGain();
    hallOut.gain.value = 0.42;
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

    // ---------- The phonk under it ----------
    // 808 kick: a sine that drops from 150 to 48 Hz, plus a click so phones hear the hit
    function kick(t, level = 0.86) {
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
    bassLevel.gain.value = 0.5;
    bassIn.connect(bassTone).connect(bassLevel).connect(bus);
    function bass(t, degree, length, slideTo) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(pitch(degree, -1), t);
      if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(pitch(slideTo, -1), t + length * 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
      g.gain.setTargetAtTime(0.0001, t + length * 0.8, 0.05);
      o.connect(g).connect(bassIn);
      o.start(t);
      o.stop(t + length + 0.4);
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

    // ---------- The bansuri ----------
    // One breathing voice for a whole phrase: a sine with two soft overtones, breath noise following
    // the pitch, a scoop up into the first note, a small dip of the tongue between notes (or a glide,
    // the meend) and vibrato that blooms on the long notes. The breath runs out at the end.
    function bansuri(t, phrase, level = 0.34) {
      const end = t + phrase.reduce((sum, [, beats]) => sum + beats, 0) * EIGHTH;
      const voice = ctx.createGain();
      voice.gain.value = 0;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 3400;
      voice.connect(tone).connect(bus);
      send(tone, 0.5);
      const pipes = [[1, 1], [2, 0.14], [3, 0.05]].map(([harmonic, amount]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = amount;
        o.connect(g).connect(voice);
        o.start(t);
        o.stop(end + 0.5);
        return { o, harmonic };
      });
      const breath = ctx.createBufferSource();
      breath.buffer = noise;
      breath.loop = true;
      const breathBand = ctx.createBiquadFilter();
      breathBand.type = 'bandpass';
      breathBand.Q.value = 2.5;
      const breathLevel = ctx.createGain();
      breathLevel.gain.value = 0.07;
      breath.connect(breathBand).connect(breathLevel).connect(voice);
      breath.start(t, Math.random());
      breath.stop(end + 0.5);
      const vibrato = ctx.createOscillator();
      vibrato.frequency.value = 5.3;
      const depth = ctx.createGain(); // in cents
      depth.gain.value = 0;
      vibrato.connect(depth);
      for (const { o } of pipes) depth.connect(o.detune);
      vibrato.start(t);
      vibrato.stop(end + 0.5);

      let at = t;
      phrase.forEach(([degree, beats, glide], i) => {
        const f = pitch(degree, 2); // Sa is E4: a big concert bansuri
        const length = beats * EIGHTH;
        for (const { o, harmonic } of pipes) {
          if (i === 0) o.frequency.setValueAtTime(f * harmonic * 0.96, at); // the scoop up into it
          o.frequency.setTargetAtTime(f * harmonic, at, glide ? 0.05 : 0.012);
        }
        breathBand.frequency.setTargetAtTime(f * 2, at, 0.02);
        if (i === 0) voice.gain.setTargetAtTime(level, at, 0.04);
        else if (!glide) {
          voice.gain.setTargetAtTime(level * 0.5, at, 0.006); // the tongue
          voice.gain.setTargetAtTime(level, at + 0.03, 0.03);
        }
        depth.gain.setTargetAtTime(beats >= 3 ? 16 : 0, at + Math.min(0.3, length * 0.4), 0.15);
        at += length;
      });
      voice.gain.setTargetAtTime(0.0001, end - 0.08, 0.1);
    }

    // ---------- Strings ----------
    // Karplus-Strong: a burst of noise circling a delay line that softens it each pass. `bright` is
    // how raw the pluck is, `keep` how slowly the string rings down.
    const strings = new Map();
    function string(frequency, bright, keep, seconds) {
      const rate = ctx.sampleRate;
      const period = Math.max(2, Math.round(rate / frequency));
      const length = Math.floor(rate * seconds);
      const buffer = ctx.createBuffer(1, length, rate);
      const data = buffer.getChannelData(0);
      const line = new Float32Array(period);
      let smooth = 0;
      for (let i = 0; i < period; i++) {
        smooth = bright * (Math.random() * 2 - 1) + (1 - bright) * smooth;
        line[i] = smooth;
      }
      for (let i = 0, k = 0; i < length; i++) {
        const a = line[k];
        const b = line[(k + 1) % period];
        data[i] = a;
        line[k] = keep * (a + b);
        k = (k + 1) % period;
      }
      for (let i = length - 2000; i < length; i++) data[i] *= (length - i) / 2000; // no click at the end
      return { buffer, tune: frequency / (rate / period) };
    }
    const cached = (key, make) => {
      if (!strings.has(key)) strings.set(key, make());
      return strings.get(key);
    };

    // The sitar: a bright wire whose tone sweeps down as it rings, the zing of its flat bridge (the
    // jawari), with the sympathetic strings blooming an octave up a moment after the pluck
    let lastSitar;
    function sitar(t, degree, level = 0.3, glide = false) {
      const ring = (deg, lvl, at, bloom) => {
        const { buffer, tune } = cached(`s${deg}`, () => string(pitch(deg, 1), 0.9, 0.4993, 1.6)); // Sa is E3
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        if (glide && lastSitar !== undefined && !bloom) {
          source.playbackRate.setValueAtTime(tune * (pitch(lastSitar, 1) / pitch(deg, 1)), at);
          source.playbackRate.exponentialRampToValueAtTime(tune, at + 0.12);
        } else source.playbackRate.value = tune;
        const zing = ctx.createBiquadFilter();
        zing.type = 'peaking';
        zing.Q.value = 5;
        zing.gain.value = 12;
        zing.frequency.setValueAtTime(5600, at);
        zing.frequency.exponentialRampToValueAtTime(1300, at + 0.7);
        const g = ctx.createGain();
        if (bloom) {
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(lvl, at + 0.15);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
        } else g.gain.value = lvl;
        source.connect(zing).connect(g).connect(bus);
        send(g, 0.3);
        source.start(at);
        source.stop(at + 1.6);
      };
      ring(degree, level, t, false);
      ring(degree + 5, level * 0.1, t + 0.02, true);
      hiss(t, 'highpass', 4500, level * 0.12, 0.01, bus); // the mizrab, the wire pick on the finger
      lastSitar = degree;
    }

    // The tanpura, tuned for Malkauns: low Ma, Sa, Sa, low Sa, plucked round slowly. Each string's
    // shimmer is a resonance sweeping slowly down as it rings, not distortion.
    const tanpuraLevel = ctx.createGain();
    tanpuraLevel.gain.value = 0;
    tanpuraLevel.connect(bus);
    send(tanpuraLevel, 0.3);
    const TANPURA = [[2, 0], [0, 1], [0, 1], [0, 0]]; // [degree, octave]
    let tanpuraAt = 0;
    let tanpuraString = 0;
    function tanpura(t) {
      const [degree, octave] = TANPURA[tanpuraString++ % 4];
      const { buffer, tune } = cached(`t${degree}/${octave}`, () => string(pitch(degree, octave), 0.45, 0.49975, 4));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = tune;
      const shimmer = ctx.createBiquadFilter();
      shimmer.type = 'peaking';
      shimmer.Q.value = 4;
      shimmer.gain.value = 10;
      shimmer.frequency.setValueAtTime(3200, t);
      shimmer.frequency.exponentialRampToValueAtTime(800, t + 2.5);
      source.connect(shimmer).connect(tanpuraLevel);
      source.start(t);
      source.stop(t + 4);
    }
    const tanpuraTo = (level, t = now()) => tanpuraLevel.gain.setTargetAtTime(level, t, 0.5);

    // ---------- The tabla ----------
    // The dayan (right drum, tuned to Sa) rings in near-harmonic partials thanks to its black spot,
    // its pitch settling a hair after the strike; the bayan (left) is a bass the palm presses up in
    // pitch (the gumak), or a flat slap
    function dayan(t, level, ring) {
      [[1, 1], [2, 0.45], [3, 0.28], [4, 0.16]].forEach(([ratio, amount], i) => {
        const o = ctx.createOscillator();
        const f = pitch(0, 2) * ratio;
        o.frequency.setValueAtTime(f * 1.025, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
        const g = ctx.createGain();
        g.gain.setValueAtTime(level * amount, t);
        g.gain.exponentialRampToValueAtTime(0.0005, t + ring / (1 + i * 0.7));
        o.connect(g).connect(drums);
        o.start(t);
        o.stop(t + ring + 0.05);
      });
      hiss(t, 'bandpass', 1200, level * 0.3, 0.012, drums, 1.5); // the finger on the skin
    }
    function bayan(t, level) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(80, t);
      o.frequency.exponentialRampToValueAtTime(124, t + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(level * 0.85, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g).connect(drums);
      o.start(t);
      o.stop(t + 0.65);
    }
    const slap = (t, level) => hiss(t, 'lowpass', 500, level * 0.6, 0.035);
    // The bols, the tabla's syllables
    const BOLS = {
      dha: (t, l) => (dayan(t, l, 0.3), bayan(t, l)),
      dhi: (t, l) => (dayan(t, l * 0.8, 0.55), bayan(t, l)),
      ge: (t, l) => bayan(t, l),
      na: (t, l) => dayan(t, l, 0.28),
      ti: (t, l) => dayan(t, l * 0.6, 0.08),
      ka: (t, l) => slap(t, l),
    };

    // The dhol: the bass side's boom, then the stick's crack on the other head
    function dhol(t, strength = 1) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(115, t);
      o.frequency.exponentialRampToValueAtTime(58, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.85 * strength, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.85);
      hiss(t, 'lowpass', 380, 0.4 * strength, 0.18, master); // the skin
      hiss(t + 0.08, 'highpass', 2200, 0.35 * strength, 0.05, master); // the stick's crack
      hiss(t + 0.08, 'bandpass', 3400, 0.25 * strength, 0.03, master);
      send(g, 0.2);
    }

    // ---------- Putting it together ----------
    // Four bars: kicks per bar, the 808's notes (Sa Sa komal-Dha komal-Ni: E E C D), where the bass lands
    const KICKS = [[0, 6, 10], [0, 6, 10, 13], [0, 6, 10], [0, 3, 6, 10, 14]];
    const ROOTS = [0, 0, 3, 4];
    const BASS = { 0: 6, 6: 4, 10: 6 }; // step: length in steps

    const pick = (list, not) => {
      const choices = list.filter((item) => item !== not);
      return choices[Math.floor(Math.random() * choices.length)];
    };

    let section = 'intro'; // intro (tanpura and bansuri), break (and the tabla), drop (everything)
    let pending = null; // a section change waiting for the next beat
    let next = 0; // the time of the next unscheduled 16th
    let step = 0;
    let bar = 0;
    let riff = pick(RIFFS);
    let phrase = null;
    let rollAt = 12;
    let riser = null;

    function play(t) {
      const b = bar;
      const s = step;
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
        if (s % 2 === 0) BOLS[KEHERWA[s / 2]](t, 0.2); // the tabla keeps keherwa under the beat
        // Call and answer: the sitar's riff over bars 1-2, the bansuri's phrase over bars 3-4
        if (b < 2 && s % 2 === 0) {
          const degree = riff[b * 8 + s / 2];
          if (degree !== null) sitar(t, degree, 0.3, Math.random() < 0.25);
        }
        if (b === 2 && s === 0) bansuri(t, (phrase = pick(PHRASES, phrase)), 0.17);
        if (BASS[s]) bass(t, ROOTS[b], BASS[s] * STEP, s === 10 && ROOTS[(b + 1) % 4] !== ROOTS[b] ? ROOTS[(b + 1) % 4] : undefined);
      } else {
        // The bansuri sings a phrase every two bars; in a break the tabla plays along
        if (s === 0 && b % 2 === 0) bansuri(t, (phrase = pick(PHRASES, phrase)), 0.2);
        if (section === 'break' && s % 2 === 0) BOLS[KEHERWA[s / 2]](t, 0.24);
      }
    }

    // Schedule every 16th that starts before `until` (and the tanpura on its own slow round);
    // a pending change lands on a beat
    function scheduleUntil(until) {
      while (tanpuraAt < until) {
        tanpura(tanpuraAt);
        tanpuraAt += 0.9;
      }
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
            riff = pick(RIFFS, riff);
            rollAt = [12, 8, 12, 4][Math.floor(Math.random() * 4)];
          }
        }
      }
    }

    function begin(atTime, startSection) {
      next = atTime;
      tanpuraAt = atTime;
      step = 0;
      bar = 0;
      section = startSection;
      tanpuraTo(section === 'drop' ? 0.05 : 0.09, atTime);
    }

    // After the page was hidden: skip the missed notes instead of playing them all at once
    const resync = (t) => {
      if (next < t) next = t;
      if (tanpuraAt < t) tanpuraAt = t;
    };

    // The teaser's moments
    function cue(kind) {
      const t = Math.max(now(), next - STEP); // about now, on the grid
      if (kind === 'break') {
        pending = (at) => {
          section = 'break';
          step = 0;
          bar = 0;
          tanpuraTo(0.09, at);
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
          riff = pick(RIFFS, riff); // a new riff every round
          tanpuraTo(0.05, at);
          hiss(at, 'highpass', 4000, 0.22, 1.6, bus); // the crash
          for (let i = 0; i < 6; i++) sitar(at + i * 0.03, i, 0.2); // a run up the raga into it
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
        dhol(at, 0.7);
        beat('hit', at);
      } else if (kind === 'muffle') {
        muffle.frequency.setTargetAtTime(650, now(), 0.25);
      } else if (kind === 'open') {
        muffle.frequency.setTargetAtTime(18000, now(), 0.35);
      }
    }

    return { master, begin, scheduleUntil, cue, resync, pulses, swish: { ctx, noise, out: master } };
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
    live.master.gain.setTargetAtTime(0.72, t, 0.15); // headroom: the dhol and the 808 together peak high
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
        if (again) live.cue('break'); // a replay: back to the alaap
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
