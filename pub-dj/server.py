#!/usr/bin/env python3
"""The Local DJ pilot. Run behind HTTPS for access outside a trusted local network."""
import hashlib, hmac, json, mimetypes, os, secrets, sqlite3, threading, time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
LOCK = threading.RLock()
DB = None
PASSWORD = ''
CODE = ''
MUSIC = None
VENUE = ''
SECURE = False

def init(data, music, password, code, venue='The Local', secure=False):
    global DB, PASSWORD, CODE, MUSIC, VENUE, SECURE
    if len(password) < 12: raise ValueError('DJ_HOST_PASSWORD must contain at least 12 characters')
    if not (len(code) == 6 and code.isdigit()): raise ValueError('DJ_JOIN_CODE must be six digits')
    Path(data).parent.mkdir(parents=True, exist_ok=True)
    DB = sqlite3.connect(data, check_same_thread=False)
    DB.row_factory = sqlite3.Row
    DB.executescript('''
      create table if not exists sessions(token text primary key, role text, expires integer);
      create table if not exists requests(id integer primary key, track text, member text, status text default 'pending', created real);
      create table if not exists votes(request integer, member text, primary key(request,member));
      create table if not exists settings(key text primary key,value text);
    ''')
    for key, value in {'open':'true','current':'null','mode':'All music'}.items():
        DB.execute('insert or ignore into settings values(?,?)', (key,value))
    DB.commit()
    PASSWORD, CODE, MUSIC, VENUE, SECURE = password, code, Path(music).resolve(), venue, secure
    MUSIC.mkdir(parents=True, exist_ok=True)

def catalogue():
    result = []
    for path in sorted(MUSIC.iterdir()):
        if path.is_file() and not path.is_symlink() and path.suffix.lower() in ('.mp3','.wav','.ogg','.m4a'):
            parts = path.stem.split(' - ', 2)
            artist, title, mood = (parts + ['Venue collection','All music'])[:3] if len(parts)>1 else ('Venue collection',parts[0],'All music')
            result.append({'id':hashlib.sha256(path.name.encode()).hexdigest()[:20], 'title':title,'artist':artist,'mood':mood,'file':path})
    return result

def settings():
    return dict(DB.execute('select key,value from settings').fetchall())

def put(key, value):
    DB.execute('insert or replace into settings values(?,?)',(key,value))

class Handler(BaseHTTPRequestHandler):
    server_version = 'LocalDJ/0.1'
    def log_message(self,*args): pass
    def reply(self, data, status=200, cookie=None):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Length',str(len(body)))
        if cookie: self.send_header('Set-Cookie',cookie)
        self.end_headers(); self.wfile.write(body)
    def identity(self,role):
        cookie = SimpleCookie()
        try: cookie.load(self.headers.get('Cookie',''))
        except Exception: return None
        value = cookie.get('pubdj_'+role)
        if not value: return None
        token = hashlib.sha256(value.value.encode()).hexdigest()
        row = DB.execute('select token from sessions where token=? and role=? and expires>?',(token,role,time.time())).fetchone()
        return row['token'] if row else None
    def session(self, role):
        raw=secrets.token_urlsafe(32); token=hashlib.sha256(raw.encode()).hexdigest()
        DB.execute('delete from sessions where expires<?',(time.time(),))
        DB.execute('insert into sessions values(?,?,?)',(token,role,time.time()+43200)); DB.commit()
        return f'pubdj_{role}={raw}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200'+('; Secure' if SECURE else '')
    def state(self):
        cfg=settings(); host=bool(self.identity('host')); guest=bool(self.identity('guest'))
        tracks=[{k:v for k,v in t.items() if k!='file'} for t in catalogue()]
        rows=[]
        member=self.identity('guest')
        if guest or host:
            for row in DB.execute("select r.id,r.track,r.status,count(v.member) votes from requests r left join votes v on v.request=r.id where r.status in ('pending','approved') group by r.id order by votes desc,r.created asc"):
                item=dict(row)
                if item['status']=='pending' and not host: continue
                item['voted']=bool(DB.execute('select 1 from votes where request=? and member=?',(item['id'],member)).fetchone())
                rows.append(item)
        return {'venue':VENUE,'host':host,'joined':guest,'open':cfg['open']=='true','current':json.loads(cfg['current']), 'mode':cfg['mode'],'tracks':tracks if guest or host else [],'queue':rows,'code':CODE if host else None}
    def do_GET(self):
        with LOCK:
            route=urlsplit(self.path).path
            if route=='/api/state': return self.reply(self.state())
            if route.startswith('/api/audio/'):
                if not self.identity('host'): return self.reply({'error':'Host access required'},403)
                track=next((t for t in catalogue() if t['id']==route.split('/')[-1]),None)
                if not track: return self.reply({'error':'Track not found'},404)
                path=track['file']; body=path.read_bytes()
                self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(path.name)[0] or 'audio/mpeg')
                self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(body)))
                self.end_headers(); self.wfile.write(body); return
            allowed={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/discovery.js':'discovery.js','/deck-controller.js':'deck-controller.js','/cloud-client.js':'cloud-client.js','/config.js':'../config.js','/style.css':'style.css'}
            if route not in allowed: return self.reply({'error':'Not found'},404)
            path=ROOT/allowed[route]; body=path.read_bytes()
            self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(path.name)[0] or 'text/plain')
            self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Referrer-Policy','no-referrer')
            self.send_header('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
            self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_POST(self):
        origin=self.headers.get('Origin')
        if origin and urlsplit(origin).netloc!=self.headers.get('Host'): return self.reply({'error':'Invalid origin'},403)
        if self.headers.get('Content-Type','').split(';')[0]!='application/json': return self.reply({'error':'JSON required'},415)
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=4096: return self.reply({'error':'Invalid request size'},413)
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict): raise ValueError()
        except (ValueError,UnicodeError): return self.reply({'error':'Invalid JSON'},400)
        with LOCK:
            try: self.action(urlsplit(self.path).path,data)
            except (ValueError,KeyError,TypeError): self.reply({'error':'Invalid request'},400)
    def action(self,path,data):
        if path in ('/api/login','/api/join'):
            # A small per-IP limiter prevents repeated password/code guessing.
            key='attempt:'+self.client_address[0]+':'+str(int(time.time()//60))
            attempts=int(settings().get(key,'0'))
            if attempts>=20: return self.reply({'error':'Too many attempts. Try again in a minute.'},429)
            DB.execute("delete from settings where key like 'attempt:%' and key not like ?",('%:'+str(int(time.time()//60)),))
            put(key,str(attempts+1)); DB.commit()
            host=path=='/api/login'; value=data.get('password' if host else 'code','')
            if not isinstance(value,str) or not hmac.compare_digest(value,PASSWORD if host else CODE):
                return self.reply({'error':'Check your password' if host else 'Check the six-digit venue code'},401)
            return self.reply({'ok':True},cookie=self.session('host' if host else 'guest'))
        host=self.identity('host'); member=self.identity('guest')
        if path in ('/api/request','/api/vote'):
            if not member: return self.reply({'error':'Join this venue first'},401)
            if settings()['open']!='true': return self.reply({'error':'Requests are paused'},409)
            if path=='/api/request':
                track=data.get('track')
                if not any(t['id']==track for t in catalogue()): return self.reply({'error':'Track unavailable'},404)
                if DB.execute("select 1 from requests where track=? and status in ('pending','approved')",(track,)).fetchone():
                    return self.reply({'error':'Already requested. Vote for it in the queue.'},409)
                if DB.execute('select count(*) from requests where member=? and created>?',(member,time.time()-600)).fetchone()[0]>=3:
                    return self.reply({'error':'Three requests per ten minutes. Vote while you wait.'},429)
                DB.execute('insert into requests(track,member,created) values(?,?,?)',(track,member,time.time()))
            else:
                rid=int(data['id'])
                if not DB.execute("select 1 from requests where id=? and status='approved'",(rid,)).fetchone():
                    return self.reply({'error':'Request unavailable'},404)
                DB.execute('insert or ignore into votes values(?,?)',(rid,member))
        else:
            if not host: return self.reply({'error':'Host access required'},403)
            if path=='/api/moderate':
                if data['status'] not in ('approved','rejected'): raise ValueError()
                DB.execute("update requests set status=? where id=? and status in ('pending','approved')",(data['status'],int(data['id'])))
            elif path=='/api/settings':
                if 'open' in data:
                    if not isinstance(data['open'],bool): raise ValueError()
                    put('open',str(data['open']).lower())
                if 'mode' in data:
                    if data['mode'] not in ['All music']+[t['mood'] for t in catalogue()]: raise ValueError()
                    put('mode',data['mode'])
            elif path=='/api/next':
                cfg=settings(); track=None
                valid={t['id'] for t in catalogue()}
                for row in DB.execute("select r.id,r.track,count(v.member) votes from requests r left join votes v on v.request=r.id where r.status='approved' group by r.id order by votes desc,r.created asc"):
                    DB.execute("update requests set status='played' where id=?",(row['id'],))
                    if row['track'] in valid: track=row['track']; break
                if not track:
                    tracks=[t for t in catalogue() if cfg['mode']=='All music' or t['mood']==cfg['mode']]
                    current=json.loads(cfg['current'])
                    options=[t for t in tracks if t['id']!=(current or {}).get('track')] or tracks
                    if options: track=secrets.choice(options)['id']
                put('current',json.dumps({'track':track,'started':time.time()}) if track else 'null')
            elif path=='/api/stop': put('current','null')
            else: return self.reply({'error':'Not found'},404)
        DB.commit(); self.reply({'ok':True})

def main():
    password=os.environ.get('DJ_HOST_PASSWORD','')
    if len(password)<12: raise SystemExit('Set DJ_HOST_PASSWORD to a strong password (12+ characters).')
    code=os.environ.get('DJ_JOIN_CODE') or str(secrets.randbelow(900000)+100000)
    init(os.environ.get('DJ_DATABASE',str(ROOT/'data'/'dj.sqlite')),os.environ.get('DJ_MUSIC_DIR',str(ROOT/'music')),password,code,os.environ.get('DJ_VENUE','The Local'),os.environ.get('DJ_SECURE_COOKIES')=='1')
    port=int(os.environ.get('PORT','8787')); bind=os.environ.get('DJ_BIND','127.0.0.1')
    print(f'The Local DJ: http://{bind}:{port} | Venue code: {code}',flush=True)
    ThreadingHTTPServer((bind,port),Handler).serve_forever()
if __name__=='__main__': main()
