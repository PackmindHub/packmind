import { PackmindLogger } from '@packmind/logger';
import {
  IRepository,
  QueryOption,
  WithSoftDelete,
  CreatedBy,
  UserId,
} from '@packmind/types';
import {
  EntitySchema,
  FindOptionsWhere,
  In,
  Repository,
  UpdateResult,
} from 'typeorm';
import assert from 'assert';
import { BadRequestException } from '@nestjs/common';
import { instrumentMethods } from '../observability/instrumentMethods';

const origin = 'AbstractRepository';

export abstract class AbstractRepository<
  Entity extends { id: string },
> implements IRepository<Entity> {
  constructor(
    private readonly entityName: string,
    protected readonly repository: Repository<Entity>,
    private readonly schema: EntitySchema<WithSoftDelete<Entity>>,
    protected readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    // Since the pg instrumentation is off (see apps/api/src/otel.ts), this is
    // the only place a trace records database work at all: the repository
    // method is the span, and its duration is the query's. Datadog Database
    // Monitoring has the statement; this says which method asked for it.
    //
    // Covers the 26 subclasses of this class wherever they are constructed,
    // including the localDataSource default-argument path. Repositories that
    // do not extend it are instrumented by their *Repositories aggregator.
    instrumentMethods(this);
  }

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

  async addMany(entities: Entity[]): Promise<Entity[]> {
    if (entities.length === 0) {
      return [];
    }

    this.logger.info(
      `Adding ${entities.length} ${this.entityName}(s) to database`,
    );

    try {
      const savedEntities = await this.repository.save(entities);
      this.logger.info(
        `Saved ${savedEntities.length} ${this.entityName}(s) to database successfully`,
      );
      return savedEntities;
    } catch (error) {
      this.logger.error(`Failed to save ${this.entityName}(s) to database`, {
        count: entities.length,
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

  async hardDeleteById(id: Entity['id']): Promise<void> {
    this.logger.info(`Hard deleting ${this.entityName} by ID`, { id });

    try {
      const result = await this.repository.delete({
        id,
      } as FindOptionsWhere<Entity>);

      if (result.affected === 0) {
        this.logger.warn(`No ${this.entityName} found for hard deletion`, {
          id,
        });
        throw new Error(`No ${this.entityName} with id ${id} found`);
      }
      this.logger.info(`Successfully hard deleted ${this.entityName}`, { id });
    } catch (error) {
      this.logger.error(`Failed to hard delete ${this.entityName} by ID`, {
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

  /**
   * Resolves the authors of a whole list in a single query.
   *
   * Callers used to ask one `User.findOne` per entity while mapping a list, so
   * a 40-item page cost 40 round trips for what is usually a handful of
   * distinct authors — and the parallel fan-out drained the connection pool on
   * top of that. This queries the distinct ids once and returns a lookup map.
   *
   * Degrades like the per-entity version it replaced: a failure is logged and
   * swallowed, and unresolved ids are simply absent from the map, so callers
   * yield `createdBy: undefined` for those items instead of failing the list.
   */
  protected async getCreatedByMany(
    userIds: string[],
  ): Promise<Map<UserId, CreatedBy>> {
    const createdByUserId = new Map<UserId, CreatedBy>();
    const distinctUserIds = [...new Set(userIds.filter(Boolean))];

    if (distinctUserIds.length === 0) {
      return createdByUserId;
    }

    try {
      const users = (await this.repository.manager.getRepository('User').find({
        where: { id: In(distinctUserIds) },
        select: ['id', 'email', 'displayName'],
      })) as {
        id: string;
        email: string;
        displayName: string | null;
      }[];

      for (const user of users) {
        const displayName =
          user.displayName ?? user.email.split('@')[0] ?? 'Unknown';
        createdByUserId.set(user.id as UserId, {
          userId: user.id as UserId,
          displayName,
        });
      }
    } catch (error) {
      this.logger.warn('Failed to fetch user info', {
        userCount: distinctUserIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return createdByUserId;
  }

  protected makeDuplicationErrorMessage(entity: Entity): string {
    const loggableFields = this.loggableEntity(entity);
    return `Duplication error found when saving ${this.entityName}: ${JSON.stringify(loggableFields)}`;
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
