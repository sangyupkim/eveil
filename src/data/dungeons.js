// 던전: 지역마다 하나. 같은 지도 먼 곳(x 600~)에 방 4개를 일직선으로 두고, 마지막 방에 우두머리.
// 들어가려면 그 지역 네임드 · 보스가 떨어뜨리는 열쇠가 하나 든다. 깰 때마다 단계가 오른다 (1~10).
import { ZONES } from './world.js';

export const DUNGEON_X = 600, DUNGEON_GAP = 70, ROOM = 7, ROOM_GAP = 20, CORRIDOR = 2.2, MAX_STAGE = 10;
export const ROOMS = 4;

// 지역 i 던전의 방 중심
export const roomCenter = (zi, k) => ({ x: DUNGEON_X + zi * DUNGEON_GAP, z: k * ROOM_GAP });
// 던전 바닥인가 → 지역 번호, 아니면 -1
export function dungeonAt(x, z) {
  if (x < DUNGEON_X - 20) return -1;
  const zi = Math.round((x - DUNGEON_X) / DUNGEON_GAP);
  if (zi < 0 || zi >= ZONES.length) return -1;
  const cx = DUNGEON_X + zi * DUNGEON_GAP, dx = Math.abs(x - cx);
  for (let k = 0; k < ROOMS; k++) if (dx <= ROOM && Math.abs(z - k * ROOM_GAP) <= ROOM) return zi;
  if (dx <= CORRIDOR && z >= 0 && z <= (ROOMS - 1) * ROOM_GAP) return zi;
  return -1;
}
// 지역 안 입구 자리
export const entranceOf = (zn) => ({ x: zn.x + (zn.x >= 0 ? -1 : 1) * zn.r * 0.45, z: zn.z + (zn.z >= 0 ? -1 : 1) * zn.r * 0.45 });

// 단계마다: 몬스터 강함 · 보상
export const stageMods = (stage) => ({ level: stage, hp: 1 + 0.18 * stage, dmg: 1 + 0.1 * stage });
