import {
  CreatedIds,
  ICreateChangeProposalApplier,
} from './ICreateChangeProposalApplier';
import {
  ChangeProposal,
  ChangeProposalType,
  ISkillsPort,
  OrganizationId,
  Skill,
  SpaceId,
} from '@packmind/types';
import { serializeSkillMetadata } from '@packmind/node-utils';

export class SkillCreateChangeProposalApplier implements ICreateChangeProposalApplier<ChangeProposalType.createSkill> {
  constructor(private readonly skillsPort: ISkillsPort) {}

  async apply(
    changeProposal: ChangeProposal<ChangeProposalType.createSkill>,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<Skill> {
    const {
      name,
      description,
      prompt,
      skillMdPermissions,
      license,
      compatibility,
      metadata,
      allowedTools,
      files,
    } = changeProposal.payload;

    // Generate SKILL.md content from payload
    const skillMdContent = this.generateSkillMd({
      name,
      description,
      prompt,
      license,
      compatibility,
      metadata,
      allowedTools,
    });

    // Prepare files array with SKILL.md
    const uploadFiles = [
      {
        path: 'SKILL.md',
        content: skillMdContent,
        permissions: skillMdPermissions,
        isBase64: false,
      },
      ...(files || []).map((file) => ({
        path: file.path,
        content: file.content,
        permissions: file.permissions,
        isBase64: file.isBase64,
      })),
    ];

    const result = await this.skillsPort.uploadSkill({
      userId: changeProposal.createdBy,
      organizationId,
      spaceId,
      files: uploadFiles,
    });

    return result.skill;
  }

  private generateSkillMd(metadata: {
    name: string;
    description: string;
    prompt: string;
    license?: string;
    compatibility?: string;
    metadata?: Record<string, string>;
    allowedTools?: string;
  }): string {
    const frontmatter = [
      `name: ${JSON.stringify(metadata.name)}`,
      `description: ${JSON.stringify(metadata.description)}`,
    ];

    if (metadata.license) {
      frontmatter.push(`license: ${JSON.stringify(metadata.license)}`);
    }
    if (metadata.compatibility) {
      frontmatter.push(
        `compatibility: ${JSON.stringify(metadata.compatibility)}`,
      );
    }
    if (metadata.metadata) {
      frontmatter.push(
        `metadata: ${serializeSkillMetadata(metadata.metadata)}`,
      );
    }
    if (metadata.allowedTools) {
      frontmatter.push(
        `allowed-tools: ${JSON.stringify(metadata.allowedTools)}`,
      );
    }

    return `---\n${frontmatter.join('\n')}\n---\n\n${metadata.prompt}`;
  }

  updateCreatedIds(createdIds: CreatedIds, skill: Skill): CreatedIds {
    return {
      ...createdIds,
      skills: [...createdIds.skills, skill.id],
    };
  }
}
