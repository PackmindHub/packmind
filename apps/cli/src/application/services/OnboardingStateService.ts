import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { IOnboardingState } from '../../domain/types/OnboardingDraft';

// CLI state directory - matches FileCredentialsProvider convention
const CLI_STATE_DIR = path.join(os.homedir(), '.packmind', 'cli');

export class OnboardingStateService {
  private readonly stateDir: string;
  private readonly STATE_FILENAME = 'onboarding-state.json';

  constructor(stateDir?: string) {
    this.stateDir = stateDir || CLI_STATE_DIR;
  }

  async getState(repoFingerprint: string): Promise<IOnboardingState> {
    const states = await this.loadAllStates();
    return states[repoFingerprint] || this.getDefaultState(repoFingerprint);
  }

  async updateState(
    repoFingerprint: string,
    updates: Partial<IOnboardingState>,
  ): Promise<void> {
    const states = await this.loadAllStates();
    const currentState =
      states[repoFingerprint] || this.getDefaultState(repoFingerprint);

    states[repoFingerprint] = {
      ...currentState,
      ...updates,
      repo_fingerprint: repoFingerprint,
    };

    await this.saveAllStates(states);
  }

  async markAsSent(repoFingerprint: string): Promise<void> {
    await this.updateState(repoFingerprint, {
      last_push_status: {
        status: 'sent',
        timestamp: new Date().toISOString(),
      },
    });
  }

  async getDefaultDraftDir(): Promise<string> {
    const draftDir = path.join(this.stateDir, 'drafts');
    await fs.mkdir(draftDir, { recursive: true });
    return draftDir;
  }

  private getDefaultState(repoFingerprint: string): IOnboardingState {
    return {
      last_run_at: null,
      last_draft_paths: {
        json: null,
        md: null,
      },
      repo_fingerprint: repoFingerprint,
      last_push_status: {
        status: 'unsent',
        timestamp: null,
      },
      baseline_item_count: 0,
    };
  }

  private async loadAllStates(): Promise<Record<string, IOnboardingState>> {
    const statePath = path.join(this.stateDir, this.STATE_FILENAME);

    try {
      await fs.mkdir(this.stateDir, { recursive: true });
      const content = await fs.readFile(statePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async saveAllStates(
    states: Record<string, IOnboardingState>,
  ): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });
    const statePath = path.join(this.stateDir, this.STATE_FILENAME);
    await fs.writeFile(statePath, JSON.stringify(states, null, 2), 'utf-8');
  }
}
