import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IGetPackageSummaryUseCase,
  ISpacesPort,
  GetPackageSummaryCommand,
  GetPackageSummaryResponse,
  OrganizationId,
  PackageWithArtefacts,
  SummarizedArtifact,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';

const origin = 'GetPackageSummaryUsecase';

function parseQualifiedSlug(
  slug: string,
): { spaceSlug: string; pkgSlug: string } | null {
  if (!slug.startsWith('@')) return null;
  const slash = slug.indexOf('/', 1);
  if (slash === -1) return null;
  return { spaceSlug: slug.slice(1, slash), pkgSlug: slug.slice(slash + 1) };
}

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
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  async executeForMembers(
    command: GetPackageSummaryCommand & MemberContext,
  ): Promise<GetPackageSummaryResponse> {
    const parsed = parseQualifiedSlug(command.slug);

    const packages = parsed
      ? await this.resolveByQualifiedSlug(parsed, command.organizationId)
      : await this.services
          .getPackageService()
          .getPackagesBySlugsWithArtefacts(
            [command.slug],
            command.organizationId,
          );

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

  private async resolveByQualifiedSlug(
    parsed: { spaceSlug: string; pkgSlug: string },
    organizationId: OrganizationId,
  ): Promise<PackageWithArtefacts[]> {
    const space = await this.spacesPort.getSpaceBySlug(
      parsed.spaceSlug,
      organizationId,
    );
    if (!space) {
      throw new Error(`Space '@${parsed.spaceSlug}' not found.`);
    }
    return this.services
      .getPackageService()
      .getPackagesBySlugsAndSpaceWithArtefacts([parsed.pkgSlug], space.id);
  }
}
