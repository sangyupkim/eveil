# 유튜브 자동 업로드

쇼츠는 `promo/shorts/<이름>/`에 `video.mp4` + `meta.json`을 넣어 작업 브랜치에 push하면 GitHub Actions 「유튜브 올리기」가 올린다.
올린 폴더에는 `done.json`(영상 id · 주소)이 생긴다. 액션이 이 기록을 작업 브랜치에 커밋하므로, 다음 작업 전에 `git pull`.
`promo/`는 사이트 배포에서 뺐다 (`.assetsignore`).

```json
{ "title": "... #Shorts", "description": "...", "tags": ["..."], "privacy": "public", "comment": "Play free: https://weak0416.itch.io/eveil" }
```

## 처음 한 번 설정 (사장님)
1. **구글 클라우드 프로젝트 · API** — console.cloud.google.com → 새 프로젝트 `eveil-youtube` → `YouTube Data API v3` 「사용」.
2. **OAuth 동의 화면** — 「API 및 서비스 → OAuth 동의 화면(Google 인증 플랫폼)」 → 시작하기 → 앱 이름 `Eveil Uploader`, 지원 이메일 = 본인, 대상 **외부**, 연락처 = 본인 → 만들기. 「대상」에서 **앱 게시 → 프로덕션** (테스트로 두면 7일마다 열쇠가 풀린다). 확인 안 된 앱 경고는 본인만 쓰니 괜찮다.
3. **OAuth 클라이언트** — 「클라이언트 → 클라이언트 만들기」 → 유형 **데스크톱 앱**, 이름 `uploader` → 클라이언트 ID · 비밀값 복사.
4. **열쇠 받기** — 본인 컴퓨터에서 `python3 tools/youtube/get_token.py <ID> <비밀값>` → 브라우저에서 유튜브 채널 계정 선택 → 「고급 → 이동(안전하지 않음)」 → 허용 → 터미널에 나온 refresh token 복사.
5. **GitHub Secrets** — 저장소 Settings → Secrets and variables → Actions → New repository secret: `YT_CLIENT_ID` · `YT_CLIENT_SECRET` · `YT_REFRESH_TOKEN`.
6. **API 감사 신청** — 심사 전 프로젝트로 올린 영상은 비공개로 잠긴다. 「YouTube API Services - Audit and Quota Extension Form」을 낸다 (사용 목적: 본인 채널에 자기 게임 홍보 쇼츠를 올리는 내부 도구).

## 지금 상태 (2026-11-25)
- 1~5단계 끝. 쇼츠 1편(`01_no_classes`)을 비공개로 올렸고, 스튜디오에서 공개로 바꾸는 것도 됐다 (잠기지 않음).
- 2편(`02_meteor_storm`)은 공개로 바로 올라갔다 (댓글도 자동). 공개가 막히면 6단계(감사 신청).
- **예약**: meta.json에 `"date": "YYYY-MM-DD"`를 넣으면 매일 15:20 UTC(한국 밤 12시 20분 · 미국 동부 오전 10시)에 날짜가 된 것 중 한 편만 올린다. 예약 실행은 기본 브랜치(배포 브랜치)의 워크플로가 돌리므로 워크플로를 고치면 배포 브랜치에도 올린다.

## 한도
기본 할당량 하루 10,000 단위, 영상 한 개 올리기 ≈ 1,600 단위 → 하루 6개까지.
