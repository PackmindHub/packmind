import { useParams } from 'react-router';
import { useGetSpaceBySlugQuery } from '../api/queries/SpacesQueries';

export function useCurrentSpace() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();

  const {
    data: space,
    isLoading,
    error,
  } = useGetSpaceBySlugQuery(spaceSlug || '');

  return {
    // Main space data - all three properties as requested
    spaceId: space?.id,
    spaceSlug: space?.slug,
    spaceName: space?.name,

    // Full space object if needed
    space,

    // Loading states
    isLoading,
    error,

    // Helper for conditional rendering
    isReady: !!space && !isLoading,
  };
}
