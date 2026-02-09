import { PackmindLogger, LogLevel } from '@packmind/logger';
import { Target, GitRepoId, TargetId, OrganizationId } from '@packmind/types';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';

const origin = 'TargetService';

export class TargetService {
  constructor(
    private readonly targetRepository: ITargetRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('TargetService initialized');
  }

  async findById(targetId: TargetId): Promise<Target | null> {
    this.logger.info('Finding target by ID', {
      targetId,
    });

    try {
      const target = await this.targetRepository.findById(targetId);

      if (target) {
        this.logger.info('Target found successfully', {
          targetId,
          name: target.name,
        });
      } else {
        this.logger.info('Target not found', {
          targetId,
        });
      }

      return target;
    } catch (error) {
      this.logger.error('Failed to find target by ID', {
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByIdsInOrganization(
    targetIds: TargetId[],
    organizationId: OrganizationId,
  ): Promise<Target[]> {
    this.logger.info('Finding targets by IDs within organization', {
      targetIdsCount: targetIds.length,
      organizationId,
    });

    try {
      const targets = await this.targetRepository.findByIdsInOrganization(
        targetIds,
        organizationId,
      );

      this.logger.info('Targets found by IDs within organization', {
        organizationId,
        requestedCount: targetIds.length,
        foundCount: targets.length,
      });

      return targets;
    } catch (error) {
      this.logger.error('Failed to find targets by IDs within organization', {
        organizationId,
        targetIdsCount: targetIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
