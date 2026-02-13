import {
  PMHeading,
  PMVStack,
  PMBox,
  PMText,
  PMButton,
  PMHStack,
  PMLink,
} from '@packmind/ui';
import { useNavigate, Link } from 'react-router';
import SignInForm from '../../src/domain/accounts/components/SignInForm';
import { StartProductTour } from '../../src/shared/components/StartProductTour';

export default function SignInRoute() {
  const navigate = useNavigate();

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Sign In</PMHeading>
      </PMBox>

      <SignInForm />

      <PMBox mt={4} textAlign="center">
        <PMHStack justify="center" gap={4} wrap="wrap">
          <PMHStack>
            <PMText>No account yet? </PMText>
            <PMLink>
              <Link to="/sign-up/create-account" prefetch="intent">
                Sign up
              </Link>
            </PMLink>
            or
            <StartProductTour
              triggerText="🚀 Discover Packmind"
              variant="ghost"
              size="xs"
            />
          </PMHStack>
        </PMHStack>
      </PMBox>
    </PMVStack>
  );
}
