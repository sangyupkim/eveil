# 구글 드라이브 「에베이에셋」 묶음 → 게임용 webp (assets/drive/)
# 사용: python3 tools/prep-drive.py <받아 푼 폴더>   (폴더 안에 _tree_01 … _tree_14, Medieval-Tavern, 그리고 Spell_Icons.png)
import sys, glob, os, re
from PIL import Image
import numpy as np
X = sys.argv[1]
os.makedirs('assets/drive/trees', exist_ok=True); os.makedirs('assets/drive/buildings', exist_ok=True)
# 나무 14종 × 8방향 (파일 이름 끝 _{방향}0000.png): 여백을 잘라 높이 360px
for d in sorted(glob.glob(X + '/_tree_*')):
    n = re.search(r'_tree_(\d+)', d).group(1)
    for f in sorted(glob.glob(d + '/*/*.png')):
        k = int(re.search(r'_(\d)0000\.png', f).group(1))
        im = Image.open(f).convert('RGBA'); im = im.crop(im.getbbox()); s = min(1, 360 / im.height)
        im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS).save(f'assets/drive/trees/tree{n}_{k}.webp', 'WEBP', quality=86, method=6)
# 주점 8방향: 그림자 위에 건물을 겹쳐 한 장, 0.62배
T = X + '/Medieval-Tavern'
bs = sorted(glob.glob(T + '/**/medieval-tavern_*0000*.png', recursive=True)); ss = sorted(glob.glob(T + '/**/shadow_medieval-tavern*.png', recursive=True))
for i, (b, sh) in enumerate(zip(bs, ss)):
    a = Image.open(sh).convert('RGBA'); a.alpha_composite(Image.open(b).convert('RGBA')); a = a.crop(a.getbbox())
    a.resize((round(a.width * 0.62), round(a.height * 0.62)), Image.LANCZOS).save(f'assets/drive/buildings/tavern_{i}.webp', 'WEBP', quality=86, method=6)
# 주문 아이콘 140개 (14 × 10 격자): 칸을 찾아 64px, 한 줄 8칸 (icons*.webp와 같은 배치)
im = Image.open(X + '/Spell_Icons.png').convert('RGB'); a = np.asarray(im).astype(int).sum(2)
def runs(v, th):
    out, s = [], None
    for i, x in enumerate(v):
        if x > th and s is None: s = i
        if x <= th and s is not None: out.append((s, i)); s = None
    return [r for r in out if r[1] - r[0] > 40]
C, R = runs(a.mean(0), a.mean(0).mean() * 0.5), runs(a.mean(1), a.mean(1).mean() * 0.5)
sheet = Image.new('RGBA', (64 * 8, 64 * ((len(C) * len(R) + 7) // 8))); k = 0
for (y0, y1) in R:
    for (x0, x1) in C:
        c = im.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3)); w = min(c.size)
        c = c.crop(((c.width - w) // 2, (c.height - w) // 2, (c.width - w) // 2 + w, (c.height - w) // 2 + w)).resize((64, 64), Image.LANCZOS)
        sheet.paste(c, ((k % 8) * 64, (k // 8) * 64)); k += 1
sheet.save('assets/drive/spell_icons.webp', 'WEBP', quality=90, method=6)

# 금화 · 상자 · 열쇠 · 보석 아이콘 (dark_fantasy_currency_and_chests) → 64px, 한 줄 8칸, 파일 이름 순서
fs = sorted(glob.glob(X + '/chests/**/*.png', recursive=True))
if fs:
    sheet = Image.new('RGBA', (64 * 8, 64 * ((len(fs) + 7) // 8)))
    for k, f in enumerate(fs):
        im = Image.open(f).convert('RGBA'); im = im.crop(im.getbbox()); w = max(im.size); c = Image.new('RGBA', (w, w)); c.paste(im, ((w - im.width) // 2, (w - im.height) // 2))
        sheet.paste(c.resize((60, 60), Image.LANCZOS), ((k % 8) * 64 + 2, (k // 8) * 64 + 2))
    sheet.save('assets/drive/loot_icons.webp', 'WEBP', quality=90, method=6)
# 종 효과 (PIPOYA, 192px 칸)
os.makedirs('assets/drive/fx', exist_ok=True)
for f in sorted(glob.glob(X + '/pipoya/*/192x192/*.png')):
    Image.open(f).save('assets/drive/fx/' + os.path.basename(f).split('_')[0].replace('pipo-btleffect', 'bell') + '.webp', 'WEBP', quality=88, method=6)
