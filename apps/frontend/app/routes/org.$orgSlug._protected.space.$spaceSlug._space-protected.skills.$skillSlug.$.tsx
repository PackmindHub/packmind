import { NavLink, redirect, useLoaderData, useParams } from 'react-router';
import { Skill, SkillWithFiles } from '@packmind/types';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import {
  getSkillBySlugQueryOptions,
  getSkillsBySpaceQueryOptions,
  useGetSkillBySlugQuery,
  useGetSkillsQuery,
} from '../../src/domain/skills/api/queries/SkillsQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { PMPage, PMBox, PMText } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { SkillDetails } from '../../src/domain/skills/components/SkillDetails';

interface ISkillDetailLoaderData {
  skill: SkillWithFiles;
  skills: Skill[];
  skillSlug: string;
}

export async function clientLoader({
  params,
}: {
  params: {
    orgSlug: string;
    spaceSlug: string;
    skillSlug: string;
    '*': string;
  };
}): Promise<ISkillDetailLoaderData> {
  const me = await queryClient.fetchQuery(getMeQueryOptions());
  if (!me.organization) {
    throw new Error('Organization not found');
  }

  const space = await queryClient.fetchQuery(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization.id),
  );
  if (!space) {
    throw new Error('Space not found');
  }

  // Fetch the skill directly by slug
  const skillWithFiles = await queryClient.fetchQuery(
    getSkillBySlugQueryOptions(me.organization.id, space.id, params.skillSlug),
  );

  if (!skillWithFiles) {
    throw redirect(routes.org.toDashboard(me.organization.slug));
  }

  // Fetch skills list for sidebar navigation
  const skillsList = (await queryClient.fetchQuery(
    getSkillsBySpaceQueryOptions(me.organization.id, space.id),
  )) as Skill[];

  return {
    skill: skillWithFiles,
    skills: skillsList,
    skillSlug: params.skillSlug,
  };
}

export const handle = {
  crumb: ({
    params,
    data,
  }: {
    params: { orgSlug: string; spaceSlug: string; skillSlug: string };
    data: ISkillDetailLoaderData;
  }) => {
    return (
      <NavLink
        to={routes.space.toSkill(
          params.orgSlug,
          params.spaceSlug,
          params.skillSlug,
        )}
      >
        {data.skill.skill.name}
      </NavLink>
    );
  },
};

export default function SkillDetailRouteModule() {
  const loaderData = useLoaderData() as ISkillDetailLoaderData | undefined;
  const {
    orgSlug,
    skillSlug,
    '*': filePath,
  } = useParams<{
    orgSlug: string;
    skillSlug: string;
    '*': string;
  }>();
  const { organization } = useAuthContext();

  const { data: skillWithFilesFromQuery } = useGetSkillBySlugQuery(skillSlug);
  const { data: skillsFromQuery, isLoading: skillsLoading } =
    useGetSkillsQuery();

  const skillWithFiles = skillWithFilesFromQuery ?? loaderData?.skill;
  const skills = skillsFromQuery ?? loaderData?.skills ?? [];

  if (!organization) {
    return null;
  }

  if (!skillWithFiles) {
    return (
      <PMPage
        title="Skill Not Found"
        subtitle="No skill found"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <PMText>
            The skill you&apos;re looking for doesn&apos;t exist or the slug is
            invalid.
          </PMText>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <SkillDetails
      skill={skillWithFiles.skill}
      files={skillWithFiles.files}
      latestVersion={skillWithFiles.latestVersion}
      skills={skills}
      skillsLoading={skillsLoading}
      orgSlug={orgSlug}
      selectedFilePath={filePath}
    />
  );
}
