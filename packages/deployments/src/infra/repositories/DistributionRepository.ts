import { PackmindLogger } from '@packmind/logger';
import { localDataSource, getErrorMessage } from '@packmind/node-utils';
import {
  Distribution,
  DistributedPackage,
  DistributionId,
  DistributionOperation,
  DistributionStatus,
  GitCommit,
  GitProviderId,
  OrganizationId,
  PackageId,
  CommandId,
  CommandVersion,
  RenderMode,
  SkillId,
  SkillVersion,
  SpaceId,
  StandardId,
  StandardVersion,
  TargetId,
} from '@packmind/types';
import { Repository } from 'typeorm';
import {
  ActivePackageOperationRow,
  IDistributionRepository,
  OutdatedDeploymentsByTarget,
  OutdatedCommandDeployment,
  OutdatedSkillDeployment,
  OutdatedStandardDeployment,
} from '../../domain/repositories/IDistributionRepository';
import { DistributionSchema } from '../schemas/DistributionSchema';
import {
  TRACKED_BRANCH_SCOPE,
  trackedBranchScopeParams,
} from './trackedBranchScope';

const origin = 'DistributionRepository';

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value == null ? '' : String(value);
}

type LatestDistributedPackageRow = {
  distributedPackageId: string;
  packageId: PackageId;
  operation: DistributionOperation | null;
  renderModes: RenderMode[] | string | null;
  distributedAt: Date | string;
};

type VersionRelationName = keyof Pick<
  DistributedPackage,
  'standardVersions' | 'recipeVersions' | 'skillVersions'
>;

export class DistributionRepository implements IDistributionRepository {
  constructor(
    private readonly repository: Repository<Distribution> = localDataSource.getRepository<Distribution>(
      DistributionSchema,
    ),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('DistributionRepository initialized');
  }

  private loggableEntity(entity: Distribution): Partial<Distribution> {
    return {
      id: entity.id,
      authorId: entity.authorId,
      organizationId: entity.organizationId,
      status: entity.status,
    };
  }

  private toRenderModes(value: unknown): RenderMode[] {
    if (Array.isArray(value)) {
      return value as RenderMode[];
    }

    if (typeof value === 'string' && value.length > 0) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch (error) {
        this.logger.warn(
          'Failed to parse distribution render_modes as JSON; treating as no render modes',
          { value, error: getErrorMessage(error) },
        );
        return [];
      }

      if (!Array.isArray(parsed)) {
        this.logger.warn(
          'Distribution render_modes parsed to a non-array value; treating as no render modes',
          { value },
        );
        return [];
      }

      return parsed as RenderMode[];
    }

    return [];
  }

  async add(distribution: Distribution): Promise<Distribution> {
    this.logger.info('Adding distribution to database', {
      id: distribution.id,
    });

    try {
      const savedDistribution = await this.repository.save(distribution);
      this.logger.info('Saved distribution to database successfully', {
        id: savedDistribution.id,
      });
      return savedDistribution;
    } catch (error) {
      this.logger.error('Failed to save distribution to database', {
        id: distribution.id,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async listByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions by organization ID', {
      organizationId,
    });

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info('Distributions listed by organization ID successfully', {
        organizationId,
        count: distributions.length,
      });
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by organization ID', {
        organizationId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async listByPackageId(
    packageId: PackageId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info(
      'Listing distributions by package ID and organization ID',
      {
        packageId,
        organizationId,
      },
    );

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
        .where('distributedPackage.packageId = :packageId', {
          packageId: packageId as string,
        })
        .andWhere('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere(
          TRACKED_BRANCH_SCOPE,
          trackedBranchScopeParams(organizationId),
        )
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Distributions listed by package ID and organization ID successfully',
        {
          packageId,
          organizationId,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by package ID', {
        packageId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async listByCommandId(
    recipeId: CommandId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions by recipe ID and organization ID', {
      recipeId,
      organizationId,
    });

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect('distributedPackage.package', 'package')
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .innerJoinAndSelect(
          'distributedPackage.recipeVersions',
          'recipeVersion',
        )
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
        .where('recipeVersion.recipeId = :recipeId', {
          recipeId: recipeId as string,
        })
        .andWhere('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere(
          TRACKED_BRANCH_SCOPE,
          trackedBranchScopeParams(organizationId),
        )
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Distributions listed by recipe ID and organization ID successfully',
        {
          recipeId,
          organizationId,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by recipe ID', {
        recipeId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async listByStandardId(
    standardId: StandardId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info(
      'Listing distributions by standard ID and organization ID',
      {
        standardId,
        organizationId,
      },
    );

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect('distributedPackage.package', 'package')
        .innerJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
        .where('standardVersion.standardId = :standardId', {
          standardId: standardId as string,
        })
        .andWhere('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere(
          TRACKED_BRANCH_SCOPE,
          trackedBranchScopeParams(organizationId),
        )
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Distributions listed by standard ID and organization ID successfully',
        {
          standardId,
          organizationId,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by standard ID', {
        standardId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async listByTargetIds(
    organizationId: OrganizationId,
    targetIds: TargetId[],
  ): Promise<Distribution[]> {
    this.logger.info(
      'Listing distributions by organization ID and target IDs',
      {
        organizationId,
        targetIds,
        targetCount: targetIds.length,
      },
    );

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.target_id IN (:...targetIds)', {
          targetIds: targetIds as string[],
        })
        .orderBy('distribution.createdAt', 'ASC')
        .getMany();

      this.logger.info(
        'Distributions listed by organization ID and target IDs successfully',
        {
          organizationId,
          targetIds,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error(
        'Failed to list distributions by organization ID and target IDs',
        {
          organizationId,
          targetIds,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  async listByOrganizationIdWithStatus(
    organizationId: OrganizationId,
    status?: DistributionStatus,
    spaceId?: SpaceId,
  ): Promise<Distribution[]> {
    this.logger.info(
      'Listing distributions by organization ID with status filter',
      {
        organizationId,
        status,
        spaceId,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        });

      if (status) {
        queryBuilder.andWhere('distribution.status = :status', { status });
      }

      if (spaceId) {
        queryBuilder
          .andWhere((qb) => {
            const subQuery = qb
              .subQuery()
              .select('dp.distributionId')
              .from('DistributedPackage', 'dp')
              .innerJoin('dp.package', 'p')
              .where('p.spaceId = :spaceId')
              .getQuery();
            return `distribution.id IN ${subQuery}`;
          })
          .setParameter('spaceId', spaceId);
      }

      queryBuilder.orderBy('distribution.createdAt', 'DESC');

      const distributions = await queryBuilder.getMany();

      this.logger.info(
        'Distributions listed by organization ID with status filter successfully',
        {
          organizationId,
          status,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error(
        'Failed to list distributions by organization ID with status filter',
        {
          organizationId,
          status,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  async findById(id: DistributionId): Promise<Distribution | null> {
    this.logger.info('Finding distribution by ID', { distributionId: id });

    try {
      const distribution = await this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .where('distribution.id = :id', { id })
        .getOne();

      if (!distribution) {
        this.logger.info('Distribution not found', { distributionId: id });
        return null;
      }

      this.logger.info('Distribution found by ID successfully', {
        distributionId: id,
      });
      return distribution;
    } catch (error) {
      this.logger.error('Failed to find distribution by ID', {
        distributionId: id,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  private async findActiveDistributedPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds?: PackageId[],
  ): Promise<LatestDistributedPackageRow[]> {
    if (packageIds && packageIds.length === 0) {
      return [];
    }

    const queryBuilder = this.repository
      .createQueryBuilder('distribution')
      .innerJoin('distribution.distributedPackages', 'distributedPackage')
      .where('distribution.organizationId = :organizationId', {
        organizationId,
      })
      .andWhere('distribution.target_id = :targetId', { targetId })
      .andWhere('distribution.status = :status', {
        status: DistributionStatus.success,
      });

    if (packageIds) {
      queryBuilder.andWhere(
        'distributedPackage.packageId IN (:...packageIds)',
        {
          packageIds: packageIds as string[],
        },
      );
    }

    const rows = await queryBuilder
      .distinctOn(['distributedPackage.package_id'])
      .orderBy('distributedPackage.package_id')
      .addOrderBy('distribution.createdAt', 'DESC')
      .addOrderBy('distribution.id', 'DESC')
      .select('distributedPackage.id', 'distributedPackageId')
      .addSelect('distributedPackage.package_id', 'packageId')
      .addSelect('distributedPackage.operation', 'operation')
      .addSelect('distribution.render_modes', 'renderModes')
      .addSelect('distribution.createdAt', 'distributedAt')
      .getRawMany<LatestDistributedPackageRow>();

    return rows.filter((row) => (row.operation ?? 'add') !== 'remove');
  }

  private async findActiveVersionsForDistributedPackages<
    R extends VersionRelationName,
  >(
    activePackages: LatestDistributedPackageRow[],
    relation: R,
    artifactIdOf: (version: DistributedPackage[R][number]) => string,
  ): Promise<DistributedPackage[R]> {
    type V = DistributedPackage[R][number];

    if (activePackages.length === 0) {
      return [] as DistributedPackage[R];
    }

    const queryBuilder = this.repository
      .createQueryBuilder('distribution')
      .select(['distribution.id', 'distributedPackage.id', 'version'])
      .innerJoin('distribution.distributedPackages', 'distributedPackage')
      .innerJoin(`distributedPackage.${relation}`, 'version')
      .where('distributedPackage.id IN (:...distributedPackageIds)', {
        distributedPackageIds: activePackages.map(
          (row) => row.distributedPackageId,
        ),
      });

    if (relation === 'skillVersions') {
      queryBuilder.innerJoin('version.skill', 'skill');
    }

    const distributions = await queryBuilder.getMany();

    const versionsByDistributedPackageId = new Map<string, V[]>();
    for (const distribution of distributions) {
      for (const distributedPackage of distribution.distributedPackages) {
        versionsByDistributedPackageId.set(
          distributedPackage.id,
          distributedPackage[relation] as V[],
        );
      }
    }

    const packagesByRecency = [...activePackages].sort((a, b) => {
      const delta =
        new Date(b.distributedAt).getTime() -
        new Date(a.distributedAt).getTime();
      return delta !== 0
        ? delta
        : b.distributedPackageId.localeCompare(a.distributedPackageId);
    });

    const versionByArtifactId = new Map<string, V>();

    for (const row of packagesByRecency) {
      const versions = versionsByDistributedPackageId.get(
        row.distributedPackageId,
      );
      if (!versions) {
        continue;
      }

      for (const version of versions) {
        const artifactId = artifactIdOf(version);
        if (!versionByArtifactId.has(artifactId)) {
          versionByArtifactId.set(artifactId, version);
        }
      }
    }

    return Array.from(versionByArtifactId.values()) as DistributedPackage[R];
  }

  async findActiveStandardVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<StandardVersion[]> {
    this.logger.info('Finding active standard versions by target', {
      organizationId,
      targetId,
    });

    try {
      const activePackages = await this.findActiveDistributedPackages(
        organizationId,
        targetId,
      );

      const activeStandardVersions =
        await this.findActiveVersionsForDistributedPackages(
          activePackages,
          'standardVersions',
          (standardVersion) => standardVersion.standardId,
        );

      this.logger.info('Active standard versions found by target', {
        organizationId,
        targetId,
        activePackageCount: activePackages.length,
        activeStandardVersionsCount: activeStandardVersions.length,
        standardIds: activeStandardVersions.map((sv) => sv.standardId),
      });

      return activeStandardVersions;
    } catch (error) {
      this.logger.error('Failed to find active standard versions by target', {
        organizationId,
        targetId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findActiveCommandVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<CommandVersion[]> {
    this.logger.info('Finding active recipe versions by target', {
      organizationId,
      targetId,
    });

    try {
      const activePackages = await this.findActiveDistributedPackages(
        organizationId,
        targetId,
      );

      const activeCommandVersions =
        await this.findActiveVersionsForDistributedPackages(
          activePackages,
          'recipeVersions',
          (recipeVersion) => recipeVersion.recipeId,
        );

      this.logger.info('Active recipe versions found by target', {
        organizationId,
        targetId,
        activePackageCount: activePackages.length,
        activeRecipeVersionsCount: activeCommandVersions.length,
        recipeIds: activeCommandVersions.map((rv) => rv.recipeId),
      });

      return activeCommandVersions;
    } catch (error) {
      this.logger.error('Failed to find active recipe versions by target', {
        organizationId,
        targetId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findActiveStandardVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<StandardVersion[]> {
    this.logger.info(
      'Finding active standard versions by target and packages',
      {
        organizationId,
        targetId,
        packageIdsCount: packageIds.length,
      },
    );

    if (packageIds.length === 0) {
      return [];
    }

    try {
      const activePackages = await this.findActiveDistributedPackages(
        organizationId,
        targetId,
        packageIds,
      );

      const activeStandardVersions =
        await this.findActiveVersionsForDistributedPackages(
          activePackages,
          'standardVersions',
          (standardVersion) => standardVersion.standardId,
        );

      this.logger.info(
        'Active standard versions found by target and packages',
        {
          organizationId,
          targetId,
          packageIdsCount: packageIds.length,
          activeStandardVersionsCount: activeStandardVersions.length,
        },
      );

      return activeStandardVersions;
    } catch (error) {
      this.logger.error(
        'Failed to find active standard versions by target and packages',
        {
          organizationId,
          targetId,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  async findActiveCommandVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<CommandVersion[]> {
    this.logger.info('Finding active recipe versions by target and packages', {
      organizationId,
      targetId,
      packageIdsCount: packageIds.length,
    });

    if (packageIds.length === 0) {
      return [];
    }

    try {
      const activePackages = await this.findActiveDistributedPackages(
        organizationId,
        targetId,
        packageIds,
      );

      const activeCommandVersions =
        await this.findActiveVersionsForDistributedPackages(
          activePackages,
          'recipeVersions',
          (recipeVersion) => recipeVersion.recipeId,
        );

      this.logger.info('Active recipe versions found by target and packages', {
        organizationId,
        targetId,
        packageIdsCount: packageIds.length,
        activeRecipeVersionsCount: activeCommandVersions.length,
      });

      return activeCommandVersions;
    } catch (error) {
      this.logger.error(
        'Failed to find active recipe versions by target and packages',
        {
          organizationId,
          targetId,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  async findActiveVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds?: PackageId[],
  ): Promise<{
    standardVersions: StandardVersion[];
    commandVersions: CommandVersion[];
    skillVersions: SkillVersion[];
  }> {
    this.logger.info('Finding active versions by target', {
      organizationId,
      targetId,
      packageIdsCount: packageIds?.length,
    });

    if (packageIds && packageIds.length === 0) {
      return { standardVersions: [], commandVersions: [], skillVersions: [] };
    }

    try {
      const activePackages = await this.findActiveDistributedPackages(
        organizationId,
        targetId,
        packageIds,
      );

      const [standardVersions, commandVersions, skillVersions] =
        await Promise.all([
          this.findActiveVersionsForDistributedPackages(
            activePackages,
            'standardVersions',
            (standardVersion) => standardVersion.standardId,
          ),
          this.findActiveVersionsForDistributedPackages(
            activePackages,
            'recipeVersions',
            (recipeVersion) => recipeVersion.recipeId,
          ),
          this.findActiveVersionsForDistributedPackages(
            activePackages,
            'skillVersions',
            (skillVersion) => skillVersion.skillId,
          ),
        ]);

      this.logger.info('Active versions found by target', {
        organizationId,
        targetId,
        packageIdsCount: packageIds?.length,
        activePackageCount: activePackages.length,
        standardVersionsCount: standardVersions.length,
        commandVersionsCount: commandVersions.length,
        skillVersionsCount: skillVersions.length,
      });

      return { standardVersions, commandVersions, skillVersions };
    } catch (error) {
      this.logger.error('Failed to find active versions by target', {
        organizationId,
        targetId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async listBySkillId(
    skillId: SkillId,
    organizationId: OrganizationId,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions by skill ID and organization ID', {
      skillId,
      organizationId,
    });

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .innerJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect('distributedPackage.package', 'package')
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .innerJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distribution.gitCommit', 'gitCommit')
        .leftJoinAndSelect('distribution.target', 'target')
        .leftJoinAndSelect('target.gitRepo', 'gitRepo')
        .where('skillVersion.skillId = :skillId', {
          skillId: skillId as string,
        })
        .andWhere('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere(
          TRACKED_BRANCH_SCOPE,
          trackedBranchScopeParams(organizationId),
        )
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      this.logger.info(
        'Distributions listed by skill ID and organization ID successfully',
        {
          skillId,
          organizationId,
          count: distributions.length,
        },
      );
      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions by skill ID', {
        skillId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findActivePackageIdsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<PackageId[]> {
    this.logger.info('Finding active package IDs by target', {
      organizationId,
      targetId,
    });

    try {
      const activePackages = await this.findActiveDistributedPackages(
        organizationId,
        targetId,
      );

      const activePackageIds = activePackages.map((row) => row.packageId);

      this.logger.info('Active package IDs found by target', {
        organizationId,
        targetId,
        activePackageCount: activePackageIds.length,
      });

      return activePackageIds;
    } catch (error) {
      this.logger.error('Failed to find active package IDs by target', {
        organizationId,
        targetId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findActiveRenderModesByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<RenderMode[]> {
    this.logger.info('Finding active render modes by target', {
      organizationId,
      targetId,
    });

    try {
      const activePackages = await this.findActiveDistributedPackages(
        organizationId,
        targetId,
      );

      const renderModes = new Set<RenderMode>();
      for (const row of activePackages) {
        for (const mode of this.toRenderModes(row.renderModes)) {
          renderModes.add(mode);
        }
      }

      const activeRenderModes = Array.from(renderModes.values());

      this.logger.info('Active render modes found by target', {
        organizationId,
        targetId,
        activePackageCount: activePackages.length,
        renderModesCount: activeRenderModes.length,
      });

      return activeRenderModes;
    } catch (error) {
      this.logger.error('Failed to find active render modes by target', {
        organizationId,
        targetId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findActiveSkillVersionsByTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<SkillVersion[]> {
    this.logger.info('Finding active skill versions by target', {
      organizationId,
      targetId,
    });

    try {
      const activePackages = await this.findActiveDistributedPackages(
        organizationId,
        targetId,
      );

      const activeSkillVersions =
        await this.findActiveVersionsForDistributedPackages(
          activePackages,
          'skillVersions',
          (skillVersion) => skillVersion.skillId,
        );

      this.logger.info('Active skill versions found by target', {
        organizationId,
        targetId,
        activePackageCount: activePackages.length,
        activeSkillVersionsCount: activeSkillVersions.length,
        skillIds: activeSkillVersions.map((sv) => sv.skillId),
      });

      return activeSkillVersions;
    } catch (error) {
      this.logger.error('Failed to find active skill versions by target', {
        organizationId,
        targetId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findActiveSkillVersionsByTargetAndPackages(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageIds: PackageId[],
  ): Promise<SkillVersion[]> {
    this.logger.info('Finding active skill versions by target and packages', {
      organizationId,
      targetId,
      packageIdsCount: packageIds.length,
    });

    if (packageIds.length === 0) {
      return [];
    }

    try {
      const activePackages = await this.findActiveDistributedPackages(
        organizationId,
        targetId,
        packageIds,
      );

      const activeSkillVersions =
        await this.findActiveVersionsForDistributedPackages(
          activePackages,
          'skillVersions',
          (skillVersion) => skillVersion.skillId,
        );

      this.logger.info('Active skill versions found by target and packages', {
        organizationId,
        targetId,
        packageIdsCount: packageIds.length,
        activeSkillVersionsCount: activeSkillVersions.length,
      });

      return activeSkillVersions;
    } catch (error) {
      this.logger.error(
        'Failed to find active skill versions by target and packages',
        {
          organizationId,
          targetId,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  async countActiveArtifactsBySpace(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<{ standards: number; recipes: number; skills: number }> {
    this.logger.info('Counting active artifacts by space', {
      organizationId,
      spaceId,
    });

    const deployedIds = await this.listDeployedArtifactIdsBySpace(
      organizationId,
      spaceId,
    );

    const counts = {
      standards: deployedIds.standardIds.length,
      recipes: deployedIds.recipeIds.length,
      skills: deployedIds.skillIds.length,
    };

    this.logger.info('Active artifacts counted by space', {
      organizationId,
      spaceId,
      ...counts,
    });

    return counts;
  }

  async listDeployedArtifactIdsBySpace(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<{
    standardIds: StandardId[];
    recipeIds: CommandId[];
    skillIds: SkillId[];
  }> {
    this.logger.info('Listing deployed artifact IDs by space', {
      organizationId,
      spaceId,
    });

    try {
      const distributions = await this.repository
        .createQueryBuilder('distribution')
        .leftJoinAndSelect(
          'distribution.distributedPackages',
          'distributedPackage',
        )
        .leftJoinAndSelect(
          'distributedPackage.standardVersions',
          'standardVersion',
        )
        .leftJoinAndSelect('distributedPackage.recipeVersions', 'recipeVersion')
        .leftJoinAndSelect('distributedPackage.skillVersions', 'skillVersion')
        .leftJoinAndSelect('distributedPackage.package', 'package')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .andWhere('package.spaceId = :spaceId', { spaceId })
        .orderBy('distribution.createdAt', 'DESC')
        .getMany();

      // Group by target, track latest operation per package per target
      const targetPackageData = new Map<
        string,
        Map<
          string,
          {
            operation: string;
            standardVersions: StandardVersion[];
            recipeVersions: CommandVersion[];
            skillVersions: SkillVersion[];
          }
        >
      >();

      for (const distribution of distributions) {
        const tId = distribution.target?.id as string;

        if (!targetPackageData.has(tId)) {
          targetPackageData.set(tId, new Map());
        }

        const latestPerPackage = targetPackageData.get(tId)!;

        for (const dp of distribution.distributedPackages) {
          if (!latestPerPackage.has(dp.packageId)) {
            latestPerPackage.set(dp.packageId, {
              operation: dp.operation ?? 'add',
              standardVersions: dp.standardVersions,
              recipeVersions: dp.recipeVersions,
              skillVersions: dp.skillVersions,
            });
          }
        }
      }

      // Collect unique artifact IDs from active packages across all targets
      const standardIds = new Set<StandardId>();
      const recipeIds = new Set<CommandId>();
      const skillIds = new Set<SkillId>();

      for (const [, latestPerPackage] of targetPackageData) {
        for (const [, pkgData] of latestPerPackage) {
          if (pkgData.operation === 'remove') {
            continue;
          }

          for (const sv of pkgData.standardVersions) {
            standardIds.add(sv.standardId);
          }

          for (const rv of pkgData.recipeVersions) {
            recipeIds.add(rv.recipeId);
          }

          for (const skv of pkgData.skillVersions) {
            skillIds.add(skv.skillId);
          }
        }
      }

      const result = {
        standardIds: Array.from(standardIds),
        recipeIds: Array.from(recipeIds),
        skillIds: Array.from(skillIds),
      };

      this.logger.info('Deployed artifact IDs listed by space', {
        organizationId,
        spaceId,
        standardCount: result.standardIds.length,
        recipeCount: result.recipeIds.length,
        skillCount: result.skillIds.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to list deployed artifact IDs by space', {
        organizationId,
        spaceId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async updateStatus(
    id: DistributionId,
    status: DistributionStatus,
    gitCommit?: GitCommit,
    error?: string,
  ): Promise<Distribution> {
    this.logger.info('Updating distribution status', {
      distributionId: id,
      status,
      hasGitCommit: !!gitCommit,
      hasError: !!error,
    });

    try {
      const distribution = await this.findById(id);

      if (!distribution) {
        this.logger.error('Distribution not found for status update', {
          distributionId: id,
        });
        throw new Error(`Distribution not found: ${id}`);
      }

      distribution.status = status;

      if (gitCommit) {
        distribution.gitCommit = gitCommit;
      }

      if (error) {
        distribution.error = error;
      }

      const updatedDistribution = await this.repository.save(distribution);

      this.logger.info('Distribution status updated successfully', {
        distributionId: id,
        status,
      });

      return updatedDistribution;
    } catch (error) {
      this.logger.error('Failed to update distribution status', {
        distributionId: id,
        status,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findOutdatedDeploymentsBySpace(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<OutdatedDeploymentsByTarget[]> {
    this.logger.info('Finding outdated deployments by space', {
      organizationId,
      spaceId,
    });

    try {
      type LatestRow = {
        distributedPackageId: string;
        targetId: TargetId;
        targetName: string;
        gitRepoId: string;
        deploymentDate: string;
      };

      // Latest successful 'add' distribution per (target, package) within the space.
      // DISTINCT ON collapses history to one row per pair at the SQL layer, so we
      // never hydrate the heavy version content for older distributions.
      // Correctness relies on DISTINCT ON, which TypeORM only emits when
      // driver.options.type === 'postgres' (silently dropped otherwise,
      // degrading this to "every historical row"). This repository is
      // Postgres-only.
      const latestRows = await this.repository
        .createQueryBuilder('distribution')
        .innerJoin('distribution.distributedPackages', 'distributedPackage')
        .innerJoin('distributedPackage.package', 'package')
        .innerJoin('distribution.target', 'target')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .andWhere('package.spaceId = :spaceId', { spaceId })
        .andWhere('distributedPackage.operation = :operation', {
          operation: 'add',
        })
        .distinctOn(['distribution.target_id', 'distributedPackage.package_id'])
        .orderBy('distribution.target_id')
        .addOrderBy('distributedPackage.package_id')
        .addOrderBy('distribution.createdAt', 'DESC')
        .addOrderBy('distribution.id', 'DESC')
        .select('distributedPackage.id', 'distributedPackageId')
        .addSelect('distribution.target_id', 'targetId')
        .addSelect('target.name', 'targetName')
        .addSelect('target.git_repo_id', 'gitRepoId')
        .addSelect('distribution.createdAt', 'deploymentDate')
        .getRawMany<LatestRow>();

      if (latestRows.length === 0) {
        this.logger.info('Outdated deployments found by space', {
          organizationId,
          spaceId,
          targetCount: 0,
        });
        return [];
      }

      const distributedPackageIds = latestRows.map(
        (row) => row.distributedPackageId,
      );
      const dpById = new Map(
        latestRows.map((row) => [row.distributedPackageId, row]),
      );

      type StandardVersionRow = {
        distributedPackageId: string;
        standardId: StandardId;
        name: string;
        slug: string;
        version: number;
      };
      type CommandVersionRow = {
        distributedPackageId: string;
        recipeId: CommandId;
        name: string;
        slug: string;
        version: number;
      };
      type SkillVersionRow = {
        distributedPackageId: string;
        skillId: SkillId;
        name: string;
        slug: string;
        version: number;
      };

      // Slim version metadata pulled from the pivot tables. Three focused
      // queries keep each join flat (no Cartesian product across the three
      // version types) and reuse the same Distribution-bound QueryBuilder.
      const [standardRows, commandRows, skillRows] = await Promise.all([
        this.repository
          .createQueryBuilder('distribution')
          .innerJoin('distribution.distributedPackages', 'distributedPackage')
          .innerJoin('distributedPackage.standardVersions', 'standardVersion')
          .where('distributedPackage.id IN (:...ids)', {
            ids: distributedPackageIds,
          })
          .select('distributedPackage.id', 'distributedPackageId')
          .addSelect('standardVersion.standard_id', 'standardId')
          .addSelect('standardVersion.name', 'name')
          .addSelect('standardVersion.slug', 'slug')
          .addSelect('standardVersion.version', 'version')
          .getRawMany<StandardVersionRow>(),
        this.repository
          .createQueryBuilder('distribution')
          .innerJoin('distribution.distributedPackages', 'distributedPackage')
          .innerJoin('distributedPackage.recipeVersions', 'recipeVersion')
          .where('distributedPackage.id IN (:...ids)', {
            ids: distributedPackageIds,
          })
          .select('distributedPackage.id', 'distributedPackageId')
          .addSelect('recipeVersion.command_id', 'recipeId')
          .addSelect('recipeVersion.name', 'name')
          .addSelect('recipeVersion.slug', 'slug')
          .addSelect('recipeVersion.version', 'version')
          .getRawMany<CommandVersionRow>(),
        this.repository
          .createQueryBuilder('distribution')
          .innerJoin('distribution.distributedPackages', 'distributedPackage')
          .innerJoin('distributedPackage.skillVersions', 'skillVersion')
          .where('distributedPackage.id IN (:...ids)', {
            ids: distributedPackageIds,
          })
          .select('distributedPackage.id', 'distributedPackageId')
          .addSelect('skillVersion.skill_id', 'skillId')
          .addSelect('skillVersion.name', 'name')
          .addSelect('skillVersion.slug', 'slug')
          .addSelect('skillVersion.version', 'version')
          .getRawMany<SkillVersionRow>(),
      ]);

      type TargetBucket = {
        targetName: string;
        gitRepoId: string;
        standards: Map<string, OutdatedStandardDeployment>;
        recipes: Map<string, OutdatedCommandDeployment>;
        skills: Map<string, OutdatedSkillDeployment>;
      };

      const targets = new Map<string, TargetBucket>();

      const bucketFor = (row: LatestRow): TargetBucket => {
        const tId = row.targetId as string;
        const existing = targets.get(tId);
        if (existing) return existing;
        const created: TargetBucket = {
          targetName: row.targetName,
          gitRepoId: row.gitRepoId,
          standards: new Map(),
          recipes: new Map(),
          skills: new Map(),
        };
        targets.set(tId, created);
        return created;
      };

      // Seed buckets so targets with active packages but no artifacts still
      // appear (the use case relies on per-target indexing).
      for (const row of latestRows) {
        bucketFor(row);
      }

      for (const sv of standardRows) {
        const dp = dpById.get(sv.distributedPackageId);
        if (!dp) continue;
        const bucket = bucketFor(dp);
        if (bucket.standards.has(sv.standardId)) continue;
        bucket.standards.set(sv.standardId, {
          artifactId: sv.standardId,
          artifactName: sv.name,
          artifactSlug: sv.slug,
          deployedVersion: sv.version,
          deploymentDate: toIsoString(dp.deploymentDate),
          isDeleted: false,
        });
      }

      for (const rv of commandRows) {
        const dp = dpById.get(rv.distributedPackageId);
        if (!dp) continue;
        const bucket = bucketFor(dp);
        if (bucket.recipes.has(rv.recipeId)) continue;
        bucket.recipes.set(rv.recipeId, {
          artifactId: rv.recipeId,
          artifactName: rv.name,
          artifactSlug: rv.slug,
          deployedVersion: rv.version,
          deploymentDate: toIsoString(dp.deploymentDate),
          isDeleted: false,
        });
      }

      for (const sv of skillRows) {
        const dp = dpById.get(sv.distributedPackageId);
        if (!dp) continue;
        const bucket = bucketFor(dp);
        if (bucket.skills.has(sv.skillId)) continue;
        bucket.skills.set(sv.skillId, {
          artifactId: sv.skillId,
          artifactName: sv.name,
          artifactSlug: sv.slug,
          deployedVersion: sv.version,
          deploymentDate: toIsoString(dp.deploymentDate),
          isDeleted: false,
        });
      }

      const result: OutdatedDeploymentsByTarget[] = [];
      for (const [tId, bucket] of targets) {
        if (
          bucket.standards.size === 0 &&
          bucket.recipes.size === 0 &&
          bucket.skills.size === 0
        ) {
          continue;
        }
        result.push({
          targetId: tId as TargetId,
          targetName: bucket.targetName,
          gitRepoId: bucket.gitRepoId,
          standards: Array.from(bucket.standards.values()),
          recipes: Array.from(bucket.recipes.values()),
          skills: Array.from(bucket.skills.values()),
        });
      }

      this.logger.info('Outdated deployments found by space', {
        organizationId,
        spaceId,
        targetCount: result.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to find outdated deployments by space', {
        organizationId,
        spaceId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findActivePackageOperationsBySpace(
    spaceId: SpaceId,
  ): Promise<ActivePackageOperationRow[]> {
    this.logger.info('Listing active package operations by space ID', {
      spaceId,
    });
    try {
      type RawRow = {
        targetId: TargetId;
        packageId: PackageId;
        operation: 'add' | 'remove';
        status: DistributionStatus;
        lastDistributedAt: string;
      };

      const rows = await this.repository
        .createQueryBuilder('distribution')
        .innerJoin('distribution.distributedPackages', 'distributedPackage')
        .innerJoin('distributedPackage.package', 'package')
        .where('package.spaceId = :spaceId', { spaceId })
        .distinctOn(['distribution.target_id', 'distributedPackage.package_id'])
        .orderBy('distribution.target_id')
        .addOrderBy('distributedPackage.package_id')
        .addOrderBy('distribution.createdAt', 'DESC')
        .addOrderBy('distribution.id', 'DESC')
        .select('distribution.target_id', 'targetId')
        .addSelect('distributedPackage.package_id', 'packageId')
        .addSelect('distributedPackage.operation', 'operation')
        .addSelect('distribution.status', 'status')
        .addSelect('distribution.createdAt', 'lastDistributedAt')
        .getRawMany<RawRow>();

      const activeRows = rows.filter(
        (row) =>
          !(
            row.operation === 'remove' &&
            row.status === DistributionStatus.success
          ),
      );

      this.logger.info(
        'Active package operations listed by space ID successfully',
        { spaceId, total: rows.length, active: activeRows.length },
      );

      return activeRows.map((row) => ({
        targetId: row.targetId,
        packageId: row.packageId,
        lastDistributionStatus: row.status,
        lastDistributedAt: row.lastDistributedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to list active package operations by space', {
        spaceId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findLastSuccessfulDistributionDateByProviderIds(
    organizationId: OrganizationId,
    providerIds: GitProviderId[],
  ): Promise<Map<GitProviderId, string>> {
    this.logger.info(
      'Finding last successful distribution date by provider IDs',
      {
        organizationId,
        providerCount: providerIds.length,
      },
    );

    if (providerIds.length === 0) {
      return new Map();
    }

    try {
      type Row = { providerId: GitProviderId; lastDeployedAt: string };

      const rows = await this.repository
        .createQueryBuilder('distribution')
        .innerJoin('distribution.target', 'target')
        .innerJoin('target.gitRepo', 'gitRepo')
        .where('distribution.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('distribution.status = :status', {
          status: DistributionStatus.success,
        })
        .andWhere('gitRepo.providerId IN (:...providerIds)', {
          providerIds: providerIds as string[],
        })
        .groupBy('gitRepo.providerId')
        .select('gitRepo.provider_id', 'providerId')
        .addSelect('MAX(distribution.createdAt)', 'lastDeployedAt')
        .getRawMany<Row>();

      const result = new Map<GitProviderId, string>();
      for (const row of rows) {
        result.set(row.providerId, toIsoString(row.lastDeployedAt));
      }

      this.logger.info(
        'Last successful distribution date by provider IDs found',
        {
          organizationId,
          providerCount: providerIds.length,
          withDeploymentCount: result.size,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Failed to find last successful distribution date by provider IDs',
        {
          organizationId,
          providerCount: providerIds.length,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }
}
