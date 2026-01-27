import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMHStack,
} from '@packmind/ui';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import SignUpWithOrganizationForm from '../../src/domain/accounts/components/SignUpWithOrganizationForm';

export default function CreateAccountRouteModule() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/sign-up/create-account', { replace: true });
  }, [navigate]);

  return null;
}
