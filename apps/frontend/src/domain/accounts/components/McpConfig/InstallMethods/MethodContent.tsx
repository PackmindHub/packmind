import React from 'react';
import { IMethodContentProps } from './types';
import { CliMethodContent } from './CliMethodContent';
import { MagicLinkMethodContent } from './MagicLinkMethodContent';
import { JsonMethodContent } from './JsonMethodContent';

export const MethodContent: React.FC<IMethodContentProps> = ({
  method,
  token,
  url,
}) => {
  switch (method.type) {
    case 'cli':
      return <CliMethodContent method={method} token={token} url={url} />;
    case 'magicLink':
      return <MagicLinkMethodContent method={method} token={token} url={url} />;
    case 'json':
      return <JsonMethodContent method={method} token={token} url={url} />;
    default:
      return null;
  }
};
