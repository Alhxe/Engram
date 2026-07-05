# Engram — Planned Features

Guiding principle: **one unified substrate**. A note, a mind-map branch, a
snippet or a bookmark are all the same thing underneath — a *node* (text +
relations + tags/project). Notes, mind maps and graph are just different ways to
render the same nodes, and a single searcher / single API spans all of them.

## Core model

- **Node** — the atomic unit: markdown text + metadata. Every piece of
  knowledge is a node, regardless of how it is displayed.
- **Link** — a directed relation between nodes (from `[[wikilinks]]` in the
  text). Links produce backlinks and the graph automatically.
- **Tag** — cross-cutting label, many per node (`#idea`, `#todo`).
- **Project** — hierarchical container (folder-like) to group nodes.

## MVP (phase 1) — done

- [x] Create / edit / delete notes (rich text) with `[[wikilinks]]` (highlighted
      in the editor, resolved into links on save; missing targets are created).
- [x] Nodes organized by **project** and **tags** (assign/move from the editor).
- [x] **Backlinks** — see every node that references the current one.
- [x] **Full-text search** over all nodes (FTS5) with highlighted snippets and
      filters by project, kind and tag.
- [x] **API-key access** — REST API (read/write scopes). Star endpoint: `POST /search`.
- [x] Attachments stored on disk, referenced from nodes.

## Phase 2 — mostly done

- [x] **Mind maps** — multiple editable canvases per project (React Flow): drag to
      arrange, connect nodes to link, recolor nodes, remove relations.
- [x] **Graph** view — global graph derived from links (click a node to open it).
- [x] Read/write API-key scopes.
- [ ] Local graph per node + orphan-node detection.
- [ ] Bookmarks — save a URL, auto-extract title/summary.
- [ ] Daily notes / journal for quick capture.

## Phase 3 (AI — parked)

- [ ] **Semantic search** via embeddings (`sqlite-vec`), same substrate.
- [ ] Provider-agnostic AI behind `AiProvider` (local Ollama / external API).
- [ ] RAG endpoint: natural-language question → relevant nodes.
- [ ] Optional MCP server exposing the same API to agents natively.
- [ ] Audio transcription, auto-summaries, auto-tagging.

## Explicit non-goals (for now)

- Multi-user / collaboration (single-user personal tool).
- Real-time collaborative editing.
- Visual drag-and-drop canvas (evaluate later; outline-style mind maps first).
