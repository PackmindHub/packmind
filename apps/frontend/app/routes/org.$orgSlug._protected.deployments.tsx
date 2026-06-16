import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { routes } from '../../src/shared/utils/routes';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  throw redirect(routes.org.toGovernance(params.orgSlug!));
}

export default function OrgDeploymentsRedirect() {
  return null;
}
