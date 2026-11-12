// PC 단축키: 행동 → 키 (e.code). st.settings.keys에 바꾼 것만 저장
export const KEY_ACTIONS = [
  ['up', '위로 이동', 'KeyW'], ['down', '아래로 이동', 'KeyS'], ['left', '왼쪽 이동', 'KeyA'], ['right', '오른쪽 이동', 'KeyD'],
  ['attack', '공격 · 상호작용', 'Space'], ['interact', '상호작용', 'KeyG'],
  ['s1', '스킬 1', 'Digit1'], ['s2', '스킬 2', 'Digit2'], ['s3', '스킬 3', 'Digit3'], ['s4', '스킬 4', 'Digit4'], ['s5', '스킬 5', 'Digit5'], ['s6', '스킬 6', 'Digit6'],
  ['hp', '체력 물약', 'KeyQ'], ['mp', '마나 물약', 'KeyE'], ['auto', '자동 사냥', 'KeyF'], ['recall', '귀환', 'KeyR'],
  ['inv', '가방', 'KeyI'], ['skills', '스킬 창', 'KeyK'], ['char', '능력 창', 'KeyC'], ['quest', '퀘스트', 'KeyJ'], ['map', '월드맵', 'KeyN'],
  ['town', '마을', 'KeyT'], ['shop', '상점', 'KeyP'], ['guide', '가이드북', 'KeyH'], ['menu', '메뉴', 'KeyM'],
];
export const keyMap = (st) => { const m = {}; for (const [id, , d] of KEY_ACTIONS) m[id] = st.settings.keys?.[id] || d; return m; };
// 키 → 행동
export const actionOf = (st, code) => { const m = keyMap(st); return Object.keys(m).find((k) => m[k] === code) || null; };
export const keyName = (code) => !code ? '-' : code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, '숫자판 ').replace('Space', '스페이스').replace('Arrow', '방향키 ').replace('Shift', 'Shift ').replace('Control', 'Ctrl ').replace(/Left$|Right$/, (s) => s === 'Left' ? '(왼)' : '(오)');
// 키 지정: 다른 행동이 같은 키를 쓰고 있으면 서로 바꾼다
export function bindKey(st, id, code) {
  const m = keyMap(st), other = Object.keys(m).find((k) => k !== id && m[k] === code);
  st.settings.keys ||= {};
  if (other) st.settings.keys[other] = m[id];
  st.settings.keys[id] = code;
}
