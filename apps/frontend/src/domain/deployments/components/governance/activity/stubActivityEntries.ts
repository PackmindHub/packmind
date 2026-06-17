export type ActivityKind = 'deployed' | 'edited' | 'archived';

export interface ActivityEntry {
  id: string;
  occurredAt: string;
  kind: ActivityKind;
  actor: string;
  subject: string;
  detail: string;
  spaceName: string;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function buildStubActivityEntries(now: number): ActivityEntry[] {
  return [
    {
      id: 'stub-1',
      occurredAt: new Date(now - 12 * 60 * 1000).toISOString(),
      kind: 'deployed',
      actor: 'Joan',
      subject: 'packmind-ui',
      detail: 'deployed to 3 targets',
      spaceName: 'Design System',
    },
    {
      id: 'stub-2',
      occurredAt: new Date(now - 1 * HOUR).toISOString(),
      kind: 'edited',
      actor: 'Émilie',
      subject: 'react-strict-mode',
      detail: 'updated',
      spaceName: 'Design System',
    },
    {
      id: 'stub-3',
      occurredAt: new Date(now - 18 * HOUR).toISOString(),
      kind: 'deployed',
      actor: 'Hugo',
      subject: 'design-tokens',
      detail: 'deployed to 5 targets',
      spaceName: 'Design System',
    },
    {
      id: 'stub-4',
      occurredAt: new Date(now - 22 * HOUR).toISOString(),
      kind: 'archived',
      actor: 'Maya',
      subject: 'legacy-vue-rules',
      detail: 'archived',
      spaceName: 'Platform',
    },
    {
      id: 'stub-5',
      occurredAt: new Date(now - 2 * DAY).toISOString(),
      kind: 'edited',
      actor: 'Antoine',
      subject: 'api-conventions',
      detail: 'updated',
      spaceName: 'Platform',
    },
    {
      id: 'stub-6',
      occurredAt: new Date(now - 3 * DAY).toISOString(),
      kind: 'deployed',
      actor: 'Joan',
      subject: 'infra-tools',
      detail: 'deployed to 2 targets',
      spaceName: 'Platform',
    },
    {
      id: 'stub-7',
      occurredAt: new Date(now - 5 * DAY).toISOString(),
      kind: 'edited',
      actor: 'Sarah',
      subject: 'security-headers',
      detail: 'updated',
      spaceName: 'Platform',
    },
  ];
}
