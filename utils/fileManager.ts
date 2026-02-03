import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  children?: FileNode[];
}

class FileManager {
  private baseDir = FileSystem.documentDirectory;

  async listFiles(path: string = this.baseDir): Promise<FileNode[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(path);
      const nodes: FileNode[] = [];

      for (const file of files) {
        const filePath = `${path}/${file}`;
        const info = await FileSystem.getInfoAsync(filePath);

        if (info.isDirectory && !file.startsWith('.')) {
          const children = await this.listFiles(filePath);
          nodes.push({
            id: filePath,
            name: file,
            type: 'folder',
            path: filePath,
            children,
          });
        } else if (info.exists && !file.startsWith('.')) {
          nodes.push({
            id: filePath,
            name: file,
            type: 'file',
            path: filePath,
            size: info.size,
          });
        }
      }

      return nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  async readFile(path: string): Promise<string> {
    try {
      return await FileSystem.readAsStringAsync(path);
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir !== this.baseDir) {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
      }

      await FileSystem.writeAsStringAsync(path, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  async createFile(path: string): Promise<void> {
    try {
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir !== this.baseDir) {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
      }
      await FileSystem.writeAsStringAsync(path, '', {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }

  async createFolder(path: string): Promise<void> {
    try {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.isDirectory) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      } else {
        await FileSystem.deleteAsync(path);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  }

  async shareFile(path: string): Promise<void> {
    try {
      await Sharing.shareAsync(path);
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }

  getProjectRoot(): string {
    return this.baseDir;
  }

  async scanProject(): Promise<FileNode> {
    const files = await this.listFiles();
    return {
      id: 'root',
      name: 'Project Files',
      type: 'folder',
      path: this.baseDir,
      children: files,
    };
  }
}

export const fileManager = new FileManager();
