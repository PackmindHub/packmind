import { GitRepo } from '@packmind/types';
import { GitProviderId } from '@packmind/types';
import { GitRepoId } from '@packmind/types';
import {
  IGitRepoRepository,
  GitRepoTypeFilter,
} from '../../domain/repositories/IGitRepoRepository';
import { GitRepoSchema } from '../schemas/GitRepoSchema';
import { GitProviderSchema } from '../schemas/GitProviderSchema';
import { Repository } from 'typeorm';
import { OrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { QueryOption } from '@packmind/types';

const origin = 'GitRepoRepository';

export class GitRepoRepository
  extends AbstractRepository<GitRepo>
  implements IGitRepoRepository
{
  constructor(
    repository: Repository<GitRepo> = localDataSource.getRepository<GitRepo>(
      GitRepoSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('gitRepo', repository, GitRepoSchema, logger);
    this.logger.info('GitRepoRepository initialized');
  }

  protected override loggableEntity(entity: GitRepo): Partial<GitRepo> {
    return {
      id: entity.id,
      owner: entity.owner,
      repo: entity.repo,
    };
  }

  async findByOwnerAndRepo(
    owner: string,
    repo: string,
    opts?: Pick<QueryOption, 'includeDeleted'> & {
      type?: GitRepoTypeFilter;
    },
  ): Promise<GitRepo | null> {
    const type: GitRepoTypeFilter = opts?.type ?? 'standard';

    this.logger.info('Finding git repo by owner and repo', {
      owner,
      repo,
      type,
    });

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('gitRepo')
        .where('gitRepo.owner = :owner', { owner })
        .andWhere('gitRepo.repo = :repo', { repo });

      if (type !== 'any') {
        queryBuilder.andWhere('gitRepo.type = :type', { type });
      }

      if (opts?.includeDeleted) {
        queryBuilder.withDeleted();
      }

      const gitRepo = await queryBuilder.getOne();
      this.logger.info('Git repo found by owner and repo', {
        owner,
        repo,
        type,
        found: !!gitRepo,
      });
      return gitRepo;
    } catch (error) {
      this.logger.error('Failed to find git repo by owner and repo', {
        owner,
        repo,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOwnerRepoAndBranchInOrganization(
    owner: string,
    repo: string,
    branch: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'> & {
      type?: GitRepoTypeFilter;
    },
  ): Promise<GitRepo | null> {
    const type: GitRepoTypeFilter = opts?.type ?? 'standard';

    this.logger.info(
      'Finding git repo by owner, repo, branch, and organization',
      {
        owner,
        repo,
        branch,
        organizationId,
        type,
      },
    );

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('gitRepo')
        .innerJoin(
          GitProviderSchema.options.name,
          'provider',
          'gitRepo.providerId = provider.id',
        )
        .where('gitRepo.owner = :owner', { owner })
        .andWhere('gitRepo.repo = :repo', { repo })
        .andWhere('gitRepo.branch = :branch', { branch })
        .andWhere('provider.organizationId = :organizationId', {
          organizationId,
        });

      if (type !== 'any') {
        queryBuilder.andWhere('gitRepo.type = :type', { type });
      }

      if (opts?.includeDeleted) {
        queryBuilder.withDeleted();
      }

      const gitRepo = await queryBuilder.getOne();

      this.logger.info(
        'Git repo found by owner, repo, branch, and organization',
        {
          owner,
          repo,
          branch,
          organizationId,
          type,
          found: !!gitRepo,
        },
      );
      return gitRepo;
    } catch (error) {
      this.logger.error(
        'Failed to find git repo by owner, repo, branch, and organization',
        {
          owner,
          repo,
          branch,
          organizationId,
          type,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findTrackedByOwnerRepoInOrganization(
    organizationId: OrganizationId,
    owner: string,
    repo: string,
  ): Promise<GitRepo | null> {
    this.logger.info('Finding tracked git repo by owner, repo, organization', {
      organizationId,
      owner,
      repo,
    });

    try {
      const gitRepo = await this.repository
        .createQueryBuilder('gitRepo')
        .innerJoin(
          GitProviderSchema.options.name,
          'provider',
          'gitRepo.providerId = provider.id',
        )
        .where('gitRepo.owner = :owner', { owner })
        .andWhere('gitRepo.repo = :repo', { repo })
        .andWhere('gitRepo.isTracked = :isTracked', { isTracked: true })
        .andWhere('provider.organizationId = :organizationId', {
          organizationId,
        })
        .getOne();

      this.logger.info('Tracked git repo lookup completed', {
        organizationId,
        owner,
        repo,
        found: !!gitRepo,
      });
      return gitRepo;
    } catch (error) {
      this.logger.error('Failed to find tracked git repo', {
        organizationId,
        owner,
        repo,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateTracked(
    gitRepoId: GitRepoId,
    isTracked: boolean,
  ): Promise<GitRepo> {
    this.logger.info('Updating git repo tracked flag', {
      gitRepoId,
      isTracked,
    });

    try {
      const gitRepo = await this.repository.findOne({
        where: { id: gitRepoId },
      });

      if (!gitRepo) {
        throw new Error(`Git repo with ID '${gitRepoId}' not found`);
      }

      const updated = await this.repository.save({
        ...gitRepo,
        isTracked,
        // Setting tracking clears any earlier removal — re-tracking is exactly
        // what restores a repository's hidden history. Doing it here rather
        // than in the use cases keeps both re-tracking entry points
        // (SetTrackedRepositoryUseCase, UpdateTrackedBranchUseCase) correct
        // without either having to remember.
        trackingRemovedAt: isTracked ? null : gitRepo.trackingRemovedAt,
      });

      this.logger.info('Git repo tracked flag updated', {
        gitRepoId,
        isTracked,
      });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update git repo tracked flag', {
        gitRepoId,
        isTracked,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async markTrackingRemoved(gitRepoId: GitRepoId): Promise<GitRepo> {
    this.logger.info('Marking git repo tracking as removed', { gitRepoId });

    try {
      const gitRepo = await this.repository.findOne({
        where: { id: gitRepoId },
      });

      if (!gitRepo) {
        throw new Error(`Git repo with ID '${gitRepoId}' not found`);
      }

      const updated = await this.repository.save({
        ...gitRepo,
        isTracked: false,
        trackingRemovedAt: new Date(),
      });

      this.logger.info('Git repo tracking marked as removed', { gitRepoId });
      return updated;
    } catch (error) {
      this.logger.error('Failed to mark git repo tracking as removed', {
        gitRepoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOwnerAndRepoInOrganization(
    owner: string,
    repo: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'> & {
      type?: GitRepoTypeFilter;
      providerId?: GitProviderId;
    },
  ): Promise<GitRepo | null> {
    const type: GitRepoTypeFilter = opts?.type ?? 'standard';

    this.logger.info('Finding git repo by owner, repo, and organization', {
      owner,
      repo,
      organizationId,
      type,
      providerId: opts?.providerId,
    });

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('gitRepo')
        .innerJoin(
          GitProviderSchema.options.name,
          'provider',
          'gitRepo.providerId = provider.id',
        )
        .where('gitRepo.owner = :owner', { owner })
        .andWhere('gitRepo.repo = :repo', { repo })
        .andWhere('provider.organizationId = :organizationId', {
          organizationId,
        });

      if (type !== 'any') {
        queryBuilder.andWhere('gitRepo.type = :type', { type });
      }

      if (opts?.providerId) {
        queryBuilder.andWhere('gitRepo.providerId = :providerId', {
          providerId: opts.providerId,
        });
      }

      if (opts?.includeDeleted) {
        queryBuilder.withDeleted();
      }

      const gitRepo = await queryBuilder.getOne();

      this.logger.info('Git repo found by owner, repo, and organization', {
        owner,
        repo,
        organizationId,
        type,
        providerId: opts?.providerId,
        found: !!gitRepo,
      });
      return gitRepo;
    } catch (error) {
      this.logger.error(
        'Failed to find git repo by owner, repo, and organization',
        {
          owner,
          repo,
          organizationId,
          type,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByProviderId(
    providerId: GitProviderId,
    opts?: { type?: GitRepoTypeFilter },
  ): Promise<GitRepo[]> {
    const type: GitRepoTypeFilter = opts?.type ?? 'standard';

    this.logger.info('Finding git repos by provider ID', {
      providerId,
      type,
    });

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('gitRepo')
        .where('gitRepo.providerId = :providerId', { providerId });

      if (type !== 'any') {
        queryBuilder.andWhere('gitRepo.type = :type', { type });
      }

      const gitRepos = await queryBuilder.getMany();

      this.logger.info('Git repos found by provider ID', {
        providerId,
        type,
        count: gitRepos.length,
      });
      return gitRepos;
    } catch (error) {
      this.logger.error('Failed to find git repos by provider ID', {
        providerId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOrganizationId(
    organizationId: OrganizationId,
    opts?: { type?: GitRepoTypeFilter },
  ): Promise<GitRepo[]> {
    const type: GitRepoTypeFilter = opts?.type ?? 'standard';

    this.logger.info('Finding git repos by organization ID', {
      organizationId,
      type,
    });

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('gitRepo')
        .innerJoin(
          GitProviderSchema.options.name,
          'provider',
          'gitRepo.providerId = provider.id',
        )
        .where('provider.organizationId = :organizationId', {
          organizationId,
        });

      if (type !== 'any') {
        queryBuilder.andWhere('gitRepo.type = :type', { type });
      }

      const gitRepos = await queryBuilder.getMany();

      this.logger.info('Git repos found by organization ID', {
        organizationId,
        type,
        count: gitRepos.length,
      });
      return gitRepos;
    } catch (error) {
      this.logger.error('Failed to find git repos by organization ID', {
        organizationId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async list(
    organizationId?: OrganizationId,
    opts?: { type?: GitRepoTypeFilter },
  ): Promise<GitRepo[]> {
    const type: GitRepoTypeFilter = opts?.type ?? 'standard';

    this.logger.info('Listing git repos', { organizationId, type });

    try {
      let gitRepos: GitRepo[];
      if (organizationId) {
        gitRepos = await this.findByOrganizationId(organizationId, { type });
      } else {
        const queryBuilder = this.repository.createQueryBuilder('gitRepo');
        if (type !== 'any') {
          queryBuilder.where('gitRepo.type = :type', { type });
        }
        gitRepos = await queryBuilder.getMany();
      }

      this.logger.info('Git repos listed successfully', {
        organizationId,
        type,
        count: gitRepos.length,
      });
      return gitRepos;
    } catch (error) {
      this.logger.error('Failed to list git repos', {
        organizationId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
