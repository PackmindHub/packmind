import {
  CreatedIds,
  ICreateChangeProposalApplier,
} from './ICreateChangeProposalApplier';
import {
  CAMEL_TO_YAML_KEY,
  ChangeProposal,
  ChangeProposalType,
  ISkillsPort,
  OrganizationId,
  Skill,
  SpaceId,
  camelToKebab,
  toYamlLike,
} from '@packmind/types';
import {
  serializeSkillMetadata,
  sortAdditionalPropertiesKeys,
} from '@packmind/node-utils';

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
      additionalProperties,
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
      additionalProperties,
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
    additionalProperties?: Record<string, unknown>;
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
    if (metadata.additionalProperties) {
      for (const [camelKey, value] of sortAdditionalPropertiesKeys(
        metadata.additionalProperties,
      )) {
        const kebabKey = CAMEL_TO_YAML_KEY[camelKey] ?? camelToKebab(camelKey);
        if (typeof value === 'object' && value !== null) {
          frontmatter.push(`${kebabKey}:\n${toYamlLike(value, 1)}`);
        } else {
          frontmatter.push(`${kebabKey}: ${toYamlLike(value, 0)}`);
        }
      }
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
