import { IUseCase } from '../../UseCase';
import {
  RecomputeConflictsCommand,
  RecomputeConflictsResponse,
} from './IRecomputeConflicts';

// Pagination is a proprietary-only extension of the plain RecomputeConflicts
// contract above: the OSS edition ships only a stub adapter for
// recomputeConflicts (it throws "Method not implemented"), so paging the
// unselected pending proposals is behaviour that only exists in the
// proprietary repo. This type lives here anyway, alongside the base
// contract, so both repos can import the identical shape rather than each
// declaring their own copy that can drift out of sync.
export type PaginatedRecomputeConflictsCommand = RecomputeConflictsCommand & {
  page?: number;
};

export type PaginatedRecomputeConflictsResponse = RecomputeConflictsResponse & {
  // The full selected set (the keys of `decisions`) is always folded into the
  // projection, but only a bounded page of the *unselected* pending proposals
  // is tested against it. `totalPendingCount` counts that paged, unselected
  // population so the caller can drain every page and merge the verdict maps.
  totalPendingCount: number;
  page: number;
  pageSize: number;
};

export type IPaginatedRecomputeConflictsUseCase = IUseCase<
  PaginatedRecomputeConflictsCommand,
  PaginatedRecomputeConflictsResponse
>;
