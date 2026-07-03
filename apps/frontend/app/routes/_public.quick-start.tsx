import { Navigate } from 'react-router';

export default function QuickStartRedirect() {
  return <Navigate to="/sign-up/create-account" replace />;
}
