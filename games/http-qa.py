"""Disposable staging-account HTTP checks; never prints credentials or tokens."""
import json,urllib.request,urllib.error,os
from pathlib import Path
root=Path(os.environ['ARCADE_QA_FIXTURES']);cfg=json.loads((root/'arcade-qa-public.json').read_text());fixture=json.loads((root/'arcade-qa-private.json').read_text());base=cfg['url'];key=cfg['key']
def request(path,body,token=None):
 req=urllib.request.Request(base+path,data=json.dumps(body).encode(),headers={'apikey':key,'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})})
 try:
  with urllib.request.urlopen(req,timeout=20) as r:return r.status,json.loads(r.read())
 except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
tokens=[]
for u in fixture['users']:
 code,r=request('/auth/v1/token?grant_type=password',{'email':u['email'],'password':fixture['password']});assert code==200,(code,{k:v for k,v in r.items() if k in ['error','msg','message']});tokens.append(r['access_token'])
def call(actor,action,**extra):return request('/functions/v1/arcade-game',{'action':action,**extra},tokens[actor])
code,r=request('/functions/v1/arcade-game',{'action':'list'});assert code==401
code,r=call(0,'create',kind='noughts');assert code==200,(code,r);g=r['match']['id'];assert r['match']['status']=='waiting'
code,r=call(2,'get',id=g);assert code==400 and 'participant' in r['error']
code,r=call(1,'join',id=g);assert code==200;version=r['match']['version']
code,r=call(1,'move',id=g,version=version,move={'cell':0});assert code==400 and 'turn' in r['error']
for actor,cell in [(0,0),(1,3),(0,1),(1,4),(0,2)]:
 code,r=call(actor,'move',id=g,version=version,move={'cell':cell});assert code==200,(code,r);version=r['match']['version']
assert r['match']['state']['winner']==0 and r['match']['status']=='finished'
code,r=call(0,'create',kind='battleships');assert code==200;g=r['match']['id'];a=r['match']['state'];assert 'fleets' not in a and len(a['ownFleet'])==3
code,r=call(1,'join',id=g);assert code==200;b=r['match']['state'];assert 'fleets' not in b
version=r['match']['version'];code,r=call(0,'move',id=g,version=version,move={'cell':0});assert code==200
code,r=call(0,'move',id=g,version=version,move={'cell':1});assert code==400 and 'Outdated' in r['error']
code,reconnected=call(1,'get',id=g);assert code==200 and reconnected['match']['version']==version+1
for kind in ['connect','reversi','darts301','darts501','pool','snooker']:
 code,r=call(0,'create',kind=kind);assert code==200,(kind,code,r);g=r['match']['id'];code,r=call(1,'join',id=g);assert code==200
 move={'column':3} if kind=='connect' else {'cell':19} if kind=='reversi' else {'x':0,'y':-.5} if kind.startswith('darts') else {'angle':0,'power':12}
 code,r=call(0,'move',id=g,version=r['match']['version'],move=move);assert code==200,(kind,code,r)
print('PASS: three staging Auth sessions; unauthenticated/outsider denial; wrong turns; noughts win; hidden fleets; stale replay denial; reconnect; legal moves through all eight supported games.')
