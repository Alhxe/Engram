<div align="center">

# Engram

**A self-hosted, AI-native personal knowledge base.**

Notes, databases, mind maps and a knowledge graph — one unified substrate,
searchable by full-text and operable by AI.

> Everything you know, connected.

</div>

---

## What is it?

Most note apps make you choose a shape up front: a document here, a spreadsheet
there, a mind map somewhere else — each in its own silo, none of them talking to
the others.

Engram removes the silos. Underneath, **everything is the same thing: a node**
(content + relations + typed properties + tags). A note, a table row, a mind-map
branch, a bookmark — same substrate. The document editor, the table/board/calendar
views, the graph… are just *different ways to render the same nodes*.

Because of that:

- **One search covers everything** — full-text across notes, table cells, tags and
  properties at once.
- **Everything can link to everything** — typed relations, backlinks and a live
  graph, regardless of how a page is displayed.
- **An AI can read and build your whole base** — from inside the app, or from your
  own AI client through a Model Context Protocol (MCP) server.

## What can it do?

**📝 Capture & structure**
- Pages that nest into a tree, each shown as one of six layouts: **Document, Table,
  Board, Calendar, Chart or Mind map** — switch the view, keep the data.
- Rich editor: headings, task lists, tables, images, code blocks with syntax
  highlighting, callouts, a `/` command menu, `@` page links, and **live page
  embeds** (a page rendered inside another).
- **Typed properties** (text, number, date, select, checkbox, rating, relation…)
  with a per-collection schema — your table columns, basically.

**🔗 Relate & navigate**
- **Typed links** — a relation can carry a verb ("depends on", "part of"…), shown in
  backlinks and the graph.
- **Backlinks** and a **local + global graph** to see how ideas connect.
- **Smart collections** — a page that automatically gathers every page matching a
  set of tags/properties, from anywhere in the base.

**🤖 AI, two ways**
- **Built in** — auto-suggest tags/properties, drop in a PDF and turn it into
  structured pages, **ask your notes** (RAG with citations), summarise a collection,
  or bulk-fill a property across many pages.
- **Through your own AI client** — the MCP server exposes ~25 tools so an external
  agent (e.g. Claude) can create, link and query pages natively, at zero cost to the
  app.
- **Any provider** — Claude, DeepSeek, or any OpenAI-compatible endpoint (local
  Ollama/LM Studio, OpenRouter, Groq…), a different model per task.

**🛠️ Everyday**
- Templates, favourites, daily notes, web clipper, CSV import.
- Export (Markdown / PDF / full ZIP), public share links, trash with restore,
  version history.
- Light/dark themes, installable **PWA**, bilingual UI (EN/ES), command palette.

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Backend   | Java 21 · Spring Boot 3 · SQLite + FTS5 · JPA/Hibernate |
| Frontend  | React 18 · TypeScript · Vite · Tailwind · TipTap · React Flow |
| AI        | Pluggable `AiProvider` — Claude / DeepSeek / OpenAI-compatible |
| Integration | MCP server (Node, `@modelcontextprotocol/sdk`) |

Single-user by design, with efficiency as a goal: SQLite means no separate database
process, and full-text search does the retrieval before any paid AI call.

## Run it locally

**Backend** (Java 21, Maven):

```bash
cd backend
mvn spring-boot:run          # API on http://localhost:8080
```

**Frontend** (Node):

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

Register a user in the UI, then create API keys and connect an AI provider from
**Settings**.

**MCP server** (optional — let an external AI operate Engram):

```bash
cd mcp
npm install
ENGRAM_API_KEY=<write-scoped key> ENGRAM_API_URL=http://localhost:8080/api/v1 node index.js
```

## Status

A complete, working **v1**. Deliberate non-goals: multi-user, real-time
collaboration and a native mobile app — it's a single-user personal tool,
installable as a PWA.

---

<div align="center">
<sub>One substrate, many views, AI throughout — built as a personal tool and a portfolio piece.</sub>
</div>
