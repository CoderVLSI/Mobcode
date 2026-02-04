import { BUNDLED_SKILLS } from './bundledSkills';
import { storage } from './storage';

export interface Skill {
  id: string;
  name: string;
  overview: string;
  whenToUse: string;
  content: string;
  tags: string[];
}

export interface SkillMatch {
  skill: Skill;
  relevance: number;
}

/**
 * Extract sections from markdown content
 */
function parseMarkdownSkill(content: string, filename: string): Skill {
  const lines = content.split('\n');

  let overview = '';
  let whenToUse = '';
  let currentSection = '';
  const sections: string[] = [];
  const tags: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract title from first heading
    if (i === 0 && line.startsWith('# ')) {
      const name = line.substring(2).trim();
    }

    // Detect sections
    if (line.startsWith('## ')) {
      if (currentSection && sections.length > 0) {
        sections.push(currentSection);
      }
      currentSection = line.substring(3).trim();
      continue;
    }

    // Extract overview
    if (line.toLowerCase().startsWith('## overview') && currentSection === 'Overview') {
      overview = lines.slice(i + 1, i + 3).join(' ').trim();
    }

    // Extract when to use
    if (line.toLowerCase().startsWith('## when to use')) {
      whenToUse = lines.slice(i + 1, i + 5).join(' ').trim();
    }

    // Collect content for current section
    if (currentSection) {
      currentSection += '\n' + line;
    }

    // Extract tags from content
    if (line.toLowerCase().includes('when to use') || line.toLowerCase().includes('user requests')) {
      const keywords = line.match(/"(.*?)"/g) || [];
      tags.push(...keywords.map(k => k.replace(/"/g, '').toLowerCase()));
    }
  }

  // Generate name from filename
  const name = filename
    .replace('.md', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: filename.replace('.md', ''),
    name,
    overview: overview || 'No overview available',
    whenToUse: whenToUse || 'No usage info available',
    content,
    tags: [...new Set(tags)],
  };
}

/**
 * Load all skills from bundled skills and remote cache
 * Remote skills take priority over bundled skills with the same ID
 */
export async function loadAllSkills(includeRemote = true): Promise<Skill[]> {
  try {
    const skillsMap = new Map<string, Skill>();

    // 1. Load bundled skills first (lower priority)
    for (const [id, content] of Object.entries(BUNDLED_SKILLS)) {
      try {
        const skill = parseMarkdownSkill(content, `${id}.md`);
        skillsMap.set(id, skill);
      } catch (error) {
        console.warn(`Failed to load bundled skill: ${id}`, error);
      }
    }

    // 2. Load remote skills (higher priority - overrides bundled)
    if (includeRemote) {
      try {
        const remoteSkills = await storage.getRemoteSkills();
        for (const [id, content] of Object.entries(remoteSkills)) {
          try {
            const skill = parseMarkdownSkill(content, `${id}.md`);
            skillsMap.set(id, skill); // Override bundled if exists
          } catch (error) {
            console.warn(`Failed to load remote skill: ${id}`, error);
          }
        }
        console.log(`Loaded ${Object.keys(remoteSkills).length} remote skills`);
      } catch (error) {
        console.warn('Failed to load remote skills, using bundled only:', error);
      }
    }

    const skills = Array.from(skillsMap.values());
    console.log(`Total skills loaded: ${skills.length}`);
    return skills;
  } catch (error) {
    console.error('Failed to load skills:', error);
    return [];
  }
}

/**
 * Find relevant skills based on user request
 */
export function findRelevantSkills(
  skills: Skill[],
  userRequest: string,
  maxResults: number = 3
): SkillMatch[] {
  const requestLower = userRequest.toLowerCase();

  const matches = skills.map(skill => {
    let relevance = 0;

    // Check title match
    if (skill.name.toLowerCase().includes(requestLower) || requestLower.includes(skill.name.toLowerCase())) {
      relevance += 10;
    }

    // Check tags
    skill.tags.forEach(tag => {
      if (requestLower.includes(tag)) {
        relevance += 5;
      }
    });

    // Check overview
    const overviewWords = skill.overview.toLowerCase().split(' ');
    const requestWords = requestLower.split(' ');

    requestWords.forEach(word => {
      if (word.length > 3 && overviewWords.includes(word)) {
        relevance += 2;
      }
    });

    // Check "when to use" section
    if (skill.whenToUse.toLowerCase().includes(requestLower)) {
      relevance += 3;
    }

    return { skill, relevance };
  });

  // Sort by relevance and filter out zero relevance
  return matches
    .filter(match => match.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
}

/**
 * Format skills for AI context
 */
export function formatSkillsForAI(matches: SkillMatch[]): string {
  if (matches.length === 0) {
    return '';
  }

  let formatted = '\n--- RELEVANT SKILLS/GUIDES ---\n';

  matches.forEach(({ skill, relevance }, index) => {
    formatted += `\n## ${index + 1}. ${skill.name} (Relevance: ${relevance})\n`;
    formatted += `${skill.overview}\n`;
    formatted += `**When to use:** ${skill.whenToUse}\n`;
    formatted += `\n${skill.content}\n`;
    formatted += '\n---\n';
  });

  return formatted;
}

/**
 * Get skill by ID (checks remote first, then bundled)
 */
export async function getSkillById(id: string): Promise<Skill | null> {
  try {
    // Check remote skills first
    const remoteSkills = await storage.getRemoteSkills();
    if (remoteSkills[id]) {
      return parseMarkdownSkill(remoteSkills[id], `${id}.md`);
    }

    // Fall back to bundled
    const content = BUNDLED_SKILLS[id];
    if (!content) {
      return null;
    }
    return parseMarkdownSkill(content, `${id}.md`);
  } catch (error) {
    console.error(`Failed to load skill: ${id}`, error);
    return null;
  }
}

/**
 * Search skills by keyword
 */
export async function searchSkills(query: string): Promise<Skill[]> {
  const skills = await loadAllSkills();
  const queryLower = query.toLowerCase();

  return skills.filter(skill =>
    skill.name.toLowerCase().includes(queryLower) ||
    skill.overview.toLowerCase().includes(queryLower) ||
    skill.tags.some(tag => tag.includes(queryLower))
  );
}
