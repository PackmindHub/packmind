import {
  IStandardsPort,
  StandardVersion,
  Rule,
  Standard,
  createStandardId,
  createStandardVersionId,
  createRuleId,
  createUserId,
  createOrganizationId,
  createSpaceId,
  DiffService,
} from '@packmind/types';
import { StandardChangesApplier } from './StandardChangesApplier';

describe('StandardChangesApplier', () => {
  let applier: StandardChangesApplier;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let diffService: DiffService;

  const standardId = createStandardId('std-1');
  const versionId = createStandardVersionId('ver-1');
  const ruleId = createRuleId('rule-1');
  const userId = createUserId('user-1');
  const orgId = createOrganizationId('org-1');
  const spaceId = createSpaceId('space-1');

  const rule: Rule = {
    id: ruleId,
    standardVersionId: versionId,
    content: 'Use const',
  };

  const version: StandardVersion = {
    id: versionId,
    standardId,
    name: 'My Standard',
    slug: 'my-standard',
    description: 'A standard',
    version: 1,
    scope: 'TypeScript',
    rules: [rule],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    diffService = new DiffService();

    standardsPort = {
      getLatestStandardVersion: jest.fn(),
      getRulesByStandardId: jest.fn(),
      updateStandard: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    applier = new StandardChangesApplier(diffService, standardsPort);
  });

  describe('getVersion', () => {
    describe('when version exists', () => {
      beforeEach(() => {
        standardsPort.getLatestStandardVersion.mockResolvedValue(version);
        standardsPort.getRulesByStandardId.mockResolvedValue([rule]);
      });

      it('returns the version with rules', async () => {
        const result = await applier.getVersion(standardId);

        expect(result).toEqual({ ...version, rules: [rule] });
      });

      it('fetches the latest version for the standard', async () => {
        await applier.getVersion(standardId);

        expect(standardsPort.getLatestStandardVersion).toHaveBeenCalledWith(
          standardId,
        );
      });

      it('fetches rules by standard id', async () => {
        await applier.getVersion(standardId);

        expect(standardsPort.getRulesByStandardId).toHaveBeenCalledWith(
          standardId,
        );
      });
    });

    describe('when version does not exist', () => {
      beforeEach(() => {
        standardsPort.getLatestStandardVersion.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(applier.getVersion(standardId)).rejects.toThrow(
          `Standard version not found for ${standardId}`,
        );
      });
    });
  });

  describe('saveNewVersion', () => {
    const newVersionId = createStandardVersionId('ver-2');
    const updatedStandard = { id: standardId } as Standard;
    const newVersion: StandardVersion = {
      ...version,
      id: newVersionId,
      version: 2,
    };
    const newRule: Rule = { ...rule, standardVersionId: newVersionId };

    describe('when update succeeds', () => {
      beforeEach(() => {
        standardsPort.updateStandard.mockResolvedValue(updatedStandard);
        standardsPort.getLatestStandardVersion.mockResolvedValue(newVersion);
        standardsPort.getRulesByStandardId.mockResolvedValue([newRule]);
      });

      it('returns the new version with rules', async () => {
        const result = await applier.saveNewVersion(
          version,
          userId,
          spaceId,
          orgId,
        );

        expect(result).toEqual({ ...newVersion, rules: [newRule] });
      });

      it('calls updateStandard with mapped fields', async () => {
        await applier.saveNewVersion(version, userId, spaceId, orgId);

        expect(standardsPort.updateStandard).toHaveBeenCalledWith({
          userId,
          organizationId: orgId,
          spaceId,
          standardId: version.standardId,
          name: version.name,
          description: version.description,
          rules: [{ id: ruleId, content: 'Use const' }],
          scope: version.scope,
        });
      });
    });

    describe('when fetching new version fails', () => {
      beforeEach(() => {
        standardsPort.updateStandard.mockResolvedValue(updatedStandard);
        standardsPort.getLatestStandardVersion.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(
          applier.saveNewVersion(version, userId, spaceId, orgId),
        ).rejects.toThrow(
          `Failed to retrieve new version after updating standard ${standardId}`,
        );
      });
    });
  });
});
