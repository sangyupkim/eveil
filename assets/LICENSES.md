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

## 펫 (assets/flare/enemies/pet_dog · pet_cat)
- "Animal Pack Vol.2" — Quaternius, CC0 (OpenGameArt "Animated Animales Low Poly"). 3D 모델을 8방향으로 찍어 씀: `node tools/prep-pets.mjs`

## v0.40 추가 그림
- 주인공 겹: 몽둥이 · 철퇴 · 강화 몽둥이 · 전쟁 망치 · 대형 망치 · 보병 도끼 · 대장장이 망치 · 마법사 옷 alt2 — Flare fantasycore (flareteam/flare-game), CC-BY-SA 3.0. 변환: `node tools/prep-avatar-extra.mjs <fantasycore 폴더>`
- NPC: 주민 2 · 귀환 오벨리스크 (fantasycore) · 고블린 행상 · 쓰러진 해골 (empyrean_campaign) — flare-game, CC-BY-SA 3.0
- 몬스터 `x_necromancer` · `x_grisbon` · `x_scathelocke` · `x_vesuvvio` · `x_goblin_minecart` — flare-game alpha_demo · empyrean_campaign 모드, CC-BY-SA 3.0
- 몬스터 `x_{chainmail,cloth,leather,plate}_{archer,brute,mage}` · `x_shadow_wyvern` · `x_thug_slinger` — m7600 "skeleton_quest" Flare 모드 (github.com/m7600/skeleton_quest). Flare 그림 바탕, CC-BY-SA 3.0으로 다룬다 (원작자 표기는 모드 안 credits 기준: Flare 팀 · VWolfDog 외)
- 몬스터 `x_wyvern_adult` · `x_stealth` — DrBenson "Flare-Remodify" (github.com/DrBenson/Flare-Remodify)의 fantasycore, CC-BY-SA 3.0
- 변환: `node tools/prep-enemies-extra.mjs --each <몬스터별 폴더>...`

## v0.41 건물 · 폐허 조각 (assets/flare/props, tiles.json의 props) — OpenGameArt
- "Hut", "Medieval Building 01 ~ 03, 06", "Watermill" — Bleed (Bleed's Game Art, opengameart.org/users/bleed), CC-BY 3.0
- "Medieval Stable (Isometric 2.5D)", "Medieval Archery Range (Isometric 2.5D)", "Western-European Medieval Houses (Isometric 2.5D)" — CC0
- "isometric medieval buildings" (mhouse) — OpenGameArt, CC0/CC-BY (원 페이지 표기 따름)
- "Old ruins tileset" (돌무더기 · 기둥 · 벽감 · 석상 · 아치 문, 얼어붙은 것 포함) — CC-BY-SA 3.0. 모델: Spelle (blendswap, CC-BY 3.0), Flare grassland walls
- 변환: `node tools/prep-props.mjs <받아 푼 폴더>`

## v0.41 효과 그림 (assets/flare/powers/c_* 등)
- c_* (땅 가시 · 얼음 가시 · 얼음/물 촉수 · 번개 발톱 · 불기둥 · 물 구슬 · 회오리 · 화살비): "Valley of Concordia" (makrohn/concordia, Flare 모드), CC-BY-SA 3.0 — 작가는 그 저장소 AUTHORS
- bear_trap · bolas · caltrops · spit · status_freeze: flare-game (fantasycore · empyrean_campaign), CC-BY-SA 3.0
- dark_mist_alt: Fallen Kingdom (Smujb/fallen-kingdom, Flare 모드), CC-BY-SA 3.0
- 변환: `node tools/prep-powers-extra.mjs <효과별 폴더>...`

## v0.41 둘째 아이콘 묶음 (assets/flare/icons2.webp) — OpenGameArt
- "Flare weapon icons 2" (몽둥이 · 철퇴 · 망치 · 도끼) — CC0
- "Orbs Collection" (보주) — CC0
- "Painterly Spell Icons" part 1 ~ 4 — J. W. Bjerk (eleazzaar), CC-BY 3.0 (CC-BY-SA 3.0/4.0 중 선택)
- 만들기: `node tools/prep-icons2.mjs <받아 푼 폴더>` → src/data/icons2.js

## v0.41.2 더한 것
- 몬스터 `x_goblin_spearman_elite` — "FLARE Mod - Goblin Spearman Elite", Short-Ribs (OpenGameArt), CC-BY 3.0. 동작 정의는 옛 Flare 격자(128×128)로 직접 적음
- 효과 `inferno_aura` — "Fire Aura (Compatible with FLARE)", astiar_rpg (OpenGameArt), CC-BY 4.0
- 소품 (props 20~25 · 30~35) — "Isometric Tileset: Gothic Archways" · "Dark Fantasy Isometric Tiles", Of Far Different Nature (OpenGameArt), CC-BY 4.0
- 스킬 아이콘: 검 · 활 · 버프 스킬까지 모두 "Painterly Spell Icons" (J. W. Bjerk, CC-BY 3.0)

## v0.41.3 더한 몬스터 (OpenGameArt, Flare 형식 옛 격자 128×128 — 동작 칸은 눈으로 보고 적음)
- `x_goblin_charger` · `x_goblin_shaman` · `x_goblin_spearman` — "FLARE Mod - Goblin Charger / Shaman / Spearman", Short-Ribs, CC-BY 3.0
- `x_slime` — "Slime Flare sprite sheets", CC-BY-SA 3.0 / CC-BY 3.0
- `x_golem` — "Golem" (OpenGameArt), CC-BY 3.0
- `x_zombie` — "Zombie Sprites" (OpenGameArt), CC-BY 3.0

## v0.43 사용자가 받은 16방향 렌더 캐릭터 (itch.io)
- `x_beast_warrior` (Optimized_Spritesheets) · `x_heavy_orc` (2D Directional Heavy Orc) · `x_orc_brute` (NoArmor 256x256 / 2D Directional Base Orc) — 사용자가 itch.io에서 받은 묶음. 묶음 안에 라이선스 파일이 없어 원 페이지의 사용 조건을 사용자가 확인함 (출처 페이지 주소를 받으면 여기에 적는다)
- 변환: `node tools/prep-dir-chars.mjs <푼 폴더>` (16방향 중 8방향 · 동작당 10프레임 · 잘라 한 장으로)

## v0.44 사용자가 받은 묶음 (구글 드라이브 「에베이에셋」)
- 몬스터 `x_snake` (뱀) · `x_fishman` (Ichtian 어인) · `x_ice_mummy` (Opaque Ice) · `x_tusk_beast` (엄니 짐승) · `x_centipede` (지네) · `x_spider_horror` (거미) — 「2D Directional」 계열 16방향 렌더 묶음. 묶음 안에 라이선스 파일이 없음 — 사용자가 원 페이지에서 무료 사용 조건 확인
- 효과 `p_*` — Painted Spells Free Sample 2: 게임 안 사용 자유 · 표기 불필요 · 파일 재배포 금지 · AI 학습 금지
- 효과 `v_*` — Free VFX Sampler (묶음 안 VERIFICATION 파일만 있음, 사용 조건은 원 페이지)
- 효과 `h_*` — Free Haunted Effects by SovDigital: 게임 안 사용 자유 · 표기 권장 · 단독 재배포 금지 · AI 학습 금지
- 몬스터 `x_fishman_mace` · `x_fishman_blade` (Ichtian 다른 무기) · `x_spearman` (창병) · `x_knight` (2D HD Character Knight) — 사용자가 사용 조건(무료) 확인
- 효과 `b_*` — Brackeys VFX Bundle predrawn, CC0 (Picster · Kenney · Thomas Iché, 묶음 안 CREDITS)
- 효과 `bell_*` — PIPOYA FREE VFX Bell (사용자가 사용 조건 확인)
- 변환: `node tools/prep-dir-chars.mjs <폴더> <이름,...>` · `node tools/prep-powers-frames.mjs <폴더>`

## v0.44.8 셋째 아이콘 묶음 (assets/flare/icons3.webp, 번호 1000부터)
- 보석 · 열쇠 · 금화 · 상자 · 구슬: "Dark Fantasy Currency and Chests vol.05" (사용자가 받은 묶음, Readme의 사용 조건)
- 재료 · 신화의 흔적: "Free RPG Dragon Loot Icons" (craftpix.net, https://craftpix.net/file-licenses/)
- 금강석: "256x256 Gemstones Icon Pack" (사용자가 사용 조건 확인)
- 강화 주문서(v0.44.9): "Scrolls" 묶음 part 1 (사용자가 사용 조건 확인)
- 무기(v0.44.10): "3D Fantasy Weapons Pack" (low) GLB를 직접 찍은 그림 (README · LICENSE 묶음 안, 사용자가 사용 조건 확인) — tools/glb-icons
- 변환: `node tools/prep-icons3.mjs <푼 폴더>`

## 구글 드라이브 「에베이에셋」 (assets/drive/, 2026-11-19 — 아직 게임에서 쓰지 않음, docs/드라이브에셋.md)
- `buildings/tavern_*` — "Medieval Tavern", Bleed (http://remusprites.carbonmade.com/). 출처 표기 · 수정 · 상업 이용 가능, 재판매 · 재라이선스 금지
- `trees/tree*` (`_tree_01~14`) · `spell_icons.webp` (`00 Spell Icons.png`) — 사용자가 모은 묶음. 묶음 안에 라이선스가 없어 출처 페이지를 받으면 여기에 적는다
- `loot_icons.webp` — "Dark Fantasy Currency and Chests vol.05", M-Xing Studio. 상업 이용 · 수정 가능, 원본 재배포 · AI 학습 금지 (출처 표기 권장)
- `fx/bell*` — "PIPOYA FREE VFX Bell", PIPOYA (무료 소재, 출처 표기)
- `warlock_icons.webp` — "Free Warlock Skills", craftpix.net (https://craftpix.net/file-licenses/)
- `fire_icons*.webp` — "Skill Icon Pack 4.0", Wenrexa (무료 묶음)
- `scroll_icons.webp` (`scrolls_part_2`) · `buildings/cottage_*` (`Timbered House_16`, Bleed 작품으로 보임) — 사용자가 모은 묶음, 출처 페이지를 받으면 적는다
- 변환: `python3 tools/prep-drive.py <받아 푼 폴더>`
