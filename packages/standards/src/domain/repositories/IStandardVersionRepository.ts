import {
  IRepository,
  SpaceId,
  StandardId,
  StandardVersion,
} from '@packmind/types';

export interface IStandardVersionRepository extends IRepository<StandardVersion> {
  findByStandardId(standardId: StandardId): Promise<StandardVersion[]>;
  findLatestByStandardId(
    standardId: StandardId,
  ): Promise<StandardVersion | null>;
  /**
   * Batched sibling of `findLatestByStandardId`: the latest version of every
   * given standard in one query, and without hydrating any relation.
   */
  findLatestByStandardIds(
    standardIds: StandardId[],
  ): Promise<StandardVersion[]>;
  findByStandardIdAndVersion(
    standardId: StandardId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<StandardVersion | null>;
}
