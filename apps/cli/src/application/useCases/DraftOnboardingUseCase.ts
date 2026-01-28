import { PackmindLogger } from '@packmind/logger';
import {
  IProjectScannerService,
  IProjectScanResult,
} from '../services/ProjectScannerService';
import { BaselineItemGeneratorService } from '../services/BaselineItemGeneratorService';
import {
  DraftFileWriterService,
  DraftFormat,
  IDraftWriteResult,
} from '../services/DraftFileWriterService';
import { OnboardingStateService } from '../services/OnboardingStateService';
import { RepoFingerprintService } from '../services/RepoFingerprintService';
import {
  IOnboardingDraft,
  IOnboardingState,
} from '../../domain/types/OnboardingDraft';

const origin = 'DraftOnboardingUseCase';

export interface IGenerateDraftCommand {
  projectPath: string;
  format?: DraftFormat;
  outputDir?: string;
}

export interface IGenerateDraftResult {
  draft: IOnboardingDraft;
  paths: IDraftWriteResult;
}

export interface ISendDraftResult {
  success: boolean;
  error?: string;
}

interface IOnboardingGateway {
  pushOnboardingBaseline(
    draft: IOnboardingDraft,
  ): Promise<{ success: boolean }>;
}

export class DraftOnboardingUseCase {
  constructor(
    private projectScanner: IProjectScannerService,
    private baselineGenerator: BaselineItemGeneratorService,
    private draftWriter: DraftFileWriterService,
    private stateService: OnboardingStateService,
    private fingerprintService: RepoFingerprintService,
    private gateway: IOnboardingGateway,
    private logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async generateDraft(
    command: IGenerateDraftCommand,
  ): Promise<IGenerateDraftResult> {
    const { projectPath, format = 'both', outputDir } = command;

    // Generate fingerprint
    this.logger.info('Generating repository fingerprint...');
    const repoFingerprint =
      await this.fingerprintService.generateFingerprint(projectPath);

    // Scan project (read-only)
    this.logger.info('Scanning project (read-only)...');
    const scanResult = await this.projectScanner.scanProject(projectPath);

    this.logScanProgress(scanResult);

    // Generate baseline items
    this.logger.info('Generating baseline items...');
    const baselineItems =
      this.baselineGenerator.generateBaselineItems(scanResult);

    // Create draft object
    const draft: IOnboardingDraft = {
      meta: {
        skill: 'packmind-onboard',
        version: '1.0',
        generated_at: new Date().toISOString(),
        repo_fingerprint: repoFingerprint,
        read_only: true,
      },
      summary: {
        languages: scanResult.languages,
        frameworks: scanResult.frameworks,
        tools: scanResult.tools,
        structure_hints: this.getStructureHints(scanResult),
      },
      baseline_items: baselineItems,
      redactions: [],
      notes: [],
    };

    // Write draft files
    const targetDir =
      outputDir || (await this.stateService.getDefaultDraftDir());
    this.logger.info(`Writing draft files to ${targetDir}...`);
    const paths = await this.draftWriter.writeDraftFiles(
      draft,
      targetDir,
      format,
    );

    // Update state
    await this.stateService.updateState(repoFingerprint, {
      last_run_at: new Date().toISOString(),
      last_draft_paths: {
        json: paths.jsonPath,
        md: paths.mdPath,
      },
      baseline_item_count: baselineItems.length,
      repo_fingerprint: repoFingerprint,
    });

    return { draft, paths };
  }

  async sendDraft(draft: IOnboardingDraft): Promise<ISendDraftResult> {
    try {
      this.logger.info('Sending draft to Packmind...');
      await this.gateway.pushOnboardingBaseline(draft);

      await this.stateService.markAsSent(draft.meta.repo_fingerprint);

      this.logger.info('Draft sent successfully!');
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send draft: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  async getStatus(projectPath: string): Promise<IOnboardingState> {
    const fingerprint =
      await this.fingerprintService.generateFingerprint(projectPath);
    return this.stateService.getState(fingerprint);
  }

  private logScanProgress(scanResult: IProjectScanResult): void {
    if (scanResult.languages.length > 0) {
      this.logger.info(`Found languages: ${scanResult.languages.join(', ')}`);
    }
    if (scanResult.frameworks.length > 0) {
      this.logger.info(`Found frameworks: ${scanResult.frameworks.join(', ')}`);
    }
    if (scanResult.tools.length > 0) {
      this.logger.info(`Found tools: ${scanResult.tools.join(', ')}`);
    }
    if (scanResult.structure.isMonorepo) {
      this.logger.info('Detected monorepo structure');
    }
  }

  private getStructureHints(scanResult: IProjectScanResult): string[] {
    const hints: string[] = [];
    if (scanResult.structure.isMonorepo) hints.push('monorepo');
    if (scanResult.structure.hasTests) hints.push('has-tests');
    if (scanResult.structure.hasSrcDirectory) hints.push('src-directory');
    return hints;
  }
}
