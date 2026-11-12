// 새 캐릭터 안내: 처음 무기 고르기 → 들판 → 첫 사냥 → 스킬북 → 스킬 쓰기
import { STARTS, START_BONUS, BASES, WEAPON_CLASSES } from '../data/items.js';
import { ZONES } from '../data/world.js';
import { entranceOf } from '../data/dungeons.js';
import { SKILLS } from '../data/skills.js';
import { STAT_NAMES, STAT_COLORS } from '../data/config.js';
import { chooseStart } from '../game/player.js';
import { makeBook } from '../game/items.js';
import { addItem } from '../game/inventory.js';
import { itemIcon, skillIcon } from './icons.js';
import { audio } from '../engine/audio.js';
import { nextQuest, currentQuest, questKill, questDone, questNeed, goalText } from '../game/quests.js';

const $ = (s) => document.querySelector(s);
const KILLS = 3;
export const TUT_DONE = 99;

// 조작 안내: 하나씩 띄우고, 실제로 해 보면 다음으로. 휴대폰 · PC 문구가 다르다. (st.guide = 몇 번째까지 했나, 99 = 끔)
const touch = matchMedia('(pointer: coarse)').matches;
const COACH = [
  { id: 'move', t: touch ? '왼쪽 아래 조이스틱을 끌어 움직이세요' : '땅을 클릭하거나 WASD로 움직이세요', hi: touch ? '#joyZone' : null, done: (w, c) => c.moved > 6 },
  { id: 'attack', t: touch ? '몬스터 가까이에서 [공격]을 누르세요 (몬스터를 눌러도 됩니다)' : '몬스터를 클릭하면 공격합니다 (Space: 가까운 적)', hi: '#btnAttack', done: (w) => !!w.lastHit },
  { id: 'loot', t: '떨어진 금화 · 아이템 위로 걸어가면 줍습니다', done: (w, c) => c.picked },
  { id: 'potion', t: touch ? '체력이 줄면 빨간 물약을 누르세요' : '체력이 줄면 Q(체력) · E(마나) 물약', hi: '#btnHp', when: (w) => w.st.hp < w.d.maxHp * 0.7, done: (w, c) => c.potion },
  { id: 'skill', t: touch ? '오른쪽 스킬 칸을 눌러 스킬을 쓰세요' : '1~6 키로 스킬을 씁니다', hi: '#quick', when: (w) => Object.keys(w.st.skills).length > 0, done: (w) => w.skillUsed },
  { id: 'windows', t: touch ? '오른쪽 위 단추: 가방 · 스킬 · 능력 · 퀘스트 · 마을' : 'I 가방 · K 스킬 · C 능력 · J 퀘스트 · T 마을 · M 메뉴', hi: '.menuCol', ok: true },
  { id: 'auto', t: '[귀환]은 초소로 돌아가기, [자동]은 자동 사냥 (얻는 것이 조금 줄어듭니다)', hi: '#btnAuto', ok: true },
  // ── 첫 필드 보스를 잡은 뒤: 던전 → 마을 → 강화 → 해방 · 원정 → 매일 ──
  { id: 'dungeon', t: '보스가 던전 열쇠를 떨어뜨렸습니다! 푸리에 들판의 빛기둥이 선 던전 입구로 가세요', when: (w) => (w.st.rec?.bosses || 0) >= 1, done: (w) => !!w.dungeon, beacon: true },
  { id: 'dungeonBoss', t: '방을 지나 마지막 방의 우두머리를 쓰러뜨리세요 — 깨면 다음 단계가 열립니다', done: (w) => Object.keys(w.st.dungeons || {}).length > 0, when: (w) => !!w.dungeon || Object.keys(w.st.dungeons || {}).length > 0 },
  { id: 'town', t: touch ? '초소로 돌아가 [마을] 단추 → 빈터에 건물을 지으세요 (광산 · 약초밭은 꺼 둔 동안에도 생산)' : '초소로 돌아가 T(마을) → 빈터에 건물을 지으세요 (광산 · 약초밭은 꺼 둔 동안에도 생산)', hi: '[data-win="town"]', when: (w) => !w.dungeon, done: (w) => Object.keys(w.st.town?.plots || {}).length > 0 },
  { id: 'smithy', t: '대장간을 지으면 강화석으로 장비를 강화합니다 (+1마다 피해 · 방어 +8%)', ok: true },
  { id: 'liberate', t: '지역 몬스터를 계속 잡으면 해방됩니다 (왼쪽 위 지역 정보의 %). 해방한 곳에는 여관 용병을 원정 보내 재료를 얻습니다', ok: true },
  { id: 'daily', t: touch ? '[퀘스트] 창 맨 위: 오늘의 의뢰 3개 · 업적' : 'J(퀘스트) 창 맨 위: 오늘의 의뢰 3개 · 업적', hi: '[data-win="quest"]', ok: true },
];

class Coach {
  constructor(w) {
    this.w = w; this.c = { moved: 0, picked: false, potion: false }; this.last = null;
    this.el = document.createElement('div'); this.el.id = 'coach'; this.el.hidden = true;
    this.el.innerHTML = '<span class="ct"></span><button class="btn ok">확인</button><button class="btn skip">안내 끄기</button>';
    document.body.appendChild(this.el);
    this.el.querySelector('.ok').onclick = () => this.advance();
    this.el.querySelector('.skip').onclick = () => { this.w.st.guide = 99; this.hide(); };
    const pk = w.pickup.bind(w); w.pickup = (g) => { this.c.picked = true; return pk(g); };
    const up = w.usePotion.bind(w); w.usePotion = (k) => { const r = up(k); if (r) this.c.potion = true; return r; };
  }
  get step() { return COACH[this.w.st.guide || 0]; }
  advance() { this.w.st.guide = (this.w.st.guide || 0) + 1; audio.play('click'); this.hide(); }
  hide() { this.el.hidden = true; document.querySelectorAll('.coachHi').forEach((e) => e.classList.remove('coachHi')); }
  update() {
    const w = this.w, st = w.st;
    if (st.tut === 0 || (st.guide || 0) >= COACH.length) { if (!this.el.hidden) this.hide(); return; }
    const P = w.player.pos;
    if (this.last) this.c.moved += Math.hypot(P.x - this.last.x, P.z - this.last.z);
    this.last = { x: P.x, z: P.z };
    const s = this.step;
    if (s.when && !s.when(w)) { if (!this.el.hidden) this.hide(); return; }
    if (!s.ok && s.done(w, this.c)) { this.advance(); return; }
    if (s.beacon) {
      this.bT = (this.bT || 0) - 1 / 60;
      if (this.bT <= 0) {
        this.bT = 2.5;
        const e = entranceOf(ZONES[0]); // 첫 필드(푸리에 들판)의 던전
        w.fx.pillar(e.x, e.z, 0x80c0ff, 2.5, 8, 2);
      }
    }
    if (this.el.hidden || this.el.dataset.id !== s.id) {
      this.hide();
      this.el.dataset.id = s.id; this.el.querySelector('.ct').textContent = s.t;
      this.el.querySelector('.ok').hidden = !s.ok;
      this.el.hidden = false;
      if (s.hi) document.querySelector(s.hi)?.classList.add('coachHi');
    }
  }
}

export class Tutorial {
  constructor(world, windows) {
    this.w = world;
    this.windows = windows;
    this.box = $('#tutBox');
    this.pick = null;
    if (world.st.tut === 0) this.choose();
    this.box.onpointerdown = (e) => { e.preventDefault(); if (world.st.tut >= TUT_DONE) windows.show('quest'); };
    world.onKill = (m) => {
      const st = world.st;
      if (st.tut < TUT_DONE || !questKill(st, { type: m.type, tier: m.tier, zone: m.sp.zone?.id })) return;
      if (questDone(st)) { world.ui.toast(`퀘스트 완료 — ${currentQuest(st).name}`, '#ffd84a'); audio.play('rankup'); }
      this.show();
      world.ui.dirty();
    };
    this.coach = new Coach(world);
    this.show();
  }

  // 무기를 고르는 동안은 세상이 멈춘다
  get blocking() { return this.w.st.tut === 0; }

  choose() {
    const el = $('#startPick');
    const render = () => {
      el.querySelector('.cards4').innerHTML = Object.entries(STARTS).map(([id, k]) => {
        const b = BASES[k.base], cls = WEAPON_CLASSES[b.cls], sk = SKILLS[k.book];
        return `<button class="pickCard${this.pick === id ? ' on' : ''}" data-start="${id}">
          <img class="wp" src="${itemIcon({ base: k.base, rarity: 'common' })}" alt="" />
          <b>${b.name}</b><span class="note">${cls.name} · ${k.line}</span>
          <span class="st" style="color:${STAT_COLORS[k.stat]}">${STAT_NAMES[k.stat]} +${START_BONUS}</span>
          <span class="sk"><img src="${skillIcon(k.book)}" alt="" />${sk.name}</span></button>`;
      }).join('');
      el.querySelectorAll('[data-start]').forEach((b) => { b.onclick = () => { this.pick = b.dataset.start; audio.play('click'); render(); }; });
      $('#btnStartPick').disabled = !this.pick;
    };
    render();
    el.hidden = false;
    $('#btnStartPick').onclick = () => {
      if (!this.pick) return;
      const st = this.w.st;
      chooseStart(st, this.pick);
      st.tut = 1;
      el.hidden = true;
      this.w.refreshGear();
      st.hp = this.w.d.maxHp; st.mp = this.w.d.maxMp;
      audio.play('learn');
      this.w.fx.pillar(this.w.player.pos.x, this.w.player.pos.z, 0xffd860, 1.2);
      this.w.ui.dirty();
      this.show();
    };
  }

  goal() {
    const st = this.w.st;
    switch (st.tut) {
      case 1: return '남쪽 문을 지나 푸리에 들판으로';
      case 2: return `몬스터 처치  ${Math.min(KILLS, st.kills - (st.tutK || 0))} / ${KILLS}`;
      case 3: return '가방에서 스킬북 배우기';
      case 4: return '배운 스킬 쓰기';
      case TUT_DONE: {
        const q = nextQuest(st);
        if (!q) return '';
        return questDone(st) ? `${q.name} — 경비대장 하겐에게 보고` : `${goalText(q)}  ${st.quest.n} / ${questNeed(q)}`;
      }
      default: return '';
    }
  }

  show() {
    const t = this.goal();
    this.box.hidden = !t;
    if (t && this.box.lastChild.textContent !== t) this.box.lastChild.textContent = t;
  }

  next(n) {
    this.w.st.tut = n;
    audio.play('rankup');
    this.show();
  }

  update() {
    const w = this.w, st = w.st;
    this.coach.update();
    if (st.tut >= TUT_DONE) { this.show(); return; }
    if (st.tut === 0) return;
    if (st.tut === 1 && w.zone === 'field') { st.tutK = st.kills; this.next(2); }
    else if (st.tut === 2) {
      if (st.kills - st.tutK >= KILLS) {
        const id = STARTS[st.start]?.book || 'power_strike';
        if (addItem(st, makeBook(id, st))) {
          w.ui.toast(`스킬북 획득: ${SKILLS[id].name}`, '#ffd84a');
          w.ui.dirty();
          this.next(3);
        }
      } else this.show();
    } else if (st.tut === 3 && Object.keys(st.skills).length) { w.skillUsed = false; this.next(4); }
    else if (st.tut === 4 && w.skillUsed) {
      st.gold += 100;
      w.ui.toast('안내 완료 · 100 G', '#ffd84a');
      w.ui.dirty();
      this.next(TUT_DONE);
    }
  }
}
