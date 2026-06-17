import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { LuBookOpen, LuPackage, LuSparkles, LuTerminal } from 'react-icons/lu';
import { PMBadge, PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import type { SearchArtifactType, SearchResult } from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { routes } from '../../../shared/utils/routes';
import { highlightMatch } from '../utils/highlight';

const TYPE_META: Record<
  SearchArtifactType,
  { label: string; icon: ReactNode }
> = {
  standard: { label: 'Standard', icon: <LuBookOpen /> },
  command: { label: 'Command', icon: <LuTerminal /> },
  skill: { label: 'Skill', icon: <LuSparkles /> },
  package: { label: 'Package', icon: <LuPackage /> },
};

interface SearchResultRowProps {
  result: SearchResult;
  term: string;
  onSelect: () => void;
}

/**
 * A single clickable search result rendered in the navbar dropdown.
 *
 * Clicking (or activating with Enter/Space) navigates to the artifact's
 * single-item page. Routing keys differ by type: standards, commands and
 * packages are addressed by id, skills by slug.
 */
export const SearchResultRow = ({
  result,
  term,
  onSelect,
}: SearchResultRowProps) => {
  const navigate = useNavigate();
  const { organization } = useAuthContext();
  const orgSlug = organization?.slug ?? '';
  const meta = TYPE_META[result.type];

  const handleSelect = () => {
    const spaceSlug = result.spaceSlug;
    let path: string;
    switch (result.type) {
      case 'standard':
        path = routes.space.toStandard(orgSlug, spaceSlug, result.id);
        break;
      case 'command':
        path = routes.space.toCommand(orgSlug, spaceSlug, result.id);
        break;
      case 'skill':
        path = routes.space.toSkill(orgSlug, spaceSlug, result.slug);
        break;
      case 'package':
        path = routes.space.toPackage(orgSlug, spaceSlug, result.id);
        break;
    }
    navigate(path);
    onSelect();
  };

  return (
    <PMBox
      role="button"
      tabIndex={0}
      w="full"
      textAlign="left"
      px={3}
      py={2}
      cursor="pointer"
      _hover={{ backgroundColor: '{colors.background.tertiary}' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: '{colors.blue.500}',
      }}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect();
        }
      }}
    >
      <PMHStack gap={2} align="start" w="full">
        <PMText color="faded" aria-hidden minW="16px">
          {meta.icon}
        </PMText>
        <PMVStack gap={0} align="flex-start" flex={1} minW={0}>
          <PMHStack gap={2} align="center" w="full">
            <PMText
              variant="body-important"
              color="primary"
              lineClamp={1}
              minW={0}
              flex={1}
            >
              {highlightMatch(result.name, term)}
            </PMText>
            <PMBadge size="sm" variant="subtle" colorPalette="blue">
              {meta.label}
            </PMBadge>
          </PMHStack>
          {result.description ? (
            <PMText variant="small" color="secondary" lineClamp={1} w="full">
              {highlightMatch(result.description, term)}
            </PMText>
          ) : null}
        </PMVStack>
      </PMHStack>
    </PMBox>
  );
};
