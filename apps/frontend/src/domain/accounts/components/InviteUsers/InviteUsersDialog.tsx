import React from 'react';
import {
  PMDialog,
  PMButton,
  PMCloseButton,
  PMButtonGroup,
  PMIcon,
  PMField,
  PMInput,
  PMNativeSelect,
  PMVStack,
  PMInputGroup,
  pmToaster,
} from '@packmind/ui';
import { LuMail } from 'react-icons/lu';
import validator from 'validator';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useInviteUsersMutation } from '../../../accounts/api/queries/AccountsQueries';
import { UserOrganizationRole } from '@packmind/types';

interface InviteUsersDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const InviteUsersDialog: React.FC<InviteUsersDialogProps> = ({
  open,
  setOpen,
}) => {
  const [emails, setEmails] = React.useState<string[]>([]);
  const [role, setRole] = React.useState<UserOrganizationRole>('member');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const { organization } = useAuthContext();
  const { mutateAsync: inviteUsers, isPending } = useInviteUsersMutation();

  const MAX_EMAILS = 200;

  const handleEmailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEmails = e.target.value
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
    if (inputEmails.length > MAX_EMAILS) {
      setEmailError(`Maximum ${MAX_EMAILS} emails allowed.`);
    } else if (inputEmails.some((email) => !validator.isEmail(email))) {
      setEmailError('One or more emails are invalid.');
    } else {
      setEmailError(null);
    }
    setEmails(inputEmails);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value as UserOrganizationRole);
  };

  const handleOnSubmit = async () => {
    if (emails.length === 0 || emails.length > MAX_EMAILS || emailError) return;

    if (!organization?.id) {
      pmToaster.create({
        type: 'error',
        title: 'No organization selected',
        description: 'Please select an organization before sending invites.',
      });
      return;
    }

    try {
      const result = await inviteUsers({
        emails,
        role,
      });

      setOpen(false);
      setEmails([]);
      setRole('member');
      setEmailError(null);

      const createdCount = result?.created?.length ?? 0;
      const directlyAddedCount = result?.organizationInvitations?.length ?? 0;
      const skippedCount = result?.skipped?.length ?? 0;
      const totalProcessed = createdCount + directlyAddedCount;

      pmToaster.create({
        type: 'success',
        title: 'Users Processed',
        description:
          skippedCount > 0
            ? `${totalProcessed} users processed (${createdCount} invites sent, ${directlyAddedCount} added directly). ${skippedCount} emails were skipped.`
            : `${totalProcessed} users processed successfully (${createdCount} invites sent, ${directlyAddedCount} added directly).`,
      });
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: 'Failed to send invites',
        description:
          (error as Error)?.message || 'An unexpected error occurred.',
      });
    }
  };

  return (
    <PMDialog.Root
      closeOnInteractOutside={false}
      open={open}
      onOpenChange={(details: { open: boolean }) => {
        setOpen(details.open);
      }}
      size={'lg'}
      scrollBehavior={'inside'}
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMDialog.Title>Invite users</PMDialog.Title>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
            <PMVStack gap={4} alignItems={'flex-start'}>
              <PMField.Root width={'md'} invalid={!!emailError}>
                <PMField.Label>Emails (max. {MAX_EMAILS})</PMField.Label>
                <PMInputGroup startElement={<LuMail />}>
                  <PMInput
                    placeholder="ex: alice@myorga.com, john@myorga.com"
                    onChange={handleEmailsChange}
                    maxLength={10000}
                  />
                </PMInputGroup>
                <PMField.HelperText>
                  Add multiple emails separated by commas.
                </PMField.HelperText>
                <PMField.ErrorText>{emailError}</PMField.ErrorText>
              </PMField.Root>

              <PMField.Root width={'fit-content'}>
                <PMField.Label>Default role</PMField.Label>
                <PMNativeSelect
                  value={role}
                  onChange={handleRoleChange}
                  items={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'member', label: 'Member' },
                  ]}
                />
              </PMField.Root>
            </PMVStack>
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMButtonGroup size={'sm'}>
              <PMDialog.Trigger asChild>
                <PMButton variant="tertiary">Cancel</PMButton>
              </PMDialog.Trigger>
              <PMButton
                variant="primary"
                onClick={handleOnSubmit}
                disabled={
                  isPending ||
                  emails.length === 0 ||
                  emails.length > MAX_EMAILS ||
                  !!emailError
                }
              >
                <PMIcon>
                  <LuMail />
                </PMIcon>
                Send Invites
              </PMButton>
            </PMButtonGroup>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
