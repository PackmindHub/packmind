import { PMHeading, PMVStack, PMBox, PMText, PMButton } from '@packmind/ui';
import { useNavigate } from 'react-router';
import SignInForm from '../../src/domain/accounts/components/SignInForm';

export default function SignInRoute() {
  const navigate = useNavigate();

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Sign In</PMHeading>
      </PMBox>

      <SignInForm />
      <PMBox mt={4} textAlign="center">
        <PMText>No account yet? </PMText>
        <PMButton
          variant="tertiary"
          size={'xs'}
          onClick={() => navigate('/sign-up')}
        >
          Sign up
        </PMButton>
      </PMBox>
    </PMVStack>
  );
}
