// v0.49.75 무간지옥 (docs/기획_무간지옥.md): 혼돈 다음 세계 단계. 세계 전체가 무간 n층, 층은 끝없이 이어진다.
//  n층 몬스터 레벨 = 지역 레벨 + 380 + 10n. 장비 레벨 = 몬스터 레벨, 500을 넘는 장비는 10레벨마다 고정 수치 ×1.15.
//  몬스터 체력 · 공격은 층마다 그 장비를 맞춘 캐릭터의 성장만큼 (tools/sim/mugan.mjs로 잰 값).
export const MUGAN = {
  gear: 1.15,        // 장비 고정 수치 (10레벨 = 한 층마다)
  dmg: 1.18,         // 몬스터 공격 (층마다) — 캐릭터 버팀 성장(×1.16 ~ 1.17, tools/sim/mugan.mjs)보다 조금 더
  armor: 1.15,       // 방어 공식의 몬스터 쪽 값 (감소율이 97 ~ 98%에 머물게)
  ranged: 0.3,       // 원거리 몬스터 비율 (적어도)
};
// 층을 여는 업보: 그 층에서 잡아야 하는 수
export const karmaNeed = (n) => Math.round(600 * Math.pow(1 + n / 10, 1.5));
// 500 넘는 장비 · 몬스터 레벨의 배율 (10레벨마다 ×1.15, 사이는 부드럽게)
export const muganK = (lv, k = MUGAN.gear) => (lv > 500 ? Math.pow(k, (lv - 500) / 10) : 1);
// 장비 이름: 10층(100레벨)마다 새 이름, 30개를 다 돌면 Ⅱ · Ⅲ …
export const MUGAN_NAMES = ['업화', '나락', '혈해', '무저', '겁화', '아비', '규환', '초열', '흑승', '중합', '적멸', '윤회', '염라', '명왕', '귀왕', '무명', '업보', '명부', '황천', '삼도', '칠흑', '멸겁', '무량', '항하', '불멸', '나유타', '아승기', '불가설', '무변', '무간'];
const ROMAN = ['', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ'];
export function muganName(ilvl) {
  const f = Math.max(1, Math.ceil((ilvl - 500) / 10)), i = Math.floor((f - 1) / 10), cyc = Math.floor(i / MUGAN_NAMES.length);
  return { name: MUGAN_NAMES[i % MUGAN_NAMES.length], roman: cyc ? ROMAN[cyc] || `${cyc + 1}` : '' };
}
// 고정값 옵션 (층마다 커진다). %옵션 · 상한 있는 옵션은 그대로
export const MUGAN_FLAT = new Set(['str', 'dex', 'int', 'wis', 'vit', 'allStats', 'maxHp', 'maxMp', 'matk', 'patk', 'hpRegen', 'mpRegen']);
// 몬스터 체력 배율 (n층까지 곱): 층마다 ×(1.43 + 0.018n, 최대 1.62) — 캐릭터 화력 성장(첫 층 ×1.34 ~ 1.48 → 10층부터 ×1.57)보다 2%쯤 더
const HPC = [1];
export function muganHp(n) { n = Math.max(0, Math.floor(n)); while (HPC.length <= n) { const i = HPC.length; HPC.push(HPC[i - 1] * Math.min(1.62, 1.43 + 0.018 * i)); } return HPC[n]; }
export const muganDmg = (n) => Math.pow(MUGAN.dmg, Math.max(0, n));
