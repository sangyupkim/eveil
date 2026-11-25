#!/usr/bin/env python3
# 유튜브 업로드 열쇠(refresh token) 받기 — 사장님 컴퓨터에서 한 번만 실행한다.
#   python3 get_token.py 클라이언트ID 클라이언트비밀값
# 브라우저가 열리면 유튜브 채널 계정으로 로그인 → 허용. 창에 나온 refresh token을 GitHub Secrets에 넣는다.
import sys, json, secrets, webbrowser, urllib.parse, urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

if len(sys.argv) != 3:
    sys.exit('사용법: python3 get_token.py 클라이언트ID 클라이언트비밀값')
CID, SEC = sys.argv[1], sys.argv[2]
state = secrets.token_urlsafe(16)
got = {}

class H(BaseHTTPRequestHandler):
    def do_GET(self):
        q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query))
        if q.get('state') == state and 'code' in q:
            got['code'] = q['code']
        self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.end_headers()
        self.wfile.write('<h2>완료. 이 창을 닫고 터미널을 보세요.</h2>'.encode())
    def log_message(self, *a): pass

srv = HTTPServer(('127.0.0.1', 0), H)
redirect = f'http://127.0.0.1:{srv.server_port}'
url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode({
    'client_id': CID, 'redirect_uri': redirect, 'response_type': 'code', 'state': state,
    'scope': 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl',
    'access_type': 'offline', 'prompt': 'consent'})
print('브라우저에서 로그인하세요. 안 열리면 이 주소를 복사해 여세요:\n' + url)
webbrowser.open(url)
while 'code' not in got:
    srv.handle_request()
body = urllib.parse.urlencode({'code': got['code'], 'client_id': CID, 'client_secret': SEC,
                               'redirect_uri': redirect, 'grant_type': 'authorization_code'}).encode()
tok = json.load(urllib.request.urlopen('https://oauth2.googleapis.com/token', body))
if 'refresh_token' not in tok:
    sys.exit('refresh token을 받지 못했습니다: ' + json.dumps(tok))
print('\n=== YT_REFRESH_TOKEN (GitHub Secrets에 넣을 값) ===\n' + tok['refresh_token'])
