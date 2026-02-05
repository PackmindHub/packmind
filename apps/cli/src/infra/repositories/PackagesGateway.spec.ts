import { PackagesGateway } from './PackagesGateway';
import { createMockHttpClient } from '../../mocks/createMockHttpClient';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  createPackageId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
} from '@packmind/types';

describe('PackagesGateway', () => {
  describe('addArtefacts', () => {
    let gateway: PackagesGateway;
    let mockHttpClient: jest.Mocked<PackmindHttpClient>;
    const mockOrganizationId = 'org-123';
    const packageId = createPackageId('pkg-123');
    const spaceId = createSpaceId('space-123');

    beforeEach(() => {
      mockHttpClient = createMockHttpClient({
        getAuthContext: jest.fn().mockReturnValue({
          organizationId: mockOrganizationId,
          host: 'https://api.packmind.com',
          jwt: 'mock-jwt',
        }),
      });

      gateway = new PackagesGateway('mock-api-key', mockHttpClient);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when adding standards to a package', () => {
      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue({
          added: { standards: ['std-1'], commands: [], skills: [] },
          skipped: { standards: [], commands: [], skills: [] },
        });
      });

      it('calls POST with correct payload', async () => {
        await gateway.addArtefacts({
          packageId,
          spaceId,
          standardIds: [createStandardId('std-1')],
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          `/api/v0/organizations/${mockOrganizationId}/spaces/${spaceId}/packages/${packageId}/add-artifacts`,
          {
            method: 'POST',
            body: {
              packageId,
              spaceId,
              standardIds: ['std-1'],
            },
          },
        );
      });

      it('returns added standards from response', async () => {
        const result = await gateway.addArtefacts({
          packageId,
          spaceId,
          standardIds: [createStandardId('std-1')],
        });

        expect(result.added.standards).toEqual(['std-1']);
      });
    });

    describe('when adding commands to a package', () => {
      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue({
          added: { standards: [], commands: ['cmd-1'], skills: [] },
          skipped: { standards: [], commands: [], skills: [] },
        });
      });

      it('calls POST with commandIds in payload', async () => {
        await gateway.addArtefacts({
          packageId,
          spaceId,
          recipeIds: [createRecipeId('cmd-1')],
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          `/api/v0/organizations/${mockOrganizationId}/spaces/${spaceId}/packages/${packageId}/add-artifacts`,
          {
            method: 'POST',
            body: { packageId, spaceId, recipeIds: ['cmd-1'] },
          },
        );
      });

      it('returns added commands from response', async () => {
        const result = await gateway.addArtefacts({
          packageId,
          spaceId,
          recipeIds: [createRecipeId('cmd-1')],
        });

        expect(result.added.commands).toEqual(['cmd-1']);
      });
    });

    describe('when adding skills to a package', () => {
      beforeEach(() => {
        mockHttpClient.request.mockResolvedValue({
          added: { standards: [], commands: [], skills: ['skill-1'] },
          skipped: { standards: [], commands: [], skills: [] },
        });
      });

      it('calls POST with skillIds in payload', async () => {
        await gateway.addArtefacts({
          packageId,
          spaceId,
          skillIds: [createSkillId('skill-1')],
        });

        expect(mockHttpClient.request).toHaveBeenCalledWith(
          `/api/v0/organizations/${mockOrganizationId}/spaces/${spaceId}/packages/${packageId}/add-artifacts`,
          {
            method: 'POST',
            body: { packageId, spaceId, skillIds: ['skill-1'] },
          },
        );
      });

      it('returns added skills from response', async () => {
        const result = await gateway.addArtefacts({
          packageId,
          spaceId,
          skillIds: [createSkillId('skill-1')],
        });

        expect(result.added.skills).toEqual(['skill-1']);
      });
    });

    describe('when some items are skipped', () => {
      let result: Awaited<ReturnType<typeof gateway.addArtefacts>>;

      beforeEach(async () => {
        mockHttpClient.request.mockResolvedValue({
          added: { standards: ['std-2'], commands: [], skills: [] },
          skipped: { standards: ['std-1'], commands: [], skills: [] },
        });

        result = await gateway.addArtefacts({
          packageId,
          spaceId,
          standardIds: ['std-1', 'std-2'].map(createStandardId),
        });
      });

      it('returns added items', () => {
        expect(result.added.standards).toEqual(['std-2']);
      });

      it('returns skipped items', () => {
        expect(result.skipped.standards).toEqual(['std-1']);
      });
    });
  });
});
