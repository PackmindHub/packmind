import { PackmindInternalError } from '@packmind/types';

/**
 * A move could not be carried out end to end.
 *
 * Not a domain error: the caller asked for something legitimate and can do
 * nothing about the failure. Whatever the move had already written is rolled
 * back before this is thrown, so the packages are left as they were — even
 * when that means an artefact still belongs to several of them. `reverted`
 * says whether that rollback itself succeeded, since a failed rollback is the
 * one case where the caller is looking at a half-applied move.
 */
export class ArtefactsMoveFailedError extends PackmindInternalError {
  constructor(
    public readonly packageId: string,
    public readonly reverted: boolean,
    cause: unknown,
  ) {
    super(
      'artefacts_move_failed',
      {
        packageId,
        reverted,
        cause: cause instanceof Error ? cause.message : String(cause),
      },
      `Artefacts could not be moved to package ${packageId}; the move was ${
        reverted ? 'rolled back' : 'left partially applied'
      }.`,
    );
    this.name = 'ArtefactsMoveFailedError';
  }
}
