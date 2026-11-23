"""Refresh discovery reports only. Never approve licences or add playback URLs automatically."""
import json, urllib.request, pathlib, datetime, re, collections
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
pathlib.Path('music-source-review.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='sources'}))
print('Candidate lists are discovery reports, not licence approvals or live additions.')
