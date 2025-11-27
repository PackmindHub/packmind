import { PackmindListener } from '@packmind/node-utils';
import { StandardUpdatedEvent, StandardUpdatedPayload } from '@packmind/types';

export interface StubStandardsAdapter {
  onStandardUpdated(payload: StandardUpdatedPayload): void;
}

export class StubStandardsListener extends PackmindListener<StubStandardsAdapter> {
  protected registerHandlers(): void {
    this.subscribe(StandardUpdatedEvent, this.handleStandardUpdated);
  }

  private handleStandardUpdated = (event: StandardUpdatedEvent): void => {
    this.adapter.onStandardUpdated(event.payload);
  };
}
