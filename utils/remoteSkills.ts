import { storage } from './storage';

// GitHub repository configuration
const GITHUB_OWNER = 'CoderVLSI';
const GITHUB_REPO = 'Mobcode';
const GITHUB_BRANCH = 'main';
const SKILLS_PATH = '.skills';

// GitHub API endpoints
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

export interface GitHubFileInfo {
  name: string;
  path: string;
  download_url: string;
  type: 'file' | 'dir';
}

export interface SyncResult {
  success: boolean;
  count: number;
  error?: string;
  skills?: string[];
}

/**
 * Fetch the list of skill files from GitHub repository
 */
async function getSkillsListFromGitHub(): Promise<GitHubFileInfo[]> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${SKILLS_PATH}?ref=${GITHUB_BRANCH}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Mobcode-App',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const files: GitHubFileInfo[] = await response.json();
  
  // Filter only markdown files
  return files.filter(file => file.type === 'file' && file.name.endsWith('.md'));
}

/**
 * Fetch the raw content of a skill file from GitHub
 */
async function fetchSkillContent(filename: string): Promise<string> {
  const url = `${GITHUB_RAW_BASE}/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${SKILLS_PATH}/${filename}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mobcode-App',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch skill ${filename}: ${response.status}`);
  }

  return response.text();
}

/**
 * Sync all skills from GitHub repository
 * Returns the fetched skills as a Record<id, content>
 */
export async function syncRemoteSkills(): Promise<SyncResult> {
  try {
    console.log('[RemoteSkills] Starting sync from GitHub...');
    
    // Get list of skill files
    const files = await getSkillsListFromGitHub();
    console.log(`[RemoteSkills] Found ${files.length} skill files on GitHub`);

    if (files.length === 0) {
      return {
        success: true,
        count: 0,
        skills: [],
      };
    }

    // Fetch content for each skill
    const skills: Record<string, string> = {};
    const skillNames: string[] = [];

    for (const file of files) {
      try {
        const content = await fetchSkillContent(file.name);
        const skillId = file.name.replace('.md', '');
        skills[skillId] = content;
        skillNames.push(skillId);
        console.log(`[RemoteSkills] Fetched: ${skillId}`);
      } catch (error) {
        console.warn(`[RemoteSkills] Failed to fetch ${file.name}:`, error);
      }
    }

    // Save to cache
    await storage.setRemoteSkills(skills);
    await storage.setRemoteSkillsSyncTime(Date.now());

    console.log(`[RemoteSkills] Sync complete. Cached ${Object.keys(skills).length} skills`);

    return {
      success: true,
      count: Object.keys(skills).length,
      skills: skillNames,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RemoteSkills] Sync failed:', errorMessage);
    
    return {
      success: false,
      count: 0,
      error: errorMessage,
    };
  }
}

/**
 * Get cached remote skills from AsyncStorage
 */
export async function getCachedRemoteSkills(): Promise<Record<string, string>> {
  return storage.getRemoteSkills();
}

/**
 * Get the last sync timestamp
 */
export async function getLastSyncTime(): Promise<number> {
  return storage.getRemoteSkillsSyncTime();
}

/**
 * Check if we have cached remote skills
 */
export async function hasRemoteSkillsCache(): Promise<boolean> {
  const skills = await getCachedRemoteSkills();
  return Object.keys(skills).length > 0;
}

/**
 * Get count of cached remote skills
 */
export async function getRemoteSkillsCount(): Promise<number> {
  const skills = await getCachedRemoteSkills();
  return Object.keys(skills).length;
}

/**
 * Clear the remote skills cache
 */
export async function clearRemoteSkillsCache(): Promise<void> {
  await storage.setRemoteSkills({});
  await storage.setRemoteSkillsSyncTime(0);
  console.log('[RemoteSkills] Cache cleared');
}
