import { GitRepo } from '@packmind/types';
import { GitProviderId } from '@packmind/types';
import { GitRepoId } from '@packmind/types';
import {
  IGitRepoRepository,
  GitRepoTypeFilter,
} from '../../domain/repositories/IGitRepoRepository';
import { GitRepoSchema } from '../schemas/GitRepoSchema';
import { GitProviderSchema } from '../schemas/GitProviderSchema';
import { In, Repository } from 'typeorm';
import { OrganizationId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { QueryOption } from '@packmind/types';
import { GitRepoNotFoundError } from '@packmind/types';

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
        // Hosts treat owner and repo case-insensitively, so a CLI clone and
        // the provider API can spell the same repository differently.
        .where('LOWER(gitRepo.owner) = LOWER(:owner)', { owner })
        .andWhere('LOWER(gitRepo.repo) = LOWER(:repo)', { repo })
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
    opts?: { providerId?: GitProviderId },
  ): Promise<GitRepo | null> {
    this.logger.info('Finding tracked git repo by owner, repo, organization', {
      organizationId,
      owner,
      repo,
    });

    try {
      const queryBuilder = this.repository
        .createQueryBuilder('gitRepo')
        .innerJoin(
          GitProviderSchema.options.name,
          'provider',
          'gitRepo.providerId = provider.id',
        )
        // Hosts treat owner and repo case-insensitively, and an adoption
        // records the owner as the provider spells it.
        .where('LOWER(gitRepo.owner) = LOWER(:owner)', { owner })
        .andWhere('LOWER(gitRepo.repo) = LOWER(:repo)', { repo })
        .andWhere('gitRepo.isTracked = :isTracked', { isTracked: true })
        .andWhere('provider.organizationId = :organizationId', {
          organizationId,
        });

      if (opts?.providerId) {
        queryBuilder.andWhere('gitRepo.providerId = :providerId', {
          providerId: opts.providerId,
        });
      }

      const gitRepo = await queryBuilder.getOne();

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
        throw new GitRepoNotFoundError(gitRepoId);
      }

      const updated = await this.repository.save({
        ...gitRepo,
        isTracked,
        // Re-tracking is what restores a repository's hidden history, so the
        // removal stamp is cleared here rather than in each of the two
        // re-tracking use cases.
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
        throw new GitRepoNotFoundError(gitRepoId);
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

  async reassignProvider(
    gitRepoId: GitRepoId,
    providerId: GitProviderId,
    owner?: string,
  ): Promise<GitRepo> {
    this.logger.info('Reassigning git repo provider', {
      gitRepoId,
      providerId,
    });

    try {
      const gitRepo = await this.repository.findOne({
        where: { id: gitRepoId },
      });

      if (!gitRepo) {
        throw new GitRepoNotFoundError(gitRepoId);
      }

      const updated = await this.repository.save({
        ...gitRepo,
        providerId,
        owner: owner ?? gitRepo.owner,
      });

      this.logger.info('Git repo provider reassigned', {
        gitRepoId,
        providerId,
      });
      return updated;
    } catch (error) {
      this.logger.error('Failed to reassign git repo provider', {
        gitRepoId,
        providerId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async clearTrackingRemoved(
    owner: string,
    repo: string,
    organizationId: OrganizationId,
  ): Promise<void> {
    this.logger.info('Clearing tracking removal on every branch', {
      owner,
      repo,
      organizationId,
    });

    try {
      const stamped = await this.repository
        .createQueryBuilder('gitRepo')
        .innerJoin(
          GitProviderSchema.options.name,
          'provider',
          'gitRepo.providerId = provider.id',
        )
        .where('LOWER(gitRepo.owner) = LOWER(:owner)', { owner })
        .andWhere('LOWER(gitRepo.repo) = LOWER(:repo)', { repo })
        .andWhere('provider.organizationId = :organizationId', {
          organizationId,
        })
        .andWhere('gitRepo.trackingRemovedAt IS NOT NULL')
        .getMany();

      if (stamped.length > 0) {
        await this.repository.update(
          { id: In(stamped.map((gitRepo) => gitRepo.id)) },
          { trackingRemovedAt: null },
        );
      }

      this.logger.info('Tracking removal cleared', {
        owner,
        repo,
        organizationId,
        clearedCount: stamped.length,
      });
    } catch (error) {
      this.logger.error('Failed to clear tracking removal', {
        owner,
        repo,
        organizationId,
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
        .where('LOWER(gitRepo.owner) = LOWER(:owner)', { owner })
        .andWhere('LOWER(gitRepo.repo) = LOWER(:repo)', { repo })
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
}
