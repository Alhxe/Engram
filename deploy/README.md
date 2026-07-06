# Engram — Deployment (publish image → host pulls)

Backend runs on this Mac (Apple Silicon) as a Docker container, exposed by a
**Cloudflare Tunnel** run natively on the host; the frontend is served by
**Cloudflare Pages**. CI never touches this host — it builds a backend image and
pushes it to **GHCR** on every backend change on `master`, and this host *pulls*
it on a timer.

```
 push to master (backend/**) ─▶ GitHub Actions (arm64) ─▶ ghcr.io/alhxe/engram:latest
                                                                 │  (launchd poll, 2 min)
 Cloudflare Pages ◀─ push to master                              ▼
   engram.alexperezalvarez.dev              this Mac: docker compose (engram-backend)
        │                                          ▲  127.0.0.1:8080
        │                                   cloudflared (native, launchd)
        └────── HTTPS /api/v1 ──▶ engram-api.alexperezalvarez.dev ──(tunnel)──┘
```

## Hostnames
- Frontend: `https://engram.alexperezalvarez.dev` (Cloudflare Pages)
- Backend:  `https://engram-api.alexperezalvarez.dev` (Cloudflare Tunnel → `127.0.0.1:8080`)

## Auto-deploy model (what makes master → live work)
1. **CI** (`.github/workflows/release.yml`) triggers on push to `master` when
   `backend/**` changes (and on `vX.Y.Z` tags). It builds a native **arm64**
   image and pushes `ghcr.io/alhxe/engram:latest` (+ `sha-<short>`).
2. **Host poll** — LaunchAgent `com.engram.update` runs `deploy/update.sh` every
   2 min: `docker compose pull backend && docker compose up -d backend`. When the
   pulled digest differs, the container is recreated. (Replaces watchtower, which
   is incompatible with the Docker Engine 29 API.)
3. **GHCR package must be readable** by this host — either **public** (recommended,
   see below) or `docker login ghcr.io` with a `read:packages` token.

> Frontend changes go to Pages (push to master, no image). Only `backend/**`
> changes rebuild the backend image.

## LaunchAgents on this Mac
| Agent | File | Purpose |
|---|---|---|
| `com.engram.tunnel` | `deploy/com.engram.tunnel.plist` | keeps the Cloudflare Tunnel running |
| `com.engram.update` | `deploy/com.engram.update.plist` | polls GHCR and redeploys the backend |

Backend container persists via Docker's `restart: unless-stopped`. For everything
to come back after a reboot, enable **Docker Desktop → Start at login** (both the
containers and the agents need the GUI login session).

---

## One-time setup that still needs doing

### Make the GHCR package public (so the poll can pull unattended)
After the first CI build publishes the image: GitHub → profile → Packages →
`engram` → Package settings → Change visibility → **Public**. (It contains only
the compiled app, no secrets.) A public package avoids storing/rotating a
registry token on the host.

### Cloudflare Pages (frontend)
Workers & Pages → Create → **Pages** tab → Connect to Git → `Alhxe/Engram`:
- Production branch `master`, Root directory `frontend`
- Build command `npm run build`, Output directory `dist`, **no deploy command**
- Env var `VITE_API_BASE_URL = https://engram-api.alexperezalvarez.dev/api/v1`
- Custom domain `engram.alexperezalvarez.dev`

Do **not** merge the Cloudflare "Workers autoconfig" PR — the static Pages flow
needs no in-repo Wrangler config.

---

## Day-to-day

| Action | Command |
|---|---|
| Ship a backend change | push `backend/**` to `master` → CI builds → host poll updates within ~2–3 min |
| Ship a frontend change | push to `master` (Pages rebuilds) |
| Cut a versioned release | `git tag vX.Y.Z && git push origin vX.Y.Z` (also makes a GitHub Release) |
| Force an update now | `cd deploy && docker compose pull && docker compose up -d` |
| Update log | `tail -f ~/Library/Logs/engram-update.log` |
| Backend logs | `cd deploy && docker compose logs -f backend` |
| Tunnel logs | `tail -f ~/Library/Logs/engram-tunnel.err.log` |
| Restart tunnel | `launchctl kickstart -k gui/$(id -u)/com.engram.tunnel` |

## Re-provisioning the tunnel from scratch (if ever needed)
```bash
cloudflared tunnel login
cloudflared tunnel create engram
cloudflared tunnel route dns engram engram-api.alexperezalvarez.dev
# write ~/.cloudflared/config.yml (tunnel id + credentials-file + ingress -> http://localhost:8080)
cp deploy/com.engram.tunnel.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.engram.tunnel.plist
```

**Auto-deploy is pull-based:** push → CI pushes `:latest` → host poll pulls it.
Nothing inbound; no self-hosted CI runner — safe for a public repo.
