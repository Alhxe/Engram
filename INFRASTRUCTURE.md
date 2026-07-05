# Engram — Infrastructure & Technology

Personal knowledge store: notes, mind maps and any knowledge, taggable by
project/idea, and queryable via an API key so any AI (local or external) can
consume it.

The guiding constraint is **efficiency**: a small, low-RAM footprint so the
service can run comfortably on modest, self-hosted hardware.

## Deployment

- **Model:** self-hosted, single-instance. High availability is intentionally
  out of scope for a personal instance.
- **Exposure:** [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
  (`cloudflared`) — outbound-only connection, so no inbound ports are opened and
  no static IP is needed. HTTPS and DNS are handled by Cloudflare.
- **Optional access gate:** Cloudflare Access can sit in front of the tunnel
  (service tokens for the API, SSO for the UI).

## Backend

- **Language / framework:** Java + Spring Boot.
- **Packaging target:** GraalVM native image for a low RAM footprint and fast
  startup. A tuned JVM is the fallback while native configuration matures.
- **Lean dependency set:** web + data-jpa + validation only — every extra
  starter adds footprint and native-image surface.

## Persistence

- **Database:** SQLite — in-process, single file, no separate database daemon
  and therefore no idle RAM cost for a DB server. Comfortably sufficient for a
  single-user store.
- **Mode:** WAL (`journal_mode=WAL`) to allow concurrent reads during writes.
- **Full-text search:** SQLite **FTS5** (built-in inverted index) for fast,
  relevance-ranked search without an external search engine.
- **Vector search:** planned via `sqlite-vec` for later semantic/AI search — on
  the same engine, so no migration is required.

## ORM

- **JPA / Hibernate** with the community SQLite dialect
  (`hibernate-community-dialects`).
- **CRUD** (nodes, links, tags, projects) through JPA entities and repositories.
- **Search** (FTS5, later vector) through **native queries**, since FTS5 virtual
  tables are not mapped as regular entities.

## Architecture

- Classic **layered** architecture: `web` (controllers + API-key filter) →
  `service` → `repository` → `model`. Full hexagonal/DDD is intentionally
  avoided — the domain is simple and the extra indirection would not pay off.
- **One dependency-inversion seam:** an `AiProvider` interface with pluggable
  adapters (local or external), so the AI provider can be swapped without
  touching the core. Everything else is concrete.

## Auth

- **API key** validated by a servlet filter and stored hashed, with read/write
  scopes so a read-only key can be handed to AI consumers.

## Attachments

- Binary files (images, PDFs, audio) are stored on the filesystem (or object
  storage), with only their reference kept in the database — this keeps the
  database small and fast as the knowledge base grows.

## Frontend

- Single-page app (React or Svelte — TBD), served either by the backend or as a
  static deployment.

## AI (planned, not yet implemented)

- Provider-agnostic behind the `AiProvider` seam, consumable locally or via an
  external provider through the same API-key door. A thin MCP server over the
  REST API is a possible addition so agents can consume the knowledge natively.

## Repository & CI

- **Monorepo:** `backend/` and `frontend/` in a single repository.
- **CI:** GitHub Actions with path filters so the backend and frontend build
  independently.
