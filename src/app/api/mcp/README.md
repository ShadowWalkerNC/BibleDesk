# BibleDesk MCP Server

HTTP MCP server at `/api/mcp`. Implements [Model Context Protocol](https://modelcontextprotocol.io) over JSON-RPC 2.0.

## Tools

| Tool | Description |
|---|---|
| `get_verse` | Fetch a specific Bible verse or passage |
| `search_scripture` | Search verses by keyword or phrase |
| `get_concept_subgraph` | 1-hop theology graph around a concept |
| `get_answer_history` | Recent BibleDesk answers from Supabase |
| `get_dimension` | One dimension from a stored answer |
| `ask_bible_question` | Full 6-stage pipeline — the crown jewel |

## Authentication

Optional. Set `MCP_SECRET` in your environment. If set, all requests must include:

```
Authorization: Bearer <MCP_SECRET>
```

Generate one:
```bash
openssl rand -hex 32
```

## Claude Desktop Setup

In your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bibledesk": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-render-url.onrender.com/api/mcp",
        "--header",
        "Authorization: Bearer YOUR_MCP_SECRET"
      ]
    }
  }
}
```

## Protocol

**List tools:**
```bash
curl https://your-app.onrender.com/api/mcp \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_SECRET" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Call a tool:**
```bash
curl https://your-app.onrender.com/api/mcp \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_SECRET" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_verse",
      "arguments": { "reference": "John 3:16", "translation": "kjv" }
    }
  }'
```

**Full pipeline:**
```bash
curl https://your-app.onrender.com/api/mcp \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MCP_SECRET" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "ask_bible_question",
      "arguments": { "question": "What does the Bible say about forgiveness?" }
    }
  }'
```

## Health check

```bash
curl https://your-app.onrender.com/api/mcp
```
Returns the tool manifest as JSON — no auth required.
