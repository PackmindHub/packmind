import React from 'react';
import { PMPage, PMPageSection, PMTable, PMTableColumn } from '@packmind/ui';
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
      "Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends your agent's capabilities with specialized knowledge, workflows, or tool integrations.",
    slug: 'packmind-create-skill',
    minimumVersion: '1.0.0',
  },
  {
    name: 'Create Standard',
    description:
      'Guide for creating coding standards via the Packmind CLI. This skill should be used when users want to create a new coding standard (or add rules to an existing standard) that captures team conventions, best practices, or coding guidelines for distribution to your agent.',
    slug: 'packmind-create-standard',
    minimumVersion: '1.0.0',
  },
  {
    name: 'Onboard',
    description:
      'Complete automated onboarding: analyzes codebase, creates package, and generates standards & commands via CLI. Automatic package creation when none exist, user selection when packages are available.',
    slug: 'packmind-onboard',
    minimumVersion: '1.0.0',
  },
  {
    name: 'Create Command',
    description:
      'Guide for creating reusable commands via the Packmind CLI. This skill should be used when users want to create a new command that captures multi-step workflows, recipes, or task automation for distribution to your agent.',
    slug: 'packmind-create-command',
    minimumVersion: '1.0.0',
  },
  {
    name: 'Create Package',
    description:
      'Guide for creating Packmind packages via the CLI. This skill should be used when users want to create a new package to organize standards, commands, and skills for distribution.',
    slug: 'packmind-create-package',
    minimumVersion: '1.0.0',
  },
  {
    name: 'CLI List Commands',
    description:
      'Reference for Packmind CLI listing commands. This skill should be used when an agent needs to discover available standards, commands, or skills in the Packmind organization.',
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
    identifier: (
      <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
        {skill.slug}
      </span>
    ),
    description: skill.description,
  }));

  return (
    <PMPage
      title="Default Skills"
      subtitle="Download and install Packmind's default skills to enhance your AI agent's capabilities"
    >
      <PMPageSection>
        <div className="flex flex-col gap-6">
          {/* Header with download button */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">Available Skills</h3>
              <p className="text-sm text-gray-600">
                These skills provide specialized workflows and domain expertise
                for your AI agent
              </p>
            </div>
            <DownloadDefaultSkillsPopover
              buttonVariant="primary"
              buttonSize="md"
            />
          </div>

          {/* Skills table */}
          <PMTable<SkillTableRow>
            columns={skillsTableColumns}
            data={tableData}
            striped={true}
            hoverable={true}
            size="md"
            variant="line"
          />

          {/* Information section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium text-blue-900">
                How to use default skills
              </h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p>
                  1. Click "Get Packmind Skills" to download skills for your
                  preferred AI agent
                </p>
                <p>
                  2. Extract the downloaded ZIP file to your agent's skills
                  folder
                </p>
                <p>
                  3. Your agent will now have access to these specialized
                  capabilities
                </p>
              </div>
            </div>
          </div>
        </div>
      </PMPageSection>
    </PMPage>
  );
};
