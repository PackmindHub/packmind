import { CreatePackageUseCase } from './CreatePackageUseCase';
import { createMockPackagesGateway } from '../../mocks/createMockGateways';
import { createMockSpaceService } from '../../mocks/createMockServices';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { IPackagesGateway } from '../../domain/repositories/IPackagesGateway';
import { packageFactory } from '@packmind/deployments/test';
import { spaceFactory } from '@packmind/spaces/test';
import { createSpaceId } from '@packmind/types';

describe('CreatePackageUseCase', () => {
  let useCase: CreatePackageUseCase;
  let mockSpaceService: jest.Mocked<ISpaceService>;
  let mockPackagesGateway: jest.Mocked<IPackagesGateway>;
  let mockGateway: jest.Mocked<IPackmindGateway>;

  const globalSpace = spaceFactory({
    id: createSpaceId('space-global'),
    name: 'Global',
    slug: 'global',
    isDefaultSpace: true,
  });

  const teamSpace = spaceFactory({
    id: createSpaceId('space-team'),
    name: 'Team',
    slug: 'team',
    isDefaultSpace: false,
  });

  const createdPackage = packageFactory({
    id: 'pkg-123' as ReturnType<
      typeof import('@packmind/types').createPackageId
    >,
    name: 'My Package',
    slug: 'my-package',
    spaceId: globalSpace.id,
  });

  beforeEach(() => {
    mockPackagesGateway = createMockPackagesGateway();
    mockSpaceService = createMockSpaceService();

    mockGateway = {
      packages: mockPackagesGateway,
    } as unknown as jest.Mocked<IPackmindGateway>;

    mockPackagesGateway.create.mockResolvedValue({ package: createdPackage });

    useCase = new CreatePackageUseCase(mockGateway, mockSpaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the organization has a single space', () => {
    beforeEach(() => {
      mockSpaceService.getSpaces.mockResolvedValue([globalSpace]);
    });

    it('creates the package in that space', async () => {
      await useCase.execute({ name: 'My Package' });

      expect(mockPackagesGateway.create).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: globalSpace.id }),
      );
    });

    it('returns the package id, name, slug and spaceSlug', async () => {
      const result = await useCase.execute({ name: 'My Package' });

      expect(result).toEqual({
        packageId: createdPackage.id,
        name: createdPackage.name,
        slug: createdPackage.slug,
        spaceSlug: globalSpace.slug,
      });
    });

    it('passes name and description to the gateway', async () => {
      await useCase.execute({
        name: 'My Package',
        description: 'A description',
      });

      expect(mockPackagesGateway.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Package',
          description: 'A description',
        }),
      );
    });
  });

  describe('when the organization has multiple spaces and --space is not specified', () => {
    beforeEach(() => {
      mockSpaceService.getSpaces.mockResolvedValue([globalSpace, teamSpace]);
    });

    it('throws an error listing available spaces', async () => {
      await expect(useCase.execute({ name: 'My Package' })).rejects.toThrow(
        'Your organization has multiple spaces',
      );
    });

    it('includes available space slugs in the error message', async () => {
      await expect(useCase.execute({ name: 'My Package' })).rejects.toThrow(
        '--space global',
      );
    });

    describe('does not call the packages gateway', () => {
      beforeEach(async () => {
        await expect(useCase.execute({ name: 'My Package' })).rejects.toThrow();
      });

      it('does not call create', () => {
        expect(mockPackagesGateway.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('when the organization has multiple spaces and --space is specified', () => {
    beforeEach(() => {
      mockSpaceService.getSpaces.mockResolvedValue([globalSpace, teamSpace]);
    });

    it('creates the package in the specified space', async () => {
      await useCase.execute({ name: 'My Package', spaceSlug: 'team' });

      expect(mockPackagesGateway.create).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: teamSpace.id }),
      );
    });

    it('returns the spaceSlug of the specified space', async () => {
      const result = await useCase.execute({
        name: 'My Package',
        spaceSlug: 'team',
      });

      expect(result.spaceSlug).toBe('team');
    });
  });

  describe('when --space is specified but does not exist', () => {
    beforeEach(() => {
      mockSpaceService.getSpaces.mockResolvedValue([globalSpace, teamSpace]);
    });

    it('throws an error with the unknown space slug', async () => {
      await expect(
        useCase.execute({ name: 'My Package', spaceSlug: 'unknown-space' }),
      ).rejects.toThrow("Space 'unknown-space' not found.");
    });

    describe('does not call the packages gateway', () => {
      beforeEach(async () => {
        await expect(
          useCase.execute({ name: 'My Package', spaceSlug: 'unknown-space' }),
        ).rejects.toThrow();
      });

      it('does not call create', () => {
        expect(mockPackagesGateway.create).not.toHaveBeenCalled();
      });
    });
  });
});
