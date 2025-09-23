import {
  PMButton,
  PMLink,
  PMPage,
  PMPageSection,
  PMVStack,
} from '@packmind/ui';
import { NavLink, useNavigate } from 'react-router';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export default function SettingsIndexRouteModule() {
  const navigate = useNavigate();
  return (
    <PMPage
      title="Settings"
      breadcrumbComponent={<AutobreadCrumb />}
      centeredHeader
    >
      <PMVStack gap={6} align="stretch" maxWidth={'xl'} mx={'auto'}>
        <PMPageSection
          title={'Git'}
          backgroundColor="primary"
          cta={
            <PMButton
              onClick={() => {
                navigate(`git`);
              }}
              variant="tertiary"
            >
              Manage
            </PMButton>
          }
        >
          <PMLink asChild>
            <NavLink to={`git`}>
              Manage your git providers and repositories
            </NavLink>
          </PMLink>
        </PMPageSection>
        <PMPageSection
          title={'Users'}
          backgroundColor="primary"
          cta={
            <PMButton
              onClick={() => {
                navigate(`users`);
              }}
              variant="tertiary"
            >
              Manage
            </PMButton>
          }
        >
          <PMLink asChild>
            <NavLink to={`users`}>Manage your organization users</NavLink>
          </PMLink>
        </PMPageSection>
      </PMVStack>
    </PMPage>
  );
}
