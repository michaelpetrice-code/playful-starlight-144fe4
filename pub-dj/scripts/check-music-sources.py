"""Refresh discovery reports only. Never approve licences or add playback URLs automatically."""
import json, urllib.request, urllib.parse, pathlib, datetime, re, collections, html
from concurrent.futures import ThreadPoolExecutor
root=pathlib.Path(__file__).resolve().parents[1]
src=(root/'free-music.js').read_text()
tracks=json.loads(src.split('const tracks=',1)[1].split(';\nconst byId=',1)[0])
report={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'included_tracks':len(tracks),'included_sources':dict(collections.Counter(t['provider'] for t in tracks)),'sources':[],'requires_review':True}
for name,url in [('Incompetech','https://incompetech.com/music/royalty-free/pieces.json'),('ccMixter','https://ccmixter.org/api/query?f=json&limit=10&lic=by')]:
 entry={'provider':name,'source':url,'status':'unavailable','candidates':[]}
 try:
  with urllib.request.urlopen(url,timeout=20) as response: rows=json.load(response)
  known={t['id'] for t in tracks};entry['status']='reachable';entry['reported_records']=len(rows)
  for item in rows:
   if name=='Incompetech':
    ident='cc-'+str(item.get('isrc','')).lower();candidate={'id':ident,'title':item.get('title'),'filename':item.get('filename'),'required_review':'Check current artist licence, audio, metadata and attribution before inclusion.'}
   else:
    ident='mix-'+str(item.get('upload_id',''));lic=item.get('license_url','');
    if not re.fullmatch(r'https?://creativecommons.org/licenses/by/(2\.5|3\.0|4\.0)/',lic):continue
    candidate={'id':ident,'title':item.get('upload_name'),'source':item.get('file_page_url'),'license':lic,'required_review':'Check complete contributor credits, samples, lyrics suitability and playback before inclusion.'}
   if ident not in known:entry['candidates'].append(candidate)
  entry['candidate_count']=len(entry['candidates']);entry['candidates']=entry['candidates'][:50]
 except Exception as error:entry['error']=type(error).__name__
 report['sources'].append(entry)
def watch_source(source):
 entry={'provider':source['provider'],'source':source['url'],'status':'unavailable','candidates':[],'free_only':True}
 try:
  with urllib.request.urlopen(source['url'],timeout=15) as response: page=response.read(2000000).decode('utf-8',errors='replace')
  entry['status']='reachable';seen=set();known={t['source'] for t in tracks}
  for href,label in re.findall(r'<a\b[^>]*href=[\"\x27]([^\"\x27]+)[\"\x27][^>]*>(.*?)</a>',page,re.S|re.I):
   url=urllib.parse.urljoin(source['url'],html.unescape(href));parts=urllib.parse.urlsplit(url)
   title=html.unescape(re.sub(r'<[^>]*>','',label)).strip()
   if parts.scheme!='https' or parts.hostname!=urllib.parse.urlsplit(source['url']).hostname or not parts.path.startswith(source['path_prefix']) or parts.fragment or parts.query or not title or len(title)>180 or url in seen or url in known: continue
   seen.add(url);entry['candidates'].append({'title':title,'source':url,'required_review':source['review']})
  entry['candidate_count']=len(entry['candidates']);entry['candidates']=entry['candidates'][:50]
 except Exception as error:entry['error']=type(error).__name__
 return entry
watchlist=json.loads((root/'source-watchlist.json').read_text())
with ThreadPoolExecutor(max_workers=5) as workers: report['sources'].extend(workers.map(watch_source,watchlist['sources']))
archive_query='mediatype:audio AND (creator:HoliznaCC0 OR creator:"Chris Zabriskie") AND format:"Archive BitTorrent"'
archive_url='https://archive.org/advancedsearch.php?'+urllib.parse.urlencode({'q':archive_query,'output':'json','rows':25,'fl[]':['identifier','title','licenseurl']},doseq=True)
entry={'provider':'Internet Archive P2P candidates','source':archive_url,'status':'unavailable','candidates':[],'free_only':True}
try:
 with urllib.request.urlopen(archive_url,timeout=20) as response: docs=json.load(response)['response']['docs']
 entry['status']='reachable'
 for item in docs:
  licence=item.get('licenseurl','');licence=licence[0] if isinstance(licence,list) and licence else licence
  if not isinstance(licence,str) or not re.fullmatch(r'https?://creativecommons.org/(?:publicdomain/zero/1\.0|licenses/by/(?:3\.0|4\.0))/?',licence):continue
  entry['candidates'].append({'title':item.get('title'),'source':'https://archive.org/details/'+urllib.parse.quote(item['identifier'],safe=''),'license':licence,'required_review':'Verify artist provenance, recording rights, free download and torrent metadata; browser peers/web seeds and VPN are separate checks.'})
 entry['candidate_count']=len(entry['candidates'])
except Exception as error:entry['error']=type(error).__name__
report['sources'].append(entry)
report['free_only']=True
report['review_method']='deterministic_source_checks'
report['external_ai_required']=False
report['summary']=[{'provider':s['provider'],'status':s['status'],'new_candidates':s.get('candidate_count',0),'next_step':'Check licences, contributor credits and browser playback before inclusion.'} for s in report['sources']]
pathlib.Path('music-source-review.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='sources'}))
print('Candidate lists are discovery reports, not licence approvals or live additions.')
