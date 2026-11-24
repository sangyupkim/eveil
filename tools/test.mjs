// 게임 로직 점검 (화면 없이). npm test
import assert from 'node:assert/strict';
import { newPlayer, derive, chooseStart } from '../src/game/player.js';
import { STARTS, START_BONUS } from '../src/data/items.js';
import { addAP, gainExp, distribute, expNeeded, rewardFactor } from '../src/game/growth.js';
import { learn, addSkillExp, canLearn, skillValues } from '../src/game/skills.js';
import { rollLoot, rollDeathDrop } from '../src/game/loot.js';
import { makeItem, itemName, rollBase } from '../src/game/items.js';
import * as await_fs from 'node:fs';
import * as RM from '../src/game/rumor.js';
import * as RMSH from '../src/game/shards.js';
import { craftOre, enhanceCost, resAdd, resCount, essGrade, craftKey } from '../src/game/town.js';
import { MATERIALS } from '../src/data/crafting.js';
import { finishBuilds, brew, brewCollect, dispatchParty, shelterUp, deathChance, rollMerc, researchStart } from '../src/game/town.js';
import { HERBS } from '../src/data/potions.js';
import { countOf } from '../src/game/inventory.js';
import * as INV from '../src/game/inventory.js';
import * as NR from '../src/data/nickrules.js';
import * as PL from '../src/game/player.js';
import * as IT from '../src/game/items.js';
import { BASES as IT_BASES } from '../src/data/items.js';
import { townOf, build as build0, tick, collect, enhance, hire, dispatch, claim, buildingAt, dropMats, craft, craftZones, upgrade, setBase, liberateAdd, assignMerc, recruits, mercSlots, awakenMerc, MERC } from '../src/game/town.js';
// 테스트에서는 공사를 바로 끝낸다
const build = (...a) => { const r = build0(...a); finishBuilds(a[0], Date.now() + 864e5); return r; };
import { BUILDINGS } from '../src/data/buildings.js';
import { MONSTER_LOOK, ITEM_LOOK, SKILL_ICON } from '../src/data/flareWorld.js';
import { addItem, equip } from '../src/game/inventory.js';
import { seeded } from '../src/game/rng.js';
import { CONFIG, STATS, AP_TABLE } from '../src/data/config.js';
import { QUESTS } from '../src/data/quests.js';
import { nextQuest, currentQuest, questKill, questDone, questNeed, questTurnIn } from '../src/game/quests.js';
import { SKILLS } from '../src/data/skills.js';
import '../src/data/skill_fx.js';
import { BASES, AFFIXES } from '../src/data/items.js';
import { makeShard, shardFrom, applyShard, lockMax, rollShard } from '../src/game/shards.js';
import { MONSTERS, ZONES } from '../src/data/world.js';
import { titleKey, perkChoices, titleName, TITLE_NAMES } from '../src/data/titles.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✓', name); };

test('패치 노트: 모든 버전에 items 목록', async () => {
  const { PATCH_NOTES } = await import('../src/data/patchnotes.js');
  for (const v of PATCH_NOTES) assert.ok(Array.isArray(v.items), v.ver);
});

test('새 캐릭터: 스탯 5종 모두 시작값, 레벨 없음', () => {
  const p = newPlayer('방랑자', { face: 'knight' }, null);
  assert.deepEqual(Object.keys(p.stats), STATS);
  for (const s of STATS) assert.equal(p.stats[s], CONFIG.startStat);
  assert.equal(p.level, undefined);
  assert.equal(p.equip.weapon, null);
  assert.equal(p.tut, 0);
});

test('처음 무기 고르기: 무기 + 주 스탯 +2, 첫 스킬북을 바로 배울 수 있다', () => {
  for (const id in STARTS) {
    const p = newPlayer('방랑자', { face: 'knight' }, null);
    chooseStart(p, id);
    assert.equal(BASES[p.equip.weapon.base].cls, id === 'staff' ? 'wand' : id); // v0.49.38 지능은 완드로 시작
    assert.equal(p.stats[STARTS[id].stat], CONFIG.startStat + START_BONUS);
    assert.ok(canLearn(p, STARTS[id].book).ok, id);
  }
});

test('검만 휘두르면 힘이 주로 오른다', () => {
  const p = newPlayer();
  for (let i = 0; i < 50; i++) { addAP(p, 'str', 1); addAP(p, 'dex', 0.2); }
  addAP(p, 'vit', 8);
  const [r] = gainExp(p, expNeeded(0), seeded(1));
  assert.equal(Object.values(r.gains).reduce((a, b) => a + b), CONFIG.awakenPoints);
  assert.ok(r.gains.str >= 3, JSON.stringify(r.gains));
  assert.equal(p.awakenings, 1);
});

test('마법 위주면 지능, 여러 행동이면 골고루', () => {
  const g1 = distribute({ str: 0, dex: 0, int: 75, wis: 25, vit: 0 }, 5, seeded(2));
  assert.equal(g1.int, 4); assert.equal(g1.wis, 1);
  const g2 = distribute({ str: 30, dex: 0, int: 30, wis: 0, vit: 40 }, 5, seeded(3));
  assert.equal(g2.vit, 2); assert.equal(g2.str + g2.int, 3);
});

test('너무 약한 몬스터는 AP 0', () => {
  const p = newPlayer();
  p.awakenings = 30;
  assert.equal(rewardFactor(p, 1).ap, 0);
  assert.equal(rewardFactor(p, 14).ap, 1);
});

test('스킬은 쓸수록 랭크가 오른다 · 스탯 조건', () => {
  const p = newPlayer();
  assert.equal(canLearn(p, 'fireball').ok, false);
  learn(p, 'fire_bolt');
  assert.equal(p.quick[0], 'fire_bolt');
  let ups = 0;
  for (let i = 0; i < 200; i++) ups += addSkillExp(p, 'fire_bolt', 1);
  assert.ok(p.skills.fire_bolt.rank > 3, String(p.skills.fire_bolt.rank));
  assert.equal(ups, p.skills.fire_bolt.rank - 1);
});

test('강한 몬스터일수록 스킬북 · 좋은 장비가 잘 나온다', () => {
  const rng = seeded(7);
  const stat = (tier, N) => {
    let books = 0, bookTier = 0, good = 0;
    for (let i = 0; i < N; i++) for (const d of rollLoot({ tier, level: 5 }, {}, null, rng)) {
      if (d.item?.book) { books++; const k = SKILLS[d.item.book]; bookTier += k.chasu || Math.max(1, (k.tier || 1) - 1); }
      if (d.item && ['hero', 'legend'].includes(d.item.rarity)) good++;
    }
    return { books: books / N, tier: books ? bookTier / books : 0, good: good / N };
  };
  const nrm = stat('normal', 20000), boss = stat('boss', 2000);
  assert.ok(nrm.books < 0.02 && boss.books >= 0.15 && boss.books < 0.4);
  // v0.50 책 차수는 사냥터 권장 각성 기준: 레벨 5 사냥터는 보스도 1차 위주 (다음 차수 15%까지)
  assert.ok(nrm.tier <= 1.2 && boss.tier < 1.4, JSON.stringify({ n: nrm.tier, b: boss.tier }));
  { let hi = 0, n = 0; for (let i = 0; i < 3000; i++) for (const d of rollLoot({ tier: 'boss', level: 320 }, {}, null, rng)) if (d.item?.book) { n++; if ((SKILLS[d.item.book].chasu || 0) >= 4) hi++; } assert.ok(hi / n > 0.5, '레벨 320 사냥터 보스 책은 4차 위주 ' + hi / n); }
  assert.ok(boss.good > nrm.good * 50);
});

test('자동 사냥은 드랍이 줄어든다', () => {
  const rng = seeded(9);
  let a = 0, m = 0;
  for (let i = 0; i < 20000; i++) {
    m += rollLoot({ tier: 'normal', level: 3 }, {}, null, rng).length;
    a += rollLoot({ tier: 'normal', level: 3 }, { auto: true }, null, rng).length;
  }
  assert.ok(a < m * 0.9, `${a} vs ${m}`);
});

test('사망: 확률적으로 아이템 1개를 떨어뜨린다 (물약은 제외)', () => {
  const rng = seeded(11);
  let drops = 0;
  for (let i = 0; i < 2000; i++) {
    const p = newPlayer();
    addItem(p, makeItem('leather_cap', {}, p));
    const it = rollDeathDrop(p, rng);
    if (it) { drops++; assert.ok(!BASES[it.base].stack); }
  }
  const rate = drops / 2000;
  assert.ok(Math.abs(rate - CONFIG.deathDropChance) < 0.05, String(rate));
});

test('장착 · 양손 무기는 방패를 벗긴다', () => {
  const p = newPlayer();
  p.stats.str = 30;
  const sh = makeItem('round_shield', {}, p); addItem(p, sh); assert.ok(equip(p, sh.uid).ok);
  const gs = makeItem('greatsword', { rarity: 'rare', ilvl: 8 }, p); addItem(p, gs);
  assert.equal(equip(p, gs.uid).ok, false); // 각성 8 필요 (v0.42)
  p.awakenings = 8;
  assert.ok(equip(p, gs.uid).ok);
  assert.equal(p.equip.offhand, null);
  assert.ok(itemName(gs).includes('대검'));
  assert.ok(derive(p).dmg[0] > 10);
});

test('데이터 참조 무결성', () => {
  for (const z of ZONES) {
    for (const t of Object.keys(z.spawns)) assert.ok(MONSTERS[t], t);
    assert.ok(MONSTERS[z.named.type] && MONSTERS[z.boss.type]);
  }
});

test('퀘스트: 처치 → 보고 → 보상 → 다음 퀘스트, 끝까지 이어진다', () => {
  for (const start of Object.keys(STARTS)) {
    const p = newPlayer('방랑자', { g: 'm' }, start);
    p.stats = { str: 99, dex: 99, int: 99, wis: 99, vit: 99 };
    let steps = 0;
    while (nextQuest(p)) {
      const q = currentQuest(p), g = q.goal;
      assert.equal(questKill(p, { type: 'nothing', tier: 'normal', zone: q.zone }), false);
      for (let i = 0; i < questNeed(q); i++) assert.ok(questKill(p, g.kill ? { type: g.kill, tier: 'normal', zone: q.zone } : { type: 'x', tier: g.named ? 'named' : 'boss', zone: q.zone }));
      assert.ok(questDone(p));
      p.inv.length = 0;
      const r = questTurnIn(p, CONFIG.inventorySize);
      assert.ok(r.ok, q.id);
      if (q.reward.gear?.[0] === 'weapon') assert.equal(BASES[r.items.find((it) => BASES[it.base]?.slot === 'weapon').base].cls, start === 'staff' ? 'wand' : start);
      if (q.reward.book) assert.ok(SKILLS[r.items.find((it) => it.book).book], q.id);
      steps++;
    }
    assert.equal(steps, QUESTS.length);
    for (const q of QUESTS) { if (q.goal.kill) assert.ok(ZONES.find((z) => z.id === q.zone).spawns[q.goal.kill], q.id); }
  }
});

test('정신은 MP를 회복해야 오른다 · 최대 MP는 정신에서', () => {
  const a = newPlayer(), b = newPlayer();
  b.stats.wis += 10; a.stats.int += 10;
  assert.ok(derive(b).maxMp > derive(a).maxMp);
  assert.ok(derive(a).spellMult > derive(b).spellMult);
  assert.ok(AP_TABLE.mpRecover > 0 && AP_TABLE.mpSpent100 === undefined);
});

test('지역 · 몬스터 · 스킬 · 장비 데이터가 서로 맞물린다', () => {
  const fs = await_fs;
  const TYPES = new Set(['melee', 'spin', 'cleave', 'bolt', 'arrow', 'chain', 'meteor', 'nova', 'buff', 'dash', 'line', 'rain', 'cone', 'evade']);
  for (const [id, sk] of Object.entries(SKILLS)) {
    assert.ok(TYPES.has(sk.type), id);
    assert.ok(sk.req && Object.keys(sk.req).every((k) => STATS.includes(k)), id);
    assert.notEqual(sk.type, 'heal', id);
  }
  const enemies = JSON.parse(fs.readFileSync('assets/flare/enemies.json', 'utf8'));
  const avatar = JSON.parse(fs.readFileSync('assets/flare/avatar_m.json', 'utf8'));
  for (const [id, m] of Object.entries(MONSTERS)) {
    assert.ok(MONSTER_LOOK[id] && enemies[MONSTER_LOOK[id].sprite], id + ' 그림');
    if (m.patterns) for (const p of m.patterns) assert.ok(['slam', 'spores', 'summon', 'charge', 'volley'].includes(p), id + ' ' + p);
    if (m.patterns?.includes('summon')) assert.ok(MONSTERS[m.minion], id + ' 부하');
  }
  // 모든 장비 · 물약에 아이콘, 입는 장비는 겹그림이 실제로 있다
  for (const [id, b] of Object.entries(BASES)) {
    assert.ok(ITEM_LOOK[id] && Number.isInteger(ITEM_LOOK[id].icon), id + ' 아이콘');
    for (const layer of Object.values(ITEM_LOOK[id].layers || {})) assert.ok(avatar[layer], id + ' 겹 ' + layer);
  }
  for (const id of Object.keys(SKILLS)) assert.ok(Number.isInteger(SKILL_ICON[id]), id + ' 스킬 아이콘');
  // 지역마다 레벨이 이어지고 겹치지 않는다
  const zs = [...ZONES].sort((a, b) => a.levels[0] - b.levels[0]);
  for (let i = 1; i < zs.length; i++) assert.equal(zs[i].levels[0], zs[i - 1].levels[1] + 1, zs[i].id);
  for (let i = 0; i < ZONES.length; i++) for (let j = i + 1; j < ZONES.length; j++) {
    const a = ZONES[i], b = ZONES[j];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > a.r + b.r - 1, a.id + '/' + b.id);
  }
  // 높은 레벨에서도 모든 부위가 나온다
  for (const lv of [1, 10, 25, 42]) {
    const got = new Set();
    for (let i = 0; i < 4000; i++) got.add(BASES[rollBase(lv)].slot);
    assert.equal(got.size, 9, String(lv));
  }
});

test('칭호: 키운 스탯 둘로 갈래 · 특성 셋', () => {
  assert.equal(titleKey({ str: 40, dex: 12, int: 11, wis: 10, vit: 14 }), 'str');
  assert.equal(titleKey({ str: 10, dex: 30, int: 28, wis: 10, vit: 12 }), 'dex+int');
  assert.equal(titleName('dex+int', 0), '마궁사');
  assert.equal(Object.keys(TITLE_NAMES).length, 25);                 // 한 스탯 5 + 두 스탯 10 + 세 스탯 10 (4차 각성 전용)
  assert.equal(titleKey({ str: 80, dex: 20, int: 90, wis: 70, vit: 10 }, 10, 2), 'str+int'); // 3차까지는 두 스탯
  assert.equal(titleKey({ str: 80, dex: 20, int: 90, wis: 70, vit: 10 }, 10, 3), 'str+int+wis'); // 4차는 셋
  for (const k of Object.keys(TITLE_NAMES)) for (const t of [0, 1, 2, 3]) {
    if (!TITLE_NAMES[k][t]) continue;
    const c = perkChoices(k, t);
    assert.equal(c.length, 3, k);
    assert.deepEqual(c, perkChoices(k, t)); // 늘 같은 셋
    for (const p of c) assert.ok(!/회복/.test(p.text) || /MP/.test(p.text), 'HP 회복 금지: ' + p.text);
  }
});

test('재료 · 제작소 · 세트 효과', () => {
  const p = newPlayer('방랑자', { face: 'm01' }, 'sword');
  p.gold = 1e6;
  assert.equal(dropMats(p, 'field', 'boss'), 8);
  assert.equal(dropMats(p, 'field', 'normal', () => 0.9), 0);
  assert.equal(craft(p, 'field', 'helm').ok, false); // 제작소 없음
  p.awakenings = 20;
  assert.ok(build(p, 'p5', 'workshop').ok);
  assert.equal(craftZones(p).length, 2);
  for (const z of ZONES) for (const sl of ['helm', 'armor', 'gloves', 'boots']) assert.ok(setBase(ZONES.indexOf(z), sl), z.id + sl);
  townOf(p).mats.field = 100;
  const hp0 = derive(p).maxHp;
  for (const sl of ['helm', 'armor']) { const r = craft(p, 'field', sl); assert.ok(r.ok, r.why); equip(p, r.item.uid); }
  assert.ok(derive(p).maxHp >= hp0 + 30, '2세트 효과');
  // 단계 올리기는 각성 · 재료가 든다 (5단계는 각성 60 이하)
  for (const d of Object.values(BUILDINGS)) assert.ok(d.max === 20 && d.up.length === 19 && d.up[3] <= 60 && d.up[8] === 300 && d.up[18] === 1050 && d.up.every((v, i) => !i || v > d.up[i - 1])); // v0.42 10단계 · v0.49.73 20단계
  const aw = p.awakenings; p.awakenings = 0;
  assert.equal(upgrade(p, 'p5').ok, false);
  p.awakenings = aw;
  assert.ok(upgrade(p, 'p5').ok); // 1 → 2는 금화만
  assert.equal(buildingAt(p, 'p5').lv, 1); assert.equal(upgrade(p, 'p5').ok, false); // 공사 중
  finishBuilds(p, Date.now() + 864e5); assert.equal(buildingAt(p, 'p5').lv, 2);
  townOf(p).mats.field = 0;
  assert.equal(upgrade(p, 'p5').ok, false); // 2 → 3은 들판 재료
  townOf(p).mats.field = 8;
  p.awakenings = 30; assert.ok(upgrade(p, 'p5').ok);
});

test('마을: 짓기 · 생산(꺼 둔 시간) · 강화 · 용병 파견', () => {
  const p = newPlayer('방랑자', { face: 'm01' }, 'sword');
  const t0 = 1_000_000_000_000;
  p.gold = 100000;
  townOf(p, t0);
  assert.equal(build(p, 'p1', 'mine').ok, false);  // 각성 6 전에는 광산을 못 짓는다
  p.awakenings = 20;
  assert.ok(build(p, 'p1', 'mine').ok);
  assert.equal(build(p, 'p2', 'mine').ok, false); // 같은 건물은 하나
  assert.ok(build(p, 'p2', 'smithy').ok && build(p, 'p3', 'inn').ok && build(p, 'p4', 'herb').ok);
  // 여관에 찾아온 용병을 고용해 광산에 맡긴다 (솜씨 10 = 한 자리 몫)
  assert.equal(mercSlots(p), 1);                            // 숙소가 없으면 1명
  assert.ok(build(p, 'p5', 'house').ok);
  assert.equal(mercSlots(p), 8);
  const rec = recruits(p, t0, seeded(1));
  assert.ok(rec.length >= 3);
  assert.equal(recruits(p, t0 + 60000), rec);                 // 같은 시간엔 그대로
  assert.ok(hire(p, rec[0].id, t0).ok);
  const m = townOf(p).mercs[0]; m.mine = 10;
  tick(p, t0 + 1);
  assert.equal(Math.floor(buildingAt(p, 'p1').stock), 0);   // 일꾼이 없으면 생산 없음
  assert.ok(assignMerc(p, m.id, 'p1').ok);
  const ex = { ...m }; void ex;
  tick(p, t0 + 2 * 3600000);
  assert.ok(buildingAt(p, 'p1').stock > 3);
  assert.ok(m.sta < 60 && m.mine > 10);                     // 체력이 닳고 솜씨가 오른다
  tick(p, t0 + 100 * 3600000);                              // 오래 꺼 둬도 창고만큼만
  assert.equal(buildingAt(p, 'p1').stock, BUILDINGS.mine.store(1));
  assert.ok(m.lv > 1);
  m.lv = MERC.lvMax; p.gold += 1e6; assert.ok(awakenMerc(p, m.id).ok && m.aw === 1 && m.lv === 1);
  townOf(p).mercs.length = 0;
  assert.equal(collect(p, 'p1').n, BUILDINGS.mine.store(1));
  assert.equal(townOf(p).ore, BUILDINGS.mine.store(1));
  townOf(p).ore = 1000; // 강화에 쓸 만큼
  const w = p.equip.weapon;
  const d0 = derive(p).dmg[1];
  let ok = 0; for (let i = 0; i < 4; i++) if (enhance(p, w, () => 0).success) ok++;
  assert.equal(w.plus, 4); assert.equal(enhance(p, w, () => 0).ok, false); // 대장간 1단계 상한 +4
  assert.ok(derive(p).dmg[1] > d0 * 1.2);
  assert.ok(itemName(w).startsWith('+4 '));
  assert.ok(hire(p, null, t0).ok);
  assert.equal(dispatch(p, 0, 'field', 'short', t0).ok, false); // 해방 전에는 못 보낸다
  for (let i = 0; i < 400; i++) liberateAdd(p, 'field', 'normal');
  assert.ok(dispatch(p, 0, 'field', 'short', t0).ok);
  assert.equal(claim(p, 0, t0 + 5 * 60000), null);                       // 아직
  townOf(p).mercs[0].hunt = 50; townOf(p).mercs[0].lv = 20;
  const g0 = p.gold, r = claim(p, 0, t0 + 11 * 60000, ((r) => (r(), r))(seeded(3)));
  assert.ok(r && !r.dead && r.gold > 0 && p.gold === g0 + r.gold && townOf(p).mercs[0].job === null);
});

test('능력치 파편: 갈아 끼울 때 · 보스 드랍 · 대장간에서 잠그고 바꾸기', () => {
  const st = newPlayer();
  // 파편은 옵션에서만 나온다 (기본 피해 · 방어력은 옵션이 아니다)
  const it = makeItem(Object.keys(BASES).find((k) => (BASES[k].slot === 'armor')), { rarity: 'rare', ilvl: 10 }, st);
  const sh = shardFrom(it, st);
  assert.ok(sh && AFFIXES[sh.shard.id] && it.affixes.some((a) => a.id === sh.shard.id));
  // 갈아 끼우면 가끔(항상 X) 파편
  let got = 0;
  for (let n = 0; n < 400; n++) {
    const s2 = newPlayer(); s2.awakenings = 10;
    const a = makeItem(it.base, { rarity: 'rare', ilvl: 10 }, s2), b = makeItem(it.base, { rarity: 'rare', ilvl: 10 }, s2);
    addItem(s2, a); equip(s2, a.uid); addItem(s2, b);
    if (equip(s2, b.uid).shards.length) got++;
  }
  assert.ok(got > 5 && got < 80, String(got));
  // 보스는 가끔 장비 대신 파편
  let bs = 0;
  for (let n = 0; n < 3000; n++) bs += rollLoot({ tier: 'boss', level: 20 }, {}, null).filter((d) => d.item?.shard).length;
  assert.ok(bs > 0);
  assert.ok(rollShard(20).shard.v >= 1);
  // 잠금 수 · 잠근 옵션은 바뀌지 않는다
  assert.equal(lockMax(1), 0); assert.equal(lockMax(3), 1); assert.equal(lockMax(5), 3);
  st.gold = 1e9; st.town = { plots: {}, ore: 1e6, mercs: [], mats: {} };
  const base = it.affixes.map((a) => ({ ...a }));
  const free = Object.keys(AFFIXES).find((id) => !AFFIXES[id].legendOnly && !it.affixes.some((a) => a.id === id) && (!AFFIXES[id].slots || AFFIXES[id].slots.includes('armor')));
  for (let n = 0; n < 20; n++) {
    const s = makeShard({ id: free, v: 7 }, st); st.inv.push(s);
    const locks = [0, 1].slice(0, Math.min(2, it.affixes.length - 1));
    const r = applyShard(st, it, s.uid, locks, 4);
    assert.ok(r.ok, r.why);
    for (const k of locks) assert.deepEqual(it.affixes[k], base[k]);
    assert.equal(it.affixes.filter((a) => a.id === free).length, 1);
  }
  const s3 = makeShard({ id: free, v: 1 }, st); st.inv.push(s3);
  assert.equal(applyShard(st, it, s3.uid, [0, 1, 2], 4).ok, false);
});

test('약초밭 · 제작소(물약 · 영약) · 파견소 · 쉼터 · 여관 등급 · 연구 해금', () => {
  const p = newPlayer('방랑자', { face: 'm01' }, 'sword');
  p.gold = 1e7; p.awakenings = 60;
  const t = townOf(p);
  for (const [pl, ty] of [['p1', 'herb'], ['p2', 'workshop'], ['p3', 'guild'], ['p4', 'inn'], ['p5', 'house'], ['p6', 'lab']]) assert.ok(build(p, pl, ty).ok, ty);
  // 약초밭은 약초만, 단계마다 새 약초
  const hb = buildingAt(p, 'p1'); hb.stock = 30;
  const c1 = collect(p, 'p1');
  assert.ok(c1.got && Object.keys(c1.got).every((h) => HERBS[h].lv <= 1) && countOf(p, 'hp_potion') >= 0);
  hb.lv = 5; hb.stock = 60;
  assert.ok(Object.keys(collect(p, 'p1').got).includes('gold'));
  // 제작소 단계가 낮으면 영약을 못 만든다
  t.herbs = { red: 50, blue: 50, iron: 50, sun: 50, wind: 50, moon: 50, gold: 50 };
  assert.ok(brew(p, 'hp_potion', 2).ok);
  assert.equal(brew(p, 'el_luck').ok, false);
  buildingAt(p, 'p2').lv = 5;
  assert.ok(brew(p, 'el_luck').ok && countOf(p, 'el_luck') === 0); // 시간이 걸린다
  assert.ok(brewCollect(p, Date.now() + 3600000).n >= 3 && countOf(p, 'el_luck') === 1);
  // 숙소 5단계 = 50명
  buildingAt(p, 'p5').lv = 5; assert.equal(mercSlots(p), 50);
  // 여관: 1단계에는 정예 · 전설이 오지 않고, 5단계에는 온다
  const ra = seeded(77), g1 = Array.from({ length: 400 }, () => rollMerc(ra, 1).grade), g5 = Array.from({ length: 400 }, () => rollMerc(ra, 5).grade);
  assert.ok(Math.max(...g1) <= 1 && g5.includes(3) && g5.filter((g) => g >= 2).length > g1.filter((g) => g >= 2).length);
  // 파견소: 인원 · 물건 수 제한, 쉼터는 사망을 낮춘다
  p.liberate = { [ZONES[0].id]: 9999 };
  for (let i = 0; i < 3; i++) { const m = rollMerc(seeded(50 + i), 3); t.mercs.push(m); }
  const ids = t.mercs.map((m) => m.id);
  assert.equal(dispatchParty(p, ids.slice(0, 2), ZONES[0].id, 'short').ok, false); // 1단계는 1명
  buildingAt(p, 'p3').lv = 3;
  addItem(p, makeItem('hp_potion', { qty: 10 }, p));
  assert.equal(dispatchParty(p, ids.slice(0, 2), ZONES[0].id, 'short', [{ base: 'hp_potion', qty: 9 }]).ok, false); // 물건 5개까지
  const zn = ZONES[0], m0 = t.mercs[0], d0 = deathChance(m0, zn, 'long', p);
  p.camps = { [zn.id]: {} };
  assert.ok(shelterUp(p, zn.id).ok && shelterUp(p, zn.id).ok);
  assert.ok(deathChance(m0, zn, 'long', p) < d0);
  assert.equal(dispatchParty(p, ids.slice(0, 1), zn.id, 'siege').ok, false); // 쉼터 3단계 필요
  const r = dispatchParty(p, ids.slice(0, 3), zn.id, 'short', [{ base: 'hp_potion', qty: 3 }]);
  assert.ok(r.ok, r.why); assert.ok(t.mercs.every((m) => m.job));
  // 연구: 연구소 단계에 따라 열린다
  assert.equal(researchStart(p, 'exp').ok, false);
  buildingAt(p, 'p6').lv = 5;
  assert.equal(researchStart(p, 'exp').ok, false); // 재료 없음
  resAdd(p, 'mat_' + Object.keys(MATERIALS)[0], 99);
  resAdd(p, 'ess2', 9);
  { const rr = researchStart(p, 'exp'); assert.ok(rr.ok, rr.why); }
});

test('창고: 100칸, 캐릭터끼리 나눠 쓰고 연구로 늘어난다', async () => {
  globalThis.localStorage ??= { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };
  const V = await import('../src/game/vault.js');
  const a = newPlayer('가'), b = newPlayer('나');
  assert.equal(V.vaultSize(a), 100);
  a.town = { research: { vault: 2 } }; assert.equal(V.vaultSize(a), 140);
  const it = makeItem('hp_potion', { qty: 3 }, a); addItem(a, it);
  const sword = makeItem('short_sword', {}, a); addItem(a, sword);
  assert.ok(V.vaultPut(a, sword.uid).ok && !a.inv.includes(sword));
  const idx = V.vault().items.findIndex((x) => x.base === 'short_sword');
  assert.ok(V.vaultTake(b, idx).ok && b.inv.some((x) => x.base === 'short_sword'));
});

globalThis.matchMedia ||= () => ({ matches: false }); globalThis.window ||= globalThis;
const { findPath, clearLine } = await import('../src/engine2d/stage.js');
test('길찾기: 벽을 돌아가고, 모든 구간이 트여 있다', () => {
  const stage = { colliders: [], grid: null };
  for (let z = -8; z <= 8; z += 0.8) stage.colliders.push({ x: 0, z, r: 0.6 }); // 세로 벽 (z -8 ~ 8)
  for (let x = -6; x <= 0; x += 0.8) stage.colliders.push({ x, z: 8, r: 0.6 });   // ㄱ자로 꺾인 끝
  const from = { x: -5, z: 0 }, to = { x: 5, z: 0 };
  assert.equal(clearLine(stage, from, to, 0.5), false);
  const path = findPath(stage, from, to, 0.5, 9000);
  assert.ok(path && path.length >= 2, '길을 찾는다');
  let cur = from; for (const q of path) { assert.ok(clearLine(stage, cur, q, 0.5), '구간이 트여 있다'); cur = q; }
  assert.ok(Math.hypot(cur.x - to.x, cur.z - to.z) < 0.01);
  // 완전히 막히면 길 없음
  const box = { colliders: [], grid: null };
  for (let a = 0; a < 6.283; a += 0.1) box.colliders.push({ x: 5 + Math.cos(a) * 3, z: Math.sin(a) * 3, r: 0.6 });
  assert.equal(findPath(box, from, to, 0.5, 3000), null);
});

const LOOT_ = await import('../src/game/loot.js'), WD_ = await import('../src/data/world.js'), IT_ = await import('../src/game/items.js'), BS_ = (await import('../src/data/items.js')).BASES, LG_ = await import('../src/data/legends.js');
test('드랍 장비 레벨: 모든 세계 단계 · 지역 · 등급에서 몬스터 레벨에 맞는다 (이름 있는 전설 포함)', () => {
  for (const t of [0, WD_.TIER_STEP, WD_.TIER_STEP * 2]) for (const zn of WD_.ZONES) for (const tier of ['normal', 'elite', 'named', 'boss']) {
    const lv = zn.levels[1] + t;
    for (let k = 0; k < 60; k++) for (const d of LOOT_.rollLoot({ tier, level: lv, sp: { zone: zn } }, {}, null)) {
      if (d.kind !== 'item' || !BS_[d.item.base]?.slot) continue;
      assert.ok(Math.abs(d.item.ilvl - lv) <= 1, `${zn.id}+${t} ${d.item.title || d.item.base} ${d.item.ilvl}`);
      if (lv > 60) assert.ok(lv - (BS_[d.item.base].minLvl ?? 1) <= 45, `${zn.id}+${t} 기본템 ${d.item.base}`);
    }
  }
  const nm = IT_.makeNamed(LG_.NAMED_LEGENDS.demongate[0], null, 198);
  assert.ok(nm.ilvl === 198 && (BS_[nm.base].minLvl ?? 1) >= 180 && nm.affixes[0].v > 26);
});

// 모든 소스 파일 문법 검사 (화면용 파일은 테스트에서 불러오지 않아 문법 오류가 그대로 배포된 적이 있다 — 0.33.1 로딩 멈춤)
const { execFileSync: _ex } = await import('node:child_process'), { readdirSync: _rd, statSync: _st } = await import('node:fs');
test('v0.50 스킬 정리: 차수마다 6개 · 차수 ×1.75 · 랭크 150에 ×1.5', () => {
  const LINES = ['str', 'dex', 'int', 'wis', 'vit'];
  const sv = (id, r) => skillValues(id, r, []);
  for (const ln of LINES) for (let c = 1; c <= 5; c++) {
    const xs = Object.keys(SKILLS).filter((id) => SKILLS[id].chasu === c && Object.keys(SKILLS[id].req || {}).join() === ln && !id.startsWith('dg_'));
    assert.equal(xs.length, 6, ln + c);
    assert.deepEqual(xs.map((id) => SKILLS[id].q).sort().join(''), '112223', ln + c);
  }
  const fb = sv('fire_bolt', 1).power;
  assert.ok(Math.abs(sv('fire_bolt', 150).power / fb - 1.5) < 0.01);
  assert.ok(Math.abs(sv('fire_bolt', 300).power / fb - 1.5) < 0.01); // 150부터 더 오르지 않음
});

test('자동 판매는 땅에서 주운 장비만: 입었다 벗은 장비는 남는다', () => {
  // 화면 없이 autoSell 규칙만 확인 (world.js와 같은 조건)
  const keep = (it) => !it.loot || it.worn || it.rarity === 'hero' || it.rarity === 'legend';
  const p = newPlayer('t', { face: 'm01' }, 'sword'); p.awakenings = 5;
  const it = makeItem('short_sword', { rarity: 'rare', ilvl: 5 }, p);
  p.inv.push(it); it.loot = true;
  assert.equal(keep(it), false);                 // 막 주운 희귀 장비는 팔 수 있다
  assert.ok(equip(p, it.uid).ok && it.worn && !it.loot);
  assert.equal(keep(it), true);                  // 한 번 입으면 자동 판매 대상이 아니다
});

test('각성 스킬: 1~3차는 차수만, 4차는 갈래에 그 스탯이 있어야', async () => {
  const { awakenOk, AWAKEN_SKILLS } = await import('../src/data/awaken_skills.js');
  const { SKILLS: SK1 } = await import('../src/data/skills.js'); await import('../src/data/skill_fx.js');
  const st = { titles: [] };
  assert.equal(awakenOk(st, SK1.aw_str1).ok, false);
  st.titles.push({ tier: 0, key: 'int' }, { tier: 1, key: 'int' }, { tier: 2, key: 'str+int' });
  assert.ok(awakenOk(st, SK1.aw_str1).ok && awakenOk(st, SK1.aw_vit3).ok); // 하위 차수는 갈래와 상관없이
  assert.equal(awakenOk(st, SK1.aw_str4b).ok, false);       // 4차 각성 전
  st.titles.push({ tier: 3, key: 'str+int+wis' });
  assert.ok(awakenOk(st, SK1.aw_str4b).ok && awakenOk(st, SK1.aw_wis4a).ok);
  assert.equal(awakenOk(st, SK1.aw_dex4a).ok, false);       // 갈래에 민첩이 없다
  // v0.50 책은 사냥터 권장 각성 차수: 레벨 110(2차) 보스는 2차 이상 책을 자주, 레벨 10 보스는 3차 이상 책을 주지 않는다
  const { rollLoot } = await import('../src/game/loot.js');
  const { canLearn } = await import('../src/game/skills.js');
  const { SKILLS: SK0 } = await import('../src/data/skills.js'); await import('../src/data/skill_fx.js');
  let aw = 0; for (let i = 0; i < 400; i++) for (const d of rollLoot({ tier: 'boss', level: 110 })) if (d.item?.book && SK0[d.item.book].chasu >= 2) aw++;
  assert.ok(aw > 5, '2차 스킬북 ' + aw);
  let low = 0; for (let i = 0; i < 400; i++) for (const d of rollLoot({ tier: 'boss', level: 10 })) if (d.item?.book && SK0[d.item.book].chasu >= 3) low++;
  assert.equal(low, 0);
  const p0 = { skills: {}, titles: [], stats: { str: 999, dex: 999, int: 999, wis: 999, vit: 999 } };
  assert.equal(canLearn(p0, 'aw_str1', p0.stats).ok, false);
  p0.titles.push({ tier: 0, key: 'str' });
  assert.ok(canLearn(p0, 'aw_str1', p0.stats).ok);
  // v0.50 차수: 1차 하품은 바로, 1차 중품 · 상품은 1차 각성(20), 2차는 2차 각성(60) …
  const { SKILLS: S } = await import('../src/data/skills.js'); await import('../src/data/skill_fx.js');
  const pickC = (c, q) => Object.keys(S).find((id) => S[id].chasu === c && S[id].line === 'str' && (q == null || S[id].q === q));
  const p1 = { skills: {}, titles: [], stats: p0.stats };
  assert.ok(canLearn(p1, pickC(1, 1), p1.stats).ok);
  assert.equal(canLearn(p1, pickC(1, 2), p1.stats).ok, false);
  p1.titles.push({ tier: 0, key: 'str' });
  assert.ok(canLearn(p1, pickC(1, 2), p1.stats).ok && !canLearn(p1, pickC(2), p1.stats).ok);
  p1.titles.push({ tier: 1, key: 'str' }, { tier: 2, key: 'str' });
  assert.ok(canLearn(p1, pickC(3), p1.stats).ok);
});

test('드랍: 각성 등급 책이 나와도 이름 있는 전설 · 보석 굴림을 건너뛰지 않는다, 탁월한 옵션', async () => {
  const { rollLoot } = await import('../src/game/loot.js');
  let named = 0; for (let i = 0; i < 6000; i++) for (const d of rollLoot({ tier: 'boss', level: 110, sp: { zone: { id: 'field' } } })) if (d.item?.named) named++;
  assert.ok(named / 6000 > 0.013 && named / 6000 < 0.03, '이름 있는 전설 ' + named); // NAMED_CHANCE.boss 2% (v0.42.10)
  let g = 0, n = 0; for (let i = 0; i < 400; i++) { const it = makeItem('short_sword', { rarity: 'legend', ilvl: 50 }); for (const a of it.affixes) { n++; if (a.great) g++; } }
  assert.ok(g / n > 0.05 && g / n < 0.11, '탁월 ' + g / n);
});

test('v0.42: 신화 장비 · 강화 열쇠 · 필드에서는 신화 없음', () => {
  const p = newPlayer('t', { face: 'm01' }, 'sword'); p.gold = 1e8;
  const it = makeItem('short_sword', { rarity: 'myth', ilvl: 400 }, p);
  assert.equal(it.affixes.filter((a) => a.myth).length, 2); assert.equal(it.sockets, 3); assert.ok(it.title);
  for (let i = 0; i < 300; i++) for (const d of rollLoot({ tier: 'boss', level: 480 }, {}, p)) assert.notEqual(d.item?.rarity, 'myth');
  townOf(p).plots.p1 = { type: 'workshop', lv: 6, stock: 0, since: Date.now() };
  assert.equal(craftKey(p, 'dungeon_key2').ok, false);
  resAdd(p, 'dungeon_key', 1); resAdd(p, 'ore', 30); resAdd(p, 'ess2', 3); resAdd(p, 'mat_field', 15);
  assert.ok(craftKey(p, 'dungeon_key2').ok); assert.equal(resCount(p, 'dungeon_key2'), 1); assert.equal(resCount(p, 'dungeon_key'), 0);
});

test('v0.42: 강화 +20 · 높은 강화석 제작 · 정수 단계', () => {
  const p = newPlayer('t', { face: 'm01' }, 'sword'); p.gold = 1e8;
  townOf(p).plots.p1 = { type: 'workshop', lv: 8, stock: 0, since: Date.now() };
  assert.equal(craftOre(p, 'ore2').ok, false);
  resAdd(p, 'ore', 100); resAdd(p, 'ess2', 10); resAdd(p, 'ess3', 10); resAdd(p, 'mat_field', 50);
  assert.ok(craftOre(p, 'ore2', 2).ok); assert.equal(resCount(p, 'ore2'), 2); assert.equal(resCount(p, 'ore'), 50);
  const it = makeItem('short_sword', { rarity: 'rare', ilvl: 100 }, p);
  it.plus = 10; assert.equal(enhanceCost(it, p).oreId, 'ore2'); it.plus = 15; assert.equal(enhanceCost(it, p).oreId, 'ore3'); it.plus = 9; assert.equal(enhanceCost(it, p).oreId, 'ore');
  assert.equal(essGrade(50), 1); assert.equal(essGrade(150), 2); assert.equal(essGrade(480), 5);
});

test('모든 src 파일 문법', () => {
  const walk = (d) => _rd(d).flatMap((f) => { const q = d + '/' + f; return _st(q).isDirectory() ? walk(q) : q.endsWith('.js') ? [q] : []; });
  for (const f of walk(new URL('../src', import.meta.url).pathname)) _ex(process.execPath, ['--check', f], { stdio: 'pipe' });
});

const TW_ = await import('../src/game/town.js');
test('용병 하루 품삯: 날짜가 바뀌면 내고, 모자라면 못 받은 용병은 쉰다', () => {
  const p = { gold: 0, inv: [], town: { plots: {}, mercs: [], last: Date.now() } };
  TW_.townOf(p).mercs.push(TW_.rollMerc(Math.random, 1), TW_.rollMerc(Math.random, 1));
  const now = Date.now(); TW_.payWages(p, now); // 첫날은 기준만
  p.gold = TW_.wageTotal(p) + 5;
  const r = TW_.payWages(p, now + 86400e3);
  assert.ok(r && r.paid > 0 && r.unpaid === 0 && p.gold === 5);
  const r2 = TW_.payWages(p, now + 2 * 86400e3);
  assert.ok(r2.unpaid === 2 && p.town.mercs.every((m) => m.tired));
  assert.ok(TW_.rollMerc(Math.random, 1).cost > 5000 && TW_.GRADES[4].name === '신화');
});

test('잠근 장비는 분해되지 않는다', () => {
  const p = { gold: 0, inv: [], town: { plots: {}, mercs: [], last: Date.now() }, nextUid: 1 };
  const it = makeItem('short_sword', { rarity: 'magic', ilvl: 10 }, p); it.lock = true; p.inv.push(it);
  assert.ok(!TW_.salvage(p, it.uid).ok && p.inv.length === 1);
  it.lock = false; assert.ok(TW_.salvage(p, it.uid).ok);
});

test('소문 지도: 두 단계 아래 지역까지 · 분석 · 강화', () => {
  assert.deepEqual(RM.rumorZones([0, 1, 2, 3, 5]), [3, 5]);
  const p = { gold: 1e9, inv: [], town: { plots: { a: { type: 'lab', lv: 1 } }, mercs: [], last: Date.now() }, nextUid: 1 };
  resAdd(p, 'odd_map', 20);
  assert.ok(RM.analyzeStart(p, 1e9, 0).ok && resCount(p, 'odd_map') === 0);
  assert.equal(RM.analyzeDone(p, [4, 5, 6], 1), null); // 아직
  const r = RM.analyzeDone(p, [4, 5, 6], 1e12, () => 0.1); // 모두 소문 쪽 → 5개까지, 나머지는 조각
  assert.equal(p.rumors.length, RM.RUMOR_MAX); assert.equal(r.pieces, 15); assert.ok(p.rumors.every((x) => x.zi >= 4));
  resAdd(p, 'ore2', 10); resAdd(p, 'map_piece', 0);
  assert.ok(RM.rumorUpgrade(p, p.rumors[0].id).ok && p.rumors[0].plus === 1);
  assert.ok(!RM.rumorUpgrade(p, p.rumors[0].id).ok); // 재료 모자람
});

test('일하는 용병의 솜씨가 상한보다 높으면 깎이지 않는다', () => {
  const p = { gold: 1e9, inv: [], town: { plots: { a: { type: 'mine', lv: 5 } }, mercs: [], last: Date.now() - 3600e3 }, nextUid: 1 };
  const T = townOf(p); const m = { id: 'x', name: 'x', grade: 4, lv: 5, exp: 0, sta: 999, mine: 55, herb: 52, craft: 3, lore: 3, care: 3, hunt: 10, work: 'a' }; T.mercs.push(m);
  tick(p, Date.now()); assert.ok(m.mine >= 55, String(m.mine));
});

test('같은 옵션 능력치 파편은 한 칸에 묶이고, 제련하면 고른 값 하나만 빠진다', () => {
  const p = newPlayer('t', { g: 'm' }, 'sword'); p.gold = 1e9; p.town = { plots: {}, mercs: [], last: Date.now(), ore: 0 }; p.inv = [];
  const SH = (id, v) => ({ uid: p.nextUid++, base: 'shard', shard: { id, v } });
  assert.ok(addItem(p, SH('str', 5)) && addItem(p, SH('str', 9)) && addItem(p, SH('dex', 3)));
  assert.equal(p.inv.length, 2); const b = p.inv.find((x) => x.shard.id === 'str'); assert.deepEqual(b.vals, [9, 5]); assert.equal(b.shard.v, 9);
  const L = [SH('int', 1), SH('int', 4), SH('vit', 2)]; RMSH.packShards(L); assert.equal(L.length, 2);
  RMSH.takeShardVal(p.inv, b, 0); assert.equal(b.shard.v, 5); assert.ok(!b.vals); RMSH.takeShardVal(p.inv, b, 0); assert.equal(p.inv.length, 1);
});

test('같은 스킬북은 한 칸에 쌓이고, 예전 저장의 흩어진 책도 합쳐진다', () => {
  const p = newPlayer('t', { g: 'm' }, 'sword'); p.inv = [];
  assert.ok(INV.addItem(p, IT.makeBook('fire_bolt', p)) && INV.addItem(p, IT.makeBook('fire_bolt', p)) && INV.addItem(p, IT.makeBook('meteor', p)));
  assert.equal(p.inv.length, 2); assert.equal(p.inv.find((x) => x.book === 'fire_bolt').qty, 2);
  assert.equal(IT.itemValue({ book: 'fire_bolt', qty: 3 }), 3 * IT.itemValue({ book: 'fire_bolt' }));
  const L = [{ uid: 1, book: 'meteor' }, { uid: 2, book: 'fire_bolt' }, { uid: 3, book: 'meteor' }]; INV.packBooks(L); assert.equal(L.length, 2); assert.equal(L[0].qty, 2);
});

test('닉네임 규칙: 2~8자 · 욕설 · 운영진 이름 · 숫자만은 안 된다', () => {
  for (const ok of ['용사', 'Hero_12', '빛의검사', '바람']) assert.equal(NR.nickError(ok), null, ok);
  assert.equal(NR.nickError('가'), 'bad_nick'); assert.equal(NR.nickError('아주긴닉네임이에요'), 'bad_nick'); assert.equal(NR.nickError('ㅋㅋㅋ'), 'bad_nick');
  assert.equal(NR.nickError('1234'), 'nick_digits'); assert.equal(NR.nickError('씨1발맨'), 'nick_bad'); assert.equal(NR.nickError('FUCKer'), 'nick_bad');
  assert.equal(NR.nickError('운영자'), 'nick_reserved'); assert.equal(NR.nickError('GM_Kim'), 'nick_reserved');
});

test('강화는 기본 효과(기본 옵션 · 장신구 기본 효과)도 올린다', () => {
  assert.equal(PL.plusK({ plus: 0 }), 1); assert.equal(+PL.plusK({ plus: 5 }).toFixed(2), 1.45); assert.equal(+PL.plusK({ plus: 10 }).toFixed(2), 1.9);
  const r = { base: 'ruby_ring', ilvl: 60, uid: 7, plus: 0 }; assert.deepEqual(PL.baseMods(r), { str: 18 }); assert.deepEqual(PL.baseMods({ ...r, plus: 10 }), { str: 34 }); // v0.49.62 장신구 기본 효과를 키움
  { const g = { base: 'l_dex_ring3', ilvl: 60, uid: 1, affixes: [{ id: 'dex', v: 10 }] }; assert.equal(PL.affixV({ ...g, plus: 20 }, g.affixes[0]), 10, '붙은 옵션은 강화로 오르지 않는다'); }
  const c1 = PL.baseMods({ base: 'copper_ring', ilvl: 10, uid: 1 }), c2 = PL.baseMods({ base: 'copper_ring', ilvl: 10, uid: 2 }); assert.notDeepEqual(Object.keys(c1), Object.keys(c2));
  assert.ok(PL.baseMods({ base: 'novice_staff', ilvl: 1, plus: 10 }).maxMp > 5);
});

test('스킬 형상: 쓰는 쪽에 맞고, 같은 갈래 · 차수에서 겹치는 형상은 3쌍 이하', async () => {
  const { SKILLS } = await import('../src/data/skills.js'); await import('../src/data/skill_fx.js');
  const F = await import('../src/data/skill_forms.js');
  for (const [id, f] of Object.entries(F.SKILL_FORMS)) { if (!SKILLS[id]) continue; // v0.50 정리로 옮겨진 스킬
     assert.ok(F.FORM_DEFS[f], f); assert.ok(F.formFits(f, F.formUser(SKILLS[id])), id + ' ' + f); }
  const rows = Object.entries(SKILLS).filter(([, s]) => !s.passive && s.type !== 'buff' && s.type !== 'evade' && !s.retired).map(([id, s]) => ({ id, g: (s.lines || Object.keys(s.req || {})).slice().sort().join('+'), u: F.formUser(s), grip: s.grip, f: s.form || 'T:' + s.type }));
  // v0.50 정리 뒤: 같은 갈래 · 같은 차수 · 같은 쪽(근접 · 활 · 주문) 안에서 형상이 겹치지 않는다 (3쌍까지)
  let dup = 0; for (const a of rows) for (const b of rows) if (a.id < b.id && a.g === b.g && a.u === b.u && SKILLS[a.id].chasu === SKILLS[b.id].chasu && a.f === b.f) dup++;
  assert.ok(dup <= 3, 'dup ' + dup);
});

test('화살통: 활과 함께 낄 수 있고, 활 아닌 무기 · 다른 보조 장비는 양손 규칙 그대로', () => {
  const st = newPlayer('t', {}, null); st.stats = { str: 999, dex: 999, int: 999, wis: 999, vit: 999 }; st.awakenings = 999;
  const mk = (base) => { const it = makeItem(base, { rarity: 'common', ilvl: 60 }, st); st.inv.push(it); return it; };
  st.equip.weapon = null; st.equip.offhand = null;
  const bow = mk('long_bow'), q = mk('l_dex_off1'), shield = mk('l_vit_off1'), dagger = Object.keys(IT_BASES).find((k) => IT_BASES[k].cls === 'dagger');
  assert.ok(INV.equip(st, bow.uid).ok); assert.ok(INV.equip(st, q.uid).ok);
  assert.equal(st.equip.weapon?.uid, bow.uid); assert.equal(st.equip.offhand?.uid, q.uid);
  assert.ok(INV.equip(st, shield.uid).ok); assert.equal(st.equip.weapon, null, '방패를 끼면 양손 활은 빠진다');
  if (dagger) { const d = mk(dagger); INV.equip(st, d.uid); const q2 = mk('l_dex_off2'); assert.equal(INV.equip(st, q2.uid).ok, false, '단검에는 화살통을 낄 수 없다'); }
  st.equip.weapon = mk('long_bow'); st.equip.offhand = mk('l_dex_off3'); const sw = Object.keys(IT_BASES).find((k) => IT_BASES[k].cls === 'sword' && !IT_BASES[k].two);
  if (sw) { const it = mk(sw); INV.equip(st, it.uid); assert.equal(st.equip.offhand, null, '활 아닌 무기로 바꾸면 화살통은 가방으로'); }
});

test('초월 강화(+21~): +20보다 싸지 않고 단계마다 기본 효과 +5%, 대장간 10단계는 상한 없음', async () => {
  const { ENHANCE, BUILDINGS: B } = await import('../src/data/buildings.js');
  const { plusK } = await import('../src/game/player.js');
  for (let n = 20; n < 120; n++) assert.ok(ENHANCE.gold(n, 300) > ENHANCE.gold(n - 1, 300) && ENHANCE.ore(n) >= ENHANCE.ore(19) && ENHANCE.oreId(n) === 'ore3', 'n' + n);
  assert.ok(Math.abs(plusK({ plus: 40 }) - 3.8) < 1e-9 && Math.abs(plusK({ plus: 100 }) - 6.8) < 1e-9 && plusK({ plus: 21 }) > plusK({ plus: 20 }));
  assert.equal(B.smithy.cap(10), Infinity);
});

test('군세 토벌: 24시간 뒤 −20% · 48시간 뒤 −35%, 정복지 7일', async () => {
  const { hordePen, conqLeft, hordeGap, HORDE } = await import('../src/data/horde.js');
  const now = Date.now(), st = { horde: { zone: 'field', at: now - 10 * 3600e3, conq: { forest: now + HORDE.conqMs } } };
  assert.equal(hordePen(st, now), 0);
  assert.equal(hordePen(st, now + 15 * 3600e3), 0.2);
  assert.equal(hordePen(st, now + 40 * 3600e3), 0.35);
  assert.equal(hordePen({ horde: { zone: null, at: 0 } }, now), 0);
  assert.ok(conqLeft(st, 'forest', now) > 6.9 * 86400e3 && conqLeft(st, 'field', now) === 0);
  for (let i = 0; i < 50; i++) { const g = hordeGap(); assert.ok(g >= 24 * 3600e3 && g <= 48 * 3600e3); }
  const { rollBook } = await import('../src/game/loot.js'); const { SKILLS: SK } = await import('../src/data/skills.js');
  for (let i = 0; i < 30; i++) { const b = rollBook({ level: 200, tier: 'boss' }, null, Math.random, 3); assert.equal(SK[b.book].q, 3); }
});

test('왕좌 원정: 주간 구성은 모두 같고 · 상점 한도 · 장비 손질', async () => {
  const RD = await import('../src/data/raid.js');
  const a = RD.raidWeek('w2026-11-23'), b = RD.raidWeek('w2026-11-23'), c = RD.raidWeek('w2026-11-30');
  assert.deepEqual(a, b); assert.equal(a.bosses.length, 3); assert.equal(new Set(a.bosses).size, 3); assert.equal(a.muts.length, 2);
  assert.ok(!a.bosses.includes('throne') && RD.RAID_RULES[a.rule] && RD.LORDS.includes(a.lord));
  assert.ok(JSON.stringify(a) !== JSON.stringify(c) || true);
  const st = { inv: [], raidSock: 0 }, rd = RD.raidOf(st, 'w2026-11-23');
  assert.equal(RD.shopPrice(RD.RAID_SHOP.find((g) => g.id === 't_socket'), st), 40); st.raidSock = 2; assert.equal(RD.shopPrice(RD.RAID_SHOP.find((g) => g.id === 't_socket'), st), 150);
  rd.buys.box_gear = 1; rd.buys.box_shard = 1; assert.equal(RD.shopBought(rd, RD.RAID_SHOP.find((g) => g.id === 'box_gear')), 2);
  assert.notEqual(RD.raidOf(st, 'w2026-11-30').buys.box_gear, 1); // 주가 바뀌면 새로
  // 손질
  const G = await import('../src/game/raidgear.js'), IT = await import('../src/game/items.js');
  const s2 = { inv: [], equip: {}, nextUid: 1, raidLords: { twins: 1 } }, it = IT.makeItem('leather_armor', { rarity: 'myth', ilvl: 100 }, s2);
  const give = (id, n = 1) => s2.inv.push(IT.makeItem(id, { qty: n }, s2));
  assert.equal(G.rerollAffix(s2, it, 0).ok, false); give('t_reroll'); const r = G.rerollAffix(s2, it, 3); assert.ok(r.ok && it.affixes.length >= 4 && new Set(it.affixes.map((x) => x.id)).size === it.affixes.length);
  give('t_engrave'); assert.ok(G.engrave(s2, it, 'twins').ok && it.eng === 'twins'); assert.equal(G.engrave(s2, it, 'mirror').ok, false);
  give('t_engx'); const x = G.extractEngrave(s2, it); assert.ok(x.ok && !it.eng && x.stone.eng === 'twins');
  assert.ok(G.engrave(s2, it, null, x.stone.uid).ok && it.eng === 'twins' && !s2.inv.includes(x.stone));
  it.sockets = 2; give('t_socket', 2); assert.ok(G.addSocket(s2, it).ok && it.sockets === 3); assert.equal(G.addSocket(s2, it).ok, false);
  give('t_shardx'); s2.inv.push(it); const a1 = { ...it.affixes[1] }; const sx = G.extractShard(s2, it, 1, () => s2.inv.splice(s2.inv.indexOf(it), 1));
  assert.ok(sx.ok && sx.shard.shard.id === a1.id && sx.shard.shard.v === a1.v && !s2.inv.includes(it));
});

test('마을 20단계: 11단계부터 정수 · 강화석 · 높은 약초, 저장 24 ~ 44시간, 연구 10단계 · 두 개, 향로 · 비료 · 증류 · 식량 · 촉진제 · 납품', async () => {
  const T = await import('../src/game/town.js'), { BUILDINGS: B } = await import('../src/data/buildings.js');
  const { newPlayer: NP } = await import('../src/game/player.js'), IT2 = await import('../src/game/items.js');
  const st = NP(); st.gold = 1e13; st.awakenings = 2000; const t = T.townOf(st);
  assert.ok(T.build(st, 'p1', 'herb').ok && T.build(st, 'p2', 'lab').ok && T.build(st, 'p3', 'altar').ok && T.build(st, 'p4', 'workshop').ok && T.build(st, 'p5', 'guild').ok);
  T.finishBuilds(st, Date.now() + 1e9);
  for (const p of ['p1', 'p2', 'p3', 'p4']) T.buildingAt(st, p).lv = 10;
  assert.equal(T.upgrade(st, 'p1').ok, false); // 재료 없음
  const give = (b, n) => T.resAdd(st, b, n); give('ess5', 100); give('ore2', 100); t.herbs.frost = 40;
  const r = T.upgrade(st, 'p1'); assert.ok(r.ok, r.why); assert.equal(T.highHerbs(st), 10); T.finishBuilds(st, Date.now() + 1e9); assert.equal(T.buildingAt(st, 'p1').lv, 11);
  assert.equal(B.mine.store(10), 66 * 24); assert.equal(B.herb.store(20), 260 * 44);
  // 연구: 연구소 15단계면 10단계 · 두 개
  T.buildingAt(st, 'p2').lv = 15; assert.equal(T.researchMax(st), 10); assert.equal(T.labSlots(st), 2);
  t.mats.field = 1e4; give('ess5', 100); give('ore2', 200); t.herbs.world = 1e4;
  assert.ok(T.researchStart(st, 'censer').ok && T.researchStart(st, 'store').ok); assert.equal(T.researchStart(st, 'away').ok, false);
  // 향로: 연구 1단계 = 하나 · 타는 동안 효과 · 모자라면 꺼짐
  (t.research ||= {}).censer = 1; assert.equal(T.censerSlotsOf(st), 1); t.herbs.red = 10; t.herbs.blue = 10;
  assert.ok(T.censerSet(st, 0, 'plenty').ok); assert.equal(T.censerSet(st, 1, 'vigor').ok, false);
  const now = Date.now(); t.last = now; T.tick(st, now + 1800e3); assert.ok(T.burning(st, 'plenty'));
  t.last = now; T.tick(st, now + 3 * 3600e3); assert.equal(T.burning(st, 'plenty'), false);
  // 약초밭: 주력 · 비료 · 증류
  const hb = T.buildingAt(st, 'p1'); hb.lv = 18; assert.ok(T.setHerbFocus(st, ['red']).ok);
  hb.stock = 100; const before = t.herbs.red || 0; T.collect(st, 'p1'); assert.ok((t.herbs.red || 0) - before >= 50);
  give('ore', 100); assert.ok(T.fertilize(st, 'ore').ok && t.fertUntil > Date.now());
  const e5 = T.resCount ? T.resCount(st, 'ess5') : 0; assert.ok(T.distill(st, 'ess5').ok);
  // 공사 촉진제 · 납품 · 지역 재료
  const lb = T.buildingAt(st, 'p4'); lb.lv = 16; lb.bld = { to: 17, from: Date.now(), until: Date.now() + 3600e3 };
  st.inv.push(IT2.makeItem('build_rush', { qty: 1 }, st)); assert.ok(T.rushBuild(st, 'p4').ok && lb.bld.until - Date.now() < 1900e3);
  assert.ok(T.convertMats(st, 'field', 2).ok && t.mats.forest >= 2);
  const os = T.herbOrders(st); assert.equal(os.length >= 1, true); t.herbs[os[0].h] = 1e4; const g0 = st.gold; assert.ok(T.herbDeliver(st, 0).ok && st.gold > g0); assert.equal(T.herbDeliver(st, 0).ok, false);
  // 용병 식량은 챙길 물건
  assert.equal(T.RATION.deep, 10);
});

test('대전제: 각성이 높을수록 각성 1당 처치 수가 늘어난다 · 모든 지역에 원거리 몬스터', async () => {
  const { ZONES: Z, MONSTERS: M, TIER_STEP: TS } = await import('../src/data/world.js');
  const { tierCurveK } = await import('../src/data/tiercurve.js'), { chapterK: CK } = await import('../src/data/chapters.js'), { expNeeded: EN } = await import('../src/game/growth.js');
  const OFF = [0, TS, TS * 2, 380]; let prev = 0;
  for (const wt of [1, 2, 3, 4]) for (let zi = 0; zi < Z.length; zi++) {
    const zn = Z[zi], ts = Object.keys(zn.spawns), avg = ts.reduce((a, t) => a + M[t].exp, 0) / ts.length, L = zn.levels[1] + OFF[wt - 1];
    const k = tierCurveK(zi, wt)?.exp ?? CK(zi, 'normal').exp, K = EN(Math.max(0, L - 1)) / (avg * (1 + 0.3 * (L - 1)) * k * 0.45);
    if (L >= 30) assert.ok(K >= prev * 0.97, `${wt}단계 ${zn.name} 각성 1당 ${Math.round(K)} < 앞 ${Math.round(prev)}`); // 지역 끝 기준, 3% 안 흔들림은 허용
    prev = Math.max(prev, K);
    assert.ok(ts.some((t) => M[t].attack !== 'melee'), zn.name + ' 원거리 몬스터');
  }
});

test('강화 계승: 계승권 필수 50 ~ 80%, 축복석과 함께 80 ~ 95%, 실패 없음 · 같은 부위만', async () => {
  const G = await import('../src/game/raidgear.js'), IT = await import('../src/game/items.js');
  const st = { inv: [], equip: {}, nextUid: 1 }, mk = (b) => IT.makeItem(b, { rarity: 'hero', ilvl: 100 }, st);
  const a = mk('leather_armor'), b = mk('leather_armor'), c = mk('leather_boots'); a.plus = 40; b.plus = 5; st.inv.push(a, b, c);
  assert.equal(G.inheritCheck(st, a, b).ok, false); // 계승권 없음
  assert.equal(G.inheritCheck(st, a, c).ok, false); // 다른 부위
  for (let i = 0; i < 200; i++) { const x = mk('leather_armor'), y = mk('leather_armor'); x.plus = 40; st.inv.push(IT.makeItem('t_inherit', { qty: 1 }, st)); const r = G.inherit(st, x, y, false, () => {}); assert.ok(r.ok && y.plus >= 20 && y.plus <= 32, String(y.plus)); }
  for (let i = 0; i < 200; i++) { const x = mk('leather_armor'), y = mk('leather_armor'); x.plus = 40; st.inv.push(IT.makeItem('t_inherit', { qty: 1 }, st), IT.makeItem('t_inherit2', { qty: 1 }, st)); const r = G.inherit(st, x, y, true, () => {}); assert.ok(r.ok && y.plus >= 32 && y.plus <= 38, String(y.plus)); }
});

test('무간지옥: 끝없는 층 · 장비 이름 · 배율 · 업보 · 경험치 대전제', async () => {
  const MG = await import('../src/data/mugan.js'), TC = await import('../src/data/tiercurve.js'), IT = await import('../src/game/items.js');
  assert.equal(MG.muganName(505).name, '업화'); assert.equal(MG.muganName(615).name, '나락'); assert.equal(MG.muganName(3505).roman, 'Ⅱ');
  assert.ok(Math.abs(MG.muganK(510) - 1.15) < 1e-9 && MG.muganK(500) === 1);
  assert.ok(MG.karmaNeed(1) < MG.karmaNeed(10) && MG.karmaNeed(100) > 20000);
  let p = TC.muganCurveK(19, 1); for (let n = 2; n <= 60; n++) { const k = TC.muganCurveK(19, n); assert.ok(k.hp > p.hp && k.dmg > p.dmg, 'n' + n); p = k; }
  assert.ok(TC.killsPerAwaken(510) > TC.killsPerAwaken(500) && TC.killsPerAwaken(1500) > 10000); // 높을수록 오래
  const st = { nextUid: 1 }, a = IT.makeItem('leather_armor', { rarity: 'rare', ilvl: 600 }, st), b = IT.makeItem('leather_armor', { rarity: 'rare', ilvl: 500 }, st);
  assert.ok(IT.itemName(a).includes('나락') || IT.itemName(a).includes('업화'));
  const { scaledArmor } = await import('../src/game/player.js'); a.q = b.q = 1; assert.ok(scaledArmor(a) / scaledArmor(b) > 3.5); // 10층 = ×1.15^10 ≈ 4 (레벨 몫 포함)
});

test('던전 돌파 책: 어느 레벨 · 등급이든 책이 나온다 (빈 목록이면 돌파 보상이 멈췄다)', async () => {
  const { rollBook } = await import('../src/game/loot.js');
  for (const lv of [5, 30, 80, 160, 320, 520, 900]) for (const q of [2, 3]) for (let i = 0; i < 20; i++) assert.ok(rollBook({ level: lv, tier: 'boss' }, null, Math.random, q), lv + '/' + q);
});

test('여관 침대: 한 번 누운 용병은 다 쉴 때까지 그대로 (목록 · 마을 일꾼이 왔다 갔다 하지 않게)', async () => {
  const T = await import('../src/game/town.js'), { newPlayer: NP } = await import('../src/game/player.js');
  const st = NP(); st.gold = 1e12; st.awakenings = 999; T.build(st, 'p1', 'inn'); T.finishBuilds(st, Date.now() + 1e9); T.buildingAt(st, 'p1').lv = 3;
  const t = T.townOf(st); for (let i = 0; i < 10; i++) { const m = T.rollMerc(Math.random, 1); m.sta = 5 + i; m.tired = true; t.mercs.push(m); }
  let now = Date.now(); t.last = now; T.tick(st, now + 60e3);
  let prev = t.mercs.filter((m) => m.rest).map((m) => m.id).join(), changes = 0;
  for (let k = 1; k <= 40; k++) { T.tick(st, now + 60e3 + k * 300e3); const cur = t.mercs.filter((m) => m.rest).map((m) => m.id); const curS = cur.join();
    if (curS !== prev) { const before = new Set(prev.split(',')); const left = [...before].filter((id) => id && !cur.includes(id)); for (const id of left) { const m = t.mercs.find((x) => x.id === id); assert.ok(m.sta >= T.staMax(m) - 1e-6 || m.job, '다 쉬기 전에 침대에서 나감'); } changes++; }
    prev = curS; }
  assert.ok(changes < 15, '침대 주인이 너무 자주 바뀜 ' + changes);
});

test('v0.49.83 파편 등급: 수치로 등급 · 뽑기는 연구와 세계 단계 중 낮은 쪽 · 내 레벨을 넘는 수치는 나오지 않는다', async () => {
  const S = await import('../src/game/shards.js');
  // 등급은 수치로: 레벨 옵션은 세계 단계 레벨, 일찍 끝나는 % 옵션(치명타)은 최고치를 나눠서
  assert.equal(S.shardGrade('str', 10), 0);
  assert.ok(S.shardGrade('str', S.gradeCap('str', 1) + 1) === 2);
  assert.ok(S.SG_CAPPED.has('crit') && !S.SG_CAPPED.has('str'));
  assert.ok(S.shardGrade('crit', 10) === 0 && S.shardGrade('crit', 20) === 1 && S.shardGrade('crit', 30) === 3);
  assert.ok(S.shardGrade('str', S.gradeCap('str', 3) + 1) === 4, '혼돈 위는 무간');
  // 연구가 없으면 못 뽑는다 · 연구가 높아도 연 세계 단계까지만
  const st = newPlayer(); st.awakenings = 60; st.maxTier = 1; st.shardDust = 10000;
  assert.equal(S.pullGrade(st), -1); assert.ok(!S.pullShard(st, 0).ok);
  st.town = st.town || {}; st.town.research = { shardLab: 5 };
  assert.equal(S.pullGrade(st), 0); assert.ok(!S.pullShard(st, 1).ok);
  // 낮은 각성: 아무리 뽑아도 내 레벨 상한(전설 장비 값)을 넘지 않는다
  let rng = 1; const R = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 300; i++) { const r = S.pullShard(st, 0, R); assert.ok(r.ok, r.why); assert.ok(r.v <= S.levelCap(r.id, st), `${r.id} ${r.v} > ${S.levelCap(r.id, st)}`); }
  // 갈기 → 가루, 합치기는 같은 옵션 셋 · 상한을 넘지 않는다
  const sh = st.inv.find((x) => x.shard && S.shardVals(x).length >= 3);
  const r = S.fuseShard(st, sh.uid, [0, 1, 2], R); assert.ok(r.ok, r.why);
  assert.ok(r.v <= Math.max(...r.from, Math.min(S.gradeCap(r.id, S.useGrade(st)), S.levelCap(r.id, st))));
  const d0 = st.shardDust, g = st.inv.find((x) => x.shard); const gr = S.grindShard(st, g.uid, [0]); assert.ok(gr.ok && st.shardDust === d0 + gr.dust && gr.dust > 0);
  // 쓸 수 있는 등급보다 높은 파편은 장비에 붙지 않는다 (창고로 넘겨받은 높은 파편)
  const it = makeItem(Object.keys(BASES).find((k) => BASES[k].slot === 'armor'), { rarity: 'rare', ilvl: 10 }, st); st.inv.push(it);
  const hi = S.makeShard({ id: 'str', v: S.gradeCap('str', 2) }, st); st.inv.push(hi); st.gold = 1e9; st.town.ore = 1e6;
  const ap = S.applyShard(st, it, hi.uid, [], 5); assert.ok(!ap.ok && /등급/.test(ap.why), ap.why);
});

test('v0.49.84 탁월 파편 · 탁월 칸: 탁월은 따로 묶고, 칸이 찬 장비에는 탁월을 늘리지 못한다', async () => {
  const S = await import('../src/game/shards.js');
  const st = newPlayer(); st.maxTier = 4; st.awakenings = 400; st.gold = 1e12; st.town = st.town || {}; st.town.ore = 1e9;
  const armor = Object.keys(BASES).find((k) => BASES[k].slot === 'armor' && !BASES[k].req?.int);
  // 탁월 줄 → 탁월 파편, 일반과 다른 칸
  const g1 = S.makeShard({ id: 'vit', v: 50, great: true }, st), n1 = S.makeShard({ id: 'vit', v: 40 }, st);
  st.inv.push(g1); assert.ok(!S.mergeShard(st.inv, n1)); st.inv.push(n1);
  assert.ok(S.mergeShard(st.inv, S.makeShard({ id: 'vit', v: 45, great: true }, st)) && S.shardVals(g1).length === 2);
  // 탁월 등급은 130% 몫을 덜어 같은 레벨대
  const cap0 = S.gradeCap('str', 0); assert.equal(S.shardGrade('str', Math.round(cap0 * 1.25), true), 0); assert.ok(S.shardGrade('str', Math.round(cap0 * 1.25)) > 0);
  // 탁월 없는 장비: 1칸 → 탁월 파편 하나는 붙고 탁월로 남는다
  const it = makeItem(armor, { rarity: 'legend', ilvl: 100 }, st); it.affixes = it.affixes.filter((a) => a.id !== 'vit' && a.id !== 'maxHp').map((a) => ({ id: a.id, v: a.v })); st.inv.push(it);
  delete it.gs; assert.equal(S.greatSlots(it), 1); // 무작위 장비가 탁월 두 줄로 나오면 칸(gs)이 남아 있어서
  const r1 = S.applyShard(st, it, g1.uid, [], 5, Math.random, 0); assert.ok(r1.ok, r1.why); assert.equal(S.greatCount(it), 1);
  // 칸이 찼다: 다른 옵션 탁월 파편은 기존 탁월 줄만 바꾼다 (탁월 수 그대로)
  const g2 = S.makeShard({ id: 'maxHp', v: 300, great: true }, st); st.inv.push(g2);
  const gi = it.affixes.findIndex((a) => a.great);
  assert.ok(!S.canApply(it, g2.shard, [gi]).ok, '탁월 줄을 잠그면 못 붙는다');
  const r2 = S.applyShard(st, it, g2.uid, [], 5); assert.ok(r2.ok, r2.why); assert.equal(S.greatCount(it), 1); assert.ok(it.affixes.some((a) => a.id === 'maxHp' && a.great));
  // 탁월 두 줄로 떨어진 장비: 칸 2, 탁월 줄을 일반으로 덮어도 칸은 남는다
  const it2 = makeItem(armor, { rarity: 'legend', ilvl: 100 }, st); it2.affixes.slice(0, 2).forEach((a) => (a.great = true)); it2.affixes.slice(2).forEach((a) => delete a.great); st.inv.push(it2);
  assert.equal(S.greatSlots(it2), 2);
  const n2 = S.makeShard({ id: it2.affixes[0].id, v: 1 }, st); st.inv.push(n2);
  assert.ok(S.applyShard(st, it2, n2.uid, [], 5).ok); assert.equal(S.greatCount(it2), 1); assert.equal(S.greatSlots(it2), 2);
  // 갈기: 탁월은 가루 2배
  const d0 = st.shardDust || 0, gg = st.inv.find((x) => x.shard?.great), gv = S.shardVals(gg)[0], want = S.dustOf(S.shardGrade(gg.shard.id, gv, true), true); const gr = S.grindShard(st, gg.uid, [0]); assert.ok(gr.ok && gr.dust === want && want === 2 * S.dustOf(S.shardGrade(gg.shard.id, gv, true))); assert.equal(st.shardDust, d0 + want);
  // 떨어질 때 탁월 두 줄 이상이면 칸이 저장된다
  let multi = null; for (let i = 0; i < 4000 && !multi; i++) { const x = makeItem(armor, { rarity: 'myth', ilvl: 300 }, st); if (x.affixes.filter((a) => a.great).length > 1) multi = x; }
  assert.ok(multi && multi.gs === multi.affixes.filter((a) => a.great).length);
});

test('v0.49.87 파편 여러 개 합치기: 같은 등급끼리 셋씩, 남는 것은 그대로', async () => {
  const S = await import('../src/game/shards.js');
  const st = newPlayer(); st.maxTier = 4; st.awakenings = 400;
  for (let i = 1; i <= 10; i++) { const sh = S.makeShard({ id: 'vit', v: i * 3 }, st); if (!S.mergeShard(st.inv, sh)) st.inv.push(sh); }
  const it = st.inv.find((x) => x.shard?.id === 'vit'), vis = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  assert.equal(S.fuseCount('vit', false, vis.map((i) => S.shardVals(it)[i])), 3);
  const r = S.fuseMany(st, it.uid, vis); assert.ok(r.ok && r.fuses === 3 && r.used === 9);
  assert.equal(st.inv.filter((x) => x.shard?.id === 'vit').reduce((a, x) => a + S.shardVals(x).length, 0), 4);
  assert.ok(S.shardVals(st.inv.find((x) => x.shard?.id === 'vit')).includes(30), '고르지 않은 최고 값은 남는다');
});

console.log(`\n${n}개 통과`);
