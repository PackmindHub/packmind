import React from 'react';
import { NavLink, useParams } from 'react-router';
import { PMBox, PMVStack, PMText, PMTooltip } from '@packmind/ui';
import { Rule } from '@packmind/types';
import { routes } from '../../../shared/utils/routes';

interface RulesListProps {
  rules?: Rule[];
  isLoading: boolean;
  isError?: boolean;
}

export const RulesList: React.FC<RulesListProps> = ({
  rules,
  isLoading,
  isError,
}) => {
  const { orgSlug, spaceSlug, standardId } = useParams() as {
    orgSlug?: string;
    spaceSlug?: string;
    standardId?: string;
  };
  if (isLoading) {
    return <PMText>Loading rules...</PMText>;
  }

  if (isError) {
    return <PMText color="error">Failed to load rules.</PMText>;
  }

  if (!rules || rules.length === 0) {
    return <PMText>No rules found for this standard.</PMText>;
  }

  return (
    <PMVStack gap={2} align="stretch" w={'full'}>
      {rules.map((rule) => (
        <NavLink
          key={rule.id}
          to={
            orgSlug && spaceSlug && standardId
              ? routes.space.toStandardRules(orgSlug, spaceSlug, standardId) +
                `/${rule.id}`
              : '#'
          }
          style={{ textDecoration: 'none' }}
        >
          <PMBox p={4} bg="background.tertiary" w={'100%'}>
            <PMTooltip label={rule.content} placement="top">
              <PMText
                color="primary"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {rule.content}
              </PMText>
            </PMTooltip>
          </PMBox>
        </NavLink>
      ))}
    </PMVStack>
  );
};
