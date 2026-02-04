import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { gitFs } from './gitFs';
import { fileManager } from './fileManager';
import { storage, GitSettings } from './storage';

export interface GitStatusSummary {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  files: string[];
}

const getDir = () => fileManager.getProjectRoot();

const getAuth = async (params: { username?: string; token?: string } = {}) => {
  const settings = await storage.getGitSettings();
  const username = params.username ?? settings.username ?? '';
  const token = params.token ?? settings.token ?? '';

  if (!username && !token) {
    return null;
  }

  return {
    username: username || 'x-access-token',
    password: token || '',
  };
};

const getAuthor = async (params: { authorName?: string; authorEmail?: string } = {}) => {
  const settings = await storage.getGitSettings();
  const name = params.authorName || settings.authorName || 'Mobcode User';
  const email = params.authorEmail || settings.authorEmail || 'user@example.com';
  return { name, email };
};

const ensureRepoExists = async () => {
  const gitDir = `${getDir()}/.git`;
  const exists = await fileManager.fileExists(gitDir);
  if (!exists) {
    const error: any = new Error('Not a git repository. Initialize or clone first.');
    error.code = 'NO_REPO';
    throw error;
  }
};

const describeStaged = (head: number, stage: number, file: string) => {
  if (head === 0 && stage === 2) return `added: ${file}`;
  if (head === 1 && stage === 2) return `modified: ${file}`;
  if (head === 1 && stage === 0) return `deleted: ${file}`;
  return `modified: ${file}`;
};

const describeWorkdir = (head: number, workdir: number, file: string) => {
  if (workdir === 0) return `deleted: ${file}`;
  if (head === 0) return `untracked: ${file}`;
  return `modified: ${file}`;
};

export const gitService = {
  async init() {
    const dir = getDir();
    await git.init({ fs: gitFs, dir, defaultBranch: 'main' });
    return { dir };
  },

  async status(): Promise<GitStatusSummary> {
    await ensureRepoExists();
    const dir = getDir();

    let branch = 'main';
    try {
      const current = await git.currentBranch({ fs: gitFs, dir, fullname: false });
      if (current) branch = current;
    } catch {
      // ignore if no commits yet
    }

    const matrix = await git.statusMatrix({ fs: gitFs, dir });
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];
    const files: string[] = [];

    for (const row of matrix) {
      const [filepath, head, workdir, stage] = row as [string, number, number, number];
      if (head === 1 && workdir === 1 && stage === 1) {
        continue;
      }

      files.push(filepath);

      const isUntracked = head === 0 && stage === 0 && workdir === 2;
      if (isUntracked) {
        untracked.push(filepath);
        continue;
      }

      if (stage !== head) {
        staged.push(describeStaged(head, stage, filepath));
      }

      if (workdir !== stage) {
        unstaged.push(describeWorkdir(head, workdir, filepath));
      }
    }

    return { branch, staged, unstaged, untracked, files };
  },

  async add(files: string[]) {
    await ensureRepoExists();
    const dir = getDir();
    const matrix = await git.statusMatrix({ fs: gitFs, dir });
    const matrixMap = new Map(matrix.map((row) => [row[0] as string, row]));

    const targets = files.length === 1 && files[0] === '.'
      ? Array.from(matrixMap.keys())
      : files;

    const toRelative = (filepath: string) => {
      const normalizedDir = dir.endsWith('/') ? dir : `${dir}/`;
      return filepath.startsWith(normalizedDir) ? filepath.slice(normalizedDir.length) : filepath;
    };

    for (const originalPath of targets) {
      const filepath = toRelative(originalPath);
      const row = matrixMap.get(filepath);
      if (!row) continue;
      const [, head, workdir] = row as [string, number, number, number];
      if (workdir === 0 && head !== 0) {
        await git.remove({ fs: gitFs, dir, filepath });
      } else {
        await git.add({ fs: gitFs, dir, filepath });
      }
    }
  },

  async commit(message: string, params: { authorName?: string; authorEmail?: string } = {}) {
    await ensureRepoExists();
    const dir = getDir();
    const author = await getAuthor(params);
    const oid = await git.commit({ fs: gitFs, dir, message, author });
    return { oid };
  },

  async log(limit: number = 10) {
    await ensureRepoExists();
    const dir = getDir();
    const commits = await git.log({ fs: gitFs, dir, depth: limit });
    return commits;
  },

  async setRemote(name: string, url: string) {
    await ensureRepoExists();
    const dir = getDir();
    const remotes = await git.listRemotes({ fs: gitFs, dir });
    const existing = remotes.find((r) => r.remote === name);
    if (existing) {
      await git.deleteRemote({ fs: gitFs, dir, remote: name });
    }
    await git.addRemote({ fs: gitFs, dir, remote: name, url });
  },

  async clone(url: string, params: { username?: string; token?: string; depth?: number } = {}) {
    const dir = getDir();
    const existing = await fileManager.listFiles(dir);
    if (existing.length > 0) {
      const error: any = new Error('Project directory is not empty. Clear it before cloning.');
      error.code = 'DIR_NOT_EMPTY';
      throw error;
    }
    const auth = await getAuth(params);
    await git.clone({
      fs: gitFs,
      http,
      dir,
      url,
      singleBranch: true,
      depth: params.depth,
      ...(auth ? { onAuth: () => auth } : {}),
    });
  },

  async pull(params: { remote?: string; ref?: string; username?: string; token?: string; authorName?: string; authorEmail?: string } = {}) {
    await ensureRepoExists();
    const dir = getDir();
    const auth = await getAuth(params);
    const author = await getAuthor(params);
    await git.pull({
      fs: gitFs,
      http,
      dir,
      remote: params.remote || 'origin',
      ref: params.ref,
      singleBranch: true,
      author,
      ...(auth ? { onAuth: () => auth } : {}),
    });
  },

  async push(params: { remote?: string; ref?: string; username?: string; token?: string } = {}) {
    await ensureRepoExists();
    const dir = getDir();
    const auth = await getAuth(params);
    await git.push({
      fs: gitFs,
      http,
      dir,
      remote: params.remote || 'origin',
      ref: params.ref,
      ...(auth ? { onAuth: () => auth } : {}),
    });
  },

  async getSettings(): Promise<GitSettings> {
    return storage.getGitSettings();
  },

  /**
   * Create a checkpoint by committing all current changes
   * Returns the commit hash (oid) or null if no changes/no repo
   */
  async createCheckpoint(message: string): Promise<string | null> {
    try {
      const dir = getDir();
      const gitDir = `${dir}/.git`;
      const exists = await fileManager.fileExists(gitDir);
      if (!exists) return null;

      // Check if there are any changes to commit
      const matrix = await git.statusMatrix({ fs: gitFs, dir });
      const hasChanges = matrix.some((row) => {
        const [, head, workdir, stage] = row as [string, number, number, number];
        return !(head === 1 && workdir === 1 && stage === 1);
      });

      if (!hasChanges) return null;

      // Stage all changes
      for (const row of matrix) {
        const [filepath, head, workdir] = row as [string, number, number, number];
        if (head === 1 && workdir === 1) continue; // unchanged
        if (workdir === 0 && head !== 0) {
          await git.remove({ fs: gitFs, dir, filepath });
        } else {
          await git.add({ fs: gitFs, dir, filepath });
        }
      }

      // Commit
      const author = await getAuthor({});
      const oid = await git.commit({ fs: gitFs, dir, message, author });
      console.log(`[GitCheckpoint] Created checkpoint: ${oid.slice(0, 7)}`);
      return oid;
    } catch (error) {
      console.error('[GitCheckpoint] Failed to create checkpoint:', error);
      return null;
    }
  },

  /**
   * Reset to a specific checkpoint (commit hash)
   * Uses hard reset to restore all files to that state
   */
  async resetToCheckpoint(commitHash: string): Promise<boolean> {
    try {
      const dir = getDir();
      await ensureRepoExists();

      // Checkout the commit (detach HEAD)
      await git.checkout({
        fs: gitFs,
        dir,
        ref: commitHash,
        force: true,
      });

      console.log(`[GitCheckpoint] Reset to checkpoint: ${commitHash.slice(0, 7)}`);
      return true;
    } catch (error) {
      console.error('[GitCheckpoint] Failed to reset:', error);
      return false;
    }
  },
};
