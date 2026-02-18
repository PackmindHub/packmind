import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  CreateChangeProposalCommand,
  createStandardId,
  createOrganizationId,
  createUserId,
  IStandardsPort,
  Standard,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';
import { StandardChangeProposalValidator } from './StandardChangeProposalValidator';
import { ChangeProposalPayloadMismatchError } from '../errors/ChangeProposalPayloadMismatchError';

describe('StandardChangeProposalValidator', () => {
  const standardId = createStandardId('standard-1');
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');

  const standard: Standard = {
    id: standardId,
    spaceId: 'space-1' as never,
    userId,
    name: 'My Standard',
    slug: 'my-standard',
    version: 3,
    description: 'A standard description',
    scope: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let validator: StandardChangeProposalValidator;
  let standardsPort: jest.Mocked<IStandardsPort>;

  const buildCommand = (
    overrides: Partial<CreateChangeProposalCommand<ChangeProposalType>> = {},
  ) =>
    ({
      userId,
      organizationId,
      spaceId: 'space-1',
      type: ChangeProposalType.updateStandardName,
      artefactId: standardId,
      captureMode: ChangeProposalCaptureMode.commit,
      payload: {
        oldValue: 'My Standard',
        newValue: 'Renamed Standard',
      },
      ...overrides,
    }) as CreateChangeProposalCommand<ChangeProposalType> & MemberContext;

  beforeEach(() => {
    standardsPort = {
      getStandard: jest.fn(),
      getStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      getLatestStandardVersion: jest.fn(),
      listStandardsBySpace: jest.fn(),
      findStandardBySlug: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    validator = new StandardChangeProposalValidator(standardsPort);

    standardsPort.getStandard.mockResolvedValue(standard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('supports', () => {
    it('returns true for updateStandardName', () => {
      expect(validator.supports(ChangeProposalType.updateStandardName)).toBe(
        true,
      );
    });

    it('returns true for updateStandardDescription', () => {
      expect(
        validator.supports(ChangeProposalType.updateStandardDescription),
      ).toBe(true);
    });

    it('returns false for updateCommandDescription', () => {
      expect(
        validator.supports(ChangeProposalType.updateCommandDescription),
      ).toBe(false);
    });

    it('returns false for updateSkillName', () => {
      expect(validator.supports(ChangeProposalType.updateSkillName)).toBe(
        false,
      );
    });
  });

  describe('when validating updateStandardName', () => {
    describe('when oldValue matches standard name', () => {
      it('validates successfully and returns artefactVersion', async () => {
        const result = await validator.validate(buildCommand());

        expect(result).toEqual({ artefactVersion: 3 });
      });
    });

    describe('when oldValue does not match standard name', () => {
      it('throws ChangeProposalPayloadMismatchError', async () => {
        const command = buildCommand({
          payload: {
            oldValue: 'Wrong Name',
            newValue: 'New Name',
          },
        });

        await expect(validator.validate(command)).rejects.toBeInstanceOf(
          ChangeProposalPayloadMismatchError,
        );
      });
    });
  });

  describe('when validating updateStandardDescription', () => {
    describe('when oldValue matches standard description', () => {
      it('validates successfully and returns artefactVersion', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: 'A standard description',
            newValue: 'Updated description',
          },
        });

        const result = await validator.validate(command);

        expect(result).toEqual({ artefactVersion: 3 });
      });
    });

    describe('when oldValue does not match standard description', () => {
      it('throws ChangeProposalPayloadMismatchError', async () => {
        const command = buildCommand({
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: 'Wrong description',
            newValue: 'Updated description',
          },
        });

        await expect(validator.validate(command)).rejects.toBeInstanceOf(
          ChangeProposalPayloadMismatchError,
        );
      });
    });
  });

  describe('when standard not found', () => {
    beforeEach(() => {
      standardsPort.getStandard.mockResolvedValue(null);
    });

    it('throws error', async () => {
      await expect(validator.validate(buildCommand())).rejects.toThrow(
        `Standard ${standardId} not found`,
      );
    });
  });
});
