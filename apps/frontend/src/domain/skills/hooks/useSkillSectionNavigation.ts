import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { routes } from '../../../shared/utils/routes';

type SkillNavKey = 'summary' | 'deployment';

type UseSkillSectionNavigationArgs = {
  skillSlug: string;
  orgSlug?: string;
  spaceSlug?: string;
};

export const useSkillSectionNavigation = ({
  skillSlug,
  orgSlug,
  spaceSlug,
}: UseSkillSectionNavigationArgs) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active section from URL
  const activeSection: SkillNavKey = useMemo(() => {
    if (location.pathname.endsWith('/deployment')) {
      return 'deployment';
    }
    return 'summary';
  }, [location.pathname]);

  const getPathForNavKey = useCallback(
    (navKey: SkillNavKey): string | null => {
      if (!orgSlug || !spaceSlug) {
        return null;
      }

      if (navKey === 'summary') {
        return routes.space.toSkillSummary(orgSlug, spaceSlug, skillSlug);
      }

      if (navKey === 'deployment') {
        return routes.space.toSkillDeployment(orgSlug, spaceSlug, skillSlug);
      }

      return null;
    },
    [orgSlug, spaceSlug, skillSlug],
  );

  const handleSectionSelect = (value: SkillNavKey) => {
    const targetPath = getPathForNavKey(value);
    if (!targetPath) {
      return;
    }

    if (targetPath === location.pathname) {
      return;
    }

    navigate(targetPath);
  };

  return {
    activeSection,
    handleSectionSelect,
    getPathForNavKey,
  };
};
