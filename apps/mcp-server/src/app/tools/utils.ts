import { FastifyInstance } from 'fastify';
import { OrganizationId, Space } from '@packmind/types';

// Temporary: for now, we just deduce the space to use based on the organization
export async function getGlobalSpace(
  fastify: FastifyInstance,
  organizationId: OrganizationId,
): Promise<Space> {
  const spacesHexa = fastify.spacesHexa();
  if (!spacesHexa) {
    throw new Error('SpacesHexa not available');
  }

  const spaces = await spacesHexa
    .getAdapter()
    .listSpacesByOrganization(organizationId);

  if (!spaces || spaces.length === 0) {
    throw new Error(
      'No spaces found in organization. Please create a space first before.',
    );
  }

  return spaces[0];
}
