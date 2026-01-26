import { IGeneratedStandard } from './StandardsGeneratorService';
import { IGeneratedCommand } from './CommandsGeneratorService';
import { IGeneratedSkill } from './SkillsGeneratorService';

export interface IGeneratedContent {
  standards: IGeneratedStandard[];
  commands: IGeneratedCommand[];
  skills: IGeneratedSkill[];
}

export interface IContentPreviewService {
  formatPreview(content: IGeneratedContent): string;
}

export class ContentPreviewService implements IContentPreviewService {
  formatPreview(content: IGeneratedContent): string {
    const lines: string[] = [];
    const totalItems =
      content.standards.length +
      content.commands.length +
      content.skills.length;

    if (totalItems === 0) {
      return '\nNo content generated. Your project may not have detectable patterns.\n';
    }

    lines.push('');
    lines.push('='.repeat(60));
    lines.push('  GENERATED CONTENT PREVIEW');
    lines.push('='.repeat(60));
    lines.push('');

    if (content.standards.length > 0) {
      lines.push('STANDARDS:');
      lines.push('');
      content.standards.forEach((standard, idx) => {
        const ruleCount = standard.rules.length;
        const ruleText = ruleCount === 1 ? '1 rule' : `${ruleCount} rules`;
        lines.push(`  ${idx + 1}. ${standard.name}`);
        lines.push(`     ${standard.summary}`);
        lines.push(`     ${ruleText}`);
        lines.push('');
      });
    }

    if (content.commands.length > 0) {
      lines.push('COMMANDS:');
      lines.push('');
      content.commands.forEach((command, idx) => {
        const stepCount = command.steps.length;
        const stepText = stepCount === 1 ? '1 step' : `${stepCount} steps`;
        lines.push(`  ${idx + 1}. ${command.name}`);
        lines.push(`     ${command.summary}`);
        lines.push(`     ${stepText}`);
        lines.push('');
      });
    }

    if (content.skills.length > 0) {
      lines.push('SKILLS:');
      lines.push('');
      content.skills.forEach((skill, idx) => {
        lines.push(`  ${idx + 1}. ${skill.name}`);
        lines.push(`     ${skill.description}`);
        lines.push('');
      });
    }

    lines.push('='.repeat(60));
    lines.push('  SUMMARY');
    lines.push('='.repeat(60));

    const standardsText =
      content.standards.length === 1
        ? '1 standard'
        : `${content.standards.length} standards`;
    const commandsText =
      content.commands.length === 1
        ? '1 command'
        : `${content.commands.length} commands`;
    const skillsText =
      content.skills.length === 1
        ? '1 skill'
        : `${content.skills.length} skills`;

    lines.push(`  ${standardsText}, ${commandsText}, ${skillsText}`);
    lines.push(`  Total: ${totalItems} items`);
    lines.push('='.repeat(60));
    lines.push('');

    return lines.join('\n');
  }
}
