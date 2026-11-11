// 소리: Flare(CC-BY-SA 3.0) 효과음 · 배경음악 (assets/sound). 효과음은 Web Audio로, 음악은 <audio>로 흘린다
const ROOT = 'assets/sound/';

// 게임 소리 이름 → 파일 (여럿이면 무작위). '@'는 몬스터 무리 소리 (play(name, k, 무리))
const SFX = {
  swing: ['melee_attack', 'melee_attack_2'], heavy: ['melee_attack_3'], spin: ['melee_attack_2', 'melee_attack_3'],
  hit: ['@hit'], crit: ['powers/spikes'], hurt: ['male_hit'], block: ['powers/block'], dodge: ['steps/step_cloth1', 'steps/step_cloth2'],
  shoot: ['powers/shoot'], magic: ['powers/shock'], cast: ['powers/teleport'], fire: ['powers/fireball'], boom: ['powers/burn', 'powers/quake'],
  zap: ['powers/thunder'], ice: ['powers/freeze'], slam: ['powers/quake'], heal: ['powers/heal'], buff: ['powers/warcry'],
  coin: ['inventory/inventory_coins'], pickup: ['flying_loot'], rare: ['inventory/inventory_gem'], potion: ['powers/potion'],
  awaken: ['level_up'], rankup: ['inventory/inventory_gem'], learn: ['inventory/inventory_page'], mdie: ['@die'], death: ['male_die'],
  recall: ['environment/teleporter'], click: ['widget_activate'], error: ['no_mana'], mattack: ['@phys'], mshoot: ['powers/shoot'],
  equip_metal: ['inventory/inventory_metal'], equip_leather: ['inventory/inventory_leather'], equip_cloth: ['inventory/inventory_cloth'], step: ['steps/step_leather1', 'steps/step_leather2', 'steps/step_leather3', 'steps/step_leather4'],
};
// 몬스터 무리별 소리 (없으면 해골)
const FAM = { antlion: 'antlion', fire_ant: 'antlion', ice_ant: 'antlion', goblin: 'goblin', hobgoblin: 'goblin', skeleton: 'skeleton', minotaur: 'minotaur', wyvern: 'wyvern', zombie: 'zombie', cursed: 'grave' };
export const familyOf = (sprite = '') => FAM[Object.keys(FAM).find((k) => sprite.startsWith(k))] || 'skeleton';
const famFile = (fam, kind) => {
  const has = { grave: ['attack', 'die', 'hit'] }[fam];
  if (fam === 'grave') return 'enemies/grave_' + (kind === 'phys' ? 'attack' : has.includes(kind) ? kind : 'hit');
  if (fam === 'goblin' && kind === 'phys') return 'enemies/goblin_phys';
  return `enemies/${fam}_${kind}`;
};

// 지역 → 곡
const MUSIC = {
  title: 'title', town: 'town', wild: 'overworld', field: 'overworld', forest: 'forest', grave: 'unrest', ruins: 'dungeon',
  swamp: 'magical', frost: 'wind_ambient', valley: 'battle', inferno: 'cave', boss: 'boss',
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.6;
    this.sfxVolume = 0.8;
    this.buffers = new Map();
    this.last = {};
    this.want = 'title';
    this.cur = null;     // 지금 곡 { name, el }
    this.female = false;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); this.cur?.el.play().catch(() => {}); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.out = this.ctx.createGain();
    this.out.gain.value = this.sfxVolume;
    this.out.connect(this.ctx.destination);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.ctx.suspend(); this.cur?.el.pause(); } else { this.ctx.resume(); this.cur?.el.play().catch(() => {}); }
    });
    // 자주 쓰는 것은 미리 받는다
    for (const n of ['swing', 'hit', 'click', 'coin', 'pickup', 'hurt']) for (const f of SFX[n]) if (f[0] !== '@') this.load(f);
    this.setMusic(this.want, true);
  }

  load(file) {
    if (!this.buffers.has(file)) {
      this.buffers.set(file, fetch(ROOT + file + '.ogg').then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).catch(() => null));
    }
    return this.buffers.get(file);
  }

  setVolumes(music, sfx) {
    this.musicVolume = music; this.sfxVolume = sfx;
    if (this.out) this.out.gain.value = sfx;
    if (this.cur) this.cur.el.volume = music * 0.7;
  }

  // 곡 바꾸기: 지금 곡을 줄이며 새 곡을 키운다
  setMusic(name, force = false) {
    const track = MUSIC[name] || MUSIC.wild;
    this.want = name;
    if (!this.ctx) return;
    if (!force && this.cur?.track === track) return;
    const old = this.cur;
    const el = new window.Audio(ROOT + 'music/' + track + '.ogg');
    el.loop = true;
    el.volume = 0;
    el.play().catch(() => {});
    this.cur = { track, el };
    const target = () => this.musicVolume * 0.7;
    let t = 0;
    const step = () => {
      t += 0.05;
      const k = Math.min(1, t / 1.5);
      if (this.cur?.el === el) el.volume = target() * k;
      if (old) old.el.volume = Math.max(0, old.el.volume * (1 - k));
      if (k < 1) setTimeout(step, 50);
      else if (old) { old.el.pause(); old.el.src = ''; }
    };
    step();
  }

  gate(name, gap) {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    const t = this.ctx.currentTime;
    if (this.last[name] && t - this.last[name] < gap) return false;
    this.last[name] = t;
    return true;
  }

  // name: 소리 이름 · k: 크기 · fam: 몬스터 무리 (hit · mdie · mattack)
  play(name, k = 1, fam = 'skeleton') {
    const list = SFX[name];
    if (!list || !this.gate(name + fam, name === 'hit' ? 0.05 : name === 'step' ? 0.25 : 0.03)) return;
    let file = list[Math.floor(Math.random() * list.length)];
    if (file[0] === '@') file = famFile(fam, file.slice(1));
    if (name === 'hurt' && this.female) file = 'female_hit';
    if (name === 'death' && this.female) file = 'female_die';
    this.load(file).then((buf) => {
      if (!buf) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.94 + Math.random() * 0.12;
      const g = this.ctx.createGain();
      g.gain.value = Math.min(1.5, k);
      src.connect(g).connect(this.out);
      src.start();
    });
  }
}

export const audio = new Audio();
