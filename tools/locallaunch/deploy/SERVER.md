# Run on an always-on Linux server

This edition is for evaluation behind Caddy and private owner access. Python's http.server is not recommended as a production server. Before live commercial cutover, replace the HTTP runtime and complete security/load/restore testing. Docker restart support does not provide high availability.

## Start without creating a cloud bill

Use an existing Linux computer, or provision a VM separately only after choosing its total cost. Recommended evaluation baseline: 1–2 GB RAM without AI, room for all retained ZIP releases and backups. A local language model needs additional RAM according to the model; the cheapest VM tiers are not recommended for AI inference.

Install Python 3.11+, Docker Engine and Docker Compose from their official sources. From tools/locallaunch:

```bash
python3 setup.py
```

Review `.env` privately. Do not commit it. On Linux the image uses UID 1000: if your user has a different UID, run `sudo chown -R 1000:1000 data` before starting. Avoid changing ownership of any other directory.

For localhost evaluation keep generated defaults. For a public temporary domain, edit `.env` to set:

```dotenv
SITE_BASE_DOMAIN=sites.YOUR_DOMAIN
PUBLIC_SCHEME=https
PUBLIC_URL_PORT=
```

Run `docker compose up -d --build`. The restart policy restarts a stopped process after crashes/host reboots when Docker starts; a failed healthcheck alone does not automatically restart it. Ensure the Docker service is enabled for boot. Review with `docker compose ps` and `docker compose logs --tail 100`. Application request logging is not implemented. Stop with `docker compose down`; data/ persists.

Keep ports 8080/8081 private: the compose file binds them to 127.0.0.1 only. Expose just SSH (restricted to your IP if possible), HTTP 80 and HTTPS 443. Do not change either bind to a public interface. Install Caddy on the host; create explicit DNS records and Caddy hosts for published/preview URLs. Preview IDs appear after upload. The sample is a template: replace the placeholder with the exact real release ID; do not enable automatic unrestricted on-demand certificates.

For owner access from your computer:

```bash
ssh -L 8080:127.0.0.1:8080 YOUR_USER@YOUR_SERVER
```

Then visit http://127.0.0.1:8080 in your computer browser. Paste the ADMIN_TOKEN privately. A phone needs a suitable SSH client/VPN; this version is not yet a phone-only managed service.

## AI

Optional. Configure OLLAMA_MODEL and OLLAMA_URL in .env and restart the container. 127.0.0.1 inside Docker refers to the container, not the host. Use a separately configured private reachable Ollama endpoint. Do not expose Ollama unauthenticated to the internet. No model/service is provisioned by these files.

## Backup and restore

From tools/locallaunch, while the app is running:

```bash
python3 backup.py --data data --output /YOUR_BACKUP_DIRECTORY/locallaunch-YYYYMMDD.zip
```

The snapshot includes database and all referenced immutable releases; concurrent newer uploads are omitted consistently. No deletion/retention operation exists, so referenced files remain available during backup. Reusing a backup filename fails rather than overwriting it. Protect the backup directory, copy archives off-server and schedule through your OS only once storage/retention are chosen. Configuration/token are deliberately excluded; back up `.env` separately with encryption. Website files may themselves contain private content.

To restore, stop the app, keep the current data directory as a fallback, create a new empty data directory, extract your own trusted backup into it, and set ownership to UID 1000. Never extract untrusted ZIPs with operating-system commands. Start the service and check projects, preview URLs, published sites and rollback. A backup does not restore DNS, Caddy configuration, provider accounts or Supabase data.

## No automatic spending

These commands do not register domains, buy servers, update DNS, call paid AI, attach payment methods or change any existing hosting subscription.
