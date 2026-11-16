// 몬스터 드랍과 사망 시 아이템 드랍
import { CONFIG, LOOT } from '../data/config.js';
import { skillsOfTier, SKILLS } from '../data/skills.js';
import { ZONE_SCHOOLS } from '../data/skills_more.js';
import { SLOTS } from '../data/items.js';
import { R, randInt, chance, weighted, pick } from './rng.js';
import { rollShard, SHARD } from './shards.js';
import { makeItem, makeBook, rollBase, rollRarity, isStack, makeNamed, namedOf } from './items.js';
import { NAMED_CHANCE, GEM_DROP, GEMS, GEM_GRADES, gemId, gemGradeFor } from '../data/legends.js';

// 각성 등급 1 · 2 · 3 · 4가 정해진 스킬북이 나오기 시작하는 몬스터 레벨
const AWAKEN_LV = [20, 60, 150, 300, 420]; // v0.42 전직 단계와 같게
// mon: { tier, level }, opt: { auto, magicFind, goldFind }
export function rollLoot(mon, opt = {}, st = null, rng = R) {
  const t = LOOT[mon.tier];
  const dropMult = opt.auto ? CONFIG.autoDrop ?? 0.3 : 1;
  const out = [];
  // 골드
  if (chance(t.gold[0] * dropMult, rng)) {
    const amount = Math.round(randInt(3, 8, rng) * mon.level * t.gold[1] * (opt.goldFind || 1));
    out.push({ kind: 'gold', amount });
  }
  // 장비: 레벨이 높을수록 드물다 (레벨 1 ×1 → 100 ×0.73 → 200 ×0.46, 최소 ×0.4)
  const rareK = Math.max(0.35, 1 - (mon.level - 1) / 600); // 레벨 100 ×0.84 · 200 ×0.67 · 360 ×0.4
  if (chance(t.itemChance * dropMult * rareK, rng)) {
    const n = randInt(t.items[0], t.items[1], rng);
    for (let i = 0; i < n; i++) {
      // 보스는 가끔 장비 대신 능력치 파편
      if (mon.tier === 'boss' && rng() < SHARD.bossChance * (1 + 0.2 * (st?.town?.research?.shard || 0))) { out.push({ kind: 'item', item: rollShard(mon.level, st, rng) }); continue; }
      const rr = { ...t.rarity, hero: (t.rarity.hero || 0) * rareK, legend: (t.rarity.legend || 0) * rareK * rareK }; // 높은 곳의 영웅 · 전설은 더 드물다
      const rarity = rollRarity(rr, opt.magicFind || 0, rng);
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
  if (chance(Math.min(1, t.book * dropMult * (CONFIG.bookDrop ?? 1)), rng)) {
    const tier = Number(weighted(t.bookTiers, rng));
    const zs = ZONE_SCHOOLS[mon.sp?.zone?.id] || [];
    const big = mon.tier === 'named' || mon.tier === 'boss';
    // 각성 등급이 정해진 스킬북: 몬스터 레벨이 그 등급에 닿으면 가끔 (네임드 · 보스는 더 자주). 차수는 그 레벨에서 나올 수 있는 것 중 높을수록 자주
    const awMax = AWAKEN_LV.filter((lv) => mon.level >= lv).length;
    if (awMax && chance(big ? 0.35 : 0.12, rng)) {
      const n = Number(weighted(Object.fromEntries(Array.from({ length: awMax }, (_, i) => [i + 1, i + 1])), rng));
      const ap = Object.keys(SKILLS).filter((id) => SKILLS[id].awaken === n);
      if (ap.length) out.push({ kind: 'item', item: makeBook(pick(ap, rng), st) });
    }
    // (v0.39.6: 위에서 바로 return 해서 이름 있는 전설 · 보석 굴림을 건너뛰던 오류)
    if (!out.some((d) => d.item?.book)) {
    const pool = skillsOfTier(tier).filter((id) => big || SKILLS[id].school !== 'mix').flatMap((id) => (zs.includes(SKILLS[id].school) ? [id, id, id] : [id]));
    if (pool.length) out.push({ kind: 'item', item: makeBook(pick(pool, rng), st) });
    }
  }
  // 이름 있는 전설 (지역 보스 · 드물게 네임드)
  const zid = mon.sp?.zone?.id, nc = mon.dungeon ? (mon.tier === 'boss' ? NAMED_CHANCE.dungeon : 0) : NAMED_CHANCE[mon.tier] || 0;
  if (zid && nc && chance(nc, rng)) { const pool = namedOf(zid); if (pool.length) out.push({ kind: 'item', item: makeNamed(pick(pool, rng), st, mon.level) }); }
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
