// 창: 가방(장비) · 스킬 · 능력(스탯/성향) · 상점 · 메뉴
import { STATS, STAT_NAMES, STAT_COLORS, STAT_DESC, CONFIG } from '../data/config.js';
import { SKILLS, BOOK_TIERS } from '../data/skills.js';
import { BASES, SLOTS, SLOT_NAMES, RARITY, WEAPON_CLASSES } from '../data/items.js';
import { itemName, itemColor, itemValue, affixText, isBook, makeItem } from '../game/items.js';
import { scaledArmor, scaledDmg, totalStats, derive } from '../game/player.js';
import { addItem } from '../game/inventory.js';
import { skillExpNeeded, skillValues, meetsReq } from '../game/skills.js';
import { expNeeded } from '../game/growth.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

import { itemIcon, skillIcon, portrait, chestIcon, bookIcon, coinIcon, scrollIcon, townIcon, oreIcon } from './icons.js';
import { MATERIALS, SETS, SET_SLOTS, craftCost, upgradeMats } from '../data/crafting.js';
import { craft, craftZones, setCounts, setBase } from '../game/town.js';
import { AFFIXES } from '../data/items.js';
import { PLOTS, BUILDINGS, EXPEDITIONS, townOf, buildingAt, build, upgrade, collect, enhance, enhanceCap, enhanceCost, hire, mercSlots, dispatch, claim, tick } from '../game/town.js';
import { mercCost } from '../data/buildings.js';
import { QUESTS, QUEST_BOOKS } from '../data/quests.js';
import { ZONES } from '../data/world.js';
import { nextQuest, questDone, questNeed, goalText, questTurnIn } from '../game/quests.js';
import { audio } from '../engine/audio.js';
import { cloud } from '../net/cloud.js';
import { uiSettings, applyUi, editUi } from './layout.js';

import { TITLE_AT, titleKey, titleName, UNIQUES } from '../data/titles.js';
const nextTitle = (st) => { const i = TITLE_AT.findIndex((n) => st.awakenings < n); return i < 0 ? '' : ` · ${titleName(titleKey(st.stats), i)}까지 각성 ${TITLE_AT[i] - st.awakenings}`; };
const TITLES = { inv: '가방 · 장비', skills: '스킬', char: '능력 · 성향', quest: '퀘스트', town: '마을', shop: '상점', menu: '메뉴' };
const TAB_ORDER = ['inv', 'skills', 'char', 'quest', 'town', 'shop', 'menu'];
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
    if (kind === 'shop' && !this.w.inTown) { this.w.ui.toast('상점은 마을에서만 이용할 수 있습니다'); audio.play('error'); return; }
    if (this.kind !== kind) this.sel = null;
    this.kind = kind;
    this.el.hidden = false;
    audio.play('click');
    this.render();
  }

  close() {
    this.el.hidden = true;
    this.kind = null;
    this.sel = null;
  }

  refresh() { if (this.open) this.render(); }

  render() {
    $('h2', this.el).textContent = TITLES[this.kind];
    const icons = { inv: chestIcon(), skills: bookIcon(), char: portrait(this.w.st.look), shop: coinIcon(), quest: scrollIcon(), town: townIcon() };
    const tabs = $('.tabs', this.el);
    tabs.innerHTML = TAB_ORDER.filter((k) => k !== 'shop' || this.w.inTown).map((k) =>
      `<button class="tab${k === this.kind ? ' on' : ''}" data-tab="${k}">${icons[k] ? `<img src="${icons[k]}" alt="" />` : '<b class="gear" style="width:1.8em;height:1.8em"></b>'}<span>${TITLES[k].split(' ')[0]}</span></button>`).join('');
    tabs.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => this.show(b.dataset.tab); });
    const body = $('.body', this.el);
    // 다시 그려도 스크롤 위치는 지킨다
    const keep = [...body.querySelectorAll('.frame')].map((f) => f.scrollTop);
    body.innerHTML = this[this.kind]();
    body.querySelectorAll('.frame').forEach((f, i) => { f.scrollTop = keep[i] || 0; });
    this.bind(body);
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
      if (this.w.inTown) h += `<button class="btn" data-act="sell">판매</button>`;
      h += `<button class="btn danger" data-act="drop">버리기</button>`;
    } else if (where === 'equip') {
      h += `<button class="btn" data-act="unequip">해제</button>`;
    }
    h += '</div>';
    return h;
  }

  equipGrid() {
    const st = this.w.st;
    let h = '<div class="equipGrid">';
    for (const s of SLOTS) {
      const it = st.equip[s];
      const sel = this.sel?.from === 'equip' && this.sel.slot === s ? ' sel' : '';
      h += `<div class="cell${sel}${it ? rar(it) : ''}" data-eq="${s}"><span class="lab">${SLOT_NAMES[s]}</span>${it ? ico(it) : ''}</div>`;
    }
    return h + '</div>';
  }

  bagGrid() {
    const st = this.w.st;
    let h = '<div class="grid">';
    for (let i = 0; i < CONFIG.inventorySize; i++) {
      const it = st.inv[i];
      if (!it) { h += '<div class="cell"></div>'; continue; }
      const sel = this.sel?.from === 'inv' && this.sel.uid === it.uid ? ' sel' : '';
      h += `<div class="cell${sel}${rar(it)}" data-uid="${it.uid}">${ico(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : ''}</div>`;
    }
    return h + '</div>';
  }

  bagHead() {
    const st = this.w.st;
    return `<h3>가방 <span class="cnt">${st.inv.length}/${CONFIG.inventorySize}</span>${this.w.inTown ? '<button class="btn" data-selljunk="1" style="margin-left:auto">일반 · 마법 팔기</button>' : ''}<span class="goldTxt">${st.gold.toLocaleString()} G</span></h3>`;
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
      <div class="frame" style="flex:0 0 40%"><h3>장비</h3>${this.equipGrid()}<div class="detail">${this.describe(cur, this.sel?.from)}</div>${this.worn(cur)}</div>
      <div class="frame" style="flex:1">${this.bagHead()}${this.bagGrid()}</div></div>`;
  }

  skills() {
    const st = this.w.st;
    const ids = Object.keys(st.skills);
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
      const v = skillValues(id, s.rank);
      const max = s.rank >= CONFIG.skillMaxRank;
      const need = skillExpNeeded(s.rank);
      det = `<div class="row" style="border:0">${sicon(id)}<div class="grow"><div class="nm" style="color:${BOOK_TIERS[sk.tier].color}">${sk.name}</div>
          <div class="sub">${BOOK_TIERS[sk.tier].name} · 랭크 ${s.rank}${max ? ' (최대)' : ` / ${CONFIG.skillMaxRank}`}</div></div></div>
        <div>${sk.desc}</div>
        <div class="kv" style="margin-top:8px"><span>MP</span><b>${v.mp}</b><span>재사용</span><b>${v.cd.toFixed(1)}초</b><span>숙련</span><b>${max ? '최대' : `${Math.floor(s.exp)} / ${need}`}</b></div>
        ${reqLine(sk.req, stats)}${meetsReq(st, sk.req, stats) ? '' : '<div class="bad">조건 부족</div>'}
        <h3 style="margin-top:14px">퀵슬롯</h3><div class="qsRow">`;
      for (let i = 0; i < CONFIG.quickSlots; i++) {
        const q = st.quick[i];
        det += `<button class="btn qs${q === id ? ' on' : ''}" data-qs="${i}"><small>${i + 1}</small>${q ? `<img src="${skillIcon(q)}" alt="" />` : ''}</button>`;
      }
      det += `</div>${st.quick.includes(id) ? '<div class="btns"><button class="btn" data-qs="-1">빼기</button></div>' : ''}`;
    }
    return `<div class="cols"><div class="frame" style="flex:1"><h3>배운 스킬 <span class="cnt">${ids.length}</span></h3>${list}</div>
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
        <div class="row" style="border:0;padding-top:0"><div class="portrait"><img src="${portrait(st.look)}" alt="" /></div>
          <div class="grow"><div class="detail"><div class="nm">${esc(st.name)}</div></div><div class="note">${(st.titles || []).length ? `<b style="color:#ffd860">${esc(st.titles[st.titles.length - 1].name)}</b> · ` : ''}각성 ${st.awakenings}회 · EXP ${Math.floor(st.exp)} / ${need}${nextTitle(st)}</div>
          <div class="mini"><i style="width:${Math.min(100, (st.exp / need) * 100)}%;background:linear-gradient(#ffe7a0,#c99a3a)"></i></div></div></div>
        ${rows}
        <div class="note" style="margin-top:6px">누적 성향 ${hist}</div>
        ${(st.titles || []).map((t) => `<div class="note"><b style="color:#ffd860">${esc(t.name)}</b> ${esc(t.perk.text)}</div>`).join('')}
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
    let list = '';
    for (const z of ZONES) {
      list += `<h3>${z.name}</h3>`;
      for (const x of QUESTS.filter((y) => y.zone === z.id)) {
        const fin = st.questsDone.includes(x.id), cur = q && q.id === x.id;
        list += `<div class="row qrow${fin ? ' fin' : ''}${cur ? ' on' : ''}"><div class="grow">${fin || cur ? x.name : '???'}</div><span class="note">${fin ? '완료' : cur ? '진행 중' : ''}</span></div>`;
      }
    }
    return `<div class="cols"><div class="frame detail" style="flex:1.1">${det}</div><div class="frame" style="flex:1">${list}</div></div>`;
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
      if (def.rate) right += `<div class="kv"><span>생산</span><b>시간당 ${def.rate(b.lv)}</b><span>쌓인 양</span><b>${Math.floor(b.stock)} / ${def.store(b.lv)}</b></div>
        <div class="btns"><button class="btn gold" data-collect="1" ${b.stock < 1 ? 'disabled' : ''}>거두기</button></div>`;
      if (b.type === 'smithy') {
        const cap = enhanceCap(st);
        right += `<div class="note">강화 상한 +${cap} · 실패해도 단계는 떨어지지 않는다</div>`;
        for (const slot of SLOTS) {
          const it = st.equip[slot];
          if (!it) continue;
          const c = enhanceCost(it), max = (it.plus || 0) >= cap;
          right += `<div class="row"><div class="cell shopIco${rar(it)}">${ico(it)}</div><div class="grow"><b style="color:${itemColor(it)}">${esc(itemName(it))}</b>
            <div class="note">${max ? '상한' : `+${(it.plus || 0) + 1} · ${Math.round(c.chance * 100)}% · ${c.gold.toLocaleString()} G · 강화석 ${c.ore}`}</div></div>
            <button class="btn" data-enh="${slot}" ${max || st.gold < c.gold || t.ore < c.ore ? 'disabled' : ''}>강화</button></div>`;
        }
      }
      if (b.type === 'inn') {
        const zones = ZONES.filter((z) => z.levels[0] <= 1 + st.awakenings * 1.5);
        t.mercs.forEach((m, i) => {
          const left = m.job ? Math.max(0, m.job.until - Date.now()) : 0;
          right += `<div class="row"><div class="grow"><b>${m.name}</b> <small>Lv ${m.lv}</small><div class="note">${m.job ? (left > 0 ? `${ZONES.find((z) => z.id === m.job.zone).name} · ${Math.ceil(left / 60000)}분 남음` : '돌아옴') : '쉬는 중'}</div></div>
            ${m.job && left <= 0 ? `<button class="btn gold" data-claim="${i}">전리품</button>` : ''}</div>`;
          if (!m.job) right += `<div class="btns" style="margin:0 0 8px"><select data-zone="${i}" class="btn">${zones.map((z) => `<option value="${z.id}">${z.name}</option>`).join('')}</select>${EXPEDITIONS.map((e) => `<button class="btn" data-go-exp="${i}|${e.id}">${e.name} ${e.min}분</button>`).join('')}</div>`;
        });
        const n = t.mercs.length, slots = mercSlots(st);
        if (n < slots) right += `<div class="btns"><button class="btn" data-hire="1" ${st.gold < mercCost(n) ? 'disabled' : ''}>용병 고용 ${Math.round(mercCost(n)).toLocaleString()} G</button></div>`;
        else right += `<div class="note">용병 ${n} / ${slots} · 여관 단계를 올리면 더 고용</div>`;
      }
    }
    return `<div class="cols"><div class="frame" style="flex:0 0 40%"><h3>마을 <span class="goldTxt">${st.gold.toLocaleString()} G</span></h3><div class="note" style="display:flex;gap:6px;align-items:center"><img src="${oreIcon()}" style="width:1.6em" alt="" />강화석 ${t.ore}</div><div class="note">${Object.entries(t.mats).filter(([, n]) => n > 0).map(([k, n]) => `${MATERIALS[k].name} ${n}`).join(' · ')}</div>${left}</div>
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
        <div class="setRow"><span>타겟 고정</span><div class="opts">${onoff('targetLock', set.targetLock !== false)}</div></div>
        <div class="setRow"><span>떠다니는 조이스틱</span><div class="opts">${onoff('joyFloat', set.joyFloat !== false)}</div></div>
        <div class="setRow"><span>화면 흔들림</span><div class="opts">${onoff('shake', set.shake !== false)}</div></div>
        <div class="setRow"><span>자동 물약</span><div class="opts">${[0.3, 0.4, 0.5, 0.6].map((v) => `<button class="btn${set.autoPotion === v ? ' on' : ''}" data-pot="${v}">${v * 100}%</button>`).join('')}</div></div>
        <div class="setRow"><span>물약 자동 구매</span><div class="opts">${onoff('autoBuy', set.autoBuy !== false)}</div></div>
        <div class="setRow"><span>전체 화면</span><div class="opts"><button class="btn" data-full="1">전환</button></div></div>
        <div class="btns"><button class="btn" data-save="1">지금 저장</button><button class="btn danger" data-reset="1">캐릭터 삭제</button></div>
      </div><div class="frame" style="flex:1">
        <div class="cards">
          ${card('inv', `<img src="${chestIcon()}" alt="" />`, '가방')}
          ${card('skills', `<img src="${bookIcon()}" alt="" />`, '스킬')}
          ${card('char', `<img src="${portrait(st.look)}" alt="" />`, '능력')}
          ${card('quest', `<img src="${scrollIcon()}" alt="" />`, '퀘스트')}
          ${card('shop', `<img src="${coinIcon()}" alt="" />`, '상점', !this.w.inTown)}
        </div>
        <div class="kv" style="margin-top:14px"><span>플레이 시간</span><b>${Math.floor(t / 60)}시간 ${t % 60}분</b><span>각성</span><b>${st.awakenings}회</b>
          <span>배운 스킬</span><b>${Object.keys(st.skills).length}개</b><span>자동 사냥 효율</span><b>${Math.round(CONFIG.autoPenalty * 100)}%</b>
          <span>자동 저장</span><b>${CONFIG.autosaveInterval}초</b>
          <span>그림</span><b>Flare (CC-BY-SA 3.0)</b>
          <span>서버 저장</span><b>${cloud.id ? `${esc(cloud.id)}${cloud.state === 'error' ? ' · 실패' : cloud.savedAt ? ' · 저장됨' : ''}` : '로그인 안 함'}</b></div>
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
      const r = questTurnIn(st, CONFIG.inventorySize);
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
      else { audio.play('error'); w.ui.toast('강화 실패 (단계는 그대로)'); }
      w.ui.dirty(); this.render();
    });
    on('[data-hire]', () => townDone(hire(st), '용병을 고용했습니다'));
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
      if (r) { audio.play('coin'); w.ui.toast(`전리품: ${r.gold.toLocaleString()} G · 강화석 ${r.ore}${r.items.length ? ` · 장비 ${r.items.length}개` : ''}`, '#ffd84a'); }
      w.ui.dirty(); this.render();
    });
    on('[data-go]', (el) => this.show(el.dataset.go));
    on('[data-close]', () => { audio.play('click'); this.close(); });
    on('[data-full]', () => toggleFullscreen());
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

export function toggleFullscreen() {
  const d = document;
  if (!d.fullscreenElement) {
    d.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } else d.exitFullscreen?.();
}
