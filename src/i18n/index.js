// v0.50.6 언어 (한국어 · English)
//  코드의 한글을 하나하나 바꾸지 않고, 화면에 나가는 순간 번역한다:
//   · 화면 글자(DOM): 바뀔 때마다(MutationObserver) 글자 · title · placeholder를 번역
//   · 캔버스 글자: fillText · strokeText · measureText를 감싸 번역
//  번역표 src/i18n/en.js { 한글 틀: 영어 틀 } — 틀은 key.js의 tkey (숫자 · 이름 자리 = {})
//  못 찾으면: 이름(짧은 표 항목)을 먼저 영어로 바꾼 뒤 다시 → 줄 · 「 · 」로 나눠서 → 그래도 없으면 한글 그대로 (개발 중 __i18nMissing에 모은다)
//  데이터 자체는 바꾸지 않는다 (코드가 한글 이름으로 비교하는 곳이 있다)
import { HANGUL, tkey, fill } from './key.js';

const LANG_KEY = 'eveil-lang';
export const LANGS = [['en', 'English'], ['ko', '한국어']];
// 고른 언어. 처음이면: 이 기기에 예전 저장(캐릭터 · 계정)이 있으면 한국어, 없으면 영어
export function getLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'en' || v === 'ko') return v;
    const old = ['ashen-last', 'ashen-account'].some((k) => localStorage.getItem(k)) || Object.keys(localStorage).some((k) => k.startsWith('ashen-save') || k === 'ashen-chars');
    return old ? 'ko' : 'en';
  } catch { return 'en'; }
}
export function setLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch { /* 저장소 없음 */ } }
export let LANG = 'ko';

let D = null, termRe = null;
const cache = new Map();
const missing = (globalThis.__i18nMissing = new Map());

function byTerms(s) {
  if (!termRe) return s;
  return s.replace(termRe, (m) => D[m] ?? m);
}
function look(s) {
  const { key, args } = tkey(s);
  const t = D[key];
  return t != null ? fill(t, args) : null;
}
export function tr(s) {
  if (LANG !== 'en' || !s || typeof s !== 'string' || !HANGUL.test(s)) return s;
  let v = cache.get(s);
  if (v !== undefined) return v;
  v = tr0(s);
  if (cache.size > 20000) cache.clear();
  cache.set(s, v);
  return v;
}
const BOUND = (t) => new RegExp(`(?<![\uac00-\ud7a3])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\uac00-\ud7a3]|(?:에게|에서|으로|까지|부터|보다|처럼|한테|의|을|를|이|가|은|는|에|로|와|과|도|만)(?:[^\uac00-\ud7a3]|$))`, 'g');
const termOne = new Map();
function tr0(s) {
  let r = look(s);
  if (r != null) return r;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (m[1] || m[3]) return m[1] + tr(m[2]) + m[3]; // 앞뒤 빈칸은 떼고
  if (s.includes('\u200b')) return s.split('\u200b').map(tr).join(''); // 일부러 나눈 자리
  // 이름을 긴 것부터 하나씩 영어로 바꾸며 다시 찾는다 (틀 속 낱말까지 한꺼번에 바꾸면 틀이 깨지므로)
  let s2 = s;
  if (termRe) {
    termRe.lastIndex = 0;
    const found = [...new Set([...s.matchAll(termRe)].map((x) => x[0]))].sort((a, b) => b.length - a.length);
    for (const t of found) {
      let re = termOne.get(t); if (!re) termOne.set(t, (re = BOUND(t)));
      re.lastIndex = 0; const one = s.replace(re, D[t]); // 이 이름 하나만 바꾼 것
      r = look(one); if (r != null) return r;
      re.lastIndex = 0; s2 = s2.replace(re, D[t]); // 지금까지 모두 바꾼 것
      if (!HANGUL.test(s2)) return s2;
      r = look(s2); if (r != null) return r;
    }
  }
  // 이름 조각과 나머지 조각을 따로 (변수만으로 이어 붙인 글)
  if (termRe && s2 !== s) {
    let ok = true, out = '', last = 0;
    const piece = (p) => { if (!HANGUL.test(p)) return p; const m2 = p.match(/^(\s*)([\s\S]*?)(\s*)$/), t = look(m2[2]); if (t == null) { ok = false; return p; } return m2[1] + t + m2[3]; };
    termRe.lastIndex = 0;
    for (const x of s.matchAll(termRe)) { out += piece(s.slice(last, x.index)) + (D[x[0]] ?? x[0]); last = x.index + x[0].length; }
    out += piece(s.slice(last));
    if (ok) return out;
  }
  // 나눠서
  for (const sep of ['\n', ' · ', ' — ', ' - ', ': ', ', ']) {
    if (s.includes(sep)) { const a = s.split(sep), parts = a.map(tr); if (parts.some((p, i) => p !== a[i])) return parts.join(sep); }
  }
  // 번역이 없는 짧은 이름(용병 이름 · 한글 닉네임)은 로마자로
  if (/^[\uac00-\ud7a3]{1,6}$/.test(s.trim())) return s.replace(s.trim(), romanize(s.trim()));
  if (HANGUL.test(s2)) { const k = tkey(s2).key; if (!missing.has(k)) missing.set(k, s); }
  return s2;
}
// 한글 → 로마자 (국어의 로마자 표기법, 간단히)
const R_I = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const R_V = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const R_F = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
export function romanize(w) {
  let o = '';
  for (const ch of w) {
    const c = ch.charCodeAt(0) - 0xac00;
    if (c < 0 || c > 11171) { o += ch; continue; }
    o += R_I[Math.floor(c / 588)] + R_V[Math.floor((c % 588) / 28)] + R_F[c % 28];
  }
  return o.charAt(0).toUpperCase() + o.slice(1);
}

// ── 화면에 붙이기 ──
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA']); // 입력 칸은 글자가 없어 그대로 두되 placeholder는 번역
const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
function trTree(root) {
  if (root.nodeType === 3) { const v = root.nodeValue; if (HANGUL.test(v)) { const t = tr(v); if (t !== v) root.nodeValue = t; } return; }
  if (root.nodeType !== 1 || SKIP.has(root.tagName) || root.closest?.('[data-noi18n]')) return;
  trAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: (n) => { if (n.nodeType === 1 && n.tagName === 'TEXTAREA') trAttrs(n); return n.nodeType === 1 && (SKIP.has(n.tagName) || n.hasAttribute('data-noi18n')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) { const v = n.nodeValue; if (HANGUL.test(v)) { const t = tr(v); if (t !== v) n.nodeValue = t; } } else trAttrs(n);
  }
}
function trAttrs(el) {
  for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v && HANGUL.test(v)) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
  if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && HANGUL.test(el.value)) el.value = tr(el.value);
}
function hookCanvas() {
  const P = CanvasRenderingContext2D.prototype;
  for (const k of ['fillText', 'strokeText', 'measureText']) {
    const f = P[k];
    P[k] = function (t, ...a) { return f.call(this, typeof t === 'string' && HANGUL.test(t) ? tr(t) : t, ...a); };
  }
}

// 게임을 켤 때 한 번 (다른 것을 그리기 전에)
export async function initLang() {
  LANG = getLang();
  document.documentElement.lang = LANG;
  if (LANG !== 'en') return;
  D = (await import('./en.js')).default;
  const terms = Object.keys(D).filter((k) => !k.includes('{}') && HANGUL.test(k) && k.length <= 24 && k.trim() === k).sort((a, b) => b.length - a.length);
  // 낱말 경계에서만: 앞이 한글이 아니고, 뒤가 한글이 아니거나 조사(의 · 을 · 를 …)로 끝날 때 (「최신」 속 「신」을 바꾸지 않게)
  const H = '\\uac00-\\ud7a3';
  if (terms.length) termRe = new RegExp(`(?<![${H}])(?:${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[^${H}]|(?:에게|에서|으로|까지|부터|보다|처럼|한테|의|을|를|이|가|은|는|에|로|와|과|도|만)(?:[^${H}]|$))`, 'g');
  hookCanvas();
  trTree(document.body);
  document.title = tr(document.title);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') trTree(m.target);
      else if (m.type === 'attributes') trAttrs(m.target);
      else for (const n of m.addedNodes) trTree(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
