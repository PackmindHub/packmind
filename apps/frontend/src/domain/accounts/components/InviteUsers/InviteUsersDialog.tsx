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

interface InviteUsersDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const InviteUsersDialog: React.FC<InviteUsersDialogProps> = ({
  open,
  setOpen,
}) => {
  const [emails, setEmails] = React.useState<string[]>([]);
  const [role, setRole] = React.useState<'Admin' | 'Member'>('Member');
  const [emailError, setEmailError] = React.useState<string | null>(null);

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
    setRole(e.target.value as 'Admin' | 'Member');
  };

  const handleOnSubmit = () => {
    if (emails.length > MAX_EMAILS) return;
    console.log('Email sent to ', emails, 'with role', role);
    setOpen(false);
    setEmails([]);
    setRole('Member');
    setEmailError(null);
    pmToaster.create({
      type: 'success',
      title: 'Invites Sent',
      description: 'The invites have been sent successfully.',
    });
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
                    { value: 'Admin', label: 'Admin' },
                    { value: 'Member', label: 'Member' },
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
