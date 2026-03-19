import { UserEvent } from '../../events';

export interface LinterCalledPayload {
  targetCount: number;
  standardCount: number;
}

export class LinterCalledEvent extends UserEvent<LinterCalledPayload> {
  static override readonly eventName = 'linter.detection.called';
}
