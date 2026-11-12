# 에베이 (eveil, 예전 이름 nec_rog) — 작업 규칙

> 새 세션은 먼저 **`docs/인수인계.md`** 를 읽는다 (브랜치 · 배포 · 코드 지도 · 지금 규칙 · 남은 일).

- 사용자와는 **한국어**로. 패치노트 · 주석도 한국어.
- 작업 브랜치 `claude/gallant-dijkstra-ym1oy6`. **고치면 바로 배포:** 작업 브랜치 push + `git push origin claude/gallant-dijkstra-ym1oy6:claude/sludge-roguelike-game-design-fndfdu` (Cloudflare Workers `eveil.weak0416.workers.dev`가 그 브랜치에서 자동 배포. 저장소 비공개라 GitHub Pages는 꺼짐).
- 서버는 다른 저장소 `sangyupkim/eonrift`의 `worker/ashen.ts` — **eonrift `dev`에만** 올린다. eonrift `main`은 사용자가 「출시해」라고 할 때만.
- 올리기 전에 `npm test` (19개 통과 상태). 화면은 Playwright로 확인, 스크린샷은 저장소 밖(스크래치패드)에.
- 업데이트마다 `src/data/patchnotes.js` 맨 위에 짧은 안내체 패치노트 + `GAME_VERSION` 올리기. 내부 운영 변경은 적지 않는다.
- 튜토리얼 · 안내 문구는 넣지 않는다 (설명은 메뉴의 가이드북 `windows.guide()`).
- 건물 · 소품 그림은 잘리거나 같은 모양이 반복되지 않게. 큰 그림이 띠로 잘려 있으면 이음매를 맞춰 붙인다 (인수인계 4장 통나무집).
