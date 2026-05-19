import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SkillValidationError } from '@packmind/skills';
import { ApplyPlaybookProposalItem } from '@packmind/types';

import { PlaybookController } from './playbook.controller';
import { PlaybookService } from './playbook.service';

describe('PlaybookController', () => {
  let controller: PlaybookController;
  let service: jest.Mocked<PlaybookService>;

  const orgId = 'org-123';
  const userId = 'user-123';
  const request = {
    user: { userId },
  } as AuthenticatedRequest;
  const proposals: ApplyPlaybookProposalItem[] = [];

  beforeEach(() => {
    service = {
      applyPlaybook: jest.fn(),
    } as unknown as jest.Mocked<PlaybookService>;
    controller = new PlaybookController(service);
  });

  describe('when applyPlaybook throws SkillValidationError', () => {
    it('translates it to a BadRequestException, passing the error message through', async () => {
      const validationError = new SkillValidationError([
        {
          field: 'description',
          message: 'description must not exceed 1024 characters',
        },
      ]);
      validationError.message =
        'A submitted skill has a description longer than 1024 characters. Edit your skill and upload it again.';
      service.applyPlaybook.mockRejectedValue(validationError);

      await expect(
        controller.apply(request, orgId, {
          proposals,
          message: 'msg',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.apply(request, orgId, {
          proposals,
          message: 'msg',
        }),
      ).rejects.toThrow(validationError.message);
    });
  });

  describe('when applyPlaybook returns success: false', () => {
    it('throws UnprocessableEntityException (existing behaviour)', async () => {
      service.applyPlaybook.mockResolvedValue({
        success: false,
        error: { index: 0, type: 'createSkill' as never, message: 'boom' },
      } as never);

      await expect(
        controller.apply(request, orgId, {
          proposals,
          message: 'msg',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('when applyPlaybook resolves successfully', () => {
    it('returns the result', async () => {
      const successResult = {
        success: true as const,
        created: { standards: [], commands: [], skills: [] },
        updated: { standards: [], commands: [], skills: [] },
      };
      service.applyPlaybook.mockResolvedValue(successResult as never);

      const result = await controller.apply(request, orgId, {
        proposals,
        message: 'msg',
      });

      expect(result).toBe(successResult);
    });
  });
});
