import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import { useState } from 'react';
import { SignUpSplashScreen } from '../../src/domain/accounts/components/SignUpSplashScreen';
import { SignUpOptions } from '../../src/domain/accounts/components/SignUpOptions';

export default function SignUpRouteModule() {
  const { isAuthenticated } = useIsAuthenticated();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  if (showSplash) {
    return (
      <SignUpSplashScreen
        // On itèrera sur le contenu plus tard
        onGetStarted={() => setShowSplash(false)}
      />
    );
  }
  return <SignUpOptions />;
}
