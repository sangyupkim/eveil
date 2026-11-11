// 소리: 효과음과 배경음을 모두 Web Audio로 즉석 합성한다 (외부 음원 없음 → 라이선스 걱정 없음).
// 배경음은 지역마다 다른 음계 · 화음 진행 · 악기 구성으로 끝없이 새로 만들어진다.
// 브라우저 정책상 첫 터치/클릭 뒤에 켜진다.

const SCALES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};

// 지역별 곡의 성격
const THEMES = {
  title: { root: 50, scale: 'aeolian', bpm: 58, prog: [0, 5, 3, 4], pad: 0.5, lute: 0.0, bell: 0.35, drum: 0, choir: 0.3, density: 0.35 },
  town: { root: 50, scale: 'dorian', bpm: 76, prog: [0, 3, 6, 4], pad: 0.35, lute: 0.55, bell: 0.15, drum: 0, choir: 0, density: 0.6 },
  field: { root: 45, scale: 'aeolian', bpm: 66, prog: [0, 5, 6, 4], pad: 0.45, lute: 0.35, bell: 0.2, drum: 0.15, choir: 0, density: 0.45 },
  forest: { root: 47, scale: 'dorian', bpm: 60, prog: [0, 6, 5, 6], pad: 0.55, lute: 0.15, bell: 0.35, drum: 0, choir: 0.15, density: 0.35 },
  grave: { root: 46, scale: 'phrygian', bpm: 54, prog: [0, 1, 0, 6], pad: 0.6, lute: 0, bell: 0.45, drum: 0.1, choir: 0.4, density: 0.3 },
  ruins: { root: 43, scale: 'harmonic', bpm: 84, prog: [0, 5, 4, 4], pad: 0.45, lute: 0.1, bell: 0.15, drum: 0.6, choir: 0.25, density: 0.45 },
  boss: { root: 41, scale: 'harmonic', bpm: 112, prog: [0, 5, 1, 4], pad: 0.5, lute: 0, bell: 0.2, drum: 1, choir: 0.45, density: 0.6 },
  wild: { root: 45, scale: 'aeolian', bpm: 60, prog: [0, 3, 5, 4], pad: 0.5, lute: 0.15, bell: 0.25, drum: 0, choir: 0.1, density: 0.3 },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.6;
    this.sfxVolume = 0.8;
    this.theme = null;
    this.want = 'title';
    this.last = {};
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVolume * 0.55;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume;
    this.sfxBus.connect(this.master);
    // 잔향: 잡음으로 만든 임펄스 응답
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(3.2, 2.6);
    this.verbOut = ctx.createGain();
    this.verbOut.gain.value = 0.55;
    this.verb.connect(this.verbOut).connect(this.master);
    this.sfxVerb = ctx.createGain();
    this.sfxVerb.gain.value = 0.25;
    this.sfxVerb.connect(this.verb);
    // 배경음 메아리 (지연)
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    this.delay.connect(dl).connect(fb).connect(this.delay);
    dl.connect(this.musicBus);
    this.noise = this.makeNoise();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
    this.startScheduler();
    this.setMusic(this.want, true);
  }

  setVolumes(music, sfx) {
    this.musicVolume = music; this.sfxVolume = sfx;
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(music * 0.55, this.ctx.currentTime, 0.1);
    this.sfxBus.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.1);
  }

  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  makeNoise() {
    const ctx = this.ctx, len = ctx.sampleRate * 2;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // ───────── 배경음 ─────────

  setMusic(name, force = false) {
    this.want = name;
    if (!this.ctx) return;
    if (!force && this.themeName === name) return;
    this.themeName = name;
    const t = THEMES[name] || THEMES.wild;
    // 부드럽게 넘어가기: 기존 층은 페이드 아웃
    const now = this.ctx.currentTime;
    if (this.layer) { const old = this.layer; old.gain.setTargetAtTime(0, now, 0.8); setTimeout(() => old.disconnect(), 4000); }
    this.layer = this.ctx.createGain();
    this.layer.gain.value = 0;
    this.layer.gain.setTargetAtTime(1, now + 0.3, 1.2);
    this.layer.connect(this.musicBus);
    this.layerVerb = this.ctx.createGain();
    this.layerVerb.gain.value = 0.7;
    this.layer.connect(this.layerVerb).connect(this.verb);
    this.theme = t;
    this.bar = 0;
    this.step = 0;
    this.nextTime = now + 0.4;
    this.melodyDeg = 7;
  }

  startScheduler() {
    setInterval(() => {
      if (!this.ctx || !this.theme || this.ctx.state !== 'running') return;
      while (this.nextTime < this.ctx.currentTime + 0.25) {
        this.playStep(this.nextTime);
        this.nextTime += 60 / this.theme.bpm / 2; // 8분음표 단위
      }
    }, 60);
  }

  // 음계의 n번째 음 (옥타브 넘어감 포함)
  note(deg, oct = 0) {
    const t = this.theme, sc = SCALES[t.scale];
    const o = Math.floor(deg / 7);
    const i = ((deg % 7) + 7) % 7;
    return t.root + sc[i] + 12 * (o + oct);
  }

  playStep(time) {
    const t = this.theme;
    const s = this.step % 16; // 한 마디 = 8분음표 16개 (2마디 화음)
    if (s === 0) this.chordDeg = t.prog[this.bar++ % t.prog.length];
    const beat = 60 / t.bpm;
    const c = this.chordDeg;
    // 화음 바탕(패드): 마디 시작마다 길게
    if (s === 0 && t.pad) {
      for (const d of [c, c + 2, c + 4]) this.pad(mtof(this.note(d, 0)), time, beat * 8.2, t.pad);
      this.pad(mtof(this.note(c, -1)), time, beat * 8.2, t.pad * 0.9, 'sine');
    }
    // 합창 같은 숨소리
    if (s === 0 && t.choir && Math.random() < 0.7) this.choir(mtof(this.note(c + 4, 1)), time, beat * 7, t.choir);
    // 류트 아르페지오
    if (t.lute && (s % 2 === 0) && Math.random() < 0.85) {
      const arp = [c, c + 2, c + 4, c + 7, c + 4, c + 2, c, c + 4];
      this.pluck(mtof(this.note(arp[(s / 2) % arp.length], 0)), time, t.lute * 0.6);
    }
    // 멜로디: 음계 위를 걷는다 (가끔 쉰다)
    if (s % 2 === 0 && Math.random() < t.density) {
      this.melodyDeg += [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)];
      if (this.melodyDeg < 4) this.melodyDeg += 2;
      if (this.melodyDeg > 13) this.melodyDeg -= 3;
      const f = mtof(this.note(this.melodyDeg, 0));
      if (t.bell) this.bell(f, time, t.bell * 0.5);
      else this.pluck(f * 2, time, 0.25);
    }
    // 북
    if (t.drum) {
      if (s === 0 || s === 8 || (t.drum > 0.5 && (s === 6 || s === 14))) this.drum(time, t.drum, 55);
      if (t.drum > 0.5 && (s === 4 || s === 12)) this.drum(time, t.drum * 0.6, 90);
      if (t.drum > 0.8 && s % 2 === 1 && Math.random() < 0.4) this.tick(time, 0.12);
    }
    this.step++;
  }

  pad(freq, time, dur, vol, type = 'sawtooth') {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, time);
    f.frequency.linearRampToValueAtTime(900, time + dur * 0.5);
    f.frequency.linearRampToValueAtTime(400, time + dur);
    f.Q.value = 0.6;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.05 * vol, time + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, time + dur);
    for (const det of [-7, 6]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(f);
      o.start(time); o.stop(time + dur + 0.1);
    }
    f.connect(g).connect(this.layer);
  }

  choir(freq, time, dur, vol) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.5 * vol, time + dur * 0.4);
    g.gain.linearRampToValueAtTime(0, time + dur);
    for (const h of [1, 2, 3]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = freq * h; bp.Q.value = 40;
      src.connect(bp).connect(g);
    }
    g.connect(this.layer);
    src.start(time); src.stop(time + dur + 0.1);
  }

  pluck(freq, time, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'square'; o2.frequency.value = freq * 2;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(3200, time); f.frequency.exponentialRampToValueAtTime(500, time + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.09 * vol, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 1.1);
    const g2 = ctx.createGain(); g2.gain.value = 0.08;
    o.connect(f); o2.connect(g2).connect(f);
    f.connect(g).connect(this.layer);
    g.connect(this.delay);
    o.start(time); o2.start(time); o.stop(time + 1.2); o2.stop(time + 1.2);
  }

  bell(freq, time, vol) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.1 * vol, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 3);
    for (const [r, a] of [[1, 1], [2.76, 0.4], [5.4, 0.2]]) {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = freq * r;
      const og = ctx.createGain(); og.gain.value = a;
      o.connect(og).connect(g);
      o.start(time); o.stop(time + 3.1);
    }
    g.connect(this.layer);
    g.connect(this.delay);
  }

  drum(time, vol, f0 = 55) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0 * 2.2, time);
    o.frequency.exponentialRampToValueAtTime(f0, time + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.5 * vol, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);
    o.connect(g).connect(this.layer);
    o.start(time); o.stop(time + 0.65);
  }

  tick(time, vol) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.3, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    src.connect(f).connect(g).connect(this.layer);
    src.start(time, Math.random()); src.stop(time + 0.06);
  }

  // ───────── 효과음 ─────────

  // 같은 소리가 한 순간에 너무 많이 겹치지 않게
  gate(name, gap = 0.03) {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    const t = this.ctx.currentTime;
    if (this.last[name] && t - this.last[name] < gap) return false;
    this.last[name] = t;
    return true;
  }

  out(g, verb = 0.3) {
    g.connect(this.sfxBus);
    if (verb) { const v = this.ctx.createGain(); v.gain.value = verb; g.connect(v).connect(this.sfxVerb); }
  }

  noiseHit({ t = this.ctx.currentTime, dur = 0.2, type = 'bandpass', f0 = 1200, f1 = 400, q = 1, vol = 0.5, verb = 0.2 }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g);
    this.out(g, verb);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }

  tone({ t = this.ctx.currentTime, type = 'sine', f0 = 440, f1 = f0, dur = 0.3, vol = 0.3, attack = 0.005, verb = 0.3 }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    this.out(g, verb);
    o.start(t); o.stop(t + dur + 0.05);
  }

  play(name, k = 1) {
    if (!this.gate(name, name === 'hit' ? 0.04 : 0.025)) return;
    const t = this.ctx.currentTime;
    const v = (x) => x * k;
    switch (name) {
      case 'swing': this.noiseHit({ dur: 0.18, f0: 600 + Math.random() * 300, f1: 2400, q: 2, vol: v(0.18), verb: 0.05 }); break;
      case 'heavy': this.noiseHit({ dur: 0.3, f0: 300, f1: 1400, q: 1.5, vol: v(0.3), verb: 0.1 }); break;
      case 'hit': // 뼈에 맞는 소리: 짧은 딱 + 둔탁함
        this.noiseHit({ dur: 0.07, type: 'bandpass', f0: 2500 + Math.random() * 1500, f1: 1200, q: 4, vol: v(0.45), verb: 0.1 });
        this.tone({ type: 'triangle', f0: 180, f1: 70, dur: 0.12, vol: v(0.35), verb: 0 });
        break;
      case 'crit':
        this.play('hit', 1.2);
        this.tone({ type: 'square', f0: 1800, f1: 900, dur: 0.25, vol: v(0.08), verb: 0.5 });
        this.tone({ type: 'sine', f0: 2600, f1: 2500, dur: 0.6, vol: v(0.1), verb: 0.6 });
        break;
      case 'hurt':
        this.tone({ type: 'sawtooth', f0: 140, f1: 60, dur: 0.18, vol: v(0.22), verb: 0 });
        this.noiseHit({ dur: 0.12, type: 'lowpass', f0: 900, f1: 200, vol: v(0.3), verb: 0 });
        break;
      case 'block': this.tone({ type: 'square', f0: 900, f1: 700, dur: 0.15, vol: v(0.12) }); this.tone({ type: 'sine', f0: 1800, f1: 1750, dur: 0.5, vol: v(0.12), verb: 0.5 }); break;
      case 'dodge': this.noiseHit({ dur: 0.2, f0: 2000, f1: 600, q: 3, vol: v(0.12), verb: 0 }); break;
      case 'shoot': // 석궁 시위
        this.tone({ type: 'triangle', f0: 320, f1: 180, dur: 0.12, vol: v(0.3), verb: 0.05 });
        this.noiseHit({ dur: 0.15, f0: 3000, f1: 900, q: 2, vol: v(0.15), verb: 0 });
        break;
      case 'magic': // 기본 마법탄
        this.tone({ type: 'sine', f0: 500, f1: 1100, dur: 0.22, vol: v(0.16), verb: 0.5 });
        this.tone({ type: 'triangle', f0: 1000, f1: 2200, dur: 0.2, vol: v(0.06), verb: 0.5 });
        break;
      case 'cast':
        this.tone({ type: 'sine', f0: 300, f1: 900, dur: 0.45, vol: v(0.16), attack: 0.08, verb: 0.7 });
        this.noiseHit({ dur: 0.45, f0: 800, f1: 4000, q: 6, vol: v(0.1), verb: 0.6 });
        break;
      case 'fire':
        this.noiseHit({ dur: 0.35, type: 'lowpass', f0: 2500, f1: 300, vol: v(0.3), verb: 0.3 });
        break;
      case 'boom':
        this.tone({ type: 'sine', f0: 120, f1: 30, dur: 0.8, vol: v(0.6), verb: 0.3 });
        this.noiseHit({ dur: 0.9, type: 'lowpass', f0: 3000, f1: 80, vol: v(0.55), verb: 0.5 });
        break;
      case 'zap':
        for (let i = 0; i < 4; i++) this.noiseHit({ t: t + i * 0.035, dur: 0.06, type: 'highpass', f0: 3000, f1: 2000, vol: v(0.25), verb: 0.3 });
        this.tone({ type: 'sawtooth', f0: 1600, f1: 200, dur: 0.25, vol: v(0.08), verb: 0.3 });
        break;
      case 'ice':
        for (let i = 0; i < 5; i++) this.tone({ t: t + i * 0.04, type: 'sine', f0: 2000 + Math.random() * 2500, f1: 1800, dur: 0.6, vol: v(0.07), verb: 0.8 });
        this.noiseHit({ dur: 0.7, type: 'highpass', f0: 5000, f1: 2000, vol: v(0.2), verb: 0.6 });
        break;
      case 'spin': this.noiseHit({ dur: 0.45, f0: 400, f1: 2600, q: 2, vol: v(0.3), verb: 0.1 }); break;
      case 'slam':
        this.tone({ type: 'sine', f0: 90, f1: 35, dur: 0.6, vol: v(0.6), verb: 0.2 });
        this.noiseHit({ dur: 0.5, type: 'lowpass', f0: 1500, f1: 100, vol: v(0.4), verb: 0.3 });
        break;
      case 'heal': [0, 4, 7, 12].forEach((s, i) => this.tone({ t: t + i * 0.07, type: 'sine', f0: 660 * Math.pow(2, s / 12), dur: 0.9, vol: v(0.09), verb: 0.8 })); break;
      case 'buff': [0, 7, 12].forEach((s, i) => this.tone({ t: t + i * 0.05, type: 'triangle', f0: 330 * Math.pow(2, s / 12), dur: 0.8, vol: v(0.1), verb: 0.7 })); break;
      case 'coin': this.tone({ type: 'square', f0: 1900, dur: 0.08, vol: v(0.06), verb: 0.2 }); this.tone({ t: t + 0.07, type: 'square', f0: 2500, dur: 0.25, vol: v(0.06), verb: 0.3 }); break;
      case 'pickup': this.tone({ type: 'triangle', f0: 600, f1: 900, dur: 0.12, vol: v(0.15), verb: 0.1 }); break;
      case 'rare': [0, 5, 9, 12, 17].forEach((s, i) => this.tone({ t: t + i * 0.06, type: 'sine', f0: 880 * Math.pow(2, s / 12), dur: 1.2, vol: v(0.08), verb: 0.9 })); break;
      case 'potion':
        for (let i = 0; i < 3; i++) this.tone({ t: t + i * 0.08, type: 'sine', f0: 300 + i * 60, f1: 600 + i * 80, dur: 0.07, vol: v(0.15), verb: 0 });
        break;
      case 'awaken':
        [0, 7, 12, 16, 19, 24].forEach((s, i) => this.tone({ t: t + i * 0.09, type: 'triangle', f0: 262 * Math.pow(2, s / 12), dur: 2.4, vol: v(0.1), attack: 0.05, verb: 1 }));
        this.tone({ type: 'sine', f0: 65, f1: 65, dur: 2.5, vol: v(0.25), attack: 0.2, verb: 0.5 });
        break;
      case 'rankup': [0, 4, 7].forEach((s, i) => this.tone({ t: t + i * 0.08, type: 'triangle', f0: 523 * Math.pow(2, s / 12), dur: 0.8, vol: v(0.09), verb: 0.7 })); break;
      case 'learn': [0, 3, 7, 10, 14].forEach((s, i) => this.tone({ t: t + i * 0.1, type: 'sine', f0: 392 * Math.pow(2, s / 12), dur: 1.4, vol: v(0.09), verb: 0.9 })); break;
      case 'mdie': // 해골이 무너지는 소리
        for (let i = 0; i < 6; i++) this.noiseHit({ t: t + i * 0.045 + Math.random() * 0.03, dur: 0.05, f0: 1800 + Math.random() * 2500, f1: 1000, q: 5, vol: v(0.22), verb: 0.15 });
        break;
      case 'death':
        this.tone({ type: 'sawtooth', f0: 220, f1: 40, dur: 2.2, vol: v(0.2), attack: 0.05, verb: 0.8 });
        this.tone({ type: 'sine', f0: 110, f1: 30, dur: 2.5, vol: v(0.3), verb: 0.6 });
        break;
      case 'recall': this.tone({ type: 'sine', f0: 200, f1: 1600, dur: 1.4, vol: v(0.12), attack: 0.3, verb: 0.9 }); break;
      case 'click': this.tone({ type: 'triangle', f0: 1200, f1: 900, dur: 0.05, vol: v(0.08), verb: 0 }); break;
      case 'error': this.tone({ type: 'square', f0: 180, f1: 150, dur: 0.15, vol: v(0.07), verb: 0 }); break;
      case 'mattack': this.noiseHit({ dur: 0.15, f0: 500, f1: 1800, q: 2, vol: v(0.1), verb: 0 }); break;
      case 'mshoot': this.tone({ type: 'sawtooth', f0: 300, f1: 600, dur: 0.25, vol: v(0.06), verb: 0.4 }); break;
    }
  }
}

export const audio = new Audio();
