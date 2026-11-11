// 퀘스트: 지역마다 사냥 둘 → 네임드 → 보스. 경비대장에게 보고하면 다음 것이 열린다.
// goal: { kill: 몬스터 종류, n } · { named: 지역 } · { boss: 지역 }
// reward: gold · items: [[아이템, 개수]] · gear: [부위 또는 'weapon', 등급, 아이템 레벨] · book: 등급(시작 무기 계열의 스킬북)
export const QUESTS = [
  { id: 'f1', zone: 'field', name: '들판의 불청객', goal: { kill: 'slime', n: 6 }, text: '초소 앞 들판에 슬라임이 들끓는다.',
    reward: { gold: 60, items: [['hp_potion', 5]] } },
  { id: 'f2', zone: 'field', name: '버섯이 걷는다', goal: { kill: 'mushnub', n: 6 }, text: '걸어 다니는 버섯이 밭을 망친다.',
    reward: { gold: 90, gear: ['armor', 'magic', 2] } },
  { id: 'f3', zone: 'field', name: '가시 군주', goal: { named: 'field' }, text: '들판 한가운데, 유난히 큰 가시 슬라임이 있다.',
    reward: { gold: 150, gear: ['weapon', 'rare', 3] } },
  { id: 'f4', zone: 'field', name: '버섯 왕 무르크', goal: { boss: 'field' }, text: '들판 남쪽 끝. 바닥의 예고를 보고 피해라.',
    reward: { gold: 400, book: 2, items: [['hp_potion_l', 3]] } },
  { id: 'w1', zone: 'forest', name: '잿빛 늑대 무리', goal: { kill: 'wolf', n: 8 }, text: '서쪽 숲의 늑대가 길을 끊었다.',
    reward: { gold: 220, gear: ['boots', 'magic', 5] } },
  { id: 'w2', zone: 'forest', name: '오크 정찰대', goal: { kill: 'orc_grunt', n: 8 }, text: '오크가 숲에 진을 쳤다.',
    reward: { gold: 280, gear: ['helm', 'rare', 6] } },
  { id: 'w3', zone: 'forest', name: '잿빛 송곳니', goal: { named: 'forest' }, text: '무리를 이끄는 늙은 늑대.',
    reward: { gold: 400, gear: ['weapon', 'rare', 7] } },
  { id: 'w4', zone: 'forest', name: '오크 족장 그라쉬', goal: { boss: 'forest' }, text: '돌진은 옆으로 피한다.',
    reward: { gold: 900, book: 3, items: [['hp_potion_l', 5]] } },
  { id: 'g1', zone: 'grave', name: '잠들지 못한 자들', goal: { kill: 'skel_warrior', n: 10 }, text: '북쪽 묘지에서 해골이 일어난다.',
    reward: { gold: 500, gear: ['gloves', 'rare', 9] } },
  { id: 'g2', zone: 'grave', name: '떠도는 혼령', goal: { kill: 'ghost', n: 8 }, text: '혼령은 멀리서 쏜다.',
    reward: { gold: 600, gear: ['armor', 'rare', 10] } },
  { id: 'g3', zone: 'grave', name: '저주받은 사제', goal: { named: 'grave' }, text: '묘지 한가운데의 사제.',
    reward: { gold: 800, gear: ['weapon', 'hero', 11] } },
  { id: 'g4', zone: 'grave', name: '묘지기 리치', goal: { boss: 'grave' }, text: '해골을 불러낸다.',
    reward: { gold: 1600, book: 3, items: [['mp_potion_l', 5]] } },
  { id: 'r1', zone: 'ruins', name: '성채의 약탈자', goal: { kill: 'raider', n: 10 }, text: '동쪽 성채를 약탈단이 차지했다.',
    reward: { gold: 1000, gear: ['belt', 'rare', 14] } },
  { id: 'r2', zone: 'ruins', name: '잿불', goal: { kill: 'imp', n: 10 }, text: '임프가 성벽을 태운다.',
    reward: { gold: 1200, gear: ['helm', 'hero', 15] } },
  { id: 'r3', zone: 'ruins', name: '약탈단장 하르겐', goal: { named: 'ruins' }, text: '성채 안뜰.',
    reward: { gold: 1600, gear: ['armor', 'hero', 16] } },
  { id: 'r4', zone: 'ruins', name: '잿빛 용 베르크', goal: { boss: 'ruins' }, text: '연대기 첫 장의 끝.',
    reward: { gold: 4000, book: 4, gear: ['weapon', 'legend', 18] } },
];
// 시작 무기 계열별 스킬북 (등급 → 스킬)
export const QUEST_BOOKS = {
  sword: { 2: 'whirlwind', 3: 'earth_cleave', 4: 'berserk' },
  bow: { 2: 'multishot', 3: 'chain_lightning', 4: 'berserk' },
  staff: { 2: 'fireball', 3: 'chain_lightning', 4: 'meteor' },
};
