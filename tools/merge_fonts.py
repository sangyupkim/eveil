# 글꼴 조각 합치기 (itch용 vendor/fonts/merged). 쓰는 법: python merge_fonts.py vendor/fonts/files <글꼴이름> <출력 폴더>  (pip install fonttools brotli)
import sys,glob,os
from fontTools.ttLib import TTFont
from fontTools.merge import Merger
src,fam,out=sys.argv[1],sys.argv[2],sys.argv[3]
files=sorted(glob.glob(f'{src}/{fam}-*.woff2'))
groups={}
for f in files:
    b=os.path.basename(f); w=b.split('-')[-2] if b.endswith('-normal.woff2') else None
    groups.setdefault(w,[]).append(f)
for w,fs in groups.items():
    tmp=[]
    for i,f in enumerate(fs):
        t=TTFont(f); t.flavor=None; p=f'{out}/_t{i}.ttf'; t.save(p); tmp.append(p)
    m=Merger().merge(tmp); m.flavor='woff2'
    o=f'{out}/{fam}-{w}.woff2'; m.save(o)
    print(o,len(fs),os.path.getsize(o)//1024,'KB', sum(os.path.getsize(x) for x in fs)//1024,'KB before')
    for p in tmp: os.remove(p)
