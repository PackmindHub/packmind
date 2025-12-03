import { IRepository } from '@packmind/types';
import {
  CliLoginCode,
  CliLoginCodeId,
  CliLoginCodeToken,
} from '../entities/CliLoginCode';

/**
 * CLI Login Code repository contract exposing persistence operations
 * required by CLI login use cases.
 */
export interface ICliLoginCodeRepository extends IRepository<CliLoginCode> {
  /**
   * Find a CLI login code by its token value.
   */
  findByCode(code: CliLoginCodeToken): Promise<CliLoginCode | null>;

  /**
   * Find a CLI login code by its ID.
   */
  findById(id: CliLoginCodeId): Promise<CliLoginCode | null>;

  /**
   * Save a CLI login code.
   */
  save(cliLoginCode: CliLoginCode): Promise<CliLoginCode>;

  /**
   * Delete a CLI login code by ID.
   */
  delete(id: CliLoginCodeId): Promise<void>;

  /**
   * Delete expired CLI login codes (cleanup operation).
   */
  deleteExpired(): Promise<number>;
}
