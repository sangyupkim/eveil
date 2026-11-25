// v0.50.6 itch.io 묶음 만들기: node tools/build-itch.mjs [출력 폴더=dist/itch]
//  itch.io 브라우저(HTML5) 게임 제한: 파일 1,000개 이하 · 압축 푼 전체 용량 500MB 이하 (한 파일 200MB 이하)
//  1) 게임에 쓰는 파일만 고른다 — 목록이 아니라 규칙(폴더)으로 고르므로 새 그림 · 소리는 저절로 들어간다
//  2) 개수가 많은 작은 파일은 폴더마다 묶음(팩) 하나로 합친다 → packs/*.bin + packs/index.json
//     게임은 src/engine2d/packs.js로 묶음에서 꺼낸다 (그림 image() · 효과음 load()만 — <img> · CSS로 직접 쓰는 그림은 묶지 않는다)
//  3) 글꼴은 조각 190여 개 대신 합친 판(vendor/fonts/merged)을 쓴다
//  4) 제한을 넘으면 실패로 끝낸다 (자동 업로드가 깨진 판을 올리지 않게)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(ROOT, process.argv[2] || 'dist/itch');
const LIMIT = { files: 1000, warnFiles: 850, total: 480e6, one: 190e6 };

// 게임에 쓰는 것 (저장소 맨 위 기준)
const TOP_FILES = ['index.html', 'styles.css', 'flare-ui.css', 'theme-svg.css', 'manifest.webmanifest'];
const TOP_DIRS = ['src', 'assets', 'vendor'];
// 빼는 것 (앞부분이 같으면 뺀다)
const SKIP = ['vendor/fonts/files/', 'vendor/fonts/fonts.css'];
const SKIP_EXT = new Set(['.blend', '.psd', '.xcf', '.kra']);
// 묶음: 앞부분 → 묶음 이름 (위에서부터 먼저 맞는 것). except는 묶지 않는다
const PACKS = [
  { pre: 'assets/sound/', name: 'sound', except: ['assets/sound/music/'] }, // 효과음 (배경음악은 <audio>로 흘려서 묶지 않는다)
  { pre: 'assets/drive/trees/', name: 'trees' },
  { pre: 'assets/drive/props/', name: 'dprops' },
  { pre: 'assets/drive/fx/', name: 'dfx' },
  { pre: 'assets/drive/buildings/', name: 'buildings' },
  { pre: 'assets/flare/props/', name: 'props' },
  { pre: 'assets/flare/powers/', name: 'powers' },
  { pre: 'assets/flare/loot/', name: 'loot' },
];
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.json': 'application/json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => {
  const p = d + '/' + e.name;
  if (e.name.startsWith('.')) return [];
  return e.isDirectory() ? walk(p) : [p];
});

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const copy = (rel, data) => { const to = path.join(OUT, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); data == null ? fs.copyFileSync(path.join(ROOT, rel), to) : fs.writeFileSync(to, data); };

const files = [...TOP_FILES, ...TOP_DIRS.flatMap((d) => walk(d))]
  .filter((f) => !SKIP.some((s) => f.startsWith(s)) && !SKIP_EXT.has(path.extname(f).toLowerCase()));
const groups = new Map(), loose = [];
for (const f of files) {
  const g = PACKS.find((p) => f.startsWith(p.pre) && !(p.except || []).some((e) => f.startsWith(e)) && MIME[path.extname(f).toLowerCase()]);
  if (g) (groups.get(g.name) || groups.set(g.name, []).get(g.name)).push(f); else loose.push(f);
}

// 1) 낱 파일 복사 (index.html은 묶음판 표시 · 합친 글꼴로 바꾼다)
for (const f of loose) {
  if (f === 'index.html') {
    let h = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (!h.includes('vendor/fonts/fonts.css')) throw new Error('index.html에서 글꼴 링크를 찾지 못했습니다');
    h = h.replace('vendor/fonts/fonts.css', 'vendor/fonts/merged/fonts.css');
    h = h.replace(/<head>/i, '<head>\n  <script>window.__PACKS = 1; window.__ITCH = 1;</script>');
    copy(f, h);
  } else copy(f);
}
// 2) 묶음
const index = { files: {} };
for (const [name, list] of groups) {
  const bufs = []; let off = 0;
  for (const f of list.sort()) {
    const b = fs.readFileSync(path.join(ROOT, f));
    index.files[f] = [name + '.bin', off, b.length, MIME[path.extname(f).toLowerCase()]];
    bufs.push(b); off += b.length;
  }
  copy('packs/' + name + '.bin', Buffer.concat(bufs));
}
copy('packs/index.json', JSON.stringify(index));

// 3) 검사
const out = walk(path.relative(ROOT, OUT)).map((p) => fs.statSync(path.join(ROOT, p)).size);
const total = out.reduce((a, b) => a + b, 0), big = Math.max(...out);
const mb = (n) => (n / 1e6).toFixed(1) + 'MB';
console.log(`itch 묶음: ${OUT}`);
console.log(`  파일 ${out.length}개 (제한 ${LIMIT.files}) · 전체 ${mb(total)} · 가장 큰 파일 ${mb(big)}`);
console.log(`  낱 파일 ${loose.length}개 · 묶음 ${groups.size}개에 ${[...groups.values()].reduce((a, l) => a + l.length, 0)}개를 담음 (${[...groups].map(([n, l]) => `${n} ${l.length}`).join(', ')})`);
const bad = [];
if (out.length > LIMIT.files) bad.push(`파일이 ${out.length}개로 ${LIMIT.files}개를 넘습니다 — 묶음(PACKS)에 폴더를 더하세요`);
if (total > LIMIT.total) bad.push(`전체 용량 ${mb(total)}가 ${mb(LIMIT.total)}를 넘습니다`);
if (big > LIMIT.one) bad.push(`${mb(big)}짜리 파일이 있습니다 (한 파일 ${mb(LIMIT.one)} 이하)`);
if (bad.length) { for (const b of bad) console.error('실패: ' + b); process.exit(1); }
if (out.length > LIMIT.warnFiles) console.warn(`주의: 파일이 ${out.length}개입니다. 1,000개에 가까워지면 묶음을 늘리세요`);
