import unittest,tempfile,os,io,zipfile,threading,json
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
import server
class HostingTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();server.DATA=Path(self.tmp.name);server.TOKEN='t'*40;server.init()
  with server.db() as c:c.execute('INSERT INTO projects VALUES(?,?,NULL,?)',('demo','Demo',1))
 def tearDown(self):self.tmp.cleanup()
 def archive(self,files):
  b=io.BytesIO()
  with zipfile.ZipFile(b,'w') as z:
   for name,value in files.items():z.writestr(name,value)
  return b.getvalue()
 def test_release_is_not_automatically_live(self):
  r=server.deploy('demo',self.archive({'index.html':'Hello'}))
  self.assertIsNone(server.snapshot()['projects'][0]['active']);self.assertEqual((server.DATA/'releases'/r['id']/'index.html').read_text(),'Hello')
 def test_nested_folder(self):
  r=server.deploy('demo',self.archive({'dist/index.html':'nested','dist/a.js':'ok'}));self.assertTrue((server.DATA/'releases'/r['id']/'a.js').exists())
 def test_reject_unsafe_or_secret(self):
  for name in ['../escape','/absolute','a/../../escape','a\\evil','.env','nested/.git/config','private.key']:
   with self.subTest(name=name),self.assertRaises(ValueError):server.deploy('demo',self.archive({'index.html':'hi',name:'bad'}))
 def test_missing_index(self):
  with self.assertRaises(ValueError):server.deploy('demo',self.archive({'x.txt':'x'}))
 def test_netlify_warning(self):
  r=server.deploy('demo',self.archive({'index.html':'ok','_redirects':'/* /index.html 200'}));self.assertTrue(r['warnings'])
 def test_http_auth_publish_rollback_and_isolation(self):
  admin=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
  class Public(server.Handler):public=True
  public=server.ThreadingHTTPServer(('127.0.0.1',0),Public)
  for s in (admin,public):threading.Thread(target=s.serve_forever,daemon=True).start()
  def req(s,path,body=None,auth=True,host=None):
   headers={}
   if auth:headers['Authorization']='Bearer '+server.TOKEN
   if host:headers['Host']=host
   raw=json.dumps(body).encode() if body is not None else None
   return urlopen(Request('http://127.0.0.1:'+str(s.server_port)+path,raw,headers),timeout=5)
  try:
   with self.assertRaises(HTTPError) as e:req(admin,'/api/state',auth=False)
   self.assertEqual(e.exception.code,401)
   first=server.deploy('demo',self.archive({'index.html':'first'}));second=server.deploy('demo',self.archive({'index.html':'second'}))
   for r,expected in [(first,b'first'),(second,b'second'),(first,b'first')]:
    with req(admin,'/api/publish',{'slug':'demo','release':r['id']}) as response:self.assertEqual(response.status,200)
    with req(public,'/deep-route',auth=False,host='demo.localhost') as response:self.assertEqual(response.read(),expected)
   with self.assertRaises(HTTPError):req(admin,'/api/publish',{'slug':'other','release':first['id']})
   with req(public,'/api/state',auth=False,host='demo.localhost') as response:self.assertEqual(response.read(),b'first')
   with self.assertRaises(HTTPError):req(public,'/api/projects',{},host='demo.localhost')
   with req(admin,'/',auth=False) as response:self.assertIn(b'LocalLaunch',response.read())
  finally:
   for s in (admin,public):s.shutdown();s.server_close()

class ExtendedTests(unittest.TestCase):
 setUp=HostingTests.setUp
 tearDown=HostingTests.tearDown
 archive=HostingTests.archive
 def test_preview_before_publish_and_project_isolation(self):
  r=server.deploy('demo',self.archive({'index.html':'preview'}))
  class Public(server.Handler):public=True
  http=server.ThreadingHTTPServer(('127.0.0.1',0),Public)
  threading.Thread(target=http.serve_forever,daemon=True).start()
  def get(host,method='GET'):
   return urlopen(Request('http://127.0.0.1:'+str(http.server_port)+'/',headers={'Host':host},method=method),timeout=5)
  try:
   with get('v'+r['id']+'--demo.localhost') as response:self.assertEqual(response.read(),b'preview')
   with get('v'+r['id']+'--demo.localhost','HEAD') as response:self.assertEqual(response.read(),b'');self.assertEqual(response.headers['Content-Length'],'7')
   with self.assertRaises(HTTPError):get('v'+r['id']+'--other.localhost')
   with self.assertRaises(HTTPError):get('demo.localhost')
   self.assertIsNone(server.snapshot()['projects'][0]['active'])
  finally:http.shutdown();http.server_close()
 def test_generated_production_urls(self):
  from unittest.mock import patch
  with patch.dict(os.environ,{'SITE_BASE_DOMAIN':'sites.example.org','PUBLIC_SCHEME':'https','PUBLIC_URL_PORT':''}):
   self.assertEqual(server.site_url('demo'),'https://demo.sites.example.org/')
 def test_backup_restore_and_no_overwrite(self):
  import backup,sqlite3
  r=server.deploy('demo',self.archive({'index.html':'saved'}))
  with tempfile.TemporaryDirectory() as tmp:
   output=Path(tmp)/'backup.zip';self.assertEqual(backup.backup(server.DATA,output),1)
   with self.assertRaises(FileExistsError):backup.backup(server.DATA,output)
   restored=Path(tmp)/'restored';restored.mkdir()
   with zipfile.ZipFile(output) as z:z.extractall(restored)
   with sqlite3.connect(restored/'state.db') as c:self.assertEqual(c.execute('SELECT id FROM releases').fetchone()[0],r['id'])
   self.assertEqual((restored/'releases'/r['id']/'index.html').read_text(),'saved')
  with self.assertRaises(ValueError):backup.backup(server.DATA,server.DATA/'unsafe.zip')

if __name__=='__main__':unittest.main()
