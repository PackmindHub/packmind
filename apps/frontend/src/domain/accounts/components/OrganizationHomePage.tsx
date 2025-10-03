import React from 'react';
import { PMBox, PMGrid, PMGridItem, PMPage, PMVStack } from '@packmind/ui';
import { DashboardKPI } from '../../organizations/components/dashboard/DashboardKPI';
import { OutdatedTargetsSection } from '../../organizations/components/dashboard/OutdatedTargetsSection';
import { GettingStartedWidget } from '../../organizations/components/dashboard/GettingStartedWidget';
import { OrganizationOnboardingChecklist } from '../../organizations/components/dashboard/OrganizationOnboardingChecklist';
import { useGetStandardsQuery } from '../../standards/api/queries/StandardsQueries';
import { useGetRecipesQuery } from '../../recipes/api/queries/RecipesQueries';

export const OrganizationHomePage: React.FC = () => {
  const { data: standards = [], isLoading: isStandardsLoading } =
    useGetStandardsQuery();
  const { data: recipes = [], isLoading: isRecipesLoading } =
    useGetRecipesQuery();

  const noContent =
    !isStandardsLoading &&
    !isRecipesLoading &&
    standards.length === 0 &&
    recipes.length === 0;

  return (
    <PMPage title={'👋 Welcome to your dashboard'} centeredHeader isFullWidth>
      {noContent ? (
        <PMBox width="xl" marginX="auto">
          <PMVStack gap={8} align="stretch">
            <GettingStartedWidget />
            <OrganizationOnboardingChecklist />
          </PMVStack>
        </PMBox>
      ) : (
        <PMGrid gridTemplateColumns={'3fr 2fr'} gap={8}>
          <PMGridItem>
            <PMVStack gap={8} align="stretch">
              <DashboardKPI />
              <OutdatedTargetsSection />
            </PMVStack>
          </PMGridItem>
          <PMGridItem>
            <PMVStack gap={8} align="stretch">
              <GettingStartedWidget />
              <OrganizationOnboardingChecklist />
            </PMVStack>
          </PMGridItem>
        </PMGrid>
      )}
    </PMPage>
  );
};
