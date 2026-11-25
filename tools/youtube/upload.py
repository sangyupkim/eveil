#!/usr/bin/env python3
# promo/shorts/<이름>/ 안의 video.mp4 + meta.json 을 유튜브에 올린다. 올린 폴더에는 done.json(영상 id)을 남긴다.
# 환경 변수 YT_CLIENT_ID · YT_CLIENT_SECRET · YT_REFRESH_TOKEN (GitHub Secrets). 인자로 폴더 이름을 주면 그것만.
# meta.json: { "title", "description", "tags": [], "privacy": "public|unlisted|private", "comment": "고정할 댓글(선택)" }
import os, sys, json, glob, urllib.parse, urllib.request

def token():
    body = urllib.parse.urlencode({'client_id': os.environ['YT_CLIENT_ID'], 'client_secret': os.environ['YT_CLIENT_SECRET'],
                                   'refresh_token': os.environ['YT_REFRESH_TOKEN'], 'grant_type': 'refresh_token'}).encode()
    return json.load(urllib.request.urlopen('https://oauth2.googleapis.com/token', body))['access_token']

def call(req):
    try:
        return urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        sys.exit(f'유튜브 오류 {e.code}: {e.read().decode()[:800]}')

def upload(folder, tk):
    m = json.load(open(f'{folder}/meta.json', encoding='utf-8'))
    meta = {'snippet': {'title': m['title'][:100], 'description': m.get('description', ''), 'tags': m.get('tags', []),
                        'categoryId': m.get('category', '20'), 'defaultLanguage': 'en', 'defaultAudioLanguage': 'en'},
            'status': {'privacyStatus': m.get('privacy', 'public'), 'selfDeclaredMadeForKids': False}}
    vid = f'{folder}/video.mp4'; size = os.path.getsize(vid)
    r = call(urllib.request.Request('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        data=json.dumps(meta).encode(), method='POST', headers={'Authorization': f'Bearer {tk}',
        'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': str(size)}))
    loc = r.headers['Location']
    with open(vid, 'rb') as f:
        res = json.load(call(urllib.request.Request(loc, data=f.read(), method='PUT',
            headers={'Authorization': f'Bearer {tk}', 'Content-Type': 'video/mp4'})))
    out = {'id': res['id'], 'url': f"https://youtube.com/shorts/{res['id']}", 'privacy': res['status']['privacyStatus']}
    if m.get('comment'):  # 고정 댓글용 첫 댓글 (고정은 API로 안 되어 스튜디오에서 한 번 누른다)
        call(urllib.request.Request('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', method='POST',
            data=json.dumps({'snippet': {'videoId': res['id'], 'topLevelComment': {'snippet': {'textOriginal': m['comment']}}}}).encode(),
            headers={'Authorization': f'Bearer {tk}', 'Content-Type': 'application/json'}))
    json.dump(out, open(f'{folder}/done.json', 'w'), ensure_ascii=False, indent=1)
    print(f'올림: {folder} → {out["url"]} ({out["privacy"]})')

names = sys.argv[1:]
todo = [f'promo/shorts/{n}' for n in names] if names else sorted(
    d for d in glob.glob('promo/shorts/*') if os.path.exists(f'{d}/meta.json') and not os.path.exists(f'{d}/done.json'))
if not todo: print('올릴 영상이 없습니다'); sys.exit(0)
tk = token()
for d in todo: upload(d, tk)
