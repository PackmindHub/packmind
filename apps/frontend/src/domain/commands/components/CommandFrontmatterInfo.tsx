import {
  PMBox,
  PMHeading,
  PMHStack,
  PMSeparator,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { Collapsible, useCollapsibleContext } from '@chakra-ui/react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { isDeepValue, toYamlLike } from '@packmind/types';

import type { CommandFrontmatter } from '../utils/parseCommandFrontmatter';

const CollapsibleIcon = () => {
  const { open } = useCollapsibleContext();
  return open ? <LuChevronUp /> : <LuChevronDown />;
};

/**
 * A command's leading YAML block, shown as the declaration it is.
 *
 * The skill page's counterpart reads named columns off a version; a command has
 * none, so this one reads whatever the block declared. That is also why it is
 * built to survive a block it cannot parse: the fields of a command's
 * frontmatter are not a shape Packmind ever agreed on, and a block that does
 * not parse is still content the author wrote.
 */
export function CommandFrontmatterInfo({
  frontmatter,
}: Readonly<{ frontmatter: CommandFrontmatter }>) {
  const { fields, raw } = frontmatter;

  if (raw === null) {
    return null;
  }

  const description = fields?.find(([key]) => key === 'description')?.[1];
  const hasDescription =
    typeof description === 'string' && Boolean(description);
  const otherFields = fields?.filter(([key]) => key !== 'description') ?? [];

  // An empty block, or one whose only key is an empty description: a heading
  // over nothing reads as a section that failed to load.
  if (fields !== null && !hasDescription && otherFields.length === 0) {
    return null;
  }

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

      {hasDescription && (
        <PMVStack gap={2} align="flex-start">
          <PMText color="secondary" fontSize="sm">
            Description:
          </PMText>
          <PMText>{description as string}</PMText>
        </PMVStack>
      )}

      {/*
        The block as written, for a command whose frontmatter is not a mapping
        this pane can list. Dropping it would hide something the file carries,
        and printing it as Markdown is what put it in the page's title.
      */}
      {fields === null && (
        <PMBox
          as="pre"
          fontSize="sm"
          whiteSpace="pre-wrap"
          wordBreak="break-word"
        >
          {raw}
        </PMBox>
      )}

      {otherFields.length > 0 && (
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
              {otherFields.map(([key, value]) =>
                isDeepValue(value) ? (
                  <PMVStack key={key} gap={0} align="stretch">
                    <PMText color="secondary" fontSize="sm">
                      {key}:
                    </PMText>
                    <PMText fontSize="sm" whiteSpace="pre-wrap" pl={4}>
                      {toYamlLike(value, 0)}
                    </PMText>
                  </PMVStack>
                ) : (
                  <PMHStack key={key} gap={2} align="baseline">
                    <PMText color="secondary" fontSize="sm">
                      {key}:
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
