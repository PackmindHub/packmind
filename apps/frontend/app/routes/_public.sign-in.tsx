import { PMHeading, PMVStack, PMBox, PMText, PMButton } from '@packmind/ui';
import { useNavigate, Link } from 'react-router';
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
        <Link to="/sign-up/create-account" prefetch="intent">
          <PMButton variant="tertiary" size={'xs'} tabIndex={-1}>
            Sign up
          </PMButton>
        </Link>
      </PMBox>
    </PMVStack>
  );
}
