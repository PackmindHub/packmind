import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IGetPackageSummaryUseCase,
  GetPackageSummaryCommand,
  GetPackageSummaryResponse,
  SummarizedArtifact,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';

const origin = 'GetPackageSummaryUsecase';

export class GetPackageSummaryUsecase
  extends AbstractMemberUseCase<
    GetPackageSummaryCommand,
    GetPackageSummaryResponse
  >
  implements IGetPackageSummaryUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly services: DeploymentsServices,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  async executeForMembers(
    command: GetPackageSummaryCommand & MemberContext,
  ): Promise<GetPackageSummaryResponse> {
    const packages = await this.services
      .getPackageService()
      .getPackagesBySlugsWithArtefacts([command.slug], command.organizationId);

    if (packages.length === 0) {
      throw new Error(`Package '${command.slug}' does not exist`);
    }

    const pkg = packages[0];

    const recipes: SummarizedArtifact[] = pkg.recipes.map((recipe) => ({
      name: recipe.name,
      summary: undefined, // Recipe type doesn't have a summary field
    }));

    const standards: SummarizedArtifact[] = pkg.standards.map((standard) => ({
      name: standard.name,
      summary: standard.summary || undefined,
    }));

    return {
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description,
      recipes,
      standards,
    };
  }
}
