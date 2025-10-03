import {
  type LoaderFunctionArgs,
  NavLink,
  Outlet,
  redirect,
  useNavigate,
} from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import {
  getMeQueryOptions,
  useGetMeQuery,
} from '../../src/domain/accounts/api/queries/UserQueries';
import { pmToaster } from '@packmind/ui';
import { useEffect } from 'react';
import { MeResponse } from '@packmind/proprietary/frontend/domain/accounts/api/gateways/IAuthGateway';
import * as toast from '@zag-js/toast';

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

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return <NavLink to={`/org/${params.orgSlug}/settings`}>Settings</NavLink>;
  },
};

export default function SettingsIndexRouteModule() {
  const { data: me } = useGetMeQuery();
  const navigate = useNavigate();

  useEffect(() => {
    const hasAccessResponse = hasAccess(me);
    if (!hasAccessResponse.hasAccess) {
      pmToaster.create(hasAccessResponse.toast);
      navigate(hasAccessResponse.redirect.url);
    }
  }, [me, navigate]);

  return <Outlet />;
}
