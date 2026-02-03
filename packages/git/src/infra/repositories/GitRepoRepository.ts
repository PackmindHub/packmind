import { GitRepo } from '@packmind/types';
import { GitProviderId } from '@packmind/types';
import { IGitRepoRepository } from '../../domain/repositories/IGitRepoRepository';
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
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null> {
    this.logger.info('Finding git repo by owner and repo', { owner, repo });

    try {
      const gitRepo = await this.repository.findOne({
        where: { owner, repo },
        withDeleted: opts?.includeDeleted ?? false,
      });
      this.logger.info('Git repo found by owner and repo', {
        owner,
        repo,
        found: !!gitRepo,
      });
      return gitRepo;
    } catch (error) {
      this.logger.error('Failed to find git repo by owner and repo', {
        owner,
        repo,
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
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<GitRepo | null> {
    this.logger.info(
      'Finding git repo by owner, repo, branch, and organization',
      {
        owner,
        repo,
        branch,
        organizationId,
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
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  async findByProviderId(providerId: GitProviderId): Promise<GitRepo[]> {
    this.logger.info('Finding git repos by provider ID', { providerId });

    try {
      const gitRepos = await this.repository.find({ where: { providerId } });
      this.logger.info('Git repos found by provider ID', {
        providerId,
        count: gitRepos.length,
      });
      return gitRepos;
    } catch (error) {
      this.logger.error('Failed to find git repos by provider ID', {
        providerId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByOrganizationId(
    organizationId: OrganizationId,
  ): Promise<GitRepo[]> {
    this.logger.info('Finding git repos by organization ID', {
      organizationId,
    });

    try {
      const gitRepos = await this.repository
        .createQueryBuilder('gitRepo')
        .innerJoin(
          GitProviderSchema.options.name,
          'provider',
          'gitRepo.providerId = provider.id',
        )
        .where('provider.organizationId = :organizationId', { organizationId })
        .getMany();

      this.logger.info('Git repos found by organization ID', {
        organizationId,
        count: gitRepos.length,
      });
      return gitRepos;
    } catch (error) {
      this.logger.error('Failed to find git repos by organization ID', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async list(organizationId?: OrganizationId): Promise<GitRepo[]> {
    this.logger.info('Listing git repos', { organizationId });

    try {
      let gitRepos: GitRepo[];
      if (organizationId) {
        gitRepos = await this.findByOrganizationId(organizationId);
      } else {
        gitRepos = await this.repository.find();
      }

      this.logger.info('Git repos listed successfully', {
        organizationId,
        count: gitRepos.length,
      });
      return gitRepos;
    } catch (error) {
      this.logger.error('Failed to list git repos', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
