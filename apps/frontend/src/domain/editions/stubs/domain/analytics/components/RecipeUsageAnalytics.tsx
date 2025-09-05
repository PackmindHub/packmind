import { PMAlert } from '@packmind/ui';

export const RecipeUsageAnalytics = () => {
  return (
    <PMAlert.Root status="info">
      <PMAlert.Indicator />
      <PMAlert.Title>
        Analytics are not available for Community edition users
      </PMAlert.Title>
    </PMAlert.Root>
  );
};
