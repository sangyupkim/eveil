// 이름 있는 전설: 지역 보스(네임드는 드물게)만 떨어뜨린다. 정해진 기본 장비 · 옵션 · 고유 효과 (UNIQUES 번호).
// 보석: 장비 구멍(sockets)에 박아 스탯을 더한다. 조각 · 보석 · 완벽한 3단계.
export const NAMED_LEGENDS = {
  field: [{ id: 'nl_antking', name: '개미왕의 송곳니', base: 'broad_sword', ilvl: 4, affixes: [['str', 4], ['atkSpd', 8]], unique: 8 }],
  forest: [{ id: 'nl_scout', name: '정찰대장의 눈', base: 'long_bow', ilvl: 8, affixes: [['dex', 6], ['crit', 4]], unique: 1 }],
  grave: [{ id: 'nl_priest', name: '저주받은 사제의 홀', base: 'sage_staff', ilvl: 12, affixes: [['int', 8], ['spellPct', 15]], unique: 5 }],
  ruins: [{ id: 'nl_wyrm', name: '황혼 비룡의 비늘', base: 'chain_mail', ilvl: 18, affixes: [['vit', 10], ['armorPct', 20]], unique: 3 }],
  swamp: [{ id: 'nl_bog', name: '늪 왕의 고리', base: 'jade_ring', ilvl: 24, affixes: [['allStats', 4], ['lifeSteal', 3]], unique: 6 }],
  frost: [{ id: 'nl_frost', name: '서리 폭군의 왕관', base: 'frost_helm', ilvl: 30, affixes: [['vit', 12], ['maxHp', 120]], unique: 9 }],
  valley: [{ id: 'nl_mino', name: '미노타우로스 왕의 도끼', base: 'great_axe', ilvl: 36, affixes: [['str', 14], ['dmgPct', 35]], unique: 0 }],
  inferno: [{ id: 'nl_flame', name: '화염 주술사의 심장', base: 'sun_amulet', ilvl: 42, affixes: [['int', 16], ['spellPct', 30]], unique: 10 }],
};
Object.assign(NAMED_LEGENDS, {
  orcfort: [{ id: 'nl_troll', name: '트롤 왕의 가죽', base: 'dragon_plate', ilvl: 48, affixes: [['vit', 18], ['maxHp', 300]], unique: 3 }],
  webwood: [{ id: 'nl_spider', name: '아라크네의 독침', base: 'dragon_bow', ilvl: 54, affixes: [['dex', 20], ['crit', 8]], unique: 11 }],
  harbor: [{ id: 'nl_captain', name: '모르간의 나침반', base: 'star_amulet', ilvl: 60, affixes: [['allStats', 8], ['magicFind', 30]], unique: 7 }],
  demongate: [{ id: 'nl_demon', name: '벨가로스의 심장', base: 'archmage_staff', ilvl: 66, affixes: [['int', 26], ['spellPct', 45]], unique: 5 }],
});
export const NAMED_CHANCE = { boss: 0.12, named: 0.03, dungeon: 0.15 };

export const GEMS = {
  ruby: { name: '홍옥', stat: 'str', icon: 70 },
  emerald: { name: '취옥', stat: 'dex', icon: 69 },
  sapphire: { name: '청옥', stat: 'int', icon: 68 },
  amethyst: { name: '자수정', stat: 'wis', icon: 68, tint: 0xc090ff },
  diamond: { name: '금강석', stat: 'vit', icon: 71 },
};
export const GEM_GRADES = [{ pre: '조각난', v: 2, lvl: 1 }, { pre: '', v: 4, lvl: 15 }, { pre: '완벽한', v: 7, lvl: 30 }];
export const gemId = (g, k) => `gem_${g}_${k}`;
// 등급(구멍 수): 희귀 0~1 · 영웅 1~2 · 전설 2
export const socketRoll = (rarity, rng) => (rarity === 'rare' ? (rng() < 0.35 ? 1 : 0) : rarity === 'hero' ? 1 + (rng() < 0.4 ? 1 : 0) : rarity === 'legend' ? 2 : 0);
export const GEM_DROP = { normal: 0.004, elite: 0.12, named: 0.4, boss: 1 };
