# MCP HTTP-to-STDIO Proxy Server

A lightweight proxy server that bridges HTTP requests to STDIO-based MCP (Model Context Protocol) servers, enabling mobile apps and web clients to use local MCP servers.

## What This Does

```
Mobile App → HTTP Request → This Proxy → STDIN → MCP Server → STDOUT → Proxy → HTTP Response
```

## Supported MCP Servers

| Server | Description | Requires |
|--------|-------------|----------|
| `filesystem` | File system operations | None |
| `fetch` | Web content fetching | None |
| `sequential-thinking` | Structured reasoning | None |
| `puppeteer` | Browser automation | None |
| `brave` | Web search | API Key |
| `memory` | Persistent memory | None |
| `git` | Git operations | None |
| `github` | GitHub API | Personal Access Token |
| `sqlite` | SQLite database | None |
| `e2b` | Code execution | API Key |

## Installation

1. **Navigate to the proxy directory:**
   ```bash
   cd mcp-proxy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

The proxy will start on `http://localhost:3000`

## Usage

### Health Check
```bash
curl http://localhost:3000/health
```

### List Available Tools
```bash
curl http://localhost:3000/mcp/filesystem/tools
```

### Call MCP Tools
```bash
curl -X POST http://localhost:3000/mcp/filesystem \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

## Configuration

### Change Port
```bash
PORT=4000 npm start
```

### Add API Keys
Set environment variables before starting:

```bash
# Brave Search API
export BRAVE_API_KEY="your-key-here"

# GitHub Token
export GITHUB_TOKEN="your-token-here"

# E2B API
export E2B_API_KEY="your-key-here"

npm start
```

## Mobile App Setup

In your mobile app (Mobcode), connect to:

- **Filesystem**: `http://localhost:3000/mcp/filesystem`
- **Fetch**: `http://localhost:3000/mcp/fetch`
- **Sequential Thinking**: `http://localhost:3000/mcp/sequential-thinking`
- **Puppeteer**: `http://localhost:3000/mcp/puppeteer`

> **Note:** When using Expo Go on a physical device, replace `localhost` with your computer's local IP address (e.g., `http://192.168.1.100:3000/mcp/filesystem`)

## Example API Calls

### Read a file (Filesystem MCP)
```json
POST /mcp/filesystem
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "/path/to/file.txt"
    }
  }
}
```

### Fetch a web page (Fetch MCP)
```json
POST /mcp/fetch
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "fetch",
    "arguments": {
      "url": "https://example.com"
    }
  }
}
```

### Sequential thinking (Sequential Thinking MCP)
```json
POST /mcp/sequential-thinking
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "thinking",
    "arguments": {
      "query": "Solve this step by step: What is 15% of 240?"
    }
  }
}
```

## Troubleshooting

### Server won't start
- Ensure Node.js 18+ is installed: `node --version`
- Check if port 3000 is already in use
- Run `npm install` to install dependencies

### Can't connect from mobile device
- Use your computer's local IP address instead of `localhost`
- Check firewall settings
- Ensure your mobile device is on the same network

### MCP server fails to start
- Ensure `npx` is installed
- Check npm cache: `npm cache clean`
- Some servers may require additional setup (API keys, etc.)

## Development

Run with auto-reload:
```bash
npm run dev
```

## License

MIT
