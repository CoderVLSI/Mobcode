#!/usr/bin/env node

/**
 * MCP HTTP-to-STDIO Proxy Server
 *
 * Bridges HTTP requests to STDIO-based MCP servers
 * Run this server locally to use MCP servers with mobile apps
 */

import express from 'express';
import { spawn } from 'child_process';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Store running MCP server processes
const processes = new Map();
const pendingRequests = new Map();

/**
 * MCP Server configurations
 * Add more servers here as needed
 */
const MCP_SERVERS = {
  filesystem: {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
    description: 'File system operations',
  },
  fetch: {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    description: 'Web content fetching',
  },
  'sequential-thinking': {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    description: 'Structured reasoning',
  },
  puppeteer: {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    description: 'Browser automation',
  },
  brave: {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    description: 'Web search (requires API key)',
  },
  memory: {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    description: 'Persistent memory',
  },
  'git': {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-git'],
    description: 'Git operations',
    allowedDir: process.cwd(),
  },
  github: {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    description: 'GitHub API (requires token)',
  },
  'sqlite': {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', './mcp-sqlite.db'],
    description: 'SQLite database',
  },
  'e2b': {
    cmd: 'npx',
    args: ['-y', '@modelcontextprotocol/server-e2b'],
    description: 'Code execution (requires API key)',
  },
};

/**
 * Start an MCP server process
 */
async function startServer(serverName) {
  const config = MCP_SERVERS[serverName];
  if (!config) {
    throw new Error(`Unknown server: ${serverName}`);
  }

  if (processes.has(serverName)) {
    return processes.get(serverName);
  }

  console.log(`Starting ${serverName}...`);

  const proc = spawn(config.cmd, config.args, {
    env: { ...process.env },
  });

  let buffer = '';
  let requestId = 0;

  proc.stdout.on('data', (data) => {
    buffer += data.toString();

    // Process line by line (MCP uses JSON-RPC over STDIO)
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);

        // Route response to waiting request
        if (message.id !== undefined && pendingRequests.has(message.id)) {
          const { resolve } = pendingRequests.get(message.id);
          pendingRequests.delete(message.id);
          resolve(message);
        } else if (message.method === 'notifications/message' || message.method === 'notifications/progress') {
          // Handle notifications (log them for now)
          console.log(`[${serverName}] Notification:`, message.params?.data || message.params);
        }
      } catch (e) {
        console.error(`[${serverName}] Failed to parse:`, line);
      }
    }
  });

  proc.stderr.on('data', (data) => {
    console.error(`[${serverName}] STDERR:`, data.toString());
  });

  proc.on('error', (err) => {
    console.error(`[${serverName}] Process error:`, err);
    processes.delete(serverName);
  });

  proc.on('exit', (code) => {
    console.log(`[${serverName}] Exited with code ${code}`);
    processes.delete(serverName);
  });

  // Initialize the MCP server
  const initMsg = {
    jsonrpc: '2.0',
    id: ++requestId,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'mcp-proxy',
        version: '1.0.0',
      },
    },
  };

  const initResponse = await sendMessage(serverName, proc, initMsg);

  if (initResponse.error) {
    throw new Error(`Failed to initialize ${serverName}: ${initResponse.error.message}`);
  }

  console.log(`[${serverName}] Connected: ${initResponse.result?.serverInfo?.name || serverName} v${initResponse.result?.serverInfo?.version || '?'}`);

  processes.set(serverName, proc);
  return proc;
}

/**
 * Send a message to an MCP server and wait for response
 */
function sendMessage(serverName, proc, message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(message.id);
      reject(new Error('Request timeout'));
    }, 30000);

    pendingRequests.set(message.id, {
      resolve: (response) => {
        clearTimeout(timeout);
        resolve(response);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });

    proc.stdin.write(JSON.stringify(message) + '\n');
  });
}

/**
 * Main MCP endpoint
 */
app.post('/mcp/:server', async (req, res) => {
  const { server } = req.params;

  try {
    const proc = await startServer(server);
    const response = await sendMessage(server, proc, {
      ...req.body,
      id: req.body.id || Date.now(),
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message,
      },
      id: req.body?.id || null,
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    servers: Object.fromEntries(
      Array.from(processes.keys()).map(name => [name, 'running'])
    ),
    availableServers: Object.keys(MCP_SERVERS),
  });
});

/**
 * List available tools from a server
 */
app.get('/mcp/:server/tools', async (req, res) => {
  const { server } = req.params;

  try {
    const proc = await startServer(server);
    const response = await sendMessage(server, proc, {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {},
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop a server
 */
app.delete('/mcp/:server', (req, res) => {
  const { server } = req.params;
  const proc = processes.get(server);

  if (proc) {
    proc.kill();
    processes.delete(server);
    res.json({ status: 'stopped', server });
  } else {
    res.status(404).json({ error: 'Server not running' });
  }
});

/**
 * Start the proxy server
 */
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  MCP HTTP-to-STDIO Proxy Server                             ║
╠════════════════════════════════════════════════════════════╣
║  Listening: http://localhost:${PORT}                         ║
║  Health:   http://localhost:${PORT}/health                   ║
║                                                              ║
║  Available MCP Servers:                                      ║
${Object.entries(MCP_SERVERS).map(([name, config]) => `║  • ${name.padEnd(20)} - ${config.description}`).join('\n')}
║                                                              ║
║  Usage: POST /mcp/{server}                                   ║
║  Example: POST /mcp/filesystem                              ║
║           { "jsonrpc": "2.0", "method": "tools/list" }      ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down MCP servers...');
  for (const [name, proc] of processes.entries()) {
    console.log(`  Stopping ${name}...`);
    proc.kill();
  }
  process.exit(0);
});
