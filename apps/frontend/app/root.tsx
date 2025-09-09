import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type MetaFunction,
  type LinksFunction,
} from 'react-router';
import { initSentry } from '../src/services/api/SentryService';
import {
  PMHeading,
  PMSpinner,
  PMVStack,
  PMToaster,
  UIProvider,
} from '@packmind/ui';

initSentry();

export const meta: MetaFunction = () => [
  {
    title: 'Packmind',
  },
];

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body style={{ height: '100%' }}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <UIProvider>
      <div
        style={{
          minHeight: '100%',
          height: '100%',
          maxHeight: '100%',
          minWidth: '100%',
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <PMHeading>Loading Packmind...</PMHeading>
        <PMSpinner size={'xl'} />
      </div>
    </UIProvider>
  );
}

export default function App() {
  return (
    <div
      style={{
        minHeight: '100%',
        height: '100%',
        maxHeight: '100%',
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PMVStack
        flex="1"
        gap={0}
        minH={'100%'}
        maxH={'100%'}
        h="100%"
        w="100%"
        maxW={'100%'}
        mx="auto"
      >
        <Outlet />
        <PMToaster />
      </PMVStack>
    </div>
  );
}
