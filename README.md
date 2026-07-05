<div align="center">

# Engram

**A self-hosted, AI-native personal knowledge base.**
Notes, databases, mind maps and a knowledge graph — all built on one unified substrate,
searchable by full-text and queryable by AI.

Java 21 · Spring Boot 3 · SQLite/FTS5 · React 18 · TypeScript · TipTap · React Flow

</div>

---

## What it is

Engram is a single-user knowledge store I run on a Mac mini and reach from anywhere
through a Cloudflare Tunnel. The guiding idea is a **single substrate**: a note, a
table row, a mind-map branch, a bookmark — underneath they are all the same thing, a
**node** (content + relations + typed properties + tags). Everything else — the
document editor, the table/board/calendar/chart views, the graph — is just a different
way to render the same nodes. So **one search and one API span everything**, and the
whole base is **operable by an AI** both from inside the app and through an MCP server.

> Everything you know, connected.

## Highlights

**Capture & structure**
- **Unified pages** that nest into a tree, each rendered as one of six layouts:
  Document, Table, Board, Calendar, Chart or Mind map.
- **Rich editor** (TipTap): headings, lists, tasks, tables, images, code blocks with
  syntax highlighting, callouts, text colour/highlight, a `/` block menu, `@` page
  links, and **page embeds** (transclusion — a page rendered live inside another).
- **Typed properties** (text, number, date, select with closed options, checkbox,
  URL, email, multi-select, rating, **relation**) and a per-collection **schema**.
- **Tags** that cut across the whole base.

**Relate & navigate**
- **Typed links** — relations can carry a verb ("depends on", "part of", …) that is
  surfaced in backlinks and emphasised in the graph.
- **Backlinks** and **property backlinks** (inverse of a relation property).
- **Local & global graph** (React Flow) with floating edges and typed-relation
  hierarchy. **Smart collections**: a page that gathers matching pages base-wide.
- **Full-text search** (SQLite FTS5) with ranking, highlighted snippets and filters.

**AI, two ways**
- **Embedded**: suggest tags/properties (autonomous, after you stop editing),
  ingest a PDF/text into structured pages, **Ask** your notes (RAG with citations,
  optionally scoped to a branch), summarise a collection, **bulk-fill** a property
  across a collection, suggest connections, and detect/merge duplicates.
- **MCP server** — Engram is exposed as a Model Context Protocol server so an
  external AI client can operate it natively (create/update/link/query…) at **zero
  cost** to the app.
- **Provider-agnostic**: Claude, DeepSeek, or **any OpenAI-compatible endpoint**
  (local Ollama/LM Studio, OpenRouter, Groq…). A different model per task, with
  **per-task cost tracking**.

**Data operations**
- Templates, favourites, daily notes, web clipper, CSV import, drag-to-reorder.
- Export (Markdown / PDF / full vault ZIP), public share links, iCal feed, webhooks.
- Trash with restore/purge, throttled **version history**, scheduled backups, and a
  **data-hygiene** report (orphans / untagged / stale pages).

**Product polish**
- Light & dark themes, responsive layout with a mobile drawer, installable **PWA**,
  bilingual UI (English / Spanish), keyboard command palette.

## Tech stack

| Layer          | Choice                                                                 |
|----------------|------------------------------------------------------------------------|
| Backend        | Java 21 · Spring Boot 3.4 (layered architecture)                       |
| Persistence    | SQLite (in-process) + FTS5 · JPA/Hibernate · Liquibase migrations      |
| Search / smart | Native SQL via `JdbcClient` (FTS5, recursive CTEs, tag-set matching)   |
| Auth           | JWT for the app · user-owned API keys (read/write scopes) for programmatic access |
| AI             | `AiProvider` port + Claude / DeepSeek / custom OpenAI-compatible adapters |
| Frontend       | React 18 · TypeScript · Vite 6 · Tailwind v4                           |
| State / data   | TanStack Query · React Router 7                                        |
| Editor / graph | TipTap v2 · React Flow (`@xyflow/react`)                               |
| Integration    | MCP server (Node, `@modelcontextprotocol/sdk`)                        |
| Deployment     | Self-hosted, exposed via Cloudflare Tunnel; GraalVM native-image ready |

Efficiency is a design goal: SQLite avoids a separate database process, FTS5 keeps
retrieval free before any paid AI call, and the backend targets a **GraalVM native
image** for a low-RAM footprint.

## Architecture

Classic layered backend — `web` (controllers + auth filter) → `service` →
`repository` → `model`. The one deliberate seam is a dependency-inversion port,
**`AiProvider`**, so an AI provider can be added as a single `@Component` without
touching the core. Full hexagonal/DDD was intentionally avoided — the domain is
simple and the extra indirection would not pay off.

**AI design.** Two complementary modes share the same REST surface:
- *Embedded* — the backend calls the model with the user's **encrypted** key
  (AES-GCM at rest), routing each task to its configured provider/model and recording
  token usage/cost.
- *MCP* — a thin Node server wraps the REST API behind a WRITE-scoped API key and
  exposes ~25 tools + model instructions, so the reasoning (and its cost) lives in the
  user's own AI client.

Cost is squeezed on purpose: cheap models for cheap tasks, FTS5 pre-filtering before
retrieval, one batched call instead of N where possible, and preview-then-commit for
document ingestion so a job is paid for once.

## Getting started

**Backend** (Java 21, Maven):

```bash
cd backend
mvn spring-boot:run          # API on http://localhost:8080, SQLite under backend/data/
```

**Frontend** (Node):

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173 (proxies /api to the backend)
```

Register a user in the UI, then create API keys and connect AI providers from
**Settings**. For production, set `VITE_API_BASE_URL` to the backend's public URL.

**MCP server** (optional — let an external AI operate Engram):

```bash
cd mcp
npm install
ENGRAM_API_KEY=<write-scoped key> ENGRAM_API_URL=http://localhost:8080/api/v1 node index.js
```

## API overview

Everything lives under `/api/v1`. The UI uses a JWT; programmatic/MCP access uses an
API key (`Authorization: Bearer <key>`). A representative slice:

| Area        | Endpoints                                                                    |
|-------------|------------------------------------------------------------------------------|
| Pages       | `POST/GET/PUT/DELETE /nodes`, `.../{id}/move`, `/reorder`, `/{id}/merge`      |
| Structure   | `/{id}/schema`, `/{id}/smart-query`, `/{id}/smart-results`, `/{id}/properties`|
| Relations   | `POST /links` (with `relType`), `/{id}/backlinks`, `/{id}/property-backlinks` |
| Search      | `POST /search` (FTS + tag/kind filters)                                       |
| AI          | `/ai/ask`, `/ai/summarize/{id}`, `/ai/fill`, `/ai/suggest-links/{id}`, `/ai/duplicates/{id}`, `/ai/ingest/*` |
| Data ops    | `/nodes/daily`, `/nodes/clip`, `/nodes/import-csv`, `/nodes/hygiene`, `/backup`, `/calendar.ics` |

## Tests

```bash
cd backend
mvn test
```

`@SpringBootTest` + MockMvc integration tests cover auth scopes, node CRUD,
full-text search, mind-map placements/edges and attachment upload/download against a
temporary SQLite database (with all Liquibase migrations applied).

## Deployment

Runs self-hosted (a Mac mini in my case) behind a **Cloudflare Tunnel** — no open
ports, TLS terminated by Cloudflare. Operational/tunable config (cron, timeouts,
topics) is kept out of the app and in a config source, so the image stays generic.

For a low-RAM footprint the backend is prepared for a **GraalVM native image**:

```bash
cd backend
mvn -Pnative native:compile
```

Reachability hints for the SQLite dialect and Liquibase changelogs live in
`NativeHints`; until built on a GraalVM toolchain, a tuned JVM is the supported path.

## Status & roadmap

A complete, working **v1** — well past MVP. Deliberate non-goals: multi-user,
real-time collaboration, and a native mobile app (it's a single-user personal tool,
installable as a PWA). Next on the polish list: KaTeX math rendering, a hard AI
spend cap, and seed/demo data.

---

<div align="center">
<sub>Built as a personal tool and a portfolio piece — one substrate, many views, AI throughout.</sub>
</div>
