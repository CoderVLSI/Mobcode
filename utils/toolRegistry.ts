import { fileManager } from './fileManager';
import { mcpClient } from './mcpClient';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  default?: any;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: any) => Promise<ToolResult>;
  requiresApproval?: boolean;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  data?: any;
}

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async execute(toolName: string, params: any): Promise<ToolResult> {
    // Check if it's an MCP tool (format: server_name/tool_name)
    if (toolName.includes('/')) {
      const [serverName, tool] = toolName.split('/');
      return this.executeMCPTool(serverName, tool, params);
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        output: '',
        error: `Tool "${toolName}" not found`,
      };
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeMCPTool(serverName: string, toolName: string, params: any): Promise<ToolResult> {
    try {
      const result = await mcpClient.executeTool(serverName, toolName, params);

      if (!result.success) {
        return {
          success: false,
          output: '',
          error: result.error,
        };
      }

      return {
        success: true,
        output: JSON.stringify(result.output, null, 2),
        data: result.output,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  // Format tools for AI context (for function calling)
  formatForAI(): string {
    const tools = this.listTools();
    const mcpTools = mcpClient.formatForAI();

    const builtInTools = tools
      .map((tool) => {
        const params = tool.parameters
          .map((p) => {
            const required = p.required ? ' (required)' : ' (optional)';
            return `  - ${p.name}: ${p.type}${required} - ${p.description}`;
          })
          .join('\n');
        return `## ${tool.name}\n${tool.description}\nParameters:\n${params}`;
      })
      .join('\n\n');

    return builtInTools + mcpTools;
  }

  private registerBuiltInTools(): void {
    // File operations
    this.register({
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: [
        { name: 'path', type: 'string', description: 'File path to read', required: true },
      ],
      execute: async (params) => {
        const content = await fileManager.readFile(params.path);
        return { success: true, output: content };
      },
      requiresApproval: false,
    });

    this.register({
      name: 'write_file',
      description: 'Write content to a file (creates or overwrites)',
      parameters: [
        { name: 'path', type: 'string', description: 'File path to write', required: true },
        { name: 'content', type: 'string', description: 'Content to write', required: true },
      ],
      execute: async (params) => {
        await fileManager.writeFile(params.path, params.content);
        return { success: true, output: `File written: ${params.path}` };
      },
      requiresApproval: true,
    });

    this.register({
      name: 'create_file',
      description: 'Create a new empty file',
      parameters: [
        { name: 'path', type: 'string', description: 'File path to create', required: true },
      ],
      execute: async (params) => {
        await fileManager.createFile(params.path);
        return { success: true, output: `File created: ${params.path}` };
      },
      requiresApproval: true,
    });

    this.register({
      name: 'delete_file',
      description: 'Delete a file or folder',
      parameters: [
        { name: 'path', type: 'string', description: 'File/folder path to delete', required: true },
      ],
      execute: async (params) => {
        await fileManager.deleteFile(params.path);
        return { success: true, output: `Deleted: ${params.path}` };
      },
      requiresApproval: true,
    });

    this.register({
      name: 'list_directory',
      description: 'List files and folders in a directory',
      parameters: [
        { name: 'path', type: 'string', description: 'Directory path (default: project root)', required: false },
      ],
      execute: async (params) => {
        const path = params.path || fileManager.getProjectRoot();
        const files = await fileManager.listFiles(path);
        const fileList = files.map(f => `${f.type === 'folder' ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n');
        return { success: true, output: fileList || 'Empty directory', data: files };
      },
      requiresApproval: false,
    });

    this.register({
      name: 'search_files',
      description: 'Search for text across all files',
      parameters: [
        { name: 'query', type: 'string', description: 'Text to search for', required: true },
      ],
      execute: async (params) => {
        // Use the existing file search logic
        const tree = await fileManager.scanProject();
        const results: string[] = [];

        const searchInNode = async (node: any, depth: number = 0): Promise<void> => {
          if (node.type === 'file') {
            try {
              const content = await fileManager.readFile(node.path);
              const lines = content.split('\n');
              lines.forEach((line, index) => {
                if (line.toLowerCase().includes(params.query.toLowerCase())) {
                  results.push(`${node.path}:${index + 1}: ${line.trim()}`);
                }
              });
            } catch (e) {
              // Skip unreadable files
            }
          }
          if (node.children) {
            for (const child of node.children) {
              await searchInNode(child, depth + 1);
            }
          }
        };

        if (tree.children) {
          for (const child of tree.children) {
            await searchInNode(child);
          }
        }

        return {
          success: true,
          output: results.length > 0 ? results.join('\n') : 'No matches found',
          data: { matchCount: results.length, results },
        };
      },
      requiresApproval: false,
    });

    // Terminal commands (emulated)
    this.register({
      name: 'run_command',
      description: 'Execute a terminal command (emulated for common commands)',
      parameters: [
        { name: 'command', type: 'string', description: 'Command to execute (e.g., ls, pwd, mkdir)', required: true },
        { name: 'args', type: 'array', description: 'Command arguments', required: false, default: [] },
      ],
      execute: async (params) => {
        const { command, args = [] } = params;
        const cmdArgs = Array.isArray(args) ? args : [args];

        // Emulated commands
        switch (command) {
          case 'ls':
          case 'dir':
            const files = await fileManager.listFiles();
            const output = files.map(f => `${f.type === 'folder' ? '📁' : '📄'} ${f.name}`).join('\n');
            return { success: true, output };

          case 'pwd':
            return { success: true, output: fileManager.getProjectRoot() };

          case 'mkdir':
            if (cmdArgs.length === 0) {
              return { success: false, output: '', error: 'mkdir requires a directory name' };
            }
            await fileManager.createFolder(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            return { success: true, output: `Directory created: ${cmdArgs[0]}` };

          case 'touch':
            if (cmdArgs.length === 0) {
              return { success: false, output: '', error: 'touch requires a filename' };
            }
            await fileManager.createFile(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            return { success: true, output: `File created: ${cmdArgs[0]}` };

          case 'cat':
            if (cmdArgs.length === 0) {
              return { success: false, output: '', error: 'cat requires a filename' };
            }
            const content = await fileManager.readFile(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            return { success: true, output: content };

          case 'rm':
            if (cmdArgs.length === 0) {
              return { success: false, output: '', error: 'rm requires a filename' };
            }
            await fileManager.deleteFile(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            return { success: true, output: `Deleted: ${cmdArgs[0]}` };

          case 'grep':
            if (cmdArgs.length < 2) {
              return { success: false, output: '', error: 'grep requires pattern and filename' };
            }
            const [pattern, ...grepFiles] = cmdArgs;
            const fileContent = await fileManager.readFile(`${fileManager.getProjectRoot()}/${grepFiles[0]}`);
            const grepLines = fileContent.split('\n');
            const matches = grepLines
              .map((line, i) => (line.toLowerCase().includes(pattern.toLowerCase()) ? `${i + 1}: ${line}` : null))
              .filter(Boolean);
            return { success: true, output: matches.join('\n') || 'No matches' };

          case 'head':
            if (cmdArgs.length === 0) {
              return { success: false, output: '', error: 'head requires a filename' };
            }
            const headContent = await fileManager.readFile(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            const headLines = cmdArgs[1] ? parseInt(cmdArgs[1]) : 10;
            return { success: true, output: headContent.split('\n').slice(0, headLines).join('\n') };

          case 'tail':
            if (cmdArgs.length === 0) {
              return { success: false, output: '', error: 'tail requires a filename' };
            }
            const tailContent = await fileManager.readFile(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            const tailLines = cmdArgs[1] ? parseInt(cmdArgs[1]) : 10;
            return { success: true, output: tailContent.split('\n').slice(-tailLines).join('\n') };

          case 'wc':
            if (cmdArgs.length === 0) {
              return { success: false, output: '', error: 'wc requires a filename' };
            }
            const wcContent = await fileManager.readFile(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            const wcLines = wcContent.split('\n').length;
            const wcWords = wcContent.split(/\s+/).filter(w => w.length > 0).length;
            const wcChars = wcContent.length;
            return { success: true, output: `${wcLines} lines, ${wcWords} words, ${wcChars} characters` };

          case 'cp':
            if (cmdArgs.length < 2) {
              return { success: false, output: '', error: 'cp requires source and destination' };
            }
            const cpContent = await fileManager.readFile(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            await fileManager.writeFile(`${fileManager.getProjectRoot()}/${cmdArgs[1]}`, cpContent);
            return { success: true, output: `Copied ${cmdArgs[0]} to ${cmdArgs[1]}` };

          case 'mv':
            if (cmdArgs.length < 2) {
              return { success: false, output: '', error: 'mv requires source and destination' };
            }
            const mvContent = await fileManager.readFile(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            await fileManager.writeFile(`${fileManager.getProjectRoot()}/${cmdArgs[1]}`, mvContent);
            await fileManager.deleteFile(`${fileManager.getProjectRoot()}/${cmdArgs[0]}`);
            return { success: true, output: `Moved ${cmdArgs[0]} to ${cmdArgs[1]}` };

          default:
            return {
              success: false,
              output: '',
              error: `Command "${command}" not supported. Supported: ls, pwd, mkdir, touch, cat, rm, grep, head, tail, wc, cp, mv`,
            };
        }
      },
      requiresApproval: true,
    });

    // Additional file utilities
    this.register({
      name: 'find_files',
      description: 'Find files by name pattern',
      parameters: [
        { name: 'pattern', type: 'string', description: 'File name pattern (e.g., "*.tsx", "test.*")', required: true },
      ],
      execute: async (params) => {
        const tree = await fileManager.scanProject();
        const matches: string[] = [];

        const searchNode = (node: any) => {
          if (node.name.match(params.pattern)) {
            matches.push(node.path);
          }
          if (node.children) {
            node.children.forEach(searchNode);
          }
        };

        if (tree.children) {
          tree.children.forEach(searchNode);
        }

        return {
          success: true,
          output: matches.length > 0 ? matches.join('\n') : 'No matches found',
          data: { count: matches.length, files: matches },
        };
      },
      requiresApproval: false,
    });

    this.register({
      name: 'append_file',
      description: 'Append content to a file',
      parameters: [
        { name: 'path', type: 'string', description: 'File path', required: true },
        { name: 'content', type: 'string', description: 'Content to append', required: true },
      ],
      execute: async (params) => {
        const existing = await fileManager.readFile(params.path);
        await fileManager.writeFile(params.path, existing + '\n' + params.content);
        return { success: true, output: `Appended to: ${params.path}` };
      },
      requiresApproval: true,
    });

    this.register({
      name: 'file_info',
      description: 'Get file information (size, line count, type)',
      parameters: [
        { name: 'path', type: 'string', description: 'File path', required: true },
      ],
      execute: async (params) => {
        const content = await fileManager.readFile(params.path);
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).filter(w => w.length > 0).length;
        const chars = content.length;
        const ext = params.path.split('.').pop()?.toLowerCase() || 'unknown';

        return {
          success: true,
          output: `File: ${params.path}\nType: ${ext}\nLines: ${lines}\nWords: ${words}\nCharacters: ${chars}\nSize: ${chars} bytes`,
          data: { path: params.path, type: ext, lines, words, chars },
        };
      },
      requiresApproval: false,
    });

    this.register({
      name: 'count_lines',
      description: 'Count total lines in a file or project',
      parameters: [
        { name: 'path', type: 'string', description: 'File path or "all" for entire project', required: false, default: 'all' },
      ],
      execute: async (params) => {
        if (params.path === 'all') {
          const tree = await fileManager.scanProject();
          let totalLines = 0;
          let fileCount = 0;

          const countNode = async (node: any) => {
            if (node.type === 'file') {
              try {
                const content = await fileManager.readFile(node.path);
                totalLines += content.split('\n').length;
                fileCount++;
              } catch (e) {
                // Skip unreadable files
              }
            }
            if (node.children) {
              for (const child of node.children) {
                await countNode(child);
              }
            }
          };

          if (tree.children) {
            for (const child of tree.children) {
              await countNode(child);
            }
          }

          return {
            success: true,
            output: `Project: ${fileCount} files, ${totalLines} total lines`,
            data: { fileCount, totalLines },
          };
        } else {
          const content = await fileManager.readFile(params.path);
          const lines = content.split('\n').length;
          return {
            success: true,
            output: `File: ${params.path}\nLines: ${lines}`,
            data: { path: params.path, lines },
          };
        }
      },
      requiresApproval: false,
    });

    this.register({
      name: 'list_imports',
      description: 'Extract import statements from a file',
      parameters: [
        { name: 'path', type: 'string', description: 'File path', required: true },
      ],
      execute: async (params) => {
        const content = await fileManager.readFile(params.path);
        const imports = content.match(/^import .*$/gm);

        return {
          success: true,
          output: imports ? imports.join('\n') : 'No imports found',
          data: { imports: imports || [], count: imports?.length || 0 },
        };
      },
      requiresApproval: false,
    });

    // Code generation helpers
    this.register({
      name: 'create_component',
      description: 'Create a React/React Native component template',
      parameters: [
        { name: 'name', type: 'string', description: 'Component name (PascalCase)', required: true },
        { name: 'type', type: 'string', description: 'Component type: "react" or "react-native"', required: false, default: 'react-native' },
        { name: 'path', type: 'string', description: 'File path (default: components/Name.tsx)', required: false },
      ],
      execute: async (params) => {
        const { name, type, path } = params;
        const isRN = type === 'react-native';
        const filePath = path || `${fileManager.getProjectRoot()}/components/${name}.tsx`;

        const template = isRN
          ? `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function ${name}() {
  return (
    <View style={styles.container}>
      <Text>${name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
`
          : `import React from 'react';

export function ${name}() {
  return (
    <div className="${name.toLowerCase()}">
      <h1>${name}</h1>
    </div>
  );
}
`;

        await fileManager.writeFile(filePath, template);
        return {
          success: true,
          output: `Created ${type} component: ${filePath}`,
          data: { path: filePath, template },
        };
      },
      requiresApproval: true,
    });

    // Package management (npm registry API)
    this.register({
      name: 'npm_info',
      description: 'Get package information from npm registry',
      parameters: [
        { name: 'package', type: 'string', description: 'Package name', required: true },
      ],
      execute: async (params) => {
        try {
          const response = await fetch(`https://registry.npmjs.org/${params.package}`);
          const data = await response.json();

          const latest = data['dist-tags']?.latest || {};
          const info = {
            name: data.name,
            version: latest.version || 'unknown',
            description: latest.description || 'No description',
            license: latest.license || 'unknown',
            homepage: latest.homepage || '',
          };

          return {
            success: true,
            output: `📦 ${info.name}\nVersion: ${info.version}\n${info.description}\nLicense: ${info.license}`,
            data: info,
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: `Package "${params.package}" not found`,
          };
        }
      },
      requiresApproval: false,
    });

    this.register({
      name: 'update_package_json',
      description: 'Add a dependency to package.json',
      parameters: [
        { name: 'package', type: 'string', description: 'Package name', required: true },
        { name: 'version', type: 'string', description: 'Version (default: latest)', required: false },
        { name: 'type', type: 'string', description: '"dependencies" or "devDependencies"', required: false, default: 'dependencies' },
      ],
      execute: async (params) => {
        try {
          const packageJsonPath = `${fileManager.getProjectRoot()}/package.json`;
          const packageJson = JSON.parse(await fileManager.readFile(packageJsonPath));

          const depType = params.type === 'devDependencies' ? 'devDependencies' : 'dependencies';
          packageJson[depType] = packageJson[depType] || {};

          if (params.version) {
            packageJson[depType][params.package] = params.version;
          } else {
            packageJson[depType][params.package] = 'latest';
          }

          await fileManager.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

          return {
            success: true,
            output: `Added ${params.package} to ${depType} in package.json`,
            data: { package: params.package, type: depType },
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: 'package.json not found or invalid',
          };
        }
      },
      requiresApproval: true,
    });

    this.register({
      name: 'init_project',
      description: 'Initialize a React Native project structure',
      parameters: [
        { name: 'name', type: 'string', description: 'Project name', required: true },
      ],
      execute: async (params) => {
        const folders = ['components', 'utils', 'constants', 'hooks', 'services', 'types'];
        const created: string[] = [];

        for (const folder of folders) {
          try {
            await fileManager.createFolder(`${fileManager.getProjectRoot()}/${folder}`);
            created.push(folder);
          } catch (e) {
            // Folder might exist
          }
        }

        return {
          success: true,
          output: `Initialized project structure:\n${created.map(f => `📁 ${f}/`).join('\n')}`,
          data: { folders: created },
        };
      },
      requiresApproval: true,
    });
  }
}

export const toolRegistry = new ToolRegistry();
