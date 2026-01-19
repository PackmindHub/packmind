import React, { createContext, useContext, ReactNode } from 'react';
import { StartTrialCommandAgents } from '@packmind/types';

interface OnboardingAgentContextValue {
  agent: StartTrialCommandAgents;
}

const OnboardingAgentContext = createContext<
  OnboardingAgentContextValue | undefined
>(undefined);

interface OnboardingAgentProviderProps {
  agent: StartTrialCommandAgents;
  children: ReactNode;
}

export function OnboardingAgentProvider({
  agent,
  children,
}: OnboardingAgentProviderProps) {
  return (
    <OnboardingAgentContext.Provider value={{ agent }}>
      {children}
    </OnboardingAgentContext.Provider>
  );
}

export function useOnboardingAgent(): StartTrialCommandAgents {
  const context = useContext(OnboardingAgentContext);
  if (!context) {
    throw new Error(
      'useOnboardingAgent must be used within OnboardingAgentProvider',
    );
  }
  return context.agent;
}
