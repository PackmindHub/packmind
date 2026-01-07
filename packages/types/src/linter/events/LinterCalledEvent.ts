import { UserEvent } from '../../events';
import { GitRepoId } from '../../git';

export interface LinterCalledPayload {
  gitRepoId: GitRepoId;
  targetCount: number;
  standardCount: number;
}

export class LinterCalledEvent extends UserEvent<LinterCalledPayload> {
  static override readonly eventName = 'linter.detection.called';
}
