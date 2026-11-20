"""Create local configuration, without buying or provisioning infrastructure."""
import os,secrets
from pathlib import Path
root=Path(__file__).resolve().parent
path=root/'.env'
try:
 with path.open('x') as f:
  os.chmod(path,0o600)
  f.write('ADMIN_TOKEN='+secrets.token_urlsafe(48)+'\nSITE_BASE_DOMAIN=localhost\nPUBLIC_SCHEME=http\nPUBLIC_URL_PORT=8081\n')
 print('Created .env with a random owner token. Read it privately to unlock the dashboard.')
except FileExistsError:print('Existing .env preserved; owner token was not changed.')
data=root/'data';data.mkdir(exist_ok=True);os.chmod(data,0o700)
if hasattr(os,'getuid') and os.getuid()!=1000:print('Docker uses UID 1000. Before Docker startup, give UID 1000 ownership of data/ only. See deploy/SERVER.md.')
