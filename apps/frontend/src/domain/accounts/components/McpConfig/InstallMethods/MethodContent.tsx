import React from 'react';
import { IMethodContentProps } from './types';
import { CliMethodContent } from './CliMethodContent';
import { MagicLinkMethodContent } from './MagicLinkMethodContent';
import { JsonMethodContent } from './JsonMethodContent';
import { InstallCliMethodContent } from './InstallCliMethodContent';

export const MethodContent: React.FC<IMethodContentProps> = ({
  method,
  token,
  url,
  cliLoginCode,
  onCantUseMcp,
}) => {
  switch (method.type) {
    case 'cli':
      return (
        <CliMethodContent
          method={method}
          token={token}
          url={url}
          cliLoginCode={cliLoginCode}
          onCantUseMcp={onCantUseMcp}
        />
      );
    case 'magicLink':
      return (
        <MagicLinkMethodContent
          method={method}
          token={token}
          url={url}
          cliLoginCode={cliLoginCode}
          onCantUseMcp={onCantUseMcp}
        />
      );
    case 'json':
      return (
        <JsonMethodContent
          method={method}
          token={token}
          url={url}
          cliLoginCode={cliLoginCode}
          onCantUseMcp={onCantUseMcp}
        />
      );
    case 'install-cli':
      return (
        <InstallCliMethodContent
          method={method}
          token={token}
          url={url}
          cliLoginCode={cliLoginCode}
          onCantUseMcp={onCantUseMcp}
        />
      );
    default:
      return null;
  }
};
