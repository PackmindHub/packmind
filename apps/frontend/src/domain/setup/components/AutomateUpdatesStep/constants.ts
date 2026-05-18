export type AutoUpdateProvider = 'github' | 'gitlab';

export type SchedulePresetKind = 'weeknights' | 'mondays';

export type ScheduleSelectorValue =
  | { kind: SchedulePresetKind }
  | { kind: 'custom'; cron: string; isValid: boolean };

export const SCHEDULE_PRESETS: Record<SchedulePresetKind, string> = {
  weeknights: '0 2 * * 1-5',
  mondays: '0 9 * * 1',
};

export const DEFAULT_CRON = SCHEDULE_PRESETS.weeknights;

export interface IProviderSecret {
  name: string;
  description: string;
}

export interface IProviderMetadata {
  label: string;
  workflowFilePath: string;
  cronInYaml: boolean;
  secrets: ReadonlyArray<IProviderSecret>;
  scheduleLocationHint: string;
}

export const PROVIDER_METADATA: Record<AutoUpdateProvider, IProviderMetadata> =
  {
    github: {
      label: 'GitHub Actions',
      workflowFilePath: '.github/workflows/nightly-packmind-update.yml',
      cronInYaml: true,
      secrets: [
        {
          name: 'PACKMIND_API_KEY_V3',
          description: 'Your Packmind API key (from Step 2).',
        },
      ],
      scheduleLocationHint:
        'The schedule is set directly in the workflow file below.',
    },
    gitlab: {
      label: 'GitLab CI',
      workflowFilePath: '.gitlab-ci.yml',
      cronInYaml: false,
      secrets: [
        {
          name: 'PACKMIND_API_KEY_V3',
          description: 'Your Packmind API key (from Step 2).',
        },
        {
          name: 'PACKMIND_BOT_TOKEN',
          description:
            'A GitLab Project Access Token with write_repository and api scopes.',
        },
      ],
      scheduleLocationHint:
        'In GitLab: Build → Pipeline schedules → New schedule, then paste the cron expression below.',
    },
  };

export const LOCAL_STORAGE_PROVIDER_KEY = 'packmind.autoUpdate.lastProvider';

export const DOCS_URL =
  'https://docs.packmind.com/playbook-maintenance/auto-update-artifacts';
