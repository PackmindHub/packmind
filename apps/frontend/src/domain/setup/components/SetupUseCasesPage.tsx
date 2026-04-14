import React from 'react';
import {
  PMPage,
  PMPageSection,
  PMText,
  PMCard,
  PMVStack,
  PMHStack,
  PMBadge,
  PMGrid,
  PMBox,
  PMIcon,
  PMLink,
} from '@packmind/ui';
import { LuFolderSearch, LuExternalLink } from 'react-icons/lu';
import {
  SiGithub,
  SiGitlab,
  SiSlack,
  SiJira,
  SiConfluence,
  SiNotion,
  SiSonarqube,
} from 'react-icons/si';

const REPO_URL = 'https://github.com/PackmindHub/demo-use-case-skills';

interface UseCaseSkill {
  name: string;
  description: string;
  folder: string;
  icon: React.ReactNode;
  requiredMcp: string;
}

const useCaseSkills: UseCaseSkill[] = [
  {
    name: 'GitHub PR comments',
    description:
      'Mine merged pull request review comments to surface coding conventions and team patterns.',
    folder: 'update-from-github-pr-comments',

    icon: <SiGithub />,
    requiredMcp: 'GitHub MCP',
  },
  {
    name: 'GitLab MR comments',
    description:
      'Extract merged merge request review comments to capture coding decisions and best practices.',
    folder: 'update-from-gitlab-mr-comments',

    icon: <SiGitlab />,
    requiredMcp: 'GitLab MCP',
  },
  {
    name: 'Slack discussions',
    description:
      'Mine Slack channel conversations to capture technical decisions and team knowledge.',
    folder: 'update-from-slack',

    icon: <SiSlack />,
    requiredMcp: 'Slack MCP',
  },
  {
    name: 'Jira issues',
    description:
      'Process resolved Jira issues to extract coding guidelines and architectural decisions.',
    folder: 'update-from-jira',

    icon: <SiJira />,
    requiredMcp: 'Jira MCP',
  },
  {
    name: 'Confluence pages',
    description:
      'Index Confluence pages and spaces to capture documented standards and guidelines.',
    folder: 'update-from-confluence',

    icon: <SiConfluence />,
    requiredMcp: 'Confluence MCP',
  },
  {
    name: 'Notion pages',
    description:
      'Pull content from Notion pages and databases to capture team knowledge and conventions.',
    folder: 'update-from-notion',

    icon: <SiNotion />,
    requiredMcp: 'Notion MCP',
  },
  {
    name: 'SonarQube issues',
    description:
      'Analyze SonarQube issues to derive coding standards from recurring code quality findings.',
    folder: 'update-from-sonar-issues',

    icon: <SiSonarqube />,
    requiredMcp: 'SonarQube MCP',
  },
  {
    name: 'Local context issues',
    description:
      'Scan local codebase context to identify patterns and generate coding standards.',
    folder: 'update-from-local-context-issues',

    icon: <LuFolderSearch />,
    requiredMcp: 'None',
  },
];

function UseCaseCard({ skill }: Readonly<{ skill: UseCaseSkill }>) {
  return (
    <a
      href={`${REPO_URL}/tree/main/${skill.folder}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'block', height: '100%', textDecoration: 'none' }}
    >
      <PMCard.Root
        border="solid 1px"
        borderRadius="md"
        borderColor="border.tertiary"
        _hover={{ shadow: 'md', borderColor: 'blue.500' }}
        transition="all 0.2s"
        cursor="pointer"
        height="100%"
      >
        <PMCard.Body p={5}>
          <PMHStack gap={4} alignItems="flex-start" height="100%">
            <PMBox
              flexShrink={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              width="44px"
              height="44px"
              borderRadius="md"
              bg="background.secondary"
            >
              <PMIcon boxSize={6} color="text.secondary">
                {skill.icon}
              </PMIcon>
            </PMBox>

            <PMVStack gap={2} alignItems="flex-start" flex={1} minWidth={0}>
              <PMHStack gap={2} width="100%">
                <PMText as="p" fontWeight="bold" fontSize="md" flex={1}>
                  {skill.name}
                </PMText>
                <PMIcon fontSize="sm" color="text.faded" flexShrink={0}>
                  <LuExternalLink />
                </PMIcon>
              </PMHStack>

              <PMText as="p" fontSize="sm" color="secondary">
                {skill.description}
              </PMText>

              {skill.requiredMcp !== 'None' && (
                <PMBadge colorScheme="gray" size="sm">
                  Requires: {skill.requiredMcp}
                </PMBadge>
              )}
            </PMVStack>
          </PMHStack>
        </PMCard.Body>
      </PMCard.Root>
    </a>
  );
}

export const SetupUseCasesPage = () => {
  return (
    <PMPage
      title="Use cases"
      subtitle="Ready-made skills to capture knowledge from your team's tools and feed your playbook"
    >
      <PMPageSection
        title="Integration skills"
        backgroundColor="primary"
        cta={
          <PMLink
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            fontSize="sm"
            color="text.link"
            display="flex"
            alignItems="center"
            gap={1}
          >
            View repository
            <PMIcon fontSize="sm">
              <LuExternalLink />
            </PMIcon>
          </PMLink>
        }
      >
        <PMText variant="body" color="secondary" my={4}>
          These skills connect your external tools to Packmind via MCP servers,
          automatically mining insights from code reviews, discussions, issues,
          and documentation to keep your playbook up to date.
        </PMText>

        <PMGrid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={4}>
          {useCaseSkills.map((skill) => (
            <UseCaseCard key={skill.folder} skill={skill} />
          ))}
        </PMGrid>
      </PMPageSection>
    </PMPage>
  );
};
