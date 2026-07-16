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

export interface IProviderMetadata {
  label: string;
  workflowFilePath: string;
  cronInYaml: boolean;
  secretNames: ReadonlyArray<string>;
  scheduleLocationHint: string;
  secretsLocationPath: string;
}

export const PROVIDER_METADATA: Record<AutoUpdateProvider, IProviderMetadata> =
  {
    github: {
      label: 'GitHub Actions',
      workflowFilePath: '.github/workflows/nightly-packmind-update.yml',
      cronInYaml: true,
      secretNames: ['PACKMIND_API_KEY'],
      scheduleLocationHint:
        'The schedule is set directly in the workflow file below.',
      secretsLocationPath: 'Settings → Secrets and variables → Actions',
    },
    gitlab: {
      label: 'GitLab CI',
      workflowFilePath: '.gitlab-ci.yml',
      cronInYaml: false,
      secretNames: ['PACKMIND_API_KEY', 'PACKMIND_BOT_TOKEN'],
      scheduleLocationHint:
        'In GitLab: Build → Pipeline schedules → New schedule, then paste the cron expression below.',
      secretsLocationPath: 'Settings → CI/CD → Variables',
    },
  };

export const LOCAL_STORAGE_PROVIDER_KEY = 'packmind.autoUpdate.lastProvider';

export const DOCS_URL =
  'https://docs.packmind.com/playbook-maintenance/auto-update-artifacts';

export const API_KEY_HASH = 'api-key';
