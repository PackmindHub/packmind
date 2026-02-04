import { Navigate } from 'react-router';

export default function SignUpIndexRedirect() {
  return <Navigate to="/sign-up/create-account" replace />;
}
