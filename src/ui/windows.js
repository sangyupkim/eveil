import { bagSize } from '../game/inventory.js';
// 창: 가방(장비) · 스킬 · 능력(스탯/성향) · 상점 · 메뉴
import { STATS, STAT_NAMES, STAT_COLORS, STAT_DESC, CONFIG } from '../data/config.js';
import { SKILLS, BOOK_TIERS } from '../data/skills.js';
import { BASES, SLOTS, SLOT_NAMES, RARITY, WEAPON_CLASSES, isTwoHandedBase } from '../data/items.js';
import { itemName, itemColor, itemValue, affixText, isBook, makeItem } from '../game/items.js';
import { scaledArmor, scaledDmg, totalStats, derive } from '../game/player.js';
import { addItem } from '../game/inventory.js';
import { skillExpNeeded, skillValues, meetsReq } from '../game/skills.js';
import { expNeeded } from '../game/growth.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

import { itemIcon, skillIcon, portrait, chestIcon, bookIcon, coinIcon, scrollIcon, townIcon, oreIcon } from './icons.js';
import { terrain, fogCan, MAP_R, MAP_W, FOG_C, seen as seenAt } from './mapimg.js';
import { CAMPS, inCamp } from '../engine2d/stage.js';
import { TIER_NAMES } from '../world/world.js';
import { entranceOf } from '../data/dungeons.js';
import { MATERIALS, SETS, SET_SLOTS, craftCost, upgradeMats } from '../data/crafting.js';
import { craft, craftZones, setCounts, setBase, isLiberated, LIBERATE_NEED, researchStart, researchLv, mercGear, hireWorker, assignWorker, freeWorkers, salvage, salvageValue, reforge, reforgeCost } from '../game/town.js';
import { RESEARCH, researchCost, workerCost, WORKER_MAX } from '../data/buildings.js';
import { AFFIXES } from '../data/items.js';
import { PLOTS, BUILDINGS, EXPEDITIONS, townOf, buildingAt, build, upgrade, collect, enhance, enhanceCap, enhanceCost, hire, mercSlots, dispatch, claim, tick } from '../game/town.js';
import { mercCost } from '../data/buildings.js';
import { QUESTS, QUEST_BOOKS } from '../data/quests.js';
import { ZONES, MONSTERS } from '../data/world.js';
import { nextQuest, questDone, questNeed, goalText, questTurnIn } from '../game/quests.js';
import { audio } from '../engine/audio.js';
import { cloud } from '../net/cloud.js';
import { takeOne } from '../game/inventory.js';
import { uiSettings, applyUi, editUi } from './layout.js';

import { TITLE_AT, titleKey, titleName, UNIQUES, perkChoices } from '../data/titles.js';
import { VARIANTS, variantSlots } from '../game/skills.js';
import { SCHOOL_NAMES } from '../data/skills.js';
import { GEMS, GEM_GRADES } from '../data/legends.js';
import { GAME_VERSION, PATCH_NOTES } from '../data/patchnotes.js';
import { KEY_ACTIONS, keyMap, keyName } from '../data/keys.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { dailyOf, dailyText, dailyReward } from '../game/daily.js';
// 스탯 오각형: 내가 어느 쪽으로 컸나
const pentagon = (stats) => {
  const mx = Math.max(...STATS.map((k) => stats[k])) || 1, pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`; };
  const grid = [1, 0.66, 0.33].map((k) => `<polygon points="${STATS.map((_, i) => pt(i, 40 * k)).join(' ')}" fill="none" stroke="rgba(217,182,106,.25)"/>`).join('');
  const shape = `<polygon points="${STATS.map((k, i) => pt(i, 40 * Math.max(0.08, stats[k] / mx))).join(' ')}" fill="rgba(255,200,90,.35)" stroke="#e8c36a" stroke-width="1.2"/>`;
  const labels = STATS.map((k, i) => { const [x, y] = pt(i, 48).split(','); return `<text x="${x}" y="${y}" fill="${STAT_COLORS[k]}" font-size="8" text-anchor="middle" dominant-baseline="middle">${STAT_NAMES[k]}</text>`; }).join('');
  return `<svg class="penta" viewBox="0 0 100 100">${grid}${shape}${labels}</svg>`;
};
// 패치 노트 창 (새 버전이면 처음 한 번 저절로)
export function showNotes() {
  let el = document.getElementById('notes');
  if (!el) { el = document.createElement('div'); el.id = 'notes'; document.body.appendChild(el); }
  el.innerHTML = `<div class="nbox"><button class="btn nclose">닫기</button>${PATCH_NOTES.map((n) => `<h2>${n.ver} <small>${n.date}</small></h2><p>${n.head}</p><ol>${n.items.map((x) => `<li>${x}</li>`).join('')}</ol>`).join('')}</div>`;
  el.hidden = false;
  el.querySelector('.nclose').onclick = () => { el.hidden = true; };
}
const repickCost = (t) => 2000 * (t.tier + 1) ** 2;
const nextTitle = (st) => { const i = TITLE_AT.findIndex((n) => st.awakenings < n); return i < 0 ? '' : ` · ${titleName(titleKey(st.stats), i)}까지 각성 ${TITLE_AT[i] - st.awakenings}`; };
const TITLES = { map: '월드맵', inv: '가방 · 장비', skills: '스킬', char: '능력 · 성향', quest: '퀘스트', dex: '도감 · 기록', town: '마을', shop: '상점', guide: '가이드북', menu: '메뉴' };
const TAB_ORDER = ['map', 'inv', 'skills', 'char', 'quest', 'dex', 'town', 'shop', 'guide', 'menu'];
const rar = (it) => (it.rarity && it.rarity !== 'common' ? ` r-${it.rarity}` : '');
const ico = (it) => `<img src="${itemIcon(it)}" alt="" draggable="false" />`;
const sicon = (id) => `<div class="sicon" style="background:radial-gradient(circle at 35% 30%, ${SKILLS[id].color}, #17111f 90%)"><img src="${skillIcon(id)}" alt="" /></div>`;

export class Windows {
  constructor(world, save) {
    this.w = world;
    this.save = save;
    this.el = $('#window');
    this.kind = null;
    this.sel = null;     // 선택한 아이템 { from: 'inv'|'equip', uid|slot }
    this.skillSel = null;
    $('.close', this.el).onclick = () => { audio.play('click'); this.close(); };
  }

  get open() { return !this.el.hidden; }

  toggle(kind) {
    if (this.open && this.kind === kind) this.close();
    else this.show(kind);
  }

  show(kind) {
    if (kind === 'shop' && !this.w.canShop) { this.w.ui.toast('상점은 마을에서만 이용할 수 있습니다'); audio.play('error'); return; }
    if (this.kind !== kind) this.sel = null;
    this.kind = kind;
    this.el.hidden = false;
    audio.play('click');
    this.render();
  }

  close() {
    this.waitKey = null;
    this.portalAt = null;
    this.el.hidden = true;
    this.kind = null;
    this.sel = null;
  }

  refresh() { if (this.open) this.render(); }

  render() {
    $('h2', this.el).textContent = TITLES[this.kind];
    const icons = { inv: chestIcon(), skills: bookIcon(), char: portrait(this.w.st.look), shop: coinIcon(), quest: scrollIcon(), town: townIcon(), dex: bookIcon(), map: scrollIcon(), guide: bookIcon() };
    const tabs = $('.tabs', this.el);
    tabs.innerHTML = TAB_ORDER.filter((k) => k !== 'shop' || this.w.canShop).map((k) =>
      `<button class="tab${k === this.kind ? ' on' : ''}" data-tab="${k}">${icons[k] ? `<img src="${icons[k]}" alt="" />` : '<b class="gear" style="width:1.8em;height:1.8em"></b>'}<span>${TITLES[k].split(' ')[0]}</span></button>`).join('');
    tabs.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => this.show(b.dataset.tab); });
    const body = $('.body', this.el);
    // 다시 그려도 스크롤 위치는 지킨다
    const keep = [...body.querySelectorAll('.frame')].map((f) => f.scrollTop);
    body.innerHTML = this[this.kind]();
    const wc = body.querySelector('.wmc');
    if (wc) { const g = wc.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(terrain, 0, 0, wc.width, wc.height); g.imageSmoothingEnabled = true; g.drawImage(fogCan, 0, 0, wc.width, wc.height); }
    body.querySelectorAll('.frame').forEach((f, i) => { f.scrollTop = keep[i] || 0; });
    this.bind(body);
    body.querySelectorAll('[data-keyedit]').forEach((b) => { b.onclick = () => { this.keyEdit = !this.keyEdit; this.waitKey = null; this.render(); }; });
    body.querySelectorAll('[data-bind]').forEach((b) => { b.onclick = () => { this.waitKey = b.dataset.bind; this.render(); }; });
    body.querySelectorAll('[data-keyreset]').forEach((b) => { b.onclick = () => { this.w.st.settings.keys = {}; this.waitKey = null; this.render(); }; });
    body.querySelectorAll('[data-gsec]').forEach((b) => { b.onclick = () => { this.gsec = +b.dataset.gsec; audio.play('click'); this.render(); }; });
  }

  cur() {
    const st = this.w.st;
    if (this.sel?.from === 'equip') return st.equip[this.sel.slot];
    if (this.sel?.from === 'inv') return st.inv.find((x) => x.uid === this.sel.uid) || null;
    return null;
  }

  // ───── 아이템 설명 ─────
  describe(it, where) {
    const st = this.w.st;
    if (!it) return '<div class="note">고른 아이템이 없습니다</div>';
    const b = BASES[it.base];
    let h = `<img class="bigico" src="${isBook(it) ? skillIcon(it.book) : itemIcon(it)}" alt="" /><div class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</div>`;
    if (isBook(it)) {
      const sk = SKILLS[it.book];
      h += `<div class="sub">${BOOK_TIERS[sk.tier].name} 스킬북 · MP ${sk.mp} · 재사용 ${sk.cd}초</div><div>${sk.desc}</div>`;
      h += reqLine(sk.req, totalStats(st));
      if (st.skills[it.book]) h += `<div class="aff">아는 스킬 — 숙련 EXP로 흡수</div>`;
    } else if (b.type === 'gem') {
      h += `<div class="sub">보석 ×${it.qty}</div><div>${STAT_NAMES[GEMS[b.gem].stat]} +${GEM_GRADES[b.grade].v} (구멍 있는 장비를 골라 박기)</div>`;
    } else if (b.type === 'key') {
      h += `<div class="sub">×${it.qty}</div><div>지역의 빛나는 원(던전 입구)에서 하나 써서 들어갑니다</div>`;
    } else if (b.type === 'potion') {
      h += `<div class="sub">소모품 ×${it.qty}</div><div>${b.restore.hp ? `HP ${b.restore.hp} 회복` : `MP ${b.restore.mp} 회복`}</div>`;
    } else {
      h += `<div class="sub">${RARITY[it.rarity].name} ${SLOT_NAMES[b.slot]} · 아이템 레벨 ${it.ilvl}</div>`;
      if (b.dmg) { const d = scaledDmg(it); h += `<div>${WEAPON_CLASSES[b.cls].name} · 피해 ${d[0]}~${d[1]} · 속도 ${b.speed}</div><div class="sub">주 스탯 ${STAT_NAMES[WEAPON_CLASSES[b.cls].ap]}</div>`; }
      if (b.armor) h += `<div>방어력 ${scaledArmor(it)}</div>`;
      if (b.block) h += `<div>막기 확률 ${Math.round(b.block * 100)}%</div>`;
      if (b.mods) for (const k in b.mods) h += `<div>${k === 'maxMp' ? '최대 MP' : k} +${b.mods[k]}</div>`;
      for (const a of it.affixes) h += `<div class="aff">${affixText(a)}</div>`;
      if (it.unique != null) h += `<div class="aff" style="color:#41e07a">◆ ${UNIQUES[it.unique].text}</div>`;
      if (it.sockets) {
        h += `<div class="aff" style="color:#c0b0ff">구멍 ${it.gems.length} / ${it.sockets}${it.gems.map((g) => ` · ${BASES[g].name} ${STAT_NAMES[GEMS[BASES[g].gem].stat]} +${GEM_GRADES[BASES[g].grade].v}`).join('')}</div>`;
        const gems = it.gems.length < it.sockets ? this.w.st.inv.filter((x) => BASES[x.base]?.type === 'gem') : [];
        if (gems.length && where !== 'none') h += `<div class="btns" style="flex-wrap:wrap">${gems.map((x) => `<button class="btn" data-socket="${x.base}">${BASES[x.base].name} 박기</button>`).join('')}</div>`;
      }
      if (it.set) {
        const s = SETS[it.set], n = setCounts(this.w.st.equip)[it.set] || 0;
        const fx = (b) => Object.entries(b).map(([k, v]) => AFFIXES[k].text.replace('{v}', v)).join(' · ');
        h += `<div class="aff" style="color:#7fe07a">${s.name} 세트 (${n}/4)</div><div class="note" style="color:${n >= 2 ? '#7fe07a' : '#888'}">2: ${fx(s.b2)}</div><div class="note" style="color:${n >= 4 ? '#7fe07a' : '#888'}">4: ${fx(s.b4)}</div>`;
      }
      h += reqLine(b.req, totalStats(st));
    }
    h += `<div class="sub">판매가 ${itemValue(it)} G</div>`;
    h += '<div class="btns">';
    if (where === 'inv') {
      h += `<button class="btn gold" data-act="use">${isBook(it) ? '배우기' : b.type === 'potion' ? '사용' : '장착'}</button>`;
      if (this.w.canShop) h += `<button class="btn" data-act="sell">판매</button>`;
      h += `<button class="btn danger" data-act="drop">버리기</button>`;
    } else if (where === 'equip') {
      h += `<button class="btn" data-act="unequip">해제</button>`;
    }
    h += '</div>';
    return h;
  }

  // 장비창: 가운데 캐릭터 초상화, 왼쪽 · 오른쪽 줄에 부위별 칸 (겹치지 않게 칸을 줄로)
  equipGrid() {
    const st = this.w.st;
    const cell = (s) => { const it = st.equip[s], sel = this.sel?.from === 'equip' && this.sel.slot === s ? ' sel' : '';
      return `<div class="cell${sel}${it ? rar(it) : ''}" data-eq="${s}"><span class="lab">${SLOT_NAMES[s]}</span>${it ? ico(it) : ''}</div>`; };
    return `<div class="doll2"><div class="dcol">${['helm', 'amulet', 'armor', 'gloves', 'belt'].map(cell).join('')}</div>
      <div class="dmid"><img src="${portrait(st.look)}" alt="" /><div class="note">${esc(st.name)}</div></div>
      <div class="dcol">${['weapon', 'offhand', 'ring1', 'ring2', 'boots'].map(cell).join('')}</div></div>`;
  }

  // 고른 장비를 끼면(낀 것을 고르면 빼면) 전체 능력치가 어떻게 바뀌나
  statDiff(cur) {
    const st = this.w.st;
    if (!cur || cur.book || !BASES[cur.base]?.slot) return '';
    let slot = BASES[cur.base].slot, eq = { ...st.equip };
    if (this.sel?.from === 'equip') { slot = this.sel.slot; eq[slot] = null; }
    else {
      if (slot === 'ring') slot = !st.equip.ring1 ? 'ring1' : !st.equip.ring2 ? 'ring2' : 'ring1';
      eq[slot] = cur;
      if (slot === 'weapon' && isTwoHandedBase(BASES[cur.base])) eq.offhand = null;
    }
    const a = derive(st, this.w.buffValues()), b = derive({ ...st, equip: eq }, this.w.buffValues());
    const rows = [
      ...STATS.map((k) => [STAT_NAMES[k], a.stats[k], b.stats[k], 0]),
      ['피해', (a.dmg[0] + a.dmg[1]) / 2, (b.dmg[0] + b.dmg[1]) / 2, 0], ['공격 속도', a.atkRate, b.atkRate, 2], ['치명타 %', a.crit * 100, b.crit * 100, 1],
      ['회피 %', a.dodge * 100, b.dodge * 100, 1], ['막기 %', a.block * 100, b.block * 100, 1], ['방어력', a.armor, b.armor, 0], ['최대 HP', a.maxHp, b.maxHp, 0], ['최대 MP', a.maxMp, b.maxMp, 0],
      ['주문 배율', a.spellMult, b.spellMult, 2], ['이동 속도', a.moveSpeed, b.moveSpeed, 1], ['HP 회복', a.hpRegen, b.hpRegen, 1], ['MP 회복', a.mpRegen, b.mpRegen, 1],
    ];
    const out = rows.map(([n, x, y, f]) => { const d = y - x; if (Math.abs(d) < (f ? 0.5 / 10 ** f : 0.5)) return ''; const up = d > 0;
      return `<span>${n}</span><b>${x.toFixed(f)} → <em style="color:${up ? '#7fe07a' : '#ff6a5a'}">${y.toFixed(f)} ${up ? '▲' : '▼'}${Math.abs(d).toFixed(f)}</em></b>`; }).join('');
    return `<h3 style="margin-top:8px">${this.sel?.from === 'equip' ? '빼면' : '끼면'} 바뀌는 능력치</h3>${out ? `<div class="kv diff">${out}</div>` : '<div class="note">변화 없음</div>'}`;
  }

  bagGrid() {
    const st = this.w.st;
    let h = '<div class="grid">';
    for (let i = 0; i < bagSize(st); i++) {
      const it = st.inv[i];
      if (!it) { h += '<div class="cell"></div>'; continue; }
      const sel = this.sel?.from === 'inv' && this.sel.uid === it.uid ? ' sel' : '';
      h += `<div class="cell${sel}${rar(it)}" data-uid="${it.uid}">${ico(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : ''}</div>`;
    }
    return h + '</div>';
  }

  bagHead() {
    const st = this.w.st;
    return `<h3>가방 <span class="cnt">${st.inv.length}/${bagSize(st)}</span>${this.w.canShop ? '<button class="btn" data-selljunk="1" style="margin-left:auto">일반 · 마법 팔기</button>' : ''}<span class="goldTxt">${st.gold.toLocaleString()} G</span></h3>`;
  }

  // 고른 가방 아이템과 같은 칸에 끼고 있는 장비
  worn(cur) {
    const st = this.w.st;
    if (this.sel?.from !== 'inv' || !cur || !BASES[cur.base]?.slot) return '';
    const slot = BASES[cur.base].slot === 'ring' ? 'ring1' : BASES[cur.base].slot;
    return st.equip[slot] ? `<div class="detail worn"><h3>착용 중</h3>${this.describe(st.equip[slot], 'none')}</div>` : '';
  }

  inv() {
    const cur = this.cur();
    return `<div class="cols">
      <div class="frame" style="flex:0 0 30%"><h3>장비</h3>${this.equipGrid()}</div>
      <div class="frame" style="flex:0 0 30%"><div class="detail">${this.describe(cur, this.sel?.from)}</div>${this.statDiff(cur)}${this.worn(cur)}</div>
      <div class="frame" style="flex:1">${this.bagHead()}${this.bagGrid()}</div></div>`;
  }

  skills() {
    const st = this.w.st;
    const all = Object.keys(st.skills), school = this.skillSchool || 'all';
    const ids = school === 'all' ? all : all.filter((id) => SKILLS[id].school === school);
    const stats = totalStats(st);
    if (this.skillSel && !st.skills[this.skillSel]) this.skillSel = null;
    if (!this.skillSel && ids.length) this.skillSel = ids[0];
    let list = ids.length ? '' : '<div class="note">배운 스킬이 없습니다<br>스킬북은 사냥으로 얻습니다</div>';
    for (const id of ids) {
      const sk = SKILLS[id], s = st.skills[id];
      const max = s.rank >= CONFIG.skillMaxRank;
      const slot = st.quick.indexOf(id);
      list += `<div class="row pick${this.skillSel === id ? ' on' : ''}" data-skill="${id}">${sicon(id)}
        <div class="grow"><b>${sk.name}</b> <span style="color:${BOOK_TIERS[sk.tier].color};font-size:.8em">${BOOK_TIERS[sk.tier].name}</span>
          <div class="mini"><i style="width:${max ? 100 : (s.exp / skillExpNeeded(s.rank)) * 100}%;background:${sk.color}"></i></div></div>
        <div class="note">랭크 ${s.rank}${slot >= 0 ? ` · ${slot + 1}번` : ''}</div></div>`;
    }
    let det = '<div class="note">고른 스킬이 없습니다</div>';
    if (this.skillSel) {
      const id = this.skillSel, sk = SKILLS[id], s = st.skills[id];
      const v = skillValues(id, s.rank, s.var);
      const max = s.rank >= CONFIG.skillMaxRank;
      const need = skillExpNeeded(s.rank);
      det = `<div class="row" style="border:0">${sicon(id)}<div class="grow"><div class="nm" style="color:${BOOK_TIERS[sk.tier].color}">${sk.name}</div>
          <div class="sub">${BOOK_TIERS[sk.tier].name} · 랭크 ${s.rank}${max ? ' (최대)' : ` / ${CONFIG.skillMaxRank}`}</div></div></div>
        <div>${sk.desc}</div>
        <div class="kv" style="margin-top:8px"><span>MP</span><b>${v.mp}</b><span>재사용</span><b>${v.cd.toFixed(1)}초</b><span>숙련</span><b>${max ? '최대' : `${Math.floor(s.exp)} / ${need}`}</b></div>
        ${reqLine(sk.req, stats)}${meetsReq(st, sk.req, stats) ? '' : '<div class="bad">조건 부족</div>'}
        <h3 style="margin-top:10px">변형 <span class="cnt">${(s.var || []).length} / ${variantSlots(s.rank)}</span></h3><div class="btns" style="flex-wrap:wrap">${Object.entries(VARIANTS).map(([k, x]) => {
          const on = (s.var || []).includes(k), can = !on && (s.var || []).length < variantSlots(s.rank);
          return `<button class="btn${on ? ' on' : ''}" data-var="${k}" ${can ? '' : 'disabled'} title="${x.text}">${x.name}<small style="display:block;font-size:.7em;opacity:.8">${x.text}</small></button>`; }).join('')}</div>${s.rank < 3 ? '<div class="note">랭크 3 · 5</div>' : ''}
        <h3 style="margin-top:14px">퀵슬롯</h3><div class="qsRow">`;
      for (let i = 0; i < CONFIG.quickSlots; i++) {
        const q = st.quick[i];
        det += `<button class="btn qs${q === id ? ' on' : ''}" data-qs="${i}"><small>${i + 1}</small>${q ? `<img src="${skillIcon(q)}" alt="" />` : ''}</button>`;
      }
      det += `</div>${st.quick.includes(id) ? '<div class="btns"><button class="btn" data-qs="-1">빼기</button></div>' : ''}`;
    }
    const tabs = ['all', ...Object.keys(SCHOOL_NAMES)].filter((k) => k === 'all' || all.some((id) => SKILLS[id].school === k)).map((k) => `<button class="btn${school === k ? ' on' : ''}" data-school="${k}">${k === 'all' ? '전체' : SCHOOL_NAMES[k]}</button>`).join('');
    return `<div class="cols"><div class="frame" style="flex:1"><h3>배운 스킬 <span class="cnt">${all.length}</span></h3><div class="btns" style="flex-wrap:wrap;margin:0 0 6px">${tabs}</div>${list}</div>
      <div class="frame detail" style="flex:0 0 44%">${det}</div></div>`;
  }

  char() {
    this.w.d = derive(this.w.st, this.w.buffValues());
    const st = this.w.st, d = this.w.d;
    const stats = d.stats;
    const apSum = STATS.reduce((a, s) => a + st.ap[s], 0) || 1;
    let rows = '';
    for (const s of STATS) {
      const bonus = stats[s] - st.stats[s];
      const share = st.ap[s] / apSum;
      rows += `<div class="statRow"><span style="color:${STAT_COLORS[s]}">${STAT_NAMES[s]}</span><b>${stats[s]}${bonus > 0 ? `<small style="color:#8fb4ff;font-size:.7em"> +${bonus}</small>` : ''}</b>
        <div><div class="mini" style="height:8px"><i style="width:${share * 100}%;background:${STAT_COLORS[s]}"></i></div><div class="note">${STAT_DESC[s]} · 성향 ${Math.round(share * 100)}%</div></div></div>`;
    }
    const need = expNeeded(st.awakenings);
    const pct = (v) => `${Math.round(v * 100)}%`;
    const kv = [
      ['피해', `${Math.round(d.dmg[0])}~${Math.round(d.dmg[1])}`], ['공격 속도', `${d.atkRate.toFixed(2)}/초`],
      ['치명타', pct(d.crit)], ['회피', pct(d.dodge)], ['막기', pct(d.block)], ['방어력', Math.round(d.armor)],
      ['주문 배율', `×${d.spellMult.toFixed(2)}`], ['보호막 배율', `×${d.healMult.toFixed(2)}`],
      ['HP 회복', `${d.hpRegen.toFixed(1)}/초`], ['MP 회복', `${d.mpRegen.toFixed(1)}/초`], ['이동 속도', d.moveSpeed.toFixed(1)],
      ['좋은 아이템 발견', `+${d.magicFind}%`],
    ].map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('');
    const total = STATS.reduce((a, s) => a + st.apTotal[s], 0) || 1;
    const hist = STATS.map((s) => `<span style="color:${STAT_COLORS[s]}">${STAT_NAMES[s]} ${Math.round((st.apTotal[s] / total) * 100)}%</span>`).join(' · ');
    return `<div class="cols"><div class="frame" style="flex:1.25">
        <div class="row" style="border:0;padding-top:0"><div class="portrait"><img src="${portrait(st.look)}" alt="" /></div>${pentagon(stats)}
          <div class="grow"><div class="detail"><div class="nm">${esc(st.name)}</div></div><div class="note">${(st.titles || []).length ? `<b style="color:#ffd860">${esc(st.titles[st.titles.length - 1].name)}</b> · ` : ''}각성 ${st.awakenings}회 · EXP ${Math.floor(st.exp)} / ${need}${nextTitle(st)}</div>
          <div class="mini"><i style="width:${Math.min(100, (st.exp / need) * 100)}%;background:linear-gradient(#ffe7a0,#c99a3a)"></i></div></div></div>
        ${rows}
        <div class="note" style="margin-top:6px">누적 성향 ${hist}</div>
        <div class="note">칭호 도감 ${(st.titleSeen || []).length} / 45</div>
        ${(st.titles || []).map((t, i) => `<div class="note"><b style="color:#ffd860">${esc(t.name)}</b> ${esc(t.perk.text)} <button class="btn" data-repick="${i}" ${st.gold < repickCost(t) ? 'disabled' : ''}>다시 고르기 ${repickCost(t).toLocaleString()}G</button></div>`).join('')}
      </div><div class="frame" style="flex:1">
        <h3>세부 능력치</h3><div class="kv">${kv}</div>
        <h3 style="margin-top:12px">성장</h3>
        <div class="kv"><span>검 공격 · 막기</span><b style="color:${STAT_COLORS.str}">힘</b><span>활 공격 · 치명타 · 회피</span><b style="color:${STAT_COLORS.dex}">민첩</b>
          <span>지팡이 공격 · 주문</span><b style="color:${STAT_COLORS.int}">지능</b><span>MP 회복 (마을 밖 · 물약)</span><b style="color:${STAT_COLORS.wis}">정신</b>
          <span>피격 · 막기 · 위기 처치</span><b style="color:${STAT_COLORS.vit}">체력</b></div>
      </div></div>`;
  }

  quest() {
    const st = this.w.st;
    const q = st.tut >= 99 ? nextQuest(st) : null;
    const RN = { magic: '마법', rare: '희귀', hero: '영웅', legend: '전설' };
    const rewards = (r) => {
      const out = [`<span class="rw gold">${r.gold} G</span>`];
      for (const [id, n] of r.items || []) out.push(`<span class="rw"><img src="${itemIcon({ base: id })}" alt="" />×${n}</span>`);
      if (r.gear) out.push(`<span class="rw" style="color:${RARITY[r.gear[1]].color}">${RN[r.gear[1]]} ${r.gear[0] === 'weapon' ? '무기' : SLOT_NAMES[r.gear[0]]}</span>`);
      if (r.book) { const id = (QUEST_BOOKS[st.start] || QUEST_BOOKS.sword)[r.book]; out.push(`<span class="rw"><img src="${skillIcon(id)}" alt="" />${SKILLS[id].name}</span>`); }
      return out.join('');
    };
    let det = '<div class="note">받을 퀘스트가 없습니다</div>';
    if (q) {
      const need = questNeed(q), done = questDone(st);
      det = `<div class="nm">${q.name}</div><div class="sub">${ZONES.find((z) => z.id === q.zone).name}</div><div>${q.text}</div>
        <h3 style="margin-top:12px">목표</h3><div class="row" style="border:0"><div class="grow">${goalText(q)}<div class="mini" style="height:8px"><i style="width:${Math.min(100, (st.quest.n / need) * 100)}%;background:linear-gradient(#ffe7a0,#c99a3a)"></i></div></div><b>${Math.min(need, st.quest.n)} / ${need}</b></div>
        <h3 style="margin-top:12px">보상</h3><div class="rws">${rewards(q.reward)}</div>
        <div class="btns"><button class="plate gold" data-turnin="1" ${done && this.w.inTown ? '' : 'disabled'}>${done ? (this.w.inTown ? '보상 받기' : '경비대장 하겐에게 보고') : '진행 중'}</button></div>`;
    }
    const dl = dailyOf(st);
    let list = `<h3>오늘의 의뢰</h3>` + dl.list.map((x) => { const r = dailyReward(x, st);
      return `<div class="row qrow${x.done ? ' fin' : ''}"><div class="grow">${dailyText(x)}<div class="note">${r.gold}G${r.ore ? ` · 강화석 ${r.ore}` : ''}${r.key ? ' · 던전 열쇠' : ''}</div></div><span class="note">${x.done ? '완료' : `${x.have} / ${x.need}`}</span></div>`; }).join('');
    for (const z of ZONES) {
      list += `<h3>${z.name}</h3>`;
      for (const x of QUESTS.filter((y) => y.zone === z.id)) {
        const fin = st.questsDone.includes(x.id), cur = q && q.id === x.id;
        list += `<div class="row qrow${fin ? ' fin' : ''}${cur ? ' on' : ''}"><div class="grow">${fin || cur ? x.name : '???'}</div><span class="note">${fin ? '완료' : cur ? '진행 중' : ''}</span></div>`;
      }
    }
    const got = st.ach || [];
    det += `<h3 style="margin-top:14px">업적 <span class="cnt">${got.length} / ${ACHIEVEMENTS.length}</span></h3><div class="achs">${ACHIEVEMENTS.map((a) => `<span class="ach${got.includes(a.id) ? ' on' : ''}" title="${a.text}">${a.name}<small>${a.text}</small></span>`).join('')}</div>`;
    return `<div class="cols"><div class="frame detail" style="flex:1.1">${det}</div><div class="frame" style="flex:1">${list}</div></div>`;
  }

  // 월드맵: 지형 + 안개 + 마을 · 야영지(포탈) · 던전 입구 · 나. 포탈 위에서 열면 발견한 곳으로 이동
  // ───── 가이드북: 왼쪽 목차 | 오른쪽 그림 + 설명 ─────
  guide() {
    const st = this.w.st, k = this.gsec || 0;
    const pic = (src, cap) => `<figure class="gpic"><img src="${src}" alt="" /><figcaption>${cap}</figcaption></figure>`;
    const sample = (base, rarity, cap) => { const b = BASES[base]; if (!b) return ''; const it = { base, rarity, uid: 0, mods: [] }; try { return pic(itemIcon(it), cap); } catch { return ''; } };
    const eq = Object.values(st.equip).filter(Boolean)[0];
    const sk = Object.keys(st.skills)[0] || 'power_strike';
    const S = [
      ['조작', [pic(portrait(st.look), '내 캐릭터')], ['이동: 땅을 누르거나 WASD · 왼쪽 조이스틱', '공격: 몬스터를 누르거나 공격 버튼', '스킬: 오른쪽 아래 스킬 칸 (PC는 숫자 1~6)', '물약: 물약 칸 · Q (쿨타임 있음)', '창: I 가방 · K 스킬 · C 능력 · M 지도']],
      ['성장 · 각성', [pic(portrait(st.look), `Lv.${st.level}`)], ['몬스터를 잡아 경험치를 얻고 레벨이 오르면 능력치 점수를 받습니다', '최대 레벨에 닿으면 각성: 레벨은 1로, 능력치 보너스는 남습니다', '각성 횟수에 따라 성향에 맞는 칭호와 특성을 고릅니다']],
      ['스킬', [pic(skillIcon(sk), SKILLS[sk]?.name || '스킬')], ['스킬북을 가방에서 눌러 배웁니다', '쓸수록 스킬 레벨이 오릅니다', '변형: 스킬마다 변형 칸을 열어 효과를 바꿉니다']],
      ['장비', [eq ? pic(itemIcon(eq), itemName(eq)) : '', pic(chestIcon(), '가방')], ['부위: 머리 · 목걸이 · 몸 · 장갑 · 허리 · 무기 · 보조 · 반지 2 · 신발', '등급: 일반 < 마법 < 희귀 < 영웅 < 전설 < 세트', '레벨 제한 1 ~ 200, 깊은 곳 · 높은 세계 단계일수록 높은 장비', '장비를 고르면 능력치 변화가 옆 칸에 보입니다']],
      ['강화 · 재련 · 분해', [pic(oreIcon(), '광석'), pic(coinIcon(), '골드')], ['강화(대장간): +1 ~ +10, 대장간 레벨이 상한. 단계마다 피해 · 방어 +8%', '확률: +1~3 100%, 그 뒤 90 · 80 · 70 · 55 · 45 · 35 · 25%. 실패해도 단계는 그대로', '비용: 골드 + 광석 (단계 · 아이템 레벨에 비례)', '재련: 가장 약한 옵션 하나를 다시 굴립니다', '분해: 쓰지 않는 장비를 광석 · 재료로']],
      ['보석', [pic(oreIcon(), '보석')], ['장비 홈에 박아 능력치를 올립니다', '등급 10단계: 조각난 · 흐린 · 보통 · 빛나는 · 완벽한 · 찬란한 · 고대의 · 신성한 · 영원의 · 태초의', '몬스터 레벨이 높을수록 높은 등급이 떨어집니다. 상점은 낮은 등급만']],
      ['던전', [pic(scrollIcon(), '열쇠')], ['지역마다 던전 입구가 하나 (미로 · 방과 복도 · 동굴)', '네임드 · 보스가 주는 열쇠로 입장, 가장 깊은 곳의 우두머리를 잡으면 클리어', '단계를 올릴수록 몬스터가 세지고 보상이 좋아집니다']],
      ['마을 · 일꾼 · 연구', [pic(townIcon(), '마을')], ['건물을 지어 생산 · 강화 · 상점을 엽니다', '생산 건물은 일꾼을 배치해야 돌아갑니다', '연구: 가방 칸 등 영구 강화', '용병: 고용해 원정을 보냅니다']],
      ['야영지 · 지도', [pic(scrollIcon(), '월드맵')], ['세상은 캐릭터마다 새로 만들어집니다', '야영지: 안전 지대, 포탈로 먼 곳 이동, 상인 · 수리', '지도는 가 본 곳만 밝혀집니다']],
      ['세계 단계', [pic(scrollIcon(), TIER_NAMES.join(' · '))], ['평온 → 악몽 → 지옥', '단계가 오르면 같은 지역의 몬스터 레벨이 크게 오르고 더 좋은 장비 · 보석이 나옵니다']],
      ['도감 · 의뢰 · 업적', [pic(bookIcon(), '도감')], ['몬스터를 잡으면 도감이 채워지고 보너스를 받습니다', '퀘스트 · 일일 의뢰 · 업적으로 보상']],
    ];
    const [t, imgs, lines] = S[Math.min(k, S.length - 1)];
    return `<div class="cols"><div class="frame" style="flex:0 0 26%">${S.map((x, i) => `<button class="btn gsec${i === k ? ' on' : ''}" data-gsec="${i}">${x[0]}</button>`).join('')}</div>
      <div class="frame" style="flex:1"><h3>${t}</h3><div class="gwrap"><div class="gimgs">${imgs.join('')}</div><ul class="glist">${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div></div></div>`;
  }

  keysPanel() {
    const m = keyMap(this.w.st);
    return `<h3>단축키 <button class="btn" data-keyreset="1">처음대로</button></h3><div class="keygrid">${KEY_ACTIONS.map(([id, nm]) =>
      `<span>${nm}</span><button class="btn${this.waitKey === id ? ' gold' : ''}" data-bind="${id}">${this.waitKey === id ? '키 입력…' : keyName(m[id])}</button>`).join('')}</div>`;
  }

  map() {
    const w = this.w, st = w.st, P = w.player.pos, here = this.portalAt;
    const V = Math.max(240, Math.min(560, window.innerHeight - 110)), k = V / MAP_W, X = (x) => ((x + MAP_R) * k).toFixed(1), Y = (z) => ((z + MAP_R) * k).toFixed(1);
    const pins = [];
    pins.push(`<div class="pin town${here ? ' go' : ''}" style="left:${X(0)}px;top:${Y(-2)}px" ${here ? 'data-travel="town"' : ''}>여명 초소</div>`);
    for (const c of CAMPS) {
      const zn = ZONES.find((z) => z.id === c.zone), got = st.camps?.[c.zone];
      if (!got && !seenAt(c.x, c.z)) continue;
      pins.push(`<div class="pin camp${got ? '' : ' off'}${here && got && here !== c.zone ? ' go' : ''}" style="left:${X(c.x)}px;top:${Y(c.z)}px" ${here && got ? `data-travel="${c.zone}"` : ''}>${zn.name}</div>`);
    }
    for (const zn of ZONES) { const e = entranceOf(zn); if (seenAt(e.x, e.z)) pins.push(`<div class="pin gate" style="left:${X(e.x)}px;top:${Y(e.z)}px" title="던전"></div>`); }
    pins.push(`<div class="pin me" style="left:${X(P.x)}px;top:${Y(P.z)}px"></div>`);
    // 오른쪽: 지금 있는 야영지 시설
    const cz = here && here !== 'town' ? here : inCamp(P.x, P.z)?.zone, k2 = cz && st.camps?.[cz];
    let side = `<div class="note">${here ? '이동할 곳을 고르세요 (밝게 빛나는 곳)' : '포탈 위에 서면 발견한 야영지로 이동할 수 있습니다'}</div>`;
    if (k2) side += `<h3 style="margin-top:10px">야영지 시설</h3>
      <div class="row"><div class="grow"><b>떠돌이 상인</b><div class="note">사고팔기</div></div><button class="btn" data-camp="${cz}|merchant" ${k2.merchant || st.gold < 5000 ? 'disabled' : ''}>${k2.merchant ? '있음' : '5,000 G'}</button></div>
      <div class="row"><div class="grow"><b>모닥불</b><div class="note">야영지에서 빨리 회복</div></div><button class="btn" data-camp="${cz}|fire" ${k2.fire || st.gold < 2000 ? 'disabled' : ''}>${k2.fire ? '있음' : '2,000 G'}</button></div>`;
    side += `<div class="note" style="margin-top:10px">발견한 야영지 ${Object.keys(st.camps || {}).length} / ${CAMPS.length}</div>`;
    return `<div class="cols"><div class="frame" style="flex:0 0 auto"><div class="wmap" style="width:${V}px;height:${V}px"><canvas class="wmc" width="${V}" height="${V}"></canvas>${pins.join('')}</div></div><div class="frame" style="flex:1">${side}</div></div>`;
  }

  // 몬스터 도감 (잡은 수 50 · 200 · 500마다 그 몬스터에게 피해 +2 · 4 · 6%) · 보스 기록
  dex() {
    const st = this.w.st, dx = st.dex || {};
    const tier = (n) => (n >= 500 ? 3 : n >= 200 ? 2 : n >= 50 ? 1 : 0);
    let left = '', seen = 0, total = 0;
    for (const z of ZONES) {
      const types = [...new Set([...Object.keys(z.spawns), z.named.type, z.boss.type])];
      total += types.length; seen += types.filter((t) => dx[t]).length;
      left += `<h3>${z.name}</h3><div class="achs">${types.map((t) => { const n = dx[t] || 0, k = tier(n);
        return `<span class="ach${n ? ' on' : ''}">${n ? MONSTERS[t].name : '???'}<small>${n ? `${n}마리${k ? ` · 피해 +${k * 2}%` : ` · ${50 - n}마리 더`}` : ''}</small></span>`; }).join('')}</div>`;
    }
    const br = st.bossRec || {};
    const right = `<h3>보스 기록</h3>` + ZONES.map((z) => { const r = br[z.id]; return `<div class="row"><div class="grow"><b>${z.boss.name}</b><div class="note">${z.name}</div></div><span class="note">${r ? `${r.kills}번 · 최단 ${r.best}초` : '아직'}</span></div>`; }).join('');
    return `<div class="cols"><div class="frame" style="flex:1.4"><h3>몬스터 도감 <span class="cnt">${seen} / ${total}</span></h3>${left}</div><div class="frame" style="flex:1">${right}</div></div>`;
  }

  town() {
    const st = this.w.st, t = townOf(st);
    tick(st);
    const sel = this.townSel || PLOTS[0].id;
    const b = buildingAt(st, sel);
    const left = PLOTS.map((pl) => {
      const x = t.plots[pl.id];
      const def = x && BUILDINGS[x.type];
      const stock = def?.rate ? `<div class="mini"><i style="width:${(x.stock / def.store(x.lv)) * 100}%;background:linear-gradient(#ffe7a0,#c99a3a)"></i></div>` : '';
      return `<div class="row pick${pl.id === sel ? ' on' : ''}" data-plot="${pl.id}"><div class="grow"><b>${def ? `${def.name} <small>${x.lv}단계</small>` : '빈터'}</b><div class="note">${def ? def.desc : pl.name}</div>${stock}</div>
        ${def?.rate ? `<span class="note">${Math.floor(x.stock)} / ${def.store(x.lv)}</span>` : ''}</div>`;
    }).join('');
    let right = '';
    if (!b) {
      right = `<h3>무엇을 지을까</h3>` + Object.entries(BUILDINGS).map(([k, d]) => {
        const has = Object.values(t.plots).some((q) => q.type === k);
        return `<div class="row"><div class="grow"><b>${d.name}</b><div class="note">${d.desc}</div></div><button class="btn" data-build="${k}" ${has || st.gold < d.cost(0) ? 'disabled' : ''}>${has ? '지음' : d.cost(0).toLocaleString() + ' G'}</button></div>`;
      }).join('');
    } else {
      const def = BUILDINGS[b.type], up = def.cost(b.lv);
      const um = up == null ? null : upgradeMats(b.lv), umOk = !um || (t.mats[um.zone] || 0) >= um.n;
      right = `<h3>${def.name} · ${b.lv}단계</h3><div class="btns" style="margin:0 0 8px"><button class="btn" data-upgrade="1" ${up == null || st.gold < up || !umOk ? 'disabled' : ''}>${up == null ? '최고 단계' : `단계 올리기 ${up.toLocaleString()} G${um ? ` · ${MATERIALS[um.zone].name} ${um.n}` : ''}`}</button></div>`;
      if (b.type === 'workshop') {
        for (const zn of craftZones(st)) {
          const zi = ZONES.indexOf(zn), c = craftCost(zi), have = t.mats[zn.id] || 0, s = SETS[zn.id];
          right += `<div class="row"><div class="grow"><b style="color:#7fe07a">${s.name}</b><div class="note">${MATERIALS[zn.id].name} ${have} / ${c.mats} · ${c.gold.toLocaleString()} G</div></div>
            ${SET_SLOTS.map((sl) => `<button class="btn" data-craft="${zn.id}|${sl}" ${have < c.mats || st.gold < c.gold ? 'disabled' : ''}>${BASES[setBase(zi, sl)].name}</button>`).join('')}</div>`;
        }
      }
      if (def.rate) right += `<div class="row"><div class="grow"><b>일꾼 ${b.workers || 0} / ${b.lv}</b><div class="note">${b.workers ? `생산 ${Math.round(((b.workers || 0) / b.lv) * 100)}%` : '일꾼이 없으면 생산하지 않습니다'}</div></div><button class="btn" data-work="-1">−</button><button class="btn" data-work="1">+</button></div>`;
      if (def.rate) right += `<div class="kv"><span>생산</span><b>시간당 ${Math.round(def.rate(b.lv) * Math.min(1, (b.workers || 0) / b.lv))}</b><span>쌓인 양</span><b>${Math.floor(b.stock)} / ${def.store(b.lv)}</b></div>
        <div class="btns"><button class="btn gold" data-collect="1" ${b.stock < 1 ? 'disabled' : ''}>거두기</button></div>`;
      if (b.type === 'smithy') {
        const cap = enhanceCap(st);
        right += `<div class="note">강화 상한 +${cap} · 실패해도 단계 유지 · 실패하면 장인의 기운이 쌓이고 100%면 반드시 성공</div>`;
        for (const slot of SLOTS) {
          const it = st.equip[slot];
          if (!it) continue;
          const c = enhanceCost(it), max = (it.plus || 0) >= cap, rc = reforgeCost(it);
          right += `<div class="row"><div class="cell shopIco${rar(it)}">${ico(it)}</div><div class="grow"><b style="color:${itemColor(it)}">${esc(itemName(it))}</b>
            <div class="note">${max ? '상한' : `+${(it.plus || 0) + 1} · ${c.jang >= 1 ? '<b style="color:#ffd84a">100% (장인의 기운)</b>' : `${+(c.chance * 100).toFixed(1)}%`} · 장인의 기운 ${+(c.jang * 100).toFixed(1)}% · ${c.gold.toLocaleString()} G · 강화석 ${c.ore}`}</div></div>
            <button class="btn" data-enh="${slot}" ${max || st.gold < c.gold || t.ore < c.ore ? 'disabled' : ''}>강화</button>${it.affixes?.length ? `<button class="btn" data-reforge="${slot}" title="가장 약한 옵션 다시 굴리기 · ${rc.gold.toLocaleString()}G · 강화석 ${rc.ore}" ${st.gold < rc.gold || t.ore < rc.ore ? 'disabled' : ''}>재련</button>` : ''}</div>`;
        }
        const junk = st.inv.filter((x) => !x.book && BASES[x.base]?.slot && !x.named);
        if (junk.length) right += `<h3 style="margin-top:8px">분해 <button class="btn" data-salvageall="1">일반 · 마법 모두</button></h3>` + junk.map((x) => { const v = salvageValue(x); return `<div class="row"><div class="cell shopIco${rar(x)}">${ico(x)}</div><div class="grow"><b style="color:${itemColor(x)}">${esc(itemName(x))}</b><div class="note">강화석 ${v.ore} · ${MATERIALS[v.mat].name} ${v.matN}</div></div><button class="btn" data-salvage="${x.uid}">분해</button></div>`; }).join('');
      }
      if (b.type === 'lab') {
        const cap = BUILDINGS.lab.slots(b.lv);
        if (t.lab) right += `<div class="note">연구 중: ${RESEARCH[t.lab.id].name} · ${Math.max(1, Math.ceil((t.lab.until - Date.now()) / 60000))}분 남음</div>`;
        for (const [id, r] of Object.entries(RESEARCH)) {
          const lv = researchLv(st, id), c = researchCost(lv), max = lv >= cap;
          right += `<div class="row"><div class="grow"><b>${r.name}</b> <small>${lv}단계</small><div class="note">${lv ? r.text(lv) : '없음'} → ${r.text(lv + 1)}</div></div>
            <button class="btn" data-research="${id}" ${max || t.lab || st.gold < c.gold ? 'disabled' : ''}>${max ? '상한' : `${c.gold.toLocaleString()}G · ${c.min}분`}</button></div>`;
        }
      }
      if (b.type === 'inn') {
        const zones = ZONES.filter((z) => isLiberated(st, z.id));
        right += `<div class="note">해방 ${ZONES.map((z) => `${z.name} ${Math.floor(((st.liberate?.[z.id] || 0) / LIBERATE_NEED) * 100)}%`).join(' · ')}</div>`;
        t.mercs.forEach((m, i) => {
          const left = m.job ? Math.max(0, m.job.until - Date.now()) : 0;
          right += `<div class="row"><div class="grow"><b>${m.name}</b> <small>Lv ${m.lv}${m.gear ? ` · 장비 ${BASES[m.gear.name]?.name || ''}(${m.gear.ilvl})` : ''}</small> <button class="btn" data-mgear="${i}">장비 맡기기</button><div class="note">${m.job ? (left > 0 ? `${ZONES.find((z) => z.id === m.job.zone).name} · ${Math.ceil(left / 60000)}분 남음` : '돌아옴') : '쉬는 중'}</div></div>
            ${m.job && left <= 0 ? `<button class="btn gold" data-claim="${i}">전리품</button>` : ''}</div>`;
          if (!m.job && !zones.length) right += `<div class="note">해방한 지역 없음</div>`;
          else if (!m.job) right += `<div class="btns" style="margin:0 0 8px"><select data-zone="${i}" class="btn">${zones.map((z) => `<option value="${z.id}">${z.name}</option>`).join('')}</select>${EXPEDITIONS.map((e) => `<button class="btn" data-go-exp="${i}|${e.id}">${e.name} ${e.min}분</button>`).join('')}</div>`;
        });
        const n = t.mercs.length, slots = mercSlots(st);
        if (n < slots) right += `<div class="btns"><button class="btn" data-hire="1" ${st.gold < mercCost(n) ? 'disabled' : ''}>용병 고용 ${Math.round(mercCost(n)).toLocaleString()} G</button></div>`;
        else right += `<div class="note">용병 ${n} / ${slots} · 여관 단계를 올리면 더 고용</div>`;
      }
    }
    return `<div class="cols"><div class="frame" style="flex:0 0 40%"><h3>마을 <span class="goldTxt">${st.gold.toLocaleString()} G</span></h3><div class="note" style="display:flex;gap:6px;align-items:center"><img src="${oreIcon()}" style="width:1.6em" alt="" />강화석 ${t.ore}</div><div class="row"><div class="grow"><b>일꾼 ${t.workers || 0}</b> <small>쉬는 ${freeWorkers(st)}</small></div><button class="btn" data-hireworker="1" ${(t.workers || 0) >= WORKER_MAX || st.gold < workerCost(t.workers || 0) ? 'disabled' : ''}>고용 ${workerCost(t.workers || 0).toLocaleString()}G</button></div><div class="note">${Object.entries(t.mats).filter(([, n]) => n > 0).map(([k, n]) => `${MATERIALS[k].name} ${n}`).join(' · ')}</div>${left}</div>
      <div class="frame detail" style="flex:1">${right}</div></div>`;
  }

  shop() {
    const st = this.w.st;
    if (this.sel?.from === 'equip') this.sel = null;
    const goods = Object.keys(BASES).filter((id) => BASES[id].shop);
    let list = '';
    for (const id of goods) {
      const b = BASES[id];
      const desc = b.dmg ? `피해 ${b.dmg[0]}~${b.dmg[1]} · ${WEAPON_CLASSES[b.cls].name}` : b.armor ? `방어력 ${b.armor}${b.block ? ` · 막기 ${b.block * 100}%` : ''}` : b.restore ? (b.restore.hp ? `HP ${b.restore.hp}` : `MP ${b.restore.mp}`) : '';
      const qty = b.stack ? [1, 5, 20] : [1];
      list += `<div class="row"><div class="cell shopIco">${ico({ base: id, rarity: 'common' })}</div><div class="grow"><b>${b.name}</b><div class="note">${desc}</div></div>
        ${qty.map((q) => `<button class="btn" data-buy="${id}" data-q="${q}" ${st.gold < b.price * q ? 'disabled' : ''}>${q > 1 ? `×${q} ` : ''}${b.price * q}G</button>`).join('')}</div>`;
    }
    const cur = this.cur();
    return `<div class="cols"><div class="frame" style="flex:1"><h3>상인 오르텐</h3>${list}</div>
      <div class="frame" style="flex:1">${this.bagHead()}${this.bagGrid()}</div>
      <div class="frame detail" style="flex:0 0 26%">${this.describe(cur, cur ? 'inv' : null)}</div></div>`;
  }

  menu() {
    const st = this.w.st, set = st.settings;
    const t = Math.floor(st.playTime / 60);
    const ui = uiSettings(st);
    const uiSlider = (k, a, b) => `<input type="range" min="${a * 100}" max="${b * 100}" step="5" value="${Math.round(ui[k] * 100)}" data-ui="${k}" /><span class="volv">${Math.round(ui[k] * 100)}</span>`;
    const onoff = (key, on) => `<button class="btn${on ? ' on' : ''}" data-set="${key}" data-v="1">켜기</button><button class="btn${on ? '' : ' on'}" data-set="${key}" data-v="0">끄기</button>`;
    const vol = (key) => `<input type="range" min="0" max="100" step="5" value="${Math.round(set[key] * 100)}" data-vol="${key}" /><span class="volv">${Math.round(set[key] * 100)}</span>`;
    const card = (win, img, name, dis) => `<button class="card" data-go="${win}" ${dis ? 'disabled' : ''}>${img}<span>${name}</span></button>`;
    return `<div class="cols"><div class="frame" style="flex:1.1">
        <button class="plate gold" data-close="1">계속하기</button>
        <div class="setRow"><span>배경음</span><div class="opts">${vol('music')}</div></div>
        <div class="setRow"><span>효과음</span><div class="opts">${vol('sfx')}</div></div>
        <div class="setRow"><span>어둠 · 조명</span><div class="opts">${onoff('shadows', set.shadows)}</div></div>
        <div class="setRow"><span>UI 전체 크기</span><div class="opts">${uiSlider('scale', 0.7, 1.4)}</div></div>
        <div class="setRow"><span>조이스틱 크기</span><div class="opts">${uiSlider('joy', 0.6, 1.6)}</div></div>
        <div class="setRow"><span>단추 크기</span><div class="opts">${uiSlider('btn', 0.6, 1.6)}</div></div>
        <div class="setRow"><span>단추 투명도</span><div class="opts">${uiSlider('alpha', 0.3, 1)}</div></div>
        <div class="setRow"><span>UI 위치</span><div class="opts"><button class="btn" data-uiedit="1">위치 편집</button><button class="btn" data-uireset="1">처음대로</button></div></div>
        <div class="setRow"><span>세계 단계</span><div class="opts">${TIER_NAMES.map((n, i) => `<button class="btn${(st.worldTier || 1) === i + 1 ? ' on' : ''}" data-tier="${i + 1}" ${i + 1 > (st.maxTier || 1) ? 'disabled' : ''}>${n}${i + 1 > (st.maxTier || 1) ? ' (잠김)' : ''}</button>`).join('')}</div></div>
        <div class="setRow"><span>타겟 고정</span><div class="opts">${onoff('targetLock', set.targetLock !== false)}</div></div>
        <div class="setRow"><span>떠다니는 조이스틱</span><div class="opts">${onoff('joyFloat', set.joyFloat !== false)}</div></div>
        <div class="setRow"><span>화면 흔들림</span><div class="opts">${onoff('shake', set.shake !== false)}</div></div>
        <div class="setRow"><span>자동 물약</span><div class="opts">${[0.3, 0.4, 0.5, 0.6].map((v) => `<button class="btn${set.autoPotion === v ? ' on' : ''}" data-pot="${v}">${v * 100}%</button>`).join('')}</div></div>
        <div class="setRow"><span>물약 자동 구매</span><div class="opts">${onoff('autoBuy', set.autoBuy !== false)}</div></div>
        <div class="setRow"><span>단축키 (PC)</span><div class="opts"><button class="btn${this.keyEdit ? ' on' : ''}" data-keyedit="1">단축키 지정</button></div></div>
        <div class="setRow"><span>전체 화면</span><div class="opts"><button class="btn" data-full="1">전환</button></div></div>
        <div class="setRow"><span>앱으로 설치</span><div class="opts">${matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ? '<span class="note">설치됨</span>' : window.__install ? '<button class="btn gold" data-install="1">설치</button>' : /iPhone|iPad/.test(navigator.userAgent) ? '<span class="note">공유 → 홈 화면에 추가</span>' : '<span class="note">브라우저 메뉴 → 앱 설치</span>'}</div></div>
        <div class="btns"><button class="btn" data-notes="1">패치 노트 ${GAME_VERSION}</button>${cloud.id ? '<button class="btn" data-restore="1">백업에서 되살리기</button>' : ''}<button class="btn" data-save="1">지금 저장</button><button class="btn danger" data-reset="1">캐릭터 삭제</button></div>
      </div><div class="frame" style="flex:1">${this.keyEdit ? this.keysPanel() : ''}
        <div class="cards"${this.keyEdit ? ' hidden' : ''}>
          ${card('inv', `<img src="${chestIcon()}" alt="" />`, '가방')}
          ${card('skills', `<img src="${bookIcon()}" alt="" />`, '스킬')}
          ${card('char', `<img src="${portrait(st.look)}" alt="" />`, '능력')}
          ${card('quest', `<img src="${scrollIcon()}" alt="" />`, '퀘스트')}
          ${card('shop', `<img src="${coinIcon()}" alt="" />`, '상점', !this.w.canShop)}
        </div>
        <div class="kv" style="margin-top:14px"><span>플레이 시간</span><b>${Math.floor(t / 60)}시간 ${t % 60}분</b><span>각성</span><b>${st.awakenings}회</b>
          <span>배운 스킬</span><b>${Object.keys(st.skills).length}개</b><span>자동 사냥 효율</span><b>${Math.round(CONFIG.autoPenalty * 100)}%</b>
          <span>자동 저장</span><b>${CONFIG.autosaveInterval}초</b>
          <span>그림</span><b>Flare (CC-BY-SA 3.0)</b>
          <span>서버 저장</span><b>${cloud.id ? `${esc(cloud.id)}${cloud.state === 'error' ? ' · 실패' : cloud.savedAt ? ' · 저장됨' : ''}` : '로그인 안 함'}</b></div>
        <h3 style="margin-top:12px">순위 <button class="btn" data-rank="1">불러오기</button></h3>
        ${this.rankList ? (this.rankList.length ? this.rankList.slice(0, 10).map((r, i) => `<div class="row"><b style="width:2em">${i + 1}</b><div class="grow">${esc(r.name)} <small style="color:#ffd860">${esc(r.title || '')}</small></div><span class="note">각성 ${r.aw} · 던전 ${r.dg}</span></div>`).join('') : '<div class="note">기록 없음</div>') : ''}
      </div></div>`;
  }

  bind(body) {
    const w = this.w, st = w.st;
    const on = (sel, fn) => body.querySelectorAll(sel).forEach((el) => { el.onclick = () => fn(el); });
    on('[data-uid]', (el) => {
      const uid = Number(el.dataset.uid);
      if (this.kind !== 'shop' && this.sel?.from === 'inv' && this.sel.uid === uid) { w.useItem(uid); this.sel = null; }
      else { this.sel = { from: 'inv', uid }; audio.play('click'); }
      this.render();
    });
    on('[data-eq]', (el) => { if (st.equip[el.dataset.eq]) { this.sel = { from: 'equip', slot: el.dataset.eq }; audio.play('click'); this.render(); } });
    on('[data-act]', (el) => {
      const a = el.dataset.act;
      if (a === 'use') w.useItem(this.sel.uid);
      if (a === 'unequip') w.unequip(this.sel.slot);
      if (a === 'drop') w.dropItem(this.sel.uid);
      if (a === 'sell') {
        const i = st.inv.findIndex((x) => x.uid === this.sel.uid);
        if (i >= 0) { const it = st.inv.splice(i, 1)[0]; st.gold += itemValue(it); w.ui.toast(`${itemName(it)} 판매: +${itemValue(it)}G`); audio.play('coin'); }
        w.ui.dirty();
      }
      // 물약처럼 남아 있으면 계속 골라 둔다
      if (!(a === 'use' && st.inv.some((x) => x.uid === this.sel?.uid))) this.sel = null;
      this.render();
    });
    on('[data-skill]', (el) => { this.skillSel = el.dataset.skill; audio.play('click'); this.render(); });
    on('[data-qs]', (el) => {
      const i = Number(el.dataset.qs);
      const id = this.skillSel;
      const cur = st.quick.indexOf(id);
      if (cur >= 0) st.quick[cur] = null;
      if (i >= 0) st.quick[i] = id;
      audio.play('click');
      w.ui.dirty();
      this.render();
    });
    on('[data-buy]', (el) => {
      const id = el.dataset.buy, q = Number(el.dataset.q), b = BASES[id];
      if (st.gold < b.price * q) return;
      const it = makeItem(id, { rarity: 'common', ilvl: 1, qty: q }, st);
      if (!addItem(st, it)) { w.ui.toast('가방이 가득 찼습니다'); audio.play('error'); return; }
      st.gold -= b.price * q;
      audio.play('coin');
      w.ui.toast(`${b.name}${q > 1 ? ` ×${q}` : ''} 구매`);
      w.ui.dirty();
      this.render();
    });
    on('[data-pot]', (el) => { st.settings.autoPotion = Number(el.dataset.pot); audio.play('click'); this.render(); });
    on('[data-set]', (el) => {
      const v = el.dataset.v === '1';
      st.settings[el.dataset.set] = v;
      if (el.dataset.set === 'shadows') {
        w.stage.light = v;
      }
      audio.play('click');
      this.render();
    });
    body.querySelectorAll('[data-vol]').forEach((el) => {
      el.oninput = () => {
        st.settings[el.dataset.vol] = Number(el.value) / 100;
        el.nextElementSibling.textContent = el.value;
        audio.setVolumes(st.settings.music, st.settings.sfx);
      };
      el.onchange = () => { if (el.dataset.vol === 'sfx') audio.play('coin'); };
    });
    on('[data-turnin]', () => {
      const r = questTurnIn(st, bagSize(st));
      if (!r.ok) { if (r.why) w.ui.toast(r.why); audio.play('error'); return; }
      audio.play('awaken');
      w.fx.pillar(w.player.pos.x, w.player.pos.z, 0xffd860, 1.2);
      w.ui.toast(`보상: ${r.q.reward.gold} G${r.items.length ? ` · ${r.items.map((it) => itemName(it)).join(' · ')}` : ''}`, '#ffd84a');
      w.ui.log(`퀘스트 완료: ${r.q.name}`, '#ffd84a');
      w.ui.dirty();
      this.render();
    });
    body.querySelectorAll('[data-ui]').forEach((el) => {
      el.oninput = () => { uiSettings(st)[el.dataset.ui] = Number(el.value) / 100; el.nextElementSibling.textContent = el.value; applyUi(st); };
    });
    on('[data-uiedit]', () => { this.close(); editUi(st, () => w.ui.toast('UI 위치를 저장했습니다')); });
    on('[data-uireset]', () => { st.settings.ui = undefined; applyUi(st); this.render(); });
    on('[data-plot]', (el) => { this.townSel = el.dataset.plot; audio.play('click'); this.render(); });
    const townDone = (r, okMsg) => { if (!r?.ok) { if (r?.why) w.ui.toast(r.why); audio.play('error'); } else { if (okMsg) w.ui.toast(okMsg, '#ffd84a'); w.refreshTown(); w.ui.dirty(); } this.render(); };
    on('[data-build]', (el) => { const r = build(st, this.townSel || PLOTS[0].id, el.dataset.build); if (r.ok) audio.play('rankup'); townDone(r, `${BUILDINGS[el.dataset.build].name}을(를) 지었습니다`); });
    on('[data-upgrade]', () => { const r = upgrade(st, this.townSel); if (r.ok) audio.play('rankup'); townDone(r, '단계를 올렸습니다'); });
    on('[data-collect]', () => { const r = collect(st, this.townSel); if (r?.n) { audio.play('coin'); w.ui.toast(`${r.what} ${r.n}개를 거뒀습니다`, '#ffd84a'); } w.ui.dirty(); this.render(); });
    on('[data-enh]', (el) => {
      const it = st.equip[el.dataset.enh], r = enhance(st, it);
      if (!r.ok) { w.ui.toast(r.why); audio.play('error'); }
      else if (r.success) { audio.play('awaken'); w.fx.pillar(w.player.pos.x, w.player.pos.z, 0xffd060, 0.8); w.ui.toast(`강화 성공! +${r.plus}`, '#ffd84a'); w.refreshGear(); }
      else { audio.play('error'); w.ui.toast(`강화 실패 · 장인의 기운 ${+((r.jang || 0) * 100).toFixed(1)}%`); }
      w.ui.dirty(); this.render();
    });
    on('[data-hire]', () => townDone(hire(st), '용병을 고용했습니다'));
    on('[data-tier]', (el) => { w.setTier(Number(el.dataset.tier)); this.render(); });
    on('[data-hireworker]', () => townDone(hireWorker(st), '일꾼을 고용했습니다'));
    on('[data-work]', (el) => townDone(assignWorker(st, this.townSel, Number(el.dataset.work))));
    on('[data-travel]', (el) => { this.portalAt = null; this.close(); w.travel(el.dataset.travel); });
    on('[data-camp]', (el) => { const [z, what] = el.dataset.camp.split('|'); const r = w.buildCamp(z, what); if (!r.ok && r.why) w.ui.toast(r.why); w.ui.dirty(); this.render(); });
    on('[data-salvage]', (el) => { const r = salvage(st, Number(el.dataset.salvage)); if (r.ok) { audio.play('coin'); w.ui.toast(`분해: 강화석 ${r.ore} · ${MATERIALS[r.mat].name} ${r.matN}`, '#ffd84a'); } townDone(r); });
    on('[data-salvageall]', () => { let n = 0; for (const x of [...st.inv]) if (!x.book && BASES[x.base]?.slot && ['common', 'magic'].includes(x.rarity) && salvage(st, x.uid).ok) n++; audio.play('coin'); w.ui.toast(`장비 ${n}개 분해`, '#ffd84a'); townDone({ ok: true }); });
    on('[data-reforge]', (el) => { const it = st.equip[el.dataset.reforge], r = reforge(st, it); if (r.ok) { audio.play('rankup'); w.ui.toast(`재련: ${affixText(r.old)} → ${affixText(r.now)}`, '#ffd84a'); w.refreshGear(); } townDone(r); });
    on('[data-notes]', () => showNotes());
    on('[data-restore]', async () => {
      const b = await cloud.restore();
      if (!b) { w.ui.toast('백업이 없습니다'); return; }
      if (!confirm(`${new Date(b.savedAt || 0).toLocaleString()} 저장으로 되돌릴까요? 지금 진행은 사라집니다.`)) return;
      b.savedAt = Date.now(); // 서버의 더 새 저장이 다시 덮지 않게
      try { localStorage.setItem('ashen-save', JSON.stringify(b)); } catch { /* 무시 */ }
      location.reload();
    });
    on('[data-research]', (el) => townDone(researchStart(st, el.dataset.research), '연구를 시작했습니다'));
    on('[data-mgear]', (el) => townDone(mercGear(st, Number(el.dataset.mgear)), '장비를 맡겼습니다 (원정 성과 상승)'));
    on('[data-school]', (el) => { this.skillSchool = el.dataset.school; this.skillSel = null; audio.play('click'); this.render(); });
    on('[data-socket]', (el) => {
      const it = this.cur(); if (!it?.sockets || it.gems.length >= it.sockets) return;
      if (!takeOne(st, el.dataset.socket)) return;
      it.gems.push(el.dataset.socket); audio.play('rankup'); w.ui.toast(`${BASES[el.dataset.socket].name}을(를) 박았습니다`, '#c0b0ff'); w.refreshGear(); w.ui.dirty(); this.render();
    });
    on('[data-var]', (el) => { const s = st.skills[this.skillSel]; if (!s) return; (s.var ||= []).push(el.dataset.var); audio.play('rankup'); w.ui.dirty(); this.render(); });
    on('[data-repick]', (el) => {
      const t = st.titles[Number(el.dataset.repick)], cost = repickCost(t);
      if (st.gold < cost) return;
      w.ui.titlePick({ tier: t.tier, key: t.key, name: t.name, choices: perkChoices(t.key, t.tier) }, (perk) => { st.gold -= cost; t.perk = perk; w.ui.toast(`${t.name}: ${perk.text}`, '#ffd860'); w.ui.dirty(); this.render(); });
    });
    on('[data-rank]', async () => { this.rankList = await cloud.rank(); this.render(); });
    on('[data-selljunk]', () => {
      let g = 0, n = 0;
      st.inv = st.inv.filter((it) => { if (it.book || !BASES[it.base]?.slot || it.set || !['common', 'magic'].includes(it.rarity)) return true; g += itemValue(it); n++; return false; });
      if (n) { st.gold += g; audio.play('coin'); w.ui.toast(`장비 ${n}개 판매: +${g.toLocaleString()}G`, '#ffd84a'); }
      w.ui.dirty(); this.render();
    });
    on('[data-craft]', (el) => {
      const [z, sl] = el.dataset.craft.split('|'), r = craft(st, z, sl);
      if (r.ok) { audio.play('rankup'); w.ui.toast(`${itemName(r.item)} 제작!`, '#7fe07a'); }
      townDone(r);
    });
    on('[data-go-exp]', (el) => {
      const [i, ex] = el.dataset.goExp.split('|');
      const zone = body.querySelector(`[data-zone="${i}"]`)?.value;
      townDone(dispatch(st, Number(i), zone, ex), '용병이 사냥을 떠났습니다');
    });
    on('[data-claim]', (el) => {
      const r = claim(st, Number(el.dataset.claim));
      if (r) { audio.play('coin'); w.ui.toast(`전리품: ${r.gold.toLocaleString()} G · 강화석 ${r.ore} · 재료 ${r.mats}${r.items.length ? ` · 장비 ${r.items.length}개` : ''}`, '#ffd84a'); }
      w.ui.dirty(); this.render();
    });
    on('[data-go]', (el) => this.show(el.dataset.go));
    on('[data-close]', () => { audio.play('click'); this.close(); });
    on('[data-full]', () => toggleFullscreen());
    on('[data-install]', async () => { const p = window.__install; if (!p) return; p.prompt(); await p.userChoice.catch(() => {}); window.__install = null; this.render(); });
    on('[data-save]', () => { this.save(true); w.ui.toast('저장했습니다'); });
    on('[data-reset]', () => {
      if (confirm('정말 캐릭터를 지우고 처음부터 시작할까요? 되돌릴 수 없습니다.')) {
        localStorage.removeItem('ashen-save');
        window.__noSave = true;
        location.reload();
      }
    });
  }
}

function reqLine(req, stats) {
  if (!req) return '';
  const parts = Object.entries(req).map(([k, v]) => `<span class="${(stats[k] || 0) < v ? 'bad' : ''}">${STAT_NAMES[k]} ${v}</span>`);
  return `<div class="sub">요구: ${parts.join(', ')}</div>`;
}

export function toggleFullscreen(on = !document.fullscreenElement) {
  const d = document;
  if (on) {
    const el = d.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    Promise.resolve(req?.call(el)).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } else d.exitFullscreen?.();
}
// 전체 화면이 풀리면 다시 켜는 단추 · 세로 화면 안내에서 가로 전체 화면
export function setupFullscreenUi(isTouch) {
  const btn = document.getElementById('btnFull'), can = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const sync = () => { btn.hidden = !isTouch || !can || !!(document.fullscreenElement || document.webkitFullscreenElement); };
  document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
  btn.addEventListener('click', () => toggleFullscreen(true));
  document.getElementById('btnRotate')?.addEventListener('click', () => toggleFullscreen(true));
  // 꾹 눌러 뜨는 메뉴 막기
  document.addEventListener('contextmenu', (e) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
  sync();
}
