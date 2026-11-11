// 게임 로직 점검 (화면 없이). npm test
import assert from 'node:assert/strict';
import { newPlayer, derive, chooseStart } from '../src/game/player.js';
import { STARTS, START_BONUS } from '../src/data/items.js';
import { addAP, gainExp, distribute, expNeeded, rewardFactor } from '../src/game/growth.js';
import { learn, addSkillExp, canLearn } from '../src/game/skills.js';
import { rollLoot, rollDeathDrop } from '../src/game/loot.js';
import { makeItem, itemName } from '../src/game/items.js';
import { addItem, equip } from '../src/game/inventory.js';
import { seeded } from '../src/game/rng.js';
import { CONFIG, STATS } from '../src/data/config.js';
import { SKILLS } from '../src/data/skills.js';
import { BASES } from '../src/data/items.js';
import { MONSTERS, ZONES } from '../src/data/world.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✓', name); };

test('새 캐릭터: 스탯 5종 모두 시작값, 레벨 없음', () => {
  const p = newPlayer('방랑자', 'knight', null);
  assert.deepEqual(Object.keys(p.stats), STATS);
  for (const s of STATS) assert.equal(p.stats[s], CONFIG.startStat);
  assert.equal(p.level, undefined);
  assert.equal(p.equip.weapon, null);
  assert.equal(p.tut, 0);
});

test('처음 무기 고르기: 무기 + 주 스탯 +2, 첫 스킬북을 바로 배울 수 있다', () => {
  for (const id in STARTS) {
    const p = newPlayer('방랑자', 'knight', null);
    chooseStart(p, id);
    assert.equal(BASES[p.equip.weapon.base].cls, id);
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
      if (d.item?.book) { books++; bookTier += SKILLS[d.item.book].tier; }
      if (d.item && ['hero', 'legend'].includes(d.item.rarity)) good++;
    }
    return { books: books / N, tier: books ? bookTier / books : 0, good: good / N };
  };
  const nrm = stat('normal', 20000), boss = stat('boss', 2000);
  assert.ok(nrm.books < 0.02 && boss.books >= 1);
  assert.ok(boss.tier > 3 && nrm.tier <= 1);
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
  const gs = makeItem('greatsword', { rarity: 'rare', ilvl: 5 }, p); addItem(p, gs);
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

console.log(`\n${n}개 통과`);
