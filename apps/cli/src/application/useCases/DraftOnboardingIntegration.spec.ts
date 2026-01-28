import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ProjectScannerService } from '../services/ProjectScannerService';
import { BaselineItemGeneratorService } from '../services/BaselineItemGeneratorService';
import { DraftFileWriterService } from '../services/DraftFileWriterService';
import { OnboardingStateService } from '../services/OnboardingStateService';
import { RepoFingerprintService } from '../services/RepoFingerprintService';
import { DraftOnboardingUseCase } from './DraftOnboardingUseCase';
import { stubLogger } from '@packmind/test-utils';

describe('Draft Onboarding Integration', () => {
  let tempDir: string;
  let useCase: DraftOnboardingUseCase;
  let mockGateway: { pushOnboardingBaseline: jest.Mock };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integration-test-'));

    mockGateway = {
      pushOnboardingBaseline: jest.fn().mockResolvedValue({ success: true }),
    };

    useCase = new DraftOnboardingUseCase(
      new ProjectScannerService(),
      new BaselineItemGeneratorService(),
      new DraftFileWriterService(),
      new OnboardingStateService(tempDir),
      new RepoFingerprintService(),
      mockGateway,
      stubLogger(),
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('generates draft files for current project', async () => {
    const result = await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'both',
      outputDir: tempDir,
    });

    expect(result.draft.baseline_items.length).toBeGreaterThan(0);
    expect(result.paths.jsonPath).toBeDefined();
    expect(result.paths.mdPath).toBeDefined();

    expect(result.paths.jsonPath).not.toBeNull();
    const jsonExists = await fs
      .access(result.paths.jsonPath as string)
      .then(() => true)
      .catch(() => false);
    expect(jsonExists).toBe(true);
  });

  it('generates stable fingerprints across runs', async () => {
    const result1 = await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'json',
      outputDir: tempDir,
    });

    const result2 = await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'json',
      outputDir: tempDir,
    });

    expect(result1.draft.meta.repo_fingerprint).toBe(
      result2.draft.meta.repo_fingerprint,
    );
  });

  it('caps baseline items at 10', async () => {
    const result = await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'json',
      outputDir: tempDir,
    });

    expect(result.draft.baseline_items.length).toBeLessThanOrEqual(10);
  });

  it('tracks status after generating draft', async () => {
    await useCase.generateDraft({
      projectPath: process.cwd(),
      format: 'both',
      outputDir: tempDir,
    });

    const status = await useCase.getStatus(process.cwd());

    expect(status.last_run_at).toBeDefined();
    expect(status.baseline_item_count).toBeGreaterThan(0);
    expect(status.last_push_status.status).toBe('unsent');
  });
});
