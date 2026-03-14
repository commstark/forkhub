# ForkHub MCP Server

An MCP (Model Context Protocol) server that lets you use ForkHub as a tool in Claude Code.

## Setup

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

The server requires two environment variables:

- **`FORKHUB_API_URL`** — Base URL of your ForkHub instance (e.g., `https://forkhub.vercel.app`)
- **`FORKHUB_API_KEY`** — Your API key (starts with `sk_fh_...`)

## Add to Claude Code

Run this command to register ForkHub as an MCP server:

```bash
claude mcp add forkhub -- node /absolute/path/to/forkhub/mcp-server/dist/index.js
```

Then set your environment variables. You can add them to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "forkhub": {
      "command": "node",
      "args": ["/absolute/path/to/forkhub/mcp-server/dist/index.js"],
      "env": {
        "FORKHUB_API_URL": "https://forkhub.vercel.app",
        "FORKHUB_API_KEY": "sk_fh_your_key_here"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `forkhub:search_tools` | Search for tools by query, category, classification |
| `forkhub:get_tool` | Get full details for a specific tool |
| `forkhub:upload_tool` | Upload a new tool to ForkHub |
| `forkhub:fork_tool` | Fork an existing tool with modifications |
| `forkhub:rate_tool` | Rate a tool (1-5 stars) |
| `forkhub:share_tool` | Update sharing settings (private/link/public) |
| `forkhub:my_tools` | List your uploaded tools |
| `forkhub:reviews` | List pending reviews |
| `forkhub:approve_tool` | Approve a tool review |
| `forkhub:reject_tool` | Reject a tool review |
