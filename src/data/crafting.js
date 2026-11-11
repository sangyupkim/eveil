// 지역 재료 · 지역 세트 장비 (제작소에서 만든다)
export const MATERIALS = {
  field: { name: '개미 껍질', icon: 70 }, forest: { name: '썩은 나무심', icon: 71 }, grave: { name: '뼛가루', icon: 72 },
  ruins: { name: '녹슨 문장', icon: 73 }, swamp: { name: '늪 이끼', icon: 74 }, frost: { name: '서리 결정', icon: 75 },
  valley: { name: '고대 파편', icon: 76 }, inferno: { name: '불씨 핵', icon: 77 },
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
};
// 한 부위 제작 비용
export const craftCost = (zi) => ({ mats: 12 + zi * 4, gold: 300 * (zi + 1) ** 2 });
// 건물 단계 올리기에 드는 재료: 단계 n → n+1 은 n번째 지역 재료 (n*8개)
export const upgradeMats = (lv) => (lv >= 1 ? { zone: Object.keys(MATERIALS)[Math.min(7, lv - 1)], n: lv * 8 } : null);
