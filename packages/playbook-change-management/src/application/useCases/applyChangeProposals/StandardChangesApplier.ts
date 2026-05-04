import {
  StandardChangeProposalApplier,
  DiffService,
  Package,
  UpdatePackageCommand,
} from '@packmind/types';
import {
  IStandardsPort,
  OrganizationId,
  SpaceId,
  StandardId,
  StandardVersion,
  UserId,
} from '@packmind/types';
import { IChangesProposalApplier } from './IChangesProposalApplier';

export class StandardChangesApplier
  extends StandardChangeProposalApplier
  implements IChangesProposalApplier<StandardVersion>
{
  constructor(
    diffService: DiffService,
    private readonly standardsPort: IStandardsPort,
  ) {
    super(diffService);
  }

  async getVersion(artefactId: StandardId): Promise<StandardVersion> {
    const standardVersion =
      await this.standardsPort.getLatestStandardVersion(artefactId);

    if (!standardVersion) {
      throw new Error(`Unable to find standard version with id ${artefactId}.`);
    }

    const rules = await this.standardsPort.getRulesByStandardId(artefactId);

    return {
      ...standardVersion,
      rules,
    };
  }

  async deleteArtefact(
    source: StandardVersion,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<void> {
    await this.standardsPort.deleteStandard({
      userId,
      organizationId,
      spaceId,
      standardId: source.standardId,
    });
  }

  getUpdatePackageCommandWithoutArtefact(
    source: StandardVersion,
    pkg: Package,
  ): Pick<UpdatePackageCommand, 'recipeIds' | 'standardIds' | 'skillsIds'> {
    return {
      recipeIds: pkg.recipes,
      standardIds: pkg.standards.filter(
        (standardId) => standardId !== source.standardId,
      ),
      skillsIds: pkg.skills,
    };
  }

  async saveNewVersion(
    version: StandardVersion,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<StandardVersion> {
    const updatedStandard = await this.standardsPort.updateStandard({
      userId,
      organizationId,
      spaceId,
      standardId: version.standardId,
      name: version.name,
      description: version.description,
      rules: (version.rules || []).map((rule) => ({
        id: rule.id,
        content: rule.content,
      })),
      scope: version.scope,
    });

    const newVersion = await this.standardsPort.getLatestStandardVersion(
      updatedStandard.id,
    );

    if (!newVersion) {
      throw new Error(
        `Failed to retrieve latest version for standard ${updatedStandard.id}`,
      );
    }

    const rules = await this.standardsPort.getRulesByStandardId(
      updatedStandard.id,
    );

    return {
      ...newVersion,
      rules,
    };
  }
}
