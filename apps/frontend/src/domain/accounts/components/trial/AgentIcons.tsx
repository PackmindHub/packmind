import React from 'react';
import { StartTrialCommandAgents } from '@packmind/types';
import { LuBot } from 'react-icons/lu';
import { RiClaudeLine } from 'react-icons/ri';
import { VscVscode } from 'react-icons/vsc';
import { SiJetbrains } from 'react-icons/si';
import { IconType } from 'react-icons';

// Cursor icon - official logo from Simple Icons
const CursorIconSvg: IconType = (props) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="currentColor"
    {...props}
  >
    <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
  </svg>
);

// Continue.dev icon - official logo from GitHub
const ContinueIconSvg: IconType = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 26 24"
    fill="currentColor"
    {...props}
  >
    <path d="M20.5286 3.26811L19.1512 5.65694L22.6328 11.6849C22.6582 11.7306 22.6735 11.7866 22.6735 11.8374C22.6735 11.8882 22.6582 11.9441 22.6328 11.9899L19.1512 18.0229L20.5286 20.4117L25.4791 11.8374L20.5286 3.26303V3.26811ZM18.6176 5.3469L19.995 2.95807H17.2402L15.8628 5.3469H18.6227H18.6176ZM15.8577 5.96697L19.075 11.5324H21.8298L18.6176 5.96697H15.8577ZM18.6176 17.7179L21.8298 12.1474H19.075L15.8577 17.7179H18.6176ZM15.8577 18.338L17.2351 20.7167H19.9899L18.6125 18.338H15.8526H15.8577ZM6.52098 21.3063C6.46507 21.3063 6.41424 21.291 6.3685 21.2656C6.32276 21.2402 6.28209 21.1995 6.25668 21.1538L2.77002 15.1207H0.0152482L4.9657 23.69H14.8615L13.4841 21.3063H6.52606H6.52098ZM14.0178 20.9962L15.3952 23.38L16.7726 20.9911L15.3952 18.6023L14.0178 20.9911V20.9962ZM14.8615 18.2974H8.43712L7.05973 20.6862H13.4841L14.8615 18.2974ZM7.89836 17.9924L4.68108 12.4219L3.30369 14.8107L6.52098 20.3812L7.89836 17.9924ZM0.0101654 14.5007H2.76494L4.14232 12.1118H1.39263L0.0101654 14.5007ZM6.24143 2.5413C6.26685 2.49556 6.30751 2.4549 6.35325 2.42948C6.399 2.40407 6.4549 2.38882 6.50573 2.38882H13.474L14.8514 0H4.95045L0 8.57435H2.75477L6.23127 2.54638L6.24143 2.5413ZM4.14232 11.5782L2.76494 9.18934H0.0101654L1.38755 11.5782H4.14232ZM6.51081 3.31386L3.29861 8.8793L4.67599 11.2681L7.8882 5.70268L6.51081 3.31386ZM13.4791 3.00382H7.04448L8.42187 5.39264H14.8564L13.4791 3.00382ZM15.3952 5.0826L16.7675 2.69886L15.3952 0.310038L14.0178 2.69378L15.3952 5.0826Z" />
  </svg>
);

/**
 * Mapping of agent IDs to their corresponding icon components.
 * Use with PMIcon's `as` prop: <PMIcon as={AGENT_ICONS[agent]} size="xl" />
 */
export const AGENT_ICONS: Record<StartTrialCommandAgents, IconType> = {
  claude: RiClaudeLine,
  'vs-code': VscVscode,
  cursor: CursorIconSvg,
  jetbrains: SiJetbrains,
  'continue-dev': ContinueIconSvg,
  other: LuBot,
};

/**
 * Get the icon component for a given agent.
 * @param agent - The agent identifier
 * @returns The icon component to use with PMIcon's `as` prop
 */
export const getAgentIcon = (agent: StartTrialCommandAgents): IconType => {
  return AGENT_ICONS[agent] ?? LuBot;
};
