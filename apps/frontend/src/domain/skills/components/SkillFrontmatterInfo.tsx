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
import {
  camelToKebab,
  isDeepValue,
  sortAdditionalPropertiesKeys,
  toYamlLike,
} from '@packmind/types';

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
                sortAdditionalPropertiesKeys(
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
