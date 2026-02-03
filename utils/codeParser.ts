export interface ParsedFile {
  filename: string;
  content: string;
  language: string;
}

class CodeParser {
  // Extract files from AI response
  parseFilesFromResponse(response: string): ParsedFile[] {
    const files: ParsedFile[] = [];

    // Pattern 1: Markdown code blocks with language tags
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'text';
      const content = match[2].trim();

      // Try to extract filename from context before the code block
      const beforeBlock = response.substring(0, match.index);
      const filenameMatch = beforeBlock.match(/(?:file|create|write|save)[:\s]+[`'"]?([^\s`'"\n]{5,50})[`'"]?\s*$/im);

      const filename = filenameMatch?.[1] || this.generateFilename(language, blockIndex);

      files.push({
        filename,
        content,
        language,
      });

      blockIndex++;
    }

    // Pattern 2: Explicit "File: filename.js" format
    const filePattern = /(?:file|filename)[:\s]+([^\n]+)\n([\s\S]*?)(?=\n(?:file|filename)|$)/gi;
    while ((match = filePattern.exec(response)) !== null) {
      const filename = match[1].trim().replace(/[`'"]/g, '');
      const content = match[2].trim();
      const language = this.getLanguageFromFilename(filename);

      // Avoid duplicates
      if (!files.find(f => f.filename === filename)) {
        files.push({ filename, content, language });
      }
    }

    return files;
  }

  // Generate a filename if none was provided
  private generateFilename(language: string, index: number): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      tsx: 'tsx',
      jsx: 'jsx',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'md',
      text: 'txt',
    };

    const ext = extensions[language] || 'txt';
    return `code_${index + 1}.${ext}`;
  }

  // Get language from filename extension
  private getLanguageFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
    };
    return languageMap[ext] || 'text';
  }

  // Parse file path to determine full path
  parseFilePath(filename: string, basePath: string): string {
    // Remove any path prefixes like ./ or src/
    const cleanFilename = filename.replace(/^\.\/|^src\//, '');

    // If it doesn't start with a directory, assume it goes in src/
    if (!cleanFilename.includes('/')) {
      return `${basePath}src/${cleanFilename}`;
    }

    return `${basePath}${cleanFilename}`;
  }
}

export const codeParser = new CodeParser();
