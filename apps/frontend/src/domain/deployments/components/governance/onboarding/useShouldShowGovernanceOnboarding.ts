import { useSearchParams } from 'react-router';

export function useShouldShowGovernanceOnboarding(): boolean {
  const [searchParams] = useSearchParams();
  return searchParams.get('onboarding') === '1';
}
