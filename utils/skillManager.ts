import { loadAllSkills, findRelevantSkills, formatSkillsForAI, getSkillById, searchSkills, Skill } from './skillLoader';
import { syncRemoteSkills, getLastSyncTime as getRemoteSyncTime, getRemoteSkillsCount, SyncResult } from './remoteSkills';

// Re-export Skill type for convenience
export type { Skill };

class SkillManager {
  private skillsCache: Skill[] | null = null;
  private lastCacheTime: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all skills (with caching)
   */
  async getAllSkills(forceRefresh = false): Promise<Skill[]> {
    const now = Date.now();

    if (!forceRefresh && this.skillsCache && (now - this.lastCacheTime) < this.CACHE_DURATION) {
      return this.skillsCache;
    }

    this.skillsCache = await loadAllSkills();
    this.lastCacheTime = now;
    return this.skillsCache;
  }

  /**
   * Find and format relevant skills for AI
   */
  async getRelevantSkillsForAI(userRequest: string, maxResults = 3): Promise<string> {
    const skills = await this.getAllSkills();
    const matches = findRelevantSkills(skills, userRequest, maxResults);
    return formatSkillsForAI(matches);
  }

  /**
   * Get a simple list of all available skills for AI to describe its capabilities
   */
  async getSkillListForAI(): Promise<string> {
    const skills = await this.getAllSkills();
    if (!skills.length) return '';

    const lines = skills.map(skill => {
      return `- **${skill.name}**: ${skill.overview || skill.whenToUse || ''}`;
    });

    return lines.join('\n');
  }

  /**
   * Get skill by ID
   */
  async getSkill(id: string): Promise<Skill | null> {
    return getSkillById(id);
  }

  /**
   * Search skills
   */
  async search(query: string): Promise<Skill[]> {
    return searchSkills(query);
  }

  /**
   * Get skill categories (based on filename prefixes)
   */
  async getCategories(): Promise<string[]> {
    const skills = await this.getAllSkills();
    const categories = new Set<string>();

    skills.forEach(skill => {
      const parts = skill.id.split('-');
      if (parts.length > 1) {
        categories.add(parts[0]);
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * Get skills by category
   */
  async getByCategory(category: string): Promise<Skill[]> {
    const skills = await this.getAllSkills();
    return skills.filter(skill => skill.id.startsWith(category));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.skillsCache = null;
    this.lastCacheTime = 0;
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { cached: boolean; age: number; count: number } {
    const age = this.lastCacheTime ? Date.now() - this.lastCacheTime : 0;
    return {
      cached: !!this.skillsCache,
      age,
      count: this.skillsCache?.length || 0,
    };
  }

  /**
   * Sync skills from GitHub repository
   */
  async syncFromGitHub(): Promise<SyncResult> {
    const result = await syncRemoteSkills();
    if (result.success) {
      // Clear cache to force reload with new remote skills
      this.clearCache();
    }
    return result;
  }

  /**
   * Get last sync timestamp from GitHub
   */
  async getLastSyncTime(): Promise<number> {
    return getRemoteSyncTime();
  }

  /**
   * Get count of remote skills in cache
   */
  async getRemoteSkillsCount(): Promise<number> {
    return getRemoteSkillsCount();
  }
}

export const skillManager = new SkillManager();

