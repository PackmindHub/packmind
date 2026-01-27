import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import { SignUpSplashScreen } from '../../src/domain/accounts/components/SignUpSplashScreen';

export default function SignUpIndexRouteModule() {
  const { isAuthenticated } = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <SignUpSplashScreen
      onGetStarted={() => {
        navigate('/sign-up/create-account');
      }}
    />
  );
}
