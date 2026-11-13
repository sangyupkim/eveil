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
import { craft, craftZones, setCounts, setBase, isLiberated, LIBERATE_NEED, researchStart, researchLv, mercGear, recruits, assignMerc, SKILL_OF, SKILLS_ALL, BONUS, bonusOf, awakenMerc, awakenCost, dismiss, staMax, SKILL_NAMES, GRADES, MERC, EXP_STA, deathChance, salvage, salvageValue, reforge, reforgeCost } from '../game/town.js';
import { RESEARCH, researchCost } from '../data/buildings.js';
import { AFFIXES } from '../data/items.js';
import { PLOTS, BUILDINGS, EXPEDITIONS, townOf, buildingAt, build, upgrade, collect, enhance, enhanceCap, enhanceCost, hire, mercSlots, dispatch, claim, tick } from '../game/town.js';
import { QUESTS, QUEST_BOOKS } from '../data/quests.js';
import { ZONES, MONSTERS } from '../data/world.js';
import { nextQuest, questDone, questNeed, goalText, questTurnIn } from '../game/quests.js';
import { audio } from '../engine/audio.js';
import { cloud } from '../net/cloud.js';
import { takeOne, countOf } from '../game/inventory.js';
import { uiSettings, applyUi, editUi } from './layout.js';

import { TITLE_AT, titleKey, titleName, UNIQUES, perkChoices } from '../data/titles.js';
import { variantsOf, VARIANT_RANKS, modsOf, skillEff } from '../game/skills.js';
import { SCHOOL_NAMES } from '../data/skills.js';
import { GEMS, GEM_GRADES } from '../data/legends.js';
import { applyShard, canApply, lockMax, shardCost } from '../game/shards.js';
import { HERBS, HERB_IDS, herbsAt, RECIPES, ELIXIRS } from '../data/potions.js';
import { buildTime, brew, brewGold, brewCollect, brewTime, BREW_QUEUE, dispatchParty, partyMax, packMax, packBoost, shelterLv, shelterUp } from '../game/town.js';
import { RESEARCH_MAX, SHELTER } from '../data/buildings.js';
import { herbIcon, homeIcon } from './icons.js';
import { vault, vaultSize, vaultPut, vaultTake, vaultAdd } from '../game/vault.js';
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
const TITLES = { map: '월드맵', inv: '가방 · 장비', skills: '스킬', char: '능력 · 성향', quest: '퀘스트', dex: '도감 · 기록', town: '마을', vault: '창고', shop: '상점', guide: '가이드북', menu: '메뉴' };
// 진행 게이지 (시작 ~ 끝 시각). 예전 저장은 시작 시각이 없어 dur로 어림
const gauge = (from, until, dur = 3600000, color = '#7ad0ff') => { const f = from || until - dur, k = Math.max(0, Math.min(1, (Date.now() - f) / Math.max(1, until - f))); return `<div class="mini" style="margin-top:3px"><i style="width:${(k * 100).toFixed(1)}%;background:linear-gradient(#bfe8ff,${color})"></i></div>`; };
const NPC_ONLY = ['shop', 'town', 'vault'];
const TAB_ORDER = ['map', 'inv', 'vault', 'skills', 'char', 'quest', 'dex', 'town', 'shop', 'guide', 'menu'];
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
    // 누르고 있는 동안 다시 그리면 버튼이 바뀌어 눌림(click)이 사라진다 → 손을 뗀 뒤로 미룬다
    this.el.addEventListener('pointerdown', () => { this.pressing = true; }, true);
    const up = () => { if (!this.pressing) return; this.pressing = false; if (this.pending) { this.pending = false; setTimeout(() => this.refresh(), 60); } };
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  }

  get open() { return !this.el.hidden; }

  toggle(kind) {
    if (this.open && this.kind === kind) this.close();
    else this.show(kind);
  }

  show(kind) {
    if (kind === 'map' && this.kind !== 'map') this.mapCenter = true;
    // 상점 · 건물 · 창고는 마을 NPC나 건물 앞에서만 (talk로 열어 준 것만)
    if (NPC_ONLY.includes(kind) && !this.talk?.includes(kind)) { this.w.ui.toast(kind === 'town' ? '경비대장이나 건물 앞에서 이용할 수 있습니다' : kind === 'vault' ? '창고는 마을 상인에게서 이용할 수 있습니다' : '상인에게 가서 이용할 수 있습니다'); audio.play('error'); return; }
    if (this.kind !== kind) this.sel = null;
    this.kind = kind;
    this.el.hidden = false;
    audio.play('click');
    this.render();
  }

  // NPC · 건물에서 열기: kinds = 이번에 쓸 수 있는 창, mode = 'build'(경비대장) | 'one'(건물 앞)
  talkTo(kinds, first, mode = null) { this.talk = kinds; this.townMode = mode; this.show(first); }

  close() {
    this.talk = null; this.townMode = null; this.vsel = null;
    this.waitKey = null;
    this.portalAt = null; this.mapZoom = null; this.mapCenter = true;
    this.el.hidden = true;
    this.kind = null;
    this.sel = null;
  }

  refresh() { if (!this.open) return; if (this.pressing) { this.pending = true; return; } this.render(); }

  render() {
    $('h2', this.el).textContent = TITLES[this.kind];
    const icons = { inv: chestIcon(), skills: bookIcon(), char: portrait(this.w.st.look), shop: coinIcon(), quest: scrollIcon(), town: townIcon(), dex: bookIcon(), map: scrollIcon(), guide: bookIcon(), vault: homeIcon() };
    const tabs = $('.tabs', this.el);
    // 탭은 그림 없이 같은 모양의 글자 단추로
    const TAB_TXT = { map: '지도', inv: '가방', skills: '스킬', char: '능력', quest: '퀘스트', dex: '도감', town: '마을', vault: '창고', shop: '상점', guide: '가이드북', menu: '설정' };
    tabs.innerHTML = TAB_ORDER.filter((k) => !NPC_ONLY.includes(k) || this.talk?.includes(k)).map((k) => `<button class="tab txt${k === this.kind ? ' on' : ''}" data-tab="${k}"><span>${TAB_TXT[k]}</span></button>`).join('');
    tabs.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => this.show(b.dataset.tab); });
    const body = $('.body', this.el);
    // 다시 그려도 스크롤 위치는 지킨다
    const keep = [...body.querySelectorAll('.frame')].map((f) => f.scrollTop);
    body.innerHTML = this[this.kind]();
    const wc = body.querySelector('.wmc');
    if (wc && this.kind === 'map') { const mf = body.querySelector('.mapFrame'), me = body.querySelector('.pin.me'); if (mf && me && (this.mapCenter !== false)) { requestAnimationFrame(() => { mf.scrollLeft = me.offsetLeft - mf.clientWidth / 2; mf.scrollTop = me.offsetTop - mf.clientHeight / 2; }); this.mapCenter = false; } }
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
    } else if (it.shard) {
      h += `<div class="sub">능력치 파편 · 대장간</div><div class="aff">${affixText(it.shard)}</div>`;
    } else if (b.type === 'gem') {
      h += `<div class="sub">보석 ×${it.qty}</div><div>${STAT_NAMES[GEMS[b.gem].stat]} +${GEM_GRADES[b.grade].v}</div>`;
    } else if (b.type === 'key') {
      h += `<div class="sub">×${it.qty}</div><div>지역의 던전 입구에서 하나 써서 들어갑니다</div>`;
    } else if (b.type === 'elixir') {
      h += `<div class="sub">영약 ×${it.qty} · 5분</div><div class="aff">${ELIXIRS[it.base].text}</div>`;
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
      if (!it.shard && b.type !== 'mat') h += `<button class="btn gold" data-act="use">${isBook(it) ? '배우기' : b.type === 'potion' ? '사용' : b.type === 'elixir' ? '마시기' : '장착'}</button>`;
      // 물약 퀵슬롯: 이 물약을 체력 · 마나 칸에 두거나 뺀다
      if (b.type === 'potion') for (const [k, nm] of [['hp', '체력 칸'], ['mp', '마나 칸']]) {
        const on = st.potSlot?.[k] === it.base;
        h += `<button class="btn${on ? ' on' : ''}" data-pslot="${k}|${on ? '' : it.base}">${on ? `${nm}에서 빼기` : `${nm}에 두기`}</button>`;
      }
      if (this.w.canShop && b.type !== 'mat') h += `<button class="btn" data-act="sell">판매</button>`;
      h += `<button class="btn danger" data-act="drop">버리기</button>`;
    } else if (where === 'equip') {
      h += `<button class="btn" data-act="unequip">해제</button>`;
    }
    h += '</div>';
    return h;
  }

  // 파견소: 용병 여럿 · 지역 · 기간 · 챙길 물약/영약을 골라 보낸다
  guildPanel(gb) {
    const st = this.w.st, t = townOf(st), P = (this.party ||= { ids: [], pack: {} });
    const zones = ZONES.filter((z) => isLiberated(st, z.id));
    if (!zones.some((z) => z.id === P.zone)) P.zone = zones[0]?.id;
    if (!EXPEDITIONS.some((e) => e.id === P.exp)) P.exp = 'mid';
    P.ids = P.ids.filter((id) => t.mercs.some((m) => m.id === id && !m.job && !m.work));
    const zn = ZONES.find((z) => z.id === P.zone), sh = zn ? shelterLv(st, zn.id) : 0;
    const pack = Object.entries(P.pack).filter(([, q]) => q > 0).map(([base, qty]) => ({ base, qty })), boost = packBoost(pack);
    const back = t.mercs.filter((m) => m.job && Date.now() >= m.job.until).length;
    let h = `<div class="kv"><span>한 번에</span><b>${partyMax(st)}명</b><span>챙길 물건</span><b>${packMax(st)}개</b></div>`;
    if (back) h += `<div class="btns"><button class="btn gold" data-claimall="1">돌아온 용병 ${back}명 전리품 받기</button></div>`;
    const away = t.mercs.filter((m) => m.job && Date.now() < m.job.until);
    if (away.length) h += `<h3 style="margin-top:8px">파견 중</h3>` + away.map((m) => `<div class="row"><div class="grow"><b>${esc(m.name)}</b> <small class="note">${ZONES.find((z) => z.id === m.job.zone)?.name || ''} · ${Math.ceil((m.job.until - Date.now()) / 60000)}분</small>${gauge(m.job.from, m.job.until, 1800000, '#ffc860')}</div></div>`).join('');
    if (!zones.length) return h + '<div class="note">해방한 지역 없음</div>';
    h += `<h3 style="margin-top:8px">지역</h3><div class="btns" style="flex-wrap:wrap;margin:0">${zones.map((z) => `<button class="btn ${z.id === P.zone ? 'on' : ''}" data-pzone="${z.id}">${z.name}${shelterLv(st, z.id) ? ` · 쉼터 ${shelterLv(st, z.id)}` : ''}</button>`).join('')}</div>
      <div class="note">쉼터 ${sh}단계 · ${SHELTER.text(sh)}</div>`;
    h += `<h3 style="margin-top:8px">기간</h3><div class="btns" style="flex-wrap:wrap;margin:0">${EXPEDITIONS.map((e) => `<button class="btn ${e.id === P.exp ? 'on' : ''}" data-pexp="${e.id}" ${e.rest && sh < e.rest ? 'disabled' : ''}>${e.name} ${e.min >= 60 ? e.min / 60 + '시간' : e.min + '분'}${e.rest && sh < e.rest ? ` · 쉼터 ${e.rest}` : ''}</button>`).join('')}</div>`;
    const staNeed = Math.round(EXP_STA[P.exp] * (1 - SHELTER.sta * sh));
    h += `<h3 style="margin-top:8px">용병 <small>${P.ids.length} / ${partyMax(st)} · 체력 ${staNeed}</small></h3>`;
    h += t.mercs.filter((m) => !m.job && !m.work).map((m) => { const on = P.ids.includes(m.id), dc = zn ? deathChance(m, zn, P.exp, st, boost) : 0;
      return `<div class="row pick ${on ? 'on' : ''}" data-pm="${m.id}">${this.mercLine(m, 'hunt')}<div class="note" style="min-width:5.5em;color:${dc > 0.15 ? '#ff7060' : ''}">사망 ${Math.round(dc * 100)}%${m.sta < staNeed ? ` · <b style="color:#ff7060">체력 ${Math.floor(m.sta)} / ${staNeed}</b>` : ''}</div></div>`; }).join('') || '<div class="note">쉬는 용병 없음</div>';
    const goods = st.inv.filter((x) => ['potion', 'elixir'].includes(BASES[x.base]?.type));
    const tot = pack.reduce((a, p) => a + p.qty, 0);
    h += `<h3 style="margin-top:8px">챙길 물건 <small>${tot} / ${packMax(st)} · 안전 +${Math.round(boost.safe * 100)}% · 힘 +${Math.round(boost.pow * 100)}%</small></h3>`;
    h += goods.map((x) => `<div class="row"><div class="cell shopIco">${ico(x)}</div><div class="grow">${BASES[x.base].name} <small class="note">${x.qty}</small></div><button class="btn" data-ppack="${x.base}|-1">-</button><b style="min-width:1.6em;text-align:center">${P.pack[x.base] || 0}</b><button class="btn" data-ppack="${x.base}|1">+</button></div>`).join('') || '<div class="note">물약 · 영약 없음</div>';
    h += `<div class="btns"><button class="btn gold" data-psend="1" ${P.ids.length ? '' : 'disabled'}>파견 보내기</button></div>`;
    return h;
  }

  // 대장간: 능력치 파편으로 착용 장비의 옵션 하나를 바꾼다 (잠근 옵션은 그대로)
  shardPanel(smith) {
    const st = this.w.st, t = townOf(st);
    const shards = st.inv.filter((x) => x.shard);
    let h = `<h3 style="margin-top:8px">능력치 파편 <small>잠금 최대 ${lockMax(smith.lv)}개</small></h3>`;
    if (!shards.length) return h + '<div class="note">파편 없음</div>';
    if (!shards.some((x) => x.uid === this.shardSel)) this.shardSel = null;
    h += `<div class="btns" style="flex-wrap:wrap;margin:0 0 6px">${shards.map((x) => `<button class="btn ${x.uid === this.shardSel ? 'on' : ''}" data-shard="${x.uid}" style="color:#c58cff">${affixText(x.shard)}</button>`).join('')}</div>`;
    const sh = st.inv.find((x) => x.uid === this.shardSel)?.shard;
    if (!sh) return h;
    const targets = SLOTS.filter((sl) => st.equip[sl]?.affixes?.length);
    if (!targets.includes(this.shardTarget)) { this.shardTarget = targets[0]; this.shardLocks = []; }
    if (!targets.length) return h + '<div class="note">옵션이 있는 착용 장비 없음</div>';
    h += `<div class="btns" style="flex-wrap:wrap;margin:0 0 6px">${targets.map((sl) => `<button class="btn ${sl === this.shardTarget ? 'on' : ''}" data-starget="${sl}" style="color:${itemColor(st.equip[sl])}">${esc(itemName(st.equip[sl]))}</button>`).join('')}</div>`;
    const it = st.equip[this.shardTarget], L = this.shardLocks || [], max = lockMax(smith.lv), c = shardCost(it), ok = canApply(it, sh, L);
    h += it.affixes.map((a, k) => { const on = L.includes(k); return `<div class="row"><div class="grow aff" style="${on ? 'color:#ffd84a' : ''}">${affixText(a)}</div><button class="btn ${on ? 'on' : ''}" data-slock="${k}" ${!on && L.length >= max ? 'disabled' : ''}>${on ? '잠김' : '잠그기'}</button></div>`; }).join('');
    h += `<div class="btns"><button class="btn gold" data-sapply="1" ${!ok.ok || st.gold < c.gold || t.ore < c.ore ? 'disabled' : ''}>${ok.ok ? `바꾸기 · ${c.gold.toLocaleString()} G · 강화석 ${c.ore}` : ok.why}</button></div>`;
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

  // 창고: 계정 공용 (같은 계정의 캐릭터끼리 나눈다). 누르면 바로 옮긴다
  // 창고 | 고른 아이템 정보 + 넣기/빼기 | 가방. 누르면 고르고, 가운데 버튼으로 옮긴다
  vault() {
    const st = this.w.st, V = vault(), n = vaultSize(st), sel = this.vsel;
    const cur = sel?.from === 'v' ? V.items[sel.i] : sel?.from === 'b' ? st.inv.find((x) => x.uid === sel.uid) : null;
    if (sel && !cur) this.vsel = null;
    const on = (f, k) => (sel && sel.from === f && (f === 'v' ? sel.i === k : sel.uid === k) ? ' sel' : '');
    let left = `<h3>창고 <span class="cnt">${V.items.length}/${n}</span></h3><div class="grid">`;
    for (let i = 0; i < n; i++) { const it = V.items[i]; left += it ? `<div class="cell${rar(it)}${on('v', i)}" data-vsel="v|${i}">${ico(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : ''}</div>` : '<div class="cell"></div>'; }
    left += '</div>';
    let right = `<h3>가방 <span class="cnt">${st.inv.length}/${bagSize(st)}</span></h3><div class="grid">`;
    for (let i = 0; i < bagSize(st); i++) { const it = st.inv[i]; right += it ? `<div class="cell${rar(it)}${on('b', it.uid)}" data-vsel="b|${it.uid}">${ico(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : ''}</div>` : '<div class="cell"></div>'; }
    right += '</div>';
    const mid = cur ? `<div class="detail">${this.describe(cur, 'vault')}</div><div class="btns">${sel.from === 'v' ? `<button class="plate gold" data-vtake="${sel.i}">가방으로</button>` : `<button class="plate gold" data-vput="${sel.uid}">창고에 넣기</button>`}</div>` : '<div class="note">고른 아이템이 없습니다</div>';
    return `<div class="cols"><div class="frame" style="flex:1;overflow:auto">${left}</div><div class="frame" style="flex:0 0 28%">${mid}</div><div class="frame" style="flex:1;overflow:auto">${right}</div></div>`;
  }

  bagHead() {
    const st = this.w.st;
    return `<h3>가방 <span class="cnt">${st.inv.length}/${bagSize(st)}</span>${this.w.canShop ? '<button class="btn" data-selljunk="1" style="margin-left:auto">일반 · 마법 팔기</button>' : ''}<span class="goldTxt">${st.gold.toLocaleString()} G · ◆${townOf(st).ore.toLocaleString()}</span></h3>`;
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
      const max = false;
      const slot = st.quick.indexOf(id);
      list += `<div class="row pick${this.skillSel === id ? ' on' : ''}" data-skill="${id}">${sicon(id)}
        <div class="grow"><b>${sk.name}</b> <span style="color:${BOOK_TIERS[sk.tier].color};font-size:.8em">${BOOK_TIERS[sk.tier].name}</span>
          <div class="mini"><i style="width:${max ? 100 : (s.exp / skillExpNeeded(s.rank)) * 100}%;background:${sk.color}"></i></div></div>
        <div class="note">랭크 ${s.rank}${slot >= 0 ? ` · ${slot + 1}번` : ''}</div></div>`;
    }
    let det = '<div class="note">고른 스킬이 없습니다</div>';
    if (this.skillSel) {
      const id = this.skillSel, sk = SKILLS[id], s = st.skills[id];
      const mods = modsOf(s), v = skillValues(id, s.rank, mods), nx = skillValues(id, s.rank + 1, mods), e = skillEff(id, mods);
      const need = skillExpNeeded(s.rank), d = this.w.d || {};
      const isW = sk.ap === 'weapon', isBuff = sk.type === 'buff';
      const pw = (x) => isW ? `무기 피해 ×${x.toFixed(2)}` : `${Math.round(x * (d.spellMult || 1))}`;
      const kv = [];
      if (!isBuff) kv.push(['위력', pw(v.power)], ['다음 랭크', pw(nx.power)]);
      else kv.push(['효과', `${Math.round(v.power)}${/Pct$/.test(sk.buff || '') ? '%' : ''}`], ['다음 랭크', `${Math.round(nx.power)}${/Pct$/.test(sk.buff || '') ? '%' : ''}`]);
      kv.push(['MP', v.mp], ['재사용', `${v.cd.toFixed(1)}초`]);
      if (e.range) kv.push(['사거리', e.range.toFixed(1)]);
      if (e.radius) kv.push(['범위', e.radius.toFixed(1)]);
      if (e.width) kv.push(['너비', e.width.toFixed(1)]);
      if (e.count) kv.push(['수', e.count]);
      if (e.jumps) kv.push(['연쇄', e.jumps]);
      if (e.waves) kv.push(['파동', e.waves]);
      if (e.hits) kv.push(['타수', e.hits]);
      if (e.duration) kv.push(['지속', `${e.duration}초`]);
      if (e.slow) kv.push(['느리게', `${e.slow}초`]);
      if (e.echo) kv.push(['메아리', `${e.echo * 100}%`]);
      kv.push(['숙련', `${Math.floor(s.exp).toLocaleString()} / ${need.toLocaleString()}`]);
      const V = variantsOf(id);
      det = `<div class="row" style="border:0">${sicon(id)}<div class="grow"><div class="nm" style="color:${BOOK_TIERS[sk.tier].color}">${sk.name}</div>
          <div class="sub">${BOOK_TIERS[sk.tier].name} · 랭크 ${s.rank}</div></div></div>
        <div>${sk.desc.replace(/\s*\([^)]*\)/g, '')}</div>
        <div class="kv" style="margin-top:8px">${kv.map(([k, x]) => `<span>${k}</span><b>${x}</b>`).join('')}</div>
        ${reqLine(sk.req, stats)}${meetsReq(st, sk.req, stats) ? '' : '<div class="bad">조건 부족</div>'}
        <h3 style="margin-top:10px">변형</h3>${VARIANT_RANKS.map((r) => `<div class="note">랭크 ${r}</div><div class="btns" style="flex-wrap:wrap;margin:2px 0 6px">${V[r].map((x) => {
          const on = s.mod?.[r] === x.key, can = s.rank >= r && !s.mod?.[r];
          return `<button class="btn${on ? ' on' : ''}" data-var="${r}|${x.key}" ${can ? '' : 'disabled'}>${x.name.split(': ')[1]}<small style="display:block;font-size:.7em;opacity:.8">${x.text}</small></button>`; }).join('')}</div>`).join('')}
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
    const atGuard = this.townMode === 'build', claimable = dl.list.some((x) => x.done && !x.got);
    let list = `<h3>오늘의 의뢰${claimable ? `<button class="btn gold" data-daily="1" style="margin-left:auto" ${atGuard ? '' : 'disabled'}>${atGuard ? '보상 받기' : '경비대장에게 보고'}</button>` : ''}</h3>` + dl.list.map((x) => { const r = dailyReward(x, st);
      return `<div class="row qrow${x.done ? ' fin' : ''}"><div class="grow">${dailyText(x)}<div class="note">${r.gold}G${r.ore ? ` · 강화석 ${r.ore}` : ''}${r.key ? ' · 던전 열쇠' : ''}</div></div><span class="note">${x.got ? '받음' : x.done ? '완료' : `${x.have} / ${x.need}`}</span></div>`; }).join('');
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
    const k = this.gsec || 0;
    // 그림은 실제 게임 화면(assets/guide). 번호는 그림 속 금색 표시와 짝이 맞는다
    const S = [
      ['화면 보기', 'hud', ['체력 · 마나', '내 캐릭터: 칭호 · 이름 · 체력 · 마나. 체력이 낮으면 깜빡입니다', '퀘스트: 진행 중인 퀘스트와 오늘의 의뢰', '기록: 지역 정보 · 얻은 것', '미니맵', '메뉴: 가방 · 스킬 · 능력 · 퀘스트 · 설정', '스킬 칸', '공격 버튼', '조이스틱: 만질 때만 보입니다']],
      ['버튼', 'buttons', ['귀환: 마을로 돌아갑니다', '자동 사냥: 켠 지역 안에서만 사냥하고 장애물을 돌아갑니다. 얻는 것이 조금 줄어듭니다', '마나 물약', '체력 물약', '공격. 사람 · 건물 · 포탈 · 창고 앞에서는 그 이름으로 바뀝니다', '스킬. 스킬 창에서 칸을 정합니다']],
      ['미니맵 표시', 'minimap', ['빨간 점: 몬스터 · 주황 점: 정예 · 네임드 · 금색 마름모: 보스 · 하늘색 고리: 포탈 · 초록 세모: 던전 입구 · 노란 테: 마을']],
      ['NPC와 대화', 'talk', ['경비대장 하겐: 퀘스트 보고 · 오늘의 의뢰 보상 · 건물 짓기', '가까이 가면 공격 버튼이 이름으로 바뀝니다. 누르면 대화. 상인 오르텐은 상점, 보석상 리엔은 보석, 현자는 도감']],
      ['건물 쓰기', 'building', ['지은 건물', '건물 앞에서 버튼이 건물 이름으로 바뀝니다. 누르면 그 건물 창이 열립니다']],
      ['포탈', 'portal', ['마을 · 발견한 야영지의 포탈', '포탈 위에서 버튼을 눌러 갈 곳을 고릅니다']],
      ['공용 창고', 'vaultspot', ['상인 옆 공용 창고 상자', '상자 앞에서 버튼을 누르면 창고가 열립니다']],
      ['창고', 'vault', ['창고: 같은 계정의 캐릭터끼리 함께 씁니다. 100칸, 연구 「큰 창고」로 늘어납니다', '가방'], ['아이템을 누르면 가운데에 정보가 보이고, 버튼으로 옮깁니다']],
      ['가방 · 장비', 'inv', ['착용 장비', '고른 아이템 정보 · 능력치 변화. 물약은 여기서 체력 · 마나 칸에 두거나 뺍니다', '가방: 강화석 · 지역 재료도 아이템으로 들어옵니다. 창고에 넣어도 강화 · 건물에 쓰입니다', '금화 · 강화석', '창 탭']],
      ['스킬', 'skills', ['배운 스킬. 쓸수록 랭크가 오릅니다. 랭크 제한은 없고 50부터 느려집니다', '위력 · 다음 랭크 · MP · 재사용 · 범위', '변형: 랭크 25 · 50에서 하나씩 고릅니다', '퀵슬롯: 칸을 누르면 넣습니다. 이미 있는 스킬은 자리가 바뀝니다']],
      ['능력 · 각성', 'char', ['능력치: 행동에 따라 오릅니다. 칼을 휘두르면 힘, 주문을 쓰면 지능, 맞으면 체력', '세부 능력치. 각성마다 성향에 맞는 칭호와 특성을 고릅니다']],
      ['퀘스트 · 오늘의 의뢰', 'quest', ['메인 퀘스트', '오늘의 의뢰 보상 받기: 경비대장 하겐 앞에서만', '오늘의 의뢰 3개 · 지역별 퀘스트']],
      ['건물 짓기', 'build', ['집터와 건물', '단계 올리기', '단계별 금화 · 재료 · 각성 · 걸리는 시간']],
      ['대장간', 'smithy', ['강화: 실패해도 단계는 그대로, 실패할수록 장인의 기운이 쌓입니다', '재련 · 능력치 파편 · 분해']],
      ['제작소', 'workshop', ['약초', '만드는 중', '다 만든 것을 가방이나 창고로', '만들기: 시간이 걸립니다. 다섯 개까지 줄을 세웁니다']],
      ['파견소 · 용병', 'guild', ['보낼 지역', '기간. 건물에서 일하는 용병은 보낼 수 없습니다']],
      ['여관', 'inn', ['찾아온 용병 고용. 매 시간 바뀝니다']],
      ['연구소', 'lab', ['연구 진행', '연구 시작']],
      ['상점', 'shop', ['파는 물건', '가방: 팔 수 있습니다']],
      ['지도', 'map', ['갈 곳', '지도. 가 본 곳만 밝혀집니다']],
      ['던전', 'dungeon', ['던전 지도', '단계'], ['오늘의 의뢰 · 보스가 가끔 주는 열쇠로 들어갑니다', '가장 깊은 곳의 우두머리를 잡으면 다음 단계가 열립니다', '돌파하면 공격 버튼이 나가기로 바뀝니다. 전리품을 줍고 눌러 나갑니다']],
      ['보스', 'boss', ['색칠된 곳에 곧 공격이 들어옵니다. 가운데부터 차오르면 터집니다'], ['멀리서 맴돌면 뛰어들기 · 저격 같은 원거리 공격을 합니다', '보스마다 고유한 공격이 있습니다']],
      ['설정', 'menu', ['화면 확대', 'UI 위치 바꾸기']],
      ['그 밖에', null, [], ['죽으면 가끔 장비 하나를 그 자리에 떨어뜨립니다. 다시 가서 주워야 합니다', '세계 단계: 평온 → 악몽 → 지옥. 오를수록 몬스터가 세지고 좋은 장비가 나옵니다', '도감: 몬스터를 잡으면 채워지고 보너스를 받습니다', '능력치 파편: 장비를 갈아 낄 때 · 보스에게서 가끔. 대장간에서 장비 옵션 하나와 바꿉니다']],
    ];
    const [t, img, nums, more = []] = S[Math.min(k, S.length - 1)];
    const li = nums.map((l, i) => `<li><b class="gnum">${i + 1}</b>${l}</li>`).join('') + more.map((l) => `<li>${l}</li>`).join('');
    return `<div class="cols"><div class="frame" style="flex:0 0 18%">${S.map((x, i) => `<button class="btn gsec${i === k ? ' on' : ''}" data-gsec="${i}">${x[0]}</button>`).join('')}</div>
      ${img ? `<div class="frame gshot" style="flex:0 0 52%"><img src="assets/guide/${img}.webp" alt="" /></div>` : ''}
      <div class="frame" style="flex:1"><h3>${t}</h3><ul class="glist">${li}</ul></div></div>`;
  }

  // 용병 한 줄: 이름 · 등급 · 레벨 · 각성 · 솜씨 · 체력
  mercLine(m, hi) {
    const g = GRADES[m.grade || 0], sm = staMax(m);
    const sk = SKILLS_ALL.map((k) => `<span style="${k === hi ? 'color:#ffd84a;font-weight:700' : ''}">${SKILL_NAMES[k]} ${(m[k] || 0).toFixed(1)}</span>`).join(' · ');
    return `<div class="grow"><b style="color:${g.color}">${esc(m.name)}</b> <small>${g.name} · Lv ${m.lv}${m.aw ? ` · 각성 ${m.aw}` : ''}${m.gear ? ` · 장비 ${m.gear.ilvl}` : ''}</small>
      <div class="note">${sk}</div><div class="mini" style="height:5px;max-width:12em"><i style="width:${Math.round((m.sta / sm) * 100)}%;background:#6ad07a"></i></div></div>`;
  }

  // 창 위에 뜨는 알림 (확인을 눌러 닫는다)
  alert(title, text = '') {
    document.getElementById('winAlert')?.remove();
    const el = document.createElement('div');
    el.id = 'winAlert';
    el.innerHTML = `<div><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}<button class="plate gold">확인</button></div>`;
    el.querySelector('button').onclick = () => { audio.play('click'); el.remove(); };
    document.body.appendChild(el);
  }

  keysPanel() {
    const m = keyMap(this.w.st);
    return `<h3>단축키 <button class="btn" data-keyreset="1">처음대로</button></h3><div class="keygrid">${KEY_ACTIONS.map(([id, nm]) =>
      `<span>${nm}</span><button class="btn${this.waitKey === id ? ' gold' : ''}" data-bind="${id}">${this.waitKey === id ? '키 입력…' : keyName(m[id])}</button>`).join('')}</div>`;
  }

  map() {
    const w = this.w, st = w.st, P = w.player.pos, here = this.portalAt;
    const zoom = (this.mapZoom ||= here ? 2 : 1), V0 = Math.max(240, Math.min(560, window.innerHeight - 110)), V = Math.round(V0 * zoom), k = V / MAP_W, X = (x) => ((x + MAP_R) * k).toFixed(1), Y = (z) => ((z + MAP_R) * k).toFixed(1);
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
    let side = `<div class="note">${here ? '이동할 곳' : '포탈 위에 서면 발견한 야영지로 이동할 수 있습니다'}</div>`;
    if (k2) side += `<h3 style="margin-top:10px">야영지 시설</h3>
      <div class="row"><div class="grow"><b>떠돌이 상인</b><div class="note">사고팔기</div></div><button class="btn" data-camp="${cz}|merchant" ${k2.merchant || st.gold < 5000 ? 'disabled' : ''}>${k2.merchant ? '있음' : '5,000 G'}</button></div>
      <div class="row"><div class="grow"><b>모닥불</b><div class="note">야영지에서 빨리 회복</div></div><button class="btn" data-camp="${cz}|fire" ${k2.fire || st.gold < 2000 ? 'disabled' : ''}>${k2.fire ? '있음' : '2,000 G'}</button></div>
      <div class="row"><div class="grow"><b>용병 쉼터</b> <small>${k2.rest || 0} / ${SHELTER.max}</small><div class="note">이 지역 파견: ${SHELTER.text(k2.rest || 0)}</div></div>${(k2.rest || 0) < SHELTER.max ? `<button class="btn" data-shelter="${cz}" ${st.gold < SHELTER.cost(k2.rest || 0) ? 'disabled' : ''}>${(k2.rest || 0) ? '올리기' : '짓기'} ${SHELTER.cost(k2.rest || 0).toLocaleString()} G</button>` : ''}</div>`;
    side += `<div class="note" style="margin-top:10px">발견한 야영지 ${Object.keys(st.camps || {}).length} / ${CAMPS.length}</div>`;
    // 왼쪽: 포탈로 갈 수 있는 곳 (마을 + 발견한 야영지) — 지도에서 겹쳐도 여기서 고른다
    const dests = [{ id: 'town', name: '여명 초소', lv: '마을' }, ...CAMPS.filter((c) => st.camps?.[c.zone]).map((c) => { const zn = ZONES.find((z) => z.id === c.zone); return { id: c.zone, name: zn.name, lv: `${zn.levels[0]}~${zn.levels[1]}`, l0: zn.levels[0] }; }).sort((a, b) => a.l0 - b.l0)];
    const list = `<h3>${here ? '포탈 목적지' : '발견한 포탈'}</h3>` + dests.map((d) => `<button class="btn dest${d.id === here ? ' on' : ''}" ${here && d.id !== here ? `data-travel="${d.id}"` : 'disabled'}><b>${d.name}</b><small>${d.id === here ? '지금 여기' : d.lv}</small></button>`).join('');
    const zb = `<div class="mapZoom"><button class="btn" data-mzoom="-1">−</button><span>×${zoom}</span><button class="btn" data-mzoom="1">+</button></div>`;
    return `<div class="cols"><div class="frame destList" style="flex:0 0 15em;overflow:auto">${list}</div><div class="frame mapFrame" style="flex:1;overflow:auto;position:relative">${zb}<div class="wmap${zoom >= 1.6 ? ' big' : ''}" style="width:${V}px;height:${V}px"><canvas class="wmc" width="${V}" height="${V}"></canvas>${pins.join('')}</div></div><div class="frame" style="flex:0 0 15em;overflow:auto">${side}</div></div>`;
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
    clearTimeout(this.townTick); this.townTick = setTimeout(() => { if (this.kind === 'town') this.refresh(); }, 1000); // 게이지가 차오르게
    tick(st);
    const sel = this.townSel || PLOTS[0].id;
    const b = buildingAt(st, sel);
    const one = this.townMode === 'one', bmode = this.townMode === 'build';
    const left = PLOTS.map((pl) => {
      const x = t.plots[pl.id];
      const def = x && BUILDINGS[x.type];
      const stock = def?.rate ? `<div class="mini"><i style="width:${(x.stock / def.store(x.lv)) * 100}%;background:linear-gradient(#ffe7a0,#c99a3a)"></i></div>` : '';
      return `<div class="row pick${pl.id === sel ? ' on' : ''}" data-plot="${pl.id}"><div class="grow"><b>${def ? `${def.name} <small>${x.lv}단계</small>` : '빈터'}</b><div class="note">${def ? def.desc : pl.name}</div>${stock}</div>
        ${def?.rate ? `<span class="note">${Math.floor(x.stock)} / ${def.store(x.lv)}</span>` : ''}</div>`;
    }).join('');
    let right = '';
    if (!b) {
      right = `<h3>무엇을 지을까</h3>` + Object.entries(BUILDINGS).sort((a, c) => (a[1].need || 0) - (c[1].need || 0)).map(([k, d]) => {
        const has = Object.values(t.plots).some((q) => q.type === k);
        const lock = (st.awakenings || 0) < (d.need || 0);
        return `<div class="row"><div class="grow"><b>${d.name}</b><div class="note">${d.desc}</div></div><button class="btn" data-build="${k}" ${has || lock || st.gold < d.cost(0) ? 'disabled' : ''}>${has ? '지음' : lock ? `각성 ${d.need}` : `${d.cost(0).toLocaleString()} G · ${buildTime(1) / 60000}분`}</button></div>`;
      }).join('');
    } else {
      const def = BUILDINGS[b.type], up = def.cost(b.lv);
      const um = up == null ? null : upgradeMats(b.lv), umOk = !um || (t.mats[um.zone] || 0) >= um.n;
      const an = def.up?.[b.lv - 1] ?? 0, anOk = (st.awakenings || 0) >= an;
      const fmtT = (ms) => ms >= 3600000 ? `${ms / 3600000}시간` : `${Math.round(ms / 60000)}분`;
      // 단계별 비용표: 금화 · 재료 · 각성 · 시간
      const costTable = `<h3 style="margin-top:8px">단계별 비용</h3><div class="kv costT">` + Array.from({ length: def.max }, (_, i) => i).map((lv) => {
        const g = def.cost(lv), m = lv ? upgradeMats(lv) : null, aw = lv ? def.up?.[lv - 1] ?? 0 : def.need || 0;
        return `<span${b.lv === lv + 1 ? ' style="color:#ffd84a"' : ''}>${lv + 1}단계</span><b>${g.toLocaleString()} G${m ? ` · ${MATERIALS[m.zone].name} ${m.n}` : ''} · 각성 ${aw} · ${fmtT(buildTime(lv + 1))}</b>`;
      }).join('') + '</div>';
      if (b.bld) right = `<h3>${def.name} · ${b.bld.to === 1 ? '짓는 중' : `${b.bld.to}단계로 올리는 중`} <small class="note">${fmtT(Math.max(60000, b.bld.until - Date.now()))}</small></h3>${gauge(b.bld.from, b.bld.until, 60000, '#ffd84a')}` + (bmode ? costTable : '');
      else right = `<h3>${def.name} · ${b.lv}단계</h3>` + (one ? '' : `<div class="btns" style="margin:0 0 8px"><button class="btn" data-upgrade="1" ${up == null || st.gold < up || !umOk || !anOk ? 'disabled' : ''}>${up == null ? '최고 단계' : !anOk ? `각성 ${an} 필요` : `단계 올리기 ${up.toLocaleString()} G${um ? ` · ${MATERIALS[um.zone].name} ${um.n}` : ''}`}</button></div><div class="note">${def.desc}</div>`);
      if (bmode && !b.bld) right += costTable;
      if (!bmode && !(b.bld?.to === 1)) {
      if (b.type === 'workshop') {
        right += `<div class="herbBar">${HERB_IDS.map((h) => `<span class="hb" title="${HERBS[h].name}"><img src="${herbIcon(h)}" alt="" />${t.herbs[h] || 0}</span>`).join('')}</div>`;
        const q = t.brew || [], ready = q.filter((x) => x.until <= Date.now()).length;
        if (q.length) right += `<h3>제작 중 <span class="cnt">${q.length} / ${BREW_QUEUE}</span>${ready ? '<button class="btn gold" data-brewget="bag" style="margin-left:auto">가방으로</button><button class="btn gold" data-brewget="vault">창고로</button>' : ''}</h3>` + q.map((x) => `<div class="row"><div class="cell shopIco">${ico({ base: x.id })}</div><div class="grow"><b>${BASES[x.id].name} ×${x.n}</b> <small class="note">${x.until <= Date.now() ? '완성' : `${Math.ceil((x.until - Date.now()) / 1000)}초`}</small>${gauge(x.from, x.until, 60000, '#7fe07a')}</div></div>`).join('');
        for (const rc of RECIPES) {
          const open = rc.lv <= b.lv, can = (k) => open && Object.entries(rc.herbs).every(([h, q]) => (t.herbs[h] || 0) >= q * k) && st.gold >= brewGold(st, rc) * k;
          const it = { base: rc.id }, E = ELIXIRS[rc.id], fx = E ? E.text : BASES[rc.id].restore.hp ? `HP ${BASES[rc.id].restore.hp}` : `MP ${BASES[rc.id].restore.mp}`;
          right += `<div class="row" style="${open ? '' : 'opacity:.45'}"><div class="cell shopIco">${ico(it)}</div><div class="grow"><b>${BASES[rc.id].name}${rc.n > 1 ? ` ×${rc.n}` : ''}</b> <small class="note">${fx}</small>
            <div class="note">${open ? Object.entries(rc.herbs).map(([h, q]) => `${HERBS[h].name} ${q}`).join(' · ') + ` · ${brewGold(st, rc)} G · ${brewTime(rc) / 1000}초` : `제작소 ${rc.lv}단계`}</div></div>
            ${open ? `<button class="btn" data-brew="${rc.id}|1" ${can(1) ? '' : 'disabled'}>만들기</button><button class="btn" data-brew="${rc.id}|5" ${can(5) ? '' : 'disabled'}>×5</button>` : ''}</div>`;
        }
      }
      if (b.type === 'herb') right += `<div class="herbBar">${herbsAt(5).map((h) => `<span class="hb" style="${HERBS[h].lv <= b.lv ? '' : 'opacity:.35'}" title="${HERBS[h].name}${HERBS[h].lv <= b.lv ? '' : ` · ${HERBS[h].lv}단계`}"><img src="${herbIcon(h)}" alt="" />${HERBS[h].lv <= b.lv ? t.herbs[h] || 0 : HERBS[h].lv + '단계'}</span>`).join('')}</div>`;
      if (b.type === 'guild') right += this.guildPanel(b);
      if (SKILL_OF[b.type]) {
        const sk = SKILL_OF[b.type], crew = t.mercs.filter((m) => m.work === sel), idle = t.mercs.filter((m) => !m.work && !m.job);
        const eff = crew.filter((m) => !m.tired).reduce((a, m) => a + (m[sk] || 0) / 10, 0) / b.lv;
        right += `<h3>일하는 용병 ${crew.length} / ${b.lv} <small>${SKILL_NAMES[sk]} · ${def.rate ? `생산 ${Math.round(Math.min(2, eff) * 100)}%` : BONUS[b.type].text(bonusOf(st, b.type))}</small></h3>`;
        right += crew.map((m) => `<div class="row">${this.mercLine(m, sk)}<button class="btn" data-mwork="${m.id}|">쉬게</button></div>`).join('') || `<div class="note">${def.rate ? '일하는 용병이 없으면 생산하지 않습니다' : '없음'}</div>`;
        if (crew.length < b.lv && idle.length) right += `<div class="note" style="margin-top:6px">쉬는 용병</div>` + idle.sort((a, c) => (c[sk] || 0) - (a[sk] || 0)).map((m) => `<div class="row">${this.mercLine(m, sk)}<button class="btn" data-mwork="${m.id}|${sel}">일 맡기기</button></div>`).join('');
      }
      if (def.rate) right += `<div class="kv"><span>생산</span><b>시간당 ${Math.round(def.rate(b.lv) * Math.min(1, t.mercs.filter((m) => m.work === sel && !m.tired).reduce((a, m) => a + m[b.type] / 10, 0) / b.lv) * 1)}</b><span>쌓인 양</span><b>${Math.floor(b.stock)} / ${def.store(b.lv)}</b></div>
        <div class="btns"><button class="btn gold" data-collect="1" ${b.stock < 1 ? 'disabled' : ''}>거두기</button></div>`;
      if (b.type === 'smithy') {
        const cap = enhanceCap(st);
        right += `<div class="note">강화 상한 +${cap} · 실패해도 단계 유지 · 실패하면 장인의 기운이 쌓이고 100%면 반드시 성공</div>`;
        for (const slot of SLOTS) {
          const it = st.equip[slot];
          if (!it) continue;
          const c = enhanceCost(it, st), max = (it.plus || 0) >= cap, rc = reforgeCost(it);
          right += `<div class="row"><div class="cell shopIco${rar(it)}">${ico(it)}</div><div class="grow"><b style="color:${itemColor(it)}">${esc(itemName(it))}</b>
            <div class="note">${max ? '상한' : `+${(it.plus || 0) + 1} · ${c.jang >= 1 ? '<b style="color:#ffd84a">100%</b>' : `${+(c.chance * 100).toFixed(1)}%`} · 장인의 기운 ${+(c.jang * 100).toFixed(1)}% · ${c.gold.toLocaleString()} G · 강화석 ${c.ore}`}</div></div>
            <button class="btn" data-enh="${slot}" ${max || st.gold < c.gold || t.ore < c.ore ? 'disabled' : ''}>강화</button>${it.affixes?.length ? `<button class="btn" data-reforge="${slot}" title="가장 약한 옵션 다시 굴리기 · ${rc.gold.toLocaleString()}G · 강화석 ${rc.ore}" ${st.gold < rc.gold || t.ore < rc.ore ? 'disabled' : ''}>재련</button>` : ''}</div>`;
        }
        right += this.shardPanel(b);
        const junk = st.inv.filter((x) => !x.book && BASES[x.base]?.slot && !x.named);
        if (junk.length) right += `<h3 style="margin-top:8px">분해 <button class="btn" data-salvageall="1">일반 · 마법 모두</button></h3>` + junk.map((x) => { const v = salvageValue(x); return `<div class="row"><div class="cell shopIco${rar(x)}">${ico(x)}</div><div class="grow"><b style="color:${itemColor(x)}">${esc(itemName(x))}</b><div class="note">강화석 ${v.ore} · ${MATERIALS[v.mat].name} ${v.matN}</div></div><button class="btn" data-salvage="${x.uid}">분해</button></div>`; }).join('');
      }
      if (b.type === 'lab') {
        if (t.lab) right += `<div class="note">연구 중: ${RESEARCH[t.lab.id].name} · ${Math.max(1, Math.ceil((t.lab.until - Date.now()) / 60000))}분 남음</div>${gauge(t.lab.from, t.lab.until)}`;
        for (const [id, r] of Object.entries(RESEARCH)) {
          const lv = researchLv(st, id), c = researchCost(lv, id), max = lv >= RESEARCH_MAX, open = b.lv >= r.lab;
          right += `<div class="row" style="${open ? '' : 'opacity:.45'}"><div class="grow"><b>${r.name}</b> <small>${lv} / ${RESEARCH_MAX}</small><div class="note">${open ? `${lv ? r.text(lv) : '없음'}${max ? '' : ` → ${r.text(lv + 1)}`}` : `연구소 ${r.lab}단계 · ${r.text(1)}`}</div></div>
            ${open ? `<button class="btn" data-research="${id}" ${max || t.lab || st.gold < c.gold ? 'disabled' : ''}>${max ? '완료' : `${c.gold.toLocaleString()}G · ${c.min}분`}</button>` : ''}</div>`;
        }
      }
      if (b.type === 'house') right += `<div class="kv"><span>고용 한도</span><b>${mercSlots(st)}명</b><span>지금</span><b>${t.mercs.length}명</b></div>`;
      if (b.type === 'inn') {
        const zones = ZONES.filter((z) => isLiberated(st, z.id)), rec = recruits(st), slots = mercSlots(st);
        const nextH = Math.ceil((3600000 - (Date.now() % 3600000)) / 60000);
        const gw = BUILDINGS.inn.grades(b.lv), gs = gw.reduce((a, v) => a + v, 0);
        right += `<h3>찾아온 용병 <small>${nextH}분 뒤 바뀜 · 고용 ${t.mercs.length} / ${slots}</small></h3><div class="note">${GRADES.map((g, i) => `<span style="color:${g.color}">${g.name} ${Math.round((gw[i] / gs) * 100)}%</span>`).join(' · ')}</div>`;
        right += rec.map((m) => `<div class="row">${this.mercLine(m)}<button class="btn gold" data-hirem="${m.id}" ${t.mercs.length >= slots || st.gold < m.cost ? 'disabled' : ''}>${m.cost.toLocaleString()} G</button></div>`).join('') || '<div class="note">없음</div>';
        right += `<h3 style="margin-top:8px">내 용병</h3>`;
        t.mercs.forEach((m) => {
          const left = m.job ? Math.max(0, m.job.until - Date.now()) : 0, where = m.work && t.plots[m.work] ? BUILDINGS[t.plots[m.work].type].name : '';
          const state = m.job ? (left > 0 ? `${ZONES.find((z) => z.id === m.job.zone).name} 파견 · ${Math.ceil(left / 60000)}분` : '돌아옴') : m.tired ? '지쳐서 쉬는 중' : where ? `${where}에서 일함` : '쉬는 중';
          right += `<div class="row">${this.mercLine(m)}<div class="note" style="min-width:7em">${state}${m.job && left > 0 ? gauge(m.job.from, m.job.until, 1800000, '#ffc860') : ''}</div>
            ${m.job && left <= 0 ? `<button class="btn gold" data-claim="${m.id}">전리품</button>` : ''}
            ${m.lv >= MERC.lvMax && (m.aw || 0) < MERC.awMax ? `<button class="btn gold" data-mawk="${m.id}" ${st.gold < awakenCost(m) ? 'disabled' : ''}>각성 ${awakenCost(m).toLocaleString()}G</button>` : ''}
            ${!m.job ? `<button class="btn" data-mgear="${m.id}">장비</button><button class="btn danger" data-mfire="${m.id}">내보내기</button>` : ''}</div>`;
        });
      }
      }
    }
    if (one) return `<div class="cols"><div class="frame detail" style="flex:1">${right}</div></div>`;
    return `<div class="cols"><div class="frame" style="flex:0 0 40%"><h3>마을 <span class="goldTxt">${st.gold.toLocaleString()} G</span></h3><div class="note" style="display:flex;gap:6px;align-items:center"><img src="${oreIcon()}" style="width:1.6em" alt="" />강화석 ${t.ore}</div><div class="note">용병 ${t.mercs.length} / ${mercSlots(st)} · 쉬는 ${t.mercs.filter((m) => !m.work && !m.job).length}</div><div class="note">${Object.entries(t.mats).filter(([, n]) => n > 0).map(([k, n]) => `${MATERIALS[k].name} ${n}`).join(' · ')}</div>${left}</div>
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
      list += `<div class="row shopRow"><div class="cell shopIco">${ico({ base: id, rarity: 'common' })}</div><div class="grow"><b>${b.name}</b><div class="note">${desc}</div></div>
        <div class="buys">${qty.map((q) => `<button class="btn" data-buy="${id}" data-q="${q}" ${st.gold < b.price * q ? 'disabled' : ''}>${q > 1 ? `×${q} ` : ''}${(b.price * q).toLocaleString()}G</button>`).join('')}</div></div>`;
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
        <div class="btns" style="margin:0 0 6px"><button class="plate gold" data-close="1">계속하기</button><button class="plate" data-title="1">메인 화면으로</button></div>
        <div class="setRow"><span>닉네임</span><div class="opts"><b>${esc(st.nick || '없음')}</b><button class="btn" data-nick="1">바꾸기</button></div></div>
        <div class="setRow"><span>배경음</span><div class="opts">${vol('music')}</div></div>
        <div class="setRow"><span>효과음</span><div class="opts">${vol('sfx')}</div></div>
        <div class="setRow"><span>어둠 · 조명</span><div class="opts">${onoff('shadows', set.shadows)}</div></div>
        <div class="setRow"><span>UI 전체 크기</span><div class="opts">${uiSlider('scale', 0.7, 1.4)}</div></div>
        <div class="setRow"><span>화면 확대</span><div class="opts">${uiSlider('zoom', 0.6, 1.6)}</div></div>
        <div class="setRow"><span>조이스틱 크기</span><div class="opts">${uiSlider('joy', 0.6, 1.6)}</div></div>
        <div class="setRow"><span>단추 크기</span><div class="opts">${uiSlider('btn', 0.6, 1.6)}</div></div>
        <div class="setRow"><span>단추 투명도</span><div class="opts">${uiSlider('alpha', 0.3, 1)}</div></div>
        <div class="setRow"><span>UI 위치</span><div class="opts"><button class="btn" data-uiedit="1">위치 편집</button><button class="btn" data-uireset="1">처음대로</button></div></div>
        <div class="setRow"><span>세계 단계</span><div class="opts">${TIER_NAMES.map((n, i) => `<button class="btn${(st.worldTier || 1) === i + 1 ? ' on' : ''}" data-tier="${i + 1}" ${i + 1 > (st.maxTier || 1) ? 'disabled' : ''}>${n}${i + 1 > (st.maxTier || 1) ? ' · 잠김' : ''}</button>`).join('')}</div></div>
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
      if (i < 0) { if (cur >= 0) st.quick[cur] = null; } // 빼기: 그 칸만 비운다 (뒤 칸이 밀리지 않는다)
      else if (cur >= 0) { const o = st.quick[i]; st.quick[i] = id; st.quick[cur] = o ?? null; } // 이미 퀵슬롯에 있으면 자리 바꾸기
      else st.quick[i] = id;
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
    on('[data-daily]', () => { w.claimDaily(); this.render(); });
    on('[data-turnin]', () => {
      const r = questTurnIn(st, bagSize(st));
      if (r.bagFull) { audio.play('error'); this.alert('가방이 가득 찼습니다', `보상을 받으려면 가방 ${r.need}칸이 필요합니다`); return; }
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
    on('[data-collect]', () => { const r = collect(st, this.townSel); if (r?.n) { audio.play('coin'); w.ui.toast(r.got ? `약초: ${Object.entries(r.got).map(([h, q]) => `${HERBS[h].name} ${q}`).join(' · ')}` : `${r.what} ${r.n}개를 거뒀습니다`, '#7fe07a'); } w.ui.dirty(); this.render(); });
    on('[data-enh]', (el) => {
      const it = st.equip[el.dataset.enh], r = enhance(st, it);
      if (!r.ok) { w.ui.toast(r.why); audio.play('error'); }
      else if (r.success) { audio.play('awaken'); w.fx.pillar(w.player.pos.x, w.player.pos.z, 0xffd060, 0.8); w.ui.toast(`강화 성공! +${r.plus}`, '#ffd84a'); w.refreshGear(); }
      else { audio.play('error'); w.ui.toast(`강화 실패 · 장인의 기운 ${+((r.jang || 0) * 100).toFixed(1)}%`); }
      w.ui.dirty(); this.render();
    });
    on('[data-hirem]', (el) => townDone(hire(st, el.dataset.hirem), '용병을 고용했습니다'));
    on('[data-mwork]', (el) => { const [id, pl] = el.dataset.mwork.split('|'); townDone(assignMerc(st, id, pl || null)); });
    on('[data-mawk]', (el) => { const r = awakenMerc(st, el.dataset.mawk); if (r.ok) audio.play('awaken'); townDone(r, '용병이 각성했습니다'); });
    on('[data-mfire]', (el) => { if (confirm('이 용병을 내보낼까요?')) townDone(dismiss(st, el.dataset.mfire)); });
    on('[data-tier]', (el) => { w.setTier(Number(el.dataset.tier)); this.render(); });
    on('[data-travel]', (el) => { this.portalAt = null; this.mapZoom = null; this.close(); w.travel(el.dataset.travel); });
    on('[data-mzoom]', (el) => { const Z = [1, 1.6, 2.4, 3.2], i = Math.max(0, Math.min(Z.length - 1, Z.indexOf(this.mapZoom || 1) + Number(el.dataset.mzoom))); this.mapZoom = Z[i]; this.mapCenter = true; audio.play('click'); this.render(); });
    on('[data-camp]', (el) => { const [z, what] = el.dataset.camp.split('|'); const r = w.buildCamp(z, what); if (!r.ok && r.why) w.ui.toast(r.why); w.ui.dirty(); this.render(); });
    on('[data-salvage]', (el) => { const r = salvage(st, Number(el.dataset.salvage)); if (r.ok) { audio.play('coin'); w.ui.toast(`분해: 강화석 ${r.ore} · ${MATERIALS[r.mat].name} ${r.matN}`, '#ffd84a'); } townDone(r); });
    on('[data-salvageall]', () => { let n = 0; for (const x of [...st.inv]) if (!x.book && BASES[x.base]?.slot && ['common', 'magic'].includes(x.rarity) && salvage(st, x.uid).ok) n++; audio.play('coin'); w.ui.toast(`장비 ${n}개 분해`, '#ffd84a'); townDone({ ok: true }); });
    on('[data-reforge]', (el) => { const it = st.equip[el.dataset.reforge], r = reforge(st, it); if (r.ok) { audio.play('rankup'); w.ui.toast(`재련: ${affixText(r.old)} → ${affixText(r.now)}`, '#ffd84a'); w.refreshGear(); } townDone(r); });
    on('[data-shard]', (el) => { const u = Number(el.dataset.shard); this.shardSel = this.shardSel === u ? null : u; this.shardLocks = []; audio.play('click'); this.render(); });
    on('[data-starget]', (el) => { this.shardTarget = el.dataset.starget; this.shardLocks = []; audio.play('click'); this.render(); });
    on('[data-slock]', (el) => { const k = Number(el.dataset.slock), L = this.shardLocks ||= []; const i = L.indexOf(k); if (i >= 0) L.splice(i, 1); else L.push(k); audio.play('click'); this.render(); });
    on('[data-sapply]', () => {
      const it = st.equip[this.shardTarget], sm = Object.values(townOf(st).plots).find((q) => q.type === 'smithy');
      const r = applyShard(st, it, this.shardSel, this.shardLocks || [], sm?.lv || 0);
      if (r.ok) { audio.play('rankup'); w.ui.toast(`${affixText(r.old)} → ${affixText(r.now)}`, '#c58cff'); this.shardSel = null; w.refreshGear(); }
      townDone(r);
    });
    on('[data-pslot]', (el) => { const [k, base] = el.dataset.pslot.split('|'); (st.potSlot ||= {})[k] = base || null; audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-vsel]', (el) => { const [f, k] = el.dataset.vsel.split('|'); this.vsel = f === 'v' ? { from: 'v', i: Number(k) } : { from: 'b', uid: Number(k) }; audio.play('click'); this.render(); });
    on('[data-vput]', (el) => { this.vsel = null; const r = vaultPut(st, Number(el.dataset.vput)); if (!r.ok && r.why) { w.ui.toast(r.why); audio.play('error'); } else audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-vtake]', (el) => { this.vsel = null; const r = vaultTake(st, Number(el.dataset.vtake)); if (!r.ok && r.why) { w.ui.toast(r.why); audio.play('error'); } else audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-notes]', () => showNotes());
    on('[data-restore]', async () => {
      const b = await cloud.restore(st.cid);
      if (!b) { w.ui.toast('백업이 없습니다'); return; }
      if (!confirm(`${new Date(b.savedAt || 0).toLocaleString()} 저장으로 되돌릴까요? 지금 진행은 사라집니다.`)) return;
      b.savedAt = Date.now(); // 서버의 더 새 저장이 다시 덮지 않게
      b.cid = st.cid;
      try { localStorage.setItem(`ashen-save-${st.cid}`, JSON.stringify(b)); } catch { /* 무시 */ }
      location.reload();
    });
    on('[data-research]', (el) => townDone(researchStart(st, el.dataset.research), '연구를 시작했습니다'));
    on('[data-mgear]', (el) => townDone(mercGear(st, el.dataset.mgear), '장비를 맡겼습니다'));
    on('[data-school]', (el) => { this.skillSchool = el.dataset.school; this.skillSel = null; audio.play('click'); this.render(); });
    on('[data-socket]', (el) => {
      const it = this.cur(); if (!it?.sockets || it.gems.length >= it.sockets) return;
      if (!takeOne(st, el.dataset.socket)) return;
      it.gems.push(el.dataset.socket); audio.play('rankup'); w.ui.toast(`${BASES[el.dataset.socket].name}을(를) 박았습니다`, '#c0b0ff'); w.refreshGear(); w.ui.dirty(); this.render();
    });
    on('[data-var]', (el) => { const s = st.skills[this.skillSel]; if (!s) return; const [r, k] = el.dataset.var.split('|'); if (s.rank < +r || s.mod?.[r]) return; (s.mod ||= {})[r] = k; audio.play('rankup'); w.ui.dirty(); this.render(); });
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
    on('[data-brew]', (el) => { const [id, k] = el.dataset.brew.split('|'), r = brew(st, id, Number(k)); if (r.ok) audio.play('click'); townDone(r); });
    on('[data-brewget]', (el) => { const v = el.dataset.brewget === 'vault', r = brewCollect(st, Date.now(), v ? vaultAdd : null); if (r.n) { audio.play('potion'); w.ui.toast(`${r.n}개를 ${v ? '창고' : '가방'}에 넣었습니다`, '#7fe07a'); } townDone(r); });
    on('[data-pm]', (el) => { const id = el.dataset.pm, P = (this.party ||= { ids: [], pack: {} }); const i = P.ids.indexOf(id); if (i >= 0) P.ids.splice(i, 1); else if (P.ids.length < partyMax(st)) P.ids.push(id); audio.play('click'); this.render(); });
    on('[data-pzone]', (el) => { (this.party ||= { ids: [], pack: {} }).zone = el.dataset.pzone; audio.play('click'); this.render(); });
    on('[data-pexp]', (el) => { (this.party ||= { ids: [], pack: {} }).exp = el.dataset.pexp; audio.play('click'); this.render(); });
    on('[data-ppack]', (el) => { const [base, d] = el.dataset.ppack.split('|'), P = (this.party ||= { ids: [], pack: {} }); const tot = Object.values(P.pack).reduce((a, v) => a + v, 0); const n = (P.pack[base] || 0) + Number(d); if (n < 0 || (Number(d) > 0 && (tot >= packMax(st) || n > countOf(st, base)))) return; P.pack[base] = n; audio.play('click'); this.render(); });
    on('[data-psend]', () => { const P = this.party; const r = dispatchParty(st, P.ids, P.zone, P.exp, Object.entries(P.pack).filter(([, q]) => q > 0).map(([base, qty]) => ({ base, qty }))); if (r.ok) { this.party = { ids: [], pack: {}, zone: P.zone, exp: P.exp }; audio.play('rankup'); } townDone(r, `용병 ${r.n}명이 파견을 떠났습니다`); });
    on('[data-claimall]', () => { let g = 0, dead = []; for (const m of [...townOf(st).mercs]) if (m.job && Date.now() >= m.job.until) { const r = claim(st, m.id); if (r?.dead) dead.push(r.name); else if (r) g += r.gold; } if (dead.length) { audio.play('error'); w.ui.toast(`${dead.join(' · ')}이(가) 돌아오지 못했습니다…`, '#ff7060'); } else audio.play('coin'); w.ui.toast(`전리품 ${g.toLocaleString()} G 외`, '#ffd84a'); w.ui.dirty(); this.render(); });
    on('[data-shelter]', (el) => { const r = shelterUp(st, el.dataset.shelter); if (r.ok) { audio.play('rankup'); w.refreshCamps(); } townDone(r, `쉼터 ${r.lv}단계`); });
    on('[data-go-exp]', (el) => {
      const [i, ex] = el.dataset.goExp.split('|');
      const zone = body.querySelector(`[data-zone="${i}"]`)?.value;
      townDone(dispatch(st, i, zone, ex), '용병이 사냥을 떠났습니다');
    });
    on('[data-claim]', (el) => {
      const r = claim(st, el.dataset.claim);
      if (r?.dead) { audio.play('error'); w.ui.toast(`용병 ${r.name}이(가) 돌아오지 못했습니다…`, '#ff7060'); }
      else if (r) { audio.play('coin'); w.ui.toast(`전리품: ${r.gold.toLocaleString()} G · 강화석 ${r.ore} · 재료 ${r.mats}${r.items.length ? ` · 장비 ${r.items.length}개` : ''}`, '#ffd84a'); }
      w.ui.dirty(); this.render();
    });
    on('[data-go]', (el) => this.show(el.dataset.go));
    on('[data-close]', () => { audio.play('click'); this.close(); });
    on('[data-full]', () => toggleFullscreen());
    on('[data-install]', async () => { const p = window.__install; if (!p) return; p.prompt(); await p.userChoice.catch(() => {}); window.__install = null; this.render(); });
    on('[data-save]', () => { this.save(true); w.ui.toast('저장했습니다'); });
    on('[data-reset]', async () => {
      if (confirm('정말 이 캐릭터를 지울까요? 되돌릴 수 없습니다.')) {
        window.__noSave = true;
        const { deleteChar } = await import('../game/chars.js');
        deleteChar(st.cid);
        await cloud.delChar(st.cid);
        location.reload();
      }
    });
    // 메인 화면(캐릭터 고르기)으로: 저장하고 다시 연다
    on('[data-title]', () => { this.save(true); window.__noSave = true; setTimeout(() => location.reload(), 400); });
    on('[data-nick]', () => { this.close(); window.__askNick?.(); });
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
