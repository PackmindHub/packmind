import { BadRequestException } from '@nestjs/common';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SkillValidationError } from '@packmind/types';
import {
  AcceptedChangeProposal,
  ChangeProposalId,
  OrganizationId,
  SkillId,
  SpaceId,
} from '@packmind/types';

import { OrganizationsSpacesSkillsChangeProposalsController } from './skills-change-proposals.controller';
import { SkillsChangeProposalsService } from './skills-change-proposals.service';

describe('OrganizationsSpacesSkillsChangeProposalsController', () => {
  const organizationId = 'org-123' as OrganizationId;
  const spaceId = 'space-456' as SpaceId;
  const skillId = 'skill-789' as SkillId;
  const userId = 'user-abc';
  const request = {
    user: { userId },
  } as AuthenticatedRequest;

  let controller: OrganizationsSpacesSkillsChangeProposalsController;
  let service: jest.Mocked<SkillsChangeProposalsService>;

  beforeEach(() => {
    service = {
      applySkillChangeProposals: jest.fn(),
      listChangeProposalsBySkill: jest.fn(),
    } as unknown as jest.Mocked<SkillsChangeProposalsService>;
    controller = new OrganizationsSpacesSkillsChangeProposalsController(
      service,
    );
  });

  describe('applySkillChangeProposals', () => {
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
        service.applySkillChangeProposals.mockRejectedValue(validationError);

        await expect(
          controller.applySkillChangeProposals(
            organizationId,
            spaceId,
            skillId,
            body,
            request,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('preserves the use-case-supplied message', async () => {
        const validationError = new SkillValidationError([
          {
            field: 'description',
            message: 'description must not exceed 1024 characters',
          },
        ]);
        validationError.message =
          'A submitted skill has a description longer than 1024 characters. Edit your skill and upload it again.';
        service.applySkillChangeProposals.mockRejectedValue(validationError);

        await expect(
          controller.applySkillChangeProposals(
            organizationId,
            spaceId,
            skillId,
            body,
            request,
          ),
        ).rejects.toThrow(validationError.message);
      });
    });

    describe('when the service throws another error', () => {
      it('rethrows it untouched', async () => {
        const error = new Error('boom');
        service.applySkillChangeProposals.mockRejectedValue(error);

        await expect(
          controller.applySkillChangeProposals(
            organizationId,
            spaceId,
            skillId,
            body,
            request,
          ),
        ).rejects.toBe(error);
      });
    });

    describe('when the service resolves', () => {
      it('returns the result', async () => {
        const result = {
          newArtefactVersion: 'skill-version-id',
        };
        service.applySkillChangeProposals.mockResolvedValue(result as never);

        await expect(
          controller.applySkillChangeProposals(
            organizationId,
            spaceId,
            skillId,
            body,
            request,
          ),
        ).resolves.toBe(result);
      });
    });
  });
});
