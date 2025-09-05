import { PMBreadcrumb } from '@packmind/ui';
import { UIMatch, useMatches } from 'react-router';

export const AutobreadCrumb = () => {
  const matches = useMatches();
  const crumbs = matches.filter(isCrumbHandle).map((match) => {
    return match.handle.crumb(match);
  });

  return <PMBreadcrumb segments={crumbs} />;
};

type CrumbHandle = {
  crumb: (match: UIMatch) => React.ReactNode;
};

function isCrumbHandle(
  match: UIMatch,
): match is typeof match & { handle: CrumbHandle } {
  return (
    typeof match.handle === 'object' &&
    match.handle !== null &&
    typeof (match.handle as CrumbHandle).crumb === 'function'
  );
}
