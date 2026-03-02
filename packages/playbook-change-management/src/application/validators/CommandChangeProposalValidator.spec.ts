import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  createOrganizationId,
  createSpaceId,
  createUserId,
  IRecipesPort,
  NewCommandPayload,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { CommandChangeProposalValidator } from './CommandChangeProposalValidator';

describe('CommandChangeProposalValidator', () => {
  const userId = createUserId('user-id');
  const organizationId = createOrganizationId('org-id');
  const spaceId = createSpaceId('space-id');
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });

  let recipesPort: jest.Mocked<IRecipesPort>;
  let validator: CommandChangeProposalValidator;

  beforeEach(() => {
    recipesPort = {
      getRecipeById: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;
    validator = new CommandChangeProposalValidator(recipesPort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('supports()', () => {
    it('returns true for createCommand', () => {
      expect(validator.supports(ChangeProposalType.createCommand)).toBe(true);
    });

    it('returns false for createStandard', () => {
      expect(validator.supports(ChangeProposalType.createStandard)).toBe(false);
    });
  });

  describe('validate() for createCommand', () => {
    it('returns artefactVersion 0 without calling recipesPort', async () => {
      const payload: NewCommandPayload = {
        name: 'My Command',
        content: 'Do something',
      };
      const command = {
        userId,
        organizationId,
        spaceId,
        type: ChangeProposalType.createCommand,
        artefactId: null,
        payload,
        captureMode: ChangeProposalCaptureMode.commit,
        message: '',
        user,
        organization,
        membership: { userId, organizationId, role: 'member' as const },
      };

      const result = await validator.validate(command);

      expect(result).toEqual({ artefactVersion: 0 });
    });

    it('does not call recipesPort for createCommand', async () => {
      const payload: NewCommandPayload = {
        name: 'My Command',
        content: 'Do something',
      };
      const command = {
        userId,
        organizationId,
        spaceId,
        type: ChangeProposalType.createCommand,
        artefactId: null,
        payload,
        captureMode: ChangeProposalCaptureMode.commit,
        message: '',
        user,
        organization,
        membership: { userId, organizationId, role: 'member' as const },
      };

      await validator.validate(command);

      expect(recipesPort.getRecipeById).not.toHaveBeenCalled();
    });
  });
});
