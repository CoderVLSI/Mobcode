/**
 * MCP (Model Context Protocol) Client
 * Allows the agent to connect to external MCP servers for additional tools
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPServer {
  name: string;
  url: string;
  tools: MCPTool[];
  status: 'connected' | 'disconnected' | 'error';
}

export interface MCPToolResult {
  success: boolean;
  output: any;
  error?: string;
}

class MCPClient {
  private servers: Map<string, MCPServer> = new Map();

  /**
   * Connect to an MCP server
   */
  async connectServer(name: string, url: string): Promise<void> {
    try {
      // Initialize connection - fetch server info
      const response = await fetch(`${url}/mcp/v1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'cursor-clone-mobile',
              version: '1.0.0',
            },
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      // Fetch available tools
      const toolsResponse = await fetch(`${url}/mcp/v1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        }),
      });

      const toolsData = await toolsResponse.json();
      const tools = toolsData.result?.tools || [];

      this.servers.set(name, {
        name,
        url,
        tools,
        status: 'connected',
      });
    } catch (error) {
      this.servers.set(name, {
        name,
        url,
        tools: [],
        status: 'error',
      });
      throw error;
    }
  }

  /**
   * Execute a tool on an MCP server
   */
  async executeTool(
    serverName: string,
    toolName: string,
    parameters: any
  ): Promise<MCPToolResult> {
    const server = this.servers.get(serverName);

    if (!server) {
      return {
        success: false,
        output: null,
        error: `Server "${serverName}" not found`,
      };
    }

    if (server.status !== 'connected') {
      return {
        success: false,
        output: null,
        error: `Server "${serverName}" is not connected`,
      };
    }

    try {
      const response = await fetch(`${server.url}/mcp/v1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: parameters,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          output: null,
          error: data.error.message,
        };
      }

      return {
        success: true,
        output: data.result?.content || data.result,
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all connected servers
   */
  listServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): Map<string, { server: string; tool: MCPTool }> {
    const allTools = new Map();

    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        for (const tool of server.tools) {
          allTools.set(`${server.name}/${tool.name}`, {
            server: server.name,
            tool,
          });
        }
      }
    }

    return allTools;
  }

  /**
   * Disconnect a server
   */
  disconnectServer(name: string): void {
    this.servers.delete(name);
  }

  /**
   * Add a preset MCP server (common ones)
   */
  async addPresetServer(preset: string): Promise<void> {
    const presets: Record<string, string> = {
      'context7': 'https://mcp.context7.com/mcp',
      'filesystem': 'http://localhost:3000/mcp',
      'github': 'http://localhost:3001/mcp',
      'database': 'http://localhost:3002/mcp',
      'brave-search': 'http://localhost:3003/mcp',
    };

    const url = presets[preset];
    if (!url) {
      throw new Error(`Unknown preset: ${preset}`);
    }

    await this.connectServer(preset, url);
  }

  /**
   * Format MCP tools for AI (similar to tool registry)
   */
  formatForAI(): string {
    const allTools = this.getAllTools();

    if (allTools.size === 0) {
      return '\nNo MCP servers connected.';
    }

    let output = '\n## MCP Tools (External Servers):\n\n';

    for (const [key, { server, tool }] of allTools) {
      output += `### ${server}/${tool.name}\n${tool.description}\n\n`;
    }

    return output;
  }
}

export const mcpClient = new MCPClient();
