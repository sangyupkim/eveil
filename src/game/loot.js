// 몬스터 드랍과 사망 시 아이템 드랍
import { CONFIG, LOOT } from '../data/config.js';
import { SKILLS } from '../data/skills.js';
import { ZONE_SCHOOLS } from '../data/skills_more.js';
import { SLOTS } from '../data/items.js';
import { R, randInt, chance, weighted, pick } from './rng.js';
import { rollShard, SHARD } from './shards.js';
import { makeItem, makeBook, rollBase, rollRarity, isStack, makeNamed, namedOf } from './items.js';
import { NAMED_CHANCE, GEM_DROP, GEMS, GEM_GRADES, gemId, gemGradeFor } from '../data/legends.js';

// 각성 등급 1 · 2 · 3 · 4가 정해진 스킬북이 나오기 시작하는 몬스터 레벨
const AWAKEN_LV = [20, 60, 150, 300, 420]; // v0.42 전직 단계와 같게
const BOOK_AW = [20, 60, 150, 300, 500]; // v0.50 책 차수 (권장 각성)
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
  // 보스 · 네임드는 높은 레벨에서도 장비 확률을 깎지 않는다 (v0.42.7: 300레벨 필드 보스가 85% 빈손이던 문제)
  // v0.42.9: 장비가 나올 확률은 몬스터 레벨과 상관없이 같다 (높은 곳은 영웅 · 전설 비율만 줄어든다, 아래 rr)
  // v0.44.24 정예: 장비가 더 자주 (초반 레벨 50까지 30% → 높은 곳 15%) — 강화 몹을 잡아도 빈손이던 것
  const ic = mon.tier === 'elite' ? Math.max(0.15, 0.3 - Math.max(0, mon.level - 50) * 0.0005) : t.itemChance;
  if (chance(ic * dropMult, rng)) {
    const n = randInt(t.items[0], t.items[1], rng);
    for (let i = 0; i < n; i++) {
      // 보스는 가끔 장비 대신 능력치 파편
      const rr = { ...t.rarity, hero: (t.rarity.hero || 0) * rareK, legend: (t.rarity.legend || 0) * rareK * rareK }; // 높은 곳의 영웅 · 전설은 더 드물다
      const rarity = rollRarity(rr, opt.magicFind || 0, rng, mon.tier === 'elite' ? 0.02 : 0.05); // v0.44.25 정예는 전설 보너스 +2%p까지
      out.push({ kind: 'item', item: makeItem(rollBase(mon.level, rng), { rarity, ilvl: mon.level }, st, rng) });
    }
  }
  // 능력치 파편: 네임드 · 보스는 장비와 따로 가끔 (v0.42.8, 예전엔 보스 장비 하나가 파편으로 바뀌었다)
  if (t.shard && chance(t.shard * dropMult * (1 + 0.2 * (st?.town?.research?.shard || 0)), rng)) out.push({ kind: 'item', item: rollShard(mon.level, st, rng) });
  // 물약
  if (chance(t.potion * dropMult, rng)) {
    const big = mon.level >= 8 && chance(0.5, rng);
    const id = (chance(0.6, rng) ? 'hp_potion' : 'mp_potion') + (big ? '_l' : '');
    out.push({ kind: 'item', item: makeItem(id, { qty: 1 }, st) });
  }
  // v0.50 스킬북: 그 사냥터 권장 각성(몬스터 레벨 − 1)의 차수 — 그 차수 70% · 아래 차수 25% · 다음 차수 5% (보스 · 네임드 15%)
  //  등급 하품 6 · 중품 3 · 상품 1 (보스 · 네임드는 상품 ×3). 이미 배운 스킬은 ×0.5. 혼합 스킬은 보스 · 네임드만. 단검(dg_)은 등급(tier)으로 같이 섞는다
  if (chance(Math.min(1, t.book * dropMult * (CONFIG.bookDrop ?? 1)), rng)) {
    const zs = ZONE_SCHOOLS[mon.sp?.zone?.id] || [];
    const big = mon.tier === 'named' || mon.tier === 'boss';
    const rec = Math.max(0, Math.round((mon.level || 1) - 1)), cRec = Math.max(1, BOOK_AW.filter((lv) => rec >= lv).length);
    const r = rng();
    let c = cRec;
    if (cRec < 5 && r < (big ? 0.15 : 0.05)) c = cRec + 1;
    else if (cRec > 1 && r > 0.75) c = 1 + Math.floor(rng() * (cRec - 1));
    const g = Number(weighted(big ? { 1: 6, 2: 3, 3: 3 } : { 1: 6, 2: 3, 3: 1 }, rng));
    const cOf = (sk) => sk.chasu || Math.max(1, Math.min(5, (sk.tier || 1) - 1));
    let pool = Object.keys(SKILLS).filter((id) => { const sk = SKILLS[id]; return !sk.passive && cOf(sk) === c && (sk.q || 2) === g && (big || !(sk.lines?.length > 1)); });
    if (!pool.length) pool = Object.keys(SKILLS).filter((id) => !SKILLS[id].passive && cOf(SKILLS[id]) === c);
    const wts = pool.flatMap((id) => { const w = (zs.includes(SKILLS[id].school) ? 3 : 1) * (st?.skills?.[id] ? 0.5 : 1) * 2; return Array(Math.max(1, Math.round(w))).fill(id); });
    if (wts.length) out.push({ kind: 'item', item: makeBook(pick(wts, rng), st) });
  }
  // 이름 있는 전설 (지역 보스 · 드물게 네임드)
  const zid = mon.sp?.zone?.id, nc = mon.dungeon ? (mon.tier === 'boss' ? NAMED_CHANCE.dungeon : 0) : NAMED_CHANCE[mon.tier] || 0;
  if (zid && nc && chance(nc * dropMult, rng)) { const pool = namedOf(zid); if (pool.length) out.push({ kind: 'item', item: makeNamed(pick(pool, rng), st, mon.level) }); }
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
