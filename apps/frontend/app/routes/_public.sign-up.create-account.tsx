import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMHStack,
} from '@packmind/ui';
import { useNavigate } from 'react-router';
import SignUpWithOrganizationForm from '../../src/domain/accounts/components/SignUpWithOrganizationForm';

export default function CreateAccountRouteModule() {
  const navigate = useNavigate();

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Manage your organization's AI playbook</PMHeading>
        <PMText color="secondary" mt={2}>
          Create your account to save, share, and collaborate on your AI
          playbook with your team
        </PMText>
      </PMBox>

      <SignUpWithOrganizationForm />

      <PMHStack justifyContent="center" paddingX={6}>
        <PMText>Already have an account?</PMText>
        <PMButton
          variant="tertiary"
          size="xs"
          onClick={() => navigate('/sign-in')}
        >
          Sign in
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
}
