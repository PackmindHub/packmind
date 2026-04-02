import {
  ISkillsPort,
  OrganizationId,
  SkillChangeProposalApplier,
  SkillId,
  SkillVersionInput,
  SkillVersionWithFiles,
  SpaceId,
  UserId,
} from '@packmind/types';
import { IChangesProposalApplier } from './IChangesProposalApplier';

export class SkillChangesApplier
  extends SkillChangeProposalApplier
  implements IChangesProposalApplier<SkillVersionWithFiles>
{
  constructor(
    diffService: ConstructorParameters<typeof SkillChangeProposalApplier>[0],
    private readonly skillsPort: ISkillsPort,
  ) {
    super(diffService);
  }

  async getVersion(artefactId: string): Promise<SkillVersionWithFiles> {
    const skillId = artefactId as SkillId;
    const version = await this.skillsPort.getLatestSkillVersion(skillId);
    if (!version) {
      throw new Error(`Skill version not found for ${artefactId}`);
    }
    const files = await this.skillsPort.getSkillFiles(version.id);
    return { ...version, files };
  }

  async saveNewVersion(
    version: SkillVersionWithFiles,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<SkillVersionWithFiles> {
    const newVersion = await this.skillsPort.saveSkillVersion({
      userId,
      organizationId,
      spaceId,
      skillVersion: {
        skillId: version.skillId,
        userId: version.userId,
        name: version.name,
        slug: version.slug,
        description: version.description,
        prompt: version.prompt,
        license: version.license,
        compatibility: version.compatibility,
        metadata: version.metadata,
        allowedTools: version.allowedTools,
        additionalProperties: version.additionalProperties,
        files: (version.files || []).map(
          ({ path, content, permissions, isBase64 }) => ({
            path,
            content,
            permissions,
            isBase64,
          }),
        ),
      } satisfies SkillVersionInput,
    });
    const files = await this.skillsPort.getSkillFiles(newVersion.id);
    return { ...newVersion, files };
  }
}
