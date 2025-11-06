import { Factory } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  Invitation,
  createInvitationId,
  createInvitationToken,
} from '../src/domain/entities/Invitation';
import { createUserId } from '@packmind/types';

export const invitationFactory: Factory<Invitation> = (
  invitation?: Partial<Invitation>,
) => {
  return {
    id: createInvitationId(uuidv4()),
    userId: createUserId(uuidv4()),
    token: createInvitationToken(Buffer.from(uuidv4()).toString('base64url')),
    expirationDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    ...invitation,
  };
};
