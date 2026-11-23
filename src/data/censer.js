// v0.49.73 제단 향로: 연구 「향로 연금술」로 유물 제단에 향로를 놓는다 (1 · 4 · 7 · 10단계에 하나씩).
//  켜 둔 향로는 약초를 시간마다 태우고(꺼 둔 동안에도), 타는 동안만 효과. 약초가 모자라면 꺼진다.
export const CENSERS = {
  plenty: { name: '풍요의 향', text: '광산 생산 +25%', fuel: { red: 15, blue: 15 } },
  vigor: { name: '활력의 향', text: '용병 체력 소모 -30% · 쉬며 회복 +30%', fuel: { iron: 10, sun: 10 } },
  focus: { name: '집중의 향', text: '연구 · 제작 · 건물 공사 시간 -20%', fuel: { wind: 8, moon: 7 } },
  prosper: { name: '번영의 향', text: '파견 보상 +15%', fuel: { gold: 5, high: 5 } }, // high = 서리꽃 이상 아무거나
};
export const CENSER_IDS = Object.keys(CENSERS);
