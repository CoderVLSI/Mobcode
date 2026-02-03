import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

type StatLike = {
  size: number;
  mtime: Date;
  ctime: Date;
  isFile: () => boolean;
  isDirectory: () => boolean;
};

const normalizePath = (path: string) => {
  if (path.startsWith('file:/') && !path.startsWith('file:///')) {
    return path.replace('file:/', 'file:///');
  }
  return path;
};

const ensureDir = async (path: string) => {
  const dir = path.substring(0, path.lastIndexOf('/'));
  if (!dir) return;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
};

const toStat = (info: FileSystem.FileInfo): StatLike => {
  const mtime = info.modificationTime
    ? new Date(info.modificationTime * 1000)
    : new Date(0);
  return {
    size: info.size ?? 0,
    mtime,
    ctime: mtime,
    isFile: () => !!info.exists && !info.isDirectory,
    isDirectory: () => !!info.exists && !!info.isDirectory,
  };
};

const readFile = async (path: string, options?: any) => {
  const filePath = normalizePath(path);
  const encoding = typeof options === 'string' ? options : options?.encoding;

  if (encoding === 'utf8' || encoding === 'utf-8') {
    return FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.UTF8 });
  }

  const data = await FileSystem.readAsStringAsync(filePath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return Buffer.from(data, 'base64');
};

const writeFile = async (path: string, data: any, options?: any) => {
  const filePath = normalizePath(path);
  await ensureDir(filePath);

  const encoding = typeof options === 'string' ? options : options?.encoding;
  if (encoding === 'utf8' || encoding === 'utf-8' || typeof data === 'string') {
    await FileSystem.writeAsStringAsync(filePath, String(data), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return;
  }

  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  await FileSystem.writeAsStringAsync(filePath, buffer.toString('base64'), {
    encoding: FileSystem.EncodingType.Base64,
  });
};

const readdir = async (path: string) => {
  const dirPath = normalizePath(path);
  return FileSystem.readDirectoryAsync(dirPath);
};

const mkdir = async (path: string, options?: any) => {
  const dirPath = normalizePath(path);
  const recursive = options?.recursive ?? false;
  await FileSystem.makeDirectoryAsync(dirPath, { intermediates: recursive });
};

const stat = async (path: string) => {
  const filePath = normalizePath(path);
  const info = await FileSystem.getInfoAsync(filePath);
  if (!info.exists) {
    const error: any = new Error(`ENOENT: no such file or directory, stat '${path}'`);
    error.code = 'ENOENT';
    throw error;
  }
  return toStat(info);
};

const lstat = stat;

const unlink = async (path: string) => {
  const filePath = normalizePath(path);
  await FileSystem.deleteAsync(filePath, { idempotent: true });
};

const rmdir = async (path: string) => {
  const dirPath = normalizePath(path);
  await FileSystem.deleteAsync(dirPath, { idempotent: true });
};

const readlink = async () => {
  const error: any = new Error('Symlinks are not supported in this environment.');
  error.code = 'ENOSYS';
  throw error;
};

const symlink = async () => {
  const error: any = new Error('Symlinks are not supported in this environment.');
  error.code = 'ENOSYS';
  throw error;
};

const fsImpl = {
  readFile,
  writeFile,
  readdir,
  mkdir,
  stat,
  lstat,
  unlink,
  rmdir,
  readlink,
  symlink,
};

export const gitFs = {
  ...fsImpl,
  promises: fsImpl,
};
