import React, { createContext, useContext } from 'react';
import { Analytics } from './analytics';

const AnalyticsContext = createContext(Analytics);

export const AnalyticsProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AnalyticsContext.Provider value={Analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => useContext(AnalyticsContext);
