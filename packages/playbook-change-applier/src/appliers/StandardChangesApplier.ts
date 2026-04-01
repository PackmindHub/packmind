import {
  IStandardsPort,
  OrganizationId,
  SpaceId,
  StandardChangeProposalApplier,
  StandardId,
  StandardVersion,
  UserId,
  createUserId,
  createOrganizationId,
} from '@packmind/types';
import { IChangesProposalApplier } from './IChangesProposalApplier';

export class StandardChangesApplier
  extends StandardChangeProposalApplier
  implements IChangesProposalApplier<StandardVersion>
{
  constructor(
    diffService: ConstructorParameters<typeof StandardChangeProposalApplier>[0],
    private readonly standardsPort: IStandardsPort,
  ) {
    super(diffService);
  }

  async getVersion(artefactId: string): Promise<StandardVersion> {
    const standardId = artefactId as StandardId;
    const version =
      await this.standardsPort.getLatestStandardVersion(standardId);
    if (!version) {
      throw new Error(`Standard version not found for ${artefactId}`);
    }
    const rules = await this.standardsPort.getRulesByStandardId(standardId);
    return { ...version, rules };
  }

  async saveNewVersion(
    version: StandardVersion,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<StandardVersion> {
    const updated = await this.standardsPort.updateStandard({
      userId: createUserId(userId),
      organizationId: createOrganizationId(organizationId),
      spaceId,
      standardId: version.standardId,
      name: version.name,
      description: version.description,
      rules: (version.rules || []).map((r) => ({
        id: r.id,
        content: r.content,
      })),
      scope: version.scope,
    });
    const newVersion = await this.standardsPort.getLatestStandardVersion(
      updated.id,
    );
    if (!newVersion) {
      throw new Error(
        `Failed to retrieve new version after updating standard ${updated.id}`,
      );
    }
    const rules = await this.standardsPort.getRulesByStandardId(updated.id);
    return { ...newVersion, rules };
  }
}
