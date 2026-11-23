import importlib.util, json, tempfile, threading, unittest, urllib.request, urllib.error, http.cookiejar, wave
from pathlib import Path
from http.server import ThreadingHTTPServer
spec=importlib.util.spec_from_file_location('dj',Path(__file__).parents[1]/'server.py'); dj=importlib.util.module_from_spec(spec);spec.loader.exec_module(dj)
class PilotTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();root=Path(self.tmp.name);music=root/'music';music.mkdir()
  for name in ('Studio - One - Party.wav','Studio - Two - Laid back.wav'):
   with wave.open(str(music/name),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(8000);f.writeframes(b'\0\0'*800)
  dj.init(str(root/'test.sqlite'),str(music),'a-long-test-password','123456')
  self.server=ThreadingHTTPServer(('127.0.0.1',0),dj.Handler);threading.Thread(target=self.server.serve_forever,daemon=True).start();self.url='http://127.0.0.1:'+str(self.server.server_port)
  self.host=self.client();self.guest=self.client();self.other=self.client()
 def tearDown(self):self.server.shutdown();self.server.server_close();dj.DB.close();self.tmp.cleanup()
 def client(self):return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def call(self,client,path,data=None,origin=None):
  headers={'Content-Type':'application/json'}
  if origin:headers['Origin']=origin
  req=urllib.request.Request(self.url+path,None if data is None else json.dumps(data).encode(),headers)
  try:
   with client.open(req) as r:return r.status,json.loads(r.read())
  except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
 def login(self):self.assertEqual(self.call(self.host,'/api/login',{'password':'a-long-test-password'})[0],200)
 def join(self,c=None):self.assertEqual(self.call(c or self.guest,'/api/join',{'code':'123456'})[0],200)
 def test_access_boundaries(self):
  status,state=self.call(self.guest,'/api/state');self.assertFalse(state['host']);self.assertIsNone(state['code']);self.assertEqual(state['tracks'],[])
  self.assertEqual(self.call(self.guest,'/api/next',{})[0],403)
  self.assertEqual(self.call(self.guest,'/api/audio/anything')[0],403)
  self.assertEqual(self.call(self.guest,'/server.py')[0],404)
  self.assertEqual(self.call(self.guest,'/api/join',{'code':'000000'})[0],401)
  self.assertEqual(self.call(self.host,'/api/login',{'password':'wrong'})[0],401)
  self.assertEqual(self.call(self.host,'/api/login',{'password':'a-long-test-password'},'https://attacker.example')[0],403)
 def test_request_approval_vote_and_playback(self):
  self.login();self.join();self.join(self.other)
  tracks=self.call(self.host,'/api/state')[1]['tracks'];track=tracks[0]['id']
  self.assertEqual(self.call(self.guest,'/api/request',{'track':track})[0],200)
  self.assertEqual(self.call(self.guest,'/api/request',{'track':track})[0],409)
  self.assertEqual(self.call(self.other,'/api/state')[1]['queue'],[])
  row=self.call(self.host,'/api/state')[1]['queue'][0]
  self.assertEqual(self.call(self.other,'/api/moderate',{'id':row['id'],'status':'approved'})[0],403)
  self.assertEqual(self.call(self.guest,'/api/vote',{'id':row['id']})[0],404)
  self.call(self.host,'/api/moderate',{'id':row['id'],'status':'approved'})
  for _ in range(2):self.call(self.other,'/api/vote',{'id':row['id']})
  self.assertEqual(self.call(self.host,'/api/state')[1]['queue'][0]['votes'],1)
  self.call(self.host,'/api/next',{});state=self.call(self.host,'/api/state')[1]
  self.assertEqual(state['current']['track'],track);self.assertEqual(state['queue'],[])
  with self.host.open(self.url+'/api/audio/'+track) as r:self.assertTrue(r.read().startswith(b'RIFF'))
  self.call(self.host,'/api/next',{});self.assertNotEqual(self.call(self.host,'/api/state')[1]['current']['track'],track)
  self.call(self.host,'/api/stop',{});self.assertIsNone(self.call(self.host,'/api/state')[1]['current'])
 def test_pause_validation_and_request_limits(self):
  self.login();self.join();track=self.call(self.host,'/api/state')[1]['tracks'][0]['id']
  self.call(self.host,'/api/settings',{'open':False})
  self.assertEqual(self.call(self.guest,'/api/request',{'track':track})[0],409)
  self.assertEqual(self.call(self.host,'/api/settings',{'open':'yes'})[0],400)
  self.assertEqual(self.call(self.host,'/api/settings',{'mode':'not-a-mood'})[0],400)
  self.call(self.host,'/api/settings',{'open':True})
  self.assertEqual(self.call(self.guest,'/api/request',{'track':'../server.py'})[0],404)
  for _ in range(3):
   self.call(self.guest,'/api/request',{'track':track});row=self.call(self.host,'/api/state')[1]['queue'][0]
   self.call(self.host,'/api/moderate',{'id':row['id'],'status':'rejected'})
  self.assertEqual(self.call(self.guest,'/api/request',{'track':track})[0],429)
 def test_mix_persistence_and_tie_order(self):
  self.login();self.join();tracks=self.call(self.host,'/api/state')[1]['tracks']
  for t in tracks:
   self.call(self.guest,'/api/request',{'track':t['id']})
  rows=self.call(self.host,'/api/state')[1]['queue']
  for r in rows:self.call(self.host,'/api/moderate',{'id':r['id'],'status':'approved'})
  self.call(self.host,'/api/next',{});self.assertEqual(self.call(self.host,'/api/state')[1]['current']['track'],tracks[0]['id'])
  self.call(self.host,'/api/next',{})
  self.call(self.host,'/api/settings',{'mode':'Party'});self.call(self.host,'/api/next',{})
  self.assertEqual(self.call(self.host,'/api/state')[1]['current']['track'],next(t['id'] for t in tracks if t['mood']=='Party'))
 def test_host_rate_limit(self):
  for _ in range(20):self.call(self.host,'/api/login',{'password':'wrong'})
  self.assertEqual(self.call(self.host,'/api/login',{'password':'wrong'})[0],429)
if __name__=='__main__':unittest.main()
