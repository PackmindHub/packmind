import { DraftOnboardingUseCase } from './DraftOnboardingUseCase';
import { stubLogger } from '@packmind/test-utils';
import { IProjectScannerService } from '../services/ProjectScannerService';
import { IOnboardingDraft } from '../../domain/types/OnboardingDraft';

describe('DraftOnboardingUseCase', () => {
  let useCase: DraftOnboardingUseCase;
  let mockProjectScanner: jest.Mocked<IProjectScannerService>;
  let mockBaselineGenerator: jest.Mocked<{ generateBaselineItems: jest.Mock }>;
  let mockDraftWriter: jest.Mocked<{
    writeDraftFiles: jest.Mock;
    generateMarkdown: jest.Mock;
  }>;
  let mockStateService: jest.Mocked<{
    getState: jest.Mock;
    updateState: jest.Mock;
    markAsSent: jest.Mock;
    getDefaultDraftDir: jest.Mock;
  }>;
  let mockFingerprintService: jest.Mocked<{ generateFingerprint: jest.Mock }>;
  let mockGateway: jest.Mocked<{ pushOnboardingBaseline: jest.Mock }>;

  beforeEach(() => {
    mockProjectScanner = {
      scanProject: jest.fn(),
    };
    mockBaselineGenerator = {
      generateBaselineItems: jest.fn(),
    };
    mockDraftWriter = {
      writeDraftFiles: jest.fn(),
      generateMarkdown: jest.fn(),
    };
    mockStateService = {
      getState: jest.fn(),
      updateState: jest.fn(),
      markAsSent: jest.fn(),
      getDefaultDraftDir: jest.fn(),
    };
    mockFingerprintService = {
      generateFingerprint: jest.fn(),
    };
    mockGateway = {
      pushOnboardingBaseline: jest.fn(),
    };

    useCase = new DraftOnboardingUseCase(
      mockProjectScanner,
      mockBaselineGenerator,
      mockDraftWriter,
      mockStateService,
      mockFingerprintService,
      mockGateway,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDraft', () => {
    it('scans project and generates draft files', async () => {
      mockFingerprintService.generateFingerprint.mockResolvedValue(
        'fingerprint-123',
      );
      mockProjectScanner.scanProject.mockResolvedValue({
        languages: ['typescript'],
        frameworks: ['nestjs'],
        tools: ['eslint'],
        structure: { isMonorepo: true, hasTests: true, hasSrcDirectory: true },
        testFramework: 'jest',
        packageManager: 'npm',
        hasTypeScript: true,
        hasLinting: true,
        detectedFiles: ['tsconfig.json'],
        detectedDirectories: ['src'],
      });
      mockBaselineGenerator.generateBaselineItems.mockReturnValue([
        {
          id: 'item-1',
          type: 'tooling',
          label: 'Uses TypeScript',
          confidence: 'high',
          evidence: ['tsconfig.json'],
        },
      ]);
      mockStateService.getDefaultDraftDir.mockResolvedValue('/tmp/drafts');
      mockDraftWriter.writeDraftFiles.mockResolvedValue({
        jsonPath: '/tmp/drafts/packmind-onboard.draft.json',
        mdPath: '/tmp/drafts/packmind-onboard.draft.md',
      });

      const result = await useCase.generateDraft({
        projectPath: '/test/project',
        format: 'both',
      });

      expect(mockProjectScanner.scanProject).toHaveBeenCalledWith(
        '/test/project',
      );
      expect(mockBaselineGenerator.generateBaselineItems).toHaveBeenCalled();
      expect(mockDraftWriter.writeDraftFiles).toHaveBeenCalled();
      expect(result.draft).toBeDefined();
      expect(result.paths.jsonPath).toBeDefined();
    });

    it('updates state after generating draft', async () => {
      mockFingerprintService.generateFingerprint.mockResolvedValue(
        'fingerprint-123',
      );
      mockProjectScanner.scanProject.mockResolvedValue({
        languages: ['typescript'],
        frameworks: [],
        tools: [],
        structure: {
          isMonorepo: false,
          hasTests: false,
          hasSrcDirectory: true,
        },
        testFramework: undefined,
        packageManager: 'npm',
        hasTypeScript: true,
        hasLinting: false,
        detectedFiles: ['tsconfig.json'],
        detectedDirectories: ['src'],
      });
      mockBaselineGenerator.generateBaselineItems.mockReturnValue([]);
      mockStateService.getDefaultDraftDir.mockResolvedValue('/tmp/drafts');
      mockDraftWriter.writeDraftFiles.mockResolvedValue({
        jsonPath: '/tmp/drafts/packmind-onboard.draft.json',
        mdPath: '/tmp/drafts/packmind-onboard.draft.md',
      });

      await useCase.generateDraft({
        projectPath: '/test/project',
        format: 'both',
      });

      expect(mockStateService.updateState).toHaveBeenCalledWith(
        'fingerprint-123',
        expect.objectContaining({
          last_run_at: expect.any(String),
        }),
      );
    });

    it('uses custom output directory when provided', async () => {
      mockFingerprintService.generateFingerprint.mockResolvedValue(
        'fingerprint-123',
      );
      mockProjectScanner.scanProject.mockResolvedValue({
        languages: [],
        frameworks: [],
        tools: [],
        structure: {
          isMonorepo: false,
          hasTests: false,
          hasSrcDirectory: false,
        },
        hasTypeScript: false,
        hasLinting: false,
        detectedFiles: [],
        detectedDirectories: [],
      });
      mockBaselineGenerator.generateBaselineItems.mockReturnValue([]);
      mockDraftWriter.writeDraftFiles.mockResolvedValue({
        jsonPath: '/custom/output/packmind-onboard.draft.json',
        mdPath: '/custom/output/packmind-onboard.draft.md',
      });

      await useCase.generateDraft({
        projectPath: '/test/project',
        outputDir: '/custom/output',
      });

      expect(mockDraftWriter.writeDraftFiles).toHaveBeenCalledWith(
        expect.any(Object),
        '/custom/output',
        'both',
      );
    });
  });

  describe('sendDraft', () => {
    it('pushes draft to Packmind and marks as sent', async () => {
      const draft: IOnboardingDraft = {
        meta: {
          skill: 'packmind-onboard',
          version: '1.0',
          generated_at: '2026-01-28T10:00:00.000Z',
          repo_fingerprint: 'fingerprint-123',
          read_only: true,
        },
        summary: {
          languages: ['typescript'],
          frameworks: [],
          tools: [],
          structure_hints: [],
        },
        baseline_items: [],
        redactions: [],
        notes: [],
      };

      mockGateway.pushOnboardingBaseline.mockResolvedValue({ success: true });

      const result = await useCase.sendDraft(draft);

      expect(mockGateway.pushOnboardingBaseline).toHaveBeenCalledWith(draft);
      expect(mockStateService.markAsSent).toHaveBeenCalledWith(
        'fingerprint-123',
      );
      expect(result.success).toBe(true);
    });

    describe('when push fails', () => {
      it('returns error and does not mark as sent', async () => {
        const draft: IOnboardingDraft = {
          meta: {
            skill: 'packmind-onboard',
            version: '1.0',
            generated_at: '2026-01-28T10:00:00.000Z',
            repo_fingerprint: 'fingerprint-123',
            read_only: true,
          },
          summary: {
            languages: [],
            frameworks: [],
            tools: [],
            structure_hints: [],
          },
          baseline_items: [],
          redactions: [],
          notes: [],
        };

        mockGateway.pushOnboardingBaseline.mockRejectedValue(
          new Error('Network error'),
        );

        const result = await useCase.sendDraft(draft);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
        expect(mockStateService.markAsSent).not.toHaveBeenCalled();
      });
    });
  });

  describe('getStatus', () => {
    it('returns onboarding state for project', async () => {
      mockFingerprintService.generateFingerprint.mockResolvedValue(
        'fingerprint-456',
      );
      mockStateService.getState.mockResolvedValue({
        last_run_at: '2026-01-28T10:00:00.000Z',
        last_draft_paths: {
          json: '/path/to/draft.json',
          md: '/path/to/draft.md',
        },
        repo_fingerprint: 'fingerprint-456',
        last_push_status: {
          status: 'sent',
          timestamp: '2026-01-28T10:05:00.000Z',
        },
        baseline_item_count: 5,
      });

      const status = await useCase.getStatus('/test/project');

      expect(mockFingerprintService.generateFingerprint).toHaveBeenCalledWith(
        '/test/project',
      );
      expect(mockStateService.getState).toHaveBeenCalledWith('fingerprint-456');
      expect(status.last_run_at).toBe('2026-01-28T10:00:00.000Z');
      expect(status.last_push_status.status).toBe('sent');
    });
  });
});
