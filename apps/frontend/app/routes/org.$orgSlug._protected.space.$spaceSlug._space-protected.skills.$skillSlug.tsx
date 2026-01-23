import { useMemo, useState } from 'react';
import {
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';
import {
  createSkillFileId,
  Skill,
  SkillFile,
  SkillVersion,
  SkillWithFiles,
} from '@packmind/types';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import {
  getSkillBySlugQueryOptions,
  getSkillsBySpaceQueryOptions,
  useGetSkillBySlugQuery,
  useGetSkillsQuery,
  useDeleteSkillMutation,
} from '../../src/domain/skills/api/queries/SkillsQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import {
  PMPage,
  PMBox,
  PMText,
  PMGrid,
  PMAlert,
  PMFeatureFlag,
  DEFAULT_FEATURE_DOMAIN_MAP,
  SKILL_DELETION_FEATURE_KEY,
} from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { SkillDetailsSidebar } from '../../src/domain/skills/components/SkillDetailsSidebar';
import { SkillVersionHistoryHeader } from '../../src/domain/skills/components/SkillVersionHistoryHeader';
import { useSkillSectionNavigation } from '../../src/domain/skills/hooks/useSkillSectionNavigation';
import { SkillActions } from '../../src/domain/skills/components/SkillActions';
import { SKILL_MESSAGES } from '../../src/domain/skills/constants/messages';

const SKILL_MD_FILENAME = 'SKILL.md';

export interface ISkillDetailsOutletContext {
  skill: Skill;
  files: SkillFile[];
  latestVersion: SkillVersion;
  skills: Skill[];
  skillsLoading: boolean;
  orgSlug: string | undefined;
  spaceSlug: string | undefined;
}

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

  const skillWithFiles = await queryClient.fetchQuery(
    getSkillBySlugQueryOptions(me.organization.id, space.id, params.skillSlug),
  );

  if (!skillWithFiles) {
    throw redirect(routes.org.toDashboard(me.organization.slug));
  }

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

export default function SkillDetailLayoutRouteModule() {
  const loaderData = useLoaderData() as ISkillDetailLoaderData | undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const { orgSlug, spaceSlug, skillSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    skillSlug: string;
  }>();
  const { organization, user } = useAuthContext();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { data: skillWithFilesFromQuery } = useGetSkillBySlugQuery(skillSlug);
  const { data: skillsFromQuery, isLoading: skillsLoading } =
    useGetSkillsQuery();
  const deleteSkillMutation = useDeleteSkillMutation();

  const skillWithFiles = skillWithFilesFromQuery ?? loaderData?.skill;
  const skills = skillsFromQuery ?? loaderData?.skills ?? [];

  const { activeSection, handleSectionSelect, getPathForNavKey } =
    useSkillSectionNavigation({
      skillSlug: skillSlug ?? '',
      orgSlug,
      spaceSlug,
    });

  // Extract file path from URL for file tree selection
  const selectedFilePath = useMemo(() => {
    const filesMatch = location.pathname.match(/\/files\/(.+)$/);
    if (filesMatch) {
      return filesMatch[1];
    }
    if (
      location.pathname.endsWith('/files') ||
      location.pathname.includes('/files')
    ) {
      return SKILL_MD_FILENAME;
    }
    return null;
  }, [location.pathname]);

  // Create virtual SKILL.md file
  const skillMdFile = useMemo<SkillFile | null>(() => {
    if (!skillWithFiles) return null;
    return {
      id: createSkillFileId(''),
      skillVersionId: skillWithFiles.latestVersion.id,
      permissions: '',
      path: SKILL_MD_FILENAME,
      content: skillWithFiles.latestVersion.prompt,
      isBase64: false,
    };
  }, [skillWithFiles]);

  // Combine virtual SKILL.md with other files for the sidebar
  const allFiles = useMemo(() => {
    if (!skillMdFile || !skillWithFiles) return [];
    return [skillMdFile, ...skillWithFiles.files];
  }, [skillMdFile, skillWithFiles]);

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

  const handleSkillChange = (skillId: string) => {
    const selectedSkill = skills.find((s) => s.id === skillId);
    if (selectedSkill && orgSlug && spaceSlug) {
      navigate(
        routes.space.toSkillFiles(orgSlug, spaceSlug, selectedSkill.slug),
      );
    }
  };

  const handleFileSelect = (path: string) => {
    if (!orgSlug || !spaceSlug || !skillSlug) return;

    if (path === SKILL_MD_FILENAME) {
      navigate(routes.space.toSkillFiles(orgSlug, spaceSlug, skillSlug), {
        replace: true,
      });
    } else {
      navigate(
        routes.space.toSkillFileWithPath(orgSlug, spaceSlug, skillSlug, path),
        {
          replace: true,
        },
      );
    }
  };

  const handleDelete = async () => {
    if (!skillWithFiles) return;

    try {
      await deleteSkillMutation.mutateAsync(skillWithFiles.skill.id);
      setDeleteModalOpen(false);

      if (orgSlug && spaceSlug) {
        navigate(routes.space.toSkills(orgSlug, spaceSlug));
        return;
      }
      navigate('..');
    } catch (error) {
      console.error('Failed to delete skill:', error);
      setDeleteAlert({
        type: 'error',
        message: SKILL_MESSAGES.error.deleteFailed,
      });
      setDeleteModalOpen(false);
    }
  };

  const handleDeleteRequest = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteDialogChange = (isOpen: boolean) => {
    setDeleteModalOpen(isOpen);
  };

  const outletContext: ISkillDetailsOutletContext = {
    skill: skillWithFiles.skill,
    files: skillWithFiles.files,
    latestVersion: skillWithFiles.latestVersion,
    skills,
    skillsLoading,
    orgSlug,
    spaceSlug,
  };

  return (
    <PMGrid
      height="full"
      gridTemplateColumns={{
        base: 'minmax(240px, 270px) minmax(0, 1fr)',
      }}
      alignItems="start"
      overflowX="auto"
    >
      <SkillDetailsSidebar
        skill={skillWithFiles.skill}
        skills={skills}
        activeSection={activeSection}
        onSectionSelect={handleSectionSelect}
        onSkillChange={handleSkillChange}
        isSkillSelectDisabled={!orgSlug || !spaceSlug}
        skillsLoading={skillsLoading}
        getPathForNavKey={getPathForNavKey}
        files={allFiles}
        selectedFilePath={selectedFilePath}
        onFileSelect={handleFileSelect}
      />

      <PMPage
        title={skillWithFiles.skill.name}
        breadcrumbComponent={
          <SkillVersionHistoryHeader
            skill={skillWithFiles.skill}
            latestVersion={skillWithFiles.latestVersion}
          />
        }
        actions={
          <PMFeatureFlag
            featureKeys={[SKILL_DELETION_FEATURE_KEY]}
            featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
            userEmail={user?.email}
          >
            <SkillActions
              onDeleteRequest={handleDeleteRequest}
              onDeleteDialogChange={handleDeleteDialogChange}
              onConfirmDelete={handleDelete}
              isDeleteDialogOpen={deleteModalOpen}
              isDeleting={deleteSkillMutation.isPending}
              deleteDialogMessage={SKILL_MESSAGES.confirmation.deleteSkill(
                skillWithFiles.skill.name,
              )}
            />
          </PMFeatureFlag>
        }
      >
        {deleteAlert && (
          <PMAlert.Root status={deleteAlert.type} width="lg" mb={4}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        )}
        <Outlet context={outletContext} />
      </PMPage>
    </PMGrid>
  );
}
