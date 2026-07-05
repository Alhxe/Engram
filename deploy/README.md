# Engram — Deployment (Hermes-style: publish image → host pulls)

Backend runs on this Mac as a Docker stack, exposed by a **Cloudflare Tunnel**
run natively on the host; the frontend is served by **Cloudflare Pages**. CI
never touches this host — it only publishes a multi-arch image to **GHCR** on tag
push, and this host *pulls* it.

```
 push tag vX.Y.Z ─▶ GitHub Actions (ubuntu) ─▶ ghcr.io/alhxe/engram:latest
                                                        │  (watchtower polls)
 Cloudflare Pages ◀─ push to master                     ▼
   engram.alexperezalvarez.dev            this Mac: docker compose (backend + watchtower)
        │                                          ▲  127.0.0.1:8080
        │                                   cloudflared (native, launchd)
        └────── HTTPS /api/v1 ──▶ engram-api.alexperezalvarez.dev ──(tunnel)──┘
```

## Hostnames
- Frontend: `https://engram.alexperezalvarez.dev` (Cloudflare Pages)
- Backend:  `https://engram-api.alexperezalvarez.dev` (Cloudflare Tunnel → `127.0.0.1:8080`)

## Current live setup (already provisioned on this Mac)
- Tunnel `engram` (id `a22b6db9-…`), config in `~/.cloudflared/config.yml`,
  credentials in `~/.cloudflared/<id>.json`, DNS CNAME auto-created.
- Tunnel runs under a LaunchAgent: `~/Library/LaunchAgents/com.engram.tunnel.plist`.
- Backend + watchtower run via `deploy/docker-compose.yml` with `restart: unless-stopped`.
- Secrets in `deploy/engram.env` (gitignored).

> ⚠️ For containers and the tunnel to come back after a reboot, enable
> **Docker Desktop → Settings → General → Start Docker Desktop when you log in**.
> Both depend on your GUI login session (Docker Desktop and the LaunchAgent).

---

## Remaining one-time steps

### 1. Publish the image so watchtower can take over
The backend currently runs a locally-built image retagged as
`ghcr.io/alhxe/engram:latest`. To hand updates over to CI:
```bash
git add -A && git commit -m "Add deployment (Docker, CI, Cloudflare)"
git push origin master
git tag v0.1.0 && git push origin v0.1.0   # triggers release.yml -> GHCR
gh run watch
```
Then **make the GHCR package public** so watchtower pulls without login:
GitHub → profile → Packages → `engram` → Package settings → Change visibility →
Public. (It contains only the compiled app, no secrets.) After that, watchtower
auto-updates this host within ~5 min of each new release.

### 2. Cloudflare Pages (frontend)
Cloudflare dashboard → Workers & Pages → Create → Pages → **Connect to Git** →
`Alhxe/Engram`. Build settings:
- Production branch: `master`
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL = https://engram-api.alexperezalvarez.dev/api/v1`

Then Pages → Custom domains → add `engram.alexperezalvarez.dev`. Pages rebuilds
and deploys on every push to `master` — no Actions, no runner.

If you want `*.pages.dev` preview builds to reach the API too, add that preview
origin to `ENGRAM_CORS_ORIGINS` in `deploy/engram.env` and `docker compose up -d`.

---

## Day-to-day

| Action | Command |
|---|---|
| Ship a backend change | `git tag vX.Y.Z && git push origin vX.Y.Z` → watchtower updates this host (~5 min) |
| Ship a frontend change | push to `master` (Pages rebuilds) |
| Force backend update now | `cd deploy && docker compose pull && docker compose up -d` |
| Backend logs | `cd deploy && docker compose logs -f backend` |
| Tunnel logs | `tail -f ~/Library/Logs/engram-tunnel.err.log` |
| Restart backend | `cd deploy && docker compose restart` |
| Restart tunnel | `launchctl kickstart -k gui/$(id -u)/com.engram.tunnel` |
| Stop tunnel service | `launchctl bootout gui/$(id -u)/com.engram.tunnel` |
| Backups | full-vault zips in the `engram-data` volume at `/app/data/backups` (cron 03:00) |

## Re-provisioning the tunnel from scratch (if ever needed)
```bash
cloudflared tunnel login                                   # browser auth on the zone
cloudflared tunnel create engram
cloudflared tunnel route dns engram engram-api.alexperezalvarez.dev
# write ~/.cloudflared/config.yml (tunnel id + credentials-file + ingress -> http://localhost:8080)
cp deploy/com.engram.tunnel.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.engram.tunnel.plist
```

**Auto-deploy model:** tag → CI pushes `:latest` → **watchtower** pulls it and
recreates the backend container. Fully pull-based; nothing inbound; no
self-hosted CI runner — safe for a public repo.
