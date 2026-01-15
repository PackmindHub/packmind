import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { routes } from '../../../shared/utils/routes';
import { SkillNavKey } from '../utils/skillNavigation';

interface IUseSkillSectionNavigationArgs {
  skillSlug: string;
  orgSlug?: string;
  spaceSlug?: string;
}

export const useSkillSectionNavigation = ({
  skillSlug,
  orgSlug,
  spaceSlug,
}: IUseSkillSectionNavigationArgs) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getPathForNavKey = useCallback(
    (navKey: SkillNavKey): string | null => {
      if (!orgSlug || !spaceSlug) {
        return null;
      }

      if (navKey === 'files') {
        return routes.space.toSkillFiles(orgSlug, spaceSlug, skillSlug);
      }

      if (navKey === 'distributions') {
        return routes.space.toSkillDistributions(orgSlug, spaceSlug, skillSlug);
      }

      return null;
    },
    [orgSlug, spaceSlug, skillSlug],
  );

  const activeSection: SkillNavKey = useMemo(() => {
    if (location.pathname.includes('/distributions')) {
      return 'distributions';
    }

    return 'files';
  }, [location.pathname]);

  const handleSectionSelect = useCallback(
    (value: SkillNavKey) => {
      const targetPath = getPathForNavKey(value);
      if (!targetPath) {
        return;
      }

      if (location.pathname.startsWith(targetPath)) {
        return;
      }

      navigate(targetPath);
    },
    [getPathForNavKey, location.pathname, navigate],
  );

  return {
    activeSection,
    handleSectionSelect,
    getPathForNavKey,
  };
};
