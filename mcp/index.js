#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// --- Configuration ----------------------------------------------------------

const BASE_URL = (process.env.ENGRAM_API_URL ?? "http://localhost:8080/api/v1").replace(/\/$/, "");
const API_KEY = process.env.ENGRAM_API_KEY;

if (!API_KEY) {
  console.error("ENGRAM_API_KEY is required (a WRITE-scoped Engram API key).");
  process.exit(1);
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    let message = response.statusText;
    try {
      message = (await response.json()).message ?? message;
    } catch {
      /* non-JSON */
    }
    throw new Error(`Engram API ${response.status}: ${message}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

const ok = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (error) => ({ content: [{ type: "text", text: `Error: ${error.message}` }], isError: true });

// A thin wrapper so every tool gets uniform error handling.
const tool = (server, name, description, schema, run) =>
  server.tool(name, description, schema, async (args) => {
    try {
      return ok(await run(args));
    } catch (e) {
      return fail(e);
    }
  });

// --- Server -----------------------------------------------------------------

const INSTRUCTIONS = `Engram is a personal knowledge base where EVERYTHING is a "page" (node).
Pages nest into a tree (parentId) and can link to each other (relations).

DATA MODEL
- A page has: title, content (HTML), layout, tags (shared, reusable), typed properties, links,
  and optional children. Collections (TABLE/BOARD/CALENDAR/CHART) are driven by the CHILD pages.
- layout is one of: DOCUMENT (prose/notes), TABLE (rows of data), BOARD (grouped cards),
  CALENDAR (dated items), CHART (aggregates a numeric/select property of the children),
  MINDMAP (related concepts). Most pages are DOCUMENT. For TABLE/BOARD/CALENDAR/CHART the ROWS
  are child pages whose properties drive the view (a SELECT property for a board's columns, a
  DATE property for a calendar, a NUMBER property for a chart).
- tags are shared across the whole base. ALWAYS call list_tags first and reuse an existing tag
  instead of inventing a near-duplicate.
- property types and their value format (value is always sent as a string):
  TEXT, NUMBER ("42"), DATE ("YYYY-MM-DD"), SELECT ("Label"), CHECKBOX ("true"/"false"),
  URL ("https://…"), EMAIL ("a@b.com"), MULTISELECT ("a, b, c"), RATING ("1".."5"),
  RELATION (value is the TARGET page id). Prefer a specific type over TEXT when it fits.
- A collection can declare a schema (set_schema): the columns/properties its children should have.
  A SELECT/MULTISELECT field may declare allowed "options" (closed value set).
- Links can carry a relationship verb (relType): "depends on", "part of", "contradicts", etc.
  Set it when the relationship has a clear meaning.
- A page can be a SMART COLLECTION (set_smart_query): instead of listing its own children, it gathers
  pages from anywhere that carry ALL given tags (and optionally a matching property). Read the matches
  with get_smart_results.

CONTENT (HTML)
- content is HTML. Allowed tags: h1 h2 h3 p ul ol li strong em u s blockquote pre code hr img
  table thead tbody tr th td. No inline styles or scripts.
- Callout box: <div class="callout" data-variant="info"><p>…</p></div>
  variant ∈ info | success | warn | danger | note.
- Checklist: <ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>…</p></li></ul>
- Link to another page INLINE (use a real page id from search/get_page):
  <span data-type="mention" data-id="PAGE_ID" data-label="Page title"></span>
- Embed another page's live content (transclusion): <div data-page-embed data-page-id="PAGE_ID"></div>
- For a durable relation that shows in backlinks, also/instead use create_link.

WHAT YOU CAN DO
- Read: search, list_tags, list_pages, list_children, get_page, get_backlinks, list_templates,
  list_favorites.
- Write: create_page, update_page, delete_page (to trash), move_page, reorder_pages, merge_pages,
  set_property, delete_property, set_schema, set_smart_query, create_link, set_favorite, share_page,
  set_template, instantiate_template, daily_note, clip_url.
- Read (relations & upkeep): get_backlinks, get_property_backlinks, get_smart_results, hygiene.
- AI over the user's own notes: ask (RAG, optionally scoped to a page's subtree), summarize a
  collection, fill_property (write a property on every child of a page from its content).

TYPICAL FLOW to ingest a document:
1. list_tags and search for related existing pages (for context and linking).
2. create_page for each coherent section, choosing a fitting layout and reusing tags.
3. set_property where structure helps; create_link between related pages.

ACADEMIA (study area)
- A dedicated study space on the same substrate. Subjects live under an "Academia" root page.
- create_subject scaffolds a course: Temario (a "ruta" learning-path whose child pages are the
  topics/temas), Apuntes, Flashcards, and a Preguntas smart collection (open questions).
- A FLASHCARD is any page tagged "flashcard": title = question, content = answer. Create them by
  hand, or use generate_flashcards to have AI make them from a topic (run it ON a tema, not on the
  Temario, so cards nest under the tema).
- Spaced repetition: review_due lists cards due today; pass scopeId to review just one subject or
  one tema (its subtree). After showing a card, grade_card with AGAIN/HARD/GOOD/EASY reschedules it.
- To help a student: create_subject, then per tema create_page notes + generate_flashcards; you can
  also quiz them by calling review_due(scopeId) and grade_card on their answers.`;

const server = new McpServer({ name: "engram", version: "0.4.0" }, { instructions: INSTRUCTIONS });

const LAYOUT = z.enum(["DOCUMENT", "MINDMAP", "TABLE", "BOARD", "CALENDAR", "CHART"]);
const PROPERTY_TYPE = z.enum([
  "TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX",
  "URL", "EMAIL", "MULTISELECT", "RATING", "RELATION",
]);

// --- Read tools -------------------------------------------------------------

tool(server, "search",
  "Full-text search across all pages (title, content, tags, property values). Optionally filter by tags.",
  { query: z.string().describe("Search text"), tags: z.array(z.string()).optional() },
  ({ query, tags }) => api("/search", { method: "POST", body: JSON.stringify({ query, tags }) }));

tool(server, "list_tags",
  "List all existing tags. Call before creating pages so you reuse tags instead of duplicating them.",
  {},
  () => api("/tags"));

tool(server, "list_pages",
  "List pages (paginated) under a parent, or all top-level pages when parentId is omitted.",
  {
    parentId: z.string().optional(),
    page: z.number().int().optional(),
    size: z.number().int().optional(),
  },
  ({ parentId, page, size }) => {
    const q = new URLSearchParams();
    if (parentId) q.set("parentId", parentId);
    q.set("page", String(page ?? 0));
    q.set("size", String(size ?? 50));
    return api(`/nodes?${q.toString()}`);
  });

tool(server, "list_children",
  "List the child pages of a page (tree items), or the root pages when parentId is omitted.",
  { parentId: z.string().optional().describe("Parent page id; omit for root pages") },
  ({ parentId }) => api(`/nodes/children${parentId ? `?parentId=${parentId}` : ""}`));

tool(server, "get_page",
  "Get a page's full detail (title, content, layout, tags, properties, schema).",
  { id: z.string() },
  ({ id }) => api(`/nodes/${id}`));

tool(server, "get_backlinks",
  "List pages that link TO the given page (each with its relationship verb, if any).",
  { id: z.string() },
  ({ id }) => api(`/nodes/${id}/backlinks`));

tool(server, "get_property_backlinks",
  "List pages that reference the given page through a RELATION property (inverse relation).",
  { id: z.string() },
  ({ id }) => api(`/nodes/${id}/property-backlinks`));

tool(server, "get_smart_results",
  "List the pages currently matched by a smart-collection page's query.",
  { id: z.string() },
  ({ id }) => api(`/nodes/${id}/smart-results`));

tool(server, "hygiene",
  "Report pages worth revisiting: off the graph (no links/children), untagged, and long-untouched.",
  {},
  () => api("/nodes/hygiene"));

tool(server, "list_templates",
  "List pages saved as templates (use instantiate_template to create a page from one).",
  {},
  () => api("/nodes/templates"));

tool(server, "list_favorites",
  "List the user's favorite pages.",
  {},
  () => api("/nodes/favorites"));

// --- Write tools ------------------------------------------------------------

tool(server, "create_page",
  "Create a page. content is HTML (see server instructions). Reuse existing tags.",
  {
    title: z.string(),
    content: z.string().optional().describe("HTML body"),
    layout: LAYOUT.optional(),
    parentId: z.string().optional().describe("Parent page id; omit for a top-level page"),
    tags: z.array(z.string()).optional(),
  },
  ({ title, content, layout, parentId, tags }) =>
    api("/nodes", {
      method: "POST",
      body: JSON.stringify({ title, content: content ?? "", layout: layout ?? "DOCUMENT", parentId, tags }),
    }));

tool(server, "update_page",
  "Replace a page's title/content/layout/tags. Fetch it first with get_page to avoid losing fields.",
  {
    id: z.string(),
    title: z.string(),
    content: z.string().optional(),
    layout: LAYOUT.optional(),
    parentId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  ({ id, title, content, layout, parentId, tags }) =>
    api(`/nodes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, content: content ?? "", layout: layout ?? "DOCUMENT", parentId, tags }),
    }));

tool(server, "delete_page",
  "Move a page (and its subtree) to the trash.",
  { id: z.string() },
  ({ id }) => api(`/nodes/${id}`, { method: "DELETE" }));

tool(server, "move_page",
  "Reparent a page. Omit parentId to move it to the top level.",
  { id: z.string(), parentId: z.string().nullable().optional() },
  ({ id, parentId }) => api(`/nodes/${id}/move`, { method: "PUT", body: JSON.stringify({ parentId: parentId ?? null }) }));

tool(server, "reorder_pages",
  "Set the manual order of sibling pages. Pass every child id in the desired order.",
  { orderedIds: z.array(z.string()) },
  ({ orderedIds }) => api("/nodes/reorder", { method: "PUT", body: JSON.stringify({ orderedIds }) }));

tool(server, "merge_pages",
  "Merge a page INTO another: fold its tags, missing properties, children and links into the target, "
  + "then move the source to the trash. Use to deduplicate.",
  { id: z.string().describe("Page to merge (removed)"), into: z.string().describe("Target page (kept)") },
  ({ id, into }) => api(`/nodes/${id}/merge?into=${into}`, { method: "POST" }));

tool(server, "set_property",
  "Set (or update) a typed property on a page. See instructions for each type's value format.",
  { id: z.string(), name: z.string(), type: PROPERTY_TYPE, value: z.string().nullable().optional() },
  ({ id, name, type, value }) =>
    api(`/nodes/${id}/properties`, { method: "PUT", body: JSON.stringify({ name, type, value: value ?? null }) }));

tool(server, "delete_property",
  "Remove a property from a page.",
  { id: z.string(), name: z.string() },
  ({ id, name }) => api(`/nodes/${id}/properties?name=${encodeURIComponent(name)}`, { method: "DELETE" }));

tool(server, "set_schema",
  "Define the collection schema for a page: the properties its child pages should have. "
  + "For SELECT/MULTISELECT you may pass options (the allowed values).",
  {
    id: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: PROPERTY_TYPE,
      options: z.array(z.string()).optional(),
    })),
  },
  ({ id, fields }) => api(`/nodes/${id}/schema`, { method: "PUT", body: JSON.stringify(fields) }));

tool(server, "set_smart_query",
  "Turn a page into a smart collection: it gathers pages anywhere carrying ALL given tags (and an "
  + "optional property match). Pass empty tags and no property to clear it.",
  {
    id: z.string(),
    tags: z.array(z.string()).optional(),
    propertyName: z.string().optional(),
    propertyValue: z.string().optional(),
  },
  ({ id, tags, propertyName, propertyValue }) =>
    api(`/nodes/${id}/smart-query`, {
      method: "PUT",
      body: JSON.stringify({ tags: tags ?? [], propertyName: propertyName ?? null, propertyValue: propertyValue ?? null }),
    }));

tool(server, "create_link",
  "Relate two pages: a directed link from source to target (shows in backlinks). "
  + "Optionally give the relationship a verb via relType.",
  { sourceId: z.string(), targetId: z.string(), relType: z.string().optional() },
  ({ sourceId, targetId, relType }) =>
    api("/links", { method: "POST", body: JSON.stringify({ sourceId, targetId, relType: relType ?? null }) }));

tool(server, "set_favorite",
  "Mark or unmark a page as favorite.",
  { id: z.string(), favorite: z.boolean() },
  ({ id, favorite }) => api(`/nodes/${id}/favorite`, { method: "PUT", body: JSON.stringify({ favorite }) }));

tool(server, "share_page",
  "Start or stop public sharing of a page. When shared, the response includes a shareToken.",
  { id: z.string(), shared: z.boolean() },
  ({ id, shared }) => api(`/nodes/${id}/share`, { method: "PUT", body: JSON.stringify({ shared }) }));

tool(server, "set_template",
  "Mark or unmark a page as a reusable template.",
  { id: z.string(), template: z.boolean() },
  ({ id, template }) => api(`/nodes/${id}/template`, { method: "PUT", body: JSON.stringify({ template }) }));

tool(server, "instantiate_template",
  "Create a new page from a template (copies content, layout, tags and properties).",
  { id: z.string(), parentId: z.string().optional() },
  ({ id, parentId }) => api(`/nodes/${id}/instantiate${parentId ? `?parentId=${parentId}` : ""}`, { method: "POST" }));

tool(server, "daily_note",
  "Get or create the journal entry for a date (YYYY-MM-DD); returns the page.",
  { date: z.string().describe("YYYY-MM-DD") },
  ({ date }) => api("/nodes/daily", { method: "POST", body: JSON.stringify({ date }) }));

tool(server, "clip_url",
  "Fetch a web page and save its main content as a new page.",
  { url: z.string(), parentId: z.string().optional() },
  ({ url, parentId }) => api("/nodes/clip", { method: "POST", body: JSON.stringify({ url, parentId: parentId ?? null }) }));

// --- AI tools (grounded in the user's own notes) ----------------------------

tool(server, "ask",
  "Ask a question answered from the user's notes (RAG, with sources). Optionally scope to a page's subtree.",
  { question: z.string(), scopeId: z.string().optional().describe("Limit retrieval to this page and its descendants") },
  ({ question, scopeId }) => api("/ai/ask", { method: "POST", body: JSON.stringify({ question, scopeId: scopeId ?? null }) }));

tool(server, "summarize",
  "Generate an AI overview of a page's child pages.",
  { parentId: z.string() },
  ({ parentId }) => api(`/ai/summarize/${parentId}`, { method: "POST" }));

tool(server, "fill_property",
  "Use AI to write one property on EVERY child of a page, based on each child's content.",
  {
    parentId: z.string(),
    name: z.string().describe("Property to fill"),
    type: PROPERTY_TYPE,
    instruction: z.string().describe("What to put, e.g. 'extract the email' or 'classify difficulty'"),
  },
  ({ parentId, name, type, instruction }) =>
    api("/ai/fill", { method: "POST", body: JSON.stringify({ parentId, name, type, instruction }) }));

// --- Academia / study (spaced repetition) -----------------------------------

tool(server, "list_subjects",
  "List the subjects in the Academia study area (each is a scaffolded course page).",
  {},
  () => api("/academia/subjects"));

tool(server, "create_subject",
  "Create a subject in Academia, scaffolded with Temario (a learning-path), Apuntes, Flashcards and "
  + "an open-Questions smart collection. Then fill each tema and generate flashcards from it.",
  { name: z.string().describe("Subject name, e.g. 'Sistemas Distribuidos'") },
  ({ name }) => api(`/academia/subjects?name=${encodeURIComponent(name)}`, { method: "POST" }));

tool(server, "generate_flashcards",
  "Generate study flashcards from a page (its content + sub-pages) with AI; cards are created as "
  + "child pages tagged 'flashcard'. Run it ON a topic/tema (not the Temario) so cards nest under it.",
  { pageId: z.string(), count: z.number().int().optional().describe("How many cards (default 6)") },
  ({ pageId, count }) => api(`/ai/flashcards/${pageId}?count=${count ?? 6}`, { method: "POST" }));

tool(server, "review_due",
  "List flashcards due for review today (spaced repetition). Optionally pass scopeId to review just "
  + "one subject or one tema (its subtree) instead of everything.",
  { scopeId: z.string().optional().describe("Page id to scope the review to; omit for all subjects") },
  ({ scopeId }) => api(`/srs/due${scopeId ? `?scope=${scopeId}` : ""}`));

tool(server, "grade_card",
  "Grade a flashcard after review and reschedule it (spaced repetition): "
  + "AGAIN (forgot), HARD, GOOD, or EASY.",
  { id: z.string(), grade: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]) },
  ({ id, grade }) => api(`/srs/${id}/grade?grade=${grade}`, { method: "POST" }));

// --- Resources --------------------------------------------------------------

server.resource("tags", "engram://tags", async () => {
  const tags = await api("/tags");
  return { contents: [{ uri: "engram://tags", mimeType: "application/json", text: JSON.stringify(tags) }] };
});

// --- Run --------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`engram-mcp connected to ${BASE_URL}`);
