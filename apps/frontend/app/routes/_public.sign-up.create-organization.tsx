import { useNavigate } from 'react-router';
import { CreateOrganizationForm } from '../../src/domain/accounts/components/CreateOrganizationForm';

export default function CreateOrganizationRouteModule() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/sign-up/onboarding-reason');
  };

  return <CreateOrganizationForm onSuccess={handleSuccess} />;
}
