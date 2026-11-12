// 새 버전 확인: 서버에 올라간 패치노트의 GAME_VERSION을 읽어 지금 버전과 비교한다
import { GAME_VERSION } from './data/patchnotes.js';

const parts = (v) => String(v).split('.').map((n) => parseInt(n, 10) || 0);
export function isNewer(a, b = GAME_VERSION) {
  const x = parts(a), y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return false;
}
export async function latestVersion() {
  try {
    const r = await fetch(`src/data/patchnotes.js?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.text()).match(/GAME_VERSION\s*=\s*'([^']+)'/)?.[1] || null;
  } catch { return null; }
}
// 새 버전이 있으면 그 버전 번호, 없으면 null
export async function checkUpdate() {
  const v = await latestVersion();
  return v && isNewer(v) ? v : null;
}
export { GAME_VERSION };
