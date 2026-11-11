// 새 캐릭터 안내: 처음 무기 고르기 → 들판 → 첫 사냥 → 스킬북 → 스킬 쓰기
import { STARTS, START_BONUS, BASES, WEAPON_CLASSES } from '../data/items.js';
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
