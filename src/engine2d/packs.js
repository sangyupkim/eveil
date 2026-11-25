// v0.50.6 itch용 묶음(팩): itch.io 브라우저 게임은 파일이 1,000개를 넘으면 안 되어, 작은 그림 · 효과음을 폴더마다 한 파일로 묶어 올린다
//  (tools/build-itch.mjs). 묶음판 index.html에만 window.__PACKS가 켜져 있고, 보통 주소에서는 아무 일도 하지 않는다.
//  packs/index.json: { files: { 'assets/…': [팩 이름, 시작, 길이, 종류] } } — 팩은 그 안의 파일을 처음 찾을 때 통째로 한 번 받는다
export const PACKS_ON = typeof window !== 'undefined' && !!window.__PACKS;
let idx = null;
const packs = new Map();
const index = () => (idx ||= fetch('packs/index.json').then((r) => r.json()).catch(() => ({ files: {} })));
// 'assets/flare/../drive/x.webp' → 'assets/drive/x.webp'
export function normPath(p) {
  const out = [];
  for (const s of String(p).split('?')[0].split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); }
  return out.join('/');
}
// 묶음 안에 있으면 Blob, 없으면 null
export async function packedBlob(path) {
  if (!PACKS_ON) return null;
  const I = await index(), e = I.files?.[normPath(path)];
  if (!e) return null;
  let p = packs.get(e[0]);
  if (!p) { p = fetch('packs/' + e[0]).then((r) => { if (!r.ok) throw new Error('pack ' + e[0]); return r.arrayBuffer(); }); packs.set(e[0], p); p.catch(() => packs.delete(e[0])); }
  const buf = await p;
  return new Blob([new Uint8Array(buf, e[1], e[2])], { type: e[3] });
}
// 바이트로 받기 (효과음): 묶음에 있으면 묶음에서, 없으면 주소에서
export async function fetchBytes(path) {
  const b = await packedBlob(path).catch(() => null);
  if (b) return b.arrayBuffer();
  const r = await fetch(path);
  return r.arrayBuffer();
}
