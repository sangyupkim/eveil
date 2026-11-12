// 약초 · 물약 · 영약. 약초밭은 약초만 캐고, 제작소에서 약초로 물약 · 영약을 만든다.

// 약초: 약초밭 단계(lv)부터 자란다. w = 거둘 때 나오는 비율
export const HERBS = {
  red: { name: '붉은 잎', lv: 1, w: 3, color: '#e04848', icon: 64 },
  blue: { name: '푸른 이끼', lv: 1, w: 3, color: '#4878e0', icon: 65 },
  iron: { name: '무쇠뿌리', lv: 2, w: 2, color: '#a0a0b0', icon: 71 },
  sun: { name: '햇살꽃', lv: 3, w: 2, color: '#f0c040', icon: 70 },
  wind: { name: '바람풀', lv: 3, w: 2, color: '#60d090', icon: 69 },
  moon: { name: '달빛 버섯', lv: 4, w: 1.5, color: '#b080f0', icon: 68 },
  gold: { name: '황금 인삼', lv: 5, w: 1, color: '#ffd860', icon: 88 },
};
export const HERB_IDS = Object.keys(HERBS);
export const herbsAt = (lv) => HERB_IDS.filter((id) => HERBS[id].lv <= lv);

// 영약 효과 (마시면 5분). buff: 세계(world)의 버프 열쇠, v: 값 (stat은 그 스탯의 10%, 최소 5)
export const ELIXIR_TIME = 300;
export const ELIXIRS = {
  el_str: { name: '힘의 영약', buff: 'str', stat: true, text: '힘 +10%', color: '#e0644a' },
  el_dex: { name: '민첩의 영약', buff: 'dex', stat: true, text: '민첩 +10%', color: '#5fd08a' },
  el_int: { name: '지능의 영약', buff: 'int', stat: true, text: '지능 +10%', color: '#5f9bff' },
  el_wis: { name: '정신의 영약', buff: 'wis', stat: true, text: '정신 +10%', color: '#c58cff' },
  el_vit: { name: '체력의 영약', buff: 'vit', stat: true, text: '체력 +10%', color: '#f0b552' },
  el_armor: { name: '강철 피부 물약', buff: 'armorPct', v: 25, text: '방어력 +25%', color: '#b0b8c8' },
  el_might: { name: '분노의 물약', buff: 'might', v: 20, text: '피해 +20%', color: '#d02030' },
  el_haste: { name: '신속의 물약', buff: 'haste', v: 15, text: '공격 속도 +15%', color: '#7fe0b0' },
  el_swift: { name: '바람걸음 물약', buff: 'swift', v: 20, text: '이동 속도 +20%', color: '#9fe8ff' },
  el_focus: { name: '매의 눈 물약', buff: 'focus', v: 8, text: '치명타 확률 +8%', color: '#ffe680' },
  el_luck: { name: '행운의 물약', buff: 'luck', v: 40, text: '좋은 아이템 발견 +40%', color: '#ffd860' },
};

// 제작소 조합법: 제작소 단계(lv)부터. herbs = 필요한 약초, gold = 금화, n = 한 번에 나오는 수
export const RECIPES = [
  { id: 'hp_potion', lv: 1, herbs: { red: 2 }, gold: 5, n: 2 },
  { id: 'mp_potion', lv: 1, herbs: { blue: 2 }, gold: 5, n: 2 },
  { id: 'hp_potion_l', lv: 2, herbs: { red: 4, iron: 1 }, gold: 20, n: 2 },
  { id: 'mp_potion_l', lv: 2, herbs: { blue: 4, iron: 1 }, gold: 20, n: 2 },
  { id: 'el_vit', lv: 2, herbs: { iron: 3, red: 1 }, gold: 60, n: 1 },
  { id: 'el_armor', lv: 2, herbs: { iron: 4 }, gold: 60, n: 1 },
  { id: 'el_str', lv: 3, herbs: { sun: 3, red: 1 }, gold: 90, n: 1 },
  { id: 'el_dex', lv: 3, herbs: { wind: 3, red: 1 }, gold: 90, n: 1 },
  { id: 'el_might', lv: 3, herbs: { sun: 3, iron: 1 }, gold: 120, n: 1 },
  { id: 'el_haste', lv: 3, herbs: { wind: 4 }, gold: 120, n: 1 },
  { id: 'el_int', lv: 4, herbs: { moon: 3, blue: 1 }, gold: 150, n: 1 },
  { id: 'el_wis', lv: 4, herbs: { moon: 2, blue: 2 }, gold: 150, n: 1 },
  { id: 'el_swift', lv: 4, herbs: { wind: 2, moon: 1 }, gold: 150, n: 1 },
  { id: 'el_focus', lv: 4, herbs: { sun: 2, wind: 2 }, gold: 180, n: 1 },
  { id: 'el_luck', lv: 5, herbs: { gold: 2, moon: 1 }, gold: 300, n: 1 },
];
