import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import { SignUpOptions } from '../../src/domain/accounts/components/SignUpOptions';

export default function SignUpRouteModule() {
  const { isAuthenticated } = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return <SignUpOptions />;
}
