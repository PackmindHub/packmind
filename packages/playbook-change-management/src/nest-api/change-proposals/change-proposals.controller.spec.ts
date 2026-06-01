import { BadRequestException } from '@nestjs/common';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SkillValidationError } from '@packmind/skills';
import {
  AcceptedChangeProposal,
  ChangeProposalId,
  OrganizationId,
  SpaceId,
} from '@packmind/types';

import { OrganizationsSpacesChangeProposalsController } from './change-proposals.controller';
import { ChangeProposalsService } from './change-proposals.service';

describe('OrganizationsSpacesChangeProposalsController', () => {
  const organizationId = 'org-123' as OrganizationId;
  const spaceId = 'space-456' as SpaceId;
  const userId = 'user-789';
  const request = {
    user: { userId },
  } as AuthenticatedRequest;

  let controller: OrganizationsSpacesChangeProposalsController;
  let service: jest.Mocked<ChangeProposalsService>;

  beforeEach(() => {
    service = {
      applyCreationChangeProposals: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalsService>;
    controller = new OrganizationsSpacesChangeProposalsController(service);
  });

  describe('applyCreationChangeProposals', () => {
    const body = {
      accepted: [] as AcceptedChangeProposal[],
      rejected: [] as ChangeProposalId[],
    };

    describe('when the service throws SkillValidationError', () => {
      it('translates it to BadRequestException', async () => {
        const validationError = new SkillValidationError([
          {
            field: 'description',
            message: 'description must not exceed 1024 characters',
          },
        ]);
        validationError.message =
          'A submitted skill has a description longer than 1024 characters. Edit your skill and upload it again.';
        service.applyCreationChangeProposals.mockRejectedValue(validationError);

        await expect(
          controller.applyCreationChangeProposals(
            organizationId,
            spaceId,
            body,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('preserves the validation error message', async () => {
        const validationError = new SkillValidationError([
          {
            field: 'description',
            message: 'description must not exceed 1024 characters',
          },
        ]);
        validationError.message =
          'A submitted skill has a description longer than 1024 characters. Edit your skill and upload it again.';
        service.applyCreationChangeProposals.mockRejectedValue(validationError);

        await expect(
          controller.applyCreationChangeProposals(
            organizationId,
            spaceId,
            body,
            request,
          ),
        ).rejects.toThrow(validationError.message);
      });
    });

    describe('when the service throws another error', () => {
      it('rethrows it untouched', async () => {
        const error = new Error('boom');
        service.applyCreationChangeProposals.mockRejectedValue(error);

        await expect(
          controller.applyCreationChangeProposals(
            organizationId,
            spaceId,
            body,
            request,
          ),
        ).rejects.toBe(error);
      });
    });

    describe('when the service resolves', () => {
      it('returns the result', async () => {
        const result = {
          created: { commands: [], standards: [], skills: [] },
          rejected: [],
        };
        service.applyCreationChangeProposals.mockResolvedValue(result as never);

        await expect(
          controller.applyCreationChangeProposals(
            organizationId,
            spaceId,
            body,
            request,
          ),
        ).resolves.toBe(result);
      });
    });
  });
});
