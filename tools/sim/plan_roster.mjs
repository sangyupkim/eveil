// 라운드 5~7: 기획안의 새 스킬 구성(갈래 하나)을 가상으로 만들어 퀵슬롯 · 차수 · 랭크를 본다
const P = JSON.parse(process.argv[2] || '{}');
const TIER = P.tier || [1, 1.25, 1.55, 1.95, 2.5];         // 차수 위력 배율
const ROLE = P.role || { boss: 1.8, hunt: 0.6, util: 0.5 };  // 한 대상 위력 배율 (사냥기는 여러 대상)
const PER = P.per || { 1: { boss: 1, hunt: 1, util: 1 }, 2: { boss: 1, hunt: 2, util: 1 }, 3: { boss: 1, hunt: 2, util: 1 }, 4: { boss: 1, hunt: 1, util: 1 }, 5: { boss: 2, hunt: 2, util: 1 } };
const BOSS_BONUS = P.bossBonus ?? 0.3; // 보스기: 맞은 보스 받는 피해 +30% 4초 (팀 전체 · 다른 스킬에도)
const targets = P.targets ?? 5;
const rankGain = (r) => 1 + (P.perRank ?? 0.08) * (Math.min(r, 10) - 1) + (P.perRank2 ?? 0.03) * Math.max(0, r - 10);
const skills = [];
for (let t = 1; t <= 5; t++) for (const role of ['boss', 'hunt', 'util']) for (let k = 0; k < (PER[t][role] || 0); k++) skills.push({ id: `${t}${role[0]}${k}`, t, role, cd: role === 'boss' ? 8 + t * 2 : role === 'hunt' ? 6 + t * 1.5 : 12 });
const rank = (s) => P.ranks?.[s.t] ?? Math.max(1, 30 - (s.t - 1) * 7); // 오래 쓴 낮은 차수일수록 랭크가 높다
const pw = (s) => TIER[s.t - 1] * rankGain(rank(s)) * ROLE[s.role] * s.cd * 0.2; // 쿨이 길수록 한 방이 크다 (초당은 같게)
const single = (s) => pw(s) / s.cd, multi = (s) => single(s) * (s.role === 'hunt' ? targets : 1);
const pick = (key, n) => [...skills].sort((a, b) => key(b) - key(a)).slice(0, n);
const slots = P.slots ?? 8;
const sum = (list, f) => list.reduce((a, s) => a + f(s), 0);
const bossSet = pick(single, slots), mobSet = pick(multi, slots), oneSet = (() => { const ms = Math.max(...skills.map(single)), mm = Math.max(...skills.map(multi)); return pick((s) => single(s) / ms + multi(s) / mm, slots); })();
const bossK = bossSet.some((s) => s.role === 'boss') ? 1 + BOSS_BONUS : 1, oneK = oneSet.some((s) => s.role === 'boss') ? 1 + BOSS_BONUS : 1;
const tierUse = (set) => [1, 2, 3, 4, 5].map((t) => set.filter((s) => s.t === t).length).join('/');
console.log(`── 라운드 ${P.round}: ${P.note || ''}`);
console.log(`스킬 수 ${skills.length} (차수별 ${[1, 2, 3, 4, 5].map((t) => skills.filter((s) => s.t === t).length).join('/')})`);
console.log(`보스 세트 차수 분포 ${tierUse(bossSet)} · 무리 세트 ${tierUse(mobSet)} · 한 벌 ${tierUse(oneSet)}`);
console.log(`두 벌 효과: 보스 ×${(sum(bossSet, single) * bossK / (sum(oneSet, single) * oneK)).toFixed(2)} · 무리 ×${(sum(mobSet, multi) / sum(oneSet, multi)).toFixed(2)}`);
const t1 = skills.find((s) => s.t === 1 && s.role === 'hunt'), t5 = skills.find((s) => s.t === 5 && s.role === 'hunt');
console.log(`1차 사냥기 ${rank(t1)}랭크 ÷ 5차 사냥기 ${rank(t5)}랭크 = ${(single(t1) / single(t5)).toFixed(2)} · 1차 30랭크 ÷ 5차 1랭크 = ${(TIER[0] * rankGain(30) / (TIER[4] * rankGain(1))).toFixed(2)}`);
console.log(`쓰지 않는 스킬 ${skills.length - new Set([...bossSet, ...mobSet].map((s) => s.id)).size}개`);
