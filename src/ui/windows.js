import { cleanTree } from './numfmt.js';
import { FACES } from '../data/flareWorld.js';
import { bagSize } from '../game/inventory.js';
import { gameConfirm, gamePick } from './ask.js';
import { powerParts } from '../game/power.js';
import { rumorsOf, analyzeStart, analyzeTime, rumorUpgrade, rumorName, PLUS, PLUS_MAX, RUMOR_MAX, RUMOR_P } from '../game/rumor.js';
// 창: 가방(장비) · 스킬 · 능력(스탯/성향) · 상점 · 메뉴
import { STATS, STAT_NAMES, STAT_COLORS, STAT_DESC, CONFIG } from '../data/config.js';
import { SKILLS, BOOK_TIERS, GRIP_NAMES } from '../data/skills.js';
import { BASES, SLOTS, SLOT_NAMES, RARITY, WEAPON_CLASSES, isTwoHandedBase, isBowBase, isQuiverBase, handsOk } from '../data/items.js';
import { itemName, itemColor, itemValue, affixText, isBook, makeItem } from '../game/items.js';
import { scaledArmor, scaledDmg, totalStats, derive, baseMods, affixV, affixK } from '../game/player.js';
import { addItem } from '../game/inventory.js';
import { skillExpNeeded, skillValues, meetsReq, learn } from '../game/skills.js';
import { expNeeded } from '../game/growth.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

import { faceClose, itemIcon, skillIcon, portrait, chestIcon, bookIcon, coinIcon, scrollIcon, townIcon, oreIcon, monPortrait } from './icons.js';
import { monsterRes, mixFxOf } from '../data/resist.js';
import { ARTS, ART, ART_LINE_NAMES, artSlots, artUsable } from '../data/arts.js';
import { floodPenalty, floodText } from '../data/flood.js';
import { RELIC, RELIC_GRADES, relicV, altarSlots, altarDur, relicBonus } from '../data/relics.js';
import { terrain, fogCan, MAP_R, MAP_W, FOG_C, seen as seenAt } from './mapimg.js';
import { CAMPS, inCamp } from '../engine2d/stage.js';
import { TIER_NAMES } from '../world/world.js';
import { entranceOf } from '../data/dungeons.js';
import { MATERIALS, SETS, SET_SLOTS, craftCost, upgradeMats, upgradeNeed } from '../data/crafting.js';
import { craft, craftZones, setCounts, setBase, isLiberated, LIBERATE_NEED, researchStart, researchLv, mercGear, mercUngear, mercById, recruits, assignMerc, SKILL_OF, SKILLS_ALL, BONUS, bonusOf, awakenMerc, awakenCost, dismiss, staMax, SKILL_NAMES, GRADES, MERC, EXP_STA, deathChance, salvage, salvageValue, reforge, reforgeCost, resCount, resTake, resAdd, ORE_RECIPES, oreRecipeOk, craftOre, KEY_RECIPES, craftKey, ESS_RECIPES, craftEss, INN_BEDS, innRestK, stopRepeat, MYTH_MARKS, mythMarks, mythLvMax, craftMyth, FRESH, freshK, isVet, herbSwap, herbSwapGold } from '../game/town.js';
import { RESEARCH, researchCost } from '../data/buildings.js';
import { AFFIXES } from '../data/items.js';
import { rushBuild, convertMats, herbOrders, herbDeliver, findBuilding } from '../game/town.js';
import { highHerbs, storeCap, essRecipe, researchMax, labSlots, labJobs, censerSlotsOf, censerSet, setHerbFocus, fertilize, distill, FERT, DISTILL } from '../game/town.js';
import { CENSERS, CENSER_IDS } from '../data/censer.js';
import { PLOTS, BUILDINGS, EXPEDITIONS, townOf, buildingAt, build, upgrade, collect, enhance, enhanceCap, enhanceCost, hire, mercSlots, dispatch, claim, tick } from '../game/town.js';
import { QUESTS, QUEST_BOOKS } from '../data/quests.js';
import { ZONES, MONSTERS } from '../data/world.js';
import { nextQuest, questDone, questNeed, goalText, questTurnIn } from '../game/quests.js';
import { audio } from '../engine/audio.js';
import { cloud, cloudError } from '../net/cloud.js';
import { takeOne, countOf, needAwaken } from '../game/inventory.js';
import { uiSettings, applyUi, editUi } from './layout.js';

import { TITLE_AT, titleKey, titleName, UNIQUES, perkChoices } from '../data/titles.js';
import { variantsOf, VARIANT_RANKS, modsOf, skillEff, mpCost, skillTraits } from '../game/skills.js';
import { SCHOOL_NAMES } from '../data/skills.js';
import { awakenOk, skillGrade, QUALITY, gradeName } from '../data/awaken_skills.js';
import { ROLE_NAMES } from '../data/skill_roster.js';
import { hordePen } from '../data/horde.js';
import { rerollAffix, addSocket, engrave, extractEngrave, extractShard, inherit, inheritCheck, inheritRange } from '../game/raidgear.js';
import { RAID, RAID_GRADES, RAID_RULES, RAID_SHOP, ENGRAVE, LORDS, raidWeek, raidOf, raidOpen, fmtTime, shopPrice, shopBought, lordName } from '../data/raid.js';
import { MUTS as MUTS_ } from '../data/mutators.js';
const NEED_NAMES = { melee: '근접 무기 (검 · 도끼 · 둔기 · 단검 · 대방패)', bow: '활' }; // v0.50 스킬이 쓰는 무기
// v0.50 초월 강화 숫자 색: +21 금색 · +50 붉은 금 · +100 무지개
const plusCls = (n) => n >= 100 ? ' plusRb' : n >= 50 ? ' plusRg' : n > 20 ? ' plusG' : '';
import { GEMS, GEM_GRADES, gemId } from '../data/legends.js';
import { fuseMany, fuseCount, greatCount, greatSlots, applyShard, canApply, lockMax, shardCost, shardVals, shardGrade, gradeName as sgName, gradeColor, useGrade, pullGrade, pullResearch, pullCost as sgCost, pullPool, dustOf, grindShard, fuseShard, pullShard } from '../game/shards.js';
import { HERBS, HERB_IDS, GROW_IDS, herbsAt, RECIPES, ELIXIRS } from '../data/potions.js';
import { RARITY_IDS, junkCount, discardJunk } from '../game/town.js';
import { MYTH_CHANCE, wageTotal, mercWage, buildTime, brew, brewGold, brewCollect, brewTime, BREW_QUEUE, brewQueue, dispatchParty, partyMax, packMax, packBoost, shelterLv, shelterUp } from '../game/town.js';
import { RESEARCH_MAX, SHELTER } from '../data/buildings.js';
import { herbIcon, homeIcon, uiIcon } from './icons.js';
import { vault, vaultSize, vaultPut, vaultTake, vaultAdd, vaultSave, vaultReady } from '../game/vault.js';
import { GAME_VERSION, PATCH_NOTES } from '../data/patchnotes.js';
import { KEY_ACTIONS, keyMap, keyName } from '../data/keys.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { dailyOf, weeklyOf, dailyText, dailyReward } from '../game/daily.js';
// 스탯 오각형: 내가 어느 쪽으로 컸나
const pentagon = (stats) => {
  const mx = Math.max(...STATS.map((k) => stats[k])) || 1, pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`; };
  const grid = [1, 0.66, 0.33].map((k) => `<polygon points="${STATS.map((_, i) => pt(i, 40 * k)).join(' ')}" fill="none" stroke="rgba(217,182,106,.25)"/>`).join('');
  const shape = `<polygon points="${STATS.map((k, i) => pt(i, 40 * Math.max(0.08, stats[k] / mx))).join(' ')}" fill="rgba(255,200,90,.35)" stroke="#e8c36a" stroke-width="1.2"/>`;
  const labels = STATS.map((k, i) => { const [x, y] = pt(i, 48).split(','); return `<text x="${x}" y="${y}" fill="${STAT_COLORS[k]}" font-size="8" text-anchor="middle" dominant-baseline="middle">${STAT_NAMES[k]}</text>`; }).join('');
  return `<svg class="penta" viewBox="0 0 100 100">${grid}${shape}${labels}</svg>`;
};
// 패치 노트 창 (새 버전이면 처음 한 번 저절로)
// 팝업 닫기 (확인 · × · 바깥 누르기 · Esc). main.js의 공지 창도 쓴다
export function closable(el, strict = false) {
  const close = () => { audio.play('click'); el.remove(); document.removeEventListener('keydown', esc, true); };
  const esc = (e) => { if (e.key === 'Escape' && document.body.contains(el)) { e.stopPropagation(); close(); } };
  el.querySelectorAll('.popClose, .popX').forEach((b) => { b.onclick = close; });
  if (strict) return; // v0.49.12 결과 창: 닫기 · 확인 단추로만 닫는다
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  document.addEventListener('keydown', esc, true);
}
export function showNotes() {
  let el = document.getElementById('notes');
  if (!el) { el = document.createElement('div'); el.id = 'notes'; document.body.appendChild(el); }
  el.innerHTML = `<div class="nbox"><button class="btn nclose">닫기</button>${PATCH_NOTES.map((n) => `<h2>${n.ver} <small>${n.date}</small></h2><p>${n.head}</p><ol>${n.items.map((x) => `<li>${x}</li>`).join('')}</ol>`).join('')}</div>`;
  el.hidden = false;
  el.querySelector('.nclose').onclick = () => { el.hidden = true; };
}
const repickCost = (t) => 2000 * (t.tier + 1) ** 2;
const nextTitle = (st) => { const i = TITLE_AT.findIndex((n) => st.awakenings < n); return i < 0 ? '' : ` · ${i + 1}차 각성 ${titleName(titleKey(st.stats, 10, i), i)}까지 ${TITLE_AT[i] - st.awakenings}`; };
const TITLES = { sage: '현자 에라', raid: '왕좌 원정', arts: '수련 비전', gems: '보석상', map: '월드맵', inv: '가방 · 장비', skills: '스킬', char: '능력 · 성향', quest: '퀘스트', dex: '도감 · 기록', town: '마을', vault: '창고', shop: '상점', guide: '가이드북', news: '공지 · 패치', menu: '메뉴', rank: '랭킹', log: '기록' };
// 진행 게이지 (시작 ~ 끝 시각). 예전 저장은 시작 시각이 없어 dur로 어림
const gauge = (from, until, dur = 3600000, color = '#7ad0ff') => { const f = from || until - dur, k = Math.max(0, Math.min(1, (Date.now() - f) / Math.max(1, until - f))); return `<div class="mini" style="margin-top:3px"><i style="width:${(k * 100).toFixed(1)}%;background:linear-gradient(#bfe8ff,${color})"></i></div>`; };
// 보석 합치기 · 빼기 값
const mergeCost = (k) => 200 * (k + 1) ** 2;
// 합치기 성공률: 조각난 · 흐린 100%, 그 위로 한 등급마다 -10% (최소 35%)
const mergeChance = (k) => (k < 2 ? 1 : Math.max(0.35, 1 - 0.1 * (k - 1)));
// v0.49.11 제련에 쓸 파편 목록: 가방 · 창고 묶음을 값마다 [열쇠 'uid|번호', 파편 {id, v}]
// v0.49.89 파편 칸 이름: 옵션 이름만 (긴 이름은 줄여서)
const SHARD_SHORT = { bossDmg: '보스 피해', magicFind: '아이템 발견', skillExp: '숙련 획득', hpRegen: 'HP 회복', mpRegen: 'MP 회복', goldFind: '골드 획득' };
const shardName = (id) => SHARD_SHORT[id] || (AFFIXES[id]?.text || id).replace(/\s*[+-]?\{v\}%?/, '').trim();
const shardEntries = (st) => [...st.inv, ...vault().items].filter((x) => x?.shard).flatMap((x) => shardVals(x).map((v, i) => ({ key: `${x.uid}|${i}`, uid: x.uid, vi: i, shard: { id: x.shard.id, v, great: !!x.shard.great } })));
const pullCost = (g) => 100 * ((BASES[g]?.grade || 0) + 1) ** 2;
// 건물 창 칸 나눔 표시 (town()의 'one' 모드에서 칸으로 나눈다)
const COL = '<!--COL-->';
// 칸 위 작은 글: 능력치 파편은 옵션을 보여 준다
const lk = (it) => (it?.lock ? '<span class="lk"></span>' : ''); // v0.45 잠근 아이템 표시
const cellTag = (it) => { if (!it?.shard) return ''; const t = affixText(it.shard), v = t.match(/[+-]?[\d.]+%?/), n = it.vals?.length || 1; return `<span class="ctag">${t.split(' ')[0].slice(0, 2)}<br>${v ? v[0] : ''}</span>${n > 1 ? `<span class="q">${n}</span>` : ''}`; }; // v0.49.11 묶음이면 개수 // v0.45 칸 안에 들어가게 짧게 (골드 획득 +367% → 골드+367%)
const NPC_ONLY = ['shop', 'town', 'vault', 'gems', 'raid', 'sage'];
const TAB_ORDER = ['raid', 'sage', 'gems', 'map', 'inv', 'vault', 'skills', 'char', 'arts', 'quest', 'log', 'dex', 'rank', 'town', 'shop', 'guide', 'news', 'menu'];
const rar = (it) => (it.rarity && it.rarity !== 'common' ? ` r-${it.rarity}` : '');
// 장비 찾기 (v0.41.3): 'e:부위' 착용 · 'b:uid' 가방 · 'v:uid' 창고 — 대장간 · 보석상은 세 곳 모두에서 고른다
const gearAt = (st, key) => { const [k, v] = String(key || '').split(':'); return k === 'e' ? st.equip[v] : k === 'v' ? vault().items.find((x) => x.uid === Number(v)) : st.inv.find((x) => x.uid === Number(v)); };
// v0.49.35 창고: 종류별로 한꺼번에 옮기기 (잠근 것은 빼고)
const VCATS = [['mat', '재료'], ['gem', '보석'], ['book', '스킬북'], ['potion', '물약 · 주문서'], ['shard', '파편'], ['gear', '장비']];
const vcatOf = (it) => { const b = BASES[it?.base] || {}; return !it ? null : it.book ? 'book' : it.shard ? 'shard' : b.type === 'gem' ? 'gem' : b.type === 'potion' || b.type === 'elixir' ? 'potion' : b.slot ? 'gear' : 'mat'; };
const vcatRow = (from, list) => { const has = new Set(list.filter((x) => x && !x.lock).map(vcatOf)); return `<div class="vcats">${VCATS.filter(([k]) => has.has(k)).map(([k, n]) => `<button class="btn" data-vcat="${from}|${k}">${n}</button>`).join('')}</div>`; };
const gearList = (st, ok) => [...SLOTS.filter((sl) => st.equip[sl] && ok(st.equip[sl])).map((sl) => ['e:' + sl, st.equip[sl], '착용']), ...st.inv.filter((x) => BASES[x.base]?.slot && ok(x)).map((x) => ['b:' + x.uid, x, '가방']), ...vault().items.filter((x) => x && BASES[x.base]?.slot && ok(x)).map((x) => ['v:' + x.uid, x, '창고'])];
// 강화 · 극한 던전 열쇠 제작 (제작소 3 · 6단계, v0.42)
const KEY_PANEL = (st, b) => { const mx = mythLvMax(st), lv = Math.max(10, Math.min(mx, globalThis.__mythLv ?? mx)), need = mythMarks(st, lv); return `<h3>신화 교환</h3><div class="row"><div class="cell shopIco r-myth">${ico({ base: 'myth_mark' })}</div><div class="grow"><b style="color:#ff4a8a">신화 장비 · 레벨 ${lv}</b><div class="note">신화의 흔적 ${need} (${resCount(st, 'myth_mark')}) · 최대 ${mx}</div></div><button class="btn" data-mythlv="-10">-10</button><button class="btn" data-mythlv="-1">-1</button><button class="btn" data-mythlv="1">+1</button><button class="btn" data-mythlv="10">+10</button><button class="btn gold" data-mythcraft="1" ${resCount(st, 'myth_mark') >= need ? '' : 'disabled'}>교환</button></div><h3>던전 열쇠 제작</h3>` + KEY_RECIPES.map((r) => { const ok = oreRecipeOk(st, r); const need = Object.entries(r.need).map(([id, q]) => `${BASES[id].name} ${q} (${resCount(st, id)})`).join(' · ');
  return `<div class="row"><div class="cell shopIco">${ico({ base: r.id })}</div><div class="grow"><b>${BASES[r.id].name}</b><div class="note">${b.lv < r.lv ? `제작소 ${r.lv}단계` : `${need} · 지역 재료 ${r.zoneMats} · ${r.gold.toLocaleString()} G`}</div></div><button class="btn" data-keycraft="${r.id}" ${ok.ok ? '' : 'disabled'}>만들기</button></div>`; }).join('') };
const ico = (it) => `<img src="${itemIcon(it)}" alt="" draggable="false" />`;
const sicon = (id) => `<div class="sicon" style="background:radial-gradient(circle at 35% 30%, ${SKILLS[id].color}, #17111f 90%)"><img src="${skillIcon(id)}" alt="" /></div>`;

export class Windows {
  constructor(world, save) {
    this.w = world;
    this.save = save;
    this.el = $('#window');
    // v0.49.10 창을 연 터치가 새 창의 탭 · 단추까지 누르지 않게: 창이 열린 직후 잠깐 들어오는 클릭은 버린다 (휴대폰 이중 터치)
    this.clickBlock = 0;
    for (const ev of ['click', 'pointerup', 'mouseup']) this.el.addEventListener(ev, (e) => { if (performance.now() < this.clickBlock) { e.stopPropagation(); e.preventDefault(); } }, true);
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
    if (this.talk && !this.talk.includes(kind) && kind !== this.talkFirst && !NPC_ONLY.includes(kind)) { this.talk = null; this.talkAt = null; this.townMode = null; }
    if (NPC_ONLY.includes(kind) && !this.talk?.includes(kind)) { this.w.ui.toast(kind === 'town' ? '경비대장이나 건물 앞에서 이용할 수 있습니다' : kind === 'vault' ? '창고는 마을 상인에게서 이용할 수 있습니다' : '상인에게 가서 이용할 수 있습니다'); audio.play('error'); return; }
    if (this.kind !== kind) this.sel = null;
    this.kind = kind;
    if (this.el.hidden) this.clickBlock = performance.now() + 450;
    this.el.hidden = false;
    audio.play('click');
    this.render();
  }

  // NPC · 건물에서 열기: kinds = 이번에 쓸 수 있는 창, mode = 'build'(경비대장) | 'one'(건물 앞)
  // v0.44.34 NPC 창을 열면 자동 사냥을 끄고, 그 자리에서 멀어지면 창을 닫는다
  talkTo(kinds, first, mode = null) {
    this.talk = kinds; this.talkFirst = first; this.townMode = mode;
    const P = this.w.player?.pos; this.talkAt = P ? { x: P.x, z: P.z } : null;
    if (this.w.auto) this.w.toggleAuto(false);
    this.show(first);
  }
  talkCheck() {
    if (!this.talk || this.el.hidden || !this.talkAt) return;
    const P = this.w.player.pos;
    if (Math.hypot(P.x - this.talkAt.x, P.z - this.talkAt.z) > 4) this.close();
  }

  close() {
    this.talk = null; this.talkAt = null; this.townMode = null; this.vsel = null; this.sellPick = null; this.vPick = null;
    this.waitKey = null;
    this.portalAt = null; this.mapZoom = null; this.mapCenter = true;
    this.el.hidden = true;
    this.kind = null;
    this.sel = null;
  }

  refresh() { if (!this.open) return; if (this.pressing) { this.pending = true; return; } this.render(); }

  render() {
    $('h2', this.el).textContent = (this.kind === 'town' && this.townMode === 'one' && BUILDINGS[townOf(this.w.st).plots[this.townSel]?.type]?.name) || TITLES[this.kind];
    const tabs = $('.tabs', this.el);
    // 탭은 그림 없이 같은 모양의 글자 단추로
    const TAB_TXT = { sage: '현자', raid: '원정', arts: '비전', gems: '보석', map: '지도', inv: '가방', skills: '스킬', char: '능력', quest: '퀘스트', dex: '도감', town: '마을', vault: '창고', shop: '상점', guide: '가이드북', menu: '설정', news: '공지', rank: '랭킹', log: '기록' };
    // 상인 · 건물 창은 그 상인의 탭만, 탭이 하나면 탭 줄을 숨긴다
    const list = this.talk ? TAB_ORDER.filter((k) => this.talk.includes(k) || k === this.talkFirst) : TAB_ORDER.filter((k) => !NPC_ONLY.includes(k) && (!['guide', 'news'].includes(k) || k === this.kind)); // 공지 · 가이드북은 설정 창에서 연다
    tabs.style.visibility = list.length < 2 ? 'hidden' : '';
    tabs.innerHTML = list.map((k) => `<button class="tab txt${k === this.kind ? ' on' : ''}" data-tab="${k}"><span>${TAB_TXT[k]}</span></button>`).join('');
    tabs.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => this.show(b.dataset.tab); });
    const on = tabs.querySelector('.tab.on'); if (on) { const l = on.offsetLeft - tabs.offsetLeft; if (l < tabs.scrollLeft || l + on.offsetWidth > tabs.scrollLeft + tabs.clientWidth) tabs.scrollLeft = l - 8; }
    const body = $('.body', this.el);
    // 다시 그려도 스크롤 위치는 지킨다
    // v0.49.1 다시 그려도 스크롤 위치는 지킨다: 창 칸(.frame)만이 아니라 팝업(.itemPop) 등 스크롤되는 모든 칸을 (클래스 + 순서)로 기억
    const scKey = (el, i) => `${el.className}#${i}${el.classList.contains('itemPop') ? '|' + (el.querySelector('.nm')?.textContent || '') : ''}`, SC = '.frame, .itemPop, .fPage, .shList, .gemGrid, .grid, .herbList, .ntcList, .detail, .destList, .mapFrame, .stabs';
    const keep = {}; { const n = {}; body.querySelectorAll(SC).forEach((el) => { const c = el.className, i = (n[c] = (n[c] || 0) + 1); if (el.scrollTop || el.scrollLeft) keep[scKey(el, i)] = [el.scrollTop, el.scrollLeft]; }); }
    // 창 내용을 만들다 오류가 나도 빈 창이 되지 않게: 알리고 기록을 보낸다
    let html;
    try { html = this[this.kind](); } catch (e) { console.error(e); this.bTab = {}; /* v0.49.76 고장 난 탭을 기억하면 창이 계속 깨진다 → 다음엔 첫 탭으로 */ cloud.reportError(`[win:${this.kind}] ${e?.message}`, e?.stack, GAME_VERSION); html = `<div class="frame" style="flex:1"><div class="note">창을 여는 중 오류가 났습니다 · ${esc(e?.message || '')}</div></div>`; }
    body.innerHTML = html; cleanTree(body); // v0.49.77 긴 소수 정리
    const wc = body.querySelector('.wmc');
    if (wc && this.kind === 'map') { const mf = body.querySelector('.mapFrame'), me = body.querySelector('.pin.me'); if (mf && me && (this.mapCenter !== false)) { requestAnimationFrame(() => { mf.scrollLeft = me.offsetLeft - mf.clientWidth / 2; mf.scrollTop = me.offsetTop - mf.clientHeight / 2; }); this.mapCenter = false; } }
    if (wc) { const g = wc.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(terrain, 0, 0, wc.width, wc.height); g.imageSmoothingEnabled = true; g.drawImage(fogCan, 0, 0, wc.width, wc.height); }
    { const n = {}; body.querySelectorAll(SC).forEach((el) => { const c = el.className, i = (n[c] = (n[c] || 0) + 1), k = keep[scKey(el, i)]; if (k) { el.scrollTop = k[0]; el.scrollLeft = k[1]; } }); }
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
    if (!it) return '<h3>고른 아이템</h3><div class="forgeSlot empty"></div>';
    const b = BASES[it.base];
    let h = `<img class="bigico" src="${isBook(it) ? skillIcon(it.book) : itemIcon(it)}" alt="" /><div class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</div>`;
    if (isBook(it)) {
      const sk = SKILLS[it.book];
      const gr = skillGrade(sk), qn = QUALITY[sk.q || 2], awk = `${BOOK_TIERS[sk.tier].name} 스킬북 · ${gradeName(gr)} · <span style="color:${qn.color}">${qn.name}</span>`;
      h += `<div class="sub">${awk} · MP ${mpCost(st, it.book, skillValues(it.book, 1, [])).toLocaleString()} · 재사용 ${sk.cd}초</div><div>${sk.desc.replace(/\s*\(근접 무기\)/, '')}</div>${skillTraits(sk).map((x) => `<div class="aff" style="color:#9fd0ff">${x}</div>`).join('')}${mixFxOf(sk.lines || Object.keys(sk.req || {})).map((f) => `<div class="aff" style="color:#e0b0ff">혼합 효과 · ${f.name}: ${f.text}</div>`).join('')}`;
      if (gr) { const SN = { str: '힘', dex: '민첩', int: '지능', wis: '정신', vit: '체력' }; const a = awakenOk(st, sk); const lab = sk.awaken === 4 ? `4차 각성 · 갈래에 ${SN[sk.line]}` : `${gr}차 각성 필요`; h += `<div class="aff" style="color:${a.ok ? '#7fe07a' : '#ff8a7a'}">${lab}${a.ok || a.why === lab ? '' : ` — ${a.why}`}</div>`; } // v0.49.27 같은 말이 두 번 나오지 않게
      if (sk.needs) { const bad = this.w.weaponWhy?.(sk); h += `<div class="aff" style="color:${bad ? '#ff8a7a' : '#d8c8a0'}">무기: ${NEED_NAMES[sk.needs]}</div>`; } // v0.50
      if (sk.grip) { const g = this.w.gripWhy?.(sk); h += `<div class="aff"><b class="gripTag">${GRIP_NAMES[sk.grip]}</b>${g ? ` <span style="color:#ff8a7a">— ${g}</span>` : ''}</div>`; } // v0.49.38
      h += reqLine(sk.req, totalStats(st));
      if (st.skills[it.book]) h += `<div class="aff">아는 스킬 — 숙련 EXP로 흡수</div>`;
    } else if (it.shard) {
      { const vs = shardVals(it); const gq = shardGrade(it.shard.id, vs[0], it.shard.great); h += `<div class="sub">${it.shard.great ? '<b style="color:#ffb84a">탁월</b> ' : ''}능력치 파편${vs.length > 1 ? ` ×${vs.length}` : ''} · <span style="color:${gradeColor(gq)}">${sgName(gq)}</span></div><div class="aff">${affixText(it.shard)}</div>${vs.length > 1 ? `<div class="note shVals">${vs.map((v) => affixText({ id: it.shard.id, v }).match(/[+-]?[\d.]+%?/)?.[0] || v).join(' · ')}</div>` : ''}`; } // v0.49.11 묶음: 가진 값 모두
    } else if (b.type === 'gem') {
      h += `<div class="sub">보석 ×${it.qty}</div><div>${STAT_NAMES[GEMS[b.gem].stat]} +${GEM_GRADES[b.grade].v}</div>`;
    } else if (b?.type === 'pet') {
      h += `<div class="sub">펫 ×${it.qty || 1}</div><div>쓰면 펫이 따라다니며 물건을 주워 줍니다</div>`;
    } else if (b?.type === 'mat') {
      h += `<div class="sub">재료 ×${it.qty}</div><div>${it.base === 'ore' ? '장비 강화 · 재련 · 파편' : '건물 단계 올리기'}</div>`;
    } else if (b.type === 'key') {
      h += `<div class="sub">×${it.qty}</div><div>지역의 던전 입구에서 하나 써서 들어갑니다</div>`;
    } else if (b.type === 'elixir') {
      h += `<div class="sub">주문서 ×${it.qty} · 5분</div><div class="aff">${ELIXIRS[it.base].text}</div>`;
    } else if (b.type === 'potion') {
      h += `<div class="sub">소모품 ×${it.qty}</div><div>${b.restore.hp ? `HP ${b.restore.hp} 회복` : `MP ${b.restore.mp} 회복`}</div>`;
    } else if (!b?.slot) { // 그 밖의 물건 (모르는 종류도 창이 비지 않게)
      h += `<div class="sub">${it.qty > 1 ? `×${it.qty}` : ''}</div>`;
    } else {
      h += `<div class="sub">${RARITY[it.rarity].name} ${SLOT_NAMES[b.slot]} · 아이템 레벨 ${it.ilvl}${isQuiverBase(b) ? ' · <b class="twoTxt">활 전용</b>' : ''}</div>`;
      if (b.dmg) { const d = scaledDmg(it); h += `<div>${WEAPON_CLASSES[b.cls].name}${isTwoHandedBase(b) ? ' · <b class="twoTxt">양손 무기</b>' : ''} · ${WEAPON_CLASSES[b.cls].kind === 'magic' ? '마법 공격력' : '물리 공격력'} ${d[0]}~${d[1]} · 속도 ${b.speed}</div><div class="sub">주 스탯 ${STAT_NAMES[WEAPON_CLASSES[b.cls].ap]}</div>`; }
      if (b.armor) h += `<div>방어력 ${scaledArmor(it)}</div>`;
      if (b.block) h += `<div>막기 확률 ${Math.round(b.block * 100)}%</div>`;
      { const bm = baseMods(it); for (const k in bm) h += `<div class="baseMod">${modText(k, bm[k])}${it.plus ? ' <small class="note">강화</small>' : ''}</div>`; } // v0.49.34 기본 효과는 강화만큼 오른 값 // v0.44.18 영어 키가 그대로 보이던 것 (dex +40 등)
      if (it.q) h += `<div class="sub">품질 <b style="color:${it.q >= 1.1 ? '#ffd84a' : it.q <= 0.9 ? '#a09a8a' : '#e8e2d4'}">${Math.round(it.q * 100)}%</b> · ${it.rarity === 'myth' ? '115~130' : '85~115'}%</div>`;
      // 옵션마다 이 아이템 레벨 · 등급에서 나올 수 있는 범위
      for (const a of it.affixes) { const A = AFFIXES[a.id], mx = A ? Math.round(Math.max(A.min, A.max(it.ilvl) * (RARITY[it.rarity]?.mult || 1))) : null; h += `<div class="aff"${a.great ? ' style="color:#ffb84a"' : ''}>${affixText({ ...a, v: affixV(it, a) })}${affixK(it) > 1 ? ' <small class="note">강화</small>' : ''}${a.great ? ' <b style="color:#ffb84a">탁월</b>' : ''}${A ? ` <small class="note">${A.min}~${mx}</small>` : ''}</div>`; }
      if (it.affixes?.length && (greatCount(it) || greatSlots(it) > 1)) h += `<div class="sub" style="color:#ffb84a">탁월 ${greatCount(it)} / ${greatSlots(it)}</div>`; // v0.49.84 탁월 칸
      if (it.mixReq) h += `<div class="aff" style="color:#e0b0ff">혼합 전용 · ${Object.entries(it.mixReq).map(([k, v]) => `${STAT_NAMES[k]} ${v}`).join(' · ')}</div>`;
      if (it.unique != null) h += `<div class="aff" style="color:#41e07a">◆ ${UNIQUES[it.unique].text}</div>`;
      if (it.eng && ENGRAVE[it.eng]) h += `<div class="aff" style="color:#ffc85a">각인 · ${lordName(it.eng)}: ${ENGRAVE[it.eng].text}</div>`; // v0.50 원정 군주 각인
      if (it.base === 'eng_stone' && ENGRAVE[it.eng]) h += `<div class="aff" style="color:#ffc85a">${lordName(it.eng)}: ${ENGRAVE[it.eng].text}</div>`;
      if (it.sockets) {
        h += `<div class="aff" style="color:#c0b0ff">구멍 ${it.gems.length} / ${it.sockets}${it.gems.map((g) => ` · ${BASES[g].name} ${STAT_NAMES[GEMS[BASES[g].gem].stat]} +${GEM_GRADES[BASES[g].grade].v}`).join('')}</div>`;
      }
      if (it.set) {
        const s = SETS[it.set], n = setCounts(this.w.st.equip)[it.set] || 0;
        const fx = (b) => Object.entries(b).map(([k, v]) => AFFIXES[k].text.replace('{v}', v)).join(' · ');
        h += `<div class="aff" style="color:#7fe07a">${s.name} 세트 (${n}/4)</div><div class="note" style="color:${n >= 2 ? '#7fe07a' : '#888'}">2: ${fx(s.b2)}</div><div class="note" style="color:${n >= 4 ? '#7fe07a' : '#888'}">4: ${fx(s.b4)}</div>`;
      }
      h += reqLine(b.req, totalStats(st));
      if (b.slot && needAwaken(it) > 0) h += `<div class="sub"><span class="${(st.awakenings || 0) < needAwaken(it) ? 'bad' : ''}">필요 각성 ${needAwaken(it)}</span></div>`;
    }
    h += `<div class="sub">판매가 ${itemValue(it)} G</div>`;
    h += '<div class="btns">';
    if (it.shard && it.vals?.length > 1 && !it.lock) h += `<button class="btn" data-shkeep="${it.uid}">가장 높은 값만 남기기</button>`; // v0.49.11 파편 묶음
    if (where === 'inv') {
      if (isBook(it) && (it.qty || 1) > 1) h += `<button class="btn gold" data-act="useall">모두 사용 ×${it.qty}</button>`; // v0.49.25 같은 스킬북은 겹친다: 하나만 · 모두
      if (!it.shard && b?.type !== 'mat') h += `<button class="btn gold" data-act="use">${isBook(it) ? (st.skills[it.book] ? '하나 흡수' : '배우기') : b.type === 'potion' ? '사용' : b.type === 'elixir' ? '읽기' : b.type === 'pet' ? '부르기' : b.type === 'map' ? '펼치기' : '장착'}</button>`;
      if (b?.type === 'elixir') { const on = !!st.settings?.autoScroll?.[it.base]; h += `<button class="btn${on ? ' on' : ''}" data-ascroll="${it.base}">${on ? '자동 사용 끄기' : '자동 사용'}</button>`; }
      // 물약 퀵슬롯: 이 물약을 체력 · 마나 칸에 두거나 뺀다
      if (b?.type === 'potion') for (const [k, nm] of [['hp', '체력 칸'], ['mp', '마나 칸']]) {
        const on = st.potSlot?.[k] === it.base;
        h += `<button class="btn${on ? ' on' : ''}" data-pslot="${k}|${on ? '' : it.base}">${on ? `${nm}에서 빼기` : `${nm}에 두기`}</button>`;
      }
      if (this.w.canShop && b?.type !== 'mat') {
        if ((it.qty || 1) > 1) h += `<div class="sellQty"><input type="range" min="1" max="${it.qty}" value="1" id="sellN" /><b id="sellNv">1개 · ${itemValue({ ...it, qty: 1 }).toLocaleString()}G</b><button class="btn" data-act="sell">판매</button><button class="btn" data-act="sellall">모두 판매</button></div>`;
        else h += `<button class="btn" data-act="sell">판매</button>`;
      }
      h += `<button class="btn danger" data-act="drop">버리기</button>`;
    } else if (where === 'equip') {
      h += `<button class="btn" data-act="unequip">해제</button>`;
    }
    if (b?.slot && !it.book && where) h += `<button class="btn${it.lock ? ' on' : ''}" data-lock="${it.uid}">${it.lock ? '잠금 풀기' : '잠금'}</button>`; // v0.45 잠근 장비는 팔거나 분해 · 버리지 않는다
    h += '</div>';
    return h;
  }

  // 파견소: 용병 여럿 · 지역 · 기간 · 챙길 물약/영약을 골라 보낸다
  guildParts(gb) {
    const Q = {};
    const st = this.w.st, t = townOf(st), P = (this.party ||= { ids: [], pack: {} });
    const zones = ZONES.filter((z) => isLiberated(st, z.id));
    if (!zones.some((z) => z.id === P.zone)) P.zone = zones[0]?.id;
    if (!EXPEDITIONS.some((e) => e.id === P.exp)) P.exp = 'mid';
    P.ids = P.ids.filter((id) => t.mercs.some((m) => m.id === id && !m.job && !m.work));
    const zn = ZONES.find((z) => z.id === P.zone), sh = zn ? shelterLv(st, zn.id) : 0;
    const pack = Object.entries(P.pack).filter(([, q]) => q > 0).map(([base, qty]) => ({ base, qty })), boost = packBoost(pack);
    const back = t.mercs.filter((m) => m.job && Date.now() >= m.job.until).length;
    let h = '';
    Q.info = `<div class="kv"><span>한 번에</span><b>${partyMax(st)}명</b><span>챙길 물건</span><b>${packMax(st)}개</b></div>`;
    Q.back = '';
    if (back) Q.back = `<div class="btns"><button class="btn gold" data-claimall="1">돌아온 용병 ${back}명 전리품 받기</button></div>`;
    const away = t.mercs.filter((m) => m.job && Date.now() < m.job.until);
    Q.away = `<h3>파견 중 <span class="cnt">${away.length}</span></h3>` + (away.length ? '' : '<div class="note">없음</div>');
    if (away.length) Q.away += `` + away.map((m) => `<div class="row"><div class="grow"><b>${esc(m.name)}</b> <small class="note">${ZONES.find((z) => z.id === m.job.zone)?.name || ''} · ${Math.ceil((m.job.until - Date.now()) / 60000)}분</small>${gauge(m.job.from, m.job.until, 1800000, '#ffc860')}</div></div>`).join('');
    if (!zones.length) { Q.none = '<div class="note">해방한 지역 없음</div>'; return Q; }
    Q.zone = `<h3>지역</h3><div class="btns" style="flex-wrap:wrap;margin:0">${zones.map((z) => `<button class="btn ${z.id === P.zone ? 'on' : ''}" data-pzone="${z.id}">${z.name}${shelterLv(st, z.id) ? ` · 쉼터 ${shelterLv(st, z.id)}` : ''}</button>`).join('')}</div>
      <div class="note">쉼터 ${sh}단계 · ${SHELTER.text(sh)}</div>`;
    Q.zone += `<h3 style="margin-top:8px">기간</h3><div class="btns" style="flex-wrap:wrap;margin:0">${EXPEDITIONS.map((e) => `<button class="btn ${e.id === P.exp ? 'on' : ''}" data-pexp="${e.id}" ${e.rest && sh < e.rest ? 'disabled' : ''}>${e.name} ${e.min >= 60 ? e.min / 60 + '시간' : e.min + '분'}${e.rest && sh < e.rest ? ` · 쉼터 ${e.rest}` : ''}</button>`).join('')}</div>`;
    const staNeed = Math.round(EXP_STA[P.exp] * (1 - SHELTER.sta * sh));
    Q.mercs = `<h3>용병 <small>${P.ids.length} / ${partyMax(st)} · 체력 ${staNeed}</small></h3>`;
    Q.mercs += t.mercs.filter((m) => !m.job && !m.work).map((m) => { const on = P.ids.includes(m.id), weak = Math.max(0, 1 - m.sta / Math.max(1, staNeed)), dc = zn ? Math.min(0.75, deathChance(m, zn, P.exp, st, boost) * (1 + 2 * weak)) : 0;
      return `<div class="row mrow pick ${on ? 'on' : ''}" data-pm="${m.id}">${this.mercLine(m, 'hunt')}<div class="note" style="min-width:5.5em;color:${dc > 0.15 ? '#ff7060' : ''}">사망 ${Math.round(dc * 100)}%${m.sta < staNeed ? ` · <b style="color:#ff7060">지침 ${Math.floor(m.sta)} / ${staNeed}</b>` : ''}${m.rest ? ' · 여관' : ''}${freshK(m) ? ` · <b style="color:#7fe07a">기운 +${Math.round(freshK(m) * 100)}%</b>` : ''}</div></div>`; }).join('') || '<div class="note">쉬는 용병 없음</div>';
    const goods = [...new Set([...st.inv, ...vault().items].filter((x) => ['potion', 'elixir', 'food'].includes(BASES[x?.base]?.type)).map((x) => x.base))].map((base) => ({ base, qty: resCount(st, base) })); // v0.49.73 용병 식량도 // 가방 + 창고
    const tot = pack.reduce((a, p) => a + p.qty, 0);
    Q.pack = `<h3>챙길 물건 <small>${tot} / ${packMax(st)} · 안전 +${Math.round(boost.safe * 100)}% · 힘 +${Math.round(boost.pow * 100)}%</small></h3>`;
    Q.pack += goods.map((x) => `<div class="row packrow"><div class="cell shopIco">${ico(x)}</div><div class="grow">${BASES[x.base].name} <small class="note">${x.qty}</small></div><button class="btn" data-ppack="${x.base}|-1">-</button><b style="min-width:1.6em;text-align:center">${P.pack[x.base] || 0}</b><button class="btn" data-ppack="${x.base}|1">+</button></div>`).join('') || '<div class="note">물약 · 영약 없음</div>';
    { const zn0 = ZONES.find((z) => z.id === P.zone), ex = EXPEDITIONS.find((e) => e.id === P.exp);
      Q.go = `<div class="goBar"><div class="grow"><b>${zn0?.name || ''}</b> <small>${ex?.name || ''}</small><div class="note">용병 ${P.ids.length} / ${partyMax(st)} · 물건 ${tot} / ${packMax(st)} · 안전 +${Math.round(boost.safe * 100)}% · 힘 +${Math.round(boost.pow * 100)}%</div></div><button class="btn gold" data-psend="1" ${P.ids.length ? '' : 'disabled'}>파견 보내기</button><button class="btn" data-psend="rep" ${P.ids.length ? '' : 'disabled'}>반복</button></div>`; }
    Q.send = `<div class="btns"><button class="btn gold" data-psend="1" ${P.ids.length ? '' : 'disabled'}>파견 보내기</button><button class="btn" data-psend="rep" ${P.ids.length ? '' : 'disabled'}>반복 파견</button></div>`;
    // v0.44.15 반복 중인 무리
    const reps = [...new Map(t.mercs.filter((m) => m.repeat).map((m) => [m.repeat.key, m.repeat])).values()];
    Q.reps = `<h3>반복 파견 <span class="cnt">${reps.length}</span></h3>` + (reps.length ? '' : '<div class="note">없음</div>');
    if (reps.length) Q.reps += `` + reps.map((r) => `<div class="row"><div class="grow">${r.key.split(',').map((id) => esc(mercById(st, id)?.name || '')).join(' · ')} <small class="note">${ZONES.find((z) => z.id === r.zone)?.name || ''} · ${EXPEDITIONS.find((e) => e.id === r.exp)?.name || ''}</small></div><button class="btn" data-prepstop="${r.key}">멈추기</button></div>`).join('');
    return Q;
  }
  guildPanel(gb) { const Q = this.guildParts(gb); return Q.info + Q.back + Q.away + (Q.none || Q.zone + COL + Q.mercs + COL + Q.pack + Q.send + Q.reps); }


  // 제작소 내용 조각 (예전 한 화면 · v0.45 탭 화면이 함께 쓴다)
  workshopParts(st, b, t) {
    const P = {};
    P.herbs = `<h3>약초</h3><div class="herbList">${HERB_IDS.map((h) => `<span class="hb"><img src="${herbIcon(h)}" alt="" />${HERBS[h].name} <b>${Math.floor(t.herbs[h] || 0)}</b></span>`).join('')}</div>`;
    P.swap = `<h3>약초 교환 <small>남는 약초 3 → 1</small></h3>` + GROW_IDS.map((h) => `<div class="row"><div class="grow"><img src="${herbIcon(h)}" alt="" style="width:20px;vertical-align:middle" /> <b>${HERBS[h].name}</b> <small>${herbSwapGold(h)} G</small></div><button class="btn" data-hswap="${h}|1">1</button><button class="btn" data-hswap="${h}|10">×10</button></div>`).join('');
    // v0.42 높은 강화석 (제작소 6 · 8단계)
    P.ore = `<h3>강화석 제작</h3>` + ORE_RECIPES.map((r) => { const ok = oreRecipeOk(st, r); const need = Object.entries(r.need).map(([id, q]) => `${BASES[id].name} ${q} (${resCount(st, id)})`).join(' · ');
      return `<div class="row"><div class="cell shopIco">${ico({ base: r.id })}</div><div class="grow"><b>${BASES[r.id].name}</b><div class="note">${b.lv < r.lv ? `제작소 ${r.lv}단계` : `${need} · 지역 재료 ${r.zoneMats} · ${r.gold.toLocaleString()} G`}</div></div><button class="btn" data-orecraft="${r.id}|1" ${ok.ok ? '' : 'disabled'}>1개</button><button class="btn" data-orecraft="${r.id}|5" ${oreRecipeOk(st, r, 5).ok ? '' : 'disabled'}>5개</button></div>`; }).join('') + KEY_PANEL(st, b);
    P.ess = `<h3>정수 교환</h3>` + ESS_RECIPES.map((r0) => { const r = essRecipe(st, r0); const [from, q] = Object.entries(r.need)[0], ok = oreRecipeOk(st, r);
        return `<div class="row"><div class="cell shopIco">${ico({ base: r.id })}</div><div class="grow"><b>${BASES[r.id].name} ${r.out}</b><div class="note">${BASES[from].name} ${q} (${resCount(st, from)}) · ${r.gold.toLocaleString()} G</div></div><button class="btn" data-esscraft="${r.rid}|1" ${ok.ok ? '' : 'disabled'}>1번</button><button class="btn" data-esscraft="${r.rid}|5" ${oreRecipeOk(st, r, 5).ok ? '' : 'disabled'}>5번</button></div>`; }).join('');
    const q = t.brew || [], ready = q.filter((x) => x.until <= Date.now()).length;
    P.queue = !q.length ? '' : `<h3>제작 중 <span class="cnt">${q.length} / ${brewQueue(st)}</span>${ready ? '<button class="btn gold" data-brewget="bag" style="margin-left:auto">가방으로</button><button class="btn gold" data-brewget="vault">창고로</button>' : ''}</h3>` + q.map((x) => `<div class="row"><div class="cell shopIco">${ico({ base: x.id })}</div><div class="grow"><b>${BASES[x.id].name} ×${x.n}</b> <small class="note">${x.until <= Date.now() ? '완성' : `${Math.ceil((x.until - Date.now()) / 1000)}초`}</small>${gauge(x.from, x.until, 60000, '#7fe07a')}</div></div>`).join('');
    P.recipes = '<h3>만들기</h3>';
    for (const rc of RECIPES) {
      const open = rc.lv <= b.lv, can = (k) => open && Object.entries(rc.herbs).every(([h, q]) => (t.herbs[h] || 0) >= q * k) && Object.entries(rc.mats || {}).every(([id, q]) => resCount(st, id) >= q * k) && st.gold >= brewGold(st, rc) * k;
      const it = { base: rc.id }, E = ELIXIRS[rc.id], RS = BASES[rc.id].restore, fx = E ? E.text : RS ? (RS.hp ? `HP ${RS.hp.toLocaleString()}` : `MP ${RS.mp.toLocaleString()}`) : BASES[rc.id].text || '';
      P.recipes += `<div class="row" style="${open ? '' : 'opacity:.45'}"><div class="cell shopIco">${ico(it)}</div><div class="grow"><b>${BASES[rc.id].name}${rc.n > 1 ? ` ×${rc.n}` : ''}</b> <small class="note">${fx}</small>
        <div class="note">${open ? Object.entries(rc.herbs).map(([h, q]) => `${HERBS[h].name} ${q}`).concat(Object.entries(rc.mats || {}).map(([id, q]) => `${BASES[id].name} ${q}`)).join(' · ') + ` · ${brewGold(st, rc)} G · ${brewTime(rc) / 1000}초` : `제작소 ${rc.lv}단계`}</div></div>
        ${open ? `<button class="btn" data-brew="${rc.id}|1" ${can(1) ? '' : 'disabled'}>만들기</button><button class="btn" data-brew="${rc.id}|5" ${can(5) ? '' : 'disabled'}>×5</button><button class="btn ${t.autoBrew === rc.id ? 'on' : ''}" data-autobrew="${rc.id}">반복</button>` : ''}</div>`;
    }
    return P;
  }
  // ───── v0.45 대장간: 강화 · 제련 · 분해와 용병 탭. 한 탭은 두 쪽(왼쪽 작업 · 오른쪽 고르기)까지만 ─────
  itemCells(list, selKey, attr) {
    if (!list.length) return '<div class="note">없음</div>';
    return `<div class="grid fGrid">${list.map(([k, it, where]) => `<div class="cell${rar(it)}${k === selKey ? ' sel' : ''}" data-${attr}="${k}">${ico(it)}${lk(it)}${it.plus ? `<span class="q${plusCls(it.plus)}">+${it.plus}</span>` : ''}${where === '착용' ? '<span class="lab">E</span>' : where === '창고' ? '<span class="lab">창고</span>' : ''}</div>`).join('')}</div>`;
  }
  // v0.45 건물별 탭 화면 (대장간 · 제작소는 따로)
  buildingView(b, sel) {
    const st = this.w.st, t = townOf(st), def = BUILDINGS[b.type], MT = ['merc', '용병'], now = Date.now();
    const mercRow = (m, btn = '') => `<div class="row mrow">${this.mercLine(m)}${btn}</div>`;
    const prod = () => { const eff = Math.min(1, t.mercs.filter((m) => m.work === sel && !m.tired).reduce((a, m) => a + (m[b.type] || 0) / 10, 0) / b.lv);
      return `<h3>${def.name} · ${b.lv}단계</h3><div class="kv"><span>생산</span><b>시간당 ${Math.round(def.rate(b.lv) * eff)}</b><span>쌓인 양</span><b>${Math.floor(b.stock)} / ${storeCap(st, b)}</b></div><div class="mini" style="margin:6px 0"><i style="width:${(b.stock / storeCap(st, b)) * 100}%;background:linear-gradient(#ffe7a0,#c99a3a)"></i></div><div class="btns forgeGo"><button class="btn gold big" data-collect="1" ${b.stock < 1 ? 'disabled' : ''}>거두기</button></div>`; };
    switch (b.type) {
      case 'smithy': return this.smithyView(b, sel);
      case 'workshop': return this.workshopView(b, sel);
      case 'herb': return this.tabView(b, 'herb', [['main', '약초'], ...(b.lv >= 11 ? [['grow', '재배']] : []), MT], (k) => k === 'merc' ? this.mercTab(b, sel) : k === 'grow' ? this.herbGrow(st, t, b) : [prod(), `<h3>자라는 약초</h3><div class="herbList herbCards">${herbsAt(10).map((h) => { const on = HERBS[h].lv <= b.lv; return `<span class="hb" style="${on ? '' : 'opacity:.4'}"><img src="${herbIcon(h)}" alt="" />${HERBS[h].name} <b>${on ? Math.floor(t.herbs[h] || 0) : `${HERBS[h].lv}단계`}</b></span>`; }).join('')}</div>`]);
      case 'mine': return this.tabView(b, 'mine', [['main', '광산'], MT], (k) => k === 'merc' ? this.mercTab(b, sel) : [prod(), `<h3>가진 강화석</h3><div class="herbList herbCards">${['ore', 'ore2', 'ore3'].filter((id) => BASES[id]).map((id) => `<span class="hb">${ico({ base: id })}${BASES[id].name} <b>${resCount(st, id).toLocaleString()}</b></span>`).join('')}</div>`]);
      case 'house': return this.tabView(b, 'house', [['main', '숙소'], MT], (k) => {
        if (k === 'merc') return this.mercTab(b, sel);
        const low = [...t.mercs].sort((a, c) => a.sta / staMax(a) - c.sta / staMax(c));
        return [`<h3>숙소 · ${b.lv}단계</h3><div class="kv"><span>고용 한도</span><b>${mercSlots(st)}명</b><span>지금</span><b>${t.mercs.length}명</b><span>쉬고 난 기운</span><b>힘 +${Math.round(FRESH.k * b.lv * 100)}% · 2시간</b><span>하루 품삯</span><b class="goldTxt">${wageTotal(st).toLocaleString()} G</b></div>`,
          `<h3>용병 체력 <span class="cnt">${t.mercs.length}</span></h3>` + low.map((m) => mercRow(m, `<div class="note" style="min-width:5.5em">${m.rest ? '여관' : m.tired ? '지침' : m.job ? '파견' : ''} ${Math.floor(m.sta)} / ${staMax(m)}</div>`)).join('')]; });
      case 'lab': return this.tabView(b, 'lab', [['main', '연구'], ['map', '지도'], MT], (k) => {
        if (k === 'merc') return this.mercTab(b, sel);
        if (k === 'map') return this.labMap(st, t, now);
        const ids = Object.keys(RESEARCH); if (!ids.includes(this.labSel)) this.labSel = ids[0];
        const R = ids.map((id) => { const r = RESEARCH[id], lv = researchLv(st, id), open = b.lv >= r.lab; return `<div class="row pick${id === this.labSel ? ' on' : ''}" data-labsel="${id}" style="${open ? '' : 'opacity:.45'}"><div class="grow"><b>${r.name}</b> <small>${lv} / ${researchMax(st, id)}</small><div class="note">${open ? (lv ? r.text(lv) : '없음') : `연구소 ${r.lab}단계`}</div></div></div>`; }).join('');
        const id = this.labSel, r = RESEARCH[id], lv = researchLv(st, id), c = researchCost(lv, id), max = lv >= researchMax(st, id), open = b.lv >= r.lab, jobs = labJobs(st), full = jobs.length >= labSlots(st);
        let L = `<h3>연구 중 <span class="cnt">${jobs.length} / ${labSlots(st)}</span></h3>` + (jobs.map((j) => `<div class="row"><div class="grow"><b>${RESEARCH[j.id].name}</b> <small class="note">${Math.max(1, Math.ceil((j.until - now) / 60000))}분</small>${gauge(j.from, j.until)}</div></div>`).join('') || '<div class="note">없음</div>');
        L += `<h3 style="margin-top:10px">${r.name} <small>${lv} / ${researchMax(st, id)}</small></h3><div class="kv"><span>지금</span><b>${lv ? r.text(lv) : '없음'}</b>${max ? '' : `<span>다음</span><b><em>${r.text(lv + 1)}</em></b><span>금화</span><b style="${st.gold < c.gold ? 'color:#ff7060' : ''}">${c.gold.toLocaleString()} G</b><span>재료</span><b>${c.mats}${c.ess ? ` · ${BASES[c.ess.id].name} ${c.ess.n}` : ''}${c.ore2 ? ` · 상급 강화석 ${c.ore2}` : ''}${c.herbs ? ` · 높은 약초 ${c.herbs}` : ''}</b><span>시간</span><b>${c.min}분</b>`}</div>`;
        L += open ? `<div class="btns forgeGo"><button class="btn gold big" data-research="${id}" ${max || full || jobs.some((j) => j.id === id) || st.gold < c.gold ? 'disabled' : ''}>${max ? '완료' : '연구'}</button></div>` : `<div class="note">연구소 ${r.lab}단계</div>`;
        return [L, `<h3>연구</h3>` + R]; });
      case 'inn': return this.tabView(b, 'inn', [['hire', '고용'], ['mine', '내 용병'], ['rest', '휴식'], MT], (k) => {
        if (k === 'merc') return this.mercTab(b, sel);
        const slots = mercSlots(st);
        if (k === 'hire') {
          const rec = recruits(st), nextH = Math.ceil((3600000 - (now % 3600000)) / 60000);
          const eLv = Math.min(10, b.lv + Math.round(relicBonus(st, 'inn'))), my = MYTH_CHANCE(eLv), gw0 = BUILDINGS.inn.grades(Math.max(1, Math.min(5, eLv))), gs = gw0.reduce((a, v) => a + v, 0), gw = [...gw0.map((v) => v * (1 - my)), gs * my];
          return [`<h3>고용</h3><div class="kv"><span>고용</span><b>${t.mercs.length} / ${slots}</b><span>새 용병</span><b>${nextH}분 뒤</b><span>하루 품삯</span><b class="goldTxt">${wageTotal(st).toLocaleString()} G</b></div><h3 style="margin-top:8px">등급 확률</h3><div class="kv">${GRADES.map((g, i) => `<span style="color:${g.color}">${g.name}</span><b style="color:${g.color}">${Math.round((gw[i] / gs) * 100)}%</b>`).join('')}</div>`,
            `<h3>찾아온 용병 <span class="cnt">${rec.length}</span></h3>` + (rec.map((m) => mercRow(m, `<button class="btn gold" data-hirem="${m.id}" ${t.mercs.length >= slots || st.gold < m.cost ? 'disabled' : ''}>${m.cost.toLocaleString()} G</button>`)).join('') || '<div class="note">없음</div>')];
        }
        if (k === 'rest') {
          const beds = INN_BEDS(b.lv), resting = t.mercs.filter((m) => m.rest), tired = t.mercs.filter((m) => !m.rest && (m.tired || m.sta < staMax(m) * 0.5) && !m.job);
          const sta = (m) => `<div class="note" style="min-width:5.5em">체력 ${Math.floor(m.sta)} / ${staMax(m)}</div>`;
          return [`<h3>침대 <span class="cnt">${resting.length} / ${beds}</span> <small>회복 ×${innRestK(st).toFixed(1)}</small></h3>` + (resting.map((m) => mercRow(m, sta(m))).join('') || '<div class="note">없음</div>'),
            `<h3>지친 용병 <span class="cnt">${tired.length}</span></h3>` + (tired.map((m) => mercRow(m, sta(m))).join('') || '<div class="note">없음</div>')];
        }
        // 내 용병: 오른쪽 목록에서 고르면 왼쪽에 상태 · 장비 · 각성 · 내보내기
        if (!t.mercs.some((m) => m.id === this.innSel)) this.innSel = t.mercs[0]?.id;
        const stateOf = (m) => { const lf = m.job ? Math.max(0, m.job.until - now) : 0, where = m.work && t.plots[m.work] ? BUILDINGS[t.plots[m.work].type].name : ''; return m.job ? (lf > 0 ? `${ZONES.find((z) => z.id === m.job.zone)?.name || ''} 파견 · ${Math.ceil(lf / 60000)}분` : '돌아옴') : m.rest ? '여관에서 쉬는 중' : m.tired ? '지쳐서 쉬는 중' : where ? `${where}에서 일함` : '쉬는 중'; };
        const R = `<h3>내 용병 <span class="cnt">${t.mercs.length} / ${slots}</span></h3>` + t.mercs.map((m) => `<div class="row mrow pick${m.id === this.innSel ? ' on' : ''}" data-innsel="${m.id}">${this.mercLine(m)}<div class="note" style="min-width:6.5em">${stateOf(m)}</div></div>`).join('');
        const m = t.mercs.find((x) => x.id === this.innSel);
        if (!m) return ['<h3>내 용병</h3><div class="note">없음</div>', R];
        const lf = m.job ? Math.max(0, m.job.until - now) : 0;
        let L = `<h3>${esc(m.name)}</h3><div class="row mrow">${this.mercLine(m)}</div><div class="kv"><span>상태</span><b>${stateOf(m)}</b><span>체력</span><b>${Math.floor(m.sta)} / ${staMax(m)}</b><span>하루 품삯</span><b class="goldTxt">${mercWage(m).toLocaleString()} G</b>${m.gear ? `<span>장비</span><b>${m.gear.ilvl}</b>` : ''}</div>${m.job && lf > 0 ? gauge(m.job.from, m.job.until, 1800000, '#ffc860') : ''}`;
        L += `<div class="btns forgeGo">${m.job && lf <= 0 ? `<button class="btn gold" data-claim="${m.id}">전리품</button>` : ''}${m.lv >= MERC.lvMax && (m.aw || 0) < MERC.awMax ? `<button class="btn gold" data-mawk="${m.id}" ${st.gold < awakenCost(m) ? 'disabled' : ''}>각성 ${awakenCost(m).toLocaleString()}G</button>` : ''}${!m.job ? `<button class="btn" data-mgear="${m.id}">장비</button><button class="btn danger" data-mfire="${m.id}">내보내기</button>` : ''}</div>`;
        return [L, R]; });
      case 'guild': { const Q0 = this.guildParts(b), busy = t.mercs.some((m) => m.job) || !!Q0.reps; // v0.45.7 파견 중 · 반복이 없으면 현황 탭을 숨긴다
        if (!busy && this.bTab?.guild === 'now') this.bTab.guild = 'send';
        return this.tabView(b, 'guild', [['send', '파견'], ['pack', '물건'], ...(busy ? [['now', '현황']] : []), ['loot', '받을 물건'], MT], (k) => {
        if (k === 'merc') return this.mercTab(b, sel);
        if (k === 'loot') {
          const drop = t.expDrop || {}, RN = { common: '일반', magic: '마법', rare: '희귀', hero: '영웅', legend: '전설', myth: '신화' }, V = vault().items;
          const L = `<h3>받을 장비</h3>` + RARITY_IDS.map((r) => `<div class="row"><div class="grow"><b style="color:${RARITY[r]?.color || ''}">${RN[r]}</b></div><button class="btn${drop[r] ? '' : ' on'}" data-expdrop="${r}|0">받기</button><button class="btn${drop[r] ? ' on' : ''}" data-expdrop="${r}|1">버리기</button></div>`).join('')
            + `<h3 style="margin-top:8px">받는 물건</h3><div class="kv"><span>장비</span><b>받기로 한 등급만</b><span>보석 · 능력치 파편</span><b>모두</b><span>던전 열쇠 · 지도 조각</span><b>모두</b><span>물약</span><b>없음</b></div>`;
          const potN = [...st.inv, ...V].filter((x) => x && !x.lock && BASES[x.base]?.type === 'potion').length;
          const R = `<h3>쌓인 물건 정리 <small>잠금 · 이름 있는 전설 · 착용 제외</small></h3>` + RARITY_IDS.map((r) => { const nb = junkCount(st, st.inv, r), nv = junkCount(st, V, r); return `<div class="row"><div class="grow"><b style="color:${RARITY[r]?.color || ''}">${RN[r]} 장비</b><div class="note">가방 ${nb} · 창고 ${nv}</div></div><button class="btn danger" data-junk="${r}" ${nb + nv ? '' : 'disabled'}>버리기</button></div>`; }).join('')
            + `<div class="row"><div class="grow"><b>물약</b><div class="note">가방 · 창고 ${potN}칸</div></div><button class="btn danger" data-junk="potion" ${potN ? '' : 'disabled'}>버리기</button></div>`;
          return [L, R];
        }
        const Q = Q0;
        if (k === 'now') return [Q.info + Q.back + Q.away, Q.reps || '<h3>반복 파견</h3><div class="note">없음</div>'];
        if (Q.none) return [Q.none, ''];
        return [Q.back + Q.go + Q.zone, k === 'pack' ? Q.pack : Q.mercs]; }); }
      case 'altar': return this.tabView(b, 'altar', [['main', '유물'], ...(censerSlotsOf(st) ? [['censer', '향로']] : [])], (k) => {
        if (k === 'censer') return this.censerTab(st, t);
        const R = (st.relics ||= { bag: [], on: [] }), slots = altarSlots(b.lv); R.on = (R.on || []).filter((r) => r.until > now);
        const lf = (r) => { const m = Math.ceil((r.until - now) / 60000), h = Math.floor(m / 60); return h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간` : `${h}시간 ${m % 60}분`; };
        const G = (r) => RELIC_GRADES[r.g] || RELIC_GRADES[0];
        return [`<h3>올린 유물 <span class="cnt">${R.on.length} / ${slots}</span></h3>` + (R.on.map((r, i) => `<div class="row"><div class="grow"><b style="color:${G(r).color}">${RELIC[r.id].name}</b> <small>${G(r).name}</small><div class="note">${RELIC[r.id].text(relicV(r))} · ${lf(r)}</div></div><button class="btn" data-reloff="${i}">내리기</button></div>`).join('') || '<div class="note">없음</div>'),
          `<h3>가진 유물 <span class="cnt">${(R.bag || []).length}</span></h3>` + ((R.bag || []).map((r, i) => `<div class="row"><div class="grow"><b style="color:${G(r).color}">${RELIC[r.id].name}</b> <small>${G(r).name} · ${Math.round(G(r).days * altarDur(b.lv) * 10) / 10}일</small><div class="note">${RELIC[r.id].kind} · ${RELIC[r.id].text(relicV(r))}</div></div><button class="btn gold" data-relon="${i}" ${R.on.length >= slots ? 'disabled' : ''}>올리기</button></div>`).join('') || '<div class="note">없음</div>')]; });
    }
    return null;
  }
  // 건물 탭 화면: 맨 위 탭 줄 + 두 쪽 [왼쪽, 오른쪽]
  tabView(b, key, tabs, pages) {
    const st = this.w.st, cur = this.bTab?.[key] && tabs.some((x) => x[0] === this.bTab[key]) ? this.bTab[key] : tabs[0][0];
    const head = `<div class="stabs">${tabs.map(([k, n]) => `<button class="tab txt${k === cur ? ' on' : ''}" data-stab="${key}|${k}"><span>${n}</span></button>`).join('')}${b === null ? '' : `<span class="stabInfo">${typeof b === 'string' ? b : `${BUILDINGS[b.type].name} ${b.lv}단계${b.bld ? ` · <span style="color:#ffd84a">${b.bld.to}단계로 올리는 중 ${Math.max(1, Math.ceil((b.bld.until - Date.now()) / 60000))}분</span>${countOf(st, 'build_rush') ? ' <button class="btn" data-rush="1">촉진제</button>' : ''}` : ''}`} · <span class="goldTxt">${st.gold.toLocaleString()} G</span></span>`}</div>`; // null = 오른쪽 위 정보 없음 (랭킹)
    const pg = pages(cur);
    if (typeof pg === 'string') return `<div class="smithWrap">${head}${pg}</div>`; // v0.49.83 탭 하나가 통째로 (현자 도감)
    const [L, R] = pg;
    return `<div class="smithWrap">${head}<div class="cols"><div class="frame detail fPage">${L}</div><div class="frame detail fPage">${R}</div></div></div>`;
  }
  smithyView(b, sel) {
    const st = this.w.st;
    const tune = raidOpen(st) || ['t_reroll', 't_socket', 't_engx', 't_shardx', 't_engrave', 'eng_stone'].some((id) => countOf(st, id)); // v0.50 원정 상점 물건이 있으면 손질 탭
    return this.tabView(b, 'smithy', [['enh', '강화'], ['inh', '계승'], ['ref', '제련'], ...(tune ? [['tune', '손질']] : []), ['salv', '분해'], ['merc', '용병']], (k) => k === 'enh' ? this.smithEnh(st) : k === 'inh' ? this.smithInherit(st) : k === 'ref' ? this.smithRef(st, b) : k === 'tune' ? this.smithTune(st) : k === 'salv' ? this.smithSalv(st) : this.mercTab(b, sel));
  }
  workshopView(b, sel) {
    const st = this.w.st, t = townOf(st), P = this.workshopParts(st, b, t);
    return this.tabView(b, 'workshop', [['make', '제작'], ['swap', '교환'], ['merc', '용병']], (k) => {
      if (k === 'make') return [P.queue || `<h3>제작 중 <span class="cnt">0 / ${brewQueue(st)}</span></h3><div class="note">없음</div>`, P.recipes + P.ore];
      if (k === 'swap') {
        // 오른쪽: 가진 재료 (약초 · 강화석 · 정수)
        const mats = ['ore', ...ORE_RECIPES.map((r) => r.id), ...new Set(ESS_RECIPES.flatMap((r) => [r.id, ...Object.keys(r.need)]))].filter((id, i, a) => BASES[id] && a.indexOf(id) === i);
        const inv = P.herbs + `<h3>재료</h3><div class="herbList">${mats.map((id) => `<span class="hb">${ico({ base: id })}${BASES[id].name} <b>${resCount(st, id).toLocaleString()}</b></span>`).join('')}</div>`;
        return [P.swap + P.ess + (b.lv >= 16 ? `<h3>지역 재료 바꾸기 <small>5 → 위 지역 1</small></h3>` + Object.keys(MATERIALS).slice(0, -1).map((z, i) => { const to = Object.keys(MATERIALS)[i + 1], have = t.mats[z] || 0; return `<div class="row"><div class="grow"><b>${MATERIALS[z].name}</b> → ${MATERIALS[to].name} <small class="note">${have}</small></div><button class="btn" data-mconv="${z}|1" ${have >= 5 ? '' : 'disabled'}>×1</button><button class="btn" data-mconv="${z}|10" ${have >= 50 ? '' : 'disabled'}>×10</button></div>`; }).join('') : ''), inv];
      }
      return this.mercTab(b, sel);
    });
  }
  smithEnh(st) {
    const list = gearList(st, (x) => !x.book && !x.noDrop);
    if (!list.some((x) => x[0] === this.enhSel)) this.enhSel = list[0]?.[0] ?? null; // 고르기 전에도 왼쪽이 비지 않게 첫 장비
    const right = `<h3>장비 <span class="cnt">${list.length}</span></h3>` + this.itemCells(list, this.enhSel, 'esel');
    const cur = list.find((x) => x[0] === this.enhSel);
    if (!cur) return [`<h3>강화</h3><div class="forgeSlot empty"></div>`, right];
    const [key, it, where] = cur, cap = enhanceCap(st), n = it.plus || 0, max = n >= cap, c = enhanceCost(it, st, this.useWhet && n >= 20 && countOf(st, 'whetstone') > 0, this.useWhet2 && n >= 10 && n < 20 && countOf(st, 'whet2') > 0), b = BASES[it.base];
    const nx = { ...it, plus: n + 1 };
    const stat = b.dmg ? (() => { const a = scaledDmg(it), z = scaledDmg(nx); return `<span>${WEAPON_CLASSES[b.cls]?.kind === 'magic' ? '마법 공격력' : '물리 공격력'}</span><b>${a[0]}~${a[1]}${max ? '' : ` <i class="arw">▶</i> <em>${z[0]}~${z[1]}</em>`}</b>`; })() : b.armor ? `<span>방어력</span><b>${scaledArmor(it)}${max ? '' : ` <i class="arw">▶</i> <em>${scaledArmor(nx)}</em>`}</b>` : ''
    // v0.49.34 기본 옵션 · 장신구 기본 효과도 강화만큼
    const bmA = baseMods(it), bmB = baseMods(nx), bmRows = Object.keys(bmA).map((k) => `<span>${modName(k)}</span><b>${bmA[k]}${pct(k)}${max ? '' : ` <i class="arw">▶</i> <em>${bmB[k]}${pct(k)}</em>`}</b>`).join('')
    // v0.49.59 반지 · 목걸이: 붙은 옵션도 강화만큼
    const afRows = affixK(nx) > 1 ? (it.affixes || []).map((a) => { const A = AFFIXES[a.id]; if (!A) return ''; const nm = A.text.replace(/ ?[+-]?\{v\}%?/, ''), u = /%/.test(A.text) ? '%' : ''; return `<span>${nm}</span><b>${affixV(it, a)}${u}${max ? '' : ` <i class="arw">▶</i> <em>${affixV(nx, a)}${u}</em>`}</b>`; }).join('') : '';
    const have = resCount(st, c.oreId), okGold = st.gold >= c.gold, okOre = have >= c.ore;
    let L = `<div class="forgeTop"><div class="cell forgeSlot${rar(it)}">${ico(it)}</div><div><div class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</div><div class="note">${where} · Lv ${it.ilvl}</div><div class="plusBig${plusCls(n)}">+${n}${max ? ' <small>상한</small>' : ` <i class="arw">▶</i> <em>+${n + 1}</em>`}</div></div></div>`;
    if (!max) L += `<div class="kv">${stat}${bmRows}${afRows}<span>성공 확률</span><b class="${c.jang >= 1 ? 'goldTxt' : ''}">${c.jang >= 1 ? '100%' : `${+(c.chance * 100).toFixed(1)}%`}</b><span>장인의 기운</span><b>${+(c.jang * 100).toFixed(1)}%</b><span>금화</span><b style="${okGold ? '' : 'color:#ff7060'}">${c.gold.toLocaleString()} G</b><span>${c.oreName}</span><b style="${okOre ? '' : 'color:#ff7060'}">${c.ore} <small class="note">/ ${have}</small></b></div>
      <div class="btns">${n >= 20 && countOf(st, 'whetstone') ? `<button class="btn${this.useWhet ? ' on' : ''}" data-whet="1">왕좌의 숫돌 ${countOf(st, 'whetstone')} · +5%</button>` : ''}${n >= 10 && n < 20 && countOf(st, 'whet2') ? `<button class="btn${this.useWhet2 ? ' on' : ''}" data-whet2="1">정련 숫돌 ${countOf(st, 'whet2')} · +3%</button>` : ''}${n >= 20 && countOf(st, 'ward_scroll') ? `<button class="btn${this.useWard ? ' on' : ''}" data-ward="1">보호 주문서 ${countOf(st, 'ward_scroll')} · 기운 ×2</button>` : ''}</div>
      <div class="btns forgeGo"><button class="btn gold big" data-enh="${key}" ${okGold && okOre ? '' : 'disabled'}>강화</button></div>`;
    else L += `<div class="kv">${stat}${bmRows}${afRows}</div>`;
    return [L, right];
  }
  // v0.49.75 강화 계승: 왼쪽 = 녹일 장비 · 받을 장비 · 넘어가는 단계 | 오른쪽 = 장비 고르기 (고르는 칸을 왼쪽에서 바꾼다)
  smithInherit(st) {
    const pick = this.ihPick || 'src', list = gearList(st, (x) => !x.book && !x.noDrop && (pick === 'dst' || (x.plus || 0) >= 2));
    const src = gearAt(st, this.ihSrc), dst = gearAt(st, this.ihDst), tk = !!this.ihTicket && countOf(st, 't_inherit2') > 0;
    const right = `<h3>${pick === 'src' ? '녹일 장비' : '받을 장비'} <span class="cnt">${list.length}</span></h3>` + this.itemCells(list, pick === 'src' ? this.ihSrc : this.ihDst, 'ihsel');
    const slot = (it, k, nm) => `<div class="row pick${pick === k ? ' on' : ''}" data-ihpick="${k}"><div class="cell shopIco${it ? rar(it) : ''}">${it ? ico(it) : ''}</div><div class="grow"><b>${nm}</b><div class="note" style="color:${it ? itemColor(it) : ''}">${it ? `${esc(itemName(it))}` : '고르기'}</div></div></div>`;
    let L = `<h3>강화 계승</h3>` + slot(src, 'src', '녹일 장비') + slot(dst, 'dst', '받을 장비');
    if (src && dst) {
      const c = inheritCheck(st, src, dst, tk), [lo, hi] = inheritRange(src, tk);
      L += `<div class="kv" style="margin-top:6px"><span>넘어가는 단계</span><b><em>+${lo} ~ +${hi}</em></b><span>받을 장비 지금</span><b>+${dst.plus || 0}</b><span>계승권</span><b style="${countOf(st, 't_inherit') ? '' : 'color:#ff7060'}">${countOf(st, 't_inherit')} / 1</b></div>
        ${countOf(st, 't_inherit2') ? `<div class="btns"><button class="btn${this.ihTicket ? ' on' : ''}" data-ihticket="1">계승 축복석 ${countOf(st, 't_inherit2')} · 80 ~ 95%</button></div>` : ''}
        ${c.ok ? '' : `<div class="bad">${c.why}</div>`}<div class="btns forgeGo"><button class="btn gold big" data-ihgo="1" ${c.ok ? '' : 'disabled'}>계승</button></div>`;
    }
    return [L, right];
  }
  // v0.50 손질 (원정 상점 물건): 오른쪽 장비 → 왼쪽 옵션 다시 굴림 · 구멍 · 각인 · 파편 추출
  smithTune(st) {
    const list = gearList(st, (x) => !x.book && !x.noDrop);
    if (!list.some((x) => x[0] === this.tuneSel)) this.tuneSel = list[0]?.[0] ?? null;
    const right = `<h3>장비 <span class="cnt">${list.length}</span></h3>` + this.itemCells(list, this.tuneSel, 'tsel');
    const cur = list.find((x) => x[0] === this.tuneSel);
    if (!cur) return ['<div class="note">장비가 없습니다</div>', right];
    const [key, it, where] = cur, n = (id) => countOf(st, id);
    const tk = (id) => `<span class="tkN">${BASES[id].name} ${n(id)}</span>`;
    const aff = (it.affixes || []).map((a, i) => `<div class="row tuneRow"><div class="grow" style="color:${AFFIXES[a.id]?.mythOnly ? '#ff7aa8' : ''}">${affixText(a)}</div>
      <button class="btn" data-treroll="${key}|${i}" ${n('t_reroll') ? '' : 'disabled'}>다시 굴림</button><button class="btn" data-tshard="${key}|${i}" ${n('t_shardx') && !it.lock && where !== '착용' ? '' : 'disabled'}>파편 추출</button></div>`).join('') || '<div class="note">옵션 없음</div>';
    const stones = st.inv.filter((x) => x.base === 'eng_stone');
    const lords = LORDS.filter((L) => (st.raidLords || {})[L.id]);
    const eng = it.rarity === 'myth' ? `<h3 style="margin-top:6px">각인 ${it.eng ? `<span class="goldTxt">${lordName(it.eng)} · ${ENGRAVE[it.eng].text}</span>` : '<span class="note">없음</span>'}</h3>
      <div class="btns" style="flex-wrap:wrap">${lords.map((L) => `<button class="btn" data-teng="${key}|${L.id}" ${n('t_engrave') ? '' : 'disabled'} title="${ENGRAVE[L.id].text}">${L.name}</button>`).join('')}
      ${stones.map((x) => `<button class="btn gold" data-tstone="${key}|${x.uid}">각인석 · ${lordName(x.eng)}</button>`).join('')}
      ${it.eng ? `<button class="btn" data-tengx="${key}" ${n('t_engx') ? '' : 'disabled'}>각인 추출</button>` : ''}</div>` : '';
    const L = `<div class="forgeTop"><div class="cell forgeSlot${rar(it)}">${ico(it)}</div><div><div class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</div><div class="note">${where} · Lv ${it.ilvl}</div></div></div>
      <div class="tkRow">${['t_reroll', 't_shardx', 't_socket', 't_engrave', 't_engx'].map(tk).join('')}</div>
      <h3>옵션</h3>${aff}
      <h3 style="margin-top:6px">보석 구멍 <span class="cnt">${it.sockets || 0} / 3</span> <button class="btn" data-tsock="${key}" style="margin-left:auto" ${n('t_socket') && (it.sockets || 0) < 3 ? '' : 'disabled'}>구멍 뚫기</button></h3>${eng}`;
    return [L, right];
  }
  smithRef(st, smith) {
    const t = townOf(st), list = gearList(st, (x) => x.affixes?.length);
    if (!list.some((x) => x[0] === this.shardTarget)) { this.shardTarget = list[0]?.[0] ?? null; this.shardLocks = []; }
    const right = `<h3>장비 <span class="cnt">${list.length}</span></h3>` + this.itemCells(list, this.shardTarget, 'starget');
    const cur = list.find((x) => x[0] === this.shardTarget);
    if (!cur) return [`<h3>제련</h3><div class="forgeSlot empty"></div>`, right];
    const [, it, where] = cur, max = lockMax(smith.lv), Lk = this.shardLocks || [];
    const shards = shardEntries(st);
    if (!shards.some((x) => x.key === this.shardSel)) this.shardSel = null;
    const sh = shards.find((x) => x.key === this.shardSel)?.shard;
    let L = `<div class="forgeTop"><div class="cell forgeSlot${rar(it)}">${ico(it)}</div><div><div class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</div><div class="note">${where} · 잠금 ${Lk.length} / ${max}</div></div></div>`;
    L += `<div class="refCols"><div><div class="note">잠글 옵션</div>${it.affixes.map((a, k) => { const on = Lk.includes(k); return `<button class="btn affBtn ${on ? 'on' : ''}" data-slock="${k}" ${!on && Lk.length >= max ? 'disabled' : ''}>${on ? '<b>잠금</b> ' : ''}${affixText(a)}</button>`; }).join('')}</div>`;
    L += `<div><div class="note">부여할 능력 <span class="cnt">${shards.length}</span></div><div class="shList">${shards.map((x) => { const okk = canApply(it, x.shard, Lk).ok && shardGrade(x.shard.id, x.shard.v, x.shard.great) <= useGrade(st); return `<button class="btn affBtn ${x.key === this.shardSel ? 'on' : ''}" data-shard="${x.key}" style="color:${x.shard.great ? '#ffb84a' : '#c58cff'};${okk ? '' : 'opacity:.4'}">${x.shard.great ? '탁월 ' : ''}${affixText(x.shard)}</button>`; }).join('') || '<div class="note">파편 없음</div>'}</div></div></div>`;
    if (sh) { const c = shardCost(it), sg = shardGrade(sh.id, sh.v, sh.great), ok = sg > useGrade(st) ? { ok: false, why: `${sgName(sg)} 등급은 아직 쓸 수 없습니다` } : canApply(it, sh, Lk); L += `<div class="btns forgeGo"><button class="btn gold big" data-sapply="1" ${!ok.ok || st.gold < c.gold || t.ore < c.ore ? 'disabled' : ''}>${ok.ok ? `제련 · ${c.gold.toLocaleString()} G · 강화석 ${c.ore}` : ok.why}</button></div>`; }
    return [L, right];
  }
  // v0.49.7 기록 창: 지난 기록 (최근 300줄, 새것이 위) — 왼쪽 오늘 기록 전부 | 오른쪽 종류별 개수
  log() {
    const H = [...(this.w.ui.logHist || [])].reverse(), tm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const L = `<h3>기록 <span class="cnt">${H.length}</span></h3>` + (H.map((x) => `<div class="row logRow"><small class="note">${tm(x.t)}</small><div class="grow" style="${x.color ? `color:${x.color}` : ''}">${esc(x.msg)}</div></div>`).join('') || '<div class="note">없음</div>');
    return `<div class="cols"><div class="frame" style="flex:1;overflow:auto">${L}</div></div>`;
  }
  // v0.49 랭킹: 레벨(각성) · 전투력 탭. 왼쪽 순위 목록 | 오른쪽 내 기록. 열면 바로 불러온다 (1분 안에는 다시 받지 않는다)
  rank() {
    const st = this.w.st, R = (this.rankData ||= {});
    return this.tabView(null, 'rank', [['aw', '레벨'], ['pw', '전투력'], ['mg', '무간지옥']], (by) => {
      const D = R[by];
      if (!D || Date.now() - D.at > 60000) { if (!D?.loading) { R[by] = { ...(D || {}), loading: true, at: D?.at || 0 }; cloud.rank(by).then((list) => { R[by] = { list: list ?? [], at: Date.now() }; if (this.kind === 'rank') this.render(); }); } }
      const list = R[by]?.list, myName = st.nick || st.name, val = (r) => (by === 'pw' ? (r.pw || 0).toLocaleString() : by === 'mg' ? `${r.mg || 0}층` : `각성 ${r.aw}`);
      const me = list ? list.findIndex((r) => r.name === myName) : -1;
      const L = `<h3>${by === 'pw' ? '전투력' : by === 'mg' ? '무간지옥' : '레벨'} 순위 <span class="cnt">${list ? list.length : ''}</span></h3>` + (list == null ? '<div class="note">불러오는 중</div>' : !list.length ? '<div class="note">기록 없음</div>'
        : list.map((r, i) => `<div class="row rankRow${i === me ? ' on' : ''}"><b class="rk${i < 3 ? ' top' + i : ''}">${i + 1}</b><div class="grow"><b>${esc(r.name)}</b> <small style="color:#ffd860">${esc(r.title || '')}</small></div><b class="goldTxt">${val(r)}</b></div>`).join(''));
      const pw = st.power || 0, P = this.w.d ? powerParts(this.w.d, st) : null, big = (v) => (v >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : v >= 1e4 ? `${(v / 1e4).toFixed(1)}만` : Math.round(v).toLocaleString());
      const Rr = `<h3>내 기록</h3><div class="kv tight"><span>이름</span><b>${esc(myName || '')}</b><span>각성</span><b>${st.awakenings || 0}</b><span>전투력</span><b class="goldTxt">${pw.toLocaleString()}</b>${(st.maxTier || 1) >= 5 ? `<span>무간지옥</span><b>${st.muganMax || 1}층</b>` : ''}<span>순위</span><b>${me >= 0 ? `${me + 1}위` : list ? '50위 밖' : ''}</b></div>`
        + (P ? `<h3 style="margin-top:10px">전투력</h3><div class="kv tight"><span>공격</span><b>${big(P.off)}</b><span>방어</span><b>${big(P.def)}</b></div>` : '');
      return [L, Rr];
    });
  }
  // v0.46 연구소 지도: 왼쪽 분석 · 고른 소문 강화 | 오른쪽 소문 목록
  labMap(st, t, now) {
    const R = rumorsOf(st), odd = resCount(st, 'odd_map'), fmt = (ms) => { const m = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(m / 60); return h ? `${h}시간 ${m % 60}분` : `${m}분`; };
    let L = `<h3>지도 분석</h3><div class="kv tight"><span>알 수 없는 조각</span><b>${odd}</b><span>미지의 땅 조각</span><b>${resCount(st, 'map_piece')}</b><span>소문</span><b>${Math.round(RUMOR_P * 100)}%</b></div>`;
    if (t.mapLab) L += `<div class="row"><div class="grow"><b>${t.mapLab.n}장 분석 중</b> <small class="note">${fmt(t.mapLab.until - now)}</small>${gauge(t.mapLab.from, t.mapLab.until)}</div></div>`;
    else { // v0.49.42 장 수를 고른다 (밀대 · 빠른 단추)
      const n = Math.max(1, Math.min(odd, this.mapN || Math.min(odd, 10)));
      L += odd ? `<div class="sellQty mapQty"><input type="range" min="1" max="${odd}" value="${n}" id="mapN" /><b id="mapNv">${n}장 · ${fmt(analyzeTime(st, n))}</b></div>
        <div class="btns">${[1, 10, 50].filter((k) => k < odd).map((k) => `<button class="btn" data-mapq="${k}">${k}장</button>`).join('')}<button class="btn" data-mapq="${odd}">모두</button><button class="btn gold" data-mapan="n">${n}장 분석</button></div>` : '<div class="btns"><button class="btn gold" disabled>분석</button></div>';
    }
    if (!R.some((r) => r.id === this.rumorSel)) this.rumorSel = R[0]?.id;
    const r = R.find((x) => x.id === this.rumorSel);
    if (r) {
      const p = r.plus || 0, cur = PLUS[p], nx = PLUS[p + 1], zn = ZONES[r.zi], to = this.w.tierOffset || 0;
      const pct = (v) => `${+(v * 100).toFixed(1)}%`;
      L += `<h3 style="margin-top:10px">${esc(rumorName(r))}</h3><div class="kv tight"><span>몬스터</span><b>Lv ${zn.levels[1] + 5 + to} · 체력 ×${cur.hp}${nx ? ` <i class="arw">▶</i> <em>×${nx.hp}</em>` : ''}</b><span>장비</span><b>Lv ${zn.levels[1] + 6 + cur.lv + to}${nx ? ` <i class="arw">▶</i> <em>${zn.levels[1] + 6 + nx.lv + to}</em>` : ''}</b><span>전설</span><b>${pct(cur.legend)}${nx ? ` <i class="arw">▶</i> <em>${pct(nx.legend)}</em>` : ''}</b><span>신화</span><b>${pct(cur.myth)}${nx ? ` <i class="arw">▶</i> <em>${pct(nx.myth)}</em>` : ''}</b>`;
      if (nx) { const c = nx.cost; L += `<span>금화</span><b style="${st.gold < c.gold ? 'color:#ff7060' : ''}">${c.gold.toLocaleString()} G</b>` + Object.entries(c).filter(([k2]) => k2 !== 'gold').map(([k2, v]) => `<span>${BASES[k2].name}</span><b style="${resCount(st, k2) < v ? 'color:#ff7060' : ''}">${resCount(st, k2).toLocaleString()} / ${v}</b>`).join(''); }
      L += `</div><div class="btns forgeGo"><button class="btn gold big" data-rup="${r.id}" ${nx ? '' : 'disabled'}>${nx ? `+${p + 1} 강화` : '최고 단계'}</button></div>`;
    }
    const where = (x) => (x.found ? '발견' : x.x != null ? '그 지역 어딘가' : '아직 모름');
    const Rh = `<h3>소문 <span class="cnt">${R.length} / ${RUMOR_MAX}</span></h3>` + (R.map((x) => `<div class="row pick${x.id === this.rumorSel ? ' on' : ''}" data-rsel="${x.id}"><div class="grow"><b style="color:${x.plus ? '#ff9a3c' : '#ffd060'}">${esc(rumorName(x))}</b> <small class="note">${where(x)}</small></div></div>`).join('') || '<div class="note">없음</div>');
    return [L, Rh];
  }
  // 용병 탭 (건물 공용): 왼쪽 이 건물에서 일하는 용병 | 오른쪽 쉬는 용병 → 다른 건물에서 일하는 용병 (데려오기)
  mercTab(b, sel) {
    const st = this.w.st, t = townOf(st), sk = SKILL_OF[b.type];
    if (!sk) return ['', ''];
    const crew = t.mercs.filter((m) => m.work === sel), full = crew.length >= b.lv;
    const by = (a, c) => (c[sk] || 0) - (a[sk] || 0);
    const idle = t.mercs.filter((m) => !m.work && !m.job).sort(by), other = t.mercs.filter((m) => m.work && m.work !== sel && t.plots[m.work] && !m.job).sort(by);
    const L = `<h3>일하는 용병 <span class="cnt">${crew.length} / ${b.lv}</span> <small>${SKILL_NAMES[sk]}${BONUS[b.type] ? ' · ' + BONUS[b.type].text(bonusOf(st, b.type)) : ''}</small></h3>`
      + (crew.sort(by).map((m) => `<div class="row mrow">${this.mercLine(m, sk)}<button class="btn" data-mwork="${m.id}|">쉬게</button></div>`).join('') || '<div class="note">없음</div>');
    // v0.45.7 오른쪽은 쉬는 용병 | 다른 건물 작은 탭으로 (긴 목록 끝까지 내리지 않게)
    const side = this.mercSide === 'other' ? 'other' : 'idle';
    const sw = `<span class="srcBtns"><button class="btn${side === 'idle' ? ' on' : ''}" data-mside="idle">쉬는 용병 ${idle.length}</button><button class="btn${side === 'other' ? ' on' : ''}" data-mside="other">다른 건물 ${other.length}</button></span>`;
    if (side === 'other') return [L, `<h3>${sw}</h3>` + (other.map((m) => `<div class="row mrow">${this.mercLine(m, sk)}<div class="note" style="min-width:4.5em">${BUILDINGS[t.plots[m.work].type].name}</div><button class="btn" data-mwork="${m.id}|${sel}" ${full ? 'disabled' : ''}>데려오기</button></div>`).join('') || '<div class="note">없음</div>')];
    let R = `<h3>${sw}</h3>` + (idle.map((m) => `<div class="row mrow">${this.mercLine(m, sk)}<button class="btn" data-mwork="${m.id}|${sel}" ${full ? 'disabled' : ''}>일 맡기기</button></div>`).join('') || '<div class="note">없음</div>');
;
    return [L, R];
  }
  smithSalv(st) {
    const fromV = this.salvSrc === 'v', ok = (x) => x && !x.book && BASES[x.base]?.slot; // v0.49.43 이름 있는 전설도
    const all = fromV ? vault().items.filter(ok).map((x) => ['v:' + x.uid, x, '창고']) : st.inv.filter(ok).map((x) => ['b:' + x.uid, x, '가방']);
    const junk = this.salvR ? all.filter((x) => x[1].rarity === this.salvR) : all;
    if (!junk.some((x) => x[0] === this.salvSel)) this.salvSel = junk[0]?.[0] ?? null;
    const rf = `<div class="rarRow"><button class="btn${this.salvR ? '' : ' on'}" data-salvr="">전체</button>${RARITY_IDS.filter((r) => all.some((x) => x[1].rarity === r)).map((r) => `<button class="btn${this.salvR === r ? ' on' : ''}" data-salvr="${r}" style="color:${RARITY[r].color}">${RARITY[r].name}</button>`).join('')}</div>`;
    const cur = junk.find((x) => x[0] === this.salvSel);
    const R = `<h3>${this.srcBtns('salvsrc', fromV)} <span class="cnt">${junk.length}</span>${fromV ? '' : '<button class="btn" data-salvageall="1" style="margin-left:auto">등급별 분해</button>'}</h3>` + rf + this.itemCells(junk, this.salvSel, 'vsalv');
    if (!cur) return [`<h3>분해</h3><div class="forgeSlot empty"></div>`, R];
    const it = cur[1], v = salvageValue(it);
    return [`<div class="salvInfo">${this.describe(it, 'view')}</div><div class="kv"><span>강화석</span><b>${v.ore}</b><span>${MATERIALS[v.mat].name}</span><b>${v.matN}</b></div><div class="btns forgeGo"><button class="btn gold big" data-salvage="${fromV ? 'v:' : ''}${it.uid}" ${it.lock ? 'disabled' : ''}>${it.lock ? '잠김' : '분해'}</button></div>`, R];
  }
  // 가방 | 창고 고르기 (상점 판매 · 대장간 분해)
  srcBtns(key, fromV) { return `<span class="srcBtns"><button class="btn${fromV ? '' : ' on'}" data-${key}="b">가방</button><button class="btn${fromV ? ' on' : ''}" data-${key}="v">창고</button></span>`; }
  // 강화 · 제련 결과 연출: 장비 그림 둘레로 빛이 터지고, 바뀐 능력치를 보여 준다
  forgeFx(ok, it, title, lines) {
    document.getElementById('forgeFx')?.remove();
    const el = document.createElement('div'); el.id = 'forgeFx'; el.className = ok ? 'ok' : 'fail';
    el.innerHTML = `<div class="ffBox"><div class="ffGlow"></div><div class="ffRing"></div>${Array.from({ length: 10 }, (_, i) => `<i class="ffOrb" style="--a:${i * 36}deg;--d:${(i % 3) * 0.08}s"></i>`).join('')}<div class="cell ffIco${rar(it)}">${ico(it)}</div>
      <div class="ffName" style="color:${itemColor(it)}">${esc(itemName(it))}</div><div class="ffTitle">${title}</div><div class="ffLines">${lines.join('')}</div><button class="btn gold" data-ffok="1">확인</button></div>`;
    document.body.appendChild(el); cleanTree(el);
    const close = () => el.remove();
    el.querySelector('[data-ffok]').onclick = close;
    setTimeout(() => el.addEventListener('click', (e) => { if (e.target === el) close(); }), 400);
  }

  // 대장간: 능력치 파편으로 착용 장비의 옵션 하나를 바꾼다 (잠근 옵션은 그대로)
  // 제련: ① 장비(착용 · 가방) → ② 능력치 파편 → ③ 잠글 옵션 → 제련. 결과는 팝업으로 전 · 후를 보여 준다
  shardPanel(smith) {
    const st = this.w.st, t = townOf(st);
    let h = `<h3 style="margin-top:8px">제련 <small>잠금 최대 ${lockMax(smith.lv)}개</small></h3>`;
    const targets = gearList(st, (x) => x.affixes?.length);
    if (!targets.length) return h + '<div class="note">옵션이 있는 장비 없음</div>';
    if (!targets.some((x) => x[0] === this.shardTarget)) { this.shardTarget = null; this.shardLocks = []; }
    h += `<div class="note">1 장비</div><div class="btns" style="flex-wrap:wrap;margin:0 0 6px">${targets.map(([k, it, where]) => `<button class="btn ${k === this.shardTarget ? 'on' : ''}" data-starget="${k}" style="color:${itemColor(it)}">${esc(itemName(it))} <small>${where}</small></button>`).join('')}</div>`;
    if (!this.shardTarget) return h;
    const it = targets.find((x) => x[0] === this.shardTarget)[1];
    const shards = shardEntries(st); // 창고 파편도
    if (!shards.some((x) => x.key === this.shardSel)) this.shardSel = null;
    h += `<div class="note">2 능력치 파편</div>` + (shards.length ? `<div class="btns" style="flex-wrap:wrap;margin:0 0 6px">${shards.map((x) => { const okk = canApply(it, x.shard, []).ok; return `<button class="btn ${x.key === this.shardSel ? 'on' : ''}" data-shard="${x.key}" style="color:#c58cff;${okk ? '' : 'opacity:.45'}">${affixText(x.shard)}</button>`; }).join('')}</div>` : '<div class="note">파편 없음</div>');
    const sh = shards.find((x) => x.key === this.shardSel)?.shard;
    const L = this.shardLocks || [], max = lockMax(smith.lv);
    h += `<div class="note">3 지킬 옵션</div>` + it.affixes.map((a, k) => { const on = L.includes(k); return `<div class="row"><div class="grow aff" style="${on ? 'color:#ffd84a' : ''}">${affixText(a)}</div><button class="btn ${on ? 'on' : ''}" data-slock="${k}" ${!on && L.length >= max ? 'disabled' : ''}>${on ? '잠김' : '잠그기'}</button></div>`; }).join('');
    if (!sh) return h;
    const c = shardCost(it), ok = canApply(it, sh, L);
    h += `<div class="btns"><button class="btn gold" data-sapply="1" ${!ok.ok || st.gold < c.gold || t.ore < c.ore ? 'disabled' : ''}>${ok.ok ? `제련 · ${c.gold.toLocaleString()} G · 강화석 ${c.ore}` : ok.why}</button></div>`;
    return h;
  }

  // 장비창: 가운데 캐릭터 초상화, 왼쪽 · 오른쪽 줄에 부위별 칸 (겹치지 않게 칸을 줄로)
  // v0.45.8 가방 아이템 팝업 위에 착용 장비를 작게 한 줄로 (팝업이 장비 칸을 덮어도 비교할 수 있게), 같은 부위는 빛낸다
  // v0.49.33 반지를 고르면 비교할 칸(반지 1 · 2)을 고른다. 빈 칸이 있으면 빈 칸, 아니면 고른 칸 (기본 1)
  ringSlot(st = this.w.st) {
    if (this.ringCmp && (this.ringCmp === 'ring1' || this.ringCmp === 'ring2')) return this.ringCmp;
    return !st.equip.ring1 ? 'ring1' : !st.equip.ring2 ? 'ring2' : 'ring1';
  }
  eqStrip(cur) {
    const st = this.w.st, sl = BASES[cur?.base]?.slot || '', ring = sl === 'ring' && this.sel?.from !== 'equip';
    const w2 = st.equip.weapon && isTwoHandedBase(BASES[st.equip.weapon.base]) && !isBowBase(BASES[st.equip.weapon.base]) ? st.equip.weapon : null; // 활은 화살통 자리로 비워 둔다
    const S = ['weapon', 'offhand', 'helm', 'armor', 'gloves', 'belt', 'boots', 'amulet', 'ring1', 'ring2'];
    return `<div class="eqStrip">${S.map((s) => {
      const it = st.equip[s];
      if (s === 'offhand' && !it && w2) return `<div class="cell twoGhost" title="양손 무기">${ico(w2)}<span class="twoTag">양손</span></div>`; // 양손 무기면 보조 칸에 그 무기를 연하게
      if (ring && (s === 'ring1' || s === 'ring2')) { const on = this.ringSlot(st) === s; return `<div class="cell${it ? rar(it) : ''}${on ? ' hit' : ' dim'}" data-ringcmp="${s}" title="반지 ${s.slice(-1)}과 비교">${it ? ico(it) : ''}<span class="ringNo">${s.slice(-1)}</span></div>`; }
      const hit = sl && s.startsWith(sl.replace(/\d$/, '')); return `<div class="cell${it ? rar(it) : ''}${hit ? ' hit' : ''}" data-eq="${s}" title="${SLOT_NAMES[s]}">${it ? ico(it) : ''}</div>`; }).join('')}</div>`;
  }
  equipGrid() {
    const st = this.w.st;
    // v0.44.39 양손 무기를 들면 보조 칸에 그 무기를 연하게 (보조 장비를 낄 수 없다는 표시)
    const w2 = st.equip.weapon && isTwoHandedBase(BASES[st.equip.weapon.base]) && !isBowBase(BASES[st.equip.weapon.base]) ? st.equip.weapon : null; // 활은 화살통 자리로 비워 둔다
    const cell = (s) => { const it = st.equip[s], sel = this.sel?.from === 'equip' && this.sel.slot === s ? ' sel' : '';
      if (s === 'offhand' && !it && w2) return `<div class="cell twoGhost" data-eq="weapon"><span class="lab">${SLOT_NAMES[s]}</span>${ico(w2)}<span class="twoTag">양손 무기</span></div>`;
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
      if (slot === 'ring') slot = this.ringSlot(st);
      eq[slot] = cur;
      if (slot === 'weapon' && eq.offhand && !handsOk(BASES[cur.base], BASES[eq.offhand.base])) eq.offhand = null;
      if (slot === 'offhand' && eq.weapon && !handsOk(BASES[eq.weapon.base], BASES[cur.base])) eq.weapon = null;
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
      const sel = (this.sellPick ? this.sellPick.includes(it.uid) : this.sel?.from === 'inv' && this.sel.uid === it.uid) ? ' sel' : '';
      h += `<div class="cell${sel}${rar(it)}" data-uid="${it.uid}">${ico(it)}${cellTag(it)}${lk(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : ''}</div>`;
    }
    return h + '</div>';
  }

  // 창고: 계정 공용 (같은 계정의 캐릭터끼리 나눈다). 누르면 바로 옮긴다
  // 창고 | 고른 아이템 정보 + 넣기/빼기 | 가방. 누를 때마다 고르기 · 풀기 (여러 개), 가운데 버튼으로 한꺼번에 옮긴다
  vault() {
    const st = this.w.st, V = vault(), n = vaultSize(st);
    let sel = this.vsel; // { from: 'v' | 'b', keys: [창고 칸 번호 | 가방 uid] }
    if (sel) { sel.keys = sel.keys.filter((k) => (sel.from === 'v' ? !!V.items[k] : st.inv.some((x) => x.uid === k))); if (!sel.keys.length) sel = this.vsel = null; }
    const on = (f, k) => (sel && sel.from === f && sel.keys.includes(k) ? ' sel' : '');
    let left = `<h3>창고 <span class="cnt">${V.items.length}/${n}</span><button class="btn" data-vsort="1" style="margin-left:auto">정렬</button>${V.items.some((x) => x?.shard) ? '<button class="btn" data-shardclean="1">파편 정리</button>' : ''}<button class="btn" data-vall="v">모두 고르기</button></h3>${vcatRow('v', V.items)}<div class="grid">`;
    for (let i = 0; i < n; i++) { const it = V.items[i]; left += it ? `<div class="cell${rar(it)}${on('v', i)}" data-vsel="v|${i}">${ico(it)}${cellTag(it)}${lk(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : ''}</div>` : '<div class="cell"></div>'; }
    left += '</div>';
    let right = `<h3>가방 <span class="cnt">${st.inv.length}/${bagSize(st)}</span><button class="btn" data-vall="b" style="margin-left:auto">모두 고르기</button></h3>${vcatRow('b', st.inv)}<div class="grid">`;
    for (let i = 0; i < bagSize(st); i++) { const it = st.inv[i]; right += it ? `<div class="cell${rar(it)}${on('b', it.uid)}" data-vsel="b|${it.uid}">${ico(it)}${cellTag(it)}${lk(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : ''}</div>` : '<div class="cell"></div>'; }
    right += '</div>';
    let mid = '<div class="note">고른 아이템이 없습니다</div>';
    if (sel) {
      const items = sel.from === 'v' ? sel.keys.map((k) => V.items[k]) : sel.keys.map((k) => st.inv.find((x) => x.uid === k));
      const btn = `<div class="btns"><button class="plate gold" data-vmove="1">${sel.from === 'v' ? `가방으로${items.length > 1 ? ` · ${items.length}개` : ''}` : `창고에 넣기${items.length > 1 ? ` · ${items.length}개` : ''}`}</button><button class="btn" data-vclear="1">고르기 풀기</button></div>`;
      mid = items.length === 1 ? `<div class="detail">${this.describe(items[0], 'vault')}</div>${btn}` : `<h3>${items.length}개 고름</h3>${btn}<div class="vlist">${items.map((it) => `<div class="row"><div class="cell shopIco${rar(it)}">${ico(it)}</div><div class="grow" style="color:${itemColor(it)}">${esc(itemName(it))}${it.qty > 1 ? ` ×${it.qty}` : ''}</div></div>`).join('')}</div>`;
    }
    // v0.45 창고: 왼쪽 가방 | 오른쪽 창고. 고르면 반대쪽 칸 위에 정보 · 옮기기 팝업
    const pop = sel ? `<div class="itemPop"><button class="btn popX" data-popclose="1">닫기</button>${mid}</div>` : '';
    return `<div class="cols"><div class="frame popHost" style="flex:1;overflow:auto">${right}${sel?.from === 'v' ? pop : ''}</div><div class="frame popHost" style="flex:1;overflow:auto">${left}${sel?.from === 'b' ? pop : ''}</div></div>`;
  }

  bagHead() {
    const st = this.w.st;
    const shards = st.inv.filter((x) => x.shard);
    const pk = this.kind === 'shop' && this.sellPick, pkG = pk ? st.inv.filter((x) => pk.includes(x.uid)).reduce((a, x) => a + itemValue(x), 0) : 0;
    const shopBtns = this.kind === 'shop' ? (pk ? `<button class="btn gold" data-sellpick="go" ${pk.length ? '' : 'disabled'}>${pk.length}개 판매 ${pkG.toLocaleString()}G</button><button class="btn" data-sellpick="off">취소</button>` : '<button class="btn" data-sellpick="on">여러 개</button>') : '';
    return `<h3>${this.kind === 'shop' ? this.srcBtns('shopsrc', false) : '가방'} <span class="cnt">${st.inv.length}/${bagSize(st)}</span>${this.kind === 'shop' ? '<span style="margin-left:auto"></span>' : '<button class="btn" data-bagsort="1" style="margin-left:auto">정렬</button>'}${shopBtns}${this.w.canShop ? '<button class="btn" data-selljunk="1">일반·마법</button>' : ''}${this.kind === 'shop' ? '' : `<span class="goldTxt">${st.gold.toLocaleString()} G · ◆${townOf(st).ore.toLocaleString()}</span>`}</h3>` + (shards.length ? `<div class="note shardRow">능력치 파편 ${shards.reduce((a, x) => a + shardVals(x).length, 0)}개 · ${shards.length}종 <button class="btn" data-shardclean="1">파편 정리</button></div>` : ''); // v0.49.11
  }

  // 고른 가방 아이템과 같은 칸에 끼고 있는 장비
  worn(cur) {
    const st = this.w.st;
    if (this.sel?.from !== 'inv' || !cur || !BASES[cur.base]?.slot) return '';
    const slot = BASES[cur.base].slot === 'ring' ? this.ringSlot(st) : BASES[cur.base].slot;
    return st.equip[slot] ? `<div class="detail worn"><h3>착용 중${slot.startsWith('ring') ? ` · 반지 ${slot.slice(-1)}` : ''}</h3>${this.describe(st.equip[slot], 'none')}</div>` : '';
  }

  inv() {
    const cur = this.cur();
    // v0.45 가방: 두 쪽 — 왼쪽 고른 아이템 정보 · 비교, 오른쪽 가방 칸 | 장비 탭은 오른쪽이 착용 칸
    // v0.45 왼쪽 장비 | 오른쪽 가방. 고른 아이템은 반대쪽 칸 위에 팝업으로 (정보 · 비교 · 버튼)
    const pop = cur ? `<div class="itemPop"><button class="btn popX" data-popclose="1">닫기</button><div class="detail">${this.describe(cur, this.sel?.from)}</div>${this.statDiff(cur)}${this.worn(cur)}</div>` : '';
    const fromEq = this.sel?.from === 'equip';
    return `<div class="cols"><div class="frame popHost" style="flex:0 0 42%;overflow:auto"><h3>장비</h3>${this.equipGrid()}${cur && !fromEq ? pop.replace('class="itemPop"', 'class="itemPop eqMid"').replace('data-popclose="1">닫기</button>', `data-popclose="1">닫기</button>${this.eqStrip(cur)}`) : ''}</div><div class="frame popHost" style="flex:1;overflow:auto">${this.bagHead()}${this.bagGrid()}${cur && fromEq ? pop : ''}</div></div>`;
  }

  skills() {
    // v0.50 스킬 창: 위 = 지금 세트의 퀵슬롯(늘 보인다) · 왼쪽 = 고른 스킬 · 오른쪽 = 배운 스킬(차수별)
    //   퀵슬롯은 [넣기]를 누른 뒤 칸을 눌러야 바뀐다 (그냥 칸을 누르면 그 칸의 스킬을 고른다)
    const st = this.w.st;
    const all = Object.keys(st.skills).filter((id) => SKILLS[id]), line = this.skillLine || 'all';
    const lineOf = (sk) => { const ks = sk.lines || Object.keys(sk.req || {}); return ks.length >= 2 ? 'mix' : ks[0] || 'str'; };
    const cOf = (sk) => sk.chasu || Math.max(1, Math.min(5, (sk.tier || 1) - 1));
    const RO = { hunt: 0, boss: 1, util: 2 };
    const ids = (line === 'all' ? all : all.filter((id) => lineOf(SKILLS[id]) === line))
      .sort((x, y) => { const a = SKILLS[x], b = SKILLS[y]; return cOf(a) - cOf(b) || (RO[a.role] ?? 3) - (RO[b.role] ?? 3) || (b.q || 2) - (a.q || 2) || a.name.localeCompare(b.name); });
    const stats = totalStats(st);
    if (this.skillSel && !st.skills[this.skillSel]) this.skillSel = null;
    if (!this.skillSel && ids.length) this.skillSel = ids[0];
    if (this.skAssign && this.skAssign !== this.skillSel) this.skAssign = null;
    const sets = st.quickSets || [st.quick], cur = st.quickSet || 0;
    const where = (id) => sets.map((q, k) => q.map((x, i) => x === id ? `<span class="qchip${k === cur ? ' on' : ''}">${k === cur ? i + 1 : `${k + 1}-${i + 1}`}</span>` : '').join('')).join('');
    const roleTag = (sk) => (sk.role ? `<span class="skRole r_${sk.role}">${ROLE_NAMES[sk.role]}</span>` : '') + (sk.needs ? `<span class="skRole wNeed${this.w.weaponWhy?.(sk) ? ' bad' : ''}">${sk.needs === 'bow' ? '활' : '근접'}</span>` : ''); // v0.50 쓰는 무기
    // 위: 퀵슬롯 줄
    let bar = `<div class="skBar"><div class="btns">${sets.map((_, k) => `<button class="btn${cur === k ? ' on' : ''}" data-qsetw="${k}">세트 ${k + 1}</button>`).join('')}</div><div class="skSlots${this.skAssign ? ' assign' : ''}">`;
    for (let i = 0; i < CONFIG.quickSlots; i++) {
      const q = st.quick[i];
      bar += `<button class="btn skSlot${q && q === this.skillSel ? ' on' : ''}" data-qs="${i}"><small>${i + 1}</small>${q && SKILLS[q] ? `<img src="${skillIcon(q)}" alt="" />` : ''}</button>`;
    }
    bar += '</div></div>';
    let list = '', lastC = 0;
    if (!ids.length) list = '<div class="note">배운 스킬이 없습니다</div>';
    for (const id of ids) {
      const sk = SKILLS[id], s = st.skills[id], c = cOf(sk);
      if (c !== lastC) { list += `<div class="skTier">${c}차</div>`; lastC = c; }
      list += `<div class="row pick skRow${this.skillSel === id ? ' on' : ''}" data-skill="${id}">${sicon(id)}
        <div class="grow"><b>${sk.name}</b> <span style="font-size:.78em">${roleTag(sk)}<span style="color:${QUALITY[sk.q || 2].color}">${QUALITY[sk.q || 2].name}</span></span>
          <div class="mini"><i style="width:${(s.exp / skillExpNeeded(s.rank)) * 100}%;background:${sk.color}"></i></div></div>
        <div class="skSide"><span class="note">랭크 ${s.rank}</span>${where(id)}</div></div>`;
    }
    let det = '<div class="note">고른 스킬이 없습니다</div>';
    if (this.skillSel) {
      const id = this.skillSel, sk = SKILLS[id], s = st.skills[id];
      const mods = modsOf(s), v = skillValues(id, s.rank, mods), nx = skillValues(id, s.rank + 1, mods), e = skillEff(id, mods, s.rank);
      const need = skillExpNeeded(s.rank), d = this.w.d || {};
      const isW = sk.ap === 'weapon', isBuff = sk.type === 'buff';
      const pw = (x) => isW ? `무기 피해 ×${x.toFixed(2)}` : `평타 ×${x.toFixed(2)} · 약 ${Math.round(x * (d.spellBase || 0)).toLocaleString()}`;
      const kv = [];
      if (!isBuff) kv.push(['위력', pw(v.power)], ['다음 랭크', pw(nx.power)]);
      else kv.push(['효과', `${Math.round(v.power)}${/Pct$/.test(sk.buff || '') ? '%' : ''}`], ['다음 랭크', `${Math.round(nx.power)}${/Pct$/.test(sk.buff || '') ? '%' : ''}`]);
      { const mc = mpCost(st, id, v); kv.push(['MP', this.w.manaGrip?.(sk) ? `${Math.ceil(mc * 1.5).toLocaleString()} (대홀)` : mc.toLocaleString()], ['재사용', `${v.cd.toFixed(1)}초`]); } // v0.49.81 실제로 닳는 마나
      if (sk.grip) { const g = this.w.gripWhy?.(sk); kv.push(['무기', `<b class="gripTag">${GRIP_NAMES[sk.grip]}</b>${g ? ` <span style="color:#ff8a7a">${g}</span>` : ''}`]); }
      if (sk.needs) { const bad = this.w.weaponWhy?.(sk); kv.push(['무기', `<b style="color:${bad ? '#ff8a7a' : ''}" title="${NEED_NAMES[sk.needs]}">${sk.needs === 'bow' ? '활' : '근접 무기'}</b>`]); } // v0.50 근접 · 활 스킬
      if (e.range) kv.push(['사거리', e.range.toFixed(1)]);
      if (e.radius) kv.push(['범위', e.radius.toFixed(1)]);
      if (e.width) kv.push(['너비', e.width.toFixed(1)]);
      if (e.count) kv.push(['수', e.count]);
      if (e.jumps) kv.push(['연쇄', e.jumps]);
      if (e.waves) kv.push(['파동', e.waves]);
      if (e.hits) kv.push(['타수', e.hits]);
      if (e.duration) kv.push(['지속', `${e.duration}초`]);
      if (e.slow) kv.push(['느리게', `${e.slow}초`]);
      if (e.root) kv.push(['속박', `${(+e.root).toFixed(1)}초`]);
      if (e.echo) kv.push(['메아리', `${Math.round(e.echo * 100)}%`]);
      kv.push(['숙련', `${Math.floor(s.exp).toLocaleString()} / ${need.toLocaleString()}`]);
      const U30 = { boss: '출혈', util: '속박 강화', hunt: '느리게 · 속박' }[sk.role] || '추가 효과';
      const unl = sk.chasu ? `<div class="skUnl">${[[30, U30], [80, '범위 · 수 증가'], [150, '메아리 · 마무리']].map(([r, t]) => `<span class="${s.rank >= r ? 'on' : ''}">${r} ${t}</span>`).join('')}</div>` : '';
      const V = variantsOf(id), inSet = st.quick.indexOf(id);
      const vars = VARIANT_RANKS.map((r) => `<div class="btns skVar"><span class="note">${r}</span>${V[r].map((x) => {
        const on = s.mod?.[r] === x.key, can = s.rank >= r && !s.mod?.[r];
        return `<button class="btn${on ? ' on' : ''}" data-var="${r}|${x.key}" ${can ? '' : 'disabled'} title="${x.text}">${x.name.split(': ')[1]}</button>`; }).join('')}</div>`).join('');
      det = `<div class="row" style="border:0">${sicon(id)}<div class="grow"><div class="nm" style="color:${QUALITY[sk.q || 2].color}">${sk.name}</div>
          <div class="sub">${cOf(sk)}차 ${roleTag(sk)}${QUALITY[sk.q || 2].name} · 랭크 ${s.rank}</div></div>
          <div class="btns">${this.skAssign ? '<button class="btn on" data-skassign>취소</button>' : `<button class="btn gold" data-skassign>넣기</button>`}${inSet >= 0 ? '<button class="btn" data-qs="-1">빼기</button>' : ''}</div></div>
        <div>${sk.desc.replace(/\s*\([^)]*\)/g, '')}</div>${skillTraits(sk).map((x) => `<div class="aff" style="color:#9fd0ff">${x}</div>`).join('')}${mixFxOf(sk.lines || Object.keys(sk.req || {})).map((f) => `<div class="aff" style="color:#e0b0ff">혼합 효과 · ${f.name}: ${f.text}</div>`).join('')}
        <div class="kv" style="margin-top:6px">${kv.map(([k, x]) => `<span>${k}</span><b>${x}</b>`).join('')}</div>${unl}
        ${reqLine(sk.req, stats)}${meetsReq(st, sk.req, stats) ? '' : '<div class="bad">조건 부족</div>'}
        <h3 style="margin-top:8px">변형</h3>${vars}`;
    }
    const LN = { all: '전체', ...STAT_NAMES, mix: '혼합' };
    const tabs = ['all', ...STATS, 'mix'].filter((k) => k === 'all' || all.some((id) => lineOf(SKILLS[id]) === k)).map((k) => `<button class="btn${line === k ? ' on' : ''}" data-skline="${k}">${LN[k]}</button>`).join('');
    return `<div class="skWin">${bar}<div class="cols"><div class="frame detail" style="flex:0 0 46%">${det}</div>
      <div class="frame" style="flex:1"><h3>배운 스킬 <span class="cnt">${all.length}</span></h3><div class="btns" style="flex-wrap:wrap;margin:0 0 6px">${tabs}</div>${list}</div></div></div>`;
  }

  // v0.50 왕좌 원정: 왼쪽 = 이번 주 구성 · 고른 등급 도전 | 오른쪽 = 등급 고르기(내 기록) · 순위
  raid() {
    const st = this.w.st, W = raidWeek(), rd = raidOf(st), g = this.raidG ?? 0, G = RAID_GRADES[g];
    if (!raidOpen(st)) return `<div class="frame" style="flex:1"><div class="note">평온 종말의 왕좌 보스를 쓰러뜨리면 열립니다</div></div>`;
    const bossName = (id) => ZONES.find((z) => z.id === id)?.boss?.name || id;
    const emb = resCount(st, 'raid_emblem');
    const L = `<div class="nm">이번 주 원정</div>
      <div class="raidLine">${W.bosses.map((id, i) => `<span class="rw">${i + 1} · ${bossName(id)}</span>`).join('')}<span class="rw lord">${W.lord.name}</span></div>
      <div class="note" style="color:#ffb090">${W.lord.text}</div>
      <h3 style="margin-top:8px">규칙</h3><div class="kv">${W.muts.map((id) => `<span>${MUTS_[id].name}</span><b>${MUTS_[id].text}</b>`).join('')}<span>${RAID_RULES[W.rule].name}</span><b>${RAID_RULES[W.rule].text}</b></div>
      <h3 style="margin-top:8px">등급 ${G.name}</h3><div class="kv"><span>보스 체력 · 공격</span><b>×${G.hp}</b><span>제한 시간</span><b>${RAID.limit / 60}분 · 부활 없음</b><span>보상</span><b>원정 문장 ${G.emb} · 군주 상자</b><span>이번 주 보상</span><b>${Math.max(0, RAID.claims - rd.claims)} / ${RAID.claims}</b><span>원정 문장</span><b>${emb}</b></div>
      <div class="btns" style="margin-top:8px"><button class="plate gold" data-raidgo="${g}">도전</button></div>`;
    const rows = RAID_GRADES.map((x, i) => `<div class="row pick${i === g ? ' on' : ''}" data-raidg="${i}"><div class="grow"><b>등급 ${x.name}</b> <span class="note">×${x.hp}</span></div><span class="note">${rd.best[i] ? fmtTime(rd.best[i]) : '-'}</span></div>`).join('');
    const rk = this.raidRank?.[`${W.wk}|${g}`];
    const rank = rk ? (rk.length ? rk.slice(0, 10).map((r, i) => `<div class="row"><b style="width:2em">${i + 1}</b><div class="grow">${esc(r.name)}</div><span class="note">${fmtTime(r.t)}</span></div>`).join('') : '<div class="note">기록 없음</div>') : '<div class="note">불러오는 중</div>';
    if (!rk && this.w.cloud !== false) this.loadRaidRank?.(W.wk, g);
    return `<div class="cols"><div class="frame detail" style="flex:1.1">${L}</div><div class="frame" style="flex:1"><h3>등급</h3>${rows}<h3 style="margin-top:8px">이번 주 순위 · 등급 ${G.name}</h3>${rank}</div></div>`;
  }

  char() {
    this.w.d = derive(this.w.st, this.w.buffValues());
    const st = this.w.st, d = this.w.d;
    const stats = d.stats;
    const apSum = STATS.reduce((a, s) => a + st.ap[s], 0) || 1;
    const statMax = Math.max(1, ...STATS.map((s) => stats[s])); // 막대 = 능력치 (가장 높은 능력치 = 꽉 참), 오각형과 같은 기준 (v0.41.5)
    let rows = '';
    for (const s of STATS) {
      const bonus = stats[s] - st.stats[s];
      const share = st.ap[s] / apSum;
      rows += `<div class="statRow"><span style="color:${STAT_COLORS[s]}">${STAT_NAMES[s]}</span><b>${stats[s]}${bonus > 0 ? `<small style="color:#8fb4ff;font-size:.7em"> +${bonus}</small>` : ''}</b>
        <div><div class="mini" style="height:8px"><i style="width:${(stats[s] / statMax) * 100}%;background:${STAT_COLORS[s]}"></i></div><div class="note">${STAT_DESC[s]} · 성향 ${Math.round(share * 100)}%</div></div></div>`;
    }
    const need = expNeeded(st.awakenings);
    const pct = (v) => `${Math.round(v * 100)}%`;
    const kv = [
      ['평타 피해', `${Math.round(d.dmg[0])}~${Math.round(d.dmg[1])}`], ['물리 공격력', `${Math.round(d.patk[0])}~${Math.round(d.patk[1])}`], ['마법 공격력', `${Math.round(d.matk[0])}~${Math.round(d.matk[1])}`], ['공격 속도', `${d.atkRate.toFixed(2)}/초`],
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
        <div class="kv"><span>검 공격 · 물리 공격력</span><b style="color:${STAT_COLORS.str}">힘</b><span>활 공격 · 치명타 · 공격 속도</span><b style="color:${STAT_COLORS.dex}">민첩</b>
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
    const dl = dailyOf(st), wl = weeklyOf(st);
    const atGuard = this.townMode === 'build', claimable = [...dl.list, ...wl.list].some((x) => x.done && !x.got);
    const qline = (x) => { const r = dailyReward(x, st); return `<div class="row qrow${x.done ? ' fin' : ''}"><div class="grow">${dailyText(x)}<div class="note">${r.gold.toLocaleString()}G${r.ore ? ` · 강화석 ${r.ore}` : ''}${r.key ? ` · 던전 열쇠${r.key > 1 ? ' ' + r.key : ''}` : ''}${r.ess ? ` · ${BASES[r.ess.id].name} ${r.ess.n}` : ''}</div></div><span class="note">${x.got ? '받음' : x.done ? '완료' : `${x.have} / ${x.need}`}</span></div>`; };
    let list = `<h3>오늘의 의뢰${claimable ? `<button class="btn gold" data-daily="1" style="margin-left:auto" ${atGuard ? '' : 'disabled'}>${atGuard ? '보상 받기' : '경비대장에게 보고'}</button>` : ''}</h3>` + dl.list.map(qline).join('') + '<h3>이번 주 의뢰</h3>' + wl.list.map(qline).join('');
    for (const z of ZONES) {
      list += `<h3>${z.name}</h3>`;
      for (const x of QUESTS.filter((y) => y.zone === z.id)) {
        const fin = st.questsDone.includes(x.id), cur = q && q.id === x.id;
        list += `<div class="row qrow${fin ? ' fin' : ''}${cur ? ' on' : ''}"><div class="grow">${fin || cur ? x.name : '???'}</div><span class="note">${fin ? '완료' : cur ? '진행 중' : ''}</span></div>`;
      }
    }
    // v0.50 군세 토벌: 모여 있으면 맨 위 (하겐 앞에서 토벌지로) · 정복지
    { const H = st.horde, zn = H?.zone && ZONES.find((z) => z.id === H.zone), pen = zn ? hordePen(st) : 0, now = Date.now();
      const cq = Object.entries(H?.conq || {}).filter(([, t]) => t > now).map(([z, t]) => `<span class="rw">${ZONES.find((x) => x.id === z)?.name || z} <b>${Math.ceil((t - now) / 86400e3)}일</b></span>`).join('');
      let hb = '';
      if (zn) { const h = Math.floor((now - H.at) / 3600e3);
        hb = `<div class="hordeCard${pen ? ' pen' : ''}"><div class="grow"><div class="nm">군세 토벌 · ${zn.name}</div><div class="note">모인 지 ${h}시간${pen ? ` · 모든 사냥터 드랍률 · 경험치 −${Math.round(pen * 100)}% · 토벌 보상 +${Math.round(pen * 100)}%` : h < 24 ? ` · ${24 - h}시간 뒤 벌칙` : ''}</div></div>
          <button class="btn gold" data-horde="1" ${this.townMode === 'build' ? '' : 'disabled'}>${this.townMode === 'build' ? '토벌지로' : '경비대장 하겐'}</button></div>`; }
      else if (H?.next && (H.cleared || cq)) { const hh = Math.max(0, Math.ceil((H.next - now) / 3600e3)); hb = `<div class="note">다음 군세 ${hh}시간 안팎</div>`; }
      if (cq) hb += `<div class="rws" style="margin-top:4px"><span class="note">정복지</span>${cq}</div>`;
      if (hb) det = hb + det; }
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
      ['화면 보기', 'hud', ['체력 · 마나', '내 캐릭터: 칭호 · 이름 · 체력. 체력이 낮으면 깜빡입니다', '퀘스트: 진행 중인 퀘스트와 오늘의 의뢰. 누르면 퀘스트 창, 화살표로 접습니다', '기록: 지역 정보 · 얻은 것 · 완료 알림. 누르면 기록 창', '미니맵', '메뉴: 가방 · 스킬 · 능력 · 퀘스트 · 랭킹 · 설정', '스킬 칸 8개. 휴대폰에서는 원형 · 사각 배치를 설정에서 고릅니다', '공격 버튼', '조이스틱: 만질 때만 보입니다']],
      ['버튼', 'buttons', ['귀환: 마을로 돌아갑니다', '자동 사냥: 켠 지역 안에서만, 가장 가까운 몬스터를 찾아가며 장애물을 돌아갑니다. 얻는 것이 조금 줄어듭니다. 무엇을 주울지는 설정에서 고릅니다', '마나 물약', '체력 물약', '공격. 사람 · 건물 · 포탈 · 창고 앞에서는 그 이름으로 바뀝니다', '스킬. 스킬 창에서 칸을 정합니다']],
      ['미니맵 표시', 'minimap', ['빨간 점: 몬스터 · 주황 점: 정예 · 네임드 · 금색 마름모: 보스 · 하늘색 고리: 포탈 · 초록 세모: 던전 입구 · 노란 테: 마을']],
      ['NPC와 대화', 'talk', ['경비대장 하겐: 퀘스트 보고 · 오늘의 의뢰 보상 · 건물 짓기', '가까이 가면 공격 버튼이 이름으로 바뀝니다. 누르면 대화. 상인 오르텐은 상점, 보석상 리엔은 보석 끼우기 · 합치기, 현자 에라는 도감 · 파편 갈기 · 합치기 · 뽑기']],
      ['건물 쓰기', 'building', ['지은 건물', '건물 앞에서 버튼이 건물 이름으로 바뀝니다. 누르면 그 건물 창이 열립니다. 창 위 탭으로 기능을 고릅니다']],
      ['포탈', 'portal', ['마을 · 발견한 야영지의 포탈', '포탈 위에서 버튼을 눌러 갈 곳을 고릅니다. 포탈 둘레에는 몬스터가 생기지 않습니다']],
      ['공용 창고', 'vaultspot', ['상인 옆 공용 창고 상자', '상자 앞에서 버튼을 누르면 창고가 열립니다']],
      ['창고', 'vault', ['가방', '창고: 같은 계정의 캐릭터끼리 함께 씁니다. 100칸, 연구 「큰 창고」로 늘어납니다'], ['아이템을 누를 때마다 고르거나 풉니다. 여러 개를 골라 가운데 버튼으로 한꺼번에 옮깁니다', '쌓이는 물건 · 같은 스킬북 · 같은 옵션 파편은 한 칸에 모입니다']],
      ['가방 · 장비', 'inv', ['고른 아이템: 정보 · 능력치 변화 · 쓰기 · 팔기. 고르지 않으면 착용 장비가 보입니다', '가방: 강화석 · 지역 재료도 아이템으로 들어옵니다. 창고에 넣어도 강화 · 건물에 쓰입니다', '정렬 · 한꺼번에 팔기', '금화 · 강화석', '창 탭'], ['같은 스킬북은 한 칸에 겹칩니다. [하나 흡수]는 한 권, [모두 사용]은 겹친 책을 모두 써서 숙련도를 한 번에 올립니다. 모르는 스킬이면 한 권으로 배우고 나머지를 흡수합니다', '같은 옵션의 능력치 파편도 한 칸에 모입니다. 제련할 때 그중 쓸 값을 고릅니다']],
      ['스킬', 'skills', ['배운 스킬. 쓸수록 랭크가 오릅니다. 랭크 제한은 없고 50부터 느려집니다', '위력 · 다음 랭크 · MP · 재사용 · 범위', '변형: 랭크 25 · 50에서 하나씩 고릅니다', '퀵슬롯 8칸: 칸을 누르면 넣습니다. 이미 있는 스킬은 자리가 바뀝니다'], ['상급 이상 스킬은 무기에 따라 나뉩니다. 한손 무기(+ 방패 · 보주 · 마도서)는 단일 · 돌진 · 창 같은 스킬, 양손 무기(대검 · 지팡이 · 대홀 · 대방패)는 휘두르기 · 광역 스킬을 씁니다. 하급 · 중급 · 버프 스킬은 어떤 무기로든 씁니다', '지금 무기로 못 쓰는 스킬은 퀵슬롯에서 어둡게 보입니다. 대홀을 들면 양손 정신 주문이 마나를 1.5배 쓰는 대신 위력과 범위가 커집니다']],
      ['능력 · 각성', 'char', ['능력치: 행동에 따라 오릅니다. 칼을 휘두르면 힘, 주문을 쓰면 지능, 맞으면 체력', '세부 능력치. 각성마다 성향에 맞는 칭호와 특성을 고릅니다. 단계가 오를수록 치명 · 질주 · 파동 · 연쇄 · 표식 · 보호막 같은 새 특성이 열립니다']],
      ['수련 비전', 'arts', ['장착한 비전: 1차 각성 1칸 · 3차 2칸 · 5차 3칸', '갈래별 비전'], ['직접 사냥하며 정해진 행동(근접 치명타 · 원거리 치명타 · 여럿 맞히기 등)을 정한 횟수만큼 하면 열립니다. 자동 사냥은 세지 않습니다', '두 스탯이 섞인 비전은 그 두 스탯이 든 칭호를 받은 적이 있어야 장착합니다']],
      ['퀘스트 · 의뢰 · 업적', 'quest', ['메인 퀘스트와 업적', '오늘의 의뢰 보상 받기: 경비대장 하겐 앞에서만', '오늘의 의뢰 3개 · 이번 주 의뢰'], ['업적을 이루면 금화와 업적 칭호를 받습니다']],
      ['도감', 'dex', ['지역별 몬스터 도감', '몬스터 정보'], ['몬스터를 잡을수록 정보가 열리고, 잡은 수에 따라 피해 같은 보너스를 받습니다']],
      ['랭킹', 'rank', ['레벨 · 전투력 순위', '내 기록 · 전투력(공격 × 방어)'], ['로그인해서 서버에 저장하는 캐릭터만 순위에 오릅니다']],
      ['기록', 'log', ['완료 알림 · 얻은 것 · 지역 이동 같은 기록. 화면 왼쪽 기록 줄을 눌러도 열립니다']],
      ['채팅', null, [], ['화면 왼쪽 아래 채팅창에 다른 모험가의 말이 올라옵니다. 로그인하고 닉네임을 정하면 [채팅]을 눌러(PC는 Enter) 말할 수 있습니다', '옆 단추로 채팅창을 접습니다. 접힌 동안 온 말은 수로 보입니다. 설정의 UI 위치 편집으로 자리를 옮길 수 있습니다', '한 번에 60자까지. 10초에 세 마디까지 보낼 수 있고, 같은 말을 이어서 보낼 수 없습니다. 도배를 계속하면 잠시 말할 수 없게 되고, 욕설은 가려집니다']],
      ['건물 짓기', 'build', ['집터와 건물', '단계 올리기', '단계별 금화 · 재료 · 각성 · 걸리는 시간']],
      ['대장간', 'smithy', ['기능 탭: 강화 · 제련 · 분해 · 용병', '강화: 실패해도 단계는 그대로, 실패할수록 장인의 기운이 쌓입니다. 높은 레벨 장비일수록 성공률이 낮고 강화석이 많이 듭니다'], ['제련: 장비와 능력치 파편을 골라 옵션 하나를 파편 옵션으로 바꿉니다. 대장간 3 · 4 · 5단계에 옵션을 1 · 2 · 3개 잠급니다', '분해: 등급을 골라 보고 [등급별 분해]로 한꺼번에 분해합니다. 얻은 것은 결과 창에 나옵니다']],
      ['보석상', 'gems', ['끼우기 · 합치기 탭', '고른 장비의 구멍과 끼운 보석. 빼려면 금화가 듭니다', '착용 장비 · 가방'], ['합치기: 같은 보석 3개로 한 등급 위 보석. 등급별로 한꺼번에 합칠 수도 있습니다']],
      ['광산 · 약초밭', 'harvest', ['생산량과 쌓인 양', '자라는 약초 (광산은 가진 강화석)'], ['생산품은 저절로 가방에 들어오지 않습니다. 건물에 들어가 [거두기]로 받습니다', '쌓인 양이 가득 차면 생산이 멈춥니다. 가득 찼다는 기록이 뜨면 거둬 주세요']],
      ['제작소', 'workshop', ['기능 탭: 제작 · 교환 · 용병', '만드는 중', '다 만든 것은 [가방으로] · [창고로]로 직접 받습니다', '만들기: 시간이 걸립니다. 다섯 개까지 줄을 세웁니다'], ['제작 탭에서 상급 강화석 · 미지의 지도(미지의 땅 조각 5개)도 만듭니다', '교환 탭: 남는 약초 3개를 다른 약초 1개로, 정수를 다른 등급으로 바꿉니다']],
      ['파견소 · 용병', 'guild', ['보낼 지역', '기간. 건물에서 일하는 용병은 보낼 수 없습니다']],
      ['여관 · 숙소', 'inn', ['찾아온 용병 고용. 매 시간 바뀝니다'], ['숙소 단계가 오를수록 둘 수 있는 용병이 늘어납니다. 지친 용병은 여관에서 쉬며 체력을 채웁니다', '용병 장비: 용병 목록의 [장비]로 가방 · 창고의 장비를 입힙니다']],
      ['연구소', 'lab', ['연구 진행', '연구 시작'], ['「지도」 탭에서 알 수 없는 지도 조각을 분석하고 소문 지도를 강화합니다']],
      ['유물 제단', 'altar', ['올린 유물: 제단 단계에 따라 1 ~ 5칸', '가진 유물'], ['유물은 미지의 땅에서 얻습니다. 올리면 일정 기간 경험치 · 피해 · 생산 같은 효과를 줍니다. 등급이 높을수록 세고 오래갑니다']],
      ['상점', 'shop', ['파는 물건', '가방: 팔 수 있습니다']],
      ['지도', 'map', ['갈 곳', '지도. 가 본 곳만 밝혀집니다']],
      ['던전', 'dungeon', ['던전 지도', '단계'], ['그 지역 보스를 잡아야 던전이 열립니다(미니맵 입구가 초록으로 바뀜). 던전 입구 앞에서 버튼이 「던전」으로 바뀝니다. 오늘의 의뢰 · 보스가 가끔 주는 열쇠로 들어갑니다', '가장 깊은 곳의 우두머리를 잡으면 다음 단계가 열립니다. 단계마다 몬스터 레벨이 2씩 올라, 10단계는 다음 지역보다 높습니다', '강화 열쇠 · 극한 열쇠로 더 어려운 던전에 들어갑니다', '돌파하면 공격 버튼이 나가기로 바뀝니다. 전리품을 줍고 눌러 나갑니다']],
      ['숨은 던전', 'dungeon', ['지도 분석', '소문 · 강화'], ['사냥 · 파견에서 나오는 알 수 없는 지도 조각을 연구소 「지도」 탭에서 분석하면 미지의 땅 조각이나 소문이 나옵니다. 소문은 보스를 잡은 가장 높은 지역에서 두 단계 아래까지의 지역에 생깁니다', '소문 지역을 돌아다니면 숨은 던전 입구가 나타납니다. 지역보다 강하고, 깨면 보물 상자 셋 중 하나를 골라 장비를 받습니다. 연구소에서 지도를 강화하면 더 세지고 보상이 좋아지며, +2부터 신화 장비가 나옵니다']],
      ['미지의 땅', null, [], ['미지의 땅 조각 5개를 제작소에서 미지의 지도로 만듭니다. 던전 밖에서 지도를 펼치면 보스를 잡은 지역 중 한 곳의 미지의 땅으로 들어갑니다', '깨면 유물과 금화를 받습니다. 「열린 미지의 길」로 24시간 안에 같은 곳에 다시 들어갈 수 있습니다']],
      ['범람지', null, [], ['보스를 잡은 지역이 3곳 이상이면, 매일 저녁 7시에 오래 사냥하지 않은 지역 하나에 몬스터가 넘칩니다 (최대 5곳)', '범람지는 포탈로 갈 수 없어 걸어가야 합니다. 들어가면 결계에 갇히고, 범람 몬스터와 범람 보스를 모두 잡으면 정화됩니다', '범람 몬스터는 경험치 · 전리품이 없고, 정화하면 금화 · 장비 · 상급 강화석 · 알 수 없는 지도 조각을 받습니다. 지역마다 그 주 첫 정화는 정수도 줍니다', '범람지가 많을수록 마을 생산이 줄고 파견이 위험해집니다']],
      ['던전 변이', 'dungeon', ['변이', '돌파 결과'], ['던전 · 숨은 던전에 들어가면 무너지는 · 얼어붙은 · 불타는 던전 같은 변이가 붙습니다. 들어간 뒤 변이를 보고 [시작]을 눌러야 몬스터가 움직입니다', '변이가 많을수록 장비 레벨 · 전설 확률 · 금화 · 보석이 오릅니다. 극한 던전과 강화한 숨은 던전일수록 변이가 많습니다. 돌파하면 걸린 시간 · 준 피해 · 보상이 결과 창에 나옵니다']],
      ['강화 몬스터', 'boss', ['세계 단계', '능력'], ['세계 단계가 높을수록, 던전이 어려울수록 화염 강화 · 냉기 강화 · 흡혈 · 순간이동 · 속박 · 저주 · 무리 같은 능력이 붙은 몬스터가 자주 나옵니다. 이름 옆 [ ]에 능력이 보입니다', '능력이 많을수록 체력이 많고 경험치 · 전리품을 더 줍니다']],
      ['보스', 'boss', ['색칠된 곳에 곧 공격이 들어옵니다. 가운데부터 차오르면 터집니다'], ['멀리서 맴돌면 뛰어들기 · 저격 같은 원거리 공격을 합니다', '보스마다 고유한 공격이 있습니다']],
      ['설정 · 화면', 'menu', ['화면 확대', '휴대폰 스킬 배치: 원형 · 사각', 'UI 위치 바꾸기']],
      ['설정 · 자동 사냥', 'menu2', ['자동 사냥 줍기: 장비 등급 · 물약 · 보석 · 재료 · 파편, 스킬북은 등급마다 고릅니다', '가방 · 스킬 · 능력 · 퀘스트 바로가기'], ['자동 물약 · 물약 자동 구매 · 자동 판매 등급 · 자동 사냥 중 필드 보스를 잡을지도 여기서 정합니다']],
      ['그 밖에', null, [], ['죽으면 가끔 장비 하나를 그 자리에 떨어뜨립니다. 다시 가서 주울 수 있고, 줍지 못한 채 게임을 다시 켜거나 업데이트되면 창고로 돌아옵니다', '세계 단계: 평온 → 악몽 → 지옥 → 혼돈. 지역은 20곳(위험도 1~120)이고, 다음 단계는 마지막 지역 종말의 왕좌의 보스를 잡고 그 던전을 3단계(악몽 6 · 지옥 9단계)까지 돌파해야 열립니다. 혼돈은 4차 각성 뒤에 열립니다. 오를수록 몬스터가 훨씬 세지고 보스가 패턴을 자주 씁니다', '능력치 파편: 장비를 갈아 낄 때 10% · 보스 장비 대신 12% · 분해할 때 마법 8% · 희귀 15% · 영웅 25% · 전설 35%. 대장간에서 장비 옵션 하나와 바꿉니다', '같은 장비도 품질 85~115%와 옵션 수치가 매번 다릅니다']],
    ];
    const [t, img, nums, more = []] = S[Math.min(k, S.length - 1)];
    const li = nums.map((l, i) => `<li><b class="gnum">${i + 1}</b>${l}</li>`).join('') + more.map((l) => `<li>${l}</li>`).join('');
    // v0.45 두 쪽: 왼쪽 그림 · 설명 | 오른쪽 목차
    return `<div class="cols"><div class="frame" style="flex:1;overflow:auto"><h3>${t}</h3>${img ? `<div class="gshot"><img src="assets/guide/${img}.webp" alt="" /></div>` : ''}<ul class="glist">${li}</ul></div>
      <div class="frame" style="flex:0 0 22%;overflow:auto">${S.map((x, i) => `<button class="btn gsec${i === k ? ' on' : ''}" data-gsec="${i}">${x[0]}</button>`).join('')}</div></div>`;
  }

  // 용병 한 줄: 이름 · 등급 · 레벨 · 각성 · 솜씨 · 체력
  mercLine(m, hi) {
    const g = GRADES[m.grade || 0], sm = staMax(m);
    const sk = SKILLS_ALL.map((k) => `<span style="${k === hi ? 'color:#ffd84a;font-weight:700' : ''}">${SKILL_NAMES[k]} ${(m[k] || 0).toFixed(1)}</span>`).join(' · ');
    return `<div class="grow"><b style="color:${g.color}">${esc(m.name)}</b> <small>${g.name} · Lv ${m.lv}${m.aw ? ` · 각성 ${m.aw}` : ''} · 하루 ${mercWage(m).toLocaleString()}G${m.gear ? ` · 장비 ${m.gear.ilvl}` : ''}${isVet(m) ? ' · <b style="color:#ffd84a">베테랑</b>' : ''}</small>
      ${hi ? '' : `<div class="note">${sk}</div>`}<div class="mini" style="height:5px;max-width:12em"><i style="width:${Math.round((m.sta / sm) * 100)}%;background:#6ad07a"></i></div></div>${hi ? `<div class="mKey"><small>${SKILL_NAMES[hi]}</small><b>${(m[hi] || 0).toFixed(1)}</b></div>` : ''}`; // v0.45.7 건물 용병 탭: 이 건물 능력치만 크게
  }

  // 공지 · 패치 탭: 왼쪽 운영 공지(서버), 오른쪽 패치 노트 (언제든 다시 본다)
  news() {
    if (!this.newsList) { this.newsList = []; cloud.notices().then((l) => { this.newsList = l; if (this.kind === 'news') this.render(); }); }
    const e = (t) => esc(String(t ?? ''));
    const notices = this.newsList.map((n) => `<div class="row" style="display:block"><b style="color:#ffd84a">${e(n.title)}</b> <small class="note">${new Date(n.at).toLocaleDateString()}</small><div class="note" style="white-space:pre-wrap">${e(n.body)}</div></div>`).join('') || '<div class="note">공지가 없습니다</div>';
    const notes = PATCH_NOTES.map((n) => `<div class="row" style="display:block"><b style="color:#ffd84a">${n.ver}</b> <small class="note">${n.date}</small><div>${n.head}</div><div class="note" style="margin-top:4px">${n.items.map((x) => `<div>${x}</div>`).join('')}</div></div>`).join('');
    return `<div class="cols"><div class="frame" style="flex:1"><h3>공지사항</h3>${notices}</div><div class="frame" style="flex:1.3"><h3>패치 노트 <small>${GAME_VERSION}</small></h3>${notes}</div></div>`;
  }

  // 우편함: 운영자가 보낸 금화 받기 (계정마다 한 번, 지금 캐릭터에게)
  async mailbox() {
    const w = this.w, st = w.st;
    if (!cloud.id) { this.alert('우편함', '로그인해야 우편을 받을 수 있습니다'); return; }
    const list = await cloud.mail();
    const rows = list.map((m) => `<div class="row"><div class="grow"><b>${esc(m.title)}</b><div class="note" style="white-space:pre-wrap">${esc(m.body || '')}</div></div><b class="goldTxt">${Number(m.gold).toLocaleString()} G</b><button class="btn gold" data-mclaim="${m.id}">받기</button></div>`).join('') || '<div class="note">우편이 없습니다</div>';
    this.popup('우편함', `<div class="noticeList">${rows}</div>${list.length > 1 ? '<button class="btn gold" data-mclaim="all">모두 받기</button>' : ''}`);
    const box = document.getElementById('winAlert');
    box.querySelectorAll('[data-mclaim]').forEach((b) => { b.onclick = async () => {
      b.disabled = true;
      const r = await cloud.mailClaim(b.dataset.mclaim === 'all' ? null : [Number(b.dataset.mclaim)]);
      if (!r.ok) { w.ui.toast('받지 못했습니다'); audio.play('error'); return; }
      if (r.gold > 0) { st.gold += r.gold; audio.play('coin'); w.ui.toast(`우편 ${r.n}통 · +${r.gold.toLocaleString()}G`, '#ffd84a'); w.ui.dirty(); this.save?.(true); }
      this.mailbox(); this.render();
    }; });
  }

  // 용병 장비 고르기: 가방 | 창고에서 장비를 골라 입힌다 (입던 것은 가방으로)
  mercGearPick(id) {
    const st = this.w.st, m = mercById(st, id);
    if (!m) return;
    const gearOk = (it) => it && BASES[it.base]?.slot && !it.book;
    const row = (it, from, key) => `<div class="row mgrow"><div class="cell shopIco${rar(it)}">${ico(it)}</div><div class="grow"><b style="color:${itemColor(it)}">${esc(itemName(it))}</b><div class="note">${it.ilvl || 1}레벨</div></div><button class="btn gold" data-mgpick="${from}|${key}">입히기</button></div>`;
    const bag = st.inv.filter(gearOk).sort((a, b) => (b.ilvl || 0) - (a.ilvl || 0)).map((it) => row(it, 'inv', it.uid)).join('') || '<div class="note">없음</div>';
    const vlt = vault().items.map((it, i) => [it, i]).filter(([it]) => gearOk(it)).sort((a, b) => (b[0].ilvl || 0) - (a[0].ilvl || 0)).map(([it, i]) => row(it, 'vault', i)).join('') || '<div class="note">없음</div>';
    const cur = m.gearItem ? `<div class="row mgrow"><div class="cell shopIco${rar(m.gearItem)}">${ico(m.gearItem)}</div><div class="grow"><b style="color:${itemColor(m.gearItem)}">${esc(itemName(m.gearItem))}</b><div class="note">입는 중 · ${m.gearItem.ilvl || 1}레벨</div></div><button class="btn" data-mgoff="1">벗기기</button></div>` : m.gear ? `<div class="note">입는 중 ${m.gear.ilvl}레벨</div>` : '<div class="note">입은 장비 없음</div>';
    this.popup(`${m.name} 장비`, `<div class="mgcols"><div><h3>지금</h3>${cur}</div><div><h3>가방</h3><div class="mglist">${bag}</div></div><div><h3>창고</h3><div class="mglist">${vlt}</div></div></div>`);
    const box = document.getElementById('winAlert');
    const done = (r, msg) => { if (!r.ok) { if (r.why) this.w.ui.toast(r.why); audio.play('error'); return; } audio.play('equip_metal'); if (msg) this.w.ui.toast(msg, '#ffd84a'); this.w.ui.dirty(); this.save?.(); this.mercGearPick(id); this.render(); };
    box.querySelectorAll('[data-mgpick]').forEach((b) => { b.onclick = () => { const [from, key] = b.dataset.mgpick.split('|'); done(mercGear(st, id, from, Number(key)), `${m.name}에게 입혔습니다`); }; });
    box.querySelector('[data-mgoff]')?.addEventListener('click', () => done(mercUngear(st, id), '장비를 가방으로 돌려받았습니다'));
  }

  // 창 위 팝업 (결과 · 알림 · 우편함 · 용병 장비 …): [확인] · 오른쪽 위 × · 바깥 누르기 · Esc로 닫는다.
  // 닫기 단추는 반드시 popClose로 찾는다 (내용 안 단추가 먼저 잡혀 닫히지 않던 문제, v0.39.2)
  popup(title, html, wide = true, strict = false) {
    const cur = document.getElementById('winAlert');
    // v0.49.12 결과 창(strict)이 떠 있으면 다른 팝업은 그것을 닫은 뒤에 띄운다 (결과 창이 다른 팝업에 덮여 사라지지 않게)
    if (cur?.dataset.strict) { (this.popWait ||= []).push([title, html, wide, strict]); return; }
    cur?.remove();
    const el = document.createElement('div');
    el.id = 'winAlert';
    if (strict) el.dataset.strict = '1';
    el.innerHTML = `<div class="${wide ? 'popWide' : ''}"><button class="popX" title="닫기">×</button><b>${esc(title)}</b>${html}<button class="plate gold popClose">${strict ? '닫기' : '확인'}</button></div>`;
    closable(el, strict);
    document.body.appendChild(el); cleanTree(el);
    if (strict) new MutationObserver((_, ob) => { if (!document.body.contains(el)) { ob.disconnect(); const q = this.popWait || []; this.popWait = []; for (const a of q) this.popup(...a); } }).observe(document.body, { childList: true });
  }
  // v0.44.15 완료 알림: 파견 귀환 · 제작 · 수확 · 연구 · 공사. sections = [{ title, rows: [{ img, name, qty, color, item }] }]
  // 왼쪽 목록 · 오른쪽 고른 아이템 설명. 열려 있는 동안 새 알림은 같은 창에 더한다. ×· 바깥 · Esc · 확인으로 닫는다
  // v0.49.6 완료 알림은 왼쪽 기록 줄에 한 줄씩만 (사냥 화면을 가리지 않게)
  notice(sections) {
    if (document.getElementById('winAlert')?.dataset.notice) { this.noticeFull(sections); return; }
    for (const sec of sections) { const n = (sec.rows || []).filter((r) => r.item).length; const t = String(sec.title).split(' · ')[0]; this.w.ui.log(`${t.endsWith('완료') ? t : t.includes('전리품') ? `${t} 받음` : `${t} 완료`}${n ? ` · 장비 ${n}` : ''}`, '#7fe07a'); }
  }
  noticeFull(sections) {
    const cur = document.getElementById('winAlert');
    if (cur && !cur.dataset.notice) { (this.noticeWait ||= []).push(...sections); return; } // 다른 팝업이 떠 있으면 닫힌 뒤에
    this.noticeQ = [...(cur ? this.noticeQ || [] : []), ...sections].slice(-8).map((sec) => (sec.rows?.length > 60 ? { ...sec, rows: [...sec.rows.slice(0, 60), { name: `그 밖의 ${sec.rows.length - 60}줄`, color: '#c8c0b0' }] } : sec)); // v0.44.68 알림이 끝없이 쌓여 화면이 멈칫하던 것
    const all = this.noticeQ, items = [];
    const html = `<div class="ntc">${'<div class="ntcList">' + all.map((sec) => `<h3>${esc(sec.title)}</h3><div class="ntcRows">${(sec.rows || []).map((r) => {
      const k = r.item ? items.push(r.item) - 1 : -1;
      return `<div class="ntcRow ${k >= 0 ? 'pick' : ''}" ${k >= 0 ? `data-ntc="${k}"` : ''}>${r.img ? `<img src="${r.img}" alt="" />` : ''}<span style="${r.color ? `color:${r.color}` : ''}">${esc(r.name)}</span>${r.qty != null ? `<b>${typeof r.qty === 'number' ? r.qty.toLocaleString() : esc(String(r.qty))}</b>` : ''}</div>`; }).join('') || '<div class="note">없음</div>'}</div>`).join('') + '</div>'}<div class="ntcInfo">${items.length ? '<div class="note">아이템을 누르면 설명</div>' : ''}</div></div>`;
    const prevSc = cur?.querySelector('.ntcList')?.scrollTop || 0; // v0.49.1 알림이 더해져도 보던 자리 그대로
    this.popup('완료 알림', html, true);
    const el = document.getElementById('winAlert');
    { const nl = el.querySelector('.ntcList'); if (nl) nl.scrollTop = prevSc; }
    el.dataset.notice = '1';
    el.querySelectorAll('[data-ntc]').forEach((r) => { r.onclick = () => { el.querySelectorAll('.ntcRow.on').forEach((x) => x.classList.remove('on')); r.classList.add('on'); el.querySelector('.ntcInfo').innerHTML = this.describe(items[+r.dataset.ntc], 'notice'); audio.play('click'); }; });
    // 닫히면 기다리던 알림을 띄운다
    new MutationObserver((_, ob) => { if (!document.body.contains(el)) { ob.disconnect(); this.noticeQ = []; const w = this.noticeWait; this.noticeWait = null; if (w?.length) setTimeout(() => this.noticeFull(w), 300); } }).observe(document.body, { childList: true });
  }
  alert(title, text = '') { this.popup(title, text ? `<p>${esc(text)}</p>` : '', false); }

  keysPanel() {
    const m = keyMap(this.w.st);
    return `<h3>단축키 <button class="btn" data-keyreset="1">처음대로</button></h3><div class="keygrid">${KEY_ACTIONS.map(([id, nm]) =>
      `<span>${nm}</span><button class="btn${this.waitKey === id ? ' gold' : ''}" data-bind="${id}">${this.waitKey === id ? '키 입력…' : keyName(m[id])}</button>`).join('')}</div>`;
  }

  map() {
    const w = this.w, st = w.st, P = w.player.pos, here = this.portalAt;
    const zoom = (this.mapZoom ||= here ? 2 : 1.6), V0 = Math.max(240, Math.min(560, window.innerHeight - 110, window.innerWidth * 0.44)) /* 세로로 긴 화면(폴드)에서도 칸 안에 */, V = Math.round(V0 * zoom), k = V / MAP_W, X = (x) => ((x + MAP_R) * k).toFixed(1), Y = (z) => ((z + MAP_R) * k).toFixed(1);
    const pins = [];
    // v0.45 지명이 겹치지 않게: 아래 → 위 → 오른쪽 → 왼쪽 순으로 빈 자리에 둔다
    const boxes = [], fs = zoom >= 1.6 ? 13 : 11, place = (x, y, name) => {
      const w = name.length * fs * 0.95 + 4, h = fs + 3, opts = [['', 0, 10], ['up', 0, -10 - h], ['rt', 8 + w / 2, -h / 2], ['lt', -8 - w / 2, -h / 2]];
      for (const [c, dx, dy] of opts) { const b = { x0: x + dx - w / 2, x1: x + dx + w / 2, y0: y + dy, y1: y + dy + h }; if (!boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0)) { boxes.push(b); return c; } }
      boxes.push({ x0: x - w / 2, x1: x + w / 2, y0: y + 10, y1: y + 10 + h }); return '';
    };
    pins.push(`<div class="pin town ${place(+X(0), +Y(-2), '여명 초소')}${here ? ' go' : ''}" style="left:${X(0)}px;top:${Y(-2)}px" ${here ? 'data-travel="town"' : ''}><span>여명 초소</span></div>`);
    for (const c of CAMPS) {
      const zn = ZONES.find((z) => z.id === c.zone), got = st.camps?.[c.zone];
      if (!got && !seenAt(c.x, c.z)) continue;
      pins.push(`<div class="pin camp ${place(+X(c.x), +Y(c.z), zn.name)}${got ? '' : ' off'}${here && got && here !== c.zone ? ' go' : ''}${st.flood?.list?.some((f) => f.zone === c.zone) ? ' flood' : ''}" style="left:${X(c.x)}px;top:${Y(c.z)}px" ${here && got ? `data-travel="${c.zone}"` : ''}><span>${zn.name}</span></div>`);
    }
    for (const zn of ZONES) { const e = entranceOf(zn); if (seenAt(e.x, e.z)) pins.push(`<div class="pin gate" style="left:${X(e.x)}px;top:${Y(e.z)}px" title="던전"></div>`); }
    // v0.46 소문: 발견한 입구는 그 자리, 아직이면 지역 가운데 (어딘가)
    for (const r of rumorsOf(st)) { const zn = ZONES[r.zi]; if (!zn) continue; const x = r.found ? r.x : zn.x, z = r.found ? r.z : zn.z; pins.push(`<div class="pin rumor${r.found ? ' found' : ''}" style="left:${X(x)}px;top:${Y(z)}px" title="${esc(rumorName(r))}"></div>`); }
    pins.push(`<div class="pin me" style="left:${X(P.x)}px;top:${Y(P.z)}px"></div>`);
    // 오른쪽: 지금 있는 야영지 시설
    const cz = here && here !== 'town' ? here : inCamp(P.x, P.z)?.zone, k2 = cz && st.camps?.[cz];
    let side = here ? `<div class="note">이동할 곳</div>` : '';
    if (k2) side += `<h3 style="margin-top:10px">야영지 시설</h3>
      <div class="row"><div class="grow"><b>떠돌이 상인</b><div class="note">사고팔기</div></div><button class="btn" data-camp="${cz}|merchant" ${k2.merchant || st.gold < 5000 ? 'disabled' : ''}>${k2.merchant ? '있음' : '5,000 G'}</button></div>
      <div class="row"><div class="grow"><b>모닥불</b><div class="note">야영지에서 빨리 회복</div></div><button class="btn" data-camp="${cz}|fire" ${k2.fire || st.gold < 2000 ? 'disabled' : ''}>${k2.fire ? '있음' : '2,000 G'}</button></div>
      <div class="row"><div class="grow"><b>용병 쉼터</b> <small>${k2.rest || 0} / ${SHELTER.max}</small><div class="note">이 지역 파견: ${SHELTER.text(k2.rest || 0)}</div></div>${(k2.rest || 0) < SHELTER.max ? `<button class="btn" data-shelter="${cz}" ${st.gold < SHELTER.cost(k2.rest || 0) ? 'disabled' : ''}>${(k2.rest || 0) ? '올리기' : '짓기'} ${SHELTER.cost(k2.rest || 0).toLocaleString()} G</button>` : ''}</div>`;
    side += `<div class="note" style="margin-top:10px">발견한 야영지 ${Object.keys(st.camps || {}).length} / ${CAMPS.length}</div>`;
    // 왼쪽: 포탈로 갈 수 있는 곳 (마을 + 발견한 야영지) — 지도에서 겹쳐도 여기서 고른다
    const dests = [{ id: 'town', name: '여명 초소', lv: '마을' }, ...CAMPS.filter((c) => st.camps?.[c.zone]).map((c) => { const zn = ZONES.find((z) => z.id === c.zone); return { id: c.zone, name: zn.name, lv: `${zn.levels[0]}~${zn.levels[1]}`, l0: zn.levels[0] }; }).sort((a, b) => a.l0 - b.l0)];
    const list = `<h3>${here ? '포탈 목적지' : '발견한 포탈'}</h3>` + dests.map((d) => `<button class="btn dest${d.id === here ? ' on' : ''}" ${here && d.id !== here ? `data-travel="${d.id}"` : 'disabled'}><b>${d.name}</b><small>${d.id === here ? '지금 여기' : d.lv}</small></button>`).join('');
    const zb = `<div class="mapZoom"><button class="btn" data-mzoom="-1">−</button><span>×${zoom}</span><button class="btn" data-mzoom="1">+</button></div>`;
    return `<div class="cols"><div class="frame destList" style="flex:0 0 15em;overflow:auto">${list}${side}</div><div class="frame mapFrame" style="flex:1;overflow:auto;position:relative">${zb}<div class="wmap${zoom >= 1.6 ? ' big' : ''}" style="width:${V}px;height:${V}px"><canvas class="wmc" width="${V}" height="${V}"></canvas>${pins.join('')}</div></div></div>`; // v0.45 두 쪽: 왼쪽 포탈 · 야영지 | 오른쪽 지도
  }

  // 몬스터 도감 (잡은 수 50 · 200 · 500마다 그 몬스터에게 피해 +2 · 4 · 6%) · 보스 기록
  // v0.44.42 수련 비전: 왼쪽 갈래 · 혼합 목록 | 가운데 비전 카드 | 오른쪽 장착 칸
  arts() {
    const st = this.w.st, A = st.arts || { prog: {}, open: {}, equip: [] }, slots = artSlots(st), eq = (A.equip || []).slice(0, slots);
    const lines = [...new Set(ARTS.map((a) => a.line))], cur = lines.includes(this.artLine) ? this.artLine : lines[0];
    const lname = (l) => l.split('+').map((x) => ART_LINE_NAMES[x]).join(' + ');
    const left = lines.map((l) => { const n = ARTS.filter((a) => a.line === l && A.open[a.id]).length, all = ARTS.filter((a) => a.line === l).length;
      return `<div class="row pick${l === cur ? ' on' : ''}" data-artl="${l}"><div class="grow"><b>${lname(l)}</b></div><span class="note">${n} / ${all}</span></div>`; }).join('');
    const mid = ARTS.filter((a) => a.line === cur).map((a) => {
      const p = Math.min(a.n, A.prog?.[a.ev] || 0), open = !!A.open[a.id], on = eq.includes(a.id), use = artUsable(st, a);
      const btn = !open ? '' : !use ? '<span class="note">그 혼합 칭호 필요</span>' : on ? `<button class="btn on" data-arteq="${a.id}">빼기</button>` : `<button class="btn gold" data-arteq="${a.id}" ${eq.length >= slots ? 'disabled' : ''}>장착</button>`;
      return `<div class="row" style="${open ? '' : 'opacity:.75'}"><div class="grow"><b style="color:${open ? '#e0b0ff' : ''}">${a.name}</b><div class="note">${a.text}</div>
        ${open ? '' : `<div class="note">${a.cond} ${p.toLocaleString()} / ${a.n.toLocaleString()}</div><div class="mini" style="height:5px"><i style="width:${(p / a.n) * 100}%;background:#b080ff"></i></div>`}</div>${btn}</div>`; }).join('');
    const right = `<h3>장착 <span class="cnt">${eq.length} / ${slots}</span></h3>` + (slots ? Array.from({ length: slots }, (_, i) => { const a = ART[eq[i]];
      return `<div class="row"><div class="grow">${a ? `<b style="color:#e0b0ff">${a.name}</b><div class="note">${a.text}</div>` : '<span class="note">빈 칸</span>'}</div>${a ? `<button class="btn" data-arteq="${a.id}">빼기</button>` : ''}</div>`; }).join('') : '<div class="note">1차 각성부터</div>');
    return `<div class="cols"><div class="frame" style="flex:1">${right}<h3 style="margin-top:10px">${lname(cur)} 비전</h3>${mid}</div><div class="frame" style="flex:0 0 32%"><h3>갈래</h3>${left}</div></div>`; // v0.45 두 쪽: 왼쪽 장착 · 비전 | 오른쪽 갈래
  }

  // v0.44.41 몬스터 도감: 책처럼. 왼쪽 = 지역 · 몬스터 목록, 오른쪽 = 펼친 책 (초상 | 정보). 많이 잡을수록 정보가 열린다
  // v0.49.83 현자 에라: 도감 | 파편 (갈기 · 합치기) | 뽑기
  sage() {
    const st = this.w.st, dust = st.shardDust || 0, ug = useGrade(st);
    const gtag = (g) => `<b style="color:${gradeColor(g)}">${sgName(g)}</b>`;
    return this.tabView(`가루 <b>${dust.toLocaleString()}</b>`, 'sage', [['dex', '도감'], ['shard', '파편'], ['pull', '뽑기']], (k) => {
      if (k === 'dex') return this.dex();
      if (k === 'shard') {
        // 오른쪽: 가진 파편 (옵션마다 한 줄, 가방 · 창고)
        const stacks = [...st.inv, ...vault().items].filter((x) => x?.shard);
        if (!stacks.some((x) => x.uid === this.sgSel)) { this.sgSel = stacks[0]?.uid ?? null; this.sgPick = []; }
        // v0.49.89 오른쪽: 가방처럼 칸으로 — 옵션 이름 · 개수만 (값은 누르면 왼쪽에)
        const R = `<h3>파편 <span class="cnt">${stacks.reduce((a, x) => a + shardVals(x).length, 0)}</span></h3><div class="grid fGrid">` + (stacks.map((x) => { const gr = !!x.shard.great;
          return `<div class="cell${x.uid === this.sgSel ? ' sel' : ''}${gr ? ' r-hero' : ''}" data-sgsel="${x.uid}" title="${esc(shardName(x.shard.id))}"><span style="position:absolute;inset:3px 3px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.15;font-size:calc(var(--u) * 0.7);color:${gr ? '#ffb84a' : '#e4cfff'};word-break:keep-all">${gr ? '<small style="font-size:.8em">탁월</small>' : ''}${esc(shardName(x.shard.id))}</span><span class="q">${shardVals(x).length}</span></div>`; }).join('') || '<div class="note">파편 없음</div>') + '</div>';
        const it = stacks.find((x) => x.uid === this.sgSel);
        if (!it) return [`<h3>파편</h3><div class="note">쓸 수 있는 등급 ${gtag(ug)}</div>`, R];
        const vs = shardVals(it), pk = (this.sgPick || []).filter((i) => vs[i] != null); this.sgPick = pk;
        const gr = !!it.shard.great, dustSum = pk.reduce((a, i) => a + dustOf(shardGrade(it.shard.id, vs[i], gr), gr), 0);
        let L = `<h3>${gr ? '<b style="color:#ffb84a">탁월</b> ' : ''}${esc((AFFIXES[it.shard.id]?.text || '').replace(/\s*[+-]?\{v\}%?/, ''))} <span class="cnt">${vs.length}</span></h3>`;
        // v0.49.87 빠른 고르기: 모두 · 풀기 · 등급까지 (최고 값 지키기를 켜면 가장 높은 값은 빼고)
        const gsHave = [...new Set(vs.map((v) => shardGrade(it.shard.id, v, gr)))].sort((a, b) => a - b), keepTop = this.sgKeep !== false;
        const chip = (v, label, on = false, color = '') => `<button class="btn${on ? ' on' : ''}" data-sgq="${v}" style="${color ? `color:${color};` : ''}padding:1px 8px;min-height:0;font-size:calc(var(--u) * 0.68)">${label}</button>`;
        L += `<div class="vcats" style="margin:0 0 4px;gap:3px">${chip('all', '모두')}${chip('none', '풀기')}${gsHave.map((g) => chip('g' + g, `${sgName(g)}까지`, false, gradeColor(g))).join('')}${chip('keep', '최고 값 지키기', keepTop)}</div>`;
        L += `<div class="shList" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;max-height:calc(var(--vh) * 30)">${vs.map((v, i) => { const g = shardGrade(it.shard.id, v, gr); return `<button class="btn affBtn${pk.includes(i) ? ' on' : ''}" data-sgpick="${i}" style="color:${gradeColor(g)}${g > ug ? ';opacity:.55' : ''}">${esc(affixText({ id: it.shard.id, v }))} <small>${sgName(g)}</small></button>`; }).join('')}</div>`;
        L += `<div class="kv tight" style="margin-top:6px"><span>고름</span><b>${pk.length}개</b><span>쓸 수 있는 등급</span><b>${gtag(ug)}</b>${this.sgLast ? `<span>결과</span><b>${this.sgLast}</b>` : ''}</div>`;
        L += `<div class="btns forgeGo"><button class="btn" data-sggrind="1" ${pk.length ? '' : 'disabled'}>갈기 · 가루 +${dustSum}</button><button class="btn gold" data-sgfuse="1" ${fuseCount(it.shard.id, gr, pk.map((i) => vs[i])) || pk.length === 3 ? '' : 'disabled'}>합치기${pk.length > 3 ? ` ×${fuseCount(it.shard.id, gr, pk.map((i) => vs[i]))}` : ` ${pk.length}/3`}</button></div>`;
        return [L, R];
      }
      // 뽑기: 오른쪽 등급 → 왼쪽 뽑기
      const pg = pullGrade(st), top = Math.max(3, ug);
      const gs = Array.from({ length: top + 1 }, (_, g) => g);
      if (!gs.includes(this.sgGrade)) this.sgGrade = Math.max(0, Math.min(pg, top));
      const why = (g) => (!pullResearch(st) ? '연구 파편 연성' : g > ug ? `세계 ${sgName(g)}` : g > pg ? `파편 연성 ${Math.min(5, g + 1)}단계` : '');
      const R = `<h3>등급</h3>` + gs.map((g) => { const w = why(g); return `<div class="row pick${g === this.sgGrade ? ' on' : ''}" data-sggrade="${g}" style="${w ? 'opacity:.5' : ''}"><div class="grow">${gtag(g)}</div><span class="note">${w ? `잠김 · ${w}` : `가루 ${sgCost(g)}`}</span></div>`; }).join('');
      const g = this.sgGrade, cost = sgCost(g), w = why(g), pool = w ? [] : pullPool(st, g);
      let L = `<h3>${gtag(g)} 파편 뽑기</h3><div class="kv tight"><span>가루</span><b style="${dust < cost ? 'color:#ff7060' : ''}">${cost} <small class="note">/ ${dust.toLocaleString()}</small></b><span>나오는 옵션</span><b>${w ? '-' : `${pool.length}종`}</b></div>`;
      L += `<div class="btns forgeGo"><button class="btn gold" data-sgpull="${g}" ${!w && pool.length && dust >= cost ? '' : 'disabled'}>${w ? `잠김 · ${w}` : pool.length ? '뽑기' : '각성 부족'}</button></div>`;
      if (this.sgPullLast) L += `<div class="aff" style="margin-top:8px;color:${gradeColor(this.sgPullLast.grade)}">${esc(affixText(this.sgPullLast))} · ${sgName(this.sgPullLast.grade)}</div>`;
      return [L, R];
    });
  }

  dex() {
    const st = this.w.st, dx = st.dex || {};
    const tier = (n) => (n >= 500 ? 3 : n >= 200 ? 2 : n >= 50 ? 1 : 0);
    let seen = 0, total = 0;
    for (const z of ZONES) { const t = [...new Set([...Object.keys(z.spawns), z.named.type, z.boss.type])]; total += t.length; seen += t.filter((x) => dx[x]).length; }
    const zi = Math.max(0, ZONES.findIndex((z) => z.id === this.dexZone)), Z = ZONES[zi];
    const types = [...new Set([...Object.keys(Z.spawns), Z.named.type, Z.boss.type])];
    const sel = types.includes(this.dexMon) ? this.dexMon : types.find((x) => dx[x]) || types[0];
    const zones = `<select class="dexSel" data-dexzs="1">${ZONES.map((z, i) => `<option value="${z.id}"${i === zi ? ' selected' : ''}>${esc(z.name)} (${[...new Set([...Object.keys(z.spawns), z.named.type, z.boss.type])].filter((t) => dx[t]).length})</option>`).join('')}</select>`;
    const list = types.map((t) => { const n = dx[t] || 0, tg = t === Z.boss.type ? ' · 보스' : t === Z.named.type ? ' · 네임드' : '';
      return `<div class="row pick${t === sel ? ' on' : ''}" data-dexm="${t}"><div class="grow"><b>${n ? esc(MONSTERS[t].name) : '???'}</b><small>${tg}</small></div><span class="note">${n ? `${n}마리` : ''}</span></div>`; }).join('');
    // 펼친 책
    const n = dx[sel] || 0, M = MONSTERS[sel], kind = sel === Z.boss.type ? 'boss' : sel === Z.named.type ? 'named' : 'normal';
    const ms = this.w.monStats(sel, kind, Z), R = monsterRes(sel), k = tier(n);
    const pr = n ? monPortrait(sel, () => { if (this.kind === 'dex' || this.kind === 'sage') this.render(); }) : '';
    const lock = (need, txt) => (n >= need ? txt : `<span class="lockTxt">${need}마리를 잡으면</span>`);
    const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
    const resTxt = (v) => (v > 0 ? `<b style="color:#1f4f9a">${pct(v)} 저항</b>` : v < 0 ? `<b style="color:#a8321a">${pct(-v)} 약점</b>` : '보통');
    const page1 = `<div class="bookPage"><div class="bookPor">${pr ? `<img src="${pr}" alt="" />` : '<div class="bookQ">?</div>'}</div>
      <div class="bookName">${n ? esc(M.name) : '???'}</div><div class="note" style="text-align:center">${esc(Z.name)} · ${kind === 'boss' ? '보스' : kind === 'named' ? '네임드' : '일반'}</div>
      <div class="note" style="text-align:center;margin-top:6px">잡은 수 <b>${n}</b>${k ? ` · 주는 피해 +${k * 2}%` : ''}</div></div>`;
    const page2 = `<div class="bookPage"><h3>기록</h3><div class="kv">
      <span>위험도</span><b>${n ? ms.level : '?'}</b>
      <span>체력</span><b>${lock(10, ms.hp.toLocaleString())}</b>
      <span>공격력</span><b>${lock(50, `${ms.dmg[0].toLocaleString()} ~ ${ms.dmg[1].toLocaleString()}`)}</b>
      <span>방어력</span><b>${lock(50, ms.armor)}</b>
      <span>공격 방식</span><b>${lock(10, ms.attack === 'spell' ? '주문' : ms.attack === 'ranged' ? '원거리' : '근접')}</b>
      <span>물리</span><b>${lock(100, resTxt(R.phys))}</b>
      <span>마법</span><b>${lock(100, resTxt(R.mag))}</b>
      <span>무리</span><b>${lock(100, R.tag || '없음')}</b>
      <span>도감 보너스</span><b>${n >= 500 ? '최고' : `${n >= 200 ? 500 : n >= 50 ? 200 : 50}마리에 피해 +${(k + 1) * 2}%`}</b></div></div>`;
    return `<div class="cols"><div class="frame" style="flex:0 0 34%"><h3>몬스터 도감 <span class="cnt">${seen} / ${total}</span></h3>
        ${zones}<div class="dexList">${list}</div></div>
      <div class="frame book" style="flex:1"><div class="bookSpread">${page1}${page2}</div></div></div>`;
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
      const stock = def?.rate ? `<div class="mini"><i style="width:${(x.stock / storeCap(st, x)) * 100}%;background:linear-gradient(#ffe7a0,#c99a3a)"></i></div>` : '';
      return `<div class="row pick${pl.id === sel ? ' on' : ''}" data-plot="${pl.id}"><div class="grow"><b>${def ? `${def.name} <small>${x.lv}단계</small>` : '빈터'}</b><div class="note">${def ? def.desc : pl.name}</div>${stock}</div>
        ${def?.rate ? `<span class="note">${Math.floor(x.stock)} / ${storeCap(st, x)}</span>` : ''}</div>`;
    }).join('') + (() => { const fp = floodPenalty(st); return fp.n ? `<div class="row" style="border-color:#a03a2a"><div class="grow"><b style="color:#ff7a5a">범람지 ${fp.n}곳</b><div class="note">${floodText(fp)}</div><div class="note">${st.flood.list.map((f) => ZONES.find((z) => z.id === f.zone)?.name).join(' · ')}</div></div></div>` : ''; })();
    let right = '';
    if (!b) {
      right = `<h3>무엇을 지을까</h3>` + Object.entries(BUILDINGS).sort((a, c) => (a[1].need || 0) - (c[1].need || 0)).map(([k, d]) => {
        const has = Object.values(t.plots).some((q) => q.type === k);
        const lock = (st.awakenings || 0) < (d.need || 0);
        return `<div class="row"><div class="grow"><b>${d.name}</b><div class="note">${d.desc}</div></div><button class="btn" data-build="${k}" ${has || lock || st.gold < d.cost(0) ? 'disabled' : ''}>${has ? '지음' : lock ? `각성 ${d.need}` : `${d.cost(0).toLocaleString()} G · ${buildTime(1) / 60000}분`}</button></div>`;
      }).join('');
    } else {
      const def = BUILDINGS[b.type], up = def.cost(b.lv);
      const un = up == null ? null : upgradeNeed(b.lv), umOk = !un || (un.items.every((x) => resCount(st, x.base) >= x.n) && (!un.herbs || highHerbs(st) >= un.herbs));
      const needTxt = (q) => q ? [...q.items.map((x) => `${BASES[x.base].name} ${x.n}`), ...(q.herbs ? [`높은 약초 ${q.herbs}`] : [])].join(' · ') : ''; // v0.49.73 11 ~ 20단계는 재료가 여럿
      const an = def.up?.[b.lv - 1] ?? 0, anOk = (st.awakenings || 0) >= an;
      const fmtT = (ms) => { const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간` : h ? `${h}시간 ${m % 60}분` : `${m}분`; };
      // 단계별 비용표: 금화 · 재료 · 각성 · 시간
      const costTable = `<h3 style="margin-top:8px">단계별 비용 <small>${def.max}단계까지</small></h3><div class="kv costT">` + Array.from({ length: def.max }, (_, i) => i).filter((lv) => lv >= b.lv - 1 && lv <= b.lv + 1).map((lv) => { // v0.45.7 지금 · 다음 단계 근처만
        const g = def.cost(lv), m = lv ? upgradeNeed(lv) : null, aw = lv ? def.up?.[lv - 1] ?? 0 : def.need || 0;
        return `<span${b.lv === lv + 1 ? ' style="color:#ffd84a"' : ''}>${lv + 1}단계</span><b>${g.toLocaleString()} G${m && needTxt(m) ? ` · ${needTxt(m)}` : ''} · 각성 ${aw} · ${fmtT(buildTime(lv + 1))}</b>`;
      }).join('') + '</div>';
      if (b.bld) right = `<h3>${def.name} · ${b.bld.to === 1 ? '짓는 중' : `${b.bld.to}단계로 올리는 중`} <small class="note">${fmtT(Math.max(60000, b.bld.until - Date.now()))}</small></h3>${gauge(b.bld.from, b.bld.until, 60000, '#ffd84a')}` + (countOf(st, 'build_rush') ? `<div class="btns"><button class="btn gold" data-rush="1">공사 촉진제 ${countOf(st, 'build_rush')} · 남은 시간 절반</button></div>` : '') + (bmode ? costTable : '');
      else right = `<h3>${def.name} · ${b.lv}단계</h3>` + (one ? '' : `<div class="btns" style="margin:0 0 8px"><button class="btn" data-upgrade="1" ${up == null || st.gold < up || !umOk || !anOk ? 'disabled' : ''}>${up == null ? '최고 단계' : !anOk ? `각성 ${an} 필요` : `단계 올리기 ${up.toLocaleString()} G${un && needTxt(un) ? ` · ${needTxt(un)}` : ''}`}</button></div><div class="note">${def.desc}</div>`);
      if (bmode && !b.bld) right += costTable;
      if (one && b.bld?.to !== 1) { const v = this.buildingView(b, sel); if (v) return v; } // v0.49.76 단계를 올리는 중에도 탭 화면 (두 쪽) — 예전엔 공사 중이면 세 칸 화면이 나왔다 // v0.45 건물 창: 기능별 탭 · 두 쪽
      if (!bmode && !(b.bld?.to === 1)) {
      if (b.type === 'workshop') {
        if (one) return this.workshopView(b, sel);
        const P = this.workshopParts(st, b, t);
        right += P.herbs + P.swap + P.ore + P.ess + P.queue + COL + P.recipes;
      }
      if (b.type === 'herb') right += `<h3>자라는 약초</h3><div class="herbList">${herbsAt(10).map((h) => { const on = HERBS[h].lv <= b.lv; return `<span class="hb" style="${on ? '' : 'opacity:.4'}"><img src="${herbIcon(h)}" alt="" />${HERBS[h].name} <b>${on ? Math.floor(t.herbs[h] || 0) : `${HERBS[h].lv}단계`}</b></span>`; }).join('')}</div>`;
      if (b.type === 'guild') right += `<div class="kv"><span>8단계</span><b style="${b.lv >= 8 ? '' : 'opacity:.45'}">죽어도 물약 회수</b><span>10단계</span><b style="${b.lv >= 10 ? '' : 'opacity:.45'}">사망 -30% · 전리품 +10%</b></div>` + this.guildPanel(b);
      if (SKILL_OF[b.type]) {
        const sk = SKILL_OF[b.type], crew = t.mercs.filter((m) => m.work === sel), idle = t.mercs.filter((m) => !m.work && !m.job);
        const eff = crew.filter((m) => !m.tired).reduce((a, m) => a + (m[sk] || 0) / 10, 0) / b.lv;
        right += `<h3 style="margin-top:8px">일하는 용병 ${crew.length} / ${b.lv} <small>${SKILL_NAMES[sk]} · ${def.rate ? `생산 ${Math.round(Math.min(2, eff) * 100)}%` : BONUS[b.type].text(bonusOf(st, b.type))}</small></h3>`;
        right += crew.map((m) => `<div class="row mrow">${this.mercLine(m, sk)}<button class="btn" data-mwork="${m.id}|">쉬게</button></div>`).join('') || `<div class="note">${def.rate ? '일하는 용병이 없으면 생산하지 않습니다' : '없음'}</div>`;
        if (crew.length < b.lv && idle.length) right += `<div class="note" style="margin-top:6px">쉬는 용병</div>` + idle.sort((a, c) => (c[sk] || 0) - (a[sk] || 0)).map((m) => `<div class="row mrow">${this.mercLine(m, sk)}<button class="btn" data-mwork="${m.id}|${sel}">일 맡기기</button></div>`).join('');
      }
      if (def.rate) right += `<div class="kv"><span>생산</span><b>시간당 ${Math.round(def.rate(b.lv) * Math.min(1, t.mercs.filter((m) => m.work === sel && !m.tired).reduce((a, m) => a + m[b.type] / 10, 0) / b.lv) * 1)}</b><span>쌓인 양</span><b>${Math.floor(b.stock)} / ${storeCap(st, b)}</b></div>
        <div class="btns"><button class="btn gold" data-collect="1" ${b.stock < 1 ? 'disabled' : ''}>거두기</button></div>`;
      if (b.type === 'smithy') {
        const cap = enhanceCap(st);
        right += COL + `<h3>강화</h3><div class="note">${cap === Infinity ? '초월 강화' : `강화 상한 +${cap}`} · 실패해도 단계 유지 · 실패하면 장인의 기운이 쌓이고 100%면 반드시 성공</div>`;
        for (const [key, it, where] of gearList(st, (x) => !x.book && !x.noDrop)) {
          const c = enhanceCost(it, st), max = (it.plus || 0) >= cap, rc = reforgeCost(it);
          right += `<div class="row"><div class="cell shopIco${rar(it)}">${ico(it)}</div><div class="grow"><b style="color:${itemColor(it)}">${esc(itemName(it))}</b> <small class="note">${where}</small>
            <div class="note">${max ? '상한' : `+${(it.plus || 0) + 1} · ${c.jang >= 1 ? '<b style="color:#ffd84a">100%</b>' : `${+(c.chance * 100).toFixed(1)}%`} · 장인의 기운 ${+(c.jang * 100).toFixed(1)}% · ${c.gold.toLocaleString()} G · ${c.oreName} ${c.ore} (${resCount(st, c.oreId)})`}</div></div>
            <button class="btn" data-enh="${key}" ${max || st.gold < c.gold || resCount(st, c.oreId) < c.ore ? 'disabled' : ''}>강화</button></div>`;
        }
        const junk = st.inv.filter((x) => !x.book && BASES[x.base]?.slot);
        if (junk.length) right += `<h3 style="margin-top:8px">분해 <button class="btn" data-salvageall="1">등급별 분해</button></h3>` + junk.map((x) => { const v = salvageValue(x); return `<div class="row"><div class="cell shopIco${rar(x)}">${ico(x)}</div><div class="grow"><b style="color:${itemColor(x)}">${esc(itemName(x))}</b><div class="note">강화석 ${v.ore} · ${MATERIALS[v.mat].name} ${v.matN}</div></div><button class="btn" data-salvage="${x.uid}">분해</button></div>`; }).join('');
        right += COL + this.shardPanel(b);
      }
      if (b.type === 'lab') {
        right += COL + '<h3>연구</h3>'; for (const j of labJobs(st)) right += `<div class="note">연구 중: ${RESEARCH[j.id].name} · ${Math.max(1, Math.ceil((j.until - Date.now()) / 60000))}분 남음</div>${gauge(t.lab.from, t.lab.until)}`;
        for (const [id, r] of Object.entries(RESEARCH)) {
          const lv = researchLv(st, id), c = researchCost(lv, id), max = lv >= researchMax(st, id), open = b.lv >= r.lab;
          right += `<div class="row" style="${open ? '' : 'opacity:.45'}"><div class="grow"><b>${r.name}</b> <small>${lv} / ${researchMax(st, id)}</small><div class="note">${open ? `${lv ? r.text(lv) : '없음'}${max ? '' : ` → ${r.text(lv + 1)}`}` : `연구소 ${r.lab}단계 · ${r.text(1)}`}</div></div>
            ${open ? `<button class="btn" data-research="${id}" ${max || labJobs(st).length >= labSlots(st) || st.gold < c.gold ? 'disabled' : ''}>${max ? '완료' : `${c.gold.toLocaleString()}G · 재료 ${c.mats}${c.ess ? ` · ${BASES[c.ess.id].name} ${c.ess.n}` : ''} · ${c.min}분`}</button>` : ''}</div>`;
        }
      }
      if (b.type === 'altar') { // v0.44.47 유물 제단
        const R = (st.relics ||= { bag: [], on: [] }), now = Date.now(), slots = altarSlots(b.lv); R.on = (R.on || []).filter((r) => r.until > now);
        const left = (r) => { const m = Math.ceil((r.until - now) / 60000), h = Math.floor(m / 60); return h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간` : `${h}시간 ${m % 60}분`; };
        right += `<h3>올린 유물 <span class="cnt">${R.on.length} / ${slots}</span></h3>` + (R.on.map((r, i) => `<div class="row"><div class="grow"><b style="color:${RELIC_GRADES[r.g].color}">${RELIC[r.id].name}</b> <small>${RELIC_GRADES[r.g].name}</small><div class="note">${RELIC[r.id].text(relicV(r))} · ${left(r)}</div></div><button class="btn" data-reloff="${i}">내리기</button></div>`).join('') || '<div class="note">없음</div>')
          + `<h3>가진 유물 <span class="cnt">${(R.bag || []).length}</span></h3>` + ((R.bag || []).map((r, i) => `<div class="row"><div class="grow"><b style="color:${RELIC_GRADES[r.g].color}">${RELIC[r.id].name}</b> <small>${RELIC_GRADES[r.g].name} · ${Math.round(RELIC_GRADES[r.g].days * altarDur(b.lv) * 10) / 10}일</small><div class="note">${RELIC[r.id].kind} · ${RELIC[r.id].text(relicV(r))}</div></div><button class="btn gold" data-relon="${i}" ${R.on.length >= slots ? 'disabled' : ''}>올리기</button></div>`).join('') || '<div class="note">없음</div>');
      }
      if (b.type === 'house') right += `<div class="kv"><span>고용 한도</span><b>${mercSlots(st)}명</b><span>지금</span><b>${t.mercs.length}명</b><span>쉬고 난 기운</span><b>힘 +${Math.round(FRESH.k * b.lv * 100)}% · 2시간</b></div>`;
      if (b.type === 'inn') {
        // v0.44.15 침대: 지친 용병이 와서 쉰다 (단계 = 침대 수 · 회복 속도)
        const beds = INN_BEDS(b.lv), resting = t.mercs.filter((m) => m.rest);
        right += `<h3>쉬는 용병 <small>침대 ${resting.length} / ${beds} · 회복 ×${innRestK(st).toFixed(1)}</small></h3>` + (resting.map((m) => `<div class="row mrow">${this.mercLine(m)}<div class="note" style="min-width:6em">체력 ${Math.floor(m.sta)} / ${staMax(m)}</div></div>`).join('') || '<div class="note">없음</div>');
        const zones = ZONES.filter((z) => isLiberated(st, z.id)), rec = recruits(st), slots = mercSlots(st);
        const nextH = Math.ceil((3600000 - (Date.now() % 3600000)) / 60000);
        const eLv = Math.min(10, b.lv + Math.round(relicBonus(st, 'inn'))), my = MYTH_CHANCE(eLv), gw0 = BUILDINGS.inn.grades(Math.max(1, Math.min(5, eLv))), gs0 = gw0.reduce((a, v) => a + v, 0), gw = [...gw0.map((v) => v * (1 - my)), gs0 * my], gs = gs0; // 실제 뽑기(rollMerc)와 같은 계산 · 신화 포함
        right += COL + `<h3>찾아온 용병 <small>${nextH}분 뒤 바뀜 · 고용 ${t.mercs.length} / ${slots}</small></h3><div class="note">${GRADES.map((g, i) => `<span style="color:${g.color}">${g.name} ${Math.round((gw[i] / gs) * 100)}%</span>`).join(' · ')}</div>`;
        right += rec.map((m) => `<div class="row mrow">${this.mercLine(m)}<button class="btn gold" data-hirem="${m.id}" ${t.mercs.length >= slots || st.gold < m.cost ? 'disabled' : ''}>${m.cost.toLocaleString()} G</button></div>`).join('') || '<div class="note">없음</div>';
        right += COL + `<h3>내 용병 <small>하루 품삯 <b style="color:#ffd84a">${wageTotal(st).toLocaleString()} G</b>${t.wageLog?.unpaid ? ` · <b style="color:#ff7060">못 받은 용병 ${t.wageLog.unpaid}</b>` : ''}</small></h3>`;
        t.mercs.forEach((m) => {
          const left = m.job ? Math.max(0, m.job.until - Date.now()) : 0, where = m.work && t.plots[m.work] ? BUILDINGS[t.plots[m.work].type].name : '';
          const state = m.job ? (left > 0 ? `${ZONES.find((z) => z.id === m.job.zone).name} 파견 · ${Math.ceil(left / 60000)}분` : '돌아옴') : m.rest ? '여관에서 쉬는 중' : m.tired ? '지쳐서 쉬는 중' : where ? `${where}에서 일함` : '쉬는 중';
          right += `<div class="row mrow">${this.mercLine(m)}<div class="note" style="min-width:7em">${state}${m.job && left > 0 ? gauge(m.job.from, m.job.until, 1800000, '#ffc860') : ''}</div>
            ${m.job && left <= 0 ? `<button class="btn gold" data-claim="${m.id}">전리품</button>` : ''}
            ${m.lv >= MERC.lvMax && (m.aw || 0) < MERC.awMax ? `<button class="btn gold" data-mawk="${m.id}" ${st.gold < awakenCost(m) ? 'disabled' : ''}>각성 ${awakenCost(m).toLocaleString()}G</button>` : ''}
            ${!m.job ? `<button class="btn" data-mgear="${m.id}">장비</button><button class="btn danger" data-mfire="${m.id}">내보내기</button>` : ''}</div>`;
        });
      }
      }
    }
    if (one) { const parts = right.split(COL).filter((x) => x.replace(/<[^>]+>/g, '').trim()); return `<div class="cols">${parts.map((x) => `<div class="frame detail" style="flex:1;overflow:auto">${x}</div>`).join('')}</div>`; } // 건물 창: 내용별 칸을 가로로
    return `<div class="cols"><div class="frame" style="flex:0 0 40%"><h3>마을 <span class="goldTxt">${st.gold.toLocaleString()} G</span></h3><div class="note" style="display:flex;gap:6px;align-items:center"><img src="${oreIcon()}" style="width:1.6em" alt="" />강화석 ${t.ore}</div><div class="note">용병 ${t.mercs.length} / ${mercSlots(st)} · 쉬는 ${t.mercs.filter((m) => !m.work && !m.job).length}</div><div class="note">${Object.entries(t.mats).filter(([, n]) => n > 0).map(([k, n]) => `${MATERIALS[k].name} ${n}`).join(' · ')}</div>${left}</div>
      <div class="frame detail" style="flex:1">${right}</div></div>`;
  }

  // 보석상: 가방(구멍 있는 장비 · 보석) | 고른 장비의 구멍에 박기 · 빼기 | 보석 합치기 (보석은 팔지 않는다 — 돈으로 상위 보석을 무한히 만들 수 있어서)
  gems() {
    const st = this.w.st;
    const row = (icon, title, sub, btns) => `<div class="grow-row"><div class="cell shopIco">${icon}</div><div class="gtxt"><b>${title}</b><div class="note">${sub}</div><div class="gbtns">${btns}</div></div></div>`;
    // 보석은 가방 + 창고 (v0.40.1)
    const have = [...new Set([...st.inv, ...vault().items].filter((x) => BASES[x.base]?.type === 'gem').map((x) => x.base))].map((base) => ({ base, qty: resCount(st, base) })).sort((a, b) => BASES[a.base].grade - BASES[b.base].grade || a.base.localeCompare(b.base));
    // 구멍 있는 장비: 착용 (e:부위) + 가방 (b:uid)
    const targets = gearList(st, (x) => x.sockets);
    if (!targets.some((t) => t[0] === this.gemSel)) this.gemSel = targets[0]?.[0];
    const sel = targets.find((t) => t[0] === this.gemSel)?.[1];
    // 왼쪽: 착용 중 · 가방 칸 (구멍 있는 장비만 누를 수 있다)
    const eqCells = SLOTS.filter((sl) => st.equip[sl]?.sockets).map((sl) => { const it = st.equip[sl]; return `<div class="cell${rar(it)}${this.gemSel === 'e:' + sl ? ' sel' : ''}" data-gsel="e:${sl}" title="${esc(itemName(it))}">${ico(it)}<span class="q">${it.gems.length}/${it.sockets}</span></div>`; }).join('');
    let bag = '';
    for (let i = 0; i < bagSize(st); i++) { const it = st.inv[i]; if (!it) { bag += '<div class="cell"></div>'; continue; }
      const can = !!it.sockets; bag += `<div class="cell${rar(it)}${this.gemSel === 'b:' + it.uid ? ' sel' : ''}${can ? '' : ' dim'}" ${can ? `data-gsel="b:${it.uid}"` : ''} title="${esc(itemName(it))}">${ico(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : it.sockets ? `<span class="q">${it.gems.length}/${it.sockets}</span>` : ''}</div>`; }
    const vCells = vault().items.filter((x) => x?.sockets).map((it) => `<div class="cell${rar(it)}${this.gemSel === 'v:' + it.uid ? ' sel' : ''}" data-gsel="v:${it.uid}" title="${esc(itemName(it))}">${ico(it)}<span class="q">${it.gems.length}/${it.sockets}</span></div>`).join('');
    const left = `<h3>착용 장비</h3><div class="grid">${eqCells || '<div class="note">구멍 있는 착용 장비 없음</div>'}</div><h3 style="margin-top:8px">가방 <span class="cnt">${st.inv.length}/${bagSize(st)}</span></h3><div class="grid">${bag}</div>`;
    const leftV = vCells ? `<h3 style="margin-top:8px">창고</h3><div class="grid">${vCells}</div>` : '';
    // 가운데: 고른 장비의 구멍
    let mid = '<h3>구멍</h3><div class="forgeSlot empty"></div>';
    if (sel) {
      mid = `<div class="nm" style="color:${itemColor(sel)}">${esc(itemName(sel))}</div><div class="note">구멍 ${sel.gems.length} / ${sel.sockets}</div>`;
      mid += sel.gems.map((g, k) => row(ico({ base: g }), BASES[g].name, `${STAT_NAMES[GEMS[BASES[g].gem].stat]} +${GEM_GRADES[BASES[g].grade].v}`, `<button class="btn" data-gpull="${this.gemSel}|${k}">빼기 · ${pullCost(g).toLocaleString()}G</button>`)).join('');
      if (sel.gems.length < sel.sockets) mid += `<div class="note" style="margin-top:6px">끼울 보석</div><div class="grid gemGrid">${have.map((x) => `<div class="cell" data-gput="${this.gemSel}|${x.base}" title="${esc(BASES[x.base].name)}">${ico(x)}<span class="q">${x.qty}</span></div>`).join('') || '<div class="note">가진 보석이 없습니다</div>'}</div>`;
    }
    // v0.45 보석상: 박기 (오른쪽 장비 → 왼쪽 구멍 · 끼울 보석) | 합치기 (오른쪽 보석 → 왼쪽 합치기)
    return this.tabView('보석상', 'gems', [['put', '끼우기'], ['merge', '합치기']], (k) => {
      if (k === 'put') return [mid, left + leftV];
      if (!have.some((x) => x.base === this.gemMerge)) this.gemMerge = have[0]?.base;
      const R = `<h3>가진 보석 <span class="cnt">${have.length}</span><button class="btn gold" data-gmergeall="1" style="margin-left:auto">등급별 합치기</button></h3><div class="grid fGrid">${have.map((x) => `<div class="cell${x.base === this.gemMerge ? ' sel' : ''}" data-gmsel="${x.base}" title="${esc(BASES[x.base].name)}">${ico(x)}<span class="q">${x.qty}</span></div>`).join('') || '<div class="note">없음</div>'}</div>`;
      const x = have.find((y) => y.base === this.gemMerge);
      if (!x) return ['<h3>합치기</h3><div class="forgeSlot empty"></div>', R];
      const b = BASES[x.base], up = b.grade + 1 < GEM_GRADES.length, cost = mergeCost(b.grade), ch = mergeChance(b.grade), nx = up ? gemId(b.gem, b.grade + 1) : null;
      let L = `<div class="forgeTop"><div class="cell forgeSlot">${ico(x)}</div><div><div class="nm">${b.name}</div><div class="note">${STAT_NAMES[GEMS[b.gem].stat]} +${GEM_GRADES[b.grade].v} · ${x.qty}개</div></div></div>`;
      if (up) L += `<div class="kv tight"><span>결과</span><b>${BASES[nx]?.name || ''} <em>${STAT_NAMES[GEMS[b.gem].stat]} +${GEM_GRADES[b.grade + 1].v}</em></b><span>필요</span><b style="${x.qty < 3 ? 'color:#ff7060' : ''}">3개 <small class="note">/ ${x.qty}</small></b><span>금화</span><b style="${st.gold < cost ? 'color:#ff7060' : ''}">${cost.toLocaleString()} G</b><span>성공 확률</span><b>${Math.round(ch * 100)}%</b></div><div class="btns forgeGo"><button class="btn gold big" data-gmerge="${x.base}" ${x.qty < 3 || st.gold < cost ? 'disabled' : ''}>합치기</button></div>`;
      else L += '<div class="note">최고 등급</div>';
      return [L, R];
    });
  }

  shop() {
    const st = this.w.st;
    if (this.sel?.from === 'equip') this.sel = null;
    const goods = Object.keys(BASES).filter((id) => BASES[id].shop && BASES[id].type !== 'gem'); // 보석은 보석상에서
    // v0.45 상점: 구매 (오른쪽 물건 → 왼쪽 정보 · 사기) | 판매 (오른쪽 가방 → 왼쪽 정보 · 팔기)
    return this.tabView('상인 오르텐', 'shop', [['buy', '구매'], ['sell', '판매'], ...(findBuilding(st, 'herb') ? [['order', '납품']] : []), ...(raidOpen(st) ? [['raid', '원정']] : [])], (k) => {
      if (k === 'raid') return this.raidShop(st);
      if (k === 'order') return this.herbOrderTab(st);
      if (k === 'sell') {
        if (this.shopSrc !== 'v') { if (!this.sellPick && !this.cur()) { const f = st.inv.find((x) => BASES[x.base]?.type !== 'mat'); if (f) this.sel = { from: 'inv', uid: f.uid }; } const cur = this.cur(); return [this.describe(cur, cur ? 'inv' : null), this.bagHead() + this.bagGrid()]; }
        const V = vault().items; if (!this.vPick && !V.some((x) => x?.uid === this.vSel)) this.vSel = V.find(Boolean)?.uid ?? null; const it = V.find((x) => x?.uid === this.vSel);
        // v0.45.3 창고도 여러 개 팔기 · 일반 · 마법 팔기 (가방과 같은 단추)
        const vp = this.vPick, vpG = vp ? V.filter((x) => x && vp.includes(x.uid)).reduce((a, x) => a + itemValue(x), 0) : 0;
        const vBtns = (vp ? `<button class="btn gold" data-vpick="go" ${vp.length ? '' : 'disabled'}>${vp.length}개 판매 ${vpG.toLocaleString()}G</button><button class="btn" data-vpick="off">취소</button>` : '<button class="btn" data-vpick="on">여러 개</button>') + '<button class="btn" data-vselljunk="1">일반·마법</button>';
        const R = `<h3>${this.srcBtns('shopsrc', true)} <span class="cnt">${V.length}</span><span style="margin-left:auto"></span>${vBtns}</h3><div class="grid">${V.map((x) => x ? `<div class="cell${rar(x)}${(vp ? vp.includes(x.uid) : x.uid === this.vSel) ? ' sel' : ''}" data-vshop="${x.uid}">${ico(x)}${cellTag(x)}${lk(x)}${x.qty > 1 ? `<span class="q">${x.qty}</span>` : ''}</div>` : '').join('')}</div>`;
        return [it ? this.describe(it, 'view') + `<div class="btns forgeGo"><button class="btn gold big" data-vsell="${it.uid}" ${it.lock ? 'disabled' : ''}>${it.lock ? '잠김' : `판매 ${itemValue(it).toLocaleString()}G`}</button></div>` : this.describe(null), R];
      }
      if (!goods.includes(this.shopSel)) this.shopSel = goods[0];
      const R = `<h3>물건 <span class="cnt">${goods.length}</span></h3>` + goods.map((id) => { const b = BASES[id], desc = b.dmg ? `피해 ${b.dmg[0]}~${b.dmg[1]} · ${WEAPON_CLASSES[b.cls].name}` : b.armor ? `방어력 ${b.armor}${b.block ? ` · 막기 ${b.block * 100}%` : ''}` : b.restore ? (b.restore.hp ? `HP ${b.restore.hp}` : `MP ${b.restore.mp}`) : '';
        return `<div class="row shopRow pick${id === this.shopSel ? ' on' : ''}" data-shopsel="${id}"><div class="cell shopIco">${ico({ base: id, rarity: 'common' })}</div><div class="grow"><b>${b.name}</b><div class="note">${desc}</div></div><b class="goldTxt">${b.price.toLocaleString()}G</b></div>`; }).join('');
      const id = this.shopSel, b = BASES[id], qty = b.stack && b.type !== 'pet' ? [1, 5, 20] : [1];
      const L = this.describe(makeItem(id, { rarity: 'common', ilvl: 1 }), null) + `<div class="btns forgeGo">${qty.map((q) => `<button class="btn gold" data-buy="${id}" data-q="${q}" ${st.gold < b.price * q ? 'disabled' : ''}>${q > 1 ? `×${q} ` : ''}${(b.price * q).toLocaleString()}G</button>`).join('')}</div>`;
      return [L, R];
    });
  }

  loadRaidRank(wk, g) {
    const k = `${wk}|${g}`; (this.raidRank ||= {}); if (this.raidRank[k] !== undefined || this.raidLoading?.[k]) return;
    (this.raidLoading ||= {})[k] = true;
    cloud.raidList(wk, g).then((list) => { this.raidRank[k] = list || []; this.raidLoading[k] = false; if (this.kind === 'raid') this.render(); });
  }
  // v0.49.73 약초 납품 의뢰: 왼쪽 = 오늘의 납품 | 오른쪽 = 가진 약초
  herbOrderTab(st) {
    const t = townOf(st), L = `<h3>오늘의 납품</h3>` + herbOrders(st).map((o, i) => `<div class="row${o.done ? ' fin' : ''}"><img src="${herbIcon(o.h)}" alt="" style="width:28px" /><div class="grow"><b>${HERBS[o.h].name} ${o.n}</b> <small class="note">가진 ${Math.floor(t.herbs[o.h] || 0)}</small><div class="note">${o.gold.toLocaleString()} G · ${BASES[o.ess]?.name || ''} ${o.essN}</div></div>
      <button class="btn gold" data-hord="${i}" ${o.done || (t.herbs[o.h] || 0) < o.n ? 'disabled' : ''}>${o.done ? '완료' : '납품'}</button></div>`).join('');
    const R = `<h3>가진 약초</h3><div class="herbList herbCards">${HERB_IDS.filter((h) => (t.herbs[h] || 0) >= 1).map((h) => `<span class="hb"><img src="${herbIcon(h)}" alt="" />${HERBS[h].name} <b>${Math.floor(t.herbs[h])}</b></span>`).join('')}</div>`;
    return [L, R];
  }
  // v0.49.73 약초밭 재배 (11단계~): 왼쪽 = 주력 재배 · 비료 | 오른쪽 = 증류 · 가진 약초
  herbGrow(st, t, b) {
    const now = Date.now(), F = t.herbFocus || [], ids = herbsAt(b.lv), fl = Math.max(0, (t.fertUntil || 0) - now);
    const lock = (lv) => `<div class="note">${lv}단계</div>`;
    let L = `<h3>주력 재배 <small>${F.length} / 2 · 고른 약초가 절반</small></h3><div class="btns" style="flex-wrap:wrap">${ids.map((h) => `<button class="btn${F.includes(h) ? ' on' : ''}" data-hfocus="${h}"><img src="${herbIcon(h)}" alt="" style="width:18px;vertical-align:middle" /> ${HERBS[h].name}</button>`).join('')}</div>`;
    L += `<h3 style="margin-top:8px">비료 <small>8시간 약초 생산 +50%</small></h3>` + (b.lv >= 13 ? `<div class="kv"><span>남은 시간</span><b>${fl ? `${Math.floor(fl / 3600e3)}시간 ${Math.floor((fl % 3600e3) / 60000)}분` : '없음'}</b></div>
      <div class="btns"><button class="btn gold" data-fert="ore" ${resCount(st, 'ore') >= FERT.ore ? '' : 'disabled'}>강화석 ${FERT.ore}</button><button class="btn gold" data-fert="ore2" ${resCount(st, 'ore2') >= FERT.ore2 ? '' : 'disabled'}>상급 강화석 ${FERT.ore2}</button></div>` : lock(13));
    L += `<h3 style="margin-top:8px">변이 약초</h3>` + (b.lv >= 15 ? `<div class="kv"><span>${HERBS.myriad.name}</span><b>${Math.floor(t.herbs.myriad || 0)} · 거둘 때 ${(0.4 + 0.1 * (b.lv - 15)).toFixed(1)}%</b></div>` : lock(15));
    const hh = highHerbs(st);
    let R = `<h3>증류 <small>높은 약초 → 정수</small></h3>` + (b.lv >= 18 ? Object.entries(DISTILL).map(([id, n]) => `<div class="row"><img src="${itemIcon({ base: id })}" alt="" style="width:28px" /><div class="grow">${BASES[id].name} <span class="note">높은 약초 ${n}</span></div><button class="btn gold" data-distill="${id}" ${hh >= n ? '' : 'disabled'}>증류</button></div>`).join('') : lock(18));
    R += `<h3 style="margin-top:8px">가진 약초 <small>높은 약초 ${Math.floor(hh)}</small></h3><div class="herbList herbCards">${HERB_IDS.filter((h) => (t.herbs[h] || 0) >= 1).map((h) => `<span class="hb"><img src="${herbIcon(h)}" alt="" />${HERBS[h].name} <b>${Math.floor(t.herbs[h])}</b></span>`).join('')}</div>`;
    return [L, R];
  }
  // v0.49.73 제단 향로: 왼쪽 = 향로 자리(타는지 · 시간당 약초) | 오른쪽 = 향 고르기
  censerTab(st, t) {
    const C = (t.censer ||= { on: [], burn: {} }), n = censerSlotsOf(st), k = 1 - researchLv(st, 'censer') * 0.03;
    const fuel = (id) => Object.entries(CENSERS[id].fuel).map(([h, q]) => `${h === 'high' ? '높은 약초' : HERBS[h].name} ${+(q * k).toFixed(1)}`).join(' · ');
    const have = (id) => Object.keys(CENSERS[id].fuel).map((h) => `${h === 'high' ? '높은 약초' : HERBS[h].name} ${Math.floor(h === 'high' ? highHerbs(st) : t.herbs[h] || 0)}`).join(' · ');
    if (this.censerSlot == null || this.censerSlot >= n) this.censerSlot = 0;
    const L = `<h3>향로 <span class="cnt">${n}</span></h3>` + Array.from({ length: n }, (_, i) => { const id = C.on[i], on = id && C.burn[id];
      return `<div class="row pick${i === this.censerSlot ? ' on' : ''}" data-cslot="${i}"><div class="grow"><b>${id ? CENSERS[id].name : '빈 향로'}</b> ${id ? `<small style="color:${on ? '#9fe39f' : '#ff8a7a'}">${on ? '타는 중' : '약초 부족'}</small>` : ''}
        <div class="note">${id ? `${CENSERS[id].text} · 시간당 ${fuel(id)}` : ''}</div></div>${id ? `<button class="btn" data-coff="${i}">끄기</button>` : ''}</div>`; }).join('');
    const R = `<h3>향 <small>${this.censerSlot + 1}번 향로에</small></h3>` + CENSER_IDS.map((id) => { const used = C.on.some((x, i) => x === id && i !== this.censerSlot);
      return `<div class="row"><div class="grow"><b>${CENSERS[id].name}</b><div class="note">${CENSERS[id].text}</div><div class="note">시간당 ${fuel(id)} · 가진 것 ${have(id)}</div></div><button class="btn gold" data-con="${id}" ${used || C.on[this.censerSlot] === id ? 'disabled' : ''}>${used ? '피우는 중' : '피우기'}</button></div>`; }).join('');
    return [L, R];
  }
  // v0.50 원정 문장 상점: 오른쪽 물건(이번 주 산 수) → 왼쪽 정보 · 사기
  raidShop(st) {
    const rd = raidOf(st), emb = resCount(st, 'raid_emblem');
    if (!RAID_SHOP.some((g) => g.id === this.rshopSel)) this.rshopSel = RAID_SHOP[0].id;
    const nm = (g) => g.title ? `칭호 「${lordName(g.title)}」` : BASES[g.id].name;
    const left = (g) => g.once ? ((st.raidTitles || []).includes(g.title) ? 1 : 0) : g.lim - shopBought(rd, g);
    const R = `<h3>원정 문장 <span class="cnt">${emb}</span></h3>` + RAID_SHOP.map((g) => `<div class="row shopRow pick${g.id === this.rshopSel ? ' on' : ''}" data-rshop="${g.id}"><div class="cell shopIco">${g.title ? `<img src="${itemIcon({ base: 'raid_emblem' })}" alt="" />` : ico({ base: g.id, rarity: 'common' })}</div>
      <div class="grow"><b>${nm(g)}</b><div class="note">${g.once ? (left(g) ? '가짐' : '군주마다 한 번') : `이번 주 ${shopBought(rd, g)} / ${g.lim}${g.group ? ' (상자 합쳐)' : ''}`}</div></div><b class="goldTxt">${shopPrice(g, st)}</b></div>`).join('');
    const g = RAID_SHOP.find((x) => x.id === this.rshopSel), price = shopPrice(g, st);
    const can = emb >= price && (g.once ? !left(g) && (st.raidLords || {})[g.title] : left(g) > 0);
    const why = g.once && !(st.raidLords || {})[g.title] ? `${lordName(g.title)}을(를) 쓰러뜨려야 합니다` : g.once && left(g) ? '이미 가졌습니다' : !g.once && left(g) <= 0 ? '이번 주에 다 샀습니다' : emb < price ? '원정 문장이 모자랍니다' : '';
    const desc = g.title ? `<div class="nm">칭호 「${lordName(g.title)}」</div><div class="note">이름 옆에 보입니다</div>` : `<div class="nm">${BASES[g.id].name}</div><div>${BASES[g.id].text || ''}</div>`;
    const L = `<div class="forgeTop"><div class="cell forgeSlot">${g.title ? `<img src="${itemIcon({ base: 'raid_emblem' })}" alt="" />` : ico({ base: g.id, rarity: 'common' })}</div><div>${desc}</div></div>
      <div class="kv"><span>값</span><b>원정 문장 ${price}</b><span>가진 문장</span><b>${emb}</b></div>${why ? `<div class="bad">${why}</div>` : ''}
      <div class="btns forgeGo"><button class="btn gold big" data-rbuy="${g.id}" ${can ? '' : 'disabled'}>사기</button></div>`;
    return [L, R];
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
        <div class="btns" style="margin:0 0 6px"><button class="btn" data-mailbox="1">우편함</button><button class="btn" data-notices="1">공지 · 패치</button><button class="btn" data-tab="guide">가이드북</button></div>
        ${cloud.id ? '' : `<div class="setRow"><span>계정 연동</span><div class="opts"><input id="lnkId" style="width:7.5em" maxlength="20" placeholder="아이디" autocomplete="username" autocapitalize="off" /><input id="lnkPw" style="width:7.5em" type="password" maxlength="64" placeholder="비밀번호" autocomplete="new-password" /><button class="btn gold" data-link="register">가입</button><button class="btn" data-link="login">로그인</button><span class="note" id="lnkMsg"></span></div></div>`}
        <div class="setRow"><span>닉네임</span><div class="opts"><b>${esc(st.nick || '없음')}</b><button class="btn" data-nick="1">바꾸기</button></div></div>
        <div class="setRow"><span>캐릭터 그림</span><div class="opts faceOpts">${FACES.map(([k]) => `<button class="faceBtn${(st.look?.face || FACES[0][0]) === k ? ' on' : ''}" data-face="${k}"><img src="${faceClose({ face: k })}" alt="" /></button>`).join('')}</div></div>
        <div class="setRow"><span>배경음</span><div class="opts">${vol('music')}</div></div>
        <div class="setRow"><span>효과음</span><div class="opts">${vol('sfx')}</div></div>
        <div class="setRow"><span>어둠 · 조명</span><div class="opts">${onoff('shadows', set.shadows)}</div></div>
        <div class="setRow"><span>UI 전체 크기</span><div class="opts">${uiSlider('scale', 0.7, 1.4)}</div></div>
        <div class="setRow"><span>화면 확대</span><div class="opts">${uiSlider('zoom', 0.6, 1.6)}</div></div>
        <div class="setRow"><span>조이스틱 크기</span><div class="opts">${uiSlider('joy', 0.6, 1.6)}</div></div>
        <div class="setRow"><span>단추 크기</span><div class="opts">${uiSlider('btn', 0.6, 1.6)}</div></div>
        <div class="setRow"><span>단추 투명도</span><div class="opts">${uiSlider('alpha', 0.3, 1)}</div></div>
        <div class="setRow"><span>자동 사냥 스킬 세트</span><div class="opts"><button class="btn${set.autoSet === false ? '' : ' on'}" data-autoset="1">상황별 (보스 2 · 버프 3)</button><button class="btn${set.autoSet === false ? ' on' : ''}" data-autoset="0">지금 세트만</button></div></div>
        <div class="setRow"><span>휴대폰 스킬 배치</span><div class="opts"><button class="btn${set.skillLayout === 'grid' ? '' : ' on'}" data-qlay="ring">원형</button><button class="btn${set.skillLayout === 'grid' ? ' on' : ''}" data-qlay="grid">사각</button></div></div>
        <div class="setRow"><span>UI 위치</span><div class="opts"><button class="btn" data-uiedit="1">위치 편집</button><button class="btn" data-uireset="1">처음대로</button></div></div>
        <div class="setRow"><span>세계 단계</span><div class="opts">${TIER_NAMES.map((n, i) => `<button class="btn${(st.worldTier || 1) === i + 1 ? ' on' : ''}" data-tier="${i + 1}" ${i + 1 > (st.maxTier || 1) ? 'disabled' : ''}>${n}</button>`).join('')}</div></div>
        ${(st.maxTier || 1) >= 5 ? `<div class="setRow"><span>무간지옥 층</span><div class="opts"><button class="btn" data-mfloor="${(st.mugan || 1) - 1}" ${(st.mugan || 1) <= 1 ? 'disabled' : ''}>−</button><b style="min-width:4em;text-align:center">${Math.min(st.mugan || 1, st.muganMax || 1)}층</b><button class="btn" data-mfloor="${(st.mugan || 1) + 1}" ${(st.mugan || 1) >= (st.muganMax || 1) ? 'disabled' : ''}>+</button><button class="btn" data-mfloor="${st.muganMax || 1}">최고 ${st.muganMax || 1}층</button></div></div>` : ''}
        <div class="setRow"><span>타겟 고정</span><div class="opts">${onoff('targetLock', set.targetLock !== false)}</div></div>
        <div class="setRow"><span>떠다니는 조이스틱</span><div class="opts">${onoff('joyFloat', set.joyFloat !== false)}</div></div>
        <div class="setRow"><span>화면 흔들림</span><div class="opts">${onoff('shake', set.shake !== false)}</div></div>
        <div class="setRow"><span>수동 사냥 물약</span><div class="opts">${onoff('potManual', set.potManual !== false)}</div></div>
        <div class="setRow"><span>자동 물약</span><div class="opts">${[0.3, 0.4, 0.5, 0.6].map((v) => `<button class="btn${set.autoPotion === v ? ' on' : ''}" data-pot="${v}">${v * 100}%</button>`).join('')}</div></div>
        <div class="setRow"><span>자동 사냥 필드 보스</span><div class="opts"><button class="btn${set.autoBoss ? ' on' : ''}" data-autoboss="1">잡기</button><button class="btn${!set.autoBoss ? ' on' : ''}" data-autoboss="0">피하기</button></div></div>
        <div class="setRow pickRow"><span>자동 사냥 줍기</span><div class="pickGrid">${[['common', '일반'], ['magic', '마법'], ['rare', '희귀'], ['hero', '영웅'], ['legend', '전설'], ['potion', '물약'], ['gem', '보석'], ['mat', '재료 · 파편'], ...Object.entries(BOOK_TIERS).map(([t, b]) => ['book' + t, `${b.name} 스킬북`])].map(([k, n]) => `<label class="pickChk"><input type="checkbox" data-apick="${k}" ${((set.autoPick || {})[k] ?? (k.startsWith('book') ? (set.autoPick || {}).book : true)) !== false ? 'checked' : ''} /><span>${n}</span></label>`).join('')}</div></div>
        <div class="setRow"><span>물약 자동 구매</span><div class="opts">${onoff('autoBuy', set.autoBuy !== false)}</div></div>
        <div class="setRow"><span>자동 판매 등급</span><div class="opts">${[['off', '끔'], ['common', '일반'], ['magic', '마법'], ['rare', '희귀']].map(([k, n]) => `<button class="btn${(set.autoSell === false ? 'off' : set.autoSellTo || 'rare') === k ? ' on' : ''}" data-sellto="${k}">${n}</button>`).join('')}</div></div>
        <div class="setRow"><span>단축키 (PC)</span><div class="opts"><button class="btn${this.keyEdit ? ' on' : ''}" data-keyedit="1">단축키 지정</button></div></div>
        <div class="setRow"><span>전체 화면</span><div class="opts"><button class="btn" data-full="1">전환</button></div></div>
        <div class="setRow"><span>앱으로 설치</span><div class="opts">${matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ? '<span class="note">설치됨</span>' : window.__install ? '<button class="btn gold" data-install="1">설치</button>' : /iPhone|iPad/.test(navigator.userAgent) ? '<span class="note">공유 → 홈 화면에 추가</span>' : '<span class="note">브라우저 메뉴 → 앱 설치</span>'}</div></div>
        <div class="btns"><button class="btn" data-notes="1">패치 노트 ${GAME_VERSION}</button><button class="btn" data-save="1">지금 저장</button><button class="btn danger" data-reset="1">캐릭터 삭제</button></div>
      </div><div class="frame" style="flex:1">${this.keyEdit ? this.keysPanel() : ''}
        <div class="cards"${this.keyEdit ? ' hidden' : ''}>
          ${['inv', 'skills', 'char', 'quest'].map((k) => card(k, `<img src="${uiIcon(k)}" alt="" />`, { inv: '가방', skills: '스킬', char: '능력', quest: '퀘스트' }[k])).join('')}
        </div>
        <div class="kv" style="margin-top:14px"><span>플레이 시간</span><b>${Math.floor(t / 60)}시간 ${t % 60}분</b><span>각성</span><b>${st.awakenings}회</b>
          <span>배운 스킬</span><b>${Object.keys(st.skills).length}개</b><span>자동 사냥 효율</span><b>드랍 ${Math.round((CONFIG.autoDrop ?? 0.3) * 100)}% · 경험치 ${Math.round((CONFIG.autoExpPenalty ?? 0.45) * 100)}%</b>
          <span>자동 저장</span><b>${CONFIG.autosaveInterval}초</b>
          <span>그림</span><b>Flare (CC-BY-SA 3.0)</b>
          <span>서버 저장</span><b>${cloud.id ? `${esc(cloud.id)}${cloud.state === 'error' ? ' · 실패' : cloud.savedAt ? ' · 저장됨' : ''}` : '로그인 안 함'}</b></div>
      </div></div>`;
  }

  bind(body) {
    const w = this.w, st = w.st;
    const on = (sel, fn) => body.querySelectorAll(sel).forEach((el) => { el.onclick = () => fn(el); });
    // v0.45.2 되돌릴 수 없는 일은 게임 안 확인 창을 거친다: m(el) → [제목, 글, 예 글자, 그림 HTML] | null(묻지 않음)
    const ask = (sel, m, fn) => on(sel, async (el) => { const q = m(el); if (q) { audio.play('click'); if (!(await gameConfirm(q[0], q[1], q[2], q[3] || ''))) return; } fn(el); });
    const itemHtml = (it, sub = '') => `<div class="askItem">${ico(it)}<span style="color:${itemColor(it)}">${esc(itemName(it))}${sub ? `<br><small style="color:#c8c0b0">${sub}</small>` : ''}</span></div>`;
    const cheap = (it) => ['common', 'magic'].includes(it?.rarity) && !!BASES[it.base]?.slot; // v0.45.7 일반 · 마법 장비 한 개는 묻지 않는다
    const gemSub = (g) => `${STAT_NAMES[GEMS[BASES[g].gem].stat]} +${GEM_GRADES[BASES[g].grade].v}`;
    on('[data-uid]', (el) => {
      const uid = Number(el.dataset.uid);
      // 여러 개 팔기: 눌러서 고르기 · 풀기 (재료는 팔 수 없다)
      if (this.kind === 'shop' && this.sellPick) { const it = st.inv.find((x) => x.uid === uid); if (it && BASES[it.base]?.type !== 'mat') { const i = this.sellPick.indexOf(uid); if (i >= 0) this.sellPick.splice(i, 1); else this.sellPick.push(uid); audio.play('click'); } this.render(); return; }
      if (this.kind !== 'shop' && this.sel?.from === 'inv' && this.sel.uid === uid) { w.useItem(uid); this.sel = null; }
      else { this.sel = { from: 'inv', uid }; audio.play('click'); }
      this.render();
    });
    const sn = body.querySelector('#sellN');
    if (sn) sn.oninput = () => { const it = st.inv.find((x) => x.uid === this.sel?.uid); if (it) body.querySelector('#sellNv').textContent = `${sn.value}개 · ${itemValue({ ...it, qty: Number(sn.value) }).toLocaleString()}G`; };
    // v0.49.55 계정 연동 (게스트 · 로그인 안 한 캐릭터): 가입 · 로그인하면 이 캐릭터가 그 계정 서버 저장에 붙는다
    body.querySelectorAll('#lnkId, #lnkPw').forEach((el) => el.addEventListener('keydown', (e) => e.stopPropagation()));
    on('[data-link]', async (el) => {
      const id = body.querySelector('#lnkId').value.trim(), pw = body.querySelector('#lnkPw').value, msg = body.querySelector('#lnkMsg');
      audio.play('click'); msg.textContent = '…';
      const r = await cloud.sign(el.dataset.link, id, pw);
      if (!r.ok) { msg.textContent = cloudError(r.error); return; }
      await cloud.claim(st.cid);
      if (st.nick) { const n = await cloud.nick(st.cid, st.nick); if (n.ok) st.nickOk = true; else window.__askNick?.(cloudError(n.error)); }
      else window.__askNick?.();
      this.save?.(true); window.__chatRe?.();
      w.ui.toast(`계정 ${r.id}에 연동했습니다`, '#ffd84a'); audio.play('rankup');
      this.render();
    });
    on('[data-autoset]', (el) => { st.settings.autoSet = el.dataset.autoset === '1'; audio.play('click'); this.render(); });
    on('[data-qsetw]', (el) => { w.setQuickSet(Number(el.dataset.qsetw)); this.render(); }); // v0.50 스킬 창에서 세트 고르기
    on('[data-ringcmp]', (el) => { this.ringCmp = el.dataset.ringcmp; audio.play('click'); this.render(); });
    on('[data-eq]', (el) => { if (st.equip[el.dataset.eq]) { this.sel = { from: 'equip', slot: el.dataset.eq }; audio.play('click'); this.render(); } });
    on('[data-act]', async (el) => {
      const a = el.dataset.act;
      let nPick = null;
      { const it0 = st.inv.find((x) => x.uid === this.sel?.uid);
        if (it0 && !it0.lock && !cheap(it0) && ['drop', 'sell', 'sellall'].includes(a)) { const n0 = a === 'sellall' || !(it0.qty > 1) ? (it0.qty || 1) : Math.max(1, Math.min(it0.qty, Number(document.getElementById('sellN')?.value) || 1));
          audio.play('click');
          if (!(await gameConfirm(a === 'drop' ? '버리기' : '판매', a === 'drop' ? '바닥에 버립니다' : `${n0 > 1 ? `${n0}개 · ` : ''}${itemValue({ ...it0, qty: n0 }).toLocaleString()} G`, a === 'drop' ? '버리기' : '판매', itemHtml(it0)))) return;
          nPick = n0; } }
      if (a === 'use') w.useItem(this.sel.uid);
      if (a === 'useall') w.useItem(this.sel.uid, { all: true });
      if (a === 'unequip') w.unequip(this.sel.slot);
      const selIt = st.inv.find((x) => x.uid === this.sel?.uid);
      if (selIt?.lock && ['drop', 'sell', 'sellall'].includes(a)) { w.ui.toast('잠근 아이템입니다'); audio.play('error'); return; }
      if (a === 'drop') w.dropItem(this.sel.uid);
      if (a === 'sell' || a === 'sellall') {
        const i = st.inv.findIndex((x) => x.uid === this.sel.uid), it = st.inv[i];
        if (it) {
          // 쌓인 물건은 고른 개수만 판다
          const n = nPick != null ? Math.min(nPick, it.qty || 1) : a === 'sellall' || !(it.qty > 1) ? (it.qty || 1) : Math.max(1, Math.min(it.qty, Number(document.getElementById('sellN')?.value) || 1));
          const g = itemValue({ ...it, qty: n });
          if (it.qty > n) it.qty -= n; else st.inv.splice(i, 1);
          st.gold += g; w.ui.toast(`${itemName(it)}${n > 1 ? ` ×${n}` : ''} 판매: +${g.toLocaleString()}G`); audio.play('coin');
        }
        w.ui.dirty();
      }
      // 물약처럼 남아 있으면 계속 골라 둔다
      if (!((a === 'use' || a === 'useall') && st.inv.some((x) => x.uid === this.sel?.uid))) this.sel = null;
      this.render();
    });
    on('[data-skill]', (el) => { this.skillSel = el.dataset.skill; audio.play('click'); this.render(); });
    on('[data-qs]', (el) => {
      const i = Number(el.dataset.qs), id = this.skillSel, cur = st.quick.indexOf(id);
      if (i < 0) { if (cur >= 0) st.quick[cur] = null; this.skAssign = null; } // 빼기: 그 칸만 비운다
      else if (this.skAssign && id) { // 넣기 중: 고른 칸에 넣는다 (이미 다른 칸에 있으면 자리 바꾸기)
        if (cur >= 0) { const o = st.quick[i]; st.quick[i] = id; st.quick[cur] = o ?? null; } else st.quick[i] = id;
        this.skAssign = null; audio.play('click');
      } else if (st.quick[i]) { this.skillSel = st.quick[i]; audio.play('click'); this.render(); return; } // 그냥 누르면 그 칸의 스킬을 보여 준다
      else return;
      w.ui.dirty();
      this.render();
    });
    on('[data-mconv]', (el) => { const [z, n] = el.dataset.mconv.split('|'), r = convertMats(st, z, Number(n)); if (!r.ok) { w.ui.toast(r.why || '바꿀 수 없습니다'); audio.play('error'); } else audio.play('coin'); w.ui.dirty(); this.render(); });
    on('[data-hord]', (el) => { const r = herbDeliver(st, Number(el.dataset.hord)); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else { audio.play('coin'); w.ui.toast(`납품 · ${r.gold.toLocaleString()} G · ${BASES[r.ess].name} ${r.essN}`, '#ffd84a'); } w.ui.dirty(); this.render(); });
    on('[data-hfocus]', (el) => { const h = el.dataset.hfocus, F = [...(townOf(st).herbFocus || [])]; const i = F.indexOf(h); if (i >= 0) F.splice(i, 1); else { if (F.length >= 2) F.shift(); F.push(h); } setHerbFocus(st, F); audio.play('click'); this.render(); });
    on('[data-fert]', (el) => { const r = fertilize(st, el.dataset.fert); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else audio.play('buff'); w.ui.dirty(); this.render(); });
    on('[data-distill]', (el) => { const r = distill(st, el.dataset.distill); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else { audio.play('coin'); w.ui.toast(`${BASES[el.dataset.distill].name} +1`, '#ffd84a'); } w.ui.dirty(); this.render(); });
    on('[data-cslot]', (el) => { this.censerSlot = Number(el.dataset.cslot); audio.play('click'); this.render(); });
    on('[data-con]', (el) => { const r = censerSet(st, this.censerSlot || 0, el.dataset.con); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else audio.play('buff'); this.render(); });
    on('[data-coff]', (el) => { censerSet(st, Number(el.dataset.coff), null); audio.play('click'); this.render(); });
    on('[data-rshop]', (el) => { this.rshopSel = el.dataset.rshop; audio.play('click'); this.render(); });
    ask('[data-rbuy]', (el) => { const g = RAID_SHOP.find((x) => x.id === el.dataset.rbuy); return g ? ['원정 상점', `${g.title ? `칭호 「${lordName(g.title)}」` : BASES[g.id].name}을(를) 원정 문장 ${shopPrice(g, st)}에 삽니다`, '사기'] : null; }, (el) => {
      const g = RAID_SHOP.find((x) => x.id === el.dataset.rbuy), rd = raidOf(st), price = shopPrice(g, st);
      if (!g || resCount(st, 'raid_emblem') < price) return;
      if (g.once) { if ((st.raidTitles ||= []).includes(g.title) || !(st.raidLords || {})[g.title]) return; st.raidTitles.push(g.title); st.raidTitle = g.title; }
      else { if (g.lim - shopBought(rd, g) <= 0) return; const it = g.id.startsWith('box_') ? w.makeRaidBox(g.id, 2) : makeItem(g.id, { qty: 1 }, st); if (!addItem(st, it)) { w.ui.toast('가방이 가득 찼습니다'); return; } rd.buys[g.id] = (rd.buys[g.id] || 0) + 1; }
      resTake(st, 'raid_emblem', price); audio.play('coin'); w.ui.dirty(); this.render();
    });
    on('[data-whet]', () => { this.useWhet = !this.useWhet; audio.play('click'); this.render(); });
    on('[data-whet2]', () => { this.useWhet2 = !this.useWhet2; audio.play('click'); this.render(); });
    on('[data-ward]', () => { this.useWard = !this.useWard; audio.play('click'); this.render(); });
    on('[data-rush]', () => { const r = rushBuild(st, this.townSel); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else { audio.play('buff'); w.ui.toast('공사 시간이 절반으로 줄었습니다', '#ffd84a'); } w.ui.dirty(); this.render(); });
    on('[data-ihpick]', (el) => { this.ihPick = el.dataset.ihpick; audio.play('click'); this.render(); });
    on('[data-ihsel]', (el) => { if ((this.ihPick || 'src') === 'src') { this.ihSrc = el.dataset.ihsel; if (this.ihDst === this.ihSrc) this.ihDst = null; this.ihPick = 'dst'; } else { this.ihDst = el.dataset.ihsel; if (this.ihSrc === this.ihDst) this.ihSrc = null; } audio.play('click'); this.render(); });
    on('[data-ihticket]', () => { this.ihTicket = !this.ihTicket; audio.play('click'); this.render(); });
    ask('[data-ihgo]', () => { const src = gearAt(st, this.ihSrc); return ['강화 계승', `${src ? esc(itemName(src)) : ''}은(는) 사라집니다`, '계승']; }, () => {
      const k = this.ihSrc, src = gearAt(st, k), dst = gearAt(st, this.ihDst);
      const r = inherit(st, src, dst, !!this.ihTicket && countOf(st, 't_inherit2') > 0, () => { if (k.startsWith('e:')) st.equip[k.slice(2)] = null; else { const L = k.startsWith('v:') ? vault().items : st.inv, j = L.indexOf(src); if (j >= 0) L.splice(j, 1); } });
      if (!r.ok) { w.ui.toast(r.why); audio.play('error'); this.render(); return; }
      if (k.startsWith('v:') || this.ihDst.startsWith('v:')) vaultSave();
      this.ihSrc = null; this.ihPick = 'src'; audio.play('awaken'); w.refreshGear(); w.ui.dirty();
      this.forgeFx(true, dst, `+${r.plus} 계승`, [`<div><span>강화</span><b>+${r.before}</b><i class="arw">▶</i><em>+${r.plus}</em></div>`, `<div><span>녹인 장비</span><b>+${r.from}</b></div>`]);
      this.render();
    });
    on('[data-tsel]', (el) => { this.tuneSel = el.dataset.tsel; audio.play('click'); this.render(); });
    const tuneDone = (r, key, msg) => { if (!r?.ok) { if (r?.why) w.ui.toast(r.why); audio.play('error'); } else { if (String(key).startsWith('v:')) vaultSave(); audio.play('rankup'); if (msg) w.ui.toast(msg, '#ffd84a'); w.refreshGear(); w.ui.dirty(); } this.render(); };
    ask('[data-treroll]', () => ['옵션 다시 굴림', '이 옵션을 다른 옵션으로 바꿉니다', '굴리기'], (el) => { const [k, i] = el.dataset.treroll.split('|'), it = gearAt(st, k); const r = rerollAffix(st, it, Number(i)); tuneDone(r, k, r.ok ? `${affixText(r.before)} → ${affixText(r.after)}` : null); });
    ask('[data-tshard]', () => ['장비 파편 추출', '이 옵션을 파편으로 뽑습니다. 장비는 사라집니다', '뽑기'], (el) => { const [k, i] = el.dataset.tshard.split('|'), it = gearAt(st, k);
      const r = extractShard(st, it, Number(i), () => { const L = k.startsWith('v:') ? vault().items : st.inv, j = L.indexOf(it); if (j >= 0) L.splice(j, 1); }); if (r.ok) this.tuneSel = null; tuneDone(r, k, r.ok ? `파편: ${affixText(r.shard.shard)}` : null); });
    ask('[data-tsock]', () => ['구멍 뚫기', '보석 구멍을 하나 더 뚫습니다', '뚫기'], (el) => { const k = el.dataset.tsock; tuneDone(addSocket(st, gearAt(st, k)), k, '구멍을 뚫었습니다'); });
    ask('[data-teng]', (el) => ['각인 새기기', `${lordName(el.dataset.teng.split('|')[1])}: ${ENGRAVE[el.dataset.teng.split('|')[1]].text}`, '새기기'], (el) => { const [k, L] = el.dataset.teng.split('|'); tuneDone(engrave(st, gearAt(st, k), L), k, '각인을 새겼습니다'); });
    ask('[data-tstone]', () => ['각인석', '각인석을 이 장비에 새깁니다', '새기기'], (el) => { const [k, u] = el.dataset.tstone.split('|'); tuneDone(engrave(st, gearAt(st, k), null, Number(u)), k, '각인을 새겼습니다'); });
    ask('[data-tengx]', () => ['각인 추출', '각인을 떼어 각인석으로 만듭니다', '추출'], (el) => { const k = el.dataset.tengx; tuneDone(extractEngrave(st, gearAt(st, k)), k, '각인석을 얻었습니다'); });
    on('[data-raidg]', (el) => { this.raidG = Number(el.dataset.raidg); audio.play('click'); this.render(); });
    on('[data-raidgo]', (el) => { const g = Number(el.dataset.raidgo); this.close(); w.enterRaid(g); });
    on('[data-horde]', () => { if (this.townMode !== 'build') return; this.close(); w.enterHorde(); });
    on('[data-skassign]', () => { this.skAssign = this.skAssign ? null : this.skillSel; audio.play('click'); this.render(); });
    on('[data-skline]', (el) => { this.skillLine = el.dataset.skline; this.skAssign = null; audio.play('click'); this.render(); });
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
    on('[data-autoboss]', (el) => { st.settings.autoBoss = el.dataset.autoboss === '1'; audio.play('click'); this.render(); });
    on('[data-pot]', (el) => { st.settings.autoPotion = Number(el.dataset.pot); audio.play('click'); this.render(); });
    on('[data-sellto]', (el) => { const k = el.dataset.sellto; st.settings.autoSell = k !== 'off'; if (k !== 'off') st.settings.autoSellTo = k; audio.play('click'); this.render(); });
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
    on('[data-qlay]', (el) => { st.settings.skillLayout = el.dataset.qlay; applyUi(st); audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-uiedit]', () => { this.close(); editUi(st, () => w.ui.toast('UI 위치를 저장했습니다')); });
    on('[data-uireset]', () => { st.settings.ui = undefined; applyUi(st); this.render(); });
    on('[data-plot]', (el) => { this.townSel = el.dataset.plot; audio.play('click'); this.render(); });
    // v0.49.13 분해 결과 팝업: 분해한 수 · 강화석 · 지역 재료 · 능력치 파편 (한 개든 여러 개든)
    const salvReport = (rs) => {
      const ok = rs.filter((r) => r?.ok); if (!ok.length) return;
      const ore = ok.reduce((a, r) => a + (r.ore || 0), 0), mats = {}; for (const r of ok) mats[r.mat] = (mats[r.mat] || 0) + (r.matN || 0);
      const shards = ok.filter((r) => r.shard).map((r) => r.shard);
      const html = `<div class="kv tight" style="margin:6px 0"><span>분해한 장비</span><b>${ok.length}개</b><span>강화석</span><b>${ore.toLocaleString()}</b>${Object.entries(mats).map(([k, n]) => `<span>${esc(MATERIALS[k]?.name || k)}</span><b>${n.toLocaleString()}</b>`).join('')}</div>`
        + (shards.length ? `<div class="note" style="margin-top:6px">능력치 파편 ${shards.length}개</div>` + shards.map((x) => `<div class="aff" style="color:#c58cff">${esc(affixText(x.shard))}</div>`).join('') : '');
      this.popup('분해 결과', html, false);
    };
    const townDone = (r, okMsg) => { if (!r?.ok) { if (r?.why) w.ui.toast(r.why); audio.play('error'); } else { if (okMsg) w.ui.toast(okMsg, '#ffd84a'); w.refreshTown(); w.ui.dirty(); } this.render(); };
    ask('[data-build]', (el) => ['건물 짓기', `${BUILDINGS[el.dataset.build].name}을(를) 짓습니다`, '짓기'], (el) => { const r = build(st, this.townSel || PLOTS[0].id, el.dataset.build); if (r.ok) audio.play('rankup'); townDone(r, `${BUILDINGS[el.dataset.build].name}을(를) 지었습니다`); });
    ask('[data-upgrade]', () => ['건물 강화', '다음 단계로 올립니다', '올리기'], () => { const r = upgrade(st, this.townSel); if (r.ok) audio.play('rankup'); townDone(r, '단계를 올렸습니다'); });
    on('[data-collect]', () => { const r = collect(st, this.townSel); if (r?.n) { audio.play('coin'); w.ui.toast(r.got ? `약초: ${Object.entries(r.got).map(([h, q]) => `${HERBS[h].name} ${q}`).join(' · ')}` : `${r.what} ${r.n}개를 거뒀습니다${r.o2 ? ` · 상급 ${r.o2}` : ''}${r.o3 ? ` · 최상급 ${r.o3}` : ''}`, '#7fe07a'); } w.ui.dirty(); this.render(); });
    on('[data-enh]', (el) => {
      const it = gearAt(st, el.dataset.enh), b0 = BASES[it.base], before = b0.dmg ? scaledDmg(it).join('~') : b0.armor ? scaledArmor(it) : null, p0 = it.plus || 0;
      const affA = (it.affixes || []).map((a) => affixText({ ...a, v: affixV(it, a) })); // v0.49.59 장신구 옵션 바뀐 값
      const r = enhance(st, it, Math.random, !!this.useWhet, { whet2: !!this.useWhet2, ward: !!this.useWard }); if (el.dataset.enh.startsWith('v:')) vaultSave();
      if (!r.ok) { w.ui.toast(r.why); audio.play('error'); }
      else if (r.success) {
        audio.play('awaken'); w.fx.pillar(w.player.pos.x, w.player.pos.z, 0xffd060, 0.8); w.refreshGear();
        const after = b0.dmg ? scaledDmg(it).join('~') : b0.armor ? scaledArmor(it) : null, nm = b0.dmg ? (WEAPON_CLASSES[b0.cls]?.kind === 'magic' ? '마법 공격력' : '물리 공격력') : '방어력';
        this.forgeFx(true, it, `+${r.plus} 강화 성공`, [`<div><span>강화</span><b>+${p0}</b><i class="arw">▶</i><em>+${r.plus}</em></div>`, ...(before != null ? [`<div><span>${nm}</span><b>${before}</b><i class="arw">▶</i><em>${after}</em></div>`] : []), ...(affixK(it) > 1 ? (it.affixes || []).map((a, k) => `<div><b>${esc(affA[k])}</b><i class="arw">▶</i><em>${esc(affixText({ ...a, v: affixV(it, a) }))}</em></div>`) : [])]);
      } else { audio.play('error'); this.forgeFx(false, it, '강화 실패', [`<div><span>장인의 기운</span><em>${+((r.jang || 0) * 100).toFixed(1)}%</em></div>`]); }
      w.ui.dirty(); this.render();
    });
    on('[data-mythlv]', (el) => { const mx = mythLvMax(st); globalThis.__mythLv = Math.max(10, Math.min(mx, (globalThis.__mythLv ?? mx) + Number(el.dataset.mythlv))); audio.play('click'); this.render(); });
    ask('[data-mythcraft]', () => ['신화 제작', '신화 장비를 만듭니다', '제작'], () => { const r = craftMyth(st, Math.random, globalThis.__mythLv); if (r.ok) { audio.play('awaken'); w.fx.pillar(w.player.pos.x, w.player.pos.z, 0xff4a8a, 3, 8, 2.5); } townDone(r, r.ok ? `${itemName(r.item)}을(를) 얻었습니다` : null); });
    on('[data-keycraft]', (el) => { const r = craftKey(st, el.dataset.keycraft); if (r.ok) audio.play('rankup'); townDone(r, `${BASES[el.dataset.keycraft].name}을(를) 만들었습니다`); });
    on('[data-esscraft]', (el) => { const [rid, n] = el.dataset.esscraft.split('|'); const r = craftEss(st, rid, Number(n)); if (r.ok) audio.play('coin'); townDone(r, r.ok ? `${BASES[r.id].name} ${r.n}개를 얻었습니다` : null); });
    on('[data-orecraft]', (el) => { const [id, n] = el.dataset.orecraft.split('|'); const r = craftOre(st, id, Number(n)); if (r.ok) audio.play('rankup'); townDone(r, `${BASES[id].name} ${n}개를 만들었습니다`); });
    ask('[data-hirem]', () => ['고용', '이 용병을 고용합니다', '고용'], (el) => townDone(hire(st, el.dataset.hirem), '용병을 고용했습니다'));
    on('[data-mwork]', (el) => { const [id, pl] = el.dataset.mwork.split('|'); townDone(assignMerc(st, id, pl || null)); });
    ask('[data-mawk]', () => ['용병 각성', '이 용병을 각성합니다', '각성'], (el) => { const r = awakenMerc(st, el.dataset.mawk); if (r.ok) audio.play('awaken'); townDone(r, '용병이 각성했습니다'); });
    ask('[data-mfire]', () => ['용병 내보내기', '이 용병을 내보냅니다. 되돌릴 수 없습니다', '내보내기'], (el) => townDone(dismiss(st, el.dataset.mfire)));
    on('[data-tier]', (el) => { w.setTier(Number(el.dataset.tier)); this.render(); });
    on('[data-mfloor]', (el) => { w.setMuganFloor(Number(el.dataset.mfloor)); this.render(); });
    on('[data-travel]', (el) => { this.portalAt = null; this.mapZoom = null; this.close(); w.travel(el.dataset.travel); });
    on('[data-mzoom]', (el) => { const Z = [1, 1.6, 2.4, 3.2], i = Math.max(0, Math.min(Z.length - 1, Z.indexOf(this.mapZoom || 1) + Number(el.dataset.mzoom))); this.mapZoom = Z[i]; this.mapCenter = true; audio.play('click'); this.render(); });
    on('[data-camp]', (el) => { const [z, what] = el.dataset.camp.split('|'); const r = w.buildCamp(z, what); if (!r.ok && r.why) w.ui.toast(r.why); w.ui.dirty(); this.render(); });
    ask('[data-salvage]', (el) => { const raw = String(el.dataset.salvage), it = gearAt(st, raw.startsWith('v:') ? raw : 'b:' + raw); return it && !cheap(it) ? ['분해', '되돌릴 수 없습니다', '분해', itemHtml(it)] : null; }, (el) => { const raw = el.dataset.salvage, r = salvage(st, Number(String(raw).replace('v:', '')), String(raw).startsWith('v:')); if (r.ok) { audio.play('coin'); salvReport([r]); } townDone(r); });
    // v0.45.5 등급을 골라 한꺼번에 분해 (가방, 잠근 장비 제외)
    on('[data-salvageall]', async () => {
      const can = (x) => !x.book && !x.lock && BASES[x.base]?.slot;
      const cnt = (r) => st.inv.filter((x) => can(x) && x.rarity === r).length;
      const opts = RARITY_IDS.map((r) => ({ key: r, label: RARITY[r].name, color: RARITY[r].color, sub: `${cnt(r)}개`, on: ['common', 'magic'].includes(r), off: !cnt(r) }));
      if (!opts.some((o) => !o.off)) { w.ui.toast('분해할 장비가 없습니다'); audio.play('error'); return; }
      audio.play('click');
      const pick = await gamePick('등급별 분해', opts, '분해', '가방의 고른 등급 장비를 모두 분해합니다'); if (!pick?.length) return;
      const rs = []; for (const x of [...st.inv]) if (can(x) && pick.includes(x.rarity)) rs.push(salvage(st, x.uid));
      audio.play('coin'); salvReport(rs); townDone({ ok: true }); });
    on('[data-stab]', (el) => { const [k, v] = el.dataset.stab.split('|'); (this.bTab ||= {})[k] = v; audio.play('click'); this.render(); });
    on('[data-labsel]', (el) => { this.labSel = el.dataset.labsel; audio.play('click'); this.render(); });
    on('[data-innsel]', (el) => { this.innSel = el.dataset.innsel; audio.play('click'); this.render(); });
    on('[data-shopsel]', (el) => { this.shopSel = el.dataset.shopsel; audio.play('click'); this.render(); });
    on('[data-gmsel]', (el) => { this.gemMerge = el.dataset.gmsel; audio.play('click'); this.render(); });
    on('[data-mside]', (el) => { this.mercSide = el.dataset.mside; audio.play('click'); this.render(); });
    on('[data-rsel]', (el) => { this.rumorSel = el.dataset.rsel; audio.play('click'); this.render(); });
    { const mn = body.querySelector('#mapN'); if (mn) mn.oninput = () => { this.mapN = Number(mn.value); const lab = body.querySelector('#mapNv'); if (lab) { const ms = analyzeTime(st, this.mapN), m = Math.max(1, Math.ceil(ms / 60000)), h = Math.floor(m / 60); lab.textContent = `${this.mapN}장 · ${h ? `${h}시간 ${m % 60}분` : `${m}분`}`; } const g = body.querySelector('[data-mapan="n"]'); if (g) g.textContent = `${this.mapN}장 분석`; }; }
    on('[data-mapq]', (el) => { this.mapN = Number(el.dataset.mapq); audio.play('click'); this.render(); });
    on('[data-mapan]', (el) => { const n = el.dataset.mapan === 'all' ? 1e9 : el.dataset.mapan === 'n' ? Math.max(1, Number(body.querySelector('#mapN')?.value) || this.mapN || 1) : 1; const r = analyzeStart(st, n); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else audio.play('click'); w.ui.dirty(); this.render(); });
    ask('[data-rup]', (el) => { const r = rumorsOf(st).find((x) => x.id === el.dataset.rup); return r ? ['지도 강화', `${rumorName(r)} → +${(r.plus || 0) + 1}\n입구 자리가 새로 정해집니다`, '강화'] : null; }, (el) => { const r = rumorUpgrade(st, el.dataset.rup); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else { audio.play('rankup'); w.ui.toast(`지도 강화 +${r.plus}`, '#ffd060'); } w.ui.dirty(); this.render(); });
    // v0.49.11 파편 정리: 옵션 종류를 골라 가방 · 창고에서 모두 버린다 (잠근 것은 남김)
    on('[data-shardclean]', async () => {
      const all = [...st.inv, ...vault().items].filter((x) => x?.shard && !x.lock), by = {};
      for (const x of all) { const k = x.shard.id; by[k] = (by[k] || 0) + shardVals(x).length; }
      const ids = Object.keys(by); if (!ids.length) { w.ui.toast('정리할 파편이 없습니다'); return; }
      audio.play('click');
      const pick = await gamePick('파편 정리', ids.map((id) => ({ key: id, label: AFFIXES[id].text.replace(/\s*[+-]?\{v\}%?/, '').trim(), sub: `${by[id]}개`, on: false })), '버리기', '고른 능력치 파편을 가방 · 창고에서 모두 버립니다');
      if (!pick?.length) return;
      let n = 0; const drop = (list) => { for (let i = list.length - 1; i >= 0; i--) { const x = list[i]; if (x?.shard && !x.lock && pick.includes(x.shard.id)) { n += shardVals(x).length; list.splice(i, 1); } } };
      drop(st.inv); if (vaultReady()) { drop(vault().items); vaultSave(); }
      audio.play('click'); w.ui.toast(`파편 ${n}개를 버렸습니다`); w.ui.dirty(); this.render();
    });
    ask('[data-shkeep]', (el) => { const it = [...st.inv, ...vault().items].find((x) => x?.uid === Number(el.dataset.shkeep)); return it?.vals ? ['파편 정리', `가장 높은 값 하나만 남기고 ${it.vals.length - 1}개를 버립니다`, '버리기'] : null; }, (el) => { const u = Number(el.dataset.shkeep), it = [...st.inv, ...vault().items].find((x) => x?.uid === u); if (!it?.vals) return; const n = it.vals.length - 1; it.vals = [it.vals[0]]; delete it.vals; if (vault().items.includes(it)) vaultSave(); audio.play('click'); w.ui.toast(`나머지 ${n}개를 버렸습니다`); w.ui.dirty(); this.render(); });
    on('[data-salvr]', (el) => { this.salvR = el.dataset.salvr || null; this.salvSel = null; audio.play('click'); this.render(); });
    on('[data-salvsrc]', (el) => { this.salvSrc = el.dataset.salvsrc; this.salvSel = null; audio.play('click'); this.render(); });
    on('[data-shopsrc]', (el) => { this.shopSrc = el.dataset.shopsrc; this.vSel = null; this.vPick = null; this.sellPick = null; this.sel = null; audio.play('click'); this.render(); });
    on('[data-vshop]', (el) => { const u = Number(el.dataset.vshop);
      if (this.vPick) { const it = vault().items.find((x) => x?.uid === u); if (it && !it.lock && BASES[it.base]?.type !== 'mat') { const i = this.vPick.indexOf(u); if (i >= 0) this.vPick.splice(i, 1); else this.vPick.push(u); } }
      else this.vSel = u; audio.play('click'); this.render(); });
    const vSellWhere = (f) => { if (!vaultReady()) { w.ui.toast('창고를 불러오는 중입니다'); return; } let g = 0, n = 0; const V = vault().items;
      for (let i = V.length - 1; i >= 0; i--) { const it = V[i]; if (!it || it.lock || !f(it)) continue; g += itemValue(it); n++; V.splice(i, 1); }
      if (n) { vaultSave(); st.gold += g; audio.play('coin'); w.ui.toast(`${n}개 판매: +${g.toLocaleString()}G`, '#ffd84a'); } this.vPick = null; this.vSel = null; w.ui.dirty(); this.render(); };
    const isJunk = (it) => !it.book && BASES[it.base]?.slot && !it.set && ['common', 'magic'].includes(it.rarity);
    ask('[data-vpick]', (el) => (el.dataset.vpick !== 'go' || !this.vPick?.length ? null : ['판매', `창고에서 고른 아이템 ${this.vPick.length}개를 팝니다`, '판매']), (el) => {
      const a = el.dataset.vpick; if (a === 'on') { this.vPick = []; this.vSel = null; } else if (a === 'off') this.vPick = null; else { const P = this.vPick || []; return vSellWhere((it) => P.includes(it.uid)); } audio.play('click'); this.render(); });
    ask('[data-vselljunk]', () => ['일괄 판매', '창고의 일반 · 마법 장비를 모두 팝니다', '판매'], () => vSellWhere(isJunk));
    on('[data-popclose]', () => { this.sel = null; this.vsel = null; audio.play('click'); this.render(); });
    on('[data-gmergeall]', async () => {
      const have = [...new Set([...st.inv, ...vault().items].filter((x) => BASES[x?.base]?.type === 'gem').map((x) => x.base))].map((base) => ({ base, qty: resCount(st, base) }));
      // v0.45.5 합칠 등급을 고른다 (등급마다 합칠 횟수 · 금화 · 성공 확률)
      { const per = GEM_GRADES.map((G, k) => { if (k + 1 >= GEM_GRADES.length) return null; let n = 0; for (const x of have) if (BASES[x.base].grade === k) n += Math.floor(x.qty / 3); return n; });
        const opts = per.map((n, k) => (n == null ? null : { key: k, label: `${GEM_GRADES[k + 1].pre || "보통"} 만들기`, sub: `${n}번 · ${Math.round(mergeChance(k) * 100)}%`, on: n > 0, off: !n })).filter(Boolean);
        if (!opts.some((o) => !o.off)) { w.ui.toast('합칠 보석이 없습니다'); audio.play('error'); return; }
        audio.play('click');
        const pick = await gamePick('등급별 합치기', opts, '합치기', '실패하면 보석을 잃을 수 있습니다'); if (!pick?.length) return;
        for (let i = have.length - 1; i >= 0; i--) if (!pick.includes(BASES[have[i].base].grade)) have.splice(i, 1); }
      let ok = 0, fail = 0, lost = 0, gold = 0; const made = {};
      for (const x of have) { const b = BASES[x.base]; if (b.grade + 1 >= GEM_GRADES.length) continue; const cost = mergeCost(b.grade), nid = gemId(b.gem, b.grade + 1);
        for (let k = Math.floor(x.qty / 3); k > 0; k--) { if (st.gold < cost || resCount(st, x.base) < 3) break; st.gold -= cost; gold += cost;
          if (Math.random() < mergeChance(b.grade)) { resTake(st, x.base, 3); resAdd(st, nid, 1); made[nid] = (made[nid] || 0) + 1; ok++; } else { const l = Math.floor(Math.random() * 3); resTake(st, x.base, l); lost += l; fail++; } } }
      if (!ok && !fail) { w.ui.toast('합칠 보석이 없습니다'); audio.play('error'); return; }
      audio.play('rankup');
      this.popup('등급별 합치기', `<div class="kv"><span>성공</span><b>${ok}번</b><span>실패</span><b>${fail}번 · ${lost}개 잃음</b><span>금화</span><b>${gold.toLocaleString()} G</b></div>` + Object.entries(made).map(([id, n]) => `<div class="aff" style="color:#c0b0ff">${BASES[id].name} +${n}</div>`).join(''));
      w.ui.dirty(); this.render();
    });
    on('[data-expdrop]', (el) => { const [r, v] = el.dataset.expdrop.split('|'), t = townOf(st); (t.expDrop ||= {})[r] = v === '1'; audio.play('click'); this.render(); });
    on('[data-junk]', async (el) => { const r = el.dataset.junk, nm = { potion: '물약', common: '일반 장비', magic: '마법 장비', rare: '희귀 장비', hero: '영웅 장비', legend: '전설 장비', myth: '신화 장비' }[r];
      if (!(await gameConfirm('버리기', `가방 · 창고의 ${nm}을(를) 모두 버립니다. 되돌릴 수 없습니다`, '버리기'))) return; const n = discardJunk(st, r); audio.play('click'); w.ui.toast(`${nm} ${n}개를 버렸습니다`); w.ui.dirty(); this.render(); });
    on('[data-esel]', (el) => { this.enhSel = el.dataset.esel; audio.play('click'); this.render(); });
    on('[data-vsalv]', (el) => { this.salvSel = el.dataset.vsalv; audio.play('click'); this.render(); });
    on('[data-shard]', (el) => { const u = el.dataset.shard; this.shardSel = this.shardSel === u ? null : u; this.shardLocks = []; audio.play('click'); this.render(); });
    on('[data-starget]', (el) => { this.shardTarget = el.dataset.starget; this.shardLocks = []; audio.play('click'); this.render(); });
    on('[data-slock]', (el) => { const k = Number(el.dataset.slock), L = this.shardLocks ||= []; const i = L.indexOf(k); if (i >= 0) L.splice(i, 1); else L.push(k); audio.play('click'); this.render(); });
    ask('[data-sapply]', () => { const it = gearAt(st, this.shardTarget); if (!it) return null; const sh = shardEntries(st).find((x) => x.key === this.shardSel)?.shard, Lk = this.shardLocks || [], same = sh ? it.affixes.findIndex((a) => a.id === sh.id) : -1;
      const risk = sh && !sh.great && (same >= 0 ? it.affixes[same].great : it.affixes.some((a, i) => a.great && !Lk.includes(i))); // v0.49.84 일반 파편이 탁월 줄을 덮을 수 있으면 알린다
      return ['파편 쓰기', risk ? '옵션이 바뀝니다\n탁월 줄이 바뀌면 탁월이 사라집니다 (칸은 남습니다)' : '옵션이 바뀝니다', '쓰기', itemHtml(it)]; }, () => {
      const it = gearAt(st, this.shardTarget);
      const sm = Object.values(townOf(st).plots).find((q) => q.type === 'smithy');
      const [su, sv] = String(this.shardSel || '').split('|').map(Number), r = applyShard(st, it, su, this.shardLocks || [], sm?.lv || 0, Math.random, sv || 0); if (r.ok && String(this.shardTarget).startsWith('v:')) vaultSave();
      if (r.ok) {
        audio.play('rankup'); this.shardSel = null; w.refreshGear();
        this.forgeFx(true, it, '제련 성공', [`<div><b style="opacity:.6"><s>${affixText(r.old)}</s></b><i class="arw">▶</i><em style="color:#c58cff">${affixText(r.now)}</em></div>`]);
      }
      townDone(r);
    });
    on('[data-ascroll]', (el) => { const a = ((st.settings ||= {}).autoScroll ||= {}), id = el.dataset.ascroll; if (a[id]) delete a[id]; else a[id] = true; audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-pslot]', (el) => { const [k, base] = el.dataset.pslot.split('|'); (st.potSlot ||= {})[k] = base || null; audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-vsel]', (el) => { const [f, k0] = el.dataset.vsel.split('|'), k = Number(k0); let v = this.vsel; if (!v || v.from !== f) v = this.vsel = { from: f, keys: [] }; const i = v.keys.indexOf(k); if (i >= 0) v.keys.splice(i, 1); else v.keys.push(k); if (!v.keys.length) this.vsel = null; audio.play('click'); this.render(); });
    on('[data-vall]', (el) => { const f = el.dataset.vall; this.vsel = { from: f, keys: f === 'v' ? vault().items.map((_, i) => i) : st.inv.map((x) => x.uid) }; if (!this.vsel.keys.length) this.vsel = null; audio.play('click'); this.render(); });
    on('[data-vclear]', () => { this.vsel = null; audio.play('click'); this.render(); });
    on('[data-vcat]', (el) => { // 그 종류를 한꺼번에: 가방 → 창고 / 창고 → 가방
      const [from, cat] = el.dataset.vcat.split('|'); let moved = 0, why = '';
      if (from === 'b') { for (const it of st.inv.filter((x) => !x.lock && vcatOf(x) === cat)) { const r = vaultPut(st, it.uid); if (r.ok) moved++; else { why = r.why || why; break; } } }
      else { const V = vault().items; for (let i = V.length - 1; i >= 0; i--) { if (V[i]?.lock || vcatOf(V[i]) !== cat) continue; const r = vaultTake(st, i); if (r.ok) moved++; else { why = r.why || why; break; } } }
      this.vsel = null; audio.play(moved ? 'click' : 'error');
      w.ui.toast(`${VCATS.find((x) => x[0] === cat)[1]} ${moved}칸을 ${from === 'b' ? '창고에 넣었습니다' : '가방으로 옮겼습니다'}${why ? ` · ${why}` : ''}`); w.ui.dirty(); this.render();
    });
    on('[data-vmove]', () => {
      const v = this.vsel; if (!v) return; let moved = 0, why = '';
      if (v.from === 'v') for (const k of [...v.keys].sort((a, b) => b - a)) { const r = vaultTake(st, k); if (r.ok) moved++; else { why = r.why || why; } } // 뒤 칸부터 빼야 번호가 밀리지 않는다
      else for (const u of v.keys) { const r = vaultPut(st, u); if (r.ok) moved++; else { why = r.why || why; } }
      this.vsel = null; audio.play(moved ? 'click' : 'error'); if (why) w.ui.toast(`${moved}개 옮김 · ${why}`); w.ui.dirty(); this.render();
    });
    on('[data-vput]', (el) => { const r = vaultPut(st, Number(el.dataset.vput)); if (!r.ok && r.why) { w.ui.toast(r.why); audio.play('error'); } else audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-vtake]', (el) => { const r = vaultTake(st, Number(el.dataset.vtake)); if (!r.ok && r.why) { w.ui.toast(r.why); audio.play('error'); } else audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-notes]', () => showNotes());
    ask('[data-research]', () => ['연구', '연구를 시작합니다', '시작'], (el) => townDone(researchStart(st, el.dataset.research), '연구를 시작했습니다'));
    on('[data-mgear]', (el) => this.mercGearPick(el.dataset.mgear));
    on('[data-school]', (el) => { this.skillSchool = el.dataset.school; this.skillSel = null; audio.play('click'); this.render(); });
    on('[data-gsel]', (el) => { this.gemSel = el.dataset.gsel; audio.play('click'); this.render(); });
    const gemItem = (key) => gearAt(st, key);
    ask('[data-gmerge]', (el) => { const b = BASES[el.dataset.gmerge]; return ['보석 합치기', `${b.name} 3개 · 금화 ${mergeCost(b.grade).toLocaleString()} G · 성공 ${Math.round(mergeChance(b.grade) * 100)}%\n실패하면 보석을 잃을 수 있습니다`, '합치기', itemHtml({ base: el.dataset.gmerge })]; }, (el) => {
      const id = el.dataset.gmerge, b = BASES[id], cost = mergeCost(b.grade); if (resCount(st, id) < 3 || st.gold < cost) return;
      st.gold -= cost;
      if (Math.random() < mergeChance(b.grade)) { resTake(st, id, 3); const nid = gemId(b.gem, b.grade + 1); addItem(st, makeItem(nid, { qty: 1 }, st)); audio.play('rankup'); this.popup('합치기 성공', `<div class="aff" style="color:#c0b0ff">${BASES[nid].name}</div>`); }
      else { const lost = Math.floor(Math.random() * 3); resTake(st, id, lost); audio.play('error'); this.popup('합치기 실패', `<div class="aff">${b.name} ${lost}개를 잃었습니다</div>`); } // 실패: 0~2개가 사라진다
      w.ui.dirty(); this.render();
    });
    ask('[data-gput]', (el) => { const i = el.dataset.gput.lastIndexOf('|'), it = gearAt(st, el.dataset.gput.slice(0, i)), g = el.dataset.gput.slice(i + 1); return it ? ['보석 끼우기', `${itemName(it)}에 끼웁니다`, '끼우기', itemHtml({ base: g }, gemSub(g))] : null; }, (el) => { const i = el.dataset.gput.lastIndexOf('|'), key = el.dataset.gput.slice(0, i), id = el.dataset.gput.slice(i + 1), it = gemItem(key); if (!it || it.gems.length >= it.sockets || resCount(st, id) < 1) return; resTake(st, id, 1); it.gems.push(id); if (key.startsWith('v:')) vaultSave(); audio.play('rankup'); w.refreshGear(); w.ui.dirty(); this.render(); });
    ask('[data-gpull]', (el) => { const i = el.dataset.gpull.lastIndexOf('|'), it = gearAt(st, el.dataset.gpull.slice(0, i)), g = it?.gems[Number(el.dataset.gpull.slice(i + 1))]; return g ? ['보석 빼기', `금화 ${pullCost(g).toLocaleString()} G`, '빼기', itemHtml({ base: g }, gemSub(g))] : null; }, (el) => { const i = el.dataset.gpull.lastIndexOf('|'), key = el.dataset.gpull.slice(0, i), k = Number(el.dataset.gpull.slice(i + 1)), it = gemItem(key), g = it?.gems[k]; if (!g) return; const c = pullCost(g); if (st.gold < c) { w.ui.toast('금화가 모자랍니다'); return; } st.gold -= c; it.gems.splice(k, 1); if (key.startsWith('v:')) vaultSave(); addItem(st, makeItem(g, { qty: 1 }, st)); audio.play('click'); w.refreshGear(); w.ui.dirty(); this.render(); });
    ask('[data-var]', () => ['스킬 변형', '한 번 고르면 바꿀 수 없습니다', '고르기'], (el) => { const s = st.skills[this.skillSel]; if (!s) return; const [r, k] = el.dataset.var.split('|'); if (s.rank < +r || s.mod?.[r]) return; (s.mod ||= {})[r] = k; audio.play('rankup'); w.ui.dirty(); this.render(); });
    ask('[data-repick]', () => ['특성 다시 고르기', '금화를 내고 특성을 다시 고릅니다', '고르기'], (el) => {
      const t = st.titles[Number(el.dataset.repick)], cost = repickCost(t);
      if (st.gold < cost) return;
      w.ui.titlePick({ tier: t.tier, key: t.key, name: t.name, choices: perkChoices(t.key, t.tier, (st.titles || []).filter((x) => x !== t).map((x) => x.perk?.eff)) }, (perk) => { st.gold -= cost; t.perk = perk; w.ui.toast(`${t.name}: ${perk.text}`, '#ffd860'); w.ui.dirty(); this.render(); });
    });
    on('[data-lock]', (el) => {
      const u = Number(el.dataset.lock), it = st.inv.find((x) => x.uid === u) || Object.values(st.equip).find((x) => x?.uid === u) || vault().items.find((x) => x?.uid === u);
      if (!it) return; it.lock = !it.lock; if (vault().items.includes(it)) vaultSave();
      audio.play('click'); w.ui.toast(it.lock ? '잠갔습니다' : '잠금을 풀었습니다'); w.ui.dirty(); this.render();
    });
    // v0.45 창고 아이템도 상점에서 판다
    ask('[data-vsell]', (el) => { const it = vault().items.find((x) => x?.uid === Number(el.dataset.vsell)); return it && !it.lock && !cheap(it) ? ['판매', `${itemValue(it).toLocaleString()} G`, '판매', itemHtml(it)] : null; }, (el) => {
      if (!vaultReady()) { w.ui.toast('창고를 불러오는 중입니다'); return; }
      const V = vault().items, i = V.findIndex((x) => x?.uid === Number(el.dataset.vsell)), it = V[i]; if (!it) return;
      if (it.lock) { w.ui.toast('잠근 아이템입니다'); audio.play('error'); return; }
      const g = itemValue(it); V.splice(i, 1); vaultSave(); st.gold += g; w.ui.toast(`${itemName(it)} 판매: +${g.toLocaleString()}G`); audio.play('coin'); this.vSel = null; w.ui.dirty(); this.render();
    });
    ask('[data-sellpick]', (el) => (['on', 'off'].includes(el.dataset.sellpick) || !this.sellPick?.length ? null : ['판매', `고른 아이템 ${this.sellPick.length}개를 팝니다`, '판매']), (el) => {
      const a = el.dataset.sellpick;
      if (a === 'on') this.sellPick = [];
      else if (a === 'off') this.sellPick = null;
      else if (this.sellPick?.length) {
        let g = 0, n = 0;
        st.inv = st.inv.filter((it) => { if (!this.sellPick.includes(it.uid) || it.lock) return true; g += itemValue(it); n++; return false; });
        st.gold += g; audio.play('coin'); w.ui.toast(`${n}개 판매: +${g.toLocaleString()}G`, '#ffd84a'); this.sellPick = null; w.ui.dirty();
      }
      audio.play('click'); this.render();
    });
    // 가방 정렬: 장비(등급 · 레벨 높은 순) → 물약 · 영약 → 보석 → 파편 → 스킬북 → 재료 → 그 밖
    const RK = { myth: 6, legend: 5, hero: 4, rare: 3, magic: 2, common: 1 };
    const grp = (it) => { const b = BASES[it.base] || {}; return it.book ? 5 : it.shard ? 4 : b.slot ? 0 : b.type === 'potion' || b.type === 'elixir' ? 1 : b.type === 'gem' ? 3 : b.type === 'mat' ? 6 : 7; };
    const itemOrder = (a, b) => grp(a) - grp(b) || (RK[b.rarity] || 0) - (RK[a.rarity] || 0) || (b.ilvl || 0) - (a.ilvl || 0) || String(a.base).localeCompare(String(b.base));
    on('[data-bagsort]', () => { st.inv.sort(itemOrder); audio.play('click'); w.ui.dirty(); this.render(); });
    // v0.44.34 창고 정렬 (서버 창고와 맞춘 뒤에만)
    on('[data-vsort]', () => { if (!vaultReady()) { w.ui.toast('창고를 불러오는 중입니다'); return; } vault().items.sort(itemOrder); vaultSave(); audio.play('click'); this.render(); });
    ask('[data-selljunk]', () => ['일괄 판매', '가방의 일반 · 마법 장비를 모두 팝니다', '판매'], () => {
      let g = 0, n = 0;
      st.inv = st.inv.filter((it) => { if (it.lock || it.book || !BASES[it.base]?.slot || it.set || !['common', 'magic'].includes(it.rarity)) return true; g += itemValue(it); n++; return false; });
      if (n) { st.gold += g; audio.play('coin'); w.ui.toast(`장비 ${n}개 판매: +${g.toLocaleString()}G`, '#ffd84a'); }
      w.ui.dirty(); this.render();
    });
    on('[data-craft]', (el) => {
      const [z, sl] = el.dataset.craft.split('|'), r = craft(st, z, sl);
      if (r.ok) { audio.play('rankup'); w.ui.toast(`${itemName(r.item)} 제작!`, '#7fe07a'); }
      townDone(r);
    });
    on('[data-autobrew]', (el) => { const t2 = townOf(st); t2.autoBrew = t2.autoBrew === el.dataset.autobrew ? null : el.dataset.autobrew; audio.play('click'); this.render(); });
    this.el.querySelector('[data-dexzs]')?.addEventListener('change', (e) => { this.dexZone = e.target.value; this.dexMon = null; audio.play('click'); this.render(); });
    on('[data-relon]', (el) => { const R = st.relics, r = R.bag[+el.dataset.relon], al = Object.values(townOf(st).plots).find((x) => x.type === 'altar'); if (!r || !al || R.on.length >= altarSlots(al.lv)) return; R.bag.splice(+el.dataset.relon, 1); R.on.push({ ...r, until: Date.now() + RELIC_GRADES[r.g].days * 86400e3 * altarDur(al.lv) }); w.d = derive(st, w.buffValues()); audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-reloff]', (el) => { const R = st.relics; R.on.splice(+el.dataset.reloff, 1); w.d = derive(st, w.buffValues()); audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-face]', (el) => { if (el.dataset.face === st.look?.face) return; w.changeLook(el.dataset.face); audio.play('click'); this.render(); }); // v0.49.47
    on('[data-artl]', (el) => { this.artLine = el.dataset.artl; audio.play('click'); this.render(); });
    on('[data-arteq]', (el) => { const A = (st.arts ||= { prog: {}, open: {}, equip: [] }), id = el.dataset.arteq; A.equip ||= []; if (A.equip.includes(id)) A.equip = A.equip.filter((x) => x !== id); else if (A.equip.length < artSlots(st) && A.open[id] && artUsable(st, ART[id])) A.equip.push(id); audio.play('click'); w.ui.dirty(); this.render(); });
    on('[data-sgsel]', (el) => { this.sgSel = Number(el.dataset.sgsel); this.sgPick = []; this.sgLast = null; audio.play('click'); this.render(); });
    on('[data-sgpick]', (el) => { const i = Number(el.dataset.sgpick), p = (this.sgPick ||= []), j = p.indexOf(i); if (j >= 0) p.splice(j, 1); else p.push(i); audio.play('click'); this.render(); });
    on('[data-sgq]', (el) => { const q = el.dataset.sgq, it = [...st.inv, ...vault().items].find((x) => x?.uid === this.sgSel); if (!it) return; const vs = shardVals(it), gr = !!it.shard.great, from = this.sgKeep !== false ? 1 : 0;
      if (q === 'keep') this.sgKeep = this.sgKeep === false; else if (q === 'none') this.sgPick = []; else if (q === 'all') this.sgPick = vs.map((_, i) => i).slice(from);
      else { const g = Number(q.slice(1)); this.sgPick = vs.map((v, i) => i).filter((i) => i >= from && shardGrade(it.shard.id, vs[i], gr) <= g); }
      if (q === 'keep' && this.sgKeep !== false) this.sgPick = (this.sgPick || []).filter((i) => i !== 0);
      this.sgLast = null; audio.play('click'); this.render(); });
    on('[data-sggrade]', (el) => { this.sgGrade = Number(el.dataset.sggrade); audio.play('click'); this.render(); });
    ask('[data-sggrind]', () => ['파편 갈기', `파편 ${this.sgPick.length}개를 가루로 만듭니다`, '갈기'], () => { const r = grindShard(st, this.sgSel, this.sgPick); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else { this.sgPick = []; this.sgLast = `가루 +${r.dust}`; audio.play('click'); w.ui.dirty(); } this.render(); });
    on('[data-sgfuse]', () => { if ((this.sgPick || []).length > 3) { const r = fuseMany(st, this.sgSel, this.sgPick); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else { this.sgPick = []; this.sgLast = `${r.used}개 → ${r.fuses}개 · 최고 ${affixText({ id: r.id, v: r.best }).match(/[+-]?[\d.]+%?/)?.[0] || r.best}`; this.sgSel = [...st.inv, ...vault().items].find((x) => x?.shard?.id === r.id && !!x.shard.great === !!r.great)?.uid ?? this.sgSel; audio.play('rankup'); w.ui.dirty(); } this.render(); return; }
      const r = fuseShard(st, this.sgSel, this.sgPick); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else { this.sgPick = []; const hi = Math.max(...r.from); this.sgLast = `<span style="color:${gradeColor(r.grade)}">${r.great ? '탁월 ' : ''}${esc(affixText({ id: r.id, v: r.v }))} · ${sgName(r.grade)}</span> ${r.v > hi ? '▲' : r.v < Math.min(...r.from) ? '▼' : ''}`; this.sgSel = [...st.inv, ...vault().items].find((x) => x?.shard?.id === r.id && !!x.shard.great === !!r.great)?.uid ?? this.sgSel; audio.play(r.v > hi ? 'rankup' : 'click'); w.ui.dirty(); } this.render(); });
    on('[data-sgpull]', (el) => { const r = pullShard(st, Number(el.dataset.sgpull)); if (!r.ok) { w.ui.toast(r.why); audio.play('error'); } else { this.sgPullLast = { id: r.id, v: r.v, grade: r.grade }; audio.play('rankup'); w.ui.dirty(); } this.render(); });
    on('[data-dexm]', (el) => { this.dexMon = el.dataset.dexm; audio.play('click'); this.render(); });
    on('[data-hswap]', (el) => { const [h, k] = el.dataset.hswap.split('|'), r = herbSwap(st, h, Number(k)); if (r.ok) audio.play('click'); townDone(r); });
    on('[data-brew]', (el) => { const [id, k] = el.dataset.brew.split('|'), r = brew(st, id, Number(k)); if (r.ok) audio.play('click'); townDone(r); });
    on('[data-brewget]', (el) => { const v = el.dataset.brewget === 'vault', r = brewCollect(st, Date.now(), v ? vaultAdd : null); if (r.n) { audio.play('potion'); w.ui.toast(`${r.n}개를 ${v ? '창고' : '가방'}에 넣었습니다`, '#7fe07a'); } townDone(r); });
    on('[data-pm]', (el) => { const id = el.dataset.pm, P = (this.party ||= { ids: [], pack: {} }); const i = P.ids.indexOf(id); if (i >= 0) P.ids.splice(i, 1); else if (P.ids.length < partyMax(st)) P.ids.push(id); audio.play('click'); this.render(); });
    on('[data-pzone]', (el) => { (this.party ||= { ids: [], pack: {} }).zone = el.dataset.pzone; audio.play('click'); this.render(); });
    on('[data-pexp]', (el) => { (this.party ||= { ids: [], pack: {} }).exp = el.dataset.pexp; audio.play('click'); this.render(); });
    on('[data-ppack]', (el) => { const [base, d] = el.dataset.ppack.split('|'), P = (this.party ||= { ids: [], pack: {} }); const tot = Object.values(P.pack).reduce((a, v) => a + v, 0); const n = (P.pack[base] || 0) + Number(d); if (n < 0 || (Number(d) > 0 && (tot >= packMax(st) || n > resCount(st, base)))) return; P.pack[base] = n; audio.play('click'); this.render(); });
    on('[data-prepstop]', (el) => { stopRepeat(st, el.dataset.prepstop); audio.play('click'); this.render(); });
    on('[data-psend]', (el) => { const P = this.party; const r = dispatchParty(st, P.ids, P.zone, P.exp, Object.entries(P.pack).filter(([, q]) => q > 0).map(([base, qty]) => ({ base, qty })), Date.now(), { repeat: el.dataset.psend === 'rep' }); if (r.ok) { this.party = { ids: [], pack: {}, zone: P.zone, exp: P.exp }; audio.play('rankup'); } townDone(r, `용병 ${r.n}명이 파견을 떠났습니다`); });
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
      if (await gameConfirm('캐릭터 지우기', '정말 이 캐릭터를 지울까요? 되돌릴 수 없습니다', '지우기')) {
        window.__noSave = true;
        const { deleteChar } = await import('../game/chars.js');
        deleteChar(st.cid);
        await cloud.delChar(st.cid);
        location.reload();
      }
    });
    // 메인 화면(캐릭터 고르기)으로: 저장하고 다시 연다
    on('[data-tab]', (el) => { if (el.closest('.tabs')) return; audio.play('click'); this.show(el.dataset.tab); });
    on('[data-notices]', () => { this.newsList = null; this.show('news'); });
    // 체크 = 줍는다 (체크 해제 = 자동 사냥이 줍지 않는다)
    body.querySelectorAll('input[data-apick]').forEach((el) => { el.onchange = () => { (st.settings.autoPick ||= {})[el.dataset.apick] = el.checked; audio.play('click'); this.save?.(); }; });
    on('[data-mailbox]', () => this.mailbox());
    on('[data-title]', () => { this.save(true); window.__noSave = true; setTimeout(() => location.reload(), 400); });
    on('[data-nick]', () => { this.close(); window.__askNick?.(); });
  }
}

// v0.49.34 기본 효과 이름 · % 표시 (강화 창)
const modName = (k) => (AFFIXES[k]?.text ? AFFIXES[k].text.replace(/\s*[+-]?\{v\}%?/, '') : STAT_NAMES[k] || k);
const pct = (k) => (/\{v\}%/.test(AFFIXES[k]?.text || '') ? '%' : '');
// 장비 기본 능력(b.mods) 한 줄: 옵션 글이 있으면 그것, 아니면 능력치 이름
function modText(k, v) {
  if (AFFIXES[k]?.text) return AFFIXES[k].text.replace('{v}', v);
  return `${STAT_NAMES[k] || ({ armor: '방어력', dmg: '피해', hp: 'HP', mp: 'MP' })[k] || k} +${v}`;
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
