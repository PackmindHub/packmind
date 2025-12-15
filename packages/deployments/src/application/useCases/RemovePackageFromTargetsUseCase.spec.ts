import { RemovePackageFromTargetsUseCase } from './RemovePackageFromTargetsUseCase';
import { PackageService } from '../services/PackageService';
import { TargetService } from '../services/TargetService';
import { PackageNotFoundError } from '../../domain/errors/PackageNotFoundError';
import { TargetNotFoundError } from '../../domain/errors/TargetNotFoundError';
import {
  createPackageId,
  createTargetId,
  createUserId,
  createOrganizationId,
  createSpaceId,
  createGitRepoId,
  RemovePackageFromTargetsCommand,
  Package,
  Target,
} from '@packmind/types';

describe('RemovePackageFromTargetsUseCase', () => {
  let useCase: RemovePackageFromTargetsUseCase;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockTargetService: jest.Mocked<TargetService>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');
  const packageId = createPackageId('package-123');
  const targetIds = [createTargetId('target-1'), createTargetId('target-2')];
  const spaceId = createSpaceId('space-123');
  const gitRepoId = createGitRepoId('repo-123');

  const mockPackage: Package = {
    id: packageId,
    name: 'Test Package',
    slug: 'test-package',
    description: 'A test package',
    spaceId,
    createdBy: userId,
    recipes: [],
    standards: [],
  };

  const mockTarget: Target = {
    id: targetIds[0],
    name: 'production',
    path: '/src/',
    gitRepoId,
  };

  beforeEach(() => {
    mockPackageService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    mockTargetService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    useCase = new RemovePackageFromTargetsUseCase(
      mockPackageService,
      mockTargetService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when package does not exist', () => {
    const command: RemovePackageFromTargetsCommand = {
      userId,
      organizationId,
      packageId,
      targetIds,
    };

    beforeEach(() => {
      mockPackageService.findById.mockResolvedValue(null);
    });

    it('throws PackageNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        PackageNotFoundError,
      );
    });
  });

  describe('when package exists', () => {
    describe('when a target does not exist', () => {
      const command: RemovePackageFromTargetsCommand = {
        userId,
        organizationId,
        packageId,
        targetIds,
      };

      beforeEach(() => {
        mockPackageService.findById.mockResolvedValue(mockPackage);
        mockTargetService.findById.mockResolvedValue(null);
      });

      it('throws TargetNotFoundError', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          TargetNotFoundError,
        );
      });
    });

    describe('when all targets exist', () => {
      const command: RemovePackageFromTargetsCommand = {
        userId,
        organizationId,
        packageId,
        targetIds,
      };

      beforeEach(() => {
        mockPackageService.findById.mockResolvedValue(mockPackage);
        mockTargetService.findById.mockResolvedValue(mockTarget);
      });

      it('returns empty results array', async () => {
        const result = await useCase.execute(command);

        expect(result).toEqual({ results: [] });
      });
    });
  });
});
