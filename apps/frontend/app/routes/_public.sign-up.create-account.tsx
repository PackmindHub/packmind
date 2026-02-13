import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMHStack,
  PMPageSection,
} from '@packmind/ui';
import { useNavigate } from 'react-router';
import SignUpWithOrganizationForm from '../../src/domain/accounts/components/SignUpWithOrganizationForm';

export default function CreateAccountRouteModule() {
  const navigate = useNavigate();

  return (
    <PMVStack gap={4} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Manage your organization's AI playbook</PMHeading>
        <PMText color="secondary" mt={2}>
          Create your account to save, share, and collaborate on your AI
          playbook with your team
        </PMText>
      </PMBox>

      <SignUpWithOrganizationForm />

      <PMHStack
        justifyContent="center"
        paddingX={6}
        gap={4}
        wrap="wrap"
        borderTop={'solid 1px'}
        borderColor={'border.tertiary'}
        pt={4}
      >
        <PMHStack>
          <PMText color="secondary" variant="small">
            Already have an account?
          </PMText>
          <PMButton
            variant="ghost"
            size="xs"
            onClick={() => navigate('/sign-in')}
          >
            Sign in
          </PMButton>
        </PMHStack>
      </PMHStack>
    </PMVStack>
  );
}
