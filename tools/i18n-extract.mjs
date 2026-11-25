// 번역할 한글 글 뽑기: node tools/i18n-extract.mjs
//  src 아래 모든 .js의 문자열 · 템플릿(주석 제외)과 index.html의 글에서 한글이 든 조각을 뽑아 번역 열쇠(src/i18n/key.js tkey)로 바꾼다.
//  HTML 문자열은 태그를 떼어 글 조각마다 (화면에서 글 하나하나가 따로 번역되므로). title · placeholder 값도.
//  결과: tools/i18n/keys.json (열쇠 → 처음 나온 파일) · tools/i18n/todo.json (en.js에 없는 열쇠, 파일별)
//  (npm i 로 acorn이 있어야 한다)
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { tkey, HANGUL } from '../src/i18n/key.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = [];
const SKIP_FILES = ['src/data/nickrules.js']; // 금지어 목록 (화면에 나오지 않는다)
const scan = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) scan(p); else if (p.endsWith('.js') && !p.endsWith('i18n/en.js') && !SKIP_FILES.includes(p)) files.push(p); } };
scan('src');
const keys = new Map();
const ent = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
function add(text, file) {
  // 태그 속 title · placeholder · alt 값
  for (const m of text.matchAll(/\b(?:title|placeholder|alt|aria-label)="([^"]*)"/g)) add1(m[1], file);
  for (const frag of text.split(/<[^>]*>|<[^>]*$|^[^<]*>/)) add1(frag, file);
}
function add1(frag, file) {
  frag = ent(frag).replace(/\{[a-z]+\}/g, '\x01'); // '힘 +{v}' 같은 채울 자리
  if (!HANGUL.test(frag)) return;
  // 줄마다 따로 (화면에서 줄이 나뉘어 번역될 수 있다)
  for (const line of [frag.trim(), ...frag.split('\n').map((x) => x.trim())]) {
    if (!HANGUL.test(line)) continue;
    const k = tkey(line).key;
    if (!keys.has(k)) keys.set(k, file);
  }
}
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true }); } catch (e) { console.warn('못 읽음', f, e.message); continue; }
  walk.full(ast, (n) => {
    if (n.type === 'Literal' && typeof n.value === 'string' && HANGUL.test(n.value)) add(n.value, f);
    else if (n.type === 'TemplateLiteral') { const s = n.quasis.map((q) => q.value.cooked ?? q.value.raw).join('\x01'); if (HANGUL.test(s)) add(s, f); }
  });
}
{ const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, ''); add(h, 'index.html'); }

fs.mkdirSync(path.join(ROOT, 'tools/i18n'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tools/i18n/keys.json'), JSON.stringify(Object.fromEntries(keys), null, 0));
let have = {};
try { have = (await import(path.join(ROOT, 'src/i18n/en.js') + '?' + Date.now())).default; } catch { /* 아직 없음 */ }
const todo = {};
for (const [k, f] of keys) if (have[k] == null) (todo[f] ||= []).push(k);
fs.writeFileSync(path.join(ROOT, 'tools/i18n/todo.json'), JSON.stringify(todo, null, 1));
const n = Object.values(todo).reduce((a, l) => a + l.length, 0);
console.log(`열쇠 ${keys.size}개 · 번역 있음 ${keys.size - n} · 남음 ${n}`);
for (const [f, l] of Object.entries(todo).sort((a, b) => b[1].length - a[1].length).slice(0, 30)) console.log(String(l.length).padStart(5), f);
