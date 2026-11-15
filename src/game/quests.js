// 퀘스트 진행 (화면과 무관한 규칙)
import { QUESTS, QUEST_BOOKS } from '../data/quests.js';
import { BASES } from '../data/items.js';
import { MONSTERS, ZONES } from '../data/world.js';
import { makeItem, makeBook } from './items.js';
import { meetsReq } from './skills.js';
import { totalStats } from './player.js';
import { addItem } from './inventory.js';

export const questDef = (id) => QUESTS.find((q) => q.id === id) || null;
export const currentQuest = (st) => (st.quest ? questDef(st.quest.id) : null);
export const questNeed = (q) => q.goal.n || 1;
export const questDone = (st) => { const q = currentQuest(st); return !!q && st.quest.n >= questNeed(q); };

// 아직 안 한 다음 퀘스트를 받는다 (없으면 null)
export function nextQuest(st) {
  if (st.quest) return currentQuest(st);
  const q = QUESTS.find((x) => !st.questsDone.includes(x.id));
  if (q) st.quest = { id: q.id, n: 0 };
  return q || null;
}

// 몬스터를 잡았을 때. mon: { type, tier, zone } — 진행이 바뀌면 true
export function questKill(st, mon) {
  const q = currentQuest(st);
  if (!q || questDone(st)) return false;
  const g = q.goal;
  const hit = g.kill ? mon.type === g.kill : g.named ? mon.tier === 'named' && mon.zone === g.named : mon.tier === 'boss' && mon.zone === g.boss;
  if (!hit) return false;
  st.quest.n++;
  return true;
}

export function goalText(q) {
  const g = q.goal;
  if (g.kill) return `${MONSTERS[g.kill].name} 처치`;
  const z = ZONES.find((x) => x.id === (g.named || g.boss));
  return `${(g.named ? z.named : z.boss).name} 처치`;
}

// 보상으로 줄 아이템 목록을 만든다 (가방에 넣지는 않는다)
export function rewardItems(st, q) {
  const r = q.reward, out = [];
  const cls = BASES[{ sword: 'short_sword', bow: 'short_bow', staff: 'oak_staff', mace: 'oak_club', scepter: 'oak_scepter' }[st.start] || 'short_sword'].cls;
  for (const [id, n] of r.items || []) out.push(makeItem(id, { qty: n }, st));
  if (r.gear) {
    const [slot, rarity, ilvl] = r.gear;
    // v0.40.2: 지금 능력치로 낄 수 있는 것 중 고른다 — 요구 능력치를 채우고, 내 가장 높은 능력치를 요구하는 것(내 빌드)을 먼저, 그다음 높은 레벨
    const CLS_STAT = { sword: 'str', bow: 'dex', staff: 'int', mace: 'vit', scepter: 'wis' }; // 요구 능력치가 없는 무기는 계열의 능력치로 본다
    const S = totalStats(st), MAIN = ['str', 'dex', 'int', 'wis', 'vit'], smax = Math.max(1, ...MAIN.map((k) => S[k] || 0));
    // 요구 능력치 중 내 값이 가장 큰 것 (가장 높은 능력치를 요구하면 100). 비슷하면(1% 안) 시작 무기 계열이 이긴다
    const fit = (b) => { const ks = Object.keys(b.req || {}).filter((k) => MAIN.includes(k)); if (!ks.length && b.cls) ks.push(CLS_STAT[b.cls]); return ks.length ? Math.round((100 * Math.max(...ks.map((k) => S[k] || 0))) / smax) : 100; };
    const pool = Object.keys(BASES).filter((id) => {
      const b = BASES[id];
      return b.slot === slot && ((b.minLvl ?? 1) <= ilvl || b.shop) && b.minLvl !== 99 && !b.noDrop;
    });
    const score = (id) => { const b = BASES[id], ok = meetsReq(st, b.req, S); return (ok ? 1e6 : 0) + (slot === 'weapon' && b.cls === cls ? 500 : 0) + fit(b) * 1e3 + (b.minLvl ?? 1); };
    pool.sort((a, b) => score(b) - score(a));
    if (pool.length) out.push(makeItem(pool[0], { rarity, ilvl }, st));
  }
  if (r.book) out.push(makeBook((QUEST_BOOKS[st.start] || QUEST_BOOKS.sword)[r.book], st));
  return out;
}

// 보고: 보상을 주고 다음 퀘스트로. 가방이 모자라면 실패 (bagFull)
export function questTurnIn(st, size) {
  const q = currentQuest(st);
  if (!q || !questDone(st)) return { ok: false };
  const items = rewardItems(st, q);
  const need = items.filter((it) => !(BASES[it.base]?.stack && st.inv.some((x) => x.base === it.base))).length;
  if (st.inv.length + need > size) return { ok: false, bagFull: true, need, why: '가방이 가득 찼습니다' };
  for (const it of items) addItem(st, it);
  st.gold += q.reward.gold || 0;
  st.questsDone.push(q.id);
  st.quest = null;
  return { ok: true, q, items, next: nextQuest(st) };
}
