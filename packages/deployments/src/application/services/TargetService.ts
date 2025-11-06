import { PackmindLogger, LogLevel } from '@packmind/logger';
import { Target, GitRepoId, TargetId, IGitPort } from '@packmind/types';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';

const origin = 'TargetService';

export class TargetService {
  constructor(
    private readonly targetRepository: ITargetRepository,
    private readonly gitPort: IGitPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('TargetService initialized');
  }

  async getTargetsByGitRepoId(gitRepoId: GitRepoId): Promise<Target[]> {
    this.logger.info('Getting targets by git repository ID', {
      gitRepoId,
    });

    try {
      const targets = await this.targetRepository.findByGitRepoId(gitRepoId);

      this.logger.info('Targets found by git repository ID successfully', {
        gitRepoId,
        count: targets.length,
      });

      return targets;
    } catch (error) {
      this.logger.error('Failed to get targets by git repository ID', {
        gitRepoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addTarget(target: Target): Promise<Target> {
    this.logger.info('Adding target', {
      targetId: target.id,
      name: target.name,
      gitRepoId: target.gitRepoId,
    });

    try {
      const savedTarget = await this.targetRepository.add(target);

      this.logger.info('Target added successfully', {
        targetId: savedTarget.id,
        name: savedTarget.name,
      });

      return savedTarget;
    } catch (error) {
      this.logger.error('Failed to add target', {
        targetId: target.id,
        name: target.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRepositoryByTargetId(targetId: TargetId) {
    this.logger.info('Getting repository by target ID', {
      targetId,
    });

    try {
      const target = await this.targetRepository.findById(targetId);
      if (!target) {
        this.logger.error('Target not found', { targetId });
        throw new Error(`Target with id ${targetId} not found`);
      }

      const repository = await this.gitPort.getRepositoryById(target.gitRepoId);
      if (!repository) {
        this.logger.error('Repository not found for target', {
          targetId,
          gitRepoId: target.gitRepoId,
        });
        throw new Error(`Repository with id ${target.gitRepoId} not found`);
      }

      this.logger.info('Repository found for target successfully', {
        targetId,
        repositoryId: repository.id,
        owner: repository.owner,
        repo: repository.repo,
      });

      return { target, repository };
    } catch (error) {
      this.logger.error('Failed to get repository by target ID', {
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateTarget(
    targetId: TargetId,
    updates: Partial<Pick<Target, 'name' | 'path'>>,
  ): Promise<Target> {
    this.logger.info('Updating target', {
      targetId,
      updates,
    });

    try {
      const updatedTarget = await this.targetRepository.updateById(
        targetId,
        updates,
      );

      this.logger.info('Target updated successfully', {
        targetId: updatedTarget.id,
        name: updatedTarget.name,
        path: updatedTarget.path,
      });

      return updatedTarget;
    } catch (error) {
      this.logger.error('Failed to update target', {
        targetId,
        updates,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteTarget(targetId: TargetId): Promise<void> {
    this.logger.info('Deleting target', {
      targetId,
    });

    try {
      // First check if target exists and get its details for validation
      const target = await this.targetRepository.findById(targetId);
      if (!target) {
        throw new Error(`Target with id ${targetId} not found`);
      }

      // Prevent deletion of Root target (path '/')
      if (target.path === '/') {
        throw new Error('Root target cannot be deleted');
      }

      await this.targetRepository.deleteById(targetId);

      this.logger.info('Target deleted successfully', {
        targetId,
        name: target.name,
        path: target.path,
      });
    } catch (error) {
      this.logger.error('Failed to delete target', {
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
