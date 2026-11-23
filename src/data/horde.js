// v0.50 군세 토벌 (docs/기획_밸런스_v0.50.md 4장)
//  보스를 잡은 지역 가운데 하나에 24 ~ 48시간마다 군세가 모인다 (한 번에 하나). 경비대장 하겐이 토벌지(그 지역 던전 터)로 보낸다.
//  토벌지: ① 잡몹 파도 → ② 군기 기둥 셋(부술 때마다 파도가 약해지고 정예가 나온다) → ③ 군세 대장. 몬스터 레벨 = 내 권장 레벨.
//  토벌하면 그 지역이 7일 동안 「정복지」(내 권장 레벨 사냥터, 보상 +20%). 안 하면 24시간 뒤 모든 사냥터 드랍률 · 경험치 −20%, 48시간 뒤 −35%.
//  범람 · 용병과는 연결하지 않는다.
export const HORDE = {
  firstMs: 30 * 60e3,          // 처음 보스를 잡은 뒤 첫 군세까지
  gapMin: 24 * 3600e3, gapMax: 48 * 3600e3,
  conqMs: 7 * 86400e3,         // 정복지 기간
  conqK: 1.2,                  // 정복지 보상
  waveKills: 120,              // ① 파도: 이만큼 잡으면 군기 기둥이 드러난다
  waveAlive: 36,               // 한꺼번에 살아 있는 파도 몬스터 수
  pillarHp: 10,                // 군기 기둥 체력 (정예 몬스터 ×)
  bossHp: 2,                   // 군세 대장 체력 (그 지역 보스 ×)
  expK: 1.75,                  // 토벌지 몬스터 경험치 · 금화 (필드 대비)
};
// 벌칙 단계 (군세가 모인 뒤 지난 시간)
export function hordePen(st, now = Date.now()) {
  const H = st?.horde;
  if (!H?.zone || !H.at) return 0;
  const h = (now - H.at) / 3600e3;
  return h >= 48 ? 0.35 : h >= 24 ? 0.2 : 0;
}
// 정복지인가 (남은 시간 ms, 아니면 0)
export const conqLeft = (st, zid, now = Date.now()) => Math.max(0, (st?.horde?.conq?.[zid] || 0) - now);
export const hordeGap = (rng = Math.random) => HORDE.gapMin + rng() * (HORDE.gapMax - HORDE.gapMin);
