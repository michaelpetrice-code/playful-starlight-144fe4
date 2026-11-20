"""Consistent online SQLite snapshot and immutable release backup. No secrets included."""
import argparse,sqlite3,tempfile,zipfile,json
from pathlib import Path

def backup(data,output):
 data=Path(data).resolve();output=Path(output).resolve()
 if output.is_relative_to(data):raise ValueError('Save backups outside the data directory.')
 if not (data/'state.db').is_file():raise ValueError('No database found.')
 with tempfile.TemporaryDirectory() as tmp:
  snap=Path(tmp)/'state.db'
  with sqlite3.connect((data/'state.db').as_uri()+'?mode=ro',uri=True) as source,sqlite3.connect(snap) as target:source.backup(target)
  with sqlite3.connect(snap) as c:
   if c.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('Database integrity check failed.')
   releases=[r[0] for r in c.execute('SELECT id FROM releases')]
  # Open exclusively so a failed run cannot overwrite an earlier good backup.
  try:
   with zipfile.ZipFile(output,'x',zipfile.ZIP_DEFLATED) as z:
    z.write(snap,'state.db')
    for rid in releases:
     folder=data/'releases'/rid
     if not folder.is_dir():raise ValueError('Release data missing: '+rid)
     for p in folder.rglob('*'):
      if p.is_symlink():raise ValueError('Unexpected symlink in release.')
      if p.is_file():z.write(p,str(p.relative_to(data)))
    z.writestr('backup-info.json',json.dumps({'format':1,'releases':len(releases)}))
  except FileExistsError:raise
  except Exception:
   output.unlink(missing_ok=True);raise
 return len(releases)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--data',default='data');p.add_argument('--output',required=True);a=p.parse_args()
 print('Backed up',backup(a.data,a.output),'releases. Store this archive off-server.')
