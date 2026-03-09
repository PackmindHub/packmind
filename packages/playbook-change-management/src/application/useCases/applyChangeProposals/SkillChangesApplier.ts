import {
  SkillChangeProposalApplier,
  SkillVersionWithFiles,
  DiffService,
  Package,
  UpdatePackageCommand,
} from '@packmind/types';
import {
  ISkillsPort,
  OrganizationId,
  SkillId,
  SpaceId,
  UserId,
} from '@packmind/types';
import { IChangesProposalApplier } from './IChangesProposalApplier';

export class SkillChangesApplier
  extends SkillChangeProposalApplier
  implements IChangesProposalApplier<SkillVersionWithFiles>
{
  constructor(
    diffService: DiffService,
    private readonly skillsPort: ISkillsPort,
  ) {
    super(diffService);
  }

  async getVersion(artefactId: SkillId): Promise<SkillVersionWithFiles> {
    const skillVersion =
      await this.skillsPort.getLatestSkillVersion(artefactId);

    if (!skillVersion) {
      throw new Error(`Unable to find skillVersion with id ${artefactId}.`);
    }

    const skillVersionsFiles = await this.skillsPort.getSkillFiles(
      skillVersion.id,
    );

    return {
      ...skillVersion,
      files: skillVersionsFiles,
    };
  }

  async deleteArtefact(
    source: SkillVersionWithFiles,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<void> {
    await this.skillsPort.deleteSkill({
      userId,
      organizationId,
      skillId: source.skillId,
    });
  }

  getUpdatePackageCommandWithoutArtefact(
    source: SkillVersionWithFiles,
    pkg: Package,
  ): Pick<UpdatePackageCommand, 'recipeIds' | 'standardIds' | 'skillsIds'> {
    return {
      recipeIds: pkg.recipes,
      standardIds: pkg.standards,
      skillsIds: pkg.skills.filter((skillId) => skillId !== source.skillId),
    };
  }

  async saveNewVersion(
    skillVersion: SkillVersionWithFiles,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<SkillVersionWithFiles> {
    const newVersion = await this.skillsPort.saveSkillVersion({
      skillVersion,
      userId,
      spaceId,
      organizationId,
    });

    return {
      ...newVersion,
      files: await this.skillsPort.getSkillFiles(newVersion.id),
    };
  }
}
