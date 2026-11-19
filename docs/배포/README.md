# 에베이 (ÉVEIL) — 웹게임 사이트 등록 자료

게임 주소: **https://eveil.weak0416.workers.dev**

| 폴더 | 내용 |
|---|---|
| `대표이미지/` | `cover_1920x1080` · `cover_1280x720` (가로 16:9), `cover_800x1200` (세로 2:3), `cover_800x800` (정사각), `cover_630x500_itch` (itch.io 표지), `banner_1500x500` (배너), `icon_512x512` · `icon_1024x1024` (아이콘) |
| `스크린샷/` | 1920×1080 게임 장면 7장 (보스 · 오크 요새 · 늪 · 늪 전투 · 마을 · 스킬 창 · 대장간) |
| `영상/` | `trailer_40s_1080p.mp4` (자막 있는 소개 영상), `trailer_15s_1080p.mp4` (짧은 미리보기), `trailer_40s_720p.mp4`, `poster.jpg` (영상 첫 화면) |
| `임베드/` | `eveil_web.zip` — 사이트에 올리는 HTML5 파일. 실제 게임을 꽉 찬 화면으로 띄우는 실행 파일 하나라, 게임을 고치면 사이트에서도 바로 바뀐다 |

만드는 법 (다시 찍을 때): `tools/promo/`의 스크립트를 한 폴더에 복사해 그 폴더에서 돌린다 (로컬 서버 `PORT=8099 node tools/serve.mjs .`). `scenes.cjs` 스크린샷 · `video.cjs` 영상 프레임(`frames/list.txt` → ffmpeg concat) · `bg.cjs` 화면 글자 없는 배경 → `key.cjs` 대표 이미지 (`key.html` 옆에 `vendor/fonts`를 `fonts/`로, 로고 그림을 `logo.webp`로 둔다).

---

## 이름

- 한국어: **에베이 (ÉVEIL)**
- English: **ÉVEIL** (프랑스어로 「깨어남」)

## 한 줄 소개

- 한국어: 직업은 없다. 네가 싸운 방식이 너를 만든다 — 쿼터뷰 액션 RPG
- English: No classes. The way you fight shapes who you become — an isometric action RPG.

## 짧은 설명 (150자 안팎)

**한국어**
칼을 휘두르면 힘이, 주문을 쓰면 지능이 오르는 행동 성장 쿼터뷰 액션 RPG. 20개 지역과 던전, 300가지에 가까운 스킬, 나만의 마을과 용병까지 — 설치 없이 브라우저에서 바로 즐기세요.

**English**
An isometric action RPG where you grow by what you do: swing a blade and grow stronger, cast spells and grow wiser. 20 regions, dungeons, nearly 300 skills and your own village with mercenaries — play instantly in your browser.

## 긴 설명

**한국어**

에베이는 정해진 직업이 없는 쿼터뷰 액션 RPG입니다. 무엇을 하느냐에 따라 캐릭터가 자랍니다. 칼을 휘두르면 힘이, 활을 쏘면 민첩이, 주문을 쓰면 지능이, 맞으며 버티면 체력이 오릅니다. 각성할 때마다 지금까지 싸워 온 방식에 맞는 칭호와 특성을 고르고, 두 갈래를 섞은 혼합 스킬도 배울 수 있습니다.

- **20개 지역 · 4단계 세계** — 들판에서 종말의 왕좌까지, 지역마다 다른 몬스터와 보스. 평온 · 악몽 · 지옥 · 혼돈으로 갈수록 강해지는 세계
- **300가지에 가까운 스킬** — 화염 · 냉기 · 번개 · 검 · 활 · 신성 · 방패, 그리고 두 갈래를 섞은 혼합 스킬. 쓸수록 랭크가 오르고 변형을 고른다
- **던전 · 숨은 던전 · 범람지** — 매번 다른 변이가 붙는 던전, 지도 조각으로 찾아내는 숨은 던전, 오래 비운 지역에 넘치는 몬스터
- **나만의 마을** — 대장간 · 제작소 · 연구소 · 파견소를 짓고, 용병을 고용해 생산 · 파견 · 연구를 맡긴다
- **장비 파밍** — 등급 · 옵션 · 보석 · 강화 · 제련, 이름 있는 전설과 신화 장비
- **자동 사냥 · 수동 사냥** — 바쁠 땐 자동으로, 직접 싸우면 더 많은 보상과 수련 비전
- **어디서나** — 설치 없이 브라우저에서. 휴대폰(가로 화면) · PC 모두 지원, 계정으로 서버에 저장
- **채팅 · 랭킹** — 다른 모험가와 이야기하고 레벨 · 전투력 순위를 겨룬다

**English**

ÉVEIL is an isometric action RPG with no fixed classes — your character grows from what you actually do. Swing a sword and your Strength rises, fire arrows for Dexterity, cast spells for Intelligence, endure hits for Vitality. Each Awakening lets you pick a title and perk that match your playstyle, and you can learn hybrid skills that mix two paths.

- **20 regions, 4 world tiers** — from peaceful fields to the Throne of the End, each with its own monsters and bosses; Peace, Nightmare, Hell and Chaos make the world ever more dangerous
- **Nearly 300 skills** — fire, frost, lightning, blades, bows, holy and shields, plus hybrid skills; skills rank up as you use them and unlock variants
- **Dungeons, hidden dungeons and floods** — random mutators every run, secret dungeons found from map fragments, and monster floods in regions you leave alone
- **Your own village** — build a smithy, workshop, lab and guild hall; hire mercenaries to produce, research and go on expeditions
- **Loot** — rarities, affixes, gems, enhancement, reforging, named legendaries and mythic gear
- **Auto or manual combat** — let auto-hunt grind for you, or fight yourself for better rewards and training arts
- **Play anywhere** — no install; works on phones (landscape) and PC, with cloud saves
- **Chat and rankings** — talk with other adventurers and compete on level and power ladders

## 조작법 · Controls

| | PC | 휴대폰 (가로) |
|---|---|---|
| 이동 | 클릭 · WASD | 왼쪽 조이스틱 |
| 공격 · 대화 | 클릭 · Space | 공격 버튼 |
| 스킬 | 1 ~ 8 | 오른쪽 스킬 버튼 |
| 물약 | Q (체력) · E (마나) | 물약 버튼 |
| 자동 사냥 · 귀환 | F · R | 자동 · 귀환 버튼 |
| 창 | I 가방 · K 스킬 · C 능력 · J 퀘스트 · N 지도 · M 메뉴 | 위쪽 메뉴 |
| 채팅 | Enter | 왼쪽 아래 [채팅] |

English: Click / WASD to move, Space to attack, 1–8 skills, Q/E potions, F auto-hunt, R recall, I/K/C/J windows, Enter to chat. On mobile use landscape mode with the on-screen joystick and buttons.

## 장르 · 태그

- 장르: RPG / Action RPG
- 태그 (한): 액션RPG, 쿼터뷰, 핵앤슬래시, 파밍, 성장, 판타지, 싱글, 모바일, 브라우저
- Tags (en): action rpg, isometric, hack and slash, arpg, loot, fantasy, singleplayer, idle, mobile, browser, html5

## 사이트별 메모

| 사이트 | 올릴 것 | 메모 |
|---|---|---|
| **itch.io** | `eveil_web.zip` (Kind: HTML, 「This file will be played in the browser」), 표지 `cover_630x500_itch`, 스크린샷 3~5장, 영상은 유튜브 주소 | Viewport는 1280×720, 「Fullscreen button」 · 「Mobile friendly(가로)」 켜기 |
| **GameJolt** | `eveil_web.zip` (Browser build · HTML), 썸네일 `cover_1280x720`, 헤더 `banner_1500x500` | |
| **CrazyGames** | 개발자 포털에 HTML5 · 표지 1920×1080 · 800×1200 · 800×800, 영상 15초 | 정식 등록은 **CrazyGames SDK**(광고 · 진행 상황 알림)를 넣어야 하고, 게임 파일을 직접 올려야 한다 (외부 주소를 띄우는 방식은 거절될 수 있다) |
| **Poki** | 개발자 신청서 | 신청 뒤 심사, 정식은 **Poki SDK** 필요 · 직접 올리기 |
| **Newgrounds** | `eveil_web.zip`, 아이콘 · 스크린샷 | |

주의:
- `eveil_web.zip`은 실제 게임 주소를 꽉 찬 창(iframe)으로 띄운다. 그래서 게임을 고치면 사이트에서도 바로 바뀌지만, 브라우저가 사이트마다 저장 공간을 따로 두기 때문에 **로그인하지 않은 저장은 사이트마다 따로**다. 서버 저장(계정)은 어디서나 같다.
- CrazyGames · Poki처럼 SDK와 직접 업로드가 필요한 곳은 따로 작업이 필요하다 (광고 넣기 · 저장 방식 맞추기).
