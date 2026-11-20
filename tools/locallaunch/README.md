# LocalLaunch — self-hosted development edition

Built for Michael Petrice. A single-owner static hosting platform with a beginner dashboard, ZIP releases, explicit publishing, rollback, SQLite persistence, isolated admin/public listeners and optional local Ollama assistance. No deployment-credit mechanism. This is a working MVP, not full Netlify parity or a production hosting service.

## Try on your computer — free software, no purchase required

Requires a computer/server with Python 3.11 or newer. A phone alone cannot run this server reliably. Extract this folder, open a terminal in it:

```bash
export ADMIN_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
# Store this token securely: you need it to unlock your dashboard.
printf '%s\n' "$ADMIN_TOKEN"
python3 server.py
```

On Windows PowerShell:

```powershell
$env:ADMIN_TOKEN = python -c "import secrets; print(secrets.token_urlsafe(48))"
$env:ADMIN_TOKEN
python server.py
```

Open http://127.0.0.1:8080 and unlock with the token. Create a project, upload a ZIP containing the built website (index.html and assets), then click Publish release. Browse http://PROJECT.localhost:8081. Keep the terminal running. Versions persist in data/. Stop with Ctrl+C. Use the same securely stored token when restarting, or issue a new one to rotate access.

## AI without metered API calls

Install Ollama separately on this computer and download a model suited to its RAM. Set OLLAMA_MODEL to that installed model name before starting. OLLAMA_URL defaults to http://127.0.0.1:11434. An optional remote endpoint must be trusted; prompts are sent there. AI only gives advice and cannot execute commands or publish. Without a model, the dashboard provides a clearly labelled fixed migration guide, not simulated AI. Hardware, power and model licensing requirements still apply. No model is bundled.

## Moving your projects safely

The Local, Coombe, Central Branch, recruitment app and Mitie are candidates, not imported projects. No current Netlify or Supabase settings have been accessed or changed by this package.

1. Back up each source repository, current deployment, domains, DNS and Netlify configuration.
2. Build locally using the project's own instructions. ZIP the output folder, not source code. Existing built HTML sites can be uploaded directly.
3. Inventory `_redirects`, `_headers`, netlify.toml, Functions, Edge Functions, Forms, Identity, cron jobs, runtime/build variables and Git automation. They are NOT implemented here. Merely uploading them does not migrate their behavior. The upload inspection is a warning aid, not a compatibility certification.
4. Keep each existing Supabase project, tables, users, policies, storage and keys. Do not merge databases to move hosting. Only browser-safe public configuration belongs in a static bundle; service-role keys and payment/webhook secrets never do.
5. Create a LocalLaunch project and upload. Nothing is live until explicitly published. Rollback publishes a previous retained release. Each uploaded release has a separate Preview release link, served on its own hostname without changing the published version. Public previews are unlisted, not authenticated; do not upload confidential drafts.
6. Test login/password reset, email redirects, SPA deep links, media/storage permissions, payments, Stripe webhooks, CORS, downloads and all important app paths. Add temporary and final URLs to auth provider allowlists where appropriate. Port Netlify-only backends before cutover.
7. Prepare TLS and temporary public hostname. Only switch existing DNS once the temporary deployment passes. Keep original Netlify deployment for DNS rollback. A .netlify.app hostname cannot be transferred to a different host; use a domain you own or a new hostname.

## Public hosting: infrastructure still required

The app listens only on loopback by default. To serve real visitors, install on a computer/server that stays online. Configure a firewall, HTTPS reverse proxy, patching, process supervision and backups. Do not expose the owner dashboard without authenticated private access (VPN/SSH tunnel preferred); do not expose plain HTTP tokens over the internet. Both listener ports should remain behind the firewall.

Set SITE_BASE_DOMAIN to a dedicated public site domain such as sites.example.org. Configure DNS for each PROJECT.sites.example.org to your server. Configure Caddy for each hostname, e.g.:

```caddy
coombe.sites.example.org {
    reverse_proxy 127.0.0.1:8081
}
```

Caddy can obtain HTTPS certificates when DNS and network access are configured. Configure the owner dashboard on a separate private origin. Never reverse proxy uploaded content onto the admin origin. Dashboard links use SITE_BASE_DOMAIN, PUBLIC_SCHEME and PUBLIC_URL_PORT. Custom apex domains require additional routing implementation; they cannot simply be entered into this MVP. Do not change thelocal.me.uk DNS yet.

Only host your own trusted files. This version is not a multi-tenant public upload service. It has no per-user roles, custom-domain verification, rate limiting, CDN, isolated build runners, webhooks, Git builds, runtime secrets management, function runtime, scheduled jobs, billing, high availability, deployment logs or automated backups. It is not independently security-audited. ZIP compressed upload limit: 50 MB; expanded: 200 MB; 10,000 entries. Hidden files and dependency folders are rejected. Configuration files are not interpreted. Manual SPA index fallback is supported; redirect/header rule parity is not.

Back up the entire data/ folder while the server is stopped; it includes SQLite records and all releases. Restore them together. Store backups separately and test restores. There is no automatic retention cleanup, so monitor disk capacity.

## Cost model

Software has no built-in deployment charges. Public hosting still uses compute, storage, bandwidth, a domain and backups. Local AI uses hardware and power. No server, domain, external AI subscription or paid service has been purchased. Running the package locally is not equivalent to a publicly available managed host.

## Verification

Run `python3 -m unittest -v test_server.py`. Tests cover upload validation, release isolation, publish/rollback, HTTP authentication, previews before publication, HEAD responses, production URLs and backup restoration. Full browser UI, external DNS/TLS and a live Ollama model have not been verified here.

## Next implementation priorities

Audit actual source for each app; implement required backend adapters; isolate build workers; add Git authentication/webhooks; implement domain verification, TLS provisioning and host mapping; add encrypted secrets, backup/restore automation, access controls, logs, quotas and operational monitoring. Migration should proceed one site at a time after compatibility tests pass.

## Always-on deployment improvements

See [deploy/SERVER.md](deploy/SERVER.md) for Docker Compose, restart-on-reboot setup, private dashboard access, HTTPS templates and backup/restore. Run `python3 setup.py` to create configuration without overwriting existing settings. [HOSTING-OPTIONS.md](HOSTING-OPTIONS.md) compares free/low-cost infrastructure. The platform remains an evaluation MVP pending HTTP-runtime replacement and security/load testing.

## GitHub development

This draft lives under tools/locallaunch on codex/locallaunch-self-hosted in The Local repository. It changes no live application files. Keep it unmerged until a dedicated LocalLaunch repository is available. The manual workflow can be selected on this branch after GitHub makes workflow_dispatch available (normally after the workflow exists on the default branch); do not merge solely to enable it. Local checks are the validation evidence for this draft. Commits and the draft PR use [skip netlify] to suppress Netlify builds. Preserve that marker during development in this repository.
