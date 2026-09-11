import { PackmindListener } from '@packmind/node-utils';
import { StandardUpdatedEvent } from '@packmind/types';

// UserEvent widens the declared payload with userId/organizationId/source, so
// the stub takes the emitted payload rather than StandardUpdatedPayload alone.
export interface StubStandardsAdapter {
  onStandardUpdated(payload: StandardUpdatedEvent['payload']): void;
}

export class StubStandardsListener extends PackmindListener<StubStandardsAdapter> {
  protected registerHandlers(): void {
    this.subscribe(StandardUpdatedEvent, this.handleStandardUpdated);
  }

  private handleStandardUpdated = (event: StandardUpdatedEvent): void => {
    this.adapter.onStandardUpdated(event.payload);
  };
}
