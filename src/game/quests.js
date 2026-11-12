// 퀘스트 진행 (화면과 무관한 규칙)
import { QUESTS, QUEST_BOOKS } from '../data/quests.js';
import { BASES } from '../data/items.js';
import { MONSTERS, ZONES } from '../data/world.js';
import { makeItem, makeBook } from './items.js';
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
  const cls = BASES[{ sword: 'short_sword', bow: 'short_bow', staff: 'oak_staff' }[st.start] || 'short_sword'].cls;
  for (const [id, n] of r.items || []) out.push(makeItem(id, { qty: n }, st));
  if (r.gear) {
    const [slot, rarity, ilvl] = r.gear;
    // 그 레벨에서 쓸 수 있는 것 중 가장 좋은 기본 아이템 (무기는 내 계열)
    const pool = Object.keys(BASES).filter((id) => {
      const b = BASES[id];
      return b.slot === slot && (slot !== 'weapon' || b.cls === cls) && ((b.minLvl ?? 1) <= ilvl || b.shop) && b.minLvl !== 99;
    }).sort((a, b) => (BASES[b].minLvl ?? 1) - (BASES[a].minLvl ?? 1));
    if (pool.length) out.push(makeItem(pool[0], { rarity, ilvl }, st));
  }
  if (r.book) out.push(makeBook((QUEST_BOOKS[st.start] || QUEST_BOOKS.sword)[r.book], st));
  return out;
}

// 보고: 보상을 주고 다음 퀘스트로. 가방에 안 들어간 보상은 overflow로 돌려준다 (화면이 발밑에 떨어뜨린다)
export function questTurnIn(st, size) {
  const q = currentQuest(st);
  if (!q || !questDone(st)) return { ok: false };
  const items = rewardItems(st, q);
  const overflow = items.filter((it) => !addItem(st, it));
  st.gold += q.reward.gold || 0;
  st.questsDone.push(q.id);
  st.quest = null;
  return { ok: true, q, items, overflow, next: nextQuest(st) };
}
