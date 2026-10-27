import React from 'react';
import { PMAlert } from '@packmind/ui';

export const SIGN_UP_INVITATION_ONLY_MESSAGE =
  'Sign-up is by invitation only on this instance. Ask an organization administrator to invite you.';

export const ORGANIZATION_CREATION_RESTRICTED_MESSAGE =
  'Organization creation is restricted on this instance. Ask an organization administrator to invite you.';

// Query param set by the social login callback when it refuses a new user.
export const ORGANIZATION_CREATION_RESTRICTED_ERROR =
  'organization-creation-restricted';

type InvitationOnlyNoticeProps = {
  message: string;
};

export function InvitationOnlyNotice({
  message,
}: Readonly<InvitationOnlyNoticeProps>) {
  return (
    <PMAlert.Root status="info" data-testid="invitation-only-notice">
      <PMAlert.Indicator />
      <PMAlert.Title>{message}</PMAlert.Title>
    </PMAlert.Root>
  );
}
