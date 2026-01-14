import { Navigate } from 'react-router';

export default function StartTrialRedirect() {
  return <Navigate to="/sign-up" replace />;
}
