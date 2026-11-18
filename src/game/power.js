// v0.49 전투력: 공격(초당 기대 피해) × 방어(버틸 수 있는 피해)를 한 숫자로
// 공격 = 무기 · 주문 중 큰 쪽의 한 방 × 공격 속도 × 치명타 기대값 × 재사용 대기 감소
// 방어 = 최대 HP ÷ (각성 레벨 몬스터에게 받는 피해 비율) ÷ 회피 · 막기 · 피해 감소
// 전투력 = √(공격 × 방어) (둘 중 하나만 키우면 덜 오른다)
import { damageReduction } from './player.js';

export function powerParts(d, st) {
  const lv = Math.max(1, st.awakenings || 1);
  const phys = ((d.patk[0] + d.patk[1]) / 2) * d.atkMult, spell = d.spellBase || 0;
  const off = Math.max(phys, spell) * d.atkRate * (1 + d.crit * (d.critMult - 1)) * (1 + (d.bossDmg || 0) / 200) / (1 - (d.cdr || 0) / 200);
  const taken = (1 - damageReduction(d.armor, lv)) * (1 - (d.dmgReduce || 0) / 100) * (1 - (d.dodge || 0)) * (1 - (d.block || 0) * 0.7);
  const def = d.maxHp / Math.max(0.05, taken);
  return { off, def };
}
export function combatPower(d, st) {
  const { off, def } = powerParts(d, st);
  return Math.max(0, Math.round(Math.sqrt(off * def)));
}
