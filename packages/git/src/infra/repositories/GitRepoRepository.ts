import { GitRepo } from '@packmind/types';
import { GitProviderId } from '@packmind/types';
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

  async findByOwnerAndRepoInOrganization(
    owner: string,
    repo: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'> & {
      type?: GitRepoTypeFilter;
    },
  ): Promise<GitRepo | null> {
    const type: GitRepoTypeFilter = opts?.type ?? 'standard';

    this.logger.info('Finding git repo by owner, repo, and organization', {
      owner,
      repo,
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
        .where('gitRepo.owner = :owner', { owner })
        .andWhere('gitRepo.repo = :repo', { repo })
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

      this.logger.info('Git repo found by owner, repo, and organization', {
        owner,
        repo,
        organizationId,
        type,
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
