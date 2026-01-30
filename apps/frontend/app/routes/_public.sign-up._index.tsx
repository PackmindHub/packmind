import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import { SignUpSplashScreen } from '../../src/domain/accounts/components/SignUpSplashScreen';

export default function SignUpIndexRouteModule() {
  const { isAuthenticated } = useIsAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect if user is on the sign-up flow (e.g., /sign-up/onboarding-reason)
    // This allows authenticated users to complete their onboarding
    if (isAuthenticated && !location.pathname.startsWith('/sign-up/')) {
      navigate('/');
    }
  }, [isAuthenticated, navigate, location.pathname]);

  return (
    <SignUpSplashScreen
      onGetStarted={() => {
        navigate('/sign-up/create-account');
      }}
      onSignIn={() => {
        navigate('/sign-in');
      }}
    />
  );
}
