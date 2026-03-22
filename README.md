# FieldPulse MCP Server
### Solar Alternatives Inc. — Internal Tooling

A Model Context Protocol (MCP) server that connects Claude to your FieldPulse account, enabling AI-assisted job management, customer lookups, invoicing, scheduling, and more.

---

## Covered Entities

| Entity | List | Get | Create | Update |
|---|---|---|---|---|
| Customers | ✅ | ✅ | ✅ | ✅ |
| Jobs | ✅ | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ | ✅ |
| Estimates | ✅ | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ | ✅ |
| Timesheets | ✅ | — | ✅ | ✅ |
| Material Lists | ✅ | — | ✅ | ✅ |
| Purchase Orders | ✅ | — | ✅ | — |
| Subtasks | ✅ | — | ✅ | ✅ |
| Comments | — | — | ✅ | — |
| Users | ✅ | — | — | — |
| Vendors | ✅ | — | — | — |
| Tags | ✅ | — | — | — |
| Pipeline Statuses | ✅ | — | — | — |

> **Note:** Delete operations are intentionally excluded for safety.

---

## Prerequisites

- Node.js 18 or higher
- A FieldPulse API key (contact support@fieldpulse.com)

---

## Installation

```bash
cd fieldpulse-mcp
npm install
```

---

## Configuration

Set your API key as an environment variable — never hardcode it:

```bash
export FIELDPULSE_API_KEY=your_api_key_here
```

Or create a `.env` file (add `.env` to `.gitignore`):

```
FIELDPULSE_API_KEY=your_api_key_here
```

> ⚠️ **Important:** Once you receive your replacement API key from FieldPulse support, set it here. The previous key should be considered compromised and revoked.

---

## Running Locally

```bash
npm start
```

The server communicates over stdio and is designed to be launched by an MCP host (Claude Desktop, Claude Code, etc.).

---

## Connecting to Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fieldpulse": {
      "command": "node",
      "args": ["/path/to/fieldpulse-mcp/src/index.js"],
      "env": {
        "FIELDPULSE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

---

## Connecting to Claude Code

```bash
claude mcp add fieldpulse node /path/to/fieldpulse-mcp/src/index.js
```

Then set the environment variable in your shell or `.env`.

---

## Transport Modes

The server automatically selects the right transport:

| Condition | Mode | Use case |
|---|---|---|
| `PORT` env var is set | **SSE over HTTP** | Railway, Render, any cloud host |
| `MCP_TRANSPORT=sse` | **SSE over HTTP** | Force SSE locally for testing |
| Neither | **stdio** | Claude Desktop, Claude Code, local |

---

## Deploying to Railway (Recommended)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial FieldPulse MCP server"
git remote add origin https://github.com/YOUR_ORG/fieldpulse-mcp.git
git push -u origin main
```

### 2. Create Railway project
1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project → Deploy from GitHub repo**
3. Select your `fieldpulse-mcp` repo
4. Railway will auto-detect Node.js and use `railway.json`

### 3. Set environment variables
In Railway dashboard → your service → **Variables**, add:
```
FIELDPULSE_API_KEY=your_new_api_key_here
```
Railway automatically sets `PORT` — this is what triggers SSE mode.

### 4. Get your public URL
Railway assigns a URL like:
```
https://fieldpulse-mcp-production.up.railway.app
```

### 5. Connect Claude to your Railway MCP
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "fieldpulse": {
      "type": "sse",
      "url": "https://your-app.up.railway.app/sse"
    }
  }
}
```

### Verify it's running
```bash
curl https://your-app.up.railway.app/health
# → {"status":"ok","service":"fieldpulse-mcp"}
```

---

---

## Rate Limits

FieldPulse enforces **1,000 requests per hour**. The server surfaces 429 errors clearly so you know when you've hit the limit.

---

## API Key Rotation

When you receive your new API key from FieldPulse:
1. Update `FIELDPULSE_API_KEY` in your environment or `.env`
2. Restart the MCP server
3. Confirm the old key has been revoked by FieldPulse support

---

## Next Steps / Roadmap

- [ ] SOS Inventory MCP (pending API doc review)
- [ ] Buildertrend browser automation (Claude in Chrome)
- [ ] MGO / NOLA One Stop browser automation workflows
- [ ] FieldPulse ↔ SOS Inventory sync tools
