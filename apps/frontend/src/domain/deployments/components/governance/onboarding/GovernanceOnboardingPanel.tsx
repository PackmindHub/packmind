import { useNavigate } from 'react-router';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMHeading,
  PMHStack,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { useAuthContext } from '../../../../accounts/hooks/useAuthContext';
import { routes } from '../../../../../shared/utils/routes';

interface UnlockItem {
  title: string;
  description: string;
  comingSoon?: boolean;
}

const UNLOCK_ITEMS: UnlockItem[] = [
  {
    title: 'Drift detection',
    description: 'See when a deployed agent file falls behind the source.',
  },
  {
    title: 'Approval queue',
    description: 'Review proposed changes before they ship to every repo.',
    comingSoon: true,
  },
  {
    title: 'Adoption coverage',
    description: 'Track which repos are on the latest version.',
    comingSoon: true,
  },
];

export function GovernanceOnboardingPanel() {
  const { organization } = useAuthContext();
  const navigate = useNavigate();
  const setupHref = organization ? routes.org.toSetup(organization.slug) : null;

  return (
    <PMVStack align="stretch" gap={8} maxW="720px">
      <PMBox
        bg="background.primary"
        borderRadius="md"
        borderWidth="1px"
        borderColor="border.tertiary"
        padding={8}
      >
        <PMVStack align="stretch" gap={5}>
          <PMHeading level="h1" color="primary">
            Bring your playbook into Packmind.
          </PMHeading>
          <PMText fontSize="md" color="secondary">
            Your team's instructions already live in CLAUDE.md, .cursor/rules,
            copilot-instructions.md across your repos. Pull them in, versioned
            and distributed from one place.
          </PMText>
          <PMHStack gap={4} align="center" wrap="wrap" rowGap={3}>
            <PMButton
              variant="primary"
              onClick={() => setupHref && navigate(setupHref)}
              disabled={!setupHref}
            >
              Connect a repository
            </PMButton>
            <PMText fontSize="sm" color="tertiary">
              Already connected? Run{' '}
              <PMText as="span" fontFamily="mono" color="primary">
                packmind-cli import
              </PMText>
            </PMText>
          </PMHStack>
        </PMVStack>
      </PMBox>

      <PMVStack align="stretch" gap={4}>
        <PMHeading
          level="h2"
          color="faded"
          fontSize="xs"
          fontWeight="medium"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          What you'll unlock
        </PMHeading>
        <PMVStack align="stretch" gap={5}>
          {UNLOCK_ITEMS.map((item) => (
            <UnlockItemRow key={item.title} item={item} />
          ))}
        </PMVStack>
      </PMVStack>
    </PMVStack>
  );
}

function UnlockItemRow({ item }: Readonly<{ item: UnlockItem }>) {
  return (
    <PMVStack align="stretch" gap={1}>
      <PMHStack gap={2} align="baseline">
        <PMText fontSize="md" fontWeight="medium" color="primary">
          {item.title}
        </PMText>
        {item.comingSoon && (
          <PMBadge size="xs" variant="subtle">
            coming soon
          </PMBadge>
        )}
      </PMHStack>
      <PMText fontSize="sm" color="secondary" maxW="60ch">
        {item.description}
      </PMText>
    </PMVStack>
  );
}
