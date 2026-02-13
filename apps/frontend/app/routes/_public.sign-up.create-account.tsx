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
import { StartProductTour } from '../../src/shared/components/StartProductTour';

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

      <PMBox paddingX={6}>
        <PMPageSection
          titleComponent={
            <PMHeading level="h5">I just want to explore</PMHeading>
          }
          boxProps={{
            borderRadius: 'lg',
          }}
        >
          <PMText variant="small">
            You can start exploring Packmind and taking a tour of the product
            right away. No account needed.
          </PMText>
          <StartProductTour
            triggerText="🚀 Show me a tour"
            variant="secondary"
            size="xs"
          />
        </PMPageSection>
      </PMBox>

      <SignUpWithOrganizationForm />

      <PMHStack justifyContent="center" paddingX={6} gap={4} wrap="wrap">
        <PMHStack>
          <PMText color="secondary">Already have an account?</PMText>
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
