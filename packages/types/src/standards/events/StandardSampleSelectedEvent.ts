import { UserEvent } from '../../events';
import { SpaceId } from '../../spaces';

export interface StandardSampleSelectedPayload {
  sampleId: string;
  sampleType: 'language' | 'framework';
  spaceId: SpaceId;
}

export class StandardSampleSelectedEvent extends UserEvent<StandardSampleSelectedPayload> {
  static override readonly eventName = 'standards.sample.selected';
}
