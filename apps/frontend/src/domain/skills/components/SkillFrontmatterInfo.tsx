import { useMemo } from 'react';
import {
  PMHeading,
  PMHStack,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { Collapsible, useCollapsibleContext } from '@chakra-ui/react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';

const ADDITIONAL_FIELDS_ORDER = [
  'argumentHint',
  'disableModelInvocation',
  'userInvocable',
  'model',
  'context',
  'agent',
  'hooks',
];

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function sortAdditionalPropertiesEntries(
  props: Record<string, unknown>,
): [string, unknown][] {
  const entries = Object.entries(props);
  const orderIndex = new Map(ADDITIONAL_FIELDS_ORDER.map((key, i) => [key, i]));
  return entries.sort(([a], [b]) => {
    const aIdx = orderIndex.get(a);
    const bIdx = orderIndex.get(b);
    if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
    if (aIdx !== undefined) return -1;
    if (bIdx !== undefined) return 1;
    return a.localeCompare(b);
  });
}

function isDeepValue(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === 'object' && item !== null);
  }
  return true;
}

function toYamlLike(value: unknown, indent: number): string {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const isSimpleArray = value.every((item) => !isDeepValue(item));
    if (isSimpleArray) {
      return `[${value.join(', ')}]`;
    }
    return value
      .map((item) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const entries = Object.entries(item);
          if (entries.length === 0) return `${pad}- {}`;
          return entries
            .map(([k, v], i) => {
              const linePrefix = i === 0 ? `${pad}- ` : `${pad}  `;
              if (isDeepValue(v)) {
                return `${linePrefix}${k}:\n${toYamlLike(v, indent + 2)}`;
              }
              return `${linePrefix}${k}: ${String(v)}`;
            })
            .join('\n');
        }
        if (isDeepValue(item)) {
          return `${pad}-\n${toYamlLike(item, indent + 1)}`;
        }
        return `${pad}- ${String(item)}`;
      })
      .join('\n');
  }

  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  return entries
    .map(([k, v]) => {
      if (isDeepValue(v)) {
        return `${pad}${k}:\n${toYamlLike(v, indent + 1)}`;
      }
      return `${pad}${k}: ${String(v)}`;
    })
    .join('\n');
}

interface SkillFrontmatterData {
  description: string;
  license?: string;
  compatibility?: string;
  allowedTools?: string;
  metadata?: Record<string, string>;
  additionalProperties?: Record<string, unknown>;
}

interface SkillFrontmatterInfoProps {
  skillVersion: SkillFrontmatterData;
}

const CollapsibleIcon = () => {
  const { open } = useCollapsibleContext();
  return open ? <LuChevronUp /> : <LuChevronDown />;
};

export function SkillFrontmatterInfo({
  skillVersion,
}: SkillFrontmatterInfoProps) {
  const hasInfoFields = useMemo(
    () =>
      Boolean(
        skillVersion.license ||
        skillVersion.compatibility ||
        skillVersion.allowedTools ||
        (skillVersion.metadata &&
          Object.keys(skillVersion.metadata).length > 0) ||
        (skillVersion.additionalProperties &&
          Object.keys(skillVersion.additionalProperties).length > 0),
      ),
    [skillVersion],
  );

  return (
    <PMVStack
      align="stretch"
      gap={2}
      border="solid 1px"
      borderColor="border.tertiary"
      borderRadius="md"
      bg="background.tertiary"
      p={4}
    >
      <PMHeading as="h3" size="sm">
        Frontmatter
      </PMHeading>
      <PMVStack gap={2} align="flex-start">
        <PMText color="secondary" fontSize="sm">
          Description:
        </PMText>
        <PMText>{skillVersion.description}</PMText>
      </PMVStack>
      {hasInfoFields && (
        <Collapsible.Root>
          <PMSeparator my={2} borderColor="border.secondary" />
          <Collapsible.Trigger cursor="pointer" textAlign="left">
            <PMHStack gap={1} align="center">
              <PMText color="secondary" fontSize="sm">
                More details
              </PMText>
              <CollapsibleIcon />
            </PMHStack>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <PMVStack gap={2} align="stretch" pt={2}>
              {skillVersion.license && (
                <PMHStack gap={2} align="baseline">
                  <PMText color="secondary" fontSize="sm">
                    License:
                  </PMText>
                  <PMText fontSize="sm">{skillVersion.license}</PMText>
                </PMHStack>
              )}
              {skillVersion.compatibility && (
                <PMHStack gap={2} align="baseline">
                  <PMText color="secondary" fontSize="sm">
                    Compatibility:
                  </PMText>
                  <PMText fontSize="sm">{skillVersion.compatibility}</PMText>
                </PMHStack>
              )}
              {skillVersion.allowedTools && (
                <PMHStack gap={2} align="baseline">
                  <PMText color="secondary" fontSize="sm">
                    Allowed Tools:
                  </PMText>
                  <PMText fontSize="sm">{skillVersion.allowedTools}</PMText>
                </PMHStack>
              )}
              {skillVersion.metadata &&
                Object.keys(skillVersion.metadata).length > 0 && (
                  <PMVStack gap={1} align="stretch">
                    <PMText color="secondary" fontSize="sm">
                      Metadata:
                    </PMText>
                    <PMVStack gap={1} pl={4} align="flex-start">
                      {Object.entries(skillVersion.metadata).map(
                        ([key, value]) => (
                          <PMHStack key={key} gap={2}>
                            <PMText color="secondary" fontSize="sm">
                              - {key}:
                            </PMText>
                            <PMText fontSize="sm">
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                            </PMText>
                          </PMHStack>
                        ),
                      )}
                    </PMVStack>
                  </PMVStack>
                )}
              {skillVersion.additionalProperties &&
                Object.keys(skillVersion.additionalProperties).length > 0 &&
                sortAdditionalPropertiesEntries(
                  skillVersion.additionalProperties,
                ).map(([key, value]) =>
                  isDeepValue(value) ? (
                    <PMVStack key={key} gap={0} align="stretch">
                      <PMText color="secondary" fontSize="sm">
                        {camelToKebab(key)}:
                      </PMText>
                      <PMText fontSize="sm" whiteSpace="pre-wrap" pl={4}>
                        {toYamlLike(value, 0)}
                      </PMText>
                    </PMVStack>
                  ) : (
                    <PMHStack key={key} gap={2} align="baseline">
                      <PMText color="secondary" fontSize="sm">
                        {camelToKebab(key)}:
                      </PMText>
                      <PMText fontSize="sm">{String(value)}</PMText>
                    </PMHStack>
                  ),
                )}
            </PMVStack>
          </Collapsible.Content>
        </Collapsible.Root>
      )}
    </PMVStack>
  );
}
