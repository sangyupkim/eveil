# GLB 3D 모델 → 무기 아이콘 (v0.44.10)

1. `index.html`과 같은 폴더에 `.glb`와 `three`(node_modules/three 복사)를 두고 `python3 -m http.server 5199`
2. `node shot.mjs <그 폴더>` → `out/*.png` (256, 투명 배경, 45도)
3. `node post.cjs <out> <icon>` → 머리가 오른쪽 위로 맞춘 64칸 아이콘 (FIX 표: 뒤집기 · 돌리기)
4. `icon`을 `<아이콘 묶음 폴더>/wicons`로 복사 → `node tools/prep-icons3.mjs <아이콘 묶음 폴더>`
