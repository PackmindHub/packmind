import { redirect, type LoaderFunctionArgs } from 'react-router';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const orgSlug = params.orgSlug;
  if (!orgSlug) {
    throw new Error('Organization slug is required');
  }

  // Redirect to CLI setup as the default
  throw redirect(`/org/${orgSlug}/setup/cli`);
}
