import { TargetService } from './TargetService';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';
import { TargetNotFoundError } from '../../domain/errors/TargetNotFoundError';
import { stubLogger } from '@packmind/test-utils';
import {
  Target,
  createTargetId,
  createGitRepoId,
  createOrganizationId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

describe('TargetService', () => {
  let service: TargetService;
  let mockTargetRepository: jest.Mocked<ITargetRepository>;

  const organizationId = createOrganizationId(uuidv4());
  const targetId1 = createTargetId(uuidv4());
  const targetId2 = createTargetId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());

  const target1: Target = {
    id: targetId1,
    name: 'production',
    path: '/',
    gitRepoId,
  };

  const target2: Target = {
    id: targetId2,
    name: 'staging',
    path: '/staging/',
    gitRepoId,
  };

  beforeEach(() => {
    mockTargetRepository = {
      findByIdsInOrganization: jest.fn(),
    } as unknown as jest.Mocked<ITargetRepository>;

    service = new TargetService(mockTargetRepository, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByIdsInOrganization', () => {
    describe('when targets belong to the organization', () => {
      beforeEach(() => {
        mockTargetRepository.findByIdsInOrganization.mockResolvedValue([
          target1,
          target2,
        ]);
      });

      it('returns the targets from the repository', async () => {
        const result = await service.findByIdsInOrganization(
          [targetId1, targetId2],
          organizationId,
        );

        expect(result).toEqual([target1, target2]);
      });

      it('delegates to the repository with correct parameters', async () => {
        await service.findByIdsInOrganization(
          [targetId1, targetId2],
          organizationId,
        );

        expect(
          mockTargetRepository.findByIdsInOrganization,
        ).toHaveBeenCalledWith([targetId1, targetId2], organizationId);
      });
    });

    describe('when the repository throws an error', () => {
      beforeEach(() => {
        mockTargetRepository.findByIdsInOrganization.mockRejectedValue(
          new Error('Database error'),
        );
      });

      it('propagates the error', async () => {
        await expect(
          service.findByIdsInOrganization([targetId1], organizationId),
        ).rejects.toThrow('Database error');
      });
    });

    describe('when a target does not belong to the organization', () => {
      beforeEach(() => {
        mockTargetRepository.findByIdsInOrganization.mockResolvedValue([
          target1,
        ]);
      });

      it('throws TargetNotFoundError', async () => {
        await expect(
          service.findByIdsInOrganization(
            [targetId1, targetId2],
            organizationId,
          ),
        ).rejects.toThrow(TargetNotFoundError);
      });
    });

    describe('when no targets are found', () => {
      beforeEach(() => {
        mockTargetRepository.findByIdsInOrganization.mockResolvedValue([]);
      });

      it('throws TargetNotFoundError', async () => {
        await expect(
          service.findByIdsInOrganization([targetId1], organizationId),
        ).rejects.toThrow(TargetNotFoundError);
      });
    });
  });
});
