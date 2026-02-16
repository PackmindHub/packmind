import {
  PMBox,
  PMHeading,
  PMText,
  PMVStack,
  PMHStack,
  PMBadge,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMButton,
  PMIcon,
  PMImage,
} from '@packmind/ui';
import { logoPackmind } from '@packmind/assets';
import { DeploymentStatsSummary } from '../DeploymentStatsSummary/DeploymentStatsSummary';

const TABLE_COLUMNS: PMTableColumn[] = [
  { key: 'name', header: 'Name', grow: true },
  {
    key: 'version',
    header: 'Version (distributed → latest)',
    align: 'center',
    grow: true,
  },
  { key: 'status', header: 'Status', align: 'center' },
];

export const DeploymentsBlankState = () => {
  // Stub data showing what the view looks like with active distributions
  const stubStats = { upToDate: 2, outdated: 2 };

  // Sample data for target 1 (api) table
  const apiTableRows: PMTableRow[] = [
    {
      name: (
        <PMVStack align="start" gap={0}>
          <PMText variant="small" color="tertiary">
            Standard
          </PMText>
          <PMText variant="body-important">code-style</PMText>
        </PMVStack>
      ),
      version: (
        <PMHStack gap={2} justify="center" align="center">
          <PMBadge colorPalette="gray" size="sm">
            2
          </PMBadge>
          <PMText variant="small" color="faded">
            →
          </PMText>
          <PMBadge colorPalette="red" size="sm">
            3
          </PMBadge>
        </PMHStack>
      ),
      status: (
        <PMBadge colorPalette="red" size="sm">
          Outdated
        </PMBadge>
      ),
    },
    {
      name: (
        <PMVStack align="start" gap={0}>
          <PMText variant="small" color="tertiary">
            Command
          </PMText>
          <PMText variant="body-important">eslint-config</PMText>
        </PMVStack>
      ),
      version: (
        <PMBadge colorPalette="gray" size="sm">
          5
        </PMBadge>
      ),
      status: (
        <PMBadge colorPalette="green" size="sm">
          Up-to-date
        </PMBadge>
      ),
    },
  ];

  // Sample data for target 2 (frontend) table
  const frontendTableRows: PMTableRow[] = [
    {
      name: (
        <PMVStack align="start" gap={0}>
          <PMText variant="small" color="tertiary">
            Skill
          </PMText>
          <PMText variant="body-important">react-patterns</PMText>
        </PMVStack>
      ),
      version: (
        <PMBadge colorPalette="gray" size="sm">
          3
        </PMBadge>
      ),
      status: (
        <PMBadge colorPalette="green" size="sm">
          Up-to-date
        </PMBadge>
      ),
    },
    {
      name: (
        <PMVStack align="start" gap={0}>
          <PMText variant="small" color="tertiary">
            Standard
          </PMText>
          <PMText variant="body-important">testing-standards</PMText>
        </PMVStack>
      ),
      version: (
        <PMHStack gap={2} justify="center" align="center">
          <PMBadge colorPalette="gray" size="sm">
            8
          </PMBadge>
          <PMText variant="small" color="faded">
            →
          </PMText>
          <PMBadge colorPalette="orange" size="sm">
            15
          </PMBadge>
        </PMHStack>
      ),
      status: (
        <PMBadge colorPalette="red" size="sm">
          Outdated
        </PMBadge>
      ),
    },
  ];

  return (
    <PMBox
      borderRadius={'md'}
      backgroundColor={'background.primary'}
      border="solid 1px"
      borderColor={'border.tertiary'}
    >
      <PMVStack gap={8} align="stretch" p={8}>
        <PMVStack gap={4} align="stretch">
          <PMHeading level="h2">
            Track and maintain your AI agents' instructions
          </PMHeading>
          <PMText as="p" fontWeight={'medium'} color="secondary">
            Track versions of your recipes, standards, and skills across
            repositories. Identify and update outdated artifacts to ensure your
            AI agents perform at their best.
          </PMText>
          <PMHStack mt={2} gap={2}>
            <PMButton
              variant="secondary"
              size={'xs'}
              asChild
              w="fit-content"
              borderColor={'blue.700'}
            >
              <a
                href="https://docs.packmind.com/getting-started/gs-distribute"
                target="_blank"
                rel="noopener noreferrer"
              >
                <PMIcon>
                  <PMImage src={logoPackmind} height="16px" />
                </PMIcon>
                Doc: Learn more about distribution
              </a>
            </PMButton>
          </PMHStack>
        </PMVStack>

        <PMVStack
          align="stretch"
          width="full"
          gap={4}
          border={'solid 1px'}
          borderColor={'blue.800'}
          borderRadius={'md'}
          p={8}
        >
          <PMHeading level="h4" fontWeight={'bold'}>
            Example with demo repository and playbook
          </PMHeading>
          <PMHStack gap={4} align="stretch" width="full">
            <PMBox
              borderRadius={'sm'}
              border="solid 1px"
              borderColor={'border.tertiary'}
              p={4}
              flex={1}
            >
              <PMVStack gap={2} align="start">
                <PMHStack gap={2} align="center">
                  <PMBadge colorPalette="green" size="sm">
                    Up-to-date
                  </PMBadge>
                </PMHStack>
                <PMHeading level="h3">{stubStats.upToDate}</PMHeading>
              </PMVStack>
            </PMBox>
            <PMBox
              borderRadius={'sm'}
              border="solid 1px"
              borderColor={'border.tertiary'}
              p={4}
              flex={1}
            >
              <PMVStack gap={2} align="start">
                <PMHStack gap={2} align="center">
                  <PMBadge colorPalette="red" size="sm">
                    Outdated
                  </PMBadge>
                </PMHStack>
                <PMHeading level="h3">{stubStats.outdated}</PMHeading>
              </PMVStack>
            </PMBox>
          </PMHStack>

          {/* Repository Preview Example */}
          <PMBox
            borderRadius={'lg'}
            backgroundColor={'blue.1000'}
            border="solid 1px"
            borderColor={'border.secondary'}
            p={6}
            gap={4}
            display={'flex'}
            flexDirection={'column'}
          >
            <PMVStack gap={2} align="stretch">
              <PMHeading level="h5">DunderMifflin/monorepo:main</PMHeading>
            </PMVStack>

            {/* Target 1 - api */}
            <PMVStack
              align="stretch"
              width="full"
              gap={2}
              border={'solid 1px'}
              borderColor={'border.tertiary'}
              borderRadius={'sm'}
              padding={4}
              shadow="5px 5px 15px 5px rgba(0, 0, 0, .5)"
            >
              <PMBox>
                <PMBadge colorPalette="gray" size="xs" marginRight={2}>
                  Target
                </PMBadge>
                <PMText variant="body-important">api</PMText>
              </PMBox>
              <PMTable columns={TABLE_COLUMNS} data={apiTableRows} size="sm" />
            </PMVStack>

            {/* Target 2 - frontend */}
            <PMVStack
              align="stretch"
              width="full"
              gap={2}
              border={'solid 1px'}
              borderColor={'border.tertiary'}
              borderRadius={'sm'}
              padding={4}
              shadow="5px 5px 15px 5px rgba(0, 0, 0, .5)"
            >
              <PMBox>
                <PMBadge colorPalette="gray" size="xs" marginRight={2}>
                  Target
                </PMBadge>
                <PMText variant="body-important">frontend</PMText>
              </PMBox>
              <PMTable
                columns={TABLE_COLUMNS}
                data={frontendTableRows}
                size="sm"
              />
            </PMVStack>
          </PMBox>
        </PMVStack>
      </PMVStack>
    </PMBox>
  );
};
