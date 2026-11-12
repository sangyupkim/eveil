// 오늘의 의뢰: 하루 3개, 날짜로 정해진다. 짧게 들어와도 할 일.
// kind: kill(그 지역 몬스터) · elite(정예 이상 아무 데나) · dungeon(던전 돌파)
import { ZONES } from '../data/world.js';
import { seeded } from './rng.js';

export const dayKey = (now = Date.now()) => new Date(now + 9 * 3600e3).toISOString().slice(0, 10); // 한국 시간 날짜

export function dailyOf(st, now = Date.now()) {
  const day = dayKey(now);
  if (st.daily?.day === day) return st.daily;
  const rng = seeded([...day].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0);
  // 내가 갈 수 있는 지역 중에서 (각성에 맞는 깊이까지)
  const open = ZONES.filter((z) => (st.awakenings || 0) >= (z.levels[0] - 1) * 2);
  const zn = open[Math.floor(rng() * open.length)] || ZONES[0];
  const zn2 = open[Math.floor(rng() * open.length)] || ZONES[0];
  st.daily = {
    day,
    list: [
      { kind: 'kill', zone: zn.id, need: 40 + Math.floor(rng() * 4) * 10, have: 0, done: false },
      { kind: 'elite', need: 5 + Math.floor(rng() * 4), have: 0, done: false },
      { kind: 'dungeon', zone: zn2.id, need: 1, have: 0, done: false },
    ],
  };
  return st.daily;
}

export function dailyText(q) {
  const zn = ZONES.find((z) => z.id === q.zone);
  if (q.kind === 'kill') return `${zn.name}의 몬스터 ${q.need}마리`;
  if (q.kind === 'elite') return `정예 · 네임드 · 보스 ${q.need}마리`;
  return `${zn.name} 던전 돌파`;
}
// 보상: 금화 + (처치 → 강화석, 정예 → 던전 열쇠, 던전 → 둘 다)
export const dailyReward = (q, st) => {
  const lv = Math.max(1, Math.round((st.awakenings || 0) / 2));
  return { gold: 200 + lv * 40, ore: q.kind === 'elite' ? 0 : 3 + Math.floor(lv / 4), key: 1 };
};

// 진행: 끝난 의뢰를 돌려준다
export function dailyProgress(st, ev) {
  const d = dailyOf(st), out = [];
  for (const q of d.list) {
    if (q.done) continue;
    const hit = (q.kind === 'kill' && ev.kind === 'kill' && ev.zone === q.zone)
      || (q.kind === 'elite' && ev.kind === 'kill' && ev.tier !== 'normal')
      || (q.kind === 'dungeon' && ev.kind === 'dungeon' && ev.zone === q.zone);
    if (!hit) continue;
    q.have++;
    if (q.have >= q.need) { q.done = true; out.push(q); }
  }
  return out;
}
