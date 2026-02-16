import {
  type LoaderFunctionArgs,
  Outlet,
  redirect,
  useNavigate,
  useParams,
} from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import {
  getMeQueryOptions,
  useGetMeQuery,
} from '../../src/domain/accounts/api/queries/UserQueries';
import {
  PMFlex,
  PMGrid,
  PMHeading,
  pmToaster,
  PMVerticalNav,
  PMVerticalNavSection,
} from '@packmind/ui';
import { useEffect } from 'react';
import { MeResponse } from '../../src/domain/accounts/api/gateways/IAuthGateway';
import { SidebarNavigationLink } from '../../src/domain/organizations/components/SidebarNavigation';
import { routes } from '../../src/shared/utils/routes';
import { SettingsRouteDataTestIds } from '@packmind/frontend';

type HasAccessResponse =
  | {
      hasAccess: true;
      toast?: never;
      redirect?: never;
    }
  | {
      hasAccess: false;
      toast: { title: string; type: string };
      redirect: { url: string };
    };

function hasAccess(me: MeResponse | undefined): HasAccessResponse {
  if (me?.organization && me.organization.role !== 'admin') {
    return {
      hasAccess: false,
      toast: {
        type: 'error',
        title: 'Settings are limited to administrators',
      },
      redirect: { url: `/org/${me.organization.slug}` },
    };
  }

  return { hasAccess: true };
}

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await queryClient.ensureQueryData(getMeQueryOptions());
  const hasAccessResponse = hasAccess(me);

  if (!hasAccessResponse.hasAccess) {
    pmToaster.create(hasAccessResponse.toast);
    throw redirect(hasAccessResponse.redirect.url);
  }
}

export default function SettingsIndexRouteModule() {
  const { data: me } = useGetMeQuery();
  const navigate = useNavigate();
  const { orgSlug } = useParams();

  useEffect(() => {
    const hasAccessResponse = hasAccess(me);
    if (!hasAccessResponse.hasAccess) {
      pmToaster.create(hasAccessResponse.toast);
      navigate(hasAccessResponse.redirect.url);
    }
  }, [me, navigate]);

  return (
    <PMGrid height={'full'} gridTemplateColumns={'fit-content(200px) 1fr'}>
      <PMVerticalNav
        logo={false}
        headerNav={
          <PMFlex height={'50px'} alignItems={'center'}>
            <PMHeading level="h4" fontWeight={'bold'} color={'secondary'}>
              Settings
            </PMHeading>
          </PMFlex>
        }
      >
        <PMVerticalNavSection
          navEntries={[
            <SidebarNavigationLink
              key="users"
              url={orgSlug ? routes.org.toSettingsUsers(orgSlug) : '#'}
              label="Users"
              exact
              data-testid={SettingsRouteDataTestIds.UsersLink}
            />,
          ]}
        />

        <PMVerticalNavSection
          title="Distribution"
          navEntries={[
            <SidebarNavigationLink
              key="git"
              url={orgSlug ? routes.org.toSettingsGit(orgSlug) : '#'}
              label="Git"
              exact
              data-testid={SettingsRouteDataTestIds.GitLink}
            />,

            <SidebarNavigationLink
              key="rendering"
              url={orgSlug ? routes.org.toSettingsDistribution(orgSlug) : '#'}
              label="Rendering"
              exact
            />,

            <SidebarNavigationLink
              key="targets"
              url={orgSlug ? routes.org.toSettingsTargets(orgSlug) : '#'}
              label="Targets"
              exact
            />,
          ]}
        />

        <PMVerticalNavSection
          title="AI"
          navEntries={[
            <SidebarNavigationLink
              key="llm"
              url={orgSlug ? routes.org.toSettingsLLM(orgSlug) : '#'}
              label="Provider"
              exact
            />,
          ]}
        />
      </PMVerticalNav>

      <Outlet />
    </PMGrid>
  );
}
