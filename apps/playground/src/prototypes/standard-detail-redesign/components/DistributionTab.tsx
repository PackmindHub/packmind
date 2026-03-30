import {
  PMBadge,
  PMBox,
  PMHStack,
  PMHeading,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuPackage, LuGitBranch, LuCircleCheck } from 'react-icons/lu';

export function DistributionTab() {
  return (
    <PMVStack gap={6} align="stretch">
      <PMVStack gap={3} align="stretch">
        <PMHeading size="md">Packages</PMHeading>
        <PMBox
          padding={4}
          borderRadius="md"
          border="1px solid"
          borderColor="border.tertiary"
        >
          <PMHStack gap={3} align="center">
            <LuPackage size={18} />
            <PMVStack gap={0}>
              <PMText fontSize="sm" fontWeight="medium">
                frontend-standards
              </PMText>
              <PMText fontSize="xs" color="secondary">
                Distributed to 3 repositories
              </PMText>
            </PMVStack>
            <PMBadge variant="surface" colorPalette="green" size="xs" ml="auto">
              Up to date
            </PMBadge>
          </PMHStack>
        </PMBox>
      </PMVStack>

      <PMVStack gap={3} align="stretch">
        <PMHeading size="md">Targets</PMHeading>
        {['packmind/frontend', 'packmind/ui-kit', 'packmind/docs'].map(
          (repo) => (
            <PMBox
              key={repo}
              padding={3}
              borderRadius="md"
              border="1px solid"
              borderColor="border.tertiary"
            >
              <PMHStack gap={3} align="center">
                <LuGitBranch size={16} />
                <PMText fontSize="sm">{repo}</PMText>
                <PMHStack gap={1} align="center" ml="auto" color="green.500">
                  <LuCircleCheck size={14} />
                  <PMText fontSize="xs" color="green.500">
                    Synced
                  </PMText>
                </PMHStack>
              </PMHStack>
            </PMBox>
          ),
        )}
      </PMVStack>
    </PMVStack>
  );
}
