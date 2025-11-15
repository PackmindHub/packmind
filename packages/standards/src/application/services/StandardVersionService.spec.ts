import { createUserId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import type { ILinterPort } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { ruleFactory } from '../../../test/ruleFactory';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { createStandardId } from '@packmind/types';
import {
  createStandardVersionId,
  StandardVersion,
  StandardVersionId,
} from '@packmind/types';
import { IRuleExampleRepository } from '../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../domain/repositories/IRuleRepository';
import { IStandardVersionRepository } from '../../domain/repositories/IStandardVersionRepository';
import {
  CreateStandardVersionData,
  StandardVersionService,
} from './StandardVersionService';

describe('StandardVersionService', () => {
  let standardVersionService: StandardVersionService;
  let standardVersionRepository: IStandardVersionRepository;
  let ruleRepository: IRuleRepository;
  let ruleExampleRepository: IRuleExampleRepository;
  let linterAdapter: jest.Mocked<ILinterPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    standardVersionRepository = {
      add: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByStandardId: jest.fn(),
      findLatestByStandardId: jest.fn(),
      findByStandardIdAndVersion: jest.fn(),
      updateSummary: jest.fn(),
    };

    ruleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByStandardVersionId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    };

    stubbedLogger = stubLogger();

    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      findAll: jest.fn(),
    } as unknown as IRuleExampleRepository;

    linterAdapter = {
      copyLinterArtefacts: jest.fn(),
      updateRuleDetectionAssessmentAfterUpdate: jest.fn(),
      computeRuleLanguageDetectionStatus: jest.fn(),
    } as unknown as jest.Mocked<ILinterPort>;

    standardVersionService = new StandardVersionService(
      standardVersionRepository,
      ruleRepository,
      ruleExampleRepository,
      linterAdapter,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addStandardVersion', () => {
    let versionData: CreateStandardVersionData;
    let savedVersion: StandardVersion;
    let result: StandardVersion;

    beforeEach(async () => {
      versionData = {
        standardId: createStandardId(uuidv4()),
        name: 'Test Standard Version',
        slug: 'test-standard-version',
        description: 'Test standard version description',
        version: 1,
        rules: [
          { content: 'Test rule 1', examples: [] },
          { content: 'Test rule 2', examples: [] },
        ],
        scope: null,
      };

      savedVersion = {
        id: createStandardVersionId(uuidv4()),
        standardId: versionData.standardId,
        name: versionData.name,
        slug: versionData.slug,
        description: versionData.description,
        version: versionData.version,
        gitCommit: undefined,
        scope: null,
      };

      standardVersionRepository.add = jest.fn().mockResolvedValue(savedVersion);
      ruleRepository.add = jest
        .fn()
        .mockImplementation((rule) => Promise.resolve(rule));

      result = await standardVersionService.addStandardVersion(versionData);
    });

    it('creates a new standard version with generated ID', () => {
      expect(standardVersionRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          standardId: versionData.standardId,
          name: versionData.name,
          slug: versionData.slug,
          description: versionData.description,
          version: versionData.version,
        }),
      );
    });

    it('creates rules for the version', () => {
      expect(ruleRepository.add).toHaveBeenCalledTimes(2);
      expect(ruleRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          content: 'Test rule 1',
          standardVersionId: savedVersion.id,
        }),
      );
      expect(ruleRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          content: 'Test rule 2',
          standardVersionId: savedVersion.id,
        }),
      );
    });

    it('returns the created standard version', () => {
      expect(result).toEqual(savedVersion);
    });

    describe('with userId (Web UI scenario)', () => {
      let webUiVersionData: CreateStandardVersionData;
      let webUiResult: StandardVersion;

      beforeEach(async () => {
        const userId = createUserId(uuidv4());
        webUiVersionData = {
          standardId: createStandardId(uuidv4()),
          name: 'Web UI Standard Version',
          slug: 'web-ui-standard-version',
          description: 'Standard version created through Web UI',
          version: 1,
          rules: [{ content: 'Web UI rule', examples: [] }],
          scope: null,
          userId,
        };

        const savedWebUiVersion = {
          id: createStandardVersionId(uuidv4()),
          standardId: webUiVersionData.standardId,
          name: webUiVersionData.name,
          slug: webUiVersionData.slug,
          description: webUiVersionData.description,
          version: webUiVersionData.version,
          gitCommit: undefined,
          userId,
          scope: null,
        };

        standardVersionRepository.add = jest
          .fn()
          .mockResolvedValue(savedWebUiVersion);
        ruleRepository.add = jest
          .fn()
          .mockImplementation((rule) => Promise.resolve(rule));

        webUiResult =
          await standardVersionService.addStandardVersion(webUiVersionData);
      });

      it('creates standard version with userId', () => {
        expect(standardVersionRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: webUiVersionData.userId,
          }),
        );
      });

      it('returns the created standard version with userId', () => {
        expect(webUiResult.userId).toEqual(webUiVersionData.userId);
      });
    });

    describe('without userId (Git commit scenario)', () => {
      let gitVersionData: CreateStandardVersionData;
      let gitResult: StandardVersion;

      beforeEach(async () => {
        gitVersionData = {
          standardId: createStandardId(uuidv4()),
          name: 'Git Standard Version',
          slug: 'git-standard-version',
          description: 'Standard version created through Git',
          version: 1,
          rules: [{ content: 'Git rule', examples: [] }],
          scope: null,
          userId: null, // Explicitly null for git commits
        };

        const savedGitVersion = {
          id: createStandardVersionId(uuidv4()),
          standardId: gitVersionData.standardId,
          name: gitVersionData.name,
          slug: gitVersionData.slug,
          description: gitVersionData.description,
          version: gitVersionData.version,
          gitCommit: undefined,
          userId: null,
          scope: null,
        };

        standardVersionRepository.add = jest
          .fn()
          .mockResolvedValue(savedGitVersion);
        ruleRepository.add = jest
          .fn()
          .mockImplementation((rule) => Promise.resolve(rule));

        gitResult =
          await standardVersionService.addStandardVersion(gitVersionData);
      });

      it('creates standard version with null userId', () => {
        expect(standardVersionRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: null,
          }),
        );
      });

      it('returns the created standard version with null userId', () => {
        expect(gitResult.userId).toBeNull();
      });
    });
  });

  describe('getStandardVersionById', () => {
    describe('when the version exists', () => {
      let versionId: StandardVersionId;
      let version: StandardVersion;
      let result: StandardVersion | null;

      beforeEach(async () => {
        versionId = createStandardVersionId(uuidv4());
        version = standardVersionFactory({ id: versionId });

        standardVersionRepository.findById = jest
          .fn()
          .mockResolvedValue(version);

        // Mock getRulesByVersionId to return empty rules array
        ruleRepository.findByStandardVersionId = jest
          .fn()
          .mockResolvedValue([]);

        result = await standardVersionService.getStandardVersionById(versionId);
      });

      it('calls repository with correct ID', () => {
        expect(standardVersionRepository.findById).toHaveBeenCalledWith(
          versionId,
        );
      });

      it('returns the found version with rules', () => {
        expect(result).toEqual({ ...version, rules: [] });
      });
    });

    describe('when the version does not exist', () => {
      let nonExistentVersionId: StandardVersionId;
      let result: StandardVersion | null;

      beforeEach(async () => {
        nonExistentVersionId = createStandardVersionId(uuidv4());
        standardVersionRepository.findById = jest.fn().mockResolvedValue(null);

        result =
          await standardVersionService.getStandardVersionById(
            nonExistentVersionId,
          );
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('listStandardVersions', () => {
    it('returns versions for the specified standard', async () => {
      const standardId = createStandardId(uuidv4());
      const versions = [
        standardVersionFactory({ standardId, version: 2 }),
        standardVersionFactory({ standardId, version: 1 }),
      ];

      standardVersionRepository.findByStandardId = jest
        .fn()
        .mockResolvedValue(versions);

      const result =
        await standardVersionService.listStandardVersions(standardId);

      expect(standardVersionRepository.findByStandardId).toHaveBeenCalledWith(
        standardId,
      );
      expect(result).toEqual(versions);
    });
  });

  describe('getLatestStandardVersion', () => {
    describe('when versions exist', () => {
      it('returns the latest version', async () => {
        const standardId = createStandardId(uuidv4());
        const latestVersion = standardVersionFactory({
          standardId,
          version: 3,
        });

        standardVersionRepository.findLatestByStandardId = jest
          .fn()
          .mockResolvedValue(latestVersion);

        const result =
          await standardVersionService.getLatestStandardVersion(standardId);

        expect(
          standardVersionRepository.findLatestByStandardId,
        ).toHaveBeenCalledWith(standardId);
        expect(result).toEqual(latestVersion);
      });
    });

    describe('when no versions exist', () => {
      it('returns null', async () => {
        const standardId = createStandardId(uuidv4());

        standardVersionRepository.findLatestByStandardId = jest
          .fn()
          .mockResolvedValue(null);

        const result =
          await standardVersionService.getLatestStandardVersion(standardId);

        expect(result).toBeNull();
      });
    });
  });

  describe('getStandardVersion', () => {
    describe('when the version exists', () => {
      it('returns the specific version', async () => {
        const standardId = createStandardId(uuidv4());
        const version = 2;
        const standardVersion = standardVersionFactory({ standardId, version });

        standardVersionRepository.findByStandardIdAndVersion = jest
          .fn()
          .mockResolvedValue(standardVersion);

        const result = await standardVersionService.getStandardVersion(
          standardId,
          version,
        );

        expect(
          standardVersionRepository.findByStandardIdAndVersion,
        ).toHaveBeenCalledWith(standardId, version);
        expect(result).toEqual(standardVersion);
      });
    });

    describe('when the version does not exist', () => {
      it('returns null', async () => {
        const standardId = createStandardId(uuidv4());
        const version = 999;

        standardVersionRepository.findByStandardIdAndVersion = jest
          .fn()
          .mockResolvedValue(null);

        const result = await standardVersionService.getStandardVersion(
          standardId,
          version,
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('prepareForGitPublishing', () => {
    it('prepares standard version data for Git publishing', async () => {
      const standardId = createStandardId(uuidv4());
      const version = 1;
      const standardVersion = standardVersionFactory({
        standardId,
        version,
        name: 'Test Standard',
        slug: 'test-standard',
        description: 'Test description',
      });

      const rules = [
        ruleFactory({
          content: 'Rule 1',
          standardVersionId: standardVersion.id,
        }),
        ruleFactory({
          content: 'Rule 2',
          standardVersionId: standardVersion.id,
        }),
      ];

      standardVersionRepository.findByStandardIdAndVersion = jest
        .fn()
        .mockResolvedValue(standardVersion);
      ruleRepository.findByStandardVersionId = jest
        .fn()
        .mockResolvedValue(rules);

      const result = await standardVersionService.prepareForGitPublishing(
        standardId,
        version,
      );

      expect(
        standardVersionRepository.findByStandardIdAndVersion,
      ).toHaveBeenCalledWith(standardId, version);
      expect(ruleRepository.findByStandardVersionId).toHaveBeenCalledWith(
        standardVersion.id,
      );

      expect(result).toEqual({
        filePath: '.packmind/standards/test-standard.md',
        content: expect.stringContaining('# Test Standard'),
      });
      expect(result.content).toContain('Test description');
      expect(result.content).toContain('Rule 1');
      expect(result.content).toContain('Rule 2');
    });

    describe('when standard version not found', () => {
      it('throws error', async () => {
        const standardId = createStandardId(uuidv4());
        const version = 999;

        standardVersionRepository.findByStandardIdAndVersion = jest
          .fn()
          .mockResolvedValue(null);

        await expect(
          standardVersionService.prepareForGitPublishing(standardId, version),
        ).rejects.toThrow(
          `Standard version not found for standard ${standardId} version ${version}`,
        );
      });
    });
  });
});
