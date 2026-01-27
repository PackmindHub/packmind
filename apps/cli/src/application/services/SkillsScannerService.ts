import * as fs from 'fs/promises';
import * as path from 'path';

export interface IDiscoveredSkill {
  name: string;
  description: string;
  prompt: string;
  sourcePath: string;
}

export interface ISkillsScanResult {
  skills: IDiscoveredSkill[];
  skippedPackmindSkills: string[];
}

export interface ISkillsScannerService {
  scanExistingSkills(projectPath: string): Promise<ISkillsScanResult>;
}

export class SkillsScannerService implements ISkillsScannerService {
  private readonly skillDirectories = ['.claude/skills', '.github/skills'];

  private readonly packmindSkillIndicators = [
    'packmind',
    'Packmind',
    'PACKMIND',
    '@packmind',
  ];

  async scanExistingSkills(projectPath: string): Promise<ISkillsScanResult> {
    const result: ISkillsScanResult = {
      skills: [],
      skippedPackmindSkills: [],
    };

    for (const skillDir of this.skillDirectories) {
      const fullPath = path.join(projectPath, skillDir);
      await this.scanSkillDirectory(fullPath, result);
    }

    return result;
  }

  private async scanSkillDirectory(
    dirPath: string,
    result: ISkillsScanResult,
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(dirPath, entry.name);
          const skillMdPath = path.join(skillPath, 'SKILL.md');

          try {
            const content = await fs.readFile(skillMdPath, 'utf-8');
            const skillName = entry.name;

            // Check if this is a Packmind-provided skill
            if (this.isPackmindSkill(content, skillName)) {
              result.skippedPackmindSkills.push(skillName);
              continue;
            }

            // Parse the skill
            const skill = this.parseSkillFile(content, skillName, skillMdPath);
            if (skill) {
              result.skills.push(skill);
            }
          } catch {
            // SKILL.md doesn't exist or can't be read, skip
          }
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  private isPackmindSkill(content: string, skillName: string): boolean {
    // Check if skill name contains packmind
    const lowerName = skillName.toLowerCase();
    if (lowerName.includes('packmind')) {
      return true;
    }

    // Check content for Packmind indicators
    for (const indicator of this.packmindSkillIndicators) {
      // Look for indicators in skill metadata or attribution
      if (
        content.includes(`from ${indicator}`) ||
        content.includes(`by ${indicator}`) ||
        content.includes(`${indicator} package`) ||
        content.includes(`${indicator}-`) ||
        content.includes(`@${indicator}`)
      ) {
        return true;
      }
    }

    // Check for packmind.json reference which indicates it came from a package
    if (
      content.includes('packmind.json') ||
      content.includes('packmind pull')
    ) {
      return true;
    }

    return false;
  }

  private parseSkillFile(
    content: string,
    skillName: string,
    sourcePath: string,
  ): IDiscoveredSkill | null {
    // Extract frontmatter if present
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let description = '';

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      if (descMatch) {
        description = descMatch[1].trim();
      }
    }

    // If no description in frontmatter, try to extract from first paragraph
    if (!description) {
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip frontmatter delimiters, headers, and empty lines
        if (
          trimmed &&
          !trimmed.startsWith('#') &&
          !trimmed.startsWith('---') &&
          !trimmed.startsWith('name:') &&
          !trimmed.startsWith('description:')
        ) {
          description = trimmed.substring(0, 200);
          break;
        }
      }
    }

    if (!description) {
      description = `Custom skill: ${skillName}`;
    }

    return {
      name: skillName,
      description,
      prompt: content,
      sourcePath,
    };
  }
}
