import { PackmindListener } from '@packmind/node-utils';
import {
  UserSignedUpEvent,
  UserJoinedOrganizationEvent,
} from '@packmind/types';
import { CrispTrackEventService } from './CrispTrackEventService';

/**
 * Listens to domain events and forwards them to Crisp for CRM tracking.
 *
 * This listener subscribes to user lifecycle events and translates them
 * into Crisp people events for tracking user activity.
 */
export class CrispEventListener extends PackmindListener<CrispTrackEventService> {
  protected registerHandlers(): void {
    this.subscribe(UserSignedUpEvent, this.onUserSignedUp);
    this.subscribe(UserJoinedOrganizationEvent, this.onUserJoinedOrganization);
  }

  private onUserSignedUp = async (event: UserSignedUpEvent): Promise<void> => {
    const { email } = event.payload;
    await this.adapter.createPeopleIfNotAlreadyExists(email);
    await this.adapter.addPeopleEvent(email, 'user_signup');
  };

  private onUserJoinedOrganization = async (
    event: UserJoinedOrganizationEvent,
  ): Promise<void> => {
    const { email } = event.payload;
    await this.adapter.createPeopleIfNotAlreadyExists(email);
    await this.adapter.addPeopleEvent(email, 'user_joined_orga');
  };
}
