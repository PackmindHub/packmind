import { IRepository } from '@packmind/types';
import {
  CliLoginCode,
  CliLoginCodeId,
  CliLoginCodeToken,
} from '../entities/CliLoginCode';

export interface ICliLoginCodeRepository extends IRepository<CliLoginCode> {
  findByCode(code: CliLoginCodeToken): Promise<CliLoginCode | null>;

  findById(id: CliLoginCodeId): Promise<CliLoginCode | null>;

  save(cliLoginCode: CliLoginCode): Promise<CliLoginCode>;

  delete(id: CliLoginCodeId): Promise<void>;

  // Resolves to the number of rows removed.
  deleteExpired(): Promise<number>;
}
