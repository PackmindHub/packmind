import {
  StandardVersion,
  StandardVersionId,
} from '../entities/StandardVersion';
import { StandardId } from '../entities/Standard';
import { IRepository } from '@packmind/shared';

export interface IStandardVersionRepository
  extends IRepository<StandardVersion> {
  list(): Promise<StandardVersion[]>;
  findByStandardId(standardId: StandardId): Promise<StandardVersion[]>;
  findLatestByStandardId(
    standardId: StandardId,
  ): Promise<StandardVersion | null>;
  findByStandardIdAndVersion(
    standardId: StandardId,
    version: number,
  ): Promise<StandardVersion | null>;
  updateSummary(
    standardVersionId: StandardVersionId,
    summary: string,
  ): Promise<number | undefined>;
}
