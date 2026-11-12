// 몬스터 드랍과 사망 시 아이템 드랍
import { CONFIG, LOOT } from '../data/config.js';
import { skillsOfTier, SKILLS } from '../data/skills.js';
import { ZONE_SCHOOLS } from '../data/skills_more.js';
import { SLOTS } from '../data/items.js';
import { R, randInt, chance, weighted, pick } from './rng.js';
import { rollShard, SHARD } from './shards.js';
import { makeItem, makeBook, rollBase, rollRarity, isStack, makeNamed, namedOf } from './items.js';
import { NAMED_CHANCE, GEM_DROP, GEMS, GEM_GRADES, gemId, gemGradeFor } from '../data/legends.js';

// mon: { tier, level }, opt: { auto, magicFind, goldFind }
export function rollLoot(mon, opt = {}, st = null, rng = R) {
  const t = LOOT[mon.tier];
  const dropMult = opt.auto ? CONFIG.autoPenalty : 1;
  const out = [];
  // 골드
  if (chance(t.gold[0] * dropMult, rng)) {
    const amount = Math.round(randInt(3, 8, rng) * mon.level * t.gold[1] * (opt.goldFind || 1));
    out.push({ kind: 'gold', amount });
  }
  // 장비
  if (chance(t.itemChance * dropMult, rng)) {
    const n = randInt(t.items[0], t.items[1], rng);
    for (let i = 0; i < n; i++) {
      // 보스는 가끔 장비 대신 능력치 파편
      if (mon.tier === 'boss' && rng() < SHARD.bossChance) { out.push({ kind: 'item', item: rollShard(mon.level, st, rng) }); continue; }
      const rarity = rollRarity(t.rarity, opt.magicFind || 0, rng);
      out.push({ kind: 'item', item: makeItem(rollBase(mon.level, rng), { rarity, ilvl: mon.level }, st, rng) });
    }
  }
  // 물약
  if (chance(t.potion * dropMult, rng)) {
    const big = mon.level >= 8 && chance(0.5, rng);
    const id = (chance(0.6, rng) ? 'hp_potion' : 'mp_potion') + (big ? '_l' : '');
    out.push({ kind: 'item', item: makeItem(id, { qty: 1 }, st) });
  }
  // 스킬북 — 강한 몬스터일수록 높은 등급
  if (chance(Math.min(1, t.book * dropMult), rng)) {
    const tier = Number(weighted(t.bookTiers, rng));
    const zs = ZONE_SCHOOLS[mon.sp?.zone?.id] || [];
    const big = mon.tier === 'named' || mon.tier === 'boss';
    const pool = skillsOfTier(tier).filter((id) => big || SKILLS[id].school !== 'mix').flatMap((id) => (zs.includes(SKILLS[id].school) ? [id, id, id] : [id]));
    if (pool.length) out.push({ kind: 'item', item: makeBook(pick(pool, rng), st) });
  }
  // 이름 있는 전설 (지역 보스 · 드물게 네임드)
  const zid = mon.sp?.zone?.id, nc = mon.dungeon ? (mon.tier === 'boss' ? NAMED_CHANCE.dungeon : 0) : NAMED_CHANCE[mon.tier] || 0;
  if (zid && nc && chance(nc, rng)) { const pool = namedOf(zid); if (pool.length) out.push({ kind: 'item', item: makeNamed(pick(pool, rng), st) }); }
  // 보석: 깊은 곳일수록 높은 등급
  if (chance((GEM_DROP[mon.tier] || 0) * dropMult, rng)) {
    const k = gemGradeFor(mon.level, rng);
    out.push({ kind: 'item', item: makeItem(gemId(pick(Object.keys(GEMS), rng), k), { qty: 1 }, st) });
  }
  return out;
}

// 사망: 확률적으로 아이템 1개(착용 장비 또는 가방 속 장비·스킬북)를 잃는다.
// 물약 같은 소모품은 떨어뜨리지 않는다. 떨어진 아이템을 돌려준다(없으면 null).
export function rollDeathDrop(st, rng = R) {
  if (!chance(CONFIG.deathDropChance, rng)) return null;
  const cands = [];
  for (const s of SLOTS) if (st.equip[s]) cands.push([{ where: 'equip', slot: s }, CONFIG.deathDropEquippedWeight]);
  for (const it of st.inv) if (!isStack(it)) cands.push([{ where: 'inv', uid: it.uid }, CONFIG.deathDropBagWeight]);
  if (!cands.length) return null;
  const c = weighted(cands, rng);
  if (c.where === 'equip') {
    const it = st.equip[c.slot];
    st.equip[c.slot] = null;
    return it;
  }
  const i = st.inv.findIndex((x) => x.uid === c.uid);
  return st.inv.splice(i, 1)[0];
}
