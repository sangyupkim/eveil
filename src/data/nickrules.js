// v0.49.31 닉네임 · 채팅 공통 규칙 — 게임(src)과 서버(worker/ashen.ts · worker/chat.ts)가 같은 파일을 쓴다
// 욕설: 채팅은 글자 사이에 띄어쓰기 · 기호를 끼워도 잡아 *로 가리고, 닉네임은 숫자 · _를 빼고 들어 있으면 거부한다.
// 「새끼(고양이)」 · 「시바(견)」처럼 평범한 말에도 쓰이는 단어는 넣지 않는다.
export const BAD_WORDS = ['시발', '씨발', '씨바', '씨팔', '시팔', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '좆', '개새끼', '개새', '지랄', 'ㅈㄹ', '미친놈', '미친년', '닥쳐', '엿먹', '니애미', '느금',
  'fuck', 'shit', 'bitch', 'sibal', 'ssibal', 'byungsin'];
// 운영진 · 게임으로 오해할 이름
export const RESERVED = ['운영자', '관리자', '운영진', '개발자', '운영팀', '에베이', '공지', '시스템', '알림', 'gm', 'admin', 'eveil', 'system', 'notice', 'operator', 'moderator'];
export const NICK_MIN = 2, NICK_MAX = 8;
export const NICK_RE = new RegExp(`^[가-힣a-zA-Z0-9_]{${NICK_MIN},${NICK_MAX}}$`);

// 닉네임 검사: 괜찮으면 null, 아니면 까닭 (서버 오류 이름과 같다)
export function nickError(nick) {
  const s = String(nick ?? '').trim();
  if (!NICK_RE.test(s)) return 'bad_nick';
  if (/^[0-9_]+$/.test(s)) return 'nick_digits';
  const low = s.toLowerCase(), bare = low.replace(/[0-9_]/g, '');
  if (BAD_WORDS.some((w) => bare.includes(w))) return 'nick_bad';
  if (RESERVED.some((w) => low.includes(w) || bare.includes(w))) return 'nick_reserved';
  return null;
}
