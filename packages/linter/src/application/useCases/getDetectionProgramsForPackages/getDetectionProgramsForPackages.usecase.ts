import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  IDeploymentPort,
  ISpacesPort,
  IStandardsPort,
  GetDetectionProgramsForPackagesCommand,
  GetDetectionProgramsForPackagesResponse,
  IGetDetectionProgramsForPackagesUseCase,
} from '@packmind/types';
import { DetectionProgramService } from '../../services/DetectionProgramService';

const origin = 'GetDetectionProgramsForPackagesUseCase';

export class GetDetectionProgramsForPackagesUseCase implements IGetDetectionProgramsForPackagesUseCase {
  constructor(
    private readonly detectionProgramService: DetectionProgramService,
    private readonly deploymentsAdapter: IDeploymentPort | undefined,
    private readonly standardsAdapter: IStandardsPort | undefined,
    private readonly spacesAdapter: ISpacesPort | undefined,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetDetectionProgramsForPackagesUseCase initialized');
  }

  async execute(
    command: GetDetectionProgramsForPackagesCommand,
  ): Promise<GetDetectionProgramsForPackagesResponse> {
    this.logger.info('Getting detection programs for packages', {
      packagesSlugs: command.packagesSlugs,
      organizationId: command.organizationId,
    });

    if (
      !this.deploymentsAdapter ||
      !this.standardsAdapter ||
      !this.spacesAdapter
    ) {
      this.logger.warn(
        'Required adapters not available, returning empty results',
      );
      return { targets: [] };
    }

    const targets: GetDetectionProgramsForPackagesResponse['targets'] = [];

    // Get all spaces for the organization
    const spaces = await this.spacesAdapter.listSpacesByOrganization(
      createOrganizationId(command.organizationId),
    );

    // Get all standards across all spaces
    const standardsPerSpace = await Promise.all(
      spaces.map((space) =>
        this.standardsAdapter!.listStandardsBySpace(
          space.id,
          createOrganizationId(command.organizationId),
          command.userId,
        ),
      ),
    );
    const allStandards = standardsPerSpace.flat();

    for (const slug of command.packagesSlugs) {
      try {
        const packageSummary = await this.deploymentsAdapter.getPackageSummary({
          organizationId: createOrganizationId(command.organizationId),
          userId: command.userId,
          slug,
        });

        if (!packageSummary) {
          this.logger.warn(`Package not found: ${slug}`);
          continue;
        }

        const standardsWithPrograms: GetDetectionProgramsForPackagesResponse['targets'][0]['standards'] =
          [];

        // Get standard names from package
        const packageStandardNames = new Set(
          packageSummary.standards.map((s) => s.name),
        );

        // Find matching standards by name
        const matchingStandards = allStandards.filter((s) =>
          packageStandardNames.has(s.name),
        );

        for (const standard of matchingStandards) {
          try {
            const rules =
              await this.standardsAdapter!.getLatestRulesByStandardId(
                standard.id,
              );

            const rulesWithPrograms: GetDetectionProgramsForPackagesResponse['targets'][0]['standards'][0]['rules'] =
              [];

            for (const rule of rules) {
              const activeWithPrograms =
                await this.detectionProgramService.findActiveByRuleIdWithPrograms(
                  rule.id,
                );

              if (activeWithPrograms && activeWithPrograms.length > 0) {
                const mappedPrograms = activeWithPrograms
                  .filter(
                    (adp) =>
                      adp.detectionProgram?.code && adp.detectionProgram?.mode,
                  )
                  .map((adp) => ({
                    language: adp.language,
                    detectionProgram: {
                      mode: adp.detectionProgram!.mode,
                      code: adp.detectionProgram!.code,
                      sourceCodeState: adp.detectionProgram!.sourceCodeState,
                    },
                  }));

                if (mappedPrograms.length > 0) {
                  rulesWithPrograms.push({
                    content: rule.content,
                    activeDetectionPrograms: mappedPrograms,
                  });
                }
              }
            }

            if (rulesWithPrograms.length > 0) {
              standardsWithPrograms.push({
                name: standard.name,
                slug: standard.slug,
                scope: standard.scope
                  ? standard.scope
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [],
                rules: rulesWithPrograms,
              });
            }
          } catch (error) {
            this.logger.warn(
              `Failed to get detection programs for standard: ${standard.name}`,
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
          }
        }

        if (standardsWithPrograms.length > 0) {
          targets.push({
            name: packageSummary.name,
            path: '/',
            standards: standardsWithPrograms,
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to get package: ${slug}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info('Detection programs for packages retrieved successfully', {
      packagesSlugs: command.packagesSlugs,
      targetsCount: targets.length,
    });

    return { targets };
  }
}
