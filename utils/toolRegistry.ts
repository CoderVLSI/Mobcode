import { fileManager } from './fileManager';
import { mcpClient } from './mcpClient';
import { gitService } from './gitService';
import { previewBus } from './previewBus';
import { SAMPLE_PROJECTS } from '../data/sampleProjects';

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
    const resolvePath = (inputPath?: string): string => {
      const root = fileManager.getProjectRoot();
      const normalizedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
      if (!inputPath) return normalizedRoot || root;
      if (inputPath.startsWith('file://')) return inputPath;
      if (normalizedRoot && inputPath.startsWith(normalizedRoot)) return inputPath;
      const clean = inputPath.startsWith('/') ? inputPath.slice(1) : inputPath;
      return normalizedRoot ? `${normalizedRoot}/${clean}` : clean;
    };

    // File operations
    this.register({
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: [
        { name: 'path', type: 'string', description: 'File path to read', required: true },
      ],
      execute: async (params) => {
        const content = await fileManager.readFile(resolvePath(params.path));
        return { success: true, output: content };
      },
      requiresApproval: false,
    });

    this.register({
      name: 'open_html_preview',
      description: 'Open the in-app HTML preview for a local HTML file',
      parameters: [
        { name: 'path', type: 'string', description: 'Path to the HTML file (relative to project root or absolute file://)', required: true },
        { name: 'name', type: 'string', description: 'Optional display name for the preview', required: false },
      ],
      execute: async (params) => {
        const resolvedPath = resolvePath(params.path);
        const exists = await fileManager.fileExists(resolvedPath);
        if (!exists) {
          return { success: false, output: '', error: `File not found: ${resolvedPath}` };
        }
        previewBus.emit({ type: 'html', path: resolvedPath, name: params.name });
        return { success: true, output: `Opened HTML preview: ${resolvedPath}` };
      },
      requiresApproval: false,
    });

    this.register({
      name: 'open_react_preview',
      description: 'Open the in-app React preview for a local React file (.jsx/.tsx)',
      parameters: [
        { name: 'path', type: 'string', description: 'Path to the React file (relative to project root or absolute file://)', required: true },
        { name: 'name', type: 'string', description: 'Optional display name for the preview', required: false },
      ],
      execute: async (params) => {
        const resolvedPath = resolvePath(params.path);
        const exists = await fileManager.fileExists(resolvedPath);
        if (!exists) {
          return { success: false, output: '', error: `File not found: ${resolvedPath}` };
        }
        previewBus.emit({ type: 'react', path: resolvedPath, name: params.name });
        return { success: true, output: `Opened React preview: ${resolvedPath}` };
      },
      requiresApproval: false,
    });

    this.register({
      name: 'list_preview_components',
      description: 'List available sample component previews (id and name)',
      parameters: [],
      execute: async () => {
        const list = SAMPLE_PROJECTS.map((project) => `${project.id} - ${project.name}`);
        return {
          success: true,
          output: list.join('\n') || 'No preview components available',
          data: SAMPLE_PROJECTS.map((project) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            category: project.category,
          })),
        };
      },
      requiresApproval: false,
    });

    this.register({
      name: 'open_component_preview',
      description: 'Open the in-app sample component preview by id',
      parameters: [
        { name: 'componentId', type: 'string', description: 'Sample component id from list_preview_components', required: true },
      ],
      execute: async (params) => {
        const match = SAMPLE_PROJECTS.find((project) => project.id === params.componentId);
        if (!match) {
          const available = SAMPLE_PROJECTS.map((project) => project.id).join(', ');
          return {
            success: false,
            output: '',
            error: available ? `Unknown componentId. Available: ${available}` : 'No preview components available',
          };
        }
        previewBus.emit({ type: 'component', componentId: match.id });
        return { success: true, output: `Opened component preview: ${match.name}` };
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
        const resolvedPath = resolvePath(params.path);
        await fileManager.writeFile(resolvedPath, params.content);
        return { success: true, output: `File written: ${resolvedPath}` };
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
        const resolvedPath = resolvePath(params.path);
        await fileManager.createFile(resolvedPath);
        return { success: true, output: `File created: ${resolvedPath}` };
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
        const resolvedPath = resolvePath(params.path);
        await fileManager.deleteFile(resolvedPath);
        return { success: true, output: `Deleted: ${resolvedPath}` };
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
        const path = resolvePath(params.path);
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
        const resolvedPath = resolvePath(params.path);
        const existing = await fileManager.readFile(resolvedPath);
        await fileManager.writeFile(resolvedPath, existing + '\n' + params.content);
        return { success: true, output: `Appended to: ${resolvedPath}` };
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
        const resolvedPath = resolvePath(params.path);
        const content = await fileManager.readFile(resolvedPath);
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).filter(w => w.length > 0).length;
        const chars = content.length;
        const ext = resolvedPath.split('.').pop()?.toLowerCase() || 'unknown';

        return {
          success: true,
          output: `File: ${resolvedPath}\nType: ${ext}\nLines: ${lines}\nWords: ${words}\nCharacters: ${chars}\nSize: ${chars} bytes`,
          data: { path: resolvedPath, type: ext, lines, words, chars },
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
          const resolvedPath = resolvePath(params.path);
          const content = await fileManager.readFile(resolvedPath);
          const lines = content.split('\n').length;
          return {
            success: true,
            output: `File: ${resolvedPath}\nLines: ${lines}`,
            data: { path: resolvedPath, lines },
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
        const content = await fileManager.readFile(resolvePath(params.path));
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
        const filePath = resolvePath(path || `${fileManager.getProjectRoot()}/components/${name}.tsx`);

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

    // Package installation (fetches from npm registry and adds to package.json)
    this.register({
      name: 'npm_install',
      description: 'Install a package (fetches latest version and updates package.json)',
      parameters: [
        { name: 'package', type: 'string', description: 'Package name (e.g., "lodash" or "@types/react")', required: true },
        { name: 'version', type: 'string', description: 'Specific version (default: latest)', required: false },
        { name: 'type', type: 'string', description: '"dependencies" or "devDependencies"', required: false, default: 'dependencies' },
      ],
      execute: async (params) => {
        try {
          // First, get package info from npm registry
          const response = await fetch(`https://registry.npmjs.org/${params.package}`);
          if (!response.ok) {
            return {
              success: false,
              output: '',
              error: `Package "${params.package}" not found on npm registry`,
            };
          }
          const data = await response.json();
          const version = params.version || data['dist-tags']?.latest || 'latest';

          // Update package.json
          const packageJsonPath = `${fileManager.getProjectRoot()}/package.json`;
          const packageJson = JSON.parse(await fileManager.readFile(packageJsonPath));

          const depType = params.type === 'devDependencies' ? 'devDependencies' : 'dependencies';
          packageJson[depType] = packageJson[depType] || {};
          packageJson[depType][params.package] = version;

          await fileManager.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

          // Get latest version info for display
          const latestInfo = data.versions?.[version] || {};
          const description = latestInfo.description || data.description || 'No description';

          return {
            success: true,
            output: `✅ Installed ${params.package}@${version}\n\n${description}\n\n⚠️ Note: package.json updated. Run "npm install" in your local environment to install dependencies.`,
            data: {
              package: params.package,
              version,
              type: depType,
              description,
            },
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      requiresApproval: true,
    });

    // Git operations (real git via isomorphic-git)
    this.register({
      name: 'git_init',
      description: 'Initialize a git repository in the project root',
      parameters: [],
      execute: async () => {
        try {
          await gitService.init();
          return { success: true, output: 'Initialized git repository (main)' };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      requiresApproval: true,
    });

    this.register({
      name: 'git_status',
      description: 'Show working tree status (real git)',
      parameters: [],
      execute: async () => {
        try {
          const summary = await gitService.status();
          const sections: string[] = [];

          if (summary.staged.length > 0) {
            sections.push(
              `Changes to be committed:\n${summary.staged.map((l) => `  ${l}`).join('\n')}`
            );
          }

          if (summary.unstaged.length > 0) {
            sections.push(
              `Changes not staged for commit:\n${summary.unstaged.map((l) => `  ${l}`).join('\n')}`
            );
          }

          if (summary.untracked.length > 0) {
            sections.push(
              `Untracked files:\n${summary.untracked.map((l) => `  ${l}`).join('\n')}`
            );
          }

          if (sections.length === 0) {
            sections.push('Nothing to commit, working tree clean');
          }

          return {
            success: true,
            output: `On branch ${summary.branch}\n\n${sections.join('\n\n')}`,
            data: summary,
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      requiresApproval: false,
    });

    this.register({
      name: 'git_add',
      description: 'Add files to staging area',
      parameters: [
        { name: 'files', type: 'array', description: 'File paths to add (or ["."] for all)', required: true },
      ],
      execute: async (params) => {
        try {
          const files = Array.isArray(params.files) ? params.files : [params.files];
          await gitService.add(files);
          const fileCount = files.length === 1 && files[0] === '.' ? 'all' : files.length;
          return {
            success: true,
            output: `Staged ${fileCount === 'all' ? 'all files' : fileCount + ' file(s)'}`,
            data: { files, count: fileCount },
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      requiresApproval: false,
    });

    this.register({
      name: 'git_commit',
      description: 'Create a commit with staged changes',
      parameters: [
        { name: 'message', type: 'string', description: 'Commit message', required: true },
        { name: 'authorName', type: 'string', description: 'Author name', required: false },
        { name: 'authorEmail', type: 'string', description: 'Author email', required: false },
      ],
      execute: async (params) => {
        try {
          const result = await gitService.commit(params.message, {
            authorName: params.authorName,
            authorEmail: params.authorEmail,
          });
          return {
            success: true,
            output: `[${result.oid.slice(0, 7)}] ${params.message}`,
            data: result,
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      requiresApproval: true,
    });

    this.register({
      name: 'git_log',
      description: 'Show commit history',
      parameters: [
        { name: 'limit', type: 'number', description: 'Number of commits to show (default: 10)', required: false },
      ],
      execute: async (params) => {
        try {
          const commits = await gitService.log(params.limit || 10);
          const log = commits.map((c: any) =>
            `[${c.oid.slice(0, 7)}] ${new Date(c.commit.author.timestamp * 1000).toLocaleDateString()} - ${c.commit.message}`
          ).join('\n');
          return {
            success: true,
            output: log || 'No commits yet',
            data: { commits },
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      requiresApproval: false,
    });

    this.register({
      name: 'git_set_remote',
      description: 'Set or update a git remote',
      parameters: [
        { name: 'name', type: 'string', description: 'Remote name (default: origin)', required: false },
        { name: 'url', type: 'string', description: 'Remote URL', required: true },
      ],
      execute: async (params) => {
        try {
          await gitService.setRemote(params.name || 'origin', params.url);
          return {
            success: true,
            output: `Remote "${params.name || 'origin'}" set to ${params.url}`,
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      requiresApproval: true,
    });

    this.register({
      name: 'git_clone',
      description: 'Clone a remote repository into the project root',
      parameters: [
        { name: 'url', type: 'string', description: 'Repository URL', required: true },
        { name: 'username', type: 'string', description: 'Username for auth', required: false },
        { name: 'token', type: 'string', description: 'Access token or password', required: false },
        { name: 'depth', type: 'number', description: 'Shallow clone depth', required: false },
      ],
      execute: async (params) => {
        try {
          await gitService.clone(params.url, {
            username: params.username,
            token: params.token,
            depth: params.depth,
          });
          return {
            success: true,
            output: `Cloned ${params.url}`,
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      requiresApproval: true,
    });

    this.register({
      name: 'git_pull',
      description: 'Pull from remote repository',
      parameters: [
        { name: 'remote', type: 'string', description: 'Remote name (default: origin)', required: false },
        { name: 'ref', type: 'string', description: 'Branch name (default: current)', required: false },
        { name: 'username', type: 'string', description: 'Username for auth', required: false },
        { name: 'token', type: 'string', description: 'Access token or password', required: false },
        { name: 'authorName', type: 'string', description: 'Merge author name', required: false },
        { name: 'authorEmail', type: 'string', description: 'Merge author email', required: false },
      ],
      execute: async (params) => {
        try {
          await gitService.pull({
            remote: params.remote,
            ref: params.ref,
            username: params.username,
            token: params.token,
            authorName: params.authorName,
            authorEmail: params.authorEmail,
          });
          return {
            success: true,
            output: `Pulled from ${params.remote || 'origin'}`,
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      requiresApproval: true,
    });

    this.register({
      name: 'git_push',
      description: 'Push to remote repository',
      parameters: [
        { name: 'remote', type: 'string', description: 'Remote name (default: origin)', required: false },
        { name: 'ref', type: 'string', description: 'Branch name (default: current)', required: false },
        { name: 'username', type: 'string', description: 'Username for auth', required: false },
        { name: 'token', type: 'string', description: 'Access token or password', required: false },
      ],
      execute: async (params) => {
        try {
          await gitService.push({
            remote: params.remote,
            ref: params.ref,
            username: params.username,
            token: params.token,
          });
          return {
            success: true,
            output: `Pushed to ${params.remote || 'origin'}`,
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error),
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
