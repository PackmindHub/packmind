import * as fs from 'fs/promises';
import * as path from 'path';
import { IGeneratedStandard } from './StandardsGeneratorService';
import { IGeneratedCommand } from './CommandsGeneratorService';
import { IGeneratedSkill } from './SkillsGeneratorService';

export interface IContentWriteResult {
  filesCreated: number;
  filesUpdated: number;
  errors: string[];
  paths: {
    standards: string[];
    commands: string[];
    skills: string[];
  };
}

export interface IContentWriterService {
  writeContent(
    projectPath: string,
    content: {
      standards: IGeneratedStandard[];
      commands: IGeneratedCommand[];
      skills: IGeneratedSkill[];
    },
  ): Promise<IContentWriteResult>;
}

export class ContentWriterService implements IContentWriterService {
  async writeContent(
    projectPath: string,
    content: {
      standards: IGeneratedStandard[];
      commands: IGeneratedCommand[];
      skills: IGeneratedSkill[];
    },
  ): Promise<IContentWriteResult> {
    const result: IContentWriteResult = {
      filesCreated: 0,
      filesUpdated: 0,
      errors: [],
      paths: {
        standards: [],
        commands: [],
        skills: [],
      },
    };

    // Write standards
    for (const standard of content.standards) {
      try {
        const relativePath = await this.writeStandard(projectPath, standard);
        result.filesCreated++;
        result.paths.standards.push(relativePath);
      } catch (error) {
        result.errors.push(
          `Failed to write standard "${standard.name}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Write commands
    for (const command of content.commands) {
      try {
        const relativePath = await this.writeCommand(projectPath, command);
        result.filesCreated++;
        result.paths.commands.push(relativePath);
      } catch (error) {
        result.errors.push(
          `Failed to write command "${command.name}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Write skills
    for (const skill of content.skills) {
      try {
        const relativePath = await this.writeSkill(projectPath, skill);
        result.filesCreated++;
        result.paths.skills.push(relativePath);
      } catch (error) {
        result.errors.push(
          `Failed to write skill "${skill.name}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return result;
  }

  private async writeStandard(
    projectPath: string,
    standard: IGeneratedStandard,
  ): Promise<string> {
    const slug = this.slugify(standard.name);
    const relativePath = `.packmind/standards/${slug}.md`;
    const fullPath = path.join(projectPath, relativePath);

    const content = this.formatStandardMarkdown(standard);
    await this.ensureDirectoryAndWriteFile(fullPath, content);

    return relativePath;
  }

  private async writeCommand(
    projectPath: string,
    command: IGeneratedCommand,
  ): Promise<string> {
    const slug = this.slugify(command.name);
    const relativePath = `.packmind/commands/${slug}.md`;
    const fullPath = path.join(projectPath, relativePath);

    const content = this.formatCommandMarkdown(command);
    await this.ensureDirectoryAndWriteFile(fullPath, content);

    return relativePath;
  }

  private async writeSkill(
    projectPath: string,
    skill: IGeneratedSkill,
  ): Promise<string> {
    const relativePath = `.claude/skills/${skill.name}/SKILL.md`;
    const fullPath = path.join(projectPath, relativePath);

    const content = this.formatSkillMarkdown(skill);
    await this.ensureDirectoryAndWriteFile(fullPath, content);

    return relativePath;
  }

  private formatStandardMarkdown(standard: IGeneratedStandard): string {
    const lines: string[] = [];
    lines.push(`# ${standard.name}`);
    lines.push('');
    lines.push(standard.description);
    lines.push('');
    lines.push('## Rules');
    lines.push('');

    for (const rule of standard.rules) {
      lines.push(`* ${rule.content}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  private formatCommandMarkdown(command: IGeneratedCommand): string {
    const lines: string[] = [];
    lines.push(command.summary);
    lines.push('');
    lines.push('## When to Use');
    lines.push('');

    for (const whenToUse of command.whenToUse) {
      lines.push(`- ${whenToUse}`);
    }
    lines.push('');

    lines.push('## Context Validation Checkpoints');
    lines.push('');

    for (const checkpoint of command.contextValidationCheckpoints) {
      lines.push(`* [ ] ${checkpoint}`);
    }
    lines.push('');

    lines.push('## Recipe Steps');
    lines.push('');

    for (let i = 0; i < command.steps.length; i++) {
      const step = command.steps[i];
      lines.push(`### Step ${i + 1}: ${step.name}`);
      lines.push('');
      lines.push(step.description);
      if (step.codeSnippet) {
        lines.push('');
        lines.push(step.codeSnippet);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatSkillMarkdown(skill: IGeneratedSkill): string {
    const lines: string[] = [];
    lines.push('---');
    lines.push(`name: '${skill.name}'`);
    lines.push(`description: '${skill.description.replace(/'/g, "''")}'`);
    lines.push('---');
    lines.push('');
    lines.push(skill.prompt);
    lines.push('');

    return lines.join('\n');
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureDirectoryAndWriteFile(
    fullPath: string,
    content: string,
  ): Promise<void> {
    const directory = path.dirname(fullPath);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }
}
