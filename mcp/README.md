# Engram MCP server

Exposes an Engram knowledge base to AI clients (Claude Desktop, Claude Code, …)
over the [Model Context Protocol](https://modelcontextprotocol.io). The AI
reasons; this server gives it the tools and context to read and build your
knowledge base — so you can hand a PDF to your own Claude and have it create
formatted, tagged, interlinked pages.

Cost note: in this mode the AI runs in **your** client, so it does not spend
Engram's provider key at all.

## What it exposes

- **Server instructions** describing the Engram model (pages are HTML, page
  layouts, reuse tags, how to link) so the AI formats correctly.
- **Tools**: `search`, `list_tags`, `list_children`, `get_page`,
  `get_backlinks`, `create_page`, `update_page`, `set_property`, `create_link`.
- **Resource** `engram://tags` — the current tag list, for context.

## Setup

1. Create a **WRITE-scoped API key** in Engram (Settings → API keys).
2. Install deps:

   ```bash
   cd mcp
   npm install
   ```

3. Configure your client. For **Claude Desktop**, add to
   `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "engram": {
         "command": "node",
         "args": ["/absolute/path/to/Engram/mcp/index.js"],
         "env": {
           "ENGRAM_API_URL": "http://localhost:8080/api/v1",
           "ENGRAM_API_KEY": "engram_your_write_key_here"
         }
       }
     }
   }
   ```

   For a remote Engram (e.g. via Cloudflare Tunnel), set `ENGRAM_API_URL` to the
   public API base.

4. Restart the client. Ask it, e.g.: *"Read this PDF and add it to my Engram,
   splitting it into pages and reusing my existing tags."*

## Environment

| Variable         | Default                          | Description                    |
| ---------------- | -------------------------------- | ------------------------------ |
| `ENGRAM_API_URL` | `http://localhost:8080/api/v1`   | Engram REST API base URL       |
| `ENGRAM_API_KEY` | —                                | WRITE-scoped Engram API key    |
