# The Local v190 — Scheduled Health Checks & Approval-Only Fix Plans

Includes a read-only owner-dashboard health panel and a GitHub Actions scheduled workflow (`.github/workflows/local-health.yml`). The workflow runs three times daily (UTC), checks public pages and assets, uploads a JSON/Markdown report, and creates/comments on a GitHub Issue when public checks fail. GitHub issue notifications require the repository owner to enable notifications. It does not deploy or modify live data.

## Setup
1. Deploy the full ZIP to Netlify as usual (this adds the on-demand owner panel).
2. Separately commit the repository contents to GitHub, including the hidden `.github` directory, and enable Actions. Netlify ZIP upload **does not activate scheduled GitHub Actions**.
3. In GitHub Actions, manually run **The Local health monitoring** once. Confirm the repository Actions permissions allow issues to be created and notifications are enabled.
4. Review generated artifacts / issues. No secrets are needed for public smoke checks.
5. For authenticated login, publishing, payment and gameplay monitoring, configure isolated staging test accounts, Stripe test mode and browser tests. These are explicitly **not** verified by this version.

## Limitations
Public HTML and asset checks are not complete end-to-end tests. Failures can include transient network errors. Automatic fix suggestions are diagnostic text only; no AI code changes, production deployments, real payment charges, or privileged operations are performed. Existing v189 AI owner copilot remains available. No new SQL.
