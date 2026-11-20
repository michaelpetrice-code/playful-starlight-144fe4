# Always-on hosting options

Research checked 20 November 2026. Prices are provider-listed currencies, not GBP conversions. Confirm availability, VAT, backups, IPv4, bandwidth overages and final checkout total before buying. No account, VM or subscription has been created.

| Option | Listed baseline | Fits this Python platform? | Main qualification |
| --- | --- | --- | --- |
| Oracle Cloud Always Free | £0 within eligible allocations | Yes, if an eligible VM is available | Home-region capacity can be unavailable; idle instances can be reclaimed. Separate free trial credit is temporary. |
| DigitalOcean Basic | US$4/month: 512 MiB RAM, 10 GiB SSD; US$6/month: 1 GiB RAM, 25 GiB SSD | Yes for evaluation; prefer at least 1 GiB without local AI | Add tax/backups/overages as applicable; even powered-off allocated servers continue billing. |
| Existing spare computer | No new server rental if already owned | Yes | Electricity, broadband, power failures, security and backups remain your responsibility. A sleeping computer cannot serve sites. |
| Cloudflare Pages Free | US$0 within plan limits | Hosts built sites, not this persistent Python control plane | Useful alternative if the goal is cheaper websites rather than operating your own server. 500 builds/month, 20,000 files/site, 25 MiB/file; Functions have separate Workers quotas. |

My recommendation for Michael: first test LocalLaunch locally, then use an eligible Oracle VM for a no-rental evaluation if available. For predictable access to a small paid VM, evaluate DigitalOcean's 1 GiB plan. Neither recommendation is a claim that this MVP is ready to replace all live projects. Test and migrate one site at a time after backend compatibility and security work.

Cloudflare Pages deserves a separate route for The Local and Coombe frontends because it removes the need for an always-on computer you manage; their Supabase databases can remain in place. Netlify Functions, webhooks and other backend features still need compatible replacements. Do not assume all Netlify code works unchanged.

For a spare computer, illustrative electricity math: a measured average draw of 10 watts uses approximately 7.2 kWh per 30-day month. Multiply by your actual electricity tariff; at an assumed £0.25/kWh that is £1.80/month. These are illustrative assumptions, not a measured device consumption or current UK tariff quote. Add hardware and backup costs.

Local AI is optional. Do not assume a 512 MiB/1 GiB VM can run a useful language model alongside hosting. Start with guided help, or use a trusted private AI endpoint on hardware with enough memory. This avoids silently introducing a paid API dependency.

GitHub stores source and runs workflows; it is not an always-on VM for this Python service. The added validation workflow is manual and never deploys, provisions infrastructure or calls an AI provider.

## Primary sources

- Oracle eligible resources, availability and idle reclamation: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Oracle Free Tier distinction from trial credit: https://www.oracle.com/cloud/free/
- DigitalOcean plans: https://www.digitalocean.com/pricing/droplets
- DigitalOcean billing: https://docs.digitalocean.com/products/droplets/details/pricing/
- Cloudflare Pages pricing: https://www.cloudflare.com/en-gb/developer-platform/products/pages/
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Python HTTP runtime limitation: https://docs.python.org/3/library/http.server.html
