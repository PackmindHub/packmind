import {
  PMBox,
  PMHeading,
  PMSpinner,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { formatDistanceToNowStrict } from 'date-fns';
import { TelemetryEvent } from '@packmind/types';
import { useGetTelemetryEventsQuery } from '../api/queries/TelemetryQueries';

type SkillActivation = {
  id: string;
  timestamp: string;
  userEmail: string;
  skillName: string;
  trigger: string;
};

type OtlpAttribute = {
  key: string;
  value?: { stringValue?: string };
};

type OtlpLogRecord = {
  observedTimeUnixNano?: string | number;
  timeUnixNano?: string | number;
  attributes?: OtlpAttribute[];
};

type OtlpRawPayload = {
  resourceLogs?: Array<{
    scopeLogs?: Array<{
      logRecords?: OtlpLogRecord[];
    }>;
  }>;
};

const getAttr = (
  attrs: OtlpAttribute[] | undefined,
  key: string,
): string | undefined => attrs?.find((a) => a.key === key)?.value?.stringValue;

const extractSkillActivations = (
  events: TelemetryEvent[],
): SkillActivation[] => {
  const out: SkillActivation[] = [];
  for (const event of events) {
    const payload = event.rawPayload as OtlpRawPayload | null | undefined;
    for (const r of payload?.resourceLogs ?? []) {
      for (const s of r.scopeLogs ?? []) {
        for (const rec of s.logRecords ?? []) {
          if (getAttr(rec.attributes, 'event.name') !== 'skill_activated') {
            continue;
          }
          const timestamp =
            getAttr(rec.attributes, 'event.timestamp') ??
            (rec.observedTimeUnixNano
              ? new Date(
                  Number(rec.observedTimeUnixNano) / 1_000_000,
                ).toISOString()
              : new Date(event.receivedAt).toISOString());
          out.push({
            id: `${event.id}-${out.length}`,
            timestamp,
            userEmail: getAttr(rec.attributes, 'user.email') ?? '',
            skillName: getAttr(rec.attributes, 'skill.name') ?? '',
            trigger: getAttr(rec.attributes, 'invocation_trigger') ?? '',
          });
        }
      }
    }
  }
  out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return out;
};

const COLUMNS: PMTableColumn[] = [
  { key: 'date', header: 'Date', align: 'left', width: '15%' },
  { key: 'user', header: 'User', align: 'left', width: '30%' },
  { key: 'skillName', header: 'Skill', align: 'left', grow: true },
  { key: 'trigger', header: 'Trigger', align: 'left', width: '15%' },
];

const noWrap = { whiteSpace: 'nowrap' as const };

export const SkillsUsageTable = () => {
  const { data, isLoading, error } = useGetTelemetryEventsQuery();

  const activations = data ? extractSkillActivations(data.events) : [];

  const rows: PMTableRow[] = activations.map((a) => ({
    key: a.id,
    date: (
      <span style={noWrap}>
        {formatDistanceToNowStrict(new Date(a.timestamp), { addSuffix: true })}
      </span>
    ),
    user: a.userEmail || '—',
    skillName: <span style={noWrap}>{a.skillName || '—'}</span>,
    trigger: <span style={noWrap}>{a.trigger || '—'}</span>,
  }));

  return (
    <PMBox mt={4}>
      <PMVStack align="stretch" gap={3}>
        <PMHeading level="h3">Skills usage</PMHeading>
        {isLoading ? (
          <PMSpinner />
        ) : error ? (
          <PMText color="secondary">Failed to load telemetry events.</PMText>
        ) : activations.length === 0 ? (
          <PMText color="secondary">No skill activations recorded yet.</PMText>
        ) : (
          <PMTable columns={COLUMNS} data={rows} />
        )}
      </PMVStack>
    </PMBox>
  );
};
