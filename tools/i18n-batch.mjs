// 번역 묶음 꺼내기: node tools/i18n-batch.mjs <파일 경로 일부> [이름]
//  todo.json에서 그 파일의 남은 열쇠를 tools/i18n/batch/<이름>.json으로 저장하고 번호를 붙여 보여 준다.
//  번역은 tools/i18n/parts/<이름>.tsv 에 「번호<TAB>영어」 줄로 적고 node tools/i18n-merge.mjs 로 합친다.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [q, name0] = process.argv.slice(2);
const todo = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/i18n/todo.json'), 'utf8'));
const f = Object.keys(todo).find((k) => k.includes(q));
if (!f) { console.log('없음'); process.exit(1); }
const name = name0 || path.basename(f, '.js');
fs.mkdirSync(path.join(ROOT, 'tools/i18n/batch'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tools/i18n/batch', name + '.json'), JSON.stringify(todo[f]));
todo[f].forEach((k, i) => console.log(i + '\t' + JSON.stringify(k).slice(1, -1)));
