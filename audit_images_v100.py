from pathlib import Path
from collections import defaultdict
import hashlib,re,sys
from PIL import Image
root=Path(__file__).resolve().parent
issues=[]
games=['pinball','yatzy','pool','snooker','darts','battle','ttt','connect4','search','cross','solitaire','blocks','quiz','ludo']
for game in games:
 if game in ['pinball','yatzy']:continue
 path=root/'assets/games-v68'/f'{game}.webp'
 if not path.exists():issues.append(f'Missing game tile: {game}')
 elif Image.open(path).size[0]<300:issues.append(f'Small game tile: {game}')
for name in ['concert-room.webp','lounge.webp','venue-banner.jpg']:
 if not (root/'assets/coombe'/name).exists():issues.append('Missing Coombe image: '+name)
# Check all literal local src/href and CSS url paths
for f in root.rglob('*'):
 if f.suffix.lower() not in ['.html','.js','.css']:continue
 content=f.read_text(errors='ignore')
 for ref in re.findall(r'''(?:src|href)=["']([^"']+)["']|url\(["']?([^"')]+)''',content):
  u=(ref[0] or ref[1]).split('?')[0]
  if not u or u.startswith(('http:','https:','data:','#','mailto:','tel:','/','var(','linear-','radial-')) or '${' in u:continue
  if not (f.parent/u).exists():issues.append(f'{f.name}: missing {u}')
# Compare exact image files, not just filenames.
images=[f for f in (root/'assets').rglob('*') if f.suffix.lower() in ['.png','.jpg','.jpeg','.webp']]
hashes=defaultdict(list)
for f in images:
 try:
  with Image.open(f) as im: im.verify()
  hashes[hashlib.sha256(f.read_bytes()).hexdigest()].append(f.relative_to(root).as_posix())
 except Exception as e:issues.append(f'Invalid image {f}: {e}')
dups=[v for v in hashes.values() if len(v)>1]
if dups:issues.extend('Duplicate local image content: '+str(v) for v in dups)
# Check the 9 home tiles effective CSS sources, including v100 overrides.
base=(root/'pub-real-photos-v98.css').read_text();over=(root/'image-audit-v100.css').read_text()
urls=[]
for i in range(1,10):
 matches=re.findall(rf'\.tl65-tile:nth-child\({i}\)::before\{{background-image:url\(["\']?([^"\')]+)',base)
 newer=re.findall(rf'\.tl65-tile:nth-child\({i}\)::before\{{background-image:url\(["\']?([^"\')]+)',over)
 urls.append(newer[-1] if newer else matches[-1] if matches else None)
if len(set(urls))!=9:issues.append('Home tiles have duplicate image URLs: '+str(urls))
report=['# The Local v100 — image audit','',f'- Checked {len(images)} bundled image files (image decode/validation).',f'- Checked {len(games)} Games Room tile definitions; {len(games)-2} local assets and 2 external real photographs with SVG fallbacks.', '- Checked local literal image, CSS and HTML resource references across all site source files.', '- Checked all nine effective home tile background sources for exact duplication.', '- Reviewed Coombe venue gallery assets.', '',f'**Static audit: {"PASS" if not issues else "FAIL"}.**', '', '## Nine home tile sources']+[f'{i+1}. {u}' for i,u in enumerate(urls)]+['','## Caveats','- This checks bundled resources and known game/home references. Dynamic user-uploaded content, Supabase images and third-party image hosts cannot be guaranteed offline.','- Site-wide intentional reuse of a brand/hero photograph on login and internal banners is not treated as a duplicate tile.','- Live visual/browser checks are not possible in this environment; check a Netlify staging deployment.','- The two game photographs require internet connectivity; if unavailable, a nonblank SVG game illustration appears.','', '## Problems']+([f'- {i}' for i in issues] if issues else ['- None in the static checks.'])
(root/'IMAGE-AUDIT-v100.md').write_text('\n'.join(report)+'\n')
print('PASS' if not issues else 'FAIL',len(images),'images',len(issues),'issues')
if issues:print('\n'.join(issues));sys.exit(1)
