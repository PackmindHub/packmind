import { PackmindLogger } from '../logger/PackmindLogger';
import { IRepository, QueryOption } from './IRepository';
import {
  EntitySchema,
  FindOptionsWhere,
  Repository,
  UpdateResult,
} from 'typeorm';
import assert from 'assert';
import { WithSoftDelete } from '../database/types';
import { BadRequestException } from '@nestjs/common';

export abstract class AbstractRepository<Entity extends { id: string }>
  implements IRepository<Entity>
{
  constructor(
    private readonly entityName: string,
    protected readonly repository: Repository<Entity>,
    protected readonly logger: PackmindLogger,
    private readonly schema: EntitySchema<WithSoftDelete<Entity>>,
  ) {}

  async add(entity: Entity): Promise<Entity> {
    this.logger.info(`Adding ${this.entityName} to database`, {
      id: entity.id,
    });

    try {
      const savedEntity = await this.repository.save(entity);
      this.logger.info(
        `Saved ${this.entityName} to database successfully`,
        this.loggableEntity(savedEntity),
      );
      return savedEntity;
    } catch (error) {
      // Check if it's a unique constraint violation
      if (error instanceof Error && error.message.includes('duplicate key')) {
        const customError = this.handleDuplicateKeyError(entity);
        this.logger.error(`Failed to save ${this.entityName} - duplicate key`, {
          entity: this.loggableEntity(entity),
          error: customError.message,
        });
        throw customError;
      }
      this.logger.error(`Failed to save ${this.entityName} to database`, {
        id: entity.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findById(id: Entity['id'], opts?: QueryOption): Promise<Entity | null> {
    this.logger.info(`Finding ${this.entityName} by ID`, { id });

    try {
      const where = { id } as FindOptionsWhere<Entity>;
      const entity = await this.repository.findOne({
        where,
        withDeleted: opts?.includeDeleted ?? false,
      });

      if (entity) {
        this.logger.info(
          `Found ${this.entityName} by ID`,
          this.loggableEntity(entity),
        );
      } else {
        this.logger.warn(`${this.entityName} not found by ID`, { id });
      }
      return entity;
    } catch (error) {
      this.logger.error(`Failed to find ${this.entityName} by ID`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteById(id: Entity['id'], deletedBy?: string): Promise<void> {
    this.logger.info(`Deleting ${this.entityName} by ID`, { id });

    try {
      const result = await this.softDelete(id, deletedBy);

      if (result.affected === 0) {
        this.logger.warn(`$No {this.entityName} for deletion`, { id });
        throw new Error(`No ${this.entityName} with id ${id} found`);
      }
      this.logger.info(`Successfully ${this.entityName} deleted`, { id });
    } catch (error) {
      this.logger.error(`Failed to delete ${this.entityName} by ID`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async restoreById(id: Entity['id']): Promise<void> {
    try {
      const result = await this.restore(id);

      if (result.affected === 0) {
        this.logger.warn(`No ${this.entityName} found for restoration`, {
          id,
        });
        return;
      }
      this.logger.info(`Successfully ${this.entityName} restored`, { id });
    } catch (error) {
      this.logger.error(`Failed to restore ${this.entityName} by ID`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  protected abstract loggableEntity(entity: Entity): Partial<Entity>;
  protected makeDuplicationErrorMessage(entity: Entity): string {
    return `Duplication error found when saving: ${JSON.stringify(entity)}`;
  }

  private handleDuplicateKeyError(entity: Entity): Error {
    return new BadRequestException(this.makeDuplicationErrorMessage(entity));
  }

  private async softDelete(
    id: Entity['id'],
    deletedBy?: string,
  ): Promise<UpdateResult> {
    let result: UpdateResult | undefined = undefined;

    await this.repository.manager.transaction(async (transaction) => {
      if (deletedBy) {
        await transaction.update(
          this.schema,
          { id },
          // @ts-expect-error TS2353
          { deletedBy },
        );
      }
      result = await transaction.softDelete(this.schema, { id });
    });

    assert(result);
    return result;
  }

  private async restore(id: Entity['id']): Promise<UpdateResult> {
    let result: UpdateResult | undefined = undefined;

    await this.repository.manager.transaction(async (transaction) => {
      await transaction.update(
        this.schema,
        { id },
        // @ts-expect-error TS2353
        { deletedBy: null },
      );
      result = await transaction.restore(this.schema, { id });
    });

    assert(result);
    return result;
  }
}
