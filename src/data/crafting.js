// 지역 재료 · 지역 세트 장비 (제작소에서 만든다)
export const MATERIALS = {
  field: { name: '개미 껍질', icon: 1012 }, forest: { name: '썩은 나무심', icon: 1013 }, grave: { name: '뼛가루', icon: 1014 },
  ruins: { name: '녹슨 문장', icon: 1015 }, swamp: { name: '늪 이끼', icon: 1016 }, frost: { name: '서리 결정', icon: 1017 },
  valley: { name: '고대 파편', icon: 1018 }, inferno: { name: '불씨 핵', icon: 1019 }, // v0.44.8 재료마다 다른 그림 (용 전리품 아이콘)
};
// 한 마리당 재료: 확률 · 개수
export const MAT_DROP = { normal: [0.25, 1], elite: [1, 2], named: [1, 4], boss: [1, 8] };

export const SET_SLOTS = ['helm', 'armor', 'gloves', 'boots'];
// 세트: 2부위 · 4부위 효과 (장비 옵션과 같은 이름)
export const SETS = {
  field: { name: '들판 개척자', b2: { maxHp: 30 }, b4: { moveSpd: 8, vit: 3 } },
  forest: { name: '썩은 숲 사냥꾼', b2: { dex: 4 }, b4: { atkSpd: 8, crit: 3 } },
  grave: { name: '묘지기', b2: { wis: 5 }, b4: { mpRegen: 3, spellPct: 12 } },
  ruins: { name: '성채 수비대', b2: { armorPct: 12 }, b4: { str: 8, maxHp: 120 } },
  swamp: { name: '늪의 망령', b2: { lifeSteal: 2 }, b4: { dmgPct: 15, dex: 8 } },
  frost: { name: '서리 군주', b2: { maxMp: 60 }, b4: { spellPct: 25, int: 10 } },
  valley: { name: '고대 수호자', b2: { vit: 10 }, b4: { armorPct: 25, maxHp: 300 } },
  inferno: { name: '화염 균열 정복자', b2: { crit: 5 }, b4: { dmgPct: 30, allStats: 6 } },
  orcfort: { name: '요새 파괴자', b2: { str: 14 }, b4: { armorPct: 30, maxHp: 400 } },
  webwood: { name: '거미줄 추적자', b2: { dex: 14 }, b4: { atkSpd: 15, crit: 8 } },
  harbor: { name: '망령 사냥꾼', b2: { wis: 14 }, b4: { spellPct: 35, mpRegen: 6 } },
  demongate: { name: '관문의 수호자', b2: { allStats: 6 }, b4: { dmgPct: 40, lifeSteal: 4 } },
};
// 한 부위 제작 비용
export const craftCost = (zi) => ({ mats: 12 + zi * 4, gold: 300 * (zi + 1) ** 2 });
// 건물 단계 올리기에 드는 재료: 단계 n → n+1 은 n번째 지역 재료 (n*8개)
// 1 → 2단계는 금화만 (방치만 해도 첫 단계는 올라간다)
// v0.42: 5 → 10단계는 정수 (2 ~ 5단계 재료). base = 아이템 id
export const UP_ESS = { 5: ['ess2', 12], 6: ['ess3', 12], 7: ['ess4', 12], 8: ['ess4', 18], 9: ['ess5', 15] }; // v0.44.12 단계마다 한 단계씩 높은 정수 (빛바랜 정수 쏠림 없앰)
// v0.49.73 10 → 20단계: 정수 Ⅴ · 상급 · 최상급 강화석 · 높은 약초(서리꽃 이상, 많은 것부터) — 남는 강화석 · 약초가 건물 성장에 들어간다
const UP20 = { ess5: [20, 24, 28, 32, 40, 46, 52, 60, 70, 80], ore2: [40, 48, 56, 64, 80, 90, 100, 115, 130, 150], ore3: [0, 0, 0, 5, 10, 14, 18, 22, 26, 30], herb: [30, 36, 42, 50, 60, 70, 80, 92, 105, 120] };
export const HIGH_HERBS = ['frost', 'blood', 'star', 'dragon', 'world'];
// 단계 lv → lv+1에 드는 것 전부: [{ base, n }] (+ herbs: 높은 약초 수)
export const upgradeNeed = (lv) => {
  if (lv >= 10) { const i = lv - 10; return { items: ['ess5', 'ore2', 'ore3'].map((b) => ({ base: b, n: UP20[b][i] || 0 })).filter((x) => x.n > 0), herbs: UP20.herb[i] || 0 }; }
  const m = upgradeMats(lv); return { items: m ? [{ base: m.base, n: m.n }] : [], herbs: 0 };
};
export const upgradeMats = (lv) => {
  if (lv < 2) return null;
  if (lv >= 10) return { base: 'ess5', n: UP20.ess5[lv - 10] || 0 };
  if (UP_ESS[lv]) return { base: UP_ESS[lv][0], n: UP_ESS[lv][1] };
  const zone = Object.keys(MATERIALS)[Math.min(7, lv - 2)];
  return { base: 'mat_' + zone, zone, n: (lv - 1) * 8 };
};
