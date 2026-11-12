# 에셋 라이선스

| 에셋 | 출처 | 라이선스 |
|---|---|---|
| 주인공 · 몬스터 · NPC · 땅 타일 · 배경 물건 · 효과 · 아이콘 · 초상화 · UI 그림 (`assets/flare/`) | [Flare: Empyrean Campaign](https://github.com/flareteam/flare-game) — Clint Bellanger 외 (`assets/flare/CREDITS.txt`) | **CC-BY-SA 3.0** (`assets/flare/LICENSE-CC-BY-SA-3.0.txt`) |
| 효과음 · 배경음악 (`assets/sound/`) | Flare: Empyrean Campaign (음악은 다시 압축) | **CC-BY-SA 3.0** |
| 글꼴 (Gowun Dodum · Nanum Myeongjo · Cinzel) | Google Fonts | OFL |
| 수학 계산 (`vendor/three`) | three.js r170 | MIT |

- Flare 그림을 고친 것(WebP 변환 · 색 입히기 · 버튼 잘라내기)도 CC-BY-SA 3.0을 따른다. 게임 메뉴에 출처를 표시한다.
- 다시 만들기: `git clone --depth 1 https://github.com/flareteam/flare-game` → `node tools/prep-flare.mjs <flare-game 폴더>`

## CC0 효과음 (assets/sound/cc0)
- "80 CC0 RPG SFX" — rubberduck, OpenGameArt (CC0): https://opengameart.org/content/80-cc0-rpg-sfx
- "RPG Sound Pack" — artisticdude, OpenGameArt (CC0): https://opengameart.org/content/rpg-sound-pack

## 사막 타일 (assets/flare/tiles/desert_*)
- "Desert Tileset" — Stefan Beller (Flare 그래스랜드 기반), CC-BY-SA 3.0: https://opengameart.org/content/desert-tileset
  - 타일 정의는 Smujb/fallen-kingdom의 tilesetdefs/tileset_desert.txt (같은 라이선스). 3배로 키워 씀 (`tools/prep-extra.mjs`).

## 폐허 타일 (assets/flare/tiles/ruins_*)
- Flare Empyrean Campaign "tileset_ruins" — Flare 팀, CC-BY-SA 3.0: https://github.com/flareteam/flare-game

## 추가 몬스터 (assets/flare/enemies/x_*)
- flare-mod-noname (igorko) 묶음의 몬스터 그림 · 동작 정의, CC-BY-SA 3.0: https://github.com/igorko/flare-mod-noname
  - 오크 · 거미 · 늑대인간 · 곰인간: johndh, Mumu, ryan.dansie (OpenGameArt "Orc/Spider/Werebear FLARE sprite sheets", "FLARE Mod - Werewolf")
  - 트롤 · 그림자 · 해골 기사/고위 마법사/사교도 · 유령 선장/선원: VWolfdog (OpenGameArt "FLARE Model - Troll", "Shadow", "Flare skeleton mod", "Flare zombie mod")
  - 악마 · 악마 석상: umask007 (OpenGameArt "Animated Daemon", "Daemon statue")
  - 변환: `node tools/prep-enemies-extra.mjs <new_game_mod 경로>`

## 새 지역 음악 (assets/sound/music/z_*) — 모두 CC0, OpenGameArt
- 오크 요새: "Battle Theme" — vermilion_wizard
- 거미줄 숲: "Corrupted Minds" — MrAmogus
- 망령의 항구: "Evil Approach" — TheBlackSword
- 악마의 관문: "Epic Boss Battle" — Juhani Junkala (KaadmY 올림)
