// 번역 합치기: tools/i18n/parts/*.tsv (번호<TAB>영어) + batch/*.json (열쇠 목록) → src/i18n/en.js
//  영어 칸은 JSON 문자열 안쪽처럼 적는다 (\n · \" 가능). 빈 칸이면 건너뛴다.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const P = path.join(ROOT, 'tools/i18n');
let D = {};
try { D = (await import(path.join(ROOT, 'src/i18n/en.js') + '?' + Date.now())).default; } catch { /* 처음 */ }
let n = 0, bad = 0;
for (const f of fs.readdirSync(path.join(P, 'parts')).filter((x) => x.endsWith('.tsv')).sort((a, b) => (a[0] === '_') - (b[0] === '_') || (a < b ? -1 : 1))) { // _extra는 맨 나중 (손으로 고친 것이 이긴다)
  if (f.startsWith('_')) { // 「한글 열쇠<TAB>영어」 그대로 (런타임에서 모은 빠진 글 등)
    for (const line of fs.readFileSync(path.join(P, 'parts', f), 'utf8').split('\n')) { const i = line.indexOf('\t'); if (i < 1) continue; const k = line.slice(0, i), v = JSON.parse('"' + line.slice(i + 1).replace(/(?<!\\)"/g, '\\"') + '"'); if (v && D[k] !== v) { D[k] = v; n++; } }
    continue;
  }
  const name = f.slice(0, -4), keys = JSON.parse(fs.readFileSync(path.join(P, 'batch', name + '.json'), 'utf8'));
  for (const line of fs.readFileSync(path.join(P, 'parts', f), 'utf8').split('\n')) {
    const m = line.match(/^(\d+)\t(.*)$/); if (!m) continue;
    const k = keys[+m[1]], v = JSON.parse('"' + m[2].replace(/(?<!\\)"/g, '\\"') + '"');
    if (k == null) { bad++; console.warn('번호 없음', f, m[1]); continue; }
    if (!v) continue;
    const want = (k.match(/\{\}/g) || []).length, got = (v.match(/\{\d*\}/g) || []).length;
    if (want !== got && !/\{\d+\}/.test(v)) console.warn(`자리 수 다름 ${f}#${m[1]}: ${k} → ${v}`);
    if (D[k] !== v) { D[k] = v; n++; }
  }
}
const out = '// 영어 번역표 (tools/i18n-merge.mjs가 만든다 — 손으로 고쳐도 되지만 parts/*.tsv도 같이)\n// 열쇠 = 한글 틀 (src/i18n/key.js tkey), 값 = 영어 틀 ({} 차례대로 · {0} 번호)\nexport default ' + JSON.stringify(D, null, 0).replace(/","/g, '",\n"') + ';\n';
fs.writeFileSync(path.join(ROOT, 'src/i18n/en.js'), out);
console.log(`합침: 새로 · 바뀜 ${n} · 전체 ${Object.keys(D).length}${bad ? ` · 번호 오류 ${bad}` : ''}`);
