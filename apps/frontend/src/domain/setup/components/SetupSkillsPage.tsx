import React from 'react';
import {
  PMAlert,
  PMHeading,
  PMPage,
  PMPageSection,
  PMTable,
  PMTableColumn,
  PMText,
} from '@packmind/ui';
import { DownloadDefaultSkillsPopover } from '../../skills/components/DownloadDefaultSkillsPopover';

interface DefaultSkill {
  name: string;
  description: string;
  slug: string;
  minimumVersion: string;
}

const defaultSkills: DefaultSkill[] = [
  {
    name: 'Create Skill',
    description:
      'Create new skills to extend your agent capabilities with specialized knowledge and workflows.',
    slug: 'packmind-create-skill',
    minimumVersion: '1.0.0',
  },
  {
    name: 'Create Standard',
    description:
      'Create coding standards to enforce team conventions and best practices.',
    slug: 'packmind-create-standard',
    minimumVersion: '1.0.0',
  },
  {
    name: 'Onboard',
    description:
      'Automated onboarding that analyzes your codebase and generates initial standards and commands.',
    slug: 'packmind-onboard',
    minimumVersion: '1.0.0',
  },
  {
    name: 'Create Command',
    description:
      'Create reusable commands for multi-step workflows and task automation.',
    slug: 'packmind-create-command',
    minimumVersion: '1.0.0',
  },
  {
    name: 'Create Package',
    description:
      'Create packages to organize and distribute standards, commands, and skills.',
    slug: 'packmind-create-package',
    minimumVersion: '1.0.0',
  },
  {
    name: 'CLI List Commands',
    description:
      'Discover available standards, commands, and skills in your organization.',
    slug: 'packmind-cli-list-commands',
    minimumVersion: '1.0.0',
  },
];

const skillsTableColumns: PMTableColumn[] = [
  {
    key: 'name',
    header: 'Name',
    width: '250px',
    align: 'left',
  },
  {
    key: 'identifier',
    header: 'Identifier',
    width: '280px',
    align: 'left',
  },
  {
    key: 'description',
    header: 'Description',
    align: 'left',
    grow: true,
  },
];

type SkillTableRow = {
  name: string;
  identifier: React.ReactNode;
  description: string;
};

export const SetupSkillsPage = () => {
  const tableData: SkillTableRow[] = defaultSkills.map((skill) => ({
    name: skill.name,
    identifier: <>{skill.slug}</>,
    description: skill.description,
  }));

  return (
    <PMPage
      title="Default skills"
      subtitle="Download and install Packmind's curated skills to enhance your AI agent's capabilities"
    >
      <PMPageSection
        title="Playbook management skills"
        backgroundColor="primary"
        cta={
          <DownloadDefaultSkillsPopover
            buttonVariant="tertiary"
            buttonSize="sm"
            buttonLabel="Get default skills"
          />
        }
      >
        <PMText variant="body" color="secondary" my={4}>
          These skills provide workflows to create new skills, standards,
          commands, and packages, as well as an onboarding skill that generates
          initial standards and commands based on your codebase.
        </PMText>

        {/* Skills table */}
        <PMTable<SkillTableRow>
          columns={skillsTableColumns}
          data={tableData}
          striped={true}
          hoverable={true}
          size="md"
          variant="line"
          tableProps={{
            border: 'solid 1px',
            borderColor: 'border.tertiary',
            borderRadius: 'md',
          }}
        />
      </PMPageSection>
    </PMPage>
  );
};
